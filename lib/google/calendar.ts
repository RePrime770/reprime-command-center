import { google } from 'googleapis'

function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

export async function getTodayEvents() {
  const calendar = google.calendar({ version: 'v3', auth: getAuthClient() })
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86400000)
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })
  return res.data.items?.map(event => ({
    id: event.id!,
    title: event.summary || 'Untitled',
    startTime: event.start?.dateTime || event.start?.date!,
    endTime: event.end?.dateTime || event.end?.date!,
    zoomLink: event.description?.match(/https:\/\/[^\s]*zoom\.us\/j\/[^\s]*/)?.[0] || null,
    attendees: event.attendees?.map(a => a.email!).filter(Boolean) || [],
  })) || []
}

export async function createCalendarEvent(opts: {
  summary: string
  description?: string
  startTime: string
  endTime: string
  attendees?: string[]
  zoomLink?: string
}) {
  const calendar = google.calendar({ version: 'v3', auth: getAuthClient() })
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: opts.summary,
      description: (opts.description || '') + (opts.zoomLink ? `\n\nZoom: ${opts.zoomLink}` : ''),
      start: { dateTime: opts.startTime, timeZone: 'America/Chicago' },
      end: { dateTime: opts.endTime, timeZone: 'America/Chicago' },
      attendees: opts.attendees?.map(email => ({ email })),
    },
  })
  return res.data.id
}
