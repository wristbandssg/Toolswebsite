// One-time (but safe to re-run) batch setup script: creates 41 "Tax
// Bracket Calculator" tools (one per US state with a personal income tax)
// inside the existing "Tax & Paycheck Calculators" category — Batch 10,
// sub-batch 1 of 14 (the "income-tax-derived family") of the 50-state
// audit. See src/lib/calc-engine-us-tax-bracket.ts for the math and
// prisma/us-income-tax-family-shared.ts for the shared helpers/rate table.
//
// HOW TO RUN
//   npx tsx prisma/create-us-tax-bracket-calculators.ts
// or
//   npm run db:create-us-tax-bracket-calculators

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
    slug: `${slug}-tax-bracket-calculator`,
    title: `${state.name} Tax Bracket Calculator`,
    description: `Estimate which ${state.name} state income tax bracket (marginal rate) your income falls into.`,
    metaTitle: `${state.name} Tax Bracket Calculator (2026) — Free & Instant`,
    metaDescription: `Free ${state.name} tax bracket calculator. Estimate your marginal state income tax rate — ${ratePctLabel}.`,
    calcInputs: [currencyField("annualIncome", "Annual Taxable Income", { default: 60_000, max: 1_000_000, step: 1_000 })],
    calcResults: [percentageResult("totalTax", `${state.name} Estimated Tax Bracket`, { highlight: true })],
    instructions: `${state.name}'s personal income tax uses ${ratePctLabel}. Enter your annual taxable income to see the estimated marginal tax bracket (rate) that income falls into.`,
    examples: `Example: $60,000 in annual taxable income. Estimated ${state.name} marginal tax bracket: see your result above — this is the rate applied to your NEXT dollar of income, not your average rate across all your income.`,
    assumptions: `${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Is my tax bracket the same as my overall tax rate?", answer: "No — your bracket (marginal rate) is the rate on your NEXT dollar earned. Your overall (effective) rate, which blends every bracket you've passed through, is usually lower — see this site's Effective Tax Rate Calculator for that figure." }],
  };
});

runMain(TOOLS);
