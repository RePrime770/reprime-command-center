interface GeneralMeetingParams {
  firstName: string
  inviteUrl: string
}

export function buildGeneralMeetingEmail(p: GeneralMeetingParams): { subject: string; html: string; text: string } {
  const subject = `Let's Connect — ${p.firstName}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0; padding:0; background:#FAFAF9; font-family:'Poppins',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF9;">
    <tr><td align="center" style="padding:2rem 1rem;">
      <table width="100%" style="max-width:600px; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:#0E3470; padding:1.75rem 2rem; border-bottom:3px solid #BC9C45;">
          <span style="color:#D4B86A; letter-spacing:0.1em; font-size:0.8rem; text-transform:uppercase;">RePrime Group · Meeting Request</span>
        </td></tr>
        <tr><td style="padding:2.5rem 2rem;">
          <p style="color:#1F1D1A; font-size:1.05rem; margin:0 0 1.25rem; line-height:1.6;">${p.firstName},</p>
          <p style="color:#1F1D1A; font-size:1rem; margin:0 0 1.25rem; line-height:1.7;">I'd value some time with you — thirty minutes, your schedule.</p>
          <p style="color:#1F1D1A; font-size:1rem; margin:0 0 2rem; line-height:1.7;">Pick a time that works and I'll be there. One click locks it on both our calendars with a Zoom link ready to go.</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="background:#BC9C45; border-radius:4px;">
            <a href="${p.inviteUrl}" style="display:inline-block; padding:0.85rem 2rem; color:#0E3470; text-decoration:none; font-weight:600; font-size:1rem;">Choose a Time</a>
          </td></tr></table>
          <p style="color:#8A8680; font-size:0.85rem; margin:2.5rem 0 0; padding-top:1.5rem; border-top:1px solid #E5E2DB;">
            Gideon Gratsiani<br>Founder, RePrime Group
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const text = `${p.firstName},

I'd value some time with you — thirty minutes, your schedule.

Pick a time that works and I'll be there:
${p.inviteUrl}

—
Gideon Gratsiani
Founder, RePrime Group`

  return { subject, html, text }
}
