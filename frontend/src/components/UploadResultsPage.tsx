import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR, TITLE_COLOR } from '../utils/colors';
import { makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

// ── Small bar chart that renders one numeric col grouped by one categorical col ──
function AutoBarChart({
  records,
  numCol,
  catCol,
  index,
}: {
  records: Record<string, any>[];
  numCol: string;
  catCol: string;
  index: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const byGroup = d3.rollup(records, v => d3.sum(v, d => +d[numCol] || 0), d => String(d[catCol]));
    const chartData = Array.from(byGroup, ([label, value]) => ({ label, value }))
      .filter(d => d.value !== 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    if (!chartData.length) return;

    const W = 480, H = 280;
    const margin = { top: 16, right: 16, bottom: 52, left: 72 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .style('width', '100%')
      .style('height', 'auto');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(chartData.map(d => d.label)).range([0, w]).padding(0.28);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value)! * 1.12]).range([h, 0]);

    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(() => ''))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('stroke-dasharray', '3,3'));

    const color = CHART_COLORS[index % CHART_COLORS.length];

    g.selectAll('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label)!)
      .attr('width', x.bandwidth())
      .attr('y', h)
      .attr('height', 0)
      .attr('rx', 3)
      .attr('fill', color)
      .attr('opacity', 0.82)
      .style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', 'rgba(255,255,255,0.3)').attr('stroke-width', 1.5);
        show(tipHtml(d.label, [[numCol, fmt(d.value)]], color), event.clientX, event.clientY);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.82).attr('stroke', 'none');
        hide();
      })
      .transition().duration(600).delay((_, i) => i * 50)
      .attr('y', d => y(d.value))
      .attr('height', d => h - y(d.value));

    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', 10)
        .attr('dy', '1.2em')
        .attr('transform', chartData.length > 8 ? 'rotate(-35)' : null)
        .style('text-anchor', chartData.length > 8 ? 'end' : 'middle'));

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => {
        const n = +d;
        return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
          : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k`
          : String(n);
      }))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
  }, [records, numCol, catCol, index]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{numCol} by {catCol}</div>
      <div style={chartSubtitle}>Aggregated sum · top 20 groups</div>
      <svg ref={svgRef} />
      <div ref={tipRef} />
    </div>
  );
}

// ── Summary stats card ──────────────────────────────────────────────────────
function SummaryStats({
  numericSummaries,
}: {
  numericSummaries: Record<string, { min: number; max: number; mean: number }>;
}) {
  const entries = Object.entries(numericSummaries);
  if (!entries.length) return null;
  return (
    <div style={chartCard}>
      <div style={chartTitle}>Numeric Column Summaries</div>
      <div style={chartSubtitle}>Min · Max · Mean across all rows</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
        {entries.map(([col, stats], i) => (
          <div key={col} style={{
            background: '#0f1117',
            border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}44`,
            borderRadius: 8,
            padding: '12px 14px',
          }}>
            <div style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 600, fontSize: '0.82rem', marginBottom: 8 }}>
              {col}
            </div>
            {[['Min', stats.min], ['Max', stats.max], ['Mean', stats.mean]].map(([label, val]) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ color: TEXT_COLOR }}>{fmt(+val)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI insights card ────────────────────────────────────────────────────────
function AIInsightsCard({ insights }: { insights: string[] }) {
  return (
    <div style={chartCard}>
      <div style={chartTitle}>AI Insights</div>
      <div style={chartSubtitle}>Generated from your dataset</div>
      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((ins, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 700, marginTop: 1 }}>›</span>
            <span style={{ color: TEXT_COLOR, fontSize: '0.85rem', lineHeight: 1.5 }}>{ins}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── AI recommendations card ─────────────────────────────────────────────────
function RecommendationsCard({
  recommendations,
}: {
  recommendations: { chart_type: string; reason: string; priority: number }[];
}) {
  const sorted = [...recommendations].sort((a, b) => b.priority - a.priority);
  return (
    <div style={chartCard}>
      <div style={chartTitle}>Recommended Chart Types</div>
      <div style={chartSubtitle}>AI-suggested visualizations for your data</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {sorted.map((rec, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 12px', background: '#0f1117', borderRadius: 8,
            border: `1px solid ${GRID_COLOR}`,
          }}>
            <span style={{
              background: CHART_COLORS[i % CHART_COLORS.length] + '22',
              color: CHART_COLORS[i % CHART_COLORS.length],
              borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700,
              whiteSpace: 'nowrap', marginTop: 1,
            }}>
              {rec.chart_type}
            </span>
            <span style={{ color: TEXT_COLOR, fontSize: '0.82rem', lineHeight: 1.5 }}>{rec.reason}</span>
            <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              P{rec.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Data table ──────────────────────────────────────────────────────────────
function DataTable({ records, columns }: { records: Record<string, any>[]; columns: string[] }) {
  const shown = records.slice(0, 100);
  return (
    <div style={chartCard}>
      <div style={chartTitle}>Data Preview</div>
      <div style={chartSubtitle}>First {shown.length} of {records.length} rows</div>
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{
                  padding: '7px 12px', textAlign: 'left',
                  borderBottom: `1px solid ${GRID_COLOR}`,
                  color: '#a78bfa', fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#0f1117' }}>
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '6px 12px', color: TEXT_COLOR,
                    borderBottom: `1px solid ${GRID_COLOR}22`,
                    whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {row[col] == null ? <span style={{ color: '#475569' }}>—</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function UploadResultsPage() {
  const { result } = useUpload();
  const navigate = useNavigate();

  if (!result) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: TITLE_COLOR, fontSize: '1.1rem', marginBottom: 12 }}>No upload data yet</div>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 24 }}>
          Upload a CSV or JSON file using the panel on the left to generate visualizations.
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#6c63ff', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Go to Charts
        </button>
      </div>
    );
  }

  const { viz_data, ai_insights, fileName } = result;
  const { records, meta, numeric_summaries } = viz_data;

  // Pick categorical columns (string/boolean columns with < 50 unique values)
  const catCols = meta.columns.filter(col => {
    if (col in numeric_summaries) return false;
    const unique = new Set(records.map(r => r[col])).size;
    return unique > 1 && unique <= 50;
  });
  const numCols = Object.keys(numeric_summaries);

  // Generate chart pairs: each numeric col paired with first categorical col
  const chartPairs: { numCol: string; catCol: string }[] = [];
  if (catCols.length > 0) {
    numCols.forEach(numCol => {
      chartPairs.push({ numCol, catCol: catCols[0] });
    });
    // If multiple cat cols, also chart the first numeric with each cat
    if (numCols.length > 0) {
      catCols.slice(1).forEach(catCol => {
        chartPairs.push({ numCol: numCols[0], catCol });
      });
    }
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: TITLE_COLOR, fontSize: '1.3rem', fontWeight: 700 }}>
          {ai_insights.suggested_title ?? fileName}
        </div>
        <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>
          {meta.row_count.toLocaleString()} rows · {meta.columns.length} columns · {fileName}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* AI insights */}
        {ai_insights.insights && ai_insights.insights.length > 0 && (
          <AIInsightsCard insights={ai_insights.insights} />
        )}

        {/* AI recommendations */}
        {ai_insights.recommendations && ai_insights.recommendations.length > 0 && (
          <RecommendationsCard recommendations={ai_insights.recommendations} />
        )}

        {/* Numeric summaries */}
        {Object.keys(numeric_summaries).length > 0 && (
          <SummaryStats numericSummaries={numeric_summaries} />
        )}

        {/* Auto-generated bar charts */}
        {chartPairs.length > 0 && (
          <div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              Auto-generated charts
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 16 }}>
              {chartPairs.map((pair, i) => (
                <AutoBarChart
                  key={`${pair.numCol}-${pair.catCol}`}
                  records={records}
                  numCol={pair.numCol}
                  catCol={pair.catCol}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* If no categorical cols, just show the summary stats table with no charts */}
        {chartPairs.length === 0 && numCols.length === 0 && (
          <div style={{ ...chartCard, color: '#64748b', fontSize: '0.85rem' }}>
            No numeric columns detected — cannot auto-generate charts. Check the data preview below.
          </div>
        )}

        {/* Data table */}
        <DataTable records={records} columns={meta.columns} />
      </div>
    </div>
  );
}
