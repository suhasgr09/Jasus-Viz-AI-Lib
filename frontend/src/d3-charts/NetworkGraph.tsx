import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CHART_COLORS, GRID_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

const SCHEMA_NODES = [
  { id: 'orders', type: 'fact' }, { id: 'customers', type: 'dim' },
  { id: 'products', type: 'dim' }, { id: 'categories', type: 'dim' },
  { id: 'regions', type: 'dim' }, { id: 'date_dim', type: 'dim' },
];
const SCHEMA_LINKS = [
  { source: 'orders', target: 'customers', label: 'customer_id' },
  { source: 'orders', target: 'products', label: 'product_id' },
  { source: 'orders', target: 'regions', label: 'region_id' },
  { source: 'orders', target: 'date_dim', label: 'date_id' },
  { source: 'products', target: 'categories', label: 'category_id' },
];

export default function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const W = 580, H = 380;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`);

    const nodes = SCHEMA_NODES.map(n => ({ ...n })) as any[];
    const links = SCHEMA_LINKS.map(l => ({ ...l })) as any[];

    svg.append('defs').append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 -5 10 10').attr('refX', 32)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', GRID_COLOR);

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(130))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2));

    const link = svg.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', GRID_COLOR).attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow)');

    const linkLabel = svg.append('g').selectAll('text').data(links).join('text')
      .attr('fill', '#475569').attr('font-size', 9).attr('text-anchor', 'middle').text((d: any) => d.label);

    const nodeDrag = d3.drag<SVGGElement, any>()
      .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });

    const nodeGroup = svg.append('g').selectAll('g').data(nodes).join('g')
      .call(nodeDrag as any);

    nodeGroup.append('rect').attr('x', -38).attr('y', -16).attr('width', 76).attr('height', 32)
      .attr('rx', 6)
      .attr('fill', (d: any) => d.type === 'fact' ? CHART_COLORS[0] : CHART_COLORS[2])
      .attr('opacity', 0.85);

    nodeGroup.append('text').attr('text-anchor', 'middle').attr('dy', 4)
      .attr('fill', '#fff').attr('font-size', 11).text((d: any) => d.id);

    sim.on('tick', () => {
      link.attr('x1', d => (d.source as any).x).attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x).attr('y2', d => (d.target as any).y);
      linkLabel
        .attr('x', d => ((d.source as any).x + (d.target as any).x) / 2)
        .attr('y', d => ((d.source as any).y + (d.target as any).y) / 2 - 5);
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }, []);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Network Graph</div>
      <div style={chartSubtitle}>Schema relationship visualization – drag to reorganize</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 580 }} />
    </div>
  );
}
