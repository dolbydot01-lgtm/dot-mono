from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from app.contracts.analysis_result import (
    CaptureQuality,
    QualityCheck,
    QualityOverall,
    QualityStatus,
    SubjectQuality,
)
from app.pipeline.media import MediaInfo
from app.pipeline.subject import SelectedPose


@dataclass
class QualityAssessment:
    quality: CaptureQuality
    blur_variance: float


def blur_variance(video_path: Path, sample_count: int = 10) -> float:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return 0.0
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if frame_count <= 0:
        capture.release()
        return 0.0
    indices = np.linspace(0, max(0, frame_count - 1), num=min(sample_count, frame_count), dtype=int)
    values: list[float] = []
    for index in indices:
        capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
        ok, frame = capture.read()
        if not ok or frame is None:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        values.append(float(cv2.Laplacian(gray, cv2.CV_64F).var()))
    capture.release()
    return float(np.median(values)) if values else 0.0


def _check(
    check_id: str,
    label: str,
    status: QualityStatus,
    value: float | str | None,
    unit: str | None,
    threshold: str | None,
    message: str,
    *,
    blocking: bool = False,
) -> QualityCheck:
    return QualityCheck(
        id=check_id,
        label=label,
        status=status,
        value=value,
        unit=unit,
        threshold=threshold,
        message=message,
        blocking=blocking,
    )


