// One-time repair script for the `seo_meta` collection's unique indexes.
//
// WHY THIS EXISTS
// ----------------
// SeoMeta is one shared "polymorphic" collection used for Tool, Blog, Page,
// and (as of this change) BlogCategory SEO settings. Each row only fills in
// ONE of `toolId` / `blogId` / `pageId` / `categoryId` and leaves the other
// three unset. Those four fields are each marked `@unique` in schema.prisma
// so Prisma can treat them as proper one-to-one relations.
//
// On MongoDB, a *plain* unique index treats "field is absent" the same as
// "field is null" for uniqueness purposes — so if more than one row leaves
// (say) `blogId` unset, MongoDB sees that as two rows with the same
// `blogId` value and rejects the second insert with a duplicate-key error.
// That is exactly the "Unique constraint failed on the constraint:
// `seo_meta_blogId_key`" error seen when saving a category's SEO settings:
// it's not actually about `categoryId` at all, it's the *other* rows in the
// collection (tool/blog/page SeoMeta rows) colliding on the FK field they
// don't use.
//
// The fix is to make each of these four indexes SPARSE, so MongoDB simply
// excludes any row that doesn't have that field set from the uniqueness
// check. `npx prisma db push` does not reliably flip an *existing* index
// from non-sparse to sparse, so this script inspects the real indexes on
// the live database and rebuilds any that need it.
//
// HOW TO RUN
// ----------
//   npx tsx prisma/fix-seo-indexes.ts
//
// It's safe to run more than once — indexes that are already sparse are
// left untouched.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FK_FIELDS = ["toolId", "blogId", "pageId", "categoryId"] as const;
const COLLECTION = "seo_meta";

type RawIndex = {
  name: string;
  key: Record<string, number>;
  unique?: boolean;
  sparse?: boolean;
};

type ListIndexesResult = {
  cursor?: { firstBatch?: RawIndex[] };
};

type CommandResult = { ok?: number };

async function main() {
  console.log(`Inspecting indexes on "${COLLECTION}"...`);
  const listResult = (await prisma.$runCommandRaw({
    listIndexes: COLLECTION,
  })) as ListIndexesResult;
  const indexes = listResult.cursor?.firstBatch ?? [];

  for (const field of FK_FIELDS) {
    // Find any index whose key is exactly { [field]: 1 } (Prisma always
    // creates single-field indexes this way for a scalar @unique field).
    const existing = indexes.find(
      (idx) => Object.keys(idx.key).length === 1 && field in idx.key
    );

    if (!existing) {
      console.log(`- ${field}: no index found yet, creating a sparse unique index...`);
      await prisma.$runCommandRaw({
        createIndexes: COLLECTION,
        indexes: [
          {
            key: { [field]: 1 },
            name: `seo_meta_${field}_key`,
            unique: true,
            sparse: true,
          },
        ],
      });
      console.log(`  done.`);
      continue;
    }

    if (existing.unique && existing.sparse) {
      console.log(`- ${field}: index "${existing.name}" is already unique + sparse. Skipping.`);
      continue;
    }

    console.log(
      `- ${field}: index "${existing.name}" is unique=${existing.unique ?? false} sparse=${existing.sparse ?? false} — rebuilding as sparse...`
    );

    const dropResult = (await prisma.$runCommandRaw({
      dropIndexes: COLLECTION,
      index: existing.name,
    })) as CommandResult;
    if (dropResult.ok !== 1) {
      console.warn(`  could not drop "${existing.name}":`, dropResult);
      continue;
    }

    await prisma.$runCommandRaw({
      createIndexes: COLLECTION,
      indexes: [
        {
          key: { [field]: 1 },
          name: existing.name,
          unique: true,
          sparse: true,
        },
      ],
    });
    console.log(`  rebuilt "${existing.name}" as a sparse unique index.`);
  }

  console.log("\nDone. Try saving a category's SEO settings again.");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
