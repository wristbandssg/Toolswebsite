/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 2 of 10 —
 * Medical & Dental Loans (11 tools), filed under Loan Calculators >
 * Personal Loan Calculators. See calc-engine-loan-debt-consolidation.ts for
 * the full batch context.
 *
 * What each tool models beyond the plain payment formula:
 *  - medicalLoan: your share of the bill after insurance (deductible, then
 *    coinsurance, capped at the out-of-pocket maximum), less HSA/FSA money,
 *    is what gets financed.
 *  - medicalLoanPayment: the payment for the same amount across 12/24/36/60
 *    months, side by side.
 *  - medicalLoanPayoff: months left at your payment, with an extra payment,
 *    and the payment needed to finish by a target month.
 *  - medicalLoanInterest: total, year-one and daily interest, and interest
 *    as a share of the bill.
 *  - medicalLoanAffordability: the largest bill a monthly budget can cover
 *    once savings, the deductible and your coinsurance share are counted.
 *  - medicalLoanComparison: hospital 0% payment plan vs personal loan vs a
 *    deferred-interest medical credit card.
 *  - medicalLoanEligibility: DTI, credit-score margin AND income margin
 *    over a lender's minimum income.
 *  - dentalLoan: dental insurance pays a % of the cost up to its ANNUAL
 *    MAXIMUM; the rest less a down payment is financed.
 *  - dentalLoanPayment: one-year treatment vs splitting it across two plan
 *    years so two annual maximums apply.
 *  - dentalLoanCost: full cost of financing vs the dentist's cash discount.
 *  - dentalLoanPayoff: the payment needed to clear a deferred-interest
 *    promo in time, and the back-interest charged if you pay less.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-medical-dental-calculators.ts for the copy.
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

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (k <= 0) return principal;
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

function payDown(balance: number, i: number, pay: number, maxMonths = 1200): { months: number; interest: number } {
  if (balance <= 0) return { months: 0, interest: 0 };
  if (pay <= balance * i + 1e-9) return { months: -1, interest: 0 };
  let b = balance;
  let interest = 0;
  let months = 0;
  while (b > 1e-9 && months < maxMonths) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pay, b + int);
    months++;
  }
  return { months, interest };
}

// Deferred-interest promo: interest accrues on the running balance at the
// card's APR during the promo but is only charged if a balance is still
// left when the promo ends — then all of it is added at once.
function deferredPromo(balance: number, aprPercent: number, monthlyPay: number, promoMonths: number) {
  const i = aprPercent / 100 / 12;
  let b = balance;
  let accrued = 0;
  for (let m = 0; m < promoMonths && b > 1e-9; m++) {
    accrued += b * i;
    b = Math.max(0, b - monthlyPay);
  }
  const cleared = b <= 1e-9;
  return { leftAtPromoEnd: b, backInterest: cleared ? 0 : accrued };
}

// --- 1. Medical Loan Calculator ----------------------------------------------
export const medicalLoanCalculator: CustomCalculator = (values) => {
  const billAmount = Math.max(0, safeNumber(values.billAmount, 12000));
  const deductibleRemaining = Math.max(0, safeNumber(values.deductibleRemaining, 1500));
  const coinsurancePercent = Math.min(100, Math.max(0, safeNumber(values.coinsurancePercent, 20)));
  const outOfPocketMaxRemaining = Math.max(0, safeNumber(values.outOfPocketMaxRemaining, 5000));
  const hsaFunds = Math.max(0, safeNumber(values.hsaFunds, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));

  const deductiblePart = Math.min(billAmount, deductibleRemaining);
  const coinsurancePart = ((billAmount - deductiblePart) * coinsurancePercent) / 100;
  const uncapped = deductiblePart + coinsurancePart;
  const yourShare = outOfPocketMaxRemaining > 0 ? Math.min(uncapped, outOfPocketMaxRemaining) : uncapped;
  const financed = Math.max(0, yourShare - hsaFunds);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    insurancePays: round2(billAmount - yourShare),
    yourShare: round2(yourShare),
    amountToFinance: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - financed),
  };
};

// --- 2. Medical Loan Payment Calculator (payment by term) --------------------
export const medicalLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 8000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const i = annualRatePercent / 100 / 12;
  const p = (n: number) => payment(loanAmount, i, n);

  return {
    payment12: round2(p(12)),
    payment24: round2(p(24)),
    payment36: round2(p(36)),
    payment60: round2(p(60)),
    interest12: round2(p(12) * 12 - loanAmount),
    interest60: round2(p(60) * 60 - loanAmount),
  };
};

