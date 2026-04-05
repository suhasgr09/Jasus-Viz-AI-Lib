"""AI Viz Framework – Main Entry Point."""
import json
import sys
from pathlib import Path

import yaml

# Allow running from repo root: python src/main.py
sys.path.insert(0, str(Path(__file__).parent))

from schema_processor.schema_parser import SchemaParser
from data_engine.pandas_processor import PandasProcessor
from data_engine.json_generator import JSONGenerator
from ai_integration.claude_client import ClaudeClient


class AIVizFramework:
    def __init__(self, config_path: str = "config/claude_config.yaml"):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
        self.claude = ClaudeClient(self.config)
        self.schema_parser = SchemaParser()
        self.processor = PandasProcessor()
        self.json_gen = JSONGenerator()

    def process(self, schema_path: str, data_path: str, relationships: str) -> dict:
        # 1. Parse schema and relationships
        schema = self.schema_parser.parse(schema_path)
        rel_list = self.schema_parser.map_relationships(relationships)

        # 2. Process data and generate JSONs
        df = self.processor.load_and_process(data_path, schema)
        from schema_processor.relationship_mapper import RelationshipMapper
        rel_map = RelationshipMapper().build_graph(rel_list)
        viz_json = self.json_gen.for_visualization(df, rel_map)
        prompt_json = self.json_gen.for_ai_prompts(df, rel_map)

        # 3. Get Claude recommendations
        insights = self.claude.analyze(prompt_json)

        return {"viz_data": viz_json, "ai_insights": insights}


def main():
    import argparse

    parser = argparse.ArgumentParser(description="AI Viz Framework")
    parser.add_argument("--schema", required=True, help="Path to schema file (JSON/YAML)")
    parser.add_argument("--data", required=True, help="Path to data file (CSV/JSON/Parquet)")
    parser.add_argument("--relationships", default="", help="Relationship string, e.g. 'a->b:id'")
    parser.add_argument("--output", default="data/generated_json/output.json", help="Output JSON path")
    args = parser.parse_args()

    framework = AIVizFramework()
    result = framework.process(args.schema, args.data, args.relationships)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"Output written to {output_path}")


if __name__ == "__main__":
    main()
