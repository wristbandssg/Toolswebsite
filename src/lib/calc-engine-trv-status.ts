/**
 * Batch: "Travel Calculators" → Airline Miles, Hotel Points & Rewards (status, upgrades, value and
 * hotel programmes — 29 tools).
 *
 * Status:
 *  - Band-based (Qantas status credits, Qatar Qpoints, Cathay status points, Virgin tier points,
 *    Flying Blue XP, Air NZ status points, Emirates tier miles): points per one-way flight from a
 *    distance-band × cabin table, then progress to each tier threshold. Flying Blue XP uses the
 *    published chart (domestic 2/–/5/–, medium 5/10/15/–, long 1 8/16/24/40, long 2 10/20/30/50,
 *    long 3 12/24/36/60; Silver 100, Gold 180, Platinum 300). Other tables are typical rounded
 *    equivalents.
 *  - Revenue-based: BA tier points (1 per £1 eligible spend since April 2025; Bronze 3,500, Silver
 *    7,500, Gold 20,000), United PQP (1 per $1; Silver 6,000 … 1K 28,000 without the segment
 *    path), Delta MQD (1 per $1 + Amex card MQDs; Silver 5,000 … Diamond 28,000), AA Loyalty
 *    Points (1 per base/bonus mile + 1 per card $1; Gold 40,000 … Executive Platinum 200,000).
 * Award charts / upgrades: one-way prices by distance band and cabin; an upgrade costs the
 * difference between the two cabins' prices where the programme prices it that way (BA, Qatar),
 * or a published-style upgrade chart. Values: cents-per-point = (cash price − cash paid on the
 * award) ÷ points × 100. Hotel earning: base points per $ (or € for Accor) × (1 + elite bonus).
 * All charts are approximate and dynamic pricing is common — the copy says so.
 * See prisma/create-trv-status-calculators.ts.
 */

import { type TrvCalculator, type Vals, txt, pos, pick, findPlace, gcKm, r0, r2, KM_PER_MI, money, nfmt } from "./trv-core";

const mi = (v: Vals, def: number) => {
  if (pick(v.how, 2) === 0) { const a = findPlace(txt(v, "from"), "airport"), b = findPlace(txt(v, "to"), "airport"); return { d: gcKm(a, b) / KM_PER_MI, label: `${a.code ?? a.name} → ${b.code ?? b.name}` }; }
  return { d: pos(v.dist, def), label: "entered distance" };
};
const bandOf = (d: number, edges: number[]) => { let i = 0; while (i < edges.length && d > edges[i]) i++; return i; };
function progress(have: number, tiers: [string, number][], unit: string) {
  const next = tiers.find((t) => have < t[1]);
  const reached = [...tiers].reverse().find((t) => have >= t[1]);
  return { tier: reached ? reached[0] : "Base member", next: next ? `${nfmt(r0(next[1] - have))} ${unit} more for ${next[0]} (${nfmt(next[1])})` : "Top tier reached" };
}

// ------------------------------------------------------------- band-based status
export interface BandPreset { unit: string; bands: string[]; edges: number[]; cabins: string[]; table: number[][]; tiers: [string, number][]; perFlight?: boolean }
export function bandStatus(p: BandPreset, v: Vals) {
  const { d, label } = mi(v, 3000), auto = pick(v.band, p.bands.length + 1), band = auto === 0 ? bandOf(d, p.edges) : auto - 1, cab = pick(v.cabin, p.cabins.length);
  const per = p.table[band][cab], flights = Math.max(1, Math.round(pos(v.flights, 2))), earned = per * flights, have = pos(v.have, 0) + earned, pr = progress(have, p.tiers, p.unit);
  return { earned: r0(earned), per: r0(per), total: r0(have), tier: pr.tier, next: pr.next, rule: `${p.bands[band]} · ${p.cabins[cab]}: ${per} per flight × ${flights} · ${nfmt(r0(d))} mi (${label})` };
}

