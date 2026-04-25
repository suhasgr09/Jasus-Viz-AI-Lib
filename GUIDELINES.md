# Development Guidelines

This document defines the standards and conventions used across the jasus-viz-AI-lib codebase. All contributors are expected to follow these guidelines — they exist to keep the codebase consistent, reviewable, and safe to contribute to at any scale.

## Table of Contents

- [General Principles](#general-principles)
- [Python Standards](#python-standards)
- [TypeScript / React Standards](#typescript--react-standards)
- [D3 Chart Standards](#d3-chart-standards)
- [AI Integration Standards](#ai-integration-standards)
- [API Design Standards](#api-design-standards)
- [Security Guidelines](#security-guidelines)
- [Testing Standards](#testing-standards)
- [Performance Guidelines](#performance-guidelines)
- [Documentation Standards](#documentation-standards)
- [CSS / Styling](#css--styling)

---

## General Principles

1. **Correctness over cleverness.** Code that is easy to debug is better than code that is clever. Do not over-engineer.

2. **Explicit over implicit.** Type annotations, named variables, and direct code paths beat implicit magic.

3. **Narrow scope.** Each function does one thing. Each PR addresses one concern. Each module owns one layer of the stack.

4. **AI is an assistant, not a source of truth.** All AI provider responses must be validated and defensively parsed before use. Never trust raw LLM output directly.

5. **Security first.** No secrets in code. No unsanitized user input reaching the shell or eval. See [Security Guidelines](#security-guidelines).

---

## Python Standards

### Style and formatting

- **Python 3.12+** — use modern syntax (`match`, `walrus operator`, `|` union types).
- **Black** for formatting (88-char line length). Run `black src/` before committing.
- **ruff** for linting. Run `ruff check src/` before committing.
- **snake_case** for variables, functions, and modules.
- **PascalCase** for classes.
- **UPPER_SNAKE_CASE** for module-level constants.

### Type hints

All public functions must have complete type annotations:

```python
# Good
def process_dataframe(df: pd.DataFrame, schema: dict[str, Any]) -> dict[str, Any]:
    ...

# Bad — missing annotations
def process_dataframe(df, schema):
    ...
```

Use `from __future__ import annotations` for forward references. Prefer `X | None` over `Optional[X]`.

### Docstrings

All public functions and classes must have a docstring. Use the Google style:

```python
def infer_from_dataframe(self, df: pd.DataFrame) -> dict[str, Any]:
    """Infer a JSON schema from a pandas DataFrame.

    Args:
        df: The input DataFrame. Must have at least one row.

    Returns:
        A schema dict with a 'fields' list, where each field has:
        'name', 'type' (string|numeric|datetime|boolean), and optional 'nullable'.

    Raises:
        ValueError: If the DataFrame is empty.
    """
```

### Error handling

- Raise specific exceptions (`ValueError`, `TypeError`, `KeyError`) rather than `Exception`.
- Only catch exceptions you can recover from. Do not swallow errors silently.
- Log errors with context before re-raising: `logger.error("Failed to parse response: %s", e)`.
- Backend API errors should return structured JSON: `{"error": "human-readable message", "detail": "..."}`.

### Module structure

Each Python package (`schema_processor/`, `data_engine/`, `ai_integration/`) must:
- Export its public API in `__init__.py`
- Keep private helpers prefixed with `_`
- Have no circular imports

---

## TypeScript / React Standards

### Style

- **TypeScript strict mode** is enabled (`tsconfig.json`). All code must pass `tsc` with no errors.
- **Functional components only** — no class components.
- **camelCase** for variables and functions; **PascalCase** for component names and interfaces.
- **Do not use `any`** unless absolutely unavoidable. Use `unknown` + narrowing instead.
- **Interfaces over type aliases** for object shapes (allows type merging and better error messages).

### Component structure

```tsx
// 1. Imports
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import styles from './MyComponent.module.css';

// 2. Interface definitions
interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  title?: string;
}

// 3. Component
const MyComponent: React.FC<Props> = ({ data, title = 'Chart' }) => {
  // 4. Hooks at the top
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 5. Effects
  useEffect(() => {
    // D3 rendering
  }, [data]);

  // 6. Render
  return <svg ref={svgRef} />;
};

export default MyComponent;
```

### State management

- Use **React Context** (`context/UploadContext.tsx`) for shared cross-page state.
- Prefer `useReducer` over many `useState` calls for complex local state.
- Do not use external state libraries unless the complexity demonstrably justifies it.

### API calls

All backend calls must go through `axios` with explicit error handling:

```tsx
try {
  const { data } = await axios.post<AnalysisResult>('/api/multi-table/analyze', payload);
  setResult(data);
} catch (err) {
  const message = axios.isAxiosError(err) ? err.response?.data?.error : 'Unknown error';
  setError(message ?? 'Request failed');
}
```

Never expose raw error objects to the user.

---

## D3 Chart Standards

Every chart in `frontend/src/d3-charts/` must follow these requirements:

### Required features

| Requirement | Implementation notes |
|-------------|---------------------|
| **Responsive `viewBox`** | `<svg viewBox="0 0 {width} {height}">` — do NOT hard-code pixel dimensions |
| **D3 tooltips** | Use `createTooltip()` from `utils/tooltipHelpers.ts` |
| **Enter transition** | Minimum 300 ms enter animation (bars slide up, lines draw on, arcs sweep in) |
| **Color palette** | Use `CHART_COLORS` from `utils/colors.ts` — do not hard-code hex values |
| **Cleanup on re-render** | `svg.selectAll('*').remove()` at the start of every `useEffect` |
| **Empty state** | Render a "No data available" message if `data.length === 0` |

### Tooltip pattern

```tsx
import { createTooltip, showTooltip, hideTooltip } from '../utils/tooltipHelpers';

useEffect(() => {
  const tooltip = createTooltip();

  svg.selectAll('.bar')
    .on('mouseover', (event, d) => showTooltip(tooltip, event, `${d.label}: ${d.value}`))
    .on('mouseout', () => hideTooltip(tooltip));

  return () => tooltip.remove();  // cleanup
}, [data]);
```

### Color usage

```tsx
import { CHART_COLORS, ACCENT_COLOR } from '../utils/colors';

// Use palette colors by index for categorical data
const color = d3.scaleOrdinal().range(CHART_COLORS);

// Use ACCENT_COLOR for single-series highlights
```

### D3 version

Always import from `d3` (the meta-package, v7). Do not import from sub-packages like `d3-scale` or `d3-selection` directly — this avoids version conflicts.

### Performance

- For datasets > 500 rows, implement **data aggregation** before rendering. Do not bind 10,000 SVG elements.
- Use `d3.rollup` or `d3.groups` for aggregation.
- For animated transitions, use `requestAnimationFrame` via `transition().duration()` — never `setTimeout`.

---

## AI Integration Standards

### Client interface contract

All AI clients must implement this interface (implicit via duck typing):

```python
class BaseAIClient:
    def analyze(self, data: dict) -> dict:
        """
        Accepts a compact dataset summary dict.
        Must return:
          {
            "recommendations": [{"chart_type": str, "reason": str, "priority": int}],
            "insights": [str],
            "suggested_title": str
          }
        """

    def analyze_multi_table(self, tables: list[dict]) -> dict:
        """
        Accepts a list of table summary dicts.
        Must return:
          {
            "relationships": [...],
            "primary_keys": {...},
            "insights": [...],
            "recommendations": [...],
            "suggested_title": str
          }
        """
```

### Prompt engineering rules

1. **Always request JSON output explicitly** — include "Return valid JSON only" in every system prompt.
2. **Specify the exact output schema** in the prompt — include field names and types with an example.
3. **Set temperature ≤ 0.3** for structured output tasks — higher values produce less consistent JSON.
4. **Cap `max_tokens` at 4096** for normal analysis; increase only for multi-table with many relationship edges.

### Response parsing

Use `response_parser.py` for all JSON extraction from LLM responses. Never use `json.loads()` directly on raw model output:

```python
from ai_integration.response_parser import ResponseParser

parser = ResponseParser()
result = parser.extract_json(raw_text)   # handles markdown fences, partial JSON, etc.
```

### Error handling

All client methods must:
1. Catch API errors and re-raise as `RuntimeError` with a human-readable message
2. Validate that the extracted JSON has the required top-level keys before returning
3. Return safe defaults (empty lists) if optional fields are missing — never `None` for array fields

---

## API Design Standards

### URL structure

- All API routes are prefixed with `/api/`
- Use nouns for resources: `/api/sample-data/{dataset}`, `/api/insights`
- Use POST for analysis operations (they may carry large payloads)

### Provider selection

The `provider` query parameter is used consistently across all `/api/*` endpoints:

```
POST /api/insights?provider=copilot
POST /api/multi-table/analyze?provider=gemini
```

The default provider is `gemini`. Add new providers to the `Provider` literal type in `api.py`.

### Response shapes

**Success:**
```json
{ "field1": "...", "field2": [...] }
```

**Error:**
```json
{ "error": "Short description", "detail": "Full error message or stack context" }
```

Always return HTTP 422 for validation errors and HTTP 500 for unexpected server errors. Use FastAPI's `HTTPException` with explicit status codes.

### File uploads

- Accept only `text/csv` and `application/json` — validate the content type server-side via `python-multipart`.
- Cap upload size at 50 MB (configurable via environment variable).
- Never execute user-uploaded content. Only pass it to `PandasProcessor.load_and_process()`.

---

## Security Guidelines

These are non-negotiable requirements for all code in this repository.

### Secrets management

- **Never commit API keys, tokens, or credentials** — not even in comments or test files.
- All secrets must come from environment variables loaded via `.env`.
- The `.env` file is in `.gitignore` — never add it to the repository.
- Rotate any key that is accidentally committed immediately.

### Input sanitization

- All user-uploaded file content must pass through `PandasProcessor` before any other processing.
- Never call `eval()`, `exec()`, or `subprocess` on user input.
- Never pass user-supplied strings to shell commands.
- Validate file MIME types server-side, not just by extension.

### Dependency hygiene

- Pin major dependency versions in `requirements.txt` and `package.json`.
- Run `pip audit` and `npm audit` regularly — fix HIGH/CRITICAL findings before merging.
- Do not add new dependencies without evaluating their maintenance status and license.

### Frontend XSS

- Never use `dangerouslySetInnerHTML` unless the content is provably static and does not originate from user input.
- Sanitize any chart labels or data values before inserting them into the DOM via D3's `.text()` method (D3 `.text()` is safe; `.html()` is not — prefer `.text()`).

### SSRF

- The backend must not make outbound HTTP requests to URLs derived from user input.
- AI client SDK calls go to known provider endpoints only — do not construct URLs from user data.

---

## Testing Standards

### Coverage

| Module | Minimum requirement |
|--------|---------------------|
| `schema_processor/` | All public methods |
| `data_engine/` | All public methods |
| `ai_integration/` | All client `analyze()` and `analyze_multi_table()` methods |
| `api.py` | All route handlers via `TestClient` |

### Test style

```python
# Use descriptive function names
def test_schema_parser_infers_numeric_column_from_float_values():
    ...

def test_relationship_mapper_returns_empty_graph_for_no_fk_notation():
    ...

# Mock AI clients — tests must not make real API calls
from unittest.mock import MagicMock, patch

def test_copilot_client_analyze_returns_required_keys():
    with patch("ai_integration.copilot_client.OpenAI") as mock_openai:
        mock_openai.return_value.chat.completions.create.return_value = ...
        client = CopilotClient(config)
        result = client.analyze(sample_data)
        assert "recommendations" in result
        assert "insights" in result
```

### What to test

- **Happy path** for each public method
- **Edge cases**: empty DataFrame, null column values, missing schema keys
- **Error paths**: invalid file type, malformed AI response JSON

### What not to test

- Third-party library internals (pandas, D3, FastAPI)
- Private methods prefixed with `_`
- Configuration file loading (test the behavior, not the YAML parsing)

---

## Performance Guidelines

### Backend

- `PandasProcessor` operations must run without blocking the FastAPI event loop. Wrap CPU-heavy operations in `asyncio.to_thread()` if needed.
- Cap the number of sample rows sent to AI at 10 rows — AI prompt cost grows with token count, not dataset size.
- Use `df.head(10)` in `JSONGenerator.for_ai_prompts()` — never send the full DataFrame to the AI.

### D3 / Frontend

- Never bind more than **2,000 SVG elements**. Aggregate before rendering.
- Use `useMemo` for expensive data transformations in React components.
- Avoid layout thrashing — do not mix D3 DOM reads and writes in the same synchronous block.
- Debounce resize handlers with a 150 ms delay.

### Network

- API payloads should not exceed 1 MB. Summarize data server-side before returning.
- Use `axios` request cancellation (`AbortController`) for AI analysis calls that may take > 5 s.

---

## Documentation Standards

### Python

- All public functions: Google-style docstring with `Args`, `Returns`, and `Raises` sections.
- Complex algorithms: inline comment explaining *why*, not *what*.
- Module-level docstring describing the module's responsibility.

### TypeScript

- All exported functions and hooks: JSDoc comment.
- Complex D3 logic: inline comment explaining the D3 idiom being used.
- Interface fields: inline comment if the meaning is not obvious from the name.

```typescript
/** Returns a D3 tooltip div attached to document.body. Call `.remove()` in useEffect cleanup. */
export function createTooltip(): d3.Selection<HTMLDivElement, unknown, HTMLElement, undefined> {
  ...
}
```

### README and docs

- All new API endpoints must be documented in `README.md` with a request payload example and response shape.
- New D3 charts must be added to the visualizations table in `README.md`.
- New AI providers must be added to the environment variables table.

---

## CSS / Styling

- Use **CSS Modules** (`*.module.css`) for component-scoped styles.
- Global styles live in `index.css` only — do not add global rules elsewhere.
- Use CSS custom properties (variables) for colors and spacing — do not hard-code values in component CSS.
- The design system is dark-first. All new components must look correct on the dark background (`#0d1117`).
- Do not use inline `style={{}}` props for anything beyond dynamic computed values (e.g., chart dimensions).
