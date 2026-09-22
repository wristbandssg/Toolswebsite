# Calc Platform

AI-Powered Calculator & Blog Platform — Next.js 16 (App Router) + TypeScript + Tailwind CSS,
Prisma on MongoDB Atlas, deployed on Render.

## What's built (Phases 0–11)

- Admin login (NextAuth, email + password, bcrypt), rate-limited against brute force
- Calculator Tool Builder — 5 templates, server-side formula evaluation, FAQ/instructions/examples
- Blog Management — categories, tool↔blog and blog↔blog relations, image upload, rich text editor
- Page Builder — section-based editor (heading/paragraph/image/button/spacer/calculator embed), 2 templates
- Header / Footer / Mega Menu Builder — data-driven site navigation, no redeploy needed to change it
- SEO Management — per-page meta title/description/canonical/og:image/robots, sitemap.xml, robots.txt
- AI Content Planner — rule-based topic suggestions per tool, two-gate approval (approve/reject → generate draft)
- Internal Linking suggestions — scans published content for link opportunities, approve/reject
- Content Calendar — monthly view of scheduled/published posts, backlog of approved-but-unscheduled topics
- Google Search Console integration — optional, see setup below
- Security/performance hardening — see below

## Running locally (needs MongoDB Atlas)

Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), add a Database
User, and under Network Access allow `0.0.0.0/0` (required for Render — or any host — to connect).

```bash
npm install
cp .env.example .env      # fill in your real DATABASE_URL
npm run db:push           # syncs the schema to MongoDB (Mongo has no "migrate")
npm run db:seed           # creates an admin user + one sample tool
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin/login
  - Email: `admin@example.com`
  - Password: `ChangeMe123!` — **change this immediately in production**, see the checklist below
- Sample tool: `/tools/percentage-calculator`

## About MongoDB + Prisma here

- There's no `prisma migrate dev` with the Mongo provider — run `npm run db:push` after any
  schema change.
- `npm run build` only runs `prisma generate && next build` (no `migrate deploy`), so the build
  step never needs a live database connection — important for hosts like Render where the build
  environment may not be able to reach Atlas.
- Nearly every admin and public content page is `export const dynamic = "force-dynamic"` for the
  same reason: static prerendering would need a live DB connection at build time.

## Launch checklist

Before going live (or handing this off), work through this list:

1. **Change the default admin password.** `ChangeMe123!` is public in this repo's seed script —
   log in and change it, or create a new admin user and delete the seeded one.
2. **Environment variables on Render** (Settings → Environment):
   - `DATABASE_URL` — the bare MongoDB connection string, no `DATABASE_URL="..."` wrapper pasted in
   - `NEXTAUTH_SECRET` — a real random value (`openssl rand -base64 32`), not the command itself
   - `NEXTAUTH_URL` — your real production URL (`https://your-app.onrender.com` or a custom domain)
     — sitemap.xml, canonical URLs, and the Search Console OAuth redirect all depend on this being
     correct
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional, only for Search Console (see below)
3. **MongoDB Atlas → Network Access** must allow `0.0.0.0/0`, or Render can't reach the database.
4. **Render free tier notes** — the instance spins down after 15 minutes idle (first request after
   that is slow), and free tier has no shell/SSH access, so schema changes need `db:push` run from
   somewhere that can reach the database (locally, pointed at the production `DATABASE_URL`).
5. **Search Console** (optional) — see `/admin/search-console` in the admin dashboard for the
   one-time Google Cloud Console setup steps. Until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are
   set, that page just shows "not connected" and nothing else is affected.
6. **Back up your data.** MongoDB Atlas free tier doesn't include automated backups — export a
   snapshot periodically (Atlas UI → Collections → Export, or `mongodump`) if the content here
   matters.

## Security/performance hardening (Phase 11)

- Every admin-data API route (`/api/tools`, `/api/blogs`, `/api/pages`, and their `[slug]`
  variants) requires a logged-in session on GET as well as on writes — none of them leak
  draft/unpublished content to anonymous requests.
- Image uploads are restricted to JPEG/PNG/WebP/GIF (SVG is excluded — it can carry embedded
  script content) and capped at 4MB.
- The admin login is rate-limited (5 attempts per email per 15 minutes) against brute-force/
  credential-stuffing.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security`) are set on every response; the
  `X-Powered-By` header is disabled.
- `/api/health` is a fast, database-free endpoint for uptime monitoring.
