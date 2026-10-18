/**
 * Batch: "Law & Government Calculators" → Immigration & Visa Calculators
 * (34 tools).
 *
 * Dates travel as day numbers (days since 1970-01-01 UTC); the calculator
 * widget converts date fields and "date" results.
 *
 * Data:
 *  - Canada CRS (IRCC Ministerial Instructions grid; job-offer points removed
 *    25 March 2025), FSW 67-point grid, CLB equivalency tables for IELTS
 *    General Training, CELPIP-General and PTE Core; SINP International
 *    Skilled Worker grid (110 points, pass 60); PR residency obligation
 *    (730 days in 5 years, IRPA s.28) and citizenship (1,095 days in 5 years,
 *    pre-PR days at ½ up to 365).
 *  - Australia General Skilled Migration points test (Migration Regulations
 *    Sch. 6D); New Zealand Skilled Migrant Category points pathway from
 *    24 Aug 2026 (median wage NZ$35.00, 6 points); Germany Chancenkarte
 *    (§20a AufenthG, 6 points); Japan Highly Skilled Professional (i)(b)
 *    points table (70 / 80 points).
 *  - Netherlands 30% ruling 2026: salary norm €48,013 (€36,497 under-30
 *    master's), WNT cap €262,000; box 1 2026: 35.75% to €38,883, 37.56% to
 *    €78,426, 49.50% above; 27% from 2027.
 *  - US: substantial presence test (IRC §7701(b)); FEIE 2026 $132,900,
 *    housing base $21,264, cap $39,870 (Rev. Proc. 2025-32); naturalization
 *    (INA 316/319: 5 / 3 years, 30 / 18 months presence, file 90 days early);
 *    I-751 90-day window; CSPA age (INA 203(h)); asylum EAD clock 150 / 180
 *    days; EAD automatic extension (540 days for renewals filed before
 *    30 Oct 2025, none for most filed on or after); OPT 90 / 150 days
 *    unemployment; USCIS fees from Form G-1055 (edition 10/16/26, incl.
 *    FY2027 Pub. L. 119-21 fees); I-864P 2026 (125% of HHS poverty
 *    guidelines); 2026 federal brackets (Rev. Proc. 2025-32) for H-2A tax.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-immig-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const day = (v: number) => Math.round(safeNumber(v));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const DAY_MS = 86400000;
const dateOf = (d: number) => new Date(d * DAY_MS);
export function addMonths(d: number, months: number): number {
  const dt = dateOf(d);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + Math.round(months);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Math.round(Date.UTC(y, m, Math.min(dt.getUTCDate(), last)) / DAY_MS);
}
const addYears = (d: number, y: number) => addMonths(d, y * 12);
const ageOn = (birth: number, on: number) => {
  const b = dateOf(birth);
  const t = dateOf(on);
  let a = t.getUTCFullYear() - b.getUTCFullYear();
  if (t.getUTCMonth() < b.getUTCMonth() || (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate())) a--;
  return a;
};

// --- Language → CLB --------------------------------------------------------------------------------
/** Minimum score for CLB 10, 9, 8, 7, 6, 5, 4 by ability [listening, reading, writing, speaking]. */
export const CLB_TABLES: Record<string, number[][]> = {
  ielts: [[8.5, 8, 7.5, 6, 5.5, 5, 4.5], [8, 7, 6.5, 6, 5, 4, 3.5], [7.5, 7, 6.5, 6, 5.5, 5, 4], [7.5, 7, 6.5, 6, 5.5, 5, 4]],
  pte: [[89, 82, 71, 60, 50, 39, 28], [88, 78, 69, 60, 51, 42, 33], [90, 88, 79, 69, 60, 51, 41], [89, 84, 76, 68, 59, 51, 42]],
};
export function toClb(test: number, ability: number, score: number): number {
  const s = safeNumber(score);
  if (test === 1) return Math.min(12, Math.max(0, Math.floor(s))); // CELPIP level = CLB
  const table = CLB_TABLES[test === 2 ? "pte" : "ielts"][ability];
  for (let i = 0; i < table.length; i++) if (s >= table[i]) return 10 - i;
  return 0;
}
export const clbCalc: CustomCalculator = (v) => {
  const t = pick(v.testType, 3);
  const clbs = [v.listening, v.reading, v.writing, v.speaking].map((s, i) => toClb(t, i, s));
  return {
    overallClb: Math.min(...clbs),
    listeningClb: clbs[0],
    readingClb: clbs[1],
    writingClb: clbs[2],
    speakingClb: clbs[3],
    meetsClb7: Math.min(...clbs) >= 7 ? 1 : 0,
    meetsClb9: Math.min(...clbs) >= 9 ? 1 : 0,
  };
};

// --- Canada CRS --------------------------------------------------------------------------------------
const CRS_AGE_SINGLE = [0, 99, 105, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 105, 99, 94, 88, 83, 77, 72, 66, 61, 55, 50, 39, 28, 17, 6, 0]; // index age-17
const CRS_AGE_SPOUSE = [0, 90, 95, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 35, 25, 15, 5, 0];
/** Education index: 0 < secondary, 1 secondary, 2 one-year, 3 two-year, 4 bachelor's / 3+ yr, 5 two+ credentials, 6 master's / professional, 7 PhD. */
const CRS_EDU = [[0, 30, 90, 98, 120, 128, 135, 150], [0, 28, 84, 91, 112, 119, 126, 140]];
const CRS_SP_EDU = [0, 2, 6, 7, 8, 9, 10, 10];
const lang1 = (clb: number, spouse: boolean) => (clb >= 10 ? (spouse ? 32 : 34) : clb >= 9 ? (spouse ? 29 : 31) : clb >= 8 ? (spouse ? 22 : 23) : clb >= 7 ? (spouse ? 16 : 17) : clb >= 6 ? (spouse ? 8 : 9) : clb >= 4 ? 6 : 0);
const lang2 = (clb: number) => (clb >= 9 ? 6 : clb >= 7 ? 3 : clb >= 5 ? 1 : 0);
const spLang = (clb: number) => (clb >= 9 ? 5 : clb >= 7 ? 3 : clb >= 5 ? 1 : 0);
const CRS_CWE = [[0, 40, 53, 64, 72, 80], [0, 35, 46, 56, 63, 70]];
const CRS_SP_CWE = [0, 5, 7, 8, 9, 10];

