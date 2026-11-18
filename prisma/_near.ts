import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const q = require("C:/Users/agent/Downloads/calc-platform/Claude outputs/New_Tool_Ideas_Build_Queue.json");
  const all = (await db.tool.findMany({ select: { slug: true } })).map((t) => t.slug);
  const stop = new Set(["calculator", "solver", "checker", "finder", "generator", "of", "the", "a", "and", "to", "from", "for", "with", "test", "value", "values", "formula", "number", "steps", "kids"]);
  for (const k of process.argv[2].split(",")) for (const t of q[k]) {
    const w = t.slug.split("-").filter((x: string) => !stop.has(x) && x.length > 2);
    const hits = all.filter((s) => s !== t.slug && w.length && w.every((x: string) => s.includes(x))).slice(0, 6);
    console.log((hits.length ? "?? " : "   ") + t.slug + (hits.length ? "  <- " + hits.join(" ") : ""));
  }
  await db.$disconnect();
})();
