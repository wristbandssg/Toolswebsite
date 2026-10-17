/**
 * Batch: "Real Estate Calculators" → Home Buying & Affordability (11 tools):
 *
 *  - cashToClose: down payment + closing costs + prepaids and escrow
 *    reserves − earnest money and credits.
 *  - fhaAffordability: most house an FHA loan allows under the 31/43 (or
 *    AUS 40/50) DTI limits with UFMIP financed and annual MIP, plus the
 *    front/back DTI of a target price (covers "FHA DTI").
 *  - texas/california/florida/newJerseyMortgageAffordability: the 28/36
 *    rule solved for price with each state's own tax rules — Texas school
 *    homestead exemption, California Prop 13 base + Mello-Roos, Florida
 *    homestead exemption + flood/wind insurance, New Jersey's high
 *    effective rate. One solver, state-specific tax functions.
 *  - appraisalGap: lender lends on the lower of price and appraisal; the
 *    gap, the extra cash and how much the seller must cut.
 *  - renovateOrMove: renovation (net of value added, financed) vs selling,
 *    buying and losing a low mortgage rate.
 *  - walkScore: amenity distances with a distance-decay curve and a street
 *    connectivity penalty — an estimate of a Walk Score-style rating.
 *  - canadaRentVsBuy: Canadian mortgage (semi-annual compounding), CMHC
 *    premium and provincial land transfer tax vs renting and investing.
 *  - hoaLoan: an association loan turned into a per-unit assessment.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-buying-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;

/** Monthly principal & interest on a fully amortizing loan. */
function pmt(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Balance left after `months` payments. */
function balanceAfter(principal: number, annualRatePct: number, years: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  const p = pmt(principal, annualRatePct, years);
  if (r === 0) return Math.max(0, principal - p * months);
  return Math.max(0, principal * Math.pow(1 + r, months) - (p * (Math.pow(1 + r, months) - 1)) / r);
}

export const cashToClose: CustomCalculator = (v) => {
  const price = nonNeg(v.homePrice);
  const down = (price * nonNeg(v.downPaymentPercent)) / 100;
  const loan = price - down;
  const closing = (price * nonNeg(v.closingCostPercent)) / 100;
  const taxMonthly = (price * nonNeg(v.propertyTaxRate)) / 100 / 12;
  const insYear = nonNeg(v.annualInsurance);
  const reserveMonths = nonNeg(v.escrowMonths);
  const prepaidInterest = ((loan * nonNeg(v.interestRate)) / 100 / 365) * nonNeg(v.prepaidInterestDays);
  const prepaids = insYear + reserveMonths * (taxMonthly + insYear / 12) + prepaidInterest;
  const credits = nonNeg(v.earnestMoney) + nonNeg(v.sellerCredit) + nonNeg(v.lenderCredit);
  return {
    cashToClose: round2(Math.max(0, down + closing + prepaids - credits)),
    downPayment: round2(down),
    closingCosts: round2(closing),
    prepaidsAndEscrow: round2(prepaids),
    prepaidInterest: round2(prepaidInterest),
    credits: round2(credits),
    loanAmount: round2(loan),
  };
};

/** Largest price whose monthly payment fits `allowed` (payment rises with price). */
function solvePrice(allowed: number, payment: (price: number) => number): number {
  if (allowed <= 0 || payment(0) >= allowed) return 0;
  let lo = 0;
  let hi = 100_000_000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (payment(mid) <= allowed) lo = mid;
    else hi = mid;
  }
  return lo;
}

