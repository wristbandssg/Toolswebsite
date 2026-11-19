import { readFileSync } from "fs";
const live = readFileSync(process.argv[2], "utf8").split("\n").map((l) => l.split("\t")[0]);
const cand = readFileSync(process.argv[3], "utf8").split(/\s+/).filter(Boolean);
const stop = new Set(["calculator", "of", "the", "a", "and", "to", "from", "for", "with", "area", "volume", "form", "number", "checker", "line", "lines", "two"]);
for (const c of cand) {
  const ex = live.includes(`${c}-calculator`) ? "EXACT" : "";
  const w = c.split("-").filter((x) => !stop.has(x) && x.length > 2);
  const hits = live.filter((s) => w.length && w.every((x) => s.includes(x))).slice(0, 5);
  console.log(`${ex.padEnd(5)} ${c.padEnd(34)} ${hits.join(" ")}`);
}
