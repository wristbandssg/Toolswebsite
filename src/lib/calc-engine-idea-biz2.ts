/**
 * Idea build, batch biz2 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > Energy, Solar & Electrical (28 tools).
 * Tilt: annual ≈ latitude×0.87 (Landau fit), summer −15°, winter +15°. Wind P = ½ρAv³·Cp.
 * Hydro P = ρ g Q H η. Motor FLA (3-ph) = HP·746/(√3·V·η·PF). kVAR = P(tanφ1 − tanφ2).
 * Grounding rod (Dwight): R = ρ/(2πL)·(ln(4L/a) − 1). Diesel genset ≈ 0.07 gal/kWh at full load.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };

export const solarTilt: Calc = (v) => {
  const lat = Math.abs(num(v.lat, 35));
  if (lat > 70) throw new InputError("Enter a latitude between 0 and 70°.");
  const yr = lat < 25 ? lat * 0.87 : lat * 0.76 + 3.1;
  return { yr: `${yr.toFixed(1)}° year-round tilt`, seasons: `Summer ${Math.max(0, yr - 15).toFixed(0)}° · Winter ${(yr + 15).toFixed(0)}° · Spring/Fall ${yr.toFixed(0)}°`, face: `Face true ${num(v.lat, 35) >= 0 ? "south" : "north"}` };
};
export const arraySize: Calc = (v) => {
  const kwh = need(p(v, "kwh", 900), "Enter monthly use."), sun = need(p(v, "sun", 4.5), "Enter peak sun hours."), loss = p(v, "loss", 20) / 100, w = need(p(v, "w", 400), "Enter panel watts."), off = p(v, "off", 100) / 100;
  const kw = (kwh * off * 12) / 365 / sun / (1 - loss);
  return { kw: `${kw.toFixed(2)} kW system`, panels: `${Math.ceil((kw * 1000) / w)} panels of ${w} W`, roof: `${nfmt(Math.ceil((kw * 1000) / w) * 19)} ft² of roof (≈19 ft² per panel)`, yr: `${nfmt(kwh * off * 12)} kWh a year` };
};
export const batteryBank: Calc = (v) => {
  const kwh = need(p(v, "kwh", 10), "Enter daily energy."), days = p(v, "days", 2), dod = Math.max(0.1, p(v, "dod", 80) / 100), volt = need(p(v, "v", 48), "Enter system voltage."), eff = Math.max(0.5, p(v, "eff", 95) / 100);
  const need$ = (kwh * days) / dod / eff;
  return { kwh: `${need$.toFixed(1)} kWh of battery capacity`, ah: `${nfmt((need$ * 1000) / volt)} Ah at ${volt} V`, note: `${days} day(s) of autonomy at ${(dod * 100).toFixed(0)}% depth of discharge` };
};
export const chargeController: Calc = (v) => {
  const w = need(p(v, "w", 2400), "Enter array watts."), vb = need(p(v, "v", 24), "Enter battery voltage."), voc = p(v, "voc", 49.5), series = Math.max(1, Math.round(p(v, "s", 3))), cold = p(v, "c", 14) / 100;
  const amps = (w / vb) * 1.25, vmax = voc * series * (1 + cold);
  return { amps: `${Math.ceil(amps)} A MPPT controller minimum`, volts: `${vmax.toFixed(0)} V max PV input (cold-weather Voc)`, note: "Includes NEC 1.25 safety factor; pick a controller rated above both" };
};
export const shadingLoss: Calc = (v) => {
  const sys = need(p(v, "kw", 8), "Enter system size."), shaded = p(v, "sh", 15) / 100, hours = p(v, "h", 3) / 24 * 4, tech = pick(v.t, 3), yieldKwh = p(v, "y", 1300);
  const factor = [1.8, 1.1, 1][tech], loss = Math.min(0.9, shaded * factor * Math.min(1, hours / 2));
  return { loss: `${(loss * 100).toFixed(1)}% annual energy loss`, kwh: `${nfmt(sys * yieldKwh * loss)} kWh lost a year`, note: ["String inverter: one shaded panel drags the whole string", "Optimizers limit the loss to shaded panels", "Microinverters isolate each panel"][tech] };
};
export const INV = ["String inverter", "Power optimizers", "Microinverters"];
export const netMetering: Calc = (v) => {
  const prod = p(v, "prod", 10000), use = p(v, "use", 11000), self = p(v, "self", 40) / 100, retail = p(v, "r", 0.16), credit = p(v, "c", 0.08);
  const selfUsed = Math.min(prod * self, use), exported = prod - selfUsed, savings = selfUsed * retail + exported * credit;
  return { save: `${$(savings, 0)} a year`, split: `${nfmt(selfUsed)} kWh used directly (${$(selfUsed * retail, 0)}) + ${nfmt(exported)} kWh exported (${$(exported * credit, 0)})`, full: `${$(prod * retail, 0)} if exports were credited at full retail (1:1 net metering)` };
};
export const lcoe: Calc = (v) => {
  const cost = p(v, "cost", 24000), incent = p(v, "inc", 30) / 100, kw = need(p(v, "kw", 8), "Enter size."), y = p(v, "y", 1300), deg = p(v, "d", 0.5) / 100, life = Math.max(1, Math.round(p(v, "l", 25))), om = p(v, "om", 150), rate = p(v, "r", 5) / 100;
  let pvE = 0, pvC = cost * (1 - incent);
  for (let t = 1; t <= life; t++) { const df = Math.pow(1 + rate, -t); pvE += kw * y * Math.pow(1 - deg, t - 1) * df; pvC += om * df; }
  return { lcoe: `${$(pvC / pvE, 3)} per kWh`, net: `${$(cost * (1 - incent), 0)} net cost after ${(incent * 100).toFixed(0)}% incentive`, life: `${nfmt(kw * y * life * (1 - (deg * life) / 2))} kWh produced over ${life} years` };
};
export const windPower: Calc = (v) => {
  const d = need(p(v, "d", 10), "Enter rotor diameter."), ws = need(p(v, "v", 6), "Enter wind speed."), cp = Math.min(0.593, p(v, "cp", 35) / 100), rho = p(v, "rho", 1.225);
  const P = 0.5 * rho * Math.PI * (d / 2) ** 2 * ws ** 3 * cp;
  return { kw: `${(P / 1000).toFixed(2)} kW at ${ws} m/s`, year: `${nfmt((P * 1.91 * 8760) / 1000)} kWh a year if ${ws} m/s is the site average (Rayleigh wind distribution)`, note: `Betz limit caps Cp at 59.3%; power rises with wind speed cubed` };
};
export const hydroPower: Calc = (v) => {
  const head = need(p(v, "h", 20), "Enter head."), q = need(p(v, "q", 50), "Enter flow."), eff = p(v, "e", 70) / 100, unit = pick(v.u, 2);
  const qm = unit === 0 ? q / 1000 : q * 0.0000630902, hm = unit === 0 ? head : head * 0.3048;
  const w = 1000 * 9.81 * qm * hm * eff;
  return { kw: `${(w / 1000).toFixed(2)} kW`, kwh: `${nfmt((w * 24) / 1000)} kWh a day`, note: `${unit === 0 ? `${q} L/s` : `${q} gpm`} at ${unit === 0 ? `${head} m` : `${head} ft`} head, ${(eff * 100).toFixed(0)}% efficient` };
};
export const HYDRO_U = ["Metric (m, L/s)", "US (ft, gpm)"];
export const gensetFuel: Calc = (v) => {
  const kw = need(p(v, "kw", 100), "Enter generator rating."), load = Math.min(1, p(v, "load", 75) / 100), hrs = p(v, "h", 8), price = p(v, "pr", 4);
  const gph = kw * (0.011 + 0.065 * load) * 1.0;
  return { gph: `${gph.toFixed(2)} gal/hour at ${(load * 100).toFixed(0)}% load`, day: `${(gph * hrs).toFixed(1)} gallons (${$(gph * hrs * price)}) for ${hrs} h`, rate: `${(gph / (kw * load)).toFixed(3)} gal per kWh` };
};
export const threePhaseAmps: Calc = (v) => {
  const kw = need(p(v, "kw", 50), "Enter power."), volts = need(p(v, "v", 480), "Enter line voltage."), pf = Math.min(1, Math.max(0.1, p(v, "pf", 0.9))), mode = pick(v.m, 2);
  const amps = mode === 0 ? (kw * 1000) / (Math.sqrt(3) * volts * pf) : (kw * 1000) / (Math.sqrt(3) * volts);
  return { amps: `${amps.toFixed(1)} A per phase`, kva: `${mode === 0 ? (kw / pf).toFixed(1) : kw.toFixed(1)} kVA`, breaker: `${Math.ceil((amps * 1.25) / 5) * 5} A minimum breaker (125% continuous)` };
};
export const PWR_U = ["kW (real power)", "kVA (apparent)"];
export const motorFla: Calc = (v) => {
  const hp = need(p(v, "hp", 25), "Enter horsepower."), volts = need(p(v, "v", 460), "Enter voltage."), ph = pick(v.ph, 2), eff = Math.max(0.5, p(v, "e", 91) / 100), pf = Math.max(0.5, p(v, "pf", 0.85));
  const amps = ph === 1 ? (hp * 746) / (Math.sqrt(3) * volts * eff * pf) : (hp * 746) / (volts * eff * pf);
  return { amps: `${amps.toFixed(1)} A full-load current`, wire: `Conductors ≥ ${(amps * 1.25).toFixed(1)} A (125%)`, note: "For sizing per NEC use the tables (430.248/430.250), not the nameplate" };
};
export const PHASE = ["Single-phase", "Three-phase"];
export const capBank: Calc = (v) => {
  const kw = need(p(v, "kw", 400), "Enter load."), pf1 = Math.min(0.999, Math.max(0.3, p(v, "pf1", 0.78))), pf2 = Math.min(0.999, Math.max(pf1, p(v, "pf2", 0.95)));
  const kvar = kw * (Math.tan(Math.acos(pf1)) - Math.tan(Math.acos(pf2)));
  return { kvar: `${kvar.toFixed(1)} kVAR of capacitors`, kva: `${(kw / pf1).toFixed(0)} kVA → ${(kw / pf2).toFixed(0)} kVA`, note: `Reduces current by ${((1 - pf1 / pf2) * 100).toFixed(1)}%` };
};
export const demandCharge: Calc = (v) => {
  const kw = p(v, "kw", 250), rate = p(v, "r", 15), kwh = p(v, "kwh", 60000), er = p(v, "er", 0.09);
  const d = kw * rate, e = kwh * er, lf = kwh / (kw * 730);
  return { demand: `${$(d, 0)} demand charge`, total: `${$(d + e, 0)} total bill (${((100 * d) / (d + e)).toFixed(0)}% from demand)`, lf: `Load factor ${(lf * 100).toFixed(0)}% — ${lf < 0.4 ? "peaky usage; demand management pays off" : "fairly flat usage"}` };
};
export const peakShave: Calc = (v) => {
  const peak = p(v, "pk", 300), target = p(v, "t", 240), rate = p(v, "r", 15), hrs = need(p(v, "h", 2), "Enter peak duration."), cost = p(v, "c", 600);
  const cut = Math.max(0, peak - target), save = cut * rate * 12, battery = cut * hrs * 1.1;
  return { save: `${$(save, 0)} a year`, battery: `${battery.toFixed(0)} kWh battery (${cut} kW for ${hrs} h + 10%)`, payback: `${((battery * cost) / Math.max(save, 1)).toFixed(1)}-year payback at ${$(cost, 0)}/kWh installed` };
};
export const touSavings: Calc = (v) => {
  const kwh = p(v, "kwh", 900), peakShare = p(v, "ps", 35) / 100, shift = p(v, "sh", 50) / 100, peak = p(v, "pk", 0.38), off = p(v, "op", 0.14), flat = p(v, "fl", 0.2);
  const tou = kwh * (peakShare * (1 - shift) * peak + (1 - peakShare * (1 - shift)) * off), fl = kwh * flat;
  return { save: `${$(fl - tou)} a month vs flat rate`, tou: `${$(tou)} on time-of-use`, flat: `${$(fl)} on flat rate`, note: `Shifting ${(shift * 100).toFixed(0)}% of peak use to off-peak` };
};
export const evStation: Calc = (v) => {
  const ports = p(v, "n", 4), kw = p(v, "kw", 7.2), util = p(v, "u", 15) / 100, price = p(v, "pr", 0.35), cost = p(v, "c", 0.15), fees = p(v, "f", 10) / 100, capex = p(v, "cap", 40000);
  const kwh = ports * kw * 8760 * util, profit = kwh * (price * (1 - fees) - cost);
  return { profit: `${$(profit, 0)} a year`, kwh: `${nfmt(kwh)} kWh sold`, payback: profit > 0 ? `${(capex / profit).toFixed(1)}-year payback on ${$(capex, 0)}` : "Not profitable at these rates" };
};
export const fleetCharging: Calc = (v) => {
  const n = p(v, "n", 20), miles = p(v, "mi", 120), eff = p(v, "e", 0.45), window = need(p(v, "w", 8), "Enter charging window."), loss = p(v, "l", 10) / 100;
  const kwh = (n * miles * eff) / (1 - loss), kwPeak = kwh / window;
  return { kwh: `${nfmt(kwh)} kWh a night`, kw: `${kwPeak.toFixed(0)} kW average load over ${window} h`, chargers: `${Math.ceil((miles * eff) / (1 - loss) / window / 19.2)} kW per vehicle minimum → Level 2 ${(kwPeak / n) <= 19.2 ? "is enough" : "is too slow; DC fast charging needed"}` };
};
export const batteryPayback: Calc = (v) => {
  const cost = p(v, "c", 15000), incent = p(v, "i", 30) / 100, kwh = p(v, "k", 13.5), cycles = p(v, "cy", 300), spread = p(v, "s", 0.2), eff = p(v, "e", 90) / 100, backup = p(v, "b", 0);
  const save = kwh * cycles * spread * eff + backup;
  return { payback: save > 0 ? `${((cost * (1 - incent)) / save).toFixed(1)} years` : "No savings", save: `${$(save, 0)} a year`, net: `${$(cost * (1 - incent), 0)} after incentives` };
};
export const carbonCredit: Calc = (v) => {
  const t = p(v, "t", 500), price = p(v, "p", 15), fees = p(v, "f", 20) / 100, buffer = p(v, "b", 10) / 100;
  const sell = t * (1 - buffer);
  return { value: `${$(sell * price * (1 - fees), 0)} net to you`, credits: `${nfmt(sell)} credits after ${(buffer * 100).toFixed(0)}% buffer pool`, gross: `${$(sell * price, 0)} gross at ${$(price)}/tCO₂e` };
};
export const heatingOil: Calc = (v) => {
  const hdd = p(v, "hdd", 5500), ft2 = p(v, "a", 2000), btuPerSf = p(v, "k", 7), eff = Math.max(0.3, p(v, "e", 82) / 100), price = p(v, "p", 3.9);
  const gal = (hdd * ft2 * btuPerSf) / (138500 * eff);
  return { gal: `${nfmt(gal)} gallons a year`, cost: `${$(gal * price, 0)} a year`, day: `${(gal / 180).toFixed(1)} gallons a day in a typical winter day` };
};
export const boilerHp: Calc = (v) => {
  const lb = p(v, "lb", 3450), mode = pick(v.m, 2), btu = p(v, "btu", 1e6);
  const bhp = mode === 0 ? lb / 34.5 : btu / 33475;
  return { bhp: `${bhp.toFixed(1)} boiler horsepower`, btu: `${nfmt(bhp * 33475)} BTU/h output`, steam: `${nfmt(bhp * 34.5)} lb/h steam from and at 212 °F` };
};
export const BHP_MODE = ["From steam output (lb/h)", "From heat output (BTU/h)"];
export const airLeak: Calc = (v) => {
  const d = need(p(v, "d", 0.125), "Enter leak diameter."), psi = need(p(v, "psi", 100), "Enter pressure."), n = p(v, "n", 10), hrs = p(v, "h", 6000), kwPerCfm = p(v, "k", 0.2), price = p(v, "pr", 0.12);
  const cfm = 26 * (d / 0.125) ** 2 * ((psi + 14.7) / 114.7);
  const kw = cfm * n * kwPerCfm;
  return { cost: `${$(kw * hrs * price, 0)} a year`, cfm: `${(cfm * n).toFixed(1)} cfm wasted (${cfm.toFixed(2)} per leak)`, kw: `${kw.toFixed(1)} kW of compressor power` };
};
export const ledRetrofit: Calc = (v) => {
  const n = p(v, "n", 200), w1 = p(v, "w1", 112), w2 = p(v, "w2", 40), hrs = p(v, "h", 4000), price = p(v, "pr", 0.12), cost = p(v, "c", 90), rebate = p(v, "rb", 20);
  const save = (n * (w1 - w2) * hrs * price) / 1000;
  return { save: `${$(save, 0)} a year`, payback: `${((n * (cost - rebate)) / Math.max(save, 1)).toFixed(1)}-year payback`, kwh: `${nfmt((n * (w1 - w2) * hrs) / 1000)} kWh saved a year` };
};
export const groundRod: Calc = (v) => {
  const rho = need(p(v, "rho", 100), "Enter soil resistivity."), L = need(p(v, "l", 2.4), "Enter rod length."), dmm = need(p(v, "d", 16), "Enter rod diameter."), n = Math.max(1, Math.round(p(v, "n", 1)));
  const a = dmm / 2000, R1 = (rho / (2 * Math.PI * L)) * (Math.log((4 * L) / a) - 1), Rn = n === 1 ? R1 : (R1 / n) * 1.2;
  return { r: `${Rn.toFixed(1)} Ω`, single: `${R1.toFixed(1)} Ω per rod`, nec: Rn <= 25 ? "Meets the NEC 25 Ω single-rod rule" : "Over 25 Ω — NEC requires a supplemental electrode" };
};
export const trayFill: Calc = (v) => {
  const w = need(p(v, "w", 24), "Enter tray width."), d = need(p(v, "dp", 4), "Enter tray depth."), n = p(v, "n", 30), od = p(v, "od", 1.1), fill = p(v, "f", 40) / 100;
  const used = n * Math.PI * (od / 2) ** 2, avail = w * d * fill;
  return { pct: `${((100 * used) / (w * d)).toFixed(1)}% of tray area used`, ok: used <= avail ? `Within the ${(fill * 100).toFixed(0)}% fill limit` : "Over the fill limit — use a wider tray", more: `${Math.max(0, Math.floor((avail - used) / (Math.PI * (od / 2) ** 2)))} more cables fit` };
};
export const solarLease: Calc = (v) => {
  const acres = p(v, "a", 100), rent = p(v, "r", 1000), esc = p(v, "e", 2) / 100, years = Math.max(1, Math.round(p(v, "y", 30))), prior = p(v, "pr", 150);
  let total = 0; for (let t = 0; t < years; t++) total += acres * rent * Math.pow(1 + esc, t);
  return { total: `${$(total, 0)} over ${years} years`, first: `${$(acres * rent, 0)} in year 1`, vs: `${$(acres * prior * years, 0)} from farming at ${$(prior, 0)}/acre` };
};
export const microVsString: Calc = (v) => {
  const kw = need(p(v, "kw", 8), "Enter system size."), str = p(v, "s", 0.15), micro = p(v, "m", 0.35), y = p(v, "y", 1300), shade = p(v, "sh", 10) / 100, rate = p(v, "r", 0.16), years = p(v, "yr", 25);
  const extra = (micro - str) * kw * 1000, gain = kw * y * shade * 0.6 * rate * years;
  return { cost: `Microinverters cost ${$(extra, 0)} more`, gain: `${$(gain, 0)} extra energy value over ${years} years with ${(shade * 100).toFixed(0)}% shading`, verdict: gain > extra ? "Microinverters pay off" : "A string inverter is cheaper overall" };
};

// ---- registry (generated)
export const ideaBiz2CustomCalculators: Record<string, Calc> = {
  "solar-panel-tilt-angle-calculator": solarTilt,
  "solar-array-size-needed-calculator": arraySize,
  "solar-battery-bank-size-calculator": batteryBank,
  "solar-charge-controller-size-calculator": chargeController,
  "solar-panel-shading-loss-calculator": shadingLoss,
  "solar-net-metering-savings-calculator": netMetering,
  "solar-levelized-cost-of-energy-calculator": lcoe,
  "wind-turbine-power-output-calculator": windPower,
  "hydro-turbine-head-flow-power-calculator": hydroPower,
  "diesel-generator-fuel-consumption-calculator": gensetFuel,
  "three-phase-amps-calculator": threePhaseAmps,
  "motor-full-load-current-calculator": motorFla,
  "capacitor-bank-kvar-calculator": capBank,
  "demand-charge-cost-calculator": demandCharge,
  "peak-demand-shaving-savings-calculator": peakShave,
  "time-of-use-rate-savings-calculator": touSavings,
  "ev-charging-station-revenue-calculator": evStation,
  "fleet-ev-charging-load-calculator": fleetCharging,
  "battery-storage-payback-calculator": batteryPayback,
  "carbon-credit-value-calculator": carbonCredit,
  "heating-oil-usage-calculator": heatingOil,
  "steam-boiler-horsepower-calculator": boilerHp,
  "compressed-air-leak-cost-calculator": airLeak,
  "led-retrofit-savings-commercial-calculator": ledRetrofit,
  "grounding-electrode-resistance-calculator": groundRod,
  "cable-tray-fill-calculator": trayFill,
  "solar-farm-land-lease-income-calculator": solarLease,
  "microinverter-vs-string-inverter-calculator": microVsString,
};
