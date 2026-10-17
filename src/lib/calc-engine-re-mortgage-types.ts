/**
 * Batch: "Real Estate Calculators" → Mortgage Calculators — loan types,
 * equity and property/construction loans (13 tools):
 *
 *  - millionHouseMortgage: payment and income needed on a $1M home (jumbo
 *    above the 2026 $832,750 conforming limit).
 *  - assetDepletionMortgage: liquid assets (with lender haircuts) ÷ the
 *    depletion term = qualifying income → the most house it supports.
 *  - firstLienHelocVsMortgage: month-by-month, all income deposited into a
 *    first-lien HELOC vs a mortgage with the same surplus paid as extra
 *    principal — so the comparison is fair.
 *  - proprietaryReverseMortgage: jumbo reverse mortgage principal limit
 *    (approximate age/rate factor, up to $4M of value) vs a HECM capped at
 *    the 2026 $1,249,125 limit.
 *  - equityRelease: UK lifetime mortgage — max release by age and the
 *    roll-up interest owed over time.
 *  - manufacturedHomeRefinance: new payment, savings, break-even, LTV check
 *    for real-property vs chattel loans.
 *  - texas/alabama/ncLandLoan: one land-loan engine with each state's
 *    rules — Texas Veterans Land Board limits and ag valuation, Alabama
 *    current-use, North Carolina present-use value.
 *  - modularHomeMortgage: modular home + delivery, foundation, site work
 *    and land → construction-to-permanent loan and payment.
 *  - metalBuildingFinance: kit + foundation + erection → financed cost.
 *  - landEquityLoan: land equity used as the down payment on a
 *    construction loan under a loan-to-cost limit.
 *  - aduLoan: borrowing for an ADU against current equity (HELOC/cash-out)
 *    or after-completion value (renovation loan), offset by ADU rent.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-mortgage-types-calculators.ts for the copy.
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

const CONFORMING_LIMIT_2026 = 832_750;
const HECM_LIMIT_2026 = 1_249_125;

/** Largest x in [0, hi] with f(x) <= target, for f increasing in x. */
function solveMax(target: number, f: (x: number) => number, hi = 100_000_000): number {
  if (target <= 0 || f(0) > target) return 0;
  let lo = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) <= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

export const millionHouseMortgage: CustomCalculator = (v) => {
  const price = nonNeg(v.homePrice, 1_000_000);
  const down = (price * nonNeg(v.downPaymentPercent)) / 100;
  const loan = price - down;
  const pi = pmt(loan, nonNeg(v.interestRate), nonNeg(v.loanTerm, 30) || 30);
  const months = Math.round((nonNeg(v.loanTerm, 30) || 30) * 12);
  const pmi = loan / price > 0.8 ? (loan * nonNeg(v.pmiRate, 0.5)) / 100 / 12 : 0;
  const total = pi + pmi + (price * nonNeg(v.propertyTaxRate)) / 100 / 12 + nonNeg(v.annualInsurance) / 12 + nonNeg(v.monthlyHoa);
  const debts = nonNeg(v.monthlyDebts);
  return {
    monthlyPayment: round2(total),
    principalAndInterest: round2(pi),
    incomeNeeded: round2(Math.max(total / 0.28, (total + debts) / 0.36) * 12),
    downPayment: round2(down),
    loanAmount: round2(loan),
    isJumboLoan: loan > CONFORMING_LIMIT_2026 ? 1 : 0,
    totalInterest: round2(pi * months - loan),
  };
};

export const assetDepletionMortgage: CustomCalculator = (v) => {
  const retirementFactor = yes(v.over59) ? 0.7 : 0.6;
  const gross = nonNeg(v.cashAssets) + nonNeg(v.investmentAssets) * 0.7 + nonNeg(v.retirementAssets) * retirementFactor;
  const usable = Math.max(0, gross - nonNeg(v.downPayment) - nonNeg(v.closingCosts) - nonNeg(v.reservesRequired));
  const months = nonNeg(v.depletionMonths, 360) || 360;
  const assetIncome = usable / months;
  const income = assetIncome + nonNeg(v.otherMonthlyIncome);
  const allowed = income * (nonNeg(v.dtiLimit, 43) / 100) - nonNeg(v.monthlyDebts);
  const rate = nonNeg(v.interestRate);
  const years = nonNeg(v.loanTerm, 30) || 30;
  const carry = (nonNeg(v.propertyTaxRate) + nonNeg(v.insuranceRate)) / 100 / 12;
  const down = nonNeg(v.downPayment);
  const price = solveMax(allowed, (p) => pmt(Math.max(0, p - down), rate, years) + p * carry);
  return {
    qualifyingMonthlyIncome: round2(income),
    incomeFromAssets: round2(assetIncome),
    eligibleAssets: round2(usable),
    maxHousingPayment: round2(Math.max(0, allowed)),
    maxHomePrice: round2(price),
    maxLoanAmount: round2(Math.max(0, price - down)),
  };
};

