import Link from "next/link";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import type { Design1Content } from "@/lib/homepage-config";
import type { HomeSection, HomeTile } from "@/lib/homepage-data";
import { homeIcon } from "@/lib/home-icons";
import AdSlot from "@/components/AdSlot";
import ScientificCalculator from "@/components/home/ScientificCalculator";
import ToolSearch from "@/components/home/ToolSearch";

// Home page Design 1 — "Calculator Hub": title, a full-width scientific
// calculator, search, category tiles, an About band, one block of calculator
// links per category, and an optional "Featured In" logo strip. All text and
// lists come from the admin (/admin/homepage). Layout is mobile-first: every
// grid steps up from 1–2 columns on phones to its full width on desktop.

const DEFAULT_ABOUT = (siteName: string) =>
  [
    `${siteName} is your home for free online calculators — loans, mortgages, taxes, investing, budgeting, insurance, crypto and more. Everyone deserves quick, free access to calculations they can trust.`,
    "Every calculator explains how it works, shows a worked example and lists its assumptions, so you understand the result, not just the number. New calculators are added regularly and existing ones are kept up to date with current rules.",
    "If something doesn't look right or you'd like a calculator we don't have yet, let us know.",
  ].join("\n\n");

// Soft color per tile, cycled.
const TILE_COLORS = [
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
];

export default function HomeDesign1({
  content,
  siteName,
  tiles,
  sections,
  totalTools,
}: {
  content: Design1Content;
  siteName: string;
  tiles: HomeTile[];
  sections: HomeSection[];
  totalTools: number;
}) {
  const title = content.title || siteName;
  const exploreText = content.exploreText.replace(/\{count\}/g, totalTools.toLocaleString("en-US"));
  const aboutParagraphs = (content.aboutText.trim() || DEFAULT_ABOUT(siteName))
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const logos = content.featuredLogos.filter((l) => l.imageUrl || l.name);

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white px-4 pb-14 pt-10 dark:from-slate-900 dark:via-gray-950 dark:to-gray-950 sm:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/20"
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-sky-700 via-sky-600 to-indigo-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              {title}
            </h1>
            {content.subtitle ? (
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
                {content.subtitle}
              </p>
            ) : null}
          </div>

          {content.showCalculator ? (
            <div className="mt-8 sm:mt-10">
              <ScientificCalculator placeholder={content.calculatorPlaceholder} />
            </div>
          ) : null}

          {content.showSearch || exploreText ? (
            <div className="mt-12 text-center sm:mt-16">
              {content.showSearch ? <ToolSearch placeholder={content.searchPlaceholder} /> : null}
              {exploreText ? (
                <p className="mt-5 text-base font-medium text-slate-700 dark:text-slate-200 sm:text-lg">
                  <Sparkles aria-hidden className="mr-1.5 inline h-5 w-5 align-[-4px] text-amber-500" />
                  {exploreText}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Category tiles */}
      {content.showIconGrid && tiles.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-2">
          {/* Flex-wrap (not grid) so a short last row — or only a few tiles — stays centered. */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {tiles.map((tile, i) => {
              const Icon = homeIcon(tile.iconKey, tile.slug);
              return (
                <Link
                  key={tile.slug}
                  href={`/tools/category/${tile.slug}`}
                  className="group flex basis-[calc(50%-0.375rem)] flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-5 sm:basis-[calc(33.333%-0.667rem)] md:basis-[calc(25%-0.75rem)] lg:basis-[calc(20%-0.8rem)] text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-900 dark:hover:shadow-none"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl transition duration-200 group-hover:scale-110 ${
                      TILE_COLORS[i % TILE_COLORS.length]
                    }`}
                  >
                    <Icon aria-hidden strokeWidth={1.75} className="h-7 w-7" />
                  </span>
                  <span className="text-sm font-semibold leading-snug text-slate-800 group-hover:text-sky-700 dark:text-slate-100">
                    {tile.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {tile.toolCount.toLocaleString("en-US")} calculator{tile.toolCount === 1 ? "" : "s"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* About band */}
      {content.showAbout ? (
        <section className="bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-14 dark:from-slate-900 dark:to-slate-900">
          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {content.aboutHeading || `About ${siteName}`}
            </h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              {aboutParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_top" />
      </div>

      {/* Calculator link sections */}
      {content.showSections && sections.length > 0 ? (
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-14">
          {sections.map((section) => (
            <section key={section.slug}>
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  <Link href={`/tools/category/${section.slug}`} className="hover:text-sky-700">
                    {section.heading}
                  </Link>
                </h2>
                <Link
                  href={`/tools/category/${section.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-sky-400"
                >
                  View all {section.toolCount.toLocaleString("en-US")}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {section.tools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{tool.title}</span>
                    <ChevronRight
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-600"
                    />
                  </Link>
                ))}
                {section.toolCount > section.tools.length ? (
                  <Link
                    href={`/tools/category/${section.slug}`}
                    className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    See More
                    <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                  </Link>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {/* Featured In */}
      {content.showFeatured && logos.length > 0 ? (
        <section className="border-t border-slate-100 bg-slate-50/60 px-4 py-14 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
            {content.featuredHeading}
          </h2>
          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 items-center gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {logos.map((logo, i) => {
              const inner = logo.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo.imageUrl}
                  alt={logo.name}
                  className="mx-auto h-9 w-auto max-w-[150px] object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              ) : (
                <span className="block text-center text-lg font-bold text-slate-400 transition hover:text-slate-700">
                  {logo.name}
                </span>
              );
              return logo.url ? (
                <a key={i} href={logo.url} target="_blank" rel="noopener noreferrer nofollow" className="block">
                  {inner}
                </a>
              ) : (
                <div key={i}>{inner}</div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_bottom" />
      </div>
    </div>
  );
}
