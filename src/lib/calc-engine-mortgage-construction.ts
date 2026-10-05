/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 6 of 8 —
 * Construction Loans (13 tools), filed under Finance Calculators > Mortgage
 * Calculators (building a home is a mortgage-type decision). "Construction
 * Loan Consolidation Calculator" from the same list was dropped as too
 * vague. See calc-engine-loan-life-events.ts for the full batch context.
 *
 * A construction loan is drawn in stages while the house is built (usually
 * interest-only on what's been drawn), then either converts to a permanent
 * mortgage (construction-to-permanent, "one-time close") or must be paid off
 * with a separate mortgage ("two-time close"). Each tool models one part:
 *  - constructionLoan: land + build + soft costs + contingency, loan sized by
 *    loan-to-cost AND loan-to-value (lower wins), cash needed after land
 *    equity, interest during the build.
 *  - payment: interest-only payments that rise as money is drawn, then the
 *    permanent P&I payment.
 *  - payoff: paying off a construction-only loan at completion from a new
 *    mortgage plus the sale of your current home.
 *  - refinance: one-time close vs two-time close (cheaper permanent rate
 *    shopped later, but a second set of closing costs).
 *  - apr: APR including points and fees with an interest-only build phase.
 *  - affordability: income -> max mortgage -> max total project -> max
 *    build budget after land.
 *  - eligibility: loan-to-cost, DTI, score and cash reserves.
 *  - interest: a typical 5-stage draw schedule, interest reserve, and what
 *    staged draws save vs drawing everything at closing.
 *  - early payoff: what finishing (and paying off) early saves — or a delay
 *    costs — in interest, rent and rate-lock extension fees.
 *  - comparison: build new vs buy an existing home.
 *  - amortization: interest-only phase then the permanent schedule.
 *  - prequalification: a prequalified amount vs the LTC limit and the cash
 *    still needed after land equity.
 *  - total cost: everything it takes to get to move-in, and cost per sq ft.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-construction-calculators.ts for the copy.
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

function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (k <= 0) return principal;
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// Equal draws at the end of each month of the build: month k carries k/m of
// the loan, so total interest = loan x i x (m - 1) / 2.
function linearDrawInterest(loan: number, i: number, months: number): number {
  return (loan * i * (months - 1)) / 2;
}

// --- 1. Construction Loan Calculator -----------------------------------------
export const constructionLoanCalculator: CustomCalculator = (values) => {
  const landValue = Math.max(0, safeNumber(values.landValue, 80000));
  const landOwned = safeNumber(values.landOwned, 0) === 1;
  const buildCost = Math.max(0, safeNumber(values.buildCost, 350000));
  const softCosts = Math.max(0, safeNumber(values.softCosts, 25000));
  const contingencyPercent = Math.max(0, safeNumber(values.contingencyPercent, 10));
  const maxLtcPercent = Math.max(0, safeNumber(values.maxLtcPercent, 80));
  const asCompletedValue = Math.max(0, safeNumber(values.asCompletedValue, 520000));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 80));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const buildMonths = Math.max(1, Math.round(safeNumber(values.buildMonths, 12)));

  const total = landValue + buildCost + softCosts + (buildCost * contingencyPercent) / 100;
  const byLtc = (total * maxLtcPercent) / 100;
  const byLtv = (asCompletedValue * maxLtvPercent) / 100;
  const loan = asCompletedValue > 0 ? Math.min(byLtc, byLtv) : byLtc;
  const equity = total - loan;

  return {
    totalProjectCost: round2(total),
    loanAmount: round2(loan),
    equityRequired: round2(equity),
    cashNeeded: round2(Math.max(0, equity - (landOwned ? landValue : 0))),
    interestDuringBuild: round2(linearDrawInterest(loan, annualRatePercent / 100 / 12, buildMonths)),
  };
};

// --- 2. Construction Loan Payment Calculator ---------------------------------
export const constructionLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const buildMonths = Math.max(1, Math.round(safeNumber(values.buildMonths, 12)));
  const drawnAtClosingPercent = Math.min(100, Math.max(0, safeNumber(values.drawnAtClosingPercent, 20)));
  const permanentRatePercent = Math.max(0, safeNumber(values.permanentRatePercent, 7));
  const permanentYears = Math.max(1, Math.round(safeNumber(values.permanentYears, 30)));

  const i = annualRatePercent / 100 / 12;
  const closing = (loanAmount * drawnAtClosingPercent) / 100;
  const rest = loanAmount - closing;
  // A draw at the start of each build month; interest-only on what's out.
  let total = 0;
  for (let k = 1; k <= buildMonths; k++) total += (closing + (rest * k) / buildMonths) * i;

  return {
    firstMonthPayment: round2((closing + rest / buildMonths) * i),
    lastMonthPayment: round2(loanAmount * i),
    totalInterestDuringBuild: round2(total),
    permanentPayment: round2(payment(loanAmount, permanentRatePercent / 100 / 12, permanentYears * 12)),
  };
};

