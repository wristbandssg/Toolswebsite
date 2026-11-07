/**
 * Batch: "Arts & Entertainment Calculators" → Tarot, Astrology & Fun Calculators.
 * Every tool here is for entertainment; the copy says so.
 *
 * Data / methods:
 *  - Dates arrive as day numbers (days since 1970-01-01 UTC). Text inputs (names) arrive as character
 *    codes: values[key] = length, values[`${key}__i`] = code of character i (see readName below).
 *  - Major Arcana 0–21; "arcana" numbers 1–22 reduce by digit sum until ≤ 22, 22 = The Fool.
 *  - Tarot birth cards (Mary K. Greer method): month + day + year, digit-sum until ≤ 21; the card and
 *    its single-digit reduction form the pair (19 gives Sun, Wheel and Magician).
 *  - Destiny Matrix: A = day, B = month, C = year digit sum, D = A + B + C, E = A + B + C + D (each
 *    reduced to 1–22).
 *  - Pythagorean numerology letter values A=1 … I=9, J=1 …; master numbers 11, 22, 33 kept.
 *  - Cardology birth card: solar value 55 − (2 × month + day); 0 = Joker; 1–13 hearts, 14–26 clubs,
 *    27–39 diamonds, 40–52 spades.
 *  - Dreamspell Galactic Signature: 21 Dec 2012 = Kin 207 (Blue Crystal Hand); 29 February is skipped
 *    (shares 28 February's kin).
 *  - Bazi (Four Pillars): year from Li Chun (sun at 315°), months from the 12 "jie" solar terms (every
 *    30° from 315°), day pillar 60-day cycle with 1 Jan 2000 = 戊午 (Wu Wu), hour pillar by two-hour
 *    branches with the five-rat rule. Sun longitude from NOAA solar equations.
 *  - Venus line: Venus position from JPL approximate Keplerian elements (1800–2050); MC line at the
 *    longitude where local sidereal time equals Venus's right ascension.
 *  - US men statistics (Census/CDC approximations): male population by age band, height ~ N(69.1 in,
 *    2.9), earnings log-normal (median $55,000, σ 0.9) with ~75% of men earning, obesity ≈ 42%.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-arts-mystic-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const digitSum = (n: number) => String(Math.abs(Math.round(n))).split("").reduce((s, d) => s + Number(d), 0);
const reduceTo = (n: number, max: number) => { let x = Math.abs(Math.round(n)); while (x > max) x = digitSum(x); return x; };
const reduce9 = (n: number) => reduceTo(n, 9);
const reduceMaster = (n: number) => { let x = Math.abs(Math.round(n)); while (x > 9 && x !== 11 && x !== 22 && x !== 33) x = digitSum(x); return x; };
/** Arcana 1–22 (0 becomes 22). */
const arcana = (n: number) => { const x = reduceTo(n, 22); return x === 0 ? 22 : x; };

