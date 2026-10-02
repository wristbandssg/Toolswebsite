// One-time (but safe to re-run) batch setup script: creates the 7 tools
// of the Loan Calculators expansion sub-batch 6 (Solar Panel Loans),
// filed under Finance Calculators > Loan Calculators > Home Improvement
// Loan Calculators. See src/lib/calc-engine-loan-solar.ts for
// the math and src/lib/calc-engine-loan-debt-consolidation.ts for the full
// batch context.
//
// If the "Home Improvement Loan Calculators" sub-category doesn't exist
// yet, it is created under Loan Calculators.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-solar-calculators.ts
// or
//   npm run db:create-loan-solar-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "Home Improvement Loan Calculators", slug: "home-improvement-loan-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates, fees, and terms depend on the lender and your credit profile — check your loan agreement " +
  "or ask your lender for exact figures.";

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
    slug: "solar-panel-loan-calculator",
    title: "Solar Panel Loan Calculator",
    description: "Price a solar system from its size and cost per watt, see the loan payment, and compare it with how much the panels should cut your electric bill each month.",
    metaTitle: "Solar Panel Loan Calculator — Payment vs Bill Savings",
    metaDescription: "Free solar panel loan calculator. Price your system by size and cost per watt, then compare the loan payment with your monthly bill savings.",
    calcInputs: [
      numberField("systemSizeKw", "System Size (kW)", { default: 8, min: 0.5, max: 100, step: 0.5 }),
      currencyField("costPerWatt", "Installed Cost per Watt", { default: 3, max: 10, step: 0.05 }),
      currencyField("rebates", "State / Utility Rebates", { default: 0, max: 1000000, step: 100, required: false }),
      currencyField("downPayment", "Down Payment", { default: 0, max: 1000000, step: 100, required: false }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 7.99, max: 30, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 20, min: 5, max: 25, step: 1 }),
      numberField("productionPerKw", "Yearly Output per kW (kWh)", { default: 1300, min: 500, max: 2500, step: 50 }),
      currencyField("electricityRate", "Electricity Price per kWh", { default: 0.17, max: 1, step: 0.01 }),
    ],
    calcResult: { label: "Net Monthly Cash Flow", format: "currency" },
    calcResults: [
      { key: "systemCost", label: "System Cost", format: "currency" },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Loan Payment", format: "currency" },
      { key: "monthlyBillSavings", label: "Monthly Bill Savings (Year 1)", format: "currency" },
      { key: "netMonthlyCashFlow", label: "Net Monthly Cash Flow", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the system size and installed cost per watt from your quote, any state or utility rebates, a down payment " +
      "if you have one, and the loan's rate and term. Then enter how many kWh a year each kW of panels produces where " +
      "you live (roughly 1,100 in cloudy northern states to 1,700+ in the Southwest — your installer's estimate is " +
      "best) and what you pay per kWh.\n\n" +
      "A positive cash flow means the bill savings more than cover the payment; a negative one means solar costs " +
      "you that much each month until the loan is paid off, after which the savings are yours.",
    examples:
      "Example: an 8 kW system at $3 per watt costs $24,000. Financed in full at 7.99% over 20 years, the payment is " +
      "$200.60. Producing 1,300 kWh per kW at $0.17 per kWh saves about $147.33 a month, so you're $53.26 a month " +
      "short at first — though rising utility prices narrow the gap over time.",
    assumptions:
      "The 30% federal residential solar tax credit (Section 25D) ended for systems installed after 31 December " +
      "2025, so none is assumed. Savings depend on your utility's net-metering rules, which may pay less for power " +
      "you export. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is the federal solar tax credit still available?",
        answer: "Not for homeowner-owned systems installed from 2026 onwards — the One Big Beautiful Bill Act ended the Section 25D credit after 31 December 2025. Some states and utilities still offer rebates, so check local programmes.",
      },
      {
        question: "What's a fair cost per watt?",
        answer: "Installed residential prices commonly run around $2.50–$3.50 per watt before incentives, depending on location, equipment, and roof complexity. Get at least three quotes.",
      },
    ],
  },
  {
    slug: "solar-panel-loan-payment-calculator",
    title: "Solar Panel Loan Payment Calculator",
    description: "See how a solar loan's re-amortization works: the low intro payment, and how much the payment jumps if you don't make the expected lump-sum paydown on time.",
    metaTitle: "Solar Panel Loan Payment Calculator — Re-Amortization",
    metaDescription: "Free solar loan payment calculator. See the intro payment and how much it jumps if you don't pay down the expected lump sum by the deadline.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 30000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.99, max: 30, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 25, min: 5, max: 25, step: 1 }),
      currencyField("expectedPrepayment", "Expected Lump-Sum Paydown", { default: 6000, max: 1000000, step: 100 }),
      numberField("prepayMonth", "Paydown Deadline (Month)", { default: 18, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Payment Jump If Not Paid Down", format: "currency" },
    calcResults: [
      { key: "introPayment", label: "Intro Monthly Payment", format: "currency" },
      { key: "balanceAtPrepayMonth", label: "Balance at the Deadline", format: "currency" },
      { key: "paymentIfPrepaid", label: "Payment After Paying Down", format: "currency" },
      { key: "paymentIfNotPrepaid", label: "Payment If You Don't Pay Down", format: "currency" },
      { key: "paymentJumpIfNotPrepaid", label: "Payment Jump If Not Paid Down", format: "currency", highlight: true },
    ],
    instructions:
      "Many solar loans quote a low starting payment that assumes you'll pay down a lump sum — historically the " +
      "federal tax credit, now often a rebate — by a deadline such as month 18. At that point the loan is " +
      "re-amortized. Enter the loan amount, rate, term, the expected paydown, and the deadline.\n\n" +
      "The tool shows the intro payment and what the payment becomes with and without the paydown. Check your loan " +
      "agreement for the exact terms.",
    examples:
      "Example: a $30,000, 25-year loan at 6.99% expecting a $6,000 paydown by month 18 starts at $169.47 a month. " +
      "That doesn't cover all the interest, so the balance creeps up to $30,099.82. With the paydown the payment " +
      "becomes $174.26; without it, $217.64 — a $48.16 jump.",
    assumptions:
      "With the federal 25D credit gone for 2026+ installations, make sure you know where any expected paydown will " +
      "come from before signing. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I avoid re-amortization surprises?",
        answer: "Ask the lender for a payment that doesn't assume any paydown, or choose a loan without a re-amortization clause. If you do expect a rebate, set it aside the moment it arrives.",
      },
    ],
  },
  {
    slug: "solar-panel-loan-payoff-calculator",
    title: "Solar Panel Loan Payoff Calculator",
    description: "See how extra payments shorten your solar loan, how much interest they save, and how many years of panel warranty are left once the panels are paid for.",
    metaTitle: "Solar Panel Loan Payoff Calculator — Free",
    metaDescription: "Free solar panel loan payoff calculator. See months and interest saved by paying extra, and warranty years left after payoff.",
    calcInputs: [
      currencyField("balance", "Current Balance", { default: 25000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.01 }),
      currencyField("monthlyPayment", "Current Monthly Payment", { default: 210, max: 100000, step: 5 }),
      currencyField("extraMonthly", "Extra Monthly Payment", { default: 50, max: 100000, step: 5, required: false }),
      numberField("yearsSinceInstall", "Years Since Installation", { default: 0, min: 0, max: 30, step: 0.5, required: false }),
      numberField("warrantyYears", "Panel Warranty (Years)", { default: 25, min: 0, max: 40, step: 1 }),
    ],
    calcResult: { label: "Months to Payoff With Extra", format: "number", unit: "months" },
    calcResults: [
      { key: "monthsLeft", label: "Months Left at Current Payment", format: "number", unit: "months" },
      { key: "monthsWithExtra", label: "Months to Payoff With Extra", format: "number", unit: "months", highlight: true },
      { key: "interestSaved", label: "Interest Saved", format: "currency" },
      { key: "warrantyYearsAfterPayoff", label: "Warranty Years Left After Payoff", format: "number", unit: "years" },
    ],
    instructions:
      "Enter your balance, rate, and payment, any extra you could pay, how long ago the system was installed, and " +
      "the panel warranty (25 years is common). Once the loan is paid off, the electricity the panels make is " +
      "essentially free — so paying off sooner means more years of savings with nothing owed.",
    examples:
      "Example: $25,000 at 7.99% paid at $210 a month takes 238 months. Adding $50 cuts it to 155 months and saves " +
      "$9,737.47 in interest, leaving about 12.08 years of a 25-year warranty with the panels fully paid for.",
    assumptions:
      "Panels often keep working beyond the warranty, at slowly falling output. Inverters may need replacing " +
      "sooner (often 10–15 years). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does selling my home affect a solar loan?",
        answer: "Usually the loan must be paid off or transferred when you sell, and a solar loan secured by a UCC filing can complicate the sale. Paying it down early makes selling simpler.",
      },
    ],
  },
  {
    slug: "solar-panel-loan-interest-calculator",
    title: "Solar Panel Loan Interest Calculator",
    description: "Find the total interest on a solar loan and what financing costs per kWh your panels produce, so you can compare it with your utility rate.",
    metaTitle: "Solar Panel Loan Interest Calculator — Cost per kWh",
    metaDescription: "Free solar loan interest calculator. See total interest, interest per kWh and the loan's total cost per kWh compared with utility power.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 24000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 20, min: 5, max: 25, step: 1 }),
      numberField("systemSizeKw", "System Size (kW)", { default: 8, min: 0.5, max: 100, step: 0.5 }),
      numberField("productionPerKw", "Yearly Output per kW (kWh)", { default: 1300, min: 500, max: 2500, step: 50 }),
      percentField("degradationPercent", "Yearly Panel Degradation", { default: 0.5, max: 3, step: 0.05 }),
    ],
    calcResult: { label: "Loan Cost per kWh", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "kwhOverLoanTerm", label: "kWh Produced Over the Loan", format: "number", unit: "kWh" },
      { key: "interestPerKwh", label: "Interest per kWh", format: "currency", decimals: 3 },
      { key: "loanCostPerKwh", label: "Loan Cost per kWh", format: "currency", decimals: 3, highlight: true },
    ],
    instructions:
      "Enter the loan amount, rate, and term, the system size, its yearly output per kW, and how fast the panels lose " +
      "output each year (about 0.5% is typical for modern panels). The tool adds up the kWh produced while you're " +
      "paying the loan and divides the interest — and every payment — by it. If the loan cost per kWh is below your " +
      "utility rate, solar is cheaper per unit even while you're paying it off.",
    examples:
      "Example: a $24,000 loan at 7.99% over 20 years costs $200.60 a month and $24,143.11 in interest. An 8 kW system " +
      "making 1,300 kWh per kW, losing 0.5% a year, produces 198,410 kWh in that time — so interest adds $0.122 per " +
      "kWh and the loan costs $0.243 per kWh in total.",
    assumptions:
      "Ignores maintenance and inverter replacement. Power produced after the loan ends costs nothing extra, so " +
      "lifetime cost per kWh is lower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I lower the interest?",
        answer: "Compare a solar loan's rate with a home equity loan or credit union loan, ask for the price without 'dealer fees' built in, and choose the shortest term you can afford.",
      },
    ],
  },
  {
    slug: "solar-panel-loan-affordability-calculator",
    title: "Solar Panel Loan Affordability Calculator",
    description: "Find the biggest solar system you can finance if you keep the loan payment no higher than your current electric bill (or a share of it).",
    metaTitle: "Solar Panel Loan Affordability Calculator — Free",
    metaDescription: "Free solar loan affordability calculator. Keep your payment at or below your electric bill and see the maximum loan and system size.",
    calcInputs: [
      currencyField("monthlyElectricBill", "Average Monthly Electric Bill", { default: 180, max: 10000, step: 5 }),
      percentField("paymentShareOfBillPercent", "Max Payment as % of Bill", { default: 100, max: 200, step: 5 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 7.99, max: 30, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 20, min: 5, max: 25, step: 1 }),
      currencyField("costPerWatt", "Installed Cost per Watt", { default: 3, max: 10, step: 0.05 }),
      currencyField("downPayment", "Down Payment", { default: 0, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "Maximum System Size", format: "number", unit: "kW" },
    calcResults: [
      { key: "maxMonthlyPayment", label: "Maximum Monthly Payment", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency" },
      { key: "maxSystemCost", label: "Maximum System Cost", format: "currency" },
      { key: "maxSystemSizeKw", label: "Maximum System Size", format: "number", unit: "kW", highlight: true },
    ],
    instructions:
      "Enter your average monthly electric bill and the most you'd pay on a solar loan as a share of it — 100% means " +
      "the payment equals today's bill. Add the loan's rate and term, the installed cost per watt, and any down " +
      "payment. The tool shows the largest system that keeps you within that limit.",
    examples:
      "Example: with a $180 bill and a payment capped at 100% of it, a 20-year loan at 7.99% supports $21,535.79. At " +
      "$3 per watt that buys about a 7.18 kW system.",
    assumptions:
      "You'll still pay some utility charges (connection fees, and any power the panels don't cover), so a payment " +
      "equal to your bill isn't the same as breaking even. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How big a system do I actually need?",
        answer: "Divide your yearly electricity use (from your bills, in kWh) by your area's yearly output per kW. For example, 10,400 kWh ÷ 1,300 = an 8 kW system to cover all your use.",
      },
    ],
  },
  {
    slug: "solar-panel-loan-comparison-calculator",
    title: "Solar Panel Loan Comparison Calculator",
    description: "Compare 25 years of net savings from paying cash for solar, financing it with a loan, or leasing the panels.",
    metaTitle: "Solar Panel Loan Comparison — Cash vs Loan vs Lease",
    metaDescription: "Free solar comparison calculator. See 25-year net savings for paying cash, taking a solar loan, or leasing panels with an escalator.",
    calcInputs: [
      currencyField("systemCost", "System Cost (After Rebates)", { default: 24000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Loan Interest Rate", { default: 7.99, max: 30, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 20, min: 5, max: 25, step: 1 }),
      currencyField("firstYearSavings", "First-Year Electric Bill Savings", { default: 1800, max: 100000, step: 50 }),
      percentField("utilityIncreasePercent", "Yearly Utility Price Increase", { default: 3, max: 15, step: 0.25 }),
      percentField("degradationPercent", "Yearly Panel Degradation", { default: 0.5, max: 3, step: 0.05 }),
      currencyField("leaseMonthly", "Lease / PPA Payment (Year 1, Monthly)", { default: 120, max: 10000, step: 5 }),
      percentField("leaseEscalatorPercent", "Lease Yearly Escalator", { default: 2.9, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Loan — 25-Year Net Savings", format: "currency" },
    calcResults: [
      { key: "lifetimeBillSavings", label: "25-Year Bill Savings", format: "currency" },
      { key: "cashNetSavings", label: "Cash — 25-Year Net Savings", format: "currency" },
      { key: "loanPayment", label: "Loan Monthly Payment", format: "currency" },
      { key: "loanNetSavings", label: "Loan — 25-Year Net Savings", format: "currency", highlight: true },
      { key: "leaseNetSavings", label: "Lease — 25-Year Net Savings", format: "currency" },
    ],
    instructions:
      "Enter the system cost, the loan's rate and term, your first-year bill savings, how fast utility prices rise, " +
      "and panel degradation. For the lease (or power purchase agreement), enter the first-year monthly payment and " +
      "its yearly escalator.\n\n" +
      "Each option gets the same bill savings over 25 years; the difference is what you pay for the panels — the " +
      "price upfront, the loan payments, or the lease payments.",
    examples:
      "Example: $1,800 of first-year savings, growing with 3% utility increases and 0.5% degradation, adds up to " +
      "$61,364.66 over 25 years. Paying $24,000 cash nets $37,364.66. A 20-year loan at 7.99% ($200.60 a month) nets " +
      "$13,221.56. A $120 lease rising 2.9% a year nets $9,547.22.",
    assumptions:
      "Doesn't discount future money or count what the cash could earn if invested instead. Lease customers usually " +
      "get maintenance included; owners pay for repairs. No federal tax credit is assumed (25D ended after 2025). " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does leasing save the least?",
        answer: "The leasing company owns the panels and keeps the incentives and profit; you only get the difference between your bill savings and the lease payment, which rises every year with the escalator.",
      },
    ],
  },
  {
    slug: "solar-panel-loan-eligibility-calculator",
    title: "Solar Panel Loan Eligibility Calculator",
    description: "Check a solar loan against typical lender guidelines — debt-to-income and credit score — and see the payment as a share of your current electric bill.",
    metaTitle: "Solar Panel Loan Eligibility Calculator — Free",
    metaDescription: "Free solar panel loan eligibility calculator. Check DTI and credit score against a lender's limits and compare the payment with your bill.",
    calcInputs: [
      numberField("creditScore", "Your Credit Score", { default: 690, min: 300, max: 850, step: 1 }),
      numberField("lenderMinScore", "Lender's Minimum Score", { default: 650, min: 300, max: 850, step: 1 }),
      currencyField("grossMonthlyIncome", "Gross Monthly Income", { default: 6500, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Current Monthly Debts (Incl. Mortgage)", { default: 2100, max: 100000, step: 25 }),
      currencyField("loanAmount", "Solar Loan Amount", { default: 25000, max: 1000000, step: 250 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.99, max: 30, step: 0.01 }),
      numberField("termYears", "Loan Term (Years)", { default: 20, min: 5, max: 25, step: 1 }),
      percentField("maxDtiPercent", "Lender's Maximum DTI", { default: 45, max: 60, step: 1 }),
      currencyField("monthlyElectricBill", "Current Monthly Electric Bill", { default: 200, max: 10000, step: 5 }),
    ],
    calcResult: { label: "DTI With Solar Loan", format: "percentage" },
    calcResults: [
      { key: "monthlyPayment", label: "Solar Loan Payment", format: "currency" },
      { key: "dtiPercent", label: "DTI With Solar Loan", format: "percentage", highlight: true },
      { key: "dtiHeadroomPercent", label: "Room Under DTI Limit", format: "percentage" },
      { key: "scoreMargin", label: "Points Above Minimum Score", format: "number" },
      { key: "paymentVsBillPercent", label: "Payment as % of Current Bill", format: "percentage" },
    ],
    instructions:
      "Enter your credit score, income, and current monthly debts, the solar loan amount, rate, and term, the " +
      "lender's limits, and your current electric bill. Solar lenders typically look for scores in the mid-600s or " +
      "higher and a DTI under about 45%–50%, and usually require you to own the home.",
    examples:
      "Example: a $25,000 loan at 7.99% over 20 years costs $208.95 a month. On $6,500 of income with $2,100 of " +
      "debts, DTI is 35.52% — 9.48 points under 45%. A 690 score is 40 points above 650. The payment is 104.48% of a " +
      "$200 electric bill.",
    assumptions:
      "Lender criteria vary; this is a guideline check, not an approval. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need to own my home to get a solar loan?",
        answer: "Almost always, yes — and lenders may check that you have homeowners insurance and enough remaining life on your roof. Renters may be able to join community solar instead.",
      },
    ],
  },
];

async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
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
