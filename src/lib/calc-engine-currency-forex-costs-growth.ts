/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch F
 * (Forex Costs, Returns & Account Growth, 11 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - forexBreakEvenCalculator: the price a trade must reach to cover the
 *    spread, commission and swap.
 *  - forexCommissionCalculator: commission per trade, month and year, and
 *    its size in pips.
 *  - forexSpreadCalculator: the spread's cost per trade, month and year.
 *  - forexSwapCalculator: the broker's swap points per night (with the
 *    triple-swap day) over a hold.
 *  - forexRolloverCalculator: rollover built from the two currencies'
 *    interest rates and the broker's markup — long vs short.
 *  - forexFinancingCostCalculator: a yearly financing rate on a leveraged
 *    position — cost vs your margin and pips needed per day to cover it.
 *  - forexReturnCalculator: an account's return for a period with deposits
 *    and withdrawals taken out (Modified Dietz), annualized.
 *  - forexRoiCalculator: expected profit and ROI from win rate, average win,
 *    average loss and trades per month (expectancy).
 *  - forexDrawdownCalculator: maximum and current drawdown from the peak and
 *    the gain needed to recover.
 *  - forexAccountGrowthCalculator: monthly growth with deposits — balance
 *    after N months and months to reach a target.
 *  - forexCompoundingCalculator: reinvesting profits vs withdrawing a share
 *    of them each period.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-forex-costs-growth-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundTo(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

const MIN_RATE = 0.000001;
const rate = (v: number, d: number) => Math.max(MIN_RATE, safeNumber(v, d));
const pip = (v: number) => (safeNumber(v, 0.0001) === 0.01 ? 0.01 : 0.0001);
const dir = (v: number) => (safeNumber(v, 1) === 2 ? -1 : 1); // 1 = long, 2 = short

// --- 1. Forex Break-Even (price that covers costs) --------------------------
export const forexBreakEvenCalculator: CustomCalculator = (values) => {
  const entryPrice = rate(values.entryPrice, 1.085);
  const direction = dir(values.direction);
  const lots = Math.max(0.0001, safeNumber(values.lots, 1));
  const pipSize = pip(values.pipSize);
  const pipValuePerLot = Math.max(0.0001, safeNumber(values.pipValuePerLot, 10));
  const spreadPips = Math.max(0, safeNumber(values.spreadPips, 1.2));
  const commissionPerLotRoundTrip = Math.max(0, safeNumber(values.commissionPerLotRoundTrip, 7));
  const swapCost = Math.max(0, safeNumber(values.swapCost, 0));

  const costs = spreadPips * pipValuePerLot * lots + commissionPerLotRoundTrip * lots + swapCost;
  const pips = costs / (pipValuePerLot * lots);

  return {
    breakEvenPrice: roundTo(entryPrice + direction * pips * pipSize, 6),
    pipsToBreakEven: round2(pips),
    totalCosts: round2(costs),
  };
};

// --- 2. Forex Commission ---------------------------------------------------------
export const forexCommissionCalculator: CustomCalculator = (values) => {
  const commissionPerLotPerSide = Math.max(0, safeNumber(values.commissionPerLotPerSide, 3.5));
  const lotsPerTrade = Math.max(0, safeNumber(values.lotsPerTrade, 1));
  const tradesPerMonth = Math.max(0, safeNumber(values.tradesPerMonth, 40));
  const pipValuePerLot = Math.max(0.0001, safeNumber(values.pipValuePerLot, 10));

  const perTrade = commissionPerLotPerSide * 2 * lotsPerTrade;

  return {
    commissionPerMonth: round2(perTrade * tradesPerMonth),
    commissionPerTrade: round2(perTrade),
    commissionPerYear: round2(perTrade * tradesPerMonth * 12),
    commissionInPips: round2((commissionPerLotPerSide * 2) / pipValuePerLot),
  };
};

// --- 3. Forex Spread (cost of the spread) --------------------------------------
export const forexSpreadCalculator: CustomCalculator = (values) => {
  const spreadPips = Math.max(0, safeNumber(values.spreadPips, 1.2));
  const pipValuePerLot = Math.max(0, safeNumber(values.pipValuePerLot, 10));
  const lots = Math.max(0, safeNumber(values.lots, 1));
  const tradesPerMonth = Math.max(0, safeNumber(values.tradesPerMonth, 40));

  const perTrade = spreadPips * pipValuePerLot * lots;

  return {
    spreadCostPerMonth: round2(perTrade * tradesPerMonth),
    spreadCostPerTrade: round2(perTrade),
    spreadCostPerYear: round2(perTrade * tradesPerMonth * 12),
  };
};

// --- 4. Forex Swap (broker swap points) --------------------------------------
export const forexSwapCalculator: CustomCalculator = (values) => {
  // Negative = you pay, positive = you earn.
  const swapPipsPerNight = safeNumber(values.swapPipsPerNight, -0.6);
  const pipValuePerLot = Math.max(0, safeNumber(values.pipValuePerLot, 10));
  const lots = Math.max(0, safeNumber(values.lots, 2));
  const nights = Math.max(0, Math.min(3650, Math.round(safeNumber(values.nights, 10))));
  // Most brokers charge 3 nights on Wednesday to cover the weekend.
  const tripleSwapDays = Math.max(0, Math.min(nights, Math.round(safeNumber(values.tripleSwapDays, 2))));

  const charged = nights + 2 * tripleSwapDays;
  const perNight = swapPipsPerNight * pipValuePerLot * lots;

  return {
    totalSwap: round2(perNight * charged),
    swapPerNight: round2(perNight),
    nightsCharged: charged,
  };
};

// --- 5. Forex Rollover (interest differential) ---------------------------------
export const forexRolloverCalculator: CustomCalculator = (values) => {
  const units = Math.max(0, safeNumber(values.units, 100000));
  const pairPrice = rate(values.pairPrice, 1.085);
  const baseRatePercent = safeNumber(values.baseRatePercent, 2);
  const quoteRatePercent = safeNumber(values.quoteRatePercent, 4);
  const brokerMarkupPercent = Math.max(0, safeNumber(values.brokerMarkupPercent, 0.5));
  const quoteToAccountRate = rate(values.quoteToAccountRate, 1);
  const nights = Math.max(0, Math.min(3650, safeNumber(values.nights, 1)));

  const notional = units * pairPrice * quoteToAccountRate;
  const longRate = baseRatePercent - quoteRatePercent - brokerMarkupPercent;
  const shortRate = quoteRatePercent - baseRatePercent - brokerMarkupPercent;
  const daily = (r: number) => (notional * r) / 100 / 365;

  return {
    longRolloverTotal: round2(daily(longRate) * nights),
    shortRolloverTotal: round2(daily(shortRate) * nights),
    longRolloverPerNight: round2(daily(longRate)),
    shortRolloverPerNight: round2(daily(shortRate)),
    longAnnualRatePercent: round2(longRate),
    shortAnnualRatePercent: round2(shortRate),
  };
};

// --- 6. Forex Financing Cost (yearly rate on a leveraged position) --------
export const forexFinancingCostCalculator: CustomCalculator = (values) => {
  const positionValue = Math.max(0, safeNumber(values.positionValue, 100000));
  const annualFinancingRatePercent = Math.max(0, safeNumber(values.annualFinancingRatePercent, 6.5));
  const days = Math.max(0, Math.min(3650, safeNumber(values.days, 30)));
  const marginPosted = Math.max(0.01, safeNumber(values.marginPosted, 3333));
  const pipValue = Math.max(0.0001, safeNumber(values.pipValue, 10));

  const daily = (positionValue * annualFinancingRatePercent) / 100 / 365;
  const total = daily * days;

  return {
    totalFinancingCost: round2(total),
    financingCostPerDay: round2(daily),
    costPercentOfMargin: round2((total / marginPosted) * 100),
    pipsPerDayToCover: round2(daily / pipValue),
  };
};

// --- 7. Forex Return (Modified Dietz) -------------------------------------------
export const forexReturnCalculator: CustomCalculator = (values) => {
  const startBalance = Math.max(0, safeNumber(values.startBalance, 10000));
  const endBalance = Math.max(0, safeNumber(values.endBalance, 11800));
  const deposits = Math.max(0, safeNumber(values.deposits, 1000));
  const withdrawals = Math.max(0, safeNumber(values.withdrawals, 500));
  const months = Math.max(0.1, Math.min(600, safeNumber(values.months, 6)));

  const gain = endBalance - startBalance - deposits + withdrawals;
  // Deposits and withdrawals assumed to arrive halfway through the period.
  const avgCapital = startBalance + 0.5 * (deposits - withdrawals);
  const r = avgCapital > 0 ? gain / avgCapital : 0;

  return {
    returnPercent: round2(r * 100),
    tradingGain: round2(gain),
    annualizedReturnPercent: r > -1 ? round2((Math.pow(1 + r, 12 / months) - 1) * 100) : -100,
  };
};

// --- 8. Forex ROI (expectancy-based) --------------------------------------------
export const forexRoiCalculator: CustomCalculator = (values) => {
  const accountBalance = Math.max(0.01, safeNumber(values.accountBalance, 10000));
  const winRatePercent = Math.min(100, Math.max(0, safeNumber(values.winRatePercent, 50)));
  const averageWin = Math.max(0, safeNumber(values.averageWin, 150));
  const averageLoss = Math.max(0, safeNumber(values.averageLoss, 100));
  const tradesPerMonth = Math.max(0, safeNumber(values.tradesPerMonth, 20));
  const costsPerTrade = Math.max(0, safeNumber(values.costsPerTrade, 7));

  const w = winRatePercent / 100;
  const expectancy = w * averageWin - (1 - w) * averageLoss - costsPerTrade;
  const monthly = expectancy * tradesPerMonth;

  return {
    monthlyRoiPercent: round2((monthly / accountBalance) * 100),
    expectancyPerTrade: round2(expectancy),
    expectedMonthlyProfit: round2(monthly),
    expectedYearlyProfit: round2(monthly * 12),
    profitFactor: (1 - w) * averageLoss > 0 ? round2((w * averageWin) / ((1 - w) * averageLoss)) : 0,
  };
};

// --- 9. Forex Drawdown -------------------------------------------------------------
export const forexDrawdownCalculator: CustomCalculator = (values) => {
  const peakBalance = Math.max(0.01, safeNumber(values.peakBalance, 12000));
  const lowestBalance = Math.max(0, Math.min(peakBalance, safeNumber(values.lowestBalance, 9000)));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 10500));

  const maxDd = 1 - lowestBalance / peakBalance;
  const curDd = Math.max(0, 1 - currentBalance / peakBalance);

  return {
    maxDrawdownPercent: round2(maxDd * 100),
    maxDrawdownAmount: round2(peakBalance - lowestBalance),
    gainNeededFromLowPercent: lowestBalance > 0 ? round2((peakBalance / lowestBalance - 1) * 100) : 0,
    currentDrawdownPercent: round2(curDd * 100),
    gainNeededFromCurrentPercent: currentBalance > 0 ? round2(Math.max(0, peakBalance / currentBalance - 1) * 100) : 0,
  };
};