export const crs: CustomCalculator = (v) => {
  const spouse = Math.round(safeNumber(v.spouseAccompanying)) === 1;
  const s = spouse ? 1 : 0;
  const age = Math.round(nonNeg(v.age, 29));
  const ageIdx = Math.min(28, Math.max(0, age - 17));
  const agePts = (spouse ? CRS_AGE_SPOUSE : CRS_AGE_SINGLE)[ageIdx];
  const edu = pick(v.education, 8);
  const eduPts = CRS_EDU[s][edu];
  const l1 = [v.firstListening, v.firstReading, v.firstWriting, v.firstSpeaking].map((x) => Math.round(nonNeg(x)));
  const l2 = [v.secondListening, v.secondReading, v.secondWriting, v.secondSpeaking].map((x) => Math.round(nonNeg(x)));
  const l1Pts = l1.reduce((a, c) => a + lang1(c, spouse), 0);
  const l2Pts = Math.min(spouse ? 22 : 24, l2.reduce((a, c) => a + lang2(c), 0));
  const cwe = Math.min(5, Math.round(nonNeg(v.canadianWorkYears)));
  const cwePts = CRS_CWE[s][cwe];
  let spousePts = 0;
  if (spouse) {
    const sl = [v.spouseListening, v.spouseReading, v.spouseWriting, v.spouseSpeaking].map((x) => Math.round(nonNeg(x)));
    spousePts = CRS_SP_EDU[pick(v.spouseEducation, 8)] + Math.min(20, sl.reduce((a, c) => a + spLang(c), 0)) + CRS_SP_CWE[Math.min(5, Math.round(nonNeg(v.spouseCanadianWorkYears)))];
  }
  const core = agePts + eduPts + l1Pts + l2Pts + cwePts;
  // Skill transferability (max 100).
  const minL1 = Math.min(...l1);
  const eduBand = edu >= 5 ? 2 : edu >= 2 ? 1 : 0; // 2 = two+ credentials / master's / PhD, 1 = one post-secondary credential
  const eduLang = eduBand === 0 ? 0 : minL1 >= 9 ? (eduBand === 2 ? 50 : 25) : minL1 >= 7 ? (eduBand === 2 ? 25 : 13) : 0;
  const eduCwe = eduBand === 0 || cwe < 1 ? 0 : cwe >= 2 ? (eduBand === 2 ? 50 : 25) : eduBand === 2 ? 25 : 13;
  const fwe = Math.round(nonNeg(v.foreignWorkYears));
  const fBand = fwe >= 3 ? 2 : fwe >= 1 ? 1 : 0;
  const fweLang = fBand === 0 ? 0 : minL1 >= 9 ? (fBand === 2 ? 50 : 25) : minL1 >= 7 ? (fBand === 2 ? 25 : 13) : 0;
  const fweCwe = fBand === 0 || cwe < 1 ? 0 : cwe >= 2 ? (fBand === 2 ? 50 : 25) : fBand === 2 ? 25 : 13;
  const cert = Math.round(safeNumber(v.certificateOfQualification)) === 1 ? (minL1 >= 7 ? 50 : minL1 >= 5 ? 25 : 0) : 0;
  const transfer = Math.min(100, Math.min(50, eduLang + eduCwe) + Math.min(50, fweLang + fweCwe) + cert);
  // Additional points (max 600).
  const pnp = Math.round(safeNumber(v.provincialNomination)) === 1 ? 600 : 0;
  const study = [0, 15, 30][pick(v.canadianStudy, 3)];
  const sibling = Math.round(safeNumber(v.siblingInCanada)) === 1 ? 15 : 0;
  const fr = [v.frenchListening, v.frenchReading, v.frenchWriting, v.frenchSpeaking].map((x) => Math.round(nonNeg(x)));
  const englishMin = Math.round(safeNumber(v.firstLanguageIsFrench)) === 1 ? Math.min(...l2) : minL1;
  const frenchPts = Math.min(...fr) >= 7 ? (englishMin >= 5 ? 50 : 25) : 0;
  const additional = Math.min(600, pnp + study + sibling + frenchPts);
  return {
    totalCrsScore: core + spousePts + transfer + additional,
    coreHumanCapital: core,
    spouseFactors: spousePts,
    skillTransferability: transfer,
    additionalPoints: additional,
    agePoints: agePts,
    educationPoints: eduPts,
    firstLanguagePoints: l1Pts,
    canadianExperiencePoints: cwePts,
  };
};

export const fsw67: CustomCalculator = (v) => {
  const l1 = [v.listening, v.reading, v.writing, v.speaking].map((x) => Math.round(nonNeg(x)));
  const eligibleLang = Math.min(...l1) >= 7;
  const lang = l1.reduce((a, c) => a + (c >= 9 ? 6 : c >= 8 ? 5 : c >= 7 ? 4 : 0), 0) + (Math.round(safeNumber(v.secondLanguageClb5)) === 1 ? 4 : 0);
  const edu = [0, 5, 15, 19, 21, 22, 23, 25][pick(v.education, 8)];
  const yrs = Math.round(nonNeg(v.workYears));
  const exp = yrs >= 6 ? 15 : yrs >= 4 ? 13 : yrs >= 2 ? 11 : yrs >= 1 ? 9 : 0;
  const age = Math.round(nonNeg(v.age, 30));
  const agePts = age < 18 ? 0 : age <= 35 ? 12 : age <= 46 ? 47 - age : 0;
  const job = Math.round(safeNumber(v.arrangedEmployment)) === 1 ? 10 : 0;
  const adapt = Math.min(
    10,
    (Math.round(safeNumber(v.spouseLanguageClb4)) === 1 ? 5 : 0) +
      (Math.round(safeNumber(v.pastStudyInCanada)) === 1 ? 5 : 0) +
      (Math.round(safeNumber(v.spousePastStudy)) === 1 ? 5 : 0) +
      (Math.round(safeNumber(v.pastWorkInCanada)) === 1 ? 10 : 0) +
      (Math.round(safeNumber(v.spousePastWork)) === 1 ? 5 : 0) +
      (job ? 5 : 0) +
      (Math.round(safeNumber(v.relativeInCanada)) === 1 ? 5 : 0),
  );
  const total = lang + edu + exp + agePts + job + adapt;
  return {
    totalPoints: total,
    passes67: total >= 67 && eligibleLang && yrs >= 1 ? 1 : 0,
    languagePoints: lang,
    educationPoints: edu,
    experiencePoints: exp,
    agePoints: agePts,
    arrangedEmploymentPoints: job,
    adaptabilityPoints: adapt,
  };
};

