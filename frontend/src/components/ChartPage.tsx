import React, { useState } from 'react';
import CodePanel from './CodePanel';
import { ChartSnippet } from '../utils/chartSnippets';

interface ChartPageProps {
  children: React.ReactNode;
  snippet: ChartSnippet;
}

export default function ChartPage({ children, snippet }: ChartPageProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Chart area */}
      <div style={{
        flex: 1,
        minWidth: 320,
        overflowY: 'auto',
        padding: '24px',
        boxSizing: 'border-box',
      }}>
        {children}
      </div>

      {/* Toggle tab (always visible) */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        title={panelOpen ? 'Hide code panel' : 'Show code panel'}
        style={{
          position: 'absolute',
          top: '50%',
          right: panelOpen ? 420 : 0,
          transform: 'translateY(-50%)',
          zIndex: 10,
          background: '#1a1d2e',
          border: '1px solid #2d3148',
          borderRight: panelOpen ? '1px solid #2d3148' : 'none',
          borderRadius: panelOpen ? '8px 0 0 8px' : '0 8px 8px 0',
          color: '#a78bfa',
          cursor: 'pointer',
          padding: '10px 6px',
          fontSize: '0.7rem',
          lineHeight: 1.4,
          letterSpacing: '0.05em',
          writingMode: 'vertical-rl',
          transition: 'right 0.25s ease',
        }}
      >
        {panelOpen ? '›' : '‹'}{' '}
        <span style={{ fontFamily: 'monospace' }}>{'{/}'}</span>
      </button>

      {/* Code panel */}
      <CodePanel
        snippet={snippet}
        visible={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
