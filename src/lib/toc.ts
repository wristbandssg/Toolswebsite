/**
 * Auto-generates a sticky Table of Contents from a blog post's rich-text
 * HTML content. Pattern verified against a live reference site
 * (nextstair.com/alternatives/surfshark-alternatives) before building:
 * every H2/H3 heading in the post gets a stable slug id, and the public
 * blog page renders a scroll-spy sidebar (`TableOfContents.tsx`) that
 * links to each one and stays fixed in place while the reader scrolls.
 *
 * The rich-text editor (Tiptap) never writes `id` attributes onto
 * headings, so this runs server-side on every render to inject them —
 * same slugging behaviour as the reference site, including numbered
 * de-duplication for repeated heading text (e.g. multiple "Pricing"
 * sub-headings become "pricing", "pricing-2", "pricing-3", ...).
 */

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Scans H2/H3 headings in the given HTML, assigns each a unique slug id,
 * and returns both the heading list (for the sidebar) and the HTML with
 * `id="..."` injected into each heading tag (so the sidebar's #links
 * actually land on the right section).
 */
export function extractTableOfContents(html: string): {
  html: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();

  const outputHtml = html.replace(
    /<h([23])((?:\s+[^>]*)?)>([\s\S]*?)<\/h\1>/gi,
    (match, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr) as 2 | 3;
      const text = stripTags(inner);
      if (!text) return match;

      const base = slugify(text) || "section";
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;

      headings.push({ id, text, level });

      // Drop any pre-existing id from the tag's attributes before adding ours.
      const cleanAttrs = attrs.replace(/\s+id="[^"]*"/i, "");
      return `<h${level}${cleanAttrs} id="${id}">${inner}</h${level}>`;
    }
  );

  return { html: outputHtml, headings };
}

/** Standard ~200-words-per-minute estimate, rounded up, minimum 1 minute. */
export function estimateReadingMinutes(html: string): number {
  const text = stripTags(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}
