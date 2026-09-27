// One-time (but safe to re-run) batch setup script: creates 41 "Effective
// Tax Rate Calculator" tools (one per US state with a personal income
// tax) — Batch 10, sub-batch 3 of 14. See
// src/lib/calc-engine-us-effective-tax-rate.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-effective-tax-rate-calculators.ts
// or
//   npm run db:create-us-effective-tax-rate-calculators

import {
  STATE_INCOME_TAX_RATES,
  currencyField,
  percentageResult,
  RATE_METHOD_DISCLAIMER,
  GENERAL_DISCLAIMER,
  runMain,
  type ToolDef,
} from "./us-income-tax-family-shared";

const TOOLS: ToolDef[] = Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => ({
  slug: `${slug}-effective-tax-rate-calculator`,
  title: `${state.name} Effective Tax Rate Calculator`,
  description: `Estimate your overall (average) ${state.name} state income tax rate across all your income.`,
  metaTitle: `${state.name} Effective Tax Rate Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} effective tax rate calculator. See your blended average state income tax rate.`,
  calcInputs: [currencyField("annualIncome", "Annual Taxable Income", { default: 60_000, max: 1_000_000, step: 1_000 })],
  calcResults: [percentageResult("totalTax", `${state.name} Effective (Average) Tax Rate`, { highlight: true })],
  instructions: `Your effective tax rate is your TOTAL ${state.name} state income tax divided by your income — the blended average rate across every bracket you pass through, as opposed to your marginal rate (the rate on just your last dollar earned). Enter your annual taxable income to see your estimated effective rate.`,
  examples: `Example: $60,000 in annual taxable income. Your effective rate blends every bracket up to your income level, shown in your result above — typically lower than your marginal rate in a graduated-rate state.`,
  assumptions: `${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Is effective rate the same as marginal rate?", answer: "Only in a flat-rate state. In a graduated-rate state, your effective (average) rate is always lower than your marginal (next-dollar) rate, since earlier income was taxed at lower brackets." }],
}));

runMain(TOOLS);
