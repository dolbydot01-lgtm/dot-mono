from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

import pytest

TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="badminton-coach-tests-"))
os.environ["DATA_DIR"] = str(TEST_DATA_DIR)
os.environ["POSE_BACKEND"] = "fake"
os.environ["REPORT_PROVIDER"] = "template"
os.environ["COACH_ANTHROPIC_MODEL"] = "claude-opus-5-5"
os.environ["WORKER_POLL_SECONDS"] = "0.05"

from fastapi.testclient import TestClient  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.db import SessionLocal, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Analysis  # noqa: E402
from app.pipeline.media import MediaInfo  # noqa: E402
from app.pipeline.pose.fake_backend import FakePoseBackend  # noqa: E402
from app.pipeline.subject import SelectedPose, select_subject  # noqa: E402

settings = get_settings()
REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_VIDEO = REPO_ROOT / "fixtures" / "synthetic-athlete.mp4"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client
    shutil.rmtree(TEST_DATA_DIR, ignore_errors=True)


@pytest.fixture(autouse=True)
def clean_state(client):
    del client
    init_db()
    with SessionLocal() as db:
        db.query(Analysis).delete()
        db.commit()
    shutil.rmtree(settings.analyses_dir, ignore_errors=True)
    settings.analyses_dir.mkdir(parents=True, exist_ok=True)
    yield


@pytest.fixture
def fixture_video() -> Path:
    assert FIXTURE_VIDEO.exists(), "Run the fixture generation step or restore fixtures/synthetic-athlete.mp4."
    return FIXTURE_VIDEO


@pytest.fixture
def sample_info() -> MediaInfo:
    return MediaInfo(
        duration_s=10.0,
        width=640,
        height=360,
        fps=30.0,
        frame_count=300,
        codec="h264",
        has_audio=False,
    )


@pytest.fixture
def sample_pose(sample_info: MediaInfo) -> SelectedPose:
    media = MediaInfo(
        duration_s=10.0,
        width=640,
        height=360,
        fps=15.0,
        frame_count=150,
        codec="h264",
        has_audio=False,
    )
    sequence = FakePoseBackend().extract(Path("unused"), media, fps=15)
    return select_subject(sequence, mirrored=False)
