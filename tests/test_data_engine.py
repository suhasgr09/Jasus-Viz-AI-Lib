"""Tests for data_engine module."""
import csv
import json
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from src.data_engine.pandas_processor import PandasProcessor
from src.data_engine.json_generator import JSONGenerator
from src.data_engine.prompt_builder import PromptBuilder


SCHEMA = {
    "name": "sales",
    "fields": {
        "order_id": {"type": "integer", "nullable": False},
        "region": {"type": "string", "nullable": True},
        "total_amount": {"type": "float", "nullable": False},
    },
}

SAMPLE_ROWS = [
    {"order_id": 1, "region": "North", "total_amount": 100.0},
    {"order_id": 2, "region": "South", "total_amount": 200.0},
    {"order_id": 3, "region": "North", "total_amount": 150.0},
    {"order_id": 1, "region": "North", "total_amount": 100.0},  # duplicate
]


@pytest.fixture
def csv_file(tmp_path):
    p = tmp_path / "data.csv"
    with open(p, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=SAMPLE_ROWS[0].keys())
        writer.writeheader()
        writer.writerows(SAMPLE_ROWS)
    return str(p)


class TestPandasProcessor:
    def test_load_csv(self, csv_file):
        proc = PandasProcessor()
        df = proc.load_and_process(csv_file, SCHEMA)
        # Should drop the duplicate row
        assert len(df) == 3

    def test_profile(self, csv_file):
        proc = PandasProcessor()
        df = proc.load_and_process(csv_file, SCHEMA)
        profile = proc.profile(df)
        assert profile["row_count"] == 3
        assert "total_amount" in profile["columns"]
        assert "mean" in profile["columns"]["total_amount"]

    def test_aggregate(self, csv_file):
        proc = PandasProcessor()
        df = proc.load_and_process(csv_file, SCHEMA)
        agg = proc.aggregate(df, ["region"], "total_amount", "sum")
        north = agg[agg["region"] == "North"]["total_amount"].values[0]
        assert north == pytest.approx(250.0)

    def test_unsupported_format(self, tmp_path):
        p = tmp_path / "data.xlsx"
        p.write_text("dummy")
        proc = PandasProcessor()
        with pytest.raises(ValueError):
            proc.load_and_process(str(p), SCHEMA)


class TestJSONGenerator:
    def test_for_visualization(self):
        df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})
        gen = JSONGenerator()
        result = gen.for_visualization(df)
        assert result["meta"]["row_count"] == 3
        assert "a" in result["numeric_summaries"]

    def test_for_ai_prompts(self):
        df = pd.DataFrame({"salary": [50000, 60000], "dept": ["Eng", "HR"]})
        gen = JSONGenerator()
        result = gen.for_ai_prompts(df)
        assert "salary" in result["column_groups"]["numeric"]
        assert "dept" in result["column_groups"]["categorical"]

    def test_save(self, tmp_path):
        gen = JSONGenerator()
        payload = {"test": 123}
        out = str(tmp_path / "out.json")
        gen.save(payload, out)
        with open(out) as f:
            loaded = json.load(f)
        assert loaded["test"] == 123


class TestPromptBuilder:
    def test_build_schema_analysis(self):
        pb = PromptBuilder({"schema_analysis": "Schema: {schema} Rels: {relationships}"})
        prompt = pb.build_schema_analysis({"name": "test"}, [])
        assert "test" in prompt

    def test_build_data_insight(self):
        pb = PromptBuilder({"data_insight": "Summary: {summary}"})
        prompt = pb.build_data_insight({"rows": 100})
        assert "100" in prompt
