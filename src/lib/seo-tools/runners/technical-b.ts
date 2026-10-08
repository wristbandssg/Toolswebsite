import { crawlSite } from "../crawl";
import { checkStatus, fetchPage, mapLimit } from "../fetch-page";
import { parseHtml, linksOf, urlList } from "../html";
import type { Cell } from "../types";
import { type Runner, str, num, bool, need, perUrl, round } from "./util";

// Technical SEO tools, part 2 — ports of broken_link_checker.py,
// internal_link_analyzer.py + anchor_text_analyzer.py,
// outbound_link_analyzer.py, robots_txt_analyzer.py, sitemap_analyzer.py,
// url_slug_analyzer.py, page_speed_analyzer.py + core_web_vitals_estimator.py,
// mobile_friendly_checker.py, text_html_ratio.py + page_segmenter.py,
// hreflang_validator.py and local_seo_auditor.py.

const urlsOf = (v: unknown, max = 20) => need(urlList(v, max), "Enter at least one URL.");
const MAX_LINK_CHECKS = 300;

/** Broken Links (broken_link_checker): crawl, then check every linked URL and image once. */
export const brokenLinks: Runner = async (input) => {
  const start = need(str(input.url), "Enter a start URL.");
  const pages = await crawlSite(start, { depth: num(input.depth, 0, 0, 2), maxPages: num(input.maxPages, 20, 1, 50) });
  const links = pages.flatMap((p) => [
    ...p.links.map((l) => ({ source: p.url, target: l.href, anchor: l.anchor })),
    ...p.imageSrcs.filter((i) => !i.src.startsWith("data:")).map((i) => ({ source: p.url, target: i.src, anchor: `[img: ${i.alt.slice(0, 40)}]` })),
  ]);
  const targets = [...new Set(links.map((l) => l.target))].slice(0, MAX_LINK_CHECKS);
  const statuses = new Map(await mapLimit(targets, 8, async (t) => [t, await checkStatus(t)] as const));
  const rows = links
    .filter((l) => statuses.has(l.target))
    .map((l) => ({ ...l, ...statuses.get(l.target)! }));
  const broken = rows.filter((r) => r.status >= 400 || r.error);
  const redirected = rows.filter((r) => r.redirects > 0);
  return {
    headline: `${pages.length} page(s) crawled, ${targets.length} unique link(s) checked`,
    stats: [
      { label: "Broken", value: broken.length },
      { label: "Redirected", value: redirected.length },
      { label: "Long chains (3+)", value: rows.filter((r) => r.redirects >= 3).length },
    ],
    issues: targets.length === MAX_LINK_CHECKS ? [`Only the first ${MAX_LINK_CHECKS} unique links were checked.`] : undefined,
    sections: [
      { kind: "table", title: "🔴 Broken links", columns: ["Status", "Link", "Found on", "Anchor"], rows: broken.map((r): Cell[] => [r.status || r.error, r.target, r.source, r.anchor]) },
      { kind: "table", title: "🟡 Redirected links (link to the final URL instead)", columns: ["Redirects", "Link", "Goes to", "Found on"], rows: redirected.map((r): Cell[] => [r.redirects, r.target, r.finalUrl, r.source]) },
      { kind: "table", title: "All checked links", columns: ["Status", "Redirects", "Link", "Found on", "Anchor"], rows: rows.map((r): Cell[] => [r.status || r.error, r.redirects, r.target, r.source, r.anchor]) },
    ],
  };
};

