/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 6 of 8 —
 * Mining (4 tools), filed under Crypto Calculators > Crypto Staking, DeFi &
 * Mining Calculators. See calc-engine-crypto-trading.ts for the full batch
 * context.
 *
 *  - cryptoMiningProfitability (incl. mining electricity cost, mining rig
 *    break-even, mining pool fee impact): your hashrate share of the network
 *    x blocks per day x (subsidy + fees), less pool fee and power cost;
 *    break-even days and electricity rate; efficiency in J/TH.
 *  - bitcoinHalvingImpact: subsidy halves, transaction fees don't; revenue,
 *    profit and break-even price after the halving (next ~2028: 3.125 ->
 *    1.5625 BTC).
 *  - asicVsGpuMining: daily revenue less power over the months, less the
 *    hardware cost plus resale value.
 *  - cloudMiningContract: hashrate share with monthly difficulty growth,
 *    less the daily maintenance fee (paused when fees exceed revenue), vs
 *    the contract price.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-mining-calculators.ts for the copy.
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

// --- 1. Crypto Mining Profitability Calculator -----------------------------------------
export const cryptoMiningProfitabilityCalculator: CustomCalculator = (values) => {
  const hashrateThs = pos(values.hashrateThs, 200);
  const powerWatts = pos(values.powerWatts, 3500);
  const electricityRate = pos(values.electricityRate, 0.06);
  const networkHashrateEhs = pos(values.networkHashrateEhs, 650);
  const blockReward = pos(values.blockReward, 3.125);
  const feesPerBlock = pos(values.feesPerBlock, 0.05);
  const coinPrice = pos(values.coinPrice, 60000);
  const poolFeePercent = Math.min(100, pos(values.poolFeePercent, 2));
  const rigCost = pos(values.rigCost, 4000);

  const share = networkHashrateEhs > 0 ? hashrateThs / (networkHashrateEhs * 1e6) : 0;
  const grossCoins = share * 144 * (blockReward + feesPerBlock);
  const coins = grossCoins * (1 - poolFeePercent / 100);
  const revenue = coins * coinPrice;
  const kwhPerDay = (powerWatts / 1000) * 24;
  const power = kwhPerDay * electricityRate;
  const profit = revenue - power;

  return {
    dailyCoinsMined: round8(coins),
    dailyRevenue: round2(revenue),
    dailyPoolFee: round2((grossCoins - coins) * coinPrice),
    dailyElectricityCost: round2(power),
    dailyProfit: round2(profit),
    monthlyProfit: round2(profit * 30.44),
    breakEvenDays: round2(profit > 0 ? rigCost / profit : 0),
    breakEvenElectricityRate: Math.round((kwhPerDay > 0 ? revenue / kwhPerDay : 0) * 1000) / 1000,
    efficiencyJPerTh: round2(hashrateThs > 0 ? powerWatts / hashrateThs : 0),
  };
};

// --- 2. Bitcoin Halving Impact Calculator ----------------------------------------------
export const bitcoinHalvingImpactCalculator: CustomCalculator = (values) => {
  const monthlyCoins = pos(values.monthlyCoins, 0.004);
  const coinPrice = pos(values.coinPrice, 60000);
  const monthlyCosts = pos(values.monthlyCosts, 150);
  const feeSharePercent = Math.min(100, pos(values.feeSharePercent, 2));

  const fees = feeSharePercent / 100;
  const coinsAfter = monthlyCoins * (fees + (1 - fees) / 2);
  const revenueNow = monthlyCoins * coinPrice;
  const revenueAfter = coinsAfter * coinPrice;

  return {
    monthlyRevenueNow: round2(revenueNow),
    monthlyCoinsAfterHalving: round8(coinsAfter),
    monthlyRevenueAfterHalving: round2(revenueAfter),
    monthlyProfitNow: round2(revenueNow - monthlyCosts),
    monthlyProfitAfterHalving: round2(revenueAfter - monthlyCosts),
    breakEvenPriceAfterHalving: round2(coinsAfter > 0 ? monthlyCosts / coinsAfter : 0),
  };
};

