/**
 * Batch: "Mortgage Calculators" expansion (5 Oct 2026), sub-batch 1 of 5 —
 * Mortgage Types (10 tools), filed under Mortgage Calculators > Mortgage
 * Payment & Type Calculators.
 *
 * The user's 59-keyword mortgage list was checked against every existing
 * slug: 17 were already built (5/1, 7/1, 10/1 and Interest-Only ARM =
 * adjustable-rate-mortgage-arm / interest-only-mortgage; Non-Conforming,
 * Jumbo ARM, Super Jumbo = jumbo-mortgage; Construction-to-Permanent =
 * construction-loan-*; Bridge = bridge-loan-*; Investment Property;
 * Rate-and-Term and Conventional Streamline Refinance = mortgage-refinance;
 * Mortgage Insurance Removal = private-mortgage-insurance-pmi; HOA Fee
 * Impact = hoa-fee; Pre-Approval = mortgage-affordability; State HFA Loan =
 * down-payment-assistance-loan-*; First-Generation Homebuyer =
 * first-time-home-buyer-mortgage). 5 were merged: Portfolio and No-Doc ->
 * Non-QM, HomeStyle -> FHA 203k, Home Possible -> HomeReady, Split MI ->
 * Lender-Paid MI. 37 new tools in 5 sub-batches, and Mortgage Calculators
 * was split into 5 sub-categories (organize-tool-categories.ts moves the
 * 67 existing mortgage tools):
 *  - calc-engine-mortgage-loan-types.ts (this file) -> Mortgage Payment & Type
 *  - calc-engine-mortgage-refinance-equity.ts         -> Refinance & Home Equity
 *  - calc-engine-mortgage-buyer-programs.ts           -> Home Buyer Program
 *  - calc-engine-mortgage-property-types.ts           -> Property & Construction Mortgage
 *  - calc-engine-mortgage-costs-insurance.ts          -> Mortgage Cost & Insurance
 *
 *  - conventionalMortgage: conforming-limit check ($832,750 for 2026), PMI
 *    until 78% LTV, full PITI.
 *  - graduatedPaymentMortgage: payments rise g% a year for N years
 *    (FHA 245 style); solves the starting payment, shows negative
 *    amortization (peak balance).
 *  - physicianMortgageLoan: 0–10% down, no PMI, slightly higher rate, vs a
 *    conventional loan with 5% down and PMI.
 *  - assumableMortgage: take over the seller's low-rate balance; the equity
 *    gap is paid in cash or with a second loan; vs a new loan at market rate.
 *  - blanketMortgage: one loan over 3 properties; release price per
 *    property at a release percentage.
 *  - nonQmMortgage (incl. portfolio, no-doc/bank-statement): qualifying
 *    income from bank deposits after an expense factor -> max loan/price.
 *  - sellerFinancedMortgage: payment, balloon, seller's interest income.
 *  - rentToOwnMortgage: option fee + rent credits vs the price at the end,
 *    the mortgage you'd need, and the equity if the home appreciates.
 *  - foreignNationalMortgage: larger down payment, rate premium, payment
 *    in your home currency.
 *  - piggybackLoan: 80/10/10 vs one 90% loan with PMI over N years.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-loan-types-calculators.ts for the copy.
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
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// Months until the scheduled balance first reaches `target`; n if never.
function monthsToBalance(principal: number, i: number, pmt: number, n: number, target: number): number {
  let b = principal;
  for (let m = 0; m < n; m++) {
    if (b <= target) return m;
    b = b * (1 + i) - pmt;
  }
  return n;
}

// --- 1. Conventional Mortgage Calculator -----------------------------------------------
export const conventionalMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 400000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.5));
  const annualTaxes = Math.max(0, safeNumber(values.annualTaxes, 4800));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 1800));
  const conformingLimit = Math.max(0, safeNumber(values.conformingLimit, 832750));

  const loan = homePrice * (1 - downPaymentPercent / 100);
  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pi = payment(loan, i, n);
  const needsPmi = homePrice > 0 && loan / homePrice > 0.8;
  const pmi = needsPmi ? (loan * pmiRatePercent) / 100 / 12 : 0;
  const pmiMonths = needsPmi ? monthsToBalance(loan, i, pi, n, homePrice * 0.78) : 0;

  return {
    loanAmount: round2(loan),
    withinConformingLimit: loan <= conformingLimit ? 1 : 0,
    principalAndInterest: round2(pi),
    monthlyPmi: round2(pmi),
    monthsUntilPmiEnds: pmiMonths,
    totalMonthlyPayment: round2(pi + pmi + (annualTaxes + annualInsurance) / 12),
  };
};

// --- 2. Graduated Payment Mortgage Calculator ------------------------------------------
export const graduatedPaymentMortgageCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const termYears = Math.max(2, Math.round(safeNumber(values.termYears, 30)));
  const increasePercent = Math.max(0, safeNumber(values.increasePercent, 7.5));
  const increaseYears = Math.min(termYears - 1, Math.max(0, Math.round(safeNumber(values.increaseYears, 5))));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const g = increasePercent / 100;
  // simulate with a starting payment; payment steps up each year, then flat
  const run = (start: number) => {
    let b = loanAmount;
    let peak = b;
    let paid = 0;
    for (let m = 0; m < n; m++) {
      const p = start * Math.pow(1 + g, Math.min(increaseYears, Math.floor(m / 12)));
      b = b * (1 + i) - p;
      paid += p;
      if (b > peak) peak = b;
    }
    return { b, peak, paid };
  };
  let lo = 0;
  let hi = loanAmount + 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (run(mid).b > 0) lo = mid;
    else hi = mid;
  }
  const start = (lo + hi) / 2;
  const r = run(start);
  const level = payment(loanAmount, i, n);

  return {
    firstPayment: round2(start),
    finalPayment: round2(start * Math.pow(1 + g, increaseYears)),
    levelPaymentForComparison: round2(level),
    peakBalance: round2(r.peak),
    negativeAmortization: round2(Math.max(0, r.peak - loanAmount)),
    totalInterest: round2(r.paid - loanAmount),
    extraInterestVsLevel: round2(r.paid - level * n),
  };
};

// --- 3. Physician Mortgage Loan Calculator ---------------------------------------------
export const physicianMortgageLoanCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 650000));
  const physicianDownPercent = Math.min(100, Math.max(0, safeNumber(values.physicianDownPercent, 0)));
  const physicianRatePercent = Math.max(0, safeNumber(values.physicianRatePercent, 6.75));
  const conventionalDownPercent = Math.min(100, Math.max(0, safeNumber(values.conventionalDownPercent, 5)));
  const conventionalRatePercent = Math.max(0, safeNumber(values.conventionalRatePercent, 6.625));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.6));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));

  const n = termYears * 12;
  const physLoan = homePrice * (1 - physicianDownPercent / 100);
  const convLoan = homePrice * (1 - conventionalDownPercent / 100);
  const phys = payment(physLoan, physicianRatePercent / 100 / 12, n);
  const convPi = payment(convLoan, conventionalRatePercent / 100 / 12, n);
  const pmi = homePrice > 0 && convLoan / homePrice > 0.8 ? (convLoan * pmiRatePercent) / 100 / 12 : 0;

  return {
    physicianLoanAmount: round2(physLoan),
    physicianPayment: round2(phys),
    conventionalPayment: round2(convPi + pmi),
    conventionalPmi: round2(pmi),
    monthlyDifference: round2(convPi + pmi - phys),
    cashKeptUpFront: round2(homePrice * ((conventionalDownPercent - physicianDownPercent) / 100)),
  };
};

// --- 4. Assumable Mortgage Calculator --------------------------------------------------
export const assumableMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 400000));
  const assumedBalance = Math.max(0, safeNumber(values.assumedBalance, 280000));
  const assumedRatePercent = Math.max(0, safeNumber(values.assumedRatePercent, 3));
  const remainingYears = Math.max(1, safeNumber(values.remainingYears, 25));
  const cashAvailable = Math.max(0, safeNumber(values.cashAvailable, 60000));
  const secondRatePercent = Math.max(0, safeNumber(values.secondRatePercent, 8.5));
  const secondTermYears = Math.max(1, Math.round(safeNumber(values.secondTermYears, 20)));
  const marketRatePercent = Math.max(0, safeNumber(values.marketRatePercent, 6.5));

  const balance = Math.min(assumedBalance, homePrice);
  const gap = homePrice - balance;
  const second = Math.max(0, gap - cashAvailable);
  const assumedPay = payment(balance, assumedRatePercent / 100 / 12, Math.round(remainingYears * 12));
  const secondPay = payment(second, secondRatePercent / 100 / 12, secondTermYears * 12);
  const newLoan = Math.max(0, homePrice - Math.min(cashAvailable, homePrice));
  const newPay = payment(newLoan, marketRatePercent / 100 / 12, 360);

  return {
    equityGap: round2(gap),
    secondLoanNeeded: round2(second),
    assumedLoanPayment: round2(assumedPay),
    secondLoanPayment: round2(secondPay),
    totalPaymentIfAssumed: round2(assumedPay + secondPay),
    newMortgagePayment: round2(newPay),
    monthlySavings: round2(newPay - assumedPay - secondPay),
  };
};

// --- 5. Blanket Mortgage Calculator ----------------------------------------------------
export const blanketMortgageCalculator: CustomCalculator = (values) => {
  const values3 = [1, 2, 3].map((k) => Math.max(0, safeNumber(values[`property${k}Value`], [350000, 275000, 425000][k - 1])));
  const ltvPercent = Math.min(100, Math.max(0, safeNumber(values.ltvPercent, 75)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const amortizationYears = Math.max(1, Math.round(safeNumber(values.amortizationYears, 25)));
  const releasePercent = Math.max(100, safeNumber(values.releasePercent, 120));

  const total = values3.reduce((s, v) => s + v, 0);
  const loan = (total * ltvPercent) / 100;
  const allocated = values3.map((v) => (v * ltvPercent) / 100);

  return {
    totalPropertyValue: round2(total),
    loanAmount: round2(loan),
    monthlyPayment: round2(payment(loan, annualRatePercent / 100 / 12, amortizationYears * 12)),
    releasePriceProperty1: round2((allocated[0] * releasePercent) / 100),
    releasePriceProperty2: round2((allocated[1] * releasePercent) / 100),
    releasePriceProperty3: round2((allocated[2] * releasePercent) / 100),
  };
};

// --- 6. Non-QM Mortgage Calculator (bank-statement income) ----------------------------
export const nonQmMortgageCalculator: CustomCalculator = (values) => {
  const avgMonthlyDeposits = Math.max(0, safeNumber(values.avgMonthlyDeposits, 15000));
  const expenseFactorPercent = Math.min(100, Math.max(0, safeNumber(values.expenseFactorPercent, 50)));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 600));
  const maxDtiPercent = Math.min(100, Math.max(0, safeNumber(values.maxDtiPercent, 50)));
  const taxesInsurance = Math.max(0, safeNumber(values.taxesInsurance, 650));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.75));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 15)));

  const income = avgMonthlyDeposits * (1 - expenseFactorPercent / 100);
  const housing = Math.max(0, (income * maxDtiPercent) / 100 - monthlyDebts);
  const pi = Math.max(0, housing - taxesInsurance);
  const loan = presentValue(pi, annualRatePercent / 100 / 12, 360);

  return {
    qualifyingIncome: round2(income),
    maxHousingPayment: round2(housing),
    maxLoanAmount: round2(loan),
    maxHomePrice: round2(loan / (1 - downPaymentPercent / 100)),
  };
};

// --- 7. Seller-Financed Mortgage Calculator -------------------------------------------
export const sellerFinancedMortgageCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 300000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const amortizationYears = Math.max(1, Math.round(safeNumber(values.amortizationYears, 30)));
  const balloonYears = Math.max(0, Math.round(safeNumber(values.balloonYears, 5)));

  const loan = Math.max(0, salePrice - downPayment);
  const i = annualRatePercent / 100 / 12;
  const n = amortizationYears * 12;
  const p = payment(loan, i, n);
  const k = balloonYears > 0 ? Math.min(n, balloonYears * 12) : n;
  const balloon = balloonYears > 0 ? balanceAfter(loan, i, p, k) : 0;

  return {
    amountFinanced: round2(loan),
    monthlyPayment: round2(p),
    balloonPayment: round2(balloon),
    interestPaidBeforeBalloon: round2(p * k - (loan - balloon)),
    sellerTotalReceived: round2(downPayment + p * k + balloon),
  };
};

// --- 8. Rent-to-Own Mortgage Calculator ------------------------------------------------
export const rentToOwnMortgageCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 300000));
  const optionFee = Math.max(0, safeNumber(values.optionFee, 9000));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2200));
  const monthlyRentCredit = Math.max(0, safeNumber(values.monthlyRentCredit, 300));
  const leaseYears = Math.max(0, safeNumber(values.leaseYears, 3));
  const appreciationPercent = safeNumber(values.appreciationPercent, 4);
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));

  const months = Math.round(leaseYears * 12);
  const credits = optionFee + Math.min(monthlyRent, monthlyRentCredit) * months;
  const loan = Math.max(0, purchasePrice - credits);
  const value = purchasePrice * Math.pow(1 + appreciationPercent / 100, leaseYears);

  return {
    totalCredits: round2(credits),
    creditAsPercentOfPrice: round2(purchasePrice > 0 ? (credits / purchasePrice) * 100 : 0),
    mortgageNeeded: round2(loan),
    mortgagePayment: round2(payment(loan, annualRatePercent / 100 / 12, 360)),
    marketValueAtPurchase: round2(value),
    equityAtPurchase: round2(value - loan),
    totalRentPaid: round2(monthlyRent * months),
  };
};

// --- 9. Foreign National Mortgage Calculator -------------------------------------------
export const foreignNationalMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 500000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 30)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.75));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const closingCostsPercent = Math.max(0, safeNumber(values.closingCostsPercent, 3));
  const reserveMonths = Math.max(0, safeNumber(values.reserveMonths, 12));
  const annualTaxesInsurance = Math.max(0, safeNumber(values.annualTaxesInsurance, 8400));
  const exchangeRate = Math.max(0, safeNumber(values.exchangeRate, 1));

  const down = (homePrice * downPaymentPercent) / 100;
  const loan = homePrice - down;
  const pi = payment(loan, annualRatePercent / 100 / 12, termYears * 12);
  const total = pi + annualTaxesInsurance / 12;
  const reserves = total * reserveMonths;

  return {
    downPayment: round2(down),
    loanAmount: round2(loan),
    monthlyPayment: round2(total),
    reservesRequired: round2(reserves),
    totalCashNeeded: round2(down + (homePrice * closingCostsPercent) / 100 + reserves),
    monthlyPaymentHomeCurrency: round2(total * exchangeRate),
  };
};

// --- 10. Piggyback Loan Calculator (80/10/10 vs PMI) -----------------------------------
export const piggybackLoanCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 450000));
  const downPaymentPercent = Math.min(20, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const firstRatePercent = Math.max(0, safeNumber(values.firstRatePercent, 6.5));
  const secondRatePercent = Math.max(0, safeNumber(values.secondRatePercent, 8.5));
  const secondTermYears = Math.max(1, Math.round(safeNumber(values.secondTermYears, 15)));
  const singleRatePercent = Math.max(0, safeNumber(values.singleRatePercent, 6.5));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.5));
  const yearsKept = Math.max(1, Math.min(30, safeNumber(values.yearsKept, 7)));

  const k = Math.round(yearsKept * 12);
  const first = homePrice * 0.8;
  const second = Math.max(0, homePrice * (0.2 - downPaymentPercent / 100));
  const i1 = firstRatePercent / 100 / 12;
  const i2 = secondRatePercent / 100 / 12;
  const p1 = payment(first, i1, 360);
  const n2 = secondTermYears * 12;
  const p2 = payment(second, i2, n2);
  const piggyMonthly = p1 + p2;
  const piggyCost = p1 * k - (first - balanceAfter(first, i1, p1, k)) + (p2 * Math.min(k, n2) - (second - balanceAfter(second, i2, p2, Math.min(k, n2))));

  const single = first + second;
  const is = singleRatePercent / 100 / 12;
  const ps = payment(single, is, 360);
  const pmi = (single * pmiRatePercent) / 100 / 12;
  const pmiMonths = Math.min(k, monthsToBalance(single, is, ps, 360, homePrice * 0.78));
  const singleCost = ps * k - (single - balanceAfter(single, is, ps, k)) + pmi * pmiMonths;

  return {
    firstLoan: round2(first),
    secondLoan: round2(second),
    piggybackPayment: round2(piggyMonthly),
    singleLoanPaymentWithPmi: round2(ps + pmi),
    piggybackInterestCost: round2(piggyCost),
    singleLoanInterestAndPmi: round2(singleCost),
    piggybackSavings: round2(singleCost - piggyCost),
  };
};

export const mortgageLoanTypesCustomCalculators: Record<string, CustomCalculator> = {
  "conventional-mortgage-calculator": conventionalMortgageCalculator,
  "graduated-payment-mortgage-calculator": graduatedPaymentMortgageCalculator,
  "physician-mortgage-loan-calculator": physicianMortgageLoanCalculator,
  "assumable-mortgage-calculator": assumableMortgageCalculator,
  "blanket-mortgage-calculator": blanketMortgageCalculator,
  "non-qm-mortgage-calculator": nonQmMortgageCalculator,
  "seller-financed-mortgage-calculator": sellerFinancedMortgageCalculator,
  "rent-to-own-mortgage-calculator": rentToOwnMortgageCalculator,
  "foreign-national-mortgage-calculator": foreignNationalMortgageCalculator,
  "piggyback-loan-calculator": piggybackLoanCalculator,
};
