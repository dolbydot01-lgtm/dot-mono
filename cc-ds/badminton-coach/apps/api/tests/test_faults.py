from __future__ import annotations

from app.coaching.catalog import load_catalog
from app.coaching.validate import validate_draft
from app.contracts.analysis_result import (
    CameraView,
    Episode,
    EpisodeType,
    Fault,
    FaultCode,
    FaultEvidence,
    FaultTimeRange,
    Metric,
    MetricUnit,
    Observation,
    ObservationKind,
    Reliability,
    ReportCue,
    ReportDraft,
    ReportExercisePlanItem,
    ReportPriority,
    ReportStrength,
    Severity,
)
from app.pipeline.faults import evaluate_faults


def make_metric(key: str, value: float) -> Metric:
    return Metric(
        key=key,
        label=key,
        value=value,
        unit=MetricUnit.DEG,
        view="both",
        valid=True,
        reliability=Reliability.HIGH,
        n_frames=12,
    )


def make_episode(metrics: list[Metric]) -> Episode:
    return Episode(
        id="lunge_01",
        type=EpisodeType.LUNGE,
        label="Lunge / deep step 1",
        start_s=1.0,
        end_s=2.0,
        key_frame_s=1.5,
        start_frame=15,
        end_frame=30,
        confidence=0.9,
        lead_side="right",
        metrics=metrics,
    )


def make_fault() -> Fault:
    return Fault(
        id="f_001",
        code=FaultCode.LUNGE_SHALLOW,
        title="Lunge does not reach enough knee depth",
        category="lunge",
        severity=Severity.MAJOR,
        confidence=0.82,
        reliability=Reliability.HIGH,
        episode_id="lunge_01",
        time_range=FaultTimeRange(start_s=1.0, end_s=2.0),
        evidence_frames=[15, 20],
        evidence=FaultEvidence(
            metric_key="lead_knee_min_angle",
            observed_value=150.0,
            unit=MetricUnit.DEG,
            threshold_value=145.0,
            comparator="gt",
            view_requirements=[CameraView.SIDE, CameraView.FRONT],
            frame_count=12,
            min_keypoint_confidence=0.8,
        ),
        description="The lead knee stays high.",
        cue="Reach the foot out and bend the knee.",
    )


def make_observation() -> Observation:
    return Observation(
        id="obs_001",
        kind=ObservationKind.STRENGTH,
        title="Controlled torso",
        detail="The torso stays tall.",
        episode_id="lunge_01",
        fault_code=None,
    )


def make_draft(exercise_id: str, summary: str = "Your lunge reaches 150 degrees.") -> ReportDraft:
    return ReportDraft(
        summary=summary,
        strengths=[
            ReportStrength(
                title="Controlled torso",
                detail="The torso stays tall.",
                observation_ids=["obs_001"],
            )
        ],
        priorities=[
            ReportPriority(
                title="Lunge depth",
                detail="Bend the lead knee more.",
                fault_ids=["f_001"],
            )
        ],
        coaching_cues=[
            ReportCue(cue="Reach and sink.", when="Into the lunge.", fault_ids=["f_001"])
        ],
        exercise_plan=[
            ReportExercisePlanItem(
                exercise_id=exercise_id,
                focus="Lunge depth and knee tracking",
                related_fault_ids=["f_001"],
            )
        ],
        limitations=["2D pose estimates."],
    )


def test_shallow_lunge_rule_triggers(sample_pose):
    episode = make_episode([make_metric("lead_knee_min_angle", 150.0)])
    faults, _ = evaluate_faults(episodes=[episode], pose=sample_pose, view=CameraView.SIDE)
    assert any(str(fault.code) == "LUNGE_SHALLOW" for fault in faults)


def test_shallow_lunge_rule_does_not_trigger_at_deep_value(sample_pose):
    episode = make_episode([make_metric("lead_knee_min_angle", 140.0)])
    faults, _ = evaluate_faults(episodes=[episode], pose=sample_pose, view=CameraView.SIDE)
    assert not any(str(fault.code) == "LUNGE_SHALLOW" for fault in faults)


def test_view_specific_rule_is_gated(sample_pose):
    episode = make_episode([make_metric("knee_ankle_alignment_ratio", 0.5)])
    side_faults, _ = evaluate_faults(episodes=[episode], pose=sample_pose, view=CameraView.SIDE)
    front_faults, _ = evaluate_faults(episodes=[episode], pose=sample_pose, view=CameraView.FRONT)
    assert not any(str(fault.code) == "LUNGE_KNEE_TRACKS_INWARD" for fault in side_faults)
    assert any(str(fault.code) == "LUNGE_KNEE_TRACKS_INWARD" for fault in front_faults)


def test_catalog_covers_every_fault_and_has_valid_targets():
    catalog = load_catalog()
    covered = {str(target) for exercise in catalog for target in exercise.targets}
    assert {str(code) for code in FaultCode} <= covered
    assert len({exercise.id for exercise in catalog}) == len(catalog)


def lunge_candidate():
    return next(
        exercise
        for exercise in load_catalog()
        if "LUNGE_SHALLOW" in {str(target) for target in exercise.targets}
    )


def test_report_validation_accepts_grounded_draft():
    candidate = lunge_candidate()
    draft = make_draft(candidate.id)
    errors = validate_draft(
        draft,
        payload={"values": [150.0, 145.0]},
        faults=[make_fault()],
        observations=[make_observation()],
        candidates=[candidate],
    )
    assert errors == []


def test_report_validation_allows_safety_disclaimer_language():
    candidate = lunge_candidate()
    draft = make_draft(
        candidate.id,
        summary="Your lunge reaches 150 degrees. This is not medical advice or an injury assessment.",
    )
    errors = validate_draft(
        draft,
        payload={"values": [150.0, 145.0]},
        faults=[make_fault()],
        observations=[make_observation()],
        candidates=[candidate],
    )
    assert errors == []


def test_report_validation_rejects_unknown_exercise_and_banned_terms():
    candidate = lunge_candidate()
    draft = make_draft("not_a_real_exercise", summary="This prevents injury and reaches 172 degrees.")
    errors = validate_draft(
        draft,
        payload={"values": [150.0, 145.0]},
        faults=[make_fault()],
        observations=[make_observation()],
        candidates=[candidate],
    )
    assert any("outside the candidate" in error for error in errors)
    assert any("injury claims" in error for error in errors)
    assert any("not present" in error for error in errors)
    assert not any("medical diagnosis" in error for error in errors)


def test_report_validation_rejects_exercise_for_unrelated_fault():
    ready_candidate = next(
        exercise
        for exercise in load_catalog()
        if "READY_KNEES_TOO_STRAIGHT" in {str(target) for target in exercise.targets}
    )
    draft = make_draft(ready_candidate.id)
    errors = validate_draft(
        draft,
        payload={"values": [150.0, 145.0]},
        faults=[make_fault()],
        observations=[make_observation()],
        candidates=[ready_candidate],
    )
    assert any("does not target" in error for error in errors)
