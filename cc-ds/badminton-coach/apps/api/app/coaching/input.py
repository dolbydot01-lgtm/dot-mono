from __future__ import annotations

import json

from app.coaching.catalog import Exercise, candidate_exercises
from app.contracts.analysis_result import AnalysisResult, ExercisePrescription


def _json_value(value):
    return json.loads(json.dumps(value, default=str))


def select_report_faults(faults: list) -> list:
    """One finding per fault code; repeated episodes are reported once."""
    selected = []
    seen: set[str] = set()
    for fault in faults:
        code = str(fault.code)
        if code in seen:
            continue
        seen.add(code)
        selected.append(fault)
        if len(selected) >= 6:
            break
    return selected


def build_report_input(result: AnalysisResult) -> tuple[dict, list[Exercise]]:
    candidates = candidate_exercises(result.faults)
    faults = select_report_faults(result.faults)
    episodes = sorted(result.episodes, key=lambda item: item.start_s)[:8]
    warnings = [
        {
            "check": check.label,
            "status": str(check.status),
            "message": check.message,
        }
        for check in result.capture_quality.checks
        if str(check.status) in {"warn", "fail"}
    ]

    payload = {
        "task": "Write a concise badminton technique coaching review from measured 2D pose observations.",
        "athlete_context": {
            "camera_view": str(result.source.view),
            "dominant_hand": str(result.source.dominant_hand),
            "mirrored_video": result.source.mirrored,
        },
        "capture_quality": {
            "overall": str(result.capture_quality.overall),
            "score": result.capture_quality.score,
            "limitations": result.capture_quality.limitations,
            "warnings": warnings,
        },
        "observations": [
            {
                "id": observation.id,
                "kind": str(observation.kind),
                "title": observation.title,
                "detail": observation.detail,
                "episode_id": observation.episode_id,
            }
            for observation in result.observations
        ],
        "faults": [
            {
                "id": fault.id,
                "code": str(fault.code),
                "title": fault.title,
                "category": fault.category,
                "severity": str(fault.severity),
                "confidence": fault.confidence,
                "reliability": str(fault.reliability),
                "time_range": {
                    "start_s": fault.time_range.start_s,
                    "end_s": fault.time_range.end_s,
                },
                "observed_value": fault.evidence.observed_value,
                "threshold_value": fault.evidence.threshold_value,
                "unit": str(fault.evidence.unit),
                "description": fault.description,
                "cue": fault.cue,
            }
            for fault in faults
        ],
        "episodes": [
            {
                "id": episode.id,
                "type": str(episode.type),
                "label": episode.label,
                "start_s": episode.start_s,
                "end_s": episode.end_s,
                "confidence": episode.confidence,
                "metrics": [
                    {
                        "key": metric.key,
                        "label": metric.label,
                        "value": metric.value,
                        "unit": str(metric.unit),
                        "reliability": str(metric.reliability),
                    }
                    for metric in episode.metrics
                    if metric.valid
                ],
            }
            for episode in episodes
        ],
        "candidate_exercises": [
            {
                "id": exercise.id,
                "name": exercise.name,
                "focus": exercise.focus,
                "equipment": exercise.equipment,
                "difficulty": exercise.difficulty,
                "targets": [str(target) for target in exercise.targets],
            }
            for exercise in candidates
        ],
    }
    return _json_value(payload), candidates


def enrich_exercises(
    selections: list,
    candidates: list[Exercise],
    faults: list,
    *,
    fallback: bool = False,
) -> list[ExercisePrescription]:
    by_id = {exercise.id: exercise for exercise in candidates}
    allowed_faults = {fault.id for fault in faults}
    prescriptions: list[ExercisePrescription] = []
    used: set[str] = set()
    for selection in selections:
        exercise = by_id.get(selection.exercise_id)
        if exercise is None or exercise.id in used:
            continue
        related = [fault_id for fault_id in selection.related_fault_ids if fault_id in allowed_faults]
        if not related and not fallback:
            continue
        related = related or [faults[0].id] if faults else related
        prescriptions.append(
            ExercisePrescription(
                exercise_id=exercise.id,
                name=exercise.name,
                focus=selection.focus or exercise.focus,
                dosage=exercise.dosage,
                equipment=exercise.equipment,
                instructions=list(exercise.instructions),
                safety_note=exercise.safety_note,
                related_fault_ids=related,
            )
        )
        used.add(exercise.id)
        if len(prescriptions) >= 3:
            break
    return prescriptions
