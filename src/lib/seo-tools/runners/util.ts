import type { ToolInput, ToolReport } from "../types";

export type Runner = (input: ToolInput) => Promise<ToolReport>;

export class ToolInputError extends Error {}

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

export function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export const bool = (v: unknown) => v === true || v === "true" || v === "on";

export function lines(v: unknown, max = 200): string[] {
  return str(v)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function need<T>(value: T, message: string): T {
  if (value === "" || value == null || (Array.isArray(value) && value.length === 0)) throw new ToolInputError(message);
  return value;
}

/** Grade letter from a 0–100 score (A ≥ 80, B ≥ 60, C ≥ 40, D below). */
export const grade = (score: number) => (score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D");

/** Runs one URL at a time through `fn`, turning a failed fetch into a row-level error instead of failing the whole run. */
export async function perUrl<R>(urls: string[], fn: (url: string) => Promise<R>): Promise<({ url: string; ok: true; value: R } | { url: string; ok: false; error: string })[]> {
  return Promise.all(
    urls.map(async (url) => {
      try {
        return { url, ok: true as const, value: await fn(url) };
      } catch (e) {
        return { url, ok: false as const, error: (e as Error).message };
      }
    })
  );
}
export { round } from "../text";
