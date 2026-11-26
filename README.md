# SPONSOR-BOSS: Pre-Festival Sponsorship Cash Command Center & Grounded AI Copilot

**Author:** Himesh Kundal  
**Assignment:** RISA Labs — Growth APM Assignment (**Challenge B: Maximize Sponsorship Cash Collected Before the Festival**)  
**Chosen City:** Bengaluru (Tier-1 Flagship College Festival · 25,000 Verified Student Footfall · 12-Week Pre-Festival Sprint)  
**Deliverables Included in Repository:**
1. **Three-Slide Strategy Deck (PDF):** [`Himesh_Kundal_RISA_Growth_APM_Strategy.pdf`](./Himesh_Kundal_RISA_Growth_APM_Strategy.pdf) (also served inside the app at `/Himesh_Kundal_RISA_Growth_APM_Strategy.pdf`)
2. **Working Product (`SPONSOR-BOSS`):** Full-stack Next.js 16 + MongoDB Atlas + Grounded Gemini Flash Copilot (`src/`)
3. **Comprehensive Documentation (`README.md`):** Forensic audit of `Sponsor Dataset.xlsx`, sourced facts vs. assumptions, funnel math, `CASH-RICE` prioritization, experimentation thresholds, setup/deployment guide, tools used, and known limitations.

---

## 1. Executive Thesis & Why Bengaluru

Traditional college festival sponsorship teams fail Challenge B (*collecting actual cash in the bank BEFORE Day 1*) at **three structural choke points**:
1. **Top-of-Funnel Spam Death:** Student volunteers blast cold emails to generic brand inboxes (`0%` conversion in historical data).
2. **Wrong Budget Pool:** Selling "flex-banner logos" taps corporate *Brand Sponsorship* budgets—which are small, agency-gated, and pay **Net-60 post-festival**.
3. **45-Day ERP Vendor Onboarding Lag:** Even when an enterprise signs an MoU, adding a student society bank account to SAP/Oracle vendor masters takes 4–6 weeks, pushing cash receipt *past* the festival opening.

### Why Bengaluru Is the Optimal Tier-1 City for Pre-Festival Cash
- **Decision-Maker Density & Speed:** Home to **1,450+ funded D2C, UPI/Fintech, Quick-Commerce, Consumer Tech, and AI headquarters** where Founders, CMOs, and VP-Engineering leaders approve ₹2L–₹8L checks in **7–14 days** (unlike Mumbai/Delhi legacy FMCG conglomerates locked behind multi-layer media agencies and 60–90 day credit cycles).
- **High-LTV Campus Cluster:** Dense concentration of premier engineering, management, and design colleges within a 25 km radius gives consumer apps and tech recruiters high-intent customer acquisition & hiring ROI.
- **Category Rivalry Density:** Direct head-to-head Bengaluru rivalries (*Blinkit vs. Zepto*, *Cred vs. Super.money*, *Ather vs. Rapido*, *boAt vs. Noise*) make **1-Per-Vertical Category Lockout Auctions** hyper-effective.

---

## 2. Forensic Audit of Historical Data (`Sponsor Dataset.xlsx`) & Sourced vs. Assumed Distinction

Before modeling 2026 targets, every table in `Sponsor Dataset.xlsx` (and cross-linked campaign metadata in `Attendee Dataset.xlsx`) was audited programmatically.

### 2.1 Sourced Historical Facts (CampusFest 2025: 15 Jan – 20 Apr 2025, Event 12–13 Apr 2025)

