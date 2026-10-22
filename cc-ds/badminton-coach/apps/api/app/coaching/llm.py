from __future__ import annotations

import json

import anthropic
from anthropic import Anthropic

from app.coaching.prompt import SYSTEM_PROMPT
from app.config import Settings
from app.contracts.analysis_result import ReportDraft


class ReportGenerationError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def generate_draft(
    settings: Settings,
    payload: dict,
    *,
    validation_feedback: list[str] | None = None,
) -> tuple[ReportDraft, str]:
    if settings.report_provider.lower() == "template":
        raise ReportGenerationError("TEMPLATE_MODE", "Template report provider is configured.")

    try:
        client = Anthropic(api_key=settings.anthropic_api_key or None, timeout=90.0)
        user_content = json.dumps(payload, ensure_ascii=False)
        if validation_feedback:
            user_content += (
                "\n\nYour previous response failed validation for these reasons:\n- "
                + "\n- ".join(validation_feedback)
                + "\nReturn a corrected response using only the supplied IDs and values."
            )
        response = client.beta.messages.parse(
            model=settings.anthropic_model,
            max_tokens=settings.anthropic_max_tokens,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
            output_format=ReportDraft,
            output_config={"effort": settings.anthropic_effort},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError as exc:
        raise ReportGenerationError(
            "AUTHENTICATION_FAILED",
            "Claude credentials are not configured; using the local coaching template.",
        ) from exc
    except anthropic.RateLimitError as exc:
        raise ReportGenerationError("RATE_LIMITED", "The report model is rate limited.") from exc
    except anthropic.APIConnectionError as exc:
        raise ReportGenerationError("CONNECTION_FAILED", "The report model could not be reached.") from exc
    except anthropic.APIStatusError as exc:
        raise ReportGenerationError(
            "API_ERROR", f"The report model returned an error ({exc.status_code})."
        ) from exc
    except Exception as exc:
        raise ReportGenerationError("REPORT_FAILED", "The report model call failed.") from exc

    if response.stop_reason == "refusal":
        raise ReportGenerationError("REFUSED", "The report model declined to generate this review.")
    if response.stop_reason == "max_tokens":
        raise ReportGenerationError("TRUNCATED", "The report response was truncated.")

    draft = response.parsed_output
    if draft is None:
        raise ReportGenerationError("INVALID_JSON", "The report response did not match the schema.")
    return draft, str(response.model)
