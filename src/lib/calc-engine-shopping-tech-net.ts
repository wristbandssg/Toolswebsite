/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — storage
 * arrays, gaming input, internet and data (8 tools):
 *
 *  - raid (also NAS storage): usable capacity and fault tolerance for RAID
 *    0, 1, 5, 6 and 10, in TB and TiB.
 *  - edpi: eDPI = DPI × in-game sensitivity, and cm per 360° turn by game.
 *  - mouseSensitivity: converts sensitivity between games (yaw values) and
 *    DPI changes, keeping the same cm/360.
 *  - downloadTime (also upload, file transfer and game download time):
 *    size ÷ speed with protocol overhead.
 *  - internetSpeed: download and upload speed a household needs from its
 *    streams, calls, gaming and devices.
 *  - bandwidth: monthly website data transfer and the sustained/peak Mbps.
 *  - dataUsage: monthly GB from daily streaming, music, social, calls and
 *    browsing.
 *  - mechanicalSwitch: switches (with spares), cost and lubing time for a
 *    keyboard layout.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-net-calculators.ts for the copy.
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

export const raid: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(nonNeg(v.drives) || 1));
  const size = nonNeg(v.driveTb);
  const level = idx(v.raidLevel, 4); // 0 RAID0, 1 RAID1, 2 RAID5, 3 RAID6, 4 RAID10
  const usableDrives = [n, 1, Math.max(0, n - 1), Math.max(0, n - 2), Math.floor(n / 2)][level];
  const tolerance = [0, n - 1, 1, 2, 1][level];
  const valid = [n >= 2, n >= 2, n >= 3, n >= 4, n >= 4 && n % 2 === 0][level];
  const usable = valid ? usableDrives * size : 0;
  return {
    usableTb: round2(usable),
    usableTib: round2(usable * 0.9095),
    rawTb: round2(n * size),
    storageEfficiency: n * size > 0 ? round2((usable / (n * size)) * 100) : 0,
    drivesThatCanFail: valid ? tolerance : 0,
    validConfiguration: valid ? 1 : 0,
  };
};

/** Degrees turned per mouse count at sensitivity 1, by game. */
const YAW = [0.022, 0.07, 0.0066, 0.022, 0.0066, 0.022, 0.0066];

export const edpi: CustomCalculator = (v) => {
  const dpi = nonNeg(v.dpi);
  const sens = nonNeg(v.sensitivity);
  const e = dpi * sens;
  const yaw = YAW[idx(v.game, YAW.length - 1)];
  const inches = e > 0 ? 360 / (e * yaw) : 0;
  return {
    edpi: round2(e),
    cmPer360: round2(inches * 2.54),
    inchesPer360: round2(inches),
    styleCode: inches * 2.54 < 25 ? 1 : inches * 2.54 <= 45 ? 2 : 3,
  };
};

export const mouseSensitivity: CustomCalculator = (v) => {
  const fromYaw = YAW[idx(v.fromGame, YAW.length - 1)];
  const toYaw = YAW[idx(v.toGame, YAW.length - 1)];
  const oldDpi = nonNeg(v.oldDpi);
  const newDpi = nonNeg(v.newDpi) || oldDpi;
  const sens = nonNeg(v.sensitivity);
  const out = newDpi > 0 && toYaw > 0 ? (sens * fromYaw * oldDpi) / (toYaw * newDpi) : 0;
  const inches = sens * oldDpi * fromYaw > 0 ? 360 / (sens * oldDpi * fromYaw) : 0;
  return {
    newSensitivity: round2(out * 1000) / 1000,
    cmPer360: round2(inches * 2.54),
    oldEdpi: round2(sens * oldDpi),
    newEdpi: round2(out * newDpi),
  };
};

/** File size unit → megabytes (decimal, as marketed). */
const SIZE_MB = [1, 1000, 1000000];

