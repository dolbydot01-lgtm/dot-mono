from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any

from app.config import get_settings

settings = get_settings()


def analysis_dir(analysis_id: str) -> Path:
    path = settings.analyses_dir / analysis_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def remove_analysis_dir(analysis_id: str) -> None:
    shutil.rmtree(settings.analyses_dir / analysis_id, ignore_errors=True)


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(temporary, path)
