/**
 * Idea build, batch cal1 (19 Nov 2026 — site to 10,000 tools): holiday countdowns, date tools and time-zone pair converters.
 * Holiday dates come from fixed calendar rules (e.g. US Thanksgiving = 4th Thursday of November, Memorial Day = last Monday of
 * May, US Mother's Day = 2nd Sunday of May, UK Mothering Sunday = Easter − 21 days, Canadian Thanksgiving = 2nd Monday of October,
 * US Election Day = Tuesday after the first Monday of November). Easter uses the Anonymous Gregorian computus; Orthodox Easter the
 * Julian computus + 13 days (valid 1900–2099). US federal holidays for business days follow 5 U.S.C. 6103 with Saturday → Friday
 * and Sunday → Monday observance. Time zones use the IANA database through the browser/Node Intl API, so daylight saving time
 * is applied automatically for the chosen date.
 * SKIPPED (live): Christmas and Halloween countdowns, days between dates (date-calculator), day of the year, time-zone meeting
 * planner, half/golden birthday, Unix timestamp, Julian date. Not built (dates need lunar/astronomical tables): Diwali, Eid,
 * Chinese New Year, Hanukkah, equinoxes/solstices.
 */

import { type TrvCalculator as Calc, InputError, num, pick, dateIn, dayText, dayNum, dayParts, dayOfWeek } from "./trv-core";
import { txt } from "./sci-math-core";

const today = () => Math.floor(Date.now() / 86400000);
const nth = (y: number, m: number, wd: number, n: number) => { if (n > 0) { const f = dayNum(y, m, 1); return f + ((wd - dayOfWeek(f) + 7) % 7) + (n - 1) * 7; } const l = dayNum(y, m + 1, 1) - 1; return l - ((dayOfWeek(l) - wd + 7) % 7); };
const easter = (y: number) => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return dayNum(y, mo, da); };
const orthodox = (y: number) => { const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7, mo = Math.floor((d + e + 114) / 31), da = ((d + e + 114) % 31) + 1; return dayNum(y, mo, da) + 13; };
const fix = (m: number, d: number) => (y: number) => dayNum(y, m, d);

