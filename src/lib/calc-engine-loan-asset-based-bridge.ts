/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 3 of 10 —
 * Asset-Based Loans (7) and Bridge Business Loans (7), filed under Loan
 * Calculators > General Loan Calculators. See
 * calc-engine-loan-startup-business.ts for the full batch context.
 *
 * Asset-based lending (ABL) is a revolving line sized by a borrowing base
 * across receivables, inventory and equipment (unlike invoice-financing-*
 * and inventory-financing-*, which each cover one asset):
 *  - assetBasedLoan: the combined borrowing base.
 *  - assetBasedLoanPayment: monthly cost of the revolver — interest on the
 *    drawn balance, unused-line fee and collateral monitoring fee.
 *  - assetBasedLoanPayoff: collections paying the line down while new
 *    draws continue — months to zero.
 *  - assetBasedLoanInterest: SOFR + spread on the drawn balance and the
 *    cost of a 1-point SOFR rise.
 *  - assetBasedLoanAffordability: availability left after a minimum
 *    excess-availability covenant.
 *  - assetBasedLoanComparison: ABL vs factoring the same receivables.
 *  - assetBasedLoanEligibility: aged receivables, inventory turnover, and
 *    whether the base covers the line you want.
 * Bridge business loans cover a short gap until longer-term money arrives
 * (an SBA or bank loan closing, an equity round, a property sale) — kept
 * distinct from mortgage bridge-loan-* (buying a home before selling one):
 *  - bridgeBusinessLoan: interest-only months + fees -> total cost.
 *  - bridgeBusinessLoanPayment: interest-only payment and balloon vs
 *    amortizing over the same months.
 *  - bridgeBusinessLoanPayoff: what a delayed takeout costs (more interest
 *    plus extension fees).
 *  - bridgeBusinessLoanInterest: per-diem interest, 360- vs 365-day basis.
 *  - bridgeBusinessLoanAffordability: limited by the expected takeout and
 *    by a monthly interest budget.
 *  - bridgeBusinessLoanComparison: bridge loan vs a merchant cash advance.
 *  - bridgeBusinessLoanEligibility: collateral LTV, takeout commitment,
 *    credit score.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-asset-based-bridge-calculators.ts for the copy.
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

function pct(v: number, fallback: number): number {
  return Math.min(100, Math.max(0, safeNumber(v, fallback)));
}

// --- 1. Asset-Based Loan Calculator (borrowing base) ------------------------------------
export const assetBasedLoanCalculator: CustomCalculator = (values) => {
  const receivables = Math.max(0, safeNumber(values.receivables, 500000));
  const arAdvance = pct(values.arAdvancePercent, 85);
  const inventory = Math.max(0, safeNumber(values.inventory, 400000));
  const invAdvance = pct(values.inventoryAdvancePercent, 50);
  const equipment = Math.max(0, safeNumber(values.equipment, 300000));
  const eqAdvance = pct(values.equipmentAdvancePercent, 70);

  const ar = (receivables * arAdvance) / 100;
  const inv = (inventory * invAdvance) / 100;
  const eq = (equipment * eqAdvance) / 100;

  return {
    receivablesAvailability: round2(ar),
    inventoryAvailability: round2(inv),
    equipmentAvailability: round2(eq),
    borrowingBase: round2(ar + inv + eq),
  };
};

