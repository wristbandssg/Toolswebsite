/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 8 of 8 —
 * Line of Credit & Credit Builder Loans (11 tools), filed under Finance
 * Calculators > Credit & Debt Calculators (revolving credit and building
 * credit are credit topics). "Personal Line of Credit" x7 from the same
 * list was merged into the Line of Credit tools. See calc-engine-loan-life-
 * events.ts for the full batch context.
 *
 * Line of credit (revolving: draw, repay, draw again; interest only on what
 * you use):
 *  - lineOfCredit: interest-only payments in the draw period, then the
 *    repayment-period payment — the payment jump.
 *  - payment: the three common minimum-payment rules side by side.
 *  - payoff: a fixed payment while still making new draws each month.
 *  - interest: one billing cycle's interest on the average daily balance,
 *    with a draw and a payment part-way through.
 *  - affordability: the largest balance a monthly budget can carry —
 *    interest-only or fully repaid over a set term.
 *  - comparison: a line drawn as you go vs a lump-sum loan for the same
 *    staged project.
 *  - eligibility: DTI using the payment lenders assume on the FULL limit.
 * Credit builder loans (the money is held in a savings account/CD and
 * released when the loan is repaid):
 *  - creditBuilderLoan: what it costs to build a payment history — interest
 *    and fees less what the held savings earn.
 *  - payment: the loan size a monthly budget supports.
 *  - cost: credit builder loan vs a secured credit card.
 *  - payoff: paying off early — interest saved vs months of history lost.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-credit-line-builder-calculators.ts for the copy.
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

// --- 1. Line of Credit Calculator (draw period -> repayment period) ----------
export const lineOfCreditCalculator: CustomCalculator = (values) => {
  const creditLimit = Math.max(0, safeNumber(values.creditLimit, 25000));
  const balance = Math.min(creditLimit, Math.max(0, safeNumber(values.balance, 15000)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const drawYears = Math.max(0, safeNumber(values.drawYears, 5));
  const repayYears = Math.max(1, Math.round(safeNumber(values.repayYears, 10)));

  const i = annualRatePercent / 100 / 12;
  const io = balance * i;
  const repay = payment(balance, i, repayYears * 12);
  const total = io * drawYears * 12 + (repay * repayYears * 12 - balance);

  return {
    availableCredit: round2(creditLimit - balance),
    interestOnlyPayment: round2(io),
    repaymentPeriodPayment: round2(repay),
    paymentJump: round2(repay - io),
    totalInterest: round2(total),
  };
};

// --- 2. Line of Credit Payment Calculator (minimum payment rules) ------------
export const lineOfCreditPaymentCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const minPercent = Math.max(0, safeNumber(values.minPercent, 2));
  const minFloor = Math.max(0, safeNumber(values.minFloor, 25));

  const interest = (balance * annualRatePercent) / 100 / 12;
  const pct = Math.min(balance, Math.max((balance * minPercent) / 100, minFloor));
  const plus1 = Math.min(balance + interest, interest + balance * 0.01);

  return {
    interestOnlyPayment: round2(interest),
    percentOfBalancePayment: round2(pct),
    interestPlusOnePercentPayment: round2(plus1),
    principalPaidByPercentRule: round2(Math.max(0, pct - interest)),
  };
};

// --- 3. Line of Credit Payoff Calculator (with ongoing draws) ----------------
export const lineOfCreditPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 12000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 400));
  const monthlyNewDraws = Math.max(0, safeNumber(values.monthlyNewDraws, 100));

  const i = annualRatePercent / 100 / 12;
  const run = (draw: number) => {
    let b = balance;
    let interest = 0;
    let m = 0;
    while (b > 1e-9 && m < 1200) {
      const int = b * i;
      if (monthlyPayment <= int + draw + 1e-9) return { months: -1, interest: 0 };
      interest += int;
      b = b + int + draw - Math.min(monthlyPayment, b + int + draw);
      m++;
    }
    return { months: m, interest };
  };
  const withDraws = run(monthlyNewDraws);
  const noDraws = run(0);

  return {
    monthsToPayoff: Math.max(0, withDraws.months),
    totalInterest: withDraws.months < 0 ? 0 : round2(withDraws.interest),
    monthsIfYouStopDrawing: Math.max(0, noDraws.months),
    interestSavedByStopping: withDraws.months < 0 || noDraws.months < 0 ? 0 : round2(withDraws.interest - noDraws.interest),
  };
};

