# PROJECT_NOTES.md — Where this project stands

*Read `AI_RULES.md` first, then this file, before doing anything else.*

## ▶️ Resume here

Just built the **Crypto Calculators expansion** (6 Oct 2026) from the user's 116-keyword crypto list: 16 already built
(crypto-capital-gains, crypto-to-fiat-converter, dollar-cost-averaging, portfolio-rebalancing, stock-cost-basis incl.
tax lot method, stock-average-price, stock-break-even, sharpe-ratio, forex-drawdown, covered-call-options,
remittance-fee, gifted-asset- and inherited-asset-capital-gains, ira-growth, loyalty-points-value-estimator) and 40
merged (see calc-engine-crypto-trading.ts and each engine header — e.g. Bitcoin/Ethereum/Solana/XRP/BNB/Cardano/
Dogecoin/Litecoin/Polkadot/Avalanche/Polygon/Chainlink P&L + ROI -> crypto-profit-and-loss with a coin dropdown;
user was offered separate BTC/ETH pages and said start). 60 new tools in 8 batches (`crypto-*`). **Crypto
Calculators is now split into 5 sub-categories** (user: "notun kore sub category kore start koro"): Currency Exchange &
Forex (the 87 existing currency/forex/metal tools), Crypto Trading & Profit (16 + the 2 crypto converters), Crypto
Fees, Payments & Loans (11), Crypto Staking, DeFi & Mining (14), Crypto Market, Tax & Security (19).
organize-tool-categories.ts has CRYPTO_SUBCATEGORIES + CRYPTO_TOOL_GROUPS (89 moves); the 10 old currency scripts
(create-currency-* and create-finance-currency) now file into Currency Exchange & Forex (crypto-metals sends the 2
converters to Crypto Trading & Profit) and create the sub-category if missing. 2026 facts: crypto still outside
the wash sale rule (crypto ETFs are not), Bitcoin subsidy 3.125 BTC (next halving ~2028), 0.5%-of-AGI charitable
floor for itemizers. Dry run on the 2 Oct backup: 171 moves (incl. the 89 crypto/currency), parent left with 0
direct tools, rerun 0. User committed the Car round as cdc0aa9. This deploy: commit, push, the 8
`db:create-crypto-*` scripts, then `npm run db:organize-categories -- --apply` (moves the 89 tools), Render Manual Deploy.

Before that: Just built the **Car & Vehicle Cost Calculators expansion** (6 Oct 2026) from the user's 131-keyword car list: 5
already built (Rideshare + Food Delivery Driver Earnings = gig-income; Extended Car Warranty =
extended-auto-warranty-vs-insurance; Daily Commute Cost = commuter-vs-remote-cost-comparison; Balloon Payment Car
Finance = balloon-loan) and 37 merged (see calc-engine-car-buying.ts and each engine header — e.g. Truck/SUV/Minivan/
Luxury/Sports/Compact/Hybrid/College Student TCO -> car-total-cost-of-ownership vehicle-type dropdown). 88 new tools
in 9 batches (`car-*`) plus car-insurance-discount added to ins-auto-specialty (Insurance > Auto & Vehicle).
**New Finance sub-category "Car & Vehicle Cost Calculators"** (car-vehicle-cost-calculators) with 5 sub-categories:
Car Buying & Selling (16), Car Lease, Rental & Transport (14), Car Ownership, Fuel & EV Cost (22), Car Maintenance,
Repair & Upgrade (28), Vehicle Business Use & Income (8). The create-car-* scripts create the parent and their
sub-category on first run (head-car/tail-car template); organize-tool-categories.ts lists it in
FINANCE_SUBCATEGORIES and SPLITS (no moves). 2026 facts used: IRS mileage 72.5¢ Jan–Jun, 76¢ Jul–Dec (mid-year
increase); 280F first-year cap $20,300 with bonus / $12,300 without; heavy-SUV §179 cap $32,000, 100% bonus;
federal EV credit ended for vehicles acquired after 30 Sep 2025; 30C charger credit ended 30 Jun 2026; 25D solar
credit ended after 31 Dec 2025; UK EV BIK 4% (2026/27), Class 1A 15%; ATO novated-lease minimum residuals. User committed the Insurance round as
9250a3d. This deploy: commit, push, the 9 `db:create-car-*` scripts plus `db:create-ins-auto-specialty-calculators`
(adds car-insurance-discount), Render Manual Deploy (organize --apply optional; nothing to move).

