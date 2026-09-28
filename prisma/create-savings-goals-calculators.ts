// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Savings Calculators" sub-batch E (Saving for Specific Goals). Part of the
// Savings Calculators tool-list build-out: 60 tools in the source list, 3
// skipped as duplicates (savings-calculator, savings-goal-calculator and
// emergency-fund-calculator already exist in
// create-finance-savings-calculators.ts), 57 built across 6 sub-batches, all
// filed under Finance Calculators > Savings Calculators:
//   create-savings-core-calculators.ts (9 tools)
//   create-savings-schedules-calculators.ts (11 tools)
//   create-savings-accounts-calculators.ts (9 tools)
//   create-savings-withdrawals-emergency-calculators.ts (11 tools)
//   create-savings-goals-calculators.ts (11 tools)
//   create-savings-goal-planning-calculators.ts (6 tools)
//
// See src/lib/calc-engine-savings-goals.ts for the math and for notes on
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-goals-calculators.ts
// or
//   npm run db:create-savings-goals-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "savings-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial advice. Actual " +
  "bank and credit union rates vary and change over time — check your institution's current rate and terms.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "vacation-savings-calculator",
    title: "Vacation Savings Calculator",
    description: "Cost out a vacation — flights, lodging, daily spending and extras — and find how much to save each month and week to pay for it before you go.",
    metaTitle: "Vacation Savings Calculator — Trip Cost & Plan",
    metaDescription: "Free vacation savings calculator. Add up flights, lodging and spending for your trip and see how much to save each month and week before you go.",
    calcInputs: [
      currencyField("flights", "Flights or Travel There and Back", { default: 1200, max: 1000000, step: 50 }),
      currencyField("lodgingPerNight", "Lodging per Night", { default: 150, max: 100000, step: 10 }),
      numberField("nights", "Number of Nights", { default: 7, min: 0, max: 365, step: 1 }),
      currencyField("dailySpending", "Daily Spending (Food, Transport)", { default: 100, max: 100000, step: 10 }),
      currencyField("extras", "Activities and Extras", { default: 400, max: 1000000, step: 50 }),
      currencyField("alreadySaved", "Already Saved", { default: 500, max: 10000000, step: 50 }),
      numberField("monthsUntilTrip", "Months Until the Trip", { default: 8, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Monthly Saving", format: "currency" },
    calcResults: [
      { key: "monthlySaving", label: "Save per Month", format: "currency", highlight: true },
      { key: "tripCost", label: "Total Trip Cost", format: "currency" },
      { key: "stillToSave", label: "Still to Save", format: "currency" },
      { key: "weeklySaving", label: "Save per Week", format: "currency" },
    ],
    instructions:
      "Enter the cost of getting there and back, your nightly lodging rate and number of nights, what you expect to " +
      "spend each day on food and getting around, and anything extra such as tours or tickets. Then add what " +
      "you've saved and how many months are left before you leave.",
    examples:
      "Example: $1,200 of flights, 7 nights at $150, $100 a day for 8 days, and $400 of extras make a $3,450 trip. " +
      "With $500 saved and 8 months to go, save $368.75 a month — about $85.10 a week.",
    assumptions:
      "Daily spending is counted for one more day than the number of nights, since you spend money on the day you " +
      "travel home too. Interest is ignored over such a short time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How far ahead should I start saving for a vacation?",
        answer: "As soon as you pick the trip. The earlier you start, the smaller each monthly amount — and paying cash means no credit card interest on your holiday.",
      },
    ],
  },
  {
    slug: "travel-savings-calculator",
    title: "Travel Savings Calculator",
    description: "Turn a yearly travel habit — several trips a year — into a steady monthly and per-paycheck amount to set aside, and see what share of your pay it takes.",
    metaTitle: "Travel Savings Calculator — Yearly Travel Budget",
    metaDescription: "Free travel savings calculator. Turn the trips you take each year into a monthly and per-paycheck travel fund, and its share of your pay.",
    calcInputs: [
      numberField("tripsPerYear", "Trips per Year", { default: 3, min: 0, max: 52, step: 1 }),
      currencyField("costPerTrip", "Average Cost per Trip", { default: 1500, max: 1000000, step: 50 }),
      currencyField("monthlyTakeHome", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Monthly Set-Aside", format: "currency" },
    calcResults: [
      { key: "monthlySetAside", label: "Set Aside per Month", format: "currency", highlight: true },
      { key: "annualTravelBudget", label: "Yearly Travel Budget", format: "currency" },
      { key: "perBiweeklyPaycheck", label: "Set Aside per Biweekly Paycheck", format: "currency" },
      { key: "shareOfTakeHomePercent", label: "Share of Take-Home Pay", format: "percentage" },
    ],
    instructions:
      "Enter how many trips you usually take each year, what an average trip costs you, and your monthly take-home " +
      "pay. The tool turns that into a yearly travel budget and a steady amount to move into a travel fund each " +
      "month or each payday, so trips are paid for before you book. For a single trip, use the Vacation Savings " +
      "Calculator instead.",
    examples:
      "Example: 3 trips a year at $1,500 each is a $4,500 travel budget. Set aside $375 a month — or $173.08 from " +
      "each biweekly paycheck — which is 7.5% of $5,000 take-home pay.",
    assumptions:
      "Assumes trip costs stay the same from year to year. Interest on the travel fund is ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I keep a separate travel savings account?",
        answer: "It helps. A dedicated account, ideally high-yield, keeps travel money from mixing with bills and makes it easy to see what you can afford.",
      },
    ],
  },
  {
    slug: "home-down-payment-savings-calculator",
    title: "Home Down Payment Savings Calculator",
    description: "Find out how long it will take to save a down payment and closing costs for a home, allowing for home prices rising while you save.",
    metaTitle: "Home Down Payment Savings Calculator — How Long",
    metaDescription: "Free home down payment savings calculator. See how long it takes to save for a down payment and closing costs as home prices rise.",
    calcInputs: [
      currencyField("homePrice", "Home Price Today", { default: 350000, max: 100000000, step: 5000 }),
      percentField("downPaymentPercent", "Down Payment", { default: 10, max: 100, step: 0.5 }),
      percentField("closingCostPercent", "Closing Costs (% of Price)", { default: 3, max: 10, step: 0.25 }),
      currencyField("currentSavings", "Current Savings", { default: 10000, max: 100000000, step: 500 }),
      currencyField("monthlySaving", "Monthly Saving", { default: 1000, max: 1000000, step: 50 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
      percentField("homePriceGrowthPercent", "Home Price Growth per Year", { default: 3, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Months to Reach Goal", format: "number" },
    calcResults: [
      { key: "monthsToReachGoal", label: "Months to Reach Your Goal (600 = 50+ Years)", format: "number", highlight: true },
      { key: "yearsToReachGoal", label: "Years to Reach Your Goal", format: "number" },
      { key: "cashNeededToday", label: "Cash Needed at Today's Price", format: "currency" },
      { key: "cashNeededWhenReady", label: "Cash Needed When You're Ready", format: "currency" },
      { key: "homePriceWhenReady", label: "Home Price When You're Ready", format: "currency" },
    ],
    instructions:
      "Enter the price of the kind of home you want today, your planned down payment and expected closing costs as " +
      "percentages, your current savings, how much you'll save each month, and your savings APY. Home prices tend " +
      "to rise while you save, so enter a yearly price growth rate — the tool moves the target up each month and " +
      "tells you when your savings catch it.",
    examples:
      "Example: a $350,000 home with 10% down and 3% closing costs needs $45,500 today. With $10,000 saved, $1,000 a " +
      "month at 4% APY, and prices rising 3% a year, you'd get there in 37 months (3.08 years). By then the home " +
      "costs $383,397.69 and you'd need $49,841.70.",
    assumptions:
      "Assumes steady price growth and savings rates. Closing costs vary by state and lender, and a down payment " +
      "under 20% usually means paying private mortgage insurance (PMI). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much should I save for a down payment?",
        answer: "20% avoids private mortgage insurance on a conventional loan, but many buyers put down 3–10%. FHA loans allow 3.5% down. Remember closing costs, often 2–5% of the price, on top.",
      },
    ],
  },
  {
    slug: "house-deposit-savings-calculator",
    title: "House Deposit Savings Calculator",
    description: "Work out how long it will take to save a house deposit and buying costs in the UK, including the 25% government bonus from a Lifetime ISA.",
    metaTitle: "House Deposit Savings Calculator — UK with LISA",
    metaDescription: "Free UK house deposit savings calculator. See how long it takes to save your deposit and buying costs, including the Lifetime ISA bonus.",
    calcInputs: [
      currencyField("propertyPrice", "Property Price", { unit: "£", default: 250000, max: 10000000, step: 5000 }),
      percentField("depositPercent", "Deposit", { default: 10, max: 100, step: 0.5 }),
      currencyField("buyingCosts", "Buying Costs (Stamp Duty, Legal, Survey)", { unit: "£", default: 4000, max: 1000000, step: 250 }),
      currencyField("currentSavings", "Current Savings", { unit: "£", default: 8000, max: 10000000, step: 500 }),
      currencyField("lisaMonthly", "Paid into a Lifetime ISA per Month", { unit: "£", default: 333, max: 10000, step: 10 }),
      currencyField("otherMonthly", "Other Monthly Savings", { unit: "£", default: 300, max: 100000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate on Savings", { default: 4, max: 25, step: 0.05 }),
    ],
    calcResult: { label: "Months to Reach Target", format: "number", currency: "GBP" },
    calcResults: [
      { key: "monthsToReachTarget", label: "Months to Reach Your Target (600 = 50+ Years)", format: "number", currency: "GBP", highlight: true },
      { key: "yearsToReachTarget", label: "Years to Reach Your Target", format: "number", currency: "GBP" },
      { key: "depositAndCostsTarget", label: "Deposit + Buying Costs Target", format: "currency", currency: "GBP" },
      { key: "lifetimeIsaBonusEarned", label: "Lifetime ISA Bonus Earned", format: "currency", currency: "GBP" },
      { key: "lifetimeIsaBonusPerYear", label: "Lifetime ISA Bonus per Year", format: "currency", currency: "GBP" },
    ],
    instructions:
      "Enter the property price, your deposit percentage, and your buying costs — Stamp Duty (in England and " +
      "Northern Ireland; LBTT in Scotland, LTT in Wales), solicitor fees and a survey. Then enter your savings so far " +
      "and how much you save each month, splitting out what goes into a Lifetime ISA. The government adds 25% to " +
      "Lifetime ISA payments of up to £4,000 a year (up to £1,000 bonus), which the tool adds to your savings each " +
      "month.",
    examples:
      "Example: a 10% deposit on a £250,000 home plus £4,000 of buying costs is a £29,000 target. With £8,000 saved, " +
      "£333 a month into a Lifetime ISA, £300 a month elsewhere and 4% interest, you'd reach it in 28 months (2.33 " +
      "years). The Lifetime ISA bonus adds £999 a year — £2,331 in total.",
    assumptions:
      "Lifetime ISA rules modeled: 25% bonus on up to £4,000 paid in per tax year, only for a first home costing " +
      "£450,000 or less (above that the tool gives no bonus). You must be 18–39 to open one, and the account must " +
      "be open at least 12 months before you use it to buy. Withdrawing for anything else (except at 60 or in " +
      "terminal illness) costs a 25% penalty. Rules can change — check GOV.UK. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a Lifetime ISA?",
        answer: "A UK savings account for a first home or retirement. You can pay in up to £4,000 each tax year and the government adds a 25% bonus — up to £1,000 a year.",
      },
      {
        question: "How much deposit do I need for a house in the UK?",
        answer: "Most lenders ask for at least 5–10% of the price, and a bigger deposit usually gets you a better mortgage rate. Budget separately for Stamp Duty, legal fees and a survey.",
      },
    ],
  },
  {
    slug: "car-savings-calculator",
    title: "Car Savings Calculator",
    description: "See how long it takes to save up and buy a car outright, and how much loan interest you'd avoid compared with financing it now.",
    metaTitle: "Car Savings Calculator — Save Up vs Finance",
    metaDescription: "Free car savings calculator. See how long it takes to save for a car in cash and how much loan interest you avoid by not financing now.",
    calcInputs: [
      currencyField("carPrice", "Car Price", { default: 25000, max: 10000000, step: 500 }),
      percentField("salesTaxPercent", "Sales Tax", { default: 7, max: 20, step: 0.25 }),
      currencyField("tradeInValue", "Trade-In Value", { default: 4000, max: 10000000, step: 250 }),
      currencyField("currentSavings", "Current Savings for the Car", { default: 6000, max: 10000000, step: 250 }),
      currencyField("monthlySaving", "Monthly Saving", { default: 600, max: 1000000, step: 25 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
      percentField("loanAprPercent", "Car Loan APR (If Financing Now)", { default: 7.5, max: 40, step: 0.05 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 60, min: 12, max: 96, step: 12 }),
    ],
    calcResult: { label: "Months to Save Up", format: "number" },
    calcResults: [
      { key: "monthsToSaveUp", label: "Months to Save Up (600 = 50+ Years)", format: "number", highlight: true },
      { key: "cashPriceNeeded", label: "Cash Needed (Price + Tax − Trade-In)", format: "currency" },
      { key: "loanPaymentIfFinancedNow", label: "Loan Payment If You Financed Now", format: "currency" },
      { key: "interestAvoidedBySaving", label: "Loan Interest You Avoid by Saving", format: "currency" },
    ],
    instructions:
      "Enter the car's price, your sales tax rate, any trade-in value, what you've saved, how much you can save each " +
      "month, and your savings APY. Then enter the APR and term of the loan you'd take if you bought now instead. " +
      "The tool shows how long saving up takes and the interest that waiting saves you.",
    examples:
      "Example: a $25,000 car with 7% sales tax and a $4,000 trade-in needs $22,750 in cash. With $6,000 saved and " +
      "$600 a month at 4% APY, you'd have it in 26 months. Financing the $16,750 balance now at 7.5% for 60 months " +
      "would cost $335.64 a month and $3,388.14 in interest.",
    assumptions:
      "Assumes the car's price stays the same while you save and ignores registration and dealer fees. Sales tax " +
      "rules on trade-ins vary by state. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it better to save up or finance a car?",
        answer: "Paying cash avoids interest entirely, but you wait longer and your current car may cost more to keep running. If you need a car now, a larger down payment and a shorter loan keep the interest down.",
      },
    ],
  },
  {
    slug: "wedding-savings-calculator",
    title: "Wedding Savings Calculator",
    description: "Build a wedding budget from your guest count and main costs, subtract help from family, and see what you and your partner each need to save per month.",
    metaTitle: "Wedding Savings Calculator — Budget & Monthly Plan",
    metaDescription: "Free wedding savings calculator. Build your wedding budget from guests and costs, subtract family help, and see how much to save each month.",
    calcInputs: [
      numberField("guests", "Number of Guests", { default: 100, min: 0, max: 2000, step: 5 }),
      currencyField("costPerGuest", "Catering and Drinks per Guest", { default: 90, max: 10000, step: 5 }),
      currencyField("venue", "Venue", { default: 6000, max: 10000000, step: 250 }),
      currencyField("attireAndRings", "Attire and Rings", { default: 4000, max: 10000000, step: 250 }),
      currencyField("photoAndMusic", "Photography and Music", { default: 4500, max: 10000000, step: 250 }),
      currencyField("otherCosts", "Flowers, Decor and Other Costs", { default: 3000, max: 10000000, step: 250 }),
      currencyField("familyContribution", "Help from Family", { default: 5000, max: 10000000, step: 250 }),
      currencyField("alreadySaved", "Already Saved", { default: 3000, max: 10000000, step: 250 }),
      numberField("monthsUntilWedding", "Months Until the Wedding", { default: 18, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Monthly Saving", format: "currency" },
    calcResults: [
      { key: "monthlySaving", label: "Save per Month (Together)", format: "currency", highlight: true },
      { key: "monthlyPerPartner", label: "Save per Month (Each Partner)", format: "currency" },
      { key: "totalWeddingBudget", label: "Total Wedding Budget", format: "currency" },
      { key: "stillToSave", label: "Still to Save", format: "currency" },
    ],
    instructions:
      "Enter your guest count and the per-guest cost of food and drink, then the main fixed costs: venue, attire " +
      "and rings, photography and music, and everything else. Subtract any help from family and what you've saved, " +
      "and enter the months until the wedding. The tool shows the monthly amount together and split between the " +
      "two of you.",
    examples:
      "Example: 100 guests at $90 each plus a $6,000 venue, $4,000 attire and rings, $4,500 photography and music " +
      "and $3,000 other costs make a $26,500 wedding. After $5,000 from family and $3,000 saved, you need $18,500 in " +
      "18 months: $1,027.78 a month, or $513.89 each.",
    assumptions:
      "Assumes costs don't change and ignores interest. Leave room for tips, fees and last-minute extras. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the biggest wedding cost?",
        answer: "Usually the venue plus catering, which together often make up around half the budget. Trimming the guest list is the quickest way to bring the total down.",
      },
    ],
  },
  {
    slug: "education-savings-calculator",
    title: "Education Savings Calculator",
    description: "Save for school, university or course fees: see what today's fees will cost by the time study starts, and the monthly saving needed to cover them.",
    metaTitle: "Education Savings Calculator — Future Fees Plan",
    metaDescription: "Free education savings calculator. See what today's school or course fees will cost when study starts and the monthly saving to cover them.",
    calcInputs: [
      currencyField("totalFeesToday", "Total Fees at Today's Prices", { default: 40000, max: 100000000, step: 1000 }),
      percentField("feeInflationPercent", "Fee Inflation per Year", { default: 5, max: 20, step: 0.25 }),
      numberField("yearsUntilStart", "Years Until Study Starts", { default: 8, min: 1, max: 25, step: 1 }),
      currencyField("currentSavings", "Current Savings", { default: 5000, max: 100000000, step: 500 }),
      percentField("annualReturnPercent", "Expected Return on Savings", { default: 5, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Monthly Saving Needed", format: "currency" },
    calcResults: [
      { key: "monthlySavingNeeded", label: "Monthly Saving Needed", format: "currency", highlight: true },
      { key: "feesWhenStudyStarts", label: "Fees When Study Starts", format: "currency" },
      { key: "currentSavingsGrowTo", label: "Current Savings Grow To", format: "currency" },
      { key: "totalYouWillDeposit", label: "Total You'll Deposit", format: "currency" },
    ],
    instructions:
      "Enter the total fees for the course, school or degree at today's prices, how fast you expect fees to rise, " +
      "the years until study starts, what you've saved, and the return you expect. The tool inflates the fees to " +
      "the start date and works out a monthly saving that covers them in full by then. For a US college plan with " +
      "financial aid, use the College Savings Goal Calculator.",
    examples:
      "Example: fees of $40,000 today, rising 5% a year, will cost $59,098.22 in 8 years. Your $5,000 grows to " +
      "$7,452.93 at 5%, so you need to save $438.64 a month — $42,109.11 in total.",
    assumptions:
      "Assumes the full cost must be saved before study starts, steady fee inflation, and a steady return. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do education fees rise faster than prices?",
        answer: "Tuition and school fees have often grown faster than general inflation. Using 4–6% a year is a common planning assumption; check the history for the schools you're considering.",
      },
    ],
  },
  {
    slug: "college-savings-goal-calculator",
    title: "College Savings Goal Calculator",
    description: "Set a college savings goal: project the cost of each year of college, subtract expected aid, choose how much to cover, and find the monthly saving needed.",
    metaTitle: "College Savings Goal Calculator — 529 Planner",
    metaDescription: "Free college savings goal calculator. Project future college costs, subtract expected aid, choose a share to cover, and see the monthly savings.",
    calcInputs: [
      currencyField("annualCostToday", "Cost per Year of College Today", { default: 28000, max: 1000000, step: 500 }),
      numberField("yearsUntilCollege", "Years Until College", { default: 10, min: 0, max: 25, step: 1 }),
      numberField("yearsInCollege", "Years in College", { default: 4, min: 1, max: 8, step: 1 }),
      percentField("collegeInflationPercent", "College Cost Inflation per Year", { default: 5, max: 15, step: 0.25 }),
      currencyField("expectedAidPerYear", "Expected Grants and Scholarships per Year (Today's Money)", { default: 5000, max: 1000000, step: 500 }),
      percentField("percentToCover", "Share of Net Cost You Want to Save", { default: 50, max: 100, step: 5 }),
      currencyField("currentBalance", "Current College Savings (e.g. 529)", { default: 8000, max: 100000000, step: 500 }),
      percentField("annualReturnPercent", "Expected Return", { default: 6, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Monthly Saving Needed", format: "currency" },
    calcResults: [
      { key: "monthlySavingNeeded", label: "Monthly Saving Needed", format: "currency", highlight: true },
      { key: "projectedTotalCost", label: "Projected Total Cost of College", format: "currency" },
      { key: "savingsTarget", label: "Your Savings Target", format: "currency" },
      { key: "currentBalanceGrowsTo", label: "Current Savings Grow To", format: "currency" },
    ],
    instructions:
      "Enter today's yearly cost of the college you're considering (tuition, fees, room and board), the years until " +
      "your child starts, how many years they'll study, and how fast college costs rise. Subtract the grants and " +
      "scholarships you expect, then choose what share of the rest you want to have saved — many families aim to " +
      "save part and cover the rest from income or loans.",
    examples:
      "Example: $28,000 a year today, starting in 10 years for 4 years at 5% cost inflation, totals $196,580.70. " +
      "After $5,000 a year of aid, saving 50% of the net cost is an $80,738.50 target. Your $8,000 grows to " +
      "$14,555.17 at 6%, so you need to save $403.85 a month.",
    assumptions:
      "Each year of college is priced at its own future date. The target is treated as needed by the first day of " +
      "college, so growth during the college years is ignored — a cautious assumption. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a 529 plan?",
        answer: "A US tax-advantaged education savings account. Growth is tax-free when used for qualified education costs, and many states give a tax deduction for contributions.",
      },
    ],
  },
  {
    slug: "retirement-savings-goal-calculator",
    title: "Retirement Savings Goal Calculator",
    description: "Work out the retirement nest egg you need for a target income, and the monthly saving that gets you there from where you are today.",
    metaTitle: "Retirement Savings Goal Calculator — Nest Egg",
    metaDescription: "Free retirement savings goal calculator. Find the nest egg your retirement income needs and the monthly saving to reach it by retirement.",
    calcInputs: [
      currencyField("desiredAnnualIncome", "Yearly Retirement Income You Want (Today's Money)", { default: 60000, max: 10000000, step: 1000 }),
      currencyField("otherAnnualIncome", "Pension and Social Security per Year (Today's Money)", { default: 20000, max: 10000000, step: 1000 }),
      percentField("withdrawalRatePercent", "Safe Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
      numberField("yearsToRetirement", "Years Until Retirement", { default: 25, min: 1, max: 60, step: 1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 3, max: 15, step: 0.1 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 50000, max: 100000000, step: 1000 }),
      percentField("annualReturnPercent", "Expected Return Before Retirement", { default: 6, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Monthly Saving Needed", format: "currency" },
    calcResults: [
      { key: "monthlySavingNeeded", label: "Monthly Saving Needed", format: "currency", highlight: true },
      { key: "nestEggNeeded", label: "Nest Egg Needed at Retirement", format: "currency" },
      { key: "incomeGapTodaysMoney", label: "Yearly Income Your Savings Must Provide (Today's Money)", format: "currency" },
      { key: "currentSavingsGrowTo", label: "Current Savings Grow To", format: "currency" },
    ],
    instructions:
      "Enter the yearly income you want in retirement and what you expect from pensions and Social Security, both " +
      "in today's money. Your savings must cover the gap. Choose a withdrawal rate (4% is the classic rule of " +
      "thumb), then add years to retirement, inflation, your current savings and expected return. The tool finds " +
      "the nest egg you need and the monthly saving to build it.",
    examples:
      "Example: wanting $60,000 a year with $20,000 from other sources leaves a $40,000 gap. After 25 years of 3% " +
      "inflation, a 4% withdrawal rate needs a $2,093,777.93 nest egg. Your $50,000 grows to $223,248.49 at 6%, so " +
      "you'd need to save $2,699.20 a month.",
    assumptions:
      "Nest egg = the income gap, inflated to your retirement date, divided by the withdrawal rate. Returns and " +
      "inflation are steady, and taxes are ignored. For projecting what your current plan will give you, use the " +
      "Retirement Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the 4% rule?",
        answer: "A guideline from US research suggesting that withdrawing 4% of your savings in the first year of retirement, then adjusting for inflation, has historically lasted about 30 years. Lower rates are more cautious.",
      },
    ],
  },
  {
    slug: "short-term-savings-goal-calculator",
    title: "Short-Term Savings Goal Calculator",
    description: "Plan a goal you want to reach within a few years — see the monthly, weekly and daily amounts needed, with interest from a savings account.",
    metaTitle: "Short-Term Savings Goal Calculator — Monthly/Weekly",
    metaDescription: "Free short-term savings goal calculator. Find the monthly, weekly and daily amount to reach a goal within a few years, with interest.",
    calcInputs: [
      currencyField("goalAmount", "Goal Amount", { default: 5000, max: 10000000, step: 100 }),
      numberField("months", "Months to Reach It", { default: 12, min: 1, max: 36, step: 1 }),
      currencyField("alreadySaved", "Already Saved", { default: 500, max: 10000000, step: 50 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
    ],
    calcResult: { label: "Monthly Saving", format: "currency" },
    calcResults: [
      { key: "monthlySaving", label: "Save per Month", format: "currency", highlight: true },
      { key: "weeklySaving", label: "Save per Week", format: "currency" },
      { key: "dailySaving", label: "Save per Day", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter a goal you want to reach within the next three years — a new laptop, a move, a course — how many " +
      "months you have, what you've already saved, and the APY of your savings account. The tool breaks the plan " +
      "into monthly, weekly and daily amounts.",
    examples:
      "Example: to turn $500 into $5,000 in 12 months at 4% APY, save $366.66 a month — about $84.61 a week or " +
      "$12.05 a day. Interest adds $100.09.",
    assumptions:
      "Deposits are made at the end of each month; weekly and daily figures are the same yearly total spread " +
      "evenly. Money needed within a few years is best kept in savings, not investments that can fall in value. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts as a short-term savings goal?",
        answer: "Usually anything you'll need within about three years — a holiday, a car repair fund, a move, or a deposit on a rental. Longer goals can take more investment risk.",
      },
    ],
  },
  {
    slug: "long-term-savings-goal-calculator",
    title: "Long-Term Savings Goal Calculator",
    description: "Plan a goal many years away: inflate it to its future cost and find a starting monthly saving that rises each year to reach it.",
    metaTitle: "Long-Term Savings Goal Calculator — Rising Savings",
    metaDescription: "Free long-term savings goal calculator. Inflate a far-off goal to its future cost and find a starting monthly saving that rises each year.",
    calcInputs: [
      currencyField("goalTodaysMoney", "Goal in Today's Money", { default: 100000, max: 100000000, step: 1000 }),
      numberField("years", "Years Until the Goal", { default: 20, min: 1, max: 60, step: 1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 3, max: 15, step: 0.1 }),
      percentField("annualReturnPercent", "Expected Return", { default: 6, max: 20, step: 0.25 }),
      currencyField("currentSavings", "Current Savings", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualIncreasePercent", "Raise Your Saving Each Year By", { default: 3, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Starting Monthly Saving", format: "currency" },
    calcResults: [
      { key: "startingMonthlySaving", label: "Starting Monthly Saving", format: "currency", highlight: true },
      { key: "finalYearMonthlySaving", label: "Monthly Saving in the Final Year", format: "currency" },
      { key: "futureGoal", label: "Goal After Inflation", format: "currency" },
      { key: "totalYouWillDeposit", label: "Total You'll Deposit", format: "currency" },
    ],
    instructions:
      "Enter your goal in today's money, how many years away it is, expected inflation and return, your current " +
      "savings, and how much you'll raise your monthly saving each year. Starting smaller and raising the amount " +
      "each year — as your income grows — makes a long-term goal easier to begin.",
    examples:
      "Example: $100,000 in today's money, 20 years away with 3% inflation, is $180,611.12 in future dollars. With " +
      "$10,000 saved, a 6% return and a 3% yearly raise, start at $251.85 a month, rising to $441.62 in the last " +
      "year. You'd deposit $81,207.32 in total.",
    assumptions:
      "Deposits are made monthly and rise at the start of each year. Returns and inflation are steady; real " +
      "investment returns vary from year to year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why start low and increase each year?",
        answer: "It matches how incomes usually grow. You start saving sooner with a manageable amount instead of waiting until you can afford a larger fixed one.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:setup-finance-categories" first, ` +
        "then re-run this script."
    );
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
