/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 2 of 8 —
 * Jewelry & Furniture Loans (8 tools), filed under Loan Calculators >
 * Personal Loan Calculators. See calc-engine-loan-life-events.ts for the
 * full batch context.
 *
 * "Jewelry loan" covers two searches, so the 4 jewelry tools split them:
 * borrowing AGAINST gold jewelry (a gold loan — priced on the gold's weight
 * and purity, not resale value like pawn-shop-loan-calculator) and
 * financing a jewelry PURCHASE:
 *  - jewelryLoan: gold weight x purity x price per gram x the lender's
 *    loan-to-value, and simple interest for the months borrowed.
 *  - jewelryLoanPayment: financing a ring or other piece — payment and its
 *    share of take-home pay.
 *  - jewelryLoanCost: gold loan repaid in one "bullet" payment at the end vs
 *    monthly EMIs.
 *  - jewelryLoanPayoff: when the gold price falls — the new LTV and the
 *    part-payment needed to get back under the lender's limit.
 * Furniture is usually store-financed or rented-to-own:
 *  - furnitureLoan: items, delivery/assembly and sales tax, less a down
 *    payment, and the payment.
 *  - furnitureLoanPayment: rent-to-own weekly payments (with their implied
 *    APR) vs an installment loan.
 *  - furnitureLoanCost: everything added to the sticker price — tax,
 *    delivery, protection plan and interest.
 *  - furnitureLoanPayoff: a TRUE 0% promo (not deferred interest) — the
 *    balance left when it ends and the interest after it.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-jewelry-furniture-calculators.ts for the copy.
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

function solvePeriodicRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt <= 0 || n <= 0 || pmt * n <= pv) return 0;
  let lo = 1e-9;
  let hi = 5;
  for (let k = 0; k < 300; k++) {
    const mid = (lo + hi) / 2;
    if (presentValue(pmt, mid, n) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
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

// --- 1. Jewelry Loan Calculator (gold loan) ----------------------------------
export const jewelryLoanCalculator: CustomCalculator = (values) => {
  const weightGrams = Math.max(0, safeNumber(values.weightGrams, 50));
  const karat = Math.min(24, Math.max(1, safeNumber(values.karat, 22)));
  const pricePerGram24k = Math.max(0, safeNumber(values.pricePerGram24k, 120));
  const ltvPercent = Math.min(100, Math.max(0, safeNumber(values.ltvPercent, 75)));
  const amountWanted = Math.max(0, safeNumber(values.amountWanted, 3500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const months = Math.max(1, Math.round(safeNumber(values.months, 6)));

  const goldValue = weightGrams * (karat / 24) * pricePerGram24k;
  const maxLoan = (goldValue * ltvPercent) / 100;
  const loan = Math.min(amountWanted, maxLoan);
  const interest = (loan * annualRatePercent * months) / 1200;

  return {
    goldValue: round2(goldValue),
    maxLoan: round2(maxLoan),
    loanAmount: round2(loan),
    interest: round2(interest),
    totalToRepay: round2(loan + interest),
  };
};

// --- 2. Jewelry Loan Payment Calculator (financing a purchase) ---------------
export const jewelryLoanPaymentCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 6000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 1000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 18));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const monthlyTakeHome = Math.max(0, safeNumber(values.monthlyTakeHome, 4000));

  const financed = Math.max(0, price - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    shareOfTakeHomePercent: monthlyTakeHome > 0 ? round2((pmt / monthlyTakeHome) * 100) : 0,
    totalInterest: round2(interest),
    totalCost: round2(price + interest),
  };
};

// --- 3. Jewelry Loan Cost Calculator (bullet vs EMI) -------------------------
export const jewelryLoanCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const months = Math.max(1, Math.round(safeNumber(values.months, 12)));

  const bullet = (loanAmount * annualRatePercent * months) / 1200;
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, months);
  const emiInterest = pmt * months - loanAmount;

  return {
    bulletInterest: round2(bullet),
    bulletRepayment: round2(loanAmount + bullet),
    emiPayment: round2(pmt),
    emiInterest: round2(emiInterest),
    emiSaves: round2(bullet - emiInterest),
  };
};

// --- 4. Jewelry Loan Payoff Calculator (gold price drop) ---------------------
export const jewelryLoanPayoffCalculator: CustomCalculator = (values) => {
  const amountOwed = Math.max(0, safeNumber(values.amountOwed, 3600));
  const weightGrams = Math.max(0, safeNumber(values.weightGrams, 50));
  const karat = Math.min(24, Math.max(1, safeNumber(values.karat, 22)));
  const pricePerGram24k = Math.max(0, safeNumber(values.pricePerGram24k, 100));
  const maxLtvPercent = Math.min(100, Math.max(0, safeNumber(values.maxLtvPercent, 75)));

  const value = weightGrams * (karat / 24) * pricePerGram24k;
  const allowed = (value * maxLtvPercent) / 100;
  // Gold price at which the loan hits the LTV limit.
  const pureGrams = weightGrams * (karat / 24);
  const triggerPrice = pureGrams > 0 && maxLtvPercent > 0 ? amountOwed / (pureGrams * (maxLtvPercent / 100)) : 0;

  return {
    goldValueNow: round2(value),
    currentLtvPercent: value > 0 ? round2((amountOwed / value) * 100) : 0,
    maxAllowedLoan: round2(allowed),
    partPaymentNeeded: round2(Math.max(0, amountOwed - allowed)),
    priceAtLtvLimit: round2(triggerPrice),
  };
};

