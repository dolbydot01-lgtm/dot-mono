from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from app.contracts.analysis_result import Fault, FaultCode

CATALOG_PATH = Path(__file__).with_name("exercises.json")


class Exercise(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    focus: str
    dosage: str
    equipment: str
    difficulty: str
    targets: list[FaultCode]
    instructions: list[str] = Field(min_length=1)
    safety_note: str


@lru_cache
def load_catalog() -> tuple[Exercise, ...]:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    return tuple(Exercise.model_validate(item) for item in payload)


def catalog_by_id() -> dict[str, Exercise]:
    return {exercise.id: exercise for exercise in load_catalog()}


def candidate_exercises(faults: list[Fault]) -> list[Exercise]:
    fault_codes = {str(fault.code) for fault in faults}
    return [
        exercise
        for exercise in load_catalog()
        if any(str(target) in fault_codes for target in exercise.targets)
    ]
