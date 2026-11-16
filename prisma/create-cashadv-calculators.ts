// One-time (but safe to re-run) setup script: 1 tool from the 7,423-keyword popular check
// (16 Nov 2026 — Claude outputs/Popular_Keyword_Check_2.md).
// Finance > Credit & Debt: credit-card cash advance calculator.
// Formulas: src/lib/calc-engine-cashadv.ts. Published.
//
// HOW TO RUN
//   npm run db:create-cashadv-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-cashadv";
import { mk, num, money, pct, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.cashAdvanceCustomCalculators;

const CREDIT: ToolDef[] = [
  mk({
    slug: "credit-card-cash-advance-calculator", title: "Credit Card Cash Advance Calculator (Fee, Interest & True APR)",
    meta: "Cash Advance Calculator — Credit Card Fee & Interest Cost",
    desc: "Work out what a credit card cash advance really costs: the up-front fee, the interest that starts the same day at the cash-advance APR, the total you repay, the effective yearly rate, and how long it takes to clear at a monthly payment.",
    inputs: [
      money("amount", "Cash Advance Amount", 500), pct("feePct", "Cash Advance Fee (%)", 5, 30), money("minFee", "Minimum Fee", 10),
      pct("apr", "Cash Advance APR (%)", 29.99, 100), num("days", "Days Until Repaid", 30, 1, 3650, 1, "days"),
      money("payment", "Monthly Payment (optional)", 0),
    ],
    results: [["cost", "Total Cost of the Advance", "t"], ["fee", "Cash Advance Fee", "t"], ["interest", "Interest", "t"], ["total", "Total to Repay", "t"], ["effective", "Effective Rate", "t"], ["daily", "Daily Interest", "t"], ["plan", "Paying It Off Monthly", "t"]],
    fn: C["credit-card-cash-advance-calculator"], ex: { amount: 500, feePct: 5, minFee: 10, apr: 29.99, days: 30, payment: 0 },
    exText: (o) => `Example: a $500 cash advance with a 5% fee at 29.99% APR, repaid after 30 days, costs ${o.cost} in total.`,
    how: "A cash advance costs you two ways. First there's a fee, usually 3–5% of the amount with a minimum of about $10, added to your balance straight away. Then interest is charged from the same day, with no grace period, at the cash-advance APR, which is usually several points higher than the purchase APR.\n\nInterest = (amount + fee) × ((1 + APR ÷ 365)^days − 1). For $500 with a 5% fee ($25) at 29.99% for 30 days, that's about $13 of interest, so the $500 costs about $38.\n\nThe effective rate puts the fee and interest together as a yearly rate. On a short advance the fee dominates, so repaying in a month can still cost well over 60% a year.",
    assume: "Interest compounds daily on the amount plus the fee, and nothing else is on the card. The monthly payoff uses APR ÷ 12. Some issuers charge the fee separately or have different minimums, so check your card agreement. This isn't financial advice.",
    faq: [
      ["How much does a $1,000 cash advance cost?", "With a 5% fee and 29.99% APR for a month, about $50 in fees plus about $26 interest — roughly $76."],
      ["Is there a grace period on cash advances?", "No. Interest starts on the day you withdraw the cash, even if you pay your statement in full."],
      ["Does a cash advance hurt my credit score?", "Not directly, but it raises your balance and credit utilization, which can lower your score until it's paid off."],
    ],
  }),
];

async function main() {
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${CREDIT.length} tool definitions`); for (const t of CREDIT) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("credit-debt-calculators", CREDIT);
}
main().catch((e) => { console.error(e); process.exit(1); });
