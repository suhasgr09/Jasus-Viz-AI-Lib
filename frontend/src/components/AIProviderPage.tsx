import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { logEvent } from '../utils/analytics';

// ── types ─────────────────────────────────────────────────────────────────────

export type Provider = 'gemini' | 'claude' | 'openai';

interface Recommendation { chart_type: string; reason: string; priority: number }
interface AIResult {
  recommendations?: Recommendation[];
  insights?: string[];
  suggested_title?: string;
  error?: string;
}

export interface ProviderConfig {
  provider: Provider;
  label: string;
  emoji: string;
  color: string;
  modelLabel: string;
  envKey: string;
  docsUrl: string;
}

// ── constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<number, string> = {
  1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#10b981', 5: '#8b5cf6',
};

// ── component ─────────────────────────────────────────────────────────────────

export default function AIProviderPage({ config }: { config: ProviderConfig }) {
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  useEffect(() => {
    axios.get('/health')
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false));
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // Realistic sample sales summary
      const summary = {
        dataset_shape: { rows: 1200, columns: 9 },
        column_groups: {
          numeric: ['quantity', 'unit_price', 'total_amount'],
          categorical: ['region', 'category', 'payment_method'],
          datetime: ['order_date'],
        },
        region_revenue: { North: 142300, South: 98700, East: 115400, West: 131200 },
        top_categories: ['Electronics', 'Clothing', 'Food'],
      };
      const res = await axios.post(
        `/api/insights?provider=${config.provider}`,
        { dataset_summary: summary },
      );
      setResult(res.data);
      setBackendUp(true);
      logEvent('ai_analysis', `${config.label} Analysis`, 'AI Providers', { provider: config.provider, status: 'success' });
    } catch (e: any) {
      const detail: string = e.response?.data?.detail ?? '';
      logEvent('ai_analysis', `${config.label} Analysis`, 'AI Providers', { provider: config.provider, status: 'error', error: detail || 'unknown' });
      if (!e.response) {
        setBackendUp(false);
        setError('Backend is not running. Start it with the Launcher.');
      } else if (detail.toLowerCase().includes('api_key') || detail.toLowerCase().includes('api key')) {
        setError(`${config.envKey} is not set.\n\nAdd it to your .env file:\n\n${config.envKey}=your-key-here`);
      } else {
        setError(detail || `${config.label} analysis failed. Check the backend logs.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div style={{ ...chartCard, borderTop: `3px solid ${config.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{config.emoji}</span>
          <div>
            <div style={chartTitle}>{config.label} Analysis</div>
            <div style={chartSubtitle}>{config.modelLabel}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {/* Backend status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: backendUp === true ? '#34d399' : backendUp === false ? '#f87171' : '#64748b',
              }} />
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {backendUp === true ? 'Backend connected' : backendUp === false ? 'Backend offline' : 'Checking…'}
              </span>
            </div>
            {/* Docs link */}
            <a href={config.docsUrl} target="_blank" rel="noreferrer"
               style={{ fontSize: '0.74rem', color: config.color, textDecoration: 'none' }}>
              API Docs ↗
            </a>
          </div>
        </div>

        {/* API key hint */}
        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: '#0f1117', borderRadius: 8,
          border: '1px solid #2d3148', fontFamily: 'Menlo, monospace', fontSize: '0.78rem',
          color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#64748b' }}>🔑</span>
          <span>Set <strong style={{ color: config.color }}>{config.envKey}</strong> in your <code>.env</code> file to enable this provider.</span>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading || backendUp === false}
          style={{
            marginTop: 16, padding: '10px 24px',
            background: loading ? '#334155' : config.color,
            color: 'black', border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Analysing…' : `Run ${config.label} Analysis`}
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          ...chartCard, background: '#1f1215', borderLeft: '4px solid #ef4444',
          fontFamily: 'Menlo, monospace', fontSize: '0.82rem', color: '#fca5a5',
          whiteSpace: 'pre-wrap',
        }}>
          {error}
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {result && !result.error && (
        <>
          {result.suggested_title && (
            <div style={{ ...chartCard, borderLeft: `4px solid ${config.color}` }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Suggested Title</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>{result.suggested_title}</div>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div style={chartCard}>
              <div style={chartTitle}>Chart Recommendations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {result.recommendations
                  .sort((a, b) => a.priority - b.priority)
                  .map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', background: '#0f1117',
                      borderRadius: 8, border: '1px solid #2d3148',
                    }}>
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: '50%',
                        background: PRIORITY_COLOR[r.priority] ?? '#6c63ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                      }}>{r.priority}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>{r.chart_type}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>{r.reason}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {result.insights && result.insights.length > 0 && (
            <div style={chartCard}>
              <div style={chartTitle}>Key Insights</div>
              <ul style={{ margin: '14px 0 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.insights.map((ins, i) => (
                  <li key={i} style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>{ins}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {result?.error && (
        <div style={{ ...chartCard, borderLeft: `4px solid #ef4444`, color: '#fca5a5', fontFamily: 'Menlo, monospace', fontSize: '0.82rem' }}>
          {result.error}
        </div>
      )}
    </div>
  );
}
