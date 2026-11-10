/**
 * Batch: "Travel Calculators" → Trip Cost, Theme Park & Cruise Calculators (22 tools).
 *
 * Cost tools add up the obvious lines (lodging, food, transport, activities, fees) with typical
 * 2026 defaults that the user can change. Rules used:
 *  - Airbnb: split-fee model (guest ~14.2%, host 3%) or host-only fee (15.5%), on nightly total +
 *    cleaning fee, after length-of-stay / special-offer discounts.
 *  - Disney dining (ADR): opens 60 days before; Disney-resort guests can book the whole stay (up to
 *    10 days) at 60 days before check-in. DVC booking: 11 months (home resort) / 7 months (other).
 *  - Crowd levels: heuristic 1–10 from month, weekday, US school breaks and holidays (Easter by the
 *    Gregorian computus, Thanksgiving = 4th Thursday of November) — not live data.
 *  - Cruise gratuities: Royal Caribbean $18.50/person/day ($21 suites); Disney Cruise Line $14.50
 *    per person per night; drink packages add an 18% service charge.
 *  - DVC points: approximate points per night by resort tier × season × room size, ×1.25 Fri–Sat.
 * Near-namesakes: cruise-drink-package (any line, generic) vs royal-caribbean-drink-package (RC
 * deluxe package rules) vs virgin-voyages-bar-tab (prepaid bar-tab bonus); dvc-rental (renting
 * points) vs dvc-cost (buying a contract) vs dvc-points (points a stay needs).
 * See prisma/create-trv-trip-calculators.ts.
 */

import { type TrvCalculator, InputError, pos, pick, dateIn, dayParts, dayNum, dayOfWeek, dayText, r0, r1, r2, money, nfmt, clamp } from "./trv-core";

// ---------- Airbnb
export const airbnbFee: TrvCalculator = (v) => {
  const nightly = pos(v.nightly, 150), nights = Math.max(1, Math.round(pos(v.nights, 5))), clean = pos(v.clean, 80), disc = pos(v.disc, 0) / 100, model = pick(v.model, 2), tax = pos(v.tax, 10) / 100;
  const sub = nightly * nights * (1 - disc) + clean, gFee = model === 0 ? sub * pos(v.gpct, 14.2) / 100 : 0, hFee = model === 0 ? sub * 0.03 : sub * pos(v.hpct, 15.5) / 100;
  const guest = sub + gFee + sub * tax, payout = sub - hFee;
  return { guest: r2(guest), payout: r2(payout), fees: r2(gFee + hFee), gfee: r2(gFee), hfee: r2(hFee), night: r2(guest / nights), note: model === 0 ? "Split fee: guest pays a service fee, host pays 3%" : "Host-only fee: guest sees one all-in price; host pays the whole fee" };
};