// --- 3. Medical Loan Payoff Calculator ---------------------------------------
export const medicalLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 6000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 200));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 0));
  const targetMonths = Math.max(1, Math.round(safeNumber(values.targetMonths, 18)));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, monthlyPayment);
  const faster = payDown(balance, i, monthlyPayment + extraMonthly);
  const ok = now.months >= 0;

  return {
    monthsLeft: ok ? now.months : 0,
    monthsWithExtra: faster.months >= 0 ? faster.months : 0,
    interestSaved: ok && faster.months >= 0 ? round2(now.interest - faster.interest) : 0,
    paymentForTarget: round2(payment(balance, i, targetMonths)),
  };
};

// --- 4. Medical Loan Interest Calculator -------------------------------------
export const medicalLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const total = pmt * termMonths - loanAmount;
  const n1 = Math.min(12, termMonths);
  const y1 = pmt * n1 - (loanAmount - balanceAfter(loanAmount, i, pmt, n1));

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(total),
    year1Interest: round2(y1),
    dailyInterestAtStart: round2((loanAmount * annualRatePercent) / 100 / 365),
    interestPercentOfBill: loanAmount > 0 ? round2((total / loanAmount) * 100) : 0,
  };
};

// --- 5. Medical Loan Affordability Calculator --------------------------------
export const medicalLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 250));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const savings = Math.max(0, safeNumber(values.savings, 1000));
  const deductibleRemaining = Math.max(0, safeNumber(values.deductibleRemaining, 1500));
  const coinsurancePercent = Math.min(100, Math.max(0, safeNumber(values.coinsurancePercent, 20)));

  const maxLoan = presentValue(monthlyBudget, annualRatePercent / 100 / 12, termMonths);
  const maxOutOfPocket = maxLoan + savings;
  // Your share = deductible + coinsurance x (bill - deductible), so solve for the bill.
  const c = coinsurancePercent / 100;
  const maxBill =
    maxOutOfPocket <= deductibleRemaining ? maxOutOfPocket : c > 0 ? deductibleRemaining + (maxOutOfPocket - deductibleRemaining) / c : 0;

  return {
    maxLoanAmount: round2(maxLoan),
    maxOutOfPocket: round2(maxOutOfPocket),
    maxBillCovered: round2(maxBill),
    totalInterest: round2(monthlyBudget * termMonths - maxLoan),
  };
};

// --- 6. Medical Loan Comparison Calculator (plan vs loan vs card) ------------
export const medicalLoanComparisonCalculator: CustomCalculator = (values) => {
  const billAmount = Math.max(0, safeNumber(values.billAmount, 6000));
  const planMonths = Math.max(1, Math.round(safeNumber(values.planMonths, 12)));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 12));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 24)));
  const cardPromoMonths = Math.max(0, Math.round(safeNumber(values.cardPromoMonths, 12)));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 26.99));
  const cardMonthlyPayment = Math.max(0, safeNumber(values.cardMonthlyPayment, 400));

  const loanPmt = payment(billAmount, loanRatePercent / 100 / 12, loanTermMonths);
  const card = deferredPromo(billAmount, cardAprPercent, cardMonthlyPayment, cardPromoMonths);

  return {
    planPayment: round2(billAmount / planMonths),
    loanPayment: round2(loanPmt),
    loanInterest: round2(loanPmt * loanTermMonths - billAmount),
    cardBalanceAtPromoEnd: round2(card.leftAtPromoEnd),
    cardDeferredInterest: round2(card.backInterest),
  };
};

// --- 7. Medical Loan Eligibility Calculator ----------------------------------
export const medicalLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 650)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 600)));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 4000));
  const lenderMinIncome = Math.max(0, safeNumber(values.lenderMinIncome, 2000));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 1200));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 7000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 15));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 45));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const dtiAfter = ((monthlyDebtPayments + pmt) / grossMonthlyIncome) * 100;

  return {
    newPayment: round2(pmt),
    dtiAfterPercent: round2(dtiAfter),
    dtiHeadroomPercent: round2(maxDtiPercent - dtiAfter),
    scoreMargin: Math.round(creditScore - lenderMinScore),
    incomeMargin: round2(grossMonthlyIncome - lenderMinIncome),
  };
};

