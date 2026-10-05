/**
 * Batch: "Loan Calculators" expansion 4 (3 Oct 2026), sub-batch 1 of 5 —
 * Golf Cart, ATV and Snowmobile Loans (12 tools), filed under Loan
 * Calculators > Auto & Vehicle Loan Calculators. The user's 43-keyword list
 * was checked against every existing slug: none were already built and
 * none were merged — each "Cost" tool answers a different question from its
 * main calculator (ownership cost, cost per hour of use, rent vs buy).
 * 43 tools were built across 5 sub-batches:
 *  - calc-engine-loan-powersports.ts (this file)    -> Auto & Vehicle Loan Calculators
 *  - calc-engine-loan-instrument-legal.ts            -> Personal Loan Calculators
 *  - calc-engine-loan-cosmetic-fertility.ts          -> Personal Loan Calculators
 *  - calc-engine-loan-adoption-tax-debt.ts           -> Personal Loan Calculators
 *  - calc-engine-loan-medical-equipment.ts           -> General Loan Calculators
 *
 * What each tool here models beyond the plain payment formula:
 *  - golfCartLoan: price + sales tax - down payment -> payment, full cost.
 *  - golfCartLoanPayment: the payment plus a monthly reserve for the
 *    battery pack an electric cart will need.
 *  - golfCartLoanCost: ownership cost — interest, insurance, upkeep, less
 *    resale value — in total and per month.
 *  - golfCartLoanPayoff: extra each month.
 *  - atvLoan: price + freight/prep + tax - down payment.
 *  - atvLoanPayment: dealer promo rate vs a cash rebate plus a bank loan.
 *  - atvLoanCost: ownership cost per hour of riding.
 *  - atvLoanPayoff: the payment needed to be debt-free by a target month.
 *  - snowmobileLoan: payment and its cost per riding month of the season.
 *  - snowmobileLoanPayment: seasonal plan — the off-season months at the
 *    start of each loan year are skipped (interest still accrues).
 *  - snowmobileLoanCost: owning (loan + insurance + storage + upkeep) vs
 *    renting by the day, and the break-even riding days.
 *  - snowmobileLoanPayoff: extra each month plus a lump sum.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-powersports-calculators.ts for the copy.
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

/** Months and interest to repay `balance` paying `pmt` a month (capped at 600 months). */
function repay(balance: number, i: number, pmt: number): { months: number; interest: number } {
  let b = balance;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 600) {
    const int = b * i;
    if (pmt <= int) return { months: 600, interest: interest + int * (600 - months) };
    interest += int;
    b = b + int - Math.min(pmt, b + int);
    months++;
  }
  return { months, interest };
}

// --- 1. Golf Cart Loan Calculator --------------------------------------------------------
export const golfCartLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 12000));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 6));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 1500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const tax = (price * salesTaxPercent) / 100;
  const financed = Math.max(0, price + tax - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    salesTax: round2(tax),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(price + tax + interest),
  };
};

// --- 2. Golf Cart Loan Payment Calculator (with battery reserve) -------------------------
export const golfCartLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const batteryCost = Math.max(0, safeNumber(values.batteryCost, 2500));
  const batteryLifeYears = Math.max(1, safeNumber(values.batteryLifeYears, 6));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const reserve = batteryCost / (batteryLifeYears * 12);

  return {
    monthlyPayment: round2(pmt),
    batteryReserve: round2(reserve),
    totalMonthlyBudget: round2(pmt + reserve),
    totalInterest: round2(pmt * termMonths - loanAmount),
  };
};

