# Calc Platform

Calculator and blog website — Next.js 16 (App Router) + TypeScript + Tailwind CSS, Prisma on MongoDB Atlas, deployed on Render.

## Running locally

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npm run db:push           # syncs prisma/schema.prisma to MongoDB
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin/login

## Where things live

| Path | What it is |
|---|---|
| `src/app/(site)/` | Public pages: home, `/calculators/`, `/blog/`, authors, and `[first]/[second]/[third]` for category, calculator and page URLs |
| `src/app/(admin)/admin/` | Admin dashboard (login required — enforced in `src/proxy.ts`) |
| `src/app/api/` | API routes used by the admin and by calculators (`/api/tools/[slug]/calculate`) |
| `src/lib/calc-engine.ts` | Runs every calculator; merges the `calc-engine-*.ts` files (start here for calculator code) |
| `src/lib/views/` | Loads a tool, category or page from the database and picks its template |
| `src/lib/templates/` | The page layouts (tool, blog, page templates) |
| `src/lib/urls.ts` | Builds every public URL; `public-redirects.ts` + `src/proxy.ts` handle 301s |
| `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts` | SEO meta, sitemap and robots.txt |
| `src/lib/ai-writer.ts`, `src/app/api/ai-writer/` | "Write with AI" button on the tool and blog edit forms: the writing rules, the Claude call and the quick QC checks (needs `ANTHROPIC_API_KEY`) |
| `src/components/` | Shared UI; `components/admin/` is admin-only |
| `prisma/schema.prisma` | Database models (MongoDB) |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate && next build` (no database needed at build time) |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:push` | Push schema changes to MongoDB (Mongo has no `prisma migrate`) |

## Deploying on Render

- Environment variables: `DATABASE_URL` (bare connection string), `NEXTAUTH_SECRET` (random value), `NEXTAUTH_URL` (production URL — sitemap and canonical URLs depend on it).
- `NEXTAUTH_URL` must be the exact live address, e.g. `https://www.example.com` (https, and with or without `www` as you want it in Google). Pages asked for on any other host (the other www form, `*.onrender.com`) get a 301 to it (`src/proxy.ts`).
- Health check path: `/api/health`.
- MongoDB Atlas → Network Access must allow `0.0.0.0/0`.
- Most pages use `export const dynamic = "force-dynamic"`, so builds don't need a live database.
- Back up the database regularly (Atlas export or `mongodump`) — the free tier has no automated backups.
