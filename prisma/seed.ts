import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
    },
  });

  // Tool category — the sample Percentage Calculator lives under the "Math
  // Calculators" main category (moved out of Finance on 27 Sep 2026, see
  // organize-tool-categories.ts). Finance Calculators and its
  // sub-categories are set up by reparent-tool-categories-under-finance.ts.
  const category = await prisma.toolCategory.upsert({
    where: { slug: "math-calculators" },
    update: {},
    create: {
      name: "Math Calculators",
      slug: "math-calculators",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  // Sample tool: Percentage Calculator (Phase 2 end-to-end validation tool,
  // matches the plan doc's own worked example in Section 10). Its copy was
  // originally written in Bengali; public tool pages are English-only (see
  // AI_RULES.md), so it was rewritten in English on 27 Sep 2026. The upsert
  // applies the copy on UPDATE too, so re-running `npm run db:seed` fixes an
  // existing database — status and category are only set on create, so an
  // admin's choices for those are never overwritten.
  const percentageContent = {
    title: "Percentage Calculator",
    description: "Find what percentage one number is of another — for example, what percent 25 is of 200.",
    calcType: "expression" as const,
    calcFormula: "(part / whole) * 100",
    calcInputs: JSON.stringify([
      { key: "part", label: "Part (the smaller amount)", type: "number", required: true, default: 25 },
      { key: "whole", label: "Whole (the total amount)", type: "number", required: true, default: 200 },
    ]),
    calcResult: JSON.stringify({ label: "Percentage", unit: "%", format: "percentage" }),
    instructions:
      "<p>Enter the part (the amount you want to express as a percentage) and the whole (the total it's part " +
      "of), then press Calculate. The result shows what percentage the part is of the whole.</p>" +
      "<p>For example, use it to find a test score as a percentage, what share of your budget one expense takes " +
      "up, or how much of a goal you've reached so far.</p>",
    examples:
      "<p>Example: if the part is 25 and the whole is 200, the result is 12.5% — 25 is 12.5% of 200.</p>" +
      "<p>Example: scoring 42 out of 50 on a test is 84%.</p>",
    assumptions:
      "<p>Percentage = (part ÷ whole) × 100. The whole can't be 0. If the part is larger than the whole, the " +
      "result is more than 100%.</p>",
    faq: JSON.stringify([
      {
        question: "How do you calculate a percentage?",
        answer: "Divide the part by the whole, then multiply by 100. For example, 25 ÷ 200 = 0.125, and 0.125 × 100 = 12.5%.",
      },
      {
        question: "Can a percentage be more than 100%?",
        answer: "Yes. If the part is bigger than the whole — for example, 250 out of 200 — the result is 125%.",
      },
    ]),
  };
  const percentageSeo = {
    contentType: "tool",
    metaTitle: "Percentage Calculator — Free & Instant",
    metaDescription: "Free percentage calculator. Enter a part and a whole to find what percentage one number is of another, with the formula explained.",
    schemaType: "SoftwareApplication",
  };
  await prisma.tool.upsert({
    where: { slug: "percentage-calculator" },
    update: { ...percentageContent, seoMeta: { upsert: { create: percentageSeo, update: percentageSeo } } },
    create: {
      slug: "percentage-calculator",
      templateKey: "tool-template-1",
      status: "published",
      categoryId: category.id,
      ...percentageContent,
      seoMeta: { create: percentageSeo },
    },
  });

  console.log("Seed complete. Admin login: admin@example.com / ChangeMe123!");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
