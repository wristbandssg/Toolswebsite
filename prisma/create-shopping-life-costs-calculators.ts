// One-time (but safe to re-run) batch setup script: creates 14 everyday and personal cost tools
// from the user's shopping list (Shopping Calculators > Lifestyle, Party & Wedding Calculators).
// See src/lib/calc-engine-shopping-life-costs.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-life-costs-calculators.ts
// or
//   npm run db:create-shopping-life-costs-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Lifestyle, Party & Wedding Calculators", slug: "lifestyle-party-wedding-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
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
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const TOOLS: ToolDef[] = [
  {
    slug: "fountain-drink-cost-calculator",
    title: "Fountain Drink Cost Calculator",
    description: "See what your fountain soda habit costs per month and per year — price per ounce, the savings from drinking soda at home and whether a refill subscription pays off.",
    metaTitle: "Fountain Drink Cost Calculator — Soda Habit",
    metaDescription: "Free fountain drink cost calculator. Find your soda habit's monthly and yearly cost, price per ounce and savings at home or with a subscription.",
    calcInputs: [
      numberField("drinksPerWeek", "Fountain Drinks per Week", { default: 5, max: 100 }),
      currencyField("pricePerDrink", "Price per Drink", { default: 2.29, max: 20, step: 0.01 }),
      numberField("cupOz", "Cup Size", { unit: "oz", default: 32, min: 8, max: 128, step: 2 }),
      currencyField("twoLiterPrice", "2-Liter Bottle Price (Home)", { default: 2.5, max: 10, step: 0.05 }),
      currencyField("subscriptionMonthly", "Refill Subscription per Month (0 = None)", { default: 0, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "Annual Cost", format: "currency" },
    calcResults: [
      { key: "annualCost", label: "Yearly Cost", format: "currency", highlight: true },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "costPerOz", label: "Cost per Ounce", format: "currency", decimals: 3 },
      { key: "homeAnnualCost", label: "Same Drinks From 2-Liters at Home", format: "currency" },
      { key: "annualSavingsAtHome", label: "Yearly Savings Drinking at Home", format: "currency" },
      { key: "subscriptionSavings", label: "Yearly Savings With the Subscription", format: "currency" },
    ],
    instructions: "Enter how many fountain drinks you buy per week, the price and cup size, the price of a 2-liter at the store and any refill subscription you're considering.",
    examples: "Example: five $2.29 fountain drinks a week cost about $597.00 a year; pouring the same soda from 2-liters at home costs about $185.11.",
    assumptions: "About 40% of a fountain cup is ice, so a 32 oz cup holds roughly 19 oz of soda. Gas station and fast food subscriptions (often $5–$15 a month) pay off if you'd otherwise buy several drinks a week.",
    faq: [
      { question: "How much does a daily soda habit cost?", answer: "A $2.29 fountain drink every day costs about $835 a year." },
      { question: "Are soda subscriptions worth it?", answer: "If you buy more than about 3–5 drinks a month at the same chain, a monthly drink subscription usually saves money." },
    ],
  },
  {
    slug: "coffee-cost-calculator",
    title: "Coffee Cost Calculator",
    description: "Compare the yearly cost of buying coffee at a café with brewing at home — cost per cup, annual savings and what those savings could grow to if invested.",
    metaTitle: "Coffee Cost Calculator — Café vs Home Brew",
    metaDescription: "Free coffee cost calculator. Compare café and home-brewed coffee costs per cup and per year, and see your savings invested over time.",
    calcInputs: [
      numberField("cupsPerDay", "Cups per Day", { default: 1, max: 10, step: 0.5 }),
      numberField("daysPerWeek", "Days per Week", { default: 5, min: 1, max: 7 }),
      currencyField("cafePrice", "Café Price per Drink", { default: 5.5, max: 20, step: 0.05 }),
      currencyField("bagPrice", "Coffee Bag Price", { default: 14, max: 100, step: 0.25 }),
      numberField("bagOz", "Bag Size", { unit: "oz", default: 12, max: 80, step: 1 }),
      numberField("ozPerCup", "Coffee per Cup", { unit: "oz", default: 0.5, max: 2, step: 0.05 }),
      currencyField("extrasPerCup", "Milk, Sugar & Filter per Cup", { default: 0.25, max: 5, step: 0.05, required: false }),
      percentField("returnRate", "Investment Return per Year", { default: 7, max: 15, required: false }),
      numberField("years", "Years", { default: 10, max: 50, required: false }),
    ],
    calcResult: { label: "Annual Savings", format: "currency" },
    calcResults: [
      { key: "annualSavings", label: "Yearly Savings Brewing at Home", format: "currency", highlight: true },
      { key: "annualCafeCost", label: "Yearly Café Cost", format: "currency" },
      { key: "annualHomeCost", label: "Yearly Home-Brew Cost", format: "currency" },
      { key: "homeCostPerCup", label: "Home Cost per Cup", format: "currency" },
      { key: "savingsInvested", label: "Savings Invested Over the Years", format: "currency" },
    ],
    instructions: "Enter how many café drinks you buy and how often, the café price, and your home coffee details — a 12 oz bag makes about 24 cups at 0.5 oz (14 g) each.",
    examples: "Example: one $5.50 café drink each workday costs about $1,433.85 a year; brewing at home costs about $217.25, saving $1,216.60 — about $17,547.91 after 10 years invested at 7%.",
    assumptions: "Year = 52 weeks. Home cost = bag price ÷ bag ounces × ounces per cup + extras. Invested savings assume monthly contributions compounding at the return you enter; returns aren't guaranteed.",
    faq: [
      { question: "How much does a daily coffee habit cost?", answer: "A $5.50 coffee every workday costs about $1,400 a year; every day is about $2,000." },
      { question: "How much does home-brewed coffee cost per cup?", answer: "Usually about $0.50–$1 per cup with good beans, milk and a filter." },
    ],
  },
  {
    slug: "diaper-cost-calculator",
    title: "Diaper Cost Calculator",
    description: "Estimate how many diapers your baby will use until potty training and what they'll cost — with wipes, monthly average and a cloth diaper comparison.",
    metaTitle: "Diaper Cost Calculator — Diapers Until Potty",
    metaDescription: "Free diaper cost calculator. Estimate diapers and wipes until potty training, total and monthly cost, and compare cloth diapers.",
    calcInputs: [
      numberField("ageMonths", "Baby's Current Age", { unit: "months", default: 0, max: 48 }),
      numberField("pottyMonths", "Expected Potty Training Age", { unit: "months", default: 30, min: 12, max: 60 }),
      currencyField("pricePerDiaper", "Price per Disposable Diaper", { default: 0.3, max: 2, step: 0.01 }),
      currencyField("wipesPerChange", "Wipes Cost per Change", { default: 0.04, max: 1, step: 0.01, required: false }),
      currencyField("clothUpfront", "Cloth Diaper Stash (Upfront)", { default: 500, max: 3000, required: false }),
      currencyField("clothLaundryMonthly", "Cloth Laundry Cost per Month", { default: 15, max: 100, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Disposable Diapers + Wipes Cost", format: "currency", highlight: true },
      { key: "diapersNeeded", label: "Diapers Needed", format: "number" },
      { key: "averageMonthlyCost", label: "Average Monthly Cost", format: "currency" },
      { key: "clothAlternativeCost", label: "Cloth Diapering Cost", format: "currency" },
      { key: "clothSavings", label: "Savings With Cloth", format: "currency" },
    ],
    instructions: "Enter your baby's age, when you expect potty training (most children train between 2 and 3), the price per diaper (bulk packs cost less) and wipes, plus cloth diaper costs if you're comparing.",
    examples: "Example: from birth to 30 months, a baby uses about 5,989 diapers — about $2,036.26 with wipes at $0.30 per diaper, or about $1,189.56 with cloth.",
    assumptions: "Diapers per day: about 11 for newborns, 9 from 1–5 months, 7 from 6–11 months and 5–6 after the first birthday. Size-up diapers cost more per diaper. Cloth costs include laundry water, energy and detergent; they rise if you use a diaper service.",
    faq: [
      { question: "How many diapers does a baby use in the first year?", answer: "About 2,500–3,000 diapers in the first year." },
      { question: "Are cloth diapers cheaper?", answer: "Usually — a cloth stash and laundry often cost about half as much as disposables, and less again for a second child." },
    ],
  },
  {
    slug: "cost-per-meal-calculator",
    title: "Cost Per Meal Calculator",
    description: "Work out the cost per serving of a home-cooked recipe and how much you save compared with takeout or delivery — per meal and per year.",
    metaTitle: "Cost Per Meal Calculator — Home vs Takeout",
    metaDescription: "Free cost per meal calculator. Find the cost per serving of a recipe and your savings versus takeout per meal and per year.",
    calcInputs: [
      currencyField("ingredientCost", "Ingredient Cost for the Recipe", { default: 18, max: 1000, step: 0.25 }),
      currencyField("pantryCost", "Pantry Staples Used (Oil, Spices)", { default: 1.5, max: 100, step: 0.25, required: false }),
      numberField("servings", "Servings", { default: 4, min: 1, max: 100 }),
      currencyField("takeoutPrice", "Takeout / Delivery Price per Meal", { default: 16, max: 200, step: 0.25 }),
      numberField("mealsPerWeek", "Meals Cooked per Week", { default: 5, max: 50 }),
    ],
    calcResult: { label: "Cost per Serving", format: "currency" },
    calcResults: [
      { key: "costPerServing", label: "Cost per Serving", format: "currency", highlight: true },
      { key: "savingsPerServing", label: "Savings per Meal vs Takeout", format: "currency" },
      { key: "weeklyHomeCost", label: "Weekly Cost for These Meals", format: "currency" },
      { key: "annualSavingsVsTakeout", label: "Yearly Savings vs Takeout", format: "currency" },
    ],
    instructions: "Add up what you spent on the recipe's ingredients (count only the part you use of large packages), a little for pantry staples, the servings it makes and the takeout price you'd otherwise pay, including fees and tip.",
    examples: "Example: an $18 recipe with $1.50 of pantry staples serving 4 costs $4.88 per serving — $11.13 less than $16 takeout, or about $2,900.29 a year at 5 meals a week.",
    assumptions: "Year = 52 weeks. Delivery apps often add 20–40% to menu prices with fees and tips, so compare against what you actually pay. Batch cooking and using leftovers lower cost per serving further.",
    faq: [
      { question: "How much does a home-cooked meal cost?", answer: "Typically $3–$6 per serving in 2026, versus $12–$20+ for takeout or delivery." },
      { question: "How do I calculate cost per serving?", answer: "Add the cost of every ingredient used, then divide by the number of servings the recipe makes." },
    ],
  },
  {
    slug: "streaming-cost-calculator",
    title: "Streaming Cost Calculator",
    description: "Add up your streaming subscriptions — Netflix, Disney+, Max, Hulu, YouTube TV and more — per month and per year, cost per hour watched and savings versus cable.",
    metaTitle: "Streaming Cost Calculator — Subscriptions Total",
    metaDescription: "Free streaming cost calculator. Add up your subscriptions per month and year, cost per hour watched and savings versus cable TV.",
    calcInputs: [
      currencyField("s1", "Service 1 (e.g., Netflix)", { default: 17.99, max: 200, step: 0.01, required: false }),
      currencyField("s2", "Service 2 (e.g., Disney+ / Hulu)", { default: 10.99, max: 200, step: 0.01, required: false }),
      currencyField("s3", "Service 3 (e.g., Max)", { default: 16.99, max: 200, step: 0.01, required: false }),
      currencyField("s4", "Service 4 (e.g., Prime Video / Peacock)", { default: 8.99, max: 200, step: 0.01, required: false }),
      currencyField("s5", "Service 5 (e.g., Spotify / Apple TV+)", { default: 0, max: 200, step: 0.01, required: false }),
      currencyField("s6", "Service 6 (e.g., YouTube TV / Sling)", { default: 0, max: 200, step: 0.01, required: false }),
      numberField("hoursPerWeek", "Hours Watched per Week", { default: 15, max: 100 }),
      currencyField("cablePrice", "Cable / Satellite Bill to Compare", { default: 110, max: 500, required: false }),
    ],
    calcResult: { label: "Monthly Total", format: "currency" },
    calcResults: [
      { key: "monthlyTotal", label: "Monthly Total", format: "currency", highlight: true },
      { key: "annualTotal", label: "Yearly Total", format: "currency" },
      { key: "costPerHourWatched", label: "Cost per Hour Watched", format: "currency" },
      { key: "savingsVsCable", label: "Yearly Savings vs Cable", format: "currency" },
      { key: "services", label: "Active Services", format: "number" },
    ],
    instructions: "Enter what you actually pay for each service (check your bank statement — prices rise often) and leave unused ones at 0. Add your weekly viewing hours and a cable bill to compare.",
    examples: "Example: four services totaling $54.96 a month cost $659.52 a year — $0.84 per hour at 15 hours a week, and $660.48 less than a $110 cable bill.",
    assumptions: "Default prices are typical 2026 US ad-free or popular tiers; ad-supported plans and bundles cost less. Rotating services month to month (subscribe, binge, cancel) is an easy way to cut costs.",
    faq: [
      { question: "How much do people spend on streaming?", answer: "Many US households pay about $50–$70 a month across several services." },
      { question: "Is streaming cheaper than cable?", answer: "Usually, unless you stack many services and a live TV streaming package, which can match cable prices." },
    ],
  },
  {
    slug: "toilet-paper-paper-towel-calculator",
    title: "Toilet Paper & Paper Towel Calculator",
    description: "Estimate how much toilet paper and paper towels your household uses — rolls per month, packs per year and yearly cost — and compare price per 100 sheets.",
    metaTitle: "Toilet Paper & Paper Towel Calculator",
    metaDescription: "Free toilet paper calculator. Estimate household rolls per month, packs per year and the yearly cost of toilet paper and paper towels.",
    calcInputs: [
      numberField("people", "People in the Household", { default: 3, min: 1, max: 20 }),
      numberField("sheetsPerDay", "Toilet Paper Sheets per Person per Day", { default: 57, min: 10, max: 200 }),
      numberField("sheetsPerRoll", "Sheets per Roll", { default: 264, min: 50, max: 1500 }),
      numberField("packRolls", "Rolls per Pack", { default: 12, min: 1, max: 60 }),
      currencyField("packPrice", "Toilet Paper Pack Price", { default: 14, max: 100, step: 0.25 }),
      numberField("towelRollsPerWeek", "Paper Towel Rolls per Week", { default: 1, max: 20, step: 0.25 }),
      numberField("towelPackRolls", "Paper Towel Rolls per Pack", { default: 6, min: 1, max: 30 }),
      currencyField("towelPackPrice", "Paper Towel Pack Price", { default: 12, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Total Annual Cost", format: "currency" },
    calcResults: [
      { key: "totalAnnualCost", label: "Yearly Cost (Both)", format: "currency", highlight: true },
      { key: "toiletPaperRollsPerMonth", label: "Toilet Paper Rolls per Month", format: "number" },
      { key: "toiletPaperPacksPerYear", label: "Toilet Paper Packs per Year", format: "number" },
      { key: "toiletPaperAnnualCost", label: "Toilet Paper per Year", format: "currency" },
      { key: "paperTowelAnnualCost", label: "Paper Towels per Year", format: "currency" },
      { key: "costPer100Sheets", label: "Toilet Paper Cost per 100 Sheets", format: "currency" },
    ],
    instructions: "Enter household size, sheets per roll from the package (\"double\" and \"mega\" rolls vary widely) and your pack prices. Compare brands using cost per 100 sheets, not per roll.",
    examples: "Example: a 3-person household uses about 19.7 rolls of 264-sheet toilet paper a month and spends about $380.10 a year on toilet paper and paper towels.",
    assumptions: "The average American uses about 57 sheets of toilet paper a day. Roll sizes are inconsistent across brands, so cost per 100 sheets is the fairest comparison. Buying in bulk or store brands often saves 20–40%.",
    faq: [
      { question: "How much toilet paper does a person use per year?", answer: "Roughly 20,000 sheets — about 75–80 standard double rolls." },
      { question: "How do I compare toilet paper prices?", answer: "Divide the pack price by total sheets (rolls × sheets per roll) and compare the cost per 100 sheets." },
    ],
  },
  {
    slug: "vape-to-cigarette-cost-calculator",
    title: "Vape vs Cigarette Cost Calculator",
    description: "Compare the yearly cost of smoking cigarettes with vaping — pods or disposables plus devices — and see your monthly, yearly and five-year savings from switching.",
    metaTitle: "Vape vs Cigarette Cost Calculator — Savings",
    metaDescription: "Free vape vs cigarette cost calculator. Compare yearly smoking and vaping costs and see monthly, yearly and 5-year savings.",
    calcInputs: [
      numberField("cigsPerDay", "Cigarettes per Day", { default: 15, max: 80 }),
      currencyField("packPrice", "Price per Pack (20)", { default: 9, max: 30, step: 0.05 }),
      numberField("podsPerWeek", "Pods / Disposables per Week", { default: 3, max: 50, step: 0.5 }),
      currencyField("podPrice", "Price per Pod / Disposable", { default: 5, max: 40, step: 0.05 }),
      currencyField("devicePerYear", "Devices & Coils per Year", { default: 40, max: 500, required: false }),
    ],
    calcResult: { label: "Annual Savings", format: "currency" },
    calcResults: [
      { key: "annualSavings", label: "Yearly Savings by Switching", format: "currency", highlight: true },
      { key: "annualCigaretteCost", label: "Yearly Cigarette Cost", format: "currency" },
      { key: "annualVapeCost", label: "Yearly Vaping Cost", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "fiveYearSavings", label: "Five-Year Savings", format: "currency" },
    ],
    instructions: "Enter how much you smoke and your local pack price, then your expected vaping use and prices. Quitting nicotine entirely saves the full cigarette cost.",
    examples: "Example: 15 cigarettes a day at $9 a pack cost about $2,463.75 a year; vaping 3 pods a week costs about $822.10 — saving $1,641.65.",
    assumptions: "Year = 365 days for cigarettes and 52 weeks for pods. Pack prices vary from about $7 to $15+ by state due to taxes. Vaping still delivers nicotine and has health risks; free quit support is available at 1-800-QUIT-NOW in the US.",
    faq: [
      { question: "Is vaping cheaper than smoking?", answer: "Usually — most people switching from a pack a day save $1,500–$3,000 a year, depending on local prices and use." },
      { question: "How much does a pack-a-day habit cost?", answer: "At $9 a pack, about $3,300 a year." },
    ],
  },
  {
    slug: "chewing-tobacco-cost-calculator",
    title: "Chewing Tobacco Cost Calculator",
    description: "Find what chewing tobacco or dip costs you per month, per year and over many years — and what that money could grow to if invested instead.",
    metaTitle: "Chewing Tobacco Cost Calculator — Dip Costs",
    metaDescription: "Free chewing tobacco cost calculator. See what dip costs per month, per year and over time, and what the money could grow to invested.",
    calcInputs: [
      numberField("cansPerWeek", "Cans / Pouches per Week", { default: 3, max: 50, step: 0.5 }),
      currencyField("canPrice", "Price per Can", { default: 6.5, max: 30, step: 0.05 }),
      numberField("years", "Years", { default: 20, max: 60 }),
      percentField("returnRate", "Investment Return per Year", { default: 7, max: 15, required: false }),
    ],
    calcResult: { label: "Annual Cost", format: "currency" },
    calcResults: [
      { key: "annualCost", label: "Yearly Cost", format: "currency", highlight: true },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "totalOverYears", label: "Total Spent Over the Years", format: "currency" },
      { key: "ifInvestedInstead", label: "If Invested Instead", format: "currency" },
    ],
    instructions: "Enter how many cans you use a week, the price per can and the number of years, plus an investment return to see what the money could become.",
    examples: "Example: 3 cans a week at $6.50 cost about $1,016.73 a year — $20,334.60 over 20 years, or about $44,136.81 if invested at 7%.",
    assumptions: "Year = 52 weeks; prices are held constant (in reality tobacco taxes tend to rise). Investment growth assumes monthly contributions compounding at the rate you enter. Free help quitting: 1-800-QUIT-NOW in the US.",
    faq: [
      { question: "How much does dipping cost per year?", answer: "A can every other day at $6.50 costs about $1,200 a year; a can a day about $2,400." },
      { question: "Is chewing tobacco cheaper than cigarettes?", answer: "Often slightly, depending on use and state taxes, but both cost thousands over the years." },
    ],
  },
  {
    slug: "clothing-budget-calculator",
    title: "Clothing Budget Calculator",
    description: "Set a clothing budget from your take-home pay — monthly and yearly — and split it fairly between adults and children in your household.",
    metaTitle: "Clothing Budget Calculator — Monthly Budget",
    metaDescription: "Free clothing budget calculator. Set a monthly and yearly clothing budget from take-home pay and split it between adults and kids.",
    calcInputs: [
      currencyField("takeHomeMonthly", "Monthly Take-Home Pay", { default: 5000, max: 1000000, step: 50 }),
      percentField("percent", "Share for Clothing", { default: 5, max: 15, step: 0.5 }),
      numberField("adults", "Adults", { default: 2, max: 10 }),
      numberField("kids", "Children", { default: 1, max: 10, required: false }),
    ],
    calcResult: { label: "Monthly Budget", format: "currency" },
    calcResults: [
      { key: "monthlyBudget", label: "Monthly Clothing Budget", format: "currency", highlight: true },
      { key: "annualBudget", label: "Yearly Clothing Budget", format: "currency" },
      { key: "perAdultAnnual", label: "Per Adult per Year", format: "currency" },
      { key: "perChildAnnual", label: "Per Child per Year", format: "currency" },
    ],
    instructions: "Enter your household's monthly take-home pay and the share you want for clothing and shoes (3–5% is a common guideline), plus how many adults and kids it covers.",
    examples: "Example: 5% of $5,000 a month is $250.00 — $3,000.00 a year, or about $1,111.11 per adult and $777.78 per child.",
    assumptions: "Children are weighted at 70% of an adult, though growing kids may need more frequent replacements. US households spend about 3% of income on apparel on average. Seasonal sales, secondhand and capsule wardrobes stretch the budget.",
    faq: [
      { question: "How much should I spend on clothes?", answer: "A common guideline is 3–5% of take-home pay for clothing and shoes." },
      { question: "How much does the average family spend on clothing?", answer: "US households spend roughly $2,000 a year on apparel and services, according to consumer spending surveys." },
    ],
  },
  {
    slug: "hair-color-cost-calculator",
    title: "Hair Color Cost Calculator",
    description: "Estimate hair color prices at a salon — root touch-up, all-over color, highlights, balayage or color correction — by hair length and salon, with toner, tip and yearly cost.",
    metaTitle: "Hair Color Cost Calculator — Salon Prices",
    metaDescription: "Free hair color cost calculator. Estimate salon prices for highlights, balayage or all-over color by length and salon, with tip and yearly cost.",
    calcInputs: [
      dropdown("service", "Service", [["Root touch-up ($85)", 85], ["All-over single process ($110)", 110], ["Partial highlights ($150)", 150], ["Full highlights ($200)", 200], ["Balayage ($250)", 250], ["Color correction ($400)", 400]], 250),
      dropdown("length", "Hair Length", [["Short", 1], ["Medium", 1.15], ["Long", 1.3], ["Extra long / thick", 1.5]], 1.15),
      dropdown("salonTier", "Salon", [["Budget chain", 0.7], ["Mid-range salon", 1], ["High-end / big-city salon", 1.6]], 1),
      YN("toner", "Toner / Gloss ($40)", 1),
      percentField("tipPercent", "Tip", { default: 20, max: 30 }),
      numberField("visitsPerYear", "Visits per Year", { default: 4, max: 24 }),
    ],
    calcResult: { label: "Cost per Visit", format: "currency" },
    calcResults: [
      { key: "costPerVisit", label: "Cost per Visit (With Tip)", format: "currency", highlight: true },
      { key: "serviceBeforeTip", label: "Service Price Before Tip", format: "currency" },
      { key: "tip", label: "Tip", format: "currency" },
      { key: "annualCost", label: "Yearly Cost", format: "currency" },
      { key: "boxDyeAnnualCost", label: "Box Dye for Comparison (Yearly)", format: "currency" },
    ],
    instructions: "Choose the service, your hair length and type of salon, whether you'll add a toner or gloss, your tip and how often you go.",
    examples: "Example: balayage on medium-length hair at a mid-range salon with a toner and 20% tip costs about $393.00 — $1,572.00 a year at 4 visits.",
    assumptions: "Typical 2026 US salon prices; long, thick hair and big-city salons cost more, and many stylists charge by time. Balayage grows out gracefully, so many people go every 3–4 months; root touch-ups usually every 4–6 weeks.",
    faq: [
      { question: "How much does balayage cost?", answer: "Usually $200–$400 at mid-range salons and $400+ at high-end salons, before tip." },
      { question: "How much should I tip my colorist?", answer: "About 15–20% of the service price, and some also tip the assistant who washes or tones." },
    ],
  },
  {
    slug: "tattoo-price-calculator",
    title: "Tattoo Price Calculator",
    description: "Estimate what a tattoo will cost from its size, style and placement — artist hourly rate, shop minimum, estimated hours and sessions — with the tip.",
    metaTitle: "Tattoo Price Calculator — Cost by Size & Style",
    metaDescription: "Free tattoo price calculator. Estimate tattoo cost by size, style and placement with hourly rate, shop minimum, hours and tip.",
    calcInputs: [
      numberField("widthIn", "Tattoo Width", { unit: "in", default: 4, max: 40, step: 0.5 }),
      numberField("heightIn", "Tattoo Height", { unit: "in", default: 3, max: 40, step: 0.5 }),
      dropdown("style", "Style / Detail", [["Line work / simple", 1], ["Black & gray shading", 1.3], ["Full color", 1.5], ["Realism / portrait", 2]], 1.3),
      dropdown("placement", "Placement", [["Easy (arm, thigh, calf)", 1], ["Tricky (ribs, hands, neck, feet)", 1.25]], 1),
      currencyField("hourlyRate", "Artist Hourly Rate", { default: 150, max: 1000 }),
      currencyField("shopMinimum", "Shop Minimum", { default: 80, max: 500 }),
      percentField("tipPercent", "Tip", { default: 20, max: 30 }),
    ],
    calcResult: { label: "Total With Tip", format: "currency" },
    calcResults: [
      { key: "totalWithTip", label: "Estimated Total With Tip", format: "currency", highlight: true },
      { key: "tattooPrice", label: "Tattoo Price", format: "currency" },
      { key: "estimatedHours", label: "Estimated Hours", format: "number" },
      { key: "tip", label: "Tip", format: "currency" },
      { key: "sessions", label: "Sessions (Up to 5 Hours Each)", format: "number" },
    ],
    instructions: "Enter the approximate size, style and placement, then the artist's hourly rate (often $100–$250+) and the shop minimum. Small flash pieces are often priced flat.",
    examples: "Example: a 4 × 3 in black-and-gray piece on the arm takes about 2.34 hours — about $351.00 at $150/hour, or $421.20 with a 20% tip.",
    assumptions: "Time estimate ≈ 0.15 hours per square inch, scaled by detail and placement — a rough guide; your artist's quote is what counts. Large pieces are split into sessions. Touch-ups are often free within the first months.",
    faq: [
      { question: "How much does a small tattoo cost?", answer: "Usually $80–$250, often the shop minimum for simple designs." },
      { question: "How much should I tip a tattoo artist?", answer: "About 15–25% of the price, paid in cash at the end of each session." },
    ],
  },
  {
    slug: "braces-cost-calculator",
    title: "Braces Cost Calculator",
    description: "Estimate the cost of braces or clear aligners — metal, ceramic, lingual or Invisalign-style — by case complexity, with insurance, retainers, monthly payments and HSA/FSA tax savings.",
    metaTitle: "Braces Cost Calculator — With Insurance",
    metaDescription: "Free braces cost calculator. Estimate metal, ceramic, lingual or clear aligner cost with insurance, retainers and monthly payments.",
    calcInputs: [
      dropdown("bracesType", "Treatment", [["Metal braces ($5,500)", 5500], ["Ceramic braces ($6,500)", 6500], ["Lingual braces ($9,000)", 9000], ["Clear aligners ($6,000)", 6000]], 5500),
      dropdown("severity", "Case Complexity", [["Mild", 0.85], ["Moderate", 1], ["Complex", 1.25]], 1),
      currencyField("retainers", "Retainers After Treatment", { default: 300, max: 3000, required: false }),
      percentField("coveragePercent", "Insurance Orthodontic Coverage", { default: 50, max: 100, required: false }),
      currencyField("lifetimeMax", "Insurance Lifetime Ortho Maximum", { default: 1500, max: 10000, required: false }),
      currencyField("downPayment", "Down Payment", { default: 1000, max: 20000, required: false }),
      numberField("months", "Payment Plan Length", { unit: "months", default: 24, min: 1, max: 60 }),
      percentField("taxRate", "Tax Rate (for HSA/FSA Savings)", { default: 22, max: 50, required: false }),
    ],
    calcResult: { label: "Out of Pocket", format: "currency" },
    calcResults: [
      { key: "outOfPocket", label: "Your Out-of-Pocket Cost", format: "currency", highlight: true },
      { key: "totalCost", label: "Total Treatment Cost", format: "currency" },
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment After Down Payment", format: "currency" },
      { key: "taxSavingsWithHsa", label: "Tax Savings Paying From HSA/FSA", format: "currency" },
    ],
    instructions: "Choose the treatment and complexity, your insurance orthodontic coverage and lifetime maximum (often 50% up to $1,000–$2,000), and the orthodontist's payment plan terms.",
    examples: "Example: moderate metal braces cost about $5,800.00 with retainers; with 50% coverage up to $1,500, you pay $4,300.00 — $137.50 a month over 24 months after a $1,000 down payment.",
    assumptions: "Typical 2026 US prices; city, orthodontist and treatment length vary. Most orthodontists offer interest-free payment plans. Paying with HSA or FSA money avoids income tax on the amount — savings depend on your tax bracket.",
    faq: [
      { question: "How much do braces cost?", answer: "Usually $4,000–$8,000 for metal or ceramic braces and $3,500–$8,000 for clear aligners in the US." },
      { question: "Does dental insurance cover braces?", answer: "Many plans cover 50% of orthodontics up to a lifetime maximum of about $1,000–$2,000, often only for children." },
    ],
  },
  {
    slug: "dental-cost-calculator",
    title: "Dental Cost Calculator",
    description: "Estimate your yearly dental costs — cleanings, fillings, crowns, root canals and extractions — and what you'd pay with insurance after the deductible, coverage levels, annual maximum and premiums.",
    metaTitle: "Dental Cost Calculator — With or Without Insurance",
    metaDescription: "Free dental cost calculator. Estimate yearly dental bills and your cost with insurance after deductible, coverage, annual max and premiums.",
    calcInputs: [
      numberField("cleanings", "Cleanings & Exams per Year", { default: 2, max: 4 }),
      currencyField("cleaningPrice", "Price per Cleaning & Exam", { default: 200, max: 1000 }),
      numberField("fillings", "Fillings ($200 Each)", { default: 1, max: 20 }),
      numberField("crowns", "Crowns ($1,300 Each)", { default: 0, max: 10 }),
      numberField("rootCanals", "Root Canals ($1,100 Each)", { default: 0, max: 10 }),
      numberField("extractions", "Extractions ($250 Each)", { default: 0, max: 10 }),
      currencyField("deductible", "Insurance Deductible", { default: 50, max: 1000 }),
      currencyField("annualMax", "Insurance Annual Maximum", { default: 1500, max: 10000 }),
      currencyField("premiumMonthly", "Insurance Premium per Month", { default: 40, max: 300 }),
    ],
    calcResult: { label: "Your Cost With Insurance", format: "currency" },
    calcResults: [
      { key: "yourCostWithInsurance", label: "Your Yearly Cost With Insurance (Incl. Premiums)", format: "currency", highlight: true },
      { key: "totalDentalBill", label: "Total Dental Bill (No Insurance)", format: "currency" },
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "annualPremiums", label: "Yearly Premiums", format: "currency" },
      { key: "insuranceSaves", label: "Insurance Saves You (Negative = Costs More)", format: "currency" },
    ],
    instructions: "Enter the dental work you expect this year and your plan's deductible, annual maximum and premium. Compare with the no-insurance bill to see whether a plan (or a discount plan) is worth it.",
    examples: "Example: two cleanings and one filling cost $750.00 without insurance; with a typical plan you'd pay $560.00 including premiums.",
    assumptions: "Typical 2026 US prices; x-rays ($150) are added once a year with cleanings. Common 100/80/50 coverage: preventive 100%, basic (fillings, extractions, root canals) 80% and major (crowns) 50% after the deductible, up to the annual maximum. Waiting periods often apply to new plans.",
    faq: [
      { question: "Is dental insurance worth it?", answer: "It often pays off if you need fillings or major work; for cleanings only, premiums can exceed the benefit." },
      { question: "How much is a dental cleaning without insurance?", answer: "Usually about $100–$250 for a cleaning and exam, plus x-rays." },
    ],
  },
  {
    slug: "prescription-glasses-cost-calculator",
    title: "Prescription Glasses Cost Calculator",
    description: "Estimate the cost of prescription glasses — frames, single vision, bifocal or progressive lenses and coatings — plus the eye exam, with and without vision insurance.",
    metaTitle: "Prescription Glasses Cost Calculator",
    metaDescription: "Free prescription glasses cost calculator. Estimate frames, lenses, coatings and the eye exam, with and without vision insurance.",
    calcInputs: [
      dropdown("frames", "Frames", [["Budget online ($25)", 25], ["Retail ($150)", 150], ["Designer ($300)", 300]], 150),
      dropdown("lens", "Lenses", [["Single vision", 0], ["Bifocal", 1], ["Progressive", 2]], 0),
      YN("antiReflective", "Anti-Reflective Coating (+$60)", 1),
      YN("blueLight", "Blue-Light Filter (+$40)", 0),
      YN("photochromic", "Transitions / Photochromic (+$120)", 0),
      YN("highIndex", "High-Index Thin Lenses (+$80)", 0),
      YN("includeExam", "Include Eye Exam ($120)", 1),
      YN("hasInsurance", "Vision Insurance", 1),
      currencyField("frameAllowance", "Insurance Frame Allowance", { default: 150, max: 500, required: false }),
      currencyField("lensCopay", "Lens Copay", { default: 25, max: 200, required: false }),
      currencyField("examCopay", "Exam Copay", { default: 10, max: 100, required: false }),
    ],
    calcResult: { label: "Your Cost", format: "currency" },
    calcResults: [
      { key: "yourCost", label: "Your Cost", format: "currency", highlight: true },
      { key: "costWithoutInsurance", label: "Cost Without Insurance", format: "currency" },
      { key: "framesCost", label: "Frames", format: "currency" },
      { key: "lensesCost", label: "Lenses & Coatings", format: "currency" },
      { key: "insuranceSavings", label: "Insurance Savings", format: "currency" },
    ],
    instructions: "Choose frames, lens type and coatings, whether you need an eye exam, and your vision plan's frame allowance and copays (if you have a plan).",
    examples: "Example: $150 retail frames with single-vision lenses, anti-reflective coating and an exam cost $410.00 without insurance and about $83.00 with a typical vision plan.",
    assumptions: "Typical 2026 US optical prices; online retailers can be far cheaper and warehouse clubs fall in between. With insurance, frames above the allowance are paid by you, lenses cost the copay and lens add-ons get about a 20% discount.",
    faq: [
      { question: "How much do prescription glasses cost?", answer: "About $200–$400 at retail for single-vision glasses with basic coatings, and $500+ with progressives; online pairs can cost under $50." },
      { question: "How often does vision insurance cover new glasses?", answer: "Usually once every 12 or 24 months for frames and lenses, plus a yearly eye exam." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