// --- 4. Line of Credit Interest Calculator (average daily balance) -----------
export const lineOfCreditInterestCalculator: CustomCalculator = (values) => {
  const startBalance = Math.max(0, safeNumber(values.startBalance, 5000));
  const drawAmount = Math.max(0, safeNumber(values.drawAmount, 3000));
  const cycleDays = Math.max(1, Math.round(safeNumber(values.cycleDays, 30)));
  const drawDay = Math.min(cycleDays, Math.max(1, Math.round(safeNumber(values.drawDay, 10))));
  const paymentAmount = Math.max(0, safeNumber(values.paymentAmount, 1000));
  const paymentDay = Math.min(cycleDays, Math.max(1, Math.round(safeNumber(values.paymentDay, 20))));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));

  let sum = 0;
  for (let d = 1; d <= cycleDays; d++) {
    let b = startBalance;
    if (d >= drawDay) b += drawAmount;
    if (d >= paymentDay) b -= paymentAmount;
    sum += Math.max(0, b);
  }
  const adb = sum / cycleDays;
  const interest = (adb * annualRatePercent) / 100 / 365 * cycleDays;

  return {
    averageDailyBalance: round2(adb),
    dailyRatePercent: Math.round((annualRatePercent / 365) * 10000) / 10000,
    cycleInterest: round2(interest),
    endingBalance: round2(Math.max(0, startBalance + drawAmount - paymentAmount) + interest),
  };
};

// --- 5. Line of Credit Affordability Calculator ------------------------------
export const lineOfCreditAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const repayYears = Math.max(1, Math.round(safeNumber(values.repayYears, 5)));

  const i = annualRatePercent / 100 / 12;
  const repayable = presentValue(monthlyBudget, i, repayYears * 12);

  return {
    maxBalanceRepaidInTerm: round2(repayable),
    maxBalanceInterestOnly: i > 0 ? round2(monthlyBudget / i) : 0,
    interestOnRepayableBalance: round2(monthlyBudget * repayYears * 12 - repayable),
  };
};

// --- 6. Line of Credit Comparison Calculator (draw as you go vs lump loan) ---
export const lineOfCreditComparisonCalculator: CustomCalculator = (values) => {
  const amountNeeded = Math.max(0, safeNumber(values.amountNeeded, 20000));
  const drawMonths = Math.max(1, Math.round(safeNumber(values.drawMonths, 12)));
  const locRatePercent = Math.max(0, safeNumber(values.locRatePercent, 9.5));
  const locAnnualFee = Math.max(0, safeNumber(values.locAnnualFee, 50));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 9));
  const repayMonths = Math.max(1, Math.round(safeNumber(values.repayMonths, 36)));

  const li = locRatePercent / 100 / 12;
  const ki = loanRatePercent / 100 / 12;
  // Line: spend (and draw) in equal amounts at the start of each month.
  let locDrawInterest = 0;
  for (let k = 1; k <= drawMonths; k++) locDrawInterest += ((amountNeeded * k) / drawMonths) * li;
  const locRepay = payment(amountNeeded, li, repayMonths) * repayMonths - amountNeeded;
  const years = (drawMonths + repayMonths) / 12;
  const loc = locDrawInterest + locRepay + locAnnualFee * Math.ceil(years);
  // Loan: the full amount is borrowed on day one; interest-only while you
  // spend it, then repaid over the same months.
  const loan = amountNeeded * ki * drawMonths + (payment(amountNeeded, ki, repayMonths) * repayMonths - amountNeeded);

  return {
    lineOfCreditCost: round2(loc),
    lumpSumLoanCost: round2(loan),
    lineOfCreditSaves: round2(loan - loc),
  };
};

// --- 7. Line of Credit Eligibility Calculator --------------------------------
export const lineOfCreditEligibilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 6000));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 1500));
  const requestedLimit = Math.max(0, safeNumber(values.requestedLimit, 20000));
  const assumedPaymentPercent = Math.max(0, safeNumber(values.assumedPaymentPercent, 3));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 43));
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 700)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 680)));

  const assumed = (requestedLimit * assumedPaymentPercent) / 100;
  const dti = ((monthlyDebts + assumed) / grossMonthlyIncome) * 100;
  const room = (grossMonthlyIncome * maxDtiPercent) / 100 - monthlyDebts;

  return {
    assumedPayment: round2(assumed),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    largestLimitUnderDti: assumedPaymentPercent > 0 ? round2(Math.max(0, room) / (assumedPaymentPercent / 100)) : 0,
    scoreMargin: Math.round(creditScore - lenderMinScore),
  };
};

