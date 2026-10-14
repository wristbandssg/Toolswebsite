/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 9 of 10
 * — Macroeconomics: Income, Output & Trade (10 tools). See
 * calc-engine-fin3-derivatives-tax.ts for the full batch context.
 *
 *  - carryTrade: borrow in a low-rate currency, invest in a high-rate one:
 *    interest differential, FX gain/loss, total return on equity with
 *    leverage, break-even currency move.
 *  - cobbDouglas: Y = A·K^α·L^β, MPK = αY ÷ K, MPL = βY ÷ L, returns to
 *    scale from α + β.
 *  - discretionaryIncome: (a) everyday — gross − taxes − essentials;
 *    (b) student-loan IDR — AGI − 150% / 225% of the HHS poverty guideline
 *    (2025: $15,650 + $5,500 per extra person, 48 states).
 *  - disposableIncome: gross income − income and payroll taxes, plus the
 *    saving rate after spending. Different from discretionaryIncome (which
 *    also removes essentials).
 *  - fisherEquation (incl. "Fisher Effect" and "Real Interest Rate"):
 *    exact (1 + i) = (1 + r)(1 + π) and the approximation i ≈ r + π; solve
 *    for any one.
 *  - gdpDeflator (incl. "Real GDP"): deflator = nominal ÷ real × 100, real
 *    GDP from a deflator, inflation between two deflators.
 *  - gdpGap: actual − potential GDP, % gap and type.
 *  - gini: from up to 10 incomes (mean absolute difference) or 5 quintile
 *    income shares (Lorenz curve trapezoids).
 *  - privateSavings: private Y − T − C (+ transfers), public T − G and
 *    national saving.
 *  - tariff (incl. "Trump Tariff"): duty on the customs value at the
 *    entered rate, landed cost and the consumer price rise at a pass-through
 *    share and retail markup.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-macro1-calculators.ts for the copy.
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

// --- 1. Carry Trade Calculator ---------------------------------------------------------
export const carryTradeCalculator: CustomCalculator = (values) => {
  const equity = pos(values.capital, 10000);
  const lev = Math.max(1, pos(values.leverage, 5));
  const fund = num(values.fundingRate, 0.5) / 100;
  const invest = num(values.investRate, 4.5) / 100;
  const months = pos(values.holdingMonths, 12);
  const fx = num(values.fxChange, -2) / 100;
  const t = months / 12;
  const position = equity * lev;
  const borrowed = position - equity;
  const interestEarned = position * invest * t;
  const interestPaid = borrowed * fund * t;
  const carry = interestEarned - interestPaid;
  const fxPnl = (position + interestEarned) * fx;
  const total = carry + fxPnl;
  return {
    interestDifferential: round2((invest - fund) * 100),
    positionSize: round2(position),
    carryIncome: round2(carry),
    fxGainLoss: round2(fxPnl),
    totalProfit: round2(total),
    returnOnCapital: round2(equity > 0 ? (total / equity) * 100 : 0),
    breakEvenFxMove: round2(position + interestEarned > 0 ? (-carry / (position + interestEarned)) * 100 : 0),
  };
};

// --- 2. Cobb-Douglas Production Function Calculator ------------------------------------
export const cobbDouglasCalculator: CustomCalculator = (values) => {
  const a = pos(values.totalFactorProductivity, 1.5);
  const k = pos(values.capital, 400);
  const l = pos(values.labor, 100);
  const alpha = pos(values.alpha, 0.3);
  const beta = pos(values.beta, 0.7);
  const y = a * Math.pow(k, alpha) * Math.pow(l, beta);
  const s = alpha + beta;
  return {
    output: round4(y),
    marginalProductOfCapital: round4(k > 0 ? (alpha * y) / k : 0),
    marginalProductOfLabor: round4(l > 0 ? (beta * y) / l : 0),
    returnsToScaleSum: round4(s),
    // 1 increasing, 2 constant, 3 decreasing
    returnsToScale: Math.abs(s - 1) < 1e-9 ? 2 : s > 1 ? 1 : 3,
    outputPerWorker: round4(l > 0 ? y / l : 0),
  };
};

