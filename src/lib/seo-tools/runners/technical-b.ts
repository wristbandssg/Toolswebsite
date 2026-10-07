import { crawlSite } from "../crawl";
import { checkStatus, fetchPage, mapLimit } from "../fetch-page";
import { loadPage, parseHtml, linksOf, jsonLdObjects, schemaType, urlList, textWithout } from "../html";
import { wordCount } from "../text";
import type { Cell } from "../types";
import { type Runner, str, num, bool, need, perUrl, grade, round } from "./util";

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

/** robots.txt (robots_txt_analyzer). */
export const robotsTxt: Runner = async (input) => {
  const site = need(str(input.url), "Enter a website URL.");
  const robotsUrl = new URL("/robots.txt", new URL(site)).href;
  const page = await fetchPage(robotsUrl);
  if (page.status !== 200) return { headline: robotsUrl, issues: [`robots.txt not found (HTTP ${page.status})`] };
  const content = page.html;
  const rules: { agent: string; type: "allow" | "disallow"; path: string }[] = [];
  const sitemaps: string[] = [];
  let agent = "*";
  let crawlDelay: number | null = null;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (key === "user-agent") agent = value;
    else if (key === "disallow" || key === "allow") rules.push({ agent, type: key, path: value });
    else if (key === "sitemap") sitemaps.push(value);
    else if (key === "crawl-delay") crawlDelay = Number(value) || null;
  }
  const issues: string[] = [];
  const warnings: string[] = [];
  const critical = ["/css", "/js", "/images", "/img", "/fonts", "/_next"];
  for (const r of rules) {
    if (r.type !== "disallow" || !["*", "googlebot"].includes(r.agent.toLowerCase())) continue;
    if (r.path === "/") issues.push(`CRITICAL: the whole site is disallowed for ${r.agent}`);
    if (critical.some((c) => r.path.startsWith(c))) warnings.push(`Blocking resources: ${r.path} for ${r.agent}`);
  }
  if (!rules.some((r) => r.agent === "*")) warnings.push("No rules for the wildcard user-agent (*)");
  if (!sitemaps.length) warnings.push("No sitemap declared in robots.txt");
  if (crawlDelay && crawlDelay > 10) warnings.push(`High crawl-delay: ${crawlDelay}s (may slow indexing)`);
  const keys = rules.map((r) => `${r.agent}:${r.type}:${r.path}`);
  if (keys.length !== new Set(keys).size) warnings.push(`${keys.length - new Set(keys).size} duplicate rules found`);

  const testPath = str(input.testPath);
  let testResult = "";
  if (testPath) {
    // Longest matching rule wins (Google's rule), wildcards supported.
    const applies = rules.filter((r) => ["*", "googlebot"].includes(r.agent.toLowerCase()) && r.path);
    const match = (p: string) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`).test(testPath);
    const best = applies.filter((r) => match(r.path)).sort((a, b) => b.path.length - a.path.length)[0];
    testResult = !best || best.type === "allow" ? "ALLOWED" : `BLOCKED by "Disallow: ${best.path}"`;
  }
  return {
    headline: robotsUrl,
    stats: [
      { label: "Rules", value: rules.length },
      { label: "Sitemaps", value: sitemaps.length },
      { label: "Crawl-delay", value: crawlDelay ?? "none" },
      ...(testPath ? [{ label: `Test "${testPath}"`, value: testResult }] : []),
    ],
    issues: [...issues, ...warnings],
    sections: [
      { kind: "table", title: "Rules", columns: ["User-agent", "Type", "Path"], rows: rules.map((r): Cell[] => [r.agent, r.type, r.path || "(empty — allows all)"]) },
      { kind: "list", title: "Sitemaps", items: sitemaps.length ? sitemaps : ["None declared."] },
      { kind: "code", title: "robots.txt", code: content.slice(0, 5000) },
    ],
  };
};

async function loadSitemapUrls(sitemapUrl: string, limit = 2000): Promise<{ loc: string; lastmod: string; priority: string; changefreq: string }[]> {
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

/** Sitemap Check (sitemap_analyzer). */
export const sitemapCheck: Runner = async (input) => {
  const url = need(str(input.url), "Enter the sitemap URL.");
  const entries = await loadSitemapUrls(url);
  const issues: string[] = [];
  if (!entries.length) issues.push("Sitemap is empty");
  if (entries.length > 50000) issues.push(`Exceeds the 50,000 URL limit (${entries.length})`);
  const withLastmod = entries.filter((e) => e.lastmod);
  if (entries.length && withLastmod.length / entries.length < 0.5) issues.push(`Only ${round((withLastmod.length / entries.length) * 100, 0)}% of URLs have lastmod dates`);
  const now = Date.now();
  const ages = withLastmod.map((e) => (now - new Date(e.lastmod).getTime()) / 86_400_000).filter((d) => Number.isFinite(d));
  const locs = entries.map((e) => e.loc);
  const dups = locs.length - new Set(locs).size;
  if (dups) issues.push(`${dups} duplicate URLs`);
  const http = locs.filter((l) => l.startsWith("http://")).length;
  const https = locs.filter((l) => l.startsWith("https://")).length;
  if (http && https) issues.push(`Mixed HTTP (${http}) and HTTPS (${https})`);
  const slash = locs.filter((l) => l.endsWith("/")).length;
  if (slash && slash !== locs.length) issues.push(`Inconsistent trailing slashes (with: ${slash}, without: ${locs.length - slash})`);

  let statusRows: Cell[][] = [];
  if (bool(input.checkStatus) && entries.length) {
    const sample = [...entries].sort(() => Math.random() - 0.5).slice(0, num(input.sampleSize, 50, 1, 200));
    const checked = await mapLimit(sample, 8, async (e) => ({ loc: e.loc, ...(await checkStatus(e.loc)) }));
    statusRows = checked.map((c): Cell[] => [c.loc, c.status || c.error, c.redirects]);
    const bad = checked.filter((c) => c.status !== 200 || c.redirects);
    if (bad.length) issues.push(`${bad.length} of ${checked.length} sampled URLs don't return a direct 200 (redirect or error)`);
  }
  return {
    headline: `${entries.length} URL(s) in ${url}`,
    stats: [
      { label: "URLs", value: entries.length },
      { label: "With lastmod", value: withLastmod.length },
      { label: "Updated ≤ 90 days", value: ages.filter((d) => d <= 90).length },
      { label: "Older than 1 year", value: ages.filter((d) => d > 365).length },
      { label: "Duplicates", value: dups },
    ],
    issues,
    sections: [
      ...(statusRows.length ? [{ kind: "table" as const, title: "Status check (random sample)", columns: ["URL", "Status", "Redirects"], rows: statusRows }] : []),
      { kind: "table", title: "URLs", columns: ["URL", "lastmod", "priority", "changefreq"], rows: entries.map((e): Cell[] => [e.loc, e.lastmod, e.priority, e.changefreq]) },
    ],
  };
};

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

