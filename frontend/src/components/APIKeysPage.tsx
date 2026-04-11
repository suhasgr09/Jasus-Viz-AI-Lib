import React from 'react';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';

const PROVIDERS = [
  {
    emoji: '💎', label: 'Google Gemini', envKey: 'GEMINI_API_KEY',
    color: '#3b82f6', model: 'gemini-2.0-flash',
    docsUrl: 'https://aistudio.google.com/app/apikeys',
    docsLabel: 'Google AI Studio',
    steps: [
      'Go to Google AI Studio → API keys',
      'Click "Create API key"',
      'Copy the key',
      'Paste as GEMINI_API_KEY in your .env file',
    ],
  },
  {
    emoji: '🧠', label: 'Anthropic Claude', envKey: 'ANTHROPIC_API_KEY',
    color: '#a78bfa', model: 'claude-sonnet-4-5',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Anthropic Console',
    steps: [
      'Go to Anthropic Console → API Keys',
      'Click "Create Key"',
      'Copy the key (shown only once)',
      'Paste as ANTHROPIC_API_KEY in your .env file',
    ],
  },
  {
    emoji: '⚡', label: 'OpenAI GPT-4o', envKey: 'OPENAI_API_KEY',
    color: '#10b981', model: 'gpt-4o',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'OpenAI Platform',
    steps: [
      'Go to OpenAI Platform → API Keys',
      'Click "Create new secret key"',
      'Copy the key (shown only once)',
      'Paste as OPENAI_API_KEY in your .env file',
    ],
  },
];

const envBlock = `# ── AI Provider API Keys ──────────────────────────────────────────
# Add your keys below. All three providers are supported.
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=`;

export default function APIKeysPage() {
  const [copied, setCopied] = React.useState(false);

  const copyEnv = () => {
    navigator.clipboard.writeText(envBlock).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={chartCard}>
        <div style={chartTitle}>🔑 API Keys</div>
        <div style={chartSubtitle}>
          All keys are stored in your <code style={{ color: '#6c63ff' }}>.env</code> file at the project root —
          never committed to version control.
        </div>

        {/* .env snippet */}
        <div style={{
          marginTop: 16, background: '#0a0c12',
          border: '1px solid #2d3148', borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', background: '#1a1d27', borderBottom: '1px solid #2d3148',
          }}>
            <span style={{ fontFamily: 'Menlo, monospace', fontSize: '0.75rem', color: '#64748b' }}>.env</span>
            <button onClick={copyEnv} style={{
              background: 'none', border: '1px solid #2d3148', borderRadius: 6,
              color: copied ? '#34d399' : '#94a3b8', padding: '3px 10px',
              fontSize: '0.72rem', cursor: 'pointer',
            }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre style={{
            margin: 0, padding: '14px 16px',
            fontFamily: 'Menlo, monospace', fontSize: '0.8rem',
            color: '#94a3b8', whiteSpace: 'pre', overflowX: 'auto',
          }}>{envBlock}</pre>
        </div>

        <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#64748b' }}>
          After updating <code>.env</code>, restart the backend via the Launcher for changes to take effect.
        </div>
      </div>

      {/* ── Per-provider cards ──────────────────────────────────────────── */}
      {PROVIDERS.map(p => (
        <div key={p.envKey} style={{ ...chartCard, borderLeft: `4px solid ${p.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 26 }}>{p.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>{p.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Model: {p.model}</div>
            </div>
            <a
              href={p.docsUrl} target="_blank" rel="noreferrer"
              style={{
                marginLeft: 'auto', padding: '5px 14px',
                background: p.color + '22', border: `1px solid ${p.color}55`,
                borderRadius: 6, color: p.color, fontSize: '0.78rem',
                fontWeight: 600, textDecoration: 'none',
              }}
            >
              {p.docsLabel} ↗
            </a>
          </div>

          {/* Env key */}
          <div style={{
            padding: '8px 12px', background: '#0f1117',
            border: '1px solid #2d3148', borderRadius: 6,
            fontFamily: 'Menlo, monospace', fontSize: '0.8rem',
            color: p.color, marginBottom: 14,
          }}>
            {p.envKey}=<span style={{ color: '#64748b' }}>your-key-here</span>
          </div>

          {/* Steps */}
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {p.steps.map((step, i) => (
              <li key={i} style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{step}</li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
