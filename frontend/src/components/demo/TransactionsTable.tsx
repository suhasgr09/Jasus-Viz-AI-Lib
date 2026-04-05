/**
 * Recent Transactions table with search, sort, and status badges.
 */
import React, { useState, useMemo } from 'react';
import { PaymentRow, SaleRow } from '../../hooks/useSalesPaymentData';

interface Props { payments: PaymentRow[]; sales: SaleRow[]; }

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  completed: { background: '#064e3b', color: '#34d399' },
  pending:   { background: '#451a03', color: '#f59e0b' },
  failed:    { background: '#450a0a', color: '#f87171' },
  refunded:  { background: '#0c1a3b', color: '#60a5fa' },
};

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type SortKey = 'payment_date' | 'amount' | 'net_amount' | 'processor_fee';

export default function TransactionsTable({ payments, sales }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('payment_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const salesMap = useMemo(() => new Map(sales.map(s => [s.order_id, s])), [sales]);
  const methods = useMemo(() => ['all', ...new Set(payments.map(p => p.payment_method))], [payments]);
  const PAGE_SIZE = 12;

  const filtered = useMemo(() => {
    let rows = payments;
    if (statusFilter !== 'all') rows = rows.filter(p => p.status === statusFilter);
    if (methodFilter !== 'all') rows = rows.filter(p => p.payment_method === methodFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(p =>
        String(p.payment_id).includes(q) ||
        String(p.order_id).includes(q) ||
        p.payment_method.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = sortKey === 'payment_date' ? a.payment_date : (a as any)[sortKey] as number;
      const bv = sortKey === 'payment_date' ? b.payment_date : (b as any)[sortKey] as number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [payments, statusFilter, methodFilter, search, sortKey, sortDir]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  };

  const th = (label: string, key?: SortKey): React.ReactNode => (
    <th style={thStyle} onClick={() => key && toggleSort(key)}>
      {label}{key === sortKey ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div>
      {/* Filters */}
      <div style={filterRow}>
        <input
          placeholder="Search by ID, method, region…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={inputStyle}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} style={selectStyle}>
          {['all', 'completed', 'pending', 'failed', 'refunded'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(0); }} style={selectStyle}>
          {methods.map(m => <option key={m} value={m}>{m === 'all' ? 'All Methods' : m}</option>)}
        </select>
        <span style={countStyle}>{filtered.length.toLocaleString()} rows</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2d3148' }}>
              {th('Pay ID')}
              {th('Order ID')}
              {th('Date', 'payment_date')}
              {th('Category')}
              {th('Region')}
              {th('Method')}
              {th('Gross', 'amount')}
              {th('Fee', 'processor_fee')}
              {th('Net', 'net_amount')}
              {th('Status')}
            </tr>
          </thead>
          <tbody>
            {visible.map((p, i) => {
              const sale = salesMap.get(p.order_id);
              return (
                <tr key={p.payment_id} style={rowStyle(i)}>
                  <td style={tdStyle}>#{p.payment_id}</td>
                  <td style={tdStyle}>#{p.order_id}</td>
                  <td style={tdStyle}>{p.payment_date}</td>
                  <td style={tdStyle}>{sale?.category ?? p.category}</td>
                  <td style={tdStyle}>{p.region}</td>
                  <td style={tdStyle}>{p.payment_method}</td>
                  <td style={{ ...tdStyle, color: '#e2e8f0' }}>{fmt(p.amount)}</td>
                  <td style={{ ...tdStyle, color: '#f87171' }}>−{fmt(p.processor_fee)}</td>
                  <td style={{ ...tdStyle, color: '#34d399', fontWeight: 600 }}>
                    {p.status === 'completed' ? fmt(p.net_amount) : '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, ...STATUS_STYLE[p.status] }}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={paginationRow}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtn}>‹ Prev</button>
          <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Page {page + 1} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} style={pageBtn}>Next ›</button>
        </div>
      )}
    </div>
  );
}

const filterRow: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 200, background: '#23284a', border: '1px solid #2d3148', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: '0.83rem', outline: 'none' };
const selectStyle: React.CSSProperties = { background: '#23284a', border: '1px solid #2d3148', borderRadius: 6, padding: '7px 10px', color: '#94a3b8', fontSize: '0.83rem', outline: 'none', cursor: 'pointer' };
const countStyle: React.CSSProperties = { fontSize: '0.78rem', color: '#475569', whiteSpace: 'nowrap' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' };
const thStyle: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.4, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '9px 10px', color: '#94a3b8', whiteSpace: 'nowrap' };
const rowStyle = (i: number): React.CSSProperties => ({ borderBottom: '1px solid #1e2235', background: i % 2 === 0 ? 'transparent' : '#161927' });
const badge: React.CSSProperties = { padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600 };
const paginationRow: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 };
const pageBtn: React.CSSProperties = { background: '#23284a', border: '1px solid #2d3148', borderRadius: 6, padding: '5px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.83rem' };