/** [slug word, name, rule, short note] */
export const HOLIDAYS: [string, string, (y: number) => number, string][] = [
  ["new-years-day", "New Year's Day", fix(1, 1), "January 1"],
  ["valentines-day", "Valentine's Day", fix(2, 14), "February 14"],
  ["st-patricks-day", "St. Patrick's Day", fix(3, 17), "March 17"],
  ["easter", "Easter Sunday", easter, "First Sunday after the ecclesiastical full moon on or after March 21 (Western churches)"],
  ["good-friday", "Good Friday", (y) => easter(y) - 2, "The Friday before Easter Sunday"],
  ["palm-sunday", "Palm Sunday", (y) => easter(y) - 7, "The Sunday before Easter"],
  ["ash-wednesday", "Ash Wednesday", (y) => easter(y) - 46, "46 days before Easter — the start of Lent"],
  ["mardi-gras", "Mardi Gras (Fat Tuesday)", (y) => easter(y) - 47, "The day before Ash Wednesday"],
  ["pentecost", "Pentecost", (y) => easter(y) + 49, "Seventh Sunday after Easter"],
  ["orthodox-easter", "Orthodox Easter", orthodox, "Julian-calendar computus (Eastern Orthodox churches)"],
  ["mothers-day", "Mother's Day (US)", (y) => nth(y, 5, 0, 2), "Second Sunday of May (US, Canada, Australia and many others)"],
  ["mothering-sunday-uk", "Mothering Sunday (UK)", (y) => easter(y) - 21, "Fourth Sunday of Lent, three weeks before Easter"],
  ["fathers-day", "Father's Day", (y) => nth(y, 6, 0, 3), "Third Sunday of June (US, UK, Canada and others)"],
  ["mlk-day", "Martin Luther King Jr. Day", (y) => nth(y, 1, 1, 3), "Third Monday of January"],
  ["presidents-day", "Presidents' Day", (y) => nth(y, 2, 1, 3), "Third Monday of February (Washington's Birthday)"],
  ["memorial-day", "Memorial Day", (y) => nth(y, 5, 1, -1), "Last Monday of May"],
  ["juneteenth", "Juneteenth", fix(6, 19), "June 19"],
  ["fourth-of-july", "Fourth of July", fix(7, 4), "July 4 — US Independence Day"],
  ["labor-day", "Labor Day", (y) => nth(y, 9, 1, 1), "First Monday of September (US and Canada)"],
  ["columbus-day", "Columbus Day / Indigenous Peoples' Day", (y) => nth(y, 10, 1, 2), "Second Monday of October"],
  ["election-day", "US Election Day", (y) => nth(y, 11, 1, 1) + 1, "Tuesday after the first Monday of November (federal elections in even years)"],
  ["veterans-day", "Veterans Day", fix(11, 11), "November 11"],
  ["thanksgiving", "Thanksgiving (US)", (y) => nth(y, 11, 4, 4), "Fourth Thursday of November"],
  ["black-friday", "Black Friday", (y) => nth(y, 11, 4, 4) + 1, "The day after US Thanksgiving"],
  ["cyber-monday", "Cyber Monday", (y) => nth(y, 11, 4, 4) + 4, "The Monday after US Thanksgiving"],
  ["christmas-eve", "Christmas Eve", fix(12, 24), "December 24"],
  ["new-years-eve", "New Year's Eve", fix(12, 31), "December 31"],
  ["groundhog-day", "Groundhog Day", fix(2, 2), "February 2"],
  ["april-fools-day", "April Fools' Day", fix(4, 1), "April 1"],
  ["earth-day", "Earth Day", fix(4, 22), "April 22"],
  ["cinco-de-mayo", "Cinco de Mayo", fix(5, 5), "May 5"],
  ["canada-day", "Canada Day", fix(7, 1), "July 1"],
  ["canadian-thanksgiving", "Thanksgiving (Canada)", (y) => nth(y, 10, 1, 2), "Second Monday of October"],
  ["boxing-day", "Boxing Day", fix(12, 26), "December 26"],
  ["australia-day", "Australia Day", fix(1, 26), "January 26"],
];
const nextOf = (rule: (y: number) => number, from: number) => { const y = dayParts(from).y; let d = rule(y); if (d < from) d = rule(y + 1); return d; };
const left = (n: number) => `${Math.floor(n / 7)} weeks ${n % 7} days · ${(n * 24).toLocaleString("en-US")} hours · ${n} sleep${n === 1 ? "" : "s"}`;
export const holidayCalc = (name: string, rule: (y: number) => number, note: string): Calc => (v) => {
  const from = dateIn(v, "d", today()), d = nextOf(rule, from), n = d - from, y = dayParts(d).y;
  return { r: n === 0 ? `${name} is today — ${dayText(d)}!` : `${n} day${n === 1 ? "" : "s"} until ${name} (${dayText(d)})`, a: n === 0 ? "Enjoy the day" : left(n), t: `${[1, 2, 3].map((k) => `${y + k}: ${dayText(rule(y + k))}`).join(" · ")} · Rule: ${note}` };
};
export const holidayCalcs: Record<string, Calc> = Object.fromEntries(HOLIDAYS.map(([s, n, r, no]) => [`days-until-${s}-calculator`, holidayCalc(n, r, no)]));
export const easterDate: Calc = (v) => { const y = Math.round(num(v.y, dayParts(today()).y)); if (y < 1583 || y > 4099) throw new InputError("Use a year from 1583 to 4099."); const e = easter(y); return { r: `Easter ${y}: ${dayText(e)}`, a: `Good Friday ${dayText(e - 2)} · Ash Wednesday ${dayText(e - 46)} · Pentecost ${dayText(e + 49)}`, t: y >= 1900 && y <= 2099 ? `Orthodox Easter ${dayText(orthodox(y))}` : "Western (Gregorian) Easter; it falls between March 22 and April 25" }; };
export const birthdayCountdown: Calc = (v) => { const b = dateIn(v, "b", dayNum(1990, 6, 15)), from = dateIn(v, "d", today()), bp = dayParts(b); if (b > from) throw new InputError("The birth date must be in the past."); const rule = (y: number) => (bp.m === 2 && bp.d === 29 && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? dayNum(y, 3, 1) : dayNum(y, bp.m, bp.d)), d = nextOf(rule, from), n = d - from, age = dayParts(d).y - bp.y; return { r: n === 0 ? `Happy birthday — you turn ${age} today!` : `${n} day${n === 1 ? "" : "s"} until your birthday (${dayText(d)})`, a: `You'll turn ${age} · ${left(n)}`, t: `Born ${dayText(b)} · ${(from - b).toLocaleString("en-US")} days old today${bp.m === 2 && bp.d === 29 ? " · leap-day birthdays are counted on March 1 in non-leap years" : ""}` }; };

