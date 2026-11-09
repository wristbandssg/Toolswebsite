// Shared helpers for the Science Calculators create-sci-*.ts batch scripts: input builders, the
// mk() spec → ToolDef converter (examples are computed from the engine) and the upsert loop.
// Every tool is created as Published (user, 6 Nov 2026: no tool should stay Draft).

import { PrismaClient, Prisma } from "@prisma/client";
import { type Vals, type Out, type SciCalculator } from "../src/lib/sci-math-core";

export { T } from "../src/lib/sci-math-core";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

export interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; labels?: string[] };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

/** Number input: key, label, default, min, max, step, unit. */
export const num = (key: string, label: string, def: number, min = -1e12, max = 1e12, step = 0.01, unit?: string) => ({ key, label, type: "number", ...(unit ? { unit } : {}), required: true, default: def, min, max, step });
/** Positive number input with a unit: key, label, default, unit, max, step. */
export const pn = (key: string, label: string, def: number, unit?: string, max = 1e12, step = 0.01) => num(key, label, def, 0, max, step, unit);
/** Text input (expressions, number lists, matrices). */
export const tx = (key: string, label: string, def: string) => ({ key, label, type: "text", required: true, default: def });
const opts = (labels: string[]) => labels.map((l, i) => ({ label: l, value: i }));
/** Dropdown with index values. */
export const dd = (key: string, label: string, labels: string[], def = 0) => ({ key, label, type: "dropdown", required: true, default: def, options: opts(labels) });
const FMT = { n: "number", l: "label", t: "text", p: "percentage" } as const;
/** [key, label, format, labels-or-decimals]. */
export type Line = [key: string, label: string, fmt: keyof typeof FMT, extra?: string[] | number];

export interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: SciCalculator; ex: Vals; exText: (o: Out) => string; how: string; assume: string; faq: [string, string][] }

export function mk(s: Spec): ToolDef {
  const o = s.fn(s.ex);
  if (typeof o === "number") throw new Error(`${s.slug}: sci calculators must return a breakdown object`);
  for (const [key] of s.results) if (!(key in o)) throw new Error(`${s.slug}: example output is missing "${key}"`);
  const line = ([key, label, f, extra]: Line, i: number) => ({ key, label, format: FMT[f], ...(Array.isArray(extra) ? { labels: extra } : typeof extra === "number" ? { decimals: extra } : {}), ...(i === 0 ? { highlight: true } : {}) });
  const first = line(s.results[0], 0);
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? s.title).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: first.label, format: first.format, ...("labels" in first ? { labels: first.labels } : {}) },
    calcResults: s.results.map(line),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: s.assume,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

/** Upserts every tool into the category `catSlug` (must already exist). */
export async function upsertTools(catSlug: string, tools: ToolDef[]) {
  const prisma = new PrismaClient();
  try {
    const cat = await prisma.toolCategory.findUnique({ where: { slug: catSlug } });
    if (!cat) throw new Error(`The "${catSlug}" category doesn't exist — run "npx tsx prisma/setup-science-category.ts --apply" first.`);
    let created = 0;
    let updated = 0;
    for (const def of tools) {
      const toolContent = {
        title: def.title,
        description: def.description,
        templateKey: "tool-template-3",
        categoryId: cat.id,
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
      const seoMetaContent = { contentType: "tool", metaTitle: def.metaTitle, metaDescription: def.metaDescription, schemaType: "SoftwareApplication" };
      const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
      if (existing) {
        await prisma.tool.update({ where: { slug: def.slug }, data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } } });
        updated++;
      } else {
        await prisma.tool.create({ data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } } });
        created++;
      }
    }
    console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated in "${cat.name}", all published.`);
  } finally {
    await prisma.$disconnect();
  }
}

/** Runs upsertTools and exits non-zero on failure (call at the bottom of each batch script). */
export function runBatch(catSlug: string, tools: ToolDef[]) {
  // SCI_DRY=1 → only build the definitions (runs every example through the engine), no database.
  if (process.env.SCI_DRY) {
    const slugs = new Set(tools.map((t) => t.slug));
    if (slugs.size !== tools.length) throw new Error("Duplicate slug in batch");
    console.log(`DRY RUN OK: ${tools.length} tool definitions for ${catSlug}`);
    return;
  }
  upsertTools(catSlug, tools).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
