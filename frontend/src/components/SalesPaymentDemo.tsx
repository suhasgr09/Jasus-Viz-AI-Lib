/**
 * Sales & Payments Demo Dashboard
 * Self-contained page — works with or without the FastAPI backend.
 */
import React, { useRef } from 'react';
import { useSalesPaymentData } from '../hooks/useSalesPaymentData';
import KPICards from './demo/KPICards';
import RevenueVsPaymentsChart from './demo/RevenueVsPaymentsChart';
import PaymentMethodDonut from './demo/PaymentMethodDonut';
import SalesByCategoryBar from './demo/SalesByCategoryBar';
import PaymentStatusFunnel from './demo/PaymentStatusFunnel';
import RegionMethodHeatmap from './demo/RegionMethodHeatmap';
import TransactionsTable from './demo/TransactionsTable';

// ── styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0f1117',
    color: '#e2e8f0',
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    padding: '28px 32px 48px',
    overflowX: 'hidden',
  },
  header: {
    marginBottom: 28,
    borderBottom: '1px solid #2d3148',
    paddingBottom: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 700,
    margin: 0,
    background: 'linear-gradient(90deg, #7c6af7, #34d399)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: '0.9rem',
  },
  badges: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    background: '#1a1d2e',
    border: '1px solid #2d3148',
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: '0.78rem',
    color: '#94a3b8',
  },
  badgeAccent: {
    background: '#1e1a3c',
    border: '1px solid #4c3f9e',
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: '0.78rem',
    color: '#7c6af7',
    fontWeight: 600,
  },
  // 2-col grid for charts
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: 20,
    marginBottom: 20,
  },
  card: {
    background: '#1a1d2e',
    border: '1px solid #2d3148',
    borderRadius: 14,
    padding: '20px 22px 16px',
  },
  cardTitle: {
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#c7d2fe',
    margin: '0 0 2px',
  },
  cardSub: {
    fontSize: '0.76rem',
    color: '#475569',
    margin: '0 0 16px',
  },
  fullCard: {
    background: '#1a1d2e',
    border: '1px solid #2d3148',
    borderRadius: 14,
    padding: '20px 22px 16px',
    marginBottom: 20,
  },
  // loading / error
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 16,
    color: '#475569',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #2d3148',
    borderTop: '3px solid #7c6af7',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// ── Spinner CSS keyframe (injected once) ─────────────────────────────────────
let injected = false;
function injectSpinCSS() {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SalesPaymentDemo() {
  injectSpinCSS();
  const { data, loading } = useSalesPaymentData();
  const error: string | null = null;
  const topRef = useRef<HTMLDivElement>(null);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.center}>
          <div style={s.spinner} />
          <span>Loading demo data…</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={s.page}>
        <div style={s.center}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p>{error ?? 'No data available'}</p>
        </div>
      </div>
    );
  }

  const { sales, payments, summary } = data;
  const dateRange = payments.length
    ? `${payments[payments.length - 1]?.payment_date?.slice(0, 7)} – ${payments[0]?.payment_date?.slice(0, 7)}`
    : '';

  // ── Dashboard ────────────────────────────────────────────────────────────
  return (
    <div style={s.page} ref={topRef}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Sales &amp; Payments Dashboard</h1>
          <p style={s.subtitle}>Live demo · Synthetic data · All values are illustrative</p>
        </div>
        <div style={s.badges}>
          <span style={s.badgeAccent}>🎯 Demo Mode</span>
          <span style={s.badge}>📦 {sales.length.toLocaleString()} orders</span>
          <span style={s.badge}>💳 {payments.length.toLocaleString()} payments</span>
          {dateRange && <span style={s.badge}>🗓 {dateRange}</span>}
        </div>
      </div>

      {/* KPI Row */}
      <KPICards summary={summary} />

      {/* Charts — row 1 */}
      <div style={s.chartGrid}>
        <div style={s.card}>
          <p style={s.cardTitle}>Revenue vs Net Collected</p>
          <p style={s.cardSub}>Monthly gross revenue compared to net collected after fees</p>
          <RevenueVsPaymentsChart payments={payments} sales={sales} />
        </div>
        <div style={s.card}>
          <p style={s.cardTitle}>Payment Method Breakdown</p>
          <p style={s.cardSub}>Net collected by payment method</p>
          <PaymentMethodDonut payments={payments} />
        </div>
      </div>

      {/* Charts — row 2 */}
      <div style={s.chartGrid}>
        <div style={s.card}>
          <p style={s.cardTitle}>Revenue by Product Category</p>
          <p style={s.cardSub}>Gross revenue vs net collected per category</p>
          <SalesByCategoryBar payments={payments} sales={sales} />
        </div>
        <div style={s.card}>
          <p style={s.cardTitle}>Payment Status Funnel</p>
          <p style={s.cardSub}>Transaction outcomes from completed to failed</p>
          <PaymentStatusFunnel payments={payments} />
        </div>
      </div>

      {/* Charts — row 3: full-width heatmap */}
      <div style={s.fullCard}>
        <p style={s.cardTitle}>Regional × Method Heatmap</p>
        <p style={s.cardSub}>Net collected per region and payment method</p>
        <RegionMethodHeatmap payments={payments} />
      </div>

      {/* Transactions Table */}
      <div style={s.fullCard}>
        <p style={s.cardTitle}>Recent Transactions</p>
        <p style={s.cardSub}>Searchable, sortable log of all payment records</p>
        <TransactionsTable payments={payments} sales={sales} />
      </div>
    </div>
  );
}
