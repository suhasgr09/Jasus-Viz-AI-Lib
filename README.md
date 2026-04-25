# jasus-viz-AI-lib

An AI-powered data visualization **library** combining **GitHub Copilot (gpt-4o)** with **D3.js**, **React**, **pandas**, and **FastAPI** to automatically analyze datasets, infer multi-table relationships, suggest optimal chart types, and render 14 fully interactive D3 visualizations — including a live **Sales & Payments demo dashboard**.

## Why jasus-viz-AI-lib

Most AI-driven visualization tools are closed exploration products — point-and-click, black-box, hard to self-host, and impossible to embed in your own app. **jasus-viz-AI-lib is built as a library first.**

| Capability                             | This library                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Embeddable as Python modules**       | `schema_processor`, `data_engine`, and `ai_integration` are importable packages — drop them into any project                                               |
| **Works fully offline**                | The `/demo` dashboard generates data client-side; zero AI key needed to see real charts                                                                    |
| **Live D3 code alongside every chart** | Every chart ships with a collapsible code panel showing the exact D3 v7 source — built for learning and forking                                            |
| **AI as an advisor, not a gatekeeper** | Copilot recommends chart types and surfaces insights; you retain full rendering control via hand-crafted D3                                                 |
| **Multi-table data model**             | Upload 2+ files and Copilot automatically infers FK relationships, renders an SVG table map, and recommends cross-table visualisations                      |
| **Multi-model aware**                  | In-app model switcher documents Claude, GPT-4o, Gemini, and Ollama side-by-side with reasoning scores, cost, privacy ratings, and copy-paste code snippets |
| **Minimal ops**                        | `uvicorn src.api:app` + `npm start` — no sandboxed execution environment, no identity layer, no cloud dependency                                           |
| **Tested**                             | 26-test pytest suite covering schema parsing, data processing, and AI integration                                                                          |
| **Full rendering control via D3 v7**   | Custom animations, force simulations, SVG draw-on effects, and tooltip styling that declarative charting specs cannot express                              |

## Architecture

```
dataviz-ai-studio/
├── src/
│   ├── schema_processor/   # Schema parsing, relationship mapping, validation
│   ├── data_engine/        # pandas processing, JSON generation, prompt building
│   ├── ai_integration/     # GitHub Copilot + Gemini + Claude + OpenAI clients
│   ├── api.py              # FastAPI backend (REST API)
│   └── main.py             # CLI entry point
├── frontend/               # React + TypeScript + D3.js app
│   └── src/
│       ├── d3-charts/      # 15 D3 visualization components
│       ├── components/
│       │   ├── demo/       # Sales & Payments demo charts + table
│       │   ├── SalesPaymentDemo.tsx  # Live demo dashboard page
│       │   ├── AIDashboard.tsx       # Copilot-generated insights
│       │   ├── CopilotPage.tsx       # Multi-file upload + relationship map + visual generator
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

| #   | Chart                  | Tooltip content                |
| --- | ---------------------- | ------------------------------ |
| 1   | Interactive Bar Chart  | Region, revenue, order count   |
| 2   | Line Chart with Zoom   | Month, revenue                 |
| 3   | Heatmap Matrix         | Region × category, revenue     |
| 4   | Force-Directed Graph   | Node name, connected entities  |
| 5   | Treemap                | Category, revenue, % share     |
| 6   | Sankey Diagram         | Source → target flow           |
| 7   | Scatter Plot           | Region, qty, total, category   |
| 8   | Box Plot Dashboard     | Dept + min/Q1/median/Q3/max    |
| 9   | Choropleth Map         | State, region, revenue         |
| 10  | Sunburst Chart         | Name, value, depth type        |
| 11  | Radar / Spider Chart   | Dept + metric means            |
| 12  | Stacked Area Chart     | Category, month, revenue       |
| 13  | Network Graph (Schema) | Table name, type, FK count     |
| 14  | Parallel Coordinates   | Dept, salary, perf, experience |

### 🎯 Sales & Payments Demo (`/demo`)

A self-contained analytics dashboard built on 2,000 rows of synthetic sales + payment data. Works without the backend API running (falls back to client-side data generation).

| Component                | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| KPI Cards                | Total Revenue, Net Collected, Avg Order Value, Payment Success Rate |
| Revenue vs Net Collected | Dual-line monthly chart with animated draw                          |
| Payment Method Donut     | Animated donut with hover expansion (5 methods)                     |
| Revenue by Category      | Grouped horizontal bar (gross vs net per category)                  |
| Payment Status Funnel    | Completed → Pending → Refunded → Failed                             |
| Region × Method Heatmap  | Net collected per region/payment method cell                        |
| Transactions Table       | Searchable, sortable, paginated log of all payments                 |

## Quick Start

### 1. Clone & open in Codespace

```bash
git clone https://github.com/suhasgr09/Jasus-Viz-AI-Lib
# Open in GitHub Codespace — devcontainer auto-installs deps
```

### 2. Set your GitHub token

```bash
cp .env.example .env
# Edit .env and set: GITHUB_TOKEN=ghp_your_token_here
# Generate a token at https://github.com/settings/tokens (scope: models:read)
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

