# jasus-viz-AI-lib

An AI-powered data visualization library combining **Claude Sonnet** with **D3.js**, **React**, **pandas**, and **FastAPI** to automatically analyze datasets, suggest optimal chart types, and render 14 fully interactive D3 visualizations — including a live **Sales & Payments demo dashboard**.

## Architecture

```
dataviz-ai-studio/
├── src/
│   ├── schema_processor/   # Schema parsing, relationship mapping, validation
│   ├── data_engine/        # pandas processing, JSON generation, prompt building
│   ├── ai_integration/     # Claude Sonnet client + response parser
│   ├── api.py              # FastAPI backend (REST API)
│   └── main.py             # CLI entry point
├── frontend/               # React + TypeScript + D3.js app
│   └── src/
│       ├── d3-charts/      # 15 D3 visualization components
│       ├── components/
│       │   ├── demo/       # Sales & Payments demo charts + table
│       │   ├── SalesPaymentDemo.tsx  # Live demo dashboard page
│       │   ├── AIDashboard.tsx       # Claude-generated insights
│       │   └── UploadPanel.tsx       # File upload interface
│       └── hooks/          # useSalesPaymentData, useSampleData
├── data/
│   ├── sample_schemas/     # JSON schemas (sales, employees, products)
│   └── sample_data/        # Generated CSV/JSON datasets (incl. payments)
├── tests/                  # pytest test suite (26 tests)
├── config/
│   └── claude_config.yaml  # Model + prompt templates
└── .devcontainer/          # Codespace configuration
```

## Visualizations

### 14 Interactive D3 Charts

All charts feature **D3 v7** hover interactions — animated highlights, opacity feedback, and styled floating tooltips with live data values.

| # | Chart | Tooltip content |
|---|-------|-----------------|
| 1 | Interactive Bar Chart | Region, revenue, order count |
| 2 | Line Chart with Zoom | Month, revenue |
| 3 | Heatmap Matrix | Region × category, revenue |
| 4 | Force-Directed Graph | Node name, connected entities |
| 5 | Treemap | Category, revenue, % share |
| 6 | Sankey Diagram | Source → target flow |
| 7 | Scatter Plot | Region, qty, total, category |
| 8 | Box Plot Dashboard | Dept + min/Q1/median/Q3/max |
| 9 | Choropleth Map | State, region, revenue |
| 10 | Sunburst Chart | Name, value, depth type |
| 11 | Radar / Spider Chart | Dept + metric means |
| 12 | Stacked Area Chart | Category, month, revenue |
| 13 | Network Graph (Schema) | Table name, type, FK count |
| 14 | Parallel Coordinates | Dept, salary, perf, experience |

### 🎯 Sales & Payments Demo (`/demo`)

A self-contained analytics dashboard built on 2,000 rows of synthetic sales + payment data. Works without the backend API running (falls back to client-side data generation).

| Component | Description |
|-----------|-------------|
| KPI Cards | Total Revenue, Net Collected, Avg Order Value, Payment Success Rate |
| Revenue vs Net Collected | Dual-line monthly chart with animated draw |
| Payment Method Donut | Animated donut with hover expansion (5 methods) |
| Revenue by Category | Grouped horizontal bar (gross vs net per category) |
| Payment Status Funnel | Completed → Pending → Refunded → Failed |
| Region × Method Heatmap | Net collected per region/payment method cell |
| Transactions Table | Searchable, sortable, paginated log of all payments |

## Quick Start

### 1. Clone & open in Codespace

```bash
git clone https://github.com/suhasgr09/Jasus-Viz-AI-Lib
# Open in GitHub Codespace — devcontainer auto-installs deps
```

### 2. Set your Anthropic API key

```bash
cp .env.example .env
# Edit .env and set: ANTHROPIC_API_KEY=your_key_here
```

### 3. Generate sample data

```bash
source .venv/bin/activate
python data/generate_samples.py
# → sales (1000 rows), employees (200 rows), products (50 rows), payments (1000 rows)
```

### 4. Start the backend

```bash
# Terminal 1
source .venv/bin/activate
uvicorn src.api:app --reload --port 8000
```

### 5. Start the frontend

> **Note:** Requires Node.js v22. If using nvm: `nvm use 22`

```bash
# Terminal 2
cd frontend && npm start
```

Open **http://localhost:3000** — the sidebar has all 15 charts plus the demo dashboard.

| Route | Page |
|-------|------|
| `/demo` | 🎯 Sales & Payments Demo (start here) |
| `/` | Bar Chart |
| `/line` | Line Chart |
| `/heatmap` | Heatmap Matrix |
| `/ai-dashboard` | AI Dashboard |
| … | (all 15 charts in sidebar) |

### 6. Run the CLI

```bash
python src/main.py \
  --schema data/sample_schemas/sales_schema.json \
  --data data/sample_data/sales.csv \
  --relationships "orders->customers:customer_id, orders->products:product_id" \
  --output data/generated_json/output.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/insights` | Claude dataset insights |
| POST | `/api/recommendations` | Chart recommendations from schema |
| POST | `/api/viz-recommendation` | Best chart for a data pattern |
| POST | `/api/process` | Upload CSV/JSON → viz JSON + Claude insights |
| GET | `/api/sample-data/{dataset}` | Pre-built sample data (`sales`/`employees`/`products`/`payments`) |
| GET | `/api/demo/sales-payments` | Joined sales + payments with pre-computed summary stats |

## Running Tests

```bash
source .venv/bin/activate
python -m pytest tests/ -v
# → 26 passed
```

## Configuration

Edit `config/claude_config.yaml` to change the Claude model, `max_tokens`, `temperature`, or prompt templates.

```yaml
claude:
  model: "claude-sonnet-4-5"
  max_tokens: 4096
  temperature: 0.3
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Anthropic Claude Sonnet (`claude-sonnet-4-5`) |
| Backend | Python 3.12, FastAPI, uvicorn, pandas 2.x, PyYAML, pydantic |
| Frontend | React 18, TypeScript, D3.js v7, react-router-dom v6, axios |
| Testing | pytest (26 tests) |
| Dev Environment | GitHub Codespaces, devcontainer |