// ---------- DVC
export const DVC_TIER = ["Value (e.g. Disney's Riviera off-property style / Vero Beach)", "Standard (Saratoga Springs, Old Key West, Animal Kingdom value)", "Deluxe (Beach Club, Boardwalk, Riviera, Polynesian villas)", "Premium (Bay Lake Tower lake view, Grand Floridian, Aulani ocean view)"];
export const DVC_SEASON = ["Adventure (lowest)", "Choice", "Dream", "Magic", "Premier (highest)"];
export const DVC_ROOM = ["Deluxe Studio", "One-Bedroom Villa", "Two-Bedroom Villa", "Grand Villa"];
export const dvcPoints: TrvCalculator = (v) => {
  const base = [10, 12, 15, 19][pick(v.tier, 4)] * [0.7, 0.85, 1, 1.2, 1.4][pick(v.season, 5)] * [1, 2, 2.9, 6][pick(v.room, 4)];
  const wk = Math.round(pos(v.wk, 4)), we = Math.round(pos(v.we, 2)), pts = Math.round(base * wk + base * 1.25 * we), ppp = pos(v.ppp, 21);
  return { pts, wk: r0(base), we: r0(base * 1.25), rent: r2(pts * ppp), note: `About ${r0(base)} points Sun–Thu and ${r0(base * 1.25)} Fri–Sat per night — check the resort's official point chart` };
};
export const dvcRental: TrvCalculator = (v) => {
  const pts = pos(v.pts, 120), ppp = pos(v.ppp, 21), cash = pos(v.cash, 0), fee = pos(v.fee, 0), cost = pts * ppp + fee;
  return { cost: r2(cost), ppp: r2(ppp), save: cash > 0 ? r2(cash - cost) : 0, pct: cash > 0 ? r1((1 - cost / cash) * 100) : 0, note: cash > 0 ? (cost < cash ? `Renting DVC points saves ${money(cash - cost)} vs booking through Disney` : "Disney's cash rate is cheaper for these dates") : "Enter Disney's cash price for the same room to see the saving" };
};
export const dvcCost: TrvCalculator = (v) => {
  const pts = pos(v.pts, 150), price = pos(v.price, pick(v.how, 2) === 0 ? 260 : 150), close = pos(v.close, pick(v.how, 2) === 0 ? 0 : 700), dues = pos(v.dues, 9.5), end = Math.round(pos(v.end, 2072)), now = Math.round(pos(v.year, 2026));
  if (pts <= 0) throw new InputError("Enter the number of points.");
  const years = Math.max(1, end - now), upfront = pts * price + close, duesYr = pts * dues, total = upfront + duesYr * years, perPt = total / (pts * years), rentAlt = pos(v.rent, 21);
  return { upfront: r2(upfront), dues: r2(duesYr), total: r2(total), perPt: r2(perPt), years, verdict: perPt < rentAlt ? `Owning costs ${money(perPt)} per point-year vs ${money(rentAlt)} to rent — buying wins over ${years} years (ignoring interest)` : `Renting points at ${money(rentAlt)} is cheaper than owning (${money(perPt)})` };
};
export const DVC_WIN = ["Book at your home resort (11 months)", "Book at another DVC resort (7 months)", "Disney Cruise activities — first-time cruiser (75 days)", "Disney Cruise activities — Silver (90 days)", "Disney Cruise activities — Gold (105 days)", "Disney Cruise activities — Platinum (120 days)", "Disney Cruise activities — Pearl (123 days)"];
export const dvcWindow: TrvCalculator = (v) => {
  const ci = dateIn(v, "ci", 20800), w = pick(v.win, DVC_WIN.length);
  let open: number;
  if (w <= 1) { const p = dayParts(ci), m = w === 0 ? 11 : 7, last = dayParts(dayNum(p.y, p.m - m + 1, 0)).d; open = dayNum(p.y, p.m - m, Math.min(p.d, last)); }
  else open = ci - [75, 90, 105, 120, 123][w - 2];
  return { open: dayText(open), days: ci - open, ci: dayText(ci), note: w <= 1 ? "DVC booking opens at 8 am Eastern on the window date; home-resort owners can book 'walking' reservations up to 7 nights from day one." : "Cruise activity booking opens at midnight Eastern on that date." };
};

// ---------- Disney ADR
export const disneyAdr: TrvCalculator = (v) => {
  const ci = dateIn(v, "ci", 20800), nights = clamp(Math.round(pos(v.nights, 5)), 1, 30), onsite = pick(v.onsite, 2) === 1, open = ci - 60;
  const covered = onsite ? Math.min(nights, 10) : 0;
  return { open: dayText(open), last: onsite ? dayText(ci + covered - 1) : dayText(open + 60), at: "6:00 am Eastern (Walt Disney World) / 8:00 am Pacific (Disneyland: 60 days too)", note: onsite ? `As a Disney Resort guest you can book dining for your first ${covered} day(s) all on ${dayText(open)}` : "Off-site guests book each day 60 days ahead — come back each morning for later days" };
};

