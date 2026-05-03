# TERMINAL FINANCIAL INTELLIGENCE ENGINE
# MASTER BUILD BRIEF — READ BEFORE WRITING ANY CODE
# Prepared for Claude Code by Claude (claude.ai)
# Date: May 3, 2026

---

## YOUR FIRST JOB

Read every file in this folder before making any decisions. There are research files from Perplexity, financial modeling research documents, CoStar market reports, and this brief. All of it has equal weight. After reading everything, you will have the full picture. Only then do you present the build plan to Gideon for approval. Only after he approves do you write code.

Your communication style with Gideon: state what it is, how it works, how it looks. No narrating your process. No explaining what you're about to do. Show the picture, get approval, build.

---

## WHAT THIS IS

A live web-based CRE financial underwriting platform for internal use by RePrime Group. It accepts any document — CoStar reports, leases, offering memorandums, T-12s, rent rolls, construction contracts — extracts every material fact automatically, fires autonomous research across multiple data sources to fill every gap the documents don't cover, and produces a live institutional-grade financial model that recalculates in real time.

It is not a calculator. It is not a template. It is a deal intelligence engine.

Phase 1: Internal tool for Gideon and his team.
Phase 2: Integrated into Terminal as a member tool. Do not build for Phase 2 yet.

---

## AUTHENTICATION

Single shared login. No OAuth. No magic links. NextAuth.js credentials provider, session-based.

- Login: `terminal`
- Password: `TeamTrminal770`

Note to Claude Code: recommend Gideon changes password after first successful login.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Front end | Next.js (React) |
| Back end | Node.js / Express |
| Database | PostgreSQL |
| Document AI | Claude API (claude-sonnet-4-5, document vision) |
| Research AI | Perplexity API (sonar-pro) + Claude web search |
| Market data | RentCast API + ATTOM API + HUD FMR (free public API) |
| Calculation engine | SpreadJS (runs in browser, no server round-trips) |
| Excel export | ExcelJS |
| PDF export | Puppeteer |
| Hosting | Vercel (front end) + Railway or Render (back end + DB) |
| Auth | NextAuth.js |

No proprietary platform lock-in. Everything owned by RePrime.

---

## INTERFACE — THREE PANELS

```
┌─────────────────────────────────────────────────────────────────────┐
│  TERMINAL  [Deal Name]  [Asset Class]  [Status]         [Export ▼] │
├──────────────┬──────────────────────────────┬───────────────────────┤
│  LEFT        │  CENTER                      │  RIGHT                │
│  PROPERTY    │  LIVE MODEL                  │  OUTPUTS              │
│              │                              │                       │
│  Address     │  All fields editable         │  Levered IRR          │
│  SF / Units  │                              │  Unlevered IRR        │
│  Asset class │  Rent Roll (auto-populated)  │  Equity Multiple      │
│  Year built  │  OpEx Line Items             │  Cash-on-Cash Yr 1-5  │
│              │  CapEx / TI / LC             │  DSCR (every year)    │
│  Tenants     │  Debt Sizing (3 constraints) │  Debt Yield           │
│  + scores    │  Exit Assumptions            │  NOI                  │
│              │                              │  Value / Exit Value   │
│  Lease dates │  REPRIME SERVICES OVERLAY    │                       │
│  Expirations │  ☐ Deal Sourcing — 1.5%     │  BASE / DOWN / UP     │
│  Options     │  ☐ Guarantor — 1.5–2%       │  side by side         │
│  Deadlines   │  ☐ Const. Mgmt — 10%        │                       │
│              │  ☐ Asset Mgmt — 2% GI       │  Sensitivity table    │
│  Market data │                              │  2-variable           │
│  Demographics│  Research Status Bar         │                       │
│  Traffic     │                              │  Validation flags     │
│              │                              │                       │
│  Confidence  │                              │                       │
│  Dashboard   │                              │                       │
│              │                              │                       │
│  Drop files  │                              │                       │
└──────────────┴──────────────────────────────┴───────────────────────┘
```

Change any field in the center → right panel recalculates instantly. No save required.

---

## DOCUMENT INTAKE

User drops any file into the deal. PDF, Excel, Word, image. Claude API reads it with document vision. Every extracted field is tagged: source document + confidence level (High / Medium / Low). Every field is editable. System shows exactly which assumptions came from documents vs. market benchmarks.

