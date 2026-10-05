/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 1 of 8 —
 * Funeral, Moving & Pet Loans (12 tools), filed under Loan Calculators >
 * Personal Loan Calculators. The user's 99-keyword list was checked against
 * every existing slug (no exact duplicates); 19 were dropped as the same
 * calculator purpose as a kept or existing tool: Signature Loan x7 (=
 * personal loan), Personal Line of Credit x7 (= Line of Credit), Tractor
 * Loan x4 (= Farm Equipment Loan) and Construction Loan Consolidation (too
 * vague). 80 tools were built across 8 sub-batches:
 *  - calc-engine-loan-life-events.ts (this file)     -> Personal Loan Calculators
 *  - calc-engine-loan-jewelry-furniture.ts             -> Personal Loan Calculators
 *  - calc-engine-loan-appliance-electronics.ts         -> Personal Loan Calculators
 *  - calc-engine-loan-farm-equipment.ts                -> General Loan Calculators
 *  - calc-engine-loan-cosigned-joint.ts                -> General Loan Calculators
 *  - calc-engine-mortgage-construction.ts              -> Mortgage Calculators
 *  - calc-engine-mortgage-bridge.ts                    -> Mortgage Calculators
 *  - calc-engine-credit-line-builder.ts                -> Credit & Debt Calculators
 *
 * What each tool here models beyond the plain payment formula:
 *  - funeralLoan: the funeral bill built from its parts, less life insurance,
 *    estate money and family help.
 *  - funeralLoanPayment: the payment shared between several family members.
 *  - funeralLoanCost: borrowing only until a life insurance payout arrives —
 *    interest until then and what's left after the payout.
 *  - funeralLoanPayoff: repaying from the estate once probate settles.
 *  - movingLoan: movers, truck, packing, storage and the new home's deposit,
 *    less employer relocation help and savings.
 *  - movingLoanPayment: the payment together with the change in rent.
 *  - movingLoanCost: a job move — financing cost vs the after-tax raise, and
 *    how many months of the raise repay the move.
 *  - movingLoanPayoff: using the old home's returned security deposit plus
 *    an extra monthly payment.
 *  - petLoan: vet bill less pet-insurance reimbursement (deductible,
 *    reimbursement %, annual limit) and savings.
 *  - petLoanPayment: the vet's in-house plan (deposit + installments + fee)
 *    vs a pet loan.
 *  - petLoanCost: financing this bill vs a year of pet insurance.
 *  - petLoanPayoff: extra payments, and the payment for a target month.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-life-events-calculators.ts for the copy.
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

// --- 1. Funeral Loan Calculator ----------------------------------------------
export const funeralLoanCalculator: CustomCalculator = (values) => {
  const serviceFees = Math.max(0, safeNumber(values.serviceFees, 3500));
  const casketOrUrn = Math.max(0, safeNumber(values.casketOrUrn, 2500));
  const burialOrCremation = Math.max(0, safeNumber(values.burialOrCremation, 3000));
  const headstoneAndOther = Math.max(0, safeNumber(values.headstoneAndOther, 2000));
  const lifeInsurance = Math.max(0, safeNumber(values.lifeInsurance, 0));
  const familyAndEstate = Math.max(0, safeNumber(values.familyAndEstate, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));

  const total = serviceFees + casketOrUrn + burialOrCremation + headstoneAndOther;
  const borrow = Math.max(0, total - lifeInsurance - familyAndEstate);
  const pmt = payment(borrow, annualRatePercent / 100 / 12, termMonths);

  return {
    funeralTotal: round2(total),
    amountToBorrow: round2(borrow),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - borrow),
  };
};

// --- 2. Funeral Loan Payment Calculator (shared by family) -------------------
export const funeralLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 9000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const people = Math.max(1, Math.round(safeNumber(values.people, 3)));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const total = pmt * termMonths;

  return {
    monthlyPayment: round2(pmt),
    paymentPerPerson: round2(pmt / people),
    totalPerPerson: round2(total / people),
    totalInterest: round2(total - loanAmount),
  };
};

// --- 3. Funeral Loan Cost Calculator (until life insurance pays) -------------
export const funeralLoanCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const monthsUntilPayout = Math.max(0, Math.round(safeNumber(values.monthsUntilPayout, 2)));
  const insurancePayout = Math.max(0, safeNumber(values.insurancePayout, 7000));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const k = Math.min(monthsUntilPayout, termMonths);
  const bal = balanceAfter(loanAmount, i, pmt, k);
  const interestUntilPayout = pmt * k - (loanAmount - bal);
  const left = Math.max(0, bal - insurancePayout);
  const rest = payDown(left, i, pmt);
  const totalInterest = interestUntilPayout + rest.interest;

  return {
    monthlyPayment: round2(pmt),
    interestUntilPayout: round2(interestUntilPayout),
    balanceAfterPayout: round2(left),
    monthsLeftAfterPayout: Math.max(0, rest.months),
    totalInterest: round2(totalInterest),
    interestSavedByPayout: round2(pmt * termMonths - loanAmount - totalInterest),
  };
};

