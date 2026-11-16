/**
 * Idea build, batch art2 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Arts & Entertainment > Art, Film & Creator Income, part 2 (37 tools).
 * Photography: EV = log2(N²/t) − log2(ISO/100); Sunny 16 (f/16, 1/ISO in sun). Platform payout rates
 * are editable estimates.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };

export const droneBattery: Calc = (v) => {
  const shoot = p(v, "shoot", 90), flight = need(p(v, "flight", 30), "Enter flight time per battery."), reserve = p(v, "reserve", 20) / 100, have = p(v, "have", 3), charge = p(v, "charge", 70);
  const usable = flight * (1 - reserve), batt = Math.ceil(shoot / usable);
  return { batt: `${batt} battery swaps`, usable: `${usable.toFixed(1)} usable minutes per battery (${(reserve * 100).toFixed(0)}% kept in reserve)`, charge: batt > have ? `You need ${batt - have} more ${batt - have === 1 ? "battery" : "batteries"}, or ${Math.ceil(((batt - have) * charge) / have)} min of field charging` : "Your batteries cover the shoot" };
};
export const theaterRevenue: Calc = (v) => {
  const seats = p(v, "seats", 300), fill = p(v, "fill", 75) / 100, price = p(v, "price", 45), shows = p(v, "shows", 8), fees = p(v, "fees", 8) / 100;
  const sold = seats * fill * shows, gross = sold * price;
  return { gross: $(gross, 0), net: $(gross * (1 - fees), 0) + " after ticketing fees", sold: nfmt(sold) + " tickets", perShow: $(gross / Math.max(shows, 1), 0) + " per show" };
};
export const concertBreakEven: Calc = (v) => {
  const venue = p(v, "venue", 5000), talent = p(v, "talent", 8000), prod = p(v, "prod", 3000), mkt = p(v, "mkt", 2000), price = need(p(v, "price", 35), "Enter a ticket price."), fees = p(v, "fees", 10) / 100, cap = p(v, "cap", 1200);
  const costs = venue + talent + prod + mkt, netTicket = price * (1 - fees), be = Math.ceil(costs / netTicket);
  return { be: `${nfmt(be)} tickets`, pct: `${((100 * be) / Math.max(cap, 1)).toFixed(0)}% of capacity`, costs: $(costs, 0) + " total costs", soldOut: $(cap * netTicket - costs, 0) + " profit if sold out" };
};
export const galleryCommission: Calc = (v) => {
  const price = p(v, "price", 2000), comm = p(v, "comm", 50) / 100, frame = p(v, "frame", 150), ship = p(v, "ship", 60), target = p(v, "target", 1000);
  const artist = price * (1 - comm) - frame - ship;
  return { artist: $(artist), gallery: $(price * comm), retail: $((target + frame + ship) / (1 - comm), 0) + ` retail to net ${$(target, 0)}` };
};
export const auctionPremium: Calc = (v) => {
  const hammer = p(v, "hammer", 10000), bp = p(v, "bp", 25) / 100, tax = p(v, "tax", 8) / 100, seller = p(v, "seller", 10) / 100;
  const buyer = hammer * (1 + bp), total = buyer * (1 + tax);
  return { total: $(total, 0), premium: $(hammer * bp, 0) + " buyer's premium", seller: $(hammer * (1 - seller), 0) + " to the seller after commission", maxBid: $(p(v, "budget", 15000) / ((1 + bp) * (1 + tax)), 0) + " max hammer bid for your budget" };
};
export const YT_NICHES = ["Gaming", "Entertainment / vlog", "Education", "Tech reviews", "Personal finance", "Beauty & fashion", "Travel", "Health & fitness"];
const NICHE_RPM = [2, 2.5, 5, 6, 12, 4, 4.5, 5];
export const ytNiche: Calc = (v) => {
  const views = p(v, "views", 100000), n = pick(v.niche, NICHE_RPM.length), rpm = NICHE_RPM[n] * (p(v, "geo", 100) / 100);
  const e = (views / 1000) * rpm;
  return { earn: $(e) + " a month", range: `${$(e * 0.6)} – ${$(e * 1.5)}`, rpm: `${$(rpm)} RPM typical for ${YT_NICHES[n]}`, year: $(e * 12, 0) + " a year" };
};
export const watchHours: Calc = (v) => {
  const videos = p(v, "videos", 50), views = p(v, "views", 400), len = p(v, "len", 10), ret = p(v, "ret", 40) / 100;
  const hrs = (videos * views * len * ret) / 60, need4k = Math.max(0, 4000 - hrs);
  return { hrs: `${nfmt(hrs)} watch hours`, gap: need4k > 0 ? `${nfmt(need4k)} hours short of 4,000` : "Meets the 4,000-hour Partner Program requirement", perVideo: `${((views * len * ret) / 60).toFixed(1)} hours per video` };
};
export const reelsBonus: Calc = (v) => {
  const plays = p(v, "plays", 1e6), rate = p(v, "rate", 0.01), cap = p(v, "cap", 0);
  let e = (plays / 1000) * rate;
  if (cap > 0) e = Math.min(e, cap);
  return { earn: $(e), per1k: $(rate, 3) + " per 1,000 plays", note: cap > 0 ? `capped at ${$(cap, 0)}` : "no cap applied" };
};
export const fbCreator: Calc = (v) => {
  const views = p(v, "views", 500000), rpm = p(v, "rpm", 1.2), stars = p(v, "stars", 2000), subs = p(v, "subs", 50), sp = p(v, "sp", 4.99);
  const ads = (views / 1000) * rpm, starsE = stars * 0.01, subsE = subs * sp * 0.7;
  return { total: $(ads + starsE + subsE), ads: $(ads) + " in-stream / reels ads", stars: $(starsE) + ` from ${nfmt(stars)} Stars`, subs: $(subsE) + " from subscriptions (≈70% after fees)" };
};
export const snapSpotlight: Calc = (v) => {
  const views = p(v, "views", 1e6), rpm = p(v, "rpm", 0.25);
  const e = (views / 1000) * rpm;
  return { earn: $(e), per1m: $(rpm * 1000, 0) + " per million views", note: "Snap pays monthly-eligible creators per qualifying Spotlight and Story view" };
};
export const pinCreator: Calc = (v) => {
  const clicks = p(v, "clicks", 20000), conv = p(v, "conv", 2) / 100, comm = p(v, "comm", 8), rpm = p(v, "rpm", 15), sessions = p(v, "sessions", 0.6);
  const aff = clicks * conv * comm, ads = (clicks * sessions / 1000) * rpm * 1.5;
  return { total: $(aff + ads), aff: $(aff) + " affiliate commissions", ads: $(ads) + " blog ad revenue from Pinterest traffic" };
};
export const linkedinRate: Calc = (v) => {
  const f = p(v, "f", 20000), imp = p(v, "imp", 8000), cpm = p(v, "cpm", 40);
  const byImp = (imp / 1000) * cpm, byF = (f / 1000) * 20;
  return { rate: $(Math.max(byImp, byF), 0) + " per sponsored post", byImp: $(byImp, 0) + " by impressions", byF: $(byF, 0) + " by followers ($20 per 1,000)" };
};
export const kickStreamer: Calc = (v) => {
  const subs = p(v, "subs", 300), price = p(v, "price", 5), tips = p(v, "tips", 400), hrs = p(v, "hrs", 0), hrly = p(v, "hrly", 0);
  const net = subs * price * 0.95 + tips + hrs * hrly;
  return { net: $(net) + " a month", subs: $(subs * price * 0.95) + " subs at a 95/5 split", year: $(net * 12, 0) + " a year" };
};
export const kofi: Calc = (v) => {
  const tips = p(v, "tips", 600), shop = p(v, "shop", 400), memb = p(v, "memb", 300), gold = pick(v.gold, 2), proc = p(v, "proc", 3.5) / 100;
  const feeRate = gold ? 0 : 0.05, fees = (shop + memb) * feeRate + (tips + shop + memb) * proc + (gold ? 12 : 0);
  const net = tips + shop + memb - fees;
  return { net: $(net), fees: $(fees) + (gold ? " (Gold $12/mo, no platform fee)" : " (5% on shop & memberships + processing)"), gross: $(tips + shop + memb) };
};
export const KOFI_PLAN = ["Free plan", "Ko-fi Gold"];
export const courseRevenue: Calc = (v) => {
  const visitors = p(v, "vis", 10000), conv = p(v, "conv", 2) / 100, price = p(v, "price", 199), refund = p(v, "refund", 5) / 100, plat = p(v, "plat", 5) / 100, adsCost = p(v, "ads", 2000);
  const sales = visitors * conv, gross = sales * price, net = gross * (1 - refund) * (1 - plat) - adsCost;
  return { net: $(net, 0), sales: nfmt(sales) + " sales", gross: $(gross, 0), perStudent: $(net / Math.max(sales, 1)) + " net per student" };
};
export const ugcRate: Calc = (v) => {
  const videos = p(v, "videos", 3), base = p(v, "base", 150), raw = pick(v.raw, 2), hooks = p(v, "hooks", 2), usage = p(v, "usage", 1);
  const per = base + hooks * 25 + (raw ? 50 : 0), total = per * videos * (1 + 0.25 * usage);
  return { total: $(total, 0), per: $(per, 0) + " per video", note: `${hooks} extra hooks, ${raw ? "raw footage included" : "edited only"}, ${usage} months paid usage (+25%/month)` };
};
export const YESNO = ["No", "Yes"];
export const postSchedule: Calc = (v) => {
  const goal = p(v, "goal", 30), perWeek = need(p(v, "pw", 5), "Enter posts per week."), batch = p(v, "batch", 2), mins = p(v, "mins", 45);
  const weeks = goal / perWeek;
  return { weeks: `${weeks.toFixed(1)} weeks to publish ${goal} posts`, hours: `${((perWeek * mins) / 60).toFixed(1)} hours of creation a week`, batch: `${Math.ceil(perWeek / Math.max(batch, 1))} batching sessions a week (${batch} posts each)` };
};
export const filmRuntime: Calc = (v) => {
  const pages = p(v, "pages", 110), rate = p(v, "rate", 1), shootPerDay = p(v, "spd", 4);
  return { runtime: `${(pages * rate).toFixed(0)} minutes`, hm: `${Math.floor((pages * rate) / 60)} h ${Math.round((pages * rate) % 60)} min`, days: `${Math.ceil(pages / Math.max(shootPerDay, 0.1))} shooting days at ${shootPerDay} pages a day` };
};
export const shootDays: Calc = (v) => {
  const shots = p(v, "shots", 120), perHour = need(p(v, "ph", 3), "Enter setups per hour."), day = p(v, "day", 10), moves = p(v, "moves", 2), moveH = p(v, "moveh", 1.5);
  const hours = shots / perHour + moves * moveH, days = Math.ceil(hours / Math.max(day - 1, 1));
  return { days: `${days} shooting days`, hours: `${hours.toFixed(1)} working hours`, note: `${shots} setups at ${perHour}/hour, ${moves} company moves, 1 h meal break a day` };
};
export const lightingRatio: Calc = (v) => {
  const key = p(v, "key", 8), fill = need(p(v, "fill", 4), "Enter fill strength.");
  const r = key / fill, stops = Math.log2(r);
  return { ratio: `${r.toFixed(1)}:1`, stops: `${stops.toFixed(2)} stops difference`, look: r <= 2 ? "Soft, low-contrast (beauty / high key)" : r <= 4 ? "Classic portrait modelling" : r <= 8 ? "Dramatic" : "Very dramatic / low key" };
};
export const exposureValue: Calc = (v) => {
  const f = need(p(v, "f", 8), "Enter an aperture."), t = need(p(v, "t", 0.008), "Enter a shutter speed in seconds."), iso = need(p(v, "iso", 100), "Enter ISO.");
  const ev100 = Math.log2((f * f) / t), ev = ev100 - Math.log2(iso / 100);
  const scene = ev100 >= 15 ? "Bright sun on sand/snow" : ev100 >= 13 ? "Sunny day" : ev100 >= 11 ? "Overcast" : ev100 >= 8 ? "Bright interior / dusk" : ev100 >= 5 ? "Home interior at night" : "Night street / candlelight";
  return { ev: `EV ${ev100.toFixed(1)} (at ISO 100)`, scene: `Scene brightness this exposure suits: ${scene}`, evIso: `EV ${ev.toFixed(1)} at ISO ${iso}` };
};
export const SUN = ["Snow / sand (f/22)", "Sunny (f/16)", "Slight overcast (f/11)", "Overcast (f/8)", "Heavy overcast (f/5.6)", "Open shade / sunset (f/4)"];
const SUN_F = [22, 16, 11, 8, 5.6, 4];
export const sunny16: Calc = (v) => {
  const iso = need(p(v, "iso", 100), "Enter ISO."), c = pick(v.c, 6), f = SUN_F[c];
  const t = 1 / iso, alt = [2.8, 4, 5.6, 8, 11, 16].map((a) => `f/${a}: 1/${Math.round(iso * (f / a) ** 2)}`).join(" · ");
  return { exp: `f/${f} at 1/${Math.round(iso)} s`, alt: `Same exposure: ${alt}`, t: `${t.toFixed(5)} s base shutter` };
};
export const devTime: Calc = (v) => {
  const t20 = need(p(v, "t20", 9), "Enter time at 20 °C."), temp = num(v.temp, 22);
  if (temp < 15 || temp > 30) throw new InputError("Use a temperature between 15 and 30 °C.");
  const t = t20 * Math.exp(-0.081 * (temp - 20));
  return { time: `${Math.floor(t)} min ${Math.round((t % 1) * 60)} s`, note: `at ${temp} °C (from ${t20} min at 20 °C)`, factor: `${(t / t20).toFixed(3)}× the 20 °C time` };
};
export const paintMix: Calc = (v) => {
  const parts = [p(v, "a", 3), p(v, "b", 1), p(v, "c", 0)], total = parts.reduce((s, x) => s + x, 0), vol = need(p(v, "vol", 500), "Enter a total amount.");
  if (!(total > 0)) throw new InputError("Enter at least one part.");
  return { mix: parts.map((x, i) => `Colour ${i + 1}: ${((x / total) * vol).toFixed(1)}`).join(" · "), ratio: parts.filter((x) => x > 0).join(" : "), pct: parts.map((x) => `${((100 * x) / total).toFixed(1)}%`).join(" / ") };
};
export const YARN_W = ["Lace / fingering", "Sport / DK", "Worsted / aran", "Bulky", "Super bulky"];
const YPS = [10, 7.5, 5, 3.5, 2.5];
export const knitYardage: Calc = (v) => {
  const w = p(v, "w", 50), l = p(v, "l", 60), wt = pick(v.wt, 5), skein = need(p(v, "skein", 200), "Enter yards per skein.");
  const yards = w * l * YPS[wt] * 0.1 * 1.1;
  return { yards: `${nfmt(yards)} yards`, skeins: `${Math.ceil(yards / skein)} skeins of ${skein} yd`, note: `${YARN_W[wt]} stockinette, +10% spare` };
};
export const BLANKET = ["Lovey (12×12 in)", "Stroller (30×35)", "Baby (36×45)", "Throw (50×60)", "Twin (65×90)", "Full (80×90)", "Queen (90×100)", "King (108×100)"];
const BL = [[12, 12], [30, 35], [36, 45], [50, 60], [65, 90], [80, 90], [90, 100], [108, 100]];
export const crochetBlanket: Calc = (v) => {
  const s = pick(v.size, BL.length), g = need(p(v, "g", 14), "Enter stitches per 4 in."), r = need(p(v, "r", 8), "Enter rows per 4 in."), ypsq = p(v, "ypsq", 4.5);
  const [w, h] = BL[s];
  return { size: `${w} × ${h} in`, chain: `${Math.round((w * g) / 4)} starting chain stitches · ${Math.round((h * r) / 4)} rows`, yarn: `about ${nfmt(w * h * ypsq / 10)} yards` };
};
export const knitGauge: Calc = (v) => {
  const sts = need(p(v, "sts", 20), "Enter stitches in the swatch."), sw = need(p(v, "sw", 4), "Enter swatch width."), rows = p(v, "rows", 28), sh = need(p(v, "sh", 4), "Enter swatch height."), tw = p(v, "tw", 20), th = p(v, "th", 24);
  return { cast: `Cast on ${Math.round((sts / sw) * tw)} stitches for ${tw} in`, rows: `Knit ${Math.round((rows / sh) * th)} rows for ${th} in`, gauge: `${(sts / sw).toFixed(2)} sts and ${(rows / sh).toFixed(2)} rows per inch` };
};
export const AIDA = ["11 count", "14 count", "16 count", "18 count", "28 count over 2"];
const AC = [11, 14, 16, 18, 14];
export const crossStitch: Calc = (v) => {
  const sw = need(p(v, "sw", 140), "Enter pattern width in stitches."), sh = need(p(v, "sh", 100), "Enter pattern height."), c = AC[pick(v.count, AC.length)], margin = p(v, "m", 3);
  const dw = sw / c, dh = sh / c;
  return { fabric: `${(dw + 2 * margin).toFixed(1)} × ${(dh + 2 * margin).toFixed(1)} in fabric`, design: `${dw.toFixed(1)} × ${dh.toFixed(1)} in finished design`, cm: `${((dw + 2 * margin) * 2.54).toFixed(0)} × ${((dh + 2 * margin) * 2.54).toFixed(0)} cm` };
};
export const beadCount: Calc = (v) => {
  const len = need(p(v, "len", 18), "Enter strand length."), size = need(p(v, "mm", 6), "Enter bead size."), clasp = p(v, "clasp", 1), strands = p(v, "strands", 1);
  const each = Math.ceil(((len - clasp) * 25.4) / size);
  return { beads: `${nfmt(each * strands)} beads`, each: `${each} per strand`, note: `${size} mm beads on a ${len} in strand` };
};
export const woodProject: Calc = (v) => {
  const bf = p(v, "bf", 25), price = p(v, "price", 8), waste = p(v, "waste", 20) / 100, hw = p(v, "hw", 40), finish = p(v, "fin", 25), hrs = p(v, "hrs", 12), rate = p(v, "rate", 35);
  const lumber = bf * price * (1 + waste), mat = lumber + hw + finish;
  return { price: $(mat + hrs * rate, 0) + " suggested price", mat: $(mat, 0) + " materials", lumber: $(lumber, 0) + ` lumber (${(bf * (1 + waste)).toFixed(1)} bd ft with waste)`, labor: $(hrs * rate, 0) + " labour" };
};
export const riverTable: Calc = (v) => {
  const l = p(v, "l", 72), w = p(v, "w", 6), d = p(v, "d", 1.5), fill = p(v, "fill", 100) / 100, waste = p(v, "waste", 10) / 100, perGal = p(v, "pg", 120);
  const cuin = l * w * d * fill * (1 + waste), gal = cuin / 231;
  return { gal: `${gal.toFixed(2)} gallons of deep-pour epoxy`, liters: `${(gal * 3.785).toFixed(1)} L`, cost: $(gal * perGal, 0) + " resin cost", pours: `${Math.ceil(d / 2)} pour(s) at up to 2 in each` };
};
export const vinylPrice: Calc = (v) => {
  const sqin = p(v, "sqin", 36), cost = p(v, "cost", 0.03), weed = p(v, "weed", 10), rate = p(v, "rate", 25), qty = p(v, "qty", 10), blank = p(v, "blank", 0);
  const each = sqin * cost * 1.2 + (weed / 60) * rate + blank, price = each * 2;
  return { price: $(price) + " each (2× cost)", total: $(price * qty), cost: $(each) + " cost per piece" };
};
export const sublimation: Calc = (v) => {
  const blank = p(v, "blank", 4), ink = p(v, "ink", 0.6), paper = p(v, "paper", 0.25), price = p(v, "price", 18), qty = p(v, "qty", 50), fee = p(v, "fee", 6.5) / 100;
  const cost = blank + ink + paper, unit = price * (1 - fee) - cost;
  return { profit: $(unit * qty), unit: $(unit) + " per item", margin: `${((100 * unit) / price).toFixed(1)}%`, cost: $(cost) + " cost per item" };
};
export const tshirtPrice: Calc = (v) => {
  const qty = need(p(v, "qty", 50), "Enter quantity."), blank = p(v, "blank", 4.5), colors = p(v, "colors", 2), screen = p(v, "screen", 20), perColor = p(v, "pc", 0.6), markup = p(v, "mk", 50) / 100;
  const cost = blank + colors * perColor + (colors * screen) / qty, price = cost * (1 + markup);
  return { price: $(price) + " per shirt", total: $(price * qty), cost: $(cost) + " cost per shirt", setup: $(colors * screen, 0) + " screen setup" };
};
export const stickerPrice: Calc = (v) => {
  const qty = need(p(v, "qty", 100), "Enter quantity."), sq = p(v, "sq", 9), paper = p(v, "paper", 0.04), lam = pick(v.lam, 2), mk = p(v, "mk", 150) / 100;
  const cost = sq * paper * (lam ? 1.4 : 1) + 0.05, price = cost * (1 + mk);
  return { price: $(price) + " per sticker", total: $(price * qty), cost: $(cost, 3) + " cost each" };
};
export const calligraphy: Calc = (v) => {
  const items = p(v, "items", 100), perItem = p(v, "per", 3.5), lines = p(v, "lines", 2), extra = p(v, "extra", 0.75), rush = p(v, "rush", 0) / 100, min = p(v, "min", 75);
  const total = Math.max(min, items * (perItem + Math.max(0, lines - 1) * extra)) * (1 + rush);
  return { total: $(total), each: $(total / Math.max(items, 1)) + " per item", note: `${lines} lines each${rush ? `, ${(rush * 100).toFixed(0)}% rush` : ""}` };
};
export const musicVideo: Calc = (v) => {
  const days = p(v, "days", 2), crew = p(v, "crew", 6), cRate = p(v, "cr", 450), gear = p(v, "gear", 1500), loc = p(v, "loc", 800), talent = p(v, "talent", 1000), post = p(v, "post", 2500), cont = p(v, "cont", 10) / 100;
  const sub = days * (crew * cRate + gear + loc) + talent + post;
  return { total: $(sub * (1 + cont), 0), perDay: $(crew * cRate + gear + loc, 0) + " per shoot day", post: $(post, 0) + " post-production", cont: $(sub * cont, 0) + " contingency" };
};

// ---- registry (generated)
export const ideaArt2CustomCalculators: Record<string, Calc> = {
  "drone-video-battery-flight-plan-calculator": droneBattery,
  "theater-seat-revenue-calculator": theaterRevenue,
  "concert-ticket-break-even-calculator": concertBreakEven,
  "gallery-commission-split-calculator": galleryCommission,
  "art-auction-buyer-premium-calculator": auctionPremium,
  "youtube-channel-earnings-by-niche-calculator": ytNiche,
  "youtube-watch-time-hours-calculator": watchHours,
  "instagram-reels-bonus-earnings-calculator": reelsBonus,
  "facebook-creator-earnings-calculator": fbCreator,
  "snapchat-spotlight-earnings-calculator": snapSpotlight,
  "pinterest-creator-earnings-calculator": pinCreator,
  "linkedin-creator-rate-calculator": linkedinRate,
  "kick-streamer-earnings-calculator": kickStreamer,
  "ko-fi-earnings-calculator": kofi,
  "online-course-revenue-calculator": courseRevenue,
  "ugc-creator-rate-calculator": ugcRate,
  "social-media-posting-schedule-calculator": postSchedule,
  "film-runtime-pages-calculator": filmRuntime,
  "shot-list-shooting-days-calculator": shootDays,
  "lighting-ratio-photography-calculator": lightingRatio,
  "exposure-value-ev-calculator": exposureValue,
  "sunny-16-rule-calculator": sunny16,
  "film-developing-time-temperature-calculator": devTime,
  "paint-mixing-color-ratio-calculator": paintMix,
  "knitting-yarn-yardage-calculator": knitYardage,
  "crochet-blanket-size-calculator": crochetBlanket,
  "knitting-gauge-stitches-calculator": knitGauge,
  "cross-stitch-fabric-size-calculator": crossStitch,
  "beading-bead-count-calculator": beadCount,
  "woodworking-project-cost-calculator": woodProject,
  "epoxy-river-table-volume-calculator": riverTable,
  "vinyl-cutting-price-cricut-calculator": vinylPrice,
  "sublimation-printing-profit-calculator": sublimation,
  "t-shirt-printing-price-calculator": tshirtPrice,
  "sticker-printing-price-calculator": stickerPrice,
  "calligraphy-pricing-calculator": calligraphy,
  "music-video-budget-calculator": musicVideo,
};
