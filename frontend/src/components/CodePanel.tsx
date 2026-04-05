import React, { useState, useCallback } from 'react';
import { ChartSnippet } from '../utils/chartSnippets';

interface CodePanelProps {
  snippet: ChartSnippet;
  visible: boolean;
  onClose: () => void;
}

type Tab = 'react' | 'python' | 'cli';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'react',  label: 'React / D3' },
  { key: 'python', label: 'Python'     },
  { key: 'cli',    label: 'CLI'        },
];

// Very light syntax coloring via CSS classes — no external dep needed
function highlight(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, i) => (
    <span key={i} style={{ display: 'block' }}>
      {tokenizeLine(line)}
      {'\n'}
    </span>
  ));
}

function tokenizeLine(line: string): React.ReactNode {
  // Simple token pass: comments, strings, keywords, numbers
  const comment = line.match(/^(\s*)(\/\/.*|#.*)$/);
  if (comment) {
    return (
      <>
        {comment[1]}
        <span style={{ color: '#6a737d' }}>{comment[2]}</span>
      </>
    );
  }

  // We'll do a simple segment-based approach
  type Seg = { text: string; type: 'keyword' | 'string' | 'number' | 'plain' };
  const segments: Seg[] = [];

  let remaining = line;
  // eslint-disable-next-line no-useless-escape
  const regex = /(["'`](?:\\.|[^\\])*?["'`])|(\b(?:import|from|export|const|let|var|function|return|if|else|for|of|in|new|class|async|await|default|type|interface|extends|d3|svg|append|attr|data|join|call|on|select|selectAll)\b)|(\b\d+\.?\d*\b)/g;

  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(remaining)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ text: remaining.slice(lastIdx, m.index), type: 'plain' });
    }
    if (m[1]) segments.push({ text: m[1], type: 'string' });
    else if (m[2]) segments.push({ text: m[2], type: 'keyword' });
    else if (m[3]) segments.push({ text: m[3], type: 'number' });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < remaining.length) {
    segments.push({ text: remaining.slice(lastIdx), type: 'plain' });
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'keyword') return <span key={i} style={{ color: '#c792ea' }}>{seg.text}</span>;
        if (seg.type === 'string')  return <span key={i} style={{ color: '#c3e88d' }}>{seg.text}</span>;
        if (seg.type === 'number')  return <span key={i} style={{ color: '#f78c6c' }}>{seg.text}</span>;
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}

export default function CodePanel({ snippet, visible, onClose }: CodePanelProps) {
  const [tab, setTab] = useState<Tab>('react');
  const [copied, setCopied] = useState(false);

  const code = snippet[tab];

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [code]);

  return (
    <div style={{
      width: visible ? 420 : 0,
      minWidth: visible ? 420 : 0,
      transition: 'width 0.25s ease, min-width 0.25s ease',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: visible ? '1px solid #2d3148' : 'none',
      background: '#0d0f1a',
      height: '100%',
    }}>
      {visible && (
        <>
          {/* Header */}
          <div style={{
            padding: '14px 16px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem', marginBottom: 3 }}>
                {snippet.title}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', lineHeight: 1.4, maxWidth: 360 }}>
                {snippet.description}
              </div>
            </div>
            <button
              onClick={onClose}
              title="Close panel"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: '1.1rem', padding: '0 0 0 8px',
                lineHeight: 1, flexShrink: 0,
              }}
            >✕</button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 2,
            padding: '10px 16px 0',
            borderBottom: '1px solid #2d3148',
            flexShrink: 0,
          }}>
            {TAB_LABELS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
                  color: tab === t.key ? '#a78bfa' : '#64748b',
                  cursor: 'pointer',
                  padding: '4px 12px 8px',
                  fontSize: '0.78rem',
                  fontWeight: tab === t.key ? 600 : 400,
                  transition: 'color 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={handleCopy}
              style={{
                background: copied ? '#1e3a2e' : '#1e1e2e',
                border: `1px solid ${copied ? '#2d6a4f' : '#2d3148'}`,
                borderRadius: 6,
                color: copied ? '#52d68a' : '#94a3b8',
                cursor: 'pointer',
                padding: '3px 10px',
                fontSize: '0.7rem',
                marginBottom: 6,
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Code area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
          }}>
            <pre style={{
              margin: 0,
              fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
              fontSize: '0.72rem',
              lineHeight: 1.7,
              color: '#cdd9e5',
              whiteSpace: 'pre',
              tabSize: 2,
            }}>
              {highlight(code)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
