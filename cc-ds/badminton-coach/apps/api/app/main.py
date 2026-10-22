from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.db import SessionLocal, init_db
from app.errors import ApiError
from app.pipeline.media import MediaError, ffmpeg_available
from app.routers.analyses import router as analyses_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Badminton Coach API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)


@app.exception_handler(ApiError)
async def api_error_handler(_request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(MediaError)
async def media_error_handler(_request: Request, exc: MediaError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError):
    return JSONResponse(
        status_code=409,
        content={"error": {"code": "CONFLICT", "message": str(exc)}},
    )


@app.get("/api/v1/health")
def health():
    database_ok = False
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        database_ok = False

    if settings.pose_backend == "fake":
        model_status = "synthetic"
    elif Path(settings.pose_model).exists():
        model_status = "available"
    else:
        model_status = "downloads on first analysis"

    status = "ok" if database_ok and ffmpeg_available() else "degraded"
    return {
        "status": status,
        "database": database_ok,
        "ffmpeg": ffmpeg_available(),
        "pose_backend": settings.pose_backend,
        "pose_model": settings.pose_model,
        "pose_model_status": model_status,
        "report_provider": settings.report_provider,
        "report_model": settings.anthropic_model,
        "report_credentials_configured": bool(settings.anthropic_api_key),
    }


app.include_router(analyses_router)
