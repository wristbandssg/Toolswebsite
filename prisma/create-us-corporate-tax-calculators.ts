// One-time (but safe to re-run) batch setup script: creates 50 US state
// Corporate Tax Tools inside the existing "Tax & Paycheck Calculators"
// category — sixth batch of the 50-state audit.
//
// See src/lib/calc-engine-us-corporate-tax.ts for the actual math and that
// file's header for how states with no traditional corporate income tax
// (Nevada, Ohio, Texas, Washington — gross-receipts/margin substitutes) and
// no state-level business income tax at all (South Dakota, Wyoming) are
// modeled honestly rather than skipped.
//
// HOW TO RUN
//   npx tsx prisma/create-us-corporate-tax-calculators.ts
// or
//   npm run db:create-us-corporate-tax-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
}
function incomeField(opts: { label?: string; max?: number; default?: number } = {}) {
  return { key: "income", label: opts.label ?? "Annual Taxable Net Income", type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 10_000_000, step: 10_000 };
}
function currencyField(key: string, label: string, opts: { required?: boolean; default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: opts.required ?? false, default: opts.default ?? 0, min: 0, max: opts.max ?? 10_000_000, step: opts.step ?? 10_000 };
}
function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. State corporate tax law changes frequently and often includes apportionment rules, credits, and " +
  "minimum taxes beyond what's modeled here — check with a CPA or your state's department of revenue for your " +
  "exact liability.";

const GRADUATED_ESTIMATE_NOTE =
  "This calculator approximates the state's graduated schedule as a marginal rate rising smoothly between its " +
  "published low and high rates, since the exact bracket edges weren't independently reconfirmed by this " +
  "tool's research — treat this as a reasonable estimate, not an exact figure.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