export const sinp: CustomCalculator = (v) => {
  const edu = [0, 12, 15, 20, 20, 23][pick(v.education, 6)];
  const recent = Math.min(5, Math.round(nonNeg(v.experienceLast5Years)));
  const older = Math.min(5, Math.round(nonNeg(v.experience6To10YearsAgo)));
  const exp = [0, 2, 4, 6, 8, 10][recent] + [0, 0, 2, 3, 4, 5][older];
  const c1 = Math.round(nonNeg(v.firstLanguageClb));
  const c2 = Math.round(nonNeg(v.secondLanguageClb));
  const lang = (c1 >= 8 ? 20 : c1 >= 4 ? 12 + (c1 - 4) * 2 : 0) + (c2 >= 8 ? 10 : c2 >= 4 ? 2 + (c2 - 4) * 2 : 0);
  const age = Math.round(nonNeg(v.age, 30));
  const agePts = age < 18 || age > 50 ? 0 : age <= 21 ? 8 : age <= 34 ? 12 : age <= 45 ? 10 : 8;
  const conn = Math.min(30, (Math.round(safeNumber(v.jobOffer)) === 1 ? 30 : 0) + (Math.round(safeNumber(v.closeRelative)) === 1 ? 20 : 0) + (Math.round(safeNumber(v.pastWorkInSask)) === 1 ? 5 : 0) + (Math.round(safeNumber(v.pastStudyInSask)) === 1 ? 5 : 0));
  const total = edu + exp + lang + agePts + conn;
  return { totalPoints: total, meetsMinimum60: total >= 60 ? 1 : 0, educationPoints: edu, experiencePoints: exp, languagePoints: lang, agePoints: agePts, connectionPoints: conn };
};

export const canadaPrResidency: CustomCalculator = (v) => {
  const pr = day(v.prDate);
  const check = day(v.checkDate);
  const windowStart = Math.max(pr, addYears(check, -5));
  const windowDays = Math.max(0, check - windowStart);
  const absent = Math.min(windowDays, Math.round(nonNeg(v.daysOutsideCanada)) - Math.round(nonNeg(v.daysAbroadWithCitizenSpouse)));
  const present = Math.max(0, windowDays - Math.max(0, absent));
  const remainingWindow = Math.max(0, addYears(pr, 5) - check);
  return {
    daysCounted: present,
    meetsObligation: present >= 730 ? 1 : 0,
    daysStillNeeded: Math.max(0, 730 - present),
    canStillMeetIt: present + remainingWindow >= 730 ? 1 : 0,
    daysYouCanStillBeAway: Math.max(0, present + remainingWindow - 730),
  };
};

export const canadaCitizenship: CustomCalculator = (v) => {
  const asPr = Math.min(1826, Math.round(nonNeg(v.daysAsPermanentResident)));
  const temp = Math.min(365, Math.round(nonNeg(v.daysAsTemporaryResident) / 2));
  const total = asPr + temp;
  const short = Math.max(0, 1095 - total);
  return {
    eligibleDays: total,
    eligible: total >= 1095 ? 1 : 0,
    daysShort: short,
    earliestApplicationDate: day(v.todayDate) + short,
    preprCredit: temp,
  };
};

// --- Australia, NZ, Germany, Japan ------------------------------------------------------------------
export const australiaPoints: CustomCalculator = (v) => {
  const age = Math.round(nonNeg(v.age, 30));
  const agePts = age < 18 || age >= 45 ? 0 : age < 25 ? 25 : age < 33 ? 30 : age < 40 ? 25 : 15;
  const eng = [0, 10, 20][pick(v.englishLevel, 3)];
  const ov = Math.round(nonNeg(v.overseasExperienceYears));
  const au = Math.round(nonNeg(v.australianExperienceYears));
  const ovPts = ov >= 8 ? 15 : ov >= 5 ? 10 : ov >= 3 ? 5 : 0;
  const auPts = au >= 8 ? 20 : au >= 5 ? 15 : au >= 3 ? 10 : au >= 1 ? 5 : 0;
  const empl = Math.min(20, ovPts + auPts);
  const edu = [0, 10, 10, 15, 20][pick(v.education, 5)];
  const flags = [
    [v.specialistEducation, 10], [v.australianStudy, 5], [v.professionalYear, 5], [v.communityLanguage, 5], [v.regionalStudy, 5],
  ].reduce((a, [f, p]) => a + (Math.round(safeNumber(f)) === 1 ? p : 0), 0);
  const partner = [10, 10, 5, 0][pick(v.partnerStatus, 4)];
  const nom = [0, 5, 15][pick(v.visaSubclass, 3)];
  const total = agePts + eng + empl + edu + flags + partner + nom;
  return { totalPoints: total, meetsPassMark65: total >= 65 ? 1 : 0, agePoints: agePts, englishPoints: eng, employmentPoints: empl, educationPoints: edu, otherPoints: flags + partner, nominationPoints: nom };
};

