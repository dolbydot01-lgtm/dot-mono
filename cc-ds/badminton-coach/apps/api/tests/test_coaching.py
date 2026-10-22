from __future__ import annotations

from types import SimpleNamespace

import app.coaching.llm as llm
from app.config import Settings
from app.contracts.analysis_result import ReportDraft


def test_generate_draft_uses_the_sdk_structured_output_helper(monkeypatch):
    captured: dict = {}
    draft = ReportDraft(
        summary="A grounded summary.",
        strengths=[],
        priorities=[],
        coaching_cues=[],
        exercise_plan=[],
        limitations=["2D pose estimates."],
    )

    class FakeMessages:
        def parse(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                parsed_output=draft,
                model="claude-opus-5-5",
                stop_reason="end_turn",
            )

    class FakeClient:
        messages = FakeMessages()
        beta = SimpleNamespace(messages=FakeMessages())

    def fake_anthropic(**kwargs):
        captured["client_kwargs"] = kwargs
        return FakeClient()

    monkeypatch.setattr(llm, "Anthropic", fake_anthropic)
    settings = Settings().model_copy(
        update={"report_provider": "anthropic", "anthropic_api_key": "test-key"}
    )

    result, model = llm.generate_draft(settings, {"task": "test"})

    assert result.summary == "A grounded summary."
    assert model == "claude-opus-5-5"
    assert captured["output_format"] is ReportDraft
    assert captured["output_config"] == {"effort": "medium"}
    assert captured["model"] == "claude-opus-5-5"
    assert captured["thinking"] == {"type": "adaptive"}
    assert captured["betas"] == ["server-side-fallback-2026-07-01"]
    assert captured["fallbacks"] == "default"
