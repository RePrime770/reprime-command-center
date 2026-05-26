/**
 * Captain 2026-05-25: Generate 32 personalized Gmail drafts for the
 * email-only A-tier (no phone, has email). Each draft uses the locked
 * Imperial Gold HTML template, includes Gideon's new tagline about
 * launching tech in US commercial RE, and references the specific
 * context from the master xlsx (firm, role, intro person, prior
 * interaction).
 *
 * Output: /tmp/email-only-drafts.json with { to, subject, body, htmlBody }
 * for each, magic links already minted via the production API.
 *
 * Run AFTER mint phase. The script:
 *   1. Reads master xlsx, filters to 32 candidates
 *   2. For each: determines language (HE/EN), crafts personal note
 *      from master context, embeds the new tagline
 *   3. Mints magic link via /api/invitations (send_email:false)
 *   4. Generates Imperial Gold HTML body with slot buttons (Tue May 26
 *      morning/afternoon/evening) + video link + sign-off
 *   5. Writes all 32 to /tmp/email-only-drafts.json
 */

import XLSX from 'xlsx'
import { readFileSync, writeFileSync } from 'node:fs'

const APP = 'https://project-7e87w.vercel.app'
const VIDEO = 'https://youtu.be/khHY1V2ttGU'
const CAPTAIN_TOKEN = 'terminal-founder-mint-2026-f71a8c5e'

// Gideon's new tagline (he's been adding this to all WhatsApp messages)
const TAGLINE_HE = `אנחנו משיקים טכנולוגיה שהולכת ליצור מהפך בעולם הנדל"ן המסחרי בארצות הברית, שכרגע פשוט לא קיימת. אנחנו היחידים. אשמח להראות לך את זה ולראות אם אפשר לעשות שיתוף פעולה, או מהצד ההנדל"נית שהטכנולוגיה הזו מייצרת בתשואות פשוט מדהימות.`

const TAGLINE_EN = `We're launching a technology that will create a revolution in US commercial real estate, something that simply doesn't exist today. We're the only ones. I'd be glad to show you and see if there's room for collaboration — either on the technology side or on the real estate side this technology unlocks, with returns that are simply outstanding.`

// ── Helpers ───────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

function isHebrew(str) {
  return /[֐-׿]/.test(String(str || ''))
}

function hasIlEmail(email) {
  return String(email || '').toLowerCase().endsWith('.co.il') ||
         String(email || '').toLowerCase().endsWith('.org.il') ||
         String(email || '').toLowerCase().endsWith('.muni.il')
}

function decideLanguage(r) {
  if (r.IL_Tagged === 'Yes' || r.IL_Tagged === 1 || r.IL_Tagged === true) return 'he'
  if (isHebrew(r.Name) || isHebrew(r.Title)) return 'he'
  if (hasIlEmail(r.Email)) return 'he'
  return 'en'
}

// ── Personal note crafting per recipient ──────────────────────────────────

function craftPersonalNoteHebrew(r) {
  const firstName = (r.Name || '').split(/[\s,]/)[0]
  const firm = r.Company || ''
  const title = r.Title || ''
  const notes = r.Notes_Consolidated || r.Summary || ''
  const leadSrc = r.il_lead_source || ''
  const priority = r.priority_rationale || ''

  // Extract key signals
  const meetingMentioned = /פגישה|פגשנו|נפגשנו|conference|כנס|סאמית|אילת/i.test(notes)
  const materialsRequested = /חומרים|materials|ביקש/i.test(notes)
  const introvia = /דרך|via|by/i.test(notes)
  const conference = /סאמית|כנס|conference|אילת|capital sm/i.test(notes + ' ' + leadSrc)

  const parts = []
  parts.push(`${firstName},`)

  // Build context line based on signals
  if (conference) {
    if (/אילת|capital sm/i.test(notes)) {
      parts.push('המשך מסאמית קפיל באילת.')
    } else {
      parts.push('המשך מהכנס.')
    }
  } else if (introvia && leadSrc) {
    if (/איריס/i.test(leadSrc)) parts.push('איריס חיברה אותנו.')
    else if (/עינת/i.test(leadSrc)) parts.push('עינת חיברה אותנו.')
    else if (/שלומי/i.test(leadSrc)) parts.push('שלומי חיבר אותנו.')
    else if (/יצחק/i.test(leadSrc)) parts.push('יצחק חיבר אותנו.')
    else if (/ירון/i.test(leadSrc)) parts.push('ירון חיבר אותנו.')
    else parts.push(`הגענו אליך דרך ${leadSrc}.`)
  } else if (firm) {
    parts.push(`אני מבין שאתה ב-${firm}.`)
  }

  // Add the tagline (Gideon's standard)
  parts.push(TAGLINE_HE)

  return parts.join(' ').trim()
}

