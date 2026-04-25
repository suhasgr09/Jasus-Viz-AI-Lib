"""GitHub Copilot client via the GitHub Models API (OpenAI-compatible endpoint)."""
import os
import time
from typing import Any

import openai

# GitHub Models API — same OpenAI SDK, different base_url + GitHub PAT as auth token
_GITHUB_MODELS_BASE = "https://models.inference.ai.azure.com"

_SYSTEM_PROMPT = (
    "You are a data analytics expert powered by GitHub Copilot. "
    "When asked for JSON output, respond ONLY with valid JSON and nothing else. "
    "Do not include markdown code fences or explanatory text outside the JSON."
)


class CopilotClient:
    """GitHub Copilot client using the GitHub Models API (OpenAI-compatible)."""

    def __init__(self, config: dict[str, Any]):
        cfg = config.get("copilot", {})
        self.model_name  = cfg.get("model", "gpt-4o")
        self.max_tokens  = cfg.get("max_tokens", 4096)
        self.temperature = cfg.get("temperature", 0.3)

        api_key = os.environ.get("GITHUB_TOKEN")
        if not api_key:
            raise EnvironmentError(
                "GITHUB_TOKEN environment variable is not set. "
                "Generate a GitHub Personal Access Token at "
                "https://github.com/settings/tokens and add it to your .env file."
            )
        self._client = openai.OpenAI(
            base_url=_GITHUB_MODELS_BASE,
            api_key=api_key,
        )

    def send(self, prompt: str, retries: int = 3) -> str:
        """Send a prompt to GitHub Models and return the response text."""
        for attempt in range(retries):
            try:
                response = self._client.chat.completions.create(
                    model=self.model_name,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user",   "content": prompt},
                    ],
                )
                return response.choices[0].message.content or ""
            except openai.RateLimitError:
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise RuntimeError(
                        "GitHub Models API rate limit exceeded. "
                        "The free tier has request limits — wait a moment and try again."
                    )
            except openai.AuthenticationError as exc:
                raise EnvironmentError(
                    "GITHUB_TOKEN is invalid or lacks required permissions. "
                    "Ensure the token has the 'models:read' scope. "
                    "Generate a new token at https://github.com/settings/tokens"
                ) from exc
            except openai.APIStatusError as exc:
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise RuntimeError(
                        f"GitHub Copilot API error: {exc.status_code} - {exc.message}"
                    ) from exc
        return ""

    def analyze(self, prompt_json: dict[str, Any]) -> dict[str, Any]:
        """Send a structured data summary and return parsed JSON visualization recommendations."""
        from .response_parser import ResponseParser

        prompt = (
            "Given this dataset summary, provide visualization recommendations "
            "and key insights. Return JSON with keys: "
            "'recommendations' (array of {chart_type, reason, priority}), "
            "'insights' (array of strings), "
            "'suggested_title' (string).\n\n"
            f"Dataset summary: {_compact_json(prompt_json)}"
        )
        raw = self.send(prompt)
        return ResponseParser().parse_json(raw)

    def get_schema_recommendations(self, schema: dict, relationships: list) -> dict[str, Any]:
        """Recommend chart types based on schema and relationships."""
        from .response_parser import ResponseParser

        prompt = (
            "Analyze this data schema and suggest optimal visualizations. "
            "Return JSON with key 'recommendations' (array of {chart_type, reason, priority}).\n\n"
            f"Schema: {_compact_json(schema)}\n"
            f"Relationships: {_compact_json(relationships)}"
        )
        raw = self.send(prompt)
        return ResponseParser().parse_json(raw)

    def get_viz_recommendation(self, pattern: dict[str, Any]) -> dict[str, Any]:
        """Recommend the best chart type for a given data pattern."""
        from .response_parser import ResponseParser

        prompt = (
            "Recommend the best chart type for this data pattern. "
            "Return JSON with keys: recommended_chart, alternative_chart, reasoning.\n\n"
            f"Pattern: {_compact_json(pattern)}"
        )
        raw = self.send(prompt)
        return ResponseParser().parse_json(raw)

    def analyze_multi_table(self, tables: list[dict]) -> dict[str, Any]:
        """Infer relationships between multiple table schemas and recommend cross-table visualizations.

        Args:
            tables: list of dicts with keys: name, columns, col_types, row_count, sample_values
        """
        from .response_parser import ResponseParser

        table_desc = "\n\n".join([
            f"Table '{t['name']}' ({t.get('row_count', 0)} rows)\n"
            f"  Columns: {', '.join(t.get('columns', []))}\n"
            f"  Types: {', '.join(f'{c}:{v}' for c, v in t.get('col_types', {}).items())}\n"
            f"  Sample values: {_compact_json({k: v[:5] for k, v in t.get('sample_values', {}).items() if v})}"
            for t in tables
        ])

        prompt = (
            "You are a senior data architect. Analyze these table schemas and:\n"
            "1. Identify foreign key / join relationships (shared column names, matching IDs, value overlaps)\n"
            "2. Determine a primary key for each table\n"
            "3. Recommend the best visualizations for the COMBINED dataset\n"
            "4. Provide actionable insights about the data model\n\n"
            "Return ONLY valid JSON with exactly these keys (no markdown, no extra text):\n"
            "{\n"
            '  "relationships": [\n'
            '    {"from_table": "str", "from_col": "str", "to_table": "str", "to_col": "str",\n'
            '     "type": "one-to-one|one-to-many|many-to-many", "confidence": 0.0, "label": "str"}\n'
            "  ],\n"
            '  "primary_keys": {"table_name": "column_name"},\n'
            '  "insights": ["str"],\n'
            '  "recommendations": [\n'
            '    {"chart_type": "str", "reason": "str", "priority": 1, "tables_involved": ["str"]}\n'
            "  ],\n"
            '  "suggested_title": "str"\n'
            "}\n\n"
            f"Tables:\n{table_desc}"
        )
        raw = self.send(prompt)
        return ResponseParser().parse_json(raw)


def _compact_json(obj: Any) -> str:
    import json
    return json.dumps(obj, separators=(",", ":"), default=str)
