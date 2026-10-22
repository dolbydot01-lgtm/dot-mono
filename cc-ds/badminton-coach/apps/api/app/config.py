from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", REPO_ROOT / "apps" / "api" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    data_dir: Path = REPO_ROOT / "data"
    max_upload_mb: int = 200
    analysis_fps: int = 15
    video_max_width: int = 1280

    pose_backend: str = "ultralytics"
    pose_model: str = "yolo11n-pose.pt"
    pose_device: str = "auto"
    pose_confidence: float = 0.25

    report_provider: str = "anthropic"
    anthropic_api_key: str | None = None
    # COACH_ prefix avoids colliding with the ANTHROPIC_MODEL that Claude Code
    # and other local tools export for their own model routing.
    anthropic_model: str = Field(
        default="claude-opus-5-5",
        validation_alias="COACH_ANTHROPIC_MODEL",
    )
    anthropic_effort: str = Field(
        default="medium",
        validation_alias="COACH_ANTHROPIC_EFFORT",
    )
    anthropic_max_tokens: int = Field(
        default=16000,
        validation_alias="COACH_ANTHROPIC_MAX_TOKENS",
    )

    worker_poll_seconds: float = 1.0
    stale_job_minutes: int = 30
    max_analysis_attempts: int = 2

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator("data_dir")
    @classmethod
    def _resolve_data_dir(cls, value: Path) -> Path:
        value = value.expanduser()
        return value if value.is_absolute() else (REPO_ROOT / value).resolve()

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.data_dir / 'app.db'}"

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def analyses_dir(self) -> Path:
        return self.data_dir / "analyses"

    def prepare_directories(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.analyses_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.prepare_directories()
    return settings
