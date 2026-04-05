import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSampleData } from '../hooks/useSampleData';
import { CHART_COLORS } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

export default function SunburstChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data } = useSampleData('sales');

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    // Build hierarchy: root → category → region
    const nested = d3.group(data, d => d.category, d => d.region);
    const hierarchyData = {
      name: 'Sales',
      children: Array.from(nested, ([cat, regions]) => ({
        name: cat,
        children: Array.from(regions, ([region, rows]) => ({
          name: region,
          value: d3.sum(rows, r => r.total_amount),
        })),
      })),
    };

    const W = 500, H = 500, R = Math.min(W, H) / 2 - 10;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${W / 2},${H / 2})`);

    const root = d3.hierarchy(hierarchyData as any).sum((d: any) => d.value);
    d3.partition<any>().size([2 * Math.PI, R])(root);

    const arc = d3.arc<any>()
      .startAngle(d => d.x0).endAngle(d => d.x1)
      .innerRadius(d => d.y0 + 10).outerRadius(d => d.y1 - 2);

    svg.selectAll('path').data(root.descendants().slice(1)).join('path')
      .attr('d', arc)
      .attr('fill', (d: any) => {
        const topIdx = root.children!.indexOf(d.depth === 1 ? d : d.parent!);
        return CHART_COLORS[topIdx % CHART_COLORS.length];
      })
      .attr('opacity', d => d.depth === 1 ? 0.9 : 0.65)
      .attr('stroke', '#0f1117').attr('stroke-width', 0.8)
      .append('title').text((d: any) => `${d.data.name}: $${(d.value / 1000).toFixed(0)}k`);

    svg.selectAll('text').data(root.descendants().filter((d: any) => d.depth && (d.x1 - d.x0) > 0.08))
      .join('text')
      .attr('transform', (d: any) => {
        const [x, y] = arc.centroid(d);
        return `translate(${x},${y})`;
      })
      .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#fff')
      .text((d: any) => d.data.name.slice(0, 8));
  }, [data]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Sunburst Chart</div>
      <div style={chartSubtitle}>Multi-level hierarchy: category → region</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 500 }} />
    </div>
  );
}
