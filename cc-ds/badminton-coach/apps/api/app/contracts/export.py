from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.contracts.analysis_result import AnalysisResult, ReportDraft

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_CONTRACTS_DIR = REPO_ROOT / "contracts"


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the analysis result contracts as JSON Schema.")
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_CONTRACTS_DIR,
        help="Directory for the generated schema files.",
    )
    args = parser.parse_args()
    output_dir: Path = args.out
    output_dir.mkdir(parents=True, exist_ok=True)

    schemas = {
        "analysis-result.schema.json": AnalysisResult.model_json_schema(),
        "report-draft.schema.json": ReportDraft.model_json_schema(),
    }
    for filename, schema in schemas.items():
        path = output_dir / filename
        path.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
