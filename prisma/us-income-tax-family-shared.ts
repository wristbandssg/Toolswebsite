// Shared helpers for Batch 10 of the state-tax-audit build-out (the
// "income-tax-derived family" — 14 SEO-angle variants x the 41 states with
// a personal income tax = 574 tools). Each of the 14
// create-us-<variant>-calculators.ts seed scripts imports from here rather
// than re-declaring the same category/field/upsert boilerplate 14 times —
// unlike the audit's other 9 batches (each its own fully self-contained
// category), these 14 files are genuinely one family built on the same
// state rate table, so a shared base module is the right call here.
//
// See src/lib/calc-engine-us-income-tax-rates.ts for the rate table and
// the simplified-representative-rate approach (an explicit user decision,
// 27 Sep 2026) this whole family is built on.

import { PrismaClient, Prisma } from "@prisma/client";
import { STATE_INCOME_TAX_RATES, type StateIncomeTaxRate } from "../src/lib/calc-engine-us-income-tax-rates";

export { STATE_INCOME_TAX_RATES };
export type { StateIncomeTaxRate };

export const CATEGORY_SLUG = "tax-paycheck-calculators";

export function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("");
}

export function currencyField(key: string, label: string, opts: { required?: boolean; default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1_000_000, step: opts.step ?? 1_000 };
}
export function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}
export function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}
export function percentageResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "percentage", highlight: opts.highlight };
}

export const RATE_METHOD_DISCLAIMER =
  "This uses a SIMPLIFIED REPRESENTATIVE RATE for the state's income tax: its confirmed flat rate, or (for a " +
  "graduated state) its confirmed top marginal bracket rate approximated as rising smoothly from a low starting " +
  "rate up to that top rate by $250,000 of income. This is not an exact bracket-by-bracket lookup — for that, " +
  "see this site's full state paycheck calculator for the same state.";

export const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. It covers STATE income tax only — federal income tax, FICA/self-employment tax, and any local " +
  "(city/county) income tax are separate and not included here. Check with a CPA or your state's department of " +
  "revenue for your exact figure.";

export interface ToolDef {
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

const prisma = new PrismaClient();

export async function upsertTools(tools: ToolDef[]) {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: { name: "Tax & Paycheck Calculators", slug: CATEGORY_SLUG, templateKey: "category-template-1", viewStyle: "grid" },
  });

  for (const t of tools) {
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

  console.log(`\nDone — ${tools.length} tools created/updated, all status "draft". Review in /admin/tools.`);
  await prisma.$disconnect();
}

export function runMain(tools: ToolDef[]) {
  upsertTools(tools).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
