/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 3 of 8 —
 * Network & Exchange Fees (6 tools), filed under Crypto Calculators > Crypto
 * Fees, Payments & Loans Calculators. See calc-engine-crypto-trading.ts for
 * the full batch context.
 *
 *  - cryptoGasFee: gas units x (base fee + priority fee) in gwei -> ETH and
 *    dollars; monthly cost.
 *  - cryptoSwapFee: DEX pool fee + price impact + gas (+ aggregator fee);
 *    minimum received at the slippage tolerance.
 *  - cryptoWithdrawalFee: flat + % fee per withdrawal; yearly; savings on a
 *    cheaper network.
 *  - cryptoBridgingFee (incl. wrapped token value): bridge fee, gas on both
 *    chains, wrap/unwrap fee and peg discount.
 *  - cryptoAtmFee: Bitcoin ATM fee % + flat fee vs buying on an exchange.
 *  - cryptoP2pOtcTrade (incl. OTC trade premium): quoted price vs market ->
 *    premium cost, vs an exchange's fee + slippage.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-fees-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const pick = (v: number, d: number, n: number) => {
  const r = Math.round(safeNumber(v, d));
  return r >= 1 && r <= n ? r : d;
};

// --- 1. Crypto Gas Fee Calculator ------------------------------------------------------
export const cryptoGasFeeCalculator: CustomCalculator = (values) => {
  const gasUnits = pos(values.gasUnits, 21000);
  const baseFeeGwei = pos(values.baseFeeGwei, 10);
  const priorityFeeGwei = pos(values.priorityFeeGwei, 1);
  const ethPrice = pos(values.ethPrice, 3500);
  const txPerMonth = pos(values.txPerMonth, 10);

  const eth = gasUnits * (baseFeeGwei + priorityFeeGwei) * 1e-9;
  const usd = eth * ethPrice;

  return {
    gasPriceGwei: round2(baseFeeGwei + priorityFeeGwei),
    feeInEth: round8(eth),
    feeInDollars: round2(usd),
    monthlyGasCost: round2(usd * txPerMonth),
  };
};

// --- 2. Crypto Swap Fee Calculator -----------------------------------------------------
export const cryptoSwapFeeCalculator: CustomCalculator = (values) => {
  const swapAmount = pos(values.swapAmount, 5000);
  const poolFeePercent = pos(values.poolFeePercent, 0.3);
  const priceImpactPercent = pos(values.priceImpactPercent, 0.2);
  const aggregatorFeePercent = pos(values.aggregatorFeePercent, 0);
  const gasUsd = pos(values.gasUsd, 5);
  const slippageTolerancePercent = Math.min(100, pos(values.slippageTolerancePercent, 0.5));

  const poolFee = (swapAmount * poolFeePercent) / 100;
  const impact = (swapAmount * priceImpactPercent) / 100;
  const aggregator = (swapAmount * aggregatorFeePercent) / 100;
  const total = poolFee + impact + aggregator + gasUsd;
  const received = swapAmount - poolFee - impact - aggregator;

  return {
    poolFee: round2(poolFee),
    priceImpactCost: round2(impact),
    totalSwapCost: round2(total),
    costPercent: round2(swapAmount > 0 ? (total / swapAmount) * 100 : 0),
    expectedValueReceived: round2(received),
    minimumReceived: round2(received * (1 - slippageTolerancePercent / 100)),
  };
};

// --- 3. Crypto Withdrawal Fee Calculator -----------------------------------------------
export const cryptoWithdrawalFeeCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 500);
  const flatFee = pos(values.flatFee, 5);
  const percentFee = pos(values.percentFee, 0);
  const withdrawalsPerYear = pos(values.withdrawalsPerYear, 12);
  const altNetworkFee = pos(values.altNetworkFee, 0.5);

  const fee = flatFee + (amount * percentFee) / 100;

  return {
    feePerWithdrawal: round2(fee),
    feePercent: round2(amount > 0 ? (fee / amount) * 100 : 0),
    amountReceived: round2(Math.max(0, amount - fee)),
    yearlyFees: round2(fee * withdrawalsPerYear),
    amountForFeeUnder1Percent: round2(percentFee < 1 ? flatFee / ((1 - percentFee) / 100) : 0),
    yearlySavingsOnCheaperNetwork: round2(Math.max(0, flatFee - altNetworkFee) * withdrawalsPerYear),
  };
};

