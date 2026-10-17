/**
 * Batch: "Jobs & Education Calculators" → Grade Calculators (9 tools):
 *
 *  - finalGrade: score needed on the final for a target grade, and the
 *    grade a given final score produces.
 *  - weightedGrade: up to six weighted categories (weights normalized),
 *    covering school-specific course grade calculators (UF, UIUC, Purdue …).
 *  - semesterGrade: two quarters + semester exam with common district splits
 *    (covers Broward, Palm Beach, Howard County and similar), and the exam
 *    score needed for a target.
 *  - teacherGrading: "easy grader" — questions and number wrong → percent,
 *    letter-band points.
 *  - rubricScore: rubric points → straight percentage and a 50–100 adjusted
 *    conversion.
 *  - collegePercentage: CGPA / GPA → percentage by common formulas.
 *  - creditHours: credits left, terms to graduate, full-time check, weekly
 *    study hours.
 *  - uniGrade: UK degree classification from year averages and weights.
 *  - onlineGradebook: points-based "what-if" (Canvas, Schoology, Skyward,
 *    Infinite Campus, Focus).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-edu-grades-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

/** 4.0 points for a percentage on the common 10-point scale with +/-. */
function pointsFor(p: number): number {
  const cut: [number, number][] = [[93, 4], [90, 3.7], [87, 3.3], [83, 3], [80, 2.7], [77, 2.3], [73, 2], [70, 1.7], [67, 1.3], [63, 1], [60, 0.7]];
  return cut.find(([c]) => p >= c)?.[1] ?? 0;
}

export const finalGrade: CustomCalculator = (v) => {
  const current = nonNeg(v.currentGrade);
  const w = Math.min(100, nonNeg(v.finalWeight)) / 100;
  const target = nonNeg(v.targetGrade);
  const needed = w > 0 ? (target - current * (1 - w)) / w : 0;
  const result = current * (1 - w) + nonNeg(v.expectedFinalScore) * w;
  return {
    scoreNeededOnFinal: round2(needed),
    gradeWithExpectedScore: round2(result),
    gradeIfYouGetZero: round2(current * (1 - w)),
    gradeIfYouGet100: round2(current * (1 - w) + 100 * w),
    targetReachable: needed <= 100 ? 1 : 0,
  };
};

export const weightedGrade: CustomCalculator = (v) => {
  let total = 0;
  let weights = 0;
  for (let i = 1; i <= 6; i++) {
    const w = nonNeg(v[`weight${i}`]);
    if (w <= 0) continue;
    total += nonNeg(v[`score${i}`]) * w;
    weights += w;
  }
  const grade = weights > 0 ? total / weights : 0;
  return { weightedGrade: round2(grade), gradePoints: pointsFor(grade), weightsEntered: round2(weights), pointsToNextTen: round2(Math.max(0, Math.ceil((grade + 0.0001) / 10) * 10 - grade)) };
};

// Quarter / exam splits: [each quarter %, exam %].
const SPLITS: [number, number][] = [[40, 20], [37.5, 25], [45, 10], [50, 0]];

export const semesterGrade: CustomCalculator = (v) => {
  const preset = Math.round(nonNeg(v.split));
  const [qw, ew] = preset >= 4 ? [nonNeg(v.quarterWeight), Math.max(0, 100 - 2 * nonNeg(v.quarterWeight))] : SPLITS[preset] ?? SPLITS[0];
  const q = (nonNeg(v.quarter1) * qw + nonNeg(v.quarter2) * qw) / 100;
  const sem = q + (nonNeg(v.examScore) * ew) / 100;
  const needed = ew > 0 ? ((nonNeg(v.targetGrade) - q) * 100) / ew : 0;
  return {
    semesterGrade: round2(sem),
    examScoreNeeded: round2(needed),
    quartersOnly: round2(qw > 0 ? (q * 100) / (2 * qw) : 0),
    examWeight: ew,
    semesterGradePoints: pointsFor(sem),
  };
};

export const teacherGrading: CustomCalculator = (v) => {
  const total = Math.max(1, nonNeg(v.totalQuestions, 1));
  const wrong = Math.min(total, nonNeg(v.numberWrong));
  const correct = total - wrong + nonNeg(v.extraCredit);
  const pct = (correct / total) * 100;
  return { percentScore: round2(pct), numberCorrect: round2(correct), pointsPerQuestion: round2(100 / total), gradePoints: pointsFor(pct) };
};

