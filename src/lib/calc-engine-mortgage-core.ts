/**
 * Batch: "Mortgage Calculators" — sub-batch A: Core Basics (11 tools).
 * Part of the Mortgage_Topical_Map_Large_Tool_List.xlsx build-out (36
 * tools total, split into 3 sub-batches — see calc-engine-mortgage-payment-
 * strategies.ts and calc-engine-mortgage-refinance-programs.ts for the
 * other two). Filed under the site's existing (previously empty)
 * "Mortgage Calculators" category (mortgage-calculators).
 *
 * 4 tools from the source file were skipped as duplicates of tools
 * already built in the "Real Estate Calculators" batch (Mortgage Payment,
 * Mortgage Affordability, Down Payment, and Closing Costs/Closing Cost) —
 * confirmed with the user before starting this batch.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention — even though calc-engine-finance-
 * real-estate.ts has near-identical helper functions, they are
 * re-implemented locally here rather than shared, matching every prior
 * batch's pattern.
 *
 * See prisma/create-mortgage-core-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function annuityPayment(principal: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

// Principal a given fixed payment can support over n payments at monthlyRate
// (the algebraic inverse of annuityPayment).
function principalFromPayment(payment: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return payment * numPayments;
  return (payment * (1 - Math.pow(1 + monthlyRate, -numPayments))) / monthlyRate;
}

// Remaining balance on a fixed-rate amortizing loan after numPaymentsMade
// of numPaymentsTotal.
function remainingBalance(principal: number, monthlyRate: number, numPaymentsTotal: number, numPaymentsMade: number): number {
  if (monthlyRate === 0) return principal * (1 - numPaymentsMade / numPaymentsTotal);
  const fTotal = Math.pow(1 + monthlyRate, numPaymentsTotal);
  const fPaid = Math.pow(1 + monthlyRate, numPaymentsMade);
  return (principal * (fTotal - fPaid)) / (fTotal - 1);
}

// --- 1. Mortgage Calculator (basic principal & interest only) ---------------
// Deliberately scoped narrower than the existing Mortgage Payment
// Calculator (Real Estate Calculators), which includes taxes/insurance/HOA
// in a full PITI breakdown — this is the bare "what's my P&I payment" tool.
export const mortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentAmount = Math.max(0, safeNumber(values.downPaymentAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));

  const loanAmount = Math.max(0, homePrice - downPaymentAmount);
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = totalPaid - loanAmount;

  return {
    loanAmount: round2(loanAmount),
    monthlyPayment: round2(monthlyPayment),
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
  };
};

// --- 2. Mortgage Interest Calculator (interest-focused breakdown) ------------
export const mortgageInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const firstMonthInterest = loanAmount * monthlyRate;
  const firstMonthPrincipal = monthlyPayment - firstMonthInterest;
  const totalInterestPaid = monthlyPayment * numPayments - loanAmount;

  return {
    monthlyPayment: round2(monthlyPayment),
    firstMonthInterest: round2(firstMonthInterest),
    firstMonthPrincipal: round2(firstMonthPrincipal),
    totalInterestPaid: round2(totalInterestPaid),
  };
};

// --- 3. Home Loan Calculator (loan amount directly + origination fee) -------
// Scoped around the loan amount itself (rather than home price minus down
// payment) plus an origination fee/points rolled into total cost — a
// distinct framing from the Mortgage Calculator above.
export const homeLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const originationFeePercent = Math.max(0, safeNumber(values.originationFeePercent, 1));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const originationFee = loanAmount * (originationFeePercent / 100);
  const totalInterest = monthlyPayment * numPayments - loanAmount;
  const totalCostIncludingFee = loanAmount + totalInterest + originationFee;

  return {
    monthlyPayment: round2(monthlyPayment),
    originationFee: round2(originationFee),
    totalInterest: round2(totalInterest),
    totalCostIncludingFee: round2(totalCostIncludingFee),
  };
};

// --- 4. Mortgage Amortization Calculator (one year's principal/interest split)
export const mortgageAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const yearNumber = Math.max(1, Math.round(safeNumber(values.yearNumber, 1)));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);

  const startMonth = (yearNumber - 1) * 12;
  const endMonth = Math.min(startMonth + 12, numPayments);
  let balance = loanAmount;
  let principalPaidThisYear = 0;
  let interestPaidThisYear = 0;

  for (let m = 1; m <= numPayments; m++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;
    if (m > startMonth && m <= endMonth) {
      principalPaidThisYear += principal;
      interestPaidThisYear += interest;
    }
    if (m >= endMonth) break;
  }

  return {
    monthlyPayment: round2(monthlyPayment),
    principalPaidThisYear: round2(principalPaidThisYear),
    interestPaidThisYear: round2(interestPaidThisYear),
    remainingBalanceEnd: round2(Math.max(0, balance)),
  };
};

// --- 5. Mortgage APR Calculator (note rate + points/fees -> effective APR) --
// Solves for the rate that equates the actual monthly payment (based on the
// note rate over the full loan amount) with an annuity over the smaller net
// proceeds (loan amount minus points and fees) — the standard APR
// methodology used on U.S. Truth-in-Lending disclosures. No closed form, so
// this uses bisection search.
export const mortgageAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0.01, safeNumber(values.loanAmount));
  const noteRatePercent = Math.max(0, safeNumber(values.noteRatePercent, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 1));
  const otherFees = Math.max(0, safeNumber(values.otherFees, 0));

  const noteMonthlyRate = noteRatePercent / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, noteMonthlyRate, numPayments);
  const netProceeds = Math.max(0.01, loanAmount - (pointsPercent / 100) * loanAmount - otherFees);

  let lo = 0.0000001;
  let hi = noteMonthlyRate * 5 + 0.01;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const impliedPrincipal = principalFromPayment(monthlyPayment, mid, numPayments);
    if (impliedPrincipal > netProceeds) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const aprMonthlyRate = (lo + hi) / 2;
  const aprPercent = aprMonthlyRate * 12 * 100;

  return {
    monthlyPayment: round2(monthlyPayment),
    netProceeds: round2(netProceeds),
    aprPercent: Math.round(aprPercent * 10000) / 10000,
  };
};

// --- 6. Mortgage Points Calculator (buy points -> new payment & break-even) -
export const mortgagePointsCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const rateWithoutPoints = Math.max(0, safeNumber(values.rateWithoutPoints, 7));
  const rateWithPoints = Math.max(0, safeNumber(values.rateWithPoints, 6.5));
  const pointsPurchased = Math.max(0, safeNumber(values.pointsPurchased, 1));

  const numPayments = loanTermYears * 12;
  const pointsCost = loanAmount * (pointsPurchased / 100);
  const paymentWithoutPoints = annuityPayment(loanAmount, rateWithoutPoints / 100 / 12, numPayments);
  const paymentWithPoints = annuityPayment(loanAmount, rateWithPoints / 100 / 12, numPayments);
  const monthlySavings = paymentWithoutPoints - paymentWithPoints;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(pointsCost / monthlySavings) : 0;
  const totalSavingsFullTerm = monthlySavings * numPayments - pointsCost;

  return {
    pointsCost: round2(pointsCost),
    paymentWithoutPoints: round2(paymentWithoutPoints),
    paymentWithPoints: round2(paymentWithPoints),
    monthlySavings: round2(monthlySavings),
    breakEvenMonths,
    totalSavingsFullTerm: round2(totalSavingsFullTerm),
  };
};

// --- 7. Mortgage Discount Points Break-Even Calculator (horizon-specific) ---
// Distinct from the Mortgage Points Calculator above: rather than a generic
// break-even month count, this compares TOTAL cost with vs. without points
// over the borrower's own planned years-in-home horizon — answering "is
// this worth it for how long I'll actually keep this loan," not just "how
// many months until points pay for themselves in the abstract."
export const mortgageDiscountPointsBreakEvenCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const rateWithoutPoints = Math.max(0, safeNumber(values.rateWithoutPoints, 7));
  const rateWithPoints = Math.max(0, safeNumber(values.rateWithPoints, 6.5));
  const pointsCostDollar = Math.max(0, safeNumber(values.pointsCostDollar, 0));
  const plannedYearsInHome = Math.max(0.5, safeNumber(values.plannedYearsInHome, 5));

  const numPayments = loanTermYears * 12;
  const paymentWithoutPoints = annuityPayment(loanAmount, rateWithoutPoints / 100 / 12, numPayments);
  const paymentWithPoints = annuityPayment(loanAmount, rateWithPoints / 100 / 12, numPayments);
  const monthsHorizon = Math.round(plannedYearsInHome * 12);

  const totalCostWithoutPoints = paymentWithoutPoints * monthsHorizon;
  const totalCostWithPoints = paymentWithPoints * monthsHorizon + pointsCostDollar;
  const netSavingsOverHorizon = totalCostWithoutPoints - totalCostWithPoints;
  const monthlySavings = paymentWithoutPoints - paymentWithPoints;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(pointsCostDollar / monthlySavings) : 0;

  return {
    netSavingsOverHorizon: round2(netSavingsOverHorizon),
    breakEvenMonths,
    totalCostWithoutPoints: round2(totalCostWithoutPoints),
    totalCostWithPoints: round2(totalCostWithPoints),
  };
};

// --- 8. Private Mortgage Insurance (PMI) Calculator --------------------------
export const privateMortgageInsurancePmiCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0.01, safeNumber(values.homePrice));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const pmiRatePercent = Math.max(0, safeNumber(values.pmiRatePercent, 0.75));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));

  const ltvPercent = (loanAmount / homePrice) * 100;
  const monthlyPmi = (loanAmount * (pmiRatePercent / 100)) / 12;
  const annualPmi = loanAmount * (pmiRatePercent / 100);

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  let monthsUntilPmiRemoval = 0;
  if (loanAmount > 0) {
    for (let m = 1; m <= numPayments; m++) {
      const bal = remainingBalance(loanAmount, monthlyRate, numPayments, m);
      if (bal / homePrice <= 0.78) {
        monthsUntilPmiRemoval = m;
        break;
      }
      monthsUntilPmiRemoval = m;
    }
  }

  return {
    ltvPercent: round2(ltvPercent),
    monthlyPmi: round2(monthlyPmi),
    annualPmi: round2(annualPmi),
    monthsUntilPmiRemoval,
  };
};

// --- 9. Loan-to-Value (LTV) Calculator ---------------------------------------
export const loanToValueLtvCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const appraisedValue = Math.max(0.01, safeNumber(values.appraisedValue));

  const ltvPercent = (loanAmount / appraisedValue) * 100;
  const impliedDownPaymentPercent = 100 - ltvPercent;
  const pmiLikelyRequired = ltvPercent > 80 ? 1 : 0;

  return {
    ltvPercent: round2(ltvPercent),
    impliedDownPaymentPercent: round2(impliedDownPaymentPercent),
    pmiLikelyRequired,
  };
};

// --- 10. Debt-to-Income (DTI) Mortgage Calculator ----------------------------
export const debtToIncomeDtiMortgageCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0.01, safeNumber(values.grossMonthlyIncome));
  const monthlyHousingPayment = Math.max(0, safeNumber(values.monthlyHousingPayment));
  const otherMonthlyDebtPayments = Math.max(0, safeNumber(values.otherMonthlyDebtPayments));
  const maxBackEndDtiPercent = Math.max(1, safeNumber(values.maxBackEndDtiPercent, 43));

  const frontEndDtiPercent = (monthlyHousingPayment / grossMonthlyIncome) * 100;
  const backEndDtiPercent = ((monthlyHousingPayment + otherMonthlyDebtPayments) / grossMonthlyIncome) * 100;
  const maxTotalMonthlyDebt = grossMonthlyIncome * (maxBackEndDtiPercent / 100);
  const maxAdditionalDebtCapacity = maxTotalMonthlyDebt - (monthlyHousingPayment + otherMonthlyDebtPayments);

  return {
    frontEndDtiPercent: round2(frontEndDtiPercent),
    backEndDtiPercent: round2(backEndDtiPercent),
    maxAdditionalDebtCapacity: round2(maxAdditionalDebtCapacity),
  };
};

// --- 11. Mortgage Payoff Calculator (single fixed-payment simulation) -------
export const mortgagePayoffCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const monthlyPayment = Math.max(0.01, safeNumber(values.monthlyPayment));

  const monthlyRate = annualInterestRate / 100 / 12;
  let balance = currentBalance;
  let months = 0;
  let totalInterestPaid = 0;
  const CAP = 600;

  while (balance > 0 && months < CAP) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    if (principal <= 0) {
      months = CAP;
      break;
    }
    balance -= principal;
    totalInterestPaid += interest;
    months += 1;
  }

  return {
    monthsToPayoff: months,
    yearsToPayoff: round2(months / 12),
    totalInterestPaid: round2(totalInterestPaid),
  };
};

export const mortgageCoreCustomCalculators: Record<string, CustomCalculator> = {
  "mortgage-calculator": mortgageCalculator,
  "mortgage-interest-calculator": mortgageInterestCalculator,
  "home-loan-calculator": homeLoanCalculator,
  "mortgage-amortization-calculator": mortgageAmortizationCalculator,
  "mortgage-apr-calculator": mortgageAprCalculator,
  "mortgage-points-calculator": mortgagePointsCalculator,
  "mortgage-discount-points-break-even-calculator": mortgageDiscountPointsBreakEvenCalculator,
  "private-mortgage-insurance-pmi-calculator": privateMortgageInsurancePmiCalculator,
  "loan-to-value-ltv-calculator": loanToValueLtvCalculator,
  "debt-to-income-dti-mortgage-calculator": debtToIncomeDtiMortgageCalculator,
  "mortgage-payoff-calculator": mortgagePayoffCalculator,
};
