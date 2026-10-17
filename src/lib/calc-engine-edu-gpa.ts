/**
 * Batch: "Jobs & Education Calculators" → GPA Calculators (21 tools).
 *
 * Course rows arrive as grade{i} (index into LETTERS: A+ … F), credits{i}
 * and, depending on the tool, type{i} (course level / science category) or
 * retake{i}. Each tool maps letters through its own scale:
 *  - gpa: standard 4.0 scale with prior cumulative GPA (covers "college GPA").
 *  - universityGpa: the school hub — scale preset (A- = 3.7, thirds, 4.3 A+,
 *    no +/-) and grade replacement for retaken courses; covers the
 *    school-specific GPA keywords.
 *  - weightedGpa / dualEnrollmentGpa / brightFuturesGpa: high-school level
 *    bonuses (honors, AP/IB, dual enrollment; Bright Futures' 0.5 weights and
 *    award tests).
 *  - scienceGpa, gradSchoolGpa, nursingGpa: subsets of a transcript.
 *  - lsacGpa (A+ = 4.33), and the centralized application services —
 *    AMCAS, AACOMAS, CASPA, PTCAS (thirds), VMCAS, NursingCAS, TMDSAS (no
 *    +/-) — each grouping courses into its own science / BCPM categories.
 *  - wesGpa: foreign marks → US 4.0 grades by country system.
 *  - gedToGpa, elementaryGpa: score / percentage → GPA conversions.
 *  - ucGpa / csuGpa: semester-grade counts with UC's capped honors rule and
 *    CSU's 8-semester honors cap.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-gpa-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

const ROWS = 8;
// Index order: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F
const SCALES: Record<string, number[]> = {
  std: [4, 4, 3.7, 3.3, 3, 2.7, 2.3, 2, 1.7, 1.3, 1, 0.7, 0],
  thirds: [4, 4, 3.67, 3.33, 3, 2.67, 2.33, 2, 1.67, 1.33, 1, 0.67, 0],
  a43: [4.3, 4, 3.7, 3.3, 3, 2.7, 2.3, 2, 1.7, 1.3, 1, 0.7, 0],
  lsac: [4.33, 4, 3.67, 3.33, 3, 2.67, 2.33, 2, 1.67, 1.33, 1, 0.67, 0],
  nopm: [4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 0],
};
const SCALE_BY_INDEX = [SCALES.std, SCALES.thirds, SCALES.a43, SCALES.nopm];

const pts = (scale: number[], g: number) => scale[Math.min(12, Math.max(0, Math.round(safeNumber(g))))] ?? 0;
const avg = (q: number, c: number) => (c > 0 ? Math.round((q / c) * 100) / 100 : 0);
const gpa3 = (q: number, c: number) => (c > 0 ? Math.round((q / c) * 1000) / 1000 : 0);

interface Row {
  points: number;
  credits: number;
  type: number;
  retake: number;
}

function rows(v: Record<string, number>, scale: number[], defaultCredits = 3): Row[] {
  const out: Row[] = [];
  for (let i = 1; i <= ROWS; i++) {
    const credits = nonNeg(v[`credits${i}`], defaultCredits);
    if (credits <= 0 || !Number.isFinite(v[`grade${i}`])) continue;
    out.push({ points: pts(scale, v[`grade${i}`]), credits, type: Math.round(nonNeg(v[`type${i}`])), retake: Math.round(safeNumber(v[`retake${i}`], -1)) });
  }
  return out;
}

const sum = (rs: Row[], f: (r: Row) => number) => rs.reduce((s, r) => s + f(r), 0);

function cumulative(v: Record<string, number>, q: number, c: number) {
  const pc = nonNeg(v.priorCredits);
  const pq = nonNeg(v.priorGpa) * pc;
  return { gpa: gpa3(pq + q, pc + c), credits: pc + c, points: pq + q };
}

export const gpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.std);
  const q = sum(rs, (r) => r.points * r.credits);
  const c = sum(rs, (r) => r.credits);
  const cum = cumulative(v, q, c);
  return { termGpa: gpa3(q, c), cumulativeGpa: cum.gpa, termCredits: c, totalCredits: cum.credits, qualityPoints: round2(q) };
};

export const universityGpa: CustomCalculator = (v) => {
  const scale = SCALE_BY_INDEX[Math.min(3, Math.round(nonNeg(v.scale)))] ?? SCALES.std;
  const rs = rows(v, scale);
  const q = sum(rs, (r) => r.points * r.credits);
  const c = sum(rs, (r) => r.credits);
  // Grade replacement: a retaken course removes the old grade's points and credits from the prior record.
  const removedQ = sum(rs.filter((r) => r.retake >= 0), (r) => pts(scale, r.retake) * r.credits);
  const removedC = sum(rs.filter((r) => r.retake >= 0), (r) => r.credits);
  const pc = Math.max(0, nonNeg(v.priorCredits) - removedC);
  const pq = Math.max(0, nonNeg(v.priorGpa) * nonNeg(v.priorCredits) - removedQ);
  return {
    termGpa: gpa3(q, c),
    cumulativeGpa: gpa3(pq + q, pc + c),
    cumulativeWithoutReplacement: gpa3(nonNeg(v.priorGpa) * nonNeg(v.priorCredits) + q, nonNeg(v.priorCredits) + c),
    totalCredits: pc + c,
    qualityPoints: round2(pq + q),
  };
};

/** High-school level bonus by type: 0 regular, 1 honors, 2 AP/IB/AICE, 3 dual enrollment. */
const LEVEL_BONUS = [0, 0.5, 1, 1];

