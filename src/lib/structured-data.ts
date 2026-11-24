import { getSiteUrl } from "@/lib/seo";
import { authorUrl } from "@/lib/urls";

// schema.org structured data for calculator and blog pages. The type comes
// from the "Schema type" field in admin (SEO box), with a sensible default.
// Breadcrumbs add their own BreadcrumbList (src/components/site/Breadcrumbs.tsx).

type Json = Record<string, unknown>;

const text = (html: string | null | undefined) =>
  (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const abs = (url: string) => (/^https?:\/\//.test(url) ? url : `${getSiteUrl()}${url.startsWith("/") ? "" : "/"}${url}`);

// Only plain schema.org type names are used; anything else falls back.
const typeOr = (value: string | null | undefined, fallback: string) =>
  value && /^[A-Z][A-Za-z]+$/.test(value.trim()) ? value.trim() : fallback;

function publisher(siteName: string, logoUrl: string): Json {
  return {
    "@type": "Organization",
    name: siteName,
    url: `${getSiteUrl()}/`,
    ...(logoUrl ? { logo: { "@type": "ImageObject", url: abs(logoUrl) } } : {}),
  };
}

/** Home page: tells search engines the site's name (shown in results) and who runs it. */
export function siteJsonLd(siteName: string, description: string, logoUrl: string): Json[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: `${getSiteUrl()}/`,
      ...(description ? { description } : {}),
    },
    { "@context": "https://schema.org", ...publisher(siteName, logoUrl) },
  ];
}

export function toolJsonLd(input: {
  title: string;
  description: string | null;
  path: string;
  schemaType: string | null | undefined;
  faq: { question: string; answer: string }[];
  siteName: string;
  logoUrl: string;
  updatedAt: Date;
}): Json[] {
  const url = abs(input.path);
  const out: Json[] = [
    {
      "@context": "https://schema.org",
      "@type": typeOr(input.schemaType, "WebApplication"),
      name: input.title,
      ...(input.description ? { description: text(input.description) } : {}),
      url,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      dateModified: input.updatedAt.toISOString(),
      publisher: publisher(input.siteName, input.logoUrl),
    },
  ];
  // Only questions that are shown on the page (ToolContentSections renders them all).
  const faq = input.faq.filter((f) => f?.question?.trim() && text(f.answer));
  if (faq.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question.trim(),
        acceptedAnswer: { "@type": "Answer", text: text(f.answer) },
      })),
    });
  }
  return out;
}

export function blogJsonLd(input: {
  title: string;
  description: string;
  path: string;
  schemaType: string | null | undefined;
  image: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string; slug?: string | null } | null;
  siteName: string;
  logoUrl: string;
}): Json {
  const url = abs(input.path);
  return {
    "@context": "https://schema.org",
    "@type": typeOr(input.schemaType, "BlogPosting"),
    headline: input.title.slice(0, 110),
    ...(input.description ? { description: input.description } : {}),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(input.image ? { image: [abs(input.image)] } : {}),
    ...(input.publishedAt ? { datePublished: input.publishedAt.toISOString() } : {}),
    dateModified: input.updatedAt.toISOString(),
    ...(input.author
      ? {
          author: {
            "@type": "Person",
            name: input.author.name,
            ...(input.author.slug ? { url: abs(authorUrl(input.author.slug)) } : {}),
          },
        }
      : {}),
    publisher: publisher(input.siteName, input.logoUrl),
  };
}
