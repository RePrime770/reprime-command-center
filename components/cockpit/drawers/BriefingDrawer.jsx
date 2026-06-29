import React from 'react';
import { ink, semantic, brand } from '../lib/colors.js';
import { useDemo } from '../demo/DemoContext.jsx';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import { ListenButton } from '../lib/voice.jsx';
import DrawerShell from './DrawerShell.jsx';

/**
 * Briefing drawer — opened by the top-bar Concierge "Briefing" button (which
 * sets state.briefingOpen; previously nothing read it). Renders the REAL live
 * morning brief from useLiveData().morningBrief (built by adaptBrief from
 * /api/briefing/today). No fabrication: if a section has no live data it isn't
 * shown; an empty brief shows a quiet "nothing pressing" state.
 */
export default function BriefingDrawer() {
  const { state, set } = useDemo();
  const { morningBrief } = useLiveData();
  const open = !!state.briefingOpen;
  if (!open) return null;

  const brief = morningBrief || {};
  const sections = Array.isArray(brief.sections) ? brief.sections : [];
  const apex = brief.apex;

  // Plain-text rendition for the Listen button (Speechify-style read-aloud).
  const spoken = [
    brief.greeting,
    apex ? `Apex: ${apex.title}. ${apex.body || ''}` : '',
    ...sections.map((s) => `${s.title}: ${(s.items || []).map((it) => it.headline).filter(Boolean).join('; ')}`),
  ].filter(Boolean).join('. ');

  return (
    <DrawerShell open title="Morning briefing" onClose={() => set('briefingOpen', false)}>
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: ink[700], flex: 1 }}>
            {brief.greeting || 'Boker tov, Gideon.'}
          </div>
          <ListenButton compact getText={() => spoken} />
        </div>

        {apex && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderLeft: '4px solid #DC2626', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#991B1B', letterSpacing: '0.12em' }}>APEX NOW</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: ink[700], marginTop: 2 }}>{apex.title}</div>
            {apex.body && <div style={{ fontSize: 16, color: ink[500], marginTop: 2 }}>{apex.body}</div>}
          </div>
        )}

        {sections.length === 0 ? (
          <div style={{ fontSize: 16, color: ink[500], fontStyle: 'italic', padding: '8px 0' }}>
            Nothing pressing in the brief right now.
          </div>
        ) : (
          sections.map((s) => (
            <div key={s.id || s.title}>
              <div style={{ fontSize: 14, fontWeight: 800, color: brand.navy, letterSpacing: '0.10em', marginBottom: 6 }}>
                {(s.title || '').toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(s.items || []).map((it) => (
                  <div key={it.id} style={{ background: '#FFFFFF', border: `1px solid ${semantic.divider}`, borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: ink[700] }}>{it.headline}</div>
                    {it.summary && <div style={{ fontSize: 15, color: ink[500], marginTop: 1 }}>{it.summary}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {brief.degraded && (
          <div style={{ fontSize: 13, color: ink[300], fontStyle: 'italic' }}>
            Some sources were slow — this brief may be partial.
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
