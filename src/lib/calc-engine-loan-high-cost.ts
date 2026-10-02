/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 7 of 10 —
 * Payday, Title & Pawn Shop Loans (12 tools), filed under Loan Calculators
 * > Short-Term & High-Cost Loan Calculators (together with the existing
 * short-term-loan-calculator). See calc-engine-loan-debt-consolidation.ts
 * for the full batch context.
 *
 * The existing short-term-loan-calculator turns ONE flat fee into an APR
 * and counts rollover fees. The tools here each model a different feature
 * of these products:
 *  - paydayLoan: fee quoted per $100, APR, and the share of your next
 *    paycheck that goes to repaying it.
 *  - paydayLoanPayment: an INSTALLMENT payday loan (fixed payments every
 *    week / 2 weeks / month) — APR solved from the payment schedule.
 *  - paydayLoanCost: rollovers where part of the principal must be paid
 *    down at each renewal (as some states require).
 *  - paydayLoanPayoff: rolling over vs the no-fee Extended Payment Plan many
 *    states make lenders offer.
 *  - titleLoan: the car's value x the lender's loan-to-value cap, a monthly
 *    fee rate plus a lien fee, and the 30-day APR.
 *  - titleLoanPayment: an installment title loan's payment at a triple-digit
 *    APR.
 *  - titleLoanCost: renewing month after month by paying only the fee,
 *    compared with the car's value.
 *  - titleLoanPayoff: a payment that covers the monthly fee plus principal —
 *    months to payoff, and the payment needed for a target.
 *  - pawnShopLoan: item value x loan-to-value, monthly finance charge and
 *    fees, redemption amount and APR.
 *  - pawnShopLoanPayment: paying just the monthly charge to extend the pawn.
 *  - pawnShopLoanCost: redeeming vs forfeiting the item vs selling it.
 *  - pawnShopLoanPayoff: paying the loan down in monthly part-payments vs
 *    interest-only extensions and one payoff at the end.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-high-cost-calculators.ts for the copy.
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

function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

// Periodic rate where `n` payments of `pmt` repay `pv` (bisection; payday
// installment rates can exceed 20% per period, so the upper bound is wide).
function solvePeriodicRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt <= 0 || n <= 0 || pmt * n <= pv) return 0;
  let lo = 1e-9;
  let hi = 10;
  for (let k = 0; k < 300; k++) {
    const mid = (lo + hi) / 2;
    if (presentValue(pmt, mid, n) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function singlePaymentApr(charge: number, amount: number, days: number): number {
  return amount > 0 && days > 0 ? (charge / amount) * (365 / days) * 100 : 0;
}

// --- 1. Payday Loan Calculator -----------------------------------------------
export const paydayLoanCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 400));
  const feePer100 = Math.max(0, safeNumber(values.feePer100, 15));
  const termDays = Math.max(1, Math.round(safeNumber(values.termDays, 14)));
  const nextPaycheck = Math.max(0, safeNumber(values.nextPaycheck, 1200));

  const fee = (amount / 100) * feePer100;
  const due = amount + fee;

  return {
    fee: round2(fee),
    totalDue: round2(due),
    aprPercent: round2(singlePaymentApr(fee, amount, termDays)),
    shareOfPaycheckPercent: nextPaycheck > 0 ? round2((due / nextPaycheck) * 100) : 0,
    paycheckLeftOver: round2(nextPaycheck - due),
  };
};

// --- 2. Payday Loan Payment Calculator (installment payday loan) ------------
export const paydayLoanPaymentCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const paymentAmount = Math.max(0, safeNumber(values.paymentAmount, 160));
  const numberOfPayments = Math.max(1, Math.round(safeNumber(values.numberOfPayments, 10)));
  const periodsPerYear = [12, 26, 52].includes(safeNumber(values.periodsPerYear, 26)) ? safeNumber(values.periodsPerYear, 26) : 26;

  const total = paymentAmount * numberOfPayments;
  const r = solvePeriodicRate(amount, paymentAmount, numberOfPayments);

  return {
    totalRepaid: round2(total),
    totalFinanceCharge: round2(Math.max(0, total - amount)),
    aprPercent: round2(r * periodsPerYear * 100),
    costPer100Borrowed: amount > 0 ? round2((Math.max(0, total - amount) / amount) * 100) : 0,
    weeksToRepay: round2((numberOfPayments * 52) / periodsPerYear),
  };
};