| Route           | Page                                  |
| --------------- | ------------------------------------- |
| `/demo`         | 🎯 Sales & Payments Demo (start here) |
| `/`             | Bar Chart                             |
| `/line`         | Line Chart                            |
| `/heatmap`      | Heatmap Matrix                        |
| `/ai-dashboard` | AI Dashboard                          |
| …               | (all 15 charts in sidebar)            |

### 6. Run the CLI

```bash
python src/main.py \
  --schema data/sample_schemas/sales_schema.json \
  --data data/sample_data/sales.csv \
  --relationships "orders->customers:customer_id, orders->products:product_id" \
  --output data/generated_json/output.json
```

## API Endpoints

| Method | Path                          | Description                                                       |
| ------ | ----------------------------- | ----------------------------------------------------------------- |
| GET    | `/health`                     | Health check                                                      |
| POST   | `/api/insights`               | AI dataset insights (provider query param: `copilot`/`gemini`/…) |
| POST   | `/api/recommendations`        | Chart recommendations from schema                                 |
| POST   | `/api/viz-recommendation`     | Best chart for a data pattern                                     |
| POST   | `/api/multi-table/analyze`    | Infer FK relationships between multiple table schemas (Copilot)   |
| POST   | `/api/process`                | Upload CSV/JSON → viz JSON + Copilot insights                     |
| GET    | `/api/sample-data/{dataset}`  | Pre-built sample data (`sales`/`employees`/`products`/`payments`) |
| GET    | `/api/demo/sales-payments`    | Joined sales + payments with pre-computed summary stats           |

## Multi-Table Analysis

Upload two or more CSV/JSON files to the **GitHub Copilot** page (`/copilot`) to enable multi-table relationship detection:

1. **Schema inference** — column types (numeric / categorical / datetime) are detected client-side immediately on upload.
2. **Copilot relationship analysis** — the schemas are sent to `/api/multi-table/analyze` where Copilot identifies FK join columns, primary keys, relationship cardinality, and confidence scores.
3. **SVG table map** — an interactive SVG canvas renders each table as a card with colour-coded column type badges, bezier curves connecting join columns, and a confidence percentage on each link.
4. **Cross-table recommendations** — Copilot suggests the best chart types to visualise the joined dataset, including which tables each chart involves.
5. **Per-table visuals** — the original per-file schema display and AI-driven chart grid remain accessible via the file tabs below the map.

The multi-table analysis is non-blocking (fire-and-forget) so the per-file charts appear immediately while the relationship map loads in the background.

## Configuration

Edit `config/claude_config.yaml` to change model parameters for any provider.

```yaml
copilot:
  model: "gpt-4o"
  max_tokens: 4096
  temperature: 0.3
```

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

| Layer           | Technology                                                  |
| --------------- | ----------------------------------------------------------- |
| AI              | GitHub Copilot (gpt-4o via GitHub Models API); Gemini, Claude, OpenAI also supported |
| Backend         | Python 3.12, FastAPI, uvicorn, pandas 2.x, PyYAML, pydantic |
| Frontend        | React 18, TypeScript, D3.js v7, react-router-dom v6, axios  |
| Testing         | pytest (26 tests)                                           |
| Dev Environment | GitHub Codespaces, devcontainer                             |
