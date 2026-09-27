// One-time (but safe to re-run) batch setup script: creates 41 "Tax
// Refund Calculator" tools (one per US state with a personal income tax)
// — Batch 10, sub-batch 5 of 14. See src/lib/calc-engine-us-tax-refund.ts
// for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-tax-refund-calculators.ts
// or
//   npm run db:create-us-tax-refund-calculators

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
  slug: `${slug}-tax-refund-calculator`,
  title: `${state.name} Tax Refund Calculator`,
  description: `Estimate your ${state.name} state tax refund (or amount still owed) by comparing your tax already withheld against your estimated liability.`,
  metaTitle: `${state.name} Tax Refund Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} tax refund calculator. Compare tax withheld to your estimated liability.`,
  calcInputs: [
    currencyField("annualIncome", "Annual Taxable Income", { default: 60_000, max: 1_000_000, step: 1_000 }),
    currencyField("amountWithheld", "State Tax Already Withheld This Year", { default: 0, max: 100_000, step: 100 }),
  ],
  calcResults: [
    currencyResult("estimatedLiability", `Estimated ${state.name} Tax Liability`),
    currencyResult("refundOrOwed", "Estimated Refund (or Amount Owed)", { highlight: true }),
  ],
  instructions: `Enter your annual taxable income and how much ${state.name} state tax has already been withheld from your paychecks this year. If withholding exceeds your estimated liability, the result shows your estimated refund; if it falls short, the result shows a negative number — the amount you'd still owe.`,
  examples: `Example: $60,000 in taxable income with $3,000 already withheld. If your estimated liability is less than $3,000, you're due a refund for the difference; if it's more, you'd owe the difference instead.`,
  assumptions: `${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "What does a negative result mean?", answer: "A negative number means your withholding fell short of your estimated liability — that's the additional amount you'd likely owe when you file, not a refund." }],
}));

runMain(TOOLS);
