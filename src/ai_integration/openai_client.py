"""OpenAI client — same interface as GeminiClient / ClaudeClient."""
import os
import time
from typing import Any

import openai

_SYSTEM_PROMPT = (
    "You are a data analytics expert. "
    "When asked for JSON output, respond ONLY with valid JSON and nothing else. "
    "Do not include markdown code fences or explanatory text outside the JSON."
)


class OpenAIClient:
    """Thin wrapper around the OpenAI SDK for structured data-viz interactions."""

    def __init__(self, config: dict[str, Any]):
        cfg = config.get("openai", {})
        self.model_name  = cfg.get("model", "gpt-4o")
        self.max_tokens  = cfg.get("max_tokens", 4096)
        self.temperature = cfg.get("temperature", 0.3)

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OPENAI_API_KEY environment variable is not set. "
                "Add it to your .env file."
            )
        self._client = openai.OpenAI(api_key=api_key)

    def send(self, prompt: str, retries: int = 3) -> str:
        """Send a prompt and return the response text. Retries on transient errors."""
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
                    raise
            except openai.APIStatusError as exc:
                raise RuntimeError(f"OpenAI API error: {exc.status_code} – {exc.message}") from exc
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


def _compact_json(obj: Any) -> str:
    import json
    return json.dumps(obj, separators=(",", ":"), default=str)