Before that: Just built the **Insurance Calculators expansion** (5 Oct 2026) from the user's 119-keyword list: 1 already built
(Home Insurance Premium = homeowners-insurance-calculator) and 45 merged (see calc-engine-ins-life-core.ts and each
engine header — e.g. Jewelry/Fine Art/Collectibles/Instrument/Camera -> jewelry-insurance; Trip Cancellation/Cruise/
Adventure/International Student -> travel-insurance; Multi-Car -> bundle discount; Grace Period -> lapse). 73 new tools
in 11 batches (`ins-*`). **New Finance sub-category "Insurance Calculators"** (insurance-calculators) with 5
sub-categories: Life (12), Health (14), Auto & Vehicle (15), Home & Property (19 + homeowners moved from Real
Estate), Business & Specialty (13). The create-ins-* scripts create Insurance Calculators and their sub-category on
first run (head-insurance/tail-insurance template); create-realestate-homebuying now files homeowners-insurance into
Home & Property; organize-tool-categories.ts lists Insurance in FINANCE_SUBCATEGORIES, SPLITS and TOOL_MOVES (1 move).
Premium tools take the user's quote/rate and apply documented factors. 2026 facts used: ACA applicable % 2.10–9.96%
with the 400% FPL cliff, FPL $15,650 + $5,500/person; COBRA 102%; Medicare Part B $202.90, deductible $283; estate
exemption $15M; NFIP $250k/$100k; crop subsidy 67%→38% (50–85% coverage, basic/optional units). User committed Budget
as f0debf2. This deploy: commit, push, the 11 `db:create-ins-*` scripts, `npm run db:organize-categories -- --apply`
(moves homeowners-insurance-calculator), Render Manual Deploy.

Before that: Just built the **Budget Calculators expansion** (5 Oct 2026) from the user's 147-keyword list: 15 already built
(Home Maintenance 1% = property-maintenance-cost; Home Renovation = renovation-cost; Budget Variance + Quarterly Review =
budget-variance; Rent-to-Income; Debt Payment % = debt-to-income-ratio; Savings % = savings-rate; Side Hustle =
freelance-income; Freelance Tax Set-Aside = self-employment-tax-estimator; 6 sinking funds = sinking-fund) and 48 merged
(see calc-engine-budget-methods.ts and each engine header — e.g. all "% of budget" categories -> budget-percentage;
70/20/10, 80/20, 60% -> 50/30/20). 84 new tools in 12 batches (`budget-*`). **New Finance sub-category "Budget
Calculators"** (budget-calculators) with 5 sub-categories: Budgeting Methods & Planning, Household & Family Expense,
Life Events & Travel Budget, Money-Saving & Spending, Net Worth & Cost of Living. The create-budget-* scripts create
Budget Calculators and its sub-category on first run (head-budget/tail-budget template); organize-tool-categories.ts
lists Budget in FINANCE_SUBCATEGORIES and SPLITS (no tool moves). 2026 facts used: dependent care FSA $7,500; 529 K-12
$20,000/yr; charitable deduction $1,000/$2,000 for non-itemizers and 0.5% AGI floor for itemizers; GSA per diem
$110/$68; SS COLA 2.8%. User committed the Investment round as 3cbe579. This deploy: commit, push, the 12
`db:create-budget-*` scripts, Render Manual Deploy (organize --apply optional; nothing to move).

Before that: Just built the **Investment Calculators expansion** (5 Oct 2026) from the user's 69-keyword list: 16 already built
(Bond/Treasury/Corporate Bond = bond tools; Real Estate Investment; Forex; DRIP; Money Market Fund; Large/Mid/Small-Cap,
Blue Chip, Fractional Share = stock-investment; Penny = stock-profit; Robo-Advisor = investment-fee-impact; DSPP = DCA;
Balanced Fund = portfolio-expected-return) and 12 merged (Index -> ETF; Sector/ESG/Infrastructure -> Mutual Fund;
Silver -> Gold; Commodity -> Futures; Warrant -> Options; Puttable -> Callable; Angel -> VC; Wine -> Art; Inverse ->
Leveraged ETF; Emerging -> International). 41 new tools in 9 batches. **Investment Calculators is now split into 5
sub-categories** (user approved): Investment Returns & Planning, Stock & Options, Bond & Fixed Income, Fund & ETF,
Alternative Investment. organize-tool-categories.ts (INVESTMENT_TOOL_GROUPS in SPLITS) moves the 56 older tools; the
6 older investment create scripts now file into the sub-categories. Annuity Investment -> Retirement Calculators.
Dry run on the 2 Oct backup: 81 moves (32 mortgage + 49 investment), parents left with 0 direct tools, rerun 0.
The previous rounds were committed by the user as 216ea26 (403 tools). This deploy: commit, push, the 9 new
`db:create-*` scripts (investment-* and retirement-annuity), then `npm run db:organize-categories -- --apply`
(moves the old investment tools), Render Manual Deploy.

