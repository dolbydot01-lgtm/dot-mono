from __future__ import annotations

import json
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.errors import ApiError
from app.models import Analysis
from app.pipeline.media import MediaError, probe_media, validate_source
from app.services.storage import analysis_dir, remove_analysis_dir

router = APIRouter(prefix="/api/v1/analyses", tags=["analyses"])
settings = get_settings()

ALLOWED_SUFFIXES = {".mp4", ".mov", ".webm", ".m4v"}


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


def _serialize_summary(analysis: Analysis, include_quality: bool = False) -> dict:
    payload = {
        "id": analysis.id,
        "created_at": _iso(analysis.created_at),
        "status": analysis.status,
        "stage": analysis.stage,
        "progress": analysis.progress,
        "report_status": analysis.report_status,
        "duration_s": analysis.duration_s,
        "view": analysis.view,
        "dominant_hand": analysis.dominant_hand,
        "original_filename": analysis.original_filename,
        "error": (
            {"code": analysis.error_code, "message": analysis.error_message}
            if analysis.status == "failed" and analysis.error_code
            else None
        ),
        "report_error": analysis.report_error,
        "has_video": bool(analysis.annotated_path and Path(analysis.annotated_path).exists()),
        "quality": None,
    }
    if include_quality and analysis.result_path and Path(analysis.result_path).exists():
        try:
            result = json.loads(Path(analysis.result_path).read_text(encoding="utf-8"))
            quality = result.get("capture_quality", {})
            payload["quality"] = {
                "overall": quality.get("overall"),
                "analyzable": quality.get("analyzable"),
                "score": quality.get("score"),
            }
            payload["report_status"] = result.get("report", {}).get("status", analysis.report_status)
        except (OSError, ValueError):
            pass
    return payload


def _range_response(path: Path, request: Request) -> StreamingResponse | FileResponse:
    file_size = path.stat().st_size
    range_header = request.headers.get("range")
    common_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": f'inline; filename="{path.name}"',
    }
    if not range_header:
        return FileResponse(path, media_type="video/mp4", headers=common_headers)

    try:
        unit, _, value = range_header.partition("=")
        if unit.strip().lower() != "bytes":
            raise ValueError
        start_text, _, end_text = value.partition("-")
        start = int(start_text) if start_text else 0
        end = int(end_text) if end_text else file_size - 1
        end = min(end, file_size - 1)
        if start < 0 or start > end or start >= file_size:
            raise ValueError
    except ValueError as exc:
        raise ApiError(416, "INVALID_RANGE", "The requested video range is invalid.") from exc

    length = end - start + 1

    def iter_file():
        with path.open("rb") as handle:
            handle.seek(start)
            remaining = length
            while remaining > 0:
                chunk = handle.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    headers = {
        **common_headers,
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(length),
    }
    return StreamingResponse(iter_file(), status_code=206, media_type="video/mp4", headers=headers)


@router.post("", status_code=202)
async def create_analysis(
    request: Request,
    video: Annotated[UploadFile, File()],
    view: Annotated[Literal["side", "front"], Form()],
    dominant_hand: Annotated[Literal["left", "right"], Form()],
    mirrored: Annotated[bool, Form()] = False,
    db: Session = Depends(get_db),
):
    del request
    filename = Path(video.filename or "clip.mp4").name
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ApiError(422, "UNSUPPORTED_FILE", "Upload an MP4, MOV, WebM, or M4V video.")

    analysis_id = str(uuid.uuid4())
    directory = analysis_dir(analysis_id)
    original_path = directory / f"original{suffix}"
    max_bytes = settings.max_upload_mb * 1024 * 1024
    size = 0
    try:
        with original_path.open("wb") as handle:
            while chunk := await video.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise ApiError(
                        413,
                        "FILE_TOO_LARGE",
                        f"Keep the clip under {settings.max_upload_mb} MB.",
                    )
                handle.write(chunk)
        await video.close()
        if size == 0:
            raise ApiError(422, "EMPTY_FILE", "The uploaded file is empty.")
        info = probe_media(original_path)
        validate_source(info)
    except MediaError as exc:
        remove_analysis_dir(analysis_id)
        raise ApiError(422, exc.code, exc.message) from exc
    except ApiError:
        remove_analysis_dir(analysis_id)
        raise
    except Exception:
        remove_analysis_dir(analysis_id)
        raise

    analysis = Analysis(
        id=analysis_id,
        status="queued",
        stage="queued",
        progress=0,
        original_filename=filename,
        content_type=video.content_type,
        size_bytes=size,
        duration_s=info.duration_s,
        width=info.width,
        height=info.height,
        fps_native=info.fps,
        view=view,
        dominant_hand=dominant_hand,
        mirrored=mirrored,
        original_path=str(original_path),
        report_status="pending",
    )
    db.add(analysis)
    db.commit()
    return JSONResponse(
        status_code=202,
        content={"id": analysis.id, "status": analysis.status},
    )


