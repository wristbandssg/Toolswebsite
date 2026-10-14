/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 5 of 10
 * — Personal Finance (9 tools). See calc-engine-fin3-derivatives-tax.ts for
 * the full batch context.
 *
 *  - plan529: 529 plan balance from monthly contributions and return, with
 *    the yearly state income-tax deduction value. Different from the
 *    existing college-savings-goal-calculator (works back from college
 *    costs to the saving needed).
 *  - apc: average propensity to consume C ÷ Y and to save; MPC if a prior
 *    period is entered.
 *  - bankReconciliation: adjusted bank balance (+ deposits in transit −
 *    outstanding checks ± errors) vs adjusted book balance (+ interest −
 *    fees − NSF ± errors).
 *  - goldMelt (incl. "Scrap Gold"): fine-gold content by karat (24k .999,
 *    22k .9167, 18k .750, 14k .585, 10k .417, 9k .375) × spot, and a dealer
 *    offer at a payout %.
 *  - silverMelt (incl. "Scrap Silver"): .999 / .925 sterling / .900 US coin
 *    / .800 / .400 (1965–70 halves), by weight or by face value of 90%
 *    coins (0.715 oz fine per $1 face).
 *  - lotteryPayout (incl. Powerball, Mega Millions and "Lottery Annuity"):
 *    cash option vs 30 annuity payments rising 5% a year, after 2026
 *    federal bracket tax (single) and state tax.
 *  - stimulusCheck (incl. every 2020–21 stimulus-check keyword): Economic
 *    Impact Payments 1 ($1,200 / $500 child, 5% phase-out), 2 ($600 /
 *    $600 child) and 3 ($1,400 per person, phase-out over $5k/$10k/$7.5k).
 *  - trumpAccounts: a child's Trump Account at 18 — $1,000 pilot deposit
 *    (born 2025–2028), up to $5,000 a year from all sources (employer up to
 *    $2,500), contributions from 4 July 2026, low-cost US equity index fund.
 *  - creditUtilization: overall and per-card utilisation for up to 5 cards
 *    and the pay-down needed for 30% and 10%.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-personal-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const GRAMS_PER_OZT = 31.1034768;
const UNIT_GRAMS: Record<number, number> = { 1: 1, 2: GRAMS_PER_OZT, 3: 1.55517384 };

// 2026 single-filer brackets (Rev. Proc. 2025-32).
const SINGLE: [number, number][] = [[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]];
function singleTax(income: number): number {
  let tax = 0;
  let prev = 0;
  for (const [top, rate] of SINGLE) {
    if (income <= prev) break;
    tax += (Math.min(income, top) - prev) * rate;
    prev = top;
  }
  return tax;
}

// --- 1. 529 Calculator -----------------------------------------------------------------
export const plan529Calculator: CustomCalculator = (values) => {
  let bal = pos(values.currentBalance, 5000);
  const monthly = pos(values.monthlyContribution, 250);
  const years = Math.round(pos(values.yearsUntilCollege, 15));
  const i = num(values.expectedReturn, 6) / 100 / 12;
  const stateRate = pos(values.stateTaxRate, 5) / 100;
  const cap = pos(values.stateDeductionCap, 10000);
  const start = bal;
  for (let m = 0; m < years * 12; m++) bal = bal * (1 + i) + monthly;
  const contributed = start + monthly * years * 12;
  const yearlyDeduction = cap > 0 ? Math.min(monthly * 12, cap) : monthly * 12;
  return {
    projectedBalance: round2(bal),
    totalContributed: round2(contributed),
    taxFreeGrowth: round2(bal - contributed),
    yearlyStateTaxSavings: round2(yearlyDeduction * stateRate),
    totalStateTaxSavings: round2(yearlyDeduction * stateRate * years),
  };
};

// --- 2. APC Calculator -----------------------------------------------------------------
export const apcCalculator: CustomCalculator = (values) => {
  const c = num(values.consumption, 54000);
  const y = num(values.disposableIncome, 60000);
  const c0 = num(values.previousConsumption, 0);
  const y0 = num(values.previousIncome, 0);
  const apc = y !== 0 ? c / y : 0;
  const mpc = y0 > 0 && y !== y0 ? (c - c0) / (y - y0) : 0;
  return {
    apc: round4(apc),
    aps: round4(y !== 0 ? 1 - apc : 0),
    savings: round2(y - c),
    mpc: round4(mpc),
  };
};