Before that: Just built the **Interest Calculators expansion** (5 Oct 2026) from the user's 67-keyword list: 13 already built
(Savings Account, CD, Money Market, Credit Card, High-Yield Savings, Simple/Compound Interest Savings, Real Interest
Rate, Interest Coverage Ratio, Jumbo CD = cd-calculator, Installment Plan, Post-Dated = daily-interest, Christmas
Club = weekly-savings) and 8 merged (Promotional + Store Card -> Deferred Interest; Prime + SOFR -> Variable Rate;
Floor -> Collar; Savings Bond -> Series EE; No-Penalty CD -> CD Early Withdrawal; Cooperative Society -> Fixed
Deposit). 46 new tools in 9 batches, no new categories: `interest-methods` (9) + `interest-rate-tools` (9) ->
Interest; `savings-cd-types` (6), `savings-india-schemes` (7, INR), `savings-tax-advantaged` (3: HSA USD, Cash
ISA GBP, TFSA CAD) -> Savings; `investment-bonds` (7) -> Investment; `loan-bnpl-layaway` (3) -> Loan > Short-Term;
`retirement-rrsp` (1, CAD) -> Retirement; `salary-gratuity` (1, INR) -> Salary & Income. Facts used: HSA 2026
$4,400/$8,750 +$1,000; TFSA 2026 $7,000 ($109,000 cumulative); RRSP 2026 $33,810; ISA £20,000 (cash ISA £12,000 for
under-65s announced from Apr 2027); gift/other rates are inputs. Savings Calculators now ~78 tools, still flat
(user can ask for a 5-way split). Example placeholders now also support {r:} ₹, {g:} £, {c:} C$.
Deploy now covers everything since 509994b: commit, push, all 49 `db:create-*` scripts, then
`npm run db:organize-categories -- --apply`, Render Manual Deploy.

Before that: Just built the **Mortgage Calculators expansion** (5 Oct 2026) from the user's 59-keyword list: 17 already built
(5/1, 7/1, 10/1, Interest-Only ARM = ARM / interest-only-mortgage; Non-Conforming, Jumbo ARM, Super Jumbo =
jumbo-mortgage; Construction-to-Permanent; Bridge; Investment Property; Rate-and-Term + Conventional Streamline =
mortgage-refinance; MI Removal = PMI calculator; HOA Fee Impact; Pre-Approval = mortgage-affordability; State HFA =
DPA tools; First-Generation = first-time-home-buyer) and 5 merged (Portfolio + No-Doc -> Non-QM, HomeStyle -> FHA
203k, Home Possible -> HomeReady, Split MI -> Lender-Paid MI). 37 new tools, one per keyword, in 5 batches.
**Mortgage Calculators is now split into 5 sub-categories** (user approved): Mortgage Payment & Type, Refinance &
Home Equity, Home Buyer Program, Property & Construction Mortgage, Mortgage Cost & Insurance.
organize-tool-categories.ts (SPLITS + MORTGAGE_TOOL_GROUPS) moves the 67 older mortgage tools; the 7 older
create-mortgage-* scripts now file into the sub-categories and create a missing one. Dry run on the 2 Oct backup:
32 moves, mortgage-calculators left with 0 direct tools, second run 0 changes.
Deploy now covers Loan expansions 2–6 + this: commit, push, all 40 `db:create-*` scripts, then
`npm run db:organize-categories -- --apply`, Render Manual Deploy.

Before that: Just built **Loan Calculators expansion 6** (5 Oct 2026) from the user's 70-keyword list: 63 already built
(Term Loan = business-loan-*, Unsecured Personal = personal-loan-*), none merged. 7 new Student Loan tools in
`loan-student-federal`, filed under Loan > General Loan Calculators next to the existing student-loan-* tools
(Loan already has its 5 sub-categories): graduate, Parent PLUS, private, federal (subsidized vs unsubsidized),
forgiveness (PSLF/IBR/RAP), consolidation (weighted rate rounded up to 1/8%), income-driven repayment.
Rules from the July 2025 law: Grad PLUS closed and Parent PLUS capped at $20,000/yr from 1 Jul 2026; RAP
1–10% of AGI, -$50/dependent, $10 minimum; IDR forgiveness taxable from 2026. The poverty guideline input
defaults to the 2025 HHS figure ($15,650) — update it when asked.
Expansions 2–5 are STILL uncommitted (HEAD 509994b), so the deploy covers all five: `git commit -F
.git/NEXT_COMMIT_MSG.txt`, push, all 35 `db:create-*` scripts, Render Manual Deploy, then publishing on request.

