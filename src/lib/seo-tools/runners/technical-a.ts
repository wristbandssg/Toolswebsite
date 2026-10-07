import { loadPage, headingsOf, jsonLdObjects, schemaType, metaContent, urlList, cleanText } from "../html";
import { traceRedirects } from "../fetch-page";
import type { Cell, ReportSection, ToolReport } from "../types";
import { type Runner, str, need, perUrl, grade, round } from "./util";

// Technical SEO tools, part 1 — ports of meta_tag_analyzer.py +
// social_preview_validator.py, heading_analyzer.py, image_seo_analyzer.py,
// canonical_checker.py, redirect_chain_checker.py, schema_extractor.py,
// serp_feature_analyzer.py and serp_snippet_previewer.py.

const urlsOf = (v: unknown, max = 20) => need(urlList(v, max), "Enter at least one URL.");

/** Meta & Social Tags (meta_tag_analyzer + social_preview_validator). */
export const metaSocialTags: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls), async (url) => {
    const { root, title, metaDescription, page } = await loadPage(url);
    const issues: string[] = [];
    if (!title) issues.push("Missing title tag");
    else if (title.length > 60) issues.push(`Title too long (${title.length} chars, aim <60)`);
    else if (title.length < 20) issues.push(`Title too short (${title.length} chars)`);
    if (!metaDescription) issues.push("Missing meta description");
    else if (metaDescription.length > 160) issues.push(`Meta description too long (${metaDescription.length} chars, aim <160)`);
    else if (metaDescription.length < 50) issues.push(`Meta description too short (${metaDescription.length} chars)`);
    const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    if (!canonical) issues.push("Missing canonical URL");
    const robots = metaContent(root, 'meta[name="robots"]');
    if (/noindex/i.test(robots)) issues.push("Page is noindexed");
    const og = (p: string) => metaContent(root, `meta[property="og:${p}"]`);
    const tw = (p: string) => metaContent(root, `meta[name="twitter:${p}"], meta[property="twitter:${p}"]`);
    if (!og("title")) issues.push("Missing og:title");
    else if (og("title").length > 95) issues.push(`og:title too long (${og("title").length} chars)`);
    if (!og("description")) issues.push("Missing og:description");
    if (!og("image")) issues.push("Missing og:image (critical for social sharing)");
    if (!og("url")) issues.push("Missing og:url");
    if (!og("type")) issues.push("Missing og:type");
    if (!tw("card")) issues.push("Missing twitter:card");
    const schemas = jsonLdObjects(root);
    if (!schemas.length) issues.push("No structured data (JSON-LD) found");
    const h1s = root.querySelectorAll("h1");
    if (!h1s.length) issues.push("Missing H1");
    else if (h1s.length > 1) issues.push(`Multiple H1 tags (${h1s.length})`);
    if (!root.querySelector('meta[name="viewport"]')) issues.push("Missing viewport meta tag");
    return {
      finalUrl: page.finalUrl,
      title,
      metaDescription,
      canonical,
      robots,
      og: { title: og("title"), description: og("description"), image: og("image"), url: og("url"), type: og("type") },
      twitterCard: tw("card"),
      schemaTypes: schemas.map((s) => schemaType(s.data)).filter(Boolean),
      lang: root.querySelector("html")?.getAttribute("lang") ?? "",
      h1: cleanText(h1s[0]).slice(0, 80),
      issues,
    };
  });

  const ok = results.filter((r) => r.ok);
  return {
    headline: `${results.length} page(s) checked`,
    stats: [
      { label: "Pages", value: results.length },
      { label: "With issues", value: ok.filter((r) => r.value.issues.length).length },
      { label: "Failed to load", value: results.length - ok.length },
    ],
    sections: [
      {
        kind: "table",
        title: "Tags per page",
        columns: ["URL", "Title", "Title len", "Meta desc len", "Canonical", "og:image", "twitter:card", "Schema", "Lang", "Issues"],
        rows: results.map((r): Cell[] =>
          r.ok
            ? [r.url, r.value.title, r.value.title.length, r.value.metaDescription.length, r.value.canonical || "—", r.value.og.image ? "yes" : "no", r.value.twitterCard || "—", r.value.schemaTypes.join(", ") || "—", r.value.lang || "—", r.value.issues.length]
            : [r.url, `Failed: ${r.error}`, "", "", "", "", "", "", "", ""]
        ),
      },
      ...ok.map((r) => ({
        kind: "list" as const,
        title: `Issues — ${r.url}`,
        tone: "bad" as const,
        items: r.value.issues.length ? r.value.issues : ["No issues found."],
      })),
    ],
  };
};

