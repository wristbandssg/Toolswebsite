import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
const db = new PrismaClient();
(async () => { const t = await db.tool.findMany({ select: { slug: true, title: true, category: { select: { slug: true } } } });
writeFileSync(process.argv[2], t.map((x) => `${x.slug}\t${x.category?.slug ?? ""}\t${x.title}`).join("\n")); console.log(t.length); await db.$disconnect(); })();
