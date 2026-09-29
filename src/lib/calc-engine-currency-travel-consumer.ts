/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch D
 * (Travel & Everyday Currency, 9 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Rates here are foreign currency per 1 unit of your home currency (e.g.
 * 0.92 euros per dollar), the way travel money is usually quoted.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - travelMoneyCalculator: a trip BUDGET — days × daily spend plus extras
 *    and a buffer — in foreign currency and what it costs you.
 *  - travelCurrencyConverter: one PRICE abroad — what it really costs on a
 *    card with a foreign fee vs cash from a booth.
 *  - holidayMoneyCalculator: split a holiday budget into cash and card, and
 *    what buying the cash at the airport instead of pre-ordering loses.
 *  - cashExchangeCalculator: a bureau de change — rate, commission with a
 *    minimum, and selling leftover cash back.
 *  - bankExchangeRateCalculator: a bank's buy and sell rates built from the
 *    mid-market rate and its margin, and the cost on an amount.
 *  - creditCardExchangeRateCalculator: paying abroad in the local currency
 *    vs letting the merchant convert (dynamic currency conversion).
 *  - paypalCurrencyConversionCalculator: PayPal's conversion spread vs a
 *    bank's on the same amount.
 *  - internationalPriceConverter: is it cheaper to buy it abroad? — price
 *    compared, with a VAT/tax refund.
 *  - foreignSalaryCurrencyConverter: a salary abroad in your currency, and
 *    adjusted for how expensive the country is.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-travel-consumer-calculators.ts for the tool
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
const pctClamp = (v: number, d: number) => Math.min(100, Math.max(0, safeNumber(v, d)));

// --- 1. Travel Money (trip budget) -------------------------------------------
export const travelMoneyCalculator: CustomCalculator = (values) => {
  const days = Math.max(0, safeNumber(values.days, 10));
  const dailyBudgetForeign = Math.max(0, safeNumber(values.dailyBudgetForeign, 150));
  const extraCostsForeign = Math.max(0, safeNumber(values.extraCostsForeign, 400));
  const bufferPercent = Math.max(0, safeNumber(values.bufferPercent, 10));
  const exchangeRate = rate(values.exchangeRate, 0.92);

  const foreign = (days * dailyBudgetForeign + extraCostsForeign) * (1 + bufferPercent / 100);
  const home = foreign / exchangeRate;

  return {
    foreignCurrencyNeeded: round2(foreign),
    costInHomeCurrency: round2(home),
    costPerDay: days > 0 ? round2(home / days) : 0,
    bufferAmountForeign: round2(foreign - (days * dailyBudgetForeign + extraCostsForeign)),
  };
};

// --- 2. Travel Currency Converter (card vs cash for one price) --------------
export const travelCurrencyConverter: CustomCalculator = (values) => {
  const priceForeign = Math.max(0, safeNumber(values.priceForeign, 45));
  const cardNetworkRate = rate(values.cardNetworkRate, 0.92);
  const cardFeePercent = pctClamp(values.cardFeePercent, 3);
  const cashBoothRate = rate(values.cashBoothRate, 0.86);

  const mid = priceForeign / cardNetworkRate;
  const card = mid * (1 + cardFeePercent / 100);
  const cash = priceForeign / cashBoothRate;

  return {
    costOnCard: round2(card),
    costWithBoothCash: round2(cash),
    costAtNetworkRate: round2(mid),
    cardMinusCash: round2(card - cash),
  };
};

// --- 3. Holiday Money (cash vs card split, airport vs pre-order) ------------
export const holidayMoneyCalculator: CustomCalculator = (values) => {
  const budget = Math.max(0, safeNumber(values.budget, 1500));
  const cashSharePercent = pctClamp(values.cashSharePercent, 40);
  const preOrderRate = rate(values.preOrderRate, 0.9);
  const airportRate = rate(values.airportRate, 0.82);

  const cashHome = (budget * cashSharePercent) / 100;
  const pre = cashHome * preOrderRate;
  const airport = cashHome * airportRate;

  return {
    cashIfPreOrdered: round2(pre),
    cashIfBoughtAtAirport: round2(airport),
    airportLossForeign: round2(pre - airport),
    airportLossHome: round2(cashHome - airport / preOrderRate),
    cashBudgetHome: round2(cashHome),
    cardBudgetHome: round2(budget - cashHome),
  };
};

// --- 4. Cash Exchange (bureau rate, commission, buy-back) -------------------
export const cashExchangeCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 500));
  const bureauRate = rate(values.bureauRate, 0.86);
  const commissionPercent = pctClamp(values.commissionPercent, 2);
  const minimumCommission = Math.max(0, safeNumber(values.minimumCommission, 3));
  const leftoverForeign = Math.max(0, safeNumber(values.leftoverForeign, 60));
  // Foreign currency the bureau wants for each 1 unit of home currency when
  // buying your leftovers back (higher than its selling rate).
  const buyBackRate = rate(values.buyBackRate, 0.98);

  const commission = amount > 0 ? Math.min(amount, Math.max(minimumCommission, (amount * commissionPercent) / 100)) : 0;
  const foreign = (amount - commission) * bureauRate;
  const leftoverHome = leftoverForeign / buyBackRate;
  const leftoverCost = amount > 0 && foreign > 0 ? leftoverForeign * (amount / foreign) : 0;

  return {
    foreignCashReceived: round2(foreign),
    commission: round2(commission),
    effectiveRate: amount > 0 ? roundTo(foreign / amount, 6) : 0,
    leftoverSoldBackFor: round2(leftoverHome),
    lossOnLeftovers: round2(leftoverCost - leftoverHome),
  };
};