// ---------- crowd heuristic
const easter = (y: number) => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return dayNum(y, mo, da); };
const thanksgiving = (y: number) => { const first = dayNum(y, 11, 1), dow = dayOfWeek(first); return first + ((4 - dow + 7) % 7) + 21; };
export const PARKS = ["Walt Disney World (Magic Kingdom etc.)", "Disneyland Resort (California)", "Universal Orlando", "Universal Studios Hollywood"];
export function crowdLevel(day: number, park: number) {
  const { y, m, d } = dayParts(day), dow = dayOfWeek(day);
  let lvl = [5, 5, 7, 7, 5, 6, 7, 5, 3, 4, 5, 7][m - 1];
  const why: string[] = [];
  if (park === 1 || park === 3) lvl += dow === 0 || dow === 6 ? 2 : -1; else lvl += dow === 6 ? 1 : dow === 2 || dow === 3 ? -1 : 0;
  const e = easter(y), tg = thanksgiving(y);
  if (Math.abs(day - e) <= 7) { lvl += 2; why.push("Easter / spring break"); }
  if (day >= tg - 3 && day <= tg + 3) { lvl += 2; why.push("Thanksgiving week"); }
  if ((m === 12 && d >= 20) || (m === 1 && d <= 2)) { lvl += 3; why.push("Christmas–New Year"); }
  if (m === 7 && d >= 1 && d <= 5) { lvl += 2; why.push("Fourth of July"); }
  if (m === 2 && d >= 14 && d <= 22) { lvl += 1; why.push("Presidents' Day week"); }
  if ((m === 3 && d >= 8) || (m === 4 && d <= 20)) { if (!why.length) why.push("spring break season"); lvl += 1; }
  if (m === 1 && d >= 6 && d <= 31 && dow >= 1 && dow <= 4) { lvl -= 1; why.push("quiet January weekday"); }
  if (m === 9 && d >= 3) why.push("back-to-school lull");
  return { lvl: clamp(Math.round(lvl), 1, 10), why };
}
export const crowd: TrvCalculator = (v) => {
  const day = dateIn(v, "date", 20800), park = pick(v.park, PARKS.length), c = crowdLevel(day, park), around: string[] = [];
  let best = day, bl = 11;
  for (let i = -3; i <= 3; i++) { const l = crowdLevel(day + i, park).lvl; around.push(`${dayText(day + i).replace(/, \d{4}$/, "")}: ${l}`); if (l < bl) { bl = l; best = day + i; } }
  const word = c.lvl <= 3 ? "Low" : c.lvl <= 6 ? "Moderate" : c.lvl <= 8 ? "Busy" : "Very busy";
  return { lvl: c.lvl, word: `${word} (${c.lvl}/10)`, why: c.why.length ? c.why.join(", ") : "typical day for the season", best: `${dayText(best)} (level ${bl})`, week: around.join(" · ") };
};

// ---------- Disney trip cost
const WDW_TIX = [0, 159, 304, 434, 539, 589, 619, 639, 659, 679, 699];
export const disneyTrip: TrvCalculator = (v) => {
  const park = pick(v.park, 2), adults = Math.round(pos(v.adults, 2)), kids = Math.round(pos(v.kids, 2)), days = clamp(Math.round(pos(v.days, 4)), 0, 10), nights = Math.round(pos(v.nights, 5));
  const tixAdult = (park === 0 ? WDW_TIX[days] : [0, 164, 310, 410, 470, 510, 560, 600, 620, 640, 660][days]) + (pick(v.hop, 2) === 1 && days ? (park === 0 ? 85 : 70) : 0);
  const tickets = tixAdult * adults + tixAdult * 0.95 * kids, hotel = nights * pos(v.hotel, 330) * (1 + pos(v.htax, 12.5) / 100), food = (adults * pos(v.fa, 95) + kids * pos(v.fk, 55)) * (nights + 1);
  const ll = pos(v.ll, 25) * (adults + kids) * days, travel = pos(v.travel, 1200), extra = pos(v.extra, 300), total = tickets + hotel + food + ll + travel + extra;
  return { total: r2(total), tickets: r2(tickets), hotel: r2(hotel), food: r2(food), ll: r2(ll), other: r2(travel + extra), per: r2(total / Math.max(1, adults + kids)) };
};

