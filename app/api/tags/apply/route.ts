import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { safeError } from '@/lib/api/safe-error'

export const dynamic = 'force-dynamic'

type Body = {
  thread_id?: string
  tag_id?: string
}

async function requireUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return null
  }
  return user
}

async function recomputeAndPersistInvestor(threadId: string): Promise<boolean> {
  const service = createServiceClient()

  const { data: joins, error: joinErr } = await service
    .from('thread_tags')
    .select('tag_id, tags!inner(is_investor)')
    .eq('thread_id', threadId)
    .eq('tags.is_investor', true)
    .limit(1)

  if (joinErr) {
    throw new Error(`recompute_join_failed: ${joinErr.message}`)
  }

  const isInvestor = ((joins as { tag_id: string }[] | null) || []).length > 0

  // Best-effort: update the denormalized is_investor flag if the column exists.
  // If the column is missing, swallow the error so the rest of the flow still
  // works (the panel computes investor status via the join above).
  const { error: updateErr } = await service
    .from('whatsapp_threads')
    .update({ is_investor: isInvestor })
    .eq('id', threadId)

  if (updateErr && !/column .* does not exist/i.test(updateErr.message)) {
    throw new Error(`is_investor_update_failed: ${updateErr.message}`)
  }

  return isInvestor
}

export async function POST(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const threadId = body.thread_id
  const tagId = body.tag_id
  if (!threadId || !tagId) {
    return NextResponse.json({ error: 'thread_id_and_tag_id_required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { error: insertErr } = await service
    .from('thread_tags')
    .upsert({ thread_id: threadId, tag_id: tagId }, { onConflict: 'thread_id,tag_id' })

  if (insertErr) {
    return safeError('tags/apply', insertErr, { code: 'db_insert_failed', status: 500 })
  }

  try {
    const isInvestor = await recomputeAndPersistInvestor(threadId)
    return NextResponse.json({ ok: true, is_investor: isInvestor })
  } catch (e) {
    return safeError('tags/apply', e, { code: 'recompute_failed', status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const threadId = body.thread_id
  const tagId = body.tag_id
  if (!threadId || !tagId) {
    return NextResponse.json({ error: 'thread_id_and_tag_id_required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { error: deleteErr } = await service
    .from('thread_tags')
    .delete()
    .eq('thread_id', threadId)
    .eq('tag_id', tagId)

  if (deleteErr) {
    return safeError('tags/apply', deleteErr, { code: 'db_delete_failed', status: 500 })
  }

  try {
    const isInvestor = await recomputeAndPersistInvestor(threadId)
    return NextResponse.json({ ok: true, is_investor: isInvestor })
  } catch (e) {
    return safeError('tags/apply', e, { code: 'recompute_failed', status: 500 })
  }
}
