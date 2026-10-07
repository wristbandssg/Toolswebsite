import { SentimentIntensityAnalyzer } from "vader-sentiment";
import { loadPage, headingsOf, cleanText, urlList, metaContent, schemaType } from "../html";
import { sentences, wordCount, letterWords } from "../text";
import { tfidf, topTerms } from "../vectors";
import type { Cell } from "../types";
import { textSource } from "./content-a";
import { type Runner, str, num, bool, lines, need, perUrl, round, ToolInputError } from "./util";

// On-page & content tools, part 2 — ports of meta_description_generator.py,
// title_tag_optimizer.py, faq_schema_generator.py,
// structured_data_generator.py, content_repurposer.py,
// content_length_benchmarker.py, tfidf_extractor.py and sentiment_analyzer.py.

/** Meta Description Generator (meta_description_generator). */
export const metaDescriptionGenerator: Runner = async (input) => {
  const url = need(str(input.url), "Enter a URL.");
  const kw = str(input.keyword).toLowerCase();
  const variants = num(input.variants, 3, 1, 8);
  const p = await loadPage(url);
  const h1 = cleanText(p.root.querySelector("h1"));
  const paras = p.root.querySelectorAll("p").map(cleanText).filter((t) => t.length > 30);
  const sents = sentences(paras.join(" "), 1).filter((s) => s.length > 40 && s.length < 200);
  const cut = (s: string) => (s.length > 155 ? `${s.slice(0, 155).replace(/\s+\S*$/, "")}…` : s);
  const out: { text: string; strategy: string }[] = [];
  const kwSentence = kw && sents.find((s) => s.toLowerCase().includes(kw));
  if (kwSentence) out.push({ text: cut(kwSentence), strategy: "keyword sentence" });
  const opener = h1 || p.title;
  if (opener && paras[0]) {
    let d = `${opener.slice(0, 60)}. ${paras[0].slice(0, 120).replace(/\s+\S*$/, "")}…`;
    if (d.length > 160) d = `${d.slice(0, 157)}…`;
    out.push({ text: d, strategy: "title + intro" });
  }
  sents
    .slice(0, 20)
    .map((s, i) => ({ s, score: (kw && s.toLowerCase().includes(kw) ? 50 : 0) + Math.max(0, 20 - i * 2) + (s.length >= 100 && s.length <= 155 ? 15 : 0) + (/\b(learn|discover|find|guide|best|top|calculate|estimate)\b/i.test(s) ? 10 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .forEach(({ s }) => out.push({ text: cut(s), strategy: "best sentence" }));
  if (kw && paras[0]) {
    const snippet = paras[0].slice(0, 80).replace(/\s+\S*$/, "");
    for (const t of [`Learn about ${kw}. ${snippet}… Read our complete guide.`, `Looking for ${kw}? ${snippet}… Find out more here.`, `Your guide to ${kw}: ${snippet}…`]) if (t.length <= 160) out.push({ text: t, strategy: "template" });
  }
  const unique = [...new Map(out.map((o) => [o.text, o])).values()].slice(0, variants);
  if (!unique.length) throw new ToolInputError("The page doesn't have enough paragraph text to build a description from.");
  return {
    headline: `Current: ${p.metaDescription ? `"${p.metaDescription}" (${p.metaDescription.length} chars)` : "none"}`,
    sections: [
      {
        kind: "table",
        title: "Suggestions",
        columns: ["Description", "Strategy", "Length", "120–160", "Keyword"],
        rows: unique.map((o): Cell[] => [o.text, o.strategy, o.text.length, o.text.length >= 120 && o.text.length <= 160 ? "✅" : "⚠️", kw ? (o.text.toLowerCase().includes(kw) ? "✅" : "❌") : "—"]),
      },
    ],
  };
};

const POWER = new Set("ultimate best top proven free easy quick fast simple complete guide essential powerful amazing incredible secret hack boost instant guaranteed step expert exclusive comprehensive definitive".split(" "));
const NEGATIVE = new Set("worst avoid never mistake wrong bad terrible horrible".split(" "));
const EMOTIONAL = new Set("surprising shocking unbelievable amazing stunning incredible remarkable extraordinary mindblowing heartbreaking".split(" "));

function scoreTitle(title: string, kw: string) {
  const lower = title.toLowerCase();
  const words = new Set(lower.match(/[a-z]+/g) ?? []);
  let score = 50;
  const factors: [string, number][] = [];
  const f = (d: string, p: number) => ((score += p), factors.push([d, p]));
  const len = title.length;
  if (len >= 50 && len <= 60) f("Length: ideal (50–60)", 10);
  else if (len >= 40 && len < 50) f("Length: acceptable", 5);
  else if (len > 60) f("Length: truncated in search results", -5);
  else if (len < 30) f("Length: too short", -10);
  if (/\d/.test(title)) f("Contains a number", 8);
  const pw = [...words].filter((w) => POWER.has(w));
  if (pw.length) f(`Power words: ${pw.join(", ")}`, Math.min(pw.length * 4, 12));
  const ew = [...words].filter((w) => EMOTIONAL.has(w));
  if (ew.length) f(`Emotional triggers: ${ew.join(", ")}`, 5);
  const nw = [...words].filter((w) => NEGATIVE.has(w));
  if (nw.length) f(`Curiosity/negative: ${nw.join(", ")}`, 5);
  if (/\b20\d{2}\b/.test(title)) f("Contains a year (freshness)", 5);
  if (/[[(]/.test(title)) f("Has brackets (CTR boost)", 5);
  if (title.endsWith("?") || /^(how|what|why|when|where|who)\b/i.test(title)) f("Question format", 5);
  if (kw) {
    const pos = lower.indexOf(kw);
    if (pos === 0) f("Keyword at the start", 10);
    else if (pos > 0 && pos < 20) f("Keyword near the start", 5);
    else if (pos >= 20) f("Keyword present but late", 2);
    else f("Target keyword missing", -10);
  }
  if (/ [|—-] /.test(title)) f("Brand separator present", 2);
  if ((title.match(/\b[A-Z]{3,}\b/g) ?? []).length > 2) f("Too many ALL CAPS words", -5);
  score = Math.min(Math.max(score, 0), 100);
  const suggestions: string[] = [];
  if (len > 60) suggestions.push(`Shorten to under 60 characters (now ${len})`);
  if (len < 40) suggestions.push("Add more descriptive words");
  if (!/\d/.test(title)) suggestions.push("Add a number (e.g. '7 Best…', 'Top 10…')");
  if (!pw.length) suggestions.push("Add a power word (best, ultimate, proven, guide)");
  if (!/\b20\d{2}\b/.test(title)) suggestions.push("Add the current year for freshness");
  if (!/[[(]/.test(title)) suggestions.push("Add brackets, e.g. [2026 Guide] or (Free)");
  if (kw && !lower.includes(kw)) suggestions.push(`Include the keyword "${kw}"`);
  if (kw && lower.indexOf(kw) > 20) suggestions.push("Move the keyword closer to the beginning");
  return { score, grade: score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D", factors, suggestions };
}

/** Title Optimizer (title_tag_optimizer). */
export const titleOptimizer: Runner = async (input) => {
  const kw = str(input.keyword).toLowerCase();
  const titles = lines(input.titles, 200);
  for (const url of urlList(input.urls, 20)) titles.push((await loadPage(url)).title);
  need(titles.filter(Boolean), "Enter titles or page URLs.");
  const rows = titles.filter(Boolean).map((t) => ({ t, ...scoreTitle(t, kw) }));
  return {
    sections: [
      {
        kind: "table",
        title: "Titles",
        columns: ["Grade", "Score", "Title", "Length", "Factors", ...(bool(input.suggest) ? ["Suggestions"] : [])],
        rows: rows.map((r): Cell[] => [r.grade, r.score, r.t, r.t.length, r.factors.map(([d, p]) => `${p > 0 ? "+" : ""}${p} ${d}`).join("; "), ...(bool(input.suggest) ? [r.suggestions.join("; ") || "—"] : [])]),
      },
    ],
  };
};

const Q_START = /^(how|what|why|when|where|who|which|can|does|is|are|do|will|should)\b/i;

/** FAQ Schema Generator (faq_schema_generator). */
export const faqSchema: Runner = async (input) => {
  const pairs: { q: string; a: string }[] = [];
  const url = str(input.url);
  if (url) {
    const { root } = await loadPage(url);
    for (const h of root.querySelectorAll("h2, h3, h4, h5, h6")) {
      const q = cleanText(h);
      if (!q.endsWith("?") && !Q_START.test(q)) continue;
      const parts: string[] = [];
      let sib = h.nextElementSibling;
      while (sib && !/^H[1-6]$/.test(sib.tagName)) {
        if (["P", "DIV", "UL", "OL", "BLOCKQUOTE"].includes(sib.tagName)) parts.push(cleanText(sib));
        sib = sib.nextElementSibling;
      }
      const a = parts.join(" ").trim();
      if (a.length > 20) pairs.push({ q, a: a.slice(0, 2000) });
    }
    for (const dt of root.querySelectorAll("dt")) {
      const dd = dt.nextElementSibling;
      if (dd?.tagName === "DD") pairs.push({ q: cleanText(dt), a: cleanText(dd).slice(0, 2000) });
    }
    for (const d of root.querySelectorAll("details")) {
      const summary = d.querySelector("summary");
      if (!summary) continue;
      const q = cleanText(summary);
      const a = cleanText(d).slice(q.length).trim();
      if (q && a) pairs.push({ q, a: a.slice(0, 2000) });
    }
  }
  for (const line of lines(input.manual, 100)) {
    const [q, ...rest] = line.split("|");
    if (q?.trim() && rest.join("|").trim()) pairs.push({ q: q.trim(), a: rest.join("|").trim() });
  }
  const unique = [...new Map(pairs.map((p) => [p.q, p])).values()];
  if (!unique.length) throw new ToolInputError("No question & answer pairs found. Enter a page with FAQ content, or add pairs as 'Question | Answer'.");
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: unique.map((p) => ({ "@type": "Question", name: p.q, acceptedAnswer: { "@type": "Answer", text: p.a } })) };
  return {
    headline: `${unique.length} question & answer pair(s)`,
    sections: [
      { kind: "code", title: 'JSON-LD — paste inside <script type="application/ld+json">', code: JSON.stringify(schema, null, 2) },
      { kind: "table", title: "Pairs", columns: ["Question", "Answer"], rows: unique.map((p): Cell[] => [p.q, p.a.slice(0, 300)]) },
    ],
  };
};

/** Structured Data Generator (structured_data_generator). */
export const structuredData: Runner = async (input) => {
  const type = str(input.type) || "article";
  const url = str(input.url);
  const page = url ? await loadPage(url) : null;
  const h1 = page ? cleanText(page.root.querySelector("h1")) || page.title : "";
  const description = str(input.description) || page?.metaDescription || "";
  const image = page ? metaContent(page.root, 'meta[property="og:image"]') : "";
  const today = new Date().toISOString().slice(0, 10);
  let schema: Record<string, unknown>;
  if (type === "article") {
    const published = page?.root.querySelector("time[datetime]")?.getAttribute("datetime") || (page && metaContent(page.root, 'meta[property="article:published_time"]')) || today;
    schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: str(input.name) || h1,
      description,
      image,
      author: { "@type": "Person", name: str(input.author) || "Author" },
      publisher: { "@type": "Organization", name: str(input.brand) || "Publisher Name", logo: { "@type": "ImageObject", url: "" } },
      datePublished: published,
      dateModified: today,
      mainEntityOfPage: { "@type": "WebPage", "@id": page?.page.finalUrl ?? url },
    };
  } else if (type === "product") {
    schema = { "@context": "https://schema.org", "@type": "Product", name: str(input.name) || h1 || "Product", description, image };
    if (str(input.brand)) schema.brand = { "@type": "Brand", name: str(input.brand) };
    if (str(input.price)) schema.offers = { "@type": "Offer", price: str(input.price), priceCurrency: str(input.currency) || "USD", availability: "https://schema.org/InStock" };
    if (str(input.rating)) schema.aggregateRating = { "@type": "AggregateRating", ratingValue: str(input.rating), reviewCount: "1" };
  } else if (type === "local-business") {
    schema = { "@context": "https://schema.org", "@type": "LocalBusiness", name: str(input.name) || h1, address: { "@type": "PostalAddress", streetAddress: str(input.address) } };
    if (str(input.phone)) schema.telephone = str(input.phone);
  } else if (type === "howto") {
    const steps = page
      ? page.root.querySelectorAll("h2").map((h) => {
          const parts: string[] = [];
          let sib = h.nextElementSibling;
          while (sib && !/^H[12]$/.test(sib.tagName)) {
            if (["P", "DIV"].includes(sib.tagName)) parts.push(cleanText(sib));
            sib = sib.nextElementSibling;
          }
          return { "@type": "HowToStep", name: cleanText(h), text: parts.join(" ").slice(0, 500) };
        }).filter((s) => s.text)
      : [];
    schema = { "@context": "https://schema.org", "@type": "HowTo", name: str(input.name) || h1 || "How-To Guide", description, image, step: steps };
  } else {
    const items = lines(input.breadcrumbs, 20).map((l, i) => {
      const [name, ...rest] = l.split("|");
      return { "@type": "ListItem", position: i + 1, name: name.trim(), item: rest.join("|").trim() };
    });
    need(items, "Add breadcrumb items as 'Name | URL', one per line.");
    schema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
  }
  return { headline: `${schemaType(schema)} schema`, sections: [{ kind: "code", title: 'JSON-LD — paste inside <script type="application/ld+json">', code: JSON.stringify(schema, null, 2) }] };
};

/** Content Repurposer (content_repurposer): pull quotes, social posts, email blurb, key takeaways. */
export const contentRepurposer: Runner = async (input) => {
  const p = await loadPage(need(str(input.url), "Enter a URL."));
  const title = p.title;
  const headings = headingsOf(p.root, "h2, h3");
  const paras = p.root.querySelectorAll("p").map(cleanText).filter((t) => t.length > 40);
  const quotes = paras
    .flatMap((para) => para.split(/(?<=[.!])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 60 && s.length <= 200)
    .map((s) => ({ s, score: (/\b(important|key|essential|critical|best|most|always|never)\b/i.test(s) ? 3 : 0) + (/\b(research|data|study|found|shows|proves)\b/i.test(s) ? 2 : 0) + (/\d+%|\d+ (times|percent|million|billion)/i.test(s) ? 3 : 0) }))
    .filter((q) => q.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((q) => q.s);
  const social: [string, string, string][] = [["Twitter/X", "thread hook", `🧵 ${title}\n\nHere's what you need to know 👇`]];
  for (const h of headings.slice(0, 5)) if (h.text.length < 100) social.push(["Twitter/X", "thread point", `💡 ${h.text}`]);
  const stat = paras.slice(0, 10).find((x) => /\d+%|\d+ (times|percent|x faster|x more)/i.test(x));
  if (stat) social.push(["LinkedIn", "stat highlight", `📊 ${stat.length > 250 ? `${stat.slice(0, 250)}…` : stat}`]);
  if (paras[0]) social.push(["LinkedIn", "promo", `I just published: ${title}\n\nKey insight: ${paras[0].slice(0, 200)}…\n\nFull post in the comments 👇`]);
  const takeaways = [...new Set([
    ...headings.filter((h) => h.text.length < 80).map((h) => h.text),
    ...paras.filter((x) => /^\d+[.)]\s|^•/.test(x)).map((x) => x.slice(0, 100)),
    ...paras.slice(-3).flatMap((x) => x.split(/(?<=[.!])\s+/)).filter((s) => /in conclusion|takeaway|key point|remember|bottom line/i.test(s)).map((s) => s.slice(0, 100)),
  ])].slice(0, 7);
  return {
    headline: title,
    sections: [
      { kind: "list", title: "📌 Pull quotes", items: quotes.length ? quotes : ["No strong quotable sentences found."] },
      { kind: "table", title: "📱 Social posts", columns: ["Platform", "Type", "Post"], rows: social.slice(0, 7).map((s): Cell[] => s) },
      { kind: "code", title: "📧 Email blurb", code: `📝 New Post: ${title}\n\n${(paras[0] ?? "").slice(0, 200)}…\n\n[Read the full article →]` },
      { kind: "list", title: "✅ Key takeaways", items: takeaways.length ? takeaways : ["None found."] },
    ],
  };
};

const BENCH_METRICS = ["words", "sentences", "paragraphs", "h2", "h3", "images", "lists", "tables"] as const;

/** Content Length Benchmark (content_length_benchmarker). */
export const contentLengthBenchmark: Runner = async (input) => {
  const comps = need(urlList(input.competitorUrls, 10), "Enter competitor URLs.");
  const measure = async (url: string) => {
    const p = await loadPage(url);
    const sents = sentences(p.mainText, 6);
    const words = wordCount(p.mainText);
    return {
      words,
      sentences: sents.length,
      paragraphs: p.root.querySelectorAll("p").filter((x) => cleanText(x).length > 20).length,
      h2: p.root.querySelectorAll("h2").length,
      h3: p.root.querySelectorAll("h3").length,
      images: p.root.querySelectorAll("img").length,
      lists: p.root.querySelectorAll("ul, ol").length,
      tables: p.root.querySelectorAll("table").length,
      avgSentence: round(words / Math.max(sents.length, 1)),
    };
  };
  const compResults = await perUrl(comps, measure);
  const ok = compResults.filter((r) => r.ok).map((r) => (r as { value: Awaited<ReturnType<typeof measure>> }).value);
  if (!ok.length) throw new ToolInputError("None of the competitor pages could be loaded.");
  const mine = str(input.myUrl) ? await measure(str(input.myUrl)) : null;
  const stat = (m: (typeof BENCH_METRICS)[number]) => {
    const v = ok.map((p) => p[m]).sort((a, b) => a - b);
    const q = (p: number) => {
      const i = (v.length - 1) * p;
      return v[Math.floor(i)] + (v[Math.ceil(i)] - v[Math.floor(i)]) * (i - Math.floor(i));
    };
    return { min: v[0], max: v[v.length - 1], avg: round(v.reduce((a, b) => a + b, 0) / v.length), median: round(q(0.5)), p75: round(q(0.75)) };
  };
  const tips: string[] = [];
  if (mine) {
    if (mine.words < stat("words").avg) tips.push(`📝 Increase word count to ~${Math.round(stat("words").p75)} words (+${Math.round(stat("words").p75 - mine.words)})`);
    if (mine.h2 < stat("h2").avg) tips.push(`📋 Add more H2 subheadings (target: ${Math.round(stat("h2").avg)})`);
    if (mine.images < stat("images").avg) tips.push(`🖼️ Add more images (target: ${Math.round(stat("images").avg)})`);
    if (mine.lists < stat("lists").avg) tips.push(`📌 Add lists for scannability (target: ${Math.round(stat("lists").avg)})`);
  }
  return {
    headline: `Benchmarked against ${ok.length} competitor page(s)`,
    issues: tips.length ? tips : undefined,
    sections: [
      {
        kind: "table",
        title: "Benchmarks",
        columns: ["Metric", "Min", "Avg", "Median", "P75", "Max", ...(mine ? ["Yours", "Gap vs avg"] : [])],
        rows: BENCH_METRICS.map((m): Cell[] => {
          const s = stat(m);
          return [m, s.min, s.avg, s.median, s.p75, s.max, ...(mine ? [mine[m], `${mine[m] - s.avg >= 0 ? "✅ +" : "⚠️ "}${round(mine[m] - s.avg)}`] : [])];
        }),
      },
      {
        kind: "table",
        title: "Pages",
        columns: ["URL", ...BENCH_METRICS, "Avg sentence"],
        rows: [...compResults.map((r): Cell[] => (r.ok ? [r.url, ...BENCH_METRICS.map((m) => r.value[m]), r.value.avgSentence] : [r.url, `Failed: ${r.error}`])), ...(mine ? [[`(yours) ${str(input.myUrl)}`, ...BENCH_METRICS.map((m) => mine[m]), mine.avgSentence] as Cell[]] : [])],
      },
    ],
  };
};

/** TF-IDF Terms (tfidf_extractor). */
export const tfidfTerms: Runner = async (input) => {
  const urls = urlList(input.urls, 15);
  const docs: { label: string; text: string }[] = [];
  const results = await perUrl(urls, async (u) => (await loadPage(u)).mainText);
  for (const r of results) if (r.ok) docs.push({ label: r.url, text: r.value });
  if (str(input.text)) docs.push({ label: "Pasted text", text: str(input.text) });
  need(docs, "Enter URLs or paste text.");
  const top = num(input.top, 30, 5, 100);
  const t = tfidf(docs.map((d) => d.text), { ngramMin: num(input.ngramMin, 1, 1, 3), ngramMax: num(input.ngramMax, 3, 1, 4), maxFeatures: 2000 });
  return {
    headline: `${docs.length} document(s)${docs.length === 1 ? " — add more documents for sharper IDF weights" : ""}`,
    issues: results.filter((r) => !r.ok).map((r) => `${r.url}: failed — ${(r as { error: string }).error}`),
    sections: docs.map((d, i) => ({ kind: "table" as const, title: `Top ${top} terms — ${d.label}`, columns: ["Term", "TF-IDF"], rows: topTerms(t.features, t.matrix[i], top).map(([term, s]): Cell[] => [term, round(s, 5)]) })),
  };
};

const sentimentLabel = (c: number) => (c >= 0.05 ? "POSITIVE" : c <= -0.05 ? "NEGATIVE" : "NEUTRAL");

/** Sentiment (sentiment_analyzer, VADER): page, title, headings and paragraphs. */
export const sentiment: Runner = async (input) => {
  const { text, label, page } = await textSource(input);
  const score = (t: string) => SentimentIntensityAnalyzer.polarity_scores(t);
  const overall = score(text.slice(0, 5000));
  const paras = page ? page.root.querySelectorAll("p").map(cleanText).filter((t) => t.length > 30) : text.split(/\n{2,}/).map((t) => t.trim()).filter((t) => t.length > 30);
  const paraRows = paras.map((p) => ({ p, c: round(score(p).compound, 3) }));
  const count = (l: string) => paraRows.filter((r) => sentimentLabel(r.c) === l).length;
  const pct = (n: number) => `${n} (${round((n / Math.max(paraRows.length, 1)) * 100, 0)}%)`;
  const sorted = [...paraRows].sort((a, b) => b.c - a.c);
  const nonEnglish = letterWords(text).filter((w) => /[^\p{Script=Latin}]/u.test(w)).length / Math.max(letterWords(text).length, 1) > 0.3;
  return {
    headline: `${label} — overall ${sentimentLabel(overall.compound)} (compound ${round(overall.compound, 3)})`,
    stats: [
      { label: "Positive", value: round(overall.pos, 3) },
      { label: "Neutral", value: round(overall.neu, 3) },
      { label: "Negative", value: round(overall.neg, 3) },
      ...(page?.title ? [{ label: "Title", value: `${sentimentLabel(score(page.title).compound)} (${round(score(page.title).compound, 3)})` }] : []),
      { label: "Paragraphs +/=/−", value: `${pct(count("POSITIVE"))} / ${pct(count("NEUTRAL"))} / ${pct(count("NEGATIVE"))}` },
    ],
    issues: nonEnglish ? ["VADER is built for English — results for other languages are not reliable."] : undefined,
    sections: [
      ...(page ? [{ kind: "table" as const, title: "Headings", columns: ["Sentiment", "Compound", "Heading"], rows: headingsOf(page.root).map((h): Cell[] => { const c = score(h.text).compound; return [sentimentLabel(c), round(c, 3), h.text]; }) }] : []),
      { kind: "list", title: "Most positive / most negative paragraph", items: sorted.length ? [`[${sorted[0].c}] ${sorted[0].p.slice(0, 200)}`, `[${sorted[sorted.length - 1].c}] ${sorted[sorted.length - 1].p.slice(0, 200)}`] : ["No paragraphs."] },
      { kind: "table", title: "Paragraphs", columns: ["Sentiment", "Compound", "Paragraph"], rows: paraRows.map((r): Cell[] => [sentimentLabel(r.c), r.c, r.p.slice(0, 200)]) },
    ],
  };
};