export const NZ_MEDIAN = 35;
export const nzSmc: CustomCalculator = (v) => {
  const median = nonNeg(v.medianWage, NZ_MEDIAN) || NZ_MEDIAN;
  const wage = nonNeg(v.hourlyWage);
  const income = wage >= median * 3 ? 6 : wage >= median * 2 ? 4 : wage >= median * 1.5 ? 3 : 0;
  const qual = [0, 4, 5, 5, 5, 6, 6][pick(v.qualification, 7)];
  const reg = Math.min(6, Math.round(nonNeg(v.registrationPoints)));
  const skillPts = Math.max(income, qual, reg);
  const yrs = nonNeg(v.nzSkilledWorkYears);
  const work = yrs >= 2 ? 3 : yrs >= 1.5 ? 2 : yrs >= 1 ? 1 : 0;
  const total = Math.min(6, skillPts) + work;
  const anzsco45 = Math.round(safeNumber(v.anzscoLevel4or5)) === 1;
  const floor = anzsco45 ? median * 1.5 : median;
  const age = Math.round(nonNeg(v.age, 30));
  return {
    totalPoints: Math.min(9, total),
    meetsSixPoints: total >= 6 ? 1 : 0,
    skillCategoryPoints: Math.min(6, skillPts),
    nzWorkExperiencePoints: work,
    wageFloor: round2(floor),
    meetsWageFloor: wage >= floor ? 1 : 0,
    eligible: total >= 6 && wage >= floor && age <= 55 ? 1 : 0,
    pointsShort: Math.max(0, 6 - total),
  };
};

export const opportunityCard: CustomCalculator = (v) => {
  const full = Math.round(safeNumber(v.fullRecognition)) === 1;
  const rec = Math.round(safeNumber(v.partialRecognition)) === 1 ? 4 : 0;
  const de = [0, 0, 1, 2, 3][pick(v.germanLevel, 5)];
  const yrs = pick(v.experience, 3);
  const exp = [0, 2, 3][yrs];
  const age = Math.round(nonNeg(v.age, 30));
  const agePts = age < 35 ? 2 : age < 40 ? 1 : 0;
  const extras = [v.shortageOccupation, v.englishC1, v.priorStayInGermany, v.spouseQualifies].reduce((a, f) => a + (Math.round(safeNumber(f)) === 1 ? 1 : 0), 0);
  const total = rec + de + exp + agePts + extras;
  const basic = Math.round(safeNumber(v.meetsBasicRequirements, 1)) === 1;
  return {
    totalPoints: total,
    qualifies: full || (basic && total >= 6) ? 1 : 0,
    pointsShort: full ? 0 : Math.max(0, 6 - total),
    recognitionPoints: rec,
    languagePoints: de + (Math.round(safeNumber(v.englishC1)) === 1 ? 1 : 0),
    experiencePoints: exp,
    agePoints: agePts,
  };
};

/** Japan HSP (i)(b) annual salary points by age band [≤29, 30–34, 35–39, 40+] for ¥10m, 9m, 8m, 7m, 6m, 5m, 4m. */
const JP_SALARY: [number, number, number, number, number][] = [
  [1000, 40, 40, 40, 40], [900, 35, 35, 35, 35], [800, 30, 30, 30, 30], [700, 25, 25, 25, 0], [600, 20, 20, 20, 0], [500, 15, 15, 0, 0], [400, 10, 0, 0, 0],
];
export const japanHsp: CustomCalculator = (v) => {
  const age = Math.round(nonNeg(v.age, 30));
  const band = age < 30 ? 1 : age < 35 ? 2 : age < 40 ? 3 : 4;
  const salary = nonNeg(v.annualSalaryManYen);
  const row = JP_SALARY.find((r) => salary >= r[0]);
  const salPts = row ? row[band] : 0;
  const acad = [0, 10, 20, 30][pick(v.academic, 4)] + (Math.round(safeNumber(v.multipleDegrees)) === 1 ? 5 : 0);
  const yrs = Math.round(nonNeg(v.experienceYears));
  const exp = yrs >= 10 ? 20 : yrs >= 7 ? 15 : yrs >= 5 ? 10 : yrs >= 3 ? 5 : 0;
  const agePts = age < 30 ? 15 : age < 35 ? 10 : age < 40 ? 5 : 0;
  const jp = [0, 10, 15][pick(v.japaneseLevel, 3)];
  const bonus = (Math.round(safeNumber(v.japaneseUniversity)) === 1 && jp < 15 ? 10 : 0) + [v.researchAchievements, v.topUniversity, v.innovativeEmployer, v.nationalLicense].reduce((a, f, i) => a + (Math.round(safeNumber(f)) === 1 ? [15, 10, 10, 5][i] : 0), 0);
  const total = salary < 300 ? 0 : salPts + acad + exp + agePts + jp + bonus;
  return {
    totalPoints: total,
    qualifiesHsp70: total >= 70 ? 1 : 0,
    prAfterYears: total >= 80 ? 1 : total >= 70 ? 3 : 10,
    salaryPoints: salPts,
    academicPoints: acad,
    experiencePoints: exp,
    agePoints: agePts,
    bonusPoints: jp + bonus,
  };
};

// --- Saudi, Netherlands -----------------------------------------------------------------------------
export const nitaqat: CustomCalculator = (v) => {
  const full = nonNeg(v.saudisFullWage);
  const low = nonNeg(v.saudisBelowMinimumWage);
  const disabled = nonNeg(v.disabledSaudis);
  const expats = nonNeg(v.expatEmployees);
  const total = full + low + disabled + expats;
  const counted = Math.min(full + low * 0.5 + disabled * 4, total);
  const pct = total > 0 ? (counted / total) * 100 : 0;
  const req = nonNeg(v.requiredPercent, 20);
  const needed = req > 0 && req < 100 ? Math.max(0, Math.ceil(((req / 100) * total - counted) / (1 - req / 100))) : 0;
  return {
    saudizationPercent: round2(pct),
    countedSaudis: round2(counted),
    totalEmployees: total,
    meetsRequired: pct >= req ? 1 : 0,
    additionalSaudisNeeded: needed,
  };
};

