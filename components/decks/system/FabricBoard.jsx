'use client';

import React from 'react';
import DataGrid from '../DataGrid.jsx';
import { ink, success, semantic } from '../../cockpit/lib/colors.js';
import { BADGE } from '../settings/sectionStyles.js';
import { LoadingPanel, ErrorPanel, StaleRefreshNote } from './boardStates.jsx';

// FabricBoard — Integration Fabric spine capability manifest, the System
// deck's view of GET /api/system/fabric (roadmap ZT-2, batch ZT-2.4). One row
// per capability: whether it is routed through lib/fabric's priority-ordered
// adapters yet, plus a per-provider chip (enabled dot + circuit-breaker
// state). "Not yet routed" is an honest roadmap gap, not a fault — rendered
// neutral/grey (BADGE.idle), never as an error badge.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const NONE_PLACEHOLDER = '—';

/** Circuit-breaker state → { style token, label }. Mirrors CronBoard's HEALTH_BADGE map. */
const CIRCUIT_BADGE = {
  CLOSED: { style: BADGE.ok, label: 'Healthy' },
  HALF_OPEN: { style: BADGE.warn, label: 'Recovering' },
  OPEN: { style: BADGE.err, label: 'Circuit open' },
};

/** 'SEND_TEXT_MESSAGE' -> 'Send text message'. */
function capabilityLabel(capability) {
  const words = String(capability).toLowerCase().split('_');
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

/** @param {{ on: boolean }} props */
function StatusDot({ on }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: on ? success[500] : ink[100],
        flexShrink: 0,
      }}
    />
  );
}

/**
 * @param {{ provider: import('../../../lib/fabric/observability').ProviderStatusView }} props
 */
function ProviderChip({ provider }) {
  const circuit = provider.circuitState ? CIRCUIT_BADGE[provider.circuitState] : null;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        minHeight: 44,
        borderRadius: 10,
        border: `1px solid ${semantic.border}`,
        background: semantic.surfaceSunken,
      }}
    >
      <StatusDot on={provider.enabled} />
      <span style={{ fontFamily: MONO, fontSize: 14, color: ink[900], fontWeight: 600 }}>
        {provider.provider}
      </span>
      {circuit ? (
        <span style={circuit.style}>{circuit.label}</span>
      ) : (
        <span style={{ fontSize: 13, color: ink[300] }}>{NONE_PLACEHOLDER}</span>
      )}
    </div>
  );
}

function buildColumns() {
  return [
    {
      key: 'capability',
      label: 'Capability',
      render: (row) => (
        <div style={{ fontWeight: 700, color: ink[900], fontSize: 15, minWidth: 160 }}>
          {capabilityLabel(row.capability)}
        </div>
      ),
    },
    {
      key: 'routed',
      label: 'Status',
      render: (row) => (
        <span style={row.routed ? BADGE.ok : BADGE.idle}>
          {row.routed ? 'Routed' : 'Not yet routed'}
        </span>
      ),
    },
    {
      key: 'providers',
      label: 'Providers',
      render: (row) => {
        if (!Array.isArray(row.providers) || row.providers.length === 0) {
          return <span style={{ fontSize: 14, color: ink[300] }}>No providers configured.</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {row.providers.map((p) => (
              <ProviderChip key={p.providerId} provider={p} />
            ))}
          </div>
        );
      },
    },
  ];
}

/**
 * @param {{
 *   loading: boolean,
 *   error: string | null,
 *   data: { capabilities?: import('../../../lib/fabric/observability').CapabilityManifestEntry[] } | null,
 *   onRetry: () => void,
 * }} props
 */
export default function FabricBoard({ loading, error, data, onRetry }) {
  const capabilities = Array.isArray(data?.capabilities) ? data.capabilities : null;

  if (loading && !capabilities) {
    return <LoadingPanel label="Checking fabric routing…" />;
  }

  if (!capabilities) {
    return <ErrorPanel title="Couldn't load fabric status." code={error} onRetry={onRetry} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && <StaleRefreshNote code={error} />}
      <DataGrid
        columns={buildColumns()}
        rows={capabilities}
        rowKey={(row) => row.capability}
        emptyText="No capabilities defined yet."
      />
    </div>
  );
}
