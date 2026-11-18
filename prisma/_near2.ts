import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const q = require("../Claude outputs/New_Tool_Ideas_Build_Queue.json");
  const all = (await db.tool.findMany({ select: { slug: true } })).map((t) => t.slug);
  const stop = new Set(["calculator", "physics", "of", "the", "a", "and", "to", "from", "for", "with", "law", "s", "effect", "rule", "value", "energy", "calc", "level", "levels", "time", "rate", "per"]);
  for (const k of process.argv[2].split(",")) for (const t of q[k]) {
    const w = t.slug.split("-").filter((x: string) => !stop.has(x) && x.length > 3);
    const sc = all.filter((s) => s !== t.slug).map((s) => [s, w.filter((x: string) => s.includes(x)).length] as [string, number]).filter((x) => x[1] >= Math.min(2, w.length)).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(t.slug.padEnd(48) + " | " + sc.map((x) => x[0]).join(" "));
  }
  await db.$disconnect();
})();