// ---------- charter bus
export const BUS = ["Minibus (up to 25 passengers)", "Mid-size coach (35 passengers)", "Full-size coach (56 passengers)", "Double-decker (80 passengers)"];
export const charterBus: TrvCalculator = (v) => {
  const b = pick(v.bus, 4), hr = pos(v.rate, 0) || [130, 160, 190, 260][b], hrs = Math.max(pos(v.min, 5), pos(v.hrs, 6)), mi = pos(v.mi, 0), mode = pick(v.mode, 2);
  const base = mode === 0 ? hr * hrs : mi * ([4, 4.75, 5.5, 7][b]), driver = Math.round(pos(v.nights, 0)) * pos(v.hotel, 150), fees = pos(v.fees, 0), tip = (base * pos(v.tip, 10)) / 100, pax = Math.max(1, Math.round(pos(v.pax, 40)));
  const total = base * (1 + pos(v.fuel, 0) / 100) + driver + fees + tip;
  return { total: r2(total), per: r2(total / pax), base: r2(base), tip: r2(tip), extras: r2(driver + fees + base * pos(v.fuel, 0) / 100), rule: mode === 0 ? `${money(hr)}/hour × ${hrs} h (minimum ${pos(v.min, 5)} h)` : `${nfmt(mi)} miles × ${money([4, 4.75, 5.5, 7][b])}/mile` };
};

// ---------- Japan & Europe trips
export const TIER = ["Budget", "Mid-range", "Comfort / luxury"];
export const japanTrip: TrvCalculator = (v) => {
  const t = pick(v.tier, 3), days = Math.max(1, Math.round(pos(v.days, 10))), pax = Math.max(1, Math.round(pos(v.pax, 2))), rooms = Math.ceil(pax / 2), fx = pos(v.fx, 150);
  const stay = [9000, 20000, 55000][t] * rooms * (days - 1), food = [4000, 8000, 20000][t] * pax * days, local = [1200, 1800, 3000][t] * pax * days, act = pos(v.act, 3000) * pax * days;
  const rail = pick(v.rail, 3) === 1 ? 50000 * pax : pick(v.rail, 3) === 2 ? pos(v.railamt, 30000) * pax : 0, flights = pos(v.flight, 1100) * fx * pax, total = stay + food + local + act + rail + flights;
  return { total: r0(total), usd: r2(total / fx), per: r0(total / pax), stay: r0(stay), food: r0(food), move: r0(local + rail), act: r0(act), flights: r0(flights) };
};
export const EU_REGION = ["Western Europe (France, Germany, Netherlands, Belgium, Austria)", "Southern Europe (Spain, Italy, Portugal, Greece)", "Central & Eastern Europe (Czechia, Poland, Hungary, Croatia)", "Nordics & Switzerland", "UK & Ireland"];
const EU_DAY = [[90, 200, 450], [75, 170, 400], [50, 110, 280], [120, 260, 550], [100, 220, 480]];
export const europeTrip: TrvCalculator = (v) => {
  const r = pick(v.region, 5), t = pick(v.tier, 3), days = Math.max(1, Math.round(pos(v.days, 12))), pax = Math.max(1, Math.round(pos(v.pax, 2))), fx = pos(v.fx, 1.08);
  const daily = EU_DAY[r][t] * pax * days, transport = pos(v.trans, 25) * pax * days, car = pick(v.car, 2) === 1 ? pos(v.carday, 60) * days + pos(v.fuel, 20) * days : 0, flights = (pos(v.flight, 900) / fx) * pax, ins = pos(v.ins, 60) / fx * pax;
  const total = daily + transport + car + flights + ins;
  return { total: r2(total), usd: r2(total * fx), per: r2(total / pax), daily: r2(daily), move: r2(transport + car), flights: r2(flights + ins), perday: r2(total / days / pax) };
};

// ---------- hotel cost
export const hotelCost: TrvCalculator = (v) => {
  const nights = Math.max(1, Math.round(pos(v.out, 20804) - pos(v.in, 20800))), rate = pos(v.rate, 189), rooms = Math.max(1, Math.round(pos(v.rooms, 1))), tax = pos(v.tax, 14) / 100, resort = pos(v.resort, 0), park = pos(v.park, 0), pax = Math.max(1, Math.round(pos(v.pax, 2)));
  const room = rate * nights * rooms, taxes = room * tax + resort * nights * rooms * tax, fees = resort * nights * rooms + park * nights, total = room + taxes + fees;
  return { total: r2(total), nights, room: r2(room), taxes: r2(taxes), fees: r2(fees), avg: r2(total / nights / rooms), per: r2(total / pax) };
};

