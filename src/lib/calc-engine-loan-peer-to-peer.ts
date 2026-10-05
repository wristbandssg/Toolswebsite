/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 4 of 11 —
 * Peer-to-Peer Loans (7 tools), filed under Loan Calculators > Personal
 * Loan Calculators (most P2P lending is personal loans funded by
 * investors). See calc-engine-loan-sba.ts for the full batch context.
 *
 * P2P platforms deduct an origination fee (often 1%-10%) from the money
 * you receive, which is what most of these tools model:
 *  - peerToPeerLoan: the amount to request so you still get what you need
 *    after the fee, the payment, and the APR.
 *  - peerToPeerLoanPayment: 36- vs 60-month payment (platforms usually
 *    offer only these two, with a higher rate on 60).
 *  - peerToPeerLoanPayoff: paying off early saves interest but, because
 *    the fee was paid upfront, the effective APR rises.
 *  - peerToPeerLoanInterest: the borrower's interest and the investor's
 *    side — the return after the platform's service fee and defaults.
 *  - peerToPeerLoanAffordability: DTI limit -> maximum loan and the cash
 *    you'd actually receive.
 *  - peerToPeerLoanComparison: P2P (lower rate + fee) vs bank (no fee).
 *  - peerToPeerLoanEligibility: score, DTI with the loan, platform maximum.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-peer-to-peer-calculators.ts for the copy.
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

/** Monthly rate r at which the cash flows `flows` (month 1, 2, ...) are worth `pv` today. */
function solveFlows(pv: number, flows: (m: number) => number, n: number): number {
  const value = (r: number) => {
    let s = 0;
    for (let m = 1; m <= n; m++) s += flows(m) / Math.pow(1 + r, m);
    return s;
  };
  if (pv <= 0 || n <= 0 || value(-0.99) <= pv) return 0;
  let lo = -0.5;
  let hi = 1;
  if (value(lo) < pv) return lo;
  for (let k = 0; k < 120; k++) {
    const mid = (lo + hi) / 2;
    if (value(mid) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function aprFromFee(netProceeds: number, pmt: number, n: number): number {
  return solveFlows(netProceeds, () => pmt, n) * 12 * 100;
}

// --- 1. Peer-to-Peer Loan Calculator -----------------------------------------------
export const peerToPeerLoanCalculator: CustomCalculator = (values) => {
  const amountNeeded = Math.max(0, safeNumber(values.amountNeeded, 10000));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 5)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const gross = amountNeeded / (1 - feePercent / 100);
  const pmt = payment(gross, annualRatePercent / 100 / 12, termMonths);

  return {
    loanAmountToRequest: round2(gross),
    originationFee: round2(gross - amountNeeded),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - gross),
    apr: round2(aprFromFee(amountNeeded, pmt, termMonths)),
  };
};

// --- 2. Peer-to-Peer Loan Payment Calculator (36 vs 60 months) ---------------------
export const peerToPeerLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const rate36 = Math.max(0, safeNumber(values.rate36Percent, 11));
  const rate60 = Math.max(0, safeNumber(values.rate60Percent, 13.5));

  const p36 = payment(loanAmount, rate36 / 100 / 12, 36);
  const p60 = payment(loanAmount, rate60 / 100 / 12, 60);

  return {
    payment36: round2(p36),
    payment60: round2(p60),
    monthlyDifference: round2(p36 - p60),
    interest36: round2(p36 * 36 - loanAmount),
    interest60: round2(p60 * 60 - loanAmount),
    extraInterestFor60: round2(p60 * 60 - p36 * 36),
  };
};

// --- 3. Peer-to-Peer Loan Payoff Calculator (early payoff vs upfront fee) ----------
export const peerToPeerLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 12000));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 6)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const payoffMonth = Math.min(termMonths, Math.max(1, Math.round(safeNumber(values.payoffMonth, 24))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const bal = balanceAfter(loanAmount, i, pmt, payoffMonth);
  const paid = pmt * payoffMonth - (loanAmount - bal);
  const net = loanAmount * (1 - feePercent / 100);
  const early = solveFlows(net, (m) => (m === payoffMonth ? pmt + bal : pmt), payoffMonth) * 12 * 100;

  return {
    balanceAtPayoff: round2(bal),
    interestPaid: round2(paid),
    interestSaved: round2(Math.max(0, pmt * termMonths - loanAmount - paid)),
    aprIfHeldToTerm: round2(aprFromFee(net, pmt, termMonths)),
    effectiveAprIfPaidEarly: round2(early),
  };
};

// --- 4. Peer-to-Peer Loan Interest Calculator (borrower + investor) ----------------
export const peerToPeerLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const serviceFeePercent = Math.min(10, Math.max(0, safeNumber(values.serviceFeePercent, 1)));
  const annualDefaultPercent = Math.min(50, Math.max(0, safeNumber(values.annualDefaultPercent, 4)));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const survive = Math.pow(1 - annualDefaultPercent / 100, 1 / 12);
  const net = (m: number) => pmt * (1 - serviceFeePercent / 100) * Math.pow(survive, m);
  let expected = 0;
  for (let m = 1; m <= termMonths; m++) expected += net(m);
  const irr = solveFlows(loanAmount, net, termMonths);

  return {
    monthlyPayment: round2(pmt),
    borrowerTotalInterest: round2(pmt * termMonths - loanAmount),
    investorServiceFees: round2((pmt * termMonths * serviceFeePercent) / 100),
    investorExpectedProfit: round2(expected - loanAmount),
    investorNetReturn: round2((Math.pow(1 + irr, 12) - 1) * 100),
  };
};

