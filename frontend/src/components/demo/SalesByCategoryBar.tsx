/**
 * Horizontal bar chart: Revenue and Net Collected by Product Category.
 */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SaleRow, PaymentRow } from '../../hooks/useSalesPaymentData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../../utils/colors';

interface Props { sales: SaleRow[]; payments: PaymentRow[]; }

export default function SalesByCategoryBar({ sales, payments }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!sales.length || !svgRef.current) return;

    const revByCat = d3.rollup(sales, v => d3.sum(v, r => r.total_amount), r => r.category);
    const netByCat = d3.rollup(
      payments.filter(p => p.status === 'completed'),
      v => d3.sum(v, r => r.net_amount),
      r => r.category
    );
    const categories = [...revByCat.keys()].sort();

    const W = 540, H = 320, m = { top: 15, right: 20, bottom: 40, left: 110 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${m.left},${m.top})`);

    const y = d3.scaleBand().domain(categories).range([0, h]).padding(0.25);
    const x = d3.scaleLinear().domain([0, d3.max(categories, c => revByCat.get(c) ?? 0)! * 1.1]).range([0, w]);
    const innerBand = d3.scaleBand().domain(['revenue', 'net']).range([0, y.bandwidth()]).padding(0.1);

    // Grid
    svg.append('g').call(d3.axisBottom(x).tickSize(h).tickFormat(() => ''))
      .attr('transform', 'translate(0,0)')
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('opacity', 0.4));

    categories.forEach((cat, ci) => {
      const rev = revByCat.get(cat) ?? 0;
      const net = netByCat.get(cat) ?? 0;

      // Revenue bar
      svg.append('rect')
        .attr('x', 0).attr('y', y(cat)! + innerBand('revenue')!)
        .attr('height', innerBand.bandwidth()).attr('width', 0).attr('rx', 3)
        .attr('fill', CHART_COLORS[ci % CHART_COLORS.length]).attr('opacity', 0.85)
        .transition().duration(700).delay(ci * 60)
        .attr('width', x(rev));

      // Net bar
      svg.append('rect')
        .attr('x', 0).attr('y', y(cat)! + innerBand('net')!)
        .attr('height', innerBand.bandwidth()).attr('width', 0).attr('rx', 3)
        .attr('fill', CHART_COLORS[(ci + 5) % CHART_COLORS.length]).attr('opacity', 0.55)
        .transition().duration(700).delay(ci * 60)
        .attr('width', x(net));

      // Labels
      svg.append('text').attr('x', x(rev) + 5).attr('y', y(cat)! + innerBand('revenue')! + innerBand.bandwidth() / 2 + 4)
        .attr('fill', TEXT_COLOR).attr('font-size', 9)
        .text(`$${(rev / 1000).toFixed(0)}k`);
    });

    svg.append('g').call(d3.axisLeft(y)).call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 11));
    svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9));

    // Legend
    [{ label: 'Gross Revenue', idx: 0 }, { label: 'Net Collected', idx: 5 }].forEach(({ label, idx }, li) => {
      svg.append('rect').attr('x', w - 110).attr('y', li * 16).attr('width', 10).attr('height', 10).attr('rx', 2)
        .attr('fill', CHART_COLORS[idx % CHART_COLORS.length]).attr('opacity', li === 0 ? 0.85 : 0.55);
      svg.append('text').attr('x', w - 96).attr('y', li * 16 + 9).attr('fill', TEXT_COLOR).attr('font-size', 9).text(label);
    });
  }, [sales, payments]);

  return <svg ref={svgRef} style={{ width: '100%' }} />;
}