/** Calendar parts of a day number. */
function ymd(day: number) {
  const d = new Date(Math.round(safeNumber(day)) * 864e5);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
/** Rebuilds a name from the character codes the page sends. */
function readName(v: Record<string, number>, key: string) {
  const len = Math.min(60, Math.max(0, Math.round(safeNumber(v[key]))));
  let s = "";
  for (let i = 0; i < len; i++) { const c = Math.round(safeNumber(v[`${key}__${i}`])); if (c > 0 && c < 65536) s += String.fromCharCode(c); }
  return s;
}

// ---------- Tarot ----------
export const MAJORS = ["The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance", "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World"];
export const MAJOR_LABELS = MAJORS.map((n, i) => `${i} — ${n}`);
/** Arcana 1–22 labels (index 0 unused). */
export const ARCANA_LABELS = ["—", ...MAJORS.slice(1).map((n, i) => `${i + 1} — ${n}`), "22 — The Fool"];
const MAJOR_KEYS = ["new beginnings, spontaneity, a leap of faith", "willpower, skill, making things happen", "intuition, mystery, inner knowledge", "nurturing, abundance, creativity", "structure, authority, stability", "tradition, teaching, belief systems", "love, union, an important choice", "drive, determination, victory", "courage, patience, inner strength", "solitude, reflection, seeking truth", "cycles, luck, turning points", "fairness, truth, cause and effect", "pause, surrender, a new perspective", "endings, transformation, release", "balance, moderation, healing", "temptation, attachment, shadow side", "sudden change, upheaval, revelation", "hope, renewal, inspiration", "illusion, intuition, the unknown", "joy, success, vitality", "awakening, reckoning, a calling", "completion, wholeness, achievement"];
const SUITS: [string, string, string[]][] = [
  ["Wands", "Fire", ["inspiration, a spark", "planning, choices", "expansion, foresight", "celebration, home", "conflict, competition", "recognition, victory", "standing your ground", "speed, movement", "resilience, persistence", "burden, responsibility", "enthusiasm, exploration", "action, adventure", "confidence, warmth", "leadership, vision"]],
  ["Cups", "Water", ["new love, emotional beginning", "partnership, connection", "friendship, celebration", "apathy, contemplation", "loss, grief", "nostalgia, childhood", "fantasy, choices", "walking away", "contentment, wishes", "harmony, family", "creative opportunity, a message", "romance, following the heart", "compassion, intuition", "emotional balance, diplomacy"]],
  ["Swords", "Air", ["clarity, a breakthrough", "indecision, stalemate", "heartbreak, sorrow", "rest, recovery", "conflict, winning at a cost", "transition, moving on", "strategy, deception", "feeling trapped", "anxiety, worry", "painful ending, rock bottom", "curiosity, new ideas", "ambition, fast action", "independence, clear thinking", "intellect, authority, truth"]],
  ["Pentacles", "Earth", ["new opportunity, prosperity", "balance, juggling priorities", "teamwork, skill", "security, holding on", "hardship, worry", "generosity, sharing", "patience, long-term view", "diligence, mastery", "self-sufficiency, luxury", "wealth, legacy, family", "study, ambition", "routine, reliability", "practicality, nurturing", "abundance, security, success"]],
];
const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
export const DECK: [string, string, number, number][] = [
  ...MAJORS.map((n, i) => [n, MAJOR_KEYS[i], i, -1] as [string, string, number, number]),
  ...SUITS.flatMap(([suit, , keys], s) => RANKS.map((r, i) => [`${r} of ${suit}`, keys[i], i + 1, s] as [string, string, number, number])),
];
export const KEYWORD_LABELS = DECK.map(([n, k]) => `${n}: ${k}`);
export const COMBO_THEMES = ["Two Major Arcana — a major life lesson or turning point", "Major + Minor Arcana — a big theme showing up in everyday events", "Same suit — the message is concentrated in one area of life", "Fire + Water (Wands + Cups) — passion meets emotion; act from the heart", "Fire + Air (Wands + Swords) — ideas fuel action; move fast but think", "Fire + Earth (Wands + Pentacles) — turn inspiration into something tangible", "Water + Air (Cups + Swords) — feelings and logic pull in different directions", "Water + Earth (Cups + Pentacles) — emotional and material security support each other", "Air + Earth (Swords + Pentacles) — plans and practicality; think it through, then build"];
const ELEM_PAIR: Record<string, number> = { "0-1": 3, "0-2": 4, "0-3": 5, "1-2": 6, "1-3": 7, "2-3": 8 };
export const tarotCombination: CustomCalculator = (v) => {
  const a = DECK[pick(v.card1, DECK.length)];
  const b = DECK[pick(v.card2, DECK.length)];
  let theme: number;
  if (a[3] < 0 && b[3] < 0) theme = 0;
  else if (a[3] < 0 || b[3] < 0) theme = 1;
  else if (a[3] === b[3]) theme = 2;
  else theme = ELEM_PAIR[`${Math.min(a[3], b[3])}-${Math.max(a[3], b[3])}`];
  const sum = reduceTo(a[2] + b[2], 21);
  return { theme, card1Meaning: pick(v.card1, DECK.length), card2Meaning: pick(v.card2, DECK.length), sumCard: sum, combinedNumber: a[2] + b[2] };
};

function greer(total: number) {
  let x = total;
  while (x > 21) x = digitSum(x);
  const second = x > 9 ? digitSum(x) : x;
  const third = x === 19 ? 1 : second;
  return { primary: x, secondary: second, third };
}
export const tarotBirthCard: CustomCalculator = (v) => {
  const { y, m, d } = ymd(v.birthDate);
  const birth = greer(m + d + y);
  const yearCard = greer(m + d + Math.round(safeNumber(v.year, 2026)));
  return { primaryCard: birth.primary, secondaryCard: birth.secondary, thirdCard: birth.third, yearCard: yearCard.primary, birthSum: m + d + y };
};

export const dailyTarot: CustomCalculator = (v) => {
  const b = ymd(v.birthDate);
  const t = ymd(v.date);
  const personalDay = reduceTo(b.m + b.d + digitSum(t.y) + t.m + t.d, 21);
  const universalDay = reduceTo(digitSum(t.y) + t.m + t.d, 21);
  const minor = (b.d * 31 + t.d * 7 + t.m * 13 + t.y) % 56;
  return { cardOfTheDay: personalDay, universalCard: universalDay, minorCard: 22 + minor, personalDayNumber: reduce9(b.m + b.d + t.m + t.d + digitSum(t.y)) };
};

function matrix(day: number) {
  const { y, m, d } = ymd(day);
  const A = arcana(d);
  const B = arcana(m);
  const C = arcana(digitSum(y));
  const D = arcana(A + B + C);
  const E = arcana(A + B + C + D);
  return { A, B, C, D, E };
}
export const destinyMatrix: CustomCalculator = (v) => {
  const { A, B, C, D, E } = matrix(v.birthDate);
  return { centerComfortZone: E, personalityA: A, talentsB: B, materialC: C, karmicTaskD: D, purposeSky: arcana(B + D), purposeEarth: arcana(A + C) };
};
export const arcanaCompatibility: CustomCalculator = (v) => {
  const p = matrix(v.birthDate1);
  const q = matrix(v.birthDate2);
  const couple = arcana(p.E + q.E);
  const shared = [p.A, p.B, p.C, p.D, p.E].filter((x) => [q.A, q.B, q.C, q.D, q.E].includes(x)).length;
  return { coupleArcana: couple, person1Center: p.E, person2Center: q.E, coupleChallenge: arcana(p.D + q.D), sharedArcana: shared, harmonyScore: Math.min(100, 55 + shared * 9 + (Math.abs(p.E - q.E) <= 3 ? 10 : 0)) };
};

// ---------- Numerology ----------
const LETTER = (ch: string) => { const c = ch.toUpperCase().charCodeAt(0) - 64; return c >= 1 && c <= 26 ? ((c - 1) % 9) + 1 : 0; };
export const NUMBER_MEANINGS = ["—", "1 — independent leader", "2 — diplomat, partner", "3 — creative communicator", "4 — builder, organiser", "5 — free spirit, adventurer", "6 — nurturer, carer", "7 — seeker, thinker", "8 — achiever, manager", "9 — humanitarian, idealist", "", "11 — master intuitive", "", "", "", "", "", "", "", "", "", "", "22 — master builder", ...Array(10).fill(""), "33 — master teacher"];
export const vowelsNumerology: CustomCalculator = (v) => {
  const name = readName(v, "fullName").replace(/[^A-Za-z]/g, "");
  const yVowel = pick(v.yAsVowel, 2) === 1;
  let vowels = 0;
  let consonants = 0;
  for (const ch of name) {
    const isV = /[AEIOU]/i.test(ch) || (yVowel && /y/i.test(ch));
    if (isV) vowels += LETTER(ch); else consonants += LETTER(ch);
  }
  return { soulUrge: reduceMaster(vowels), personality: reduceMaster(consonants), expression: reduceMaster(vowels + consonants), vowelTotal: vowels, consonantTotal: consonants, letters: name.length };
};

export const psychicNumber: CustomCalculator = (v) => {
  const { y, m, d } = ymd(v.birthDate);
  const digits = `${String(d).padStart(2, "0")}${String(m).padStart(2, "0")}${y}`.split("").map(Number);
  const psychic = reduce9(d);
  const destiny = reduce9(digits.reduce((s, x) => s + x, 0));
  const grid = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => digits.filter((x) => x === n).length + (psychic === n ? 1 : 0) + (destiny === n ? 1 : 0));
  const out: Record<string, number> = { psychicNumber: psychic, destinyNumber: destiny, missingNumbers: grid.filter((c) => c === 0).length };
  grid.forEach((c, i) => { out[`count${i + 1}`] = c; });
  return out;
};

