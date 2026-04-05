"""Schema and data validation utilities."""
import jsonschema
from typing import Any


_META_SCHEMA = {
    "type": "object",
    "required": ["name", "fields"],
    "properties": {
        "name": {"type": "string"},
        "description": {"type": "string"},
        "primary_key": {"type": ["string", "null"]},
        "fields": {
            "type": "object",
            "additionalProperties": {
                "type": "object",
                "required": ["type"],
                "properties": {
                    "type": {"type": "string"},
                    "nullable": {"type": "boolean"},
                    "description": {"type": "string"},
                },
            },
        },
    },
}


class SchemaValidator:
    """Validates parsed schema dicts against the meta-schema."""

    def validate_schema(self, schema: dict[str, Any]) -> list[str]:
        """Return a list of validation error messages (empty means valid)."""
        errors: list[str] = []
        try:
            jsonschema.validate(instance=schema, schema=_META_SCHEMA)
        except jsonschema.ValidationError as exc:
            errors.append(str(exc.message))
        return errors

    def validate_dataframe_against_schema(self, df, schema: dict[str, Any]) -> list[str]:
        """Check that DataFrame columns match schema fields."""
        errors: list[str] = []
        schema_fields = set(schema.get("fields", {}).keys())
        df_columns = set(df.columns)

        missing = schema_fields - df_columns
        if missing:
            errors.append(f"Columns in schema but missing from data: {sorted(missing)}")

        for field, meta in schema.get("fields", {}).items():
            if field not in df.columns:
                continue
            if not meta.get("nullable", True) and df[field].isna().any():
                errors.append(f"Field '{field}' has null values but is marked non-nullable.")

        return errors