/** Heading Structure (heading_analyzer). */
export const headingStructure: Runner = async (input) => {
  const kw = str(input.keyword).toLowerCase();
  const results = await perUrl(urlsOf(input.urls, 10), async (url) => {
    const { root } = await loadPage(url);
    const hs = headingsOf(root);
    const issues: [string, string][] = [];
    const h1s = hs.filter((h) => h.level === 1);
    if (!h1s.length) issues.push(["ERROR", "Missing H1 tag"]);
    else if (h1s.length > 1) issues.push(["WARNING", `Multiple H1 tags (${h1s.length}) — use only one`]);
    const levels = [...new Set(hs.map((h) => h.level))].sort();
    for (let i = 0; i + 1 < levels.length; i++) if (levels[i + 1] - levels[i] > 1) issues.push(["WARNING", `Heading level skip: H${levels[i]} → H${levels[i + 1]}`]);
    for (let i = 1; i < hs.length; i++) if (hs[i].level > hs[i - 1].level + 1) issues.push(["INFO", `Jump from ${hs[i - 1].tag} to ${hs[i].tag}: "${hs[i].text.slice(0, 50)}"`]);
    if (kw) {
      if (h1s.length && !h1s.some((h) => h.text.toLowerCase().includes(kw))) issues.push(["WARNING", `H1 doesn't contain the keyword "${kw}"`]);
      const h2s = hs.filter((h) => h.level === 2);
      if (h2s.length && !h2s.some((h) => h.text.toLowerCase().includes(kw))) issues.push(["INFO", `No H2 contains the keyword "${kw}"`]);
    }
    for (const h of hs) {
      if (!h.text) issues.push(["ERROR", `Empty ${h.tag} tag found`]);
      else if (h.text.length > 70) issues.push(["INFO", `${h.tag} is long (${h.text.length} chars): "${h.text.slice(0, 50)}…"`]);
    }
    if (h1s.length && !hs.some((h) => h.level === 2)) issues.push(["WARNING", "No H2 subheadings — add section structure"]);
    return { hs, issues };
  });

  return {
    headline: `${results.length} page(s) checked`,
    sections: results.flatMap((r): ReportSection[] =>
      r.ok
        ? [
            {
              kind: "table" as const,
              title: `Hierarchy — ${r.url}`,
              columns: ["Tag", "Text"],
              rows: r.value.hs.map((h): Cell[] => [h.tag, `${"   ".repeat(h.level - 1)}${h.text}`]),
            },
            { kind: "list" as const, title: `Issues — ${r.url}`, tone: "bad" as const, items: r.value.issues.length ? r.value.issues.map(([s, m]) => `[${s}] ${m}`) : ["No issues found."] },
          ]
        : [{ kind: "text" as const, title: r.url, text: `Failed: ${r.error}` }]
    ),
  };
};

