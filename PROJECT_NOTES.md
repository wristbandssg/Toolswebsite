# PROJECT_NOTES.md — Where this project stands

*Read `AI_RULES.md` first, then this file, before doing anything else.*

## ▶️ Resume here

Just finished building 42 new "Investment Calculators" tools (4 sub-batches: Returns,
Growth/Goals/Time Value, Stocks & Dividends, Portfolio/Fees/Inflation), all filed under
Finance Calculators › Investment Calculators (`investment-calculators`, already existed).
6 tools from the user's 48-tool list were skipped as duplicates (investment, CAGR,
dollar-cost averaging, stock profit, dividend — all already in Investment Calculators —
and ROI, already in Business Finance). Code is in this project folder but **not yet
committed or deployed** — the user runs the git push + 4 `db:create-investment-*` seed
scripts themselves (command given in chat when the batch finished).

Likely next step: user deploys the Investment Calculators batch (and the Interest batch,
if not done yet), publishes the new Draft tools in /admin/tools, or gives a new
keyword/tool list for the next batch (per `TOOL_BUILD_WORKFLOW.md`).

## What the project is

An AI-Powered Calculator & Blog Platform — Next.js (App Router) + TypeScript + Tailwind
CSS, Prisma on MongoDB Atlas, deployed on Render. A non-developer-friendly admin
dashboard manages calculator tools, blog posts, pages, site navigation, and SEO from one
place, plus a rule-based (no paid AI API) content-planning assistant.

- GitHub repo: `wristbandssg/Toolswebsite`
- Live site: https://toolswebsite.onrender.com

## What's built (feature → file/folder)

- Admin login (NextAuth, rate-limited) — `src/app/(admin)/admin`
- Calculator Tool Builder (5 templates, server-side formula engine) —
  `src/lib/calc-engine.ts` merges one `calc-engine-<batch>.ts` per topic batch; each is
  seeded into the database by a matching `prisma/create-<batch>-calculators.ts` script
  and a `db:create-<batch>` line in `package.json`
- Blog management, Page builder (2 templates), Header/Footer/Mega Menu builder, SEO
  management, AI Content Planner, Internal Linking suggestions, Content Calendar, Google
  Search Console integration — see `README.md` for the full phase-by-phase list
  (Phases 0–11) and the launch checklist
- Database schema — `prisma/schema.prisma` (User, ToolCategory, Tool, Blog, Page, Menu,
  SeoMeta, AiContentPlan, and more)
- Calculator categories under "Finance Calculators": Loan, Mortgage, Investment,
  Interest, Savings, Retirement, Tax, Credit & Debt, Salary & Income, Business Finance,
  Real Estate, Currency & Exchange — plus a large separate branch of country/state tax
  calculators (US federal + all 50 states, Canada, UK, Australia, India, and others)
- Roughly 400+ individual calculator tools built so far across many topic batches, each
  batch self-contained (its own calc-engine file + its own seed script, no cross-batch
  imports)

## How to run it

1. `npm install`
2. `cp .env.example .env` and fill in a real `DATABASE_URL` (MongoDB Atlas) — never
   commit the real `.env` file
3. `npm run db:push` — syncs the Prisma schema to MongoDB (no `migrate dev` on the Mongo
   provider)
4. `npm run db:seed` — creates an admin user + one sample tool
5. `npm run dev` — site at http://localhost:3000, admin at `/admin/login`
6. After a new batch of tools is built, run the matching `npm run db:create-<batch>`
   script(s) named in the deploy command given in chat when that batch finished

Full production/launch checklist (Render env vars, MongoDB Atlas network access, backup
reminders, security hardening notes) is in `README.md` — don't duplicate it here, just
keep that file in mind.

## Known problems / to-do

- No automated backups on the MongoDB Atlas free tier — export a snapshot periodically
  if the data matters (see `README.md`).
- Render free tier spins down after 15 minutes idle (first request after that is slow),
  and has no shell access — schema pushes/seeds must run from a machine that can reach
  the database.
- Default admin password (`ChangeMe123!`) is public in the seed script — change it before
  or soon after going live.
- *(Add new to-dos here as they come up. Don't delete finished ones — just note in the
  session log below that they're done.)*

## Important decisions (and why)

- Next.js full-stack, no separate PHP backend — chosen for simplicity; would only change
  if hosting requirements force it later.
- MongoDB Atlas + Prisma, hosted on Render (free tier) — no `prisma migrate`, uses
  `db push` instead (a Mongo provider limitation, not a choice).
- "AI" features (content planner, topic suggestions) are rule-based/template-only, not a
  paid AI API call — deliberate, to avoid per-use cost and API key setup; a real AI API
  could be introduced later if actual content generation is needed.
- Every new batch of calculator tools is fully self-contained (own calc-engine file, own
  seed script, no cross-batch imports) so each batch can be built/verified/shipped
  independently without touching earlier ones.
- Site content is English-only in the admin UI and public Tools pages; Bengali is used
  only for blog content (see `AI_RULES.md`).
- Monetization: Google AdSense (approved) + Adsterra ad network.

## Session log

*(Newest at the bottom. Never delete old entries — just add to them.)*

- 2026-09-27: Created `AI_RULES.md` and `PROJECT_NOTES.md` (this file) so any AI/chat can
  pick up the project without re-explaining everything — no app code changed. Also
  finished the "Interest Calculators" category: 31 new tools across 3 sub-batches
  (Core/Compounding, Rate Conversions, Contributions/Withdrawals & Analysis), all
  verified (`tsc`/`lint`/`build` clean, formulas cross-checked against independent
  Python calculations) and committed to the project folder — not yet deployed.
- 2026-09-27: Added `TOOL_BUILD_WORKFLOW.md` (formalizes the keyword-only build
  pipeline: duplicate-check, relevancy-check, category confirmation, sub-batching,
  formula verification, and the full commit/report cycle, with no mid-way check-ins)
  and `SEO_CHECKLIST.md` + `prisma/seo-audit.ts` (a real, runnable script —
  `npm run db:seo-audit` — that checks all published tools/blogs/pages for missing,
  too-long, too-short, or duplicated meta titles/descriptions, plus a couple of
  structured-data/canonical-URL warnings). `tsc`/`lint`/`build` all clean; no other app
  code changed.
- 2026-09-27: Built the "Investment Calculators" batch from the user's 48-tool list: 42
  new tools across 4 self-contained sub-batches — `calc-engine-investment-returns.ts` (11),
  `-planning.ts` (10), `-stocks-dividends.ts` (9), `-portfolio-fees.ts` (12), each with a
  matching `prisma/create-investment-*-calculators.ts` seed script and `db:create-investment-*`
  line in `package.json`. 6 skipped as exact-slug duplicates (listed in Resume here).
  Near-namesake tools deliberately differentiated (see each engine file's header), e.g.
  Stock Cost Basis (FIFO/LIFO/average, no tax) vs the Tax category's Capital Gains Cost
  Basis, Annualized Return (years+months+days) vs CAGR. Formulas cross-checked against an
  independent reference implementation (plain Node.js — Python isn't installed on this PC):
  170 checks, 0 failures; SEO meta lengths/uniqueness checked; `tsc`/`lint`/`build` clean.
  Not yet committed or deployed.
