import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, tipHtml } from '../utils/tooltipHelpers';

const METRICS = ['salary', 'performance_score', 'years_experience'];
const LABELS: Record<string, string> = { salary: 'Salary', performance_score: 'Perf Score', years_experience: 'Exp (yrs)' };

export default function RadarChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { data } = useSampleData('employees');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);

    const byDept = d3.group(data, d => d.department);
    const departments = Array.from(byDept.keys()).slice(0, 5);

    const scales: Record<string, d3.ScaleLinear<number, number>> = {};
    METRICS.forEach(m => {
      scales[m] = d3.scaleLinear()
        .domain([0, d3.max(data, (d: any) => +d[m]) ?? 1])
        .range([0, 1]);
    });

    const W = 440, H = 440, cx = W / 2, cy = H / 2, R = 160;
    const angles = METRICS.map((_, i) => (i * 2 * Math.PI) / METRICS.length - Math.PI / 2);

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${cx},${cy})`);

    // Grid circles
    [0.25, 0.5, 0.75, 1].forEach(t => {
      svg.append('polygon')
        .attr('points', angles.map(a => `${Math.cos(a) * R * t},${Math.sin(a) * R * t}`).join(' '))
        .attr('fill', 'none').attr('stroke', GRID_COLOR).attr('stroke-width', 0.8);
    });

    // Axis lines and labels
    angles.forEach((a, i) => {
      svg.append('line').attr('x1', 0).attr('y1', 0)
        .attr('x2', Math.cos(a) * R).attr('y2', Math.sin(a) * R)
        .attr('stroke', GRID_COLOR).attr('stroke-width', 0.8);
      svg.append('text')
        .attr('x', Math.cos(a) * (R + 18)).attr('y', Math.sin(a) * (R + 18))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', TEXT_COLOR).attr('font-size', 11)
        .text(LABELS[METRICS[i]]);
    });

    // Department polygons
    departments.forEach((dept, di) => {
      const rows = byDept.get(dept)!;
      const means = METRICS.map(m => d3.mean(rows, (d: any) => +d[m]) ?? 0);
      const points = angles.map((a, i) => {
        const r = R * scales[METRICS[i]](means[i]);
        return `${Math.cos(a) * r},${Math.sin(a) * r}`;
      });
      svg.append('polygon').attr('points', points.join(' '))
        .attr('fill', CHART_COLORS[di % CHART_COLORS.length]).attr('opacity', 0.25)
        .attr('stroke', CHART_COLORS[di % CHART_COLORS.length]).attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mousemove', function(event) {
          d3.select(this).attr('opacity', 0.5).attr('stroke-width', 3);
          const rows2: [string, string][] = means.map((v, i) => [
            LABELS[METRICS[i]],
            METRICS[i] === 'salary' ? `$${v.toFixed(0)}` : v.toFixed(1),
          ]);
          show(tipHtml(dept, rows2), event.clientX, event.clientY);
        })
        .on('mouseleave', function() {
          d3.select(this).attr('opacity', 0.25).attr('stroke-width', 2);
          hide();
        });
    });

    // Legend
    departments.forEach((dept, i) => {
      svg.append('circle').attr('cx', R + 12).attr('cy', -R + i * 18).attr('r', 5)
        .attr('fill', CHART_COLORS[i % CHART_COLORS.length]);
      svg.append('text').attr('x', R + 22).attr('y', -R + i * 18 + 4)
        .attr('fill', TEXT_COLOR).attr('font-size', 10).text(dept);
    });
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Radar / Spider Chart</div>
      <div style={chartSubtitle}>Multi-metric department comparison — hover polygons for stats</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 440 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
