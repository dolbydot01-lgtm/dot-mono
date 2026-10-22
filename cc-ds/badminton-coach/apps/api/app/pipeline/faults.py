from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import yaml

from app.contracts.analysis_result import (
    CameraView,
    Episode,
    Fault,
    FaultCode,
    FaultEvidence,
    FaultTimeRange,
    Metric,
    Observation,
    ObservationKind,
    Reliability,
    Severity,
)
from app.pipeline.subject import SelectedPose

FAULTS_PATH = Path(__file__).with_name("faults.yaml")


@lru_cache
def load_fault_config() -> dict[str, Any]:
    with FAULTS_PATH.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def rules_version() -> str:
    return str(load_fault_config().get("version", "unknown"))


def _metric_map(episode: Episode) -> dict[str, Metric]:
    return {metric.key: metric for metric in episode.metrics}


def _compare(value: float, comparator: str, threshold: float) -> bool:
    if comparator == "gt":
        return value > threshold
    if comparator == "gte":
        return value >= threshold
    if comparator == "lt":
        return value < threshold
    if comparator == "lte":
        return value <= threshold
    return False


def _reliability_score(reliability: Reliability | str) -> float:
    value = str(reliability)
    if "high" in value:
        return 0.92
    if "medium" in value:
        return 0.74
    return 0.55


def _representative_frames(episode: Episode, key_frame: int, limit: int = 8) -> list[int]:
    start, end = episode.start_frame, episode.end_frame
    candidates = np.linspace(start, end, num=min(limit, max(1, end - start + 1)), dtype=int)
    frames = {int(frame) for frame in candidates}
    frames.add(int(np.clip(key_frame, start, end)))
    return sorted(frames)


def _min_confidence(pose: SelectedPose, episode: Episode, joints: list[int]) -> float:
    frame_slice = slice(episode.start_frame, episode.end_frame + 1)
    values = pose.confidence[frame_slice][:, joints]
    values = values[np.isfinite(values)]
    return float(np.min(values)) if values.size else 0.0


def _time_range(episode: Episode) -> FaultTimeRange:
    return FaultTimeRange(start_s=episode.start_s, end_s=episode.end_s)


def evaluate_faults(
    *,
    episodes: list[Episode],
    pose: SelectedPose,
    view: CameraView,
) -> tuple[list[Fault], list[Observation]]:
    config = load_fault_config()
    faults: list[Fault] = []
    selected_view = str(view)
    fault_index = 0

    for episode in episodes:
        episode_type = str(episode.type)
        metrics = _metric_map(episode)
        for code, rule in config.get("faults", {}).items():
            if rule.get("episode_type") != episode_type:
                continue
            if selected_view not in [str(item) for item in rule.get("view_requirements", [])]:
                continue
            metric = metrics.get(rule["metric_key"])
            if metric is None or not metric.valid or metric.value is None:
                continue
            threshold = float(rule["threshold"])
            if not _compare(float(metric.value), str(rule["comparator"]), threshold):
                continue

            key_frame = int(round(episode.key_frame_s * pose.fps))
            joints = [int(joint) for joint in rule.get("joints", [])]
            evidence_frames = _representative_frames(episode, key_frame)
            min_conf = _min_confidence(pose, episode, joints)
            confidence = float(
                np.clip(
                    0.55 * float(episode.confidence)
                    + 0.30 * _reliability_score(metric.reliability)
                    + 0.15 * min(1.0, metric.n_frames / 12.0),
                    0.0,
                    0.95,
                )
            )
            if confidence < 0.55:
                continue
            reliability = (
                Reliability.HIGH
                if confidence >= 0.78
                else Reliability.MEDIUM
                if confidence >= 0.64
                else Reliability.LOW
            )
            fault_index += 1
            faults.append(
                Fault(
                    id=f"f_{fault_index:03d}",
                    code=FaultCode(code),
                    title=str(rule["title"]),
                    category=str(rule["category"]),
                    severity=Severity(str(rule["severity"])),
                    confidence=round(confidence, 3),
                    reliability=reliability,
                    episode_id=episode.id,
                    time_range=_time_range(episode),
                    evidence_frames=evidence_frames,
                    evidence=FaultEvidence(
                        metric_key=metric.key,
                        observed_value=float(metric.value),
                        unit=metric.unit,
                        threshold_value=threshold,
                        comparator=str(rule["comparator"]),
                        view_requirements=[CameraView(item) for item in rule["view_requirements"]],
                        frame_count=metric.n_frames,
                        min_keypoint_confidence=round(min_conf, 3),
                    ),
                    description=str(rule["description"]),
                    cue=str(rule["cue"]),
                )
            )

    severity_rank = {"major": 0, "minor": 1, "info": 2}
    faults.sort(key=lambda item: (severity_rank.get(str(item.severity), 3), -item.confidence))
    faults = faults[:12]

    observations = _positive_observations(episodes=episodes, view=view)
    return faults, observations


