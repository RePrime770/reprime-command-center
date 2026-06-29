import React, { useEffect, useRef, useState } from 'react';
import { brand } from '../lib/colors.js';

// Polls /api/health every 5 min and renders a green/amber/red pill summarizing
// integration adapter status. Click toggles a dropdown listing each integration
// + missing env var NAMES (never values — public repo).
const REFRESH_MS = 5 * 60 * 1000;

export default function IntegrationStatusPill() {
  const [integrations, setIntegrations] = useState(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled && d?.integrations) setIntegrations(d.integrations); })
        .catch(() => { /* keep last value */ });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const list = Array.isArray(integrations) ? integrations : [];
  const setupCount = list.filter((i) => !i.ok && i.reason === 'setup_required').length;
  const issueCount = list.filter((i) => !i.ok && i.reason !== 'setup_required').length;
  const allOk = list.length > 0 && setupCount === 0 && issueCount === 0;

  let dotColor = '#43A047'; let label = 'All systems';
  if (!list.length) { dotColor = '#9E9E9E'; label = 'Checking…'; }
  else if (issueCount > 0) { dotColor = '#E53935'; label = `${issueCount} issue${issueCount === 1 ? '' : 's'}`; }
  else if (setupCount > 0) { dotColor = '#FFA726'; label = `${setupCount} setup required`; }
  else if (allOk) { dotColor = '#43A047'; label = 'All systems'; }

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen((v) => !v)} title="Integration status" style={{
        background: 'rgba(255,255,255,0.06)', color: brand.goldSoft,
        border: `1px solid rgba(255,204,51,0.22)`, borderRadius: 999,
        padding: '4px 10px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, display: 'inline-block' }} />
        {label}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 280,
          maxHeight: 380, overflowY: 'auto', background: '#0F172A', color: '#FFFFFF',
          border: `1px solid ${brand.goldSoft}`, borderRadius: 8, padding: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 60, fontSize: 13,
        }}>
          {list.length === 0 && <div style={{ opacity: 0.7 }}>No data yet.</div>}
          {list.map((it) => {
            const ok = it.ok === true;
            const itDot = ok ? '#43A047' : (it.reason === 'setup_required' ? '#FFA726' : '#E53935');
            return (
              <div key={it.integration} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: itDot, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{it.integration}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                    {ok ? 'ok' : (it.reason || 'error')}
                  </div>
                  {!ok && Array.isArray(it.missingEnv) && it.missingEnv.length > 0 && (
                    <div style={{ opacity: 0.65, fontSize: 11, marginTop: 2, fontFamily: 'monospace' }}>
                      Missing: {it.missingEnv.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