export const weightedGpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.nopm, 1);
  const c = sum(rs, (r) => r.credits);
  const unweighted = sum(rs, (r) => r.points * r.credits);
  const weighted = sum(rs, (r) => (r.points > 0 ? r.points + (LEVEL_BONUS[r.type] ?? 0) : 0) * r.credits);
  const cum = cumulative(v, weighted, c);
  return { weightedGpa: gpa3(weighted, c), unweightedGpa: gpa3(unweighted, c), cumulativeWeightedGpa: cum.gpa, credits: c, advancedCourses: rs.filter((r) => r.type > 0).length };
};

export const dualEnrollmentGpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.std, 1);
  const c = sum(rs, (r) => r.credits);
  const hsWeighted = sum(rs, (r) => (r.points > 0 ? r.points + (LEVEL_BONUS[r.type] ?? 0) : 0) * r.credits);
  const college = rs.filter((r) => r.type === 3);
  const collegeCredits = sum(college, (r) => r.credits * nonNeg(v.collegeCreditsPerCourse, 3));
  const collegeQ = sum(college, (r) => r.points * r.credits * nonNeg(v.collegeCreditsPerCourse, 3));
  return {
    highSchoolWeightedGpa: gpa3(hsWeighted, c),
    highSchoolUnweightedGpa: gpa3(sum(rs, (r) => r.points * r.credits), c),
    collegeTranscriptGpa: gpa3(collegeQ, collegeCredits),
    collegeCreditsEarned: collegeCredits,
    dualEnrollmentCourses: college.length,
  };
};

export const brightFuturesGpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.nopm, 1);
  const c = sum(rs, (r) => r.credits);
  const w = sum(rs, (r) => (r.points > 0 ? r.points + (r.type > 0 ? 0.5 : 0) : 0) * r.credits);
  const bf = gpa3(w, c);
  const sat = nonNeg(v.satScore);
  const act = nonNeg(v.actScore);
  const hours = nonNeg(v.serviceHours);
  return {
    brightFuturesGpa: bf,
    fasEligible: bf >= 3.5 && (sat >= 1330 || act >= 29) && hours >= 100 ? 1 : 0,
    fmsEligible: bf >= 3.0 && (sat >= 1210 || act >= 25) && hours >= 75 ? 1 : 0,
    unweightedGpa: gpa3(sum(rs, (r) => r.points * r.credits), c),
    weightedCourses: rs.filter((r) => r.type > 0).length,
  };
};

