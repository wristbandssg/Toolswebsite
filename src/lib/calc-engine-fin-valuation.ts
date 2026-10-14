/**
 * Batch: "Finance Calculators — Business, Investment & Economics" (14 Oct
 * 2026), sub-batch 1 of 5 — Valuation & Time Value of Money (10 tools).
 * The user's 117-keyword finance list: 45 already built, 21 covered by an
 * existing tool or merged, 51 new tools in 5 sub-batches (`fin-*`:
 * valuation 10, depreciation-tax 10, economics 11, business-pay 10,
 * marketing-misc 10). Each tool is filed in the Finance sub-category the
 * user named for it (see `category` in each create-fin-*.ts ToolDef).
 *
 *  - wacc: E/V·Re + P/V·Rp + D/V·Rd·(1 − T).
 *  - costOfEquity: CAPM rf + β(rm − rf) and the dividend growth (Gordon)
 *    model D0(1 + g)/P0 + g; the chosen method is the headline.
 *  - beta: sample covariance(stock, market) ÷ variance(market) from up to
 *    12 paired period returns, with alpha, correlation and R².
 *  - earningsPerShare: basic (NI − preferred dividends) ÷ weighted shares,
 *    diluted with dilutive shares added, P/E and earnings yield.
 *  - npv: −I + Σ CFt/(1 + r)^t for up to 10 periods, profitability index and
 *    discounted payback.
 *  - discountedCashFlow: a 5- or 10-year FCF projection (two growth stages)
 *    plus a Gordon terminal value -> enterprise, equity and per-share value.
 *    Different from npv: values a business from its cash-flow growth, not a
 *    project from a list of cash flows.
 *  - irr: the rate where NPV = 0 (grid scan + bisection) and MIRR with
 *    separate finance and reinvestment rates.
 *  - futureValueOfAnnuity: P·((1 + i)^n − 1)/i, × (1 + i) for an annuity
 *    due; also the annuity's present value. Different from the existing
 *    future-value-calculator, which grows a single lump sum.
 *  - financeCalculator: a 5-key TVM solver (N, I/Y, PV, PMT, FV) for saving
 *    (deposits add) or borrowing (payments reduce the balance).
 *  - opportunityCost: the economics definition — the return of the best
 *    alternative given up minus the chosen option's return, from dollar
 *    returns or from rates over time. Different from the existing
 *    opportunity-cost-of-a-purchase-calculator (spending vs investing).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin-valuation-calculators.ts for the copy.
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

// --- 1. WACC Calculator ----------------------------------------------------------------
export const waccCalculator: CustomCalculator = (values) => {
  const equity = pos(values.equityValue, 600000000);
  const debt = pos(values.debtValue, 400000000);
  const preferred = pos(values.preferredValue, 0);
  const re = num(values.costOfEquity, 10) / 100;
  const rd = num(values.costOfDebt, 6) / 100;
  const rp = num(values.costOfPreferred, 0) / 100;
  const t = clamp(num(values.taxRate, 21), 0, 100) / 100;
  const v = equity + debt + preferred;
  const we = v > 0 ? equity / v : 0;
  const wd = v > 0 ? debt / v : 0;
  const wp = v > 0 ? preferred / v : 0;
  const afterTaxRd = rd * (1 - t);
  return {
    totalCapital: round2(v),
    equityWeight: round2(we * 100),
    debtWeight: round2(wd * 100),
    preferredWeight: round2(wp * 100),
    afterTaxCostOfDebt: round2(afterTaxRd * 100),
    wacc: round2((we * re + wd * afterTaxRd + wp * rp) * 100),
  };
};

// --- 2. Cost of Equity Calculator ------------------------------------------------------
export const costOfEquityCalculator: CustomCalculator = (values) => {
  const method = num(values.method, 1);
  const rf = num(values.riskFreeRate, 4.2);
  const beta = num(values.beta, 1.2);
  const rm = num(values.marketReturn, 10);
  const price = pos(values.sharePrice, 50);
  const d0 = pos(values.annualDividend, 2);
  const g = num(values.dividendGrowth, 5);
  const capm = rf + beta * (rm - rf);
  const d1 = d0 * (1 + g / 100);
  const ddm = price > 0 ? (d1 / price) * 100 + g : 0;
  return {
    marketRiskPremium: round2(rm - rf),
    capmCostOfEquity: round2(capm),
    nextYearDividend: round2(d1),
    ddmCostOfEquity: round2(ddm),
    costOfEquity: round2(method === 2 ? ddm : capm),
  };
};

// --- 3. Beta Calculator ----------------------------------------------------------------
export const betaCalculator: CustomCalculator = (values) => {
  const n = clamp(Math.round(num(values.periods, 6)), 2, 12);
  const s: number[] = [];
  const m: number[] = [];
  for (let k = 1; k <= n; k++) {
    s.push(num(values[`stock${k}`], 0));
    m.push(num(values[`market${k}`], 0));
  }
  const ms = s.reduce((a, b) => a + b, 0) / n;
  const mm = m.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let varM = 0;
  let varS = 0;
  for (let k = 0; k < n; k++) {
    cov += (s[k] - ms) * (m[k] - mm);
    varM += (m[k] - mm) ** 2;
    varS += (s[k] - ms) ** 2;
  }
  cov /= n - 1;
  varM /= n - 1;
  varS /= n - 1;
  const beta = varM > 0 ? cov / varM : 0;
  const corr = varM > 0 && varS > 0 ? cov / Math.sqrt(varM * varS) : 0;
  return {
    beta: round4(beta),
    alpha: round4(ms - beta * mm),
    correlation: round4(corr),
    rSquared: round2(corr * corr * 100),
    averageStockReturn: round2(ms),
    averageMarketReturn: round2(mm),
  };
};

// --- 4. Earnings Per Share Calculator --------------------------------------------------
export const earningsPerShareCalculator: CustomCalculator = (values) => {
  const ni = num(values.netIncome, 5000000);
  const pref = pos(values.preferredDividends, 200000);
  const shares = pos(values.weightedShares, 2000000);
  const dilutive = pos(values.dilutiveShares, 0);
  const price = pos(values.sharePrice, 0);
  const avail = ni - pref;
  const basic = shares > 0 ? avail / shares : 0;
  const diluted = shares + dilutive > 0 ? avail / (shares + dilutive) : 0;
  return {
    earningsToCommon: round2(avail),
    basicEps: round2(basic),
    dilutedEps: round2(diluted),
    peRatio: round2(price > 0 && basic > 0 ? price / basic : 0),
    earningsYield: round2(price > 0 ? (basic / price) * 100 : 0),
  };
};

// --- 5. NPV Calculator -----------------------------------------------------------------
export const npvCalculator: CustomCalculator = (values) => {
  const r = num(values.discountRate, 8) / 100;
  const initial = pos(values.initialInvestment, 50000);
  let pvIn = 0;
  let cum = -initial;
  let payback = 0;
  for (let t = 1; t <= 10; t++) {
    const cf = num(values[`cf${t}`], 0);
    const pv = cf / Math.pow(1 + r, t);
    pvIn += pv;
    if (payback === 0 && cum < 0 && cum + pv >= 0 && pv > 0) payback = t - 1 + -cum / pv;
    cum += pv;
  }
  const npv = pvIn - initial;
  return {
    presentValueOfCashFlows: round2(pvIn),
    npv: round2(npv),
    profitabilityIndex: round2(initial > 0 ? pvIn / initial : 0),
    discountedPaybackYears: round2(payback),
    accept: npv > 0 ? 1 : 0,
  };
};

// --- 6. Discounted Cash Flow Calculator ------------------------------------------------
export const discountedCashFlowCalculator: CustomCalculator = (values) => {
  const fcf0 = num(values.freeCashFlow, 100);
  const g1 = num(values.growth1to5, 10) / 100;
  const g2 = num(values.growth6to10, 5) / 100;
  const gt = num(values.terminalGrowth, 2.5) / 100;
  const r = num(values.discountRate, 9) / 100;
  const years = num(values.years, 10) === 5 ? 5 : 10;
  const netDebt = num(values.netDebt, 200);
  const shares = pos(values.sharesOutstanding, 50);
  const price = pos(values.currentPrice, 0);
  let fcf = fcf0;
  let pvSum = 0;
  for (let t = 1; t <= years; t++) {
    fcf *= 1 + (t <= 5 ? g1 : g2);
    pvSum += fcf / Math.pow(1 + r, t);
  }
  const tv = r > gt ? (fcf * (1 + gt)) / (r - gt) : 0;
  const pvTv = tv / Math.pow(1 + r, years);
  const ev = pvSum + pvTv;
  const equity = ev - netDebt;
  const perShare = shares > 0 ? equity / shares : 0;
  return {
    finalYearFcf: round2(fcf),
    pvOfProjectedFcf: round2(pvSum),
    terminalValue: round2(tv),
    pvOfTerminalValue: round2(pvTv),
    enterpriseValue: round2(ev),
    equityValue: round2(equity),
    valuePerShare: round2(perShare),
    upsidePct: round2(price > 0 ? (perShare / price - 1) * 100 : 0),
    terminalShareOfValue: round2(ev > 0 ? (pvTv / ev) * 100 : 0),
  };
};

// --- 7. IRR Calculator -----------------------------------------------------------------
function npvAt(rate: number, flows: number[]): number {
  return flows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
}

function solveIrr(flows: number[]): number | null {
  let lo = -0.99;
  let fLo = npvAt(lo, flows);
  for (let x = -0.98; x <= 10; x += 0.01) {
    const f = npvAt(x, flows);
    if (fLo === 0) return lo;
    if (Math.sign(f) !== Math.sign(fLo)) {
      let a = lo;
      let b = x;
      for (let k = 0; k < 200; k++) {
        const mid = (a + b) / 2;
        const fm = npvAt(mid, flows);
        if (Math.sign(fm) === Math.sign(npvAt(a, flows))) a = mid;
        else b = mid;
      }
      return (a + b) / 2;
    }
    lo = x;
    fLo = f;
  }
  return null;
}

export const irrCalculator: CustomCalculator = (values) => {
  const initial = pos(values.initialInvestment, 100000);
  const flows = [-initial];
  for (let t = 1; t <= 10; t++) flows.push(num(values[`cf${t}`], 0));
  while (flows.length > 2 && flows[flows.length - 1] === 0) flows.pop();
  const n = flows.length - 1;
  const fr = num(values.financeRate, 8) / 100;
  const rr = num(values.reinvestRate, 8) / 100;
  const irr = solveIrr(flows);
  let pvNeg = 0;
  let fvPos = 0;
  let inflows = 0;
  flows.forEach((cf, t) => {
    if (cf < 0) pvNeg += -cf / Math.pow(1 + fr, t);
    else {
      fvPos += cf * Math.pow(1 + rr, n - t);
      inflows += cf;
    }
  });
  const mirr = pvNeg > 0 && fvPos > 0 && n > 0 ? Math.pow(fvPos / pvNeg, 1 / n) - 1 : 0;
  return {
    irr: round2(irr === null ? 0 : irr * 100),
    irrFound: irr === null ? 0 : 1,
    mirr: round2(mirr * 100),
    totalCashReturned: round2(inflows),
    moneyMultiple: round2(initial > 0 ? inflows / initial : 0),
    periods: n,
  };
};

// --- 8. Future Value of Annuity Calculator ---------------------------------------------
export const futureValueOfAnnuityCalculator: CustomCalculator = (values) => {
  const pmt = pos(values.payment, 500);
  const rate = num(values.annualRate, 7) / 100;
  const years = pos(values.years, 20);
  const ppy = Math.max(1, num(values.paymentsPerYear, 12));
  const due = num(values.annuityType, 1) === 2;
  const i = rate / ppy;
  const n = Math.round(years * ppy);
  const g = Math.pow(1 + i, n);
  const factor = i === 0 ? n : (g - 1) / i;
  const fv = pmt * factor * (due ? 1 + i : 1);
  const pv = i === 0 ? pmt * n : pmt * ((1 - 1 / g) / i) * (due ? 1 + i : 1);
  return {
    futureValue: round2(fv),
    totalPayments: round2(pmt * n),
    interestEarned: round2(fv - pmt * n),
    presentValue: round2(pv),
    numberOfPayments: n,
  };
};

// --- 9. Finance Calculator (TVM solver) ------------------------------------------------
export const financeCalculator: CustomCalculator = (values) => {
  const solveFor = num(values.solveFor, 1); // 1 FV, 2 PV, 3 PMT, 4 N, 5 I/Y
  const s = num(values.mode, 1) === 2 ? -1 : 1;
  const ppy = Math.max(1, num(values.periodsPerYear, 12));
  const t = num(values.timing, 1) === 2 ? 1 : 0;
  let years = pos(values.years, 10);
  let rate = num(values.annualRate, 6);
  let pv = pos(values.presentValue, 10000);
  let pmt = pos(values.payment, 200);
  let fv = pos(values.futureValue, 0);

  const A = (i: number, n: number) => (i === 0 ? n : ((Math.pow(1 + i, n) - 1) / i) * (1 + i * t));
  const fvOf = (i: number, n: number) => pv * Math.pow(1 + i, n) + s * pmt * A(i, n);
  let found = 1;

  const bisect = (f: (x: number) => number, lo: number, hi: number): number | null => {
    let fl = f(lo);
    const steps = 400;
    for (let k = 1; k <= steps; k++) {
      const x = lo + ((hi - lo) * k) / steps;
      const fx = f(x);
      if (Math.sign(fx) !== Math.sign(fl) || fx === 0) {
        let a = x - (hi - lo) / steps;
        let b = x;
        for (let j = 0; j < 100; j++) {
          const m = (a + b) / 2;
          if (Math.sign(f(m)) === Math.sign(f(a))) a = m;
          else b = m;
        }
        return (a + b) / 2;
      }
      fl = fx;
    }
    return null;
  };

  const i0 = rate / 100 / ppy;
  const n0 = years * ppy;
  if (solveFor === 1) fv = fvOf(i0, n0);
  else if (solveFor === 2) pv = (fv - s * pmt * A(i0, n0)) / Math.pow(1 + i0, n0);
  else if (solveFor === 3) {
    const a = A(i0, n0);
    pmt = a > 0 ? s * (fv - pv * Math.pow(1 + i0, n0)) / a : 0;
  } else if (solveFor === 4) {
    const n = bisect((x) => fvOf(i0, x) - fv, 0, 6000);
    if (n === null) found = 0;
    else years = n / ppy;
  } else {
    const i = bisect((x) => fvOf(x, n0) - fv, -0.5, 1);
    if (i === null) found = 0;
    else rate = i * ppy * 100;
  }
  const n = years * ppy;
  const totalPmts = pmt * n;
  const solved = [fv, pv, pmt, years, rate][clamp(solveFor, 1, 5) - 1];
  return {
    solvedValue: round2(found ? solved : 0),
    found,
    futureValue: round2(fv),
    presentValue: round2(pv),
    payment: round2(pmt),
    years: round2(years),
    annualRate: round2(rate),
    totalPayments: round2(totalPmts),
    totalInterest: round2(s === 1 ? fv - pv - totalPmts : totalPmts + fv - pv),
  };
};

// --- 10. Opportunity Cost Calculator ---------------------------------------------------
export const opportunityCostCalculator: CustomCalculator = (values) => {
  const mode = num(values.mode, 1);
  let chosen: number;
  let alternative: number;
  let base: number;
  if (mode === 2) {
    const amount = pos(values.amount, 10000);
    const years = pos(values.years, 10);
    chosen = amount * Math.pow(1 + num(values.chosenRate, 4) / 100, years);
    alternative = amount * Math.pow(1 + num(values.alternativeRate, 8) / 100, years);
    base = amount;
  } else {
    chosen = num(values.chosenReturn, 50000);
    alternative = num(values.alternativeReturn, 65000);
    base = Math.abs(chosen);
  }
  const oc = alternative - chosen;
  return {
    chosenValue: round2(chosen),
    alternativeValue: round2(alternative),
    opportunityCost: round2(oc),
    opportunityCostPct: round2(base > 0 ? (oc / base) * 100 : 0),
    betterChoice: oc > 0 ? 2 : 1,
  };
};

export const finValuationCustomCalculators: Record<string, CustomCalculator> = {
  "wacc-calculator": waccCalculator,
  "cost-of-equity-calculator": costOfEquityCalculator,
  "beta-calculator": betaCalculator,
  "earnings-per-share-calculator": earningsPerShareCalculator,
  "npv-calculator": npvCalculator,
  "discounted-cash-flow-calculator": discountedCashFlowCalculator,
  "irr-calculator": irrCalculator,
  "future-value-of-annuity-calculator": futureValueOfAnnuityCalculator,
  "finance-calculator": financeCalculator,
  "opportunity-cost-calculator": opportunityCostCalculator,
};
