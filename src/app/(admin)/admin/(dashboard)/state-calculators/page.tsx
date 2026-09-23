import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StateCalculatorsManager from "@/components/admin/StateCalculatorsManager";

export default async function StateCalculatorsPage() {
  const [links, tools] = await Promise.all([
    prisma.stateCalculatorLink.findMany({ orderBy: { order: "asc" } }),
    prisma.tool.findMany({
      where: { status: "published" },
      orderBy: { title: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/tools" className="hover:underline">
          Tools
        </Link>{" "}
        / State Calculators
      </p>
      <h1 className="mt-1 text-2xl font-bold">State Calculators</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manages the &quot;Other state calculators&quot; grid shown on state tax/paycheck tool
        pages. All 50 states are listed by default — link each one to its Tool once that state&apos;s
        calculator is built.
      </p>
      <div className="mt-6">
        <StateCalculatorsManager
          initial={links.map((l) => ({
            id: l.id,
            stateName: l.stateName,
            abbreviation: l.abbreviation,
            toolSlug: l.toolSlug,
            order: l.order,
          }))}
          tools={tools}
        />
      </div>
    </div>
  );
}