/** Image SEO (image_seo_analyzer). */
export const imageSeo: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 10), async (url) => {
    const { root, page } = await loadPage(url);
    return root.querySelectorAll("img").map((img) => {
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      let full = "";
      try {
        full = src ? new URL(src, page.finalUrl).href : "";
      } catch {
        full = src;
      }
      const isData = full.startsWith("data:");
      const filename = isData ? "(embedded data URI)" : full ? decodeURIComponent(new URL(full).pathname.split("/").pop() ?? "") : "";
      const ext = isData ? full.slice(5, full.indexOf(";")).split("/")[1] ?? "" : filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
      const alt = img.getAttribute("alt");
      const issues: string[] = [];
      if (alt == null) issues.push("missing alt attribute");
      else if (!alt.trim()) issues.push("empty alt text");
      else if (alt.length > 125) issues.push(`alt too long (${alt.length} chars)`);
      if (!img.getAttribute("width") || !img.getAttribute("height")) issues.push("missing width/height");
      if (["bmp", "tiff"].includes(ext)) issues.push(`unoptimized format (${ext})`);
      if (/^(img|image|photo|pic|screenshot)\d*\./i.test(filename)) issues.push("generic filename");
      if (filename.includes("_")) issues.push("use hyphens not underscores in filename");
      if (isData && full.length > 20_000) issues.push(`large embedded image (${round(full.length / 1024, 0)} KB inside the HTML)`);
      const lazy = img.getAttribute("loading") === "lazy" || img.getAttribute("data-src") != null;
      return { page: url, src: isData ? `data:${ext} (${round(full.length / 1024, 0)} KB)` : full.slice(0, 120), filename, ext, alt: (alt ?? "").slice(0, 80), lazy, issues };
    });
  });

  const all = results.flatMap((r) => (r.ok ? r.value : []));
  const total = all.length || 1;
  const formats = new Map<string, number>();
  for (const i of all) formats.set(i.ext || "unknown", (formats.get(i.ext || "unknown") ?? 0) + 1);
  return {
    headline: `${all.length} image(s) on ${results.length} page(s)`,
    stats: [
      { label: "Missing alt", value: `${all.filter((i) => i.issues.includes("missing alt attribute")).length}/${all.length}` },
      { label: "Empty alt", value: `${all.filter((i) => i.issues.includes("empty alt text")).length}/${all.length}` },
      { label: "No width/height", value: `${round((all.filter((i) => i.issues.includes("missing width/height")).length / total) * 100, 0)}%` },
      { label: "Not lazy-loaded", value: `${round((all.filter((i) => !i.lazy).length / total) * 100, 0)}%` },
      { label: "With issues", value: all.filter((i) => i.issues.length).length },
    ],
    sections: [
      { kind: "table", title: "Formats", columns: ["Format", "Images"], rows: [...formats].map(([f, n]): Cell[] => [f, n]) },
      {
        kind: "table",
        title: "Images",
        columns: ["Page", "Image", "Alt text", "Lazy", "Issues"],
        rows: all.map((i): Cell[] => [i.page, i.src, i.alt || "—", i.lazy ? "yes" : "no", i.issues.join("; ") || "OK"]),
      },
      ...results.filter((r) => !r.ok).map((r) => ({ kind: "text" as const, title: r.url, text: `Failed: ${(r as { error: string }).error}` })),
    ],
  };
};

/** Canonical Check (canonical_checker). */
export const canonicalCheck: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 30), async (url) => {
    const { root, page } = await loadPage(url);
    let canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() ?? "";
    if (canonical) canonical = new URL(canonical, page.finalUrl).href;
    const header = page.headers.get("link")?.match(/<([^>]+)>;\s*rel="?canonical"?/i)?.[1] ?? "";
    const issues: string[] = [];
    const strip = (u: string) => u.replace(/\/$/, "");
    if (!canonical && !header) issues.push("No canonical tag found");
    else if (canonical) {
      if (new URL(canonical).host !== new URL(page.finalUrl).host) issues.push(`Cross-domain canonical: ${canonical}`);
      else if (strip(canonical) !== strip(page.finalUrl)) issues.push(`Points elsewhere: ${canonical}`);
      if (header && strip(header) !== strip(canonical)) issues.push("HTML and HTTP header canonicals conflict");
    }
    if (page.redirects.length) issues.push(`URL redirects (${page.redirects.length}×) to ${page.finalUrl}`);
    return { finalUrl: page.finalUrl, status: page.status, canonical, header, selfRef: !!canonical && strip(canonical) === strip(page.finalUrl), issues };
  });
  const ok = results.filter((r) => r.ok);
  return {
    headline: `${results.length} page(s) checked`,
    stats: [
      { label: "With issues", value: results.filter((r) => !r.ok || r.value.issues.length).length },
      { label: "Missing", value: ok.filter((r) => r.value.issues.includes("No canonical tag found")).length },
      { label: "Self-referencing", value: ok.filter((r) => r.value.selfRef).length },
      { label: "Cross-domain", value: ok.filter((r) => r.value.issues.some((i) => i.startsWith("Cross-domain"))).length },
    ],
    sections: [
      {
        kind: "table",
        title: "Canonicals",
        columns: ["URL", "Final URL", "Status", "Canonical", "Self-referencing", "Issues"],
        rows: results.map((r): Cell[] =>
          r.ok ? [r.url, r.value.finalUrl, r.value.status, r.value.canonical || "NONE", r.value.selfRef ? "yes" : "no", r.value.issues.join("; ") || "OK"] : [r.url, "", 0, "", "", `Error: ${r.error}`]
        ),
      },
    ],
  };
};

