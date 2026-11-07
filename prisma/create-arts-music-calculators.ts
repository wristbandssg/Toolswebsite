// One-time (but safe to re-run) batch setup script: creates 22 tempo, audio/studio and instrument
// calculators in Arts & Entertainment Calculators > Music Theory, Instrument & Audio Calculators.
// Formulas live in src/lib/calc-engine-arts-music.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-arts-entertainment-category.ts --apply)
//   npx tsx prisma/create-arts-music-calculators.ts
// or
//   npm run db:create-arts-music-calculators

import * as E from "../src/lib/calc-engine-arts-music";

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

const CAT = "music-theory-instrument-audio-calculators";
const NOTE = "Results are standard engineering and music estimates — real rooms, strings and instruments vary, so treat them as a starting point and fine-tune by ear and measurement.";

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

const NOTES = opts(["C", "C♯ / D♭", "D", "D♯ / E♭", "E", "F", "F♯ / G♭", "G", "G♯ / A♭", "A", "A♯ / B♭", "B"]);
const NOTE_L = ["C", "C♯ / D♭", "D", "D♯ / E♭", "E", "F", "F♯ / G♭", "G", "G♯ / A♭", "A", "A♯ / B♭", "B"];
const BPM = (def = 120) => num("bpm", "Tempo (BPM)", def, 400, 0.1, 1);
const LEN_UNIT = dropdown("unit", "Units", opts(["Feet", "Meters"]), 0);
const SCALE = [dropdown("lengthUnit", "Scale Length Unit", opts(["Inches", "Millimeters"]), 0), num("scaleLength", "Scale Length", 25.5, 1000, 0.01, 10)];

