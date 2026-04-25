/**
 * TableRelationshipMap.tsx
 * ─────────────────────────
 * SVG visualisation of a multi-table data model — table cards connected by
 * foreign-key / join relationship bezier lines.
 *
 * Exports (public API):
 *   RelationshipEdge, MultiTableAnalysisResult, TableNodeInfo  — TS interfaces
 *   TableRelationshipMap   — SVG canvas
 *   RelationshipLegend     — small legend strip
 *   RelationshipMapCard    — full styled card wrapper
 */

import React from 'react';
import { CHART_COLORS } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

// ── Public types ───────────────────────────────────────────────────────────────

export interface RelationshipEdge {
  from_table: string;
  from_col: string;
  to_table: string;
  to_col: string;
  /** "one-to-one" | "one-to-many" | "many-to-many" */
  type: string;
  /** 0–1.  Values below 0.65 render as dashed lines. */
  confidence: number;
  label?: string;
}

export interface MultiTableAnalysisResult {
  relationships: RelationshipEdge[];
  primary_keys?: Record<string, string>;
  insights?: string[];
  recommendations: Array<{
    chart_type: string;
    reason: string;
    priority: number;
    tables_involved?: string[];
  }>;
  suggested_title?: string;
}

export interface TableNodeInfo {
  name: string;
  columns: string[];
  /** Maps column name → "numeric" | "categorical" | "datetime" | "unknown" */
  colTypes: Record<string, string>;
  rowCount: number;
}

// ── SVG layout constants ───────────────────────────────────────────────────────

const TW     = 210;    // table card width
const CH     = 22;     // column row height
const HH     = 40;     // card header height
const GAP_X  = 120;    // horizontal gap between cards
const PAD    = 24;     // canvas padding

function tableHeight(colCount: number) { return HH + colCount * CH + 12; }
function tableX(idx: number)           { return PAD + idx * (TW + GAP_X); }
function colCentreY(colIdx: number)    { return HH + colIdx * CH + CH / 2; }

// ── Column type visual helpers ─────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  numeric:     '#38bdf8',
  categorical: '#a78bfa',
  datetime:    '#34d399',
  unknown:     '#475569',
};

const TYPE_BADGE: Record<string, string> = {
  numeric: 'N', categorical: 'C', datetime: 'D', unknown: '?',
};

// ── TableRelationshipMap ───────────────────────────────────────────────────────

