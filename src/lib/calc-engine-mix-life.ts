/**
 * Batch: Mixed keyword check (16 Nov 2026, Claude outputs/Mixed_Keyword_Check.md). Six tools:
 * chronological (testing) age (Jobs & Education > School Age), age difference (Science > Math),
 * generation (Arts > Tarot, Astrology & Fun), miles to steps (Sports > Hiking), day trading
 * (Finance > Stock & Options) and surface feet per minute (Business & Industrial > Manufacturing).
 *
 * Near-namesakes kept apart on purpose:
 *  - chronological-age = the y;m;d age used to score psychological / educational tests, with the
 *    test-manual borrowing rule (30-day months) and corrected age for prematurity. age-calculator
 *    (existing) = everyday exact age, total days and next birthday.
 *  - age-difference = the gap between TWO people's birth dates. age-calculator is one person.
 *  - miles-to-steps = distance → steps (reverse direction). step-calculator (existing) = steps →
 *    distance and calories; step-length-calculator (existing) = stride only. Walking step length
 *    uses the same 0.415 × height (men) / 0.413 (women) rule as calc-engine-hiking-steps.ts.
 *  - day-trading = stock position size from account risk and stop, P/L at target and stop after
 *    commissions, and a daily-compounding projection. forex-position-size and
 *    crypto-position-size (existing) are lot/coin based; stock-profit (existing) is one trade's P/L.
 *  - surface-feet-per-minute = machining cutting speed SFM ↔ spindle RPM.
 *
 * Dates arrive as whole days since 1970-01-01 UTC (CalculatorWidget convention).
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt, sig, dayText, dayParts, dateIn } from "./trv-core";

const pl = (n: number, w: string) => `${nfmt(n)} ${w}${n === 1 ? "" : "s"}`;
const show = (x: number, s = 6) => (Number.isFinite(x) ? nfmt(sig(x, s), 6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
const usd = (x: number) => `${x < 0 ? "−" : ""}$${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => Math.floor(Date.now() / 86400000);
const dim = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Calendar-exact years, months, days from a to b (a ≤ b). */
function ymd(a: number, b: number) {
  const A = dayParts(a), B = dayParts(b);
  let y = B.y - A.y, m = B.m - A.m, d = B.d - A.d;
  if (d < 0) { m -= 1; const pm = B.m === 1 ? 12 : B.m - 1, py = B.m === 1 ? B.y - 1 : B.y; d += dim(py, pm); }
  if (m < 0) { y -= 1; m += 12; }
  return { y, m, d };
}
/** Test-manual subtraction: borrow 30 days for a month and 12 months for a year. */
function manual(a: number, b: number) {
  const A = dayParts(a), B = dayParts(b);
  let y = B.y - A.y, m = B.m - A.m, d = B.d - A.d;
  if (d < 0) { m -= 1; d += 30; }
  if (m < 0) { y -= 1; m += 12; }
  return { y, m, d };
}
export const chronologicalAge: Calc = (v) => {
  const b = dateIn(v, "birth", 17532), t = dateIn(v, "test", today());
  if (b > t) throw new InputError("The date of birth is after the test date.");
  const meth = pick(v.method, 2), f = meth === 0 ? manual : ymd;
  const a = f(b, t);
  const semi = (x: { y: number; m: number; d: number }) => `${x.y};${x.m};${x.d}`;
  let rounded = "—";
  if (pick(v.round, 2) === 1) { let { y, m } = a; if (a.d >= 15) m += 1; if (m >= 12) { y += 1; m -= 12; } rounded = `${y};${m} (years;months)`; }
  const gw = num(v.gestation, 40);
  if (gw < 22 || gw > 42) throw new InputError("Gestational age at birth should be between 22 and 42 weeks (40 = full term).");
  let corrected = "No correction (born at 37 weeks or later)";
  if (gw < 37) {
    const prem = Math.round((40 - gw) * 7), ct = t - prem;
    if (ct < b) corrected = `Not yet reached due date (${pl(b - ct, "day")} before it)`;
    else { const c = f(b, ct); const under2 = c.y < 2; corrected = `${semi(c)} — ${pl(c.y, "year")}, ${pl(c.m, "month")}, ${pl(c.d, "day")} (born ${show(40 - gw, 3)} weeks early${under2 ? "; most tests use corrected age until 24 months" : "; past 24 months, most tests use chronological age"})`; }
  }
  return {
    ca: semi(a),
    words: `${pl(a.y, "year")}, ${pl(a.m, "month")}, ${pl(a.d, "day")}`,
    months: a.y * 12 + a.m,
    decimal: `${(a.y + a.m / 12 + a.d / 365.25).toFixed(2)} years`,
    rounded,
    corrected,
    working: `Test date ${dayText(t)} − birth date ${dayText(b)}${meth === 0 ? " (borrowing 30 days / 12 months)" : ""}`,
  };
};

