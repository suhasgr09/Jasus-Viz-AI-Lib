import React, { useState, useCallback } from 'react';
import {
  getEvents,
  clearEvents,
  countByLabel,
  countBySection,
  formatTime,
  AnalyticsEvent,
} from '../utils/analytics';
import { chartCard, chartTitle } from '../utils/chartStyles';

// ── colour palette ─────────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  Charts:        '#6c63ff',
  'AI Providers':'#3b82f6',
  'AI Tools':    '#8b5cf6',
  Demos:         '#f59e0b',
  Analytics:     '#10b981',
  Upload:        '#ec4899',
};

const EVENT_COLORS: Record<string, string> = {
  page_view:    '#6c63ff',
  ai_analysis:  '#3b82f6',
  file_upload:  '#ec4899',
  button_click: '#f59e0b',
};

const colorFor = (key: string, map: Record<string, string>, fallback = '#64748b') =>
  map[key] ?? fallback;

// ── sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      ...chartCard,
      flex: '1 1 160px', minWidth: 160,
      borderTop: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

function HorizontalBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <div style={{ width: 180, fontSize: '0.78rem', color: '#94a3b8', flexShrink: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 18, background: '#1e2035', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 4,
          transition: 'width 0.4s ease',
          minWidth: count > 0 ? 4 : 0,
        }} />
      </div>
      <div style={{ width: 36, fontSize: '0.78rem', color: '#94a3b8', textAlign: 'right', flexShrink: 0 }}>
        {count}
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: AnalyticsEvent }) {
  return (
    <tr>
      <td style={tdStyle}>{formatTime(event.timestamp)}</td>
      <td style={tdStyle}>
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
          background: colorFor(event.type, EVENT_COLORS) + '22',
          color: colorFor(event.type, EVENT_COLORS),
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {event.type.replace('_', ' ')}
        </span>
      </td>
      <td style={tdStyle}>{event.label}</td>
      <td style={{ ...tdStyle, color: colorFor(event.section, SECTION_COLORS) }}>
        {event.section}
      </td>
      <td style={{ ...tdStyle, fontFamily: 'Menlo, monospace', fontSize: '0.68rem', color: '#475569' }}>
        {event.metadata ? JSON.stringify(event.metadata) : '—'}
      </td>
    </tr>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #1e2035',
  fontSize: '0.78rem',
  color: '#94a3b8',
  verticalAlign: 'middle',
};

// ── main component ─────────────────────────────────────────────────────────

export default function UsageReportPage() {
  const [events, setEvents] = useState<AnalyticsEvent[]>(() => getEvents());
  const [confirmClear, setConfirmClear] = useState(false);

  const reload = useCallback(() => setEvents(getEvents()), []);

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearEvents();
    setEvents([]);
    setConfirmClear(false);
  };

  // ── derived stats ────────────────────────────────────────────────────────
  const pageViews    = events.filter(e => e.type === 'page_view');
  const aiRuns       = events.filter(e => e.type === 'ai_analysis');
  const uploads      = events.filter(e => e.type === 'file_upload');
  const aiSuccesses  = aiRuns.filter(e => e.metadata?.status === 'success').length;

  const topPages     = countByLabel(pageViews).slice(0, 12);
  const topSections  = countBySection(events);
  const aiByProvider = (['gemini', 'claude', 'openai'] as const).map(p => ({
    label: p.charAt(0).toUpperCase() + p.slice(1),
    count: aiRuns.filter(e => e.metadata?.provider === p).length,
  }));

  const maxPageCount    = topPages[0]?.count ?? 1;
  const maxSectionCount = topSections[0]?.count ?? 1;
  const maxAiCount      = Math.max(...aiByProvider.map(x => x.count), 1);

  const recentEvents = [...events].reverse().slice(0, 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ ...chartTitle, fontSize: '1.3rem' }}>📊 Usage Report</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
            Events logged in this browser session — {events.length.toLocaleString()} total
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={reload} style={actionBtn('#6c63ff')}>↻ Refresh</button>
          <button
            onClick={handleClear}
            style={actionBtn(confirmClear ? '#ef4444' : '#475569')}
            onBlur={() => setConfirmClear(false)}
          >
            {confirmClear ? 'Click again to confirm' : '🗑 Clear log'}
          </button>
        </div>
      </div>

      {events.length === 0 && (
        <div style={{ ...chartCard, textAlign: 'center', padding: 48, color: '#475569' }}>
          No events recorded yet. Navigate around the app to generate activity data.
        </div>
      )}

      {events.length > 0 && (
        <>
          {/* ── Summary stats ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <StatCard label="Total Events"    value={events.length}   color="#6c63ff" />
            <StatCard label="Page Views"      value={pageViews.length} color="#3b82f6" />
            <StatCard label="AI Analyses"     value={aiRuns.length}   color="#8b5cf6" />
            <StatCard label="AI Successes"    value={aiSuccesses}     color="#10b981" />
            <StatCard label="File Uploads"    value={uploads.length}  color="#ec4899" />
          </div>

          {/* ── Charts row ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

            {/* Top pages */}
            <div style={{ ...chartCard, flex: '2 1 340px' }}>
              <div style={{ ...chartTitle, marginBottom: 14 }}>Most Visited Pages</div>
              {topPages.length === 0
                ? <div style={{ color: '#475569', fontSize: '0.78rem' }}>No page views yet.</div>
                : topPages.map(({ label, count }) => (
                    <HorizontalBar
                      key={label}
                      label={label}
                      count={count}
                      max={maxPageCount}
                      color="#6c63ff"
                    />
                  ))
              }
            </div>

            {/* Section breakdown */}
            <div style={{ ...chartCard, flex: '1 1 220px' }}>
              <div style={{ ...chartTitle, marginBottom: 14 }}>By Section</div>
              {topSections.map(({ section, count }) => (
                <HorizontalBar
                  key={section}
                  label={section}
                  count={count}
                  max={maxSectionCount}
                  color={colorFor(section, SECTION_COLORS)}
                />
              ))}
            </div>
          </div>

          {/* ── AI Provider usage ────────────────────────────────────────── */}
          <div style={{ ...chartCard }}>
            <div style={{ ...chartTitle, marginBottom: 14 }}>AI Provider Usage</div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {aiByProvider.map(({ label, count }) => {
                const colors: Record<string, string> = { Gemini: '#3b82f6', Claude: '#a78bfa', OpenAI: '#10b981' };
                const pct = maxAiCount === 0 ? 0 : Math.round((count / maxAiCount) * 100);
                return (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      fontSize: '1.5rem', fontWeight: 700,
                      color: colors[label] ?? '#6c63ff',
                    }}>{count}</div>
                    <div style={{
                      width: 80, background: '#1e2035', borderRadius: 6, overflow: 'hidden',
                      height: 8,
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: colors[label] ?? '#6c63ff',
                        borderRadius: 6,
                      }} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{label}</div>
                  </div>
                );
              })}
              {aiRuns.length === 0 && (
                <div style={{ color: '#475569', fontSize: '0.78rem' }}>
                  No AI analyses run yet. Visit a provider page and click Run Analysis.
                </div>
              )}
            </div>
          </div>

          {/* ── Activity log ─────────────────────────────────────────────── */}
          <div style={{ ...chartCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2035' }}>
              <div style={chartTitle}>Recent Activity Log</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                Last {recentEvents.length} events (most recent first)
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['Time', 'Type', 'Label', 'Section', 'Metadata'].map(h => (
                      <th key={h} style={{
                        ...tdStyle,
                        color: '#64748b', fontWeight: 600,
                        fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.7,
                        borderBottom: '2px solid #2d3148',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map(event => (
                    <ActivityRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const actionBtn = (color: string): React.CSSProperties => ({
  padding: '7px 16px',
  background: 'transparent',
  border: `1px solid ${color}`,
  borderRadius: 7,
  color,
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 600,
  transition: 'background 0.15s',
});