// --- 3. Construction Loan Payoff Calculator (construction-only loan) ---------
export const constructionLoanPayoffCalculator: CustomCalculator = (values) => {
  const constructionBalance = Math.max(0, safeNumber(values.constructionBalance, 400000));
  const unpaidInterest = Math.max(0, safeNumber(values.unpaidInterest, 0));
  const homeSaleProceeds = Math.max(0, safeNumber(values.homeSaleProceeds, 120000));
  const appraisedValue = Math.max(0, safeNumber(values.appraisedValue, 520000));
  const permanentMaxLtvPercent = Math.max(0, safeNumber(values.permanentMaxLtvPercent, 80));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 6000));

  const payoff = constructionBalance + unpaidInterest;
  const maxMortgage = (appraisedValue * permanentMaxLtvPercent) / 100;
  const needed = payoff + closingCosts;
  const mortgageUsed = Math.min(maxMortgage, Math.max(0, needed - homeSaleProceeds));

  return {
    payoffAmount: round2(payoff),
    maxPermanentMortgage: round2(maxMortgage),
    mortgageNeeded: round2(Math.max(0, needed - homeSaleProceeds)),
    surplusOrShortfall: round2(homeSaleProceeds + mortgageUsed - needed),
  };
};

// --- 4. Construction Loan Refinance Calculator (one-time vs two-time) --------
export const constructionLoanRefinanceCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const oneTimeRatePercent = Math.max(0, safeNumber(values.oneTimeRatePercent, 7.25));
  const twoTimeRatePercent = Math.max(0, safeNumber(values.twoTimeRatePercent, 6.75));
  const secondClosingCosts = Math.max(0, safeNumber(values.secondClosingCosts, 6000));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const yearsKept = Math.max(1, safeNumber(values.yearsKept, 10));

  const n = termYears * 12;
  const one = payment(loanAmount, oneTimeRatePercent / 100 / 12, n);
  const two = payment(loanAmount, twoTimeRatePercent / 100 / 12, n);
  const saving = one - two;

  return {
    oneTimeClosePayment: round2(one),
    twoTimeClosePayment: round2(two),
    monthlySavingTwoTime: round2(saving),
    breakEvenMonths: saving > 0 ? Math.ceil(secondClosingCosts / saving) : 0,
    netSavingTwoTime: round2(saving * Math.min(n, Math.round(yearsKept * 12)) - secondClosingCosts),
  };
};

// --- 5. Construction Loan APR Calculator -------------------------------------
export const constructionLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const buildMonths = Math.max(0, Math.round(safeNumber(values.buildMonths, 12)));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const pointsPercent = Math.max(0, safeNumber(values.pointsPercent, 1));
  const fees = Math.max(0, safeNumber(values.fees, 4000));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const io = loanAmount * i;
  const pi = payment(loanAmount, i, n);
  const upfront = (loanAmount * pointsPercent) / 100 + fees;
  const received = loanAmount - upfront;
  // PV at rate r of: buildMonths interest-only payments, then n P&I payments.
  const pv = (r: number) => {
    const ioPart = presentValue(io, r, buildMonths);
    const piPart = presentValue(pi, r, n) / Math.pow(1 + r, buildMonths);
    return ioPart + piPart;
  };
  let lo = 1e-9;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > received) lo = mid;
    else hi = mid;
  }
  const apr = upfront > 0 ? ((lo + hi) / 2) * 12 * 100 : annualRatePercent;

  return {
    aprPercent: round2(apr),
    upfrontCosts: round2(upfront),
    interestOnlyPayment: round2(io),
    permanentPayment: round2(pi),
  };
};

// --- 6. Construction Loan Affordability Calculator ---------------------------
export const constructionLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 12000));
  const otherDebts = Math.max(0, safeNumber(values.otherDebts, 800));
  const frontRatioPercent = Math.max(0, safeNumber(values.frontRatioPercent, 28));
  const backRatioPercent = Math.max(0, safeNumber(values.backRatioPercent, 36));
  const monthlyTaxInsurance = Math.max(0, safeNumber(values.monthlyTaxInsurance, 700));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 20)));
  const landCost = Math.max(0, safeNumber(values.landCost, 80000));

  const maxHousing = Math.max(
    0,
    Math.min((grossMonthlyIncome * frontRatioPercent) / 100, (grossMonthlyIncome * backRatioPercent) / 100 - otherDebts)
  );
  const maxPi = Math.max(0, maxHousing - monthlyTaxInsurance);
  const maxLoan = presentValue(maxPi, annualRatePercent / 100 / 12, termYears * 12);
  const maxProject = maxLoan / (1 - downPaymentPercent / 100);

  return {
    maxHousingPayment: round2(maxHousing),
    maxLoanAmount: round2(maxLoan),
    maxTotalProject: round2(maxProject),
    maxBuildBudget: round2(Math.max(0, maxProject - landCost)),
    downPaymentNeeded: round2(maxProject - maxLoan),
  };
};

