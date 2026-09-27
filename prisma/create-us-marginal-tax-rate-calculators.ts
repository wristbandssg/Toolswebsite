// One-time (but safe to re-run) batch setup script: creates 41 "Marginal
// Tax Rate Calculator" tools (one per US state with a personal income
// tax) — Batch 10, sub-batch 2 of 14. See
// src/lib/calc-engine-us-marginal-tax-rate.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-marginal-tax-rate-calculators.ts
// or
//   npm run db:create-us-marginal-tax-rate-calculators

import {
  STATE_INCOME_TAX_RATES,
  currencyField,
  percentageResult,
  RATE_METHOD_DISCLAIMER,
  GENERAL_DISCLAIMER,
  runMain,
  type ToolDef,
} from "./us-income-tax-family-shared";

const TOOLS: ToolDef[] = Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => {
  const ratePctLabel = state.isFlat
    ? `a flat ${(state.topRate * 100).toFixed(2)}%`
    : `a graduated schedule topping out at ${(state.topRate * 100).toFixed(2)}%`;
  return {
    slug: `${slug}-marginal-tax-rate-calculator`,
    title: `${state.name} Marginal Tax Rate Calculator`,
    description: `Estimate the ${state.name} state income tax rate on your next dollar earned.`,
    metaTitle: `${state.name} Marginal Tax Rate Calculator (2026) — Free & Instant`,
    metaDescription: `Free ${state.name} marginal tax rate calculator. ${ratePctLabel}.`,
    calcInputs: [currencyField("annualIncome", "Annual Taxable Income", { default: 60_000, max: 1_000_000, step: 1_000 })],
    calcResults: [percentageResult("totalTax", `${state.name} Marginal Tax Rate`, { highlight: true })],
    instructions: `${state.name}'s personal income tax uses ${ratePctLabel}. Enter your annual taxable income to see your estimated MARGINAL rate — the tax rate applied to the next dollar you earn.`,
    examples: `Example: $60,000 in annual taxable income. Your marginal rate is the rate that would apply to your NEXT dollar earned, shown in your result above.`,
    assumptions: `${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Why is my marginal rate higher than my effective (average) rate?", answer: "In a graduated-rate state, only your top slice of income is taxed at the marginal rate — earlier, lower brackets were taxed at lower rates, pulling your overall average (effective) rate down. In a flat-rate state, the two are identical." }],
  };
});

runMain(TOOLS);