/** Redirect Chains (redirect_chain_checker). */
export const redirectChains: Runner = async (input) => {
  const urls = urlsOf(input.urls, 50);
  const results = await Promise.all(
    urls.map(async (url) => {
      const chain = await traceRedirects(url);
      const hops = chain.filter((h) => typeof h.status === "number" && h.status >= 300 && h.status < 400).length;
      const issues: string[] = [];
      if (hops >= 3) issues.push(`Long chain (${hops} hops)`);
      if (chain.some((h) => h.status === "LOOP")) issues.push("Redirect loop detected");
      const protocols = new Set(chain.map((h) => h.url.split(":")[0]));
      if (protocols.has("http") && protocols.has("https")) issues.push("Mixed HTTP/HTTPS in chain");
      const temp = chain.filter((h) => h.status === 302 || h.status === 307).length;
      if (temp) issues.push(`${temp} temporary redirect(s) (should be 301?)`);
      const last = chain[chain.length - 1];
      if (typeof last.status === "number" && last.status >= 400) issues.push(`Chain ends in ${last.status} error`);
      if (typeof last.status === "string") issues.push(last.status);
      return { url, chain, hops, issues };
    })
  );
  return {
    headline: `${urls.length} URL(s) traced`,
    stats: [{ label: "With issues", value: results.filter((r) => r.issues.length).length }],
    sections: [
      {
        kind: "table",
        title: "Redirect chains",
        columns: ["URL", "Hops", "Final status", "Final URL", "Chain", "Issues"],
        rows: results.map((r): Cell[] => {
          const last = r.chain[r.chain.length - 1];
          return [r.url, r.hops, String(last.status), last.url, r.chain.map((h) => `[${h.status}] ${h.url}`).join(" → "), r.issues.join("; ") || "OK"];
        }),
      },
    ],
  };
};

const RECOMMENDED_PROPS: Record<string, string[]> = {
  Article: ["headline", "author", "datePublished", "image", "publisher"],
  BlogPosting: ["headline", "author", "datePublished", "image", "publisher"],
  Product: ["name", "image", "description", "offers", "review", "aggregateRating"],
  LocalBusiness: ["name", "address", "telephone", "openingHours", "geo"],
  FAQPage: ["mainEntity"],
  HowTo: ["name", "step", "totalTime"],
  BreadcrumbList: ["itemListElement"],
  Organization: ["name", "url", "logo", "sameAs"],
  Person: ["name", "url", "jobTitle"],
  ProfilePage: ["mainEntity"],
  WebSite: ["url", "name", "potentialAction"],
  Review: ["itemReviewed", "reviewRating", "author"],
};

