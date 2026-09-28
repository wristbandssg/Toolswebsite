/**
 * Batch: "Real Estate Calculators" sub-batch D (Returns, Equity & Debt, 10
 * tools). Part of the Real Estate build-out — see calc-engine-realestate-
 * rental-income.ts for the full list of 11 sub-batches. Filed under Finance
 * Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different (real-estate-roi-
 * calculator already gives total ROI and cash-on-cash over a holding
 * period; loan-to-value-ltv-calculator under Mortgage checks PMI; the
 * business DSCR tool uses NOI):
 *  - realEstateInvestmentReturnCalculator: the IRR and equity multiple of a
 *    buy-hold-sell investment, year-by-year cash flows and sale included.
 *  - realEstateCashFlowCalculator: a 5-year cash-flow projection with rents
 *    and expenses growing at different rates.
 *  - realEstateProfitCalculator: the total profit when you SELL — sale gain
 *    plus the cash flow collected.
 *  - realEstateBreakEvenCalculator: the sale price, appreciation and years
 *    needed just to cover buying and selling costs.
 *  - realEstatePaybackPeriodCalculator: payback counting loan paydown as
 *    well as cash flow.
 *  - realEstateEquityCalculator: equity across up to three properties and
 *    what could be borrowed against it.
 *  - homeEquityCalculator: a home's equity and what a HELOC/home-equity loan
 *    could give at a lender's combined LTV limit.
 *  - loanToValueRealEstateCalculator: an INVESTOR's loan sizing — LTV on the
 *    lower of price or appraisal, max loan and cash needed.
 *  - dscrRealEstateCalculator: a DSCR (investor) loan — rent ÷ PITIA, and
 *    the largest loan that still qualifies.
 *  - debtYieldCalculator: NOI ÷ loan amount and the max loan at a lender's
 *    minimum debt yield.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-returns-equity-debt-calculators.ts for the
 * tool content/copy this math is wired to.
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

// Loan amount whose monthly payment is `pmt`.
function loanFromPayment(pmt: number, annualRatePercent: number, years: number): number {
  const n = Math.round(years * 12);
  const i = annualRatePercent / 100 / 12;
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

// Internal rate of return for yearly cash flows (flows[0] at time 0).
function irr(flows: number[]): number {
  const npv = (r: number) => flows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
  let lo = -0.99;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return 0;
  for (let k = 0; k < 300; k++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Real Estate Investment Return (IRR, equity multiple) -------------
export const realEstateInvestmentReturnCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 400000));
  const cashInvested = Math.max(0.01, safeNumber(values.cashInvested, 110000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const firstYearCashFlow = safeNumber(values.firstYearCashFlow, 5000);
  const cashFlowGrowthPercent = safeNumber(values.cashFlowGrowthPercent, 3);
  const appreciationPercent = safeNumber(values.appreciationPercent, 3.5);
  const holdYears = Math.max(1, Math.round(safeNumber(values.holdYears, 7)));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 6));

  const pmt = payment(loanAmount, interestRatePercent, loanYears);
  const flows = [-cashInvested];
  let cfTotal = 0;
  for (let y = 1; y <= holdYears; y++) {
    const cf = firstYearCashFlow * Math.pow(1 + cashFlowGrowthPercent / 100, y - 1);
    cfTotal += cf;
    flows.push(cf);
  }
  const sale = purchasePrice * Math.pow(1 + appreciationPercent / 100, holdYears);
  const saleProceeds = sale * (1 - sellingCostPercent / 100) - balanceAfter(loanAmount, interestRatePercent, pmt, holdYears * 12);
  flows[holdYears] += saleProceeds;
  const totalBack = cfTotal + saleProceeds;

  return {
    irrPercent: round2(irr(flows) * 100),
    equityMultiple: round2(totalBack / cashInvested),
    totalProfit: round2(totalBack - cashInvested),
    netSaleProceeds: round2(saleProceeds),
    cashFlowCollected: round2(cfTotal),
  };
};

// --- 2. Real Estate Cash Flow (5-year projection) -------------------------
export const realEstateCashFlowCalculator: CustomCalculator = (values) => {
  const grossAnnualRent = Math.max(0, safeNumber(values.grossAnnualRent, 36000));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 5)));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses, 12000));
  const annualDebtService = Math.max(0, safeNumber(values.annualDebtService, 18000));
  const rentGrowthPercent = safeNumber(values.rentGrowthPercent, 3);
  const expenseGrowthPercent = safeNumber(values.expenseGrowthPercent, 4);

  let total = 0;
  let year1 = 0;
  let year5 = 0;
  for (let y = 0; y < 5; y++) {
    const rent = grossAnnualRent * Math.pow(1 + rentGrowthPercent / 100, y) * (1 - vacancyPercent / 100);
    const opex = operatingExpenses * Math.pow(1 + expenseGrowthPercent / 100, y);
    const cf = rent - opex - annualDebtService;
    total += cf;
    if (y === 0) year1 = cf;
    if (y === 4) year5 = cf;
  }

  return {
    fiveYearCashFlowTotal: round2(total),
    year1CashFlow: round2(year1),
    year5CashFlow: round2(year5),
    year1Noi: round2(grossAnnualRent * (1 - vacancyPercent / 100) - operatingExpenses),
  };
};

// --- 3. Real Estate Profit (on sale, incl. cash flow) ---------------------
export const realEstateProfitCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 300000));
  const buyingCosts = Math.max(0, safeNumber(values.buyingCosts, 9000));
  const improvements = Math.max(0, safeNumber(values.improvements, 25000));
  const salePrice = Math.max(0, safeNumber(values.salePrice, 410000));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 7));
  const totalCashFlowCollected = safeNumber(values.totalCashFlowCollected, 18000);

  const cost = purchasePrice + buyingCosts + improvements;
  const sellCosts = (salePrice * sellingCostPercent) / 100;
  const saleGain = salePrice - sellCosts - cost;

  return {
    totalProfit: round2(saleGain + totalCashFlowCollected),
    profitFromSale: round2(saleGain),
    sellingCosts: round2(sellCosts),
    totalInvestedInProperty: round2(cost),
    returnOnTotalCostPercent: cost > 0 ? round2(((saleGain + totalCashFlowCollected) / cost) * 100) : 0,
  };
};

// --- 4. Real Estate Break-Even (price, appreciation, years) --------------
export const realEstateBreakEvenCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 350000));
  const buyingCostPercent = Math.max(0, safeNumber(values.buyingCostPercent, 3));
  const sellingCostPercent = Math.min(99, Math.max(0, safeNumber(values.sellingCostPercent, 7)));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);

  const breakEvenPrice = (purchasePrice * (1 + buyingCostPercent / 100)) / (1 - sellingCostPercent / 100);
  const needed = breakEvenPrice / purchasePrice - 1;

  return {
    breakEvenSalePrice: round2(breakEvenPrice),
    appreciationNeededPercent: round2(needed * 100),
    // 0 = the property isn't appreciating.
    yearsToBreakEven: appreciationPercent > 0 ? round2(Math.log(1 + needed) / Math.log(1 + appreciationPercent / 100)) : 0,
    totalTransactionCosts: round2(breakEvenPrice - purchasePrice),
  };
};

// --- 5. Real Estate Payback Period (cash flow + loan paydown) ------------
export const realEstatePaybackPeriodCalculator: CustomCalculator = (values) => {
  const cashInvested = Math.max(0, safeNumber(values.cashInvested, 80000));
  const annualCashFlow = safeNumber(values.annualCashFlow, 4000);
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 280000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));

  const pmt = payment(loanAmount, interestRatePercent, loanYears);
  let years = 0;
  let cum = 0;
  for (let y = 1; y <= 100; y++) {
    const paydown = balanceAfter(loanAmount, interestRatePercent, pmt, (y - 1) * 12) - balanceAfter(loanAmount, interestRatePercent, pmt, y * 12);
    const gain = annualCashFlow + paydown;
    if (gain > 0 && cum + gain >= cashInvested) {
      years = y - 1 + (cashInvested - cum) / gain;
      break;
    }
    cum += gain;
  }

  return {
    // 0 = not within 100 years.
    paybackYearsWithLoanPaydown: round2(years),
    paybackYearsCashFlowOnly: annualCashFlow > 0 ? round2(cashInvested / annualCashFlow) : 0,
    loanPaydownYear1: round2(loanAmount - balanceAfter(loanAmount, interestRatePercent, pmt, 12)),
  };
};

// --- 6. Real Estate Equity (portfolio of up to 3) -------------------------
export const realEstateEquityCalculator: CustomCalculator = (values) => {
  const props = [1, 2, 3].map((k) => ({
    value: Math.max(0, safeNumber(values[`property${k}Value`], [450000, 300000, 0][k - 1])),
    loan: Math.max(0, safeNumber(values[`property${k}LoanBalance`], [280000, 150000, 0][k - 1])),
  }));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 75));

  const value = props.reduce((a, p) => a + p.value, 0);
  const debt = props.reduce((a, p) => a + p.loan, 0);

  return {
    totalEquity: round2(value - debt),
    totalValue: round2(value),
    portfolioLtvPercent: value > 0 ? round2((debt / value) * 100) : 0,
    equityAvailableToBorrow: round2(Math.max(0, (value * maxLtvPercent) / 100 - debt)),
  };
};

// --- 7. Home Equity Calculator (HELOC capacity) --------------------------
export const homeEquityCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 500000));
  const mortgageBalance = Math.max(0, safeNumber(values.mortgageBalance, 280000));
  const otherLiens = Math.max(0, safeNumber(values.otherLiens, 0));
  const lenderMaxCltvPercent = Math.max(0, safeNumber(values.lenderMaxCltvPercent, 85));

  const debt = mortgageBalance + otherLiens;

  return {
    homeEquity: round2(homeValue - debt),
    equityPercent: homeValue > 0 ? round2(((homeValue - debt) / homeValue) * 100) : 0,
    maxHelocOrHomeEquityLoan: round2(Math.max(0, (homeValue * lenderMaxCltvPercent) / 100 - debt)),
    currentCltvPercent: homeValue > 0 ? round2((debt / homeValue) * 100) : 0,
  };
};

// --- 8. Loan-to-Value (investor sizing) ------------------------------------
export const loanToValueRealEstateCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 320000));
  const appraisedValue = Math.max(0, safeNumber(values.appraisedValue, 310000));
  const loanAmountRequested = Math.max(0, safeNumber(values.loanAmountRequested, 240000));
  const lenderMaxLtvPercent = Math.max(0, safeNumber(values.lenderMaxLtvPercent, 75));

  // Lenders size on the LOWER of purchase price and appraisal.
  const basis = Math.max(0.01, Math.min(purchasePrice, appraisedValue));
  const maxLoan = (basis * lenderMaxLtvPercent) / 100;

  return {
    ltvPercent: round2((loanAmountRequested / basis) * 100),
    maxLoanAllowed: round2(maxLoan),
    cashNeededAtMaxLoan: round2(purchasePrice - maxLoan),
    requestedOverMax: round2(Math.max(0, loanAmountRequested - maxLoan)),
  };
};

// --- 9. DSCR Real Estate (investor DSCR loan) -----------------------------
export const dscrRealEstateCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2600));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 280000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7.75));
  const loanYears = Math.max(1, safeNumber(values.loanYears, 30));
  const monthlyTaxInsuranceHoa = Math.max(0, safeNumber(values.monthlyTaxInsuranceHoa, 450));
  const requiredDscr = Math.max(0.1, safeNumber(values.requiredDscr, 1.1));

  const pi = payment(loanAmount, interestRatePercent, loanYears);
  const pitia = pi + monthlyTaxInsuranceHoa;
  const maxPi = monthlyRent / requiredDscr - monthlyTaxInsuranceHoa;

  return {
    dscr: pitia > 0 ? round2(monthlyRent / pitia) : 0,
    monthlyPitia: round2(pitia),
    maxLoanAtRequiredDscr: round2(Math.max(0, loanFromPayment(maxPi, interestRatePercent, loanYears))),
    rentNeededForRequiredDscr: round2(pitia * requiredDscr),
  };
};

// --- 10. Debt Yield Calculator ---------------------------------------------
export const debtYieldCalculator: CustomCalculator = (values) => {
  const netOperatingIncome = Math.max(0, safeNumber(values.netOperatingIncome, 150000));
  const loanAmount = Math.max(0.01, safeNumber(values.loanAmount, 1400000));
  const minimumDebtYieldPercent = Math.max(0.01, safeNumber(values.minimumDebtYieldPercent, 10));

  return {
    debtYieldPercent: round2((netOperatingIncome / loanAmount) * 100),
    maxLoanAtMinimumDebtYield: round2(netOperatingIncome / (minimumDebtYieldPercent / 100)),
    noiNeededForThisLoan: round2((loanAmount * minimumDebtYieldPercent) / 100),
  };
};

export const realestateReturnsEquityDebtCustomCalculators: Record<string, CustomCalculator> = {
  "real-estate-investment-return-calculator": realEstateInvestmentReturnCalculator,
  "real-estate-cash-flow-calculator": realEstateCashFlowCalculator,
  "real-estate-profit-calculator": realEstateProfitCalculator,
  "real-estate-break-even-calculator": realEstateBreakEvenCalculator,
  "real-estate-payback-period-calculator": realEstatePaybackPeriodCalculator,
  "real-estate-equity-calculator": realEstateEquityCalculator,
  "home-equity-calculator": homeEquityCalculator,
  "loan-to-value-real-estate-calculator": loanToValueRealEstateCalculator,
  "dscr-real-estate-calculator": dscrRealEstateCalculator,
  "debt-yield-calculator": debtYieldCalculator,
};