// ---- date tools ----
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: number) => { const wd = (dayOfWeek(d) + 6) % 7, th = d - wd + 3, y = dayParts(th).y, w = Math.floor((th - dayNum(y, 1, 1)) / 7) + 1; return { w, y, mon: d - wd }; };
export const dayOfWeekCalc: Calc = (v) => { const d = dateIn(v, "d", today()), p = dayParts(d), i = iso(d); return { r: `${dayText(d)} is a ${WD[dayOfWeek(d)]}`, a: `Day ${d - dayNum(p.y, 1, 1) + 1} of ${p.y} · ISO week ${i.w} · ${d >= today() ? `${d - today()} days from today` : `${today() - d} days ago`}`, t: "Uses the proleptic Gregorian calendar" }; };
export const isoWeek: Calc = (v) => { const d = dateIn(v, "d", today()), i = iso(d), last = iso(dayNum(i.y, 12, 28)).w; return { r: `Week ${i.w} of ${i.y} (ISO 8601)`, a: `Week runs Monday ${dayText(i.mon)} to Sunday ${dayText(i.mon + 6)} · ${i.y} has ${last} ISO weeks`, t: `ISO weeks start on Monday; week 1 contains the year's first Thursday · US-style week (Sunday start, week 1 contains Jan 1): ${Math.floor((d - dayNum(dayParts(d).y, 1, 1) + dayOfWeek(dayNum(dayParts(d).y, 1, 1))) / 7) + 1}` }; };
const obs = (d: number) => (dayOfWeek(d) === 6 ? d - 1 : dayOfWeek(d) === 0 ? d + 1 : d);
const fedHol = (y: number) => [obs(dayNum(y, 1, 1)), nth(y, 1, 1, 3), nth(y, 2, 1, 3), nth(y, 5, 1, -1), ...(y >= 2021 ? [obs(dayNum(y, 6, 19))] : []), obs(dayNum(y, 7, 4)), nth(y, 9, 1, 1), nth(y, 10, 1, 2), obs(dayNum(y, 11, 11)), nth(y, 11, 4, 4), obs(dayNum(y, 12, 25))];
const holSet = (a: number, b: number) => { const s = new Set<number>(); for (let y = dayParts(a).y - 1; y <= dayParts(b).y + 1; y++) fedHol(y).forEach((x) => s.add(x)); return s; };
const isBiz = (d: number, h: Set<number> | null) => { const w = dayOfWeek(d); return w !== 0 && w !== 6 && !(h && h.has(d)); };
export const bizDays: Calc = (v) => { let a = dateIn(v, "a", today()), b = dateIn(v, "b", today() + 30); const useH = pick(v.h, 2) === 0, incl = pick(v.i, 2) === 0; if (b < a) [a, b] = [b, a]; if (b - a > 36600) throw new InputError("Use a range under 100 years."); const h = useH ? holSet(a, b) : null; let n = 0, wk = 0, hol = 0; for (let d = a; d <= (incl ? b : b - 1); d++) { const w = dayOfWeek(d); if (w === 0 || w === 6) { wk++; continue; } if (h && h.has(d)) { hol++; continue; } n++; } return { r: `${n} business days`, a: `${dayText(a)} → ${dayText(b)} · ${b - a + (incl ? 1 : 0)} calendar days · ${wk} weekend days${useH ? ` · ${hol} US federal holidays` : ""}`, t: `${incl ? "Start and end dates included" : "End date excluded"} · Holidays use the observed date (Saturday → Friday, Sunday → Monday)` }; };
export const addBizDays: Calc = (v) => { const a = dateIn(v, "a", today()), n = Math.round(num(v.n, 10)), useH = pick(v.h, 2) === 0; if (Math.abs(n) > 20000) throw new InputError("Use up to 20,000 business days."); const h = useH ? holSet(a - Math.abs(n) * 2 - 10, a + Math.abs(n) * 2 + 10) : null, s = n < 0 ? -1 : 1; let d = a, k = 0; while (k < Math.abs(n)) { d += s; if (isBiz(d, h)) k++; } return { r: `${dayText(d)}`, a: `${Math.abs(n)} business days ${s > 0 ? "after" : "before"} ${dayText(a)} · ${Math.abs(d - a)} calendar days`, t: useH ? "Skips weekends and US federal holidays (observed dates)" : "Skips weekends only" }; };
export const daysInMonth: Calc = (v) => { const y = Math.round(num(v.y, dayParts(today()).y)), m = pick(v.m, 12) + 1, f = dayNum(y, m, 1), n = dayNum(y, m + 1, 1) - f; let wd = 0; for (let d = f; d < f + n; d++) if (dayOfWeek(d) % 6 !== 0) wd++; return { r: `${MO[m - 1]} ${y} has ${n} days`, a: `${wd} weekdays · ${n - wd} weekend days · starts on ${WD[dayOfWeek(f)]}, ends on ${WD[dayOfWeek(f + n - 1)]}`, t: m === 2 ? (n === 29 ? `${y} is a leap year` : `${y} is not a leap year`) : "30 days: April, June, September, November; February has 28 (29 in leap years); the rest have 31" }; };
export const weekdayCount: Calc = (v) => { let a = dateIn(v, "a", today()), b = dateIn(v, "b", today() + 90); if (b < a) [a, b] = [b, a]; if (b - a > 366000) throw new InputError("Use a range under 1,000 years."); const c = [0, 0, 0, 0, 0, 0, 0]; const full = Math.floor((b - a + 1) / 7); c.fill(full); for (let d = a + full * 7; d <= b; d++) c[dayOfWeek(d)]++; const w = pick(v.w, 7); return { r: `${c[w]} ${WD[w]}s between ${dayText(a)} and ${dayText(b)}`, a: WD.map((n, i) => `${n.slice(0, 3)} ${c[i]}`).join(" · "), t: `${b - a + 1} days in total, both dates included` }; };
export const nthWeekday: Calc = (v) => { const y = Math.round(num(v.y, dayParts(today()).y)), m = pick(v.m, 12) + 1, w = pick(v.w, 7), k = pick(v.n, 6), n = k === 5 ? -1 : k + 1, d = nth(y, m, w, n); if (dayParts(d).m !== m) throw new InputError(`${MO[m - 1]} ${y} doesn't have a 5th ${WD[w]}.`); return { r: dayText(d), a: `${["First", "Second", "Third", "Fourth", "Fifth", "Last"][k]} ${WD[w]} of ${MO[m - 1]} ${y}`, t: `All ${WD[w]}s that month: ${[1, 2, 3, 4, 5].map((i) => nth(y, m, w, i)).filter((x) => dayParts(x).m === m).map((x) => dayParts(x).d).join(", ")}` }; };