/** Schema Validator (schema_extractor): JSON-LD and Microdata, with completeness against recommended properties. */
export const schemaValidator: Runner = async (input) => {
  const results = await perUrl(urlsOf(input.urls, 10), async (url) => {
    const { root } = await loadPage(url);
    const jsonld = jsonLdObjects(root).map(({ data, error }) => {
      const type = schemaType(data);
      const rec = RECOMMENDED_PROPS[type] ?? [];
      const present = rec.filter((p) => p in data);
      return { format: "JSON-LD", type: error ? "(invalid)" : type || "(no @type)", present, missing: rec.filter((p) => !(p in data)), completeness: rec.length ? round((present.length / rec.length) * 100) : 100, error, raw: error ? "" : JSON.stringify(data, null, 2).slice(0, 1500) };
    });
    const microdata = root.querySelectorAll("[itemscope]").map((el) => {
      const type = (el.getAttribute("itemtype") ?? "").split("/").pop() ?? "";
      const props = el.querySelectorAll("[itemprop]").map((p) => p.getAttribute("itemprop") ?? "");
      const rec = RECOMMENDED_PROPS[type] ?? [];
      const present = rec.filter((p) => props.includes(p));
      return { format: "Microdata", type, present, missing: rec.filter((p) => !props.includes(p)), completeness: rec.length ? round((present.length / rec.length) * 100) : 100, error: undefined, raw: "" };
    });
    return [...jsonld, ...microdata];
  });
  const rows = results.flatMap((r) => (r.ok ? r.value.map((s) => ({ url: r.url, ...s })) : []));
  return {
    headline: `${rows.length} structured data item(s) on ${results.length} page(s)`,
    issues: [
      ...results.filter((r) => r.ok && !r.value.length).map((r) => `${r.url}: no structured data found`),
      ...rows.filter((s) => s.error).map((s) => `${s.url}: ${s.error}`),
      ...results.filter((r) => !r.ok).map((r) => `${r.url}: failed — ${(r as { error: string }).error}`),
    ],
    sections: [
      {
        kind: "table",
        title: "Schemas",
        columns: ["Page", "Format", "Type", "Completeness %", "Present", "Missing"],
        rows: rows.map((s): Cell[] => [s.url, s.format, s.type, s.completeness, s.present.join(", ") || "—", s.missing.join(", ") || "—"]),
      },
      ...rows.filter((s) => s.raw).map((s) => ({ kind: "code" as const, title: `${s.type} — ${s.url}`, code: s.raw })),
    ],
  };
};

/** SERP Features (serp_feature_analyzer): eligibility scores for rich results. */
export const serpFeatures: Runner = async (input) => {
  const url = need(str(input.url), "Enter a URL.");
  const { root } = await loadPage(url);
  const types = jsonLdObjects(root).map((s) => schemaType(s.data));
  const has = (t: string) => types.includes(t);
  const features: { feature: string; score: number; tips: string[] }[] = [];

  // Featured snippet
  {
    let score = 0;
    const tips: string[] = [];
    const paras = root.querySelectorAll("p").map(cleanText).filter((t) => t.length > 30 && t.length < 300);
    if (paras.length) (score += 20), tips.push("Has concise paragraphs suitable for paragraph snippets");
    else tips.push("Add a concise 40–60 word paragraph answering the main question");
    const items = root.querySelectorAll("ul li, ol li").length;
    if (items >= 3) (score += 20), tips.push(`Has ${items} list items (good for list snippets)`);
    const tables = root.querySelectorAll("table").length;
    if (tables) (score += 20), tips.push(`Has ${tables} table(s) (good for table snippets)`);
    const qH2 = root.querySelectorAll("h2").filter((h) => /^(what|how|why|when|who|which|where)\b/i.test(cleanText(h))).length;
    if (qH2) (score += 20), tips.push(`${qH2} question-style H2s found`);
    else tips.push("Add question-style H2s (What is X?, How to Y?)");
    features.push({ feature: "Featured Snippet", score: Math.min(score, 80), tips });
  }
  // FAQ
  {
    let score = 0;
    const tips: string[] = [];
    if (has("FAQPage")) (score += 50), tips.push("FAQPage schema present");
    else tips.push("Add FAQPage JSON-LD schema for FAQ rich results");
    const qs = (root.text.match(/\?/g) ?? []).length;
    if (qs >= 3) (score += 20), tips.push(`${qs} questions found in content`);
    features.push({ feature: "FAQ Rich Result", score: Math.min(score, 80), tips });
  }
  // HowTo
  {
    let score = has("HowTo") ? 50 : 0;
    const tips: string[] = [];
    if (root.querySelector("ol")) (score += 20), tips.push("Has ordered lists (suitable for steps)");
    const stepH2 = root.querySelectorAll("h2").filter((h) => /step\s*\d|how to/i.test(cleanText(h))).length;
    if (stepH2) (score += 10), tips.push(`${stepH2} step-related headings found`);
    if (score < 50) tips.push("Add HowTo schema with step-by-step structured data");
    features.push({ feature: "How-To Rich Result", score: Math.min(score, 80), tips });
  }
  // Review
  {
    const objs = jsonLdObjects(root).map((s) => s.data);
    let score = 0;
    for (const d of objs) if (["Review", "Product"].includes(schemaType(d))) score += 50 + ("aggregateRating" in d ? 20 : 0);
    features.push({ feature: "Review Stars", score: Math.min(score, 80), tips: score ? [] : ["Add Review/Product schema with ratings for star snippets"] });
  }
  // Breadcrumbs
  {
    let score = has("BreadcrumbList") ? 60 : 0;
    if (root.querySelector('nav[aria-label="Breadcrumb" i], nav[aria-label*="breadcrumb" i]')) score += 20;
    features.push({ feature: "Breadcrumbs", score: Math.min(score, 80), tips: score ? ["BreadcrumbList found"] : ["Add BreadcrumbList schema for breadcrumb navigation"] });
  }
  // Video
  {
    const videos = root.querySelectorAll("video").length + root.querySelectorAll("iframe").filter((f) => /youtube|vimeo/i.test(f.getAttribute("src") ?? "")).length;
    let score = videos ? 30 : 0;
    if (has("VideoObject")) score += 40;
    features.push({ feature: "Video Result", score: Math.min(score, 80), tips: videos ? [`${videos} video embed(s) found`] : ["Embed a video and add VideoObject schema"] });
  }

  return {
    headline: `SERP feature eligibility for ${url}`,
    sections: [
      {
        kind: "table",
        title: "Features (score out of 80)",
        columns: ["Feature", "Score", "Rating", "Tips"],
        rows: features.map((f): Cell[] => [f.feature, f.score, f.score >= 60 ? "🟢 likely" : f.score >= 30 ? "🟡 possible" : "🔴 unlikely", f.tips.join("; ")]),
      },
    ],
  };
};