// --- 8. Credit Builder Loan Calculator ---------------------------------------
export const creditBuilderLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 1000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 15.9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const fees = Math.max(0, safeNumber(values.fees, 9));
  const savingsApyPercent = Math.max(0, safeNumber(values.savingsApyPercent, 0.5));

  const pmt = payment(loanAmount, aprPercent / 100 / 12, termMonths);
  const totalPaid = pmt * termMonths + fees;
  const earned = loanAmount * (Math.pow(1 + savingsApyPercent / 100, termMonths / 12) - 1);
  const received = loanAmount + earned;
  const net = totalPaid - received;

  return {
    monthlyPayment: round2(pmt),
    totalPaid: round2(totalPaid),
    amountYouGetBack: round2(received),
    netCost: round2(net),
    costPerMonthOfHistory: round2(net / termMonths),
  };
};

// --- 9. Credit Builder Loan Payment Calculator (budget -> loan size) ---------
export const creditBuilderLoanPaymentCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 50));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 15.9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  const loan = presentValue(monthlyBudget, aprPercent / 100 / 12, termMonths);

  return {
    loanAmount: round2(loan),
    totalPaid: round2(monthlyBudget * termMonths),
    interestCost: round2(monthlyBudget * termMonths - loan),
    savedAtTheEnd: round2(loan),
  };
};

// --- 10. Credit Builder Loan Cost Calculator (vs secured card) ---------------
export const creditBuilderLoanCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 1000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 15.9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const loanFees = Math.max(0, safeNumber(values.loanFees, 9));
  const cardAnnualFee = Math.max(0, safeNumber(values.cardAnnualFee, 29));
  const cardDeposit = Math.max(0, safeNumber(values.cardDeposit, 300));

  const builder = payment(loanAmount, aprPercent / 100 / 12, termMonths) * termMonths - loanAmount + loanFees;
  const card = cardAnnualFee * Math.ceil(termMonths / 12);

  return {
    creditBuilderCost: round2(builder),
    securedCardCost: round2(card),
    securedCardSaves: round2(builder - card),
    cashTiedUpInCard: round2(cardDeposit),
    savingsBuiltByLoan: round2(loanAmount),
  };
};

// --- 11. Credit Builder Loan Payoff Calculator (early payoff) ----------------
export const creditBuilderLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 1000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 15.9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const payoffMonth = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.payoffMonth, 12))));

  const i = aprPercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const full = pmt * termMonths - loanAmount;
  const bal = balanceAfter(loanAmount, i, pmt, payoffMonth);
  const paidByThen = pmt * payoffMonth - (loanAmount - bal);

  return {
    payoffAmount: round2(bal),
    interestIfKeptToTerm: round2(full),
    interestIfPaidOffEarly: round2(paidByThen),
    interestSaved: round2(full - paidByThen),
    monthsOfHistoryGivenUp: termMonths - payoffMonth,
  };
};

export const creditLineBuilderCustomCalculators: Record<string, CustomCalculator> = {
  "line-of-credit-calculator": lineOfCreditCalculator,
  "line-of-credit-payment-calculator": lineOfCreditPaymentCalculator,
  "line-of-credit-payoff-calculator": lineOfCreditPayoffCalculator,
  "line-of-credit-interest-calculator": lineOfCreditInterestCalculator,
  "line-of-credit-affordability-calculator": lineOfCreditAffordabilityCalculator,
  "line-of-credit-comparison-calculator": lineOfCreditComparisonCalculator,
  "line-of-credit-eligibility-calculator": lineOfCreditEligibilityCalculator,
  "credit-builder-loan-calculator": creditBuilderLoanCalculator,
  "credit-builder-loan-payment-calculator": creditBuilderLoanPaymentCalculator,
  "credit-builder-loan-cost-calculator": creditBuilderLoanCostCalculator,
  "credit-builder-loan-payoff-calculator": creditBuilderLoanPayoffCalculator,
};
