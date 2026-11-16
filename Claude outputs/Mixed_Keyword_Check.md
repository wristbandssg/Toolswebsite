# Mixed calculator keyword check (16 Nov 2026)

Checked against the live database (7,092 tools). Every new slug was also checked against every `slug:` in `prisma/` and `src/`, and none of the 12 exist. You didn't supply a category structure ("ata tomi check kore dio"), so the live DB taxonomy was used. **BUILT 16 Nov 2026:** all 12 new tools are published (two batches: create-mix-conv / create-mix-life-calculators.ts). The two suggested upgrades (square-footage feet + inches inputs, the unit-converter mcg unit) are not done yet.

## A. Summary

| | Count |
|---|---|
| Keywords received | **533** (no exact duplicates) |
| Already built (mapped to an existing tool) | **468** keywords → 66 existing tools |
| Merged into a new tool (secondary keyword) | 31 |
| Needs review | 9 (8 calculator-history questions, 1 "course calculator") |
| Dropped (generic "calculator site/online/website" searches) | 13 |
| **Unique new tools** | **12** |

No new main category or sub-category is needed. All 12 go into existing subs.

**Limitations**
- Matching was done by intent with about 85 rules. Typos ("compund", "compoud", "intrest"), plurals and word order were normalised.
- Two existing tools don't fully cover their keywords. These are upgrades, not new tools:
  - `square-footage-calculator` takes a single length/width number. About 12 keywords want **feet + inches** input ("square footage calculator with feet and inches"). Recommendation: add inch fields to the existing tool.
  - `unit-converter-calculator` has no **microgram** unit ("mcg to mg calculator"). Recommendation: add mcg.

## B. Category decisions (new tools)

| # | Keyword (main) | Main Category | Subcategory | কারণ (১ লাইনে) | নিশ্চয়তা | kw |
|---|---|---|---|---|---|---|
| 1 | chronological age calculator | Jobs & Education | School Age, Calendar & Classroom | Psych/educational testing age (Pearson, WISC) in years-months-days with the testing borrow rule. This differs from the plain age calculator. Alternative: Science > Math. | নিশ্চিত | 9 |
| 2 | height calculator feet to cm | Science | Math | Converts ft + in ↔ cm, which the unit converter can't do in one field. Alternative: Sports. | মোটামুটি | 6 |
| 3 | feet and inches calculator | Science | Math | Adds and subtracts ft-in measurements and converts to inches or decimal feet. Alternative: House & Garden (tape-measure maths). | মোটামুটি | 6 |
| 4 | miles to steps calculator | Sports | Hiking | Reverse of the existing step calculator: distance → steps, with steps per mile from height. | নিশ্চিত | 4 |
| 5 | cubic yards to tons calculator | House & Garden | Gravel, Soil & Landscaping | Direct yd³ ↔ tons by material density. Gravel-calculator only goes from area to tons. | নিশ্চিত | 4 |
| 6 | nm to ft lbs calculator | Science | Mechanical & Structural Engineering | Torque unit conversion (N·m, ft-lb, in-lb, kgf·m). Torque-calculator computes torque but doesn't convert it. | নিশ্চিত | 4 |
| 7 | age difference calculator | Science | Math | Gap between two birth dates in years, months and days, placed next to the age calculator. Alternative: Arts > Fun. | মোটামুটি | 3 |
| 8 | lumens to watts calculator | House & Garden | HVAC, Plumbing & Electrical | Bulb lumens ↔ watts by type (LED, CFL, halogen, incandescent). The lumens calculator is room lighting. | নিশ্চিত | 2 |
| 9 | gallons to pounds calculator | Science | Physics | Liquid weight from volume × density (water, milk, gasoline, diesel, oil). Alternative: Science > Math. | মোটামুটি | 2 |
| 10 | generation calculator | Arts & Entertainment | Tarot, Astrology & Fun | "What generation am I" from birth year (Boomer, Gen X, Millennial, Gen Z, Alpha). | মোটামুটি | 1 |
| 11 | day trading calculator | Finance | Investment > Stock & Options | Stock position size, risk, P/L after fees, and daily-compounding target. Forex and crypto versions already exist. | মোটামুটি | 1 |
| 12 | surface feet calculator | Business & Industrial | Manufacturing, Metals & Engineering | Machining SFM ↔ RPM from tool diameter. Could also be a "square feet" search. | অনিশ্চিত | 1 |

