import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import '@/lib/fabric/adapters'
import { routeCapability } from '@/lib/fabric/router'
import type { GenerateResponseInput, GenerateResponseOutput } from '@/lib/fabric/adapters/llm'

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

  const result = await routeCapability<GenerateResponseInput, GenerateResponseOutput>(
    'GENERATE_AI_RESPONSE',
    { system: SYSTEM, userMessage: userMsg, maxTokens: 400 }
  )
  if (!result.ok) {
    return NextResponse.json({ error: 'summarize_failed', message: result.message }, { status: 502 })
  }
  return NextResponse.json({ summary: result.data.text })
}