export const scienceGpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.std, 4);
  const q = sum(rs, (r) => r.points * r.credits);
  const c = sum(rs, (r) => r.credits);
  const pc = nonNeg(v.priorScienceCredits);
  const total = gpa3(q + nonNeg(v.priorScienceGpa) * pc, c + pc);
  return { scienceGpa: total, gpaOfTheseCourses: gpa3(q, c), scienceCredits: c + pc, scienceQualityPoints: round2(q + nonNeg(v.priorScienceGpa) * pc) };
};

export const gradSchoolGpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.std);
  const q = sum(rs, (r) => r.points * r.credits);
  const c = sum(rs, (r) => r.credits);
  const pc = nonNeg(v.priorCredits);
  const prior = nonNeg(v.priorGpa);
  const fill = Math.min(pc, Math.max(0, 60 - c));
  return {
    lastSixtyCreditGpa: gpa3(q + prior * fill, c + fill),
    overallGpa: gpa3(q + prior * pc, c + pc),
    meetsThreePointZero: gpa3(q + prior * fill, c + fill) >= 3 ? 1 : 0,
    creditsInLastSixty: c + fill,
  };
};

export const nursingGpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.std, 4);
  const q = sum(rs, (r) => r.points * r.credits);
  const c = sum(rs, (r) => r.credits);
  const pre = gpa3(q, c);
  const min = nonNeg(v.programMinimum, 3);
  return {
    prerequisiteGpa: pre,
    meetsProgramMinimum: c > 0 && pre >= min ? 1 : 0,
    pointsAboveMinimum: round2(pre - min),
    prerequisiteCredits: c,
    cumulativeGpa: cumulative(v, q, c).gpa,
  };
};

/** Category per course: 0 biology, 1 chemistry, 2 physics, 3 math, 4 other science, 5 non-science. */
function groupGpa(v: Record<string, number>, scale: number[], include: number[]) {
  const rs = rows(v, scale).filter((r) => include.includes(r.type));
  return { gpa: gpa3(sum(rs, (r) => r.points * r.credits), sum(rs, (r) => r.credits)), credits: sum(rs, (r) => r.credits) };
}

const centralApp = (scale: number[], science: number[], other: number[]): CustomCalculator => (v) => {
  const all = groupGpa(v, scale, [0, 1, 2, 3, 4, 5]);
  const sci = groupGpa(v, scale, science);
  const non = groupGpa(v, scale, other);
  const bcp = groupGpa(v, scale, [0, 1, 2]);
  return { overallGpa: all.gpa, scienceGpa: sci.gpa, nonScienceGpa: non.gpa, bcpGpa: bcp.gpa, scienceCredits: sci.credits, totalCredits: all.credits };
};

// AMCAS & AACOMAS: BCPM (bio, chem, physics, math) vs everything else.
export const amcasGpa = centralApp(SCALES.std, [0, 1, 2, 3], [4, 5]);
export const aacomasGpa = centralApp(SCALES.std, [0, 1, 2, 3], [4, 5]);
// CASPA, VMCAS, NursingCAS: all sciences (incl. other science) vs non-science.
export const caspaGpa = centralApp(SCALES.std, [0, 1, 2, 3, 4], [5]);
export const vmcasGpa = centralApp(SCALES.std, [0, 1, 2, 3, 4], [5]);
export const nursingCasGpa = centralApp(SCALES.std, [0, 1, 2, 3, 4], [5]);
// PTCAS: thirds scale (A- = 3.67).
export const ptcasGpa = centralApp(SCALES.thirds, [0, 1, 2, 4], [3, 5]);
// TMDSAS: no plus/minus — A = 4, B = 3, C = 2, D = 1.
export const tmdsasGpa = centralApp(SCALES.nopm, [0, 1, 2, 3], [4, 5]);

