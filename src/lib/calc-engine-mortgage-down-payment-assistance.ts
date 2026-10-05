/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 9 of 10 —
 * Down Payment Assistance Loans (7 tools), filed under Mortgage
 * Calculators. See calc-engine-loan-startup-business.ts for the full batch
 * context. Distinct from the existing down-payment-calculator and
 * home-down-payment-* tools, which plan the down payment itself; these
 * model the assistance loan (a second mortgage from a state/local housing
 * agency or lender) that covers it.
 *
 *  - downPaymentAssistanceLoan: down payment + closing costs -> how much
 *    the DPA covers and the cash you still need.
 *  - downPaymentAssistanceLoanPayment: first mortgage P&I plus the DPA's
 *    payment — none if deferred or forgivable, monthly if amortizing.
 *  - downPaymentAssistanceLoanPayoff: what's owed on a forgivable DPA if
 *    you sell or refinance early (forgiveness earned evenly over N years).
 *  - downPaymentAssistanceLoanInterest: an amortizing DPA's interest plus
 *    the higher first-mortgage rate DPA programs often carry.
 *  - downPaymentAssistanceLoanAffordability: with the down payment covered,
 *    the DTI limit sets the home price.
 *  - downPaymentAssistanceLoanComparison: using DPA now vs saving the down
 *    payment yourself while prices rise.
 *  - downPaymentAssistanceLoanEligibility: income vs the area median income
 *    limit, first-time buyer, score, purchase price limit.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-down-payment-assistance-calculators.ts for the copy.
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
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// --- 1. Down Payment Assistance Loan Calculator ---------------------------------------
export const downPaymentAssistanceLoanCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 350000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 3.5)));
  const closingCostsPercent = Math.max(0, safeNumber(values.closingCostsPercent, 3));
  const dpaPercent = Math.max(0, safeNumber(values.dpaPercent, 5));

  const down = (homePrice * downPaymentPercent) / 100;
  const closing = (homePrice * closingCostsPercent) / 100;
  const need = down + closing;
  const dpa = Math.min(need, (homePrice * dpaPercent) / 100);

  return {
    downPayment: round2(down),
    closingCosts: round2(closing),
    assistanceAmount: round2(dpa),
    yourCashNeeded: round2(need - dpa),
    firstMortgage: round2(homePrice - down),
  };
};

// --- 2. Down Payment Assistance Loan Payment Calculator --------------------------------
export const downPaymentAssistanceLoanPaymentCalculator: CustomCalculator = (values) => {
  const firstMortgage = Math.max(0, safeNumber(values.firstMortgage, 337750));
  const firstRatePercent = Math.max(0, safeNumber(values.firstRatePercent, 6.5));
  const dpaAmount = Math.max(0, safeNumber(values.dpaAmount, 15000));
  const raw = Math.round(safeNumber(values.dpaType, 3));
  const dpaType = [1, 2, 3].includes(raw) ? raw : 3;
  const dpaRatePercent = Math.max(0, safeNumber(values.dpaRatePercent, 7));
  const dpaTermYears = Math.max(1, Math.round(safeNumber(values.dpaTermYears, 10)));

  const first = payment(firstMortgage, firstRatePercent / 100 / 12, 360);
  const dpa = dpaType === 3 ? payment(dpaAmount, dpaRatePercent / 100 / 12, dpaTermYears * 12) : 0;

  return {
    firstMortgagePayment: round2(first),
    assistancePayment: round2(dpa),
    totalPrincipalAndInterest: round2(first + dpa),
  };
};

// --- 3. Down Payment Assistance Loan Payoff Calculator (forgiveness) --------------------
export const downPaymentAssistanceLoanPayoffCalculator: CustomCalculator = (values) => {
  const dpaAmount = Math.max(0, safeNumber(values.dpaAmount, 15000));
  const forgivenessYears = Math.max(1, safeNumber(values.forgivenessYears, 5));
  const yearsOwned = Math.max(0, safeNumber(values.yearsOwned, 3));

  const forgivenShare = Math.min(1, yearsOwned / forgivenessYears);

  return {
    amountForgiven: round2(dpaAmount * forgivenShare),
    amountOwedIfYouSellNow: round2(dpaAmount * (1 - forgivenShare)),
    yearsUntilFullyForgiven: round2(Math.max(0, forgivenessYears - yearsOwned)),
  };
};

