'use client';

import React, { useEffect, useState } from 'react';
import { warning, ink } from '../cockpit/lib/colors.js';
import { BTN_PILL } from '../cockpit/lib/buttonStyles.js';

// SetupRequiredBanner — renders a ModuleStatus (lib/domains/status.ts), the
// OS-layer graceful-degradation contract (architecture §3.4):
//   ok                 → renders nothing
//   setup_required     → missing env NAMES (never values) + optional setup link
//   migration_required → exact SQL filename(s) + "Copy path" button
// When Gideon sets the env / runs the SQL, the server probes expire (≤5 min)
// and the deck flips live with zero deploys — so the copy explains exactly that.

const FONT = "var(--font-lexend), 'Lexend', 'Poppins', sans-serif";

const MONO_BLOCK = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 14,
  background: 'rgba(15,23,42,0.06)',
  padding: '8px 10px',
  borderRadius: 6,
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap',
};

/**
 * Copy button with copied-state feedback. Isolated so the parent banner can
 * early-return without conditional hooks.
 * @param {{ text: string, label?: string }} props
 */
function CopyPathButton({ text, label = 'Copy path' }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions / non-secure context) — fall back to
      // a prompt so the path is still recoverable. Never throw from chrome.
      try {
        window.prompt('Copy the migration path:', text);
      } catch {
        /* no window — nothing else to do */
      }
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        ...BTN_PILL,
        minHeight: 44,
        fontWeight: 700,
        background: copied ? '#C8E6C9' : ink[900],
        color: copied ? '#1B5E20' : '#FFFFFF',
        border: '1px solid transparent',
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

/**
 * @param {{
 *   status: import('../../lib/domains/status').ModuleStatus | null | undefined,
 *   setupHref?: string,
 *   setupLabel?: string,
 * }} props
 */
export default function SetupRequiredBanner({ status, setupHref, setupLabel }) {
  if (!status || status.ok) return null;

  const isMigration = status.reason === 'migration_required';
  const title = isMigration ? 'Migration required' : 'Setup required';
  const missingEnv = Array.isArray(status.missingEnv) ? status.missingEnv : [];
  const missingTables = Array.isArray(status.missingTables) ? status.missingTables : [];
  const migrationFile =
    typeof status.migrationFile === 'string' && status.migrationFile.length > 0
      ? status.migrationFile
      : null;
  const migrationPath = migrationFile ? `supabase/migrations/${migrationFile}` : null;

  return (
    <div
      role="status"
      style={{
        background: warning[50],
        border: `1px solid ${warning[500]}`,
        borderLeft: `6px solid ${warning[500]}`,
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 16,
        color: ink[900],
        fontFamily: FONT,
        fontSize: 16,
        lineHeight: 1.55,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{title}</div>

      {!isMigration && (
        <>
          <div style={{ marginBottom: 8 }}>
            This module needs environment variables that aren&rsquo;t set yet. Add them on
            Vercel → Project Settings → Environment Variables; the module goes live
            automatically once they&rsquo;re saved.
          </div>
          {missingEnv.length > 0 && (
            <div style={MONO_BLOCK}>{missingEnv.join('\n')}</div>
          )}
          {setupHref && (
            <div style={{ marginTop: 10 }}>
              <a
                href={setupHref}
                style={{
                  ...BTN_PILL,
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: 700,
                  background: ink[900],
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                }}
              >
                {setupLabel || 'Open setup →'}
              </a>
            </div>
          )}
        </>
      )}

      {isMigration && (
        <>
          <div style={{ marginBottom: 8 }}>
            This module needs a database migration that hasn&rsquo;t been run yet. Run the SQL
            below in the Supabase SQL editor; the module flips live within ~5 minutes of the
            migration landing — no deploy needed.
          </div>
          {missingTables.length > 0 && (
            <div style={{ marginBottom: 8, fontSize: 14, color: ink[500] }}>
              Missing table{missingTables.length === 1 ? '' : 's'}:{' '}
              <span style={{ fontFamily: MONO_BLOCK.fontFamily }}>{missingTables.join(', ')}</span>
            </div>
          )}
          {migrationPath ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ ...MONO_BLOCK, flex: 1, minWidth: 240 }}>{migrationPath}</div>
              <CopyPathButton text={migrationPath} />
            </div>
          ) : (
            <div style={{ fontSize: 14, color: ink[500] }}>
              See the Settings deck migration runbook for the pending file.
            </div>
          )}
        </>
      )}
    </div>
  );
}
