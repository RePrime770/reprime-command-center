import type { gmail_v1 } from 'googleapis'

/**
 * Pure helpers for turning a Gmail `format: 'full'` message payload into
 * plain text the cockpit can render safely. NEVER returns raw HTML — this is
 * a public repo powering a live cockpit, so HTML bodies are stripped to text
 * (no dangerouslySetInnerHTML anywhere downstream).
 */

/** Cap applied by the /api/email/body route before the text ships to the UI. */
export const MAX_BODY_CHARS = 50_000

/** Decode a Gmail base64url body chunk. Returns '' on absent/invalid data. */
export function decodeBodyData(data?: string | null): string {
  if (!data || typeof data !== 'string') return ''
  try {
    return Buffer.from(data, 'base64url').toString('utf8')
  } catch {
    return ''
  }
}

export type ExtractedBody = {
  text: string
  source: 'plain' | 'html' | 'none'
}

/**
 * Walk a message payload depth-first; prefer text/plain parts (concatenated),
 * else fall back to the first text/html part stripped to plain text. Parts
 * with a filename (attachments) are skipped. Never returns raw HTML.
 */
export function extractPlainTextBody(
  payload?: gmail_v1.Schema$MessagePart,
): ExtractedBody {
  if (!payload) return { text: '', source: 'none' }
  const plainChunks: string[] = []
  const htmlChunks: string[] = []
  collectTextParts(payload, plainChunks, htmlChunks)
  const plain = plainChunks.join('\n\n').trim()
  if (plain) return { text: plain, source: 'plain' }
  const html = htmlChunks.length > 0 ? htmlToPlainText(htmlChunks[0]) : ''
  if (html) return { text: html, source: 'html' }
  return { text: '', source: 'none' }
}

/** Depth-first collection of decoded text/plain and text/html chunks. */
function collectTextParts(
  part: gmail_v1.Schema$MessagePart,
  plain: string[],
  html: string[],
): void {
  // Attachments carry a filename (Gmail sets '' on inline body parts).
  if (part.filename) return
  const mime = (part.mimeType || '').toLowerCase()
  if (mime === 'text/plain') {
    const decoded = decodeBodyData(part.body?.data)
    if (decoded) plain.push(decoded)
  } else if (mime === 'text/html') {
    const decoded = decodeBodyData(part.body?.data)
    if (decoded) html.push(decoded)
  }
  for (const child of part.parts ?? []) {
    collectTextParts(child, plain, html)
  }
}

/**
 * Strip an HTML email down to readable plain text: drop style/script blocks,
 * turn structural tags into newlines, remove remaining tags, decode the
 * handful of entities that dominate email HTML, collapse blank runs.
 */
function htmlToPlainText(rawHtml: string): string {
  const withoutBlocks = rawHtml
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
  const withBreaks = withoutBlocks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '')
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    // &amp; last so encoded entities (&amp;lt;) don't double-decode.
    .replace(/&amp;/gi, '&')
  return decoded
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
