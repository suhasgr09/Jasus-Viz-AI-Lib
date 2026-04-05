import React from 'react';

export const TOOLTIP_STYLE: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  background: 'rgba(10,12,23,0.97)',
  border: '1px solid #3d4168',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 12,
  color: '#e2e8f0',
  lineHeight: '1.65',
  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
  opacity: 0,
  transition: 'opacity 0.12s ease',
  zIndex: 9999,
};

/** Create tooltip show/hide helpers targeting a ref'd div element. */
export function makeTip(el: HTMLDivElement | null) {
  const show = (html: string, cx: number, cy: number) => {
    if (!el) return;
    el.innerHTML = html;
    el.style.opacity = '1';
    el.style.left = `${Math.min(cx + 16, window.innerWidth - 260)}px`;
    el.style.top = `${Math.max(10, Math.min(cy - 28, window.innerHeight - 130))}px`;
  };
  const hide = () => { if (el) el.style.opacity = '0'; };
  return { show, hide };
}

/** Format a number as currency */
export const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/** Build a tooltip HTML string */
export const tipHtml = (title: string, rows: [string, string][]) =>
  `<div style="font-weight:700;color:#a78bfa;margin-bottom:5px">${title}</div>` +
  rows.map(([k, v]) =>
    `<span style="color:#64748b">${k}:</span> <strong>${v}</strong><br>`
  ).join('');
