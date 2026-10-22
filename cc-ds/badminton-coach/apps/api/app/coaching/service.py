from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.coaching.fallback import DISCLAIMER, skipped_report, standard_limitations, template_report
from app.coaching.input import build_report_input, enrich_exercises, select_report_faults
from app.coaching.llm import ReportGenerationError, generate_draft
from app.coaching.validate import validate_draft
from app.config import Settings
from app.contracts.analysis_result import (
    AnalysisResult,
    CoachingReport,
    ReportProvider,
    ReportStatus,
)


@dataclass
class ReportOutcome:
    report: CoachingReport
    error_message: str | None = None


def _generated_report(
    result: AnalysisResult,
    draft,
    *,
    model: str,
    candidates,
) -> CoachingReport:
    exercise_plan = enrich_exercises(draft.exercise_plan, candidates, result.faults)
    limitations: list[str] = []
    for item in [*draft.limitations, *standard_limitations(result)]:
        if item and item not in limitations:
            limitations.append(item)
    return CoachingReport(
        status=ReportStatus.GENERATED,
        provider=ReportProvider.ANTHROPIC,
        model=model,
        generated_at=datetime.now(UTC).isoformat(),
        summary=draft.summary,
        strengths=draft.strengths,
        priorities=draft.priorities,
        coaching_cues=draft.coaching_cues,
        exercise_plan=exercise_plan,
        limitations=limitations[:4],
        disclaimer=DISCLAIMER,
        error=None,
    )


def generate_report(result: AnalysisResult, settings: Settings) -> ReportOutcome:
    if not result.capture_quality.analyzable:
        return ReportOutcome(report=skipped_report(result), error_message=None)

    if settings.report_provider.lower() == "template":
        return ReportOutcome(report=template_report(result), error_message=None)

    payload, candidates = build_report_input(result)
    report_faults = select_report_faults(result.faults)
    last_error = "The report model did not return a valid response."
    feedback: list[str] | None = None

    for _attempt in range(2):
        try:
            draft, model = generate_draft(settings, payload, validation_feedback=feedback)
            errors = validate_draft(
                draft,
                payload=payload,
                faults=report_faults,
                observations=result.observations,
                candidates=candidates,
            )
            if not errors:
                return ReportOutcome(
                    report=_generated_report(result, draft, model=model, candidates=candidates),
                    error_message=None,
                )
            last_error = " ".join(errors[:4])
            feedback = errors
        except ReportGenerationError as exc:
            last_error = exc.message
            break
        except Exception as exc:  # Keep the product usable even if the provider misbehaves.
            last_error = f"Report generation failed: {exc.__class__.__name__}."
            break

    return ReportOutcome(report=template_report(result, reason=last_error), error_message=last_error)
