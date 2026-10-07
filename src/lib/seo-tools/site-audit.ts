import { parse, type HTMLElement } from "node-html-parser";
import { fetchPage } from "./fetch-page";

// Site Audit — a one-pass on-page SEO check of a single URL. TypeScript port
// of site_audit_summary.py (same checks and the same scoring: 100 minus 7
// per issue), plus a self-referencing canonical check and redirect info.

export interface SiteAuditResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  redirects: { from: string; status: number }[];
  loadTimeS: number;
  pageSizeKb: number;
  metrics: {
    title: string;
    titleLength: number;
    metaDescription: string;
    metaDescriptionLength: number;
    h1Count: number;
    h1Text: string;
    h2Count: number;
    wordCount: number;
    images: number;
    imagesNoAlt: number;
    canonical: string;
    schemaTypes: string[];
    internalLinks: number;
    externalLinks: number;
    keywordFrequency?: number;
    keywordDensity?: number;
  };
  passed: string[];
  issues: string[];
  score: number;
  grade: "A" | "B" | "C" | "D";
}

const WORD = /[\p{L}\p{N}]+/gu;

function schemaTypes(root: HTMLElement): string[] {
  const types: string[] = [];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.text);
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        const t = item?.["@type"];
        if (t) types.push(...(Array.isArray(t) ? t : [t]).map(String));
      }
    } catch {
      types.push("(invalid JSON-LD)");
    }
  }
  return types;
}

export async function runSiteAudit(rawUrl: string, keyword?: string): Promise<SiteAuditResult> {
  const page = await fetchPage(rawUrl);
  const root = parse(page.html, { comment: false });
  const issues: string[] = [];
  const passed: string[] = [];
  const kw = keyword?.trim().toLowerCase() || "";

  const loadTimeS = Math.round(page.loadMs / 10) / 100;
  const pageSizeKb = Math.round((page.bytes / 1024) * 10) / 10;

  if (page.status >= 400) issues.push(`Page returns HTTP ${page.status}`);
  if (page.redirects.length > 0) {
    issues.push(`URL redirects ${page.redirects.length}× before loading (link to the final URL instead)`);
  }

  // TITLE
  const title = root.querySelector("title")?.text.trim() ?? "";
  if (!title) issues.push("Missing title tag");
  else if (title.length > 60) issues.push(`Title too long (${title.length} chars)`);
  else if (title.length < 20) issues.push("Title too short");
  else passed.push("Title length OK");
  if (kw && !title.toLowerCase().includes(kw)) issues.push("Keyword not in title");

  // META DESCRIPTION
  const desc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
  if (!desc) issues.push("Missing meta description");
  else if (desc.length > 160) issues.push(`Meta description too long (${desc.length} chars)`);
  else passed.push("Meta description OK");

  // H1 / H2
  const h1s = root.querySelectorAll("h1");
  if (h1s.length === 0) issues.push("Missing H1");
  else if (h1s.length > 1) issues.push(`Multiple H1 tags (${h1s.length})`);
  else passed.push("Single H1 present");
  const h2Count = root.querySelectorAll("h2").length;
  if (h2Count === 0) issues.push("No H2 subheadings");

  // IMAGES
  const images = root.querySelectorAll("img");
  const imagesNoAlt = images.filter((i) => !i.getAttribute("alt")?.trim()).length;
  if (imagesNoAlt) issues.push(`${imagesNoAlt}/${images.length} images missing alt text`);
  else if (images.length) passed.push("All images have alt text");

  // CANONICAL
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() ?? "";
  if (!canonical) issues.push("Missing canonical tag");
  else {
    const absolute = new URL(canonical, page.finalUrl).href;
    if (absolute.replace(/\/$/, "") === page.finalUrl.replace(/\/$/, "")) passed.push("Canonical present and points to this page");
    else issues.push(`Canonical points to a different URL: ${absolute}`);
  }

  // VIEWPORT
  if (!root.querySelector('meta[name="viewport"]')) issues.push("Missing viewport meta (not mobile-friendly)");
  else passed.push("Viewport tag present");

  // SCHEMA
  const types = schemaTypes(root);
  if (!types.length) issues.push("No structured data (JSON-LD)");
  else passed.push(`${types.length} schema(s) found`);

  // OPEN GRAPH
  if (!root.querySelector('meta[property="og:title"]')) issues.push("Missing og:title");
  if (!root.querySelector('meta[property="og:image"]')) issues.push("Missing og:image");

  // LINKS (before stripping nav/footer — they count as site links too)
  const host = new URL(page.finalUrl).host;
  let internalLinks = 0;
  let externalLinks = 0;
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href")!.trim();
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      if (new URL(href, page.finalUrl).host === host) internalLinks++;
      else externalLinks++;
    } catch {
      /* ignore malformed hrefs */
    }
  }

  // CONTENT (main text only, like the original: no scripts, nav, header, footer)
  for (const el of root.querySelectorAll("script, style, noscript, nav, footer, header")) el.remove();
  const text = root.querySelector("body")?.structuredText.replace(/\s+/g, " ").trim() ?? "";
  const words = text.match(WORD) ?? [];
  if (words.length < 300) issues.push(`Thin content (${words.length} words)`);
  else if (words.length >= 1000) passed.push(`Good content length (${words.length} words)`);

  // SPEED
  if (loadTimeS > 3) issues.push(`Slow response (${loadTimeS}s)`);
  else if (loadTimeS < 1) passed.push(`Fast response (${loadTimeS}s)`);
  if (pageSizeKb > 500) issues.push(`Large page (${pageSizeKb}KB)`);

  // KEYWORD
  let keywordFrequency: number | undefined;
  let keywordDensity: number | undefined;
  if (kw) {
    keywordFrequency = text.toLowerCase().split(kw).length - 1;
    keywordDensity = Math.round(((keywordFrequency * kw.split(/\s+/).length) / Math.max(words.length, 1)) * 10000) / 100;
    if (keywordFrequency === 0) issues.push("Target keyword not found in content");
  }

  const score = Math.max(0, 100 - issues.length * 7);
  return {
    url: page.requestedUrl,
    finalUrl: page.finalUrl,
    statusCode: page.status,
    redirects: page.redirects,
    loadTimeS,
    pageSizeKb,
    metrics: {
      title,
      titleLength: title.length,
      metaDescription: desc,
      metaDescriptionLength: desc.length,
      h1Count: h1s.length,
      h1Text: h1s[0]?.text.trim().slice(0, 120) ?? "",
      h2Count,
      wordCount: words.length,
      images: images.length,
      imagesNoAlt,
      canonical,
      schemaTypes: types,
      internalLinks,
      externalLinks,
      keywordFrequency,
      keywordDensity,
    },
    passed,
    issues,
    score,
    grade: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D",
  };
}
