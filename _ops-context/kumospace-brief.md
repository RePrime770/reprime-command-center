# Kumospace — Virtual Office (LIVE)

Source: Gideon, 2026-05-05.

## What it is
2D spatial virtual office. Each user picks an avatar and walks around a top-down map of an office — desks, conference rooms, lounges. Audio/video are proximity-based: avatars near each other auto-open audio/video; walking away closes it. Multiple conversations can happen in the same room without interfering, like a real office.

It is NOT Zoom. Zoom is a single conference call. Kumospace is a persistent room with a permanent URL where the team "sits" all day, conversations form and dissolve organically as people move.

Same category as Gather, Teamflow, Sneek, Tandem. Kumospace is the most polished for non-gaming professional teams.

## Status at RePrime — IMPORTANT: live in production
- Active subscription, room running
- 10 team members in the room
- Use case: distributed team coordination across Iowa, Tel Aviv, Manila, Mumbai, Karachi
- Cultural model: "always-on presence" instead of scheduled-call-only. Meetings happen by walking over, not by booking.

## Connected accounts (from Manage Linked Accounts screenshot)
- Login: g@reprime.com (Google OAuth)
- Apps connected: Zoom, Google Calendar
- Apps not connected: Microsoft Teams, Microsoft Outlook Calendar
- Other Login: Connect with Microsoft, Connect with password (both available, not used)

## Relationship to V2 Cloud (do NOT confuse)
- **Kumospace** = the ROOM they sit in. Communication + presence layer. Lives in a browser tab.
- **V2 Cloud** = the DESKTOP they work on. Compute + data layer. Runs M365, QuickBooks, CRE software.
- Daily workflow once both are live: Kumospace tab open (room) + V2 Cloud desktop tab open (work). Walk avatar to coworker's desk to talk; switch tabs to do the work.

## Implications for Command Center
1. **Onboarding** is now a 2-step provision: create V2 Cloud user (gold image + Entra ID + M365 license) AND invite to Kumospace room. Single "onboard" command should target both.
2. **Offboarding** is mirrored: revoke V2 Cloud, revoke M365 license, kick from Kumospace. Single "offboard" command, three deprovisioning calls.
3. **Activity dashboard**: Kumospace exposes presence + time-in-room data via admin console + partial API. Pull "who is in the room right now" as a real-time signal alongside V2 Cloud login data. Together they describe whether a teammate is actually working — present in room AND logged into desktop.
4. **Reporting flag**: V2 Cloud login but no Kumospace presence = surface as a flag for offshore-staff supervision.
5. **Cost model**: Kumospace = fixed monthly regardless of seats up to plan limits. V2 Cloud = per-seat. Cost dashboard must keep them as separate line items, never blend.

## Source links
- Product: https://www.kumospace.com
- Pricing: https://www.kumospace.com/pricing
- RePrime room URL: held by Gideon (specific subdomain not in this brief)
