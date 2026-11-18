// Idea build, batch conv1 (18 Nov 2026): dedicated two-unit converters (length, area, volume, cooking, mass, temperature, speed,
// pressure, energy, power, data, time, fuel economy, angle, force, density, flow, frequency, radiation), placed in the matching
// existing subcategories. Definitions, sources and skipped duplicate pairs: src/lib/calc-engine-idea-conv1.ts.
// Create-only. Run: npm run db:create-idea-conv1-calculators

import * as E from "../src/lib/calc-engine-idea-conv1";
import { t, num, dd, runIdeas, type ToolDef } from "./idea-kit";

const groups = new Map<string, ToolDef[]>();
for (const c of E.CONVS) {
  const def = t({
    slug: c.slug, fn: c.fn, title: c.title, desc: c.desc,
    in: [num("x", "Value", c.ex, -1e15, 1e15, 0.0001), dd("d", "Direction", [`${c.a.tt} → ${c.b.tt}`, `${c.b.tt} → ${c.a.tt}`], 0), dd("p", "Rounding", ["Auto", "Whole number", "1 decimal", "2 decimals", "3 decimals", "4 decimals", "6 decimals"], 0)],
    r: "r:Result|f:Formula|t:Conversion Table|note:Definitions", ex: { x: c.ex, d: 0, p: 0 }, exd: `${E.nf(c.ex)} ${c.a.pl}`,
    how: c.how, as: `${c.note} Results are rounded for display.`, faq: c.faq,
  });
  groups.set(c.cat, [...(groups.get(c.cat) ?? []), def]);
}

runIdeas([...groups.entries()]).catch((e) => { console.error(e); process.exit(1); });
