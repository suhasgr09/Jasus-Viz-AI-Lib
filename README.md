<div align="center">

# jasus-viz-AI-lib

**An open-source AI-powered data visualization library**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-brightgreen.svg)](https://python.org)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-brightgreen.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![D3.js](https://img.shields.io/badge/D3.js-v7-f9a03c.svg)](https://d3js.org)

Combines **GitHub Copilot (gpt-4o)**, **D3.js v7**, **React 18**, **pandas**, and **FastAPI** to automatically analyze datasets, infer multi-table relationships, suggest optimal chart types, and render **14 fully interactive D3 visualizations** — with a live Sales & Payments demo dashboard included.

[Quick Start](#quick-start) · [API Reference](#api-reference) · [D3 Charts](#visualizations) · [Multi-Table Analysis](#multi-table-analysis) · [Contributing](CONTRIBUTING.md) · [Guidelines](GUIDELINES.md)

</div>

---

## Why jasus-viz-AI-lib?

Most AI-driven visualization tools are closed exploration products — point-and-click, black-box, hard to self-host, and impossible to embed in your own app. **jasus-viz-AI-lib is built as a library first.**

| Capability | Description |
|---|---|
| **Embeddable Python modules** | `schema_processor`, `data_engine`, and `ai_integration` are importable packages — drop them into any project |
| **Works fully offline** | The `/demo` dashboard generates data client-side; zero AI key needed to see real charts |
| **Live D3 source with every chart** | Every chart ships with a collapsible code panel showing the exact D3 v7 source — built for learning and forking |
| **AI as an advisor, not a gatekeeper** | Copilot recommends chart types and surfaces insights; you retain full rendering control via hand-crafted D3 |
| **Multi-table data model** | Upload 2+ files and Copilot automatically infers FK relationships, renders an SVG table map, and recommends cross-table visualisations |
| **Multi-model aware** | Supports GitHub Copilot (gpt-4o), Google Gemini, Anthropic Claude, and OpenAI with a unified client interface |
| **Minimal ops** | `uvicorn src.api:app` + `npm start` — no sandboxed execution, no identity layer, no cloud dependency |
| **Fully tested** | 26-test pytest suite covering schema parsing, data processing, and AI integration |
| **Full D3 rendering control** | Custom animations, force simulations, SVG draw-on effects, and tooltip styling that declarative charting specs cannot express |

---

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Visualizations](#visualizations)
- [Multi-Table Analysis](#multi-table-analysis)
- [API Reference](#api-reference)
- [Using as a Python Library](#using-as-a-python-library)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

```
jasus-viz-AI-lib/
├── src/                          # Python backend
│   ├── schema_processor/         # Schema parsing, FK mapping, validation
│   │   ├── schema_parser.py      # Infer schema from DataFrame; parse JSON schemas
│   │   ├── relationship_mapper.py# Build relationship graph from FK string notation
│   │   └── validator.py          # Validate data against schema
│   ├── data_engine/              # Data processing and JSON generation
│   │   ├── pandas_processor.py   # Load CSV/JSON, type-cast, clean
│   │   ├── json_generator.py     # Produce viz JSON + AI prompt JSON
│   │   ├── prompt_builder.py     # Compose structured AI prompts
│   │   └── pyspark_processor.py  # Large-dataset PySpark path (optional)
│   ├── ai_integration/           # Unified AI client interface
│   │   ├── copilot_client.py     # GitHub Copilot via GitHub Models API (gpt-4o)
│   │   ├── gemini_client.py      # Google Gemini (gemini-2.0-flash)
│   │   ├── claude_client.py      # Anthropic Claude Sonnet
│   │   ├── openai_client.py      # OpenAI GPT-4o
│   │   └── response_parser.py    # Robust JSON extraction from LLM responses
│   ├── api.py                    # FastAPI REST backend
│   └── main.py                   # CLI entry point
│
├── frontend/                     # React + TypeScript + D3.js app
│   └── src/
│       ├── d3-charts/            # 14 standalone D3 chart components
│       ├── components/
│       │   ├── CopilotPage.tsx   # Multi-file upload + relationship map + visual generator
│       │   ├── AIDashboard.tsx   # Copilot-annotated insights dashboard
│       │   ├── DataVisuals.tsx   # Schema-driven D3 chart library (8 chart types)
│       │   ├── TableRelationshipMap.tsx  # SVG FK relationship map
│       │   ├── SalesPaymentDemo.tsx      # Live demo dashboard
│       │   └── demo/             # KPI cards, donut, funnel, heatmap, table
│       ├── context/
│       │   └── UploadContext.tsx # Shared upload state across pages
│       ├── hooks/
│       │   ├── useSalesPaymentData.ts  # Sales + payments data hook
│       │   └── useSampleData.ts        # Sample dataset fetching hook
│       └── utils/
│           ├── chartStyles.ts    # Shared card/title/subtitle styles
│           ├── colors.ts         # CHART_COLORS palette + theme constants
│           ├── tooltipHelpers.ts # D3 tooltip factory
│           ├── chartSnippets.ts  # D3 source code for code panels
│           └── analytics.ts      # Event tracking utility
│
├── data/
│   ├── sample_schemas/           # JSON schema definitions
│   ├── sample_data/              # Generated CSV + JSON datasets
│   └── generate_samples.py       # Synthetic data generator
│
├── tests/                        # pytest test suite (26 tests)
│   ├── test_ai_integration.py
│   ├── test_data_engine.py
│   └── test_schema_processor.py
│
├── config/
│   └── claude_config.yaml        # Model parameters + prompt templates
├── CONTRIBUTING.md
├── GUIDELINES.md
└── LICENSE                       # MIT
```

### Data Flow

```
CSV / JSON file
      │
      ▼
PandasProcessor          ← loads, type-casts, cleans
      │
      ▼
SchemaParser             ← infers schema (columns, types, stats)
RelationshipMapper       ← builds FK graph from notation
      │
      ▼
JSONGenerator            ← viz_json (records + summaries)
                         ← prompt_json (compact AI-ready summary)
      │
      ├──► React frontend  (renders D3 charts from viz_json)
      │
      └──► AI Client       (analyze / multi-table)
                │
                ▼
           ResponseParser  (robust JSON extraction)
                │
                ▼
           Recommendations + Insights + Relationship Map
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12 or 3.13 |
| Node.js | 22+ |
| pip | latest |
| npm | 10+ |

### 1. Clone the repository

```bash
git clone https://github.com/suhasgr09/Jasus-Viz-AI-Lib.git
cd Jasus-Viz-AI-Lib
```

### 2. Install Python dependencies

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend && npm install && cd ..
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your keys (only the providers you want to use — all are optional except the one you pick):

```env
# GitHub Copilot — recommended primary provider
# Generate at https://github.com/settings/tokens (scope: models:read)
GITHUB_TOKEN=ghp_your_token_here

# Google Gemini — free tier available
GEMINI_API_KEY=your_gemini_key

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your_key

# OpenAI
OPENAI_API_KEY=sk-your_key
```

### 5. Generate sample data

```bash
python data/generate_samples.py
# Creates: sales (1000 rows), employees (200 rows), products (50 rows), payments (1000 rows)
```

### 6. Start the backend

```bash
uvicorn src.api:app --reload --port 8000
```

### 7. Start the frontend

```bash
cd frontend && npm start
```

Open **http://localhost:3000** — the sidebar gives access to all 14 charts and the demo dashboard.

### App Routes

| Route | Page | Notes |
|-------|------|-------|
| `/demo` | 🎯 Sales & Payments Demo | Start here — works without backend |
| `/copilot` | GitHub Copilot Analysis | Multi-file upload + relationship map |
| `/ai-dashboard` | AI Dashboard | Copilot insights on sample data |
| `/upload` | File Upload | Single file → viz JSON |
| `/ai-providers` | AI Provider Comparison | Models side-by-side |
| `/api-keys` | API Keys Setup | Configure all provider tokens |
| `/` | Bar Chart | |
| `/line` | Line Chart | |
| `/heatmap` | Heatmap Matrix | |
| `/scatter` | Scatter Plot | |
| `/boxplot` | Box Plot | |
| `/treemap` | Treemap | |
| `/sankey` | Sankey Diagram | |
| `/sunburst` | Sunburst Chart | |
| `/radar` | Radar Chart | |
| `/force` | Force-Directed Graph | |
| `/network` | Network Graph | |
| `/choropleth` | Choropleth Map | |
| `/parallel` | Parallel Coordinates | |
| `/stacked-area` | Stacked Area Chart | |

---

## Environment Variables

| Variable | Provider | Required | Description |
|----------|----------|----------|-------------|
| `GITHUB_TOKEN` | GitHub Copilot | For Copilot features | GitHub PAT with `models:read` scope |
| `GEMINI_API_KEY` | Google Gemini | For Gemini features | Google AI Studio API key |
| `ANTHROPIC_API_KEY` | Claude | For Claude features | Anthropic console API key |
| `OPENAI_API_KEY` | OpenAI | For OpenAI features | OpenAI platform API key |

> **Note:** You only need keys for the providers you actually use. The `/demo` dashboard and all D3 charts work without any API key.

---

## Visualizations

### 14 Interactive D3 Charts

Every chart features D3 v7 hover interactions — animated highlights, opacity feedback, and styled floating tooltips with live data values. Each also ships with a collapsible **"Show Code"** panel displaying the exact D3 source.

| # | Chart | File | Key D3 Features |
|---|-------|------|-----------------|
| 1 | Bar Chart | `BarChart.tsx` | `scaleBand`, animated enter transitions, hover highlights |
| 2 | Line Chart | `LineChart.tsx` | `scaleTime`, SVG clip-path zoom, animated draw-on |
| 3 | Heatmap Matrix | `HeatmapMatrix.tsx` | `scaleSequential`, color quantize, cell hover |
| 4 | Scatter Plot | `ScatterPlot.tsx` | `scaleLinear`, brush selection, zoom + pan |
| 5 | Box Plot | `BoxPlot.tsx` | `rollup` statistics, IQR whiskers, outlier dots |
| 6 | Treemap | `Treemap.tsx` | `treemap()`, `stratify()`, breadcrumb trail |
| 7 | Sankey Diagram | `SankeyDiagram.tsx` | `d3-sankey`, path generator, link opacity |
| 8 | Sunburst Chart | `SunburstChart.tsx` | `partition()`, arc tween, click-to-zoom |
| 9 | Radar / Spider Chart | `RadarChart.tsx` | polar axes, `lineRadial`, area fill |
| 10 | Force-Directed Graph | `ForceGraph.tsx` | `forceSimulation`, drag, link distance |
| 11 | Network Graph | `NetworkGraph.tsx` | Schema FK relationships, node labels |
| 12 | Choropleth Map | `ChoroplethMap.tsx` | `geoAlbersUsa`, `geoPath`, color threshold |
| 13 | Parallel Coordinates | `ParallelCoordinates.tsx` | multi-axis brush, `line` generator |
| 14 | Stacked Area Chart | `StackedAreaChart.tsx` | `stack()`, `area()`, streamgraph variant |

### 🎯 Sales & Payments Demo (`/demo`)

A self-contained analytics dashboard built on 2,000 rows of synthetic data. Works without the backend API — falls back to client-side data generation.

| Component | Description |
|-----------|-------------|
| KPI Cards | Total Revenue, Net Collected, Avg Order Value, Payment Success Rate |
| Revenue vs Net Collected | Dual-line monthly chart with animated SVG draw |
| Payment Method Donut | Animated donut with hover expansion (5 payment methods) |
| Revenue by Category | Grouped horizontal bar (gross vs net per category) |
| Payment Status Funnel | Completed → Pending → Refunded → Failed |
| Region × Method Heatmap | Net collected per region/payment-method cell |
| Transactions Table | Searchable, sortable, paginated log of all 1,000 payments |

---

## Multi-Table Analysis

Upload **two or more** CSV/JSON files to the Copilot page (`/copilot`) to enable automatic data model detection:

### How it works

```
Upload file A + file B
         │
         ▼
inferSchema()            ← client-side column type classification
         │
         ▼
POST /api/multi-table/analyze
         │
         ▼
Copilot (gpt-4o) analyzes:
  ├── Shared column names / matching value ranges → FK relationships
  ├── Primary key per table
  ├── Relationship cardinality (one-to-one, one-to-many, many-to-many)
  ├── Confidence score per link (0–1)
  └── Cross-table chart recommendations
         │
         ▼
SVG TableRelationshipMap
  ├── Table cards with column type badges (N / C / D)
  ├── 🔑 primary key markers
  ├── ⇌ join column markers
  └── Bezier curves (solid = high confidence, dashed = inferred)
         │
         ▼
Per-file SchemaDisplay + MultiChartGrid
```

### Example payload to `/api/multi-table/analyze`

```json
POST /api/multi-table/analyze?provider=copilot
{
  "tables": [
    {
      "name": "orders.csv",
      "columns": ["order_id", "customer_id", "total_amount", "region"],
      "col_types": { "order_id": "numeric", "customer_id": "numeric",
                     "total_amount": "numeric", "region": "categorical" },
      "row_count": 1000,
      "sample_values": { "order_id": [1, 2, 3], "region": ["North", "South"] }
    },
    {
      "name": "payments.csv",
      "columns": ["payment_id", "order_id", "method", "net_amount"],
      "col_types": { "payment_id": "numeric", "order_id": "numeric",
                     "method": "categorical", "net_amount": "numeric" },
      "row_count": 800,
      "sample_values": { "order_id": [1, 2, 3], "method": ["credit_card"] }
    }
  ]
}
```

### Example response

```json
{
  "relationships": [
    {
      "from_table": "orders.csv",
      "from_col": "order_id",
      "to_table": "payments.csv",
      "to_col": "order_id",
      "type": "one-to-many",
      "confidence": 0.95,
      "label": "Order-Payment link"
    }
  ],
  "primary_keys": { "orders.csv": "order_id", "payments.csv": "payment_id" },
  "insights": [
    "Each order can have multiple associated payments (one-to-many via order_id).",
    "The 'region' column enables geographic breakdown of payment totals."
  ],
  "recommendations": [
    { "chart_type": "bar_chart", "reason": "Revenue by region", "priority": 1,
      "tables_involved": ["orders.csv", "payments.csv"] }
  ],
  "suggested_title": "Order-Payment Data Model"
}
```

---

## API Reference

All endpoints return JSON. The `provider` query parameter accepts `copilot`, `gemini`, `claude`, or `openai`.

### `GET /health`

```
200 OK
{"status": "ok"}
```

### `POST /api/process`

Upload a CSV or JSON file and receive viz-ready JSON + AI insights.

**Request** (multipart/form-data)

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | CSV or JSON file |
| `provider` | string | AI provider (default: `gemini`) |
| `schema_json` | string | Optional JSON schema override |
| `relationships` | string | Optional FK notation e.g. `orders->payments:order_id` |

**Response**

```json
{
  "viz_data": {
    "records": [...],
    "meta": { "row_count": 1000, "columns": ["col1", "col2"] },
    "numeric_summaries": { "amount": { "mean": 250, "min": 10, "max": 990 } }
  },
  "ai_insights": {
    "recommendations": [{ "chart_type": "bar", "reason": "...", "priority": 1 }],
    "insights": ["..."],
    "suggested_title": "..."
  }
}
```

### `POST /api/insights`

```json
POST /api/insights?provider=copilot
{"dataset_summary": {"dataset_shape": {"rows": 1000, "columns": 9}, ...}}
```

Returns `recommendations`, `insights`, `suggested_title`.

### `POST /api/recommendations`

```json
POST /api/recommendations?provider=copilot
{"schema": {...}, "relationships": [...]}
```

Returns `recommendations` array.

### `POST /api/viz-recommendation`

```json
POST /api/viz-recommendation?provider=copilot
{"pattern": {"numeric_cols": 3, "categorical_cols": 2, "row_count": 500}}
```

Returns `recommended_chart`, `alternative_chart`, `reasoning`.

### `POST /api/multi-table/analyze`

See [Multi-Table Analysis](#multi-table-analysis) above for full payload / response.

### `GET /api/sample-data/{dataset}`

`dataset` ∈ `sales` | `employees` | `products` | `payments`

Returns the full dataset as JSON with `records` and `meta`.

### `GET /api/demo/sales-payments`

Returns combined sales + payments data with pre-computed KPI summary stats.

---

## Using as a Python Library

All three backend packages are independently importable:

### Schema processing

```python
from schema_processor.schema_parser import SchemaParser
from schema_processor.relationship_mapper import RelationshipMapper
import pandas as pd

df = pd.read_csv("my_data.csv")
parser = SchemaParser()
schema = parser.infer_from_dataframe(df)
# → {"fields": [{"name": "amount", "type": "float", ...}, ...]}

rel_list = parser.map_relationships("orders->payments:order_id")
graph = RelationshipMapper().build_graph(rel_list)
```

### Data processing

```python
from data_engine.pandas_processor import PandasProcessor
from data_engine.json_generator import JSONGenerator

processor = PandasProcessor()
df = processor.load_and_process("data.csv", schema)

gen = JSONGenerator()
viz_json   = gen.for_visualization(df, rel_map)   # frontend-ready
prompt_json = gen.for_ai_prompts(df, rel_map)      # AI-ready compact summary
```

### AI integration

```python
import yaml
from ai_integration.copilot_client import CopilotClient

with open("config/claude_config.yaml") as f:
    cfg = yaml.safe_load(f)

client = CopilotClient(cfg)

# Single-table insights
result = client.analyze(prompt_json)
# → {"recommendations": [...], "insights": [...], "suggested_title": "..."}

# Multi-table relationship analysis
result = client.analyze_multi_table([
    {"name": "orders", "columns": ["id", "amount"], "col_types": {...}, ...},
    {"name": "payments", "columns": ["id", "order_id"], "col_types": {...}, ...},
])
# → {"relationships": [...], "primary_keys": {...}, ...}
```

---

## Configuration

`config/claude_config.yaml` controls model parameters and prompt templates for all providers:

```yaml
gemini:
  model: "gemini-2.0-flash"
  max_tokens: 4096
  temperature: 0.3

claude:
  model: "claude-sonnet-4-5"
  max_tokens: 4096
  temperature: 0.3

openai:
  model: "gpt-4o"
  max_tokens: 4096
  temperature: 0.3

copilot:
  model: "gpt-4o"
  max_tokens: 4096
  temperature: 0.3

prompts:
  schema_analysis: |
    Analyze this data schema and suggest optimal visualizations.
    Return JSON with key 'recommendations' (array of {chart_type, reason, priority}).
```

---

## Running Tests

```bash
# Activate your virtual environment first
source .venv/bin/activate

# Run all tests
python -m pytest tests/ -v

# Run a specific test file
python -m pytest tests/test_ai_integration.py -v

# Run with coverage
python -m pytest tests/ --cov=src --cov-report=term-missing
```

Expected output: **26 passed** across `test_ai_integration.py`, `test_data_engine.py`, and `test_schema_processor.py`.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **AI (primary)** | GitHub Copilot via GitHub Models API (gpt-4o) | latest |
| **AI (supported)** | Google Gemini, Anthropic Claude, OpenAI GPT-4o | latest |
| **Backend** | Python, FastAPI, uvicorn | 3.12+ / 0.100+ |
| **Data processing** | pandas, NumPy, SciPy | 2.x / 1.25+ |
| **Frontend** | React, TypeScript | 18 / 5 |
| **Visualizations** | D3.js | v7 |
| **Routing** | react-router-dom | v6 |
| **HTTP client** | axios | 1.x |
| **Testing** | pytest, pytest-asyncio | 7.4+ |
| **Dev environment** | GitHub Codespaces, devcontainer | — |

---

## Troubleshooting

### Backend won't start

```bash
# Check Python version (3.12+ required)
python --version

# Make sure the virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend shows `net::ERR_FAILED`

The React app proxies `/api/*` requests to `localhost:8000`. Make sure the backend is running first.

```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

### `GITHUB_TOKEN` errors

1. Go to **https://github.com/settings/tokens** → Generate new token (classic)
2. Select scope: `models:read` (or `read:org` for Copilot Business)
3. Copy the token and add it to `.env`: `GITHUB_TOKEN=ghp_...`
4. Restart the backend: `uvicorn src.api:app --reload --port 8000`

### Port 3000 already in use

```bash
lsof -ti :3000 | xargs kill -9
cd frontend && npm start
```

### Port 8000 already in use

```bash
lsof -ti :8000 | xargs kill -9
uvicorn src.api:app --reload --port 8000
```

### Sample data not found

```bash
python data/generate_samples.py
```

### TypeScript errors in node_modules

These are pre-existing type definition issues in `@types/d3-dispatch` — they do not affect the Webpack/CRA build and can be ignored. Run `npm start` instead of `tsc --noEmit`.

---

## Roadmap

- [ ] **Ollama / local LLM support** — run analysis fully offline with llama3 / mistral
- [ ] **CSV column mapping UI** — manually override inferred column types before sending to AI
- [ ] **Export charts** — PNG / SVG download button on each chart
- [ ] **Saved sessions** — persist uploaded files and analysis results across page reloads (localStorage)
- [ ] **PySpark large-file path** — route files > 100 MB through `pyspark_processor.py`
- [ ] **Dark/light theme toggle** — currently dark-only
- [ ] **WebSocket streaming** — stream AI insights token-by-token instead of waiting for the full response
- [ ] **Docker Compose** — single `docker compose up` to start both services
- [ ] **Python package on PyPI** — `pip install jasus-viz` to use backend modules in isolation
- [ ] **Embeddable React component** — `npm install jasus-viz-react` for drop-in chart components

---

## Contributing

We welcome contributions of all kinds — bug fixes, new chart types, AI provider integrations, documentation improvements, and more.

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full contribution process and **[GUIDELINES.md](GUIDELINES.md)** for coding standards and architecture decisions.

**Quick contribution steps:**
1. Fork the repo and create your branch: `git checkout -b feat/your-feature`
2. Make changes, add/update tests  
3. Run tests: `python -m pytest tests/ -v`
4. Commit using conventional commits: `git commit -m "feat: add X"`
5. Push and open a Pull Request

---

## License

Released under the **MIT License** — see [LICENSE](LICENSE) for details.

© 2026 JasusAI Inc. · [GitHub](https://github.com/suhasgr09/Jasus-Viz-AI-Lib)
