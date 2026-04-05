import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

export default function LineChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    // Monthly revenue aggregation
    const byMonth = d3.rollup(
      data,
      v => d3.sum(v, d => d.total_amount),
      d => d.order_date?.slice(0, 7)
    );
    const chartData = Array.from(byMonth, ([month, total]) => ({
      date: new Date(month + '-01'),
      total,
    })).sort((a, b) => +a.date - +b.date);

    const W = 640, H = 340, margin = { top: 20, right: 30, bottom: 50, left: 80 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`);

    svg.append('defs').append('clipPath').attr('id', 'clip-line')
      .append('rect').attr('width', w).attr('height', h);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(chartData, d => d.date) as [Date, Date]).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.total)! * 1.1]).range([h, 0]);

    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-w).tickFormat(() => ''))
      .call(g2 => g2.select('.domain').remove())
      .call(g2 => g2.selectAll('.tick line').attr('stroke', GRID_COLOR));

    const lineGen = d3.line<{ date: Date; total: number }>()
      .x(d => x(d.date)).y(d => y(d.total)).curve(d3.curveMonotoneX);

    const area = d3.area<{ date: Date; total: number }>()
      .x(d => x(d.date)).y0(h).y1(d => y(d.total)).curve(d3.curveMonotoneX);

    const chartGroup = g.append('g').attr('clip-path', 'url(#clip-line)');

    chartGroup.append('path').datum(chartData)
      .attr('fill', `${CHART_COLORS[0]}22`)
      .attr('d', area);

    const path = chartGroup.append('path').datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', CHART_COLORS[0])
      .attr('stroke-width', 2.5)
      .attr('d', lineGen);

    // Animate line draw
    const totalLength = (path.node() as SVGPathElement).getTotalLength();
    path.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition().duration(1200)
      .attr('stroke-dashoffset', 0);

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [W, H]])
      .on('zoom', (event) => {
        const newX = event.transform.rescaleX(x);
        xAxis.call(d3.axisBottom(newX).tickFormat(d3.timeFormat('%b %y') as any));
        xAxis.selectAll('text').attr('fill', TEXT_COLOR);
        const updatedLine = lineGen.x((d) => newX(d.date));
        chartGroup.select('path').attr('d', (d) => updatedLine(d as any));
      });

    svg.call(zoom as any);

    const xAxis = g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %y') as any))
      .call(g2 => g2.select('.domain').attr('stroke', GRID_COLOR))
      .call(g2 => g2.selectAll('text').attr('fill', TEXT_COLOR).attr('transform', 'rotate(-30)').attr('text-anchor', 'end'));

    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g2 => g2.select('.domain').attr('stroke', GRID_COLOR))
      .call(g2 => g2.selectAll('text').attr('fill', TEXT_COLOR));
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Line Chart with Zoom</div>
      <div style={chartSubtitle}>Monthly revenue trend – scroll / pinch to zoom</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 640, cursor: 'grab' }} />
    </div>
  );
}