// --- 7. Construction Loan Eligibility Calculator -----------------------------
export const constructionLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 700)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 680)));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 12000));
  const otherDebts = Math.max(0, safeNumber(values.otherDebts, 800));
  const projectCost = Math.max(1, safeNumber(values.projectCost, 480000));
  const equityIn = Math.max(0, safeNumber(values.equityIn, 100000));
  const maxLtcPercent = Math.max(0, safeNumber(values.maxLtcPercent, 80));
  const monthlyTaxInsurance = Math.max(0, safeNumber(values.monthlyTaxInsurance, 700));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 43));
  const liquidAssets = Math.max(0, safeNumber(values.liquidAssets, 40000));
  const reserveMonths = Math.max(0, safeNumber(values.reserveMonths, 6));

  const loan = Math.max(0, projectCost - equityIn);
  const ltc = (loan / projectCost) * 100;
  const housing = payment(loan, annualRatePercent / 100 / 12, termYears * 12) + monthlyTaxInsurance;
  const dti = ((housing + otherDebts) / grossMonthlyIncome) * 100;

  return {
    loanAmount: round2(loan),
    ltcPercent: round2(ltc),
    ltcHeadroomPercent: round2(maxLtcPercent - ltc),
    housingPayment: round2(housing),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    scoreMargin: Math.round(creditScore - lenderMinScore),
    reserveMargin: round2(liquidAssets - housing * reserveMonths),
  };
};

// --- 8. Construction Loan Interest Calculator (5-stage draws) ----------------
export const constructionLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const buildMonths = Math.max(1, Math.round(safeNumber(values.buildMonths, 10)));

  // Typical stages: foundation 15%, framing 20%, rough-ins 25%,
  // drywall/finishes 25%, final 15% — released at the start of evenly
  // spaced points in the build.
  const stages = [0.15, 0.2, 0.25, 0.25, 0.15];
  const i = annualRatePercent / 100 / 12;
  let total = 0;
  let sumBalance = 0;
  for (let m = 0; m < buildMonths; m++) {
    let bal = 0;
    stages.forEach((share, s) => {
      if (m >= Math.floor((s * buildMonths) / stages.length)) bal += loanAmount * share;
    });
    total += bal * i;
    sumBalance += bal;
  }
  const allAtClosing = loanAmount * i * buildMonths;

  return {
    interestDuringBuild: round2(total),
    averageBalance: round2(sumBalance / buildMonths),
    peakMonthlyInterest: round2(loanAmount * i),
    interestIfAllDrawnAtClosing: round2(allAtClosing),
    savedByStagedDraws: round2(allAtClosing - total),
  };
};

// --- 9. Construction Loan Early Payoff Calculator (finish early / late) ------
export const constructionLoanEarlyPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2200));
  const lockExtensionPercent = Math.max(0, safeNumber(values.lockExtensionPercent, 0.25));
  const months = Math.max(0, safeNumber(values.months, 2));

  const interest = (loanAmount * annualRatePercent) / 100 / 12;
  const lockFee = (loanAmount * lockExtensionPercent) / 100;

  return {
    interestPerMonthFullyDrawn: round2(interest),
    carryingCostPerMonth: round2(interest + monthlyRent),
    savedByFinishingEarly: round2((interest + monthlyRent) * months),
    costOfSameDelay: round2((interest + monthlyRent + lockFee) * months),
  };
};

// --- 10. Construction Loan Comparison Calculator (build vs buy) --------------
export const constructionLoanComparisonCalculator: CustomCalculator = (values) => {
  const landCost = Math.max(0, safeNumber(values.landCost, 80000));
  const buildCost = Math.max(0, safeNumber(values.buildCost, 380000));
  const softCosts = Math.max(0, safeNumber(values.softCosts, 25000));
  const constructionInterest = Math.max(0, safeNumber(values.constructionInterest, 15000));
  const rentDuringBuild = Math.max(0, safeNumber(values.rentDuringBuild, 26400));
  const newHomeValue = Math.max(0, safeNumber(values.newHomeValue, 540000));
  const existingPrice = Math.max(0, safeNumber(values.existingPrice, 500000));
  const repairsAndUpdates = Math.max(0, safeNumber(values.repairsAndUpdates, 20000));

  const build = landCost + buildCost + softCosts + constructionInterest + rentDuringBuild;
  const buy = existingPrice + repairsAndUpdates;

  return {
    buildTotalCost: round2(build),
    buildEquityAtMoveIn: round2(newHomeValue - build),
    buyTotalCost: round2(buy),
    buildCostsMore: round2(build - buy),
  };
};

