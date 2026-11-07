// One-time (but safe to re-run) batch setup script: creates 19 calculators in Arts & Entertainment
// Calculators > Tarot, Astrology & Fun Calculators (tarot, numerology, astrology, screen time and
// just-for-fun tools). Formulas live in src/lib/calc-engine-arts-mystic.ts; examples are computed from
// the engine. Name inputs use the "text" field type.
//
// HOW TO RUN (after prisma/setup-arts-entertainment-category.ts --apply)
//   npx tsx prisma/create-arts-mystic-calculators.ts
// or
//   npm run db:create-arts-mystic-calculators

import * as E from "../src/lib/calc-engine-arts-mystic";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; labels?: string[] };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const FMT = { n: "number", l: "label", c: "currency", p: "percentage", d: "date" } as const;
/** [key, label, format, labels for "l" lines]. */
type Line = [key: string, label: string, fmt: keyof typeof FMT, labels?: string[]];
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
/** Shows an index the way the page will (labels[index], "—" when out of range). */

const CAT = "tarot-astrology-fun-calculators";
const NOTE = "For entertainment and self-reflection only — tarot, astrology, numerology and fun scores are not scientific predictions and shouldn't guide health, money or relationship decisions.";

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt, mainLabels] = s.results[0];
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Music Tool`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainLabels ? { labels: mainLabels } : {}) },
    calcResults: s.results.map(([key, label, f, labels], i) => ({ key, label, format: FMT[f], ...(labels ? { labels } : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

function dateField(key: string, label: string, def: string) {
  return { key, label, type: "date", required: true, default: def };
}
function pct(key: string, label: string, def: number, max = 100, step = 0.5) {
  return { key, label, type: "percentage", required: true, default: def, min: 0, max, step };
}
function textField(key: string, label: string, def: string) {
  return { key, label, type: "text", required: true, default: def };
}
const name = (k: string, s: string) => Object.fromEntries([[k, s.length], ...s.split("").map((c, i) => [`${k}__${i}`, c.charCodeAt(0)])]) as Record<string, number>;
const D = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 864e5;
const BIRTH = (key = "birthDate", label = "Date of Birth") => dateField(key, label, "1995-06-15");
const DECK_OPTS = opts(E.DECK.map(([n]) => n));
const SIGN_OPTS = opts(E.SIGNS);

const TOOLS: ToolDef[] = [
  mk({
    slug: "tarot-combination-calculator", title: "Tarot Combination Calculator (Two-Card Meanings)",
    desc: "Read two tarot cards together — each card's keywords, the theme of the pair (Major and Minor Arcana, suits and elements) and the Major Arcana card their numbers add up to.",
    meta: "Tarot Combination Calculator — Meaning of Two Cards Together",
    inputs: [dropdown("card1", "First Card", DECK_OPTS, 6), dropdown("card2", "Second Card", DECK_OPTS, 22 + 14 + 1)],
    results: [["theme", "Combination Theme", "l", E.COMBO_THEMES], ["card1Meaning", "First Card", "l", E.KEYWORD_LABELS], ["card2Meaning", "Second Card", "l", E.KEYWORD_LABELS], ["sumCard", "Number Sum Card (Major Arcana)", "l", E.MAJOR_LABELS], ["combinedNumber", "Combined Number", "n"]],
    fn: E.tarotCombination, ex: { card1: 6, card2: 37 },
    exText: (o) => `Example: The Lovers with the Two of Cups — ${E.COMBO_THEMES[o.theme].split(" — ")[0]}; their numbers add to ${E.MAJORS[o.sumCard]}.`,
    how: "Choose the two cards you drew. Read each card's keywords, then the theme: two Major Arcana point to a big life lesson; suits show which area of life (Wands drive, Cups feelings, Swords thoughts, Pentacles money and body) is in focus.",
    assume: "Upright keyword meanings in the Rider–Waite–Smith tradition. Number sum: Major Arcana use their number, minor cards Ace = 1 … King = 14, reduced to 0–21.",
    faq: [["What does The Lovers and Two of Cups mean together?", "A strong sign of partnership and mutual attraction."], ["Do reversed cards change the meaning?", "Many readers soften or block the upright meaning; this calculator uses upright meanings."]],
  }),
  mk({
    slug: "tarot-birth-card-calculator", title: "Tarot Birth Card Calculator (Soul & Personality Cards)",
    desc: "Find your tarot birth cards from your birth date — the personality and soul cards of Mary K. Greer's method — plus your tarot year card for any year.",
    meta: "Tarot Birth Card Calculator — Your Personality & Soul Cards",
    inputs: [BIRTH(), num("year", "Year Card For", 2026, 2200, 1, 1900)],
    results: [["primaryCard", "Personality Card", "l", E.MAJOR_LABELS], ["secondaryCard", "Soul Card", "l", E.MAJOR_LABELS], ["thirdCard", "Third Card (only for 19)", "l", E.MAJOR_LABELS], ["yearCard", "Year Card", "l", E.MAJOR_LABELS], ["birthSum", "Birth Date Sum", "n"]],
    fn: E.tarotBirthCard, ex: { birthDate: D(1990, 10, 26), year: 2026 },
    exText: (o) => `Example: born 26 October 1990, 10 + 26 + 1990 = 2026 → 2 + 0 + 2 + 6 = 10: your birth cards are ${E.MAJORS[o.primaryCard]} and ${E.MAJORS[o.secondaryCard]}.`,
    how: "Add your birth month, day and year, then add the digits until the number is 21 or less — that is your personality card; its digits added again give your soul card. Year cards use the same method with a chosen year in place of your birth year.",
    assume: "Mary K. Greer's birth-card method. A total of 19 gives three cards: The Sun, Wheel of Fortune and The Magician.",
    faq: [["How do I find my tarot birth card?", "Add month + day + year and reduce the digits to 21 or less."], ["What is a tarot year card?", "The card for your birthday in a given year, describing that year's theme."]],
  }),
  mk({
    slug: "daily-tarot-calculator", title: "Daily Tarot Card Calculator (Card of the Day)",
    desc: "Get your personal tarot card of the day from your birth date and today's date — a Major Arcana theme, the universal card everyone shares today and a Minor Arcana focus card.",
    meta: "Daily Tarot Calculator — Your Personal Card of the Day",
    inputs: [BIRTH(), dateField("date", "Date", "today")],
    results: [["cardOfTheDay", "Your Card of the Day", "l", E.MAJOR_LABELS], ["universalCard", "Universal Card of the Day", "l", E.MAJOR_LABELS], ["minorCard", "Minor Arcana Focus", "l", E.KEYWORD_LABELS], ["personalDayNumber", "Personal Day Number (1–9)", "n"]],
    fn: E.dailyTarot, ex: { birthDate: D(1995, 6, 15), date: D(2026, 11, 7) },
    exText: (o) => `Example: someone born on 15 June has ${E.MAJORS[o.cardOfTheDay]} as their card for 7 November 2026.`,
    how: "Your card of the day combines your birth month and day with today's date, so it changes daily and differs from other people's. Use it as a journaling prompt for the day.",
    assume: "Numerology-based draw: date digits are added and reduced to 0–21 for the Major Arcana; the Minor Arcana card is chosen from the same numbers. Same inputs always give the same card.",
    faq: [["How is a daily tarot card chosen?", "Here, from your birthday and the date using numerology, so it is the same each time you check that day."]],
  }),
  mk({
    slug: "destiny-matrix-arcana-calculator", title: "Destiny Matrix Calculator (Personal Arcana)",
    desc: "Calculate the main arcana of your Destiny Matrix (Matrix of Destiny) from your birth date — personality, talents, material, karmic task and the central comfort zone — plus your sky and earth purpose numbers.",
    meta: "Destiny Matrix Arcana Calculator — Your Matrix of Destiny",
    inputs: [BIRTH()],
    results: [["centerComfortZone", "Center — Comfort Zone", "l", E.ARCANA_LABELS], ["personalityA", "Personality (Day)", "l", E.ARCANA_LABELS], ["talentsB", "Talents (Month)", "l", E.ARCANA_LABELS], ["materialC", "Material Karma (Year)", "l", E.ARCANA_LABELS], ["karmicTaskD", "Karmic Task", "l", E.ARCANA_LABELS], ["purposeSky", "Purpose — Sky Line", "l", E.ARCANA_LABELS], ["purposeEarth", "Purpose — Earth Line", "l", E.ARCANA_LABELS]],
    fn: E.destinyMatrix, ex: { birthDate: D(1990, 10, 26) },
    exText: (o) => `Example: for 26 October 1990, the day gives ${E.ARCANA_LABELS[o.personalityA]}, the month ${E.ARCANA_LABELS[o.talentsB]}, the year ${E.ARCANA_LABELS[o.materialC]}, and the centre is ${E.ARCANA_LABELS[o.centerComfortZone]}.`,
    how: "Enter your birth date. Each number from 1 to 22 corresponds to a Major Arcana card (22 is The Fool). The centre point is considered your core energy or comfort zone in the Destiny Matrix system.",
    assume: "A = day, B = month, C = digit sum of the year, D = A + B + C, centre = A + B + C + D, each reduced to 1–22 by adding digits. Different schools add further points; the main ones are shown.",
    faq: [["What is the Destiny Matrix?", "A numerology system that maps your birth date onto the 22 Major Arcana."], ["What does arcana 22 mean?", "The Fool — freedom, new beginnings and spontaneity."]],
  }),
  mk({
    slug: "arcana-compatibility-calculator", title: "Arcana Compatibility Calculator (Couple's Destiny Matrix)",
    desc: "Compare two birth dates with Destiny Matrix arcana — each person's central arcana, the couple's shared arcana and challenge, how many arcana you share and a playful harmony score.",
    meta: "Arcana Compatibility Calculator — Couple Matrix by Birth Dates",
    inputs: [BIRTH("birthDate1", "Person 1 — Date of Birth"), dateField("birthDate2", "Person 2 — Date of Birth", "1993-02-20")],
    results: [["coupleArcana", "Couple's Arcana", "l", E.ARCANA_LABELS], ["harmonyScore", "Harmony Score (fun, 0–100)", "n"], ["person1Center", "Person 1 Centre", "l", E.ARCANA_LABELS], ["person2Center", "Person 2 Centre", "l", E.ARCANA_LABELS], ["coupleChallenge", "Couple's Challenge", "l", E.ARCANA_LABELS], ["sharedArcana", "Arcana You Share (of 5)", "n"]],
    fn: E.arcanaCompatibility, ex: { birthDate1: D(1995, 6, 15), birthDate2: D(1993, 2, 20) },
    exText: (o) => `Example: two people born 15 June 1995 and 20 February 1993 have ${E.ARCANA_LABELS[o.coupleArcana]} as their couple's arcana, with a harmony score of ${o.harmonyScore}.`,
    how: "Enter both birth dates. The couple's arcana combines each person's central number; the challenge combines their karmic tasks. Shared arcana suggest common ground.",
    assume: "Each person's matrix uses A = day, B = month, C = year digit sum, D = A + B + C, centre = A + B + C + D (reduced to 1–22). The harmony score is a playful blend of shared numbers and closeness of the centres.",
    faq: [["How do you check compatibility with the Destiny Matrix?", "Add the two people's central arcana and reduce to 1–22 for the couple's arcana."]],
  }),
  mk({
    slug: "vowels-numerology-calculator", title: "Soul Urge Number Calculator (Vowels Numerology)",
    desc: "Find your Soul Urge (Heart's Desire) number from the vowels in your full name, plus your Personality number from the consonants and your Expression number — with master numbers 11, 22 and 33.",
    meta: "Vowels Numerology Calculator — Soul Urge & Personality Numbers",
    inputs: [textField("fullName", "Full Birth Name", "John Smith"), dropdown("yAsVowel", "Count Y as a Vowel?", opts(["No", "Yes"]), 0)],
    results: [["soulUrge", "Soul Urge (Vowels)", "l", E.NUMBER_MEANINGS], ["personality", "Personality (Consonants)", "l", E.NUMBER_MEANINGS], ["expression", "Expression (Full Name)", "l", E.NUMBER_MEANINGS], ["vowelTotal", "Vowel Total", "n"], ["consonantTotal", "Consonant Total", "n"], ["letters", "Letters Counted", "n"]],
    fn: E.vowelsNumerology, ex: { ...name("fullName", "John Smith"), yAsVowel: 0 },
    exText: (o) => `Example: "John Smith" has vowels O and I (6 + 9 = 15 → 6): Soul Urge ${E.NUMBER_MEANINGS[o.soulUrge]}; Expression ${E.NUMBER_MEANINGS[o.expression]}.`,
    how: "Type your full name as it appears on your birth certificate. Count Y as a vowel when it sounds like one (Mary, Lynn). Spaces, hyphens and accents are ignored.",
    assume: "Pythagorean values: A, J, S = 1; B, K, T = 2; C, L, U = 3; D, M, V = 4; E, N, W = 5; F, O, X = 6; G, P, Y = 7; H, Q, Z = 8; I, R = 9. Totals are reduced by adding digits, keeping 11, 22 and 33.",
    faq: [["What is the Soul Urge number?", "The number from the vowels of your name, said to describe your inner motivation."], ["Is Y a vowel in numerology?", "When it sounds like a vowel; choose Yes for names like Mary."]],
  }),
  mk({
    slug: "psychic-birth-chart-calculator", title: "Psychic Number & Lo Shu Grid Calculator (Birth Chart)",
    desc: "Find your Vedic numerology psychic (driver) number and destiny (conductor) number from your birth date, and see your Lo Shu grid — how many times each number 1–9 appears and which are missing.",
    meta: "Psychic Birth Chart Calculator — Psychic Number & Lo Shu Grid",
    inputs: [BIRTH()],
    results: [["psychicNumber", "Psychic (Driver) Number", "n"], ["destinyNumber", "Destiny (Conductor) Number", "n"], ["missingNumbers", "Missing Numbers in the Grid", "n"], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [`count${i}`, `Number ${i} in the Lo Shu Grid`, "n"] as Line)],
    fn: E.psychicNumber, ex: { birthDate: D(1990, 10, 26) },
    exText: (o) => `Example: born 26 October 1990, the psychic number is ${o.psychicNumber} (2 + 6) and the destiny number is ${o.destinyNumber}; ${o.missingNumbers} numbers are missing from the grid.`,
    how: "Enter your birth date. The psychic number comes from the day, the destiny number from the whole date. In the Lo Shu grid, repeated numbers are said to be strengths and missing numbers lessons to work on.",
    assume: "Psychic = day of birth reduced to 1–9; destiny = all digits of DDMMYYYY reduced to 1–9. The grid counts the birth-date digits plus the psychic and destiny numbers (zeros are ignored).",
    faq: [["What is a psychic number?", "In Vedic numerology, the single digit from your day of birth."], ["What is the Lo Shu grid?", "A 3 × 3 magic square used to see which numbers appear in your birth date."]],
  }),
  mk({
    slug: "cardology-calculator", title: "Cardology Birth Card Calculator (Cards of Destiny)",
    desc: "Find your birth card in cardology (the Cards of Destiny system) — the playing card ruled by your birthday, from the Ace of Hearts to the King of Spades or the Joker.",
    meta: "Cardology Calculator — Your Birth Card in the Cards of Destiny",
    inputs: [BIRTH()],
    results: [["birthCard", "Your Birth Card", "l", E.CARD_LABELS], ["solarValue", "Solar Value (0–52)", "n"], ["suit", "Suit (1 Hearts · 2 Clubs · 3 Diamonds · 4 Spades)", "n"], ["rank", "Rank (1 Ace … 13 King)", "n"]],
    fn: E.cardology, ex: { birthDate: D(1995, 6, 15) },
    exText: (o) => `Example: 15 June gives a solar value of 55 − (12 + 15) = ${o.solarValue} — the ${E.CARD_LABELS[o.birthCard]}.`,
    how: "Enter your birth date — only the month and day matter. Hearts relate to love and relationships, Clubs to knowledge and communication, Diamonds to values and money, Spades to work and wisdom.",
    assume: "Solar value = 55 − (2 × month + day). Values 1–13 are Hearts, 14–26 Clubs, 27–39 Diamonds and 40–52 Spades (Ace to King); 0 (31 December) is the Joker.",
    faq: [["What is my cardology birth card?", "The card from 55 − (2 × month + day)."], ["Who is the Joker in cardology?", "People born on 31 December."]],
  }),
  mk({
    slug: "zodiac-signs-match-calculator", title: "Zodiac Compatibility Calculator (Sign Match)",
    desc: "Check the compatibility of two zodiac signs — the aspect between them (trine, sextile, square, opposition…), their elements and a compatibility score.",
    meta: "Zodiac Signs Match Calculator — Sun Sign Compatibility",
    inputs: [dropdown("sign1", "Your Sign", SIGN_OPTS, 4), dropdown("sign2", "Their Sign", SIGN_OPTS, 8)],
    results: [["compatibility", "Compatibility Score (%)", "n"], ["aspect", "Relationship Between the Signs", "l", E.ASPECTS], ["element1", "Your Element", "l", E.ELEMENTS], ["element2", "Their Element", "l", E.ELEMENTS], ["sameElement", "Same Element (1 = yes)", "n"]],
    fn: E.zodiacMatch, ex: { sign1: 4, sign2: 8 },
    exText: (o) => `Example: Leo and Sagittarius are both fire signs four signs apart — a ${E.ASPECTS[o.aspect].toLowerCase()} — scoring ${o.compatibility}%.`,
    how: "Choose two sun signs. Signs of the same element (trine) usually get along easily; sextiles (fire–air, earth–water) are friendly; squares and oppositions bring tension and attraction. A full synastry chart with Moon and Venus says much more.",
    assume: "Scores by angular distance: trine 90, sextile 80, conjunction 75, opposition 65, semi-sextile 55, square 45, quincunx 40.",
    faq: [["Which signs are most compatible?", "Signs of the same element (for example Aries, Leo and Sagittarius) and complementary elements (fire with air, earth with water)."]],
  }),
  mk({
    slug: "galactic-signature-calculator", title: "Galactic Signature Calculator (Mayan Dreamspell Kin)",
    desc: "Find your Dreamspell Galactic Signature from your birth date — your Kin number (1–260), solar seal, galactic tone, colour family and wavespell.",
    meta: "Galactic Signature Calculator — Your Mayan Dreamspell Kin",
    inputs: [BIRTH()],
    results: [["kin", "Kin Number (1–260)", "n"], ["seal", "Solar Seal", "l", E.SEALS], ["tone", "Galactic Tone", "l", E.TONES], ["colorFamily", "Colour", "l", ["Red (initiates)", "White (refines)", "Blue (transforms)", "Yellow (ripens)"]], ["wavespell", "Wavespell (1–20)", "n"]],
    fn: E.galacticSignature, ex: { birthDate: D(2012, 12, 21) },
    exText: (o) => `Example: 21 December 2012 is Kin ${o.kin} — ${E.SEALS[o.seal].replace(" ", ` ${E.TONES[o.tone]} `)}.`,
    how: "Enter your birth date. Your signature combines one of 20 solar seals with one of 13 tones. People born on 29 February share the kin of 28 February.",
    assume: "José Argüelles' Dreamspell count (not the traditional K'iche' Maya count), anchored to 21 December 2012 = Kin 207 (Blue Crystal Hand), skipping 29 February.",
    faq: [["What is a Galactic Signature?", "Your Dreamspell kin: a solar seal plus a galactic tone from your birth date."], ["Is the Dreamspell the real Maya calendar?", "No — it is a modern system; the traditional Tzolk'in count differs."]],
  }),
  mk({
    slug: "accurate-online-bazi-calculator", title: "Bazi Calculator (Four Pillars of Destiny)",
    desc: "Calculate your Bazi (Four Pillars of Destiny) — year, month, day and hour pillars from your birth date and time, your day master, Chinese zodiac animal and the balance of the five elements.",
    meta: "Bazi Calculator — Four Pillars of Destiny & Five Elements",
    inputs: [BIRTH(), num("birthHour", "Birth Time (24-hour clock, e.g. 14.5 = 2:30 PM)", 12, 23.99, 0.25), num("utcOffset", "Time Zone at Birth (hours from UTC, e.g. 8 for China)", 8, 14, 0.25, -12)],
    results: [["dayPillar", "Day Pillar", "l", E.PILLAR_LABELS], ["dayMaster", "Day Master", "l", E.STEMS], ["yearPillar", "Year Pillar", "l", E.PILLAR_LABELS], ["monthPillar", "Month Pillar", "l", E.PILLAR_LABELS], ["hourPillar", "Hour Pillar", "l", E.PILLAR_LABELS], ["zodiacAnimal", "Chinese Zodiac Animal", "l", E.BRANCHES], ["wood", "Wood Count", "n"], ["fire", "Fire Count", "n"], ["earth", "Earth Count", "n"], ["metal", "Metal Count", "n"], ["water", "Water Count", "n"], ["sunLongitude", "Sun's Longitude at Birth (°)", "n"]],
    fn: E.bazi, ex: { birthDate: D(2000, 1, 1), birthHour: 12, utcOffset: 8 },
    exText: (o) => `Example: noon on 1 January 2000 (UTC+8) has a ${E.PILLAR_LABELS[o.dayPillar].split(" — ")[0]} day pillar — a ${E.STEMS[o.dayMaster]} day master — in a ${E.PILLAR_LABELS[o.yearPillar].split(" — ")[0]} year (still the Rabbit year, before Li Chun).`,
    how: "Enter the birth date, local clock time and the time zone in effect at birth. The Chinese year starts at Li Chun (around 4 February), not New Year's Day, and months change at the solar terms — so January births fall in the previous zodiac year.\n\nIf you don't know the birth hour, the year, month and day pillars are still valid.",
    assume: "Year and month pillars from the sun's longitude (Li Chun at 315°, months every 30°); day pillar from the 60-day cycle (1 January 2000 = 戊午); hour pillar by two-hour branches, with births from 23:00 counted in the next day. Uses clock time, not true solar time; some schools adjust for longitude.",
    faq: [["What is my day master in Bazi?", "The heavenly stem of your day pillar — it represents you."], ["Why is my Chinese zodiac different from the Chinese New Year chart?", "Bazi starts the year at Li Chun (about 4 February), not Lunar New Year."]],
  }),
  mk({
    slug: "venus-line-calculator", title: "Venus Line Calculator (Astrocartography)",
    desc: "Find where your Venus line runs in astrocartography — the longitudes of your Venus MC and IC lines from your birth date, time and time zone — plus Venus's sign and how far the line is from your birthplace.",
    meta: "Venus Line Calculator — Your Astrocartography Venus MC Line",
    inputs: [BIRTH(), num("birthHour", "Birth Time (24-hour clock)", 12, 23.99, 0.25), num("utcOffset", "Time Zone at Birth (hours from UTC)", 0, 14, 0.25, -12), num("birthLongitude", "Birthplace Longitude (° east +, west −)", -74.0, 180, 0.01, -180)],
    results: [["venusMcLongitude", "Venus MC Line Longitude (° east +)", "n"], ["venusIcLongitude", "Venus IC Line Longitude (°)", "n"], ["venusSign", "Venus Sign", "l", E.SIGNS], ["distanceFromBirthplace", "Degrees of Longitude From Your Birthplace", "n"], ["venusEclipticLongitude", "Venus Ecliptic Longitude (°)", "n"], ["venusRightAscension", "Venus Right Ascension (°)", "n"], ["venusDeclination", "Venus Declination (°)", "n"]],
    fn: E.venusLine, ex: { birthDate: D(2000, 1, 1), birthHour: 12, utcOffset: 0, birthLongitude: 0 },
    exText: (o) => `Example: for noon UTC on 1 January 2000, the Venus MC line runs down longitude ${o.venusMcLongitude}° (through the Atlantic and eastern South America) with Venus in ${E.SIGNS[o.venusSign]}.`,
    how: "Enter your birth details. The Venus MC line is a north–south line on the map where Venus was overhead when you were born — astrocartographers associate it with love, beauty and being liked. Look up which cities lie near that longitude.\n\nAscendant and Descendant Venus lines curve with latitude and are not shown.",
    assume: "Venus position from JPL approximate orbital elements (accurate to well under a degree for 1800–2050); MC line where local sidereal time equals Venus's right ascension. Birth time accuracy matters: 4 minutes shifts the line by 1° of longitude.",
    faq: [["What is a Venus line?", "In astrocartography, a place where Venus was angular at your birth — linked to love and pleasure."], ["Why does birth time matter?", "Earth turns 1° every 4 minutes, so the lines move with the time."]],
  }),
  mk({
    slug: "playlist-calculator", title: "Playlist Length Calculator (Album & YouTube Playlist Duration)",
    desc: "Add up the length of a playlist, album or YouTube playlist — up to ten tracks plus a batch of videos at an average length — and see how long it takes at 1.25×, 1.5× or 2× playback speed.",
    meta: "Playlist Calculator — Total Length of a Playlist or Album",
    inputs: [...[...Array(10)].flatMap((_, i) => [num(`track${i + 1}Min`, `Track ${i + 1} — Minutes`, [3, 4, 3, 0][i] ?? 0, 600, 1), num(`track${i + 1}Sec`, `Track ${i + 1} — Seconds`, [30, 5, 45, 0][i] ?? 0, 59, 1)]), num("extraItems", "More Items (e.g. videos) to Add", 0, 100000, 1), num("avgMinutes", "Average Length of Those Items (minutes)", 10, 1000, 0.1), num("speed", "Playback Speed (1 = normal)", 1, 4, 0.05, 0.25)],
    results: [["totalMinutes", "Total Length (minutes, normal speed)", "n"], ["hours", "At Your Speed — Hours", "n"], ["minutes", "+ Minutes", "n"], ["seconds", "+ Seconds", "n"], ["atSpeedMinutes", "At Your Speed (minutes)", "n"], ["timeSavedMinutes", "Time Saved (minutes)", "n"]],
    fn: E.playlist, ex: { track1Min: 3, track1Sec: 30, track2Min: 4, track2Sec: 5, track3Min: 3, track3Sec: 45, speed: 1, extraItems: 0, avgMinutes: 10 },
    exText: (o) => `Example: three songs of 3:30, 4:05 and 3:45 last ${o.totalMinutes} minutes in total.`,
    how: "Enter track lengths one by one, or for a long YouTube playlist enter the number of videos and their average length. Set a playback speed to see how much time a faster speed saves.",
    assume: "Sum of all durations, divided by the playback speed.",
    faq: [["How long is a typical album?", "About 35–50 minutes."], ["How long does a 10-hour playlist take at 1.5×?", "About 6 hours 40 minutes."]],
  }),
  mk({
    slug: "binge-calculator", title: "Binge-Watch Calculator (How Long to Watch a Show)",
    desc: "Work out how long it takes to binge a TV series — total hours, days at your pace and the date you'll finish — with intro skipping and faster playback.",
    meta: "Binge Calculator — How Long to Watch a Whole TV Series",
    inputs: [num("seasons", "Seasons", 5, 100, 1), num("episodesPerSeason", "Episodes per Season", 10, 500, 1), num("extraEpisodes", "Extra Episodes / Specials", 0, 1000, 1), num("minutesPerEpisode", "Minutes per Episode", 45, 600, 1, 1), num("skipMinutes", "Minutes Skipped per Episode (intro/credits)", 0, 30, 0.5), num("speed", "Playback Speed", 1, 3, 0.05, 0.25), num("hoursPerDay", "Hours You Watch per Day", 2, 24, 0.25, 0.25), dateField("startDate", "Start Date", "today")],
    results: [["totalHours", "Total Viewing Time (hours)", "n"], ["daysToFinish", "Days to Finish", "n"], ["finishDate", "You'll Finish On", "d"], ["episodes", "Episodes", "n"], ["episodesPerDay", "Episodes per Day", "n"], ["weekendsNonStop", "Weekends Watching Non-Stop (16 h/day)", "n"]],
    fn: E.binge, ex: { seasons: 5, episodesPerSeason: 10, extraEpisodes: 0, minutesPerEpisode: 45, skipMinutes: 0, speed: 1, hoursPerDay: 2, startDate: D(2026, 11, 7) },
    exText: (o) => `Example: 5 seasons of 10 forty-five-minute episodes is ${o.totalHours} hours — ${o.daysToFinish} days at 2 hours a night.`,
    how: "Enter the show's seasons, episodes and running time (check its streaming page), and how much you watch a day. Skipping intros and recaps adds up fast over a long series.",
    assume: "Total = episodes × (minutes − skipped) ÷ speed; days = total ÷ daily viewing, rounded up.",
    faq: [["How long would it take to watch every episode of a 10-season show?", "Roughly 100–200 hours for a typical drama or sitcom."]],
  }),
  mk({
    slug: "speed-playback-calculator", title: "Playback Speed Calculator (Video & Podcast Time at 1.5×, 2×)",
    desc: "See how long a video, podcast, lecture or audiobook takes at any playback speed — the new length and the time you save at 1.25×, 1.5×, 1.75× or 2×.",
    meta: "Speed Playback Calculator — Length at 1.5× or 2× Speed",
    inputs: [num("hours", "Hours", 1, 1000, 1), num("minutes", "Minutes", 30, 59, 1), num("seconds", "Seconds", 0, 59, 1), num("speed", "Playback Speed", 1.5, 4, 0.05, 0.25)],
    results: [["totalNewMinutes", "New Length (minutes)", "n"], ["newHours", "New Length — Hours", "n"], ["newMinutes", "+ Minutes", "n"], ["newSeconds", "+ Seconds", "n"], ["timeSavedMinutes", "Time Saved (minutes)", "n"], ["percentSaved", "Time Saved (%)", "n"]],
    fn: E.speedPlayback, ex: { hours: 1, minutes: 30, seconds: 0, speed: 1.5 },
    exText: (o) => `Example: a 1 h 30 min lecture at 1.5× takes ${o.totalNewMinutes} minutes, saving ${o.timeSavedMinutes} minutes.`,
    how: "Enter the original length and speed. Most listeners can follow speech comfortably at 1.25–1.75×.",
    assume: "New length = original ÷ speed.",
    faq: [["How long is a 10-hour audiobook at 1.5×?", "6 hours 40 minutes."], ["How much time does 2× save?", "Half the original length."]],
  }),
  mk({
    slug: "compatibility-name-calculator", title: "Love Compatibility Name Calculator (Just for Fun)",
    desc: "Type two names to get a playful love-compatibility percentage — the classic 'LOVES' name game — with a fun verdict and how many letters your names share.",
    meta: "Compatibility Name Calculator — Love Percentage by Name (Fun)",
    inputs: [textField("name1", "First Name", "Romeo"), textField("name2", "Second Name", "Juliet")],
    results: [["lovePercent", "Love Compatibility (%)", "n"], ["verdict", "Verdict", "l", E.VERDICTS], ["sharedLetters", "Letters Your Names Share", "n"]],
    fn: E.compatibilityName, ex: { ...name("name1", "Romeo"), ...name("name2", "Juliet") },
    exText: (o) => `Example: Romeo + Juliet score ${o.lovePercent}% — "${E.VERDICTS[o.verdict]}".`,
    how: "Type the two names (first names work best). The same two names always give the same score — it's a game, not a prediction, so have fun with it.",
    assume: "Classic playground method: count the letters L, O, V, E and S in both names, then add neighbouring counts (keeping the last digit) until two digits remain.",
    faq: [["Is a love calculator accurate?", "No — it is a game for fun, like the 'FLAMES' and 'LOVES' tests."]],
  }),
  mk({
    slug: "camel-calculator", title: "Camel Calculator (How Many Camels Are You Worth?)",
    desc: "The internet's favourite joke: find out how many camels (and goats) you'd be 'worth' from a few light-hearted questions — purely for laughs.",
    meta: "Camel Calculator — How Many Camels Are You Worth? (Joke)",
    inputs: [num("age", "Age", 25, 120, 1, 18), dropdown("hairLength", "Hair Length", opts(["Bald / shaved", "Short", "Medium", "Long"]), 2), dropdown("hairColor", "Hair Colour", opts(["Black", "Brown", "Blonde", "Red / other"]), 1), dropdown("eyeColor", "Eye Colour", opts(["Brown", "Hazel", "Green / blue", "Grey / other"]), 0), dropdown("height", "Height", opts(["Short", "Average", "Tall"]), 1), dropdown("build", "Build", opts(["Slim", "Athletic", "Curvy / stocky"]), 1), dropdown("cooking", "Cooking Skills", opts(["Burns water", "Decent", "Chef level"]), 1), dropdown("humour", "Sense of Humour", opts(["Serious", "Funny", "Hilarious"]), 1)],
    results: [["camels", "You're Worth (Camels)", "n"], ["goats", "Or in Goats", "n"], ["percentile", "Camel Percentile", "n"]],
    fn: E.camel, ex: { age: 25, hairLength: 2, hairColor: 1, eyeColor: 0, height: 1, build: 1, cooking: 1, humour: 1 },
    exText: (o) => `Example: a 25-year-old who cooks decently and has a good sense of humour is "worth" ${o.camels} camels.`,
    how: "Answer the questions and laugh at the result. It's a joke that went viral online — people are not property and can't be priced in camels or anything else.",
    assume: "A made-up points score with no real meaning; cooking and humour score highest because they matter most.",
    faq: [["Where does the camel joke come from?", "A long-running internet meme about tourists being offered camels; this is a light-hearted version."]],
  }),
  mk({
    slug: "male-delusion-calculator", title: "Male Delusion Calculator (How Rare Is Your Ideal Man?)",
    desc: "See what share of US men match your dating checklist — age range, minimum height, minimum income, single and not obese — using US Census and CDC data, and how many men that really is.",
    meta: "Male Delusion Calculator — What % of Men Meet Your Standards?",
    inputs: [num("minAge", "Minimum Age", 25, 85, 1, 18), num("maxAge", "Maximum Age", 35, 85, 1, 18), dropdown("heightUnit", "Height Unit", opts(["Inches", "Centimeters"]), 0), num("minHeight", "Minimum Height (72 in = 6 ft)", 72, 230, 0.5), { key: "minIncome", label: "Minimum Yearly Income", type: "currency", required: true, default: 100000, min: 0, max: 10000000, step: 1000 }, dropdown("single", "Must Be Unmarried?", opts(["No", "Yes"]), 1), dropdown("notObese", "Exclude Obese Men?", opts(["No", "Yes"]), 1)],
    results: [["percentOfMenInAgeRange", "Men in Your Age Range Who Match (%)", "n"], ["menWhoMatch", "Number of US Men Who Match", "n"], ["oneIn", "That's 1 in …", "n"], ["menInAgeRange", "US Men in Your Age Range", "n"], ["heightSharePercent", "Tall Enough (%)", "n"], ["incomeSharePercent", "Earn Enough (%)", "n"], ["singleSharePercent", "Unmarried (%)", "n"]],
    fn: E.maleDelusion, ex: { minAge: 25, maxAge: 35, heightUnit: 0, minHeight: 72, minIncome: 100000, single: 1, notObese: 1 },
    exText: (o) => `Example: single, non-obese men aged 25–35 who are 6 ft+ and earn $100,000+ are about ${o.percentOfMenInAgeRange}% of men that age — roughly 1 in ${o.oneIn}.`,
    how: "Set your must-haves. The result shows how quickly each extra requirement shrinks the pool — a light-hearted reality check, not a judgement of anyone's preferences.",
    assume: "US male population by age (Census estimates); height normal with mean 69.1 in and SD 2.9 in (CDC); earnings log-normal with a $55,000 median, about 75% of men earning; obesity about 42% (CDC); unmarried shares by age (Census). Traits are treated as independent, which they aren't exactly.",
    faq: [["What percentage of men are 6 feet tall?", "About 15% of US adult men."], ["What percentage of men earn over $100,000?", "Roughly 15–20% of US men."]],
  }),
  mk({
    slug: "toji-anime-physique-calculator", title: "Anime Physique Calculator (Toji-Style Body Goal)",
    desc: "See how close you are to a lean, heavily muscled anime-hero physique like Toji's — your fat-free mass index (FFMI), lean mass to gain, fat to lose and a target weight.",
    meta: "Toji Anime Physique Calculator — How Close Is Your Body?",
    inputs: [dropdown("units", "Units", opts(["US (in, lb)", "Metric (cm, kg)"]), 0), num("height", "Height", 70, 250, 0.5, 40), num("weight", "Weight", 180, 1000, 0.5, 30), pct("bodyFat", "Body Fat (estimate)", 18, 60, 0.5)],
    results: [["physiqueMatchPercent", "Physique Match (%)", "n"], ["ffmi", "Your FFMI", "n"], ["leanMassToGain", "Lean Mass to Gain", "n"], ["fatToLose", "Fat to Lose", "n"], ["targetWeight", "Target Weight at ~9% Body Fat", "n"], ["currentLeanMass", "Current Lean Mass", "n"]],
    fn: E.animePhysique, ex: { units: 0, height: 70, weight: 180, bodyFat: 18 },
    exText: (o) => `Example: a 5 ft 10 in, 180 lb man at 18% body fat has an FFMI of ${o.ffmi} — about ${o.physiqueMatchPercent}% of the way to a lean FFMI-25 'anime' physique.`,
    how: "Enter your height, weight and an honest body-fat estimate. The anime look combines very high muscle (FFMI around 25) with low body fat (about 8–10%), which takes years of training — and many drawn physiques are exaggerated beyond what is naturally possible.",
    assume: "FFMI = lean mass (kg) ÷ height (m)² + 6.1 × (1.8 − height), normalised to 1.8 m. Target FFMI 25 at 9% body fat. Toji is a fictional character (Jujutsu Kaisen); this fan calculator is unofficial.",
    faq: [["What is a good FFMI?", "About 20–22 for trained men; 25 is near the natural upper limit."], ["Can you naturally look like an anime character?", "Some physiques are reachable with years of training; many are drawn beyond human limits."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-arts-entertainment-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      // Published straight away (user, 6 Nov 2026: no tool should stay Draft).
      await prisma.tool.create({
        data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all published.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