// --- 3. Discretionary Income Calculator ------------------------------------------------
export const discretionaryIncomeCalculator: CustomCalculator = (values) => {
  if (num(values.mode, 1) === 2) {
    const agi = pos(values.agi, 55000);
    const size = Math.max(1, Math.round(pos(values.familySize, 1)));
    const guideline = pos(values.povertyGuidelineBase, 15650) + pos(values.povertyGuidelinePerPerson, 5500) * (size - 1);
    const pct = pos(values.planMultiple, 150) / 100;
    const yearly = Math.max(0, agi - guideline * pct);
    return {
      povertyGuideline: round2(guideline),
      protectedIncome: round2(guideline * pct),
      yearlyDiscretionaryIncome: round2(yearly),
      monthlyDiscretionaryIncome: round2(yearly / 12),
      idrPaymentAt10Pct: round2((yearly * 0.1) / 12),
      shareOfIncome: round2(agi > 0 ? (yearly / agi) * 100 : 0),
    };
  }
  const gross = pos(values.grossIncome, 6000);
  const taxes = pos(values.taxes, 1300);
  const essentials = pos(values.housing, 1700) + pos(values.food, 600) + pos(values.transport, 400) + pos(values.utilitiesInsurance, 450) + pos(values.minimumDebtPayments, 300);
  const monthly = gross - taxes - essentials;
  return {
    povertyGuideline: 0,
    protectedIncome: round2(taxes + essentials),
    yearlyDiscretionaryIncome: round2(monthly * 12),
    monthlyDiscretionaryIncome: round2(monthly),
    idrPaymentAt10Pct: 0,
    shareOfIncome: round2(gross > 0 ? (monthly / gross) * 100 : 0),
  };
};

// --- 4. Disposable Income Calculator ---------------------------------------------------
export const disposableIncomeCalculator: CustomCalculator = (values) => {
  const gross = pos(values.grossIncome, 85000);
  const taxes = pos(values.federalIncomeTax, 9500) + pos(values.stateLocalTax, 3800) + pos(values.payrollTax, 6503);
  const spending = pos(values.consumption, 55000);
  const disposable = gross - taxes;
  return {
    totalTaxes: round2(taxes),
    disposableIncome: round2(disposable),
    monthlyDisposableIncome: round2(disposable / 12),
    personalSaving: round2(disposable - spending),
    savingRate: round2(disposable > 0 ? ((disposable - spending) / disposable) * 100 : 0),
    taxShareOfIncome: round2(gross > 0 ? (taxes / gross) * 100 : 0),
  };
};

// --- 5. Fisher Equation Calculator -----------------------------------------------------
export const fisherEquationCalculator: CustomCalculator = (values) => {
  const solve = num(values.solveFor, 1); // 1 real, 2 nominal, 3 inflation
  let i = num(values.nominalRate, 5) / 100;
  let r = num(values.realRate, 2) / 100;
  let pi = num(values.inflation, 3) / 100;
  let approx: number;
  if (solve === 2) {
    i = (1 + r) * (1 + pi) - 1;
    approx = r + pi;
  } else if (solve === 3) {
    pi = (1 + i) / (1 + r) - 1;
    approx = i - r;
  } else {
    r = (1 + i) / (1 + pi) - 1;
    approx = i - pi;
  }
  return {
    nominalRate: round4(i * 100),
    realRate: round4(r * 100),
    inflation: round4(pi * 100),
    approximation: round4(approx * 100),
  };
};

// --- 6. GDP Deflator Calculator --------------------------------------------------------
export const gdpDeflatorCalculator: CustomCalculator = (values) => {
  const mode = num(values.mode, 1); // 1 deflator from nominal & real, 2 real GDP from deflator
  const nominal = pos(values.nominalGdp, 29200);
  let real = pos(values.realGdp, 23500);
  let deflator = pos(values.deflator, 0);
  if (mode === 2) real = deflator > 0 ? (nominal / deflator) * 100 : 0;
  else deflator = real > 0 ? (nominal / real) * 100 : 0;
  const prior = pos(values.priorDeflator, 0);
  return {
    gdpDeflator: round2(deflator),
    realGdp: round2(real),
    priceLevelChangeSinceBase: round2(deflator - 100),
    inflationVsPrior: round2(prior > 0 ? (deflator / prior - 1) * 100 : 0),
  };
};

