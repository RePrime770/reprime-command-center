import { createClient } from '@/lib/supabase/client';

/**
 * Upload a File/Blob to the Supabase `attachments` bucket and return its public
 * URL — the same bucket the legacy dashboard uses (components/chat/AttachmentUpload).
 * Key-free: uses the browser Supabase client + the auth-gated session.
 *
 * The returned URL is passed to POST /api/whatsapp/messages as `attachment_url`
 * (the send route already supports attachments), so this powers both file
 * attachments and WhatsApp-style voice notes.
 *
 * @param {File|Blob} file
 * @param {string} panel    '305' | '718'
 * @param {string} threadId thread phone/id (for the storage path)
 * @param {string} [filename]
 * @returns {Promise<{ url: string, filename: string, type: string }>}
 */
export async function uploadAttachment(file, panel, threadId, filename) {
  const supabase = createClient();
  const name = filename || file.name || 'attachment';
  const safe = name.replace(/[^\w.\-]+/g, '_');
  const path = `${panel || 'misc'}/${threadId || 'thread'}/${Date.now()}-${safe}`;
  const contentType = file.type || 'application/octet-stream';
  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('attachments').getPublicUrl(path);
  return { url: data.publicUrl, filename: safe, type: contentType };
}
