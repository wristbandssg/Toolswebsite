# SEO_CHECKLIST.md — Checking this site for SEO errors

*Read `AI_RULES.md` and `PROJECT_NOTES.md` first.*

This project has no live database access from the AI's cloud sandbox (see
`AI_RULES.md`), so an SEO check has two parts: things an AI can check directly by
reading the code in this repo, and things that need a real script run against the live
database. Both are covered below.

## Part 1 — Live-data checks: run `prisma/seo-audit.ts`

This is a real, ready-to-run script (not just a checklist) — it connects to the actual
database and checks every **published** Tool, Blog, and Page for common on-page SEO
problems.

**How to run it** (needs a real `DATABASE_URL` — the user runs this, same as any other
`db:*` script):

```bash
npm run db:seo-audit
```

**What it checks:**

| Check | Severity |
|---|---|
| Missing meta title | Error |
| Meta title over ~60 characters (Google truncates it in search results) | Error |
| Meta title under ~15 characters | Warning |
| Missing meta description | Error |
| Meta description over ~160 characters (Google truncates it) | Error |
| Meta description under ~50 characters | Warning |
| Duplicate meta title reused across more than one published page | Error |
| Duplicate meta description reused across more than one published page | Error |
| Tool missing a structured-data `schemaType` (expected `SoftwareApplication`) | Warning |
| Missing canonical URL | Warning |

It prints a plain-text report grouped into Errors (fix these first) and Warnings (worth
reviewing), each line naming the exact tool/blog/page slug so it's easy to open in
`/admin` and fix. It makes no changes — it's read-only.

**When to run it:** any time the user asks "check SEO" or "any SEO errors?", and as a
matter of course after finishing a large batch of new tools (a good habit, not
mandatory) — SEO fields are typed manually per tool in each `create-*-calculators.ts`
file, so a duplicate meta title/description across tools is the most likely mistake to
slip through unnoticed.

## Part 2 — Code-level checks an AI can do directly (no DB needed)

When asked to check SEO and a live DB run isn't practical (or as a companion to Part 1),
review these directly in the repo:

1. **`src/app/sitemap.ts`** — confirms it only lists `status: "published"` content, and
   respects `seoMeta.robotsIndex`. If this logic ever changes, make sure draft or
   noindex'd content still can't leak into the sitemap.
2. **`src/app/robots.ts`** — confirms `/admin` and `/api` stay disallowed, and the
   sitemap URL is correct. Watch for accidentally disallowing `/tools` or `/blog`.
3. **Every new `prisma/create-*-calculators.ts` file, at the time it's written** —
   confirm every tool definition has a non-empty `metaTitle` and `metaDescription`
   within the length ranges in the table above, and `schemaType: "SoftwareApplication"`
   in its `seoMetaContent`. Catching this at write-time is cheaper than catching it
   later with the audit script.
4. **Heading structure / template markup** (`src/lib/templates/tool`,
   `src/lib/templates/blog`, `src/lib/templates/page`) — each page template should
   render exactly one `<h1>`. Don't introduce a second one when adding new sections.
5. **Image `alt` text** — any new `<img>` added to a template or page section should
   have a meaningful `alt`, not a blank string or the filename.
6. **`getSiteUrl()` / `NEXTAUTH_URL`** — canonical URLs and sitemap entries are built
   from this. If it's ever wrong in production, every canonical URL and sitemap entry
   is wrong too — this is an environment-variable problem, not a code problem (see the
   launch checklist in `README.md`).

## Known limitations of the audit script

- It only checks **published** content — drafts are excluded on purpose, matching what
  actually gets indexed.
- It doesn't check for broken internal links, thin/duplicate body content, or page
  load speed — those would need either a full site crawl or the existing "Internal
  Linking suggestions" admin feature, which already covers link-opportunity scanning.
- Duplicate-title/description detection is exact-match (case-insensitive, trimmed) —
  it won't catch two descriptions that are merely very similar, only identical ones.