const FB_BANDS = ["Domestic (within one country)", "Medium-haul (up to 2,000 mi)", "Long-haul 1 (up to 3,500 mi)", "Long-haul 2 (up to 5,000 mi)", "Long-haul 3 (over 5,000 mi)"];
export const FLYING_BLUE_XP: BandPreset = { unit: "XP", bands: FB_BANDS, edges: [300, 2000, 3500, 5000], cabins: ["Economy", "Premium Economy", "Business", "La Première"], table: [[2, 2, 5, 5], [5, 10, 15, 15], [8, 16, 24, 40], [10, 20, 30, 50], [12, 24, 36, 60]], tiers: [["Silver", 100], ["Gold", 180], ["Platinum", 300]] };
const QF_B = ["Up to 750 mi", "751–1,500 mi", "1,501–2,400 mi", "2,401–3,600 mi", "3,601–5,000 mi", "5,001–7,000 mi", "Over 7,000 mi"], QF_BASE = [10, 20, 30, 40, 50, 60, 70];
export const QANTAS_SC: BandPreset = { unit: "status credits", bands: QF_B, edges: [750, 1500, 2400, 3600, 5000, 7000], cabins: ["Discount Economy", "Flexible Economy", "Premium Economy", "Business", "First"], table: QF_BASE.map((b) => [b, b * 2, b * 3, b * 4, b * 6]), tiers: [["Silver", 300], ["Gold", 700], ["Platinum", 1400], ["Platinum One", 3600]] };
const QP_B = ["Up to 600 mi", "601–1,500 mi", "1,501–3,000 mi", "3,001–5,000 mi", "Over 5,000 mi"];
export const QPOINTS: BandPreset = { unit: "Qpoints", bands: QP_B, edges: [600, 1500, 3000, 5000], cabins: ["Economy Lite", "Economy Classic", "Economy Convenience / Comfort", "Business", "First"], table: [5, 10, 15, 20, 25].map((b) => [b / 2, b, b * 1.5, b * 3, b * 4.5]), tiers: [["Silver", 150], ["Gold", 300], ["Platinum", 600]] };
const CX_B = ["Up to 750 mi", "751–2,100 mi", "2,101–3,500 mi", "3,501–5,000 mi", "Over 5,000 mi"];
export const CATHAY_SP: BandPreset = { unit: "status points", bands: CX_B, edges: [750, 2100, 3500, 5000], cabins: ["Economy Light", "Economy Essential", "Economy Flex", "Premium Economy", "Business", "First"], table: [10, 20, 30, 40, 50].map((b) => [b / 2, b, b * 1.5, b * 2, b * 3, b * 4]), tiers: [["Silver", 300], ["Gold", 600], ["Diamond", 1200]] };
export const VIRGIN_TP: BandPreset = { unit: "tier points", bands: ["Short-haul (up to 2,000 mi)", "Long-haul (over 2,000 mi)"], edges: [2000], cabins: ["Economy Light", "Economy Classic", "Economy Delight", "Premium", "Upper Class"], table: [[5, 10, 15, 25, 50], [15, 25, 40, 50, 100]], tiers: [["Silver", 400], ["Gold", 1000]] };
export const AIRNZ_SP: BandPreset = { unit: "status points", bands: ["New Zealand domestic", "Tasman & Pacific Islands", "Long-haul (Asia, Americas)"], edges: [700, 3000], cabins: ["Seat / Seat+Bag", "Flexi", "Premium Economy / Works Deluxe", "Business Premier"], table: [[5, 10, 15, 20], [15, 30, 45, 60], [40, 60, 120, 160]], tiers: [["Silver", 450], ["Gold", 900], ["Elite", 1500]] };
const EK_B = ["Up to 1,500 mi", "1,501–3,000 mi", "3,001–5,000 mi", "Over 5,000 mi"];
export const EK_TIER: BandPreset = { unit: "tier miles", bands: EK_B, edges: [1500, 3000, 5000], cabins: ["Economy Special", "Economy Saver", "Economy Flex", "Economy Flex Plus", "Business Saver", "Business Flex", "First"], table: [[250, 375, 500, 750, 1000, 1500, 2000], [500, 750, 1000, 1500, 2000, 3000, 4000], [750, 1250, 1750, 2500, 3500, 5000, 6500], [1000, 1750, 2500, 3500, 5000, 7000, 9000]], tiers: [["Silver", 25000], ["Gold", 50000], ["Platinum", 150000]] };