function craftPersonalNoteEnglish(r) {
  const firstName = (r.Name || '').split(/[\s,]/)[0]
  const firm = r.Company || ''
  const title = r.Title || ''
  const notes = r.Notes_Consolidated || r.Summary || ''
  const leadSrc = r.il_lead_source || ''

  const parts = []
  parts.push(`${firstName},`)

  // Context line
  if (firm) {
    parts.push(`Reaching out cold via your ${firm} address.`)
  } else if (notes && notes.length > 20) {
    parts.push(`Following up on what's been in our notes.`)
  } else {
    parts.push(`Reaching out cold.`)
  }

  parts.push(TAGLINE_EN)

  return parts.join(' ').trim()
}

// ── HTML template (mirrors locked design) ─────────────────────────────────

function slotBtn(inviteId, isoSlot, period, display) {
  const url = `${APP}/invite/${inviteId}?slot=${encodeURIComponent(isoSlot)}`
  return `<a href="${url}" style="display:block;width:100%;padding:14px 20px;border:1px solid rgba(255,204,51,0.35);text-align:center;text-decoration:none;margin:0 0 8px;box-sizing:border-box;background:#0E3470;">
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#FFCC33;letter-spacing:0.20em;text-transform:uppercase;font-weight:600;text-indent:0.20em;opacity:0.85;">${period}</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:#FFCC33;font-weight:400;margin-top:4px;line-height:1.2;">${display}</div>
  </a>`
}