### From a Lease — Extract:
- Tenant name, suite/unit number, rentable SF
- Lease type: NNN / NN / Modified Gross / Full Service Gross
- Base rent (current)
- Every rent step with exact effective date and new rate
- Escalation formula (fixed % or CPI-linked)
- Free rent: start date, end date, total months
- Lease commencement date
- Lease expiration date
- Every option to renew: notice deadline, option rent formula, option term length
- Termination rights and conditions
- Kickout clauses and sales thresholds
- Co-tenancy provisions (which anchor, what reduction, what remedy)
- TI allowance: total amount, amount remaining, landlord work obligations
- Personal guarantees: guarantor identity, guarantee amount, burn-off conditions
- Percentage rent: breakpoint (natural or artificial), percentage rate

### From an Offering Memorandum — Extract:
- Asking price
- Listed cap rate (seller-stated)
- Stated NOI (seller-stated)
- In-place occupancy
- Anchor tenant identity and lease summary
- All tenant lease summaries
- Property description, year built, renovation history
- Zoning, lot size, parking ratio
- Seller's pro forma assumptions
- → Auto-compare: seller's stated NOI vs model's calculated NOI. Flag any gap > 5%.

### From a T-12 / Operating Statement — Extract:
- Every income line: gross potential rent, vacancy, concessions, other income, reimbursements
- Every expense line: taxes, insurance, utilities, R&M, payroll, management, reserves, G&A
- Map to standardized NOI structure
- → Auto-flag any line outside benchmark ranges

### From a Rent Roll Spreadsheet — Extract:
- Every row: unit/suite, SF, current rent, market rent, lease start, lease end, tenant name
- Loss-to-lease calculates automatically

### From a Construction Contract or CapEx Budget — Extract:
- Total budget
- Line-item breakdown
- Projected timeline
- Contractor identity
- → Feeds CapEx schedule and Construction Management fee (10% of budget)

---

## LEASE EVENT TIMELINE

After all leases are processed, generate a unified timeline view showing every critical date across all tenants in chronological order:
- Lease expirations
- Option exercise deadlines
- Rent step dates
- Free rent burn-off dates
- Notice windows

Color coding:
- Green: more than 12 months out
- Yellow: 6–12 months out
- Red: less than 6 months or already passed

Options: show notice deadline in red when within 90 days of today's date.

The timeline drives the cash flow model. Rent steps hit on the correct month. Rollover assumptions activate on the expiration date. Free rent burns off on the correct date.

---

## REPRIME SERVICES OVERLAY

Four toggle buttons. Off by default. Independent of each other.

| Service | Rate | Applied To | Position in Model |
|---|---|---|---|
| Deal Sourcing | 1.5% | Purchase Price | Closing cost in Sources & Uses |
| Guarantor | 1.5%–2% (user sets rate) | Loan Amount | Annual fee — OpEx or subordinated |
| Construction Management | 10% | CapEx / Renovation Budget | Deducted from CapEx line |
| Asset Management | 2% | Gross Income (EGI) | Annual OpEx line |

When any toggle turns ON, the right panel shows:
- IRR before the fee
- IRR after the fee
- Dollar cost of the fee over the full hold period
- Adjusted equity multiple

---

## AUTONOMOUS RESEARCH ENGINE

Fires immediately after document extraction completes. All threads run in parallel simultaneously. Never sequential.

### Property-Level:
- Current tax assessment and any pending appeals — county assessor
- Zoning classification, variances, conditional use permits — municipal records
- Building permits last 5 years
- Environmental records — EPA EnviroFacts
- FEMA flood zone designation
- Code violations or open citations
- Ownership chain, liens, encumbrances — county recorder
- Utility providers and capacity constraints

### Market-Level:
- Submarket vacancy, availability, rent trends, net absorption
- Construction pipeline within 5-mile and 10-mile radius
- Recent comparable sales: price/SF and cap rate
- Active competing listings
- Local economic indicators: employment, population trend, income growth, major employer stability
- Announced retail or office closures in trade area
- Planned infrastructure changes, road projects, rezonings nearby
- Crime index data (affects insurance assumptions)

### Tenant-Level (every named tenant):

