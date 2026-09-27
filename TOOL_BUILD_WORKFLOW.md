# TOOL_BUILD_WORKFLOW.md — Building new calculator tools from just a keyword

*Read `AI_RULES.md` and `PROJECT_NOTES.md` first.*

This is the standing process for adding new calculator tools. Per the user's
instruction: once this file exists, **the user will only give a keyword, a topic name,
or an uploaded list of tool names — nothing else.** Do not ask them to confirm
categories, duplicates, or sub-batch splits partway through. Do the whole pipeline
below yourself, then report what was found and built **at the end, in one go**,
together with the deploy command.

## Input the user will give you

Any of:
- A single keyword/topic (e.g. "Interest Calculators", "Alabama tax calculators")
- A spreadsheet/list of tool names (e.g. `Some_Topic_Tool_List.xlsx`)
- Just "continue" / "do this one too, the same way" referring to a file already uploaded

If it's just a topic with no list attached, research the standard, well-known
calculators for that topic yourself (the way a topical SEO content plan would) before
proceeding — don't ask the user to enumerate them.

## The pipeline (run all of this before saying anything back)

1. **Get the candidate tool list.** From the upload, or from your own research if only a
   keyword was given.

2. **Duplicate-check against the whole existing repo — not a stale snapshot.** For each
   candidate tool, slugify its name and check it against:
   - Every `slug:` value already defined across all `prisma/create-*.ts` files in this
     repo (`grep -rho 'slug: "[a-z0-9-]*"' prisma/create-*.ts | sort -u` is a fast way to
     pull the full existing list).
   - Any tools you are building or have built earlier in the *same* session that aren't
     committed to a `create-*.ts` file yet.
   A tool whose exact slug already exists is a duplicate — skip building it, but still
   report it as skipped at the end.

3. **Relevancy-check.** Drop any candidate that isn't a genuine, useful calculator for
   the stated topic (e.g. a name that's clearly off-topic or too vague to build). Note
   anything dropped this way in the final report too.

4. **Confirm (don't ask about) the category.** Grep
   `prisma/reparent-tool-categories-under-finance.ts` (or wherever the current category
   taxonomy lives — check `prisma/schema.prisma`'s `ToolCategory` model and existing
   `reparent-*`/`setup-*-categories.ts` scripts if that file has moved) for a
   category/subcategory slug matching the topic. If one already exists, use it. If none
   exists, create it following the same pattern as the existing category-setup
   scripts — don't stop to ask unless the right category is genuinely ambiguous between
   two very different existing categories.

5. **Split into sub-batches of about 10–11 tools each**, grouped so that tools within a
   batch are conceptually related. Deliberately differentiate any near-namesake tools
   (e.g. two calculators with very similar titles) with genuinely distinct formulas,
   input shapes, or output framing — document the distinction in a code comment at the
   top of each such tool. This is the single most common way near-duplicate tools slip
   through; take it seriously every time, not just when it's obviously risky.

6. **Design and verify formulas before writing any TypeScript.** For every non-trivial
   formula, work it out and check it independently first (e.g. a quick Python script
   with hand-computed expected values) — don't trust a formula until you've confirmed
   the numbers against an independent calculation.

7. **Build each sub-batch as a fully self-contained pair of files**, matching the
   existing convention:
   - `src/lib/calc-engine-<batch>.ts` — its own `safeNumber`/`round2` helpers, its own
     math, no imports from any other batch's file, one named export per calculator plus
     one `Record<string, CustomCalculator>` registry export named
     `<batchName>CustomCalculators`.
   - `prisma/create-<batch>-calculators.ts` — its own `paragraphsToHtml`/
     `currencyField`/`percentField`/`numberField` helpers, its own `ToolDef` interface,
     its own `TOOLS` array with full copy (title, description, meta title/description,
     inputs, results, instructions, examples, assumptions, FAQ), its own `main()`
     upsert loop, matching the shape of any existing `create-*-calculators.ts` file.

8. **Wire the batch in:**
   - Add an import + registry-spread line to `src/lib/calc-engine.ts`.
   - Add a `"db:create-<batch>-calculators": "tsx prisma/create-<batch>-calculators.ts"`
     line to `package.json`.

9. **Run the full verification cycle, in order, for every batch — none of these are
   optional:**
   1. `npx tsc --noEmit -p tsconfig.json` — must be clean.
   2. Write a temporary `scratch-verify-<batch>.ts` at the repo root with `check(label,
      actual, expected, tolerance)` assertions for every calculator, run it with `npx
      tsx scratch-verify-<batch>.ts`, confirm every check passes, then delete the
      scratch file.
   3. `npm run lint` — must be clean.
   4. `npm run build` — must show "Compiled successfully", and `/` and `/admin/login`
      must remain statically prerendered (`○` in the build output).

10. **Deliver each batch** by staging the changed files under
    `/mnt/user-data/outputs/<batch>/` (mirroring their repo-relative paths), committing
    them into the user's connected project folder, then removing the staging directory.
    Never deliver as a zip download.

11. **Repeat steps 5–10 for each sub-batch** until the whole candidate list is built.

## What to report, and when

Say nothing to the user until the entire pipeline above is finished for every
sub-batch. Then, in one message, report:
- The category/subcategory used (and whether it was new or already existed).
- How many tools were skipped as duplicates (with their names) and how many were
  dropped as not relevant, if any.
- How many tools were built, split by sub-batch, with a one-line description of each
  sub-batch's theme.
- The combined deploy command: `git add`/`commit`/`push` (with the **full commit
  message text written out**, describing what was built) chained with every new
  `npm run db:create-*` script for this set of batches — as ONE copy-paste block, per
  the standing rule in `AI_RULES.md`.

Also update `PROJECT_NOTES.md`'s "Resume here" and session log with what was built, as
part of finishing the work — not as a separate step the user has to ask for.
