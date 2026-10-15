// One-time (but safe to re-run) batch setup script: creates 8 PC building and upgrade tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-pc.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-pc-calculators.ts
// or
//   npm run db:create-shopping-tech-pc-calculators

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
    slug: "pc-bottleneck-calculator",
    title: "PC Bottleneck Calculator",
    description: "Check whether your CPU or GPU will hold back your gaming PC at 1080p, 1440p or 4K — a bottleneck percentage and which part limits performance.",
    metaTitle: "PC Bottleneck Calculator — CPU vs GPU Balance",
    metaDescription: "Free PC bottleneck calculator. See whether your CPU or GPU limits gaming performance at 1080p, 1440p or 4K and by how much.",
    calcInputs: [
      dropdown("cpuTier", "CPU Class", [["Entry (Ryzen 5 3600, Core i5-10400)", 0], ["Mid (Ryzen 5 5600 / 7600, Core i5-12400)", 1], ["Upper mid (Ryzen 7 5800X3D, Core i5-13600K)", 2], ["High (Ryzen 7 7800X3D, Core i7-14700K)", 3], ["Top (Ryzen 7 9800X3D, Ryzen 9 9950X3D)", 4]], 1),
      dropdown("gpuTier", "Graphics Card Class", [["GTX 1660 / RX 6600", 0], ["RTX 3060 / RX 7600", 1], ["RTX 4060 Ti / RX 7700 XT", 2], ["RTX 4070 Super / 5070 / RX 7800 XT", 3], ["RTX 4080 / 5070 Ti / RX 9070 XT", 4], ["RTX 4090 / 5090", 5]], 3),
      dropdown("resolution", "Resolution", [["1080p", 0], ["1440p", 1], ["4K", 2]], 1),
    ],
    calcResult: { label: "Bottleneck", format: "percentage" },
    calcResults: [
      { key: "bottleneckPercent", label: "Imbalance / Bottleneck", format: "percentage", highlight: true },
      { key: "limitingComponent", label: "Limiting Part (0 Balanced, 1 CPU, 2 GPU — Normal for Gaming)", format: "number" },
      { key: "cpuScore", label: "CPU Gaming Score", format: "number" },
      { key: "gpuDemandOnCpu", label: "CPU Score This GPU Needs at This Resolution", format: "number" },
    ],
    instructions: "Pick the class closest to your CPU and graphics card and the resolution you play at. A GPU limit is normal and fine for gaming; a large CPU limit means you're leaving GPU performance unused.",
    examples: "Example: a mid-range CPU with an RTX 4070 Super class card at 1440p shows a 8.46% imbalance (limiting part code 0).",
    assumptions: "Uses relative gaming performance scores by class. Higher resolutions shift the load onto the GPU, so the same CPU is less of a limit at 4K. Bottlenecks vary by game (strategy and esports titles lean on the CPU); use benchmarks of your games for specifics.",
    faq: [
      { question: "What is a PC bottleneck?", answer: "When one part (often the CPU or GPU) runs at its limit while the other waits, capping frame rates." },
      { question: "Is a GPU bottleneck bad?", answer: "No — in games it's normal and means you're using all of your graphics card. A big CPU bottleneck is the one to fix." },
    ],
  },
  {
    slug: "pc-power-supply-calculator",
    title: "PC Power Supply Calculator",
    description: "Find the power supply (PSU) wattage your PC needs from the CPU and GPU power, drives, fans and overclocking — with headroom for modern GPU power spikes.",
    metaTitle: "PC Power Supply Calculator — PSU Wattage",
    metaDescription: "Free PC power supply calculator. Find the PSU wattage you need from CPU and GPU power, drives and fans, with headroom for spikes.",
    calcInputs: [
      numberField("cpuWatts", "CPU Power (TDP / PPT)", { unit: "W", default: 125, max: 500, step: 5 }),
      numberField("gpuWatts", "GPU Board Power", { unit: "W", default: 285, max: 800, step: 5 }),
      numberField("drives", "Drives (SSD / HDD)", { default: 2, max: 20 }),
      numberField("fans", "Case Fans & Pumps", { default: 5, max: 20 }),
      dropdown("overclock", "Overclocking?", [["No", 0], ["Yes (+15%)", 1]], 0),
      percentField("headroom", "Headroom", { default: 40, max: 100, step: 5 }),
    ],
    calcResult: { label: "Recommended PSU", format: "number" },
    calcResults: [
      { key: "recommendedPsuWatts", label: "Recommended PSU (W)", format: "number", highlight: true },
      { key: "estimatedLoadWatts", label: "Estimated Gaming Load (W)", format: "number" },
      { key: "targetWithHeadroom", label: "Target With Headroom (W)", format: "number" },
      { key: "loadAtRecommended", label: "Load on the Recommended PSU", format: "percentage" },
    ],
    instructions: "Enter your CPU's power limit and GPU's total board power from the spec sheets, plus drives and fans. 30–50% headroom covers GPU transient spikes and keeps the PSU in its efficient range.",
    examples: "Example: a 125 W CPU and 285 W GPU with two drives and five fans draw about 491 W; with 40% headroom, choose a PSU of 750 W.",
    assumptions: "Load = CPU + GPU + 8 W per drive + 3 W per fan + 50 W for the motherboard, RAM and USB. Follow the GPU maker's recommended PSU if it's higher, and choose ATX 3.x units with 12V-2x6 connectors for current high-end cards.",
    faq: [
      { question: "What size power supply do I need?", answer: "Add CPU and GPU power plus about 100 W, then add 30–50% headroom — most gaming PCs need 650–850 W." },
      { question: "Is a bigger PSU bad?", answer: "No — an oversized PSU just costs more; it only draws the power your PC uses." },
    ],
  },
  {
    slug: "pc-build-price-calculator",
    title: "PC Build Price Calculator",
    description: "Add up the price of a PC build — CPU, GPU, motherboard, RAM, storage, PSU, case, cooler, OS and peripherals — with tax and shipping, and see if it fits your budget.",
    metaTitle: "PC Build Price Calculator — Total Build Cost",
    metaDescription: "Free PC build price calculator. Add up PC parts with tax and shipping, see the GPU's share of the budget and how far over budget you are.",
    calcInputs: [
      currencyField("cpu", "CPU", { default: 199, max: 10000, step: 1 }),
      currencyField("gpu", "Graphics Card", { default: 549, max: 10000, step: 1 }),
      currencyField("motherboard", "Motherboard", { default: 159, max: 5000, step: 1 }),
      currencyField("ram", "RAM", { default: 89, max: 5000, step: 1 }),
      currencyField("storage", "Storage", { default: 89, max: 5000, step: 1 }),
      currencyField("psu", "Power Supply", { default: 99, max: 2000, step: 1 }),
      currencyField("pcCase", "Case", { default: 89, max: 2000, step: 1 }),
      currencyField("cooler", "CPU Cooler", { default: 39, max: 1000, step: 1, required: false }),
      currencyField("os", "Operating System", { default: 0, max: 500, step: 1, required: false }),
      currencyField("peripherals", "Monitor, Keyboard & Mouse", { default: 0, max: 10000, step: 1, required: false }),
      percentField("taxRate", "Sales Tax", { default: 7, max: 20, step: 0.01, required: false }),
      currencyField("shipping", "Shipping", { default: 0, max: 1000, step: 1, required: false }),
      currencyField("budget", "Your Budget", { default: 1300, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Total Price", format: "currency" },
    calcResults: [
      { key: "totalPrice", label: "Total Build Price", format: "currency", highlight: true },
      { key: "partsSubtotal", label: "Parts Subtotal", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "gpuShareOfParts", label: "GPU Share of Parts", format: "percentage" },
      { key: "cpuShareOfParts", label: "CPU Share of Parts", format: "percentage" },
      { key: "overBudget", label: "Over Budget By", format: "currency" },
    ],
    instructions: "Enter the price of each part (leave any you already own at 0), your sales tax, shipping and budget.",
    examples: "Example: a mid-range build with a $549 graphics card comes to $1,403.84 with 7% tax — the GPU is 41.84% of the parts cost, and you're $103.84 over a $1,300 budget.",
    assumptions: "For gaming builds, the graphics card typically takes 35–45% of the parts budget. Part prices change often — compare retailers and watch for bundles. Windows licenses and peripherals are easy to forget.",
    faq: [
      { question: "How much does it cost to build a gaming PC?", answer: "About $800–$1,000 for 1080p, $1,200–$1,800 for 1440p and $2,500+ for high-end 4K builds in 2026." },
      { question: "How much of my budget should go to the GPU?", answer: "Roughly 35–45% for a gaming PC, balanced with a CPU that won't hold it back." },
    ],
  },
  {
    slug: "pc-power-consumption-calculator",
    title: "PC Power Consumption Calculator",
    description: "Find what your gaming or work PC costs to run — monthly and yearly electricity cost and kWh — from gaming and idle power, hours of use and your monitor.",
    metaTitle: "PC Power Consumption Calculator — Cost to Run",
    metaDescription: "Free PC power consumption calculator. Find the monthly and yearly electricity cost of your PC from gaming and idle watts and hours.",
    calcInputs: [
      numberField("loadWatts", "Power While Gaming / Working Hard", { unit: "W", default: 420, max: 2000, step: 5 }),
      numberField("loadHours", "Hours Gaming per Day", { unit: "hours", default: 3, max: 24, step: 0.5 }),
      numberField("idleWatts", "Power at Idle / Light Use", { unit: "W", default: 80, max: 500, step: 5 }),
      numberField("idleHours", "Hours of Light Use per Day", { unit: "hours", default: 4, max: 24, step: 0.5 }),
      numberField("monitorWatts", "Monitor Power", { unit: "W", default: 35, max: 500, step: 5, required: false }),
      currencyField("rate", "Electricity Price per kWh", { default: 0.17, max: 2, step: 0.001 }),
    ],
    calcResult: { label: "Cost per Month", format: "currency" },
    calcResults: [
      { key: "costPerMonth", label: "Cost per Month", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "kwhPerMonth", label: "Energy per Month (kWh)", format: "number" },
      { key: "costPerGamingHour", label: "Cost per Gaming Hour", format: "currency", decimals: 3 },
    ],
    instructions: "Enter your PC's power while gaming and at idle (measure at the wall with a plug-in meter, or estimate from the PSU calculator) and the hours of each, plus your monitor and electricity price.",
    examples: "Example: a PC drawing 420 W while gaming 3 hours and 80 W for 4 hours of light use, with a 35 W monitor, costs about $9.44 a month — $113.24 a year at 17¢ per kWh.",
    assumptions: "Real gaming power is usually 60–80% of the combined CPU and GPU ratings. Sleep mode uses only a few watts. Frame-rate caps and efficient settings can cut gaming power noticeably.",
    faq: [
      { question: "How much electricity does a gaming PC use?", answer: "Typically 300–600 W while gaming and 50–100 W at idle; a few hours of gaming a day costs $5–$15 a month." },
      { question: "Does leaving my PC on cost much?", answer: "Idling all day can cost $5–$10 a month; sleep mode cuts that to pennies." },
    ],
  },
  {
    slug: "pc-worth-calculator",
    title: "PC Worth Calculator",
    description: "Estimate what your used computer is worth — resale, part-out and trade-in value — from what it cost, its age and condition.",
    metaTitle: "PC Worth Calculator — Used Computer Value",
    metaDescription: "Free PC worth calculator. Estimate the resale, part-out and trade-in value of a used gaming PC or computer from price, age and condition.",
    calcInputs: [
      currencyField("purchasePrice", "Original Price", { default: 1500, max: 50000, step: 10 }),
      numberField("ageYears", "Age", { unit: "years", default: 3, max: 15, step: 0.5 }),
      dropdown("condition", "Condition", [["Like new, upgraded", 0], ["Good", 1], ["Fair (wear, old parts)", 2], ["Poor / faulty", 3]], 1),
    ],
    calcResult: { label: "Resale Value", format: "currency" },
    calcResults: [
      { key: "resaleValue", label: "Private Sale Value", format: "currency", highlight: true },
      { key: "partOutValue", label: "Part-Out Value (Selling Parts Separately)", format: "currency" },
      { key: "tradeInValue", label: "Trade-In / Shop Offer", format: "currency" },
      { key: "valueLost", label: "Value Lost", format: "currency" },
      { key: "percentOfOriginal", label: "Value as % of Original Price", format: "percentage" },
    ],
    instructions: "Enter what the PC cost, how old it is and its condition. GPUs hold value best; check recent sold listings for your exact graphics card and CPU.",
    examples: "Example: a $1,500 PC that's 3 years old and in good condition sells for about $714.00 privately, or about $821.10 if you sell the parts separately.",
    assumptions: "Depreciation: about 30% the first year, 20% the second and 15% a year after. Selling parts separately usually brings 10–20% more but takes longer. New GPU launches can drop used prices quickly.",
    faq: [
      { question: "How much is my used gaming PC worth?", answer: "Usually 40–60% of the original price after 2–3 years, depending mostly on the graphics card." },
      { question: "Is it better to sell a PC whole or in parts?", answer: "Parting out often earns more, but selling whole is faster and easier." },
    ],
  },
  {
    slug: "ram-size-calculator",
    title: "RAM Size Calculator",
    description: "Find how much RAM you need — 8, 16, 32, 64 GB or more — for browsing, office work, gaming, streaming, video editing or 3D work, plus tabs and virtual machines.",
    metaTitle: "RAM Size Calculator — How Much RAM Do I Need?",
    metaDescription: "Free RAM size calculator. Find how much memory you need for gaming, streaming, video editing or office work, plus tabs and VMs.",
    calcInputs: [
      dropdown("useCase", "Main Use", [["Browsing & email", 0], ["Office & school", 1], ["Gaming", 2], ["Gaming + streaming", 3], ["Photo / video editing", 4], ["3D, CAD, development & VMs", 5]], 2),
      numberField("browserTabs", "Browser Tabs Usually Open", { default: 20, max: 500 }),
      numberField("virtualMachines", "Virtual Machines Running at Once", { default: 0, max: 20, required: false }),
    ],
    calcResult: { label: "Recommended RAM", format: "number" },
    calcResults: [
      { key: "recommendedGb", label: "Recommended RAM (GB)", format: "number", highlight: true },
      { key: "estimatedNeedGb", label: "Estimated Need (GB)", format: "number" },
      { key: "minimumGb", label: "Workable Minimum (GB)", format: "number" },
      { key: "stickConfigGb", label: "Buy as 2 Sticks of (GB)", format: "number" },
    ],
    instructions: "Choose your main use, how many browser tabs you keep open and any virtual machines. Buy RAM in matched pairs for dual-channel speed.",
    examples: "Example: gaming with 20 browser tabs open needs about 18 GB, so go with 32 GB — two 16 GB sticks.",
    assumptions: "Baselines: browsing 8 GB, office and gaming 16 GB, streaming and editing 32 GB, 3D and development 64 GB; about 0.1 GB per tab and 8 GB per virtual machine. Many 2026 games recommend 32 GB for smooth play with apps in the background.",
    faq: [
      { question: "Is 16GB of RAM enough for gaming?", answer: "For most games yes, but 32 GB is becoming the comfortable standard, especially with Discord and browsers open." },
      { question: "Does more RAM make a PC faster?", answer: "Only if you're running out; beyond what you use, extra RAM adds little speed." },
    ],
  },
  {
    slug: "vram-calculator",
    title: "VRAM Calculator",
    description: "Find how much graphics card memory (VRAM) you need — for gaming by resolution and settings, or for running local AI models by parameter count and quantization.",
    metaTitle: "VRAM Calculator — GPU Memory for Games & AI",
    metaDescription: "Free VRAM calculator. Find the GPU memory you need for gaming at 1080p, 1440p or 4K, or to run local LLMs by size and quantization.",
    calcInputs: [
      dropdown("useCase", "Use", [["Gaming", 0], ["Running local AI models (LLMs)", 1]], 0),
      dropdown("resolution", "Gaming Resolution", [["1080p", 0], ["1440p", 1], ["4K", 2]], 1),
      dropdown("textures", "Texture Quality", [["Low / medium", 0], ["High", 1], ["Ultra", 2]], 2),
      dropdown("rayTracing", "Ray Tracing?", [["No", 0], ["Yes", 1]], 1),
      dropdown("frameGen", "Frame Generation?", [["No", 0], ["Yes", 1]], 0),
      numberField("modelParamsB", "AI Model Size (Billions of Parameters)", { default: 13, max: 1000, step: 0.5, required: false }),
      dropdown("quantBits", "AI Quantization", [["4-bit", 4], ["5-bit", 5], ["8-bit", 8], ["16-bit (FP16)", 16]], 4),
      numberField("contextGb", "Extra for Context / KV Cache", { unit: "GB", default: 1, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "VRAM Needed", format: "number" },
    calcResults: [
      { key: "vramNeededGb", label: "VRAM Needed (GB)", format: "number", highlight: true },
      { key: "suggestedCardGb", label: "Graphics Card Memory to Look For (GB)", format: "number" },
      { key: "gamingBaselineGb", label: "Gaming Baseline for Resolution (GB)", format: "number" },
      { key: "extraForSettingsGb", label: "Extra for Settings (GB)", format: "number" },
    ],
    instructions: "For gaming, choose your resolution, texture quality, ray tracing and frame generation. For local AI, choose 'Running local AI models' and enter the model's size in billions of parameters and the quantization you'll use.",
    examples: "Example: 1440p gaming with ultra textures and ray tracing needs about 16 GB — look for a 16 GB graphics card.",
    assumptions: "Gaming baselines: 8 GB at 1080p, 12 GB at 1440p, 16 GB at 4K, plus about 2 GB each for ray tracing and ultra textures. AI: parameters × bits ÷ 8 × 1.2 overhead, plus context — a 13B model at 4-bit needs about 8–9 GB. Newer games keep raising VRAM needs.",
    faq: [
      { question: "Is 8GB of VRAM enough in 2026?", answer: "For 1080p at medium–high settings, mostly yes; at 1440p or with ray tracing and ultra textures, 12–16 GB avoids stutters." },
      { question: "How much VRAM do I need to run an LLM locally?", answer: "Roughly the model size in billions × the bits per weight ÷ 8, plus 20% — about 5 GB for a 7B model at 4-bit and 40+ GB for a 70B model." },
    ],
  },
  {
    slug: "ssd-lifespan-calculator",
    title: "SSD Lifespan Calculator",
    description: "Estimate how many years an SSD will last from its TBW endurance rating and how much you write each day, with drive writes per day and the warranty check.",
    metaTitle: "SSD Lifespan Calculator — Years From TBW",
    metaDescription: "Free SSD lifespan calculator. Estimate SSD life in years from its TBW rating and daily writes, plus DWPD and whether it outlasts the warranty.",
    calcInputs: [
      numberField("tbwRating", "Endurance Rating (TBW)", { unit: "TB", default: 600, max: 100000, step: 10 }),
      numberField("dailyWritesGb", "Data Written per Day", { unit: "GB", default: 50, max: 100000, step: 1 }),
      numberField("writeAmplification", "Write Amplification Factor", { default: 1.5, min: 1, max: 10, step: 0.1 }),
      numberField("capacityTb", "Drive Capacity", { unit: "TB", default: 1, max: 100, step: 0.25 }),
      numberField("warrantyYears", "Warranty", { unit: "years", default: 5, max: 10 }),
    ],
    calcResult: { label: "Years", format: "number" },
    calcResults: [
      { key: "yearsToRatedTbw", label: "Years to Reach Rated TBW", format: "number", highlight: true },
      { key: "totalWritesPerYearTb", label: "Writes per Year (TB)", format: "number" },
      { key: "drivesWritesPerDay", label: "Drive Writes per Day (DWPD)", format: "number" },
      { key: "outlastsWarranty", label: "Outlasts the Warranty? (1 = Yes)", format: "number" },
    ],
    instructions: "Find the TBW rating on the SSD's spec sheet and estimate your daily writes (Windows Task Manager or SMART tools show total host writes). Write amplification covers extra internal writes.",
    examples: "Example: a 1 TB SSD rated for 600 TBW with 50 GB of writes a day (×1.5 amplification) lasts about 21.92 years before reaching its rating.",
    assumptions: "Years = TBW × 1,000 ÷ (daily GB × amplification × 365). Most drives keep working well past their TBW rating; it's the warranty limit, not a failure date. Typical home users write 10–50 GB a day.",
    faq: [
      { question: "How long do SSDs last?", answer: "For typical home use, a modern SSD's rated endurance lasts 10+ years — usually longer than you'll keep the drive." },
      { question: "What does TBW mean?", answer: "Terabytes written — the total data the maker guarantees the drive can write during the warranty period." },
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
