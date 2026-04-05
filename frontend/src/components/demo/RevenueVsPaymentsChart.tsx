/**
 * Revenue vs Net Payments – dual-line monthly chart.
 */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SaleRow, PaymentRow } from '../../hooks/useSalesPaymentData';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../../utils/colors';

interface Props { sales: SaleRow[]; payments: PaymentRow[]; }

export default function RevenueVsPaymentsChart({ sales, payments }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!sales.length || !svgRef.current) return;

    const byMonth = (rows: { date: string; amount: number }[]) =>
      Array.from(
        d3.rollup(rows, v => d3.sum(v, r => r.amount), r => r.date.slice(0, 7)),
        ([m, v]) => ({ month: new Date(m + '-01'), value: v })
      ).sort((a, b) => +a.month - +b.month);

    const revSeries = byMonth(sales.map(s => ({ date: s.order_date, amount: s.total_amount })));
    const paySeriesMap = d3.rollup(
      payments.filter(p => p.status === 'completed'),
      v => d3.sum(v, r => r.net_amount),
      r => r.payment_date.slice(0, 7)
    );
    const paySeries = revSeries.map(d => ({
      month: d.month,
      value: paySeriesMap.get(d.month.toISOString().slice(0, 7)) ?? 0,
    }));

    const W = 680, H = 300, m = { top: 20, right: 120, bottom: 50, left: 75 };
    const w = W - m.left - m.right, h = H - m.top - m.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${m.left},${m.top})`);

    const allMonths = revSeries.map(d => d.month);
    const x = d3.scaleTime().domain(d3.extent(allMonths) as [Date, Date]).range([0, w]);
    const maxVal = d3.max([...revSeries, ...paySeries], d => d.value)! * 1.12;
    const y = d3.scaleLinear().domain([0, maxVal]).range([h, 0]);

    // Grid
    svg.append('g').call(d3.axisLeft(y).tickSize(-w).tickFormat(() => ''))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('opacity', 0.5));

    const lineGen = (key: 'value') =>
      d3.line<{ month: Date; value: number }>().x(d => x(d.month)).y(d => y(d[key])).curve(d3.curveMonotoneX);

    // Area fills
    const areaGen = (series: typeof revSeries, color: string) => {
      const area = d3.area<{ month: Date; value: number }>()
        .x(d => x(d.month)).y0(h).y1(d => y(d.value)).curve(d3.curveMonotoneX);
      svg.append('path').datum(series).attr('fill', color).attr('opacity', 0.08).attr('d', area);
    };
    areaGen(revSeries, CHART_COLORS[0]);
    areaGen(paySeries, CHART_COLORS[1]);

    // Lines
    const drawLine = (series: typeof revSeries, color: string) => {
      const path = svg.append('path').datum(series)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5)
        .attr('d', lineGen('value'));
      const len = (path.node() as SVGPathElement).getTotalLength();
      path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
        .transition().duration(1100).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0);
    };
    drawLine(revSeries, CHART_COLORS[0]);
    drawLine(paySeries, CHART_COLORS[1]);

    // Axes
    svg.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y') as any).ticks(8))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10)
        .attr('transform', 'rotate(-30)').attr('text-anchor', 'end'));
    svg.append('g').call(d3.axisLeft(y).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
      .call(g => g.select('.domain').attr('stroke', GRID_COLOR))
      .call(g => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));

    // Legend
    [
      { label: 'Gross Revenue', color: CHART_COLORS[0] },
      { label: 'Net Collected', color: CHART_COLORS[1] },
    ].forEach(({ label, color }, i) => {
      const ly = i * 20;
      svg.append('line').attr('x1', w + 8).attr('x2', w + 22).attr('y1', ly + 6).attr('y2', ly + 6)
        .attr('stroke', color).attr('stroke-width', 2.5);
      svg.append('text').attr('x', w + 26).attr('y', ly + 10).attr('fill', TEXT_COLOR).attr('font-size', 11).text(label);
    });
  }, [sales, payments]);

  return <svg ref={svgRef} style={{ width: '100%' }} />;
}