// --- 10. Forex Account Growth (monthly, with deposits) ----------------------
export const forexAccountGrowthCalculator: CustomCalculator = (values) => {
  const startBalance = Math.max(0, safeNumber(values.startBalance, 5000));
  const monthlyReturnPercent = Math.max(-99, Math.min(100, safeNumber(values.monthlyReturnPercent, 3)));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 200));
  const months = Math.max(0, Math.min(600, Math.round(safeNumber(values.months, 24))));
  const targetBalance = Math.max(0, safeNumber(values.targetBalance, 20000));

  const r = monthlyReturnPercent / 100;
  let b = startBalance;
  let toTarget = startBalance >= targetBalance ? 0 : -1;
  let end = startBalance;
  for (let m = 1; m <= 600; m++) {
    b = b * (1 + r) + monthlyDeposit;
    if (m === months) end = b;
    if (toTarget < 0 && b >= targetBalance) toTarget = m;
    if (m >= months && toTarget >= 0) break;
  }
  if (months === 0) end = startBalance;

  return {
    endBalance: round2(end),
    totalDeposited: round2(startBalance + monthlyDeposit * months),
    tradingProfit: round2(end - startBalance - monthlyDeposit * months),
    // 0 = already there or not reached within 50 years.
    monthsToTarget: Math.max(0, toTarget),
  };
};

