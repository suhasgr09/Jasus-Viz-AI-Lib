"""Pandas-based data loading and processing."""
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


class PandasProcessor:
    """Load, clean, and profile DataFrames for downstream visualisation."""

    def load_and_process(self, data_path: str, schema: dict[str, Any]) -> pd.DataFrame:
        """Load CSV/JSON/Parquet file and apply schema-based type casting."""
        path = Path(data_path)
        ext = path.suffix.lower()

        loaders = {
            ".csv": pd.read_csv,
            ".json": pd.read_json,
            ".parquet": pd.read_parquet,
        }
        if ext not in loaders:
            raise ValueError(f"Unsupported file format: {ext}")

        df = loaders[ext](path)
        df = self._cast_types(df, schema)
        df = self._clean(df)
        return df

    def _cast_types(self, df: pd.DataFrame, schema: dict[str, Any]) -> pd.DataFrame:
        type_map = {
            "integer": "Int64",
            "float": "float64",
            "boolean": "boolean",
            "date": "datetime64[ns]",
            "datetime": "datetime64[ns]",
            "string": "string",
        }
        for field, meta in schema.get("fields", {}).items():
            if field not in df.columns:
                continue
            target = type_map.get(meta.get("type", "string"), "string")
            try:
                if target == "datetime64[ns]":
                    df[field] = pd.to_datetime(df[field], errors="coerce")
                else:
                    df[field] = df[field].astype(target)
            except (ValueError, TypeError):
                pass
        return df

    def _clean(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove fully duplicate rows."""
        return df.drop_duplicates()

    def profile(self, df: pd.DataFrame) -> dict[str, Any]:
        """Generate a statistical profile of the DataFrame."""
        profile: dict[str, Any] = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": {},
        }
        for col in df.columns:
            col_info: dict[str, Any] = {
                "dtype": str(df[col].dtype),
                "null_count": int(df[col].isna().sum()),
                "unique_count": int(df[col].nunique()),
            }
            if pd.api.types.is_numeric_dtype(df[col]):
                desc = df[col].describe()
                col_info.update({
                    "min": _safe_scalar(desc.get("min")),
                    "max": _safe_scalar(desc.get("max")),
                    "mean": _safe_scalar(desc.get("mean")),
                    "std": _safe_scalar(desc.get("std")),
                    "median": _safe_scalar(df[col].median()),
                })
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                col_info["min"] = str(df[col].min())
                col_info["max"] = str(df[col].max())
            else:
                col_info["top_values"] = df[col].value_counts().head(5).to_dict()

            profile["columns"][col] = col_info
        return profile

    def aggregate(self, df: pd.DataFrame, group_by: list[str], agg_col: str, func: str = "sum") -> pd.DataFrame:
        """Group and aggregate a DataFrame."""
        return df.groupby(group_by)[agg_col].agg(func).reset_index()


def _safe_scalar(val) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if np.isnan(f) or np.isinf(f) else round(f, 4)
    except (TypeError, ValueError):
        return None
