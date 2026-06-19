import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

// Captain 2026-05-24 — Calendly/Zoom-style picker.
// Month calendar grid on top with clickable dates. Below it the time slots
// for the selected date (9 AM – 5 PM Central, 30-minute intervals). Each
// time slot is a form button → POST /api/bookings/confirm → full Zoom +
// Calendar + Email + WhatsApp flow.
//
// State is URL-driven (?month=YYYY-MM&date=YYYY-MM-DD) so the whole picker
// works as a pure server component with no client JS.

interface Invitation {
  contact_first_name: string | null
  contact_name: string | null
  contact_email: string | null
  status: 'sent' | 'confirmed' | 'expired' | 'cancelled'
  expires_at: string | null
}

async function loadInvitation(token: string): Promise<Invitation | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('invitations')
    .select('contact_first_name, contact_name, contact_email, status, expires_at')
    .eq('id', token)
    .maybeSingle()
  return (data as Invitation) ?? null
}

// ── Date helpers (Chicago-aware) ─────────────────────────────────────────

function chicagoToday(): { yyyy: string; mm: string; dd: string; wk: string } {
  return chicagoParts(new Date())
}

function chicagoParts(d: Date): { yyyy: string; mm: string; dd: string; wk: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
  return { yyyy: get('year'), mm: get('month'), dd: get('day'), wk: get('weekday') }
}

function chicagoOffsetFor(yyyy: string, mm: string, dd: string): string {
  const probe = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`)
  const tz = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    timeZoneName: 'longOffset',
  })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value || 'GMT-05:00'
  return tz.match(/GMT([+-]\d{2}:\d{2})/)?.[1] || '-05:00'
}

function monthLabel(yyyy: number, mm: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'long',
    year: 'numeric',
  }).format(new Date(yyyy, mm - 1, 15))
}

function dayWeekdayShort(yyyy: string, mm: string, dd: string): string {
  return chicagoParts(new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`)).wk
}

function fullDateLabel(yyyy: string, mm: string, dd: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`))
}

// Locked availability windows (all Central). Gideon 2026-06-18:
// Sun 11a-11p, Mon-Thu 9a-11p, Fri 9-10a (erev Shabbat), Sat closed,
// Yom Tov closed, erev Yom Tov capped at 10a (same as Friday).
function windowFor(weekdayShort: string, isErev: boolean): { start: number; end: number } | null {
  if (weekdayShort === 'Sat') return null
  let start: number, end: number
  if (weekdayShort === 'Sun') { start = 11; end = 23 }
  else if (weekdayShort === 'Fri') { start = 9; end = 10 }
  else { start = 9; end = 23 }
  if (isErev) end = Math.min(end, 10)
  if (start >= end) return null
  return { start, end }
}

// Both clocks on every slot so an Israeli investor picks by their own time
// while Gideon reads Central. e.g. "5:00 PM Israel · 9:00 AM Central".
function formatDualFromIso(iso: string): string {
  const d = new Date(iso)
  const il = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Jerusalem' }).format(d)
  const ct = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(d)
  return `${il} Israel · ${ct} Central`
}

// 30-minute slots inside the day's locked window. Empty if the day is closed.
function generateTimeSlotsForDate(
  yyyy: string, mm: string, dd: string, weekdayShort: string, isErev: boolean
) {
  const win = windowFor(weekdayShort, isErev)
  if (!win) return []
  const offset = chicagoOffsetFor(yyyy, mm, dd)
  const slots: Array<{ iso: string; display: string }> = []
  for (let h = win.start; h < win.end; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0')
      const min = String(m).padStart(2, '0')
      const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00.000${offset}`
      // Israel-hours cap: only 8 AM–10 PM Israel (no middle-of-the-night slots).
      const ilHour = parseInt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }).format(new Date(iso)), 10)
      if (ilHour < 8 || ilHour >= 22) continue
      slots.push({ iso, display: formatDualFromIso(iso) })
    }
  }
  return slots
}

