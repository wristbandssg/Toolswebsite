# PROJECT_NOTES.md — Where this project stands

*Read `AI_RULES.md` first, then this file, before doing anything else.*

## ▶️ Resume here

Latest (18 Oct 2026, user's 1,528-keyword law & government list in 3 parts, main category "Law Government calculators", max 10 sub-categories): new main category **Law & Government Calculators** (law-government-calculators) set up by `prisma/setup-law-government-category.ts` (re-run = no-op) with 10 sub-categories: Military & Veterans, Child Support, Alimony/Divorce & Probate, Employment & Wage Law, Unemployment/Workers' Comp & Paid Leave, Government Benefits, Personal Injury & Settlement, Court/Criminal & Legal Fee, Immigration & Visa, Government Fees & Public Finance. Keyword check: 106 already built, 462 merged, 156 review (vague acronyms/off-topic), ~804 new. **User decision (asked):** hybrid state policy — separate state pages only where the state has its own law/formula/fee table (child support, unemployment, workers' comp, paid leave, registration, speeding tickets, jail credit, probate fees, court deadlines, alimony in formula states); one tool with a state selector otherwise (SNAP, Medicaid, TANF, means test, judgment interest, divorce, car accident, most garnishment) → ~690 new tools, built sub-category by sub-category. **Done so far: Military & Veterans** — 11 existing tools moved in (VA disability, selling leave days, ACFT/APFT/PFT/PRT/AF PT, Navy body fat → Military; unemployment-benefit → Unemployment; post-judgment-interest → Court; stimulus-check → Benefits; owning scripts re-pointed, sports scripts use a MILITARY_SLUGS override) and **53 new tools** (Draft) in 6 `law-mil-*` batches: pay 11 (2026 pay table 3.8%, BAS $476.95/$328.48, BNA 200% FPG 2026), moves 8 (DLA 2026, MALT 23.5¢ from 1 Jul 2026, FY2027 per diem $113+$68, TLE $290 cap, JTR weight table), retire 11 (High-3/BRS/REDUX, reserve points, medical, SBP, frozen-benefit divorce, COLA 2.8%, CRSC/CRDP, FERS buyback 4.25%), va 9 (back pay, caregiver GS-4/1 $31,103, 38 CFR 4.85 hearing tables, SMC 2026, VR&E FY2026, GI Bill 2026-27 cap $30,908.34, MGIB $2,518, NY §458-a, TX §11.22/§11.131), fit 10 (Army one-site tape + AR 600-9 screening table, DoD tape, USMC maximums, AF WHtR 0.55, SEAL PST, BTZ/SrA, OSB, RSCA), misc 4 (TIS/ETS, deployment countdown, WW2 draft, USCG sea time). All db scripts run. **Not built yet (need official data the sites block or that isn't public):** BAH by ZIP (incl. Hawaii/California BAH), Navy sea pay, clothing allowance, OCONUS/Hawaii COLA, ASVAB/AFQT/AFCT percentiles, USMC CFT/IST, IPPT, GAFPB, CFA, OPAT, Army promotion points/cutting scores, WAPS, Navy FMS, draft lottery number. **Child Support** — 60 new tools (`law-cs`, one engine with CS_STATES config): 50 state calculators (income shares with an estimated schedule + optional exact-schedule override and each state's shared-parenting rule; exact models for TX 20–40% cap $11,700, NY CSSA cap $193,000 (Mar 2026), WI DCF 150, NV NAC 425 tiers, MS, AK Rule 90.3, ND approx, CA §4055 K-factor 2024 bands), general, Canada/Ontario/Alberta/BC (table approximation), UK CMS, Philippines, arrears, parenting time, end date. **Next:** Alimony, Divorce & Probate, then the other 7 in order.

Then (17 Oct 2026, user's 462-keyword jobs & education list, main category "jobs education calculators", max 10 sub-categories): new main category **Jobs & Education Calculators** (jobs-education-calculators) set up by `prisma/setup-jobs-education-category.ts` (re-run = no-op), with 10 sub-categories: GPA 21, Grade 9, AP Score 23, SAT/ACT & School Test 14, Graduate & Professional Exam 16, International Exam & Admission Points 9, College Admissions 7, College Cost & Financial Aid 9, School Age/Calendar & Classroom 13, and **Salary, Income & Career** (the existing salary-income-calculators, moved from Finance with its 102 tools, +16 new = 118). **User decisions (asked):** school-specific pages consolidated — the ~197 university/district GPA & grade keywords are covered by university-gpa-calculator (scale presets + grade replacement), weighted/semester/canvas grade calculators; the 48 school net price and 31 school tuition keywords by college-net-price-calculator and college-tuition-calculator; Salary & Income moved (not kept in Finance). **137 new tools** (Draft) in 9 `edu-*` batches; examples computed from the engines. Merged in-list: College GPA→gpa, FHA-style dups (SSAT Percentile→ssat, CA Bar→california-bar, Market Salary→am-i-underpaid, Completion Rate→sap, Harvard chances→college chances preset, Scholaro→wes-gpa, Canvas/Schoology/Skyward/Infinite Campus/Focus/Matt Braddock→canvas-grade-calculator, UTSA/Liberty transfer→transfer-credit, Middle School Grade→elementary-gpa, Albert AP Lit→ap-lit). Already existed: Salary Difference, Hourly to Annual, Contractor to Full-time (contract-rate-to-salary), Freelance Hourly Rate (freelance-rate), California/Dallas salary (state tax calculators). Dropped: brand names (Indeed, Glassdoor, Payscale, Robert Half, OMNI, GitLab) and LECOM AIS (formula not public). Data used: 2026–27 FAFSA SAI (IPA $44,880 family of 4, Pell max $7,395), OSAP 2026–27 25% grant / 75% loan, TOEFL 1–6 band (Jan 2026), EdChoice 2025–26 ($6,166 / $8,408, 450% FPL), NYC/other figures noted per tool. All 9 db scripts already run.

Then (17 Oct 2026, user's 315-keyword real estate list, "Real Estate Calculators must be the main category, max 10 sub-categories, move existing tools instead of rebuilding"): **Real Estate Calculators is now a MAIN category** (left Finance) with 10 sub-categories and 518 tools, set up by `prisma/restructure-real-estate-main-category.ts` (backup prisma/backups/real-estate-restructure-*.json; re-run = no-op). The structure lives in `prisma/real-estate-structure.ts` (sub-categories + REAL_ESTATE_TOOL_CATEGORY map); the 24 older create-*.ts scripts that own moved tools call `realEstateCategoryIdFor()` so re-running them keeps tools in place (verified). **Mortgage Calculators moved under Real Estate** with 5 children: Mortgage Cost & Insurance merged into "Mortgage Payment, Type & Cost" (301 rows added), new child "Mortgage Calculators by State, City & Country". **Moved in (334 existing tools):** all 125 old Real Estate tools, the 50 state property tax + 29 state transfer tax tools (from Tax & Paycheck), property/rental/capital-gains tax tools from Tax, canada-property-transfer-tax, title + landlord insurance, the 4 timeshare loan tools, barndominium-cost and home-addition-cost (from Shopping). `organize-tool-categories.ts` and `reparent-tool-categories-under-finance.ts` are retired (need --legacy) because they would move Real Estate back under Finance. **184 new tools** (Draft) in 9 batches (`re-*`): rent 9, buying 11, selling 8, closing 55 (54 state/city closing costs share one engine with each place's transfer/mortgage taxes, title custom and attorney fees + USDA), mortgage-types 13, mortgage-local 32 (29 US places share one PITI engine + UAE, Spain, Singapore TDSR), tax-local 26 (TX/FL homestead, DeSantis 2026 amendment, Prop 13 cities, Harris/Austin, NYC FY2026 rates, Las Vegas, recapture, NJ exit tax, 8 city/state transfer taxes, NSW 2025-26, Canada LTT all provinces, Italy IMU, Mexico predial, Philippines RPT, UK commercial SDLT), invest-str 11, land-commercial 19. Location families' copy is generated from the engines so examples always match. AED/EUR/MXN added to CalculatorWidget currencies. Final counts: Rent & Tenant 15, Home Buying & Affordability 25, Home Value, Equity & Selling 21, Closing Cost 60, Mortgage 161 (40/26/19/44/32), Property & Real Estate Tax 119, Rental Property & Investment 63, Short-Term Rental & Airbnb 15, Land, Construction & Building Cost 19, Commercial 20. Covered (not rebuilt): Rent/Rent Affordability/3x Rent -> rental-affordability; Based on Income/Mortgage Qualification -> home-affordability; FHA DTI merged into fha-affordability; New York Rent -> nyc-rent; CMA -> home-appraisal; Cook County -> chicago-transfer-tax; Houston property tax -> harris-county; NYS/NY transfer, Michigan, Washington REET -> existing state transfer tools; Buy to Let Rent -> buy-to-let-mortgage; VIC CGT -> australia-capital-gains-tax; India Home Loan Prepayment -> mortgage-prepayment; Land Contract -> seller-financed-mortgage. Dropped as brand names: U.S. Bank Mortgage Rates; "Chatham" (built as generic defeasance-calculator). All 9 db scripts already run. Admin to-do: add Real Estate to the header menu if wanted.

Then (15 Oct 2026, user's ~775-name shopping list -> Shopping Calculators, "you choose the sub-categories, exactly 10, each 10+ tools"): **589 new tools** (Draft) in 10 sub-categories; 78 already existed and 51 were covered by existing same-intent tools (existing tools NOT moved — e.g. gold-value -> gold-melt, unit-price/price-comparison -> price-quantity, gratuity -> tip, dog/cat cost -> pet-ownership-cost-budget, markdown/employee-discount -> discount, vehicle-wrap -> car-wrap-cost), 58 merged in-list. Final Shopping structure (594 tools): Sales Tax, VAT & Import Duty 55 (`shopping-car-tax-states`, `-import-duty`, `-tax-special`); Discount, Tip & Unit Price 32 (`-deal-*`); Pricing, Markup & Seller Fee 66 (`-price-*`); Gold, Silver & Jewelry 48 (`-gold-*`); Clothing, Shoe & Ring Size 47 (`-size-*`); Home Improvement Cost & Sizing 131 (`-home-*`, `-home-cost-*` share one cost engine); Electronics, Energy & Tech 67 (`-tech-*`); Shipping & Moving Cost 34 (`-ship-*`); Vehicle, Resale & Collectibles 65 (`-veh-*`: values/gear share a depreciation engine, collect shares a comparable-sales engine; + the 2 boat and 3 car-buying tools); Lifestyle, Party & Wedding 49 (`-life-*`). **Boat Calculators and Buying Costs Calculators sub-categories merged into Vehicle, Resale & Collectibles** by `prisma/merge-shopping-boat-buying-into-vehicle.ts` (backup prisma/backups/shopping-merge-boat-buying-2026-10-15T08-36-49-867Z.json; 301s from both old sub-category URLs); create-shopping-boats / -buying-costs now file there. All create-shopping-* db scripts already run.

Then (14 Oct 2026, user car buying list of 20 -> Shopping Calculators > Buying Costs): new sub-category **Buying Costs Calculators** (buying-costs-calculators) under Shopping. 17 already covered and NOT moved (Car Payment -> auto-loan; Insurance Cost -> car-insurance-premium; Negative Equity -> car-loan-payoff-vs-trade-in; Title Transfer -> car-registration-fee; Auction Price -> car-auction-fee; Extended Warranty -> extended-auto-warranty-vs-insurance; Gap -> gap-insurance-auto; Invoice -> dealer-invoice-price; Lease Buyout -> lease-buyout; Lease vs Buy -> car-lease-vs-buy; rest exact slugs). 3 new tools (`shopping-buying-costs`: car-price [max price from monthly payment], car-down-payment, vehicle-property-tax), db script already run (Draft).

Then (14 Oct 2026, user boat list -> Shopping Calculators > Boats): **Shopping Calculators main category re-created** (it had been deleted as empty by the clean-up; its /shopping-calculators redirect removed) with sub-category **Boat Calculators** (boat-calculators). 2 already existed and were NOT moved (Boat Insurance -> boat-insurance-calculator; Boat Cost of Ownership -> boat-total-cost-of-ownership-calculator). 2 new tools built (`shopping-boats`: boat-value, boat-depreciation; type-based depreciation curve 1st yr / yrs 2-10 / 10+), db script already run (Draft). cleanup-structure-and-duplicates.ts no longer lists shopping-calculators for deletion.

Then (14 Oct 2026, user request "review the full structure, remove unnecessary sub-categories and duplicate / same-intent tools, keep it clean and SEO-friendly, don't delete anything unique"): `prisma/cleanup-structure-and-duplicates.ts` applied (backup prisma/backups/structure-cleanup-2026-10-14T08-45-21-470Z.json — affected categories + every deleted tool with SEO meta). **131 duplicate tools deleted** (all Draft; 3,426 -> 3,295): 49 federal/general same-intent variants (each listed with the tool that covers it in `prisma/retired-tool-slugs.ts` — the 7 owning seed scripts skip those slugs) plus the 41 state commission-tax (= state bonus-tax) and 41 state contractor-tax (= state freelance-tax) families, whose scripts, engines and npm scripts were deleted. **Category merges:** Auto Loan (admin-made, 50 tools) -> Auto & Vehicle Loan; Net Worth & Cost of Living -> Budgeting Methods & Planning; Vehicle Business Use & Income -> Car Ownership, Fuel & EV Cost; empty Shopping Calculators main category deleted (redirects added for all four). **Moved:** mortgage-payment / mortgage-affordability / real-estate-mortgage -> Mortgage Payment & Type; investment-property / rental-property mortgage -> Property, Construction & Mortgage; crypto-capital-gains -> Crypto tax; effective-corporate-tax-rate -> Tax (owning scripts use CATEGORY_OVERRIDES). Kept deliberately: the 1-tool country tax sub-categories (HK / MY / PH extended batches still to run into them), state withholding vs withholding-tax, rent-to-price vs price-to-rent, hourly<->salary directions, loan template families.

Then (same day, user request): **Business Finance Calculators deleted** — its 176 tools now sit directly in the Finance Calculators main category — and **Microeconomics + Macroeconomics merged into one "Economics Calculators"** (economics-calculators, 54 tools), by `prisma/flatten-business-finance-and-merge-economics.ts` (backup prisma/backups/finance-flatten-2026-10-14T05-51-05-473Z.json; full category records incl. the Business Finance page content). Redirects added: /finance-calculators/business-calculators and /business-finance-calculators -> /finance-calculators/, micro/macroeconomics -> /finance-calculators/economics-calculators/ (moved published tools redirect automatically via public-redirects rule 3). Finance now = 15 sub-categories + 176 direct tools. All create-business-*, create-finance-business and create-fin* scripts file accordingly (249/249 verified).

Just consolidated the **Finance sub-categories** (14 Oct 2026, user request): Finance had 42 sub-categories; the 25 that had fewer than 10 tools or duplicated an older one (all created by the fin/fin2/fin3/fin4 expansions the same day) were merged and deleted by `prisma/consolidate-finance-subcategories.ts` (211 tools moved; backup prisma/backups/tool-categories-2026-10-14T05-38-28-895Z.json; re-run = no-op). Finance now has 17: the 15 originals (Tax, Loan, Business Finance [176], Crypto, Investment, Real Estate, Mortgage, Salary & Income, Budget, Car & Vehicle Cost, Retirement, Savings, Insurance, Interest Rate, Credit & Debt) + Microeconomics (28) + Macroeconomics (26). The create-fin*.ts scripts now point each tool at its consolidated category (verified 249/249 match the DB) and organize-tool-categories.ts no longer lists the removed ones. Open question for the user: Loan Calculators has both "Auto Loan Calculators" (auto-loan-calculators, 50 tools, made in admin) and "Auto & Vehicle Loan Calculators" (auto-vehicle-loan-calculators, 3 tools, the one the create-loan-* scripts use).

Previous: Just built **Finance Calculators expansion 4** (14 Oct 2026) from the user's 192-keyword list: nearly all already built or covered — UK CGT/NI/SDLT/take-home, Indian EMI variants (bike/car/home/personal -> emi-calculator), EPF -> provident-fund-interest, POMIS -> post-office-savings-interest, RD/SSY/SIP/Lumpsum/SWP, Moratorium -> deferred-payment-loan, the whole "Redundant Calculators" group (salary/wage/overtime variants -> existing pay tools; only California gets its own tool), loans/mortgage/amortization/property tax/affordability, PV/FV/APR/EAR/nominal/periodic/equivalent-rate tools, sales tools (profit goal, margin, sale/selling price, markdown, layaway, sales tax), currency tools, ROI/HR-software ROI, depreciation methods (straight-line, DDB, declining, SYD -> depreciation-calculator, which gained Fixed DB and VDB methods and its DB record was updated), Loss Ratio -> combined-ratio, DART -> trir, 10-key/money math -> adding-machine, running total -> checkbook-balance. Dropped: all "Get … for Your Website", formula/derivation/table pages, Brexit, India Service Tax (replaced by GST), numbers-to-words (text output not supported), and off-topic maths tools (ratio, ratio to fraction, simplifier, aspect ratio, PPI, golden ratio, coin flipper, random numbers; odds -> implied-probability). 26 new tools in 3 batches (`fin4-*`: india-uk 7, trading-ops 9, accounting-ratios 10) in 3 NEW sub-categories (UK Finance, Indian Finance, Other Calculators [slug other-finance-calculators]) + existing Tax & Salary, General Investment, Investment & Depreciation, Personal Finance, Business & Financial Ratios. NPS India uses slug national-pension-system-calculator (nps-calculator is Net Promoter Score). Data: official APY chart, UK Royal Mint coin weights, Section 201(1A)/234E, 10(13A), 2026 LTCG 12.5% over ₹1.25L. The 3 db scripts were already run (Draft).

Previous: Just built **Finance Calculators expansion 3** (14 Oct 2026) from the user's 307-keyword list (9 user-named sub-categories): 94 already built (exact slugs); 129 covered by existing tools, merged in-list or dropped — e.g. Call Option -> options-trading; Futures -> futures-trading; Margin Call -> margin-account; Yield to Call -> callable-bond-investment; AGI/Gross-to-Net/Net-to-Gross/Salary Inflation/3x Rent/ARM/10-1 ARM/ARV/Biweekly/Jumbo/LTV/PMI/PITI/Mortgage w/ Taxes & Insurance/Extra Payments/Acceleration/Home & Simple Mortgage/Rent or Buy -> existing; Double/Triple/Percent-off discounts -> discount-calculator (third stacked discount added and its DB record updated); FFO -> affo; ADR -> occupancy-rate; Powerball/Mega Millions/Lottery Annuity -> lottery-payout; all stimulus-check variants -> stimulus-check; CARES/HEALS/HEROES/LWA -> unemployment-benefit; Scrap Gold/Silver -> gold/silver-melt; Accounting Profit -> economic-profit; Levered/Unlevered FCF -> fcfe/fcff; Fisher Effect + Real Interest Rate -> fisher-equation; Real GDP -> gdp-deflator; Money Supply + Reserve Ratio -> money-multiplier; Trump Tariff -> tariff; dropped as expired/not calculators: Biden's Tax Plan, Build Back Better, Trump's Taxes vs Yours, California Stimulus II, EIDL, PPP, Australia 2020-21 tax cuts, COVID student-loan repayment, State Tax hub (50 state tools exist), and the 4 "Quiz" items. 84 new tools in 10 batches (`fin3-*`: derivatives-tax 10, pay 8, property 7, homebuying 6, personal 9, debt-retire-sales 8, accounting 9, financial-analysis 8, macro1 10, macro2 9) in 8 NEW Finance sub-categories (Derivatives Investment, Tax & Salary, Mortgage & Real Estate, Personal Finance, Debt Management, Sales, Microeconomics, Macroeconomics) + the existing Retirement Calculators. The 10 db scripts were already run (Draft). Data: 2026 AMT (exemption $90,100/$140,200, phase-out $500k/$1M at 50%, 28% above $244,500), 2026 CTC $2,200/$1,700 ACTC, 2026 Roth phase-out $153k–168k/$242k–252k, 2025 Census household income percentiles (pub. Sep 2026), Trump Accounts ($1,000 pilot, $5,000 cap, employer $2,500), Pag-IBIG 5.75%/6.25%/3%, 2025 HHS poverty guideline.

Previous: Just built **Finance Calculators expansion 2** (14 Oct 2026) from the user's 186-keyword list (5 user-named sub-categories): 34 already built (exact slugs); 53 covered by existing same-intent tools (e.g. ROCE -> return-on-capital-employed; GST -> india-gst; FD -> fixed-deposit-interest; RD -> recurring-deposit-interest; Step Up SIP -> sip; A/R Days + Average Collection Period -> days-sales-outstanding; High-Low -> fixed-cost; Liquid Net Worth -> personal-net-worth; Profitability Index + MIRR -> npv/irr; SaaS LTV -> customer-lifetime-value; Safety Stock -> reorder-point; EAR/Effective Annual Yield/AER -> effective-interest-rate; Maximum Drawdown -> forex-drawdown; Money Factor -> car-lease; TVM -> finance-calculator; CAPM -> cost-of-equity; Cost of Capital + After-tax Cost of Debt -> wacc; Intrinsic Value -> discounted-cash-flow; Return on Sales -> operating-margin; Bond Convexity -> interest-rate-sensitivity; Bond Current Yield/Coupon Payment/Coupon Rate -> bond-interest; BEY -> treasury-bill; Bond Yield/YTM -> bond-yield-to-maturity; TIE -> interest-coverage; TEY -> municipal-bond); 11 merged in-list (Attrition -> turnover-rate; Customer Retention -> churn-rate; Online Marketing Conversion -> conversion-rate; Average Fixed Cost -> cost-function; Google AdSense -> website-ad-revenue; Optimal Hedge Ratio -> hedge-ratio; Week Over Week + EPS Growth -> year-over-year-growth; Retention Ratio -> dividend-payout-ratio; duplicate FD; "Quiz: Dividend Calculator" dropped). 88 new tools in 9 batches (`fin2-*`: investing 10, web-saas 10, workforce 9, business-costs 10, business-analysis 10, performance 10, equity-valuation 10, equity-returns 10, debt 9) in 5 NEW Finance sub-categories (Financial & Investment, Business Planning, General Investment, Equity Investment, Debt Investment); existing tools NOT moved. The 9 db scripts were already run (Draft). Data: PPF 7.1%, 2023 Merger Guidelines HHI bands, Altman Z/Z'/Z'' zones, Ohio State 2014 smoker costs, ACA 30h/120h FTE rules.

Previous: Just built the **Finance Calculators expansion** (14 Oct 2026) from the user's 117-keyword finance list (user's own sub-category per tool): 45 already built (exact slugs, e.g. enterprise-value, ebitda, cap-rate, roi, salary, overtime, margin, cagr, mortgage, loan, apy, savings, simple-interest); 18 covered by existing same-intent tools (Net Worth -> personal-net-worth; Pay Raise -> raise; Turo -> car-sharing-host-earnings; Gross Income -> gross-pay; Stock -> stock-profit; Options Profit -> options-trading; Price -> selling-price; Rent Split -> roommate-expense-split; Cost Basis -> stock-cost-basis; Payment -> loan-payment; Car Loan -> auto-loan; Compound Interest Daily -> daily-compound-interest; Compound Interest Formula -> compound-interest; How Long to Save -> savings-goal-timeline; How Long Will Money Last -> retirement-withdrawal; MMA -> money-market-savings; Stock Average -> stock-average-price; Cash Back -> credit-card-rewards-optimization); 3 merged in-list (Buying Power -> inflation-calculator; Markdown -> discount-calculator; Money Counter dup). 51 new tools in 5 batches (`fin-*`: valuation 10, depreciation-tax 10, economics 11, business-pay 10, marketing-misc 10), each filed in ONE of 11 NEW Finance sub-categories named by the user (Business & Financial Ratios, Investment & Depreciation, Tax & Duties, Demand & Elasticity, Salary & Wages, Profitability & Cost, Revenue & Sales, Growth & Productivity, Miscellaneous (slug miscellaneous-finance-calculators), Financial Calculators, Additional Financial Calculators) — existing tools were NOT moved; ToolDef has a per-tool `category`. The 5 db scripts were already run (Draft). Data: US CPI-U annual averages 1913–2025 + 2026 Jan–Aug (BLS via datasets/cpi-us), VA rates eff. 1 Dec 2025 (va.gov), IRS Pub 946 Table A-1 MACRS, 2026 std deduction 16,100/32,200/24,150, SS wage base 184,500, PayPal 3.49%+0.49.

Previous: Just built the **Other Sports Calculators** (13 Oct 2026) from the user's combined lists (244 unique keywords): 60 already built (all of Golf and Hiking incl. their merges) + Peloton FTP -> existing ftp-calculator; 10 merged (QBR -> quarterback-rating; 60yd->40yd -> 40-yard-dash; wingspan -> ape-index; basketball playing time -> playing-time; seeding -> tournament-bracket; stallion -> horse-color; shotgun recoil -> rifle-recoil; crossbow KE -> kinetic-energy-calculator-archery; swimming -> swim-pace; 800m pace -> 400m-pace). 174 new tools in 17 batches (`other-*`: football 14, basketball 15, horse-care 9, horse-costs 8, league 8, team-stats 7, target-games 8, shooting 12, archery 13, swim-dive 12, boards 8, wind-boat 7, gym-cardio 11, rowing-home-gym 10, track-field 9, racket 9, combat-climb-skate 14), all in ONE new sub-category Sports Calculators > Other Sports Calculators (user: 'other sports' sub-category, created by the first script); the 17 db scripts were already run (Draft). Notable models: G1 point-mass ballistics (calibrated: .308 175gr 2600 fps ≈ 12 MOA @500, 11.4 mil @1000), World Athletics combined-events tables (JJK 7291 check), Mureika 100 m wind/altitude, DLS resource curve fitted to the Standard Edition, Jimmy Johnson chart (interpolated), Hollinger GmSc/PER (league constants, avg 15), NBA 2025-26 tax line/aprons as defaults, USATT exchange table. create-other-*.ts generated from create-golf-scoring as a template.

Previous: Just built the **Hiking Calculators** (13 Oct 2026) from the user's 37-keyword hiking/walking list: 0 already built (the generic vo2-max-calculator has a Rockport method and target-heart-rate / running-at-altitude exist — the new rockport-walk-test, walking-heart-rate and altitude-oxygen tools are deliberately different: age/sex rating, walking-intensity bands, O2/SpO2), 8 merged (steps to km + 10000 steps -> step-calculator; minutes to steps -> steps-to-minutes; steps per hour -> steps-per-minute; 1 mile walk test + walking VO2 max -> rockport-walk-test; weighted vest walking calories -> rucking-calorie; backpacking calories -> backpacking-food). 29 new tools in 3 batches (`hiking-*`: steps 10, fitness 8, trail 11), all in ONE sub-category Sports Calculators > Hiking Calculators (created by the first script); the 3 db scripts were already run (Draft). Formulas: Naismith + Langmuir, Pandolf load carriage, ACSM walking equation, Enright 6MWT, Kline Rockport + Cooper Institute norms, Bohannon gait norms, Tudor-Locke step bands, AT 2,197.4 mi / Katahdin Oct 15, PCT 2,650 mi / Kennedy Meadows mile 702. create-hiking-*.ts generated from create-golf-scoring as a template.

Previous: Just built the **Golf Calculators** (13 Oct 2026) from the user's 43-keyword golf list: 0 already built (only the unrelated golf-cart loan tools existed), 4 merged (ball speed to swing speed -> golf-swing-speed with a ball-speed method; net double bogey -> adjusted-gross-score; putter lie angle -> lie-angle with an iron/putter dropdown; golf net score -> golf-score). 39 new tools in 4 batches (`golf-*`: handicap 9, scoring 10, equipment 10, distance 10), all in ONE sub-category Sports Calculators > Golf Calculators (created by the first script); the 4 db scripts were already run (Draft). Handicaps follow WHS 2024 (best 8 of 20 table, Course Handicap = HI × Slope/113 + (CR − Par), playing handicap from the unrounded CH, Appendix C allowances: scramble 25/20/15/10, 30/20/10, 35/15; foursomes 50%; greensomes 60/40; four-ball 85/90%). Strokes gained uses an approximate Broadie PGA Tour baseline. golf-trajectory is a drag+lift flight sim (Cd 0.22+0.3S, Cl min(0.35,1.6S), 4%/s spin decay) calibrated to Trackman Tour driver/7-iron within ~3%. create-golf-*.ts generated from the cycling-power file as a template.

Previous: Just built the **Cycling Calculators** (9 Oct 2026) from the user's 63-keyword cycling list: 0 already built, 16 merged (ebike calorie -> biking-calorie; saddle setback -> bike-fit; mountain/gravel bike size -> bike-frame-size; bmx gear + chainring -> bike-gear-ratio; cadence -> bicycle-gear-speed; bmx crank -> crank-length; cycling time + bike mileage -> bike-pace; rim width -> tire-width; wheel build -> spoke-length; ebike battery -> electric-bike-range; carbs per hour -> cycling-nutrition; w prime -> critical-power; intensity factor -> training-stress-score). 47 new tools in 4 batches (`cycling-*`: fit 12, equipment 12, power 9, ride 14), all in ONE sub-category Sports Calculators > Cycling Calculators; the 4 db scripts were already run (Draft). VO2 max cycling is a separate slug (cycling-vo2-max-calculator) from the running-based vo2-max-calculator; biking-vs-driving is separate from the e-bike-only ebike-vs-car-commute. create-cycling-*.ts generated from the sports batch-A template.

Previous: Just built the **Baseball & Softball Calculators** (9 Oct 2026) from the user's 33-keyword list: 0 already built, 1 exact duplicate (On Base Percentage = OBP) and 1 merge (bat weight -> bat-size). 31 new tools in 3 batches (`baseball-*`: hitting 13, pitching 11, team 7), all in ONE sub-category Sports Calculators > Baseball & Softball Calculators; the 3 db scripts were already run (Draft). 2024 MLB constants: wOBA .310 / scale 1.242 / FanGraphs weights, cFIP 3.166, lgERA 4.08, lgOBP .312, lgSLG .399, R/PA .117, R/W 9.6. Exit-velocity flight model calibrated to 100 mph @ 28 deg ~ 400 ft. RE24 = 2010-2015 matrix. create-baseball-*.ts generated from the sports batch-A template.

Previous: Just built the **Winter Sports Calculators** (9 Oct 2026) from the user's 25-keyword winter list: 0 already built, 3 merged (kids ski size -> ski-length, kids snowboard size + splitboard size -> snowboard-size). 22 new tools in 2 batches (`winter-*`: gear 13, conditions 9), all in ONE sub-category Sports Calculators > Winter Sports Calculators; both db scripts were already run (Draft). DIN table is ISO 11088:2018 as modelled in github.com/tomahawkins/din; wind chill = NWS/Environment Canada 2001; frostbite time = Tikuisis & Osczevski. create-winter-*.ts generated from the sports batch-A template.

Previous: Just built the **Motorsports & Racing Calculators** (9 Oct 2026) from the user's motorsport keyword list: 55 new tools after 12 merges (e.g. boost -> boost-to-horsepower, RPM at speed -> engine-rpm, drag racing gear -> final-drive-ratio, quarter mile HP -> quarter-mile, air density -> density-altitude, weight distribution -> corner-weight, ethanol mix -> e85-mix, premix -> 2-stroke-oil-mix, sim racing fuel -> racing-fuel, pit stop -> race-strategy, motorcycle gear ratio -> motorcycle-sprocket, sag -> motorcycle-suspension, go kart speed -> go-kart-gear-ratio). 5 batches (`motorsport-*`: engine 12, power-gearing 11, dynamics 11, chassis-fuel 11, moto-series 10), all in ONE sub-category Sports Calculators > Motorsports & Racing Calculators; the 5 db scripts were already run (Draft). F1 points use 2025 rules (no fastest-lap point); NASCAR uses Cup 40/35… + stage 10–1 + playoff points. create-motorsport-*.ts generated from the sports batch-A template.

Previous: Just built the **Sports Betting & Racing Calculators** (9 Oct 2026) from the user's 77-keyword betting list: 0 already built, 38 merged (American/moneyline/decimal/fractional/bet return/MMA odds -> betting-odds; break even -> implied-probability; parlay EV -> expected-value; accumulator/SGP/bet builder/double/treble -> parlay; Trixie/Patent/Yankee/Canadian/Heinz/Super Heinz/Goliath/Lucky 15-31-63/round robin -> system-bet with a bet-type dropdown; each way double/place odds -> each-way-bet; exacta/quinella/trifecta-superfecta -> horse-racing-bet; pick 3/pick 6/daily double -> pick-4; horse racing payout -> pari-mutuel; lay bet -> matched-betting; odds boost -> profit-boost; run line -> point-spread; correct score -> poisson-betting; player prop -> prop-bet). 39 new tools in 4 batches (`betting-*`: odds 9, bets 10, strategy 9, lines-racing 11), all in ONE sub-category Sports Calculators > Sports Betting & Racing Calculators; the 4 db scripts were already run (Draft). Tax tool uses the 2026 90% gambling-loss deduction limit and 24% withholding rule. Every page carries a responsible-gambling disclaimer (1-800-GAMBLER). create-betting-*.ts generated from the sports batch-A template.

Before that: Just built the **Running Calculators** (9 Oct 2026) from the user's 60-keyword running list: 5 already covered by existing tools (Max HR, HR Reserve and HR Zone -> target-heart-rate-calculator; Lactate Threshold Pace and Anaerobic Threshold -> lactate-threshold-calculator), 20 merged (5K/8K/10K/15K/5 mi/half mile pace/marathon/50K/100 mi pace, miles-to-minutes and running distance -> pace-calculator with a race dropdown; marathon percentile -> running-percentile; negative split -> split; half marathon plan -> marathon-training-plan; Ironman + 70.3 -> triathlon; triathlon nutrition -> marathon-fueling; sodium loss -> sweat-rate; calorie calculator for runners -> run-calorie; trail pace -> gap). 35 new tools in 4 batches (`running-*`: pace 9, performance 9, conditions 9, nutrition-gear 8), all in ONE sub-category Sports Calculators > Running Calculators; the 4 db scripts were already run (Draft). Data: official WMA/USATF 2025 road age-grade factors (Alan Jones GitHub, embedded), World Athletics 2025 scoring coefficients (from the GlaivePro wa-calculator package), Daniels VDOT equations, Minetti GAP, Gardner-Purdy curve (no start/turn corrections), approximate finish-time medians for percentiles. create-running-*.ts were generated from the sports batch-A file as a template.

Before that: Just built the **Sports Performance Calculators** (8 Oct 2026) from the user's 102-keyword list: 0 already built, 26 merged as same-intent (e.g. Squat 1RM / Bench Press Max / Overhead Press Max / Leg Press Max -> one-rep-max-calculator with an exercise dropdown; Wendler 531 + Training Max -> 5-3-1; Tonnage + Workout Volume -> training-volume; Plate Loading / Plate Math / Kg To Lbs Plates -> weight-plate; Bar Load -> barbell-weight; 4 lift strength standards -> strength-standards; MET -> calories-burned-by-activity; Fat Burning Zone -> target-heart-rate; Pacer -> beep-test; Step Test -> harvard-step-test; Peak Power Output -> wingate-test; see each engine header). 76 new tools in 8 batches (`sports-*`: strength-programming 10, strength-tools 10, powerlifting 8, body-composition 9, energy 8, fitness-tests 11, military-tests 8, power-conditioning 12), all in ONE sub-category Sports Calculators > Sports Performance Calculators. The 8 db scripts were already run (Draft). Military tests use official min/max anchors per age/sex with linear points between: Army AFT (replaced the ACFT 1 Jun 2025; the 'Army ACFT Calculator' scores the AFT), APFT (FM 7-22), Navy PRT, Air Force 2026 PFRA (2-mile run 50, WHtR 20, push-ups 15, sit-ups/plank 15), Marine PFT (plank since 2023), Cooper 30th-percentile police standards, CPAT 10:20, classic Presidential Award 85th percentile. The prisma/create-sports-*.ts scripts after batch A were generated from batch A's file as a template.

Before that: Just built the **Fantasy Sports Calculators** (8 Oct 2026) from the user's 28-keyword fantasy list: 0 already built, 2 merged as same-intent (NFL Fantasy Score -> fantasy-football-points-calculator, NBA Fantasy Score -> fantasy-basketball-points-calculator). 26 new tools in 3 batches (`fantasy-trade-scoring` 12, `fantasy-draft-playoffs` 9, `fantasy-payouts-pools` 5) all in ONE sub-category, Sports Calculators > Fantasy Sports Calculators (user: no extra grouping — use exactly the main/sub category they give; the 6 groups first made were deleted). The 3 db scripts were already run (tools are Draft — publish in /admin/tools). PrizePicks/Underdog multipliers are 'typical' values with an override field.

Before that: Just built the **Crypto Calculators expansion** (6 Oct 2026) from the user's 116-keyword crypto list: 16 already built
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
- 2026-10-06: Header is sticky; mega menus live in the Header Builder (MenuItem.mega on top-level items;
  components/site/HeaderNavItem.tsx). The old "mega-menu" location is read for backward compatibility and emptied
  when the Header Builder saves; /admin/mega-menu redirects there. Header defaults in src/lib/menu/defaults.ts.
- 2026-10-06: Footer redesign — components/site/SiteFooter.tsx + SocialIcon.tsx (inline brand SVGs; lucide v1 has no
  brand icons); colors/brand/socials/copyright in site_settings "footer" (src/lib/footer-config.ts), edited on the
  Footer Builder with the link columns. Menu builders offer "+ Add page…" from src/lib/menu/suggestions.ts.
- 2026-10-06: Page Template 1 = boxed sections (src/lib/templates/page/ContentBox.tsx; PageSection type "box" with
  heading/lead/html/showNumber, edited with RichTextEditor in PageBuilder). Draft pages previewable by logged-in
  admins at /pages/<slug> (noindex + banner). Page Template 2 still to be designed from the user's next screenshot.
- 2026-10-06: Fixed /api/pages rejecting box sections (shared schema in src/lib/templates/page/schema.ts, PUT validated too); boxes collapsible with 'Start closed'; Omni-style restyle; 'Convert to Content Boxes' in PageBuilder.
- 2026-10-06: Page Template 2 rebuilt as a document style (calculator-online.net Terms of Service look): blue title/headings, boxes render as heading + rich text, no cards.
- 2026-10-06: Category page: 10 subcats / 40 tools then in-place Show more (ShowMoreGrid); ToolCategory.content rich text edited at /admin/tools/categories/[id]/content (needs prisma db push).
- 2026-10-06: Category page counts from site setting 'category_page' (admin card on Calculator Categories). fix-seo-indexes.ts now includes toolCategoryId (db push E11000 fix): run npm run db:fix-seo-index then npx prisma db push.
- 2026-10-06: Home Design 2 (Category Showcase, allcalculatortools.com style) — design2 block in homepage-config, loadDesign2Data, HomeDesign2, HomeDesign2Form; admin tab switch Design 1/2.
- 2026-10-06: Admin Home/Header/Footer builders full width (AdminHelpCard side card, home side menu with jump links); Design Templates page removed.
- 2026-10-06: Design 2 blogs: BlogCard (equal height) + BlogSlider; settings blogLayout/blogAutoplay/blogExcerptWords.
- 2026-10-06: Design 2 BlogCard compact: no date, 2-line text, hover-only button over the image.
- 2026-10-06: Design 2 FAQ redesigned as numbered accordion with side heading.
- 2026-10-06: Design 2 FAQ: removed side heading block (faqEyebrow/Heading/Text no longer shown or edited); accordion full width.
- 2026-10-08: Fantasy Sports Calculators — 26 tools (calc-engine-fantasy-trade-scoring/draft-playoffs/payouts-pools + matching create-fantasy-* scripts), seeded as Draft. Then moved into one sub-category Fantasy Sports Calculators and the 6 extra sub-categories deleted (user wants exactly the category they name).
- 2026-10-08: Sports Performance Calculators — 76 tools in 8 batches (calc-engine-sports-* + create-sports-* scripts), one sub-category under Sports Calculators; seeded as Draft.
- 2026-10-09: Running Calculators — 35 tools in 4 batches (calc-engine-running-* + create-running-* scripts), one sub-category under Sports Calculators; seeded as Draft.
- 2026-10-09: Sports Betting & Racing Calculators — 39 tools in 4 batches (calc-engine-betting-* + create-betting-* scripts), one sub-category under Sports Calculators; seeded as Draft.
- 2026-10-09: Motorsports & Racing Calculators — 55 tools in 5 batches (calc-engine-motorsport-* + create-motorsport-* scripts), one sub-category under Sports Calculators; seeded as Draft.
- 2026-10-09: Winter Sports Calculators — 22 tools in 2 batches (calc-engine-winter-* + create-winter-* scripts), one sub-category under Sports Calculators; seeded as Draft.
- 2026-10-09: Baseball & Softball Calculators — 31 tools in 3 batches (calc-engine-baseball-* + create-baseball-* scripts), one sub-category under Sports Calculators; seeded as Draft.
- 2026-10-09: Cycling Calculators — 47 tools in 4 batches (calc-engine-cycling-* + create-cycling-* scripts), one sub-category under Sports Calculators; seeded as Draft.
- 2026-10-17: Real Estate Calculators became a main category (10 sub-categories, Mortgage moved under it, 334 existing tools moved) and 184 new real estate tools were built in 9 `re-*` batches from the user's 315-keyword list; all verified (tsc, 184-tool default + fuzz run, independent formula checks, lint unchanged, build) and db scripts run.
- 2026-10-17: Jobs & Education Calculators main category (10 sub-categories; Salary & Income moved in from Finance) and 137 new education/career tools in 9 `edu-*` batches; school-specific GPA/net price/tuition keywords consolidated per the user's choice; verified and db scripts run.
- 2026-10-18: Law & Government Calculators main category (10 sub-categories) + Military & Veterans: 11 tools moved in, 53 new tools in 6 `law-mil-*` batches; verified (independent formula checks, 400-run fuzz, tsc, lint, build) and db scripts run.
- 2026-10-18: Law & Government > Child Support — 60 new tools (`law-cs`), verified (formula checks, fuzz, tsc, lint, build), db script run.
