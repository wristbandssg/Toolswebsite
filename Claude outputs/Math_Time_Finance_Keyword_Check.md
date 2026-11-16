# Calculator keyword check — math, time-card, finance batch (16 Nov 2026)

**BUILT 16 Nov 2026:** all 5 new tools are published (create-mtf-calculators.ts).

Checked against the live database (7174 tools, 183 categories). The new slugs were also checked against every `slug:` in `prisma/` and `src/`, and none exist yet. No category structure was supplied ("ata tomi check kore dio"), so the live DB taxonomy was used. **Report only — nothing built yet.**

## A. সংক্ষিপ্ত হিসাব

| | Count |
|---|---|
| Keywords received (3 parts) | 2,881 lines → **2847** unique |
| আগে তৈরি থাকায় বাদ | **2732** keywords → 350 existing tools |
| Duplicate / merge into a new tool | 7 |
| Review প্রয়োজন | 5 |
| Dropped (generic / brand / not a calculation) | 98 |
| **চূড়ান্ত unique নতুন tools** | **5** |

No new main category or subcategory is needed.

**যাচাইয়ের সীমাবদ্ধতা**
- These are top-volume generic searches, so about 96% are already built. Keyword-to-tool mappings confirmed in earlier reports were reused for 1,468 keywords. The rest were matched by rules and tokens, and every token match was reviewed by hand. About 735 wrong matches were corrected; for example, "clock" had matched *asylum-clock*, "birthday" *birthday-paradox*, "z-score" *altman-z-score*, and "savings bond" generic *savings*.
- Timesheet, clock-in/out, payroll-hours and lunch-break searches go to **time-card-calculator**, which handles lunch breaks, overtime, decimal hours and pay. Decimal-hours conversions go to **time-calculator**.
- "eag" (estimated average glucose) maps to the existing **gmi-calculator** (A1c ↔ average glucose).

## B. Category সিদ্ধান্ত (new tools)

| Keyword | Main Category | Subcategory | কারণ | নিশ্চয়তা |
|---|---|---|---|---|
| long multiplication calculator | Science Calculators | Math Calculators | Long multiplication with every step (partial products, carries) — long-division exists, multiplication-with-steps does not; basic-calculator gives only the answer | নিশ্চিত |
| long addition calculator | Science Calculators | Math Calculators | Column addition/subtraction with carrying and borrowing steps — a school homework intent distinct from basic-calculator | নিশ্চিত |
| order of operations calculator | Science Calculators | Math Calculators | PEMDAS/BODMAS solver that shows each step; basic-calculator follows PEMDAS but shows no steps, evaluate-expression is for variables | মোটামুটি |
| repeating decimal to fraction calculator | Science Calculators | Math Calculators | 0.3̅ → 1/3 style conversion; fraction-calculator converts only terminating decimals | নিশ্চিত |
| living off interest calculator | Finance Calculators | Retirement Calculators | How much capital is needed to live off interest/dividends (or income from a given balance); could also go in Investment Returns & Planning | মোটামুটি |

## C. বাদ দেওয়া বা Merge করা Keywords

### Merged into a new tool
| Keyword | সিদ্ধান্ত | রাখা মূল Tool |
|---|---|---|
| multiplication calculator with steps | same calculation, secondary keyword | long-multiplication-calculator |
| step by step multiplication calculator | same calculation, secondary keyword | long-multiplication-calculator |
| long subtraction calculator | same calculation, secondary keyword | long-addition-subtraction-calculator |
| pemdas calculator | same calculation, secondary keyword | order-of-operations-calculator |
| repeating decimal calculator | same calculation, secondary keyword | repeating-decimal-to-fraction-calculator |
| live off interest calculator | same calculation, secondary keyword | passive-income-calculator |
| passive income calculator | same calculation, secondary keyword | passive-income-calculator |

