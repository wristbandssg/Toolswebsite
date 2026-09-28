# PROJECT_NOTES.md — Where this project stands

*Read `AI_RULES.md` first, then this file, before doing anything else.*

## ▶️ Resume here

Just built the **Retirement Calculators** batch (28 Sep 2026) from the user's 76-tool list: 8
skipped as exact-slug duplicates (retirement, 401k, pension, social-security, retirement-withdrawal,
ira, roth-ira calculators, plus retirement-savings-goal-calculator from the Savings batch — which
the user asked to MOVE into Retirement Calculators; done via CATEGORY_OVERRIDES in
create-savings-goals-calculators.ts and TOOL_MOVES in organize-tool-categories.ts). 68 new tools in
7 self-contained sub-batches under Finance Calculators > Retirement Calculators:
planning (10), income (10), tax-ira (9), workplace-plans (9), pension-social-security (12),
fire-timing (11), portfolio (7). Uses official **2026** figures, researched from IRS/SSA sources
(see each calc-engine-retirement-*.ts header): tax brackets + standard deduction (Rev. Proc.
2025-32), $6,000 senior deduction (2025–2028), 401(k) $24,500 / catch-up $8,000 / 60–63 $11,250,
IRA $7,500 + $1,100, SIMPLE $17,000, 415(c) $72,000, IRA/Roth phase-outs, SS bend points
$1,286/$7,749, earnings test $24,480/$65,160, taxable max $184,500, RMD Uniform Lifetime + Single
Life tables (Treas. Reg. §1.401(a)(9)-9). **These must be updated each year** (new IRS/SSA figures
come out every Oct/Nov). Pension Commutation is UK-style in GBP.

Before that (same day): built the **Savings Calculators** batch (28 Sep 2026) from the user's 60-tool list: 3 skipped
as exact-slug duplicates (savings-calculator, savings-goal-calculator, emergency-fund-calculator),
57 new tools across 6 self-contained sub-batches, all filed under Finance Calculators > Savings
Calculators (`savings-calculators`, already existed):

- `calc-engine-savings-core.ts` (9) — interest, monthly savings, future value, rising deposits,
  savings rate/percentage, balance with fees, deposit needed today, rate needed.
- `-schedules.ts` (11) — Indian RD (INR), UK regular saver (GBP), weekly/52-week challenge,
  biweekly, annual savings from cutting a cost, daily, two-phase contributions, with/without
  monthly deposits, annual deposits start vs end, lump sum after tax, lump sum vs monthly.
- `-accounts.ts` (9) — compounding side by side, interest paid out, APY earned (Reg DD formula),
  APY→APR in dollars, account fees vs minimum balance, high-yield vs traditional, tiered money
  market, CD early-withdrawal penalty (slug `cd-savings-calculator`), two-account comparison.
- `-withdrawals-emergency.ts` (11) — max withdrawal, inflation-rising drawdown, yearly
  withdrawals, inflation on idle cash, inflation-adjusted goal, real after-tax growth,
  itemized emergency fund, fund months, fund contribution, rainy day fund, sinking fund.
- `-goals.ts` (11) — vacation, travel habit, US home down payment (rising prices), UK house
  deposit with Lifetime ISA bonus (GBP), car save vs finance, wedding, education, college (aid +
  % covered), retirement nest egg, short-term and long-term goals.
- `-goal-planning.ts` (6) — contribution at any frequency, time to target, target-date check,
  progress check, split budget across 3 goals, 25/50/75/100% milestones.

Each has a matching `prisma/create-savings-*-calculators.ts` + `db:create-savings-*-calculators`
script. New tools are created as Draft. Near-namesakes (inside the list and against existing
Interest/Investment/Retirement tools) are differentiated — see each engine file's header.

Earlier (27 Sep): `prisma/organize-tool-categories.ts` (`npm run db:organize-categories`) was
added to put every tool into the final category structure — **Finance Calculators** → 12
sub-categories, **Tax Calculators** keeps its 12 country/state categories as a third level, empty
categories are deleted. 53 Loan tools are in the live database but still Draft (28 Sep check).

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
- US state tax category ("Tax & Paycheck Calculators") holds ~740 tools and the category page
  has no pagination or search, so it renders every card at once — consider adding
  "load more"/search. — DONE 27 Sep 2026: "Load More" added (48 at a time); search not added.
