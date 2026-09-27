// One-time (but safe to re-run) batch setup script: creates 41
// "Commission Tax Calculator" tools (one per US state with a personal
// income tax) — Batch 10, sub-batch 11 of 14. See
// src/lib/calc-engine-us-commission-tax.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-commission-tax-calculators.ts
// or
//   npm run db:create-us-commission-tax-calculators

import {
  STATE_INCOME_TAX_RATES,
  currencyField,
  currencyResult,
  GENERAL_DISCLAIMER,
  runMain,
  type ToolDef,
} from "./us-income-tax-family-shared";

const TOOLS: ToolDef[] = Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => ({
  slug: `${slug}-commission-tax-calculator`,
  title: `${state.name} Commission Tax Calculator`,
  description: `Estimate ${state.name} state tax withheld on commission income, using the flat supplemental-wage rate.`,
  metaTitle: `${state.name} Commission Tax Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} commission tax calculator. Estimate state withholding on commission pay.`,
  calcInputs: [currencyField("commissionAmount", "Commission Amount", { default: 5_000, max: 500_000, step: 100 })],
  calcResults: [currencyResult("totalTax", `${state.name} Tax Withheld on Commission`, { highlight: true })],
  instructions: `Commission is taxed as a "supplemental wage" under most states' withholding rules — the same flat-rate treatment as a bonus. Enter your commission amount to see the estimated ${state.name} state tax withheld.`,
  examples: `Example: a $5,000 commission payment. The estimated ${state.name} state tax withheld is shown in your result above, using the state's flat supplemental/top rate.`,
  assumptions: `This uses ${state.name}'s confirmed flat or top marginal income tax rate as the supplemental-wage withholding rate applied to commission income — the same convention used for bonuses.\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Is commission taxed differently from a salary?", answer: "For withholding purposes, yes — many employers treat commission as a supplemental wage and withhold at a flat rate, similar to a bonus, rather than running it through regular graduated withholding." }],
}));

runMain(TOOLS);
