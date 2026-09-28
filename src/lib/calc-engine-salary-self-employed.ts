/**
 * Batch: "Salary & Income Calculators" sub-batch G (Side, Freelance & Self-
 * Employed Income, 6 tools). Part of the Salary & Income build-out — see
 * calc-engine-salary-conversions.ts for the full list of 9 sub-batches.
 * Filed under Finance Calculators > Salary & Income Calculators.
 *
 * US self-employment (SE) tax, 2026: 12.4% Social Security on net earnings
 * up to the $184,500 wage base plus 2.9% Medicare on all of it, applied to
 * 92.35% of net profit; half of SE tax is deductible from income.
 *
 * Near-namesakes, and how each is deliberately different (the Tax category
 * already has freelancer-tax, contractor-tax and self-employment-tax tools
 * that compute the tax bill itself):
 *  - sideIncomeCalculator: what a side hustle really adds after expenses
 *    and tax — and per hour of your spare time.
 *  - freelanceIncomeCalculator: projects × fee − platform fees − expenses,
 *    per month and per year.
 *  - selfEmploymentIncomeCalculator: net profit → SE tax → the income left
 *    before income tax.
 *  - contractorIncomeCalculator: 1099 billings → take-home after SE and
 *    income tax, and the quarterly estimated payment to set aside.
 *  - gigIncomeCalculator: rideshare/delivery earnings per hour after
 *    platform fees and the cost of the miles driven.
 *  - effectiveHourlyRateCalculator: a project fee ÷ ALL the hours it really
 *    took (including unbilled time), after expenses.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-self-employed-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SS_WAGE_BASE_2026 = 184500;

// Self-employment tax on a year's net profit (other W-2 wages use up the
// Social Security wage base first).
function seTax(netProfit: number, otherWages = 0): number {
  const earnings = Math.max(0, netProfit) * 0.9235;
  const ssRoom = Math.max(0, SS_WAGE_BASE_2026 - otherWages);
  return Math.min(earnings, ssRoom) * 0.124 + earnings * 0.029;
}

// --- 1. Side Income Calculator -------------------------------------------------
export const sideIncomeCalculator: CustomCalculator = (values) => {
  const monthlyRevenue = Math.max(0, safeNumber(values.monthlyRevenue, 1200));
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses, 200));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 8));
  const incomeTaxRatePercent = Math.min(60, Math.max(0, safeNumber(values.incomeTaxRatePercent, 22)));
  const includeSeTax = safeNumber(values.includeSeTax, 1) >= 1;

  const profit = Math.max(0, monthlyRevenue - monthlyExpenses) * 12;
  const se = includeSeTax ? seTax(profit) : 0;
  const incomeTax = Math.max(0, profit - se / 2) * (incomeTaxRatePercent / 100);
  const net = profit - se - incomeTax;
  const hours = hoursPerWeek * 52;

  return {
    netSideIncomePerYear: round2(net),
    netPerMonth: round2(net / 12),
    netPerHour: hours > 0 ? round2(net / hours) : 0,
    taxesPerYear: round2(se + incomeTax),
    profitBeforeTax: round2(profit),
  };
};

// --- 2. Freelance Income Calculator -----------------------------------------
export const freelanceIncomeCalculator: CustomCalculator = (values) => {
  const projectsPerMonth = Math.max(0, safeNumber(values.projectsPerMonth, 4));
  const averageProjectFee = Math.max(0, safeNumber(values.averageProjectFee, 1500));
  const platformFeePercent = Math.min(100, Math.max(0, safeNumber(values.platformFeePercent, 10)));
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses, 300));

  const revenue = projectsPerMonth * averageProjectFee;
  const fees = (revenue * platformFeePercent) / 100;
  const net = revenue - fees - monthlyExpenses;

  return {
    monthlyNetIncome: round2(net),
    annualNetIncome: round2(net * 12),
    monthlyRevenue: round2(revenue),
    platformFeesPerYear: round2(fees * 12),
    keepPerProject: projectsPerMonth > 0 ? round2(net / projectsPerMonth) : 0,
  };
};

// --- 3. Self-Employment Income Calculator ------------------------------------
export const selfEmploymentIncomeCalculator: CustomCalculator = (values) => {
  const grossRevenue = Math.max(0, safeNumber(values.grossRevenue, 120000));
  const businessExpenses = Math.max(0, safeNumber(values.businessExpenses, 25000));
  const otherW2Wages = Math.max(0, safeNumber(values.otherW2Wages, 0));

  const profit = Math.max(0, grossRevenue - businessExpenses);
  const tax = seTax(profit, otherW2Wages);

  return {
    netProfit: round2(profit),
    selfEmploymentTax: round2(tax),
    incomeAfterSeTax: round2(profit - tax),
    halfSeTaxDeduction: round2(tax / 2),
    profitMarginPercent: grossRevenue > 0 ? round2((profit / grossRevenue) * 100) : 0,
  };
};

// --- 4. Contractor Income Calculator (1099 take-home) ---------------------
export const contractorIncomeCalculator: CustomCalculator = (values) => {
  const annualBillings = Math.max(0, safeNumber(values.annualBillings, 95000));
  const businessExpenses = Math.max(0, safeNumber(values.businessExpenses, 8000));
  const incomeTaxRatePercent = Math.min(60, Math.max(0, safeNumber(values.incomeTaxRatePercent, 18)));
  const stateTaxRatePercent = Math.min(20, Math.max(0, safeNumber(values.stateTaxRatePercent, 5)));

  const profit = Math.max(0, annualBillings - businessExpenses);
  const se = seTax(profit);
  const taxable = Math.max(0, profit - se / 2);
  const incomeTax = (taxable * (incomeTaxRatePercent + stateTaxRatePercent)) / 100;
  const totalTax = se + incomeTax;

  return {
    takeHomePay: round2(profit - totalTax),
    totalTaxes: round2(totalTax),
    quarterlyEstimatedPayment: round2(totalTax / 4),
    setAsidePercentOfBillings: annualBillings > 0 ? round2((totalTax / annualBillings) * 100) : 0,
    monthlyTakeHome: round2((profit - totalTax) / 12),
  };
};

// --- 5. Gig Income Calculator (rideshare / delivery) ----------------------
export const gigIncomeCalculator: CustomCalculator = (values) => {
  const weeklyEarnings = Math.max(0, safeNumber(values.weeklyEarnings, 900));
  const tipsPerWeek = Math.max(0, safeNumber(values.tipsPerWeek, 150));
  const hoursOnline = Math.max(0, safeNumber(values.hoursOnline, 35));
  const milesPerWeek = Math.max(0, safeNumber(values.milesPerWeek, 550));
  const costPerMile = Math.max(0, safeNumber(values.costPerMile, 0.35));
  const otherWeeklyCosts = Math.max(0, safeNumber(values.otherWeeklyCosts, 25));

  const gross = weeklyEarnings + tipsPerWeek;
  const car = milesPerWeek * costPerMile;
  const net = gross - car - otherWeeklyCosts;

  return {
    netPerHour: hoursOnline > 0 ? round2(net / hoursOnline) : 0,
    netPerWeek: round2(net),
    grossPerHour: hoursOnline > 0 ? round2(gross / hoursOnline) : 0,
    vehicleCostPerWeek: round2(car),
    netPerYear: round2(net * 52),
  };
};

// --- 6. Effective Hourly Rate Calculator (all hours, net of costs) -------
export const effectiveHourlyRateCalculator: CustomCalculator = (values) => {
  const projectFee = Math.max(0, safeNumber(values.projectFee, 3000));
  const billableHours = Math.max(0, safeNumber(values.billableHours, 30));
  const unbilledHours = Math.max(0, safeNumber(values.unbilledHours, 12));
  const projectExpenses = Math.max(0, safeNumber(values.projectExpenses, 150));
  const targetHourlyRate = Math.max(0, safeNumber(values.targetHourlyRate, 85));

  const allHours = billableHours + unbilledHours;
  const net = projectFee - projectExpenses;

  return {
    effectiveHourlyRate: allHours > 0 ? round2(net / allHours) : 0,
    quotedHourlyRate: billableHours > 0 ? round2(projectFee / billableHours) : 0,
    rateLostToUnbilledTimePercent: billableHours > 0 && allHours > 0 ? round2((1 - (net / allHours) / (projectFee / billableHours)) * 100) : 0,
    // Fee that would pay the target rate on every hour, plus expenses.
    feeNeededForTargetRate: round2(targetHourlyRate * allHours + projectExpenses),
  };
};

export const salarySelfEmployedCustomCalculators: Record<string, CustomCalculator> = {
  "side-income-calculator": sideIncomeCalculator,
  "freelance-income-calculator": freelanceIncomeCalculator,
  "self-employment-income-calculator": selfEmploymentIncomeCalculator,
  "contractor-income-calculator": contractorIncomeCalculator,
  "gig-income-calculator": gigIncomeCalculator,
  "effective-hourly-rate-calculator": effectiveHourlyRateCalculator,
};
