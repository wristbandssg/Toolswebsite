/**
 * Batch: "Arts & Entertainment Calculators" → Music Theory, Instrument & Audio Calculators
 * (music theory tools).
 *
 * Data / methods:
 *  - Notes are pitch classes 0–11 (C = 0). Results that are notes or names return an index that the
 *    page shows through a result "labels" list (format "label"); index NONE shows "—".
 *  - Chord formulas in semitones above the root (major 0-4-7, minor 0-3-7, dominant 7th 0-4-7-10 …).
 *  - Interval names by semitone count (0–24). Inversion of a simple interval = 12 − n.
 *  - Equal temperament: f = A4 × 2^((midi − 69) / 12); MIDI 60 = C4. Speed of sound 343 m/s.
 *  - Key signatures by circle of fifths (major keys; minor = relative major 3 semitones up).
 *  - Diatonic triads: major key I ii iii IV V vi vii°; natural minor i ii° III iv v VI VII
 *    (harmonic minor raises the 7th, giving V and vii°).
 *  - Pitch-class sets: normal form (most packed rotation, Rahn tie-break), prime form = more packed of
 *    normal form and its inversion, interval-class vector.
 *  - Guitar chords use movable CAGED E-shape (root on 6th string) and A-shape (root on 5th string)
 *    voicings, whichever sits lower on the neck.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-arts-theory-calculators.ts for the copy.
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
const pc = (n: number) => ((Math.round(n) % 12) + 12) % 12;

export const NOTE_NAMES = ["C", "C♯ / D♭", "D", "D♯ / E♭", "E", "F", "F♯ / G♭", "G", "G♯ / A♭", "A", "A♯ / B♭", "B"];
export const NONE = 12;
/** Labels for note results: 0–11 notes, 12 = "—". */
export const NOTE_LABELS = [...NOTE_NAMES, "—"];

// ---------- Chords ----------
export const CHORDS: [string, string, number[]][] = [
  ["Major", "", [0, 4, 7]], ["Minor", "m", [0, 3, 7]], ["Diminished", "°", [0, 3, 6]], ["Augmented", "+", [0, 4, 8]], ["Suspended 2nd", "sus2", [0, 2, 7]], ["Suspended 4th", "sus4", [0, 5, 7]], ["Power chord (5)", "5", [0, 7]],
  ["Major 6th", "6", [0, 4, 7, 9]], ["Minor 6th", "m6", [0, 3, 7, 9]], ["Dominant 7th", "7", [0, 4, 7, 10]], ["Major 7th", "maj7", [0, 4, 7, 11]], ["Minor 7th", "m7", [0, 3, 7, 10]], ["Minor-major 7th", "m(maj7)", [0, 3, 7, 11]], ["Half-diminished 7th", "m7♭5", [0, 3, 6, 10]], ["Diminished 7th", "°7", [0, 3, 6, 9]], ["Augmented 7th", "+7", [0, 4, 8, 10]], ["7th suspended 4th", "7sus4", [0, 5, 7, 10]],
  ["Add 9", "add9", [0, 4, 7, 2]], ["Dominant 9th", "9", [0, 4, 7, 10, 2]], ["Major 9th", "maj9", [0, 4, 7, 11, 2]], ["Minor 9th", "m9", [0, 3, 7, 10, 2]],
];
const notesOut = (notes: number[], n = 5, prefix = "note") => Object.fromEntries([...Array(n)].map((_, i) => [`${prefix}${i + 1}`, notes[i] === undefined ? NONE : pc(notes[i])]));

export const chord: CustomCalculator = (v) => {
  const root = pc(v.root);
  const [, , iv] = CHORDS[pick(v.chordType, CHORDS.length)];
  return { ...notesOut(iv.map((s) => root + s)), noteCount: iv.length, rootNote: root };
};