// ── Hebcal (free, no key) — Yom Tov closures + erev detection ──────────────
async function fetchHebcalClosed(yms: Array<{ y: number; m: number }>): Promise<Set<string>> {
  const closed = new Set<string>()
  await Promise.all(yms.map(async ({ y, m }) => {
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&nx=off&mf=off&ss=off&mod=off&yt=on&lg=s&c=off&year=${y}&month=${m}`
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as { items?: Array<{ date: string; yomtov?: boolean }> }
      for (const item of json.items ?? []) if (item.yomtov === true) closed.add(item.date)
    } catch { /* fail open — better to show a day than hide everything */ }
  }))
  return closed
}

function prevDayStr(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ── Calendar grid model ──────────────────────────────────────────────────

interface DayCell {
  yyyy: string
  mm: string
  dd: string
  inMonth: boolean
  isPast: boolean
  isSat: boolean
  isToday: boolean
  isSelected: boolean
}

function buildMonthGrid(
  viewYear: number,
  viewMonth: number,
  todayKey: string,
  selectedKey: string,
): DayCell[] {
  const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth - 1, 1))
  const lastOfMonth = new Date(Date.UTC(viewYear, viewMonth, 0))
  const firstWeekday = firstOfMonth.getUTCDay() // 0 = Sun
  const daysInMonth = lastOfMonth.getUTCDate()

  // Previous month tail
  const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1
  const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear
  const daysInPrev = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate()

  const cells: DayCell[] = []

  // Leading padding from previous month
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrev - i
    const yyyy = String(prevYear)
    const mm = String(prevMonth).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    cells.push({
      yyyy, mm, dd,
      inMonth: false,
      isPast: `${yyyy}-${mm}-${dd}` < todayKey,
      isSat: dayWeekdayShort(yyyy, mm, dd) === 'Sat',
      isToday: false,
      isSelected: false,
    })
  }

  // This month
  for (let day = 1; day <= daysInMonth; day++) {
    const yyyy = String(viewYear)
    const mm = String(viewMonth).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const key = `${yyyy}-${mm}-${dd}`
    cells.push({
      yyyy, mm, dd,
      inMonth: true,
      isPast: key < todayKey,
      isSat: dayWeekdayShort(yyyy, mm, dd) === 'Sat',
      isToday: key === todayKey,
      isSelected: key === selectedKey,
    })
  }

  // Trailing padding to fill the grid (6 rows × 7 cols = 42)
  const totalNeeded = Math.ceil(cells.length / 7) * 7
  const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1
  const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear
  let tail = 1
  while (cells.length < Math.max(totalNeeded, 42)) {
    const yyyy = String(nextYear)
    const mm = String(nextMonth).padStart(2, '0')
    const dd = String(tail).padStart(2, '0')
    cells.push({
      yyyy, mm, dd,
      inMonth: false,
      isPast: false,
      isSat: dayWeekdayShort(yyyy, mm, dd) === 'Sat',
      isToday: false,
      isSelected: false,
    })
    tail++
  }

  return cells
}

// ── Metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const inv = await loadInvitation(token)
  const displayName = inv?.contact_name || inv?.contact_first_name || 'Guest'
  return {
    title: `Pick a Time — ${displayName}`,
    description: 'Choose any time that works.',
    robots: { index: false, follow: false },
  }
}

// ── Page ─────────────────────────────────────────────────────────────────

export default async function ChooseTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ month?: string; date?: string; taken?: string }>
}) {
  const { token } = await params
  const { month: monthParam, date: dateParam, taken: takenParam } = await searchParams
  const inv = await loadInvitation(token)

  if (!inv) return <NotValidPage message="This invitation link is not valid." />
  if (inv.status === 'cancelled') return <NotValidPage message="This introduction has been cancelled." />
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return <NotValidPage message="This invitation has expired." />
  }
  if (inv.status === 'confirmed') {
    return <NotValidPage message="Already confirmed. Open the original invitation to reschedule." />
  }

  const firstName =
    (inv.contact_first_name || inv.contact_name || 'there').trim().split(' ')[0] || 'there'

  const today = chicagoToday()
  const todayKey = `${today.yyyy}-${today.mm}-${today.dd}`

  // Default view = today's month. ?month=YYYY-MM overrides.
  let viewYear = parseInt(today.yyyy, 10)
  let viewMonth = parseInt(today.mm, 10)
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    viewYear = y
    viewMonth = m
  }

  // Yom Tov closures for the visible month + neighbors (erev can spill across
  // a month boundary). Closed days are disabled; the day before is erev (10a cap).
  const prevM = viewMonth === 1 ? 12 : viewMonth - 1
  const prevY = viewMonth === 1 ? viewYear - 1 : viewYear
  const nextM = viewMonth === 12 ? 1 : viewMonth + 1
  const nextY = viewMonth === 12 ? viewYear + 1 : viewYear
  const closedDates = await fetchHebcalClosed([
    { y: prevY, m: prevM }, { y: viewYear, m: viewMonth }, { y: nextY, m: nextM },
  ])
  const erevDates = new Set<string>()
  for (const d of closedDates) erevDates.add(prevDayStr(d))

  // Default selected date = today (if open) or next open day in view month.
  let selectedKey = ''
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    selectedKey = dateParam
  } else {
    // Auto-select: first non-Sat, non-YomTov, non-past date in view month
    const monthStr = String(viewMonth).padStart(2, '0')
    const lastDay = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate()
    for (let d = 1; d <= lastDay; d++) {
      const dd = String(d).padStart(2, '0')
      const k = `${viewYear}-${monthStr}-${dd}`
      if (k >= todayKey && dayWeekdayShort(String(viewYear), monthStr, dd) !== 'Sat' && !closedDates.has(k)) {
        selectedKey = k
        break
      }
    }
  }

  const cells = buildMonthGrid(viewYear, viewMonth, todayKey, selectedKey)
  const monthLbl = monthLabel(viewYear, viewMonth)

  // Prev / next month nav
  const prevMonthParam =
    viewMonth === 1 ? `${viewYear - 1}-12` : `${viewYear}-${String(viewMonth - 1).padStart(2, '0')}`
  const nextMonthParam =
    viewMonth === 12 ? `${viewYear + 1}-01` : `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`

  // Time slots for selected date
  let selectedYyyy = '', selectedMm = '', selectedDd = '', selectedLabel = '', timeSlots: Array<{iso: string; display: string}> = []
  if (selectedKey && !closedDates.has(selectedKey)) {
    ;[selectedYyyy, selectedMm, selectedDd] = selectedKey.split('-')
    selectedLabel = fullDateLabel(selectedYyyy, selectedMm, selectedDd)
    const wk = dayWeekdayShort(selectedYyyy, selectedMm, selectedDd)
    timeSlots = generateTimeSlotsForDate(selectedYyyy, selectedMm, selectedDd, wk, erevDates.has(selectedKey))
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={hdrStyle}>
          <Spindle />
          <div style={wordmarkStyle}>TERMINAL</div>
          <Spindle />
        </div>

        <div style={letterWrap}>
          <div style={letterContent}>
            <div style={letterLabel}>A note from Gideon Gratsiani</div>
            <div style={letterGreeting}>{firstName} —</div>
            {takenParam ? (
              <div style={{
                background: 'rgba(255, 204, 51, 0.12)', border: '1px solid rgba(255, 204, 51, 0.5)',
                borderRadius: 6, padding: '12px 16px', margin: '4px 0 12px',
                fontFamily: 'Poppins, sans-serif', fontSize: 14, color: '#FFCC33', lineHeight: 1.6,
              }}>
                That time was just booked by someone else — sorry about that. Pick any other time below; these are all open.
              </div>
            ) : null}
            <div style={letterBody}>Pick any day and time that works — every time shows in Israel and Central.</div>
          </div>
        </div>

        {/* Calendar grid */}
        <div style={calWrap}>
          <div style={calNavRow}>
            <a
              href={`/invite/${token}/choose?month=${prevMonthParam}`}
              style={calNavBtn}
              aria-label="Previous month"
            >
              ←
            </a>
            <div style={monthLblStyle}>{monthLbl}</div>
            <a
              href={`/invite/${token}/choose?month=${nextMonthParam}`}
              style={calNavBtn}
              aria-label="Next month"
            >
              →
            </a>
          </div>

          <div style={dowRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} style={dowCell}>{d}</div>
            ))}
          </div>

          <div style={gridStyle}>
            {cells.map((c, i) => {
              const disabled = c.isPast || c.isSat || !c.inMonth || closedDates.has(`${c.yyyy}-${c.mm}-${c.dd}`)
              const dayLabel = parseInt(c.dd, 10).toString()
              const monthForLink = `${c.yyyy}-${c.mm}`
              const dateForLink = `${c.yyyy}-${c.mm}-${c.dd}`
              if (disabled) {
                return (
                  <div key={i} style={{
                    ...dayCellBase,
                    color: c.inMonth ? 'rgba(255, 204, 51, 0.22)' : 'rgba(255, 204, 51, 0.10)',
                    cursor: 'default',
                  }}>
                    {dayLabel}
                  </div>
                )
              }
              return (
                <a
                  key={i}
                  href={`/invite/${token}/choose?month=${monthForLink}&date=${dateForLink}`}
                  style={{
                    ...dayCellBase,
                    background: c.isSelected ? '#FFCC33' : 'transparent',
                    color: c.isSelected ? '#0E3470' : '#FFCC33',
                    fontWeight: c.isToday ? 700 : 500,
                    border: c.isToday && !c.isSelected ? '1px solid rgba(255, 204, 51, 0.55)' : '1px solid transparent',
                  }}
                >
                  {dayLabel}
                </a>
              )
            })}
          </div>
        </div>

        {/* Time slots for selected date — single form wraps email + buttons */}
        {selectedKey && (
          <div style={slotsWrap}>
            <div style={selectedDayLabel}>{selectedLabel}</div>
            <form action="/api/bookings/confirm" method="POST">
              <input type="hidden" name="token" value={token} />
              {!inv.contact_email && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textIndent: '0.18em',
                    color: '#FFCC33',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                    textAlign: 'center',
                  }}>
                    Your email (for Zoom + calendar invite)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: 'rgba(255, 204, 51, 0.05)',
                      border: '0.5px solid rgba(255, 204, 51, 0.40)',
                      borderRadius: 2,
                      color: '#FFCC33',
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: 14,
                      marginBottom: 4,
                      textAlign: 'center',
                    }}
                  />
                  <div style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: 10,
                    color: 'rgba(255, 204, 51, 0.55)',
                    textAlign: 'center',
                    fontStyle: 'italic',
                  }}>
                    Optional. We&rsquo;ll send the confirmation if you fill this in.
                  </div>
                </div>
              )}
              <div style={slotsGrid}>
                {timeSlots.map((slot) => (
                  <button
                    key={slot.iso}
                    type="submit"
                    name="slot_iso"
                    value={slot.iso}
                    style={slotBtn}
                  >
                    {slot.display}
                  </button>
                ))}
              </div>
            </form>
            <div style={{ fontSize: 11, color: 'rgba(255, 204, 51, 0.65)', textAlign: 'center', marginTop: 14, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.10em' }}>
              EACH TIME SHOWN IN ISRAEL & CENTRAL · ONE CLICK CONFIRMS
            </div>
          </div>
        )}

        <div style={{ padding: '14px 48px 22px', textAlign: 'center', background: '#0E3470' }}>
          <a href={`/invite/${token}`} style={backLink}>
            ← Back to suggested times
          </a>
        </div>

        <div style={footerStyle}>
          <div style={footerName}>TERMINAL</div>
          <div style={footerBy}>by RePrime</div>
          <div style={footerSub}>This invitation was sent personally. Reply directly to Gideon.</div>
        </div>
      </div>
    </main>
  )
}

function NotValidPage({ message }: { message: string }) {
  return (
    <main style={{ ...pageStyle, padding: '4rem 1.5rem', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
        <p style={{ color: '#FFCC33', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.5rem', fontFamily: 'Poppins, Arial, sans-serif' }}>
          RePrime Group
        </p>
        <p style={{ color: '#FFCC33', fontSize: '1.1rem', letterSpacing: '0.04em', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
          {message}
        </p>
      </div>
    </main>
  )
}

function Spindle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width="70%" height="7" viewBox="0 0 460 7" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tl-spindle-choose" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0E3470" />
            <stop offset="10%" stopColor="#FFCC33" />
            <stop offset="90%" stopColor="#FFCC33" />
            <stop offset="100%" stopColor="#0E3470" />
          </linearGradient>
        </defs>
        <path d="M0,3.5 Q230,0 460,3.5 Q230,7 0,3.5 Z" fill="url(#tl-spindle-choose)" />
      </svg>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  background: '#DDD9D2',
  minHeight: '100vh',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
  fontFamily: 'Poppins, sans-serif',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  background: '#0E3470',
  border: '1px solid rgba(255, 204, 51, 0.22)',
  borderRadius: 2,
  overflow: 'hidden',
}

const hdrStyle: React.CSSProperties = {
  background: '#0E3470',
  padding: '22px 48px 20px',
  textAlign: 'center',
  borderBottom: '1px solid rgba(255, 204, 51, 0.18)',
}

const wordmarkStyle: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 26,
  letterSpacing: '0.30em',
  color: '#FFCC33',
  fontWeight: 600,
  margin: '11px 0',
  textIndent: '0.30em',
}

const letterWrap: React.CSSProperties = {
  padding: '24px 36px 18px',
  background: 'linear-gradient(180deg, #F8F0DA 0%, #EFE2C4 100%)',
  margin: '24px 36px 18px',
  border: '1px solid rgba(255, 204, 51, 0.30)',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
}

const letterContent: React.CSSProperties = { textAlign: 'center', padding: '6px 4px' }

const letterLabel: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 11,
  color: 'rgba(14, 52, 112, 0.55)',
  fontStyle: 'italic',
  marginBottom: 14,
  letterSpacing: '0.04em',
}

const letterGreeting: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 24,
  color: '#0E3470',
  fontWeight: 600,
  fontStyle: 'italic',
  marginBottom: 8,
}

const letterBody: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 16,
  color: '#0E3470',
  lineHeight: 1.5,
  fontStyle: 'italic',
}

const calWrap: React.CSSProperties = {
  padding: '8px 36px 22px',
  background: '#0E3470',
}

const calNavRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 14,
}

const calNavBtn: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 22,
  color: '#FFCC33',
  textDecoration: 'none',
  padding: '6px 14px',
  border: '1px solid rgba(255, 204, 51, 0.35)',
  borderRadius: 2,
  background: 'transparent',
  cursor: 'pointer',
}

const monthLblStyle: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 19,
  color: '#FFCC33',
  fontWeight: 600,
  letterSpacing: '0.04em',
}

const dowRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 4,
  marginBottom: 4,
}

const dowCell: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 11,
  fontWeight: 600,
  color: '#FFCC33',
  textAlign: 'center',
  letterSpacing: '0.12em',
  padding: '6px 0',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 4,
}

const dayCellBase: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 16,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  borderRadius: 2,
  transition: 'background 0.15s ease',
}

const slotsWrap: React.CSSProperties = {
  padding: '14px 36px 22px',
  background: '#0E3470',
  borderTop: '1px solid rgba(255, 204, 51, 0.18)',
}

const selectedDayLabel: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 17,
  color: '#FFCC33',
  fontWeight: 600,
  textAlign: 'center',
  margin: '6px 0 14px',
  fontStyle: 'italic',
}

const slotsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 8,
}

const slotBtn: React.CSSProperties = {
  width: '100%',
  padding: '12px 8px',
  background: 'rgba(255, 204, 51, 0.07)',
  color: '#FFCC33',
  border: '1px solid rgba(255, 204, 51, 0.45)',
  borderRadius: 2,
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 15,
  cursor: 'pointer',
  letterSpacing: '0.02em',
}

const backLink: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 12,
  color: '#FFCC33',
  letterSpacing: '0.10em',
  textDecoration: 'none',
  textTransform: 'uppercase',
}

const footerStyle: React.CSSProperties = {
  background: '#0E3470',
  padding: '22px 48px',
  borderTop: '1px solid rgba(255, 204, 51, 0.18)',
  textAlign: 'center',
}

const footerName: React.CSSProperties = {
  fontFamily: 'Playfair Display, Georgia, serif',
  fontSize: 16,
  color: '#FFCC33',
  fontWeight: 600,
  letterSpacing: '0.10em',
  textIndent: '0.10em',
}

const footerBy: React.CSSProperties = {
  fontFamily: 'EB Garamond, Garamond, Georgia, serif',
  fontStyle: 'italic',
  fontSize: 12,
  color: '#FFCC33',
  marginTop: 3,
}

const footerSub: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  fontSize: 9,
  color: '#FFCC33',
  marginTop: 11,
  letterSpacing: '0.06em',
}