export function nlTax(taxable: number) {
  const t = Math.max(0, taxable);
  return Math.min(t, 38883) * 0.3575 + Math.max(0, Math.min(t, 78426) - 38883) * 0.3756 + Math.max(0, t - 78426) * 0.495;
}
export const thirtyPercentRuling: CustomCalculator = (v) => {
  const gross = nonNeg(v.annualGrossSalary);
  const young = Math.round(safeNumber(v.under30WithMasters)) === 1;
  const norm = young ? 36497 : 48013;
  const pct = Math.round(safeNumber(v.rulingYear)) === 1 ? 0.27 : 0.3;
  const capped = Math.min(gross, 262000);
  let allowance = capped * pct;
  if (gross - allowance < norm) allowance = Math.max(0, gross - norm);
  const eligible = gross - allowance >= norm && allowance > 0;
  if (!eligible) allowance = 0;
  const credits = nonNeg(v.taxCredits);
  const taxWith = Math.max(0, nlTax(gross - allowance) - credits);
  const taxWithout = Math.max(0, nlTax(gross) - credits);
  return {
    netSalaryWithRuling: round2(gross - taxWith),
    netSalaryWithoutRuling: round2(gross - taxWithout),
    annualTaxSaving: round2(taxWithout - taxWith),
    taxFreeAllowance: round2(allowance),
    taxableSalary: round2(gross - allowance),
    eligible: eligible ? 1 : 0,
    salaryNorm: norm,
    monthlyNetWithRuling: round2((gross - taxWith) / 12),
  };
};

// --- Days-in-country tools --------------------------------------------------------------------------
// Date inputs always hold a date, so only the first `tripCount` trips are used.
function trips(v: Record<string, number>, n: number) {
  const out: [number, number][] = [];
  const count = Math.min(n, Math.round(nonNeg(v.tripCount, n)));
  for (let i = 1; i <= count; i++) {
    const a = day(v[`entry${i}`]);
    const b = day(v[`exit${i}`]);
    if (a > 0 && b >= a) out.push([a, b]);
  }
  return out;
}
export const schengen: CustomCalculator = (v) => {
  const ref = day(v.referenceDate);
  const stays = new Set<number>();
  for (const [a, b] of trips(v, 6)) for (let d = a; d <= Math.min(b, a + 4000); d++) stays.add(d);
  const used = (end: number, extra: Set<number>) => {
    let c = 0;
    for (let d = end - 179; d <= end; d++) if (stays.has(d) || extra.has(d)) c++;
    return c;
  };
  const usedNow = used(ref, new Set());
  // If you enter on the reference date and stay continuously, the last day before you'd exceed 90.
  const extra = new Set<number>();
  let last = ref - 1;
  for (let d = ref; d < ref + 91; d++) {
    extra.add(d);
    if (used(d, extra) > 90) break;
    last = d;
  }
  return {
    daysUsedInLast180: usedNow,
    daysRemaining: Math.max(0, 90 - usedNow),
    overstay: usedNow > 90 ? 1 : 0,
    latestExitIfEnteringOnDate: last >= ref ? last : 0,
    windowStart: ref - 179,
  };
};

export const substantialPresence: CustomCalculator = (v) => {
  const cur = Math.max(0, nonNeg(v.daysCurrentYear) - nonNeg(v.exemptDaysCurrentYear));
  const p1 = nonNeg(v.daysLastYear);
  const p2 = nonNeg(v.daysTwoYearsAgo);
  const total = cur + p1 / 3 + p2 / 6;
  const meets = cur >= 31 && total >= 183;
  return {
    weightedDays: round2(total),
    meetsSubstantialPresence: meets ? 1 : 0,
    taxStatus: meets ? 1 : 0,
    daysNeededThisYear: Math.max(0, Math.ceil(Math.max(31, 183 - p1 / 3 - p2 / 6) - cur)),
    countedCurrentYearDays: cur,
  };
};

export const feiePhysicalPresence: CustomCalculator = (v) => {
  const abroad = nonNeg(v.fullDaysAbroadIn12Months);
  const qual = Math.min(366, nonNeg(v.qualifyingDaysInTaxYear, 365));
  const income = nonNeg(v.foreignEarnedIncome);
  const meets = abroad >= 330;
  const frac = qual / 365;
  const excl = meets ? Math.min(income, 132900 * frac) : 0;
  const housingCost = Math.min(nonNeg(v.housingExpenses), nonNeg(v.housingCapOverride) || 39870);
  const housing = meets ? Math.max(0, Math.min(housingCost * frac - 21264 * frac, income - excl)) : 0;
  return {
    meetsPhysicalPresenceTest: meets ? 1 : 0,
    incomeExclusion: round2(excl),
    housingExclusion: round2(Math.max(0, housing)),
    totalExcluded: round2(excl + Math.max(0, housing)),
    taxableForeignIncome: round2(Math.max(0, income - excl - Math.max(0, housing))),
    daysShortOf330: Math.max(0, 330 - abroad),
  };
};

export const naturalizationPresence: CustomCalculator = (v) => {
  const ref = day(v.applicationDate);
  const years = Math.round(safeNumber(v.marriedToCitizen)) === 1 ? 3 : 5;
  const start = addYears(ref, -years);
  let outside = 0;
  let longest = 0;
  for (const [dep, ret] of trips(v, 8)) {
    const a = Math.max(dep, start);
    const b = Math.min(ret, ref);
    const len = ret - dep - 1;
    longest = Math.max(longest, len);
    if (b > a) outside += Math.max(0, b - a - 1);
  }
  const required = years === 3 ? 548 : 913;
  const present = ref - start - outside;
  return {
    daysPresent: present,
    daysRequired: required,
    meetsPhysicalPresence: present >= required ? 1 : 0,
    daysOutside: outside,
    longestTripDays: longest,
    continuousResidenceRisk: longest >= 365 ? 2 : longest > 180 ? 1 : 0,
  };
};

export const continuousResidence: CustomCalculator = (v) => {
  let longest = 0;
  let total = 0;
  let over180 = 0;
  for (const [dep, ret] of trips(v, 8)) {
    const len = Math.max(0, ret - dep - 1);
    longest = Math.max(longest, len);
    total += len;
    if (len > 180) over180++;
  }
  return {
    longestTripDays: longest,
    status: longest >= 365 ? 2 : longest > 180 ? 1 : 0,
    tripsOver6Months: over180,
    totalDaysAbroad: total,
  };
};

