import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

export default function BarChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);

    // Aggregate total_amount by region
    const byRegion = d3.rollup(data, v => d3.sum(v, d => d.total_amount), d => d.region);
    const byCount = d3.rollup(data, v => v.length, d => d.region);
    const chartData = Array.from(byRegion, ([region, total]) => ({
      region, total, count: byCount.get(region) ?? 0,
    })).sort((a, b) => b.total - a.total);

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
    const bars = svg.selectAll<SVGRectElement, typeof chartData[0]>('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.region)!)
      .attr('width', x.bandwidth())
      .attr('y', h)
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', (_, i) => CHART_COLORS[i % CHART_COLORS.length])
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mousemove', function(event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', 'rgba(255,255,255,0.35)').attr('stroke-width', 1.5);
        show(tipHtml(d.region, [['Revenue', fmt(d.total)], ['Orders', String(d.count)]]), event.clientX, event.clientY);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
        hide();
      });

    bars.transition().duration(700).delay((_, i) => i * 80)
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
      <div style={chartTitle}>Bar Chart</div>
      <div style={chartSubtitle}>Total sales revenue by region — hover bars for details</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 600 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
