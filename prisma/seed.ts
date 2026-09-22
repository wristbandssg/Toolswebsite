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

  // Tool category
  const category = await prisma.toolCategory.upsert({
    where: { slug: "finance" },
    update: {},
    create: {
      name: "Finance Calculators",
      slug: "finance",
      templateKey: "category-template-1",
      viewStyle: "grid",
    },
  });

  // Sample tool: Percentage Calculator (Phase 2 end-to-end validation tool,
  // matches the plan doc's own worked example in Section 10).
  await prisma.tool.upsert({
    where: { slug: "percentage-calculator" },
    update: {},
    create: {
      slug: "percentage-calculator",
      title: "Percentage Calculator",
      description: "যেকোনো দুইটা সংখ্যার Percentage সহজে বের করুন।",
      templateKey: "tool-template-1",
      status: "published",
      categoryId: category.id,
      calcType: "expression",
      calcFormula: "(part / whole) * 100",
      calcInputs: JSON.stringify([
        { key: "part", label: "Part", type: "number", required: true },
        { key: "whole", label: "Whole", type: "number", required: true },
      ]),
      calcResult: JSON.stringify({ label: "Percentage", unit: "%", format: "percentage" }),
      instructions:
        "Part এবং Whole সংখ্যা দুটো দিন, তারপর Calculate বাটনে ক্লিক করুন — Part, Whole-এর শতকরা কত তা দেখাবে।",
      examples: "উদাহরণ: Part = 25, Whole = 200 হলে Result হবে 12.5%।",
      faq: JSON.stringify([
        {
          question: "Percentage কীভাবে Calculate হয়?",
          answer: "Formula: (Part ÷ Whole) × 100",
        },
      ]),
      seoMeta: {
        create: {
          contentType: "tool",
          metaTitle: "Percentage Calculator — সহজে Percentage বের করুন",
          metaDescription: "Free Online Percentage Calculator। যেকোনো দুইটা সংখ্যার Percentage সহজে বের করুন।",
          schemaType: "SoftwareApplication",
        },
      },
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
