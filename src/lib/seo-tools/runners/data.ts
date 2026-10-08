import { csvRecords } from "../semantic";
import { round } from "../text";
import { fetchSearchAnalytics, isGscConnected, getGscSiteUrl, type SearchAnalyticsRow } from "@/lib/gsc";
import type { Cell, ReportSection } from "../types";
import { type Runner, str, num, need, ToolInputError } from "./util";

// Backlinks & data files — ports of backlink_anchor_profiler.py,
// toxic_backlink_detector.py, search_console_analyzer.py and
// log_file_analyzer.py. They read exports (CSV / access logs) uploaded in the
// browser; Search Console can also use the live connection (Settings → GSC).

const pct = (n: number, total: number) => (total ? round((n / total) * 100) : 0);
const counter = <T,>(items: T[]) => {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

interface GscRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0–1
  position: number;
}

function gscRowsFromCsv(text: string): GscRow[] {
  const { headers, records } = csvRecords(text);
  const q = headers.find((h) => h.includes("query") || h.includes("keyword")) ?? headers[0];
  const c = headers.find((h) => h.includes("click"));
  const i = headers.find((h) => h.includes("impress"));
  const ctr = headers.find((h) => h.includes("ctr"));
  const p = headers.find((h) => h.includes("position"));
  const page = headers.find((h) => h !== q && (h.includes("page") || h.includes("url")));
  if (!i || !p) throw new ToolInputError(`The CSV needs impressions and position columns (found: ${headers.join(", ")}).`);
  const n = (v: string | undefined) => Number(String(v ?? "").replace(/[,%\s]/g, "")) || 0;
  return records.map((r) => {
    const clicks = c ? n(r[c]) : 0;
    const impressions = n(r[i]);
    let rate = ctr ? n(r[ctr]) : impressions ? clicks / impressions : 0;
    if (ctr && (String(r[ctr]).includes("%") || rate > 1)) rate /= 100;
    return { query: r[q] ?? "", page: page ? r[page] ?? "" : "", clicks, impressions, ctr: rate, position: n(r[p]) };
  });
}