// --- 3. ASIC vs GPU Mining Calculator --------------------------------------------------
export const asicVsGpuMiningCalculator: CustomCalculator = (values) => {
  const electricityRate = pos(values.electricityRate, 0.06);
  const months = pos(values.months, 24);
  const asicCost = pos(values.asicCost, 4000);
  const asicDailyRevenue = pos(values.asicDailyRevenue, 9);
  const asicPowerWatts = pos(values.asicPowerWatts, 3500);
  const asicResalePercent = Math.min(100, pos(values.asicResalePercent, 20));
  const gpuCost = pos(values.gpuCost, 3000);
  const gpuDailyRevenue = pos(values.gpuDailyRevenue, 2.5);
  const gpuPowerWatts = pos(values.gpuPowerWatts, 1200);
  const gpuResalePercent = Math.min(100, pos(values.gpuResalePercent, 50));

  const days = months * 30.44;
  const asicDaily = asicDailyRevenue - (asicPowerWatts / 1000) * 24 * electricityRate;
  const gpuDaily = gpuDailyRevenue - (gpuPowerWatts / 1000) * 24 * electricityRate;
  const asicNet = asicDaily * days - asicCost * (1 - asicResalePercent / 100);
  const gpuNet = gpuDaily * days - gpuCost * (1 - gpuResalePercent / 100);

  return {
    asicDailyProfit: round2(asicDaily),
    gpuDailyProfit: round2(gpuDaily),
    asicNetResult: round2(asicNet),
    gpuNetResult: round2(gpuNet),
    asicPaybackDays: round2(asicDaily > 0 ? asicCost / asicDaily : 0),
    gpuPaybackDays: round2(gpuDaily > 0 ? gpuCost / gpuDaily : 0),
    asicAdvantage: round2(asicNet - gpuNet),
  };
};

// --- 4. Cloud Mining Contract Calculator -----------------------------------------------
export const cloudMiningContractCalculator: CustomCalculator = (values) => {
  const contractPrice = pos(values.contractPrice, 1000);
  const hashrateThs = pos(values.hashrateThs, 50);
  const days = Math.min(3650, Math.round(pos(values.days, 365)));
  const feePerThDay = pos(values.feePerThDay, 0.03);
  const coinPrice = pos(values.coinPrice, 60000);
  const networkHashrateEhs = pos(values.networkHashrateEhs, 650);
  const blockReward = pos(values.blockReward, 3.125);
  const difficultyGrowthMonthlyPercent = pos(values.difficultyGrowthMonthlyPercent, 2);

  const startCoins = networkHashrateEhs > 0 ? (hashrateThs / (networkHashrateEhs * 1e6)) * 144 * blockReward : 0;
  const fee = feePerThDay * hashrateThs;
  let coins = 0;
  let fees = 0;
  for (let d = 0; d < days; d++) {
    const c = startCoins / Math.pow(1 + difficultyGrowthMonthlyPercent / 100, d / 30.44);
    if (c * coinPrice > fee) {
      coins += c - fee / coinPrice;
      fees += fee;
    }
  }
  const value = coins * coinPrice;

  return {
    firstDayRevenue: round2(startCoins * coinPrice),
    dailyMaintenanceFee: round2(fee),
    netCoinsMined: round8(coins),
    totalMaintenanceFees: round2(fees),
    netValueMined: round2(value),
    profitOrLoss: round2(value - contractPrice),
    roiPercent: round2(contractPrice > 0 ? ((value - contractPrice) / contractPrice) * 100 : 0),
  };
};

export const cryptoMiningCustomCalculators: Record<string, CustomCalculator> = {
  "crypto-mining-profitability-calculator": cryptoMiningProfitabilityCalculator,
  "bitcoin-halving-impact-calculator": bitcoinHalvingImpactCalculator,
  "asic-vs-gpu-mining-calculator": asicVsGpuMiningCalculator,
  "cloud-mining-contract-calculator": cloudMiningContractCalculator,
};
