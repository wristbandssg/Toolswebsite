/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 5 of 9 —
 * Tax-Advantaged Savings Accounts (3 tools), filed under Savings
 * Calculators: a US HSA (USD), a UK Cash ISA (GBP) and a Canadian TFSA
 * (CAD). See calc-engine-interest-methods.ts for the full batch context.
 *
 *  - healthSavingsAccount: 2026 limits $4,400 self-only / $8,750 family +
 *    $1,000 catch-up at 55+; contributions capped at the limit less the
 *    employer's; tax saved (income tax + 7.65% FICA via payroll); balance
 *    after yearly medical spending.
 *  - cashIsaInterest: £20,000 yearly allowance; vs a taxable account where
 *    interest above the Personal Savings Allowance (£1,000 basic, £500
 *    higher, £0 additional) is taxed at 20/40/45%.
 *  - tfsaInterest: $7,000 2026 room; growth vs a taxable account taxed
 *    yearly at your marginal rate.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-savings-tax-advantaged-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Health Savings Account Calculator ----------------------------------------------
export const healthSavingsAccountCalculator: CustomCalculator = (values) => {
  const raw = Math.round(safeNumber(values.coverage, 1));
  const family = raw === 2;
  const age55 = Math.round(safeNumber(values.age55Plus, 0)) === 1;
  const plannedContribution = Math.max(0, safeNumber(values.plannedContribution, 4400));
  const employerContribution = Math.max(0, safeNumber(values.employerContribution, 0));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 2000));
  const returnPercent = safeNumber(values.returnPercent, 5);
  const years = Math.max(0, Math.round(safeNumber(values.years, 20)));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 22)));
  const viaPayroll = Math.round(safeNumber(values.viaPayroll, 1)) === 1;
  const yearlyMedicalSpending = Math.max(0, safeNumber(values.yearlyMedicalSpending, 1000));

  const limit = (family ? 8750 : 4400) + (age55 ? 1000 : 0);
  const yours = Math.min(plannedContribution, Math.max(0, limit - employerContribution));
  const taxSaved = (yours * (taxRatePercent + (viaPayroll ? 7.65 : 0))) / 100;
  let balance = currentBalance;
  for (let y = 0; y < years; y++) {
    balance = Math.max(0, (balance + yours + employerContribution - yearlyMedicalSpending) * (1 + returnPercent / 100));
  }

  return {
    contributionLimit: round2(limit),
    yourAllowedContribution: round2(yours),
    taxSavedPerYear: round2(taxSaved),
    totalTaxSaved: round2(taxSaved * years),
    balanceAfterYears: round2(balance),
  };
};

// --- 2. Cash ISA Interest Calculator --------------------------------------------------
export const cashIsaInterestCalculator: CustomCalculator = (values) => {
  const initialDeposit = Math.max(0, safeNumber(values.initialDeposit, 10000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 500));
  const aerPercent = Math.max(0, safeNumber(values.aerPercent, 4.2));
  const years = Math.max(0, Math.round(safeNumber(values.years, 5)));
  const raw = Math.round(safeNumber(values.taxBand, 2));
  const band = [1, 2, 3].includes(raw) ? raw : 2;
  const allowance = Math.max(0, safeNumber(values.allowance, 20000));

  const psa = band === 1 ? 1000 : band === 2 ? 500 : 0;
  const rate = band === 1 ? 0.2 : band === 2 ? 0.4 : 0.45;
  const monthlyGrowth = Math.pow(1 + aerPercent / 100, 1 / 12);
  let isa = 0;
  let taxable = 0;
  let deposited = 0;
  let taxPaid = 0;
  for (let y = 0; y < years; y++) {
    // deposits each tax year stay within the ISA allowance
    let room = allowance;
    const first = y === 0 ? Math.min(initialDeposit, room) : 0;
    room -= first;
    isa += first;
    taxable += first;
    deposited += first;
    let taxableInterest = 0;
    for (let m = 0; m < 12; m++) {
      const add = Math.min(monthlyDeposit, room);
      room -= add;
      deposited += add;
      const a = (isa + add) * monthlyGrowth;
      const b = (taxable + add) * monthlyGrowth;
      taxableInterest += b - taxable - add;
      isa = a;
      taxable = b;
    }
    const tax = Math.max(0, taxableInterest - psa) * rate;
    taxable -= tax;
    taxPaid += tax;
  }

  return {
    totalDeposited: round2(deposited),
    isaBalance: round2(isa),
    isaInterest: round2(isa - deposited),
    taxableAccountBalance: round2(taxable),
    taxSaved: round2(taxPaid),
  };
};

// --- 3. TFSA Interest Calculator ------------------------------------------------------
export const tfsaInterestCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 20000));
  const yearlyContribution = Math.max(0, safeNumber(values.yearlyContribution, 7000));
  const returnPercent = safeNumber(values.returnPercent, 4);
  const years = Math.max(0, Math.round(safeNumber(values.years, 15)));
  const marginalTaxPercent = Math.min(100, Math.max(0, safeNumber(values.marginalTaxPercent, 30)));
  const contributionRoom = Math.max(0, safeNumber(values.contributionRoom, 7000));

  const r = returnPercent / 100;
  const after = r * (1 - marginalTaxPercent / 100);
  let tfsa = currentBalance;
  let taxable = currentBalance;
  for (let y = 0; y < years; y++) {
    tfsa = (tfsa + yearlyContribution) * (1 + r);
    taxable = (taxable + yearlyContribution) * (1 + after);
  }
  const contributed = currentBalance + yearlyContribution * years;

  return {
    totalContributed: round2(contributed),
    tfsaValue: round2(tfsa),
    tfsaGrowth: round2(tfsa - contributed),
    taxableAccountValue: round2(taxable),
    taxSaved: round2(tfsa - taxable),
    overContributionThisYear: round2(Math.max(0, yearlyContribution - contributionRoom)),
  };
};

export const savingsTaxAdvantagedCustomCalculators: Record<string, CustomCalculator> = {
  "health-savings-account-calculator": healthSavingsAccountCalculator,
  "cash-isa-interest-calculator": cashIsaInterestCalculator,
  "tfsa-interest-calculator": tfsaInterestCalculator,
};