// --- 3. Payday Loan Cost Calculator (rollovers with principal paydown) ------
export const paydayLoanCostCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 500));
  const feePer100 = Math.max(0, safeNumber(values.feePer100, 15));
  const termDays = Math.max(1, Math.round(safeNumber(values.termDays, 14)));
  const rollovers = Math.max(0, Math.round(safeNumber(values.rollovers, 4)));
  const paydownPercent = Math.min(100, Math.max(0, safeNumber(values.paydownPercent, 0)));

  // Each renewal: pay that period's fee plus a % of the ORIGINAL amount.
  let owed = amount;
  let fees = 0;
  for (let k = 0; k < rollovers && owed > 1e-9; k++) {
    fees += (owed / 100) * feePer100;
    owed = Math.max(0, owed - (amount * paydownPercent) / 100);
  }
  const finalFee = (owed / 100) * feePer100;
  const totalFees = fees + finalFee;

  return {
    totalFees: round2(totalFees),
    daysInDebt: (rollovers + 1) * termDays,
    owedAfterRollovers: round2(owed),
    totalPaid: round2(amount + totalFees),
    feesAsPercentOfLoan: amount > 0 ? round2((totalFees / amount) * 100) : 0,
  };
};

// --- 4. Payday Loan Payoff Calculator (rollover vs Extended Payment Plan) ---
export const paydayLoanPayoffCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 500));
  const feePer100 = Math.max(0, safeNumber(values.feePer100, 15));
  const rolloversNeeded = Math.max(0, Math.round(safeNumber(values.rolloversNeeded, 3)));
  const eppInstallments = Math.max(1, Math.round(safeNumber(values.eppInstallments, 4)));

  const fee = (amount / 100) * feePer100;
  // EPP: the amount due (loan + the original fee) split into equal
  // installments on later paydays, with no extra fees.
  const eppTotal = amount + fee;
  const rolloverTotal = amount + fee * (1 + rolloversNeeded);

  return {
    eppInstallment: round2(eppTotal / eppInstallments),
    eppTotalCost: round2(eppTotal),
    rolloverTotalCost: round2(rolloverTotal),
    savingsWithEpp: round2(rolloverTotal - eppTotal),
  };
};

// --- 5. Title Loan Calculator ------------------------------------------------
export const titleLoanCalculator: CustomCalculator = (values) => {
  const carValue = Math.max(0, safeNumber(values.carValue, 8000));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 40));
  const amountWanted = Math.max(0, safeNumber(values.amountWanted, 2500));
  const monthlyFeePercent = Math.max(0, safeNumber(values.monthlyFeePercent, 25));
  const lienFee = Math.max(0, safeNumber(values.lienFee, 25));
  const termDays = Math.max(1, Math.round(safeNumber(values.termDays, 30)));

  const maxLoan = (carValue * maxLtvPercent) / 100;
  const loan = Math.min(amountWanted, maxLoan);
  const charge = (loan * monthlyFeePercent) / 100 + lienFee;

  return {
    maxLoan: round2(maxLoan),
    loanAmount: round2(loan),
    financeCharge: round2(charge),
    totalDue: round2(loan + charge),
    aprPercent: round2(singlePaymentApr(charge, loan, termDays)),
  };
};

// --- 6. Title Loan Payment Calculator (installment title loan) --------------
export const titleLoanPaymentCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 3000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 150));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const carValue = Math.max(0, safeNumber(values.carValue, 9000));

  const pmt = payment(amount, aprPercent / 100 / 12, termMonths);
  const total = pmt * termMonths;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(total - amount),
    totalRepaid: round2(total),
    interestPercentOfLoan: amount > 0 ? round2(((total - amount) / amount) * 100) : 0,
    totalRepaidPercentOfCar: carValue > 0 ? round2((total / carValue) * 100) : 0,
  };
};

// --- 7. Title Loan Cost Calculator (monthly renewals) ------------------------
export const titleLoanCostCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 2000));
  const monthlyFeePercent = Math.max(0, safeNumber(values.monthlyFeePercent, 25));
  const monthsRenewed = Math.max(0, Math.round(safeNumber(values.monthsRenewed, 6)));
  const carValue = Math.max(0, safeNumber(values.carValue, 7000));

  const monthlyFee = (amount * monthlyFeePercent) / 100;
  // Renewing means paying only the fee; the full amount is still owed after.
  const feesPaid = monthlyFee * (monthsRenewed + 1);

  return {
    monthlyFee: round2(monthlyFee),
    totalFeesPaid: round2(feesPaid),
    totalPaid: round2(amount + feesPaid),
    feesAsPercentOfLoan: amount > 0 ? round2((feesPaid / amount) * 100) : 0,
    feesAsPercentOfCar: carValue > 0 ? round2((feesPaid / carValue) * 100) : 0,
  };
};

// --- 8. Title Loan Payoff Calculator ----------------------------------------
export const titleLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 2000));
  const monthlyRatePercent = Math.max(0, safeNumber(values.monthlyRatePercent, 15));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 500));
  const targetMonths = Math.max(1, Math.round(safeNumber(values.targetMonths, 4)));

  const i = monthlyRatePercent / 100;
  let b = balance;
  let interest = 0;
  let months = 0;
  const repays = monthlyPayment > balance * i + 1e-9;
  while (repays && b > 1e-9 && months < 1200) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(monthlyPayment, b + int);
    months++;
  }

  return {
    firstMonthFee: round2(balance * i),
    monthsToPayoff: repays ? months : 0,
    totalFeesPaid: repays ? round2(interest) : 0,
    paymentForTarget: round2(payment(balance, i, targetMonths)),
  };
};

