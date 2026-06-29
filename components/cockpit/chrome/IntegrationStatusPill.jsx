import React, { useEffect, useMemo, useRef, useState } from 'react';
import { brand } from '../lib/colors.js';
import {
  getSetupLink,
  getDisplayName,
} from '../../../lib/cockpit/integration-setup-links.ts';

// Polls /api/health every 5 min and renders a green/amber/red pill summarizing
// integration adapter status. Click → dropdown listing each integration with
// an actionable "Setup required" CTA per row (route or env-var help).
const REFRESH_MS = 5 * 60 * 1000;

const COLORS = { ok: '#43A047', setup: '#FFA726', err: '#E53935', idle: '#9E9E9E' };

function rowDotColor(it) {
  if (it.ok === true) return COLORS.ok;
  return it.reason === 'setup_required' ? COLORS.setup : COLORS.err;
}

export default function IntegrationStatusPill() {
  const [integrations, setIntegrations] = useState(null);
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(-1);
  const [focusIdx, setFocusIdx] = useState(-1);
  const rootRef = useRef(null);

  const fetchHealth = useMemo(
    () => () => {
      fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.integrations) setIntegrations(d.integrations); })
        .catch(() => { /* keep last value */ });
    },
    [],
  );

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchHealth]);

  // Refresh when the user returns to the tab (e.g. after an OAuth round-trip).
  useEffect(() => {
    const onFocus = () => fetchHealth();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchHealth]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      const list = Array.isArray(integrations) ? integrations : [];
      if (!list.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx((i) => Math.min(list.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)); }
      else if (e.key === 'Enter' && focusIdx >= 0 && focusIdx < list.length) {
        activateRow(list[focusIdx], focusIdx);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, integrations, focusIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = Array.isArray(integrations) ? integrations : [];
  const setupCount = list.filter((i) => !i.ok && i.reason === 'setup_required').length;
  const issueCount = list.filter((i) => !i.ok && i.reason !== 'setup_required').length;
  const allOk = list.length > 0 && setupCount === 0 && issueCount === 0;

  let dotColor = COLORS.ok; let label = 'All systems';
  if (!list.length) { dotColor = COLORS.idle; label = 'Checking…'; }
  else if (issueCount > 0) { dotColor = COLORS.err; label = `${issueCount} issue${issueCount === 1 ? '' : 's'}`; }
  else if (setupCount > 0) { dotColor = COLORS.setup; label = `${setupCount} setup required`; }
  else if (allOk) { dotColor = COLORS.ok; label = 'All systems'; }

  function activateRow(it, idx) {
    if (it.ok === true) return;
    const link = getSetupLink(it.integration);
    if (!link) { setExpandedIdx(expandedIdx === idx ? -1 : idx); return; }
    if (link.kind === 'route') {
      window.location.href = link.href;
    } else {
      setExpandedIdx(expandedIdx === idx ? -1 : idx);
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setFocusIdx(-1); setExpandedIdx(-1); }}
        title="Integration status"
        aria-expanded={open}
        style={{
          background: 'rgba(255,255,255,0.06)', color: brand.goldSoft,
          border: `1px solid rgba(255,204,51,0.28)`, borderRadius: 999,
          padding: '6px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8,
          lineHeight: 1.2,
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: 999, background: dotColor, display: 'inline-block', boxShadow: `0 0 6px ${dotColor}66` }} />
        {label}
      </button>
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 360, maxHeight: 480,
        overflowY: 'auto', background: '#0F172A', color: '#FFFFFF',
        border: `1px solid ${brand.goldSoft}`, borderRadius: 10, padding: 6,
        boxShadow: '0 10px 28px rgba(0,0,0,0.5)', zIndex: 60, fontSize: 14,
        opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(-4px)',
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 140ms ease, transform 140ms ease',
      }}>
        {list.length === 0 && <div style={{ opacity: 0.7, padding: 12 }}>No data yet.</div>}
        {list.map((it, idx) => {
          const ok = it.ok === true;
          const dot = rowDotColor(it);
          const link = !ok ? getSetupLink(it.integration) : undefined;
          const isExpanded = expandedIdx === idx;
          const isFocused = focusIdx === idx;
          return (
            <div key={it.integration}>
              <button
                type="button"
                onClick={() => activateRow(it, idx)}
                onMouseEnter={() => setFocusIdx(idx)}
                disabled={ok}
                style={{
                  width: '100%', textAlign: 'left', background: isFocused && !ok ? 'rgba(255,204,51,0.10)' : 'transparent',
                  border: 'none', color: 'inherit', cursor: ok ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 10px', minHeight: 52, borderRadius: 6,
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: 999, background: dot, flexShrink: 0, boxShadow: `0 0 6px ${dot}55` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getDisplayName(it.integration)}</div>
                  <div style={{ opacity: 0.7, fontSize: 13, marginTop: 2 }}>
                    {ok ? 'Connected' : (it.reason === 'setup_required' ? 'Setup required' : (it.message || it.reason || 'Error'))}
                  </div>
                </div>
                {!ok && link?.kind === 'route' && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: brand.goldSoft }}>Connect →</span>
                )}
                {!ok && link?.kind === 'env' && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: brand.goldSoft }}>{isExpanded ? 'Hide' : 'How to fix'}</span>
                )}
              </button>
              {!ok && isExpanded && link?.kind === 'env' && (
                <div style={{ padding: '8px 14px 14px 33px', fontSize: 13, opacity: 0.85 }}>
                  <div style={{ marginBottom: 6 }}>Set these on Vercel → Project Settings → Environment Variables. Once saved, this row goes green automatically.</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'rgba(255,255,255,0.06)', padding: '6px 8px', borderRadius: 4, wordBreak: 'break-all' }}>
                    {(Array.isArray(it.missingEnv) && it.missingEnv.length > 0 ? it.missingEnv : link.envVars).join('\n')}
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.7 }}>Help: <code>{link.docPath}</code></div>
                </div>
              )}
            </div>
          );
        })}
        {list.length > 0 && (
          <button
            type="button"
            onClick={() => fetchHealth()}
            style={{
              width: '100%', marginTop: 4, background: 'transparent', border: 'none',
              color: brand.goldSoft, cursor: 'pointer', padding: '10px 8px',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', textAlign: 'center',
            }}
          >
            Refresh now
          </button>
        )}
      </div>
    </div>
  );
}
