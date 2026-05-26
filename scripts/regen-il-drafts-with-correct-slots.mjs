/**
 * Captain 2026-05-26: Regenerate the 32 email-only drafts with Israel-correct
 * slot timing.
 *
 * Background: the earlier generate-email-only-drafts.mjs hardcoded slots at
 *   10 AM / 2 PM / 6 PM Central
 * which translates to 6 PM / 10 PM / 2 AM Israel. Gideon's rule for Israeli
 * recipients: offer them 4 PM / 5 PM / 6 PM Israel = 8 AM / 9 AM / 10 AM Central.
 *
 * This script:
 *   1. Reads /tmp/email-only-drafts.json (32 records, each with existing
 *      invite_id baked into the URLs in body+htmlBody).
 *   2. Extracts inviteId from each record's meta.
 *   3. For each: updates DB proposed_slots to the new IL slot times +
 *      Israel-time display strings.
 *   4. Rebuilds the email body+htmlBody with new slot URLs + IDT labels.
 *   5. Writes updated /tmp/email-only-drafts.json so when Gideon clicks Allow
 *      on the OAuth flow, the bulk-Gmail-draft creator picks up the corrected
 *      version.
 *
 * No re-mint — same invite IDs preserved.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

try {
  const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
} catch {}

const APP = 'https://project-7e87w.vercel.app'
const VIDEO = 'https://youtu.be/khHY1V2ttGU'
const DRAFTS_PATH = 'C:/tmp/email-only-drafts.json'

// Tue May 26 2026 — 4/5/6 PM Israel = 8/9/10 AM Central
const IL_SLOTS = [
  {
    iso: '2026-05-26T16:00:00+03:00',
    period_he: 'אחר הצהריים',
    period_en: 'Afternoon',
    display_he: 'יום שלישי, 26 במאי · 16:00 שעון ישראל',
    display_en: 'Tuesday, May 26 · 4:00 PM Israel',
  },
  {
    iso: '2026-05-26T17:00:00+03:00',
    period_he: 'אחר הצהריים',
    period_en: 'Late Afternoon',
    display_he: 'יום שלישי, 26 במאי · 17:00 שעון ישראל',
    display_en: 'Tuesday, May 26 · 5:00 PM Israel',
  },
  {
    iso: '2026-05-26T18:00:00+03:00',
    period_he: 'ערב',
    period_en: 'Evening',
    display_he: 'יום שלישי, 26 במאי · 18:00 שעון ישראל',
    display_en: 'Tuesday, May 26 · 6:00 PM Israel',
  },
]

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function slotBtn(inviteId, slot, isHebrew) {
  const url = `${APP}/invite/${inviteId}?slot=${encodeURIComponent(slot.iso)}`
  const period = isHebrew ? slot.period_he : slot.period_en
  const display = isHebrew ? slot.display_he : slot.display_en
  return `<a href="${url}" style="display:block;width:100%;padding:14px 20px;border:1px solid rgba(255,204,51,0.35);text-align:center;text-decoration:none;margin:0 0 8px;box-sizing:border-box;background:#0E3470;">
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#FFCC33;letter-spacing:0.20em;text-transform:uppercase;font-weight:600;text-indent:0.20em;opacity:0.85;">${period}</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:#FFCC33;font-weight:400;margin-top:4px;line-height:1.2;">${display}</div>
  </a>`
}

function buildHtml({ recipientFull, personalNoteHtml, isHebrew, inviteId }) {
  const slotButtonsHtml = IL_SLOTS.map((s) => slotBtn(inviteId, s, isHebrew)).join('\n')
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

function buildText({ personalNoteRaw, isHebrew, inviteId }) {
  const s = IL_SLOTS
  return `${personalNoteRaw}

${isHebrew ? 'מועדים מוצעים — יום שלישי, 26 במאי:' : 'Suggested times — Tuesday, May 26:'}
${isHebrew ? `• אחר הצהריים 16:00 שעון ישראל` : `• Afternoon · 4:00 PM Israel`}
   ${APP}/invite/${inviteId}?slot=${encodeURIComponent(s[0].iso)}
${isHebrew ? `• אחר הצהריים 17:00 שעון ישראל` : `• Late Afternoon · 5:00 PM Israel`}
   ${APP}/invite/${inviteId}?slot=${encodeURIComponent(s[1].iso)}
${isHebrew ? `• ערב 18:00 שעון ישראל` : `• Evening · 6:00 PM Israel`}
   ${APP}/invite/${inviteId}?slot=${encodeURIComponent(s[2].iso)}

${isHebrew ? 'זמן אחר? בחר בעצמך:' : 'Different time? Pick your own:'}
${APP}/invite/${inviteId}/choose

${isHebrew ? 'סיור קצר מבפנים (4 דקות):' : 'Short walkthrough (4 min):'}
${VIDEO}

${isHebrew ? 'תודה,' : 'Best,'}
${isHebrew ? 'גדעון' : 'Gideon'}
RePrime Group`
}

async function updateDbSlots(inviteId, isHebrew) {
  const dbSlots = IL_SLOTS.map((s) => ({
    iso: s.iso,
    display: isHebrew ? s.display_he : s.display_en,
  }))
  const { error } = await sb.from('invitations').update({ proposed_slots: dbSlots }).eq('id', inviteId)
  if (error) throw new Error(`DB update ${inviteId}: ${error.message}`)
}

async function main() {
  const drafts = JSON.parse(readFileSync(DRAFTS_PATH, 'utf8'))
  console.log(`Loaded ${drafts.length} drafts to regenerate.\n`)

  let updated = 0
  let failed = 0
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]
    const inviteId = d.meta?.inviteId
    if (!inviteId) {
      console.error(`  [${i + 1}/${drafts.length}] ✗ ${d.meta?.name || '?'} — no inviteId in meta`)
      failed++
      continue
    }
    const isHebrew = d.meta?.lang === 'he'
    try {
      // Extract personal note from the existing htmlBody (between the
      // letterhead div and the closing td). Cheap heuristic: pull the
      // italic 15px text from the cream letter table. Simpler: extract
      // from the plain text body — first chunk up to "Suggested times".
      const noteEndMarker = isHebrew ? 'מועדים מוצעים' : 'Suggested times'
      const noteIdx = d.body.indexOf(noteEndMarker)
      const personalNoteRaw = noteIdx > 0 ? d.body.slice(0, noteIdx).trim() : d.body.split('\n\n')[0]
      const personalNoteHtml = escHtml(personalNoteRaw).replace(/\n+/g, '<br>')

      const recipientFull = d.meta?.name || (d.to || '').split('@')[0]

      const newText = buildText({ personalNoteRaw, isHebrew, inviteId })
      const newHtml = buildHtml({ recipientFull, personalNoteHtml, isHebrew, inviteId })

      await updateDbSlots(inviteId, isHebrew)

      drafts[i] = {
        ...d,
        body: newText,
        htmlBody: newHtml,
      }
      updated++
      console.log(`  [${(i + 1).toString().padStart(2)}/${drafts.length}] ✓ ${(d.meta?.name || '?').padEnd(28)} ${inviteId.slice(0, 8)}`)
    } catch (err) {
      failed++
      console.error(`  [${(i + 1).toString().padStart(2)}/${drafts.length}] ✗ ${(d.meta?.name || '?').padEnd(28)} ${err.message}`)
    }
  }

  writeFileSync(DRAFTS_PATH, JSON.stringify(drafts, null, 2))
  console.log(`\n✓ Regenerated ${updated} drafts · ${failed} failed`)
  console.log(`✓ DB rows updated with new IL slots`)
  console.log(`✓ Wrote → ${DRAFTS_PATH}`)
  console.log(`\nWhen Gideon clicks Allow on the OAuth flow, the bulk Gmail`)
  console.log(`creator reads this file and uploads ${updated} drafts with`)
  console.log(`Tue May 26 4 PM / 5 PM / 6 PM Israel time slots.`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
