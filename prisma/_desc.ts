import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => { for (const s of process.argv[2].split(",")) { const t = await db.tool.findUnique({ where: { slug: s }, select: { slug: true, description: true, calcType: true } }); console.log(t ? `${t.slug} [${t.calcType}]: ${t.description?.slice(0, 160)}` : `${s}: NONE`); } await db.$disconnect(); })();
