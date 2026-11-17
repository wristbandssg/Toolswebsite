/**
 * Idea build, batch car2 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Car Maintenance, Repair & Upgrades (11) and Car Ownership, Fuel & EV Costs (14) = 25 tools.
 * Repair jobs share one parts + labour-hours × shop-rate engine (REPAIRS) with editable typical defaults.
 * EV cold-weather loss model: 0% at ≥70 °F rising linearly to ~30% at 20 °F and ~40% at 0 °F (in line with
 * AAA/Recurrent ranges), a heat pump cuts the loss by about a third.
 */

import { type TrvCalculator as Calc, InputError, num, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;

// ---- Repairs: parts + labour ----
export interface RepairSpec { parts: number; hours: number; extra?: [string, number]; diy: boolean }
export const REPAIRS: Record<string, RepairSpec> = {
  "brake-pad-replacement-cost-calculator": { parts: 150, hours: 1.5, extra: ["Rotor Resurfacing or Replacement", 0], diy: true },
  "engine-replacement-cost-calculator": { parts: 3500, hours: 12, extra: ["Fluids, Gaskets and Mounts", 400], diy: false },
  "bumper-repair-cost-calculator": { parts: 300, hours: 4, extra: ["Paint and Materials", 350], diy: false },
  "suspension-lift-kit-cost-calculator": { parts: 1500, hours: 6, extra: ["Alignment After Install", 150], diy: true },
  "car-audio-system-cost-calculator": { parts: 900, hours: 5, extra: ["Wiring Kit and Dash Adapter", 120], diy: true },
  "ev-battery-replacement-cost-calculator": { parts: 12000, hours: 6, extra: ["Core Credit (enter as negative saving)", 0], diy: false },
  "hybrid-battery-replacement-cost-calculator": { parts: 2800, hours: 3, extra: ["Core Charge Refund (saving)", 0], diy: false },
  "alignment-cost-calculator": { parts: 0, hours: 1, extra: ["Adjustment Hardware (cam bolts)", 0], diy: false },
  "coolant-flush-cost-calculator": { parts: 45, hours: 1, extra: ["Thermostat or Hoses", 0], diy: true },
  "spark-plug-replacement-cost-calculator": { parts: 60, hours: 1.2, extra: ["Ignition Coils", 0], diy: true },
};
const repairCalc = (s: RepairSpec, slug: string): Calc => (v) => {
  const parts = p(v, "pa", s.parts), hrs = p(v, "h", s.hours), rate = p(v, "r", 140), tax = p(v, "t", 7) / 100, fee = p(v, "f", 5) / 100, ext = p(v, "x", s.extra ? s.extra[1] : 0), tools = p(v, "tl", 50);
  const credit = slug.includes("battery") ? ext : 0, add = credit ? -ext : ext;
  const labour = hrs * rate, shop = (parts + add + labour) * fee + (parts + Math.max(0, add)) * tax + labour + parts + add;
  if (!(shop > 0)) throw new InputError("Enter parts or labour.");
  const diy = (parts + add) * (1 + tax) + tools;
  return { tot: `${$0(shop)} at a shop`, parts: `Parts ${$0(parts + add)} · labour ${$0(labour)} (${hrs} h × ${$0(rate)}/h) · tax and shop fees ${$0(shop - parts - add - labour)}`, diy: s.diy ? `${$0(diy)} DIY — saves ${$0(shop - diy)}` : "Usually a shop job — get two written quotes", share: `Labour is ${pc(labour / shop)} of the bill` };
};
export const repairCalcs: Record<string, Calc> = Object.fromEntries(Object.entries(REPAIRS).map(([s, spec]) => [s, repairCalc(spec, s)]));

const SCHED: [string, number][] = [["Oil and filter", 7500], ["Tire rotation", 7500], ["Engine air filter", 15000], ["Cabin air filter", 15000], ["Brake fluid", 30000], ["Transmission fluid", 60000], ["Coolant", 100000], ["Spark plugs", 100000]];
export const schedule: Calc = (v) => {
  const mi = p(v, "m", 42000), oil = need(p(v, "o", 7500), "Enter oil change interval."), yr = p(v, "y", 12000);
  const items = SCHED.map(([n, i]) => [n, n === "Oil and filter" ? oil : i] as [string, number]).map(([n, i]) => ({ n, next: Math.ceil((mi + 1) / i) * i }));
  items.sort((a, b) => a.next - b.next);
  const soon = items.filter((x) => x.next - mi <= 5000);
  return { next: `${items[0].n} at ${nfmt(items[0].next)} miles${yr ? ` (≈ ${Math.max(0, ((items[0].next - mi) / yr) * 12).toFixed(0)} months)` : ""}`, soon: soon.length ? `Due within 5,000 miles: ${soon.map((x) => `${x.n} (${nfmt(x.next)})`).join(", ")}` : "Nothing else due within 5,000 miles", list: items.map((x) => `${x.n} ${nfmt(x.next)}`).join(" · ") };
};

// ---- Ownership, fuel & EV ----
export const winterRange: Calc = (v) => {
  const r = need(p(v, "r", 300), "Enter rated range."), t = num(v.t, 20), hp = num(v.hp, 0) === 1;
  let loss = t >= 70 ? 0 : t >= 20 ? ((70 - t) / 50) * 0.3 : Math.min(0.5, 0.3 + ((20 - t) / 20) * 0.1);
  if (hp) loss *= 2 / 3;
  return { range: `${nfmt(Math.round(r * (1 - loss)))} miles expected range`, loss: `${pc(loss)} loss at ${t} °F${hp ? " with a heat pump" : ""}`, tip: "Precondition while plugged in and use seat heaters to recover range" };
};
export const superTrip: Calc = (v) => {
  const mi = p(v, "m", 400), e = need(p(v, "e", 28), "Enter efficiency."), price = p(v, "c", 0.45), loss = p(v, "l", 8) / 100, mpg = need(p(v, "g", 30), "Enter comparison mpg."), gas = p(v, "p", 3.3), home = p(v, "h", 0.16);
  const kwh = (mi * e) / 100 / (1 - loss), cost = kwh * price;
  return { cost: `${$(cost)} fast-charging the whole trip`, kwh: `${nfmt(Math.round(kwh))} kWh · ${$(cost / Math.max(mi, 1), 3)} per mile`, cmp: `Gas car ${$((mi / mpg) * gas)} · home charging ${$(kwh * home)}` };
};
export const phev: Calc = (v) => {
  const mi = p(v, "m", 12000), sh = p(v, "s", 60) / 100, e = p(v, "e", 0.33), el = p(v, "c", 0.16), mpg = need(p(v, "g", 42), "Enter hybrid-mode mpg."), gas = p(v, "p", 3.3);
  const ec = mi * sh * e * el, gc = ((mi * (1 - sh)) / mpg) * gas;
  return { tot: `${$0(ec + gc)} a year in energy`, split: `Electric ${$0(ec)} · gas ${$0(gc)}`, per: `${$(((ec + gc) / Math.max(mi, 1)) * 100)} per 100 miles` };
};
export const premiumGas: Calc = (v) => {
  const mi = p(v, "m", 12000), mpg = need(p(v, "g", 28), "Enter mpg."), diff = p(v, "d", 0.8), gain = p(v, "k", 0) / 100, reg = p(v, "r", 3.3);
  const regC = (mi / mpg) * reg, premC = (mi / (mpg * (1 + gain))) * (reg + diff);
  const beGain = diff / reg;
  return { extra: `${$0(premC - regC)} a year extra for premium`, cost: `Regular ${$0(regC)} · premium ${$0(premC)}`, be: `Premium needs ${pc(beGain, 1)} better mpg to break even — only use it if your manual requires it` };
};
export const dieselGas: Calc = (v) => {
  const mi = p(v, "m", 15000), md = need(p(v, "d", 30), "Enter diesel mpg."), mg = need(p(v, "g", 24), "Enter gas mpg."), pd = p(v, "pd", 3.8), pg = p(v, "pg", 3.3), prem = p(v, "pr", 4000), mnt = p(v, "x", 200);
  const sav = (mi / mg) * pg - (mi / md) * pd - mnt;
  return { sav: `${$0(sav)} a year ${sav >= 0 ? "saved with diesel" : "extra for diesel"}`, be: sav > 0 ? `${(prem / sav).toFixed(1)} years to recover the ${$0(prem)} premium` : "Diesel never pays back at these numbers", fuel: `Fuel: diesel ${$0((mi / md) * pd)} · gas ${$0((mi / mg) * pg)}` };
};
export const fuelYear: Calc = (v) => {
  const mi = p(v, "m", 12000), mpg = need(p(v, "g", 28), "Enter mpg."), gas = p(v, "p", 3.3);
  const c = (mi / mpg) * gas;
  return { yr: `${$0(c)} a year`, mo: `${$0(c / 12)} a month · ${$(c / 52)} a week`, gal: `${nfmt(Math.round(mi / mpg))} gallons · ${$(gas / mpg, 3)} per mile` };
};
export const idling: Calc = (v) => {
  const min = p(v, "m", 15), days = p(v, "d", 250), gph = p(v, "g", 0.3), gas = p(v, "p", 3.3);
  const gal = (min / 60) * gph * days;
  return { cost: `${$0(gal * gas)} a year idling`, gal: `${nfmt(Math.round(gal))} gallons burned`, co2: `${nfmt(Math.round(gal * 19.6))} lb of CO₂ (≈ 19.6 lb per gallon)` };
};
export const towing: Calc = (v) => {
  const mpg = need(p(v, "g", 18), "Enter normal mpg."), loss = Math.min(0.9, p(v, "l", 30) / 100), mi = p(v, "m", 300), gas = p(v, "p", 3.6);
  const tm = mpg * (1 - loss);
  return { mpg: `${tm.toFixed(1)} mpg while towing`, cost: `${$((mi / tm) * gas)} fuel for ${nfmt(mi)} miles`, extra: `${$((mi / tm - mi / mpg) * gas)} more than driving without the trailer` };
};
export const carYear: Calc = (v) => {
  const price = p(v, "p", 35000), res = p(v, "r", 45) / 100, yrs = Math.max(1, p(v, "y", 5)), mi = p(v, "m", 12000), mpg = need(p(v, "g", 28), "Enter mpg."), gas = p(v, "c", 3.3), ins = p(v, "i", 1700), mnt = p(v, "x", 900), reg = p(v, "rg", 250), int = p(v, "in", 1200), park = p(v, "pk", 0);
  const dep = (price * (1 - res)) / yrs, fuel = (mi / mpg) * gas, tot = dep + fuel + ins + mnt + reg + int + park;
  return { tot: `${$0(tot)} a year (${$0(tot / 12)} a month)`, mile: `${$(tot / Math.max(mi, 1))} per mile`, parts: `Depreciation ${$0(dep)} · fuel ${$0(fuel)} · insurance ${$0(ins)} · upkeep ${$0(mnt)} · interest ${$0(int)} · fees and parking ${$0(reg + park)}` };
};
export const regWeight: Calc = (v) => {
  const w = need(p(v, "w", 4200), "Enter vehicle weight."), base = p(v, "b", 50), th = p(v, "t", 3000), rate = p(v, "r", 2.5), other = p(v, "o", 30);
  const over = Math.max(0, Math.ceil((w - th) / 100)), fee = base + over * rate + other;
  return { fee: `${$(fee)} yearly registration`, parts: `Base ${$(base)} + ${over} × ${$(rate)} per 100 lb over ${nfmt(th)} lb + ${$(other)} other fees`, note: "Weight-based schedules vary by state — enter your DMV's rates" };
};
export const teenDriver: Calc = (v) => {
  const ins = p(v, "i", 2800), ed = p(v, "e", 500), lic = p(v, "l", 60), mi = p(v, "m", 5000), mpg = need(p(v, "g", 26), "Enter mpg."), gas = p(v, "p", 3.3), wear = p(v, "w", 0.1), disc = p(v, "d", 10) / 100;
  const ins1 = ins * (1 - disc), y1 = ins1 + ed + lic + (mi / mpg) * gas + mi * wear;
  return { y1: `${$0(y1)} in the first year`, after: `${$0(y1 - ed - lic)} a year after that`, ins: `${$0(ins1)} insurance increase after ${pc(disc)} good-student or course discount` };
};
export const companyCar: Calc = (v) => {
  const allow = p(v, "a", 600), tax = p(v, "t", 30) / 100, own = p(v, "o", 7500), imp = p(v, "i", 4000);
  const allowNet = allow * 12 * (1 - tax) - own, carNet = -imp * tax;
  return { allow: `Allowance: ${$0(allowNet)} a year after tax and your own car costs`, car: `Company car: ${$0(carNet)} a year (tax on ${$0(imp)} of personal-use benefit)`, win: allowNet > carNet ? `Allowance is better by ${$0(allowNet - carNet)}` : `Company car is better by ${$0(carNet - allowNet)}` };
};
export const irsMileage: Calc = (v) => {
  const mi = p(v, "m", 800), rate = p(v, "r", 0.7), paid = p(v, "e", 0.5);
  const due = mi * rate;
  return { due: `${$(due)} at the IRS rate`, paid: paid ? `${$(mi * paid)} at your employer's rate — ${$(Math.abs(due - mi * paid))} ${paid < rate ? "below" : "above"} the IRS rate` : "—", note: paid > rate ? "Reimbursement above the IRS rate is taxable income" : "Reimbursement at or below the IRS rate is tax-free under an accountable plan" };
};
export const mileageLog: Calc = (v) => {
  const bm = p(v, "b", 9000), tot = need(p(v, "t", 15000), "Enter total miles."), rate = p(v, "r", 0.7), pt = p(v, "pt", 300), costs = p(v, "c", 9500), tax = p(v, "x", 22) / 100, se = num(v.se, 1) === 1;
  const std = bm * rate + pt, act = costs * (bm / tot) + pt, best = Math.max(std, act), rt = tax + (se ? 0.153 * 0.9235 : 0);
  return { ded: `${$0(best)} deduction (${std >= act ? "standard mileage" : "actual expense"} method)`, cmp: `Standard ${$0(std)} · actual ${$0(act)} (${pc(bm / tot)} business use)`, save: `≈ ${$0(best * rt)} tax saved${se ? " incl. self-employment tax" : ""}` };
};

// ---- registry (generated)
export const ideaCar2CustomCalculators: Record<string, Calc> = {
  ...repairCalcs,
  "car-maintenance-schedule-mileage-calculator": schedule,
  "ev-range-winter-loss-calculator": winterRange,
  "supercharger-cost-per-trip-calculator": superTrip,
  "plug-in-hybrid-fuel-cost-calculator": phev,
  "premium-vs-regular-gas-cost-calculator": premiumGas,
  "diesel-vs-gas-cost-calculator": dieselGas,
  "fuel-cost-per-year-calculator": fuelYear,
  "idling-fuel-cost-calculator": idling,
  "towing-fuel-economy-calculator": towing,
  "car-cost-per-year-calculator": carYear,
  "car-annual-registration-by-weight-calculator": regWeight,
  "teen-driver-total-cost-calculator": teenDriver,
  "company-car-vs-allowance-calculator": companyCar,
  "mileage-reimbursement-irs-rate-calculator": irsMileage,
  "business-mileage-log-deduction-calculator": mileageLog,
};
