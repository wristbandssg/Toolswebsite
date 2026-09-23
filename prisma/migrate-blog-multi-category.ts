// One-time migration: backfills the new multi-category relation
// (Blog.categoryIds / BlogCategory.blogIds) from the old single
// Blog.categoryId scalar field that this replaces.
//
// WHY THIS EXISTS
// ----------------
// Blog posts could previously only belong to ONE category (`categoryId`).
// The schema now supports many: `categoryIds String[]` on Blog, mirrored by
// `blogIds String[]` on BlogCategory (MongoDB has no join table, so Prisma
// many-to-many relations store the id list on both sides and keeps them in
// sync as long as writes go through the relation field). The OLD
// `categoryId` field was removed from schema.prisma, but the data is still
// sitting in every existing blog document in MongoDB (removing a field from
// the Prisma schema doesn't touch existing documents — Mongo has no
// concept of a schema migration the way SQL does). This script reads that
// leftover field with a raw command (the generated Prisma Client no longer
// knows the field exists, so a normal typed query can't see it) and, for
// every post that had a category, connects it through the new relation —
// which is what correctly populates BOTH sides of the new array pair.
//
// HOW TO RUN
// ----------
//   npx tsx prisma/migrate-blog-multi-category.ts
//
// Safe to run more than once — a post that already has at least one entry
// in categoryIds is left alone (skipped) rather than re-processed.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RawObjectId = { $oid: string } | string;
type RawBlogDoc = {
  _id: RawObjectId;
  categoryId?: RawObjectId | null;
  categoryIds?: unknown;
};
type RawFindResult = {
  cursor?: { firstBatch?: RawBlogDoc[] };
};

function idOf(value: RawObjectId): string {
  return typeof value === "string" ? value : value.$oid;
}

async function main() {
  console.log("Reading existing blog documents (raw) to find the old categoryId field...");
  const result = (await prisma.$runCommandRaw({
    find: "blogs",
    filter: {},
    projection: { categoryId: 1, categoryIds: 1 },
  })) as RawFindResult;
  const docs = result.cursor?.firstBatch ?? [];

  let migrated = 0;
  let skippedAlready = 0;
  let skippedNoCategory = 0;
  let failed = 0;

  for (const doc of docs) {
    const blogId = idOf(doc._id);
    const alreadyMigrated = Array.isArray(doc.categoryIds) && doc.categoryIds.length > 0;
    if (alreadyMigrated) {
      skippedAlready++;
      continue;
    }
    if (!doc.categoryId) {
      skippedNoCategory++;
      continue;
    }
    const oldCategoryId = idOf(doc.categoryId);
    try {
      // Going through the `categories` relation field (not writing
      // categoryIds directly) is what makes Prisma also add this post's id
      // to the matching BlogCategory.blogIds array on the other side.
      await prisma.blog.update({
        where: { id: blogId },
        data: { categories: { connect: { id: oldCategoryId } } },
      });
      migrated++;
      console.log(`- migrated blog ${blogId} -> category ${oldCategoryId}`);
    } catch (err) {
      failed++;
      console.warn(
        `- could not migrate blog ${blogId} (category ${oldCategoryId} may no longer exist):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(
    `\nDone. Migrated ${migrated}, already had categories ${skippedAlready}, had no category ${skippedNoCategory}, failed ${failed}.`
  );
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