Before that: built **Loan Calculators expansion 5** (4 Oct 2026) from the user's 150-keyword list: 25 already built
under another name (Term Loan x9 = business-loan-*, Revolving Credit x7 = line-of-credit-*, 7 Unsecured
Personal Loan tools = personal-loan-*/debt-consolidation, Secured Comparison = secured-vs-unsecured-loan,
Co-Signer Release = cosigned-loan-payoff) and 24 merged (Prequalification/Early Payoff/Consolidation,
No-Credit-Check -> Bad Credit, Same-Day -> Emergency, Christmas -> Holiday, Co-Signer Release Payment/Cost).
The other Unsecured Personal Loan tools were built as personal-loan-* (stronger keyword, same intent).
101 new tools in 10 sub-batches, no new categories:
- Loan > General: `loan-startup-business` (11), `loan-trade-po-term` (10: trade credit 4, PO financing 4,
  term loan eligibility + total cost), `loan-asset-based-bridge` (14: ABL 7, bridge business loan 7)
- Loan > Personal: `loan-personal-core` (6 personal-loan-*), `loan-secured-personal` (10), `loan-bail-holiday` (8)
- Loan > Short-Term & High-Cost: `loan-bad-credit-emergency` (14)
- Loan > Home Improvement: `loan-green-energy` (7; efficiency upgrades — 25C/25D ended after 2025)
- Mortgage: `mortgage-down-payment-assistance` (7); Credit & Debt: `credit-debt-settlement-transfer` (14)
Expansions 2–4 were STILL uncommitted at that point (HEAD 509994b; the user's earlier commit attempts didn't go through),
so the deploy covers all four: `git commit -F .git/NEXT_COMMIT_MSG.txt`, push, all 34 `db:create-*`
scripts, Render Manual Deploy, then publishing on request.

Before that: built **Loan Calculators expansion 4** (3 Oct 2026) from the user's 43-keyword list: none already built,
none merged (each "Cost" tool answers a different question from its main calculator). 43 new tools in 5
self-contained sub-batches, no new categories:
- Loan > Auto & Vehicle Loan Calculators: `loan-powersports` (12: golf cart, ATV, snowmobile)
- Loan > Personal Loan Calculators: `loan-instrument-legal` (8: musical instrument, legal fee incl.
  pre-settlement funding), `loan-cosmetic-fertility` (8), `loan-adoption-tax-debt` (11; 2026 adoption
  credit $17,670 / $5,120 refundable; IRS 7% interest, 0.25%/0.5% failure-to-pay, $50,000 online plan limit)
- Loan > General Loan Calculators: `loan-medical-equipment` (4; practice equipment, Section 179 vs lease)
Expansions 2 and 3 (below) were staged but still NOT committed (HEAD is still 509994b), so the deploy block
covers all three: git push + all 24 `db:create-*` scripts + Render Manual Deploy, then publishing on request.

Before that: built **Loan Calculators expansion 3** (3 Oct 2026) from the user's 106-keyword business/vehicle loan
list: 3 already built (CRE Loan Calculator = commercial-loan-calculator; CRE Loan Affordability and
Eligibility = commercial-property-loan-calculator) and 14 merged as the same calculator purpose (SBA Loan
Prequalification/Consolidation/Early Payoff; SBA 7(a) Payment/Payoff/Interest/Affordability/Comparison/
Eligibility = the SBA Loan tools; CRE Prequalification/Consolidation/Early Payoff; MCA Payment; Trailer
Loan Cost). 89 new tools in 11 self-contained sub-batches, no new categories:
- Loan > General Loan Calculators: `loan-sba` (11; FY2026 guaranty fees, max spreads, 5/3/1 prepayment
  fee), `loan-sba-programs` (8: 7(a) blended-term calculator + 504 x7), `loan-microloan` (7),
  `loan-franchise` (7), `loan-inventory-financing` (7), `loan-invoice-mca` (10: invoice 7, MCA 3),
  `loan-agricultural` (7; farmland, operating loan, FSA Down Payment Loan, farm ratios)
- Loan > Personal Loan Calculators: `loan-peer-to-peer` (7)
- Loan > Auto & Vehicle Loan Calculators: `loan-fleet` (7), `loan-truck-trailer` (10: truck 7, trailer 3)
- Mortgage Calculators: `mortgage-commercial-real-estate` (8; IO + balloon, step-down/yield maintenance)
Expansion 2 (below) was still uncommitted, so the deploy block covers both: git push + all 19
`db:create-*` scripts (8 from expansion 2, 11 new) + Render Manual Deploy, then the user asks for publishing.

