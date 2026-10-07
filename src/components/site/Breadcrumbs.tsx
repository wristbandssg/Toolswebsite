import Link from "next/link";
import { getSiteUrl } from "@/lib/seo";

export type Crumb = { name: string; href: string };

/**
 * Visible breadcrumb trail plus schema.org BreadcrumbList structured data.
 * `items` runs from Home to the current page; the last item is shown as
 * plain text. Categories can nest deeper than the URL shows (see
 * src/lib/urls.ts), so this trail is where the full hierarchy shows.
 */
export default function Breadcrumbs({
  items,
  className = "text-sm text-gray-500",
  linkClassName = "hover:underline",
}: {
  items: Crumb[];
  className?: string;
  linkClassName?: string;
}) {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.href}`,
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <>
                  <Link href={item.href} className={linkClassName}>
                    {item.name}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
