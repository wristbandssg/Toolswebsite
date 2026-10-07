import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetches a public web page for the admin SEO tools (src/app/api/seo-tools).
// Only http(s) on public addresses: every hop of a redirect is checked, so a
// tool can never be pointed at the server's own network (localhost, private
// ranges, cloud metadata).

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 20_000;
const USER_AGENT = "Mozilla/5.0 (compatible; CalcPlatform-SEO-Audit/1.0)";

export class FetchPageError extends Error {}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
    return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchPageError("That isn't a valid URL. Include https://");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchPageError("Only http:// and https:// URLs can be checked.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new FetchPageError(`Couldn't find the website "${host}".`);
  if (addresses.some(isPrivateAddress)) throw new FetchPageError("Private or internal network addresses can't be checked.");
  return url;
}

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  redirects: { from: string; status: number }[];
  html: string;
  bytes: number;
  /** Time until the full HTML arrived (all hops). */
  loadMs: number;
  headers: Headers;
}

export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  let url = await assertPublicUrl(rawUrl.trim());
  const redirects: { from: string; status: number }[] = [];
  const started = Date.now();

  for (let hop = 0; ; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((e: unknown) => {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      throw new FetchPageError(timedOut ? "The page took more than 20 seconds to answer." : "Couldn't connect to that website.");
    });

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      if (hop >= MAX_REDIRECTS) throw new FetchPageError(`More than ${MAX_REDIRECTS} redirects — stopped.`);
      redirects.push({ from: url.href, status: res.status });
      url = await assertPublicUrl(new URL(location, url).href);
      continue;
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) throw new FetchPageError("The page is larger than 15 MB.");
    return {
      requestedUrl: rawUrl.trim(),
      finalUrl: url.href,
      status: res.status,
      redirects,
      html: new TextDecoder().decode(buffer),
      bytes: buffer.byteLength,
      loadMs: Date.now() - started,
      headers: res.headers,
    };
  }
}

export interface RedirectHop {
  url: string;
  status: number | string; // a number, or an error / "LOOP" note
}

/** One request with no redirect following (still public addresses only). */
async function requestOnce(url: URL, method: "HEAD" | "GET"): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "manual",
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
}

/** Follows a URL hop by hop, recording every status (redirect_chain_checker). */
export async function traceRedirects(rawUrl: string, maxHops = 15): Promise<RedirectHop[]> {
  const chain: RedirectHop[] = [];
  const seen = new Set<string>();
  let current: URL;
  try {
    current = await assertPublicUrl(rawUrl.trim());
  } catch (e) {
    return [{ url: rawUrl, status: `ERROR: ${(e as Error).message}` }];
  }
  for (let i = 0; i < maxHops; i++) {
    if (seen.has(current.href)) {
      chain.push({ url: current.href, status: "LOOP" });
      break;
    }
    seen.add(current.href);
    let res: Response;
    try {
      res = await requestOnce(current, "HEAD");
      if (res.status === 405 || res.status === 501) res = await requestOnce(current, "GET");
    } catch (e) {
      chain.push({ url: current.href, status: `ERROR: ${(e as Error).name === "TimeoutError" ? "timeout" : "connection failed"}` });
      break;
    }
    chain.push({ url: current.href, status: res.status });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      try {
        current = await assertPublicUrl(new URL(location, current).href);
      } catch (e) {
        chain.push({ url: new URL(location, current).href, status: `ERROR: ${(e as Error).message}` });
        break;
      }
    } else break;
  }
  return chain;
}

/** Final status of a URL after redirects, plus how many redirects it took. */
export async function checkStatus(rawUrl: string): Promise<{ status: number; redirects: number; finalUrl: string; error: string }> {
  const chain = await traceRedirects(rawUrl, 8);
  const last = chain[chain.length - 1];
  const redirects = chain.filter((h) => typeof h.status === "number" && h.status >= 300 && h.status < 400).length;
  return typeof last.status === "number"
    ? { status: last.status, redirects, finalUrl: last.url, error: "" }
    : { status: 0, redirects, finalUrl: last.url, error: String(last.status) };
}

/** Runs `fn` over `items` with at most `limit` running at once, keeping order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
