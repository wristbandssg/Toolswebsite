// One-time (but safe to re-run) batch setup script: creates 41 "Tax
// Liability Calculator" tools (one per US state with a personal income
// tax) — Batch 10, sub-batch 4 of 14. See
// src/lib/calc-engine-us-tax-liability.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-tax-liability-calculators.ts
// or
//   npm run db:create-us-tax-liability-calculators

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
  slug: `${slug}-tax-liability-calculator`,
  title: `${state.name} Tax Liability Calculator`,
  description: `Estimate your total ${state.name} state income tax owed for the year.`,
  metaTitle: `${state.name} Tax Liability Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} tax liability calculator. Estimate your total state income tax owed.`,
  calcInputs: [currencyField("annualIncome", "Annual Taxable Income", { default: 60_000, max: 1_000_000, step: 1_000 })],
  calcResults: [currencyResult("totalTax", `Estimated ${state.name} Tax Liability`, { highlight: true })],
  instructions: `Enter your annual taxable income to see your estimated total ${state.name} state income tax liability for the year — the full dollar amount you'd owe before subtracting any tax already withheld.`,
  examples: `Example: $60,000 in annual taxable income. Your estimated total ${state.name} tax liability for the year is shown in your result above.`,
  assumptions: `${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Is this the amount I still owe, or my total tax for the year?", answer: "This is your TOTAL state tax liability for the year — not accounting for any tax already withheld from your paychecks. See this site's Tax Refund Calculator to compare this against what's already been withheld." }],
}));

runMain(TOOLS);