// ------------------------------------------------------------- revenue-based status
export interface RevStatus { unit: string; sym: string; tiers: [string, number][]; rate?: [string, number][]; cards?: [string, number, number][] }
export function revStatus(p: RevStatus, v: Vals) {
  const spend = pos(v.spend, 1500), r = p.rate ? p.rate[pick(v.rate, p.rate.length)] : ["", 1] as [string, number];
  const fly = spend * r[1], card = p.cards ? p.cards[pick(v.cardt, p.cards.length)] : (["", 0, 0] as [string, number, number]);
  const cardPts = pos(v.cardspend, 0) * card[1] + card[2], partner = pos(v.partner, 0), earned = fly + cardPts + partner, have = pos(v.have, 0) + earned, pr = progress(have, p.tiers, p.unit);
  return { earned: r0(earned), per: r0(fly), total: r0(have), tier: pr.tier, next: pr.next, rule: `${p.sym}${nfmt(spend)} flights${r[0] ? ` at ${r[1]}/${p.sym}` : ""}${card[0] ? ` + ${card[0]}: ${nfmt(r0(cardPts))}` : ""}${partner ? ` + ${nfmt(partner)} other` : ""}` };
}
export const BA_TP: RevStatus = { unit: "tier points", sym: "£", tiers: [["Bronze", 3500], ["Silver", 7500], ["Gold", 20000]], cards: [["No card bonus", 0, 0]] };
export const UNITED_PQP: RevStatus = { unit: "PQP", sym: "$", tiers: [["Premier Silver", 6000], ["Premier Gold", 12000], ["Premier Platinum", 18000], ["Premier 1K", 28000]], cards: [["No United card", 0, 0], ["United Quest / Club (1 PQP per $20, max 18,000)", 0.05, 0], ["United Explorer (1 PQP per $20, max 1,000)", 0.05, 0]] };
export const DELTA_MQD: RevStatus = { unit: "MQDs", sym: "$", tiers: [["Silver Medallion", 5000], ["Gold Medallion", 10000], ["Platinum Medallion", 15000], ["Diamond Medallion", 28000]], cards: [["No Delta card", 0, 0], ["Delta Gold Amex", 0, 0], ["Delta Platinum Amex ($1 MQD per $20)", 0.05, 0], ["Delta Reserve Amex ($1 per $10 + $2,500 Headstart)", 0.1, 2500]] };
export const AA_LP: RevStatus = { unit: "Loyalty Points", sym: "$", tiers: [["Gold", 40000], ["Platinum", 75000], ["Platinum Pro", 125000], ["Executive Platinum", 200000]], rate: [["Member (5/$)", 5], ["Gold (7/$)", 7], ["Platinum (8/$)", 8], ["Platinum Pro (9/$)", 9], ["Executive Platinum (11/$)", 11]], cards: [["No AAdvantage card", 0, 0], ["AAdvantage card (1 LP per $1)", 1, 0]] };

