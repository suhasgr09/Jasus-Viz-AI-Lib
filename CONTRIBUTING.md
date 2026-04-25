# Contributing to jasus-viz-AI-lib

Thank you for your interest in contributing! jasus-viz-AI-lib is an open-source project and we genuinely value every form of contribution — from a one-line typo fix to a brand-new D3 chart type or AI provider integration.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Opening a Pull Request](#opening-a-pull-request)
- [Adding a New D3 Chart](#adding-a-new-d3-chart)
- [Adding a New AI Provider](#adding-a-new-ai-provider)
- [Running Tests](#running-tests)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project follows a simple rule: **treat everyone with respect**. Any form of harassment, discrimination, or exclusion will not be tolerated. If you experience or witness unacceptable behavior, please open a GitHub issue tagged `[conduct]` or email the maintainers directly.

---

## Ways to Contribute

| Type | Examples |
|------|---------|
| **Bug reports** | Wrong chart rendering, API errors, TypeScript build failures |
| **Bug fixes** | Fixing an off-by-one in axis labeling, correcting a wrong FK inference |
| **New D3 charts** | Violin plot, bubble chart, calendar heatmap |
| **New AI providers** | Mistral, Ollama (local), Cohere |
| **Backend improvements** | Performance, new `/api` endpoints, better prompt engineering |
| **Frontend improvements** | Accessibility, mobile layout, dark/light theme |
| **Documentation** | Clearer examples, additional diagrams, video walkthroughs |
| **Tests** | More coverage for edge cases, integration tests |
| **Tooling** | Docker Compose, CI/CD improvements, linting fixes |

---

## Development Setup

### 1. Fork and clone

```bash
# 1. Click "Fork" on GitHub, then:
git clone https://github.com/<your-username>/Jasus-Viz-AI-Lib.git
cd Jasus-Viz-AI-Lib

# Add upstream so you can sync later
git remote add upstream https://github.com/suhasgr09/Jasus-Viz-AI-Lib.git
```

### 2. Python backend

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Requires **Python 3.12+**. Verify with `python --version`.

### 3. Frontend

```bash
cd frontend
npm install
cd ..
```

Requires **Node.js 22+**. Verify with `node --version`.

### 4. Configure environment

```bash
cp .env.example .env
```

Set at least one AI provider key. The `GITHUB_TOKEN` key is preferred — generate one at https://github.com/settings/tokens with the `models:read` scope.

```env
GITHUB_TOKEN=ghp_your_token_here
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

### 5. Generate sample data

```bash
python data/generate_samples.py
```

### 6. Start servers (two terminals)

```bash
# Terminal 1 — backend
uvicorn src.api:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm start
```

Visit **http://localhost:3000** and verify charts render.

### 7. Sync with upstream before working

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

---

## Branch & Commit Conventions

### Branch naming

| Prefix | Use for |
|--------|---------|
| `feat/` | New features / chart types / providers |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring (no behavior change) |
| `test/` | Adding or improving tests |
| `chore/` | Build system, dependency updates |

Examples: `feat/violin-chart`, `fix/sankey-tooltip-overflow`, `docs/api-examples`

### Commit message format

Use **Conventional Commits** (`type(scope): description`):

```
feat(d3): add violin plot with IQR whiskers
fix(copilot): handle empty response in analyze_multi_table
docs(readme): add API request/response examples
refactor(data_engine): extract prompt template to config yaml
test(schema_processor): add edge cases for nullable FK columns
chore(deps): bump d3 to 7.9.0
```

**Rules:**
- Use imperative mood: *"add feature"*, not *"added feature"*
- Keep the subject under 72 characters
- Reference issues when relevant: `fix(api): handle empty CSV (#42)`

---

## Opening a Pull Request

1. **Create your branch** from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make your changes** — keep scope narrow. One logical change per PR is much easier to review.

3. **Add or update tests** — all new backend code should have unit tests in `tests/`. See [Running Tests](#running-tests).

4. **Run the test suite** and make sure everything passes:
   ```bash
   python -m pytest tests/ -v
   ```

5. **Commit** using the convention above.

6. **Push and open a PR:**
   ```bash
   git push origin feat/your-feature
   ```
   Then click **"Compare & pull request"** on GitHub.

7. In your PR description, include:
   - **What** changed and **why**
   - **Screenshots** or a short screen recording if the change affects the UI
   - **Test output** if it's a backend change
   - Any **breaking changes** (prefix the commit and PR title with `BREAKING CHANGE:`)

8. **Address review feedback** by adding commits to the same branch. Don't squash until the reviewer approves.

---

## Adding a New D3 Chart

1. **Create the component** at `frontend/src/d3-charts/MyChart.tsx`:

   ```tsx
   import React, { useEffect, useRef } from 'react';
   import * as d3 from 'd3';

   interface Props {
     data: YourDataType[];
     width?: number;
     height?: number;
   }

   const MyChart: React.FC<Props> = ({ data, width = 700, height = 400 }) => {
     const svgRef = useRef<SVGSVGElement>(null);

     useEffect(() => {
       if (!svgRef.current || data.length === 0) return;
       const svg = d3.select(svgRef.current);
       svg.selectAll('*').remove();
       // ... D3 implementation
     }, [data, width, height]);

     return <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} />;
   };

   export default MyChart;
   ```

   **Requirements** (see [GUIDELINES.md](GUIDELINES.md) for full details):
   - Use a `viewBox` for responsive scaling
   - Include D3 hover tooltips using `utils/tooltipHelpers.ts`
   - Add enter/update transitions (at minimum a 300 ms enter transition)
   - Use the color palette from `utils/colors.ts`

2. **Add a route** in `frontend/src/App.tsx`:
   ```tsx
   import MyChart from './d3-charts/MyChart';
   // ...
   <Route path="/my-chart" element={<ChartPage chart={<MyChart data={sampleData} />} />} />
   ```

3. **Add to the sidebar** in `frontend/src/components/AIDashboard.tsx` (or wherever the nav lives).

4. **Add a code snippet** in `frontend/src/utils/chartSnippets.ts` so the "Show Code" panel shows relevant D3 source.

5. **Update the chart table** in `README.md`.

---

## Adding a New AI Provider

1. **Create the client** at `src/ai_integration/my_provider_client.py`:

   ```python
   class MyProviderClient:
       def __init__(self, config: dict):
           self.model = config.get("my_provider", {}).get("model", "default-model")
           self.max_tokens = config.get("my_provider", {}).get("max_tokens", 4096)
           self.temperature = config.get("my_provider", {}).get("temperature", 0.3)
           # initialize SDK client

       def analyze(self, data: dict) -> dict:
           """Return {"recommendations": [...], "insights": [...], "suggested_title": "..."}"""
           ...

       def analyze_multi_table(self, tables: list[dict]) -> dict:
           """Return {"relationships": [...], "primary_keys": {...}, "insights": [...], ...}"""
           ...
   ```

   Use `src/ai_integration/response_parser.py` to extract JSON robustly from the model's text response.

2. **Export the client** in `src/ai_integration/__init__.py`:
   ```python
   from .my_provider_client import MyProviderClient
   ```

3. **Register the provider** in `src/api.py`:
   ```python
   from ai_integration import MyProviderClient

   Provider = Literal["copilot", "gemini", "claude", "openai", "my_provider"]

   def get_client(provider: Provider):
       ...
       elif provider == "my_provider":
           return MyProviderClient(config)
   ```

4. **Add configuration** in `config/claude_config.yaml`:
   ```yaml
   my_provider:
     model: "my-model-name"
     max_tokens: 4096
     temperature: 0.3
   ```

5. **Add environment variable** to `.env.example`:
   ```
   MY_PROVIDER_API_KEY=
   ```

6. **Add tests** in `tests/test_ai_integration.py` following the existing test patterns.

---

## Running Tests

```bash
# Activate venv
source .venv/bin/activate

# All tests
python -m pytest tests/ -v

# Single file
python -m pytest tests/test_ai_integration.py -v

# With coverage report
python -m pytest tests/ --cov=src --cov-report=term-missing

# Stop on first failure
python -m pytest tests/ -x
```

Tests do **not** require API keys — they mock all AI provider calls.

Expected: **26 passed**.

---

## Reporting Bugs

Before opening a bug report, please search existing issues to avoid duplicates.

When filing a bug, include:

1. **Environment:**  
   - OS (macOS, Linux, Windows)
   - Python version (`python --version`)
   - Node.js version (`node --version`)
   - Browser + version (if frontend issue)

2. **Steps to reproduce** — be as specific as possible

3. **Expected behavior**

4. **Actual behavior** — include the full error message and stack trace

5. **Minimal reproduction case** — a small dataset + specific steps if possible

Label your issue `bug`.

---

## Suggesting Features

Open an issue labeled `enhancement` and describe:

- **The problem you want to solve** — not just the solution
- **Your proposed solution** (optional — an open discussion is fine too)
- **Alternatives you considered**
- **Mockups or diagrams** if it's a visual feature

Feature requests with a working proof-of-concept PR tend to ship fastest.

---

## Questions?

Open a [GitHub Discussion](https://github.com/suhasgr09/Jasus-Viz-AI-Lib/discussions) for questions, ideas, or anything that isn't a bug report or feature request.
