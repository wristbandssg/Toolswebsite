/**
 * Batch: "Interest Calculators" expansion (5 Oct 2026), sub-batch 4 of 9 —
 * Indian Savings Schemes (7 tools, amounts in INR), filed under Savings
 * Calculators. See calc-engine-interest-methods.ts for the full batch
 * context.
 *
 *  - fixedDepositInterest (incl. cooperative society deposits): quarterly
 *    (or monthly/annual) compounding, senior-citizen extra rate, estimated
 *    TDS (10% when yearly interest passes the threshold).
 *  - recurringDepositInterest: each monthly installment compounded
 *    quarterly for the months it stays in (the banks' / India Post formula).
 *  - nationalSavingsCertificate: 5 years, compounded yearly, paid at
 *    maturity; interest for years 1–4 is deemed reinvested (80C, old regime).
 *  - postOfficeSavingsInterest: Time Deposit (quarterly compounding),
 *    Monthly Income Scheme (monthly payout), Savings Account (simple).
 *  - sukanyaSamriddhi: deposits for 15 years, matures 21 years after
 *    opening, compounded yearly.
 *  - providentFundInterest (EPF): employee 12% + employer 12% less the
 *    8.33% EPS share (on wages up to ₹15,000); interest on the monthly
 *    running balance, credited yearly; salary growth.
 *  - chitFund: monthly contributions less dividends, the prize (chit value
 *    less your bid discount) in your month — net gain/cost and the
 *    annualized rate (IRR).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-savings-india-schemes-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Fixed Deposit Interest Calculator ---------------------------------------------
export const fixedDepositInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 500000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const tenureMonths = Math.max(1, safeNumber(values.tenureMonths, 24));
  const rawFreq = Math.round(safeNumber(values.compoundingPerYear, 4));
  const freq = [1, 4, 12].includes(rawFreq) ? rawFreq : 4;
  const senior = Math.round(safeNumber(values.seniorCitizen, 0)) === 1;
  const seniorExtraPercent = Math.max(0, safeNumber(values.seniorExtraPercent, 0.5));
  const tdsThreshold = Math.max(0, safeNumber(values.tdsThreshold, 50000));

  const rate = annualRatePercent + (senior ? seniorExtraPercent : 0);
  const years = tenureMonths / 12;
  const maturity = principal * Math.pow(1 + rate / 100 / freq, freq * years);
  const interest = maturity - principal;
  const yearlyInterest = interest / years;
  const tds = yearlyInterest > tdsThreshold ? interest * 0.1 : 0;

  return {
    rateApplied: round2(rate),
    maturityAmount: round2(maturity),
    totalInterest: round2(interest),
    effectiveAnnualYield: round2((Math.pow(1 + rate / 100 / freq, freq) - 1) * 100),
    estimatedTds: round2(tds),
    maturityAfterTds: round2(maturity - tds),
  };
};

// --- 2. Recurring Deposit Interest Calculator -----------------------------------------
export const recurringDepositInterestCalculator: CustomCalculator = (values) => {
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.7));
  const months = Math.max(1, Math.round(safeNumber(values.months, 60)));

  const q = annualRatePercent / 100 / 4;
  let maturity = 0;
  for (let k = months; k >= 1; k--) maturity += monthlyDeposit * Math.pow(1 + q, k / 3);
  const deposited = monthlyDeposit * months;

  return {
    totalDeposited: round2(deposited),
    maturityAmount: round2(maturity),
    totalInterest: round2(maturity - deposited),
  };
};

// --- 3. National Savings Certificate Calculator ---------------------------------------
export const nationalSavingsCertificateCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.7));
  const years = Math.max(1, Math.round(safeNumber(values.years, 5)));

  const r = annualRatePercent / 100;
  const maturity = investment * Math.pow(1 + r, years);
  let reinvested = 0;
  for (let y = 1; y < years; y++) reinvested += investment * Math.pow(1 + r, y - 1) * r;

  return {
    maturityAmount: round2(maturity),
    totalInterest: round2(maturity - investment),
    firstYearInterest: round2(investment * r),
    finalYearInterest: round2(investment * Math.pow(1 + r, years - 1) * r),
    interestDeemedReinvested: round2(reinvested),
  };
};

// --- 4. Post Office Savings Interest Calculator ---------------------------------------
export const postOfficeSavingsInterestCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 200000));
  const raw = Math.round(safeNumber(values.scheme, 1));
  const scheme = [1, 2, 3].includes(raw) ? raw : 1;
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const years = Math.max(0, safeNumber(values.years, 5));

  const r = annualRatePercent / 100;
  let interest: number;
  let monthly = 0;
  if (scheme === 1) {
    interest = amount * (Math.pow(1 + r / 4, 4 * years) - 1);
  } else if (scheme === 2) {
    monthly = (amount * r) / 12;
    interest = monthly * Math.round(years * 12);
  } else {
    interest = amount * (Math.pow(1 + r, years) - 1);
  }

  return {
    monthlyIncome: round2(monthly),
    yearlyInterest: round2(scheme === 1 ? amount * (Math.pow(1 + r / 4, 4) - 1) : amount * r),
    totalInterest: round2(interest),
    maturityAmount: round2(scheme === 2 ? amount : amount + interest),
    totalReceived: round2(amount + interest),
  };
};

// --- 5. Sukanya Samriddhi Calculator --------------------------------------------------
export const sukanyaSamriddhiCalculator: CustomCalculator = (values) => {
  const yearlyDeposit = Math.min(150000, Math.max(0, safeNumber(values.yearlyDeposit, 150000)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.2));
  const girlAge = Math.min(10, Math.max(0, Math.round(safeNumber(values.girlAge, 3))));

  const r = annualRatePercent / 100;
  let balance = 0;
  let at15 = 0;
  for (let y = 0; y < 21; y++) {
    if (y < 15) balance += yearlyDeposit;
    balance *= 1 + r;
    if (y === 14) at15 = balance;
  }
  const deposited = yearlyDeposit * 15;

  return {
    totalDeposited: round2(deposited),
    balanceAfterDeposits: round2(at15),
    maturityAmount: round2(balance),
    totalInterest: round2(balance - deposited),
    ageAtMaturity: girlAge + 21,
  };
};

// --- 6. Provident Fund Interest Calculator (EPF) --------------------------------------
export const providentFundInterestCalculator: CustomCalculator = (values) => {
  const monthlyBasic = Math.max(0, safeNumber(values.monthlyBasic, 30000));
  const salaryGrowthPercent = safeNumber(values.salaryGrowthPercent, 5);
  const years = Math.max(0, Math.round(safeNumber(values.years, 25)));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.25));
  const employeePercent = Math.max(0, safeNumber(values.employeePercent, 12));

  let balance = currentBalance;
  let employeeTotal = 0;
  let employerTotal = 0;
  let interestTotal = 0;
  let firstMonthEmployer = 0;
  for (let y = 0; y < years; y++) {
    const basic = monthlyBasic * Math.pow(1 + salaryGrowthPercent / 100, y);
    const eps = Math.min(basic, 15000) * 0.0833;
    const employee = (basic * employeePercent) / 100;
    const employer = Math.max(0, basic * 0.12 - eps);
    if (y === 0) firstMonthEmployer = employer;
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      balance += employee + employer;
      employeeTotal += employee;
      employerTotal += employer;
      yearInterest += (balance * annualRatePercent) / 100 / 12;
    }
    balance += yearInterest;
    interestTotal += yearInterest;
  }

  return {
    monthlyEmployeeContribution: round2((monthlyBasic * employeePercent) / 100),
    monthlyEmployerToEpf: round2(firstMonthEmployer),
    totalEmployeeContribution: round2(employeeTotal),
    totalEmployerContribution: round2(employerTotal),
    totalInterest: round2(interestTotal),
    maturityAmount: round2(balance),
  };
};

// --- 7. Chit Fund Calculator ----------------------------------------------------------
export const chitFundCalculator: CustomCalculator = (values) => {
  const chitValue = Math.max(0, safeNumber(values.chitValue, 500000));
  const members = Math.max(2, Math.round(safeNumber(values.members, 20)));
  const yourMonth = Math.min(members, Math.max(1, Math.round(safeNumber(values.yourMonth, 3))));
  const yourDiscountPercent = Math.min(40, Math.max(0, safeNumber(values.yourDiscountPercent, 25)));
  const othersDiscountPercent = Math.min(40, Math.max(0, safeNumber(values.othersDiscountPercent, 15)));
  const commissionPercent = Math.max(0, safeNumber(values.commissionPercent, 5));

  const contribution = chitValue / members;
  const commission = (chitValue * commissionPercent) / 100;
  const flows: number[] = [];
  let paid = 0;
  for (let m = 1; m <= members; m++) {
    const discountPct = m === yourMonth ? yourDiscountPercent : othersDiscountPercent;
    const dividend = Math.max(0, (chitValue * discountPct) / 100 - commission) / members;
    const pay = contribution - dividend;
    paid += pay;
    let flow = -pay;
    if (m === yourMonth) flow += chitValue * (1 - yourDiscountPercent / 100);
    flows.push(flow);
  }
  const received = chitValue * (1 - yourDiscountPercent / 100);
  const npv = (i: number) => flows.reduce((s, f, k) => s + f / Math.pow(1 + i, k), 0);
  // monthly IRR by bisection; the sign of NPV at 0 tells which side the root is
  let lo = -0.2;
  let hi = 0.2;
  const sLo = Math.sign(npv(lo));
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(npv(mid)) === sLo) lo = mid;
    else hi = mid;
  }
  const irr = (lo + hi) / 2;
  const valid = Math.sign(npv(-0.2)) !== Math.sign(npv(0.2));

  return {
    monthlyContribution: round2(contribution),
    amountYouReceive: round2(received),
    totalYouPay: round2(paid),
    netGainOrCost: round2(received - paid),
    annualizedRate: round2(valid ? (Math.pow(1 + irr, 12) - 1) * 100 : 0),
  };
};

export const savingsIndiaSchemesCustomCalculators: Record<string, CustomCalculator> = {
  "fixed-deposit-interest-calculator": fixedDepositInterestCalculator,
  "recurring-deposit-interest-calculator": recurringDepositInterestCalculator,
  "national-savings-certificate-calculator": nationalSavingsCertificateCalculator,
  "post-office-savings-interest-calculator": postOfficeSavingsInterestCalculator,
  "sukanya-samriddhi-calculator": sukanyaSamriddhiCalculator,
  "provident-fund-interest-calculator": providentFundInterestCalculator,
  "chit-fund-calculator": chitFundCalculator,
};
