/**
 * Batch: "Salary & Income Calculators" sub-batch H (Rates & Targets, 7
 * tools). Part of the Salary & Income build-out — see
 * calc-engine-salary-conversions.ts for the full list of 9 sub-batches.
 * Filed under Finance Calculators > Salary & Income Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - trueHourlyWageCalculator: an EMPLOYEE's real wage per hour of their
 *    time — after tax, work costs and unpaid commuting.
 *  - contractRateToSalaryCalculator: the W-2 salary a contract hourly rate
 *    is really worth once you pay your own benefits, unpaid time off and the
 *    employer half of payroll tax.
 *  - salaryToContractRateCalculator: the reverse — the minimum hourly
 *    contract rate that matches a salary + benefits package.
 *  - freelanceRateCalculator: the hourly rate a freelancer must charge to
 *    TAKE HOME a target income after tax and expenses.
 *  - consultingRateCalculator: a consultant's DAY rate from target income,
 *    overhead, profit and utilization.
 *  - billableHourRateCalculator: a FIRM's billing rate for an employee —
 *    their cost plus overhead plus a profit margin.
 *  - targetSalaryCalculator: the gross salary your monthly budget and
 *    savings goals require.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-rates-calculators.ts for the tool content/copy
 * this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const EMPLOYER_FICA = 0.0765;

// --- 1. True Hourly Wage Calculator ------------------------------------------
export const trueHourlyWageCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 60000));
  const hoursWorkedPerWeek = Math.max(0, safeNumber(values.hoursWorkedPerWeek, 45));
  const commuteHoursPerWeek = Math.max(0, safeNumber(values.commuteHoursPerWeek, 5));
  const workCostsPerYear = Math.max(0, safeNumber(values.workCostsPerYear, 6000));
  const taxRatePercent = Math.min(90, Math.max(0, safeNumber(values.taxRatePercent, 22)));
  const weeksWorked = Math.max(1, safeNumber(values.weeksWorked, 48));

  const net = annualSalary * (1 - taxRatePercent / 100) - workCostsPerYear;
  const hours = (hoursWorkedPerWeek + commuteHoursPerWeek) * weeksWorked;
  const official = annualSalary / 2080;

  return {
    trueHourlyWage: hours > 0 ? round2(net / hours) : 0,
    statedHourlyRate: round2(official),
    hoursGivenToWorkPerYear: round2(hours),
    moneyLeftAfterTaxAndWorkCosts: round2(net),
  };
};

// --- 2. Contract Rate to Salary Calculator -----------------------------------
export const contractRateToSalaryCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 60));
  const billableHoursPerWeek = Math.max(0, safeNumber(values.billableHoursPerWeek, 40));
  const billableWeeks = Math.min(52, Math.max(0, safeNumber(values.billableWeeks, 46)));
  const selfFundedBenefits = Math.max(0, safeNumber(values.selfFundedBenefits, 9000));

  const billings = hourlyRate * billableHoursPerWeek * billableWeeks;
  // Salary S with employer FICA and benefits costing the same as the billings.
  const salary = Math.max(0, (billings - selfFundedBenefits) / (1 + EMPLOYER_FICA));

  return {
    equivalentSalary: round2(salary),
    annualBillings: round2(billings),
    naiveSalaryAt2080Hours: round2(hourlyRate * 2080),
    salaryAsMultipleOfRate: hourlyRate > 0 ? round2(salary / hourlyRate) : 0,
  };
};

// --- 3. Salary to Contract Rate Calculator -----------------------------------
export const salaryToContractRateCalculator: CustomCalculator = (values) => {
  const salary = Math.max(0, safeNumber(values.salary, 90000));
  const benefitsPercent = Math.max(0, safeNumber(values.benefitsPercent, 25));
  const billableHoursPerYear = Math.max(1, safeNumber(values.billableHoursPerYear, 1800));
  const extraMarginPercent = Math.max(0, safeNumber(values.extraMarginPercent, 10));

  const packageCost = salary * (1 + benefitsPercent / 100 + EMPLOYER_FICA);
  const breakEven = packageCost / billableHoursPerYear;

  return {
    minimumContractRate: round2(breakEven),
    recommendedRateWithMargin: round2(breakEven * (1 + extraMarginPercent / 100)),
    salaryPerHourAt2080: round2(salary / 2080),
    totalPackageValue: round2(packageCost),
  };
};

// --- 4. Freelance Rate Calculator (to take home a target) ---------------
export const freelanceRateCalculator: CustomCalculator = (values) => {
  const targetTakeHome = Math.max(0, safeNumber(values.targetTakeHome, 70000));
  const businessExpenses = Math.max(0, safeNumber(values.businessExpenses, 8000));
  const totalTaxRatePercent = Math.min(90, Math.max(0, safeNumber(values.totalTaxRatePercent, 30)));
  const billableHoursPerWeek = Math.max(0, safeNumber(values.billableHoursPerWeek, 25));
  const workingWeeks = Math.min(52, Math.max(0, safeNumber(values.workingWeeks, 46)));

  const revenueNeeded = targetTakeHome / (1 - totalTaxRatePercent / 100) + businessExpenses;
  const hours = billableHoursPerWeek * workingWeeks;

  return {
    hourlyRateToCharge: hours > 0 ? round2(revenueNeeded / hours) : 0,
    revenueNeeded: round2(revenueNeeded),
    billableHoursPerYear: round2(hours),
    dayRateAt8Hours: hours > 0 ? round2((revenueNeeded / hours) * 8) : 0,
  };
};

// --- 5. Consulting Rate Calculator (day rate) --------------------------------
export const consultingRateCalculator: CustomCalculator = (values) => {
  const targetIncome = Math.max(0, safeNumber(values.targetIncome, 150000));
  const annualOverhead = Math.max(0, safeNumber(values.annualOverhead, 20000));
  const profitMarginPercent = Math.min(90, Math.max(0, safeNumber(values.profitMarginPercent, 15)));
  const workingDays = Math.max(1, safeNumber(values.workingDays, 220));
  const utilizationPercent = Math.min(100, Math.max(1, safeNumber(values.utilizationPercent, 60)));

  const revenue = (targetIncome + annualOverhead) / (1 - profitMarginPercent / 100);
  const billableDays = (workingDays * utilizationPercent) / 100;
  const dayRate = revenue / billableDays;

  return {
    dayRate: round2(dayRate),
    hourlyRate: round2(dayRate / 8),
    halfDayRate: round2(dayRate / 2),
    billableDaysPerYear: round2(billableDays),
    revenueNeeded: round2(revenue),
  };
};

// --- 6. Billable Hour Rate Calculator (firm, cost-plus) -------------------
export const billableHourRateCalculator: CustomCalculator = (values) => {
  const employeeSalary = Math.max(0, safeNumber(values.employeeSalary, 80000));
  const benefitsAndTaxesPercent = Math.max(0, safeNumber(values.benefitsAndTaxesPercent, 30));
  const overheadPerEmployee = Math.max(0, safeNumber(values.overheadPerEmployee, 25000));
  const billableHoursPerYear = Math.max(1, safeNumber(values.billableHoursPerYear, 1500));
  const profitMarginPercent = Math.min(90, Math.max(0, safeNumber(values.profitMarginPercent, 20)));

  const cost = employeeSalary * (1 + benefitsAndTaxesPercent / 100) + overheadPerEmployee;
  const costPerHour = cost / billableHoursPerYear;
  const rate = costPerHour / (1 - profitMarginPercent / 100);

  return {
    billableHourRate: round2(rate),
    fullyLoadedCostPerHour: round2(costPerHour),
    profitPerBillableHour: round2(rate - costPerHour),
    rateAsMultipleOfSalaryPerHour: employeeSalary > 0 ? round2(rate / (employeeSalary / 2080)) : 0,
  };
};

// --- 7. Target Salary Calculator (from your budget) ----------------------
export const targetSalaryCalculator: CustomCalculator = (values) => {
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses, 3200));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 400));
  const monthlySavingsGoal = Math.max(0, safeNumber(values.monthlySavingsGoal, 800));
  const taxAndDeductionsPercent = Math.min(90, Math.max(0, safeNumber(values.taxAndDeductionsPercent, 25)));

  const netMonthly = monthlyExpenses + monthlyDebtPayments + monthlySavingsGoal;
  const gross = (netMonthly * 12) / (1 - taxAndDeductionsPercent / 100);

  return {
    targetAnnualSalary: round2(gross),
    targetMonthlyGross: round2(gross / 12),
    takeHomeNeededPerMonth: round2(netMonthly),
    hourlyEquivalent: round2(gross / 2080),
  };
};

export const salaryRatesCustomCalculators: Record<string, CustomCalculator> = {
  "true-hourly-wage-calculator": trueHourlyWageCalculator,
  "contract-rate-to-salary-calculator": contractRateToSalaryCalculator,
  "salary-to-contract-rate-calculator": salaryToContractRateCalculator,
  "freelance-rate-calculator": freelanceRateCalculator,
  "consulting-rate-calculator": consultingRateCalculator,
  "billable-hour-rate-calculator": billableHourRateCalculator,
  "target-salary-calculator": targetSalaryCalculator,
};
