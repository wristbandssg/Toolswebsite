import Link from "next/link";
import type { Design3Content } from "@/lib/homepage-config";
import type { D2Blog } from "@/lib/homepage-data";
import type { D3CategoryCard, D3Country, D3HubItem, D3Link, D3ToolCard } from "@/lib/homepage-data-design3";
import ToolSearch from "@/components/home/ToolSearch";
import { blogUrl } from "@/lib/urls";

// Home page Design 3 — "Clean Library" (built from the admin's own HTML
// mockup). Every heading, text, list and toggle comes from the admin
// (/admin/homepage → Design 3); calculators, categories, countries and guides
// come from the live database. The site header/footer are the shared ones
// from the Header / Footer Builder.

const WRAP = "mx-auto w-full max-w-[1220px] px-4 sm:px-5";
const SECTION = "py-14 sm:py-20";
const CARD =
  "rounded-[20px] border border-[#e5e9f1] bg-white shadow-[0_3px_18px_rgba(16,24,40,.025)] dark:border-gray-800 dark:bg-gray-900";
const LIFT = "transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(16,24,40,.08)]";
const ICON =
  "grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-[#eef2ff] text-[21px] dark:bg-indigo-950/60";

function Head({
  heading,
  text,
  link,
  dark = false,
  center = false,
}: {
  heading: string;
  text?: string;
  link?: D3Link | null;
  dark?: boolean;
  center?: boolean;
}) {
  if (!heading && !text && !link) return null;
  return (
    <div className={`mb-7 gap-5 sm:flex sm:items-end ${center ? "text-center sm:justify-center" : "sm:justify-between"}`}>
      <div>
        {heading ? <h2 className="text-[28px] font-extrabold tracking-[-1.2px] sm:text-[33px]">{heading}</h2> : null}
        {text ? (
          <p className={`mt-1 text-sm ${dark ? "text-[#98a2b3]" : "text-[#667085] dark:text-gray-400"}`}>{text}</p>
        ) : null}
      </div>
      {link && link.text ? (
        <Link
          href={link.href}
          className={`mt-2.5 inline-block whitespace-nowrap text-[13px] font-extrabold sm:mt-0 ${
            dark ? "text-[#bdc8ff] hover:text-white" : "text-[#3b5bfd] hover:underline dark:text-indigo-400"
          }`}
        >
          {link.text}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Windows doesn't draw flag emoji (it shows two letters), so a flag emoji is
 * turned into its country code and shown as a small image instead. Anything
 * else the admin typed (another emoji, text) is shown as it is.
 */
function Flag({ flag }: { flag: string }) {
  const points = [...flag.trim()].map((ch) => ch.codePointAt(0) ?? 0);
  const isFlag = points.length === 2 && points.every((p) => p >= 0x1f1e6 && p <= 0x1f1ff);
  if (!isFlag) return flag ? <span aria-hidden>{flag}</span> : null;
  const code = points.map((p) => String.fromCharCode(p - 0x1f1e6 + 97)).join("");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt=""
      width={20}
      height={15}
      loading="lazy"
      className="h-[15px] w-5 rounded-[2px] object-cover shadow-sm"
    />
  );
}

function ToolCard({ tool, linkText }: { tool: D3ToolCard; linkText: string }) {
  return (
    <Link href={tool.href} className={`${CARD} ${LIFT} block p-[21px]`}>
      <div className="flex justify-between gap-2">
        <span className={ICON} aria-hidden>
          {tool.icon}
        </span>
        {tool.badge ? (
          <span className="h-fit rounded-full bg-[#ecfdf3] px-2 py-1 text-[10px] font-extrabold text-[#079455] dark:bg-emerald-950 dark:text-emerald-300">
            {tool.badge}
          </span>
        ) : null}
      </div>
      <h3 className="mt-[15px] text-base font-bold text-[#101828] dark:text-white">{tool.title}</h3>
      {tool.description ? (
        <p className="mt-1 line-clamp-2 text-[12.5px] text-[#667085] dark:text-gray-400">{tool.description}</p>
      ) : null}
      {linkText ? <span className="mt-3.5 block text-xs font-extrabold text-[#3b5bfd] dark:text-indigo-400">{linkText}</span> : null}
    </Link>
  );
}

export default function HomeDesign3({
  content: c,
  siteName,
  totalTools,
  categoryCount,
  chips,
  popularTools,
  trendingTools,
  categoryCards,
  hubButtonHref,
  hubItems,
  countries,
  guides,
}: {
  content: Design3Content;
  siteName: string;
  totalTools: number;
  categoryCount: number;
  chips: D3Link[];
  popularTools: D3ToolCard[];
  trendingTools: D3ToolCard[];
  categoryCards: D3CategoryCard[];
  hubButtonHref: string;
  hubItems: D3HubItem[];
  countries: D3Country[];
  guides: D2Blog[];
}) {
  const fill = (text: string) =>
    text
      .replace(/\{siteName\}/g, siteName)
      .replace(/\{count\}/g, totalTools.toLocaleString("en-US"))
      .replace(/\{categoryCount\}/g, categoryCount.toLocaleString("en-US"));
  const link = (l: { text: string; url: string }, fallback = "/calculators/"): D3Link | null =>
    l.text ? { text: fill(l.text), href: l.url || fallback } : null;

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
  const stats = c.heroStats.filter((s) => s.value.trim() || s.label.trim());
  const columns = c.columns.filter((col) => col.title.trim() || col.text.trim());
  const steps = c.steps.filter((s) => s.title.trim());
  const trust = c.trustItems.filter((t) => t.title.trim());

  return (
    <div className="bg-[#f6f8fc] leading-relaxed text-[#101828] dark:bg-gray-950 dark:text-gray-100">
      {/* Hero */}
      <section className="bg-white bg-[radial-gradient(circle_at_8%_15%,#e9edff_0,transparent_28%),radial-gradient(circle_at_92%_15%,#e9f9f2_0,transparent_25%)] py-16 text-center sm:pb-[78px] sm:pt-[92px] dark:bg-gray-950 dark:bg-[radial-gradient(circle_at_8%_15%,rgba(59,91,253,.18)_0,transparent_28%),radial-gradient(circle_at_92%_15%,rgba(18,183,106,.12)_0,transparent_25%)]">
        <div className={WRAP}>
          {c.heroBadge ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe2ff] bg-[#eef2ff] px-3.5 py-2 text-xs font-extrabold text-[#3b5bfd] dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[#12b76a]" />
              {fill(c.heroBadge)}
            </span>
          ) : null}
          <h1 className="mx-auto my-5 max-w-[920px] text-[42px] font-extrabold leading-[1.02] tracking-[-2.2px] sm:text-6xl sm:tracking-[-4px] lg:text-[76px]">
            {c.heroTitleLine1 ? <span className="block">{fill(c.heroTitleLine1)}</span> : null}
            {c.heroTitleLine2 ? (
              <span className="block bg-gradient-to-r from-[#3b5bfd] to-[#7957ff] bg-clip-text text-transparent">
                {fill(c.heroTitleLine2)}
              </span>
            ) : null}
          </h1>
          {c.heroText ? (
            <p className="mx-auto mb-8 max-w-[720px] text-[15px] text-[#667085] sm:text-lg dark:text-gray-400">{fill(c.heroText)}</p>
          ) : null}
          {c.showSearch ? (
            <div className="mx-auto max-w-[800px] text-left">
              <ToolSearch placeholder={fill(c.searchPlaceholder)} buttonText={fill(c.searchButtonText)} />
            </div>
          ) : null}
          {chips.length > 0 ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.href + chip.text}
                  href={chip.href}
                  className="rounded-[9px] border border-[#e5e9f1] bg-[#f5f7fb] px-[11px] py-[7px] text-xs text-[#475467] transition hover:border-[#3b5bfd] hover:text-[#3b5bfd] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  {fill(chip.text)}
                </Link>
              ))}
            </div>
          ) : null}
          {stats.length > 0 ? (
            <div className="mt-10 flex flex-wrap justify-center gap-x-[70px] gap-y-5">
              {stats.map((s, i) => (
                <div key={i}>
                  <strong className="block text-[25px] font-extrabold">{fill(s.value)}</strong>
                  <small className="text-sm text-[#667085] dark:text-gray-400">{fill(s.label)}</small>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Popular calculators */}
      {c.showPopular && popularTools.length > 0 ? (
        <section className={SECTION}>
          <div className={WRAP}>
            <Head heading={fill(c.popularHeading)} text={fill(c.popularText)} link={link(c.popularLink)} />
            <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
              {popularTools.map((t) => (
                <ToolCard key={t.slug} tool={t} linkText={fill(c.popularCardLinkText)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Categories (dark) */}
      {c.showCategories && categoryCards.length > 0 ? (
        <section className={`${SECTION} bg-[#101828] text-white`}>
          <div className={WRAP}>
            <Head heading={fill(c.categoriesHeading)} text={fill(c.categoriesText)} link={link(c.categoriesLink)} dark />
            <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
              {categoryCards.map((cat) => (
                <Link
                  key={cat.slug}
                  href={cat.href}
                  className={`${CARD} ${LIFT} block p-[22px] text-[#101828] dark:text-white`}
                >
                  <span className={ICON} aria-hidden>
                    {cat.icon}
                  </span>
                  <h3 className="mt-[15px] text-base font-bold">{cat.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-[#667085] dark:text-gray-400">{cat.description}</p>
                  {c.categoryCountText ? (
                    <span className="mt-[13px] block text-[11px] font-extrabold text-[#3b5bfd] dark:text-indigo-400">
                      {fill(c.categoryCountText).replace(/\{n\}/g, cat.toolCount.toLocaleString("en-US"))}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Featured hub */}
      {c.showHub ? (
        <section className={SECTION}>
          <div className={WRAP}>
            <Head heading={fill(c.hubHeading)} text={fill(c.hubText)} />
            <div className={`grid gap-[18px] ${hubItems.length > 0 ? "lg:grid-cols-[1.1fr_.9fr]" : ""}`}>
              <div className="min-h-[310px] rounded-[20px] bg-gradient-to-br from-[#172554] to-[#3047d0] p-7 text-white sm:p-9">
                {c.hubEyebrow ? (
                  <small className="text-xs font-black tracking-[1px] text-[#c7d2fe]">{fill(c.hubEyebrow)}</small>
                ) : null}
                {c.hubTitle ? (
                  <h3 className="my-3 max-w-[560px] text-[27px] font-extrabold leading-tight tracking-[-1px] sm:text-[32px]">
                    {fill(c.hubTitle)}
                  </h3>
                ) : null}
                {c.hubBody ? <p className="max-w-[560px] text-sm text-[#d8def2]">{fill(c.hubBody)}</p> : null}
                {c.hubButton.text ? (
                  <Link
                    href={hubButtonHref}
                    className="mt-6 inline-block rounded-[10px] bg-white px-4 py-[11px] text-[13px] font-black text-[#2441c6] transition hover:bg-[#eef2ff]"
                  >
                    {fill(c.hubButton.text)}
                  </Link>
                ) : null}
              </div>
              {hubItems.length > 0 ? (
                <div className="grid gap-3.5">
                  {hubItems.map((item, i) => (
                    <Link key={i} href={item.href} className={`${CARD} ${LIFT} block p-[23px]`}>
                      <h3 className="text-[17px] font-bold">{fill(item.title)} →</h3>
                      {item.text ? (
                        <p className="mt-1 line-clamp-2 text-[12.5px] text-[#667085] dark:text-gray-400">{fill(item.text)}</p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* What can you calculate? */}
      {c.showColumns && columns.length > 0 ? (
        <section className={`${SECTION} bg-white dark:bg-gray-900/40`}>
          <div className={WRAP}>
            <Head heading={fill(c.columnsHeading)} text={fill(c.columnsText)} />
            <div className="grid gap-[18px] lg:grid-cols-2">
              {columns.map((col, i) => (
                <div key={i} className={`${CARD} p-6 sm:p-[31px]`}>
                  <h3 className="text-2xl font-bold">{fill(col.title)}</h3>
                  {col.text ? <p className="mt-1 text-sm text-[#667085] dark:text-gray-400">{fill(col.text)}</p> : null}
                  {col.bullets.length > 0 ? (
                    <ul className="ml-5 mt-4 list-disc text-[13px] text-[#475467] dark:text-gray-300">
                      {col.bullets.map((b, j) => (
                        <li key={j} className="my-[7px]">
                          {fill(b)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Steps */}
      {c.showSteps && steps.length > 0 ? (
        <section className={SECTION}>
          <div className={WRAP}>
            <Head heading={fill(c.stepsHeading)} text={fill(c.stepsText)} />
            <div className="grid gap-[15px] md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={i} className={`${CARD} p-[27px]`}>
                  <b className="text-[11px] tracking-[1px] text-[#3b5bfd] dark:text-indigo-400">
                    {fill(c.stepLabel)} {String(i + 1).padStart(2, "0")}
                  </b>
                  <h3 className="mb-1 mt-[11px] text-lg font-bold">{fill(s.title)}</h3>
                  <p className="text-[13px] text-[#667085] dark:text-gray-400">{fill(s.text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Trending (dark) */}
      {c.showTrending && trendingTools.length > 0 ? (
        <section className={`${SECTION} bg-[#101828] text-white`}>
          <div className={WRAP}>
            <Head heading={fill(c.trendingHeading)} text={fill(c.trendingText)} link={link(c.trendingLink)} dark />
            <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
              {trendingTools.map((t) => (
                <ToolCard key={t.slug} tool={t} linkText={fill(c.trendingCardLinkText)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Guides (latest blog posts) */}
      {c.showGuides && guides.length > 0 ? (
        <section className={SECTION}>
          <div className={WRAP}>
            <Head heading={fill(c.guidesHeading)} text={fill(c.guidesText)} link={link(c.guidesLink, "/blog/")} />
            <div className="grid gap-[17px] md:grid-cols-3">
              {guides.map((g) => (
                <Link key={g.slug} href={blogUrl(g.slug)} className={`${CARD} ${LIFT} group block overflow-hidden`}>
                  <div className="grid h-[130px] place-items-center overflow-hidden bg-gradient-to-br from-[#e9edff] to-[#f8f9fc] text-[45px] dark:from-indigo-950 dark:to-gray-900">
                    {g.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span aria-hidden>📘</span>
                    )}
                  </div>
                  <div className="p-[21px]">
                    {g.category ? (
                      <small className="text-xs font-black uppercase text-[#3b5bfd] dark:text-indigo-400">{g.category}</small>
                    ) : null}
                    <h3 className="my-1.5 line-clamp-2 text-[17px] font-bold leading-snug">{g.title}</h3>
                    {g.excerpt ? <p className="line-clamp-3 text-[12.5px] text-[#667085] dark:text-gray-400">{g.excerpt}</p> : null}
                    {c.guideLinkText ? (
                      <span className="mt-[13px] block text-xs font-extrabold text-[#3b5bfd] dark:text-indigo-400">
                        {fill(c.guideLinkText)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Countries */}
      {c.showCountries && countries.length > 0 ? (
        <section className={`${SECTION} bg-white dark:bg-gray-900/40`}>
          <div className={WRAP}>
            <Head heading={fill(c.countriesHeading)} text={fill(c.countriesText)} link={link(c.countriesLink)} />
            <div className="grid grid-cols-2 gap-[11px] sm:grid-cols-3 lg:grid-cols-6">
              {countries.map((country) => (
                <Link
                  key={country.href + country.label}
                  href={country.href}
                  className={`${CARD} px-2 py-[17px] text-center text-xs font-extrabold transition hover:text-[#3b5bfd] dark:hover:text-indigo-400`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Flag flag={country.flag} />
                    {fill(country.label)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Trust row */}
      {c.showTrust && trust.length > 0 ? (
        <section className={SECTION}>
          <div className={WRAP}>
            <Head heading={fill(c.trustHeading)} text={fill(c.trustText)} />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {trust.map((t, i) => (
                <div key={i} className={`${CARD} p-[22px] text-center`}>
                  <span className={`${ICON} mx-auto`} aria-hidden>
                    {t.icon}
                  </span>
                  <strong className="mt-[9px] block text-sm">{fill(t.title)}</strong>
                  {t.text ? <small className="text-[13px] text-[#667085] dark:text-gray-400">{fill(t.text)}</small> : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {c.showFaq && faqs.length > 0 ? (
        <section className={`${SECTION} bg-white dark:bg-gray-900/40`}>
          <div className={WRAP}>
            <Head heading={fill(c.faqHeading)} text={fill(c.faqText)} center />
            <div className="mx-auto max-w-[880px]">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  open={i === 0}
                  className="group my-[9px] rounded-[14px] border border-[#e5e9f1] bg-white px-5 py-[18px] dark:border-gray-800 dark:bg-gray-900"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold [&::-webkit-details-marker]:hidden">
                    {fill(f.question)}
                    <span aria-hidden className="text-lg font-normal text-[#3b5bfd] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pt-2.5 text-[13px] text-[#667085] dark:text-gray-400">{fill(f.answer)}</p>
                </details>
              ))}
            </div>
            {faqJsonLd ? (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Call to action */}
      {c.showCta && (c.ctaHeading || c.ctaText) ? (
        <section className="pb-14 pt-2.5 sm:pb-20">
          <div className={WRAP}>
            <div className="rounded-[25px] bg-gradient-to-br from-[#101828] to-[#24356f] px-6 py-[60px] text-center text-white">
              {c.ctaHeading ? (
                <h2 className="text-[30px] font-extrabold tracking-[-1px] sm:text-[40px]">{fill(c.ctaHeading)}</h2>
              ) : null}
              {c.ctaText ? <p className="mx-auto mb-6 mt-2.5 max-w-[650px] text-sm text-[#b9c3d4]">{fill(c.ctaText)}</p> : null}
              {c.ctaButton.text ? (
                <Link
                  href={c.ctaButton.url || "/calculators/"}
                  className="inline-block rounded-[11px] bg-white px-5 py-[13px] text-[13px] font-black text-[#2441c6] transition hover:bg-[#eef2ff]"
                >
                  {fill(c.ctaButton.text)}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
