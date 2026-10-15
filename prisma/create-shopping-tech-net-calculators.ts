// One-time (but safe to re-run) batch setup script: creates 8 storage array, gaming input, internet and data tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-net.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-net-calculators.ts
// or
//   npm run db:create-shopping-tech-net-calculators

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

const GAMES: [string, number][] = [["Counter-Strike 2 / CS:GO", 0], ["Valorant", 1], ["Fortnite", 2], ["Apex Legends", 3], ["Overwatch 2", 4], ["Call of Duty", 5], ["Rainbow Six Siege (default)", 6]];

const TOOLS: ToolDef[] = [
  {
    slug: "raid-calculator",
    title: "RAID Calculator",
    description: "Work out usable storage and fault tolerance for RAID 0, 1, 5, 6 and 10 arrays — in TB and TiB — for a NAS or server, from the number and size of drives.",
    metaTitle: "RAID Calculator — Usable Capacity for NAS Arrays",
    metaDescription: "Free RAID calculator. Find usable storage, efficiency and how many drives can fail for RAID 0, 1, 5, 6 and 10 in a NAS or server.",
    calcInputs: [
      numberField("drives", "Number of Drives", { default: 4, min: 1, max: 64 }),
      numberField("driveTb", "Drive Size", { unit: "TB", default: 8, max: 100, step: 0.5 }),
      dropdown("raidLevel", "RAID Level", [["RAID 0 (striping)", 0], ["RAID 1 (mirroring)", 1], ["RAID 5 (single parity)", 2], ["RAID 6 (double parity)", 3], ["RAID 10 (mirrored stripes)", 4]], 2),
    ],
    calcResult: { label: "Usable Capacity", format: "number" },
    calcResults: [
      { key: "usableTb", label: "Usable Capacity (TB)", format: "number", highlight: true },
      { key: "usableTib", label: "Usable Capacity Shown by OS (TiB)", format: "number" },
      { key: "rawTb", label: "Raw Capacity (TB)", format: "number" },
      { key: "storageEfficiency", label: "Storage Efficiency", format: "percentage" },
      { key: "drivesThatCanFail", label: "Drives That Can Fail Without Data Loss", format: "number" },
      { key: "validConfiguration", label: "Valid Drive Count for This Level? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter how many drives you have, their size and the RAID level. Use identical drives — RAID uses the smallest drive's size for every disk. Synology SHR works like RAID 5 (or 6) with matched drives.",
    examples: "Example: four 8 TB drives in RAID 5 give 24 TB usable (21.83 TiB as shown by the operating system) and survive 1 drive failure.",
    assumptions: "Usable drives: RAID 0 all, RAID 1 one, RAID 5 n−1, RAID 6 n−2, RAID 10 half. Drives are sold in decimal TB; operating systems show binary TiB (about 9% less). RAID is not a backup — keep a separate copy of important data.",
    faq: [
      { question: "Which RAID level is best for a home NAS?", answer: "RAID 5 (or SHR) for 3–5 drives balances space and protection; RAID 6 or SHR-2 is safer with large drives or 6+ disks." },
      { question: "Why does my 8 TB drive show as 7.27 TB?", answer: "Manufacturers use decimal terabytes; computers count in binary tebibytes, which are about 9% bigger." },
    ],
  },
  {
    slug: "edpi-calculator",
    title: "EDPI Calculator",
    description: "Calculate your eDPI (mouse DPI × in-game sensitivity) and how far you move your mouse for a 360° turn in CS2, Valorant, Fortnite, Apex, Overwatch and more.",
    metaTitle: "eDPI Calculator — DPI × Sens & cm/360",
    metaDescription: "Free eDPI calculator. Find your effective DPI and cm per 360° for CS2, Valorant, Fortnite, Apex, Overwatch and Call of Duty.",
    calcInputs: [
      numberField("dpi", "Mouse DPI", { default: 800, max: 32000, step: 50 }),
      numberField("sensitivity", "In-Game Sensitivity", { default: 0.4, max: 100, step: 0.001 }),
      dropdown("game", "Game", GAMES, 1),
    ],
    calcResult: { label: "eDPI", format: "number" },
    calcResults: [
      { key: "edpi", label: "eDPI", format: "number", highlight: true },
      { key: "cmPer360", label: "cm per 360° Turn", format: "number" },
      { key: "inchesPer360", label: "Inches per 360° Turn", format: "number" },
      { key: "styleCode", label: "Sensitivity Style (1 High / Wrist, 2 Medium, 3 Low / Arm)", format: "number" },
    ],
    instructions: "Enter your mouse DPI, your in-game sensitivity and the game. eDPI lets you compare sensitivity with other players of the same game; cm/360 compares across games.",
    examples: "Example: 800 DPI at 0.4 in Valorant is 320 eDPI — about 40.82 cm of mouse movement per 360° turn.",
    assumptions: "eDPI = DPI × sensitivity. cm/360 = 360 ÷ (eDPI × the game's yaw) × 2.54; yaw values: CS2 and Apex 0.022, Valorant 0.07, Fortnite and Overwatch 0.0066. Typical pro players use 25–50 cm/360 in tactical shooters.",
    faq: [
      { question: "What is a good eDPI for Valorant?", answer: "Most pros use about 200–400 eDPI in Valorant (for example 800 DPI at 0.25–0.5)." },
      { question: "What is a good eDPI for CS2?", answer: "Most pros play around 700–1,200 eDPI in CS2 (800 DPI at about 0.9–1.5)." },
    ],
  },
  {
    slug: "mouse-sensitivity-calculator",
    title: "Mouse Sensitivity Calculator",
    description: "Convert your mouse sensitivity between games — CS2, Valorant, Fortnite, Apex, Overwatch, Call of Duty, Rainbow Six — and when you change DPI, keeping the same feel.",
    metaTitle: "Mouse Sensitivity Converter — Game to Game",
    metaDescription: "Free mouse sensitivity calculator. Convert sensitivity between CS2, Valorant, Apex, Fortnite, Overwatch and more, or for a new DPI.",
    calcInputs: [
      dropdown("fromGame", "From Game", GAMES, 0),
      numberField("sensitivity", "Current Sensitivity", { default: 1.2, max: 100, step: 0.001 }),
      numberField("oldDpi", "Current DPI", { default: 800, max: 32000, step: 50 }),
      dropdown("toGame", "To Game", GAMES, 1),
      numberField("newDpi", "New DPI (0 = Same)", { default: 800, max: 32000, step: 50, required: false }),
    ],
    calcResult: { label: "New Sensitivity", format: "number" },
    calcResults: [
      { key: "newSensitivity", label: "New Sensitivity", format: "number", decimals: 3, highlight: true },
      { key: "cmPer360", label: "cm per 360° (Unchanged)", format: "number" },
      { key: "oldEdpi", label: "Old eDPI", format: "number" },
      { key: "newEdpi", label: "New eDPI", format: "number" },
    ],
    instructions: "Choose the game you're coming from and its sensitivity and DPI, then the game you're moving to and the DPI you'll use there.",
    examples: "Example: 1.2 sensitivity at 800 DPI in CS2 converts to 0.377 in Valorant at the same DPI — the same 43.3 cm per 360°.",
    assumptions: "New sensitivity = old sensitivity × old yaw × old DPI ÷ (new yaw × new DPI), matching cm/360 for hip-fire. Field of view and scoped (ADS) multipliers differ between games and may need fine-tuning by feel.",
    faq: [
      { question: "How do I convert CS2 sensitivity to Valorant?", answer: "Divide your CS2 sensitivity by about 3.18 (the ratio of their yaw values) at the same DPI." },
      { question: "Should I change sensitivity when I change DPI?", answer: "Yes — to keep the same feel, scale sensitivity by old DPI ÷ new DPI." },
    ],
  },
  {
    slug: "download-time-calculator",
    title: "Download Time Calculator",
    description: "Work out how long a download, upload or file transfer takes — games, movies, backups — from the file size and your internet speed in Mbps, allowing for overhead.",
    metaTitle: "Download Time Calculator — File Size & Speed",
    metaDescription: "Free download time calculator. Find how long downloads, uploads, game installs and file transfers take from file size and Mbps speed.",
    calcInputs: [
      numberField("size", "File Size", { default: 120, max: 1000000, step: 0.1 }),
      dropdown("sizeUnit", "Unit", [["MB", 0], ["GB", 1], ["TB", 2]], 1),
      numberField("speedMbps", "Connection Speed (Download or Upload)", { unit: "Mbps", default: 300, max: 100000, step: 1 }),
      percentField("overhead", "Real-World Overhead", { default: 10, max: 50, step: 1 }),
    ],
    calcResult: { label: "Time", format: "number" },
    calcResults: [
      { key: "minutes", label: "Time (Minutes)", format: "number", highlight: true },
      { key: "hours", label: "Hours", format: "number" },
      { key: "seconds", label: "Seconds", format: "number" },
      { key: "actualMBps", label: "Actual Speed (MB/s)", format: "number" },
    ],
    instructions: "Enter the file or game size and your connection speed in megabits per second — use your upload speed for uploads and backups. Overhead covers protocol and Wi-Fi losses.",
    examples: "Example: a 120 GB game on a 300 Mbps connection with 10% overhead downloads in about 59.26 minutes (0.99 hours), at 33.75 MB/s.",
    assumptions: "Time = size in megabits ÷ effective speed; 1 byte = 8 bits, so 300 Mbps ≈ 37.5 MB/s. Game stores and servers may cap speeds, and Wi-Fi is often slower than wired Ethernet.",
    faq: [
      { question: "How long does it take to download 100 GB?", answer: "About 15 minutes at 1 Gbps, 50 minutes at 300 Mbps and over 2 hours at 100 Mbps." },
      { question: "What's the difference between Mbps and MB/s?", answer: "Mbps is megabits per second; MB/s is megabytes per second. Divide Mbps by 8 to get MB/s." },
    ],
  },
  {
    slug: "internet-speed-calculator",
    title: "Internet Speed Calculator",
    description: "Find the internet speed your household needs — download and upload Mbps — from how many people stream in 4K or HD, video call, game, upload and connect devices at the same time.",
    metaTitle: "Internet Speed Calculator — How Many Mbps Do I Need?",
    metaDescription: "Free internet speed calculator. Find the download and upload Mbps your household needs for 4K streaming, video calls, gaming and devices.",
    calcInputs: [
      numberField("streams4k", "4K Streams at Once", { default: 1, max: 20 }),
      numberField("streamsHd", "HD Streams at Once", { default: 2, max: 20 }),
      numberField("videoCalls", "Video Calls at Once", { default: 1, max: 20 }),
      numberField("gamers", "Online Gamers", { default: 1, max: 20 }),
      numberField("downloaders", "Large Downloads at Once (Games, Updates)", { default: 0, max: 10, required: false }),
      numberField("devices", "Other Connected Devices", { default: 15, max: 200, required: false }),
      numberField("uploaders", "Big Uploads / Live Streaming", { default: 0, max: 10, required: false }),
      numberField("cameras", "Security Cameras Uploading", { default: 2, max: 50, required: false }),
    ],
    calcResult: { label: "Download Speed Needed", format: "number" },
    calcResults: [
      { key: "downloadMbpsNeeded", label: "Download Speed Needed (Mbps)", format: "number", highlight: true },
      { key: "uploadMbpsNeeded", label: "Upload Speed Needed (Mbps)", format: "number" },
      { key: "planToChoose", label: "Plan to Choose (Mbps)", format: "number" },
      { key: "peakDemandMbps", label: "Peak Simultaneous Demand (Mbps)", format: "number" },
    ],
    instructions: "Think about your busiest evening and count what happens at the same time — streams, video calls, gaming, downloads and devices online.",
    examples: "Example: one 4K and two HD streams, a video call, an online gamer and 15 devices need about 81 Mbps down and 13 Mbps up — a 100 Mbps plan.",
    assumptions: "Per-activity needs: 4K stream 25 Mbps, HD 8, video call 4 down/3 up, gaming 5, large download 50, idle devices 1 each; plus 25% headroom. Wi-Fi coverage and router quality often matter as much as the plan speed.",
    faq: [
      { question: "How much internet speed do I need?", answer: "Many households need 100–300 Mbps; heavy 4K streaming, gaming and big downloads at the same time suggest 500 Mbps or more." },
      { question: "Is upload speed important?", answer: "Yes for video calls, live streaming, cloud backups and security cameras — cable plans often have much lower upload than fiber." },
    ],
  },
  {
    slug: "bandwidth-calculator",
    title: "Bandwidth Calculator",
    description: "Estimate a website's monthly bandwidth (data transfer) from visitors, pages per visit and page size — plus average and peak Mbps and CDN cost — for hosting plans.",
    metaTitle: "Bandwidth Calculator — Website Data Transfer",
    metaDescription: "Free bandwidth calculator. Estimate monthly website data transfer from visitors and page size, average and peak Mbps and CDN cost.",
    calcInputs: [
      numberField("monthlyVisitors", "Monthly Visitors", { default: 50000, max: 1000000000, step: 100 }),
      numberField("pagesPerVisit", "Pages per Visit", { default: 3, max: 100, step: 0.1 }),
      numberField("pageSizeMb", "Average Page Size", { unit: "MB", default: 2.5, max: 100, step: 0.1 }),
      percentField("redundancy", "Extra for Bots, Downloads & Spikes", { default: 30, max: 200, step: 5 }),
      numberField("peakFactor", "Peak-to-Average Traffic Ratio", { default: 5, min: 1, max: 50, step: 0.5 }),
      currencyField("pricePerGb", "CDN / Egress Price per GB (Optional)", { default: 0.05, max: 1, step: 0.001, required: false }),
    ],
    calcResult: { label: "Monthly Transfer", format: "number" },
    calcResults: [
      { key: "monthlyTransferGb", label: "Monthly Data Transfer (GB)", format: "number", highlight: true },
      { key: "averageMbps", label: "Average Bandwidth (Mbps)", format: "number" },
      { key: "peakMbps", label: "Peak Bandwidth (Mbps)", format: "number" },
      { key: "monthlyPageViews", label: "Monthly Page Views", format: "number" },
      { key: "cdnCostEstimate", label: "Monthly CDN / Egress Cost", format: "currency" },
    ],
    instructions: "Enter monthly visitors (from analytics), pages per visit and the average page weight (check with your browser's network tab or a page-speed tool). Add a margin for bots and spikes.",
    examples: "Example: 50,000 visitors viewing 3 pages of 2.5 MB each, plus 30%, transfer about 487.5 GB a month — 1.5 Mbps on average and 7.52 Mbps at peak.",
    assumptions: "Monthly GB = visitors × pages × page MB × (1 + margin) ÷ 1,000. Returning visitors' browser caches reduce real transfer; video and large downloads increase it. CDNs typically charge $0.01–$0.10 per GB.",
    faq: [
      { question: "How much bandwidth does my website need?", answer: "Multiply monthly page views by average page size, then add 30–50% for bots, downloads and spikes." },
      { question: "What is the difference between bandwidth and data transfer?", answer: "Hosts often say bandwidth for monthly data transfer (GB); strictly, bandwidth is the speed (Mbps) available at one time." },
    ],
  },
  {
    slug: "data-usage-calculator",
    title: "Data Usage Calculator",
    description: "Estimate your monthly mobile or home internet data usage in GB from daily video streaming, music, social media, video calls, browsing and gaming — and the plan you need.",
    metaTitle: "Data Usage Calculator — GB per Month",
    metaDescription: "Free data usage calculator. Estimate monthly GB from streaming, music, social media, video calls and browsing, and the data plan you need.",
    calcInputs: [
      numberField("sdHours", "SD Video Streaming per Day", { unit: "hours", default: 0, max: 24, step: 0.25 }),
      numberField("hdHours", "HD Video Streaming per Day", { unit: "hours", default: 1, max: 24, step: 0.25 }),
      numberField("uhdHours", "4K Video Streaming per Day", { unit: "hours", default: 0, max: 24, step: 0.25 }),
      numberField("musicHours", "Music Streaming per Day", { unit: "hours", default: 2, max: 24, step: 0.25 }),
      numberField("socialHours", "Social Media (with Video) per Day", { unit: "hours", default: 1.5, max: 24, step: 0.25 }),
      numberField("callHours", "Video Calls per Day", { unit: "hours", default: 0.5, max: 24, step: 0.25 }),
      numberField("browsingHours", "Web Browsing & Email per Day", { unit: "hours", default: 1, max: 24, step: 0.25 }),
      numberField("gamingHours", "Online Gaming per Day", { unit: "hours", default: 0, max: 24, step: 0.25, required: false }),
    ],
    calcResult: { label: "GB per Month", format: "number" },
    calcResults: [
      { key: "gbPerMonth", label: "Data per Month (GB)", format: "number", highlight: true },
      { key: "gbPerDay", label: "Data per Day (GB)", format: "number" },
      { key: "planCode", label: "Plan Size (1 Up to 5 GB, 2 Up to 15 GB, 3 Up to 50 GB, 4 Unlimited)", format: "number" },
      { key: "tbPerYear", label: "Data per Year (TB)", format: "number" },
    ],
    instructions: "Enter how many hours a day you spend on each activity on mobile data (or on your home connection for home internet). Exclude time on Wi-Fi when sizing a mobile plan.",
    examples: "Example: an hour of HD video, 2 hours of music, 1.5 hours of social media, half an hour of video calls and an hour of browsing a day use about 155.14 GB a month — plan code 4.",
    assumptions: "Typical usage: SD video 0.7 GB/hour, HD 3, 4K 7, music 0.15, social media with video 0.6, video calls 1.5, browsing 0.15, online gaming 0.1 (game downloads and updates are much more). Apps may lower quality on mobile data.",
    faq: [
      { question: "How much data does streaming use?", answer: "About 3 GB an hour for HD video and up to 7 GB an hour for 4K." },
      { question: "How much mobile data do I need?", answer: "Light users get by on 5–15 GB a month; anyone streaming video on mobile data regularly should consider 50 GB or unlimited." },
    ],
  },
  {
    slug: "mechanical-switch-calculator",
    title: "Mechanical Switch Calculator",
    description: "Work out how many mechanical keyboard switches to buy for your layout — with spares — what they cost, the total build cost and how long lubing them will take.",
    metaTitle: "Mechanical Switch Calculator — How Many Switches",
    metaDescription: "Free mechanical switch calculator. Find how many keyboard switches you need for 60%, 65%, 75%, TKL or full-size, with spares, cost and lubing time.",
    calcInputs: [
      dropdown("layout", "Layout", [["60% (61 keys)", 0], ["65% (68 keys)", 1], ["75% (84 keys)", 2], ["TKL (87 keys)", 3], ["96% / 1800 (100 keys)", 4], ["Full size (104 keys)", 5]], 2),
      percentField("sparePercent", "Spares", { default: 10, max: 50, step: 5 }),
      numberField("packSize", "Switches per Pack", { default: 10, min: 1, max: 200 }),
      currencyField("packPrice", "Price per Pack", { default: 6, max: 500, step: 0.25 }),
      currencyField("keycaps", "Keycaps", { default: 45, max: 1000, step: 1, required: false }),
      currencyField("caseAndPcb", "Case, PCB & Plate (or Barebones Kit)", { default: 90, max: 2000, step: 1, required: false }),
      currencyField("stabilizers", "Stabilizers", { default: 15, max: 200, step: 1, required: false }),
      dropdown("lube", "Lubing the Switches?", [["No", 0], ["Yes (about 2 min per switch)", 1]], 1),
    ],
    calcResult: { label: "Switches Needed", format: "number" },
    calcResults: [
      { key: "switchesNeeded", label: "Switches to Buy", format: "number", highlight: true },
      { key: "switchPacks", label: "Packs to Buy", format: "number" },
      { key: "switchCost", label: "Switch Cost", format: "currency" },
      { key: "totalBuildCost", label: "Total Build Cost", format: "currency" },
      { key: "lubingHours", label: "Lubing Time (Hours)", format: "number" },
      { key: "keysOnBoard", label: "Keys on the Board", format: "number" },
    ],
    instructions: "Choose your keyboard layout and how many spares you want, then the pack size and price of your switches. Add keycaps, the case and PCB kit and stabilizers for the full build cost.",
    examples: "Example: a 75% board needs 84 switches — buy 93 with 10% spares (10 packs of 10, $60.00). With keycaps, a kit and stabilizers the build costs $210.00, and lubing takes about 3.1 hours.",
    assumptions: "Key counts are typical for each layout; check your PCB's exact count (some have extra keys or split spacebars). Hot-swap boards let you change switches without soldering. Allow spares for duds and future swaps.",
    faq: [
      { question: "How many switches do I need for a 65% keyboard?", answer: "Usually 67–68, so buy 70–75 to have spares." },
      { question: "Should I lube my switches?", answer: "Lubing makes linear and tactile switches smoother and quieter, but takes a few hours for a full board." },
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
