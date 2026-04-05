/**
 * Payment Status funnel – shows completed → pending → failed → refunded counts.
 */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PaymentRow } from '../../hooks/useSalesPaymentData';
import { TEXT_COLOR } from '../../utils/colors';

interface Props { payments: PaymentRow[]; }

const STATUS_ORDER = ['completed', 'pending', 'refunded', 'failed'] as const;
const STATUS_COLOR: Record<string, string> = {
  completed: '#34d399', pending: '#f59e0b', refunded: '#60a5fa', failed: '#f87171',
};

export default function PaymentStatusFunnel({ payments }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!payments.length || !svgRef.current) return;

    const counts: Record<string, number> = {};
    payments.forEach(p => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    const data = STATUS_ORDER.map(s => ({ status: s, count: counts[s] ?? 0 }));
    const total = payments.length;

    const W = 420, H = 300;
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`);

    const maxCount = d3.max(data, d => d.count)!;
    const maxWidth = W * 0.65;
    const barH = 44, gapY = 14, startY = 28;

    data.forEach(({ status, count }, i) => {
      const pct = count / total;
      const bw = (count / maxCount) * maxWidth;
      const bx = (W * 0.72 - bw) / 2;
      const by = startY + i * (barH + gapY);

      // Trapezoid-style funnel bar using path
      const nextCount = data[i + 1]?.count ?? count * 0.5;
      const nextBW = (nextCount / maxCount) * maxWidth;
      const path = i < data.length - 1
        ? `M${bx},${by} L${bx + bw},${by} L${bx + bw + (bw - nextBW) / 2 - (bw - nextBW) / 2},${by + barH} L${bx},${by + barH} Z`
        : `M${bx},${by} L${bx + bw},${by} L${bx + bw},${by + barH} L${bx},${by + barH} Z`;

      svg.append('path').attr('d', path).attr('fill', STATUS_COLOR[status]).attr('opacity', 0.85).attr('rx', 4)
        .append('title').text(`${status}: ${count} (${(pct * 100).toFixed(1)}%)`);

      // Status label (left)
      svg.append('text').attr('x', bx - 8).attr('y', by + barH / 2 + 4)
        .attr('text-anchor', 'end').attr('fill', TEXT_COLOR).attr('font-size', 12)
        .attr('font-weight', 600).attr('text-transform', 'capitalize')
        .text(status.charAt(0).toUpperCase() + status.slice(1));

      // Count label (right)
      svg.append('text').attr('x', bx + bw + 10).attr('y', by + barH / 2 + 4)
        .attr('fill', STATUS_COLOR[status]).attr('font-size', 12).attr('font-weight', 700)
        .text(`${count.toLocaleString()}`);

      // Percentage label (inside bar)
      if (bw > 60) {
        svg.append('text').attr('x', bx + bw / 2).attr('y', by + barH / 2 + 4)
          .attr('text-anchor', 'middle').attr('fill', '#fff').attr('font-size', 11).attr('font-weight', 700)
          .text(`${(pct * 100).toFixed(1)}%`);
      }
    });

    // Title
    svg.append('text').attr('x', W / 2).attr('y', 14)
      .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', 11)
      .text(`${total.toLocaleString()} total payments`);
  }, [payments]);

  return <svg ref={svgRef} style={{ width: '100%' }} />;
}