// --- 5. Bank Exchange Rate (margin around mid-market) -----------------------
export const bankExchangeRateCalculator: CustomCalculator = (values) => {
  const midMarketRate = rate(values.midMarketRate, 0.92);
  const bankMarginPercent = Math.min(50, Math.max(0, safeNumber(values.bankMarginPercent, 3)));
  const amount = Math.max(0, safeNumber(values.amount, 1000));

  const youBuyAt = midMarketRate * (1 - bankMarginPercent / 100);
  const youSellAt = midMarketRate * (1 + bankMarginPercent / 100);

  return {
    foreignCurrencyReceived: round2(amount * youBuyAt),
    bankRateWhenYouBuy: roundTo(youBuyAt, 6),
    bankRateWhenYouSell: roundTo(youSellAt, 6),
    costVsMidMarket: round2(amount * (1 - youBuyAt / midMarketRate)),
  };
};

// --- 6. Credit Card Exchange Rate (local currency vs DCC) ------------------
export const creditCardExchangeRateCalculator: CustomCalculator = (values) => {
  const purchaseForeign = Math.max(0, safeNumber(values.purchaseForeign, 200));
  const networkRate = rate(values.networkRate, 0.92);
  const issuerFeePercent = pctClamp(values.issuerFeePercent, 3);
  const dccMarkupPercent = pctClamp(values.dccMarkupPercent, 5);
  // 1 = your card still adds its foreign fee on a DCC charge, 0 = it doesn't.
  const issuerFeeOnDcc = safeNumber(values.issuerFeeOnDcc, 1) === 0 ? 0 : 1;

  const base = purchaseForeign / networkRate;
  const local = base * (1 + issuerFeePercent / 100);
  const dcc = base * (1 + dccMarkupPercent / 100) * (issuerFeeOnDcc ? 1 + issuerFeePercent / 100 : 1);

  return {
    extraCostOfDcc: round2(dcc - local),
    costPayingInLocalCurrency: round2(local),
    costWithDcc: round2(dcc),
    costAtNetworkRate: round2(base),
  };
};

// --- 7. PayPal Currency Conversion (vs a bank) -------------------------------
export const paypalCurrencyConversionCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 500));
  const baseRate = rate(values.baseRate, 0.92);
  const paypalSpreadPercent = pctClamp(values.paypalSpreadPercent, 4);
  const bankSpreadPercent = pctClamp(values.bankSpreadPercent, 1);

  const paypal = amount * baseRate * (1 - paypalSpreadPercent / 100);
  const bank = amount * baseRate * (1 - bankSpreadPercent / 100);

  return {
    receivedWithPaypal: round2(paypal),
    receivedWithBank: round2(bank),
    paypalConversionCost: round2((amount * paypalSpreadPercent) / 100),
    extraCostOfPaypal: round2((amount * (paypalSpreadPercent - bankSpreadPercent)) / 100),
  };
};

// --- 8. International Price Converter (buy abroad?) -------------------------
export const internationalPriceConverter: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 1200));
  const foreignPrice = Math.max(0, safeNumber(values.foreignPrice, 999));
  const exchangeRate = rate(values.exchangeRate, 0.92);
  const taxRefundPercent = pctClamp(values.taxRefundPercent, 10);
  const cardFeePercent = pctClamp(values.cardFeePercent, 0);

  const converted = foreignPrice / exchangeRate;
  const net = converted * (1 + cardFeePercent / 100) * (1 - taxRefundPercent / 100);
  const saving = homePrice - net;

  return {
    savingBuyingAbroad: round2(saving),
    savingPercent: homePrice > 0 ? round2((saving / homePrice) * 100) : 0,
    foreignPriceInHomeCurrency: round2(converted),
    netCostAbroad: round2(net),
  };
};

// --- 9. Foreign Salary Currency Converter (nominal and cost-adjusted) -------
export const foreignSalaryCurrencyConverter: CustomCalculator = (values) => {
  const foreignSalary = Math.max(0, safeNumber(values.foreignSalary, 60000));
  // Home currency per 1 unit of the foreign currency.
  const exchangeRate = rate(values.exchangeRate, 1.085);
  // Prices abroad as a % of prices at home (100 = the same).
  const priceLevelPercent = Math.max(1, safeNumber(values.priceLevelPercent, 85));

  const nominal = foreignSalary * exchangeRate;
  const adjusted = nominal / (priceLevelPercent / 100);

  return {
    salaryInHomeCurrency: round2(nominal),
    costOfLivingEquivalent: round2(adjusted),
    monthlyInHomeCurrency: round2(nominal / 12),
    purchasingPowerGainPercent: round2((100 / priceLevelPercent - 1) * 100),
  };
};

export const currencyTravelConsumerCustomCalculators: Record<string, CustomCalculator> = {
  "travel-money-calculator": travelMoneyCalculator,
  "travel-currency-converter": travelCurrencyConverter,
  "holiday-money-calculator": holidayMoneyCalculator,
  "cash-exchange-calculator": cashExchangeCalculator,
  "bank-exchange-rate-calculator": bankExchangeRateCalculator,
  "credit-card-exchange-rate-calculator": creditCardExchangeRateCalculator,
  "paypal-currency-conversion-calculator": paypalCurrencyConversionCalculator,
  "international-price-converter": internationalPriceConverter,
  "foreign-salary-currency-converter": foreignSalaryCurrencyConverter,
};