function flatTool(
  state: string,
  slug: string,
  ratePct: number,
  instructionsExtra: string,
  assumptionsExtra: string
): ToolDef {
  const rateLabel = `${ratePct}%`;
  const exampleTax = (1_000_000 * ratePct) / 100;
  return {
    slug,
    title: `${state} Corporate Tax Calculator`,
    description: `Estimate ${state}'s corporate income tax: a flat ${rateLabel} of taxable net income.`,
    metaTitle: `${state} Corporate Tax Calculator (2026) — Free & Instant`,
    metaDescription: `Free ${state} corporate income tax calculator. Flat ${rateLabel} rate.`,
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", `${state} Corporate Tax`, { highlight: true })],
    instructions: `${state} taxes corporate net income at a flat ${rateLabel}. ${instructionsExtra} Enter your corporation's annual taxable net income to see your estimated state tax.`,
    examples: `Example: $1,000,000 in taxable net income. Estimated ${state} corporate tax: $1,000,000 x ${rateLabel} = $${exampleTax.toLocaleString()}.`,
    assumptions: `This calculator uses ${state}'s published flat corporate tax rate. ${assumptionsExtra}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: `Does ${state} apportion income for multi-state corporations?`, answer: "Yes — corporations doing business in multiple states apportion income using that state's formula (often sales-factor-only). This calculator assumes the entered figure is already your apportioned taxable income." }],
  };
}

const TOOLS: ToolDef[] = [
  flatTool("Alabama", "alabama-corporate-tax-calculator", 6.5, "", ""),
  {
    slug: "alaska-corporate-tax-calculator",
    title: "Alaska Corporate Tax Calculator",
    description: "Estimate Alaska's graduated corporate income tax — from 0% up to 9.4% on income above $222,000.",
    metaTitle: "Alaska Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Alaska corporate income tax calculator. Graduated 0%-9.4%, top bracket over $222,000.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Alaska Corporate Tax", { highlight: true })],
    instructions: "Alaska taxes corporate net income on a graduated schedule that rises from 0% to 9.4% as income increases, reaching the top rate above $222,000. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $300,000 in taxable net income. Estimated Alaska corporate tax: roughly $17,800.",
    assumptions: `Alaska's actual schedule has many narrow brackets between $0 and $222,000. ${GRADUATED_ESTIMATE_NOTE}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Why does Alaska have so many small tax brackets?", answer: "Alaska's corporate tax schedule steps up gradually in roughly $25,000 increments — unusual among states, most of which use 2-3 brackets." }],
  },
  flatTool("Arizona", "arizona-corporate-tax-calculator", 4.9, "", ""),
  {
    slug: "arkansas-corporate-tax-calculator",
    title: "Arkansas Corporate Tax Calculator",
    description: "Estimate Arkansas's graduated corporate income tax — from 1% up to 4.3%.",
    metaTitle: "Arkansas Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Arkansas corporate income tax calculator. Graduated 1%-4.3%.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Arkansas Corporate Tax", { highlight: true })],
    instructions: "Arkansas taxes corporate net income on a graduated schedule from 1% up to a top rate of 4.3%. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $50,000 in taxable net income. Estimated Arkansas corporate tax: roughly $1,600.",
    assumptions: `${GRADUATED_ESTIMATE_NOTE} Arkansas's exact bracket edges (which have shifted in recent tax-reform sessions) weren't independently reconfirmed this session.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Is Arkansas's top rate really lower in the middle brackets?", answer: "Arkansas has reformed its brackets several times in recent years to flatten the schedule — check the Arkansas Department of Finance and Administration for the current exact bracket table." }],
  },
  {
    slug: "california-corporate-tax-calculator",
    title: "California Corporate Tax Calculator",
    description: "Estimate California's corporate franchise tax — a flat 8.84% of net income, with an $800 minimum.",
    metaTitle: "California Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free California corporate franchise tax calculator. Flat 8.84%, $800 minimum tax.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "California Corporate Tax", { highlight: true })],
    instructions: "California's corporate franchise tax is a flat 8.84% of net income, but every corporation doing business in California owes at least an $800 minimum franchise tax — even in a loss year. Enter your corporation's annual taxable net income to see your estimated tax.",
    examples: "Example: $50,000 in taxable net income. 8.84% would be $4,420 — well above the $800 minimum, so $4,420 is owed. At $0 income, the $800 minimum still applies.",
    assumptions: `This calculator applies California's flat 8.84% rate and its $800 minimum franchise tax floor.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Do I owe the $800 minimum even if my corporation lost money?", answer: "Yes — California's $800 minimum franchise tax applies to nearly every corporation registered in the state, regardless of profit or loss." }],
  },
  flatTool("Colorado", "colorado-corporate-tax-calculator", 4.4, "", ""),
  {
    slug: "connecticut-corporate-tax-calculator",
    title: "Connecticut Corporate Tax Calculator",
    description: "Estimate Connecticut's corporate income tax — 7.5% base, rising to an effective 8.25% once annual gross income exceeds $100 million.",
    metaTitle: "Connecticut Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Connecticut corporate income tax calculator. 7.5% base, 8.25% for large corporations.",
    calcInputs: [incomeField(), currencyField("grossIncome", "Annual Gross Income (for surtax threshold)", { default: 0, max: 500_000_000, step: 1_000_000 })],
    calcResults: [currencyResult("totalTax", "Connecticut Corporate Tax", { highlight: true })],
    instructions: "Connecticut's base corporate income tax rate is 7.5%, but corporations with more than $100 million in annual gross income owe an additional 10% surtax, pushing their effective rate to 8.25%. Enter your taxable net income and your total annual gross income to check whether the surtax applies.",
    examples: "Example: $2,000,000 in taxable net income, $50,000,000 in gross income (below the surtax threshold). Estimated Connecticut corporate tax: $2,000,000 x 7.5% = $150,000.",
    assumptions: `This calculator applies Connecticut's 7.5% base rate, adding the 10% surtax (effective 8.25%) only when the entered gross income exceeds $100 million.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "What triggers Connecticut's corporate surtax?", answer: "The 10% surtax (making the effective rate 8.25%) applies once a corporation's annual GROSS income — not net income — exceeds $100 million." }],
  },
  flatTool("Delaware", "delaware-corporate-tax-calculator", 8.7, "", ""),
  {
    slug: "florida-corporate-tax-calculator",
    title: "Florida Corporate Tax Calculator",
    description: "Estimate Florida's corporate income tax — 5.5% on net income above a $50,000 exemption.",
    metaTitle: "Florida Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Florida corporate income tax calculator. 5.5% above a $50,000 exemption.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Florida Corporate Tax", { highlight: true })],
    instructions: "Florida exempts the first $50,000 of corporate net income from tax, then taxes everything above that at 5.5%. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $150,000 in taxable net income. Taxable amount: $100,000. Estimated Florida corporate tax: $100,000 x 5.5% = $5,500.",
    assumptions: `This calculator applies Florida's $50,000 exemption before the 5.5% rate.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Do all corporations get the $50,000 exemption?", answer: "Yes — Florida applies this exemption broadly to corporations subject to its corporate income tax." }],
  },
  flatTool("Georgia", "georgia-corporate-tax-calculator", 5.19, "", ""),
  {
    slug: "hawaii-corporate-tax-calculator",
    title: "Hawaii Corporate Tax Calculator",
    description: "Estimate Hawaii's graduated corporate income tax — from 4.4% up to 6.4% on income above $100,000.",
    metaTitle: "Hawaii Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Hawaii corporate income tax calculator. Graduated 4.4%-6.4%, top bracket over $100,000.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Hawaii Corporate Tax", { highlight: true })],
    instructions: "Hawaii taxes corporate net income on a graduated schedule from 4.4% up to 6.4%, reaching the top rate above $100,000. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $200,000 in taxable net income. Estimated Hawaii corporate tax: roughly $11,400.",
    assumptions: `${GRADUATED_ESTIMATE_NOTE}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Is Hawaii's corporate tax the same as its GET (excise tax)?", answer: "No — this is Hawaii's separate net-income corporate tax. The General Excise Tax (GET) is a different, broader gross-receipts-style tax that applies on top of this." }],
  },
  flatTool("Idaho", "idaho-corporate-tax-calculator", 5.3, "", ""),
  {
    slug: "illinois-corporate-tax-calculator",
    title: "Illinois Corporate Tax Calculator",
    description: "Estimate Illinois's combined corporate tax burden — 7% Corporate Income Tax plus a 2.5% Personal Property Replacement Tax.",
    metaTitle: "Illinois Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Illinois corporate tax calculator. 7% CIT + 2.5% PPRT, effectively 9.5% combined.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("corporateIncomeTax", "Corporate Income Tax (7%)"), currencyResult("personalPropertyReplacementTax", "Personal Property Replacement Tax (2.5%)"), currencyResult("totalTax", "Total Illinois Corporate Tax", { highlight: true })],
    instructions: "Illinois corporations owe two separate state taxes on the same net income base: a 7% Corporate Income Tax, plus a 2.5% Personal Property Replacement Tax (PPRT) — for an effective combined rate of 9.5%. Enter your corporation's annual taxable net income to see both line items and the total.",
    examples: "Example: $500,000 in taxable net income. CIT: $35,000. PPRT: $12,500. Total: $47,500.",
    assumptions: `This calculator applies both the 7% CIT and 2.5% PPRT to the same entered net income figure, as published by the Illinois Department of Revenue.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Why does Illinois charge two separate corporate taxes?", answer: "The Personal Property Replacement Tax dates back to the 1970s abolition of a local personal property tax on businesses — it replaces that lost local revenue and is collected alongside the regular corporate income tax." }],
  },
  flatTool("Indiana", "indiana-corporate-tax-calculator", 4.9, "", ""),
  {
    slug: "iowa-corporate-tax-calculator",
    title: "Iowa Corporate Tax Calculator",
    description: "Estimate Iowa's corporate income tax — 5.5% on the first $100,000 of net income, 7.1% above that.",
    metaTitle: "Iowa Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Iowa corporate income tax calculator. 5.5% up to $100,000, 7.1% above.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Iowa Corporate Tax", { highlight: true })],
    instructions: "Iowa taxes the first $100,000 of corporate net income at 5.5%, and anything above that at 7.1%. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $250,000 in taxable net income. Tax: ($100,000 x 5.5%) + ($150,000 x 7.1%) = $16,150.",
    assumptions: `This calculator applies Iowa's published 2-bracket schedule exactly.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Is Iowa still phasing down its corporate rate?", answer: "Iowa has reduced its corporate rate in recent years as part of a multi-year phase-down; check the Iowa Department of Revenue for the latest confirmed rates." }],
  },
  {
    slug: "kansas-corporate-tax-calculator",
    title: "Kansas Corporate Tax Calculator",
    description: "Estimate Kansas's corporate income tax — a flat 4% base plus a 3% surtax on net income above $50,000.",
    metaTitle: "Kansas Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Kansas corporate income tax calculator. 4% base + 3% surtax over $50,000 (effective top rate ~7%).",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Kansas Corporate Tax", { highlight: true })],
    instructions: "Kansas taxes all corporate net income at a flat 4%, then adds a 3% surtax on the portion of net income above $50,000 — for an effective top rate of roughly 7%. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $200,000 in taxable net income. Base: $200,000 x 4% = $8,000. Surtax: $150,000 x 3% = $4,500. Total: $12,500.",
    assumptions: `This calculator applies Kansas's 4% base rate to all income and its 3% surtax only to income above $50,000, as published by the Kansas Department of Revenue.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Is the surtax a separate tax return?", answer: "No — Kansas collects the base tax and the surtax together on the same corporate income tax return." }],
  },
  flatTool("Kentucky", "kentucky-corporate-tax-calculator", 5.0, "", ""),
  flatTool("Louisiana", "louisiana-corporate-tax-calculator", 5.5, "This flat rate reflects Louisiana's 2025 tax reform, which replaced the prior graduated schedule (up to 7.5%) with a single flat rate.", ""),
  {
    slug: "maine-corporate-tax-calculator",
    title: "Maine Corporate Tax Calculator",
    description: "Estimate Maine's graduated corporate income tax — from 3.5% up to 8.93%.",
    metaTitle: "Maine Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Maine corporate income tax calculator. Graduated 3.5%-8.93%.",
    calcInputs: [incomeField({ max: 20_000_000 })],
    calcResults: [currencyResult("totalTax", "Maine Corporate Tax", { highlight: true })],
    instructions: "Maine taxes corporate net income on a graduated schedule that rises from 3.5% up to a top rate of 8.93% for the highest-income corporations. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $1,000,000 in taxable net income. Estimated Maine corporate tax: roughly $58,000.",
    assumptions: `Maine's actual schedule has 4 brackets with specific dollar thresholds. ${GRADUATED_ESTIMATE_NOTE}\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Does this apply to S-corporations too?", answer: "No — this models Maine's tax on C-corporation net income. S-corporations and other pass-through entities are generally taxed differently, at the owner level." }],
  },
  flatTool("Maryland", "maryland-corporate-tax-calculator", 8.25, "", ""),
  {
    slug: "massachusetts-corporate-tax-calculator",
    title: "Massachusetts Corporate Tax Calculator",
    description: "Estimate Massachusetts's corporate excise tax — a flat 8% of net income, with a $456 minimum excise.",
    metaTitle: "Massachusetts Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Massachusetts corporate excise tax calculator. Flat 8%, $456 minimum.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Massachusetts Corporate Excise Tax", { highlight: true })],
    instructions: "Massachusetts's corporate excise tax includes an 8% tax on net income, but every corporation owes at least a $456 minimum excise even in a loss year. Enter your corporation's annual taxable net income to see your estimated tax.",
    examples: "Example: $0 in taxable net income (a loss year). The $456 minimum excise still applies. At $500,000 in net income: $500,000 x 8% = $40,000.",
    assumptions: "This calculator models the net-income component (8%) of Massachusetts's corporate excise tax and its $456 minimum floor; it does not include the separate tangible-property/net-worth measure that also factors into the full excise for some corporations.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is it called an 'excise tax' instead of an income tax?", answer: "Massachusetts has historically labeled this levy a corporate excise tax, but for most corporations its net-income component functions like an ordinary corporate income tax." }],
  },
  flatTool("Michigan", "michigan-corporate-tax-calculator", 6.0, "", ""),
  flatTool("Minnesota", "minnesota-corporate-tax-calculator", 9.8, "This is often called Minnesota's 'franchise tax,' though it functions as an ordinary flat corporate income tax.", ""),
  flatTool("Mississippi", "mississippi-corporate-tax-calculator", 4.0, "", ""),
  flatTool("Missouri", "missouri-corporate-tax-calculator", 4.0, "", ""),
  flatTool("Montana", "montana-corporate-tax-calculator", 6.75, "", ""),
  flatTool("Nebraska", "nebraska-corporate-tax-calculator", 4.55, "", ""),
  {
    slug: "nevada-corporate-tax-calculator",
    title: "Nevada Corporate Tax Calculator",
    description: "Nevada has no corporate income tax — estimate its Commerce Tax instead, which applies only above $4 million in annual Nevada gross revenue.",
    metaTitle: "Nevada Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Nevada Commerce Tax calculator. No corporate income tax; Commerce Tax applies above $4M gross revenue.",
    calcInputs: [currencyField("grossRevenue", "Annual Nevada Gross Revenue", { required: true, default: 0, max: 50_000_000, step: 100_000 })],
    calcResults: [currencyResult("totalTax", "Nevada Commerce Tax", { highlight: true })],
    instructions: "Nevada has no state corporate or personal income tax at all. Instead, businesses with more than $4 million in annual Nevada gross revenue owe the Commerce Tax, at a rate that varies by industry (NAICS sector). Enter your business's annual Nevada gross revenue to see an estimate using the general/default Commerce Tax rate.",
    examples: "Example: $6,000,000 in annual gross revenue. Taxable amount: $2,000,000 (above the $4M exclusion). Estimated Commerce Tax at the general rate: roughly $2,220.",
    assumptions: "Nevada genuinely has no corporate income tax — this tool honestly models the Commerce Tax, its closest state-level business-revenue levy, using the general default rate (0.111%). Actual Commerce Tax rates vary significantly by NAICS industry classification (some sectors are taxed at different rates) — this is a simplified single-rate estimate.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Does every Nevada business owe the Commerce Tax?", answer: "No — only businesses with more than $4 million in Nevada gross revenue in the tax year owe it; smaller businesses owe nothing." }],
  },
  flatTool("New Hampshire", "new-hampshire-corporate-tax-calculator", 7.5, "This is New Hampshire's Business Profits Tax (BPT) — the state's income-tax-like levy on business profits, distinct from its lack of a general personal income tax.", ""),
  {
    slug: "new-jersey-corporate-tax-calculator",
    title: "New Jersey Corporate Tax Calculator",
    description: "Estimate New Jersey's Corporation Business Tax — graduated from 6.5% to 9%, plus a 2.5% Corporate Transit Fee surtax above $10 million (effective top rate 11.5%, highest in the US).",
    metaTitle: "New Jersey Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New Jersey Corporation Business Tax calculator. Graduated 6.5%-9%, plus 2.5% surtax over $10M.",
    calcInputs: [incomeField({ max: 50_000_000 })],
    calcResults: [currencyResult("totalTax", "New Jersey Corporate Tax", { highlight: true })],
    instructions: "New Jersey's Corporation Business Tax is 6.5% on the first $50,000 of allocated net income, 7.5% from $50,000 to $100,000, and 9% above $100,000 — plus an additional 2.5% Corporate Transit Fee surtax on income above $10 million, pushing the effective top rate to 11.5%, the highest combined corporate rate in the US. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $200,000 in taxable net income (below the $10M surtax threshold). Tax: ($50,000 x 6.5%) + ($50,000 x 7.5%) + ($100,000 x 9%) = $16,000.",
    assumptions: "This calculator models New Jersey's confirmed bracket structure plus the Corporate Transit Fee surtax on income above $10 million. The Transit Fee surtax has shifted across recent legislative sessions (it expired once and was reinstated) — verify its current status with the New Jersey Division of Taxation.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is New Jersey's rate the highest in the US?", answer: "New Jersey layers a 2.5% Corporate Transit Fee surtax on top of its already-high 9% top bracket rate for corporations with more than $10 million in allocated net income, producing an effective 11.5% top rate." }],
  },
  flatTool("New Mexico", "new-mexico-corporate-tax-calculator", 5.9, "", ""),
  flatTool("New York", "new-york-corporate-tax-calculator", 6.5, "", ""),
  flatTool("North Carolina", "north-carolina-corporate-tax-calculator", 2.0, "This is the lowest corporate tax rate of any state that has one, and North Carolina has been phasing it down further in recent years.", ""),
  flatTool("North Dakota", "north-dakota-corporate-tax-calculator", 4.31, "", "This reflects North Dakota's confirmed top marginal rate; the state's exact bracket structure below the top rate wasn't independently reconfirmed this session, so this estimate applies the top rate uniformly as a simplification."),
  {
    slug: "ohio-corporate-tax-calculator",
    title: "Ohio Corporate Tax Calculator",
    description: "Ohio has no corporate income tax — estimate its Commercial Activity Tax (CAT) instead, a 0.26% gross-receipts tax above a $6 million exclusion.",
    metaTitle: "Ohio Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Ohio Commercial Activity Tax (CAT) calculator. No corporate income tax; 0.26% on gross receipts above $6M.",
    calcInputs: [currencyField("grossReceipts", "Annual Ohio Gross Receipts", { required: true, default: 0, max: 50_000_000, step: 100_000 })],
    calcResults: [currencyResult("totalTax", "Ohio Commercial Activity Tax", { highlight: true })],
    instructions: "Ohio has no corporate income tax. Instead, most businesses owe the Commercial Activity Tax (CAT) — 0.26% on gross receipts above a $6 million annual exclusion. Enter your business's annual Ohio gross receipts to see your estimated CAT.",
    examples: "Example: $10,000,000 in annual gross receipts. Taxable amount: $4,000,000 (above the $6M exclusion). Estimated CAT: $4,000,000 x 0.26% = $10,400.",
    assumptions: "Ohio genuinely has no corporate income tax — this tool honestly models the CAT, a broad gross-receipts tax, as its closest state-level business-revenue levy.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Does the CAT replace Ohio's old corporate franchise tax?", answer: "Yes — Ohio phased out its corporate franchise tax years ago in favor of the CAT, a tax on gross receipts rather than net income." }],
  },
  flatTool("Oklahoma", "oklahoma-corporate-tax-calculator", 4.0, "", ""),
  {
    slug: "oregon-corporate-tax-calculator",
    title: "Oregon Corporate Tax Calculator",
    description: "Estimate Oregon's Corporate Excise Tax — 6.6% on the first $1 million of net income, 7.6% above that.",
    metaTitle: "Oregon Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Oregon Corporate Excise Tax calculator. 6.6% up to $1M, 7.6% above.",
    calcInputs: [incomeField({ max: 20_000_000 })],
    calcResults: [currencyResult("totalTax", "Oregon Corporate Excise Tax", { highlight: true })],
    instructions: "Oregon's Corporate Excise Tax taxes the first $1,000,000 of net income at 6.6%, and anything above that at 7.6%. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $3,000,000 in taxable net income. Tax: ($1,000,000 x 6.6%) + ($2,000,000 x 7.6%) = $218,000.",
    assumptions: `This calculator applies Oregon's published 2-bracket schedule exactly. Oregon also imposes a separate Corporate Activity Tax (CAT) on gross receipts above $1 million, which is a distinct tax not included here.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Is this the same as Oregon's Corporate Activity Tax (CAT)?", answer: "No — this is Oregon's net-income-based Corporate Excise Tax. Oregon also has a separate gross-receipts Corporate Activity Tax that applies on top for many businesses." }],
  },
  flatTool("Pennsylvania", "pennsylvania-corporate-tax-calculator", 7.49, "Pennsylvania's Corporate Net Income Tax (CNIT) rate is being phased down year by year, reaching 4.99% by 2031.", "This reflects the 2026 rate under Pennsylvania's multi-year phase-down schedule."),
  flatTool("Rhode Island", "rhode-island-corporate-tax-calculator", 7.0, "", ""),
  flatTool("South Carolina", "south-carolina-corporate-tax-calculator", 5.0, "", ""),
  {
    slug: "south-dakota-corporate-tax-calculator",
    title: "South Dakota Corporate Tax Calculator",
    description: "South Dakota has no corporate income tax of any kind — see why your estimated state corporate tax is $0.",
    metaTitle: "South Dakota Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "South Dakota has no corporate income tax. Free calculator confirms your state corporate tax is $0.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "South Dakota Corporate Tax", { highlight: true })],
    instructions: "South Dakota is one of the few states with no corporate income tax of any kind — and no gross-receipts or franchise tax substitute either. Enter your corporation's net income to confirm your South Dakota state corporate tax liability is $0.",
    examples: "Example: $5,000,000 in taxable net income. South Dakota corporate tax owed: $0.",
    assumptions: "South Dakota genuinely has no state-level corporate income tax, franchise tax, or gross-receipts tax substitute — this is not a gap in the calculator, it's an honest reflection of South Dakota law.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Does South Dakota really have no corporate tax at all?", answer: "Correct — South Dakota is one of a small handful of states with no corporate income tax, no franchise tax, and no gross-receipts tax substitute for corporations." }],
  },
  {
    slug: "tennessee-corporate-tax-calculator",
    title: "Tennessee Corporate Tax Calculator",
    description: "Estimate Tennessee's two-part corporate tax: a 6.5% Excise Tax on net income, plus a 0.25% Franchise Tax on net worth ($100 minimum).",
    metaTitle: "Tennessee Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Tennessee corporate tax calculator. 6.5% Excise Tax on income + 0.25% Franchise Tax on net worth.",
    calcInputs: [incomeField(), currencyField("netWorth", "Corporation's Net Worth", { required: true, default: 0, max: 20_000_000, step: 50_000 })],
    calcResults: [currencyResult("exciseTax", "Excise Tax (6.5% of income)"), currencyResult("franchiseTax", "Franchise Tax (0.25% of net worth)"), currencyResult("totalTax", "Total Tennessee Corporate Tax", { highlight: true })],
    instructions: "Tennessee levies two separate state taxes on corporations: a 6.5% Excise Tax on net income, and a 0.25% Franchise Tax on the corporation's net worth (with a $100 minimum). Enter both your taxable net income and your corporation's net worth to see both line items and the total.",
    examples: "Example: $500,000 in net income, $2,000,000 in net worth. Excise Tax: $32,500. Franchise Tax: $5,000. Total: $37,500.",
    assumptions: "This calculator applies Tennessee's 6.5% Excise Tax and 0.25% Franchise Tax (with its $100 minimum) as two independent line items on their respective bases, following the 2024 repeal of the old property-value alternative franchise tax base and its refund program.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does Tennessee tax both income AND net worth?", answer: "Tennessee's Excise Tax (on income) and Franchise Tax (on net worth) are two distinct, independently calculated taxes that together make up the state's corporate tax burden — most corporations owe both." }],
  },
  {
    slug: "texas-corporate-tax-calculator",
    title: "Texas Corporate Tax Calculator",
    description: "Texas has no traditional corporate income tax — estimate its Franchise (Margin) Tax instead: $0 below $2.47 million in revenue, then 0.75% (or 0.375% for retail/wholesale).",
    metaTitle: "Texas Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Texas Franchise (Margin) Tax calculator. No-tax-due under $2.47M revenue; 0.75% standard or 0.375% retail/wholesale above.",
    calcInputs: [currencyField("revenue", "Annual Texas Revenue", { required: true, default: 0, max: 50_000_000, step: 100_000 }), dropdownField("isRetailWholesale", "Business Type", [{ label: "Standard business", value: 0 }, { label: "Retail or wholesale trade", value: 1 }])],
    calcResults: [currencyResult("totalTax", "Texas Franchise (Margin) Tax", { highlight: true })],
    instructions: "Texas has no traditional corporate income tax. Instead, most businesses owe the Franchise Tax (often called the Margin Tax): nothing at all if annual revenue is at or below the No-Tax-Due threshold ($2.47 million), and otherwise 0.75% of revenue for most businesses, or a lower 0.375% for qualifying retail and wholesale trades. Enter your annual Texas revenue and business type to see an estimate.",
    examples: "Example: $5,000,000 in annual revenue, standard business type. Estimated Franchise Tax: $5,000,000 x 0.75% = $37,500.",
    assumptions: "This is a simplified estimate: Texas's actual Margin Tax base is 'taxable margin' (revenue minus a choice of cost-of-goods-sold, compensation, or a flat 30% deduction), not raw revenue — this calculator applies the rate directly to entered revenue as a conservative upper-bound approximation. The No-Tax-Due revenue threshold shown ($2.47 million) is the 2026 indexed figure.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Is this really Texas's 'corporate income tax'?", answer: "Texas has no corporate income tax at all — this models its closest equivalent, the Franchise (Margin) Tax, which is based on a margin/revenue calculation rather than net income." }],
  },
  flatTool("Utah", "utah-corporate-tax-calculator", 4.5, "", ""),
  {
    slug: "vermont-corporate-tax-calculator",
    title: "Vermont Corporate Tax Calculator",
    description: "Estimate Vermont's 3-bracket corporate income tax — 6% up to $10,000, 7% from $10,000 to $25,000, 8.5% above $25,000.",
    metaTitle: "Vermont Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Vermont corporate income tax calculator. 6%/7%/8.5% brackets at $10,000/$25,000.",
    calcInputs: [incomeField({ max: 2_000_000 })],
    calcResults: [currencyResult("totalTax", "Vermont Corporate Tax", { highlight: true })],
    instructions: "Vermont taxes corporate net income across 3 brackets: 6% on the first $10,000, 7% on the next $15,000 (up to $25,000), and 8.5% on anything above $25,000. Enter your corporation's annual taxable net income to see your estimated state tax.",
    examples: "Example: $100,000 in taxable net income. Tax: ($10,000 x 6%) + ($15,000 x 7%) + ($75,000 x 8.5%) = $8,025.",
    assumptions: `This calculator applies Vermont's published 3-bracket schedule exactly.\n\n${GENERAL_DISCLAIMER}`,
    faq: [{ question: "Does Vermont have a minimum corporate tax too?", answer: "Yes — Vermont imposes a small flat minimum tax that varies by entity's Vermont gross receipts, separate from the net-income tax modeled here." }],
  },
  flatTool("Virginia", "virginia-corporate-tax-calculator", 6.0, "", ""),
  {
    slug: "washington-corporate-tax-calculator",
    title: "Washington Corporate Tax Calculator",
    description: "Washington has no corporate income tax — estimate its Business & Occupation (B&O) tax instead, which varies by business classification.",
    metaTitle: "Washington Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Washington B&O tax calculator. No corporate income tax; rate varies by Retailing, Wholesaling/Manufacturing, or Service classification.",
    calcInputs: [currencyField("grossRevenue", "Annual Washington Gross Revenue", { required: true, default: 0, max: 50_000_000, step: 100_000 }), dropdownField("classification", "Business Classification", [{ label: "Retailing", value: 0 }, { label: "Wholesaling / Manufacturing", value: 1 }, { label: "Service & Other", value: 2 }])],
    calcResults: [currencyResult("totalTax", "Washington B&O Tax", { highlight: true })],
    instructions: "Washington has no corporate or personal income tax. Instead, most businesses owe the Business & Occupation (B&O) tax — a gross-receipts tax whose rate depends on business classification: 0.471% for Retailing, 0.484% for Wholesaling/Manufacturing, or a tiered rate for Service & Other businesses (which rises with revenue under the January 2026 reform). Enter your annual Washington gross revenue and classification to see an estimate.",
    examples: "Example: $2,000,000 in annual revenue, Service & Other classification. Estimated B&O tax: $2,000,000 x 1.75% = $35,000.",
    assumptions: "Washington genuinely has no corporate/personal income tax — this tool honestly models the B&O tax, its closest state-level business-revenue levy. The Service & Other tier thresholds shown reflect the January 2026 reform as captured by this tool's research and are a disclosed approximation — verify current tiers with the Washington Department of Revenue.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does the rate depend on what my business does?", answer: "Washington's B&O tax has always varied by business classification (Retailing, Wholesaling, Manufacturing, Service & Other, and several smaller categories) rather than using one flat rate for every business." }],
  },
  flatTool("West Virginia", "west-virginia-corporate-tax-calculator", 6.5, "", ""),
  flatTool("Wisconsin", "wisconsin-corporate-tax-calculator", 7.9, "", ""),
  {
    slug: "wyoming-corporate-tax-calculator",
    title: "Wyoming Corporate Tax Calculator",
    description: "Wyoming has no corporate income tax, franchise tax, or gross-receipts tax of any kind — see why your estimated state corporate tax is $0.",
    metaTitle: "Wyoming Corporate Tax Calculator (2026) — Free & Instant",
    metaDescription: "Wyoming has no corporate income tax. Free calculator confirms your state corporate tax is $0.",
    calcInputs: [incomeField()],
    calcResults: [currencyResult("totalTax", "Wyoming Corporate Tax", { highlight: true })],
    instructions: "Wyoming is one of the very few states with genuinely no state-level business income tax of any kind — no corporate income tax, no franchise tax, and no gross-receipts tax substitute. Enter your corporation's net income to confirm your Wyoming state corporate tax liability is $0.",
    examples: "Example: $5,000,000 in taxable net income. Wyoming corporate tax owed: $0.",
    assumptions: "Wyoming genuinely has no state-level corporate income tax, franchise tax, or gross-receipts tax substitute of any kind — this is not a gap in the calculator, it's an honest reflection of Wyoming law.\n\n" + GENERAL_DISCLAIMER,
    faq: [{ question: "Does Wyoming have any business-level tax at all?", answer: "Wyoming charges a small annual license/registration fee for LLCs and corporations (based on in-state assets), but this is a nominal filing fee, not an income, franchise, or gross-receipts tax." }],
  },
];

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: { name: "Tax & Paycheck Calculators", slug: CATEGORY_SLUG, templateKey: "category-template-1", viewStyle: "grid" },
  });

  for (const t of TOOLS) {
    const toolContent = {
      title: t.title,
      description: t.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(t.calcInputs),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify(t.calcResults),
      instructions: paragraphsToHtml(t.instructions),
      examples: paragraphsToHtml(t.examples),
      assumptions: paragraphsToHtml(t.assumptions),
      faq: JSON.stringify(t.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = { contentType: "tool", metaTitle: t.metaTitle, metaDescription: t.metaDescription, schemaType: "SoftwareApplication" };

    const existing = await prisma.tool.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await prisma.tool.update({ where: { slug: t.slug }, data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } } });
      console.log(`Updated "${t.slug}".`);
    } else {
      await prisma.tool.create({ data: { slug: t.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } } });
      console.log(`Created "${t.slug}" (status: draft).`);
    }
  }

  console.log(`\nDone — ${TOOLS.length} tools created/updated, all status "draft". Review in /admin/tools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