/** Page Speed & Core Web Vitals (page_speed_analyzer + core_web_vitals_estimator). */
export const pageSpeed: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 10), async (url) => {
    const { root, page } = await loadPage(url);
    const scripts = root.querySelectorAll("script");
    const external = scripts.filter((s) => s.getAttribute("src"));
    const blockingJs = external.filter((s) => s.getAttribute("defer") == null && s.getAttribute("async") == null && s.getAttribute("type") !== "module");
    const inlineJs = scripts.filter((s) => !s.getAttribute("src")).reduce((a, s) => a + s.text.length, 0);
    const css = root.querySelectorAll('link[rel="stylesheet"]');
    const blockingCss = css.filter((l) => !l.getAttribute("media") || l.getAttribute("media") === "all");
    const inlineCss = root.querySelectorAll("style").reduce((a, s) => a + s.text.length, 0);
    const images = root.querySelectorAll("img");
    const lazy = images.filter((i) => i.getAttribute("loading") === "lazy" || i.getAttribute("data-src") != null);
    const noDims = images.filter((i) => !i.getAttribute("width") || !i.getAttribute("height"));
    const first = images[0];
    const preloadImg = root.querySelectorAll('link[rel="preload"][as="image"]').length;
    const fontDisplay = /font-display:\s*(swap|optional)/i.test(page.html);
    const issues: { text: string; area: "LCP" | "CLS" | "INP" | "Speed" }[] = [];
    const loadS = round(page.loadMs / 1000, 2);
    if (loadS > 3) issues.push({ text: `Slow response: ${loadS}s (aim <1s)`, area: "Speed" });
    if (page.bytes > 500_000) issues.push({ text: `Large HTML: ${round(page.bytes / 1024, 0)} KB (aim <100 KB)`, area: "Speed" });
    if (external.length > 15) issues.push({ text: `Too many scripts: ${external.length}`, area: "INP" });
    if (blockingJs.length > 3) issues.push({ text: `${blockingJs.length} render-blocking scripts (add defer/async)`, area: "INP" });
    if (blockingCss.length > 5) issues.push({ text: `${blockingCss.length} render-blocking stylesheets`, area: "LCP" });
    if (inlineJs > 100_000) issues.push({ text: `Large inline JS: ${round(inlineJs / 1024, 0)} KB (may block the main thread)`, area: "INP" });
    if (first?.getAttribute("loading") === "lazy") issues.push({ text: "First image is lazy-loaded (delays LCP)", area: "LCP" });
    if (first && !preloadImg) issues.push({ text: "Hero image not preloaded (add <link rel=preload as=image>)", area: "LCP" });
    if (noDims.length) issues.push({ text: `${noDims.length} image(s) without width/height (layout shift risk)`, area: "CLS" });
    if (images.length > 20 && lazy.length < images.length / 2) issues.push({ text: `Only ${lazy.length}/${images.length} images lazy-loaded`, area: "Speed" });
    if (!fontDisplay && (page.html.includes("@font-face") || root.querySelector('link[href*="fonts.googleapis"]'))) issues.push({ text: "No font-display: swap/optional (text may flash or shift)", area: "CLS" });
    const area = (a: string) => issues.filter((i) => i.area === a).length;
    const score = Math.max(0, 100 - issues.length * 10);
    return {
      loadS,
      htmlKb: round(page.bytes / 1024),
      scripts: external.length,
      blockingJs: blockingJs.length,
      css: css.length,
      inlineJsKb: round(inlineJs / 1024),
      inlineCssKb: round(inlineCss / 1024),
      images: images.length,
      lazy: lazy.length,
      lcp: area("LCP") ? "⚠️" : "✅",
      cls: area("CLS") ? "⚠️" : "✅",
      inp: area("INP") ? "⚠️" : "✅",
      score,
      issues,
    };
  });
  return {
    headline: "Estimated from the page's HTML (not a real browser measurement — use PageSpeed Insights for field data)",
    sections: [
      {
        kind: "table",
        title: "Pages",
        columns: ["URL", "Score", "Grade", "Response (s)", "HTML KB", "Scripts", "Blocking JS", "CSS files", "Inline JS KB", "Images", "Lazy", "LCP", "CLS", "INP"],
        rows: results.map((r): Cell[] =>
          r.ok
            ? [r.url, r.value.score, grade(r.value.score), r.value.loadS, r.value.htmlKb, r.value.scripts, r.value.blockingJs, r.value.css, r.value.inlineJsKb, r.value.images, r.value.lazy, r.value.lcp, r.value.cls, r.value.inp]
            : [r.url, `Failed: ${r.error}`, "", "", "", "", "", "", "", "", "", "", "", ""]
        ),
      },
      ...results.flatMap((r) => (r.ok ? [{ kind: "list" as const, title: `Issues — ${r.url}`, tone: "bad" as const, items: r.value.issues.length ? r.value.issues.map((i) => `[${i.area}] ${i.text}`) : ["No major issues."] }] : [])),
    ],
  };
};

