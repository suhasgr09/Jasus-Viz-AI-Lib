import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

export default function HeatmapMatrix() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);

    const regions = [...new Set(data.map(d => d.region))].sort();
    const categories = [...new Set(data.map(d => d.category))].sort();

    const matrix: { region: string; category: string; value: number }[] = [];
    regions.forEach(r => categories.forEach(c => {
      const total = d3.sum(data.filter(d => d.region === r && d.category === c), d => d.total_amount);
      matrix.push({ region: r, category: c, value: total });
    }));

    const W = 540, H = 360, margin = { top: 20, right: 80, bottom: 70, left: 90 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().domain(categories).range([0, w]).padding(0.05);
    const yScale = d3.scaleBand().domain(regions).range([0, h]).padding(0.05);
    const color = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, d3.max(matrix, d => d.value)!]);

    svg.selectAll<SVGRectElement, typeof matrix[0]>('.cell')
      .data(matrix)
      .join('rect')
      .attr('x', d => xScale(d.category)!)
      .attr('y', d => yScale(d.region)!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', d => d.value > 0 ? color(d.value) : '#1e2235')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mousemove', function(event, d) {
        d3.select(this).attr('stroke', 'rgba(255,255,255,0.6)');
        show(
          tipHtml(`${d.region} × ${d.category}`, [['Revenue', fmt(d.value)]]),
          event.clientX, event.clientY
        );
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke', 'transparent');
        hide();
      });;

    svg.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('transform', 'rotate(-35)').attr('text-anchor', 'end'));

    svg.append('g').call(d3.axisLeft(yScale))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR));

    // Color legend
    const lgW = 12, lgH = h;
    const lg = svg.append('g').attr('transform', `translate(${w + 16}, 0)`);
    const lgScale = d3.scaleLinear().domain([0, lgH]).range([d3.max(matrix, d => d.value)!, 0]);
    const lgAxis = d3.axisRight(lgScale).ticks(5).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`);
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'hm-grad').attr('x1', '0%').attr('x2', '0%').attr('y1', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color(d3.max(matrix, d => d.value)!));
    grad.append('stop').attr('offset', '100%').attr('stop-color', color(0));
    lg.append('rect').attr('width', lgW).attr('height', lgH).attr('fill', 'url(#hm-grad)');
    lg.append('g').attr('transform', `translate(${lgW}, 0)`).call(lgAxis)
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9));
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Heatmap Matrix</div>
      <div style={chartSubtitle}>Revenue intensity: region × category — hover to inspect</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 540 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