// ---------- fly vs drive
export const flyVsDrive: TrvCalculator = (v) => {
  const mi = pos(v.mi, 600), pax = Math.max(1, Math.round(pos(v.pax, 2))), rt = pick(v.rt, 2) === 1 ? 2 : 1, mph = Math.max(1, pos(v.mph, 60)), maxH = Math.max(1, pos(v.maxh, 10));
  const driveH = mi / mph, overnight = driveH > maxH ? Math.ceil(driveH / maxH) - 1 : 0;
  const drive = ((mi / Math.max(1, pos(v.mpg, 28))) * pos(v.gas, 3.4) + mi * pos(v.wear, 0.12) + pos(v.tolls, 0) + overnight * pos(v.hotel, 140) + pos(v.food, 30) * pax * Math.ceil(driveH / 6)) * rt;
  const fly = (pos(v.fare, 220) * pax + pos(v.bags, 35) * pax + pos(v.airfood, 15) * pax) * rt + pos(v.park, 60) + pos(v.rental, 0);
  const flyH = pos(v.flyh, 2) + pos(v.door, 3), tv = pos(v.time, 0) * pax, driveT = drive + driveH * rt * tv, flyT = fly + flyH * rt * tv;
  return { verdict: driveT < flyT ? `🚗 Drive — about ${money(flyT - driveT)} cheaper${tv ? " including the value of your time" : ""}` : `✈️ Fly — about ${money(driveT - flyT)} cheaper${tv ? " including the value of your time" : ""}`, drive: r2(drive), fly: r2(fly), dtime: `${r1(driveH)} h each way${overnight ? ` (+${overnight} overnight stop${overnight > 1 ? "s" : ""})` : ""}`, ftime: `${r1(flyH)} h door to door each way` };
};

// ---------- RV vs hotel
export const rvVsHotel: TrvCalculator = (v) => {
  const n = Math.max(1, Math.round(pos(v.nights, 7))), mi = pos(v.mi, 1200);
  const rv = pos(v.rvday, 180) * n + mi * pos(v.rvmile, 0.35) + (mi / Math.max(1, pos(v.rvmpg, 10))) * pos(v.gas, 3.6) + pos(v.camp, 50) * n + pos(v.rvfees, 250) + pos(v.rvfood, 40) * n;
  const car = (mi / Math.max(1, pos(v.mpg, 28))) * pos(v.gas, 3.6), hotel = pos(v.hotel, 160) * n * (1 + pos(v.htax, 12) / 100) + car + pos(v.eat, 120) * n;
  return { verdict: rv < hotel ? `🚐 RV is cheaper by ${money(hotel - rv)}` : `🏨 Car + hotels are cheaper by ${money(rv - hotel)}`, rv: r2(rv), hotel: r2(hotel), rvn: r2(rv / n), hn: r2(hotel / n) };
};

