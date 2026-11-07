// One-time (but safe to re-run) batch setup script: creates 13 music theory calculators in
// Arts & Entertainment Calculators > Music Theory, Instrument & Audio Calculators. Formulas live in
// src/lib/calc-engine-arts-theory.ts; examples are computed from the engine. Note and chord names
// use the "label" result format (the engine returns an index into the line's labels list).
//
// HOW TO RUN (after prisma/setup-arts-entertainment-category.ts --apply)
//   npx tsx prisma/create-arts-theory-calculators.ts
// or
//   npm run db:create-arts-theory-calculators

import * as E from "../src/lib/calc-engine-arts-theory";

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
const FMT = { n: "number", l: "label" } as const;
/** [key, label, format, labels for "l" lines]. */
type Line = [key: string, label: string, fmt: keyof typeof FMT, labels?: string[]];
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
/** Shows an index the way the page will (labels[index], "—" when out of range). */
const L = (labels: string[], i: number) => labels[Math.round(i)] ?? "—";

const CAT = "music-theory-instrument-audio-calculators";
const NOTE = "Results use equal temperament and standard Western music theory; enharmonic spellings (C♯ / D♭) are shown together — pick the spelling that fits the key you are writing in.";

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

const N = E.NOTE_LABELS;
const NOTE_OPTS = opts(E.NOTE_NAMES);
const noteDD = (key: string, label: string, def: number) => dropdown(key, label, NOTE_OPTS, def);
const noteOrNone = (key: string, label: string, def: number) => dropdown(key, label, [...NOTE_OPTS, ["— (none)", E.NONE]], def);
const OCT = (key: string, label: string, def: number) => num(key, label, def, 9, 1, 0);
const noteLines = (n: number, prefix = "note", label = "Note") => [...Array(n)].map((_, i) => [`${prefix}${i + 1}`, `${label} ${i + 1}`, "l", N] as Line);
const CH = E.CHORD_NAME_LABELS;
const RN = E.NUMERAL_LABELS;

