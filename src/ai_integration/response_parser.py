"""Parses and validates Claude's text responses."""
import json
import re
from typing import Any


class ResponseParser:
    """Safe parsing of Claude's JSON and text responses."""

    def parse_json(self, raw: str) -> dict[str, Any]:
        """
        Extract a JSON object from Claude's response.
        Handles cases where the model wraps JSON in markdown code fences.
        """
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip())

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to extract the first JSON object/array in the string
            match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
            return {"raw_response": raw, "parse_error": "Could not extract JSON"}

    def extract_recommendations(self, response: dict[str, Any]) -> list[dict[str, Any]]:
        """Return the 'recommendations' list from a parsed response."""
        return response.get("recommendations", [])

    def extract_insights(self, response: dict[str, Any]) -> list[str]:
        """Return the 'insights' list from a parsed response."""
        return response.get("insights", [])

    def extract_chart_type(self, response: dict[str, Any]) -> str | None:
        """Return the primary recommended chart type."""
        recs = self.extract_recommendations(response)
        if recs:
            # Sort by priority (lower = higher priority)
            recs_sorted = sorted(recs, key=lambda r: r.get("priority", 99))
            return recs_sorted[0].get("chart_type")
        return response.get("recommended_chart")
