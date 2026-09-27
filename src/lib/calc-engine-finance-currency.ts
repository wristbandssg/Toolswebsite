/**
 * Batch: "Currency & Exchange Calculators" (3 tools). Part of the
 * Finance_Calculators_Topical_SEO_Master.xlsx build-out (see
 * calc-engine-finance-credit-debt.ts for the full batch list/context).
 * Self-contained: no imports from any other batch.
 *
 * Currency Converter uses a user-supplied exchange rate rather than a live
 * FX feed — this project doesn't call paid/external APIs (standing
 * project rule), so the visitor enters today's rate from any source they
 * trust and gets the conversion math done for them.
 *
 * See prisma/create-finance-currency-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Currency Converter ------------------------------------------------------
export const currencyConverterCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const exchangeRate = Math.max(0.000001, safeNumber(values.exchangeRate, 1));

  const convertedAmount = amount * exchangeRate;
  const inverseRate = 1 / exchangeRate;

  return {
    convertedAmount: round2(convertedAmount),
    inverseRate: Math.round(inverseRate * 1000000) / 1000000,
  };
};

// --- 2. Forex Profit/Loss Calculator ---------------------------------------------
export const forexProfitLossCalculator: CustomCalculator = (values) => {
  const positionSizeUnits = Math.max(0, safeNumber(values.positionSizeUnits));
  const entryPrice = Math.max(0.000001, safeNumber(values.entryPrice));
  const exitPrice = Math.max(0, safeNumber(values.exitPrice));
  // direction: 1 = Long (buy), -1 = Short (sell)
  const direction = safeNumber(values.tradeDirection, 1) >= 0 ? 1 : -1;

  const priceDifference = exitPrice - entryPrice;
  const profitLoss = positionSizeUnits * priceDifference * direction;
  const notionalValue = entryPrice * positionSizeUnits;
  const profitLossPercent = notionalValue > 0 ? (profitLoss / notionalValue) * 100 : 0;

  return {
    profitLoss: round2(profitLoss),
    profitLossPercent: round2(profitLossPercent),
  };
};

// --- 3. Forex Position Size Calculator --------------------------------------------
const UNITS_PER_STANDARD_LOT = 100000;

export const forexPositionSizeCalculator: CustomCalculator = (values) => {
  const accountBalance = Math.max(0, safeNumber(values.accountBalance));
  const riskPercent = Math.max(0, safeNumber(values.riskPercent, 2));
  const stopLossPips = Math.max(0.01, safeNumber(values.stopLossPips));
  const pipValuePerStandardLot = Math.max(0.01, safeNumber(values.pipValuePerStandardLot, 10));

  const riskAmount = accountBalance * (riskPercent / 100);
  const positionSizeInLots = riskAmount / (stopLossPips * pipValuePerStandardLot);
  const positionSizeUnits = positionSizeInLots * UNITS_PER_STANDARD_LOT;

  return {
    riskAmount: round2(riskAmount),
    positionSizeInLots: Math.round(positionSizeInLots * 100) / 100,
    positionSizeUnits: Math.round(positionSizeUnits),
  };
};

export const financeCurrencyCustomCalculators: Record<string, CustomCalculator> = {
  "currency-converter": currencyConverterCalculator,
  "forex-profit-loss-calculator": forexProfitLossCalculator,
  "forex-position-size-calculator": forexPositionSizeCalculator,
};