Before that: built **Loan Calculators expansion 2** (3 Oct 2026) from the user's 99-keyword list: no exact duplicates;
19 dropped as the same calculator purpose (new standing rule in AI_RULES.md): Signature Loan x7 (= personal
loan tools), Personal Line of Credit x7 (merged into Line of Credit), Tractor Loan x4 (merged into Farm
Equipment) and Construction Loan Consolidation (vague). 80 new tools in 8 self-contained sub-batches:
- Loan > Personal Loan Calculators: `loan-life-events` (12: funeral, moving, pet), `loan-jewelry-furniture` (8;
  jewelry = gold-backed loan + purchase financing), `loan-appliance-electronics` (8)
- Loan > General Loan Calculators: `loan-farm-equipment` (7; annual payments, Section 179, DSCR),
  `loan-cosigned-joint` (14)
- Mortgage Calculators: `mortgage-construction` (13), `mortgage-bridge` (7)
- Credit & Debt Calculators: `credit-line-builder` (11: line of credit 7, credit builder 4)
No new categories were needed. Also made CalculatorWidget honour a result line's `decimals` for "currency"
and "percentage" formats (previously "number" only) — affects only 2 solar per-kWh lines and the LOC daily
rate. User runs git push + the 8 new `db:create-*` scripts + Render Manual Deploy, then asks for publishing.

Before that: built the **Loan Calculators expansion** (2 Oct 2026) from the user's 101-tool loan list (screenshot):
no exact-slug duplicates, but 3 skipped — "Debt Consolidation Loan Calculator" (same tool as the existing
debt-consolidation-calculator in Credit & Debt), "Debt Consolidation Loan Consolidation Calculator" (repeats
it) and "Home Improvement Loan Consolidation Calculator" (too vague). 98 new tools in 10 self-contained
sub-batches (`calc-engine-loan-*.ts` + `prisma/create-loan-*-calculators.ts`). At the user's request
**Loan Calculators was split into 5 sub-categories** (tools are filed at the leaf level, so Loan Calculators
itself now holds none):
- General Loan Calculators (`general-loan-calculators`) — the 50 pre-existing general/business/student loan tools
- Personal Loan Calculators (`personal-loan-calculators`) — 4 existing personal-loan tools + debt-consolidation
  (12), medical-dental (11), wedding-vacation (11)
- Auto & Vehicle Loan Calculators (`auto-vehicle-loan-calculators`) — 3 existing auto tools + motorcycle (7),
  boat (7), rv (7)
- Home Improvement Loan Calculators (`home-improvement-loan-calculators`) — home-improvement (13),
  renovation-timeshare (11), solar (7)
- Short-Term & High-Cost Loan Calculators (`short-term-loan-calculators`) — short-term-loan-calculator +
  high-cost (12: payday, title, pawn)
The 58 old tools are moved by `organize-tool-categories.ts` (LOAN_TOOL_GROUPS -> TOOL_MOVES); the old
loan create scripts were re-pointed to the new sub-categories so re-running them won't undo it. New create
scripts create their sub-category under Loan Calculators if it's missing. Facts used: the 30% federal
residential solar credit (§25D) ended for systems installed after 31 Dec 2025 (OBBBA), so no solar tool
assumes it; FHA annual MIP 0.55%, upfront 1.75%, min score 580 / LTV 96.5%; Rule of 78s banned on consumer
loans > 61 months. The user said more keyword lists are coming — check each against these 98 + the rest.
User runs git push + `npm run db:organize-categories -- --apply` + the 10 `db:create-loan-*` scripts + Render
Manual Deploy, then asks for publishing.

Before that: built the **Crypto Calculators** batch (29 Sep 2026) from the user's 89-tool currency/forex/crypto
list: 3 already existed (currency-converter, forex-profit-loss-calculator, forex-position-size-calculator),
86 new in 9 self-contained sub-batches (`calc-engine-currency-*.ts` + `prisma/create-currency-*-calculators.ts`):
conversion (13), rate-changes (8), spreads-fees (10), travel-consumer (9), forex-trade (12),
forex-costs-growth (11), forwards-parity (10), business-hedging (9), crypto-metals (4). The user asked for a
new Finance sub-category named **Crypto Calculators** (`crypto-calculators`) holding the whole list, so the
3 existing tools were moved there (TOOL_MOVES in organize-tool-categories.ts; create-finance-currency-
calculators.ts now targets crypto-calculators) and the now-empty "Currency & Exchange Calculators" category
was deleted (its URL /tools/category/currency-exchange-calculators is gone). All rates/prices are
user-entered — nothing is fetched live. Also added an optional `decimals` field on result lines
(CalcResultConfig / CalcResultLineConfig, used by CalculatorWidget for "number" format) so rates and crypto
amounts can show 4–8 decimals. All 86 added to the live DB as Draft. User runs `git push` + Render Manual
Deploy, then asks for publishing.

