import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

export default function ScatterPlot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);
    const sample = data.slice(0, 200);

    const W = 560, H = 360, margin = { top: 20, right: 30, bottom: 55, left: 70 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(sample, d => d.quantity)! + 2]).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(sample, d => d.total_amount)! * 1.1]).range([h, 0]);
    const regions = [...new Set(sample.map(d => d.region))];
    const colorScale = d3.scaleOrdinal(CHART_COLORS).domain(regions);

    svg.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-w).tickFormat(() => ''))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', GRID_COLOR));

    svg.selectAll<SVGCircleElement, typeof sample[0]>('circle').data(sample).join('circle')
      .attr('cx', d => x(d.quantity)).attr('cy', d => y(d.total_amount))
      .attr('r', 4.5).attr('fill', d => colorScale(d.region))
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mousemove', function(event, d) {
        d3.select(this).attr('r', 7).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1.5);
        show(
          tipHtml(d.region, [['Qty', String(d.quantity)], ['Total', fmt(d.total_amount)], ['Category', d.category]]),
          event.clientX, event.clientY
        );
      })
      .on('mouseleave', function() {
        d3.select(this).attr('r', 4.5).attr('opacity', 0.7).attr('stroke', 'none');
        hide();
      });

    // Regression line
    const xVals = sample.map(d => d.quantity);
    const yVals = sample.map(d => d.total_amount);
    const n = xVals.length;
    const sumX = d3.sum(xVals), sumY = d3.sum(yVals);
    const sumXY = d3.sum(xVals.map((x, i) => x * yVals[i]));
    const sumX2 = d3.sum(xVals.map(v => v * v));
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const xMin = d3.min(xVals)!, xMax = d3.max(xVals)!;

    svg.append('line')
      .attr('x1', x(xMin)).attr('y1', y(slope * xMin + intercept))
      .attr('x2', x(xMax)).attr('y2', y(slope * xMax + intercept))
      .attr('stroke', '#f59e0b').attr('stroke-width', 2).attr('stroke-dasharray', '6 3');

    // Legend
    regions.forEach((r, i) => {
      svg.append('circle').attr('cx', w - 80).attr('cy', i * 16).attr('r', 5).attr('fill', colorScale(r));
      svg.append('text').attr('x', w - 70).attr('y', i * 16 + 4).attr('fill', TEXT_COLOR).attr('font-size', 10).text(r);
    });

    svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR));
    svg.append('g').call(d3.axisLeft(y).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR));

    svg.append('text').attr('x', w / 2).attr('y', h + 40).attr('text-anchor', 'middle')
      .attr('fill', TEXT_COLOR).attr('font-size', 11).text('Quantity Ordered');
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -55)
      .attr('text-anchor', 'middle').attr('fill', TEXT_COLOR).attr('font-size', 11).text('Total Amount ($)');
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Scatter Plot with Regression</div>
      <div style={chartSubtitle}>Quantity vs total amount — hover points for details</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 560 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
