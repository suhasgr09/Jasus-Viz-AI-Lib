"""Claude Sonnet client with retry, rate-limit handling, and structured output."""
import os
import time
from typing import Any

import anthropic


_SYSTEM_PROMPT = (
    "You are a data analytics expert. "
    "When asked for JSON output, respond ONLY with valid JSON and nothing else. "
    "Do not include markdown code fences or explanatory text outside the JSON."
)


class ClaudeClient:
    """Thin wrapper around the Anthropic SDK for structured data-viz interactions."""

    def __init__(self, config: dict[str, Any]):
        self.model = config["claude"]["model"]
        self.max_tokens = config["claude"].get("max_tokens", 4096)
        self.temperature = config["claude"].get("temperature", 0.3)
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY environment variable is not set. "
                "Copy .env.example to .env and add your key."
            )
        self.client = anthropic.Anthropic(api_key=api_key)

    def send(self, prompt: str, retries: int = 3) -> str:
        """Send a prompt and return the response text. Retries on rate-limit errors."""
        for attempt in range(retries):
            try:
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature,
                    system=_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": prompt}],
                )
                return message.content[0].text
            except anthropic.RateLimitError:
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise
            except anthropic.APIStatusError as exc:
                raise RuntimeError(f"Claude API error: {exc.status_code} – {exc.message}") from exc

        return ""  # unreachable, satisfies type checkers

    def analyze(self, prompt_json: dict[str, Any]) -> dict[str, Any]:
        """
        High-level method: sends a structured data summary and returns
        Claude's parsed JSON response with visualization recommendations.
        """
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
        """Ask Claude to recommend chart types based on schema and relationships."""
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


def _compact_json(obj: Any) -> str:
    import json
    return json.dumps(obj, separators=(",", ":"), default=str)