### Already built (grouped by existing tool)
| Existing tool | Category | Keywords |
|---|---|---|
| time-card-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 231: time clock; work time; time calculator work; timecard; timesheet; time sheet; time card; shift; how many hours am i working; time calculator for work; payroll hours; working hours; calculator soup work hours; clock in; work clock; hours calculator week; hourly time; calculator soup hours; time card calculator with lunch; work schedule; payroll time; time work; time clock calculator free; payroll hour; free time clock; work week; job hours; employee hours; employee hour; schedule; hours calculator with lunch; total hours; timesheet calculator with lunch; hourly work; week hours; hour calculator pay; work shift; work hr; clock in clock out; hour clock; time clock calculator with lunch; timesheet hours; time punch; job hour; timecard calculator with lunch; shift hours; clock hours; payroll calculator hourly; weekly time; clock out; calculator soup time card; time soup; time calculator with lunch; work hours calculator pay; 8 hour shift; time schedule; job time; time calculator week; workhour; calculator payroll hours; time.clock; hour calculator payroll; work calculator time; time sheet calculator with lunch; schedule hours; shift time; hours calculator payroll; work soup; work time clock; lunch; time tracker; time calculator with breaks; 40 hour; time calculator for payroll; hour calculator week; 40 hour work week; hrs; weekly time clock; time shift; clock in time; time calculator payroll; break; employee time; shift calculator hours; free time card calculator with lunch; calculator time clock; shift hour; time clock in and out; time calculator hourly; time clock calculator with lunch break; time card calculator with break; calculator timesheet; employee time clock; hour calculator with lunch; time calculator with lunch break; payroll calculator hours; hours calculator for payroll; time clock hours; paycheck hour; soup calculator work hours; week hour; pay hours; time hourly; hours total; 8 hour; time card hour; work calculator with lunch; hours calculator with break; work time calculator with lunch; work timesheet; my hours; hours calculator with pay; pay time; time sheet hours; time clock calculator - employee timeclock calculator online; time in and out; time clock calculator with breaks; payroll hours calculator free; hour pay; payroll conversion; time in time out; hour calculator paycheck; free hour; military time card; job calculator hours; time clock calculator hours and minutes; daily hour; online timesheet; time cards; on the clock; clock in out; time entry; time click; time calculator with break; hour calculator with break; time sheet calculator hours; hours per week; time card calculator decimal; time payroll; online time clock; hourly timesheet; working time; hours pay; break time; free online time card; clocking; schedule time; hours and pay; hour duration; free hours; hourly time clock; time tracking; work time calculator app; timeclock calculator online; time duration calculator with breaks; on the clock time; clock in and clock out; lunch break; paycheck hours; timeclock hour; 45 minute lunch break; timeclock hours; time log; weekly time card; time clock calculator decimal; clockin; lunch time; weekly timesheet; time clock conversion; hours calculator paycheck; timecard hour; time pay; calculator for time cards; calculator hours with lunch; pay calculator hours; 8hr shift; calculator time card; timesheet calculator with breaks; workday time; my time card; decimal time clock; time sheets; 1 hour lunch break; time card clock; free online timesheet; time card calculator hours; time clock calculator with break; time card calculator minutes; time.card; clock out time; timecard calculator free; time card calculator with lunch breaks; clock in and out time; time and pay; clock in hours; payroll time clock; time sheet calculator free; 8 hours work day; lunch break calculator free; timesheet calculator free; time card calculator app; timecard calculator with lunch break; timesheet calculator hours; free time sheet; clockout; punch time; if i have a 30 minute break; timesheet conversion; time card with lunch; time card calculator 2 weeks with lunch; employee time card; timesheet calculator with lunch breaks; hours to pay; time clock calculator app; time clock calculator hours; free calculator time card; online timecard; punch card; biweekly hours; timesheet calculator with lunch break; online time card; monthly timesheet; 2 week time card; free time clock calculator with lunch; punch in; work hour calculator with pay; time clock hour; time card calculator with breaks; 8 hour work day; free timesheet; daves timecard |
| fraction-calculator | Science Calculators > Math Calculators | 129: mixed number; decimal to fraction; mixed fraction; fraction; fraction to decimal; fractions; improper fraction; mixed number fraction; dividing fractions; multiply fractions; lcd; reduce fraction; simplest form; equivalent fractions; adding fractions; equivalent fraction; simplify fraction; fractions to decimals; common denominator; least common denominator; fraction calculator with whole numbers; simplified fraction; mixed fractions; fraction and whole number; calculator fractions; reducing fractions; add fractions; fraction calculator mixed numbers; simplifying fractions; mixed number to decimal; comparing fractions; compare fractions; reduced fraction; fraction simplify; mixed numbers; lowest common denominator; multiply mixed numbers; fraction into decimal; decimals to fractions; adding mixed fractions; calculator with fractions; fraction calculator simplify; fraction multiplication; reduce fractions; calculator for fractions; subtracting fractions; fraction reduction; multiplying mixed numbers; multiplying fractions; fraction calculator mixed number; inch fraction; negative fraction; converting fractions to decimals; whole number fraction; convert fraction to decimal; whole number and fraction; fraction simplifier; mixed fraction to decimal; percentage to fraction; fraction equivalent; calculator fraction; fraction reduce; fraction calculator with whole number; fraction addition; 3 fraction; mixed number to improper fraction; divide fractions; convert decimal to fraction; fraction reducer; lowest terms; division fraction; lowest term; simplify fractions; 3 mixed fraction; adding fractions with unlike denominators; fraction calculator online; complex fraction; online fraction; fraction whole number; fraction calculator with steps; how to convert fraction to decimal without; ratio to fraction; fraction division; improper fraction to mixed number; fraction calculator division; fractions calculator mixed numbers; fraction to mixed number; multiple fraction; fractions and whole numbers; complex fractions; fractions calculator online; math fraction; which fraction is bigger; google calculator for fractions; calculator mixed numbers; fraction subtraction; simplifying complex fractions; how to put fractions in a; how to do fractions on a; fraction to whole number; improper fractions to mixed numbers; fraction calculator with variables; fraction in lowest terms; adding and subtracting fractions; how to put a fraction in a; fraction calculator app; fractuon; 5/3; subtract fractions; fractional; multiply fraction; math calculator fractions; whole fraction; subtracting mixed numbers; how to do a fraction on a; calculator with fraction; calculator that does fractions; how to use fractions on a; how to write fractions on a; inches to fraction; a fraction; fraction calculator google; how do you do fractions on a; fration; how to make fractions on a; online calculator with fractions; fracton; how to do fractions on; faction |
| time-calculator | Science Calculators > Math Calculators | 114: time; hours; hour; clock; time to decimal; decimal to time; calculator hours; minute; minutes; time calculator minutes; hours and minutes; time calculator hours; hours to decimal; adding time; add time; calculator time; time adding; hour and minute; time calculator add; time addition; time conversion; time decimal; minutes to decimal; time calculator hours and minutes; time calculator minutes and seconds; hour minute; clock time; decimal time; subtract time; time calculator multiply; add hours; time calculator division; time math; times; time calculator to decimal; time converter calculator hours; time subtraction; time converter; minutes to hours; time adder; decimal to hours; total time; time hours; hour calculator time; time add; seconds; add up time; time calculator physics; decimal to minutes; time calculator minutes and hours; hours minutes; minutes and seconds; clock math; time calculator minutes to hours; hours to days; decimal hours; adding hours and minutes; hour to minute; hour time; time calculator free; hours to minutes; minutes and hours; hour to decimal; minute and second; hours and minutes to decimal; tome; hours calculator time; adding minutes; calculator clock; clock duration; hour addition; time to hours; time calculator decimal; minute to decimal; easy time; time calculator between times; decimal to hour; mins to hours; calculator hours and minutes; calculator duration; time duration calculator hours; online time; hours decimal; time hour; minute to hour; minute and hour; hourly calculator time; time calculator clock; time calculator subtract; adding up time; decimal hour; add minutes and seconds; calculator time hours; minutes calculator add; add times; time salad; adding minutes and seconds; how much time; time calculator between hours and minutes; time chart; time.duration; time in; time to minutes; on the clock time duration; add minutes; red time; adding times; add time together; hours between; time calculator app; days to hours; free time; time interval; calculator for time |
| compound-interest-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 87: compound interest formula; compound formula; compound amount; compound interest calculator with inflation; compound interest calculator weekly; compound interest calculator online; compounded annually; compound interest; compounding interest; compound; compounding; compund interest; compound interest rate; compound intrest; investor.gov compound interest; compound growth; interest compound; compounded interest; compound interst; compount interest; simple compound interest; annual compound interest; compound.interest; cumulative interest; calculator compound interest; compound interest retirement; 401k compound interest; compounding growth; compound interest savings; reverse compound interest; retirement interest; savings compound interest; conpound interest; compound interest calculator retirement; investment calculator compound interest; compund; compound interest calculator sbi; interest calculator retirement; compound interest calculator 401k; investment compound interest; compond interest; interest calculator compound; compounding calculator yearly; retirement compound interest; irs compound interest; compound calculator interest; interest compounding; weekly compound interest; compiund interest; calculator for compound interest; roth ira compound interest; nerdwallet compound interest; what is compound interest; online compound interest; stock interest; compound calculator yearly; compoun interest; sec compound interest; stock compound interest; compound interest calculator | investor.gov; compounding interest calculator 401k; compunding interest; compound interest calculators; ci; compund intrest; savings calculator compound interest; compound int; compound rate; compoud interest; invest calculator compound; compound intetest; best compound interest; calculator interest compound; calculator site compound interest; compound interest calculator nerdwallet; savings calculator with compound interest; compound interest savings account; calculator site compound interest; nerdwallet compound; simple and compound interest; compound interest calculator uk; interest calculator nerdwallet; nerd wallet compound interest; yearly compound interest; compound interest 401k; compound interest calculator excel; bankrate compound interest |
| basic-calculator | Science Calculators > Scientific & Graphing Calculators | 72: decimal; sum; expanded form; decimal division; multiplication; division; negative; integers; integer; dividing decimals; addition; negative number; adding decimals; adding integers; standard notation; negative and positive; multiplying decimals; place value; whole number; decimals; adding; least to greatest; decimal multiplication; standard; divide decimals; subtraction; greater than less than; multiply; decimal to whole number; calculator decimal; add; find the product; multiplying integers; multiply decimals; accounting; multiplying and dividing integers; arithmetic; subtracting decimals; difference of perfect squares; greater than or less than; add these numbers; online calculator with tape; dividing; calculator with parentheses; greater or less than; greatest to least; find the sum; comparing decimals; calculator with commas; calculator tape; ascending order; regular; total; calculator with brackets; calculator with negative sign; math calculator google; greater than or equal to; greater than; calculator with tape; calculator simple; online calculator simple; multiplying; simple math; cubing; divide; simple calculator app; math formula; basic calculators; how to put a negative number in a; calculator on line; simple; perfect square |
| percentage-change-calculator | Science Calculators > Math Calculators | 60: percent change; percentage change; percentage increase; percent increase; percentage decrease; % change; increase; increase percentage; percent decrease; price increase; % increase; percent growth; percentage growth; percent gain; percent reduction; percent of change; percent calculator increase; percentage calculator increase; percentage of change; decrease; percentage of increase; percentage reduction; price change; reducing; growth percentage; price increase percentage; percent loss; percent improvement; decrease percentage; percentage gain; rate increase; rate change; percent change in mass; increase decrease; percentage of growth; cost increase; percentage loss; increase calculator percentage; change percentage; net change; change in percentage; premium increase; price decrease; percentage increase decrease; reduction; percentage calculator change; percentage drop; annual increase; sales increase; salary percentage increase; % decrease; salary increase percentage; percent calculator change; percentage increase or decrease; gain; increase and decrease; week over week; omni percentage increase; yearly percentage increase; percent return |
| percentage-calculator | Science Calculators > Math Calculators | 60: percentage; decimal to percent; percent to decimal; fraction to percent; fraction to percentage; percentage of; percent to fraction; decimal to percentage; percentage calculator online; percent of; vote percentage; percentage to decimal; percent proportion; percentages; online percentage; percent; percentage of a number; precentage; percentage calculator between two numbers; percentage calculator formula; percent of a number; the percent; percent of total; calculator percentage; omni percentage; percentage calculator money; % of; percent of number; price percentage; the percentage; percentage of total; percetage; pecentage; what percent; percentage calculators; percent calculator money; is of; google percent; convert to percentage; average calculator percentage; percentage rate; percetnage; percentage of number; what percentage; how to calculate percentage with; online percent; google percentage; percentage tax; percebtage; how to calculate percentage on; calculator for percentages; how to calculate percentage in; calculator percent; money percentage; how to do percentages on; calculator with percentage; free percentage; add percentage; find percentage; 3 way percentage |
| investment-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 57: investment calculator with inflation; investment; investing; investment interest; investment calculator over time; monthly investment; interest calculator investment; invest; investor; appreciation; brokerage account; simple investment; investment account; investment amortization; financial investment; investment income; calculator investment; investment calculators; investment savings; nerdwallet investment; investment calculator compounding; brokerage; investment calculator s&p 500; investment projection; investment plan; investment yield; calculator investing; s&p 500 investment; trust fund; interest investment; investments; invesment; ramit investment; long term investment; investing calculators; investment fund; free investment; calculator investments; inv; online investment; in estment; investmwnt; investment calculator; investement; investment calculator nerdwallet; investment gain; investmenr; investment calculator bankrate; investmebt; imvestment; investmemt; nerd wallet investment; sp500 investment; s&p 500 calculator investment; s and p 500 investment; investment calculator 401k; bankrate investment |
| slope-calculator | Science Calculators > Math Calculators | 45: slope; slope intercept form; y=mx+b; slope intercept; slope and y intercept; find slope; slope formula; slope of line; point slope form; slope of a line; convert to standard form; point slope; graph the line with slope passing through the point; slope from two points; slope equation; slope finder; graph slope; finding slope; find the slope; finding slope from two points; graph the line with the given point and slope; slope between two points; slope form; slope-intercept form; y = mx + b; line equation from two points; slope calculator from points; slope graph; slope calculator graph; point slope formula; slope point; slope intercept equation; slope and intercept; slope calculator with two points; slope table; find the slope of the line; slope calculator from two points; slope and y-intercept; point-slope form; standard form calculator slope; slope and point; slope intercept formula; point slope equation; intercept form; slope calculator from equation |
| age-calculator | Science Calculators > Math Calculators | 45: age of; age on; age calculator by date of birth; birthday; age calculator on date; age calculator of child; date of birth; age calculator on year; how old am i; age calculator google; age calculator on birthday; dob; age calculator by date of birth free; age calculator excel; birthday calculator age; birthdate; exact age; date of birth calculator year; age calculator online; age calculator date of birth; age calculator based on date of birth; days alive; online age; calculator age; current age; how old was i; age calculator by birthdate; real age; age calculator by birth date; birthdate age; conceived date; how many days have i been alive; age calculator formula; what year was i born; how old will i be; how many days old am i; age in weeks; age calculator birthday; age date; birthday year; age calculator app; age calculator by birthday; birth year; age; how old |
| unit-converter-calculator | Science Calculators > Math Calculators | 42: measurement; gallon; mph; miles per hour; length; newton; metric system; liquid volume; liquid; gallons; newtons; measuring; cm to inches; measurements; volume conversion; imperial; measurement calculator inches; miles per minute; speed conversion; liquid conversion; cm to.inches; pressure conversion; kg to lbs; meters per second; cm; distance conversion; sq in; kg; length conversion; conversion factor; centimeters to inches; lbs to kg; kilograms to pounds; kg to lb; pounds to kilograms; pounds to kg; lb to kg; kilogram to pounds; convert; online conversion; calculator converter; measurement conversion |
| rmd-calculator | Finance Calculators > Retirement Calculators | 39: rmd; rmd calculator 2024; rmd calculator table; rmd calculator 2025; ira rmd; required minimum distribution; ira distribution; minimum required distribution; rmd calculator 2026; rmd calculator by age; minimum distribution; 401k rmd; ira minimum distribution; irs rmd; rmd calculator irs; mrd; rmd age; 401k minimum distribution; ira required minimum distribution; rmd distribution; aarp rmd; minimum ira distribution; calculator for rmd; minimum rmd; required minimum distributions; calculator for required minimum distribution; 2026 rmd; requirement minimum distribution; rmd calculator aarp; tsp rmd; bankrate rmd; rmd calculator schwab; new rmd calculator age 72; future rmd; finra rmd; fidelity rmd; schwab rmd; charles schwab rmd; vanguard rmd |
| square-footage-calculator | House & Garden Calculators > Home Building, Remodel & Cleaning Cost Calculators | 37: square footage; square foot; sqft; sq ft; sq foot; sq footage; square feet; ft to sq ft; room square footage; sf; sq feet; calculator square feet; dimensions; dimension; square footage calculator feet and inches; sqft calculator inches; room square foot; square foot calculator with inches; square feet calculator inches; inches to square feet; square footage calculator with feet and inches; feet to square feet; sq ft calculator with inches; footage; sqft calculator feet and inches; area calculator with feet and inches; sy; sq ft calculator inches; area calculator feet and inches; square feet calculator with inches; wall square footage; square footage calculator app; paint square footage; square foot calculator with feet and inches; surface feet; carpet square footage; cost per square foot |
| long-division-calculator | Science Calculators > Math Calculators | 30: long division; remainder; long division calculator with steps; calculator with remainder; division calculator with remainders; long division calculator with remainders; quotient and remainder; long division calculator with decimals; division with remainder; long; calculator soup long division; division with remainders; division calculator with steps; find the quotient and remainder; long division calculator without remainders; long divison; calculator with remainders; long division calculator with steps decimals; long division steps; division remainder; divide using long division; calculator remainder; find quotient and remainder; calculator long division; division calculator with remainder; long division step by step; calculator for division; calculator division; quotient; find the quotient |
| savings-interest-calculator | Finance Calculators > Savings Calculators | 30: interest calculator savings; savings calculator with interest; bank interest; interest savings; savings calculator interest; interest calculator for savings; calculator interest savings; interest saving; save interest; saving interest; saving calculator interest; calculator savings interest; interest savings account; savings with interest; interest on savings; savings account with interest; savings and interest; interest account; interest calculator for savings account; saving account interest; interest on savings account; savings interest; simple savings interest; bank savings interest; bank account interest; checking account interest; simple interest savings; savings bank interest; savings account interest; interest calculator savings account |
| area-calculator | Science Calculators > Math Calculators | 28: geometry; trapezoid; parallelogram; rectangle; trapezoid area; geometry calculator online; sq; calculator geometry; square inch; rhombus; area of a trapezoid; perimeter of a rectangle; calculator for geometry; parallelogram area; square inches; cross sectional area; area of a square; cross section; area calculator rectangle; shape; area of parallelogram; rectangle area; area of square; length and width; sq inch; rectangle perimeter; area of rectangle; area of a rectangle |
| standard-deviation-calculator | Science Calculators > Statistics & Probability Calculators | 26: variance; standard deviation; sample standard deviation; sd; population standard deviation; population variance; standard deviation calculator using mean; std; sample variance; find the variance; deviation; std dev; stdev; std deviation; how to find standard deviation on; standard deviation formula; online standard deviation; find standard deviation; mean standard deviation; average and standard deviation; standard deviation of the mean; how to find standard deviation; standard deviation on; range rule of thumb; standard deviation calculator with steps; standard deviation calculator symbol |
| feet-and-inches-calculator | Science Calculators > Math Calculators | 26: feet and inches; feet inches; feet; inches; inch; tape measure; feet inch; foot and inch; ruler; feet and inch; inches and feet; ft in; feet to inches; inches to feet; foot inch; ft; ft and in; foot and inches; measuring tape; ft inches; ft and inches; adding feet and inches; ft to inches; inches to feet and inches; decimal to feet and inches; decimal to inches |
| date-calculator | Science Calculators > Math Calculators | 26: date difference; 180 day; work day; workday; calendar date; days in between; 90 days; 180 days; workdays; day time; business calendar; time frame; date calculator difference; online date; 120 day; hours since; time day; calendar calculator days; 60 day calendar; day calendar; calendar calculator between dates; business date; days after; 90 day; 60 days; time date |
| target-heart-rate-calculator | Sports Calculators > Sports Performance Calculators | 25: heart rate zone; hr; heart rate zones; zone 2 heart rate; target heart rate; target heart rate zone; zone 2; heart rate; hr zone; heart rate zone calculator by age; zone 2 cardio; karvonen; zone heart rate; heart zone; hr zones; mhr; cardio zone; zone; heart rate calculator by age; target hr; zone 2 hr; heart rate training zones; zone two heart rate; resting heart rate; max heart rate |
| tip-calculator | Finance Calculators > Budget Calculators > Household & Family Expense Calculators | 25: tip; tip calculator google; ez tip; google tip; tips; tipping; tip percentage; restaurant tip; tio; tip calculator usa; simple tip; tip calculator texas; tip.; calculator tip; online tip; free tip; tip calculator nyc; tip calculator restaurant; tip calculators; tip calculator formula; 20 tip; tip calculator app; easy tip; tip calculator california; tip calculator free |
| rounding-calculator | Science Calculators > Math Calculators | 24: nearest tenth; rounding; round to the nearest hundredth; round; rounding numbers; nearest hundredth; rounding to the nearest hundredth; round to the nearest tenth; rounding decimals; rounding to the nearest tenth; round to the nearest hundred; round to nearest tenth; round number; round numbers; round to the nearest ten thousand; round off; round to the nearest 100; round to the nearest thousand; round up; round whole numbers; round to the nearest whole number; rounding to the nearest whole number; decimal rounding; round to the nearest thousandth |
| work-hours-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 22: work hours; work hour; hours calculator for work; work calculator hours; calculator work hours; calculator for work hours; time calculator for work hours; hour calculator for work; time calculator work hours; work hours calculator with lunch; weekly work hours; works hours; time hours calculator work; work week hour; hours of work; work week hours; work hour calculator with lunch; calculator hour; work.hours; calculator for hours; work hours calculator app; free work hours |
| final-grade-calculator | Jobs & Education Calculators > Grade Calculators | 22: final grade; final exam; final exam grade; finals; finals grade; grade calculator final; final.grade; final test; semester exam; exam average; final calculator grade; final score; final grade calculator college; final geade; finalgrade; report card; what do i need on my final; grade final; final exam calculator grade; final exam score; how much will my grade drop; final |
| exponent-calculator | Science Calculators > Scientific & Graphing Calculators | 22: exponent; square; fraction exponent; squared; fractional exponents; exponents; exponential; negative exponent; exponent fraction; fraction exponents; fraction calculator with exponents; squaring; negative exponents; properties of exponents; powers; power of; to the power; calculator for exponents; calculator with exponents; rational exponents; calculator exponents; multiplying exponents |
| discount-calculator | Finance Calculators | 21: discount; sale price; sales price; discount percentage; discount calculator online; percentage discount; percent discount; original price; markdown; sales discount; omni discount; calculator discount; discount price; sale percentage; coupon; discount percent; price discount; discount calculator with tax; percentage savings; sale; percent savings |
| mean-median-mode-calculator | Science Calculators > Statistics & Probability Calculators | 20: mean median mode; median; mean; sample mean; find the mean; mean median and mode; mean and median; mean median mode range; mode; population mean; mean median mode and range; mean and standard deviation; find median; mean median; median and mean; mean, median mode; midrange; mean mode median; median between two numbers; halfway between two numbers |
| bmi-calculator | Sports Calculators > Sports Performance Calculators | 20: bmi calculator kg; bmi calculator metric; bmi calculator female; bmi calculator kg with age; bmi calculator kg and feet; online bmi; bmi calculator by age and gender; bmi calculator female with age; bmi weight; weight calculator bmi; bmi calculator women; bmi calculator kg cm; bmi calculator cm and kg; bmi female; bmi women; bmi calculator male; bmi index; bmi calculator by age; body mass index; bmi calculator kg and cm |
| savings-calculator | Finance Calculators > Savings Calculators | 20: money saving; save; apr savings; saving money; savings amortization; how much should i be saving; best savings; online savings; calculator savings; future savings; saving; simple saving; savings calculator online; savings calculators; financial savings; basic savings; bank savings; savings; apr calculator savings; simple savings |
| sp500-return-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 20: s and p 500; s&p; $10,000 invested in s&p 500; s&p 500; s&p 500 return; sp500; s and p; spy; s&p 500 index; sp 500; stock market growth; s&p500; s&p 500 calculator return; if i had invested; what if i invested in s&p 500; snp; smp500; snp500; s&p 500 growth; if i invested in the s&p 500 |
| hours-worked-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 18: hours worked; time worked; hours calculator work; hour calculator work; how many hours did i work; calculator hours worked; worked hours; how many hours; hours work; time calculator hours worked; hour work; calculator for hours worked; how many hours i worked; total hours worked; time calculator for hours worked; calculator hours work; how many hours worked; calculator de horas |
| factoring-calculator | Science Calculators > Math Calculators | 17: factor; factoring; complete the square; diamond problem; diamond method; factors; least common factor; common factor; x method factoring; x method; diamond calculator math; factorize; factor out; factorise; product of linear factors; factorising; online factoring |
| simple-interest-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 17: simple interest; simple interest rate; interest over time; simple interest calculator days; simple intrest; simple interest formula; yearly interest; per annum interest; daily simple interest; simple interest calculator payment; simple daily interest; intrest; interest return; interest calculators; online interest; interst; maturity value |
| series-ee-bond-calculator | Finance Calculators > Investment Calculators > Bond & Fixed Income Calculators | 17: savings bond; ee bond; us savings bond; savings bonds; series ee savings bond; saving bond; patriot bond; us savings bonds; us treasury savings bond; savings bond maturity; ee savings bond; ee bonds; patriot bond value; series ee bond; savings bond calculator series ee; savings bond value; saving bonds |
| pace-calculator | Sports Calculators > Running Calculators | 16: mile pace; running speed; mile time; pace per mile; average pace; running time; run speed; speed to pace; minute per mile; mph calculator running; pace calculator 5k; minute mile; pace time; minutes per mile; pace conversion; pace running |
| conception-date-calculator | Health Calculators > Pregnancy & Fertility Calculators | 16: conception date; when did i get pregnant exactly; accurate conception; reverse due date; conception date calculator based on birthday; date of conception; pregnancy conception; when did i conceive; reverse conception; conceived; conceive date; pregnancy calculator conception; who got me pregnant; conception calculator based on birthday; when did i get pregnant; conception to birth |
| average-calculator | Science Calculators > Statistics & Probability Calculators | 15: average; average value; find the average; averages; average number; number average; averaging; percentage average; calculator average; average of numbers; middle number; online average; find average; finding the average; avg |
| combination-calculator | Science Calculators > Statistics & Probability Calculators | 15: combination; ncr; permutation; combinations; permutations; combination formula; npr; n choose k; combinatorics; choose; permutation and combination; how many possible combinations; possible combinations; permutations and combinations; combination and permutation |
| speed-distance-time-calculator | Science Calculators > Physics Calculators | 15: speed; speed distance time; time distance; distance time; time distance speed; distance traveled; speed time distance; speed distance and time; speed time; distance speed time; time and distance; speed calculator mph; speed and distance; speed distance; distance time speed |
| euclidean-algorithm-calculator | Science Calculators > Math Calculators | 14: lcm; gcf; greatest common factor; multiples; gcd; least common multiple; common multiple; multiple; hcf; gcf factoring; factoring gcf; factor out the gcf; lcm and gcf; gcf and lcm |
| circle-calculator | Science Calculators > Math Calculators | 14: circle; circle area; circle radius; radius of a circle; area of circle; area calculator circle; area of a circle; radius of circle; diameter of a circle; circumference of a circle; circle circumference; area circle; circle diameter; diameter to area |
| quadratic-formula-calculator | Science Calculators > Math Calculators | 13: quadratic formula; quadratic equation; quadratic; quadratic function; solve quadratic equation; quadratic formula calculator with steps; discriminant; solving quadratic equations; quadratic function in standard form; solving quadratics; find the discriminant; quadratic factor; quadratic factoring |
| money-counter-calculator | Finance Calculators > Budget Calculators > Money-Saving & Spending Calculators | 13: money; coin; money counter; cash; calculator money; till; calculator for money; adding money; money calculator online; coins; register; money calculator google; cash register |
| construction-calculator | Business & Industrial Calculators > Construction Materials & Estimating Calculators | 13: construction; construction calculator online; online construction; carpenter; architectural; construction calculators; construction calculator online free; calculator construction; carpentry; free construction; carpenter calculator online free; contractor; contractors |
| cubic-feet-calculator | House & Garden Calculators > Home Building, Remodel & Cleaning Cost Calculators | 13: cubic feet; cubic ft; cu ft; cubic footage; cubic; cubic foot; cf; cubic square feet; cuft; cubic feet to yards; cubic in; cu in; cubic volume |
| kelvin-fahrenheit-converter | Science Calculators > Earth, Weather & Environment Calculators | 13: temperature; temperature conversion; celsius to fahrenheit; fahrenheit to celsius; c to f; celsius; f to c; temp; celsius to fahrenheit chart; centigrade to fahrenheit; temp conversion; how to convert celsius to fahrenheit without; convert celsius to fahrenheit |
| descriptive-statistics-calculator | Science Calculators > Statistics & Probability Calculators | 12: statistics; stats; descriptive statistics; stat; statistic; statistical; statistics calculator online; statistics calculators; data set; online statistics; calculator for statistics; best calculator for statistics |
| ratio-calculator | Science Calculators > Math Calculators | 12: ratio; equivalent ratios; equivalent ratio; ratio table; cross multiply; ratios; proportional relationship; ratio and proportion; simplify ratio; 1:2 ratio; 3 ratio; proportional |
| margin-calculator | Finance Calculators | 12: margin; gross margin; retail margin; cost margin; margins; price margin; sales margin; gp margin; calculator margin; product margin; cost sell margin; margin calculator formula |
| square-root-calculator | Science Calculators > Math Calculators | 12: square root; simplify square root; simplifying square roots; sqrt; how to do square root on; square root calculator simplify; square root calculator with steps; solve by taking square roots; square roots; how to find square root on; calculator with square root; calculator square root |
| monthly-interest-calculator | Finance Calculators > Interest Rate Calculators | 12: monthly interest; saving account interest calculator monthly; monthly interest rate; monthly interest calculator savings; monthly savings interest; savings account interest calculator monthly; money market interest calculator monthly; monthly.interest; interest per month; monthly savings account interest; savings interest calculator monthly; interest calculator monthly |
| savings-goal-calculator | Finance Calculators > Savings Calculators | 12: savings goal; savings calculator goal; savings plan; saving goal; saving calculator goal; financial goal; how much to save per month; goal; save money; how much can i save; how much should i save per paycheck; how much to save per month calculator based on salary |
| retirement-calculator | Finance Calculators > Retirement Calculators | 12: retirement growth; best free retirement; free retirement; retirement estimate; financial retirement; government retirement; retirement calculator usa; retirement income calculator with social security; retirement planning calculators; calculators for retirement; financial calculator retirement; good retirement |
| cubic-yard-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 11: cubic yard; yardage; yard; cubic yards; cu yd; cu yard; yards; cubic yardage; cubic formula; cubic feet to cubic yards; sy to cy |
| distance-formula-calculator | Science Calculators > Math Calculators | 11: midpoint; midpoint formula; distance between two points; distance between points; point distance; line segment; mid point; euclidean distance; missing coordinate; find the distance between two points; midpoint method |
| weighted-grade-calculator | Jobs & Education Calculators > Grade Calculators | 11: weighted grade; grade weight; grade calculator with weights; grade calculator weighted; weighted; grade calculator with weight; weighted grades; average calculator grade; class average; college class grade; current grade |
| pythagorean-theorem-calculator | Science Calculators > Math Calculators | 11: pythagorean theorem; pythagorean; hypotenuse; pythagorean theorem calculator angle; pythagoras; pythag; pythagoras theorem; pythagorean theorem calculator find a; pythagorean theorem calculator find b; pythagorean theorem calculator find c; find hypotenuse |
| markup-calculator | Finance Calculators | 11: mark up; retail markup; omni markup; retail; retail price; markup price; price markup; uplift; upcharge; 40 markup; plus tax |
| volume-calculator | Science Calculators > Math Calculators | 10: volume; tank volume; cube; tank volume calculator gallons; triangular prism; triangular prism volume; capacity; triangle volume; volume of a triangular prism; volume of cube |
| significant-figures-calculator | Science Calculators > Scientific & Graphing Calculators | 10: sig fig; sigfig; significant figures; significant digits; sig figs; significant figure; rounding sig figs; 3 significant figures; significant; how many sig figs |
| interest-rate-calculator | Finance Calculators > Interest Rate Calculators | 10: find interest rate; interest formula; interest rate; annual interest rate; interest rates; annual interest; rate of interest; intrest rate; calculator interest rate; reverse interest |
| compound-investment-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 10: compound growth rate; compound investment; compound interest investment; compound return; compounding calculator investment; investment compound; compounding investment; investment calculator compound; investment compounding; compounded growth |
| daily-compound-interest-calculator | Finance Calculators > Interest Rate Calculators | 10: daily compound interest; compound daily; daily compounding interest; daily compound; compound interest calculator daily; compounded daily; interest compounded daily; daily compounding; compound interest daily; compound calculator daily |
| finance-calculator | Finance Calculators > Interest Rate Calculators | 10: financial; financial calculator online; finance calculator online; calculator finance; online finance; free finance calculator online; personal finance; calculator financial; calculator for finance; finance calculators |
| stock-return-calculator | Finance Calculators > Investment Calculators > Stock & Options Calculators | 10: stock market; stock growth; stock market return; stock calculator over time; stock calculator return; stock market calculator over time; stock estimate; stock increase; market return; capital gains yield |
| savings-interest-rate-calculator | Finance Calculators > Savings Calculators | 10: savings interest rate; savings account interest rates; savings account interest rate; interest rate savings; interest rates calculator savings; savings account rate; interest rate calculator savings; interest rate calculator savings account; interest savings rate; saving interest rate |
| quartile-calculator | Science Calculators > Statistics & Probability Calculators | 9: iqr; interquartile range; quartile; interquartile; quartiles; five number summary; third quartile; first quartile; q1 and q3 |
| year-over-year-growth-calculator | Finance Calculators | 9: growth; yoy growth; year over year growth; year over year; yoy increase; % growth; rate of growth; annual growth; financial growth |
| soil-dirt-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 9: dirt; dirt calculator cubic yards; dirt calculator yards; dirt volume; yards of dirt; dirt yardage; dirt yard; fill; soil volume |
| investment-return-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 9: investment return; return; annual return; annual rate of return; returns; expected return; investment rate of return; investment returns; annualized return |
| retirement-savings-calculator | Finance Calculators > Retirement Calculators | 9: saving retirement; retirement saving; retirement account growth; retirement calculator with interest; savings calculator retirement; savings calculator for retirement; save retirement; saving calculator for retirement; savings retirement |
| prime-factorization-calculator | Science Calculators > Math Calculators | 8: prime factorization; prime factor; prime number; prime factors; factorization; prime; factor tree; integer factorization |
| square-feet-lot-size-calculator | Real Estate Calculators > Land, Construction & Building Cost Calculators | 8: acres; lot size to acres; feet to acres; square feet to acres; sqft to acre; sq ft to acre; square feet to acre; square foot to acre |
| teacher-grading-calculator | Jobs & Education Calculators > Grade Calculators | 8: average score; test average; extra credit; what is my grade; score average; grade after test; grade calculator points; amazing grade |
| financial-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 8: time value of money; financial planning; financial calculator online free; free financial; financial planning calculators; online financial calculators; time value money; time value |
| etf-investment-calculator | Finance Calculators > Investment Calculators > Fund & ETF Calculators | 8: index fund; etf; etf calculator return; index funds; index fund growth; etf growth; index fund investment; index fund return |
| inherited-ira-rmd-calculator | Finance Calculators > Retirement Calculators | 8: beneficiary ira rmd; rmd calculator for inherited ira; schwab inherited ira rmd; rmd inherited ira; inherited ira minimum distribution; inherited ira rmd calculator vanguard; vanguard inherited ira rmd; rmd for inherited ira |
| percent-difference-calculator | Science Calculators > Statistics & Probability Calculators | 7: percent difference; percentage difference; difference; % difference; percentage calculator difference; price difference; difference percentage |
| scientific-notation-calculator | Science Calculators > Scientific & Graphing Calculators | 7: scientific notation; standard form; exponential notation; write in scientific notation; calculator scientific notation; engineering notation; how to do scientific notation on |
| aspect-ratio-calculator | Shopping Calculators > Electronics, Energy & Tech Calculators | 7: aspect ratio; image ratio; 16:9; screen ratio; 16x9; image aspect ratio; 16:9 aspect ratio |
| water-volume-calculator | House & Garden Calculators > Pool, Pond & Water Calculators | 7: water volume; tank; volume calculator gallons; tank size; water tank volume; volume of water; gallon volume |
| gas-mileage-calculator | Finance Calculators > Car & Vehicle Cost Calculators > Car Ownership, Fuel & EV Cost Calculators | 7: gas mileage; miles per gallon; mpg; fuel mileage; mile per gallon; fuel efficiency; fuel economy |
| future-salary-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 7: salary inflation; inflation salary; income inflation; inflation wage; inflation calculator salary; hourly wage inflation; future salary |
| volume-of-cylinder-calculator | Science Calculators > Math Calculators | 7: cylinder; cylinder volume calculator gallons; surface area of a cylinder; volume of a cylinder; cylinder surface area; surface area of cylinder; volume calculator cylinder |
| margin-vs-markup-calculator | Finance Calculators | 7: margin markup; margin to markup; markup margin; markup to margin; markup and margin; margin vs markup; markup vs margin |
| evaluate-expression-calculator | Science Calculators > Math Calculators | 7: expression; evaluating expressions; expressions; evaluate each expression; evaluate; evaluate the expression; evaluate expression |
| right-triangle-calculator | Science Calculators > Math Calculators | 7: a2 + b2 = c2; a2+b2=c2; right triangle length; triangle calculator right angle; right triangle side; right triangle area; area of a right triangle |
| sales-tax-calculator | Finance Calculators > Tax Calculators | 7: tax calculator sales; add tax; 8.25 tax; sales tax calculator online; 7 sales tax; tax amount; calculator that adds tax |
| roi-calculator | Finance Calculators | 7: simple roi; return on investment; investment roi; roi investment; return of investment; ror; website roi |
| interest-calculator | Finance Calculators > Interest Rate Calculators | 7: interest; interest accrual; accrued interest; calculator interest; total interest; principal interest; accumulated interest |
| investment-growth-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 7: investment growth; money growth; wealth; growth calculator investment; growth of investment; calculator investment growth; wealth growth |
| bond-price-calculator | Finance Calculators > Investment Calculators > Bond & Fixed Income Calculators | 7: bond; treasury bond; us treasury bond; us bond; bond value; bond calculator online; bond investment |
| stock-investment-calculator | Finance Calculators > Investment Calculators > Stock & Options Calculators | 7: stock investment; investment portfolio; portfolio; portfolio growth; stock market investment; stock portfolio; calculator stock |
| mutual-fund-calculator | Finance Calculators > Investment Calculators > Fund & ETF Calculators | 7: mutual fund investment; mutual funds; mutual fund; mutual fund return; mutual fund growth; mutual fund calculator usa; growth stock mutual fund |
| series-i-bond-calculator | Finance Calculators > Investment Calculators > Bond & Fixed Income Calculators | 7: i bond; ibonds; ibond; series i bond; i bond value; series i savings bond; i bonds |
| retirement-withdrawal-calculator | Finance Calculators > Retirement Calculators | 7: retirement distribution; retirement spend down; savings distribution; spend down; retirement amortization; money last; investment payout |
| high-yield-savings-calculator | Finance Calculators > Savings Calculators | 7: high interest savings account; high yield; high interest; high interest savings; high yeild savings; high yield interest; high yield account |
| nth-root-calculator | Science Calculators > Math Calculators | 6: cube root; cubic root; cubed root; how to find cube root on; how to cube root on; how to do cube root on |
| simplify-calculator | Science Calculators > Math Calculators | 6: simplify; simplified; simplifying; simplification; calculator simplify; simplifier |
| z-score-calculator | Science Calculators > Statistics & Probability Calculators | 6: z score; z-score; z; z value; zscore; z statistic |
| depreciation-calculator | Finance Calculators | 6: straight line depreciation; double declining balance depreciation; depreciation expense; property depreciation; double declining depreciation; depreciation schedule |
| reverse-sales-tax-calculator | Finance Calculators > Tax Calculators | 6: reverse tax; reverse sales tax; sales tax reverse; back out tax; tax reverse; before tax |
| pvifa-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 6: present value of annuity; present value of an annuity; annuity calculator present value; present value calculator annuity; present value annuity; annuity present value |
| volume-of-cone-calculator | Science Calculators > Math Calculators | 6: cone; volume of a cone; cone volume; volume of cone; cone surface area; surface area of cone |
| loan-calculator | Finance Calculators > Loan Calculators > General Loan Calculators | 6: simple loan; basic loan; loan calculator simple; calculator for loan; how much loan can i afford; simple loan calculator free |
| water-tank-capacity-calculator | House & Garden Calculators > Pool, Pond & Water Calculators | 6: tank capacity; tank gallon; fuel tank; gallon calculator tank; fuel tank capacity; tank calculator gallons |
| round-to-nearest-dollar-or-cent-calculator | Finance Calculators | 6: cent; nearest cent; cents; round to the nearest dollar; round to nearest cent; round to the nearest cent |
| radical-equation-calculator | Science Calculators > Math Calculators | 6: radicals; simplify radicals; simplify radical; radical expression; radicand; radical expressions |
| scientific-calculator | Science Calculators > Scientific & Graphing Calculators | 6: e; online calculator scientific; decimal scientific; e on; calculator e; calculator with e |
| compound-interest-with-withdrawals-calculator | Finance Calculators > Interest Rate Calculators | 6: future value calculator with withdrawals; compound interest calculator with withdrawals; investment withdrawal; interest calculator with withdrawals; compound interest withdrawal; compound interest with withdrawals |
| monthly-compound-interest-calculator | Finance Calculators > Interest Rate Calculators | 6: compounded monthly; monthly compound interest; compound interest calculator monthly; monthly compounding interest; compound interest calculator with monthly contributions; compound monthly interest |
| investment-future-value-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 6: future investment; future money; future value of investment; future value investment; investment value; future growth |
| college-savings-goal-calculator | Finance Calculators > Savings Calculators | 6: college savings; college saving; college planning; college fund savings; college savings calculators; fidelity college savings |
| profit-margin-calculator | Finance Calculators | 5: profit margin; gross profit margin; profit margins; margin profit; profit margin percentage |
| velocity-calculator | Science Calculators > Physics Calculators | 5: final velocity; average velocity; velocity; average speed; final speed |
| distance-calculator | Travel Calculators > Distance, Route & Travel Time Calculators | 5: distance formula; miles; distance calculator math; distance calculator geometry; distance calculator running |
| expand-calculator | Science Calculators > Math Calculators | 5: foil; foil method; foiling; multiplying binomials; binomials |
| volume-of-sphere-calculator | Science Calculators > Math Calculators | 5: sphere; volume of sphere; sphere volume; volume of a sphere; sphere surface area |
| mulch-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 5: mulch; mulch calculator yards; how much mulch do i need; mulch coverage; mulch calculator square feet |
| inverse-trig-calculator | Science Calculators > Math Calculators | 5: inverse trig; inverse trig functions; trig functions; tan inverse; trig function |
| regular-polygon-calculator | Science Calculators > Math Calculators | 5: polygon; regular polygon; area of a polygon; polygon area; pentagon |
| loan-interest-calculator | Finance Calculators > Loan Calculators > General Loan Calculators | 5: simple interest loan; simple interest calculator loan; simple loan calculator with interest; how much interest will i pay; interest cost |
| future-value-of-annuity-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 5: future value of annuity; future value annuity; future annuity; value of annuity; annuity value |
| surface-area-calculator | Science Calculators > Math Calculators | 5: surface area; lateral surface area; triangular prism surface area; surface area calculator triangular prism; surface area of a triangular prism |
| rectangular-prism-calculator | Science Calculators > Math Calculators | 5: surface area of prism; volume of a prism; rectangular prism; prism; volume of a rectangle |
| inflation-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 5: wage inflation; inflation calculator cpi; 1970 inflation; 1960 inflation; 1986 inflation |
| probability-calculator | Science Calculators > Statistics & Probability Calculators | 5: percent chance; chance; percentage chance; bingo probability; coin toss probability |
| polynomial-roots-calculator | Science Calculators > Math Calculators | 5: cubic equation; polynomial root; find the roots; roots of a polynomial; cubic function |
| gravel-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 5: cubic yard calculator gravel; yardage calculator gravel; omni gravel; yard calculator for gravel; 57 gravel |
| mortgage-calculator | Real Estate Calculators > Mortgage Calculators > Mortgage Payment, Type & Cost Calculators | 5: mortgage calculator formula; mortgage calculator tax and insurance; mortgage with taxes and insurance; mortgage calculator amortized; mortgage calculator months |
| gpa-calculator | Jobs & Education Calculators > GPA Calculators | 5: gpa calculator 5.0 scale; 5.0 gpa; 5.0 gpa scale; gpa calculator with honors and ap; grade gpa |
| paint-calculator | House & Garden Calculators > Flooring, Tile, Paint & Interior Calculators | 5: paint calculator square feet; paint gallon; paint calculator by square feet; interior paint; wall paint |
| rectangle-diagonal-calculator | Science Calculators > Math Calculators | 5: rectangle diagonal; diagonal of rectangle; diagonal measurement; diagonal of a square; square diagonal |
| daily-interest-calculator | Finance Calculators > Interest Rate Calculators | 5: daily interest; compound daily interest; daily to annual interest rate; daily interest rate; interest per day |
| retirement-investment-return-calculator | Finance Calculators > Retirement Calculators | 5: retirement investment; investment calculator retirement; investment calculator for retirement; investment retirement; investment and retirement |
| interest-earned-calculator | Finance Calculators > Interest Rate Calculators | 5: interest income; interest earned; interest earning; savings income; earned interest |
| fixed-deposit-interest-calculator | Finance Calculators > Savings Calculators | 5: fd; term deposit; deposit interest; fixed deposit interest; fixed deposit |
| money-market-savings-calculator | Finance Calculators > Savings Calculators | 5: money market; money market calculator monthly; money market interest; money market rate; mma |
| savings-goal-timeline-calculator | Finance Calculators > Savings Calculators | 5: millionaire; how to save a million dollars in 10 years; how long will it take to save; million dollar; save a million |
| work-calculator | Science Calculators > Physics Calculators | 4: work; work calculator physics; calculator work; free work |
| discrete-math-calculator | Science Calculators > Math Calculators | 4: mod; modulo; modulus; discrete math |
| molar-mass-calculator | Science Calculators > Chemistry Calculators | 4: molecular weight; formula weight; mw; molar weight |
| salary-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 4: hourly; payroll hourly; pay hour; us salary |
| percent-error-calculator | Science Calculators > Statistics & Probability Calculators | 4: percent error; percent deviation; percentage error; error |
| profit-calculator | Finance Calculators | 4: profit; marginal profit; profit and loss; profit loss |
| product-pricing-calculator | Finance Calculators | 4: price; product pricing; calculator price; product price |
| investment-present-value-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 4: present value; pv; present value of future cash flows; net present value |
| friction-calculator | Science Calculators > Physics Calculators | 4: friction; friction force; coefficient of friction; coefficient of kinetic friction |
| cagr-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 4: cagr; compound annual growth rate; annual growth rate; reverse cagr |
| energy-converter-calculator | Science Calculators > Physics Calculators | 4: joules; energy; joule; energy conversion |
| triangle-calculator | Science Calculators > Math Calculators | 4: isosceles triangle; triangle sum theorem; equilateral triangle; sss triangle |
| nfl-draft-trade-value-calculator | Sports Calculators > Other Sports Calculators | 4: nfl draft trade; draft trade; pick trade; draft pick trade |
| angle-relationships-calculator | Science Calculators > Math Calculators | 4: trapezoid angle; exterior angle theorem; geometry calculator angles; exterior angle |
| room-area-calculator | House & Garden Calculators > Home Building, Remodel & Cleaning Cost Calculators | 4: room size; room area; room; room sq ft |
| pay-raise-percentage-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 4: raise percentage; percentage raise; percent raise; raise increase |
| volume-of-pyramid-calculator | Science Calculators > Math Calculators | 4: pyramid; pyramid volume; volume of a pyramid; volume of pyramid |
| height-converter-calculator | Science Calculators > Math Calculators | 4: height calculator feet to cm; height calculator in cm; height calculator cm to feet; online calculator inches to cm |
| hemisphere-volume-calculator | Science Calculators > Math Calculators | 4: hemisphere; hemisphere volume; volume of hemisphere; volume of a hemisphere |
| floor-plan-area-calculator | House & Garden Calculators > Home Building, Remodel & Cleaning Cost Calculators | 4: total square footage; floor plan; floor plan square footage; home square footage |
| dividend-reinvestment-calculator | Finance Calculators > Investment Calculators > Stock & Options Calculators | 4: reinvestment; compound dividend; dividend compound; savings dividend |
| apy-calculator | Finance Calculators > Savings Calculators | 4: interest yield; simple apy; savings yield; annual yield |
| bond-yield-to-maturity-calculator | Finance Calculators > Investment Calculators > Bond & Fixed Income Calculators | 4: bond maturity; 30 year treasury bond; 10 year treasury bond; 10 year bond |
| monitor-ppi-calculator | Shopping Calculators > Electronics, Energy & Tech Calculators | 3: ppi; pixel density; pixels per inch |
| npv-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 3: npv; discount rate; npv calculator online |
| net-force-calculator | Science Calculators > Physics Calculators | 3: force; net force; forces |
| ideal-gas-law-calculator | Science Calculators > Chemistry Calculators | 3: ideal gas law; pv nrt; pv=nrt |
| military-time-calculator | Science Calculators > Math Calculators | 3: military time; 24 hour; military time clock |
| wavelength-frequency-calculator | Science Calculators > Physics Calculators | 3: wavelength; wave speed; wavelength formula |
| density-calculator | Science Calculators > Chemistry Calculators | 3: density; mass to volume; density conversion |
| effective-interest-rate-calculator | Finance Calculators > Interest Rate Calculators | 3: ear; effective interest rate; effective annual rate |
| dot-product-calculator | Science Calculators > Math Calculators | 3: dot product; vector dot product; inner product |
| gravitational-potential-energy-calculator | Science Calculators > Physics Calculators | 3: potential energy; gravitational potential energy; gpe |
| concrete-calculator | House & Garden Calculators > Concrete, Masonry & Paving Calculators | 3: cy; concrete calculator formula; concrete calculator app |
| spring-calculator | Science Calculators > Mechanical & Structural Engineering Calculators | 3: spring constant; hooke's law; spring force |
| binomial-expansion-calculator | Science Calculators > Math Calculators | 3: pascal's triangle; pascals triangle; pascal triangle |
| continuous-compound-interest-calculator | Finance Calculators > Interest Rate Calculators | 3: continuous compound interest; compounded continuously; compound continuously |
| markup-percentage-calculator | Finance Calculators | 3: markup percentage; percent markup; percentage markup |
| pert-estimate-calculator | Business & Industrial Calculators > HR, Marketing & Business Operations Calculators | 3: pert; pert formula; project |
| law-of-cosines-calculator | Science Calculators > Math Calculators | 3: law of cosine; law of cosines; law of sines and cosines |
| sohcahtoa-calculator | Science Calculators > Math Calculators | 3: trigonometric functions; cosine; sec |
| carpet-calculator | House & Garden Calculators > Flooring, Tile, Paint & Interior Calculators | 3: sq yard; square yards; sq yd |
| cash-flow-calculator | Finance Calculators | 3: cash flow; annual cash flow; cashflow |
| standard-error-calculator | Science Calculators > Statistics & Probability Calculators | 3: sem; standard error of mean; standard error of the mean |
| gross-pay-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 3: gross salary; gross pay; gross wage |
| loan-payment-calculator | Finance Calculators > Loan Calculators > General Loan Calculators | 3: simple payment; loan payment calculator formula; simple loan payment |
| sunrise-sunset-calculator | Science Calculators > Astronomy & Space Calculators | 3: sunrise sunset; sunset; sunrise |
| equation-solver-calculator | Science Calculators > Math Calculators | 3: real number; solve for x and y; variables |
| travel-time-calculator | Travel Calculators > Distance, Route & Travel Time Calculators | 3: travel time; driving time and distance; travel distance |
| real-estate-depreciation-calculator | Real Estate Calculators > Rental Property & Investment Calculators | 3: depreciation calculator rental property; real estate depreciation; rental property depreciation |
| savings-growth-calculator | Finance Calculators > Savings Calculators | 3: savings growth; retirement savings growth; savings account growth |
| ira-growth-calculator | Finance Calculators > Retirement Calculators | 3: ira compound interest; ira investment; ira interest |
| ira-withdrawal-calculator | Finance Calculators > Retirement Calculators | 3: ira withdrawal; ira mandatory withdrawal; ira calculator withdrawal |
| savings-account-calculator | Finance Calculators > Savings Calculators | 3: saving account; savings accounts; calculator savings account |
| stock-profit-calculator | Finance Calculators > Investment Calculators > Stock & Options Calculators | 3: stocks; stock; stock share |
| labor-markup-calculator | Shopping Calculators > Pricing, Markup & Seller Fee Calculators | 2: markup; labor markup |
| percentile-calculator | Science Calculators > Statistics & Probability Calculators | 2: percentile; percentile rank |
| kinetic-energy-calculator | Science Calculators > Physics Calculators | 2: kinetic energy; ke |
| momentum-calculator | Science Calculators > Physics Calculators | 2: momentum; change in momentum |
| weekly-hours-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 2: weekly hours; weekly hour |
| change-calculator | Finance Calculators | 2: change; money change |
| rule-of-72-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 2: rule of 72; rule 72 |
| law-of-sines-calculator | Science Calculators > Math Calculators | 2: law of sines; law of sine |
| sales-percentage-calculator | Finance Calculators | 2: sales; sales percentage |
| average-rate-of-change-calculator | Science Calculators > Math Calculators | 2: rate of change; rate of change formula |
| roman-numeral-calculator | Science Calculators > Math Calculators | 2: roman numeral; roman numerals |
| gross-monthly-income-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 2: gross income; what is my gross income |
| growth-rate-calculator | Finance Calculators > Economics Calculators | 2: growth rate; average growth rate |
| man-hours-calculator | Finance Calculators | 2: labor hours; labor hour |
| topsoil-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 2: topsoil; top soil |
| suvat-calculator | Science Calculators > Physics Calculators | 2: kinematics; kinematic equations |
| net-profit-margin-calculator | Finance Calculators | 2: net profit margin; net margin |
| annuity-investment-calculator | Finance Calculators > Retirement Calculators | 2: ordinary annuity; annuity formula |
| margin-percentage-calculator | Finance Calculators | 2: margin percentage; percent margin |
| rational-irrational-calculator | Science Calculators > Math Calculators | 2: rational numbers; irrational number |
| acceleration-calculator | Science Calculators > Physics Calculators | 2: acceleration calculator physics; acceleration formula |
| coin-flip-probability-calculator | Science Calculators > Statistics & Probability Calculators | 2: coin flip; coin flip probability |
| power-calculator-physics | Science Calculators > Physics Calculators | 2: force calculator physics; power calculator physics |
| walking-speed-calculator | Sports Calculators > Hiking Calculators | 2: walking pace; walking speed |
| fantasy-football-trade-calculator | Sports Calculators > Fantasy Sports Calculators | 2: fantasy football draft pick trade; fantasy draft pick |
| due-date-calculator | Health Calculators > Pregnancy & Fertility Calculators | 2: conception calculator based on due date; conception date calculator based on due date |
| scale-factor-calculator | Science Calculators > Math Calculators | 2: scaling; similar figures |
| gross-profit-calculator | Finance Calculators | 2: gross profit percentage; gross profit rate |
| linear-equation-calculator | Science Calculators > Math Calculators | 2: equations with variables on both sides; standard form equation |
| exterior-paint-calculator | House & Garden Calculators > Flooring, Tile, Paint & Interior Calculators | 2: paint calculator exterior; exterior paint |
| trig-identities-calculator | Science Calculators > Math Calculators | 2: trig calculator online; sine |
| annual-income-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 2: gross earnings; gross income calculator hourly |
| weighted-gpa-calculator | Jobs & Education Calculators > GPA Calculators | 2: gpa calculator honors; gpa calculator with ap and honors |
| stoichiometry-calculator | Science Calculators > Chemistry Calculators | 2: energy calculator chemistry; chemistry conversion |
| algebra-calculator | Science Calculators > Math Calculators | 2: algebra calculators; algebra 1 |
| required-rate-of-return-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 2: rate of return; return rate |
| compound-savings-calculator | Finance Calculators > Savings Calculators | 2: compound savings; savings calculator compound |
| 401k-calculator | Finance Calculators > Retirement Calculators | 2: contribution; 401k compounding |
| compound-interest-with-monthly-contributions-calculator | Finance Calculators > Interest Rate Calculators | 2: if i invest $200 a month for 20 years; if i invest $100 a month for 20 years |
| 401k-growth-calculator | Finance Calculators > Retirement Calculators | 2: 401k interest; 401k calculator for retirement |
| savings-rate-calculator | Finance Calculators > Savings Calculators | 2: savings rate; saving rate |
| compound-interest-with-contributions-calculator | Finance Calculators > Interest Rate Calculators | 2: compound interest calculator with contributions; compound interest calculator with increasing contributions |
| bond-interest-calculator | Finance Calculators > Investment Calculators > Bond & Fixed Income Calculators | 2: bond interest; coupon rate |
| savings-deposit-calculator | Finance Calculators > Savings Calculators | 2: deposit; savings deposit |
| lumpsum-calculator | Finance Calculators > Investment Calculators > Fund & ETF Calculators | 2: lump sum; lump sum investment |
| 529-calculator | Finance Calculators > Savings Calculators | 2: 529 rate of return; 529 interest |
| unit-price-calculator | Shopping Calculators > Discount, Tip & Unit Price Calculators | 1: unit rate |
| impulse-calculator | Science Calculators > Physics Calculators | 1: impulse |
| fibonacci-calculator | Science Calculators > Math Calculators | 1: fibonacci |
| hydrostatic-pressure-calculator | Science Calculators > Mechanical & Structural Engineering Calculators | 1: pressure |
| golden-ratio-calculator | Science Calculators > Math Calculators | 1: golden ratio |
| profit-percentage-calculator | Finance Calculators | 1: profit percentage |
| price-per-acre-calculator | Real Estate Calculators > Land, Construction & Building Cost Calculators | 1: acre |
| diamond-ring-value-calculator | Shopping Calculators > Gold, Silver & Jewelry Calculators | 1: diamond |
| salary-increase-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: salary increase |
| selling-price-calculator | Finance Calculators | 1: selling price |
| units-of-production-depreciation-calculator | Finance Calculators | 1: units of production depreciation |
| direct-variation-calculator | Science Calculators > Math Calculators | 1: variation |
| pricing-calculator | Finance Calculators | 1: pricing |
| net-profit-calculator | Finance Calculators | 1: net profit |
| engine-displacement-calculator | Sports Calculators > Motorsports & Racing Calculators | 1: displacement |
| sales-growth-calculator | Finance Calculators | 1: sales growth |
| board-foot-calculator | House & Garden Calculators > Framing, Drywall, Insulation & Siding Calculators | 1: foot |
| drawer-size-calculator | House & Garden Calculators > Framing, Drywall, Insulation & Siding Calculators | 1: drawer |
| hourly-to-weekly-salary-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: weekly hourly |
| riemann-sum-calculator | Science Calculators > Math Calculators | 1: midpoint rule |
| weekly-salary-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: weekly |
| newtons-second-law-calculator | Science Calculators > Physics Calculators | 1: newton's second law |
| revenue-calculator | Finance Calculators | 1: revenue |
| geometric-sequence-calculator | Science Calculators > Math Calculators | 1: geometric |
| effective-tax-rate-calculator | Finance Calculators > Tax Calculators | 1: effective rate |
| cross-multiplication-calculator | Science Calculators > Math Calculators | 1: cross multiplication |
| factorial-calculator | Science Calculators > Math Calculators | 1: factorial |
| completing-the-square-calculator | Science Calculators > Math Calculators | 1: solve by completing the square |
| checkbook-balance-calculator | Finance Calculators > Budget Calculators > Budgeting Methods & Planning Calculators | 1: checkbook balance |
| road-base-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 1: road base |
| polynomial-calculator | Science Calculators > Math Calculators | 1: polynomial equation |
| batting-average-calculator | Sports Calculators > Baseball & Softball Calculators | 1: batting average |
| adding-machine-calculator | Finance Calculators > Budget Calculators > Budgeting Methods & Planning Calculators | 1: adding machine |
| arithmetic-sequence-calculator | Science Calculators > Math Calculators | 1: fibonacci sequence |
| flooring-calculator | House & Garden Calculators > Flooring, Tile, Paint & Interior Calculators | 1: floor |
| nominal-interest-rate-calculator | Finance Calculators > Interest Rate Calculators | 1: nominal interest rate |
| salary-conversion-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: monthly salary to hourly |
| profitability-ratios-calculator | Finance Calculators | 1: profitability |
| excavation-cost-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 1: excavation |
| dealer-invoice-price-calculator | Finance Calculators > Car & Vehicle Cost Calculators > Car Buying & Selling Calculators | 1: msrp |
| whip-calculator | Sports Calculators > Baseball & Softball Calculators | 1: whip |
| labor-cost-calculator | Business & Industrial Calculators > HR, Marketing & Business Operations Calculators | 1: hourly labor |
| equivalent-salary-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: equivalent |
| mass-energy-equivalence-calculator | Science Calculators > Physics Calculators | 1: e=mc2 |
| revenue-growth-calculator | Finance Calculators | 1: revenue growth |
| image-file-size-calculator | Shopping Calculators > Electronics, Energy & Tech Calculators | 1: image size |
| cost-to-build-calculator | House & Garden Calculators > Home Building, Remodel & Cleaning Cost Calculators | 1: construction calculator free |
| internet-speed-calculator | Shopping Calculators > Electronics, Energy & Tech Calculators | 1: speed test |
| weight-on-other-planets-calculator | Science Calculators > Astronomy & Space Calculators | 1: mass to weight |
| real-estate-area-calculator | Real Estate Calculators > Land, Construction & Building Cost Calculators | 1: acerage |
| linear-feet-to-square-feet-calculator | House & Garden Calculators > Home Building, Remodel & Cleaning Cost Calculators | 1: square feet to feet |
| gross-margin-calculator | Finance Calculators | 1: gross margin percentage |
| mechanical-energy-calculator | Science Calculators > Physics Calculators | 1: energy loss |
| vector-calculator | Science Calculators > Math Calculators | 1: vector multiplication |
| rabbit-gestation-calculator | Pets & Animals Calculators > Pet Age, Growth & Breeding Calculators | 1: rabbit gestation |
| overtime-hours-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: overtime hours |
| growing-annuity-calculator | Finance Calculators > Retirement Calculators | 1: growing annuity |
| parts-markup-calculator | Shopping Calculators > Pricing, Markup & Seller Fee Calculators | 1: parts markup |
| liquidity-ratios-calculator | Finance Calculators | 1: liquidity ratio |
| system-of-equations-calculator | Science Calculators > Math Calculators | 1: addition method |
| engine-rpm-calculator | Sports Calculators > Motorsports & Racing Calculators | 1: car speed |
| concrete-column-calculator | Business & Industrial Calculators > Concrete & Masonry Calculators | 1: concrete column |
| price-per-square-foot-calculator | Real Estate Calculators > Home Value, Equity & Selling Calculators | 1: price per square foot |
| random-number-generator-calculator | Science Calculators > Statistics & Probability Calculators | 1: random number |
| complex-number-calculator | Science Calculators > Math Calculators | 1: powers of i |
| surface-area-to-volume-ratio-calculator | Science Calculators > Biology & Lab Calculators | 1: volume and surface area |
| human-punch-force-calculator | Sports Calculators > Other Sports Calculators | 1: punch |
| livestock-feed-ration-calculator | Business & Industrial Calculators > Agriculture & Livestock Calculators | 1: ration |
| interior-painting-cost-calculator | House & Garden Calculators > Flooring, Tile, Paint & Interior Calculators | 1: painting estimate |
| composite-area-calculator | Science Calculators > Math Calculators | 1: composite figure |
| lawn-top-dressing-calculator | House & Garden Calculators > Lawn, Garden & Tree Calculators | 1: top dressing |
| rent-per-square-foot-calculator | Real Estate Calculators > Rent & Tenant Calculators | 1: price per sq ft |
| auto-loan-calculator | Finance Calculators > Loan Calculators > Auto & Vehicle Loan Calculators | 1: trade in car loan |
| cost-per-unit-calculator | Finance Calculators | 1: unit cost |
| weight-cut-calculator | Sports Calculators > Other Sports Calculators | 1: weight class |
| semester-grade-calculator | Jobs & Education Calculators > Grade Calculators | 1: semester test |
| hourly-to-salary-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: hourly pay to salary |
| personal-loan-calculator | Finance Calculators > Loan Calculators > Personal Loan Calculators | 1: calculator for personal loans |
| car-fuel-cost-calculator | Finance Calculators > Car & Vehicle Cost Calculators > Car Ownership, Fuel & EV Cost Calculators | 1: gas miles |
| triangle-area-calculator | Science Calculators > Math Calculators | 1: sas triangle |
| overtime-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: timesheet calculator with overtime |
| skewness-calculator | Science Calculators > Statistics & Probability Calculators | 1: skewness |
| sand-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 1: sand calculator yards |
| garage-sale-pricing-calculator | Shopping Calculators > Vehicle, Resale & Collectibles Calculators | 1: garage sale pricing |
| dimensional-weight-calculator | Shopping Calculators > Shipping & Moving Cost Calculators | 1: dim |
| byte-calculator | Science Calculators > Computer, Network & IT Calculators | 1: mb |
| combined-gas-law-calculator | Science Calculators > Chemistry Calculators | 1: gas law |
| tax-bracket-calculator | Finance Calculators > Tax Calculators | 1: tax bracket |
| gmi-calculator | Health Calculators > Sleep & Medical Calculators | 1: eag |
| currency-converter | Finance Calculators > Crypto Calculators > Currency Exchange & Forex Calculators | 1: £ to $ |
| contribution-margin-calculator | Finance Calculators | 1: contribution margin |
| gravel-cost-calculator | House & Garden Calculators > Gravel, Soil & Landscaping Calculators | 1: gravel driveway cost |
| aquarium-volume-calculator | Pets & Animals Calculators > Aquarium, Reptile & Small Pet Calculators | 1: aquarium dimensions |
| logarithmic-equation-calculator | Science Calculators > Math Calculators | 1: solving logarithmic equations |
| operating-margin-calculator | Finance Calculators | 1: operating margin |
| ideal-weight-calculator | Sports Calculators > Sports Performance Calculators | 1: body weight |
| era-calculator | Sports Calculators > Baseball & Softball Calculators | 1: era |
| interest-growth-calculator | Finance Calculators > Interest Rate Calculators | 1: interest growth |
| investment-goal-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 1: investment goal |
| roth-ira-calculator | Finance Calculators > Retirement Calculators | 1: compound interest calculator roth ira |
| 401k-withdrawal-calculator | Finance Calculators > Retirement Calculators | 1: 401k distribution |
| balancing-chemical-equations-calculator | Science Calculators > Chemistry Calculators | 1: ionic compound |
| savings-apr-calculator | Finance Calculators > Savings Calculators | 1: savings apr |
| investment-contribution-calculator | Finance Calculators > Investment Calculators > Investment Returns & Planning Calculators | 1: investment calculator with increasing contributions |
| savings-percentage-calculator | Finance Calculators > Savings Calculators | 1: savings percentage |
| retirement-savings-goal-calculator | Finance Calculators > Retirement Calculators | 1: retirement goal |
| ira-calculator | Finance Calculators > Retirement Calculators | 1: investment calculator ira |
| income-growth-calculator | Jobs & Education Calculators > Salary, Income & Career Calculators | 1: income growth |
| crypto-lending-interest-calculator | Finance Calculators > Crypto Calculators > Crypto Staking, DeFi & Mining Calculators | 1: crypto interest |
| simple-vs-compound-interest-calculator | Finance Calculators > Interest Rate Calculators | 1: simple interest vs compound interest |

