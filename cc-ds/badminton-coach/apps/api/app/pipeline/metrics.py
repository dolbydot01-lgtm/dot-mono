from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.contracts.analysis_result import (
    CameraView,
    DominantHand,
    Episode,
    EpisodeType,
    Metric,
    MetricUnit,
    Reliability,
)
from app.pipeline.subject import SelectedPose

SIDE_INDICES = {
    "left": {"shoulder": 5, "elbow": 7, "wrist": 9, "hip": 11, "knee": 13, "ankle": 15},
    "right": {"shoulder": 6, "elbow": 8, "wrist": 10, "hip": 12, "knee": 14, "ankle": 16},
}


@dataclass
class SegmentationResult:
    episodes: list[Episode]
    masks: dict[EpisodeType, np.ndarray]


def _point(pose: SelectedPose, index: int) -> np.ndarray:
    return pose.keypoints[:, index]


def _joint_angle_series(pose: SelectedPose, first: int, middle: int, last: int) -> tuple[np.ndarray, np.ndarray]:
    a = _point(pose, first)
    b = _point(pose, middle)
    c = _point(pose, last)
    valid = (
        pose.usable[:, first]
        & pose.usable[:, middle]
        & pose.usable[:, last]
        & np.isfinite(a).all(axis=1)
        & np.isfinite(b).all(axis=1)
        & np.isfinite(c).all(axis=1)
    )
    ba = a - b
    bc = c - b
    norms = np.linalg.norm(ba, axis=1) * np.linalg.norm(bc, axis=1)
    valid &= norms > 1e-6
    cosine = np.full(len(pose.keypoints), np.nan, dtype=np.float64)
    np.divide(
        np.sum(ba * bc, axis=1),
        norms,
        out=cosine,
        where=valid,
    )
    cosine = np.clip(cosine, -1.0, 1.0)
    angles = np.degrees(np.arccos(cosine))
    angles[~valid] = np.nan
    return angles, valid


def _midpoint(pose: SelectedPose, first: int, second: int) -> tuple[np.ndarray, np.ndarray]:
    a = _point(pose, first)
    b = _point(pose, second)
    valid = pose.usable[:, first] & pose.usable[:, second] & np.isfinite(a).all(axis=1) & np.isfinite(b).all(axis=1)
    midpoint = (a + b) / 2.0
    midpoint[~valid] = np.nan
    return midpoint, valid


def _trunk_lean_series(pose: SelectedPose) -> tuple[np.ndarray, np.ndarray]:
    shoulder_mid, shoulder_valid = _midpoint(pose, 5, 6)
    hip_mid, hip_valid = _midpoint(pose, 11, 12)
    vector = shoulder_mid - hip_mid
    valid = shoulder_valid & hip_valid & np.isfinite(vector).all(axis=1)
    lean = np.full(len(pose.keypoints), np.nan, dtype=np.float64)
    lean[valid] = np.degrees(np.arctan2(np.abs(vector[valid, 0]), np.abs(vector[valid, 1])))
    return lean, valid


def _median_at(values: np.ndarray, indices: list[int] | np.ndarray) -> float | None:
    selected = np.asarray(values)[np.asarray(indices)]
    selected = selected[np.isfinite(selected)]
    return float(np.median(selected)) if selected.size else None


def _reliability(mean_confidence: float, valid_ratio: float) -> Reliability:
    if valid_ratio < 0.60 or mean_confidence < 0.45:
        return Reliability.LOW
    if valid_ratio >= 0.85 and mean_confidence >= 0.75:
        return Reliability.HIGH
    return Reliability.MEDIUM


def _make_metric(
    *,
    key: str,
    label: str,
    value: float | None,
    unit: MetricUnit,
    view: CameraView | str,
    availability: float,
    mean_confidence: float,
    frame_count: int,
) -> Metric:
    valid = value is not None and availability >= 0.60 and frame_count >= 3
    return Metric(
        key=key,
        label=label,
        value=round(float(value), 3) if value is not None and valid else None,
        unit=unit,
        view=view,
        valid=valid,
        reliability=_reliability(mean_confidence, availability) if valid else Reliability.LOW,
        n_frames=frame_count,
    )


def _mean_conf(pose: SelectedPose, indices: list[int], frames: np.ndarray) -> float:
    if len(frames) == 0:
        return 0.0
    values = pose.confidence[frames][:, indices]
    return float(np.mean(values)) if values.size else 0.0


