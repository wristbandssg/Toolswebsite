/**
 * Google Search Console integration (Phase 10). Uses plain fetch calls
 * against Google's OAuth token endpoint and the Search Console (Webmasters)
 * v3 REST API — no googleapis SDK dependency. Requires GOOGLE_CLIENT_ID and
 * GOOGLE_CLIENT_SECRET to be set (a Google Cloud OAuth client) before the
 * "Connect" flow in /admin/search-console will work; until then this
 * module simply reports "not connected" everywhere.
 */

import { getSiteSetting, setSiteSetting, deleteSiteSetting } from "@/lib/site-settings";

const TOKENS_KEY = "google_search_console_tokens";
const SITE_URL_KEY = "google_search_console_site_url";

export interface GscTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date: number; // epoch ms
}

export async function getGscTokens(): Promise<GscTokens | null> {
  return getSiteSetting<GscTokens>(TOKENS_KEY);
}

export async function saveGscTokens(next: Partial<GscTokens> & { access_token: string; expiry_date: number }) {
  const existing = await getGscTokens();
  const merged: GscTokens = {
    access_token: next.access_token,
    expiry_date: next.expiry_date,
    refresh_token: next.refresh_token ?? existing?.refresh_token,
  };
  await setSiteSetting(TOKENS_KEY, merged);
  return merged;
}

export async function disconnectGsc() {
  await deleteSiteSetting(TOKENS_KEY);
  await deleteSiteSetting(SITE_URL_KEY);
}

export async function getGscSiteUrl(): Promise<string | null> {
  return getSiteSetting<string>(SITE_URL_KEY);
}

export async function setGscSiteUrl(url: string) {
  await setSiteSetting(SITE_URL_KEY, url);
}

export async function isGscConnected(): Promise<boolean> {
  const tokens = await getGscTokens();
  return !!tokens;
}

async function refreshAccessToken(refreshToken: string): Promise<GscTokens | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return saveGscTokens({
    access_token: data.access_token,
    expiry_date: Date.now() + data.expires_in * 1000,
    refresh_token: refreshToken,
  });
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getGscTokens();
  if (!tokens) return null;
  if (tokens.expiry_date > Date.now() + 60_000) return tokens.access_token;
  if (!tokens.refresh_token) return null;
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  return refreshed?.access_token ?? null;
}

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export async function fetchGscSites(): Promise<GscSite[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.siteEntry ?? []) as GscSite[];
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function fetchSearchAnalytics(
  dimension: "query" | "page" = "query",
  rowLimit = 15
): Promise<SearchAnalyticsRow[]> {
  const accessToken = await getValidAccessToken();
  const siteUrl = await getGscSiteUrl();
  if (!accessToken || !siteUrl) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions: [dimension],
          rowLimit,
        }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.rows ?? []) as SearchAnalyticsRow[];
  } catch {
    return [];
  }
}
