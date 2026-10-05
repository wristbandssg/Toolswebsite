/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 7 of 8 —
 * Bridge Loans (7 tools), filed under Finance Calculators > Mortgage
 * Calculators. See calc-engine-loan-life-events.ts for the full batch
 * context.
 *
 * A bridge loan borrows against the home you're selling so you can buy the
 * next one first. It's short (months), usually interest-only or with
 * interest deferred until the sale, and carries an origination fee. Each
 * tool models one part:
 *  - bridgeLoan: the most your current home's equity allows (CLTV limit),
 *    the fee, and whether it covers the new home's down payment.
 *  - payment: the bridge's interest-only payment on top of BOTH mortgage
 *    payments during the overlap.
 *  - payoff: repaying the bridge (and any deferred interest) from the sale —
 *    your net proceeds.
 *  - interest: cost for 3, 6 and 12 months including the fee, and the
 *    annualised cost of a 6-month bridge.
 *  - affordability: DTI while carrying both homes plus the bridge, and how
 *    long savings cover the extra costs.
 *  - comparison: bridge loan vs HELOC vs selling first and renting.
 *  - eligibility: CLTV, DTI and score.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-bridge-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Bridge Loan Calculator -----------------------------------------------
export const bridgeLoanCalculator: CustomCalculator = (values) => {
  const currentHomeValue = Math.max(0, safeNumber(values.currentHomeValue, 450000));
  const currentMortgage = Math.max(0, safeNumber(values.currentMortgage, 200000));
  const maxCltvPercent = Math.max(0, safeNumber(values.maxCltvPercent, 80));
  const feePercent = Math.min(50, Math.max(0, safeNumber(values.feePercent, 2)));
  const newHomePrice = Math.max(0, safeNumber(values.newHomePrice, 600000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 20)));

  const maxBridge = Math.max(0, (currentHomeValue * maxCltvPercent) / 100 - currentMortgage);
  const downNeeded = (newHomePrice * downPaymentPercent) / 100;
  // Borrow enough that, after the fee, the down payment is covered.
  const needed = downNeeded / (1 - feePercent / 100);
  const bridge = Math.min(maxBridge, needed);
  const fee = (bridge * feePercent) / 100;

  return {
    maxBridgeLoan: round2(maxBridge),
    downPaymentNeeded: round2(downNeeded),
    bridgeLoanAmount: round2(bridge),
    originationFee: round2(fee),
    shortfall: round2(Math.max(0, downNeeded - (bridge - fee))),
  };
};

