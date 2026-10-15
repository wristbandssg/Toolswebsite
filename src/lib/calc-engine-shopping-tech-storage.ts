/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — storage,
 * software and video (8 tools):
 *
 *  - hardDriveSize (also storage size): space for photos, video, games,
 *    music and backups with growth, and the drive size to buy.
 *  - securityCameraStorage: TB for cameras by resolution, codec, recording
 *    mode and days kept.
 *  - photoStorage: GB for a photo library by format and years.
 *  - phoneStorage: GB a phone needs for apps, photos, video and music.
 *  - cloudStorageCost: monthly, yearly and multi-year cloud storage cost.
 *  - softwareLicenseCost: per-user subscription cost with annual discount.
 *  - videoFileSize (also recording time): size from bitrate and duration,
 *    or minutes that fit in a given storage.
 *  - videoBitrate: the bitrate that hits a target file size, and the
 *    recommended upload bitrate for a resolution.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-storage-calculators.ts for the copy.
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

export const hardDriveSize: CustomCalculator = (v) => {
  const gb =
    (nonNeg(v.photos) * 4) / 1000 + nonNeg(v.videoHours) * 8 + nonNeg(v.games) * 80 + nonNeg(v.musicGb) + nonNeg(v.otherGb);
  const grown = gb * Math.pow(1 + pct(v.growthPerYear), nonNeg(v.years));
  const withFree = grown / 0.8; // keep 20% free
  const sizes = [0.5, 1, 2, 4, 8, 12, 16, 20, 24];
  const tb = withFree / 1000;
  return {
    driveTbToBuy: sizes.find((s) => s >= tb) ?? 24,
    spaceNeededGb: round2(gb),
    neededAfterGrowthGb: round2(grown),
    withFreeSpaceTb: round2(tb),
  };
};

/** Mbps per camera with H.264 by resolution: 1080p, 4 MP, 5 MP, 4K. */
const CAM_MBPS = [4, 6, 8, 12];

export const securityCameraStorage: CustomCalculator = (v) => {
  const mbps = CAM_MBPS[idx(v.resolution, 3)] * (safeNumber(v.codec) === 1 ? 0.5 : 1) * ((nonNeg(v.fps) || 15) / 15);
  const hours = 24 * (safeNumber(v.mode) === 1 ? pct(v.motionPercent) : 1);
  const gbPerDay = (mbps * 3600 * hours) / 8 / 1000;
  const total = gbPerDay * nonNeg(v.cameras) * nonNeg(v.days);
  return {
    storageTb: round2(total / 1000),
    gbPerCameraPerDay: round2(gbPerDay),
    totalGbPerDay: round2(gbPerDay * nonNeg(v.cameras)),
    bitratePerCameraMbps: round2(mbps),
  };
};

const PHOTO_MB = [2, 3.5, 25, 50];

export const photoStorage: CustomCalculator = (v) => {
  const mb = PHOTO_MB[idx(v.format, 3)];
  const photos = nonNeg(v.photosPerMonth) * 12 * nonNeg(v.years) + nonNeg(v.existingPhotos);
  const gb = (photos * mb) / 1000;
  return {
    storageGb: round2(gb),
    totalPhotos: Math.round(photos),
    gbPerYear: round2((nonNeg(v.photosPerMonth) * 12 * mb) / 1000),
    cloudPlanCode: gb <= 15 ? 1 : gb <= 200 ? 2 : gb <= 2000 ? 3 : 4,
  };
};

const VIDEO_MB_MIN = [60, 130, 200, 400];

export const phoneStorage: CustomCalculator = (v) => {
  const gb =
    15 + nonNeg(v.appsGb) + (nonNeg(v.photos) * 3) / 1000 + (nonNeg(v.videoMinutes) * VIDEO_MB_MIN[idx(v.videoQuality, 3)]) / 1000 + nonNeg(v.musicGb) + nonNeg(v.offlineGb);
  const tiers = [64, 128, 256, 512, 1024];
  const needed = gb * 1.2;
  return {
    recommendedGb: tiers.find((t) => t >= needed) ?? 1024,
    storageUsedGb: round2(gb),
    withHeadroomGb: round2(needed),
    videoGb: round2((nonNeg(v.videoMinutes) * VIDEO_MB_MIN[idx(v.videoQuality, 3)]) / 1000),
  };
};

