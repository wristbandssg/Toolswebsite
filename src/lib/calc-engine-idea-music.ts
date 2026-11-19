/**
 * Idea build, batch music (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Arts & Entertainment > Music Theory, Instrument & Audio (31 tools).
 * Equal temperament A4 = 440 Hz: f = 440·2^((n−49)/12) for piano key n. Fret distance from nut
 * d = L(1 − 2^(−n/12)). Helmholtz port length Lv = 23562.5·D²·Np/(Fb²·Vb) − k·D (cm, litres).
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, money } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteIdx = (s: string) => {
  const m = s.trim().match(/^([A-Ga-g])([#b♯♭]?)$/);
  if (!m) throw new InputError(`"${s}" isn't a note — use letters like C, F#, Bb.`);
  let i = SHARP.indexOf(m[1].toUpperCase());
  if (m[2] === "#" || m[2] === "♯") i++; else if (m[2] === "b" || m[2] === "♭") i--;
  return (i + 12) % 12;
};

export const NOTE_VAL = ["Whole", "Half", "Quarter", "Eighth", "Sixteenth", "Thirty-second"];
export const bpmDelay: Calc = (v) => {
  const bpm = need(p(v, "bpm", 120), "Enter a tempo."), q = 60000 / bpm;
  const vals = [4, 2, 1, 0.5, 0.25, 0.125];
  return { q: `${q.toFixed(2)} ms per quarter note`, list: vals.map((x, i) => `${NOTE_VAL[i]} ${(q * x).toFixed(1)} ms`).join(" · "), dotted: `Dotted 1/8 ${(q * 0.75).toFixed(1)} ms · Triplet 1/8 ${(q / 3).toFixed(1)} ms`, hz: `${(bpm / 60).toFixed(3)} Hz LFO sync (1/4)` };
};
export const songLength: Calc = (v) => {
  const bpm = need(p(v, "bpm", 120), "Enter a tempo."), bars = p(v, "bars", 96), beats = need(p(v, "beats", 4), "Enter beats per bar.");
  const sec = (bars * beats * 60) / bpm;
  return { len: `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`, sec: `${sec.toFixed(1)} seconds`, bar: `${((beats * 60) / bpm).toFixed(3)} s per bar`, target: `${Math.round((p(v, "target", 210) * bpm) / (60 * beats))} bars for ${p(v, "target", 210)} s` };
};
export const fretPos: Calc = (v) => {
  const L = need(p(v, "scale", 25.5), "Enter scale length."), frets = Math.min(36, Math.max(1, Math.round(p(v, "frets", 22))));
  const d = (n: number) => L * (1 - Math.pow(2, -n / 12));
  return { f12: `Fret 12 at ${d(12).toFixed(3)} from the nut`, list: Array.from({ length: Math.min(frets, 24) }, (_, i) => `${i + 1}: ${d(i + 1).toFixed(3)}`).join(" · "), last: `Fret ${frets} at ${d(frets).toFixed(3)}` };
};
export const capoTranspose: Calc = (v) => {
  const chords = txt(v, "chords").split(/[\s,]+/).filter(Boolean), capo = Math.round(num(v.capo, 2));
  if (!chords.length) throw new InputError("Type chord shapes like G C D Em.");
  const tr = (c: string, k: number) => { const m = c.match(/^([A-G][#b]?)(.*)$/); if (!m) return c; return SHARP[(noteIdx(m[1]) + k + 120) % 12] + m[2]; };
  return { sound: chords.map((c) => tr(c, capo)).join(" "), shapes: `Shapes ${chords.join(" ")} with capo on fret ${capo}`, noCapo: `Without capo, play the sounding chords above` };
};
export const centsDiff: Calc = (v) => {
  const f1 = need(p(v, "f1", 440), "Enter frequency 1."), f2 = need(p(v, "f2", 445), "Enter frequency 2.");
  const c = 1200 * Math.log2(f2 / f1);
  return { cents: `${c.toFixed(2)} cents`, semis: `${(c / 100).toFixed(3)} semitones`, beat: `${Math.abs(f2 - f1).toFixed(2)} Hz beat frequency`, tune: Math.abs(c) < 5 ? "In tune to most ears (< 5 cents)" : c > 0 ? "Sharp" : "Flat" };
};
export const IMP_MODE = ["Parallel", "Series"];
export const speakerImp: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 2))), z = need(p(v, "z", 8), "Enter speaker impedance."), par = pick(v.mode, 2) === 0;
  const tot = par ? z / n : z * n;
  return { z: `${tot.toFixed(2)} Ω total`, safe: tot < p(v, "min", 4) ? `Below the amp's ${p(v, "min", 4)} Ω minimum — risk of overheating` : "Safe for the amplifier's minimum load", power: `Each speaker gets 1/${n} of the power` };
};
export const ampDb: Calc = (v) => {
  const w1 = need(p(v, "w1", 50), "Enter power 1."), w2 = need(p(v, "w2", 100), "Enter power 2."), sens = num(v.sens, 88), d = need(p(v, "d", 3), "Enter listening distance.");
  const spl = (w: number) => sens + 10 * Math.log10(w) - 20 * Math.log10(d);
  return { gain: `${(10 * Math.log10(w2 / w1)).toFixed(2)} dB louder`, spl: `${spl(w1).toFixed(1)} dB → ${spl(w2).toFixed(1)} dB SPL at ${d} m`, note: "Doubling power adds only 3 dB; it takes 10× power to sound twice as loud" };
};
export const dbAdd: Calc = (v) => {
  const vals = txt(v, "levels").split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!vals.length || vals.some((x) => !Number.isFinite(x))) throw new InputError("Enter decibel levels separated by commas.");
  const sum = 10 * Math.log10(vals.reduce((s, x) => s + Math.pow(10, x / 10), 0));
  return { total: `${sum.toFixed(2)} dB combined`, n: `${vals.length} sources`, avg: `${(10 * Math.log10(vals.reduce((s, x) => s + Math.pow(10, x / 10), 0) / vals.length)).toFixed(2)} dB energy average` };
};
export const inverseSquare: Calc = (v) => {
  const l1 = num(v.l1, 100), d1 = need(p(v, "d1", 1), "Enter reference distance."), d2 = need(p(v, "d2", 10), "Enter new distance.");
  const l2 = l1 - 20 * Math.log10(d2 / d1);
  return { l2: `${l2.toFixed(1)} dB at ${d2}`, drop: `${(l1 - l2).toFixed(1)} dB drop (6 dB per doubling of distance)`, note: "Free-field point source; rooms and line arrays fall off more slowly" };
};
export const dataRate: Calc = (v) => {
  const sr = need(p(v, "sr", 48000), "Enter sample rate."), bd = need(p(v, "bd", 24), "Enter bit depth."), ch = Math.max(1, Math.round(p(v, "ch", 2))), mins = p(v, "mins", 60);
  const bps = sr * bd * ch, mb = (bps * mins * 60) / 8 / 1e6;
  return { rate: `${(bps / 1000).toFixed(0)} kbps (${(bps / 8 / 1e6 * 60).toFixed(2)} MB per minute)`, size: `${mb >= 1000 ? (mb / 1000).toFixed(2) + " GB" : mb.toFixed(0) + " MB"} for ${mins} min`, dyn: `${(6.02 * bd).toFixed(0)} dB dynamic range · Nyquist ${(sr / 2000).toFixed(1)} kHz` };
};
export const portLength: Calc = (v) => {
  const vb = need(p(v, "vb", 40), "Enter box volume."), fb = need(p(v, "fb", 35), "Enter tuning frequency."), dcm = need(p(v, "d", 10), "Enter port diameter."), np = Math.max(1, Math.round(p(v, "np", 1)));
  const L = (23562.5 * dcm * dcm * np) / (fb * fb * vb) - 0.732 * dcm;
  if (L <= 0) throw new InputError("Port would be negative length — use a smaller port or lower tuning.");
  return { len: `${L.toFixed(1)} cm (${(L / 2.54).toFixed(2)} in) per port`, area: `${(np * Math.PI * (dcm / 2) ** 2).toFixed(0)} cm² total port area`, note: `${vb} L box tuned to ${fb} Hz` };
};
export const crossoverCap: Calc = (v) => {
  const f = need(p(v, "f", 3000), "Enter crossover frequency."), z = need(p(v, "z", 8), "Enter impedance.");
  const c1 = 1 / (2 * Math.PI * f * z), l1 = z / (2 * Math.PI * f);
  return { c: `${(c1 * 1e6).toFixed(2)} µF capacitor (tweeter, 1st order)`, l: `${(l1 * 1000).toFixed(3)} mH inductor (woofer, 1st order)`, second: `2nd-order Butterworth: C ${(c1 / Math.SQRT2 * 1e6).toFixed(2)} µF, L ${(l1 * Math.SQRT2 * 1000).toFixed(3)} mH` };
};
export const pianoKey: Calc = (v) => {
  const n = Math.min(88, Math.max(1, Math.round(p(v, "key", 40)))), a4 = need(p(v, "a4", 440), "Enter A4 reference.");
  const f = a4 * Math.pow(2, (n - 49) / 12), name = SHARP[(n + 8) % 12] + Math.floor((n + 8) / 12);
  return { f: `${f.toFixed(3)} Hz`, name: `Key ${n} = ${name}`, period: `${(1000 / f).toFixed(3)} ms period, ${(343 / f).toFixed(2)} m wavelength` };
};
export const DRUMS = ["Kick", "Floor tom", "Rack tom", "Snare", "Timpani"];
const DRUM_K = [[40, 80], [80, 120], [120, 220], [150, 250], [80, 200]];
export const drumTuning: Calc = (v) => {
  const d = pick(v.drum, 5), size = need(p(v, "size", 14), "Enter drum diameter."), [lo, hi] = DRUM_K[d];
  const f = Math.min(hi, Math.max(lo, (lo + hi) / 2 * (14 / size)));
  const note = SHARP[(Math.round(12 * Math.log2(f / 440)) + 9 + 1200) % 12];
  return { f: `${f.toFixed(0)} Hz fundamental (≈ ${note})`, range: `${lo}–${hi} Hz typical for a ${DRUMS[d].toLowerCase()}`, tip: "Tune each lug to the same pitch, tapping 1 in from the edge" };
};
const CHORDS: [string, number[]][] = [["major", [0, 4, 7]], ["minor", [0, 3, 7]], ["diminished", [0, 3, 6]], ["augmented", [0, 4, 8]], ["sus2", [0, 2, 7]], ["sus4", [0, 5, 7]], ["7", [0, 4, 7, 10]], ["maj7", [0, 4, 7, 11]], ["m7", [0, 3, 7, 10]], ["m7♭5", [0, 3, 6, 10]], ["dim7", [0, 3, 6, 9]], ["6", [0, 4, 7, 9]], ["m6", [0, 3, 7, 9]], ["add9", [0, 2, 4, 7]]];
export const chordFinder: Calc = (v) => {
  const ns = [...new Set(txt(v, "notes").split(/[\s,]+/).filter(Boolean).map(noteIdx))];
  if (ns.length < 2) throw new InputError("Enter at least two notes, e.g. C E G.");
  const found: string[] = [];
  for (const root of ns) { const set = ns.map((n) => (n - root + 12) % 12).sort((a, b) => a - b).join(","); for (const [nm, iv] of CHORDS) if ([...iv].sort((a, b) => a - b).join(",") === set) found.push(`${SHARP[root]} ${nm}${root !== ns[0] ? ` (inversion, bass ${SHARP[ns[0]]})` : ""}`); }
  return { chord: found[0] ?? "No standard chord matches", other: found.slice(1).join(" · ") || "—", notes: ns.map((n) => SHARP[n]).join(" ") };
};
export const SCALES = ["Major", "Natural minor", "Harmonic minor", "Melodic minor", "Major pentatonic", "Minor pentatonic", "Blues", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian"];
const SC = [[0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 8, 11], [0, 2, 3, 5, 7, 9, 11], [0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 3, 5, 6, 7, 10], [0, 2, 3, 5, 7, 9, 10], [0, 1, 3, 5, 7, 8, 10], [0, 2, 4, 6, 7, 9, 11], [0, 2, 4, 5, 7, 9, 10], [0, 1, 3, 5, 6, 8, 10]];
export const scaleBuilder: Calc = (v) => {
  const r = pick(v.root, 12), s = pick(v.scale, SC.length), iv = SC[s];
  return { notes: iv.map((x) => SHARP[(r + x) % 12]).join(" "), steps: iv.map((x, i) => ((iv[i + 1] ?? 12) - x === 2 ? "W" : (iv[i + 1] ?? 12) - x === 1 ? "H" : `${(iv[i + 1] ?? 12) - x}`)).join("-"), name: `${SHARP[r]} ${SCALES[s]}` };
};
export const circleFifths: Calc = (v) => {
  const r = pick(v.key, 12), minor = pick(v.mode, 2) === 1, major = minor ? (r + 3) % 12 : r;
  const order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5], pos = order.indexOf(major), acc = pos <= 6 ? pos : pos - 12;
  return { sig: acc === 0 ? "No sharps or flats" : acc > 0 ? `${acc} sharp${acc > 1 ? "s" : ""}` : `${-acc} flat${acc < -1 ? "s" : ""}`, rel: minor ? `Relative major: ${SHARP[major]}` : `Relative minor: ${SHARP[(major + 9) % 12]}m`, near: `Neighbours: ${SHARP[order[(pos + 11) % 12]]} and ${SHARP[order[(pos + 1) % 12]]} major (IV and V)` };
};
export const beatCounter: Calc = (v) => {
  const top = need(p(v, "top", 6), "Enter beats per bar."), bottom = pick(v.bottom, 4), bpm = need(p(v, "bpm", 120), "Enter tempo.");
  const unit = [2, 4, 8, 16][bottom], compound = top % 3 === 0 && top > 3 && unit >= 8;
  return { feel: compound ? `Compound: ${top / 3} dotted beats per bar` : `Simple: ${top} beats per bar`, bar: `${((top * 60) / bpm * (4 / unit)).toFixed(3)} s per bar at ♩=${bpm}`, count: compound ? Array.from({ length: top / 3 }, (_, i) => `${i + 1}-la-li`).join(" ") : Array.from({ length: top }, (_, i) => String(i + 1)).join(" ") };
};
export const swingRatio: Calc = (v) => {
  const bpm = need(p(v, "bpm", 120), "Enter tempo."), sw = Math.min(75, Math.max(50, p(v, "sw", 66))) / 100, beat = 60000 / bpm;
  return { long: `${(beat * sw).toFixed(1)} ms long 8th`, short: `${(beat * (1 - sw)).toFixed(1)} ms short 8th`, ratio: `${(sw / (1 - sw)).toFixed(2)}:1 (${(sw * 100).toFixed(0)}% swing; 66.7% = triplet feel)` };
};
export const lessonPrice: Calc = (v) => {
  const students = p(v, "st", 20), rate = p(v, "rate", 50), weeks = p(v, "wk", 44), mins = p(v, "mins", 45), costs = p(v, "costs", 3000);
  const yearly = students * rate * weeks;
  return { year: $(yearly - costs, 0) + " a year after costs", hourly: $((rate * 60) / Math.max(mins, 1)) + " effective hourly rate", month: $((yearly - costs) / 12, 0) + " a month" };
};
export const gigSplit: Calc = (v) => {
  const fee = p(v, "fee", 1200), members = Math.max(1, Math.round(p(v, "n", 4))), agent = p(v, "agent", 10) / 100, travel = p(v, "travel", 150), fund = p(v, "fund", 10) / 100;
  const net = fee * (1 - agent) - travel, each = (net * (1 - fund)) / members;
  return { each: $(each) + " per member", fund: $(net * fund) + " to the band fund", net: $(net) + ` after ${(agent * 100).toFixed(0)}% agent and ${$(travel, 0)} travel` };
};
export const studioCost: Calc = (v) => {
  const songs = p(v, "songs", 5), track = p(v, "track", 6), mix = p(v, "mix", 3), rate = p(v, "rate", 60), master = p(v, "master", 75);
  const hours = songs * (track + mix), total = hours * rate + songs * master;
  return { total: $(total, 0), hours: `${hours} studio hours`, perSong: $(total / Math.max(songs, 1), 0) + " per song" };
};
export const VINYL = ['12" at 33⅓ rpm', '12" at 45 rpm', '10" at 33⅓ rpm', '7" at 45 rpm'];
const VMAX = [22, 15, 15, 5];
export const vinylSide: Calc = (v) => {
  const t = pick(v.fmt, 4), mins = p(v, "mins", 40), max = VMAX[t];
  const sides = Math.ceil((mins / 2) / max) * 2;
  return { side: `${(mins / 2).toFixed(1)} min per side`, ok: mins / 2 <= max ? `Fits (max ≈ ${max} min per side for good volume and bass)` : `Too long — needs about ${sides} sides`, note: `Recommended ≤ ${max} min per side on ${VINYL[t]}` };
};
export const ukeFret: Calc = (v) => {
  const sizes = [13, 15, 17, 19], L = sizes[pick(v.size, 4)], frets = 12;
  const d = (n: number) => L * (1 - Math.pow(2, -n / 12));
  return { scale: `${L} in scale length`, list: Array.from({ length: frets }, (_, i) => `${i + 1}: ${d(i + 1).toFixed(3)} in`).join(" · "), f12: `12th fret at ${d(12).toFixed(3)} in` };
};
export const fluteHole: Calc = (v) => {
  const key = need(p(v, "f", 440), "Enter the flute's lowest note frequency."), bore = need(p(v, "bore", 19), "Enter bore diameter (mm).");
  const L = (343000 / (2 * key)) - 0.6 * bore, ratios = [9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];
  return { len: `${L.toFixed(0)} mm from embouchure to end`, holes: ratios.map((r, i) => `Hole ${6 - i}: ${(343000 / (2 * key * r) - 0.6 * bore).toFixed(0)} mm`).join(" · "), note: "Approximate open-pipe positions — drill small and tune upward" };
};
export const lufsGain: Calc = (v) => {
  const cur = num(v.cur, -18), target = num(v.target, -14), peak = num(v.peak, -3);
  const g = target - cur, newPeak = peak + g;
  return { gain: `${g >= 0 ? "+" : ""}${g.toFixed(1)} dB`, peak: `${newPeak.toFixed(1)} dBTP after gain${newPeak > -1 ? " — limit to −1 dBTP" : ""}`, target: "Spotify/YouTube ≈ −14 LUFS · Apple Music −16 · broadcast −23" };
};
export const metronomePlan: Calc = (v) => {
  const start = need(p(v, "start", 80), "Enter start tempo."), goal = need(p(v, "goal", 120), "Enter goal tempo."), step = need(p(v, "step", 4), "Enter step."), per = p(v, "per", 3);
  const steps = Math.ceil((goal - start) / step);
  return { steps: `${steps} tempo steps of ${step} BPM`, days: `${steps * per} practice days at ${per} days per step`, path: Array.from({ length: Math.min(steps + 1, 15) }, (_, i) => Math.min(goal, start + i * step)).join(" → ") };
};
export const delayFeedback: Calc = (v) => {
  const ms = need(p(v, "ms", 375), "Enter delay time."), fb = Math.min(99, p(v, "fb", 40)) / 100, floor = p(v, "floor", 60);
  const repeats = Math.ceil(floor / (-20 * Math.log10(fb)));
  return { repeats: `${repeats} audible repeats`, time: `${((repeats * ms) / 1000).toFixed(2)} s tail`, drop: `${(-20 * Math.log10(fb)).toFixed(1)} dB quieter each repeat` };
};
export const pitchRatio: Calc = (v) => {
  const s = num(v.semi, 3), c = num(v.cents, 0), r = Math.pow(2, (s + c / 100) / 12);
  return { ratio: r.toFixed(6), pct: `${((r - 1) * 100).toFixed(3)}% speed change if pitch-shifted by resampling`, bpm: `${(p(v, "bpm", 120) * r).toFixed(2)} BPM after resampling from ${p(v, "bpm", 120)}` };
};
export const headphoneAmp: Calc = (v) => {
  const z = need(p(v, "z", 300), "Enter impedance."), sens = num(v.sens, 100), unit = pick(v.unit, 2), target = num(v.spl, 110);
  const sensMw = unit === 0 ? sens : sens - 10 * Math.log10(1000 / z);
  const mw = Math.pow(10, (target - sensMw) / 10), vrms = Math.sqrt((mw / 1000) * z);
  return { mw: `${mw.toFixed(1)} mW needed`, v: `${vrms.toFixed(2)} Vrms output`, note: `for ${target} dB SPL peaks at ${z} Ω` };
};
export const djTempo: Calc = (v) => {
  const a = need(p(v, "a", 124), "Enter track A BPM."), b = need(p(v, "b", 128), "Enter track B BPM.");
  const pitch = ((a / b) - 1) * 100;
  return { pitch: `${pitch >= 0 ? "+" : ""}${pitch.toFixed(2)}% pitch on track B`, semis: `${(12 * Math.log2(a / b)).toFixed(2)} semitones (without key lock)`, half: Math.abs(pitch) > 8 ? `Consider half/double time: ${(b / 2).toFixed(1)} or ${(b * 2).toFixed(1)} BPM` : "Within a ±8% pitch fader" };
};

// ---- registry (generated)
export const ideaMusicCustomCalculators: Record<string, Calc> = {
  "bpm-to-milliseconds-delay-calculator": bpmDelay,
  "song-length-from-bpm-and-bars-calculator": songLength,
  "guitar-fret-position-calculator": fretPos,
  "capo-chord-transposer-calculator": capoTranspose,
  "cents-pitch-difference-calculator": centsDiff,
  "speaker-impedance-series-parallel-calculator": speakerImp,
  "amplifier-power-to-decibels-calculator": ampDb,
  "decibel-addition-calculator": dbAdd,
  "sound-level-distance-inverse-square-calculator": inverseSquare,
  "sample-rate-bit-depth-data-rate-calculator": dataRate,
  "ported-box-port-length-calculator": portLength,
  "crossover-frequency-capacitor-calculator": crossoverCap,
  "piano-key-frequency-calculator": pianoKey,
  "drum-tuning-frequency-calculator": drumTuning,
  "chord-finder-from-notes-calculator": chordFinder,
  "scale-notes-builder-calculator": scaleBuilder,
  "circle-of-fifths-key-finder-calculator": circleFifths,
  "time-signature-beat-counter-calculator": beatCounter,
  "swing-ratio-timing-calculator": swingRatio,
  "music-lesson-pricing-calculator": lessonPrice,
  "band-gig-pay-split-calculator": gigSplit,
  "studio-recording-cost-calculator": studioCost,
  "vinyl-record-side-length-calculator": vinylSide,
  "ukulele-fret-spacing-calculator": ukeFret,
  "flute-tone-hole-placement-calculator": fluteHole,
  "lufs-loudness-gain-calculator": lufsGain,
  "metronome-practice-tempo-increase-calculator": metronomePlan,
  "delay-feedback-repeat-time-calculator": delayFeedback,
  "pitch-shift-semitones-to-ratio-calculator": pitchRatio,
  "headphone-amplifier-power-calculator": headphoneAmp,
  "dj-mix-tempo-match-calculator": djTempo,
};
