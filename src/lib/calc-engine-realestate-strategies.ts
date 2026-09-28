/**
 * Batch: "Real Estate Calculators" sub-batch E (Strategies & Comparisons, 11
 * tools). Part of the Real Estate build-out — see calc-engine-realestate-
 * rental-income.ts for the full list of 11 sub-batches. Filed under Finance
 * Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different (rent-vs-buy-
 * calculator already totals rent paid vs the net cost of buying):
 *  - capRateVsCashOnCashCalculator: the SAME property's unlevered cap rate
 *    vs levered cash-on-cash — whether the loan helps or hurts.
 *  - capRateVsRoiCalculator: cap rate vs year-1 total ROI including loan
 *    paydown and appreciation.
 *  - propertyInvestmentComparisonCalculator: two properties side by side.
 *  - multiplePropertyInvestmentCalculator: a three-property portfolio's
 *    combined cash flow, equity and blended cash-on-cash.
 *  - propertyInvestmentCalculator: a 10-year picture of one purchase —
 *    total return on cash and equity multiple.
 *  - buyAndHoldRealEstateCalculator: a 20-plus-year hold — equity, rent and
 *    cash flow when the loan is well paid down.
 *  - brrrrCalculator: Buy, Rehab, Rent, Refinance, Repeat — cash left in
 *    the deal after the refinance and the return on it.
 *  - brrrrRefinanceCalculator: the refinance step alone — cash-out after
 *    paying off the purchase loan and refi costs.
 *  - brrrrCashFlowCalculator: monthly cash flow on the NEW, larger loan.
 *  - buyVsRentCalculator: the "5% rule" — the yearly unrecoverable cost of
 *    owning vs renting.
 *  - rentVsOwnCalculator: NET WORTH after N years for an owner vs a renter
 *    who invests the down payment and monthly savings.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-strategies-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function payment(principal: number, annualRatePercent: number, years: number): number {
  const n = Math.round(years * 12);
  const i = annualRatePercent / 100 / 12;
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

function balanceAfter(principal: number, annualRatePercent: number, pmt: number, months: number): number {
  const i = annualRatePercent / 100 / 12;
  if (i === 0) return Math.max(0, principal - pmt * months);
  return Math.max(0, principal * Math.pow(1 + i, months) - (pmt * (Math.pow(1 + i, months) - 1)) / i);
}

const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// One property's key numbers from price, down %, rent, expenses and loan.
function deal(price: number, downPercent: number, closingPercent: number, monthlyRent: number, monthlyExpenses: number, rate: number, years: number) {
  const loan = price * (1 - downPercent / 100);
  const pmt = payment(loan, rate, years);
  const noi = (monthlyRent - monthlyExpenses) * 12;
  const cashFlow = noi - pmt * 12;
  const cashIn = price * (downPercent / 100 + closingPercent / 100);
  return { loan, pmt, noi, cashFlow, cashIn, cap: pct(noi, price), coc: pct(cashFlow, cashIn) };
}

// --- 1. Cap Rate vs Cash-on-Cash (leverage effect) ----------------------
export const capRateVsCashOnCashCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 400000));
  const annualNoi = safeNumber(values.annualNoi, 28000);
  const downPaymentPercent = Math.min(100, Math.max(0.01, safeNumber(values.downPaymentPercent, 25)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const debt = payment(loan, interestRatePercent, loanYears) * 12;
  const cash = (purchasePrice * downPaymentPercent) / 100;
  const cap = (annualNoi / purchasePrice) * 100;
  const coc = ((annualNoi - debt) / cash) * 100;

  return {
    capRatePercent: round2(cap),
    cashOnCashPercent: round2(coc),
    // Positive = the loan boosts your return; negative = it drags it down.
    leverageEffectPercent: round2(coc - cap),
    loanConstantPercent: loan > 0 ? round2((debt / loan) * 100) : 0,
  };
};

// --- 2. Cap Rate vs ROI (incl. paydown and appreciation) -----------------
export const capRateVsRoiCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 350000));
  const annualNoi = safeNumber(values.annualNoi, 24500);
  const downPaymentPercent = Math.min(100, Math.max(0.01, safeNumber(values.downPaymentPercent, 25)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const pmt = payment(loan, interestRatePercent, loanYears);
  const cashFlow = annualNoi - pmt * 12;
  const paydown = loan - balanceAfter(loan, interestRatePercent, pmt, 12);
  const appreciation = (purchasePrice * appreciationPercent) / 100;
  const cash = (purchasePrice * downPaymentPercent) / 100;

  return {
    capRatePercent: pct(annualNoi, purchasePrice),
    totalRoiYear1Percent: pct(cashFlow + paydown + appreciation, cash),
    cashFlowOnlyRoiPercent: pct(cashFlow, cash),
    totalReturnYear1: round2(cashFlow + paydown + appreciation),
  };
};

// --- 3. Property Investment Comparison (two properties) -----------------
export const propertyInvestmentComparisonCalculator: CustomCalculator = (values) => {
  const common = {
    down: Math.min(100, Math.max(0.01, safeNumber(values.downPaymentPercent, 25))),
    closing: Math.max(0, safeNumber(values.closingCostPercent, 3)),
    rate: Math.max(0, safeNumber(values.interestRatePercent, 7)),
  };
  const a = deal(Math.max(0.01, safeNumber(values.priceA, 250000)), common.down, common.closing, Math.max(0, safeNumber(values.rentA, 2100)), Math.max(0, safeNumber(values.expensesA, 700)), common.rate, 30);
  const b = deal(Math.max(0.01, safeNumber(values.priceB, 380000)), common.down, common.closing, Math.max(0, safeNumber(values.rentB, 2900)), Math.max(0, safeNumber(values.expensesB, 950)), common.rate, 30);

  return {
    cashOnCashDifferenceAMinusB: round2(a.coc - b.coc),
    cashOnCashA: a.coc,
    cashOnCashB: b.coc,
    capRateA: a.cap,
    capRateB: b.cap,
    monthlyCashFlowA: round2(a.cashFlow / 12),
    monthlyCashFlowB: round2(b.cashFlow / 12),
  };
};

// --- 4. Multiple Property Investment (portfolio of 3) -------------------
export const multiplePropertyInvestmentCalculator: CustomCalculator = (values) => {
  const props = [1, 2, 3].map((k) => ({
    value: Math.max(0, safeNumber(values[`property${k}Value`], [300000, 250000, 400000][k - 1])),
    loan: Math.max(0, safeNumber(values[`property${k}LoanBalance`], [210000, 150000, 300000][k - 1])),
    cashFlow: safeNumber(values[`property${k}AnnualCashFlow`], [4200, 5400, 3000][k - 1]),
    cashInvested: Math.max(0, safeNumber(values[`property${k}CashInvested`], [70000, 65000, 105000][k - 1])),
  }));

  const sum = (f: (p: (typeof props)[0]) => number) => props.reduce((a, p) => a + f(p), 0);
  const cf = sum((p) => p.cashFlow);
  const invested = sum((p) => p.cashInvested);

  return {
    totalAnnualCashFlow: round2(cf),
    totalEquity: round2(sum((p) => p.value - p.loan)),
    blendedCashOnCashPercent: pct(cf, invested),
    portfolioLtvPercent: pct(sum((p) => p.loan), sum((p) => p.value)),
    monthlyCashFlow: round2(cf / 12),
  };
};

// --- 5. Property Investment Calculator (10-year picture) -----------------
export const propertyInvestmentCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 350000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 25)));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 10000));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2600));
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses, 850));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);
  const rentGrowthPercent = safeNumber(values.rentGrowthPercent, 3);

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const pmt = payment(loan, interestRatePercent, 30);
  const cashIn = purchasePrice - loan + closingCosts;
  let cf = 0;
  for (let y = 0; y < 10; y++) {
    const g = Math.pow(1 + rentGrowthPercent / 100, y);
    cf += (monthlyRent - monthlyExpenses) * g * 12 - pmt * 12;
  }
  const equity = purchasePrice * Math.pow(1 + appreciationPercent / 100, 10) - balanceAfter(loan, interestRatePercent, pmt, 120);

  return {
    tenYearTotalReturn: round2(cf + equity - cashIn),
    equityAfter10Years: round2(equity),
    cashFlowOver10Years: round2(cf),
    equityMultiple: cashIn > 0 ? round2((cf + equity) / cashIn) : 0,
    year1MonthlyCashFlow: round2(monthlyRent - monthlyExpenses - pmt),
  };
};

// --- 6. Buy and Hold Real Estate (20+ years) ------------------------------
export const buyAndHoldRealEstateCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 300000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2300));
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses, 750));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);
  const rentGrowthPercent = safeNumber(values.rentGrowthPercent, 3);
  const holdYears = Math.max(1, Math.round(safeNumber(values.holdYears, 20)));

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const pmt = payment(loan, interestRatePercent, 30);
  const monthsPaid = Math.min(360, holdYears * 12);
  const balance = balanceAfter(loan, interestRatePercent, pmt, monthsPaid);
  const value = purchasePrice * Math.pow(1 + appreciationPercent / 100, holdYears);
  const g = Math.pow(1 + rentGrowthPercent / 100, holdYears);
  const loanStillRunning = holdYears < 30;
  let cf = 0;
  for (let y = 0; y < holdYears; y++) {
    const gy = Math.pow(1 + rentGrowthPercent / 100, y);
    cf += (monthlyRent - monthlyExpenses) * gy * 12 - (y < 30 ? pmt * 12 : 0);
  }

  return {
    equityAtEndOfHold: round2(value - balance),
    propertyValueThen: round2(value),
    monthlyRentThen: round2(monthlyRent * g),
    monthlyCashFlowThen: round2((monthlyRent - monthlyExpenses) * g - (loanStillRunning ? pmt : 0)),
    totalCashFlowCollected: round2(cf),
  };
};

// --- 7. BRRRR Calculator (cash left in the deal) --------------------------
export const brrrrCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 150000));
  const rehabCost = Math.max(0, safeNumber(values.rehabCost, 45000));
  const purchaseAndHoldingCosts = Math.max(0, safeNumber(values.purchaseAndHoldingCosts, 12000));
  const afterRepairValue = Math.max(0, safeNumber(values.afterRepairValue, 260000));
  const refinanceLtvPercent = Math.max(0, safeNumber(values.refinanceLtvPercent, 75));
  const refinanceCosts = Math.max(0, safeNumber(values.refinanceCosts, 5000));
  const annualCashFlowAfterRefi = safeNumber(values.annualCashFlowAfterRefi, 2400);

  const allIn = purchasePrice + rehabCost + purchaseAndHoldingCosts;
  const newLoan = (afterRepairValue * refinanceLtvPercent) / 100;
  const cashLeft = allIn + refinanceCosts - newLoan;

  return {
    cashLeftInDeal: round2(cashLeft),
    newLoanAmount: round2(newLoan),
    totalAllInCost: round2(allIn),
    equityAfterRefinance: round2(afterRepairValue - newLoan),
    // 0 when no cash is left in the deal (the "infinite return" case).
    cashOnCashOnCashLeftPercent: cashLeft > 0 ? pct(annualCashFlowAfterRefi, cashLeft) : 0,
  };
};

// --- 8. BRRRR Refinance Calculator (cash-out) ---------------------------------
export const brrrrRefinanceCalculator: CustomCalculator = (values) => {
  const afterRepairValue = Math.max(0, safeNumber(values.afterRepairValue, 260000));
  const refinanceLtvPercent = Math.max(0, safeNumber(values.refinanceLtvPercent, 75));
  const existingLoanPayoff = Math.max(0, safeNumber(values.existingLoanPayoff, 150000));
  const refinanceClosingCosts = Math.max(0, safeNumber(values.refinanceClosingCosts, 5500));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 7.5));
  const newLoanYears = Math.max(1, safeNumber(values.newLoanYears, 30));

  const newLoan = (afterRepairValue * refinanceLtvPercent) / 100;

  return {
    cashOutToYou: round2(newLoan - existingLoanPayoff - refinanceClosingCosts),
    newLoanAmount: round2(newLoan),
    newMonthlyPayment: round2(payment(newLoan, newRatePercent, newLoanYears)),
    equityLeftInProperty: round2(afterRepairValue - newLoan),
  };
};

// --- 9. BRRRR Cash Flow Calculator (after refinance) -----------------------
export const brrrrCashFlowCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2100));
  const newLoanAmount = Math.max(0, safeNumber(values.newLoanAmount, 195000));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 7.5));
  const newLoanYears = Math.max(1, safeNumber(values.newLoanYears, 30));
  const monthlyTaxInsurance = Math.max(0, safeNumber(values.monthlyTaxInsurance, 320));
  const reservesPercent = Math.max(0, safeNumber(values.reservesPercent, 20));

  const pi = payment(newLoanAmount, newRatePercent, newLoanYears);
  const reserves = (monthlyRent * reservesPercent) / 100;
  const cf = monthlyRent - pi - monthlyTaxInsurance - reserves;

  return {
    monthlyCashFlow: round2(cf),
    annualCashFlow: round2(cf * 12),
    newMonthlyPrincipalAndInterest: round2(pi),
    monthlyReserves: round2(reserves),
    dscr: pi + monthlyTaxInsurance > 0 ? round2(monthlyRent / (pi + monthlyTaxInsurance)) : 0,
  };
};

// --- 10. Buy vs Rent Calculator (the 5% rule) ------------------------------
export const buyVsRentCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 500000));
  const propertyTaxPercent = Math.max(0, safeNumber(values.propertyTaxPercent, 1.1));
  const maintenancePercent = Math.max(0, safeNumber(values.maintenancePercent, 1));
  const costOfCapitalPercent = Math.max(0, safeNumber(values.costOfCapitalPercent, 3));
  const monthlyRentForSimilarHome = Math.max(0, safeNumber(values.monthlyRentForSimilarHome, 2300));

  const unrecoverablePercent = propertyTaxPercent + maintenancePercent + costOfCapitalPercent;
  const yearly = (homePrice * unrecoverablePercent) / 100;

  return {
    breakEvenMonthlyRent: round2(yearly / 12),
    yearlyUnrecoverableCostOfOwning: round2(yearly),
    unrecoverableCostPercent: round2(unrecoverablePercent),
    // Positive = renting is cheaper by this much per month.
    monthlySavingIfRenting: round2(yearly / 12 - monthlyRentForSimilarHome),
  };
};

// --- 11. Rent vs Own (net worth comparison) ---------------------------------
export const rentVsOwnCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 450000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const ownerMonthlyExtraCosts = Math.max(0, safeNumber(values.ownerMonthlyExtraCosts, 900));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2400));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);
  const investmentReturnPercent = safeNumber(values.investmentReturnPercent, 6);
  const rentGrowthPercent = safeNumber(values.rentGrowthPercent, 3);
  const years = Math.max(1, Math.round(safeNumber(values.years, 10)));

  const down = (homePrice * downPaymentPercent) / 100;
  const loan = homePrice - down;
  const pmt = payment(loan, interestRatePercent, 30);
  const i = investmentReturnPercent / 100 / 12;
  // The renter invests the down payment, and each month invests whatever
  // owning would have cost beyond the rent (or draws down if rent is more).
  let renter = down;
  for (let m = 0; m < years * 12; m++) {
    const rent = monthlyRent * Math.pow(1 + rentGrowthPercent / 100, Math.floor(m / 12));
    // Owner's taxes, insurance and upkeep rise at the same rate as rents.
    const own = pmt + ownerMonthlyExtraCosts * Math.pow(1 + rentGrowthPercent / 100, Math.floor(m / 12));
    renter = renter * (1 + i) + (own - rent);
  }
  const ownerNetWorth = homePrice * Math.pow(1 + appreciationPercent / 100, years) - balanceAfter(loan, interestRatePercent, pmt, years * 12);

  return {
    // Positive = owning leaves you wealthier.
    owningAdvantage: round2(ownerNetWorth - renter),
    ownerNetWorth: round2(ownerNetWorth),
    renterNetWorth: round2(renter),
    ownerMonthlyCostYear1: round2(pmt + ownerMonthlyExtraCosts),
  };
};

export const realestateStrategiesCustomCalculators: Record<string, CustomCalculator> = {
  "capitalization-rate-vs-cash-on-cash-calculator": capRateVsCashOnCashCalculator,
  "cap-rate-vs-roi-calculator": capRateVsRoiCalculator,
  "property-investment-comparison-calculator": propertyInvestmentComparisonCalculator,
  "multiple-property-investment-calculator": multiplePropertyInvestmentCalculator,
  "property-investment-calculator": propertyInvestmentCalculator,
  "buy-and-hold-real-estate-calculator": buyAndHoldRealEstateCalculator,
  "brrrr-calculator": brrrrCalculator,
  "brrrr-refinance-calculator": brrrrRefinanceCalculator,
  "brrrr-cash-flow-calculator": brrrrCashFlowCalculator,
  "buy-vs-rent-calculator": buyVsRentCalculator,
  "rent-vs-own-calculator": rentVsOwnCalculator,
};
