/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 6 of 10
 * — Debt, Annuities & Sales Tools (8 tools). See
 * calc-engine-fin3-derivatives-tax.ts for the full batch context.
 *
 *  - debtAvalanche: month-by-month payoff of up to 5 debts, extra money to
 *    the highest APR first, compared with the snowball order (smallest
 *    balance first) — months, interest and the saving. Different from the
 *    existing debt-snowball-calculator (snowball only, 3 debts).
 *  - deferredPaymentLoan: interest capitalised (or paid) during a
 *    deferment, then the payment over the remaining term, vs no deferment.
 *  - financeCharge: credit card finance charge by the average daily
 *    balance method (starting balance, one purchase and one payment).
 *  - postJudgmentInterest: federal (28 U.S.C. § 1961 — weekly 1-year
 *    Treasury rate, compounded annually) or simple state interest, per
 *    diem.
 *  - growingAnnuity: PV = P ÷ (r − g) × (1 − ((1 + g) ÷ (1 + r))^n),
 *    FV = P × ((1 + r)^n − (1 + g)^n) ÷ (r − g) (n·P·(1 + r)^(n−1) when
 *    r = g); × (1 + r) for payments at the start.
 *  - variableAnnuity: yearly growth net of M&E, admin, fund and rider fees
 *    vs the same money in a low-cost index fund.
 *  - checkDigit: UPC-A, EAN-13, ISBN-10 (10 = X) and Luhn (credit cards,
 *    IMEI) check digits; leading zeros are restored by length.
 *  - marginWithDiscount: margin and profit after a discount, and the
 *    largest discount that keeps a target margin.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-debt-retire-sales-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. Debt Avalanche Calculator ------------------------------------------------------
interface Debt {
  bal: number;
  apr: number;
  min: number;
}

function simulate(debts: Debt[], extra: number, order: (a: Debt, b: Debt) => number): { months: number; interest: number } {
  const ds = debts.map((d) => ({ ...d }));
  const budget = ds.reduce((s, d) => s + d.min, 0) + extra;
  let months = 0;
  let interest = 0;
  while (ds.some((d) => d.bal > 0.005) && months < 1200) {
    months++;
    for (const d of ds) {
      if (d.bal <= 0) continue;
      const i = (d.bal * d.apr) / 12;
      d.bal += i;
      interest += i;
    }
    let left = budget;
    for (const d of ds) {
      if (d.bal <= 0) continue;
      const p = Math.min(d.min, d.bal, left);
      d.bal -= p;
      left -= p;
    }
    for (const d of [...ds].filter((x) => x.bal > 0).sort(order)) {
      const p = Math.min(d.bal, left);
      d.bal -= p;
      left -= p;
      if (left <= 0) break;
    }
  }
  return { months, interest };
}

export const debtAvalancheCalculator: CustomCalculator = (values) => {
  const debts: Debt[] = [];
  for (let k = 1; k <= 5; k++) {
    const bal = pos(values[`balance${k}`], 0);
    if (bal > 0) debts.push({ bal, apr: pos(values[`apr${k}`], 0) / 100, min: pos(values[`minPayment${k}`], 0) });
  }
  const extra = pos(values.extraPayment, 200);
  if (!debts.length) return { avalancheMonths: 0, avalancheInterest: 0, snowballMonths: 0, snowballInterest: 0, interestSaved: 0, totalDebt: 0 };
  const av = simulate(debts, extra, (a, b) => b.apr - a.apr);
  const sb = simulate(debts, extra, (a, b) => a.bal - b.bal);
  return {
    totalDebt: round2(debts.reduce((s, d) => s + d.bal, 0)),
    avalancheMonths: av.months,
    avalancheInterest: round2(av.interest),
    snowballMonths: sb.months,
    snowballInterest: round2(sb.interest),
    interestSaved: round2(sb.interest - av.interest),
  };
};