/** SERP Snippet Preview (serp_snippet_previewer). */
export const serpSnippet: Runner = async (input) => {
  const url = str(input.url);
  let title = str(input.title);
  let description = str(input.description);
  let breadcrumb = str(input.display);
  let date = "";
  if (url) {
    const { root, page } = await loadPage(url);
    title ||= cleanText(root.querySelector("title"));
    description ||= metaContent(root, 'meta[name="description"]');
    const u = new URL(page.finalUrl);
    breadcrumb ||= [u.host, ...u.pathname.split("/").filter(Boolean)].join(" › ");
    date = root.querySelector("time[datetime]")?.getAttribute("datetime")?.slice(0, 10) ?? "";
  }
  need(title || url, "Enter a URL, or a title and description.");
  const issues: string[] = [];
  if (title.length > 60) issues.push(`Title will be truncated (${title.length} chars, aim ≤60)`);
  if (title.length < 30) issues.push(`Title too short (${title.length} chars, aim 30–60)`);
  if (!description) issues.push("No meta description — Google will write its own snippet");
  else if (description.length > 155) issues.push(`Description will be truncated (${description.length} chars, aim ≤155)`);
  else if (description.length < 70) issues.push(`Description too short (${description.length} chars, aim 70–155)`);
  const shownTitle = title.length > 60 ? `${title.slice(0, 60)}…` : title;
  const shownDesc = description ? (description.length > 155 ? `${description.slice(0, 155)}…` : description) : "[Google will generate a snippet from the page content]";
  return {
    headline: "How the result may look in Google",
    stats: [
      { label: "Title length", value: `${title.length} chars` },
      { label: "Title width (est.)", value: `${Math.round(title.length * 8.5)}px of ~600px` },
      { label: "Description length", value: `${description.length} chars` },
    ],
    issues,
    sections: [{ kind: "code", title: "Preview", code: `${breadcrumb}\n${shownTitle}\n${date ? `${date} — ` : ""}${shownDesc}` }],
  };
};

export const scoreAndGrade = (issueCount: number, perIssue: number): Pick<ToolReport, "score" | "grade"> => {
  const score = Math.max(0, 100 - issueCount * perIssue);
  return { score, grade: grade(score) };
};
