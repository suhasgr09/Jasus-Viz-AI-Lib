import React, { useState } from 'react';

// ─── Theme constants ──────────────────────────────────────────────────────────
const CARD = '#1a1d2e';
const BORDER = '#2d3148';
const TEXT = '#e2e8f0';
const MUTED = '#64748b';
const MUTED2 = '#94a3b8';
const BG_DEEP = '#0f1117';

// ─── Model definitions ────────────────────────────────────────────────────────
interface AIModel {
  id: string;
  name: string;
  provider: string;
  emoji: string;
  color: string;
  badge: string;
  capabilities: string[];
  endpoint: string;
  envKey: string;
  modelId: string;
  desc: string;
  reasoning: number; // 1-5
  speed: number;
  cost: string;
  privacy: string;
  local: boolean;
  snippet: string;
}

const MODELS: AIModel[] = [
  {
    id: 'claude',
    name: 'Claude Sonnet',
    provider: 'Anthropic',
    emoji: '🧠',
    color: '#a78bfa',
    badge: 'ACTIVE',
    capabilities: ['Chart recommendations', 'Dataset insights', 'Schema analysis', 'Prompt chaining'],
    endpoint: 'https://api.anthropic.com/v1/messages',
    envKey: 'ANTHROPIC_API_KEY',
    modelId: 'claude-sonnet-4-5',
    desc: 'State-of-the-art reasoning. Currently powering jasus-viz-AI-lib.',
    reasoning: 5, speed: 4, cost: '$$', privacy: 'Medium', local: false,
    snippet:
`import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=4096,
    messages=[{"role": "user", "content": prompt}]
)
return response.content[0].text`,
  },
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    emoji: '⚡',
    color: '#10b981',
    badge: 'AVAILABLE',
    capabilities: ['Chart recommendations', 'Dataset insights', 'Code generation', 'Function calling'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    modelId: 'gpt-4o',
    desc: 'Fast multimodal model with strong reasoning on structured data.',
    reasoning: 5, speed: 5, cost: '$$$', privacy: 'Medium', local: false,
    snippet:
`from openai import OpenAI

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": prompt}]
)
return response.choices[0].message.content`,
  },
  {
    id: 'gemini',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    emoji: '💎',
    color: '#3b82f6',
    badge: 'AVAILABLE',
    capabilities: ['Chart recommendations', 'Long context (1M tokens)', 'Multimodal analysis', 'Insights'],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    envKey: 'GOOGLE_API_KEY',
    modelId: 'gemini-1.5-pro',
    desc: 'Best-in-class context window. Ideal for very large datasets.',
    reasoning: 4, speed: 4, cost: '$$', privacy: 'Medium', local: false,
    snippet:
`import google.generativeai as genai

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-pro")
response = model.generate_content(prompt)
return response.text`,
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    provider: 'Microsoft Azure',
    emoji: '☁️',
    color: '#0ea5e9',
    badge: 'AVAILABLE',
    capabilities: ['Enterprise compliance', 'Private VNet deployment', 'Custom fine-tuning', 'SLA guarantee'],
    endpoint: 'https://{resource}.openai.azure.com/openai',
    envKey: 'AZURE_OPENAI_KEY',
    modelId: 'gpt-4',
    desc: 'Enterprise-grade OpenAI with data residency and compliance controls.',
    reasoning: 5, speed: 3, cost: '$$$$', privacy: 'High', local: false,
    snippet:
`from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-02-01"
)
response = client.chat.completions.create(
    model=os.environ["AZURE_DEPLOYMENT"],
    messages=[{"role": "user", "content": prompt}]
)
return response.choices[0].message.content`,
  },
  {
    id: 'mistral',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    emoji: '🌪️',
    color: '#f59e0b',
    badge: 'COMING SOON',
    capabilities: ['Open source weights', 'Self-hosted option', 'EU data residency', 'Low latency'],
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    envKey: 'MISTRAL_API_KEY',
    modelId: 'mistral-large-latest',
    desc: 'European open-source model. Deploy locally or via the Mistral API.',
    reasoning: 4, speed: 5, cost: '$$', privacy: 'High', local: true,
    snippet:
`from mistralai import Mistral

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
response = client.chat.complete(
    model="mistral-large-latest",
    messages=[{"role": "user", "content": prompt}]
)
return response.choices[0].message.content`,
  },
  {
    id: 'llama',
    name: 'Llama 3.1 70B',
    provider: 'Meta · via Ollama',
    emoji: '🦙',
    color: '#ec4899',
    badge: 'COMING SOON',
    capabilities: ['Fully local / offline', 'No API key required', 'Zero data egress', 'Free to run'],
    endpoint: 'http://localhost:11434/api/chat',
    envKey: '— (no key needed)',
    modelId: 'llama3.1:70b',
    desc: 'Run entirely on your machine via Ollama. Zero data leaves your organisation.',
    reasoning: 3, speed: 2, cost: 'Free', privacy: 'Max', local: true,
    snippet:
`import requests

response = requests.post(
    "http://localhost:11434/api/chat",
    json={
        "model": "llama3.1:70b",
        "stream": False,
        "messages": [{"role": "user", "content": prompt}]
    }
)
return response.json()["message"]["content"]`,
  },
];

