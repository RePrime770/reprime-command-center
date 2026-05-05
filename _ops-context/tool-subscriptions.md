# RePrime Tool Subscriptions

Source: Gideon attached `RePrime Tool Subscriptions 2026-05-04 (1).md` on 2026-05-05.
Owner: Gideon Gratsiani — g@floridastatetrust.com

## Active paid subscriptions
- **Inforuptcy Investor Maverick** — $99/mo, monthly, paid 2026-05-04
  - URL: https://www.inforuptcy.com/dashboard
  - Email: g@floridastatetrust.com
  - Plan: Investor Maverick (Firm up to 5 users)
  - **No public API.** Connector must session-poll
    `https://www.inforuptcy.com/filings/search-court-filings?search_type=party_title&search_term={tenant}`
    daily for the 6-tenant watchlist. Re-auth on 401.
  - 6-tenant watchlist (custom keyword alerts upgrade-locked at $199 Rain Maker / $299 Game Changer):
    Family Dollar Stores · Dollar Tree · Planet Fitness · Tractor Supply · Joann · Big Lots
  - Default email alerts (Business Bankruptcies, Schedules, Creditors) ON → g@floridastatetrust.com

## Free / passive
- **Bisnow First Draft** — free newsletter, no paid tier exists. URL: https://www.bisnow.com/account

## Skipped — free fallback engaged
- **PolicyMap Individual** ($21/mo) → SKIPPED. Sales-gated. Replaced by U.S. Census ACS API (free, no key required for most endpoints).
- **Trellis.law Personal** ($54/mo) → SKIPPED. Sales-gated. Replaced by CourtListener API (federal-only, ~70% of CRE litigation value; state depth deferred).
- **BamSEC Pro** ($69/mo) → SKIPPED. Annual-only billing $828 upfront violates monthly-only rule. Replaced by SEC EDGAR API + Sonnet table extraction (~$2.50/mo at deal volume).

## Cost
- Active monthly outlay: **$99/mo** (Inforuptcy only)
- Saved vs. original $256/mo brief: $157/mo

## Known limitations for Code wiring
1. Inforuptcy: no public API. Authenticated session polling only. Cookies expire — connector must re-auth.
2. PolicyMap connector replaced by Census ACS connector.
3. Trellis connector replaced by CourtListener (federal-only).
4. BamSEC connector replaced by EDGAR + Sonnet extraction.
5. No API keys captured anywhere — none of the active subscriptions exposed an API key on signup.

Passwords entered by Gideon directly and saved to Chrome password manager — not stored anywhere in this repo.
