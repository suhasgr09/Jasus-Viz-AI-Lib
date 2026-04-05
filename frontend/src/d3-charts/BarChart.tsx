import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

export default function BarChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    // Aggregate total_amount by region
    const byRegion = d3.rollup(data, v => d3.sum(v, d => d.total_amount), d => d.region);
    const chartData = Array.from(byRegion, ([region, total]) => ({ region, total }))
      .sort((a, b) => b.total - a.total);

    const W = 600, H = 340, margin = { top: 20, right: 20, bottom: 50, left: 80 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(chartData.map(d => d.region)).range([0, w]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.total)! * 1.1]).range([h, 0]);

    // Grid lines
    svg.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-w).tickFormat(() => ''))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', GRID_COLOR));

    // Bars
    svg.selectAll('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.region)!)
      .attr('width', x.bandwidth())
      .attr('y', h)
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', (_, i) => CHART_COLORS[i % CHART_COLORS.length])
      .transition().duration(700).delay((_, i) => i * 80)
      .attr('y', d => y(d.total))
      .attr('height', d => h - y(d.total));

    // Value labels
    svg.selectAll('.label')
      .data(chartData)
      .join('text')
      .attr('x', d => x(d.region)! + x.bandwidth() / 2)
      .attr('y', d => y(d.total) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', TEXT_COLOR)
      .attr('font-size', 11)
      .text(d => `$${(d.total / 1000).toFixed(0)}k`);

    // Axes
    svg.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR));

    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR));
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Interactive Bar Chart</div>
      <div style={chartSubtitle}>Total sales revenue by region</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 600 }} />
    </div>
  );
}
