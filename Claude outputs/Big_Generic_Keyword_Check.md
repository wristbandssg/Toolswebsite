# Big generic calculator keyword check (16 Nov 2026)

Checked against the live database (7,104 tools, 183 categories). Every new slug was also checked against every `slug:` in `prisma/` and `src/`, and against tool titles; none exist. You didn't supply a category structure ("ata tomi check kore dio"), so the live DB taxonomy was used. **BUILT 16 Nov 2026:** all 70 new tools are published (seven batches: create-big-med1/med2/life/fun/math/scibiz/finsport-calculators.ts). Section E items are not built.

## A. সংক্ষিপ্ত হিসাব

| | Count |
|---|---|
| Keywords received (6 parts) | **5,392** (no exact duplicates across parts) |
| আগে তৈরি থাকায় বাদ (mapped to an existing tool) | **4,777** keywords → 1221 existing tools |
| Duplicate / merge into a new tool (secondary keywords) | 240 |
| Review প্রয়োজন | 228 |
| Dropped (generic "calculator online/site", brand-only, not a calculation) | 77 |
| **চূড়ান্ত unique নতুন tools** | **70** |

No new main category or sub-category is needed. All new tools go into existing subs.

**যাচাইয়ের সীমাবদ্ধতা**
- The list is mostly top-volume generic searches, so about 88% were already built. Matching used, in order: (1) the keyword→tool mappings already confirmed in earlier reports (1,116 keywords), (2) about 750 intent rules, (3) exact name match, (4) token matching against slugs and titles. Every token match was reviewed, and about 250 wrong ones were overridden (for example, "interval notation" had matched the *music* interval tool and "cube root" had matched overtime).
- Typos, plurals and word order were normalised ("percetage", "heigjt", "compunding", "final geade").
- Medical keywords go to **Health Calculators**, the main category you approved on 15 Nov. That makes 14 mains, not the brief's 13. If you want to keep 13, the medical tools would go to Sports > Sports Performance or Food & Drink > Diet, Macro & Meal Planning instead.
- One-word searches ("dose", "angle", "scale", "stack", "map", "bp", "face", "greek") were matched to their most likely tool and marked মোটামুটি.

## B. Category সিদ্ধান্ত (new tools)

| # | Keyword (main) | Main Category | Subcategory | কারণ (১ লাইনে) | নিশ্চয়তা | kw |
|---|---|---|---|---|---|---|
| 1 | drug dosage calculator | Health | Sleep & Medical | Human dose from mg/kg × weight, then mg → mL from the liquid strength. The existing vet-dosage tool is for pets. Pediatric amoxicillin/ibuprofen searches are merged here. | নিশ্চিত | 31 |
| 2 | prescription refill calculator | Health | Sleep & Medical | Days' supply = quantity ÷ daily dose, giving the run-out date and the earliest refill date (28/30/90-day fills). | নিশ্চিত | 14 |
| 3 | every 8 hours medication times calculator | Health | Sleep & Medical | Dose clock times for every X hours or N times a day from a first-dose time. Different from refill dates. | মোটামুটি | 2 |
| 4 | drops per minute calculator | Health | Sleep & Medical | IV gtt/min = volume × drop factor ÷ minutes, plus mL/hr. | নিশ্চিত | 2 |
| 5 | insulin dosage calculator | Health | Sleep & Medical | Meal bolus (carbs ÷ ICR) + correction ((BG − target) ÷ ISF). Educational only. | মোটামুটি | 3 |
| 6 | cholesterol ratio calculator | Health | Sleep & Medical | Friedewald LDL plus TC/HDL, TG/HDL and LDL/HDL ratios with risk bands. | নিশ্চিত | 11 |
| 7 | map blood pressure calculator | Health | Sleep & Medical | MAP = DBP + (SBP − DBP)/3. Bare 'map calculator' is ambiguous (Karnaugh map), but the BP intent dominates. | নিশ্চিত | 9 |
| 8 | blood pressure calculator | Health | Sleep & Medical | Classifies a reading (AHA categories), averages several readings, and gives age-based ranges incl. pediatric. | মোটামুটি | 4 |
| 9 | absolute neutrophil count calculator | Health | Sleep & Medical | ANC = WBC × (segs + bands)% with neutropenia grade; absolute eosinophil count shown with the same inputs. | নিশ্চিত | 7 |
| 10 | cardiac output calculator | Health | Sleep & Medical | CO = HR × SV and cardiac index = CO ÷ BSA; Fick option from VO2 and the O2 content difference. | মোটামুটি | 4 |
| 11 | homa ir calculator | Health | Sleep & Medical | HOMA-IR = fasting glucose × insulin ÷ 405 (mg/dL) or ÷ 22.5 (mmol/L). | নিশ্চিত | 3 |
| 12 | qtc calculator | Health | Sleep & Medical | Corrected QT by Bazett, Fridericia (QTcF), Framingham and Hodges from QT and heart rate. | নিশ্চিত | 2 |
| 13 | adjusted body weight calculator | Health | Sleep & Medical | AdjBW = IBW + 0.4 × (actual − IBW), used in drug dosing. The ideal-weight tool doesn't show this. | নিশ্চিত | 4 |
| 14 | mmol to mg/dl calculator | Health | Sleep & Medical | Glucose mmol/L ↔ mg/dL (× 18.016). The GMI tool needs a CGM average, not a conversion. | নিশ্চিত | 2 |
| 15 | pack year calculator | Health | Sleep & Medical | Pack-years = packs/day × years smoked; flags the USPSTF 20 pack-year screening threshold. | নিশ্চিত | 3 |
| 16 | contact lens vertex calculator | Health | Sleep & Medical | Glasses Rx → contact Rx at 0 mm: F/(1 − dF), sphere and cylinder. The parabola vertex tools are maths. | নিশ্চিত | 7 |
| 17 | when can i donate blood again calculator | Health | Sleep & Medical | Next eligible date by donation type (whole blood 56 d, platelets 7 d, plasma 28 d, double red 112 d). | মোটামুটি | 1 |
| 18 | sensitivity and specificity calculator | Science | Statistics & Probability | 2×2 table → sensitivity, specificity, PPV, NPV, accuracy, likelihood ratios. Precision too (alternative: Health). | মোটামুটি | 3 |
| 19 | infant growth chart calculator | Health | Pregnancy & Fertility | WHO 0–24 mo / CDC 2–20 y weight, length/height and head-circumference percentiles (LMS). The existing percentile tool is statistics. | মোটামুটি | 7 |
| 20 | corrected age calculator | Health | Pregnancy & Fertility | Preemie corrected age = chronological age − weeks born early; corrected GA. Alternative: Science > Math next to age-calculator. | নিশ্চিত | 6 |
| 21 | how much expressed milk to feed baby calculator | Health | Pregnancy & Fertility | Ounces per feed/day from weight (≈2.5 oz/lb/day) and feeds per day, incl. formula. | মোটামুটি | 3 |
| 22 | dri calculator | Food & Drink | Diet, Macro & Meal Planning | USDA/NIH Dietary Reference Intakes (vitamins, minerals, fibre, water) by age, sex and pregnancy. | নিশ্চিত | 5 |
| 23 | net carbs calculator | Food & Drink | Diet, Macro & Meal Planning | Net carbs = total carbs − fibre − sugar alcohols (with the erythritol/half rule). Keto tool sets targets, it doesn't do this subtraction. | নিশ্চিত | 2 |
| 24 | glycemic load calculator | Food & Drink | Food Nutrition & Calorie | GL = GI × available carbs ÷ 100 with low/medium/high bands, plus a GI lookup list. | নিশ্চিত | 2 |
| 25 | unit price calculator | Shopping | Discount, Tip & Unit Price | Compare 2–4 items by price per unit (oz, lb, g, count, roll); shows the best deal. Only per-ounce/per-pound tools exist. | নিশ্চিত | 8 |
| 26 | poker odds calculator | Sports | Sports Betting & Racing | Texas Hold'em equity/outs, pot odds and implied odds; hand-ranking helper. Alternative: Arts > Fun. | মোটামুটি | 19 |
| 27 | roulette calculator | Sports | Sports Betting & Racing | Bet probability, payout (35:1 etc.) and house edge for American/European wheels. | নিশ্চিত | 5 |
| 28 | lottery odds calculator | Finance | Tax | Jackpot and prize-tier odds for Powerball, Mega Millions and custom pick-N games. Placed next to lottery-tax/payout; alternative: Statistics. | মোটামুটি | 2 |
| 29 | gematria calculator | Arts & Entertainment | Tarot, Astrology & Fun | Hebrew, English, simple and Greek (isopsephy) letter values of a word. Only vowels numerology exists. | নিশ্চিত | 11 |
| 30 | 5e point buy calculator | Arts & Entertainment | Tarot, Astrology & Fun | D&D 5e 27-point buy with racial bonuses and modifiers; next to the dnd-dpr tool. | নিশ্চিত | 9 |
| 31 | dnd hp calculator | Arts & Entertainment | Tarot, Astrology & Fun | 5e hit points by class hit die, level and CON (average or max). | নিশ্চিত | 11 |
| 32 | 5e combat calculator | Arts & Entertainment | Tarot, Astrology & Fun | Encounter difficulty and XP budget from party levels and monster CRs. | মোটামুটি | 2 |
| 33 | kd ratio calculator | Arts & Entertainment | Tarot, Astrology & Fun | K/D, KDA and kills needed to reach a target ratio. Alternative: Shopping > Electronics (eDPI lives there). | মোটামুটি | 5 |
| 34 | minecraft stack calculator | Arts & Entertainment | Tarot, Astrology & Fun | Items ↔ stacks of 64/16, shulker boxes and chests. Next to minecraft-xp. | নিশ্চিত | 4 |
| 35 | minecraft circle calculator | Arts & Entertainment | Tarot, Astrology & Fun | Block-by-block circle/sphere layout for a given diameter. | নিশ্চিত | 1 |
| 36 | korean age calculator | Arts & Entertainment | Tarot, Astrology & Fun | East Asian age reckoning (Korean/Chinese lunar 'sui') vs international age. Alternative: Science > Math. | মোটামুটি | 3 |
| 37 | half birthday calculator | Arts & Entertainment | Tarot, Astrology & Fun | Date six months after a birthday, with a countdown. | মোটামুটি | 1 |
| 38 | american flag dimensions calculator | Arts & Entertainment | Tarot, Astrology & Fun | US flag proportions (hoist 1.0 : fly 1.9, union, stripes, star sizes) for any hoist. Alternative: House & Garden. | অনিশ্চিত | 5 |
| 39 | 5 star rating calculator | Business & Industrial | HR, Marketing & Business Operations | Average rating from 1–5 star counts and the 5-star reviews needed to reach a target. | নিশ্চিত | 3 |
| 40 | meeting cost calculator | Business & Industrial | HR, Marketing & Business Operations | Attendees × hourly cost × duration, per meeting and per year. | নিশ্চিত | 1 |
| 41 | safety stock calculator | Business & Industrial | Freight, Logistics & Warehouse | Safety stock = Z × σ_demand × √lead time (and the max-min method). Reorder point already exists. | নিশ্চিত | 1 |
| 42 | valve cv calculator | Business & Industrial | Manufacturing, Metals & Engineering | Flow coefficient Cv from GPM, ΔP and specific gravity (liquid and gas). | নিশ্চিত | 4 |
| 43 | intrinsic value calculator | Finance | Investment > Stock & Options | DCF / Graham-number fair value per share and margin of safety. | নিশ্চিত | 2 |
| 44 | capm calculator | Finance | Investment > Investment Returns & Planning | Expected return = rf + β(Rm − rf). | নিশ্চিত | 1 |
| 45 | mirr calculator | Finance | Investment > Investment Returns & Planning | Modified IRR from cash flows, finance rate and reinvestment rate. | নিশ্চিত | 1 |
| 46 | profitability index calculator | Finance | Investment > Investment Returns & Planning | PI = PV of future cash flows ÷ initial investment. | নিশ্চিত | 1 |
| 47 | book value calculator | Finance | Investment > Stock & Options | Book value and book value per share = (assets − liabilities − preferred) ÷ shares. The comic-book tool is unrelated. | মোটামুটি | 1 |
| 48 | angle calculator | Science | Math | Complementary, supplementary, vertical and exterior angles from one known angle. | মোটামুটি | 11 |
| 49 | interval notation calculator | Science | Math | Inequality ↔ interval notation, union/intersection of intervals. The existing 'interval' tool is music intervals. | নিশ্চিত | 9 |
| 50 | scale factor calculator | Science | Math | Scale factor between similar figures, scale drawings (1:50) and scaling a length/area/volume. | নিশ্চিত | 8 |
| 51 | diagonal of rectangle calculator | Science | Math | Diagonal of a rectangle/square from sides (and sides from diagonal + aspect). | নিশ্চিত | 6 |
| 52 | degrees minutes seconds calculator | Science | Math | Decimal degrees ↔ DMS and add/subtract DMS angles. | নিশ্চিত | 3 |
| 53 | orthocenter calculator | Science | Math | Orthocenter, circumcenter, incenter and centroid from three vertices (centroid tool exists for areas). | নিশ্চিত | 2 |
| 54 | golden ratio calculator | Science | Math | Split a length into φ parts / golden rectangle. golden-ratio-physique is a fitness tool. | নিশ্চিত | 2 |
| 55 | fibonacci calculator | Science | Math | nth Fibonacci number and sequence list. The existing Fibonacci tools are trading/betting. | নিশ্চিত | 1 |
| 56 | pie chart calculator | Science | Statistics & Probability | Values → percentages and degrees per slice, with the chart. | নিশ্চিত | 1 |
| 57 | day of the year calculator | Science | Math | Day number (1–366) of a date and days left in the year; date-calculator doesn't show this. | নিশ্চিত | 2 |
| 58 | leap year calculator | Science | Math | Is a year a leap year, plus leap years in a range. | নিশ্চিত | 1 |
| 59 | energy conversion calculator | Science | Physics | Joules ↔ kWh, calories, BTU, eV, ft-lb. unit-converter has no energy units. | মোটামুটি | 2 |
| 60 | lattice energy calculator | Science | Chemistry | Born–Landé / Kapustinskii lattice energy from ion charges and radii. | নিশ্চিত | 1 |
| 61 | hp to amps calculator | Science | Electrical & Electronics Engineering | Motor HP → full-load amps for DC, 1-phase and 3-phase with efficiency and PF. | নিশ্চিত | 1 |
| 62 | antipode calculator | Science | Earth, Weather & Environment | Point on the opposite side of the Earth from a lat/long. | নিশ্চিত | 1 |
| 63 | race predictor calculator | Sports | Running | Riegel formula: predict a 5K/10K/half/marathon time from a recent race. | নিশ্চিত | 2 |
| 64 | arrow speed calculator | Sports | Other Sports | Real arrow fps from IBO rating, draw length, draw weight and arrow weight. | নিশ্চিত | 4 |
| 65 | bowling average calculator | Sports | Other Sports | Average from game scores (total pins ÷ games); handicap tool needs this as input. | নিশ্চিত | 1 |
| 66 | pig gestation calculator | Business & Industrial | Agriculture & Livestock | Sow farrowing date (114 days). Next to cattle/goat/lamb gestation. guinea-pig-gestation is a different animal. | নিশ্চিত | 3 |
| 67 | face shape calculator | Shopping | Clothing, Shoe & Ring Size | Face shape from length/width measurements, for glasses and hairstyles; next to body-shape. | মোটামুটি | 2 |
| 68 | quilt backing calculator | House & Garden | Flooring, Tile, Paint & Interior | Backing yardage (with seams and overhang) and binding strips/yardage. Next to fabric-yardage. | নিশ্চিত | 6 |
| 69 | circle skirt calculator | House & Garden | Flooring, Tile, Paint & Interior | Waist radius and fabric needed for full, half and quarter circle skirts. | মোটামুটি | 2 |
| 70 | weighted blanket calculator | Shopping | Lifestyle, Party & Wedding | Blanket weight ≈ 10% of body weight, plus size. | মোটামুটি | 1 |

## C. বাদ দেওয়া বা Merge করা Keywords

### C1. Merged into a new tool (secondary keywords)

| Keyword | সিদ্ধান্ত ও কারণ | রাখা মূল Tool |
|---|---|---|
| mg to ml calculator, dosage calculator, ml to mg calculator, dose calculator mg/ml, dose calculator, easy drug dose calculator, pediatric dose calculator, mg to ml conversion calculator, pediatric dosing calculator, convert mg to ml calculator, milligrams to milliliters calculator, anesthesia dosage calculator, mg per kg dosage calculator, amoxicillin pediatric dosage calculator, med math calculator, drug calculator, amoxicillin pediatric dose calculator, drug dose calculator, medication dosage calculator, ibuprofen dose child per kg calculator, medication calculator, amoxicillin dosage calculator, amoxicillin calculator, mg/kg calculator, mg/ml calculator, peds dosing calculator, medication dose calculator, ibuprofen dosage calculator, iu calculator, med dose calculator | Same calculation / wording variation | drug-dosage-calculator |
| refill calculator, prescription calculator, days supply calculator, med refill calculator, day supply calculator, 28 day prescription refill calculator, medication refill calculator, pill calculator, refill date calculator, 30 day prescription refill calculator, pill refill calculator, rx refill calculator, rx calculator | Same calculation / wording variation | prescription-refill-calculator |
| medicine 3 times a day calculator | Same calculation / wording variation | medication-schedule-calculator |
| drop factor calculator | Same calculation / wording variation | iv-drip-rate-calculator |
| insulin calculator, insulin correction dose calculator | Same calculation / wording variation | insulin-dose-calculator |
| ldl calculator, total cholesterol calculator, cholesterol calculator, triglycerides to hdl ratio calculator, tc/hdl ratio calculator, triglyceride to hdl ratio calculator, ldl cholesterol calculator, triglyceride hdl ratio calculator, hdl ldl ratio calculator, lipid calculator | Same calculation / wording variation | ldl-cholesterol-calculator |
| map calculator, bp map calculator, map bp calculator, map calculator for bp, blood pressure map calculator, map calculator nursing, mean bp calculator, mean arterial pressure calculator | Same calculation / wording variation | mean-arterial-pressure-calculator |
| bp calculator, average blood pressure calculator, pediatric blood pressure calculator | Same calculation / wording variation | blood-pressure-calculator |
| anc calculator, anc calculator without bands, eosinophil calculator, neutropenia calculator, absolute eosinophil calculator, eosinophil count calculator | Same calculation / wording variation | absolute-neutrophil-count-calculator |
| fick calculator, cardiac index calculator, fick cardiac output calculator | Same calculation / wording variation | cardiac-output-calculator |
| insulin resistance calculator, homa calculator | Same calculation / wording variation | homa-ir-calculator |
| qtcf calculator | Same calculation / wording variation | qtc-calculator |
| adjusted bw calculator, adjusted weight calculator, adjbw calculator, abw calculator | Same calculation / wording variation | adjusted-body-weight-calculator |
| mmol/l to mg/dl calculator | Same calculation / wording variation | blood-sugar-converter-calculator |
| pack year history calculator, pack years calculator | Same calculation / wording variation | pack-year-calculator |
| vertex distance calculator, vertex calculator contacts, cl vertex calculator, vertex contact lens calculator, contact vertex calculator, contact lens prescription calculator | Same calculation / wording variation | contact-lens-vertex-calculator |
| specificity calculator, precision calculator | Same calculation / wording variation | sensitivity-specificity-calculator |
| birth weight percentile calculator, fetal weight percentile calculator, head circumference percentile calculator, child height percentile calculator, newborn percentile calculator, height weight percentile boy calculator | Same calculation / wording variation | baby-growth-percentile-calculator |
| adjusted age calculator, prematurity calculator, corrected gestational age calculator, premature corrected age calculator, premature age calculator | Same calculation / wording variation | corrected-age-calculator |
| baby formula calculator, premature baby feeding calculator | Same calculation / wording variation | breast-milk-intake-calculator |
| micronutrient calculator, usda dri calculator, dri calculator for healthcare professionals, nutrients calculator | Same calculation / wording variation | dri-calculator |
| net carb calculator | Same calculation / wording variation | net-carbs-calculator |
| glycemic index calculator | Same calculation / wording variation | glycemic-load-calculator |
| unit rate calculator, price per unit calculator, price per weight calculator, price per item calculator, price per round calculator, price comparison calculator, cost comparison calculator | Same calculation / wording variation | unit-price-calculator |
| implied odds calculator, poker probability calculator, hold em odds calculator, poker equity calculator, poker calculator odds, texas hold em calculator, online poker calculator, poker percentage calculator, which poker hand wins calculator, odds calculator poker, cardplayer odds calculator, texas hold'em odds calculator, texas holdem odds calculator, texas holdem calculator, poker calculator, holdem odds calculator, poker hand odds calculator, poker hands calculator, holdem calculator | Same calculation / wording variation | poker-odds-calculator |
| roulette payout calculator, roulette odds calculator, 35 to 1 payout calculator, roulette probability calculator | Same calculation / wording variation | roulette-calculator |
| powerball odds calculator | Same calculation / wording variation | lottery-odds-calculator |
| greek gematria calculator, hebrew gematria calculator, greek calculator, word value calculator, best gematria calculator, english gematria calculator, simple gematria calculator, free gematria calculator, jewish gematria calculator, gematria calculator hebrew | Same calculation / wording variation | gematria-calculator |
| point buy calculator, point buy calculator 5e, dnd point buy calculator, dnd 5e point buy calculator, point buy 5e calculator, ability score calculator, 5e stat calculator, dnd ability score calculator | Same calculation / wording variation | dnd-point-buy-calculator |
| hp calculator 5e, 5e hp calculator, dnd health calculator, dnd 5e hp calculator, dnd hit point calculator, hp calculator dnd, health calculator 5e, 5e health calculator, hit point calculator, hit point calculator 5e | Same calculation / wording variation | dnd-hp-calculator |
| xp calculator 5e | Same calculation / wording variation | dnd-encounter-xp-calculator |
| kd calculator, kda calculator, k/d calculator, kill death ratio calculator | Same calculation / wording variation | kd-ratio-calculator |
| stack calculator, minecraft block calculator, stack calculator minecraft | Same calculation / wording variation | minecraft-stack-calculator |
| lunar age calculator, chinese lunar age calculator | Same calculation / wording variation | korean-age-calculator |
| flag calculator, american flag calculator, flag dimension calculator, us flag calculator | Same calculation / wording variation | flag-dimensions-calculator |
| star rating calculator, 5 star review calculator | Same calculation / wording variation | star-rating-calculator |
| swagelok cv calculator, cv flow calculator, cv cv calculator | Same calculation / wording variation | valve-cv-calculator |
| stock valuation calculator | Same calculation / wording variation | intrinsic-value-calculator |
| supplementary angles calculator, angle finder calculator, exterior angle theorem calculator, exterior angle calculator, angles calculator, trapezoid angle calculator, angle relationships calculator, angle measure calculator, geometry calculator angles, vertical angle calculator | Same calculation / wording variation | angle-relationships-calculator |
| union and intersection of intervals calculator, inequality to interval notation calculator, intervals calculator, interval notation graph calculator, solution set calculator, inequality notation calculator, number of solutions calculator, find the solution set calculator | Same calculation / wording variation | interval-notation-calculator |
| scale calculator, similar triangles calculator, similar figures calculator, resolution scale calculator, scaling calculator, scale ratio calculator, scale drawing calculator | Same calculation / wording variation | scale-factor-calculator |
| diagonal calculator, diagonal measurement calculator, diagonal of a square calculator, rectangle diagonal calculator, square diagonal calculator | Same calculation / wording variation | rectangle-diagonal-calculator |
| dms calculator, degree minute second calculator | Same calculation / wording variation | dms-calculator |
| circumcenter calculator | Same calculation / wording variation | triangle-centers-calculator |
| golden rectangle calculator | Same calculation / wording variation | golden-ratio-calculator |
| day of year calculator | Same calculation / wording variation | day-of-the-year-calculator |
| joules calculator | Same calculation / wording variation | energy-converter-calculator |
| race prediction calculator | Same calculation / wording variation | race-time-predictor-calculator |
| bow speed calculator, arrow fps calculator, bow fps calculator | Same calculation / wording variation | arrow-speed-calculator |
| swine gestation calculator, sow gestation calculator | Same calculation / wording variation | pig-gestation-calculator |
| face calculator | Same calculation / wording variation | face-shape-calculator |
| quilt binding calculator, backing calculator, backing calculator quilt, quilt back calculator, backing fabric calculator | Same calculation / wording variation | quilt-backing-calculator |
| half circle skirt calculator | Same calculation / wording variation | circle-skirt-calculator |

### C2. Already built (mapped to an existing tool)