export const INVERTIBLE = CHORDS.filter(([name, , iv]) => (iv.length === 3 || iv.length === 4) && name !== "Add 9");
export const FIGURES_TRIAD = ["Root position (5/3)", "1st inversion (6/3, “6”)", "2nd inversion (6/4)"];
export const FIGURES_SEVENTH = ["Root position (7)", "1st inversion (6/5)", "2nd inversion (4/3)", "3rd inversion (4/2)"];
export const INVERSION_FIGURES = ["5/3 (root position)", "6/3 (1st inversion)", "6/4 (2nd inversion)", "7 (root position)", "6/5 (1st inversion)", "4/3 (2nd inversion)", "4/2 (3rd inversion)"];
export const chordInversion: CustomCalculator = (v) => {
  const root = pc(v.root);
  const iv = INVERTIBLE[pick(v.chordType, INVERTIBLE.length)][2];
  const inv = Math.min(iv.length - 1, pick(v.inversion, 4));
  const notes = iv.map((s) => root + s);
  const voiced = [...notes.slice(inv), ...notes.slice(0, inv)];
  return { bassNote: pc(voiced[0]), ...notesOut(voiced, 4), figure: (iv.length === 3 ? 0 : 3) + inv, inversionUsed: inv };
};

// ---------- Intervals ----------
export const INTERVAL_NAMES = ["Unison (P1)", "Minor 2nd (m2)", "Major 2nd (M2)", "Minor 3rd (m3)", "Major 3rd (M3)", "Perfect 4th (P4)", "Tritone (A4 / d5)", "Perfect 5th (P5)", "Minor 6th (m6)", "Major 6th (M6)", "Minor 7th (m7)", "Major 7th (M7)", "Octave (P8)", "Minor 9th (m9)", "Major 9th (M9)", "Minor 10th (m10)", "Major 10th (M10)", "Perfect 11th (P11)", "Augmented 11th (A11)", "Perfect 12th (P12)", "Minor 13th (m13)", "Major 13th (M13)", "Minor 14th (m14)", "Major 14th (M14)", "Double octave (P15)", "Wider than two octaves"];
const JUST = ["1:1", "16:15", "9:8", "6:5", "5:4", "4:3", "45:32", "3:2", "8:5", "5:3", "16:9", "15:8"];
export const JUST_LABELS = JUST;
export const interval: CustomCalculator = (v) => {
  const a = pc(v.note1) + 12 * Math.round(safeNumber(v.octave1, 4));
  const b = pc(v.note2) + 12 * Math.round(safeNumber(v.octave2, 4));
  const semis = Math.abs(b - a);
  const simple = semis % 12;
  return { intervalName: Math.min(semis, 25), semitones: semis, simpleInterval: semis === 12 ? 12 : simple, inversion: simple === 0 ? (semis === 0 ? 12 : 0) : 12 - simple, isCompound: semis > 12 ? 1 : 0, frequencyRatio: Math.round(Math.pow(2, semis / 12) * 1000) / 1000, justRatio: simple, cents: semis * 100 };
};

// ---------- Transposition & capo ----------
export const transpose: CustomCalculator = (v) => {
  const from = pc(v.fromKey);
  const shift = pick(v.mode, 2) === 0 ? ((pc(v.toKey) - from + 18) % 12) - 6 : Math.round(safeNumber(v.semitones));
  const out: Record<string, number> = { newKey: pc(from + shift), semitoneShift: shift };
  for (let i = 1; i <= 6; i++) {
    const n = Math.round(safeNumber(v[`chord${i}`], NONE));
    out[`chord${i}New`] = n >= NONE || n < 0 ? NONE : pc(n + shift);
  }
  return out;
};

export const capo: CustomCalculator = (v) => {
  const shape = pc(v.shapeKey);
  if (pick(v.mode, 2) === 0) {
    const fret = Math.min(12, Math.round(nonNeg(v.capoFret)));
    return { soundingKey: pc(shape + fret), capoFret: fret, shapeKey: shape };
  }
  const fret = (pc(v.targetKey) - shape + 12) % 12;
  return { capoFret: fret, soundingKey: pc(v.targetKey), shapeKey: shape };
};

