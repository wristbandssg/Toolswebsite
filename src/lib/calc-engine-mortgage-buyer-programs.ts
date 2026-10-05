/**
 * Batch: "Mortgage Calculators" expansion (5 Oct 2026), sub-batch 3 of 5 —
 * Home Buyer Programs (7 tools), filed under Mortgage Calculators > Home
 * Buyer Program Calculators. See calc-engine-mortgage-loan-types.ts for the
 * full batch context.
 *
 *  - fha203kRenovationMortgage (incl. Fannie Mae HomeStyle): FHA base
 *    loan = 96.5% x min(price + rehab, 110% of after-improved value) plus
 *    1.75% UFMIP; Limited 203(k) caps repairs at $75,000; HomeStyle =
 *    LTV x min(price + renovation, as-completed value) with PMI.
 *  - homeReadyMortgage (incl. Freddie Mac Home Possible): income vs 80% of
 *    area median income, 3% down, reduced PMI coverage vs standard PMI.
 *  - goodNeighborNextDoorMortgage: HUD sells at 50% off list; the discount
 *    is a silent second forgiven after 36 months; FHA loan with $100 down.
 *  - teacherNextDoorMortgage: program grant + down payment assistance vs
 *    the cash needed without them.
 *  - energyEfficientMortgage (FHA EEM): improvements financed up to 5% of
 *    value; cost-effective if lifetime savings >= cost.
 *  - communityReinvestmentMortgage: CRA loan (no PMI, often lower rate)
 *    for LMI borrowers vs a conventional loan with PMI.
 *  - downPaymentGiftFundMortgage: gift vs cash needed, own funds still
 *    needed, and the 2026 $19,000 per-giver gift tax exclusion.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-buyer-programs-calculators.ts for the copy.
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

// --- 1. FHA 203k Renovation Mortgage Calculator (incl. HomeStyle) ---------------------
export const fha203kRenovationMortgageCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 250000));
  const repairCost = Math.max(0, safeNumber(values.repairCost, 60000));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 10));
  const afterRepairValue = Math.max(0, safeNumber(values.afterRepairValue, 350000));
  const raw = Math.round(safeNumber(values.program, 1));
  const program = [1, 2, 3].includes(raw) ? raw : 1;
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const fhaMipPercent = Math.max(0, safeNumber(values.fhaMipPercent, 0.55));
  const homeStyleLtvPercent = Math.min(97, Math.max(0, safeNumber(values.homeStyleLtvPercent, 97)));
  const homeStylePmiPercent = Math.max(0, safeNumber(values.homeStylePmiPercent, 0.5));

  const rehab = repairCost * (1 + contingencyPercent / 100);
  const eligibleRehab = program === 2 ? Math.min(rehab, 75000) : rehab;
  const project = purchasePrice + rehab;
  let base: number;
  let ufmip = 0;
  let mi: number;
  if (program === 3) {
    base = (homeStyleLtvPercent / 100) * Math.min(purchasePrice + eligibleRehab, afterRepairValue);
    mi = homeStyleLtvPercent > 80 ? (base * homeStylePmiPercent) / 100 / 12 : 0;
  } else {
    base = 0.965 * Math.min(purchasePrice + eligibleRehab, 1.1 * afterRepairValue);
    ufmip = base * 0.0175;
    mi = (base * fhaMipPercent) / 100 / 12;
  }
  const loan = base + ufmip;
  const pi = payment(loan, annualRatePercent / 100 / 12, 360);

  return {
    totalProjectCost: round2(project),
    baseLoanAmount: round2(base),
    upfrontMip: round2(ufmip),
    totalLoanAmount: round2(loan),
    cashNeeded: round2(Math.max(0, project - base)),
    principalAndInterest: round2(pi),
    monthlyMortgageInsurance: round2(mi),
    totalMonthlyPayment: round2(pi + mi),
  };
};

// --- 2. HomeReady Mortgage Calculator (incl. Home Possible) ---------------------------
export const homeReadyMortgageCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 70000));
  const areaMedianIncome = Math.max(1, safeNumber(values.areaMedianIncome, 95000));
  const homePrice = Math.max(0, safeNumber(values.homePrice, 320000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 3)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const programPmiPercent = Math.max(0, safeNumber(values.programPmiPercent, 0.45));
  const standardPmiPercent = Math.max(0, safeNumber(values.standardPmiPercent, 0.7));

  const limit = areaMedianIncome * 0.8;
  const loan = homePrice * (1 - downPaymentPercent / 100);
  const pi = payment(loan, annualRatePercent / 100 / 12, 360);
  const needsPmi = downPaymentPercent < 20;
  const pmi = needsPmi ? (loan * programPmiPercent) / 100 / 12 : 0;
  const standard = needsPmi ? (loan * standardPmiPercent) / 100 / 12 : 0;

  return {
    incomeLimit: round2(limit),
    eligible: annualIncome <= limit ? 1 : 0,
    loanAmount: round2(loan),
    principalAndInterest: round2(pi),
    monthlyPmi: round2(pmi),
    monthlyPayment: round2(pi + pmi),
    pmiSavingsPerMonth: round2(standard - pmi),
  };
};

// --- 3. Good Neighbor Next Door Mortgage Calculator ----------------------------------
export const goodNeighborNextDoorMortgageCalculator: CustomCalculator = (values) => {
  const listPrice = Math.max(0, safeNumber(values.listPrice, 220000));
  const discountPercent = Math.min(100, Math.max(0, safeNumber(values.discountPercent, 50)));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 100));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const annualMipPercent = Math.max(0, safeNumber(values.annualMipPercent, 0.55));
  const annualTaxesInsurance = Math.max(0, safeNumber(values.annualTaxesInsurance, 3600));

  const discount = (listPrice * discountPercent) / 100;
  const price = listPrice - discount;
  const base = Math.max(0, price - downPayment);
  const loan = base * 1.0175;
  const pi = payment(loan, annualRatePercent / 100 / 12, 360);
  const mip = (base * annualMipPercent) / 100 / 12;
  const fullPricePi = payment((listPrice - downPayment) * 1.0175, annualRatePercent / 100 / 12, 360);

  return {
    discount: round2(discount),
    purchasePrice: round2(price),
    firstMortgage: round2(loan),
    monthlyPayment: round2(pi + mip + annualTaxesInsurance / 12),
    monthlySavingsVsListPrice: round2(fullPricePi - pi + ((listPrice - price) * annualMipPercent) / 100 / 12),
    silentSecondForgiven: round2(discount),
  };
};

// --- 4. Teacher Next Door Mortgage Calculator -----------------------------------------
export const teacherNextDoorMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 300000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 3.5)));
  const closingCostsPercent = Math.max(0, safeNumber(values.closingCostsPercent, 3));
  const grant = Math.max(0, safeNumber(values.grant, 6000));
  const assistance = Math.max(0, safeNumber(values.assistance, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));

  const down = (homePrice * downPaymentPercent) / 100;
  const closing = (homePrice * closingCostsPercent) / 100;
  const need = down + closing;
  const help = Math.min(need, grant + assistance);
  const loan = homePrice - down;

  return {
    downPayment: round2(down),
    closingCosts: round2(closing),
    cashNeededWithout: round2(need),
    programHelp: round2(help),
    cashNeededWith: round2(need - help),
    firstMortgagePayment: round2(payment(loan, annualRatePercent / 100 / 12, 360)),
  };
};

// --- 5. Energy Efficient Mortgage Calculator ------------------------------------------
export const energyEfficientMortgageCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 300000));
  const baseLoan = Math.max(0, safeNumber(values.baseLoan, 289500));
  const improvementCost = Math.max(0, safeNumber(values.improvementCost, 12000));
  const annualSavings = Math.max(0, safeNumber(values.annualSavings, 1200));
  const usefulLifeYears = Math.max(1, safeNumber(values.usefulLifeYears, 15));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));

  const cap = homeValue * 0.05;
  const financed = Math.min(improvementCost, cap);
  const added = payment(financed, annualRatePercent / 100 / 12, 360);
  const monthlySavings = annualSavings / 12;

  return {
    maxEemAmount: round2(cap),
    amountFinanced: round2(financed),
    newLoanAmount: round2(baseLoan + financed),
    addedMonthlyPayment: round2(added),
    monthlyEnergySavings: round2(monthlySavings),
    netMonthlyBenefit: round2(monthlySavings - added),
    costEffective: annualSavings * usefulLifeYears >= improvementCost ? 1 : 0,
  };
};

// --- 6. Community Reinvestment Mortgage Calculator ------------------------------------
export const communityReinvestmentMortgageCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 60000));
  const areaMedianIncome = Math.max(1, safeNumber(values.areaMedianIncome, 90000));
  const homePrice = Math.max(0, safeNumber(values.homePrice, 300000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 3)));
  const craRatePercent = Math.max(0, safeNumber(values.craRatePercent, 6.25));
  const conventionalRatePercent = Math.max(0, safeNumber(values.conventionalRatePercent, 6.5));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.6));

  const loan = homePrice * (1 - downPaymentPercent / 100);
  const cra = payment(loan, craRatePercent / 100 / 12, 360);
  const pmi = downPaymentPercent < 20 ? (loan * pmiRatePercent) / 100 / 12 : 0;
  const conv = payment(loan, conventionalRatePercent / 100 / 12, 360) + pmi;

  return {
    incomeAsShareOfMedian: round2((annualIncome / areaMedianIncome) * 100),
    eligibleByIncome: annualIncome <= areaMedianIncome * 0.8 ? 1 : 0,
    loanAmount: round2(loan),
    craPayment: round2(cra),
    conventionalPayment: round2(conv),
    monthlySavings: round2(conv - cra),
    yearlySavings: round2((conv - cra) * 12),
  };
};

// --- 7. Down Payment Gift Fund Mortgage Calculator ------------------------------------
export const downPaymentGiftFundMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 400000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 10)));
  const closingCostsPercent = Math.max(0, safeNumber(values.closingCostsPercent, 3));
  const ownFunds = Math.max(0, safeNumber(values.ownFunds, 15000));
  const giftAmount = Math.max(0, safeNumber(values.giftAmount, 30000));
  const givers = Math.max(1, Math.round(safeNumber(values.givers, 2)));
  const recipients = Math.max(1, Math.round(safeNumber(values.recipients, 1)));
  const annualExclusion = Math.max(0, safeNumber(values.annualExclusion, 19000));

  const down = (homePrice * downPaymentPercent) / 100;
  const need = down + (homePrice * closingCostsPercent) / 100;
  const giftUsed = Math.min(giftAmount, need);
  const exclusion = annualExclusion * givers * recipients;

  return {
    downPayment: round2(down),
    totalCashNeeded: round2(need),
    giftUsed: round2(giftUsed),
    ownFundsNeeded: round2(need - giftUsed),
    shortfall: round2(Math.max(0, need - giftUsed - ownFunds)),
    giftTaxExclusion: round2(exclusion),
    giftAboveExclusion: round2(Math.max(0, giftAmount - exclusion)),
  };
};

export const mortgageBuyerProgramsCustomCalculators: Record<string, CustomCalculator> = {
  "fha-203k-renovation-mortgage-calculator": fha203kRenovationMortgageCalculator,
  "homeready-mortgage-calculator": homeReadyMortgageCalculator,
  "good-neighbor-next-door-mortgage-calculator": goodNeighborNextDoorMortgageCalculator,
  "teacher-next-door-mortgage-calculator": teacherNextDoorMortgageCalculator,
  "energy-efficient-mortgage-calculator": energyEfficientMortgageCalculator,
  "community-reinvestment-mortgage-calculator": communityReinvestmentMortgageCalculator,
  "down-payment-gift-fund-mortgage-calculator": downPaymentGiftFundMortgageCalculator,
};