const TOOLS: ToolDef[] = [
  mk({
    slug: "bpm-calculator", title: "BPM Calculator (Find the Tempo of a Song)",
    desc: "Work out a song's tempo in beats per minute — from beats you count over a few seconds, or from a loop's length and number of bars — with half-time, double-time and beat length.",
    meta: "BPM Calculator — Find Song Tempo From Beats or Loop Length",
    inputs: [dropdown("mode", "Method", opts(["Count beats over a time", "Loop or sample length"]), 0), num("beatsCounted", "Beats Counted", 20, 10000, 1), num("seconds", "Over How Many Seconds", 10, 3600, 0.01), num("bars", "Bars in the Loop", 4, 1000, 1), num("loopSeconds", "Loop Length (seconds)", 8, 3600, 0.001), num("beatsPerBar", "Beats per Bar", 4, 16, 1, 1)],
    results: [["bpm", "Tempo (BPM)", "n"], ["halfTime", "Half-Time BPM", "n"], ["doubleTime", "Double-Time BPM", "n"], ["beatMs", "One Beat (ms)", "n"], ["barSeconds", "One Bar (seconds)", "n"], ["beatsPerSecond", "Beats per Second", "n"]],
    fn: E.bpm, ex: { mode: 0, beatsCounted: 20, seconds: 10, bars: 4, loopSeconds: 8, beatsPerBar: 4 },
    exText: (o) => `Example: counting 20 beats in 10 seconds is ${o.bpm} BPM — ${o.beatMs} ms per beat.`,
    how: "Tap or count the beats (kick or snare) for 10–15 seconds and enter the count, or enter a loop's exact length in seconds and how many bars it holds.\n\nIf the result feels too fast or slow, the song may be in half-time or double-time — both are shown.",
    assume: "BPM = beats × 60 ÷ seconds; for loops, BPM = bars × beats per bar × 60 ÷ loop length. Counting for longer gives a more accurate result.",
    faq: [["How do I find the BPM of a song?", "Count the beats for 15 seconds and multiply by 4."], ["What BPM is most pop music?", "Usually 100–130 BPM."]],
  }),
  mk({
    slug: "tempo-to-ms-calculator", title: "Tempo to MS Calculator (BPM to Milliseconds)",
    desc: "Convert BPM to note lengths in milliseconds — whole, half, quarter, eighth, sixteenth and thirty-second notes, straight, dotted or triplet — for delay, reverb and LFO settings.",
    meta: "Tempo to MS Calculator — BPM to Delay Times in Milliseconds",
    inputs: [BPM(120), dropdown("feel", "Note Feel", opts(["Straight", "Dotted", "Triplet"]), 0), num("beatsPerBar", "Beats per Bar", 4, 16, 1, 1)],
    results: [["quarterMs", "Quarter Note (ms)", "n"], ["wholeMs", "Whole Note (ms)", "n"], ["halfMs", "Half Note (ms)", "n"], ["eighthMs", "Eighth Note (ms)", "n"], ["sixteenthMs", "Sixteenth Note (ms)", "n"], ["thirtySecondMs", "Thirty-Second Note (ms)", "n"], ["barMs", "One Bar (ms, straight)", "n"], ["quarterHz", "Quarter-Note Rate (Hz, for LFOs)", "n"]],
    fn: E.tempoToMs, ex: { bpm: 120, feel: 0, beatsPerBar: 4 },
    exText: (o) => `Example: at 120 BPM a quarter note is ${o.quarterMs} ms, an eighth ${o.eighthMs} ms and a sixteenth ${o.sixteenthMs} ms.`,
    how: "Enter the song tempo and choose straight, dotted or triplet. Use the values for delay times, compressor release, gate and LFO rates so effects pulse in time with the music.",
    assume: "Quarter note = 60,000 ÷ BPM ms; dotted notes are 1.5× and triplets 2/3 of the straight value.",
    faq: [["What is a quarter note at 120 BPM?", "500 ms."], ["How do I set a dotted-eighth delay?", "Use the dotted eighth value — 375 ms at 120 BPM."]],
  }),
  mk({
    slug: "reverb-calculator", title: "Reverb Calculator (Tempo-Synced Pre-Delay & Decay)",
    desc: "Set reverb pre-delay and decay time in time with your song — from BPM and the length of reverb tail you want (a quarter note to two bars).",
    meta: "Reverb Calculator — Pre-Delay and Decay Time From BPM",
    inputs: [BPM(120), dropdown("tail", "Reverb Tail Length", opts(["Quarter note", "Half note", "One bar (4/4)", "Two bars"]), 1)],
    results: [["decayMs", "Decay Time (ms)", "n"], ["preDelayMs", "Pre-Delay (1/64 note, ms)", "n"], ["preDelay128Ms", "Shorter Pre-Delay (1/128 note, ms)", "n"], ["totalMs", "Total Tail (ms)", "n"], ["decaySeconds", "Decay Time (seconds)", "n"]],
    fn: E.reverbSync, ex: { bpm: 120, tail: 1 },
    exText: (o) => `Example: at 120 BPM a half-note tail gives a pre-delay of ${o.preDelayMs} ms and a decay of ${o.decayMs} ms.`,
    how: "Short tails (quarter or half note) keep vocals and drums clear; one- or two-bar tails suit pads and ballads. Pre-delay separates the dry sound from the reverb so it stays upfront.",
    assume: "Tail = chosen note value at the tempo; pre-delay = a 1/64 note, decay = tail − pre-delay. For room acoustics (RT60) use the Reverb Time Calculator.",
    faq: [["What is a good reverb pre-delay?", "About 10–40 ms for vocals; a tempo-synced 1/64 or 1/128 note works well."], ["How long should reverb decay be?", "Often a half note to a bar at the song's tempo."]],
  }),
  mk({
    slug: "song-length-calculator", title: "Song Length Calculator (Bars and BPM to Minutes)",
    desc: "Find how long a song or section lasts from its tempo, number of bars and time signature — or how many bars you need to hit a target length.",
    meta: "Song Length Calculator — Bars and BPM to Minutes and Seconds",
    inputs: [BPM(120), num("bars", "Number of Bars", 96, 10000, 1), num("beatsPerBar", "Beats per Bar (top number)", 4, 16, 1, 1), num("beatUnit", "Beat Unit (bottom number)", 4, 16, 1, 1), num("extraSeconds", "Extra Seconds (intro silence, fade, ring-out)", 0, 600, 0.1), num("targetMinutes", "Target Length (minutes, optional)", 3.5, 60, 0.1)],
    results: [["totalSeconds", "Song Length (seconds)", "n"], ["minutes", "Minutes", "n"], ["seconds", "+ Seconds", "n"], ["barSeconds", "One Bar (seconds)", "n"], ["barsForTarget", "Bars for Your Target Length", "n"]],
    fn: E.songLength, ex: { bpm: 120, bars: 96, beatsPerBar: 4, beatUnit: 4, extraSeconds: 0, targetMinutes: 3.5 },
    exText: (o) => `Example: 96 bars of 4/4 at 120 BPM last ${o.minutes} min ${o.seconds} s; a 3½-minute song needs about ${o.barsForTarget} bars.`,
    how: "Enter the tempo, bar count and time signature. For songs with tempo changes, work out each section separately and add them up.",
    assume: "Length = bars × beats per bar × (4 ÷ beat unit) × 60 ÷ BPM, with BPM counted in quarter notes.",
    faq: [["How many bars is a 3-minute song?", "At 120 BPM in 4/4, 90 bars."], ["How long is one bar at 100 BPM?", "2.4 seconds in 4/4."]],
  }),
  mk({
    slug: "time-signature-calculator", title: "Time Signature Calculator (Meter, Beats & Bar Length)",
    desc: "Understand any time signature — simple, compound or irregular — how many beats you feel per bar, the felt tempo and how long each bar and section lasts.",
    meta: "Time Signature Calculator — Simple, Compound & Bar Length",
    inputs: [num("numerator", "Top Number (beats per bar)", 6, 32, 1, 1), dropdown("denominator", "Bottom Number (note value)", opts(["2 (half note)", "4 (quarter note)", "8 (eighth note)", "16 (sixteenth note)"]), 2), num("bpm", "Tempo (BPM, counted in the bottom note value)", 180, 600, 0.1, 1), num("bars", "Number of Bars", 16, 10000, 1)],
    results: [["meterType", "Meter", "l", ["Simple meter", "Compound meter", "Irregular / asymmetric meter"]], ["beatsFelt", "Main Beats Felt per Bar", "n"], ["feltBpm", "Felt Tempo (main beats per minute)", "n"], ["barSeconds", "One Bar (seconds)", "n"], ["totalSeconds", "Total for Your Bars (seconds)", "n"], ["quarterNotesPerBar", "Quarter Notes per Bar", "n"]],
    fn: E.timeSignature, ex: { numerator: 6, denominator: 2, bpm: 180, bars: 16 },
    exText: (o) => `Example: 6/8 at 180 eighth notes per minute is a ${["simple", "compound", "irregular"][o.meterType]} meter with ${o.beatsFelt} felt beats per bar at ${o.feltBpm} BPM; each bar lasts ${o.barSeconds} s.`,
    how: "Enter the time signature and the tempo counted in its bottom note value. Compound meters (6/8, 9/8, 12/8) group notes in threes, so you feel fewer, slower beats; 5/4 and 7/8 are irregular.",
    assume: "Compound = top number divisible by 3 and greater than 3; simple = 2, 3 or 4 beats; anything else is irregular.",
    faq: [["Is 6/8 the same as 3/4?", "No — 6/8 is two groups of three eighths; 3/4 is three quarter-note beats."], ["What is a compound time signature?", "One where each beat divides into three, like 6/8 or 12/8."]],
  }),
  mk({
    slug: "metric-modulation-calculator", title: "Metric Modulation Calculator",
    desc: "Calculate the new tempo after a metric modulation — when one note value at the old tempo equals another at the new tempo (for example eighth-note triplet = eighth note).",
    meta: "Metric Modulation Calculator — New Tempo From Note Equivalence",
    inputs: [num("oldBpm", "Old Tempo (quarter-note BPM)", 120, 400, 0.1, 1), dropdown("oldNote", "Old Note Value", opts(E.NOTE_VALUES.map(([n]) => n)), 8), dropdown("newNote", "Equals This New Note Value", opts(E.NOTE_VALUES.map(([n]) => n)), 7)],
    results: [["newBpm", "New Tempo (quarter-note BPM)", "n"], ["ratio", "Tempo Ratio", "n"], ["percentChange", "Tempo Change (%)", "n"], ["oldQuarterMs", "Old Quarter Note (ms)", "n"], ["newQuarterMs", "New Quarter Note (ms)", "n"]],
    fn: E.metricModulation, ex: { oldBpm: 120, oldNote: 8, newNote: 7 },
    exText: (o) => `Example: at 120 BPM, if the old eighth-note triplet becomes the new eighth note, the new tempo is ${o.newBpm} BPM (+${o.percentChange}%).`,
    how: "Pick the note value that carries across the change (old) and what it becomes in the new section. The pulse stays continuous while the beat changes speed.",
    assume: "New BPM = old BPM × new note value ÷ old note value, with values measured in quarter notes (eighth = ½, triplet eighth = ⅓, dotted quarter = 1½).",
    faq: [["What is a metric modulation?", "A tempo change where a note value from the old tempo equals a different note value in the new one."], ["Triplet eighth = eighth — faster or slower?", "50% faster."]],
  }),
  mk({
    slug: "notes-per-second-calculator", title: "Notes per Second Calculator",
    desc: "Find how many notes per second you are playing at a tempo and subdivision — eighths, triplets, sixteenths, sextuplets — and the BPM needed to hit a target speed.",
    meta: "Notes per Second Calculator — Speed From BPM & Subdivision",
    inputs: [BPM(160), dropdown("subdivision", "Subdivision", opts(E.SUBDIVISIONS.map(([n]) => n)), 3), num("targetNps", "Target Notes per Second (optional)", 12, 50, 0.1)],
    results: [["notesPerSecond", "Notes per Second", "n"], ["noteLengthMs", "Each Note (ms)", "n"], ["notesPerMinute", "Notes per Minute", "n"], ["bpmForTarget", "BPM for Your Target Speed", "n"]],
    fn: E.notesPerSecond, ex: { bpm: 160, subdivision: 3, targetNps: 12 },
    exText: (o) => `Example: sixteenth notes at 160 BPM are ${o.notesPerSecond} notes per second (${o.noteLengthMs} ms each).`,
    how: "Enter the metronome tempo and the subdivision you are playing. Use the target field to set a practice goal — for example 12 notes per second for fast shred runs.",
    assume: "Notes per second = BPM ÷ 60 × notes per beat.",
    faq: [["How many notes per second is 16ths at 120 BPM?", "8 notes per second."], ["Is 10 notes per second fast?", "Yes — that is sixteenth notes at 150 BPM."]],
  }),
  mk({
    slug: "tempo-pitch-calculator", title: "Tempo to Pitch Calculator (Speed Change in Semitones)",
    desc: "See how much pitch changes when you speed up or slow down audio without time-stretching — semitones and cents between two tempos, the new key, or the tempo for a given pitch shift.",
    meta: "Tempo Pitch Calculator — BPM Change to Semitones and Cents",
    inputs: [num("originalBpm", "Original Tempo (BPM)", 120, 400, 0.01, 1), dropdown("mode", "Find", opts(["Pitch shift from a new tempo", "New tempo from a pitch shift"]), 0), num("newBpm", "New Tempo (BPM)", 128, 400, 0.01, 1), num("semitones", "Pitch Shift (semitones)", 1, 24, 0.01, -24), dropdown("originalKey", "Original Key (optional)", NOTES, 0)],
    results: [["semitoneShift", "Pitch Shift (semitones)", "n"], ["cents", "Pitch Shift (cents)", "n"], ["newBpm", "New Tempo (BPM)", "n"], ["speedPercent", "Playback Speed (%)", "n"], ["playbackRate", "Playback Rate", "n"], ["newKey", "New Key (nearest)", "l", NOTE_L]],
    fn: E.tempoPitch, ex: { originalBpm: 120, mode: 0, newBpm: 128, semitones: 1, originalKey: 0 },
    exText: (o) => `Example: speeding a 120 BPM track up to 128 BPM raises the pitch by ${o.semitoneShift} semitones (${o.cents} cents).`,
    how: "This is what happens on a turntable, varispeed or a sampler without time-stretching: speed and pitch change together. DJs use it to see whether two tracks will still be in key after matching tempos.",
    assume: "Semitones = 12 × log2(new tempo ÷ old tempo); a 6% speed change is about one semitone.",
    faq: [["How much does pitch change with speed?", "About one semitone for every 6% of speed."], ["How much faster is one semitone?", "About 5.95%."]],
  }),
  mk({
    slug: "room-mode-calculator", title: "Room Mode Calculator (Axial Room Resonances)",
    desc: "Calculate the axial room modes of a studio or listening room from its length, width and height — the bass frequencies that boom or cancel — with the Schroeder frequency and room ratios.",
    meta: "Room Mode Calculator — Axial Modes & Schroeder Frequency",
    inputs: [LEN_UNIT, num("length", "Room Length", 16, 500, 0.1, 1), num("width", "Room Width", 12, 500, 0.1, 1), num("height", "Ceiling Height", 8, 100, 0.1, 1)],
    results: [["lowestMode", "Lowest Room Mode (Hz)", "n"], ["lengthMode1", "Length Mode 1 (Hz)", "n"], ["lengthMode2", "Length Mode 2 (Hz)", "n"], ["lengthMode3", "Length Mode 3 (Hz)", "n"], ["widthMode1", "Width Mode 1 (Hz)", "n"], ["widthMode2", "Width Mode 2 (Hz)", "n"], ["heightMode1", "Height Mode 1 (Hz)", "n"], ["heightMode2", "Height Mode 2 (Hz)", "n"], ["schroederHz", "Schroeder Frequency (Hz, approx.)", "n"], ["ratioWidth", "Width ÷ Height", "n"], ["ratioLength", "Length ÷ Height", "n"]],
    fn: E.roomModes, ex: { unit: 0, length: 16, width: 12, height: 8 },
    exText: (o) => `Example: a 16 × 12 × 8 ft room has its first length mode at ${o.lengthMode1} Hz, width mode at ${o.widthMode1} Hz and height mode at ${o.heightMode1} Hz.`,
    how: "Enter the inside dimensions. Modes that land close together (within about 5 Hz) or stack up from several dimensions cause boomy notes; a room whose dimensions are equal or simple multiples is the worst case.\n\nBass traps in corners tame axial modes most effectively.",
    assume: "Axial modes f = n × 343 ÷ (2 × dimension in m). Tangential and oblique modes are weaker and not listed. Schroeder frequency ≈ 2000 × √(RT60 ÷ V) with RT60 assumed 0.5 s.",
    faq: [["What is a room mode?", "A resonance where sound bouncing between parallel walls reinforces or cancels certain bass notes."], ["What are good room ratios?", "Ratios like 1 : 1.4 : 1.9 (height : width : length) spread modes evenly."]],
  }),
  mk({
    slug: "reverb-time-calculator", title: "Reverb Time Calculator (RT60, Sabine & Eyring)",
    desc: "Estimate a room's reverberation time (RT60) from its size and surfaces — floor, ceiling and wall materials, acoustic panels and people — with the panel area needed for a 0.5-second studio target.",
    meta: "Reverb Time Calculator — RT60 for Rooms and Studios",
    inputs: [LEN_UNIT, num("length", "Room Length", 20, 500, 0.1, 1), num("width", "Room Width", 15, 500, 0.1, 1), num("height", "Ceiling Height", 9, 100, 0.1, 1), dropdown("floorMaterial", "Floor", opts(E.MATERIALS.map(([n, a]) => `${n} (α ${a})`)), 2), dropdown("ceilingMaterial", "Ceiling", opts(E.MATERIALS.map(([n, a]) => `${n} (α ${a})`)), 1), dropdown("wallMaterial", "Walls", opts(E.MATERIALS.map(([n, a]) => `${n} (α ${a})`)), 1), num("panelArea", "Acoustic Panel Area on Walls (sq ft or m²)", 0, 100000, 1), num("people", "People in the Room", 0, 10000, 1)],
    results: [["rt60Sabine", "RT60 — Sabine (seconds)", "n"], ["rt60Eyring", "RT60 — Eyring (seconds)", "n"], ["volumeM3", "Room Volume (m³)", "n"], ["absorptionSabins", "Total Absorption (m² sabins)", "n"], ["averageAbsorption", "Average Absorption Coefficient", "n"], ["panelAreaForHalfSecond", "Panel Area for 0.5 s (m²)", "n"]],
    fn: E.reverbTime, ex: { unit: 0, length: 20, width: 15, height: 9, floorMaterial: 2, ceilingMaterial: 1, wallMaterial: 1, panelArea: 0, people: 0 },
    exText: (o) => `Example: an empty 20 × 15 × 9 ft room with a wood floor and drywall has an RT60 of about ${o.rt60Sabine} s — adding about ${o.panelAreaForHalfSecond} m² of panels brings it to 0.5 s.`,
    how: "Enter the dimensions and the main surfaces. Typical targets: control rooms and home studios 0.2–0.4 s, living rooms 0.4–0.6 s, classrooms 0.6–0.8 s, concert halls 1.5–2.2 s.\n\nEyring is more accurate in heavily treated rooms; Sabine in live rooms.",
    assume: "Sabine RT60 = 0.161 V ÷ A; Eyring uses −S ln(1 − ᾱ). Absorption coefficients are typical mid-frequency (500 Hz) values; panels α 0.9; each person ≈ 0.45 m² sabins. Low frequencies usually ring longer.",
    faq: [["What is RT60?", "The time for sound to fade by 60 dB after the source stops."], ["What is a good reverb time for a home studio?", "About 0.2–0.4 seconds."]],
  }),
  mk({
    slug: "studio-monitor-placement-calculator", title: "Studio Monitor Placement Calculator",
    desc: "Place your studio monitors and listening position: the 38% rule from the front wall, an equilateral triangle, distance from side walls, toe-in and the front-wall cancellation frequency.",
    meta: "Studio Monitor Placement Calculator — 38% Rule & Triangle",
    inputs: [dropdown("unit", "Units", opts(["Feet", "Meters"]), 0), num("roomLength", "Room Length (front to back)", 14, 500, 0.1, 1), num("roomWidth", "Room Width", 11, 500, 0.1, 1), num("speakerSpacing", "Distance Between Monitors", 5, 50, 0.1, 1)],
    results: [["listeningFromFrontWall", "Listening Position From Front Wall", "n"], ["speakerFromFrontWall", "Monitors From Front Wall (tweeter)", "n"], ["speakerFromSideWall", "Each Monitor From Side Wall", "n"], ["listeningDistance", "Ear to Each Monitor", "n"], ["toeInDegrees", "Toe-In Toward You (degrees)", "n"], ["sbirNullHz", "Front-Wall Cancellation Dip (Hz)", "n"]],
    fn: E.monitorPlacement, ex: { unit: 0, roomLength: 14, roomWidth: 11, speakerSpacing: 5 },
    exText: (o) => `Example: in a 14 × 11 ft room, sit ${o.listeningFromFrontWall} ft from the front wall with monitors 5 ft apart, about ${o.speakerFromFrontWall} ft from the front wall and ${o.speakerFromSideWall} ft from each side wall.`,
    how: "Face the room's length, centred left to right. Sit at about 38% of the room length from the front wall, form an equilateral triangle with the monitors, aim the tweeters at your ears and keep them at ear height.\n\nIf the front-wall dip lands where you hear a bass gap, move the monitors closer to the wall or further away.",
    assume: "38% rule for the listening position; 60° equilateral triangle (30° toe-in). Speaker boundary interference null f = 343 ÷ (4 × distance to wall in m).",
    faq: [["How far apart should studio monitors be?", "Usually 3–6 ft (1–1.8 m), the same as your distance to each one."], ["What is the 38% rule?", "Placing the listening position 38% of the room length from the front wall to reduce bass build-up."]],
  }),
  mk({
    slug: "compressor-calculator", title: "Compressor Calculator (Gain Reduction & Release Time)",
    desc: "Work out how much a compressor turns down your signal — gain reduction and output level from threshold, ratio and input — plus tempo-synced release times.",
    meta: "Compressor Calculator — Gain Reduction, Ratio & Release",
    inputs: [num("threshold", "Threshold (dBFS)", -18, 0, 0.1, -80), num("ratio", "Ratio (x : 1)", 4, 100, 0.1, 1), num("inputLevel", "Input Peak Level (dBFS)", -6, 24, 0.1, -80), num("makeupGain", "Makeup Gain (dB)", 0, 40, 0.1), BPM(120)],
    results: [["gainReductionDb", "Gain Reduction (dB)", "n"], ["outputLevelDb", "Output Level (dBFS)", "n"], ["makeupSuggestedDb", "Suggested Makeup Gain (dB)", "n"], ["releaseQuarterMs", "Release — Quarter Note (ms)", "n"], ["releaseEighthMs", "Release — Eighth Note (ms)", "n"], ["releaseSixteenthMs", "Release — Sixteenth Note (ms)", "n"]],
    fn: E.compressor, ex: { threshold: -18, ratio: 4, inputLevel: -6, makeupGain: 0, bpm: 120 },
    exText: (o) => `Example: a −6 dB peak into a −18 dB threshold at 4:1 comes out at ${o.outputLevelDb} dB — ${o.gainReductionDb} dB of gain reduction.`,
    how: "Enter the compressor settings and the loudest level going in. Above the threshold, every 'ratio' dB in becomes 1 dB out. Setting release to a note value at the song tempo helps the compressor breathe with the groove.",
    assume: "Hard-knee static curve: output = threshold + (input − threshold) ÷ ratio. Real compressors with soft knees, attack and release times will differ slightly.",
    faq: [["What does a 4:1 ratio mean?", "For every 4 dB the signal goes over the threshold, only 1 dB comes out."], ["How much gain reduction is normal?", "About 3–6 dB on vocals and mix buses."]],
  }),
  mk({
    slug: "qsc-speaker-coverage-calculator", title: "Ceiling Speaker Coverage Calculator (QSC-Style Layout)",
    desc: "Plan a ceiling speaker layout — coverage circle at ear height, spacing for edge-to-edge, minimum-overlap or edge-to-centre coverage, and how many speakers a room needs.",
    meta: "Speaker Coverage Calculator — Ceiling Speaker Spacing & Count",
    inputs: [dropdown("unit", "Units", opts(["Feet", "Meters"]), 0), num("ceilingHeight", "Ceiling Height", 10, 100, 0.1, 1), num("earHeight", "Listener Ear Height (4 seated, 5.5 standing)", 4, 10, 0.1), num("angle", "Speaker Coverage Angle (degrees, conical)", 90, 180, 1, 10), dropdown("overlap", "Coverage Goal", opts(["Edge-to-edge (background music)", "Minimum overlap (paging, speech)", "Edge-to-centre (best intelligibility)"]), 1), num("roomLength", "Room Length", 60, 10000, 0.1), num("roomWidth", "Room Width", 40, 10000, 0.1)],
    results: [["speakersNeeded", "Speakers Needed", "n"], ["coverageDiameter", "Coverage Circle at Ear Height", "n"], ["speakerSpacing", "Spacing Between Speakers", "n"], ["speakersAlongLength", "Rows Along the Length", "n"], ["speakersAcrossWidth", "Speakers Across the Width", "n"], ["coverageAreaEach", "Coverage Area per Speaker", "n"]],
    fn: E.speakerCoverage, ex: { unit: 0, ceilingHeight: 10, earHeight: 4, angle: 90, overlap: 1, roomLength: 60, roomWidth: 40 },
    exText: (o) => `Example: 90° ceiling speakers in a 10 ft ceiling cover a ${o.coverageDiameter} ft circle at seated ear height; with minimum overlap, space them ${o.speakerSpacing} ft apart — ${o.speakersNeeded} speakers for a 60 × 40 ft room.`,
    how: "Use the manufacturer's coverage angle (QSC, JBL and Bose list it on spec sheets, often 90–140°). Higher overlap gives more even sound and better speech clarity at the cost of more speakers.",
    assume: "Coverage diameter = 2 × (ceiling − ear height) × tan(angle ÷ 2). Spacing = diameter × 1 (edge-to-edge), 0.7 (minimum overlap) or 0.5 (edge-to-centre) on a square grid. Lengths are in the units you chose.",
    faq: [["How far apart should ceiling speakers be?", "Roughly 1.5–2 × the distance from ear height to the ceiling for speech."], ["How many ceiling speakers for a room?", "Divide the room into a grid at the spacing for your coverage goal."]],
  }),
  mk({
    slug: "string-tension-calculator", title: "String Tension Calculator (Guitar & Bass)",
    desc: "Calculate the tension of each guitar or bass string from gauge, scale length and tuning — standard, drop, down-tuned or bass — with total neck load, using D'Addario-style unit weights.",
    meta: "String Tension Calculator — Guitar & Bass Tension by Gauge",
    inputs: [...SCALE, dropdown("tuning", "Instrument & Tuning", opts(E.TUNINGS.map(([n]) => n)), 0), dropdown("stringType", "Wound String Type", opts(E.STRING_TYPES.map(([n]) => n)), 0), num("semitoneShift", "Extra Tuning Shift (semitones)", 0, 12, 1, -12), ...[0.046, 0.036, 0.026, 0.017, 0.013, 0.01].map((g, i) => num(`gauge${i + 1}`, `String ${6 - i === 6 ? "6 (lowest)" : 6 - i} Gauge (inches)`, g, 0.2, 0.001))],
    results: [["totalTension", "Total Tension (lb)", "n"], ["tension1", "Lowest String (lb)", "n"], ["tension2", "String 2 (lb)", "n"], ["tension3", "String 3 (lb)", "n"], ["tension4", "String 4 (lb)", "n"], ["tension5", "String 5 (lb)", "n"], ["tension6", "String 6 (lb)", "n"], ["totalKg", "Total Tension (kg)", "n"]],
    fn: E.stringTension, ex: { lengthUnit: 0, scaleLength: 25.5, tuning: 0, stringType: 0, semitoneShift: 0, gauge1: 0.046, gauge2: 0.036, gauge3: 0.026, gauge4: 0.017, gauge5: 0.013, gauge6: 0.01 },
    exText: (o) => `Example: a 10–46 set on a 25.5-inch scale in standard tuning totals about ${o.totalTension} lb — ${o.tension1} lb on the low E and ${o.tension6} lb on the high E.`,
    how: "Enter the scale length and the gauges from low to high (bass: leave unused strings at 0). Plain strings are .020 and thinner on guitars; heavier gauges are treated as wound.\n\nMost players like 15–20 lb per string on electric guitar; balanced sets keep tensions similar across strings.",
    assume: "Mersenne's law: T = UW × (2 × L × f)² ÷ 386.4. Unit weight ≈ 0.2226 × d² for plain steel and ≈ 0.18–0.19 × d² for wound strings, within a few percent of D'Addario, Stringjoy and Ernie Ball published values.",
    faq: [["How much tension is on a guitar neck?", "About 100–110 lb for a 10–46 set in standard tuning."], ["Does a longer scale add tension?", "Yes — tension rises with the square of scale length at the same pitch."]],
  }),
  mk({
    slug: "string-gauge-calculator", title: "String Gauge Calculator (Gauge for a Target Tension)",
    desc: "Find the string gauge you need for a target tension at any note and scale length — for down-tuning, baritone guitars, basses and custom sets.",
    meta: "String Gauge Calculator — Choose Gauges for Your Tuning",
    inputs: [...SCALE, dropdown("note", "Note", NOTES, 4), num("octave", "Octave (low E on guitar = 2)", 2, 6, 1, 0), num("targetTension", "Target Tension (lb)", 17, 60, 0.1, 1), dropdown("construction", "String Construction", opts(["Plain steel", "Wound"]), 1), dropdown("stringType", "Wound String Type", opts(E.STRING_TYPES.map(([n]) => n)), 0)],
    results: [["gaugeThousandths", "Gauge (thousandths of an inch)", "n"], ["gaugeInches", "Gauge (inches)", "n"], ["gaugeMm", "Gauge (mm)", "n"], ["nearestCommonGauge", "Nearest Whole Gauge (.0xx)", "n"], ["frequencyHz", "Note Frequency (Hz)", "n"], ["unitWeight", "Unit Weight (lb/in)", "n"]],
    fn: E.stringGauge, ex: { lengthUnit: 0, scaleLength: 25.5, note: 2, octave: 2, targetTension: 17, construction: 1, stringType: 0 },
    exText: (o) => `Example: for a low D (drop D) at 17 lb on a 25.5-inch scale you need about a .0${o.nearestCommonGauge} wound string.`,
    how: "Enter the note the string will be tuned to and the tension you like. Repeat for each string to design a balanced custom set, then round to the nearest gauge your brand sells.",
    assume: "Gauge from T = UW × (2 L f)² ÷ 386.4 with UW = k × d² (k = 0.2226 plain, ≈ 0.18–0.19 wound).",
    faq: [["What gauge for drop C?", "Many players use a .056–.060 low string on a 25.5-inch scale."], ["Why do heavier strings feel stiffer?", "They need more tension to reach the same pitch."]],
  }),
  mk({
    slug: "fret-calculator", title: "Fret Calculator (Fret Position From Scale Length)",
    desc: "Calculate the position of any fret from the nut for a guitar, bass, ukulele or mandolin of any scale length — with fret spacing and distance to the bridge.",
    meta: "Fret Calculator — Fret Positions and Spacing for Any Scale",
    inputs: [num("scaleLength", "Scale Length (inches or mm — results use the same unit)", 25.5, 2000, 0.01, 1), num("fret", "Fret Number", 12, 36, 1, 1)],
    results: [["fromNut", "Distance From Nut", "n"], ["fromPreviousFret", "Distance From Previous Fret", "n"], ["toBridge", "Distance to Bridge Saddle", "n"], ["fret1", "Fret 1 From Nut", "n"], ["fret5", "Fret 5 From Nut", "n"], ["fret7", "Fret 7 From Nut", "n"], ["fret12", "Fret 12 From Nut (half the scale)", "n"], ["fret24", "Fret 24 From Nut", "n"]],
    fn: E.fret, ex: { scaleLength: 25.5, fret: 12 },
    exText: (o) => `Example: on a 25.5-inch scale, fret 1 is ${o.fret1} in from the nut and fret 12 is ${o.fret12} in — exactly half the scale.`,
    how: "Enter the scale length (Fender 25.5 in, Gibson 24.75 in, bass 34 in, ukulele 13–17 in) and the fret you want. Measure from the nut's fretboard edge.\n\nAdd intonation compensation at the saddle, not to the fret positions.",
    assume: "Equal temperament: distance from nut = L − L ÷ 2^(n ÷ 12) (the 'rule of 17.817').",
    faq: [["Where is the 12th fret?", "Exactly halfway along the scale length."], ["How are fret positions calculated?", "Each fret sits so the remaining string length is shortened by a factor of 2^(1/12)."]],
  }),
  mk({
    slug: "vocal-range-calculator", title: "Vocal Range Calculator (Voice Type Finder)",
    desc: "Enter your lowest and highest comfortable notes to see your vocal range in semitones and octaves and the voice type it fits best — bass, baritone, tenor, countertenor, alto, mezzo or soprano.",
    meta: "Vocal Range Calculator — Find Your Voice Type",
    inputs: [dropdown("lowNote", "Lowest Note", NOTES, 9), num("lowOctave", "Lowest Note Octave (middle C = 4)", 2, 8, 1, 0), dropdown("highNote", "Highest Note", NOTES, 9), num("highOctave", "Highest Note Octave", 4, 8, 1, 0)],
    results: [["voiceType", "Closest Voice Type", "l", E.VOICES.map(([n]) => n)], ["rangeSemitones", "Range (semitones)", "n"], ["rangeOctaves", "Range (octaves)", "n"], ["lowestHz", "Lowest Note (Hz)", "n"], ["highestHz", "Highest Note (Hz)", "n"], ["middleNote", "Middle of Your Range", "l", NOTE_L]],
    fn: E.vocalRange, ex: { lowNote: 9, lowOctave: 2, highNote: 9, highOctave: 4 },
    exText: (o) => `Example: a range from A2 to A4 is ${o.rangeOctaves} octaves — closest to a ${E.VOICES[o.voiceType][0].toLowerCase()} voice.`,
    how: "Sing down and up a scale with a piano or tuner app and note the lowest and highest notes you can sing comfortably (not just touch). Voice type also depends on tone colour and where your voice sits most easily.",
    assume: "Typical ranges: bass E2–E4, baritone A2–A4, tenor C3–C5, countertenor G3–E5, contralto F3–F5, mezzo-soprano A3–A5, soprano C4–C6. The closest match minimises the distance from both ends.",
    faq: [["What is the average vocal range?", "About 1½–2 octaves for untrained singers."], ["What voice type is A2 to A4?", "Baritone."]],
  }),
  mk({
    slug: "tone-stack-calculator", title: "Tone Stack Calculator (RC Corner Frequencies)",
    desc: "Estimate the corner frequencies of a guitar amp tone stack or tone control from its resistor and capacitor values — treble, bass, mid and a passive tone pot.",
    meta: "Tone Stack Calculator — Treble, Bass & Mid Corner Frequencies",
    inputs: [num("slopeR", "Slope Resistor (kΩ)", 100, 10000, 0.1), num("trebleC", "Treble Capacitor (nF)", 0.25, 10000, 0.001), num("bassR", "Bass Pot (kΩ)", 250, 10000, 1), num("bassC", "Bass Capacitor (nF)", 100, 10000, 0.1), num("midR", "Mid Resistor / Pot (kΩ)", 10, 10000, 0.1), num("midC", "Mid Capacitor (nF)", 47, 10000, 0.1), num("toneR", "Guitar Tone Pot (kΩ)", 250, 10000, 1), num("toneC", "Guitar Tone Capacitor (nF)", 22, 10000, 0.1)],
    results: [["trebleCornerHz", "Treble Corner (Hz)", "n"], ["bassCornerHz", "Bass Corner (Hz)", "n"], ["midCornerHz", "Mid Corner (Hz)", "n"], ["toneControlCutoffHz", "Guitar Tone Control Cut-off at Full Cut (Hz)", "n"]],
    fn: E.toneStack, ex: { slopeR: 100, trebleC: 0.25, bassR: 250, bassC: 100, midR: 10, midC: 47, toneR: 250, toneC: 22 },
    exText: (o) => `Example: Fender-style values (100k slope with 250 pF treble cap, 250k bass pot with 0.1 µF, 10k mid with 0.047 µF) give corners near ${o.trebleCornerHz} Hz, ${o.bassCornerHz} Hz and ${o.midCornerHz} Hz.`,
    how: "Enter the component values from the schematic. Smaller treble caps push the treble corner higher (brighter); bigger bass caps let in more lows. Changing the mid resistor moves the mid scoop.\n\nFor a full interactive response curve, use a dedicated circuit simulator such as Duncan's TSC.",
    assume: "Each corner is the simple RC frequency f = 1 ÷ (2π R C). Real tone stacks interact, so the curve shape depends on all parts and pot settings — these are first-order guides.",
    faq: [["Why is my tone stack scooped?", "Fender and Marshall stacks naturally cut the mids; a larger mid resistor reduces the scoop."], ["What does a 0.022 µF tone cap do?", "On a 250k pot it rolls treble down to about 30 Hz at full cut — a dark, woman-tone sound."]],
  }),
  mk({
    slug: "guitar-neck-angle-calculator", title: "Guitar Neck Angle Calculator (and Shim Thickness)",
    desc: "Work out the neck angle a guitar needs from bridge height, fretboard height and the distance to the bridge — and the shim thickness for a bolt-on neck pocket.",
    meta: "Guitar Neck Angle Calculator — Neck Angle & Shim Thickness",
    inputs: [num("bridgeHeight", "Bridge/Saddle Height Above the Body (in)", 0.75, 5, 0.001), num("fretboardHeight", "Fretboard + Fret + Action Height at the Body Joint (in)", 0.45, 5, 0.001), num("distanceToBridge", "Distance From Fretboard End to Saddle (in)", 6.5, 30, 0.01, 0.1), num("heelLength", "Neck Heel / Pocket Length (in, for shims)", 3, 10, 0.01)],
    results: [["neckAngleDegrees", "Neck Angle (degrees)", "n"], ["riseNeeded", "Height Difference to Make Up (in)", "n"], ["shimThickness", "Shim Thickness at the Heel End (in)", "n"], ["angleIsZeroOrLess", "No Angle Needed (1 = yes)", "n"]],
    fn: E.neckAngle, ex: { bridgeHeight: 0.75, fretboardHeight: 0.45, distanceToBridge: 6.5, heelLength: 3 },
    exText: (o) => `Example: a bridge 0.75 in high, a 0.45 in fretboard stack and 6.5 in to the saddle needs about ${o.neckAngleDegrees}° of neck angle — a ${o.shimThickness} in shim on a 3-inch pocket.`,
    how: "Measure the saddle height above the top at your intended action, and the height of the fretboard with frets (plus action) where the neck meets the body. Archtops and Les Paul-style guitars need a few degrees; most Fender-style guitars need none.",
    assume: "Neck angle = arctan((bridge height − fretboard height) ÷ distance). Shim thickness = tan(angle) × pocket length.",
    faq: [["What neck angle does a Les Paul have?", "About 3.5–5 degrees."], ["How thick should a neck shim be?", "Usually 0.005–0.020 in on bolt-on guitars."]],
  }),
  mk({
    slug: "cymbal-weight-calculator", title: "Cymbal Weight Calculator (Thin, Medium or Heavy?)",
    desc: "Find a cymbal's weight class — paper thin to heavy — from its diameter and weight in grams or pounds, with the typical medium weight range for that size.",
    meta: "Cymbal Weight Calculator — Weight Class From Diameter and Grams",
    inputs: [dropdown("diameterUnit", "Diameter Unit", opts(["Inches", "Centimeters"]), 0), num("diameter", "Diameter", 18, 40, 0.5, 6), dropdown("weightUnit", "Weight Unit", opts(["Grams", "Pounds"]), 0), num("weight", "Weight", 1500, 10000, 1, 1)],
    results: [["weightClass", "Weight Class", "l", E.CYMBAL_CLASSES], ["weightIndex", "Weight Index (g per in²)", "n"], ["grams", "Weight (g)", "n"], ["pounds", "Weight (lb)", "n"], ["mediumRangeLowGrams", "Medium Range at This Size — From (g)", "n"], ["mediumRangeHighGrams", "Medium Range at This Size — To (g)", "n"]],
    fn: E.cymbalWeight, ex: { diameterUnit: 0, diameter: 18, weightUnit: 0, weight: 1500 },
    exText: (o) => `Example: an 18-inch cymbal weighing 1,500 g is ${E.CYMBAL_CLASSES[o.weightClass].toLowerCase()} (medium would be about ${o.mediumRangeLowGrams}–${o.mediumRangeHighGrams} g).`,
    how: "Weigh the cymbal on a kitchen scale and enter its size. Thinner cymbals are darker, faster and more washy; heavier ones are louder, brighter and more cutting with a clearer stick sound.",
    assume: "Weight index = grams ÷ diameter² (inches). Class bands are approximate and vary by maker and model: below 4.2 paper thin, 4.2–4.9 thin, 4.9–5.6 medium-thin, 5.6–6.4 medium, 6.4–7.4 medium-heavy, above 7.4 heavy.",
    faq: [["How much does a 20-inch ride weigh?", "Usually 2,000–2,800 g; around 2,300–2,500 g is medium."], ["Are thin cymbals louder?", "No — they speak faster but are generally quieter and darker than heavy cymbals."]],
  }),
  mk({
    slug: "string-spacing-calculator", title: "String Spacing Calculator (Nut & Bridge Slot Positions)",
    desc: "Lay out nut or bridge string slots: equal centre spacing or equal gaps between strings (compensated for gauge), with the position of each string from the edge.",
    meta: "String Spacing Calculator — Nut Slot Positions for Guitar & Bass",
    inputs: [num("width", "Nut or Bridge Width (in or mm)", 1.6875, 200, 0.001, 0.1), num("edgeMargin", "Edge to Outer String Centre", 0.125, 20, 0.001), num("strings", "Number of Strings", 6, 7, 1, 2), ...[0.046, 0.036, 0.026, 0.017, 0.013, 0.01, 0].map((g, i) => num(`gauge${i + 1}`, `String ${i + 1} Gauge (low to high, same unit)`, g, 2, 0.001))],
    results: [["equalGap", "Equal Gap Between Strings", "n"], ["equalCenterSpacing", "Equal Centre-to-Centre Spacing", "n"], ["outerStringSpan", "Outer String Span (centre to centre)", "n"], ...[1, 2, 3, 4, 5, 6, 7].map((i) => [`position${i}`, `String ${i} Centre From Edge (equal gaps)`, "n"] as Line)],
    fn: E.stringSpacing, ex: { width: 1.6875, edgeMargin: 0.125, strings: 6, gauge1: 0.046, gauge2: 0.036, gauge3: 0.026, gauge4: 0.017, gauge5: 0.013, gauge6: 0.01, gauge7: 0 },
    exText: (o) => `Example: on a 1 11/16-inch nut with 1/8-inch margins and a 10–46 set, the gap between strings is ${o.equalGap} in; the high E sits ${o.position6} in from the bass edge.`,
    how: "Enter the nut width, how far the outer strings sit from the edges and the gauges. Equal gaps (the default positions) look and feel most even under the fingers; equal centres are simpler to mark out.",
    assume: "Equal gap = (outer span − sum of gauges + half of the two outer gauges) ÷ (strings − 1). Positions are string centres measured from the bass-side edge.",
    faq: [["What is a standard guitar nut width?", "About 1.65–1.69 in (42–43 mm) on electrics, 1.69–1.75 in on acoustics."], ["Equal gap or equal centre spacing?", "Equal gap is preferred by most luthiers for an even feel."]],
  }),
  mk({
    slug: "piano-bench-height-calculator", title: "Piano Bench Height Calculator",
    desc: "Find the right piano bench height for your height so your forearms are level with the keys — with the adjustment from a standard 19-inch bench and whether a child needs a footrest.",
    meta: "Piano Bench Height Calculator — Correct Seat Height",
    inputs: [dropdown("unit", "Units", opts(["Inches", "Centimeters"]), 0), num("height", "Your Height", 66, 250, 0.5, 30), num("keyHeight", "Height of the White Keys From the Floor", 28.75, 100, 0.05, 10), num("offset", "Preference: Sit Higher (+) or Lower (−)", 0, 4, 0.25, -4)],
    results: [["benchHeight", "Recommended Bench Height", "n"], ["elbowAboveSeat", "Elbow Height Above the Seat (approx.)", "n"], ["adjustmentFromStandard", "Adjustment From a Standard 19-in Bench", "n"], ["footRestNeeded", "Footrest Recommended (1 = yes)", "n"]],
    fn: E.pianoBench, ex: { unit: 0, height: 66, keyHeight: 28.75, offset: 0 },
    exText: (o) => `Example: a 5 ft 6 in player at a standard piano should sit at about ${o.benchHeight} in — ${o.adjustmentFromStandard} in from a 19-inch bench.`,
    how: "Measure the top of the white keys from the floor (most pianos are 28.5–29 in). Sit so your elbows are level with or slightly above the keys, with forearms parallel to the floor.\n\nChildren whose feet don't reach the floor should use a footrest.",
    assume: "Seated elbow height ≈ 0.145 × standing height. Bench height = key height − elbow height above the seat. Proportions vary — adjust by feel.",
    faq: [["What is the standard piano bench height?", "About 19–20 in (48–51 cm)."], ["Should elbows be above the keys?", "Level or slightly above, so the wrists stay relaxed."]],
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
