/**
 * Idea build, batch art1 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Arts & Entertainment > Art, Film & Creator Income, part 1 (38 tools).
 * Creator payouts use public platform fee rules (Twitch 50/60/70% splits, Patreon 8% + processing,
 * Etsy 6.5% transaction + 3% + $0.25 payment + $0.20 listing, Substack 10% + Stripe 2.9% + $0.30).
 * Revenue-per-view rates are editable defaults, not guarantees.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };

export const youtubeShorts: Calc = (v) => {
  const views = p(v, "views", 1e6), rpm = p(v, "rpm", 0.05);
  const e = (views / 1000) * rpm;
  return { earn: $(e), perMillion: $(1000 * rpm), month: `${$(e)} for ${nfmt(views)} views at ${$(rpm, 3)} RPM` };
};
export const tiktokRewards: Calc = (v) => {
  const views = p(v, "views", 500000), q = p(v, "qual", 70) / 100, rpm = p(v, "rpm", 0.6);
  const qv = views * q, e = (qv / 1000) * rpm;
  return { earn: $(e), qual: nfmt(qv), per1k: $(rpm, 2) + " per 1,000 qualified views" };
};
export const twitchSubs: Calc = (v) => {
  const t1 = p(v, "t1", 200), t2 = p(v, "t2", 20), t3 = p(v, "t3", 5), share = [0.5, 0.6, 0.7][pick(v.split, 3)];
  const gross = t1 * 4.99 + t2 * 9.99 + t3 * 24.99, net = gross * share;
  return { net: $(net), gross: $(gross), yearly: $(net * 12), detail: `${nfmt(t1 + t2 + t3)} subs · creator share ${Math.round(share * 100)}%` };
};
export const patreonTiers: Calc = (v) => {
  const tiers = [[p(v, "m1", 100), p(v, "pr1", 5)], [p(v, "m2", 40), p(v, "pr2", 10)], [p(v, "m3", 10), p(v, "pr3", 25)]];
  const fee = p(v, "fee", 8) / 100;
  let gross = 0, proc = 0, n = 0;
  for (const [m, pr] of tiers) { gross += m * pr; proc += m * (pr <= 3 ? pr * 0.05 + 0.1 : pr * 0.029 + 0.3); n += m; }
  const net = gross - gross * fee - proc;
  return { net: $(net), gross: $(gross), fees: `${$(gross * fee)} platform + ${$(proc)} processing`, patrons: nfmt(n), yearly: $(net * 12) };
};
export const onlyfansNet: Calc = (v) => {
  const subs = p(v, "subs", 300), price = p(v, "price", 9.99), tips = p(v, "tips", 1500), ppv = p(v, "ppv", 800);
  const gross = subs * price + tips + ppv, net = gross * 0.8;
  return { net: $(net), gross: $(gross), fee: $(gross * 0.2) + " (20% platform fee)", yearly: $(net * 12) };
};
export const substackRevenue: Calc = (v) => {
  const subs = p(v, "subs", 500), price = p(v, "price", 8), annual = p(v, "annual", 30) / 100, aprice = p(v, "aprice", 80);
  const mSubs = subs * (1 - annual), aSubs = subs * annual;
  const yearGross = mSubs * price * 12 + aSubs * aprice;
  const stripe = mSubs * 12 * (price * 0.029 + 0.3) + aSubs * (aprice * 0.029 + 0.3);
  const net = yearGross * 0.9 - stripe;
  return { net: $(net), monthly: $(net / 12), gross: $(yearGross), fees: `${$(yearGross * 0.1)} Substack 10% + ${$(stripe)} card fees` };
};
export const podcastAds: Calc = (v) => {
  const dl = p(v, "dl", 5000), slots = p(v, "slots", 3), cpm = p(v, "cpm", 25), eps = p(v, "eps", 4), fill = p(v, "fill", 70) / 100;
  const perEp = (dl / 1000) * cpm * slots * fill;
  return { month: $(perEp * eps), perEp: $(perEp), year: $(perEp * eps * 12), note: `${slots} ad slots × ${$(cpm, 0)} CPM × ${Math.round(fill * 100)}% sold` };
};
export const igPostRate: Calc = (v) => {
  const f = p(v, "followers", 50000), er = p(v, "er", 3) / 100;
  const base = (f / 1000) * 10, adj = base * Math.min(2.5, Math.max(0.4, er / 0.03));
  return { rate: $(adj, 0), range: `${$(adj * 0.7, 0)} – ${$(adj * 1.3, 0)}`, story: $(adj * 0.35, 0), reel: $(adj * 1.5, 0), eng: `${nfmt(f * er)} engagements per post expected` };
};
export const brandDeal: Calc = (v) => {
  const rate = p(v, "rate", 800), n = p(v, "n", 3), usage = p(v, "usage", 25) / 100, excl = p(v, "excl", 20) / 100, rush = p(v, "rush", 0) / 100;
  const base = rate * n, total = base * (1 + usage + excl + rush);
  return { total: $(total, 0), base: $(base, 0), extras: `usage ${$(base * usage, 0)} · exclusivity ${$(base * excl, 0)} · rush ${$(base * rush, 0)}` };
};
export const etsyPrint: Calc = (v) => {
  const price = p(v, "price", 25), cost = p(v, "cost", 6), shipC = p(v, "shipc", 4.5), shipCost = p(v, "ship", 4), ads = p(v, "ads", 0) / 100;
  const rev = price + shipC, fees = rev * 0.065 + rev * 0.03 + 0.25 + 0.2 + price * ads;
  const profit = rev - fees - cost - shipCost;
  return { profit: $(profit), fees: $(fees), margin: `${((100 * profit) / price).toFixed(1)}% of item price`, breakeven: $((cost + shipCost - shipC * 0.905 + 0.45) / (0.905 - ads)) };
};
export const paintingPrice: Calc = (v) => {
  const w = p(v, "w", 24), h = p(v, "h", 36), rate = p(v, "rate", 2), mat = p(v, "mat", 60);
  const area = w * h, price = area * rate + mat, linear = (w + h) * rate * 10;
  return { price: $(price, 0), area: `${nfmt(area)} sq in`, linear: $(linear + mat, 0) + " by the linear-inch method (×10)", materials: $(mat * 2, 0) + " if you double materials (common rule)" };
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const canvasRatio: Calc = (v) => {
  const w = need(p(v, "w", 16), "Enter a width."), h = need(p(v, "h", 20), "Enter a height.");
  const k = 100, g = gcd(Math.round(w * k), Math.round(h * k)), rw = Math.round(w * k) / g, rh = Math.round(h * k) / g;
  const sizes = [8, 12, 16, 24, 30, 36].map((x) => `${x}×${(x * h / w).toFixed(1)}`).join(" · ");
  return { ratio: `${rw}:${rh}`, decimal: (w / h).toFixed(4), sizes: `Same shape at other widths: ${sizes}` };
};
export const printDpi: Calc = (v) => {
  const px = p(v, "px", 4000), py = p(v, "py", 3000), w = need(p(v, "w", 10), "Enter print width."), h = need(p(v, "h", 8), "Enter print height.");
  const dpi = Math.min(px / w, py / h);
  return { dpi: nfmt(dpi), quality: dpi >= 300 ? "Excellent (300+ DPI, photo quality)" : dpi >= 200 ? "Good for most prints" : dpi >= 150 ? "Acceptable at viewing distance" : "Low — expect softness", max300: `${(px / 300).toFixed(1)} × ${(py / 300).toFixed(1)} in at 300 DPI` };
};
export const upscalePrint: Calc = (v) => {
  const px = p(v, "px", 3000), py = p(v, "py", 2000), dpi = need(p(v, "dpi", 300), "Enter a DPI."), tw = p(v, "tw", 24);
  const f = (tw * dpi) / px;
  return { size: `${(px / dpi).toFixed(1)} × ${(py / dpi).toFixed(1)} in`, factor: f <= 1 ? "No upscaling needed" : `${f.toFixed(2)}× upscale for a ${tw} in wide print`, cm: `${((px / dpi) * 2.54).toFixed(1)} × ${((py / dpi) * 2.54).toFixed(1)} cm` };
};
export const weddingPhoto: Calc = (v) => {
  const hrs = p(v, "hrs", 8), rate = p(v, "rate", 250), edit = p(v, "edit", 20), erate = p(v, "erate", 50), second = p(v, "second", 600), album = p(v, "album", 500), travel = p(v, "travel", 150), exp = p(v, "exp", 400);
  const price = hrs * rate + edit * erate + second + album + travel, profit = price - exp - second * 0.8;
  return { price: $(price, 0), profit: $(profit, 0), perHour: $(profit / (hrs + edit), 0) + " per hour worked", note: `${hrs} h shooting + ${edit} h editing` };
};
export const stockPhoto: Calc = (v) => {
  const n = p(v, "n", 1000), d = p(v, "d", 0.1), r = p(v, "r", 0.35);
  const m = n * d * r;
  return { month: $(m), year: $(m * 12), perImage: $(d * r * 12) + " per image a year" };
};
export const filmBudget: Calc = (v) => {
  const atl = p(v, "atl", 50000), btl = p(v, "btl", 120000), post = p(v, "post", 40000), other = p(v, "other", 15000), cont = p(v, "cont", 10) / 100, ins = p(v, "ins", 3) / 100;
  const sub = atl + btl + post + other, total = sub * (1 + cont + ins);
  return { total: $(total, 0), subtotal: $(sub, 0), split: `ATL ${((100 * atl) / sub).toFixed(0)}% · BTL ${((100 * btl) / sub).toFixed(0)}% · Post ${((100 * post) / sub).toFixed(0)}%`, cont: `${$(sub * cont, 0)} contingency + ${$(sub * ins, 0)} insurance` };
};
export const crewDayRate: Calc = (v) => {
  const rate = p(v, "rate", 600), base = p(v, "base", 10), hrs = p(v, "hrs", 12), days = p(v, "days", 5), kit = p(v, "kit", 50);
  const hourly = rate / base, ot = Math.max(0, hrs - base), day = rate + ot * hourly * 1.5 + kit;
  return { day: $(day), total: $(day * days), ot: `${ot} OT hours a day at ${$(hourly * 1.5)}/h`, hourly: $(hourly) + " base hourly" };
};
export const editRate: Calc = (v) => {
  const mins = p(v, "mins", 10), ratio = p(v, "ratio", 1.5), hourly = p(v, "hourly", 60), rev = p(v, "rev", 2);
  const hours = mins * ratio + rev * 1.5, price = hours * hourly;
  return { price: $(price, 0), perMin: $(price / Math.max(mins, 1e-9), 0) + " per finished minute", hours: `${hours.toFixed(1)} hours` };
};
export const videoSize: Calc = (v) => {
  const mode = pick(v.mode, 2), mins = need(p(v, "mins", 10), "Enter a duration."), audio = p(v, "audio", 0.32);
  if (mode === 1) { const gb = p(v, "gb", 1); const mbps = (gb * 8000) / (mins * 60) - audio; return { size: `${mbps.toFixed(2)} Mbps video bitrate`, other: `${gb} GB over ${mins} min`, perMin: `${(gb * 1024 / mins).toFixed(0)} MB per minute` }; }
  const mbps = p(v, "mbps", 8), mb = ((mbps + audio) * mins * 60) / 8;
  return { size: mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`, other: `${mbps} Mbps video + ${audio} Mbps audio`, perMin: `${(mb / mins).toFixed(0)} MB per minute` };
};
export const frameRate: Calc = (v) => {
  const frames = p(v, "frames", 2400), a = need(p(v, "a", 24), "Enter source fps."), b = need(p(v, "b", 30), "Enter target fps.");
  const sec = frames / a;
  return { dur: `${sec.toFixed(3)} s at ${a} fps`, target: `${nfmt(sec * b)} frames to keep the same length at ${b} fps`, speed: `${((100 * b) / a).toFixed(2)}% speed if frames are played 1:1 at ${b} fps (${(frames / b).toFixed(2)} s)` };
};
export const timelapse: Calc = (v) => {
  const ev = need(p(v, "event", 120), "Enter event length."), clip = need(p(v, "clip", 10), "Enter clip length."), fps = p(v, "fps", 30);
  const shots = clip * fps, interval = (ev * 60) / shots;
  return { interval: `${interval.toFixed(2)} s between shots`, shots: nfmt(shots) + " photos", speed: `${((ev * 60) / clip).toFixed(0)}× faster than real time`, storage: `${((shots * 25) / 1024).toFixed(1)} GB at 25 MB per RAW` };
};
export const SENSORS = ["Full frame (1.0×)", "APS-C Nikon/Sony/Fuji (1.5×)", "APS-C Canon (1.6×)", "Micro Four Thirds (2.0×)", "1-inch (2.7×)", "Smartphone (≈6×)"];
const CROP = [1, 1.5, 1.6, 2, 2.7, 6];
export const cropFactor: Calc = (v) => {
  const fl = need(p(v, "fl", 50), "Enter a focal length."), ap = p(v, "ap", 1.8), c = CROP[pick(v.sensor, CROP.length)];
  return { eq: `${(fl * c).toFixed(0)} mm full-frame equivalent`, aperture: `f/${(ap * c).toFixed(1)} equivalent depth of field`, crop: `${c}× crop factor` };
};
export const starTrail: Calc = (v) => {
  const fl = need(p(v, "fl", 24), "Enter a focal length."), c = CROP[pick(v.sensor, CROP.length)];
  return { r500: `${(500 / (fl * c)).toFixed(1)} s (500 rule)`, r300: `${(300 / (fl * c)).toFixed(1)} s (300 rule, sharper on high-res sensors)`, eq: `${(fl * c).toFixed(0)} mm equivalent` };
};
export const guideNumber: Calc = (v) => {
  const gn = need(p(v, "gn", 40), "Enter the guide number."), iso = p(v, "iso", 400), d = need(p(v, "d", 5), "Enter the distance.");
  const gnIso = gn * Math.sqrt(iso / 100);
  return { f: `f/${(gnIso / d).toFixed(1)}`, gn: `GN ${gnIso.toFixed(1)} at ISO ${iso}`, reach: `${(gnIso / 8).toFixed(1)} m at f/8` };
};
export const boxOffice: Calc = (v) => {
  const budget = p(v, "budget", 20e6), mkt = p(v, "mkt", 10e6), share = p(v, "share", 50) / 100, gross = p(v, "gross", 75e6);
  const be = (budget + mkt) / share, profit = gross * share - budget - mkt;
  return { be: $(be, 0), profit: $(profit, 0), multiple: `${(be / budget).toFixed(2)}× the production budget`, rule: `Rule of thumb: about ${$(budget * 2.5, 0)} (2.5× budget)` };
};
export const streamRoyalty: Calc = (v) => {
  const s = p(v, "streams", 100000), rate = p(v, "rate", 0.004), dist = p(v, "dist", 0) / 100, split = p(v, "split", 100) / 100;
  const gross = s * rate, net = gross * (1 - dist) * split;
  return { net: $(net), gross: $(gross), perMillion: $(1e6 * rate * (1 - dist) * split, 0) + " per million streams" };
};
export const merchProfit: Calc = (v) => {
  const n = p(v, "n", 200), price = p(v, "price", 30), cost = p(v, "cost", 11), fee = p(v, "fee", 5) / 100, ship = p(v, "ship", 0);
  const unit = price - cost - price * fee - ship, total = unit * n;
  return { profit: $(total), unit: $(unit) + " per item", margin: `${((100 * unit) / price).toFixed(1)}%`, be: `${Math.ceil((p(v, "fixed", 300)) / Math.max(unit, 1e-9))} items to cover ${$(p(v, "fixed", 300), 0)} of setup costs` };
};
export const glazeBatch: Calc = (v) => {
  const parts = [p(v, "a", 30), p(v, "b", 25), p(v, "c", 20), p(v, "d", 15), p(v, "e", 10)], total = parts.reduce((s, x) => s + x, 0), batch = need(p(v, "batch", 1000), "Enter a batch size.");
  if (!(total > 0)) throw new InputError("Enter at least one ingredient percentage.");
  return { list: parts.map((x, i) => `${"ABCDE"[i]}: ${((x / total) * batch).toFixed(1)} g`).join(" · "), total: `${total.toFixed(1)}% recipe total → scaled to ${nfmt(batch)} g dry`, water: `about ${nfmt(batch * 0.9)} mL water for a dipping glaze` };
};
export const clayShrink: Calc = (v) => {
  const s = p(v, "s", 12) / 100, size = need(p(v, "size", 10), "Enter a size.");
  if (pick(v.mode, 2) === 1) return { size: `${(size / (1 - s)).toFixed(2)} wet`, note: `to finish at ${size} after ${(s * 100).toFixed(1)}% shrinkage`, vol: `${((1 - Math.pow(1 - s, 3)) * 100).toFixed(1)}% volume loss` };
  return { size: `${(size * (1 - s)).toFixed(2)} fired`, note: `${size} wet shrinks ${(s * 100).toFixed(1)}%`, vol: `${((1 - Math.pow(1 - s, 3)) * 100).toFixed(1)}% volume loss` };
};
export const resinVolume: Calc = (v) => {
  const l = p(v, "l", 24), w = p(v, "w", 12), d = p(v, "d", 0.125), waste = p(v, "waste", 10) / 100;
  const cuin = l * w * d * (1 + waste), oz = cuin * 0.554, ml = cuin * 16.387;
  return { oz: `${oz.toFixed(1)} fl oz (${ml.toFixed(0)} mL)`, split: `${(oz / 2).toFixed(1)} oz resin + ${(oz / 2).toFixed(1)} oz hardener at 1:1`, gal: `${(oz / 128).toFixed(2)} gallons` };
};
export const candleWax: Calc = (v) => {
  const vol = p(v, "vol", 8), n = p(v, "n", 12), fo = p(v, "fo", 8) / 100, dens = p(v, "dens", 0.86);
  const waxEach = vol * dens / (1 + fo), wax = waxEach * n, oil = wax * fo;
  return { wax: `${wax.toFixed(1)} oz wax (${(wax / 16).toFixed(2)} lb)`, oil: `${oil.toFixed(2)} oz fragrance oil (${(fo * 100).toFixed(0)}% load)`, each: `${waxEach.toFixed(2)} oz wax per candle` };
};
export const embroideryPrice: Calc = (v) => {
  const st = p(v, "st", 8000), rate = p(v, "rate", 1), min = p(v, "min", 8), qty = p(v, "qty", 24), setup = p(v, "setup", 25);
  const each = Math.max(min, (st / 1000) * rate);
  return { total: $(each * qty + setup), each: $(each) + " per piece", note: `${nfmt(st)} stitches at ${$(rate)} per 1,000 + ${$(setup, 0)} digitizing/setup` };
};
export const matSize: Calc = (v) => {
  const w = p(v, "w", 8), h = p(v, "h", 10), b = p(v, "b", 2), weight = p(v, "weight", 0.5), ov = p(v, "ov", 0.25);
  return { outer: `${(w + 2 * b).toFixed(2)} × ${(h + 2 * b + weight).toFixed(2)} in mat / frame size`, window: `${(w - 2 * ov).toFixed(2)} × ${(h - 2 * ov).toFixed(2)} in window opening`, borders: `${b} in sides & top, ${(b + weight).toFixed(2)} in bottom (weighted)` };
};
export const designRate: Calc = (v) => {
  const inc = p(v, "inc", 70000), exp = p(v, "exp", 12000), hrs = need(p(v, "hrs", 25), "Enter billable hours."), wks = p(v, "wks", 46), tax = p(v, "tax", 25) / 100;
  const need$ = (inc + exp) / (1 - tax), rate = need$ / (hrs * wks);
  return { rate: $(rate) + " per hour", day: $(rate * 8) + " day rate", gross: $(need$, 0) + " gross revenue needed a year" };
};
export const logoPrice: Calc = (v) => {
  const hrs = p(v, "hrs", 15), rate = p(v, "rate", 75), concepts = p(v, "concepts", 3), revs = p(v, "revs", 2), usage = [1, 1.5, 2.5][pick(v.usage, 3)];
  const price = (hrs + concepts * 2 + revs * 1.5) * rate * usage;
  return { price: $(price, 0), hours: `${(hrs + concepts * 2 + revs * 1.5).toFixed(1)} hours`, range: `${$(price * 0.8, 0)} – ${$(price * 1.25, 0)}` };
};
export const voiceOver: Calc = (v) => {
  const words = p(v, "words", 300), wpm = need(p(v, "wpm", 150), "Enter words per minute."), rate = p(v, "rate", 250), min = p(v, "min", 150), usage = p(v, "usage", 0) / 100;
  const mins = words / wpm, fee = Math.max(min, mins * rate) * (1 + usage);
  return { fee: $(fee, 0), length: `${mins.toFixed(1)} min (${Math.round(mins * 60)} s)`, note: `${$(rate, 0)} per finished minute, minimum ${$(min, 0)}${usage ? `, +${(usage * 100).toFixed(0)}% usage` : ""}` };
};
export const animFrames: Calc = (v) => {
  const sec = p(v, "sec", 60), fps = p(v, "fps", 24), step = pick(v.step, 3) + 1, perDay = p(v, "perDay", 40);
  const frames = sec * fps, drawings = Math.ceil(frames / step);
  return { drawings: nfmt(drawings) + " drawings", frames: nfmt(frames) + " frames", days: `${(drawings / Math.max(perDay, 1e-9)).toFixed(1)} working days at ${perDay} drawings a day` };
};

// ---- registry (generated)
export const ideaArt1CustomCalculators: Record<string, Calc> = {
  "youtube-shorts-fund-earnings-calculator": youtubeShorts,
  "tiktok-creator-rewards-earnings-calculator": tiktokRewards,
  "twitch-sub-revenue-split-calculator": twitchSubs,
  "patreon-tier-income-calculator": patreonTiers,
  "onlyfans-creator-net-income-calculator": onlyfansNet,
  "substack-paid-newsletter-revenue-calculator": substackRevenue,
  "podcast-ad-revenue-cpm-calculator": podcastAds,
  "instagram-sponsored-post-rate-calculator": igPostRate,
  "brand-deal-pricing-calculator": brandDeal,
  "etsy-art-print-profit-calculator": etsyPrint,
  "painting-price-per-square-inch-calculator": paintingPrice,
  "canvas-size-ratio-calculator": canvasRatio,
  "print-resolution-dpi-calculator": printDpi,
  "image-upscale-print-size-calculator": upscalePrint,
  "wedding-photographer-pricing-calculator": weddingPhoto,
  "stock-photo-earnings-calculator": stockPhoto,
  "film-budget-top-sheet-calculator": filmBudget,
  "film-crew-day-rate-calculator": crewDayRate,
  "video-editing-rate-per-minute-calculator": editRate,
  "video-file-size-bitrate-calculator": videoSize,
  "frame-rate-conversion-calculator": frameRate,
  "timelapse-interval-calculator": timelapse,
  "crop-factor-equivalent-focal-length-calculator": cropFactor,
  "shutter-speed-star-trail-500-rule-calculator": starTrail,
  "flash-guide-number-calculator": guideNumber,
  "box-office-profit-break-even-calculator": boxOffice,
  "streaming-royalty-per-stream-calculator": streamRoyalty,
  "merch-sales-profit-calculator": merchProfit,
  "ceramics-glaze-recipe-batch-calculator": glazeBatch,
  "pottery-clay-shrinkage-calculator": clayShrink,
  "resin-art-volume-calculator": resinVolume,
  "candle-wax-and-fragrance-load-calculator": candleWax,
  "embroidery-stitch-count-price-calculator": embroideryPrice,
  "picture-frame-mat-size-calculator": matSize,
  "freelance-design-hourly-rate-calculator": designRate,
  "logo-design-pricing-calculator": logoPrice,
  "voice-over-rate-calculator": voiceOver,
  "animation-frame-count-calculator": animFrames,
};