def _positive_observations(*, episodes: list[Episode], view: CameraView) -> list[Observation]:
    candidates: list[tuple[float, str, str, str, str]] = []
    selected_view = str(view)

    for episode in episodes:
        metrics = _metric_map(episode)
        if str(episode.type) == "overhead_motion":
            metric = metrics.get("peak_wrist_height")
            if metric and metric.valid and metric.value is not None and metric.value >= 0.75:
                candidates.append(
                    (
                        float(metric.value),
                        "High racket-hand reach",
                        f"The racket hand reaches {metric.value:.2f} torso lengths above the shoulder at the peak.",
                        episode.id,
                        "OVERHEAD_LOW_REACH",
                    )
                )
        if str(episode.type) == "lunge":
            metric = metrics.get("lead_knee_min_angle")
            if metric and metric.valid and metric.value is not None and metric.value <= 135:
                candidates.append(
                    (
                        135 - float(metric.value),
                        "Deep lunge position",
                        f"The lead knee reaches {metric.value:.0f} degrees, giving you room to load and push off.",
                        episode.id,
                        "LUNGE_SHALLOW",
                    )
                )
            trunk = metrics.get("trunk_lean_at_deepest")
            if (
                selected_view == str(CameraView.SIDE)
                and trunk
                and trunk.valid
                and trunk.value is not None
                and trunk.value <= 20
            ):
                candidates.append(
                    (
                        20 - float(trunk.value),
                        "Controlled torso position",
                        f"Your trunk stays within {trunk.value:.0f} degrees of vertical at the deepest lunge.",
                        episode.id,
                        "LUNGE_TRUNK_LEAN_EXCESSIVE",
                    )
                )
        if str(episode.type) == "ready_stance":
            knee = metrics.get("ready_knee_angle")
            if knee and knee.valid and knee.value is not None and 135 <= knee.value <= 165:
                candidates.append(
                    (
                        15 - abs(float(knee.value) - 150),
                        "Athletic ready stance",
                        f"Your knees stay bent to about {knee.value:.0f} degrees, keeping you ready to move.",
                        episode.id,
                        "READY_KNEES_TOO_STRAIGHT",
                    )
                )
            width = metrics.get("ready_stance_width_ratio")
            if (
                selected_view == str(CameraView.FRONT)
                and width
                and width.valid
                and width.value is not None
                and width.value >= 0.95
            ):
                candidates.append(
                    (
                        float(width.value),
                        "Wide, stable base",
                        f"Your stance is {width.value:.2f} times shoulder width, giving you a stable base.",
                        episode.id,
                        "READY_STANCE_NARROW",
                    )
                )

    candidates.sort(key=lambda item: item[0], reverse=True)
    seen: set[str] = set()
    observations: list[Observation] = []
    for _, title, detail, episode_id, fault_code in candidates:
        if title in seen:
            continue
        seen.add(title)
        observations.append(
            Observation(
                id=f"obs_{len(observations) + 1:03d}",
                kind=ObservationKind.STRENGTH,
                title=title,
                detail=detail,
                episode_id=episode_id,
                fault_code=FaultCode(fault_code),
            )
        )
        if len(observations) >= 3:
            break
    return observations
