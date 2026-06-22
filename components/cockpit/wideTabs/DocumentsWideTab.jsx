import React from 'react';
import { Folder, FileText, FileSpreadsheet, File } from 'lucide-react';
import { warm, ink, info } from '../lib/colors.js';

/**
 * Documents folder browser. Mocked tree of deal-keyed folders + recent files.
 */
const tree = [
  {
    id: 'f-001',
    name: 'deal-001 · Watermills',
    children: [
      { id: 'd-001', kind: 'doc', name: 'PSA-v3-final.pdf' },
      { id: 'd-002', kind: 'sheet', name: 'Watermills-underwriting-2026.xlsx' },
      { id: 'd-003', kind: 'doc', name: 'Inspector access agreement.pdf' }
    ]
  },
  {
    id: 'f-002',
    name: 'deal-002 · Bay Valley',
    children: [
      { id: 'd-004', kind: 'doc', name: 'Bay-Valley-Counter-LOI-v2.pdf' },
      { id: 'd-005', kind: 'doc', name: 'Environmental-Phase-I.pdf' },
      { id: 'd-006', kind: 'sheet', name: 'Bay-Valley-rent-roll.xlsx' }
    ]
  },
  {
    id: 'f-003',
    name: 'deal-003 · Service FCU',
    children: [
      { id: 'd-007', kind: 'doc', name: 'NPL-portfolio-summary.pdf' },
      { id: 'd-008', kind: 'sheet', name: 'NPL-loan-tape.xlsx' }
    ]
  },
  {
    id: 'f-004',
    name: 'shared · IC memos',
    children: [
      { id: 'd-009', kind: 'doc', name: 'IC-memo-Q1-2026.docx' },
      { id: 'd-010', kind: 'doc', name: 'IC-memo-Q2-2026-draft.docx' }
    ]
  }
];

const icon = (kind) => {
  if (kind === 'doc') return FileText;
  if (kind === 'sheet') return FileSpreadsheet;
  return File;
};

export default function DocumentsWideTab() {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {tree.map((f) => (
        <FolderBlock key={f.id} folder={f} />
      ))}
    </div>
  );
}

function FolderBlock({ folder }) {
  return (
    <div
      style={{
        background: warm[200],
        border: `1px solid ${warm[700]}`,
        borderRadius: 10,
        padding: '14px 18px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Folder size={22} strokeWidth={2.4} color={info[500]} />
        <span style={{ fontSize: '20px', fontWeight: 700 }}>{folder.name}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
        {folder.children.map((d) => {
          const Icon = icon(d.kind);
          return (
            <div
              key={d.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: warm[100],
                border: `1px solid ${warm[600]}`,
                borderRadius: 6
              }}
            >
              <Icon size={18} strokeWidth={2.2} color={ink[500]} />
              <span style={{ fontSize: '20px' }}>{d.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
