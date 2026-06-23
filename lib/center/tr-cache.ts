import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

// Spanish-for-the-secretary translation with a permanent cache. Every surface
// she reads (the board cards via /track, the open thread via /history) routes
// Hebrew message text through here. Each distinct Hebrew string is translated
// ONCE by Claude and stored in tr_cache; every later render is a pure DB read,
// so the board can poll every 20s with no translation cost and she NEVER sees
// raw Hebrew. English/Spanish/empty strings pass through untouched (Gideon:
// "the English we can leave").

const isHe = (s: string) => /[֐-׿]/.test(s || '')
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex')

async function translateBatch(texts: string[]): Promise<string[]> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || !texts.length) return texts
  const sys = 'Translate each numbered line from Hebrew into natural, warm Latin-American Spanish for a Spanish-speaking real-estate secretary. Keep meaning, names, numbers, URLs and any media markers (📎) as-is. NEVER return Hebrew. Return STRICT JSON only: {"es":["...", ...]} with exactly one string per input line, in order.'
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 4000, system: sys, messages: [{ role: 'user', content: texts.map((s, i) => `${i + 1}. ${s}`).join('\n') }] }),
    })
    const j = await r.json()
    let t = (j.content || []).map((c: { text?: string }) => c.text || '').join('')
    t = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)
    const es = (JSON.parse(t).es || []) as string[]
    return texts.map((s, i) => (es[i] ? String(es[i]) : s))
  } catch {
    return texts
  }
}

/**
 * Translate an array of strings to Spanish, caching each distinct Hebrew string
 * forever. Non-Hebrew strings pass through unchanged. Output is aligned 1:1 with
 * input. Cache-only behaviour is safe — a miss falls back to one Claude batch
 * call, then is stored so it's never paid again.
 */
export async function esCached(texts: Array<string | null | undefined>): Promise<string[]> {
  const arr = (texts || []).map((t) => String(t || ''))
  const out = arr.slice()
  const items: Array<{ i: number; t: string; h: string }> = []
  arr.forEach((t, i) => { if (isHe(t)) items.push({ i, t, h: hash(t) }) })
  if (!items.length) return out

  const supabase = createServiceClient()
  const uniqHashes = Array.from(new Set(items.map((x) => x.h)))
  const cached = new Map<string, string>()
  try {
    const { data } = await supabase.from('tr_cache').select('src_hash, es').in('src_hash', uniqHashes)
    for (const r of (data || []) as Array<{ src_hash: string; es: string }>) cached.set(r.src_hash, r.es)
  } catch { /* cache optional */ }

  // Unique misses → one Claude batch → store.
  const missByHash = new Map<string, string>()
  for (const x of items) if (!cached.has(x.h)) missByHash.set(x.h, x.t)
  if (missByHash.size) {
    const misses = Array.from(missByHash.entries()) // [hash, src]
    const translated = await translateBatch(misses.map((m) => m[1]))
    const rows: Array<{ src_hash: string; src: string; es: string }> = []
    misses.forEach((m, k) => {
      const v = translated[k] || m[1]
      cached.set(m[0], v)
      rows.push({ src_hash: m[0], src: m[1].slice(0, 4000), es: v })
    })
    try { await supabase.from('tr_cache').upsert(rows, { onConflict: 'src_hash' }) } catch { /* best effort */ }
  }

  for (const x of items) out[x.i] = cached.get(x.h) || x.t
  return out
}
