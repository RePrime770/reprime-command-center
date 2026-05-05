# V2 Cloud — Cloud Desktop (DEPLOYING)

Source: Gideon, 2026-05-05. Demo with Fernando Casas scheduled Thursday May 7, 1:00 PM CT.

## What it is
Desktop-as-a-Service (DaaS). V2 Cloud hosts a Windows desktop in the cloud. Users log in from any device — Mac, Chromebook, iPad, old laptop — and land on the same RePrime-managed desktop image every time. Their personal device becomes a thin client. When they log out, no RePrime data lives on their physical machine.

Vendor: founded 2017, hosted on OVH infrastructure. Customer base: small professional-services firms (CPAs, law offices, MSPs) without in-house IT. G2 4.7/5 (243 reviews). Capterra 4.7/5 (23 reviews).

## Why RePrime picked it
Evaluated against Microsoft Windows 365, Amazon WorkSpaces, Apps4Rent, Nutanix Frame (Dizzion). V2 Cloud won on:
- **Persona match**. Targets RePrime's exact persona — small firm, no IT, mixed onshore/offshore staff.
- **Total cost**. $30/user/mo flat all-in for SMB Business tier with annual commit. Windows 365 was $66–$75/user. WorkSpaces $78–$95/user with hidden costs.
- **Operational simplicity**. Single dashboard, single bill, 24/7 phone support included free, single multi-user gold image, deprovisioning in one click.

## Planned deployment
- **Seats**: 10 (current 6–7 + near-term hires)
- **Tier**: SMB Business, 4 vCPU / 16 GB RAM, annual commit
- **Storage**: 50 GB default per VM insufficient — adding ~500 GB shared storage
- **OS**: Windows Server multi-user (or Windows 11 if available)
- **Microsoft licensing**: BYOL — RePrime's existing M365 seats
- **User geography**: Iowa HQ, Tel Aviv, Manila, Mumbai, Karachi
- **Data center**: Mumbai or Singapore (closest to majority of offshore staff)
- **Public IP**: 1 dedicated for the team
- **Monitoring**: Third-party UAM agent (ActivTrak or Teramind, ~$10/user/mo) inside the gold image — screen recording, app usage, idle detection, web activity logging
- **All-in budget**: ~$430/mo, ~$5,160/yr for 10 fully-monitored cloud desktops
- **Deployment window**: 30 days

## Implications for Command Center
1. RePrime team activity flows through ONE managed Windows desktop image going forward.
2. Audit data (login times, app usage, screen recordings) originates from V2 Cloud admin console + the UAM agent — both feed the activity dashboard.
3. Deprovisioning a teammate = single action against V2 Cloud API + revoke M365 license. The Command Center should wire both into a single "offboard" command.
4. The gold image is the canonical workstation. Any new tool RePrime adopts company-wide gets installed once, on the gold image, and propagates to all 10 seats. The Command Center's "deploy a tool to the team" workflow should target the gold image, not individual seats.
5. The deployment runner concept (single source-of-truth files synced across all AI surfaces via Chrome MCP automation) maps cleanly: gold image becomes one of the surfaces the runner deploys to.

## Source links
- Product: https://v2cloud.com
- Pricing: https://v2cloud.com/pricing
- Demo: https://v2cloud.com/book-a-demo
- Sales: 1-866-807-7155
- Demo on calendar: Fernando Casas, Thu May 7, 1:00 PM CT