export const CARD_LABELS = ["Joker", ...["Hearts", "Clubs", "Diamonds", "Spades"].flatMap((s) => ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"].map((r) => `${r} of ${s}`))];
export const cardology: CustomCalculator = (v) => {
  const { m, d } = ymd(v.birthDate);
  const solar = 55 - (2 * m + d);
  return { birthCard: solar, solarValue: solar, suit: solar === 0 ? 0 : Math.ceil(solar / 13), rank: solar === 0 ? 0 : ((solar - 1) % 13) + 1 };
};

// ---------- Astrology & calendars ----------
export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export const ELEMENTS = ["Fire", "Earth", "Air", "Water"];
export const ASPECTS = ["Same sign (conjunction)", "Neighbouring signs (semi-sextile)", "Sextile — friendly", "Square — friction", "Trine — natural harmony", "Quincunx — adjustment", "Opposition — attraction of opposites"];
const ASPECT_SCORE = [75, 55, 80, 45, 90, 40, 65];
export const zodiacMatch: CustomCalculator = (v) => {
  const a = pick(v.sign1, 12);
  const b = pick(v.sign2, 12);
  const d = Math.abs(a - b) % 12;
  const k = Math.min(d, 12 - d);
  return { compatibility: ASPECT_SCORE[k], aspect: k, element1: a % 4, element2: b % 4, sameElement: a % 4 === b % 4 ? 1 : 0 };
};

export const SEALS = ["Red Dragon", "White Wind", "Blue Night", "Yellow Seed", "Red Serpent", "White Worldbridger", "Blue Hand", "Yellow Star", "Red Moon", "White Dog", "Blue Monkey", "Yellow Human", "Red Skywalker", "White Wizard", "Blue Eagle", "Yellow Warrior", "Red Earth", "White Mirror", "Blue Storm", "Yellow Sun"];
export const TONES = ["—", "Magnetic", "Lunar", "Electric", "Self-Existing", "Overtone", "Rhythmic", "Resonant", "Galactic", "Solar", "Planetary", "Spectral", "Crystal", "Cosmic"];
const isLeapDay = (day: number) => { const { m, d } = ymd(day); return m === 2 && d === 29; };
export const galacticSignature: CustomCalculator = (v) => {
  let day = Math.round(safeNumber(v.birthDate));
  if (isLeapDay(day)) day -= 1;
  const ref = 15695; // 2012-12-21
  let diff = 0;
  const step = day >= ref ? 1 : -1;
  // Count days between the reference and the birth date, skipping 29 Februaries.
  for (let x = ref; x !== day; x += step) if (!isLeapDay(x + step)) diff += step;
  const kin = ((((207 - 1 + diff) % 260) + 260) % 260) + 1;
  return { kin, seal: (kin - 1) % 20, tone: ((kin - 1) % 13) + 1, colorFamily: (kin - 1) % 4, wavespell: Math.floor((kin - 1) / 13) + 1 };
};

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const norm360 = (x: number) => ((x % 360) + 360) % 360;
function sunLongitude(jd: number) {
  const t = (jd - 2451545) / 36525;
  const l0 = norm360(280.46646 + t * (36000.76983 + t * 0.0003032));
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const c = Math.sin(rad(m)) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(rad(2 * m)) * (0.019993 - 0.000101 * t) + Math.sin(rad(3 * m)) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  return norm360(l0 + c - 0.00569 - 0.00478 * Math.sin(rad(omega)));
}
export const STEMS = ["甲 Jia (Yang Wood)", "乙 Yi (Yin Wood)", "丙 Bing (Yang Fire)", "丁 Ding (Yin Fire)", "戊 Wu (Yang Earth)", "己 Ji (Yin Earth)", "庚 Geng (Yang Metal)", "辛 Xin (Yin Metal)", "壬 Ren (Yang Water)", "癸 Gui (Yin Water)"];
export const BRANCHES = ["子 Zi (Rat)", "丑 Chou (Ox)", "寅 Yin (Tiger)", "卯 Mao (Rabbit)", "辰 Chen (Dragon)", "巳 Si (Snake)", "午 Wu (Horse)", "未 Wei (Goat)", "申 Shen (Monkey)", "酉 You (Rooster)", "戌 Xu (Dog)", "亥 Hai (Pig)"];
const STEM_SHORT = ["甲 Jia", "乙 Yi", "丙 Bing", "丁 Ding", "戊 Wu", "己 Ji", "庚 Geng", "辛 Xin", "壬 Ren", "癸 Gui"];
const BRANCH_SHORT = ["子 Zi", "丑 Chou", "寅 Yin", "卯 Mao", "辰 Chen", "巳 Si", "午 Wu", "未 Wei", "申 Shen", "酉 You", "戌 Xu", "亥 Hai"];
const ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
const STEM_ELEM = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
export const FIVE_ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];
/** 60 sexagenary labels: index n has stem n % 10 and branch n % 12. */
export const PILLAR_LABELS = [...Array(60)].map((_, n) => `${STEM_SHORT[n % 10]} ${BRANCH_SHORT[n % 12]} — ${["Yang", "Yin"][n % 2]} ${FIVE_ELEMENTS[STEM_ELEM[n % 10]]} ${ANIMALS[n % 12]}`);
const sexagenary = (stem: number, branch: number) => { for (let n = 0; n < 60; n++) if (n % 10 === stem && n % 12 === branch) return n; return 0; };
export const bazi: CustomCalculator = (v) => {
  const day = Math.round(safeNumber(v.birthDate));
  const hour = Math.min(23.99, nonNeg(v.birthHour, 12));
  const tz = safeNumber(v.utcOffset, 8);
  const jd = day + 2440587.5 + (hour - tz) / 24;
  const lambda = sunLongitude(jd);
  const { y } = ymd(day);
  // Before Li Chun (315°) in Jan/Feb → previous Chinese year.
  const { m } = ymd(day);
  const yearNum = m <= 2 && lambda < 315 && lambda > 180 ? y - 1 : y;
  const yearIdx = (((yearNum - 4) % 60) + 60) % 60;
  const monthIdx = Math.floor(norm360(lambda - 315) / 30); // 0 = 寅 month
  const monthBranch = (monthIdx + 2) % 12;
  const monthStem = ((yearIdx % 10) % 5 * 2 + 2 + monthIdx) % 10;
  // Late Zi hour (23:00+) belongs to the next day's pillar in the common convention.
  const dayIdx = ((((54 + (day - 10957) + (hour >= 23 ? 1 : 0)) % 60) + 60) % 60);
  const hourBranch = Math.floor(((hour + 1) % 24) / 2);
  const hourStem = ((dayIdx % 10) % 5 * 2 + hourBranch) % 10;
  const pillars = [yearIdx, sexagenary(monthStem, monthBranch), dayIdx, sexagenary(hourStem, hourBranch)];
  const counts = [0, 0, 0, 0, 0];
  for (const p of pillars) { counts[STEM_ELEM[p % 10]]++; counts[BRANCH_ELEM[p % 12]]++; }
  return { yearPillar: pillars[0], monthPillar: pillars[1], dayPillar: pillars[2], hourPillar: pillars[3], dayMaster: dayIdx % 10, zodiacAnimal: yearIdx % 12, wood: counts[0], fire: counts[1], earth: counts[2], metal: counts[3], water: counts[4], sunLongitude: round2(lambda) };
};

// Venus and Earth–Moon barycentre, JPL approximate elements (1800–2050): a, e, I, L, long. peri, node + rates/century.
const VENUS = [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255, 0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418];
const EARTH = [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0];
function helio(el: number[], t: number) {
  const a = el[0] + el[6] * t; const e = el[1] + el[7] * t; const I = el[2] + el[8] * t; const L = el[3] + el[9] * t; const w = el[4] + el[10] * t; const O = el[5] + el[11] * t;
  const M = rad(norm360(L - w)); const om = rad(w - O); const In = rad(I); const On = rad(O);
  let E = M; for (let k = 0; k < 8; k++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e); const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return [
    (Math.cos(om) * Math.cos(On) - Math.sin(om) * Math.sin(On) * Math.cos(In)) * xp + (-Math.sin(om) * Math.cos(On) - Math.cos(om) * Math.sin(On) * Math.cos(In)) * yp,
    (Math.cos(om) * Math.sin(On) + Math.sin(om) * Math.cos(On) * Math.cos(In)) * xp + (-Math.sin(om) * Math.sin(On) + Math.cos(om) * Math.cos(On) * Math.cos(In)) * yp,
    Math.sin(om) * Math.sin(In) * xp + Math.cos(om) * Math.sin(In) * yp,
  ];
}
export const venusLine: CustomCalculator = (v) => {
  const day = Math.round(safeNumber(v.birthDate));
  const jd = day + 2440587.5 + (nonNeg(v.birthHour, 12) - safeNumber(v.utcOffset, 0)) / 24;
  const t = (jd - 2451545) / 36525;
  const ve = helio(VENUS, t); const ea = helio(EARTH, t);
  const x = ve[0] - ea[0]; const y = ve[1] - ea[1]; const z = ve[2] - ea[2];
  const eps = rad(23.43928);
  const ra = norm360(deg(Math.atan2(y * Math.cos(eps) - z * Math.sin(eps), x)));
  const decl = deg(Math.asin((y * Math.sin(eps) + z * Math.cos(eps)) / Math.sqrt(x * x + y * y + z * z)));
  const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545));
  const mc = ((norm360(ra - gmst) + 180) % 360) - 180;
  const ic = ((norm360(ra - gmst + 180) + 180) % 360) - 180;
  const eclLon = norm360(deg(Math.atan2(y, x)));
  return { venusMcLongitude: round2(mc), venusIcLongitude: round2(ic), venusSign: Math.floor(eclLon / 30), venusEclipticLongitude: round2(eclLon), venusRightAscension: round2(ra), venusDeclination: round2(decl), distanceFromBirthplace: round2(Math.abs(((mc - safeNumber(v.birthLongitude) + 540) % 360) - 180)) };
};