// --- 3. Golf Cart Loan Cost Calculator (ownership cost) ----------------------------------
export const golfCartLoanCostCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 12000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 300));
  const annualUpkeep = Math.max(0, safeNumber(values.annualUpkeep, 250));
  const yearsOwned = Math.max(1, safeNumber(values.yearsOwned, 6));
  const resalePercent = Math.min(100, Math.max(0, safeNumber(values.resalePercent, 35)));

  const interest = payment(price, annualRatePercent / 100 / 12, termMonths) * termMonths - price;
  const running = (annualInsurance + annualUpkeep) * yearsOwned;
  const resale = (price * resalePercent) / 100;
  const net = price + interest + running - resale;

  return {
    totalInterest: round2(interest),
    runningCosts: round2(running),
    resaleValue: round2(resale),
    netCostOfOwnership: round2(net),
    costPerMonth: round2(net / (yearsOwned * 12)),
  };
};

// --- 4. Golf Cart Loan Payoff Calculator --------------------------------------------------
export const golfCartLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 8000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 75));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(balance, i, pmt + extraMonthly);

  return {
    currentPayment: round2(pmt),
    newPayment: round2(pmt + extraMonthly),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

// --- 5. ATV Loan Calculator ---------------------------------------------------------------
export const atvLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 11000));
  const dealerFees = Math.max(0, safeNumber(values.dealerFees, 900));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 6));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 1000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const tax = ((price + dealerFees) * salesTaxPercent) / 100;
  const financed = Math.max(0, price + dealerFees + tax - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    outTheDoorPrice: round2(price + dealerFees + tax),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(price + dealerFees + tax + interest),
  };
};

// --- 6. ATV Loan Payment Calculator (promo rate vs cash rebate) ---------------------------
export const atvLoanPaymentCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 12000));
  const promoRatePercent = Math.max(0, safeNumber(values.promoRatePercent, 1.99));
  const promoTermMonths = Math.max(1, Math.round(safeNumber(values.promoTermMonths, 36)));
  const rebate = Math.max(0, safeNumber(values.rebate, 1000));
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 9));
  const bankTermMonths = Math.max(1, Math.round(safeNumber(values.bankTermMonths, 36)));

  const promo = payment(amount, promoRatePercent / 100 / 12, promoTermMonths);
  const rebateLoan = Math.max(0, amount - rebate);
  const bank = payment(rebateLoan, bankRatePercent / 100 / 12, bankTermMonths);
  const promoTotal = promo * promoTermMonths;
  const bankTotal = bank * bankTermMonths;

  return {
    promoPayment: round2(promo),
    rebatePayment: round2(bank),
    promoTotalPaid: round2(promoTotal),
    rebateTotalPaid: round2(bankTotal),
    savingsWithPromo: round2(bankTotal - promoTotal),
  };
};

// --- 7. ATV Loan Cost Calculator (cost per hour of use) -----------------------------------
export const atvLoanCostCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 12000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 250));
  const annualMaintenance = Math.max(0, safeNumber(values.annualMaintenance, 400));
  const yearsOwned = Math.max(1, safeNumber(values.yearsOwned, 5));
  const resalePercent = Math.min(100, Math.max(0, safeNumber(values.resalePercent, 45)));
  const hoursPerYear = Math.max(0, safeNumber(values.hoursPerYear, 80));

  const interest = payment(price, annualRatePercent / 100 / 12, termMonths) * termMonths - price;
  const running = (annualInsurance + annualMaintenance) * yearsOwned;
  const net = price + interest + running - (price * resalePercent) / 100;
  const hours = hoursPerYear * yearsOwned;

  return {
    totalInterest: round2(interest),
    runningCosts: round2(running),
    netCostOfOwnership: round2(net),
    costPerYear: round2(net / yearsOwned),
    costPerHourOfUse: round2(hours > 0 ? net / hours : 0),
  };
};