def _runs(mask: np.ndarray, *, fps: float, merge_gap_s: float, min_duration_s: float) -> list[tuple[int, int]]:
    indices = np.flatnonzero(mask)
    if indices.size == 0:
        return []
    runs: list[list[int]] = [[int(indices[0]), int(indices[0])]]
    for index in indices[1:]:
        index = int(index)
        if index - runs[-1][1] - 1 <= max(1, int(round(merge_gap_s * fps))):
            runs[-1][1] = index
        else:
            runs.append([index, index])
    minimum = max(1, int(round(min_duration_s * fps)))
    return [(start, end) for start, end in runs if end - start + 1 >= minimum]


def _episode_confidence(margin: float, mean_conf: float, coverage: float) -> float:
    margin_score = max(0.0, min(1.0, margin))
    return round(float(np.clip(0.45 + 0.25 * margin_score + 0.20 * mean_conf + 0.10 * coverage, 0.0, 0.95)), 3)


def _build_overhead_episodes(
    pose: SelectedPose,
    dominant_hand: DominantHand,
    fps: float,
) -> list[Episode]:
    side = "right" if dominant_hand == DominantHand.RIGHT else "left"
    indices = SIDE_INDICES[side]
    shoulder_mid, shoulder_valid = _midpoint(pose, 5, 6)
    wrist = _point(pose, indices["wrist"])
    hip_mid, hip_valid = _midpoint(pose, 11, 12)

    height = (shoulder_mid[:, 1] - wrist[:, 1]) / pose.torso_len
    valid_height = shoulder_valid & pose.usable[:, indices["wrist"]] & np.isfinite(height)
    mask = valid_height & (height > 0.05)
    elbow_angle, elbow_valid = _joint_angle_series(pose, indices["shoulder"], indices["elbow"], indices["wrist"])
    arm_angle, arm_valid = _joint_angle_series(pose, 11, indices["shoulder"], indices["elbow"])

    episodes: list[Episode] = []
    for start, end in _runs(mask, fps=fps, merge_gap_s=0.25, min_duration_s=0.25):
        frames = np.arange(start, end + 1)
        valid_frames = frames[valid_height[frames]]
        if valid_frames.size < 3:
            continue
        key_frame = int(valid_frames[np.argmax(height[valid_frames])])
        peak_height = float(height[key_frame])
        duration = (end - start + 1) / fps
        mean_conf = _mean_conf(pose, [indices["shoulder"], indices["elbow"], indices["wrist"]], valid_frames)
        valid_ratio = float(valid_height[frames].mean())
        confidence = _episode_confidence(peak_height / 0.9, mean_conf, valid_ratio)

        elbow_value = _median_at(elbow_angle, range(max(start, key_frame - 2), min(end, key_frame + 2) + 1))
        arm_value = _median_at(arm_angle, range(max(start, key_frame - 2), min(end, key_frame + 2) + 1))
        elbow_conf = _mean_conf(pose, [indices["shoulder"], indices["elbow"], indices["wrist"]], frames)
        arm_conf = _mean_conf(pose, [11, indices["shoulder"], indices["elbow"]], frames)

        metrics = [
            _make_metric(
                key="peak_wrist_height",
                label="Peak racket-hand height",
                value=peak_height,
                unit=MetricUnit.TORSO,
                view="both",
                availability=valid_ratio,
                mean_confidence=mean_conf,
                frame_count=int(valid_frames.size),
            ),
            _make_metric(
                key="elbow_angle_at_peak",
                label="Elbow angle at peak reach",
                value=elbow_value,
                unit=MetricUnit.DEG,
                view="both",
                availability=float(elbow_valid[frames].mean()),
                mean_confidence=elbow_conf,
                frame_count=int(elbow_valid[frames].sum()),
            ),
            _make_metric(
                key="arm_elevation_at_peak",
                label="Racket-arm elevation at peak",
                value=arm_value,
                unit=MetricUnit.DEG,
                view="both",
                availability=float(arm_valid[frames].mean()),
                mean_confidence=arm_conf,
                frame_count=int(arm_valid[frames].sum()),
            ),
            _make_metric(
                key="episode_duration",
                label="Overhead movement duration",
                value=duration,
                unit=MetricUnit.SECONDS,
                view="both",
                availability=1.0,
                mean_confidence=mean_conf,
                frame_count=len(frames),
            ),
        ]
        episodes.append(
            Episode(
                id="",
                type=EpisodeType.OVERHEAD_MOTION,
                label="Overhead motion",
                start_s=round(start / fps, 3),
                end_s=round(min(pose.frame_count, end + 1) / fps, 3),
                key_frame_s=round(key_frame / fps, 3),
                start_frame=start,
                end_frame=end,
                confidence=confidence,
                lead_side=side,
                metrics=metrics,
            )
        )
    return episodes


