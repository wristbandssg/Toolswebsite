// One-time (but safe to re-run) batch setup script: creates 41
// "Estimated Quarterly Tax Calculator" tools (one per US state with a
// personal income tax) — Batch 10, sub-batch 14 of 14, the FINAL
// sub-batch of the entire 50-state audit. See
// src/lib/calc-engine-us-estimated-quarterly-tax.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-estimated-quarterly-tax-calculators.ts
// or
//   npm run db:create-us-estimated-quarterly-tax-calculators

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
  slug: `${slug}-estimated-quarterly-tax-calculator`,
  title: `${state.name} Estimated Quarterly Tax Calculator`,
  description: `Estimate quarterly ${state.name} state tax payments for income with no withholding — investors, retirees, small business owners, and more.`,
  metaTitle: `${state.name} Estimated Quarterly Tax Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} estimated quarterly tax calculator. Estimate quarterly state tax payments.`,
  calcInputs: [currencyField("expectedAnnualIncome", "Expected Annual Taxable Income", { default: 70_000, max: 1_000_000, step: 1_000 })],
  calcResults: [
    currencyResult("estimatedAnnualTax", `Estimated Annual ${state.name} Tax`),
    currencyResult("quarterlyPayment", "Estimated Quarterly Payment", { highlight: true }),
  ],
  instructions: `Anyone with income not subject to regular withholding — investment income, retirement distributions, rental income, a side business, and more — may need to make quarterly estimated state tax payments. Enter your expected annual taxable income to estimate your ${state.name} tax and an even quarterly payment.`,
  examples: `Example: $70,000 in expected annual taxable income. Your estimated annual ${state.name} tax and quarterly payment are shown in your result above.`,
  assumptions: `This divides the annual estimate into 4 equal quarterly payments as a simplification — your state's actual due dates and any safe-harbor rules (which can reduce what's required if you meet certain conditions, such as paying based on last year's liability) may call for a different amount or schedule. ${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Who typically needs to make estimated quarterly payments?", answer: "Anyone expecting to owe a meaningful amount of state tax that isn't covered by withholding — self-employed people, investors with capital gains or dividends, retirees drawing from taxable accounts, and landlords are common examples." }],
}));

runMain(TOOLS);