@router.get("")
def list_analyses(limit: int = 20, db: Session = Depends(get_db)):
    limit = max(1, min(limit, 50))
    rows = db.scalars(
        select(Analysis).order_by(Analysis.created_at.desc()).limit(limit)
    ).all()
    return {"items": [_serialize_summary(row, include_quality=True) for row in rows]}


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise ApiError(404, "NOT_FOUND", "Analysis not found.")
    return _serialize_summary(analysis, include_quality=True)


@router.get("/{analysis_id}/result")
def get_result(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise ApiError(404, "NOT_FOUND", "Analysis not found.")
    if analysis.status != "completed" or not analysis.result_path:
        raise ApiError(409, "NOT_READY", "The analysis is still running.")
    path = Path(analysis.result_path)
    if not path.exists():
        raise ApiError(500, "RESULT_MISSING", "The result file is missing.")
    return JSONResponse(content=json.loads(path.read_text(encoding="utf-8")))


@router.get("/{analysis_id}/video")
def get_video(analysis_id: str, request: Request, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise ApiError(404, "NOT_FOUND", "Analysis not found.")
    if not analysis.annotated_path or not Path(analysis.annotated_path).exists():
        raise ApiError(404, "VIDEO_NOT_READY", "The annotated video is not available.")
    return _range_response(Path(analysis.annotated_path), request)


@router.get("/{analysis_id}/thumbnail")
def get_thumbnail(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise ApiError(404, "NOT_FOUND", "Analysis not found.")
    if not analysis.thumbnail_path or not Path(analysis.thumbnail_path).exists():
        raise ApiError(404, "THUMBNAIL_NOT_READY", "The thumbnail is not available.")
    return FileResponse(
        analysis.thumbnail_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("/{analysis_id}/pose")
def get_pose(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise ApiError(404, "NOT_FOUND", "Analysis not found.")
    if not analysis.pose_path or not Path(analysis.pose_path).exists():
        raise ApiError(404, "POSE_NOT_READY", "Pose data is not available.")
    return FileResponse(analysis.pose_path, media_type="application/json")


@router.post("/{analysis_id}/report/retry", status_code=202)
def retry_report(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise ApiError(404, "NOT_FOUND", "Analysis not found.")
    if analysis.status != "completed" or not analysis.result_path:
        raise ApiError(409, "NOT_READY", "The analysis is not complete.")
    if analysis.report_status in {"pending", "generating"}:
        raise ApiError(409, "REPORT_BUSY", "The report is already being generated.")
    result = json.loads(Path(analysis.result_path).read_text(encoding="utf-8"))
    if not result.get("capture_quality", {}).get("analyzable"):
        raise ApiError(409, "NOT_ANALYZABLE", "This clip cannot produce a coaching report.")
    analysis.report_status = "pending"
    analysis.report_error = None
    analysis.updated_at = datetime.now(UTC)
    db.commit()
    return JSONResponse(status_code=202, content={"id": analysis.id, "status": "pending"})


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise ApiError(404, "NOT_FOUND", "Analysis not found.")
    db.delete(analysis)
    db.commit()
    shutil.rmtree(settings.analyses_dir / analysis_id, ignore_errors=True)
    return None