// --- 8. ATV Loan Payoff Calculator (debt-free by a target month) --------------------------
export const atvLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 8000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const targetMonths = Math.min(remainingMonths, Math.max(1, Math.round(safeNumber(values.targetMonths, 24))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const need = payment(balance, i, targetMonths);

  return {
    currentPayment: round2(pmt),
    requiredPayment: round2(need),
    extraPerMonth: round2(need - pmt),
    interestSaved: round2(pmt * remainingMonths - need * targetMonths),
  };
};

// --- 9. Snowmobile Loan Calculator (cost per riding month) --------------------------------
export const snowmobileLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 15000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const ridingMonths = Math.min(12, Math.max(1, safeNumber(values.ridingMonths, 4)));

  const financed = price * (1 - downPaymentPercent / 100);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - financed),
    loanCostPerRidingMonth: round2((pmt * 12) / ridingMonths),
  };
};

// --- 10. Snowmobile Loan Payment Calculator (seasonal payments) ---------------------------
export const snowmobileLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 14000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 5)));
  const payMonths = Math.min(12, Math.max(1, Math.round(safeNumber(values.payMonthsPerYear, 8))));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const regular = payment(loanAmount, i, n);
  // Skip the first (12 - payMonths) months of each loan year (the off-season right after a
  // spring/summer purchase), then pay; interest accrues every month.
  let factor = 0;
  for (let m = 1; m <= n; m++) if ((m - 1) % 12 >= 12 - payMonths) factor += Math.pow(1 + i, -m);
  const seasonal = factor > 0 ? loanAmount / factor : 0;
  const paidMonths = termYears * payMonths;

  return {
    regularPayment: round2(regular),
    seasonalPayment: round2(seasonal),
    regularTotalInterest: round2(regular * n - loanAmount),
    seasonalTotalInterest: round2(seasonal * paidMonths - loanAmount),
    extraInterestForSkipping: round2(seasonal * paidMonths - regular * n),
  };
};

// --- 11. Snowmobile Loan Cost Calculator (own vs rent) ------------------------------------
export const snowmobileLoanCostCalculator: CustomCalculator = (values) => {
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 285));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 300));
  const annualStorage = Math.max(0, safeNumber(values.annualStorage, 400));
  const annualMaintenance = Math.max(0, safeNumber(values.annualMaintenance, 500));
  const rentalPerDay = Math.max(0, safeNumber(values.rentalPerDay, 250));
  const ridingDays = Math.max(0, safeNumber(values.ridingDays, 15));

  const own = monthlyPayment * 12 + annualInsurance + annualStorage + annualMaintenance;
  const rent = rentalPerDay * ridingDays;

  return {
    ownershipCostPerYear: round2(own),
    rentalCostPerYear: round2(rent),
    savingsByOwning: round2(rent - own),
    ownershipCostPerDay: round2(ridingDays > 0 ? own / ridingDays : 0),
    breakEvenRidingDays: rentalPerDay > 0 ? Math.ceil(own / rentalPerDay) : 0,
  };
};

// --- 12. Snowmobile Loan Payoff Calculator (extra + lump sum) -----------------------------
export const snowmobileLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 11000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 1500));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(Math.max(0, balance - lumpSum), i, pmt + extraMonthly);

  return {
    currentPayment: round2(pmt),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

export const loanPowersportsCustomCalculators: Record<string, CustomCalculator> = {
  "golf-cart-loan-calculator": golfCartLoanCalculator,
  "golf-cart-loan-payment-calculator": golfCartLoanPaymentCalculator,
  "golf-cart-loan-cost-calculator": golfCartLoanCostCalculator,
  "golf-cart-loan-payoff-calculator": golfCartLoanPayoffCalculator,
  "atv-loan-calculator": atvLoanCalculator,
  "atv-loan-payment-calculator": atvLoanPaymentCalculator,
  "atv-loan-cost-calculator": atvLoanCostCalculator,
  "atv-loan-payoff-calculator": atvLoanPayoffCalculator,
  "snowmobile-loan-calculator": snowmobileLoanCalculator,
  "snowmobile-loan-payment-calculator": snowmobileLoanPaymentCalculator,
  "snowmobile-loan-cost-calculator": snowmobileLoanCostCalculator,
  "snowmobile-loan-payoff-calculator": snowmobileLoanPayoffCalculator,
};