// --- 2. Bridge Loan Payment Calculator (overlap months) ----------------------
export const bridgeLoanPaymentCalculator: CustomCalculator = (values) => {
  const bridgeAmount = Math.max(0, safeNumber(values.bridgeAmount, 120000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const months = Math.max(1, safeNumber(values.months, 6));
  const oldMortgagePayment = Math.max(0, safeNumber(values.oldMortgagePayment, 1500));
  const newMortgagePayment = Math.max(0, safeNumber(values.newMortgagePayment, 3200));

  const io = (bridgeAmount * annualRatePercent) / 100 / 12;
  const total = io + oldMortgagePayment + newMortgagePayment;

  return {
    bridgeInterestPayment: round2(io),
    totalMonthlyHousing: round2(total),
    extraOverNewPaymentAlone: round2(total - newMortgagePayment),
    totalBridgeInterest: round2(io * months),
    totalCostOfOverlap: round2((io + oldMortgagePayment) * months),
  };
};

// --- 3. Bridge Loan Payoff Calculator (net proceeds at sale) -----------------
export const bridgeLoanPayoffCalculator: CustomCalculator = (values) => {
  const salePrice = Math.max(0, safeNumber(values.salePrice, 450000));
  const commissionPercent = Math.max(0, safeNumber(values.commissionPercent, 5.5));
  const otherSellingCosts = Math.max(0, safeNumber(values.otherSellingCosts, 5000));
  const oldMortgageBalance = Math.max(0, safeNumber(values.oldMortgageBalance, 200000));
  const bridgeAmount = Math.max(0, safeNumber(values.bridgeAmount, 120000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const monthsUntilSale = Math.max(0, safeNumber(values.monthsUntilSale, 5));
  const interestDeferred = safeNumber(values.interestDeferred, 1) === 1;

  const accrued = interestDeferred ? (bridgeAmount * annualRatePercent * monthsUntilSale) / 1200 : 0;
  const bridgePayoff = bridgeAmount + accrued;
  const commission = (salePrice * commissionPercent) / 100;

  return {
    sellingCosts: round2(commission + otherSellingCosts),
    deferredInterestDue: round2(accrued),
    bridgePayoff: round2(bridgePayoff),
    netProceedsToYou: round2(salePrice - commission - otherSellingCosts - oldMortgageBalance - bridgePayoff),
  };
};

// --- 4. Bridge Loan Interest Calculator --------------------------------------
export const bridgeLoanInterestCalculator: CustomCalculator = (values) => {
  const bridgeAmount = Math.max(0, safeNumber(values.bridgeAmount, 120000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const feePercent = Math.max(0, safeNumber(values.feePercent, 2));

  const monthly = (bridgeAmount * annualRatePercent) / 1200;
  const fee = (bridgeAmount * feePercent) / 100;

  return {
    interestPerMonth: round2(monthly),
    originationFee: round2(fee),
    costFor3Months: round2(fee + monthly * 3),
    costFor6Months: round2(fee + monthly * 6),
    costFor12Months: round2(fee + monthly * 12),
    annualisedCostOf6MonthsPercent: bridgeAmount > 0 ? round2(((fee + monthly * 6) / bridgeAmount) * 2 * 100) : 0,
  };
};

// --- 5. Bridge Loan Affordability Calculator ---------------------------------
export const bridgeLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 14000));
  const otherDebts = Math.max(0, safeNumber(values.otherDebts, 600));
  const oldMortgagePayment = Math.max(0, safeNumber(values.oldMortgagePayment, 1800));
  const newMortgagePayment = Math.max(0, safeNumber(values.newMortgagePayment, 3200));
  const bridgeAmount = Math.max(0, safeNumber(values.bridgeAmount, 120000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 50));
  const savings = Math.max(0, safeNumber(values.savings, 40000));

  const io = (bridgeAmount * annualRatePercent) / 1200;
  const debts = otherDebts + oldMortgagePayment + newMortgagePayment + io;
  const dti = (debts / grossMonthlyIncome) * 100;
  const extra = oldMortgagePayment + io;

  return {
    bridgeInterestPayment: round2(io),
    totalMonthlyDebts: round2(debts),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    monthsSavingsCoverExtra: extra > 0 ? round2(savings / extra) : 0,
  };
};

// --- 6. Bridge Loan Comparison Calculator (bridge vs HELOC vs sell first) ----
export const bridgeLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 120000));
  const months = Math.max(0, safeNumber(values.months, 6));
  const bridgeRatePercent = Math.max(0, safeNumber(values.bridgeRatePercent, 9.5));
  const bridgeFeePercent = Math.max(0, safeNumber(values.bridgeFeePercent, 2));
  const helocRatePercent = Math.max(0, safeNumber(values.helocRatePercent, 8.5));
  const helocCosts = Math.max(0, safeNumber(values.helocCosts, 1000));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2800));
  const extraMovingCosts = Math.max(0, safeNumber(values.extraMovingCosts, 4000));

  const bridge = (amount * bridgeFeePercent) / 100 + (amount * bridgeRatePercent * months) / 1200;
  const heloc = helocCosts + (amount * helocRatePercent * months) / 1200;
  const sellFirst = monthlyRent * months + extraMovingCosts;

  return {
    bridgeLoanCost: round2(bridge),
    helocCost: round2(heloc),
    sellFirstAndRentCost: round2(sellFirst),
    bridgeVsHelocExtra: round2(bridge - heloc),
  };
};

// --- 7. Bridge Loan Eligibility Calculator -----------------------------------
export const bridgeLoanEligibilityCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(1, safeNumber(values.homeValue, 450000));
  const currentMortgage = Math.max(0, safeNumber(values.currentMortgage, 200000));
  const bridgeAmount = Math.max(0, safeNumber(values.bridgeAmount, 120000));
  const maxCltvPercent = Math.max(0, safeNumber(values.maxCltvPercent, 80));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 14000));
  const otherDebts = Math.max(0, safeNumber(values.otherDebts, 600));
  const oldMortgagePayment = Math.max(0, safeNumber(values.oldMortgagePayment, 1800));
  const newMortgagePayment = Math.max(0, safeNumber(values.newMortgagePayment, 3200));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 50));
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 720)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 700)));

  const cltv = ((currentMortgage + bridgeAmount) / homeValue) * 100;
  const io = (bridgeAmount * annualRatePercent) / 1200;
  const dti = ((otherDebts + oldMortgagePayment + newMortgagePayment + io) / grossMonthlyIncome) * 100;

  return {
    cltvPercent: round2(cltv),
    cltvHeadroomPercent: round2(maxCltvPercent - cltv),
    equityLeftPercent: round2(100 - cltv),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    scoreMargin: Math.round(creditScore - lenderMinScore),
  };
};

export const mortgageBridgeCustomCalculators: Record<string, CustomCalculator> = {
  "bridge-loan-calculator": bridgeLoanCalculator,
  "bridge-loan-payment-calculator": bridgeLoanPaymentCalculator,
  "bridge-loan-payoff-calculator": bridgeLoanPayoffCalculator,
  "bridge-loan-interest-calculator": bridgeLoanInterestCalculator,
  "bridge-loan-affordability-calculator": bridgeLoanAffordabilityCalculator,
  "bridge-loan-comparison-calculator": bridgeLoanComparisonCalculator,
  "bridge-loan-eligibility-calculator": bridgeLoanEligibilityCalculator,
};
