# Calc Platform — Phase 0-3 (MVP)

AI-Powered Calculator & Blog Platform এর Architecture Plan অনুযায়ী তৈরি প্রথম ধাপ।
বিস্তারিত Plan Doc-এ পুরো Roadmap ও Design দেখুন।

## যা এখন কাজ করে (validated end-to-end)

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma + **MongoDB (Atlas)** — schema পুরো Database Design অনুযায়ী (`prisma/schema.prisma`)
- Admin Login (NextAuth, email+password, bcrypt) — `/admin/login`
- Admin Dashboard shell — ১৩টা Section-এর Sidebar
- **Calculator Tool Builder** — Basic Info, Template Select, Input Fields, Formula, Result,
  Content (Instructions/Examples/FAQ) — সব একটা ফর্মে (`/admin/tools/new`, `/admin/tools/[slug]`)
- **৫টা Tool Template** — সব কাজ করছে, Dashboard থেকে Select করা যায়
- Expression-based Calculation Engine (mathjs) — Formula Server-side Evaluate হয়, Client-এ Expose হয় না
- Public Tool Page (`/tools/[slug]`) — Template Registry থেকে সঠিক Template Render করে

## এখনো বাকি (Roadmap অনুযায়ী)

Media Library upload UI, Blog Management, Page Builder, Header/Footer/Mega Menu Builder,
SEO Management, AI Content Planner, Internal Linking, Content Calendar, GSC Integration —
এগুলো পরের Phase-এ (দেখুন প্ল্যান ডকুমেন্টের Section ২০)।

## চালানোর নিয়ম (MongoDB Atlas লাগবে)

প্রথমে [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)-এ একটা Free Cluster বানিয়ে
Connection String নিন (Database Access-এ একটা User বানান, Network Access-এ
`0.0.0.0/0` Allow করুন যাতে Render থেকে Connect করা যায়)।

```bash
npm install
cp .env.example .env      # DATABASE_URL-এ আপনার আসল mongodb+srv://... বসান
npm run db:push           # Schema টা MongoDB-তে Sync করবে (Mongo-তে "migrate" নেই)
npm run db:seed           # Admin User + Sample Tool তৈরি করবে
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin/login
  - Email: `admin@example.com`
  - Password: `ChangeMe123!` (Production-এ অবশ্যই পরিবর্তন করুন)
- Sample Tools: `/tools/percentage-calculator`, `/tools/bmi-calculator`

## MongoDB নিয়ে বিশেষ কিছু কথা

- Relational Database-এর মতো এখানে `npx prisma migrate dev` কাজ করে না। Schema
  পরিবর্তন করলে প্রতিবার `npm run db:push` চালাতে হবে।
- `npm run build`-এ তাই `prisma migrate deploy` নেই, শুধু `prisma generate && next build`।
  তাই Build Step-এ Live Database Connection লাগে না — এটা Render-এর মতো Host-এ Deploy
  করার সময় গুরুত্বপূর্ণ।
- Admin Dashboard-এর সব Page (`/admin/*`) ইচ্ছা করেই "Force Dynamic" রাখা হয়েছে
  (`(dashboard)/layout.tsx`), যাতে Build-এর সময় Prisma Query চালিয়ে Static Page
  বানানোর চেষ্টা না করে — Auth-gated Page-এ Static করার দরকারও নেই।

## নতুন Tool Template যোগ করা

`src/lib/templates/tool/` ফোল্ডারে নতুন Component File বানান, তারপর
`src/lib/templates/registry.ts`-এ `TOOL_TEMPLATES`-এ একটা Entry যোগ করুন — অন্য কোনো
Tool-এর Code পরিবর্তন করা লাগবে না।
