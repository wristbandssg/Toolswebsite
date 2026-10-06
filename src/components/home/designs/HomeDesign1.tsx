import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Design1Content } from "@/lib/homepage-config";
import type { HomeSection, HomeTile } from "@/lib/homepage-data";
import { homeIcon } from "@/lib/home-icons";
import AdSlot from "@/components/AdSlot";
import ScientificCalculator from "@/components/home/ScientificCalculator";
import ToolSearch from "@/components/home/ToolSearch";

// Home page Design 1 — "Calculator Hub": centered title, scientific
// calculator and search, a grid of category icon tiles, an About band, one
// block of calculator links per category, and an optional "Featured In"
// logo strip. All text and lists come from the admin (/admin/homepage).

const DEFAULT_ABOUT = (siteName: string) =>
  [
    `${siteName} is your home for free online calculators — loans, mortgages, taxes, investing, budgeting, insurance, crypto and more. Everyone deserves quick, free access to calculations they can trust.`,
    "Every calculator explains how it works, shows a worked example and lists its assumptions, so you understand the result, not just the number. New calculators are added regularly and existing ones are kept up to date with current rules.",
    "If something doesn't look right or you'd like a calculator we don't have yet, let us know.",
  ].join("\n\n");

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
      <section className="px-4 pb-10 pt-8 text-center">
        <h1 className="text-3xl font-bold text-sky-800 dark:text-sky-300 sm:text-4xl">{title}</h1>
        {content.showCalculator ? (
          <div className="mt-6">
            <ScientificCalculator placeholder={content.calculatorPlaceholder} />
          </div>
        ) : null}
        {content.showSearch ? (
          <div className="mx-auto mt-4 max-w-xl text-left">
            <ToolSearch placeholder={content.searchPlaceholder} />
          </div>
        ) : null}
        {exploreText ? <p className="mt-5 text-base text-gray-800 dark:text-gray-200 sm:text-lg">{exploreText}</p> : null}
      </section>

      {/* Category icon tiles */}
      {content.showIconGrid && tiles.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 pb-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {tiles.map((tile) => {
              const Icon = homeIcon(tile.iconKey, tile.slug);
              return (
                <Link
                  key={tile.slug}
                  href={`/tools/category/${tile.slug}`}
                  className="group flex flex-col items-center gap-2 border-gray-200 px-3 py-5 text-center md:border-r md:[&:nth-child(5n)]:border-r-0 dark:border-gray-800"
                >
                  <Icon
                    aria-hidden
                    strokeWidth={1.5}
                    className="h-12 w-12 text-gray-700 transition group-hover:scale-110 group-hover:text-sky-700 dark:text-gray-300"
                  />
                  <span className="text-xs text-gray-600 group-hover:text-sky-700 dark:text-gray-400">{tile.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* About band */}
      {content.showAbout ? (
        <section className="bg-slate-100 px-4 py-10 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-semibold text-sky-800 dark:text-sky-300">
              {content.aboutHeading || `About ${siteName}`}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {aboutParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-5xl px-4">
        <AdSlot placement="category_top" />
      </div>

      {/* Calculator link sections */}
      {content.showSections ? (
        <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
          {sections.map((section) => (
            <section key={section.slug}>
              <h2 className="text-center text-2xl font-semibold text-sky-800 dark:text-sky-300">
                <Link href={`/tools/category/${section.slug}`} className="hover:underline">
                  {section.heading}
                </Link>
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {section.tools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="flex items-center justify-between gap-2 rounded bg-slate-100 px-3 py-2 text-xs text-gray-700 transition hover:bg-sky-50 hover:text-sky-800 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <span className="truncate">{tool.title}</span>
                    <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  </Link>
                ))}
                {section.toolCount > section.tools.length ? (
                  <Link
                    href={`/tools/category/${section.slug}`}
                    className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-sky-300 hover:text-sky-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                  >
                    See More
                    <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  </Link>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {/* Featured In */}
      {content.showFeatured && logos.length > 0 ? (
        <section className="px-4 py-10">
          <h2 className="text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">{content.featuredHeading}</h2>
          <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {logos.map((logo, i) => {
              const inner = logo.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.imageUrl} alt={logo.name} className="h-8 w-auto max-w-[160px] object-contain" />
              ) : (
                <span className="text-lg font-semibold text-gray-500">{logo.name}</span>
              );
              return logo.url ? (
                <a key={i} href={logo.url} target="_blank" rel="noopener noreferrer nofollow">
                  {inner}
                </a>
              ) : (
                <span key={i}>{inner}</span>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-5xl px-4">
        <AdSlot placement="category_bottom" />
      </div>
    </div>
  );
}