def assess_quality(
    *,
    pose: SelectedPose,
    source_info: MediaInfo,
    blur: float,
    view: str,
    view_estimate: str,
    episode_count: int,
) -> QualityAssessment:
    checks: list[QualityCheck] = []

    duration = source_info.duration_s
    if 10.0 <= duration <= 60.0:
        checks.append(
            _check("duration", "Clip length", QualityStatus.PASS, round(duration, 1), "s", "10-60 s", "Clip length is in the recommended range.")
        )
    elif 5.0 <= duration < 10.0 or 60.0 < duration <= 65.0:
        checks.append(
            _check("duration", "Clip length", QualityStatus.WARN, round(duration, 1), "s", "10-60 s", "A 10-60 second clip gives more reliable results.")
        )
    else:
        checks.append(
            _check("duration", "Clip length", QualityStatus.FAIL, round(duration, 1), "s", "10-60 s", "The clip is outside the supported length.", blocking=True)
        )

    short_side = min(source_info.width, source_info.height)
    if short_side >= 720:
        checks.append(
            _check("resolution", "Resolution", QualityStatus.PASS, f"{source_info.width}x{source_info.height}", None, ">= 720p short side", "Resolution is suitable for pose tracking.")
        )
    elif short_side >= 480:
        checks.append(
            _check("resolution", "Resolution", QualityStatus.WARN, f"{source_info.width}x{source_info.height}", None, ">= 720p short side", "Higher resolution will improve keypoint accuracy.")
        )
    else:
        message = (
            "The video is too low resolution for reliable pose tracking."
            if short_side < 360
            else "Resolution is below the recommended 720p short side; angles may be less reliable."
        )
        checks.append(
            _check(
                "resolution",
                "Resolution",
                QualityStatus.FAIL,
                f"{source_info.width}x{source_info.height}",
                None,
                ">= 720p short side",
                message,
                blocking=short_side < 360,
            )
        )

    if source_info.fps >= 24:
        checks.append(
            _check("fps", "Frame rate", QualityStatus.PASS, round(source_info.fps, 1), "fps", ">= 24 fps", "Frame rate is suitable.")
        )
    elif source_info.fps >= 15:
        checks.append(
            _check("fps", "Frame rate", QualityStatus.WARN, round(source_info.fps, 1), "fps", ">= 24 fps", "A higher frame rate will capture fast movements better.")
        )
    else:
        checks.append(
            _check("fps", "Frame rate", QualityStatus.FAIL, round(source_info.fps, 1), "fps", ">= 24 fps", "The frame rate is too low for movement analysis.", blocking=True)
        )

    coverage_pct = pose.coverage * 100
    if pose.coverage >= 0.85:
        checks.append(
            _check("subject_coverage", "Athlete tracked", QualityStatus.PASS, round(coverage_pct, 1), "%", ">= 85% of frames", "The athlete was tracked through most of the clip.")
        )
    elif pose.coverage >= 0.60:
        checks.append(
            _check("subject_coverage", "Athlete tracked", QualityStatus.WARN, round(coverage_pct, 1), "%", ">= 85% of frames", "The athlete was lost in part of the clip.")
        )
    else:
        checks.append(
            _check("subject_coverage", "Athlete tracked", QualityStatus.FAIL, round(coverage_pct, 1), "%", ">= 85% of frames", "The athlete could not be tracked reliably. Keep the full body in frame.", blocking=True)
        )

    confidence = pose.mean_keypoint_confidence
    if confidence >= 0.60:
        checks.append(
            _check("keypoint_confidence", "Pose confidence", QualityStatus.PASS, round(confidence, 2), None, ">= 0.60", "Body keypoints are clear.")
        )
    elif confidence >= 0.45:
        checks.append(
            _check("keypoint_confidence", "Pose confidence", QualityStatus.WARN, round(confidence, 2), None, ">= 0.60", "Some keypoints are uncertain. Fitted clothing and better lighting can help.")
        )
    else:
        checks.append(
            _check("keypoint_confidence", "Pose confidence", QualityStatus.FAIL, round(confidence, 2), None, ">= 0.60", "Pose confidence is too low for a reliable review.", blocking=True)
        )

    size_ratio = pose.bbox_height_ratio
    if 0.35 <= size_ratio <= 0.92:
        checks.append(
            _check("subject_size", "Athlete in frame", QualityStatus.PASS, round(size_ratio, 2), "frame height", "0.35-0.92", "The athlete fills a useful portion of the frame.")
        )
    elif 0.30 <= size_ratio < 0.35:
        checks.append(
            _check("subject_size", "Athlete in frame", QualityStatus.WARN, round(size_ratio, 2), "frame height", "0.35-0.92", "The athlete is small in frame. Move the camera closer.")
        )
    elif size_ratio > 0.92:
        checks.append(
            _check("subject_size", "Athlete in frame", QualityStatus.WARN, round(size_ratio, 2), "frame height", "0.35-0.92", "The athlete may be cropped. Leave space above the head and below the feet.")
        )
    else:
        checks.append(
            _check("subject_size", "Athlete in frame", QualityStatus.FAIL, round(size_ratio, 2), "frame height", "0.35-0.92", "The athlete is too small for reliable angles. Move the camera closer.", blocking=True)
        )

    multiple_pct = pose.multiple_people_ratio * 100
    if pose.multiple_people_ratio <= 0.10:
        checks.append(
            _check("multiple_people", "One athlete", QualityStatus.PASS, round(multiple_pct, 1), "% of frames", "<= 10%", "No persistent second athlete was detected.")
        )
    elif pose.multiple_people_ratio <= 0.30:
        checks.append(
            _check("multiple_people", "One athlete", QualityStatus.WARN, round(multiple_pct, 1), "% of frames", "<= 10%", "Another person appears in part of the clip; analysis may be less reliable.")
        )
    else:
        checks.append(
            _check("multiple_people", "One athlete", QualityStatus.FAIL, round(multiple_pct, 1), "% of frames", "<= 10%", "More than one person is visible. Record a solo clip for analysis.", blocking=True)
        )

    if blur >= 50:
        checks.append(
            _check("sharpness", "Sharpness", QualityStatus.PASS, round(blur, 1), None, ">= 50", "The clip is sharp enough for pose tracking.")
        )
    elif blur >= 20:
        checks.append(
            _check("sharpness", "Sharpness", QualityStatus.WARN, round(blur, 1), None, ">= 50", "Some motion blur or soft focus may reduce accuracy.")
        )
    else:
        checks.append(
            _check("sharpness", "Sharpness", QualityStatus.FAIL, round(blur, 1), None, ">= 50", "The clip is blurry. Use a stable camera and better light.")
        )

    if view_estimate in {"ambiguous", view}:
        checks.append(
            _check("view_match", "Camera angle", QualityStatus.PASS, view_estimate, None, view, "The selected camera view matches the pose geometry.")
        )
    else:
        checks.append(
            _check("view_match", "Camera angle", QualityStatus.WARN, view_estimate, None, view, f"You selected {view} view, but the pose looks more {view_estimate}-facing. Metrics are limited to the selected view.")
        )

    if episode_count > 0:
        checks.append(
            _check("movement_detected", "Movement detected", QualityStatus.PASS, episode_count, "episodes", ">= 1", "Recognizable movement episodes were found.")
        )
    else:
        checks.append(
            _check("movement_detected", "Movement detected", QualityStatus.WARN, 0, "episodes", ">= 1", "No overhead, lunge, or ready-stance episode was recognized. Try a clip with one clear repetition.")
        )

    blocking_failure = any(check.blocking and check.status == QualityStatus.FAIL for check in checks)
    any_failure = any(check.status == QualityStatus.FAIL for check in checks)
    any_warning = any(check.status == QualityStatus.WARN for check in checks)
    if blocking_failure:
        overall = QualityOverall.UNUSABLE
    elif any_failure:
        overall = QualityOverall.POOR
    elif any_warning:
        overall = QualityOverall.FAIR
    else:
        overall = QualityOverall.GOOD

    weights = {QualityStatus.PASS: 1.0, QualityStatus.WARN: 0.6, QualityStatus.FAIL: 0.15}
    score = round(100 * float(np.mean([weights[check.status] for check in checks])))
    limitations = [
        check.message
        for check in checks
        if check.status != QualityStatus.PASS and check.id != "movement_detected"
    ]

    quality = CaptureQuality(
        overall=overall,
        analyzable=not blocking_failure,
        score=max(0, min(100, score)),
        checks=checks,
        subject=SubjectQuality(
            track_id=pose.track_id,
            detection_coverage=round(pose.coverage, 3),
            mean_keypoint_confidence=round(pose.mean_keypoint_confidence, 3),
            bbox_height_ratio=round(pose.bbox_height_ratio, 3),
            multiple_people_detected=pose.multiple_people_ratio > 0.10,
            multiple_people_frame_ratio=round(pose.multiple_people_ratio, 3),
        ),
        limitations=limitations,
    )
    return QualityAssessment(quality=quality, blur_variance=blur)