// ─── Pipeline flow steps ──────────────────────────────────────────────────────
const FLOW_STEPS = [
  { icon: '📤', label: 'Upload Data',    sub: 'CSV · JSON · Schema' },
  { icon: '⚙️', label: 'pandas Engine', sub: 'Process + aggregate' },
  { icon: '🤖', label: 'AI Model',       sub: 'Your chosen LLM' },
  { icon: '💡', label: 'Insights',       sub: 'Recs + analysis' },
  { icon: '📊', label: '14 D3 Charts',   sub: 'Interactive viz' },
];

// ─── Star rating helper ───────────────────────────────────────────────────────
function Stars({ n, color }: { n: number; color: string }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= n ? color : '#2d3148', fontSize: 13 }}>★</span>
      ))}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AIModelConfig() {
  const [selected, setSelected] = useState<string>('claude');
  const [copied, setCopied] = useState(false);
  const activeModel = MODELS.find(m => m.id === selected)!;

  function handleCopy() {
    navigator.clipboard.writeText(activeModel.snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080, margin: '0 auto', color: TEXT }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700 }}>🤖 AI Model Configuration</h1>
          <span style={{
            background: activeModel.color + '22',
            color: activeModel.color,
            padding: '3px 12px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            border: `1px solid ${activeModel.color}55`,
            letterSpacing: '0.04em',
          }}>
            {activeModel.emoji} {activeModel.name} · ACTIVE
          </span>
        </div>
        <p style={{ color: MUTED, margin: 0, fontSize: '0.88rem', maxWidth: 620 }}>
          jasus-viz-AI-lib is model-agnostic. Select a provider below to see how to integrate it.
          Update your <code style={{ color: '#a78bfa', background: '#1a1d2e', padding: '1px 5px', borderRadius: 4 }}>.env</code> and
          swap the client code in <code style={{ color: '#a78bfa', background: '#1a1d2e', padding: '1px 5px', borderRadius: 4 }}>src/api.py</code> to switch models.
        </p>
      </div>

      {/* ── Pipeline flow ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          How It Works
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
          {FLOW_STEPS.map((step, i) => {
            const isAI = i === 2;
            return (
              <React.Fragment key={step.label}>
                <div style={{
                  flex: '0 0 auto',
                  background: isAI ? activeModel.color + '18' : CARD,
                  border: `1.5px solid ${isAI ? activeModel.color : BORDER}`,
                  borderRadius: 10,
                  padding: '14px 18px',
                  textAlign: 'center',
                  minWidth: 110,
                  transition: 'all 0.25s',
                }}>
                  <div style={{ fontSize: '1.55rem', marginBottom: 5 }}>
                    {isAI ? activeModel.emoji : step.icon}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: isAI ? activeModel.color : TEXT, marginBottom: 2 }}>
                    {isAI ? activeModel.name : step.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: MUTED }}>
                    {isAI ? activeModel.provider : step.sub}
                  </div>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 4px',
                    color: i === 1 || i === 2 ? activeModel.color : '#3d4168',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    transition: 'color 0.25s',
                  }}>→</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* ── Model cards ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          Choose Your Model
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 14,
        }}>
          {MODELS.map(model => {
            const isSelected = selected === model.id;
            const disabled = model.badge === 'COMING SOON';
            return (
              <div
                key={model.id}
                onClick={() => !disabled && setSelected(model.id)}
                style={{
                  background: isSelected ? model.color + '14' : CARD,
                  border: `1.5px solid ${isSelected ? model.color : BORDER}`,
                  borderRadius: 12,
                  padding: '16px 18px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.55 : 1,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {/* Badge */}
                <span style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: model.badge === 'ACTIVE' ? model.color + '30'
                    : model.badge === 'AVAILABLE' ? '#10b98125'
                    : '#ffffff10',
                  color: model.badge === 'ACTIVE' ? model.color
                    : model.badge === 'AVAILABLE' ? '#10b981'
                    : MUTED,
                  border: `1px solid ${model.badge === 'ACTIVE' ? model.color + '55'
                    : model.badge === 'AVAILABLE' ? '#10b98155' : BORDER}`,
                }}>
                  {model.badge}
                </span>

                {/* Icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.6rem' }}>{model.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? model.color : TEXT }}>
                      {model.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>{model.provider}</div>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.78rem', color: MUTED2, margin: '0 0 10px', lineHeight: 1.5 }}>
                  {model.desc}
                </p>

                {/* Capabilities */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {model.capabilities.map(c => (
                    <span key={c} style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: '#ffffff08',
                      border: `1px solid ${BORDER}`,
                      color: MUTED2,
                    }}>{c}</span>
                  ))}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: MUTED }}>
                  <span>Reasoning: <Stars n={model.reasoning} color={model.color} /></span>
                  <span>Speed: <Stars n={model.speed} color={model.color} /></span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: MUTED, marginTop: 4 }}>
                  <span>Cost: <strong style={{ color: TEXT }}>{model.cost}</strong></span>
                  <span>Privacy: <strong style={{ color: TEXT }}>{model.privacy}</strong></span>
                  <span>Local: <strong style={{ color: model.local ? '#10b981' : MUTED }}>{model.local ? 'Yes' : 'No'}</strong></span>
                </div>

                {isSelected && (
                  <div style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: `1px solid ${model.color}40`,
                    fontSize: 10,
                    color: model.color,
                    fontWeight: 600,
                  }}>
                    ✓ Selected — see integration details below
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          Side-by-Side Comparison
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}></th>
                {MODELS.map(m => (
                  <th key={m.id} style={{
                    padding: '8px 12px',
                    color: selected === m.id ? m.color : MUTED2,
                    fontWeight: 700,
                    textAlign: 'center',
                    borderBottom: selected === m.id ? `2px solid ${m.color}` : undefined,
                  }}>
                    {m.emoji} {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Reasoning', key: 'reasoning', render: (m: AIModel) => <Stars n={m.reasoning} color={m.color} /> },
                { label: 'Speed',     key: 'speed',     render: (m: AIModel) => <Stars n={m.speed} color={m.color} /> },
                { label: 'Cost',      key: 'cost',      render: (m: AIModel) => <strong style={{ color: TEXT }}>{m.cost}</strong> },
                { label: 'Privacy',   key: 'privacy',   render: (m: AIModel) => <strong style={{ color: TEXT }}>{m.privacy}</strong> },
                { label: 'Local',     key: 'local',     render: (m: AIModel) => <strong style={{ color: m.local ? '#10b981' : MUTED }}>{m.local ? '✓ Yes' : '✗ No'}</strong> },
              ].map(row => (
                <tr key={row.label} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td style={{ padding: '8px 12px', color: MUTED, fontWeight: 600 }}>{row.label}</td>
                  {MODELS.map(m => (
                    <td key={m.id} style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      background: selected === m.id ? m.color + '08' : 'transparent',
                    }}>
                      {row.render(m)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Integration panel ── */}
      <section>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          Integration Details — {activeModel.emoji} {activeModel.name}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Config info */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, color: TEXT, marginBottom: 14, fontSize: '0.88rem' }}>
              Configuration
            </div>
            {[
              { label: 'Provider', value: activeModel.provider },
              { label: 'Model ID', value: activeModel.modelId },
              { label: 'API Endpoint', value: activeModel.endpoint },
              { label: 'Env Variable', value: activeModel.envKey },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.7rem', color: MUTED, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <code style={{
                  display: 'block',
                  background: BG_DEEP,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  color: activeModel.color,
                  wordBreak: 'break-all',
                }}>
                  {value}
                </code>
              </div>
            ))}

            <div style={{ marginTop: 16, padding: '10px 12px', background: BG_DEEP, borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: '0.75rem' }}>
              <div style={{ color: MUTED, marginBottom: 6, fontWeight: 600 }}>.env file</div>
              <code style={{ color: '#10b981', display: 'block' }}>{activeModel.envKey}=your_api_key_here</code>
              {activeModel.id === 'azure' && (
                <>
                  <code style={{ color: '#10b981', display: 'block', marginTop: 4 }}>AZURE_ENDPOINT=https://&#123;resource&#125;.openai.azure.com</code>
                  <code style={{ color: '#10b981', display: 'block', marginTop: 4 }}>AZURE_DEPLOYMENT=your_deployment_name</code>
                </>
              )}
            </div>
          </div>

          {/* Code snippet */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: TEXT, fontSize: '0.88rem' }}>
                Python Client Code
              </div>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? '#10b98122' : '#ffffff0a',
                  border: `1px solid ${copied ? '#10b981' : BORDER}`,
                  borderRadius: 6,
                  color: copied ? '#10b981' : MUTED2,
                  fontSize: '0.72rem',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {copied ? '✓ Copied' : '⎘ Copy'}
              </button>
            </div>
            <pre style={{
              background: BG_DEEP,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: '14px 16px',
              fontSize: '0.75rem',
              color: '#94a3b8',
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.7,
            }}>
              <code>{activeModel.snippet}</code>
            </pre>
            <p style={{ fontSize: '0.72rem', color: MUTED, marginTop: 12, margin: '12px 0 0' }}>
              Drop this into <code style={{ color: activeModel.color, background: BG_DEEP, padding: '1px 5px', borderRadius: 4 }}>src/ai_integration/client.py</code> then update{' '}
              <code style={{ color: activeModel.color, background: BG_DEEP, padding: '1px 5px', borderRadius: 4 }}>config/claude_config.yaml</code> with the new model ID.
            </p>
          </div>
        </div>

        {/* Notice */}
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: '#f59e0b10',
          border: '1px solid #f59e0b30',
          borderRadius: 10,
          fontSize: '0.78rem',
          color: '#f59e0b',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>
            This is a <strong>static configuration preview</strong>. The live backend currently uses Claude Sonnet.
            To actually switch models, update your <code style={{ background: '#f59e0b15', padding: '1px 5px', borderRadius: 4 }}>.env</code> and
            replace the AI client code in the backend — no other changes needed.
            Models marked <em>Coming Soon</em> require a thin adapter wrapper not yet included.
          </span>
        </div>
      </section>
    </div>
  );
}