export const rubricScore: CustomCalculator = (v) => {
  let earned = 0;
  let possible = 0;
  for (let i = 1; i <= 6; i++) {
    const max = nonNeg(v[`max${i}`]);
    if (max <= 0) continue;
    earned += Math.min(max, nonNeg(v[`criterion${i}`]));
    possible += max;
  }
  const straight = possible > 0 ? (earned / possible) * 100 : 0;
  const adjusted = possible > 0 ? 50 + straight / 2 : 0;
  return { straightPercent: round2(straight), adjustedPercent: round2(adjusted), pointsEarned: round2(earned), pointsPossible: round2(possible), averageLevel: possible > 0 ? round2((earned / possible) * nonNeg(v.levels, 4)) : 0 };
};

export const collegePercentage: CustomCalculator = (v) => {
  const g = nonNeg(v.gpa);
  const f = Math.round(nonNeg(v.formula));
  const pct = f === 0 ? g * 9.5 : f === 1 ? (g - 0.75) * 10 : f === 2 ? g * 10 : f === 3 ? (g - 0.5) * 10 : 55 + g * 10;
  return { percentage: round2(Math.max(0, Math.min(100, pct))), gpaEntered: g };
};

export const creditHours: CustomCalculator = (v) => {
  const left = Math.max(0, nonNeg(v.creditsRequired) - nonNeg(v.creditsCompleted));
  const perTerm = Math.max(1, nonNeg(v.creditsPerTerm, 15));
  const terms = Math.ceil(left / perTerm);
  const perYear = Math.max(1, nonNeg(v.termsPerYear, 2));
  return {
    creditsRemaining: round2(left),
    termsRemaining: terms,
    yearsToGraduate: round2(terms / perYear),
    percentComplete: nonNeg(v.creditsRequired) > 0 ? round2((nonNeg(v.creditsCompleted) / nonNeg(v.creditsRequired)) * 100) : 0,
    weeklyStudyHours: round2(perTerm * nonNeg(v.studyHoursPerCredit, 2)),
    fullTime: perTerm >= 12 ? 1 : 0,
  };
};

export const uniGrade: CustomCalculator = (v) => {
  const w2 = nonNeg(v.year2Weight);
  const w3 = nonNeg(v.year3Weight);
  const wt = w2 + w3 || 1;
  const finalMark = (nonNeg(v.year2Average) * w2 + nonNeg(v.year3Average) * w3) / wt;
  const need = (target: number) => (w3 > 0 ? (target * wt - nonNeg(v.year2Average) * w2) / w3 : 0);
  return {
    degreeAverage: round2(finalMark),
    classification: finalMark >= 70 ? 4 : finalMark >= 60 ? 3 : finalMark >= 50 ? 2 : finalMark >= 40 ? 1 : 0,
    year3NeededForFirst: round2(need(70)),
    year3NeededFor21: round2(need(60)),
    year3NeededFor22: round2(need(50)),
  };
};

export const onlineGradebook: CustomCalculator = (v) => {
  const earned = nonNeg(v.pointsEarned);
  const possible = nonNeg(v.pointsPossible);
  const aPossible = nonNeg(v.assignmentPossible);
  const current = possible > 0 ? (earned / possible) * 100 : 0;
  const after = possible + aPossible > 0 ? ((earned + nonNeg(v.assignmentScore)) / (possible + aPossible)) * 100 : 0;
  const needed = (nonNeg(v.targetGrade) / 100) * (possible + aPossible) - earned;
  return {
    gradeAfterAssignment: round2(after),
    currentGrade: round2(current),
    change: round2(after - current),
    pointsNeededForTarget: round2(needed),
    targetReachable: needed <= aPossible ? 1 : 0,
  };
};

export const eduGradesCustomCalculators: Record<string, CustomCalculator> = {
  "final-grade-calculator": finalGrade,
  "weighted-grade-calculator": weightedGrade,
  "semester-grade-calculator": semesterGrade,
  "teacher-grading-calculator": teacherGrading,
  "rubric-score-calculator": rubricScore,
  "college-percentage-calculator": collegePercentage,
  "credit-hours-calculator": creditHours,
  "uni-grade-calculator": uniGrade,
  "canvas-grade-calculator": onlineGradebook,
};
