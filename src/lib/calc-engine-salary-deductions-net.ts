/**
 * Batch: "Salary & Income Calculators" sub-batch I (Deductions, Gross & Net,
 * 8 tools). Part of the Salary & Income build-out — see
 * calc-engine-salary-conversions.ts for the full list of 9 sub-batches.
 * Filed under Finance Calculators > Salary & Income Calculators.
 *
 * These use rates and amounts YOU enter, so they work for any country; the
 * US-bracket versions (net-salary, salary-after-tax, gross-salary, take-
 * home-pay) live under Tax Calculators. Near-namesakes, and how each is
 * deliberately different:
 *  - grossToNetSalaryCalculator: a salary through percentage deductions —
 *    income tax, social contributions and pension — shown line by line.
 *  - incomeReplacementCalculator: how much of your take-home pay disability
 *    insurance would replace, with a benefit cap and its tax treatment.
 *  - salaryAfterDeductionsCalculator: PRE-tax deductions first (they lower
 *    taxable pay), then tax, then POST-tax deductions — and the tax the
 *    pre-tax ones save.
 *  - paycheckDeductionsCalculator: works backwards from gross and net on a
 *    pay stub to what's being deducted per check and per year.
 *  - preTaxIncomeCalculator: how much you must EARN (before tax) to pay for
 *    something with after-tax money.
 *  - postTaxIncomeCalculator: after-tax income broken down per year, month,
 *    paycheck, week, day and hour.
 *  - grossMonthlyIncomeCalculator: gross monthly income for a loan or rent
 *    application from hourly pay, overtime and bonus.
 *  - netMonthlyIncomeCalculator: true monthly take-home from a paycheck on
 *    any pay schedule.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-deductions-net-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Gross to Net Salary Calculator ---------------------------------------
export const grossToNetSalaryCalculator: CustomCalculator = (values) => {
  const grossSalary = Math.max(0, safeNumber(values.grossSalary, 60000));
  const incomeTaxPercent = Math.min(100, Math.max(0, safeNumber(values.incomeTaxPercent, 15)));
  const socialContributionsPercent = Math.min(100, Math.max(0, safeNumber(values.socialContributionsPercent, 7.65)));
  const pensionPercent = Math.min(100, Math.max(0, safeNumber(values.pensionPercent, 5)));
  const otherDeductionsPerYear = Math.max(0, safeNumber(values.otherDeductionsPerYear, 1200));

  const tax = (grossSalary * incomeTaxPercent) / 100;
  const social = (grossSalary * socialContributionsPercent) / 100;
  const pension = (grossSalary * pensionPercent) / 100;
  const net = grossSalary - tax - social - pension - otherDeductionsPerYear;

  return {
    netAnnualSalary: round2(net),
    netMonthly: round2(net / 12),
    incomeTax: round2(tax),
    socialContributions: round2(social),
    pensionContributions: round2(pension),
    takeHomePercent: grossSalary > 0 ? round2((net / grossSalary) * 100) : 0,
  };
};

// --- 2. Income Replacement Calculator (disability insurance) -------------
export const incomeReplacementCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 72000));
  const benefitPercent = Math.min(100, Math.max(0, safeNumber(values.benefitPercent, 60)));
  const monthlyBenefitCap = Math.max(0, safeNumber(values.monthlyBenefitCap, 5000));
  // 1 = employer paid the premium (benefit is taxable), 2 = you paid with after-tax money (tax-free)
  const whoPaidPremium = Math.round(safeNumber(values.whoPaidPremium, 1)) === 2 ? 2 : 1;
  const taxRatePercent = Math.min(90, Math.max(0, safeNumber(values.taxRatePercent, 20)));

  const grossBenefit = Math.min((annualSalary / 12) * (benefitPercent / 100), monthlyBenefitCap);
  const netBenefit = whoPaidPremium === 1 ? grossBenefit * (1 - taxRatePercent / 100) : grossBenefit;
  const currentNet = (annualSalary / 12) * (1 - taxRatePercent / 100);

  return {
    monthlyBenefitAfterTax: round2(netBenefit),
    monthlyBenefitBeforeTax: round2(grossBenefit),
    shareOfTakeHomeReplacedPercent: currentNet > 0 ? round2((netBenefit / currentNet) * 100) : 0,
    monthlyShortfall: round2(Math.max(0, currentNet - netBenefit)),
  };
};

// --- 3. Salary After Deductions Calculator (pre- vs post-tax) -------------
export const salaryAfterDeductionsCalculator: CustomCalculator = (values) => {
  const grossSalary = Math.max(0, safeNumber(values.grossSalary, 75000));
  const preTaxRetirementPercent = Math.min(100, Math.max(0, safeNumber(values.preTaxRetirementPercent, 6)));
  const preTaxHealthPerYear = Math.max(0, safeNumber(values.preTaxHealthPerYear, 2400));
  const otherPreTaxPerYear = Math.max(0, safeNumber(values.otherPreTaxPerYear, 1000));
  const taxRatePercent = Math.min(90, Math.max(0, safeNumber(values.taxRatePercent, 25)));
  const postTaxDeductionsPerYear = Math.max(0, safeNumber(values.postTaxDeductionsPerYear, 600));

  const preTax = (grossSalary * preTaxRetirementPercent) / 100 + preTaxHealthPerYear + otherPreTaxPerYear;
  const taxable = Math.max(0, grossSalary - preTax);
  const tax = (taxable * taxRatePercent) / 100;
  const net = taxable - tax - postTaxDeductionsPerYear;

  return {
    netSalaryPerYear: round2(net),
    netPerMonth: round2(net / 12),
    preTaxDeductions: round2(preTax),
    taxOnRemainingPay: round2(tax),
    taxSavedByPreTaxDeductions: round2((preTax * taxRatePercent) / 100),
  };
};

// --- 4. Paycheck Deductions Calculator (from a pay stub) -----------------
export const paycheckDeductionsCalculator: CustomCalculator = (values) => {
  const grossPerCheck = Math.max(0, safeNumber(values.grossPerCheck, 2800));
  const netPerCheck = Math.max(0, safeNumber(values.netPerCheck, 2050));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 26));

  const deducted = Math.max(0, grossPerCheck - netPerCheck);

  return {
    deductionsPerCheck: round2(deducted),
    deductionsPercentOfGross: grossPerCheck > 0 ? round2((deducted / grossPerCheck) * 100) : 0,
    deductionsPerYear: round2(deducted * periodsPerYear),
    netPayPerYear: round2(netPerCheck * periodsPerYear),
  };
};

// --- 5. Pre-Tax Income Calculator (earn this much to afford it) ---------
export const preTaxIncomeCalculator: CustomCalculator = (values) => {
  const afterTaxAmount = Math.max(0, safeNumber(values.afterTaxAmount, 5000));
  const incomeTaxPercent = Math.min(90, Math.max(0, safeNumber(values.incomeTaxPercent, 22)));
  const payrollTaxPercent = Math.min(50, Math.max(0, safeNumber(values.payrollTaxPercent, 7.65)));
  const hourlyWage = Math.max(0, safeNumber(values.hourlyWage, 30));

  const keep = 1 - (incomeTaxPercent + payrollTaxPercent) / 100;
  const pre = keep > 0 ? afterTaxAmount / keep : 0;

  return {
    preTaxIncomeNeeded: round2(pre),
    taxOnThatIncome: round2(pre - afterTaxAmount),
    hoursOfWorkNeeded: hourlyWage > 0 ? round2(pre / hourlyWage) : 0,
    youKeepPerDollarEarned: round2(Math.max(0, keep)),
  };
};

// --- 6. Post-Tax Income Calculator (every time unit) ---------------------
export const postTaxIncomeCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 68000));
  const effectiveTaxRatePercent = Math.min(100, Math.max(0, safeNumber(values.effectiveTaxRatePercent, 24)));
  const hoursPerWeek = Math.max(0.1, safeNumber(values.hoursPerWeek, 40));

  const net = annualIncome * (1 - effectiveTaxRatePercent / 100);

  return {
    postTaxAnnual: round2(net),
    postTaxMonthly: round2(net / 12),
    postTaxBiweekly: round2(net / 26),
    postTaxWeekly: round2(net / 52),
    postTaxDaily: round2(net / 260),
    postTaxHourly: round2(net / (hoursPerWeek * 52)),
  };
};

// --- 7. Gross Monthly Income Calculator (for applications) ---------------
export const grossMonthlyIncomeCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 26));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 40));
  const overtimeHoursPerWeek = Math.max(0, safeNumber(values.overtimeHoursPerWeek, 3));
  const annualBonus = Math.max(0, safeNumber(values.annualBonus, 2400));
  const otherMonthlyIncome = Math.max(0, safeNumber(values.otherMonthlyIncome, 0));

  const base = (hourlyRate * hoursPerWeek * 52) / 12;
  const overtime = (hourlyRate * 1.5 * overtimeHoursPerWeek * 52) / 12;
  const total = base + overtime + annualBonus / 12 + otherMonthlyIncome;

  return {
    grossMonthlyIncome: round2(total),
    basePayPerMonth: round2(base),
    overtimePerMonth: round2(overtime),
    grossAnnualIncome: round2(total * 12),
  };
};

// --- 8. Net Monthly Income Calculator (from a paycheck) -------------------
export const netMonthlyIncomeCalculator: CustomCalculator = (values) => {
  const netPaycheck = Math.max(0, safeNumber(values.netPaycheck, 1950));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 26));
  const otherNetMonthly = Math.max(0, safeNumber(values.otherNetMonthly, 0));

  const monthly = (netPaycheck * periodsPerYear) / 12 + otherNetMonthly;
  const checksPerMonthUsually = periodsPerYear === 52 ? 4 : periodsPerYear === 26 ? 2 : periodsPerYear / 12;

  return {
    netMonthlyIncome: round2(monthly),
    typicalMonthOnPaychecksAlone: round2(netPaycheck * checksPerMonthUsually + otherNetMonthly),
    netAnnualIncome: round2(monthly * 12),
    extraPaychecksPerYear: Math.max(0, Math.round(periodsPerYear - checksPerMonthUsually * 12)),
  };
};

export const salaryDeductionsNetCustomCalculators: Record<string, CustomCalculator> = {
  "gross-to-net-salary-calculator": grossToNetSalaryCalculator,
  "income-replacement-calculator": incomeReplacementCalculator,
  "salary-after-deductions-calculator": salaryAfterDeductionsCalculator,
  "paycheck-deductions-calculator": paycheckDeductionsCalculator,
  "pre-tax-income-calculator": preTaxIncomeCalculator,
  "post-tax-income-calculator": postTaxIncomeCalculator,
  "gross-monthly-income-calculator": grossMonthlyIncomeCalculator,
  "net-monthly-income-calculator": netMonthlyIncomeCalculator,
};