// --- 9. Pawn Shop Loan Calculator --------------------------------------------
export const pawnShopLoanCalculator: CustomCalculator = (values) => {
  const itemValue = Math.max(0, safeNumber(values.itemValue, 600));
  const loanToValuePercent = Math.max(0, safeNumber(values.loanToValuePercent, 50));
  const monthlyChargePercent = Math.max(0, safeNumber(values.monthlyChargePercent, 20));
  const otherFees = Math.max(0, safeNumber(values.otherFees, 0));
  const months = Math.max(1, Math.round(safeNumber(values.months, 1)));

  const loan = (itemValue * loanToValuePercent) / 100;
  const charge = (loan * monthlyChargePercent * months) / 100 + otherFees;

  return {
    loanOffered: round2(loan),
    financeCharge: round2(charge),
    redeemAmount: round2(loan + charge),
    aprPercent: round2(singlePaymentApr(charge, loan, months * 30)),
  };
};

// --- 10. Pawn Shop Loan Payment Calculator (interest-only extensions) -------
export const pawnShopLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300));
  const monthlyChargePercent = Math.max(0, safeNumber(values.monthlyChargePercent, 20));
  const extensions = Math.max(0, Math.round(safeNumber(values.extensions, 3)));

  const charge = (loanAmount * monthlyChargePercent) / 100;
  const chargesPaid = charge * extensions;
  const redeem = loanAmount + charge;

  return {
    extensionPayment: round2(charge),
    chargesPaidExtending: round2(chargesPaid),
    finalRedeemAmount: round2(redeem),
    totalPaid: round2(chargesPaid + redeem),
    chargesAsPercentOfLoan: loanAmount > 0 ? round2(((chargesPaid + charge) / loanAmount) * 100) : 0,
  };
};

// --- 11. Pawn Shop Loan Cost Calculator (redeem vs forfeit vs sell) ---------
export const pawnShopLoanCostCalculator: CustomCalculator = (values) => {
  const loanOffer = Math.max(0, safeNumber(values.loanOffer, 300));
  const monthlyChargePercent = Math.max(0, safeNumber(values.monthlyChargePercent, 20));
  const monthsUntilRedeem = Math.max(1, Math.round(safeNumber(values.monthsUntilRedeem, 2)));
  const saleOffer = Math.max(0, safeNumber(values.saleOffer, 350));
  const replacementCost = Math.max(0, safeNumber(values.replacementCost, 800));

  const charges = (loanOffer * monthlyChargePercent * monthsUntilRedeem) / 100;

  return {
    costToRedeem: round2(charges),
    totalToGetItemBack: round2(loanOffer + charges),
    lossIfForfeited: round2(replacementCost - loanOffer),
    extraCashFromSelling: round2(saleOffer - loanOffer),
    redeemCostVsReplacing: round2(replacementCost - (loanOffer + charges)),
  };
};

// --- 12. Pawn Shop Loan Payoff Calculator (part-payments) -------------------
export const pawnShopLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400));
  const monthlyChargePercent = Math.max(0, safeNumber(values.monthlyChargePercent, 20));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 150));

  const i = monthlyChargePercent / 100;
  let b = loanAmount;
  let charges = 0;
  let months = 0;
  const repays = monthlyPayment > loanAmount * i + 1e-9;
  while (repays && b > 1e-9 && months < 600) {
    const c = b * i;
    charges += c;
    b = b + c - Math.min(monthlyPayment, b + c);
    months++;
  }
  // Same time frame paying only the charge each month, then the loan at the end.
  const interestOnly = loanAmount * i * months;

  return {
    monthsToRedeem: repays ? months : 0,
    totalCharges: repays ? round2(charges) : 0,
    totalPaid: repays ? round2(loanAmount + charges) : 0,
    chargesIfInterestOnly: repays ? round2(interestOnly) : 0,
    savedByPartPayments: repays ? round2(interestOnly - charges) : 0,
  };
};

export const loanHighCostCustomCalculators: Record<string, CustomCalculator> = {
  "payday-loan-calculator": paydayLoanCalculator,
  "payday-loan-payment-calculator": paydayLoanPaymentCalculator,
  "payday-loan-cost-calculator": paydayLoanCostCalculator,
  "payday-loan-payoff-calculator": paydayLoanPayoffCalculator,
  "title-loan-calculator": titleLoanCalculator,
  "title-loan-payment-calculator": titleLoanPaymentCalculator,
  "title-loan-cost-calculator": titleLoanCostCalculator,
  "title-loan-payoff-calculator": titleLoanPayoffCalculator,
  "pawn-shop-loan-calculator": pawnShopLoanCalculator,
  "pawn-shop-loan-payment-calculator": pawnShopLoanPaymentCalculator,
  "pawn-shop-loan-cost-calculator": pawnShopLoanCostCalculator,
  "pawn-shop-loan-payoff-calculator": pawnShopLoanPayoffCalculator,
};