// --- 3. Bank Reconciliation Calculator -------------------------------------------------
export const bankReconciliationCalculator: CustomCalculator = (values) => {
  const bank = num(values.bankBalance, 8450);
  const book = num(values.bookBalance, 8125);
  const adjBank = bank + pos(values.depositsInTransit, 1200) - pos(values.outstandingChecks, 1575) + num(values.bankErrors, 0);
  const adjBook = book + pos(values.interestEarned, 15) - pos(values.bankFees, 25) - pos(values.nsfChecks, 0) + num(values.bookErrors, -40) + pos(values.collectionsByBank, 0);
  return {
    adjustedBankBalance: round2(adjBank),
    adjustedBookBalance: round2(adjBook),
    difference: round2(adjBank - adjBook),
    reconciled: Math.abs(adjBank - adjBook) < 0.005 ? 1 : 0,
  };
};

// --- 4. Gold Melt Calculator -----------------------------------------------------------
const KARAT: Record<number, number> = { 24: 0.999, 22: 0.9167, 18: 0.75, 14: 0.585, 10: 0.417, 9: 0.375 };

export const goldMeltCalculator: CustomCalculator = (values) => {
  const grams = pos(values.weight, 20) * (UNIT_GRAMS[num(values.weightUnit, 1)] ?? 1);
  const purity = KARAT[num(values.karat, 14)] ?? 0.585;
  const spot = pos(values.spotPricePerOz, 4000);
  const payout = clamp(pos(values.payoutPercent, 80), 0, 100) / 100;
  const fineOz = (grams * purity) / GRAMS_PER_OZT;
  const melt = fineOz * spot;
  return {
    fineGoldGrams: round4(grams * purity),
    fineGoldTroyOz: round4(fineOz),
    meltValue: round2(melt),
    expectedOffer: round2(melt * payout),
    valuePerGram: round2(grams > 0 ? melt / grams : 0),
  };
};

// --- 5. Silver Melt Calculator ---------------------------------------------------------
const SILVER_PURITY: Record<number, number> = { 1: 0.999, 2: 0.925, 3: 0.9, 4: 0.8, 5: 0.4 };

export const silverMeltCalculator: CustomCalculator = (values) => {
  const spot = pos(values.spotPricePerOz, 50);
  const payout = clamp(pos(values.payoutPercent, 85), 0, 100) / 100;
  let fineOz: number;
  if (num(values.mode, 1) === 2) fineOz = pos(values.faceValue, 10) * 0.715;
  else {
    const grams = pos(values.weight, 100) * (UNIT_GRAMS[num(values.weightUnit, 1)] ?? 1);
    fineOz = (grams * (SILVER_PURITY[num(values.purity, 2)] ?? 0.925)) / GRAMS_PER_OZT;
  }
  const melt = fineOz * spot;
  return {
    fineSilverTroyOz: round4(fineOz),
    fineSilverGrams: round2(fineOz * GRAMS_PER_OZT),
    meltValue: round2(melt),
    expectedOffer: round2(melt * payout),
  };
};

// --- 6. Lottery Payout Calculator ------------------------------------------------------
export const lotteryPayoutCalculator: CustomCalculator = (values) => {
  const jackpot = pos(values.advertisedJackpot, 500000000);
  const cashPct = clamp(pos(values.cashOptionPercent, 45), 0, 100) / 100;
  const stateRate = pos(values.stateTaxRate, 5) / 100;
  const cash = jackpot * cashPct;
  const cashFed = singleTax(cash);
  const cashNet = cash - cashFed - cash * stateRate;
  const first = (jackpot * 0.05) / (Math.pow(1.05, 30) - 1);
  let annuityNet = 0;
  let firstNet = 0;
  for (let k = 0; k < 30; k++) {
    const pay = first * Math.pow(1.05, k);
    const net = pay - singleTax(pay) - pay * stateRate;
    annuityNet += net;
    if (k === 0) firstNet = net;
  }
  return {
    cashOption: round2(cash),
    cashAfterTax: round2(cashNet),
    firstAnnuityPayment: round2(first),
    firstAnnuityAfterTax: round2(firstNet),
    lastAnnuityPayment: round2(first * Math.pow(1.05, 29)),
    totalAnnuityAfterTax: round2(annuityNet),
    federalWithholdingOnCash: round2(cash * 0.24),
  };
};

