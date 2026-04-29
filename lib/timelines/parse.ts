export function parseTimelinesTimestamp(ts: string): Date {
  const m = ts.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})/)
  if (!m) return new Date(ts)
  return new Date(`${m[1]}T${m[2]}${m[3]}`)
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''
  const m = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (m) return `+1 (${m[1]}) ${m[2]}-${m[3]}`
  const m972 = phone.match(/^\+972(\d{1,2})(\d{3})(\d{4})$/)
  if (m972) return `+972 ${m972[1]}-${m972[2]}-${m972[3]}`
  return phone
}

export function getMediaType(filename: string | null): 'image' | 'document' | 'audio' | 'video' | null {
  if (!filename) return null
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['jpg','jpeg','png','gif','webp','heic','heif'].includes(ext)) return 'image'
  if (['mp3','ogg','opus','wav','m4a','aac'].includes(ext)) return 'audio'
  if (['mp4','mov','avi','mkv','webm','m4v','3gp'].includes(ext)) return 'video'
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','rtf','zip'].includes(ext)) return 'document'
  return 'document'
}

export function isHebrew(text: string | null | undefined): boolean {
  if (!text) return false
  return /[֐-׿יִ-ﭏ]/.test(text)
}