| Metric / Finding | Raw Rows | Canonical Deduplicated | Forensic Detail & Strategic Implication |
| :--- | :---: | :---: | :--- |
| **Unique Brands (`Brands`)** | 180 | **180** | Across 6 industries: Food & Bev (37), Consumer Products (36), Mobility (36), Education (35), Media (35), Personal Care (1 — `Beardo A001`). |
| **Contacts (`Sponsor contacts`)** | 270 | **270** | Multiple contacts can belong to a single brand (`brand_id` join key). |
| **Interactions (`Sponsor interactions`)** | 953 | **950** | **3 exact import-retry duplicates removed:** `SI00001`, `SI00019`, `SI00110`. Includes 7 `opt_out` (`do_not_contact`) events—all in `SC01` Cold Email. |
| **Brand Qualification (`Brand qualification`)** | 434 | **433** | **1 exact import-retry duplicate removed:** `BQ0003`. Latest state as of Apr 20: **60 Qualified** (beat revised 55 goal), 63 Dormant, 28 Engaged, 21 Unqualified, 8 Unreviewed. |
| **Opportunities (`Partner opportunities`)** | 58 | **58** | 54 `cash` support type, 4 `in_kind` support type. `Beardo (A001)` has **2 distinct opportunities** (`O001` & `O002`). |
| **Opportunity History (`Opportunity history`)** | 230 | **228** | **2 exact import-retry duplicates removed:** `OH00001`, `OH00015`. Latest state: **24 `partner_confirmed`** (missed revised 28 goal by 4 deals), 8 `negotiating`, 6 `proposal_sent`, 6 `contacted`, 6 `prospecting`, 7 `lost`, 1 `withdrawn`. |
| **Confirmed Partnership Face Value** | — | **₹22,40,000** | **₹20,00,000** across 20 `cash` deals (avg ₹1.00L; range ₹40k–₹2.00L) + **₹2,40,000** across 4 `in_kind` deals. |
| **Verified Bank Cash Collected (2025)** | — | **Unrecorded (`null`)** | Source `Read me` explicitly notes `confirmed_value_inr` is reported face value and **not proof of bank receipt**. |
| **Campaign Marketing Spend / CAC (2025)** | — | **Unrecorded (`null`)** | Unlike `Attendee Dataset.xlsx` (`Daily Marketing`), `Sponsor Dataset.xlsx` records **zero spend/budget data**. |
| **Cross-Dataset `Sponsor activations`** | 3 | **3 (`L001–L003`)** | Links `Beardo -> C03 Creator Partners`, `Mosaic Mobility -> C04 College Partnerships`, `Maple Devices -> C07 Community Groups`. Observational association only—**does not prove causal attendee uplift**. |

### 2.2 The 2025 Channel Performance Smoking Gun

| ID | Campaign Name | Channel | Owner | Brands (BQ) | Qualified (%) | Opps | Confirmed Deals | Win Rate | Cash Face Value | Stranded Open Pipe |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `SC05` | **Creator Network Referrals** | `introduction` | Nisha Rao | 19 | 15 (78.9%) | 9 | **9** (8 cash, 1 barter) | **100.0%** | **₹7,25,000** | ₹0 |
| `SC04` | **Partner Interest Form** | `web_inbound` | Kabir Shah | 17 | 13 (76.5%) | 7 | **7** (6 cash, 1 barter) | **100.0%** | **₹6,35,000** | ₹0 |
| `SC02` | **Warm Partner Introductions** | `introduction` | Riya Kapoor | 8 | 8 (100.0%) | 9 | **8** (6 cash, 2 barter) | **88.9%** | **₹6,40,000** | ₹0 |
| `SC03` | **Brand Leader LinkedIn** | `linkedin` | Riya Kapoor | 28 | 10 (35.7%) | 12 | **0** | **0.0%** | **₹0** | ₹5,30,000 |
| `SC01` | **Brand Discovery Email** | `email` | Kabir Shah | 88 | 7 (8.0%) | 11 | **0** | **0.0%** | **₹0** | ₹4,90,000 |
| `SC06` | **Past Conversation Revival** | `email` | Kabir Shah | 20 | 7 (35.0%) | 10 | **0** | **0.0%** | **₹0** | ₹4,20,000 |