// --- 4. Crypto Bridging Fee Calculator -------------------------------------------------
export const cryptoBridgingFeeCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 2000);
  const bridgeFeePercent = pos(values.bridgeFeePercent, 0.1);
  const sourceGasUsd = pos(values.sourceGasUsd, 8);
  const destinationGasUsd = pos(values.destinationGasUsd, 0.5);
  const wrapFeePercent = pos(values.wrapFeePercent, 0);
  const pegDiscountPercent = pos(values.pegDiscountPercent, 0);

  const percentFees = (amount * (bridgeFeePercent + wrapFeePercent)) / 100;
  const total = percentFees + sourceGasUsd + destinationGasUsd;
  const received = Math.max(0, amount - percentFees - sourceGasUsd - destinationGasUsd);

  return {
    totalFees: round2(total),
    feePercent: round2(amount > 0 ? (total / amount) * 100 : 0),
    amountReceived: round2(received),
    valueAfterPegDiscount: round2(received * (1 - pegDiscountPercent / 100)),
  };
};

// --- 5. Crypto ATM Fee Calculator ------------------------------------------------------
export const cryptoAtmFeeCalculator: CustomCalculator = (values) => {
  const cashAmount = pos(values.cashAmount, 500);
  const atmFeePercent = Math.min(100, pos(values.atmFeePercent, 12));
  const flatFee = pos(values.flatFee, 3);
  const exchangeFeePercent = pos(values.exchangeFeePercent, 1.5);

  const atmFees = (cashAmount * atmFeePercent) / 100 + flatFee;
  const exchange = (cashAmount * exchangeFeePercent) / 100;

  return {
    atmFees: round2(atmFees),
    cryptoValueReceived: round2(Math.max(0, cashAmount - atmFees)),
    effectiveFeePercent: round2(cashAmount > 0 ? (atmFees / cashAmount) * 100 : 0),
    exchangeCost: round2(exchange),
    extraCostVsExchange: round2(atmFees - exchange),
  };
};

// --- 6. Crypto P2P & OTC Trade Calculator ----------------------------------------------
export const cryptoP2pOtcTradeCalculator: CustomCalculator = (values) => {
  const tradeAmount = pos(values.tradeAmount, 250000);
  const marketPrice = pos(values.marketPrice, 60000);
  const quotedPrice = pos(values.quotedPrice, 60300);
  const side = pick(values.side, 1, 2);
  const platformFeePercent = pos(values.platformFeePercent, 0);
  const exchangeCostPercent = pos(values.exchangeCostPercent, 0.6);

  const coins = quotedPrice > 0 ? tradeAmount / quotedPrice : 0;
  const premiumPerCoin = side === 1 ? quotedPrice - marketPrice : marketPrice - quotedPrice;
  const premiumCost = coins * premiumPerCoin;
  const total = premiumCost + (tradeAmount * platformFeePercent) / 100;
  const exchange = (tradeAmount * exchangeCostPercent) / 100;

  return {
    coins: round8(coins),
    premiumPercent: round2(marketPrice > 0 ? (premiumPerCoin / marketPrice) * 100 : 0),
    totalCostVsMarket: round2(total),
    exchangeEquivalentCost: round2(exchange),
    savingsVsExchange: round2(exchange - total),
  };
};

export const cryptoFeesCustomCalculators: Record<string, CustomCalculator> = {
  "crypto-gas-fee-calculator": cryptoGasFeeCalculator,
  "crypto-swap-fee-calculator": cryptoSwapFeeCalculator,
  "crypto-withdrawal-fee-calculator": cryptoWithdrawalFeeCalculator,
  "crypto-bridging-fee-calculator": cryptoBridgingFeeCalculator,
  "crypto-atm-fee-calculator": cryptoAtmFeeCalculator,
  "crypto-p2p-otc-trade-calculator": cryptoP2pOtcTradeCalculator,
};
