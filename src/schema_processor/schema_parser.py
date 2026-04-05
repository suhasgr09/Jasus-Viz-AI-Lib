"""Schema parser: reads JSON/YAML schema files and extracts field metadata."""
import json
import yaml
from pathlib import Path
from typing import Any


class SchemaParser:
    """Parses data schemas from JSON or YAML files."""

    SUPPORTED_DTYPES = {"string", "integer", "float", "boolean", "date", "datetime", "array", "object"}

    def parse(self, schema_path: str) -> dict[str, Any]:
        """Load and validate a schema file, returning a normalised dict."""
        path = Path(schema_path)
        if not path.exists():
            raise FileNotFoundError(f"Schema file not found: {schema_path}")

        with open(path) as f:
            raw = yaml.safe_load(f) if path.suffix in {".yaml", ".yml"} else json.load(f)

        return self._normalise(raw)

    def _normalise(self, raw: dict) -> dict[str, Any]:
        """Ensure the schema has a consistent structure."""
        schema = {
            "name": raw.get("name", "unknown"),
            "description": raw.get("description", ""),
            "fields": {},
            "primary_key": raw.get("primary_key"),
            "indexes": raw.get("indexes", []),
        }
        for field, meta in raw.get("fields", {}).items():
            if isinstance(meta, str):
                meta = {"type": meta}
            schema["fields"][field] = {
                "type": meta.get("type", "string"),
                "nullable": meta.get("nullable", True),
                "description": meta.get("description", ""),
                "constraints": meta.get("constraints", {}),
            }
        return schema

    def map_relationships(self, relationship_str: str) -> list[dict[str, str]]:
        """
        Parse a relationship string like:
        'orders->customers:customer_id, orders->products:product_id'
        into a list of relationship dicts.
        """
        relationships = []
        for part in relationship_str.split(","):
            part = part.strip()
            if not part:
                continue
            if "->" not in part or ":" not in part:
                continue
            tables, key = part.rsplit(":", 1)
            from_table, to_table = tables.split("->")
            relationships.append({
                "from_table": from_table.strip(),
                "to_table": to_table.strip(),
                "join_key": key.strip(),
            })
        return relationships

    def infer_from_dataframe(self, df) -> dict[str, Any]:
        """Infer a schema dict directly from a pandas DataFrame."""
        import pandas as pd

        dtype_map = {
            "int64": "integer", "int32": "integer",
            "float64": "float", "float32": "float",
            "bool": "boolean",
            "datetime64[ns]": "datetime",
            "object": "string",
        }
        fields = {}
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            fields[col] = {
                "type": dtype_map.get(dtype_str, "string"),
                "nullable": bool(df[col].isna().any()),
                "description": "",
                "constraints": {},
            }
        return {"name": "inferred", "description": "", "fields": fields, "primary_key": None, "indexes": []}