Before that (same day): built the **Real Estate Calculators** batch (28 Sep 2026) from the user's 121-tool list: 9
skipped as duplicates (8 already in Real Estate Calculators + property-tax-calculator in Tax
Calculators), 112 new tools in 11 self-contained sub-batches (`calc-engine-realestate-*.ts` +
`prisma/create-realestate-*-calculators.ts`), all under Finance Calculators > Real Estate
Calculators (`real-estate-calculators`): rental-income (12), rental-ratios (11),
value-appreciation (10), returns-equity-debt (10), strategies (11), flips (13), homebuying (10),
selling-tax (9), mortgage-commercial (9), multifamily-land (9), short-term (8). 2026 US tax
figures used: Section 121 exclusion $250k/$500k, depreciation 27.5/39 years (mid-month), recapture
max 25%, $25k passive-loss allowance phased out $100k–$150k MAGI, SALT cap $40,400 cut by 30% of
MAGI over $505k (floor $10k), standard deduction $16,100/$32,200. All added to the live DB as
Draft. User runs `git push` + Render Manual Deploy, then asks for publishing.

Before that (same day): built the **Business Finance Calculators** batch (28 Sep 2026) from the user's 108-tool list: 17
skipped as duplicates (9 existing business tools + 8 existing business-loan tools), 91 new tools in 11
self-contained sub-batches (`calc-engine-business-*.ts` + `prisma/create-business-*-calculators.ts`):
profit (10), breakeven-margin (8), pricing (7), revenue (11), costs (7), unit-returns (9),
liquidity-cash (12), loans (4 — filed under **Loan Calculators**, the rest under Business Finance
Calculators), inventory-receivables (9), valuation (8), growth-variance (6). All added to the live DB
as Draft. User runs `git push` + Render Manual Deploy, then asks for publishing.

Before that (same day): built the **Salary & Income Calculators** batch (28 Sep 2026) from the user's 91-tool list:
8 skipped as duplicates (salary, take-home-pay, hourly-to-salary, salary-to-hourly, overtime,
paycheck, bonus, commission calculators), 83 new tools in 9 self-contained sub-batches under
Finance Calculators > Salary & Income Calculators (`salary-income-calculators`): conversions
(11), period-conversions (10), hours-overtime (11), premiums-commission (10), raises (8),
income-sources (12), self-employed (6), rates (7), deductions-net (8). Most are gross-pay or
user-entered-rate tools (any country); US-specific 2026 figures used: bonus supplemental
withholding 22%/37%, SS wage base $184,500, Medicare 1.45% + 0.9% over $200k, SE tax 15.3% on
92.35% of profit, FLSA regular-rate overtime, California-style daily overtime. All added to the
live DB as Draft. User runs `git push` + Render **Manual Deploy** (auto-deploy seemed off), then
asks for publishing.

Before that (same day): built the **Retirement Calculators** batch (28 Sep 2026) from the user's 76-tool list: 8
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
- 2026-09-28: Built the "Salary & Income Calculators" batch: 83 new tools across 9 sub-batches, 8
  skipped as duplicates. Verified with an independent check (97 checks, 0 failures — incl. FLSA
  bonus-in-regular-rate overtime, California daily/weekly overtime, 2026 bonus withholding and
  SE tax caps), a content check (SEO lengths/uniqueness, defaults match, example figures match)
  and a stress test. `tsc`/`lint`/`build` clean. User rule added (AI_RULES.md + memory): when
  checking a tool list, answer SHORT — how many already built, how many new.
- 2026-09-28: Built the "Business Finance Calculators" batch: 91 new tools across 11 sub-batches, 17
  skipped as duplicates (list had 108, not 109 as first said). Near-namesakes differentiated against
  the existing business/loan/investment tools (see each engine header). Verified with an independent
  check (94 checks, 0 failures — incl. EOQ, DuPont ROE, high-low method, balloon via simulation,
  discounted payback, price/quantity variances), a content check and a stress test (found and fixed
  a 0 ÷ 0 in Average Order Value). `tsc`/`lint`/`build` clean.
- 2026-09-28: Built the "Real Estate Calculators" batch: 112 new tools across 11 sub-batches, 9
  skipped as duplicates. Near-namesakes (e.g. the three BRRRR tools, rental yield vs gross/net
  yield, house-flip profit vs fix-and-flip) differentiated in each engine header. Verified with an
  independent check (IRR via NPV = 0, PMI drop month by simulation, DSCR-limited loan, 28% rule
  price, target cash-on-cash price, rent-vs-own brute force), a content check and a
  zero/max/random stress test. `tsc`/`lint`/`build` clean.
