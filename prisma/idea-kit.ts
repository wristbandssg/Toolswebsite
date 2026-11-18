// Shared kit for the 3,000-idea build (Claude outputs/New_Tool_Ideas_3000.md, 16 Nov 2026).
// Wraps trv-tool-kit with a compact tool definition and a CREATE-ONLY writer: a slug that already
// exists in the database is skipped (never overwritten), so a build can't clobber an older tool.
//
// Each batch file: prisma/create-idea-<batch>-calculators.ts + src/lib/calc-engine-idea-<batch>.ts.

import { PrismaClient, type Prisma } from "@prisma/client";
import { mk, type ToolDef, type Line } from "./trv-tool-kit";
import type { TrvCalculator } from "../src/lib/trv-core";

export { num, money, pct, tx, dd, date, T } from "./trv-tool-kit";
export type { ToolDef };

type Vals = Record<string, number>;

/** Compact definition: [question, answer] FAQ pairs; `ex` example inputs; `exd` describes them. */
export interface Q {
  slug: string; title: string; desc: string; meta?: string;
  inputs: Record<string, unknown>[]; results: Line[]; fn: TrvCalculator;
  ex: Vals; exd: string; how: string; assume: string; faq: [string, string][];
}

export function q(d: Q): ToolDef {
  const [k0, l0] = d.results[0];
  return mk({
    slug: d.slug, title: d.title, desc: d.desc, meta: d.meta, inputs: d.inputs, results: d.results, fn: d.fn, ex: d.ex,
    exText: (o) => `Example: ${d.exd} → ${l0}: ${typeof o[k0] === "number" ? Number(o[k0]).toLocaleString("en-US", { maximumFractionDigits: 4 }) : o[k0]}.`,
    how: d.how, assume: d.assume, faq: d.faq,
  });
}

function paragraphsToHtml(text: string): string {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`).join("");
}

/** Creates the tools that don't exist yet in category `catSlug`; existing slugs are reported and skipped. */
export async function createNew(catSlug: string, tools: ToolDef[]) {
  const prisma = new PrismaClient();
  try {
    const cat = await prisma.toolCategory.findUnique({ where: { slug: catSlug } });
    if (!cat) throw new Error(`Category "${catSlug}" doesn't exist — run prisma/setup-ideas-categories.ts --apply first.`);
    let created = 0;
    const skipped: string[] = [];
    for (const def of tools) {
      if (await prisma.tool.findUnique({ where: { slug: def.slug }, select: { id: true } })) { skipped.push(def.slug); continue; }
      const data = {
        title: def.title, description: def.description, templateKey: "tool-template-3", categoryId: cat.id, calcType: "custom", calcFormula: null,
        calcInputs: JSON.stringify(def.calcInputs), calcResult: JSON.stringify(def.calcResult), calcResults: JSON.stringify(def.calcResults),
        instructions: paragraphsToHtml(def.instructions), examples: paragraphsToHtml(def.examples), assumptions: paragraphsToHtml(def.assumptions), faq: JSON.stringify(def.faq),
      } satisfies Prisma.ToolUncheckedUpdateInput;
      await prisma.tool.create({ data: { slug: def.slug, status: "published", ...data, seoMeta: { create: { contentType: "tool", metaTitle: def.metaTitle, metaDescription: def.metaDescription, schemaType: "SoftwareApplication" } } } });
      created++;
    }
    console.log(`${cat.name}: ${created} created${skipped.length ? `, ${skipped.length} skipped (already existed: ${skipped.join(", ")})` : ""}.`);
  } finally {
    await prisma.$disconnect();
  }
}

/** Runs a list of [category, tools] groups; IDEA_DRY=1 only builds definitions (every example runs). */
export async function runIdeas(groups: [string, ToolDef[]][]) {
  const all = groups.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.IDEA_DRY) { console.log(`DRY RUN OK: ${all.length} tools`); return; }
  for (const [cat, tools] of groups) await createNew(cat, tools);
}

/** Extra-compact definition used from batch home3 on: `r` = "key:Label|key2:Label2", `faq` = [q1, a1, q2, a2]. */
export interface TQ {
  slug: string; fn: TrvCalculator; title: string; desc: string; in: Record<string, unknown>[]; r: string;
  ex: Vals; exd?: string; how: string; as: string; faq: string[];
}
export function t(d: TQ): ToolDef {
  const results = d.r.split("|").map((s) => { const [k, l] = s.split(":"); return [k, l, "t"] as Line; });
  const faq: [string, string][] = []; for (let i = 0; i + 1 < d.faq.length; i += 2) faq.push([d.faq[i], d.faq[i + 1]]);
  return q({ slug: d.slug, title: d.title, desc: d.desc, inputs: d.in, results, fn: d.fn, ex: d.ex, exd: d.exd ?? "the default inputs", how: d.how, assume: d.as, faq });
}
