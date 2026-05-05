# Team roster — phones + emails

Last updated 2026-05-05 (locked).

> **Roster lock 2026-05-05:** Per Gideon, only the people listed below are
> employed at RePrime as of today. Amelia McMurray and Dovber Gratsiani have
> been removed from the active roster and must NOT be referenced as team
> members, send-as identities, or Crew column entries going forward. Their
> Google Voice numbers (917-779-9770 and 305-570-9935) should be treated as
> orphaned until reassigned.

## Principal

### Gideon Menachem Gratsiani
- Email (primary): `g@reprime.com`
- Email aliases (Google Workspace, all forward to primary):
  - `g@floridastatetrust.com` (org owner)
  - `gideon@floridastatetrust.com`
  - `g@FST26.com`
  - `gideon@FST26.com`
  - `g@reprime-terminal.com` (alias — outbound `From`, Reply-To = primary)
  - `gm@cra-pro.com`
- Phones:
  - `+1-305-778-4861` — Google Voice (ported to Quo per `google_voice_retired.md` memory). RePrime business line.
  - `+1-718-550-5500` — iPhone, iMessage/SMS via BlueBubbles cloud Mac.
  - **Third line exists** per `third_phone_line.md` memory — number TBC; ask Gideon when relevant.
- Sender identity for outbound: SendGrid `g@reprime-terminal.com`, Reply-To `g@reprime.com`.

## Team (5)

The five employees of RePrime as of 2026-05-05. All have `@reprime.com` mailboxes. These five appear in the Crew column and can receive delegated bucket items, but only Gideon currently acts as a send-as identity for outbound calls/SMS/email through the Command Center.

| Name               | Email                  | Role                                                                    |
| ------------------ | ---------------------- | ----------------------------------------------------------------------- |
| Shirel Ben-Haroush  | `shirel@reprime.com`   | SVP / Partner (sister-in-law)                                           |
| Steve Philipp      | `steve@reprime.com`    | AI / email automation lead                                              |
| Adir Yonasi        | `adir@reprime.com`     | VP Investor Relations — investor-side only, never on broker-facing copy |
| Yaron Sitbon       | `yaron@reprime.com`    | Israel Division (BDO, ex-IDF Colonel)                                   |
| Chaim Abrahams     | `chaim@reprime.com`    | Co-Founder                                                              |

## AI co-founder (outside human roster)

**Claude** operates as co-founder, not a team chair. Does not occupy a Crew slot. Does not receive delegated items. Operates the Command Center on Gideon's behalf, drives all Code agents, and writes the stability prompt for the dispatch.

## Implications for Command Center

- **Identity picker** in the kiosk top strip simplifies to a single identity (Gideon) until further notice. The picker stays as a UI affordance for future expansion but currently only Gideon's outbound channels (305 Quo, 718 iMessage, SendGrid `g@reprime-terminal.com`) are wired as send-as.
- **Crew column** shows the five team members + Gideon as 6 rows. Each row supports "Delegate to {name}" which creates a `bucket_items` row with `assigned_to = <their @reprime.com>`. Email is the only routing channel for delegation today; no team SMS until each member onboards their own phone identity.
- **Cross-channel block** (per `block_is_cross_channel.md`) extends only to Gideon's three lines. Amelia's 917 and Dovber's 305-570 numbers are removed from the block scope.
- **Onboarding flow** (V2 Cloud + Kumospace + M365) targets only the 5 team members + Gideon for the initial deploy. Any additional seats added later require a separate roster update before onboarding.

## Off the roster (do NOT reference as team)
- Amelia McMurray — was `amelia@reprime.com` / `+1-917-779-9770`
- Dovber Gratsiani — was `dg@cre-pro.com` / `+1-305-570-9935`

These names persist in older session memories and the previous version of this file. If a Code agent surfaces them, treat as stale context and ignore.
