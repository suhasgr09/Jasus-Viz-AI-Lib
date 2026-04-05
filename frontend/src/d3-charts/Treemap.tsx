import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';

export default function Treemap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);

    const total = d3.sum(data, d => d.total_amount);

    const byCategory = d3.rollup(data, v => d3.sum(v, d => d.total_amount), d => d.category);
    const root = d3.hierarchy({ children: Array.from(byCategory, ([name, value]) => ({ name, value })) } as any)
      .sum((d: any) => d.value);

    const W = 560, H = 360;
    d3.treemap<any>().size([W, H]).padding(3)(root);

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`);

    const cell = svg.selectAll('g').data(root.leaves()).join('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    cell.append('rect')
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', (_, i) => CHART_COLORS[i % CHART_COLORS.length])
      .attr('opacity', 0.85)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mousemove', function(event, d: any) {
        d3.select(this).attr('opacity', 1).attr('stroke', 'rgba(255,255,255,0.4)').attr('stroke-width', 1.5);
        const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0.0';
        show(
          tipHtml(d.data.name, [['Revenue', fmt(d.data.value)], ['Share', `${pct}%`]]),
          event.clientX, event.clientY
        );
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
        hide();
      });

    cell.append('text')
      .attr('x', 6).attr('y', 18)
      .attr('fill', '#fff').attr('font-size', 12).attr('font-weight', 600)
      .style('pointer-events', 'none')
      .text((d: any) => d.data.name);

    cell.append('text')
      .attr('x', 6).attr('y', 34)
      .attr('fill', 'rgba(255,255,255,0.7)').attr('font-size', 10)
      .style('pointer-events', 'none')
      .text((d: any) => `$${(d.data.value / 1000).toFixed(0)}k`);

    cell.append('title').text((d: any) => `${d.data.name}: $${d.data.value.toFixed(0)}`);
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Treemap</div>
      <div style={chartSubtitle}>Revenue breakdown by category — hover to inspect</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 560 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