// ---------- Screen time ----------
export const playlist: CustomCalculator = (v) => {
  let sec = 0;
  for (let i = 1; i <= 10; i++) sec += nonNeg(v[`track${i}Min`]) * 60 + nonNeg(v[`track${i}Sec`]);
  sec += nonNeg(v.extraItems) * nonNeg(v.avgMinutes) * 60;
  const speed = nonNeg(v.speed, 1) || 1;
  const at = sec / speed;
  return { totalMinutes: round2(sec / 60), hours: Math.floor(at / 3600), minutes: Math.floor((at % 3600) / 60), seconds: Math.round(at % 60), atSpeedMinutes: round2(at / 60), timeSavedMinutes: round2((sec - at) / 60) };
};

export const binge: CustomCalculator = (v) => {
  const eps = nonNeg(v.seasons) * nonNeg(v.episodesPerSeason) + nonNeg(v.extraEpisodes);
  const minPer = Math.max(0, nonNeg(v.minutesPerEpisode, 45) - nonNeg(v.skipMinutes));
  const total = (eps * minPer) / (nonNeg(v.speed, 1) || 1);
  const perDay = nonNeg(v.hoursPerDay, 2) * 60;
  const days = perDay > 0 ? Math.ceil(total / perDay) : 0;
  return { totalHours: round2(total / 60), daysToFinish: days, finishDate: Math.round(safeNumber(v.startDate)) + Math.max(0, days - 1), episodes: Math.round(eps), episodesPerDay: round2(minPer > 0 ? perDay / minPer : 0), weekendsNonStop: round2(total / 60 / 32) };
};