// --- 8. Dental Loan Calculator (insurance annual maximum) --------------------
export const dentalLoanCalculator: CustomCalculator = (values) => {
  const treatmentCost = Math.max(0, safeNumber(values.treatmentCost, 6000));
  const coveragePercent = Math.min(100, Math.max(0, safeNumber(values.coveragePercent, 50)));
  const annualMaxRemaining = Math.max(0, safeNumber(values.annualMaxRemaining, 1500));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));

  const insurancePays = Math.min((treatmentCost * coveragePercent) / 100, annualMaxRemaining);
  const yourShare = treatmentCost - insurancePays;
  const financed = Math.max(0, yourShare - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    insurancePays: round2(insurancePays),
    yourShare: round2(yourShare),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - financed),
  };
};

// --- 9. Dental Loan Payment Calculator (one plan year vs two) ----------------
export const dentalLoanPaymentCalculator: CustomCalculator = (values) => {
  const treatmentCost = Math.max(0, safeNumber(values.treatmentCost, 8000));
  const coveragePercent = Math.min(100, Math.max(0, safeNumber(values.coveragePercent, 50)));
  const annualMax = Math.max(0, safeNumber(values.annualMax, 1500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));

  const i = annualRatePercent / 100 / 12;
  const c = coveragePercent / 100;
  const oneYearFinanced = treatmentCost - Math.min(treatmentCost * c, annualMax);
  // Split evenly across two plan years: each half can use a full annual maximum.
  const half = treatmentCost / 2;
  const splitFinanced = treatmentCost - 2 * Math.min(half * c, annualMax);
  const p1 = payment(oneYearFinanced, i, termMonths);
  const p2 = payment(splitFinanced, i, termMonths);

  return {
    oneYearFinanced: round2(oneYearFinanced),
    oneYearPayment: round2(p1),
    splitFinanced: round2(splitFinanced),
    splitPayment: round2(p2),
    monthlySavingFromSplit: round2(p1 - p2),
  };
};

// --- 10. Dental Loan Cost Calculator (vs cash discount) ----------------------
export const dentalLoanCostCalculator: CustomCalculator = (values) => {
  const treatmentCost = Math.max(0, safeNumber(values.treatmentCost, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const originationFeePercent = Math.min(50, Math.max(0, safeNumber(values.originationFeePercent, 0)));
  const cashDiscountPercent = Math.min(100, Math.max(0, safeNumber(values.cashDiscountPercent, 5)));

  const loanAmount = treatmentCost / (1 - originationFeePercent / 100);
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const totalPaid = pmt * termMonths;
  const cashPrice = treatmentCost * (1 - cashDiscountPercent / 100);

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(totalPaid - loanAmount),
    originationFee: round2(loanAmount - treatmentCost),
    totalPaidWithLoan: round2(totalPaid),
    cashPrice: round2(cashPrice),
    extraCostOfFinancing: round2(totalPaid - cashPrice),
  };
};

// --- 11. Dental Loan Payoff Calculator (deferred-interest promo) -------------
export const dentalLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 4000));
  const promoMonths = Math.max(1, Math.round(safeNumber(values.promoMonths, 12)));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 26.99));
  const plannedMonthlyPayment = Math.max(0, safeNumber(values.plannedMonthlyPayment, 300));

  const r = deferredPromo(balance, cardAprPercent, plannedMonthlyPayment, promoMonths);

  return {
    paymentToClearPromo: round2(balance / promoMonths),
    balanceAtPromoEnd: round2(r.leftAtPromoEnd),
    deferredInterestCharged: round2(r.backInterest),
    totalOwedAfterPromo: round2(r.leftAtPromoEnd + r.backInterest),
  };
};

export const loanMedicalDentalCustomCalculators: Record<string, CustomCalculator> = {
  "medical-loan-calculator": medicalLoanCalculator,
  "medical-loan-payment-calculator": medicalLoanPaymentCalculator,
  "medical-loan-payoff-calculator": medicalLoanPayoffCalculator,
  "medical-loan-interest-calculator": medicalLoanInterestCalculator,
  "medical-loan-affordability-calculator": medicalLoanAffordabilityCalculator,
  "medical-loan-comparison-calculator": medicalLoanComparisonCalculator,
  "medical-loan-eligibility-calculator": medicalLoanEligibilityCalculator,
  "dental-loan-calculator": dentalLoanCalculator,
  "dental-loan-payment-calculator": dentalLoanPaymentCalculator,
  "dental-loan-cost-calculator": dentalLoanCostCalculator,
  "dental-loan-payoff-calculator": dentalLoanPayoffCalculator,
};