// ---- time zones ----
/** key → [IANA zone, label, slug word, title word] */
export const ZONES: Record<string, [string, string, string]> = {
  est: ["America/New_York", "Eastern Time (EST/EDT)", "EST"], cst: ["America/Chicago", "Central Time (CST/CDT)", "CST"], mst: ["America/Denver", "Mountain Time (MST/MDT)", "MST"],
  pst: ["America/Los_Angeles", "Pacific Time (PST/PDT)", "PST"], hst: ["Pacific/Honolulu", "Hawaii Time (HST)", "HST"], utc: ["UTC", "Coordinated Universal Time (UTC)", "UTC"],
  gmt: ["Europe/London", "UK time (GMT/BST)", "GMT"], cet: ["Europe/Paris", "Central European Time (CET/CEST)", "CET"], ist: ["Asia/Kolkata", "India Standard Time (IST)", "IST"],
  pkt: ["Asia/Karachi", "Pakistan Standard Time (PKT)", "PKT"], gst: ["Asia/Dubai", "Gulf Standard Time (GST, Dubai)", "GST"], sgt: ["Asia/Singapore", "Singapore Time (SGT)", "SGT"],
  myt: ["Asia/Kuala_Lumpur", "Malaysia Time (MYT)", "MYT"], pht: ["Asia/Manila", "Philippine Time (PHT)", "PHT"], jst: ["Asia/Tokyo", "Japan Standard Time (JST)", "JST"],
  aest: ["Australia/Sydney", "Sydney time (AEST/AEDT)", "AEST"],
};
export const TZ_PAIRS = "est-pst pst-est est-cst cst-est est-mst mst-est cst-pst pst-cst mst-pst pst-mst est-ist ist-est pst-ist ist-pst cst-ist ist-cst utc-est est-utc utc-pst pst-utc utc-cst cst-utc utc-ist ist-utc gmt-est est-gmt gmt-pst pst-gmt gmt-ist ist-gmt cet-est est-cet cet-ist ist-cet utc-cet cet-utc jst-est est-jst ist-jst jst-ist aest-est est-aest aest-pst pst-aest sgt-est est-sgt myt-est est-myt pkt-est est-pkt pht-est est-pht gst-ist ist-gst gst-est est-gst hst-est est-hst".split(" ");
const off = (tz: string, ms: number) => { const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms)); const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0); return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second")) - ms; };
const toUtc = (tz: string, wall: number) => { let u = wall - off(tz, wall); u = wall - off(tz, u); return u; };
const DST: Record<string, [string, string]> = { gmt: ["GMT", "BST"], cet: ["CET", "CEST"], aest: ["AEST", "AEDT"] };
const abbr = (key: string, ms: number) => { const tz = ZONES[key][0], n = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(ms)).find((x) => x.type === "timeZoneName")?.value ?? ""; if (DST[key]) { const jan = off(tz, Date.UTC(new Date(ms).getUTCFullYear(), 0, 15)), jul = off(tz, Date.UTC(new Date(ms).getUTCFullYear(), 6, 15)), std = Math.min(jan, jul); return DST[key][off(tz, ms) === std ? 0 : 1]; } return n.startsWith("GMT") && key !== "utc" ? ZONES[key][2] : n; };
const fmtIn = (tz: string, ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ms));
const hhmm = (tz: string, ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
const offTxt = (m: number) => `UTC${m < 0 ? "−" : "+"}${Math.floor(Math.abs(m) / 60)}${Math.abs(m) % 60 ? `:${String(Math.abs(m) % 60).padStart(2, "0")}` : ""}`;
const parseTime = (s0: string) => { const s = s0.trim().toLowerCase().replace(/\s+/g, ""); const m = s.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/); if (!m) throw new InputError("Enter a time like 9:30, 21:30 or 9:30 pm."); let h = Number(m[1]); const mi = Number(m[2] ?? 0), ap = m[3]; if (mi > 59 || h > 24 || (ap && (h < 1 || h > 12))) throw new InputError("That isn't a valid time."); if (ap) { if (ap.startsWith("p") && h < 12) h += 12; if (ap.startsWith("a") && h === 12) h = 0; } return h * 60 + mi; };
export const tzCalc = (a: string, b: string): Calc => (v) => {
  const back = pick(v.r, 2) === 1, fk = back ? b : a, tk = back ? a : b, [fz, fl] = ZONES[fk], [tz2, tl] = ZONES[tk], day = dateIn(v, "d", today()), mins = parseTime(txt(v as never, "t") || "9:00");
  const u = toUtc(fz, day * 86400000 + mins * 60000), d = (off(tz2, u) - off(fz, u)) / 60000;
  const tbl = [8 * 60, 12 * 60, 17 * 60, 21 * 60].map((mm) => { const uu = toUtc(fz, day * 86400000 + mm * 60000); return `${hhmm(fz, uu)} → ${hhmm(tz2, uu)}`; }).join(" · ");
  return { r: `${fmtIn(fz, u)} ${abbr(fk, u)} = ${fmtIn(tz2, u)} ${abbr(tk, u)}`, a: `${tl} is ${d === 0 ? "the same as" : `${Math.abs(d) / 60} hour${Math.abs(d) === 60 ? "" : "s"} ${d > 0 ? "ahead of" : "behind"}`} ${fl} on this date · ${offTxt(off(fz, u) / 60000)} → ${offTxt(off(tz2, u) / 60000)}`, t: `${tbl} · daylight saving time applied automatically for the chosen date` };
};
export const tzCalcs: Record<string, Calc> = Object.fromEntries(TZ_PAIRS.map((p) => { const [a, b] = p.split("-"); return [`${a}-to-${b}-converter`, tzCalc(a, b)]; }));

// ---- registry (generated)
export const ideaCal1CustomCalculators: Record<string, Calc> = {
  ...holidayCalcs,
  ...tzCalcs,
  "easter-date-calculator": easterDate,
  "birthday-countdown-calculator": birthdayCountdown,
  "day-of-the-week-calculator": dayOfWeekCalc,
  "iso-week-number-calculator": isoWeek,
  "business-days-calculator": bizDays,
  "add-business-days-calculator": addBizDays,
  "days-in-a-month-calculator": daysInMonth,
  "weekday-count-between-dates-calculator": weekdayCount,
  "nth-weekday-of-month-calculator": nthWeekday,
};
