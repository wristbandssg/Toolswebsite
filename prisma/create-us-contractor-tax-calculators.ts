// One-time (but safe to re-run) batch setup script: creates 41
// "Contractor Tax Calculator" tools (one per US state with a personal
// income tax) — Batch 10, sub-batch 13 of 14. See
// src/lib/calc-engine-us-contractor-tax.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-us-contractor-tax-calculators.ts
// or
//   npm run db:create-us-contractor-tax-calculators

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
  slug: `${slug}-contractor-tax-calculator`,
  title: `${state.name} Contractor Tax Calculator`,
  description: `Estimate a 1099 contractor's ${state.name} state income tax, plus a quarterly payment breakdown.`,
  metaTitle: `${state.name} Contractor Tax Calculator (2026) — Free & Instant`,
  metaDescription: `Free ${state.name} contractor tax calculator. Estimate annual state income tax and quarterly payments.`,
  calcInputs: [currencyField("netContractorIncome", "Net 1099 Contractor Income (after business expenses)", { default: 60_000, max: 1_000_000, step: 1_000 })],
  calcResults: [
    currencyResult("estimatedAnnualTax", `Estimated Annual ${state.name} Tax`),
    currencyResult("estimatedQuarterlyPayment", "Suggested Quarterly Payment", { highlight: true }),
  ],
  instructions: `As a 1099 contractor, no employer withholds state tax for you — you're generally expected to pay it yourself, often in quarterly installments. Enter your net contractor income (after business expenses) to estimate your annual ${state.name} state income tax and a suggested even quarterly payment.`,
  examples: `Example: $60,000 in net contractor income. Your estimated annual ${state.name} tax and suggested quarterly payment are shown in your result above.`,
  assumptions: `This covers ${state.name} STATE income tax only — not federal income tax or federal self-employment tax, and it divides the annual estimate into 4 equal quarterly payments as a simplification (your state's actual quarterly due dates and any safe-harbor rules may call for uneven or differently-timed payments). ${RATE_METHOD_DISCLAIMER}\n\n${GENERAL_DISCLAIMER}`,
  faq: [{ question: "Do I have to pay this in exact quarterly installments?", answer: "Most states expect quarterly estimated payments from contractors with no withholding, but the exact due dates and any safe-harbor thresholds (which can let you pay less if you meet certain conditions) vary by state — check your state's department of revenue for the specifics." }],
}));

runMain(TOOLS);