// ---------- Guitar chord shapes ----------
const X = -1;
/** [chord quality, E-shape frets (6th→1st string, relative to root fret), A-shape frets]. */
export const GUITAR: [string, string, number[], number[]][] = [
  ["Major", "", [0, 2, 2, 1, 0, 0], [X, 0, 2, 2, 2, 0]], ["Minor", "m", [0, 2, 2, 0, 0, 0], [X, 0, 2, 2, 1, 0]], ["Dominant 7th", "7", [0, 2, 0, 1, 0, 0], [X, 0, 2, 0, 2, 0]], ["Major 7th", "maj7", [0, X, 1, 1, 0, X], [X, 0, 2, 1, 2, 0]], ["Minor 7th", "m7", [0, 2, 0, 0, 0, 0], [X, 0, 2, 0, 1, 0]],
  ["Suspended 2nd", "sus2", [0, 2, 4, 4, 0, 0], [X, 0, 2, 2, 0, 0]], ["Suspended 4th", "sus4", [0, 2, 2, 2, 0, 0], [X, 0, 2, 2, 3, 0]], ["Diminished", "°", [0, 1, 2, 0, X, X], [X, 0, 1, 2, 1, X]], ["Power chord (5)", "5", [0, 2, 2, X, X, X], [X, 0, 2, 2, X, X]],
];
/** Labels for fret results: index 0 = muted "x", index k = fret k − 1. */
export const FRET_LABELS = ["x (muted)", ...[...Array(24)].map((_, i) => (i === 0 ? "0 (open)" : String(i)))];
export const guitarChord: CustomCalculator = (v) => {
  const root = pc(v.root);
  const [, , eShape, aShape] = GUITAR[pick(v.chordType, GUITAR.length)];
  const eFret = (root - 4 + 12) % 12;
  const aFret = (root - 9 + 12) % 12;
  const pref = pick(v.shape, 3); // 0 lowest, 1 E-shape, 2 A-shape
  const useA = pref === 2 || (pref === 0 && aFret < eFret);
  const base = useA ? aFret : eFret;
  const shape = useA ? aShape : eShape;
  const out: Record<string, number> = { shapeUsed: useA ? 1 : 0, baseFret: base };
  shape.forEach((f, i) => { out[`string${6 - i}`] = f === X ? 0 : base + f + 1; });
  return out;
};

// ---------- Keys, scales and harmony ----------
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10];
const HARM_MINOR = [0, 2, 3, 5, 7, 8, 11];
export const SCALES: [string, number[]][] = [
  ["Major (Ionian)", MAJOR], ["Natural minor (Aeolian)", NAT_MINOR], ["Harmonic minor", HARM_MINOR], ["Melodic minor (ascending)", [0, 2, 3, 5, 7, 9, 11]], ["Dorian", [0, 2, 3, 5, 7, 9, 10]], ["Phrygian", [0, 1, 3, 5, 7, 8, 10]], ["Lydian", [0, 2, 4, 6, 7, 9, 11]], ["Mixolydian", [0, 2, 4, 5, 7, 9, 10]], ["Locrian", [0, 1, 3, 5, 6, 8, 10]],
  ["Major pentatonic", [0, 2, 4, 7, 9]], ["Minor pentatonic", [0, 3, 5, 7, 10]], ["Blues", [0, 3, 5, 6, 7, 10]], ["Whole tone", [0, 2, 4, 6, 8, 10]], ["Phrygian dominant", [0, 1, 4, 5, 7, 8, 10]], ["Hungarian minor", [0, 2, 3, 6, 7, 8, 11]],
];
export const scale: CustomCalculator = (v) => {
  const root = pc(v.root);
  const [, iv] = SCALES[pick(v.scaleType, SCALES.length)];
  return { ...notesOut(iv.map((s) => root + s), 7), noteCount: iv.length, sharedWithMajor: iv.filter((s) => MAJOR.includes(s)).length };
};

/** Signed accidentals for each major tonic pitch class (+ sharps, − flats). F♯ is shown as 6 sharps. */
const MAJOR_SIG = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
export const SIGNATURE_LABELS = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map((n) => (n === 0 ? "No sharps or flats" : n > 0 ? `${n} sharp${n > 1 ? "s" : ""}: ${"F♯ C♯ G♯ D♯ A♯ E♯ B♯".split(" ").slice(0, n).join(" ")}` : `${-n} flat${n < -1 ? "s" : ""}: ${"B♭ E♭ A♭ D♭ G♭ C♭ F♭".split(" ").slice(0, -n).join(" ")}`));
export const keySignature: CustomCalculator = (v) => {
  const tonic = pc(v.tonic);
  const minor = pick(v.mode, 2) === 1;
  const relMajor = minor ? pc(tonic + 3) : tonic;
  const sig = MAJOR_SIG[relMajor];
  return { signature: sig + 7, sharps: Math.max(0, sig), flats: Math.max(0, -sig), relativeKey: minor ? relMajor : pc(tonic + 9), parallelKeySignature: (minor ? MAJOR_SIG[tonic] : MAJOR_SIG[pc(tonic + 3)]) + 7, dominantKey: pc(tonic + 7) };
};