// --- 5. Furniture Loan Calculator --------------------------------------------
export const furnitureLoanCalculator: CustomCalculator = (values) => {
  const itemsPrice = Math.max(0, safeNumber(values.itemsPrice, 4500));
  const deliveryAssembly = Math.max(0, safeNumber(values.deliveryAssembly, 200));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 20));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));

  const tax = (itemsPrice * salesTaxPercent) / 100;
  const total = itemsPrice + deliveryAssembly + tax;
  const financed = Math.max(0, total - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    salesTax: round2(tax),
    totalPrice: round2(total),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - financed),
  };
};

// --- 6. Furniture Loan Payment Calculator (rent-to-own vs loan) --------------
export const furnitureLoanPaymentCalculator: CustomCalculator = (values) => {
  const cashPrice = Math.max(0, safeNumber(values.cashPrice, 1500));
  const rtoWeekly = Math.max(0, safeNumber(values.rtoWeekly, 40));
  const rtoWeeks = Math.max(1, Math.round(safeNumber(values.rtoWeeks, 78)));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 25));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 18)));

  const rtoTotal = rtoWeekly * rtoWeeks;
  const weekly = solvePeriodicRate(cashPrice, rtoWeekly, rtoWeeks);
  const loanPmt = payment(cashPrice, loanRatePercent / 100 / 12, loanTermMonths);

  return {
    rentToOwnTotal: round2(rtoTotal),
    rentToOwnMarkup: round2(rtoTotal - cashPrice),
    rentToOwnApr: round2(weekly * 52 * 100),
    loanMonthlyPayment: round2(loanPmt),
    loanTotal: round2(loanPmt * loanTermMonths),
    loanSaves: round2(rtoTotal - loanPmt * loanTermMonths),
  };
};

// --- 7. Furniture Loan Cost Calculator (everything above sticker) ------------
export const furnitureLoanCostCalculator: CustomCalculator = (values) => {
  const stickerPrice = Math.max(0, safeNumber(values.stickerPrice, 3000));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const delivery = Math.max(0, safeNumber(values.delivery, 150));
  const protectionPlan = Math.max(0, safeNumber(values.protectionPlan, 250));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 22));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));

  const tax = (stickerPrice * salesTaxPercent) / 100;
  const total = stickerPrice + tax + delivery + protectionPlan;
  const financed = Math.max(0, total - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;
  const allIn = total + interest;

  return {
    addOns: round2(tax + delivery + protectionPlan),
    totalInterest: round2(interest),
    monthlyPayment: round2(pmt),
    totalCost: round2(allIn),
    costAboveStickerPercent: stickerPrice > 0 ? round2(((allIn - stickerPrice) / stickerPrice) * 100) : 0,
  };
};

// --- 8. Furniture Loan Payoff Calculator (true 0% promo) ---------------------
export const furnitureLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 3600));
  const promoMonths = Math.max(0, Math.round(safeNumber(values.promoMonths, 12)));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 200));
  const aprAfterPercent = Math.max(0, safeNumber(values.aprAfterPercent, 29.99));

  const left = Math.max(0, balance - monthlyPayment * promoMonths);
  const after = payDown(left, aprAfterPercent / 100 / 12, monthlyPayment);

  return {
    paymentToClearInPromo: promoMonths > 0 ? round2(balance / promoMonths) : round2(balance),
    balanceAtPromoEnd: round2(left),
    monthsAfterPromo: Math.max(0, after.months),
    interestAfterPromo: after.months < 0 ? 0 : round2(after.interest),
  };
};

export const loanJewelryFurnitureCustomCalculators: Record<string, CustomCalculator> = {
  "jewelry-loan-calculator": jewelryLoanCalculator,
  "jewelry-loan-payment-calculator": jewelryLoanPaymentCalculator,
  "jewelry-loan-cost-calculator": jewelryLoanCostCalculator,
  "jewelry-loan-payoff-calculator": jewelryLoanPayoffCalculator,
  "furniture-loan-calculator": furnitureLoanCalculator,
  "furniture-loan-payment-calculator": furnitureLoanPaymentCalculator,
  "furniture-loan-cost-calculator": furnitureLoanCostCalculator,
  "furniture-loan-payoff-calculator": furnitureLoanPayoffCalculator,
};
