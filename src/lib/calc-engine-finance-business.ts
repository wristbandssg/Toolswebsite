/**
 * Batch: "Business Finance Calculators" (10 tools). Part of the
 * Finance_Calculators_Topical_SEO_Master.xlsx build-out (see
 * calc-engine-finance-credit-debt.ts for the full batch list/context).
 *
 * General/global small-business finance calculators — self-contained, no
 * imports from any other batch, per this project's established per-batch
 * convention. Profit Margin, Gross Profit, Net Profit, and Operating
 * Margin are deliberately scoped differently from each other (see each
 * function's comment) so they're distinct tools rather than formula
 * clones of one another.
 *
 * See prisma/create-finance-business-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Profit Margin Calculator (simple: revenue vs. ALL costs combined) ----
export const profitMarginCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue));
  const totalCosts = Math.max(0, safeNumber(values.totalCosts));
  const profit = revenue - totalCosts;
  const profitMarginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
  return {
    profit: round2(profit),
    profitMarginPercent: round2(profitMarginPercent),
  };
};

// --- 2. Gross Profit Calculator (revenue vs. cost of goods sold only) --------
export const grossProfitCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue));
  const cogs = Math.max(0, safeNumber(values.costOfGoodsSold));
  const grossProfit = revenue - cogs;
  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  return {
    grossProfit: round2(grossProfit),
    grossMarginPercent: round2(grossMarginPercent),
  };
};

// --- 3. Net Profit Calculator (full breakdown: COGS + opex + other expenses) --
export const netProfitCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue));
  const cogs = Math.max(0, safeNumber(values.costOfGoodsSold));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses));
  const otherExpenses = Math.max(0, safeNumber(values.otherExpenses));
  const netProfit = revenue - cogs - operatingExpenses - otherExpenses;
  const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return {
    netProfit: round2(netProfit),
    netMarginPercent: round2(netMarginPercent),
  };
};

// --- 4. Markup Calculator ------------------------------------------------------
export const markupCalculator: CustomCalculator = (values) => {
  const cost = Math.max(0, safeNumber(values.cost));
  const markupPercent = Math.max(0, safeNumber(values.markupPercent));
  const sellingPrice = cost * (1 + markupPercent / 100);
  const profit = sellingPrice - cost;
  const marginPercent = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return {
    sellingPrice: round2(sellingPrice),
    profit: round2(profit),
    resultingMarginPercent: round2(marginPercent),
  };
};

// --- 5. Break-Even Calculator ---------------------------------------------------
export const breakEvenCalculator: CustomCalculator = (values) => {
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts));
  const pricePerUnit = Math.max(0, safeNumber(values.pricePerUnit));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit));
  const contributionPerUnit = pricePerUnit - variableCostPerUnit;

  if (contributionPerUnit <= 0) {
    return { breakEvenUnits: 0, breakEvenRevenue: 0, contributionMarginPerUnit: round2(contributionPerUnit) };
  }

  const breakEvenUnits = fixedCosts / contributionPerUnit;
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;
  return {
    breakEvenUnits: Math.ceil(breakEvenUnits),
    breakEvenRevenue: round2(breakEvenRevenue),
    contributionMarginPerUnit: round2(contributionPerUnit),
  };
};

// --- 6. Cash Flow Calculator -----------------------------------------------------
export const cashFlowCalculator: CustomCalculator = (values) => {
  const startingCashBalance = safeNumber(values.startingCashBalance);
  const totalCashInflows = Math.max(0, safeNumber(values.totalCashInflows));
  const totalCashOutflows = Math.max(0, safeNumber(values.totalCashOutflows));
  const netCashFlow = totalCashInflows - totalCashOutflows;
  const endingCashBalance = startingCashBalance + netCashFlow;
  return {
    netCashFlow: round2(netCashFlow),
    endingCashBalance: round2(endingCashBalance),
  };
};

// --- 7. Business Loan Calculator -------------------------------------------------
function annuityPayment(principal: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export const businessLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermMonths = Math.max(1, safeNumber(values.loanTermMonths, 60));
  const monthlyRate = annualInterestRate / 100 / 12;

  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, loanTermMonths);
  const totalRepayment = monthlyPayment * loanTermMonths;
  const totalInterest = totalRepayment - loanAmount;

  return {
    monthlyPayment: round2(monthlyPayment),
    totalInterest: round2(totalInterest),
    totalRepayment: round2(totalRepayment),
  };
};

// --- 8. Operating Margin Calculator (EBIT: excludes interest & tax) -------------
export const operatingMarginCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue));
  const cogs = Math.max(0, safeNumber(values.costOfGoodsSold));
  const operatingExpenses = Math.max(0, safeNumber(values.operatingExpenses));
  const operatingIncome = revenue - cogs - operatingExpenses;
  const operatingMarginPercent = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;
  return {
    operatingIncome: round2(operatingIncome),
    operatingMarginPercent: round2(operatingMarginPercent),
  };
};

// --- 9. ROI Calculator -------------------------------------------------------------
export const roiCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0.01, safeNumber(values.initialInvestment));
  const finalValue = Math.max(0, safeNumber(values.finalValue));
  const investmentPeriodYears = Math.max(0, safeNumber(values.investmentPeriodYears));

  const netGain = finalValue - initialInvestment;
  const roiPercent = (netGain / initialInvestment) * 100;

  let annualizedRoiPercent = 0;
  if (investmentPeriodYears > 0 && finalValue > 0) {
    annualizedRoiPercent = (Math.pow(finalValue / initialInvestment, 1 / investmentPeriodYears) - 1) * 100;
  }

  return {
    netGain: round2(netGain),
    roiPercent: round2(roiPercent),
    annualizedRoiPercent: round2(annualizedRoiPercent),
  };
};

// --- 10. Contribution Margin Calculator -------------------------------------------
export const contributionMarginCalculator: CustomCalculator = (values) => {
  const pricePerUnit = Math.max(0, safeNumber(values.pricePerUnit));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit));
  const unitsSold = Math.max(0, safeNumber(values.unitsSold));

  const contributionMarginPerUnit = pricePerUnit - variableCostPerUnit;
  const contributionMarginRatio = pricePerUnit > 0 ? (contributionMarginPerUnit / pricePerUnit) * 100 : 0;
  const totalContributionMargin = contributionMarginPerUnit * unitsSold;

  return {
    contributionMarginPerUnit: round2(contributionMarginPerUnit),
    contributionMarginRatio: round2(contributionMarginRatio),
    totalContributionMargin: round2(totalContributionMargin),
  };
};

export const financeBusinessCustomCalculators: Record<string, CustomCalculator> = {
  "profit-margin-calculator": profitMarginCalculator,
  "gross-profit-calculator": grossProfitCalculator,
  "net-profit-calculator": netProfitCalculator,
  "markup-calculator": markupCalculator,
  "break-even-calculator": breakEvenCalculator,
  "cash-flow-calculator": cashFlowCalculator,
  "business-loan-calculator": businessLoanCalculator,
  "operating-margin-calculator": operatingMarginCalculator,
  "roi-calculator": roiCalculator,
  "contribution-margin-calculator": contributionMarginCalculator,
};