export const firstLienHelocVsMortgage: CustomCalculator = (v) => {
  const start = nonNeg(v.balance);
  const income = nonNeg(v.monthlyIncome);
  const expenses = nonNeg(v.monthlyExpenses);
  const helocRate = nonNeg(v.helocRate) / 100 / 12;
  const mortRate = nonNeg(v.mortgageRate);
  const years = nonNeg(v.remainingYears, 30) || 30;
  const payment = pmt(start, mortRate, years);
  const surplus = income - expenses;

  let b = start;
  let helocInterest = 0;
  let helocMonths = 0;
  while (b > 0 && helocMonths < 600) {
    const avg = Math.max(0, b - income + expenses / 2);
    const interest = avg * helocRate;
    helocInterest += interest;
    b = b - income + expenses + interest;
    helocMonths++;
  }
  if (b > 0) helocMonths = 600;

  // Same cash: the mortgage payment plus whatever surplus is left as extra principal.
  const extra = Math.max(0, surplus - payment);
  const r = mortRate / 100 / 12;
  let m = start;
  let mortInterest = 0;
  let mortMonths = 0;
  while (m > 0.005 && mortMonths < 600) {
    const interest = m * r;
    mortInterest += interest;
    m = m + interest - Math.min(m + interest, payment + extra);
    mortMonths++;
  }
  return {
    helocPayoffYears: round2(helocMonths / 12),
    mortgagePayoffYears: round2(mortMonths / 12),
    helocTotalInterest: round2(helocInterest),
    mortgageTotalInterest: round2(mortInterest),
    helocSaves: round2(mortInterest - helocInterest),
    mortgagePayment: round2(payment),
    monthlySurplus: round2(surplus),
  };
};

/** Approximate principal limit factors (share of value you can borrow). */
function proprietaryFactor(age: number, rate: number) {
  return Math.min(0.6, Math.max(0.1, 0.22 + (age - 55) * 0.0085 - (rate - 7) * 0.03));
}
function hecmFactor(age: number, rate: number) {
  if (age < 62) return 0;
  return Math.min(0.75, Math.max(0.1, 0.36 + (age - 62) * 0.0075 - (rate - 6.5) * 0.04));
}

export const proprietaryReverseMortgage: CustomCalculator = (v) => {
  const value = nonNeg(v.homeValue);
  const age = nonNeg(v.youngestAge);
  const rate = nonNeg(v.expectedRate);
  const payoff = nonNeg(v.mortgageBalance);
  const cost = nonNeg(v.closingCosts);
  const propLimit = age >= 55 ? Math.min(value, 4_000_000) * proprietaryFactor(age, rate) : 0;
  const hecmLimit = Math.min(value, HECM_LIMIT_2026) * hecmFactor(age, rate);
  const hecmCost = cost + Math.min(value, HECM_LIMIT_2026) * 0.02; // 2% upfront MIP on HECMs
  return {
    proprietaryNetAvailable: round2(Math.max(0, propLimit - payoff - cost)),
    proprietaryPrincipalLimit: round2(propLimit),
    hecmNetAvailable: round2(Math.max(0, hecmLimit - payoff - hecmCost)),
    hecmPrincipalLimit: round2(hecmLimit),
    proprietaryGivesMore: round2(Math.max(0, propLimit - payoff - cost) - Math.max(0, hecmLimit - payoff - hecmCost)),
    shortfallToPayOffMortgage: round2(Math.max(0, payoff + cost - propLimit)),
  };
};

export const equityRelease: CustomCalculator = (v) => {
  const value = nonNeg(v.propertyValue);
  const age = nonNeg(v.youngestAge);
  const enhanced = nonNeg(v.healthUplift);
  const maxLtv = age < 55 ? 0 : Math.min(60, 20 + (age - 55) * 1.2 + enhanced);
  const max = (value * maxLtv) / 100;
  const take = nonNeg(v.amountWanted) > 0 ? Math.min(max, nonNeg(v.amountWanted)) : max;
  const rate = nonNeg(v.interestRate) / 100;
  const years = nonNeg(v.years, 15);
  const owed = take * Math.pow(1 + rate / 12, years * 12);
  const futureValue = value * Math.pow(1 + nonNeg(v.houseGrowth) / 100, years);
  return {
    maxRelease: round2(max),
    maxLoanToValue: round2(maxLtv),
    amountOwedLater: round2(owed),
    homeValueLater: round2(futureValue),
    equityLeftLater: round2(Math.max(0, futureValue - owed)),
    yearsToDouble: rate > 0 ? round2(Math.log(2) / (12 * Math.log(1 + rate / 12))) : 0,
  };
};

