import * as E from "../src/lib/calc-engine-idea-conv2";
import { readFileSync } from "fs";
const live = new Set(readFileSync(process.argv[2], "utf8").split("\n").map((l) => l.split("\t")[0]));
const lit = [...readFileSync("prisma/create-idea-conv2-calculators.ts", "utf8").matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const all = [...E.CONVS2.map((c) => c.slug), ...Object.keys(E.baseCalcs), ...lit];
console.log("count", all.length, "unique", new Set(all).size, "existing:", all.filter((s) => live.has(s)).join(",") || "none");
let bad = 0;
for (const c of E.CONVS2) for (const d of [0, 1]) { try { const o = c.fn({ x: c.ex, d, p: 0 } as never); if (/NaN|undefined/.test(JSON.stringify(o))) { bad++; console.log("BAD", c.slug, JSON.stringify(o)); } } catch (e) { bad++; console.log("ERR", c.slug, (e as Error).message); } }
for (const s of ["psi-to-kg-cm2-converter", "cents-to-square-feet-converter", "points-to-pixels-converter", "bond-paper-lb-to-gsm-converter", "bond-paper-lb-to-text-paper-lb-converter", "sticks-of-butter-to-grams-converter", "gauss-to-tesla-converter", "milliamp-hours-to-coulombs-converter"]) { const c = E.CONVS2.find((x) => x.slug === s); console.log(s, c ? JSON.stringify(c.fn({ x: c.ex, d: 0, p: 0 } as never)).slice(0, 150) : "MISSING"); }
for (const [k, f] of Object.entries(E.baseCalcs)) console.log(k, JSON.stringify(f({ x: k.startsWith("binary") ? "101101" : k.startsWith("hex") ? "FF" : k.startsWith("octal") ? "755" : "255" } as never)).slice(0, 120));
console.log("bad", bad);