def _build_lunge_episodes(
    pose: SelectedPose,
    view: CameraView,
    fps: float,
) -> list[Episode]:
    knee_left, left_valid = _joint_angle_series(pose, 11, 13, 15)
    knee_right, right_valid = _joint_angle_series(pose, 12, 14, 16)
    valid_both = left_valid & right_valid
    knee_min = np.fmin(knee_left, knee_right)
    left_ankle_all = _point(pose, 15)
    right_ankle_all = _point(pose, 16)
    ankle_separation = np.abs(left_ankle_all[:, 0] - right_ankle_all[:, 0]) / pose.torso_len
    separation_valid = (
        pose.usable[:, 15]
        & pose.usable[:, 16]
        & np.isfinite(left_ankle_all).all(axis=1)
        & np.isfinite(right_ankle_all).all(axis=1)
    )
    separation_values = ankle_separation[separation_valid]
    baseline_separation = (
        float(np.nanpercentile(separation_values, 25)) if separation_values.size else 0.0
    )
    # Deep knee flexion is enough on its own. A moderately bent knee also counts
    # when the stance visibly widens into the step, which catches shallow lunges.
    widened = separation_valid & (ankle_separation > baseline_separation + 0.12)
    mask = valid_both & ((knee_min < 140.0) | ((knee_min < 152.0) & widened))
    trunk_lean, trunk_valid = _trunk_lean_series(pose)
    hip_mid, hip_valid = _midpoint(pose, 11, 12)

    episodes: list[Episode] = []
    for start, end in _runs(mask, fps=fps, merge_gap_s=0.25, min_duration_s=0.30):
        frames = np.arange(start, end + 1)
        valid_frames = frames[valid_both[frames] & np.isfinite(knee_min[frames])]
        if valid_frames.size < 3:
            continue
        key_frame = int(valid_frames[np.argmin(knee_min[valid_frames])])
        lead = "left" if knee_left[key_frame] <= knee_right[key_frame] else "right"
        indices = SIDE_INDICES[lead]
        lead_knee = knee_left if lead == "left" else knee_right
        min_angle = float(lead_knee[key_frame])
        duration = (end - start + 1) / fps
        mean_conf = _mean_conf(pose, [indices["hip"], indices["knee"], indices["ankle"]], valid_frames)
        valid_ratio = float(valid_both[frames].mean())
        confidence = _episode_confidence((140.0 - min_angle) / 35.0, mean_conf, valid_ratio)

        metrics: list[Metric] = [
            _make_metric(
                key="lead_knee_min_angle",
                label="Lead knee depth",
                value=min_angle,
                unit=MetricUnit.DEG,
                view="both",
                availability=valid_ratio,
                mean_confidence=mean_conf,
                frame_count=int(valid_frames.size),
            ),
            _make_metric(
                key="lunge_duration",
                label="Lunge duration",
                value=duration,
                unit=MetricUnit.SECONDS,
                view="both",
                availability=1.0,
                mean_confidence=mean_conf,
                frame_count=len(frames),
            ),
        ]

        trunk_value = _median_at(trunk_lean, range(max(start, key_frame - 1), min(end, key_frame + 1) + 1))
        trunk_conf = _mean_conf(pose, [5, 6, 11, 12], frames)
        if view == CameraView.SIDE:
            metrics.append(
                _make_metric(
                    key="trunk_lean_at_deepest",
                    label="Trunk lean at deepest lunge",
                    value=trunk_value,
                    unit=MetricUnit.DEG,
                    view=CameraView.SIDE,
                    availability=float(trunk_valid[frames].mean()),
                    mean_confidence=trunk_conf,
                    frame_count=int(trunk_valid[frames].sum()),
                )
            )

            other = "right" if lead == "left" else "left"
            lead_ankle = _point(pose, indices["ankle"])
            other_ankle = _point(pose, SIDE_INDICES[other]["ankle"])
            direction = np.sign(lead_ankle[:, 0] - other_ankle[:, 0])
            shoulder_width = np.abs(_point(pose, 5)[:, 0] - _point(pose, 6)[:, 0])
            com_valid = (
                hip_valid
                & pose.usable[:, indices["ankle"]]
                & pose.usable[:, SIDE_INDICES[other]["ankle"]]
                & np.isfinite(shoulder_width)
                & (np.abs(direction) > 0)
                & (shoulder_width > 1.0)
            )
            com_offset = (hip_mid[:, 0] - lead_ankle[:, 0]) * direction / shoulder_width
            com_value = _median_at(com_offset, range(max(start, key_frame - 1), min(end, key_frame + 1) + 1))
            metrics.append(
                _make_metric(
                    key="com_beyond_front_ankle",
                    label="Hip position relative to front foot",
                    value=com_value,
                    unit=MetricUnit.RATIO,
                    view=CameraView.SIDE,
                    availability=float(com_valid[frames].mean()),
                    mean_confidence=_mean_conf(pose, [11, 12, indices["ankle"]], frames),
                    frame_count=int(com_valid[frames].sum()),
                )
            )

        if view == CameraView.FRONT:
            lead_knee = _point(pose, indices["knee"])
            lead_ankle = _point(pose, indices["ankle"])
            hip = _point(pose, indices["hip"])
            outer_distance = np.abs(lead_ankle[:, 0] - hip_mid[:, 0])
            knee_distance = np.abs(lead_knee[:, 0] - hip_mid[:, 0])
            alignment_valid = (
                hip_valid
                & pose.usable[:, indices["knee"]]
                & pose.usable[:, indices["ankle"]]
                & np.isfinite(outer_distance)
                & (outer_distance > 1.0)
            )
            alignment = np.full(len(pose.keypoints), np.nan, dtype=np.float64)
            alignment[alignment_valid] = knee_distance[alignment_valid] / outer_distance[alignment_valid]
            alignment_value = _median_at(alignment, range(max(start, key_frame - 1), min(end, key_frame + 1) + 1))
            metrics.append(
                _make_metric(
                    key="knee_ankle_alignment_ratio",
                    label="Knee tracking over the foot",
                    value=alignment_value,
                    unit=MetricUnit.RATIO,
                    view=CameraView.FRONT,
                    availability=float(alignment_valid[frames].mean()),
                    mean_confidence=_mean_conf(pose, [indices["hip"], indices["knee"], indices["ankle"]], frames),
                    frame_count=int(alignment_valid[frames].sum()),
                )
            )
            del lead_knee, lead_ankle, hip

        episodes.append(
            Episode(
                id="",
                type=EpisodeType.LUNGE,
                label="Lunge / deep step",
                start_s=round(start / fps, 3),
                end_s=round(min(pose.frame_count, end + 1) / fps, 3),
                key_frame_s=round(key_frame / fps, 3),
                start_frame=start,
                end_frame=end,
                confidence=confidence,
                lead_side=lead,
                metrics=metrics,
            )
        )
    return episodes


