/**
 * DataVisuals.tsx
 * ---------------
 * Data-driven D3 chart components + schema inference for the Copilot visual generator.
 * Every chart accepts raw `records` (array of row objects) and explicit column names
 * so it can render any user-uploaded dataset, not just the hard-coded sample data.
 */

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface DataSchema {
  numericCols: string[];
  catCols: string[];
  dateCols: string[];
  allCols: string[];
}

export interface Recommendation {
  chart_type: string;
  reason: string;
  priority: number;
}

// ── Schema inference ──────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/** Inspect up to 100 sample rows to classify each column as numeric / datetime / categorical. */
export function inferSchema(records: Record<string, any>[]): DataSchema {
  if (!records.length) return { numericCols: [], catCols: [], dateCols: [], allCols: [] };

  const allCols = Object.keys(records[0]);
  const numericCols: string[] = [];
  const dateCols: string[] = [];
  const catCols: string[] = [];

  for (const col of allCols) {
    const sample = records
      .slice(0, 100)
      .map(r => r[col])
      .filter(v => v != null && v !== '');

    if (!sample.length) continue;

    if (
      sample.every(
        v => typeof v === 'number' ||
          (typeof v === 'string' && v.trim() !== '' && !isNaN(+v)),
      )
    ) {
      numericCols.push(col);
    } else if (sample.every(v => typeof v === 'string' && DATE_RE.test(v))) {
      dateCols.push(col);
    } else {
      const unique = new Set(records.map(r => r[col])).size;
      if (unique > 1 && unique <= Math.max(50, records.length * 0.3)) {
        catCols.push(col);
      }
    }
  }

  return { numericCols, catCols, dateCols, allCols };
}

// ── Schema display card ───────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  numeric:     { bg: '#0c2a3b', color: '#38bdf8', label: 'NUM' },
  categorical: { bg: '#1c1a3b', color: '#a78bfa', label: 'CAT' },
  datetime:    { bg: '#0c2a1f', color: '#34d399', label: 'DATE' },
  unknown:     { bg: '#1e1e2e', color: '#64748b', label: '?' },
};

export function SchemaDisplay({ schema }: { schema: DataSchema }) {
  const typeOf = (col: string) => {
    if (schema.numericCols.includes(col)) return 'numeric';
    if (schema.catCols.includes(col)) return 'categorical';
    if (schema.dateCols.includes(col)) return 'datetime';
    return 'unknown';
  };

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Inferred Schema</div>
      <div style={chartSubtitle}>Column types auto-detected from your data</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {schema.allCols.map(col => {
          const s = TYPE_BADGE[typeOf(col)];
          return (
            <div key={col} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 20,
              background: s.bg, border: `1px solid ${s.color}44`,
            }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: 0.5,
                color: s.color, fontFamily: 'Menlo, monospace',
              }}>{s.label}</span>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{col}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 14, fontSize: '0.76rem', color: '#64748b' }}>
        <span><span style={{ color: '#38bdf8', fontWeight: 700 }}>{schema.numericCols.length}</span> numeric</span>
        <span><span style={{ color: '#a78bfa', fontWeight: 700 }}>{schema.catCols.length}</span> categorical</span>
        <span><span style={{ color: '#34d399', fontWeight: 700 }}>{schema.dateCols.length}</span> datetime</span>
        <span style={{ marginLeft: 'auto' }}>{schema.allCols.length} total columns</span>
      </div>
    </div>
  );
}

// ── Shared tick-format helper ─────────────────────────────────────────────────