## C. বাদ দেওয়া বা Merge করা Keywords

### C1. Merged into a new tool (secondary keywords)

| Keyword | সিদ্ধান্ত ও কারণ | রাখা মূল Tool |
|---|---|---|
| chronological calculator, chrono age calculator, chron age calculator, chronological age calculator (find out your age), chronological age calculator pearson, pearson chronological age calculator, testing age calculator, test age calculator | Same calculation | chronological-age-calculator |
| height calculator in cm, height calculator cm to feet, height calculator in feet, height in inches calculator, human height calculator | Same conversion | height-converter-calculator |
| feet calculator, foot calculator, feet to inches calculator, inches to feet calculator, inches to feet and inches calculator | Same ft-in maths | feet-and-inches-calculator |
| steps in a mile calculator, steps per mile calculator, distance to steps calculator | Same calculation | miles-to-steps-calculator |
| yards to tons calculator, cubic yard to ton calculator, tons to yards calculator | Same conversion, both directions | cubic-yards-to-tons-calculator |
| ft lbs to inch lbs calculator, in lbs to ft lbs calculator, ft to lb calculator (অনিশ্চিত: probably ft-lb torque) | Same conversion | torque-conversion-calculator |
| age gap calculator, age calculator difference | Same calculation | age-difference-calculator |
| watts to lumens calculator | Reverse direction, same tool | lumens-to-watts-calculator |
| water weight calculator | Water is the default liquid | gallons-to-pounds-calculator |

### C2. Already built (mapped to an existing tool)