def _build_ready_episodes(pose: SelectedPose, view: CameraView, fps: float) -> list[Episode]:
    knee_left, left_valid = _joint_angle_series(pose, 11, 13, 15)
    knee_right, right_valid = _joint_angle_series(pose, 12, 14, 16)
    valid_knees = left_valid & right_valid
    knee_mean = (knee_left + knee_right) / 2.0
    knee_asymmetry = np.abs(knee_left - knee_right)

    left_ankle = _point(pose, 15)
    right_ankle = _point(pose, 16)
    ankle_separation = np.abs(left_ankle[:, 0] - right_ankle[:, 0]) / pose.torso_len
    shoulder_mid, shoulder_valid = _midpoint(pose, 5, 6)
    left_wrist = _point(pose, 9)
    right_wrist = _point(pose, 10)
    wrist_ok = (
        pose.usable[:, 9]
        & pose.usable[:, 10]
        & np.isfinite(left_wrist).all(axis=1)
        & np.isfinite(right_wrist).all(axis=1)
        & (left_wrist[:, 1] > shoulder_mid[:, 1] - 0.15 * pose.torso_len)
        & (right_wrist[:, 1] > shoulder_mid[:, 1] - 0.15 * pose.torso_len)
    )
    ankles_ok = pose.usable[:, 15] & pose.usable[:, 16] & np.isfinite(ankle_separation)
    mask = (
        valid_knees
        & ankles_ok
        & shoulder_valid
        & wrist_ok
        & (knee_left >= 120.0)
        & (knee_right >= 120.0)
        & (knee_left <= 175.0)
        & (knee_right <= 175.0)
        & (ankle_separation >= 0.45)
    )

    episodes: list[Episode] = []
    for start, end in _runs(mask, fps=fps, merge_gap_s=0.30, min_duration_s=0.50):
        frames = np.arange(start, end + 1)
        valid_frames = frames[valid_knees[frames] & np.isfinite(knee_mean[frames])]
        if valid_frames.size < 7:
            continue
        key_frame = int((start + end) // 2)
        duration = (end - start + 1) / fps
        mean_conf = _mean_conf(pose, [11, 12, 13, 14, 15, 16], valid_frames)
        valid_ratio = float(valid_knees[frames].mean())
        knee_value = _median_at(knee_mean, frames)
        asymmetry_value = _median_at(knee_asymmetry, frames)
        confidence = _episode_confidence(min(1.0, duration / 2.0), mean_conf, valid_ratio)

        metrics: list[Metric] = [
            _make_metric(
                key="ready_knee_angle",
                label="Ready-stance knee bend",
                value=knee_value,
                unit=MetricUnit.DEG,
                view="both",
                availability=valid_ratio,
                mean_confidence=mean_conf,
                frame_count=int(valid_frames.size),
            ),
            _make_metric(
                key="ready_knee_asymmetry",
                label="Left/right knee difference",
                value=asymmetry_value,
                unit=MetricUnit.DEG,
                view="both",
                availability=valid_ratio,
                mean_confidence=mean_conf,
                frame_count=int(valid_frames.size),
            ),
        ]

        if view == CameraView.FRONT:
            shoulder_width = np.abs(_point(pose, 5)[:, 0] - _point(pose, 6)[:, 0])
            width_valid = ankles_ok & shoulder_valid & np.isfinite(shoulder_width) & (shoulder_width > 1.0)
            stance_width = ankle_separation * pose.torso_len / np.where(shoulder_width > 1.0, shoulder_width, np.nan)
            width_value = _median_at(stance_width, frames)
            metrics.append(
                _make_metric(
                    key="ready_stance_width_ratio",
                    label="Stance width vs shoulders",
                    value=width_value,
                    unit=MetricUnit.RATIO,
                    view=CameraView.FRONT,
                    availability=float(width_valid[frames].mean()),
                    mean_confidence=_mean_conf(pose, [5, 6, 15, 16], frames),
                    frame_count=int(width_valid[frames].sum()),
                )
            )

        episodes.append(
            Episode(
                id="",
                type=EpisodeType.READY_STANCE,
                label="Ready stance",
                start_s=round(start / fps, 3),
                end_s=round(min(pose.frame_count, end + 1) / fps, 3),
                key_frame_s=round(key_frame / fps, 3),
                start_frame=start,
                end_frame=end,
                confidence=confidence,
                lead_side=None,
                metrics=metrics,
            )
        )

    episodes.sort(key=lambda episode: episode.end_s - episode.start_s, reverse=True)
    return episodes[:6]


def segment_movements(
    pose: SelectedPose,
    *,
    view: CameraView,
    dominant_hand: DominantHand,
    fps: float,
) -> SegmentationResult:
    overhead = _build_overhead_episodes(pose, dominant_hand, fps)
    lunge = _build_lunge_episodes(pose, view, fps)
    ready = _build_ready_episodes(pose, view, fps)

    all_episodes = overhead + lunge + ready
    all_episodes.sort(key=lambda episode: (episode.start_s, episode.type))
    counters: dict[str, int] = {}
    for episode in all_episodes:
        counters[episode.type] = counters.get(episode.type, 0) + 1
        episode.id = f"{episode.type}_{counters[episode.type]:02d}"
        episode.label = f"{episode.label} {counters[episode.type]}"

    masks = {
        EpisodeType.OVERHEAD_MOTION: np.zeros(pose.frame_count, dtype=bool),
        EpisodeType.LUNGE: np.zeros(pose.frame_count, dtype=bool),
        EpisodeType.READY_STANCE: np.zeros(pose.frame_count, dtype=bool),
    }
    for episode in all_episodes:
        masks[EpisodeType(episode.type)][episode.start_frame : episode.end_frame + 1] = True

    return SegmentationResult(episodes=all_episodes, masks=masks)


def aggregate_clip_metrics(episodes: list[Episode]) -> list[Metric]:
    grouped: dict[str, list[Metric]] = {}
    for episode in episodes:
        for metric in episode.metrics:
            if metric.valid and metric.value is not None:
                grouped.setdefault(metric.key, []).append(metric)
    clip_metrics: list[Metric] = []
    for metrics in grouped.values():
        values = [metric.value for metric in metrics if metric.value is not None]
        if not values:
            continue
        template = metrics[0]
        clip_metrics.append(
            template.model_copy(
                update={
                    "value": round(float(np.median(values)), 3),
                    "n_frames": sum(metric.n_frames for metric in metrics),
                }
            )
        )
    return clip_metrics
