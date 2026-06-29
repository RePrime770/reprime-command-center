import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

// Shared "Nora's read" summarizer for an email or a comms thread. Replaces the
// hardcoded template (email) and null placeholder (comms) with a real, short,
// plain-English read + the single most useful next move. Same per-open LLM
// pattern already used by /api/email/draft.
type SummarizeBody = {
  kind?: 'email' | 'thread'
  contactName?: string
  subject?: string
  from?: string
  text?: string
  language?: 'en' | 'he'
}

const SYSTEM = `You are Nora, Gideon Gratsiani's chief of staff at RePrime Group.
Give Gideon a SHORT plain-English read of the message below — how a sharp friend would
brief him in passing, not a report. Two or three sentences max:
1) what this is really about / what they want,
2) the single most useful next move (or "no action needed").
No preamble, no "Here's a summary", no marketing language, no AI/customer-service phrasing.
If the message is in Hebrew, write the read in Hebrew (dugri register).
Never invent facts not present in the message. Output ONLY the read.`

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: SummarizeBody
  try {
    body = (await request.json()) as SummarizeBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 })
  }

  const text = (body.text || '').trim()
  if (!text) return NextResponse.json({ summary: '' })

  const langHint = body.language === 'he' ? 'The message is in Hebrew — write the read in Hebrew.' : ''
  const userMsg = [
    body.kind === 'thread' ? 'This is a messaging thread.' : 'This is an email.',
    body.contactName ? `Contact: ${body.contactName}` : '',
    body.from ? `From: ${body.from}` : '',
    body.subject ? `Subject: ${body.subject}` : '',
    `Message:\n${text.slice(0, 4000)}`,
    langHint,
    "Give Gideon the read.",
  ]
    .filter(Boolean)
    .join('\n')

  const client = new Anthropic({ apiKey })
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })
    const summary = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    return NextResponse.json({ summary })
  } catch (err) {
    return NextResponse.json(
      { error: 'summarize_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 502 }
    )
  }
}
