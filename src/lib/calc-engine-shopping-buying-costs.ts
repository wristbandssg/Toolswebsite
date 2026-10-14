/**
 * Batch: "Shopping Calculators" → Buying Costs Calculators (3 tools). The
 * other 17 names in the user's car list already exist (auto-loan = car
 * payment, car-insurance-premium = insurance cost, car-loan-payoff-vs-trade-in
 * = negative equity, car-registration-fee = title transfer, car-auction-fee =
 * auction price, etc.) and were not rebuilt.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - carPriceCalculator: the highest sticker price a MONTHLY PAYMENT budget
 *    buys (reverse loan, solved for price after tax, fees and trade-in).
 *    car-affordability-calculator (existing) starts from INCOME instead;
 *    out-the-door-price-calculator (existing) goes forward from a known price.
 *  - carDownPaymentCalculator: how much to put down — the % rule vs the cash
 *    needed to hit a target payment — and what each choice does to the loan.
 *  - vehiclePropertyTaxCalculator: the yearly personal property tax on a
 *    car (assessed value × local rate, less state relief) and the next
 *    5 years as the car loses value. Not sales tax (car-sales-tax-calculator).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-buying-costs-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));

/** Loan amount a monthly payment repays over n months at annual rate %. */
function loanFromPayment(payment: number, ratePercent: number, months: number): number {
  const r = ratePercent / 1200;
  if (months <= 0) return 0;
  return r === 0 ? payment * months : (payment * (1 - Math.pow(1 + r, -months))) / r;
}

/** Monthly payment on a loan over n months at annual rate %. */
function paymentFromLoan(loan: number, ratePercent: number, months: number): number {
  const r = ratePercent / 1200;
  if (months <= 0 || loan <= 0) return 0;
  return r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months));
}

export const carPriceCalculator: CustomCalculator = (v) => {
  const payment = nonNeg(v.monthlyPayment);
  const months = whole(v.termMonths, 60);
  const loan = loanFromPayment(payment, nonNeg(v.interestRate), months);
  const tax = nonNeg(v.salesTaxRate) / 100;
  const fees = nonNeg(v.fees);
  const down = nonNeg(v.downPayment);
  const tradeIn = nonNeg(v.tradeInValue);
  // Sales tax on (price − trade-in), as in most US states:
  // loan = price + tax·(price − tradeIn) + fees − down − tradeIn.
  const price = Math.max(0, (loan + down - fees) / (1 + tax) + tradeIn);
  const salesTax = tax * Math.max(0, price - tradeIn);
  const totalPaid = payment * months;
  return {
    maxCarPrice: round2(price),
    loanAmount: round2(loan),
    salesTax: round2(salesTax),
    outTheDoorPrice: round2(price + salesTax + fees),
    totalInterest: round2(Math.max(0, totalPaid - loan)),
    totalCost: round2(totalPaid + down + tradeIn),
  };
};

export const carDownPaymentCalculator: CustomCalculator = (v) => {
  const price = nonNeg(v.carPrice);
  const tradeIn = Math.min(price, nonNeg(v.tradeInValue));
  const fees = nonNeg(v.fees);
  const otd = price + (nonNeg(v.salesTaxRate) / 100) * (price - tradeIn) + fees;
  const rate = nonNeg(v.interestRate);
  const months = whole(v.termMonths, 60);
  const toFinance = Math.max(0, otd - tradeIn);
  const ruleDown = Math.min(toFinance, price * (nonNeg(v.downPercent) / 100));
  const target = nonNeg(v.targetPayment);
  const targetDown = target > 0 ? Math.max(0, toFinance - loanFromPayment(target, rate, months)) : 0;
  const down = Math.max(ruleDown, targetDown);
  const loan = toFinance - down;
  const pay = paymentFromLoan(loan, rate, months);
  const interestZeroDown = paymentFromLoan(toFinance, rate, months) * months - toFinance;
  return {
    recommendedDownPayment: round2(down),
    downPaymentByRule: round2(ruleDown),
    downPaymentForTargetPayment: round2(targetDown),
    loanAmount: round2(loan),
    monthlyPayment: round2(pay),
    interestSavedVsZeroDown: round2(Math.max(0, interestZeroDown - (pay * months - loan))),
    loanToValue: price > 0 ? round2((loan / price) * 100) : 0,
  };
};

export const vehiclePropertyTaxCalculator: CustomCalculator = (v) => {
  const value = nonNeg(v.vehicleValue);
  const ratio = nonNeg(v.assessmentRatio) / 100;
  // Dropdown: 100 = rate per $100 of assessed value, 1000 = mills (per $1,000).
  const per = safeNumber(v.rateUnit) === 1000 ? 1000 : 100;
  const rate = nonNeg(v.taxRate) / per;
  const reliefShare = Math.min(1, nonNeg(v.reliefPercent) / 100);
  const reliefCap = nonNeg(v.reliefCapValue);
  const yearly = (val: number) => {
    const gross = val * ratio * rate;
    const capped = reliefCap > 0 ? Math.min(val, reliefCap) : val;
    const relief = capped * ratio * rate * reliefShare;
    return { gross, relief, net: gross - relief };
  };
  const now = yearly(value);
  const drop = Math.min(1, nonNeg(v.yearlyValueDrop) / 100);
  let fiveYear = 0;
  for (let y = 0; y < 5; y++) fiveYear += yearly(value * Math.pow(1 - drop, y)).net;
  return {
    annualTax: round2(now.net),
    assessedValue: round2(value * ratio),
    grossTaxBeforeRelief: round2(now.gross),
    stateRelief: round2(now.relief),
    monthlySetAside: round2(now.net / 12),
    effectiveTaxRate: value > 0 ? round2((now.net / value) * 100) : 0,
    fiveYearTax: round2(fiveYear),
  };
};

export const shoppingBuyingCostsCustomCalculators: Record<string, CustomCalculator> = {
  "car-price-calculator": carPriceCalculator,
  "car-down-payment-calculator": carDownPaymentCalculator,
  "vehicle-property-tax-calculator": vehiclePropertyTaxCalculator,
};
