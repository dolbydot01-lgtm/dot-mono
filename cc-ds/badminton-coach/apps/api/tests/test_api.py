from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.coaching.catalog import catalog_by_id
from app.contracts.analysis_result import AnalysisResult, ReportDraft
from app.db import SessionLocal
from app.worker import run_once

REPO_ROOT = Path(__file__).resolve().parents[3]


def upload_clip(client: TestClient, fixture_video: Path):
    with fixture_video.open("rb") as handle:
        return client.post(
            "/api/v1/analyses",
            files={"video": ("synthetic-athlete.mp4", handle, "video/mp4")},
            data={"view": "side", "dominant_hand": "right", "mirrored": "false"},
        )


def process_one_job() -> bool:
    with SessionLocal() as db:
        return run_once(db)


def test_health_reports_dependencies(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["database"] is True
    assert payload["ffmpeg"] is True
    assert payload["pose_backend"] == "fake"
    assert payload["report_model"] == "claude-opus-5-5"


def test_upload_rejects_non_video(client: TestClient):
    response = client.post(
        "/api/v1/analyses",
        files={"video": ("notes.mp4", b"not really a video", "video/mp4")},
        data={"view": "side", "dominant_hand": "right", "mirrored": "false"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] in {"INVALID_VIDEO", "PROBE_FAILED"}


def test_full_analysis_flow(client: TestClient, fixture_video: Path):
    upload = upload_clip(client, fixture_video)
    assert upload.status_code == 202, upload.text
    analysis_id = upload.json()["id"]

    queued = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert queued["status"] == "queued"

    assert process_one_job() is True

    status = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert status["status"] == "completed"
    assert status["progress"] == 100
    assert status["has_video"] is True
    assert status["quality"]["analyzable"] is True

    result_response = client.get(f"/api/v1/analyses/{analysis_id}/result")
    assert result_response.status_code == 200
    result = result_response.json()
    parsed = AnalysisResult.model_validate(result)
    assert parsed.schema_version == "1.0"
    assert parsed.source.view == "side"
    assert parsed.source.dominant_hand == "right"
    assert len(parsed.episodes) >= 1
    assert parsed.report.status == "template"
    assert parsed.report.provider == "template"
    assert parsed.disclaimer
    assert any(str(fault.code) == "READY_KNEES_TOO_STRAIGHT" for fault in parsed.faults)
    assert all(
        fault.time_range.start_s >= 0 and fault.time_range.end_s <= parsed.source.duration_s
        for fault in parsed.faults
    )
    assert parsed.report.priorities
    assert parsed.report.exercise_plan
    catalog = catalog_by_id()
    for exercise in parsed.report.exercise_plan:
        assert exercise.exercise_id in catalog
        assert exercise.dosage == catalog[exercise.exercise_id].dosage
    priority_fault_ids = [fault_id for item in parsed.report.priorities for fault_id in item.fault_ids]
    assert len(priority_fault_ids) == len(set(priority_fault_ids))

    video = client.get(f"/api/v1/analyses/{analysis_id}/video")
    assert video.status_code == 200
    assert video.headers["content-type"] == "video/mp4"
    assert video.headers["accept-ranges"] == "bytes"

    ranged = client.get(
        f"/api/v1/analyses/{analysis_id}/video",
        headers={"Range": "bytes=0-1023"},
    )
    assert ranged.status_code == 206
    assert ranged.headers["content-range"].startswith("bytes 0-1023/")
    assert len(ranged.content) == 1024

    thumbnail = client.get(f"/api/v1/analyses/{analysis_id}/thumbnail")
    assert thumbnail.status_code == 200
    assert thumbnail.headers["content-type"] == "image/jpeg"

    listing = client.get("/api/v1/analyses").json()
    assert listing["items"][0]["id"] == analysis_id
    assert listing["items"][0]["quality"]["analyzable"] is True

    invalid_range = client.get(
        f"/api/v1/analyses/{analysis_id}/video",
        headers={"Range": "bytes=999999999-"},
    )
    assert invalid_range.status_code == 416
    assert invalid_range.json()["error"]["code"] == "INVALID_RANGE"


def test_report_retry_enqueues_and_runs(client: TestClient, fixture_video: Path):
    upload = upload_clip(client, fixture_video)
    analysis_id = upload.json()["id"]
    assert process_one_job() is True
    assert client.get(f"/api/v1/analyses/{analysis_id}").json()["status"] == "completed"

    retry = client.post(f"/api/v1/analyses/{analysis_id}/report/retry")
    assert retry.status_code == 202
    assert retry.json()["status"] == "pending"

    assert process_one_job() is True
    status = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert status["report_status"] == "template"
    assert status["status"] == "completed"


def test_unknown_analysis_returns_404(client: TestClient):
    response = client.get("/api/v1/analyses/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_checked_in_contracts_match_code():
    schema_path = REPO_ROOT / "contracts" / "analysis-result.schema.json"
    report_path = REPO_ROOT / "contracts" / "report-draft.schema.json"
    assert json.loads(schema_path.read_text(encoding="utf-8")) == AnalysisResult.model_json_schema()
    assert json.loads(report_path.read_text(encoding="utf-8")) == ReportDraft.model_json_schema()