// --- 2. Deferred Payment Loan Calculator -----------------------------------------------
export const deferredPaymentLoanCalculator: CustomCalculator = (values) => {
  const loan = pos(values.loanAmount, 20000);
  const i = pos(values.apr, 8) / 100 / 12;
  const defer = Math.round(pos(values.deferralMonths, 6));
  const term = Math.max(1, Math.round(pos(values.repaymentMonths, 60)));
  const capitalize = num(values.interestTreatment, 1) === 1;
  const accrued = loan * (Math.pow(1 + i, defer) - 1);
  const principal = capitalize ? loan + accrued : loan;
  const pay = i === 0 ? principal / term : (principal * i) / (1 - Math.pow(1 + i, -term));
  const plain = i === 0 ? loan / term : (loan * i) / (1 - Math.pow(1 + i, -term));
  const totalInterest = pay * term - loan;
  return {
    interestDuringDeferral: round2(accrued),
    balanceWhenRepaymentStarts: round2(principal),
    monthlyPayment: round2(pay),
    totalInterest: round2(totalInterest),
    paymentWithoutDeferral: round2(plain),
    extraCostOfDeferral: round2(totalInterest - (plain * term - loan)),
  };
};

// --- 3. Finance Charge Calculator ------------------------------------------------------
export const financeChargeCalculator: CustomCalculator = (values) => {
  const days = clamp(Math.round(pos(values.cycleDays, 30)), 1, 31);
  const start = pos(values.startingBalance, 1500);
  const purchase = pos(values.purchaseAmount, 400);
  const pDay = clamp(Math.round(pos(values.purchaseDay, 10)), 1, days);
  const payment = pos(values.paymentAmount, 600);
  const payDay = clamp(Math.round(pos(values.paymentDay, 20)), 1, days);
  const apr = pos(values.apr, 24) / 100;
  let sum = 0;
  for (let d = 1; d <= days; d++) {
    let b = start;
    if (d >= pDay) b += purchase;
    if (d >= payDay) b -= payment;
    sum += Math.max(0, b);
  }
  const adb = sum / days;
  const dpr = apr / 365;
  const charge = adb * dpr * days;
  return {
    averageDailyBalance: round2(adb),
    dailyPeriodicRate: Math.round(dpr * 100 * 100000) / 100000,
    financeCharge: round2(charge),
    endingBalance: round2(Math.max(0, start + purchase - payment) + charge),
  };
};

// --- 4. Post Judgment Interest Calculator ----------------------------------------------
export const postJudgmentInterestCalculator: CustomCalculator = (values) => {
  const amount = pos(values.judgmentAmount, 50000);
  const rate = pos(values.interestRate, 3.6) / 100;
  const days = pos(values.daysOutstanding, 540);
  const federal = num(values.method, 1) === 1;
  const years = days / 365;
  let interest: number;
  if (federal) {
    const whole = Math.floor(years);
    const grown = amount * Math.pow(1 + rate, whole);
    interest = grown * (1 + rate * (years - whole)) - amount;
  } else interest = amount * rate * years;
  return {
    interest: round2(interest),
    totalOwed: round2(amount + interest),
    perDiem: round2((amount * rate) / 365),
  };
};

// --- 5. Growing Annuity Calculator -----------------------------------------------------
export const growingAnnuityCalculator: CustomCalculator = (values) => {
  const p = pos(values.firstPayment, 10000);
  const r = num(values.discountRate, 6) / 100;
  const g = num(values.growthRate, 3) / 100;
  const n = Math.max(0, Math.round(pos(values.periods, 20)));
  const due = num(values.timing, 1) === 2 ? 1 + r : 1;
  const same = Math.abs(r - g) < 1e-12;
  const pv = (same ? (n * p) / (1 + r) : (p / (r - g)) * (1 - Math.pow((1 + g) / (1 + r), n))) * due;
  const fv = (same ? n * p * Math.pow(1 + r, n - 1) : (p * (Math.pow(1 + r, n) - Math.pow(1 + g, n))) / (r - g)) * due;
  let total = 0;
  for (let k = 0; k < n; k++) total += p * Math.pow(1 + g, k);
  return {
    presentValue: round2(pv),
    futureValue: round2(fv),
    lastPayment: round2(n > 0 ? p * Math.pow(1 + g, n - 1) : 0),
    totalPayments: round2(total),
  };
};