export function TableRelationshipMap({
  tables,
  relationships,
  primaryKeys = {},
}: {
  tables: TableNodeInfo[];
  relationships: RelationshipEdge[];
  primaryKeys?: Record<string, string>;
}) {
  if (!tables.length) return null;

  const svgW = tables.length * (TW + GAP_X) - GAP_X + PAD * 2;
  const svgH = Math.max(...tables.map(t => tableHeight(t.columns.length))) + PAD * 2;

  /** Normalise a table name so "sales.csv" matches "sales" etc. */
  function normName(n: string) {
    return n.replace(/\.(csv|json)$/i, '').toLowerCase();
  }

  function findTableIdx(name: string): number {
    const norm = normName(name);
    return tables.findIndex(t => t.name === name || normName(t.name) === norm);
  }

  function findColIdx(tIdx: number, col: string): number {
    return tables[tIdx]?.columns.indexOf(col) ?? -1;
  }

  /** Absolute SVG y for a column anchor point (tables all start at y=PAD) */
  function absY(tIdx: number, cIdx: number): number {
    return PAD + colCentreY(cIdx);
  }

  return (
    <div style={{ overflowX: 'auto', background: '#080a10', borderRadius: 10, padding: 8 }}>
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>

        {/* ── Relationship bezier curves (drawn before cards so they're behind) ── */}
        {relationships.map((rel, ri) => {
          const fIdx = findTableIdx(rel.from_table);
          const tIdx = findTableIdx(rel.to_table);
          if (fIdx === -1 || tIdx === -1 || fIdx === tIdx) return null;

          const fCIdx = findColIdx(fIdx, rel.from_col);
          const tCIdx = findColIdx(tIdx, rel.to_col);
          if (fCIdx === -1 || tCIdx === -1) return null;

          // Always draw from the left table to the right table
          const [leftIdx, rightIdx, lCI, rCI] =
            fIdx < tIdx
              ? [fIdx, tIdx, fCIdx, tCIdx]
              : [tIdx, fIdx, tCIdx, fCIdx];

          const x1  = tableX(leftIdx) + TW;
          const y1  = absY(leftIdx, lCI);
          const x2  = tableX(rightIdx);
          const y2  = absY(rightIdx, rCI);
          const mx  = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          const color   = CHART_COLORS[ri % CHART_COLORS.length];
          const opacity = 0.25 + rel.confidence * 0.75;
          const dashed  = rel.confidence < 0.65 ? '6,3' : undefined;

          const midLabel =
            rel.from_col === rel.to_col ? rel.from_col : `${rel.from_col} ↔ ${rel.to_col}`;

          return (
            <g key={ri}>
              <path
                d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                stroke={color}
                strokeWidth={1.8}
                fill="none"
                opacity={opacity}
                strokeDasharray={dashed}
              />
              {/* Anchor dots */}
              <circle cx={x1} cy={y1} r={3.5} fill={color} opacity={opacity} />
              <circle cx={x2} cy={y2} r={3.5} fill={color} opacity={opacity} />
              {/* Mid-path label */}
              <text
                x={mx} y={midY - 6}
                textAnchor="middle"
                fill={color}
                fontSize={8.5}
                fontFamily="Menlo, monospace"
                opacity={opacity}
              >
                {midLabel.length > 26 ? midLabel.slice(0, 26) + '…' : midLabel}
              </text>
              <text
                x={mx} y={midY + 6}
                textAnchor="middle"
                fill="#475569"
                fontSize={7.5}
                opacity={opacity}
              >
                {rel.type} · {Math.round(rel.confidence * 100)}%
              </text>
            </g>
          );
        })}

        {/* ── Table cards ── */}
        {tables.map((table, ti) => {
          const x = tableX(ti);
          const y = PAD;
          const h = tableHeight(table.columns.length);
          const accentColor = CHART_COLORS[ti % CHART_COLORS.length];

          // Look up primary key for this table (try with & without extension)
          const pk =
            primaryKeys[table.name] ??
            primaryKeys[table.name.replace(/\.(csv|json)$/i, '')];

          // Which columns are involved in relationships?
          const linkedCols = new Set<string>(
            relationships.flatMap(r => {
              const res: string[] = [];
              if (findTableIdx(r.from_table) === ti) res.push(r.from_col);
              if (findTableIdx(r.to_table) === ti)   res.push(r.to_col);
              return res;
            }),
          );

          return (
            <g key={ti} transform={`translate(${x}, ${y})`}>
              {/* Drop shadow */}
              <rect x={3} y={3} width={TW} height={h} rx={9} fill="#000" opacity={0.35} />
              {/* Card body */}
              <rect x={0} y={0} width={TW} height={h} rx={9}
                fill="#1a1d27" stroke="#2d3148" strokeWidth={1} />
              {/* Header fill */}
              <rect x={0} y={0} width={TW} height={HH} rx={9}
                fill={`${accentColor}1a`}
                stroke={`${accentColor}44`} strokeWidth={1} />
              {/* Flatten rounded corners at the bottom of the header */}
              <rect x={0} y={HH - 9} width={TW} height={9}
                fill={`${accentColor}1a`} />

              {/* Table name */}
              <text
                x={TW / 2} y={17}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize={11.5}
                fontWeight={700}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {table.name.length > 26 ? table.name.slice(0, 26) + '…' : table.name}
              </text>
              <text x={TW / 2} y={30} textAnchor="middle" fill="#475569" fontSize={8.5}>
                {table.rowCount.toLocaleString()} rows · {table.columns.length} cols
              </text>

              {/* Column rows */}
              {table.columns.map((col, ci) => {
                const ct     = table.colTypes[col] ?? 'unknown';
                const clr    = TYPE_COLOR[ct] ?? '#475569';
                const badge  = TYPE_BADGE[ct] ?? '?';
                const rowY   = HH + ci * CH;
                const isLink = linkedCols.has(col);
                const isPK   = pk === col;

                return (
                  <g key={ci}>
                    {/* Row highlight for linked / PK columns */}
                    {(isLink || isPK) && (
                      <rect
                        x={1} y={rowY} width={TW - 2} height={CH}
                        fill={isPK ? '#f59e0b10' : '#6c63ff14'}
                        rx={3}
                      />
                    )}
                    {/* Type badge circle */}
                    <circle cx={14} cy={rowY + CH / 2} r={5}
                      fill={`${clr}22`} stroke={clr} strokeWidth={1} />
                    <text
                      x={14} y={rowY + CH / 2 + 3.5}
                      textAnchor="middle"
                      fill={clr}
                      fontSize={6.5}
                      fontWeight={700}
                      fontFamily="Menlo, monospace"
                    >
                      {badge}
                    </text>
                    {/* PK / FK icon */}
                    {isPK && (
                      <text x={25} y={rowY + CH / 2 + 3.5} fill="#f59e0b" fontSize={8}>🔑</text>
                    )}
                    {isLink && !isPK && (
                      <text x={25} y={rowY + CH / 2 + 4} fill="#7c6af7" fontSize={11} fontWeight={700}>⇌</text>
                    )}
                    {/* Column name */}
                    <text
                      x={isPK || isLink ? 38 : 26}
                      y={rowY + CH / 2 + 3.5}
                      fill={isLink || isPK ? '#e2e8f0' : '#94a3b8'}
                      fontSize={10}
                      fontWeight={isLink ? 600 : 400}
                    >
                      {col.length > 22 ? col.slice(0, 22) + '…' : col}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────

export function RelationshipLegend() {
  const items = [
    { symbol: '⇌', color: '#7c6af7', label: 'Join / FK column' },
    { symbol: '🔑', color: '#f59e0b', label: 'Primary key' },
    { symbol: '●', color: '#38bdf8', label: 'Numeric (N)' },
    { symbol: '●', color: '#a78bfa', label: 'Categorical (C)' },
    { symbol: '●', color: '#34d399', label: 'DateTime (D)' },
    { symbol: '—', color: '#94a3b8', label: 'High confidence' },
    { symbol: '- -', color: '#475569', label: 'Inferred (<65%)' },
  ];

  return (
    <div style={{
      display: 'flex', gap: 18, flexWrap: 'wrap',
      marginTop: 12, fontSize: '0.72rem', color: '#64748b',
    }}>
      {items.map(({ symbol, color, label }) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color }}>{symbol}</span>
          {label}
        </span>
      ))}
    </div>
  );
}

// ── RelationshipMapCard ────────────────────────────────────────────────────────

export function RelationshipMapCard({
  tables,
  result,
}: {
  tables: TableNodeInfo[];
  result: MultiTableAnalysisResult;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Map card */}
      <div style={chartCard}>
        <div style={chartTitle}>Table Relationship Map</div>
        <div style={chartSubtitle}>
          {result.suggested_title
            ? `${result.suggested_title} · ${result.relationships.length} relationship(s)`
            : `${tables.length} tables · ${result.relationships.length} relationship(s) detected`}
        </div>
        <div style={{ marginTop: 14 }}>
          <TableRelationshipMap
            tables={tables}
            relationships={result.relationships}
            primaryKeys={result.primary_keys}
          />
        </div>
        <RelationshipLegend />
      </div>

      {/* Insights */}
      {result.insights && result.insights.length > 0 && (
        <div style={chartCard}>
          <div style={chartTitle}>Data Model Insights</div>
          <div style={chartSubtitle}>Copilot observations about the combined dataset</div>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.insights.map((ins, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 700, flexShrink: 0 }}>›</span>
                <span style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.5 }}>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cross-table visual recommendations */}
      {result.recommendations.length > 0 && (
        <div style={chartCard}>
          <div style={chartTitle}>Cross-Table Chart Recommendations</div>
          <div style={chartSubtitle}>Suggested visualisations for the joined dataset</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[...result.recommendations]
              .sort((a, b) => a.priority - b.priority)
              .map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 14px',
                    background: '#0f1117',
                    borderRadius: 8,
                    border: '1px solid #2d3148',
                  }}
                >
                  <span style={{
                    minWidth: 22, height: 22, borderRadius: '50%',
                    background: `${CHART_COLORS[i % CHART_COLORS.length]}33`,
                    border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                    flexShrink: 0,
                  }}>
                    {r.priority}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.88rem' }}>
                      {r.chart_type}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>
                      {r.reason}
                    </div>
                    {r.tables_involved && r.tables_involved.length > 0 && (
                      <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.tables_involved.map(t => (
                          <span
                            key={t}
                            style={{
                              background: '#6c63ff1a',
                              border: '1px solid #6c63ff44',
                              borderRadius: 4,
                              padding: '1px 8px',
                              fontSize: '0.68rem',
                              color: '#a78bfa',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