export const fhaAffordability: CustomCalculator = (v) => {
  const income = nonNeg(v.annualIncome) / 12;
  const debts = nonNeg(v.monthlyDebts);
  const downPct = Math.max(3.5, nonNeg(v.downPaymentPercent, 3.5));
  const rate = nonNeg(v.interestRate);
  const years = nonNeg(v.loanTerm, 30) || 30;
  const tax = nonNeg(v.propertyTaxRate) / 100;
  const ins = nonNeg(v.annualInsurance) / 12;
  const hoa = nonNeg(v.monthlyHoa);
  const aus = yes(v.ausApproval);
  const front = aus ? 0.4 : 0.31;
  const back = aus ? 0.5 : 0.43;
  // Annual MIP (2023+): 0.55% over 95% LTV, 0.50% otherwise (30-year, base loan up to $726,200); 15-year loans 0.15%/0.40%.
  const mipRate = years <= 15 ? (downPct >= 10 ? 0.15 : 0.4) : downPct >= 5 ? 0.5 : 0.55;
  const parts = (price: number) => {
    const base = price * (1 - downPct / 100);
    const loan = base * 1.0175; // UFMIP 1.75% financed
    const pi = pmt(loan, rate, years);
    const mip = (base * mipRate) / 100 / 12;
    return { base, loan, pi, mip, total: pi + mip + (price * tax) / 12 + ins + hoa };
  };
  const allowed = Math.min(front * income, back * income - debts);
  const maxPrice = solvePrice(allowed, (p) => parts(p).total);
  const m = parts(maxPrice);
  const target = nonNeg(v.targetPrice);
  const t = parts(target);
  const limit = nonNeg(v.countyLoanLimit);
  return {
    maxHomePrice: round2(maxPrice),
    maxLoanWithUfmip: round2(m.loan),
    monthlyPayment: round2(m.total),
    monthlyMip: round2(m.mip),
    downPayment: round2(maxPrice * (downPct / 100)),
    targetFrontEndDti: income > 0 && target > 0 ? round2((t.total / income) * 100) : 0,
    targetBackEndDti: income > 0 && target > 0 ? round2(((t.total + debts) / income) * 100) : 0,
    targetQualifies: target > 0 && t.total <= front * income && t.total + debts <= back * income && (!limit || t.base <= limit) ? 1 : 0,
    overCountyLimit: limit > 0 && m.base > limit ? 1 : 0,
  };
};

type TaxFn = (price: number, rate: number, homestead: boolean) => number;

function stateAffordability(v: Record<string, number>, yearlyTax: TaxFn) {
  const income = nonNeg(v.annualIncome) / 12;
  const debts = nonNeg(v.monthlyDebts);
  const down = nonNeg(v.downPayment);
  const rate = nonNeg(v.interestRate);
  const years = nonNeg(v.loanTerm, 30) || 30;
  const taxRate = nonNeg(v.propertyTaxRate) / 100;
  const homestead = yes(v.homestead);
  const fixed = nonNeg(v.annualInsurance) / 12 + nonNeg(v.extraAnnualCosts) / 12 + nonNeg(v.monthlyHoa);
  const parts = (price: number) => {
    const loan = Math.max(0, price - down);
    const pi = pmt(loan, rate, years);
    const pmi = price > 0 && loan / price > 0.8 ? (loan * nonNeg(v.pmiRate, 0.5)) / 100 / 12 : 0;
    const tax = yearlyTax(price, taxRate, homestead) / 12;
    return { loan, pi, pmi, tax, total: pi + pmi + tax + fixed };
  };
  const allowed = Math.min(0.28 * income, 0.36 * income - debts);
  const price = solvePrice(allowed, (p) => parts(p).total);
  const m = parts(price);
  return {
    maxHomePrice: round2(price),
    loanAmount: round2(m.loan),
    monthlyPayment: round2(m.total),
    principalAndInterest: round2(m.pi),
    monthlyPropertyTax: round2(m.tax),
    monthlyPmi: round2(m.pmi),
    backEndDti: income > 0 ? round2(((m.total + debts) / income) * 100) : 0,
  };
}

// Texas: 2025 school-district homestead exemption is $140,000; school taxes are about half of a typical total rate.
const texasTax: TaxFn = (price, rate, homestead) => Math.max(0, price * rate - (homestead ? Math.min(price, 140_000) * rate * 0.5 : 0));
// California: Prop 13 — rate (1% base + local voter debt) on the purchase price.
const californiaTax: TaxFn = (price, rate) => price * rate;
// Florida: first $25,000 exempt from all taxes, the $50,000–$75,000 slice exempt from non-school taxes (~60% of millage).
const floridaTax: TaxFn = (price, rate, homestead) =>
  Math.max(0, price * rate - (homestead ? Math.min(price, 25_000) * rate + Math.min(25_000, Math.max(0, price - 50_000)) * rate * 0.6 : 0));
