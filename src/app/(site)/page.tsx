import Link from "next/link";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Banknote,
  Bitcoin,
  Briefcase,
  Calculator,
  Car,
  ChartColumn,
  CircleCheck,
  CreditCard,
  GraduationCap,
  House,
  Landmark,
  Percent,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sigma,
  Star,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSiteGeneralSettings } from "@/lib/site-config";
import AdSlot from "@/components/AdSlot";
import ScientificCalculator from "@/components/home/ScientificCalculator";
import ToolSearch from "@/components/home/ToolSearch";

// Home page. Layout inspired by big calculator directories: a hero with a
// working scientific calculator and a search box, then one block per
// category (icon, name, count, a few calculators, "See all"), popular
// calculators, and an about section. Everything below the hero is built
// from the live category tree and published tools, so new categories and
// tools show up here automatically.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteGeneralSettings();
  return {
    title: { absolute: `${settings.siteName} — Free Online Calculators` },
    description: settings.siteDescription,
    alternates: { canonical: "/" },
  };
}

const LINKS_PER_BLOCK = 6;

// Icon and color per category, matched on its slug.
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/crypto|currency|forex/, Bitcoin],
  [/mortgage|home|real-estate|property/, House],
  [/loan/, Landmark],
  [/tax|paycheck/, Receipt],
  [/invest|stock|fund|bond/, TrendingUp],
  [/retire|pension/, PiggyBank],
  [/budget/, Wallet],
  [/insurance/, ShieldCheck],
  [/car|vehicle|auto/, Car],
  [/salary|income|wage/, Briefcase],
  [/credit|debt/, CreditCard],
  [/business/, ChartColumn],
  [/interest|savings/, Percent],
  [/student|education|college/, GraduationCap],
  [/math|algebra|statistic/, Sigma],
  [/finance|money/, Banknote],
];
const COLORS = [
  "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
  "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
  "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300",
  "bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-300",
  "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300",
];

function iconFor(slug: string): LucideIcon {
  return ICON_RULES.find(([re]) => re.test(slug))?.[1] ?? Calculator;
}

type CategoryRow = { id: string; name: string; slug: string; parentId: string | null };

/** All category ids at or below `id`. */
function subtreeIds(id: string, byParent: Map<string, CategoryRow[]>): string[] {
  const out = [id];
  for (const child of byParent.get(id) ?? []) out.push(...subtreeIds(child.id, byParent));
  return out;
}

async function loadHome() {
  const categories: CategoryRow[] = await prisma.toolCategory.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { name: "asc" },
  });
  const byParent = new Map<string, CategoryRow[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  }

  // One block per category directly under a main category (e.g. Loan,
  // Mortgage, Tax under Finance); a main category with no sub-categories
  // gets a block of its own.
  const mains = categories.filter((c) => !c.parentId);
  const blockCategories = mains.flatMap((m) => {
    const children = byParent.get(m.id) ?? [];
    return children.length > 0 ? children.map((c) => ({ ...c, mainName: m.name })) : [{ ...m, mainName: m.name }];
  });

  const blocks = (
    await Promise.all(
      blockCategories.map(async (c) => {
        const ids = subtreeIds(c.id, byParent);
        const where = { status: "published" as const, categoryId: { in: ids } };
        const [toolCount, tools] = await Promise.all([
          prisma.tool.count({ where }),
          prisma.tool.findMany({
            where,
            orderBy: [{ isPopular: "desc" }, { title: "asc" }],
            take: LINKS_PER_BLOCK,
            select: { slug: true, title: true },
          }),
        ]);
        return { ...c, toolCount, tools };
      })
    )
  )
    .filter((b) => b.toolCount > 0)
    .sort((a, b) => b.toolCount - a.toolCount);

  const [popular, totalTools] = await Promise.all([
    prisma.tool.findMany({
      where: { status: "published", isPopular: true },
      orderBy: { title: "asc" },
      take: 12,
      select: { slug: true, title: true, description: true },
    }),
    prisma.tool.count({ where: { status: "published" } }),
  ]);

  return { blocks, popular, totalTools };
}

export default async function HomePage() {
  const [{ blocks, popular, totalTools }, settings] = await Promise.all([loadHome(), getSiteGeneralSettings()]);

  return (
    <div>
      {/* Hero: headline + search on the left, a working scientific calculator on the right. */}
      <section className="bg-gradient-to-b from-indigo-50 to-white px-4 py-12 dark:from-gray-900 dark:to-gray-950 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-300">
              <Zap aria-hidden className="h-3.5 w-3.5" />
              {totalTools.toLocaleString("en-US")} free calculators
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Free Online{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Calculators
              </span>{" "}
              for Every Need
            </h1>
            <p className="mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-300">
              Fast, accurate and easy to use — with clear explanations and examples. No signup required.
            </p>
            <div className="mt-6 max-w-xl">
              <ToolSearch />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {blocks.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/tools/category/${b.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
          <ScientificCalculator />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_top" />
      </div>

      {/* Category blocks. */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Calculators by Category</h2>
            <p className="mt-1 text-sm text-gray-500">Pick a topic to see every calculator in it.</p>
          </div>
          <Link href="/calculators" className="hidden shrink-0 text-sm font-semibold text-indigo-600 hover:underline sm:block">
            All categories →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block, i) => {
            const Icon = iconFor(block.slug);
            return (
              <div
                key={block.id}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <Link href={`/tools/category/${block.slug}`} className="group flex items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${COLORS[i % COLORS.length]}`}>
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">
                      {block.name}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {block.toolCount.toLocaleString("en-US")} calculator{block.toolCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {block.tools.map((tool) => (
                    <li key={tool.slug}>
                      <Link
                        href={`/tools/${tool.slug}`}
                        className="group flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 dark:text-gray-300"
                      >
                        <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-indigo-500" />
                        <span className="truncate">{tool.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {block.toolCount > block.tools.length ? (
                  <Link
                    href={`/tools/category/${block.slug}`}
                    className="mt-4 text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    See all {block.toolCount.toLocaleString("en-US")} →
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {popular.length > 0 ? (
        <section className="bg-gray-50 px-4 py-12 dark:bg-gray-900/40">
          <div className="mx-auto max-w-6xl">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <Star aria-hidden className="h-6 w-6 text-amber-500" />
              Popular Calculators
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {popular.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">{tool.title}</h3>
                  {tool.description ? (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">{tool.description}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* About. */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About {settings.siteName}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              {settings.siteDescription ||
                `${settings.siteName} is your home for free online calculators — loans, mortgages, taxes, investing, budgeting and more.`}
            </p>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Every calculator explains how it works, shows a worked example and lists its assumptions, so you can
              trust the numbers and understand them.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Free to Use", text: "Every calculator is free, with no signup or download." },
              { title: "Accurate", text: "Formulas are checked and kept up to date with current rules." },
              { title: "Clear Breakdowns", text: "See the full result breakdown, not just one number." },
              { title: "Works Everywhere", text: "Fast on phones, tablets and desktops." },
            ].map((f) => (
              <li key={f.title} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                  <CircleCheck aria-hidden className="h-4 w-4 text-emerald-500" />
                  {f.title}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_bottom" />
      </div>
    </div>
  );
}