export const speedPlayback: CustomCalculator = (v) => {
  const sec = nonNeg(v.hours) * 3600 + nonNeg(v.minutes) * 60 + nonNeg(v.seconds);
  const speed = nonNeg(v.speed, 1.5) || 1;
  const at = sec / speed;
  return { newHours: Math.floor(at / 3600), newMinutes: Math.floor((at % 3600) / 60), newSeconds: Math.round(at % 60), totalNewMinutes: round2(at / 60), timeSavedMinutes: round2((sec - at) / 60), percentSaved: round2(sec > 0 ? (1 - at / sec) * 100 : 0) };
};

// ---------- Just for fun ----------
export const VERDICTS = ["Better as friends", "There's a spark", "A sweet match", "Very compatible", "Made for each other"];
export const compatibilityName: CustomCalculator = (v) => {
  const s = (readName(v, "name1") + readName(v, "name2")).toLowerCase();
  let nums = ["l", "o", "v", "e", "s"].map((c) => s.split(c).length - 1);
  if (s.length === 0) return { lovePercent: 0, verdict: 0, sharedLetters: 0 };
  while (nums.length > 2) { const next: number[] = []; for (let i = 0; i < nums.length - 1; i++) next.push((nums[i] + nums[i + 1]) % 10); nums = next; }
  const pctv = nums[0] * 10 + nums[1];
  const a = new Set(readName(v, "name1").toLowerCase().replace(/[^a-z]/g, ""));
  const shared = [...new Set(readName(v, "name2").toLowerCase().replace(/[^a-z]/g, ""))].filter((c) => a.has(c)).length;
  return { lovePercent: pctv, verdict: Math.min(4, Math.floor(pctv / 20)), sharedLetters: shared };
};

