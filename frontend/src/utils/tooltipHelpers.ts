import React from 'react';

// ---------------------------------------------------------------------------
// Singleton tooltip rendered directly on document.body — bypasses every
// stacking context, overflow:hidden container, and z-index battle.
// ---------------------------------------------------------------------------
let _tipEl: HTMLDivElement | null = null;

function getOrCreateTip(): HTMLDivElement {
  if (_tipEl && document.body.contains(_tipEl)) return _tipEl;
  _tipEl = document.createElement('div');
  Object.assign(_tipEl.style, {
    position: 'fixed',
    pointerEvents: 'none',
    background: 'rgba(10,12,23,0.97)',
    border: '1px solid #3d4168',
    borderRadius: '10px',
    padding: '9px 14px',
    fontSize: '12.5px',
    color: '#e2e8f0',
    lineHeight: '1.7',
    boxShadow: '0 6px 32px rgba(0,0,0,0.75)',
    opacity: '0',
    transition: 'opacity 0.1s ease',
    zIndex: '999999',
    minWidth: '160px',
    maxWidth: '280px',
    top: '0',
    left: '0',
  });
  document.body.appendChild(_tipEl);
  return _tipEl;
}

/**
 * Returns show/hide helpers that drive the shared body-level tooltip.
 * The `_el` parameter is kept for backward compatibility and is ignored.
 */
export function makeTip(_el?: HTMLDivElement | null) {
  const show = (html: string, cx: number, cy: number) => {
    const el = getOrCreateTip();
    el.innerHTML = html;
    el.style.opacity = '1';
    el.style.left = `${Math.min(cx + 16, window.innerWidth - 300)}px`;
    el.style.top = `${Math.max(10, Math.min(cy - 28, window.innerHeight - 180))}px`;
  };
  const hide = () => {
    if (_tipEl) _tipEl.style.opacity = '0';
  };
  return { show, hide };
}

/** Kept for backward compat — existing <div ref={tooltipRef} style={TOOLTIP_STYLE}/> simply hides. */
export const TOOLTIP_STYLE: React.CSSProperties = { display: 'none' };

/** Format a number as USD currency */
export const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/** Build a styled tooltip HTML string */
export const tipHtml = (title: string, rows: [string, string][]) =>
  `<div style="font-weight:700;color:#a78bfa;margin-bottom:6px;font-size:13px">${title}</div>` +
  rows.map(([k, v]) =>
    `<span style="color:#94a3b8">${k}:</span>&nbsp;<strong style="color:#e2e8f0">${v}</strong><br>`
  ).join('');
