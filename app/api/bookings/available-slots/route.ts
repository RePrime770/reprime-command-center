import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const TZ = 'America/Chicago'

// ── Auth (mirrors lib/google/calendar.ts inline) ─────────────────────────────
function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return YYYY-MM-DD string in Central time for a given UTC Date */
function toChicagoDateStr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Parse "YYYY-MM-DD" to a Date at the given hour:minute in Central time */
function chicagoTime(dateStr: string, hour: number, minute: number): Date {
  // Build a local-time string that Chicago would use, let Intl resolve the offset
  const isoLike = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  // We use a trick: create an ISO string with the offset that Chicago has at that moment
  // by formatting an approximate date and reading back the offset.
  const approx = new Date(`${isoLike}Z`) // wrong UTC, but gives us a date to query offset
  const offsetMs = getChicagoOffsetMs(approx)
  return new Date(approx.getTime() + offsetMs)
}

/** Get the UTC offset for Chicago at the given UTC date (accounts for DST) */
function getChicagoOffsetMs(utcDate: Date): number {
  // Format the date as if in Chicago, then compare to UTC
  const chicagoParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(utcDate)

  const getPart = (type: string) => chicagoParts.find(p => p.type === type)?.value ?? '0'
  const year = parseInt(getPart('year'))
  const month = parseInt(getPart('month')) - 1
  const day = parseInt(getPart('day'))
  let hour = parseInt(getPart('hour'))
  if (hour === 24) hour = 0
  const minute = parseInt(getPart('minute'))
  const second = parseInt(getPart('second'))

  const chicagoAsUtc = Date.UTC(year, month, day, hour, minute, second)
  return chicagoAsUtc - utcDate.getTime()
}

/** Convert a UTC date to wall-clock time in Chicago */
function toChicagoWallClock(utcDate: Date): { hour: number; minute: number; dayOfWeek: number; dateStr: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    weekday: 'short',
  }).formatToParts(utcDate)

  const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  let hour = parseInt(getPart('hour'))
  if (hour === 24) hour = 0
  const minute = parseInt(getPart('minute'))
  const weekdayStr = getPart('weekday') // 'Sun', 'Mon', etc.
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayStr)
  const year = getPart('year')
  const month = getPart('month')
  const day = getPart('day')
  const dateStr = `${year}-${month}-${day}`

  return { hour, minute, dayOfWeek, dateStr }
}

/** Display string: "Monday, May 4 at 9:00 AM" Central */
function formatSlotDisplay(iso: string): string {
  const d = new Date(iso)
  const fmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  })
  return `${fmt.format(d)} Central`
}

/** Day-label for a YYYY-MM-DD string, e.g. "Monday, May 4" */
function formatDayLabel(dateStr: string): string {
  // Parse date as noon UTC to avoid off-by-one
  const d = new Date(`${dateStr}T12:00:00Z`)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: TZ,
  }).format(d)
}

// ── Hebcal ───────────────────────────────────────────────────────────────────

interface HebcalItem {
  date: string   // "YYYY-MM-DD"
  title: string
  yomtov?: boolean
}

