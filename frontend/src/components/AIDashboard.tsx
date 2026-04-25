import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSampleData } from '../hooks/useSampleData';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { CHART_COLORS } from '../utils/colors';

interface Insight {
  recommendations?: { chart_type: string; reason: string; priority: number }[];
  insights?: string[];
  suggested_title?: string;
  error?: string;
}

export default function AIDashboard() {
  const { data } = useSampleData('sales');
  const [result, setResult] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  // Check backend health on mount
  useEffect(() => {
    axios.get('/health')
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false));
  }, []);

  const runAnalysis = async () => {
    if (!data.length) return;
    setLoading(true);
    setError(null);
    try {
      const byRegion = data.reduce((acc: Record<string, number>, d: any) => {
        acc[d.region] = (acc[d.region] ?? 0) + d.total_amount;
        return acc;
      }, {});
      const summary = {
        dataset_shape: { rows: data.length, columns: 9 },
        column_groups: {
          numeric: ['quantity', 'unit_price', 'total_amount'],
          categorical: ['region', 'category'],
          datetime: ['order_date'],
        },
        region_revenue: byRegion,
      };
      const res = await axios.post('/api/insights?provider=copilot', { dataset_summary: summary });
      setResult(res.data);
      setBackendUp(true);
    } catch (e: any) {
      const detail: string = e.response?.data?.detail ?? '';
      if (!e.response) {
        setBackendUp(false);
        setError('Backend is not running. Start it with:\n\nuvicorn src.api:app --reload --port 8000');
      } else if (detail.toLowerCase().includes('github_token') || detail.toLowerCase().includes('github token')) {
        setError('GITHUB_TOKEN is not set.\n\nAdd it to your .env file:\n\nGITHUB_TOKEN=ghp_your_token_here\n\nThen restart the backend.');
      } else {
        setError(detail || 'GitHub Copilot analysis failed. Check the backend logs.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={chartCard}>
        <div style={chartTitle}>AI-Annotated Dashboard</div>
        <div style={chartSubtitle}>GitHub Copilot analyzes your sales data and generates insights</div>

        {/* Backend status badge */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: backendUp === true ? '#34d399' : backendUp === false ? '#f87171' : '#64748b',
          }} />
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {backendUp === true ? 'Backend connected' : backendUp === false ? 'Backend offline' : 'Checking backend…'}
          </span>
        </div>

        <button onClick={runAnalysis} disabled={loading || backendUp === false} style={{
          ...btnStyle,
          opacity: backendUp === false ? 0.45 : 1,
          cursor: backendUp === false ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Analyzing…' : '🤖 Run Copilot Analysis'}
        </button>

        {error && (
          <div style={errorBox}>
            {error.split('\n').map((line, i) =>
              line === '' ? <br key={i} /> :
              line.startsWith('source') || line.startsWith('cd') || line.startsWith('uvicorn') || line.startsWith('ANTHROPIC') ?
                <code key={i} style={codeStyle}>{line}</code> :
                <p key={i} style={{ margin: '4px 0', color: '#f87171', fontSize: '0.85rem' }}>{line}</p>
            )}
          </div>
        )}

        {backendUp === false && !error && (
          <div style={errorBox}>
            <p style={{ margin: '0 0 6px', color: '#f87171', fontSize: '0.85rem' }}>Backend is not running. Start it with:</p>
            <code style={codeStyle}>uvicorn src.api:app --reload --port 8000</code>
          </div>
        )}
      </div>

      {result && !result.error && (
        <>
          {result.suggested_title && (
            <div style={chartCard}>
              <div style={{ color: CHART_COLORS[0], fontWeight: 700, fontSize: '1.1rem' }}>
                {result.suggested_title}
              </div>
            </div>
          )}
          {result.insights && result.insights.length > 0 && (
            <div style={chartCard}>
              <div style={chartTitle}>Key Insights</div>
              <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                {result.insights.map((ins, i) => (
                  <li key={i} style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 8 }}>{ins}</li>
                ))}
              </ul>
            </div>
          )}
          {result.recommendations && result.recommendations.length > 0 && (
            <div style={chartCard}>
              <div style={chartTitle}>Visualization Recommendations</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
                {result.recommendations
                  .sort((a, b) => a.priority - b.priority)
                  .map((rec, i) => (
                    <div key={i} style={recCard(i)}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{rec.chart_type}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 4 }}>{rec.reason}</div>
                      <div style={{ marginTop: 6, fontSize: '0.72rem', color: CHART_COLORS[0] }}>
                        Priority {rec.priority}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
      {result?.error && (
        <div style={chartCard}>
          <p style={{ color: '#f87171' }}>{result.error}</p>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 22px',
  background: '#7c6af7',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: '0.9rem',
};

const errorBox: React.CSSProperties = {
  marginTop: 14,
  background: '#1a0a0a',
  border: '1px solid #450a0a',
  borderRadius: 8,
  padding: '12px 16px',
};

const codeStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'monospace',
  fontSize: '0.8rem',
  color: '#34d399',
  background: '#0d1a0f',
  padding: '3px 8px',
  borderRadius: 4,
  margin: '3px 0',
};

const recCard = (i: number): React.CSSProperties => ({
  background: '#23284a',
  borderRadius: 8,
  padding: '12px 14px',
  borderLeft: `3px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
});
