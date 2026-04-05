import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

// Simplified US states data with representative centroids
const US_STATES = [
  { name: 'California', abbr: 'CA', x: 80, y: 210, region: 'West' },
  { name: 'Texas', abbr: 'TX', x: 260, y: 320 , region: 'South' },
  { name: 'Florida', abbr: 'FL', x: 450, y: 340, region: 'South' },
  { name: 'New York', abbr: 'NY', x: 510, y: 140, region: 'East' },
  { name: 'Illinois', abbr: 'IL', x: 380, y: 180, region: 'Central' },
  { name: 'Pennsylvania', abbr: 'PA', x: 480, y: 160, region: 'East' },
  { name: 'Ohio', abbr: 'OH', x: 440, y: 175, region: 'Central' },
  { name: 'Georgia', abbr: 'GA', x: 430, y: 290, region: 'South' },
  { name: 'North Carolina', abbr: 'NC', x: 470, y: 250, region: 'East' },
  { name: 'Michigan', abbr: 'MI', x: 400, y: 155, region: 'Central' },
  { name: 'Washington', abbr: 'WA', x: 85, y: 90, region: 'West' },
  { name: 'Colorado', abbr: 'CO', x: 195, y: 210, region: 'West' },
  { name: 'Arizona', abbr: 'AZ', x: 140, y: 280, region: 'West' },
  { name: 'Massachusetts', abbr: 'MA', x: 540, y: 130, region: 'East' },
  { name: 'Tennessee', abbr: 'TN', x: 405, y: 265, region: 'South' },
];

export default function ChoroplethMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    // Map region to total revenue
    const byRegion = d3.rollup(data, v => d3.sum(v, d => d.total_amount), d => d.region);
    const color = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(byRegion.values()) ?? 1]);

    const W = 620, H = 400;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`);

    // Background
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#151829').attr('rx', 8);

    // Bubbles for each state, coloured by region revenue
    US_STATES.forEach(state => {
      const val = byRegion.get(state.region) ?? 0;
      svg.append('circle')
        .attr('cx', state.x).attr('cy', state.y)
        .attr('r', 22)
        .attr('fill', color(val))
        .attr('stroke', '#2d3148')
        .attr('stroke-width', 1.5)
        .append('title')
        .text(`${state.name} (${state.region}): $${(val / 1000).toFixed(0)}k`);

      svg.append('text').attr('x', state.x).attr('y', state.y + 4)
        .attr('text-anchor', 'middle').attr('font-size', 9)
        .attr('fill', val > 50000 ? '#fff' : TEXT_COLOR)
        .text(state.abbr);
    });

    // Legend
    const lgX = W - 30, lgY = 40, lgH = 160;
    const lgScale = d3.scaleLinear().domain([0, lgH]).range([d3.max(byRegion.values()) ?? 1, 0]);
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'choro-grad')
      .attr('x1', '0%').attr('x2', '0%').attr('y1', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color(d3.max(byRegion.values()) ?? 1));
    grad.append('stop').attr('offset', '100%').attr('stop-color', color(0));
    svg.append('rect').attr('x', lgX).attr('y', lgY).attr('width', 12).attr('height', lgH)
      .attr('fill', 'url(#choro-grad)');
    svg.append('g').attr('transform', `translate(${lgX + 12}, ${lgY})`)
      .call(d3.axisRight(lgScale).ticks(4).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9))
      .call(g => g.select('.domain').remove());
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Choropleth Map</div>
      <div style={chartSubtitle}>Revenue by sales region, mapped to representative US states</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 620 }} />
    </div>
  );
}
