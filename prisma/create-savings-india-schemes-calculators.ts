// One-time (but safe to re-run) batch setup script: creates the Indian Savings Scheme tools
// (7) of the Interest Calculators expansion, filed under Savings Calculators.
// See src/lib/calc-engine-savings-india-schemes.ts for the math and
// src/lib/calc-engine-interest-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-india-schemes-calculators.ts
// or
//   npm run db:create-savings-india-schemes-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY = { name: "Savings Calculators", slug: "savings-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial or tax advice. " +
  "Government scheme rates are revised every quarter and bank rates change often — check the current rate " +
  "with your bank, India Post or EPFO.";

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
    slug: "fixed-deposit-interest-calculator",
    title: "Fixed Deposit Interest Calculator",
    description: "Calculate your bank, post office or cooperative society fixed deposit (FD) maturity amount and interest in rupees, with quarterly compounding, the senior citizen rate and estimated TDS.",
    metaTitle: "FD Calculator — Fixed Deposit Interest & Maturity (₹)",
    metaDescription: "Free FD calculator. Find your fixed deposit maturity amount and interest in rupees, with quarterly compounding, senior citizen rate and TDS.",
    calcInputs: [
      currencyField("principal", "Deposit Amount", { unit: "₹", default: 500000, max: 1000000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (% per annum)", { default: 7, max: 15, step: 0.05 }),
      numberField("tenureMonths", "Tenure (Months)", { default: 24, min: 1, max: 120, step: 1 }),
      {
        key: "compoundingPerYear", label: "Compounding", type: "dropdown", required: true, default: 4,
        options: [
          { label: "Quarterly (Most Banks)", value: 4 },
          { label: "Monthly", value: 12 },
          { label: "Yearly", value: 1 },
        ],
      },
      {
        key: "seniorCitizen", label: "Senior Citizen (60+)?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
      percentField("seniorExtraPercent", "Senior Citizen Extra Rate", { default: 0.5, max: 2, step: 0.05, required: false }),
      currencyField("tdsThreshold", "TDS Threshold (Interest per Year)", { unit: "₹", default: 50000, max: 1000000, step: 1000 }),
    ],
    calcResult: { label: "Maturity Amount", format: "currency", currency: "INR" },
    calcResults: [
      { key: "rateApplied", label: "Rate Applied", format: "percentage", currency: "INR" },
      { key: "maturityAmount", label: "Maturity Amount", format: "currency", currency: "INR", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency", currency: "INR" },
      { key: "effectiveAnnualYield", label: "Effective Annual Yield", format: "percentage", currency: "INR" },
      { key: "estimatedTds", label: "Estimated TDS (10%)", format: "currency", currency: "INR" },
      { key: "maturityAfterTds", label: "Maturity After TDS", format: "currency", currency: "INR" },
    ],
    instructions:
      "Enter the deposit, the bank's rate and the tenure. Most Indian banks compound FD interest quarterly. Senior " +
      "citizens usually get 0.25–0.75% extra. Cooperative society and small finance bank FDs often pay more, but only " +
      "₹5 lakh per depositor per bank is insured by DICGC.\n\n" +
      "Banks deduct 10% TDS when your FD interest at that bank passes ₹50,000 in a financial year (₹1 lakh for senior " +
      "citizens) — submit Form 15G/15H if your total income is below the taxable limit. Set the threshold to match.",
    examples:
      "Example: ₹5,00,000 in a 24-month FD at 7% compounded quarterly grows to ₹5,74,440.89 — " +
      "₹74,440.89 of interest, an effective yield of 7.19%. The interest stays under the TDS " +
      "threshold, so no TDS is deducted.",
    assumptions:
      "Cumulative FD (interest reinvested). TDS here is a simple estimate based on the average yearly interest; FD interest " +
      "is taxed at your slab rate either way. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is FD interest taxable?",
        answer: "Yes, it's added to your income and taxed at your slab rate every year, even for a cumulative FD that pays at maturity. TDS is just tax collected in advance.",
      },
    ],
  },
  {
    slug: "recurring-deposit-interest-calculator",
    title: "Recurring Deposit Interest Calculator",
    description: "Calculate the maturity amount and interest on a bank or post office recurring deposit (RD) in rupees, using quarterly compounding on each monthly installment.",
    metaTitle: "RD Calculator — Recurring Deposit Maturity (₹)",
    metaDescription: "Free RD calculator. Find your recurring deposit maturity amount, total deposits and interest in rupees with quarterly compounding.",
    calcInputs: [
      currencyField("monthlyDeposit", "Monthly Installment", { unit: "₹", default: 5000, max: 10000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate (% per annum)", { default: 6.7, max: 15, step: 0.05 }),
      numberField("months", "Tenure (Months)", { default: 60, min: 6, max: 120, step: 1 }),
    ],
    calcResult: { label: "Maturity Amount", format: "currency", currency: "INR" },
    calcResults: [
      { key: "totalDeposited", label: "Total Deposited", format: "currency", currency: "INR" },
      { key: "maturityAmount", label: "Maturity Amount", format: "currency", currency: "INR", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency", currency: "INR" },
    ],
    instructions:
      "A recurring deposit lets you save a fixed amount every month at a fixed rate. Banks and India Post compound RD " +
      "interest quarterly, so each installment earns interest for the months it stays in the account — the first for the " +
      "full tenure, the last for one month.\n\n" +
      "The Post Office RD runs 5 years (6.7% for recent quarters). Bank RDs run 6 months to 10 years.",
    examples:
      "Example: ₹5,000 a month for 60 months at 6.70% adds up to ₹3,00,000 of deposits and matures " +
      "at ₹3,56,829.14 — ₹56,829.14 of interest.",
    assumptions:
      "Every installment paid on time; missed installments attract a penalty and may reduce interest. RD interest is " +
      "taxable at your slab rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a recurring deposit better than a SIP?",
        answer: "An RD gives a guaranteed return with no market risk; an equity SIP can earn more over the long term but can also fall in value. Many savers use RDs for goals a few years away.",
      },
    ],
  },
  {
    slug: "national-savings-certificate-calculator",
    title: "National Savings Certificate Calculator",
    description: "Calculate the maturity value of a National Savings Certificate (NSC VIII issue) in rupees: 5-year term, interest compounded yearly, and the interest deemed reinvested for Section 80C.",
    metaTitle: "NSC Calculator — National Savings Certificate (₹)",
    metaDescription: "Free NSC calculator. See the maturity value and interest of a National Savings Certificate, plus the interest deemed reinvested under 80C.",
    calcInputs: [
      currencyField("investment", "Investment", { unit: "₹", default: 100000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (% per annum)", { default: 7.7, max: 15, step: 0.05 }),
      numberField("years", "Term (Years)", { default: 5, min: 1, max: 10, step: 1 }),
    ],
    calcResult: { label: "Maturity Value", format: "currency", currency: "INR" },
    calcResults: [
      { key: "maturityAmount", label: "Maturity Value", format: "currency", currency: "INR", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency", currency: "INR" },
      { key: "firstYearInterest", label: "Year 1 Interest", format: "currency", currency: "INR" },
      { key: "finalYearInterest", label: "Final Year Interest", format: "currency", currency: "INR" },
      { key: "interestDeemedReinvested", label: "Interest Deemed Reinvested (80C, Years 1–4)", format: "currency", currency: "INR" },
    ],
    instructions:
      "NSC is a 5-year savings certificate sold at post offices, with the rate fixed for the whole term when you buy " +
      "(7.7% for recent quarters). Interest compounds yearly and is paid only at maturity. There's no upper limit; the " +
      "minimum is ₹1,000.\n\n" +
      "Under the old tax regime, the investment qualifies for the ₹1.5 lakh Section 80C deduction, and each year's interest " +
      "except the last is treated as reinvested, so it can be claimed under 80C too. The interest itself is taxable.",
    examples:
      "Example: ₹1,00,000 in NSC at 7.70% for 5 years matures at ₹1,44,903.38 — " +
      "₹44,903.38 of interest, growing from ₹7,700 in year 1 to ₹10,359.85 in the final year. " +
      "₹34,543.53 counts as reinvested for 80C.",
    assumptions:
      "Rate fixed at purchase; government revises rates each quarter for new certificates. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I withdraw NSC early?",
        answer: "Only on the holder's death, by court order, or when pledged and forfeited. It can be pledged as security for a loan.",
      },
    ],
  },
  {
    slug: "post-office-savings-interest-calculator",
    title: "Post Office Savings Interest Calculator",
    description: "Calculate interest on India Post savings schemes in rupees — Time Deposit, Monthly Income Scheme or Savings Account — with the monthly income or maturity value.",
    metaTitle: "Post Office Savings Interest Calculator — TD & MIS (₹)",
    metaDescription: "Free post office savings calculator. See interest and maturity for a Post Office Time Deposit, the monthly income from MIS, or a savings account.",
    calcInputs: [
      currencyField("amount", "Amount", { unit: "₹", default: 200000, max: 100000000, step: 1000 }),
      {
        key: "scheme", label: "Scheme", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Time Deposit (1, 2, 3 or 5 Years)", value: 1 },
          { label: "Monthly Income Scheme (5 Years)", value: 2 },
          { label: "Savings Account", value: 3 },
        ],
      },
      percentField("annualRatePercent", "Interest Rate (% per annum)", { default: 7.5, max: 15, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 0, max: 30, step: 1 }),
    ],
    calcResult: { label: "Total Interest", format: "currency", currency: "INR" },
    calcResults: [
      { key: "monthlyIncome", label: "Monthly Income (MIS)", format: "currency", currency: "INR" },
      { key: "yearlyInterest", label: "Interest per Year", format: "currency", currency: "INR" },
      { key: "totalInterest", label: "Total Interest", format: "currency", currency: "INR", highlight: true },
      { key: "maturityAmount", label: "Maturity Amount", format: "currency", currency: "INR" },
      { key: "totalReceived", label: "Total Received (Principal + Interest)", format: "currency", currency: "INR" },
    ],
    instructions:
      "India Post's small savings schemes are backed by the Government of India. Recent rates: Time Deposit 6.9% (1 year), " +
      "7.0% (2 years), 7.1% (3 years) and 7.5% (5 years), compounded quarterly; Monthly Income Scheme 7.4%, paid monthly, " +
      "up to ₹9 lakh (₹15 lakh joint); Savings Account 4%. Rates are reviewed every quarter, so enter the current one.\n\n" +
      "The 5-year Time Deposit qualifies for Section 80C under the old tax regime. For the Post Office RD, NSC or Sukanya " +
      "Samriddhi, use those calculators.",
    examples:
      "Example: ₹2,00,000 in a 5-year Post Office Time Deposit at 7.50% earns about ₹15,427.17 a year and " +
      "₹89,989.61 in total, for a maturity value of ₹2,89,989.61.",
    assumptions:
      "Time Deposit interest is shown compounded quarterly and reinvested; it's actually paid out yearly, so you'd earn a " +
      "little less unless you reinvest it. MIS returns the principal after 5 years. All interest is taxable. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is post office interest tax-free?",
        answer: "No, except PPF and Sukanya Samriddhi. Savings account interest up to ₹10,000 (₹50,000 for seniors) can be deducted under 80TTA/80TTB in the old regime.",
      },
    ],
  },
  {
    slug: "sukanya-samriddhi-calculator",
    title: "Sukanya Samriddhi Calculator",
    description: "Calculate the maturity value of a Sukanya Samriddhi Yojana (SSY) account for your daughter in rupees: deposits for 15 years, tax-free interest, maturity 21 years after opening.",
    metaTitle: "Sukanya Samriddhi Calculator — SSY Maturity (₹)",
    metaDescription: "Free Sukanya Samriddhi calculator. See your SSY account's maturity value, total deposits and tax-free interest for your daughter.",
    calcInputs: [
      currencyField("yearlyDeposit", "Yearly Deposit (Max ₹1.5 Lakh)", { unit: "₹", default: 150000, max: 150000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (% per annum)", { default: 8.2, max: 15, step: 0.05 }),
      numberField("girlAge", "Daughter's Age When Opened", { default: 3, min: 0, max: 10, step: 1 }),
    ],
    calcResult: { label: "Maturity Value", format: "currency", currency: "INR" },
    calcResults: [
      { key: "totalDeposited", label: "Total Deposited (15 Years)", format: "currency", currency: "INR" },
      { key: "balanceAfterDeposits", label: "Balance After 15 Years", format: "currency", currency: "INR" },
      { key: "maturityAmount", label: "Maturity Value (21 Years)", format: "currency", currency: "INR", highlight: true },
      { key: "totalInterest", label: "Total Interest (Tax-Free)", format: "currency", currency: "INR" },
      { key: "ageAtMaturity", label: "Daughter's Age at Maturity", format: "number", currency: "INR" },
    ],
    instructions:
      "Sukanya Samriddhi Yojana is a government savings scheme for a girl child under 10. Deposit ₹250 to ₹1.5 lakh a year " +
      "for 15 years; the account keeps earning interest until it matures 21 years after opening. The rate (8.2% for recent " +
      "quarters) is set every quarter.\n\n" +
      "It's EEE under the old tax regime: deposits qualify for Section 80C, and both interest and maturity are tax-free. Up " +
      "to 50% can be withdrawn for education after she turns 18.",
    examples:
      "Example: depositing ₹1,50,000 a year for 15 years (₹22,50,000 in total) at 8.20% builds " +
      "₹44,75,989.33 by year 15 and ₹71,82,119.17 at maturity — ₹49,32,119.17 of tax-free interest, when " +
      "your daughter is 24.",
    assumptions:
      "Deposits made at the start of each financial year (by 5 April) and the rate stays the same throughout; it will " +
      "change. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How many SSY accounts can I open?",
        answer: "One per girl child and up to two per family (three in the case of twins or triplets in the second birth).",
      },
    ],
  },
  {
    slug: "provident-fund-interest-calculator",
    title: "Provident Fund Interest Calculator",
    description: "Project your EPF (Employees' Provident Fund) balance in rupees: your 12% and your employer's share, interest at the EPFO rate, and the corpus at retirement with salary growth.",
    metaTitle: "PF Calculator — EPF Interest & Retirement Corpus (₹)",
    metaDescription: "Free provident fund calculator. Project your EPF corpus with employee and employer contributions, salary growth and the 8.25% EPF rate.",
    calcInputs: [
      currencyField("monthlyBasic", "Monthly Basic Pay + DA", { unit: "₹", default: 30000, max: 10000000, step: 500 }),
      percentField("salaryGrowthPercent", "Salary Growth per Year", { default: 5, min: 0, max: 30, step: 0.5 }),
      numberField("years", "Years Until Retirement", { default: 25, min: 0, max: 45, step: 1 }),
      currencyField("currentBalance", "Current EPF Balance", { unit: "₹", default: 0, max: 1000000000, step: 1000, required: false }),
      percentField("annualRatePercent", "EPF Interest Rate", { default: 8.25, max: 15, step: 0.05 }),
      percentField("employeePercent", "Your Contribution", { default: 12, max: 100, step: 1 }),
    ],
    calcResult: { label: "EPF Corpus at Retirement", format: "currency", currency: "INR" },
    calcResults: [
      { key: "monthlyEmployeeContribution", label: "Your Monthly Contribution", format: "currency", currency: "INR" },
      { key: "monthlyEmployerToEpf", label: "Employer's Monthly EPF Share", format: "currency", currency: "INR" },
      { key: "totalEmployeeContribution", label: "Total Your Contributions", format: "currency", currency: "INR" },
      { key: "totalEmployerContribution", label: "Total Employer Contributions", format: "currency", currency: "INR" },
      { key: "totalInterest", label: "Total Interest", format: "currency", currency: "INR" },
      { key: "maturityAmount", label: "EPF Corpus at Retirement", format: "currency", currency: "INR", highlight: true },
    ],
    instructions:
      "You and your employer each contribute 12% of basic pay plus DA. Of the employer's 12%, 8.33% of wages up to ₹15,000 " +
      "(₹1,250 a month) goes to the Employees' Pension Scheme (EPS) and the rest to your EPF. EPFO sets the interest rate " +
      "each year (8.25% for 2024–25); interest is figured on the monthly running balance and credited once a year.\n\n" +
      "Raise your own contribution above 12% for the Voluntary Provident Fund (VPF), which earns the same rate.",
    examples:
      "Example: on ₹30,000 of basic pay, you put in ₹3,600 a month and your employer " +
      "₹2,350.50 to EPF. With 5% raises for 25 years at 8.25%, the " +
      "corpus reaches ₹95,59,222.36, of which ₹58,10,451.02 is interest.",
    assumptions:
      "Salary rises once a year; the rate stays the same. EPS pension benefits are not included. Interest on employee " +
      "contributions above ₹2.5 lakh a year is taxable. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is EPF interest tax-free?",
        answer: "Yes, if you've completed 5 years of continuous service when you withdraw, except interest on employee contributions above ₹2.5 lakh a year (₹5 lakh if the employer doesn't contribute).",
      },
    ],
  },
  {
    slug: "chit-fund-calculator",
    title: "Chit Fund Calculator",
    description: "Work out a chit fund in rupees: what you pay after dividends, what you receive when you win the auction, and your effective return — or borrowing cost — as an annual rate.",
    metaTitle: "Chit Fund Calculator — Return or Cost of a Chit (₹)",
    metaDescription: "Free chit fund calculator. See what you pay, what you receive in your auction month, and your effective annual return or borrowing cost.",
    calcInputs: [
      currencyField("chitValue", "Chit Value", { unit: "₹", default: 500000, max: 100000000, step: 10000 }),
      numberField("members", "Members (= Months)", { default: 20, min: 2, max: 100, step: 1 }),
      numberField("yourMonth", "Month You Take the Chit", { default: 3, min: 1, max: 100, step: 1 }),
      percentField("yourDiscountPercent", "Your Bid Discount", { default: 25, max: 40, step: 1 }),
      percentField("othersDiscountPercent", "Average Discount in Other Months", { default: 15, max: 40, step: 1 }),
      percentField("commissionPercent", "Foreman's Commission", { default: 5, max: 5, step: 0.5 }),
    ],
    calcResult: { label: "Effective Annual Rate", format: "percentage", currency: "INR" },
    calcResults: [
      { key: "monthlyContribution", label: "Monthly Contribution (Before Dividend)", format: "currency", currency: "INR" },
      { key: "amountYouReceive", label: "Amount You Receive", format: "currency", currency: "INR" },
      { key: "totalYouPay", label: "Total You Pay (After Dividends)", format: "currency", currency: "INR" },
      { key: "netGainOrCost", label: "Net Gain (or Cost if Negative)", format: "currency", currency: "INR" },
      { key: "annualizedRate", label: "Effective Annual Rate", format: "percentage", currency: "INR", highlight: true },
    ],
    instructions:
      "In a chit fund, every member pays a share each month, and the pot is auctioned: the member willing to take the " +
      "biggest discount wins it. The discount, less the foreman's commission (capped at 5% under the Chit Funds Act), is " +
      "shared among all members as a dividend that reduces their next payment.\n\n" +
      "Taking the chit early is like borrowing — the effective rate is your cost. Taking it late (with a small discount) " +
      "is like saving — the rate is your return. Only join chits registered with the state Registrar of Chits.",
    examples:
      "Example: in a ₹5,00,000 chit with 20 members, taking the pot in month 3 at a " +
      "25% discount gives you ₹3,75,000. Over the chit you pay ₹4,47,500 after dividends — " +
      "a net cost of -₹72,500, or an effective 34.63% a year, like an expensive loan.",
    assumptions:
      "Every other month's auction clears at the average discount you enter; the dividend is shared equally among all " +
      "members, including the winner. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a chit fund safe?",
        answer: "Registered chit funds are regulated by state governments under the Chit Funds Act, 1982, but they're not insured like bank deposits. Check registration and the company's track record.",
      },
    ],
  },
];

async function ensureCategory() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY.slug}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, then re-run this script.`
    );
  }
  return category;
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