// --- 2. Asset-Based Loan Payment Calculator (monthly revolver cost) ---------------------
export const assetBasedLoanPaymentCalculator: CustomCalculator = (values) => {
  const commitment = Math.max(0, safeNumber(values.commitment, 1000000));
  const averageDrawn = Math.min(commitment, Math.max(0, safeNumber(values.averageDrawn, 600000)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const unusedFeePercent = Math.max(0, safeNumber(values.unusedFeePercent, 0.375));
  const monitoringFee = Math.max(0, safeNumber(values.monitoringFee, 1500));

  const interest = (averageDrawn * annualRatePercent) / 100 / 12;
  const unused = ((commitment - averageDrawn) * unusedFeePercent) / 100 / 12;
  const total = interest + unused + monitoringFee;

  return {
    monthlyInterest: round2(interest),
    unusedLineFee: round2(unused),
    monitoringFee: round2(monitoringFee),
    totalMonthlyCost: round2(total),
    effectiveRateOnDrawn: round2(averageDrawn > 0 ? ((total * 12) / averageDrawn) * 100 : 0),
  };
};

// --- 3. Asset-Based Loan Payoff Calculator (collections vs new draws) -------------------
export const assetBasedLoanPayoffCalculator: CustomCalculator = (values) => {
  const drawn = Math.max(0, safeNumber(values.drawn, 600000));
  const monthlyCollections = Math.max(0, safeNumber(values.monthlyCollections, 150000));
  const monthlyNewDraws = Math.max(0, safeNumber(values.monthlyNewDraws, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));

  const r = annualRatePercent / 100 / 12;
  const net = monthlyCollections - monthlyNewDraws;
  let b = drawn;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 600) {
    const int = b * r;
    if (net <= int) {
      months = 600;
      break;
    }
    interest += int;
    b = Math.max(0, b + int - net);
    months++;
  }

  return {
    netPaydownPerMonth: round2(net),
    monthsToPayOff: months,
    interestUntilPaidOff: round2(months >= 600 ? 0 : interest),
  };
};

// --- 4. Asset-Based Loan Interest Calculator (SOFR + spread) ----------------------------
export const assetBasedLoanInterestCalculator: CustomCalculator = (values) => {
  const averageDrawn = Math.max(0, safeNumber(values.averageDrawn, 600000));
  const sofrPercent = Math.max(0, safeNumber(values.sofrPercent, 4.25));
  const spreadPercent = Math.max(0, safeNumber(values.spreadPercent, 3));

  const rate = sofrPercent + spreadPercent;
  const annual = (averageDrawn * rate) / 100;

  return {
    allInRate: round2(rate),
    monthlyInterest: round2(annual / 12),
    annualInterest: round2(annual),
    extraIfSofrRises1Point: round2(averageDrawn / 100),
  };
};

// --- 5. Asset-Based Loan Affordability Calculator (availability) ------------------------
export const assetBasedLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const borrowingBase = Math.max(0, safeNumber(values.borrowingBase, 700000));
  const lineLimit = Math.max(0, safeNumber(values.lineLimit, 1000000));
  const currentlyDrawn = Math.max(0, safeNumber(values.currentlyDrawn, 450000));
  const minExcessPercent = pct(values.minExcessPercent, 10);

  const availability = Math.min(borrowingBase, lineLimit);
  const usable = availability * (1 - minExcessPercent / 100);

  return {
    availability: round2(availability),
    excessAvailability: round2(availability - currentlyDrawn),
    maxAdditionalDraw: round2(Math.max(0, usable - currentlyDrawn)),
    utilizationPercent: round2(availability > 0 ? (currentlyDrawn / availability) * 100 : 0),
  };
};

// --- 6. Asset-Based Loan Comparison Calculator (ABL vs factoring) -----------------------
export const assetBasedLoanComparisonCalculator: CustomCalculator = (values) => {
  const averageFinanced = Math.max(0, safeNumber(values.averageFinanced, 400000));
  const ablRatePercent = Math.max(0, safeNumber(values.ablRatePercent, 9));
  const ablAnnualFees = Math.max(0, safeNumber(values.ablAnnualFees, 18000));
  const factoringFeePercent = Math.max(0, safeNumber(values.factoringFeePercent, 2));

  const abl = (averageFinanced * ablRatePercent) / 100 + ablAnnualFees;
  const factoring = (averageFinanced * factoringFeePercent * 12) / 100;

  return {
    ablAnnualCost: round2(abl),
    factoringAnnualCost: round2(factoring),
    ablEffectiveRate: round2(averageFinanced > 0 ? (abl / averageFinanced) * 100 : 0),
    factoringEffectiveRate: round2(factoringFeePercent * 12),
    savingsWithAbl: round2(factoring - abl),
  };
};

