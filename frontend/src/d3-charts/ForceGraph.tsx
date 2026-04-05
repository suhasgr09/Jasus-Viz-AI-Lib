import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { CHART_COLORS, GRID_COLOR } from '../utils/colors';
import { TOOLTIP_STYLE, makeTip, tipHtml } from '../utils/tooltipHelpers';

const NODES = [
  { id: 'orders' }, { id: 'customers' }, { id: 'products' },
  { id: 'categories' }, { id: 'regions' },
];
const LINKS = [
  { source: 'orders', target: 'customers', value: 3 },
  { source: 'orders', target: 'products', value: 3 },
  { source: 'products', target: 'categories', value: 2 },
  { source: 'orders', target: 'regions', value: 2 },
];

export default function ForceGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);
    const W = 500, H = 360;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`);

    const nodes = NODES.map(n => ({ ...n })) as any[];
    const links = LINKS.map(l => ({ ...l })) as any[];

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(W / 2, H / 2));

    const link = svg.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', GRID_COLOR).attr('stroke-width', d => d.value);

    const drag = d3.drag<SVGCircleElement, any>()
      .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });

    const node = svg.append('g').selectAll<SVGCircleElement, any>('circle').data(nodes).join('circle')
      .attr('r', 28).attr('fill', (_, i) => CHART_COLORS[i % CHART_COLORS.length])
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .call(drag as any)
      .on('mousemove', function(event, d) {
        d3.select(this).attr('r', 34).attr('stroke', 'rgba(255,255,255,0.4)').attr('stroke-width', 2);
        const peers = links
          .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
          .map((l: any) => l.source.id === d.id ? l.target.id : l.source.id);
        const elColor = d3.select(this).attr('fill') || CHART_COLORS[0];
        show(tipHtml(d.id, [
          ['Connections', peers.join(', ') || 'none'],
        ], elColor), event.clientX, event.clientY);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('r', 28).attr('stroke', 'none');
        hide();
      });

    const label = svg.append('g').selectAll('text').data(nodes).join('text')
      .text(d => d.id).attr('text-anchor', 'middle').attr('dy', 4)
      .attr('font-size', 11).attr('fill', '#fff').style('pointer-events', 'none');

    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
      label.attr('x', d => d.x).attr('y', d => d.y);
    });
  }, []);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Force-Directed Graph</div>
      <div style={chartSubtitle}>Entity relationship mapping – drag nodes to rearrange</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 500 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
