// One-time (but safe to re-run) batch setup script: creates 41 "Taxable
// Income Calculator" tools (one per US state with a personal income tax)
// — Batch 10, sub-batch 6 of 14. See
// src/lib/calc-engine-us-taxable-income.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-taxable-income-calculators.ts
// or
//   npm run db:create-us-taxable-income-calculators

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
  slug: `${slug}-taxable-income-calculator`,
  title: `${state.name} Taxable Income Calculator`,
  description: `Subtract your deductions and exemptions from gross income to estimate your ${state.name} taxable income — and the state tax on it.`,
  metaTitle: `${state.name} Taxable Income Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} taxable income calculator. Gross income minus deductions, plus the estimated tax.`,
  calcInputs: [
    currencyField("grossIncome", "Gross Annual Income", { default: 70_000, max: 1_000_000, step: 1_000 }),
    currencyField("deductions", "Deductions & Exemptions", { default: 14_600, max: 200_000, step: 100 }),
  ],
  calcResults: [
    currencyResult("taxableIncome", "Estimated Taxable Income"),
    currencyResult("estimatedTax", `Estimated ${state.name} Tax on That Income`, { highlight: true }),
  ],
  instructions: `Enter your gross annual income and your total deductions and exemptions (for example, ${state.name}'s standard deduction plus any personal exemptions you qualify for) to estimate your taxable income — and the state tax owed on it.`,
  examples: `Example: $70,000 in gross income with $14,600 in deductions. Estimated taxable income: $55,400 — with the estimated ${state.name} tax on that amount shown in your result above.`,
  assumptions: `This calculator doesn't know your state's exact standard deduction or exemption amount — enter your own figure (check your state's department of revenue for the current standard deduction if you're not itemizing). ${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "What counts as a deduction here?", answer: "Any amount your state lets you subtract before tax applies — most commonly the state standard deduction, but also personal/dependent exemptions or itemized deductions if those apply to you." }],
}));

runMain(TOOLS);
