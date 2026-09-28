/**
 * Batch: "Real Estate Calculators" sub-batch I (Real Estate Mortgages &
 * Commercial Property, 9 tools). Part of the Real Estate build-out — see
 * calc-engine-realestate-rental-income.ts for the full list of 11
 * sub-batches. Filed under Finance Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different (the general
 * mortgage calculators live in Loan Calculators):
 *  - realEstateMortgageCalculator: full PITI with PMI added automatically
 *    under 20% down, and the month PMI drops off at 78% loan-to-value.
 *  - investmentPropertyMortgageCalculator: an investor loan — rate premium
 *    over owner-occupied, the extra it costs, and the rent needed for a
 *    DSCR of 1.25.
 *  - rentalPropertyMortgageCalculator: how much a lender lets the rent count
 *    (75% of it) toward qualifying, and the payment it covers.
 *  - commercialPropertyLoanCalculator: the commercial loan size — the lower
 *    of the LTV limit and the DSCR limit.
 *  - commercialRealEstateCalculator: a commercial building from $/sq ft rent
 *    to NOI, cap rate and price per square foot.
 *  - commercialCapRateCalculator: cap rate vs the market's cap rate and its
 *    spread over the 10-year Treasury.
 *  - commercialPropertyRoiCalculator: a multi-year hold with annual rent
 *    escalations — total return and annualized ROI.
 *  - commercialPropertyCashFlowCalculator: cash flow under a NNN lease
 *    (tenant reimburses expenses) vs a gross lease.
 *  - commercialLoanDscrCalculator: DSCR and how far NOI can fall, or the
 *    rate can rise, before hitting the lender's minimum.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-mortgage-commercial-calculators.ts for the
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

const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// --- 1. Real Estate Mortgage (PITI + automatic PMI) ------------------------
export const realEstateMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 425000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const propertyTaxRatePercent = Math.max(0, safeNumber(values.propertyTaxRatePercent, 1.1));
  const annualInsurance = Math.max(0, safeNumber(values.annualInsurance, 1800));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.6));

  const loan = homePrice * (1 - downPaymentPercent / 100);
  const pi = payment(loan, interestRatePercent, loanTermYears);
  const tax = (homePrice * propertyTaxRatePercent) / 100 / 12;
  const ins = annualInsurance / 12;
  const hasPmi = loan > homePrice * 0.8;
  const pmi = hasPmi ? (loan * pmiRatePercent) / 100 / 12 : 0;

  // PMI ends automatically once the scheduled balance reaches 78% of price.
  let pmiMonths = 0;
  if (hasPmi) {
    const target = homePrice * 0.78;
    const total = Math.round(loanTermYears * 12);
    while (pmiMonths < total && balanceAfter(loan, interestRatePercent, pi, pmiMonths) > target) pmiMonths++;
  }

  return {
    totalMonthlyPayment: round2(pi + tax + ins + pmi),
    monthlyPrincipalAndInterest: round2(pi),
    monthlyTaxesAndInsurance: round2(tax + ins),
    monthlyPmi: round2(pmi),
    monthsUntilPmiDrops: pmiMonths,
    totalPmiPaid: round2(pmi * pmiMonths),
  };
};

// --- 2. Investment Property Mortgage -----------------------------------------
export const investmentPropertyMortgageCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 350000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 25)));
  const ownerOccupiedRatePercent = Math.max(0, safeNumber(values.ownerOccupiedRatePercent, 6.5));
  const investorRatePremiumPercent = Math.max(0, safeNumber(values.investorRatePremiumPercent, 0.75));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const monthlyTaxesInsuranceHoa = Math.max(0, safeNumber(values.monthlyTaxesInsuranceHoa, 550));

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const rate = ownerOccupiedRatePercent + investorRatePremiumPercent;
  const pi = payment(loan, rate, loanTermYears);
  const piOwner = payment(loan, ownerOccupiedRatePercent, loanTermYears);
  const pitia = pi + monthlyTaxesInsuranceHoa;

  return {
    monthlyPrincipalAndInterest: round2(pi),
    monthlyPitia: round2(pitia),
    investorRate: round2(rate),
    extraCostPerMonthVsOwnerRate: round2(pi - piOwner),
    // Many DSCR lenders want rent of at least 1.25× the payment.
    rentNeededForDscr125: round2(pitia * 1.25),
    downPaymentAmount: round2(purchasePrice - loan),
  };
};

// --- 3. Rental Property Mortgage (rent as qualifying income) -------------
export const rentalPropertyMortgageCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 320000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7.25));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const monthlyTaxesAndInsurance = Math.max(0, safeNumber(values.monthlyTaxesAndInsurance, 480));
  const expectedMonthlyRent = Math.max(0, safeNumber(values.expectedMonthlyRent, 2600));
  const rentCountedPercent = Math.max(0, safeNumber(values.rentCountedPercent, 75));

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const pitia = payment(loan, interestRatePercent, loanTermYears) + monthlyTaxesAndInsurance;
  const counted = (expectedMonthlyRent * rentCountedPercent) / 100;

  return {
    monthlyPitia: round2(pitia),
    rentCountedAsIncome: round2(counted),
    netRentalIncomeForQualifying: round2(counted - pitia),
    rentCoverageRatio: pitia > 0 ? round2(expectedMonthlyRent / pitia) : 0,
    loanAmount: round2(loan),
  };
};

// --- 4. Commercial Property Loan (LTV vs DSCR limit) -----------------------
export const commercialPropertyLoanCalculator: CustomCalculator = (values) => {
  const propertyValue = Math.max(0, safeNumber(values.propertyValue, 2000000));
  const netOperatingIncome = Math.max(0, safeNumber(values.netOperatingIncome, 150000));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 75));
  const minDscr = Math.max(0.01, safeNumber(values.minDscr, 1.25));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const amortizationYears = Math.max(1, safeNumber(values.amortizationYears, 25));

  const byLtv = (propertyValue * maxLtvPercent) / 100;
  const byDscr = loanFromPayment(netOperatingIncome / minDscr / 12, interestRatePercent, amortizationYears);
  const loan = Math.min(byLtv, byDscr);
  const pmt = payment(loan, interestRatePercent, amortizationYears);

  return {
    maxLoanAmount: round2(loan),
    loanLimitByLtv: round2(byLtv),
    loanLimitByDscr: round2(byDscr),
    monthlyPayment: round2(pmt),
    equityRequired: round2(propertyValue - loan),
    resultingDscr: pmt > 0 ? round2(netOperatingIncome / (pmt * 12)) : 0,
  };
};

// --- 5. Commercial Real Estate (per-sq-ft rent → NOI, value) -------------
export const commercialRealEstateCalculator: CustomCalculator = (values) => {
  const rentableSquareFeet = Math.max(0, safeNumber(values.rentableSquareFeet, 12000));
  const annualRentPerSqft = Math.max(0, safeNumber(values.annualRentPerSqft, 24));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 8)));
  const operatingExpensesPerSqft = Math.max(0, safeNumber(values.operatingExpensesPerSqft, 8));
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 2400000));

  const gross = rentableSquareFeet * annualRentPerSqft;
  const effective = gross * (1 - vacancyPercent / 100);
  const noi = effective - rentableSquareFeet * operatingExpensesPerSqft;

  return {
    netOperatingIncome: round2(noi),
    capRatePercent: pct(noi, purchasePrice),
    effectiveGrossIncome: round2(effective),
    pricePerSquareFoot: rentableSquareFeet > 0 ? round2(purchasePrice / rentableSquareFeet) : 0,
    noiPerSquareFoot: rentableSquareFeet > 0 ? round2(noi / rentableSquareFeet) : 0,
  };
};

// --- 6. Commercial Cap Rate (vs market, Treasury spread) -----------------
export const commercialCapRateCalculator: CustomCalculator = (values) => {
  const netOperatingIncome = Math.max(0, safeNumber(values.netOperatingIncome, 180000));
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 2600000));
  const marketCapRatePercent = Math.max(0.01, safeNumber(values.marketCapRatePercent, 7.5));
  const tenYearTreasuryPercent = safeNumber(values.tenYearTreasuryPercent, 4.2);

  const cap = (netOperatingIncome / purchasePrice) * 100;
  const marketValue = netOperatingIncome / (marketCapRatePercent / 100);

  return {
    capRatePercent: round2(cap),
    valueAtMarketCapRate: round2(marketValue),
    priceAboveOrBelowMarketValue: round2(purchasePrice - marketValue),
    spreadOverTreasuryPercent: round2(cap - tenYearTreasuryPercent),
  };
};

// --- 7. Commercial Property ROI (hold with escalations) ------------------
export const commercialPropertyRoiCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 2000000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 30)));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 2));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const amortizationYears = Math.max(1, safeNumber(values.amortizationYears, 25));
  const firstYearNoi = safeNumber(values.firstYearNoi, 150000);
  const annualRentEscalationPercent = safeNumber(values.annualRentEscalationPercent, 3);
  const holdYears = Math.max(1, Math.min(30, Math.round(safeNumber(values.holdYears, 7))));
  const exitCapRatePercent = Math.max(0.1, safeNumber(values.exitCapRatePercent, 7.5));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 3));

  const loan = purchasePrice * (1 - downPaymentPercent / 100);
  const cash = purchasePrice - loan + (purchasePrice * closingCostPercent) / 100;
  const debt = payment(loan, interestRatePercent, amortizationYears) * 12;
  let cashFlows = 0;
  let noi = firstYearNoi;
  for (let y = 1; y <= holdYears; y++) {
    cashFlows += noi - debt;
    if (y < holdYears) noi *= 1 + annualRentEscalationPercent / 100;
  }
  const exitNoi = noi * (1 + annualRentEscalationPercent / 100);
  const sale = exitNoi / (exitCapRatePercent / 100);
  const balance = balanceAfter(loan, interestRatePercent, debt / 12, Math.min(holdYears, amortizationYears) * 12);
  const proceeds = sale * (1 - sellingCostPercent / 100) - balance;
  const total = cashFlows + proceeds - cash;
  const multiple = cash > 0 ? (cashFlows + proceeds) / cash : 0;

  return {
    totalProfit: round2(total),
    totalRoiPercent: pct(total, cash),
    annualizedRoiPercent: multiple > 0 ? round2((Math.pow(multiple, 1 / holdYears) - 1) * 100) : -100,
    salePrice: round2(sale),
    cumulativeCashFlow: round2(cashFlows),
    cashInvested: round2(cash),
  };
};

// --- 8. Commercial Property Cash Flow (NNN vs gross) ---------------------
export const commercialPropertyCashFlowCalculator: CustomCalculator = (values) => {
  const annualBaseRent = Math.max(0, safeNumber(values.annualBaseRent, 240000));
  // 1 = NNN (tenant pays taxes, insurance, CAM), 2 = gross (landlord pays).
  const leaseType = safeNumber(values.leaseType, 1) === 2 ? 2 : 1;
  const propertyTaxesInsuranceCam = Math.max(0, safeNumber(values.propertyTaxesInsuranceCam, 60000));
  const nonRecoverableExpenses = Math.max(0, safeNumber(values.nonRecoverableExpenses, 12000));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 5)));
  const annualDebtService = Math.max(0, safeNumber(values.annualDebtService, 130000));

  const occupied = 1 - vacancyPercent / 100;
  const reimbursements = leaseType === 1 ? propertyTaxesInsuranceCam * occupied : 0;
  const income = annualBaseRent * occupied + reimbursements;
  const noi = income - propertyTaxesInsuranceCam - nonRecoverableExpenses;
  const cf = noi - annualDebtService;

  return {
    annualCashFlow: round2(cf),
    monthlyCashFlow: round2(cf / 12),
    netOperatingIncome: round2(noi),
    tenantReimbursements: round2(reimbursements),
    dscr: annualDebtService > 0 ? round2(noi / annualDebtService) : 0,
  };
};

// --- 9. Commercial Loan DSCR (with stress tests) ---------------------------
export const commercialLoanDscrCalculator: CustomCalculator = (values) => {
  const netOperatingIncome = Math.max(0, safeNumber(values.netOperatingIncome, 175000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 1500000));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 7));
  const amortizationYears = Math.max(1, safeNumber(values.amortizationYears, 25));
  const lenderMinDscr = Math.max(0.01, safeNumber(values.lenderMinDscr, 1.25));
  const rateShockPercent = Math.max(0, safeNumber(values.rateShockPercent, 2));

  const debt = payment(loanAmount, interestRatePercent, amortizationYears) * 12;
  const dscr = debt > 0 ? netOperatingIncome / debt : 0;
  const shockedDebt = payment(loanAmount, interestRatePercent + rateShockPercent, amortizationYears) * 12;
  const minNoi = debt * lenderMinDscr;

  return {
    dscr: round2(dscr),
    annualDebtService: round2(debt),
    noiCanFallByPercent: netOperatingIncome > 0 ? round2(Math.max(0, (1 - minNoi / netOperatingIncome) * 100)) : 0,
    minimumNoiRequired: round2(minNoi),
    dscrAfterRateShock: shockedDebt > 0 ? round2(netOperatingIncome / shockedDebt) : 0,
  };
};

export const realestateMortgageCommercialCustomCalculators: Record<string, CustomCalculator> = {
  "real-estate-mortgage-calculator": realEstateMortgageCalculator,
  "investment-property-mortgage-calculator": investmentPropertyMortgageCalculator,
  "rental-property-mortgage-calculator": rentalPropertyMortgageCalculator,
  "commercial-property-loan-calculator": commercialPropertyLoanCalculator,
  "commercial-real-estate-calculator": commercialRealEstateCalculator,
  "commercial-cap-rate-calculator": commercialCapRateCalculator,
  "commercial-property-roi-calculator": commercialPropertyRoiCalculator,
  "commercial-property-cash-flow-calculator": commercialPropertyCashFlowCalculator,
  "commercial-loan-dscr-calculator": commercialLoanDscrCalculator,
};
