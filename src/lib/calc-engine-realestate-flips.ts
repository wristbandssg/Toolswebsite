/**
 * Batch: "Real Estate Calculators" sub-batch F (House Flipping & Rehab, 13
 * tools). Part of the Real Estate build-out — see calc-engine-realestate-
 * rental-income.ts for the full list of 11 sub-batches. Filed under Finance
 * Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different (house-flipping-
 * calculator already gives profit and ROI from purchase, renovation, a lump
 * of holding costs, sale price and a selling %):
 *  - houseFlipProfitCalculator: an ALL-CASH flip with every cost line —
 *    buying costs, monthly holding over the project, selling costs — and the
 *    profit margin on the sale.
 *  - houseFlipRoiCalculator: ROI on your own cash vs on total cost, and
 *    ANNUALIZED for how long the flip takes.
 *  - houseFlipCostCalculator: the total project cost with a contingency on
 *    the rehab, and the cost per square foot.
 *  - houseFlipBudgetCalculator: a rehab budget by room/trade.
 *  - houseFlipBreakEvenCalculator: the lowest sale price that covers
 *    everything, and the most you could pay for a target profit.
 *  - houseFlipArvCalculator: ARV from comps AND the maximum offer at the 70%
 *    rule and at your target profit.
 *  - afterRepairValueCalculator: ARV from three comparable sales ($/sq ft),
 *    with a range.
 *  - seventyPercentRuleCalculator: the 70% rule's maximum allowable offer,
 *    with an adjustable percentage.
 *  - fixAndFlipCalculator: a FINANCED flip — loan on purchase and rehab,
 *    interest, points — and return on the cash you actually put in.
 *  - fixAndFlipLoanCalculator: hard-money loan sizing by loan-to-cost and
 *    ARV limits — loan amount, monthly interest and cash to close.
 *  - fixAndFlipFinancingCalculator: hard money vs paying cash — cost of the
 *    loan and the ROI each way.
 *  - renovationCostCalculator: a HOMEOWNER renovation by square footage and
 *    finish level, with permits and contingency.
 *  - rehabCostCalculator: an INVESTOR rehab by scope (light/medium/heavy)
 *    plus big-ticket items like a roof or HVAC.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-flips-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// --- 1. House Flip Profit (all-cash, itemized) -----------------------------
export const houseFlipProfitCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 200000));
  const buyingCostPercent = Math.max(0, safeNumber(values.buyingCostPercent, 2));
  const rehabCost = Math.max(0, safeNumber(values.rehabCost, 55000));
  const monthlyHoldingCosts = Math.max(0, safeNumber(values.monthlyHoldingCosts, 1200));
  const projectMonths = Math.max(0, safeNumber(values.projectMonths, 6));
  const salePrice = Math.max(0, safeNumber(values.salePrice, 330000));
  const sellingCostPercent = Math.max(0, safeNumber(values.sellingCostPercent, 8));

  const buying = (purchasePrice * buyingCostPercent) / 100;
  const holding = monthlyHoldingCosts * projectMonths;
  const selling = (salePrice * sellingCostPercent) / 100;
  const total = purchasePrice + buying + rehabCost + holding + selling;
  const profit = salePrice - total;

  return {
    netProfit: round2(profit),
    totalCosts: round2(total),
    profitMarginOnSalePercent: pct(profit, salePrice),
    holdingCosts: round2(holding),
    sellingCosts: round2(selling),
  };
};

// --- 2. House Flip ROI (cash vs total, annualized) ------------------------
export const houseFlipRoiCalculator: CustomCalculator = (values) => {
  const netProfit = safeNumber(values.netProfit, 42000);
  const totalProjectCost = Math.max(0.01, safeNumber(values.totalProjectCost, 290000));
  const cashInvested = Math.max(0.01, safeNumber(values.cashInvested, 90000));
  const projectMonths = Math.max(0.5, safeNumber(values.projectMonths, 6));

  const roiCash = netProfit / cashInvested;

  return {
    roiOnCashPercent: round2(roiCash * 100),
    roiOnTotalCostPercent: round2((netProfit / totalProjectCost) * 100),
    annualizedRoiOnCashPercent: round2((Math.pow(1 + roiCash, 12 / projectMonths) - 1) * 100),
    profitPerMonth: round2(netProfit / projectMonths),
  };
};

// --- 3. House Flip Cost (total project cost) -----------------------------
export const houseFlipCostCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 180000));
  const closingCostsBuy = Math.max(0, safeNumber(values.closingCostsBuy, 4500));
  const rehabBudget = Math.max(0, safeNumber(values.rehabBudget, 60000));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 10));
  const holdingAndFinancing = Math.max(0, safeNumber(values.holdingAndFinancing, 12000));
  const sellingCosts = Math.max(0, safeNumber(values.sellingCosts, 24000));
  const squareFeet = Math.max(1, safeNumber(values.squareFeet, 1600));

  const contingency = (rehabBudget * contingencyPercent) / 100;
  const total = purchasePrice + closingCostsBuy + rehabBudget + contingency + holdingAndFinancing + sellingCosts;

  return {
    totalProjectCost: round2(total),
    rehabWithContingency: round2(rehabBudget + contingency),
    costPerSquareFoot: round2(total / squareFeet),
    costsBeyondPurchasePrice: round2(total - purchasePrice),
  };
};

// --- 4. House Flip Budget (rehab by trade) ---------------------------------
export const houseFlipBudgetCalculator: CustomCalculator = (values) => {
  const kitchen = Math.max(0, safeNumber(values.kitchen, 18000));
  const bathrooms = Math.max(0, safeNumber(values.bathrooms, 12000));
  const flooring = Math.max(0, safeNumber(values.flooring, 8000));
  const paintAndDrywall = Math.max(0, safeNumber(values.paintAndDrywall, 6000));
  const roofAndExterior = Math.max(0, safeNumber(values.roofAndExterior, 9000));
  const systemsHvacPlumbingElectric = Math.max(0, safeNumber(values.systemsHvacPlumbingElectric, 7000));
  const otherAndPermits = Math.max(0, safeNumber(values.otherAndPermits, 4000));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 12));
  const squareFeet = Math.max(1, safeNumber(values.squareFeet, 1500));

  const base = kitchen + bathrooms + flooring + paintAndDrywall + roofAndExterior + systemsHvacPlumbingElectric + otherAndPermits;
  const total = base * (1 + contingencyPercent / 100);

  return {
    totalRehabBudget: round2(total),
    budgetBeforeContingency: round2(base),
    contingency: round2(total - base),
    rehabPerSquareFoot: round2(total / squareFeet),
    kitchenAndBathSharePercent: pct(kitchen + bathrooms, base),
  };
};

// --- 5. House Flip Break-Even (min sale, max purchase) --------------------
export const houseFlipBreakEvenCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 200000));
  const otherCosts = Math.max(0, safeNumber(values.otherCosts, 75000));
  const sellingCostPercent = Math.min(90, Math.max(0, safeNumber(values.sellingCostPercent, 8)));
  const expectedSalePrice = Math.max(0, safeNumber(values.expectedSalePrice, 330000));
  const targetProfit = Math.max(0, safeNumber(values.targetProfit, 30000));

  const s = 1 - sellingCostPercent / 100;
  const breakEven = (purchasePrice + otherCosts) / s;

  return {
    breakEvenSalePrice: round2(breakEven),
    cushionBelowExpectedPrice: round2(expectedSalePrice - breakEven),
    maxPurchasePriceForTargetProfit: round2(expectedSalePrice * s - otherCosts - targetProfit),
  };
};

// --- 6. House Flip ARV (comps + max offers) ------------------------------
export const houseFlipArvCalculator: CustomCalculator = (values) => {
  const subjectSquareFeet = Math.max(0, safeNumber(values.subjectSquareFeet, 1600));
  const compAveragePricePerSqft = Math.max(0, safeNumber(values.compAveragePricePerSqft, 210));
  const repairCosts = Math.max(0, safeNumber(values.repairCosts, 60000));
  const otherCostsPercentOfArv = Math.max(0, safeNumber(values.otherCostsPercentOfArv, 12));
  const targetProfit = Math.max(0, safeNumber(values.targetProfit, 35000));

  const arv = subjectSquareFeet * compAveragePricePerSqft;

  return {
    afterRepairValue: round2(arv),
    maxOfferAt70PercentRule: round2(arv * 0.7 - repairCosts),
    maxOfferForTargetProfit: round2(arv * (1 - otherCostsPercentOfArv / 100) - repairCosts - targetProfit),
  };
};

// --- 7. After Repair Value (ARV) — three comps --------------------------
export const afterRepairValueCalculator: CustomCalculator = (values) => {
  const subjectSquareFeet = Math.max(0, safeNumber(values.subjectSquareFeet, 1500));
  const comps = [1, 2, 3].map((k) => ({
    price: Math.max(0, safeNumber(values[`comp${k}Price`], [315000, 332000, 298000][k - 1])),
    sqft: Math.max(1, safeNumber(values[`comp${k}SquareFeet`], [1480, 1560, 1450][k - 1])),
  }));

  const perSqft = comps.map((c) => c.price / c.sqft);
  const avg = perSqft.reduce((a, b) => a + b, 0) / 3;

  return {
    afterRepairValue: round2(avg * subjectSquareFeet),
    averagePricePerSquareFoot: round2(avg),
    lowArv: round2(Math.min(...perSqft) * subjectSquareFeet),
    highArv: round2(Math.max(...perSqft) * subjectSquareFeet),
  };
};

// --- 8. 70% Rule House Flipping ----------------------------------------------
export const seventyPercentRuleCalculator: CustomCalculator = (values) => {
  const afterRepairValue = Math.max(0, safeNumber(values.afterRepairValue, 300000));
  const repairCosts = Math.max(0, safeNumber(values.repairCosts, 50000));
  const rulePercent = Math.max(0, safeNumber(values.rulePercent, 70));
  const askingPrice = Math.max(0, safeNumber(values.askingPrice, 175000));

  const mao = (afterRepairValue * rulePercent) / 100 - repairCosts;

  return {
    maximumAllowableOffer: round2(mao),
    askingPriceAboveOrBelowMao: round2(askingPrice - mao),
    impliedMarginForCostsAndProfit: round2(afterRepairValue * (1 - rulePercent / 100)),
  };
};

// --- 9. Fix and Flip Calculator (financed) --------------------------------
export const fixAndFlipCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 220000));
  const rehabCost = Math.max(0, safeNumber(values.rehabCost, 50000));
  const afterRepairValue = Math.max(0, safeNumber(values.afterRepairValue, 360000));
  const loanPercentOfCost = Math.min(100, Math.max(0, safeNumber(values.loanPercentOfCost, 85)));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 2));
  const projectMonths = Math.max(0, safeNumber(values.projectMonths, 6));
  const otherCostsPercentOfArv = Math.max(0, safeNumber(values.otherCostsPercentOfArv, 10));

  const cost = purchasePrice + rehabCost;
  const loan = (cost * loanPercentOfCost) / 100;
  // Interest-only on the full loan for the project (a cautious estimate).
  const interest = (loan * loanRatePercent) / 100 / 12 * projectMonths;
  const points = (loan * pointsPercent) / 100;
  const other = (afterRepairValue * otherCostsPercentOfArv) / 100;
  const profit = afterRepairValue - cost - interest - points - other;
  const cash = cost - loan + points + interest;

  return {
    netProfit: round2(profit),
    cashYouPutIn: round2(cash),
    roiOnCashPercent: pct(profit, cash),
    financingCost: round2(interest + points),
    loanAmount: round2(loan),
  };
};

// --- 10. Fix and Flip Loan (hard money sizing) ----------------------------
export const fixAndFlipLoanCalculator: CustomCalculator = (values) => {
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 200000));
  const rehabBudget = Math.max(0, safeNumber(values.rehabBudget, 60000));
  const afterRepairValue = Math.max(0, safeNumber(values.afterRepairValue, 340000));
  const purchaseLtcPercent = Math.max(0, safeNumber(values.purchaseLtcPercent, 90));
  const rehabFundedPercent = Math.max(0, safeNumber(values.rehabFundedPercent, 100));
  const maxArvLtvPercent = Math.max(0, safeNumber(values.maxArvLtvPercent, 70));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 11));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 2));

  const byCost = (purchasePrice * purchaseLtcPercent) / 100 + (rehabBudget * rehabFundedPercent) / 100;
  const byArv = (afterRepairValue * maxArvLtvPercent) / 100;
  const loan = Math.min(byCost, byArv);
  const points = (loan * pointsPercent) / 100;

  return {
    loanAmount: round2(loan),
    monthlyInterestPayment: round2((loan * interestRatePercent) / 100 / 12),
    pointsAtClosing: round2(points),
    cashNeededForPurchaseAndRehab: round2(purchasePrice + rehabBudget - loan + points),
    limitedByArvCap: byArv < byCost ? round2(byCost - byArv) : 0,
  };
};

// --- 11. Fix and Flip Financing (hard money vs cash) ---------------------
export const fixAndFlipFinancingCalculator: CustomCalculator = (values) => {
  const totalProjectCost = Math.max(0, safeNumber(values.totalProjectCost, 280000));
  const expectedProfitBeforeFinancing = safeNumber(values.expectedProfitBeforeFinancing, 55000);
  const loanPercentOfCost = Math.min(100, Math.max(0, safeNumber(values.loanPercentOfCost, 80)));
  const interestRatePercent = Math.max(0, safeNumber(values.interestRatePercent, 11));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 2));
  const projectMonths = Math.max(0.5, safeNumber(values.projectMonths, 6));

  const loan = (totalProjectCost * loanPercentOfCost) / 100;
  const financing = (loan * interestRatePercent) / 100 / 12 * projectMonths + (loan * pointsPercent) / 100;
  const leveredProfit = expectedProfitBeforeFinancing - financing;
  const leveredCash = Math.max(0.01, totalProjectCost - loan + financing);

  return {
    costOfFinancing: round2(financing),
    profitWithFinancing: round2(leveredProfit),
    roiWithFinancingPercent: pct(leveredProfit, leveredCash),
    roiAllCashPercent: pct(expectedProfitBeforeFinancing, totalProjectCost),
    cashNeededWithFinancing: round2(leveredCash),
  };
};

// --- 12. Renovation Cost (homeowner, by finish level) --------------------
export const renovationCostCalculator: CustomCalculator = (values) => {
  const squareFeet = Math.max(0, safeNumber(values.squareFeet, 400));
  // Cost per square foot for the finish level chosen.
  const costPerSquareFoot = Math.max(0, safeNumber(values.costPerSquareFoot, 150));
  const permitsAndDesign = Math.max(0, safeNumber(values.permitsAndDesign, 3500));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 15));
  const expectedValueAdded = Math.max(0, safeNumber(values.expectedValueAdded, 50000));

  const base = squareFeet * costPerSquareFoot + permitsAndDesign;
  const total = base * (1 + contingencyPercent / 100);

  return {
    totalRenovationCost: round2(total),
    costBeforeContingency: round2(base),
    contingency: round2(total - base),
    costRecoupedPercent: pct(expectedValueAdded, total),
  };
};

// --- 13. Rehab Cost (investor, by scope) -----------------------------------
export const rehabCostCalculator: CustomCalculator = (values) => {
  const squareFeet = Math.max(0, safeNumber(values.squareFeet, 1400));
  // Rehab scope $/sq ft: light ≈ 20, medium ≈ 45, heavy ≈ 75 (varies by market).
  const scopeCostPerSqft = Math.max(0, safeNumber(values.scopeCostPerSqft, 45));
  const roof = Math.max(0, safeNumber(values.roof, 0));
  const hvac = Math.max(0, safeNumber(values.hvac, 7500));
  const foundationOrMajorItems = Math.max(0, safeNumber(values.foundationOrMajorItems, 0));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 10));

  const scope = squareFeet * scopeCostPerSqft;
  const big = roof + hvac + foundationOrMajorItems;
  const total = (scope + big) * (1 + contingencyPercent / 100);

  return {
    totalRehabEstimate: round2(total),
    generalScopeCost: round2(scope),
    bigTicketItems: round2(big),
    allInPerSquareFoot: squareFeet > 0 ? round2(total / squareFeet) : 0,
  };
};

export const realestateFlipsCustomCalculators: Record<string, CustomCalculator> = {
  "house-flip-profit-calculator": houseFlipProfitCalculator,
  "house-flip-roi-calculator": houseFlipRoiCalculator,
  "house-flip-cost-calculator": houseFlipCostCalculator,
  "house-flip-budget-calculator": houseFlipBudgetCalculator,
  "house-flip-break-even-calculator": houseFlipBreakEvenCalculator,
  "house-flip-arv-calculator": houseFlipArvCalculator,
  "after-repair-value-calculator": afterRepairValueCalculator,
  "70-percent-rule-house-flipping-calculator": seventyPercentRuleCalculator,
  "fix-and-flip-calculator": fixAndFlipCalculator,
  "fix-and-flip-loan-calculator": fixAndFlipLoanCalculator,
  "fix-and-flip-financing-calculator": fixAndFlipFinancingCalculator,
  "renovation-cost-calculator": renovationCostCalculator,
  "rehab-cost-calculator": rehabCostCalculator,
};