function compactNum(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k`
    : String(Math.round(n));
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

export function DataBarChart({
  records, numCol, catCol, colorIndex = 0, title, subtitle,
}: {
  records: Record<string, any>[];
  numCol: string; catCol: string;
  colorIndex?: number; title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const byGroup = d3.rollup(
      records,
      v => d3.sum(v, d => +d[numCol] || 0),
      d => String(d[catCol]),
    );
    const data = Array.from(byGroup, ([label, value]) => ({ label, value }))
      .filter(d => d.value !== 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
    if (!data.length) return;

    const W = 520, H = 310, m = { top: 16, right: 16, bottom: 58, left: 70 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, w]).padding(0.28);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)! * 1.12]).range([h, 0]);
    const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(() => ''))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('stroke-dasharray', '3,3'));

    g.selectAll('.bar').data(data).join('rect')
      .attr('x', d => x(d.label)!).attr('width', x.bandwidth())
      .attr('y', h).attr('height', 0).attr('rx', 3)
      .attr('fill', color).attr('opacity', 0.82).style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', 'rgba(255,255,255,0.3)').attr('stroke-width', 1.5);
        show(tipHtml(d.label, [[numCol, fmt(d.value)]], color), event.clientX, event.clientY);
      })
      .on('mouseleave', function () { d3.select(this).attr('opacity', 0.82).attr('stroke', 'none'); hide(); })
      .transition().duration(580).delay((_, i) => i * 35)
      .attr('y', d => y(d.value)).attr('height', d => h - y(d.value));

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text')
        .attr('fill', TEXT_COLOR).attr('font-size', 10).attr('dy', '1.2em')
        .attr('transform', data.length > 7 ? 'rotate(-35)' : null)
        .style('text-anchor', data.length > 7 ? 'end' : 'middle'));

    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => compactNum(+d)))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
  }, [records, numCol, catCol, colorIndex]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${numCol} by ${catCol}`}</div>
      <div style={chartSubtitle}>{subtitle ?? 'Aggregated sum · bar chart'}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Line / time-series chart ────────────────────────────────────────────────

