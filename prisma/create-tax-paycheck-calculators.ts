// One-time (but safe to re-run) batch setup script: creates the new "Tax &
// Paycheck Calculators" Tool Category (if it doesn't already exist yet)
// and its first 8 Tools — the payroll-withholding-focused sibling to the
// existing "Tax Calculators" category.
//
// See src/lib/calc-engine-fica-paycheck-calculators.ts for the actual math
// and which of its exported functions each of these 8 slugs maps to, and
// that file's header for why only 8 of the original 10-item list are
// here (Long/Short Term Capital Gains Tax Calculator already exist
// verbatim under the "Tax Calculators" category, so weren't duplicated).
//
// HOW TO RUN
//   npx tsx prisma/create-tax-paycheck-calculators.ts
// or
//   npm run db:create-tax-paycheck-calculators
//
// Every tool is created with status "draft" — review each one in
// /admin/tools and publish when you're happy with it, same as every other
// calculator on this site.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

// ---------------------------------------------------------------------------
// Shared field building blocks
// ---------------------------------------------------------------------------

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
    max: opts.max ?? 500000,
    step: opts.step ?? 500,
  };
}

const filingStatusField = {
  key: "filingStatus",
  label: "Filing Status",
  type: "dropdown",
  required: true,
  default: 0,
  options: [
    { label: "Single", value: 0 },
    { label: "Married Filing Jointly", value: 1 },
    { label: "Married Filing Separately", value: 2 },
    { label: "Head of Household", value: 3 },
  ],
};

const payFrequencyField = {
  key: "payFrequency",
  label: "Pay Frequency",
  type: "dropdown",
  required: true,
  default: 26,
  options: [
    { label: "Weekly (52 paychecks/year)", value: 52 },
    { label: "Biweekly (26 paychecks/year)", value: 26 },
    { label: "Semi-Monthly (24 paychecks/year)", value: 24 },
    { label: "Monthly (12 paychecks/year)", value: 12 },
    { label: "Annually (1 payment/year)", value: 1 },
  ],
};

const annualWagesField = currencyField("annualWages", "Annual Wages (Gross)", { unit: "per year", max: 400000 });

// ---------------------------------------------------------------------------
// Shared copy blocks
// ---------------------------------------------------------------------------

const FICA_ASSUMPTIONS =
  "This calculator uses 2026 federal FICA figures: 6.2% Social Security on wages up to the $184,500 wage " +
  "base, 1.45% Medicare with no cap, and the 0.9% Additional Medicare Tax above your filing status's " +
  "threshold. These are the employee-side rates withheld from a W-2 paycheck — your employer separately pays " +
  "a matching 7.65% (without the Additional Medicare piece), which doesn't come out of your pay and isn't " +
  "shown here. Self-employed visitors should use the Self-Employment Tax family under Tax Calculators instead, " +
  "which uses the combined 15.3% SECA rate on net profit.\n\n" +
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice.";