export const n400: CustomCalculator = (v) => {
  const lpr = day(v.greenCardDate);
  const three = Math.round(safeNumber(v.marriedToCitizen)) === 1;
  const anniv = addYears(lpr, three ? 3 : 5);
  const early = anniv - 90;
  const today = day(v.todayDate);
  const age = v.birthDate ? ageOn(day(v.birthDate), Math.max(today, early)) : 30;
  return {
    earliestFilingDate: early,
    residenceAnniversary: anniv,
    daysUntilYouCanFile: Math.max(0, early - today),
    canFileNow: today >= early && age >= 18 ? 1 : 0,
    physicalPresenceDaysRequired: three ? 548 : 913,
  };
};

export const i751: CustomCalculator = (v) => {
  const res = day(v.conditionalResidenceDate);
  const expires = addYears(res, 2);
  const today = day(v.todayDate);
  return {
    filingWindowOpens: expires - 90,
    cardExpires: expires,
    lastDayToFile: expires - 1,
    daysUntilWindowOpens: Math.max(0, expires - 90 - today),
    extendedStatusUntil: addMonths(expires, 48),
  };
};

export const cspa: CustomCalculator = (v) => {
  const birth = day(v.birthDate);
  const filed = day(v.petitionFiledDate);
  const approved = day(v.petitionApprovedDate);
  const available = day(v.visaAvailableDate);
  const pending = Math.max(0, approved - filed);
  const ageDays = Math.max(0, available - birth) - pending;
  const cspaAge = ageDays / 365.25;
  return {
    cspaAgeYears: round2(cspaAge),
    protectedUnder21: cspaAge < 21 ? 1 : 0,
    pendingDaysSubtracted: pending,
    biologicalAgeAtAvailability: round2(Math.max(0, available - birth) / 365.25),
    seekToAcquireBy: addYears(available, 1),
  };
};

export const visaBulletin: CustomCalculator = (v) => {
  const pd = day(v.priorityDate);
  const cutoff = day(v.currentCutoffDate);
  const today = day(v.todayDate);
  const move = nonNeg(v.cutoffMovementDaysPerYear, 120);
  const gap = Math.max(0, pd - cutoff);
  const years = gap === 0 ? 0 : move > 0 ? gap / move : 99;
  return {
    estimatedCurrentDate: gap === 0 ? today : today + Math.round(Math.min(99, years) * 365),
    yearsToWait: round2(Math.min(99, years)),
    currentNow: gap === 0 ? 1 : 0,
    daysBehindCutoff: gap,
    yearsWaitedSoFar: round2(Math.max(0, today - pd) / 365.25),
  };
};

export const processingTime: CustomCalculator = (v) => {
  const receipt = day(v.receiptDate);
  const today = day(v.todayDate);
  const months = nonNeg(v.processingMonths, 8);
  const done = addMonths(receipt, months);
  const elapsed = Math.max(0, today - receipt);
  const total = Math.max(1, done - receipt);
  return {
    estimatedDecisionDate: done,
    daysElapsed: elapsed,
    daysRemaining: Math.max(0, done - today),
    percentComplete: round2(Math.min(100, (elapsed / total) * 100)),
    outsideNormalProcessing: today > done ? 1 : 0,
  };
};

export const asylumClock: CustomCalculator = (v) => {
  const filed = day(v.asylumFiledDate);
  const today = day(v.todayDate);
  const stopped = Math.round(nonNeg(v.clockStoppedDays));
  const clock = Math.max(0, today - filed - stopped);
  return {
    clockDays: clock,
    canFileEadOn: filed + 150 + stopped,
    eadCanBeGrantedOn: filed + 180 + stopped,
    canFileEadNow: clock >= 150 ? 1 : 0,
    daysUntil150: Math.max(0, 150 - clock),
  };
};

export const eadExtension: CustomCalculator = (v) => {
  const exp = day(v.cardExpirationDate);
  const filed = day(v.renewalFiledDate);
  const ruleCut = Math.round(Date.UTC(2025, 9, 30) / DAY_MS);
  const cat = pick(v.category, 3); // 0 eligible category, 1 TPS (Federal Register extension), 2 not eligible
  const timely = filed <= exp;
  const days = cat === 2 || !timely ? 0 : cat === 1 ? Math.round(nonNeg(v.tpsExtensionDays, 365)) : filed < ruleCut ? 540 : 0;
  return {
    workAuthorizedUntil: days > 0 ? exp + days : exp,
    extensionDays: days,
    autoExtended: days > 0 ? 1 : 0,
    filedBeforeRuleChange: filed < ruleCut ? 1 : 0,
    timelyFiled: timely ? 1 : 0,
  };
};

export const optUnemployment: CustomCalculator = (v) => {
  const stem = Math.round(safeNumber(v.stemExtension)) === 1;
  const allowed = stem ? 150 : 90;
  const used = Math.round(nonNeg(v.daysUnemployedSoFar));
  const today = day(v.todayDate);
  const left = Math.max(0, allowed - used);
  return {
    daysRemaining: left,
    allowedDays: allowed,
    exhaustedOn: Math.round(safeNumber(v.currentlyUnemployed)) === 1 ? today + left : 0,
    overLimit: used > allowed ? 1 : 0,
  };
};