export const cloudStorageCost: CustomCalculator = (v) => {
  const tb = nonNeg(v.storageTb);
  const monthly = tb * nonNeg(v.pricePerTbMonth) + nonNeg(v.egressGb) * nonNeg(v.egressPricePerGb);
  const years = nonNeg(v.years);
  const growth = pct(v.growthPerYear);
  let total = 0;
  for (let y = 0; y < Math.ceil(years); y++) total += monthly * Math.pow(1 + growth, y) * 12 * Math.min(1, years - y);
  return {
    monthlyCost: round2(monthly),
    yearlyCost: round2(monthly * 12),
    totalCostOverYears: round2(total),
    costPerTbPerYear: tb > 0 ? round2((monthly * 12) / tb) : 0,
  };
};

export const softwareLicenseCost: CustomCalculator = (v) => {
  const users = nonNeg(v.users);
  const perUserMonth = (nonNeg(v.pricePerUser) + nonNeg(v.addOnsPerUser)) * (safeNumber(v.billing) === 1 ? 1 - pct(v.annualDiscount) : 1);
  const yearly = users * perUserMonth * 12;
  const years = nonNeg(v.years);
  const total = yearly * years + nonNeg(v.setupCost);
  return {
    totalCost: round2(total),
    yearlyCost: round2(yearly),
    monthlyCost: round2(yearly / 12),
    costPerUserPerYear: round2(perUserMonth * 12),
    annualBillingSavings: round2(users * (nonNeg(v.pricePerUser) + nonNeg(v.addOnsPerUser)) * 12 * pct(v.annualDiscount)),
  };
};

export const videoFileSize: CustomCalculator = (v) => {
  const mbps = nonNeg(v.videoMbps) + nonNeg(v.audioKbps) / 1000;
  const recording = safeNumber(v.mode) === 1;
  if (recording) {
    const gb = nonNeg(v.storageGb);
    const minutes = mbps > 0 ? (gb * 8000) / mbps / 60 : 0;
    return { fileSizeGb: round2(gb), recordingMinutes: round2(minutes), recordingHours: round2(minutes / 60), gbPerHour: round2((mbps * 3600) / 8000) };
  }
  const minutes = nonNeg(v.minutes);
  const gb = (mbps * minutes * 60) / 8000;
  return { fileSizeGb: round2(gb), recordingMinutes: round2(minutes), recordingHours: round2(minutes / 60), gbPerHour: round2((mbps * 3600) / 8000) };
};

/** Recommended upload bitrates (Mbps, SDR, high frame rate): 720p, 1080p, 1440p, 4K. */
const REC_MBPS = [7.5, 12, 24, 53];

export const videoBitrate: CustomCalculator = (v) => {
  const seconds = nonNeg(v.minutes) * 60;
  const totalMbps = seconds > 0 ? (nonNeg(v.targetSizeMb) * 8) / seconds : 0;
  const video = Math.max(0, totalMbps - nonNeg(v.audioKbps) / 1000);
  return {
    videoBitrateMbps: round2(video),
    videoBitrateKbps: Math.round(video * 1000),
    totalBitrateMbps: round2(totalMbps),
    recommendedUploadMbps: REC_MBPS[idx(v.resolution, 3)],
  };
};

export const shoppingTechStorageCustomCalculators: Record<string, CustomCalculator> = {
  "hard-drive-size-calculator": hardDriveSize,
  "security-camera-storage-calculator": securityCameraStorage,
  "photo-storage-calculator": photoStorage,
  "phone-storage-calculator": phoneStorage,
  "cloud-storage-cost-calculator": cloudStorageCost,
  "software-license-cost-calculator": softwareLicenseCost,
  "video-file-size-calculator": videoFileSize,
  "video-bitrate-calculator": videoBitrate,
};
