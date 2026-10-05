/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 7 of 9 —
 * BNPL, Layaway & Loan Shark (3 tools), filed under Loan Calculators >
 * Short-Term & High-Cost Loan Calculators (the user's list had them as
 * interest keywords; the intent is the cost of borrowing). See
 * calc-engine-interest-methods.ts for the full batch context.
 *
 *  - loanSharkInterestComparison: weekly interest on the full amount with
 *    the principal due at the end -> total cost and APR, vs a legal small
 *    loan (e.g., a credit union payday alternative loan, max 28% APR).
 *  - layawayPlan: down payment + equal installments + fee; the fee as a
 *    share of the price and as an APR, vs charging it to a credit card.
 *  - buyNowPayLater: pay-in-4 (0%, every two weeks) or monthly installments
 *    with an APR; late fees; vs a credit card over the same term.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-bnpl-layaway-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

// --- 1. Loan Shark Interest Comparison Calculator --------------------------------------
export const loanSharkInterestComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 500));
  const weeklyRatePercent = Math.max(0, safeNumber(values.weeklyRatePercent, 20));
  const weeks = Math.max(1, Math.round(safeNumber(values.weeks, 8)));
  const legalAprPercent = Math.max(0, safeNumber(values.legalAprPercent, 28));
  const legalTermMonths = Math.max(1, Math.round(safeNumber(values.legalTermMonths, 6)));

  const sharkInterest = (amount * weeklyRatePercent * weeks) / 100;
  const legalPay = payment(amount, legalAprPercent / 100 / 12, legalTermMonths);
  const legalInterest = legalPay * legalTermMonths - amount;

  return {
    sharkWeeklyInterest: round2((amount * weeklyRatePercent) / 100),
    sharkTotalInterest: round2(sharkInterest),
    sharkTotalRepaid: round2(amount + sharkInterest),
    sharkApr: round2(weeklyRatePercent * 52),
    legalLoanPayment: round2(legalPay),
    legalLoanInterest: round2(legalInterest),
    moneySavedWithLegalLoan: round2(sharkInterest - legalInterest),
  };
};

// --- 2. Layaway Plan Calculator --------------------------------------------------------
export const layawayPlanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 600));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const fee = Math.max(0, safeNumber(values.fee, 10));
  const weeks = Math.max(1, Math.round(safeNumber(values.weeks, 8)));
  const weeksBetweenPayments = Math.max(1, Math.round(safeNumber(values.weeksBetweenPayments, 2)));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 24));

  const down = (price * downPaymentPercent) / 100;
  const count = Math.max(1, Math.floor(weeks / weeksBetweenPayments));
  const pmt = (price - down) / count;
  const months = Math.max(1, Math.round(weeks / (52 / 12)));
  const cardInterest = payment(price, cardAprPercent / 100 / 12, months) * months - price;

  return {
    downPayment: round2(down),
    numberOfPayments: count,
    paymentAmount: round2(pmt),
    totalCost: round2(price + fee),
    feeAsPercentOfPrice: round2(price > 0 ? (fee / price) * 100 : 0),
    creditCardInterestSameTime: round2(cardInterest),
  };
};

// --- 3. Buy Now Pay Later Calculator ---------------------------------------------------
export const buyNowPayLaterCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 800));
  const raw = Math.round(safeNumber(values.plan, 1));
  const plan = raw === 2 ? 2 : 1;
  const months = Math.max(1, Math.round(safeNumber(values.months, 12)));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 15));
  const lateFee = Math.max(0, safeNumber(values.lateFee, 7));
  const latePayments = Math.max(0, Math.round(safeNumber(values.latePayments, 0)));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 24));

  let count: number;
  let pmt: number;
  let cardMonths: number;
  if (plan === 1) {
    count = 4;
    pmt = price / 4;
    cardMonths = 2;
  } else {
    count = months;
    pmt = payment(price, aprPercent / 100 / 12, months);
    cardMonths = months;
  }
  const interest = pmt * count - price;
  const fees = lateFee * latePayments;
  const card = payment(price, cardAprPercent / 100 / 12, cardMonths) * cardMonths - price;

  return {
    numberOfPayments: count,
    paymentAmount: round2(pmt),
    totalInterest: round2(interest),
    lateFees: round2(fees),
    totalCost: round2(price + interest + fees),
    creditCardInterestSameTime: round2(card),
  };
};

export const loanBnplLayawayCustomCalculators: Record<string, CustomCalculator> = {
  "loan-shark-interest-comparison-calculator": loanSharkInterestComparisonCalculator,
  "layaway-plan-calculator": layawayPlanCalculator,
  "buy-now-pay-later-calculator": buyNowPayLaterCalculator,
};
