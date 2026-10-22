from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.pipeline.pose.base import LEFT_RIGHT_PAIRS, PoseDetection, PoseFrame, PoseSequence
from app.pipeline.smoothing import smooth_keypoints


@dataclass
class SelectedPose:
    keypoints: np.ndarray  # (T, 17, 2) smoothed pixels
    confidence: np.ndarray  # (T, 17)
    usable: np.ndarray  # (T, 17)
    observed: np.ndarray  # (T, 17)
    bboxes: np.ndarray  # (T, 4), NaN when absent
    present: np.ndarray  # (T,)
    person_counts: np.ndarray  # (T,)
    track_id: int | None
    coverage: float
    mean_keypoint_confidence: float
    bbox_height_ratio: float
    multiple_people_ratio: float
    torso_len: float
    width: int
    height: int
    fps: float
    frame_count: int


def _bbox_area(bbox: tuple[float, float, float, float]) -> float:
    x1, y1, x2, y2 = bbox
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def _bbox_height(bbox: tuple[float, float, float, float]) -> float:
    return max(0.0, bbox[3] - bbox[1])


def _mean_confidence(detection: PoseDetection) -> float:
    confidence = detection.keypoints[:, 2]
    return float(np.nanmean(confidence)) if confidence.size else 0.0


def _track_scores(frames: list[PoseFrame], width: int, height: int) -> dict[int, float]:
    total = max(1, len(frames))
    by_track: dict[int, list[tuple[int, PoseDetection]]] = {}
    for index, frame in enumerate(frames):
        for detection in frame.detections:
            if detection.track_id is not None:
                by_track.setdefault(detection.track_id, []).append((index, detection))

    frame_area = max(1.0, float(width * height))
    diagonal = max(1.0, float(np.hypot(width, height)))
    scores: dict[int, float] = {}
    for track_id, entries in by_track.items():
        area_score = float(np.mean([min(1.0, _bbox_area(det.bbox) / frame_area * 6.0) for _, det in entries]))
        confidence_score = float(np.mean([_mean_confidence(det) for _, det in entries]))
        center_scores = []
        for _, detection in entries:
            x1, y1, x2, y2 = detection.bbox
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            distance = float(np.hypot(cx - width / 2.0, cy - height / 2.0))
            center_scores.append(max(0.0, 1.0 - distance / (diagonal / 2.0)))
        persistence = len({index for index, _ in entries}) / total
        scores[track_id] = (
            0.45 * area_score
            + 0.25 * confidence_score
            + 0.20 * float(np.mean(center_scores))
            + 0.10 * persistence
        )
    return scores


def _choose_untracked(frame: PoseFrame, width: int, height: int) -> PoseDetection | None:
    if not frame.detections:
        return None
    diagonal = max(1.0, float(np.hypot(width, height)))
    return max(
        frame.detections,
        key=lambda det: (
            _bbox_area(det.bbox)
            * max(0.05, _mean_confidence(det))
            * max(0.2, 1.0 - np.hypot((det.bbox[0] + det.bbox[2]) / 2 - width / 2, (det.bbox[1] + det.bbox[3]) / 2 - height / 2) / diagonal)
        ),
    )


def _swap_left_right(keypoints: np.ndarray) -> np.ndarray:
    swapped = keypoints.copy()
    for left, right in LEFT_RIGHT_PAIRS:
        swapped[:, [left, right], :] = swapped[:, [right, left], :]
    return swapped


def select_subject(sequence: PoseSequence, *, mirrored: bool) -> SelectedPose:
    frames = sequence.frames
    count = len(frames)
    width, height = sequence.width, sequence.height
    scores = _track_scores(frames, width, height)
    selected_track = max(scores, key=scores.get) if scores else None

    raw = np.full((count, 17, 3), np.nan, dtype=np.float32)
    bboxes = np.full((count, 4), np.nan, dtype=np.float32)
    present = np.zeros(count, dtype=bool)
    person_counts = np.array([len(frame.detections) for frame in frames], dtype=np.int32)

    for index, frame in enumerate(frames):
        detection: PoseDetection | None = None
        if selected_track is not None:
            matching = [d for d in frame.detections if d.track_id == selected_track]
            if matching:
                detection = max(matching, key=lambda d: _bbox_area(d.bbox))
        else:
            detection = _choose_untracked(frame, width, height)

        if detection is None:
            continue
        raw[index] = detection.keypoints
        bboxes[index] = detection.bbox
        present[index] = True

    if mirrored:
        raw = _swap_left_right(raw)

    observed = np.isfinite(raw[:, :, 0]) & np.isfinite(raw[:, :, 1]) & (raw[:, :, 2] >= 0.30)
    keypoints_px = raw[:, :, :2].astype(np.float32)
    confidence = np.nan_to_num(raw[:, :, 2], nan=0.0).astype(np.float32)
    smoothed, usable, observed = smooth_keypoints(
        keypoints_px,
        observed,
        fps=sequence.fps,
    )

    # Torso length: midpoint of shoulders to midpoint of hips.
    left_shoulder = smoothed[:, 5]
    right_shoulder = smoothed[:, 6]
    left_hip = smoothed[:, 11]
    right_hip = smoothed[:, 12]
    shoulder_mid = (left_shoulder + right_shoulder) / 2.0
    hip_mid = (left_hip + right_hip) / 2.0
    torso_values = np.linalg.norm(shoulder_mid - hip_mid, axis=1)
    torso_valid = (
        usable[:, 5] & usable[:, 6] & usable[:, 11] & usable[:, 12] & np.isfinite(torso_values)
    )
    torso_len = (
        float(np.nanmedian(torso_values[torso_valid]))
        if np.any(torso_valid)
        else max(1.0, height * 0.25)
    )
    if not np.isfinite(torso_len) or torso_len <= 1.0:
        torso_len = max(1.0, height * 0.25)

    coverage = float(present.mean()) if count else 0.0
    observed_conf = confidence[observed]
    mean_confidence = float(np.mean(observed_conf)) if observed_conf.size else 0.0

    bbox_heights = bboxes[present, 3] - bboxes[present, 1]
    bbox_height_ratio = (
        float(np.nanmedian(bbox_heights) / height) if bbox_heights.size and height else 0.0
    )

    multiple_frames = 0
    for frame in frames:
        if len(frame.detections) < 2:
            continue
        heights = sorted((_bbox_height(d.bbox) for d in frame.detections), reverse=True)
        if heights[1] >= heights[0] * 0.45 and heights[1] >= height * 0.20:
            multiple_frames += 1
    multiple_ratio = multiple_frames / max(1, count)

    return SelectedPose(
        keypoints=smoothed,
        confidence=confidence,
        usable=usable,
        observed=observed,
        bboxes=bboxes,
        present=present,
        person_counts=person_counts,
        track_id=selected_track,
        coverage=coverage,
        mean_keypoint_confidence=mean_confidence,
        bbox_height_ratio=bbox_height_ratio,
        multiple_people_ratio=multiple_ratio,
        torso_len=torso_len,
        width=width,
        height=height,
        fps=sequence.fps,
        frame_count=count,
    )