- 2026-09-29: Built the "Crypto Calculators" batch (currency, forex, forwards/parity, hedging, crypto and
  precious metals): 86 new tools across 9 sub-batches, 3 existing currency tools moved into the new
  crypto-calculators category, old Currency & Exchange category deleted. Added optional result-line
  `decimals`. Verified with an independent check (forward rate via parity identity, covered-interest
  arbitrage by cash flows, cross rate chain, pip value for a base-currency account, hedge ratio, account
  growth loop, rollover, geometric NEER, stop-loss round trip, invoice target, gold value, Modified Dietz),
  a content check and a zero/max/random stress test. `tsc`/`lint`/`build` clean.
- 2026-10-02: Built the Loan Calculators expansion from the user's 101-tool list — 3 skipped (see
  "Resume here"), 98 new tools in 10 sub-batches (debt-consolidation 12, medical-dental 11,
  wedding-vacation 11, home-improvement 13, renovation-timeshare 11, solar 7, high-cost 12, motorcycle 7,
  boat 7, rv 7). Split Loan Calculators into 5 sub-categories (General, Personal, Auto & Vehicle, Home
  Improvement, Short-Term & High-Cost) and moved the 58 existing loan tools into them via
  organize-tool-categories.ts (dry-run against the 29 Sep backup: 0 tools left in the parent, second run
  a no-op). Every tool's default example numbers were checked against an independent month-by-month
  implementation and an automated example-text checker; all 98 also run through runCalculator with
  default/zero/min/max inputs with no NaN/Infinity. `tsc`/`lint`/`build` clean.
- 2026-10-03: Built Loan Calculators expansion 2 from the user's 99-keyword list — 19 merged/dropped (see
  "Resume here"), 80 new tools in 8 sub-batches across Personal Loan, General Loan, Mortgage and Credit &
  Debt Calculators. Added the user's standing keyword-check rules to AI_RULES.md. Widget now applies
  `decimals` to currency/percentage result lines. Every default example checked against an independent
  implementation and the automated example checker; all 80 run through runCalculator with default/zero/
  min/max inputs. `tsc`/`lint`/`build` clean.
- 2026-10-03: Built Loan Calculators expansion 3 from the user's 106-keyword list — 3 already built, 14
  merged (see "Resume here"), 89 new tools in 11 sub-batches across General Loan, Personal Loan, Auto &
  Vehicle Loan and Mortgage Calculators. Checked SBA's FY2026 7(a) fee schedule and the 504 alternative
  size standard ($20M net worth / $6.5M net income) online. Example text is now filled from the engine's
  own outputs, then checked by the automated example checker; 35 key numbers re-derived by an independent
  month-by-month simulation; all 89 run through runCalculator with default/zero/min/max inputs.
  `tsc`/`lint`/`build` clean.
- 2026-10-03: Built Loan Calculators expansion 4 from the user's 43-keyword list — 0 already built, 0
  merged; 43 new tools in 5 sub-batches (powersports 12, instrument-legal 8, cosmetic-fertility 8,
  adoption-tax-debt 11, medical-equipment 4). Checked the 2026 adoption credit and the Q4 2026 IRS interest
  rate online. Examples filled from engine outputs and checked; 15 key numbers re-derived by independent
  simulation; all 43 run through runCalculator with default/zero/min/max inputs. `tsc`/`lint`/`build` clean.
- 2026-10-04: Built Loan Calculators expansion 5 from the user's 150-keyword list — 25 already built, 24
  merged; 101 new tools in 10 sub-batches. Examples filled from engine outputs and checked; 23 key numbers
  re-derived by independent simulation; all 101 run through runCalculator with default/zero/min/max inputs.
  `tsc`/`lint`/`build` clean. Commit message kept in .git/NEXT_COMMIT_MSG.txt (multi-line -m pastes failed).
- 2026-10-05: Built Loan Calculators expansion 6 from the user's 70-keyword list — 63 already built; 7 new
  Student Loan tools (`loan-student-federal`). Examples filled from engine outputs; 22 numbers re-derived
  independently; runCalculator finite on all 7. `tsc`/`lint`/`build` clean. Added to NEXT_COMMIT_MSG.txt.
- 2026-10-05: Built the Mortgage expansion from the user's 59-keyword list — 17 already built, 5 merged; 37 new
  tools in 5 batches (`mortgage-loan-types`, `-refinance-equity`, `-buyer-programs`, `-property-types`,
  `-costs-insurance`) and split Mortgage Calculators into 5 sub-categories. 26 numbers re-derived independently;
  runCalculator finite on all 37; organize dry run OK. `tsc`/`lint`/`build` clean.
