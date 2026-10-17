// Jobs & Education Calculators (17 Oct 2026, user request: "jobs education
// calculators" is the main category, at most 10 sub-categories; school-specific
// GPA / net price / tuition keywords consolidated; Finance's Salary & Income
// Calculators moves in as the salary & career sub-category):
//   1. Creates the main category and its 9 new sub-categories.
//   2. Moves salary-income-calculators (with its 102 tools) under it and
//      renames it "Salary, Income & Career Calculators".
//
// The category keeps its slug, so public-redirects.ts (rule 3) sends its old
// /finance-calculators/... URLs to the new ones automatically.
//
// HOW TO RUN
//   npx tsx prisma/setup-jobs-education-category.ts            (report only)
//   npx tsx prisma/setup-jobs-education-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const JOBS_EDUCATION_MAIN = { name: "Jobs & Education Calculators", slug: "jobs-education-calculators", breadcrumbName: "Jobs & Education" };

export const JOBS_EDUCATION_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "GPA Calculators", slug: "gpa-calculators" },
  { name: "Grade Calculators", slug: "grade-calculators" },
  { name: "AP Score Calculators", slug: "ap-score-calculators" },
  { name: "SAT, ACT & School Test Calculators", slug: "sat-act-school-test-calculators" },
  { name: "Graduate & Professional Exam Calculators", slug: "graduate-professional-exam-calculators" },
  { name: "International Exam & Admission Points Calculators", slug: "international-exam-points-calculators" },
  { name: "College Admissions Calculators", slug: "college-admissions-calculators" },
  { name: "College Cost & Financial Aid Calculators", slug: "college-cost-financial-aid-calculators" },
  { name: "School Age, Calendar & Classroom Calculators", slug: "school-age-classroom-calculators" },
  { name: "Salary, Income & Career Calculators", slug: "salary-income-calculators" },
];

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: JOBS_EDUCATION_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${JOBS_EDUCATION_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...JOBS_EDUCATION_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  for (const sub of JOBS_EDUCATION_SUBCATEGORIES) {
    const found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    } else if (!main || found.parentId !== main.id || found.name !== sub.name) {
      const n = await prisma.tool.count({ where: { categoryId: found.id } });
      console.log(`${would}move "${found.name}" (${n} tools) under Jobs & Education as "${sub.name}"`);
      if (APPLY) await prisma.toolCategory.update({ where: { id: found.id }, data: { name: sub.name, parentId: main!.id } });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