export const manufacturedHomeRefinance: CustomCalculator = (v) => {
  const bal = nonNeg(v.currentBalance);
  const oldPay = pmt(bal, nonNeg(v.currentRate), nonNeg(v.remainingYears, 20) || 20);
  const cost = nonNeg(v.closingCosts);
  const loan = bal + (yes(v.rollInCosts) ? cost : 0) + nonNeg(v.cashOut);
  const years = nonNeg(v.newTerm, 20) || 20;
  const newPay = pmt(loan, nonNeg(v.newRate), years);
  const value = nonNeg(v.homeValue);
  const realProperty = yes(v.realProperty);
  const maxLtv = realProperty ? (nonNeg(v.cashOut) > 0 ? 80 : 95) : 85;
  const savings = oldPay - newPay;
  return {
    monthlySavings: round2(savings),
    newPayment: round2(newPay),
    currentPayment: round2(oldPay),
    breakEvenMonths: savings > 0 ? Math.ceil(cost / savings) : 0,
    lifetimeSavings: round2(oldPay * Math.round((nonNeg(v.remainingYears, 20) || 20) * 12) - newPay * years * 12 - (yes(v.rollInCosts) ? 0 : cost)),
    newLoanToValue: value > 0 ? round2((loan / value) * 100) : 0,
    withinTypicalLtvLimit: value > 0 && (loan / value) * 100 <= maxLtv ? 1 : 0,
  };
};

interface LandRules {
  taxRate: number;
  /** Share of the tax removed by an agricultural / current-use / present-use valuation. */
  agCut: number;
}

const landLoan = (rules: LandRules): CustomCalculator => (v) => {
  const price = nonNeg(v.landPrice);
  const vlb = yes(v.vlbLoan);
  const minDown = vlb ? 5 : 0;
  const downPct = Math.max(minDown, nonNeg(v.downPaymentPercent));
  let loan = price * (1 - downPct / 100);
  if (vlb) loan = Math.min(loan, 150_000); // Texas Veterans Land Board cap
  const down = price - loan;
  const rate = nonNeg(v.interestRate);
  const amort = vlb ? 30 : nonNeg(v.amortizationYears, 20) || 20;
  const pay = pmt(loan, rate, amort);
  const balloonYears = nonNeg(v.balloonYears);
  const balloon = balloonYears > 0 && balloonYears < amort ? balanceAfter(loan, rate, amort, Math.round(balloonYears * 12)) : 0;
  const tax = (price * nonNeg(v.propertyTaxRate, rules.taxRate)) / 100 * (yes(v.agValuation) ? 1 - rules.agCut : 1);
  return {
    monthlyPayment: round2(pay),
    downPayment: round2(down),
    loanAmount: round2(loan),
    balloonPayment: round2(balloon),
    yearlyPropertyTax: round2(tax),
    totalMonthlyCost: round2(pay + tax / 12),
    totalInterest: round2(balloon > 0 ? pay * balloonYears * 12 + balloon - loan : pay * amort * 12 - loan),
  };
};

export const texasLandLoan = landLoan({ taxRate: 1.8, agCut: 0.9 });
export const alabamaLandLoan = landLoan({ taxRate: 0.38, agCut: 0.8 });
export const ncLandLoan = landLoan({ taxRate: 0.66, agCut: 0.75 });

export const modularHomeMortgage: CustomCalculator = (v) => {
  const home = nonNeg(v.squareFeet) * nonNeg(v.factoryCostPerSqFt);
  const total = home + nonNeg(v.deliveryAndSet) + nonNeg(v.foundation) + nonNeg(v.siteWork) + nonNeg(v.landCost) + nonNeg(v.permitsAndFees);
  const down = (total * nonNeg(v.downPaymentPercent)) / 100;
  const loan = total - down;
  const rate = nonNeg(v.interestRate);
  const pi = pmt(loan, rate, nonNeg(v.loanTerm, 30) || 30);
  // Interest-only during the build on draws averaging about half the loan.
  const buildInterest = ((loan - nonNeg(v.landCost)) * 0.5 + nonNeg(v.landCost)) * (rate / 100 / 12) * nonNeg(v.buildMonths);
  return {
    monthlyPayment: round2(pi + (total * nonNeg(v.propertyTaxRate)) / 100 / 12 + nonNeg(v.annualInsurance) / 12),
    totalProjectCost: round2(total),
    modularHomeCost: round2(home),
    downPayment: round2(down),
    loanAmount: round2(loan),
    interestDuringBuild: round2(Math.max(0, buildInterest)),
    allInCostPerSqFt: nonNeg(v.squareFeet) > 0 ? round2((total - nonNeg(v.landCost)) / nonNeg(v.squareFeet)) : 0,
  };
};