const GENERIC_ANCHORS = new Set(["click here", "read more", "learn more", "here", "this", "link", "more"]);
function anchorType(text: string, isImage: boolean) {
  if (isImage) return "image";
  const t = text.trim().toLowerCase();
  if (!t) return "empty";
  if (GENERIC_ANCHORS.has(t)) return "generic";
  if (/^https?:\/\//.test(t)) return "naked_url";
  return "descriptive";
}

/** Internal Links & Anchors (internal_link_analyzer + anchor_text_analyzer). */
export const internalLinks: Runner = async (input) => {
  const start = need(str(input.url), "Enter a start URL.");
  const pages = await crawlSite(start, { depth: num(input.depth, 2, 0, 3), maxPages: num(input.maxPages, 30, 1, 60) });
  const visited = new Set(pages.map((p) => p.url));
  const all = pages.flatMap((p) => p.links.map((l) => ({ ...l, source: p.url })));
  const internal = all.filter((l) => l.internal);
  const inbound = new Map<string, Set<string>>();
  for (const l of internal) {
    if (l.href === l.source) continue;
    if (!inbound.has(l.href)) inbound.set(l.href, new Set());
    inbound.get(l.href)!.add(l.source);
  }
  const startUrl = pages[0]?.url;
  const orphans = [...visited].filter((u) => u !== startUrl && !inbound.get(u)?.size);
  const anchors = new Map<string, number>();
  for (const l of internal) if (l.anchor) anchors.set(l.anchor, (anchors.get(l.anchor) ?? 0) + 1);
  const types = new Map<string, number>();
  for (const l of all) {
    const t = anchorType(l.anchor, l.isImage);
    types.set(t, (types.get(t) ?? 0) + 1);
  }
  const total = all.length || 1;
  const issues: string[] = [];
  const emptyPct = ((types.get("empty") ?? 0) / total) * 100;
  const genericPct = ((types.get("generic") ?? 0) / total) * 100;
  if (emptyPct > 10) issues.push(`${round(emptyPct)}% of links have empty anchor text`);
  if (genericPct > 20) issues.push(`${round(genericPct)}% generic anchor text (click here, read more…)`);
  if (orphans.length) issues.push(`${orphans.length} crawled page(s) have no internal links pointing to them`);
  return {
    headline: `${pages.length} page(s) crawled`,
    stats: [
      { label: "Internal links", value: internal.length },
      { label: "External links", value: all.length - internal.length },
      { label: "Avg internal links / page", value: round(internal.length / Math.max(pages.length, 1)) },
      { label: "Orphan pages", value: orphans.length },
    ],
    issues,
    sections: [
      { kind: "table", title: "Anchor type distribution", columns: ["Type", "Links", "%"], rows: [...types].map(([t, c]): Cell[] => [t, c, round((c / total) * 100)]) },
      {
        kind: "table",
        title: "Most linked pages",
        columns: ["Page", "Linked from (pages)"],
        rows: [...visited].map((u): Cell[] => [u, inbound.get(u)?.size ?? 0]).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 30),
      },
      { kind: "table", title: "Top anchor texts", columns: ["Anchor", "Times"], rows: [...anchors].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([a, c]): Cell[] => [a, c]) },
      { kind: "list", title: "Orphan pages (no inbound internal links found)", items: orphans.length ? orphans : ["None found."] },
      { kind: "table", title: "All links", columns: ["From", "To", "Anchor", "Internal", "nofollow"], rows: all.slice(0, 2000).map((l): Cell[] => [l.source, l.href, l.anchor, l.internal ? "yes" : "no", l.rel.includes("nofollow") ? "yes" : "no"]) },
    ],
  };
};

/** Outbound Links (outbound_link_analyzer). */
export const outboundLinks: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 10), async (url) => {
    const page = await fetchPage(url);
    return linksOf(parseHtml(page.html), page.finalUrl).filter((l) => !l.internal).map((l) => ({ source: url, ...l }));
  });
  const links = results.flatMap((r) => (r.ok ? r.value : []));
  const statuses = new Map<string, Awaited<ReturnType<typeof checkStatus>>>();
  if (bool(input.checkStatus)) {
    const targets = [...new Set(links.map((l) => l.href))].slice(0, MAX_LINK_CHECKS);
    for (const [t, s] of await mapLimit(targets, 8, async (t) => [t, await checkStatus(t)] as const)) statuses.set(t, s);
  }
  const domains = new Map<string, number>();
  for (const l of links) {
    const d = new URL(l.href).host;
    domains.set(d, (domains.get(d) ?? 0) + 1);
  }
  const broken = [...statuses].filter(([, s]) => s.status >= 400 || s.error);
  return {
    headline: `${links.length} outbound link(s) on ${results.length} page(s)`,
    stats: [
      { label: "Dofollow", value: links.filter((l) => !l.rel.includes("nofollow")).length },
      { label: "Nofollow", value: links.filter((l) => l.rel.includes("nofollow")).length },
      { label: "Sponsored / UGC", value: links.filter((l) => l.rel.includes("sponsored") || l.rel.includes("ugc")).length },
      { label: "Unique domains", value: domains.size },
      ...(statuses.size ? [{ label: "Broken", value: broken.length }] : []),
    ],
    sections: [
      { kind: "table", title: "Top domains", columns: ["Domain", "Links"], rows: [...domains].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([d, c]): Cell[] => [d, c]) },
      {
        kind: "table",
        title: "Outbound links",
        columns: ["Page", "Link", "Anchor", "rel", ...(statuses.size ? ["Status"] : [])],
        rows: links.map((l): Cell[] => [l.source, l.href, l.anchor, l.rel.join(" ") || "—", ...(statuses.size ? [statuses.get(l.href)?.status || statuses.get(l.href)?.error || "not checked"] : [])]),
      },
    ],
  };
};

