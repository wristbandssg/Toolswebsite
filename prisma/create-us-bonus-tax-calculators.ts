// One-time (but safe to re-run) batch setup script: creates 41 "Bonus Tax
// Calculator" tools (one per US state with a personal income tax) —
// Batch 10, sub-batch 9 of 14. See src/lib/calc-engine-us-bonus-tax.ts
// for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-bonus-tax-calculators.ts
// or
//   npm run db:create-us-bonus-tax-calculators

import {
  STATE_INCOME_TAX_RATES,
  currencyField,
  currencyResult,
  GENERAL_DISCLAIMER,
  runMain,
  type ToolDef,
} from "./us-income-tax-family-shared";

const TOOLS: ToolDef[] = Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => ({
  slug: `${slug}-bonus-tax-calculator`,
  title: `${state.name} Bonus Tax Calculator`,
  description: `Estimate ${state.name} state tax withheld on a bonus, using the flat supplemental-wage rate.`,
  metaTitle: `${state.name} Bonus Tax Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} bonus tax calculator. Estimate state withholding on a supplemental bonus payment.`,
  calcInputs: [currencyField("bonusAmount", "Bonus Amount", { default: 5_000, max: 500_000, step: 100 })],
  calcResults: [currencyResult("totalTax", `${state.name} Tax Withheld on Bonus`, { highlight: true })],
  instructions: `Most states tax a bonus as a "supplemental wage" at a flat rate rather than running it through your regular paycheck's graduated brackets. Enter your bonus amount to see the estimated ${state.name} state tax withheld.`,
  examples: `Example: a $5,000 bonus. The estimated ${state.name} state tax withheld is shown in your result above, using the state's flat supplemental/top rate.`,
  assumptions: `This uses ${state.name}'s confirmed flat or top marginal income tax rate as the supplemental-wage withholding rate — the common convention most states follow for bonuses. Your actual withholding may differ if your employer instead adds the bonus to a regular paycheck and withholds using the aggregate method.\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Why is my bonus taxed differently from my regular paycheck?", answer: "Employers commonly use a flat 'supplemental wage' rate for bonuses (simpler to calculate) rather than blending the bonus into your regular paycheck's graduated withholding — this doesn't change your ACTUAL tax owed for the year, just how much is withheld upfront." }],
}));

runMain(TOOLS);