// ------------------------------------------------------------- award charts & upgrades
export const CABINS = ["Economy", "Premium Economy", "Business", "First"];
export interface AwardPreset { unit: string; bands: string[]; edges: number[]; chart: number[][]; peak?: number; taxes: number[]; cpp: number; mode: "difference" | "chart"; upg?: number[][] }
export function award(p: AwardPreset, v: Vals) {
  const { d, label } = mi(v, 3451), b = bandOf(d, p.edges), cab = pick(v.cabin, 4), peak = pick(v.peak, 2) === 1 ? p.peak ?? 1.25 : 1, pax = Math.max(1, Math.round(pos(v.pax, 1))), legs = pick(v.rt, 2) === 1 ? 2 : 1;
  const pts = Math.round((p.chart[b][cab] * peak) / 250) * 250 * legs * pax, tax = p.taxes[cab] * legs * pax, cash = pos(v.cash, 0) * pax, cpp = cash > 0 ? ((cash - tax) / pts) * 100 : 0;
  return { pts: r0(pts), tax: r2(tax), cpp: r2(cpp), worth: cash > 0 ? (cpp >= p.cpp ? `Good redemption (${r2(cpp)}¢ vs ~${p.cpp}¢ typical)` : `Below typical value (${r2(cpp)}¢ vs ~${p.cpp}¢) — consider paying cash`) : `Enter the cash price to see the value (typical ~${p.cpp}¢ per point)`, band: `${p.bands[b]} · ${nfmt(r0(d))} mi (${label})${peak > 1 ? " · peak dates" : ""}` };
}
export function upgrade(p: AwardPreset, v: Vals) {
  const { d, label } = mi(v, 3451), b = bandOf(d, p.edges), from = pick(v.cfrom, 3), to = Math.max(from + 1, pick(v.cto, 4)), peak = pick(v.peak, 2) === 1 ? p.peak ?? 1.25 : 1, legs = pick(v.rt, 2) === 1 ? 2 : 1, pax = Math.max(1, Math.round(pos(v.pax, 1)));
  const one = p.mode === "difference" || !p.upg ? (p.chart[b][to] - p.chart[b][from]) * peak : p.upg[b][from === 0 ? to - 1 : from === 1 ? 1 + to : 5] * peak;
  const pts = Math.round(Math.max(0, one) / 250) * 250 * legs * pax, cpp = pos(v.cash, 0) > 0 ? ((pos(v.cash, 0) * pax) / pts) * 100 : 0;
  return { pts: r0(pts), one: r0(pts / legs / pax), cpp: r2(cpp), fare: `${CABINS[from]} → ${CABINS[to]}`, band: `${p.bands[b]} · ${nfmt(r0(d))} mi (${label})`, rule: p.mode === "difference" ? "Upgrade costs the difference between the two cabins' reward prices" : "From the programme's upgrade chart (eligible paid fares only)" };
}
const BA_B = ["Zone 1 (up to 650 mi)", "Zone 2 (651–1,150 mi)", "Zone 3 (1,151–2,000 mi)", "Zone 4 (2,001–3,000 mi)", "Zone 5 (3,001–4,000 mi)", "Zone 6 (4,001–5,500 mi)", "Zone 7 (5,501–6,500 mi)", "Zone 8 (6,501–7,000 mi)", "Zone 9 (over 7,000 mi)"];
const BA_E = [650, 1150, 2000, 3000, 4000, 5500, 6500, 7000];
const BA_ECO = [6000, 9000, 10000, 11250, 13000, 16250, 19500, 24250, 29000];
export const AVIOS: AwardPreset = { unit: "Avios", bands: BA_B, edges: BA_E, chart: BA_ECO.map((e, i) => [e, e * 2, i < 3 ? e * 2.5 : e * 3.85, i < 3 ? e * 3.2 : e * 5.2]), peak: 1.3, taxes: [100, 230, 350, 420], cpp: 1.4, mode: "difference" };
const QR_B = ["Up to 600 mi", "601–1,200 mi", "1,201–2,000 mi", "2,001–3,000 mi", "3,001–4,000 mi", "4,001–5,500 mi", "5,501–7,000 mi", "Over 7,000 mi"];
export const QATAR_AW: AwardPreset = { unit: "Avios", bands: QR_B, edges: [600, 1200, 2000, 3000, 4000, 5500, 7000], chart: [6000, 9000, 13000, 16000, 20000, 27000, 35000, 42000].map((e) => [e, e * 1.5, e * 2.6, e * 4]), peak: 1, taxes: [80, 120, 180, 250], cpp: 1.3, mode: "difference" };
const QF_UB = ["Zone 1 (up to 600 mi)", "Zone 2 (601–1,200 mi)", "Zone 3 (1,201–2,400 mi)", "Zone 4 (2,401–3,600 mi)", "Zone 5 (3,601–4,800 mi)", "Zone 6 (4,801–5,800 mi)", "Zone 7 (5,801–7,000 mi)", "Zone 8 (7,001–9,600 mi)"];
export const QANTAS_UP: AwardPreset = { unit: "Qantas Points", bands: QF_UB, edges: [600, 1200, 2400, 3600, 4800, 5800, 7000], chart: [8000, 10400, 14600, 20800, 29000, 38000, 45000, 55000].map((e) => [e, e * 1.6, e * 2.4, e * 3.6]), taxes: [0, 0, 0, 0], cpp: 1.0, mode: "chart", upg: [8000, 10400, 14600, 20800, 29000, 38000, 45000, 55000].map((e) => [e * 0.75, e * 1.4, e * 2, e * 1, e * 1.6, e * 0.9]) };
const LONG_B = ["Up to 1,500 mi", "1,501–3,000 mi", "3,001–5,000 mi", "5,001–7,000 mi", "Over 7,000 mi"];
const LE = [1500, 3000, 5000, 7000];
const mkUp = (base: number[], unit: string, cpp: number): AwardPreset => ({ unit, bands: LONG_B, edges: LE, chart: base.map((e) => [e, e * 1.6, e * 2.6, e * 4]), taxes: [0, 0, 0, 0], cpp, mode: "chart", upg: base.map((e) => [e * 0.8, e * 1.6, e * 2.2, e * 1, e * 1.5, e * 1]) });
export const EMIRATES_UP = mkUp([10000, 17500, 27500, 37500, 47500], "Skywards Miles", 1.2);
export const SIA_UP = mkUp([10000, 17500, 25000, 37500, 45000], "KrisFlyer miles", 1.4);
export const CATHAY_UP = mkUp([10000, 17500, 25000, 35000, 45000], "Asia Miles", 1.2);
export const ETIHAD_UP = mkUp([12000, 20000, 30000, 40000, 50000], "Etihad Guest Miles", 1.3);

