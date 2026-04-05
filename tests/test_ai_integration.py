"""Tests for ai_integration module."""
import pytest
from unittest.mock import MagicMock, patch

from src.ai_integration.response_parser import ResponseParser


class TestResponseParser:
    def test_parse_clean_json(self):
        rp = ResponseParser()
        result = rp.parse_json('{"key": "value"}')
        assert result["key"] == "value"

    def test_parse_fenced_json(self):
        rp = ResponseParser()
        raw = '```json\n{"recommendations": []}\n```'
        result = rp.parse_json(raw)
        assert "recommendations" in result

    def test_parse_broken_json_returns_raw(self):
        rp = ResponseParser()
        result = rp.parse_json("not json at all!!!")
        assert "raw_response" in result

    def test_extract_recommendations(self):
        rp = ResponseParser()
        data = {"recommendations": [{"chart_type": "bar", "reason": "x", "priority": 1}]}
        recs = rp.extract_recommendations(data)
        assert len(recs) == 1
        assert recs[0]["chart_type"] == "bar"

    def test_extract_insights(self):
        rp = ResponseParser()
        data = {"insights": ["Revenue is up", "North leads"]}
        insights = rp.extract_insights(data)
        assert insights[0] == "Revenue is up"

    def test_extract_chart_type_from_recommendations(self):
        rp = ResponseParser()
        data = {"recommendations": [
            {"chart_type": "scatter", "priority": 2},
            {"chart_type": "bar", "priority": 1},
        ]}
        chart = rp.extract_chart_type(data)
        assert chart == "bar"


class TestClaudeClientInit:
    def test_raises_without_api_key(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        from src.ai_integration.claude_client import ClaudeClient
        config = {"claude": {"model": "claude-sonnet-4-5", "max_tokens": 100, "temperature": 0.3}}
        with pytest.raises(EnvironmentError, match="ANTHROPIC_API_KEY"):
            ClaudeClient(config)