export function DataLineChart({
  records, numCol, dateCol, catCol, colorIndex = 0, title, subtitle,
}: {
  records: Record<string, any>[];
  numCol: string; dateCol?: string; catCol?: string;
  colorIndex?: number; title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    type Pt = { label: string; value: number };
    let data: Pt[] = [];

    if (dateCol) {
      const grouped = d3.rollup(
        records,
        v => d3.sum(v, d => +d[numCol] || 0),
        d => String(d[dateCol]).slice(0, 7),
      );
      data = Array.from(grouped, ([m, value]) => ({ label: m, value }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } else if (catCol) {
      const grouped = d3.rollup(
        records,
        v => d3.sum(v, d => +d[numCol] || 0),
        d => String(d[catCol]),
      );
      data = Array.from(grouped, ([label, value]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    if (data.length < 2) return;

    const W = 580, H = 310, m = { top: 16, right: 20, bottom: 52, left: 70 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const xScale = d3.scalePoint<string>()
      .domain(data.map((_, i) => String(i)))
      .range([0, w]).padding(0.5);
    const xPos = (i: number) => xScale(String(i)) ?? 0;
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)! * 1.12]).range([h, 0]);
    const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(() => ''))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('stroke-dasharray', '3,3'));

    // Area fill
    g.append('path').datum(data)
      .attr('fill', `${color}22`)
      .attr('d', d3.area<Pt>()
        .x((_, i) => xPos(i)).y0(h).y1(d => y(d.value))
        .curve(d3.curveMonotoneX));

    // Line
    const path = g.append('path').datum(data)
      .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5)
      .attr('d', d3.line<Pt>().x((_, i) => xPos(i)).y(d => y(d.value)).curve(d3.curveMonotoneX));
    const len = (path.node() as SVGPathElement).getTotalLength();
    path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
      .transition().duration(1000).attr('stroke-dashoffset', 0);

    // Dots
    g.selectAll('.dot').data(data).join('circle').attr('class', 'dot')
      .attr('cx', (_, i) => xPos(i)).attr('cy', d => y(d.value))
      .attr('r', 4).attr('fill', color).attr('opacity', 0).style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1.5);
        show(tipHtml(d.label, [[numCol, fmt(d.value)]], color), event.clientX, event.clientY);
      })
      .on('mouseleave', function () { d3.select(this).attr('opacity', 0).attr('stroke', 'none'); hide(); })
      .transition().delay(950).attr('opacity', 0.85);

    // X axis — show every nth label to avoid crowding
    const step = Math.max(1, Math.ceil(data.length / 10));
    const tickVals = data.map((_, i) => String(i)).filter((_, i) => i % step === 0);
    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).tickValues(tickVals).tickFormat(v => data[+v]?.label ?? ''))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text')
        .attr('fill', TEXT_COLOR).attr('font-size', 9)
        .attr('transform', 'rotate(-30)').style('text-anchor', 'end'));

    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => compactNum(+d)))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
  }, [records, numCol, dateCol, catCol, colorIndex]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${numCol} trend`}</div>
      <div style={chartSubtitle}>{subtitle ?? (dateCol ? 'Monthly aggregation · line chart' : `By ${catCol} · line chart`)}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Scatter plot ──────────────────────────────────────────────────────────────

export function DataScatterPlot({
  records, xCol, yCol, colorCol, title, subtitle,
}: {
  records: Record<string, any>[];
  xCol: string; yCol: string; colorCol?: string;
  title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const sample = records.filter(r => r[xCol] != null && r[yCol] != null).slice(0, 600);
    if (sample.length < 4) return;

    const W = 540, H = 320, m = { top: 16, right: colorCol ? 96 : 20, bottom: 52, left: 70 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const xExt = d3.extent(sample, d => +d[xCol]) as [number, number];
    const yExt = d3.extent(sample, d => +d[yCol]) as [number, number];
    const x = d3.scaleLinear().domain([xExt[0] * 0.95, xExt[1] * 1.05]).range([0, w]);
    const y = d3.scaleLinear().domain([yExt[0] * 0.95, yExt[1] * 1.05]).range([h, 0]);

    const cats = colorCol ? [...new Set(sample.map(r => String(r[colorCol])))] : [];
    const cScale = d3.scaleOrdinal(CHART_COLORS).domain(cats);

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(() => ''))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('stroke-dasharray', '3,3'));

    g.selectAll('circle').data(sample).join('circle')
      .attr('cx', d => x(+d[xCol])).attr('cy', d => y(+d[yCol]))
      .attr('r', 4).attr('fill', d => colorCol ? cScale(String(d[colorCol])) : CHART_COLORS[0])
      .attr('opacity', 0.7).style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('r', 7).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1.5);
        const c = d3.select(this).attr('fill');
        const rows: [string, string][] = [[xCol, fmt(+d[xCol])], [yCol, fmt(+d[yCol])]];
        if (colorCol) rows.push([colorCol, String(d[colorCol])]);
        show(tipHtml(colorCol ? String(d[colorCol]) : xCol, rows, c), event.clientX, event.clientY);
      })
      .on('mouseleave', function () { d3.select(this).attr('r', 4).attr('opacity', 0.7).attr('stroke', 'none'); hide(); });

    // Regression line
    const xs = sample.map(d => +d[xCol]), ys = sample.map(d => +d[yCol]);
    const n = xs.length, sX = d3.sum(xs), sY = d3.sum(ys);
    const sXY = d3.sum(xs.map((v, i) => v * ys[i])), sX2 = d3.sum(xs.map(v => v * v));
    const slope = (n * sXY - sX * sY) / (n * sX2 - sX * sX);
    const intercept = (sY - slope * sX) / n;
    g.append('line')
      .attr('x1', x(xExt[0])).attr('y1', y(slope * xExt[0] + intercept))
      .attr('x2', x(xExt[1])).attr('y2', y(slope * xExt[1] + intercept))
      .attr('stroke', '#f59e0b').attr('stroke-width', 2).attr('stroke-dasharray', '6 3').attr('opacity', 0.8);

    // Legend
    if (colorCol && cats.length <= 10) {
      cats.forEach((c, i) => {
        g.append('circle').attr('cx', w + 8).attr('cy', i * 15).attr('r', 4).attr('fill', cScale(c));
        g.append('text').attr('x', w + 16).attr('y', i * 15 + 4)
          .attr('fill', TEXT_COLOR).attr('font-size', 9)
          .text(c.length > 11 ? c.slice(0, 11) + '…' : c);
      });
    }

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => compactNum(+d)))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));

    g.append('text').attr('x', w / 2).attr('y', h + 44).attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', 10).text(xCol);
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -55).attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', 10).text(yCol);
  }, [records, xCol, yCol, colorCol]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${xCol} vs ${yCol}`}</div>
      <div style={chartSubtitle}>{subtitle ?? 'Scatter plot with regression line'}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