// --- 6. Variable Annuity Calculator ----------------------------------------------------
export const variableAnnuityCalculator: CustomCalculator = (values) => {
  const premium = pos(values.initialPremium, 100000);
  const yearly = pos(values.yearlyContribution, 0);
  const gross = num(values.grossReturn, 7) / 100;
  const fees = (pos(values.mortalityExpenseFee, 1.25) + pos(values.adminFee, 0.15) + pos(values.fundExpenses, 0.8) + pos(values.riderFees, 1)) / 100;
  const indexFee = pos(values.indexFundFee, 0.1) / 100;
  const years = Math.round(pos(values.years, 20));
  let va = premium;
  let idx = premium;
  let feesPaid = 0;
  for (let y = 0; y < years; y++) {
    va += yearly;
    idx += yearly;
    const g = va * (1 + gross);
    feesPaid += g * fees;
    va = g * (1 - fees);
    idx = idx * (1 + gross) * (1 - indexFee);
  }
  return {
    totalFeeRate: round2(fees * 100),
    annuityValue: round2(va),
    totalFeesPaid: round2(feesPaid),
    lowCostFundValue: round2(idx),
    costOfFees: round2(idx - va),
  };
};

// --- 7. Check Digit Calculator ---------------------------------------------------------
const LENGTH: Record<number, number> = { 1: 11, 2: 12, 3: 9 };

export const checkDigitCalculator: CustomCalculator = (values) => {
  const type = num(values.codeType, 1); // 1 UPC-A, 2 EAN-13, 3 ISBN-10, 4 Luhn
  const raw = Math.floor(pos(values.digits, 3600029145));
  let s = String(raw);
  if (LENGTH[type]) s = s.padStart(LENGTH[type], "0").slice(-LENGTH[type]);
  const d = s.split("").map(Number);
  let check: number;
  if (type === 3) {
    const sum = d.reduce((a, x, i) => a + x * (10 - i), 0);
    check = (11 - (sum % 11)) % 11;
  } else if (type === 4) {
    let sum = 0;
    for (let i = d.length - 1, dbl = true; i >= 0; i--, dbl = !dbl) {
      let x = d[i] * (dbl ? 2 : 1);
      if (x > 9) x -= 9;
      sum += x;
    }
    check = (10 - (sum % 10)) % 10;
  } else {
    // UPC-A: odd positions (from left) ×3; EAN-13: even positions ×3.
    const sum = d.reduce((a, x, i) => a + x * ((type === 1 ? i % 2 === 0 : i % 2 === 1) ? 3 : 1), 0);
    check = (10 - (sum % 10)) % 10;
  }
  return {
    checkDigit: check,
    digitsUsed: s.length,
  };
};

// --- 8. Margin With Discount Calculator ------------------------------------------------
export const marginWithDiscountCalculator: CustomCalculator = (values) => {
  const cost = pos(values.unitCost, 40);
  const price = pos(values.listPrice, 100);
  const disc = clamp(pos(values.discountPercent, 20), 0, 100) / 100;
  const target = clamp(pos(values.targetMargin, 30), 0, 99.99) / 100;
  const sale = price * (1 - disc);
  const minPrice = cost / (1 - target);
  return {
    salePrice: round2(sale),
    marginBefore: round2(price > 0 ? ((price - cost) / price) * 100 : 0),
    marginAfter: round2(sale > 0 ? ((sale - cost) / sale) * 100 : 0),
    profitPerUnitAfter: round2(sale - cost),
    maxDiscountForTarget: round2(price > 0 ? Math.max(0, (1 - minPrice / price) * 100) : 0),
    salesIncreaseToKeepProfit: round2(sale - cost > 0 ? ((price - cost) / (sale - cost) - 1) * 100 : 0),
  };
};

export const fin3DebtRetireSalesCustomCalculators: Record<string, CustomCalculator> = {
  "debt-avalanche-calculator": debtAvalancheCalculator,
  "deferred-payment-loan-calculator": deferredPaymentLoanCalculator,
  "finance-charge-calculator": financeChargeCalculator,
  "post-judgment-interest-calculator": postJudgmentInterestCalculator,
  "growing-annuity-calculator": growingAnnuityCalculator,
  "variable-annuity-calculator": variableAnnuityCalculator,
  "check-digit-calculator": checkDigitCalculator,
  "margin-with-discount-calculator": marginWithDiscountCalculator,
};
