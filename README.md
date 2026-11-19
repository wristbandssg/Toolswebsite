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
- MongoDB Atlas → Network Access must allow `0.0.0.0/0`.
- Most pages use `export const dynamic = "force-dynamic"`, so builds don't need a live database.
- Back up the database regularly (Atlas export or `mongodump`) — the free tier has no automated backups.
