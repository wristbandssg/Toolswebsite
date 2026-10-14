/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 4 of 10
 * — Home Buying & Mortgage Terms (6 tools). See
 * calc-engine-fin3-derivatives-tax.ts for the full batch context.
 *
 *  - earnestMoney: deposit as a % of price and the cash still due at
 *    closing after it is credited.
 *  - giftOfEquity: market value − family sale price, LTV and down payment
 *    it covers, and the part above the 2026 gift-tax annual exclusion
 *    ($19,000 per donor per recipient) that needs a Form 709.
 *  - mortgagePenalty: prepayment penalty — 3 months' interest, Canadian
 *    interest rate differential (IRD), or a % of balance; fixed-rate
 *    Canadian mortgages charge the greater of 3 months and IRD.
 *  - mortgageRate: the payment at your rate and at ±0.5 / ±1 point, and
 *    the rate implied by a quoted payment (bisection).
 *  - pagIbigHousingLoan: Philippine Pag-IBIG Fund housing loan — monthly
 *    amortisation, the 35%-of-gross-income test, max loan and age at
 *    maturity (≤ 70). Rate defaults: 5.75% (1-year repricing), 6.25%
 *    (3-year), 3% Affordable Housing Program.
 *  - whatToOffer: an offer range from comparable value, market type and
 *    days on market (a heuristic, clearly labelled).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-homebuying-calculators.ts for the copy.
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

function payment(principal: number, annualRate: number, months: number): number {
  const i = annualRate / 12;
  if (months <= 0) return 0;
  return i === 0 ? principal / months : (principal * i) / (1 - Math.pow(1 + i, -months));
}

// --- 1. Earnest Money Calculator -------------------------------------------------------
export const earnestMoneyCalculator: CustomCalculator = (values) => {
  const price = pos(values.purchasePrice, 400000);
  const em = pos(values.earnestPercent, 2) / 100;
  const down = pos(values.downPaymentPercent, 10) / 100;
  const closing = pos(values.closingCostPercent, 3) / 100;
  const deposit = price * em;
  const cashNeeded = price * down + price * closing;
  return {
    earnestMoney: round2(deposit),
    downPayment: round2(price * down),
    closingCosts: round2(price * closing),
    totalCashToClose: round2(cashNeeded),
    remainingAfterEarnest: round2(Math.max(0, cashNeeded - deposit)),
  };
};

// --- 2. Gift of Equity Calculator ------------------------------------------------------
export const giftOfEquityCalculator: CustomCalculator = (values) => {
  const value = pos(values.marketValue, 400000);
  const price = Math.min(value, pos(values.salePrice, 320000));
  const ltv = clamp(pos(values.loanToValue, 80), 0, 100) / 100;
  const donors = Math.max(1, Math.round(pos(values.donors, 2)));
  const recipients = Math.max(1, Math.round(pos(values.recipients, 2)));
  const gift = value - price;
  const loan = Math.min(price, value * ltv);
  const exclusion = 19000 * donors * recipients;
  return {
    giftOfEquity: round2(gift),
    giftPctOfValue: round2(value > 0 ? (gift / value) * 100 : 0),
    loanAmount: round2(loan),
    buyerCashNeeded: round2(Math.max(0, price - loan)),
    equityAtPurchase: round2(value - loan),
    annualExclusionCovered: round2(Math.min(gift, exclusion)),
    giftAboveExclusion: round2(Math.max(0, gift - exclusion)),
  };
};

// --- 3. Mortgage Penalty Calculator ----------------------------------------------------
export const mortgagePenaltyCalculator: CustomCalculator = (values) => {
  const balance = pos(values.balance, 300000);
  const rate = pos(values.contractRate, 5.5) / 100;
  const comparable = pos(values.comparableRate, 4.2) / 100;
  const months = pos(values.monthsRemaining, 30);
  const pct = pos(values.percentOfBalance, 2) / 100;
  const method = num(values.method, 1); // 1 Canada fixed (greater of), 2 3-months interest, 3 % of balance
  const threeMonths = balance * rate * 0.25;
  const ird = Math.max(0, balance * (rate - comparable) * (months / 12));
  const percent = balance * pct;
  const penalty = method === 3 ? percent : method === 2 ? threeMonths : Math.max(threeMonths, ird);
  return {
    threeMonthsInterest: round2(threeMonths),
    interestRateDifferential: round2(ird),
    percentOfBalancePenalty: round2(percent),
    penalty: round2(penalty),
    penaltyPctOfBalance: round2(balance > 0 ? (penalty / balance) * 100 : 0),
  };
};