// --- 4. Funeral Loan Payoff Calculator (estate settles) ----------------------
export const funeralLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const monthsUntilEstate = Math.max(0, Math.round(safeNumber(values.monthsUntilEstate, 9)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const k = Math.min(monthsUntilEstate, termMonths);
  const bal = balanceAfter(loanAmount, i, pmt, k);
  const interestPaid = pmt * k - (loanAmount - bal);

  return {
    monthlyPayment: round2(pmt),
    payoffFromEstate: round2(bal),
    interestPaidByThen: round2(interestPaid),
    interestSaved: round2(pmt * termMonths - loanAmount - interestPaid),
  };
};

// --- 5. Moving Loan Calculator -----------------------------------------------
export const movingLoanCalculator: CustomCalculator = (values) => {
  const moversOrTruck = Math.max(0, safeNumber(values.moversOrTruck, 4500));
  const packingSupplies = Math.max(0, safeNumber(values.packingSupplies, 300));
  const storageMonthly = Math.max(0, safeNumber(values.storageMonthly, 150));
  const storageMonths = Math.max(0, Math.round(safeNumber(values.storageMonths, 2)));
  const travelCosts = Math.max(0, safeNumber(values.travelCosts, 800));
  const newHomeDeposits = Math.max(0, safeNumber(values.newHomeDeposits, 3600));
  const employerHelp = Math.max(0, safeNumber(values.employerHelp, 2000));
  const savings = Math.max(0, safeNumber(values.savings, 2000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));

  const total = moversOrTruck + packingSupplies + storageMonthly * storageMonths + travelCosts + newHomeDeposits;
  const borrow = Math.max(0, total - employerHelp - savings);
  const pmt = payment(borrow, annualRatePercent / 100 / 12, termMonths);

  return {
    movingTotal: round2(total),
    amountToBorrow: round2(borrow),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - borrow),
  };
};

// --- 6. Moving Loan Payment Calculator (with the rent change) ----------------
export const movingLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 6000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const oldRent = Math.max(0, safeNumber(values.oldRent, 1600));
  const newRent = Math.max(0, safeNumber(values.newRent, 1450));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);

  return {
    monthlyPayment: round2(pmt),
    housingCostChangeWhileRepaying: round2(newRent + pmt - oldRent),
    housingCostChangeAfterLoan: round2(newRent - oldRent),
    totalInterest: round2(pmt * termMonths - loanAmount),
  };
};

// --- 7. Moving Loan Cost Calculator (vs the raise from a new job) ------------
export const movingLoanCostCalculator: CustomCalculator = (values) => {
  const moveCost = Math.max(0, safeNumber(values.moveCost, 8000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const originationFeePercent = Math.min(50, Math.max(0, safeNumber(values.originationFeePercent, 0)));
  const monthlyRaiseAfterTax = Math.max(0, safeNumber(values.monthlyRaiseAfterTax, 600));

  const loan = moveCost / (1 - originationFeePercent / 100);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);
  const financing = pmt * termMonths - moveCost;
  const totalCost = moveCost + financing;

  return {
    monthlyPayment: round2(pmt),
    financingCost: round2(financing),
    totalCostOfMove: round2(totalCost),
    monthsOfRaiseToRecover: monthlyRaiseAfterTax > 0 ? round2(totalCost / monthlyRaiseAfterTax) : 0,
    raiseLeftAfterPayment: round2(monthlyRaiseAfterTax - pmt),
  };
};

// --- 8. Moving Loan Payoff Calculator (security deposit refund) --------------
export const movingLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 6000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 285));
  const depositRefund = Math.max(0, safeNumber(values.depositRefund, 1200));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, monthlyPayment);
  // The refund arrives with the first payment (typically within 30 days).
  const afterFirst = Math.max(0, balance * (1 + i) - monthlyPayment - extraMonthly - depositRefund);
  const rest = payDown(afterFirst, i, monthlyPayment + extraMonthly);
  const fasterMonths = 1 + Math.max(0, rest.months);
  const fasterInterest = balance * i + rest.interest;

  return {
    monthsLeftNow: Math.max(0, now.months),
    monthsLeftWithRefundAndExtra: afterFirst > 0 ? fasterMonths : 1,
    monthsSaved: now.months >= 0 ? now.months - (afterFirst > 0 ? fasterMonths : 1) : 0,
    interestSaved: now.months >= 0 ? round2(now.interest - fasterInterest) : 0,
  };
};