// --- 7. GDP Gap Calculator -------------------------------------------------------------
export const gdpGapCalculator: CustomCalculator = (values) => {
  const actual = pos(values.actualGdp, 23000);
  const potential = pos(values.potentialGdp, 23400);
  const gap = actual - potential;
  return {
    outputGap: round2(gap),
    outputGapPct: round2(potential > 0 ? (gap / potential) * 100 : 0),
    // 1 recessionary (negative), 2 at potential, 3 inflationary (positive)
    gapType: Math.abs(gap) < 1e-9 ? 2 : gap < 0 ? 1 : 3,
  };
};

// --- 8. Gini Coefficient Calculator ----------------------------------------------------
export const giniCalculator: CustomCalculator = (values) => {
  if (num(values.mode, 1) === 2) {
    const shares = [1, 2, 3, 4, 5].map((k) => pos(values[`quintile${k}`], [3, 8, 14, 22, 53][k - 1]));
    const total = shares.reduce((a, b) => a + b, 0);
    let cum = 0;
    let area = 0;
    for (const s of shares) {
      const prev = cum;
      cum += total > 0 ? s / total : 0;
      area += 0.2 * (prev + cum);
    }
    const g = 1 - area;
    return { gini: round4(g), giniIndex: round2(g * 100), topShare: round2(total > 0 ? (shares[4] / total) * 100 : 0), valuesUsed: 5 };
  }
  const xs: number[] = [];
  for (let k = 1; k <= 10; k++) {
    const v = pos(values[`income${k}`], 0);
    if (v > 0) xs.push(v);
  }
  const n = xs.length;
  const mean = n ? xs.reduce((a, b) => a + b, 0) / n : 0;
  let diff = 0;
  for (const a of xs) for (const b of xs) diff += Math.abs(a - b);
  const g = n && mean > 0 ? diff / (2 * n * n * mean) : 0;
  const top = n ? (Math.max(...xs) / (mean * n)) * 100 : 0;
  return { gini: round4(g), giniIndex: round2(g * 100), topShare: round2(top), valuesUsed: n };
};

// --- 9. Private Savings Calculator -----------------------------------------------------
export const privateSavingsCalculator: CustomCalculator = (values) => {
  const y = pos(values.gdp, 29000);
  const t = num(values.taxes, 5200);
  const c = pos(values.consumption, 19800);
  const tr = num(values.transfers, 0);
  const g = pos(values.governmentSpending, 6600);
  const privateS = y - t - c + tr;
  const publicS = t - g - tr;
  return {
    privateSaving: round2(privateS),
    publicSaving: round2(publicS),
    nationalSaving: round2(privateS + publicS),
    privateSavingRate: round2(y - t + tr > 0 ? (privateS / (y - t + tr)) * 100 : 0),
  };
};

// --- 10. Tariff Calculator -------------------------------------------------------------
export const tariffCalculator: CustomCalculator = (values) => {
  const value = pos(values.customsValue, 10000);
  const rate = pos(values.tariffRate, 10) / 100;
  const other = pos(values.otherDutyRate, 0) / 100;
  const freight = pos(values.shippingInsurance, 800);
  const fees = pos(values.brokerFees, 0);
  const passThrough = clamp(pos(values.passThroughPercent, 100), 0, 100) / 100;
  const markup = pos(values.retailMarkup, 50) / 100;
  const duty = value * (rate + other);
  const landed = value + duty + freight + fees;
  const passed = duty * passThrough;
  return {
    dutyOwed: round2(duty),
    landedCost: round2(landed),
    landedCostIncrease: round2(value + freight + fees > 0 ? (duty / (value + freight + fees)) * 100 : 0),
    retailPriceBefore: round2((value + freight + fees) * (1 + markup)),
    retailPriceAfter: round2((value + freight + fees + passed) * (1 + markup)),
    consumerPriceIncrease: round2(passed * (1 + markup)),
  };
};

export const fin3Macro1CustomCalculators: Record<string, CustomCalculator> = {
  "carry-trade-calculator": carryTradeCalculator,
  "cobb-douglas-production-function-calculator": cobbDouglasCalculator,
  "discretionary-income-calculator": discretionaryIncomeCalculator,
  "disposable-income-calculator": disposableIncomeCalculator,
  "fisher-equation-calculator": fisherEquationCalculator,
  "gdp-deflator-calculator": gdpDeflatorCalculator,
  "gdp-gap-calculator": gdpGapCalculator,
  "gini-coefficient-calculator": giniCalculator,
  "private-savings-calculator": privateSavingsCalculator,
  "tariff-calculator": tariffCalculator,
};
