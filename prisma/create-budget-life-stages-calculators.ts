// One-time (but safe to re-run) batch setup script: creates the Life Stage & Work tools
// (9) of the Budget Calculators expansion, filed under Budget Calculators >
// Life Events & Travel Budget Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-life-stages.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-life-stages-calculators.ts
// or
//   npm run db:create-budget-life-stages-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Life Events & Travel Budget Calculators", slug: "life-events-travel-budget-calculators" };

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
  "This tool provides general estimates for planning purposes only and isn't financial advice. Your actual " +
  "costs depend on where you live, your prices and your choices — adjust the inputs to your situation.";

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
    slug: "household-moving-budget-calculator",
    title: "Household Moving Budget Calculator",
    description: "Budget a move or job relocation: movers or truck, packing, travel, deposits, overlapping rent and setup costs, less any employer relocation package.",
    metaTitle: "Moving Budget Calculator — Cost to Move & Relocate",
    metaDescription: "Free moving budget calculator. Total movers, packing, travel, deposits and setup costs, subtract a relocation package, and plan your savings.",
    calcInputs: [
      currencyField("movers", "Movers or Truck Rental", { default: 2500, max: 1000000, step: 50 }),
      currencyField("packing", "Packing Supplies", { default: 200, max: 100000, step: 10, required: false }),
      currencyField("travel", "Travel, Gas & Hotels", { default: 400, max: 100000, step: 10, required: false }),
      currencyField("deposits", "Deposits & First Month at the New Place", { default: 2000, max: 1000000, step: 50, required: false }),
      currencyField("overlapHousing", "Overlapping Rent or Mortgage", { default: 0, max: 1000000, step: 50, required: false }),
      currencyField("setup", "Utility Setup, Furniture & Supplies", { default: 500, max: 1000000, step: 50, required: false }),
      currencyField("employerPackage", "Employer Relocation Package", { default: 0, max: 1000000, step: 100, required: false }),
      numberField("monthsToSave", "Months Until the Move", { default: 3, min: 1, max: 24, step: 1 }),
    ],
    calcResult: { label: "Out-of-Pocket Cost", format: "currency" },
    calcResults: [
      { key: "totalMovingCost", label: "Total Moving Cost", format: "currency" },
      { key: "outOfPocketAfterEmployer", label: "Out-of-Pocket Cost", format: "currency", highlight: true },
      { key: "monthlySavingsNeeded", label: "Save per Month", format: "currency" },
    ],
    instructions:
      "Local moves with professional movers often cost $1,000–$2,500; long-distance moves $3,000–$10,000 or more. Don't " +
      "forget deposits and first month's rent at the new place, overlap with your old lease, and replacing things you sell " +
      "or leave behind.\n\n" +
      "For a job relocation, enter the employer's package. Reimbursed moving costs are taxable wages for most employees " +
      "(members of the military excepted).",
    examples:
      "Example: $2,500 for movers plus packing, travel, $2,000 of deposits and $500 of setup costs come to " +
      "$5,600. Saving $1,866.67 a month for 3 months covers the move.",
    assumptions:
      "Costs as entered. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I cut moving costs?",
        answer: "Get three quotes, move mid-month or off-season, declutter before packing (fewer boxes, lower cost), and use free boxes from stores or neighbors.",
      },
    ],
  },
  {
    slug: "first-apartment-budget-calculator",
    title: "First Apartment Budget Calculator",
    description: "Plan your first apartment: the cash you need to move in, your monthly housing cost, your rent as a share of income, and whether you meet landlords' 40x-rent income rule.",
    metaTitle: "First Apartment Budget Calculator — Move-In & 40x Rule",
    metaDescription: "Free first apartment calculator. See move-in cash, monthly housing cost, rent-to-income share and whether you meet the 40x rent rule.",
    calcInputs: [
      currencyField("rent", "Monthly Rent", { default: 1400, max: 100000, step: 25 }),
      currencyField("yearlyIncome", "Yearly Gross Income", { default: 60000, max: 10000000, step: 1000 }),
      numberField("depositMonths", "Security Deposit (Months of Rent)", { default: 1, min: 0, max: 3, step: 0.5 }),
      currencyField("applicationFees", "Application & Broker Fees", { default: 100, max: 100000, step: 10, required: false }),
      currencyField("moving", "Moving Costs", { default: 500, max: 100000, step: 25, required: false }),
      currencyField("furniture", "Furniture & Household Basics", { default: 1500, max: 100000, step: 50, required: false }),
      currencyField("utilities", "Utilities & Internet per Month", { default: 150, max: 10000, step: 5 }),
      currencyField("rentersInsurance", "Renters Insurance per Month", { default: 15, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Move-In Cash Needed", format: "currency" },
    calcResults: [
      { key: "moveInCash", label: "Move-In Cash Needed", format: "currency", highlight: true },
      { key: "monthlyHousingCost", label: "Monthly Housing Cost", format: "currency" },
      { key: "rentToIncomePercent", label: "Rent as % of Gross Income", format: "percentage" },
      { key: "incomeNeededFor40xRule", label: "Income Needed for the 40x Rule", format: "currency" },
      { key: "meets40xRule", label: "Meets the 40x Rule (1 = Yes)", format: "number" },
    ],
    instructions:
      "Moving in usually takes the first month's rent plus a security deposit, fees, moving costs and basics like a bed " +
      "and kitchen items. Many landlords require yearly income of at least 40 times the monthly rent (or a guarantor); " +
      "the 30% rule suggests rent under 30% of gross income.\n\n" +
      "Enter the rent and your income to see what to save and whether you're likely to qualify.",
    examples:
      "Example: a $1,400 apartment needs $4,900 to move in, including first month's rent, the deposit and furniture. With " +
      "utilities and insurance, housing costs $1,565 a month — 28% of a $60,000 income, " +
      "which clears the $56,000 needed under the 40x rule.",
    assumptions:
      "First month plus deposit due at signing; some landlords also ask for last month's rent. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I don't meet the 40x rule?",
        answer: "Options include a guarantor or co-signer, paying a larger deposit where allowed, a roommate, or a lower rent.",
      },
    ],
  },
  {
    slug: "college-student-budget-calculator",
    title: "College Student Budget Calculator",
    description: "Build a semester budget for college: tuition, housing, meals, books and other costs, minus financial aid and part-time job income — and the monthly gap to cover.",
    metaTitle: "College Student Budget Calculator — Semester Costs",
    metaDescription: "Free college student budget calculator. Total semester costs, subtract aid and job income, and see the monthly gap to cover.",
    calcInputs: [
      currencyField("tuition", "Tuition & Fees per Semester", { default: 6000, max: 1000000, step: 100 }),
      currencyField("housing", "Housing per Semester", { default: 4500, max: 1000000, step: 100 }),
      currencyField("mealPlan", "Meal Plan or Food per Semester", { default: 2500, max: 1000000, step: 50 }),
      currencyField("books", "Books & Supplies per Semester", { default: 600, max: 100000, step: 25, required: false }),
      currencyField("other", "Transportation, Phone & Personal", { default: 1200, max: 100000, step: 25, required: false }),
      currencyField("aid", "Grants, Scholarships & Loans per Semester", { default: 5000, max: 1000000, step: 100, required: false }),
      currencyField("monthlyJobIncome", "Part-Time Job Income per Month", { default: 600, max: 100000, step: 25, required: false }),
      numberField("months", "Months per Semester", { default: 4.5, min: 1, max: 6, step: 0.5 }),
    ],
    calcResult: { label: "Gap per Semester", format: "currency" },
    calcResults: [
      { key: "semesterCost", label: "Semester Cost", format: "currency" },
      { key: "afterAid", label: "After Financial Aid", format: "currency" },
      { key: "jobIncomeForSemester", label: "Job Income for the Semester", format: "currency" },
      { key: "semesterGap", label: "Gap per Semester", format: "currency", highlight: true },
      { key: "monthlyGap", label: "Gap per Month", format: "currency" },
    ],
    instructions:
      "College costs come in semester chunks, while job income arrives monthly. Enter one semester's costs and aid; the gap " +
      "is what parents, savings or more aid must cover.\n\n" +
      "Federal work-study, cheaper textbooks (rentals, used, library), and sharing housing make the biggest difference.",
    examples:
      "Example: a $14,800 semester less $5,000 of aid is $9,800. Earning $600 a month adds " +
      "$2,700, leaving a $7,100 gap — about $1,577.78 a month.",
    assumptions:
      "Costs as entered for one semester. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I count student loans as aid?",
        answer: "For cash flow, yes — but remember they must be repaid. Borrow only what you need after grants, scholarships and work.",
      },
    ],
  },
  {
    slug: "post-graduation-budget-calculator",
    title: "Post-Graduation Budget Calculator",
    description: "Budget your first job after graduation: take-home pay after taxes, rent, student loan payments and savings, and what's left each month.",
    metaTitle: "Post-Graduation Budget Calculator — First Job Budget",
    metaDescription: "Free post-graduation budget calculator. Turn your first salary into take-home pay and budget rent, student loans and savings.",
    calcInputs: [
      currencyField("salary", "Starting Salary", { default: 55000, max: 10000000, step: 1000 }),
      percentField("taxPercent", "Taxes & Deductions (% of Pay)", { default: 22, max: 60, step: 1 }),
      currencyField("studentLoan", "Student Loan Payment", { default: 350, max: 100000, step: 10, required: false }),
      currencyField("rent", "Rent", { default: 1300, max: 100000, step: 25 }),
      currencyField("otherCosts", "Other Monthly Costs", { default: 1200, max: 100000, step: 25 }),
      percentField("savingsPercent", "Savings Rate", { default: 15, max: 100, step: 1 }),
    ],
    calcResult: { label: "Left Over Each Month", format: "currency" },
    calcResults: [
      { key: "monthlyTakeHome", label: "Monthly Take-Home Pay", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "leftOver", label: "Left Over Each Month", format: "currency", highlight: true },
      { key: "rentShare", label: "Rent as % of Take-Home", format: "percentage" },
      { key: "loanShare", label: "Student Loan as % of Take-Home", format: "percentage" },
    ],
    instructions:
      "Your first salary looks bigger than your paycheck: federal and state taxes, Social Security and Medicare, and " +
      "benefits often take 20–30%. Federal student loan payments usually start six months after graduation.\n\n" +
      "Starting with even a 10–15% savings rate — especially enough to get any 401(k) match — builds the habit early. Use " +
      "the paycheck calculator for an exact take-home figure.",
    examples:
      "Example: a $55,000 salary is about $3,575 a month after taxes. Saving 15% ($536.25), " +
      "paying $1,300 of rent and a $350 loan payment, plus $1,200 of other costs, leaves $188.75.",
    assumptions:
      "Taxes as a flat percentage of salary. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I pay off student loans or save first?",
        answer: "Get the full employer match and a small emergency fund first. Then compare loan rates: pay extra on high-rate private loans; low-rate federal loans can be paid on schedule while you invest.",
      },
    ],
  },
  {
    slug: "downsizing-budget-calculator",
    title: "Downsizing Budget Calculator",
    description: "See what downsizing to a smaller home frees up: net proceeds from selling, cash left after buying the new home, and monthly savings on housing costs.",
    metaTitle: "Downsizing Calculator — Equity Freed & Monthly Savings",
    metaDescription: "Free downsizing calculator. See the cash freed by selling and buying a smaller home, and the monthly and 10-year savings.",
    calcInputs: [
      currencyField("currentValue", "Current Home Value", { default: 600000, max: 100000000, step: 5000 }),
      currencyField("mortgageBalance", "Mortgage Balance", { default: 150000, max: 100000000, step: 5000, required: false }),
      percentField("sellingCostPercent", "Selling Costs", { default: 7, max: 15, step: 0.5 }),
      currencyField("newHomePrice", "New Home Price", { default: 350000, max: 100000000, step: 5000 }),
      percentField("buyingCostPercent", "Buying Costs", { default: 3, max: 10, step: 0.5 }),
      currencyField("currentMonthlyCosts", "Current Monthly Costs (Taxes, Insurance, Utilities, Upkeep)", { default: 3500, max: 1000000, step: 50 }),
      currencyField("newMonthlyCosts", "New Monthly Costs", { default: 2200, max: 1000000, step: 50 }),
    ],
    calcResult: { label: "Cash Freed After Buying", format: "currency" },
    calcResults: [
      { key: "netSaleProceeds", label: "Net Sale Proceeds", format: "currency" },
      { key: "cashFreedAfterBuying", label: "Cash Freed After Buying", format: "currency", highlight: true },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency" },
      { key: "tenYearSavings", label: "10-Year Total (Cash Freed + Savings)", format: "currency" },
    ],
    instructions:
      "Downsizing can release home equity and cut ongoing costs — property taxes, insurance, utilities and upkeep — often " +
      "a key part of a retirement plan. Selling costs (agent commission, closing, moving) and buying costs reduce what you " +
      "free up.\n\n" +
      "Enter the new home's price as if bought with cash; if you'll keep a mortgage, include its payment in the new monthly " +
      "costs.",
    examples:
      "Example: selling a $600,000 home with $150,000 owed nets $408,000. Buying a $350,000 home " +
      "frees $47,500, and monthly costs drop by $1,300 — $15,600 a year.",
    assumptions:
      "Up to $250,000 ($500,000 married) of gain on a main home is usually tax-free; larger gains may be taxed. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is downsizing always cheaper?",
        answer: "Not always — smaller homes in popular areas can cost as much, and HOA fees or a newer home's higher taxes can eat into the savings. Run the numbers first.",
      },
    ],
  },
  {
    slug: "empty-nester-budget-calculator",
    title: "Empty Nester Budget Calculator",
    description: "See how much money is freed up when the kids leave home and what it could grow to if you redirect it to retirement savings.",
    metaTitle: "Empty Nester Budget Calculator — Boost Retirement Savings",
    metaDescription: "Free empty nester calculator. See the money freed when kids move out and what it grows to if you redirect it to retirement.",
    calcInputs: [
      currencyField("freedMonthly", "Monthly Costs That End (Food, Activities, Tuition)", { default: 1500, max: 1000000, step: 50 }),
      currencyField("newCosts", "New Monthly Costs (Travel, Helping Adult Kids)", { default: 200, max: 1000000, step: 50, required: false }),
      percentField("redirectPercent", "Share to Redirect to Retirement", { default: 80, max: 100, step: 5 }),
      numberField("yearsToRetirement", "Years Until Retirement", { default: 10, min: 0, max: 40, step: 1 }),
      percentField("returnPercent", "Expected Return", { default: 7, min: -10, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Value at Retirement", format: "currency" },
    calcResults: [
      { key: "netFreedMonthly", label: "Net Money Freed per Month", format: "currency" },
      { key: "monthlyToRetirement", label: "Monthly to Retirement", format: "currency" },
      { key: "yearlyToRetirement", label: "Yearly to Retirement", format: "currency" },
      { key: "valueAtRetirement", label: "Value at Retirement", format: "currency", highlight: true },
    ],
    instructions:
      "When children become independent, grocery, activity, insurance and tuition costs fall — often just as you near your " +
      "peak earning years. Redirecting that money into retirement accounts, including catch-up contributions after 50 (and " +
      "the higher catch-up at 60–63), can make up for lost time.\n\n" +
      "Enter the costs that end, any new ones, and how much you'll redirect.",
    examples:
      "Example: $1,500 a month of child costs ending, less $200 of new costs, frees $1,300. Putting " +
      "80% of it — $1,040 a month — into retirement at 7% grows to $178,899.64 " +
      "in 10 years.",
    assumptions:
      "Monthly contributions; returns compound monthly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are catch-up contributions?",
        answer: "From age 50 you can put extra into a 401(k) or IRA each year; a higher 401(k) catch-up applies at ages 60–63. Check the current IRS limits.",
      },
    ],
  },
  {
    slug: "job-loss-emergency-budget-calculator",
    title: "Job Loss Emergency Budget Calculator",
    description: "See how long your money lasts after a job loss, a strike or a career change: savings, severance and unemployment benefits against your essential expenses.",
    metaTitle: "Job Loss Budget Calculator — How Long Will Savings Last",
    metaDescription: "Free job loss calculator. See how many months savings, severance and unemployment benefits cover essential expenses — also for strikes and career changes.",
    calcInputs: [
      currencyField("savings", "Emergency Savings", { default: 20000, max: 100000000, step: 500 }),
      currencyField("severance", "Severance (After Tax)", { default: 6000, max: 10000000, step: 500, required: false }),
      currencyField("essentials", "Essential Monthly Expenses", { default: 3800, max: 1000000, step: 50 }),
      currencyField("weeklyBenefit", "Weekly Unemployment Benefit (or Strike Pay)", { default: 450, max: 10000, step: 10, required: false }),
      numberField("benefitWeeks", "Weeks of Benefits", { default: 26, min: 0, max: 104, step: 1 }),
      currencyField("otherMonthlyIncome", "Other Monthly Income (Partner, Side Work, New Job)", { default: 0, max: 1000000, step: 50, required: false }),
    ],
    calcResult: { label: "Months of Runway", format: "number" },
    calcResults: [
      { key: "cashAvailable", label: "Cash Available", format: "currency" },
      { key: "monthlyBenefit", label: "Monthly Benefit", format: "currency" },
      { key: "shortfallWhileOnBenefits", label: "Monthly Shortfall While on Benefits", format: "currency" },
      { key: "shortfallAfterBenefits", label: "Monthly Shortfall After Benefits End", format: "currency" },
      { key: "monthsOfRunway", label: "Months of Runway", format: "number", highlight: true },
    ],
    instructions:
      "After a layoff, cut to essentials right away — housing, food, utilities, insurance, minimum debt payments — and " +
      "apply for unemployment benefits (amounts and weeks vary by state; most give up to 26 weeks). The runway is how many " +
      "months your cash lasts.\n\n" +
      "The same math works for a strike (enter weekly strike pay) or a planned career change (enter expected income in the " +
      "new field as other income). 120 means 10 years or more.",
    examples:
      "Example: $20,000 of savings plus $6,000 of severance gives $26,000. With $3,800 of essentials and " +
      "$1,950 a month of unemployment for 26 weeks, you're short $1,850 a month at first " +
      "and $3,800 after — a runway of 9 months.",
    assumptions:
      "Unemployment benefits are taxable; enter the after-tax amount. Health insurance (COBRA or marketplace) should be in " +
      "your essentials. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What should I cut first after losing a job?",
        answer: "Pause extra debt payments and savings contributions, cancel nonessential subscriptions, and call lenders early — many offer hardship programs.",
      },
    ],
  },
  {
    slug: "commuter-vs-remote-cost-comparison-calculator",
    title: "Commuter vs Remote Cost Comparison Calculator",
    description: "Compare the yearly cost and time of commuting with working from home — gas, parking, transit and lunches versus home utilities, internet and office setup.",
    metaTitle: "Commute vs Remote Work Cost Calculator — Yearly Savings",
    metaDescription: "Free commuter vs remote calculator. Compare commuting costs and hours with work-from-home expenses and home office setup.",
    calcInputs: [
      numberField("daysPerWeek", "Office Days per Week", { default: 5, min: 0, max: 7, step: 1 }),
      numberField("milesRoundTrip", "Round-Trip Miles per Day", { default: 30, min: 0, max: 1000, step: 1 }),
      currencyField("costPerMile", "Driving Cost per Mile", { default: 0.7, max: 10, step: 0.01 }),
      currencyField("transitPerDay", "Transit Fare per Day", { default: 0, max: 1000, step: 0.5, required: false }),
      currencyField("parkingPerDay", "Parking & Tolls per Day", { default: 10, max: 1000, step: 1, required: false }),
      currencyField("lunchPerDay", "Lunch & Coffee Out per Day", { default: 12, max: 1000, step: 1, required: false }),
      numberField("commuteMinutes", "Round-Trip Commute (Minutes)", { default: 60, min: 0, max: 600, step: 5 }),
      currencyField("remoteExtraMonthly", "Extra Home Costs When Remote (Monthly)", { default: 60, max: 10000, step: 5, required: false }),
      currencyField("officeSetup", "Home Office Setup (One-Time)", { default: 800, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Yearly Savings Working Remotely", format: "currency" },
    calcResults: [
      { key: "commutingCostPerYear", label: "Commuting Cost per Year", format: "currency" },
      { key: "remoteCostPerYear", label: "Remote Work Cost per Year", format: "currency" },
      { key: "yearlySavingsWorkingRemotely", label: "Yearly Savings Working Remotely", format: "currency", highlight: true },
      { key: "firstYearSavingsAfterSetup", label: "First-Year Savings After Setup", format: "currency" },
      { key: "hoursSavedPerYear", label: "Hours Saved per Year", format: "number" },
    ],
    instructions:
      "Commuting costs more than gas: wear and tear (the IRS mileage rate, about 70¢ a mile, covers the full cost of " +
      "driving), parking, tolls, lunches and coffee. Working remotely adds some home costs — electricity, heating, internet " +
      "and a one-time office setup.\n\n" +
      "For a hybrid schedule, enter only the office days you'd drop.",
    examples:
      "Example: commuting 5 days a week for 30 miles, with parking and lunches, costs " +
      "$10,320 a year. Working from home costs $720, saving $9,600 a year " +
      "($8,800 after setup) and 240 hours.",
    assumptions:
      "48 working weeks a year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I deduct home office costs as an employee?",
        answer: "Not on your federal return under current law, but ask your employer about a remote-work stipend; self-employed people can deduct a qualifying home office.",
      },
    ],
  },
  {
    slug: "four-day-work-week-cost-impact-calculator",
    title: "Four-Day Work Week Cost Impact Calculator",
    description: "See the financial impact of a four-day work week: any change in pay against the commuting, childcare and lunch costs saved by one fewer workday each week.",
    metaTitle: "Four-Day Work Week Calculator — Pay vs Savings",
    metaDescription: "Free four-day work week calculator. Compare any pay change with savings on commuting, childcare and lunches from one fewer workday.",
    calcInputs: [
      currencyField("salary", "Current Yearly Salary", { default: 70000, max: 10000000, step: 1000 }),
      percentField("payChangePercent", "Pay Change (0 for Same Pay, −20 for 80%)", { default: 0, min: -50, max: 20, step: 1 }),
      currencyField("commutePerDay", "Commuting Cost per Day", { default: 20, max: 1000, step: 1 }),
      currencyField("childcarePerDay", "Childcare Saved per Day", { default: 0, max: 1000, step: 5, required: false }),
      currencyField("lunchPerDay", "Lunch & Coffee per Day", { default: 12, max: 1000, step: 1, required: false }),
      numberField("workWeeks", "Working Weeks per Year", { default: 48, min: 0, max: 52, step: 1 }),
    ],
    calcResult: { label: "Net Yearly Impact", format: "currency" },
    calcResults: [
      { key: "yearlyPayChange", label: "Yearly Pay Change", format: "currency" },
      { key: "yearlySavingsFromDayOff", label: "Yearly Savings From the Day Off", format: "currency" },
      { key: "netYearlyImpact", label: "Net Yearly Impact", format: "currency", highlight: true },
      { key: "extraDaysOffPerYear", label: "Extra Days Off per Year", format: "number" },
    ],
    instructions:
      "Some employers offer a four-day week at full pay (the \"100-80-100\" model); others compress the same hours into four " +
      "days, or cut pay proportionally. One fewer workday saves commuting, lunch and sometimes childcare costs.\n\n" +
      "Enter your pay change and daily costs. A positive net impact means you come out ahead financially; the extra days " +
      "off come on top.",
    examples:
      "Example: with no pay change, dropping one day a week saves $20 of commuting and $12 of lunch each " +
      "week — $1,536 a year — plus 48 extra days off.",
    assumptions:
      "Pay change before tax. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Would a pay cut for a four-day week be worth it?",
        answer: "Financially, only if the savings make up the difference — usually not with a 20% cut. But many value the extra day for family, health or a side business.",
      },
    ],
  },
];

// Budget Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
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
