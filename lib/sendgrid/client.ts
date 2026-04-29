const SEND_URL = 'https://api.sendgrid.com/v3/mail/send'

export interface SendEmailInput {
  to: string | string[]
  from: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

function asAddressList(v: string | string[] | undefined): { email: string }[] | undefined {
  if (!v) return undefined
  const list = Array.isArray(v) ? v : [v]
  return list.map((email) => ({ email }))
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not set')

  const content: Array<{ type: string; value: string }> = []
  if (input.text) content.push({ type: 'text/plain', value: input.text })
  if (input.html) content.push({ type: 'text/html', value: input.html })
  if (content.length === 0) throw new Error('sendEmail requires text or html')

  const personalization: Record<string, unknown> = {
    to: asAddressList(input.to),
  }
  const cc = asAddressList(input.cc)
  if (cc) personalization.cc = cc
  const bcc = asAddressList(input.bcc)
  if (bcc) personalization.bcc = bcc

  const body: Record<string, unknown> = {
    personalizations: [personalization],
    from: { email: input.from },
    subject: input.subject,
    content,
  }
  if (input.replyTo) body.reply_to = { email: input.replyTo }

  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`SendGrid send failed: ${res.status} ${await res.text()}`)
  }
}
