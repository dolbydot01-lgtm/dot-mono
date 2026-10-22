from __future__ import annotations

from datetime import UTC, datetime

from app.coaching.catalog import candidate_exercises
from app.coaching.input import enrich_exercises, select_report_faults
from app.contracts.analysis_result import (
    AnalysisResult,
    CoachingReport,
    ReportCue,
    ReportExercisePlanItem,
    ReportPriority,
    ReportProvider,
    ReportStatus,
    ReportStrength,
)

DISCLAIMER = (
    "This is a computer-vision coaching aid based on 2D pose estimates. It is not medical advice, "
    "not an injury assessment, and it cannot guarantee improvement. Stop if you feel pain and consult "
    "a qualified professional when needed."
)


def standard_limitations(result: AnalysisResult) -> list[str]:
    limitations = list(result.capture_quality.limitations[:2])
    limitations.append(
        "2D video cannot measure joint forces or depth and can be affected by camera angle, occlusion, "
        "clothing, and lighting."
    )
    limitations.append(
        "The app recognizes movement episodes and form indicators; it does not identify badminton shots."
    )
    return limitations[:4]


def skipped_report(result: AnalysisResult) -> CoachingReport:
    return CoachingReport(
        status=ReportStatus.SKIPPED,
        provider=None,
        model=None,
        generated_at=None,
        summary=None,
        strengths=[],
        priorities=[],
        coaching_cues=[],
        exercise_plan=[],
        limitations=standard_limitations(result),
        disclaimer=DISCLAIMER,
        error=None,
    )


def template_report(
    result: AnalysisResult,
    *,
    reason: str | None = None,
) -> CoachingReport:
    del reason
    observations = result.observations[:3]
    all_faults = select_report_faults(result.faults)
    faults = all_faults[:3]
    candidates = candidate_exercises(result.faults)

    if faults:
        top = faults[0]
        summary = (
            f"The analysis found {len(all_faults)} form focus area"
            f"{'' if len(all_faults) == 1 else 's'}, led by: {top.title.lower()}. "
            f"Start with the cue below, then use the exercise plan to build the position. "
            f"Capture quality was {str(result.capture_quality.overall)}."
        )
    elif result.episodes:
        summary = (
            "The analysis did not find a clear form fault in the recognized movement episodes. "
            "Keep the movements controlled, record a clip from the other camera angle when possible, "
            "and compare how your balance and reach change."
        )
    else:
        summary = (
            "The athlete was tracked, but no recognizable overhead, lunge, or ready-stance episode was found. "
            "Record a clip with one clear repetition, the full body in frame, and a stable camera."
        )

    strengths = [
        ReportStrength(
            title=observation.title,
            detail=observation.detail,
            observation_ids=[observation.id],
        )
        for observation in observations
    ]
    priorities = [
        ReportPriority(
            title=fault.title,
            detail=fault.description,
            fault_ids=[fault.id],
        )
        for fault in faults
    ]
    cues = [
        ReportCue(
            cue=fault.cue,
            when=f"During the {fault.category.replace('_', ' ')} portion of the movement.",
            fault_ids=[fault.id],
        )
        for fault in faults
    ]
    exercise_selections: list[ReportExercisePlanItem] = []
    used: set[str] = set()
    for fault in faults:
        for exercise in candidates:
            if exercise.id in used:
                continue
            if str(fault.code) in [str(target) for target in exercise.targets]:
                exercise_selections.append(
                    ReportExercisePlanItem(
                        exercise_id=exercise.id,
                        focus=exercise.focus,
                        related_fault_ids=[fault.id],
                    )
                )
                used.add(exercise.id)
                break
    # Fill unused slots with exercises that target any detected fault.
    if exercise_selections and len(exercise_selections) < 3:
        for exercise in candidates:
            if exercise.id in used:
                continue
            related = [
                fault.id
                for fault in all_faults
                if str(fault.code) in [str(target) for target in exercise.targets]
            ]
            if related:
                exercise_selections.append(
                    ReportExercisePlanItem(
                        exercise_id=exercise.id,
                        focus=exercise.focus,
                        related_fault_ids=related[:2],
                    )
                )
                used.add(exercise.id)
                if len(exercise_selections) >= 3:
                    break

    prescribe = enrich_exercises(exercise_selections, candidates, result.faults, fallback=True)
    return CoachingReport(
        status=ReportStatus.TEMPLATE,
        provider=ReportProvider.TEMPLATE,
        model=None,
        generated_at=datetime.now(UTC).isoformat(),
        summary=summary,
        strengths=strengths,
        priorities=priorities,
        coaching_cues=cues,
        exercise_plan=prescribe,
        limitations=standard_limitations(result),
        disclaimer=DISCLAIMER,
        error=None,
    )
