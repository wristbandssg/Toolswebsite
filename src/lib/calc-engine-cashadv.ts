/**
 * Batch: 7,423-keyword popular check (16 Nov 2026 — Claude outputs/Popular_Keyword_Check_2.md).
 * One Finance > Credit & Debt tool: credit-card cash advance cost.
 *
 * Near-namesakes kept apart on purpose:
 *  - credit-card-cash-advance = the up-front fee (% with a $ minimum) plus interest that starts the
 *    same day (no grace period) at the higher cash-advance APR, with payoff time at a monthly payment.
 *  - credit-card-interest (existing) = interest on a purchase balance at the regular APR.
 *  - merchant-cash-advance (existing) = business funding repaid from card sales by a factor rate.
 */

import { type TrvCalculator as Calc, InputError, num } from "./trv-core";

const usd = (x: number) => "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Daily-compounded interest on a balance over a number of days. */
export function cashAdvanceInterest(balance: number, apr: number, days: number) {
  return balance * (Math.pow(1 + apr / 365, days) - 1);
}

/** Months and total interest to clear a balance at a fixed monthly payment (interest monthly at APR/12). */
export function payoffSchedule(balance: number, apr: number, payment: number) {
  const r = apr / 12;
  if (payment <= balance * r) return null;
  let b = balance, m = 0, interest = 0;
  while (b > 0.005 && m < 1200) { const i = b * r; interest += i; b = b + i - payment; m++; }
  return { months: m, interest };
}

const cashAdvance: Calc = (v) => {
  const amount = num(v.amount, 500), feePct = num(v.feePct, 5) / 100, minFee = num(v.minFee, 10);
  const apr = num(v.apr, 29.99) / 100, days = Math.round(num(v.days, 30)), pay = num(v.payment, 0);
  if (amount <= 0) throw new InputError("Enter the cash advance amount.");
  if (feePct < 0 || feePct > 0.3) throw new InputError("The fee is usually 3–5%; enter 0 to 30%.");
  if (apr < 0 || apr > 1) throw new InputError("Enter an APR between 0% and 100%.");
  if (days < 1 || days > 3650) throw new InputError("Days until repaid must be between 1 and 3,650.");

  const fee = Math.max(amount * feePct, minFee);
  const balance = amount + fee;
  const interest = cashAdvanceInterest(balance, apr, days);
  const cost = fee + interest;
  const effApr = (cost / amount) * (365 / days) * 100;

  let plan = "Enter a monthly payment to see how long it takes to pay off";
  if (pay > 0) {
    const s = payoffSchedule(balance, apr, pay);
    plan = s
      ? `${s.months} months (${Math.floor(s.months / 12)} yr ${s.months % 12} mo) paying ${usd(pay)}/month · interest ${usd(s.interest)} · total cost ${usd(s.interest + fee)}`
      : `${usd(pay)} a month doesn't cover the ${usd(balance * apr / 12)} monthly interest, so the balance never goes down`;
  }

  return {
    cost: usd(cost),
    fee: `${usd(fee)} (${(feePct * 100).toFixed(1)}% of ${usd(amount)}, minimum ${usd(minFee)})`,
    interest: `${usd(interest)} over ${days} days at ${(apr * 100).toFixed(2)}% APR — interest starts the day you take the cash`,
    total: `${usd(balance + interest)} to repay for ${usd(amount)} of cash`,
    effective: `${effApr.toFixed(1)}% a year once the fee is counted`,
    daily: `${usd(balance * apr / 365)} interest a day`,
    plan,
  };
};

export const cashAdvanceCustomCalculators: Record<string, Calc> = {
  "credit-card-cash-advance-calculator": cashAdvance,
};
