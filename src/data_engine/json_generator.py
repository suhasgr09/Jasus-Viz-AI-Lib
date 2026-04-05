"""Generates JSON payloads for visualisation and AI prompt consumption."""
import json
from pathlib import Path
from typing import Any

import pandas as pd


class JSONGenerator:
    """Converts processed DataFrames into JSON suitable for D3/React and Claude."""

    def for_visualization(self, df: pd.DataFrame, rel_map: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Produce a JSON structure consumed directly by the React/D3 frontend.
        Includes raw records, numeric summaries, and relationship graph data.
        """
        records = json.loads(df.head(500).to_json(orient="records", date_format="iso"))

        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        summaries: dict[str, Any] = {}
        for col in numeric_cols:
            summaries[col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": round(float(df[col].mean()), 4),
            }

        return {
            "meta": {
                "row_count": len(df),
                "columns": list(df.columns),
            },
            "records": records,
            "numeric_summaries": summaries,
            "relationships": rel_map or {},
        }

    def for_ai_prompts(self, df: pd.DataFrame, rel_map: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Produce a compact JSON summary for Claude prompt context.
        Avoids sending raw row data to keep token usage low.
        """
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "string", "category"]).columns.tolist()
        date_cols = df.select_dtypes(include=["datetime64[ns]"]).columns.tolist()

        field_samples: dict[str, list] = {}
        for col in df.columns:
            samples = df[col].dropna().unique()[:5].tolist()
            field_samples[col] = [str(s) for s in samples]

        return {
            "dataset_shape": {"rows": len(df), "columns": len(df.columns)},
            "column_groups": {
                "numeric": numeric_cols,
                "categorical": cat_cols,
                "datetime": date_cols,
            },
            "field_samples": field_samples,
            "relationships": rel_map or {},
        }

    def save(self, payload: dict[str, Any], output_path: str) -> None:
        """Persist a JSON payload to disk."""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(payload, f, indent=2, default=str)