// --- 4. Mortgage Rate Calculator -------------------------------------------------------
export const mortgageRateCalculator: CustomCalculator = (values) => {
  const loan = pos(values.loanAmount, 350000);
  const n = Math.round(pos(values.termYears, 30) * 12);
  const rate = num(values.interestRate, 6.5) / 100;
  const quoted = pos(values.quotedPayment, 0);
  const pay = (r: number) => payment(loan, r, n);
  let implied = 0;
  if (quoted > 0 && n > 0 && quoted > loan / n) {
    let lo = 0;
    let hi = 0.5;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (pay(mid) > quoted) hi = mid;
      else lo = mid;
    }
    implied = ((lo + hi) / 2) * 100;
  }
  const p0 = pay(rate);
  return {
    monthlyPayment: round2(p0),
    paymentMinus1: round2(pay(Math.max(0, rate - 0.01))),
    paymentMinusHalf: round2(pay(Math.max(0, rate - 0.005))),
    paymentPlusHalf: round2(pay(rate + 0.005)),
    paymentPlus1: round2(pay(rate + 0.01)),
    totalInterest: round2(p0 * n - loan),
    impliedRate: Math.round(implied * 1000) / 1000,
  };
};

// --- 5. Pag-IBIG Housing Loan Calculator -----------------------------------------------
export const pagIbigHousingLoanCalculator: CustomCalculator = (values) => {
  const loan = clamp(pos(values.loanAmount, 2000000), 0, 6000000);
  const years = clamp(Math.round(pos(values.termYears, 30)), 1, 30);
  const option = num(values.rateOption, 2);
  const rate = (option === 1 ? 5.75 : option === 2 ? 6.25 : option === 3 ? 3 : pos(values.customRate, 6.5)) / 100;
  const income = pos(values.grossMonthlyIncome, 50000);
  const age = pos(values.age, 35);
  const n = years * 12;
  const amort = payment(loan, rate, n);
  const maxPay = income * 0.35;
  const i = rate / 12;
  const maxLoan = Math.min(6000000, i === 0 ? maxPay * n : (maxPay * (1 - Math.pow(1 + i, -n))) / i);
  return {
    interestRateUsed: round2(rate * 100),
    monthlyAmortization: round2(amort),
    totalInterest: round2(amort * n - loan),
    incomeRequired: round2(amort / 0.35),
    maxLoanForIncome: round2(maxLoan),
    ageAtMaturity: round2(age + years),
    withinAgeLimit: age + years <= 70 ? 1 : 0,
  };
};

// --- 6. What To Offer On A House Calculator --------------------------------------------
const MARKET_ADJ: Record<number, number> = { 1: 0.02, 2: -0.01, 3: -0.04 };

export const whatToOfferCalculator: CustomCalculator = (values) => {
  const list = pos(values.listPrice, 450000);
  const comps = pos(values.compsValue, 440000);
  const dom = pos(values.daysOnMarket, 45);
  const market = num(values.marketType, 2);
  const repairs = pos(values.repairCosts, 5000);
  const ceiling = pos(values.maxBudget, 0);
  const value = (comps > 0 ? comps : list) - repairs;
  const domAdj = dom > 90 ? -0.04 : dom > 60 ? -0.02 : dom < 10 ? 0.01 : 0;
  const target = value * (1 + (MARKET_ADJ[market] ?? -0.01) + domAdj);
  const capped = ceiling > 0 ? Math.min(target, ceiling) : target;
  return {
    estimatedValue: round2(value),
    suggestedOffer: round2(capped),
    offerLow: round2(capped * 0.98),
    offerHigh: round2(capped * 1.02),
    offerVsListPct: round2(list > 0 ? (capped / list - 1) * 100 : 0),
  };
};

export const fin3HomebuyingCustomCalculators: Record<string, CustomCalculator> = {
  "earnest-money-calculator": earnestMoneyCalculator,
  "gift-of-equity-calculator": giftOfEquityCalculator,
  "mortgage-penalty-calculator": mortgagePenaltyCalculator,
  "mortgage-rate-calculator": mortgageRateCalculator,
  "pag-ibig-housing-loan-calculator": pagIbigHousingLoanCalculator,
  "what-to-offer-on-a-house-calculator": whatToOfferCalculator,
};