> **Core Insight:** Warm/Inbound channels (`SC02 + SC04 + SC05`) converted **24 of 25 opportunities (96.0%)**, generating **100% of confirmed value**, whereas Cold/Revival channels (`SC01 + SC03 + SC06`) touched **136 brands**, created **33 opportunities**, stranded **₹14.40L** in unclosed stages at festival start, triggered **7 opt-outs**, and closed **₹0**. Furthermore, `Beardo (A001)` suffered uncoordinated multi-rep outreach: Riya Kapoor closed `O001` (₹2.0L) on Mar 8, Nisha Rao pitched `O002` (₹30k, lost Apr 3), and Riya's LinkedIn sequence still messaged a second Beardo contact (`SCON002`) on Mar 17.

### 2.3 Sourced Facts vs. Strategic Model Assumptions

| Parameter | Classification | Value / Basis |
| :--- | :---: | :--- |
| 2025 channel conversion rates, deal counts, & ₹20.0L cash face value | **Sourced Fact** | Directly computed from deduplicated `Sponsor Dataset.xlsx`. |
| Unrecorded 2025 bank cash & unrecorded 2025 campaign spend | **Sourced Boundary** | Enforced in code & Copilot (`[Insufficient Data]` guardrail). |
| Industry pre-fest cash realization without escrow/vendor bridge (~45–55%) | **Market Benchmark** | Standard Indian corporate Net-45/Net-60 post-event sponsorship settlement cycle. |
| 2026 ACV expansion (`₹1.00L` $\rightarrow$ `₹2.00L` Base / `₹2.40L` Stretch) | **Model Assumption** | Driven by shifting from logo stalls to measurable Pre-Fest CampusPass CAC quests (Seg B) & AI/Tech Hiring Pods (Seg A). |
| 5-Day PO-to-Cash via Pre-Empaneled Vendor Billing Bridge (3% fee) | **Operational Assumption** | Invoicing through an agency already in enterprise vendor masters bypasses 30–45 day new-vendor ERP onboarding. |
| Simulated 2026 Mid-Sprint Live Workspace (`live2026Seed.ts`) | **Simulated Data** | Realistic Week-7 (`D-35`, Mar 8, 2026) Bengaluru pipeline persisted in MongoDB Atlas to demonstrate live diagnostics & execution. |

---

## 3. Quantitative Funnel Math & Target Derivation (Slide 1)

$$\text{Pre-Fest Cash Collected} = \text{Prospects} \times \text{Conv \%} \times \text{Proposal \%} \times \text{Win \%} \times \text{Blended Cash ACV} \times \text{Pre-Fest Collection \%}$$

### 3.1 Funnel Comparison: 2025 Baseline vs. 2026 Base & Stretch Targets

| Stage | 2025 Historical | 2026 Realistic Base | 2026 Ambitious Stretch | Calculation Check |
| :--- | :---: | :---: | :---: | :--- |
| **1. Prioritized Prospects** | 180 | **320** | **420** | Out of ~1,450 addressable Bengaluru brands (scored $\ge 70/100$ on Cash-Velocity Rubric) |
| **2. Conversations Held** | 60 (33.3%) | **160** (50.0%) | **231** (55.0%) | $320 \times 50\% = 160$ Base; $420 \times 55\% = 231$ Stretch |
| **3. Proposals Sent** | 46 (76.7%) | **96** (60.0%) | **150** (64.9%) | Cash-only qualification screens out barter/Net-90 prospects early |
| **4. Signed Cash Deals** | 20 cash (+4 barter) | **45 deals** (46.9%) | **58 deals** (38.7%) | $96 \times 46.875\% = 45$; $150 \times 38.67\% = 58$ (0 sales-led barter deals) |
| **5. Blended Cash ACV** | ₹1.00L | **₹2.00L** | **₹2.40L** | Signed Cash Contract Value = **₹90.00L** Base / **₹139.20L** Stretch |
| **6. Pre-Fest Collection %** | Unrecorded | **90.0%** | **94.8%** | Powered by 5-Day Vendor Bridge + *"No Escrow, No CampusPass Drop"* |
| **Net Pre-Fest Bank Cash** | — | **₹81.00 Lakhs** | **₹132.00 Lakhs (₹1.32 Cr)** | $₹90.0\text{L} \times 0.90 = ₹81.0\text{L}$; $₹139.2\text{L} \times 0.9483 = ₹132.0\text{L}$ |