// New Jersey: no general homestead exemption on the bill (ANCHOR/Stay NJ are separate rebates).
const newJerseyTax: TaxFn = (price, rate) => price * rate;

export const texasMortgageAffordability: CustomCalculator = (v) => stateAffordability(v, texasTax);
export const californiaMortgageAffordability: CustomCalculator = (v) => stateAffordability(v, californiaTax);
export const floridaMortgageAffordability: CustomCalculator = (v) => stateAffordability(v, floridaTax);
export const newJerseyMortgageAffordability: CustomCalculator = (v) => stateAffordability(v, newJerseyTax);

export const appraisalGap: CustomCalculator = (v) => {
  const price = nonNeg(v.contractPrice);
  const appraisal = nonNeg(v.appraisedValue);
  const downPct = nonNeg(v.downPaymentPercent) / 100;
  const gap = Math.max(0, price - appraisal);
  const lendBase = Math.min(price, appraisal);
  const loan = lendBase * (1 - downPct);
  const cashNeeded = price - loan;
  const planned = price * downPct;
  const covered = Math.min(gap, nonNeg(v.gapCoverage));
  return {
    appraisalGap: round2(gap),
    loanAmount: round2(loan),
    cashNeededAtClose: round2(cashNeeded),
    extraCashVsPlan: round2(cashNeeded - planned),
    buyerCoversUnderClause: round2(covered),
    sellerReductionNeeded: round2(gap - covered),
    gapPercent: price > 0 ? round2((gap / price) * 100) : 0,
  };
};

/** Interest paid over the first `months` of a loan. */
function interestOver(principal: number, rate: number, years: number, months: number): number {
  const m = Math.min(months, Math.round(years * 12));
  return pmt(principal, rate, years) * m - (principal - balanceAfter(principal, rate, years, m));
}

export const renovateOrMove: CustomCalculator = (v) => {
  const value = nonNeg(v.homeValue);
  const balance = nonNeg(v.mortgageBalance);
  const oldRate = nonNeg(v.currentRate);
  const remaining = nonNeg(v.remainingYears, 25) || 25;
  const months = Math.round(nonNeg(v.yearsToCompare, 7) * 12);
  const reno = nonNeg(v.renovationCost);
  const added = (reno * nonNeg(v.valueAddedPercent)) / 100;
  const renoRate = nonNeg(v.renovationRate);
  const renoInterest = interestOver(reno, renoRate, 15, months);
  const renovateCost = reno - added + renoInterest;

  const newPrice = nonNeg(v.newHomePrice);
  const selling = (value * nonNeg(v.sellingCostPercent)) / 100;
  const buying = (newPrice * nonNeg(v.buyingCostPercent)) / 100;
  const equity = Math.max(0, value - balance - selling);
  const newLoan = Math.max(0, newPrice - equity + buying);
  const newRate = nonNeg(v.newRate);
  const extraInterest = interestOver(newLoan, newRate, 30, months) - interestOver(balance, oldRate, remaining, months);
  const moveCost = selling + buying + nonNeg(v.movingCost) + extraInterest;
  return {
    renovateNetCost: round2(renovateCost),
    moveNetCost: round2(moveCost),
    savingsOfCheaperOption: round2(Math.abs(moveCost - renovateCost)),
    renovateIsCheaper: renovateCost <= moveCost ? 1 : 0,
    monthlyPaymentIfRenovate: round2(pmt(balance, oldRate, remaining) + pmt(reno, renoRate, 15)),
    monthlyPaymentIfMove: round2(pmt(newLoan, newRate, 30)),
    transactionCostsToMove: round2(selling + buying + nonNeg(v.movingCost)),
  };
};

/** 1 within a 5-minute walk (0.25 mi), easing to 0 at a 30-minute walk (1.5 mi). */
function decay(miles: number): number {
  if (miles <= 0.25) return 1;
  if (miles >= 1.5) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * (miles - 0.25)) / 1.25));
}

