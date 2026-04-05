import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

export default function StackedAreaChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);

    const categories = [...new Set(data.map(d => d.category))].sort();
    const months = [...new Set(data.map(d => d.order_date?.slice(0, 7)))].sort() as string[];

    const seriesData = months.map(m => {
      const row: any = { month: new Date(m + '-01') };
      categories.forEach(c => {
        row[c] = d3.sum(data.filter(d => d.order_date?.slice(0, 7) === m && d.category === c), d => d.total_amount);
      });
      return row;
    });

    const stack = d3.stack().keys(categories);
    const series = stack(seriesData);

    const W = 640, H = 340, margin = { top: 20, right: 120, bottom: 50, left: 70 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(seriesData, d => d.month) as [Date, Date]).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(series, s => d3.max(s, d => d[1]))! * 1.05]).range([h, 0]);
    const color = d3.scaleOrdinal(CHART_COLORS).domain(categories);

    const area = d3.area<any>().x(d => x(d.data.month)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);

    svg.selectAll('.layer').data(series).join('path')
      .attr('class', 'layer').attr('d', area)
      .attr('fill', d => color(d.key)).attr('opacity', 0.8)
      .style('cursor', 'crosshair')
      .on('mousemove', (event, d) => {
        const [mx] = d3.pointer(event);
        const date = new Date(x.invert(mx) as unknown as number);
        const bisect = d3.bisector((r: any) => r.data.month as Date).left;
        const idx = Math.max(0, Math.min(d.length - 1, bisect(d, date)));
        const pt = d[idx];
        const val = (pt[1] - pt[0]);
        show(
          tipHtml(d.key, [
            ['Month', d3.timeFormat('%b %Y')(new Date(pt.data.month as number))],
            ['Revenue', fmt(val)],
          ], color(d.key)),
          event.clientX, event.clientY
        );
      })
      .on('mouseleave', () => hide());

    // Legend
    categories.forEach((c, i) => {
      svg.append('rect').attr('x', w + 8).attr('y', i * 18).attr('width', 12).attr('height', 12)
        .attr('fill', color(c)).attr('rx', 2);
      svg.append('text').attr('x', w + 24).attr('y', i * 18 + 10).attr('fill', TEXT_COLOR).attr('font-size', 10).text(c);
    });

    svg.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %y') as any))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('transform', 'rotate(-30)').attr('text-anchor', 'end'));
    svg.append('g').call(d3.axisLeft(y).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR));
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Stacked Area Chart</div>
      <div style={chartSubtitle}>Revenue composition over time — hover layers for details</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 640 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
