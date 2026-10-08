import { loadPage, headingsOf, jsonLdObjects, schemaType, urlList, cleanText } from "../html";
import type { Cell, ReportSection, ToolReport } from "../types";
import { type Runner, str, need, perUrl, grade, round } from "./util";

// Technical SEO tools, part 1 — ports of meta_tag_analyzer.py +
// social_preview_validator.py, heading_analyzer.py, image_seo_analyzer.py,
// canonical_checker.py, redirect_chain_checker.py, schema_extractor.py,
// serp_feature_analyzer.py and serp_snippet_previewer.py.

const urlsOf = (v: unknown, max = 20) => need(urlList(v, max), "Enter at least one URL.");

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

export const scoreAndGrade = (issueCount: number, perIssue: number): Pick<ToolReport, "score" | "grade"> => {
  const score = Math.max(0, 100 - issueCount * perIssue);
  return { score, grade: grade(score) };
};