// ------------------------------------------------------------------ age difference
export const ageDifference: Calc = (v) => {
  const a = dateIn(v, "a", 7305), b = dateIn(v, "b", 8766), now = dateIn(v, "asof", today());
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const g = ymd(lo, hi), days = hi - lo;
  const older = a === b ? "Same birthday — no age gap" : a < b ? "Person A is older" : "Person B is older";
  const ageAt = (d: number) => (now >= d ? ymd(d, now).y : 0);
  const oA = ageAt(lo), yA = ageAt(hi);
  const rule = oA ? `Half-your-age-plus-seven: ${oA} → youngest ${Math.ceil(oA / 2 + 7)}. Ages ${oA} and ${yA} ${yA >= oA / 2 + 7 ? "pass" : "don't pass"} the rule.` : "—";
  return {
    gap: a === b ? "0 days" : `${pl(g.y, "year")}, ${pl(g.m, "month")}, ${pl(g.d, "day")}`,
    older,
    years: `${(days / 365.2425).toFixed(2)} years`,
    months: `${nfmt(g.y * 12 + g.m)} months ${pl(g.d, "day")}`,
    weeks: `${nfmt(Math.floor(days / 7))} weeks ${pl(days % 7, "day")}`,
    days: nfmt(days),
    ages: now >= hi ? `On ${dayText(now)}: older ${oA}, younger ${yA}` : "—",
    rule,
  };
};

