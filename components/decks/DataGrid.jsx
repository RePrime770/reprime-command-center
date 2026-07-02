import React from 'react';
import { ink, semantic } from '../cockpit/lib/colors.js';

// DataGrid — minimal token-based table for deck pages (architecture §4).
// Wide content scrolls inside the grid's OWN overflow-x container so a deck
// page body never scrolls horizontally.

const FONT = "var(--font-lexend), 'Lexend', 'Poppins', sans-serif";

/**
 * @param {{
 *   columns: Array<{
 *     key: string,
 *     label: string,
 *     align?: 'left' | 'right' | 'center',
 *     width?: number | string,
 *     render?: (row: object) => import('react').ReactNode,
 *   }>,
 *   rows: Array<object>,
 *   rowKey?: (row: object, index: number) => string,
 *   emptyText?: string,
 * }} props
 */
export default function DataGrid({ columns, rows, rowKey, emptyText = 'Nothing here yet.' }) {
  const cols = Array.isArray(columns) ? columns : [];
  const list = Array.isArray(rows) ? rows : [];

  return (
    <div
      style={{
        // Own horizontal scroll container — the page body must never scroll x.
        overflowX: 'auto',
        background: semantic.panelBg,
        border: `1px solid ${semantic.border}`,
        borderRadius: 12,
        boxShadow: semantic.panelShadow,
        fontFamily: FONT,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: cols.length * 140 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{
                  textAlign: c.align || 'left',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: ink[300],
                  padding: '12px 16px',
                  borderBottom: `1px solid ${semantic.border}`,
                  whiteSpace: 'nowrap',
                  width: c.width,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr>
              <td
                colSpan={Math.max(1, cols.length)}
                style={{ padding: '22px 16px', textAlign: 'center', fontSize: 16, color: ink[300] }}
              >
                {emptyText}
              </td>
            </tr>
          )}
          {list.map((row, i) => (
            <tr key={rowKey ? rowKey(row, i) : (row && row.id) || i}>
              {cols.map((c) => (
                <td
                  key={c.key}
                  style={{
                    textAlign: c.align || 'left',
                    fontSize: 16,
                    color: ink[700],
                    padding: '13px 16px',
                    borderTop: i === 0 ? 'none' : `1px solid ${semantic.divider}`,
                    lineHeight: 1.4,
                    verticalAlign: 'top',
                  }}
                >
                  {c.render ? c.render(row) : row?.[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