/** Search Console Insights (search_console_analyzer). */
export const searchConsoleInsights: Runner = async (input) => {
  const minImpr = num(input.minImpressions, 50, 0, 1_000_000);
  const csv = str(input.csv);
  let rows: GscRow[];
  let source: string;
  if (csv) {
    rows = gscRowsFromCsv(csv);
    source = "Uploaded CSV";
  } else {
    if (!(await isGscConnected())) throw new ToolInputError("Search Console isn't connected — upload a Performance export (CSV) instead, or connect it in the admin's Search Console page.");
    const dimension = str(input.dimension) === "page" ? "page" : "query";
    const data: SearchAnalyticsRow[] = await fetchSearchAnalytics(dimension, 5000);
    if (!data.length) throw new ToolInputError("Search Console returned no data for the last 28 days.");
    rows = data.map((r) => ({ query: r.keys[0] ?? "", page: dimension === "page" ? r.keys[0] ?? "" : "", clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
    source = `Live Search Console — ${await getGscSiteUrl()}, last 28 days, by ${dimension}`;
  }
  if (!rows.length) throw new ToolInputError("No rows to analyse.");

  const quickWins = rows.filter((r) => r.impressions >= minImpr && r.position >= 4 && r.position <= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 30);
  const striking = rows.filter((r) => r.impressions >= Math.floor(minImpr / 2) && r.position >= 11 && r.position <= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 30);
  const byPos = new Map<number, number[]>();
  for (const r of rows) byPos.set(Math.round(r.position), [...(byPos.get(Math.round(r.position)) ?? []), r.ctr]);
  const avgCtr = new Map([...byPos.entries()].map(([p, v]) => [p, v.reduce((a, b) => a + b, 0) / v.length]));
  const ctrOpps = rows
    .filter((r) => r.impressions >= minImpr && Math.round(r.position) <= 5 && r.ctr < (avgCtr.get(Math.round(r.position)) ?? 0) * 0.7)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
  const totalClicks = rows.reduce((a, r) => a + r.clicks, 0);
  const totalImpr = rows.reduce((a, r) => a + r.impressions, 0);
  const label = rows.some((r) => r.query) ? "Query" : "Page";
  const row = (r: GscRow, extra: Cell[] = []): Cell[] => [r.query || r.page, round(r.position), r.impressions, r.clicks, `${round(r.ctr * 100, 2)}%`, ...extra];
  const cols = [label, "Position", "Impressions", "Clicks", "CTR"];
  return {
    headline: source,
    stats: [
      { label: "Rows", value: rows.length },
      { label: "Clicks", value: totalClicks },
      { label: "Impressions", value: totalImpr },
      { label: "Avg position", value: round(rows.reduce((a, r) => a + r.position, 0) / rows.length) },
      { label: "Quick wins", value: quickWins.length },
    ],
    sections: [
      { kind: "table", title: "Quick wins — position 4–20 with good impressions", note: "Small improvements here move you onto (or up) page 1.", columns: cols, rows: quickWins.map((r) => row(r)) },
      { kind: "table", title: "Striking distance — page 2 (positions 11–20)", columns: cols, rows: striking.map((r) => row(r)) },
      { kind: "table", title: "CTR opportunities — top 5 but CTR under 70% of the average for that position", note: "Rewrite the title and meta description to earn more clicks.", columns: [...cols, "Expected CTR"], rows: ctrOpps.map((r) => row(r, [`${round((avgCtr.get(Math.round(r.position)) ?? 0) * 100, 2)}%`])) },
      { kind: "table", title: "Top rows by clicks", columns: cols, rows: [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, 50).map((r) => row(r)) },
    ],
  };
};

const BOTS: [string, RegExp][] = [
  ["Googlebot", /Googlebot|GoogleOther|Google-InspectionTool|AdsBot-Google|Mediapartners-Google/i],
  ["Bingbot", /bingbot|BingPreview/i],
  ["Yandex", /YandexBot/i],
  ["Baidu", /Baiduspider/i],
  ["DuckDuckBot", /DuckDuckBot/i],
  ["Applebot", /Applebot/i],
  ["AI crawlers", /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|anthropic-ai|PerplexityBot|Google-Extended|CCBot|Bytespider|Amazonbot/i],
  ["Semrush", /SemrushBot/i],
  ["Ahrefs", /AhrefsBot/i],
  ["Other bots", /bot|crawl|spider|scraper|slurp/i],
];
// Combined Log Format (Apache/Nginx); referrer and user agent optional (Common Log Format).
const LOG_LINE = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)(?:\s+[^"]*)?"\s+(\d{3})\s+(\d+|-)(?:\s+"([^"]*)"\s+"([^"]*)")?/;
const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

/** Google's published Googlebot IP ranges, to spot fake Googlebots. */
async function googlebotRanges(): Promise<{ v4: [number, number][]; v6: string[] } | null> {
  try {
    const res = await fetch("https://developers.google.com/static/search/apis/ipranges/googlebot.json", { signal: AbortSignal.timeout(10_000) });
    const data = (await res.json()) as { prefixes?: { ipv4Prefix?: string; ipv6Prefix?: string }[] };
    const v4: [number, number][] = [];
    const v6: string[] = [];
    for (const p of data.prefixes ?? []) {
      if (p.ipv4Prefix) {
        const [ip, bits] = p.ipv4Prefix.split("/");
        const base = ipv4ToInt(ip);
        const size = 2 ** (32 - Number(bits));
        if (base != null) v4.push([base, base + size - 1]);
      } else if (p.ipv6Prefix) {
        const [ip, bits] = p.ipv6Prefix.split("/");
        // Compare the leading hextets covered by the prefix (Google's ranges are /64 or shorter).
        v6.push(expandV6(ip).slice(0, Math.floor(Number(bits) / 16)).join(":"));
      }
    }
    return { v4, v6 };
  } catch {
    return null;
  }
}
function ipv4ToInt(ip: string): number | null {
  const p = ip.split(".").map(Number);
  return p.length === 4 && p.every((n) => n >= 0 && n <= 255) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : null;
}
function expandV6(ip: string): string[] {
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const mid = Array(Math.max(0, 8 - h.length - t.length)).fill("0");
  return [...h, ...(ip.includes("::") ? mid : []), ...t].map((x) => x.toLowerCase().replace(/^0+(?=.)/, ""));
}
function isGoogleIp(ip: string, ranges: { v4: [number, number][]; v6: string[] }) {
  if (ip.includes(":")) {
    const full = expandV6(ip);
    return ranges.v6.some((p) => full.join(":").startsWith(`${p}:`) || full.join(":") === p);
  }
  const n = ipv4ToInt(ip);
  return n != null && ranges.v4.some(([a, b]) => n >= a && n <= b);
}

/** Log File Analyzer (log_file_analyzer). */
export const logFileAnalyzer: Runner = async (input) => {
  const text = str(input.log) || str(input.paste);
  need(text, "Upload an access log (or paste lines).");
  const botFilter = str(input.bot);
  const lines = text.split(/\r?\n/).slice(0, 500_000);
  type Entry = { ip: string; day: string; method: string; path: string; status: number; size: number; agent: string; bot: string };
  const entries: Entry[] = [];
  let skipped = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = LOG_LINE.exec(line);
    if (!m) {
      skipped++;
      continue;
    }
    const agent = m[8] ?? "";
    const d = m[2].match(/^(\d{2})\/(\w{3})\/(\d{4})/);
    entries.push({
      ip: m[1],
      day: d ? `${d[3]}-${MONTHS[d[2]] ?? "??"}-${d[1]}` : "",
      method: m[3],
      path: m[4],
      status: Number(m[5]),
      size: m[6] === "-" ? 0 : Number(m[6]),
      agent,
      bot: BOTS.find(([, re]) => re.test(agent))?.[0] ?? "Human",
    });
  }
  if (!entries.length) throw new ToolInputError(`No log lines could be read (${skipped} skipped). The tool reads Apache/Nginx "combined" or "common" log format.`);
  const scoped = botFilter ? entries.filter((e) => e.bot.toLowerCase().includes(botFilter.toLowerCase())) : entries;
  const bots = scoped.filter((e) => e.bot !== "Human");
  const isWaste = (s: number) => [301, 302, 307, 308, 404, 410, 500, 502, 503].includes(s);
  const waste = bots.filter((e) => isWaste(e.status));
  const kind = (p: string) => (/\.(css|js|mjs|map)(\?|$)/i.test(p) ? "CSS/JS" : /\.(png|jpe?g|gif|webp|avif|svg|ico)(\?|$)/i.test(p) ? "Image" : /\.(woff2?|ttf|otf)(\?|$)/i.test(p) ? "Font" : /\.(xml|txt)(\?|$)/i.test(p) ? "Sitemap/robots" : /^\/(api|_next\/data)\//.test(p) ? "API/data" : "Page");
  const google = entries.filter((e) => e.bot === "Googlebot");

  // Fake Googlebots: user agent says Googlebot, IP isn't Google's.
  let verify: ReportSection | null = null;
  const issues: string[] = [];
  if (google.length) {
    const ranges = await googlebotRanges();
    if (ranges) {
      const ips = counter(google.map((e) => e.ip));
      const fake = ips.filter(([ip]) => !isGoogleIp(ip, ranges));
      verify = { kind: "table", title: "Googlebot verification (IP vs Google's published ranges)", columns: ["IP", "Requests", "Verified"], rows: ips.slice(0, 100).map(([ip, c]): Cell[] => [ip, c, isGoogleIp(ip, ranges) ? "✓ Google" : "✗ FAKE"]) };
      const fakeHits = fake.reduce((a, [, c]) => a + c, 0);
      if (fakeHits) issues.push(`${fakeHits} "Googlebot" requests (${fake.length} IPs) don't come from Google — likely scrapers pretending to be Googlebot`);
    }
  }
  if (waste.length) issues.push(`${waste.length} bot requests (${pct(waste.length, bots.length)}%) hit redirects or errors — wasted crawl budget`);
  const params = bots.filter((e) => e.path.includes("?"));
  if (params.length / Math.max(bots.length, 1) > 0.2) issues.push(`${pct(params.length, bots.length)}% of bot requests are URLs with ?parameters — consider canonicals / robots rules`);
  const g5xx = google.filter((e) => e.status >= 500).length;
  if (g5xx) issues.push(`Googlebot got ${g5xx} server errors (5xx) — Google slows crawling when this happens`);

  const days = counter(google.map((e) => e.day)).sort((a, b) => a[0].localeCompare(b[0]));
  const sections: ReportSection[] = [
    { kind: "table", title: "Who is crawling", columns: ["Agent", "Requests", "%"], rows: counter(scoped.map((e) => e.bot)).map(([b, c]): Cell[] => [b, c, pct(c, scoped.length)]) },
    { kind: "table", title: "Status codes (bots)", columns: ["Status", "Requests", "%"], rows: counter(bots.map((e) => e.status)).map(([s, c]): Cell[] => [s, c, pct(c, bots.length)]) },
    { kind: "table", title: "Most crawled URLs (bots)", columns: ["URL", "Requests"], rows: counter(bots.map((e) => e.path)).slice(0, 50).map(([p, c]): Cell[] => [p, c]) },
    { kind: "table", title: "Crawl budget waste — bot hits on redirects and errors", columns: ["URL", "Status", "Requests"], rows: counter(waste.map((e) => `${e.path}\u0000${e.status}`)).slice(0, 50).map(([k, c]): Cell[] => [k.split("\u0000")[0], Number(k.split("\u0000")[1]), c]) },
    { kind: "table", title: "What bots fetch", columns: ["Resource type", "Requests", "%"], rows: counter(bots.map((e) => kind(e.path))).map(([k, c]): Cell[] => [k, c, pct(c, bots.length)]) },
  ];
  if (days.length) sections.push({ kind: "table", title: "Googlebot requests per day", columns: ["Day", "Requests", ""], rows: days.map(([d, c]): Cell[] => [d, c, "█".repeat(Math.min(60, Math.ceil((c / Math.max(...days.map(([, x]) => x))) * 60)))]) });
  if (verify) sections.push(verify);
  sections.push({ kind: "table", title: "Largest responses to bots", columns: ["URL", "Bytes", "Bot"], rows: [...bots].sort((a, b) => b.size - a.size).filter((e, i, arr) => arr.findIndex((x) => x.path === e.path) === i).slice(0, 20).map((e): Cell[] => [e.path, e.size, e.bot]) });

  return {
    headline: `${entries.length.toLocaleString("en-US")} requests parsed${skipped ? ` (${skipped} unreadable lines skipped)` : ""}${botFilter ? ` — filtered to "${botFilter}"` : ""}`,
    stats: [
      { label: "Requests", value: scoped.length },
      { label: "Bot requests", value: bots.length },
      { label: "Googlebot", value: google.length },
      { label: "Wasted bot hits", value: `${waste.length} (${pct(waste.length, bots.length)}%)` },
      { label: "Unique URLs crawled", value: new Set(bots.map((e) => e.path)).size },
    ],
    issues: issues.length ? issues : undefined,
    passed: issues.length ? undefined : ["No crawl problems found in this log"],
    sections,
  };
};
