// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// finance expansion 3 sub-batch "macro2". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-macro2.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-macro2-calculators.ts
// or
//   npm run db:create-fin3-macro2-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });


const MACROECONOMICS = { name: "Economics Calculators", slug: "economics-calculators" };

const ECON_NOTE = "Textbook macroeconomic relationships for learning and rough estimates — real economies are messier.";
const BANK_NOTE = "A simplified Basel III calculation for learning; regulators' rules include many more categories, caps and run-off rates.";

const TOOLS: ToolDef[] = [
  {
    slug: "lcr-calculator",
    category: MACROECONOMICS,
    title: "LCR Calculator",
    description: "Calculate a bank's liquidity coverage ratio (LCR) — high-quality liquid assets after haircuts and caps divided by net cash outflows over 30 days — against the 100% minimum.",
    metaTitle: "LCR Calculator — Liquidity Coverage Ratio (Basel III)",
    metaDescription: "Free liquidity coverage ratio calculator. Apply Basel III haircuts and caps to Level 1, 2A and 2B assets and divide by 30-day net cash outflows.",
    calcInputs: [numberField("level1Assets", "Level 1 Assets (cash, reserves, Treasuries)", { default: 600, max: 1000000000, step: 0.1 }), numberField("level2aAssets", "Level 2A Assets (agency MBS, high-grade bonds)", { default: 200, max: 1000000000, step: 0.1, required: false }), numberField("level2bAssets", "Level 2B Assets (lower-rated bonds, equities)", { default: 100, max: 1000000000, step: 0.1, required: false }), numberField("netCashOutflows", "Net Cash Outflows over 30 Days (stressed)", { default: 700, min: 0.1, max: 1000000000, step: 0.1 })],
    calcResult: { label: "LCR", format: "percentage" },
    calcResults: [num("hqla", "High-Quality Liquid Assets (after haircuts and caps)"), num("level2Included", "Level 2 Assets Counted"), pct("lcr", "Liquidity Coverage Ratio", true), num("meetsMinimum", "Meets 100% Minimum (1 = yes)"), num("surplusOrShortfall", "HQLA Surplus (+) / Shortfall (−)")],
    instructions: "Enter liquid assets by level (same units, e.g. $ millions) and stressed net cash outflows over the next 30 days. Level 2A assets count at 85%, Level 2B at 50%, and caps limit how much Level 2 can count.",
    examples: "Example: 600 of Level 1, 200 of Level 2A and 100 of Level 2B give 820 of HQLA against 700 of outflows — an LCR of 117%, above the 100% requirement.",
    assumptions: "Level 2B ≤ 15% and all Level 2 ≤ 40% of HQLA (applied as caps relative to Level 1). Outflow run-off and inflow caps must be calculated separately. " + BANK_NOTE,
    faq: [
      { question: "Why must the LCR be at least 100%?", answer: "So a bank can survive a 30-day stress — such as a deposit run — by selling liquid assets without central-bank help." },
      { question: "Which banks report the LCR?", answer: "Large internationally active banks under Basel III; in the US the full LCR applies to the largest banking organisations." },
    ],
  },
  {
    slug: "nsfr-calculator",
    category: MACROECONOMICS,
    title: "NSFR Calculator",
    description: "Calculate a bank's net stable funding ratio (NSFR) — available stable funding divided by required stable funding under Basel III — against the 100% minimum.",
    metaTitle: "NSFR Calculator — Net Stable Funding Ratio (Basel III)",
    metaDescription: "Free NSFR calculator. Weight capital, deposits and wholesale funding by ASF factors and assets by RSF factors to find the net stable funding ratio.",
    calcInputs: [numberField("regulatoryCapital", "Regulatory Capital (ASF 100%)", { default: 120, max: 1000000000, step: 0.1 }), numberField("stableRetailDeposits", "Stable Retail Deposits (ASF 95%)", { default: 400, max: 1000000000, step: 0.1 }), numberField("lessStableRetailDeposits", "Less Stable Retail Deposits (ASF 90%)", { default: 250, max: 1000000000, step: 0.1 }), numberField("wholesaleFundingOver1y", "Wholesale Funding over 1 Year (ASF 100%)", { default: 150, max: 1000000000, step: 0.1 }), numberField("wholesaleFundingNonFinancialUnder1y", "Corporate Deposits under 1 Year (ASF 50%)", { default: 100, max: 1000000000, step: 0.1 }), numberField("cashAndReserves", "Cash & Central Bank Reserves (RSF 0%)", { default: 60, max: 1000000000, step: 0.1 }), numberField("level1Securities", "Level 1 Securities (RSF 5%)", { default: 150, max: 1000000000, step: 0.1 }), numberField("shortTermLoansToFinancials", "Loans to Financials under 6 Months (RSF 15%)", { default: 50, max: 1000000000, step: 0.1 }), numberField("residentialMortgages", "Performing Residential Mortgages (RSF 65%)", { default: 350, max: 1000000000, step: 0.1 }), numberField("otherLoansOver1y", "Other Performing Loans over 1 Year (RSF 85%)", { default: 300, max: 1000000000, step: 0.1 }), numberField("otherAssets", "All Other Assets (RSF 100%)", { default: 80, max: 1000000000, step: 0.1 })],
    calcResult: { label: "NSFR", format: "percentage" },
    calcResults: [num("availableStableFunding", "Available Stable Funding"), num("requiredStableFunding", "Required Stable Funding"), pct("nsfr", "Net Stable Funding Ratio", true), num("meetsMinimum", "Meets 100% Minimum (1 = yes)")],
    instructions: "Enter funding sources and assets by category in the same units. Each is weighted by its Basel III factor: stable funding counts more toward ASF, and illiquid assets require more stable funding (RSF).",
    examples: "Example: the defaults give 925 of available stable funding against 577.5 required — an NSFR of 160%.",
    assumptions: "Standard Basel III ASF/RSF factors for the listed categories (simplified; risk weights on mortgages, encumbrance and derivatives are ignored). The NSFR measures funding stability over one year, unlike the 30-day LCR. " + BANK_NOTE,
    faq: [
      { question: "What's the difference between LCR and NSFR?", answer: "LCR covers a 30-day stress; NSFR checks that long-term assets are funded by stable, long-term funding." },
      { question: "Why do mortgages need 65% stable funding?", answer: "They're long-term and hard to sell quickly, so they must be backed largely by stable funding." },
    ],
  },
  {
    slug: "money-multiplier-calculator",
    category: MACROECONOMICS,
    title: "Money Multiplier Calculator",
    description: "Calculate the money multiplier from the reserve ratio (and currency ratio), the money supply it supports, and required and excess reserves.",
    metaTitle: "Money Multiplier Calculator — Money Supply & Reserve Ratio",
    metaDescription: "Free money multiplier calculator. Find the simple multiplier 1/rr or (1 + c)/(rr + c), the money supply from the monetary base, and required reserves.",
    calcInputs: [percentField("reserveRatio", "Required Reserve Ratio", { default: 10, max: 100, step: 0.1 }), percentField("currencyRatio", "Currency-to-Deposit Ratio (optional)", { default: 0, max: 500, step: 0.1, required: false }), numberField("monetaryBase", "Monetary Base", { default: 1000, max: 1000000000, step: 0.1 }), numberField("deposits", "Bank Deposits", { default: 5000, max: 1000000000, step: 0.1, required: false }), numberField("reservesHeld", "Reserves Actually Held", { default: 600, max: 1000000000, step: 0.1, required: false })],
    calcResult: { label: "Money Multiplier", format: "number", decimals: 4 },
    calcResults: [num("simpleMultiplier", "Simple Multiplier (1 ÷ rr)", false, 4), num("moneyMultiplier", "Money Multiplier", true, 4), num("moneySupply", "Money Supply Supported"), num("requiredReserves", "Required Reserves"), num("excessReserves", "Excess Reserves"), pct("actualReserveRatio", "Actual Reserve Ratio")],
    instructions: "Enter the reserve ratio banks must hold and the monetary base. Adding a currency ratio (cash people hold relative to deposits) gives the more realistic multiplier (1 + c) ÷ (rr + c). Enter deposits and reserves to see required and excess reserves.",
    examples: "Example: a 10% reserve ratio gives a multiplier of 10, so a $1,000 monetary base can support up to $10,000 of money. On $5,000 of deposits, $500 must be held; holding $600 leaves $100 excess.",
    assumptions: "Textbook fractional-reserve model. Since March 2020 the US reserve requirement has been 0% and banks hold large excess reserves, so the multiplier explains little about today's money supply. " + ECON_NOTE,
    faq: [
      { question: "Is the money multiplier still relevant?", answer: "It's a teaching model; in practice lending depends on demand, capital rules and interest on reserves, not reserve requirements." },
      { question: "What's the US reserve requirement?", answer: "0% since March 26, 2020." },
    ],
  },
  {
    slug: "natural-rate-of-unemployment-calculator",
    category: MACROECONOMICS,
    title: "Natural Rate of Unemployment Calculator",
    description: "Calculate the natural rate of unemployment from frictional and structural unemployment, and the cyclical unemployment rate when the economy is below potential.",
    metaTitle: "Natural Rate of Unemployment Calculator",
    metaDescription: "Free natural rate of unemployment calculator. Add frictional and structural unemployment, divide by the labor force, and find cyclical unemployment.",
    calcInputs: [numberField("frictionalUnemployed", "Frictionally Unemployed (millions)", { default: 3.5, max: 100000, step: 0.01 }), numberField("structuralUnemployed", "Structurally Unemployed (millions)", { default: 3, max: 100000, step: 0.01 }), numberField("totalUnemployed", "Total Unemployed (millions)", { default: 7.4, max: 100000, step: 0.01 }), numberField("laborForce", "Labor Force (millions)", { default: 170, min: 0.01, max: 100000, step: 0.01 })],
    calcResult: { label: "Natural Rate", format: "percentage" },
    calcResults: [pct("naturalRate", "Natural Rate of Unemployment", true), pct("actualRate", "Actual Unemployment Rate"), pct("cyclicalUnemploymentRate", "Cyclical Unemployment Rate"), num("cyclicallyUnemployed", "Cyclically Unemployed (millions)")],
    instructions: "Enter the people unemployed while switching jobs (frictional), those whose skills or location don't match available jobs (structural), total unemployment and the labor force.",
    examples: "Example: 3.5M frictional and 3M structural unemployed in a 170M labor force is a natural rate of 3.82%. With 7.4M unemployed (4.35%), cyclical unemployment is 0.53 points — 0.9M people.",
    assumptions: "Natural rate = (frictional + structural) ÷ labor force; cyclical = actual − natural. The CBO estimates the US natural rate (NAIRU) at roughly 4–4.5%. " + ECON_NOTE,
    faq: [
      { question: "Why isn't the natural rate zero?", answer: "People always move between jobs and skills never perfectly match openings, so some unemployment is normal." },
      { question: "Can unemployment fall below the natural rate?", answer: "Temporarily, in a booming economy — usually with rising wage and price inflation." },
    ],
  },
  {
    slug: "okuns-law-calculator",
    category: MACROECONOMICS,
    title: "Okun's Law Calculator",
    description: "Use Okun's law to estimate how unemployment changes when GDP growth is above or below potential, or the output gap implied by unemployment above its natural rate.",
    metaTitle: "Okun's Law Calculator — GDP Growth & Unemployment",
    metaDescription: "Free Okun's law calculator. Estimate the change in unemployment from GDP growth versus potential, and the output gap from the unemployment gap.",
    calcInputs: [percentField("actualGrowth", "Real GDP Growth", { default: 1, min: -50, max: 50, step: 0.1 }), percentField("potentialGrowth", "Potential GDP Growth", { default: 2, min: -10, max: 20, step: 0.1 }), numberField("okunCoefficient", "Okun Coefficient", { default: 2, min: 0.1, max: 10, step: 0.1 }), percentField("unemploymentRate", "Unemployment Rate", { default: 5, step: 0.1 }), percentField("naturalRate", "Natural Rate of Unemployment", { default: 4.2, step: 0.1 })],
    calcResult: { label: "Change in Unemployment", format: "number" },
    calcResults: [num("unemploymentChange", "Change in Unemployment Rate (points)", true), pct("outputGapFromUnemployment", "Output Gap Implied by Unemployment"), pct("lostOutputPct", "Output Lost vs Potential")],
    instructions: "Enter GDP growth, potential growth and the Okun coefficient (about 2 in the US: each point of growth shortfall raises unemployment about ½ point). Add the unemployment and natural rates to see the output gap they imply.",
    examples: "Example: 1% growth when potential is 2% raises unemployment about 0.5 points. Unemployment of 5% against a 4.2% natural rate implies GDP about 1.6% below potential.",
    assumptions: "Difference form: Δu = −(g − g*) ÷ k; gap form: (Y − Y*) ÷ Y* = −β(u − u*), with β = k. The relationship varies over time and between countries. " + ECON_NOTE,
    faq: [
      { question: "Who was Okun?", answer: "Arthur Okun, a US economist who described the relationship in 1962." },
      { question: "Why is the coefficient about 2?", answer: "When output falls, firms cut hours and productivity drops too, so unemployment rises by less than output falls." },
    ],
  },
  {
    slug: "phillips-curve-calculator",
    category: MACROECONOMICS,
    title: "Phillips Curve Calculator",
    description: "Predict inflation with the expectations-augmented Phillips curve from expected inflation, the unemployment gap and any supply shock.",
    metaTitle: "Phillips Curve Calculator — Inflation & Unemployment",
    metaDescription: "Free Phillips curve calculator. Estimate inflation as expected inflation minus β times the unemployment gap plus supply shocks.",
    calcInputs: [percentField("expectedInflation", "Expected Inflation", { default: 2.5, min: -20, max: 100, step: 0.1 }), numberField("sensitivity", "Sensitivity β", { default: 0.5, max: 10, step: 0.05 }), percentField("unemploymentRate", "Unemployment Rate", { default: 3.8, step: 0.1 }), percentField("naturalRate", "Natural Rate of Unemployment", { default: 4.2, step: 0.1 }), percentField("supplyShock", "Supply Shock (e.g. oil, tariffs)", { default: 0, min: -20, max: 20, step: 0.1, required: false })],
    calcResult: { label: "Predicted Inflation", format: "percentage" },
    calcResults: [pct("predictedInflation", "Predicted Inflation", true), num("unemploymentGap", "Unemployment Gap (points)"), pct("demandPullInflation", "Inflation from a Tight (or Slack) Labor Market")],
    instructions: "Enter expected inflation, how sensitive inflation is to labor-market slack, the unemployment and natural rates and any supply shock. Unemployment below the natural rate pushes inflation above expectations.",
    examples: "Example: with 2.5% expected inflation, β = 0.5 and unemployment at 3.8% versus a 4.2% natural rate, predicted inflation is 2.7%.",
    assumptions: "π = πᵉ − β(u − u*) + ν. The curve flattened in the 2010s (small β) and steepened in 2021–22. In the long run there's no trade-off — expectations adjust. " + ECON_NOTE,
    faq: [
      { question: "Is there still a Phillips curve?", answer: "A short-run trade-off still appears, but it's weak and shifts with inflation expectations." },
      { question: "What is stagflation?", answer: "High inflation and high unemployment together — usually after a supply shock, shown as a shift of the curve." },
    ],
  },
  {
    slug: "price-elasticity-of-supply-calculator",
    category: MACROECONOMICS,
    title: "Price Elasticity of Supply Calculator",
    description: "Calculate the price elasticity of supply (PES) from two prices and quantities supplied with the midpoint formula, and whether supply is elastic or inelastic.",
    metaTitle: "Price Elasticity of Supply Calculator — PES",
    metaDescription: "Free price elasticity of supply calculator. Use the midpoint or simple formula to find PES and whether supply is elastic, unit elastic or inelastic.",
    calcInputs: [currencyField("initialPrice", "Initial Price", { default: 20, max: 100000000, step: 0.01 }), currencyField("newPrice", "New Price", { default: 24, max: 100000000, step: 0.01 }), numberField("initialQuantity", "Initial Quantity Supplied", { default: 500, max: 1000000000 }), numberField("newQuantity", "New Quantity Supplied", { default: 580, max: 1000000000 }), dropdown("method", "Formula", [["Midpoint (arc) method", 1], ["Simple % change", 2]], 1)],
    calcResult: { label: "PES", format: "number", decimals: 4 },
    calcResults: [pct("pctChangeQuantity", "% Change in Quantity Supplied"), pct("pctChangePrice", "% Change in Price"), num("elasticityOfSupply", "Price Elasticity of Supply", true, 4), num("classification", "Supply Is (1 Elastic, 2 Unit Elastic, 3 Inelastic, 4 Perfectly Inelastic)")],
    instructions: "Enter the price and the quantity producers supplied before and after a price change. Supply is usually more elastic in the long run, when firms can build capacity.",
    examples: "Example: a price rise from $20 to $24 lifts quantity supplied from 500 to 580. Quantity rises 14.81% and price 18.18% (midpoint), so PES = 0.81 — inelastic.",
    assumptions: "PES = %ΔQs ÷ %ΔP, positive for normal upward-sloping supply. For demand, use the Price Elasticity of Demand Calculator. " + ECON_NOTE,
    faq: [
      { question: "What makes supply elastic?", answer: "Spare capacity, easy-to-store inventory, mobile inputs and a long time to adjust." },
      { question: "Why is housing supply inelastic?", answer: "Land, zoning and construction time limit how fast new homes can be built when prices rise." },
    ],
  },
  {
    slug: "taylor-rule-calculator",
    category: MACROECONOMICS,
    title: "Taylor Rule Calculator",
    description: "Calculate the policy interest rate suggested by the Taylor rule from inflation, the inflation target, the output gap and the neutral real rate — and compare it with the actual rate.",
    metaTitle: "Taylor Rule Calculator — Suggested Fed Funds Rate",
    metaDescription: "Free Taylor rule calculator. Estimate the policy rate from inflation, the 2% target, the output gap and the neutral real rate, with adjustable weights.",
    calcInputs: [percentField("neutralRealRate", "Neutral Real Rate (r*)", { default: 1, min: -5, max: 10, step: 0.1 }), percentField("inflation", "Inflation (e.g. core PCE)", { default: 3, min: -20, max: 100, step: 0.1 }), percentField("inflationTarget", "Inflation Target", { default: 2, max: 20, step: 0.1 }), percentField("outputGap", "Output Gap (% of potential)", { default: -0.5, min: -30, max: 30, step: 0.1 }), numberField("inflationWeight", "Weight on Inflation Gap", { default: 0.5, max: 5, step: 0.05 }), numberField("outputWeight", "Weight on Output Gap", { default: 0.5, max: 5, step: 0.05 }), percentField("currentPolicyRate", "Current Policy Rate (optional)", { default: 0, max: 50, step: 0.01, required: false })],
    calcResult: { label: "Taylor Rule Rate", format: "percentage" },
    calcResults: [pct("taylorRate", "Taylor Rule Rate", true), pct("inflationTerm", "Inflation-Gap Term"), pct("outputTerm", "Output-Gap Term"), pct("gapVsActual", "Actual Rate minus Taylor Rate")],
    instructions: "Enter inflation, the central bank's target, the output gap and your estimate of the neutral real rate. The original Taylor (1993) rule used r* = 2% and weights of 0.5; many now use r* of 0.5–1%, and the \"balanced-approach\" rule doubles the output weight to 1.",
    examples: "Example: 3% inflation, a 2% target, a −0.5% output gap and r* = 1% suggest a policy rate of 1 + 3 + 0.5 − 0.25 = 4.25%.",
    assumptions: "i = r* + π + a(π − π*) + b(gap). A guide for discussion, not a forecast — central banks also weigh financial conditions and risks. " + ECON_NOTE,
    faq: [
      { question: "Does the Fed follow the Taylor rule?", answer: "Not mechanically, but the FOMC reviews Taylor-type rules in its Monetary Policy Report." },
      { question: "What is r-star?", answer: "The neutral real interest rate that neither stimulates nor restrains the economy; it can't be observed directly." },
    ],
  },
  {
    slug: "velocity-of-money-calculator",
    category: MACROECONOMICS,
    title: "Velocity of Money Calculator",
    description: "Calculate the velocity of money — how many times each dollar is spent on output in a year — from nominal GDP and the money supply, using MV = PY.",
    metaTitle: "Velocity of Money Calculator — MV = PY",
    metaDescription: "Free velocity of money calculator. Divide nominal GDP by the money supply (M1 or M2) to get velocity, and the price level from real GDP.",
    calcInputs: [numberField("nominalGdp", "Nominal GDP ($ billions)", { default: 29200, max: 1000000000, step: 0.1 }), numberField("moneySupply", "Money Supply — M2 ($ billions)", { default: 21500, min: 0.1, max: 1000000000, step: 0.1 }), numberField("realGdp", "Real GDP (optional, for price level)", { default: 0, max: 1000000000, step: 0.1, required: false })],
    calcResult: { label: "Velocity", format: "number", decimals: 4 },
    calcResults: [num("velocity", "Velocity of Money", true, 4), num("priceLevel", "Price Level (P = nominal ÷ real)", false, 4), num("daysPerTurnover", "Days for Each Dollar to Be Spent Once")],
    instructions: "Enter nominal GDP and a money-supply measure for the same period (M2 is most common; FRED publishes both). Falling velocity means money is being held rather than spent.",
    examples: "Example: $29.2 trillion of GDP and $21.5 trillion of M2 give an M2 velocity of 1.36 — each dollar of M2 changes hands for final output about 1.36 times a year.",
    assumptions: "Quantity theory of money: M × V = P × Y, so V = nominal GDP ÷ M. US M2 velocity fell from about 2.2 in 1997 to near 1.1 in 2020 and has partly recovered. " + ECON_NOTE,
    faq: [
      { question: "Why did velocity collapse in 2020?", answer: "Money supply surged while spending fell, as households saved stimulus payments." },
      { question: "Does higher money supply always cause inflation?", answer: "Only if velocity and real output don't absorb it — which is why velocity matters." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