// --- 7. Asset-Based Loan Eligibility Calculator ------------------------------------------
export const assetBasedLoanEligibilityCalculator: CustomCalculator = (values) => {
  const receivables = Math.max(0, safeNumber(values.receivables, 500000));
  const over90Percent = pct(values.over90Percent, 8);
  const inventory = Math.max(0, safeNumber(values.inventory, 400000));
  const annualCogs = Math.max(0, safeNumber(values.annualCogs, 2400000));
  const requestedLine = Math.max(0, safeNumber(values.requestedLine, 600000));

  const base = receivables * (1 - over90Percent / 100) * 0.85 + inventory * 0.5;
  const turnover = inventory > 0 ? annualCogs / inventory : 0;
  let passed = 0;
  if (over90Percent <= 15) passed++;
  if (inventory === 0 || turnover >= 4) passed++;
  if (base >= requestedLine) passed++;

  return {
    estimatedBorrowingBase: round2(base),
    inventoryTurnover: round2(turnover),
    shortfall: round2(Math.max(0, requestedLine - base)),
    checksPassed: passed,
  };
};

// --- 8. Bridge Business Loan Calculator --------------------------------------------------
export const bridgeBusinessLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 250000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const months = Math.max(1, Math.round(safeNumber(values.months, 6)));
  const originationPercent = Math.max(0, safeNumber(values.originationPercent, 2));
  const exitFeePercent = Math.max(0, safeNumber(values.exitFeePercent, 1));

  const monthly = (loanAmount * annualRatePercent) / 100 / 12;
  const fees = (loanAmount * (originationPercent + exitFeePercent)) / 100;
  const total = monthly * months + fees;

  return {
    monthlyInterest: round2(monthly),
    totalInterest: round2(monthly * months),
    fees: round2(fees),
    totalCost: round2(total),
    payoffAtEnd: round2(loanAmount + (loanAmount * exitFeePercent) / 100),
  };
};

// --- 9. Bridge Business Loan Payment Calculator (interest-only vs amortizing) ----------
export const bridgeBusinessLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 200000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const months = Math.max(1, Math.round(safeNumber(values.months, 9)));

  const i = annualRatePercent / 100 / 12;
  const io = loanAmount * i;
  const amort = payment(loanAmount, i, months);

  return {
    interestOnlyPayment: round2(io),
    balloonAtEnd: round2(loanAmount),
    amortizingPayment: round2(amort),
    interestOnlyTotalInterest: round2(io * months),
    amortizingTotalInterest: round2(amort * months - loanAmount),
  };
};

// --- 10. Bridge Business Loan Payoff Calculator (delayed takeout) ----------------------
export const bridgeBusinessLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 250000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const plannedMonths = Math.max(1, Math.round(safeNumber(values.plannedMonths, 6)));
  const actualMonths = Math.max(1, Math.round(safeNumber(values.actualMonths, 9)));
  const extensionFeePercent = Math.max(0, safeNumber(values.extensionFeePercent, 1));
  const extensionMonths = Math.max(1, Math.round(safeNumber(values.extensionMonths, 3)));

  const monthly = (loanAmount * annualRatePercent) / 100 / 12;
  const extraMonths = Math.max(0, actualMonths - plannedMonths);
  const extensions = Math.ceil(extraMonths / extensionMonths);
  const extFees = (loanAmount * extensionFeePercent * extensions) / 100;

  return {
    interestIfOnTime: round2(monthly * plannedMonths),
    interestAtActualPayoff: round2(monthly * actualMonths),
    extensionFees: round2(extFees),
    extraCostOfDelay: round2(monthly * extraMonths + extFees),
    payoffAmount: round2(loanAmount + monthly + extFees),
  };
};

// --- 11. Bridge Business Loan Interest Calculator (per diem, 360 vs 365) ---------------
export const bridgeBusinessLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11.5));
  const days = Math.max(0, safeNumber(values.days, 150));

  const per360 = (loanAmount * annualRatePercent) / 100 / 360;
  const per365 = (loanAmount * annualRatePercent) / 100 / 365;

  return {
    perDiem360: round2(per360),
    interest360: round2(per360 * days),
    interest365: round2(per365 * days),
    extraFrom360Basis: round2((per360 - per365) * days),
  };
};

