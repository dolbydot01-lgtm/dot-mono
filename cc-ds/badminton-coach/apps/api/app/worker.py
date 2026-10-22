from __future__ import annotations

import logging
import time
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal, init_db
from app.models import Analysis
from app.pipeline.media import MediaError
from app.pipeline.orchestrator import process_analysis, process_pending_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("badminton-coach.worker")
settings = get_settings()


def _requeue_stale(db) -> None:
    now = datetime.now(UTC)
    job_cutoff = now - timedelta(minutes=settings.stale_job_minutes)
    rows = db.scalars(
        select(Analysis).where(
            Analysis.status == "processing",
            Analysis.updated_at < job_cutoff,
        )
    ).all()
    for row in rows:
        if row.attempts < settings.max_analysis_attempts:
            row.status = "queued"
            row.stage = "queued"
            row.progress = 0
            row.error_code = None
            row.error_message = None
            logger.warning("Requeued stale analysis %s", row.id)
        else:
            row.status = "failed"
            row.stage = "failed"
            row.error_code = "STALE_JOB"
            row.error_message = "Analysis did not finish. Try uploading the clip again."
            logger.error("Marked stale analysis %s as failed", row.id)
        row.updated_at = now
    db.commit()

    report_cutoff = now - timedelta(minutes=10)
    report_rows = db.scalars(
        select(Analysis).where(
            Analysis.status == "completed",
            Analysis.report_status == "generating",
            Analysis.updated_at < report_cutoff,
        )
    ).all()
    for row in report_rows:
        row.report_status = "pending"
        row.updated_at = now
        logger.warning("Requeued stalled report for analysis %s", row.id)
    db.commit()


def _claim_queued(db) -> Analysis | None:
    analysis = db.scalars(
        select(Analysis)
        .where(Analysis.status == "queued")
        .order_by(Analysis.created_at.asc())
        .limit(1)
    ).first()
    if analysis is None:
        return None
    analysis.status = "processing"
    analysis.stage = "starting"
    analysis.progress = 0
    analysis.attempts += 1
    analysis.updated_at = datetime.now(UTC)
    db.commit()
    logger.info("Claimed analysis %s (attempt %s)", analysis.id, analysis.attempts)
    return analysis


def _claim_pending_report(db) -> Analysis | None:
    analysis = db.scalars(
        select(Analysis)
        .where(
            Analysis.status == "completed",
            Analysis.report_status == "pending",
            Analysis.result_path.is_not(None),
        )
        .order_by(Analysis.updated_at.asc())
        .limit(1)
    ).first()
    if analysis is None:
        return None
    analysis.report_status = "generating"
    analysis.updated_at = datetime.now(UTC)
    db.commit()
    logger.info("Claimed report retry for analysis %s", analysis.id)
    return analysis


def _mark_failed(db, analysis: Analysis, exc: Exception) -> None:
    now = datetime.now(UTC)
    if isinstance(exc, MediaError):
        analysis.error_code = exc.code
        analysis.error_message = exc.message
    else:
        analysis.error_code = "INTERNAL_ERROR"
        analysis.error_message = "The analysis failed unexpectedly. Try a different clip."
    if analysis.status == "completed":
        analysis.report_status = "failed"
        analysis.report_error = str(exc)
        analysis.updated_at = now
        logger.exception("Report generation failed for completed analysis %s", analysis.id)
    else:
        analysis.status = "failed"
        analysis.stage = "failed"
        analysis.progress = 100
        analysis.updated_at = now
        analysis.finished_at = now
        logger.exception("Analysis %s failed", analysis.id)
    db.commit()


def run_once(db) -> bool:
    _requeue_stale(db)
    analysis = _claim_queued(db)
    if analysis is not None:
        try:
            process_analysis(db, analysis, settings)
        except Exception as exc:
            db.rollback()
            _mark_failed(db, analysis, exc)
        return True

    report = _claim_pending_report(db)
    if report is not None:
        try:
            process_pending_report(db, report, settings)
        except Exception as exc:
            db.rollback()
            _mark_failed(db, report, exc)
        return True
    return False


def main() -> None:
    init_db()
    logger.info(
        "Worker started: pose_backend=%s model=%s report_provider=%s",
        settings.pose_backend,
        settings.pose_model,
        settings.report_provider,
    )
    while True:
        with SessionLocal() as db:
            worked = run_once(db)
        if not worked:
            time.sleep(settings.worker_poll_seconds)


if __name__ == "__main__":
    main()