### 3.2 Segment Mix & Capacity Constraint Reconciliation
- **Base Case Signed Mix (45 Deals = ₹90.00L Signed $\rightarrow$ ₹81.00L Pre-Fest Cash):**
  - **Seg A (AI/Fintech Whales):** $5 \times ₹6.00\text{L} = ₹30.00\text{L}$
  - **Seg B (Consumer CAC Apps):** $10 \times ₹3.00\text{L} = ₹30.00\text{L}$
  - **Seg C (Funded D2C Exclusivity):** $15 \times ₹1.40\text{L} = ₹21.00\text{L}$
  - **Seg D (Self-Serve D2C/EdTech Booths):** $15 \times ₹0.60\text{L} = ₹9.00\text{L}$
- **Stretch Case Signed Mix (58 Deals = ₹139.20L Signed $\rightarrow$ ₹132.00L Pre-Fest Cash):**
  - **Seg A:** $7 \times ₹7.20\text{L} = ₹50.40\text{L}$ | **Seg B:** $13 \times ₹3.40\text{L} = ₹44.20\text{L}$ | **Seg C:** $18 \times ₹1.80\text{L} = ₹32.40\text{L}$ | **Seg D:** $20 \times ₹0.61\text{L} = ₹12.20\text{L}$
- **Physical Capacity Check:** Main campus quad supports **38 physical stalls max**. Stretch reaches 58 total partners without exceeding physical space because **20 partners** (Seg A API/Hiring Whales + Digital-only CampusPass quests) require **zero quad booth footprint**.
- **Acquisition Cost & ROI:** Total budget = **₹3.50 Lakhs** ($\implies$ Base CAC = **₹7,778 / signed cash partner**, **23.1x** Cash-to-Spend ROI; Stretch = **37.7x** ROI).

---

## 4. `CASH-RICE` Prioritization Framework & Five Ranked Bets (Slide 2)

Standard RICE ignores **whether cash clears before festival Day 1**. We rank initiatives using **`CASH-RICE`**:

$$\text{CASH-RICE Score} = \text{Normalized}_{100}\left(\frac{\text{Cash Impact (1–10)} \times \text{Pre-Fest Velocity (1–10)} \times \text{Confidence (0–1)}}{\text{Effort (Rep-Weeks + ₹ Cost Weight)}}\right)$$

