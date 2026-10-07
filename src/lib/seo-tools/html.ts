import { parse, type HTMLElement } from "node-html-parser";
import { fetchPage, type FetchedPage } from "./fetch-page";

// HTML helpers shared by the SEO tools — the BeautifulSoup parts of the
// Python originals.

export interface LoadedPage {
  page: FetchedPage;
  /** The full document. */
  root: HTMLElement;
  title: string;
  metaDescription: string;
  /** Visible text with scripts/styles removed (header/nav/footer kept). */
  fullText: string;
  /** Main content text: also without header, nav, footer, aside. */
  mainText: string;
}

const BOILERPLATE = "script, style, noscript, template, svg, nav, footer, header, aside";

export function parseHtml(html: string): HTMLElement {
  return parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } });
}

export function cleanText(el: HTMLElement | null | undefined): string {
  return (el?.text ?? "").replace(/\s+/g, " ").trim();
}

/** Text of `html` with the given elements removed (default: scripts and styles only). */
export function textWithout(html: string, remove = "script, style, noscript, template, svg"): string {
  const root = parseHtml(html);
  for (const el of root.querySelectorAll(remove)) el.remove();
  return cleanText(root.querySelector("body") ?? root);
}

export function pageTitle(root: HTMLElement): string {
  return cleanText(root.querySelector("title"));
}

export function metaContent(root: HTMLElement, selector: string): string {
  return root.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
}

export async function loadPage(url: string): Promise<LoadedPage> {
  const page = await fetchPage(url);
  const root = parseHtml(page.html);
  return {
    page,
    root,
    title: pageTitle(root),
    metaDescription: metaContent(root, 'meta[name="description"]'),
    fullText: textWithout(page.html),
    mainText: textWithout(page.html, BOILERPLATE),
  };
}

export function headingsOf(root: HTMLElement, levels = "h1, h2, h3, h4, h5, h6"): { level: number; tag: string; text: string }[] {
  return root.querySelectorAll(levels).map((h) => ({ level: Number(h.tagName[1]), tag: h.tagName.toUpperCase(), text: cleanText(h) }));
}

export interface PageLink {
  href: string; // absolute
  anchor: string;
  internal: boolean;
  rel: string[];
  isImage: boolean;
}

export function linksOf(root: HTMLElement, baseUrl: string): PageLink[] {
  const host = new URL(baseUrl).host;
  const out: PageLink[] = [];
  for (const a of root.querySelectorAll("a[href]")) {
    const raw = a.getAttribute("href")!.trim();
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(raw)) continue;
    let abs: URL;
    try {
      abs = new URL(raw, baseUrl);
    } catch {
      continue;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
    abs.hash = "";
    out.push({
      href: abs.href,
      anchor: cleanText(a).slice(0, 100),
      internal: abs.host === host,
      rel: (a.getAttribute("rel") ?? "").toLowerCase().split(/\s+/).filter(Boolean),
      isImage: !!a.querySelector("img"),
    });
  }
  return out;
}

/** Every JSON-LD object on the page (arrays and @graph flattened). */
export function jsonLdObjects(root: HTMLElement): { data: Record<string, unknown>; error?: string }[] {
  const out: { data: Record<string, unknown>; error?: string }[] = [];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.text);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      for (const item of items) if (item && typeof item === "object") out.push({ data: item });
    } catch (e) {
      out.push({ data: {}, error: `Invalid JSON-LD: ${(e as Error).message.slice(0, 80)}` });
    }
  }
  return out;
}

export function schemaType(data: Record<string, unknown>): string {
  const t = data["@type"];
  return Array.isArray(t) ? String(t[0] ?? "") : String(t ?? "");
}

/** Normalizes a list of URLs typed by the admin: trims, drops blanks and duplicates, caps the count. */
export function urlList(value: unknown, max = 20): string[] {
  const list = (Array.isArray(value) ? value : String(value ?? "").split(/[\n,]+/)).map((s) => String(s).trim()).filter(Boolean);
  return [...new Set(list)].slice(0, max);
}

/** A page's date signals: <time datetime>, article/og meta dates, HTTP Last-Modified. */
export function dateSignals(root: HTMLElement, headers: Headers): { source: string; date: Date }[] {
  const out: { source: string; date: Date }[] = [];
  const push = (source: string, raw: string | null | undefined) => {
    if (!raw) return;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) out.push({ source, date: d });
  };
  push("<time> tag", root.querySelector("time[datetime]")?.getAttribute("datetime"));
  for (const name of ["article:published_time", "article:modified_time", "og:updated_time"]) {
    push(name, root.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute("content"));
  }
  push("HTTP Last-Modified", headers.get("last-modified"));
  return out;
}