// ---------- cruise
export const rcGratuity: TrvCalculator = (v) => {
  const g = Math.round(pos(v.guests, 2)), n = Math.round(pos(v.nights, 7)), suite = pick(v.suite, 2) === 1, rate = pos(v.rate, 0) || (suite ? 21 : 18.5);
  const grat = g * n * rate, svc = (pos(v.bar, 0) + pos(v.spa, 0)) * 0.18;
  return { total: r2(grat + svc), grat: r2(grat), svc: r2(svc), rate: r2(rate), note: "Charged to your SeaPass account daily; prepay before sailing to lock the rate." };
};
export const disneyCruiseTip: TrvCalculator = (v) => {
  const g = Math.round(pos(v.guests, 4)), n = Math.round(pos(v.nights, 4)), con = pick(v.con, 2) === 1, rate = pos(v.rate, 0) || 14.5;
  const room = 4.5 * g * n, dining = 10 * g * n * (rate / 14.5), extra = con ? pos(v.conc, 0) : 0, bar = pos(v.bar, 0) * 0.18;
  return { total: r2(room * (rate / 14.5) + dining + extra + bar), host: r2(room * (rate / 14.5)), dining: r2(dining), bar: r2(bar), note: `${money(rate)} per guest per night: stateroom host, dining room server, assistant server and head server${con ? "; concierge guests usually tip concierge staff separately" : ""}` };
};
export function drinkPkg(price: number, nights: number, perDay: number, avg: number, svc: number, adults: number, ports = 0) {
  const pkg = price * (1 + svc / 100) * nights * adults, alc = perDay * avg * (1 + svc / 100) * (nights - ports * 0.4) * adults, be = (price * (1 + svc / 100)) / (avg * (1 + svc / 100));
  return { pkg: r2(pkg), alc: r2(alc), save: r2(alc - pkg), be: r1(be), verdict: alc > pkg ? `✅ The package saves ${money(alc - pkg)}` : `❌ Pay as you go — the package costs ${money(pkg - alc)} more` };
}
export const CRUISE_LINES: [string, number][] = [["Royal Caribbean Deluxe (approx.)", 85], ["Carnival CHEERS!", 65], ["Norwegian (More at Sea gratuity)", 25], ["Celebrity Classic", 80], ["Princess Plus", 60], ["MSC Easy", 45], ["Custom", 0]];
export const cruiseDrink: TrvCalculator = (v) => {
  const line = pick(v.line, CRUISE_LINES.length), price = pos(v.price, 0) || CRUISE_LINES[line][1] || 70;
  return drinkPkg(price, Math.round(pos(v.nights, 7)), pos(v.drinks, 6), pos(v.avg, 12), pos(v.svc, 18), Math.max(1, Math.round(pos(v.adults, 2))), Math.round(pos(v.ports, 0)));
};
export const rcDrink: TrvCalculator = (v) => {
  const r = drinkPkg(pos(v.price, 85), Math.round(pos(v.nights, 7)), pos(v.drinks, 6), pos(v.avg, 13), 18, Math.max(1, Math.round(pos(v.adults, 2))), Math.round(pos(v.ports, 0)));
  return { ...r, rule: "Royal Caribbean requires every adult in the stateroom to buy the Deluxe package if one does; price + 18% service charge per day." };
};
export const virginBarTab: TrvCalculator = (v) => {
  const n = Math.round(pos(v.nights, 5)), spend = pos(v.drinks, 4) * pos(v.avg, 12) * n * Math.max(1, Math.round(pos(v.adults, 2))), pay = pos(v.buy, 300), bonus = pos(v.bonus, 33.33) / 100, value = pay * (1 + bonus);
  return { value: r2(value), spend: r2(spend), extra: r2(Math.max(0, spend - value)), left: r2(Math.max(0, value - spend)), verdict: spend >= value ? `Your drinking covers the bar tab — you get ${money(value - pay)} free` : `You may leave ${money(value - spend)} unused — buy a smaller tab` };
};

// ---------- Copenhagen Card
export const CPH_CARD: [string, number][] = [["24 hours", 529], ["48 hours", 799], ["72 hours", 999], ["96 hours", 1149], ["120 hours", 1299]];
export const CPH_SIGHTS: [string, number][] = [["Tivoli Gardens entry", 175], ["Canal boat tour", 129], ["Rosenborg Castle", 150], ["National Museum", 140], ["Round Tower", 60], ["Louisiana Museum of Modern Art", 175], ["Copenhagen Zoo", 239], ["Kronborg Castle (Hamlet's castle)", 185], ["Ny Carlsberg Glyptotek", 125], ["Christiansborg Palace", 175]];
export const cphCard: TrvCalculator = (v) => {
  const c = CPH_CARD[pick(v.card, CPH_CARD.length)], adults = Math.max(1, Math.round(pos(v.adults, 1)));
  let sights = 0;
  CPH_SIGHTS.forEach(([, p], i) => { if (pick(v[`s${i}`], 2) === 1) sights += p; });
  const days = Math.ceil(Number(c[0].split(" ")[0]) / 24), transport = pos(v.trans, 90) * days, payg = (sights + transport) * adults, card = c[1] * adults;
  return { verdict: payg > card ? `✅ The card saves DKK ${nfmt(payg - card)}` : `❌ Pay separately — DKK ${nfmt(card - payg)} cheaper`, card: r0(card), payg: r0(payg), save: r0(payg - card), note: `Card includes free public transport in the capital region (incl. airport); ${adults} adult(s); up to 2 children under 12 go free with each adult card` };
};