// ------------------------------------------------------------- value & transfers
export const PROGRAMS: [string, number][] = [["American AAdvantage", 1.6], ["Delta SkyMiles", 1.2], ["United MileagePlus", 1.3], ["Southwest Rapid Rewards", 1.35], ["JetBlue TrueBlue", 1.3], ["Alaska Atmos Rewards", 1.4], ["Air Canada Aeroplan", 1.5], ["British Airways / Iberia / Qatar Avios", 1.4], ["Air France-KLM Flying Blue", 1.3], ["Emirates Skywards", 1.2], ["Singapore KrisFlyer", 1.4], ["Cathay Asia Miles", 1.2], ["Qantas Points (AU¢)", 1.0], ["Virgin Points", 1.3], ["Turkish Miles&Smiles", 1.2], ["Etihad Guest", 1.3], ["Amex Membership Rewards", 2.0], ["Chase Ultimate Rewards", 2.0], ["Citi ThankYou", 1.8], ["Capital One Miles", 1.8], ["Bilt Rewards", 2.1], ["Hilton Honors", 0.5], ["Marriott Bonvoy", 0.8], ["World of Hyatt", 1.7], ["IHG One Rewards", 0.5], ["Wyndham Rewards", 1.0]];
export const milesToDollars: TrvCalculator = (v) => {
  const pr = PROGRAMS[pick(v.prog, PROGRAMS.length)], pts = pos(v.pts, 50000), cpp = pos(v.cpp, 0) || pr[1], b = PROGRAMS[pick(v.vs, PROGRAMS.length)];
  return { value: r2((pts * cpp) / 100), cpp: r2(cpp), cash: r2(pts * 0.01), vs: `${nfmt(pts)} ${b[0]} would be worth about ${money((pts * b[1]) / 100)} (${b[1]}¢)`, rule: `${nfmt(pts)} × ${cpp}¢ — typical 2026 valuation for ${pr[0]}` };
};
export const cashVsMiles: TrvCalculator = (v) => {
  const cash = pos(v.cash, 450), pts = pos(v.pts, 25000), fees = pos(v.fees, 5.6), forgone = (cash * pos(v.earn, 5) * pos(v.ecpp, 1.3)) / 100, bench = pos(v.bench, 1.3);
  const cpp = pts > 0 ? ((cash - fees - forgone) / pts) * 100 : 0;
  return { cpp: r2(cpp), verdict: cpp >= bench ? `✅ Use points — ${r2(cpp)}¢ beats your ${bench}¢ benchmark` : `💵 Pay cash — ${r2(cpp)}¢ is below your ${bench}¢ benchmark`, saved: r2(cash - fees), forgone: r2(forgone), breakeven: r0(((cash - fees - forgone) / bench) * 100) };
};
export const AMEX_PARTNERS: [string, number, boolean][] = [["Delta SkyMiles (1:1)", 1, true], ["British Airways Avios (1:1)", 1, false], ["Air Canada Aeroplan (1:1)", 1, false], ["Air France-KLM Flying Blue (1:1)", 1, false], ["Emirates Skywards (5:4)", 0.8, false], ["Singapore KrisFlyer (1:1)", 1, false], ["Cathay Asia Miles (5:4)", 0.8, false], ["Etihad Guest (1:1)", 1, false], ["Qantas Frequent Flyer (1:1)", 1, false], ["Virgin Atlantic (1:1)", 1, false], ["ANA Mileage Club (1:1)", 1, false], ["JetBlue TrueBlue (5:4)", 0.8, true], ["Hawaiian / Atmos (1:1)", 1, true], ["Hilton Honors (1:2)", 2, false], ["Marriott Bonvoy (1:1)", 1, false], ["Choice Privileges (1:1)", 1, false]];
export const amexTransfer: TrvCalculator = (v) => {
  const pa = AMEX_PARTNERS[pick(v.partner, AMEX_PARTNERS.length)], mr = pos(v.mr, 50000), bonus = pos(v.bonus, 0), got = mr * pa[1] * (1 + bonus / 100);
  const fee = pa[2] ? Math.min(99, mr * 0.0006) : 0, need = pos(v.need, 0), short = need > 0 ? Math.max(0, Math.ceil((need / (pa[1] * (1 + bonus / 100))) / 1000) * 1000) : 0;
  return { got: r0(got), fee: r2(fee), ratio: pa[0], need: short ? `Transfer ${nfmt(short)} MR to get ${nfmt(need)}` : "—", note: "Transfers are instant for most partners but can't be reversed — have the award seat on hold first." };
};