/** Chord-name labels: index = root × 4 + quality (0 major, 1 minor, 2 diminished, 3 augmented). */
export const CHORD_NAME_LABELS = NOTE_NAMES.flatMap((n) => [n, `${n}m`, `${n}°`, `${n}+`]);
const triadQuality = (iv: number[], deg: number) => {
  const r = iv[deg % 7];
  const third = (iv[(deg + 2) % 7] - r + 12) % 12;
  const fifth = (iv[(deg + 4) % 7] - r + 12) % 12;
  return third === 4 ? (fifth === 8 ? 3 : 0) : fifth === 6 ? 2 : 1;
};
export const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
/** Roman-numeral labels: index = degree × 4 + quality. */
export const NUMERAL_LABELS = NUMERALS.flatMap((n) => [n, n.toLowerCase(), `${n.toLowerCase()}°`, `${n}+`]);
export const PROGRESSIONS: [string, number[]][] = [
  ["I – V – vi – IV (pop)", [0, 4, 5, 3]], ["I – IV – V – I", [0, 3, 4, 0]], ["ii – V – I – I (jazz)", [1, 4, 0, 0]], ["I – vi – IV – V (50s)", [0, 5, 3, 4]], ["vi – IV – I – V", [5, 3, 0, 4]], ["I – IV – vi – V", [0, 3, 5, 4]], ["IV – V – iii – vi (royal road)", [3, 4, 2, 5]], ["i – VI – III – VII (minor)", [0, 5, 2, 6]], ["i – iv – v – i (minor)", [0, 3, 4, 0]], ["i – VII – VI – V (Andalusian)", [0, 6, 5, 4]],
];
export const chordProgression: CustomCalculator = (v) => {
  const key = pc(v.key);
  const mode = pick(v.mode, 3);
  const iv = [MAJOR, NAT_MINOR, HARM_MINOR][mode];
  const [, degs] = PROGRESSIONS[pick(v.progression, PROGRESSIONS.length)];
  const out: Record<string, number> = {};
  degs.forEach((d, i) => {
    const q = triadQuality(iv, d);
    out[`chord${i + 1}`] = pc(key + iv[d]) * 4 + q;
    out[`numeral${i + 1}`] = d * 4 + q;
  });
  // Analyse one chord against the key.
  const cRoot = pc(v.analyzeRoot);
  const cQual = pick(v.analyzeQuality, 4);
  const deg = iv.findIndex((s) => pc(key + s) === cRoot);
  out.analysisNumeral = deg >= 0 ? deg * 4 + cQual : 28;
  out.analysisDiatonic = deg >= 0 && triadQuality(iv, deg) === cQual ? 1 : 0;
  return out;
};

export const secondaryDominant: CustomCalculator = (v) => {
  const key = pc(v.key);
  const target = pick(v.target, 6) + 1; // degrees ii..vii (1..6 in 0-based)
  const minor = pick(v.mode, 2) === 1;
  const iv = minor ? NAT_MINOR : MAJOR;
  const targetRoot = pc(key + iv[target]);
  const dom = pc(targetRoot + 7);
  const lt = pc(targetRoot + 11);
  return { targetChord: targetRoot * 4 + triadQuality(iv, target), dominantRoot: dom, note1: dom, note2: pc(dom + 4), note3: pc(dom + 7), note4: pc(dom + 10), leadingToneDim7Root: lt, resolvesTo: targetRoot };
};

export const FIGURES: [string, number[]][] = [["5/3 (root position triad)", [2, 4]], ["6/3 or 6 (1st inversion triad)", [2, 5]], ["6/4 (2nd inversion triad)", [3, 5]], ["7 (root position 7th)", [2, 4, 6]], ["6/5 (1st inversion 7th)", [2, 4, 5]], ["4/3 (2nd inversion 7th)", [2, 3, 5]], ["4/2 or 2 (3rd inversion 7th)", [1, 3, 5]]];
/** Scale step above the bass that is the chord root, for each figure. */
const ROOT_STEP = [0, 5, 3, 0, 5, 3, 1];
export const figuredBass: CustomCalculator = (v) => {
  const key = pc(v.key);
  const iv = pick(v.mode, 2) === 1 ? HARM_MINOR : MAJOR;
  const deg = pick(v.bassDegree, 7);
  const fig = pick(v.figure, FIGURES.length);
  const steps = FIGURES[fig][1];
  const at = (s: number) => pc(key + iv[(deg + s) % 7]);
  const rootStep = ROOT_STEP[fig];
  const rootDeg = (deg + rootStep) % 7;
  return { bassNote: at(0), ...notesOut(steps.map((s) => at(s) as number), 3, "upper"), chordRoot: at(rootStep), romanNumeral: rootDeg * 4 + triadQuality(iv, rootDeg) };
};

