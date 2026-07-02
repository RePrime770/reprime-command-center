import { describe, it, expect } from 'vitest'
import type { gmail_v1 } from 'googleapis'
import { decodeBodyData, extractPlainTextBody, MAX_BODY_CHARS } from './gmail-body'

/** Encode a UTF-8 string the way Gmail encodes body data (base64url). */
function b64url(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url')
}

describe('google/gmail-body.decodeBodyData', () => {
  it('decodes a base64url chunk containing - and _ characters', () => {
    // Arrange — '~~~???' encodes to 'fn5-Pz8_' (contains both - and _).
    const original = '~~~???'
    const encoded = b64url(original)
    expect(encoded).toContain('-')
    expect(encoded).toContain('_')

    // Act
    const decoded = decodeBodyData(encoded)

    // Assert
    expect(decoded).toBe(original)
  })

  it('returns empty string for absent data', () => {
    expect(decodeBodyData(undefined)).toBe('')
    expect(decodeBodyData(null)).toBe('')
    expect(decodeBodyData('')).toBe('')
  })
})

describe('google/gmail-body.extractPlainTextBody', () => {
  it('returns empty text with source none for an empty payload', () => {
    // Act
    const result = extractPlainTextBody(undefined)

    // Assert
    expect(result).toEqual({ text: '', source: 'none' })
  })

  it('decodes a single-part text/plain payload (body.data set directly)', () => {
    // Arrange
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'text/plain',
      body: { data: b64url('Hello Gideon,\n\nSee attached.') },
    }

    // Act
    const result = extractPlainTextBody(payload)

    // Assert
    expect(result.source).toBe('plain')
    expect(result.text).toBe('Hello Gideon,\n\nSee attached.')
  })

  it('prefers text/plain over text/html in multipart/alternative', () => {
    // Arrange
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/plain', body: { data: b64url('plain wins') } },
        { mimeType: 'text/html', body: { data: b64url('<p>html loses</p>') } },
      ],
    }

    // Act
    const result = extractPlainTextBody(payload)

    // Assert
    expect(result.source).toBe('plain')
    expect(result.text).toBe('plain wins')
  })

  it('falls back to stripped text/html when no text/plain part exists', () => {
    // Arrange
    const html =
      '<html><head><style>.x{color:red}</style></head>' +
      '<body><script>alert(1)</script><p>Hi &amp; welcome</p>' +
      '<div>Line two&nbsp;here</div><br>Tail &lt;end&gt;</body></html>'
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'multipart/alternative',
      parts: [{ mimeType: 'text/html', body: { data: b64url(html) } }],
    }

    // Act
    const result = extractPlainTextBody(payload)

    // Assert
    expect(result.source).toBe('html')
    // Markup is stripped BEFORE entities decode, so author-written &lt;end&gt;
    // survives as literal text while real tags are gone — assert on the tags,
    // not a blanket no-angle-brackets regex (which would contradict 'Tail <end>').
    expect(result.text).not.toMatch(/<\/?(html|head|body|p|div|br|style|script)\b/i)
    expect(result.text).not.toContain('color:red')
    expect(result.text).not.toContain('alert(1)')
    expect(result.text).toContain('Hi & welcome')
    expect(result.text).toContain('Line two here')
    expect(result.text).toContain('Tail <end>')
  })

  it('concatenates nested multipart text/plain parts depth-first', () => {
    // Arrange — multipart/mixed wrapping a multipart/alternative plus a trailer.
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: b64url('first chunk') } },
            { mimeType: 'text/html', body: { data: b64url('<p>ignored</p>') } },
          ],
        },
        { mimeType: 'text/plain', body: { data: b64url('second chunk') } },
      ],
    }

    // Act
    const result = extractPlainTextBody(payload)

    // Assert
    expect(result.source).toBe('plain')
    expect(result.text).toBe('first chunk\n\nsecond chunk')
  })

  it('skips attachment parts (filename set), even text/plain ones', () => {
    // Arrange
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: 'text/plain', body: { data: b64url('real body') } },
        {
          mimeType: 'text/plain',
          filename: 'notes.txt',
          body: { data: b64url('attachment text') },
        },
      ],
    }

    // Act
    const result = extractPlainTextBody(payload)

    // Assert
    expect(result.text).toBe('real body')
    expect(result.text).not.toContain('attachment text')
  })

  it('collapses 3+ newlines to 2 in the html fallback', () => {
    // Arrange
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'text/html',
      body: { data: b64url('<p>a</p><p></p><p></p><p>b</p>') },
    }

    // Act
    const result = extractPlainTextBody(payload)

    // Assert
    expect(result.text).toBe('a\n\nb')
  })

  it('exports a sane MAX_BODY_CHARS cap for route-side truncation', () => {
    expect(MAX_BODY_CHARS).toBe(50_000)
  })
})