// --- 5. Peer-to-Peer Loan Affordability Calculator ---------------------------------
export const peerToPeerLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 6000));
  const existingDebtPayments = Math.max(0, safeNumber(values.existingDebtPayments, 900));
  const maxDtiPercent = Math.min(100, Math.max(0, safeNumber(values.maxDtiPercent, 40)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 5)));

  const maxPmt = Math.max(0, (monthlyIncome * maxDtiPercent) / 100 - existingDebtPayments);
  const maxLoan = presentValue(maxPmt, annualRatePercent / 100 / 12, termMonths);

  return {
    maxMonthlyPayment: round2(maxPmt),
    maxLoanAmount: round2(maxLoan),
    originationFee: round2((maxLoan * feePercent) / 100),
    cashYouReceive: round2(maxLoan * (1 - feePercent / 100)),
  };
};

// --- 6. Peer-to-Peer Loan Comparison Calculator (P2P vs bank) ----------------------
export const peerToPeerLoanComparisonCalculator: CustomCalculator = (values) => {
  const amountNeeded = Math.max(0, safeNumber(values.amountNeeded, 15000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const p2pRatePercent = Math.max(0, safeNumber(values.p2pRatePercent, 11));
  const p2pFeePercent = Math.min(20, Math.max(0, safeNumber(values.p2pFeePercent, 6)));
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 12.5));
  const bankFeePercent = Math.min(20, Math.max(0, safeNumber(values.bankFeePercent, 0)));

  const p2pGross = amountNeeded / (1 - p2pFeePercent / 100);
  const bankGross = amountNeeded / (1 - bankFeePercent / 100);
  const p2pPmt = payment(p2pGross, p2pRatePercent / 100 / 12, termMonths);
  const bankPmt = payment(bankGross, bankRatePercent / 100 / 12, termMonths);
  const p2pCost = p2pPmt * termMonths - amountNeeded;
  const bankCost = bankPmt * termMonths - amountNeeded;

  return {
    p2pMonthlyPayment: round2(p2pPmt),
    bankMonthlyPayment: round2(bankPmt),
    p2pApr: round2(aprFromFee(amountNeeded, p2pPmt, termMonths)),
    bankApr: round2(aprFromFee(amountNeeded, bankPmt, termMonths)),
    p2pTotalCost: round2(p2pCost),
    bankTotalCost: round2(bankCost),
    costDifference: round2(p2pCost - bankCost),
  };
};

// --- 7. Peer-to-Peer Loan Eligibility Calculator -------------------------------------
export const peerToPeerLoanEligibilityCalculator: CustomCalculator = (values) => {
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 5000));
  const existingDebtPayments = Math.max(0, safeNumber(values.existingDebtPayments, 800));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 12000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 15));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 660)));
  const minScore = Math.min(850, Math.max(300, safeNumber(values.minScore, 640)));
  const maxDtiPercent = Math.min(100, Math.max(0, safeNumber(values.maxDtiPercent, 40)));
  const platformMax = Math.max(0, safeNumber(values.platformMax, 50000));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const dti = monthlyIncome > 0 ? ((existingDebtPayments + pmt) / monthlyIncome) * 100 : 0;
  let passed = 0;
  if (creditScore >= minScore) passed++;
  if (monthlyIncome > 0 && dti <= maxDtiPercent) passed++;
  if (loanAmount <= platformMax) passed++;

  return {
    newMonthlyPayment: round2(pmt),
    dtiWithLoan: round2(dti),
    maxPaymentWithinDti: round2(Math.max(0, (monthlyIncome * maxDtiPercent) / 100 - existingDebtPayments)),
    checksPassed: passed,
  };
};

export const loanPeerToPeerCustomCalculators: Record<string, CustomCalculator> = {
  "peer-to-peer-loan-calculator": peerToPeerLoanCalculator,
  "peer-to-peer-loan-payment-calculator": peerToPeerLoanPaymentCalculator,
  "peer-to-peer-loan-payoff-calculator": peerToPeerLoanPayoffCalculator,
  "peer-to-peer-loan-interest-calculator": peerToPeerLoanInterestCalculator,
  "peer-to-peer-loan-affordability-calculator": peerToPeerLoanAffordabilityCalculator,
  "peer-to-peer-loan-comparison-calculator": peerToPeerLoanComparisonCalculator,
  "peer-to-peer-loan-eligibility-calculator": peerToPeerLoanEligibilityCalculator,
};