// ---------- Pitch & frequency ----------
export const noteFrequency: CustomCalculator = (v) => {
  const a4 = nonNeg(v.a4, 440) || 440;
  if (pick(v.mode, 2) === 1) {
    const f = nonNeg(v.frequency, 440) || 440;
    const midiExact = 69 + 12 * Math.log2(f / a4);
    const midi = Math.round(midiExact);
    return { nearestNote: pc(midi), octave: Math.floor(midi / 12) - 1, centsOff: Math.round((midiExact - midi) * 100), midiNumber: midi, frequencyHz: round2(f), periodMs: round2(1000 / f), wavelengthM: round2(343 / f) };
  }
  const midi = pc(v.note) + 12 * (Math.round(safeNumber(v.octave, 4)) + 1);
  const f = a4 * Math.pow(2, (midi - 69) / 12);
  return { frequencyHz: round2(f), nearestNote: pc(midi), octave: Math.round(safeNumber(v.octave, 4)), centsOff: 0, midiNumber: midi, periodMs: round2(1000 / f), wavelengthM: round2(343 / f) };
};

// ---------- Pitch-class sets ----------
const span = (s: number[]) => (s[s.length - 1] - s[0] + 12) % 12;
function mostPacked(sets: number[][]) {
  return sets.reduce((best, s) => {
    for (let k = s.length - 1; k >= 1; k--) {
      const a = (s[k] - s[0] + 12) % 12;
      const b = (best[k] - best[0] + 12) % 12;
      if (a !== b) return a < b ? s : best;
    }
    return best;
  });
}
function normalForm(pcs: number[]) {
  const s = [...new Set(pcs.map(pc))].sort((a, b) => a - b);
  if (s.length < 2) return s;
  const rots = s.map((_, i) => [...s.slice(i), ...s.slice(0, i)]);
  const min = Math.min(...rots.map(span));
  return mostPacked(rots.filter((r) => span(r) === min));
}
export const PC_LABELS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "T (10)", "E (11)", "—"];
export const pcSet: CustomCalculator = (v) => {
  const pcs = [1, 2, 3, 4, 5, 6].map((i) => Math.round(safeNumber(v[`pc${i}`], NONE))).filter((n) => n >= 0 && n < 12);
  const nf = normalForm(pcs);
  const out: Record<string, number> = { cardinality: nf.length };
  if (nf.length === 0) return out;
  const t0 = nf.map((n) => (n - nf[0] + 12) % 12);
  const inv = normalForm(nf.map((n) => 12 - n));
  const i0 = inv.map((n) => (n - inv[0] + 12) % 12);
  const prime = nf.length < 2 ? t0 : mostPacked([t0, i0]);
  for (let i = 0; i < 6; i++) {
    out[`normal${i + 1}`] = nf[i] ?? NONE;
    out[`prime${i + 1}`] = prime[i] ?? NONE;
  }
  const icv = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < nf.length; i++) for (let j = i + 1; j < nf.length; j++) { const d = Math.abs(nf[i] - nf[j]) % 12; const ic = Math.min(d, 12 - d); if (ic > 0) icv[ic - 1]++; }
  icv.forEach((c, i) => { out[`ic${i + 1}`] = c; });
  return out;
};

export const artsTheoryCustomCalculators: Record<string, CustomCalculator> = {
  "chord-calculator": chord,
  "interval-calculator": interval,
  "transpose-key-calculator": transpose,
  "guitar-chord-calculator": guitarChord,
  "chord-inversion-calculator": chordInversion,
  "capo-calculator": capo,
  "chord-progression-calculator": chordProgression,
  "note-frequency-calculator": noteFrequency,
  "figured-bass-calculator": figuredBass,
  "secondary-dominant-calculator": secondaryDominant,
  "key-signature-calculator": keySignature,
  "pc-set-calculator": pcSet,
  "music-scale-calculator": scale,
};