// --- 11. Forex Compounding (reinvest vs withdraw) ---------------------------
export const forexCompoundingCalculator: CustomCalculator = (values) => {
  const startBalance = Math.max(0, safeNumber(values.startBalance, 1000));
  const returnPerPeriodPercent = Math.max(-99, Math.min(100, safeNumber(values.returnPerPeriodPercent, 1)));
  const periods = Math.max(0, Math.min(1000, Math.round(safeNumber(values.periods, 100))));
  const withdrawPercentOfProfit = Math.min(100, Math.max(0, safeNumber(values.withdrawPercentOfProfit, 0)));

  const r = returnPerPeriodPercent / 100;
  const w = withdrawPercentOfProfit / 100;
  let b = startBalance;
  let withdrawn = 0;
  for (let p = 0; p < periods; p++) {
    const profit = b * r;
    const out = profit > 0 ? profit * w : 0;
    withdrawn += out;
    b += profit - out;
  }
  const simple = startBalance * (1 + r * periods);

  return {
    finalBalance: round2(b),
    totalWithdrawn: round2(withdrawn),
    totalWealth: round2(b + withdrawn),
    wealthIfNoCompounding: round2(simple),
    compoundingBonus: round2(b + withdrawn - simple),
  };
};

export const currencyForexCostsGrowthCustomCalculators: Record<string, CustomCalculator> = {
  "forex-break-even-calculator": forexBreakEvenCalculator,
  "forex-commission-calculator": forexCommissionCalculator,
  "forex-spread-calculator": forexSpreadCalculator,
  "forex-swap-calculator": forexSwapCalculator,
  "forex-rollover-calculator": forexRolloverCalculator,
  "forex-financing-cost-calculator": forexFinancingCostCalculator,
  "forex-return-calculator": forexReturnCalculator,
  "forex-roi-calculator": forexRoiCalculator,
  "forex-drawdown-calculator": forexDrawdownCalculator,
  "forex-account-growth-calculator": forexAccountGrowthCalculator,
  "forex-compounding-calculator": forexCompoundingCalculator,
};