// --- 11. Construction Loan Amortization Calculator ---------------------------
export const constructionLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const interestOnlyMonths = Math.max(0, Math.round(safeNumber(values.interestOnlyMonths, 12)));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pi = payment(loanAmount, i, n);
  const b5 = balanceAfter(loanAmount, i, pi, Math.min(n, 60));

  return {
    interestOnlyPayment: round2(loanAmount * i),
    interestOnlyPhaseTotal: round2(loanAmount * i * interestOnlyMonths),
    permanentPayment: round2(pi),
    balanceAfter5Years: round2(b5),
    balanceAfter10Years: round2(balanceAfter(loanAmount, i, pi, Math.min(n, 120))),
    interestFirst5Years: round2(pi * Math.min(n, 60) - (loanAmount - b5)),
  };
};

// --- 12. Construction Loan Prequalification Calculator -----------------------
export const constructionLoanPrequalificationCalculator: CustomCalculator = (values) => {
  const prequalifiedAmount = Math.max(0, safeNumber(values.prequalifiedAmount, 380000));
  const maxLtcPercent = Math.max(0, safeNumber(values.maxLtcPercent, 80));
  const landValueOwned = Math.max(0, safeNumber(values.landValueOwned, 80000));
  const buildBudget = Math.max(0, safeNumber(values.buildBudget, 380000));
  const softCosts = Math.max(0, safeNumber(values.softCosts, 20000));
  const cashAvailable = Math.max(0, safeNumber(values.cashAvailable, 30000));

  const total = landValueOwned + buildBudget + softCosts;
  const byLtc = (total * maxLtcPercent) / 100;
  const loan = Math.min(prequalifiedAmount, byLtc);
  const cashNeeded = Math.max(0, total - loan - landValueOwned);

  return {
    totalProjectCost: round2(total),
    maxByLoanToCost: round2(byLtc),
    loanAvailable: round2(loan),
    cashNeeded: round2(cashNeeded),
    fundingGap: round2(Math.max(0, cashNeeded - cashAvailable)),
  };
};

// --- 13. Construction Loan Total Cost Calculator -----------------------------
export const constructionLoanTotalCostCalculator: CustomCalculator = (values) => {
  const landCost = Math.max(0, safeNumber(values.landCost, 80000));
  const buildCost = Math.max(0, safeNumber(values.buildCost, 380000));
  const softCosts = Math.max(0, safeNumber(values.softCosts, 25000));
  const contingencyUsed = Math.max(0, safeNumber(values.contingencyUsed, 15000));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 8000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const buildMonths = Math.max(1, Math.round(safeNumber(values.buildMonths, 12)));
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2200));
  const squareFeet = Math.max(1, safeNumber(values.squareFeet, 2400));

  const interest = linearDrawInterest(loanAmount, annualRatePercent / 100 / 12, buildMonths);
  const rent = monthlyRent * buildMonths;
  const total = landCost + buildCost + softCosts + contingencyUsed + closingCosts + interest + rent;

  return {
    interestDuringBuild: round2(interest),
    rentWhileBuilding: round2(rent),
    totalCostToMoveIn: round2(total),
    costPerSquareFoot: round2(total / squareFeet),
    buildCostPerSquareFoot: round2(buildCost / squareFeet),
  };
};

export const mortgageConstructionCustomCalculators: Record<string, CustomCalculator> = {
  "construction-loan-calculator": constructionLoanCalculator,
  "construction-loan-payment-calculator": constructionLoanPaymentCalculator,
  "construction-loan-payoff-calculator": constructionLoanPayoffCalculator,
  "construction-loan-refinance-calculator": constructionLoanRefinanceCalculator,
  "construction-loan-apr-calculator": constructionLoanAprCalculator,
  "construction-loan-affordability-calculator": constructionLoanAffordabilityCalculator,
  "construction-loan-eligibility-calculator": constructionLoanEligibilityCalculator,
  "construction-loan-interest-calculator": constructionLoanInterestCalculator,
  "construction-loan-early-payoff-calculator": constructionLoanEarlyPayoffCalculator,
  "construction-loan-comparison-calculator": constructionLoanComparisonCalculator,
  "construction-loan-amortization-calculator": constructionLoanAmortizationCalculator,
  "construction-loan-prequalification-calculator": constructionLoanPrequalificationCalculator,
  "construction-loan-total-cost-calculator": constructionLoanTotalCostCalculator,
};