function buildHtml({ recipientFull, personalNoteHtml, isHebrew, inviteId }) {
  const slots = [
    { iso: '2026-05-26T10:00:00-05:00', period: 'Morning',   display: 'Tuesday, May 26 &middot; 10:00 AM Central' },
    { iso: '2026-05-26T14:00:00-05:00', period: 'Afternoon', display: 'Tuesday, May 26 &middot; 2:00 PM Central' },
    { iso: '2026-05-26T18:00:00-05:00', period: 'Evening',   display: 'Tuesday, May 26 &middot; 6:00 PM Central' },
  ]
  const slotButtonsHtml = slots.map(s => slotBtn(inviteId, s.iso, s.period, s.display)).join('\n')
  const dirAttr = isHebrew ? ' dir="rtl"' : ''
  const noteLabel = isHebrew ? 'הערה אישית מאת' : 'A personal note from'
  const slotsLabel = isHebrew ? 'מועדים מוצעים &mdash; יום שלישי, 26 במאי' : 'Suggested times &mdash; Tuesday, May 26'
  const diffTimeLabel = isHebrew ? 'זמן אחר?' : 'Different Time?'
  const diffTimeBody = isHebrew ? 'בחר תאריך וזמן משלך &larr;' : 'Choose your own date and time &rarr;'
  const walkthroughText = isHebrew ? '&#9654; סיור קצר מבפנים &middot; 4 דקות' : '&#9654; Short walkthrough from the inside &middot; 4 min'
  const confirmTagline = isHebrew
    ? 'לחיצה אחת מאשרת &middot; קישור Zoom נשלח מיד &middot; 30 דקות &middot; ללא הכנה מוקדמת'
    : 'One click confirms &middot; Zoom link follows immediately &middot; Thirty minutes &middot; No preparation needed'
  const footerNote = isHebrew
    ? 'ההזמנה נשלחה אישית. ניתן לחזור ישירות לגדעון.'
    : 'This invitation was sent personally. Reply directly to Gideon.'

  return `<!DOCTYPE html>
<html lang="${isHebrew ? 'he' : 'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Private Introduction</title></head>
<body style="margin:0;padding:0;background:#DDD9D2;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#DDD9D2;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#0E3470;border:1px solid rgba(255,204,51,0.22);border-radius:2px;">
  <tr><td style="padding:22px 48px 20px;text-align:center;border-bottom:1px solid rgba(255,204,51,0.18);">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="70%" style="margin:0 auto 11px;"><tr><td style="height:2px;background:#FFCC33;line-height:1px;font-size:0;">&nbsp;</td></tr></table>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.145em;color:#FFCC33;font-weight:600;text-indent:0.145em;margin:11px 0;">TERMINAL</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="70%" style="margin:11px auto 0;"><tr><td style="height:2px;background:#FFCC33;line-height:1px;font-size:0;">&nbsp;</td></tr></table>
  </td></tr>
  <tr><td style="padding:34px 48px 22px;text-align:center;">
    <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.30em;color:#FFCC33;font-weight:600;text-transform:uppercase;text-indent:0.30em;margin-bottom:14px;opacity:0.85;">Private Introduction</div>
    <div style="font-family:Georgia,serif;font-size:46px;color:#FFCC33;font-weight:600;line-height:1.0;letter-spacing:-0.01em;">${recipientFull}</div>
  </td></tr>
  <tr><td style="padding:0 36px 26px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4E8CC;border:1px solid rgba(255,204,51,0.30);border-radius:4px;">
      <tr><td style="padding:30px 28px;text-align:center;background:#F4E8CC;"${dirAttr}>
        <div style="font-family:Georgia,serif;font-size:13px;color:#7A5A30;font-style:italic;margin-bottom:11px;">${noteLabel} <span style="font-weight:600;color:#5A3F18;">Gideon Gratsiani</span></div>
        <div style="font-family:Georgia,serif;font-size:15px;color:#0E3470;line-height:1.7;font-style:italic;">${personalNoteHtml}</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 48px;text-align:center;border-top:1px solid rgba(255,204,51,0.18);border-bottom:1px solid rgba(255,204,51,0.18);">
    <div style="font-family:Georgia,serif;font-size:28px;color:#FFCC33;font-weight:400;font-style:italic;">Private Membership</div>
    <div style="width:5px;height:5px;background:#FFCC33;border-radius:50%;margin:13px auto;font-size:0;line-height:1px;">&nbsp;</div>
    <div style="font-family:Georgia,serif;font-size:36px;color:#FFCC33;font-weight:400;font-style:italic;">By Invitation Only</div>
  </td></tr>
  <tr><td style="padding:28px 48px 0;">
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.24em;color:#FFCC33;text-transform:uppercase;font-weight:600;text-align:center;margin-bottom:16px;text-indent:0.24em;opacity:0.85;">${slotsLabel}</div>
    ${slotButtonsHtml}
    <a href="${APP}/invite/${inviteId}/choose" style="display:block;width:100%;padding:14px 20px;border:1px solid rgba(255,204,51,0.35);text-align:center;text-decoration:none;margin:0;box-sizing:border-box;background:#0E3470;">
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#FFCC33;letter-spacing:0.20em;text-transform:uppercase;font-weight:600;text-indent:0.20em;opacity:0.85;">${diffTimeLabel}</div>
      <div style="font-family:Georgia,serif;font-size:28px;color:#FFCC33;font-weight:400;margin-top:4px;line-height:1.2;">${diffTimeBody}</div>
    </a>
  </td></tr>
  <tr><td style="padding:18px 48px 0;text-align:center;">
    <a href="${VIDEO}" style="font-family:Arial,sans-serif;font-size:13px;color:#FFCC33;text-decoration:underline;letter-spacing:0.04em;">${walkthroughText}</a>
  </td></tr>
  <tr><td style="padding:18px 48px 26px;text-align:center;">
    <div style="font-family:Arial,sans-serif;font-size:10px;color:#FFCC33;line-height:1.85;letter-spacing:0.04em;opacity:0.7;">${confirmTagline}</div>
  </td></tr>
  <tr><td style="padding:22px 48px;border-top:1px solid rgba(255,204,51,0.18);text-align:center;">
    <div style="font-family:Georgia,serif;font-size:16px;color:#FFCC33;font-weight:600;letter-spacing:0.10em;text-indent:0.10em;">TERMINAL</div>
    <div style="font-family:Garamond,Georgia,serif;font-style:italic;font-size:13px;color:#FFCC33;margin-top:4px;opacity:0.75;">by RePrime</div>
    <div style="font-family:Arial,sans-serif;font-size:8px;color:#FFCC33;margin-top:11px;letter-spacing:0.06em;opacity:0.55;">${footerNote}</div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

// ── Mint magic link ───────────────────────────────────────────────────────

async function mintInvite(r) {
  const body = {
    contact_first_name: (r.Name || '').split(/[\s,]/)[0],
    contact_name: r.Name,
    contact_email: r.Email,
    meeting_type: 'terminal',
    send_email: false,
    proposed_slots: [
      { iso: '2026-05-26T10:00:00-05:00', display: 'Tuesday, May 26 · 10:00 AM Central' },
      { iso: '2026-05-26T14:00:00-05:00', display: 'Tuesday, May 26 · 2:00 PM Central' },
      { iso: '2026-05-26T18:00:00-05:00', display: 'Tuesday, May 26 · 6:00 PM Central' },
    ],
  }
  const res = await fetch(`${APP}/api/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captain-Token': CAPTAIN_TOKEN,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`mint failed for ${r.Name}: ${res.status}`)
  return res.json()
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const buf = readFileSync('_terminal-design-reference/investor-data/RePrime_Command_Center_Master.xlsx')
  const wb = XLSX.read(buf, { type: 'buffer' })
  const inv = XLSX.utils.sheet_to_json(wb.Sheets['Investors_Enriched'], { defval: null })

  // Filter to A-tier, no phone, has email
  const A = inv.filter(r => r.New_Priority === 'A' || r.New_Priority === 'A+')
  const candidates = A.filter(r => {
    const hasPhone = r.Phone && String(r.Phone).trim()
    const hasEmail = r.Email && String(r.Email).trim()
    return !hasPhone && hasEmail
  })

  // Skip already-sent (Yosi, Ilan Sidon) and existing partner (Amir Shenkman)
  const SKIP_EMAILS = new Set([
    'yosi@eldan.co.il',          // Yosi Eldan — already sent
    'ilan@caspa.co.il',          // Ilan Sidon — already sent
    'amir@gyrocapital.co.il',    // Amir Shenkman — existing Gyro partner, skip
  ])
  const filtered = candidates.filter(r => !SKIP_EMAILS.has(String(r.Email || '').toLowerCase()))

  console.log(`Generating drafts for ${filtered.length} email-only A-tier candidates...`)

  const drafts = []
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i]
    try {
      console.log(`[${i + 1}/${filtered.length}] Minting for ${r.Name}...`)
      const mint = await mintInvite(r)
      const inviteId = mint.id

      const lang = decideLanguage(r)
      const isHe = lang === 'he'

      const personalNoteRaw = isHe ? craftPersonalNoteHebrew(r) : craftPersonalNoteEnglish(r)
      const personalNoteHtml = escHtml(personalNoteRaw).replace(/\n+/g, '<br>')

      const recipientFull = r.Name || (r.Email || '').split('@')[0]

      const subject = isHe
        ? 'הזמנה אישית — Terminal by RePrime'
        : 'Private Introduction — Terminal by RePrime'

      // Plain text body
      const text = `${personalNoteRaw}

${isHe ? 'מועדים מוצעים — יום שלישי, 26 במאי:' : 'Suggested times — Tuesday, May 26:'}
${isHe ? '• בוקר 10:00 שעון מרכז ארה"ב' : '• Morning · 10:00 AM Central'}
   ${APP}/invite/${inviteId}?slot=2026-05-26T10%3A00%3A00-05%3A00
${isHe ? '• אחר הצהריים 14:00' : '• Afternoon · 2:00 PM Central'}
   ${APP}/invite/${inviteId}?slot=2026-05-26T14%3A00%3A00-05%3A00
${isHe ? '• ערב 18:00' : '• Evening · 6:00 PM Central'}
   ${APP}/invite/${inviteId}?slot=2026-05-26T18%3A00%3A00-05%3A00

${isHe ? 'זמן אחר? בחר בעצמך:' : 'Different time? Pick your own:'}
${APP}/invite/${inviteId}/choose

${isHe ? 'סיור קצר מבפנים (4 דקות):' : 'Short walkthrough (4 min):'}
${VIDEO}

${isHe ? 'תודה,' : 'Best,'}
${isHe ? 'גדעון' : 'Gideon'}
RePrime Group`

      const htmlBody = buildHtml({
        recipientFull,
        personalNoteHtml,
        isHebrew: isHe,
        inviteId,
      })

      drafts.push({
        to: r.Email,
        subject,
        body: text,
        htmlBody,
        meta: {
          name: r.Name,
          firm: r.Company,
          title: r.Title,
          lang,
          inviteId,
        },
      })
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`)
    }
  }

  writeFileSync('/tmp/email-only-drafts.json', JSON.stringify(drafts, null, 2))
  console.log(`\n✓ Generated ${drafts.length} drafts → /tmp/email-only-drafts.json`)
  for (const d of drafts) {
    console.log(`  ${d.meta.lang.toUpperCase()}  ${(d.meta.name || '?').padEnd(28)} ${d.to.padEnd(36)} ${d.meta.inviteId.slice(0, 8)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