export const camel: CustomCalculator = (v) => {
  const age = nonNeg(v.age, 25);
  const ageScore = age < 18 ? 0 : Math.max(0, 30 - Math.abs(age - 24) * 1.2);
  const score = 10 + ageScore + [0, 4, 6, 8][pick(v.hairLength, 4)] + [4, 6, 8, 5][pick(v.hairColor, 4)] + [4, 6, 7, 5][pick(v.eyeColor, 4)] + [3, 6, 5][pick(v.height, 3)] + [6, 7, 4][pick(v.build, 3)] + [2, 6, 10][pick(v.cooking, 3)] + [2, 5, 9][pick(v.humour, 3)];
  return { camels: Math.round(score), goats: Math.round(score * 6), percentile: Math.min(99, Math.round((score / 92) * 100)) };
};

const AGE_BANDS: [number, number, number, number][] = [
  // from, to (inclusive), US men (millions), share not married
  [18, 24, 15.4, 0.92], [25, 29, 11.6, 0.72], [30, 34, 11.3, 0.52], [35, 39, 10.9, 0.4], [40, 44, 10.3, 0.35], [45, 49, 9.9, 0.32], [50, 54, 10.3, 0.32], [55, 59, 10.5, 0.3], [60, 64, 10.0, 0.3], [65, 69, 8.3, 0.25], [70, 74, 6.8, 0.25], [75, 79, 4.6, 0.27], [80, 85, 2.9, 0.35],
];
const normCdf = (z: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp((-z * z) / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
export const maleDelusion: CustomCalculator = (v) => {
  const lo = nonNeg(v.minAge, 25);
  const hi = Math.max(lo, nonNeg(v.maxAge, 35));
  let men = 0;
  let single = 0;
  for (const [a, b, mil, s] of AGE_BANDS) {
    const overlap = Math.max(0, Math.min(hi, b) - Math.max(lo, a) + 1) / (b - a + 1);
    men += mil * overlap;
    single += mil * overlap * s;
  }
  const pSingle = men > 0 ? single / men : 0;
  const hIn = pick(v.heightUnit, 2) === 1 ? nonNeg(v.minHeight) / 2.54 : nonNeg(v.minHeight, 70);
  const pHeight = 1 - normCdf((hIn - 69.1) / 2.9);
  const inc = nonNeg(v.minIncome, 75000);
  const pIncome = inc <= 0 ? 1 : 0.75 * (1 - normCdf((Math.log(inc) - Math.log(55000)) / 0.9));
  const pNotObese = pick(v.notObese, 2) === 1 ? 0.58 : 1;
  const p = (pick(v.single, 2) === 1 ? pSingle : 1) * pHeight * pIncome * pNotObese;
  const count = men * 1e6 * p;
  return { percentOfMenInAgeRange: round2(p * 100), menWhoMatch: Math.round(count), oneIn: Math.round(p > 0 ? 1 / p : 0), menInAgeRange: Math.round(men * 1e6), heightSharePercent: round2(pHeight * 100), incomeSharePercent: round2(pIncome * 100), singleSharePercent: round2(pSingle * 100) };
};

export const animePhysique: CustomCalculator = (v) => {
  const metric = pick(v.units, 2) === 1;
  const hM = metric ? nonNeg(v.height) / 100 : nonNeg(v.height, 70) * 0.0254;
  const kg = metric ? nonNeg(v.weight) : nonNeg(v.weight, 180) * 0.45359237;
  const bf = nonNeg(v.bodyFat, 18) / 100;
  const lean = kg * (1 - bf);
  const ffmi = hM > 0 ? lean / (hM * hM) + 6.1 * (1.8 - hM) : 0;
  const target = 25; // Toji-style: lean, very muscular (near the natural upper range)
  const leanNeeded = hM > 0 ? Math.max(0, (target - 6.1 * (1.8 - hM)) * hM * hM - lean) : 0;
  const fatToLose = Math.max(0, kg * bf - (lean + leanNeeded) * (0.09 / 0.91));
  const k = metric ? 1 : 2.20462;
  return { physiqueMatchPercent: Math.min(100, round2((ffmi / target) * 100 * (bf <= 0.1 ? 1 : Math.max(0.6, 1 - (bf - 0.1) * 1.5)))), ffmi: round2(ffmi), leanMassToGain: round2(leanNeeded * k), fatToLose: round2(fatToLose * k), targetWeight: round2((lean + leanNeeded) / 0.91 * k), currentLeanMass: round2(lean * k) };
};

export const artsMysticCustomCalculators: Record<string, CustomCalculator> = {
  "tarot-combination-calculator": tarotCombination,
  "tarot-birth-card-calculator": tarotBirthCard,
  "daily-tarot-calculator": dailyTarot,
  "destiny-matrix-arcana-calculator": destinyMatrix,
  "arcana-compatibility-calculator": arcanaCompatibility,
  "vowels-numerology-calculator": vowelsNumerology,
  "psychic-birth-chart-calculator": psychicNumber,
  "cardology-calculator": cardology,
  "zodiac-signs-match-calculator": zodiacMatch,
  "galactic-signature-calculator": galacticSignature,
  "accurate-online-bazi-calculator": bazi,
  "venus-line-calculator": venusLine,
  "playlist-calculator": playlist,
  "binge-calculator": binge,
  "speed-playback-calculator": speedPlayback,
  "compatibility-name-calculator": compatibilityName,
  "camel-calculator": camel,
  "male-delusion-calculator": maleDelusion,
  "toji-anime-physique-calculator": animePhysique,
};
