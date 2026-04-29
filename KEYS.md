# RePrime Command Center — Reference Index

Last updated: 2026-04-29 16:50 CT

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
- reprimeportal.lovable.app — old acquisitions portal, preserved but inactive. Do not delete; may reactivate.
- reprime-terminal.com — SendGrid domain auth Verified Apr 29 with 3 CNAMEs in Vercel DNS

## Phone numbers
- 718 personal: +1-718-550-5500 (WhatsApp, JID 17185505500@s.whatsapp.net)
- 305 business: +1-305-778-4861 (WhatsApp, JID 13057784861@s.whatsapp.net, also Google Voice 305 SMS)

## Email identities
- g@reprime.com — primary inbox
- g@floridastatetrust.com — Google Workspace org owner, Vercel account owner, Timelines.ai workspace owner
- g@reprime-terminal.com — Google Workspace alias, mail forwards to g@reprime.com (added Apr 29)
- SendGrid sender (production from Phase 8): g@reprime-terminal.com (domain-authenticated Apr 29)
- Reply-To: g@reprime.com (forwards via Gmail alias)
- SendGrid Single Sender g@reprime.com remains Verified as fallback

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

### Pipedrive field keys
Person custom fields (Pipedrive API hashed keys, NOT secrets, safe to commit):
- TAG: d57ae324f61ddb2b922fb2e212f0723baba92448
- NOTES_FROM_DASHBOARD: 67745cf460dd9f8423a11da2b2fc3323130fef2c
- PREFERRED_CONTACT_METHOD: b1844d06b9efa0f554dc1e5fb4aeee55c7beca7d
  - Options: WhatsApp (27), Email (28), Phone (29), Zoom (30)

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
- reprime.com DNS host unknown — Vercel account regained only contains reprime-terminal.com. SendGrid CNAMEs blocked until DNS host identified.

## Pipedrive contacts (snapshot Apr 29)
1. [Sample] Benjamin Leon — 785-202-7824, no org, benjamin.leon@gmail.com
2. [Sample] Tony Turner — 218-348-8528, [Sample] MoveEr, tony.turner@moveer.com
3. Steve RePrime — +1-401-742-9321, no org
4. ויקי — +972-52-290-1990, no org
5. YY — +972-58-408-1337, no org (sensitive: bank acct details in WhatsApp thread)
6. Shirel שיראל — +1-917-703-0365, no org
7. levi Izhak biton — +1-954-744-9299, no org
8. נתן הורביץ — phone via Timelines sync, no org
9. Shlomo — phone via Timelines sync, no org
