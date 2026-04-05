import React from 'react';
import { DemoSummary } from '../../hooks/useSalesPaymentData';

interface Props { summary: DemoSummary; }

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(2)}`;

const CARDS = [
  {
    key: 'total_revenue',
    label: 'Total Revenue',
    icon: '💰',
    color: '#7c6af7',
    format: (s: DemoSummary) => fmt(s.total_revenue),
    sub: (s: DemoSummary) => `${s.total_orders.toLocaleString()} orders`,
  },
  {
    key: 'total_collected',
    label: 'Net Collected',
    icon: '✅',
    color: '#34d399',
    format: (s: DemoSummary) => fmt(s.total_collected),
    sub: (s: DemoSummary) => `After ${fmt(s.total_fees)} fees`,
  },
  {
    key: 'avg_order_value',
    label: 'Avg Order Value',
    icon: '🛒',
    color: '#f59e0b',
    format: (s: DemoSummary) => fmt(s.avg_order_value),
    sub: () => 'Per transaction',
  },
  {
    key: 'success_rate',
    label: 'Payment Success',
    icon: '📈',
    color: '#60a5fa',
    format: (s: DemoSummary) => `${s.payment_success_rate}%`,
    sub: (s: DemoSummary) => {
      const failed = s.status_counts['failed'] ?? 0;
      return `${failed} failed`;
    },
  },
];

export default function KPICards({ summary }: Props) {
  return (
    <div style={grid}>
      {CARDS.map(card => (
        <div key={card.key} style={cardStyle(card.color)}>
          <div style={iconRow}>
            <span style={iconStyle}>{card.icon}</span>
            <span style={labelStyle}>{card.label}</span>
          </div>
          <div style={valueStyle(card.color)}>{card.format(summary)}</div>
          <div style={subStyle}>{card.sub(summary)}</div>
          <div style={accentBar(card.color)} />
        </div>
      ))}
    </div>
  );
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
  gap: 16,
};
const cardStyle = (color: string): React.CSSProperties => ({
  background: '#1a1d2e',
  border: `1px solid ${color}33`,
  borderRadius: 12,
  padding: '18px 20px 14px',
  position: 'relative',
  overflow: 'hidden',
});
const iconRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 };
const iconStyle: React.CSSProperties = { fontSize: '1.3rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.78rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 };
const valueStyle = (color: string): React.CSSProperties => ({ fontSize: '1.85rem', fontWeight: 700, color, lineHeight: 1 });
const subStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#475569', marginTop: 6 };
const accentBar = (color: string): React.CSSProperties => ({
  position: 'absolute', bottom: 0, left: 0, right: 0,
  height: 3, background: color, opacity: 0.4,
});