- 2026-10-05: Built the Interest expansion from the user's 67-keyword list — 13 already built, 8 merged; 46 new
  tools in 9 batches across Interest, Savings, Investment, Loan > Short-Term, Retirement and Salary & Income.
  25 numbers re-derived independently (RD/NSC match published India Post figures); runCalculator finite on all
  46. `tsc`/`lint`/`build` clean.
- 2026-10-05: Built the Investment expansion from the user's 69-keyword list — 16 already built, 12 merged; 41
  new tools in 9 batches, and split Investment Calculators into 5 sub-categories. 27 numbers re-derived
  independently; runCalculator finite on all 41; organize dry run OK. `tsc`/`lint`/`build` clean.
- 2026-10-05: Built the Budget expansion from the user's 147-keyword list — 15 already built, 48 merged; 84 new
  tools in 12 batches under a new Finance > Budget Calculators category with 5 sub-categories. 29 numbers
  re-derived independently; runCalculator finite on all 84. `tsc`/`lint`/`build` clean.
- 2026-10-05: Built the Insurance expansion from the user's 119-keyword list — 1 already built, 45 merged; 73 new
  tools in 11 batches under a new Finance > Insurance Calculators category with 5 sub-categories; homeowners
  insurance moved there from Real Estate. 153 numbers re-derived independently; runCalculator finite on all 73;
  organize dry run OK (homeowners moves, rerun 0). `tsc`/`lint`/`build` clean.
- 2026-10-06: Built the Car & Vehicle Cost expansion from the user's 131-keyword list — 5 already built, 37 merged;
  88 new tools in 9 batches under a new Finance > Car & Vehicle Cost Calculators category with 5 sub-categories,
  plus car-insurance-discount in Insurance > Auto & Vehicle. 56 numbers re-derived independently; runCalculator
  finite on all 89; organize dry run OK. `tsc`/`lint`/`build` clean.
- 2026-10-06: Built the Crypto expansion from the user's 116-keyword list — 16 already built, 40 merged; 60 new
  tools in 8 batches, and split Crypto Calculators into 5 sub-categories (89 existing currency/crypto tools move;
  10 old currency scripts re-pointed). 54 numbers re-derived independently (Black-Scholes checked by numeric
  integration and put-call parity); runCalculator finite on all 60; organize dry run OK. `tsc`/`lint`/`build` clean.
- 2026-10-06: Breadcrumbs drop the "Tools" root — category pages start at the top-level category, calculator
  pages show Home / <category> / <title>; default header link label "Calculators" (href /tools). A header menu
  saved in /admin overrides the default label, so rename it there too.
- 2026-10-06: New /calculators hub (main categories only, category-page styling); header default link and sitemap
  point to it; /tools 308-redirects to /calculators (next.config.ts). A header menu saved in /admin must have its
  Calculators link changed to /calculators by the user.
- 2026-10-06: Real home page at src/app/(site)/page.tsx (the default starter src/app/page.tsx is deleted): hero
  with search (/api/search) + scientific calculator (src/components/home), category blocks from the live tree,
  Popular Calculators (isPopular), About (Website Settings). Not checked against live data (no DB in sandbox).
- 2026-10-06: Fixed /calculators showing no categories — `where: { parentId: null }` misses MongoDB docs with no
  parentId field (Finance was created without one). Filter top-level categories in code instead; never rely on a
  null filter for optional fields on MongoDB (use isSet: false or filter in code).
- 2026-10-06: Home page = 3 switchable designs, all content admin-edited at /admin/homepage (site_settings key
  "homepage": activeDesign + design1 content; src/lib/homepage-config.ts, homepage-data.ts, home-icons.ts,
  components/home/designs/HomeDesign1.tsx). Design 1 built (calculator-online.net-style hub). Designs 2 and 3 come
  later from the user's screenshots — add them as design2/design3 blocks + HomeDesign2/3, don't replace Design 1.
- 2026-10-06: Design 1 polish — full-width calculator (function + number pads; phone: number pad first, functions
  behind a toggle), search moved lower, subtitle setting, card-style tiles/About/sections. Visual check method that
  avoids the live DB: temporary route rendering HomeDesign1 with mock data, `next dev` with DATABASE_URL overridden
  to mongodb://127.0.0.1:1/...?serverSelectionTimeoutMS=300, Edge headless screenshots (phone width via a
  same-origin 390px iframe page in public/, since headless Edge's minimum viewport is ~492px). Delete the temp files after.
