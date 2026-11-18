import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const n = await db.tool.count(); console.log("TOTAL", n);
  const cats = await db.toolCategory.findMany({ include: { _count: { select: { tools: true } }, parent: { select: { slug: true } } } });
  for (const c of cats.sort((a, b) => (a.parent?.slug ?? a.slug).localeCompare(b.parent?.slug ?? b.slug))) console.log((c.parent?.slug ?? "-").padEnd(22), c.slug.padEnd(50), c._count.tools);
  await db.$disconnect();
})();
