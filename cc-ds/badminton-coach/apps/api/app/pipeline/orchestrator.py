from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.coaching.fallback import DISCLAIMER, skipped_report
from app.coaching.service import generate_report
from app.config import Settings
from app.contracts.analysis_result import (
    AnalysisResult,
    Artifacts,
    CameraView,
    CoachingReport,
    DominantHand,
    PipelineInfo,
    ReportStatus,
    SourceInfo,
)
from app.models import Analysis
from app.pipeline.faults import evaluate_faults, rules_version
from app.pipeline.media import MediaError, normalize_video, probe_media, validate_source
from app.pipeline.metrics import aggregate_clip_metrics, segment_movements
from app.pipeline.pose import create_pose_backend
from app.pipeline.quality import assess_quality, blur_variance
from app.pipeline.render import render_annotated_video
from app.pipeline.subject import select_subject
from app.pipeline.view import estimate_view
from app.services.storage import analysis_dir, write_json_atomic

PIPELINE_VERSION = "0.1.0"


def _update(db: Session, analysis: Analysis, **values) -> None:
    for key, value in values.items():
        setattr(analysis, key, value)
    analysis.updated_at = datetime.now(UTC)
    db.commit()


def _created_at(analysis: Analysis) -> str:
    value = analysis.created_at
    if value is None:
        return datetime.now(UTC).isoformat()
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


def _pending_report() -> CoachingReport:
    return CoachingReport(
        status=ReportStatus.PENDING,
        provider=None,
        model=None,
        generated_at=None,
        summary=None,
        strengths=[],
        priorities=[],
        coaching_cues=[],
        exercise_plan=[],
        limitations=[],
        disclaimer=DISCLAIMER,
        error=None,
    )


def _save_pose_artifact(path: Path, sequence, selected) -> None:
    frames = []
    for index, frame in enumerate(sequence.frames):
        if index >= len(selected.keypoints):
            break
        keypoints = selected.keypoints[index]
        confidence = selected.confidence[index]
        present = bool(selected.present[index])
        frames.append(
            {
                "frame": frame.frame_index,
                "t": round(frame.timestamp_s, 4),
                "present": present,
                "track_id": selected.track_id,
                "keypoints": [
                    [
                        None if not (present and selected.usable[index, joint]) else round(float(point[0]), 2),
                        None if not (present and selected.usable[index, joint]) else round(float(point[1]), 2),
                        round(float(confidence[joint]), 4),
                    ]
                    for joint, point in enumerate(keypoints)
                ],
            }
        )
    write_json_atomic(
        path,
        {
            "backend": sequence.backend,
            "model": sequence.model,
            "device": sequence.device,
            "fps": sequence.fps,
            "width": sequence.width,
            "height": sequence.height,
            "frames": frames,
        },
    )


def _store_report(
    db: Session,
    analysis: Analysis,
    result: AnalysisResult,
    settings: Settings,
    *,
    result_path: Path,
) -> None:
    _update(db, analysis, report_status=str(ReportStatus.GENERATING))
    outcome = generate_report(result, settings)
    result.report = outcome.report
    write_json_atomic(result_path, result.model_dump(mode="json"))
    _update(
        db,
        analysis,
        report_status=str(outcome.report.status),
        report_model=outcome.report.model,
        report_error=outcome.error_message,
        report_attempts=analysis.report_attempts + 1,
    )


def process_pending_report(db: Session, analysis: Analysis, settings: Settings) -> None:
    if not analysis.result_path:
        raise ValueError("The analysis has no result file.")
    result_path = Path(analysis.result_path)
    result = AnalysisResult.model_validate(json.loads(result_path.read_text(encoding="utf-8")))
    if not result.capture_quality.analyzable:
        result.report = skipped_report(result)
        write_json_atomic(result_path, result.model_dump(mode="json"))
        _update(db, analysis, report_status=str(result.report.status))
        return
    _store_report(db, analysis, result, settings, result_path=result_path)