// --- USCIS fees -------------------------------------------------------------------------------------
/** [label, paper, online (0 = paper only), extra non-waivable fee]. Form G-1055 edition 10/16/26. */
export const USCIS_FORMS: [string, number, number, number][] = [
  ["N-400 Naturalization", 760, 710, 0],
  ["N-400 Naturalization — reduced fee (≤400% FPL)", 380, 380, 0],
  ["I-130 Petition for Alien Relative", 675, 625, 0],
  ["I-485 Adjustment of Status", 1440, 0, 0],
  ["I-485 — child under 14 filing with a parent", 950, 0, 0],
  ["I-765 Work Permit (general)", 520, 470, 0],
  ["I-765 with a pending I-485 (filed on/after Apr 1, 2024)", 260, 260, 0],
  ["I-131 Advance Parole / Reentry Permit", 630, 580, 0],
  ["I-751 Remove Conditions", 750, 750, 0],
  ["I-90 Replace Green Card", 465, 415, 0],
  ["I-129F Fiancé(e) Petition", 675, 675, 0],
  ["I-539 Extend / Change Status", 470, 420, 0],
  ["I-140 Immigrant Worker (+ $600 Asylum Program Fee)", 715, 665, 600],
  ["N-600 Certificate of Citizenship", 1385, 1335, 0],
  ["I-526 Immigrant Investor", 11160, 0, 0],
  ["I-589 Asylum (Pub. L. 119-21 fee)", 100, 100, 0],
  ["I-601A Provisional Waiver", 795, 0, 0],
  ["I-864 Affidavit of Support (no USCIS fee)", 0, 0, 0],
];
export const uscisFee: CustomCalculator = (v) => {
  const rows = [v.form1, v.form2, v.form3, v.form4].map((f) => Math.round(safeNumber(f, -1)));
  const online = Math.round(safeNumber(v.fileOnline)) === 1;
  let total = 0;
  let saved = 0;
  for (const r of rows) {
    if (r < 0 || r >= USCIS_FORMS.length) continue;
    const [, paper, web, extra] = USCIS_FORMS[r];
    const fee = online && web ? web : paper;
    total += fee + extra;
    saved += paper - fee;
  }
  const people = Math.max(1, Math.round(nonNeg(v.applicants, 1)));
  return { totalFees: total * people, perApplicant: total, onlineSavings: saved * people, premiumProcessing: Math.round(safeNumber(v.premium)) === 1 ? 2965 : 0, grandTotal: total * people + (Math.round(safeNumber(v.premium)) === 1 ? 2965 : 0) };
};

/** [label, paper, online, Pub. L. 119-21 fee]. */
export const I765_CATS: [string, number, number, number][] = [
  ["General initial / renewal / replacement (e.g. OPT (c)(3), H-4, L-2, (c)(9) without paid I-485)", 520, 470, 0],
  ["Pending I-485 filed with fee on/after Apr 1, 2024", 260, 260, 0],
  ["Pending I-485 filed Jul 30, 2007 – Mar 31, 2024 (fee paid)", 0, 0, 0],
  ["DACA (c)(33)", 520, 470, 0],
  ["Asylum applicant (c)(8) — initial", 0, 0, 570],
  ["Asylum applicant (c)(8) — renewal", 520, 470, 275],
  ["TPS / parolee (c)(11), (c)(19), (a)(12) — initial", 520, 470, 570],
  ["TPS / parolee — renewal", 520, 470, 280],
  ["Refugee, asylee granted, VAWA, T/U and other fee-exempt categories", 0, 0, 0],
];
export const i765Fee: CustomCalculator = (v) => {
  const [, paper, web, hr1] = I765_CATS[pick(v.category, I765_CATS.length)];
  const online = Math.round(safeNumber(v.fileOnline)) === 1;
  const fee = online ? web : paper;
  return { totalFee: fee + hr1, filingFee: fee, publicLawFee: hr1, onlineSavings: paper - fee };
};

export const I131_TYPES: [string, number, number][] = [
  ["Advance parole (pending I-485, I-589 or I-821)", 630, 580],
  ["Reentry permit", 630, 630],
  ["Refugee travel document — age 16+", 165, 165],
  ["Refugee travel document — under 16", 135, 135],
  ["Refugee travel document for a current refugee / refugee-based LPR", 0, 0],
];
export const i131Fee: CustomCalculator = (v) => {
  const [, paper, web] = I131_TYPES[pick(v.documentType, I131_TYPES.length)];
  const fee = Math.round(safeNumber(v.fileOnline)) === 1 ? web : paper;
  const people = Math.max(1, Math.round(nonNeg(v.applicants, 1)));
  return { totalFee: fee * people, feePerApplicant: fee, onlineSavings: (paper - fee) * people };
};

/** [label, paper, online, small employer / nonprofit]. */
export const I129_TYPES: [string, number, number, number][] = [
  ["H-1B / H-1B1", 780, 730, 460],
  ["L-1", 1385, 1335, 695],
  ["O-1 / O-2", 1055, 1005, 530],
  ["E-1, E-2, E-3, TN", 1015, 965, 510],
  ["P or Q", 1015, 965, 510],
  ["H-2A — named workers", 1090, 1040, 545],
  ["H-2A — unnamed workers", 530, 480, 460],
  ["H-2B — named workers", 1080, 1030, 540],
  ["H-2B — unnamed workers", 580, 530, 460],
];
export const i129Fee: CustomCalculator = (v) => {
  const t = pick(v.classification, I129_TYPES.length);
  const [, paper, web, small] = I129_TYPES[t];
  const size = pick(v.employerType, 3); // 0 regular, 1 small employer (≤25 FTE), 2 nonprofit
  const online = Math.round(safeNumber(v.fileOnline)) === 1;
  const base = size === 0 ? (online ? web : paper) : small;
  const asylum = size === 0 ? 600 : size === 1 ? 300 : 0;
  const newEmployment = Math.round(safeNumber(v.initialOrNewEmployer, 1)) === 1;
  const fte = Math.round(nonNeg(v.usEmployees, 30));
  const hl = Math.round(safeNumber(v.over50PercentHL)) === 1 && fte >= 50;
  let fraud = 0;
  let acwia = 0;
  let pl = 0;
  if (t === 0) {
    fraud = newEmployment ? 500 : 0;
    acwia = Math.round(safeNumber(v.acwiaExempt)) === 1 ? 0 : fte >= 26 ? 1500 : 750;
    pl = hl ? 4000 : 0;
  } else if (t === 1) {
    fraud = newEmployment ? 500 : 0;
    pl = hl ? 4500 : 0;
  } else if (t >= 7) fraud = 150;
  const proclamation = t === 0 && Math.round(safeNumber(v.proclamationFeeApplies)) === 1 ? 100000 : 0;
  const premium = Math.round(safeNumber(v.premium)) === 1 ? 2965 : 0;
  const total = base + asylum + fraud + acwia + pl + proclamation + premium;
  return { totalFees: total, filingFee: base, asylumProgramFee: asylum, fraudFee: fraud, acwiaFee: acwia, publicLaw114113Fee: pl, proclamationPayment: proclamation, premiumProcessing: premium };
};

