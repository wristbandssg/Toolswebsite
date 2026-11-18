import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => { const q = require("../Claude outputs/New_Tool_Ideas_Build_Queue.json"); const s = new Set((await db.tool.findMany({ select: { slug: true } })).map((t) => t.slug)); let tot = 0;
for (const k of Object.keys(q)) { const left = q[k].filter((t: { slug: string }) => !s.has(t.slug)); tot += left.length; if (left.length) console.log(k.padEnd(48), left.length, "/", q[k].length); }
console.log("TOTAL not built:", tot); await db.$disconnect(); })();
