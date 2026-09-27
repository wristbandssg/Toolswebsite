// One-time (but safe to re-run) batch setup script: creates 41 "Freelance
// Tax Calculator" tools (one per US state with a personal income tax) —
// Batch 10, sub-batch 12 of 14. See
// src/lib/calc-engine-us-freelance-tax.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-freelance-tax-calculators.ts
// or
//   npm run db:create-us-freelance-tax-calculators

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
  slug: `${slug}-freelance-tax-calculator`,
  title: `${state.name} Freelance Tax Calculator`,
  description: `Estimate the ${state.name} state income tax you owe on net freelance income.`,
  metaTitle: `${state.name} Freelance Tax Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} freelance tax calculator. Estimate state income tax on net freelance earnings.`,
  calcInputs: [currencyField("netFreelanceIncome", "Net Freelance Income (after business expenses)", { default: 50_000, max: 1_000_000, step: 1_000 })],
  calcResults: [currencyResult("totalTax", `Estimated ${state.name} Tax on Freelance Income`, { highlight: true })],
  instructions: `Enter your NET freelance income — after deducting your business expenses — to estimate the ${state.name} state income tax you'll owe on it. This covers state income tax only.`,
  examples: `Example: $50,000 in net freelance income. The estimated ${state.name} state income tax owed is shown in your result above.`,
  assumptions: `This covers ${state.name} STATE income tax only — it does not include federal income tax or federal self-employment tax (Social Security/Medicare), which apply separately and are a much larger share of a freelancer's total tax bill. ${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Does this include federal self-employment tax?", answer: "No — this covers state income tax only. Federal self-employment tax (15.3% covering Social Security and Medicare) is calculated and paid separately at the federal level." }],
}));

runMain(TOOLS);