| রাখা মূল Tool | Category | kw | Keywords |
|---|---|---|---|
| `date-calculator` | Science > Math | 85 | date calculator, day calculator, days since calculator, date and time calculator, days between dates calculator, days until calculator, date calculator between two dates, countdown calculator, time calculator between dates, time since calculator, day calculator between dates, days calculator between two dates, 60 day calculator, 30 day calculator, days from today calculator, 45 day calculator, 90 days calculator, how many days until calculator, days from now calculator, day time calculator, date countdown calculator, date duration calculator days between dates, calendar calculator between dates, date between calculator, date calculator count days, calculator days, calculator days between dates, time day calculator, calendar calculator days, days to date calculator, date calculator days, days difference calculator, 60 day calendar calculator, calculator between dates, time frame calculator, date calculator days between, datetime calculator, how many days calculator, how long calculator, weeks until calculator, days till calculator, date between two dates calculator, days out calculator, calendar duration calculator, 90 day calculator, date calculator between, date days calculator, day and time calculator, how many days since calculator, days from date calculator, day to day calculator, days between calculator, days in between calculator, how many years calculator, calendar calculator, time date calculator, date calculator online, between dates calculator, future date calculator, dates calculator, dates between calculator, time until calculator, time between dates calculator, 60 days calculator, day difference calculator, date time calculator, date range calculator, days calculator, days before calculator, days after calculator, calculator date, days calculator between dates, days elapsed calculator, online date calculator, day countdown calculator, day date calculator, date difference calculator, date to date calculator, day counter calculator, date calculator between dates, calendar date calculator, time and date calculator, date calculator between 2 dates, calender calculator, date from calculator |
| `compound-interest-calculator` | Finance > Investment > Investment Returns & Planning | 39 | compound interest calculator, compound calculator, monthly compound interest calculator, compounding calculator, compound interest calculator monthly, compound interest formula calculator, calculator compound interest, compound growth calculator, weekly compound interest calculator, interest compound calculator, compund interest calculator, cumulative interest calculator, compound.interest calculator, calculator site compound interest calculator, compund calculator, compound interest calculator sbi, compounded interest calculator, compound interest calculator uk, ci calculator, calculator site compound interest, compond interest calculator, monthly compounding interest calculator, conpound interest calculator, compound monthly interest calculator, online compound interest calculator, compund intrest calculator, compoun interest calculator, compiund interest calculator, compounding interest calculator, compound interest calculator | investor.gov, compound intetest calculator, compound amount calculator, compound interest calculators, compoud interest calculator, compound interst calculator, compound intrest calculator, compount interest calculator, compound formula calculator, calculator interest compound |
| `unit-converter-calculator` | Science > Math | 39 | liquid calculator, weight conversion calculator, liquid conversion calculator, lbs and oz to kg calculator, grams to pounds and ounces calculator, cm to inches calculator, mcg to mg calculator, cm calculator, square feet to yards calculator, grams to ounces calculator, cm to.inches calculator, grams to pounds calculator, km to miles calculator, measuring calculator, sq in calculator, oz to ml calculator, ml calculator, kilometers to miles calculator, oz to gallon calculator, ounces to liters calculator, mg calculator, inches to cm calculator, grams to oz calculator, kg to lb calculator, inches to centimeters calculator, kmh to mph calculator, meters to feet calculator, in to cm calculator, ounces to grams calculator, km to mph calculator, distance conversion calculator, pound calculator, pounds to grams calculator, oz to lbs calculator, liters to gallons calculator, ounces to pounds calculator, oz to grams calculator, ounces to ml calculator, measurement conversion calculator |
| `square-footage-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 29 | sq ft calculator, square foot calculator, sqft calculator, square feet calculator, ft to sq ft calculator, sf calculator, square footage calculator with feet and inches, square footage calculator feet and inches, square foot calculator with inches, area calculator with feet and inches, square feet calculator inches, inches to square feet calculator, sq ft calculator with inches, area calculator feet and inches, sy calculator, feet to square feet calculator, sq ft calculator inches, sqft calculator feet and inches, cost per square foot calculator, sqft calculator inches, square feet calculator with inches, square foot calculator with feet and inches, dimension calculator, sq footage calculator, sq feet calculator, footage calculator, dimensions calculator, square footage calculator, sq foot calculator |
| `cooking-calculator` | Food & Drink > Baking & Recipe | 20 | cooking conversion calculator, grams to cups calculator, how many ounces in a cup calculator, cooking calculator, gram to cup calculator, baking conversion calculator, cups to grams calculator, baking calculator, grams to milliliters calculator, grams to ml calculator, grams to teaspoons calculator, baking measurement conversion calculator, convert grams to cups calculator, cooking measurement calculator, ml to grams calculator, grams to tablespoons calculator, grams to ml conversion calculator, kitchen conversion calculator, ml to g calculator, kitchen calculator |
| `cubic-feet-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 18 | cubic feet calculator, cft calculator, cubic foot calculator, cubic ft calculator, cubic feet to square feet calculator, cubic ft to sq ft calculator, cubic feet of air calculator, cuft calculator, cubic square feet calculator, square feet to cubic feet calculator, cubic calculator, cubic footage calculator, cf calculator, cubic feet to yards calculator, cu ft calculator, cubic inches calculator, case cube calculator, cubic volume calculator |
| `step-calculator` | Sports > Hiking | 17 | steps to miles calculator, step calculator, steps calculator, steps to calories calculator, steps calorie calculator, step calorie calculator, step to calorie calculator, steps to miles conversion calculator, steps to calories burned calculator, step conversion calculator, steps calories calculator, steps into miles calculator, convert steps to miles calculator, step to mile calculator, calories burned steps calculator, steps calories burned calculator, walking steps calculator |
| `hourly-to-salary-calculator` | Jobs & Education > Salary, Income & Career | 14 | hourly to salary calculator, hour to salary calculator, hourly wage to salary calculator, omni salary calculator, hr to salary calculator, hour salary calculator, per hour to salary calculator, hours to salary calculator, hourly vs salary calculator, salary calculator based on hourly, hourly rate to salary calculator, salary vs hourly calculator, hourly pay to salary calculator, wage to salary calculator |
| `salary-to-hourly-calculator` | Jobs & Education > Salary, Income & Career | 14 | salary to hourly calculator, yearly to hourly calculator, annual salary to hourly calculator, yearly to hourly salary calculator, annual to hourly salary calculator, salary to wage calculator, salary calculator to hourly, salary to hourly rate calculator, salary to hourly pay calculator, annual to hourly calculator, salary to hourly wage calculator, salary hourly calculator, yearly salary to hourly calculator, salary calculator hourly |
| `cubic-yard-calculator` | House & Garden > Gravel, Soil & Landscaping | 14 | cubic yard calculator, yardage calculator, cy calculator, sf to cy calculator, sq ft to cubic yards calculator, yard calculator, square feet to cubic yard calculator, yards calculator, cu yard calculator, cubic yardage calculator, sy to cy calculator, cu yd calculator, cubic feet to cubic yards calculator, cubic yards calculator |
| `money-counter-calculator` | Finance > Budget > Money-Saving & Spending | 13 | money calculator, coin calculator, cash calculator, money counter calculator, coins calculator, calculator for money, till calculator, calculator money, money calculator online, register calculator, adding money calculator, cash register calculator, money calculator google |
| `daily-compound-interest-calculator` | Finance > Interest Rate | 10 | daily compound interest calculator, compound interest calculator daily, daily compound calculator, daily compounding interest calculator, daily compounding calculator, compound interest daily calculator, compound daily calculator, interest compounded daily calculator, compound calculator daily, compounded daily calculator |
| `hourly-to-annual-salary-calculator` | Jobs & Education > Salary, Income & Career | 9 | hourly to yearly salary calculator, hourly to annual salary calculator, hourly to yearly calculator, salary calculator hourly to annual, hourly to annual calculator, annual income calculator hourly, yearly income calculator hourly, yearly wage calculator, annual wage calculator |
| `compound-interest-with-withdrawals-calculator` | Finance > Interest Rate | 8 | compound interest calculator with withdrawals, investment calculator with withdrawals, interest calculator with withdrawals, compound interest with withdrawals calculator, compound calculator with withdrawals, compound interest withdrawal calculator, future value calculator with withdrawals, investment withdrawal calculator |
| `percentage-change-calculator` | Science > Math | 8 | % change calculator, percentage of change calculator, percent of change calculator, price change calculator, change percentage calculator, percent change in mass calculator, net change calculator, percent change calculator |
| `square-feet-lot-size-calculator` | Real Estate > Land, Construction & Building Cost | 8 | lot size to acres calculator, acres calculator, square feet to acres calculator, sqft to acre calculator, feet to acres calculator, sq ft to acre calculator, square feet to acre calculator, square foot to acre calculator |
| `weighted-grade-calculator` | Jobs & Education > Grade | 7 | grade calculator college, grades calculator, grade weight calculator, calculator for grades, weighted grades calculator, overall grade calculator, college class grade calculator |
| `hourly-wage-calculator` | Jobs & Education > Salary, Income & Career | 7 | hourly rate calculator, hourly income calculator, wage calculator hourly, money per hour calculator, hour wage calculator, calculator hourly pay, hourly wages calculator |
| `time-and-a-half-calculator` | Jobs & Education > Salary, Income & Career | 6 | time and half calculator, time and a half calculator, time in a half calculator, time in half calculator, time and a half pay calculator, overtime time and a half calculator |
| `basic-calculator` | Science > Scientific & Graphing | 6 | calculator unblocked, free math calculator, real calculator, online calculator for free, calculator on line, calculator google calculator |
| `savings-goal-calculator` | Finance > Savings | 5 | savings calculator goal, saving goal calculator, saving calculator goal, savings goal calculator, financial goal calculator |
| `stock-average-price-calculator` | Finance > Investment > Stock & Options | 5 | average stock calculator, stock average calculator, average stock price calculator, stock average cost calculator, stock price average calculator |
| `percentage-calculator` | Science > Math | 5 | % of calculator, is of calculator, percent of number calculator, percent of calculator, percent of a number calculator |
| `overtime-calculator` | Jobs & Education > Salary, Income & Career | 4 | overtime calculator, ot calculator, over time calculator, raise calculator over time |
| `final-grade-calculator` | Jobs & Education > Grade | 4 | exam calculator, exam grade calculator, what do i need on my final calculator, final exam grade calculator |
| `cbm-calculator` | Business & Industrial > Freight, Logistics & Warehouse | 4 | cbm calculator, cubic meter calculator, cubic meters calculator, m3 calculator |
| `cagr-calculator` | Finance > Investment > Investment Returns & Planning | 4 | cagr calculator, compound growth rate calculator, annual growth rate calculator, compound annual growth rate calculator |
| `floor-plan-area-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 4 | home square footage calculator, floor plan square footage calculator, house square footage calculator, total square footage calculator |
| `daily-interest-calculator` | Finance > Interest Rate | 3 | daily interest calculator, compound daily interest calculator, interest per day calculator |
| `apy-calculator` | Finance > Savings | 3 | apy calculator monthly, apy calculator, interest apy calculator |
| `salary-per-hour-calculator` | Jobs & Education > Salary, Income & Career | 3 | salary per hour calculator, per hour salary calculator, salary calculator per hour |
| `salary-conversion-calculator` | Jobs & Education > Salary, Income & Career | 3 | monthly to hourly calculator, monthly salary to hourly calculator, wage conversion calculator |
| `watts-to-amps-calculator` | Science > Electrical & Electronics Engineering | 3 | watts to amps calculator ac, convert watts to amps calculator, watts to amps calculator |
| `forex-calculator` | Finance > Crypto > Currency Exchange & Forex | 2 | forex calculator, calculator forex |
| `overtime-pay-calculator` | Jobs & Education > Salary, Income & Career | 2 | overtime pay calculator, overtime wage calculator |
| `price-per-square-foot-calculator` | Real Estate > Home Value, Equity & Selling | 2 | price per square foot calculator, price per sq ft calculator |
| `forex-compounding-calculator` | Finance > Crypto > Currency Exchange & Forex | 2 | forex compounding calculator, forex compound calculator |
| `daily-interest-rate-calculator` | Finance > Interest Rate | 2 | daily interest rate calculator, daily to annual interest rate calculator |
| `waist-to-hip-ratio-calculator` | Sports > Sports Performance | 2 | waist hip ratio calculator, hip waist ratio calculator |
| `simple-interest-calculator` | Finance > Investment > Investment Returns & Planning | 2 | simple interest rate calculator, per annum interest calculator |
| `hourly-to-monthly-salary-calculator` | Jobs & Education > Salary, Income & Career | 2 | hourly to monthly salary calculator, monthly income calculator hourly |
| `change-calculator` | Finance | 2 | change calculator, money change calculator |
| `rent-per-square-foot-calculator` | Real Estate > Rent & Tenant | 2 | rent per square foot calculator, rent per sq ft calculator |
| `room-area-calculator` | House & Garden > Home Building, Remodel & Cleaning Cost | 2 | room area calculator, room sq ft calculator |
| `retirement-date-calculator` | Finance > Retirement | 2 | days to retirement calculator, days until retirement calculator |
| `fraction-calculator` | Science > Math | 2 | adding fractions with unlike denominators calculator, fractions calculator |
| `byte-calculator` | Science > Computer, Network & IT | 2 | gb calculator, mb calculator |
| `age-calculator` | Science > Math | 1 | how old calculator |
| `double-time-calculator` | Jobs & Education > Salary, Income & Career | 1 | double time calculator |
| `savings-with-withdrawals-calculator` | Finance > Savings | 1 | savings calculator with withdrawals |
| `treadmill-to-steps-calculator` | Sports > Other Sports | 1 | treadmill steps calculator |
| `overtime-rate-calculator` | Jobs & Education > Salary, Income & Career | 1 | overtime rate calculator |
| `hourly-wage-increase-calculator` | Jobs & Education > Salary, Income & Career | 1 | raise calculator hourly |
| `compound-interest-with-monthly-contributions-calculator` | Finance > Interest Rate | 1 | compound interest calculator with monthly contributions |
| `overtime-hours-calculator` | Jobs & Education > Salary, Income & Career | 1 | overtime hours calculator |
| `mpge-calculator` | Finance > Car & Vehicle Cost > Car Ownership, Fuel & EV Cost | 1 | mpge calculator |
| `weight-on-other-planets-calculator` | Science > Astronomy & Space | 1 | mass to weight calculator |
| `savings-goal-timeline-calculator` | Finance > Savings | 1 | how long will it take to save calculator |
| `fte-calculator` | Business & Industrial > HR, Marketing & Business Operations | 1 | part time to full time calculator |
| `investment-calculator` | Finance > Investment > Investment Returns & Planning | 1 | investment calculator compounding |
| `drawer-size-calculator` | House & Garden > Framing, Drywall, Insulation & Siding | 1 | drawer calculator |
| `pay-raise-percentage-calculator` | Jobs & Education > Salary, Income & Career | 1 | pay raise calculator percentage |
| `flooring-calculator` | House & Garden > Flooring, Tile, Paint & Interior | 1 | square foot calculator for flooring |
| `air-changes-per-hour-calculator` | House & Garden > HVAC, Plumbing & Electrical | 1 | square feet to cfm calculator |
| `holiday-pay-calculator` | Jobs & Education > Salary, Income & Career | 1 | overtime and holiday pay calculator |
| `mulch-calculator` | House & Garden > Gravel, Soil & Landscaping | 1 | mulch coverage calculator |

### C3. Dropped (13)
the calculator site, calculator site, calculator website, website calculator, online calculators, financial calculators, calculator calc, calculator for, estimate calculator, everything calculator, cumulative calculator, daily calculator, long calculator. These are generic or navigational searches with no single calculation. ("calculator site compound interest" and "omni salary calculator" were kept and mapped to their generic tool.)

## D. Clean Final List (new tools only)

- **Science Calculators**
  - Math → Height Converter (Feet & Inches ↔ cm) · Feet and Inches Calculator · Age Difference Calculator
  - Physics → Gallons to Pounds Calculator (Water & Liquid Weight)
  - Mechanical & Structural Engineering → Torque Conversion Calculator (N·m, ft-lb, in-lb)
- **House & Garden Calculators**
  - Gravel, Soil & Landscaping → Cubic Yards to Tons Calculator
  - HVAC, Plumbing & Electrical → Lumens to Watts Calculator
- **Jobs & Education Calculators**
  - School Age, Calendar & Classroom → Chronological Age Calculator (Testing Age)
- **Sports Calculators**
  - Hiking → Miles to Steps Calculator
- **Finance Calculators**
  - Investment > Stock & Options → Day Trading Calculator
- **Arts & Entertainment Calculators**
  - Tarot, Astrology & Fun → Generation Calculator
- **Business & Industrial Calculators**
  - Manufacturing, Metals & Engineering → Surface Feet per Minute (SFM) Calculator

## E. Review Notes

1. **Calculator history (8 kw):** when were calculators invented, when was the calculator invented, when was the first calculator invented, invention of the calculator, first calculator, the first calculator, calculator history, early calculators. These are questions, not calculations, so they need no tool. They would suit a blog post.
2. **"course calculator" (1 kw):** unclear. It could be a golf course handicap (already exists as `course-handicap-calculator`), a course grade, or a course load.
3. **"surface feet calculator":** is it machining SFM, or square feet (already built)?
4. **Upgrades to existing tools (no new tool):** add feet + inches inputs to `square-footage-calculator` (≈12 kw) and the mcg unit to `unit-converter-calculator`.
5. **Coverage gap:** about 88% of this list was already built. The real gaps are small converters (height, torque, liquid weight, yd³ → tons, lumens) and testing age.