// ------------------------------------------------------------------ generation
/** Pew Research Center ranges; Gen Alpha / Beta from McCrindle (Pew hasn't set them). */
export const GENERATIONS: [string, number, number, string][] = [
  ["Lost Generation", 1883, 1900, "came of age during World War I"],
  ["Greatest Generation", 1901, 1927, "grew up in the Great Depression and fought World War II"],
  ["Silent Generation", 1928, 1945, "grew up in the Depression and World War II years"],
  ["Baby Boomers", 1946, 1964, "the post-war birth boom"],
  ["Generation X", 1965, 1980, "grew up with cable TV and the first home computers"],
  ["Millennials (Gen Y)", 1981, 1996, "came of age around the 2000 millennium and the rise of the internet"],
  ["Generation Z", 1997, 2012, "the first generation raised with smartphones and social media"],
  ["Generation Alpha", 2013, 2024, "born entirely in the 21st-century smartphone era"],
  ["Generation Beta", 2025, 2039, "born from 2025 into the AI era"],
];
const CUSPS: [string, number, number][] = [["Xennial (Gen X / Millennial cusp)", 1977, 1983], ["Zillennial (Millennial / Gen Z cusp)", 1993, 1998]];
export const generation: Calc = (v) => {
  const y = Math.round(num(v.year, 1990));
  if (y < 1883 || y > 2039) throw new InputError("Enter a birth year between 1883 and 2039.");
  const g = GENERATIONS.find(([, a, b]) => y >= a && y <= b)!;
  const cusp = CUSPS.find(([, a, b]) => y >= a && y <= b);
  const now = dayParts(today()).y;
  const i = GENERATIONS.indexOf(g);
  return {
    generation: g[0],
    years: `${g[1]}–${g[2]}`,
    about: `${g[0]} ${g[3]}.`,
    cusp: cusp ? `${cusp[0]}, born ${cusp[1]}–${cusp[2]}` : "Not on a cusp",
    age: y <= now ? `Turning ${now - y} in ${now}` : `Not born yet (${y})`,
    neighbours: `${i > 0 ? `Before: ${GENERATIONS[i - 1][0]} (${GENERATIONS[i - 1][1]}–${GENERATIONS[i - 1][2]})` : ""}${i > 0 && i < GENERATIONS.length - 1 ? " · " : ""}${i < GENERATIONS.length - 1 ? `After: ${GENERATIONS[i + 1][0]} (${GENERATIONS[i + 1][1]}–${GENERATIONS[i + 1][2]})` : ""}`,
  };
};
/** Step length ÷ height: walking 0.415 / 0.413 (as step-calculator), jogging ≈ 0.55, running ≈ 0.65. */
export const MS_PACE: [string, number, number][] = [["Walking (≈ 3 mph)", 0.415, 20], ["Brisk walking (≈ 3.5–4 mph)", 0.45, 16], ["Jogging (≈ 5–6 mph)", 0.55, 11], ["Running (≈ 7–8 mph)", 0.65, 8]];
export const milesToSteps: Calc = (v) => {
  const d = num(v.distance, 1), du = pick(v.unit, 2);
  if (!(d > 0)) throw new InputError("Enter a distance above zero.");
  const h = num(v.height, 69), hu = pick(v.hunit, 2), female = pick(v.sex, 2) === 1, p = MS_PACE[pick(v.pace, MS_PACE.length)];
  const hcm = hu === 0 ? h * 2.54 : h;
  if (hcm < 50 || hcm > 250) throw new InputError("Enter a height between 50 and 250 cm (20–98 in).");
  const own = num(v.step, 0);
  const ratio = p[1] === 0.415 && female ? 0.413 : p[1];
  const stepCm = own > 0 ? (hu === 0 ? own * 2.54 : own) : hcm * ratio;
  const km = du === 0 ? d * 1.609344 : d;
  const steps = (km * 100000) / stepCm;
  const perMile = 160934.4 / stepCm, perKm = 100000 / stepCm;
  const mins = (km / 1.609344) * p[2];
  return {
    steps: Math.round(steps),
    perMile: nfmt(Math.round(perMile)),
    perKm: nfmt(Math.round(perKm)),
    stepLength: `${show(stepCm, 3)} cm (${show(stepCm / 2.54, 3)} in)${own > 0 ? " — your own" : " — estimated from height"}`,
    time: `about ${Math.round(mins)} min at ${p[0].toLowerCase()}`,
    goal: `10,000 steps ≈ ${show((10000 * stepCm) / 160934.4, 3)} miles (${show((10000 * stepCm) / 100000, 3)} km)`,
  };
};
export const dayTrading: Calc = (v) => {
  const acct = num(v.account, 30000), riskPct = num(v.risk, 1), entry = num(v.entry, 50), stop = num(v.stop, 49), target = num(v.target, 52.5);
  const comm = Math.max(0, num(v.commission, 0)), short = pick(v.side, 2) === 1, lev = [1, 2, 4][pick(v.leverage, 3)];
  if (!(acct > 0) || !(entry > 0)) throw new InputError("Enter an account size and entry price above zero.");
  if (!(riskPct > 0 && riskPct <= 100)) throw new InputError("Risk per trade should be between 0 and 100% (1–2% is common).");
  if (short ? stop <= entry : stop >= entry) throw new InputError(short ? "For a short, the stop-loss must be above the entry price." : "For a long, the stop-loss must be below the entry price.");
  if (short ? target >= entry : target <= entry) throw new InputError(short ? "For a short, the target must be below the entry price." : "For a long, the target must be above the entry price.");
  const riskPerShare = Math.abs(entry - stop), rewardPerShare = Math.abs(target - entry);
  const riskUsd = (acct * riskPct) / 100;
  const byRisk = Math.floor(Math.max(0, riskUsd - 2 * comm) / riskPerShare), byPower = Math.floor((acct * lev) / entry);
  const shares = Math.min(byRisk, byPower);
  if (shares < 1) throw new InputError("Your risk budget doesn't cover one share at this stop distance. Widen the risk %, tighten the stop or lower the commission.");
  const win = shares * rewardPerShare - 2 * comm, loss = shares * riskPerShare + 2 * comm;
  const rr = win / loss, be = 1 / (1 + rr);
  const days = Math.round(num(v.days, 20)), daily = num(v.daily, 0.5);
  const grown = acct * Math.pow(1 + daily / 100, days);
  return {
    shares: nfmt(shares),
    position: `${usd(shares * entry)} (${((shares * entry) / acct * 100).toFixed(1)}% of account${shares === byPower && byPower < byRisk ? " — capped by buying power" : ""})`,
    profit: `${usd(win)} (+${((win / acct) * 100).toFixed(2)}% of account)`,
    loss: `${usd(-loss)} (−${((loss / acct) * 100).toFixed(2)}% of account)`,
    rr: `1 : ${rr.toFixed(2)}`,
    breakeven: `${(be * 100).toFixed(1)}% — you need to win more than this share of trades like it`,
    compound: `${usd(acct)} growing ${daily}% a day for ${days} trading days → ${usd(grown)} (${(((grown / acct) - 1) * 100).toFixed(1)}%)`,
    pdt: acct < 25000 ? "Under $25,000: the US pattern-day-trader rule limits margin accounts to 3 day trades in 5 business days. Check your broker's current rule." : "At or above the $25,000 US pattern-day-trader minimum for margin accounts.",
  };
};
/** Typical starting SFM [HSS, carbide] (Machinery's Handbook-style ranges, mid values). */
export const SFM_MATS: [string, number, number][] = [
  ["Aluminium", 250, 800], ["Brass / bronze", 150, 500], ["Mild steel (1018)", 100, 400], ["Alloy steel (4140)", 70, 300], ["Tool steel", 50, 200], ["Stainless steel (304)", 50, 250], ["Cast iron", 80, 300], ["Titanium", 40, 150], ["Plastics / acrylic", 300, 800], ["Wood", 600, 1500],
];
export const surfaceFeet: Calc = (v) => {
  const m = pick(v.mode, 3), dRaw = num(v.diameter, 0.5), du = pick(v.dunit, 2);
  const dIn = du === 0 ? dRaw : dRaw / 25.4;
  if (!(dIn > 0)) throw new InputError("Enter a tool or part diameter above zero.");
  const mat = SFM_MATS[pick(v.material, SFM_MATS.length)], tool = pick(v.tool, 2);
  let sfm: number, rpm: number;
  if (m === 0) { rpm = num(v.rpm, 3000); if (!(rpm > 0)) throw new InputError("Enter an RPM above zero."); sfm = (Math.PI * dIn * rpm) / 12; }
  else { sfm = m === 1 ? num(v.sfm, 400) : tool === 0 ? mat[1] : mat[2]; if (!(sfm > 0)) throw new InputError("Enter an SFM above zero."); rpm = (12 * sfm) / (Math.PI * dIn); }
  return {
    result: m === 0 ? `${nfmt(Math.round(sfm))} SFM` : `${nfmt(Math.round(rpm))} RPM`,
    sfm: `${nfmt(Math.round(sfm))} surface feet per minute`,
    rpm: `${nfmt(Math.round(rpm))} RPM`,
    metric: `${show(sfm * 0.3048, 4)} m/min`,
    diameter: `${show(dIn, 4)} in (${show(dIn * 25.4, 4)} mm)`,
    suggested: `${mat[0]}: about ${mat[1]} SFM with HSS, ${mat[2]} SFM with carbide`,
  };
};

export const mixLifeCustomCalculators: Record<string, Calc> = {
  "chronological-age-calculator": chronologicalAge,
  "age-difference-calculator": ageDifference,
  "generation-calculator": generation,
  "miles-to-steps-calculator": milesToSteps,
  "day-trading-calculator": dayTrading,
  "surface-feet-per-minute-calculator": surfaceFeet,
};