export async function loadSitemapUrls(sitemapUrl: string, limit = 2000): Promise<{ loc: string; lastmod: string; priority: string; changefreq: string }[]> {
  const page = await fetchPage(sitemapUrl);
  const xml = page.html;
  const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`, "i"))?.[1] ?? "";
  const children = [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi)].map((m) => tag(m[1], "loc")).filter(Boolean);
  if (children.length) {
    const nested = await mapLimit(children.slice(0, 20), 4, (c) => loadSitemapUrls(c, limit).catch(() => []));
    return nested.flat().slice(0, limit);
  }
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)]
    .map((m) => ({ loc: tag(m[1], "loc"), lastmod: tag(m[1], "lastmod"), priority: tag(m[1], "priority"), changefreq: tag(m[1], "changefreq") }))
    .slice(0, limit);
}

const SLUG_STOP_WORDS = new Set("the a an in on at to for of and or but is are with".split(" "));

/** URL Slugs (url_slug_analyzer). */
export const urlSlugs: Runner = async (input) => {
  let urls = urlList(input.urls, 2000);
  if (str(input.sitemap)) urls = [...urls, ...(await loadSitemapUrls(str(input.sitemap))).map((e) => e.loc)];
  need(urls, "Enter URLs or a sitemap URL.");
  const kw = str(input.keyword).toLowerCase();
  const rows = urls.map((url) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return { url, slug: "", depth: 0, issues: ["invalid URL"], score: 0, kwIn: false };
    }
    const path = u.pathname.replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);
    const slug = segments[segments.length - 1] ?? "";
    const issues: string[] = [];
    if (url.length > 100) issues.push(`URL too long (${url.length} chars)`);
    if (slug.length > 60) issues.push(`slug too long (${slug.length} chars)`);
    if (segments.length > 4) issues.push(`deep nesting (${segments.length} levels)`);
    if (slug.includes("_")) issues.push("underscores in slug (use hyphens)");
    if (slug !== slug.toLowerCase()) issues.push("uppercase characters in slug");
    if (/^\d+$/.test(slug)) issues.push("numeric-only slug");
    if (u.search) issues.push(`${[...u.searchParams.keys()].length} query parameter(s)`);
    const stops = slug.split(/[-_]/).filter((w) => SLUG_STOP_WORDS.has(w.toLowerCase()));
    if (stops.length) issues.push(`stop words in slug: ${stops.join(", ")}`);
    if (/\.(php|asp|aspx|jsp|cgi)$/i.test(slug)) issues.push("dynamic file extension visible");
    const kwIn = kw ? path.toLowerCase().includes(kw.replace(/\s+/g, "-")) || path.toLowerCase().includes(kw.replace(/\s+/g, "")) : false;
    if (kw && !kwIn) issues.push(`keyword "${kw}" not in URL`);
    return { url, slug, depth: segments.length, issues, score: Math.max(0, 100 - issues.length * 15), kwIn };
  });
  const depthDist = new Map<number, number>();
  for (const r of rows) depthDist.set(r.depth, (depthDist.get(r.depth) ?? 0) + 1);
  return {
    headline: `${rows.length} URL(s) analysed`,
    stats: [
      { label: "With issues", value: rows.filter((r) => r.issues.length).length },
      { label: "Avg depth", value: round(rows.reduce((a, r) => a + r.depth, 0) / rows.length) },
      { label: "Avg length", value: round(rows.reduce((a, r) => a + r.url.length, 0) / rows.length, 0) },
      ...(kw ? [{ label: "Keyword in URL", value: `${rows.filter((r) => r.kwIn).length}/${rows.length}` }] : []),
    ],
    sections: [
      { kind: "table", title: "Depth distribution", columns: ["Depth", "URLs"], rows: [...depthDist].sort((a, b) => a[0] - b[0]).map(([d, c]): Cell[] => [d, c]) },
      { kind: "table", title: "URLs", columns: ["Score", "URL", "Depth", "Issues"], rows: rows.sort((a, b) => a.score - b.score).map((r): Cell[] => [r.score, r.url, r.depth, r.issues.join("; ") || "OK"]) },
    ],
  };
};

