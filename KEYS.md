# RePrime Command Center — Reference Index

Last updated: 2026-04-29 13:51 CT

## Live URLs
- Dashboard (production): https://project-7e87w.vercel.app
- GitHub repo: https://github.com/RePrime770/reprime-command-center
- Vercel project: https://vercel.com/g-8390s-projects/reprime-command-center
- Supabase project: https://supabase.com/dashboard/project/yrnujfhzmoasodawqfri
- Pipedrive: https://reprimegroup.pipedrive.com
- Timelines.ai: https://app.timelines.ai (workspace: reprime-group)
- PagerDuty: https://reprime.pagerduty.com (user g@reprime.com)
- ElevenLabs: https://elevenlabs.io (Pro plan, Matilda voice)
- SendGrid: https://app.sendgrid.com
- Zoom Marketplace: https://marketplace.zoom.us/develop/created
- Anthropic Console: https://console.anthropic.com/settings/keys
- OpenAI Platform: https://platform.openai.com/api-keys
- Google Cloud Console: https://console.cloud.google.com (project: RePrime Command Center, org: floridastatetrust.com)

## Domains
- reprime.com — primary brand, marketing site, email sender domain. DNS in a different Vercel account (TXT records added by Yossef on Apr 29).
- reprimeterminal.com — verified Apr 29 in g-8390's projects via TXT records added in the OTHER Vercel account. Status: Valid in our project. Locked-out account still owns DNS.
- reprime-terminal.com (with hyphen) — newly purchased Apr 29 by Gideon, owned in g-8390's projects. Currently configured to redirect to reprime.com via vercel.json.
- reprime-command-center.vercel.app — INVALID hostname. Project's actual default URL is project-7e87w.vercel.app.

## Phone numbers
- 718 personal: +1-718-550-5500 (WhatsApp, JID 17185505500@s.whatsapp.net)
- 305 business: +1-305-778-4861 (WhatsApp, JID 13057784861@s.whatsapp.net, also Google Voice 305 SMS)

## Email identities
- g@reprime.com — primary, SendGrid single-sender Verified
- g@floridastatetrust.com — Google Workspace org owner, Vercel account owner, Timelines.ai workspace owner
- g@reprime-terminal.com — Google Workspace alias, mail forwards to g@reprime.com (added Apr 29)

## Where secrets live (NOT the values)
- ANTHROPIC_API_KEY → Vercel env var (key name: reprime-command-center-2 in Anthropic Console)
- OPENAI_API_KEY → Vercel env var (key name: reprime-command-center-2 in OpenAI Platform)
- ELEVENLABS_API_KEY → Vercel env var (key name: "RePrime Command Center" in ElevenLabs)
- TIMELINES_API_KEY → Vercel env var (single master token, two channel JIDs)
- PIPEDRIVE_API_TOKEN → Vercel env var
- GOOGLE_REFRESH_TOKEN → Vercel env var (OAuth client: 26026260552-018d... in floridastatetrust.com Cloud project)
- SENDGRID_API_KEY → Vercel env var (key name: "RePrime Command Center")
- ZOOM credentials → Vercel env var (Server-to-Server OAuth app: "RePrime Command Center", account ID _ByMa6jsTOa3YQPnW_3n_w)
- PAGERDUTY_ROUTING_KEY → Vercel env var (service: "Booking Reminders", was "Cal.com Booking Reminders")
- SUPABASE_DB_URL — DB password stored in Gideon's password vault (1Password)

## Banned forever (zero-touch)
- Yosef App Vercel project: yosef-app-v2
- Voice ID v32airczvHKOKNkTzmTI (Aaron — Yosef's clone)
- ElevenLabs key "Yosef's Gym's App" (suffix c3d4)
- SendGrid key yosef-app-prod-v3
- Anthropic key "Yosef App v2"
- OpenAI key "Yosef App v2"
- Google Cloud project yosef-app
- Yosef's Upstash database

## Session anchors
- Build start: April 29, 2026
- 9 AM Central Time critical path: WhatsApp panels + voice + drafts
- V1.5: Tuesday afternoon/evening (Pipedrive sidebar, Today, Bookings, Concierge, Investor unified)
- V2: 1-2 weeks post-V1 (Conductor: classifier, router, fan-out, memory spine)
- V3: separate project (capital partner Terminal portal)

## Open issues (live)
- Code-A blocked Apr 29 by Vercel rejecting commit author email "code-a@reprime.local" — fixed to g@reprime.com.
- Phone Link install blocked on Windows Store catalog — parked. 718 SMS via iPhone in pocket. Revisit Tuesday with Beeper Cloud as alternative.
- Pipedrive contains 7 contacts as of Apr 29 (3 JID artifacts deleted, 1 email typo fixed).
- reprimeterminal.com (no hyphen) DNS still owned by locked-out Vercel account (TXT verification done by Yossef, full DNS edit access still pending).
