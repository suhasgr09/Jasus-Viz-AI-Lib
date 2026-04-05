import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

const AXES = ['salary', 'performance_score', 'years_experience'];

export default function ParallelCoordinates() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data } = useSampleData('employees');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const sample = data.slice(0, 80);
    const departments = [...new Set(sample.map(d => d.department))];
    const color = d3.scaleOrdinal(CHART_COLORS).domain(departments);

    const W = 600, H = 340, margin = { top: 30, right: 30, bottom: 30, left: 30 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(AXES).range([0, w]);
    const yScales: Record<string, d3.ScaleLinear<number, number>> = {};
    AXES.forEach(ax => {
      yScales[ax] = d3.scaleLinear()
        .domain(d3.extent(sample, (d: any) => +d[ax]) as [number, number])
        .range([h, 0]);
    });

    const line = d3.line();
    const pathData = (d: any) =>
      line(AXES.map(ax => [x(ax)!, yScales[ax](+d[ax] || 0)]));

    svg.selectAll('.pcp-line').data(sample).join('path')
      .attr('class', 'pcp-line')
      .attr('d', d => pathData(d))
      .attr('fill', 'none')
      .attr('stroke', d => color(d.department))
      .attr('opacity', 0.45)
      .attr('stroke-width', 1.5);

    AXES.forEach(ax => {
      const axisG = svg.append('g').attr('transform', `translate(${x(ax)}, 0)`);
      axisG.call(d3.axisLeft(yScales[ax]).ticks(5))
        .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
        .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9));
      axisG.append('text').attr('y', -12).attr('text-anchor', 'middle')
        .attr('fill', TEXT_COLOR).attr('font-size', 11).text(ax.replace('_', ' '));
    });

    // Legend
    departments.forEach((d, i) => {
      svg.append('circle').attr('cx', w - 100).attr('cy', i * 16).attr('r', 5).attr('fill', color(d));
      svg.append('text').attr('x', w - 90).attr('y', i * 16 + 4).attr('fill', TEXT_COLOR).attr('font-size', 9).text(d);
    });
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Parallel Coordinates</div>
      <div style={chartSubtitle}>Multi-dimensional exploration: salary, performance, experience</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 600 }} />
    </div>
  );
}