// ---------- Camino
export const CAMINO = ["Camino Francés from Saint-Jean-Pied-de-Port (780 km)", "Camino Francés from Sarria (115 km)", "Camino Portugués from Lisbon (620 km)", "Camino Portugués from Porto (240 km)", "Camino del Norte from Irún (820 km)", "Camino Primitivo from Oviedo (320 km)", "Custom distance"];
const CAMINO_KM = [780, 115, 620, 240, 820, 320, 0];
export const camino: TrvCalculator = (v) => {
  const r = pick(v.route, CAMINO.length), km = r === CAMINO.length - 1 ? pos(v.km, 300) : CAMINO_KM[r], perDay = pos(v.kmday, 22);
  if (perDay <= 0) throw new InputError("Enter how many km you walk per day.");
  const walk = Math.ceil(km / perDay), rest = Math.round(pos(v.rest, 0)), days = walk + rest, t = pick(v.tier, 3), daily = pos(v.daily, 0) || [45, 75, 140][t];
  const stay = days * daily, travel = pos(v.travel, 600), gear = pos(v.gear, 250), total = stay + travel + gear;
  return { total: r2(total), days, walk, stay: r2(stay), other: r2(travel + gear), perday: r2(daily), note: `${nfmt(km)} km at ${perDay} km/day (+${rest} rest day${rest === 1 ? "" : "s"}) · ${["albergues + menú del peregrino", "private rooms in albergues / pensiones", "hotels + luggage transfer"][t]}` };
};

// ---------- yacht charter
export const YACHT = ["Bareboat sailboat 40–45 ft", "Bareboat catamaran 40–45 ft", "Skippered catamaran", "Crewed sailing yacht (50–60 ft)", "Crewed motor yacht 25–30 m", "Superyacht 40 m+"];
const YACHT_WK = [4500, 7500, 10500, 25000, 85000, 220000];
export const yacht: TrvCalculator = (v) => {
  const y = pick(v.type, YACHT.length), days = Math.max(1, Math.round(pos(v.days, 7))), base = (pos(v.rate, 0) || YACHT_WK[y]) * (days / 7), crewed = y >= 3;
  const apa = crewed ? (base * pos(v.apa, 30)) / 100 : 0, vat = (base * pos(v.vat, 12)) / 100, tip = (base * (crewed ? pos(v.tip, 12.5) : 0)) / 100, extra = crewed ? 0 : (pos(v.skipper, 0) + pos(v.prov, 60)) * days + pos(v.clean, 250), guests = Math.max(1, Math.round(pos(v.guests, 6)));
  const total = base + apa + vat + tip + extra;
  return { total: r2(total), per: r2(total / guests), base: r2(base), apa: r2(apa), vat: r2(vat), tip: r2(tip), other: r2(extra), note: crewed ? "APA (Advance Provisioning Allowance) covers fuel, food, drinks, marina fees — unused APA is refunded" : "Bareboat: you pay fuel, food, marina fees and end-of-charter cleaning yourself" };
};

export const trvTripCustomCalculators: Record<string, TrvCalculator> = {
  "airbnb-fee-calculator": airbnbFee,
  "dvc-points-calculator": dvcPoints,
  "dvc-rental-calculator": dvcRental,
  "dvc-cost-calculator": dvcCost,
  "dvc-booking-window-calculator": dvcWindow,
  "disney-dining-reservation-date-calculator": disneyAdr,
  "theme-park-crowd-calculator": crowd,
  "disney-trip-cost-calculator": disneyTrip,
  "charter-bus-cost-calculator": charterBus,
  "japan-trip-cost-calculator": japanTrip,
  "europe-trip-cost-calculator": europeTrip,
  "hotel-cost-calculator": hotelCost,
  "fly-vs-drive-calculator": flyVsDrive,
  "rv-vs-hotel-calculator": rvVsHotel,
  "royal-caribbean-gratuity-calculator": rcGratuity,
  "disney-cruise-tip-calculator": disneyCruiseTip,
  "cruise-drink-package-calculator": cruiseDrink,
  "royal-caribbean-drink-package-calculator": rcDrink,
  "virgin-voyages-bar-tab-calculator": virginBarTab,
  "copenhagen-card-calculator": cphCard,
  "camino-de-santiago-cost-calculator": camino,
  "yacht-charter-cost-calculator": yacht,
};
