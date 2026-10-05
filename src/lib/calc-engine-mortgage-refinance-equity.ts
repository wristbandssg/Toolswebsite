/**
 * Batch: "Mortgage Calculators" expansion (5 Oct 2026), sub-batch 2 of 5 —
 * Refinance & Home Equity (10 tools), filed under Mortgage Calculators >
 * Refinance & Home Equity Calculators. See calc-engine-mortgage-loan-types.ts
 * for the full batch context. Distinct from the existing
 * mortgage-refinance / cash-out-refinance / mortgage-recast tools (which
 * are generic) and home-equity-calculator (equity and borrowing room only).
 *
 *  - heloc: credit line at the lender's CLTV, interest-only draw payment,
 *    then the repayment-period payment (payment shock).
 *  - homeEquityLoan: max loan at CLTV, fixed payment, new CLTV.
 *  - homeEquityLineVsLoan: same amount as a fixed loan vs a HELOC (draw
 *    period interest-only, then amortizing) — payments and total interest.
 *  - reverseMortgage (HECM): principal limit = PLF x min(value, $1,249,125
 *    2026 limit), minus upfront MIP 2%, origination (2% of first $200k +
 *    1% above, $2,500 min, $6,000 cap), other costs and the existing
 *    mortgage; then the balance grows at rate + 0.5% annual MIP.
 *  - fhaStreamlineRefinance: UFMIP refund (80% in month 1, down 2% a month
 *    to 10% in month 36), new 1.75% UFMIP, 0.55% MIP, the 0.5-point
 *    combined-rate test.
 *  - vaIrrrlRefinance: 0.5% funding fee (exemptions), costs financed,
 *    36-month recoupment test, 0.5-point rate drop.
 *  - usdaStreamlineRefinance: 1% upfront + 0.35% annual fee, $50 payment
 *    reduction test.
 *  - cashInRefinance: paying down to 80% LTV to drop PMI and get a lower
 *    rate — monthly savings and the return on the cash.
 *  - noClosingCostRefinance: higher rate with no costs vs paying costs —
 *    total cost over N years and the break-even month.
 *  - mortgageRecastingVsRefinancing: same lump sum used for a recast vs a
 *    refinance at a new rate.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-mortgage-refinance-equity-calculators.ts for the copy.
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

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// Interest paid in the first k months of an amortizing loan.
function interestFirst(principal: number, i: number, n: number, k: number): number {
  const p = payment(principal, i, n);
  const kk = Math.min(k, n);
  return p * kk - (principal - balanceAfter(principal, i, p, kk));
}

// --- 1. HELOC Calculator --------------------------------------------------------------
export const helocCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 450000));
  const mortgageBalance = Math.max(0, safeNumber(values.mortgageBalance, 250000));
  const maxCltvPercent = Math.min(100, Math.max(0, safeNumber(values.maxCltvPercent, 85)));
  const drawAmount = Math.max(0, safeNumber(values.drawAmount, 60000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.25));
  const drawYears = Math.max(0, Math.round(safeNumber(values.drawYears, 10)));
  const repayYears = Math.max(1, Math.round(safeNumber(values.repayYears, 20)));

  const line = Math.max(0, (homeValue * maxCltvPercent) / 100 - mortgageBalance);
  const used = Math.min(drawAmount, line);
  const i = annualRatePercent / 100 / 12;
  const io = used * i;
  const repay = payment(used, i, repayYears * 12);

  return {
    creditLine: round2(line),
    amountUsed: round2(used),
    drawPeriodPayment: round2(io),
    repaymentPeriodPayment: round2(repay),
    paymentIncrease: round2(repay - io),
    totalInterest: round2(io * drawYears * 12 + repay * repayYears * 12 - used),
  };
};

// --- 2. Home Equity Loan Calculator ---------------------------------------------------
export const homeEquityLoanCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 450000));
  const mortgageBalance = Math.max(0, safeNumber(values.mortgageBalance, 250000));
  const maxCltvPercent = Math.min(100, Math.max(0, safeNumber(values.maxCltvPercent, 85)));
  const amountWanted = Math.max(0, safeNumber(values.amountWanted, 50000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 15)));

  const max = Math.max(0, (homeValue * maxCltvPercent) / 100 - mortgageBalance);
  const loan = Math.min(amountWanted, max);
  const n = termYears * 12;
  const p = payment(loan, annualRatePercent / 100 / 12, n);

  return {
    maxLoanAmount: round2(max),
    loanAmount: round2(loan),
    monthlyPayment: round2(p),
    totalInterest: round2(p * n - loan),
    newCltvPercent: round2(homeValue > 0 ? ((mortgageBalance + loan) / homeValue) * 100 : 0),
  };
};

// --- 3. Home Equity Line vs Loan Calculator -------------------------------------------
export const homeEquityLineVsLoanCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 50000));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 8.5));
  const loanTermYears = Math.max(1, Math.round(safeNumber(values.loanTermYears, 15)));
  const loanClosingCosts = Math.max(0, safeNumber(values.loanClosingCosts, 1000));
  const helocRatePercent = Math.max(0, safeNumber(values.helocRatePercent, 8));
  const drawYears = Math.max(0, Math.round(safeNumber(values.drawYears, 10)));
  const repayYears = Math.max(1, Math.round(safeNumber(values.repayYears, 20)));
  const helocClosingCosts = Math.max(0, safeNumber(values.helocClosingCosts, 500));

  const nL = loanTermYears * 12;
  const pL = payment(amount, loanRatePercent / 100 / 12, nL);
  const loanCost = pL * nL - amount + loanClosingCosts;
  const iH = helocRatePercent / 100 / 12;
  const io = amount * iH;
  const pH = payment(amount, iH, repayYears * 12);
  const helocCost = io * drawYears * 12 + pH * repayYears * 12 - amount + helocClosingCosts;

  return {
    homeEquityLoanPayment: round2(pL),
    helocDrawPayment: round2(io),
    helocRepaymentPayment: round2(pH),
    homeEquityLoanTotalCost: round2(loanCost),
    helocTotalCost: round2(helocCost),
    helocExtraCost: round2(helocCost - loanCost),
  };
};

// --- 4. Reverse Mortgage Calculator (HECM) --------------------------------------------
export const reverseMortgageCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 450000));
  const principalLimitFactorPercent = Math.min(100, Math.max(0, safeNumber(values.principalLimitFactorPercent, 42)));
  const existingMortgage = Math.max(0, safeNumber(values.existingMortgage, 60000));
  const otherClosingCosts = Math.max(0, safeNumber(values.otherClosingCosts, 3500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const years = Math.max(0, safeNumber(values.years, 10));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);
  const lendingLimit = Math.max(0, safeNumber(values.lendingLimit, 1249125));

  const maxClaim = Math.min(homeValue, lendingLimit);
  const principalLimit = (maxClaim * principalLimitFactorPercent) / 100;
  const mip = maxClaim * 0.02;
  const origination = Math.min(6000, Math.max(2500, 0.02 * Math.min(maxClaim, 200000) + 0.01 * Math.max(0, maxClaim - 200000)));
  const costs = mip + origination + otherClosingCosts;
  const startBalance = Math.min(principalLimit, costs + existingMortgage);
  const available = Math.max(0, principalLimit - costs - existingMortgage);
  // the balance (costs + payoff, no further draws) grows at rate + 0.5% MIP
  const balance = startBalance * Math.pow(1 + (annualRatePercent + 0.5) / 100 / 12, Math.round(years * 12));
  const value = homeValue * Math.pow(1 + appreciationPercent / 100, years);

  return {
    principalLimit: round2(principalLimit),
    upfrontCosts: round2(costs),
    existingMortgagePayoff: round2(Math.min(existingMortgage, principalLimit)),
    availableToYou: round2(available),
    balanceAfterYears: round2(balance),
    homeValueAfterYears: round2(value),
    equityLeftAfterYears: round2(Math.max(0, value - balance)),
  };
};

// --- 5. FHA Streamline Refinance Calculator -------------------------------------------
export const fhaStreamlineRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 280000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 7.25));
  const currentMipPercent = Math.max(0, safeNumber(values.currentMipPercent, 0.55));
  const remainingYears = Math.max(1, safeNumber(values.remainingYears, 28));
  const originalUfmip = Math.max(0, safeNumber(values.originalUfmip, 5000));
  const monthsSinceClosing = Math.max(0, Math.round(safeNumber(values.monthsSinceClosing, 24)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 6.25));
  const newMipPercent = Math.max(0, safeNumber(values.newMipPercent, 0.55));

  const refundPct = monthsSinceClosing >= 1 && monthsSinceClosing <= 36 ? 80 - 2 * (monthsSinceClosing - 1) : 0;
  const refund = (originalUfmip * refundPct) / 100;
  const newUfmip = currentBalance * 0.0175;
  const newLoan = currentBalance + newUfmip - refund;
  const curPay = payment(currentBalance, currentRatePercent / 100 / 12, Math.round(remainingYears * 12)) + (currentBalance * currentMipPercent) / 100 / 12;
  const newPay = payment(newLoan, newRatePercent / 100 / 12, 360) + (newLoan * newMipPercent) / 100 / 12;
  const drop = currentRatePercent + currentMipPercent - (newRatePercent + newMipPercent);

  return {
    ufmipRefund: round2(refund),
    newUpfrontMip: round2(newUfmip),
    newLoanAmount: round2(newLoan),
    currentPayment: round2(curPay),
    newPayment: round2(newPay),
    monthlySavings: round2(curPay - newPay),
    combinedRateDrop: round2(drop),
    meetsBenefitTest: drop >= 0.5 ? 1 : 0,
  };
};

// --- 6. VA IRRRL Refinance Calculator -------------------------------------------------
export const vaIrrrlRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 300000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 7));
  const remainingYears = Math.max(1, safeNumber(values.remainingYears, 27));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 6));
  const newTermYears = Math.max(1, Math.round(safeNumber(values.newTermYears, 30)));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 4000));
  const exempt = Math.round(safeNumber(values.fundingFeeExempt, 0)) === 1;

  const fee = exempt ? 0 : currentBalance * 0.005;
  const newLoan = currentBalance + fee + closingCosts;
  const curPay = payment(currentBalance, currentRatePercent / 100 / 12, Math.round(remainingYears * 12));
  const newPay = payment(newLoan, newRatePercent / 100 / 12, newTermYears * 12);
  const savings = curPay - newPay;
  const recoup = savings > 0 ? (fee + closingCosts) / savings : 999;

  return {
    fundingFee: round2(fee),
    newLoanAmount: round2(newLoan),
    currentPayment: round2(curPay),
    newPayment: round2(newPay),
    monthlySavings: round2(savings),
    recoupMonths: round2(recoup),
    meetsRecoupTest: recoup <= 36 && currentRatePercent - newRatePercent >= 0.5 ? 1 : 0,
  };
};

// --- 7. USDA Streamline Refinance Calculator ------------------------------------------
export const usdaStreamlineRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 220000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 7));
  const remainingYears = Math.max(1, safeNumber(values.remainingYears, 27));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 6.125));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 3000));
  const annualFeePercent = Math.max(0, safeNumber(values.annualFeePercent, 0.35));
  const monthlyTaxesInsurance = Math.max(0, safeNumber(values.monthlyTaxesInsurance, 400));

  const base = currentBalance + closingCosts;
  const newLoan = base * 1.01;
  const curPay =
    payment(currentBalance, currentRatePercent / 100 / 12, Math.round(remainingYears * 12)) +
    (currentBalance * annualFeePercent) / 100 / 12 +
    monthlyTaxesInsurance;
  const newPay = payment(newLoan, newRatePercent / 100 / 12, 360) + (newLoan * annualFeePercent) / 100 / 12 + monthlyTaxesInsurance;

  return {
    upfrontGuaranteeFee: round2(newLoan - base),
    newLoanAmount: round2(newLoan),
    currentPayment: round2(curPay),
    newPayment: round2(newPay),
    monthlySavings: round2(curPay - newPay),
    meetsFiftyDollarTest: curPay - newPay >= 50 ? 1 : 0,
  };
};

// --- 8. Cash-In Refinance Calculator --------------------------------------------------
export const cashInRefinanceCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0, safeNumber(values.homeValue, 400000));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 350000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 7.25));
  const remainingYears = Math.max(1, safeNumber(values.remainingYears, 28));
  const currentPmi = Math.max(0, safeNumber(values.currentPmi, 175));
  const cashIn = Math.max(0, safeNumber(values.cashIn, 30000));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 6.25));
  const newTermYears = Math.max(1, Math.round(safeNumber(values.newTermYears, 30)));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 4000));

  const newLoan = Math.max(0, currentBalance - cashIn);
  const ltv = homeValue > 0 ? (newLoan / homeValue) * 100 : 0;
  const curPay = payment(currentBalance, currentRatePercent / 100 / 12, Math.round(remainingYears * 12)) + currentPmi;
  const newPay = payment(newLoan, newRatePercent / 100 / 12, newTermYears * 12) + (ltv > 80 ? currentPmi : 0);
  const savings = curPay - newPay;

  return {
    newLoanAmount: round2(newLoan),
    newLtvPercent: round2(ltv),
    currentPayment: round2(curPay),
    newPayment: round2(newPay),
    monthlySavings: round2(savings),
    returnOnCashPercent: round2(cashIn + closingCosts > 0 ? ((savings * 12) / (cashIn + closingCosts)) * 100 : 0),
    breakEvenMonths: savings > 0 ? Math.ceil(closingCosts / savings) : 999,
  };
};

// --- 9. No-Closing-Cost Refinance Calculator ------------------------------------------
export const noClosingCostRefinanceCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300000));
  const rateWithCostsPercent = Math.max(0, safeNumber(values.rateWithCostsPercent, 6.125));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 6000));
  const noCostRatePercent = Math.max(0, safeNumber(values.noCostRatePercent, 6.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 30)));
  const yearsKept = Math.max(0, safeNumber(values.yearsKept, 5));

  const n = termYears * 12;
  const k = Math.min(n, Math.round(yearsKept * 12));
  const iA = rateWithCostsPercent / 100 / 12;
  const iB = noCostRatePercent / 100 / 12;
  const payA = payment(loanAmount, iA, n);
  const payB = payment(loanAmount, iB, n);
  const costA = closingCosts + interestFirst(loanAmount, iA, n, k);
  const costB = interestFirst(loanAmount, iB, n, k);
  let breakEven = 999;
  for (let m = 1; m <= n; m++) {
    if (closingCosts + interestFirst(loanAmount, iA, n, m) <= interestFirst(loanAmount, iB, n, m)) {
      breakEven = m;
      break;
    }
  }

  return {
    paymentPayingCosts: round2(payA),
    paymentNoClosingCost: round2(payB),
    costPayingCosts: round2(costA),
    costNoClosingCost: round2(costB),
    noClosingCostSavings: round2(costA - costB),
    breakEvenMonths: breakEven,
  };
};

// --- 10. Mortgage Recasting vs Refinancing Calculator ---------------------------------
export const mortgageRecastingVsRefinancingCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 300000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 7));
  const remainingYears = Math.max(1, safeNumber(values.remainingYears, 25));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 50000));
  const recastFee = Math.max(0, safeNumber(values.recastFee, 250));
  const refiRatePercent = Math.max(0, safeNumber(values.refiRatePercent, 6.25));
  const refiTermYears = Math.max(1, Math.round(safeNumber(values.refiTermYears, 25)));
  const refiClosingCosts = Math.max(0, safeNumber(values.refiClosingCosts, 5000));

  const n = Math.round(remainingYears * 12);
  const left = Math.max(0, currentBalance - lumpSum);
  const recastPay = payment(left, currentRatePercent / 100 / 12, n);
  const recastCost = recastPay * n - left + recastFee;
  const nR = refiTermYears * 12;
  const refiPay = payment(left, refiRatePercent / 100 / 12, nR);
  const refiCost = refiPay * nR - left + refiClosingCosts;

  return {
    currentPayment: round2(payment(currentBalance, currentRatePercent / 100 / 12, n)),
    recastPayment: round2(recastPay),
    refinancePayment: round2(refiPay),
    recastTotalCost: round2(recastCost),
    refinanceTotalCost: round2(refiCost),
    refinanceSavings: round2(recastCost - refiCost),
  };
};

export const mortgageRefinanceEquityCustomCalculators: Record<string, CustomCalculator> = {
  "heloc-calculator": helocCalculator,
  "home-equity-loan-calculator": homeEquityLoanCalculator,
  "home-equity-line-vs-loan-calculator": homeEquityLineVsLoanCalculator,
  "reverse-mortgage-calculator": reverseMortgageCalculator,
  "fha-streamline-refinance-calculator": fhaStreamlineRefinanceCalculator,
  "va-irrrl-refinance-calculator": vaIrrrlRefinanceCalculator,
  "usda-streamline-refinance-calculator": usdaStreamlineRefinanceCalculator,
  "cash-in-refinance-calculator": cashInRefinanceCalculator,
  "no-closing-cost-refinance-calculator": noClosingCostRefinanceCalculator,
  "mortgage-recasting-vs-refinancing-calculator": mortgageRecastingVsRefinancingCalculator,
};
