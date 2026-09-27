// One-time (but safe to re-run) batch setup script: creates 41 "Overtime
// Tax Calculator" tools (one per US state with a personal income tax) —
// Batch 10, sub-batch 10 of 14. See
// src/lib/calc-engine-us-overtime-tax.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-overtime-tax-calculators.ts
// or
//   npm run db:create-us-overtime-tax-calculators

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
  slug: `${slug}-overtime-tax-calculator`,
  title: `${state.name} Overtime Tax Calculator`,
  description: `Estimate the ${state.name} state tax owed on just your overtime pay.`,
  metaTitle: `${state.name} Overtime Tax Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} overtime tax calculator. Estimate state tax on overtime pay.`,
  calcInputs: [
    currencyField("regularAnnualWages", "Regular Annual Wages", { default: 60_000, max: 1_000_000, step: 1_000 }),
    currencyField("overtimePay", "Overtime Pay", { default: 3_000, max: 200_000, step: 100 }),
  ],
  calcResults: [currencyResult("totalTax", `${state.name} Tax on Overtime Pay`, { highlight: true })],
  instructions: `Overtime pay stacks on top of your regular wages, so it's taxed at the rate that applies to your TOP slice of income. Enter your regular annual wages and your overtime pay to see the estimated ${state.name} state tax on just the overtime portion.`,
  examples: `Example: $60,000 in regular annual wages plus $3,000 in overtime pay. The estimated ${state.name} state tax on that $3,000 of overtime is shown in your result above, using the marginal rate at your combined income level.`,
  assumptions: `${RATE_METHOD_DISCLAIMER} This treats overtime as stacking on top of regular wages and taxes it at the resulting marginal rate.\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Does overtime get taxed at a higher rate than regular pay?", answer: "Not by law — but because it's the 'last dollars' earned on top of your regular wages, it often falls into your highest marginal bracket, which can make it feel like it's taxed more heavily even though the same bracket rules apply to all your income." }],
}));

runMain(TOOLS);