def process_analysis(db: Session, analysis: Analysis, settings: Settings) -> None:
    if not analysis.original_path:
        raise MediaError("SOURCE_MISSING", "The uploaded source file is missing.")
    original_path = Path(analysis.original_path)
    directory = analysis_dir(analysis.id)
    normalized_path = directory / "source.mp4"
    annotated_path = directory / "annotated.mp4"
    thumbnail_path = directory / "thumbnail.jpg"
    pose_path = directory / "pose.json"
    result_path = directory / "result.json"

    _update(db, analysis, stage="validating", progress=5, started_at=datetime.now(UTC))
    original_info = probe_media(original_path)
    validate_source(original_info)
    normalized_info = normalize_video(
        original_path,
        normalized_path,
        max_width=settings.video_max_width,
        fps=settings.analysis_fps,
    )
    original_path.unlink(missing_ok=True)
    _update(
        db,
        analysis,
        stage="pose",
        progress=10,
        original_path=None,
        source_path=str(normalized_path),
        duration_s=normalized_info.duration_s,
        width=normalized_info.width,
        height=normalized_info.height,
        fps_native=original_info.fps,
    )

    backend = create_pose_backend(settings)
    raw_pose = backend.extract(normalized_path, normalized_info, fps=settings.analysis_fps)
    selected = select_subject(raw_pose, mirrored=bool(analysis.mirrored))
    _update(db, analysis, progress=65, stage="pose")
    _save_pose_artifact(pose_path, raw_pose, selected)
    _update(db, analysis, pose_path=str(pose_path))

    view = CameraView(analysis.view)
    dominant_hand = DominantHand(analysis.dominant_hand)
    view_estimate, _view_confidence = estimate_view(selected)
    blur = blur_variance(normalized_path)
    _update(db, analysis, stage="analyzing", progress=70)

    segmentation = segment_movements(
        selected,
        view=view,
        dominant_hand=dominant_hand,
        fps=normalized_info.fps,
    )
    faults, observations = evaluate_faults(
        episodes=segmentation.episodes,
        pose=selected,
        view=view,
    )
    quality = assess_quality(
        pose=selected,
        source_info=original_info,
        blur=blur,
        view=view.value,
        view_estimate=view_estimate,
        episode_count=len(segmentation.episodes),
    ).quality
    clip_metrics = aggregate_clip_metrics(segmentation.episodes)

    artifacts = Artifacts(
        annotated_video_url=None,
        thumbnail_url=None,
        pose_data_url=None,
    )

    if quality.analyzable:
        _update(db, analysis, stage="rendering", progress=85)
        render_annotated_video(
            source_video=normalized_path,
            output_video=annotated_path,
            thumbnail_path=thumbnail_path,
            pose=selected,
            episodes=segmentation.episodes,
            faults=faults,
            dominant_hand=dominant_hand.value,
            duration=normalized_info.duration_s,
        )
        artifacts = Artifacts(
            annotated_video_url=f"/api/v1/analyses/{analysis.id}/video",
            thumbnail_url=f"/api/v1/analyses/{analysis.id}/thumbnail",
            pose_data_url=f"/api/v1/analyses/{analysis.id}/pose",
        )
        _update(
            db,
            analysis,
            annotated_path=str(annotated_path),
            thumbnail_path=str(thumbnail_path),
        )
    else:
        faults = []
        observations = []
        clip_metrics = []
        segmentation.episodes = []

    result = AnalysisResult(
        analysis_id=analysis.id,
        created_at=_created_at(analysis),
        pipeline=PipelineInfo(
            version=PIPELINE_VERSION,
            rules_version=rules_version(),
            pose_backend=raw_pose.backend,
            pose_model=raw_pose.model,
            analysis_fps=settings.analysis_fps,
            device=raw_pose.device,
        ),
        source=SourceInfo(
            duration_s=normalized_info.duration_s,
            width=normalized_info.width,
            height=normalized_info.height,
            fps_native=original_info.fps,
            fps_analysis=settings.analysis_fps,
            view=view,
            view_source="user",
            view_estimate=view_estimate,
            dominant_hand=dominant_hand,
            mirrored=bool(analysis.mirrored),
            frame_count=selected.frame_count,
        ),
        capture_quality=quality,
        episodes=segmentation.episodes,
        metrics=clip_metrics,
        faults=faults,
        observations=observations,
        artifacts=artifacts,
        report=_pending_report(),
        disclaimer=DISCLAIMER,
    )

    if not quality.analyzable:
        result.report = skipped_report(result)

    write_json_atomic(result_path, result.model_dump(mode="json"))
    _update(
        db,
        analysis,
        status="completed",
        stage="completed",
        progress=100,
        result_path=str(result_path),
        report_status=str(result.report.status),
        finished_at=datetime.now(UTC),
    )

    if not quality.analyzable:
        return

    _store_report(db, analysis, result, settings, result_path=result_path)


