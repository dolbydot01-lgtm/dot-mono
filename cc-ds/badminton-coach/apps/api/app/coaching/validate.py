from __future__ import annotations

import re
from typing import Any

from app.coaching.catalog import Exercise
from app.contracts.analysis_result import Fault, Observation, ReportDraft

BANNED_PATTERNS = {
    "medical diagnosis": r"\b(diagnos\w*|tendin\w*|imping\w*|torn|surgery|surgical)\b",
    "injury claims": r"\b(prevent\w*\s+injur\w*|avoid\w*\s+injur\w*|injur\w*\s+risk|risk\s+of\s+injur\w*)\b",
    "stroke classification": r"\b(smash\w*|net shot|drop shot|serve|serving|forehand clear|backhand clear)\b",
    "tactics": r"\btactic\w*\b",
    "guaranteed outcomes": r"\b(guarantee\w*|cure\w*|assure\w*)\b",
}
UNIT_NUMBER = re.compile(
    r"(-?\d+(?:\.\d+)?)\s*"
    r"(?:°|deg(?:ree)?s?|%|percent|cm|mm|inches?|feet|ft|kg|lbs?|seconds?|secs?|minutes?|mins?|reps?|sets?)\b",
    re.IGNORECASE,
)


def _all_strings(draft: ReportDraft) -> list[str]:
    values: list[str] = [draft.summary]
    for strength in draft.strengths:
        values.extend([strength.title, strength.detail])
    for priority in draft.priorities:
        values.extend([priority.title, priority.detail])
    for cue in draft.coaching_cues:
        values.extend([cue.cue, cue.when])
    for item in draft.exercise_plan:
        values.append(item.focus)
    values.extend(draft.limitations)
    return values


def _all_numbers(payload: Any) -> set[float]:
    numbers: set[float] = set()
    if isinstance(payload, bool):
        return numbers
    if isinstance(payload, (int, float)):
        numbers.add(float(payload))
    elif isinstance(payload, dict):
        for value in payload.values():
            numbers.update(_all_numbers(value))
    elif isinstance(payload, (list, tuple)):
        for value in payload:
            numbers.update(_all_numbers(value))
    return numbers


def _word_count(value: str) -> int:
    return len(re.findall(r"\b\w+\b", value))


def validate_draft(
    draft: ReportDraft,
    *,
    payload: dict,
    faults: list[Fault],
    observations: list[Observation],
    candidates: list[Exercise],
) -> list[str]:
    errors: list[str] = []
    fault_by_id = {fault.id: fault for fault in faults}
    fault_ids = set(fault_by_id)
    observation_ids = {observation.id for observation in observations}
    candidate_by_id = {exercise.id: exercise for exercise in candidates}

    if not draft.summary.strip():
        errors.append("summary must not be empty.")
    if _word_count(draft.summary) > 120:
        errors.append("summary must be 120 words or fewer.")
    if len(draft.strengths) > 3:
        errors.append("strengths must contain at most 3 items.")
    if len(draft.priorities) > 3:
        errors.append("priorities must contain at most 3 items.")
    if len(draft.coaching_cues) > 4:
        errors.append("coaching_cues must contain at most 4 items.")
    if len(draft.exercise_plan) > 3:
        errors.append("exercise_plan must contain at most 3 items.")
    if len(draft.limitations) > 3:
        errors.append("limitations must contain at most 3 items.")

    for index, strength in enumerate(draft.strengths):
        if not strength.observation_ids or any(item not in observation_ids for item in strength.observation_ids):
            errors.append(f"strengths[{index}] must reference existing observation IDs.")
    for index, priority in enumerate(draft.priorities):
        if not priority.fault_ids or any(item not in fault_ids for item in priority.fault_ids):
            errors.append(f"priorities[{index}] must reference existing fault IDs.")
    for index, cue in enumerate(draft.coaching_cues):
        if not cue.fault_ids or any(item not in fault_ids for item in cue.fault_ids):
            errors.append(f"coaching_cues[{index}] must reference existing fault IDs.")
    for index, item in enumerate(draft.exercise_plan):
        exercise = candidate_by_id.get(item.exercise_id)
        if exercise is None:
            errors.append(f"exercise_plan[{index}] uses an exercise outside the candidate list.")
        if not item.related_fault_ids or any(fault_id not in fault_ids for fault_id in item.related_fault_ids):
            errors.append(f"exercise_plan[{index}] must reference existing fault IDs.")
        elif exercise is not None:
            related_codes = {
                str(fault_by_id[fault_id].code)
                for fault_id in item.related_fault_ids
                if fault_id in fault_by_id
            }
            if related_codes.isdisjoint({str(target) for target in exercise.targets}):
                errors.append(
                    f"exercise_plan[{index}] ({item.exercise_id}) does not target any of its related faults."
                )
        if _word_count(item.focus) > 35:
            errors.append(f"exercise_plan[{index}].focus is too long.")

    if not observations and draft.strengths:
        errors.append("strengths must be empty because no positive observations were supplied.")
    if not faults and (draft.priorities or draft.coaching_cues or draft.exercise_plan):
        errors.append("priorities, coaching_cues, and exercise_plan must be empty when no faults were supplied.")

    combined = "\n".join(_all_strings(draft))
    for label, pattern in BANNED_PATTERNS.items():
        match = re.search(pattern, combined, re.IGNORECASE)
        if match:
            errors.append(f"Remove {label} language: '{match.group(0)}'.")

    allowed = _all_numbers(payload)
    for match in UNIT_NUMBER.finditer(combined):
        value = float(match.group(1))
        if not any(abs(value - candidate) <= 0.65 for candidate in allowed):
            errors.append(
                f"The value '{match.group(0)}' is not present in the supplied measurements. "
                "Use only supplied numbers or omit the measurement."
            )
            break

    return errors
