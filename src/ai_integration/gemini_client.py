"""Google Gemini client — drop-in replacement for ClaudeClient."""
import os
import time
from typing import Any

from google import genai
from google.genai import types as genai_types

_SYSTEM_PROMPT = (
    "You are a data analytics expert. "
    "When asked for JSON output, respond ONLY with valid JSON and nothing else. "
    "Do not include markdown code fences or explanatory text outside the JSON."
)


class GeminiClient:
    """Thin wrapper around the Google GenAI SDK for structured data-viz interactions."""

    def __init__(self, config: dict[str, Any]):
        cfg = config.get("gemini", {})
        self.model_name  = cfg.get("model", "gemini-2.0-flash")
        self.max_tokens  = cfg.get("max_tokens", 4096)
        self.temperature = cfg.get("temperature", 0.3)

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY environment variable is not set. "
                "Add it to your .env file."
            )
        self._client = genai.Client(api_key=api_key)
        self._gen_config = genai_types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            max_output_tokens=self.max_tokens,
            temperature=self.temperature,
        )

    def send(self, prompt: str, retries: int = 3) -> str:
        """Send a prompt and return the response text. Retries on transient errors."""
        for attempt in range(retries):
            try:
                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=self._gen_config,
                )
                return response.text
            except Exception as exc:
                err_str = str(exc)
                # 429 quota exhausted — retrying won't help, surface a clear message
                if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                    raise RuntimeError(
                        "Gemini API quota exceeded. "
                        "You may be on the free tier — switch models or enable billing at "
                        "https://aistudio.google.com/app/apikeys"
                    ) from exc
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise RuntimeError(f"Gemini API error: {exc}") from exc
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


# Alias so existing code using ClaudeClient works without changes
ClaudeClient = GeminiClient
