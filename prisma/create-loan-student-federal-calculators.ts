// One-time (but safe to re-run) batch setup script: creates the Student Loan tools
// (7) of the Loan Calculators expansion 6, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-student-federal.ts for the math and the batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-student-federal-calculators.ts
// or
//   npm run db:create-loan-student-federal-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "General Loan Calculators", slug: "general-loan-calculators" };

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
    slug: "graduate-student-loan-calculator",
    title: "Graduate Student Loan Calculator",
    description: "Estimate what a graduate or professional degree costs to borrow: the loan after fees, interest that builds while you study, your monthly payment, and any amount above the federal limit.",
    metaTitle: "Graduate Student Loan Calculator — Payment & Interest",
    metaDescription: "Free graduate student loan calculator. See the loan after fees, interest built up during school, your monthly payment and the federal limit gap.",
    calcInputs: [
      currencyField("amountNeededPerYear", "Amount You Need Each Year", { default: 20000, max: 200000, step: 500 }),
      numberField("programYears", "Years in Program", { default: 2, min: 1, max: 8, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 7.94, max: 20, step: 0.01 }),
      percentField("feePercent", "Origination Fee", { default: 1.057, max: 10, step: 0.001, required: false }),
      numberField("graceMonths", "Grace Period (Months)", { default: 6, min: 0, max: 12, step: 1 }),
      numberField("repaymentYears", "Repayment Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      currencyField("annualLimit", "Federal Annual Limit", { default: 20500, max: 200000, step: 500 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanPerYear", label: "Loan per Year (Incl. Fee)", format: "currency" },
      { key: "totalBorrowed", label: "Total Borrowed", format: "currency" },
      { key: "interestBeforeRepayment", label: "Interest Built Up Before Repayment", format: "currency" },
      { key: "balanceAtRepayment", label: "Balance When Repayment Starts", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "amountOverFederalLimit", label: "Amount Above the Federal Limit", format: "currency" },
    ],
    instructions:
      "Enter what you need each year for tuition and living costs, how long your program runs, and the loan's rate and " +
      "fee. The calculator grosses up each year's loan so that the amount left after the fee covers your need. Interest " +
      "on graduate Direct Unsubsidized loans starts at disbursement and is added to the balance when repayment begins.\n\n" +
      "From July 1, 2026, Grad PLUS loans closed to new borrowers and the federal limit is $20,500 a year ($50,000 for " +
      "professional programs such as medicine or law — change the limit field to match). Anything above the limit has " +
      "to come from savings, school aid or a private loan.",
    examples:
      "Example: needing $20,000 a year for a 2-year master's means borrowing $20,213.66 a " +
      "year after the fee — $40,427.32 in all. By the end of the grace period, $6,419.86 of interest " +
      "has built up, so you start repaying $46,847.17. Over 10 years at 7.94% " +
      "that's $566.90 a month and $27,600.84 of interest.",
    assumptions:
      "Each year's loan is disbursed at the start of that year, and simple interest accrues until repayment, when unpaid " +
      "interest is capitalized. The default rate (7.94%) and fee (1.057%) applied to graduate loans for 2025–26; rates reset " +
      "every July 1. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I still get a Grad PLUS loan?",
        answer: "Only if you already had one for your current program before July 1, 2026 — those borrowers can keep borrowing for up to three more years. New graduate borrowers are limited to Direct Unsubsidized loans.",
      },
      {
        question: "Should I pay the interest while I'm in school?",
        answer: "If you can, yes. Paying the interest as it builds up keeps it from being added to your balance, so your monthly payment and total interest are both lower.",
      },
    ],
  },
  {
    slug: "parent-plus-loan-calculator",
    title: "Parent PLUS Loan Calculator",
    description: "Estimate a Parent PLUS loan for your child's college: the 4.228% fee, deferring vs repaying while they study, your monthly payment, total interest, and the new $20,000 annual cap.",
    metaTitle: "Parent PLUS Loan Calculator — Payment, Fee & Cap",
    metaDescription: "Free Parent PLUS loan calculator. See the fee, your monthly payment if you defer or repay now, total interest and the $20,000 annual cap.",
    calcInputs: [
      currencyField("amountNeededPerYear", "Amount Needed Each Year", { default: 15000, max: 200000, step: 500 }),
      numberField("years", "Years of College", { default: 4, min: 1, max: 6, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 8.94, max: 20, step: 0.01 }),
      percentField("feePercent", "Origination Fee", { default: 4.228, max: 10, step: 0.001, required: false }),
      {
        key: "defer", label: "While Your Child Is in School", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Defer Payments (Interest Builds Up)", value: 1 },
          { label: "Start Repaying Each Loan Right Away", value: 0 },
        ],
      },
      numberField("termYears", "Repayment Term (Years)", { default: 10, min: 1, max: 30, step: 1 }),
      currencyField("annualCap", "Annual Cap per Student", { default: 20000, max: 200000, step: 500 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "loanPerYear", label: "Loan per Year (Incl. Fee)", format: "currency" },
      { key: "totalBorrowed", label: "Total Borrowed", format: "currency" },
      { key: "originationFees", label: "Origination Fees", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "paidDuringCollege", label: "Paid While Your Child Is in School", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalRepaid", label: "Total Repaid", format: "currency" },
      { key: "amountOverAnnualCap", label: "Amount Above the Annual Cap", format: "currency" },
    ],
    instructions:
      "Enter what you need each year after grants, scholarships and your child's own loans. The fee comes out of each " +
      "disbursement, so the calculator borrows enough to leave the amount you need.\n\n" +
      "If you defer, no payments are due until six months after your child leaves school, but interest builds up and is " +
      "added to the balance. If you repay right away, each year's loan starts its own payment, so the monthly payment " +
      "shown is the highest point, when every loan is being repaid at once.",
    examples:
      "Example: $15,000 a year for 4 years means borrowing $15,662.20 a year — " +
      "$62,648.79 in all, of which $2,648.79 goes to fees. Deferring until six months after graduation and " +
      "repaying over 10 years at 8.94% costs $1,003.88 a month and $57,816.34 of " +
      "interest, $120,465.13 in total.",
    assumptions:
      "Loans are disbursed at the start of each school year. Deferred interest is simple and capitalized when repayment " +
      "begins. The default rate (8.94%) applied to 2025–26 PLUS loans and resets every July 1. From July 1, 2026, Parent " +
      "PLUS borrowing is capped at $20,000 a year and $65,000 in total per student. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can Parent PLUS loans use income-driven repayment?",
        answer: "Only after consolidation, and the rules narrowed under the 2025 law. Parent PLUS loans made from July 1, 2026 can't use the Repayment Assistance Plan, so plan on the standard payment.",
      },
      {
        question: "Does my child have to repay a Parent PLUS loan?",
        answer: "No. The parent is the borrower and is legally responsible. It can't be transferred to the student, though the student can pay it informally or refinance it later with a private lender.",
      },
    ],
  },
  {
    slug: "private-student-loan-calculator",
    title: "Private Student Loan Calculator",
    description: "Compare a private student loan's in-school options — defer, pay interest only, pay $25 a month, or full payments — and see the balance, monthly payment and total cost of each.",
    metaTitle: "Private Student Loan Calculator — In-School Options",
    metaDescription: "Free private student loan calculator. Compare deferring, interest-only, $25 a month or full payments in school and see each total cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 30000, max: 500000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9.5, max: 20, step: 0.05 }),
      numberField("termYears", "Repayment Term (Years)", { default: 10, min: 5, max: 20, step: 1 }),
      numberField("schoolMonths", "Months in School + Grace", { default: 48, min: 0, max: 96, step: 1 }),
      {
        key: "inSchoolOption", label: "Payments While in School", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Defer (No Payments)", value: 1 },
          { label: "Interest Only", value: 2 },
          { label: "Fixed $25 a Month", value: 3 },
          { label: "Full Payments Right Away", value: 4 },
        ],
      },
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "paymentWhileInSchool", label: "Monthly Payment While in School", format: "currency" },
      { key: "totalPaidInSchool", label: "Total Paid While in School", format: "currency" },
      { key: "balanceAtRepayment", label: "Balance When Repayment Starts", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment After School", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the loan amount, the rate your lender offered, the repayment term, and how many months you'll be in school " +
      "plus the grace period. Then switch between the four in-school options to see how much each one saves.\n\n" +
      "Private lenders set rates by credit score, so a creditworthy cosigner often gets a lower rate. Use federal loans " +
      "first — they have fixed rates set by law, income-driven plans and forgiveness that private loans don't offer.",
    examples:
      "Example: $30,000 at 9.50% with payments deferred for 48 months grows to " +
      "$41,400 by the time repayment starts. Repaid over 10 years, that's $535.71 a " +
      "month and $64,284.71 in total — $34,284.71 of it interest. Paying the interest while in school brings the " +
      "total down.",
    assumptions:
      "Fixed rate. Interest accrues as simple interest while you're in school and is capitalized once, when repayment " +
      "begins; some lenders capitalize more often. With full payments, the term starts at disbursement. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a private student loan worth it?",
        answer: "Only for the gap left after federal loans, grants and savings. Compare offers from several lenders — most use a soft credit check to show your rate.",
      },
      {
        question: "Can I remove a cosigner later?",
        answer: "Many lenders allow cosigner release after 12–48 on-time payments if you meet their credit and income requirements on your own.",
      },
    ],
  },
  {
    slug: "federal-student-loan-calculator",
    title: "Federal Student Loan Calculator",
    description: "Estimate undergraduate Direct Loans: subsidized and unsubsidized amounts, the interest unsubsidized loans build in school, the fee, and your standard monthly payment.",
    metaTitle: "Federal Student Loan Calculator — Subsidized vs Unsub",
    metaDescription: "Free federal student loan calculator. Enter subsidized and unsubsidized loans to see in-school interest, the fee, your payment and total interest.",
    calcInputs: [
      currencyField("subsidizedPerYear", "Subsidized Loan per Year", { default: 4250, max: 20000, step: 250 }),
      currencyField("unsubsidizedPerYear", "Unsubsidized Loan per Year", { default: 2500, max: 50000, step: 250 }),
      numberField("yearsInSchool", "Years in School", { default: 4, min: 1, max: 6, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 6.39, max: 15, step: 0.01 }),
      percentField("feePercent", "Origination Fee", { default: 1.057, max: 10, step: 0.001, required: false }),
      numberField("graceMonths", "Grace Period (Months)", { default: 6, min: 0, max: 12, step: 1 }),
      numberField("repaymentYears", "Repayment Term (Years)", { default: 10, min: 1, max: 25, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalBorrowed", label: "Total Borrowed", format: "currency" },
      { key: "netReceivedAfterFees", label: "Received After Fees", format: "currency" },
      { key: "unsubsidizedInterestInSchool", label: "Unsubsidized Interest Built Up", format: "currency" },
      { key: "balanceAtRepayment", label: "Balance When Repayment Starts", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalRepaid", label: "Total Repaid", format: "currency" },
    ],
    instructions:
      "Enter the average subsidized and unsubsidized amounts from your financial aid offers. The government pays the " +
      "interest on subsidized loans while you're in school and during the grace period; unsubsidized interest builds up " +
      "and is added to your balance.\n\n" +
      "Dependent undergraduates can borrow $5,500, $6,500 and then $7,500 a year (no more than $3,500, $4,500 and " +
      "$5,500 of it subsidized). For loans made from July 1, 2026, the standard plan runs 10 to 25 years depending on " +
      "what you owe — set the term to match.",
    examples:
      "Example: $4,250 subsidized and $2,500 unsubsidized a year for 4 years " +
      "is $27,000 borrowed ($26,714.61 after fees). The unsubsidized loans build up " +
      "$1,917 of interest, so repayment starts at $28,917. Over 10 " +
      "years at 6.39%, that's $326.73 a month and $12,207.67 of interest.",
    assumptions:
      "One rate for all years for simplicity; in reality each year's loans keep the rate set that July 1 (6.39% for 2025–26 " +
      "undergraduate loans). Loans are disbursed at the start of each year; the fee is 1.057%. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between subsidized and unsubsidized loans?",
        answer: "Subsidized loans are based on financial need and the government pays the interest while you're in school at least half-time. Unsubsidized loans charge interest from the day they're paid out.",
      },
      {
        question: "When do I start repaying?",
        answer: "Six months after you graduate, leave school or drop below half-time enrollment.",
      },
    ],
  },
  {
    slug: "student-loan-forgiveness-calculator",
    title: "Student Loan Forgiveness Calculator",
    description: "Estimate how much of your federal student loans could be forgiven through Public Service Loan Forgiveness or an income-driven plan, the tax on it, and how that compares with the standard plan.",
    metaTitle: "Student Loan Forgiveness Calculator — PSLF, IBR & RAP",
    metaDescription: "Free student loan forgiveness calculator. Estimate payments, the amount forgiven under PSLF, IBR or RAP, tax owed and savings vs standard.",
    calcInputs: [
      currencyField("balance", "Current Loan Balance", { default: 60000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Weighted Average)", { default: 6.8, max: 15, step: 0.01 }),
      currencyField("agi", "Adjusted Gross Income (AGI)", { default: 55000, max: 1000000, step: 500 }),
      percentField("incomeGrowthPercent", "Income Growth per Year", { default: 3, min: -10, max: 20, step: 0.5 }),
      numberField("familySize", "Family Size", { default: 1, min: 1, max: 12, step: 1 }),
      numberField("dependents", "Dependents (for RAP)", { default: 0, min: 0, max: 10, step: 1, required: false }),
      currencyField("povertyGuideline", "Poverty Guideline (1-Person)", { default: 15650, max: 50000, step: 10 }),
      {
        key: "plan", label: "Repayment Plan", type: "dropdown", required: true, default: 1,
        options: [
          { label: "IBR — Borrowed After July 2014 (10%, 20 Years)", value: 1 },
          { label: "IBR — Older Loans (15%, 25 Years)", value: 2 },
          { label: "Repayment Assistance Plan (RAP, 30 Years)", value: 3 },
        ],
      },
      {
        key: "pslf", label: "Public Service Loan Forgiveness?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Government or Nonprofit Job (10 Years)", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      numberField("yearsAlreadyPaid", "Years of Qualifying Payments Made", { default: 0, min: 0, max: 30, step: 0.5, required: false }),
      percentField("taxRatePercent", "Tax Rate on Forgiven Amount", { default: 22, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Amount Forgiven", format: "currency" },
    calcResults: [
      { key: "firstMonthlyPayment", label: "First Monthly Payment", format: "currency" },
      { key: "monthsOfPayments", label: "Months of Payments", format: "number" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
      { key: "amountForgiven", label: "Amount Forgiven", format: "currency", highlight: true },
      { key: "taxOnForgiveness", label: "Tax on Forgiveness", format: "currency" },
      { key: "totalCost", label: "Total Cost (Paid + Tax)", format: "currency" },
      { key: "standardPlanTotal", label: "Total on 10-Year Standard Plan", format: "currency" },
      { key: "savingsVsStandard", label: "Savings vs Standard Plan", format: "currency" },
    ],
    instructions:
      "Enter your federal loan balance, rate and income, then choose the income-driven plan you're on. If you work full " +
      "time for a government or nonprofit employer, choose PSLF: what's left after 120 qualifying payments (10 years) is " +
      "forgiven tax-free. Otherwise the balance is forgiven at the end of the plan, and that amount is taxed as income.\n\n" +
      "A negative saving means paying off the loan on the standard plan would cost less. If the loan is paid off before " +
      "forgiveness, the amount forgiven is zero.",
    examples:
      "Example: $60,000 at 6.80% on IBR with a $55,000 income starts at $262.71 a month. " +
      "With PSLF, after 120 payments totaling $39,576.34, the remaining $61,223.66 is forgiven " +
      "tax-free — $43,281.50 less than the $82,857.84 the standard plan would cost.",
    assumptions:
      "Income grows once a year; the poverty guideline and family size stay the same (the default is the 2025 HHS figure " +
      "for the 48 states, plus $5,500 per extra person — use the latest one). IBR payments are capped at the standard " +
      "payment, and unpaid interest builds up without being capitalized. RAP waives unpaid interest and reduces principal " +
      "by at least $50 a month. IDR forgiveness is federally taxable from 2026; some states tax it too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happened to SAVE and PAYE?",
        answer: "The 2025 law ended SAVE, and PAYE and ICR close by July 1, 2028. Existing borrowers can move to IBR or the new Repayment Assistance Plan; loans made from July 1, 2026 can use only RAP or the standard plan.",
      },
      {
        question: "Do payments made before count toward forgiveness?",
        answer: "Yes. Enter the years of qualifying payments you've already made — your count is shown in your account on StudentAid.gov.",
      },
    ],
  },
  {
    slug: "student-loan-consolidation-calculator",
    title: "Student Loan Consolidation Calculator",
    description: "Combine up to three federal student loans into a Direct Consolidation Loan: the weighted average rate rounded up to 1/8%, the new term, your new payment, and the extra interest a longer term adds.",
    metaTitle: "Student Loan Consolidation Calculator — Federal Direct",
    metaDescription: "Free student loan consolidation calculator. See the consolidated rate, new term and payment, and the extra interest compared with your current loans.",
    calcInputs: [
      currencyField("balance1", "Loan 1 Balance", { default: 12000, max: 1000000, step: 100 }),
      percentField("rate1Percent", "Loan 1 Rate", { default: 5.5, max: 15, step: 0.01 }),
      currencyField("balance2", "Loan 2 Balance", { default: 8000, max: 1000000, step: 100, required: false }),
      percentField("rate2Percent", "Loan 2 Rate", { default: 6.54, max: 15, step: 0.01, required: false }),
      currencyField("balance3", "Loan 3 Balance", { default: 15000, max: 1000000, step: 100, required: false }),
      percentField("rate3Percent", "Loan 3 Rate", { default: 7.05, max: 15, step: 0.01, required: false }),
      numberField("remainingMonths", "Months Left on Current Loans", { default: 96, min: 1, max: 360, step: 1 }),
      numberField("termYears", "Consolidation Term (Years, 0 = Standard)", { default: 0, min: 0, max: 30, step: 1, required: false }),
    ],
    calcResult: { label: "New Monthly Payment", format: "currency" },
    calcResults: [
      { key: "totalBalance", label: "Total Balance", format: "currency" },
      { key: "weightedAverageRate", label: "Weighted Average Rate", format: "percentage" },
      { key: "consolidatedRate", label: "Consolidated Rate", format: "percentage" },
      { key: "consolidationTermYears", label: "Consolidation Term (Years)", format: "number" },
      { key: "currentMonthlyPayment", label: "Current Monthly Payments", format: "currency" },
      { key: "newMonthlyPayment", label: "New Monthly Payment", format: "currency", highlight: true },
      { key: "currentRemainingInterest", label: "Interest Left on Current Loans", format: "currency" },
      { key: "newTotalInterest", label: "Interest on Consolidation Loan", format: "currency" },
      { key: "extraInterestFromConsolidating", label: "Extra Interest From Consolidating", format: "currency" },
    ],
    instructions:
      "Enter each federal loan's balance and rate (leave unused loans at zero) and how many months you have left. A " +
      "Direct Consolidation Loan's rate is the weighted average of your loans, rounded up to the next 1/8 of a percent, " +
      "so consolidation never lowers your rate. Leave the term at 0 to use the standard term for your balance (10 to 30 " +
      "years), or enter a shorter one.\n\n" +
      "To get a lower rate, you'd need to refinance with a private lender instead — see the student loan refinance " +
      "calculator — but that gives up federal protections such as income-driven plans and forgiveness.",
    examples:
      "Example: three loans totaling $35,000 have a weighted average rate of 6.40%, which rounds " +
      "up to 6.50%. On the standard 20-year term, the payment drops from " +
      "$466.92 to $260.95 a month, but interest rises from $9,824.18 to " +
      "$27,628.14 — $17,803.97 more.",
    assumptions:
      "All current loans are paid off over the same number of months. The consolidated rate is capped at 8.25%. Standard " +
      "terms by balance: under $7,500 10 years, under $10,000 12, under $20,000 15, under $40,000 20, under $60,000 25, " +
      "otherwise 30. Consolidation has no fee. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why consolidate if it doesn't lower my rate?",
        answer: "To get one payment, to make older FFEL or Perkins loans eligible for PSLF or income-driven plans, or to lower the monthly payment with a longer term.",
      },
      {
        question: "Does consolidating reset my forgiveness progress?",
        answer: "The new loan generally carries a weighted average of the qualifying payments already made on the loans you combined. Check your count on StudentAid.gov before and after.",
      },
    ],
  },
  {
    slug: "income-driven-repayment-loan-calculator",
    title: "Income-Driven Repayment Loan Calculator",
    description: "Estimate your federal student loan payment under income-driven plans — IBR at 10% or 15% and the new Repayment Assistance Plan (RAP) — compared with the 10-year standard payment.",
    metaTitle: "Income-Driven Repayment Calculator — IBR & RAP Payment",
    metaDescription: "Free income-driven repayment calculator. Compare your monthly student loan payment under IBR and RAP with the 10-year standard plan.",
    calcInputs: [
      currencyField("agi", "Adjusted Gross Income (AGI)", { default: 55000, max: 1000000, step: 500 }),
      numberField("familySize", "Family Size", { default: 1, min: 1, max: 12, step: 1 }),
      numberField("dependents", "Dependents (for RAP)", { default: 0, min: 0, max: 10, step: 1, required: false }),
      currencyField("povertyGuideline", "Poverty Guideline (1-Person)", { default: 15650, max: 50000, step: 10 }),
      currencyField("balance", "Federal Loan Balance", { default: 40000, max: 1000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Weighted Average)", { default: 6.8, max: 15, step: 0.01 }),
      {
        key: "plan", label: "Plan to Show", type: "dropdown", required: true, default: 3,
        options: [
          { label: "IBR — Borrowed After July 2014 (10%)", value: 1 },
          { label: "IBR — Older Loans (15%)", value: 2 },
          { label: "Repayment Assistance Plan (RAP)", value: 3 },
        ],
      },
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "discretionaryIncome", label: "Discretionary Income (IBR)", format: "currency" },
      { key: "standardPayment", label: "10-Year Standard Payment", format: "currency" },
      { key: "ibrNewBorrowerPayment", label: "IBR Payment (10%)", format: "currency" },
      { key: "ibrOlderBorrowerPayment", label: "IBR Payment (15%)", format: "currency" },
      { key: "rapPayment", label: "RAP Payment", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "savingsVsStandard", label: "Monthly Savings vs Standard", format: "currency" },
      { key: "monthlyInterest", label: "Monthly Interest Charged", format: "currency" },
    ],
    instructions:
      "Enter your AGI from your latest tax return, your family size and number of dependents, and your federal loan " +
      "balance and rate.\n\n" +
      "IBR charges 10% (loans first taken after July 1, 2014) or 15% of income above 150% of the poverty guideline, never " +
      "more than the standard payment. RAP charges 1% to 10% of your whole AGI — 1% more for each $10,000 above $10,000 — " +
      "minus $50 per dependent, with a $10 minimum. If your payment is below the monthly interest, RAP waives the rest, " +
      "while under IBR it keeps building up.",
    examples:
      "Example: with a $55,000 AGI and a family of 1, discretionary income for IBR is $31,525. On " +
      "a $40,000 balance at 6.80%, the standard payment is $460.32; IBR is " +
      "$262.71 at 10% or $394.06 at 15%, and RAP is $229.17 — " +
      "$231.15 a month less than the standard plan.",
    assumptions:
      "The default poverty guideline is the 2025 HHS figure for the 48 states, plus $5,500 per extra person — use the " +
      "latest one (Alaska and Hawaii are higher). Married borrowers filing jointly use combined AGI. RAP opened July 1, 2026; " +
      "SAVE has ended and PAYE and ICR close by July 1, 2028. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which income-driven plan is best?",
        answer: "Usually the one with the lowest payment if you're aiming for forgiveness, especially PSLF. If you plan to pay the loan off, a higher payment saves interest. Use the student loan forgiveness calculator to compare total cost.",
      },
      {
        question: "Do I have to recertify my income?",
        answer: "Yes, once a year. Your payment changes with your income and family size.",
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