// --- 9. Pet Loan Calculator (after pet insurance) ----------------------------
export const petLoanCalculator: CustomCalculator = (values) => {
  const vetBill = Math.max(0, safeNumber(values.vetBill, 5000));
  const hasInsurance = safeNumber(values.hasInsurance, 1) === 1;
  const deductible = Math.max(0, safeNumber(values.deductible, 250));
  const reimbursementPercent = Math.min(100, Math.max(0, safeNumber(values.reimbursementPercent, 80)));
  const annualLimitLeft = Math.max(0, safeNumber(values.annualLimitLeft, 0));
  const savings = Math.max(0, safeNumber(values.savings, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  let reimbursed = hasInsurance ? (Math.max(0, vetBill - deductible) * reimbursementPercent) / 100 : 0;
  if (hasInsurance && annualLimitLeft > 0) reimbursed = Math.min(reimbursed, annualLimitLeft);
  const yourShare = vetBill - reimbursed;
  const borrow = Math.max(0, yourShare - savings);
  const pmt = payment(borrow, annualRatePercent / 100 / 12, termMonths);

  return {
    insuranceReimburses: round2(reimbursed),
    yourShare: round2(yourShare),
    amountToBorrow: round2(borrow),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - borrow),
  };
};

// --- 10. Pet Loan Payment Calculator (vet plan vs loan) ----------------------
export const petLoanPaymentCalculator: CustomCalculator = (values) => {
  const vetBill = Math.max(0, safeNumber(values.vetBill, 3000));
  const depositPercent = Math.min(100, Math.max(0, safeNumber(values.depositPercent, 50)));
  const planMonths = Math.max(1, Math.round(safeNumber(values.planMonths, 6)));
  const planFee = Math.max(0, safeNumber(values.planFee, 50));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 15));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 12)));

  const deposit = (vetBill * depositPercent) / 100;
  const planPmt = (vetBill - deposit + planFee) / planMonths;
  const loanPmt = payment(vetBill, loanRatePercent / 100 / 12, loanTermMonths);

  return {
    planDeposit: round2(deposit),
    planMonthlyPayment: round2(planPmt),
    planExtraCost: round2(planFee),
    loanMonthlyPayment: round2(loanPmt),
    loanInterest: round2(loanPmt * loanTermMonths - vetBill),
  };
};

// --- 11. Pet Loan Cost Calculator (vs a year of pet insurance) ---------------
export const petLoanCostCalculator: CustomCalculator = (values) => {
  const vetBill = Math.max(0, safeNumber(values.vetBill, 4000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 15));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 18)));
  const monthlyPremium = Math.max(0, safeNumber(values.monthlyPremium, 45));
  const deductible = Math.max(0, safeNumber(values.deductible, 250));
  const reimbursementPercent = Math.min(100, Math.max(0, safeNumber(values.reimbursementPercent, 80)));

  const pmt = payment(vetBill, annualRatePercent / 100 / 12, termMonths);
  const loanTotal = pmt * termMonths;
  const insuredOutOfPocket =
    monthlyPremium * 12 + Math.min(vetBill, deductible) + (Math.max(0, vetBill - deductible) * (100 - reimbursementPercent)) / 100;

  return {
    loanInterest: round2(loanTotal - vetBill),
    totalCostWithLoan: round2(loanTotal),
    costWithInsurance: round2(insuredOutOfPocket),
    insuranceWouldSave: round2(loanTotal - insuredOutOfPocket),
  };
};

// --- 12. Pet Loan Payoff Calculator ------------------------------------------
export const petLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 16));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 150));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));
  const targetMonths = Math.max(1, Math.round(safeNumber(values.targetMonths, 9)));

  const i = annualRatePercent / 100 / 12;
  const now = payDown(balance, i, monthlyPayment);
  const faster = payDown(balance, i, monthlyPayment + extraMonthly);

  return {
    monthsLeft: Math.max(0, now.months),
    monthsWithExtra: Math.max(0, faster.months),
    interestSaved: now.months >= 0 && faster.months >= 0 ? round2(now.interest - faster.interest) : 0,
    paymentForTarget: round2(payment(balance, i, targetMonths)),
  };
};

export const loanLifeEventsCustomCalculators: Record<string, CustomCalculator> = {
  "funeral-loan-calculator": funeralLoanCalculator,
  "funeral-loan-payment-calculator": funeralLoanPaymentCalculator,
  "funeral-loan-cost-calculator": funeralLoanCostCalculator,
  "funeral-loan-payoff-calculator": funeralLoanPayoffCalculator,
  "moving-loan-calculator": movingLoanCalculator,
  "moving-loan-payment-calculator": movingLoanPaymentCalculator,
  "moving-loan-cost-calculator": movingLoanCostCalculator,
  "moving-loan-payoff-calculator": movingLoanPayoffCalculator,
  "pet-loan-calculator": petLoanCalculator,
  "pet-loan-payment-calculator": petLoanPaymentCalculator,
  "pet-loan-cost-calculator": petLoanCostCalculator,
  "pet-loan-payoff-calculator": petLoanPayoffCalculator,
};
