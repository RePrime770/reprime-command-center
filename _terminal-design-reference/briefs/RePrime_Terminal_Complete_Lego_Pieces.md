# REPRIME TERMINAL — COMPLETE INFORMATION TRANSFER
## Every Lego Piece From Every Project File, Assembled For A New Chat To Build From

**Compiled:** March 22, 2026
**Purpose:** One document containing ALL ideas, architecture, psychology, pricing rationale, design decisions, technical specs, tool evaluations, board expertise, and strategic reasoning from the RePrime Terminal project. This is raw information — not instructions, not orders. Lego pieces for the builder.

---

# PART 1: WHAT REPRIME TERMINAL IS

## The Core Vision

RePrime Terminal is the Bloomberg Terminal of commercial real estate — an institutional-grade deal sourcing, analysis, and distribution platform. It encodes 30+ years of CRE expertise into an automated machine that finds, analyzes, and presents distressed commercial real estate opportunities to a private investor club.

The name "Terminal" is deliberate — it references Bloomberg's dominance in financial data. The ambition is category ownership: "institutional distressed CRE deal intelligence."

**Tagline:** "30+ Years of Experience. 20+ AI Systems. One Unified Platform."

## Why This Exists — The Market Opportunity

The CRE maturity wall 2026–2030 is the largest restructuring of American commercial real estate in a generation:

- $4.3 trillion in CRE debt maturing between 2025–2028
- $957 billion matured in 2025; $936B–$1.15T due in 2026; peak $1.26T in 2027
- CMBS delinquency rates: Office 11.31%, Retail 6.92%, Multifamily ~6.98%, Lodging 6.61%
- Special servicing rate at 10.91% — 12-year high
- Nearly 150 CRE foreclosures in H1 2025 — highest since 2014
- Average rate on maturing debt: 4.76% vs new loan rates at 6.24% — a 148 basis-point gap
- 14–15% of maturing loans are underwater or unable to qualify for refinancing
- $400–$600 billion in estimated distressed opportunities over three years
- Cumulative distressed CRE assets reached $116 billion by Q1 2025, a 31% YoY increase

**CRITICAL POSITIONING CORRECTION:** Terminal is NOT distress-only. It is cycle-immune — it operates on leads, broker engagement, and submitted deals across ALL market conditions. Terminal acquires distressed, stabilized, value-add, and other asset types based on opportunity. Never characterize Terminal as distress-focused or lead with distressed acquisitions as the primary mandate. The maturity wall is context for timing, not the identity of the platform.

## The Competitive Moat

1. **Gideon's 30-year broker network** — irreplaceable. Many brokers started as kids under his mentorship. This trust cannot be replicated with money.
2. **Foreclosure law practice** — Gideon ran his own practice with 6 attorneys for 20 years. No other buyer at auction has this legal foundation.
3. **AI automation** — combined with relationships, creates an unstoppable moat. No competitor has both deep institutional relationships AND cutting-edge technology simultaneously.
4. **The competitive landscape has thinned** — Cadre acquired by Yieldstreet (~$800M), CrowdStreet damaged by $63M fraud, Roofstock lost 69% of valuation, no dedicated distressed CRE deal-sourcing platform exists.

## Public Positioning — ABSOLUTE CONFIDENTIALITY RULES

- NEVER mention Terminal is AI-powered
- NEVER say "our AI," "automated system," "algorithm," "model"
- The public story: institutional background (Blackstone-level credibility), a technology division with researchers and analysts
- External positioning: "Our research team," "our analysts," "institutional-grade research capabilities"
- If asked directly: "We employ proprietary research methodologies and a global team of specialized analysts"
- Position Gideon as: institutional mind + street smart + deep faith + high IQ
- Nobody outside the family knows the machine exists — this is like Samson's hair

## Long-Term Vision (Sequential)

1. Start on-market (easiest, fastest cash)
2. Build the machine fast and right
3. Tighten access as volume grows
4. Institutional investors hire RePrime exclusively
5. Displace traditional brokers — create market honesty
6. Eventually go public
7. Become the Bloomberg of distressed CRE

---

# PART 2: THE TWO-LAYER ARCHITECTURE

## Layer 1: RePrimeTerminal.com — Client-Facing Portal

What clients/investors see. The polished institutional presentation of deals.

### Three Product Tiers:

**Tier 1 — GP Home Runs:** 20%+ below market. Multifamily, retail, office. RePrime acts as General Partner. Deep value, high returns.

**Tier 2 — Core Flips:** 5–10% below market. 2–6% fee. Quick acquisitions and dispositions. Volume business.

**Tier 3 — Special Asset Class:** Hotel, industrial, assisted living, specialty types. $10M minimum. Proof of funds required before access.

### Design Language (LOCKED — approved):

