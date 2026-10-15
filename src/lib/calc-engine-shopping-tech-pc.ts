/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — PC building
 * and upgrades (8 tools):
 *
 *  - pcBottleneck: CPU vs GPU balance from tier scores at a resolution
 *    (CPU matters more at 1080p, less at 4K).
 *  - pcPowerSupply: system load from CPU, GPU and other parts, and the PSU
 *    size with headroom for transient spikes.
 *  - pcBuildPrice (also PC parts): adds up parts with tax and shows the GPU's
 *    share of the budget.
 *  - pcPowerConsumption: monthly and yearly electricity cost of a PC.
 *  - pcWorth: resale and part-out value of a used PC.
 *  - ramSize: RAM needed for your workload, tabs and virtual machines.
 *  - vram: graphics memory for gaming by resolution, or for running local
 *    AI models by parameter count and quantization.
 *  - ssdLifespan: years until an SSD reaches its rated TBW.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-pc-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => nonNeg(v) / 100;
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));

const CPU_SCORE = [50, 65, 80, 95, 100];
const GPU_SCORE = [30, 42, 55, 70, 85, 100];
const RES_FACTOR = [1, 0.85, 0.7];

export const pcBottleneck: CustomCalculator = (v) => {
  const cpu = CPU_SCORE[idx(v.cpuTier, 4)];
  const gpu = GPU_SCORE[idx(v.gpuTier, 5)];
  const need = gpu * RES_FACTOR[idx(v.resolution, 2)];
  const cpuLimited = cpu < need;
  const gap = cpuLimited ? (need - cpu) / need : (cpu - need) / cpu;
  return {
    bottleneckPercent: round2(gap * 100),
    limitingComponent: gap < 0.1 ? 0 : cpuLimited ? 1 : 2,
    cpuScore: cpu,
    gpuDemandOnCpu: round2(need),
  };
};

export const pcPowerSupply: CustomCalculator = (v) => {
  const base = nonNeg(v.cpuWatts) + nonNeg(v.gpuWatts) + nonNeg(v.drives) * 8 + nonNeg(v.fans) * 3 + 50; // board, RAM, USB
  const load = base * (safeNumber(v.overclock) === 1 ? 1.15 : 1);
  const target = load * (1 + pct(v.headroom));
  const sizes = [450, 550, 650, 750, 850, 1000, 1200, 1600];
  const psu = sizes.find((s) => s >= target) ?? 1600;
  return {
    recommendedPsuWatts: psu,
    estimatedLoadWatts: Math.round(load),
    targetWithHeadroom: Math.round(target),
    loadAtRecommended: psu > 0 ? round2((load / psu) * 100) : 0,
  };
};

export const pcBuildPrice: CustomCalculator = (v) => {
  const parts = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "pcCase", "cooler", "os", "peripherals"].map((k) => nonNeg(v[k]));
  const subtotal = parts.reduce((a, b) => a + b, 0);
  const tax = subtotal * pct(v.taxRate);
  const total = subtotal + tax + nonNeg(v.shipping);
  return {
    totalPrice: round2(total),
    partsSubtotal: round2(subtotal),
    salesTax: round2(tax),
    gpuShareOfParts: subtotal > 0 ? round2((nonNeg(v.gpu) / subtotal) * 100) : 0,
    cpuShareOfParts: subtotal > 0 ? round2((nonNeg(v.cpu) / subtotal) * 100) : 0,
    overBudget: round2(Math.max(0, total - nonNeg(v.budget))),
  };
};

export const pcPowerConsumption: CustomCalculator = (v) => {
  const daily = (nonNeg(v.loadWatts) * nonNeg(v.loadHours) + nonNeg(v.idleWatts) * nonNeg(v.idleHours) + nonNeg(v.monitorWatts) * (nonNeg(v.loadHours) + nonNeg(v.idleHours))) / 1000;
  const rate = nonNeg(v.rate);
  return {
    costPerMonth: round2(daily * 30.42 * rate),
    costPerYear: round2(daily * 365 * rate),
    kwhPerMonth: round2(daily * 30.42),
    costPerGamingHour: round2(((nonNeg(v.loadWatts) + nonNeg(v.monitorWatts)) / 1000) * rate),
  };
};

