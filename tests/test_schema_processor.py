"""Tests for schema_processor module."""
import json
import tempfile
from pathlib import Path

import pytest

from src.schema_processor.schema_parser import SchemaParser
from src.schema_processor.relationship_mapper import RelationshipMapper
from src.schema_processor.validator import SchemaValidator


SAMPLE_SCHEMA = {
    "name": "test",
    "fields": {
        "id": {"type": "integer", "nullable": False},
        "name": {"type": "string", "nullable": True},
        "amount": {"type": "float", "nullable": False},
    },
}


@pytest.fixture
def schema_file(tmp_path):
    p = tmp_path / "schema.json"
    p.write_text(json.dumps(SAMPLE_SCHEMA))
    return str(p)


class TestSchemaParser:
    def test_parse_json(self, schema_file):
        parser = SchemaParser()
        schema = parser.parse(schema_file)
        assert schema["name"] == "test"
        assert "id" in schema["fields"]

    def test_parse_missing_file(self):
        parser = SchemaParser()
        with pytest.raises(FileNotFoundError):
            parser.parse("/nonexistent/schema.json")

    def test_map_relationships(self):
        parser = SchemaParser()
        rels = parser.map_relationships("orders->customers:customer_id, orders->products:product_id")
        assert len(rels) == 2
        assert rels[0]["from_table"] == "orders"
        assert rels[0]["to_table"] == "customers"
        assert rels[0]["join_key"] == "customer_id"

    def test_map_relationships_empty(self):
        parser = SchemaParser()
        rels = parser.map_relationships("")
        assert rels == []

    def test_infer_from_dataframe(self):
        import pandas as pd
        df = pd.DataFrame({"x": [1, 2, 3], "y": ["a", "b", "c"]})
        parser = SchemaParser()
        schema = parser.infer_from_dataframe(df)
        assert "x" in schema["fields"]
        assert schema["fields"]["x"]["type"] == "integer"


class TestRelationshipMapper:
    def test_build_graph(self):
        mapper = RelationshipMapper()
        rels = [{"from_table": "orders", "to_table": "customers", "join_key": "customer_id"}]
        graph = mapper.build_graph(rels)
        assert "orders" in graph["nodes"]
        assert len(graph["edges"]) == 1

    def test_degree_centrality(self):
        mapper = RelationshipMapper()
        rels = [
            {"from_table": "orders", "to_table": "customers", "join_key": "cid"},
            {"from_table": "orders", "to_table": "products", "join_key": "pid"},
        ]
        graph = mapper.build_graph(rels)
        centrality = mapper.get_degree_centrality(graph)
        assert centrality["orders"] == 2


class TestSchemaValidator:
    def test_valid_schema(self):
        validator = SchemaValidator()
        errors = validator.validate_schema(SAMPLE_SCHEMA)
        assert errors == []

    def test_invalid_schema_missing_fields(self):
        validator = SchemaValidator()
        errors = validator.validate_schema({"name": "bad"})
        assert len(errors) > 0

    def test_dataframe_validation(self):
        import pandas as pd
        validator = SchemaValidator()
        df = pd.DataFrame({"id": [1, 2], "name": ["a", None]})
        errors = validator.validate_dataframe_against_schema(df, SAMPLE_SCHEMA)
        # 'amount' column missing from df
        assert any("amount" in e for e in errors)
