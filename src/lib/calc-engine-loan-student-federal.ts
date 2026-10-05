/**
 * Batch: "Loan Calculators" expansion 6 (5 Oct 2026) — Student Loans
 * (7 tools), filed under Loan Calculators > General Loan Calculators (where
 * the existing student-loan-calculator/-payoff/-refinance tools live; the
 * Loan category already has its maximum of 5 sub-categories). The user's
 * 70-keyword list was checked against every existing slug: 63 were already
 * built (Term Loan = business-loan-*, Unsecured Personal = personal-loan-*),
 * none merged. Student Loan Consolidation is kept apart from
 * student-loan-refinance: a federal Direct Consolidation Loan uses the
 * weighted-average rate rounded up to 1/8%, while refinancing is a new
 * private loan at a new rate.
 *
 * Rules modeled (One Big Beautiful Bill Act, July 2025):
 *  - Grad PLUS closed to new borrowers from 1 Jul 2026; graduate Direct
 *    Unsubsidized limit $20,500/yr ($50,000 professional).
 *  - Parent PLUS capped at $20,000/yr per student from 1 Jul 2026.
 *  - Repayment Assistance Plan (RAP): 1%–10% of AGI (1% per $10,000 band
 *    above $10,000, 10% above $100,000), less $50/month per dependent,
 *    minimum $10; unpaid interest waived; principal falls at least $50 a
 *    month (government match); forgiven after 30 years.
 *  - IBR: 10% (new borrowers, 20 years) or 15% (25 years) of income above
 *    150% of the poverty guideline, capped at the standard 10-year payment.
 *  - IDR forgiveness is federally taxable again from 2026; PSLF is not.
 *
 *  - graduateStudentLoan: amount needed + 1.057% fee, in-school interest,
 *    amount above the federal annual limit.
 *  - parentPlusLoan: 4.228% fee, defer while in school or repay each loan
 *    right away, amount above the $20,000 cap.
 *  - privateStudentLoan: four in-school options (defer, interest-only,
 *    $25 flat, full payments).
 *  - federalStudentLoan: subsidized vs unsubsidized in-school interest.
 *  - studentLoanForgiveness: IBR/RAP month-by-month to forgiveness, PSLF,
 *    tax on forgiveness, vs the standard plan.
 *  - studentLoanConsolidation: weighted rate rounded up to 1/8% (8.25% cap),
 *    term by balance, vs keeping the loans.
 *  - incomeDrivenRepaymentLoan: monthly payment under each plan.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-student-federal-calculators.ts for the copy.
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

// Each year's loan is disbursed at the start of that year; unsubsidized
// interest is simple until repayment begins (end of school + grace).
function inSchoolInterest(perYear: number, annualRate: number, years: number, graceMonths: number): number {
  let accrued = 0;
  for (let y = 0; y < years; y++) accrued += (perYear * annualRate * ((years - y) * 12 + graceMonths)) / 12;
  return accrued;
}

function rapPercent(agi: number): number {
  if (agi <= 10000) return 0;
  return Math.min(10, Math.ceil((agi - 10000) / 10000));
}

function rapPayment(agi: number, dependents: number): number {
  return Math.max(10, (rapPercent(agi) / 100) * agi / 12 - 50 * dependents);
}

function ibrPayment(agi: number, poverty: number, percent: number, cap: number): number {
  return Math.min(cap, Math.max(0, ((agi - 1.5 * poverty) * percent) / 100 / 12));
}

function povertyFor(base: number, familySize: number): number {
  return base + 5500 * Math.max(0, familySize - 1);
}

// --- 1. Graduate Student Loan Calculator -----------------------------------------------
export const graduateStudentLoanCalculator: CustomCalculator = (values) => {
  const amountNeededPerYear = Math.max(0, safeNumber(values.amountNeededPerYear, 20000));
  const programYears = Math.max(1, Math.round(safeNumber(values.programYears, 2)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.94));
  const feePercent = Math.min(50, Math.max(0, safeNumber(values.feePercent, 1.057)));
  const graceMonths = Math.max(0, Math.round(safeNumber(values.graceMonths, 6)));
  const repaymentYears = Math.max(1, Math.round(safeNumber(values.repaymentYears, 10)));
  const annualLimit = Math.max(0, safeNumber(values.annualLimit, 20500));

  const loanPerYear = amountNeededPerYear / (1 - feePercent / 100);
  const total = loanPerYear * programYears;
  const accrued = inSchoolInterest(loanPerYear, annualRatePercent / 100, programYears, graceMonths);
  const balance = total + accrued;
  const n = repaymentYears * 12;
  const pay = payment(balance, annualRatePercent / 100 / 12, n);

  return {
    loanPerYear: round2(loanPerYear),
    totalBorrowed: round2(total),
    interestBeforeRepayment: round2(accrued),
    balanceAtRepayment: round2(balance),
    monthlyPayment: round2(pay),
    totalInterest: round2(pay * n - total),
    amountOverFederalLimit: round2(Math.max(0, loanPerYear - annualLimit) * programYears),
  };
};

// --- 2. Parent PLUS Loan Calculator ----------------------------------------------------
export const parentPlusLoanCalculator: CustomCalculator = (values) => {
  const amountNeededPerYear = Math.max(0, safeNumber(values.amountNeededPerYear, 15000));
  const years = Math.max(1, Math.round(safeNumber(values.years, 4)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.94));
  const feePercent = Math.min(50, Math.max(0, safeNumber(values.feePercent, 4.228)));
  const defer = Math.round(safeNumber(values.defer, 1)) === 1;
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const annualCap = Math.max(0, safeNumber(values.annualCap, 20000));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const loanPerYear = amountNeededPerYear / (1 - feePercent / 100);
  const total = loanPerYear * years;

  let peak: number;
  let interest: number;
  let paidDuringCollege = 0;
  if (defer) {
    const balance = total + inSchoolInterest(loanPerYear, annualRatePercent / 100, years, 6);
    peak = payment(balance, i, n);
    interest = peak * n - total;
  } else {
    // each year's loan starts its own repayment right after it is disbursed
    const p = payment(loanPerYear, i, n);
    peak = p * Math.min(years, termYears);
    interest = (p * n - loanPerYear) * years;
    for (let y = 0; y < years; y++) paidDuringCollege += p * Math.min(n, (years - y) * 12);
  }

  return {
    loanPerYear: round2(loanPerYear),
    totalBorrowed: round2(total),
    originationFees: round2(total - amountNeededPerYear * years),
    monthlyPayment: round2(peak),
    paidDuringCollege: round2(paidDuringCollege),
    totalInterest: round2(interest),
    totalRepaid: round2(total + interest),
    amountOverAnnualCap: round2(Math.max(0, loanPerYear - annualCap) * years),
  };
};

// --- 3. Private Student Loan Calculator ------------------------------------------------
export const privateStudentLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const schoolMonths = Math.max(0, Math.round(safeNumber(values.schoolMonths, 48)));
  const raw = Math.round(safeNumber(values.inSchoolOption, 1));
  const option = [1, 2, 3, 4].includes(raw) ? raw : 1;

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;

  if (option === 4) {
    const p = payment(loanAmount, i, n);
    return {
      paymentWhileInSchool: round2(p),
      totalPaidInSchool: round2(p * Math.min(n, schoolMonths)),
      balanceAtRepayment: 0,
      monthlyPayment: round2(p),
      totalInterest: round2(p * n - loanAmount),
      totalCost: round2(p * n),
    };
  }

  // simple interest in school; unpaid interest is capitalized when repayment starts
  let principal = loanAmount;
  let accrued = 0;
  let paid = 0;
  let schoolPayment = 0;
  for (let m = 0; m < schoolMonths; m++) {
    accrued += principal * i;
    const pay = option === 2 ? accrued : option === 3 ? Math.min(25, principal + accrued) : 0;
    if (m === 0) schoolPayment = pay;
    const toInterest = Math.min(pay, accrued);
    accrued -= toInterest;
    principal -= pay - toInterest;
    paid += pay;
  }
  const balance = principal + accrued;
  const p = payment(balance, i, n);

  return {
    paymentWhileInSchool: round2(schoolPayment),
    totalPaidInSchool: round2(paid),
    balanceAtRepayment: round2(balance),
    monthlyPayment: round2(p),
    totalInterest: round2(paid + p * n - loanAmount),
    totalCost: round2(paid + p * n),
  };
};

// --- 4. Federal Student Loan Calculator (subsidized vs unsubsidized) -------------------
export const federalStudentLoanCalculator: CustomCalculator = (values) => {
  const subsidizedPerYear = Math.max(0, safeNumber(values.subsidizedPerYear, 4250));
  const unsubsidizedPerYear = Math.max(0, safeNumber(values.unsubsidizedPerYear, 2500));
  const yearsInSchool = Math.max(1, Math.round(safeNumber(values.yearsInSchool, 4)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.39));
  const feePercent = Math.min(50, Math.max(0, safeNumber(values.feePercent, 1.057)));
  const graceMonths = Math.max(0, Math.round(safeNumber(values.graceMonths, 6)));
  const repaymentYears = Math.max(1, Math.round(safeNumber(values.repaymentYears, 10)));

  const total = (subsidizedPerYear + unsubsidizedPerYear) * yearsInSchool;
  const accrued = inSchoolInterest(unsubsidizedPerYear, annualRatePercent / 100, yearsInSchool, graceMonths);
  const balance = total + accrued;
  const n = repaymentYears * 12;
  const pay = payment(balance, annualRatePercent / 100 / 12, n);

  return {
    totalBorrowed: round2(total),
    netReceivedAfterFees: round2(total * (1 - feePercent / 100)),
    unsubsidizedInterestInSchool: round2(accrued),
    balanceAtRepayment: round2(balance),
    monthlyPayment: round2(pay),
    totalInterest: round2(pay * n - total),
    totalRepaid: round2(pay * n),
  };
};

// --- 5. Student Loan Forgiveness Calculator -------------------------------------------
export const studentLoanForgivenessCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 60000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.8));
  const agi = Math.max(0, safeNumber(values.agi, 55000));
  const incomeGrowthPercent = safeNumber(values.incomeGrowthPercent, 3);
  const familySize = Math.max(1, Math.round(safeNumber(values.familySize, 1)));
  const dependents = Math.max(0, Math.round(safeNumber(values.dependents, 0)));
  const povertyGuideline = Math.max(0, safeNumber(values.povertyGuideline, 15650));
  const raw = Math.round(safeNumber(values.plan, 1));
  const plan = [1, 2, 3].includes(raw) ? raw : 1;
  const pslf = Math.round(safeNumber(values.pslf, 1)) === 1;
  const yearsAlreadyPaid = Math.max(0, safeNumber(values.yearsAlreadyPaid, 0));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 22)));

  const i = annualRatePercent / 100 / 12;
  const standard = payment(balance, i, 120);
  const forgivenessYears = pslf ? 10 : plan === 1 ? 20 : plan === 2 ? 25 : 30;
  const months = Math.max(0, Math.round((forgivenessYears - yearsAlreadyPaid) * 12));
  const poverty = povertyFor(povertyGuideline, familySize);

  let principal = balance;
  let unpaidInterest = 0;
  let paid = 0;
  let first = 0;
  let m = 0;
  for (; m < months && principal + unpaidInterest > 0.005; m++) {
    const income = agi * Math.pow(1 + incomeGrowthPercent / 100, Math.floor(m / 12));
    const interest = principal * i;
    let pay = plan === 3 ? rapPayment(income, dependents) : ibrPayment(income, poverty, plan === 1 ? 10 : 15, standard);
    pay = Math.min(pay, principal + unpaidInterest + interest);
    if (m === 0) first = pay;
    paid += pay;
    if (plan === 3) {
      // RAP: unpaid interest is waived; government matches up to $50 of principal
      const toPrincipal = Math.max(0, pay - interest);
      const match = Math.max(0, Math.min(50, pay) - toPrincipal);
      principal = Math.max(0, principal - toPrincipal - match);
    } else {
      unpaidInterest += interest;
      const toInterest = Math.min(pay, unpaidInterest);
      unpaidInterest -= toInterest;
      principal = Math.max(0, principal - (pay - toInterest));
    }
  }
  const forgiven = m >= months ? principal + unpaidInterest : 0;
  const tax = pslf ? 0 : (forgiven * taxRatePercent) / 100;
  const standardTotal = standard * 120;

  return {
    firstMonthlyPayment: round2(first),
    monthsOfPayments: m,
    totalPaid: round2(paid),
    amountForgiven: round2(forgiven),
    taxOnForgiveness: round2(tax),
    totalCost: round2(paid + tax),
    standardPlanTotal: round2(standardTotal),
    savingsVsStandard: round2(standardTotal - paid - tax),
  };
};

// --- 6. Student Loan Consolidation Calculator -----------------------------------------
export const studentLoanConsolidationCalculator: CustomCalculator = (values) => {
  const defaults = [
    [12000, 5.5],
    [8000, 6.54],
    [15000, 7.05],
  ];
  const loans = [1, 2, 3].map((k) => ({
    b: Math.max(0, safeNumber(values[`balance${k}`], defaults[k - 1][0])),
    r: Math.max(0, safeNumber(values[`rate${k}Percent`], defaults[k - 1][1])),
  }));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 96)));
  const termChoice = Math.max(0, Math.round(safeNumber(values.termYears, 0)));

  const total = loans.reduce((s, l) => s + l.b, 0);
  const weighted = total > 0 ? loans.reduce((s, l) => s + l.b * l.r, 0) / total : 0;
  const consolidated = Math.min(8.25, Math.ceil(weighted * 8 - 1e-9) / 8);
  const autoTerm = total < 7500 ? 10 : total < 10000 ? 12 : total < 20000 ? 15 : total < 40000 ? 20 : total < 60000 ? 25 : 30;
  const term = termChoice > 0 ? termChoice : autoTerm;

  const current = loans.reduce((s, l) => s + payment(l.b, l.r / 100 / 12, remainingMonths), 0);
  const currentInterest = current * remainingMonths - total;
  const n = term * 12;
  const next = payment(total, consolidated / 100 / 12, n);
  const newInterest = next * n - total;

  return {
    totalBalance: round2(total),
    weightedAverageRate: round2(weighted),
    consolidatedRate: consolidated,
    consolidationTermYears: term,
    currentMonthlyPayment: round2(current),
    newMonthlyPayment: round2(next),
    currentRemainingInterest: round2(currentInterest),
    newTotalInterest: round2(newInterest),
    extraInterestFromConsolidating: round2(newInterest - currentInterest),
  };
};

// --- 7. Income-Driven Repayment Loan Calculator ---------------------------------------
export const incomeDrivenRepaymentLoanCalculator: CustomCalculator = (values) => {
  const agi = Math.max(0, safeNumber(values.agi, 55000));
  const familySize = Math.max(1, Math.round(safeNumber(values.familySize, 1)));
  const dependents = Math.max(0, Math.round(safeNumber(values.dependents, 0)));
  const povertyGuideline = Math.max(0, safeNumber(values.povertyGuideline, 15650));
  const balance = Math.max(0, safeNumber(values.balance, 40000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.8));
  const raw = Math.round(safeNumber(values.plan, 3));
  const plan = [1, 2, 3].includes(raw) ? raw : 3;

  const standard = payment(balance, annualRatePercent / 100 / 12, 120);
  const poverty = povertyFor(povertyGuideline, familySize);
  const ibrNew = ibrPayment(agi, poverty, 10, standard);
  const ibrOld = ibrPayment(agi, poverty, 15, standard);
  const rap = rapPayment(agi, dependents);
  const chosen = plan === 1 ? ibrNew : plan === 2 ? ibrOld : rap;

  return {
    discretionaryIncome: round2(Math.max(0, agi - 1.5 * poverty)),
    standardPayment: round2(standard),
    ibrNewBorrowerPayment: round2(ibrNew),
    ibrOlderBorrowerPayment: round2(ibrOld),
    rapPayment: round2(rap),
    monthlyPayment: round2(chosen),
    savingsVsStandard: round2(standard - chosen),
    monthlyInterest: round2((balance * annualRatePercent) / 100 / 12),
  };
};

export const loanStudentFederalCustomCalculators: Record<string, CustomCalculator> = {
  "graduate-student-loan-calculator": graduateStudentLoanCalculator,
  "parent-plus-loan-calculator": parentPlusLoanCalculator,
  "private-student-loan-calculator": privateStudentLoanCalculator,
  "federal-student-loan-calculator": federalStudentLoanCalculator,
  "student-loan-forgiveness-calculator": studentLoanForgivenessCalculator,
  "student-loan-consolidation-calculator": studentLoanConsolidationCalculator,
  "income-driven-repayment-loan-calculator": incomeDrivenRepaymentLoanCalculator,
};
