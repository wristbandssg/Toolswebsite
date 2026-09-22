/**
 * Minimal in-memory sliding-window rate limiter. This resets whenever the
 * server process restarts and doesn't share state across instances, so it
 * is not a substitute for a real rate-limiting service — but on a
 * single-instance deploy (e.g. Render's free tier) it's enough to slow
 * down naive credential-stuffing against the admin login (Section 18:
 * Security / Phase 11 hardening).
 */

const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}
