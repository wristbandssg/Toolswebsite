// One-time (but safe to re-run) batch setup script: creates 8 storage, software and video tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-storage.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-storage-calculators.ts
// or
//   npm run db:create-shopping-tech-storage-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Electronics, Energy & Tech Calculators", slug: "electronics-energy-tech-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "hard-drive-size-calculator",
    title: "Hard Drive Size Calculator",
    description: "Work out how much storage you need — for photos, video, games, music and backups, with room to grow — and the hard drive or SSD size to buy.",
    metaTitle: "Hard Drive Size Calculator — How Much Storage?",
    metaDescription: "Free hard drive size calculator. Find how much storage you need for photos, videos, games and backups, with growth, and the drive size to buy.",
    calcInputs: [
      numberField("photos", "Photos", { default: 20000, max: 10000000, step: 100 }),
      numberField("videoHours", "Hours of HD Video", { unit: "hours", default: 30, max: 100000, step: 1 }),
      numberField("games", "Installed Games", { default: 8, max: 500 }),
      numberField("musicGb", "Music", { unit: "GB", default: 20, max: 100000, step: 1, required: false }),
      numberField("otherGb", "Documents, Apps & Backups", { unit: "GB", default: 150, max: 100000, step: 5, required: false }),
      percentField("growthPerYear", "Growth per Year", { default: 25, max: 200, step: 5 }),
      numberField("years", "Years to Plan For", { unit: "years", default: 3, max: 15 }),
    ],
    calcResult: { label: "Drive Size", format: "number" },
    calcResults: [
      { key: "driveTbToBuy", label: "Drive Size to Buy (TB)", format: "number", highlight: true },
      { key: "spaceNeededGb", label: "Space Needed Today (GB)", format: "number" },
      { key: "neededAfterGrowthGb", label: "Space Needed After Growth (GB)", format: "number" },
      { key: "withFreeSpaceTb", label: "Including 20% Free Space (TB)", format: "number" },
    ],
    instructions: "Count your photos, hours of video and installed games, add music and other files, then choose how fast your collection grows and how many years the drive should last.",
    examples: "Example: 20,000 photos, 30 hours of video, 8 games and 170 GB of other files need about 1,130 GB today; with 25% growth for 3 years and 20% kept free, buy a 4 TB drive.",
    assumptions: "Averages: phone photo 4 MB, HD video 8 GB per hour, modern game 80 GB. Keep about 20% free for performance (especially SSDs). Back up to a second drive or the cloud.",
    faq: [
      { question: "How much storage do I need?", answer: "Most people need 1–2 TB for a main computer; gamers and video creators often need 4 TB or more." },
      { question: "Should I buy an SSD or a hard drive?", answer: "SSDs for your system and games (much faster); hard drives for cheap bulk storage and backups." },
    ],
  },
  {
    slug: "security-camera-storage-calculator",
    title: "Security Camera Storage Calculator",
    description: "Find how much storage your security cameras need — by number of cameras, resolution, H.264 or H.265, frame rate, continuous or motion recording and days kept.",
    metaTitle: "Security Camera Storage Calculator — NVR TB",
    metaDescription: "Free security camera storage calculator. Find the TB your NVR or DVR needs by cameras, resolution, codec, frame rate and days of footage.",
    calcInputs: [
      numberField("cameras", "Cameras", { default: 4, min: 1, max: 256 }),
      dropdown("resolution", "Resolution", [["1080p (2 MP)", 0], ["4 MP", 1], ["5 MP", 2], ["4K (8 MP)", 3]], 3),
      dropdown("codec", "Compression", [["H.264", 0], ["H.265", 1]], 1),
      numberField("fps", "Frame Rate", { unit: "fps", default: 15, max: 60 }),
      dropdown("mode", "Recording", [["Continuous 24/7", 0], ["Motion only", 1]], 0),
      percentField("motionPercent", "Share of the Day With Motion", { default: 25, max: 100, step: 5, required: false }),
      numberField("days", "Days of Footage to Keep", { unit: "days", default: 30, max: 365 }),
    ],
    calcResult: { label: "Storage Needed", format: "number" },
    calcResults: [
      { key: "storageTb", label: "Storage Needed (TB)", format: "number", highlight: true },
      { key: "gbPerCameraPerDay", label: "GB per Camera per Day", format: "number" },
      { key: "totalGbPerDay", label: "GB per Day (All Cameras)", format: "number" },
      { key: "bitratePerCameraMbps", label: "Bitrate per Camera (Mbps)", format: "number" },
    ],
    instructions: "Enter the number of cameras, their resolution, compression and frame rate, whether they record all the time or only on motion, and how many days of footage to keep.",
    examples: "Example: four 4K cameras on H.265 at 15 fps recording 24/7 for 30 days need about 7.78 TB — 64.8 GB per camera per day.",
    assumptions: "Typical H.264 bitrates at 15 fps: 1080p 4 Mbps, 4 MP 6, 5 MP 8, 4K 12; H.265 roughly halves them. Busy scenes, night noise and higher frame rates use more. Use surveillance-rated drives (WD Purple, Seagate SkyHawk).",
    faq: [
      { question: "How much storage do security cameras need?", answer: "A 4K camera on H.265 uses about 60–70 GB a day recording continuously; four cameras for 30 days need about 8 TB." },
      { question: "Does H.265 save storage?", answer: "Yes — it needs about half the bitrate of H.264 for the same quality." },
    ],
  },
  {
    slug: "photo-storage-calculator",
    title: "Photo Storage Calculator",
    description: "Estimate how much storage your photo library needs — phone HEIC or JPEG, or camera RAW — from photos taken per month over the years, and the cloud plan that fits.",
    metaTitle: "Photo Storage Calculator — GB for Your Photos",
    metaDescription: "Free photo storage calculator. Estimate GB for your photo library from photos per month and format (HEIC, JPEG, RAW), and the cloud plan size.",
    calcInputs: [
      numberField("photosPerMonth", "Photos Taken per Month", { default: 300, max: 100000, step: 10 }),
      dropdown("format", "Format", [["Phone HEIC", 0], ["Phone / camera JPEG", 1], ["Camera RAW (24 MP)", 2], ["Camera RAW (45+ MP)", 3]], 0),
      numberField("years", "Years", { unit: "years", default: 5, max: 50 }),
      numberField("existingPhotos", "Photos You Already Have", { default: 8000, max: 10000000, step: 100, required: false }),
    ],
    calcResult: { label: "Storage Needed", format: "number" },
    calcResults: [
      { key: "storageGb", label: "Storage Needed (GB)", format: "number", highlight: true },
      { key: "totalPhotos", label: "Total Photos", format: "number" },
      { key: "gbPerYear", label: "New Photos per Year (GB)", format: "number" },
      { key: "cloudPlanCode", label: "Cloud Plan (1 Free 15 GB, 2 Up to 200 GB, 3 Up to 2 TB, 4 Over 2 TB)", format: "number" },
    ],
    instructions: "Enter how many photos you take a month, the format and how many years to plan for, plus the photos you already have.",
    examples: "Example: 300 HEIC photos a month for 5 years plus 8,000 existing photos need about 52 GB — cloud plan code 2.",
    assumptions: "Average sizes: HEIC 2 MB, JPEG 3.5 MB, 24 MP RAW 25 MB, 45+ MP RAW 50 MB. Live Photos and burst shots add more. Keep at least two copies (for example cloud plus an external drive).",
    faq: [
      { question: "How much storage do 10,000 photos take?", answer: "About 20 GB as phone HEIC, 35 GB as JPEG, and 250 GB or more as camera RAW files." },
      { question: "What's the best way to store photos?", answer: "Follow 3-2-1: three copies, on two kinds of storage, with one off-site such as the cloud." },
    ],
  },
  {
    slug: "phone-storage-calculator",
    title: "Phone Storage Calculator",
    description: "Find how much storage your next phone needs — 128 GB, 256 GB, 512 GB or 1 TB — from your apps, photos, video recording, music and offline downloads.",
    metaTitle: "Phone Storage Calculator — 128GB vs 256GB vs 512GB",
    metaDescription: "Free phone storage calculator. Find whether you need 128 GB, 256 GB, 512 GB or 1 TB from apps, photos, 4K video and music.",
    calcInputs: [
      numberField("appsGb", "Apps & Games", { unit: "GB", default: 25, max: 1000, step: 1 }),
      numberField("photos", "Photos Kept on the Phone", { default: 5000, max: 1000000, step: 100 }),
      numberField("videoMinutes", "Minutes of Video Kept on the Phone", { unit: "minutes", default: 120, max: 100000, step: 5 }),
      dropdown("videoQuality", "Video Quality", [["720p", 0], ["1080p 30 fps", 1], ["4K 30 fps", 2], ["4K 60 fps", 3]], 2),
      numberField("musicGb", "Downloaded Music & Podcasts", { unit: "GB", default: 5, max: 1000, step: 1, required: false }),
      numberField("offlineGb", "Offline Movies, Maps & Files", { unit: "GB", default: 10, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Recommended Storage", format: "number" },
    calcResults: [
      { key: "recommendedGb", label: "Recommended Phone Storage (GB)", format: "number", highlight: true },
      { key: "storageUsedGb", label: "Storage You'll Use (GB)", format: "number" },
      { key: "withHeadroomGb", label: "With 20% Headroom (GB)", format: "number" },
      { key: "videoGb", label: "Video Alone (GB)", format: "number" },
    ],
    instructions: "Check your current phone's storage screen and enter roughly how much you use for apps, how many photos and minutes of video you keep, and other downloads.",
    examples: "Example: 25 GB of apps, 5,000 photos, two hours of 4K video and 15 GB of other files use about 94 GB, so choose a 128 GB phone.",
    assumptions: "Allows 15 GB for the operating system and system data, photos at 3 MB and video at 60–400 MB per minute by quality, plus 20% headroom — phones slow down when nearly full. Cloud photo libraries can keep smaller versions on the phone.",
    faq: [
      { question: "Is 128GB enough for a phone?", answer: "For light use with cloud photo backup, yes; if you shoot 4K video or keep many games, choose 256 GB or more." },
      { question: "How much space does 4K video take?", answer: "About 200 MB per minute at 30 fps and 400 MB at 60 fps on most phones." },
    ],
  },
  {
    slug: "cloud-storage-cost-calculator",
    title: "Cloud Storage Cost Calculator",
    description: "Estimate cloud storage costs — monthly, yearly and over several years with data growth — including download (egress) fees, for personal plans or business object storage.",
    metaTitle: "Cloud Storage Cost Calculator — Monthly & Yearly",
    metaDescription: "Free cloud storage cost calculator. Estimate monthly, yearly and multi-year cloud storage costs with growth and egress fees.",
    calcInputs: [
      numberField("storageTb", "Data Stored", { unit: "TB", default: 5, max: 100000, step: 0.1 }),
      currencyField("pricePerTbMonth", "Price per TB per Month", { default: 6, max: 1000, step: 0.1 }),
      numberField("egressGb", "Data Downloaded per Month", { unit: "GB", default: 100, max: 10000000, step: 10, required: false }),
      currencyField("egressPricePerGb", "Download (Egress) Price per GB", { default: 0.01, max: 1, step: 0.001, required: false }),
      percentField("growthPerYear", "Data Growth per Year", { default: 20, max: 200, step: 5, required: false }),
      numberField("years", "Years", { unit: "years", default: 3, max: 20 }),
    ],
    calcResult: { label: "Monthly Cost", format: "currency" },
    calcResults: [
      { key: "monthlyCost", label: "Monthly Cost (Now)", format: "currency", highlight: true },
      { key: "yearlyCost", label: "Yearly Cost (Now)", format: "currency" },
      { key: "totalCostOverYears", label: "Total Cost Over the Years (With Growth)", format: "currency" },
      { key: "costPerTbPerYear", label: "Cost per TB per Year", format: "currency" },
    ],
    instructions: "Enter how much data you'll store, the provider's price per TB per month, how much you download from it each month and its egress price, plus growth and years.",
    examples: "Example: 5 TB at $6 per TB a month plus 100 GB of downloads costs about $31.00 a month; with 20% yearly growth that's $1,354.08 over 3 years.",
    assumptions: "Typical 2026 prices: consumer plans around $5–$10 per TB per month, budget object storage about $6, hyperscaler standard tiers $20+, with egress often $0.01–$0.09 per GB (some providers include it). Compare with buying drives for local backups.",
    faq: [
      { question: "How much does cloud storage cost per TB?", answer: "Roughly $5–$25 per TB per month depending on the provider and storage class." },
      { question: "What are egress fees?", answer: "Charges for downloading data out of the cloud — check them before choosing a provider for backups you may need to restore." },
    ],
  },
  {
    slug: "software-license-cost-calculator",
    title: "Software License Cost Calculator",
    description: "Calculate the total cost of software subscriptions or licenses for a team — per-user price, add-ons, annual billing discount and setup — monthly, yearly and over the contract.",
    metaTitle: "Software License Cost Calculator — Per User SaaS",
    metaDescription: "Free software license cost calculator. Find total SaaS subscription cost per user, monthly and yearly, with annual discounts and setup fees.",
    calcInputs: [
      numberField("users", "Users / Seats", { default: 25, max: 1000000 }),
      currencyField("pricePerUser", "Price per User per Month", { default: 15, max: 10000, step: 0.5 }),
      currencyField("addOnsPerUser", "Add-Ons per User per Month", { default: 5, max: 10000, step: 0.5, required: false }),
      dropdown("billing", "Billing", [["Monthly", 0], ["Annual (discounted)", 1]], 1),
      percentField("annualDiscount", "Annual Billing Discount", { default: 17, max: 50, step: 1, required: false }),
      currencyField("setupCost", "One-Time Setup / Migration", { default: 1500, max: 1000000, step: 50, required: false }),
      numberField("years", "Contract Length", { unit: "years", default: 3, max: 10 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost Over the Contract", format: "currency", highlight: true },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "costPerUserPerYear", label: "Cost per User per Year", format: "currency" },
      { key: "annualBillingSavings", label: "Yearly Savings From Annual Billing", format: "currency" },
    ],
    instructions: "Enter the number of seats, the list price and add-ons per user per month, the billing option and discount, any setup cost and the contract length.",
    examples: "Example: 25 users at $15 plus $5 of add-ons, billed annually with a 17% discount, cost $4,980.00 a year — $16,440.00 over 3 years with $1,500 of setup.",
    assumptions: "Annual billing commonly saves 15–20% versus monthly. Watch for minimum seat counts, price rises at renewal and paying for inactive users — audit seats every few months.",
    faq: [
      { question: "How do you calculate software license costs?", answer: "Multiply users by the per-user monthly price (plus add-ons) and 12, apply any annual discount, and add setup and training." },
      { question: "Is annual billing worth it?", answer: "Usually, if your team size is stable — you save 15–20% but commit to the seats for a year." },
    ],
  },
  {
    slug: "video-file-size-calculator",
    title: "Video File Size Calculator",
    description: "Calculate a video's file size from its bitrate and length — or how many minutes of recording fit in a given storage — for cameras, screen recordings and exports.",
    metaTitle: "Video File Size Calculator — Size & Recording Time",
    metaDescription: "Free video file size calculator. Find video file size from bitrate and duration, or how many minutes of recording fit on a card or drive.",
    calcInputs: [
      dropdown("mode", "I Want to Find", [["File size from duration", 0], ["Recording time from storage", 1]], 0),
      numberField("videoMbps", "Video Bitrate", { unit: "Mbps", default: 50, max: 2000, step: 0.5 }),
      numberField("audioKbps", "Audio Bitrate", { unit: "kbps", default: 320, max: 5000, step: 16, required: false }),
      numberField("minutes", "Duration", { unit: "minutes", default: 30, max: 100000, step: 0.5, required: false }),
      numberField("storageGb", "Available Storage", { unit: "GB", default: 128, max: 100000, step: 1, required: false }),
    ],
    calcResult: { label: "File Size", format: "number" },
    calcResults: [
      { key: "fileSizeGb", label: "File Size (GB)", format: "number", highlight: true },
      { key: "recordingMinutes", label: "Recording Time (Minutes)", format: "number" },
      { key: "recordingHours", label: "Recording Time (Hours)", format: "number" },
      { key: "gbPerHour", label: "GB per Hour", format: "number" },
    ],
    instructions: "Choose what to find and enter the video bitrate (in your camera's settings or the file's properties) and audio bitrate. Then enter the duration, or the storage you have for recording time.",
    examples: "Example: 30 minutes at 50 Mbps with 320 kbps audio makes a file of about 11.32 GB — 22.64 GB per hour of footage.",
    assumptions: "Size = (video + audio bitrate) × seconds ÷ 8. Typical bitrates: 1080p streaming 8 Mbps, 4K camera H.265 50–100 Mbps, 4K ProRes 400+ Mbps. Variable bitrate files vary around the average. Storage cards show slightly less usable space than their label.",
    faq: [
      { question: "How big is a 1 hour 4K video?", answer: "About 20–45 GB at typical camera bitrates (50–100 Mbps), and much more in ProRes." },
      { question: "How many hours of video fit on a 128GB card?", answer: "About 5–6 hours at 50 Mbps, or about 2.5 hours at 100 Mbps." },
    ],
  },
  {
    slug: "video-bitrate-calculator",
    title: "Video Bitrate Calculator",
    description: "Find the video bitrate needed to hit a target file size for a given length — for uploads with size limits or encoding — and the recommended upload bitrate by resolution.",
    metaTitle: "Video Bitrate Calculator — Bitrate for File Size",
    metaDescription: "Free video bitrate calculator. Find the bitrate to hit a target file size for your video's length, and recommended upload bitrates by resolution.",
    calcInputs: [
      numberField("targetSizeMb", "Target File Size", { unit: "MB", default: 500, max: 1000000, step: 10 }),
      numberField("minutes", "Video Length", { unit: "minutes", default: 10, max: 10000, step: 0.5 }),
      numberField("audioKbps", "Audio Bitrate", { unit: "kbps", default: 192, max: 1000, step: 16 }),
      dropdown("resolution", "Resolution (for Upload Guidance)", [["720p", 0], ["1080p", 1], ["1440p", 2], ["4K", 3]], 1),
    ],
    calcResult: { label: "Video Bitrate", format: "number" },
    calcResults: [
      { key: "videoBitrateMbps", label: "Video Bitrate to Use (Mbps)", format: "number", highlight: true },
      { key: "videoBitrateKbps", label: "Video Bitrate (kbps)", format: "number" },
      { key: "totalBitrateMbps", label: "Total Bitrate Including Audio (Mbps)", format: "number" },
      { key: "recommendedUploadMbps", label: "Recommended Upload Bitrate for Quality (Mbps)", format: "number" },
    ],
    instructions: "Enter the maximum file size you need (for example an email or platform limit), the video's length and audio bitrate. The result is the average video bitrate to set in your encoder — compare it with the recommended bitrate for quality.",
    examples: "Example: fitting a 10-minute video into 500 MB with 192 kbps audio needs a video bitrate of about 6.47 Mbps — below the 12 Mbps suggested for high-quality 1080p uploads.",
    assumptions: "Bitrate = file size × 8 ÷ seconds, minus audio. Use two-pass encoding to hit a size accurately. Upload guidance is YouTube's recommendation for high-frame-rate SDR (720p 7.5, 1080p 12, 1440p 24, 4K 53 Mbps).",
    faq: [
      { question: "How do I calculate bitrate from file size?", answer: "Multiply the file size in megabytes by 8 and divide by the duration in seconds to get Mbps, then subtract the audio bitrate." },
      { question: "What bitrate should I use for 1080p?", answer: "About 8 Mbps for 30 fps and 12 Mbps for 60 fps uploads; streaming live typically uses 4.5–6 Mbps." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