export const metalBuildingFinance: CustomCalculator = (v) => {
  const sqft = nonNeg(v.width) * nonNeg(v.length);
  const kit = sqft * nonNeg(v.kitCostPerSqFt);
  const total = kit + sqft * (nonNeg(v.foundationPerSqFt) + nonNeg(v.erectionPerSqFt)) + nonNeg(v.extras) + nonNeg(v.deliveryAndPermits);
  const down = (total * nonNeg(v.downPaymentPercent)) / 100;
  const loan = total - down;
  const years = nonNeg(v.loanTerm, 10) || 10;
  const pay = pmt(loan, nonNeg(v.interestRate), years);
  return {
    monthlyPayment: round2(pay),
    totalBuildingCost: round2(total),
    buildingKitCost: round2(kit),
    costPerSqFt: sqft > 0 ? round2(total / sqft) : 0,
    downPayment: round2(down),
    loanAmount: round2(loan),
    totalInterest: round2(pay * years * 12 - loan),
  };
};

export const landEquityLoan: CustomCalculator = (v) => {
  const land = nonNeg(v.landValue);
  const owed = nonNeg(v.landOwed);
  const build = nonNeg(v.constructionCost) + nonNeg(v.softCosts);
  const total = land + build;
  const equity = Math.max(0, land - owed);
  const maxLoan = (total * nonNeg(v.maxLoanToCost, 80)) / 100;
  const needed = owed + build; // pay off the land loan and fund the build
  const loan = Math.min(maxLoan, needed);
  return {
    cashNeeded: round2(Math.max(0, needed - loan)),
    landEquity: round2(equity),
    totalProjectCost: round2(total),
    maxConstructionLoan: round2(maxLoan),
    loanAmount: round2(loan),
    equityCountsAsDownPayment: total > 0 ? round2((equity / total) * 100) : 0,
    monthlyPaymentAfterBuild: round2(pmt(loan, nonNeg(v.interestRate), nonNeg(v.loanTerm, 30) || 30)),
  };
};

export const aduLoan: CustomCalculator = (v) => {
  const value = nonNeg(v.homeValue);
  const balance = nonNeg(v.mortgageBalance);
  const cost = nonNeg(v.aduCost);
  const type = Math.round(nonNeg(v.loanType));
  // 0 = HELOC / home equity loan (85% CLTV on today's value), 1 = cash-out refi (80%), 2 = renovation loan (on after-completion value).
  const afterValue = value + (cost * nonNeg(v.valueAddedPercent)) / 100;
  const borrowable =
    type === 2 ? Math.max(0, afterValue * 0.9 - balance) : type === 1 ? Math.max(0, value * 0.8 - balance) : Math.max(0, value * 0.85 - balance);
  const loan = Math.min(cost, borrowable);
  const pay =
    type === 0 ? pmt(loan, nonNeg(v.interestRate), nonNeg(v.loanTerm, 15) || 15) : pmt(type === 1 ? loan + balance : loan, nonNeg(v.interestRate), nonNeg(v.loanTerm, 30) || 30);
  const rent = nonNeg(v.aduRent) * (1 - nonNeg(v.vacancyRate) / 100);
  return {
    maxYouCanBorrow: round2(borrowable),
    loanForAdu: round2(loan),
    cashShortfall: round2(Math.max(0, cost - borrowable)),
    monthlyPayment: round2(pay),
    expectedRentAfterVacancy: round2(rent),
    rentCoversPayment: pay > 0 ? round2((rent / pay) * 100) : 0,
    estimatedValueAfterAdu: round2(afterValue),
  };
};

export const reMortgageTypesCustomCalculators: Record<string, CustomCalculator> = {
  "mortgage-on-1-million-house-calculator": millionHouseMortgage,
  "asset-depletion-mortgage-calculator": assetDepletionMortgage,
  "first-lien-heloc-vs-mortgage-calculator": firstLienHelocVsMortgage,
  "proprietary-reverse-mortgage-calculator": proprietaryReverseMortgage,
  "equity-release-calculator": equityRelease,
  "manufactured-home-refinance-calculator": manufacturedHomeRefinance,
  "texas-land-loan-calculator": texasLandLoan,
  "alabama-land-loan-calculator": alabamaLandLoan,
  "nc-land-loan-calculator": ncLandLoan,
  "modular-home-mortgage-calculator": modularHomeMortgage,
  "metal-building-finance-calculator": metalBuildingFinance,
  "land-equity-loan-calculator": landEquityLoan,
  "adu-loan-calculator": aduLoan,
};