async function fetchClosedDates(startDate: Date, endDate: Date): Promise<Set<string>> {
  const closed = new Set<string>()

  // Collect month/year pairs in the window
  const months = new Set<string>()
  const cur = new Date(startDate)
  while (cur <= endDate) {
    const yyyy = cur.getUTCFullYear()
    const mm = cur.getUTCMonth() + 1
    months.add(`${yyyy}-${mm}`)
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  await Promise.all(
    Array.from(months).map(async (ym) => {
      const [yyyy, mm] = ym.split('-')
      const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&nx=off&mf=off&ss=off&mod=off&yt=on&lg=s&c=off&year=${yyyy}&month=${mm}`
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as { items?: HebcalItem[] }
        for (const item of json.items ?? []) {
          if (item.yomtov === true) {
            closed.add(item.date)
          }
        }
      } catch (err) {
        console.error('[available-slots] Hebcal fetch error', err)
      }
    })
  )

  return closed
}

// ── Freebusy ─────────────────────────────────────────────────────────────────

interface BusyInterval {
  start: number // ms
  end: number
}

async function fetchBusyTimes(timeMin: string, timeMax: string): Promise<BusyInterval[]> {
  const calendar = google.calendar({ version: 'v3', auth: getAuthClient() })
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: 'UTC',
      items: [{ id: 'primary' }],
    },
  })
  const busyRanges = res.data?.calendars?.primary?.busy ?? []
  return busyRanges.map((b) => ({
    start: new Date(b.start!).getTime(),
    end: new Date(b.end!).getTime(),
  }))
}

function overlaps(slotStart: number, slotEnd: number, busy: BusyInterval[]): boolean {
  for (const b of busy) {
    if (slotStart < b.end && slotEnd > b.start) return true
  }
  return false
}

// ── Main schedule generation ──────────────────────────────────────────────────

export async function GET() {
  try {
    const now = new Date()
    const twoHoursFromNow = now.getTime() + 2 * 60 * 60 * 1000

    // 14-day window (UTC bounds)
    const windowStart = new Date(now)
    windowStart.setUTCHours(0, 0, 0, 0)
    const windowEnd = new Date(windowStart)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 14)

    const [busyTimes, closedDates] = await Promise.all([
      fetchBusyTimes(windowStart.toISOString(), windowEnd.toISOString()),
      fetchClosedDates(windowStart, windowEnd),
    ])

    // Generate all slots in the 14-day window
    // Key: YYYY-MM-DD dateStr in Chicago time
    const slotsByDate = new Map<string, Array<{ iso: string; display: string }>>()

    // Iterate day by day
    const dayCursor = new Date(windowStart)
    while (dayCursor < windowEnd) {
      const dateStr = toChicagoDateStr(dayCursor)

      // Determine day of week at this Chicago date (use noon to be safe)
      const noonUtc = new Date(`${dateStr}T18:00:00Z`) // ~noon Chicago
      const { dayOfWeek } = toChicagoWallClock(noonUtc)

      // Saturday = 6 → always closed
      if (dayOfWeek === 6) {
        dayCursor.setUTCDate(dayCursor.getUTCDate() + 1)
        continue
      }

      // Yom Tov → office closed
      if (closedDates.has(dateStr)) {
        dayCursor.setUTCDate(dayCursor.getUTCDate() + 1)
        continue
      }

      // Determine operating hours for this day (Central time)
      // Captain 2026-05-26: Lowered floor to 6 AM CDT (= 14:00 IDT) per
      // Gideon's directive — Israeli contacts on /choose page need to be
      // able to pick afternoon-Israel slots starting at 14:00 IDT. Picker
      // logic surfaces the right defaults per locale (8/9/10 AM CDT for IL,
      // 9 AM / noon / 5 PM CDT for US). Sunday-Thursday 6 AM - 9 PM CDT.
      // Friday remains short (Shabbat lead-up): 6 AM - 1 PM CDT.
      const startHour = 6
      const endHour = dayOfWeek === 5 ? 13 : 21 // 1pm Fri, 9pm Sun-Thu

      // Generate 30-min slots
      for (let h = startHour; h < endHour; h++) {
        for (const m of [0, 30]) {
          const slotStart = chicagoTime(dateStr, h, m)
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

          // Filter past slots (< 2 hours from now)
          if (slotStart.getTime() < twoHoursFromNow) continue

          // Filter if overlaps existing calendar events
          if (overlaps(slotStart.getTime(), slotEnd.getTime(), busyTimes)) continue

          // Verify the slot's Chicago date matches (edge case near midnight)
          const slotDateStr = toChicagoDateStr(slotStart)
          if (slotDateStr !== dateStr) continue

          if (!slotsByDate.has(dateStr)) slotsByDate.set(dateStr, [])
          slotsByDate.get(dateStr)!.push({
            iso: slotStart.toISOString(),
            display: formatSlotDisplay(slotStart.toISOString()),
          })
        }
      }

      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1)
    }

    const slots = Array.from(slotsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, times]) => ({
        date: dateStr,
        label: formatDayLabel(dateStr),
        times,
      }))

    return NextResponse.json({ slots })
  } catch (err) {
    console.error('[available-slots] error', err)
    return NextResponse.json({ error: 'internal_error', message: (err as Error).message }, { status: 500 })
  }
}
