import { NextResponse } from 'next/server'
import { centerAuthed } from '@/lib/center/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The translation engine. Inbound investor messages (Hebrew or English) are
// rendered for the Spanish-speaking secretary, and her reply is turned into the
// message Gideon would actually send — native Israeli dugri Hebrew, never
// Google-Translate. This is the prompt that earned "the Hebrew is perfect."
const SYS_ANALYZE = `You are the command-center engine for an Israeli real-estate firm. Principal: Gideon Gratsiani (RePrime). The secretary works in SPANISH; investors are Israeli and must get natural native ISRAELI business Hebrew — dugri, warm, real WhatsApp register, never literal/Google-Translate, no Tanakh/academic tone. Read the whole thread for tone. If the thread is in English, keep everything English (reply_he should then mirror the English reply, not translate to Hebrew).
Return STRICT JSON only (no code fences):
 context_es: 1-2 Spanish sentences — what this is about + what we last said.
 their_message_es: their latest message in natural Spanish.
 their_message_en: their latest message in natural English.
 lang: "he" or "en" — the language the investor writes in.
 suggestions: array of EXACTLY 2 reply options, keys: label_es (2-4 word Spanish label of the angle), reply_es (the reply in Spanish), reply_he (the same reply exactly as Gideon would send it — Israeli Hebrew if the investor writes Hebrew, otherwise English).
 The WHOLE GOAL is to get them onto a Zoom. So:
  • suggestion[0] (the DEFAULT) must warmly DRIVE TO A ZOOM — end by inviting them to set a time with Gideon. A scheduling link is appended automatically by the system, so DO NOT invent or write any URL yourself; just lead into it (e.g. "…אשמח לקבוע זום קצר, הנה הקישור לתיאום:" / in English "…happy to set a short Zoom, here's the link to grab a time:").
  • suggestion[1] is a warm reply that does NOT push a meeting and gets NO link.
Return ONLY JSON.`

// "Schedule with Gideon" link (READ ME canonical). Appended to suggestion[0]
// so the default reply always hands the investor a way onto a Zoom.
const SCHEDULER = 'https://scheduler.zoom.us/t/2I08gj22/schedule-with-gideon-czf4njv8'

const SYS_FINALIZE = `You turn a reply written by a Spanish-speaking secretary into the message Gideon Gratsiani (RePrime, Israeli real-estate principal) will actually send.
Target Hebrew: natural native ISRAELI business Hebrew — dugri, warm, real WhatsApp register, never literal/Google-Translate, no Tanakh/academic/biblical tone.
Target English: natural, warm, concise, founder-to-peer.
Return STRICT JSON only (no fences): { final: "<the message, ready to send>" }.`

async function claude(system: string, user: string) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 2000, system, messages: [{ role: 'user', content: user }] }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + JSON.stringify(j).slice(0, 200))
  let t = (j.content || []).map((c: { text?: string }) => c.text || '').join('')
  t = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)
  return JSON.parse(t)
}

export async function POST(request: Request) {
  if (!centerAuthed(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { action?: string; thread?: string; latest?: string; draft?: string; target?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  try {
    if (body.action === 'finalize') {
      const out = await claude(SYS_FINALIZE, `Target language: ${body.target === 'en' ? 'English' : 'Hebrew'}.\nSecretary wrote:\n${body.draft || ''}`)
      return NextResponse.json({ final: out.final || '' })
    }
    const out = await claude(SYS_ANALYZE, `Thread (old to new):\n${body.thread || '(no prior context — this was just the invitation)'}\n\nLatest from them: ${body.latest || ''}`)
    // Default suggestion always carries the Zoom-scheduling link (the goal is to
    // get them on a Zoom). The 2nd stays clean. Append deterministically so the
    // link is always correct, never hallucinated.
    if (out && Array.isArray(out.suggestions) && out.suggestions.length) {
      const isEn = out.lang === 'en'
      const s0 = out.suggestions[0]
      if (s0) {
        const heSig = isEn
          ? `\n\nHere's the link to grab a time with Gideon: ${SCHEDULER}`
          : `\n\nהנה הקישור לתיאום זום עם גדעון: ${SCHEDULER}`
        const esSig = `\n\nEnlace para agendar el Zoom: ${SCHEDULER}`
        if (s0.reply_he && !s0.reply_he.includes(SCHEDULER)) s0.reply_he = String(s0.reply_he).trimEnd() + heSig
        if (s0.reply_es && !s0.reply_es.includes(SCHEDULER)) s0.reply_es = String(s0.reply_es).trimEnd() + esSig
        s0.label_es = (s0.label_es || 'Opción 1') + ' · con Zoom'
      }
      if (out.suggestions[1]) out.suggestions[1].label_es = (out.suggestions[1].label_es || 'Opción 2') + ' · sin Zoom'
    }
    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 200) }, { status: 502 })
  }
}