| Rank & Call | Strategy | Cash Impact | Pre-Fest Velocity | Conf. | Effort | Score | Budget | Incremental Cash (Base / Stretch) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **#1 Double Down** | **CampusPass Pre-Fest CAC Escrow + Category Lockouts** | 10.0 | 9.5 | 0.85 | 3.5 | **92** | ₹1.10L | **+₹24.0L / +₹42.0L** |
| **#2 Double Down** | **Alumni CXO & Creator 2-Tap Warm-Graph Syndicate** | 8.5 | 9.0 | 0.92 | 2.5 | **89** | ₹0.65L | **+₹16.0L / +₹28.0L** |
| **#3 Core Enabler** | **Pre-Empaneled Vendor Billing Bridge (5d Rail)** | 8.0 | 10.0 | 0.88 | 2.0 | **86** | ₹0.95L* | **+₹11.0L / +₹19.0L** |
| **#4 Selective Bet** | **Bengaluru AI & Fintech "Build & Hire Arena" Whales** | 9.0 | 6.5 | 0.72 | 3.0 | **74** | ₹0.55L | **+₹9.0L / +₹19.0L** |
| **#5 Automated** | **Zero-Rep Self-Serve D2C Sampling & Stall Checkout** | 4.5 | 9.5 | 0.90 | 1.0 | **68** | ₹0.25L | **+₹3.0L / +₹6.0L** |
| *Baseline* | *Inbound Partner Form & Returning 2025 Renewals* | 7.5 | 8.5 | 0.95 | 1.5 | *84* | *(in #3)* | *₹18.0L / ₹18.0L* |
| **REJECTED** | **Cold Bulk Discovery Email (`SC01`) & Blind Revival** | 1.5 | 2.0 | 0.15 | 4.0 | **11** | ₹0 (Killed) | **₹0** |

*\*Note: In the live Week-7 workspace (`live2026Seed.ts`), ₹0.75L is allocated to `B03`, ₹0.08L to `B00` Inbound hygiene, and ₹0.12L was spent on the killed Wk 1–2 Cold Email control test (`DEP01`), summing to the exact **₹3.50L** total budget cap ($1.10 + 0.65 + 0.75 + 0.55 + 0.25 + 0.08 + 0.12 = ₹3.50\text{L}$).*

**Reconciliation Bridge:** `₹18.0L Baseline + ₹24.0L (#1) + ₹16.0L (#2) + ₹11.0L (#3) + ₹9.0L (#4) + ₹3.0L (#5) = ₹81.0L Base Case` (and `₹18.0L + ₹42.0L + ₹28.0L + ₹19.0L + ₹19.0L + ₹6.0L = ₹132.0L Stretch Target`).

---

## 5. Product Architecture & Workflow Walkthrough (`SPONSOR-BOSS`)

### Tech Stack
- **Frontend & API:** Next.js 16.4.6 (App Router, TypeScript, Server Route Handlers), Tailwind CSS, Recharts, Lucide Icons
- **Database:** MongoDB Atlas (`risa_sponsor_boss.workspaces`) for persistent real-time edits across sessions (with automatic in-memory fallback if run offline without `MONGODB_URI`)
- **Embedded AI Copilot:** Google Gemini API (`gemini-2.5-flash` / `gemini-2.5-flash-lite` via REST JSON-schema mode) grounded in deterministic server-computed analytics (`src/lib/analytics.ts`)

### Complete Demonstrated Workflow (Insight $\rightarrow$ Diagnosis $\rightarrow$ Confirmed Action $\rightarrow$ Updated Analytics)
1. **Measure & Diagnose (`1. Cash Command` Tab):** At `D-35` (Mar 8, 2026), **₹47.30L** is cleared in bank, but the **Live Bottleneck Radar** flags **₹13.50L in Critical Post-Festival ERP Risk** (`Razorpay ₹7.50L` & `Postman ₹6.00L` are signed/invoiced on 45-day Direct ERP with expected payout Apr 16–18, *after* the Apr 12 festival!) and **2 Stalled Whale Proposals** (`Sarvam AI` 13d, `Groww` 12d > 10-day threshold).
2. **Ask the Embedded AI Copilot:** Click the **`Diagnose + Execute`** prompt chip (or ask a custom question + follow-ups). The Copilot cites exact MongoDB records with `[Live 2026]` and `[Calculated]` badges and renders **Interactive Action Confirmation Cards** (e.g., *Switch Razorpay D26-02 to 5-Day Vendor Bridge*, *Unbundle Sarvam AI Proposal*, or *Create P0 Task*).
3. **Confirm & Execute:** Click **`Confirm & Apply`** on an action card (or edit any deal stage, billing rail, campaign budget, or constraint directly in Tabs 1–3). MongoDB updates immediately, recalculating **Cleared Cash, Projected Pre-Fest Cash, At-Risk ERP Cash, and ROI** across all charts and subsequent Copilot turns.
4. **Torture-Test Epistemic Guardrails (`4. 2025 Source Audit` Tab + Copilot):**
   - Slide the **IST Point-in-Time Date Selector** (`2025-01-15` to `2025-04-20`) — earlier snapshots never leak later responses or confirmations, and target goals switch automatically on `2025-03-15` (`40/20` Launch Plan $\rightarrow$ `55/28` Revised Plan).
   - Click **`Uncertainty Trap #1`** (*"How much cash hit our bank account in 2025, and what was SC01's CAC?"*) or **`Causality Trap #2`** (*"How many incremental attendees did Beardo's activation generate?"*) to verify that the Copilot refuses unsupported claims and cites exact dataset boundaries.

---

## 6. Local Setup & Vercel Deployment Instructions

### Prerequisites
- Node.js `>= 20.9.0` and `npm`
- A Google AI Studio Gemini API Key (`GEMINI_API_KEY`)
- A MongoDB Atlas connection URI (`MONGODB_URI`) — *optional locally (falls back to in-memory store if omitted), recommended for Vercel persistence*

### Local Development
```bash
git clone https://github.com/Himesh-Kundal/RISA.git
cd RISA
npm install
cp .env.example .env.local
# Edit .env.local and add GEMINI_API_KEY and MONGODB_URI
npm run dev
```
Open `http://localhost:3000`.

### Deploying on Vercel
1. Import `https://github.com/Himesh-Kundal/RISA` into [Vercel](https://vercel.com/new).
2. In **Project Settings $\rightarrow$ Environment Variables**, add:
   - `GEMINI_API_KEY` = `<your_google_ai_studio_key>`
   - `MONGODB_URI` = `<your_mongodb_atlas_connection_string>`
   - `GEMINI_MODEL` = `gemini-2.5-flash` *(optional; automatically falls back to `gemini-2.5-flash-lite` on quota pressure)*
3. Click **Deploy** (zero custom build flags needed).

---

## 7. Tools Used, Attribution & Known Limitations

### Tools & Libraries Disclosure
- **Framework & UI:** Open-source `next@16.4.6`, `react@18.3.1`, `tailwindcss@3.4`, `recharts@2.15`, `lucide-react` (built from scratch for this assignment; no pre-built dashboard template reused).
- **Database:** MongoDB Atlas Free Tier (`M0` cluster) via official `mongodb` Node driver.
- **LLM / AI Assistant:** Google AI Studio Gemini API (`gemini-2.5-flash` / `gemini-2.5-flash-lite`) for the embedded Copilot, plus AI-assisted pair programming (Antigravity / Gemini) for code scaffolding, XML-to-JSON extraction of `Sponsor Dataset.xlsx`, and HTML-to-PDF rendering via headless Chromium. All dataset queries, deduplication rules, funnel math, and threshold logic were deterministically coded and verified against raw Excel sheets.

### Known Limitations
1. **Simulated 2026 Execution Pipeline:** While the 2025 audit mode uses the exact unmodified source records from `Sponsor Dataset.xlsx`, the 2026 Bengaluru deals (`D26-01` to `D26-26`) are realistic simulated records illustrating a Week-7 (`D-35`) sprint. Real brand names (*Cred, Razorpay, Blinkit, Zepto, boAt*) are used strictly as illustrative Tier-1 Bengaluru personas, not claims of real commercial agreements.
2. **Single Shared Demo Workspace:** To make reviewer testing frictionless without login walls, mutations persist to a shared `campusfest_2026_main` document in MongoDB Atlas. A **`Reset Demo`** button is provided in the top bar so any reviewer can restore the clean initial state in one click.
3. **No Live Payment Gateway Webhook:** Billing rails (`vendor_bridge_5d`, `razorpay_instant`, `direct_erp_45d`) model real settlement mechanics and update ledger balances persistently, without charging real bank cards.
