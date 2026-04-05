/**
 * Payment Method breakdown – animated donut chart.
 */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PaymentRow } from '../../hooks/useSalesPaymentData';
import { CHART_COLORS, TEXT_COLOR } from '../../utils/colors';

interface Props { payments: PaymentRow[]; }

export default function PaymentMethodDonut({ payments }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!payments.length || !svgRef.current) return;

    const completed = payments.filter(p => p.status === 'completed');
    const byMethod = d3.rollup(completed, v => d3.sum(v, r => r.net_amount), r => r.payment_method);
    const data = Array.from(byMethod, ([method, value]) => ({ method, value }))
      .sort((a, b) => b.value - a.value);

    const W = 420, H = 340, cx = 170, cy = H / 2, R = 120, IR = 62;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${cx},${cy})`);

    const pie = d3.pie<{ method: string; value: number }>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ method: string; value: number }>>()
      .innerRadius(IR).outerRadius(R);
    const arcHover = d3.arc<d3.PieArcDatum<{ method: string; value: number }>>()
      .innerRadius(IR).outerRadius(R + 10);

    const arcs = pie(data);
    const paths = svg.selectAll('path').data(arcs).join('path')
      .attr('fill', (_, i) => CHART_COLORS[i % CHART_COLORS.length])
      .attr('stroke', '#0f1117').attr('stroke-width', 2)
      .on('mouseenter', function(_, d) { d3.select(this).transition().duration(150).attr('d', arcHover(d) as string); })
      .on('mouseleave', function(_, d) { d3.select(this).transition().duration(150).attr('d', arc(d) as string); });

    // Animate sweep
    paths.transition().duration(900).ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t: number) => arc(i(t) as any) as string;
      });

    // Center label
    const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;
    const total = d3.sum(data, d => d.value);
    svg.append('text').attr('text-anchor', 'middle').attr('y', -8)
      .attr('fill', '#e2e8f0').attr('font-size', 18).attr('font-weight', 700).text(fmt(total));
    svg.append('text').attr('text-anchor', 'middle').attr('y', 12)
      .attr('fill', '#64748b').attr('font-size', 11).text('Net Collected');

    // Legend (right side)
    const lg = d3.select(svgRef.current).append('g').attr('transform', `translate(${cx * 2 + 10}, 30)`);
    data.forEach(({ method, value }, i) => {
      const pct = ((value / total) * 100).toFixed(1);
      lg.append('rect').attr('y', i * 36).attr('width', 12).attr('height', 12).attr('rx', 3)
        .attr('fill', CHART_COLORS[i % CHART_COLORS.length]);
      lg.append('text').attr('x', 18).attr('y', i * 36 + 10)
        .attr('fill', TEXT_COLOR).attr('font-size', 11).attr('font-weight', 500).text(method);
      lg.append('text').attr('x', 18).attr('y', i * 36 + 25)
        .attr('fill', '#475569').attr('font-size', 10).text(`${fmt(value)} · ${pct}%`);
    });
  }, [payments]);

  return <svg ref={svgRef} style={{ width: '100%' }} />;
}