export const walkScore: CustomCalculator = (v) => {
  const items: [number, number][] = [
    [v.groceryMiles, 3], [v.restaurantMiles, 3], [v.shoppingMiles, 2], [v.coffeeMiles, 2], [v.schoolMiles, 1],
    [v.parkMiles, 1], [v.bankMiles, 1], [v.entertainmentMiles, 1], [v.transitMiles, 1],
  ];
  const totalWeight = items.reduce((s, [, w]) => s + w, 0);
  const raw = (items.reduce((s, [d, w]) => s + w * decay(nonNeg(d, 2)), 0) / totalWeight) * 100;
  const inter = nonNeg(v.intersectionsPerSqMile);
  const block = nonNeg(v.avgBlockFeet);
  const interPenalty = inter >= 200 ? 0 : inter >= 150 ? 1 : inter >= 120 ? 2 : inter >= 90 ? 3 : inter >= 60 ? 4 : 5;
  const blockPenalty = block <= 400 ? 0 : block <= 500 ? 1 : block <= 550 ? 2 : block <= 600 ? 3 : block <= 650 ? 4 : 5;
  const score = Math.max(0, Math.round(raw * (1 - (interPenalty + blockPenalty) / 100)));
  return {
    walkScore: score,
    ratingBand: score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 25 ? 2 : 1,
    amenityScoreBeforePenalty: round2(raw),
    streetPenaltyPercent: interPenalty + blockPenalty,
  };
};

/** Marginal brackets: [upper bound, rate %]. */
function bracketTax(amount: number, brackets: [number, number][]): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of brackets) {
    if (amount <= lower) break;
    tax += ((Math.min(amount, upper) - lower) * rate) / 100;
    lower = upper;
  }
  return tax;
}

const ON: [number, number][] = [[55_000, 0.5], [250_000, 1], [400_000, 1.5], [2_000_000, 2], [Infinity, 2.5]];
const TORONTO: [number, number][] = [
  [55_000, 0.5], [250_000, 1], [400_000, 1.5], [2_000_000, 2], [3_000_000, 2.5], [4_000_000, 4.5],
  [5_000_000, 5.5], [10_000_000, 6.5], [20_000_000, 7.5], [Infinity, 8.6],
];
const BC: [number, number][] = [[200_000, 1], [2_000_000, 2], [3_000_000, 3], [Infinity, 5]];
const QC: [number, number][] = [[61_500, 0.5], [307_800, 1], [Infinity, 1.5]];

/** Land transfer tax by province: 0 Ontario, 1 Toronto, 2 BC, 3 Alberta, 4 Quebec. */
function canadaLtt(price: number, province: number, firstTime: boolean): number {
  if (province === 1) {
    const on = bracketTax(price, ON) - (firstTime ? 4000 : 0);
    const to = bracketTax(price, TORONTO) - (firstTime ? 4475 : 0);
    return Math.max(0, on) + Math.max(0, to);
  }
  if (province === 2) {
    const tax = bracketTax(price, BC);
    if (!firstTime || price > 860_000) return tax;
    const relief = bracketTax(500_000, BC) * (price <= 835_000 ? 1 : (860_000 - price) / 25_000);
    return Math.max(0, tax - relief);
  }
  if (province === 3) return 50 + Math.ceil(price / 5000) * 5; // Alberta title transfer fee, no tax
  if (province === 4) return bracketTax(price, QC);
  return Math.max(0, bracketTax(price, ON) - (firstTime ? 4000 : 0));
}