/** Mobile Friendly (mobile_friendly_checker). */
export const mobileFriendly: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 10), async (url) => {
    const { root, page } = await loadPage(url);
    let score = 100;
    const issues: string[] = [];
    const vp = root.querySelector('meta[name="viewport"]');
    if (!vp) (score -= 25), issues.push("Missing viewport meta tag");
    else {
      const c = vp.getAttribute("content") ?? "";
      if (!c.includes("width=device-width")) (score -= 10), issues.push("Viewport missing width=device-width");
      if (/user-scalable=no|maximum-scale=1(\.0)?\b/.test(c)) issues.push("Zoom is disabled (accessibility issue)");
    }
    const fixed = [...page.html.matchAll(/width:\s*(\d{4,})px/g)].map((m) => m[1]);
    if (fixed.length) (score -= 15), issues.push(`Fixed widths found: ${fixed.slice(0, 3).join(", ")}px (may overflow)`);
    const tiny = [...page.html.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1])).filter((n) => n < 12);
    if (tiny.length) (score -= 10), issues.push(`Small font sizes found: ${[...new Set(tiny)].slice(0, 3).join(", ")}px (16px recommended)`);
    const images = root.querySelectorAll("img");
    const nonResponsive = images.filter((i) => !i.getAttribute("srcset") && !i.getAttribute("sizes") && !/max-width|width:\s*100%/.test(i.getAttribute("style") ?? "") && !/\b(w-full|max-w-|h-full)/.test(i.getAttribute("class") ?? ""));
    if (images.length && nonResponsive.length > images.length / 2) (score -= 10), issues.push(`${nonResponsive.length}/${images.length} images have no responsive sizing`);
    if (root.querySelector("embed, object")) (score -= 20), issues.push("Plugin content (embed/object) — not mobile compatible");
    const tables = root.querySelectorAll("table").filter((t) => !/overflow|responsive/.test(`${t.parentNode?.getAttribute?.("class") ?? ""} ${t.parentNode?.getAttribute?.("style") ?? ""}`));
    if (tables.length) (score -= 5), issues.push(`${tables.length} table(s) may cause horizontal scrolling`);
    return {
      score: Math.max(score, 0),
      viewport: !!vp,
      themeColor: !!root.querySelector('meta[name="theme-color"]'),
      appleIcon: !!root.querySelector('link[rel*="apple-touch-icon"]'),
      images: images.length,
      issues,
    };
  });
  return {
    sections: [
      {
        kind: "table",
        title: "Pages",
        columns: ["URL", "Score", "Grade", "Viewport", "Theme color", "Apple touch icon", "Images", "Issues"],
        rows: results.map((r): Cell[] =>
          r.ok
            ? [r.url, r.value.score, grade(r.value.score), r.value.viewport ? "✅" : "❌", r.value.themeColor ? "✅" : "—", r.value.appleIcon ? "✅" : "—", r.value.images, r.value.issues.join("; ") || "All checks passed"]
            : [r.url, `Failed: ${r.error}`, "", "", "", "", "", ""]
        ),
      },
    ],
  };
};