### Dropped
| Keyword | Reason |
|---|---|
| calculator soup | brand / navigational |
| soup calculator | brand / navigational |
| online calculator | generic, no calculation intent |
| cost calculator | generic, no calculation intent |
| x game calculator | generic |
| calculator that shows work | generic, no calculation intent |
| calculator soup app | brand / navigational |
| reverse calculator | generic, no calculation intent |
| a calculator | generic, no calculation intent |
| copy and paste calculator | generic, no calculation intent |
| good calculator | generic, no calculation intent |
| delta calculator | generic, no calculation intent |
| job calculator | generic, no calculation intent |
| number calculator | generic, no calculation intent |
| formula calculator | generic |
| show your work calculator | generic, no calculation intent |
| giga hours calculator | generic, no calculation intent |
| storage calculator | generic, no calculation intent |
| online calculator free | generic, no calculation intent |
| numbers to words calculator | not a calculation |
| calculator please | generic, no calculation intent |
| best online calculator | generic |
| note calculator | generic, no calculation intent |
| calculator calculator | generic |
| operate a calculator | generic, no calculation intent |
| our calculator | generic, no calculation intent |
| calculator website | generic |
| calculator cost | generic, no calculation intent |
| online calculators | generic |
| dollar calculator | generic, no calculation intent |
| show work calculator | generic, no calculation intent |
| calculator with work shown | generic, no calculation intent |
| course calculator | generic, no calculation intent |
| working calculator | generic, no calculation intent |
| show me my calculator | generic, no calculation intent |
| wave calculator | generic |
| of calculator | generic |
| google calculator online | generic, no calculation intent |
| deal calculator | too generic / ambiguous |
| 10 calculator | generic, no calculation intent |
| runtime calculator | generic, no calculation intent |
| space calculator | generic, no calculation intent |
| open calculator | generic, no calculation intent |
| em calculator | generic, no calculation intent |
| how to turn decimal into fraction on calculator | how-to question about a physical calculator |
| multiplier calculator | generic, no calculation intent |
| demo calculator | generic, no calculation intent |
| on line calculator | generic, no calculation intent |
| in calculator | generic, no calculation intent |
| copy paste calculator | generic, no calculation intent |
| calculators online | generic |
| tolerance calculator | generic, no calculation intent |
| show calculator | generic, no calculation intent |
| show me a calculator | generic, no calculation intent |
| calculator copy and paste | generic, no calculation intent |
| how to use ncr on calculator | generic, no calculation intent |
| 10x10 calculator | generic, no calculation intent |
| i need a calculator | generic, no calculation intent |
| value calculator | generic, no calculation intent |
| plug in calculator | generic, no calculation intent |
| gigi calculator | generic, no calculation intent |
| show me calculator | generic, no calculation intent |
| find calculator | generic, no calculation intent |
| tax free calculator | generic, no calculation intent |
| estimate calculator | generic, no calculation intent |
| top calculator | generic |
| receipt calculator | generic, no calculation intent |
| 24/7 calculator | generic, no calculation intent |
| how to find variance on calculator | how-to question about a physical calculator |
| interactive calculators | generic, no calculation intent |
| memory calculator | generic, no calculation intent |
| 20 calculator | generic, no calculation intent |
| 7th grade calculator | generic, no calculation intent |
| analog calculator | generic, no calculation intent |
| mathematics calculator | generic, no calculation intent |
| 7/11 calculator | generic, no calculation intent |
| 6th grade calculator | generic, no calculation intent |
| calculator porcentaje | non-English duplicate of percentage |
| special calculator | generic, no calculation intent |
| online calculator google | generic, no calculation intent |
| product calculator | generic, no calculation intent |
| phone calculator | generic, no calculation intent |
| calculator for | generic, no calculation intent |
| manual calculator | generic, no calculation intent |
| calculator site | generic |
| character calculator | generic, no calculation intent |
| step by step calculator | generic, no calculation intent |
| card calculator | generic, no calculation intent |
| rate calculator | generic, no calculation intent |
| cumulative calculator | generic, no calculation intent |
| earnings calculator | generic, no calculation intent |
| future calculator | generic, no calculation intent |
| asset calculator | generic, no calculation intent |
| distribution calculator | generic, no calculation intent |
| nerd calculator | brand / navigational |
| index calculator | generic, no calculation intent |
| cost savings calculator | too generic / ambiguous |
| capital one calculator | brand / navigational |

## D. Clean Final List

**Science Calculators → Math Calculators**
- long-multiplication-calculator
- long-addition-subtraction-calculator
- order-of-operations-calculator
- repeating-decimal-to-fraction-calculator

**Finance Calculators → Retirement Calculators**
- passive-income-calculator

## E. Review Notes

- Ambiguous abbreviations, not built: rpd calculator, gm calculator, x factor calculator, min calculator, gp calculator. If one of them is meant (e.g. gm = gross margin, gp = gross profit), it would map to an existing tool.
- Suggested upgrades instead of new tools: a range-rule-of-thumb line on standard-deviation-calculator; a Patriot Bond note on series-ee-bond-calculator.
