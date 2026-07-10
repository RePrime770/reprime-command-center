'use client';

import React, { useEffect, useState } from 'react';
import { ink } from '../../cockpit/lib/colors.js';
import { BTN_PILL } from '../../cockpit/lib/buttonStyles.js';

// CopyPathButton — the SetupRequiredBanner clipboard pattern, extracted for
// the Settings deck MigrationRunbook (one button per pending SQL file).
// Kiosk-grade ≥44pt target; clipboard failure falls back to window.prompt so
// the path is always recoverable — never throws from chrome.

const COPIED_RESET_MS = 1800;

/**
 * @param {{ text: string, label?: string }} props
 */
export default function CopyPathButton({ text, label = 'Copy path' }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions / non-secure context) — fall back to
      // a prompt so the path is still recoverable.
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