- White cards (#FFFFFF) on light gray (#F2F4F8)
- Navy (#0E3470) for primary text
- Gold (#BC9C45) sparingly as signature accent
- Green (#0B8A4D) exclusively for positive financial metrics
- Typography: Playfair Display or Bodoni Moda serif for headlines only, Poppins for all data and body text
- Aesthetic reference: Bloomberg Terminal meets quiet private wealth
- NEVER "generic AI" — every design decision grounded in specific psychology frameworks
- Psychology framework for design: Cialdini (scarcity, social proof), Kahneman (loss aversion, anchoring), Nir Eyal (Hook Model), Tufte (data-ink ratio), Oren Klaff (frame control), Howard Marks (market cycle thinking), B.J. Fogg (behavior design)

### Tech Stack:

- Next.js 15 App Router with TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL + Auth + Storage)
- Three.js for login page
- next-intl for Hebrew/English with full RTL support
- Deployed on Vercel via GitHub auto-deploy
- All database tables prefixed `terminal_` to coexist with existing Supabase project

## Layer 2: Internal Engine — Family Only

Completely separate URL. Locked down. Only Gideon, Shirel, and their children have access. No employee ever sees the full system. Every person who touches any component is compartmentalized. No single person can reconstruct the full machine independently.

This is where the AI lives. This is where the intelligence operates.

---

# PART 3: THE BROKER SUBMISSION PORTAL (Side 1)

A broker-facing portal where brokers submit deals to RePrime. This has been designed and a Claude Project Setup Package was delivered to Mushka Gratsiani (Gideon's daughter, research analyst) for implementation via Lovable connected to Supabase.

### The Five Buyer Groups (Built Into Portal UI):

The portal presents five distinct buyer profiles — each representing a different speed/price tradeoff. This was built as an interactive React component (reprime-final_jsx.tsx):

| Group | Speed | Terms | Price Point |
|-------|-------|-------|-------------|
| 7-Day Close | As fast as title clears | Non-refundable deposit, no contingencies, no DD, no financing contingency | Two cap rate points above market |
| Non-Refundable Day One | Deposit goes hard immediately | Non-refundable deposit wired day one, no DD, no financing contingency | 1.5 cap rate points from market |
| 30–45 Day Close | Standard institutional execution | 30–45 day DD, 30–45 day close, not subject to financing | 0.5–1 cap rate point from market |
| Best Price, Standard Terms | Full institutional process | 60–90 day close with full DD, subject to financing | Market cap rate |
| Premium Institutional | Maximum recovery, 60/60 | Mandatory 60-day DD, 60-day close, most capitalized partners | At or above market |

### Why This Design:

The psychology is Cialdini's contrast principle + Kahneman's anchoring. By presenting five groups ranging from fastest (highest premium) to slowest (best price), the broker self-selects and the seller sees a RANGE — anchoring on the institutional buyers while the speed buyers create urgency. The "30–45 Day Close" group is labeled "MOST ACTIVE GROUP" because that's where most transactions land.

### Portal Features:

- Deal submission form with property details, asking price, asset type
- Automated intelligence cards showing crime data, employment, population, cap rates, walk score
- Broker dashboard showing submitted deals with status tracking
- Platform integration badges (Crexi, LoopNet, CoStar, CBRE, Marcus & Millichap, Cushman & Wakefield)
- Asset types: Multifamily, Retail, Office, Industrial, Hotel, Mixed-Use, Self-Storage, Medical, Other

### Backend Is Intentionally Manual for Beta:

The Wizard of Oz model — human workers assisted by AI before full automation. Market validation before building full automation. A working proof of concept, even manually powered, is what unlocks major partner conversations.

---

# PART 4: THE FIVE MACHINE COMPONENTS

## Component 1: Deal Sourcing Engine — 14 Channels

### Channel 1: Banks Holding Non-Performing CRE Loans
- 2.4 trillion in CRE loans in the banking system
- ~1,374 banks (31%) exceed regulatory CRE concentration threshold of 300% of Tier 1 capital
- 59 banks on FDIC Problem Bank List; ~4,000–4,100 FDIC-insured banks total
- Target: Chief Credit Officers and Special Assets Officers
- FedEx physical package to CCO is gold standard for first touch
- Cold outreach: 3–8% response rate; warm/referral: 15–30%
- Key platforms: DebtX, Mission Capital, Rhenium Capital
- FDIC Call Reports (free) for screening via BankFind Suite, FFIEC, FAU Banking Initiative CRE Screener

### Channel 2: Credit Unions with CRE Exposure
- 4,411 federally insured credit unions holding $159 billion in CRE
- NCUA regulates; statutory Member Business Loan cap limits aggregate MBL balance to 1.75x net worth
- Key difference: not-for-profit cooperatives with volunteer boards, "member first" ethos
- Pitch framed around member protection and fiduciary duty
- Data: NCUA 5300 Reports downloadable quarterly

### Channel 3: CMBS Special Servicers ($64B in distress)
- Special servicing rate at 10.91%; overall CRED iQ distress rate 11.98%
- $64–65 billion in CMBS loans in special servicing
- Dominant workout: foreclosure 39.1%, modifications 20.3%, note sales 18.7%
- Major servicers: CWCapital (~$225B UPB), LNR Partners (~$105B UPB, Starwood subsidiary), SitusAMC (#1 by new issuance), Rialto Capital ($90B+), Greystone ($23.7B), KeyBank ($200B+)
- CRITICAL ACTION: Register on RI Marketplace (rimarketplace.com) — CWCapital's platform with 100,000+ investors

### Channel 4: REO Asset Management Platforms
- Ten-X Commercial (CoStar Group) — #1 CRE auction, 3% buyer fee
- Xome (Mr. Cooper subsidiary) — 115,000+ properties sold, 5% buyer premium
- Hubzu (Altisource) — 1.9M+ registered buyers, 265,000+ properties
- RealtyBid (Covius) — 100+ bank partners, $250 bid deposit
- Bulk REO pools typically price at 40–70% of BPO

### Channel 5: Government and Agency Sources
- FDIC failed bank asset sales (register at prospectivepurchaser@fdic.gov, $1M minimum net worth, $50K deposit)
- GSA surplus property (realestatesales.gov)
- US Marshals Service (Bid4Assets)
- SBA 504 loan defaults
- Fannie Mae/Freddie Mac NPL programs (171,333 NPLs with $31.4B UPB sold since 2014)
- Tax certificate and deed sales (Tax Sale Resources tracks nationwide)
- Sheriff sales (Bid4Assets centralized platform)

### Channel 6: Tax-Delinquent Commercial Property Owners
- Kandasamy et al. (2014): chronic cortisol exposure increases risk aversion — stressed sellers biologically primed for certain/fast outcomes
- Tools: PropStream ($99–$699/mo, 160M+ properties), BatchData ($500–$5,000/mo API), ATTOM Data ($500+/mo), DataTree/First American (~$30,500/yr)
- "Trust Ladder" method: 3+ touches over 6–8 weeks
- Composite distress score: tax delinquency (25–30 pts), lis pendens (25–30), code violations (15–20), vacancy (15–20), liens (10–15), absentee ownership (5–10), bankruptcy (20–25)

### Channel 7: Bankruptcy 363 Sales and Receivership
- Section 363 sales complete in 2–3 months, "free and clear" of liens
- Stalking horse strategy is natural positioning — gets break-up fee 1–3%, shapes APA terms
- Monitoring: PACER ($0.10/page), DailyDAC (free Chapter 11 alerts), Inforuptcy (500–700 active listings), PacerMonitor
- FedReceiver (Stephen Donell, 900+ receiverships) — join NAFER (~$575/year)

### Channel 8: Probate and Divorce Proceedings
- Up to 85% of probate filings have an associated property
- Contact timing: 3–4 weeks after probate filing
- Tools: US Probate Leads, All The Leads, ProbateData, Probate Money
- Build referral networks with probate and divorce attorneys

### Channel 9: The $1.15 Trillion Maturing Loan Opportunity
- Existing 900-property CoStar list as starting point
- 43% of maturing loans tracked by CRED iQ have rates below 5%; 14.7% below 4%
- $115 billion in loans maturing by end 2026 with DSCR below 1.20x
- Scale to 5,000+ using CRED iQ and Reonomy data
- Multi-touch sequence: 7 touches over 25 days (email, phone, LinkedIn, direct mail, breakup email)
- Infrastructure: Instantly ($97/mo) for unlimited email accounts, 10 secondary domains = 300 emails/day

### Channel 10: Multi-Signal Distress Scoring Model
- PropertyRadar ($119–$599/mo, 285+ search criteria)
- Train ML models on historical conversion data to optimize weightings over time

### Channel 11: Legal Notice Monitoring
- State press association websites offer free keyword alerts for foreclosure, sheriff sale, tax sale notices
- Column (column.us) — $30M+ raised, modernizing legal notice publishing across all 50 states
- Legal notices account for 5–15% of distressed CRE transaction volume

### Channel 12: RePrime's Club Model vs. Competition
- Private club confidentiality (no public stigma)
- Vetted buyer competition (every bidder verified with capital)
- Non-refundable deposits (eliminating retrade risk)
- 60-day list-to-close (30-day DD + 30-day close)
- If structured as "competitive offer process" rather than formal auction, likely avoids auctioneer licensing
- Broker protection is non-negotiable — always preserve listing broker commissions

### Channel 13: Activating the 30-Year Broker Network
- "10-word email" for dormant contacts: "Are you still working on distressed CRE deals in [market]?"
- Four-email reactivation sequence over 4 weeks
- Founding Partner program: first 50–100 brokers get exclusive benefits, tiered Bronze → Platinum
- Speed of feedback drives repeat submissions: acknowledge in 24–48 hours, preliminary analysis in 72 hours

### Channel 14: Israeli Institutional Capital
- Israeli institutions deployed $578 million into US CRE in 2024
- Major players: Migdal Insurance, Menora Mivtachim ($80B+ managed), Harel Insurance, Clal Insurance, Faropoint, IBI Investment House
- Dual opportunity: source deals FROM Israeli sellers exiting US positions + attract Israeli institutions as buy-side members
- FIRPTA: 15% withholding on dispositions; Qualified Foreign Pension Funds exempt
- Korean, Chinese, Taiwanese investors also exiting US CRE

### Buy Box Criteria (All Channels):
- 20–30% below market value
- 30-day due diligence, 30-day close
- Not subject to financing (strongest position)
- $100K deposit (typical, scales with deal size)
- If no discount: seller financing, high leverage, assumption, master lease, installment sale, or earnout
- Speed as competitive advantage: "Speed wins"

## Component 2: Broker AI Relationship Machine

Architecture:
- Record ALL calls (Otter.ai ~$20/month for phone; Zoom already done)
- Store per broker: personal details, family info, deal history, preferences, communication style
- Before every meeting/call: auto-generate briefing
- Integrate with Google Calendar (g@reprime.com)
- AI IS the relationship engine — if an employee leaves, they lose the machine

Staged Broker Communication:
1. Re-engagement email — express interest, ask about property status. Don't reveal price expectations.
2. Follow-up with pointed DD questions demonstrating homework done. Build credibility.
3. Drop the offer number, backed by analysis.

The recommended tool stack for this (from detailed evaluation):
- Fireflies.ai Business ($39/mo) — GraphQL API, CRE-specific topic tracking, transcript → webhook → GPT-4o structured extraction → CRM
- Calendly Standard ($10/mo) — broker scheduling with booking webhooks → Fireflies API for past conversations → GPT-4o briefing → email 30 min before meeting
- Synthflow Pro ($375/mo) — ONLY for after-hours inbound answering and basic appointment scheduling. Will fail with experienced CRE brokers who detect AI within 30 seconds. Not ready for broker calls.

## Component 3: Bank NPL Outreach Engine

- Pull FDIC Call Reports to identify banks with elevated NPL ratios
- Target Chief Credit Officers and Special Assets departments
- Multi-channel outreach: email, FedEx physical envelopes, phone
- Track all responses in CRM

Active platforms: DebtX, CWCapital Marketplace, FDIC Prospective Bidder Registration, Mission Capital, LNR Partners

Major NPL opportunity: Flagstar Financial reducing CRE exposure from $47B to $30B. Regional bank portfolio sales accelerating.

## Component 4: Property Analysis Engine

Every property analyzed using all available tools. Three report types (ALWAYS ASK which type):
1. **Buyer Report** — negatives to drive price down
2. **GP/Flip Report** — positives with honest negatives for credibility
3. **Full Report** — both sides balanced

Analysis covers: market fundamentals, comparable sales, tenant credit, crime data, employment, demographics, chain rankings, environmental risk, building condition, competing properties, development pipeline, loan maturity, tax assessment risk.

Standing order: Go beyond what Gideon knows. Proactively find and suggest new tools.

## Component 5: Security Architecture

1. Two-layer architecture — client portal vs. internal engine
2. No builder sees full system — ever
3. Compartmentalize all access
4. PIIA + NDA + non-solicitation agreements signed before Day 1
5. AI IS the relationship engine — it belongs to the family, not to employees
6. If an employee leaves, they lose the machine, not the other way around
7. Separate URLs, separate databases
8. Role-based access control
9. Audit logging on all actions

---

# PART 5: REVENUE ARCHITECTURE & PRICING

## Membership Pricing — $30,000/Year

The $30,000 price point is research-backed and sits precisely within the pricing corridor for ultra-high-net-worth peer investment networks:

| Network | Annual Fee | Wealth Threshold |
|---------|-----------|-----------------|
| R360 | $60,000 | $100M+ net worth |
| World 50 | ~$50,000 | C-suite Global 2000 |
| Tiger 21 | $33,000 | $20M investable |
| **RePrime Terminal** | **$30,000** | **TBD** |
| Vistage (CEO) | $16,560 | $5M+ revenue |
| YPO | $6,000–$12,000 | $13M+ revenue |

### Why $30,000 Works — The Psychology:

**Price anchoring (Kahneman/Tversky):** Stating $30,000 permanently anchors value perception. Even when waived for founders, the anchor remains.

**Transaction utility (Thaler):** Setting $30K as reference price then waiving it creates enormous positive transaction utility — founding members perceive an exceptional deal.

**Scarcity principle (Cialdini):** 20-member founding cap. Worchel et al. (1975): cookies from a jar of 2 rated significantly more desirable than from a jar of 10.

**Veblen good dynamics (Leibenstein):** Price IS the product — signals seriousness, filters for quality, creates commitment through effort justification.

**Zero-price effect (Shampanier/Mazar/Ariely):** FREE triggers qualitatively different psychological responses than discounts. Frame founding member waiver as a GIFT, not a discount.

### Founding Member Architecture:

- 20-member cap at founding tier
- First year waived as a "gift" (not "discount")
- Frame: "Your first year is our $30,000 gift to you"
- Creates reciprocity obligation (Cialdini)
- Endowment effect makes renewal near-automatic (Kahneman: owners demand ~2x what buyers will pay)

### Four-Tier Expansion (After Founding):

| Tier | Price | Access |
|------|-------|--------|
| Observer | $5K–$10K/yr | Market intelligence, webinars, anonymized deal summaries. No co-investment. Pipeline for future full members. |
| Associate | $20K–$30K/yr | Current founding member equivalent. Full deal flow, co-investment rights, DD access. |
| Principal Partner | $50K–$75K/yr | Priority deal allocation, investment committee seat, co-GP opportunities. |
| Institutional | $100K+/yr | Custom mandates, dedicated deal sourcing, proprietary research. |

50–100 members across tiers (30 Observers, 15 Associates, 4 Principal Partners, 1 Institutional) = $500K–$1M+ annual membership revenue.

## Transaction Coordination Fee

**1.5% of deal size ($15,000 minimum)** — single bundled fee covering all vendor vetting, quote comparison, rate negotiation, quality assurance, and timing coordination across cost segregation, 1031 exchange, insurance, title/escrow, appraisal, survey, environmental.

Why bundled:
- Ariely's "pain of paying": every payment triggers brain's insula. Single $25K fee causes only marginally more pain than $15K, while five $5K fees create five pain events.
- Thaler's hedonic framing: integrate losses (one fee), segregate gains (itemize every service in "Value Delivered" summary)
- Soman/Gourville: bundling creates "transaction decoupling"

## DDaaS (Due Diligence as a Service)

**1% of deal size ($50,000 minimum)**

Positioned as RISK INSURANCE, not a service cost: "The average cost of discovering a Phase I environmental issue post-closing is $500K–$2M. Our comprehensive DDaaS at 1% provides institutional-grade protection."

Declining scale above $15M: 1% on first $10M, 0.5% on next $15M, 0.25% thereafter, cap $200K–$300K.

Revenue projections:
- Conservative (Year 1): 4 deals/mo × $50K = $2.4M/yr
- Base (Year 2+): 8 deals/mo × $65K = $6.24M/yr
- Optimistic (Year 3+): 12 deals/mo × $80K = $11.52M/yr

## Additional Revenue Streams

| Stream | Revenue Potential | Notes |
|--------|------------------|-------|
| Disposition advisory | 1% of exit price | $150K–$500K/yr at maturity |
| Tax appeal coordination | 30% contingency on savings | $50K–$200K/yr, zero risk to members |
| Construction management oversight | 5% of renovation budget | $75K–$300K/yr |
| Co-investment vehicles (SPVs) | 1–2% mgmt fee + 20% carry above 8% pref | $100K–$500K+ scaling with AUM |
| Debt placement | 0.5–1% of loan amount | $675K–$2.7M/yr (requires broker license) |
| Title/escrow affiliate | 15% referral share | $500K–$750K/yr |
| 1031 exchange matching | Buy-side commissions | $200K–$2M/yr |
| Insurance placement | Recurring annual commissions | $72K–$430K/yr |
| Cost segregation referrals | $1K–$3K per deal | $48K–$72K/yr |

**Total platform revenue potential at maturity: $14.5M–$32.5M/year (Year 5)**

## Fund Structure (First Fund: $25M)

| Parameter | Benchmark |
|-----------|-----------|
| Legal structure | Delaware LP with LLC GP |
| Reg D exemption | 506(c) (permits general solicitation to accredited investors) |
| Fund term | 7 years + two 1-year extensions |
| Investment period | 3 years |
| Management fee | 1.5% on committed capital (investment); 1.0% on invested capital (harvest) |
| Carried interest | 20% above 8% preferred return |
| GP commitment | 2%–5% ($500K–$1.25M) in cash |
| Minimum LP commitment | $50,000–$100,000 |
| Target net IRR | 15%–20%+ |
| Legal formation cost | $30,000–$75,000 |

Waterfall: (1) return of capital 100% to LPs → (2) 8% cumulative pref to LPs → (3) GP catch-up at 100% until 20% of total profits → (4) residual 80/20 LP/GP. Multi-tier variant: 70/30 above 12% IRR, 60/40 above 18% IRR.

---

# PART 6: THE 113-MEMBER EXPERT BOARD — 11-GROUP ARCHITECTURE

The board is permanently established. Never re-research members. The Deal Psychology Engine's frameworks are NOT optional suggestions — they are the DEFAULT operating system for all Terminal output.

## Group 1 — Intelligence & Pattern Recognition
**Mission:** Gather, interpret, and act on market data and distress signals without falling prey to cognitive biases.
- CRE: Andrew Florance (CoStar), Manus Clancy (Trepp/LightBox), Cynthia Hetherington (OSINT), Leonard Fuld (competitive intelligence)
- Psychology: Kahneman (prospect theory, λ≈2.0), Tversky (framing, heuristics), Gigerenzer (fast-and-frugal heuristics), Taleb (Black Swan, antifragility)

## Group 2 — Outbound Outreach & Persuasion Engine
**Mission:** Execute multi-channel outreach that compels responses.
- CRE: Jeb Blount (Fanatical Prospecting), Alex Berman (Cold Email King), Larry Kim (SMS/WhatsApp), David Lindahl (direct-to-owner CRE)
- Psychology: Cialdini (7 principles, pre-suasion 29%→77%), Schwartz (5 awareness levels), Halbert (direct response), Berger (STEPPS), Chip & Dan Heath (SUCCESs/Switch)
- Cross-group: Zajonc (mere exposure r=0.26), McGuire (inoculation d=0.43), Ogilvy (headline science), Rackham (SPIN Selling)

## Group 3 — Broker & Relationship Capital
**Mission:** Build broker relationships that produce off-market deal flow.
- CRE: Rod Santomassimo (Massimo Group, 3,000+ brokers), Ann Hambly (1st Service Solutions, $25B+ CMBS), Stephen Donell (FedReceiver, 700+ receiverships), Jeff Frieden (Ten-X/Auction.com, $32B+)
- Psychology: Grant (Give and Take, 5-minute favors), Greene (48 Laws), Godin (Permission Marketing), Pink (Drive, autonomy/mastery/purpose)

## Group 4 — Brand, Inbound & Digital Experience
**Mission:** Position RePrime as the definitive distressed CRE buyer through digital presence.
- CRE: Alex Robinson (Juniper Square, $700B+ managed), Laura Ries (Visual Hammer), Trish Bertuzzi (Bridge Group)
- Psychology: Eyal (Hook Model), Fogg (Tiny Habits, MAP), Norman (Design of Everyday Things), Krug (Don't Make Me Think), Walter (Designing for Emotion), Al Ries & Jack Trout (Positioning), Freedman (foot-in-the-door 17%→76%)

## Group 5 — Negotiation & Seller Psychology
**Mission:** Win negotiations by deeply understanding seller motivations.
- CRE-Psychology Bridge: Chris Voss (FBI tactical empathy, labeling, calibrated questions)
- Psychology: Ury (Getting Past No, BATNA), Fisher (Getting to Yes), Galinsky (first-offer r=0.85), Mason (precise anchoring d=0.57), Cohen, Diamond (Getting More, only 8% fact-based), Camp (Start with No), Shell (5 negotiation styles), Klaff (frame control — NOTE: "croc brain" based on debunked triune brain theory), Malhotra (Negotiating the Impossible), Ekman (FACS), Cuddy (warmth/competence)
- Cross-group: Lieberman (affect labeling d=0.79-1.22 — NOT "30% amygdala reduction"), Brehm (psychological reactance r=0.20-0.21)

## Group 6 — Underwriting, Analysis & Decision Science
**Mission:** Underwrite deals with rigor while avoiding cognitive traps.
- CRE: Bruce Kirsch (REFM, "Blue Bible"), George Azih (FinQuery), Peter Linneman (Wharton), Howard Marks (Oaktree, $205B AUM)
- Psychology: Ariely (choice architecture, decoys), Loewenstein (curiosity gap), Thaler (nudges, mental accounting), Poundstone (pricing), McKee (Story narrative arc), Minto (Pyramid Principle)

## Group 7 — Deal Execution & Transaction Management
**Mission:** Move deals from LOI through closing.
- CRE: Ronald Rohde (A.CRE Legal, most-used public LOI templates), Stuart Saft (Holland & Knight), Jenny Redlin (ESI, "leading DD expert"), Gene Trowbridge (securities, $5B+ raised)
- Psychology: Tufte (data-ink ratio), Larson (typography), Vögele (eye-tracking, P.S. lines 79-90% read first), Nielsen (F-pattern), Campbell (Hero's Journey — NOTE: literary theory, not empirically tested)
- Cross-group: Thorndike (halo effect), Anderson (information integration — people AVERAGE not ADD), Kolenda (visual persuasion), Bringhurst (typography)

## Group 8 — Pipeline Operations & Workflow
- CRE: Jacco van der Kooij (Winning by Design), David Teten (HOF Capital, median investor reviews 87 opportunities per 1 investment), Wes Snow (Ascendix)
- Psychology: Fogg (behavior design for CRM adoption), Eyal (Hook Model for CRM habits), Dweck (growth mindset), Duckworth (Grit), Csikszentmihalyi (Flow)

## Group 9 — Compliance & Risk Governance
- CRE: Eric Troutman ("Czar of the TCPA," 700+ successful defenses), Gene Trowbridge (Reg D, JOBS Act)
- Psychology: Dalio (Principles, systematic decision-making), Zimbardo (Lucifer Effect, situational compliance failures), Lakoff (reframe compliance as competitive advantage), Taleb (antifragility)

## Group 10 — Strategic Investment Philosophy
- CRE: Sam Zell (1941-2023, "The Grave Dancer"), Barry Sternlicht (Starwood ~$115B, "broken balance sheets not broken assets"), Don Peebles, Jon Gray (Blackstone, $340B+ RE AUM), Debra Cafaro (Ventas, longest-serving female S&P 500 CEO)
- Psychology: Northcraft (CRE anchoring — listing price explains 17-40% of expert appraisals), Genesove (housing loss aversion 25-35% markup), Damasio (somatic markers), Sapolsky (cortisol: 69% increase → 44% drop in certainty equivalent), Wilson (adaptive unconscious)

## Group 11 — AI Translation & Execution
**Mission:** Translate every board-level decision into AI-executable instructions.
- Sander Schulhoff (Prompt Engineering, 58 text + 40 multimodal techniques)
- Harrison Chase (LangChain, 100K+ GitHub stars)
- Amanda Askell (Anthropic, created Claude's personality system)
- Jason Liu (Instructor, Pydantic validation)
- Lianmin Zheng (Chatbot Arena, LLM-as-Judge >80% agreement)
- Omar Khattab (DSPy/Stanford, ICLR 2024)
- Navrina Singh (Credo AI governance)
- Jordan Dearsley (Vapi, sub-1-second latency voice AI)
- Simon Willison (Datasette, prompt injection research)
- Jerry Liu (LlamaIndex, 37K+ stars)
- Sebastian Raschka (Lightning AI, QLoRA 99.3%)
- Brian Raymond (Textractor, document processing)
- Jan Oberhauser (n8n, 100K+ stars, 900+ integrations)

## Deal Lifecycle Through Groups:
FIND IT: Group 1 → 2 → 3 → 4
EVALUATE IT: Group 6 → 10
WIN IT: Group 5 → 7
OPERATE IT ALL: Group 8 → 9
TRANSLATE IT ALL: Group 11 (wraps around every stage)

## Key Effect Sizes (Validated, Use Confidently):

| Finding | Effect Size | Source |
|---------|-------------|--------|
| Loss aversion | λ ≈ 2.0 | Brown et al. 2024 meta-analysis, 607 estimates |
| First-offer anchoring | r = 0.50–0.85 | Galinsky & Mussweiler |
| Precise anchoring | d = 0.57 | Mason et al. — $4,835,000 not $4,800,000 |
| Inoculation effect | d = 0.43 | Banas & Rains meta-analysis |
| Peak-end rule | r = 0.58 | Alaybek meta-analysis |
| Affect labeling | d = 0.79–1.22 | Lieberman fMRI |
| Default effects | d = 0.43 | Mertens et al. 2022, n=2,148,439 |
| Foot-in-the-door | r = 0.17 | Meta-analytic |
| Mere exposure | r = 0.26 | Meta-analytic |
| CRE anchoring | 17-40% of variance | Northcraft |
| Housing loss aversion | 25-35% markup | Genesove |
| BYAF (But You Are Free) | g = 0.44 | Fillon et al. 2024, 52 experiments, N=19,528 |

## NEVER Cite False Statistics:
- NOT "30% amygdala reduction" (not in original Lieberman research)
- NOT "20% comprehension from white space" (false attribution)
- NOT "15% trust from serif fonts" (actual: 9%, from commercial research)

---

# PART 7: LOI PSYCHOLOGY SYSTEM

Three standalone AI system prompts, each psychologically engineered to produce LOIs that maximize acceptance. Not traditional LOI templates — a new model built on negotiation psychology, behavioral economics, and written persuasion science. 50+ academic sources.

### Three LOI Types:

**Type 1 — Banks & Institutional Sellers:** Focus on efficiency, certainty of close, regulatory compliance language.

**Type 2 — Bankruptcy Trustees & Sophisticated Investors:** Focus on market data, comparable transactions, analytical framework.

**Type 3 — Non-Sophisticated Individual Owners:** Focus on relationship, trust, legacy, simplicity. For elderly or passive owners: larger fonts, simpler language, emotional resonance.

### LOI Architecture (Developed with Morton Deal):
1. Title page: "Letter of Intent / Based on the Following / Property Analysis" (pre-suasion)
2. Property overview with facts (not arguments)
3. Market context (let seller arrive at conclusion themselves)
4. About RePrime Group (social proof via broker quotes, authority via track record)
5. Proposed terms
6. Timeline and next steps
7. Closing with "close out this file" urgency language

### Critical LOI Rule:
"Fred must arrive at the conclusion himself that [price] is a fair — even generous — offer." The letter should never argue. It should present. The argument forms in the reader's mind, not on the page. (IKEA Effect: Norton, Mochon & Ariely — people value conclusions they reach themselves 63% more.)

---

# PART 8: ACQUISITION PIPELINE (LOVABLE/SUPABASE APP)

Built on Lovable with Supabase backend. Complete upgrade from Pipeline 2.0 to Acquisition Pipeline.

### 11 Stages + Exit:

| Order | Stage | Color |
|-------|-------|-------|
| 1 | Outreach Initiated | Purple |
| 2 | Broker Engagement | Pink |
| 3 | LOI & Negotiation | Yellow |
| 4 | Data Room & Presentations | Light Blue |
| 5 | PSA & DD Materials | Sky Blue |
| 6 | Due Diligence | Teal |
| 7 | Post-Hard Money & Closing Prep | Orange |
| 8 | Closing | Cyan |
| 9 | Post-Closing Transition | Slate |
| 10 | Asset Management | Green |
| 11 | Refinance / Disposition | Orange |
| EXIT | Not Interested / Deal Declined | — |

### DD Zone System (for 30-day DD):
- Green Zone: Days 1–15 (0–50%)
- Yellow Zone: Days 15–21 (50–70%)
- Orange Zone: Days 21–28 (70–93%)
- Red Zone: Days 28–30 (93–100%)

### 4 Approval Gates:
1. **Presentation Gate** — Gideon approves Hebrew and English presentations
2. **GO/NO-GO Gate** — Gideon decides proceed or terminate; deposit becomes non-refundable
3. **Extension Decision Gate** — exercise 30-day extension right?
4. **Closing Authorization Gate** — Shirel → Gideon: LP equity confirmed + final wire authorized

### Seed Data Built:
- 97 acquisition task templates across 4 tracks
- 68 DD document templates (56 multifamily + 12 retail)
- 37 data room folder templates (12 main + 25 subfolders)
- 15 LP notification templates

### Implementation Status:
- Phase 1 (Database): All 8 migrations complete ✅
- Phase 2A: Stage navigation + deal header dashboard ✅
- Phase 2B: Task tracker grid ✅
- Phase 2C through 2F: Designed but not yet implemented

---

# PART 9: DUE DILIGENCE ADDENDUMS

Three professional DD request addendums created:

- **Office Addendum:** 15 pages, 107 items (building systems, HVAC, elevator, fire/life safety, structural, parking, environmental, technology, tenant improvements, common areas, accessibility, security, CapEx history)
- **Retail Addendum:** 12 pages, 84 items (site and access, structural, parking/loading, tenant-specific, CAM, signage, environmental, anchor provisions, percentage rent, exclusive use, co-tenancy)
- **Multifamily Addendum:** 15 pages, 124 items (unit condition, building systems, amenities, parking, laundry, security, fire safety, pest control, utilities, CapEx history, turnover data, rent collection, Section 8 compliance)

---

# PART 10: TECHNOLOGY STACK — COMPLETE TOOL EVALUATION

## Part 1 Tools (Core Stack):

| Tool | Purpose | Annual Cost | Status |
|------|---------|-------------|--------|
| CoStar | Market data, comps, loan maturity | ~$24K/yr | Active |
| Buildout | Property presentations | $15K/yr | Active |
| CRED iQ | CMBS distressed loan data | ~$14.4K/yr | Evaluated |
| Trepp | CMBS analytics | $25K–$75K/yr | Evaluated |
| MSCI RCA | Institutional transactions | Enterprise | Evaluated |
| Reonomy (now Altus Group) | ML property intelligence, LLC piercing | $4.8K/yr | Recommended |
| Placer.ai | Foot traffic, demographics | $5K–$15K/yr | Pending |
| Lovable | App builder | Active | Active |
| Supabase | Database backend | Active | Active |
| Playwright | Browser automation | Free | Built |
| Claude API | AI processing | Active | Active |
| LexisNexis Accurint | Skip tracing + background | Enterprise | Recommended |

## Part 2 Tools (150+ Evaluated Across 23 Categories):

### Cold Email Architecture:
- Lemlist Multichannel Expert ($1,188/yr) — native email + LinkedIn + cloud calling
- Smartlead Pro ($1,128/yr) — unlimited email accounts with warmup
- Apollo.io Basic ($588/yr) — 275M+ contact database

### Counterparty Intelligence (no single platform does it all):
- BatchData ($6K–$12K/yr) — bulk skip tracing, 10.5B+ data points
- UniCourt Professional ($1,788/yr) — 4,000+ state AND federal courts
- Factiva/Dow Jones ($2.5K–$3K/yr) — 33,000+ premium sources
- Mention Pro ($996/yr) — 1B+ sources monitoring

### Meeting Intelligence:
- Fireflies.ai Business ($468/yr) — GraphQL API, CRE topic tracking

### AI Voice Agents:
- Synthflow Pro ($4,500/yr) — LIMITED USE ONLY: after-hours inbound, basic scheduling. NOT for broker calls.

### Web Scraping/Monitoring:
- Apify ($2.4K–$12K/yr) — 17,477+ pre-built Actors, Playwright-native
- Bright Data ($6K–$18K/yr) — 150M+ residential IPs, anti-detection

### Workflow Automation:
- n8n self-hosted (Free + $240–$600/yr infrastructure) — unlimited workflows, strictly dominant for technical user
- Make.com Pro ($226/yr) — backup

### Physical Mail:
- Lob ($5.7K–$6.6K/yr) — API-first direct mail, $0.83/letter
- Handwrytten (~$2K–$5K/yr) — real pen robots, 80% open rate claimed

### LinkedIn:
- Sales Navigator Core ($1,200/yr) — essential
- Expandi ($1,188/yr) — safest cloud LinkedIn automation
- PhantomBuster ($672/yr) — data extraction

### CRE Document Extraction:
- Clik.ai ($15K–$40K/yr) — 2.5M+ CRE docs/yr, 96.3% NOI accuracy (Deloitte audit)

### PDF Generation:
- DocRaptor ($180–$1.2K/yr) — institutional-grade HTML-to-PDF

### Distress Monitoring:
- PropertyRadar ($1,188/yr) — lis pendens, NOD, trustee sales
- DailyDAC (FREE) — all new Chapter 11 petitions daily
- Inforuptcy ($1,188/yr) — bankruptcy asset sale database
- CourtListener RECAP ($1,200/yr) — federal court keyword alerts

### Tenant Intelligence:
- CreditRiskMonitor ($8K–$15K/yr) — FRISK® Score 96% bankruptcy accuracy
- Chain Store Guide ($2K–$5K/yr) — 700,000+ store locations
- Thinknum Spark ($1,668/yr) — 35+ alternative datasets

### Market Data:
- FRED API (FREE) — essential macro backbone
- PwC Investor Survey ($545/yr) — best value in CRE data
- Green Street CPPI + Real Estate Alert ($30K–$45K/yr) — CONDITIONAL

### Total Part 2 Budget: ~$152K–$290K/year

---

# PART 11: GATEWAY — TAX LIEN CERTIFICATE PLATFORM

Gateway is a separate product concept: a tax lien certificate platform serving as a credibility engine feeding Terminal pipeline. Architecture defined, Delaware LP fund structure under Reg D 506(c) recommended. Status: seed stage.

### Key Research Completed:

**Iowa is the #1 tax lien state:** 24% annualized return, fully online auctions (Zeus/iowataxauction.com), open agent bidding, 21-month redemption + 90-day notice.

**Top 5 states for platform operators:** Iowa, Florida, Mississippi, Maryland, Arizona — each with double-digit statutory rates, online infrastructure, permissive third-party bidding.

**Competitive landscape (5 categories, ~30 players):**
1. Aggregator platforms: Bid4Assets (125K+ properties, $1B+ transactions), GovEase (14+ states, 860K+ parcels), Grant Street/LienHub (Florida-centric), RealAuction (1.5M+ auctions)
2. Institutional brokerages: limited
3. Private funds: limited
4. Education companies: multiple (masquerading as platforms)
5. True aggregation, secondary trading, international access: MASSIVE MARKET GAPS

**Foreign investor access:** Research completed on how foreign nationals can buy US tax lien certificates. ITIN required (14-week processing). US bank account needed. 30% default withholding unless treaty relief claimed (W-8BEN). Israel treaty maintains both countries' taxing rights on real property income.

**Israeli investor guide:** Complete legal and tax guide produced. Key issues: FIRPTA, withholding, treaty benefits, fund structuring through Delaware LP to optimize tax treatment.

**Community banks near Postville:** Survey completed of independent banks and credit unions for CD rates and potential banking relationships.

---

# PART 12: AI UNIVERSITY CONCEPT (IDEA-001)

Adaptive AI education platform. Seed stage. Primary student segment question unresolved. No further development documented in project files.

---

# PART 13: TEAM & COMPENSATION

### Current Team:
- **Gideon Gratsiani** — Founder & CEO. Visionary. 30+ years CRE. Dyslexic (audio-first).
- **Shirel Ben-Haroush** — Partner & Deal Coordinator. Sister-in-law, like a daughter. Manager of operations.
- **Chaim Abrahams** — CEO & Co-Founder
- **Adir Yonasi** — VP of Investor Relations
- **Bruce Smoler** — Attorney. Trusted legal counsel. Handles PSA drafting, securities, PIIA/NDA.
- **Neil Bane / Bane Realty Capital** — Mortgage placement partner, $9.5B+ career volume.
- **Steve Philipp** — AI/Tech. Decides system requirements (the WHAT person).
- **Mushka Gratsiani** — Research analyst, assigned builder for broker portal (Gideon's daughter).

### Hiring Plan:
- Phase 1: Two dedicated people per principal plus a manager
- Phase 2: Ten Terminal positions across departments
- Local market representatives model being explored (similar to Adir/Yaron Sitbon Israel model)

### Compensation Philosophy (Research-Backed):

Based on Lazear (Stanford), Ariely (Duke), Pink, Deci:

- **Base salary + permanent milestone raises** — NEVER deal bonuses (bonuses create short-term thinking and gaming behavior)
- **Deferred bonus pool with multi-year cliff**
- **Phantom equity:** 1–2% after 12–18 months proven loyalty
- **Back-weighted 4-year vest:** 10% / 20% / 30% / 40% — makes leaving increasingly irrational
- **PIIA + NDA + non-solicitation signed before Day 1**
- **Three-gate hiring:** skill, character (HEXACO-PI-R Honesty-Humility dimension), AI fluency
- **Compartmentalization is structural** — no single employee holds the full system

### Intern Pipeline:
- 2–3 CS students from nearby universities
- Compartmentalized tasks
- Postville apartments for housing
- Best intern becomes full hire after 6 months

### Relocation Package:
- Free housing in Postville
- Flights covered
- Airport pickup (Mercedes van, 2.5 hour drive)
- Stage perks gradually
- Families welcome

---

# PART 14: ENGINEERING CLAUDE FOR MAXIMUM OUTPUT

### Key Findings from Expert Board Audit (Feb 2026):

**Deployment strategy:** Compressed-critical-directives-in-Instructions + full-reference-as-Knowledge-file hybrid is the maximum-value approach. Project Instructions always loaded as system prompt; Knowledge files may fall to RAG retrieval.

**Anti-sycophancy:** Claude 4.5/4.6 models score 70–85% lower on sycophancy vs Opus 4.1. Anti-sycophancy instructions remain valuable but should be calibrated to the specific model. Overcorrecting may produce unnecessarily combative responses.

**Multi-persona debate:** Research shows single-pass structured analysis with extended thinking is SUPERIOR to multi-persona simulation. All "personas" within a single Claude conversation share the same weights. Replace 5-persona architecture with two-pass structured analysis.

**Expert personas:** Do NOT improve factual accuracy per Wharton research (Dec 2025). Can still shift tone and style for creative/open-ended tasks.

**Best practices:**
- Frame disagreement as the service itself
- Use process requirements rather than personality descriptors
- Separate critique from construction (never ask for "feedback and a rewrite" in one prompt)
- Mandatory pre-response structure before any assessment
- Place document content BEFORE instructions (Claude's attention weights content toward end)
- Use XML tags extensively
- Use trigger verbs: "deep dive," "comprehensive," "analyze," "evaluate," "assess," "research"

---

# PART 15: WRITING & COMMUNICATION STANDARDS

### Voice:
- Direct. Israeli business culture. No American corporate filler.
- Warm authority backed by 30+ years of execution.
- Confident — state conclusions, never hedge.
- Blackstone earnings call format: precise numbers, hierarchical structure, technical CRE/finance terminology, forward-looking statements with evidence.

### Precision:
- "$24.2M" not "approximately $24 million"
- "38 days to funding" not "quick close"
- "1.42x DSCR" not "healthy coverage"

### CRE Terms:
Always stay in English even in Hebrew documents: IRR, LOI, NOI, DSCR, cap rate, NNN, PSF, GLA, UPB, EBITDA

### Hebrew:
Native Israeli business terminology, not Google Translate word-for-word. Convert imperial to metric. Proper financial/legal Hebrew terms. If uncertain, flag and ask.

### Counterparty Calibration (Automatic):

| Counterparty | Approach |
|--------------|----------|
| Sophisticated Institutional | Mirror precision. Subtle psychology. |
| Non-Sophisticated Owner-Operators | Lead with empathy and burden relief. Face-saving off-ramps. |
| Regulated Entities (Banks, CUs) | Acknowledge fiduciary duties. Provide documentation for their board. |
| Israeli Institutional | Metric-first, skip pleasantries. IRR/equity multiple in English. Direct. |
| Attorneys/Special Servicers | Precision, compliance language, defensibility. |
| Brokers | Reciprocity-first. Demonstrate execution capability with specific metrics. |

### BANNED Words/Phrases:
- "Great question," "Excellent point," or any positive adjective opener
- "Trust me," "to be honest," "frankly," "honestly"
- "Win-win," "synergy," "leverage" (as buzzword), "game-changer," "comprehensive," "robust," "holistic"
- "In today's market..." "It's important to note..." "Moving forward..."
- "I understand your frustration" (more than once)
- Starting sentences with "I" — lead with the reader's interest
- Preambles. Start with substance.

### Cold Email Templates:

**Maturing Loan (First Touch):**
Subject: [Property Name] - Loan Maturity Discussion
"[First Name], I'm reaching out regarding [Property Address]. CoStar records indicate the loan on this property is approaching maturity, and given the current refinancing environment, I wanted to see if a sale might be worth exploring. Instead of going through the hassle of refinancing, we can offer a clean exit. Are you open to a conversation this week, or should I close out this file? — Gideon"

Design: No Zoom reference. No "we close quickly." "Close out this file" = loss aversion. Three sentences max.

**Bank NPL Outreach:**
"I'm writing to introduce RePrime Group. We specialize in acquiring distressed and non-performing commercial real estate debt. We have attached a CoStar report for reference with the loan details highlighted. If this loan is underperforming or you have interest in exiting the position, we would welcome the opportunity to discuss a potential acquisition. Additionally, if you have other non-performing or sub-performing loans in your portfolio that you are looking to sell, we would be very interested in learning more."

**Broker Re-engagement (10-word email):**
"Are you still working on distressed CRE deals in [market]?"

---

# PART 16: ACTIVE DEALS & PROPERTIES ANALYZED

- **Watermills Apartments** — $35M note acquisition, 99-unit Class A multifamily + 17,941 SF retail, Watertown MA. Working with IBI Investment House (Israel).
- **Morton, IL** — Illinois State Police Forensic Lab (LOI sent, psychology applied)
- **Badger Plaza, Racine WI** — Grocery-anchored retail (staged broker approach)
- **500 West Monroe, Chicago** — Office (staged approach template)
- **Cross Pointe Centre, Centerville OH** — Retail (buyer report)
- **Bay Valley Shopping Center** — Retail (investment presentation)
- **Sugar Grove, Port Charlotte, Kohl's properties** — Individual analyses
- **IGA Portfolio** — Investment committee memo and DD room guide produced

---

# PART 17: AUCTION WEBSITES DATABASE

Two Excel databases exist in the project:

1. **Real Estate Auction Websites Database** — 300+ sites organized into 6 tiers:
   - Tier 1: National CRE Platforms (Crexi, CBRE, LoopNet, RCM, Ten-X)
   - Tier 2: NPL/Debt Trading (DebtX, Freddie Mac, Fannie Mae, FDIC)
   - Tier 3: Bankruptcy (DailyDAC, Inforuptcy, Hilco)
   - Tier 4: CMBS Data (Trepp, CRED iQ, MSCI RCA)
   - Tier 5: Regional Sheriff Sales (FL, CA, IL, OH portals)
   - Tier 6: Federal Surplus (GSA, HUD, US Marshals)

2. **RePrime Priority Sites** — Prioritized list of specific auction/sourcing sites

---

# PART 18: WEBSITE & PUBLIC PRESENCE

### RePrime.com (Corporate Site):
- Institutional PE aesthetic (dark tones, elegant typography, founder-focused)
- Rich gold tones on cream/white backgrounds ("abundant wealth")
- Primary audience: deal sourcing (brokers, banks, special servicers)
- Key sections: About (competitive edge with maturity wall), Portfolio (14 active states + property cards), Divisions (RePrime Pro, RePrime STR, RePrime Construction), Track Record (2004–2025 timeline), Leadership (Gideon's profile), Contact (deal sourcing CTA)
- Items still needed: actual property photos, Gideon's headshot, interactive US map

### RePrimeTerminal.com (Client Deal Portal):
- Separate from corporate site
- Three tiers of access based on product type
- Live on Vercel with Supabase backend

---

# PART 19: FAMILY & PERSONAL CONTEXT

- **Orthodox Chabad Jewish.** Strong Emunah (faith) and connection to the Rebbe.
- **Wife Shely**
- **Twins Mushka and Dovber (דובער)**
- **Son Yosef Yitzchok**
- **Lost son Levi Yitzchak after 120 days due to a heart condition**
- **Shirel Ben-Haroush** — sister-in-law, like a daughter, also business partner and manager
- **Family is everything and comes first, always**
- **All systems shut down completely on Shabbat and Jewish holidays without exception**

---

# PART 20: KEY OPERATIONAL REMINDERS

1. **Terminal is deal sourcing only.** No investor reporting, LP/GP management, or fund operations.
2. **Discuss before creating artifacts** — never waste context window.
3. **Edit rather than rebuild** — always, unless explicitly told "start over."
4. **Readable Speechify-compatible prose first** — no tables, charts, borders, or decorative formatting until design phase. Readable = same institutional quality, not simplified.
5. **One question at a time** — always, without exception (dyslexia + audio-first).
6. **Gideon speaks Hebrew; Claude responds in English always.**
7. **CRE terms stay in English** — IRR, LOI, NOI, DSCR, cap rate always English.
8. **Interpret intent from speech-to-text, not literal transcription.**
9. **NEVER use "3,000+ transactions" or "$15 billion deployed"** — these numbers appear in older documents but are permanently banned from new output.
10. **Operations: email/text/AI avatars/social only.** Calls accommodated if asked, never core ops.
11. **Scan 1,000 deals to find 5 diamonds.**
12. **On reports: ALWAYS ask which type** (Buyer/GP-Flip/Full) before producing.

---

END OF COMPLETE INFORMATION TRANSFER.

This document contains every substantive piece of information from the RePrime Terminal project knowledge base — vision, architecture, psychology, pricing, tools, board expertise, deal structures, templates, competitive analysis, and strategic reasoning. It is raw information for a builder to assemble into the final product.
