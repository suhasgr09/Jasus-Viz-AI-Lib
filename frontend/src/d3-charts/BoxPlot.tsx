import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

function quartiles(values: number[]) {
  const sorted = [...values].sort(d3.ascending);
  return {
    q1: d3.quantile(sorted, 0.25)!,
    median: d3.quantile(sorted, 0.5)!,
    q3: d3.quantile(sorted, 0.75)!,
    min: d3.min(sorted)!,
    max: d3.max(sorted)!,
  };
}

export default function BoxPlot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { data } = useSampleData('employees');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);

    const byDept = d3.group(data, d => d.department);
    const stats = Array.from(byDept, ([dept, rows]) => ({
      dept, ...quartiles(rows.map(d => +d.salary).filter(Boolean)),
    })).sort((a, b) => a.dept.localeCompare(b.dept));

    const W = 580, H = 360, margin = { top: 20, right: 20, bottom: 60, left: 80 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(stats.map(d => d.dept)).range([0, w]).padding(0.35);
    const y = d3.scaleLinear().domain([
      d3.min(stats, d => d.min)! * 0.9,
      d3.max(stats, d => d.max)! * 1.05,
    ]).range([h, 0]);

    svg.append('g').call(d3.axisLeft(y).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR));
    svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('transform', 'rotate(-25)').attr('text-anchor', 'end'));

    stats.forEach((d, i) => {
      const cx = x(d.dept)! + x.bandwidth() / 2;
      const bw = x.bandwidth();
      const col = CHART_COLORS[i % CHART_COLORS.length];

      // Whiskers
      svg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(d.min)).attr('y2', y(d.q1))
        .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 2');
      svg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(d.q3)).attr('y2', y(d.max))
        .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 2');

      // IQR box
      svg.append('rect').attr('x', x(d.dept)!).attr('y', y(d.q3)).attr('width', bw)
        .attr('height', y(d.q1) - y(d.q3)).attr('fill', col).attr('opacity', 0.35)
        .attr('stroke', col).attr('stroke-width', 1.5).attr('rx', 3)
        .style('cursor', 'pointer')
        .on('mousemove', function(event) {
          d3.select(this).attr('opacity', 0.65);
          show(
            tipHtml(d.dept, [
              ['Min', fmt(d.min)], ['Q1', fmt(d.q1)], ['Median', fmt(d.median)],
              ['Q3', fmt(d.q3)], ['Max', fmt(d.max)],
            ]),
            event.clientX, event.clientY
          );
        })
        .on('mouseleave', function() { d3.select(this).attr('opacity', 0.35); hide(); });

      // Median line
      svg.append('line').attr('x1', x(d.dept)!).attr('x2', x(d.dept)! + bw)
        .attr('y1', y(d.median)).attr('y2', y(d.median))
        .attr('stroke', col).attr('stroke-width', 2.5);

      // Min/Max ticks
      [d.min, d.max].forEach(v => {
        svg.append('line').attr('x1', cx - bw / 4).attr('x2', cx + bw / 4)
          .attr('y1', y(v)).attr('y2', y(v)).attr('stroke', col).attr('stroke-width', 1.5);
      });
    });
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Box Plot Dashboard</div>
      <div style={chartSubtitle}>Salary distribution by department — hover boxes for statistics</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 580 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