export const lsacGpa: CustomCalculator = (v) => {
  const rs = rows(v, SCALES.lsac);
  const q = sum(rs, (r) => r.points * r.credits);
  const c = sum(rs, (r) => r.credits);
  const cum = cumulative(v, q, c);
  return { lsacGpa: cum.gpa, gpaOfTheseCourses: gpa3(q, c), totalCredits: cum.credits, aPlusCourses: rs.filter((r) => r.points > 4).length };
};

/** Foreign mark → US grade points by system. */
function foreignToUs(system: number, mark: number): number {
  const m = safeNumber(mark);
  switch (system) {
    case 0: // India percentage
      return m >= 60 ? 4 : m >= 50 ? 3 : m >= 40 ? 2 : m >= 35 ? 1 : 0;
    case 1: // Pakistan percentage
      return m >= 70 ? 4 : m >= 60 ? 3.3 : m >= 50 ? 3 : m >= 40 ? 2 : m >= 33 ? 1 : 0;
    case 2: // UK percentage (70+ First)
      return m >= 70 ? 4 : m >= 60 ? 3.3 : m >= 50 ? 3 : m >= 40 ? 2 : 0;
    case 3: // China 100-point
      return m >= 85 ? 4 : m >= 75 ? 3 : m >= 60 ? 2 : 0;
    case 4: // Germany 1.0 (best) – 5.0
      return m <= 1.5 ? 4 : m <= 2.5 ? 3 : m <= 3.5 ? 2 : m <= 4 ? 1 : 0;
    case 5: // 10-point grade points (India CGPA)
      return m >= 8 ? 4 : m >= 7 ? 3.5 : m >= 6 ? 3 : m >= 5 ? 2.5 : m >= 4 ? 2 : 0;
    default: // Nigeria 5-point grade points
      return m >= 4.5 ? 4 : m >= 3.5 ? 3 : m >= 2.4 ? 2 : m >= 1.5 ? 1 : 0;
  }
}

export const wesGpa: CustomCalculator = (v) => {
  const system = Math.round(nonNeg(v.system));
  let q = 0;
  let c = 0;
  let marks = 0;
  for (let i = 1; i <= ROWS; i++) {
    const credits = nonNeg(v[`credits${i}`], 1);
    if (credits <= 0 || !Number.isFinite(v[`mark${i}`])) continue;
    q += foreignToUs(system, v[`mark${i}`]) * credits;
    marks += safeNumber(v[`mark${i}`]) * credits;
    c += credits;
  }
  const us = gpa3(q, c);
  return { usGpa: us, averageMark: c > 0 ? round2(marks / c) : 0, coursesCounted: c, letterEquivalent: us >= 3.5 ? 4 : us >= 2.5 ? 3 : us >= 1.5 ? 2 : us >= 0.5 ? 1 : 0 };
};

export const gedToGpa: CustomCalculator = (v) => {
  const scores = [v.rla, v.math, v.science, v.socialStudies].map((s) => Math.min(200, Math.max(100, nonNeg(s, 100))));
  const mean = scores.reduce((a, b) => a + b, 0) / 4;
  const g = mean < 145 ? 1 + ((mean - 100) / 45) : mean < 165 ? 2 + (mean - 145) / 20 : mean < 175 ? 3 + ((mean - 165) / 10) * 0.5 : 3.5 + ((mean - 175) / 25) * 0.5;
  return {
    estimatedGpa: avg(Math.max(0, g), 1),
    averageScore: round2(mean),
    passedAllSubjects: scores.every((s) => s >= 145) ? 1 : 0,
    collegeReadySubjects: scores.filter((s) => s >= 165).length,
    totalScore: round2(scores.reduce((a, b) => a + b, 0)),
  };
};