// --- Affidavit of support, wages, taxes -------------------------------------------------------------
export const affidavitOfSupport: CustomCalculator = (v) => {
  const n = Math.max(2, Math.round(nonNeg(v.householdSize, 2)));
  const region = pick(v.region, 3);
  const [base, add] = region === 1 ? [19950, 7100] : region === 2 ? [18360, 6530] : [15960, 5680];
  const guideline = base + add * (n - 1);
  const military = Math.round(safeNumber(v.activeDutySponsoringSpouseOrChild)) === 1;
  const required = guideline * (military ? 1 : 1.25);
  const income = nonNeg(v.sponsorIncome) + nonNeg(v.householdMemberIncome) + nonNeg(v.jointSponsorIncome);
  const divisor = [5, 3, 1][pick(v.relationship, 3)];
  const assetsCounted = nonNeg(v.assets) / divisor;
  const short = Math.max(0, required - income);
  return {
    minimumIncomeRequired: round2(required),
    yourCountedIncome: round2(income),
    meetsRequirement: income + assetsCounted >= required ? 1 : 0,
    incomeShortfall: round2(short),
    assetsNeededToCoverShortfall: round2(short * divisor),
    povertyGuideline: guideline,
  };
};

export const prevailingWage: CustomCalculator = (v) => {
  const wage = nonNeg(v.offeredAnnualWage);
  const levels = [v.level1Wage, v.level2Wage, v.level3Wage, v.level4Wage].map((x) => nonNeg(x));
  let level = 0;
  for (let i = 0; i < 4; i++) if (levels[i] > 0 && wage >= levels[i]) level = i + 1;
  const req = levels[Math.max(0, pick(v.requiredLevel, 4))];
  return {
    wageLevel: level,
    meetsRequiredWage: wage >= req && req > 0 ? 1 : 0,
    shortfallToRequired: round2(Math.max(0, req - wage)),
    lotteryEntries: level,
    hourlyEquivalent: round2(wage / 2080),
  };
};

const BRACKETS_2026: [number, number][] = [[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]];
export function federalTax2026(taxable: number) {
  let tax = 0;
  let prev = 0;
  for (const [cap, r] of BRACKETS_2026) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, cap) - prev) * r;
    prev = cap;
  }
  return tax;
}
export const h2aTax: CustomCalculator = (v) => {
  const wages = nonNeg(v.h2aWages);
  const resident = Math.round(safeNumber(v.taxResidency)) === 1;
  const deduction = resident ? 16100 : nonNeg(v.itemizedDeductions);
  const fed = federalTax2026(Math.max(0, wages - deduction));
  const state = wages * (Math.min(15, nonNeg(v.stateTaxPercent)) / 100);
  const withheld = nonNeg(v.federalWithheld);
  return {
    federalIncomeTax: round2(fed),
    socialSecurityAndMedicare: 0,
    stateIncomeTax: round2(state),
    takeHomePay: round2(wages - fed - state),
    refundOrOwed: round2(withheld - fed),
    ficaSavedVsOtherWorkers: round2(wages * 0.0765),
  };
};
export const h1bTax: CustomCalculator = (v) => {
  const wages = nonNeg(v.annualSalary);
  const resident = Math.round(safeNumber(v.taxResidency, 1)) === 1;
  const married = Math.round(safeNumber(v.marriedFilingJointly)) === 1 && resident;
  const deduction = resident ? (married ? 32200 : 16100) : nonNeg(v.itemizedDeductions);
  const taxable = Math.max(0, wages - deduction - nonNeg(v.pretax401k));
  const fed = married ? 2 * federalTax2026(taxable / 2) : federalTax2026(taxable);
  const ss = Math.min(wages, 184500) * 0.062;
  const med = wages * 0.0145 + Math.max(0, wages - (married ? 250000 : 200000)) * 0.009;
  const state = wages * (Math.min(15, nonNeg(v.stateTaxPercent)) / 100);
  const net = wages - fed - ss - med - state - nonNeg(v.pretax401k);
  return {
    takeHomePay: round2(net),
    monthlyTakeHome: round2(net / 12),
    federalIncomeTax: round2(fed),
    socialSecurity: round2(ss),
    medicare: round2(med),
    stateIncomeTax: round2(state),
    effectiveTaxRatePercent: round2(wages > 0 ? ((fed + ss + med + state) / wages) * 100 : 0),
  };
};

export const lawImmigCustomCalculators: Record<string, CustomCalculator> = {
  "canada-crs-calculator": crs,
  "federal-skilled-worker-points-calculator": fsw67,
  "clb-calculator": clbCalc,
  "sinp-points-calculator": sinp,
  "canada-pr-residency-obligation-calculator": canadaPrResidency,
  "canada-citizenship-calculator": canadaCitizenship,
  "australia-pr-points-calculator": australiaPoints,
  "new-zealand-skilled-migrant-points-calculator": nzSmc,
  "germany-opportunity-card-points-calculator": opportunityCard,
  "japan-permanent-residency-points-calculator": japanHsp,
  "nitaqat-calculator": nitaqat,
  "netherlands-30-percent-ruling-calculator": thirtyPercentRuling,
  "schengen-90-180-calculator": schengen,
  "substantial-presence-test-calculator": substantialPresence,
  "physical-presence-test-calculator": feiePhysicalPresence,
  "naturalization-physical-presence-calculator": naturalizationPresence,
  "continuous-residence-calculator": continuousResidence,
  "citizenship-eligibility-calculator": n400,
  "i-751-filing-date-calculator": i751,
  "cspa-age-calculator": cspa,
  "visa-bulletin-priority-date-calculator": visaBulletin,
  "india-visa-bulletin-priority-date-calculator": visaBulletin,
  "immigration-processing-time-calculator": processingTime,
  "asylum-clock-calculator": asylumClock,
  "ead-automatic-extension-calculator": eadExtension,
  "opt-unemployment-days-calculator": optUnemployment,
  "uscis-fee-calculator": uscisFee,
  "i-765-fee-calculator": i765Fee,
  "i-131-fee-calculator": i131Fee,
  "i-129-fee-calculator": i129Fee,
  "affidavit-of-support-calculator": affidavitOfSupport,
  "h-1b-prevailing-wage-calculator": prevailingWage,
  "h-1b-tax-calculator": h1bTax,
  "h-2a-tax-calculator": h2aTax,
};