const TOOLS: ToolDef[] = [
  mk({
    slug: "chord-calculator", title: "Chord Calculator (Notes in Any Chord)",
    desc: "Find the notes in any chord — major, minor, diminished, augmented, sus, 6th, 7th and 9th chords, triads and seventh chords — for any root, with the chord formula.",
    meta: "Chord Calculator — Notes in Triads, 7th and 9th Chords",
    inputs: [noteDD("root", "Root Note", 0), dropdown("chordType", "Chord Type", opts(E.CHORDS.map(([n, s]) => `${n}${s ? ` (${s})` : ""}`)), 9)],
    results: [...noteLines(5), ["noteCount", "Notes in the Chord", "n"], ["rootNote", "Root", "l", N]],
    fn: E.chord, ex: { root: 7, chordType: 9 },
    exText: (o) => `Example: G7 (G dominant 7th) is ${[o.note1, o.note2, o.note3, o.note4].map((i) => L(N, i)).join(", ")}.`,
    how: "Choose the root and chord type. Notes are listed from the root up. Triads have three notes, seventh chords four and ninth chords five (the 9th is the 2nd an octave higher).\n\nOn a piano, play the notes from the root upwards; for guitar fingerings use the Guitar Chord Calculator.",
    assume: "Chord formulas in semitones: major 0-4-7, minor 0-3-7, diminished 0-3-6, augmented 0-4-8, dominant 7th 0-4-7-10, major 7th 0-4-7-11, minor 7th 0-3-7-10, half-diminished 0-3-6-10, diminished 7th 0-3-6-9, 9th chords add 14.",
    faq: [["What notes are in a C major chord?", "C, E and G — the root, major 3rd and perfect 5th."], ["What is the difference between a 7 and a maj7 chord?", "A dominant 7 adds a minor 7th (C7 has B♭); a major 7 adds a major 7th (Cmaj7 has B)."]],
  }),
  mk({
    slug: "interval-calculator", title: "Music Interval Calculator (Semitones, Names & Inversions)",
    desc: "Find the interval between two notes — its name, number of semitones, simple and compound form, inversion, cents and frequency ratio in equal temperament and just intonation.",
    meta: "Interval Calculator — Semitones, Interval Name & Inversion",
    inputs: [noteDD("note1", "Lower Note", 0), OCT("octave1", "Lower Note Octave", 4), noteDD("note2", "Upper Note", 7), OCT("octave2", "Upper Note Octave", 4)],
    results: [["intervalName", "Interval", "l", E.INTERVAL_NAMES], ["semitones", "Semitones", "n"], ["simpleInterval", "Simple Interval (within an octave)", "l", E.INTERVAL_NAMES], ["inversion", "Inversion", "l", E.INTERVAL_NAMES], ["isCompound", "Compound Interval (1 = yes)", "n"], ["cents", "Cents (equal temperament)", "n"], ["frequencyRatio", "Frequency Ratio (equal temperament)", "n"], ["justRatio", "Just-Intonation Ratio", "l", E.JUST_LABELS]],
    fn: E.interval, ex: { note1: 0, octave1: 4, note2: 4, octave2: 5 },
    exText: (o) => `Example: from C4 up to E5 is ${o.semitones} semitones — a ${L(E.INTERVAL_NAMES, o.intervalName)}; its simple form is a ${L(E.INTERVAL_NAMES, o.simpleInterval)}, which inverts to a ${L(E.INTERVAL_NAMES, o.inversion)}.`,
    how: "Choose the two notes and their octaves (middle C is C4). The calculator counts semitones and names the interval; intervals larger than an octave are compound (a 10th is an octave plus a 3rd).\n\nTo invert an interval, move the lower note up an octave: thirds become sixths, fourths become fifths.",
    assume: "Interval names use the most common spelling for each semitone count (6 semitones is shown as a tritone, which can be an augmented 4th or diminished 5th). Equal-temperament ratio = 2^(semitones ÷ 12).",
    faq: [["How many semitones is a perfect fifth?", "Seven."], ["What is the inversion of a major 3rd?", "A minor 6th — the two always add up to 12 semitones."]],
  }),
  mk({
    slug: "transpose-key-calculator", title: "Transpose Key Calculator (Change the Key of a Song)",
    desc: "Transpose a song or chord progression to a new key — by target key or number of semitones — and get the new root of up to six chords.",
    meta: "Transpose Key Calculator — Transpose Chords to a New Key",
    inputs: [noteDD("fromKey", "Original Key", 7), dropdown("mode", "Transpose By", opts(["Target key", "Number of semitones"]), 0), noteDD("toKey", "New Key", 2), num("semitones", "Semitones (+ up / − down)", 2, 11, 1, -11), noteOrNone("chord1", "Chord 1 Root", 7), noteOrNone("chord2", "Chord 2 Root", 2), noteOrNone("chord3", "Chord 3 Root", 4), noteOrNone("chord4", "Chord 4 Root", 0), noteOrNone("chord5", "Chord 5 Root", E.NONE), noteOrNone("chord6", "Chord 6 Root", E.NONE)],
    results: [["newKey", "New Key", "l", N], ["semitoneShift", "Shift (semitones)", "n"], ...[1, 2, 3, 4, 5, 6].map((i) => [`chord${i}New`, `Chord ${i} — New Root`, "l", N] as Line)],
    fn: E.transpose, ex: { fromKey: 7, mode: 0, toKey: 2, semitones: 2, chord1: 7, chord2: 2, chord3: 4, chord4: 0, chord5: E.NONE, chord6: E.NONE },
    exText: (o) => `Example: G – D – Em – C moved from G to D (${o.semitoneShift} semitones) becomes ${L(N, o.chord1New)} – ${L(N, o.chord2New)} – ${L(N, o.chord3New)}m – ${L(N, o.chord4New)}.`,
    how: "Enter the song's key and the key you want, or a number of semitones. List the chord roots; keep each chord's quality (m, 7, maj7) the same after transposing.\n\nWhen changing key for a singer, the smallest move (up to 6 semitones) is chosen automatically.",
    assume: "Transposition moves every note by the same number of semitones. With a target key, the shorter direction (−5 to +6) is used.",
    faq: [["How do I transpose a song up a whole step?", "Move every chord up 2 semitones — G becomes A, C becomes D, Em becomes F♯m."], ["Does transposing change the chord types?", "No; only the roots move. Minor chords stay minor."]],
  }),
  mk({
    slug: "guitar-chord-calculator", title: "Guitar Chord Calculator (Fret Positions for Any Chord)",
    desc: "Get a guitar chord shape for any root and chord type — major, minor, 7, maj7, m7, sus, diminished and power chords — as fret numbers for all six strings using movable E- and A-shape voicings.",
    meta: "Guitar Chord Calculator — Fret Positions for Any Chord",
    inputs: [noteDD("root", "Chord Root", 0), dropdown("chordType", "Chord Type", opts(E.GUITAR.map(([n, s]) => `${n}${s ? ` (${s})` : ""}`)), 0), dropdown("shape", "Shape", opts(["Lowest on the neck", "E-shape (root on 6th string)", "A-shape (root on 5th string)"]), 0)],
    results: [["string6", "6th String (low E)", "l", E.FRET_LABELS], ["string5", "5th String (A)", "l", E.FRET_LABELS], ["string4", "4th String (D)", "l", E.FRET_LABELS], ["string3", "3rd String (G)", "l", E.FRET_LABELS], ["string2", "2nd String (B)", "l", E.FRET_LABELS], ["string1", "1st String (high E)", "l", E.FRET_LABELS], ["baseFret", "Barre / Root Fret", "n"], ["shapeUsed", "Shape Used", "l", ["E-shape", "A-shape"]]],
    fn: E.guitarChord, ex: { root: 0, chordType: 0, shape: 0 },
    exText: (o) => `Example: C major as an ${L(["E-shape", "A-shape"], o.shapeUsed)} is ${[o.string6, o.string5, o.string4, o.string3, o.string2, o.string1].map((i) => L(E.FRET_LABELS, i).split(" ")[0]).join("-")} (low E to high E).`,
    how: "Choose the chord and, if you like, the shape. Fret numbers run from the low E string to the high E; 'x' means don't play that string and 0 means open.\n\nWhen the root fret is above 0, barre that fret with your first finger.",
    assume: "Standard tuning (E A D G B E). Shapes are the movable CAGED E- and A-shape voicings; open-position versions appear when the root fret is 0. Some shapes (maj7, sus2 E-shape) are stretches — try the other shape if one is awkward.",
    faq: [["How do I play a B♭ chord on guitar?", "As an A-shape barre at the 1st fret: x-1-3-3-3-1."], ["What is an E-shape barre chord?", "The open E chord moved up the neck with a barre — the root is on the 6th string."]],
  }),
  mk({
    slug: "chord-inversion-calculator", title: "Chord Inversion Calculator (Triad & Seventh Chord Inversions)",
    desc: "Find the notes of a chord in root position, first, second or third inversion — bass note, voicing order and figured-bass symbol for triads and seventh chords.",
    meta: "Chord Inversion Calculator — Triad & 7th Chord Inversions",
    inputs: [noteDD("root", "Chord Root", 0), dropdown("chordType", "Chord Type", opts(E.INVERTIBLE.map(([n, s]) => `${n}${s ? ` (${s})` : ""}`)), 0), dropdown("inversion", "Inversion", opts(["Root position", "1st inversion", "2nd inversion", "3rd inversion (7th chords only)"]), 1)],
    results: [["bassNote", "Bass Note", "l", N], ...noteLines(4, "note", "Voice (low to high)"), ["figure", "Figured-Bass Symbol", "l", E.INVERSION_FIGURES]],
    fn: E.chordInversion, ex: { root: 0, chordType: 0, inversion: 1 },
    exText: (o) => `Example: C major in 1st inversion is ${[o.note1, o.note2, o.note3].map((i) => L(N, i)).join(" – ")} with ${L(N, o.bassNote)} in the bass — figured bass ${L(E.INVERSION_FIGURES, o.figure)}.`,
    how: "Pick the chord and inversion. In 1st inversion the 3rd is in the bass, in 2nd inversion the 5th, and (for 7th chords) in 3rd inversion the 7th. A 3rd inversion of a triad is shown as 2nd.",
    assume: "Voices are listed from the bass upwards in close position. Figured bass: triads 5/3, 6/3, 6/4; seventh chords 7, 6/5, 4/3, 4/2.",
    faq: [["What is a first inversion chord?", "A chord with its 3rd in the bass — C/E is C major in first inversion."], ["How many inversions does a seventh chord have?", "Three, plus root position."]],
  }),
  mk({
    slug: "capo-calculator", title: "Capo Calculator (Capo Position & Sounding Key)",
    desc: "Find where to put the capo to play in a new key with familiar chord shapes — or what key you're really playing in with a capo on a given fret.",
    meta: "Capo Calculator — Which Fret for the Key You Want",
    inputs: [dropdown("mode", "Work Out", opts(["Sounding key from capo fret", "Capo fret for a target key"]), 1), noteDD("shapeKey", "Key of the Chord Shapes You Play", 7), num("capoFret", "Capo Fret", 2, 12, 1), noteDD("targetKey", "Key You Want to Sound In", 9)],
    results: [["capoFret", "Capo Fret", "n"], ["soundingKey", "Sounding Key", "l", N], ["shapeKey", "Shape Key", "l", N]],
    fn: E.capo, ex: { mode: 1, shapeKey: 7, capoFret: 2, targetKey: 9 },
    exText: (o) => `Example: to sound in A while playing G shapes, put the capo on fret ${o.capoFret}.`,
    how: "Choose whether you know the capo fret or the key you want. Chord shapes stay the same; every fret moves the sound up a semitone.\n\nCommon shapes: G, C, D, A and E. Above about the 7th fret, a different shape key often sounds better.",
    assume: "Each capo fret raises pitch by one semitone; positions wrap after 12 frets.",
    faq: [["Capo on 2 playing G shapes — what key is that?", "A major."], ["What capo fret to play in E♭ with D shapes?", "Fret 1."]],
  }),
  mk({
    slug: "chord-progression-calculator", title: "Chord Progression Calculator (Roman Numeral Analysis)",
    desc: "Build common chord progressions in any key — I–V–vi–IV, ii–V–I, 12-bar blues starts, minor and Andalusian cadences — with Roman numerals, and analyse any chord's function in a key.",
    meta: "Chord Progression Calculator — Roman Numerals in Any Key",
    inputs: [noteDD("key", "Key", 0), dropdown("mode", "Mode", opts(["Major", "Natural minor", "Harmonic minor"]), 0), dropdown("progression", "Progression", opts(E.PROGRESSIONS.map(([n]) => n)), 0), noteDD("analyzeRoot", "Analyse a Chord — Root", 9), dropdown("analyzeQuality", "Analyse a Chord — Quality", opts(["Major", "Minor", "Diminished", "Augmented"]), 1)],
    results: [["chord1", "Chord 1", "l", CH], ["chord2", "Chord 2", "l", CH], ["chord3", "Chord 3", "l", CH], ["chord4", "Chord 4", "l", CH], ["numeral1", "Numeral 1", "l", RN], ["numeral2", "Numeral 2", "l", RN], ["numeral3", "Numeral 3", "l", RN], ["numeral4", "Numeral 4", "l", RN], ["analysisNumeral", "Your Chord's Roman Numeral", "l", RN], ["analysisDiatonic", "Your Chord Is Diatonic to the Key (1 = yes)", "n"]],
    fn: E.chordProgression, ex: { key: 0, mode: 0, progression: 0, analyzeRoot: 9, analyzeQuality: 1 },
    exText: (o) => `Example: I–V–vi–IV in C major is ${[o.chord1, o.chord2, o.chord3, o.chord4].map((i) => L(CH, i)).join(" – ")}; A minor in C major is ${L(RN, o.analysisNumeral)}.`,
    how: "Choose a key, mode and progression to get the chords. To analyse a chord, enter its root and quality — the calculator gives its Roman numeral in the key and whether it belongs to the key.\n\nUppercase numerals are major, lowercase minor, ° diminished and + augmented.",
    assume: "Diatonic triads from the major, natural minor and harmonic minor scales. A chord whose root is outside the scale shows '—'.",
    faq: [["What chords are in the key of C major?", "C, Dm, Em, F, G, Am and B°."], ["What is a ii–V–I?", "The most common jazz cadence — in C, Dm – G – C."]],
  }),
  mk({
    slug: "note-frequency-calculator", title: "Note Frequency Calculator (Note to Hz and Hz to Note)",
    desc: "Convert a musical note to its frequency in Hz — or a frequency to the nearest note and how many cents sharp or flat — with MIDI number, period and wavelength, for any A4 tuning.",
    meta: "Note Frequency Calculator — Note to Hz, Hz to Note & Cents",
    inputs: [dropdown("mode", "Convert", opts(["Note → frequency", "Frequency → note (tuner / drum tuning)"]), 0), noteDD("note", "Note", 9), OCT("octave", "Octave", 4), num("frequency", "Frequency (Hz)", 196, 20000, 0.01, 1), num("a4", "Reference Pitch A4 (Hz)", 440, 480, 0.1, 400)],
    results: [["frequencyHz", "Frequency (Hz)", "n"], ["nearestNote", "Note", "l", N], ["octave", "Octave", "n"], ["centsOff", "Cents Sharp (+) / Flat (−)", "n"], ["midiNumber", "MIDI Note Number", "n"], ["periodMs", "Period (ms)", "n"], ["wavelengthM", "Wavelength in Air (m)", "n"]],
    fn: E.noteFrequency, ex: { mode: 0, note: 9, octave: 4, frequency: 196, a4: 440 },
    exText: (o) => `Example: A4 is ${o.frequencyHz} Hz (MIDI ${o.midiNumber}), with a wavelength of about ${o.wavelengthM} m.`,
    how: "Choose a note and octave to get its frequency, or enter a frequency (for example from a drum tuner such as a Tune-Bot) to find the nearest note and how far off it is. Change A4 for orchestras that tune to 442 Hz or for 432 Hz tuning.",
    assume: "Equal temperament: f = A4 × 2^((MIDI − 69) ÷ 12), MIDI 60 = middle C (C4). Wavelength uses 343 m/s (20 °C).",
    faq: [["What is the frequency of middle C?", "About 261.63 Hz with A4 = 440 Hz."], ["How many cents is a semitone?", "100 cents."]],
  }),
  mk({
    slug: "figured-bass-calculator", title: "Figured Bass Calculator (Realize Figured Bass)",
    desc: "Realize a figured bass: pick the key, the bass note's scale degree and the figure (5/3, 6, 6/4, 7, 6/5, 4/3, 4/2) to get the upper notes, the chord root and its Roman numeral.",
    meta: "Figured Bass Calculator — Upper Notes, Root & Roman Numeral",
    inputs: [noteDD("key", "Key", 0), dropdown("mode", "Mode", opts(["Major", "Minor (harmonic)"]), 0), dropdown("bassDegree", "Bass Note Scale Degree", opts(["1 (tonic)", "2 (supertonic)", "3 (mediant)", "4 (subdominant)", "5 (dominant)", "6 (submediant)", "7 (leading tone)"]), 4), dropdown("figure", "Figure", opts(E.FIGURES.map(([n]) => n)), 4)],
    results: [["chordRoot", "Chord Root", "l", N], ["bassNote", "Bass Note", "l", N], ["upper1", "Upper Note 1", "l", N], ["upper2", "Upper Note 2", "l", N], ["upper3", "Upper Note 3", "l", N], ["romanNumeral", "Roman Numeral", "l", RN]],
    fn: E.figuredBass, ex: { key: 0, mode: 0, bassDegree: 6, figure: 4 },
    exText: (o) => `Example: in C major, a bass B with 6/5 gives ${L(N, o.upper1)}, ${L(N, o.upper2)} and ${L(N, o.upper3)} above — a ${L(N, o.chordRoot)} seventh chord (${L(RN, o.romanNumeral)}7) in 1st inversion.`,
    how: "Enter the key and which scale degree is in the bass, then the figure under the note. The upper notes are the diatonic intervals above the bass named by the figure; double or space them in your voice leading as needed.\n\nAccidentals in the figure (♯, ♭, slashes) are not covered — raise or lower the matching note yourself.",
    assume: "Upper notes are diatonic to the key; minor keys use the harmonic minor (raised 7th), so V and vii° are correct. Roman numerals show the triad quality of the chord root.",
    faq: [["What does 6/4 mean in figured bass?", "Notes a 6th and a 4th above the bass — a triad in second inversion."], ["What does 6/5 mean?", "A seventh chord in first inversion."]],
  }),
  mk({
    slug: "secondary-dominant-calculator", title: "Secondary Dominant Calculator (V/x Chords)",
    desc: "Find the secondary dominant of any chord in a key — V7/ii, V7/V, V7/vi and more — with its notes, the chord it resolves to and the matching leading-tone chord.",
    meta: "Secondary Dominant Calculator — V7 of Any Chord in a Key",
    inputs: [noteDD("key", "Key", 0), dropdown("mode", "Mode", opts(["Major", "Minor"]), 0), dropdown("target", "Chord to Tonicize", opts(["ii (2)", "iii (3)", "IV (4)", "V (5)", "vi (6)", "vii (7)"]), 3)],
    results: [["dominantRoot", "Secondary Dominant (V7/x) Root", "l", N], ["note1", "Root", "l", N], ["note2", "3rd (leading tone of the target)", "l", N], ["note3", "5th", "l", N], ["note4", "7th", "l", N], ["targetChord", "Resolves To", "l", CH], ["leadingToneDim7Root", "Leading-Tone Chord (vii°7/x) Root", "l", N]],
    fn: E.secondaryDominant, ex: { key: 0, mode: 0, target: 3 },
    exText: (o) => `Example: in C major, V7/V is ${L(N, o.dominantRoot)}7 (${[o.note1, o.note2, o.note3, o.note4].map((i) => L(N, i)).join(", ")}), resolving to ${L(CH, o.targetChord)}.`,
    how: "Choose the key and the chord you want to lead into. The secondary dominant is the dominant-seventh chord a perfect 5th above that chord; its 3rd is the leading tone that rises to the target's root.",
    assume: "V7/x = major-minor seventh chord built a perfect 5th above the target root; vii°7/x is built a semitone below the target root.",
    faq: [["What is V of V in C major?", "D7 (D, F♯, A, C), resolving to G."], ["Why do secondary dominants add sharps?", "Their 3rd is the leading tone of the new target, which often isn't in the original key."]],
  }),
  mk({
    slug: "key-signature-calculator", title: "Key Signature Calculator (Sharps, Flats & Relative Key)",
    desc: "Find the key signature of any major or minor key — how many sharps or flats and which ones — with its relative and parallel keys and dominant key.",
    meta: "Key Signature Calculator — Sharps & Flats in Any Key",
    inputs: [noteDD("tonic", "Key (Tonic)", 9), dropdown("mode", "Mode", opts(["Major", "Minor"]), 0)],
    results: [["signature", "Key Signature", "l", E.SIGNATURE_LABELS], ["sharps", "Sharps", "n"], ["flats", "Flats", "n"], ["relativeKey", "Relative Key (major ↔ minor)", "l", N], ["parallelKeySignature", "Parallel Key's Signature", "l", E.SIGNATURE_LABELS], ["dominantKey", "Dominant Key", "l", N]],
    fn: E.keySignature, ex: { tonic: 9, mode: 0 },
    exText: (o) => `Example: A major has ${L(E.SIGNATURE_LABELS, o.signature)}; its relative minor is ${L(N, o.relativeKey)} minor.`,
    how: "Pick the key. Sharps are added in the order F C G D A E B and flats in the order B E A D G C F. A minor key shares its signature with the major key three semitones above (its relative major).",
    assume: "Enharmonic keys use the spelling with fewer accidentals (D♭ major rather than C♯ major); F♯/G♭ major is shown with 6 sharps.",
    faq: [["How many sharps in E major?", "Four: F♯, C♯, G♯ and D♯."], ["What is the relative minor of C major?", "A minor — no sharps or flats."]],
  }),
  mk({
    slug: "pc-set-calculator", title: "Pitch-Class Set Calculator (Normal Form, Prime Form & Interval Vector)",
    desc: "Analyse a pitch-class set: enter up to six pitch classes to get its normal form, prime form and interval-class vector for post-tonal set theory.",
    meta: "PC Set Calculator — Normal Form, Prime Form & Interval Vector",
    inputs: [1, 2, 3, 4, 5, 6].map((i) => dropdown(`pc${i}`, `Pitch Class ${i}`, [...opts(E.PC_LABELS.slice(0, 12).map((l, k) => `${l} (${E.NOTE_NAMES[k]})`)), ["— (none)", E.NONE]], [0, 4, 7, E.NONE, E.NONE, E.NONE][i - 1])),
    results: [["cardinality", "Cardinality", "n"], ...[1, 2, 3, 4, 5, 6].map((i) => [`prime${i}`, `Prime Form ${i}`, "l", E.PC_LABELS] as Line), ...[1, 2, 3, 4, 5, 6].map((i) => [`normal${i}`, `Normal Form ${i}`, "l", E.PC_LABELS] as Line), ...[1, 2, 3, 4, 5, 6].map((i) => [`ic${i}`, `Interval Class ${i} Count`, "n"] as Line)],
    fn: E.pcSet, ex: { pc1: 0, pc2: 4, pc3: 7, pc4: E.NONE, pc5: E.NONE, pc6: E.NONE },
    exText: (o) => `Example: a C major triad {0, 4, 7} has prime form (${[o.prime1, o.prime2, o.prime3].map((i) => L(E.PC_LABELS, i)).join(", ")}) — set class 3-11 — and interval vector <${[o.ic1, o.ic2, o.ic3, o.ic4, o.ic5, o.ic6].join("")}>.`,
    how: "Enter the pitch classes (C = 0 … B = 11, T = 10, E = 11); order and duplicates don't matter. Normal form is the most compact ordering; prime form also compares the inversion and transposes to start on 0.",
    assume: "Normal form uses the Rahn method (smallest span, then most packed to the left); prime form is the more packed of the normal form and its inversion, transposed to 0. Forte numbers are not listed.",
    faq: [["What is the prime form of a major triad?", "(0, 3, 7) — the same set class as a minor triad."], ["What is an interval vector?", "A count of each interval class (1–6) between all pairs of notes."]],
  }),
  mk({
    slug: "music-scale-calculator", title: "Music Scale Calculator (Notes in Any Scale or Mode)",
    desc: "Find the notes of any scale in any key — major, natural, harmonic and melodic minor, the seven modes, pentatonic, blues, whole tone and more.",
    meta: "Music Scale Calculator — Notes in Any Scale, Mode or Key",
    inputs: [noteDD("root", "Root", 2), dropdown("scaleType", "Scale", opts(E.SCALES.map(([n]) => n)), 4)],
    results: [...noteLines(7), ["noteCount", "Notes in the Scale", "n"], ["sharedWithMajor", "Notes Shared With the Major Scale", "n"]],
    fn: E.scale, ex: { root: 2, scaleType: 4 },
    exText: (o) => `Example: D Dorian is ${[o.note1, o.note2, o.note3, o.note4, o.note5, o.note6, o.note7].map((i) => L(N, i)).join(", ")} — the white keys from D.`,
    how: "Choose the root and scale. Pentatonic and blues scales have fewer than seven notes; unused positions show '—'.",
    assume: "Scale formulas in semitones from the root (major 0-2-4-5-7-9-11, natural minor 0-2-3-5-7-8-10, harmonic minor raises the 7th, melodic minor raises the 6th and 7th ascending).",
    faq: [["What notes are in the A minor scale?", "A, B, C, D, E, F, G."], ["What is the difference between Dorian and natural minor?", "Dorian has a raised 6th."]],
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
