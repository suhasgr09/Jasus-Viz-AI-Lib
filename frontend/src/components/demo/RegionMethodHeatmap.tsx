/**
 * Region × Method heatmap: net collected per region per payment method.
 */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PaymentRow } from '../../hooks/useSalesPaymentData';
import { TEXT_COLOR } from '../../utils/colors';

interface Props { payments: PaymentRow[]; }

const METHODS = ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Crypto'];

export default function RegionMethodHeatmap({ payments }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!payments.length || !svgRef.current) return;

    const completed = payments.filter(p => p.status === 'completed');
    const regions = [...new Set(completed.map(p => p.region))].sort();

    const cells: { region: string; method: string; value: number }[] = [];
    regions.forEach(r =>
      METHODS.forEach(m => {
        const val = d3.sum(completed.filter(p => p.region === r && p.payment_method === m), p => p.net_amount);
        cells.push({ region: r, method: m, value: val });
      })
    );

    const W = 500, H = 300, m = { top: 15, right: 16, bottom: 80, left: 75 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${m.left},${m.top})`);

    const xScale = d3.scaleBand().domain(METHODS).range([0, w]).padding(0.06);
    const yScale = d3.scaleBand().domain(regions).range([0, h]).padding(0.06);
    const color = d3.scaleSequential(d3.interpolatePurples).domain([0, d3.max(cells, c => c.value)!]);

    svg.selectAll('.cell').data(cells).join('rect')
      .attr('x', d => xScale(d.method)!).attr('y', d => yScale(d.region)!)
      .attr('width', xScale.bandwidth()).attr('height', yScale.bandwidth())
      .attr('rx', 4).attr('fill', d => d.value > 0 ? color(d.value) : '#1e2235')
      .append('title')
      .text(d => `${d.region} · ${d.method}: $${(d.value / 1000).toFixed(1)}k`);

    svg.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 9.5)
        .attr('transform', 'rotate(-35)').attr('text-anchor', 'end'));

    svg.append('g').call(d3.axisLeft(yScale))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 11));
  }, [payments]);

  return <svg ref={svgRef} style={{ width: '100%' }} />;
}