export function DataHeatmap({
  records, xCatCol, yCatCol, numCol, title, subtitle,
}: {
  records: Record<string, any>[];
  xCatCol: string; yCatCol: string; numCol: string;
  title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const xVals = [...new Set(records.map(r => String(r[xCatCol])))].sort().slice(0, 18);
    const yVals = [...new Set(records.map(r => String(r[yCatCol])))].sort().slice(0, 18);

    const matrix = yVals.flatMap(y =>
      xVals.map(x => ({
        x, y,
        value: d3.sum(
          records.filter(r => String(r[xCatCol]) === x && String(r[yCatCol]) === y),
          r => +r[numCol] || 0,
        ),
      })),
    );

    const W = 560, H = 390, m = { top: 10, right: 90, bottom: 82, left: 90 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const xScale = d3.scaleBand().domain(xVals).range([0, w]).padding(0.05);
    const yScale = d3.scaleBand().domain(yVals).range([0, h]).padding(0.05);
    const maxVal = d3.max(matrix, d => d.value) ?? 1;
    const color = d3.scaleSequential(d3.interpolateViridis).domain([0, maxVal]);

    g.selectAll('.cell').data(matrix).join('rect')
      .attr('x', d => xScale(d.x)!).attr('y', d => yScale(d.y)!)
      .attr('width', xScale.bandwidth()).attr('height', yScale.bandwidth())
      .attr('rx', 2).attr('fill', d => d.value > 0 ? color(d.value) : '#1e2235')
      .attr('stroke', 'transparent').attr('stroke-width', 2).style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('stroke', 'rgba(255,255,255,0.6)');
        show(tipHtml(`${d.x} × ${d.y}`, [[numCol, fmt(d.value)]], d3.select(this).attr('fill')), event.clientX, event.clientY);
      })
      .on('mouseleave', function () { d3.select(this).attr('stroke', 'transparent'); hide(); });

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xScale))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9).attr('transform', 'rotate(-40)').style('text-anchor', 'end'));
    g.append('g').call(d3.axisLeft(yScale))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9));

    // Color scale legend
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'hm-dv-grad')
      .attr('x1', '0%').attr('x2', '0%').attr('y1', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color(maxVal));
    grad.append('stop').attr('offset', '100%').attr('stop-color', color(0));
    const lg = g.append('g').attr('transform', `translate(${w + 14}, 0)`);
    lg.append('rect').attr('width', 12).attr('height', h).attr('fill', 'url(#hm-dv-grad)').attr('rx', 3);
    const lgScale = d3.scaleLinear().domain([0, h]).range([maxVal, 0]);
    lg.append('g').attr('transform', 'translate(12, 0)')
      .call(d3.axisRight(lgScale).ticks(5).tickFormat(d => compactNum(+d)))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9));
  }, [records, xCatCol, yCatCol, numCol]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${numCol} · ${xCatCol} × ${yCatCol}`}</div>
      <div style={chartSubtitle}>{subtitle ?? 'Heatmap · sum per cell'}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Box plot ──────────────────────────────────────────────────────────────────

export function DataBoxPlot({
  records, groupCol, valueCol, title, subtitle,
}: {
  records: Record<string, any>[];
  groupCol: string; valueCol: string;
  title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const byGroup = d3.group(records, d => String(d[groupCol]));
    const stats = Array.from(byGroup, ([group, rows]) => {
      const vals = rows.map(r => +r[valueCol]).filter(v => !isNaN(v)).sort(d3.ascending);
      if (!vals.length) return null;
      return {
        group,
        min: d3.min(vals)!, max: d3.max(vals)!,
        q1: d3.quantile(vals, 0.25)!, median: d3.quantile(vals, 0.5)!, q3: d3.quantile(vals, 0.75)!,
      };
    }).filter(Boolean).slice(0, 14) as { group: string; min: number; max: number; q1: number; median: number; q3: number }[];

    if (!stats.length) return;

    const W = 560, H = 310, m = { top: 16, right: 16, bottom: 62, left: 75 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleBand().domain(stats.map(d => d.group)).range([0, w]).padding(0.35);
    const y = d3.scaleLinear()
      .domain([d3.min(stats, d => d.min)! * 0.9, d3.max(stats, d => d.max)! * 1.05])
      .range([h, 0]);

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(() => ''))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('stroke-dasharray', '3,3'));

    stats.forEach((d, i) => {
      const cx = x(d.group)! + x.bandwidth() / 2;
      const bw = x.bandwidth();
      const col = CHART_COLORS[i % CHART_COLORS.length];

      // Whiskers
      g.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(d.min)).attr('y2', y(d.q1))
        .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 2');
      g.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(d.q3)).attr('y2', y(d.max))
        .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 2');
      // Caps
      [[d.min], [d.max]].forEach(([v]) => {
        g.append('line').attr('x1', cx - bw * 0.2).attr('x2', cx + bw * 0.2)
          .attr('y1', y(v)).attr('y2', y(v)).attr('stroke', col).attr('stroke-width', 1.5);
      });

      // IQR box
      g.append('rect')
        .attr('x', x(d.group)!).attr('y', y(d.q3)).attr('width', bw).attr('height', y(d.q1) - y(d.q3))
        .attr('fill', col).attr('opacity', 0.35).attr('stroke', col).attr('stroke-width', 1.5)
        .attr('rx', 3).style('cursor', 'pointer')
        .on('mousemove', function (event) {
          d3.select(this).attr('opacity', 0.65);
          show(
            tipHtml(d.group, [
              ['Min', fmt(d.min)], ['Q1', fmt(d.q1)], ['Median', fmt(d.median)], ['Q3', fmt(d.q3)], ['Max', fmt(d.max)],
            ], col),
            event.clientX, event.clientY,
          );
        })
        .on('mouseleave', function () { d3.select(this).attr('opacity', 0.35); hide(); });

      // Median line
      g.append('line').attr('x1', x(d.group)!).attr('x2', x(d.group)! + bw)
        .attr('y1', y(d.median)).attr('y2', y(d.median))
        .attr('stroke', col).attr('stroke-width', 2);
    });

    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => compactNum(+d)))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10).attr('dy', '1.2em')
        .attr('transform', stats.length > 6 ? 'rotate(-30)' : null)
        .style('text-anchor', stats.length > 6 ? 'end' : 'middle'));
  }, [records, groupCol, valueCol]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${valueCol} distribution by ${groupCol}`}</div>
      <div style={chartSubtitle}>{subtitle ?? 'Box plot · IQR + whiskers'}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────

