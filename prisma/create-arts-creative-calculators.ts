// One-time (but safe to re-run) batch setup script: creates 23 calculators in Arts & Entertainment
// Calculators > Art, Film & Creator Income Calculators (streaming and publishing royalties, licensing,
// art and film costs, photography light, event staging). Formulas and dated rates live in
// src/lib/calc-engine-arts-creative.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-arts-entertainment-category.ts --apply)
//   npx tsx prisma/create-arts-creative-calculators.ts
// or
//   npm run db:create-arts-creative-calculators

import * as E from "../src/lib/calc-engine-arts-creative";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; labels?: string[] };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const FMT = { n: "number", l: "label", c: "currency", p: "percentage", d: "date" } as const;
/** [key, label, format, labels for "l" lines]. */
type Line = [key: string, label: string, fmt: keyof typeof FMT, labels?: string[]];
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
/** Shows an index the way the page will (labels[index], "—" when out of range). */

const CAT = "art-film-creator-income-calculators";
const NOTE = "Rates and prices are typical 2026 estimates that change often and differ by contract, platform and region — every default can be edited to match your own statements, quotes or schedules. This site is independent and not affiliated with any platform or organisation named.";

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt, mainLabels] = s.results[0];
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Music Tool`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainLabels ? { labels: mainLabels } : {}) },
    calcResults: s.results.map(([key, label, f, labels], i) => ({ key, label, format: FMT[f], ...(labels ? { labels } : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

function currencyField(key: string, label: string, def: number, max = 100000000, step = 1) {
  return { key, label, type: "currency", required: true, default: def, min: 0, max, step };
}
function percentField(key: string, label: string, def: number, max = 100, step = 0.5) {
  return { key, label, type: "percentage", unit: "%", required: true, default: def, min: 0, max, step };
}
function dateField(key: string, label: string, def: string) {
  return { key, label, type: "date", required: true, default: def };
}
const cur = currencyField;
const pct = percentField;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const SPLITS = [pct("distributorFee", "Distributor Fee (0 for DistroKid-style flat fee)", 0), pct("labelShare", "Label or Manager Share", 0), pct("yourSplit", "Your Share of the Track (splits with collaborators)", 100)];
const exSplits = { distributorFee: 0, labelShare: 0, yourSplit: 100 };
const PLATFORM_RESULTS: Line[] = [["yourEarnings", "Your Earnings", "c"], ["grossRoyalties", "Gross Royalties Paid", "c"], ["perThousandStreams", "You Earn per 1,000 Streams", "c"], ["streamsForTarget", "Streams Needed for Your Target", "n"], ["eligibleStreams", "Streams That Earn", "n"], ["monthlyAtThisPace", "Per Month", "c"]];
const platformInputs = (rate: number, rateMax = 0.05) => [num("streams", "Streams", 100000, 1e12, 1), num("tracks", "Number of Tracks Those Streams Are Spread Over", 1, 100000, 1, 1), num("months", "Over How Many Months", 1, 600, 1, 1), { key: "rate", label: "Payout per Stream ($)", type: "currency", required: true, default: rate, min: 0, max: rateMax, step: 0.0001 }, ...SPLITS, cur("targetIncome", "Target Income (for reverse calculation)", 1000)];
const exPlatform = (rate: number) => ({ streams: 100000, tracks: 1, months: 1, rate, ...exSplits, targetIncome: 1000 });
const DATE0 = 20764; // 7 Nov 2026 as a day number, for the worked example only

const TOOLS: ToolDef[] = [
  mk({
    slug: "spotify-royalty-calculator", title: "Spotify Royalty Calculator (Streams to Dollars)",
    desc: "Estimate how much Spotify pays for your streams — after distributor fees, label share and collaborator splits — with pay per 1,000 streams, Spotify's 1,000-stream minimum and streams needed for a target income.",
    meta: "Spotify Royalty Calculator — How Much Does Spotify Pay per Stream?",
    inputs: platformInputs(0.004), results: PLATFORM_RESULTS, fn: E.spotifyRoyalty, ex: exPlatform(0.004),
    exText: (o) => `Example: 100,000 Spotify streams at about $0.004 pay roughly ${usd(o.grossRoyalties)} in recording royalties — ${o.streamsForTarget.toLocaleString("en-US")} streams to earn $1,000.`,
    how: "Enter your streams and how many tracks they are spread across. Since 2024 Spotify pays recording royalties only on tracks with at least 1,000 streams in the previous 12 months — tracks below that earn nothing here.\n\nThis is the recording (master) side; songwriters earn separate publishing royalties through a PRO and the MLC.",
    assume: "Average payout about $0.003–0.005 per stream in 2026 (default $0.004) — the real rate depends on listener country, subscription vs free tier and your distributor.",
    faq: [["How much does Spotify pay per stream?", "About $0.003–0.005, or $3–5 per 1,000 streams."], ["How many streams to make $1,000 on Spotify?", "About 250,000 at $0.004 per stream, before fees and splits."]],
  }),
  mk({
    slug: "apple-music-royalties-calculator", title: "Apple Music Royalties Calculator",
    desc: "Estimate Apple Music streaming royalties — gross and your share after distributor, label and collaborator splits — with earnings per 1,000 streams and the streams needed for a target.",
    meta: "Apple Music Royalties Calculator — Pay per Stream Estimate",
    inputs: platformInputs(0.008), results: PLATFORM_RESULTS, fn: E.appleMusicRoyalty, ex: exPlatform(0.008),
    exText: (o) => `Example: 100,000 Apple Music streams at about $0.008 earn roughly ${usd(o.grossRoyalties)}.`,
    how: "Enter your Apple Music streams from your distributor dashboard. Apple has no free tier, so its average rate is roughly double Spotify's.",
    assume: "Average payout about $0.006–0.010 per stream (default $0.008).",
    faq: [["How much does Apple Music pay per stream?", "Around $0.006–0.01."], ["Does Apple Music pay more than Spotify?", "Per stream, usually about twice as much."]],
  }),
  mk({
    slug: "youtube-music-royalty-calculator", title: "YouTube Music Royalty Calculator",
    desc: "Estimate YouTube Music streaming royalties for your tracks — gross and net after splits — with pay per 1,000 streams and streams needed for a target income.",
    meta: "YouTube Music Royalty Calculator — Pay per Stream Estimate",
    inputs: platformInputs(0.004), results: PLATFORM_RESULTS, fn: E.youtubeMusicRoyalty, ex: exPlatform(0.004),
    exText: (o) => `Example: 100,000 YouTube Music streams at about $0.004 pay roughly ${usd(o.grossRoyalties)}.`,
    how: "Use your YouTube Music (and Art Track) stream counts. Premium streams pay much more than ad-supported ones, so your blended rate depends on your audience. For YouTube video ad revenue, use the YouTube Revenue Calculator.",
    assume: "Payouts range roughly $0.001–0.008 per stream (default $0.004).",
    faq: [["How much does YouTube Music pay per stream?", "Roughly $0.001–0.008 depending on Premium vs ad-supported listening."]],
  }),
  mk({
    slug: "deezer-royalties-calculator", title: "Deezer Royalties Calculator",
    desc: "Estimate Deezer streaming royalties — gross and your share after fees and splits — with earnings per 1,000 streams and streams for a target income.",
    meta: "Deezer Royalties Calculator — Pay per Stream Estimate",
    inputs: platformInputs(0.0055), results: PLATFORM_RESULTS, fn: E.deezerRoyalty, ex: exPlatform(0.0055),
    exText: (o) => `Example: 100,000 Deezer streams at about $0.0055 pay roughly ${usd(o.grossRoyalties)}.`,
    how: "Enter your Deezer streams. Deezer moved to an artist-centric model in late 2024, which pays more per stream to professional artists that listeners seek out and less to background noise tracks.",
    assume: "Payouts about $0.003–0.007 per stream (default $0.0055).",
    faq: [["How much does Deezer pay per stream?", "About $0.003–0.007."]],
  }),
  mk({
    slug: "soundcloud-royalty-calculator", title: "SoundCloud Royalty Calculator",
    desc: "Estimate SoundCloud earnings from your plays — gross and net after fees and splits — with earnings per 1,000 plays and the plays needed for a target income.",
    meta: "SoundCloud Royalty Calculator — Earnings per Play Estimate",
    inputs: platformInputs(0.003), results: PLATFORM_RESULTS, fn: E.soundcloudRoyalty, ex: exPlatform(0.003),
    exText: (o) => `Example: 100,000 monetised SoundCloud plays at about $0.003 pay roughly ${usd(o.grossRoyalties)}.`,
    how: "Only monetised plays count (through SoundCloud for Artists or a distributor). SoundCloud's fan-powered model pays from each listener's own subscription, so rates vary widely — enter the rate from your statements if you have one.",
    assume: "No reliable public average exists; the $0.003 default is a conservative estimate.",
    faq: [["Does SoundCloud pay artists?", "Yes, for monetised tracks — mostly from listeners' subscriptions and ads."]],
  }),
  mk({
    slug: "royalty-calculator", title: "Music Royalty Calculator (All Streaming Platforms)",
    desc: "Add up streaming royalties across Spotify, Apple Music, YouTube Music, Amazon, Deezer, Tidal and SoundCloud — after distributor (e.g. DistroKid), label and collaborator splits — and see how many streams you need for a target income.",
    meta: "Royalty Calculator — Streaming Royalties Across All Platforms",
    inputs: [...E.PLATFORMS.flatMap(([k, n, r]) => [num(`${k}Streams`, `${n} Streams`, ({ spotify: 100000, apple: 20000, youtube: 15000, amazon: 8000 } as Record<string, number>)[k] ?? 0, 1e12, 1), { key: `${k}Rate`, label: `${n} Payout per Stream ($)`, type: "currency", required: true, default: r, min: 0, max: 0.05, step: 0.0001 }]), ...SPLITS, cur("targetIncome", "Target Income (reverse calculation)", 5000)],
    results: [["yourEarnings", "Your Earnings", "c"], ["grossRoyalties", "Gross Royalties", "c"], ["totalStreams", "Total Streams", "n"], ["perThousandStreams", "Blended Earnings per 1,000 Streams", "c"], ["blendedPerStream", "Blended Payout per Stream ($)", "n"], ["streamsForTarget", "Streams Needed for Your Target", "n"]],
    fn: E.royalty, ex: { spotifyStreams: 100000, spotifyRate: 0.004, appleStreams: 20000, appleRate: 0.008, youtubeStreams: 15000, youtubeRate: 0.004, amazonStreams: 8000, amazonRate: 0.004, deezerStreams: 0, deezerRate: 0.0055, tidalStreams: 0, tidalRate: 0.0135, soundcloudStreams: 0, soundcloudRate: 0.003, ...exSplits, targetIncome: 5000 },
    exText: (o) => `Example: 100k Spotify, 20k Apple Music, 15k YouTube Music and 8k Amazon streams earn about ${usd(o.yourEarnings)} — ${usd(o.perThousandStreams)} per 1,000 streams blended.`,
    how: "Enter streams by platform (from your distributor's report) and adjust payout rates if you know yours. DistroKid charges a yearly fee and passes on 100% of royalties, so leave the distributor fee at 0; CD Baby and others keep about 9–15%.\n\nThe reverse result shows how many streams, at your blended rate, reach your target income.",
    assume: "Default 2026 rate estimates: Spotify $0.004, Apple Music $0.008, YouTube Music $0.004, Amazon $0.004, Deezer $0.0055, Tidal $0.0135, SoundCloud $0.003. Recording royalties only — songwriter (publishing) royalties are separate.",
    faq: [["How much do 1 million streams pay?", "Roughly $3,000–5,000 on Spotify, more on Apple Music and Tidal."], ["Does DistroKid take a cut of royalties?", "No — it charges an annual fee and passes 100% of royalties through."]],
  }),
  mk({
    slug: "tiktok-royalty-calculator", title: "TikTok Royalty Calculator (Sound Earnings Estimate)",
    desc: "Estimate what you earn when people use your song on TikTok — from video creations, views of those videos and spillover streams on Spotify and other platforms — after distributor and label splits.",
    meta: "TikTok Royalty Calculator — Earnings From Your Sound",
    inputs: [num("videosCreated", "Videos Created With Your Sound", 5000, 1e10, 1), num("views", "Total Views of Those Videos", 2000000, 1e13, 1), { key: "perCreation", label: "Payout per Video Creation ($)", type: "currency", required: true, default: 0.003, min: 0, max: 1, step: 0.0001 }, { key: "perThousandViews", label: "Payout per 1,000 Views ($)", type: "currency", required: true, default: 0.02, min: 0, max: 10, step: 0.001 }, num("streamsFromTikTok", "Extra Streams Elsewhere Driven by TikTok", 50000, 1e12, 1), { key: "streamRate", label: "Payout per Stream Elsewhere ($)", type: "currency", required: true, default: 0.004, min: 0, max: 0.05, step: 0.0001 }, ...SPLITS],
    results: [["yourEarnings", "Your Estimated Earnings", "c"], ["grossRoyalties", "Gross Royalties", "c"], ["fromVideoCreations", "From Video Creations", "c"], ["fromViews", "From Video Views", "c"], ["fromSpilloverStreams", "From Spillover Streams", "c"]],
    fn: E.tiktokRoyalty, ex: { videosCreated: 5000, views: 2000000, perCreation: 0.003, perThousandViews: 0.02, streamsFromTikTok: 50000, streamRate: 0.004, ...exSplits },
    exText: (o) => `Example: 5,000 videos with 2 million views plus 50,000 spillover streams might earn about ${usd(o.yourEarnings)} — mostly from the streams TikTok drives elsewhere.`,
    how: "TikTok pays rights holders from licensing pools rather than a fixed per-play rate, so direct TikTok income is usually small; the real money is often the streams a TikTok trend drives on Spotify and Apple Music. Replace the default rates with figures from your distributor's TikTok report.",
    assume: "Default per-creation and per-view rates are rough illustrations only — TikTok does not publish a rate, and payouts vary hugely by deal, region and distributor.",
    faq: [["Does TikTok pay musicians?", "Yes, through distributors and labels, but usually far less per use than streaming services."], ["How do I get paid for my sound on TikTok?", "Release it through a distributor that delivers to TikTok and SoundOn or your label."]],
  }),
  mk({
    slug: "mechanical-royalty-calculator", title: "Mechanical Royalty Calculator (2026 US Statutory Rate)",
    desc: "Calculate US mechanical royalties for physical copies and downloads at the 2026 statutory rate — 13.1¢ per song or 2.52¢ per minute for songs over five minutes — with your share and admin fees.",
    meta: "Mechanical Royalty Calculator — 2026 Statutory Rate 13.1¢",
    inputs: [num("units", "Copies Sold (CDs, vinyl, downloads)", 1000, 1e10, 1), num("songMinutes", "Song Length (minutes)", 3.5, 120, 0.01), num("rateCents", "Statutory Rate (cents per song)", 13.1, 100, 0.01), num("perMinuteCents", "Long-Song Rate (cents per minute)", 2.52, 20, 0.01), num("streams", "US Interactive Streams (optional)", 0, 1e12, 1), { key: "streamingMechanicalRate", label: "Streaming Mechanical per Stream ($, optional)", type: "currency", required: true, default: 0, min: 0, max: 0.01, step: 0.00001 }, pct("yourShare", "Your Share of the Song", 100), pct("adminFee", "Publisher / Admin Fee", 0)],
    results: [["totalMechanicals", "Total Mechanical Royalties", "c"], ["yourShare", "Your Share", "c"], ["afterAdminFee", "After Admin Fee", "c"], ["centsPerUnit", "Rate Applied (cents per copy)", "n"], ["physicalAndDownloads", "From Physical & Downloads", "c"]],
    fn: E.mechanicalRoyalty, ex: { units: 1000, songMinutes: 3.5, rateCents: 13.1, perMinuteCents: 2.52, streams: 0, streamingMechanicalRate: 0, yourShare: 100, adminFee: 0 },
    exText: (o) => `Example: 1,000 copies of a 3½-minute song owe ${usd(o.totalMechanicals)} in mechanicals at 13.1¢. A 6-minute song would use the per-minute rate instead (7 × 2.52¢ = 17.64¢).`,
    how: "Mechanical royalties are paid to songwriters and publishers when their song is reproduced. Labels pay them on physical copies and downloads; in the US, streaming mechanicals are collected by the MLC under a separate formula — add an estimate if you have one.",
    assume: "Phonorecords IV statutory rate for 2026: 13.1¢ per work, or 2.52¢ per minute (rounded up) for songs longer than five minutes (12.7¢ in 2025). Controlled-composition clauses in record deals can reduce it.",
    faq: [["What is the mechanical royalty rate in 2026?", "13.1 cents per song in the US (2.52¢ per minute over five minutes)."], ["Who collects streaming mechanicals in the US?", "The Mechanical Licensing Collective (MLC)."]],
  }),
  mk({
    slug: "performance-royalty-calculator", title: "Performance Royalty Calculator (PRO Royalties Estimate)",
    desc: "Estimate songwriter performance royalties from streams, radio spins, TV uses and live shows — the writer's and publisher's shares, your song split, and how much you keep if you self-publish.",
    meta: "Performance Royalty Calculator — ASCAP, BMI & PRO Estimate",
    inputs: [num("streams", "Streams (all services)", 500000, 1e12, 1), { key: "streamRate", label: "Performance Royalty per Stream ($)", type: "currency", required: true, default: 0.0008, min: 0, max: 0.01, step: 0.00001 }, num("radioSpins", "Radio Spins", 200, 1e9, 1), cur("spinRate", "Per Spin (varies hugely by station size)", 2, 1000, 0.01), num("tvUses", "TV / Film Uses", 2, 1e6, 1), cur("tvRate", "Per TV Use", 50, 1e6, 1), num("liveShows", "Live Performances Reported", 30, 1e6, 1), cur("liveRate", "Per Live Performance", 5, 10000, 0.01), pct("yourSongShare", "Your Share of the Song (co-writer split)", 100), dropdown("selfPublished", "Do You Collect the Publisher's Share Too?", opts(["No (publisher collects it)", "Yes (self-published)"]), 1)],
    results: [["yourPerformanceRoyalties", "Your Performance Royalties", "c"], ["totalCollected", "Total Performance Royalties", "c"], ["writerShare", "Writer's Share", "c"], ["publisherShare", "Publisher's Share", "c"], ["fromStreams", "From Streams", "c"], ["fromRadio", "From Radio", "c"]],
    fn: E.performanceRoyalty, ex: { streams: 500000, streamRate: 0.0008, radioSpins: 200, spinRate: 2, tvUses: 2, tvRate: 50, liveShows: 30, liveRate: 5, yourSongShare: 100, selfPublished: 1 },
    exText: (o) => `Example: 500,000 streams, 200 radio spins, 2 TV uses and 30 live shows bring about ${usd(o.totalCollected)} in performance royalties for a self-published songwriter.`,
    how: "Performance royalties are paid by PROs (ASCAP, BMI, SESAC, GMR in the US; PRS, SOCAN, APRA abroad) when your song is played in public, broadcast or streamed. They split 50/50 between the writer's and publisher's shares — register your own publishing designee to collect both if you have no publisher.",
    assume: "Default rates are rough averages for illustration; actual payouts depend on the PRO, the licensee, station size, time of day and survey methods.",
    faq: [["How much does a radio spin pay?", "From a few cents on a small station to well over $100 on a major-market commercial station."], ["What is the writer's share?", "Half of performance royalties, paid directly to songwriters by their PRO."]],
  }),
  mk({
    slug: "music-publishing-royalty-calculator", title: "Music Publishing Royalty Calculator (Publishing Deal Splits)",
    desc: "See what a songwriter takes home from publishing income — mechanical, performance, sync and print — under self-publishing, an admin deal, a co-publishing deal or a traditional publishing deal.",
    meta: "Music Publishing Royalty Calculator — Admin, Co-Pub & Full Deals",
    inputs: [cur("mechanical", "Mechanical Royalties", 2000, 1e9), cur("performance", "Performance Royalties", 3000, 1e9), cur("sync", "Sync Licensing Fees", 5000, 1e9), cur("print", "Print / Lyrics", 0, 1e9), cur("other", "Other Publishing Income", 0, 1e9), dropdown("dealType", "Publishing Deal", opts(E.DEALS.map(([n]) => n)), 2), pct("adminFee", "Admin Fee (admin deals, % of publisher's share)", 15), pct("yourSongShare", "Your Share of the Songs", 100)],
    results: [["yourIncome", "Your Publishing Income", "c"], ["totalPublishingIncome", "Total Publishing Income", "c"], ["publisherKeeps", "Publisher Keeps", "c"], ["adminFeePaid", "Admin Fee Paid", "c"], ["writerShareOnly", "Writer's Share Alone (50%)", "c"], ["effectivePercent", "Your Effective Percentage (%)", "n"]],
    fn: E.publishingRoyalty, ex: { mechanical: 2000, performance: 3000, sync: 5000, print: 0, other: 0, dealType: 2, adminFee: 15, yourSongShare: 100 },
    exText: (o) => `Example: $10,000 of publishing income under a co-publishing deal pays the writer about ${usd(o.yourIncome)} (${o.effectivePercent}%); the publisher keeps ${usd(o.publisherKeeps)}.`,
    how: "Publishing income belongs to the song (composition), not the recording. Choose your deal: self-publishing keeps everything; an admin deal costs a fee on the publisher's share; co-publishing usually leaves the writer about 75%; a traditional deal about 50%.",
    assume: "Typical deal terms; real contracts vary (recoupment of advances, territory, reversion). Performance royalties already include the writer's share paid directly by your PRO.",
    faq: [["What is a co-publishing deal?", "A deal where the writer co-owns the publishing and typically keeps about 75% of total publishing income."], ["What does a publishing admin charge?", "Usually 10–20% of the publisher's share."]],
  }),
  mk({
    slug: "ascap-license-fee-calculator", title: "ASCAP License Fee Calculator (Bars & Restaurants Estimate)",
    desc: "Estimate an ASCAP music licence fee for a bar, restaurant or nightclub from its occupancy, recorded or live music, nights per week and cover charge — with a rough total for ASCAP, BMI and SESAC together.",
    meta: "ASCAP License Fee Calculator — Bar & Restaurant Estimate",
    inputs: [num("occupancy", "Legal Occupancy (capacity)", 120, 100000, 1), dropdown("musicType", "Music Used", opts(["Recorded music only", "Live music only", "Both live and recorded"]), 0), dropdown("liveNights", "Live Music Nights per Week", opts(["1 night or less", "2–3 nights", "4 or more nights"]), 0), dropdown("coverCharge", "Cover Charge?", opts(["No", "Yes"]), 0), cur("recordedRate", "Recorded Music Rate per Occupant", 3.2, 100, 0.01), cur("liveRate", "Live Music Rate per Occupant", 5.9, 100, 0.01), cur("minimumFee", "Annual Minimum Fee", 390, 100000)],
    results: [["annualAscapFee", "Estimated Annual ASCAP Fee", "c"], ["monthlyCost", "Per Month", "c"], ["perOccupantRate", "Rate per Occupant Used", "c"], ["calculatedBeforeMinimum", "Calculated Before the Minimum", "c"], ["allThreeProsEstimate", "Rough Total for ASCAP + BMI + SESAC", "c"]],
    fn: E.ascapFee, ex: { occupancy: 120, musicType: 0, liveNights: 0, coverCharge: 0, recordedRate: 3.2, liveRate: 5.9, minimumFee: 390 },
    exText: (o) => `Example: a 120-seat restaurant playing recorded music might pay about ${usd(o.annualAscapFee)} a year to ASCAP, and roughly ${usd(o.allThreeProsEstimate)} for all three US PROs.`,
    how: "Businesses that play music publicly need licences from the PROs whose songs they play — usually ASCAP, BMI and SESAC (plus GMR in some cases). Background music services such as Spotify Business or Soundtrack often include the licences.\n\nASCAP sets fees in a published rate schedule; replace the default per-occupant rates with the current schedule for an exact figure.",
    assume: "Default per-occupant rates are mid-points of third-party estimates (recorded ≈ $2.3–4.0, live ≈ $5.0–6.9) with a minimum of about $390; live-music frequency and cover charges raise the rate. The three-PRO total is a rough multiplier.",
    faq: [["How much is an ASCAP licence for a restaurant?", "Often a few hundred to a few thousand dollars a year, based on occupancy and music type."], ["Do I need ASCAP and BMI?", "Usually yes — each licenses a different catalogue of songs."]],
  }),
  mk({
    slug: "color-theory-calculator", title: "Color Theory Calculator (Color Harmony Wheel)",
    desc: "Find harmonious colours from any hue — complementary, triadic, split-complementary, analogous and tetradic — as hue angles with colour names, for painting, design and photography.",
    meta: "Color Theory Calculator — Complementary, Triadic & Analogous",
    inputs: [num("hue", "Base Hue (0–360°; red 0, yellow 60, green 120, cyan 180, blue 240, magenta 300)", 210, 360, 1)],
    results: [["complementary", "Complementary Hue (°)", "n"], ["complementaryName", "Complementary Colour", "l", E.HUE_NAMES], ["baseName", "Base Colour", "l", E.HUE_NAMES], ["triadic1", "Triadic Hue 1 (°)", "n"], ["triadic2", "Triadic Hue 2 (°)", "n"], ["splitComp1", "Split-Complementary 1 (°)", "n"], ["splitComp2", "Split-Complementary 2 (°)", "n"], ["analogous1", "Analogous 1 (°)", "n"], ["analogous2", "Analogous 2 (°)", "n"], ["tetradic", "Tetradic / Square (°)", "n"], ["tetradicName", "Tetradic Colour", "l", E.HUE_NAMES]],
    fn: E.colorTheory, ex: { hue: 210 },
    exText: (o) => `Example: an azure blue at 210° pairs with ${E.HUE_NAMES[o.complementaryName].toLowerCase()} (${o.complementary}°) as its complement, and ${o.triadic1}° and ${o.triadic2}° for a triad.`,
    how: "Find your colour's hue in any colour picker (the H in HSL or HSB) and enter it. Use the same saturation and lightness for the harmony colours, or vary them for contrast.\n\nPainters working with the traditional red-yellow-blue wheel will find complements slightly different (red ↔ green rather than red ↔ cyan).",
    assume: "Harmonies on the RGB/HSL colour wheel: complementary +180°, triadic ±120°, split-complementary 180° ± 30°, analogous ±30°, tetradic +90°.",
    faq: [["What is the complementary colour of blue?", "Orange on the RGB/HSL wheel."], ["What is a triadic colour scheme?", "Three hues evenly spaced 120° apart."]],
  }),
  mk({
    slug: "mural-cost-calculator", title: "Mural Cost Calculator (Mural Pricing per Square Foot)",
    desc: "Estimate the cost of a painted mural — artist fee per square foot by detail level, design fee, paint and supplies, lift or scaffold rental, travel and protective coating.",
    meta: "Mural Cost Calculator — Mural Price per Square Foot",
    inputs: [num("width", "Wall Width (ft)", 20, 10000, 0.5), num("height", "Wall Height (ft)", 10, 1000, 0.5), dropdown("complexity", "Detail Level", opts(["Simple (lettering, flat shapes) ≈ $15/sq ft", "Moderate (graphic, some detail) ≈ $30", "Detailed (illustrative) ≈ $55", "Photorealistic / highly detailed ≈ $90"]), 1), cur("ratePerSqFt", "Your Own Rate per Sq Ft (0 = use detail level)", 0, 1000, 0.5), cur("suppliesPerSqFt", "Paint & Supplies per Sq Ft", 1.5, 100, 0.1), cur("designFee", "Design / Concept Fee", 500, 1e7), num("equipmentDays", "Lift or Scaffold Days", 0, 365, 1), cur("equipmentRate", "Lift / Scaffold Cost per Day", 250, 100000), cur("travel", "Travel & Lodging", 0, 1e6), pct("sealerPercent", "Anti-Graffiti / UV Coating (extra %)", 0, 50)],
    results: [["totalCost", "Total Mural Cost", "c"], ["artistFee", "Artist Fee", "c"], ["supplies", "Paint & Supplies", "c"], ["equipmentAccess", "Lift / Scaffold", "c"], ["wallArea", "Wall Area (sq ft)", "n"], ["costPerSqFt", "All-In Cost per Sq Ft", "c"]],
    fn: E.muralCost, ex: { width: 20, height: 10, complexity: 1, ratePerSqFt: 0, suppliesPerSqFt: 1.5, designFee: 500, equipmentDays: 0, equipmentRate: 250, travel: 0, sealerPercent: 0 },
    exText: (o) => `Example: a 20 × 10 ft mural with moderate detail costs about ${usd(o.totalCost)} — ${usd(o.costPerSqFt)} per sq ft all in.`,
    how: "Measure the painted area. Exterior walls, high walls needing a lift, textured brick and tight deadlines all push the price up. Artists usually ask a 30–50% deposit.",
    assume: "Typical US artist rates in 2026: $10–25/sq ft simple, $25–50 moderate, $50–100+ detailed or photorealistic. Supplies about $1–3/sq ft.",
    faq: [["How much does a mural cost per square foot?", "Usually $15–50, and $50–100+ for detailed work."], ["How much for a 10 × 20 ft mural?", "Often $3,000–10,000 depending on detail."]],
  }),
  mk({
    slug: "hyperfocal-length-calculator", title: "Hyperfocal Distance Calculator (Depth of Field)",
    desc: "Calculate the hyperfocal distance for your lens, aperture and camera sensor — the focus point that keeps everything from half that distance to infinity sharp — plus depth of field at any subject distance.",
    meta: "Hyperfocal Distance Calculator — Focus for Maximum Sharpness",
    inputs: [num("focalLength", "Focal Length (mm)", 24, 2000, 0.1, 1), num("aperture", "Aperture (f-number)", 8, 64, 0.1, 0.95), dropdown("sensor", "Camera Sensor", opts(E.SENSORS.map(([n, c]) => `${n} — CoC ${c} mm`)), 0), num("coc", "Custom Circle of Confusion (mm, 0 = use sensor)", 0, 0.1, 0.001), dropdown("distanceUnit", "Subject Distance Unit", opts(["Feet", "Meters"]), 1), num("subjectDistance", "Subject Distance (for depth of field)", 3, 10000, 0.1)],
    results: [["hyperfocalMeters", "Hyperfocal Distance (m)", "n"], ["hyperfocalFeet", "Hyperfocal Distance (ft)", "n"], ["nearLimitAtHyperfocalMeters", "Sharp From (when focused at hyperfocal, m)", "n"], ["nearLimitMeters", "Near Limit at Your Subject Distance (m)", "n"], ["farLimitMeters", "Far Limit at Your Subject Distance (m; 0 = infinity)", "n"], ["farIsInfinity", "Sharp to Infinity (1 = yes)", "n"], ["cocUsed", "Circle of Confusion Used (mm)", "n"]],
    fn: E.hyperfocal, ex: { focalLength: 24, aperture: 8, sensor: 0, coc: 0, distanceUnit: 1, subjectDistance: 3 },
    exText: (o) => `Example: a 24 mm lens at f/8 on full frame has a hyperfocal distance of ${o.hyperfocalMeters} m (${o.hyperfocalFeet} ft) — focus there and everything from ${o.nearLimitAtHyperfocalMeters} m to infinity is acceptably sharp.`,
    how: "For landscapes, focus at the hyperfocal distance to get the most depth of field. Wider lenses and smaller apertures (bigger f-numbers) bring it closer. For critical sharpness on large prints, use a smaller circle of confusion or focus a little beyond the hyperfocal point.",
    assume: "H = f² ÷ (N × c) + f. Depth of field: near = s(H − f) ÷ (H + s − 2f), far = s(H − f) ÷ (H − s). Circles of confusion are common standards for an 8 × 10 in print viewed at normal distance.",
    faq: [["What is hyperfocal distance?", "The closest focus distance at which infinity is still acceptably sharp."], ["Hyperfocal distance for 24 mm at f/8?", "About 2.4 m (8 ft) on full frame."]],
  }),
  mk({
    slug: "golden-hour-photography-calculator", title: "Golden Hour Calculator (Photography Light Times)",
    desc: "Find golden hour and blue hour times for any date and location — sunrise, sunset, when the evening golden light starts and ends, and how long it lasts — for planning photo shoots.",
    meta: "Golden Hour Photography Calculator — Golden & Blue Hour Times",
    inputs: [dateField("date", "Date", "today"), num("latitude", "Latitude (° north +, south −)", 40.71, 90, 0.0001, -90), num("longitude", "Longitude (° east +, west −)", -74.01, 180, 0.0001, -180), num("utcOffset", "Time Zone Offset From UTC on That Date (hours)", -5, 14, 0.25, -12)],
    results: [["eveningGoldenStart", "Evening Golden Hour Starts", "l", E.TIME_LABELS], ["sunset", "Sunset", "l", E.TIME_LABELS], ["eveningGoldenEnd", "Evening Golden Hour Ends", "l", E.TIME_LABELS], ["eveningBlueHourEnd", "Evening Blue Hour Ends", "l", E.TIME_LABELS], ["morningBlueHourStart", "Morning Blue Hour Starts", "l", E.TIME_LABELS], ["sunrise", "Sunrise", "l", E.TIME_LABELS], ["morningGoldenEnd", "Morning Golden Hour Ends", "l", E.TIME_LABELS], ["eveningGoldenMinutes", "Evening Golden Hour Length (minutes)", "n"], ["maxSunElevation", "Highest Sun Elevation Today (°)", "n"]],
    fn: E.goldenHour, ex: { date: DATE0, latitude: 40.71, longitude: -74.01, utcOffset: -5 },
    exText: (o) => `Example: in New York on 7 November 2026 the evening golden hour runs from about ${E.TIME_LABELS[o.eveningGoldenStart]} to ${E.TIME_LABELS[o.eveningGoldenEnd]}, with sunset at ${E.TIME_LABELS[o.sunset]}.`,
    how: "Enter the date and your location's latitude and longitude (from a map app) and the time-zone offset in effect on that date (for example −4 for New York in summer, −5 in winter). Times are rounded to 5 minutes.\n\nGolden hour is softer and warmer the lower the sun; mountains, buildings and clouds can shorten it.",
    assume: "NOAA solar-position equations. Golden hour = sun elevation from +6° to −4°; blue hour −4° to −6°; sunrise and sunset at −0.833° (accounting for refraction). '—' means the sun never crosses that height that day (polar day or night).",
    faq: [["When is golden hour?", "Roughly the hour after sunrise and the hour before sunset, when the sun is low."], ["How long does golden hour last?", "About 40–80 minutes at mid-latitudes; much longer near the poles."]],
  }),
  mk({
    slug: "animation-cost-calculator", title: "Animation Cost Calculator (Price per Minute)",
    desc: "Estimate the cost of an animated video by length and style — whiteboard, 2D motion graphics, 2D character, 3D or stop motion — with complexity, voice-over, music, revisions and rush fees.",
    meta: "Animation Cost Calculator — Cost per Minute by Style",
    inputs: [num("minutes", "Video Length (minutes)", 1.5, 1000, 0.1), dropdown("style", "Animation Style", opts(E.ANIMATION.map(([n, r]) => `${n} (≈ $${r.toLocaleString("en-US")}/min)`)), 1), dropdown("complexity", "Complexity", opts(["Simple", "Standard", "Complex / premium"]), 1), cur("ratePerMinute", "Studio's Own Rate per Minute (0 = use style)", 0, 1e6, 10), cur("script", "Script Writing", 500, 1e6), cur("voiceOver", "Voice-Over", 400, 1e6), cur("music", "Music & Sound Design", 300, 1e6), num("extraRevisions", "Extra Revision Rounds", 0, 20, 1), dropdown("rush", "Rush Delivery (+25%)?", opts(["No", "Yes"]), 0)],
    results: [["totalCost", "Total Cost", "c"], ["animationCost", "Animation", "c"], ["extras", "Script, Audio, Revisions & Rush", "c"], ["costPerMinute", "Cost per Minute", "c"], ["costPerSecond", "Cost per Second", "c"], ["productionWeeks", "Typical Production Time (weeks)", "n"]],
    fn: E.animationCost, ex: { minutes: 1.5, style: 1, complexity: 1, ratePerMinute: 0, script: 500, voiceOver: 400, music: 300, extraRevisions: 0, rush: 0 },
    exText: (o) => `Example: a 90-second 2D motion-graphics explainer with script, voice-over and music costs about ${usd(o.totalCost)} and takes roughly ${fmt(o.productionWeeks)} weeks.`,
    how: "Choose the style and length. Freelancers are often cheaper than the defaults; agencies and broadcast-quality studios can be several times higher.",
    assume: "Typical 2026 mid-market rates per finished minute: whiteboard ≈ $1,500, 2D motion graphics ≈ $3,500, 2D character ≈ $7,000, 3D product ≈ $10,000, 3D character ≈ $20,000, stop motion ≈ $12,000. Each extra revision round ≈ 8% of animation cost.",
    faq: [["How much does a 1-minute animated video cost?", "Usually $1,500–10,000, and much more for 3D character work."], ["Why is 3D animation more expensive?", "Modelling, rigging, lighting and rendering take far more time per second."]],
  }),
  mk({
    slug: "movie-budget-calculator", title: "Movie Budget Calculator (Indie Film Budget)",
    desc: "Build an independent film or short film budget — cast, crew day rates, equipment, locations, catering, post-production, insurance, contingency and festival costs — with cost per shoot day and per finished minute.",
    meta: "Movie Budget Calculator — Indie Film Budget Estimate",
    inputs: [num("shootDays", "Shoot Days", 15, 1000, 1), num("crewSize", "Crew Size", 12, 10000, 1), cur("crewDayRate", "Average Crew Day Rate", 350, 10000), num("castSize", "Cast Size", 8, 10000, 1), cur("castCost", "Total Cast Fees", 30000, 1e9), cur("writerDirector", "Writer, Director & Producer Fees", 20000, 1e9), cur("equipmentPerDay", "Camera, Lighting & Grip per Day", 1500, 1e7), cur("locationsPerDay", "Locations & Permits per Day", 500, 1e7), cur("artDept", "Art Department, Wardrobe & Props", 8000, 1e9), cur("mealsPerPersonDay", "Catering per Person per Day", 30, 1000), pct("postPercent", "Post-Production (% of production)", 20, 100), pct("insurancePercent", "Insurance", 3, 20), pct("contingencyPercent", "Contingency", 10, 50), cur("festivalMarketing", "Festivals & Marketing", 5000, 1e9), num("runtimeMinutes", "Finished Runtime (minutes)", 90, 1000, 1)],
    results: [["totalBudget", "Total Budget", "c"], ["aboveTheLine", "Above the Line (cast, writer, director)", "c"], ["productionCosts", "Production (crew, gear, locations, food)", "c"], ["postProduction", "Post-Production", "c"], ["insuranceAndContingency", "Insurance & Contingency", "c"], ["costPerShootDay", "Cost per Shoot Day", "c"], ["costPerFinishedMinute", "Cost per Finished Minute", "c"]],
    fn: E.movieBudget, ex: { shootDays: 15, crewSize: 12, crewDayRate: 350, castSize: 8, castCost: 30000, writerDirector: 20000, equipmentPerDay: 1500, locationsPerDay: 500, artDept: 8000, mealsPerPersonDay: 30, postPercent: 20, insurancePercent: 3, contingencyPercent: 10, festivalMarketing: 5000, runtimeMinutes: 90 },
    exText: (o) => `Example: a 15-day micro-budget feature with a 12-person crew comes to about ${usd(o.totalBudget)} — ${usd(o.costPerShootDay)} per shoot day.`,
    how: "Start with the schedule: shoot days drive most costs. Union (SAG-AFTRA, IATSE) productions use set minimum rates — check the current agreements for your budget tier.\n\nKeep a 10% contingency; almost every production uses it.",
    assume: "Post-production is a percentage of production and above-the-line costs; insurance and contingency are percentages of the subtotal. Figures are planning estimates, not a full top-sheet budget.",
    faq: [["How much does an indie movie cost?", "Micro-budget features often cost $50,000–250,000; low-budget features up to a few million."], ["What is 'above the line'?", "Creative leads — writer, director, producers and main cast."]],
  }),
  mk({
    slug: "dance-floor-size-calculator", title: "Dance Floor Size Calculator (Weddings & Events)",
    desc: "Find the right dance floor size for your guests — square feet, how many dancers at once and how many 3 × 3 ft, 4 × 4 ft or 2 × 2 ft panels to rent.",
    meta: "Dance Floor Size Calculator — Size for Your Guest Count",
    inputs: [num("guests", "Guests", 150, 100000, 1), pct("dancingPercent", "Share Dancing at Once", 40, 100, 1), num("sqFtPerDancer", "Space per Dancer (sq ft)", 4.5, 20, 0.5, 2), dropdown("panelSize", "Panel Size", opts(["3 × 3 ft", "4 × 4 ft", "2 × 2 ft"]), 0)],
    results: [["floorAreaSqFt", "Dance Floor Area (sq ft)", "n"], ["dancersAtOnce", "Dancers at Once", "n"], ["squareSideFt", "Square Floor Side (ft)", "n"], ["panelsNeeded", "Panels Needed", "n"], ["squareLayoutPanels", "Panels for a Square Layout", "n"], ["squareLayoutSideFt", "Square Layout Side (ft)", "n"]],
    fn: E.danceFloor, ex: { guests: 150, dancingPercent: 40, sqFtPerDancer: 4.5, panelSize: 0 },
    exText: (o) => `Example: 150 guests with 40% dancing need about ${o.floorAreaSqFt} sq ft — a ${o.squareLayoutSideFt} × ${o.squareLayoutSideFt} ft floor of ${o.squareLayoutPanels} panels.`,
    how: "Plan for 30–50% of guests dancing at once (more for a young crowd or a great band). Rental floors come in 3 × 3 or 4 × 4 ft panels; round up to a full layout.",
    assume: "About 4.5 sq ft per dancer (3 sq ft is tight, 6 is roomy).",
    faq: [["What size dance floor for 100 guests?", "About 180–225 sq ft — roughly 15 × 15 ft."], ["What size dance floor for 200 guests?", "About 360–450 sq ft — roughly 20 × 20 ft."]],
  }),
  mk({
    slug: "pipe-and-drape-calculator", title: "Pipe and Drape Calculator (Uprights, Crossbars & Drapes)",
    desc: "Plan a pipe and drape backdrop or booth wall — uprights, bases, crossbars and drape panels for your length, height and fabric fullness, with a rental cost estimate.",
    meta: "Pipe and Drape Calculator — Uprights, Crossbars & Panels",
    inputs: [num("lengthFt", "Total Run Length (ft)", 30, 10000, 0.5), num("heightFt", "Height (ft)", 8, 40, 0.5, 3), num("uprightSpacing", "Upright Spacing (crossbar length, ft)", 10, 14, 0.5, 4), num("corners", "Extra Uprights for Corners / Returns", 0, 100, 1), pct("fullness", "Fabric Fullness (100% = double width)", 100, 300, 25), num("panelWidthFt", "Drape Panel Width (ft)", 5, 20, 0.5, 1), cur("pricePerSection", "Rental Price per Section", 25, 10000, 0.5)],
    results: [["uprights", "Uprights", "n"], ["bases", "Base Plates", "n"], ["crossbars", "Crossbars", "n"], ["drapePanels", "Drape Panels", "n"], ["fabricLinearFeet", "Fabric Width Needed (ft)", "n"], ["fabricSqFt", "Fabric Area (sq ft)", "n"], ["rentalCost", "Estimated Rental Cost", "c"]],
    fn: E.pipeAndDrape, ex: { lengthFt: 30, heightFt: 8, uprightSpacing: 10, corners: 0, fullness: 100, panelWidthFt: 5, pricePerSection: 25 },
    exText: (o) => `Example: a 30 ft, 8 ft-high backdrop with uprights every 10 ft needs ${o.uprights} uprights, ${o.crossbars} crossbars and ${o.drapePanels} five-foot drape panels at 100% fullness.`,
    how: "Measure the run. Each section between two uprights takes one crossbar; corners and returns add uprights. 100% fullness (fabric twice the run length) gives soft pleats; 0% hangs flat.",
    assume: "Sections = run ÷ spacing (rounded up); uprights = sections + 1 + corners; panels = run × (1 + fullness) ÷ panel width.",
    faq: [["How many drape panels for 10 ft of pipe and drape?", "Four 5-ft panels at 100% fullness."], ["What height is standard for trade show pipe and drape?", "8 ft back walls and 3 ft side rails."]],
  }),
  mk({
    slug: "stage-size-calculator", title: "Stage Size Calculator (Bands, Speakers & Performances)",
    desc: "Work out how big a stage you need for a band, DJ, speakers, dancers, choir or theatre cast — area, width and depth, number of 4 × 8 ft stage decks, recommended height for your audience and steps.",
    meta: "Stage Size Calculator — Stage Area, Decks & Height",
    inputs: [dropdown("act", "Type of Performance", opts(E.STAGE_ACTS.map(([n]) => n)), 0), num("performers", "Number of Performers", 5, 1000, 1), dropdown("drumRiser", "Drum Riser (8 × 8 ft)?", opts(["No", "Yes"]), 1), num("extraSqFt", "Extra Space (podium, props, gear, sq ft)", 0, 100000, 1), num("audience", "Audience Size", 200, 1000000, 1)],
    results: [["stageAreaSqFt", "Stage Area (sq ft)", "n"], ["widthFt", "Width (ft)", "n"], ["depthFt", "Depth (ft)", "n"], ["decks4x8", "4 × 8 ft Stage Decks", "n"], ["stageHeightIn", "Recommended Stage Height (in)", "n"], ["stepsNeeded", "Steps for Access", "n"]],
    fn: E.stageSize, ex: { act: 0, performers: 5, drumRiser: 1, extraSqFt: 0, audience: 200 },
    exText: (o) => `Example: a 5-piece band with a drum riser for 200 people needs about ${o.stageAreaSqFt} sq ft — roughly ${o.widthFt} × ${o.depthFt} ft, or ${o.decks4x8} four-by-eight decks, at ${o.stageHeightIn} in high.`,
    how: "Choose the performance type and count. Bands need room for amps, monitors and movement; dancers need far more. Raise the stage so everyone can see — higher for bigger, standing crowds — and add railings above about 30 in.",
    assume: "Space per performer: band 25 sq ft, speakers 15, dancers 40, choir 6, theatre 35; DJ booth or drum riser 64 sq ft; +15% circulation; stage about twice as wide as deep. Height guide: 12 in (≤ 50 people) to 48 in (1,000+).",
    faq: [["How big a stage for a 5-piece band?", "About 16 × 12 ft minimum, 20 × 16 ft comfortable."], ["How high should a stage be?", "18–24 in for a few hundred people; 36–48 in for large standing crowds."]],
  }),
  mk({
    slug: "vivid-seats-fees-calculator", title: "Vivid Seats Fees Calculator (Ticket All-In Price)",
    desc: "See the real cost of tickets on Vivid Seats — listed price plus service and delivery fees and tax — and what a seller takes home after fees.",
    meta: "Vivid Seats Fees Calculator — All-In Ticket Price & Seller Payout",
    inputs: [cur("ticketPrice", "Listed Ticket Price (each)", 90, 100000, 0.01), num("quantity", "Number of Tickets", 2, 100, 1, 1), pct("buyerFeePercent", "Buyer Service Fee", 30, 60), cur("deliveryFee", "Delivery / Fulfilment Fee (per order)", 2.5, 100, 0.01), pct("salesTax", "Sales Tax", 0, 15, 0.05), pct("sellerFeePercent", "Seller Fee (if you are selling)", 10, 30)],
    results: [["totalYouPay", "Total You Pay", "c"], ["serviceFees", "Fees", "c"], ["perTicketAllIn", "All-In Price per Ticket", "c"], ["feesAsPercent", "Fees & Tax as % of Ticket Price", "n"], ["sellerPayout", "Seller Payout", "c"]],
    fn: E.vividSeats, ex: { ticketPrice: 90, quantity: 2, buyerFeePercent: 30, deliveryFee: 2.5, salesTax: 0, sellerFeePercent: 10 },
    exText: (o) => `Example: two $90 tickets with a 30% service fee and $2.50 delivery cost about ${usd(o.totalYouPay)} — ${usd(o.perTicketAllIn)} each.`,
    how: "Enter the listed price and the fee shown at checkout. Fees vary by event and demand; Vivid Seats now shows all-in prices in many places, so compare the total, not the listing price.",
    assume: "Vivid Seats does not publish a fixed fee; buyer fees are commonly 20–40% of the ticket price (default 30%) plus a small delivery fee, and the seller fee is about 10%.",
    faq: [["How much are Vivid Seats fees?", "Often 20–40% of the ticket price, shown at checkout."], ["How much does Vivid Seats take from sellers?", "About 10% of the sale price."]],
  }),
  mk({
    slug: "band-profit-calculator", title: "Band Gig Profit Calculator (Show and Tour Profit)",
    desc: "Work out what a gig or tour date really earns — guarantee, door split, merch profit and tips minus agent and manager commissions, travel, hotel and food — with profit per band member and break-even tickets.",
    meta: "Band Profit Calculator — Gig Profit per Member",
    inputs: [cur("guarantee", "Guarantee / Flat Fee", 300, 1e8), num("ticketsSold", "Tickets Sold", 120, 1e7, 1), cur("ticketPrice", "Ticket Price", 15, 10000, 0.5), pct("doorSplit", "Band's Share of Door (after the house)", 70), cur("merchSales", "Merch Sales", 600, 1e8), pct("merchCostPercent", "Merch Cost of Goods", 40), cur("tips", "Tips / Other", 0, 1e7), pct("agentPercent", "Booking Agent (on gig income)", 10), pct("managerPercent", "Manager (on gross)", 15), num("miles", "Driving Miles", 300, 100000, 1), cur("costPerMile", "Cost per Mile", 0.7, 10, 0.01), cur("hotel", "Hotel", 150, 1e6), cur("food", "Food & Per Diems", 120, 1e6), cur("otherCosts", "Gear Rental, Crew & Other", 100, 1e7), num("members", "Band Members", 4, 50, 1, 1)],
    results: [["profit", "Profit", "c"], ["perMember", "Profit per Member", "c"], ["revenue", "Total Income", "c"], ["commissions", "Agent & Manager Commissions", "c"], ["expenses", "Travel & Costs", "c"], ["merchProfit", "Merch Profit", "c"], ["breakEvenTickets", "Tickets Needed to Break Even", "n"]],
    fn: E.bandProfit, ex: { guarantee: 300, ticketsSold: 120, ticketPrice: 15, doorSplit: 70, merchSales: 600, merchCostPercent: 40, tips: 0, agentPercent: 10, managerPercent: 15, miles: 300, costPerMile: 0.7, hotel: 150, food: 120, otherCosts: 100, members: 4 },
    exText: (o) => `Example: a $300 guarantee, 120 tickets at $15 with a 70% door deal and $600 of merch leaves ${usd(o.profit)} after costs — ${usd(o.perMember)} per member.`,
    how: "Enter the deal and the night's numbers. Agents usually commission gig income only; managers often take a share of gross income. Merch is frequently the biggest profit centre for touring bands.",
    assume: "Costs per mile default to $0.70 (IRS 2026-style rate for fuel, wear and insurance). Break-even tickets cover travel, costs and commissions after the guarantee and merch profit.",
    faq: [["How much do bands make per gig?", "Local bands often $100–1,000 a night; touring acts vary enormously."], ["What is a door split?", "A deal where the band takes a percentage of ticket sales after the venue's costs."]],
  }),
  mk({
    slug: "podcast-income-calculator", title: "Podcast Income Calculator (Ads & Listener Support)",
    desc: "Estimate podcast income from downloads — host-read ad revenue at your CPM and sell-through, network share and listener support (Patreon, subscriptions) — per month, per year and per episode.",
    meta: "Podcast Income Calculator — Ad CPM & Listener Support",
    inputs: [num("downloadsPerEpisode", "Downloads per Episode (first 30 days)", 5000, 1e9, 1), num("episodesPerMonth", "Episodes per Month", 4, 100, 1), num("adSlots", "Ad Slots per Episode", 2, 20, 1), cur("cpm", "CPM (per 1,000 downloads per ad)", 22, 500, 0.5), pct("sellThrough", "Ad Inventory Sold", 60), pct("networkShare", "Network / Ad Agency Share", 30), num("supporters", "Paying Supporters", 50, 1e7, 1), cur("supportPrice", "Average Support per Month", 5, 1000, 0.5), pct("platformFee", "Membership Platform Fee", 8, 30), cur("otherMonthly", "Other Monthly Income (affiliates, merch)", 0, 1e7)],
    results: [["monthlyIncome", "Monthly Income", "c"], ["yearlyIncome", "Yearly Income", "c"], ["adIncomeMonthly", "Ad Income per Month", "c"], ["listenerSupportMonthly", "Listener Support per Month", "c"], ["perEpisode", "Income per Episode", "c"], ["monthlyDownloads", "Monthly Downloads", "n"]],
    fn: E.podcastIncome, ex: { downloadsPerEpisode: 5000, episodesPerMonth: 4, adSlots: 2, cpm: 22, sellThrough: 60, networkShare: 30, supporters: 50, supportPrice: 5, platformFee: 8, otherMonthly: 0 },
    exText: (o) => `Example: 5,000 downloads per weekly episode with two ads at a $22 CPM and 50 supporters earns about ${usd(o.monthlyIncome)} a month (${usd(o.yearlyIncome)} a year).`,
    how: "Use downloads in an episode's first 30 days — that is what advertisers buy. Host-read ads earn the highest CPMs; programmatic ads pay less but need no selling. Sell-through is the share of ad slots actually filled.",
    assume: "Typical 2026 host-read CPMs are $15–30 (default $22); networks and agencies keep about 20–40%. Listener-support platforms charge about 5–12%.",
    faq: [["How much do podcasts make per 1,000 downloads?", "Roughly $15–30 per ad at host-read CPMs."], ["How many downloads to make money podcasting?", "Ad networks usually want at least 1,000–5,000 downloads per episode."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-arts-entertainment-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      // Published straight away (user, 6 Nov 2026: no tool should stay Draft).
      await prisma.tool.create({
        data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all published.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
