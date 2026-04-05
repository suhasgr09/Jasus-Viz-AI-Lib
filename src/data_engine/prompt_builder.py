"""Builds structured prompts for Claude using config templates."""
from typing import Any


class PromptBuilder:
    """Fills YAML-configured prompt templates with runtime values."""

    def __init__(self, prompts_config: dict[str, str]):
        self.templates = prompts_config

    def build_schema_analysis(self, schema: dict[str, Any], relationships: list[dict]) -> str:
        template = self.templates.get("schema_analysis", "Analyze schema: {schema}")
        return template.format(
            schema=_compact_json(schema),
            relationships=_compact_json(relationships),
        )

    def build_data_insight(self, summary: dict[str, Any]) -> str:
        template = self.templates.get("data_insight", "Summarize: {summary}")
        return template.format(summary=_compact_json(summary))

    def build_viz_recommendation(self, pattern: dict[str, Any]) -> str:
        template = self.templates.get("viz_recommendation", "Recommend chart for: {pattern}")
        return template.format(pattern=_compact_json(pattern))


def _compact_json(obj: Any) -> str:
    import json
    return json.dumps(obj, separators=(",", ":"), default=str)