export function DataDonut({
  records, catCol, numCol, title, subtitle,
}: {
  records: Record<string, any>[];
  catCol: string; numCol: string;
  title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const byGroup = d3.rollup(
      records,
      v => d3.sum(v, d => +d[numCol] || 0),
      d => String(d[catCol]),
    );
    const data = Array.from(byGroup, ([label, value]) => ({ label, value }))
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
    if (!data.length) return;

    const total = d3.sum(data, d => d.value);
    const W = 420, H = 330;
    const radius = Math.min(W - 100, H) / 2 - 20;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${W / 2 - 45},${H / 2})`);

    const pie = d3.pie<{ label: string; value: number }>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(radius * 0.52).outerRadius(radius);
    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(radius * 0.52).outerRadius(radius + 8);

    g.selectAll('.arc').data(pie(data)).join('g').attr('class', 'arc')
      .append('path')
      .attr('d', arc)
      .attr('fill', (_, i) => CHART_COLORS[i % CHART_COLORS.length])
      .attr('stroke', '#0f1117').attr('stroke-width', 2).style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('d', arcHover(d) ?? '');
        const c = d3.select(this).attr('fill');
        show(tipHtml(d.data.label, [[numCol, fmt(d.data.value)], ['Share', `${(d.data.value / total * 100).toFixed(1)}%`]], c), event.clientX, event.clientY);
      })
      .on('mouseleave', function (_, d) { d3.select(this).attr('d', arc(d) ?? ''); hide(); })
      .transition().duration(700)
      .attrTween('d', function (d) {
        const interp = d3.interpolate({ startAngle: 0, endAngle: 0, padAngle: d.padAngle }, d);
        return (t: number) => arc(interp(t)) ?? '';
      });

    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.2em')
      .attr('fill', '#e2e8f0').attr('font-size', 15).attr('font-weight', 700).text(compactNum(total));
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
      .attr('fill', '#64748b').attr('font-size', 10).text('total');

    // Legend
    const leg = svg.append('g').attr('transform', `translate(${W - 95}, 20)`);
    data.slice(0, 9).forEach((d, i) => {
      leg.append('rect').attr('x', 0).attr('y', i * 18).attr('width', 10).attr('height', 10)
        .attr('rx', 2).attr('fill', CHART_COLORS[i % CHART_COLORS.length]);
      leg.append('text').attr('x', 14).attr('y', i * 18 + 9).attr('fill', TEXT_COLOR).attr('font-size', 9)
        .text(d.label.length > 11 ? d.label.slice(0, 11) + '…' : d.label);
    });
  }, [records, catCol, numCol]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${numCol} by ${catCol}`}</div>
      <div style={chartSubtitle}>{subtitle ?? 'Donut chart · proportional breakdown'}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Histogram ─────────────────────────────────────────────────────────────────

