// One-time (but safe to re-run) batch setup script: creates 41 "Tax
// Withholding Calculator" tools (one per US state with a personal income
// tax) — Batch 10, sub-batch 7 of 14. See
// src/lib/calc-engine-us-tax-withholding.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-tax-withholding-calculators.ts
// or
//   npm run db:create-us-tax-withholding-calculators

import {
  STATE_INCOME_TAX_RATES,
  currencyField,
  dropdownField,
  currencyResult,
  RATE_METHOD_DISCLAIMER,
  GENERAL_DISCLAIMER,
  runMain,
  type ToolDef,
} from "./us-income-tax-family-shared";

const PAY_FREQUENCY_OPTIONS = [
  { label: "Weekly (52/year)", value: 52 },
  { label: "Biweekly (26/year)", value: 26 },
  { label: "Semimonthly (24/year)", value: 24 },
  { label: "Monthly (12/year)", value: 12 },
];

const TOOLS: ToolDef[] = Object.entries(STATE_INCOME_TAX_RATES).map(([slug, state]) => ({
  slug: `${slug}-tax-withholding-calculator`,
  title: `${state.name} Tax Withholding Calculator`,
  description: `Estimate how much ${state.name} state tax should be withheld from each paycheck.`,
  metaTitle: `${state.name} Tax Withholding Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} tax withholding calculator. Estimate your per-paycheck state tax withholding.`,
  calcInputs: [
    currencyField("wagesPerPaycheck", "Gross Wages Per Paycheck", { default: 2_500, max: 50_000, step: 50 }),
    dropdownField("payFrequency", "Pay Frequency", PAY_FREQUENCY_OPTIONS, 26),
  ],
  calcResults: [
    currencyResult("perPaycheckWithholding", "Estimated Withholding Per Paycheck", { highlight: true }),
    currencyResult("estimatedAnnualTax", "Estimated Annual Tax"),
  ],
  instructions: `Enter your gross wages per paycheck and how often you're paid to estimate how much ${state.name} state income tax should be withheld from each paycheck to cover your full-year liability.`,
  examples: `Example: $2,500 per paycheck, paid biweekly (26 times a year) — annualized income of $65,000. Your estimated per-paycheck ${state.name} withholding and full-year tax estimate are shown in your result above.`,
  assumptions: `${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Will my actual withholding match this exactly?", answer: "Not necessarily — your employer's payroll system uses your state's official withholding tables and whatever allowances/adjustments you claimed on your state withholding form, which can differ from this simplified estimate." }],
}));

runMain(TOOLS);