// --- 12. Bridge Business Loan Affordability Calculator ---------------------------------
export const bridgeBusinessLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const expectedTakeout = Math.max(0, safeNumber(values.expectedTakeout, 500000));
  const maxPercentOfTakeout = pct(values.maxPercentOfTakeout, 80);
  const monthlyInterestBudget = Math.max(0, safeNumber(values.monthlyInterestBudget, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));

  const byTakeout = (expectedTakeout * maxPercentOfTakeout) / 100;
  const byBudget = annualRatePercent > 0 ? monthlyInterestBudget / (annualRatePercent / 100 / 12) : byTakeout;

  return {
    maxByTakeout: round2(byTakeout),
    maxByInterestBudget: round2(byBudget),
    maxBridgeLoan: round2(Math.min(byTakeout, byBudget)),
  };
};

// --- 13. Bridge Business Loan Comparison Calculator (vs merchant cash advance) ----------
export const bridgeBusinessLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 100000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 6)));
  const bridgeRatePercent = Math.max(0, safeNumber(values.bridgeRatePercent, 12));
  const bridgeFeesPercent = Math.max(0, safeNumber(values.bridgeFeesPercent, 3));
  const factorRate = Math.min(3, Math.max(1, safeNumber(values.factorRate, 1.25)));

  const bridge = (amount * bridgeRatePercent * months) / 1200 + (amount * bridgeFeesPercent) / 100;
  const mca = amount * (factorRate - 1);

  return {
    bridgeLoanCost: round2(bridge),
    cashAdvanceCost: round2(mca),
    savingsWithBridgeLoan: round2(mca - bridge),
  };
};

// --- 14. Bridge Business Loan Eligibility Calculator -----------------------------------
export const bridgeBusinessLoanEligibilityCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 250000));
  const collateralValue = Math.max(0, safeNumber(values.collateralValue, 400000));
  const maxLtvPercent = pct(values.maxLtvPercent, 70);
  const hasTakeout = Math.round(safeNumber(values.hasTakeout, 1)) === 1;
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 670)));

  const ltv = collateralValue > 0 ? (loanAmount / collateralValue) * 100 : 0;
  let passed = 0;
  if (collateralValue > 0 && ltv <= maxLtvPercent) passed++;
  if (hasTakeout) passed++;
  if (creditScore >= 650) passed++;

  return {
    loanToValue: round2(ltv),
    maxLoanByCollateral: round2((collateralValue * maxLtvPercent) / 100),
    checksPassed: passed,
  };
};

export const loanAssetBasedBridgeCustomCalculators: Record<string, CustomCalculator> = {
  "asset-based-loan-calculator": assetBasedLoanCalculator,
  "asset-based-loan-payment-calculator": assetBasedLoanPaymentCalculator,
  "asset-based-loan-payoff-calculator": assetBasedLoanPayoffCalculator,
  "asset-based-loan-interest-calculator": assetBasedLoanInterestCalculator,
  "asset-based-loan-affordability-calculator": assetBasedLoanAffordabilityCalculator,
  "asset-based-loan-comparison-calculator": assetBasedLoanComparisonCalculator,
  "asset-based-loan-eligibility-calculator": assetBasedLoanEligibilityCalculator,
  "bridge-business-loan-calculator": bridgeBusinessLoanCalculator,
  "bridge-business-loan-payment-calculator": bridgeBusinessLoanPaymentCalculator,
  "bridge-business-loan-payoff-calculator": bridgeBusinessLoanPayoffCalculator,
  "bridge-business-loan-interest-calculator": bridgeBusinessLoanInterestCalculator,
  "bridge-business-loan-affordability-calculator": bridgeBusinessLoanAffordabilityCalculator,
  "bridge-business-loan-comparison-calculator": bridgeBusinessLoanComparisonCalculator,
  "bridge-business-loan-eligibility-calculator": bridgeBusinessLoanEligibilityCalculator,
};
