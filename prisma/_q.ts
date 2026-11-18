// usage: tsx prisma/_q.ts group1,group2  -> prints queue slugs (DUP-marked) and live slugs matching keywords in arg3
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async()=>{const q=require("../Claude outputs/New_Tool_Ideas_Build_Queue.json");const all=await db.tool.findMany({select:{slug:true}});const s=new Set(all.map(t=>t.slug));
for(const k of process.argv[2].split(",")) { console.log("\n##",k); console.log(q[k].map((t:any)=>(s.has(t.slug)?"DUP ":"")+t.slug).join(" ")); }
if(process.argv[3]){const re=new RegExp(process.argv[3]);console.log("\nLIVE:", all.map(t=>t.slug).filter(x=>re.test(x)).join(" "));}
await db.$disconnect();})();