const FICA_FAQ = {
  question: "Is this the same as my employer's share?",
  answer:
    "No — this is only the amount withheld from your own paycheck. Your employer separately pays a matching " +
    "6.2% Social Security and 1.45% Medicare (no Additional Medicare match) on top of your wages, which never " +
    "shows up on your pay stub and isn't included in these figures.",
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "fica-tax-calculator",
    title: "FICA Tax Calculator",
    description:
      "Calculate your combined FICA tax — Social Security, Medicare, and Additional Medicare where it applies " +
      "— from your annual wages.",
    metaTitle: "FICA Tax Calculator — Free & Instant",
    metaDescription:
      "Free FICA tax calculator. Enter your annual wages to see the combined Social Security and Medicare tax " +
      "withheld from your paycheck.",
    calcInputs: [annualWagesField, filingStatusField, payFrequencyField],
    calcResult: { label: "Total FICA Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Tax (6.2%)", format: "currency" },
      { key: "medicareTax", label: "Medicare Tax (1.45%)", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax (0.9%)", format: "currency" },
      { key: "totalFicaTax", label: "Total FICA Tax", format: "currency", highlight: true },
      { key: "perPaycheckFica", label: "Per Paycheck", format: "currency" },
      { key: "wagesAfterFica", label: "Wages After FICA", format: "currency" },
    ],
    instructions:
      "Enter your annual gross wages and filing status. FICA (Federal Insurance Contributions Act) tax is the " +
      "Social Security and Medicare withholding shown on every W-2 paycheck — this calculator breaks it into " +
      "its three pieces and totals them.\n\n" +
      "Social Security is 6.2% up to the annual wage base ($184,500 for 2026) — wages above that aren't taxed " +
      "further for Social Security. Medicare is 1.45% with no cap at all. Additional Medicare adds another " +
      "0.9%, but only on wages above your filing status's threshold.",
    examples:
      "Example: $80,000 in annual wages (Single) owes $4,960.00 in Social Security tax and $1,160.00 in " +
      "Medicare tax — no Additional Medicare applies below the $200,000 threshold — for $6,120.00 total FICA " +
      "tax, or $235.38 per biweekly paycheck.",
    assumptions: FICA_ASSUMPTIONS,
    faq: [
      FICA_FAQ,
      {
        question: "Why does Social Security stop but Medicare doesn't?",
        answer:
          "By design — Social Security tax only applies up to an annually-adjusted wage base ($184,500 for " +
          "2026), a limit tied to the maximum benefit the program pays out. Medicare has no such cap and no " +
          "such benefit ceiling, so it applies to every dollar of wages.",
      },
      {
        question: "What triggers the Additional Medicare Tax?",
        answer:
          "Wages above $200,000 (Single, Head of Household), $250,000 (Married Filing Jointly), or $125,000 " +
          "(Married Filing Separately) — fixed dollar thresholds set by law, not adjusted for inflation.",
      },
    ],
  },
  {
    slug: "social-security-tax-calculator",
    title: "Social Security Tax Calculator",
    description: "Calculate the 6.2% employee-side Social Security tax withheld from your wages, capped at the annual wage base.",
    metaTitle: "Social Security Tax Calculator — Free & Instant",
    metaDescription:
      "Free Social Security tax calculator. Enter your annual wages to see your 6.2% Social Security " +
      "withholding, capped at the 2026 wage base.",
    calcInputs: [annualWagesField, payFrequencyField],
    calcResult: { label: "Social Security Tax", format: "currency" },
    calcResults: [
      { key: "socialSecurityTax", label: "Social Security Tax", format: "currency", highlight: true },
      { key: "perPaycheckTax", label: "Per Paycheck", format: "currency" },
      { key: "taxableWages", label: "Wages Subject to Social Security Tax", format: "currency" },
      { key: "wagesAboveWageBase", label: "Wages Above the Wage Base (Untaxed)", format: "currency" },
    ],
    instructions:
      "Enter your annual gross wages and how often you're paid. Social Security tax is withheld at 6.2% of " +
      "wages, but only up to the annual wage base ($184,500 for 2026) — any wages above that aren't taxed " +
      "further for Social Security for the rest of the year.\n\n" +
      "If you switch jobs mid-year, each employer withholds up to the wage base independently — if your " +
      "combined wages from both jobs exceed it, you may have overpaid and can claim the excess back on your " +
      "tax return. This calculator assumes one employer for the full year.",
    examples:
      "Example: $200,000 in annual wages has $184,500 subject to Social Security tax, owing $11,439.00 for the " +
      "year — the remaining $15,500 of wages isn't taxed further for Social Security.",
    assumptions: FICA_ASSUMPTIONS,
    faq: [
      {
        question: "What is the Social Security wage base?",
        answer:
          "The maximum amount of annual wages subject to Social Security tax — $184,500 for 2026, adjusted " +
          "most years for national average wage growth. Above it, wages stop being taxed for Social Security " +
          "(but not for Medicare, which has no cap).",
      },
      {
        question: "I had two employers this year and think I overpaid — is that possible?",
        answer:
          "Yes. Each employer withholds Social Security tax independently up to the wage base, so working " +
          "multiple jobs in one year can push your combined withholding above the annual maximum. You can " +
          "claim the excess as a credit on your federal income tax return.",
      },
      FICA_FAQ,
    ],
  },
  {
    slug: "medicare-tax-calculator",
    title: "Medicare Tax Calculator",
    description: "Calculate the 1.45% employee-side Medicare tax withheld from your wages — uncapped, on every dollar.",
    metaTitle: "Medicare Tax Calculator — Free & Instant",
    metaDescription:
      "Free Medicare tax calculator. Enter your annual wages to see your 1.45% Medicare withholding, with no " +
      "wage cap.",
    calcInputs: [annualWagesField, payFrequencyField],
    calcResult: { label: "Medicare Tax", format: "currency" },
    calcResults: [
      { key: "medicareTax", label: "Medicare Tax", format: "currency", highlight: true },
      { key: "perPaycheckTax", label: "Per Paycheck", format: "currency" },
    ],
    instructions:
      "Enter your annual gross wages and how often you're paid. Medicare tax is withheld at a flat 1.45% of " +
      "every dollar of wages — unlike Social Security, there's no wage base cap.\n\n" +
      "If your wages are high enough to trigger the Additional Medicare Tax (an extra 0.9% above a filing-" +
      "status threshold), use the Additional Medicare Tax Calculator alongside this one — this tool only " +
      "covers the base 1.45% every employee pays.",
    examples: "Example: $120,000 in annual wages owes $1,740.00 in Medicare tax for the year, or $66.92 per biweekly paycheck.",
    assumptions: FICA_ASSUMPTIONS,
    faq: [
      {
        question: "Does Medicare tax have a wage cap like Social Security?",
        answer:
          "No — the base 1.45% Medicare rate applies to every dollar of wages with no upper limit. Only the " +
          "extra 0.9% Additional Medicare Tax is conditional, and even that has no cap once it kicks in above " +
          "the threshold.",
      },
      FICA_FAQ,
    ],
  },
  {
    slug: "additional-medicare-tax-calculator",
    title: "Additional Medicare Tax Calculator",
    description:
      "Calculate the extra 0.9% Additional Medicare Tax on wages above your filing status's threshold.",
    metaTitle: "Additional Medicare Tax Calculator — Free & Instant",
    metaDescription:
      "Free Additional Medicare Tax calculator. Enter your annual wages and filing status to see if you owe " +
      "the extra 0.9% Medicare surtax.",
    calcInputs: [annualWagesField, filingStatusField],
    calcResult: { label: "Additional Medicare Tax", format: "currency" },
    calcResults: [
      { key: "threshold", label: "Your Filing Status's Threshold", format: "currency" },
      { key: "wagesOverThreshold", label: "Wages Over the Threshold", format: "currency" },
      { key: "additionalMedicareTax", label: "Additional Medicare Tax", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your annual gross wages and filing status. The Additional Medicare Tax adds an extra 0.9% on top " +
      "of the regular 1.45% Medicare rate, but only on wages above a fixed dollar threshold that depends on " +
      "your filing status — $200,000 for Single/Head of Household, $250,000 for Married Filing Jointly, or " +
      "$125,000 for Married Filing Separately.\n\n" +
      "These thresholds are set by law and don't adjust for inflation, so they stay the same from year to " +
      "year until Congress changes them.",
    examples:
      "Example: $250,000 in annual wages (Single, $200,000 threshold) has $50,000 over the threshold, owing " +
      "$450.00 in Additional Medicare Tax.",
    assumptions: FICA_ASSUMPTIONS,
    faq: [
      {
        question: "Does my employer automatically withhold this?",
        answer:
          "Only partly — employers must withhold the extra 0.9% once your wages from THEM cross $200,000, " +
          "regardless of your filing status. If you're married filing jointly with a lower-earning spouse, or " +
          "have income from more than one job, your employer's withholding may not match what you actually " +
          "owe — this calculator uses your correct filing-status threshold either way.",
      },
      {
        question: "Does this apply to self-employment income too?",
        answer:
          "Yes, in the same way, on net self-employment earnings — see the Self-Employment Tax family under " +
          "Tax Calculators, and the Estimated Tax Calculator on this page, both of which factor it in.",
      },
    ],
  },
  {
    slug: "dividend-tax-calculator",
    title: "Dividend Tax Calculator",
    description:
      "Calculate federal tax on your dividend income — qualified dividends at preferential capital-gains " +
      "rates, ordinary dividends at your regular income tax rate.",
    metaTitle: "Dividend Tax Calculator — Free & Instant",
    metaDescription:
      "Free dividend tax calculator. Enter your qualified and ordinary dividends, other income, and filing " +
      "status to see the federal tax on each.",
    calcInputs: [
      currencyField("otherIncome", "Other Taxable Income (Before Dividends)", { unit: "per year", max: 700000 }),
      currencyField("ordinaryDividends", "Ordinary (Non-Qualified) Dividends", { unit: "per year", max: 200000 }),
      currencyField("qualifiedDividends", "Qualified Dividends", { unit: "per year", max: 200000 }),
      filingStatusField,
    ],
    calcResult: { label: "Total Dividend Tax", format: "currency" },
    calcResults: [
      { key: "ordinaryDividendTax", label: "Tax on Ordinary Dividends", format: "currency" },
      { key: "qualifiedDividendTax", label: "Tax on Qualified Dividends", format: "currency" },
      { key: "totalDividendTax", label: "Total Dividend Tax", format: "currency", highlight: true },
      { key: "netDividends", label: "Dividends After Tax", format: "currency" },
      { key: "effectiveRate", label: "Effective Rate on Dividends", format: "percentage" },
    ],
    instructions:
      "Enter your other taxable income (wages, business income, etc. — everything except the dividends you're " +
      "analyzing), your ordinary and qualified dividend amounts separately (your 1099-DIV shows both), and " +
      "your filing status.\n\n" +
      "Qualified dividends (from most US corporations and many funds, held long enough to qualify) are taxed " +
      "at the same preferential 0%/15%/20% rates as long-term capital gains. Ordinary (non-qualified) " +
      "dividends — from REITs, most foreign companies, and money market funds, among others — are taxed as " +
      "regular income at your normal federal bracket rates. Both are stacked on top of your other income to " +
      "find the correct rate, the same way the IRS's own worksheet works.",
    examples:
      "Example: $90,000 of other taxable income (Single) with $2,000 of ordinary dividends and $5,000 of " +
      "qualified dividends owes $440.00 tax on the ordinary portion (22% bracket) and $750.00 on the qualified " +
      "portion (15% rate) — $1,190.00 total, an effective 17.00% rate on the $7,000 of dividends.",
    assumptions:
      "This calculator uses 2026 federal brackets for ordinary dividends and the 2026 long-term capital gains " +
      "brackets (0%/15%/20%) for qualified dividends, both from IRS Rev. Proc. 2025-32 — federal only, standard " +
      "deduction only, and doesn't include the 3.8% Net Investment Income Tax that can apply on top of this at " +
      "higher incomes (see the Capital Gains Tax Calculator under Tax Calculators, which does model NIIT, for " +
      "that piece).\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "How do I know if my dividends are qualified or ordinary?",
        answer:
          "Your broker's Form 1099-DIV reports both separately — Box 1a is total ordinary dividends, and Box " +
          "1b (a subset of Box 1a) is the qualified portion. Enter the qualified amount from Box 1b as " +
          "\"Qualified Dividends\" here, and the rest of Box 1a as \"Ordinary (Non-Qualified) Dividends.\"",
      },
      {
        question: "Why are qualified dividends taxed differently?",
        answer:
          "Congress extended the same preferential rate structure used for long-term capital gains to " +
          "dividends meeting certain holding-period and source requirements (IRC §1(h)(11)), to reduce the " +
          "incentive to prefer share buybacks over dividend payouts for tax reasons.",
      },
      {
        question: "Does this include state tax?",
        answer:
          "No — this is federal tax only. Most states tax dividend income as ordinary income with no " +
          "qualified-dividend discount, so check your state's own rules separately.",
      },
    ],
  },
  {
    slug: "tax-withholding-calculator",
    title: "Tax Withholding Calculator",
    description:
      "Check whether your current per-paycheck withholding is on track to match your actual federal tax bill " +
      "— or headed for a surprise.",
    metaTitle: "Tax Withholding Calculator — Free & Instant",
    metaDescription:
      "Free tax withholding calculator. See whether your current paycheck withholding is on track for a " +
      "refund or a balance due, and how much to adjust it by.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { unit: "per year", max: 500000 }),
      filingStatusField,
      payFrequencyField,
      currencyField("currentWithholdingPerPaycheck", "Current Federal Withholding Per Paycheck", {
        unit: "per paycheck",
        max: 10000,
        step: 25,
      }),
    ],
    calcResult: { label: "Projected Refund or Balance Due", format: "currency" },
    calcResults: [
      { key: "estimatedAnnualTax", label: "Estimated Annual Federal Tax", format: "currency" },
      { key: "projectedAnnualWithholding", label: "Projected Annual Withholding", format: "currency" },
      { key: "projectedRefundOrBalance", label: "Projected Refund (+) or Balance Due (−)", format: "currency", highlight: true },
      { key: "suggestedAdjustmentPerPaycheck", label: "Suggested Adjustment Per Paycheck", format: "currency" },
    ],
    instructions:
      "Enter your annual salary, filing status, pay frequency, and the federal tax currently withheld from " +
      "each paycheck (check a recent pay stub for this). This calculator projects your withholding for the " +
      "full year and compares it against your estimated actual federal tax liability.\n\n" +
      "A positive result means you're on track for a refund; a negative result means you're headed for a " +
      "balance due at filing time. The suggested adjustment shows roughly how much more (or less) to withhold " +
      "each remaining paycheck to land close to breaking even — useful before adjusting your W-4.",
    examples:
      "Example: an $85,000 salary (Single, biweekly) with $650.00 currently withheld per paycheck projects " +
      "$16,900.00 in annual withholding against an estimated $9,870.00 tax bill — a $7,030.00 projected refund, " +
      "suggesting you could reduce withholding by about $270.38 per paycheck instead of over-withholding all " +
      "year.",
    assumptions:
      "This calculator uses 2026 federal brackets and the standard deduction only (no itemizing, credits like " +
      "the Child Tax Credit, or other income/adjustments) — a simplified planning estimate, not what your " +
      "actual W-4 withholding formula (IRS Publication 15-T) produces exactly. Use it to spot a large " +
      "mismatch, not to fine-tune to the dollar.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "Where do I find my current per-paycheck withholding?",
        answer:
          "On a recent pay stub — look for a line labeled \"Federal Income Tax\" or \"Federal Withholding\" " +
          "(separate from the FICA/Social Security/Medicare lines, which aren't part of this calculation).",
      },
      {
        question: "What should I do with the suggested adjustment?",
        answer:
          "Use it as a rough guide when filling out a new Form W-4 with your employer — either the extra " +
          "withholding amount on Step 4(c) to withhold more, or adjusting your dependents/deductions claimed to " +
          "withhold less. Your payroll or HR department handles the actual form.",
      },
      {
        question: "Is a big refund a bad thing?",
        answer:
          "Not wrong, exactly, but it means you gave the government an interest-free loan of your own money " +
          "all year instead of having it in your own paycheck. Some people prefer the forced-savings effect of " +
          "a refund; others would rather break even. Either is a reasonable choice — this tool just shows you " +
          "which one your current withholding is set up for.",
      },
    ],
  },
  {
    slug: "estimated-tax-calculator",
    title: "Estimated Tax Calculator",
    description:
      "Project your full-year federal tax on wages plus self-employment income, and split what's left after " +
      "withholding into four quarterly estimated payments.",
    metaTitle: "Estimated Tax Calculator — Free & Instant",
    metaDescription:
      "Free estimated tax calculator. Project your annual federal tax on wage and self-employment income and " +
      "see your quarterly estimated payment.",
    calcInputs: [
      currencyField("wagesAndOtherIncome", "W-2 Wages & Other Income (No SE Tax)", { unit: "per year", max: 500000 }),
      currencyField("netSelfEmploymentProfit", "Net Self-Employment Profit", { unit: "per year", max: 500000 }),
      filingStatusField,
      currencyField("taxAlreadyPaid", "Federal Tax Already Withheld or Paid", { unit: "per year", max: 200000 }),
    ],
    calcResult: { label: "Quarterly Estimated Payment", format: "currency" },
    calcResults: [
      { key: "incomeTax", label: "Estimated Federal Income Tax", format: "currency" },
      { key: "selfEmploymentTax", label: "Self-Employment Tax", format: "currency" },
      { key: "totalEstimatedTax", label: "Total Estimated Tax for the Year", format: "currency" },
      { key: "remainingBalance", label: "Remaining Balance After Withholding", format: "currency" },
      { key: "quarterlyPayment", label: "Quarterly Estimated Payment", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your expected W-2 wages or other income not subject to self-employment tax, your expected net " +
      "self-employment profit, your filing status, and any federal tax already withheld or paid this year " +
      "(from a job's paycheck withholding, for example).\n\n" +
      "This calculator projects your total federal tax for the year — income tax on everything, plus " +
      "self-employment tax on the self-employment portion — subtracts what's already been paid, and divides " +
      "the rest evenly across four quarterly payments, the standard way the IRS expects estimated tax to be " +
      "paid throughout the year rather than all at once in April.",
    examples:
      "Example: $20,000 of W-2 income plus $60,000 of net self-employment profit (Single, $2,000 already " +
      "withheld) owes about $7,837.45 in income tax and $8,477.73 in self-employment tax — $16,315.18 total, " +
      "leaving a $14,315.18 balance after the $2,000 already paid, or about $3,578.80 per quarter.",
    assumptions:
      "This calculator uses 2026 federal brackets, the standard deduction, and 2026 SECA figures (12.4% Social " +
      "Security + 2.9% Medicare on 92.35% of net self-employment profit, plus 0.9% Additional Medicare above " +
      "your filing status's threshold), with half of self-employment tax deducted above the line before " +
      "computing income tax. It does NOT calculate the IRS's prior-year \"safe harbor\" (which can let you pay " +
      "less without a penalty if you paid at least 100–110% of last year's total tax) — for that, compare this " +
      "estimate against your actual prior-year return.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice. For guidance specific to your situation, consult a qualified tax professional or the IRS.",
    faq: [
      {
        question: "Who actually needs to pay quarterly estimated tax?",
        answer:
          "Generally anyone who expects to owe $1,000 or more in federal tax for the year that isn't covered " +
          "by withholding — typical for the self-employed, freelancers, and anyone with significant investment " +
          "or rental income alongside (or instead of) a W-2 job.",
      },
      {
        question: "What are the actual IRS due dates?",
        answer:
          "Roughly mid-April, mid-June, mid-September, and mid-January of the following year (exact dates " +
          "shift slightly year to year around weekends and holidays) — see the current Form 1040-ES " +
          "instructions on IRS.gov for the exact dates.",
      },
      {
        question: "Is there a penalty for underpaying?",
        answer:
          "Yes — the IRS charges an underpayment penalty (an interest-like charge) if you pay too little too " +
          "late, unless you qualify for a safe-harbor exception. Paying close to this calculator's quarterly " +
          "figure throughout the year, rather than catching up all at once, generally avoids it.",
      },
    ],
  },
  {
    slug: "quarterly-tax-calculator",
    title: "Quarterly Tax Calculator",
    description:
      "Calculate what you owe for just THIS quarter from this quarter's self-employment profit — a faster " +
      "check-in than a full annual projection.",
    metaTitle: "Quarterly Tax Calculator — Free & Instant",
    metaDescription:
      "Free quarterly tax calculator. Enter this quarter's self-employment profit to estimate this quarter's " +
      "federal tax payment.",
    calcInputs: [
      currencyField("thisQuarterNetProfit", "This Quarter's Net Self-Employment Profit", { unit: "per quarter", max: 150000 }),
      currencyField("otherAnnualIncome", "Other Annual Income (Full Year)", { unit: "per year", max: 500000 }),
      filingStatusField,
    ],
    calcResult: { label: "This Quarter's Estimated Payment", format: "currency" },
    calcResults: [
      { key: "quarterlyIncomeTax", label: "This Quarter's Income Tax", format: "currency" },
      { key: "quarterlySelfEmploymentTax", label: "This Quarter's Self-Employment Tax", format: "currency" },
      { key: "quarterlyPaymentDue", label: "This Quarter's Estimated Payment", format: "currency", highlight: true },
      { key: "quarterSeNetEarnings", label: "This Quarter's Net Earnings (After 92.35% Factor)", format: "currency" },
    ],
    instructions:
      "Enter what you actually made in self-employment profit THIS quarter (not annualized), your other " +
      "income for the full year (wages or other non-SE income, used to place you correctly in the tax " +
      "brackets), and your filing status.\n\n" +
      "Unlike the Estimated Tax Calculator, which projects a whole year and splits it into four even payments, " +
      "this tool works from one quarter's actual results — useful when your self-employment income varies a " +
      "lot quarter to quarter and you'd rather calculate each payment from what really happened than an " +
      "annual average.",
    examples:
      "Example: $15,000 of self-employment profit this quarter, with $30,000 of other annual income (Single), " +
      "owes about $2,154.36 in income tax and $2,119.43 in self-employment tax for the quarter — $4,273.79 " +
      "total.",
    assumptions:
      "This calculator annualizes this quarter's profit (multiplying by 4) purely to find your correct tax " +
      "bracket position, then divides the resulting annual figures back down to a quarterly amount — it " +
      "assumes a representative, even quarter rather than accounting for income that's unusually front- or " +
      "back-loaded in the year. Uses the same 2026 federal brackets and SECA figures as the Estimated Tax " +
      "Calculator.\n\n" +
      "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
      "advice.",
    faq: [
      {
        question: "How is this different from the Estimated Tax Calculator?",
        answer:
          "The Estimated Tax Calculator projects your WHOLE YEAR and splits the total evenly into four " +
          "payments. This tool instead works from what you actually earned in ONE quarter, which can give a " +
          "more accurate quarter-by-quarter picture if your self-employment income is uneven throughout the " +
          "year.",
      },
      {
        question: "Why do you multiply my quarterly profit by 4?",
        answer:
          "Only to figure out which tax bracket applies — brackets are annual, so this calculator estimates " +
          "your annual pace from this quarter's results, calculates the tax at that pace, then divides back " +
          "down to a quarterly figure. It's a simplifying assumption, not a claim that your other quarters will " +
          "match exactly.",
      },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: {
      name: "Tax & Paycheck Calculators",
      slug: CATEGORY_SLUG,
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

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
        data: {
          ...toolContent,
          seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } },
        },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: {
          slug: def.slug,
          status: "draft",
          ...toolContent,
          seoMeta: { create: seoMetaContent },
        },
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