export function DataHistogram({
  records, numCol, colorIndex = 0, title, subtitle,
}: {
  records: Record<string, any>[];
  numCol: string; colorIndex?: number;
  title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const vals = records.map(r => +r[numCol]).filter(v => !isNaN(v));
    if (vals.length < 5) return;

    const W = 520, H = 310, m = { top: 16, right: 20, bottom: 52, left: 70 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleLinear().domain([d3.min(vals)!, d3.max(vals)!]).range([0, w]).nice();
    const bins = d3.bin().domain(x.domain() as [number, number]).thresholds(20)(vals);
    const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)! * 1.1]).range([h, 0]);
    const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(() => ''))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('stroke-dasharray', '3,3'));

    g.selectAll('.bin').data(bins).join('rect')
      .attr('x', d => x(d.x0!) + 1).attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 2))
      .attr('y', h).attr('height', 0).attr('rx', 2).attr('fill', color).attr('opacity', 0.78)
      .style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('opacity', 1);
        show(tipHtml(`${compactNum(d.x0!)} – ${compactNum(d.x1!)}`, [['Count', String(d.length)]], color), event.clientX, event.clientY);
      })
      .on('mouseleave', function () { d3.select(this).attr('opacity', 0.78); hide(); })
      .transition().duration(580).delay((_, i) => i * 18)
      .attr('y', d => y(d.length)).attr('height', d => h - y(d.length));

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(8))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
    g.append('g').call(d3.axisLeft(y).ticks(5))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
  }, [records, numCol, colorIndex]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${numCol} distribution`}</div>
      <div style={chartSubtitle}>{subtitle ?? 'Histogram · frequency bins'}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Stacked area chart ────────────────────────────────────────────────────────

export function DataStackedArea({
  records, dateCol, catCol, numCol, title, subtitle,
}: {
  records: Record<string, any>[];
  dateCol: string; catCol: string; numCol: string;
  title?: string; subtitle?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const categories = [...new Set(records.map(r => String(r[catCol])))].sort().slice(0, 8);
    const months = [...new Set(records.map(r => String(r[dateCol]).slice(0, 7)))].sort();
    if (months.length < 2) return;

    const seriesData = months.map(m => {
      const row: Record<string, any> = { month: new Date(m + '-01') };
      categories.forEach(c => {
        row[c] = d3.sum(
          records.filter(r => String(r[dateCol]).slice(0, 7) === m && String(r[catCol]) === c),
          r => +r[numCol] || 0,
        );
      });
      return row;
    });

    const series = d3.stack().keys(categories)(seriesData);

    const W = 620, H = 320, m = { top: 16, right: 110, bottom: 52, left: 70 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('height', 'auto');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleTime().domain(d3.extent(seriesData, d => d.month as Date) as [Date, Date]).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(series, s => d3.max(s, d => d[1]))! * 1.05]).range([h, 0]);
    const color = d3.scaleOrdinal(CHART_COLORS).domain(categories);

    const area = d3.area<any>()
      .x(d => x(d.data.month as Date)).y0(d => y(d[0])).y1(d => y(d[1]))
      .curve(d3.curveMonotoneX);

    g.selectAll('.layer').data(series).join('path').attr('class', 'layer')
      .attr('d', area).attr('fill', d => color(d.key)).attr('opacity', 0.82)
      .style('cursor', 'crosshair')
      .on('mousemove', (event, d) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const idx = Math.max(0, Math.min(d.length - 1, d3.bisectLeft(seriesData.map(r => r.month as Date), date)));
        const pt = d[idx];
        show(tipHtml(d.key, [['Value', fmt(pt[1] - pt[0])]], color(d.key)), event.clientX, event.clientY);
      })
      .on('mouseleave', () => hide());

    // Legend
    categories.forEach((c, i) => {
      const lg = g.append('g').attr('transform', `translate(${w + 8},${i * 17})`);
      lg.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', color(c));
      lg.append('text').attr('x', 14).attr('y', 9).attr('fill', TEXT_COLOR).attr('font-size', 9)
        .text(c.length > 11 ? c.slice(0, 11) + '…' : c);
    });

    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %y') as any))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9).attr('transform', 'rotate(-30)').style('text-anchor', 'end'));
    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => compactNum(+d)))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
  }, [records, dateCol, catCol, numCol]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{title ?? `${numCol} by ${catCol} over time`}</div>
      <div style={chartSubtitle}>{subtitle ?? 'Stacked area chart'}</div>
      <svg ref={svgRef} /><div ref={tipRef} />
    </div>
  );
}

// ── Multi-chart grid ────────────────────────────────────────────────────────--

function normalizeType(ct: string): string {
  const t = ct.toLowerCase();
  if (t.includes('bar') || t.includes('column')) return 'bar';
  if (t.includes('line') || t.includes('time') || t.includes('trend') || t.includes('series')) return 'line';
  if (t.includes('scatter') || t.includes('bubble') || t.includes('correlat')) return 'scatter';
  if (t.includes('heat') || t.includes('matrix')) return 'heatmap';
  if (t.includes('box') || t.includes('violin') || t.includes('whisker')) return 'boxplot';
  if (t.includes('pie') || t.includes('donut') || t.includes('propor') || t.includes('share')) return 'donut';
  if (t.includes('histogram') || t.includes('frequenc') || t.includes('distribut')) return 'histogram';
  if (t.includes('area') || t.includes('stacked')) return 'stacked-area';
  return 'bar';
}

/**
 * Renders a grid of D3 charts driven by AI recommendations.
 * Auto-selects the best available columns for each chart type
 * based on the inferred schema.
 */
export function MultiChartGrid({
  records,
  schema,
  recommendations,
}: {
  records: Record<string, any>[];
  schema: DataSchema;
  recommendations: Recommendation[];
}) {
  const { numericCols: nc, catCols: cc, dateCols: dc } = schema;
  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);

  const charts: React.ReactNode[] = [];
  const usedTypes = new Set<string>();

  for (const rec of sorted) {
    const type = normalizeType(rec.chart_type);
    if (usedTypes.has(type)) continue;

    let node: React.ReactNode = null;

    switch (type) {
      case 'bar':
        if (nc.length && cc.length) {
          node = <DataBarChart key={`bar-${nc[0]}-${cc[0]}`} records={records} numCol={nc[0]} catCol={cc[0]} colorIndex={charts.length} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;

      case 'line':
        if (nc.length && (dc.length || cc.length)) {
          node = <DataLineChart key={`line-${nc[0]}`} records={records} numCol={nc[0]} dateCol={dc[0]} catCol={!dc.length ? cc[0] : undefined} colorIndex={charts.length} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;

      case 'scatter':
        if (nc.length >= 2) {
          node = <DataScatterPlot key={`scatter-${nc[0]}-${nc[1]}`} records={records} xCol={nc[0]} yCol={nc[1]} colorCol={cc[0]} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;

      case 'heatmap':
        if (cc.length >= 2 && nc.length) {
          node = <DataHeatmap key={`hm-${cc[0]}-${cc[1]}`} records={records} xCatCol={cc[0]} yCatCol={cc[1]} numCol={nc[0]} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;

      case 'boxplot':
        if (nc.length && cc.length) {
          node = <DataBoxPlot key={`box-${cc[0]}-${nc[0]}`} records={records} groupCol={cc[0]} valueCol={nc[0]} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;

      case 'donut':
        if (nc.length && cc.length) {
          node = <DataDonut key={`donut-${cc[0]}-${nc[0]}`} records={records} catCol={cc[0]} numCol={nc[0]} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;

      case 'histogram':
        if (nc.length) {
          node = <DataHistogram key={`hist-${nc[0]}`} records={records} numCol={nc[0]} colorIndex={charts.length} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;

      case 'stacked-area':
        if (nc.length && cc.length && dc.length) {
          node = <DataStackedArea key={`area-${dc[0]}-${cc[0]}`} records={records} dateCol={dc[0]} catCol={cc[0]} numCol={nc[0]} title={rec.chart_type} subtitle={rec.reason} />;
          usedTypes.add(type);
        }
        break;
    }

    if (node) charts.push(node);
  }

  // Fallback: if no recommendations produced a chart, generate common ones automatically
  if (!charts.length) {
    if (nc.length && cc.length) {
      // Bar for each cat col (up to 3)
      cc.slice(0, 3).forEach((catCol, i) => {
        charts.push(<DataBarChart key={`fb-bar-${catCol}`} records={records} numCol={nc[0]} catCol={catCol} colorIndex={i} />);
      });
      // Scatter if 2+ numeric cols
      if (nc.length >= 2) {
        charts.push(<DataScatterPlot key={`fb-scatter`} records={records} xCol={nc[0]} yCol={nc[1]} colorCol={cc[0]} />);
      }
      // Donut
      charts.push(<DataDonut key={`fb-donut`} records={records} catCol={cc[0]} numCol={nc[0]} />);
    } else if (nc.length) {
      nc.slice(0, 3).forEach((numCol, i) => {
        charts.push(<DataHistogram key={`fb-hist-${numCol}`} records={records} numCol={numCol} colorIndex={i} />);
      });
    }
  }

  if (!charts.length) {
    return (
      <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '12px 0' }}>
        Not enough column variety to auto-generate charts. Try uploading a richer dataset.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 16 }}>
      {charts}
    </div>
  );
}
