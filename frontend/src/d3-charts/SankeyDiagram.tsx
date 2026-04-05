import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CHART_COLORS, TEXT_COLOR } from '../utils/colors';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { TOOLTIP_STYLE, makeTip, tipHtml } from '../utils/tooltipHelpers';

const SANKEY_NODES = ['Electronics', 'Clothing', 'Home', 'Sports', 'Books',
  'North', 'South', 'East', 'West'];
const SANKEY_LINKS = [
  { source: 0, target: 5, value: 120 }, { source: 0, target: 6, value: 90 },
  { source: 1, target: 5, value: 80 }, { source: 1, target: 7, value: 70 },
  { source: 2, target: 6, value: 60 }, { source: 2, target: 8, value: 50 },
  { source: 3, target: 7, value: 40 }, { source: 3, target: 5, value: 35 },
  { source: 4, target: 8, value: 30 }, { source: 4, target: 6, value: 25 },
];

export default function SankeyDiagram() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const { show, hide } = makeTip(tooltipRef.current);
    const W = 560, H = 340, pad = 20;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`);

    const nodeW = 16, nodeGap = 6;
    const leftX = pad + 40, rightX = W - pad - 40 - nodeW;

    // Separate left (category) and right (region) nodes
    const leftNodes = SANKEY_NODES.slice(0, 5);
    const rightNodes = SANKEY_NODES.slice(5);

    const lH = (H - pad * 2 - nodeGap * (leftNodes.length - 1)) / leftNodes.length;
    const rH = (H - pad * 2 - nodeGap * (rightNodes.length - 1)) / rightNodes.length;

    const ly = (i: number) => pad + i * (lH + nodeGap);
    const ry = (i: number) => pad + i * (rH + nodeGap);

    // Draw links
    SANKEY_LINKS.forEach(l => {
      const sy = ly(l.source) + lH / 2;
      const ty = ry(l.target - 5) + rH / 2;
      const path = d3.linkHorizontal()({ source: [leftX + nodeW, sy], target: [rightX, ty] } as any);
      svg.append('path').attr('d', path as string)
        .attr('fill', 'none')
        .attr('stroke', CHART_COLORS[l.source % CHART_COLORS.length])
        .attr('stroke-width', Math.max(1, l.value / 10))
        .attr('opacity', 0.4)
        .style('cursor', 'pointer')
        .on('mousemove', (event) => {
          d3.select(event.currentTarget as SVGPathElement).attr('opacity', 0.75);
          show(
            tipHtml(`${SANKEY_NODES[l.source]} → ${SANKEY_NODES[l.target]}`, [['Flow', String(l.value) + ' units']], CHART_COLORS[l.source % CHART_COLORS.length]),
            event.clientX, event.clientY
          );
        })
        .on('mouseleave', (event) => {
          d3.select(event.currentTarget as SVGPathElement).attr('opacity', 0.4);
          hide();
        });
    });

    // Left nodes
    leftNodes.forEach((n, i) => {
      svg.append('rect').attr('x', leftX).attr('y', ly(i)).attr('width', nodeW).attr('height', lH)
        .attr('fill', CHART_COLORS[i % CHART_COLORS.length]).attr('rx', 3)
        .style('cursor', 'pointer')
        .on('mousemove', (event) => {
          const total = SANKEY_LINKS.filter(l => l.source === i).reduce((s, l) => s + l.value, 0);
          show(tipHtml(n, [['Category', n], ['Total flow', String(total) + ' units']], CHART_COLORS[i % CHART_COLORS.length]), event.clientX, event.clientY);
        })
        .on('mouseleave', () => hide());
      svg.append('text').attr('x', leftX - 6).attr('y', ly(i) + lH / 2).attr('dy', 4)
        .attr('text-anchor', 'end').attr('fill', TEXT_COLOR).attr('font-size', 11).text(n)
        .style('pointer-events', 'none');
    });

    // Right nodes
    rightNodes.forEach((n, i) => {
      svg.append('rect').attr('x', rightX).attr('y', ry(i)).attr('width', nodeW).attr('height', rH)
        .attr('fill', CHART_COLORS[(i + 5) % CHART_COLORS.length]).attr('rx', 3)
        .style('cursor', 'pointer')
        .on('mousemove', (event) => {
          const total = SANKEY_LINKS.filter(l => l.target - 5 === i).reduce((s, l) => s + l.value, 0);
          show(tipHtml(n, [['Region', n], ['Incoming flow', String(total) + ' units']], CHART_COLORS[(i + 5) % CHART_COLORS.length]), event.clientX, event.clientY);
        })
        .on('mouseleave', () => hide());
      svg.append('text').attr('x', rightX + nodeW + 6).attr('y', ry(i) + rH / 2).attr('dy', 4)
        .attr('text-anchor', 'start').attr('fill', TEXT_COLOR).attr('font-size', 11).text(n)
        .style('pointer-events', 'none');
    });
  }, []);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Sankey Diagram</div>
      <div style={chartSubtitle}>Product category → sales region flow — hover links and nodes</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 560 }} />
      <div ref={tooltipRef} style={TOOLTIP_STYLE} />
    </div>
  );
}
