import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => { const re = new RegExp(process.argv[2]); const all = await db.tool.findMany({ select: { slug: true } }); console.log(all.map((t) => t.slug).filter((s) => re.test(s)).join(" ")); await db.$disconnect(); })();