/** Canadian fixed-rate mortgages compound semi-annually. */
function canadaPmt(principal: number, ratePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = Math.pow(1 + ratePct / 100 / 2, 1 / 6) - 1;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export const canadaRentVsBuy: CustomCalculator = (v) => {
  const price = nonNeg(v.homePrice);
  const downPct = Math.max(5, nonNeg(v.downPaymentPercent, 20));
  const down = (price * downPct) / 100;
  const amort = nonNeg(v.amortization, 25) || 25;
  const premiumRate = downPct >= 20 ? 0 : (downPct >= 15 ? 2.8 : downPct >= 10 ? 3.1 : 4.0) + (amort > 25 ? 0.2 : 0);
  const base = price - down;
  const cmhc = (base * premiumRate) / 100;
  const loan = base + cmhc;
  const rate = nonNeg(v.interestRate);
  const payment = canadaPmt(loan, rate, amort);
  const years = Math.max(1, Math.round(nonNeg(v.yearsToCompare, 10)));
  const months = years * 12;
  const r = Math.pow(1 + rate / 100 / 2, 1 / 6) - 1;
  let bal = loan;
  let interest = 0;
  for (let i = 0; i < months && bal > 0; i++) {
    const int = bal * r;
    interest += int;
    bal = Math.max(0, bal - (payment - int));
  }
  const growth = nonNeg(v.appreciationRate) / 100;
  const future = price * Math.pow(1 + growth, years);
  const ltt = canadaLtt(price, Math.round(nonNeg(v.province)), yes(v.firstTimeBuyer));
  const closing = ltt + nonNeg(v.otherClosingCosts);
  const ownCosts = (price * (nonNeg(v.propertyTaxRate) + nonNeg(v.maintenanceRate)) / 100 + nonNeg(v.annualInsurance)) * years;
  const sellCost = (future * nonNeg(v.sellingCostPercent)) / 100;
  const buyNet = interest + ownCosts + closing + sellCost + cmhc - (future - price);
  const invest = nonNeg(v.investmentReturn) / 100;
  const rentGrowth = nonNeg(v.rentIncrease) / 100;
  let rentTotal = 0;
  for (let y = 0; y < years; y++) rentTotal += (nonNeg(v.monthlyRent) * 12 + nonNeg(v.rentersInsurance)) * Math.pow(1 + rentGrowth, y);
  const lostReturn = (down + closing) * (Math.pow(1 + invest, years) - 1);
  const buyCostWithOpportunity = buyNet + lostReturn;
  return {
    netCostOfBuying: round2(buyCostWithOpportunity),
    netCostOfRenting: round2(rentTotal),
    buyingSaves: round2(rentTotal - buyCostWithOpportunity),
    monthlyMortgagePayment: round2(payment),
    cmhcPremium: round2(cmhc),
    landTransferTax: round2(ltt),
    equityAtEnd: round2(future - bal - sellCost),
  };
};

export const hoaLoan: CustomCalculator = (v) => {
  const loan = nonNeg(v.loanAmount);
  const units = Math.max(1, Math.round(nonNeg(v.units, 1)));
  const share = nonNeg(v.unitSharePercent) > 0 ? nonNeg(v.unitSharePercent) / 100 : 1 / units;
  const payment = pmt(loan, nonNeg(v.interestRate), nonNeg(v.loanTerm, 10) || 10);
  const months = Math.round((nonNeg(v.loanTerm, 10) || 10) * 12);
  return {
    perUnitMonthly: round2(payment * share),
    associationMonthlyPayment: round2(payment),
    perUnitTotalPaid: round2(payment * months * share),
    perUnitInterest: round2((payment * months - loan) * share),
    specialAssessmentInstead: round2(loan * share),
    totalInterest: round2(payment * months - loan),
  };
};

export const reBuyingCustomCalculators: Record<string, CustomCalculator> = {
  "cash-to-close-calculator": cashToClose,
  "fha-affordability-calculator": fhaAffordability,
  "texas-mortgage-affordability-calculator": texasMortgageAffordability,
  "california-mortgage-affordability-calculator": californiaMortgageAffordability,
  "florida-mortgage-affordability-calculator": floridaMortgageAffordability,
  "nj-mortgage-affordability-calculator": newJerseyMortgageAffordability,
  "appraisal-gap-calculator": appraisalGap,
  "renovate-or-move-calculator": renovateOrMove,
  "walk-score-calculator": walkScore,
  "canada-rent-vs-buy-calculator": canadaRentVsBuy,
  "hoa-loan-calculator": hoaLoan,
};
