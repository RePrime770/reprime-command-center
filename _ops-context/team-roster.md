# Team roster — phones + emails

Last updated 2026-05-05.

## Gideon Gratsiani (Principal)
- Email: g@reprime.com (primary inbox)
- Email aliases (Google Workspace, all forward to primary):
  - g@floridastatetrust.com (org owner)
  - gideon@floridastatetrust.com
  - g@FST26.com
  - gideon@FST26.com
  - g@reprime-terminal.com (alias, Reply-To routes here)
  - gm@cra-pro.com
- Phones:
  - +1-305-778-4861 — Google Voice (ported to Quo per `google_voice_retired.md` memory; KEYS.md may still reflect Quo). RePrime business line.
  - +1-718-550-5500 — iPhone, iMessage/SMS via BlueBubbles cloud Mac
  - **Third line exists** per `third_phone_line.md` memory — number TBC; ask Gideon when relevant
- Sender identity for outbound: SendGrid `g@reprime-terminal.com`, Reply-To `g@reprime.com`

## Amelia McMurray (Executive Assistant)
- Email: amelia@reprime.com
- Phone: +1-917-779-9770 (Google Voice — logged in)

## Dovber Gratsiani (son)
- Email: dg@cre-pro.com
- Phone: +1-305-570-9935 (Google Voice — logged in)

## RePrime team (canonical email column @reprime.com)
Per Gideon 2026-05-05. These are the seven RePrime identities the Command Center
must support for "send-as" routing, Crew-column display, and onboarding hooks.

| Name                       | Email                          | Notes                                  |
| -------------------------- | ------------------------------ | -------------------------------------- |
| Gideon Menachem Gratsiani  | g@reprime.com                  | Principal — primary inbox              |
| Gideon (Terminal alias)    | g@reprime-terminal.com         | Alias — outbound From, Reply-To = primary |
| Shirel Ben-Haroush          | shirel@reprime.com             | SVP / Partner; sister-in-law           |
| Steve Philipp              | steve@reprime.com              | AI / email automation lead             |
| Adir Yonasi                | adir@reprime.com               | VP Investor Relations — investor-side only, never on broker-facing |
| Yaron Sitbon               | yaron@reprime.com              | Israel Division (BDO, ex-IDF Colonel)  |
| Chaim Abrahams             | chaim@reprime.com              | Co-Founder                             |

This is the complete @reprime.com directory as of 2026-05-05. Amelia (amelia@reprime.com)
and Dovber (dg@cre-pro.com — note: cre-pro, not reprime) are listed in their own sections
above because their phone identities matter to send-as routing.

## Implications for Command Center
- Three Google Voice numbers are logged into the same browser profile. Outbound calls/texts can be initiated from any of them. The Command Center should expose a "send as" picker for outreach — default to Gideon, but allow Amelia/Dovber identity for delegated work.
- All three identities can act on Gideon's behalf inside the Command Center if granted permission. The protocol (per Gideon's recent note) is: anyone working for him must log into the office (Kumospace + V2 Cloud) before doing work — always-connected presence.
- Cross-channel block (per `block_is_cross_channel.md`) must extend to all three GV numbers when Gideon blocks a contact: the same person should be blocked from reaching ANY of the three identities.