// --- 7. Stimulus Check Calculator ------------------------------------------------------
export const stimulusCheckCalculator: CustomCalculator = (values) => {
  const round = clamp(Math.round(num(values.round, 3)), 1, 3);
  const status = clamp(Math.round(num(values.filingStatus, 2)), 1, 3); // 1 single, 2 MFJ, 3 HoH
  const agi = pos(values.agi, 90000);
  const kids = Math.round(pos(values.childrenUnder17, 2));
  const others = Math.round(pos(values.otherDependents, 0));
  const adults = status === 2 ? 2 : 1;
  const threshold = status === 2 ? 150000 : status === 3 ? 112500 : 75000;
  let full: number;
  let amount: number;
  if (round === 3) {
    full = 1400 * (adults + kids + others);
    const width = status === 2 ? 10000 : status === 3 ? 7500 : 5000;
    amount = full * clamp(1 - (agi - threshold) / width, 0, 1);
  } else {
    full = round === 1 ? 1200 * adults + 500 * kids : 600 * adults + 600 * kids;
    amount = Math.max(0, full - 0.05 * Math.max(0, agi - threshold));
  }
  return {
    fullAmount: full,
    phaseOutReduction: round2(full - amount),
    estimatedPayment: round2(amount),
  };
};

// --- 8. Trump Accounts Calculator ------------------------------------------------------
export const trumpAccountsCalculator: CustomCalculator = (values) => {
  const birthYear = Math.round(num(values.birthYear, 2025));
  const age = clamp(pos(values.childAge, 1), 0, 17);
  const family = pos(values.yearlyFamilyContribution, 2000);
  const employer = Math.min(2500, pos(values.yearlyEmployerContribution, 500));
  const r = (num(values.expectedReturn, 7) - pos(values.expenseRatio, 0.05)) / 100;
  const pilot = birthYear >= 2025 && birthYear <= 2028 ? 1000 : 0;
  const yearly = Math.min(5000, family + employer);
  const years = Math.max(0, 18 - age);
  let bal = pilot + pos(values.currentBalance, 0);
  for (let y = 0; y < years; y++) bal = (bal + yearly) * (1 + r);
  const contributed = pilot + pos(values.currentBalance, 0) + yearly * years;
  return {
    pilotDeposit: pilot,
    yearlyContribution: round2(yearly),
    valueAt18: round2(bal),
    totalContributed: round2(contributed),
    investmentGrowth: round2(bal - contributed),
    yearsOfGrowth: years,
  };
};

// --- 9. Credit Utilization Calculator --------------------------------------------------
export const creditUtilizationCalculator: CustomCalculator = (values) => {
  let bal = 0;
  let lim = 0;
  let worst = 0;
  for (let k = 1; k <= 5; k++) {
    const b = pos(values[`balance${k}`], 0);
    const l = pos(values[`limit${k}`], 0);
    bal += b;
    lim += l;
    if (l > 0) worst = Math.max(worst, b / l);
  }
  const util = lim > 0 ? bal / lim : 0;
  return {
    totalBalance: round2(bal),
    totalLimit: round2(lim),
    overallUtilization: round2(util * 100),
    highestCardUtilization: round2(worst * 100),
    payDownFor30: round2(Math.max(0, bal - lim * 0.3)),
    payDownFor10: round2(Math.max(0, bal - lim * 0.1)),
  };
};

export const fin3PersonalCustomCalculators: Record<string, CustomCalculator> = {
  "529-calculator": plan529Calculator,
  "apc-calculator": apcCalculator,
  "bank-reconciliation-calculator": bankReconciliationCalculator,
  "gold-melt-calculator": goldMeltCalculator,
  "silver-melt-calculator": silverMeltCalculator,
  "lottery-payout-calculator": lotteryPayoutCalculator,
  "stimulus-check-calculator": stimulusCheckCalculator,
  "trump-accounts-calculator": trumpAccountsCalculator,
  "credit-utilization-calculator": creditUtilizationCalculator,
};