/** Content Ratio (text_html_ratio + page_segmenter): text vs code, main content vs boilerplate. */
export const contentRatio: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 20), async (url) => {
    const page = await fetchPage(url);
    const root = parseHtml(page.html);
    const scripts = root.querySelectorAll("script");
    const inlineJs = scripts.filter((s) => !s.getAttribute("src")).reduce((a, s) => a + s.text.length, 0);
    const inlineCss = root.querySelectorAll("style").reduce((a, s) => a + s.text.length, 0);
    const mainText = textWithout(page.html, "script, style, noscript, template, svg, nav, footer, header, aside");
    const fullText = textWithout(page.html);
    const mainWords = wordCount(mainText);
    const allWords = wordCount(fullText);
    const ratio = (Buffer.byteLength(mainText) / Math.max(page.bytes, 1)) * 100;
    const contentShare = (mainWords / Math.max(allWords, 1)) * 100;
    const tips: string[] = [];
    if (ratio < 25) {
      if (inlineJs > 10_240) tips.push(`Inline scripts: ${round(inlineJs / 1024)} KB — move to external files`);
      if (inlineCss > 5_120) tips.push(`Inline styles: ${round(inlineCss / 1024)} KB — move to a stylesheet`);
      if (scripts.filter((s) => s.getAttribute("src")).length > 10) tips.push("Many external scripts — reduce or defer");
    }
    return {
      htmlKb: round(page.bytes / 1024),
      textKb: round(Buffer.byteLength(mainText) / 1024),
      ratio: round(ratio),
      inlineJsKb: round(inlineJs / 1024),
      inlineCssKb: round(inlineCss / 1024),
      mainWords,
      boilerplateWords: allWords - mainWords,
      contentShare: round(contentShare),
      article: !!root.querySelector("article, main, [role=main]"),
      status: ratio >= 25 ? "OK" : ratio >= 10 ? "LOW" : "VERY LOW",
      segment: contentShare > 60 ? "GOOD" : contentShare > 30 ? "LOW" : "VERY LOW",
      tips,
    };
  });
  return {
    headline: "Text-to-HTML ratio and main content vs boilerplate (header, nav, footer, sidebars)",
    sections: [
      {
        kind: "table",
        title: "Pages",
        columns: ["URL", "HTML KB", "Text KB", "Text ratio %", "Status", "Main words", "Boilerplate words", "Content share %", "Segment", "<article>/<main>", "Inline JS KB", "Inline CSS KB", "Tips"],
        rows: results.map((r): Cell[] =>
          r.ok
            ? [r.url, r.value.htmlKb, r.value.textKb, r.value.ratio, r.value.status, r.value.mainWords, r.value.boilerplateWords, r.value.contentShare, r.value.segment, r.value.article ? "yes" : "no", r.value.inlineJsKb, r.value.inlineCssKb, r.value.tips.join("; ") || "—"]
            : [r.url, `Failed: ${r.error}`, "", "", "", "", "", "", "", "", "", "", ""]
        ),
      },
    ],
  };
};