// ------------------------------------------------------------- hotels
export interface HotelPreset { unit: string; sym: string; cur: string; base: [string, number][]; tiers: [string, number][]; cpp: number; night: [string, number][] }
export function hotelEarn(p: HotelPreset, v: Vals) {
  const spend = pos(v.spend, 400), b = p.base[pick(v.brand, p.base.length)], t = p.tiers[pick(v.tier, p.tiers.length)], base = spend * b[1], bonus = (base * t[1]) / 100;
  const card = spend * pos(v.card, 0), promo = pos(v.promo, 0), total = base + bonus + card + promo, n = p.night[pick(v.cat, p.night.length)], nights = n[1] > 0 ? total / n[1] : 0;
  return { total: r0(total), base: r0(base), bonus: r0(bonus), card: r0(card + promo), value: r2((total * (pos(v.cpp, 0) || p.cpp)) / 100), night: `${n[0]}: about ${nfmt(n[1])} ${p.unit} per night → ${nights.toFixed(2)} free night(s) from this stay` };
}
export const HILTON: HotelPreset = { unit: "points", sym: "$", cur: "USD", base: [["Most Hilton brands (10/$)", 10], ["Home2 / Tru / Spark (5/$)", 5]], tiers: [["Member", 0], ["Silver (+20%)", 20], ["Gold (+80%)", 80], ["Diamond (+100%)", 100]], cpp: 0.5, night: [["Budget (Hampton, Tru)", 20000], ["Mid-range (Hilton Garden Inn, DoubleTree)", 40000], ["Full-service (Hilton, Embassy Suites)", 60000], ["Luxury (Conrad, Waldorf Astoria)", 110000]] };
export const MARRIOTT: HotelPreset = { unit: "points", sym: "$", cur: "USD", base: [["Most Marriott brands (10/$)", 10], ["Residence Inn / TownePlace / Element (5/$)", 5]], tiers: [["Member", 0], ["Silver Elite (+10%)", 10], ["Gold Elite (+25%)", 25], ["Platinum Elite (+50%)", 50], ["Titanium / Ambassador (+75%)", 75]], cpp: 0.8, night: [["Budget (Fairfield, Courtyard off-peak)", 20000], ["Mid-range (Courtyard, Sheraton)", 35000], ["Upscale (Marriott, Westin)", 55000], ["Luxury (Ritz-Carlton, St. Regis)", 90000]] };
export const HYATT: HotelPreset = { unit: "points", sym: "$", cur: "USD", base: [["Hyatt hotels (5/$)", 5]], tiers: [["Member", 0], ["Discoverist (+10%)", 10], ["Explorist (+20%)", 20], ["Globalist (+30%)", 30]], cpp: 1.7, night: [["Category 1 (standard)", 5000], ["Category 2", 8000], ["Category 3", 12000], ["Category 4", 15000], ["Category 5", 20000], ["Category 6", 25000], ["Category 7", 30000], ["Category 8", 40000]] };
export const IHG: HotelPreset = { unit: "points", sym: "$", cur: "USD", base: [["Most IHG brands (10/$)", 10], ["Staybridge / Candlewood (5/$)", 5]], tiers: [["Club", 0], ["Silver Elite (+20%)", 20], ["Gold Elite (+40%)", 40], ["Platinum Elite (+60%)", 60], ["Diamond Elite (+100%)", 100]], cpp: 0.5, night: [["Holiday Inn Express", 20000], ["Holiday Inn / Crowne Plaza", 35000], ["Kimpton / Hotel Indigo", 50000], ["InterContinental", 80000]] };
export const ACCOR: HotelPreset = { unit: "points", sym: "€", cur: "EUR", base: [["Most Accor brands (25 per €10)", 2.5], ["ibis / ibis budget (12.5 per €10)", 1.25], ["Adagio (10 per €10)", 1]], tiers: [["Classic", 0], ["Silver (+24%)", 24], ["Gold (+48%)", 48], ["Platinum (+76%)", 76], ["Diamond (+76%)", 76]], cpp: 2, night: [["Night worth €100 (5,000 pts)", 5000], ["Night worth €200 (10,000 pts)", 10000], ["Night worth €400 (20,000 pts)", 20000]] };
export const BEST_WESTERN: HotelPreset = { unit: "points", sym: "$", cur: "USD", base: [["Best Western hotels (10/$)", 10]], tiers: [["Blue", 0], ["Gold (+10%)", 10], ["Platinum (+15%)", 15], ["Diamond (+30%)", 30], ["Diamond Select (+50%)", 50]], cpp: 0.6, night: [["Lower-priced hotel", 12000], ["Mid-priced hotel", 24000], ["Upscale hotel", 36000]] };
export const HOTEL_PROGS: [string, number][] = [["Hilton Honors", 0.5], ["Marriott Bonvoy", 0.8], ["World of Hyatt", 1.7], ["IHG One Rewards", 0.5], ["Wyndham Rewards", 1.0], ["Choice Privileges", 0.6], ["ALL Accor (€0.02)", 2.0], ["Best Western Rewards", 0.6], ["Radisson Rewards", 0.35]];
export const hotelValue: TrvCalculator = (v) => {
  const pr = HOTEL_PROGS[pick(v.prog, HOTEL_PROGS.length)], cash = pos(v.cash, 250), tax = pos(v.taxes, 30), pts = pos(v.pts, 50000), nights = Math.max(1, Math.round(pos(v.nights, 1)));
  const fifth = pick(v.fifth, 2) === 1 && nights >= 5 ? Math.floor(nights / 5) : 0, used = pts * (nights - fifth), cashTotal = (cash + tax) * nights, cpp = used > 0 ? ((cashTotal - pos(v.resfee, 0) * nights) / used) * 100 : 0;
  return { cpp: r2(cpp), verdict: cpp >= pr[1] ? `✅ Good use of points (${r2(cpp)}¢ vs ~${pr[1]}¢ typical)` : `💵 Pay cash — ${r2(cpp)}¢ is below the ~${pr[1]}¢ typical value`, used: r0(used), saved: r2(cashTotal), typical: r2((used * pr[1]) / 100), free: fifth ? `${fifth} free night(s) from the 5th-night-free benefit` : "No 5th-night benefit applied" };
};

