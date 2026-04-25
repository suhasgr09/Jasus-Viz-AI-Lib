"""FastAPI backend – serves processed viz data and AI insights (Gemini / Claude / OpenAI)."""
import json
import os
import sys
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import yaml
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))

app = FastAPI(title="jasus-viz-AI-lib API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lazy-load framework components ──────────────────────────────────────────
_config: dict | None = None


def _get_config() -> dict:
    global _config
    if _config is None:
        config_path = Path(__file__).parent.parent / "config" / "claude_config.yaml"
        with open(config_path) as f:
            _config = yaml.safe_load(f)
    return _config


# ── Request / Response models ──────────────────────────────────────────────

class InsightRequest(BaseModel):
    dataset_summary: dict[str, Any]


class RecommendationRequest(BaseModel):
    schema: dict[str, Any]
    relationships: list[dict[str, str]] = []


class VizPatternRequest(BaseModel):
    pattern: dict[str, Any]


class TableSummary(BaseModel):
    name: str
    columns: list[str] = []
    col_types: dict[str, str] = {}
    row_count: int = 0
    sample_values: dict[str, list] = {}


class MultiTableRequest(BaseModel):
    tables: list[TableSummary]


# ── AI client factory ──────────────────────────────────────────────────────

Provider = Literal["gemini", "claude", "openai", "copilot"]

def _get_client(provider: Provider):
    cfg = _get_config()
    if provider == "gemini":
        from ai_integration.gemini_client import GeminiClient
        return GeminiClient(cfg)
    elif provider == "claude":
        from ai_integration.claude_client import ClaudeClient
        return ClaudeClient(cfg)
    elif provider == "openai":
        from ai_integration.openai_client import OpenAIClient
        return OpenAIClient(cfg)
    elif provider == "copilot":
        from ai_integration.copilot_client import CopilotClient
        return CopilotClient(cfg)
    raise ValueError(f"Unknown provider: {provider}")


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/insights")
def get_insights(req: InsightRequest, provider: Provider = "gemini"):
    """Ask an AI provider for insights about a dataset summary."""
    try:
        client = _get_client(provider)
        result = client.analyze(req.dataset_summary)
        return result
    except EnvironmentError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/api/recommendations")
def get_recommendations(req: RecommendationRequest, provider: Provider = "gemini"):
    """Ask an AI provider to recommend chart types for a schema."""
    try:
        client = _get_client(provider)
        result = client.get_schema_recommendations(req.schema, req.relationships)
        return result
    except EnvironmentError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/viz-recommendation")
def viz_recommendation(req: VizPatternRequest, provider: Provider = "gemini"):
    """Ask an AI provider for the best chart type for a data pattern."""
    try:
        client = _get_client(provider)
        result = client.get_viz_recommendation(req.pattern)
        return result
    except EnvironmentError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/multi-table/analyze")
def multi_table_analyze(req: MultiTableRequest, provider: Provider = "copilot"):
    """Use AI to infer FK relationships between multiple table schemas and recommend cross-table visualizations."""
    try:
        client = _get_client(provider)
        if not hasattr(client, "analyze_multi_table"):
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{provider}' does not support multi-table analysis.",
            )
        result = client.analyze_multi_table([t.model_dump() for t in req.tables])
        return result
    except EnvironmentError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/api/process")
async def process_upload(
    file: UploadFile = File(...),
    schema_json: str = Form("{}"),
    relationships: str = Form(""),
    provider: str = Form("gemini"),
):
    """Upload a CSV/JSON file, process it, and return viz JSON + AI insights."""
    import tempfile
    import pandas as pd
    from data_engine.pandas_processor import PandasProcessor
    from data_engine.json_generator import JSONGenerator
    from schema_processor.schema_parser import SchemaParser
    from schema_processor.relationship_mapper import RelationshipMapper

    schema_dict = json.loads(schema_json)
    suffix = Path(file.filename or "upload.csv").suffix

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        parser = SchemaParser()
        processor = PandasProcessor()
        gen = JSONGenerator()

        if not schema_dict.get("fields"):
            df_raw = pd.read_csv(tmp_path) if suffix == ".csv" else pd.read_json(tmp_path)
            schema_dict = parser.infer_from_dataframe(df_raw)

        df = processor.load_and_process(tmp_path, schema_dict)
        rel_list = parser.map_relationships(relationships)
        rel_map = RelationshipMapper().build_graph(rel_list)

        viz_json = gen.for_visualization(df, rel_map)
        prompt_json = gen.for_ai_prompts(df, rel_map)

        try:
            client = _get_client(provider)  # type: ignore[arg-type]
            ai_insights = client.analyze(prompt_json)
        except (EnvironmentError, RuntimeError) as exc:
            ai_insights = {"error": str(exc)}

        return {"viz_data": viz_json, "ai_insights": ai_insights}
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@app.get("/api/sample-data/{dataset}")
def sample_data(dataset: str):
    """Return a pre-built sample dataset for frontend demos."""
    allowed = {"sales", "employees", "products", "payments"}
    if dataset not in allowed:
        raise HTTPException(status_code=404, detail=f"Unknown dataset '{dataset}'")

    data_path = Path(__file__).parent.parent / "data" / "sample_data" / f"{dataset}.json"
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="Sample data not generated yet")

    with open(data_path) as f:
        return json.load(f)


@app.get("/api/demo/sales-payments")
def sales_payments_demo():
    """Return combined sales + payments datasets with pre-computed summary stats."""
    base = Path(__file__).parent.parent / "data" / "sample_data"
    sales_path = base / "sales.json"
    payments_path = base / "payments.json"

    if not sales_path.exists() or not payments_path.exists():
        raise HTTPException(status_code=404, detail="Run data/generate_samples.py first")

    with open(sales_path) as f:
        sales = json.load(f)["records"]
    with open(payments_path) as f:
        payments = json.load(f)["records"]

    # Build quick summary stats for the frontend KPI cards
    total_revenue = sum(r["total_amount"] for r in sales)
    total_collected = sum(r["net_amount"] for r in payments if r["status"] == "completed")
    total_fees = sum(r["processor_fee"] for r in payments if r["status"] == "completed")
    completed = sum(1 for r in payments if r["status"] == "completed")
    success_rate = round(completed / len(payments) * 100, 1) if payments else 0

    method_totals: dict = {}
    for r in payments:
        if r["status"] == "completed":
            method_totals[r["payment_method"]] = method_totals.get(r["payment_method"], 0) + r["net_amount"]

    status_counts: dict = {}
    for r in payments:
        status_counts[r["status"]] = status_counts.get(r["status"], 0) + 1

    return {
        "sales": sales,
        "payments": payments,
        "summary": {
            "total_orders": len(sales),
            "total_revenue": round(total_revenue, 2),
            "total_collected": round(total_collected, 2),
            "total_fees": round(total_fees, 2),
            "avg_order_value": round(total_revenue / len(sales), 2) if sales else 0,
            "payment_success_rate": success_rate,
            "method_totals": method_totals,
            "status_counts": status_counts,
        },
    }
