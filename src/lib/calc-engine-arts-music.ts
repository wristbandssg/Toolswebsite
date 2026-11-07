/**
 * Batch: "Arts & Entertainment Calculators" → Music Theory, Instrument & Audio Calculators
 * (tempo, audio/studio and instrument tools).
 *
 * Data / methods:
 *  - Note lengths: quarter note = 60,000 ÷ BPM ms; dotted × 1.5; triplet × 2/3.
 *  - Metric modulation: new BPM = old BPM × (new note value ÷ old note value), values in quarter notes.
 *  - Tempo/pitch: semitones = 12 × log2(new ÷ old); cents = 100 × semitones.
 *  - Room modes (axial): f = n × c ÷ (2L), c = 343 m/s. Sabine RT60 = 0.161 V ÷ A (metric);
 *    Eyring RT60 = 0.161 V ÷ (−S ln(1 − ᾱ)). Absorption coefficients at 500 Hz are typical published
 *    values. Speaker boundary interference null f = c ÷ (4d).
 *  - Ceiling-speaker coverage: diameter = 2 (ceiling − ear height) tan(angle ÷ 2); spacing by overlap
 *    rule (edge-to-edge 1×, minimum overlap ≈ 0.7×, edge-to-centre 0.5× of diameter).
 *  - Compressor: output = threshold + (input − threshold) ÷ ratio above threshold.
 *  - String tension (Mersenne): T (lb) = UW × (2 L f)² ÷ 386.4, L in inches; unit weight UW ≈ k × d²
 *    (k = 0.2226 plain steel, ≈ 0.18 nickel round-wound, ≈ 0.19 phosphor-bronze — fitted to published
 *    D'Addario unit weights within a few percent).
 *  - Fret positions (equal temperament): distance from nut = L − L ÷ 2^(n/12).
 *  - Voice ranges (typical choral/operatic): bass E2–E4, baritone A2–A4, tenor C3–C5,
 *    countertenor G3–E5, contralto F3–F5, mezzo-soprano A3–A5, soprano C4–C6.
 *  - RC corner frequency f = 1 ÷ (2π R C).
 *  - Seated elbow height above the seat ≈ 0.145 × standing height (anthropometric average); piano key
 *    surface ≈ 28.5–29 in above the floor.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-arts-music-calculators.ts for the copy.
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
const C = 343;
const FT = 0.3048;
const toM = (v: number, unit: number) => (pick(unit, 2) === 0 ? nonNeg(v) * FT : nonNeg(v));
const quarterMs = (bpm: number) => (bpm > 0 ? 60000 / bpm : 0);

// ---------- Tempo ----------
export const bpm: CustomCalculator = (v) => {
  const mode = pick(v.mode, 2);
  const beatsPerBar = Math.max(1, nonNeg(v.beatsPerBar, 4));
  const b = mode === 0 ? (nonNeg(v.seconds) > 0 ? (nonNeg(v.beatsCounted) * 60) / nonNeg(v.seconds) : 0) : nonNeg(v.loopSeconds) > 0 ? (nonNeg(v.bars) * beatsPerBar * 60) / nonNeg(v.loopSeconds) : 0;
  return { bpm: round2(b), halfTime: round2(b / 2), doubleTime: round2(b * 2), beatMs: round2(quarterMs(b)), barSeconds: round2(b > 0 ? (beatsPerBar * 60) / b : 0), beatsPerSecond: round2(b / 60) };
};

export const tempoToMs: CustomCalculator = (v) => {
  const q = quarterMs(nonNeg(v.bpm, 120));
  const mult = [1, 1.5, 2 / 3][pick(v.feel, 3)];
  return { quarterMs: round2(q * mult), wholeMs: round2(q * 4 * mult), halfMs: round2(q * 2 * mult), eighthMs: round2((q / 2) * mult), sixteenthMs: round2((q / 4) * mult), thirtySecondMs: round2((q / 8) * mult), barMs: round2(q * nonNeg(v.beatsPerBar, 4)), quarterHz: round2(q > 0 ? 1000 / (q * mult) : 0) };
};

export const reverbSync: CustomCalculator = (v) => {
  const q = quarterMs(nonNeg(v.bpm, 120));
  const total = q * [1, 2, 4, 8][pick(v.tail, 4)];
  const pre = q / 16; // 1/64 note
  return { preDelayMs: round2(pre), decayMs: round2(total - pre), totalMs: round2(total), preDelay128Ms: round2(q / 32), decaySeconds: round2((total - pre) / 1000) };
};

export const songLength: CustomCalculator = (v) => {
  const b = nonNeg(v.bpm, 120);
  const beats = nonNeg(v.bars) * nonNeg(v.beatsPerBar, 4) * (4 / (nonNeg(v.beatUnit, 4) || 4));
  const sec = (b > 0 ? (beats * 60) / b : 0) + nonNeg(v.extraSeconds);
  const target = nonNeg(v.targetMinutes) * 60;
  return { totalSeconds: round2(sec), minutes: Math.floor(sec / 60), seconds: round2(sec % 60), barsForTarget: round2(b > 0 && beats > 0 && nonNeg(v.bars) > 0 ? ((target - nonNeg(v.extraSeconds)) * b) / 60 / (beats / nonNeg(v.bars)) : 0), barSeconds: round2(nonNeg(v.bars) > 0 ? (sec - nonNeg(v.extraSeconds)) / nonNeg(v.bars) : 0) };
};

export const timeSignature: CustomCalculator = (v) => {
  const top = Math.max(1, Math.round(nonNeg(v.numerator, 6)));
  const unit = [2, 4, 8, 16][pick(v.denominator, 4)];
  const b = nonNeg(v.bpm, 120); // in the denominator's note value
  const compound = top % 3 === 0 && top > 3;
  const type = compound ? 1 : [2, 3, 4].includes(top) ? 0 : 2;
  const beatsFelt = compound ? top / 3 : top;
  const barSec = b > 0 ? (top * 60) / b : 0;
  return { meterType: type, beatsFelt, barSeconds: round2(barSec), totalSeconds: round2(barSec * nonNeg(v.bars)), quarterNotesPerBar: round2((top * 4) / unit), feltBpm: round2(compound ? b / 3 : b) };
};

export const NOTE_VALUES: [string, number][] = [["Whole", 4], ["Dotted half", 3], ["Half", 2], ["Dotted quarter", 1.5], ["Quarter", 1], ["Quarter triplet", 2 / 3], ["Dotted eighth", 0.75], ["Eighth", 0.5], ["Eighth triplet", 1 / 3], ["Sixteenth quintuplet", 0.2], ["Sixteenth", 0.25], ["Sixteenth triplet", 1 / 6], ["Thirty-second", 0.125]];
export const metricModulation: CustomCalculator = (v) => {
  const old = nonNeg(v.oldBpm, 120);
  const a = NOTE_VALUES[pick(v.oldNote, NOTE_VALUES.length)][1];
  const b = NOTE_VALUES[pick(v.newNote, NOTE_VALUES.length)][1];
  const nb = a > 0 ? (old * b) / a : 0;
  return { newBpm: round2(nb), ratio: round2(a > 0 ? b / a : 0), percentChange: round2(old > 0 ? ((nb - old) / old) * 100 : 0), oldQuarterMs: round2(quarterMs(old)), newQuarterMs: round2(quarterMs(nb)) };
};

export const SUBDIVISIONS: [string, number][] = [["Quarter notes", 1], ["Eighth notes", 2], ["Eighth-note triplets", 3], ["Sixteenth notes", 4], ["Sixteenth quintuplets", 5], ["Sixteenth-note sextuplets", 6], ["Septuplets", 7], ["Thirty-second notes", 8]];
export const notesPerSecond: CustomCalculator = (v) => {
  const per = SUBDIVISIONS[pick(v.subdivision, SUBDIVISIONS.length)][1];
  const nps = (nonNeg(v.bpm, 160) / 60) * per;
  const targetNps = nonNeg(v.targetNps);
  return { notesPerSecond: round2(nps), noteLengthMs: round2(nps > 0 ? 1000 / nps : 0), notesPerMinute: round2(nps * 60), bpmForTarget: round2((targetNps * 60) / per) };
};

export const tempoPitch: CustomCalculator = (v) => {
  const a = nonNeg(v.originalBpm, 120);
  const b = pick(v.mode, 2) === 0 ? nonNeg(v.newBpm, 128) : a * Math.pow(2, safeNumber(v.semitones) / 12);
  const st = a > 0 && b > 0 ? 12 * Math.log2(b / a) : 0;
  return { semitoneShift: round2(st), cents: Math.round(st * 100), newBpm: round2(b), speedPercent: round2(a > 0 ? (b / a) * 100 : 0), newKey: pc(safeNumber(v.originalKey) + Math.round(st)), playbackRate: round2(a > 0 ? b / a : 0) };
};

// ---------- Studio & live sound ----------
export const roomModes: CustomCalculator = (v) => {
  const L = toM(v.length, v.unit);
  const W = toM(v.width, v.unit);
  const H = toM(v.height, v.unit);
  const f = (d: number, n: number) => (d > 0 ? round2((n * C) / (2 * d)) : 0);
  const modes = [f(L, 1), f(W, 1), f(H, 1)].filter((x) => x > 0);
  const vol = L * W * H;
  return { lengthMode1: f(L, 1), lengthMode2: f(L, 2), lengthMode3: f(L, 3), widthMode1: f(W, 1), widthMode2: f(W, 2), heightMode1: f(H, 1), heightMode2: f(H, 2), lowestMode: modes.length ? Math.min(...modes) : 0, schroederHz: Math.round(vol > 0 ? 2000 * Math.sqrt(0.5 / vol) : 0), ratioWidth: round2(H > 0 ? W / H : 0), ratioLength: round2(H > 0 ? L / H : 0) };
};

export const MATERIALS: [string, number][] = [["Concrete / brick (painted)", 0.02], ["Drywall / plaster", 0.05], ["Wood floor or panelling", 0.07], ["Tile / glass", 0.03], ["Thin carpet", 0.15], ["Thick carpet on underlay", 0.35], ["Acoustic ceiling tile", 0.7], ["Heavy curtains", 0.55], ["Acoustic foam / fabric panels", 0.9]];
export const reverbTime: CustomCalculator = (v) => {
  const L = toM(v.length, v.unit);
  const W = toM(v.width, v.unit);
  const H = toM(v.height, v.unit);
  const a = (k: string) => MATERIALS[pick(v[k], MATERIALS.length)][1];
  const floor = L * W;
  const walls = 2 * (L + W) * H;
  const extra = pick(v.unit, 2) === 0 ? nonNeg(v.panelArea) * FT * FT : nonNeg(v.panelArea);
  const S = 2 * floor + walls;
  const A = floor * a("floorMaterial") + floor * a("ceilingMaterial") + Math.max(0, walls - extra) * a("wallMaterial") + extra * 0.9 + nonNeg(v.people) * 0.45;
  const V = L * W * H;
  const alpha = S > 0 ? Math.min(0.99, A / S) : 0;
  return { rt60Sabine: round2(A > 0 ? (0.161 * V) / A : 0), rt60Eyring: round2(alpha > 0 ? (0.161 * V) / (-S * Math.log(1 - alpha)) : 0), volumeM3: round2(V), absorptionSabins: round2(A), averageAbsorption: round2(alpha), panelAreaForHalfSecond: round2(V > 0 ? Math.max(0, ((0.161 * V) / 0.5 - A) / (0.9 - a("wallMaterial"))) : 0) };
};

export const monitorPlacement: CustomCalculator = (v) => {
  const metric = pick(v.unit, 2) === 1;
  const L = nonNeg(v.roomLength);
  const W = nonNeg(v.roomWidth);
  const spacing = nonNeg(v.speakerSpacing, metric ? 1.5 : 5);
  const listen = L * 0.38;
  const side = Math.max(0, (W - spacing) / 2);
  const frontToSpeaker = Math.max(0, listen - spacing * Math.cos(Math.PI / 6));
  const dM = metric ? frontToSpeaker : frontToSpeaker * FT;
  return { listeningFromFrontWall: round2(listen), speakerFromFrontWall: round2(frontToSpeaker), speakerFromSideWall: round2(side), listeningDistance: round2(spacing), toeInDegrees: 30, sbirNullHz: Math.round(dM > 0 ? C / (4 * dM) : 0) };
};

export const compressor: CustomCalculator = (v) => {
  const t = safeNumber(v.threshold, -18);
  const ratio = Math.max(1, nonNeg(v.ratio, 4));
  const input = safeNumber(v.inputLevel, -6);
  const out = input > t ? t + (input - t) / ratio : input;
  const gr = input - out;
  const q = quarterMs(nonNeg(v.bpm, 120));
  return { gainReductionDb: round2(gr), outputLevelDb: round2(out + nonNeg(v.makeupGain)), makeupSuggestedDb: round2(gr / 2), releaseQuarterMs: round2(q), releaseEighthMs: round2(q / 2), releaseSixteenthMs: round2(q / 4) };
};

export const speakerCoverage: CustomCalculator = (v) => {
  const metric = pick(v.unit, 2) === 1;
  const h = Math.max(0, nonNeg(v.ceilingHeight) - nonNeg(v.earHeight));
  const dia = 2 * h * Math.tan((nonNeg(v.angle, 90) * Math.PI) / 360);
  const spacing = dia * [1, 0.7, 0.5][pick(v.overlap, 3)];
  const along = spacing > 0 ? Math.max(1, Math.ceil(nonNeg(v.roomLength) / spacing - 1e-9)) : 0;
  const across = spacing > 0 ? Math.max(1, Math.ceil(nonNeg(v.roomWidth) / spacing - 1e-9)) : 0;
  return { speakersNeeded: along * across, coverageDiameter: round2(dia), speakerSpacing: round2(spacing), speakersAlongLength: along, speakersAcrossWidth: across, coverageAreaEach: round2((Math.PI * dia * dia) / 4), unitIsMeters: metric ? 1 : 0 };
};

// ---------- Instruments ----------
export const TUNINGS: [string, number[]][] = [
  ["Guitar — standard E (E2 A2 D3 G3 B3 E4)", [40, 45, 50, 55, 59, 64]], ["Guitar — drop D", [38, 45, 50, 55, 59, 64]], ["Guitar — E♭ standard", [39, 44, 49, 54, 58, 63]], ["Guitar — D standard", [38, 43, 48, 53, 57, 62]], ["Guitar — drop C", [36, 43, 48, 53, 57, 62]], ["Guitar — open G", [38, 43, 50, 55, 59, 62]],
  ["Bass — 4-string E A D G", [28, 33, 38, 43, 0, 0]], ["Bass — 5-string B E A D G", [23, 28, 33, 38, 43, 0]], ["Baritone guitar — B standard", [35, 40, 45, 50, 54, 59]],
];
export const STRING_TYPES: [string, number][] = [["Electric (nickel-wound)", 0.18], ["Acoustic (phosphor bronze)", 0.19], ["Acoustic (80/20 bronze)", 0.185], ["Bass (nickel round-wound)", 0.18], ["Stainless steel wound", 0.175]];
const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const unitWeight = (gauge: number, k: number, plainMax: number) => (gauge > 0 ? gauge * gauge * (gauge <= plainMax ? 0.2226 : k) : 0);
export const stringTension: CustomCalculator = (v) => {
  const L = pick(v.lengthUnit, 2) === 1 ? nonNeg(v.scaleLength) / 25.4 : nonNeg(v.scaleLength, 25.5);
  const notes = TUNINGS[pick(v.tuning, TUNINGS.length)][1];
  const k = STRING_TYPES[pick(v.stringType, STRING_TYPES.length)][1];
  const plainMax = pick(v.tuning, TUNINGS.length) >= 6 && pick(v.tuning, TUNINGS.length) <= 7 ? 0 : 0.02;
  const shift = Math.round(safeNumber(v.semitoneShift));
  const out: Record<string, number> = {};
  let total = 0;
  for (let i = 0; i < 6; i++) {
    const g = nonNeg(v[`gauge${i + 1}`]);
    const t = notes[i] && g > 0 ? (unitWeight(g, k, plainMax) * Math.pow(2 * L * freq(notes[i] + shift), 2)) / 386.4 : 0;
    out[`tension${i + 1}`] = round2(t);
    total += t;
  }
  return { totalTension: round2(total), ...out, totalKg: round2(total * 0.4536) };
};

export const stringGauge: CustomCalculator = (v) => {
  const L = pick(v.lengthUnit, 2) === 1 ? nonNeg(v.scaleLength) / 25.4 : nonNeg(v.scaleLength, 25.5);
  const midi = pc(v.note) + 12 * (Math.round(safeNumber(v.octave, 2)) + 1);
  const f = freq(midi);
  const uw = L > 0 ? (nonNeg(v.targetTension, 17) * 386.4) / Math.pow(2 * L * f, 2) : 0;
  const k = pick(v.construction, 2) === 0 ? 0.2226 : STRING_TYPES[pick(v.stringType, STRING_TYPES.length)][1];
  const d = Math.sqrt(uw / k);
  return { gaugeInches: Math.round(d * 10000) / 10000, gaugeThousandths: round2(d * 1000), gaugeMm: round2(d * 25.4), nearestCommonGauge: Math.round(d * 1000), unitWeight: Math.round(uw * 1e8) / 1e8, frequencyHz: round2(f) };
};

export const fret: CustomCalculator = (v) => {
  const L = nonNeg(v.scaleLength, 25.5);
  const n = Math.max(1, Math.round(nonNeg(v.fret, 12)));
  const pos = (k: number) => L - L / Math.pow(2, k / 12);
  return { fromNut: Math.round(pos(n) * 1000) / 1000, fromPreviousFret: Math.round((pos(n) - pos(n - 1)) * 1000) / 1000, toBridge: Math.round((L - pos(n)) * 1000) / 1000, fret1: Math.round(pos(1) * 1000) / 1000, fret5: Math.round(pos(5) * 1000) / 1000, fret7: Math.round(pos(7) * 1000) / 1000, fret12: Math.round(pos(12) * 1000) / 1000, fret24: Math.round(pos(24) * 1000) / 1000 };
};

export const VOICES: [string, number, number][] = [["Bass", 40, 64], ["Baritone", 45, 69], ["Tenor", 48, 72], ["Countertenor", 55, 76], ["Contralto (alto)", 53, 77], ["Mezzo-soprano", 57, 81], ["Soprano", 60, 84]];
export const vocalRange: CustomCalculator = (v) => {
  const lo = pc(v.lowNote) + 12 * (Math.round(safeNumber(v.lowOctave, 2)) + 1);
  const hi = pc(v.highNote) + 12 * (Math.round(safeNumber(v.highOctave, 4)) + 1);
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  let best = 0;
  let bestScore = Infinity;
  VOICES.forEach(([, l, h], i) => { const s = Math.abs(a - l) + Math.abs(b - h); if (s < bestScore) { bestScore = s; best = i; } });
  return { voiceType: best, rangeSemitones: b - a, rangeOctaves: round2((b - a) / 12), lowestHz: round2(freq(a)), highestHz: round2(freq(b)), middleNote: pc(Math.round((a + b) / 2)) };
};

export const toneStack: CustomCalculator = (v) => {
  const f = (rK: number, cNf: number) => (rK > 0 && cNf > 0 ? 1 / (2 * Math.PI * rK * 1000 * cNf * 1e-9) : 0);
  return { trebleCornerHz: Math.round(f(nonNeg(v.slopeR), nonNeg(v.trebleC))), bassCornerHz: Math.round(f(nonNeg(v.bassR), nonNeg(v.bassC))), midCornerHz: Math.round(f(nonNeg(v.midR), nonNeg(v.midC))), toneControlCutoffHz: Math.round(f(nonNeg(v.toneR), nonNeg(v.toneC))) };
};

export const neckAngle: CustomCalculator = (v) => {
  const rise = nonNeg(v.bridgeHeight) - nonNeg(v.fretboardHeight);
  const d = nonNeg(v.distanceToBridge);
  const angle = d > 0 ? (Math.atan(rise / d) * 180) / Math.PI : 0;
  return { neckAngleDegrees: round2(angle), riseNeeded: round2(rise), shimThickness: Math.round(Math.tan((angle * Math.PI) / 180) * nonNeg(v.heelLength) * 1000) / 1000, angleIsZeroOrLess: angle <= 0 ? 1 : 0 };
};

export const CYMBAL_CLASSES = ["Paper thin", "Thin", "Medium-thin", "Medium", "Medium-heavy", "Heavy"];
export const cymbalWeight: CustomCalculator = (v) => {
  const dia = pick(v.diameterUnit, 2) === 1 ? nonNeg(v.diameter) / 2.54 : nonNeg(v.diameter, 18);
  const g = pick(v.weightUnit, 2) === 1 ? nonNeg(v.weight) * 453.592 : nonNeg(v.weight, 1500);
  const idx = dia > 0 ? g / (dia * dia) : 0;
  const cls = idx < 4.2 ? 0 : idx < 4.9 ? 1 : idx < 5.6 ? 2 : idx < 6.4 ? 3 : idx < 7.4 ? 4 : 5;
  return { weightClass: cls, weightIndex: round2(idx), grams: Math.round(g), pounds: round2(g / 453.592), mediumRangeLowGrams: Math.round(5.6 * dia * dia), mediumRangeHighGrams: Math.round(6.4 * dia * dia) };
};

export const stringSpacing: CustomCalculator = (v) => {
  const n = Math.max(2, Math.round(nonNeg(v.strings, 6)));
  const span = Math.max(0, nonNeg(v.width) - 2 * nonNeg(v.edgeMargin));
  const gauges = [1, 2, 3, 4, 5, 6, 7].map((i) => nonNeg(v[`gauge${i}`])).slice(0, n);
  const centers = span / (n - 1);
  const totalG = gauges.reduce((s, x) => s + x, 0);
  const gap = (span - totalG + (gauges[0] + gauges[n - 1]) / 2) / (n - 1);
  const out: Record<string, number> = { equalCenterSpacing: Math.round(centers * 1000) / 1000, equalGap: Math.round(gap * 1000) / 1000, outerStringSpan: Math.round(span * 1000) / 1000 };
  let pos = nonNeg(v.edgeMargin);
  for (let i = 0; i < 7; i++) {
    out[`position${i + 1}`] = i < n ? Math.round(pos * 1000) / 1000 : 0;
    if (i < n - 1) pos += gap + (gauges[i] + gauges[i + 1]) / 2;
  }
  return out;
};

export const pianoBench: CustomCalculator = (v) => {
  const metric = pick(v.unit, 2) === 1;
  const h = metric ? nonNeg(v.height) / 2.54 : nonNeg(v.height, 66);
  const keys = metric ? nonNeg(v.keyHeight) / 2.54 : nonNeg(v.keyHeight, 28.75);
  const elbow = 0.145 * h;
  const bench = keys - elbow + nonNeg(v.offset);
  const k = metric ? 2.54 : 1;
  return { benchHeight: round2(bench * k), elbowAboveSeat: round2(elbow * k), adjustmentFromStandard: round2((bench - 19) * k), footRestNeeded: h < 54 ? 1 : 0 };
};

export const artsMusicCustomCalculators: Record<string, CustomCalculator> = {
  "bpm-calculator": bpm,
  "tempo-to-ms-calculator": tempoToMs,
  "reverb-calculator": reverbSync,
  "song-length-calculator": songLength,
  "time-signature-calculator": timeSignature,
  "metric-modulation-calculator": metricModulation,
  "notes-per-second-calculator": notesPerSecond,
  "tempo-pitch-calculator": tempoPitch,
  "room-mode-calculator": roomModes,
  "reverb-time-calculator": reverbTime,
  "studio-monitor-placement-calculator": monitorPlacement,
  "compressor-calculator": compressor,
  "qsc-speaker-coverage-calculator": speakerCoverage,
  "string-tension-calculator": stringTension,
  "string-gauge-calculator": stringGauge,
  "fret-calculator": fret,
  "vocal-range-calculator": vocalRange,
  "tone-stack-calculator": toneStack,
  "guitar-neck-angle-calculator": neckAngle,
  "cymbal-weight-calculator": cymbalWeight,
  "string-spacing-calculator": stringSpacing,
  "piano-bench-height-calculator": pianoBench,
};
