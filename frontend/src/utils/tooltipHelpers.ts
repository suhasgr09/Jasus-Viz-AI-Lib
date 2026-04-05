import React from 'react';

// ---------------------------------------------------------------------------
// Singleton tooltip rendered directly on document.body.
// Uses Power BI-style card design: colored header band, icon, rows with
// right-aligned values, subtle scale animation.
// ---------------------------------------------------------------------------
let _tipEl: HTMLDivElement | null = null;

function getOrCreateTip(): HTMLDivElement {
  if (_tipEl && document.body.contains(_tipEl)) return _tipEl;
  _tipEl = document.createElement('div');
  Object.assign(_tipEl.style, {
    position: 'fixed',
    pointerEvents: 'none',
    background: '#13162a',
    border: '1px solid #2d3148',
    borderRadius: '10px',
    padding: '0',
    fontSize: '12px',
    color: '#e2e8f0',
    lineHeight: '1.55',
    boxShadow: '0 8px 40px rgba(0,0,0,0.72), 0 2px 12px rgba(0,0,0,0.45)',
    opacity: '0',
    transition: 'opacity 0.1s ease, transform 0.1s ease',
    zIndex: '999999',
    minWidth: '190px',
    maxWidth: '300px',
    top: '0',
    left: '0',
    overflow: 'hidden',
    transform: 'scale(0.94) translateY(4px)',
  });
  document.body.appendChild(_tipEl);
  return _tipEl;
}

export function makeTip(_el?: HTMLDivElement | null) {
  const show = (html: string, cx: number, cy: number) => {
    const el = getOrCreateTip();
    el.innerHTML = html;
    el.style.opacity = '1';
    el.style.transform = 'scale(1) translateY(0)';
    el.style.left = `${Math.min(cx + 18, window.innerWidth - 320)}px`;
    el.style.top = `${Math.max(10, Math.min(cy - 20, window.innerHeight - 210))}px`;
  };
  const hide = () => {
    if (_tipEl) {
      _tipEl.style.opacity = '0';
      _tipEl.style.transform = 'scale(0.94) translateY(4px)';
    }
  };
  return { show, hide };
}

/** Kept for backward compat – existing <div ref={tooltipRef} style={TOOLTIP_STYLE}/> is hidden. */
export const TOOLTIP_STYLE: React.CSSProperties = { display: 'none' };

/** Format a number as USD currency */
export const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/**
 * Build a Power BI-style tooltip card.
 * @param title  Header text (bold, uses accent color)
 * @param rows   [label, value] pairs
 * @param color  Accent color for the header band and indicators (defaults to violet)
 */
export const tipHtml = (title: string, rows: [string, string][], color = '#a78bfa') => {
  const c = color || '#a78bfa';
  return (
    // Header band
    `<div style="background:linear-gradient(135deg,${c}2a,${c}14);` +
    `border-bottom:1px solid ${c}40;padding:9px 14px 8px;` +
    `display:flex;align-items:center;gap:8px">` +
    `<span style="width:10px;height:10px;border-radius:3px;background:${c};` +
    `display:inline-block;flex-shrink:0;box-shadow:0 0 8px ${c}99"></span>` +
    `<span style="font-weight:700;font-size:12.5px;color:#f1f5f9;` +
    `letter-spacing:0.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${title}</span>` +
    `</div>` +
    // Body rows
    `<div style="padding:9px 14px 11px">` +
    rows.map(([k, v]) =>
      `<div style="display:flex;justify-content:space-between;align-items:baseline;` +
      `gap:12px;margin-bottom:5px">` +
      `<span style="display:flex;align-items:center;gap:5px;color:#94a3b8;font-size:11px;white-space:nowrap">` +
      `<span style="width:5px;height:5px;border-radius:50%;background:${c}99;` +
      `display:inline-block;flex-shrink:0"></span>${k}</span>` +
      `<strong style="color:#f1f5f9;font-size:12px;font-variant-numeric:tabular-nums;` +
      `text-align:right;white-space:nowrap">${v}</strong>` +
      `</div>`
    ).join('') +
    `</div>`
  );
};