export const downloadTime: CustomCalculator = (v) => {
  const mb = nonNeg(v.size) * SIZE_MB[idx(v.sizeUnit, 2)];
  const mbps = nonNeg(v.speedMbps) * (1 - pct(v.overhead));
  const seconds = mbps > 0 ? (mb * 8) / mbps : 0;
  return {
    minutes: round2(seconds / 60),
    hours: round2(seconds / 3600),
    seconds: Math.round(seconds),
    actualMBps: round2(mbps / 8),
  };
};

export const internetSpeed: CustomCalculator = (v) => {
  const down =
    nonNeg(v.streams4k) * 25 + nonNeg(v.streamsHd) * 8 + nonNeg(v.videoCalls) * 4 + nonNeg(v.gamers) * 5 + nonNeg(v.devices) * 1 + nonNeg(v.downloaders) * 50;
  const up = nonNeg(v.videoCalls) * 3 + nonNeg(v.gamers) * 1 + nonNeg(v.uploaders) * 20 + nonNeg(v.cameras) * 2 + 2;
  const need = down * 1.25;
  const tiers = [100, 200, 300, 500, 1000, 2000];
  return {
    downloadMbpsNeeded: Math.round(need),
    uploadMbpsNeeded: Math.round(up * 1.25),
    planToChoose: tiers.find((t) => t >= need) ?? 2000,
    peakDemandMbps: Math.round(down),
  };
};

export const bandwidth: CustomCalculator = (v) => {
  const views = nonNeg(v.monthlyVisitors) * nonNeg(v.pagesPerVisit);
  const gb = (views * nonNeg(v.pageSizeMb) * (1 + pct(v.redundancy))) / 1000;
  const avgMbps = (gb * 8000) / (30 * 86400);
  return {
    monthlyTransferGb: round2(gb),
    averageMbps: round2(avgMbps),
    peakMbps: round2(avgMbps * (nonNeg(v.peakFactor) || 5)),
    monthlyPageViews: Math.round(views),
    cdnCostEstimate: round2(gb * nonNeg(v.pricePerGb)),
  };
};

export const dataUsage: CustomCalculator = (v) => {
  const perDay =
    nonNeg(v.sdHours) * 0.7 + nonNeg(v.hdHours) * 3 + nonNeg(v.uhdHours) * 7 + nonNeg(v.musicHours) * 0.15 + nonNeg(v.socialHours) * 0.6 + nonNeg(v.callHours) * 1.5 + nonNeg(v.browsingHours) * 0.15 + nonNeg(v.gamingHours) * 0.1;
  const month = perDay * 30.42;
  return {
    gbPerMonth: round2(month),
    gbPerDay: round2(perDay),
    planCode: month <= 5 ? 1 : month <= 15 ? 2 : month <= 50 ? 3 : 4,
    tbPerYear: round2((month * 12) / 1000),
  };
};

const LAYOUT_KEYS = [61, 68, 84, 87, 100, 104];

export const mechanicalSwitch: CustomCalculator = (v) => {
  const keys = LAYOUT_KEYS[idx(v.layout, 5)];
  const spares = Math.ceil(keys * pct(v.sparePercent));
  const total = keys + spares;
  const packs = Math.ceil(total / (nonNeg(v.packSize) || 10));
  const switchCost = packs * nonNeg(v.packPrice);
  const lube = safeNumber(v.lube) === 1 ? (total * 2) / 60 : 0;
  return {
    switchesNeeded: total,
    switchPacks: packs,
    switchCost: round2(switchCost),
    totalBuildCost: round2(switchCost + nonNeg(v.keycaps) + nonNeg(v.caseAndPcb) + nonNeg(v.stabilizers)),
    lubingHours: round2(lube),
    keysOnBoard: keys,
  };
};

export const shoppingTechNetCustomCalculators: Record<string, CustomCalculator> = {
  "raid-calculator": raid,
  "edpi-calculator": edpi,
  "mouse-sensitivity-calculator": mouseSensitivity,
  "download-time-calculator": downloadTime,
  "internet-speed-calculator": internetSpeed,
  "bandwidth-calculator": bandwidth,
  "data-usage-calculator": dataUsage,
  "mechanical-switch-calculator": mechanicalSwitch,
};
