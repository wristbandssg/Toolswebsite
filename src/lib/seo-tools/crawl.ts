import { fetchPage } from "./fetch-page";
import { linksOf, parseHtml, type PageLink } from "./html";

// Same-site breadth-first crawl for the link tools (broken links, internal
// links). Bounded so a run stays quick on the server.

export interface CrawledPage {
  url: string;
  status: number;
  error: string;
  links: PageLink[];
  imageSrcs: { src: string; alt: string }[];
}

export async function crawlSite(startUrl: string, opts: { depth: number; maxPages: number }): Promise<CrawledPage[]> {
  const start = new URL(startUrl.trim());
  const host = start.host;
  const seen = new Set<string>();
  const out: CrawledPage[] = [];
  let frontier = [start.href];

  for (let depth = 0; depth <= opts.depth && frontier.length && out.length < opts.maxPages; depth++) {
    const batch = frontier.filter((u) => !seen.has(u)).slice(0, opts.maxPages - out.length);
    batch.forEach((u) => seen.add(u));
    const pages = await Promise.all(
      batch.map(async (url): Promise<CrawledPage> => {
        try {
          const page = await fetchPage(url);
          const root = parseHtml(page.html);
          return {
            url: page.finalUrl,
            status: page.status,
            error: "",
            links: linksOf(root, page.finalUrl),
            imageSrcs: root.querySelectorAll("img[src]").map((img) => ({
              src: new URL(img.getAttribute("src")!, page.finalUrl).href,
              alt: img.getAttribute("alt") ?? "",
            })),
          };
        } catch (e) {
          return { url, status: 0, error: (e as Error).message, links: [], imageSrcs: [] };
        }
      })
    );
    out.push(...pages);
    frontier = [...new Set(pages.flatMap((p) => p.links.filter((l) => l.internal && new URL(l.href).host === host).map((l) => l.href)))];
  }
  return out;
}