- The sample percentage-calculator has Bengali description/instructions/FAQ, which breaks
  the English-only rule for public tool pages (AI_RULES.md) — rewrite in English. — DONE
  27 Sep 2026 in seed.ts (takes effect on the live site once `npm run db:seed` is re-run).
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
- 2026-09-27: Built the "Loan Calculators" batch from the user's 54-tool list: 53 new tools
  across 5 self-contained sub-batches — `calc-engine-loan-core.ts` (11), `-solve.ts` (10),
  `-payoff-refinance.ts` (11), `-types.ts` (10), `-business-student.ts` (11), each with a
  matching `prisma/create-loan-*-calculators.ts` seed script and `db:create-loan-*` line in
  `package.json`. 1 skipped as a duplicate (business-loan-calculator). This list had the
  heaviest near-duplicate risk so far (about a dozen tools share the amortizing payment
  formula), so each tool models something specific — e.g. EMI in rupees, Auto Loan with
  trade-in and sales tax, Student Loan with in-school interest and grace period, Business
  Loan APR as factor rate to APR, Loan Prepayment comparing "reduce term" vs "reduce
  payment" (see each engine file's header). The two EMI tools output INR (`currency:
  "INR"`). The widget formats plain numbers with thousands separators, so no tool outputs
  a calendar year. Formulas cross-checked against an independent month-by-month
  simulation plus Newton-method solver in Node.js: 234 checks, 0 failures; content check
  confirmed SEO lengths and uniqueness, that every input affects the result, and that
  example numbers match the default inputs; `tsc`/`lint`/`build` clean. Not yet committed
  or deployed.
- 2026-09-27: Category reorganization per user request. Added
  `prisma/organize-tool-categories.ts` + `db:organize-categories` script (report mode by
  default, `--apply` with automatic backup). Updated `seed.ts` (percentage-calculator now
  seeds into "Math Calculators") and `create-finance-business-calculators.ts` (per-tool
  category override puts business-loan-calculator in Loan Calculators) so re-running seeds
  doesn't undo the reorganization. Added `/prisma/backups/` to .gitignore. No app/page code
  changed; tool URLs don't include the category, so no tool link changes. `tsc`/`lint`/
  `build` clean. Not yet run on the live database.
- 2026-09-27: Three follow-ups to the category reorganization, all requested by the user:
  (1) "Load More" on `/tools/category/[slug]` — shows 48 tools, then a crawlable
  `?show=<n>` link adds 48 more (canonical stays the bare category URL); the page now
  fetches only the fields its cards need and hides sub-category cards with 0 published
  tools. (2) Percentage Calculator rewritten in English in `seed.ts` (description,
  instructions, examples, new assumptions, 2 FAQs, meta title/description); its upsert now
  applies that copy on update too, but never changes status or category. (3) Added 4
  empty Finance sub-categories (Budget & Personal Finance, Insurance, Auto & Car, Crypto)
  and 3 empty main categories (Health & Fitness, Date & Time, Unit Conversion) to
  `organize-tool-categories.ts`; re-tested against a fake database. `tsc`/`lint`/`build`
  clean. Couldn't test the category page against real data (no database access here).
- 2026-09-27: Per the user: (1) the admin "Choose a category" dropdown in the tool form and
  the category filter on the tools list now show each main category as an <optgroup>
  heading with its sub-categories (and country folders, indented with "›") inside —
  `groupCategoryTree` replaced the old `flattenCategoryTree` helper, which was removed.
  (2) Dropped the 7 extra empty categories from `organize-tool-categories.ts`. (3) That
  script now deletes EVERY category with no tools in its subtree (drafts count), not just
  unknown ones, and never creates a category empty (only when a tool is moved into it).
  Re-tested against a fake database (empty extras, an empty standard sub-category and an
  empty country folder all deleted; no tool loses its category; re-run is a no-op).
  `tsc`/`lint`/`build` clean. Still not run on the live database.
- 2026-09-28: Per the user, /admin/tools/categories now collapses main categories too:
  Finance Calculators (and every other main category) shows its sub-categories only after
  clicking its arrow, the same way Tax Calculators opens its 12 country categories.
  Creating a sub-category opens its whole parent chain so the new row is visible.
  `tsc`/`lint` clean.
- 2026-09-28: Built the "Savings Calculators" batch from the user's 60-tool list: 57 new tools
  across 6 sub-batches (core 9, schedules 11, accounts 9, withdrawals-emergency 11, goals 11,
  goal-planning 6), 3 skipped as duplicates. Currency-specific tools: Recurring Savings (Indian
  RD, INR, quarterly compounding), Regular Savings (UK regular saver, GBP, simple interest per
  deposit), House Deposit (GBP, Lifetime ISA: 25% bonus on up to £4,000/yr, £450,000 price cap).
  Verified with an independent brute-force Node.js check (195 checks, 0 failures — 3 initial
  misses were display rounding and confirmed exact unrounded), a content check (SEO lengths and
  uniqueness vs every other seed script, result keys exist, every input changes the result,
  form defaults = engine defaults, every example figure matches a default output) and a stress
  test with zero/max/random inputs (no NaN/Infinity). `tsc`/`lint`/`build` clean. Also on
  28 Sep: admin category page made main categories collapsible (committed separately).
- 2026-09-28: Built the "Retirement Calculators" batch from the user's 76-tool list: 68 new tools
  across 7 sub-batches, 8 skipped as duplicates, and retirement-savings-goal-calculator moved from
  Savings to Retirement (user request). Researched 2026 IRS/SSA figures online first (IRS news
  releases, Notice 2025-67, Rev. Proc. 2025-32, SSA 2026 COLA figures, eCFR RMD tables). Verified
  with an independent check (179 checks, 0 failures — incl. hand-worked 2026 tax returns and
  published SSA percentages such as 72.5%/128% for 1957 births and 32.5% spousal at 62), a content
  check, and a zero/max/random stress test. `tsc`/`lint`/`build` clean. Also added the savings
  and retirement batches to the live database as Draft (57 + 68 tools).