const B = (p: BandPreset): TrvCalculator => (v) => bandStatus(p, v);
const RS = (p: RevStatus): TrvCalculator => (v) => revStatus(p, v);
const AW = (p: AwardPreset): TrvCalculator => (v) => award(p, v);
const UP = (p: AwardPreset): TrvCalculator => (v) => upgrade(p, v);
const H = (p: HotelPreset): TrvCalculator => (v) => hotelEarn(p, v);

export const trvStatusCustomCalculators: Record<string, TrvCalculator> = {
  "flying-blue-xp-calculator": B(FLYING_BLUE_XP),
  "qantas-status-credits-calculator": B(QANTAS_SC),
  "qatar-qpoints-calculator": B(QPOINTS),
  "cathay-status-points-calculator": B(CATHAY_SP),
  "virgin-atlantic-tier-points-calculator": B(VIRGIN_TP),
  "air-new-zealand-status-points-calculator": B(AIRNZ_SP),
  "emirates-skywards-tier-miles-calculator": B(EK_TIER),
  "ba-tier-points-calculator": RS(BA_TP),
  "united-pqp-calculator": RS(UNITED_PQP),
  "delta-mqd-calculator": RS(DELTA_MQD),
  "aa-loyalty-points-calculator": RS(AA_LP),
  "avios-calculator": AW(AVIOS),
  "avios-upgrade-calculator": UP(AVIOS),
  "qatar-airways-upgrade-calculator": UP(QATAR_AW),
  "qantas-upgrade-calculator": UP(QANTAS_UP),
  "emirates-upgrade-calculator": UP(EMIRATES_UP),
  "singapore-airlines-upgrade-calculator": UP(SIA_UP),
  "cathay-pacific-upgrade-calculator": UP(CATHAY_UP),
  "etihad-upgrade-calculator": UP(ETIHAD_UP),
  "miles-to-dollars-calculator": milesToDollars,
  "cash-vs-miles-calculator": cashVsMiles,
  "amex-points-transfer-calculator": amexTransfer,
  "hotel-points-value-calculator": hotelValue,
  "hilton-honors-points-calculator": H(HILTON),
  "marriott-bonvoy-points-calculator": H(MARRIOTT),
  "world-of-hyatt-points-calculator": H(HYATT),
  "ihg-one-rewards-points-calculator": H(IHG),
  "accor-live-limitless-points-calculator": H(ACCOR),
  "best-western-rewards-calculator": H(BEST_WESTERN),
};