export const pcWorth: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const age = nonNeg(v.ageYears);
  const dep = [0.3, 0.2, 0.15]; // first year, second, later years
  let value = price;
  for (let y = 1; y <= Math.floor(age); y++) value *= 1 - (y === 1 ? dep[0] : y === 2 ? dep[1] : dep[2]);
  const frac = age - Math.floor(age);
  value *= 1 - frac * (age < 1 ? dep[0] : age < 2 ? dep[1] : dep[2]);
  const cond = [1.05, 1, 0.85, 0.65][idx(v.condition, 3)];
  const resale = value * cond;
  return {
    resaleValue: round2(resale),
    partOutValue: round2(resale * 1.15),
    tradeInValue: round2(resale * 0.65),
    valueLost: round2(price - resale),
    percentOfOriginal: price > 0 ? round2((resale / price) * 100) : 0,
  };
};

const RAM_BASE = [8, 16, 16, 32, 32, 64];

export const ramSize: CustomCalculator = (v) => {
  const base = RAM_BASE[idx(v.useCase, 5)];
  const need = base + nonNeg(v.browserTabs) * 0.1 + nonNeg(v.virtualMachines) * 8;
  const sizes = [8, 16, 32, 48, 64, 96, 128, 192];
  const rec = sizes.find((s) => s >= need) ?? 192;
  return {
    recommendedGb: rec,
    estimatedNeedGb: round2(need),
    minimumGb: Math.max(8, base / 2),
    stickConfigGb: rec / 2,
  };
};

const GAME_VRAM = [8, 12, 16];

export const vram: CustomCalculator = (v) => {
  const ai = safeNumber(v.useCase) === 1;
  if (ai) {
    const gb = nonNeg(v.modelParamsB) * (nonNeg(v.quantBits) || 4) / 8 * 1.2 + nonNeg(v.contextGb);
    const cards = [8, 12, 16, 24, 32, 48];
    return { vramNeededGb: round2(gb), suggestedCardGb: cards.find((c) => c >= gb) ?? 48, gamingBaselineGb: 0, extraForSettingsGb: 0 };
  }
  const base = GAME_VRAM[idx(v.resolution, 2)];
  const extra = (safeNumber(v.rayTracing) === 1 ? 2 : 0) + (safeNumber(v.textures) === 2 ? 2 : 0) + (safeNumber(v.frameGen) === 1 ? 1 : 0);
  const need = base + extra;
  const cards = [8, 12, 16, 20, 24, 32];
  return { vramNeededGb: need, suggestedCardGb: cards.find((c) => c >= need) ?? 32, gamingBaselineGb: base, extraForSettingsGb: extra };
};

export const ssdLifespan: CustomCalculator = (v) => {
  const tbw = nonNeg(v.tbwRating);
  const daily = nonNeg(v.dailyWritesGb) * (nonNeg(v.writeAmplification) || 1);
  const years = daily > 0 ? (tbw * 1000) / (daily * 365) : 0;
  const capacityTb = nonNeg(v.capacityTb);
  return {
    yearsToRatedTbw: round2(years),
    totalWritesPerYearTb: round2((daily * 365) / 1000),
    drivesWritesPerDay: capacityTb > 0 ? round2(daily / 1000 / capacityTb) : 0,
    outlastsWarranty: years >= nonNeg(v.warrantyYears) ? 1 : 0,
  };
};

export const shoppingTechPcCustomCalculators: Record<string, CustomCalculator> = {
  "pc-bottleneck-calculator": pcBottleneck,
  "pc-power-supply-calculator": pcPowerSupply,
  "pc-build-price-calculator": pcBuildPrice,
  "pc-power-consumption-calculator": pcPowerConsumption,
  "pc-worth-calculator": pcWorth,
  "ram-size-calculator": ramSize,
  "vram-calculator": vram,
  "ssd-lifespan-calculator": ssdLifespan,
};