// --- 4. Down Payment Assistance Loan Interest Calculator --------------------------------
export const downPaymentAssistanceLoanInterestCalculator: CustomCalculator = (values) => {
  const dpaAmount = Math.max(0, safeNumber(values.dpaAmount, 15000));
  const dpaRatePercent = Math.max(0, safeNumber(values.dpaRatePercent, 7));
  const dpaTermYears = Math.max(1, Math.round(safeNumber(values.dpaTermYears, 10)));
  const firstMortgage = Math.max(0, safeNumber(values.firstMortgage, 337750));
  const firstRatePercent = Math.max(0, safeNumber(values.firstRatePercent, 6.5));
  const ratePremiumPercent = Math.max(0, safeNumber(values.ratePremiumPercent, 0.375));
  const yearsKept = Math.max(0, Math.min(30, safeNumber(values.yearsKept, 7)));

  const dpaInterest = payment(dpaAmount, dpaRatePercent / 100 / 12, dpaTermYears * 12) * dpaTermYears * 12 - dpaAmount;
  const k = Math.round(yearsKept * 12);
  const interestUntil = (rate: number) => {
    const i = rate / 100 / 12;
    const p = payment(firstMortgage, i, 360);
    return p * k - (firstMortgage - balanceAfter(firstMortgage, i, p, k));
  };
  const premiumCost = interestUntil(firstRatePercent + ratePremiumPercent) - interestUntil(firstRatePercent);

  return {
    assistanceLoanInterest: round2(dpaInterest),
    firstMortgageRatePremiumCost: round2(premiumCost),
    totalExtraInterest: round2(dpaInterest + premiumCost),
  };
};

// --- 5. Down Payment Assistance Loan Affordability Calculator ---------------------------
export const downPaymentAssistanceLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 6000));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 500));
  const maxDtiPercent = Math.min(100, Math.max(0, safeNumber(values.maxDtiPercent, 45)));
  const taxesInsurance = Math.max(0, safeNumber(values.taxesInsurance, 450));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 3.5)));
  const closingCostsPercent = Math.max(0, safeNumber(values.closingCostsPercent, 3));

  const housing = Math.max(0, (monthlyIncome * maxDtiPercent) / 100 - monthlyDebts);
  const pi = Math.max(0, housing - taxesInsurance);
  const loan = presentValue(pi, annualRatePercent / 100 / 12, 360);
  const price = loan / (1 - downPaymentPercent / 100);

  return {
    maxHousingPayment: round2(housing),
    maxLoanAmount: round2(loan),
    maxHomePrice: round2(price),
    assistanceNeeded: round2((price * (downPaymentPercent + closingCostsPercent)) / 100),
  };
};

// --- 6. Down Payment Assistance Loan Comparison Calculator (DPA now vs save) -----------
export const downPaymentAssistanceLoanComparisonCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 350000));
  const cashNeeded = Math.max(0, safeNumber(values.cashNeeded, 22750));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 3000));
  const monthlySaving = Math.max(1, safeNumber(values.monthlySaving, 600));
  const priceGrowthPercent = safeNumber(values.priceGrowthPercent, 4);
  const dpaExtraCost = Math.max(0, safeNumber(values.dpaExtraCost, 9000));

  const months = Math.ceil(Math.max(0, cashNeeded - currentSavings) / monthlySaving);
  const rise = homePrice * (Math.pow(1 + priceGrowthPercent / 100, months / 12) - 1);

  return {
    monthsToSaveYourself: months,
    priceRiseWhileSaving: round2(rise),
    assistanceExtraCost: round2(dpaExtraCost),
    advantageOfUsingAssistance: round2(rise - dpaExtraCost),
  };
};

// --- 7. Down Payment Assistance Loan Eligibility Calculator -----------------------------
export const downPaymentAssistanceLoanEligibilityCalculator: CustomCalculator = (values) => {
  const householdIncome = Math.max(0, safeNumber(values.householdIncome, 85000));
  const areaMedianIncome = Math.max(1, safeNumber(values.areaMedianIncome, 90000));
  const incomeLimitPercent = Math.max(0, safeNumber(values.incomeLimitPercent, 120));
  const firstTimeBuyer = Math.round(safeNumber(values.firstTimeBuyer, 1)) === 1;
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 660)));
  const homePrice = Math.max(0, safeNumber(values.homePrice, 350000));
  const priceLimit = Math.max(0, safeNumber(values.priceLimit, 450000));

  const limit = (areaMedianIncome * incomeLimitPercent) / 100;
  let passed = 0;
  if (householdIncome <= limit) passed++;
  if (firstTimeBuyer) passed++;
  if (creditScore >= 640) passed++;
  if (homePrice <= priceLimit) passed++;

  return {
    incomeLimit: round2(limit),
    incomeAsShareOfMedian: round2((householdIncome / areaMedianIncome) * 100),
    checksPassed: passed,
  };
};

export const mortgageDownPaymentAssistanceCustomCalculators: Record<string, CustomCalculator> = {
  "down-payment-assistance-loan-calculator": downPaymentAssistanceLoanCalculator,
  "down-payment-assistance-loan-payment-calculator": downPaymentAssistanceLoanPaymentCalculator,
  "down-payment-assistance-loan-payoff-calculator": downPaymentAssistanceLoanPayoffCalculator,
  "down-payment-assistance-loan-interest-calculator": downPaymentAssistanceLoanInterestCalculator,
  "down-payment-assistance-loan-affordability-calculator": downPaymentAssistanceLoanAffordabilityCalculator,
  "down-payment-assistance-loan-comparison-calculator": downPaymentAssistanceLoanComparisonCalculator,
  "down-payment-assistance-loan-eligibility-calculator": downPaymentAssistanceLoanEligibilityCalculator,
};
