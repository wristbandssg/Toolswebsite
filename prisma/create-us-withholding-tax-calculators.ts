// One-time (but safe to re-run) batch setup script: creates 41
// "Withholding Tax Calculator" tools (one per US state with a personal
// income tax) — Batch 10, sub-batch 8 of 14. Distinct from the Tax
// Withholding Calculator: this is a mid-year "catch-up" tool. See
// src/lib/calc-engine-us-withholding-tax.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-withholding-tax-calculators.ts
// or
//   npm run db:create-us-withholding-tax-calculators

import {
  STATE_INCOME_TAX_RATES,
  currencyField,
  currencyResult,
  RATE_METHOD_DISCLAIMER,
  GENERAL_DISCLAIMER,
  runMain,
  type ToolDef,
} from "./us-income-tax-family-shared";

const TOOLS: ToolDef[] = Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => ({
  slug: `${slug}-withholding-tax-calculator`,
  title: `${state.name} Withholding Tax Calculator`,
  description: `Behind on ${state.name} state withholding this year? Estimate how much more to withhold each remaining paycheck to catch up.`,
  metaTitle: `${state.name} Withholding Tax Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} withholding tax calculator. Estimate a mid-year withholding catch-up per paycheck.`,
  calcInputs: [
    currencyField("annualIncome", "Expected Annual Taxable Income", { default: 70_000, max: 1_000_000, step: 1_000 }),
    currencyField("alreadyWithheldYtd", "State Tax Withheld Year-to-Date", { default: 0, max: 100_000, step: 100 }),
    currencyField("remainingPayPeriods", "Pay Periods Remaining This Year", { default: 12, max: 52, step: 1 }),
  ],
  calcResults: [
    currencyResult("estimatedAnnualTax", `Estimated Full-Year ${state.name} Tax`),
    currencyResult("remainingTaxDue", "Remaining Tax Due"),
    currencyResult("perPaycheckAdjustment", "Suggested Extra Withholding Per Remaining Paycheck", { highlight: true }),
  ],
  instructions: `If you started the year under-withheld, or your income changed, use this to catch up: enter your expected annual taxable income, how much ${state.name} state tax has been withheld so far this year, and how many pay periods remain. This estimates how much MORE should be withheld from each remaining paycheck to hit your full-year liability.`,
  examples: `Example: $70,000 expected annual income, $2,000 withheld so far, with 12 pay periods left. The suggested per-paycheck adjustment shown in your result above is what to add to your withholding from here to close the gap.`,
  assumptions: `${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "What if I'm already withholding enough?", answer: "If your year-to-date withholding already meets or exceeds your estimated full-year liability, the suggested adjustment will show as $0 — no catch-up needed." }],
}));

runMain(TOOLS);