const VALID_LANGS = new Set(
  "af am ar az be bg bn bs ca cs cy da de el en es et eu fa fi fr ga gl gu ha he hi hr hu hy id ig is it ja jv ka kk km kn ko ku ky la lb lo lt lv mg mi mk ml mn mr ms mt my nb ne nl nn no ny or pa pl ps pt ro ru rw sd si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn tr ts tt ug uk ur uz vi xh yo zh zu fil".split(" ")
);

/** Hreflang (hreflang_validator): x-default, self-reference, valid codes and return tags. */
export const hreflang: Runner = async (input) => {
  const urls = urlsOf(input.urls, 20);
  const pages = await perUrl(urls, async (url) => {
    const page = await fetchPage(url);
    const root = parseHtml(page.html);
    const tags = root
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .map((l) => ({ lang: l.getAttribute("hreflang")!.trim(), href: new URL(l.getAttribute("href") ?? "", page.finalUrl).href }));
    for (const m of (page.headers.get("link") ?? "").matchAll(/<([^>]+)>;\s*rel="?alternate"?;\s*hreflang="?([^";,]+)"?/gi)) tags.push({ lang: m[2], href: m[1] });
    return { finalUrl: page.finalUrl, tags };
  });
  const strip = (u: string) => u.replace(/\/$/, "");
  const byUrl = new Map(pages.filter((p) => p.ok).map((p) => [strip(p.ok ? p.value.finalUrl : ""), p.ok ? p.value.tags : []]));
  const issues: { url: string; severity: string; issue: string }[] = [];
  for (const p of pages) {
    if (!p.ok) {
      issues.push({ url: p.url, severity: "ERROR", issue: `Failed to load: ${p.error}` });
      continue;
    }
    const { finalUrl, tags } = p.value;
    if (!tags.length) {
      issues.push({ url: p.url, severity: "ERROR", issue: "No hreflang tags found" });
      continue;
    }
    if (!tags.some((t) => t.lang.toLowerCase() === "x-default")) issues.push({ url: p.url, severity: "WARNING", issue: "Missing x-default tag" });
    if (!tags.some((t) => strip(t.href) === strip(finalUrl))) issues.push({ url: p.url, severity: "ERROR", issue: "Missing self-referencing hreflang" });
    for (const t of tags) {
      const base = t.lang.split("-")[0].toLowerCase();
      if (t.lang.toLowerCase() !== "x-default" && !VALID_LANGS.has(base)) issues.push({ url: p.url, severity: "ERROR", issue: `Invalid language code: ${t.lang}` });
      const target = byUrl.get(strip(t.href));
      if (target && strip(t.href) !== strip(finalUrl) && !target.some((rt) => strip(rt.href) === strip(finalUrl))) {
        issues.push({ url: p.url, severity: "ERROR", issue: `Missing return tag: ${t.href} doesn't link back to this page` });
      }
    }
  }
  return {
    headline: `${urls.length} page(s) checked${urls.length === 1 ? " — add every language version to also check return tags" : ""}`,
    stats: [
      { label: "Errors", value: issues.filter((i) => i.severity === "ERROR").length },
      { label: "Warnings", value: issues.filter((i) => i.severity === "WARNING").length },
    ],
    sections: [
      { kind: "table", title: "Issues", columns: ["Page", "Severity", "Issue"], rows: issues.map((i): Cell[] => [i.url, i.severity, i.issue]) },
      { kind: "table", title: "hreflang tags found", columns: ["Page", "Language", "URL"], rows: pages.flatMap((p) => (p.ok ? p.value.tags.map((t): Cell[] => [p.url, t.lang, t.href]) : [])) },
    ],
  };
};

const SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "yelp.com", "youtube.com", "tiktok.com", "pinterest.com"];
const LOCAL_TYPES = /LocalBusiness|Restaurant|Store|Hotel|MedicalBusiness|LegalService|FinancialService|RealEstateAgent|AutomotiveBusiness|HomeAndConstructionBusiness|ProfessionalService|Dentist|Physician|Business$/;

/** Local SEO (local_seo_auditor): NAP, LocalBusiness schema, map, hours, social profiles. */
export const localSeo: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 10), async (url) => {
    const { root, page, fullText } = await loadPage(url);
    let score = 0;
    const issues: string[] = [];
    const phones = [...new Set((fullText.match(/\+?\(?\d[\d\s().-]{8,16}\d/g) ?? []).map((p) => p.trim()).filter((p) => (p.match(/\d/g) ?? []).length >= 10))].slice(0, 5);
    if (phones.length) score += 10;
    else issues.push("No phone number detected");
    const telLinks = root.querySelectorAll('a[href^="tel:"]').length;
    const addresses = (fullText.match(/\d+\s+[\w\s.]+?(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|Jalan|Jln)\b[.,]?[\w\s,]{0,40}\d{4,6}/gi) ?? []).slice(0, 3);
    if (addresses.length) score += 10;
    else issues.push("No street address detected");
    const emails = [...new Set(fullText.match(/[\w.%+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [])].slice(0, 3);
    if (emails.length) score += 5;
    const business = jsonLdObjects(root).map((s) => s.data).find((d) => LOCAL_TYPES.test(schemaType(d)));
    if (business) score += 20;
    else issues.push("No LocalBusiness schema found");
    const maps = /google\.[a-z.]+\/maps|maps\.googleapis\.com|maps\.app\.goo\.gl/.test(page.html);
    if (maps) score += 10;
    else issues.push("No Google Maps embed or link found");
    if (root.querySelector('a[href*="contact" i], a[href*="about" i], a[href*="location" i]')) score += 5;
    const hours = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b\s*[:\-–]\s*\d/i.test(fullText) || /openingHours/i.test(page.html);
    if (hours) score += 10;
    else issues.push("No opening hours detected");
    const socials = [...new Set(linksOf(root, page.finalUrl).map((l) => SOCIAL_DOMAINS.find((d) => new URL(l.href).host.endsWith(d))).filter(Boolean))] as string[];
    if (socials.length) score += 10;
    const schemaPhone = business ? String(business.telephone ?? "") : "";
    if (phones[0] && schemaPhone && phones[0].replace(/\D/g, "").slice(-10) !== schemaPhone.replace(/\D/g, "").slice(-10)) issues.push("Phone number on the page differs from the schema (NAP mismatch)");
    const schemaName = business ? String(business.name ?? "") : "";
    if (schemaName && !fullText.toLowerCase().includes(schemaName.toLowerCase())) issues.push(`Business name in schema ("${schemaName}") not found on the page (NAP mismatch)`);
    score = Math.min(score, 100);
    return {
      score,
      grade: score >= 70 ? "A" : score >= 50 ? "B" : score >= 30 ? "C" : "D",
      phones: [...phones, ...(telLinks ? [`${telLinks} tap-to-call link(s)`] : [])].join("; "),
      addresses: addresses.join("; "),
      emails: emails.join("; "),
      schema: business ? `${schemaType(business)} — ${schemaName}` : "",
      maps,
      hours,
      socials: socials.join(", "),
      issues,
    };
  });
  return {
    sections: [
      {
        kind: "table",
        title: "Local SEO signals",
        columns: ["URL", "Score", "Grade", "Phone", "Address", "Email", "Schema", "Map", "Hours", "Social", "Issues"],
        rows: results.map((r): Cell[] =>
          r.ok
            ? [r.url, r.value.score, r.value.grade, r.value.phones || "None", r.value.addresses || "None", r.value.emails || "—", r.value.schema || "None", r.value.maps ? "yes" : "no", r.value.hours ? "yes" : "no", r.value.socials || "None", r.value.issues.join("; ") || "OK"]
            : [r.url, `Failed: ${r.error}`, "", "", "", "", "", "", "", "", ""]
        ),
      },
    ],
  };
};