**Public companies:**
- SEC EDGAR: revenue trend, same-store sales, debt levels
- Credit ratings (Moody's, S&P): current rating and any recent changes
- Store count trend: opening or closing in this format and geography
- Any announced restructuring, bankruptcy, or strategic review
- Any sublease activity signaling contraction
- Analyst coverage on viability in this market type

**All companies:**
- PACER federal court records
- State court litigation search
- OSHA violations
- CPSC product recalls
- FTC actions
- BBB status and complaint volume
- Google Maps reviews for the specific location (star rating + review count)
- Yelp reviews for the specific location
- Local news covering the specific store

**Franchise tenants:**
- Franchisor financial health researched separately

**Anchors get deeper research than all other tenants.**

### Debt Market:
- Current SOFR rate and forward curve
- Agency MBS spreads (multifamily) / CMBS spreads (retail, office)
- Active lenders in this asset class and geography
- Recent comparable loan closings: LTV, DSCR, rate
- Bridge lender appetite for this market size

### Seller:
- Entity litigation history
- Prior foreclosures or defaults
- Prior ownership history of this property

### Research Tools to Call:
- Perplexity API (sonar-pro model) — live web synthesis
- Claude web search — supplemental
- RentCast API — rent comps and market data
- ATTOM API — property records, sales, assessor data
- HUD FMR API — fair market rents (free)
- News aggregators — tenant and market news

---

## CONFIDENCE DASHBOARD

Every assumption in the model is tagged:

- 🟢 Green — sourced from a document or confirmed market data API
- 🟡 Yellow — filled from knowledge base benchmark (no primary source found)
- 🔴 Red — conflict detected: document says X, market data says Y — show both values and the dollar gap

Red flags surface at the top of the deal, numbered, sorted by dollar impact on IRR.

---

## TENANT INTELLIGENCE CARDS

Every named tenant gets a card displayed in the left panel.

Card contains:
- Financial strength: Investment Grade / Strong / Moderate / Weak / Unknown
- Lease expiration risk: Low / Medium / High / Critical
- Google review score + review count (location-specific, not national)
- BBB status
- Known legal and regulatory actions (summary, not full text)
- Overall score: Strong / Moderate / Weak / Red Flag

**Red Flag tenant** automatically triggers a downtime scenario in the model:
- Default assumptions: 90-day vacancy gap, market TI/SF for replacement, 4% leasing commission
- All parameters user-editable

---

## FINANCIAL MODEL — PRO FORMA STRUCTURE

Asset class determines the revenue engine:
- Multifamily: unit-by-unit
- Retail and Office: tenant-by-tenant lease level

```
GROSS POTENTIAL RENT (GPR)
  – Loss to Lease
  – Concessions
  – Vacancy
  – Bad Debt / Credit Loss
  – Non-Revenue Units
= NET RENTAL INCOME
  + Other Income (parking, storage, RUBS, pet, laundry, signage, telecom)
  + Expense Reimbursements (NNN / CAM / tax / insurance — retail and office)
= EFFECTIVE GROSS INCOME (EGI)

OPERATING EXPENSES
  – Real Estate Taxes
  – Insurance
  – Utilities (if owner-paid)
  – Repairs & Maintenance
  – Payroll / Onsite Management
  – Contract Services (landscaping, pest, janitorial, security)
  – Marketing / Leasing
  – Management Fee (% of EGI)
  – General & Administrative
  – Replacement Reserves
= NET OPERATING INCOME (NOI)

  – Capital Expenditures (CapEx)
  – Tenant Improvements (TI)
  – Leasing Commissions (LC)
= ADJUSTED NOI / UNLEVERED CASH FLOW

  – Debt Service (Interest + Principal)
= LEVERED CASH FLOW

  + Sale Proceeds (Exit NOI ÷ Exit Cap Rate)
  – Selling Costs
  – Loan Payoff
= NET PROCEEDS TO EQUITY
```

NOI never includes debt service, depreciation, income taxes, or capital expenditures.

---

## DEBT SIZING — THREE CONSTRAINTS, ALWAYS USE THE MINIMUM

Run all three simultaneously. Lock final loan to the minimum of all three. Flag in red if user-entered debt exceeds any constraint.

```
Max LTV Loan  = LTV × Value
Max DY Loan   = NOI ÷ Minimum Debt Yield
Max DSCR Loan = (NOI ÷ Minimum DSCR) ÷ Loan Constant
FINAL LOAN    = MIN(Max LTV Loan, Max DY Loan, Max DSCR Loan)
```

---

## CORE FORMULAS

```
NOI             = EGI – Operating Expenses
EGI             = GPR – Vacancy – Credit Loss + Other Income + Reimbursements
Cap Rate        = NOI ÷ Value
Value           = NOI ÷ Cap Rate
DSCR            = NOI ÷ Annual Debt Service
Debt Yield      = NOI ÷ Loan Amount
LTV             = Loan ÷ Value
LTC             = Loan ÷ Total Cost
CoC             = Annual Pre-Tax CF ÷ Equity Invested
IRR             = discount rate where NPV = 0
Equity Multiple = Sum of Distributions ÷ Sum of Equity Contributions
Yield-on-Cost   = Stabilized NOI ÷ Total Project Cost
Break-Even Occ  = (OpEx + Debt Service) ÷ GPR
Loan Constant   = Annual Debt Service ÷ Loan Amount
```

---

## 2025–2026 MARKET BENCHMARKS (KNOWLEDGE BASE DEFAULTS)

### Cap Rates (CBRE):
- Industrial: 5.2%
- Multifamily Core: 4.75% | Stabilized: 5.3%
- Office: 6.4% (B/C higher)
- Retail Necessity: 6.4% going-in | 6.75–7.75% underwriting range

### Multifamily Underwriting (CBRE Q4 2025):
- Core going-in cap: 4.75% | Exit: 4.95%
- Value-add going-in cap: 5.26% | Exit: 5.38%
- Core unlevered IRR: 7.70%
- Value-add unlevered IRR: 9.36%
- Core rent growth (3-yr): 2.7% | Value-add: 3.1%

### Office Market (CBRE Q1 2026):
- National vacancy: 18.6% | Prime: 12.7%
- Avg asking rent: $37.21/SF (+2.2% YoY)
- TI allowance new office: $50–$120/SF

### Retail Market (CBRE Q1 2026):
- Avg asking rent: $24.59/SF (+2.4% YoY)
- Availability: 4.9%

### Expense Growth Benchmarks:
- Base inflation: 3.0%
- Insurance: 8–15% (elevated through 2026)
- Payroll: 4–5%
- Utilities: 3–5%

### Vacancy and Credit Loss:
| Sector | Physical Vacancy | Credit Loss |
|---|---|---|
| Multifamily stabilized | 5–7% | 2–5% |
| Office market-wide | 15–20% | 1–2% |
| Retail Necessity | 5–8% | 1–2% |
| Retail Power Center | 6–10% | 2–3% |

### Replacement Reserves:
- Multifamily: $250–$400/unit/yr
- Office: $0.15–$0.30/SF/yr
- Retail: $0.10–$0.25/SF/yr

### Lender Requirements by Asset Class:
| Asset | Max LTV | Min DSCR | Min Debt Yield |
|---|---|---|---|
| Multifamily | 60–70% | 1.30–1.50x | 8–9% |
| Office Class A | 55–65% | 1.45–1.65x | 9–11% |
| Office B/C | 45–55% | 1.55–1.75x | 11–13% |
| Retail Necessity | 60–70% | 1.35–1.55x | 9–11% |
| Retail Discretionary | Often unfinanceable | — | — |

### Exit Cap Premium Over Going-In:
- Multifamily: +50 bps
- Retail: +75 bps
- Office: +100 bps

---

## RETURN METRICS

| Metric | Formula | Target Range |
|---|---|---|
| Levered IRR | IRR of equity cash flows | 10–15% core / 15–25% value-add |
| Unlevered IRR | IRR of property cash flows | 6–10% core / 9–14% value-add |
| Equity Multiple | Sum distributions ÷ equity in | 1.6x–2.5x (5–7 yr hold) |
| Cash-on-Cash | Annual pre-tax CF ÷ equity | 6–10% stabilized |
| DSCR | NOI ÷ debt service | ≥1.20–1.50x |
| Debt Yield | NOI ÷ loan amount | ≥8–12% |
| Yield-on-Cost | Stabilized NOI ÷ total cost | 150–200 bps over market cap |
| Break-Even Occ | (OpEx + DS) ÷ GPR | <80% healthy |
| OER | OpEx ÷ EGI | MF: 30–50% / Office-Retail: 25–40% |

---

## SCENARIOS

Three scenarios run simultaneously, displayed side by side in the right panel.

**Base Case:** Underwriting assumptions as entered.

**Downside Case:**
- Rent growth: flat or negative
- Exit cap: +200 bps over base
- CapEx overrun: +50%
- Lease-up period extended 6 months
- Weakest tenant (lowest score): triggers vacancy and re-tenanting cost

**Upside Case:**
- Rent growth at high end of market survey
- Exit cap: −25 bps from base
- 100% renewal on all expiring leases
- Operating expense growth at low end

---

## VALIDATION FLAGS — AUTO-TRIGGER

Flag automatically without user action:
- Economic vacancy below 3% without explanation
- Insurance below $0.10/SF/yr (retail) or $600/unit (MF)
- Management fee missing or below 2.5% of EGI
- Replacement reserves not taken
- Debt violating any of the three constraints
- Exit cap tighter than going-in cap without user override note
- Rent growth assumption above CBRE survey averages without justification
- No downside scenario present
- Seller's stated NOI vs model NOI gap exceeds 5%
- TI amounts classified as CAM reimbursement
- Any tenant scored Red Flag without downtime scenario present

---

## EXCEL EXPORT — BRANDED TERMINAL FORMAT

Filename: `[Property Name]_[Date]_Terminal_Underwriting.xlsx`

17 tabs in this exact order:
1. Cover — Terminal logo, deal name, address, date, version number
2. Summary — one-page IC dashboard
3. Assumptions — all inputs, color-coded (Blue = input, Black = formula, Red = flag)
4. Rent Roll / Unit Mix — tenant or unit level
5. OpEx Budget — line-by-line with T-12 comparison column
6. CapEx / TI / LC Schedule
7. Debt Schedule — amortization, IO period, fees, covenant tests by year
8. Property Cash Flow — monthly and annual
9. Equity Waterfall — tiers, hurdles, promote
10. Sensitivity Tables — two-variable
11. Scenarios — Base / Downside / Upside
12. Sources & Uses
13. Return Metrics
14. Tenant Intelligence — one row per tenant with full scores
15. Lease Event Timeline — all critical dates chronological
16. Comps — rent, sale, expense
17. Checks and Version Log — error flags, formula audit, change history

---

## ASSET CLASSES SUPPORTED

The system must handle all three. Revenue engine and assumptions differ per class.

**Multifamily:** Unit-by-unit engine. Inputs: unit mix, market rent by type, in-place rent, loss-to-lease, concessions, physical and economic vacancy, turnover rate, make-ready cost, other income per unit (RUBS, parking, pet, laundry), renovation plan (cost/unit, rent premium, stabilization timeline).

**Retail / Shopping Centers:** Tenant-by-tenant engine. Anchor vs. inline distinction. CAM reimbursements by tenant. Percentage rent with natural and artificial breakpoints. Co-tenancy clauses auto-reduce inline rent if anchor goes dark. Rollover: downtime, TI/SF, LC%, replacement market rent.

**Office:** Tenant-by-tenant engine. Rentable vs. usable SF with load factor. Expense stops and base year for FSG leases. Gross-up provisions. Renewal probability assumption per tenant. Sublease exposure tracking. Typical downtime: 6–18 months on rollover depending on market.

---

## BUILD SEQUENCE

**Sprint 1:** Authentication + three-panel shell with static placeholder data. Gideon sees the interface and approves before any back-end complexity.

**Sprint 2:** Document intake. Drop zone → Claude API extraction → confidence-tagged field population → rent roll and OpEx auto-populate. Test with Knox Mall CoStar PDF.

**Sprint 3:** Calculation engine. SpreadJS embedded → live recalculation → debt sizing with three-constraint enforcement → three scenarios.

**Sprint 4:** Research layer. Perplexity API + RentCast + ATTOM → parallel firing → result parsing → model field mapping → confidence dashboard.

**Sprint 5:** Tenant intelligence cards + lease event timeline.

**Sprint 6:** Excel export (ExcelJS, 17 tabs, branded) + PDF summary (Puppeteer).

**Sprint 7:** RePrime services overlay + validation flags + full QA on Knox Mall as live test deal.

---

## FIRST DEAL FOR TESTING

Knox Mall Shopping Center — 1303 S Heaton St, Knox IN 46534. CoStar PDF is in this folder. Use it to validate every layer of the engine end to end: document intake, research, model population, tenant scoring, lease timeline, validation flags, Excel export. Every assumption the engine generates must trace to either the CoStar document or the knowledge base benchmarks.

---

## WHAT CLAUDE CODE DOES AFTER READING EVERYTHING

1. Read all 61+ files in this folder plus this brief
2. Identify any conflicts or gaps between the research files and this spec
3. Present Gideon with the interface layout (static HTML preview is fastest — show it in the browser)
4. Get approval on the look
5. Then begin Sprint 1

One question at a time to Gideon. Never stack decisions. He processes sequentially.