function letterIndexFromPercent(p: number): number {
  const cut = [97, 93, 90, 87, 83, 80, 77, 73, 70, 67, 63, 60];
  const i = cut.findIndex((x) => p >= x);
  return i === -1 ? 12 : i;
}

export const elementaryGpa: CustomCalculator = (v) => {
  const marks: number[] = [];
  for (let i = 1; i <= ROWS; i++) if (Number.isFinite(v[`subject${i}`]) && nonNeg(v[`subject${i}`]) > 0) marks.push(Math.min(110, nonNeg(v[`subject${i}`])));
  const mean = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
  const points = marks.map((m) => SCALES.std[letterIndexFromPercent(m)]);
  return {
    gpa: marks.length ? avg(points.reduce((a, b) => a + b, 0), points.length) : 0,
    averagePercent: round2(mean),
    subjectsCounted: marks.length,
  };
};

/** UC / CSU: counts of A–G semester grades in 10th–11th grade. */
function semesterCounts(v: Record<string, number>) {
  const a = nonNeg(v.aGrades);
  const b = nonNeg(v.bGrades);
  const c = nonNeg(v.cGrades);
  const d = nonNeg(v.dGrades);
  const f = nonNeg(v.fGrades);
  return { n: a + b + c + d + f, points: 4 * a + 3 * b + 2 * c + d };
}

export const ucGpa: CustomCalculator = (v) => {
  const { n, points } = semesterCounts(v);
  const h10 = nonNeg(v.honors10th);
  const h11 = nonNeg(v.honors11th);
  // Capped: at most 8 honors semesters, no more than 4 from 10th grade.
  const capped = Math.min(8, Math.min(4, h10) + h11);
  return {
    ucCappedWeightedGpa: n > 0 ? gpa3(points + capped, n) : 0,
    ucFullyWeightedGpa: n > 0 ? gpa3(points + h10 + h11, n) : 0,
    ucUnweightedGpa: n > 0 ? gpa3(points, n) : 0,
    honorsPointsCounted: capped,
    meetsUcMinimum: n > 0 && (points + capped) / n >= 3 ? 1 : 0,
  };
};

export const csuGpa: CustomCalculator = (v) => {
  const { n, points } = semesterCounts(v);
  const honors = Math.min(8, nonNeg(v.honors10th) + nonNeg(v.honors11th));
  const g = n > 0 ? gpa3(points + honors, n) : 0;
  return { csuGpa: g, csuUnweightedGpa: n > 0 ? gpa3(points, n) : 0, honorsPointsCounted: honors, meetsCsuMinimum: g >= 2.5 ? 1 : 0, semesterGrades: n };
};

export const eduGpaCustomCalculators: Record<string, CustomCalculator> = {
  "gpa-calculator": gpa,
  "university-gpa-calculator": universityGpa,
  "weighted-gpa-calculator": weightedGpa,
  "dual-enrollment-gpa-calculator": dualEnrollmentGpa,
  "bright-futures-gpa-calculator": brightFuturesGpa,
  "science-gpa-calculator": scienceGpa,
  "grad-school-gpa-calculator": gradSchoolGpa,
  "nursing-gpa-calculator": nursingGpa,
  "amcas-gpa-calculator": amcasGpa,
  "aacomas-gpa-calculator": aacomasGpa,
  "caspa-gpa-calculator": caspaGpa,
  "vmcas-gpa-calculator": vmcasGpa,
  "nursingcas-gpa-calculator": nursingCasGpa,
  "ptcas-gpa-calculator": ptcasGpa,
  "tmdsas-gpa-calculator": tmdsasGpa,
  "lsac-gpa-calculator": lsacGpa,
  "wes-gpa-calculator": wesGpa,
  "ged-to-gpa-calculator": gedToGpa,
  "elementary-gpa-calculator": elementaryGpa,
  "uc-gpa-calculator": ucGpa,
  "csu-gpa-calculator": csuGpa,
};
