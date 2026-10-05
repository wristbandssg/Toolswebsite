/**
 * Batch: "Mortgage Calculators" expansion (5 Oct 2026), sub-batch 4 of 5 —
 * Property Type Mortgages (6 tools), filed under Mortgage Calculators >
 * Property & Construction Mortgage Calculators (with the construction and
 * commercial real estate loan tools). See calc-engine-mortgage-loan-types.ts
 * for the full batch context.
 *
 *  - manufacturedHomeLoan: chattel (home-only) loan vs a land-home
 *    mortgage — payment and total interest of each.
 *  - landLoan: larger down payment, shorter term, optional balloon.
 *  - condoMortgage: PITI + HOA dues + HO-6 insurance, HOA share.
 *  - coOpApartmentLoan: share loan + monthly maintenance, the board's
 *    post-closing liquidity and debt-to-income requirements.
 *  - multiFamilyMortgage: 2–4 unit owner-occupied; 75% of the other units'
 *    rent counts as income; net housing cost after rent.
 *  - secondHomeMortgage: 10% down, second home's PITI + HOA, total housing
 *    with your current home and the income needed at a DTI limit.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-property-types-calculators.ts for the copy.
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
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// --- 1. Manufactured Home Loan Calculator ---------------------------------------------
export const manufacturedHomeLoanCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 120000));
  const landPrice = Math.max(0, safeNumber(values.landPrice, 50000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 5)));
  const chattelRatePercent = Math.max(0, safeNumber(values.chattelRatePercent, 9.5));
  const chattelTermYears = Math.max(1, Math.round(safeNumber(values.chattelTermYears, 20)));
  const mortgageRatePercent = Math.max(0, safeNumber(values.mortgageRatePercent, 6.75));
  const mortgageTermYears = Math.max(1, Math.round(safeNumber(values.mortgageTermYears, 30)));

  const chattelLoan = homePrice * (1 - downPaymentPercent / 100);
  const nC = chattelTermYears * 12;
  const pC = payment(chattelLoan, chattelRatePercent / 100 / 12, nC);
  const mortgageLoan = (homePrice + landPrice) * (1 - downPaymentPercent / 100);
  const nM = mortgageTermYears * 12;
  const pM = payment(mortgageLoan, mortgageRatePercent / 100 / 12, nM);

  return {
    chattelLoanAmount: round2(chattelLoan),
    chattelPayment: round2(pC),
    chattelTotalInterest: round2(pC * nC - chattelLoan),
    landHomeLoanAmount: round2(mortgageLoan),
    landHomePayment: round2(pM),
    landHomeTotalInterest: round2(pM * nM - mortgageLoan),
  };
};

// --- 2. Land Loan Calculator ----------------------------------------------------------
export const landLoanCalculator: CustomCalculator = (values) => {
  const landPrice = Math.max(0, safeNumber(values.landPrice, 100000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 30)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const amortizationYears = Math.max(1, Math.round(safeNumber(values.amortizationYears, 20)));
  const balloonYears = Math.max(0, Math.round(safeNumber(values.balloonYears, 0)));

  const down = (landPrice * downPaymentPercent) / 100;
  const loan = landPrice - down;
  const i = annualRatePercent / 100 / 12;
  const n = amortizationYears * 12;
  const p = payment(loan, i, n);
  const k = balloonYears > 0 ? Math.min(n, balloonYears * 12) : n;
  const balloon = balloonYears > 0 ? balanceAfter(loan, i, p, k) : 0;

  return {
    downPayment: round2(down),
    loanAmount: round2(loan),
    monthlyPayment: round2(p),
    balloonPayment: round2(balloon),
    interestPaid: round2(p * k - (loan - balloon)),
  };
};

// --- 3. Condo Mortgage Calculator ----------------------------------------------------
export const condoMortgageCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 350000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.625));
  const monthlyHoa = Math.max(0, safeNumber(values.monthlyHoa, 400));
  const annualTaxes = Math.max(0, safeNumber(values.annualTaxes, 4200));
  const annualHo6 = Math.max(0, safeNumber(values.annualHo6, 600));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.5));

  const loan = price * (1 - downPaymentPercent / 100);
  const pi = payment(loan, annualRatePercent / 100 / 12, 360);
  const pmi = downPaymentPercent < 20 ? (loan * pmiRatePercent) / 100 / 12 : 0;
  const total = pi + pmi + monthlyHoa + annualTaxes / 12 + annualHo6 / 12;

  return {
    loanAmount: round2(loan),
    principalAndInterest: round2(pi),
    monthlyPmi: round2(pmi),
    monthlyTaxesAndInsurance: round2((annualTaxes + annualHo6) / 12),
    totalMonthlyCost: round2(total),
    hoaShareOfCostPercent: round2(total > 0 ? (monthlyHoa / total) * 100 : 0),
  };
};

// --- 4. Co-op Apartment Loan Calculator ------------------------------------------------
export const coOpApartmentLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 600000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const monthlyMaintenance = Math.max(0, safeNumber(values.monthlyMaintenance, 1400));
  const deductibleSharePercent = Math.min(100, Math.max(0, safeNumber(values.deductibleSharePercent, 40)));
  const liquidityMonths = Math.max(0, safeNumber(values.liquidityMonths, 24));
  const boardDtiPercent = Math.max(1, safeNumber(values.boardDtiPercent, 28));

  const down = (price * downPaymentPercent) / 100;
  const loan = price - down;
  const pi = payment(loan, annualRatePercent / 100 / 12, 360);
  const total = pi + monthlyMaintenance;

  return {
    downPayment: round2(down),
    loanAmount: round2(loan),
    loanPayment: round2(pi),
    totalMonthlyCost: round2(total),
    taxDeductibleMaintenance: round2((monthlyMaintenance * 12 * deductibleSharePercent) / 100),
    liquidityRequiredAfterClosing: round2(total * liquidityMonths),
    incomeNeededForBoard: round2(((total * 12) / boardDtiPercent) * 100),
  };
};

// --- 5. Multi-Family Mortgage Calculator ----------------------------------------------
export const multiFamilyMortgageCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 600000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 3.5)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const monthlyMiPercent = Math.max(0, safeNumber(values.mortgageInsurancePercent, 0.55));
  const annualTaxesInsurance = Math.max(0, safeNumber(values.annualTaxesInsurance, 9600));
  const rentFromOtherUnits = Math.max(0, safeNumber(values.rentFromOtherUnits, 3000));
  const rentCountedPercent = Math.min(100, Math.max(0, safeNumber(values.rentCountedPercent, 75)));

  const loan = price * (1 - downPaymentPercent / 100);
  const pi = payment(loan, annualRatePercent / 100 / 12, 360);
  const mi = downPaymentPercent < 20 ? (loan * monthlyMiPercent) / 100 / 12 : 0;
  const piti = pi + mi + annualTaxesInsurance / 12;

  return {
    loanAmount: round2(loan),
    monthlyPayment: round2(piti),
    rentalIncomeCounted: round2((rentFromOtherUnits * rentCountedPercent) / 100),
    netHousingCost: round2(piti - rentFromOtherUnits),
    netCostAfterVacancyAllowance: round2(piti - (rentFromOtherUnits * rentCountedPercent) / 100),
  };
};

// --- 6. Second Home Mortgage Calculator -----------------------------------------------
export const secondHomeMortgageCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 400000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.875));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.5));
  const annualTaxesInsurance = Math.max(0, safeNumber(values.annualTaxesInsurance, 7200));
  const monthlyHoa = Math.max(0, safeNumber(values.monthlyHoa, 0));
  const currentHousingPayment = Math.max(0, safeNumber(values.currentHousingPayment, 2200));
  const otherMonthlyDebts = Math.max(0, safeNumber(values.otherMonthlyDebts, 500));
  const maxDtiPercent = Math.max(1, safeNumber(values.maxDtiPercent, 43));

  const loan = price * (1 - downPaymentPercent / 100);
  const pi = payment(loan, annualRatePercent / 100 / 12, 360);
  const pmi = downPaymentPercent < 20 ? (loan * pmiRatePercent) / 100 / 12 : 0;
  const second = pi + pmi + annualTaxesInsurance / 12 + monthlyHoa;
  const totalDebts = second + currentHousingPayment + otherMonthlyDebts;

  return {
    loanAmount: round2(loan),
    secondHomePayment: round2(second),
    totalHousingPayments: round2(second + currentHousingPayment),
    totalMonthlyDebts: round2(totalDebts),
    incomeNeeded: round2(((totalDebts * 12) / maxDtiPercent) * 100),
  };
};

export const mortgagePropertyTypesCustomCalculators: Record<string, CustomCalculator> = {
  "manufactured-home-loan-calculator": manufacturedHomeLoanCalculator,
  "land-loan-calculator": landLoanCalculator,
  "condo-mortgage-calculator": condoMortgageCalculator,
  "co-op-apartment-loan-calculator": coOpApartmentLoanCalculator,
  "multi-family-mortgage-calculator": multiFamilyMortgageCalculator,
  "second-home-mortgage-calculator": secondHomeMortgageCalculator,
};