| রাখা মূল Tool | Category | kw | Keywords |
|---|---|---|---|
| `date-calculator` | Science > Math | 121 | day calculator, month calculator, 90 day calculator, business day calculator, anniversary calculator, date calculator between two dates, week calculator, days until calculator, weeks calculator, months calculator, deadline calculator, days between calculator, dates calculator, working days calculator, how many years calculator, countdown calculator, week calculator from date, 60 day calculator, time calculator between dates, day calculator between dates, time between dates calculator, days calculator between two dates, calendar days calculator, number of weeks calculator, years calculator, 180 day calculator, 30 day calculator, workday calculator, working day calculator, day date calculator, between dates calculator, days before calculator, how many weeks calculator, 90 days calculator, expiration date calculator, 120 day calculator, 45 day calculator, date countdown calculator, time until calculator, days in between calculator, 6 month calculator, months to years calculator, days to years calculator, date duration calculator days between dates, manufacturing date and expiry date calculator, month calculator from date, how many years have i been married calculator, workdays calculator, retirement countdown calculator, weeks calculator between dates, weeks between dates calculator, 180 days calculator, date calculator days, week counter calculator, 60 day calendar calculator, months between dates calculator, date between calculator, add days calculator, calendar calculator between dates, calculator days, days difference calculator, business days calculator – count workdays, day difference calculator, weeks until calculator, calculator days between dates, how many years calculator years ago, days to date calculator, day calendar calculator, date counter calculator, calculator between dates, date calculator count days, day time calculator, date calculator days between, 60 days calculator, retirement date calculator, weeks to months calculator, work days calculator, sober time calculator, days to months calculator, date between two dates calculator, calendar duration calculator, days out calculator, days duration calculator, sober date calculator, wedding anniversary calculator, sobriety date calculator, work day calculator, how many days calculator, how many months calculator, day of the week calculator, days since calculator, days between dates calculator, date days calculator, days calculator between dates, days elapsed calculator, legal date calculator, how many days since calculator, how many days until calculator, date range calculator, day of week calculator, days from now calculator, date calculator between, dates between calculator, day to day calculator, date calculator between 2 dates, date calculator, day countdown calculator, days from calculator, date calculator difference, date calculator between dates, date to date calculator, day counter calculator, day count calculator, days till calculator, date time calculator, calculator calendar, date calendar calculator, time date calculator, business date calculator, date from calculator, calender calculator |
| `lottery-tax-calculator` | Finance > Tax | 108 | lottery calculator, lottery tax calculator, powerball calculator, lotto calculator, mega millions calculator, taxes on lottery winnings calculator, lottery winnings calculator, powerball tax calculator, lottery calculator by state, lotto tax calculator, best lottery calculator, omni lottery tax calculator, mega millions tax calculator, mega million calculator, powerball jackpot calculator, omni lottery calculator, lottery taxes calculator, lottery winnings tax calculator, lottery jackpot calculator, lottery tax calculator by state, omni calculator lottery, tax lottery calculator, lottery calculator after taxes, michigan lottery calculator, lotto america calculator, lottery calculator tax, omni powerball calculator, illinois lottery tax calculator, lottery winning calculator, megamillion calculator, mega millions jackpot calculator, oregon lottery calculator, powerball lottery calculator, jackpot calculator, after lottery tax calculator, powerball winnings calculator, lottery calculator az, powerball winning calculator, mega million tax calculator, lottery after taxes calculator, ohio lottery calculator, powerball calculator by state, afterlotto calculator, powerball after taxes calculator, florida lottery calculator, lottery winning tax calculator, lottery after tax calculator, nc lottery tax calculator, lottery calculator michigan, lotto america tax calculator, california lottery tax calculator, lottery critic calculator, powerball calculator tax, nj lottery calculator, louisiana lottery calculator, nj lottery tax calculator, after tax lottery calculator, lottery calculator california, illinois lottery calculator, virginia lottery calculator, pa lottery tax calculator, lottery calculator nj, lottery tax calculator michigan, lottery win tax calculator, best lottery tax calculator, florida lotto calculator, lottery calculator powerball, mega millions lottery calculator, arizona lottery tax calculator, lottery calculator florida, powerball taxes calculator, powerball analysis calculator, michigan lottery tax calculator, az lottery calculator, ny lotto calculator, powerball calculator after taxes, georgia lottery calculator, ca lottery calculator, lottery calculator ny, oregon lottery tax calculator, ca lottery tax calculator, ny lottery calculator, lottery calculator texas, after lotto tax calculator, lotto calculator after taxes, pa lottery calculator, ohio lottery tax calculator, powerball tax calculator by state, powerball after tax calculator, texas lotto calculator, lottery calculator ohio, powerball jackpot tax calculator, lottery tax calculator nj, afterlotto lottery calculator, lottery tax calculator powerball, florida lottery tax calculator, fl lotto calculator, taxes on sweepstakes winnings calculator, ga lottery tax calculator, virginia lottery tax calculator, lottery tax calculator ohio, texas lottery calculator, mega millions after taxes calculator, taxes on prize winnings calculator, va lottery calculator, lottery calculator georgia, after lottery calculator, after lotto calculator |
| `teacher-grading-calculator` | Jobs & Education > Grade | 72 | test grade calculator, test calculator, test score calculator, grade calculator test, grading calculator, grade percentage calculator, quiz grade calculator, test percentage calculator, grade average calculator, teacher calculator, percentage grade calculator, score calculator, quiz calculator, grade calculator points, test grade percentage calculator, teacher grade calculator, grade calculator percentage, assignment grade calculator, test calculator grade, grading scale calculator, grade calculator, test grader calculator, grade test calculator, quiz score calculator, test average calculator, grade scale calculator, if my grade average calculator, test grading calculator, percent grade calculator, raw score calculator, teacher grading calculator, garde calculator, average score calculator, testing calculator, free grade calculator, grade percent calculator, percentage calculator grades, letter grade calculator, online grade calculator, gradebook calculator, grade score calculator, grading calculator for teachers, grade calculator point based, total grade calculator, school grade calculator, extra credit calculator, teacher grader calculator, what is my grade calculator, grade calculator with percentages, percentage calculator grade, grade calculator after test, grade calculator based on points, what would my grade be calculator, grade calculator for teachers, grading papers calculator, grde calculator, teacher percentage calculator, grading percentage calculator, grade calculator with points, percentage calculator for grades, score average calculator, points based grade calculator, grade after test calculator, whats my grade calculator, free grading calculator, grade calculator points based, grade book calculator, my grade calculator, teachers calculator, points grade calculator, online grading calculator, point grade calculator |
| `unit-converter-calculator` | Science > Math | 70 | mph calculator, ounce calculator, miles per hour calculator, oz calculator, pounds and ounces calculator, conversion calculator, length conversion calculator, cm calculator, liquid volume calculator, newton calculator, metric to standard calculator, metric to imperial calculator, ml to oz calculator, grams to fluid ounces calculator, liquid conversion calculator, grams to ounces calculator, mcg to mg calculator, metric conversion to inches calculator, metric to inches calculator, conversions calculator, liters to pounds calculator, newtons calculator, ml to ounces calculator, ounces calculator, km to miles calculator, grams to liters calculator, oz to ml calculator, mm calculator, kg to newtons calculator, metric to standard conversion calculator, ml to ul calculator, imperial calculator, volume conversion calculator, lbs calculator, pounds calculator, pound calculator, ml calculator, speed conversion calculator, meters per second calculator, square feet to yards calculator, grams calculator, miles per minute calculator, conversion factor calculator, measurement calculator inches, distance conversion calculator, grams to oz calculator, kilometers to miles calculator, feet to miles calculator, metric system calculator, oz to lbs calculator, ounces to pounds calculator, liters to gallons calculator, mg calculator, volume weight calculator, pounds to ounces calculator, cm to mm calculator, kilograms to pounds calculator, grams to pounds and ounces calculator, pounds to grams calculator, m/s calculator, in to cm calculator, ounces to ml calculator, kg to lb calculator, ounces to grams calculator, oz to grams calculator, weight conversion calculator, calculator converter, decimal to inches conversion calculator, online conversion calculator, measurement conversion calculator |
| `percentage-change-calculator` | Science > Math | 63 | percentage increase calculator, percent increase calculator, percent change calculator, percent gain calculator, percentage decrease calculator, percent decrease calculator, increase calculator, % change calculator, % increase calculator, percent growth calculator, increase percentage calculator, price increase calculator, percentage gain calculator, percentage growth calculator, salary increase percentage calculator, percent of change calculator, percent reduction calculator, decrease calculator, month over month calculator, percentage change calculator, growth percentage calculator, salary percentage increase calculator, percentage calculator increase, percentage of increase calculator, percentage of change calculator, percentage reduction calculator, decrease percentage calculator, price increase percentage calculator, price change calculator, percent improvement calculator, week over week calculator, percent loss calculator, gain calculator, rate increase calculator, premium increase calculator, net change calculator, yearly percentage increase calculator, percent return calculator, percentage of growth calculator, cost increase calculator, increase decrease calculator, percent change in mass calculator, percentage loss calculator, rate change calculator, omni percentage increase calculator, increase calculator percentage, change percentage calculator, change in percentage calculator, reducing calculator, price decrease calculator, sales increase calculator, % decrease calculator, percentage drop calculator, reduction calculator, annual increase calculator, percentage calculator change, percentage increase decrease calculator, percentage increase or decrease calculator, percent calculator change, increase and decrease calculator, percent weight change calculator, percent calculator increase, pay increase percentage calculator |
| `slope-calculator` | Science > Math | 54 | slope calculator, slope intercept form calculator, point slope form calculator, line equation from two points calculator, gradient calculator, rise over run calculator, point slope calculator, perpendicular line calculator, slope intercept calculator, standard form to slope intercept form calculator, line calculator, standard to slope intercept form calculator, wheelchair ramp slope calculator, slope point calculator, slope formula calculator, slope grade calculator, rise and run calculator, y intercept calculator, point slope formula calculator, grade slope calculator, general form calculator, slope finder calculator, line equation calculator, point-slope form calculator, equation of a line calculator, driveway slope calculator, standard form calculator slope, slope intercept formula calculator, slope-intercept form calculator, point slope equation calculator, slope intercept to standard form calculator, parallel line calculator, find the slope calculator, finding slope calculator, slope intercept equation calculator, slope calculator rise over run, slope of line calculator, slope and point calculator, find y-intercept calculator, slope and intercept calculator, slope equation calculator, y = mx + b calculator, intercept form calculator, slope and y-intercept calculator, find slope calculator, slope from two points calculator, convert to standard form calculator, slope calculator from two points, explicit equation calculator, write an equation in slope intercept form calculator, slope and y intercept calculator, x and y intercept calculator, parallel lines calculator, graph the line with slope passing through the point calculator |
| `time-calculator` | Science > Math | 52 | minute calculator, hours calculator, minutes calculator, add time calculator, adding time calculator, time addition calculator, time calculator, time adding calculator, time adder calculator, minutes to hours calculator, subtract time calculator, time add calculator, hours until calculator, adding minutes calculator, hours to days calculator, clock duration calculator, time math calculator, trip calculator time, add hours calculator, time calculator add, time calculator division, minutes to seconds calculator, add up time calculator, minutes calculator add, add times calculator, add minutes calculator, time subtraction calculator, time calculator physics, adding times calculator, time calculator multiply, hour addition calculator, time calculator subtract, add minutes and seconds calculator, adding minutes and seconds calculator, time between two times calculator, time calculator between times, time to hours calculator, mins to hours calculator, hour difference calculator, time from calculator, calculator time, seconds to minutes calculator, calculator for hours and minutes, days to hours calculator, elapsed time calculator, minute and second calculator, add time together calculator, minute to hour calculator, time.duration calculator, seconds calculator, time between calculator, difference in time calculator |
| `area-calculator` | Science > Math | 51 | area calculator, perimeter calculator, trapezoid calculator, trapezoid area calculator, area calculator rectangle, cross sectional area calculator, area of a quadrilateral calculator, quadrilateral calculator, isosceles trapezoid calculator, area of semicircle calculator, irregular polygon area calculator, area of a trapezoid calculator, area of a semicircle calculator, area of irregular polygon calculator, rectangle calculator, area of quadrilateral calculator, perimeter of a rectangle calculator, oval area calculator, m2 calculator, area of a rectangle calculator, area and perimeter calculator, area of a square calculator, area of parallelogram calculator, parallelogram area calculator, irregular trapezoid area calculator, square meter calculator, square inch calculator, square meters calculator, hexagon area calculator, length and width calculator, perimeter and area calculator, rhombus calculator, rectangle area calculator, area of a kite calculator, pentagon area calculator, octagon area calculator, area of rectangle calculator, area of a pentagon calculator, area of hexagon calculator, area of a hexagon calculator, roofing area calculator, kite calculator, sq inch calculator, kite area calculator, area of square calculator, square inches calculator, rectangle perimeter calculator, square yardage calculator, sq calculator, pipe area calculator, parallelogram calculator |
| `percentage-calculator` | Science > Math | 50 | average percentage calculator, time percentage calculator, omni percentage calculator, decimal to percent calculator, fraction to percent calculator, money percentage calculator, percentage to goal calculator, percentage calculator online, percentage calculator money, stock percentage calculator, winning percentage calculator with ties, fraction to percentage calculator, online percentage calculator, decimal to percentage calculator, add percentage calculator, percent to goal calculator, percent calculator money, the percent calculator, percent of total calculator, average calculator percentage, percentage calculator between two numbers, the percentage calculator, % of calculator, percentage of number calculator, pecentage calculator, what percentage calculator, price percentage calculator, find percentage calculator, percetage calculator, percebtage calculator, percent of number calculator, calculator percentage, is of calculator, percentage of total calculator, percetnage calculator, what percent calculator, google percentage calculator, percentage of a number calculator, google percent calculator, percentage calculators, online percent calculator, odds calculator percentage, percent of calculator, percentage calculator, percent proportion calculator, percent of a number calculator, calculator with percentage, precentage calculator, percentages calculator, 3 way percentage calculator |
| `fraction-calculator` | Science > Math | 46 | decimal to fraction calculator, common denominator calculator, lcd calculator, dividing fractions calculator, mixed number fraction calculator, least common denominator calculator, multiply fractions calculator, equivalent fractions calculator, lowest common denominator calculator, subtracting fractions calculator, divide fractions calculator, fraction multiplication calculator, lowest terms calculator, lowest term calculator, inches to fraction calculator, compare fractions calculator, improper fraction to mixed number calculator, fraction simplify calculator, comparing fractions calculator, reduce fractions calculator, mixed number to improper fraction calculator, fraction subtraction calculator, fraction in lowest terms calculator, inch fraction calculator, multiplying 3 fractions calculator, division fraction calculator, subtract fractions calculator, multiply fraction calculator, fraction equivalent calculator, which fraction is bigger calculator, fractions calculator mixed numbers, multiple fraction calculator, fractions and whole numbers calculator, fraction calculator google, fraction calculator division, convert decimal to fraction calculator, decimals to fractions calculator, equivalent fraction calculator, multiply mixed numbers calculator, multiplying fractions calculator, reduced fraction calculator, fraction division calculator, simplified fraction calculator, fraction reducer calculator, fraction to decimal calculator, percentage to fraction calculator |
| `age-calculator` | Science > Math | 39 | age calculator of baby, age calculator of dob, age calculator of child, date of birth calculator, age calculator of death, age calculator on year, what year was i born if i was 16 calculator, birth date calculator, birth year calculator, age calculator by year, what year was i born calculator, age in months calculator, birthdate calculator, days old calculator, date of birth calculator year, age calculator by birthdate, baby age calculator weeks to months, baby age calculator, baby month calculator, age in days calculator, days alive calculator, age calculator birthday, age in weeks calculator, age calculator based on birthday, how many days old am i calculator, birth day calculator, birthday year calculator, age calculator based on date of birth, age birthday calculator, age calculator by birthday, how old was i calculator, how many days have i been alive calculator, what day of the week was i born calculator, death calculator by date of birth, max heart rate calculator by age, death day calculator, age date calculator, blood pressure calculator by age, birthday age calculator |
| `lottery-payout-calculator` | Finance > Tax | 39 | lottery annuity calculator, powerball annuity calculator, lottery payout calculator, 30 year lottery annuity payout calculator, powerball payout calculator, mega millions payout calculator, mega millions annuity calculator, lottery annuity payout calculator, lotto annuity calculator, annuity calculator lottery, lump sum lottery payout calculator, lotto payout calculator, powerball annuity payout calculator, lottery take home calculator, powerball take home calculator, annuity calculator powerball, annuity lottery calculator, lottery lump sum vs annuity calculator, powerball cash option calculator, powerball lump sum calculator, lottery amortization calculator, mega million payout calculator, powerball payout after taxes calculator, powerball payout calculator by state, lottery lump sum calculator, lotto america payout calculator, powerball calculator payout, mega millions calculator payout, powerball payment calculator, mega millions cash option calculator, mega million annuity calculator, powerball lottery payout calculator, lottery payout calculator by state, powerball cash payout calculator, florida lottery payout calculator, powerball net payout calculator, lottery payment calculator, powerball jackpot annuity calculator, powerball jackpot payout calculator |
| `discount-calculator` | Finance | 37 | percent off calculator, discount calculator, percentage off calculator, percentage discount calculator, discount calculator online, sale calculator, discount percentage calculator, off calculator, markdown calculator, percent discount calculator, percent savings calculator, omni discount calculator, percentage calculator off, % off calculator, percent calculator off, 10 off calculator, percent off price calculator, percentage off price calculator, coupon calculator, calculator discount, sale percentage calculator, sale price calculator, discount price calculator, percentage savings calculator, sales discount calculator, price discount calculator, sales price calculator, discount calculator with tax, calculator percent off, 50 off calculator, 30 off calculator, 20 off calculator, 20 percent off calculator, original price calculator, 40 off calculator, 25 off calculator, discount percent calculator |
| `basic-calculator` | Science > Scientific & Graphing | 35 | reciprocal calculator, perfect square calculator, expanded form calculator, least to greatest calculator, standard notation calculator, decimal calculator, greatest to least calculator, place value calculator, collatz conjecture calculator, decimals calculator, greater than less than calculator, greater than or less than calculator, greater or less than calculator, divisibility calculator, greater than calculator, consecutive integers calculator, divisible calculator, negative number calculator, ascending order calculator, number line calculator, greater than or equal to calculator, calculator decimal, subtraction calculator, arithmetic calculator, dividing integers calculator, decimal to whole number calculator, comparing decimals calculator, cubing calculator, difference of perfect squares calculator, addition calculator, negative and positive calculator, divide calculator, adding decimals calculator, division calculator, dividing calculator |
| `height-genetics-calculator` | Science > Biology & Lab | 32 | height calculator, future height calculator, adult height calculator, height calculator boys, height predictor calculator, height prediction calculator, calculator height, how tall will i be calculator, projected height calculator, hight calculator, accurate height calculator, midparental height calculator, predicted height calculator, height calculator girls, hieght calculator, height growth calculator, estimated height calculator, height. calculator, heigh calculator, height calculator based on parents, heigjt calculator, potential height calculator, most accurate height calculator, are height calculators accurate, height potential calculator, average height calculator, height projection calculator, tall calculator, human height calculator, target height calculator, how tall will my child be calculator, genetics calculator |
| `circle-calculator` | Science > Math | 30 | circumference calculator, radius calculator, diameter to circumference calculator, circle calculator, circumference to diameter calculator, circle equation calculator, diameter calculator, circle area calculator, center radius form calculator, area of circle calculator, circumference to radius calculator, area of a circle calculator, equation of a circle calculator, circumference of a circle calculator, area calculator circle, radius of a circle calculator, diameter to radius calculator, circumference diameter calculator, circle circumference calculator, circumfrence calculator, area circle calculator, circle radius calculator, diameter calculator from circumference, diameter circumference calculator, circle calculator minecraft, diameter to area calculator, diameter of a circle calculator, radius of circle calculator, circle diameter calculator, circumference formula calculator |
| `bmi-calculator` | Sports > Sports Performance | 28 | bmi calculator women age, geriatric bmi calculator, womens bmi calculator, bmi calculator for seniors, bmi older woman calculator by age, bmi calculator for women over 60, men's bmi calculator, bmi women calculator, women's bmi calculator, mens bmi calculator, bmi older woman calculator, female bmi calculator with age, bmi calculator for senior women, weight to height ratio calculator, men bmi calculator, elderly bmi calculator, bmi calculator teenager, bmi calculator with age and gender, woman bmi calculator, bmi calculator for women with age, bmi calculator gender, bmi calculator females, bmi calculator army, senior bmi calculator, bmi calculator for females, women bmi calculator, bmi calculator for kids, bmi calculator with age |
| `right-triangle-calculator` | Science > Math | 27 | right triangle calculator, right angle calculator, right triangle angle calculator, special right triangle calculator, right angle triangle calculator, triangle side calculator, find the missing side of a triangle calculator, find missing side of triangle calculator, isosceles right triangle calculator, triangle calculator right, a2 + b2 = c2 calculator, missing side of a triangle calculator, triangle calculator right angle, missing angle calculator, right angle calculator triangle, right triangle calculator angle, 90 degree triangle calculator, a2+b2=c2 calculator, right triangle side calculator, right triangle length calculator, right triangle area calculator, area of right triangle calculator, triangle sides calculator, sides of a triangle calculator, side of a triangle calculator, right triangle hypotenuse calculator, area of a right triangle calculator |
| `tip-calculator` | Finance > Budget > Household & Family Expense | 27 | tip calculator, tip calculator google, tipping calculator, tip calculators, ez tip calculator, google tip calculator, tip percentage calculator, tip. calculator, calculator tip, tip calculator texas, free tip calculator, tips calculator, tip calculator usa, tip calculator california, tip calculator how much to tip, online tip calculator, easy tip calculator, tip calculator restaurant, tip calculator app, 20 tip calculator, tip calculator formula, restaurant tip calculator, simple tip calculator, tip calculator nyc, geekzilla.io tip calculator, free tip calculator app, delivery tip calculator |
| `final-grade-calculator` | Jobs & Education > Grade | 25 | exam grade calculator, omni grade calculator, omni test calculator, midterm calculator, semester exam calculator, exam calculator, grade calculator final, final.grade calculator, exam score calculator, exam average calculator, final grade calculator, exam calculator grade, final calculator grade, final geade calculator, midterm grade calculator, final exam calculator grade, final exam score calculator, final grade calculator weighted, grade final calculator, final calculator, finals grade calculator, final exam calculator, final score calculator, finals calculator, final test calculator |
| `triangle-calculator` | Science > Math | 25 | triangle calculator, isosceles triangle calculator, triangle angle calculator, solve the triangle calculator, triangle length calculator, equilateral triangle calculator, solve triangle calculator, triangle height calculator, hypotenuse of a triangle calculator, triangle hypotenuse calculator, triangle side length calculator, scalene triangle calculator, sss triangle calculator, triangle square foot calculator, triangle leg calculator, triangle sum theorem calculator, triangle perimeter calculator, trig triangle calculator, obtuse triangle calculator, height of a triangle calculator, perimeter of a triangle calculator, triangle calculator trig, angle of triangle calculator, height of triangle calculator, triangle solver calculator |
| `annual-income-calculator` | Jobs & Education > Salary, Income & Career | 24 | yearly income calculator, gross annual income calculator, annual net income calculator, total annual income calculator, annual income after taxes calculator, household income calculator, total income calculator, yearly gross income calculator, yearly pay calculator, gross income calculator yearly, gross monthly income calculator hourly, calculator for annual income, net annual income calculator, year income calculator, total gross annual income calculator, anual income calculator, income before taxes calculator, annual.income calculator, yearly earnings calculator, gross yearly income calculator, how much do i make a year calculator, gross income calculator hourly, total gross income calculator, gross earnings calculator |
| `gravel-calculator` | House & Garden > Gravel, Soil & Landscaping | 24 | gravel calculator, gravel driveway calculator, gravel calculator tons, omni gravel calculator, gravel coverage calculator, gravel calculator yards, gravel needed calculator, 3/4 stone calculator, gravel volume calculator, how much gravel do i need calculator, 2b stone calculator, gravel weight calculator, gravel calculator square feet, gravel base calculator, how much gravel calculator, material calculator gravel, 3/4 gravel calculator, driveway stone calculator, gravel yardage calculator, gravel ton calculator, sand and gravel calculator, 57 gravel calculator, yard calculator for gravel, stone calculator |
| `rounding-calculator` | Science > Math | 24 | round to the nearest tenth calculator, rounding calculator, round to the nearest thousand calculator, nearest tenth calculator, round calculator, round to the nearest hundredth calculator, nearest hundredth calculator, rounding numbers calculator, rounding to the nearest tenth calculator, round up calculator, round to the nearest hundred calculator, rounding to the nearest hundredth calculator, round to the nearest whole number calculator, round to the nearest ten thousand calculator, round to the nearest 100 calculator, round to nearest tenth calculator, round to the nearest thousandth calculator, decimal rounding calculator, rounding to the nearest whole number calculator, rounding decimals calculator, round numbers calculator, round whole numbers calculator, round off calculator, round number calculator |
| `pay-raise-percentage-calculator` | Jobs & Education > Salary, Income & Career | 22 | pay raise calculator, raise calculator, pay increase calculator, salary raise calculator, wage increase calculator, raise percentage calculator, pay raise calculator percent, percentage raise calculator, percent raise calculator, raise calculator salary, cost of living raise calculator, salary percentage calculator, pay rate increase calculator, merit increase calculator, raise increase calculator, 3 raise calculator, salary raise percentage calculator, annual raise calculator, pay raise calculator salary, pay raise calculator percentage, salary adjustment calculator, cola increase calculator |
| `inverse-trig-calculator` | Science > Math | 21 | trig function calculator, inverse tangent calculator, trig functions calculator, tan inverse calculator, inverse tan calculator, inverse cosine calculator, tan-1 calculator, sin inverse calculator, inverse trig calculator, tangent inverse calculator, sin-1 calculator, cosine inverse calculator, cos-1 calculator, inverse cos calculator, arccos calculator, inverse sine calculator, arctangent calculator, arctan calculator, inverse trig functions calculator, arcsin calculator, inverse sin calculator |
| `long-division-calculator` | Science > Math | 21 | remainder calculator, calculator with remainder, division calculator with remainder, division with remainders calculator, calculator with remainders, quotient and remainder calculator, quotient calculator, find the quotient calculator, division remainder calculator, calculator remainder, find quotient and remainder calculator, division calculator with remainders, find the quotient and remainder calculator, long division calculator with remainders, division with remainder calculator, long divison calculator, calculator for division, calculator long division, long division steps calculator, long division calculator without remainders, calculator division |
| `apy-calculator` | Finance > Savings | 20 | apy calculator, apy calculator monthly, apy interest calculator, annual percentage yield calculator, 4 apy calculator, 3.75 apy calculator, 5 apy calculator, monthly apy calculator, apy monthly calculator, apy rate calculator, interest rate to apy calculator, apy to interest rate calculator, apy return calculator, apy yield calculator, interest apy calculator, 3 apy calculator, rate to apy calculator, 4.4 apy calculator, 4.25 apy calculator, annual yield calculator |
| `balancing-chemical-equations-calculator` | Science > Chemistry | 20 | net ionic equation calculator, complete ionic equation calculator, balance chemical equations calculator, balance equation calculator, balanced equation calculator, balance equations calculator, ionic compound calculator, combustion reaction calculator, chemical reaction calculator, neutralization reaction calculator, balancing equation calculator, balancing equations calculator, balancing chemical equations calculator, balanced chemical equation calculator, balance the equation calculator, balance chemical equation calculator, chemical balance calculator, balancing calculator, single replacement reaction calculator, molecular equation calculator |
| `ratio-calculator` | Science > Math | 20 | ratio calculator, proportion calculator, proportions calculator, equivalent ratios calculator, constant of variation calculator, equivalent ratio calculator, cross multiply calculator, constant of proportionality calculator, 3 ratio calculator, ratio table calculator, proportional relationship calculator, varies directly calculator, mixing ratio calculator liquid, proportional calculator, ratios calculator, solving proportions calculator, simplify ratio calculator, 1:2 ratio calculator, ratio and proportion calculator, solve proportions calculator |
| `bmr-for-athletes-calculator` | Sports > Sports Performance | 19 | rmr calculator, harris benedict calculator, harris benedict equation calculator, msj calculator, resting metabolic rate calculator, katch mcardle calculator, mifflin st jeor calculator, bmr calculator for men, base calorie calculator, most accurate bmr calculator, mifflin-st jeor formula calculator, best bmr calculator, mifflin st jeor equation calculator, resting calorie calculator, st jeor mifflin calculator, resting energy calculator, mifflin-st jeor equation calculator, bmr calculator formula, metabolism calculator |
| `minecraft-nether-portal-calculator` | Arts & Entertainment > Tarot, Astrology & Fun | 19 | nether portal calculator, nether calculator, overworld to nether calculator, minecraft nether portal calculator, nether to overworld calculator, nether coordinate calculator, nether coordinates calculator, nether travel calculator, nether coord calculator, nether coordinate calculator bedrock, nether coords calculator, nether calculator bedrock, minecraft nether coordinate calculator, nether portal calculator bedrock, nether calculator minecraft, minecraft nether calculator, portal calculator, nether overworld calculator, minecraft portal calculator |
| `pace-calculator` | Sports > Running | 19 | mile pace calculator, training pace calculator, cycling pace calculator, marathon time calculator, average pace calculator, pace calculator km/h, pace calculator for running, running speed calculator, speed to pace calculator, milesplit calculator, pacing calculator, 5k split calculator, mph calculator running, minutes per mile calculator, running calculator pace, run speed calculator, run pace calculator, marathon pace calculator, race pace calculator |
| `salary-calculator` | Jobs & Education > Salary, Income & Career | 19 | wage calculator, hourly calculator, omni calculator salary, hourly pay calculator, pay rate calculator, yearly salary calculator, pay per hour calculator, pay wage calculator, payroll hourly calculator, year salary calculator, hourly earnings calculator, per hour calculator, hourly pay rate calculator, calculator for salary, hr pay calculator, pay hour calculator, job pay calculator, wages calculator hourly, us salary calculator |
| `salary-to-hourly-calculator` | Jobs & Education > Salary, Income & Career | 19 | salary to hourly calculator, salary hourly calculator, yearly to hourly calculator, salary to wage calculator, salary calculator to hourly, annual to hourly salary calculator, salary calculator hourly, salary to hourly rate calculator, monthly to hourly calculator, yearly to hourly salary calculator, salary to hourly pay calculator, salary to hourly wage calculator, hourly salary calculator, annual to hourly calculator, hourly calculator salary, annual salary to hourly calculator, yearly salary to hourly calculator, per hour salary calculator, salary calculator per hour |
| `body-fat-percentage-calculator` | Sports > Sports Performance | 18 | body fat calculator, body fat percentage calculator, bf calculator, percent body fat calculator, ideal body fat percentage calculator, bodyfat calculator, fat percentage calculator, bfp calculator, body fat % calculator, body percentage calculator, body fat percentage women calculator, bfm calculator, navy body fat percentage calculator, bmr calculator with body fat, body fat percentage calculator women, body density calculator, bf percentage calculator, body fat calculator for women |
| `feet-and-inches-calculator` | Science > Math | 18 | feet and inches calculator, inch calculator, feet calculator, feet inches calculator, feet to inches calculator, inches and feet calculator, foot and inch calculator, ft in calculator, ft calculator, foot inch calculator, foot and inches calculator, ft inches calculator, ft and in calculator, ft and inches calculator, adding feet and inches calculator, decimal to feet and inches calculator, feet inch calculator, feet and inch calculator |
| `hourly-to-salary-calculator` | Jobs & Education > Salary, Income & Career | 18 | hourly to salary calculator, omni salary calculator, hourly to annual salary calculator, hourly vs salary calculator, hour to salary calculator, wage to salary calculator, salary vs hourly calculator, hourly rate to salary calculator, salary calculator based on hourly, hourly pay to salary calculator, yearly salary calculator from hourly, hour salary calculator, per hour to salary calculator, hourly wage to salary calculator, hours to salary calculator, hr to salary calculator, hourly to annual calculator, hourly to yearly calculator |
| `average-calculator` | Science > Statistics & Probability | 17 | average calculator, percentage average calculator, percent average calculator, average value calculator, averaging calculator, find the average calculator, average number calculator, middle number calculator, number average calculator, calculator average, avg calculator, average of numbers calculator, finding the average calculator, online average calculator, find average calculator, average down calculator stocks, averages calculator |
| `margin-calculator` | Finance | 17 | margin calculator, omni margin calculator, margin calculator omni, gross margin calculator, omni calculator margin, cost margin calculator, retail margin calculator, sales margin calculator, margins calculator, price margin calculator, calculator margin, gp margin calculator, product margin calculator, cost sell margin calculator, margin calculator formula, margin calculator excel, business profit calculator |
| `combination-calculator` | Science > Statistics & Probability | 16 | combination calculator, binomial coefficient calculator, combinatorics calculator, n choose k calculator, binomial factor calculator, how many possible combinations calculator, permutation and combination calculator, choose calculator, permutations and combinations calculator, combination and permutation calculator, possible combinations calculator, combinations calculator, combination formula calculator, ncr calculator, permutations calculator, permutation calculator |
| `cooking-calculator` | Food & Drink > Baking & Recipe | 16 | how many ounces in a cup calculator, ml to grams calculator, baking conversion calculator, grams to cups calculator, grams to ml calculator, grams to teaspoons calculator, ml to g calculator, cup calculator, kitchen conversion calculator, grams to ml conversion calculator, grams to tablespoons calculator, cooking measurement calculator, gram to cup calculator, cooking calculator, grams to milliliters calculator, cooking conversion calculator |
| `factoring-calculator` | Science > Math | 16 | diamond problem calculator, reverse foil calculator, complete the square calculator, diamond method calculator, factoring trinomials calculator, factors calculator, box method calculator, money factor calculator, x method calculator, trinomial calculator, x method factoring calculator, least common factor calculator, diamond calculator math, ac method calculator, common factor calculator, factoring polynomial calculator |
| `overtime-calculator` | Jobs & Education > Salary, Income & Career | 16 | overtime calculator, ot calculator, paycheck calculator with overtime, over time calculator, pay calculator with overtime, salary calculator with overtime, overtime paycheck calculator, overtime calculator texas, california overtime calculator, payroll calculator with overtime, overtime calculator california, overtime calculator florida, raise calculator over time, ca overtime calculator, paycheck and overtime calculator, flsa overtime calculator |
| `square-footage-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 16 | square foot calculator, sqft calculator, sq ft calculator, square feet calculator, sq footage calculator, wall square footage calculator, cost per square foot calculator, sf calculator, sy calculator, area calculator with feet and inches, square footage calculator feet and inches, area calculator feet and inches, square feet calculator inches, footage calculator, carpet square footage calculator, sq foot calculator |
| `standard-deviation-calculator` | Science > Statistics & Probability | 16 | standard deviation calculator, standard deviation calculator using mean, sample standard deviation calculator, population variance calculator, sd calculator, sample variance calculator, standard deviation of the mean calculator, stdev calculator, online standard deviation calculator, std deviation calculator, standard deviation formula calculator, how to find standard deviation calculator, std calculator, mean standard deviation calculator, std dev calculator, find standard deviation calculator |
| `metal-weight-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 15 | steel plate weight calculator, paper weight calculator, aluminum weight calculator, metal weight calculator, aluminum plate weight calculator, steel plate calculator, plate steel weight calculator, weight of steel calculator, aluminium weight calculator, aluminum sheet weight calculator, wire weight calculator, metals weight calculator, weight of sheet steel calculator, steel sheet weight calculator, steel bar weight calculator |
| `board-foot-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 14 | board foot calculator, board feet calculator, bd ft calculator, board ft calculator, board footage calculator, bdft calculator, omni board foot calculator, board foot price calculator, board calculator, bf calculator wood, mbf calculator, boardfoot calculator, foot calculator, log board foot calculator |
| `cubic-feet-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 14 | cft calculator, cubic feet calculator, cuft calculator, cubic footage calculator, cu ft calculator, cubic ft calculator, cubic volume calculator, cf calculator, cubic feet of air calculator, cubic square feet calculator, case cube calculator, cubic feet to yards calculator, square feet to cubic feet calculator, cubic foot calculator |
| `download-time-calculator` | Shopping > Electronics, Energy & Tech | 14 | download time calculator, download calculator, download speed calculator, data transfer calculator, bps calculator, transfer speed calculator, time to download calculator, upload time calculator, file transfer calculator, upload calculator, upload speed calculator, data transfer time calculator, file transfer time calculator, data migration calculator |
| `hourly-wage-calculator` | Jobs & Education > Salary, Income & Career | 14 | hourly wage calculator, hourly rate calculator, hour wage calculator, wage calculator hourly, annual earnings calculator, annual wage calculator, hourly wages calculator, hourly income calculator, pay calculator per hour, money per hour calculator, pay rate calculator hourly, pay hourly calculator, annual income calculator hourly, calculator hourly pay |
| `mean-median-mode-calculator` | Science > Statistics & Probability | 14 | median calculator, mean calculator, median between two numbers calculator, midrange calculator, mean median mode range calculator, range calculator, mean median and mode calculator, halfway between two numbers calculator, find median calculator, mean of distribution calculator, sample mean calculator, mean median mode calculator, mean median mode and range calculator, find the mean calculator |
| `sohcahtoa-calculator` | Science > Math | 14 | trig calculator, trigonometry calculator, sohcahtoa calculator, trigonometric functions calculator, sine cosine tangent calculator, cosecant calculator, calculator trig, csc calculator, tangent calculator, cosine calculator, cot calculator, sec calculator, tan calculator, cotangent calculator |
| `volume-calculator` | Science > Math | 14 | volume calculator, tank volume calculator, well volume calculator, line volume calculator, truncated cone calculator, cube calculator, volume of a triangular prism calculator, triangle volume calculator, triangular prism volume calculator, triangular prism calculator, bladder volume calculator ultrasound, volume of a cube calculator, volume of cube calculator, rectangular pyramid calculator |
| `calorie-deficit-calculator` | Food & Drink > Diet, Macro & Meal Planning | 13 | calorie deficit calculator, calories deficit calculator, free calorie deficit calculator, calorie.deficit calculator, calorie defecit calculator, deficit calculator, calorie deficit calculator free, caloric deficit calculator, deficit calorie calculator, calculator for calorie deficit, calorie deficit weight loss calculator, calorie loss calculator, calorie deficit calculator nhs |
| `cubic-yard-calculator` | House & Garden > Gravel, Soil & Landscaping | 13 | yard calculator, sf to cy calculator, sq ft to cubic yards calculator, square feet to cubic yard calculator, cu yard calculator, yards calculator, sy to cy calculator, cubic yardage calculator, cu yd calculator, cubic formula calculator, cubic equation calculator, cubic yard calculator, yardage calculator |
| `dimensional-weight-calculator` | Shopping > Shipping & Moving Cost | 13 | dimensional weight calculator, fedex dimensional weight calculator, ups dimensional weight calculator, dim weight calculator, dim calculator, dimensional weight calculator cm, dim factor calculator, fedex dim weight calculator, international dim weight calculator, fedex ground dimensional weight calculator, usps dimensional weight calculator, dimensional weight calculator ups, shipping dimensional weight calculator |
| `grams-to-moles-calculator` | Science > Chemistry | 13 | mole calculator, moles calculator, grams to moles calculator, mol calculator, gram to mole calculator, grams to mole calculator, grams to moles calculator with steps, mole to mass calculator, convert grams to moles calculator, mass to moles calculator, mol to grams calculator, mole to gram calculator, moles to grams calculator |
| `puppy-weight-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 13 | puppy weight calculator, dog size calculator, puppy size calculator, puppy growth calculator, puppy calculator, puppy adult weight calculator, pet weight calculator, how big will my dog get calculator, puppy calculator weight, adult dog weight calculator, dog adult weight calculator, dog growth calculator, how big will my puppy get calculator |
| `series-parallel-circuit-calculator` | Science > Electrical & Electronics Engineering | 13 | parallel resistor calculator, parallel resistance calculator, parallel circuit calculator, resistors in parallel calculator, resistance calculator, resistor parallel calculator, parallel circuit resistance calculator, series circuit calculator, series resistor calculator, resistance in parallel calculator, resistance calculator parallel, series resistance calculator, circuit resistance calculator |
| `stock-average-price-calculator` | Finance > Investment > Stock & Options | 13 | stock average calculator, stock price calculator, average stock calculator, cost average calculator, average stock price calculator, average cost calculator, average down stock calculator, average price calculator, stock calculator average, stock price average calculator, stock average cost calculator, average cost method calculator, stock average down calculator |
| `target-heart-rate-calculator` | Sports > Sports Performance | 13 | karvonen formula calculator, max heart rate calculator, fat burning zone calculator, karvonen calculator, hr calculator, max hr calculator, fat burning heart rate calculator, fat burn heart rate calculator, resting heart rate calculator, most accurate heart rate zone calculator, mhr calculator, maximum heart rate calculator, heart rate max calculator |
| `water-intake-calculator` | Food & Drink > Diet, Macro & Meal Planning | 13 | how much water to drink a day calculator, water intake calculator, water consumption calculator, water calculator intake, how much water should i drink a day calculator, daily water intake calculator, water per day calculator, water drinking calculator, how much water should you drink a day calculator, daily water calculator, how much water calculator, how much water to drink to lose weight calculator, how much water should i drink per day calculator |
| `dice-probability-calculator` | Science > Statistics & Probability | 12 | dice probability calculator, dice average calculator, dice odds calculator, dice roll calculator, average dice roll calculator, average dice calculator, probability calculator dice, dnd dice calculator, dice calculator 5e, dice roll probability calculator, die calculator, dice calculator |
| `distance-formula-calculator` | Science > Math | 12 | midpoint formula calculator, distance between two points calculator, line segment calculator, equation from two points calculator, find the distance between two points calculator, coordinate plane calculator, euclidean distance calculator, missing coordinate calculator, midpoint method calculator, distance between points calculator, mid point calculator, point distance calculator |
| `landscape-rock-calculator` | House & Garden > Gravel, Soil & Landscaping | 12 | river rock calculator, limestone calculator, crushed stone calculator, landscape rock calculator, crushed rock calculator, landscaping rock calculator, rock coverage calculator, stone calculator 2b, rock calculator square feet, rock calculator yards, rock calculator in tons, how much rock do i need calculator |
| `probability-calculator` | Science > Statistics & Probability | 12 | probability calculator, coin toss probability calculator, probability calculator 3 events, binomial probability calculator, theoretical probability calculator, possibility calculator, probability calculator statistics, percent chance calculator, probability calculator multiple events, percentage chance calculator, find the probability calculator, chance calculator |
| `roof-area-calculator` | House & Garden > Roofing & Gutter | 12 | roof area calculator, roofing material calculator, free roofing calculator square feet, roof square foot calculator, roof sq ft calculator, roof height calculator, roof calculator square feet, roof size calculator, roof length calculator, roofing square calculator, roof calculator, roof square calculator |
| `calorie-calculator` | Food & Drink > Diet, Macro & Meal Planning | 11 | maintenance calorie calculator, biking calorie calculator, calorie calculator breastfeeding, resting calories calculator, breastfeeding calorie calculator, resting calorie burn calculator, calories maintenance calculator, maintain calorie calculator, metabolic calorie calculator, calories burned at rest calculator, maintence calorie calculator |
| `construction-calculator` | Business & Industrial > Construction Materials & Estimating | 11 | construction calculator online, online construction calculator, carpenter calculator, construction calculator online free, construction calculators, best construction calculator, carpentry calculator, calculator construction, free construction calculator, construction calculator, contractors calculator |
| `gas-mileage-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 11 | mpg calculator, miles per gallon calculator, fuel consumption calculator, gas usage calculator, fuel efficiency calculator, fuel economy calculator, gas mpg calculator, gas consumption calculator, mile per gallon calculator, travel gas calculator, fuel mileage calculator |
| `markup-calculator` | Finance | 11 | omni markup calculator, mark up calculator, retail markup calculator, price markup calculator, upcharge calculator, retail calculator, markup price calculator, 40 markup calculator, retail price calculator, tax added calculator, plus tax calculator |
| `osha-incident-rate-calculator` | Law & Government > Employment & Wage Law | 11 | dart rate calculator, trir rate calculator, dart calculator osha, osha trir calculator, total recordable incident rate calculator, recordable rate calculator, osha recordable incident rate calculator, osha dart rate calculator, osha recordable calculator, recordable incident rate calculator, osha recordable rate calculator |
| `pipe-flow-calculator` | Science > Mechanical & Structural Engineering | 11 | flow rate calculator, pipe flow calculator, gpm calculator, gallons per minute calculator, flow calculator, pipe velocity calculator, volumetric flow rate calculator, water flow through pipe calculator, water flow rate calculator, flow velocity calculator, water velocity calculator |
| `programmer-calculator` | Science > Computer, Network & IT | 11 | binary subtraction calculator, xor calculator, bit shift calculator, bitwise calculator, ascii calculator, logic gate calculator, floating point calculator, bitwise or calculator, ieee 754 calculator, left shift calculator, truth value calculator |
| `pythagorean-theorem-calculator` | Science > Math | 11 | pythagorean theorem calculator, hypotenuse calculator, pythagorean calculator, find hypotenuse calculator, pythagoras calculator, pythagorean theorem calculator angle, pythag calculator, pythagoras theorem calculator, pythagorean theorem calculator find a, pythagorean theorem calculator find b, pythagorean theorem calculator find c |
| `sales-tax-calculator` | Finance > Tax | 11 | mo sales tax calculator, ca sales tax calculator, add tax calculator, fl sales tax calculator, food tax calculator, online sales tax calculator, purchase tax calculator, 7 sales tax calculator, 8.25 tax calculator, add taxes calculator, add sales tax calculator |
| `walking-calorie-calculator` | Sports > Hiking | 11 | walking calories burned calculator, walking calorie calculator, walking calories calculator, calories burned walking calculator, walk calorie calculator, calorie walking calculator, calories walking calculator, calories burned calculator walking, calorie calculator walking, walking calorie burn calculator, calorie burn calculator walking |
| `wire-size-calculator` | Business & Industrial > Energy, Solar & Electrical | 11 | wire size calculator, dc wire size calculator, wire size calculator dc, dc wire gauge calculator, awg calculator, electrical cable size calculator, 12v wire size calculator, dc cable size calculator, 12 volt wire size calculator, wire calculator, wire size calculator ac |
| `biking-calorie-calculator` | Sports > Cycling | 10 | cycling calorie calculator, bike calorie calculator, bicycle calorie calculator, calories burned cycling calculator, cycling calories calculator, bike ride calorie calculator, calories burned biking calculator, cycling calories burned calculator, biking calories burned calculator, 1 hour cycling calories calculator |
| `bulking-calculator` | Sports > Sports Performance | 10 | weight gain calculator, calorie calculator to gain weight, weight gain calorie calculator, gain weight calculator, calorie calculator weight gain, calorie calculator for weight gain, calorie weight gain calculator, how many calories should i eat to gain weight calculator, calories to gain weight calculator, calorie calculator gain weight |
| `car-depreciation-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 10 | car depreciation calculator, vehicle depreciation calculator, auto depreciation calculator, car value depreciation calculator, car depreciation calculator by model, depreciation calculator car, used car depreciation calculator, automobile depreciation calculator, rv depreciation calculator, truck depreciation calculator |
| `dog-age-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 10 | dog age calculator, human years to dog years calculator, dog years calculator, dog calculator, dog year calculator, dog years to human years calculator, puppy age calculator, dog age calculator by breed, dog calculator age, dog age in human years calculator |
| `step-calculator` | Sports > Hiking | 10 | steps to miles calculator, steps to calories calculator, walking calculator, steps calorie calculator, steps calculator, step to mile calculator, convert steps to miles calculator, steps to miles conversion calculator, walking steps calculator, steps into miles calculator |
| `time-card-calculator` | Jobs & Education > Salary, Income & Career | 10 | 8 hour shift calculator, 8 hour calculator, 8hr shift calculator, 8 hour work day calculator, 8 hours work day calculator, working hour calculator, 12-hour shift pay calculator, hours to pay calculator, hour worked calculator, work hour calculator with pay |
| `volume-of-cylinder-calculator` | Science > Math | 10 | cylinder volume calculator, cylinder calculator, volume of cylinder calculator, volume calculator cylinder, volume of a cylinder calculator, surface area of a cylinder calculator, cylinder volume calculator gallons, cylinder surface area calculator, cylinder calculator volume, surface area of cylinder calculator |
| `walking-weight-loss-calculator` | Sports > Hiking | 10 | free calculator for walking to lose weight, walking weight loss calculator, walking calculator to lose weight, how many steps to lose weight calculator, walking for weight loss calculator, walking to lose weight calculator, step calculator for weight loss, free steps calculator to lose weight for females, how much walking to lose weight calculator, how many steps a day to lose weight calculator |
| `wavelength-frequency-calculator` | Science > Physics | 10 | wavelength calculator, frequency calculator, frequency to wavelength calculator, wavelength to frequency calculator, wave speed calculator, sound wavelength calculator, frequency wavelength calculator, wavelength formula calculator, frequency to period calculator, period to frequency calculator |
| `air-changes-per-hour-calculator` | House & Garden > HVAC, Plumbing & Electrical | 9 | cfm calculator, ach calculator, cfm to square feet calculator, cfm per square foot calculator, ach to cfm calculator, square feet to cfm calculator, cfm requirement calculator, air changes per hour calculator, cfm calculator hvac |
| `bell-curve-grading-calculator` | Science > Statistics & Probability | 9 | grade curve calculator, curve grade calculator, square root curve calculator, curve calculator, test curve calculator, grading on a curve calculator, grading curve calculator, bell curve calculator, curve calculator grade |
| `biweekly-salary-calculator` | Jobs & Education > Salary, Income & Career | 9 | biweekly pay calculator, bi weekly pay calculator, biweekly salary calculator, bi weekly salary calculator, bi weekly to annual salary calculator, every 2 weeks pay calculator, bi-weekly pay calculator, salary to biweekly calculator, bi weekly payroll calculator |
| `bond-yield-to-maturity-calculator` | Finance > Investment > Bond & Fixed Income | 9 | ytm calculator, yield to maturity calculator, current yield calculator, bond yield to maturity calculator, bond yield calculator, treasury yield calculator, 10 year treasury yield calculator, bond maturity calculator, 10 year bond calculator |
| `complex-number-calculator` | Science > Math | 9 | complex conjugate calculator, a+bi form calculator, powers of i calculator, dividing complex numbers calculator, divide complex numbers calculator, multiply complex numbers calculator, a+bi calculator, conjugates calculator, calculator with imaginary numbers |
| `concrete-block-calculator` | House & Garden > Concrete, Masonry & Paving | 9 | concrete block calculator, cinder block calculator, block calculator, concrete block fill calculator, cement block calculator, block calculator for wall, cmu block calculator, cmu calculator, block wall calculator |
| `euclidean-algorithm-calculator` | Science > Math | 9 | lcm calculator, gcf and lcm calculator, gcd calculator, lcm and gcf calculator, greatest common factor calculator, multiples calculator, common multiple calculator, gcf calculator, least common multiple calculator |
| `exponent-calculator` | Science > Scientific & Graphing | 9 | exponent calculator, rational exponents calculator, square calculator, negative exponent calculator, negative exponents calculator, power of calculator, powers calculator, to the power calculator, fraction exponents calculator |
| `gpa-calculator` | Jobs & Education > GPA | 9 | gpa calculator without credits, gpa calculator no credits, gpa calculator high school no credits, gpa calculator for middle school, gpa calculator middle school no credits, gpa middle school calculator, gpa calculator no credits high school, gpa calculator for high school, gpa raise calculator |
| `gross-to-net-salary-calculator` | Jobs & Education > Salary, Income & Career | 9 | net to gross calculator, gross to net calculator, gross net calculator, gross calculator, net to gross income calculator, net gross calculator, gross vs net calculator, net calculator, gross vs net income calculator |
| `ideal-weight-calculator` | Sports > Sports Performance | 9 | ideal weight calculator, adjusted body weight calculator, body weight percentage calculator, how much should i weigh calculator, ideal weight calculator in kg, average weight calculator, target weight calculator, optimal weight calculator, ideal bw calculator |
| `labor-cost-calculator` | Business & Industrial > HR, Marketing & Business Operations | 9 | labor cost calculator, billable hours calculator, bill rate calculator, labor rate calculator, hourly labor calculator, consulting fee calculator, cost of labor calculator, material and labor cost calculator, billable hour calculator |
| `prorated-rent-calculator` | Real Estate > Rent & Tenant | 9 | prorated rent calculator, prorate rent calculator, rent prorate calculator, rent proration calculator, prorated calculator rent, pro rated rent calculator, prorated rent calculator move in, move in calculator, move out prorated rent calculator |
| `square-feet-lot-size-calculator` | Real Estate > Land, Construction & Building Cost | 9 | acreage calculator, acres calculator, lot size to acres calculator, feet to acres calculator, sqft to acre calculator, square feet to acres calculator, square feet to acre calculator, sq ft to acre calculator, square foot to acre calculator |
| `triangle-area-calculator` | Science > Math | 9 | heron's formula calculator, triangle area calculator, area of triangle calculator, area calculator triangle, area of a triangle calculator, sas triangle calculator, area triangle calculator, find area of triangle calculator, triangle area calculator 3 sides |
| `waist-to-height-ratio-calculator` | Sports > Sports Performance | 9 | waist to height ratio calculator, waist-to-height ratio calculator, waist to height calculator, height to waist ratio calculator, whtr calculator, wthr calculator, waist height ratio calculator, waist size calculator, height waist ratio calculator |
| `battery-life-calculator` | Shopping > Electronics, Energy & Tech | 8 | battery life calculator, battery capacity calculator, battery calculator, how long will a battery last calculator, battery run time calculator, amp hour calculator, ah calculator, battery amp hours calculator |
| `credit-utilization-calculator` | Finance > Credit & Debt | 8 | credit card utilization calculator, credit utilization calculator, credit utilization ratio calculator, credit card usage calculator, credit usage calculator, utilization calculator, free credit utilization calculator, 30 percent credit utilization calculator |
| `dilution-calculator` | Science > Chemistry | 8 | dilution calculator, cell dilution calculator, dilution factor calculator, abv dilution calculator, dilutions calculator, peptide dilution calculator, oligo resuspension calculator, concentration dilution calculator |
| `electricity-cost-calculator` | Shopping > Electronics, Energy & Tech | 8 | electricity calculator, energy cost calculator, electricity cost calculator kwh, electricity price calculator, clothes dryer energy cost calculator, electric cost calculator, watt cost calculator, electrical cost calculator |
| `engine-displacement-calculator` | Sports > Motorsports & Racing | 8 | engine displacement calculator, displacement calculator, bore and stroke calculator, cc calculator, bore stroke calculator, engine calculator, engine size calculator, engine cubic inch calculator |
| `high-school-graduation-year-calculator` | Jobs & Education > School Age, Calendar & Classroom | 8 | graduation year calculator, what grade was i in year calculator, graduation calculator, graduation calculator by birthday, school age calculator, graduation date calculator, graduating class calculator, lausd age calculator |
| `money-counter-calculator` | Finance > Budget > Money-Saving & Spending | 8 | adding money calculator, money counter calculator, calculator money, calculator for money, money calculator online, money calculator google, cash register calculator, cash calculator |
| `navy-body-fat-calculator` | Law & Government > Military & Veterans | 8 | navy body fat calculator, us navy body fat calculator, body fat calculator navy, navy fat calculator, navy method body fat calculator, navy calculator, navy bf calculator, navy bca calculator |
| `navy-prt-calculator` | Law & Government > Military & Veterans | 8 | navy prt calculator, prt calculator, pfa calculator, navy pfa calculator, prt calculator navy, navy prt score calculator, prt score calculator, prt navy calculator |
| `normal-distribution-calculator` | Science > Statistics & Probability | 8 | empirical rule calculator, normal cdf calculator, normal distribution percentile calculator, normal distribution probability calculator, normalcdf calculator, inverse norm calculator, inverse cdf calculator, norm cdf calculator |
| `pipe-volume-calculator` | House & Garden > HVAC, Plumbing & Electrical | 8 | pipe volume calculator, tubing capacity calculator, volume of pipe calculator, pipeline fill calculator, pipe volume calculator gallons, gallons per foot of pipe calculator, tube volume calculator, pipe capacity calculator |
| `rental-property-calculator` | Real Estate > Rental Property & Investment | 8 | rental property calculator, calculator for rental property, rental house calculator, rental home calculator, real estate rental calculator, calculator rental property, rental property analysis calculator, property rental calculator |
| `round-to-nearest-dollar-or-cent-calculator` | Finance | 8 | round to the nearest cent calculator, round to nearest cent calculator, nearest cent calculator, pennies to dollars calculator, cents to dollars calculator, round to the nearest dollar calculator, cent calculator, cents calculator |
| `run-calorie-calculator` | Sports > Running | 8 | run calorie calculator, calorie calculator running, calorie burn calculator running, running calorie burn calculator, running calories calculator, jogging calorie calculator, calories burned calculator running, running calorie calculator |
| `shingle-calculator` | House & Garden > Roofing & Gutter | 8 | shingle calculator, roof shingles calculator, roof shingle calculator, shingles calculator, roofing shingle calculator, shingle bundle calculator, how many shingles do i need calculator, roofing shingles calculator |
| `significant-figures-calculator` | Science > Scientific & Graphing | 8 | sig fig calculator, significant figures calculator, sigfig calculator, sig figs calculator, significant digits calculator, significant figure calculator, rounding sig figs calculator, 3 significant figures calculator |
| `solar-panel-size-calculator` | Business & Industrial > Energy, Solar & Electrical | 8 | solar power calculator, solar panel size calculator, ppv calculator, calculator solar panel, solar calculator kwh, solar power calculator kwh, solar panels kwh calculator, solar power system calculator |
| `trig-identities-calculator` | Science > Math | 8 | soh cah toa calculator, half angle formula calculator, sin cos tan calculator, trig calculator online, cos calculator, sine calculator, half angle calculator, sin calculator |
| `vector-calculator` | Science > Math | 8 | vector calculator, angle between two vectors calculator, angle between vectors calculator, cosine similarity calculator, vectors calculator, vector angle calculator, vector multiplication calculator, adding vectors calculator |
| `vo2-max-calculator` | Sports > Sports Performance | 8 | vo2 max calculator, v02 max calculator, vo2max calculator, aerobic capacity calculator, vo2 calculator, vo2 max calculator running, magic mile calculator, v02 calculator |
| `weighted-grade-calculator` | Jobs & Education > Grade | 8 | grade calculator with weights, weighted calculator, class average calculator, grade calculator weighted, calculator for grades, average calculator grade, grade calculator with weight, calculator grade |
| `win-percentage-calculator` | Sports > Other Sports | 8 | win percentage calculator, winning percentage calculator, win loss calculator, win rate calculator, winrate calculator, win percentage calculator with ties, win loss ratio calculator, win loss percentage calculator |
| `aquarium-volume-calculator` | Pets & Animals > Aquarium, Reptile & Small Pet | 7 | aquarium gallon calculator, aquarium volume calculator, fish tank gallon calculator, fish tank volume calculator, fish tank size calculator, aquarium dimensions calculator, fish tank calculator |
| `audiobook-calculator` | Arts & Entertainment > Books, Reading & Writing | 7 | audiobook calculator, audiobook speed calculator, audio book calculator, audiobook time calculator, audiobook calculator speed, audio speed calculator, audiobook percentage calculator |
| `body-shape-calculator` | Shopping > Clothing, Shoe & Ring Size | 7 | body shape calculator, body type calculator, body shape calculator female, body calculator shape, body size calculator, body ratio calculator, body shape calculator 3d |
| `calories-burned-by-activity-calculator` | Sports > Sports Performance | 7 | met calculator, calorie burner calculator, mets calculator, how many calories did i burn calculator, dance calories burned calculator, cardio calculator, calorie burned calculator |
| `calories-to-steps-calculator` | Sports > Other Sports | 7 | step calorie calculator, step to calorie calculator, steps calories calculator, steps to calories burned calculator, steps calories burned calculator, calories burned steps calculator, calorie step calculator |
| `cap-rate-calculator` | Real Estate > Rental Property & Investment | 7 | cap rate calculator, cap rate calculator real estate, cap calculator, rate cap calculator, rental cap rate calculator, cap rate rental property calculator, cap rate calculator for rental property |
| `carb-intake-calculator` | Food & Drink > Diet, Macro & Meal Planning | 7 | carb calculator, carbohydrate calculator, carbs calculator, how much carbs should i eat to lose weight calculator, carb intake calculator, free carb calculator, food carb calculator |
| `carpet-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 7 | square yard calculator, square yards calculator, carpet calculator, sq yard calculator, sq yd calculator, carpet measurement calculator, carpet calculator square feet |
| `cat-age-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 7 | cat age calculator, cat year calculator, cat years to human years calculator, cat years calculator, human years to cat years calculator, cat to human years calculator, cat calculator |
| `concrete-calculator` | House & Garden > Concrete, Masonry & Paving | 7 | cy calculator, concrete stair calculator, concrete tube calculator, 12 sonotube concrete calculator, sonotube concrete calculator bags, concrete ramp calculator, slab calculator |
| `concrete-column-calculator` | Business & Industrial > Concrete & Masonry | 7 | sonotube concrete calculator, sonotube calculator, concrete cylinder calculator, cylinder concrete calculator, sono tube calculator, concrete sonotube calculator, concrete column calculator |
| `cpm-calculator` | Finance | 7 | cpm calculator, cpm calculator - clickz, impression calculator, impressions calculator, cost per thousand calculator, cost per impression calculator, youtube cpm calculator |
| `deck-calculator` | House & Garden > Deck, Fence & Stair | 7 | decking calculator, deck board calculator, deck building calculator, deck square footage calculator, decking board calculator, deck size calculator, deck calculator |
| `discrete-math-calculator` | Science > Math | 7 | mod calculator, modulo calculator, inverse modulo calculator, modulus calculator, modular inverse calculator, chinese remainder theorem calculator, multiplicative inverse calculator |
| `dog-pregnancy-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 7 | dog pregnancy calculator, dog due date calculator, dog gestation calculator, puppy due date calculator, dog gestation period calculator, dog breeding calculator, whelping calculator |
| `drywall-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 7 | drywall calculator, sheetrock calculator, drywall calculator walls and ceiling, home depot drywall calculator, drywall calculator square feet, drywall estimate calculator, drywall calculator for walls |
| `firewood-cord-calculator` | House & Garden > Lawn, Garden & Tree | 7 | firewood calculator, cord wood calculator, cord of wood calculator, firewood cord calculator, cord calculator, wood cord calculator, cordwood calculator |
| `margin-vs-markup-calculator` | Finance | 7 | margin markup calculator, margin to markup calculator, markup to margin calculator, margin vs markup calculator, markup vs margin calculator, markup margin calculator, markup and margin calculator |
| `matrix-calculator` | Science > Math | 7 | lu factorization calculator, condition number calculator, invertible matrix calculator, subspace calculator, nul a calculator, matrix inversion calculator, diagonal matrix calculator |
| `paypal-fee-calculator` | Finance | 7 | paypal goods and services fee calculator, paypal goods and services calculator, paypal g&s fee calculator, paypal g&s calculator, paypal tax calculator, paypal fees calculator, paypal calculator |
| `percent-difference-calculator` | Science > Statistics & Probability | 7 | percent difference calculator, percentage difference calculator, difference calculator, price difference calculator, percentage calculator difference, % difference calculator, difference percentage calculator |
| `pvifa-calculator` | Finance > Investment > Investment Returns & Planning | 7 | present value of annuity calculator, pvifa calculator, annuity calculator present value, present value calculator annuity, present value annuity calculator, present value of an annuity calculator, annuity present value calculator |
| `quarterback-rating-calculator` | Sports > Other Sports | 7 | qb rating calculator, nfl passer rating calculator, qbr calculator, nfl qb rating calculator, qb calculator, qbr rating calculator, quarterback rating calculator |
| `rafter-calculator` | House & Garden > Roofing & Gutter | 7 | rafter length calculator, rafter calculator, roof rafter length calculator, rafter angle calculator, rafter calculator free, roof rafter calculator, common rafter calculator |
| `rectangular-prism-calculator` | Science > Math | 7 | volume of a box calculator, volume of a prism calculator, box volume calculator, rectangular prism calculator, prism calculator, surface area of prism calculator, volume of a rectangle calculator |
| `regular-polygon-calculator` | Science > Math | 7 | hexagon calculator, octagon calculator, polygon calculator, pentagon calculator, regular polygon calculator, area of a polygon calculator, polygon area calculator |
| `roof-pitch-calculator` | House & Garden > Roofing & Gutter | 7 | roof pitch calculator, pitch calculator, roof slope calculator, roof angle calculator, roofing pitch calculator, roof pitch calculator app, lean to roof pitch calculator |
| `semester-grade-calculator` | Jobs & Education > Grade | 7 | semester grade calculator, semester calculator, grade calculator semester, semester average calculator, semester grade calculator high school, semester test calculator, quarter grade calculator |
| `speed-distance-time-calculator` | Science > Physics | 7 | speed calculator, speed time calculator, speed calculator mph, time and distance calculator, speed and distance calculator, time distance calculator, distance time calculator |
| `stoichiometry-calculator` | Science > Chemistry | 7 | chemistry calculator, energy calculator chemistry, dosing calculator, chemical calculator, chem calculator, calculator for chemistry, chemistry conversion calculator |
| `typing-speed-calculator` | Jobs & Education > School Age, Calendar & Classroom | 7 | words per minute calculator, wpm calculator, word per minute calculator, reading speed calculator, wpm reading calculator, wpm calculator reading, words read per minute calculator |
| `waist-to-hip-ratio-calculator` | Sports > Sports Performance | 7 | waist to hip ratio calculator, waist hip ratio calculator, hip to waist ratio calculator, whr calculator, hip waist ratio calculator, ideal waist size calculator, waist circumference calculator |
| `watts-to-amps-calculator` | Science > Electrical & Electronics Engineering | 7 | watt calculator, watts calculator, watts to amps calculator, amps calculator, watts to amps calculator ac, convert watts to amps calculator, amp calculator |
| `weekly-salary-calculator` | Jobs & Education > Salary, Income & Career | 7 | weekly pay calculator, weekly calculator, weekly income calculator, weekly payroll calculator, weekly salary calculator, weekly wage calculator, salary to weekly calculator |
| `year-over-year-growth-calculator` | Finance | 7 | year over year growth calculator, yoy calculator, yoy growth calculator, year over year calculator, annual growth calculator, yoy increase calculator, rate of growth calculator |
| `youtube-revenue-calculator` | Arts & Entertainment > Art, Film & Creator Income | 7 | youtube rpm calculator, youtube calculator money, youtube payment calculator, youtube earning calculator, youtube video money calculator, youtube channel revenue calculator, youtube profit calculator |
| `arc-length-calculator` | Science > Math | 6 | arc length calculator, curve length calculator, arc calculator, arch calculator, find the exact length of the curve calculator, arc radius calculator |
| `army-body-fat-calculator` | Law & Government > Military & Veterans | 6 | army body fat calculator, army body fat percentage calculator, army tape test calculator, army bf calculator, body fat calculator army, army fat calculator |
| `average-annual-income-calculator` | Jobs & Education > Salary, Income & Career | 6 | annual income calculator, annual salary calculator, annual gross income calculator, annual household income calculator, annual pay calculator, annual income before taxes calculator |
| `beam-load-calculator` | Science > Mechanical & Structural Engineering | 6 | beam load calculator, beam stress calculator, bending moment calculator, beam bending calculator, i beam load capacity calculator, beam loading calculator |
| `binomial-distribution-calculator` | Science > Statistics & Probability | 6 | binomial calculator, binomial distribution calculator, binomial probability distribution calculator, binomial distribution probability calculator, binomial cdf calculator, binomial pdf calculator |
| `byte-calculator` | Science > Computer, Network & IT | 6 | byte calculator, bytes calculator, mb calculator, gb calculator, mb to gb calculator, bit calculator |
| `combined-gas-law-calculator` | Science > Chemistry | 6 | combined gas law calculator, boyle's law calculator, charles law calculator, boyles law calculator, gas law calculator, gay lussac's law calculator |
| `conception-date-calculator` | Health > Pregnancy & Fertility | 6 | reverse due date calculator, conception date calculator based on birthday, reverse conception calculator, luteal phase calculator, conception calculator 2 possible fathers, conception calculator based on birthday |
| `ellipse-calculator` | Science > Math | 6 | ellipse calculator, oval circumference calculator, find equation of ellipse given foci and vertices calculator, ellipse circumference calculator, eccentricity calculator, oval calculator |
| `fence-calculator` | House & Garden > Deck, Fence & Stair | 6 | fence calculator, fencing calculator, privacy fence calculator, wood fence calculator, fence material calculator, lowe's fence calculator |
| `flooring-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 6 | flooring calculator, floor calculator, laminate floor calculator, flooring calculator square feet, home depot flooring calculator, square foot calculator for flooring |
| `framing-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 6 | stud calculator, framing calculator, wall stud calculator, stud calculator for wall, wall framing calculator, stud wall calculator |
| `frequency-distribution-calculator` | Science > Statistics & Probability | 6 | relative frequency calculator, frequency distribution calculator, relative frequency distribution calculator, class width calculator, frequency table calculator, class boundaries calculator |
| `hiking-calorie-calculator` | Sports > Hiking | 6 | hiking calorie calculator, hiking calculator, calories burned hiking calculator, hiking calories calculator, hiking calories burned calculator, hike calorie calculator |
| `kelvin-fahrenheit-converter` | Science > Earth, Weather & Environment | 6 | fahrenheit to celsius calculator, celsius calculator, f to c calculator, temp calculator, temp conversion calculator, convert celsius to fahrenheit calculator |
| `monitor-ppi-calculator` | Shopping > Electronics, Energy & Tech | 6 | ppi calculator, pixel density calculator, pixels to inches calculator, pixels to print size calculator, pixels per inch calculator, inches to pixels calculator |
| `ohms-law-calculator` | Science > Electrical & Electronics Engineering | 6 | ohms law calculator, watts law calculator, ohms calculator, ohm law calculator, ohm's law calculator, amperage calculator |
| `paint-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 6 | paint calculator, paint calculator square feet, paint coverage calculator, wall paint calculator, paint calculator for walls, paint amount calculator |
| `parallel-perpendicular-calculator` | Science > Math | 6 | parallel calculator, perpendicular equation calculator, equations of parallel and perpendicular lines calculator, perpendicular calculator, parallel perpendicular or neither calculator, parallel and perpendicular lines calculator |
| `photon-energy-calculator` | Science > Physics | 6 | energy of a photon calculator, energy of photon calculator, photon energy calculator, wavelength to energy calculator, frequency to energy calculator, energy to wavelength calculator |
| `protons-neutrons-electrons-calculator` | Science > Chemistry | 6 | atom calculator, atomic mass calculator, element calculator, atomic number calculator, amu calculator, neutron calculator |
| `punnett-square-calculator` | Science > Biology & Lab | 6 | punnet square calculator, allele frequency calculator, blood type punnett square calculator, gene calculator, genotype calculator, punnett square calculator |
| `rational-zeros-calculator` | Science > Math | 6 | rational zero theorem calculator, rational zeros calculator, descartes rule of signs calculator, rational root theorem calculator, rational zero calculator, possible rational zeros calculator |
| `road-base-calculator` | House & Garden > Gravel, Soil & Landscaping | 6 | road base calculator, stone dust calculator, crushed limestone calculator, crushed gravel calculator, crush and run calculator, crusher run calculator |
| `scientific-notation-calculator` | Science > Scientific & Graphing | 6 | engineering notation calculator, scientific notation calculator, exponential notation calculator, exponential form calculator, standard form calculator, write in scientific notation calculator |
| `script-length-calculator` | Arts & Entertainment > Books, Reading & Writing | 6 | speaking time calculator, speech time calculator, script calculator, speech calculator, words per minute speech calculator, speech length calculator |
| `siding-cost-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 6 | siding calculator, vinyl siding cost calculator, siding calculator cost, siding cost calculator, metal siding cost calculator, cost of siding a house calculator |
| `simple-interest-calculator` | Finance > Investment > Investment Returns & Planning | 6 | simple interest calculator, maturity value calculator, margin interest calculator, simple intrest calculator, daily simple interest calculator, interest calculator apy |
| `sleep-calculator` | Health > Sleep & Medical | 6 | rem sleep calculator, sleep debt calculator, 90 minute sleep cycle calculator, rem calculator, circadian rhythm calculator, rem sleep cycle calculator |
| `specific-heat-calculator` | Science > Chemistry | 6 | calorimetry calculator, specific heat calculator, thermal energy calculator, heat capacity calculator, specific heat capacity calculator, heat capacity of water calculator |
| `time-and-a-half-calculator` | Jobs & Education > Salary, Income & Career | 6 | time and a half calculator, time and half calculator, time in a half calculator, time in half calculator, time and a half pay calculator, overtime time and a half calculator |
| `torque-conversion-calculator` | Science > Mechanical & Structural Engineering | 6 | nm to ft lbs calculator, foot pound calculator, foot pounds calculator, ft lb calculator, ft lbs calculator, ft to lb calculator |
| `unit-circle-calculator` | Science > Math | 6 | unit circle calculator, reference angle calculator, coterminal angles calculator, coterminal angle calculator, circle angle calculator, degrees to radians calculator |
| `vertex-form-calculator` | Science > Math | 6 | vertex form calculator, standard to vertex form calculator, vertex to standard form calculator, standard form to vertex form calculator, vertex form to standard form calculator, vertex formula calculator |
| `volume-of-cone-calculator` | Science > Math | 6 | volume of a cone calculator, cone volume calculator, volume of cone calculator, cone surface area calculator, surface area of cone calculator, cone calculator |
| `volume-of-pyramid-calculator` | Science > Math | 6 | volume of a triangular pyramid calculator, volume of triangular pyramid calculator, pyramid volume calculator, pyramid calculator, volume of a pyramid calculator, volume of pyramid calculator |
| `wallpaper-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 6 | wallpaper calculator, wallpaper calculator with repeat, best wallpaper calculator, how much wallpaper do i need calculator, wall paper calculator, wallpaper calculator in inches |
| `annuity-investment-calculator` | Finance > Retirement | 5 | ordinary annuity calculator, annuity formula calculator, annuity growth calculator, annuity table calculator, calculator for annuity |
| `baluster-spacing-calculator` | House & Garden > Deck, Fence & Stair | 5 | baluster spacing calculator, baluster calculator, spindle spacing calculator, spindle calculator, stair baluster spacing calculator |
| `binary-calculator` | Science > Computer, Network & IT | 5 | binary division calculator, adding binary numbers calculator, binary multiplication calculator, binary addition calculator, binary adder calculator |
| `binomial-expansion-calculator` | Science > Math | 5 | binomial expansion calculator, pascal's triangle calculator, binomial formula calculator, pascals triangle calculator, pascal triangle calculator |
| `car-cost-per-mile-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 5 | cents per mile calculator, rate per mile calculator, mileage cost calculator, pay per mile calculator, fuel cost per mile calculator |
| `carburetor-cfm-calculator` | Sports > Motorsports & Racing | 5 | carb cfm calculator, carburetor size calculator, carb size calculator, cfm calculator carb, carburetor calculator |
| `compound-interest-calculator` | Finance > Investment > Investment Returns & Planning | 5 | compound interst calculator, 401k compound interest calculator, interest calculator compound, ci calculator, compunding interest calculator |
| `concrete-driveway-calculator` | House & Garden > Concrete, Masonry & Paving | 5 | concrete driveway cost calculator, concrete driveway calculator, driveway concrete cost calculator, driveway calculator, asphalt vs concrete driveway cost calculator |
| `confidence-interval-calculator` | Science > Statistics & Probability | 5 | point estimate calculator, 95 confidence interval calculator, confidence level calculator, confidence interval calculator, moe calculator |
| `correlation-coefficient-calculator` | Science > Statistics & Probability | 5 | pearson's r calculator, linear correlation coefficient calculator, coefficient of correlation calculator, correlation coefficient calculator, pearson correlation coefficient calculator |
| `density-calculator` | Science > Chemistry | 5 | density calculator, volume to mass calculator, mass to volume calculator, density conversion calculator, mass calculator |
| `diamond-mm-to-carat-calculator` | Shopping > Gold, Silver & Jewelry | 5 | diamond weight calculator, diamond carat calculator, mm to carat calculator, carat calculator, diamond size calculator |
| `distance-calculator` | Travel > Distance, Route & Travel Time | 5 | distance formula calculator, distance calculator math, drive calculator, driving calculator, distance calculator geometry |
| `engine-rpm-calculator` | Sports > Motorsports & Racing | 5 | rpm calculator, rpm to mph calculator, rpm to speed calculator, car speed calculator, rpm speed calculator |
| `fabric-yardage-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 5 | fabric calculator, fabric yardage calculator, yardage calculator fabric, free fabric calculator, quilt fabric calculator |
| `frame-size-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 5 | body frame size calculator, picture frame calculator, frame size calculator, frame calculator, picture frame size calculator |
| `future-value-of-annuity-calculator` | Finance > Investment > Investment Returns & Planning | 5 | future value of annuity calculator, future value annuity calculator, value of annuity calculator, future annuity calculator, annuity value calculator |
| `geometric-sequence-calculator` | Science > Math | 5 | geometric series calculator, common ratio calculator, sum of geometric series calculator, geometric calculator, sequence equation calculator |
| `horizon-distance-calculator` | Science > Earth, Weather & Environment | 5 | earth curvature calculator, earth curve calculator, horizon calculator, horizon distance calculator, distance to horizon calculator |
| `infinite-series-sum-calculator` | Science > Math | 5 | series calculator, sum of series calculator, series sum calculator, sum of a series calculator, convergent or divergent calculator |
| `joist-span-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 5 | floor joist calculator, floor joist span calculator, joist calculator, joist span calculator, 2x6 load capacity calculator |
| `linear-regression-calculator` | Science > Statistics & Probability | 5 | least squares regression line calculator, least squares regression calculator, least square regression line calculator, lsrl calculator, r squared calculator |
| `log-calculator` | Science > Scientific & Graphing | 5 | log 2 calculator, logarithm calculator, calculator log, log base 10 calculator, log10 calculator |
| `miles-to-dollars-calculator` | Travel > Airline Miles, Hotel Points & Rewards | 5 | miles to dollars calculator, united miles to dollars calculator, delta miles to dollars calculator, american airlines miles to dollars calculator, miles to dollars calculator united |
| `monthly-salary-calculator` | Jobs & Education > Salary, Income & Career | 5 | monthly salary calculator, monthly wage calculator, salary to monthly calculator, annual to monthly salary calculator, salary monthly calculator |
| `orbital-period-calculator` | Science > Astronomy & Space | 5 | kepler's third law calculator, semi major axis calculator, orbital velocity calculator, orbit calculator, orbital period calculator |
| `pipe-pressure-drop-calculator` | Science > Mechanical & Structural Engineering | 5 | friction loss calculator, head loss calculator, pipe friction loss calculator, hazen williams calculator, friction factor calculator |
| `polar-rectangular-calculator` | Science > Math | 5 | polar coordinates calculator, cartesian to polar calculator, polar to rectangular calculator, rectangular to polar calculator, cylindrical coordinates calculator |
| `polynomial-calculator` | Science > Math | 5 | characteristic polynomial calculator, division of polynomials calculator, adding and subtracting polynomials calculator, graphing polynomial functions calculator, multiplying polynomials calculator |
| `post-hole-concrete-calculator` | House & Garden > Concrete, Masonry & Paving | 5 | fence post concrete calculator, post hole concrete calculator, concrete calculator for post holes, concrete hole calculator, concrete post hole calculator |
| `power-calculator-physics` | Science > Physics | 5 | physics calculator, power calculator physics, force calculator physics, power formula calculator, power calculator |
| `pregnancy-week-calculator` | Health > Pregnancy & Fertility | 5 | mean sac diameter calculator, crl calculator, gestational age calculator by edd, gestational age calculator from edd, gestational age calculator |
| `price-elasticity-of-demand-calculator` | Finance > Economics | 5 | elasticity calculator, elasticity of demand calculator, price elasticity of demand calculator, cross elasticity of demand calculator, demand function calculator |
| `profit-margin-calculator` | Finance | 5 | profit margin calculator, gross profit margin calculator, profit margins calculator, margin profit calculator, profit margin percentage calculator |
| `projectile-motion-calculator` | Science > Physics | 5 | projectile motion calculator, trajectory calculator, projectile calculator, max height calculator, maximum height calculator |
| `prorated-salary-calculator` | Jobs & Education > Salary, Income & Career | 5 | prorated salary calculator, pro rata calculator, part time salary calculator, prorated amount calculator, part time to full time calculator |
| `quadratic-formula-calculator` | Science > Math | 5 | quadratic formula calculator, discriminant calculator, discriminant function calculator, find the discriminant calculator, factoring quadratics calculator |
| `rc-filter-calculator` | Science > Electrical & Electronics Engineering | 5 | low pass filter calculator, rc filter calculator, rc calculator, rc circuit calculator, high pass filter calculator |
| `real-estate-commission-calculator` | Real Estate > Home Value, Equity & Selling | 5 | real estate commission calculator, realtor commission calculator, real estate agent commission calculator, realtor fee calculator, realtor calculator |
| `roi-calculator` | Finance | 5 | roi calculator, ror calculator, simple roi calculator, free roi calculator, roi calculator formula |
| `scientific-calculator` | Science > Scientific & Graphing | 5 | e calculator, decimal scientific calculator, calculator e, e on calculator, calculator with e |
| `spring-calculator` | Science > Mechanical & Structural Engineering | 5 | spring constant calculator, hooke's law calculator, spring force calculator, spring calculator, torsion spring calculator |
| `surface-area-calculator` | Science > Math | 5 | surface area calculator, lateral surface area calculator, surface area calculator triangular prism, triangular prism surface area calculator, surface area of a triangular prism calculator |
| `system-of-equations-calculator` | Science > Math | 5 | substitution calculator, solving systems by substitution calculator, substitution method calculator, solve systems of equations calculator, system of equations substitution calculator |
| `t-test-calculator` | Science > Statistics & Probability | 5 | t test calculator, t-test calculator, unpaired t test calculator, student t test calculator, independent t test calculator |
| `tdee-calculator` | Food & Drink > Diet, Macro & Meal Planning | 5 | weight maintenance calculator, maintenance calculator, maintain weight calculator, body maintenance calculator, maintenance weight calculator |
| `twos-complement-calculator` | Science > Computer, Network & IT | 5 | 2's complement calculator, two's complement calculator, 2s complement calculator, twos complement calculator, two's complement addition calculator |
| `velocity-calculator` | Science > Physics | 5 | velocity calculator, final velocity calculator, average speed calculator, average velocity calculator, final speed calculator |
| `volume-of-sphere-calculator` | Science > Math | 5 | sphere calculator, sphere volume calculator, volume of a sphere calculator, volume of sphere calculator, sphere surface area calculator |
| `website-ad-revenue-calculator` | Finance | 5 | ad revenue calculator, adsense calculator, website ad revenue calculator, google adsense calculator, adsense revenue calculator |
| `weight-loss-percentage-calculator` | Food & Drink > Diet, Macro & Meal Planning | 5 | weight loss percentage calculator, percent weight loss calculator, percentage weight loss calculator, percentage of weight loss calculator, weight loss calculator percentage |
| `weight-watchers-points-calculator` | Food & Drink > Diet, Macro & Meal Planning | 5 | weight watcher point calculator, weight watcher points calculator, free weight watchers calculator, weight watchers food points calculator, ww calculator |
| `3d-print-price-calculator` | Shopping > Pricing, Markup & Seller Fee | 4 | filament calculator, filament cost calculator, 3d print price calculator, 3d printing calculator |
| `50-30-20-budget-rule-calculator` | Finance > Budget > Budgeting Methods & Planning | 4 | 50/30/20 calculator, 50 30 20 calculator, 50 30 20 budget calculator, 50 20 30 calculator |
| `acceleration-calculator` | Science > Physics | 4 | acceleration calculator, average acceleration calculator, acceleration calculator physics, acceleration formula calculator |
| `agi-calculator` | Finance > Tax | 4 | agi calculator, adjusted gross income calculator, modified adjusted gross income calculator, modified agi calculator |
| `annual-mileage-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 4 | annual mileage calculator, yearly mileage calculator, miles per year calculator, mileage per year calculator |
| `arithmetic-sequence-calculator` | Science > Math | 4 | arithmetic sequence calculator, explicit formula calculator, fibonacci sequence calculator, arithmetic sequence formula calculator |
| `army-acft-calculator` | Law & Government > Military & Veterans | 4 | acft calculator, aft score calculator, aft calculator army, army acft calculator |
| `army-apft-calculator` | Law & Government > Military & Veterans | 4 | apft calculator, apft score calculator, army pt test calculator, army apft calculator |
| `aspect-ratio-calculator` | Shopping > Electronics, Energy & Tech | 4 | 16:9 calculator, 16:9 ratio calculator, screen ratio calculator, 16:9 aspect ratio calculator |
| `average-rate-of-change-calculator` | Science > Math | 4 | rate of change calculator, average rate of change calculator, rate of change formula calculator, maximum rate of change calculator |
| `bac-calculator` | Law & Government > Court, Criminal & Legal Fee | 4 | etg calculator, etg calculator formula, etg test calculator, how long does alcohol stay in your breath calculator |
| `battery-charge-time-calculator` | Shopping > Electronics, Energy & Tech | 4 | battery charge time calculator, battery charge calculator, battery charging time calculator, charge time calculator |
| `beer-lambert-law-calculator` | Science > Chemistry | 4 | beer's law calculator, absorbance calculator, beer lambert law calculator, beers law calculator |
| `bike-pace-calculator` | Sports > Cycling | 4 | bike pace calculator, bike speed calculator, cycling calculator, cycling power calculator |
| `biweekly-pay-schedule-calculator` | Business & Industrial > HR, Marketing & Business Operations | 4 | biweekly calculator, pay period calculator, bi weekly calculator, pay day calculator |
| `bond-price-calculator` | Finance > Investment > Bond & Fixed Income | 4 | bond price calculator, bond valuation calculator, bond value calculator, bond return calculator |
| `box-fill-calculator` | House & Garden > HVAC, Plumbing & Electrical | 4 | box fill calculator, junction box size calculator, nec box fill calculator, electrical box fill calculator |
| `brick-calculator` | House & Garden > Concrete, Masonry & Paving | 4 | brick calculator, brick wall calculator, brick calculator wall, brick calculator square feet |
| `cagr-calculator` | Finance > Investment > Investment Returns & Planning | 4 | cagr calculator, compound annual growth rate calculator, annual growth rate calculator, reverse cagr calculator |
| `car-fuel-cost-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 4 | fuel calculator, gas spending calculator, fuel cost calculator india, gas miles calculator |
| `car-lease-calculator` | Finance > Car & Vehicle Cost > Car Lease, Rental & Transport | 4 | leasing a car calculator, lease vehicle calculator, lease rate calculator, automobile lease calculator |
| `commission-calculator` | Jobs & Education > Salary, Income & Career | 4 | commission calculator, sales commission calculator, commission pay calculator, life insurance commission calculator |
| `concentration-calculator` | Science > Chemistry | 4 | concentration calculator, concentration calculator chemistry, percent solution calculator, how many solutions calculator |
| `credit-card-rewards-optimization-calculator` | Finance > Budget > Money-Saving & Spending | 4 | cash back calculator, cashback calculator, credit card cash back calculator, points vs cash back calculator |
| `cross-product-calculator` | Science > Math | 4 | cross product calculator, vector cross product calculator, matrix cross product calculator, cross product of two vectors calculator |
| `ctr-calculator` | Finance | 4 | ctr calculator, click through rate calculator, click thru rate calculator, ctr calculator formula |
| `curtain-size-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 4 | curtain size calculator, curtain width calculator, curtain calculator, pleat calculator |
| `degrees-of-freedom-calculator` | Science > Statistics & Probability | 4 | degrees of freedom calculator, degree of freedom calculator, degree calculator, degrees calculator |
| `depreciation-calculator` | Finance | 4 | depreciation calculator, depreciation schedule calculator, insurance depreciation calculator, depreciation expense calculator |
| `drag-coefficient-calculator` | Science > Mechanical & Structural Engineering | 4 | drag calculator, air resistance calculator, drag force calculator, drag coefficient calculator |
| `elo-rating-calculator` | Sports > Other Sports | 4 | elo calculator, chess elo calculator, elo rating calculator, chess rating calculator |
| `ev-charging-cost-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 4 | tesla charging calculator, tesla charging cost calculator, tesla supercharger cost calculator, charge calculator |
| `exponential-equation-calculator` | Science > Math | 4 | exponential function calculator, exponential function given two points calculator, exponential functions calculator, exponential function graph calculator |
| `free-space-path-loss-calculator` | Science > Electrical & Electronics Engineering | 4 | free space path loss calculator, path loss calculator, fspl calculator, free space loss calculator |
| `friction-calculator` | Science > Physics | 4 | friction calculator, friction force calculator, coefficient of friction calculator, coefficient of kinetic friction calculator |
| `furnace-size-calculator` | House & Garden > HVAC, Plumbing & Electrical | 4 | furnace btu calculator, furnace size calculator, furnace sizing calculator, furnace calculator |
| `gear-ratio-calculator` | Science > Mechanical & Structural Engineering | 4 | gear ratio calculator, gear reduction calculator, simple gear ratio calculator, gear ratios calculator |
| `goat-gestation-calculator` | Business & Industrial > Agriculture & Livestock | 4 | goat gestation calculator, goat due date calculator, goat pregnancy calculator, boer goat gestation calculator |
| `gross-monthly-income-calculator` | Jobs & Education > Salary, Income & Career | 4 | monthly gross income calculator, gross monthly income calculator, gm monthly income calculator, what is my gross income calculator |
| `hemisphere-volume-calculator` | Science > Math | 4 | hemisphere volume calculator, volume of hemisphere calculator, hemisphere calculator, volume of a hemisphere calculator |
| `hourly-to-annual-salary-calculator` | Jobs & Education > Salary, Income & Career | 4 | hourly to yearly salary calculator, yearly wage calculator, salary calculator hourly to annual, yearly income calculator hourly |
| `hydration-needs-calculator` | Food & Drink > Coffee, Caffeine & Drink | 4 | hydration calculator, how much water should i drink calculator, water drink calculator, how much water to drink calculator |
| `internet-speed-calculator` | Shopping > Electronics, Energy & Tech | 4 | bandwidth calculator, speed test calculator, internet calculator, mbps calculator |
| `interval-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 4 | interval calculator, semitone calculator, music interval calculator, interval calculator music |
| `inventory-turnover-calculator` | Finance | 4 | inventory turnover ratio calculator, inventory turnover calculator, inventory calculator, turnover calculator |
| `kwh-cost-calculator` | Shopping > Electronics, Energy & Tech | 4 | electricity cost calculator, kwh calculator cost, kwh cost calculator, kwh calculator |
| `lc-resonance-calculator` | Science > Electrical & Electronics Engineering | 4 | lc resonance calculator, resonant frequency calculator, resonance calculator, lc calculator |
| `log-base-2-calculator` | Science > Scientific & Graphing | 4 | log base 2 calculator, log2 calculator, log calculator base 2, log base calculator |
| `log-properties-calculator` | Science > Math | 4 | condense logarithms calculator, condensing logarithms calculator, logs calculator, write as a single logarithm calculator |
| `lumber-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 4 | 2x4 calculator, lumber calculator, wood calculator, 2x6 calculator |
| `material-estimator-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 4 | building material calculator, construction material calculator, material estimator calculator, material cost calculator |
| `matrix-inverse-calculator` | Science > Math | 4 | inverse matrix calculator, matrix inverse calculator, inverse of a matrix calculator, find inverse of matrix calculator |
| `miles-to-steps-calculator` | Sports > Hiking | 4 | stride length calculator, miles to steps calculator, steps per mile calculator, steps in a mile calculator |
| `missouri-car-sales-tax-calculator` | Shopping > Sales Tax, VAT & Import Duty | 4 | missouri car sales tax calculator, missouri vehicle sales tax calculator, missouri auto sales tax calculator, missouri car tax calculator |
| `moles-to-molecules-calculator` | Science > Chemistry | 4 | avogadro's number calculator, moles to atoms calculator, number of moles calculator, moles to molecules calculator |
| `moment-of-inertia-calculator` | Science > Mechanical & Structural Engineering | 4 | moment of inertia calculator, inertia calculator, area moment of inertia calculator, second moment of area calculator |
| `mortgage-points-calculator` | Real Estate > Mortgage > Mortgage Payment, Type & Cost | 4 | mortgage calculator with points, mortgage calculator points, mortgage point calculator, mortgage points calculator |
| `net-force-calculator` | Science > Physics | 4 | net force calculator, force calculator, resultant force calculator, forces calculator |
| `null-space-calculator` | Science > Math | 4 | null space calculator, nullity calculator, null space of a matrix calculator, left null space calculator |
| `parabola-calculator` | Science > Math | 4 | parabola calculator, parabola equation calculator, graph parabola calculator, parabola graph calculator |
| `parallel-plate-capacitor-calculator` | Science > Electrical & Electronics Engineering | 4 | capacitance calculator, capacitors in parallel calculator, parallel plate capacitor calculator, parallel capacitor calculator |
| `percent-error-calculator` | Science > Statistics & Probability | 4 | percent error calculator, percentage error calculator, accuracy calculator, error calculator |
| `pet-quality-of-life-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 4 | dog quality of life calculator, cat quality of life calculator, senior dog quality of life calculator, quality of life calculator |
| `pizza-calculator` | Food & Drink > Party & Event Food | 4 | pizza calculator for party, pizza area calculator, pizza calculator, pizza math calculator |
| `plywood-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 4 | plywood calculator, mdf calculator, how many sheets of plywood do i need calculator, plywood sheet calculator |
| `price-per-ounce-calculator` | Shopping > Discount, Tip & Unit Price | 4 | price per ounce calculator, price per oz calculator, cost per ounce calculator, cost per oz calculator |
| `property-appreciation-calculator` | Real Estate > Home Value, Equity & Selling | 4 | home appreciation calculator, house appreciation calculator, property appreciation calculator, home value appreciation calculator |
| `rational-irrational-calculator` | Science > Math | 4 | rational or irrational calculator, rational number calculator, rational numbers calculator, irrational number calculator |
| `reading-time-calculator` | Arts & Entertainment > Books, Reading & Writing | 4 | reading time calculator, read time calculator, reading calculator, time to read calculator |
| `rental-property-roi-calculator` | Real Estate > Rental Property & Investment | 4 | real estate investment calculator, rental investment calculator, roi rental property calculator, rental return on investment calculator |
| `roas-calculator` | Finance | 4 | roas calculator, return on ad spend calculator, ad spend calculator, target roas calculator |
| `roof-truss-calculator` | House & Garden > Roofing & Gutter | 4 | roof truss calculator, build your own trusses calculator, roof truss design calculator, roof truss span calculator |
| `shed-ramp-calculator` | House & Garden > Deck, Fence & Stair | 4 | ramp calculator, ramp length calculator, shed ramp angle calculator, ramp angle calculator |
| `siding-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 4 | vinyl siding calculator, siding estimate calculator, house siding calculator, siding square calculator |
| `ski-din-calculator` | Sports > Winter Sports | 4 | ski din calculator, din setting calculator, din calculator ski, ski binding din calculator |
| `skinfold-body-fat-calculator` | Sports > Sports Performance | 4 | body fat calculator caliper, skinfold body fat calculator, body fat caliper calculator, caliper body fat calculator |
| `soil-dirt-calculator` | House & Garden > Gravel, Soil & Landscaping | 4 | soil calculator, soil volume calculator, dirt volume calculator, raised bed soil calculator |
| `speed-playback-calculator` | Arts & Entertainment > Tarot, Astrology & Fun | 4 | playback speed calculator, playback calculator, video speed calculator, video time calculator |
| `split-calculator` | Sports > Running | 4 | split calculator, lap split calculator, running splits calculator, marathon split calculator |
| `stair-calculator` | House & Garden > Deck, Fence & Stair | 4 | rise run calculator, spiral stair calculator, run rise calculator, rise run angle calculator |
| `statistical-significance-calculator` | Science > Statistics & Probability | 4 | hypothesis testing calculator, statistical power calculator, level of significance calculator, f test calculator |
| `t-critical-value-calculator` | Science > Statistics & Probability | 4 | critical t value calculator, t critical value calculator, t value calculator, t-value calculator |
| `travel-time-calculator` | Travel > Distance, Route & Travel Time | 4 | driving time calculator, travel time calculator, drive time calculator, trip time calculator |
| `tv-mounting-height-calculator` | Shopping > Electronics, Energy & Tech | 4 | tv mounting height calculator, tv height calculator, tv wall mount height calculator, tv antenna height calculator |
| `tv-size-calculator` | Shopping > Electronics, Energy & Tech | 4 | tv screen size calculator, tv size to distance calculator, tv calculator, tv size calculator |
| `vdot-calculator` | Sports > Running | 4 | tempo pace calculator, tempo run pace calculator, training paces calculator, vo2 pace calculator |
| `weight-loss-calculator` | Food & Drink > Diet, Macro & Meal Planning | 4 | free weight loss calculator, carb calculator for weight loss, weight loss calculator free, peptide calculator mg for weight loss |
| `z-score-calculator` | Science > Statistics & Probability | 4 | standardized test statistic calculator, t score calculator, z value calculator, z statistic calculator |
| `1-8-to-1-4-mile-calculator` | Sports > Motorsports & Racing | 3 | 1/4 mile et calculator, egt calculator, 1/4 mile calculator |
| `403b-calculator` | Finance > Retirement | 3 | 403b calculator, 403 b calculator, roth 403b calculator |
| `45-45-90-triangle-calculator` | Science > Math | 3 | 45 45 90 triangle calculator, special right triangles calculator, 45-45-90 triangle calculator |
| `ac-size-calculator` | House & Garden > HVAC, Plumbing & Electrical | 3 | hvac tonnage calculator, air conditioner calculator, tonnage calculator hvac |
| `accounts-receivable-turnover-calculator` | Finance | 3 | accounts receivable turnover calculator, account receivable turnover calculator, accounts receivable calculator |
| `ada-ramp-slope-calculator` | Law & Government > Government Fees & Public Finance | 3 | ramp slope calculator, ada ramp slope calculator, ada ramp calculator |
| `age-difference-calculator` | Science > Math | 3 | age difference calculator, age gap calculator, age calculator difference |
| `air-density-calculator` | Science > Earth, Weather & Environment | 3 | air density calculator, density of air calculator, air pressure calculator |
| `appliance-wattage-calculator` | Shopping > Electronics, Energy & Tech | 3 | wattage calculator, power draw calculator, electrical power calculator |
| `beam-deflection-calculator` | Science > Mechanical & Structural Engineering | 3 | beam deflection calculator, cantilever beam deflection calculator, cantilever beam calculator |
| `beam-span-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 3 | beam span calculator, wood beam span calculator, wood beam calculator |
| `bike-frame-size-calculator` | Sports > Cycling | 3 | bike size calculator, bike frame size calculator, road bike size calculator |
| `black-scholes-calculator` | Finance > Investment > Stock & Options | 3 | black scholes calculator, black scholes model calculator, black-scholes calculator |
| `bmi-child-teen-calculator` | Sports > Sports Performance | 3 | teen bmi calculator, bmi teen calculator, bmi calculator teens |
| `bond-interest-calculator` | Finance > Investment > Bond & Fixed Income | 3 | coupon rate calculator, bond coupon rate calculator, bond payment calculator |
| `btu-calculator` | House & Garden > HVAC, Plumbing & Electrical | 3 | ac btu calculator, air conditioner btu calculator, ac tonnage calculator |
| `california-sales-tax-calculator` | Finance > Tax > Tax & Paycheck | 3 | california sales tax calculator, sales tax calculator california, sales tax california calculator |
| `capacitive-reactance-calculator` | Science > Electrical & Electronics Engineering | 3 | capacitive reactance calculator, capacitor impedance calculator, zc calculator |
| `capacitor-charge-time-calculator` | Science > Electrical & Electronics Engineering | 3 | rc time constant calculator, capacitor charge calculator, time constant calculator |
| `capacitor-series-parallel-calculator` | Science > Electrical & Electronics Engineering | 3 | series capacitor calculator, capacitors in series calculator, capacitance in series calculator |
| `cash-flow-calculator` | Finance | 3 | cash flow calculator, free cash flow calculator, annual cash flow calculator |
| `cbm-calculator` | Business & Industrial > Freight, Logistics & Warehouse | 3 | cbm calculator, cubic meter calculator, cubic meters calculator |
| `central-limit-theorem-calculator` | Science > Statistics & Probability | 3 | central limit theorem calculator, sampling distribution calculator, mean of sampling distribution calculator |
| `centripetal-force-calculator` | Science > Physics | 3 | centripetal force calculator, centripetal acceleration calculator, centrifugal force calculator |
| `compound-miter-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 3 | miter angle calculator, miter calculator, angle cut calculator |
| `compression-ratio-calculator` | Sports > Motorsports & Racing | 3 | compression ratio calculator, summit racing compression calculator, compression calculator summit |
| `continuous-compound-interest-calculator` | Finance > Interest Rate | 3 | continuous compound interest calculator, compounded continuously calculator, compound continuously calculator |
| `conversion-rate-calculator` | Finance | 3 | conversion rate calculator, ecommerce conversion rate calculator, lead conversion rate calculator |
| `cost-of-goods-sold-calculator` | Finance | 3 | cost of goods sold calculator, cogs calculator, cost of goods calculator |
| `counter-height-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 3 | desk height calculator, standing desk height calculator, ergonomic calculator |
| `court-deadline-calculator` | Law & Government > Court, Criminal & Legal Fee | 3 | atkinson baker deadline calculator, deadline calculator legal, litigation deadline calculator |
| `daily-compound-interest-calculator` | Finance > Interest Rate | 3 | daily compounding calculator, interest compounded daily calculator, daily compounding interest calculator |
| `daily-interest-calculator` | Finance > Interest Rate | 3 | daily interest calculator, daily interest rate calculator, interest per day calculator |
| `data-usage-calculator` | Shopping > Electronics, Energy & Tech | 3 | data usage calculator, data calculator, internet data usage calculator |
| `debt-service-coverage-ratio-calculator` | Finance | 3 | debt service coverage ratio calculator, debt service coverage calculator, dscr ratio calculator |
| `diagonalize-matrix-calculator` | Science > Math | 3 | diagonalize matrix calculator, diagonalization calculator, matrix diagonalization calculator |
| `e6b-flight-calculator` | Science > Earth, Weather & Environment | 3 | ground speed calculator, wind component calculator, cross wind calculator |
| `edpi-calculator` | Shopping > Electronics, Energy & Tech | 3 | edpi calculator, edpi calculator valorant, edpi calculator fortnite |
| `effective-interest-rate-calculator` | Finance > Interest Rate | 3 | effective interest rate calculator, ear calculator, effective annual rate calculator |
| `engagement-rate-calculator` | Business & Industrial > HR, Marketing & Business Operations | 3 | engagement rate calculator, social media engagement rate calculator, engagement calculator |
| `equilibrium-constant-calculator` | Science > Chemistry | 3 | equilibrium constant calculator, keq calculator, equilibrium calculator |
| `fence-picket-calculator` | House & Garden > Deck, Fence & Stair | 3 | fence picket calculator, picket fence calculator, picket spacing calculator |
| `florida-sales-tax-calculator` | Finance > Tax > Tax & Paycheck | 3 | florida sales tax calculator, sales tax calculator florida, sales tax florida calculator |
| `gmi-calculator` | Health > Sleep & Medical | 3 | blood sugar calculator, glucose calculator, blood glucose calculator |
| `gps-coordinates-distance-calculator` | Travel > Distance, Route & Travel Time | 3 | great circle distance calculator, coordinate distance calculator, longitude and latitude calculator |
| `gravel-cost-calculator` | House & Garden > Gravel, Soil & Landscaping | 3 | gravel driveway cost calculator, gravel cost calculator, pea gravel cost calculator |
| `gravitational-force-calculator` | Science > Physics | 3 | gravitational force calculator, force of gravity calculator, gravity calculator |
| `gross-profit-calculator` | Finance | 3 | gross profit calculator, gross profit percentage calculator, gross profit rate calculator |
| `growth-rate-calculator` | Finance > Economics | 3 | growth rate calculator, average growth rate calculator, population growth rate calculator |
| `half-life-calculator` | Science > Chemistry | 3 | half life calculator, drug half life calculator, half-life calculator |
| `heat-transfer-calculator` | Science > Mechanical & Structural Engineering | 3 | heat transfer calculator, thermal conductivity calculator, thermal resistance calculator |
| `height-converter-calculator` | Science > Math | 3 | height calculator in cm, height in inches calculator, height calculator in feet |
| `hydrostatic-pressure-calculator` | Science > Mechanical & Structural Engineering | 3 | pressure calculator, hydrostatic pressure calculator, water pressure calculator |
| `hyperbolic-functions-calculator` | Science > Math | 3 | cosh calculator, tanh calculator, sinh calculator |
| `hypergeometric-distribution-calculator` | Science > Statistics & Probability | 3 | hypergeometric distribution calculator, hypergeometric calculator, hyper geometric calculator |
| `ideal-gas-law-calculator` | Science > Chemistry | 3 | ideal gas law calculator, pv nrt calculator, pv=nrt calculator |
| `implantation-calculator` | Health > Pregnancy & Fertility | 3 | implantation calculator, implantation bleeding calculator, implantation date calculator |
| `income-tax-calculator` | Finance > Tax | 3 | il income tax calculator, income tax calculator state, income tax calculator nyc |
| `inflation-calculator` | Finance > Investment > Investment Returns & Planning | 3 | rent inflation calculator, inflation calculator cpi, wage inflation calculator |
| `interior-painting-cost-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 3 | calculator painting, painting calculator, paint estimate calculator |
| `interpolation-calculator` | Science > Math | 3 | interpolation calculator, linear interpolation calculator, double interpolation calculator |
| `inverse-normal-distribution-calculator` | Science > Statistics & Probability | 3 | invnorm calculator, inverse normal distribution calculator, inverse normal calculator |
| `investment-present-value-calculator` | Finance > Investment > Investment Returns & Planning | 3 | present value calculator, pv calculator, net present value calculator |
| `investment-return-calculator` | Finance > Investment > Investment Returns & Planning | 3 | annual rate of return calculator, annualized return calculator, expected return calculator |
| `law-of-cosines-calculator` | Science > Math | 3 | law of cosines calculator, law of cosine calculator, law of sines and cosines calculator |
| `lean-body-mass-calculator` | Sports > Sports Performance | 3 | lean body mass calculator, lbm calculator, lean mass calculator |
| `log-weight-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 3 | log weight calculator, wood weight calculator, tree weight calculator |
| `lumens-calculator` | House & Garden > HVAC, Plumbing & Electrical | 3 | lumens calculator, lumen calculator, lumens calculator room size |
| `markup-percentage-calculator` | Finance | 3 | percent markup calculator, markup percentage calculator, percentage markup calculator |
| `matrix-transpose-calculator` | Science > Math | 3 | transpose of a matrix calculator, matrix transpose calculator, transpose matrix calculator |
| `mean-absolute-deviation-calculator` | Science > Statistics & Probability | 3 | mean absolute deviation calculator, mad calculator, absolute deviation calculator |
| `military-bmi-calculator` | Law & Government > Military & Veterans | 3 | navy bmi calculator, military bmi calculator, army bmi calculator |
| `mixed-air-calculator` | House & Garden > HVAC, Plumbing & Electrical | 3 | mixed air calculator, mixed air temperature calculator, mixed air temp calculator |
| `momentum-calculator` | Science > Physics | 3 | momentum calculator, conservation of momentum calculator, change in momentum calculator |
| `monthly-income-calculator` | Jobs & Education > Salary, Income & Career | 3 | monthly income calculator, monthly pay calculator, monthly calculator income |
| `muzzle-energy-calculator` | Sports > Other Sports | 3 | bullet energy calculator, muzzle energy calculator, recoil energy calculator |
| `natural-log-calculator` | Science > Scientific & Graphing | 3 | ln calculator, natural log calculator, natural logarithm calculator |
| `net-effective-rent-calculator` | Real Estate > Rent & Tenant | 3 | net effective rent calculator, commercial rent calculator, net rent calculator |
| `npv-calculator` | Finance > Investment > Investment Returns & Planning | 3 | npv calculator, discount rate calculator, npv calculator online |
| `nth-root-calculator` | Science > Math | 3 | cube root calculator, cubic root calculator, cubed root calculator |
| `odds-converter-calculator` | Sports > Sports Betting & Racing | 3 | odds to percentage calculator, odds to probability calculator, probability to odds calculator |
| `one-rep-max-calculator` | Sports > Sports Performance | 3 | bench press one rep max calculator, estimated 1rm calculator, bench press calculator max |
| `p-value-calculator` | Science > Statistics & Probability | 3 | p-value calculator, p value calculator, p value calculator from t |
| `payback-period-calculator` | Finance | 3 | payback period calculator, discounted payback period calculator, payback calculator |
| `pert-estimate-calculator` | Business & Industrial > HR, Marketing & Business Operations | 3 | pert formula calculator, project calculator, pert calculator |
| `plant-spacing-calculator` | House & Garden > Lawn, Garden & Tree | 3 | plant calculator, plant spacing calculator, tree spacing calculator |
| `price-to-earnings-ratio-calculator` | Finance | 3 | pe calculator, p/e ratio calculator, pe ratio calculator |
| `prime-factorization-calculator` | Science > Math | 3 | prime calculator, prime number calculator, prime factors calculator |
| `probability-distribution-calculator` | Science > Statistics & Probability | 3 | probability distribution calculator, discrete probability distribution calculator, cdf calculator |
| `profit-calculator` | Finance | 3 | profit calculator, marginal profit calculator, profit loss calculator |
| `pump-head-calculator` | House & Garden > HVAC, Plumbing & Electrical | 3 | npsh calculator, npsha calculator, pump horsepower calculator |
| `purchasing-power-parity-calculator` | Finance > Crypto > Currency Exchange & Forex | 3 | buying power calculator, purchasing power calculator, purchasing power parity calculator |
| `quarter-mile-calculator` | Sports > Motorsports & Racing | 3 | et calculator 1/4, 1/4 mile time calculator, quarter mile calculator |
| `relative-humidity-calculator` | Science > Earth, Weather & Environment | 3 | relative humidity calculator, absolute humidity calculator, humidity calculator |
| `rent-per-square-foot-calculator` | Real Estate > Rent & Tenant | 3 | price per sq ft calculator, rent per sq ft calculator, rent per square foot calculator |
| `rent-to-income-ratio-calculator` | Real Estate > Rent & Tenant | 3 | 3x rent calculator, 3x the rent calculator, income to rent calculator |
| `rice-calorie-calculator` | Food & Drink > Food Nutrition & Calorie | 3 | rice calculator, water to rice calculator, rice to water ratio calculator |
| `roof-snow-load-calculator` | House & Garden > Roofing & Gutter | 3 | snow load calculator, roof snow load calculator, roof load calculator |
| `salad-calories-calculator` | Food & Drink > Food Nutrition & Calorie | 3 | salad calorie calculator, salad calories calculator, salad calculator |
| `salary-increase-calculator` | Jobs & Education > Salary, Income & Career | 3 | salary increase calculator, salary growth calculator, salary increase calculator over 10 years |
| `sales-percentage-calculator` | Finance | 3 | sales calculator, sales percentage calculator, sales comp calculator |
| `savings-apy-calculator` | Finance > Savings | 3 | apy calculator savings, savings account apy calculator, apy calculator savings account |
| `savings-withdrawal-calculator` | Finance > Savings | 3 | bankrate savings withdrawal calculator, calculator retirement withdrawal, savings withdrawal calculator bankrate |
| `screen-dimensions-calculator` | Shopping > Electronics, Energy & Tech | 3 | screen calculator, screen dimension calculator, monitor size calculator |
| `sector-area-calculator` | Science > Math | 3 | sector area calculator, area of sector calculator, central angle calculator |
| `shannon-diversity-index-calculator` | Science > Biology & Lab | 3 | shannon diversity index calculator, shannon index calculator, biodiversity calculator |
| `shoe-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 3 | shoe size calculator, shoe size calculator length and width, foot size calculator |
| `slope-percentage-calculator` | Science > Earth, Weather & Environment | 3 | slope percentage calculator, percent slope calculator, slope percent calculator |
| `solar-panel-cost-calculator` | House & Garden > HVAC, Plumbing & Electrical | 3 | solar energy calculator, solar installation calculator, solar panel system cost calculator |
| `solar-panel-loan-calculator` | Finance > Loan > Home Improvement Loan | 3 | solar panel calculator, how many solar panels do i need calculator, solar panels calculator |
| `specific-gravity-calculator` | Science > Chemistry | 3 | specific gravity calculator, specific gravity to density calculator, specific gravity alcohol calculator |
| `stationary-bike-calorie-calculator` | Sports > Cycling | 3 | stationary bike calories calculator, stationary bike calories burned calculator, calories burned stationary bike calculator |
| `subwoofer-box-calculator` | Shopping > Electronics, Energy & Tech | 3 | speaker box volume calculator, subwoofer calculator, speaker box calculator |
| `swim-calorie-calculator` | Sports > Other Sports | 3 | swimming calorie calculator, swim calorie calculator, calories burned swimming calculator |
| `texas-tax-calculator` | Finance > Tax > Tax & Paycheck | 3 | income tax calculator texas, texas taxes calculator, texas tax calculator |
| `thread-calculator` | Science > Mechanical & Structural Engineering | 3 | thread pitch calculator, thread calculator, metric thread calculator |
| `timing-belt-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 3 | belt length calculator, v belt length calculator, v belt calculator |
| `transpose-key-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 3 | transpose key calculator, transpose calculator, transposition calculator |
| `treadmill-calorie-calculator` | Sports > Other Sports | 3 | calories burned treadmill calculator, calories burned on treadmill calculator, best treadmill calorie calculator |
| `two-sample-t-test-calculator` | Science > Statistics & Probability | 3 | test statistic calculator, t statistic calculator, two sample t test calculator |
| `vector-magnitude-calculator` | Science > Math | 3 | vector magnitude calculator, magnitude of a vector calculator, magnitude of vector calculator |
| `video-bitrate-calculator` | Shopping > Electronics, Energy & Tech | 3 | bitrate calculator, streaming bitrate calculator, twitch bitrate calculator |
| `walking-speed-calculator` | Sports > Hiking | 3 | walk calculator, walking pace calculator, walking speed calculator |
| `water-volume-calculator` | House & Garden > Pool, Pond & Water | 3 | tank size calculator, tank calculator, water tank volume calculator |
| `weightlifting-calories-burned-calculator` | Sports > Sports Performance | 3 | weightlifting calorie calculator, weight lifting calorie calculator, weightlifting calories burned calculator |
| `wet-bulb-calculator` | House & Garden > HVAC, Plumbing & Electrical | 3 | wet bulb calculator, wet bulb temperature calculator, wet bulb temp calculator |
| `0-60-time-calculator` | Sports > Motorsports & Racing | 2 | 0-60 calculator, 0 to 60 calculator |
| `2-stroke-oil-mix-calculator` | Sports > Motorsports & Racing | 2 | 50 to 1 gas oil mix calculator, 50 to 1 fuel mix calculator |
| `30-60-90-triangle-calculator` | Science > Math | 2 | 30 60 90 triangle calculator, 30-60-90 triangle calculator |
| `acres-per-hour-calculator` | Business & Industrial > Agriculture & Livestock | 2 | acres per hour calculator, acre per hour calculator |
| `adjoint-matrix-calculator` | Science > Math | 2 | cofactor matrix calculator, adjoint matrix calculator |
| `alcohol-units-calculator` | Food & Drink > Wine, Spirits & Cocktail | 2 | alcohol unit calculator, alcohol units calculator |
| `angular-velocity-calculator` | Science > Physics | 2 | angular velocity calculator, angular speed calculator |
| `antilog-calculator` | Science > Scientific & Graphing | 2 | antilog calculator, inverse log calculator |
| `ap-score-calculator` | Jobs & Education > AP Score | 2 | ap bio score calculator, ap bio grade calculator |
| `apr-to-apy-calculator` | Finance > Interest Rate | 2 | apy to apr calculator, apr to apy calculator |
| `aquarium-size-calculator` | Shopping > Lifestyle, Party & Wedding | 2 | aquarium calculator, aquarium size calculator |
| `archery-draw-length-calculator` | Sports > Other Sports | 2 | draw length calculator, bow draw length calculator |
| `asphalt-calculator` | House & Garden > Concrete, Masonry & Paving | 2 | asphalt calculator, black top calculator |
| `bakers-percentage-calculator` | Food & Drink > Baking & Recipe | 2 | bakers percentage calculator, baker's percentage calculator |
| `basis-point-calculator` | Finance > Interest Rate | 2 | basis points calculator, basis point calculator |
| `belt-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 2 | belt size calculator, belt calculator |
| `bending-stress-calculator` | Science > Mechanical & Structural Engineering | 2 | bending stress calculator, stress calculator |
| `betting-odds-calculator` | Sports > Sports Betting & Racing | 2 | moneyline bet calculator, boxing odds calculator |
| `bike-chain-length-calculator` | Sports > Cycling | 2 | chain length calculator, bike chain length calculator |
| `birthday-paradox-calculator` | Science > Statistics & Probability | 2 | birthday paradox calculator, birthday problem calculator |
| `blood-type-calculator` | Science > Biology & Lab | 2 | blood type calculator, child blood type calculator |
| `board-batten-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 2 | board and batten wall calculator, batten calculator |
| `body-roundness-index-calculator` | Sports > Sports Performance | 2 | body roundness index calculator, bri calculator |
| `boiler-size-calculator` | House & Garden > HVAC, Plumbing & Electrical | 2 | boiler size calculator, boiler sizing calculator |
| `bolt-circle-calculator` | Science > Mechanical & Structural Engineering | 2 | bolt circle calculator, bolt hole circle calculator |
| `braking-distance-calculator` | Sports > Motorsports & Racing | 2 | stopping distance calculator, braking distance calculator |
| `break-even-calculator` | Finance | 2 | break even calculator, break even analysis calculator |
| `brine-calculator` | Food & Drink > Cooking Time, Meat & Curing | 2 | brine calculator, salt brine calculator |
| `buoyancy-calculator` | Science > Mechanical & Structural Engineering | 2 | buoyancy calculator, buoyant force calculator |
| `business-valuation-calculator` | Finance | 2 | valuation calculator, startup valuation calculator |
| `caffeine-calculator` | Food & Drink > Coffee, Caffeine & Drink | 2 | caffeine calculator by weight and age, caffeine calculator |
| `california-car-sales-tax-calculator` | Shopping > Sales Tax, VAT & Import Duty | 2 | california car sales tax calculator, california car tax calculator |
| `california-tax-calculator` | Finance > Tax > Tax & Paycheck | 2 | ca state taxes calculator, california state taxes calculator |
| `capacitor-energy-calculator` | Science > Electrical & Electronics Engineering | 2 | capacitor calculator, capacitor energy calculator |
| `car-total-cost-of-ownership-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 2 | cost per mile calculator, cost of driving calculator |
| `carbon-equivalent-calculator` | Science > Mechanical & Structural Engineering | 2 | carbon equivalent calculator, ce calculator |
| `carpet-cost-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 2 | carpet cost calculator, carpet calculator cost |
| `cattle-gestation-calculator` | Business & Industrial > Agriculture & Livestock | 2 | gestation calculator cattle, calving calculator |
| `center-of-mass-calculator` | Science > Physics | 2 | center of mass calculator, center of gravity calculator |
| `chord-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 2 | chord length calculator, chord calculator |
| `chord-inversion-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 2 | seventh chord calculator, triad calculator |
| `christmas-lights-calculator` | Shopping > Lifestyle, Party & Wedding | 2 | christmas tree light calculator, christmas light calculator |
| `churn-rate-calculator` | Finance | 2 | customer retention rate calculator, churn rate calculator |
| `coefficient-of-variation-calculator` | Science > Statistics & Probability | 2 | coefficient of variation calculator, cv calculator |
| `coffee-calculator` | Food & Drink > Coffee, Caffeine & Drink | 2 | coffee calculator, coffee to water ratio calculator |
| `coin-flip-probability-calculator` | Science > Statistics & Probability | 2 | coin flip calculator, coin flip probability calculator |
| `cold-brew-ratio-calculator` | Food & Drink > Coffee, Caffeine & Drink | 2 | cold brew calculator, cold brew ratio calculator |
| `commercial-real-estate-calculator` | Real Estate > Commercial Real Estate | 2 | commercial real estate cap rate calculator, cap rate calculator commercial real estate |
| `consumer-surplus-calculator` | Finance > Economics | 2 | consumer surplus calculator, producer surplus calculator |
| `container-load-calculator` | Business & Industrial > Freight, Logistics & Warehouse | 2 | container calculator, container stuffing calculator |
| `cost-per-unit-calculator` | Finance | 2 | cost per unit calculator, unit cost calculator |
| `cost-to-build-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 2 | building calculator, construction calculator free |
| `coulombs-law-calculator` | Science > Physics | 2 | coulomb's law calculator, coulombs law calculator |
| `cpc-calculator` | Finance | 2 | cpc calculator, cost per click calculator |
| `critical-value-calculator` | Science > Statistics & Probability | 2 | critical value calculator, f critical value calculator |
| `crossover-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 2 | crossover calculator, speaker crossover calculator |
| `crosswind-calculator` | Science > Earth, Weather & Environment | 2 | crosswind calculator, crosswind component calculator |
| `customer-acquisition-cost-calculator` | Finance | 2 | customer acquisition cost calculator, cpa calculator |
| `debt-avalanche-calculator` | Finance > Credit & Debt | 2 | avalanche debt method calculator, avalanche method calculator |
| `dew-point-calculator` | Science > Earth, Weather & Environment | 2 | dew point calculator, dewpoint calculator |
| `dilution-ratio-calculator` | Science > Chemistry | 2 | dilution ratio calculator, mix ratio calculator |
| `dipole-antenna-calculator` | Science > Electrical & Electronics Engineering | 2 | dipole calculator, antenna calculator |
| `direct-variation-calculator` | Science > Math | 2 | direct variation calculator, variation calculator |
| `disposable-income-calculator` | Finance > Economics | 2 | disposable income calculator, what you spend calculator |
| `dividend-calculator` | Finance > Investment > Stock & Options | 2 | simple dividend calculator, dividend rate calculator |
| `dividend-yield-calculator` | Finance > Investment > Stock & Options | 2 | yield calculator, dividend yield calculator |
| `dog-chocolate-toxicity-calculator` | Pets & Animals > Vet Clinical & Toxicity | 2 | how much chocolate will kill a dog calculator, chocolate calculator |
| `dot-product-calculator` | Science > Math | 2 | dot product calculator, vector dot product calculator |
| `dry-matter-calculator` | Pets & Animals > Pet Food, Care & Cost | 2 | dry matter calculator, dry matter basis calculator |
| `dynamic-compression-ratio-calculator` | Sports > Motorsports & Racing | 2 | dynamic compression calculator, dynamic compression ratio calculator |
| `earthquake-magnitude-calculator` | Science > Earth, Weather & Environment | 2 | magnitude calculator, earthquake calculator |
| `eigenvalue-calculator` | Science > Math | 2 | eigenvalue and eigenvector calculator, eigenvectors calculator |
| `elliptical-calories-calculator` | Sports > Other Sports | 2 | elliptical calorie calculator, elliptical calories burned calculator |
| `employee-cost-calculator` | Business & Industrial > HR, Marketing & Business Operations | 2 | employee calculator, cost of employee turnover calculator |
| `engine-hours-to-miles-calculator` | Shopping > Vehicle, Resale & Collectibles | 2 | engine hours to miles calculator, hours to miles calculator |
| `enthalpy-calculator` | Science > Chemistry | 2 | enthalpy calculator, delta h calculator |
| `era-calculator` | Sports > Baseball & Softball | 2 | era calculator, era calculator baseball |
| `erf-calculator` | Science > Math | 2 | erf calculator, error function calculator |
| `expense-ratio-calculator` | Finance > Investment > Fund & ETF | 2 | expense ratio calculator, 401k expense ratio calculator |
| `f1-score-calculator` | Science > Statistics & Probability | 2 | confusion matrix calculator, f1 score calculator |
| `fence-post-calculator` | House & Garden > Deck, Fence & Stair | 2 | fence post calculator, fence post spacing calculator |
| `fiber-intake-calculator` | Food & Drink > Diet, Macro & Meal Planning | 2 | fiber calculator, fiber intake calculator |
| `fica-tax-calculator` | Finance > Tax > Tax & Paycheck | 2 | fica tax calculator, fica calculator |
| `finance-calculator` | Finance > Interest Rate | 2 | finance calculator online, free finance calculator online |
| `financial-calculator` | Finance > Investment > Investment Returns & Planning | 2 | tvm calculator, time value money calculator |
| `fisher-exact-test-calculator` | Science > Statistics & Probability | 2 | fisher exact test calculator, fisher's exact test calculator |
| `flooring-cost-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 2 | flooring cost calculator, flooring calculator cost |
| `free-fall-calculator` | Science > Physics | 2 | free fall calculator, free fall distance calculator |
| `french-drain-calculator` | House & Garden > Gravel, Soil & Landscaping | 2 | french drain calculator, french drain gravel calculator |
| `galactic-signature-calculator` | Arts & Entertainment > Tarot, Astrology & Fun | 2 | mayan astrology calculator, mayan calendar calculator |
| `gallons-to-pounds-calculator` | Science > Physics | 2 | water weight calculator, gallons to pounds calculator |
| `gambrel-roof-calculator` | House & Garden > Roofing & Gutter | 2 | gambrel roof calculator, gambrel roof truss calculator |
| `gdp-calculator` | Finance > Economics | 2 | gdp calculator, real gdp calculator |
| `gdp-per-capita-calculator` | Finance > Economics | 2 | gdp per capita calculator, real gdp per capita calculator |
| `gibbs-free-energy-calculator` | Science > Chemistry | 2 | delta g calculator, gibbs free energy calculator |
| `gravitational-potential-energy-calculator` | Science > Physics | 2 | potential energy calculator, gravitational potential energy calculator |
| `gross-rent-multiplier-calculator` | Real Estate > Rental Property & Investment | 2 | grm calculator, gross rent multiplier calculator |
| `harmonic-mean-calculator` | Science > Statistics & Probability | 2 | geometric mean calculator, harmonic mean calculator |
| `heat-index-calculator` | Science > Earth, Weather & Environment | 2 | heat index calculator, feels like temperature calculator |
| `heat-loss-calculator` | House & Garden > HVAC, Plumbing & Electrical | 2 | heat loss calculator, heat calculator |
| `hiking-grade-calculator` | Sports > Hiking | 2 | elevation grade calculator, hill grade calculator |
| `hockey-save-percentage-calculator` | Sports > Other Sports | 2 | save percentage calculator, goalie save percentage calculator |
| `hourly-to-monthly-salary-calculator` | Jobs & Education > Salary, Income & Career | 2 | hourly to monthly salary calculator, monthly income calculator hourly |
| `house-flip-arv-calculator` | Real Estate > Rental Property & Investment | 2 | arv calculator, free arv calculator |
| `if-it-fits-your-macros-calculator` | Food & Drink > Diet, Macro & Meal Planning | 2 | fat intake calculator, iifym calculator |
| `illinois-tax-calculator` | Finance > Tax > Tax & Paycheck | 2 | income tax calculator illinois, il tax calculator |
| `incline-to-flat-bench-calculator` | Sports > Sports Performance | 2 | incline calculator, incline bench calculator |
| `inductive-reactance-calculator` | Science > Electrical & Electronics Engineering | 2 | inductive reactance calculator, inductor impedance calculator |
| `interest-rate-calculator` | Finance > Interest Rate | 2 | annual interest rate calculator, real interest rate calculator |
| `investment-doubling-time-calculator` | Finance > Investment > Investment Returns & Planning | 2 | doubling time calculator, doubling calculator |
| `jean-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 2 | jean size calculator, what is my jean size calculator |
| `kinetic-energy-calculator` | Science > Physics | 2 | kinetic energy calculator, ke calculator |
| `labor-markup-calculator` | Shopping > Pricing, Markup & Seller Fee | 2 | markup calculator, labor markup calculator |
| `lamb-gestation-calculator` | Business & Industrial > Agriculture & Livestock | 2 | sheep gestation calculator, lambing calculator |
| `law-of-sines-calculator` | Science > Math | 2 | law of sines calculator, law of sine calculator |
| `lever-calculator` | Science > Mechanical & Structural Engineering | 2 | mechanical advantage calculator, lever calculator |
| `lighting-layout-calculator` | House & Garden > HVAC, Plumbing & Electrical | 2 | lighting calculator, light spacing calculator |
| `linear-equation-calculator` | Science > Math | 2 | linear function calculator, body fat calculator linear |
| `loan-calculator` | Finance > Loan > General Loan | 2 | margin loan calculator, cash advance loan calculator |
| `luminosity-calculator` | Science > Astronomy & Space | 2 | wien's law calculator, luminosity calculator |
| `magnetic-force-calculator` | Science > Physics | 2 | magnetic field calculator, magnetic force calculator |
| `manning-equation-calculator` | Science > Mechanical & Structural Engineering | 2 | open channel flow calculator, hydraulic radius calculator |
| `margin-percentage-calculator` | Finance | 2 | margin percentage calculator, percent margin calculator |
| `matrix-determinant-calculator` | Science > Math | 2 | determinant calculator, determinant of a 3x3 matrix calculator |
| `matrix-rank-calculator` | Science > Math | 2 | matrix rank calculator, rank calculator |
| `meal-macro-calculator` | Food & Drink > Diet, Macro & Meal Planning | 2 | fat calculator, grams to calories calculator |
| `metal-roof-calculator` | House & Garden > Roofing & Gutter | 2 | metal roof calculator, metal roofing calculator |
| `milling-speed-feed-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 2 | spindle speed calculator, speeds and feeds calculator |
| `missouri-sales-tax-calculator` | Finance > Tax > Tax & Paycheck | 2 | missouri sales tax calculator, sales tax calculator missouri |
| `modular-exponentiation-calculator` | Science > Math | 2 | modular exponentiation calculator, power mod calculator |
| `mohrs-circle-calculator` | Science > Mechanical & Structural Engineering | 2 | mohr's circle calculator, mohr circle calculator |
| `molarity-calculator` | Science > Chemistry | 2 | molarity calculator, mmol calculator |
| `mortar-calculator` | House & Garden > Concrete, Masonry & Paving | 2 | tile mortar calculator, mortar calculator |
| `mortgage-payment-calculator` | Real Estate > Mortgage > Mortgage Payment, Type & Cost | 2 | piti calculator, mortgage calculator piti |
| `muzzle-velocity-calculator` | Sports > Other Sports | 2 | muzzle velocity calculator, bullet velocity calculator |
| `net-monthly-income-calculator` | Jobs & Education > Salary, Income & Career | 2 | monthly net income calculator, net monthly income calculator |
| `net-profit-margin-calculator` | Finance | 2 | net profit margin calculator, net margin calculator |
| `occupancy-rate-calculator` | Real Estate > Short-Term Rental & Airbnb | 2 | occupancy rate calculator, occupancy calculator |
| `ohio-sales-tax-calculator` | Finance > Tax > Tax & Paycheck | 2 | ohio sales tax calculator, sales tax calculator ohio |
| `ohio-tax-calculator` | Finance > Tax > Tax & Paycheck | 2 | ohio state tax calculator, tax calculator ohio |
| `ops-calculator` | Sports > Baseball & Softball | 2 | ops calculator, ops calculator baseball |
| `options-spread-calculator` | Finance > Investment > Stock & Options | 2 | options spread calculator, put spread calculator |
| `orifice-flow-calculator` | Science > Mechanical & Structural Engineering | 2 | orifice flow calculator, orifice calculator |
| `orthogonal-projection-calculator` | Science > Math | 2 | orthogonal projection calculator, vector projection calculator |
| `overtime-pay-calculator` | Jobs & Education > Salary, Income & Career | 2 | overtime pay calculator, overtime wage calculator |
| `paired-t-test-calculator` | Science > Statistics & Probability | 2 | paired t-test calculator, paired t test calculator |
| `pants-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 2 | pant size calculator, pants size calculator |
| `party-drinks-calculator` | Food & Drink > Wine, Spirits & Cocktail | 2 | soft drink calculator for party, drink calculator for wedding |
| `paver-calculator` | House & Garden > Concrete, Masonry & Paving | 2 | paver sand calculator, pavers calculator |
| `paver-cost-calculator` | House & Garden > Concrete, Masonry & Paving | 2 | paver calculator, paver patio cost calculator |
| `paycheck-calculator` | Jobs & Education > Salary, Income & Career | 2 | paycheck hourly calculator, ny paycheck tax calculator |
| `peptide-reconstitution-calculator` | Science > Biology & Lab | 2 | prime peptides calculator, peptide calculator online |
| `percent-dilution-calculator` | Science > Chemistry | 2 | mass percent calculator, percent composition calculator |
| `percent-yield-calculator` | Science > Chemistry | 2 | percent yield calculator, percentage yield calculator |
| `ph-calculator` | Science > Chemistry | 2 | ph calculator, acid base calculator |
| `photography-exposure-calculator` | Arts & Entertainment > Art, Film & Creator Income | 2 | exposure calculator, exposure triangle calculator |
| `pine-straw-calculator` | House & Garden > Gravel, Soil & Landscaping | 2 | pine straw calculator, pinestraw calculator |
| `pipe-offset-calculator` | House & Garden > HVAC, Plumbing & Electrical | 2 | rolling offset calculator, pipe offset calculator |
| `pka-calculator` | Science > Chemistry | 2 | pka calculator, pka to ka calculator |
| `poisson-distribution-calculator` | Science > Statistics & Probability | 2 | poisson probability distribution calculator, poisson calculator |
| `polynomial-regression-calculator` | Science > Statistics & Probability | 2 | cubic regression calculator, polynomial regression calculator |
| `pond-salt-calculator` | House & Garden > Pool, Pond & Water | 2 | pond calculator, salinity calculator |
| `pool-salt-calculator` | House & Garden > Pool, Pond & Water | 2 | salt pool calculator, pool salt calculator |
| `power-to-weight-ratio-calculator` | Sports > Motorsports & Racing | 2 | power to weight ratio calculator, power to weight calculator |
| `ppm-calculator` | Science > Chemistry | 2 | parts per million calculator, ppm calculator |
| `pregnancy-weight-gain-calculator` | Health > Pregnancy & Fertility | 2 | pregnancy weight gain calculator, pregnancy weight calculator |
| `price-per-acre-calculator` | Real Estate > Land, Construction & Building Cost | 2 | acre calculator, price per acre calculator |
| `quartile-calculator` | Science > Statistics & Probability | 2 | quartile calculator, iqr calculator |
| `raw-to-cooked-calculator` | Food & Drink > Cooking Time, Meat & Curing | 2 | uncooked rice to cooked rice calculator, dry to cooked pasta calculator |
| `reaction-time-calculator` | Science > Physics | 2 | reaction calculator, reaction time calculator |
| `rebar-calculator` | House & Garden > Concrete, Masonry & Paving | 2 | rebar calculator, rebar calculator for slab |
| `relative-risk-calculator` | Science > Statistics & Probability | 2 | relative risk calculator, risk ratio calculator |
| `required-rate-of-return-calculator` | Finance > Investment > Investment Returns & Planning | 2 | rate of return calculator, return rate calculator |
| `retaining-wall-calculator` | House & Garden > Concrete, Masonry & Paving | 2 | retaining wall calculator, retaining wall block calculator |
| `retirement-date-calculator` | Finance > Retirement | 2 | days to retirement calculator, days until retirement calculator |
| `return-on-equity-calculator` | Finance | 2 | roe calculator, return on equity calculator |
| `revenue-calculator` | Finance | 2 | revenue calculator, revenue projection calculator |
| `road-trip-budget-calculator` | Travel > Trip Cost, Theme Park & Cruise | 2 | travel calculator, travel cost calculator |
| `rocket-equation-calculator` | Science > Astronomy & Space | 2 | rocket equation calculator, delta v calculator |
| `roof-replacement-cost-calculator` | House & Garden > Roofing & Gutter | 2 | roof estimating calculator, asphalt shingle cost calculator |
| `roommate-expense-split-calculator` | Finance > Budget > Household & Family Expense | 2 | split rent calculator, rent splitting calculator |
| `rug-size-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 2 | rug size calculator, rug size calculator for living room |
| `salary-conversion-calculator` | Jobs & Education > Salary, Income & Career | 2 | monthly salary to hourly calculator, wage conversion calculator |
| `schwarzschild-radius-calculator` | Science > Astronomy & Space | 2 | schwarzschild radius calculator, black hole calculator |
| `sealant-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 2 | sealant calculator, caulking calculator |
| `segment-addition-calculator` | Science > Math | 2 | segment addition postulate calculator, segment calculator |
| `semi-monthly-salary-calculator` | Jobs & Education > Salary, Income & Career | 2 | semi monthly pay calculator, bi monthly pay calculator |
| `server-power-cost-calculator` | Business & Industrial > Energy, Solar & Electrical | 2 | power cost calculator, server power cost calculator |
| `shed-material-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 2 | shed material calculator, lumber calculator for shed |
| `simpsons-diversity-index-calculator` | Science > Biology & Lab | 2 | simpson's diversity index calculator, simpsons diversity index calculator |
| `six-minute-walk-test-calculator` | Sports > Hiking | 2 | 6 minute walk test calculator, 6mwt calculator |
| `ski-length-calculator` | Sports > Winter Sports | 2 | ski size calculator, ski length calculator |
| `square-root-calculator` | Science > Math | 2 | radical form calculator, sqrt calculator |
| `stain-calculator` | House & Garden > Deck, Fence & Stair | 2 | deck stain calculator, stain calculator |
| `stair-climbing-calorie-calculator` | Sports > Other Sports | 2 | stair climbing calories calculator, stairmaster calories burned calculator |
| `stock-cost-basis-calculator` | Finance > Investment > Stock & Options | 2 | cost basis calculator, stock cost basis calculator |
| `stock-profit-calculator` | Finance > Investment > Stock & Options | 2 | share price calculator, penny stock calculator |
| `stock-split-calculator` | Finance > Investment > Stock & Options | 2 | stock split calculator, reverse stock split calculator |
| `subwoofer-port-calculator` | Shopping > Electronics, Energy & Tech | 2 | port length calculator, port calculator |
| `sun-position-calculator` | Science > Astronomy & Space | 2 | azimuth calculator, sun angle calculator |
| `sunrise-sunset-calculator` | Science > Astronomy & Space | 2 | sunrise calculator, sunset calculator |
| `surface-area-to-volume-ratio-calculator` | Science > Biology & Lab | 2 | surface area to volume ratio calculator, volume and surface area calculator |
| `tablecloth-size-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 2 | tablecloth size calculator, tablecloth calculator |
| `taco-bar-calculator` | Food & Drink > Party & Event Food | 2 | taco bar calculator, taco calculator |
| `takt-time-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 2 | cycle time calculator, takt time calculator |
| `thin-lens-calculator` | Science > Physics | 2 | focal length calculator, lens calculator |
| `tile-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 2 | tile calculator, wall tile calculator |
| `titration-calculator` | Science > Chemistry | 2 | titration calculator, neutralization calculator |
| `torque-calculator` | Science > Mechanical & Structural Engineering | 2 | torque calculator, net torque calculator |
| `transformer-size-calculator` | Business & Industrial > Energy, Solar & Electrical | 2 | transformer sizing calculator, transformer size calculator |
| `tree-age-calculator` | House & Garden > Lawn, Garden & Tree | 2 | tree age calculator, tree calculator |
| `triangle-inequality-calculator` | Science > Math | 2 | triangle inequality theorem calculator, angle calculator triangle |
| `true-airspeed-calculator` | Science > Earth, Weather & Environment | 2 | true airspeed calculator, tas calculator |
| `truss-calculator` | Science > Mechanical & Structural Engineering | 2 | truss price calculator, simple truss calculator |
| `turbo-size-calculator` | Sports > Motorsports & Racing | 2 | turbo calculator, turbo size calculator |
| `turkey-size-calculator` | Food & Drink > Party & Event Food | 2 | turkey calculator per person, turkey size calculator |
| `turnover-rate-calculator` | Business & Industrial > HR, Marketing & Business Operations | 2 | turnover rate calculator, employee turnover calculator |
| `uncertainty-calculator` | Science > Statistics & Probability | 2 | error propagation calculator, uncertainty calculator |
| `unit-tangent-vector-calculator` | Science > Math | 2 | unit vector calculator, unit tangent vector calculator |
| `vapor-pressure-calculator` | Science > Chemistry | 2 | water vapor pressure calculator, vapor pressure calculator |
| `vector-addition-calculator` | Science > Math | 2 | vector addition calculator, resultant vector calculator |
| `wainscoting-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 2 | wainscotting calculator, wainscoting calculator |
| `watt-hours-calculator` | Shopping > Electronics, Energy & Tech | 2 | watt hour calculator, watt hours calculator |
| `weighted-average-calculator` | Science > Statistics & Probability | 2 | weighted average calculator, weighted mean calculator |
| `welding-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 2 | welding calculator, welding rod calculator |
| `wheel-horsepower-calculator` | Sports > Motorsports & Racing | 2 | whp calculator, wheel horsepower calculator |
| `wheelchair-ramp-cost-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 2 | wheelchair ramp calculator, wheelchair ramp cost calculator |
| `whip-calculator` | Sports > Baseball & Softball | 2 | whip calculator, whip calculator baseball |
| `wind-chill-calculator` | Science > Earth, Weather & Environment | 2 | wind chill calculator, windchill calculator |
| `youngs-modulus-calculator` | Science > Mechanical & Structural Engineering | 2 | youngs modulus calculator, young's modulus calculator |
| `15-minutes-per-pound-calculator` | Food & Drink > Cooking Time, Meat & Curing | 1 | 20 minutes per pound calculator |
| `4-percent-rule-calculator` | Finance > Retirement | 1 | 4 withdrawal calculator |
| `401k-calculator` | Finance > Retirement | 1 | 401k compounding calculator |
| `5-3-1-calculator` | Sports > Sports Performance | 1 | 531 calculator |
| `529-calculator` | Finance > Savings | 1 | 529 contribution calculator |
| `absolute-value-equation-calculator` | Science > Math | 1 | absolute value calculator |
| `act-score-calculator` | Jobs & Education > SAT, ACT & School Test | 1 | act test calculator |
| `actual-cash-value-calculator` | Finance > Economics | 1 | actual cash value calculator |
| `adc-resolution-calculator` | Science > Electrical & Electronics Engineering | 1 | resolution calculator |
| `after-repair-value-calculator` | Real Estate > Rental Property & Investment | 1 | after repair value calculator |
| `air-compressor-cfm-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | scfm calculator |
| `alabama-tax-calculator` | Finance > Tax > Tax & Paycheck | 1 | alabama income tax calculator |
| `alcohol-dilution-calculator` | Food & Drink > Wine, Spirits & Cocktail | 1 | alcohol dilution calculator |
| `angle-of-depression-calculator` | Science > Math | 1 | angle of elevation calculator |
| `angular-acceleration-calculator` | Science > Physics | 1 | angular acceleration calculator |
| `anova-calculator` | Science > Statistics & Probability | 1 | anova calculator |
| `antenna-length-calculator` | Science > Electrical & Electronics Engineering | 1 | antenna length calculator |
| `apc-calculator` | Finance > Economics | 1 | apc calculator |
| `ape-index-calculator` | Sports > Other Sports | 1 | ape index calculator |
| `arrhenius-equation-calculator` | Science > Chemistry | 1 | arrhenius equation calculator |
| `availability-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | availability calculator |
| `average-atomic-mass-calculator` | Science > Chemistry | 1 | average atomic mass calculator |
| `awg-wire-gauge-calculator` | Science > Electrical & Electronics Engineering | 1 | wire gauge calculator |
| `bacon-calculator` | Food & Drink > Party & Event Food | 1 | bacon calculator |
| `balloon-mortgage-calculator` | Real Estate > Mortgage > Mortgage Payment, Type & Cost | 1 | balloon calculator |
| `batting-average-calculator` | Sports > Baseball & Softball | 1 | batting average calculator |
| `bayes-theorem-calculator` | Science > Statistics & Probability | 1 | bayes theorem calculator |
| `beer-attenuation-calculator` | Food & Drink > Beer & Homebrewing | 1 | attenuation calculator |
| `benadryl-for-dogs-dosage-calculator` | Pets & Animals > Pet Medication Dosage | 1 | how much benadryl can i give my dog calculator |
| `bernoulli-equation-calculator` | Science > Mechanical & Structural Engineering | 1 | bernoulli equation calculator |
| `beta-calculator` | Finance > Investment > Stock & Options | 1 | beta calculator |
| `bike-fit-calculator` | Sports > Cycling | 1 | bike fit calculator |
| `bilinear-interpolation-calculator` | Science > Math | 1 | bilinear interpolation calculator |
| `birdsmouth-calculator` | House & Garden > Roofing & Gutter | 1 | birdsmouth cut calculator |
| `bleach-dilution-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | bleach dilution calculator |
| `block-fill-calculator` | House & Garden > Concrete, Masonry & Paving | 1 | block fill calculator |
| `board-on-board-fence-calculator` | House & Garden > Deck, Fence & Stair | 1 | board on board fence calculator |
| `boat-speed-calculator` | Sports > Other Sports | 1 | boat speed calculator |
| `body-surface-area-calculator` | Health > Sleep & Medical | 1 | bsa calculator |
| `boiling-point-calculator` | Science > Chemistry | 1 | boiling point calculator |
| `bolt-torque-calculator` | Science > Mechanical & Structural Engineering | 1 | bolt torque calculator |
| `bond-order-calculator` | Science > Chemistry | 1 | bond order calculator |
| `boost-to-horsepower-calculator` | Sports > Motorsports & Racing | 1 | boost calculator |
| `break-even-point-calculator` | Finance | 1 | break even point calculator |
| `breaker-size-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | breaker size calculator |
| `budget-variance-calculator` | Finance | 1 | variance calculator |
| `bulk-material-calculator` | House & Garden > Gravel, Soil & Landscaping | 1 | tonnage calculator |
| `business-budget-calculator` | Finance | 1 | business budget calculator |
| `business-expense-calculator` | Finance | 1 | business expense calculator |
| `butterball-turkey-thawing-calculator` | Food & Drink > Cooking Time, Meat & Curing | 1 | turkey defrost time calculator |
| `calories-burned-heart-rate-calculator` | Sports > Sports Performance | 1 | heart rate calorie calculator |
| `capitalization-rate-vs-cash-on-cash-calculator` | Real Estate > Rental Property & Investment | 1 | capitalization rate calculator |
| `car-affordability-calculator` | Finance > Car & Vehicle Cost > Car Buying & Selling | 1 | what car can i afford calculator |
| `car-sales-tax-calculator` | Finance > Car & Vehicle Cost > Car Buying & Selling | 1 | nj vehicle sales tax calculator |
| `carrying-capacity-calculator` | Science > Biology & Lab | 1 | carrying capacity calculator |
| `cash-conversion-cycle-calculator` | Finance | 1 | cash conversion cycle calculator |
| `cat-bmi-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 1 | cat bmi calculator |
| `cat-pregnancy-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 1 | cat pregnancy calculator |
| `cat-weight-loss-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 1 | cat weight calculator |
| `cattle-breakeven-calculator` | Business & Industrial > Agriculture & Livestock | 1 | breakeven calculator |
| `cell-doubling-time-calculator` | Science > Biology & Lab | 1 | cell doubling time calculator |
| `centroid-calculator` | Science > Math | 1 | centroid calculator |
| `chain-link-fence-calculator` | House & Garden > Deck, Fence & Stair | 1 | chain link calculator |
| `change-calculator` | Finance | 1 | change calculator |
| `chi-square-calculator` | Science > Statistics & Probability | 1 | chi square table calculator |
| `chicken-coop-size-calculator` | House & Garden > Lawn, Garden & Tree | 1 | chicken coop size calculator |
| `chronological-age-calculator` | Jobs & Education > School Age, Calendar & Classroom | 1 | chronological age calculator (find out your age) |
| `clothing-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 1 | clothing size calculator |
| `cloud-base-calculator` | Science > Earth, Weather & Environment | 1 | cloud base calculator |
| `coefficient-of-determination-calculator` | Science > Statistics & Probability | 1 | coefficient of determination calculator |
| `coil-length-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | coil length calculator |
| `college-passer-rating-calculator` | Sports > Other Sports | 1 | passer rating calculator |
| `collision-calculator` | Science > Physics | 1 | elastic collision calculator |
| `column-buckling-calculator` | Science > Mechanical & Structural Engineering | 1 | buckling calculator |
| `commercial-loan-dscr-calculator` | Real Estate > Commercial Real Estate | 1 | dscr loan calculator |
| `comparative-advantage-calculator` | Finance > Economics | 1 | comparative advantage calculator |
| `completing-the-square-calculator` | Science > Math | 1 | solve by completing the square calculator |
| `compost-calculator` | House & Garden > Lawn, Garden & Tree | 1 | compost calculator |
| `compound-investment-calculator` | Finance > Investment > Investment Returns & Planning | 1 | compound growth rate calculator |
| `concrete-steps-calculator` | House & Garden > Concrete, Masonry & Paving | 1 | concrete step calculator |
| `concrete-weight-calculator` | Business & Industrial > Concrete & Masonry | 1 | concrete weight calculator |
| `conditional-probability-calculator` | Science > Statistics & Probability | 1 | conditional probability calculator |
| `contribution-margin-calculator` | Finance | 1 | contribution margin calculator |
| `copper-pipe-weight-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | pipe weight calculator |
| `cost-of-doing-business-calculator` | Finance | 1 | cost of doing business calculator |
| `cost-of-equity-calculator` | Finance | 1 | cost of equity calculator |
| `covariance-calculator` | Science > Statistics & Probability | 1 | covariance calculator |
| `cpk-calculator` | Science > Mechanical & Structural Engineering | 1 | cpk calculator |
| `cramers-rule-calculator` | Science > Math | 1 | cramer's rule calculator |
| `crawl-ratio-calculator` | Sports > Motorsports & Racing | 1 | crawl ratio calculator |
| `cricket-net-run-rate-calculator` | Sports > Other Sports | 1 | net run rate calculator |
| `crop-factor-calculator` | Shopping > Electronics, Energy & Tech | 1 | crop factor calculator |
| `cross-multiplication-calculator` | Science > Math | 1 | cross multiplication calculator |
| `cross-price-elasticity-calculator` | Finance > Economics | 1 | cross price elasticity calculator |
| `crypto-market-cap-comparison-calculator` | Finance > Crypto > Crypto Market, Tax & Security | 1 | market cap calculator |
| `cubic-yards-to-tons-calculator` | House & Garden > Gravel, Soil & Landscaping | 1 | ton calculator |
| `curing-salt-calculator` | Food & Drink > Cooking Time, Meat & Curing | 1 | salt calculator |
| `currency-converter` | Finance > Crypto > Currency Exchange & Forex | 1 | £ to $ calculator |
| `currency-spread-calculator` | Finance > Crypto > Currency Exchange & Forex | 1 | spread calculator |
| `current-divider-calculator` | Science > Electrical & Electronics Engineering | 1 | current divider calculator |
| `current-ratio-calculator` | Finance | 1 | current ratio calculator |
| `curvature-calculator` | Science > Math | 1 | curvature calculator |
| `customer-lifetime-value-calculator` | Finance | 1 | ltv calculator saas |
| `cycling-elevation-gain-calculator` | Sports > Cycling | 1 | elevation gain calculator |
| `daily-salary-calculator` | Jobs & Education > Salary, Income & Career | 1 | daily pay calculator |
| `darts-score-calculator` | Sports > Other Sports | 1 | dart calculator |
| `days-payable-outstanding-calculator` | Finance | 1 | days payable outstanding calculator |
| `days-sales-outstanding-calculator` | Finance | 1 | average collection period calculator |
| `dbm-to-watts-calculator` | Science > Electrical & Electronics Engineering | 1 | dbm to watts calculator |
| `de-broglie-wavelength-calculator` | Science > Physics | 1 | de broglie wavelength calculator |
| `deadweight-loss-calculator` | Finance > Economics | 1 | deadweight loss calculator |
| `dealer-invoice-price-calculator` | Finance > Car & Vehicle Cost > Car Buying & Selling | 1 | msrp calculator |
| `debt-consolidation-loan-total-cost-calculator` | Finance > Loan > Personal Loan | 1 | cost of debt calculator |
| `debt-to-asset-ratio-calculator` | Finance | 1 | debt to asset ratio calculator |
| `debt-to-equity-calculator` | Finance | 1 | debt to equity ratio calculator |
| `decibel-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | inverse square law calculator |
| `delivery-tip-calculator` | Shopping > Discount, Tip & Unit Price | 1 | pizza delivery tip calculator |
| `delta-t-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | t calculator |
| `density-altitude-calculator` | Science > Earth, Weather & Environment | 1 | temperature at altitude calculator |
| `departure-time-calculator` | Travel > Distance, Route & Travel Time | 1 | what time should i leave calculator |
| `depth-of-field-calculator` | Shopping > Electronics, Energy & Tech | 1 | depth of field calculator |
| `descriptive-statistics-calculator` | Science > Statistics & Probability | 1 | statistics calculators |
| `diamond-ring-value-calculator` | Shopping > Gold, Silver & Jewelry | 1 | diamond calculator |
| `diaper-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 1 | diaper calculator |
| `dihybrid-cross-calculator` | Science > Biology & Lab | 1 | dihybrid cross calculator |
| `discretionary-income-calculator` | Finance > Economics | 1 | discretionary income calculator |
| `disney-dining-reservation-date-calculator` | Travel > Trip Cost, Theme Park & Cruise | 1 | adr calculator |
| `divergence-curl-calculator` | Science > Math | 1 | divergence calculator |
| `dividend-discount-model-calculator` | Finance > Investment > Stock & Options | 1 | dividend discount model calculator |
| `dls-score-calculator` | Sports > Other Sports | 1 | dls calculator |
| `dnd-dpr-calculator` | Arts & Entertainment > Tarot, Astrology & Fun | 1 | dnd calculator |
| `dog-bmi-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 1 | dog bmi calculator |
| `dog-crate-size-calculator` | Shopping > Lifestyle, Party & Wedding | 1 | dog crate size calculator |
| `dog-food-calculator` | Pets & Animals > Pet Food, Care & Cost | 1 | how much dry food should i feed my dog calculator |
| `dog-heat-cycle-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 1 | dog heat cycle calculator |
| `dog-onion-garlic-toxicity-calculator` | Pets & Animals > Vet Clinical & Toxicity | 1 | dog onion toxicity calculator |
| `dog-raisin-grape-toxicity-calculator` | Pets & Animals > Vet Clinical & Toxicity | 1 | dog raisin toxicity calculator |
| `dog-weight-loss-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 1 | dog weight calculator |
| `doppler-effect-calculator` | Science > Physics | 1 | doppler effect calculator |
| `double-time-calculator` | Jobs & Education > Salary, Income & Career | 1 | double time calculator |
| `drake-equation-calculator` | Science > Astronomy & Space | 1 | drake equation calculator |
| `dress-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 1 | dress size calculator |
| `driveway-cost-calculator` | House & Garden > Concrete, Masonry & Paving | 1 | driveway cost calculator |
| `drywall-cost-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 1 | drywall cost calculator |
| `dscr-real-estate-calculator` | Real Estate > Rental Property & Investment | 1 | dscr calculator |
| `duty-cycle-calculator` | Science > Electrical & Electronics Engineering | 1 | duty cycle calculator |
| `earnings-per-share-calculator` | Finance > Investment > Stock & Options | 1 | earnings per share calculator |
| `ebitda-calculator` | Finance | 1 | ebitda calculator |
| `economic-order-quantity-calculator` | Finance | 1 | eoq calculator |
| `economic-profit-calculator` | Finance > Economics | 1 | economic profit calculator |
| `effective-duration-calculator` | Finance > Investment > Bond & Fixed Income | 1 | bond duration calculator |
| `effective-tax-rate-calculator` | Finance > Tax | 1 | effective rate calculator |
| `eirp-calculator` | Science > Electrical & Electronics Engineering | 1 | eirp calculator |
| `electric-potential-calculator` | Science > Physics | 1 | electric potential calculator |
| `electron-configuration-calculator` | Science > Chemistry | 1 | electron configuration calculator |
| `ellipsoid-volume-calculator` | Science > Math | 1 | ellipsoid volume calculator |
| `empirical-formula-calculator` | Science > Chemistry | 1 | elemental analysis calculator |
| `emv-calculator` | Finance | 1 | emv calculator |
| `enterprise-value-calculator` | Finance | 1 | enterprise value calculator |
| `entropy-calculator` | Science > Chemistry | 1 | entropy calculator |
| `equation-solver-calculator` | Science > Math | 1 | exponential equation calculator |
| `equivalent-salary-calculator` | Jobs & Education > Salary, Income & Career | 1 | equivalent calculator |
| `escape-velocity-calculator` | Science > Astronomy & Space | 1 | escape velocity calculator |
| `eta-calculator` | Travel > Distance, Route & Travel Time | 1 | eta calculator |
| `evaporation-rate-calculator` | Science > Mechanical & Structural Engineering | 1 | evaporation rate calculator |
| `expand-calculator` | Science > Math | 1 | expand calculator |
| `expected-value-calculator` | Sports > Sports Betting & Racing | 1 | expected value calculator |
| `exponential-distribution-calculator` | Science > Statistics & Probability | 1 | exponential distribution calculator |
| `exponential-growth-calculator` | Science > Math | 1 | exponential growth calculator |
| `exponential-regression-calculator` | Science > Statistics & Probability | 1 | exponential regression calculator |
| `eye-color-calculator` | Science > Biology & Lab | 1 | baby eye color calculator |
| `fence-post-depth-calculator` | House & Garden > Deck, Fence & Stair | 1 | fence post depth calculator |
| `fertilizer-calculator` | Business & Industrial > Agriculture & Livestock | 1 | lawn fertilizer calculator |
| `ffmi-calculator` | Sports > Sports Performance | 1 | ffmi calculator |
| `fha-loan-calculator` | Real Estate > Mortgage > Home Buyer Program | 1 | fha calculator mortgage |
| `field-of-view-calculator` | Shopping > Electronics, Energy & Tech | 1 | field of view calculator |
| `fifo-lifo-calculator` | Finance | 1 | lifo calculator |
| `finance-charge-calculator` | Finance > Credit & Debt | 1 | finance charge calculator |
| `fip-calculator` | Sports > Baseball & Softball | 1 | fip calculator |
| `fire-calculator` | Finance > Retirement | 1 | fire flow calculator |
| `fish-compatibility-calculator` | Pets & Animals > Aquarium, Reptile & Small Pet | 1 | fish calculator |
| `fish-mercury-calculator` | Food & Drink > Food Nutrition & Calorie | 1 | mercury calculator |
| `flight-arrival-time-calculator` | Travel > Flight, Baggage & Airfare | 1 | arrival time calculator |
| `florida-car-sales-tax-calculator` | Shopping > Sales Tax, VAT & Import Duty | 1 | florida vehicle sales tax calculator |
| `florida-tax-calculator` | Finance > Tax > Tax & Paycheck | 1 | tax in florida calculator |
| `fluid-properties-calculator` | Science > Mechanical & Structural Engineering | 1 | water density calculator |
| `food-shelf-life-calculator` | Food & Drink > Cooking Time, Meat & Curing | 1 | shelf life calculator |
| `foot-candle-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | foot candle calculator |
| `fresnel-zone-calculator` | Science > Electrical & Electronics Engineering | 1 | fresnel zone calculator |
| `fret-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | stewmac fret calculator |
| `fuel-efficiency-comparison-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 1 | mpg comparison calculator |
| `future-salary-calculator` | Jobs & Education > Salary, Income & Career | 1 | future salary calculator |
| `g-force-calculator` | Science > Physics | 1 | g force calculator |
| `gait-speed-calculator` | Sports > Hiking | 1 | gait speed calculator |
| `game-score-calculator` | Sports > Other Sports | 1 | game score calculator |
| `gamma-function-calculator` | Science > Math | 1 | gamma function calculator |
| `garbage-bag-size-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | garbage bag size calculator |
| `gdp-deflator-calculator` | Finance > Economics | 1 | gdp deflator calculator |
| `gift-of-equity-calculator` | Real Estate > Home Buying & Affordability | 1 | gift of equity calculator |
| `glass-price-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | glass calculator |
| `glass-thickness-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | aquarium glass thickness calculator |
| `glass-weight-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | glass weight calculator |
| `gold-weight-calculator` | Shopping > Gold, Silver & Jewelry | 1 | gold weight calculator |
| `grad-school-gpa-calculator` | Jobs & Education > GPA | 1 | grad calculator |
| `gram-schmidt-calculator` | Science > Math | 1 | gram schmidt calculator |
| `grass-seed-calculator` | House & Garden > Lawn, Garden & Tree | 1 | grass seed calculator |
| `greenhouse-ventilation-calculator` | House & Garden > Lawn, Garden & Tree | 1 | cfm ventilation calculator |
| `gross-margin-calculator` | Finance | 1 | gross margin percentage calculator |
| `growing-annuity-calculator` | Finance > Retirement | 1 | growing annuity calculator |
| `hair-growth-calculator` | Shopping > Lifestyle, Party & Wedding | 1 | hair growth calculator |
| `hammock-hang-calculator` | House & Garden > Lawn, Garden & Tree | 1 | hammock hang calculator |
| `hardness-conversion-calculator` | Science > Mechanical & Structural Engineering | 1 | hardness conversion calculator |
| `hardwood-flooring-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | hardwood flooring calculator |
| `hardy-weinberg-calculator` | Science > Biology & Lab | 1 | hardy weinberg calculator |
| `hat-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 1 | hat size calculator |
| `headphone-impedance-calculator` | Shopping > Electronics, Energy & Tech | 1 | headphone power calculator |
| `helmholtz-resonator-calculator` | Science > Physics | 1 | helmholtz resonator calculator |
| `henderson-hasselbalch-calculator` | Science > Chemistry | 1 | henderson hasselbalch equation calculator |
| `heptathlon-calculator` | Sports > Other Sports | 1 | heptathlon calculator |
| `hiking-time-calculator` | Sports > Hiking | 1 | hiking time calculator |
| `holiday-pay-calculator` | Jobs & Education > Salary, Income & Career | 1 | overtime and holiday pay calculator |
| `home-affordability-calculator` | Real Estate > Home Buying & Affordability | 1 | 28/36 rule calculator |
| `hoop-stress-calculator` | Science > Mechanical & Structural Engineering | 1 | hoop stress calculator |
| `hot-tub-electricity-cost-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | hot tub electricity cost calculator |
| `hourly-wage-increase-calculator` | Jobs & Education > Salary, Income & Career | 1 | raise calculator hourly |
| `human-punch-force-calculator` | Sports > Other Sports | 1 | punch calculator |
| `hydraulic-cylinder-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | cylinder force calculator |
| `hyperfocal-distance-calculator` | Shopping > Electronics, Energy & Tech | 1 | hyperfocal distance calculator |
| `image-file-size-calculator` | Shopping > Electronics, Energy & Tech | 1 | image size calculator |
| `impact-force-calculator` | Science > Physics | 1 | impact force calculator |
| `implied-probability-calculator` | Sports > Sports Betting & Racing | 1 | implied probability calculator |
| `impulse-calculator` | Science > Physics | 1 | impulse calculator |
| `incline-walking-calories-calculator` | Sports > Hiking | 1 | incline walking calorie calculator |
| `income-calculator` | Jobs & Education > Salary, Income & Career | 1 | income statement calculator |
| `income-elasticity-of-demand-calculator` | Finance > Economics | 1 | income elasticity calculator |
| `india-tds-calculator` | Finance > Tax > India Tax & Salary | 1 | tds calculator |
| `inductance-calculator` | Science > Electrical & Electronics Engineering | 1 | inductance calculator |
| `injection-molding-cost-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | injection calculator |
| `interest-rate-cap-calculator` | Finance > Interest Rate | 1 | interest rate cap calculator |
| `investment-calculator` | Finance > Investment > Investment Returns & Planning | 1 | appreciation calculator |
| `irr-calculator` | Finance > Investment > Investment Returns & Planning | 1 | internal rate of return calculator |
| `isentropic-flow-calculator` | Science > Mechanical & Structural Engineering | 1 | isentropic flow calculator |
| `jacket-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 1 | jacket size calculator |
| `jensens-alpha-calculator` | Finance > Investment > Investment Returns & Planning | 1 | alpha calculator |
| `jumping-rope-calories-burned-calculator` | Sports > Other Sports | 1 | jump rope calorie calculator |
| `karnaugh-map-calculator` | Science > Math | 1 | sum of products calculator |
| `kindergarten-start-age-calculator` | Jobs & Education > School Age, Calendar & Classroom | 1 | kindergarten calculator |
| `kva-to-amps-calculator` | Science > Electrical & Electronics Engineering | 1 | kva calculator |
| `kw-calculator` | Science > Electrical & Electronics Engineering | 1 | kva to amps calculator |
| `ladder-height-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | ladder height calculator |
| `laminate-flooring-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | laminate flooring calculator |
| `laminate-flooring-cost-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | laminate flooring cost calculator |
| `lawn-care-pricing-calculator` | Shopping > Pricing, Markup & Seller Fee | 1 | lawn care pricing calculator |
| `lead-time-calculator` | Business & Industrial > Freight, Logistics & Warehouse | 1 | lead time calculator |
| `lease-mileage-overage-calculator` | Finance > Car & Vehicle Cost > Car Lease, Rental & Transport | 1 | lease mileage calculator |
| `lease-vs-buy-commercial-property-calculator` | Real Estate > Commercial Real Estate | 1 | commercial lease calculator |
| `lifetime-earnings-calculator` | Jobs & Education > Salary, Income & Career | 1 | lifetime earnings calculator |
| `ligation-calculator` | Science > Biology & Lab | 1 | ligation calculator |
| `lightning-distance-calculator` | Science > Earth, Weather & Environment | 1 | lightning distance calculator |
| `linear-feet-calculator` | Business & Industrial > Construction Materials & Estimating | 1 | linear footage calculator |
| `linear-independence-calculator` | Science > Math | 1 | linear dependence calculator |
| `liquidity-ratios-calculator` | Finance | 1 | liquidity ratio calculator |
| `livestock-feed-ration-calculator` | Business & Industrial > Agriculture & Livestock | 1 | ration calculator |
| `lm317-calculator` | Science > Electrical & Electronics Engineering | 1 | lm317 calculator |
| `loan-balance-calculator` | Finance > Loan > General Loan | 1 | loan balance calculator |
| `loan-rate-calculator` | Finance > Loan > General Loan | 1 | personal loan rate calculator |
| `lognormal-distribution-calculator` | Science > Statistics & Probability | 1 | lognormal distribution calculator |
| `ltv-to-cac-ratio-calculator` | Finance | 1 | cac calculator |
| `lu-decomposition-calculator` | Science > Math | 1 | lu decomposition calculator |
| `lumber-weight-calculator` | Business & Industrial > Construction Materials & Estimating | 1 | lumber weight calculator |
| `mach-number-calculator` | Science > Mechanical & Structural Engineering | 1 | mach calculator |
| `magi-calculator` | Finance > Tax | 1 | magi calculator |
| `magic-number-calculator` | Sports > Baseball & Softball | 1 | magic number calculator |
| `male-delusion-calculator` | Arts & Entertainment > Tarot, Astrology & Fun | 1 | ideal man calculator |
| `margin-account-calculator` | Finance > Investment > Stock & Options | 1 | margin call calculator |
| `marginal-cost-calculator` | Finance > Economics | 1 | marginal cost calculator |
| `marginal-revenue-calculator` | Finance > Economics | 1 | marginal revenue calculator |
| `mass-energy-equivalence-calculator` | Science > Physics | 1 | e=mc2 calculator |
| `mass-flow-rate-calculator` | Science > Mechanical & Structural Engineering | 1 | mass flow rate calculator |
| `massage-tip-calculator` | Shopping > Discount, Tip & Unit Price | 1 | massage tip calculator |
| `matched-betting-calculator` | Sports > Sports Betting & Racing | 1 | matched betting calculator |
| `matrix-multiplication-calculator` | Science > Math | 1 | matrix calculator multiplication |
| `mean-squared-error-calculator` | Science > Statistics & Probability | 1 | mse calculator |
| `mechanical-energy-calculator` | Science > Physics | 1 | energy loss calculator |
| `medicare-tax-calculator` | Finance > Tax > Tax & Paycheck | 1 | medicare tax calculator |
| `megapixel-print-size-calculator` | Shopping > Electronics, Energy & Tech | 1 | print size calculator |
| `meloxicam-dog-dosage-calculator` | Pets & Animals > Pet Medication Dosage | 1 | meloxicam dog dosage calculator by weight |
| `metal-roof-cost-calculator` | House & Garden > Roofing & Gutter | 1 | metal roof cost calculator |
| `microstrip-impedance-calculator` | Science > Electrical & Electronics Engineering | 1 | z0 calculator |
| `military-body-fat-calculator` | Law & Government > Military & Veterans | 1 | military body fat calculator |
| `million-to-billion-converter` | Finance | 1 | million calculator |
| `mirror-size-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | bathroom mirror size calculator |
| `mma-weight-class-calculator` | Sports > Other Sports | 1 | mma calculator |
| `molality-calculator` | Science > Chemistry | 1 | molality calculator |
| `monthly-recurring-revenue-calculator` | Finance | 1 | mrr calculator |
| `moon-phase-calculator` | Science > Astronomy & Space | 1 | moon phase calculator |
| `mortgage-calculator` | Real Estate > Mortgage > Mortgage Payment, Type & Cost | 1 | piti mortgage calculator |
| `motor-calculator` | Science > Electrical & Electronics Engineering | 1 | motor torque calculator |
| `mouse-sensitivity-calculator` | Shopping > Electronics, Energy & Tech | 1 | sensitivity calculator |
| `mpc-calculator` | Finance > Economics | 1 | mpc calculator |
| `mtb-spring-rate-calculator` | Sports > Cycling | 1 | spring rate calculator |
| `music-scale-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | music calculator |
| `natural-gas-calculator` | Business & Industrial > Energy, Solar & Electrical | 1 | natural gas conversion calculator |
| `negative-binomial-distribution-calculator` | Science > Statistics & Probability | 1 | negative binomial calculator |
| `nernst-equation-calculator` | Science > Chemistry | 1 | nernst equation calculator |
| `net-profit-calculator` | Finance | 1 | net profit calculator |
| `new-jersey-tax-calculator` | Finance > Tax > Tax & Paycheck | 1 | nj taxes calculator |
| `new-york-tax-calculator` | Finance > Tax > Tax & Paycheck | 1 | nyc income tax calculator |
| `newtons-law-of-cooling-calculator` | Science > Physics | 1 | newton's law of cooling calculator |
| `newtons-second-law-calculator` | Science > Physics | 1 | newton's second law calculator |
| `nominal-interest-rate-calculator` | Finance > Interest Rate | 1 | nominal interest rate calculator |
| `normal-force-calculator` | Science > Physics | 1 | normal force calculator |
| `normality-calculator` | Science > Chemistry | 1 | normality calculator |
| `note-frequency-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | hz calculator |
| `number-needed-to-treat-calculator` | Science > Statistics & Probability | 1 | nnt calculator |
| `nutrition-eer-calculator` | Food & Drink > Diet, Macro & Meal Planning | 1 | eer calculator |
| `on-base-percentage-calculator` | Sports > Baseball & Softball | 1 | obp calculator |
| `operating-cash-flow-calculator` | Finance | 1 | operating cash flow calculator |
| `operating-margin-calculator` | Finance | 1 | operating margin calculator |
| `opportunity-cost-calculator` | Finance > Economics | 1 | opportunity cost calculator |
| `optimization-calculator` | Science > Math | 1 | maximum area calculator |
| `orthogonal-vector-calculator` | Science > Math | 1 | orthogonal vector calculator |
| `osmolarity-calculator` | Science > Chemistry | 1 | osmotic pressure calculator |
| `overtime-hours-calculator` | Jobs & Education > Salary, Income & Career | 1 | overtime hours calculator |
| `overtime-rate-calculator` | Jobs & Education > Salary, Income & Career | 1 | overtime rate calculator |
| `parallax-calculator` | Science > Astronomy & Space | 1 | parallax calculator |
| `parking-ratio-calculator` | Finance | 1 | parking ratio calculator |
| `partial-pressure-calculator` | Science > Chemistry | 1 | partial pressure calculator |
| `parts-markup-calculator` | Shopping > Pricing, Markup & Seller Fee | 1 | parts markup calculator |
| `password-entropy-calculator` | Science > Computer, Network & IT | 1 | password entropy calculator |
| `patio-cost-calculator` | House & Garden > Concrete, Masonry & Paving | 1 | patio calculator |
| `paver-base-calculator` | House & Garden > Concrete, Masonry & Paving | 1 | gravel calculator in tons |
| `payday-loan-calculator` | Finance > Loan > Short-Term & High-Cost Loan | 1 | payday loan calculator |
| `payload-calculator` | Shopping > Vehicle, Resale & Collectibles | 1 | gvwr calculator |
| `pcr-efficiency-calculator` | Science > Biology & Lab | 1 | qpcr efficiency calculator |
| `pea-gravel-calculator` | House & Garden > Gravel, Soil & Landscaping | 1 | pea gravel calculator |
| `pension-lump-sum-vs-annuity-calculator` | Finance > Retirement | 1 | annuity vs lump sum calculator |
| `percentile-calculator` | Science > Statistics & Probability | 1 | percentile rank calculator |
| `percolation-test-calculator` | Science > Earth, Weather & Environment | 1 | perc calculator |
| `perpetuity-calculator` | Finance > Investment > Investment Returns & Planning | 1 | perpetuity calculator |
| `personal-net-worth-calculator` | Finance > Budget > Budgeting Methods & Planning | 1 | liquid net worth calculator |
| `pet-water-intake-calculator` | Pets & Animals > Pet Food, Care & Cost | 1 | how much water should a dog drink calculator |
| `pi-calculator` | Science > Math | 1 | pi pad calculator |
| `pie-cut-calculator` | Sports > Motorsports & Racing | 1 | pie calculator |
| `pipe-bend-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | offset bend calculator |
| `pipe-deflection-calculator` | Science > Mechanical & Structural Engineering | 1 | deflection calculator |
| `pipe-size-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | water flow calculator |
| `pipe-slope-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | pipe percentage calculator |
| `piston-speed-calculator` | Sports > Motorsports & Racing | 1 | piston speed calculator |
| `pizza-dough-hydration-calculator` | Food & Drink > Baking & Recipe | 1 | yeast calculator |
| `pizza-size-value-calculator` | Shopping > Discount, Tip & Unit Price | 1 | pizza size calculator |
| `polar-graphing-calculator` | Science > Math | 1 | polar calculator |
| `polymeric-sand-calculator` | House & Garden > Concrete, Masonry & Paving | 1 | polymeric sand calculator |
| `polynomial-roots-calculator` | Science > Math | 1 | root calculator |
| `pond-liner-calculator` | House & Garden > Pool, Pond & Water | 1 | pond size calculator |
| `pond-volume-calculator` | House & Garden > Pool, Pond & Water | 1 | pond volume calculator |
| `pool-evaporation-calculator` | House & Garden > Pool, Pond & Water | 1 | pool evaporation calculator |
| `pool-size-calculator` | House & Garden > Pool, Pond & Water | 1 | how many gallons is my pool calculator |
| `population-growth-calculator` | Science > Biology & Lab | 1 | population growth calculator |
| `portfolio-beta-calculator` | Finance > Investment > Stock & Options | 1 | portfolio beta calculator |
| `post-judgment-interest-calculator` | Law & Government > Court, Criminal & Legal Fee | 1 | post judgment interest calculator |
| `potting-soil-calculator` | House & Garden > Lawn, Garden & Tree | 1 | potting soil calculator |
| `power-factor-calculator` | Science > Electrical & Electronics Engineering | 1 | power factor calculator |
| `price-per-pound-calculator` | Shopping > Discount, Tip & Unit Price | 1 | price per pound calculator |
| `price-per-square-foot-calculator` | Real Estate > Home Value, Equity & Selling | 1 | price per square foot calculator |
| `pricing-calculator` | Finance | 1 | pricing calculator |
| `product-pricing-calculator` | Finance | 1 | price calculator |
| `productivity-calculator` | Finance > Economics | 1 | productivity calculator |
| `profit-percentage-calculator` | Finance | 1 | profit percentage calculator |
| `profitability-ratios-calculator` | Finance | 1 | profitability calculator |
| `projector-screen-size-calculator` | Shopping > Electronics, Energy & Tech | 1 | screen size calculator |
| `projector-throw-distance-calculator` | Shopping > Electronics, Energy & Tech | 1 | projector throw ratio calculator |
| `protein-molecular-weight-calculator` | Science > Biology & Lab | 1 | protein molecular weight calculator |
| `psychrometric-calculator` | Science > Mechanical & Structural Engineering | 1 | wbgt calculator |
| `pull-box-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | pull box sizing calculator |
| `pvwatts-solar-calculator` | Business & Industrial > Energy, Solar & Electrical | 1 | solar panel output calculator |
| `quadratic-regression-calculator` | Science > Statistics & Probability | 1 | quadratic regression calculator |
| `quick-ratio-calculator` | Finance | 1 | quick ratio calculator |
| `rabbit-gestation-calculator` | Pets & Animals > Pet Age, Growth & Breeding | 1 | rabbit gestation calculator |
| `radical-equation-calculator` | Science > Math | 1 | dividing radicals calculator |
| `railing-calculator` | House & Garden > Deck, Fence & Stair | 1 | railing calculator |
| `ram-latency-calculator` | Shopping > Electronics, Energy & Tech | 1 | ram latency calculator |
| `rat-cage-size-calculator` | Pets & Animals > Aquarium, Reptile & Small Pet | 1 | rat cage calculator |
| `rate-law-calculator` | Science > Chemistry | 1 | rate law calculator |
| `rational-expression-calculator` | Science > Math | 1 | rational calculator |
| `real-estate-appreciation-calculator` | Real Estate > Home Value, Equity & Selling | 1 | real estate appreciation calculator |
| `real-estate-area-calculator` | Real Estate > Land, Construction & Building Cost | 1 | acerage calculator |
| `real-estate-roi-calculator` | Real Estate > Rental Property & Investment | 1 | roi real estate calculator |
| `recurring-deposit-interest-calculator` | Finance > Savings | 1 | recurring deposit calculator |
| `relativistic-kinetic-energy-calculator` | Science > Physics | 1 | relativistic kinetic energy calculator |
| `render-time-calculator` | Arts & Entertainment > Art, Film & Creator Income | 1 | render time calculator |
| `rent-increase-calculator` | Real Estate > Rent & Tenant | 1 | rent increase calculator |
| `rental-affordability-calculator` | Real Estate > Rent & Tenant | 1 | 3 times the rent calculator |
| `reorder-point-calculator` | Finance | 1 | reorder point calculator |
| `residual-calculator` | Science > Statistics & Probability | 1 | residual calculator |
| `retained-earnings-calculator` | Finance > Economics | 1 | retained earnings calculator |
| `retaining-wall-cost-calculator` | House & Garden > Deck, Fence & Stair | 1 | retaining wall cost calculator |
| `retirement-calculator` | Finance > Retirement | 1 | 403b retirement calculator |
| `revenue-growth-calculator` | Finance | 1 | revenue growth calculator |
| `reverb-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | reverb calculator |
| `reynolds-number-calculator` | Science > Mechanical & Structural Engineering | 1 | reynolds number calculator |
| `rf-filter-calculator` | Science > Electrical & Electronics Engineering | 1 | lc filter calculator |
| `rf-line-of-sight-calculator` | Science > Electrical & Electronics Engineering | 1 | radar horizon calculator |
| `rifle-recoil-calculator` | Sports > Other Sports | 1 | recoil calculator |
| `ring-size-calculator` | Shopping > Clothing, Shoe & Ring Size | 1 | ring size calculator |
| `rlc-circuit-calculator` | Science > Electrical & Electronics Engineering | 1 | rlc circuit calculator |
| `rms-voltage-calculator` | Science > Electrical & Electronics Engineering | 1 | rms calculator |
| `roc-auc-calculator` | Science > Statistics & Probability | 1 | auc calculator |
| `roofing-nails-calculator` | House & Garden > Roofing & Gutter | 1 | roofing calculator free |
| `room-area-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | wall area calculator |
| `root-mean-square-calculator` | Science > Statistics & Probability | 1 | root mean square calculator |
| `roth-conversion-calculator` | Finance > Retirement | 1 | conversion calculator google |
| `rsa-calculator` | Science > Math | 1 | rsa encryption calculator |
| `running-cadence-calculator` | Sports > Running | 1 | cadence calculator |
| `rydberg-equation-calculator` | Science > Physics | 1 | rydberg equation calculator |
| `saas-metrics-calculator` | Finance | 1 | saas calculator |
| `salary-per-day-calculator` | Jobs & Education > Salary, Income & Career | 1 | day rate calculator |
| `salary-per-hour-calculator` | Jobs & Education > Salary, Income & Career | 1 | salary per hour calculator |
| `salary-range-calculator` | Jobs & Education > Salary, Income & Career | 1 | salary range calculator |
| `sales-compensation-plan-calculator` | Business & Industrial > HR, Marketing & Business Operations | 1 | sales compensation calculator |
| `sales-growth-calculator` | Finance | 1 | sales growth calculator |
| `sample-size-calculator` | Science > Statistics & Probability | 1 | sampling calculator |
| `sand-calculator` | House & Garden > Gravel, Soil & Landscaping | 1 | sand calculator |
| `savings-goal-calculator` | Finance > Savings | 1 | goal calculator |
| `savings-interest-calculator` | Finance > Savings | 1 | apy savings interest calculator |
| `savings-percentage-calculator` | Finance > Savings | 1 | savings percentage calculator |
| `scatter-plot-calculator` | Science > Statistics & Probability | 1 | scatter plot calculator |
| `school-age-calculator` | Jobs & Education > School Age, Calendar & Classroom | 1 | school calculator |
| `scrap-metal-value-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | scrap sterling calculator |
| `secant-method-calculator` | Science > Math | 1 | secant calculator |
| `section-modulus-calculator` | Science > Mechanical & Structural Engineering | 1 | section modulus calculator |
| `security-camera-storage-calculator` | Shopping > Electronics, Energy & Tech | 1 | video storage calculator |
| `sell-through-rate-calculator` | Finance | 1 | sell through rate calculator |
| `selling-price-calculator` | Finance | 1 | selling price calculator |
| `serial-dilution-calculator` | Science > Biology & Lab | 1 | serial dilution calculator |
| `sharpe-ratio-calculator` | Finance > Investment > Investment Returns & Planning | 1 | sharpe ratio calculator |
| `shear-stress-calculator` | Science > Mechanical & Structural Engineering | 1 | shear stress calculator |
| `shed-cost-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 1 | shed calculator |
| `shed-roof-pitch-calculator` | House & Garden > Roofing & Gutter | 1 | shed roof pitch calculator |
| `sheet-metal-bend-calculator` | Science > Mechanical & Structural Engineering | 1 | bend allowance calculator |
| `sheet-metal-gauge-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | gauge calculator |
| `shingle-weight-calculator` | House & Garden > Roofing & Gutter | 1 | shingle calculator for roof |
| `shiplap-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 1 | shiplap calculator |
| `shipping-box-calculator` | Business & Industrial > Shipping, Postage & Ecommerce | 1 | box size calculator |
| `shot-calculator` | Food & Drink > Wine, Spirits & Cocktail | 1 | how many shots to get tipsy calculator |
| `sigma-level-calculator` | Business & Industrial > Manufacturing, Metals & Engineering | 1 | dpmo calculator |
| `sim-racing-fov-calculator` | Shopping > Electronics, Energy & Tech | 1 | fov calculator |
| `sinking-fund-calculator` | Finance > Savings | 1 | sinking fund calculator |
| `skewness-calculator` | Science > Statistics & Probability | 1 | skewness calculator |
| `skin-depth-calculator` | Science > Electrical & Electronics Engineering | 1 | skin depth calculator |
| `slugging-percentage-calculator` | Sports > Baseball & Softball | 1 | slugging percentage calculator |
| `snells-law-calculator` | Science > Physics | 1 | snell's law calculator |
| `snowboard-binding-size-calculator` | Sports > Winter Sports | 1 | binding calculator |
| `sod-cost-calculator` | House & Garden > Gravel, Soil & Landscaping | 1 | sod installation cost calculator |
| `solar-panel-angle-calculator` | Business & Industrial > Energy, Solar & Electrical | 1 | solar angle calculator |
| `song-length-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | song length calculator |
| `sound-pressure-level-calculator` | Science > Physics | 1 | db calculator |
| `speaker-impedance-calculator` | Shopping > Electronics, Energy & Tech | 1 | impedance calculator |
| `speed-of-sound-calculator` | Science > Physics | 1 | speed of sound calculator |
| `spiral-length-calculator` | Science > Math | 1 | roll length calculator |
| `spiral-staircase-calculator` | House & Garden > Deck, Fence & Stair | 1 | spiral staircase calculator |
| `standard-error-calculator` | Science > Statistics & Probability | 1 | sem calculator |
| `standing-reach-calculator` | Sports > Other Sports | 1 | standing reach calculator |
| `step-length-calculator` | Sports > Hiking | 1 | step length calculator |
| `stock-investment-calculator` | Finance > Investment > Stock & Options | 1 | shares calculator |
| `stone-slab-weight-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | stone weight calculator |
| `string-tension-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | tension calculator |
| `subfloor-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | subfloor calculator |
| `sum-of-squares-calculator` | Science > Statistics & Probability | 1 | sum of squares calculator |
| `suvat-calculator` | Science > Physics | 1 | kinematics calculator |
| `svd-calculator` | Science > Math | 1 | svd calculator |
| `swim-time-conversion-calculator` | Sports > Other Sports | 1 | swim conversion calculator |
| `swimsuit-size-calculator` | Sports > Other Sports | 1 | swimsuit size calculator |
| `tangent-line-calculator` | Science > Math | 1 | equation of tangent line calculator |
| `terminal-velocity-calculator` | Science > Physics | 1 | terminal velocity calculator |
| `theoretical-yield-calculator` | Science > Chemistry | 1 | theoretical yield calculator |
| `thermal-expansion-calculator` | Science > Mechanical & Structural Engineering | 1 | thermal expansion calculator |
| `thermodynamics-calculator` | Science > Physics | 1 | thermodynamics calculator |
| `thinset-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | thinset calculator |
| `thrust-calculator` | Science > Mechanical & Structural Engineering | 1 | thrust calculator |
| `time-dilation-calculator` | Science > Physics | 1 | time dilation calculator |
| `timelapse-calculator` | Shopping > Electronics, Energy & Tech | 1 | timelapse calculator |
| `topsoil-calculator` | House & Garden > Gravel, Soil & Landscaping | 1 | how much dirt do i need calculator |
| `torque-to-horsepower-calculator` | Sports > Motorsports & Racing | 1 | torque to hp calculator |
| `totaled-car-value-calculator` | Shopping > Vehicle, Resale & Collectibles | 1 | acv calculator |
| `tree-height-calculator` | Science > Biology & Lab | 1 | dbh calculator |
| `tree-planting-cost-calculator` | House & Garden > Lawn, Garden & Tree | 1 | planting calculator |
| `tree-value-calculator` | House & Garden > Lawn, Garden & Tree | 1 | tree value calculator |
| `trig-equation-solver` | Science > Math | 1 | trigonometric calculator |
| `trig-graph-calculator` | Science > Math | 1 | phase shift calculator |
| `trir-calculator` | Finance | 1 | trir calculator |
| `true-position-calculator` | Science > Mechanical & Structural Engineering | 1 | true position calculator |
| `true-shooting-percentage-calculator` | Sports > Other Sports | 1 | true shooting calculator |
| `unemployment-rate-calculator` | Finance > Economics | 1 | unemployment rate calculator |
| `uniform-distribution-calculator` | Science > Statistics & Probability | 1 | uniform distribution calculator |
| `units-of-production-depreciation-calculator` | Finance | 1 | units of production depreciation calculator |
| `unix-timestamp-calculator` | Science > Computer, Network & IT | 1 | unix time calculator |
| `uptime-sla-calculator` | Science > Computer, Network & IT | 1 | downtime calculator |
| `van-der-waals-calculator` | Science > Chemistry | 1 | van der waals equation calculator |
| `variable-cost-calculator` | Finance | 1 | average variable cost calculator |
| `vat-calculator` | Finance > Tax | 1 | vat calculator |
| `vertical-curve-calculator` | Science > Mechanical & Structural Engineering | 1 | vertical curve calculator |
| `vertical-jump-calculator` | Sports > Sports Performance | 1 | dunk calculator |
| `video-file-size-calculator` | Shopping > Electronics, Energy & Tech | 1 | video file size calculator |
| `vinyl-fence-calculator` | House & Garden > Deck, Fence & Stair | 1 | vinyl fence calculator |
| `viscosity-calculator` | Science > Mechanical & Structural Engineering | 1 | viscosity conversion calculator |
| `vocal-range-calculator` | Arts & Entertainment > Music Theory, Instrument & Audio | 1 | vocal range calculator |
| `voltage-divider-calculator` | Science > Electrical & Electronics Engineering | 1 | voltage divider calculator |
| `voltage-drop-resistor-calculator` | Science > Electrical & Electronics Engineering | 1 | resistor voltage drop calculator |
| `wacc-calculator` | Finance | 1 | wacc calculator |
| `water-potential-calculator` | Science > Biology & Lab | 1 | water potential calculator |
| `waveguide-cutoff-calculator` | Science > Electrical & Electronics Engineering | 1 | cutoff frequency calculator |
| `wedding-cake-cost-calculator` | Food & Drink > Party & Event Food | 1 | cake cost calculator |
| `weight-plate-calculator` | Sports > Sports Performance | 1 | plate weight calculator |
| `weight-transfer-calculator` | Sports > Motorsports & Racing | 1 | transfer calculator |
| `weld-strength-calculator` | Science > Mechanical & Structural Engineering | 1 | weld calculator |
| `wh-to-mah-calculator` | Shopping > Electronics, Energy & Tech | 1 | wh calculator |
| `what-to-offer-on-a-house-calculator` | Real Estate > Home Buying & Affordability | 1 | how much should i offer on a house calculator |
| `wilks-score-calculator` | Sports > Sports Performance | 1 | wilks calculator |
| `wind-correction-angle-calculator` | Science > Earth, Weather & Environment | 1 | wind correction angle calculator |
| `wind-load-calculator` | Business & Industrial > Construction Materials & Estimating | 1 | wind load calculator |
| `wire-resistance-calculator` | Science > Electrical & Electronics Engineering | 1 | wire resistance calculator |
| `wood-movement-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 1 | shrinkage calculator |
| `work-calculator` | Science > Physics | 1 | work calculator physics |
| `year-to-date-income-calculator` | Jobs & Education > Salary, Income & Career | 1 | year to date calculator |
| `z-test-calculator` | Science > Statistics & Probability | 1 | z test calculator |

### C3. Dropped

| Keyword | সিদ্ধান্ত ও কারণ | রাখা মূল Tool |
|---|---|---|
| omni calculator, formula calculator, calculator download, x game calculator, i calculator, star calculator, calculator flow, bee calculator, everything calculator, best online calculator, wave calculator, mom calculator, calculator website, com calculator, online calculators, or calculator, grace calculator, of calculator, answer calculator, partner calculator, calculator tool, calculators online, fast math calculator, hello on calculator, calculator with everything, calculator creator, calculator wallpaper, top calculator, promotional calculators, words on calculator, calculator paper, calculator screen, and calculator, calculator site | Drop: generic | — |
| base calculator, efficiency calculator, hole calculator, annual calculator, health calculator, minecraft calculator, p calculator, light calculator, psi calculator, bag calculator, elevation calculator, rating calculator, pixel calculator, book calculator, monthly calculator, g calculator, impact calculator, size calculator, payout calculator, high calculator, deal calculator, cost savings calculator, roll calculator, billing calculator, review calculator, call calculator, wall calculator, share calculator, blood calculator, api calculator, coefficient calculator, ga calculator, maximum calculator, r calculator | Drop: too generic / ambiguous | — |
| rust decay calculator | Drop: game meme | — |
| how to use gematria calculator, how to turn decimal into fraction on calculator, how to do antilog on calculator, how to find variance on calculator | Drop: how-to question about a physical calculator | — |
| acid tolerance calculator | Drop: unclear | — |
| cursive calculator, numbers to words calculator | Drop: not a calculation | — |
| calculator porcentaje | Drop: non-English duplicate of percentage | — |

## D. Clean Final List

**Arts & Entertainment Calculators**
- Tarot, Astrology & Fun Calculators
  - Gematria Calculator (`gematria-calculator`)
  - D&D Point Buy Calculator (`dnd-point-buy-calculator`)
  - D&D HP Calculator (`dnd-hp-calculator`)
  - D&D Encounter XP Calculator (`dnd-encounter-xp-calculator`)
  - K/D Ratio Calculator (`kd-ratio-calculator`)
  - Minecraft Stack Calculator (`minecraft-stack-calculator`)
  - Minecraft Circle Calculator (`minecraft-circle-calculator`)
  - Korean Age Calculator (`korean-age-calculator`)
  - Half Birthday Calculator (`half-birthday-calculator`)
  - Flag Dimensions Calculator (`flag-dimensions-calculator`)

**Business & Industrial Calculators**
- Agriculture & Livestock Calculators
  - Pig Gestation Calculator (`pig-gestation-calculator`)
- Freight, Logistics & Warehouse Calculators
  - Safety Stock Calculator (`safety-stock-calculator`)
- HR, Marketing & Business Operations Calculators
  - Star Rating Calculator (`star-rating-calculator`)
  - Meeting Cost Calculator (`meeting-cost-calculator`)
- Manufacturing, Metals & Engineering Calculators
  - Valve Cv Calculator (`valve-cv-calculator`)

**Finance Calculators**
- Investment Calculators > Investment Returns & Planning Calculators
  - CAPM Calculator (`capm-calculator`)
  - MIRR Calculator (`mirr-calculator`)
  - Profitability Index Calculator (`profitability-index-calculator`)
- Investment Calculators > Stock & Options Calculators
  - Intrinsic Value Calculator (`intrinsic-value-calculator`)
  - Book Value Calculator (`book-value-calculator`)
- Tax Calculators
  - Lottery Odds Calculator (`lottery-odds-calculator`)

**Food & Drink Calculators**
- Diet, Macro & Meal Planning Calculators
  - DRI Calculator (`dri-calculator`)
  - Net Carbs Calculator (`net-carbs-calculator`)
- Food Nutrition & Calorie Calculators
  - Glycemic Load Calculator (`glycemic-load-calculator`)

**Health Calculators**
- Pregnancy & Fertility Calculators
  - Baby Growth Percentile Calculator (`baby-growth-percentile-calculator`)
  - Corrected Age Calculator (`corrected-age-calculator`)
  - Breast Milk Intake Calculator (`breast-milk-intake-calculator`)
- Sleep & Medical Calculators
  - Drug Dosage Calculator (`drug-dosage-calculator`)
  - Prescription Refill Calculator (`prescription-refill-calculator`)
  - Medication Schedule Calculator (`medication-schedule-calculator`)
  - IV Drip Rate Calculator (`iv-drip-rate-calculator`)
  - Insulin Dose Calculator (`insulin-dose-calculator`)
  - LDL Cholesterol Calculator (`ldl-cholesterol-calculator`)
  - Mean Arterial Pressure Calculator (`mean-arterial-pressure-calculator`)
  - Blood Pressure Calculator (`blood-pressure-calculator`)
  - Absolute Neutrophil Count Calculator (`absolute-neutrophil-count-calculator`)
  - Cardiac Output Calculator (`cardiac-output-calculator`)
  - HOMA-IR Calculator (`homa-ir-calculator`)
  - QTc Calculator (`qtc-calculator`)
  - Adjusted Body Weight Calculator (`adjusted-body-weight-calculator`)
  - Blood Sugar Converter Calculator (`blood-sugar-converter-calculator`)
  - Pack Year Calculator (`pack-year-calculator`)
  - Contact Lens Vertex Calculator (`contact-lens-vertex-calculator`)
  - Blood Donation Eligibility Calculator (`blood-donation-eligibility-calculator`)

**House & Garden Calculators**
- Flooring, Tile, Paint & Interior Calculators
  - Quilt Backing Calculator (`quilt-backing-calculator`)
  - Circle Skirt Calculator (`circle-skirt-calculator`)

**Science Calculators**
- Chemistry Calculators
  - Lattice Energy Calculator (`lattice-energy-calculator`)
- Earth, Weather & Environment Calculators
  - Antipode Calculator (`antipode-calculator`)
- Electrical & Electronics Engineering Calculators
  - HP to Amps Calculator (`hp-to-amps-calculator`)
- Math Calculators
  - Angle Relationships Calculator (`angle-relationships-calculator`)
  - Interval Notation Calculator (`interval-notation-calculator`)
  - Scale Factor Calculator (`scale-factor-calculator`)
  - Rectangle Diagonal Calculator (`rectangle-diagonal-calculator`)
  - DMS Calculator (`dms-calculator`)
  - Triangle Centers Calculator (`triangle-centers-calculator`)
  - Golden Ratio Calculator (`golden-ratio-calculator`)
  - Fibonacci Calculator (`fibonacci-calculator`)
  - Day of the Year Calculator (`day-of-the-year-calculator`)
  - Leap Year Calculator (`leap-year-calculator`)
- Physics Calculators
  - Energy Converter Calculator (`energy-converter-calculator`)
- Statistics & Probability Calculators
  - Sensitivity Specificity Calculator (`sensitivity-specificity-calculator`)
  - Pie Chart Calculator (`pie-chart-calculator`)

**Shopping Calculators**
- Clothing, Shoe & Ring Size Calculators
  - Face Shape Calculator (`face-shape-calculator`)
- Discount, Tip & Unit Price Calculators
  - Unit Price Calculator (`unit-price-calculator`)
- Lifestyle, Party & Wedding Calculators
  - Weighted Blanket Calculator (`weighted-blanket-calculator`)

**Sports Calculators**
- Other Sports Calculators
  - Arrow Speed Calculator (`arrow-speed-calculator`)
  - Bowling Average Calculator (`bowling-average-calculator`)
- Running Calculators
  - Race Time Predictor Calculator (`race-time-predictor-calculator`)
- Sports Betting & Racing Calculators
  - Poker Odds Calculator (`poker-odds-calculator`)
  - Roulette Calculator (`roulette-calculator`)

## E. Review Notes

No keyword fails to fit a main category. These need your decision before they are built or dropped:

| Group | Keywords | প্রশ্ন / প্রস্তাব |
|---|---|---|
| clinical score (57) | abi, vbac, tinetti, bishop score, bims, gcs, tirads, braden scale, berg balance, barthel index, berg balance test, tidal volume, tinetti balance test, bladder volume, vital capacity, duke treadmill score, ciwa, pecarn, berg balance scale, lv mass, pneumonia severity index, rcri score, lille score, blood volume, nihss, mentzer index, berg, tinetti balance, morse fall scale, peak flow, stroke volume, scorad, gupta risk, bims score, stop bang, rcri risk, braden score, vti, adrenal, lv mass index, nih, revised cardiac risk index, padua score, wells score, glasgow coma scale, stroke volume index, adrenal washout calculator radiology, framingham risk, 4t score, ich score, adrenal nodule, pe risk, framingham risk score, gcs score, ti-rads, rcri, sofa score | Build a clinical-score set (GCS, NIHSS, Wells, RCRI, Braden, Berg, Bishop, Framingham, SOFA …) in Health > Sleep & Medical? These are clinician tools; a wrong score has real risk. Recommendation: build only the common consumer ones (Framingham risk, peak flow) or skip. |
| ambiguous abbreviation (31) | gp, gm, fpe, 16x9, rpd, mca, gir, oi, ped, p score, sdi, nrr, mega, ts, ahi, rh, ppp, bai, 33/40, uop, tio, x factor, uplift, cps, 16x20, pti, pfd, asa, min, mca online, ruler | gp, gm, fpe, rpd, mca, oi, ped, sdi, nrr, ppp, 16x20 … meaning is unclear. Tell me any you know; otherwise drop. |
| clinical medical (27) | fena, shock index, kt/v, urine output, allowable blood loss, inr, rsbi, fib-4, feurea, mivf, light's criteria, vbg, saag, parkland formula, vbg interpretation, lights criteria, pvr, apri, tylenol overdose, urr, fib 4 score, dka, dic, bilirubin, ards, ivig infusion rate, ivig rate | Hospital/ICU formulas (FENa, Parkland, INR, DKA, shock index…). Recommendation: skip, because the audience is clinicians. |
| clinical lab (20) | bun creatinine ratio, psa density, uacr, pf ratio, tsat, albumin creatinine ratio, microalbumin creatinine ratio, upcr, transferrin saturation, p/f ratio, estrogen to progesterone ratio, protein creatinine ratio, estrogen progesterone ratio, ast alt ratio, anion gap, urine protein creatinine ratio, psa doubling time, ast/alt ratio, progesterone to estrogen ratio, psa velocity | Lab ratios (BUN/creatinine, UACR, AST/ALT, PSA density, anion gap, TSAT). Build one "lab ratio" tool in Health, or skip? |
| prescription drug dosing (19) | carboplatin, warfarin dose adjustment, carbo, accutane, accutane cumulative dose, accutane dosage, accutane dose, carboplatin auc, carboplatin dose, warfarin dosing, carbo dose, warfarin, carboplatin auc 5, global rph carbo, benzo, carboplatin calculator auc, carbo auc, levothyroxine dosage, calvert formula | Warfarin, carboplatin (Calvert), Accutane cumulative dose, levothyroxine. Recommendation: do not build. These are prescriber decisions. |
| disease life expectancy (9) | copd life expectancy, alzheimer's life expectancy, heart failure life expectancy, alcoholic life expectancy, stage 4 prostate cancer life expectancy, dementia life expectancy, alzheimer life expectancy, prostate cancer life expectancy, mixed dementia life expectancy | COPD/dementia/cancer life expectancy. Recommendation: do not build (sensitive and not a formula). |
| machining/woodworking (5) | taper, k factor, countersink, segmented bowl, bend deduction | Taper, countersink, segmented bowl, sheet-metal bend deduction/K-factor. Add to B&I Manufacturing as one tool each? |
| dating pool (4) | dating, dating standards, dating percentage, dating preference | Fun "dating standards / dating pool" estimator. Arts > Fun, or skip? |
| bariatric projection (3) | how much weight will i lose with gastric sleeve, breastfeeding weight loss, gastric sleeve weight loss | Same as the fitness check: skip (medical projection), unless you want it in Health. |
| geometry rotation (2) | rotation, graph rotation | Single niche search. Build only if you want full coverage; otherwise drop. |
| iq test (2) | iq percentile, iq | Single niche search. Build only if you want full coverage; otherwise drop. |
| specialist time (2) | time of death, sidereal time | Single niche search. Build only if you want full coverage; otherwise drop. |
| calculus extrema (2) | max and min, maximum and minimum | Single niche search. Build only if you want full coverage; otherwise drop. |
| boating (2) | hull speed, prop slip | Single niche search. Build only if you want full coverage; otherwise drop. |
| space travel time (2) | space travel, warp speed | Single niche search. Build only if you want full coverage; otherwise drop. |
| marketing analytics (2) | crm, rfm | Single niche search. Build only if you want full coverage; otherwise drop. |
| vitamin intake (2) | vitamin d, vitamin | Single niche search. Build only if you want full coverage; otherwise drop. |
| sugar intake (2) | sugar intake, sugar | Single niche search. Build only if you want full coverage; otherwise drop. |
| light travel time (1) | speed of light | Single niche search. Build only if you want full coverage; otherwise drop. |
| epidemiology incidence (1) | incidence rate | Single niche search. Build only if you want full coverage; otherwise drop. |
| college acceptance (1) | acceptance rate | Single niche search. Build only if you want full coverage; otherwise drop. |
| capital gains yield (1) | capital gains yield | Single niche search. Build only if you want full coverage; otherwise drop. |
| microwave wattage time (1) | microwave | Single niche search. Build only if you want full coverage; otherwise drop. |
| party food quantity (1) | how much mashed potatoes per person | Single niche search. Build only if you want full coverage; otherwise drop. |
| twins odds (1) | odds of having twins | Single niche search. Build only if you want full coverage; otherwise drop. |
| era years (1) | bc to ad | Single niche search. Build only if you want full coverage; otherwise drop. |
| luggage linear inches (1) | linear inches | Single niche search. Build only if you want full coverage; otherwise drop. |
| pottery (1) | clay shrinkage | Single niche search. Build only if you want full coverage; otherwise drop. |
| kitten growth (1) | how big will my cat get | Single niche search. Build only if you want full coverage; otherwise drop. |
| horse round pen (1) | round pen | Single niche search. Build only if you want full coverage; otherwise drop. |
| ape index (1) | wingspan | Single niche search. Build only if you want full coverage; otherwise drop. |
| moa (1) | moa | Single niche search. Build only if you want full coverage; otherwise drop. |
| angle of impact (1) | angle of impact | Single niche search. Build only if you want full coverage; otherwise drop. |
| shoelace length (1) | shoelace length | Single niche search. Build only if you want full coverage; otherwise drop. |
| cat toxicity (1) | cat chocolate toxicity | Single niche search. Build only if you want full coverage; otherwise drop. |
| energy efficiency (1) | energy efficiency | Single niche search. Build only if you want full coverage; otherwise drop. |
| mesh conversion (1) | mesh to micron | Single niche search. Build only if you want full coverage; otherwise drop. |
| water displacement (1) | water displacement | Single niche search. Build only if you want full coverage; otherwise drop. |
| stocking rate (1) | cattle per acre | Single niche search. Build only if you want full coverage; otherwise drop. |
| uv tanning (1) | tanning | Single niche search. Build only if you want full coverage; otherwise drop. |
| rainfall volume (1) | rainfall | Single niche search. Build only if you want full coverage; otherwise drop. |
| futures (1) | futures contract | Single niche search. Build only if you want full coverage; otherwise drop. |
| barrel twist rate (1) | twist rate | Single niche search. Build only if you want full coverage; otherwise drop. |
| compressed air (1) | acfm to scfm | Single niche search. Build only if you want full coverage; otherwise drop. |
| smoking cost (1) | cigarette | Single niche search. Build only if you want full coverage; otherwise drop. |
| energy units (1) | joules to volts | "joules to volts" mixes units (needs charge). Drop, or add to the new energy converter as J = V × C? |
| pcb trace width (1) | pcb trace current | Single niche search. Build only if you want full coverage; otherwise drop. |
| ram latency (1) | ram speed | Single niche search. Build only if you want full coverage; otherwise drop. |
| billable utilization (1) | utilization rate | Single niche search. Build only if you want full coverage; otherwise drop. |
| india epf (1) | epf | Single niche search. Build only if you want full coverage; otherwise drop. |
| fertility (1) | egg freezing success rate | Single niche search. Build only if you want full coverage; otherwise drop. |
| oxygen tank duration (1) | oxygen tank | Single niche search. Build only if you want full coverage; otherwise drop. |
| dev tool (1) | css specificity | Single niche search. Build only if you want full coverage; otherwise drop. |

**Coverage gap:** this list shows a clear gap in everyday **medical/health maths**: dosage, refills, MAP, cholesterol, BP, QTc, ANC and infant growth. That is why 17 of the new tools go to Health > Sleep & Medical. There are 4 gaps in **tabletop and video games** (D&D point buy, HP, encounter XP, K/D) and 2 in **casino games** (poker, roulette).
