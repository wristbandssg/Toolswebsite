/**
 * Idea build, batch edu2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Jobs & Education > AP/IB (2), Admissions (4), Professional exams (3),
 * International scores (6), School & Classroom (18) = 33 tools.
 * Official rules used: IB Diploma (6 subjects × 7 + TOK/EE matrix up to 3; pass needs ≥ 24 points, no grade 1, no E in TOK/EE, ≤ 2 grade 2s,
 * ≤ 3 grades of 3 or below, HL ≥ 12, SL ≥ 9); GED (145 pass, 165 college-ready, 175 college credit per test); NCEA rank score
 * (best 80 Level 3 credits, Excellence 4, Merit 3, Achieved 2); Abitur N = 17/3 − E/180; CAO Leaving Cert points (H1 100 … H7 37,
 * O1 56 … O6 12, +25 for Higher Maths H6 or better); HKDSE 5** 7 … 1 1 (JUPAS common scale); England school years by age on 31 August;
 * NFPA educational occupant load 20 sq ft net per student; CFA Institute suggests ≥ 300 study hours per level.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dateIn, dayText } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const $0 = (x: number) => money(x, "$", 0);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const today = () => Math.floor(Date.now() / 86400000);

// ---- AP / IB ----
const MATRIX = [[3, 3, 2, 2], [3, 2, 1, 1], [2, 1, 1, 0], [2, 1, 0, 0]];
export const ib: Calc = (v) => {
  const hl = [1, 2, 3].map((i) => Math.min(7, Math.max(1, Math.round(p(v, `h${i}`, [6, 6, 5][i - 1]))))), sl = [1, 2, 3].map((i) => Math.min(7, Math.max(1, Math.round(p(v, `s${i}`, [6, 5, 6][i - 1])))));
  const tok = pick(v.t, 5), ee = pick(v.e, 5), core = tok === 4 || ee === 4 ? -1 : MATRIX[tok][ee], all = [...hl, ...sl], sub = all.reduce((a, b) => a + b, 0);
  const fails: string[] = [];
  if (core < 0) fails.push("E in TOK or EE"); if (all.includes(1)) fails.push("a grade 1"); if (all.filter((x) => x === 2).length > 2) fails.push("more than two 2s"); if (all.filter((x) => x <= 3).length > 3) fails.push("more than three grades of 3 or below");
  if (hl.reduce((a, b) => a + b, 0) < 12) fails.push("HL total under 12"); if (sl.reduce((a, b) => a + b, 0) < 9) fails.push("SL total under 9");
  const tot = sub + Math.max(0, core); if (tot < 24) fails.push("total under 24");
  return { t: `${tot} / 45 IB Diploma points`, how: `Subjects ${sub}/42 (HL ${hl.join("+")}, SL ${sl.join("+")}) + core ${Math.max(0, core)}/3`, pass: fails.length ? `Diploma not awarded: ${fails.join(", ")}` : "Meets the IB Diploma pass conditions" };
};
export const apCredit: Calc = (v) => {
  const n = Math.round(p(v, "n", 5)), pass = p(v, "p", 80) / 100, cr = p(v, "c", 3), cost = p(v, "cc", 450), fee = p(v, "f", 99);
  const earned = Math.round(n * pass) * cr, save = earned * cost - n * fee;
  return { s: `≈ ${$0(save)} saved`, how: `${nfmt(Math.round(n * pass))} of ${n} exams scoring 3+ (${pc(pass, 0)}) × ${nfmt(cr, 0)} credits = ${nfmt(earned, 0)} credits × ${money(cost)}/credit − ${$0(n * fee)} exam fees`, note: "Colleges set their own AP credit rules (some need a 4 or 5, some give placement only) — check each school's AP policy" };
};

// ---- Admissions ----
export const classRank: Calc = (v) => {
  const r = need(p(v, "r", 25), "Enter your rank."), n = need(p(v, "n", 400), "Enter class size.");
  const top = r / n;
  return { p: `Top ${pc(top, 1)} of your class (${nfmt((1 - (r - 1) / n) * 100, 1)}th percentile)`, b: top <= 0.01 ? "Top 1%" : top <= 0.05 ? "Top 5%" : top <= 0.1 ? "Top 10% — Texas automatic admission (UT Austin uses top 6%)" : top <= 0.25 ? "Top quarter" : top <= 0.5 ? "Top half" : "Bottom half", note: "Many high schools no longer report rank; colleges then rely on GPA and course rigor" };
};
export const appFees: Calc = (v) => {
  const n = Math.round(p(v, "n", 10)), f = p(v, "f", 70), css = Math.round(p(v, "c", 4)), sat = Math.round(p(v, "s", 6)), satF = p(v, "sf", 14), free = Math.round(p(v, "fr", 4)), w = Math.round(p(v, "w", 0));
  const cssCost = css > 0 ? 25 + (css - 1) * 16 : 0, sends = Math.max(0, sat - free) * satF, apps = Math.max(0, n - w) * f, tot = apps + cssCost + sends;
  return { t: `${$0(tot)} total application costs`, parts: `Applications ${$0(apps)} (${n - w} × ${money(f)}${w ? `, ${w} waived` : ""}) + CSS Profile ${$0(cssCost)} + score reports ${$0(sends)}`, note: "Fee waivers are available for eligible students (Common App, College Board, NACAC) · CSS Profile: $25 for the first school, $16 each after" };
};
export const superscore: Calc = (v) => {
  const e = [1, 2, 3].map((i) => p(v, `e${i}`, [610, 650, 0][i - 1])).filter((x) => x > 0), m = [1, 2, 3].map((i) => p(v, `m${i}`, [680, 640, 0][i - 1])).filter((x) => x > 0);
  if (!e.length || !m.length) throw new InputError("Enter at least one reading/writing and one math score.");
  const be = Math.max(...e), bm = Math.max(...m), best1 = Math.max(...e.map((x, i) => x + (m[i] ?? 0)));
  return { s: `SAT superscore ${be + bm}`, how: `Best Reading & Writing ${be} + best Math ${bm}`, note: `Your best single sitting was ${best1} · many colleges superscore the SAT, but check each school's policy` };
};
export const waitlist: Calc = (v) => {
  const off = need(p(v, "o", 3000), "Enter students offered a waitlist spot."), acc = p(v, "a", 1800), adm = p(v, "d", 90);
  return { r: `${pc(adm / Math.max(acc, 1), 1)} of students who stayed on the waitlist were admitted`, all: `${pc(adm / off, 1)} of everyone offered a waitlist spot`, note: "Use the school's Common Data Set (section C2) for last year's numbers · rates swing a lot year to year — send a letter of continued interest" };
};

// ---- Professional exams ----
export const cfaHours: Calc = (v) => {
  const hrs = p(v, "h", 300), wk = need(p(v, "w", 15), "Enter study hours per week."), exam = dateIn(v, "d", today() + 180), rev = p(v, "r", 4);
  const weeks = hrs / wk, start = Math.floor(exam - (weeks + rev) * 7);
  return { s: `Start by ${dayText(start)}`, plan: `${nfmt(weeks, 1)} weeks of study at ${nfmt(wk, 0)} h/week + ${nfmt(rev, 0)} weeks of review and mock exams`, note: "CFA Institute suggests at least 300 hours per level; many candidates study 300–400" };
};
export const ged: Calc = (v) => {
  const s = ["m", "r", "sc", "ss"].map((k, i) => p(v, k, [150, 158, 147, 162][i])), names = ["Math", "Reasoning Through Language Arts", "Science", "Social Studies"];
  const passAll = s.every((x) => x >= 145), lvl = (x: number) => (x >= 175 ? "college credit" : x >= 165 ? "college ready" : x >= 145 ? "pass" : "not yet");
  return { r: passAll ? `Passed — total ${nfmt(s.reduce((a, b) => a + b, 0), 0)} (all four tests ≥ 145)` : `Not yet — ${names.filter((_, i) => s[i] < 145).join(", ")} below 145`, tests: names.map((n, i) => `${n} ${s[i]} (${lvl(s[i])})`).join(" · "), note: "Each test scores 100–200: 145 to pass, 165 college-ready, 175 may earn college credit" };
};
export const studyPlan: Calc = (v) => {
  const tot = need(p(v, "t", 120), "Enter total study hours needed."), exam = dateIn(v, "d", today() + 60), days = Math.max(1, exam - today()), off = p(v, "o", 1), buf = p(v, "b", 15) / 100;
  const studyDays = days * ((7 - off) / 7), per = (tot * (1 + buf)) / studyDays;
  return { h: `${nfmt(per, 1)} hours a day`, plan: `${nfmt(studyDays, 0)} study days before ${dayText(exam)} (${nfmt(off, 0)} rest day a week) for ${nfmt(tot, 0)} h + ${pc(buf, 0)} buffer`, note: per > 6 ? "More than ~6 h a day is hard to sustain — start earlier or cut scope" : "Use active recall and practice tests; schedule the last week for review" };
};

// ---- International scores ----
export const nceaRank: Calc = (v) => {
  const e = p(v, "e", 30), m = p(v, "m", 30), a = p(v, "a", 30);
  let left = 80; const ue = Math.min(e, left); left -= ue; const um = Math.min(m, left); left -= um; const ua = Math.min(a, left);
  const rs = ue * 4 + um * 3 + ua * 2;
  return { rs: `Rank score ${rs} / 320`, how: `Best 80 Level 3 credits: ${ue} Excellence × 4 + ${um} Merit × 3 + ${ua} Achieved × 2`, note: "University of Auckland-style rank score (max 24 credits per approved subject, 5 subjects) — other universities use similar methods" };
};
export const abitur: Calc = (v) => {
  const e = Math.min(900, Math.max(300, p(v, "e", 650)));
  const nn = Math.floor((17 / 3 - e / 180) * 10) / 10, g = Math.min(4, Math.max(1, nn));
  return { g: `Abitur grade ${g.toFixed(1)}`, how: `N = 17/3 − ${nfmt(e, 0)}/180 = ${(17 / 3 - e / 180).toFixed(3)} (truncated to one decimal)`, note: "300 points is the minimum pass (4.0); 823+ points gives 1.0" };
};
const LC: [string, number][] = [["H1", 100], ["H2", 88], ["H3", 77], ["H4", 66], ["H5", 56], ["H6", 46], ["H7", 37], ["H8", 0], ["O1", 56], ["O2", 46], ["O3", 37], ["O4", 28], ["O5", 20], ["O6", 12], ["O7", 0], ["O8", 0]];
export const leavingCert: Calc = (v) => {
  const gs = Array.from({ length: 7 }, (_, i) => LC[pick(v[`g${i + 1}`], LC.length)]), hm = pick(v.hm, LC.length);
  const best = [...gs].sort((a, b) => b[1] - a[1]).slice(0, 6), base = best.reduce((s, x) => s + x[1], 0), bonus = hm <= 5 ? 25 : 0;
  return { t: `${base + bonus} CAO points`, how: `Best six: ${best.map((x) => x[0]).join(", ")} = ${base}${bonus ? " + 25 bonus for Higher Maths (H6 or better)" : ""}`, note: "Maximum 625 · the Maths bonus counts only if Maths is in your best six" };
};
export const jeeRank: Calc = (v) => {
  const pct = Math.min(100, p(v, "p", 98.5)), n = need(p(v, "n", 1400000), "Enter candidates.");
  const rank = Math.max(1, Math.round(((100 - pct) / 100) * n));
  return { r: `≈ All India Rank ${nfmt(rank, 0)}`, how: `(100 − ${nfmt(pct, 4)}) ÷ 100 × ${nfmt(n, 0)} candidates`, note: "Estimate only — NTA percentiles are session-normalised; the final CRL also depends on tie-breaks" };
};
export const cbsePct: Calc = (v) => {
  const ms = [1, 2, 3, 4, 5, 6].map((i) => p(v, `m${i}`, [88, 92, 79, 85, 90, 0][i - 1])).filter((x) => x > 0);
  if (ms.length < 5) throw new InputError("Enter at least 5 subject marks.");
  const best = [...ms].sort((a, b) => b - a).slice(0, 5), pct0 = best.reduce((a, b) => a + b, 0) / 5;
  return { p: `${nfmt(pct0, 2)}% (best five)`, all: `All ${ms.length} subjects: ${nfmt(ms.reduce((a, b) => a + b, 0) / ms.length, 2)}%`, note: "CBSE doesn't announce a percentage formula officially; admissions usually use the best five including English — check the institution's rule" };
};
const DSE: [string, number][] = [["5**", 7], ["5*", 6], ["5", 5], ["4", 4], ["3", 3], ["2", 2], ["1", 1], ["U", 0]];
export const hkdse: Calc = (v) => {
  const core = [1, 2, 3, 4].map((i) => DSE[pick(v[`c${i}`], DSE.length)]), el = [1, 2, 3].map((i) => DSE[pick(v[`x${i}`], DSE.length)]);
  const all = [...core, ...el].map((x) => x[1]), best5 = [...all].sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
  const c4x2 = core.reduce((s, x) => s + x[1], 0) + [...el].map((x) => x[1]).sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0);
  const min = core[0][1] >= 3 && core[1][1] >= 3 && core[2][1] >= 2 && core[3][1] >= 2;
  return { b5: `Best 5: ${best5} / 35`, c4: `4C + 2X: ${c4x2} / 42`, note: `${min ? "Meets" : "Doesn't meet"} the 3-3-2-2 core requirement for JUPAS · universities use their own weightings and higher values for 5** (e.g. 8.5)` };
};

// ---- School & classroom ----
export const instrHours: Calc = (v) => {
  const d = need(p(v, "d", 180), "Enter school days."), h = p(v, "h", 6.5), br = p(v, "b", 50) / 60, req = p(v, "r", 1080);
  const hrs = d * (h - br);
  return { h: `${nfmt(hrs, 0)} instructional hours a year`, cmp: req > 0 ? `${hrs >= req ? "Meets" : "Short of"} the ${nfmt(req, 0)}-hour requirement (${hrs >= req ? "+" : "−"}${nfmt(Math.abs(hrs - req), 0)} h)` : "—", note: `${nfmt(h - br, 2)} h a day after ${nfmt(br * 60, 0)} min of lunch and passing time · state minimums vary (often 900–1,080 h or 180 days)` };
};
export const ratio: Calc = (v) => {
  const s = need(p(v, "s", 540), "Enter students."), t = need(p(v, "t", 32), "Enter teachers (FTE)."), tgt = p(v, "g", 15);
  return { r: `${nfmt(s / t, 1)} students per teacher`, need0: tgt > 0 ? `${nfmt(Math.ceil(s / tgt), 0)} teachers needed for a 1:${nfmt(tgt, 0)} ratio (${nfmt(Math.max(0, Math.ceil(s / tgt) - t), 0)} more)` : "—", note: "US public school average is about 15–16 students per teacher; actual class sizes are usually larger" };
};
export const seating: Calc = (v) => {
  const a = need(p(v, "a", 900), "Enter room area (sq ft)."), per = p(v, "p", 20), fixed = p(v, "f", 100);
  const cap = Math.floor((a - fixed) / per);
  return { c: `${cap} students`, how: `(${nfmt(a, 0)} − ${nfmt(fixed, 0)} sq ft of fixed furniture) ÷ ${nfmt(per, 0)} sq ft per student`, note: "NFPA 101 educational occupant load: 20 sq ft net per student in classrooms (50 for shops/labs) · local fire code sets the legal limit" };
};
export const homeschool: Calc = (v) => {
  const h = p(v, "h", 4), d = p(v, "d", 4), w = p(v, "w", 36), req = p(v, "r", 1000), logged = p(v, "l", 300);
  const plan = h * d * w;
  return { p: `${nfmt(plan, 0)} hours planned this year`, left: req > 0 ? `${nfmt(Math.max(0, req - logged), 0)} hours still needed for ${nfmt(req, 0)} (${nfmt(logged, 0)} logged)` : `${nfmt(logged, 0)} hours logged`, note: "Some states set hour requirements (e.g. Missouri 1,000 hours with 600 in core subjects) — many don't; check your state law" };
};
export const fieldTrip: Calc = (v) => {
  const s = need(p(v, "s", 50), "Enter students."), bus = p(v, "b", 600), adm = p(v, "a", 12), ch = Math.round(p(v, "c", 6)), chA = pick(v.ca, 2) === 1, lunch = p(v, "l", 0), sub = p(v, "sp", 0);
  const tot = bus + adm * s + (chA ? adm * ch : 0) + lunch * s - sub;
  return { per: `${money(tot / s)} per student`, tot: `${$0(tot)} total: bus ${$0(bus)}, admission ${$0(adm * s)}${chA ? ` + ${ch} chaperones ${$0(adm * ch)}` : ""}${lunch ? `, lunch ${$0(lunch * s)}` : ""}${sub ? ` − subsidy ${$0(sub)}` : ""}`, note: "A typical guideline is 1 chaperone per 10 students (more for younger children)" };
};
export const busRoute: Calc = (v) => {
  const d = need(p(v, "d", 18), "Enter route distance (mi)."), sp = need(p(v, "s", 22), "Enter average speed (mph)."), st = Math.round(p(v, "n", 20)), dw = p(v, "w", 45), bell = p(v, "b", 8);
  const min = (d / sp) * 60 + (st * dw) / 60;
  const leave = bell - min / 60 - 0.1667;
  const h = Math.floor(leave), mm = Math.round((leave - h) * 60);
  return { t: `${nfmt(min, 0)} minutes route time`, s: `Leave the first stop by about ${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"} for a ${bell} am bell (10 min arrival buffer)`, note: `${nfmt(d, 1)} mi at ${nfmt(sp, 0)} mph + ${st} stops × ${nfmt(dw, 0)} s` };
};
export const semesterWeeks: Calc = (v) => {
  const s = dateIn(v, "s", today()), e = dateIn(v, "e", today() + 112), br = p(v, "b", 1), hol = p(v, "h", 3);
  const days = e - s + 1, wk = days / 7 - br, inst = Math.round(wk * 5 - hol);
  return { w: `${nfmt(wk, 1)} instructional weeks`, d: `≈ ${inst} school days (${dayText(s)} – ${dayText(e)}, minus ${nfmt(br, 0)} break week${br === 1 ? "" : "s"} and ${nfmt(hol, 0)} holidays)`, note: "US semesters are typically 15–16 weeks plus exams" };
};
const START: [string, string][] = [["United States", "Kindergarten at 5 (by a cut-off date, often 1 Sep); compulsory from 5–8 depending on state"], ["United Kingdom (England)", "Reception at 4, Year 1 at 5; compulsory from the term after turning 5"], ["Ireland", "Junior infants at 4–5; compulsory from 6"], ["Canada", "Kindergarten at 4–5; Grade 1 at 6 (by province)"], ["Australia", "Foundation year at about 5 (state cut-offs)"], ["Germany", "Grundschule at 6"], ["France", "Compulsory from 3 (école maternelle); CP at 6"], ["Finland", "Pre-primary at 6, comprehensive school at 7"], ["Japan", "Elementary school at 6 (April start)"], ["China", "Primary school at 6"], ["India", "Class 1 at 6 (NEP 2020)"], ["Singapore", "Primary 1 in the year the child turns 7"], ["Malaysia", "Year 1 in the year the child turns 7"], ["Philippines", "Kindergarten at 5, Grade 1 at 6"]];
export const startAge: Calc = (v) => {
  const c = START[pick(v.c, START.length)];
  return { r: c[1], c: c[0], note: "Typical ages — exact cut-off dates and early-entry rules vary by state or region" };
};
export const ukYear: Calc = (v) => {
  const b = dateIn(v, "b", today() - 365 * 8), now = new Date(today() * 86400000), ay = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const bd = new Date(b * 86400000), cut = Date.UTC(ay, 7, 31) / 86400000; let age = ay - bd.getUTCFullYear(); if (Date.UTC(ay, bd.getUTCMonth(), bd.getUTCDate()) / 86400000 > cut) age -= 1;
  const yr = age - 4, label = yr < 0 ? "Pre-school / nursery" : yr === 0 ? "Reception" : yr <= 13 ? `Year ${yr}` : "Left school (post-18)";
  const stage = yr <= 0 ? "Early years" : yr <= 2 ? "Key Stage 1" : yr <= 6 ? "Key Stage 2" : yr <= 9 ? "Key Stage 3" : yr <= 11 ? "Key Stage 4 (GCSE)" : yr <= 13 ? "Sixth form (A levels)" : "—";
  return { y: `${label} in ${ay}/${String(ay + 1).slice(2)}`, s: stage, note: `Age ${age} on 31 August ${ay} · England & Wales (Scotland uses a 1 March cut-off; Northern Ireland 1 July)` };
};
export const rewardPts: Calc = (v) => {
  const pts = p(v, "p", 340), rate = p(v, "r", 15), lv = [1, 2, 3].map((i) => p(v, `l${i}`, [100, 250, 500][i - 1]));
  const got = lv.filter((x) => pts >= x).length, next = lv.find((x) => pts < x);
  return { r: `${got} reward level${got === 1 ? "" : "s"} unlocked`, n: next ? `${nfmt(next - pts, 0)} points to the next reward (${nfmt(Math.ceil((next - pts) / Math.max(rate, 1)), 0)} days at ${nfmt(rate, 0)} a day)` : "All rewards unlocked", note: "Keep rewards achievable and frequent early on; mix individual and whole-class goals" };
};
export const creditLoad: Calc = (v) => {
  const c = need(p(v, "c", 15), "Enter credits."), sr = p(v, "s", 2), work = p(v, "w", 10);
  const cls = c, study = c * sr, tot = cls + study + work;
  return { s: c >= 12 ? `Full-time (${nfmt(c, 0)} credits)` : c >= 6 ? `Part-time (half-time or more, ${nfmt(c, 0)} credits)` : `Less than half-time (${nfmt(c, 0)} credits)`, w: `≈ ${nfmt(tot, 0)} hours a week: ${nfmt(cls, 0)} in class + ${nfmt(study, 0)} study + ${nfmt(work, 0)} work`, note: tot > 60 ? "Over 60 hours a week is a heavy load — consider fewer credits or work hours" : "15 credits a semester finishes a 120-credit degree in 4 years" };
};
export const studyPerCredit: Calc = (v) => {
  const c = need(p(v, "c", 15), "Enter credit hours."), r = pick(v.r, 3), mult = [2, 2.5, 3][r];
  return { h: `${nfmt(c * mult, 0)} study hours a week`, how: `${nfmt(c, 0)} credits × ${mult} hours of study per credit (${["intro courses", "typical courses", "demanding / STEM courses"][r]})`, note: `Plus ${nfmt(c, 0)} hours in class — about ${nfmt(c * (mult + 1), 0)} hours a week in total` };
};
export const examSchedule: Calc = (v) => {
  const exam = dateIn(v, "d", today() + 21), s = Math.max(1, Math.round(p(v, "s", 4))), h = p(v, "h", 3), rev = p(v, "r", 3);
  const days = Math.max(1, exam - today()), learn = Math.max(1, days - rev), perSub = (learn * h) / s;
  return { p: `${nfmt(perSub, 1)} hours per subject before the review days`, plan: `${learn} learning days × ${nfmt(h, 1)} h, rotating ${s} subjects (≈ ${nfmt(learn / s, 1)} days each, interleaved), then ${nfmt(rev, 0)} days of mixed review before ${dayText(exam)}`, note: "Interleaving subjects and practice testing beats re-reading · sleep well the night before" };
};
export const pomodoro: Calc = (v) => {
  const tot = need(p(v, "t", 180), "Enter total study minutes."), w = p(v, "w", 25), sb = p(v, "s", 5), lb = p(v, "l", 20), every = Math.max(1, Math.round(p(v, "e", 4)));
  const n = Math.ceil(tot / w), longs = Math.floor((n - 1) / every), shorts = n - 1 - longs, clock = n * w + shorts * sb + longs * lb;
  return { n: `${n} pomodoros of ${nfmt(w, 0)} minutes`, t: `${nfmt(clock / 60, 1)} hours on the clock with ${shorts} short (${nfmt(sb, 0)} min) and ${longs} long (${nfmt(lb, 0)} min) breaks`, note: "Classic Pomodoro: 25 min focus, 5 min break, a longer 15–30 min break after every 4" };
};
const LEIT = [1, 2, 4, 8, 16, 32];
export const leitner: Calc = (v) => {
  const s = dateIn(v, "d", today()), cards = Math.round(p(v, "c", 200)), nw = Math.round(p(v, "n", 20));
  const dates = LEIT.map((x) => dayText(s + x).replace(/^\w+, /, "")), daily = nw * LEIT.reduce((a, x) => a + 1 / x, 0);
  return { r: `Review dates: ${dates.join(" · ")}`, d: `≈ ${nfmt(daily + nw, 0)} cards a day once running (${nw} new a day) — ${nfmt(cards / nw, 0)} days to introduce all ${cards} cards`, note: "Leitner-style intervals double after each correct recall (1, 2, 4, 8, 16, 32 days); a wrong answer sends the card back to day 1" };
};
export const lessonPlan: Calc = (v) => {
  const per = need(p(v, "p", 50), "Enter class period (min)."), seg = ["w", "i", "g", "ind", "c"].map((k, i) => p(v, k, [5, 15, 15, 10, 5][i])), tot = seg.reduce((a, b) => a + b, 0);
  return { r: tot <= per ? `${tot} of ${per} minutes planned — ${per - tot} spare` : `${tot} minutes — ${tot - per} over the ${per}-minute period`, parts: `Warm-up ${seg[0]} · instruction ${seg[1]} · guided practice ${seg[2]} · independent ${seg[3]} · closure/exit ticket ${seg[4]}`, note: "Keep direct instruction to about 10–15 minutes before switching activity" };
};
export const subPay: Calc = (v) => {
  const d = p(v, "d", 3), r = p(v, "r", 140), hd = p(v, "h", 1), lt = p(v, "l", 0), ltr = p(v, "lr", 200), tax = p(v, "t", 15) / 100;
  const gross = d * r + hd * r * 0.55 + lt * ltr;
  return { g: `${$0(gross)} gross pay`, net: `≈ ${$0(gross * (1 - tax))} after ${pc(tax, 0)} tax`, note: `${nfmt(d, 0)} full days at ${money(r)}, ${nfmt(hd, 0)} half days at ~55%${lt ? `, ${nfmt(lt, 0)} long-term days at ${money(ltr)}` : ""} · rates vary widely by district` };
};
export const tutoring: Calc = (v) => {
  const rate = need(p(v, "r", 45), "Enter hourly rate."), h = p(v, "h", 15), w = p(v, "w", 40), fee = p(v, "f", 0) / 100, exp = p(v, "e", 1200), tax = p(v, "t", 25) / 100;
  const gross = rate * h * w, net = gross * (1 - fee) - exp, after = net * (1 - tax);
  return { n: `${$0(after)} a year after tax (${$0(after / 12)} a month)`, how: `${$0(gross)} gross (${money(rate)} × ${nfmt(h, 0)} h/week × ${nfmt(w, 0)} weeks) − platform fees ${$0(gross * fee)} − expenses ${$0(exp)}`, note: `Effective ${money(after / Math.max(h * w, 1))} per tutoring hour · self-employed tax (US) adds 15.3% on profit — included in the tax rate you enter` };
};

// ---- registry (generated)
export const ideaEdu2CustomCalculators: Record<string, Calc> = {
  "ib-diploma-points-calculator": ib,
  "ap-credit-college-savings-calculator": apCredit,
  "class-rank-percentile-calculator": classRank,
  "college-application-fee-total-calculator": appFees,
  "superscore-sat-calculator": superscore,
  "college-waitlist-odds-calculator": waitlist,
  "cfa-exam-study-hours-calculator": cfaHours,
  "ged-score-calculator": ged,
  "study-hours-plan-exam-calculator": studyPlan,
  "ncea-rank-score-calculator": nceaRank,
  "abitur-grade-calculator": abitur,
  "leaving-cert-points-calculator": leavingCert,
  "jee-main-percentile-rank-calculator": jeeRank,
  "cbse-percentage-calculator": cbsePct,
  "hkdse-score-calculator": hkdse,
  "instructional-hours-calculator": instrHours,
  "student-teacher-ratio-calculator": ratio,
  "classroom-seating-capacity-calculator": seating,
  "homeschool-hours-log-calculator": homeschool,
  "field-trip-cost-per-student-calculator": fieldTrip,
  "bus-route-time-calculator": busRoute,
  "semester-week-count-calculator": semesterWeeks,
  "school-start-age-by-country-calculator": startAge,
  "year-group-uk-by-birthday-calculator": ukYear,
  "classroom-points-reward-calculator": rewardPts,
  "semester-credit-load-calculator": creditLoad,
  "study-time-per-credit-hour-calculator": studyPerCredit,
  "exam-study-schedule-calculator": examSchedule,
  "pomodoro-study-time-calculator": pomodoro,
  "flashcard-spaced-repetition-calculator": leitner,
  "lesson-plan-time-calculator": lessonPlan,
  "substitute-teacher-pay-calculator": subPay,
  "tutoring-business-income-calculator": tutoring,
};
