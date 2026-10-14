/**
 * Batch: "Finance Calculators expansion 4" (14 Oct 2026), sub-batch 2 of 3 —
 * Trading Indicators, Insurance & Workplace Metrics (9 tools). See
 * calc-engine-fin4-india-uk.ts for the full batch context.
 *
 *  - combinedRatio (incl. "Loss Ratio"): (losses + LAE) ÷ earned premium,
 *    expense ratio, combined ratio and underwriting profit.
 *  - customerEffortScore: average of 1–7 answers and the share who found it
 *    easy (5–7) or hard (1–3).
 *  - trir (incl. "DART Rate"): OSHA rates = cases × 200,000 ÷ hours worked —
 *    TRIR, DART and lost-time (LTIR).
 *  - fibonacciRetracement: 23.6/38.2/50/61.8/78.6% retracements and
 *    127.2/161.8% extensions of a swing.
 *  - pivotPoint: classic, Woodie and Fibonacci pivots with R1–R3 / S1–S3.
 *  - rsi: Wilder's relative strength index over up to 20 closes (first
 *    average simple, then Wilder smoothing).
 *  - remoteVsOnLocation: an employer's yearly cost of an office seat vs a
 *    remote worker (stipend, equipment) incl. a productivity change.
 *    Different from the existing commuter-vs-remote-cost-comparison
 *    (an employee's own commute costs).
 *  - californiaOvertime: a 7-day week under California law — daily OT after
 *    8 h, double time after 12 h, weekly OT after 40 h, and the 7th
 *    consecutive day rule. Different from the existing overtime-calculator
 *    (federal weekly 40 h; other states listed in the request follow it).
 *  - changeCalculator: change due and the fewest US bills and coins.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin4-trading-ops-calculators.ts for the copy.
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

// --- 1. Combined Ratio Calculator ------------------------------------------------------
export const combinedRatioCalculator: CustomCalculator = (values) => {
  const premium = pos(values.earnedPremium, 10000000);
  const losses = pos(values.incurredLosses, 6000000) + pos(values.lossAdjustmentExpenses, 700000);
  const expenses = pos(values.underwritingExpenses, 2800000);
  const dividends = pos(values.policyholderDividends, 0);
  const lr = premium > 0 ? losses / premium : 0;
  const er = premium > 0 ? expenses / premium : 0;
  const dr = premium > 0 ? dividends / premium : 0;
  return {
    lossRatio: round2(lr * 100),
    expenseRatio: round2(er * 100),
    combinedRatio: round2((lr + er + dr) * 100),
    underwritingProfit: round2(premium - losses - expenses - dividends),
  };
};

// --- 2. Customer Effort Score Calculator -----------------------------------------------
export const customerEffortScoreCalculator: CustomCalculator = (values) => {
  const counts = [1, 2, 3, 4, 5, 6, 7].map((k) => pos(values[`score${k}`], [4, 6, 10, 20, 40, 60, 60][k - 1]));
  const total = counts.reduce((a, b) => a + b, 0);
  const sum = counts.reduce((a, c, i) => a + c * (i + 1), 0);
  const easy = counts[4] + counts[5] + counts[6];
  const hard = counts[0] + counts[1] + counts[2];
  return {
    responses: total,
    averageCes: round2(total > 0 ? sum / total : 0),
    percentEasy: round2(total > 0 ? (easy / total) * 100 : 0),
    percentDifficult: round2(total > 0 ? (hard / total) * 100 : 0),
    netEaseScore: round2(total > 0 ? ((easy - hard) / total) * 100 : 0),
  };
};

// --- 3. TRIR Calculator ----------------------------------------------------------------
export const trirCalculator: CustomCalculator = (values) => {
  const hours = pos(values.hoursWorked, 400000);
  const recordable = pos(values.recordableCases, 6);
  const dart = pos(values.dartCases, 3);
  const lostTime = pos(values.lostTimeCases, 2);
  const f = (n: number) => round2(hours > 0 ? (n * 200000) / hours : 0);
  return {
    trir: f(recordable),
    dartRate: f(dart),
    ltir: f(lostTime),
    fullTimeEquivalentWorkers: round2(hours / 2000),
  };
};

// --- 4. Fibonacci Retracement Calculator -----------------------------------------------
export const fibonacciRetracementCalculator: CustomCalculator = (values) => {
  const high = pos(values.swingHigh, 150);
  const low = pos(values.swingLow, 100);
  const up = num(values.trend, 1) === 1;
  const range = high - low;
  const lvl = (r: number) => round2(up ? high - range * r : low + range * r);
  const ext = (r: number) => round2(up ? low + range * r : high - range * r);
  return {
    level236: lvl(0.236),
    level382: lvl(0.382),
    level500: lvl(0.5),
    level618: lvl(0.618),
    level786: lvl(0.786),
    extension1272: ext(1.272),
    extension1618: ext(1.618),
  };
};

// --- 5. Pivot Point Calculator ---------------------------------------------------------
export const pivotPointCalculator: CustomCalculator = (values) => {
  const h = pos(values.high, 52);
  const l = pos(values.low, 48);
  const c = pos(values.close, 51);
  const method = num(values.method, 1); // 1 classic, 2 Woodie, 3 Fibonacci
  const range = h - l;
  if (method === 3) {
    const p = (h + l + c) / 3;
    return { pivot: round2(p), r1: round2(p + 0.382 * range), r2: round2(p + 0.618 * range), r3: round2(p + range), s1: round2(p - 0.382 * range), s2: round2(p - 0.618 * range), s3: round2(p - range) };
  }
  const p = method === 2 ? (h + l + 2 * c) / 4 : (h + l + c) / 3;
  return {
    pivot: round2(p),
    r1: round2(2 * p - l),
    r2: round2(p + range),
    r3: round2(h + 2 * (p - l)),
    s1: round2(2 * p - h),
    s2: round2(p - range),
    s3: round2(l - 2 * (h - p)),
  };
};

// --- 6. Relative Strength Index Calculator ---------------------------------------------
export const rsiCalculator: CustomCalculator = (values) => {
  const prices: number[] = [];
  for (let k = 1; k <= 20; k++) {
    const p = pos(values[`price${k}`], 0);
    if (p > 0) prices.push(p);
  }
  const n = clamp(Math.round(num(values.period, 14)), 2, 19);
  if (prices.length < n + 1) return { rsi: 0, averageGain: 0, averageLoss: 0, signal: 0, pricesUsed: prices.length };
  let gain = 0;
  let loss = 0;
  for (let k = 1; k <= n; k++) {
    const d = prices[k] - prices[k - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  for (let k = n + 1; k < prices.length; k++) {
    const d = prices[k] - prices[k - 1];
    gain = (gain * (n - 1) + Math.max(0, d)) / n;
    loss = (loss * (n - 1) + Math.max(0, -d)) / n;
  }
  const rsi = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  return {
    rsi: round2(rsi),
    averageGain: round4(gain),
    averageLoss: round4(loss),
    // 1 overbought (≥ 70), 2 neutral, 3 oversold (≤ 30)
    signal: rsi >= 70 ? 1 : rsi <= 30 ? 3 : 2,
    pricesUsed: prices.length,
  };
};

// --- 7. Remote vs On-Location Workers Calculator ---------------------------------------
export const remoteVsOnLocationCalculator: CustomCalculator = (values) => {
  const staff = pos(values.employees, 20);
  const salary = pos(values.averageSalary, 70000);
  const office = pos(values.officeCostPerSeat, 12000) + pos(values.officeSuppliesPerSeat, 1500);
  const remote = pos(values.remoteStipend, 1200) + pos(values.remoteEquipmentPerYear, 800) + pos(values.remoteSoftwarePerSeat, 400);
  const prod = num(values.productivityChange, 0) / 100;
  const turnoverSaving = pos(values.turnoverSavingsPerRemote, 0);
  const officeCost = salary + office;
  const remoteCost = salary + remote - salary * prod - turnoverSaving;
  return {
    costPerOnLocationWorker: round2(officeCost),
    costPerRemoteWorker: round2(remoteCost),
    savingsPerWorker: round2(officeCost - remoteCost),
    totalYearlySavings: round2((officeCost - remoteCost) * staff),
  };
};

// --- 8. California Overtime Calculator -------------------------------------------------
export const californiaOvertimeCalculator: CustomCalculator = (values) => {
  const rate = pos(values.hourlyRate, 22);
  const hours = [1, 2, 3, 4, 5, 6, 7].map((d) => clamp(pos(values[`day${d}`], [9, 10, 8, 13, 8, 0, 0][d - 1]), 0, 24));
  const seventh = hours.every((h) => h > 0);
  let reg = 0;
  let ot = 0;
  let dt = 0;
  hours.forEach((h, i) => {
    if (seventh && i === 6) {
      ot += Math.min(h, 8);
      dt += Math.max(0, h - 8);
      return;
    }
    let r = Math.min(h, 8);
    let o = clamp(h - 8, 0, 4);
    const d = Math.max(0, h - 12);
    // Weekly rule: regular hours beyond 40 in the workweek become overtime.
    if (reg + r > 40) {
      const over = reg + r - 40;
      r -= over;
      o += over;
    }
    reg += r;
    ot += o;
    dt += d;
  });
  return {
    totalHours: round2(hours.reduce((a, b) => a + b, 0)),
    regularHours: round2(reg),
    overtimeHours: round2(ot),
    doubleTimeHours: round2(dt),
    regularPay: round2(reg * rate),
    overtimePay: round2(ot * rate * 1.5 + dt * rate * 2),
    totalPay: round2(reg * rate + ot * rate * 1.5 + dt * rate * 2),
  };
};

// --- 9. Change Calculator --------------------------------------------------------------
const DENOMS: [string, number][] = [["bills100", 10000], ["bills50", 5000], ["bills20", 2000], ["bills10", 1000], ["bills5", 500], ["bills1", 100], ["quarters", 25], ["dimes", 10], ["nickels", 5], ["pennies", 1]];

export const changeCalculator: CustomCalculator = (values) => {
  const due = Math.round(pos(values.amountDue, 37.42) * 100);
  const paid = Math.round(pos(values.amountPaid, 100) * 100);
  let left = Math.max(0, paid - due);
  const out: Record<string, number> = { changeDue: left / 100, shortBy: Math.max(0, due - paid) / 100 };
  let pieces = 0;
  for (const [key, cents] of DENOMS) {
    const n = Math.floor(left / cents);
    out[key] = n;
    pieces += n;
    left -= n * cents;
  }
  out.totalPieces = pieces;
  return out;
};

export const fin4TradingOpsCustomCalculators: Record<string, CustomCalculator> = {
  "combined-ratio-calculator": combinedRatioCalculator,
  "customer-effort-score-calculator": customerEffortScoreCalculator,
  "trir-calculator": trirCalculator,
  "fibonacci-retracement-calculator": fibonacciRetracementCalculator,
  "pivot-point-calculator": pivotPointCalculator,
  "rsi-calculator": rsiCalculator,
  "remote-vs-on-location-workers-calculator": remoteVsOnLocationCalculator,
  "california-overtime-calculator": californiaOvertimeCalculator,
  "change-calculator": changeCalculator,
};
