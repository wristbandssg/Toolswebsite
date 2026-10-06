import Link from "next/link";
import type { Design2Content, D2Chip } from "@/lib/homepage-config";
import type { D2Blog, D2CategoryCard, D2Guide, D2PopularTool } from "@/lib/homepage-data";
import BlogCard from "@/components/home/BlogCard";
import BlogSlider from "@/components/home/BlogSlider";

// Home page Design 2 — "Category Showcase" (modelled on allcalculatortools.com).
// Every heading, text, list and toggle comes from the admin (/admin/homepage →
// Design 2); categories, calculators and blogs come from the live database.

const CONTAINER = "mx-auto max-w-6xl px-4";

// Card color themes, cycled by position.
const THEMES = [
  { border: "border-blue-100 dark:border-blue-900/50", iconBg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-400" },
  { border: "border-emerald-100 dark:border-emerald-900/50", iconBg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-400" },
  { border: "border-amber-100 dark:border-amber-900/50", iconBg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-400" },
  { border: "border-violet-100 dark:border-violet-900/50", iconBg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-400" },
  { border: "border-cyan-100 dark:border-cyan-900/50", iconBg: "bg-cyan-50 dark:bg-cyan-950", text: "text-cyan-700 dark:text-cyan-400" },
  { border: "border-pink-100 dark:border-pink-900/50", iconBg: "bg-pink-50 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-400" },
  { border: "border-rose-100 dark:border-rose-900/50", iconBg: "bg-rose-50 dark:bg-rose-950", text: "text-rose-700 dark:text-rose-400" },
];
const theme = (i: number) => THEMES[i % THEMES.length];

const CHIP_CLASSES: Record<D2Chip["color"], string> = {
  green: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  blue: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  gray: "border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
  amber: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  purple: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300",
};

// Rich-text columns: bold headings, arrow bullet rows with dividers.
const INFO_CLASSES =
  "text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 [&_a]:font-medium [&_a]:text-blue-700 [&_a:hover]:underline [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-gray-900 sm:[&_h2]:text-3xl dark:[&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-900 dark:[&_h3]:text-white [&_li]:relative [&_li]:border-b [&_li]:border-gray-200 [&_li]:py-2.5 [&_li]:pl-6 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:font-bold [&_li]:before:text-blue-600 [&_li]:before:content-['→'] dark:[&_li]:border-gray-800 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_ul]:list-none";

function SectionHeader({ eyebrow, heading, text }: { eyebrow: string; heading: string; text?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-400">{eyebrow}</p> : null}
      {heading ? (
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">{heading}</h2>
      ) : null}
      {text ? <p className="mt-3 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg dark:text-gray-400">{text}</p> : null}
    </div>
  );
}

/** The built-in hero picture: floating calculator cards around a bar chart (shown when no image is uploaded). */
function HeroIllustration() {
  const bars = [
    ["h-16", "from-blue-500 to-blue-700"],
    ["h-10", "from-emerald-400 to-emerald-600"],
    ["h-20", "from-amber-300 to-amber-500"],
    ["h-12", "from-violet-400 to-violet-600"],
    ["h-8", "from-cyan-300 to-cyan-500"],
    ["h-14", "from-indigo-300 to-indigo-500"],
  ];
  return (
    <div aria-hidden className="relative mx-auto aspect-[5/4] w-full max-w-md select-none">
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-violet-950/30" />
      <div className="absolute -right-6 top-6 h-40 w-40 rounded-full bg-blue-200/40 blur-2xl dark:bg-blue-800/20" />
      {/* Main chart card */}
      <div className="absolute left-[14%] top-[16%] w-[52%] rounded-2xl border-t-4 border-blue-600 bg-white p-4 shadow-xl shadow-blue-900/10 dark:bg-gray-900">
        <div className="h-2 w-2/3 rounded-full bg-blue-100 dark:bg-blue-900">
          <div className="h-2 w-1/2 rounded-full bg-blue-600" />
        </div>
        <div className="mt-4 flex h-20 items-end justify-between gap-1.5">
          {bars.map(([h, g], i) => (
            <div key={i} className={`${h} w-full rounded-t bg-gradient-to-t ${g}`} />
          ))}
        </div>
        <div className="mt-3 flex gap-1.5 text-[9px] font-semibold">
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Tools</span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Free</span>
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">No Sign-Up</span>
        </div>
      </div>
      {/* Compound interest card */}
      <div className="absolute right-[6%] top-[12%] w-[38%] rounded-2xl border-t-4 border-indigo-500 bg-white p-3 shadow-lg shadow-indigo-900/10 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900" />
          <span className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="mt-3 rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
          <p className="text-[8px] text-gray-400">Compound Interest</p>
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400">$12,486.40</p>
        </div>
      </div>
      {/* Loan card */}
      <div className="absolute bottom-[14%] left-[4%] w-[36%] rounded-2xl border-t-4 border-emerald-500 bg-white p-3 shadow-lg shadow-emerald-900/10 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900" />
          <span className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900">
          <div className="h-1.5 w-3/4 rounded-full bg-emerald-500" />
        </div>
        <p className="mt-2 text-center text-[8px] text-gray-400">Monthly Payment</p>
        <p className="text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">$1,264 / mo</p>
      </div>
      {/* Savings card */}
      <div className="absolute bottom-[8%] right-[8%] w-[40%] rounded-2xl border-t-4 border-rose-500 bg-white p-3 shadow-lg shadow-rose-900/10 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-900" />
          <span className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="h-2.5 rounded-sm bg-rose-200 dark:bg-rose-900" />
          ))}
        </div>
        <p className="mt-2 text-center text-[9px] font-bold text-rose-600 dark:text-rose-400">Savings Goal: 82%</p>
      </div>
      {/* Formula pills */}
      <span className="absolute left-[6%] top-[8%] rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-blue-700 shadow dark:bg-gray-900">A = P(1+r)ⁿ</span>
      <span className="absolute right-[4%] top-[52%] rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-emerald-700 shadow dark:bg-gray-900">ROI = gain ÷ cost</span>
    </div>
  );
}

export default function HomeDesign2({
  content: c,
  siteName,
  totalTools,
  categoryCards,
  popularTools,
  guides,
  blogs,
}: {
  content: Design2Content;
  siteName: string;
  totalTools: number;
  categoryCards: D2CategoryCard[];
  popularTools: D2PopularTool[];
  guides: D2Guide[];
  blogs: D2Blog[];
}) {
  const fill = (text: string) =>
    text.replace(/\{siteName\}/g, siteName).replace(/\{count\}/g, totalTools.toLocaleString("en-US"));
  const faqs = c.faqs.filter((f) => f.question.trim() && f.answer.trim());
  const faqJsonLd =
    c.showFaq && faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: fill(f.question),
            acceptedAnswer: { "@type": "Answer", text: fill(f.answer) },
          })),
        }
      : null;

  return (
    <div className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Hero */}
      <section className={`${CONTAINER} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20`}>
        <div>
          {c.heroBadge ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              {fill(c.heroBadge)}
            </span>
          ) : null}
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {c.heroTitleLine1 ? <span className="block">{fill(c.heroTitleLine1)}</span> : null}
            {c.heroTitleHighlight ? <span className="block text-blue-700 dark:text-blue-400">{fill(c.heroTitleHighlight)}</span> : null}
            {c.heroTitleLine3 ? <span className="block">{fill(c.heroTitleLine3)}</span> : null}
          </h1>
          {c.heroText ? (
            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg dark:text-gray-400">{fill(c.heroText)}</p>
          ) : null}
          {c.heroChips.some((chip) => chip.text) ? (
            <div className="mt-7 flex flex-wrap gap-2.5">
              {c.heroChips
                .filter((chip) => chip.text)
                .map((chip, i) => (
                  <span key={i} className={`rounded-full border px-3 py-1 text-[13px] font-medium ${CHIP_CLASSES[chip.color]}`}>
                    ✓ {fill(chip.text)}
                  </span>
                ))}
            </div>
          ) : null}
        </div>
        <div>
          {c.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.heroImageUrl} alt="" className="mx-auto w-full max-w-md rounded-3xl object-contain" />
          ) : (
            <HeroIllustration />
          )}
        </div>
      </section>

      {/* Feature row */}
      {c.showFeatures && c.features.length > 0 ? (
        <section className={`${CONTAINER} pb-12 sm:pb-16`}>
          <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-gray-200 dark:lg:divide-gray-800">
            {c.features.map((f, i) => (
              <div key={i} className="px-6 py-2 text-center">
                {f.icon ? <div className="text-3xl">{f.icon}</div> : null}
                <h3 className="mt-3 text-base font-bold">{fill(f.title)}</h3>
                <p className="mx-auto mt-1.5 max-w-[16rem] text-sm leading-relaxed text-gray-600 dark:text-gray-400">{fill(f.text)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Category cards */}
      {c.showCategories && categoryCards.length > 0 ? (
        <section className={`${CONTAINER} py-12 sm:py-16`}>
          <SectionHeader eyebrow={fill(c.categoriesEyebrow)} heading={fill(c.categoriesHeading)} text={fill(c.categoriesText)} />
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categoryCards.map((card, i) => {
              const t = theme(i);
              return (
                <Link
                  key={card.slug}
                  href={`/tools/category/${card.slug}`}
                  className={`group flex flex-col rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-gray-900 ${t.border}`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${t.iconBg}`}>{card.icon}</span>
                  <h3 className="mt-5 text-lg font-bold">{card.title}</h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{card.description}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                    <span className={`text-sm font-semibold ${t.text}`}>{fill(c.categoriesLinkText)}</span>
                    <span aria-hidden className="text-gray-700 transition group-hover:translate-x-1 dark:text-gray-300">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Popular calculators */}
      {c.showPopular && popularTools.length > 0 ? (
        <section className={`${CONTAINER} py-12 sm:py-16`}>
          <SectionHeader eyebrow={fill(c.popularEyebrow)} heading={fill(c.popularHeading)} text={fill(c.popularText)} />
          <div className="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {popularTools.map((tool, i) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${theme(i).iconBg}`}>{tool.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-400">{tool.title}</span>
                  {tool.categoryName ? <span className="block truncate text-xs text-gray-500">{tool.categoryName}</span> : null}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 3 steps */}
      {c.showSteps && c.steps.length > 0 ? (
        <section className={`${CONTAINER} py-12 sm:py-16`}>
          <SectionHeader eyebrow={fill(c.stepsEyebrow)} heading={fill(c.stepsHeading)} />
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {c.steps.map((step, i) => (
              <div key={i} className="relative rounded-3xl border border-gray-200 bg-white p-7 dark:border-gray-800 dark:bg-gray-900">
                <span aria-hidden className="absolute right-6 top-5 text-5xl font-extrabold text-gray-100 dark:text-gray-800">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step.icon ? (
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl dark:bg-blue-950">{step.icon}</span>
                ) : null}
                <h3 className="relative mt-6 text-lg font-bold">{fill(step.title)}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{fill(step.text)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Two rich-text columns */}
      {c.showInfo && (c.infoLeftHtml.trim() || c.infoRightHtml.trim()) ? (
        <section className={`${CONTAINER} grid grid-cols-1 gap-12 py-12 sm:py-16 lg:grid-cols-2`}>
          {c.infoLeftHtml.trim() ? <div className={INFO_CLASSES} dangerouslySetInnerHTML={{ __html: fill(c.infoLeftHtml) }} /> : null}
          {c.infoRightHtml.trim() ? <div className={INFO_CLASSES} dangerouslySetInnerHTML={{ __html: fill(c.infoRightHtml) }} /> : null}
        </section>
      ) : null}

      {/* Category guides */}
      {c.showGuides && guides.length > 0 ? (
        <section className={`${CONTAINER} py-12 sm:py-16`}>
          <SectionHeader eyebrow={fill(c.guidesEyebrow)} heading={fill(c.guidesHeading)} text={fill(c.guidesText)} />
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <div key={g.slug} className="flex flex-col rounded-3xl border border-gray-200 bg-white p-7 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span aria-hidden>{g.icon}</span>
                  {g.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{g.text}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {g.tools.map((tool) => (
                    <li key={tool.slug} className="flex gap-2">
                      <span aria-hidden className="text-blue-600">·</span>
                      <Link href={`/tools/${tool.slug}`} className="text-gray-700 hover:text-blue-700 hover:underline dark:text-gray-300 dark:hover:text-blue-400">
                        {tool.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`/tools/category/${g.slug}`} className="mt-5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400">
                  {fill(c.guidesLinkText).replace(/\{name\}/g, g.name)}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Use cases + keyword box */}
      {c.showUseCases && (c.useCases.length > 0 || c.keywordsText) ? (
        <section className={`${CONTAINER} py-12 sm:py-16`}>
          <SectionHeader eyebrow={fill(c.useCasesEyebrow)} heading={fill(c.useCasesHeading)} text={fill(c.useCasesText)} />
          {c.useCases.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.useCases.map((u, i) => (
                <div key={i} className="rounded-3xl border border-gray-200 bg-white p-7 dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    {u.icon ? <span aria-hidden>{u.icon}</span> : null}
                    {fill(u.title)}
                  </h3>
                  {u.text ? <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{fill(u.text)}</p> : null}
                  {u.bullets.length > 0 ? (
                    <ul className="mt-4 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                      {u.bullets.map((b, j) => (
                        <li key={j} className="flex gap-2">
                          <span aria-hidden className="text-blue-600">·</span>
                          {fill(b)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {c.keywordsText ? (
            <p className="mt-6 rounded-2xl border border-blue-100 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-gray-600 dark:border-blue-950 dark:bg-gray-900 dark:text-gray-400">
              {c.keywordsLabel ? <strong className="text-gray-900 dark:text-white">{fill(c.keywordsLabel)} </strong> : null}
              {fill(c.keywordsText)}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* FAQ */}
      {c.showFaq && faqs.length > 0 ? (
        <section className={`${CONTAINER} grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14`}>
          {/* Heading on the left (stays in view on wide screens), questions as an accordion on the right. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeader eyebrow={fill(c.faqEyebrow)} heading={fill(c.faqHeading)} text={fill(c.faqText)} />
            <div aria-hidden className="mt-8 hidden h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 text-5xl lg:flex dark:from-blue-950 dark:to-indigo-950">
              💬
            </div>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                open={i === 0}
                className="group rounded-2xl border border-gray-200 bg-white transition open:border-blue-200 open:bg-blue-50/40 open:shadow-sm hover:border-blue-200 dark:border-gray-800 dark:bg-gray-900 dark:open:border-blue-900 dark:open:bg-blue-950/20"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700 group-open:bg-blue-600 group-open:text-white dark:bg-blue-950 dark:text-blue-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="flex-1 text-[15px] font-semibold text-gray-900 sm:text-base dark:text-white">{fill(f.question)}</h3>
                  <span
                    aria-hidden
                    className="relative h-5 w-5 shrink-0 text-blue-700 before:absolute before:left-0 before:top-1/2 before:h-0.5 before:w-5 before:-translate-y-1/2 before:rounded before:bg-current after:absolute after:left-1/2 after:top-0 after:h-5 after:w-0.5 after:-translate-x-1/2 after:rounded after:bg-current after:transition-transform group-open:after:scale-y-0 dark:text-blue-400"
                  />
                </summary>
                <p className="px-5 pb-5 pl-[4.25rem] text-sm leading-relaxed text-gray-600 sm:px-6 sm:pl-[4.5rem] dark:text-gray-400">{fill(f.answer)}</p>
              </details>
            ))}
          </div>
          {faqJsonLd ? (
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
          ) : null}
        </section>
      ) : null}

      {/* Blogs — a slider or a grid (admin's choice); every card has the same shape. */}
      {c.showBlogs && blogs.length > 0 ? (
        <section className={`${CONTAINER} py-12 sm:py-16`}>
          {c.blogsHeading ? (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold uppercase tracking-wide text-blue-700 dark:text-blue-400">{fill(c.blogsHeading)}</h2>
              <span aria-hidden className="mx-auto mt-3 block h-1 w-14 rounded-full bg-blue-600" />
            </div>
          ) : null}
          <div className="mt-10">
            {c.blogLayout === "slider" ? (
              <BlogSlider blogs={blogs} buttonText={fill(c.blogButtonText)} autoplay={c.blogAutoplay} />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {blogs.map((b) => (
                  <BlogCard key={b.slug} blog={b} buttonText={fill(c.blogButtonText)} />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
