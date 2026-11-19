/**
 * Batch: Tech keyword check (15 Nov 2026) — 12 film, photo, audio and writing tools for Arts &
 * Entertainment: Art, Film & Creator Income (Steam revenue, timecode, shutter angle, render time,
 * ND filter, colour contrast), Music Theory, Instrument & Audio (speaker SPL, crossover, speaker
 * wire, tube amp bias, audio file size) and Books, Reading & Writing (script length).
 *
 * Near-namesakes kept apart on purpose:
 *  - steam-revenue-calculator = a game's lifetime sales and net revenue from its review count.
 *    steam-market-fee-calculator (Shopping) = fees on one Community Market sale.
 *  - nd-filter-calculator = shutter speed after an ND filter; photography-exposure (existing) =
 *    exposure triangle / EV.
 *  - speaker-spl-calculator = loudness from sensitivity, watts and distance; speaker-wattage
 *    (existing) = matching amp power to speakers; speaker-impedance (existing) = wiring ohms.
 *  - audio-file-size-calculator = audio; video-file-size (existing) = video.
 *  - script-length-calculator = text → spoken/screen runtime; audiobook-calculator (existing) =
 *    listening time at playback speed.
 *
 * Methods:
 *  - Boxleiter method: units ≈ reviews × multiplier (20–60; 30 typical). Steam revenue share 30%
 *    up to $10 M gross, 25% from $10 M to $50 M, 20% above.
 *  - SMPTE drop-frame (29.97/59.94): drop 2 (4) frame numbers each minute except every 10th.
 *  - Shutter angle: exposure = (angle ÷ 360) ÷ fps. Flicker-free when exposure is a multiple of
 *    1 ÷ (2 × mains Hz).
 *  - ND: new time = base × 2^stops; optical density = 0.301 × stops.
 *  - WCAG 2.x relative luminance & contrast (L1 + 0.05)/(L2 + 0.05); AA 4.5 / 3, AAA 7 / 4.5.
 *  - SPL = sensitivity + 10log P − 20log d + 10log N + boundary gain.
 *  - Passive crossover: 1st order L = R/(2πf), C = 1/(2πfR); 2nd-order Butterworth C = 0.1125/(Rf),
 *    L = 0.2251R/f; Linkwitz-Riley C = 0.0796/(Rf), L = 0.3183R/f. Baffle step f ≈ 115/width (m).
 *  - Wire: R = 2L × ρ/A (copper 0.01724 Ω·mm²/m); power lost = R/(R + Z).
 *  - Tube bias: I = Pmax × % ÷ plate voltage (1 Ω sense resistor → 1 mV per mA).
 */

import { type TrvCalculator as Calc, InputError, num, pos, pick, txt, sig, r1, r2, nfmt, money } from "./trv-core";

// ------------------------------------------------------------------ Steam revenue (Boxleiter)
export const steamRevenue: Calc = (v) => {
  const reviews = pos(v.reviews, 1000), mult = pos(v.mult, 30), price = pos(v.price, 19.99), disc = Math.min(95, pos(v.discount, 35)) / 100, ded = Math.min(90, pos(v.deductions, 15)) / 100;
  const units = reviews * mult;
  const gross = units * price * (1 - disc) * (1 - ded);
  const cut = Math.min(gross, 1e7) * 0.3 + Math.max(0, Math.min(gross, 5e7) - 1e7) * 0.25 + Math.max(0, gross - 5e7) * 0.2;
  const net = gross - cut;
  return { net: Math.round(net), units: nfmt(Math.round(units)), gross: Math.round(gross), cut: Math.round(cut), perReview: money(reviews > 0 ? net / reviews : 0, "$", 2), range: `${nfmt(Math.round(reviews * 20))} – ${nfmt(Math.round(reviews * 60))} copies (multiplier 20–60)`, perUnit: money(units > 0 ? net / units : 0, "$", 2) };
};

// ------------------------------------------------------------------ timecode
export const FPS: [string, number, boolean][] = [["23.976 fps", 24, false], ["24 fps", 24, false], ["25 fps (PAL)", 25, false], ["29.97 fps drop-frame", 30, true], ["29.97 fps non-drop", 30, false], ["30 fps", 30, false], ["50 fps", 50, false], ["59.94 fps drop-frame", 60, true], ["60 fps", 60, false]];
const REAL = [24000 / 1001, 24, 25, 30000 / 1001, 30000 / 1001, 30, 50, 60000 / 1001, 60];
function tcToFrames(s: string, nom: number, df: boolean) {
  const m = s.trim().match(/^(-?)(\d{1,3})[:;.](\d{1,2})[:;.](\d{1,2})[:;.](\d{1,3})$/);
  if (!m) { if (/^-?\d+$/.test(s.trim())) return Number(s.trim()); throw new InputError(`"${s}" isn't a timecode — use HH:MM:SS:FF (or a frame count).`); }
  const [h, mi, se, f] = [m[2], m[3], m[4], m[5]].map(Number);
  if (mi > 59 || se > 59 || f >= nom) throw new InputError(`"${s}" has an out-of-range field (frames must be below ${nom}).`);
  let fr = ((h * 60 + mi) * 60 + se) * nom + f;
  if (df) { const drop = nom === 60 ? 4 : 2, tm = h * 60 + mi; fr -= drop * (tm - Math.floor(tm / 10)); }
  return (m[1] ? -1 : 1) * fr;
}
function framesToTc(fr: number, nom: number, df: boolean) {
  const neg = fr < 0; fr = Math.abs(Math.round(fr));
  if (df) {
    const drop = nom === 60 ? 4 : 2, per10 = nom * 600 - drop * 9, per1 = nom * 60 - drop;
    const d = Math.floor(fr / per10), mm = fr % per10;
    fr += drop * 9 * d + (mm > drop ? drop * Math.floor((mm - drop) / per1) : 0);
  }
  const f = fr % nom, s = Math.floor(fr / nom) % 60, mi = Math.floor(fr / (nom * 60)) % 60, h = Math.floor(fr / (nom * 3600));
  const p = (x: number) => String(x).padStart(2, "0");
  return `${neg ? "−" : ""}${p(h)}:${p(mi)}:${p(s)}${df ? ";" : ":"}${p(f)}`;
}
export const timecode: Calc = (v) => {
  const fi = pick(v.fps, FPS.length), [, nom, df] = FPS[fi];
  const a = tcToFrames(txt(v, "a"), nom, df), op = pick(v.op, 3);
  const b = op === 2 ? 0 : tcToFrames(txt(v, "b") || "0", nom, df);
  const r = op === 0 ? a + b : op === 1 ? a - b : a;
  const secs = r / REAL[fi];
  const cs = Math.round(Math.abs(secs) * 100) / 100;
  const feet = Math.floor(Math.abs(r) / 16), ff = Math.abs(r) % 16;
  return { tc: framesToTc(r, nom, df), frames: nfmt(r), seconds: sig(secs, 8), real: `${Math.floor(cs / 3600)} h ${Math.floor((cs % 3600) / 60)} min ${r2(cs % 60)} s of real time`, film: `${nfmt(feet)} ft + ${ff} frames (35 mm, 16 frames/ft)`, mode: df ? "Drop-frame (semicolon before frames)" : "Non-drop-frame" };
};
function parseSpeed(s: string) {
  const t = s.trim().replace(/s$/i, "");
  const m = t.match(/^1\/(\d*\.?\d+)$/);
  if (m) return 1 / Number(m[1]);
  const n = Number(t);
  if (n > 0) return n;
  throw new InputError(`"${s}" isn't a shutter speed — use 1/50 or 0.02.`);
}
const speedText = (t: number) => (t >= 1 ? `${sig(t, 4)} s` : `1/${sig(1 / t, 4)} s`);
export const shutterAngle: Calc = (v) => {
  const fps = pos(v.fps, 24), mains = pick(v.mains, 2) === 0 ? 50 : 60;
  if (fps <= 0) throw new InputError("Enter the frame rate.");
  let ang: number, t: number;
  if (pick(v.mode, 2) === 0) { ang = pos(v.angle, 180); if (ang <= 0 || ang > 360) throw new InputError("Shutter angle must be 1–360°."); t = ang / 360 / fps; }
  else { t = parseSpeed(txt(v, "speed")); ang = t * fps * 360; }
  const unit = 1 / (2 * mains), k = t / unit;
  const safe = Math.abs(k - Math.round(k)) < 0.02 && Math.round(k) >= 1;
  const flickerAng = (360 * fps) / (2 * mains);
  return { speed: speedText(t), angle: r1(ang), blur: ang > 360 ? "Over 360° isn't possible — lower the frame rate" : ang < 90 ? "Crisp, staccato motion" : ang > 270 ? "Heavy, smeary motion blur" : ang >= 170 && ang <= 190 ? "Natural film-like motion blur (180° rule)" : "Moderate motion blur", flicker: safe ? `Flicker-safe under ${mains} Hz lights` : `May flicker under ${mains} Hz lights — try ${r1(flickerAng)}° or ${r1(flickerAng * 2)}°`, exposure: `${r2(t * 1000)} ms per frame` };
};

// ------------------------------------------------------------------ render time
export const renderTime: Calc = (v) => {
  const frames = pos(v.frames) > 0 ? Math.round(pos(v.frames)) : Math.round(pos(v.seconds, 60) * pos(v.fps, 24));
  const mpf = pos(v.minutes, 5), nodes = Math.max(1, Math.round(pos(v.nodes, 1))), over = 1 + pos(v.overhead, 10) / 100, price = pos(v.price, 0);
  if (frames <= 0 || mpf <= 0) throw new InputError("Enter the frame count (or duration × fps) and minutes per frame.");
  const nodeHours = (frames * mpf * over) / 60;
  const wall = nodeHours / nodes;
  const dh = (h: number) => (h >= 48 ? `${r1(h / 24)} days` : `${r1(h)} hours`);
  return { wall: dh(wall), hours: r1(nodeHours), frames: nfmt(frames), cost: price > 0 ? Math.round(nodeHours * price) : 0, perFrame: `${sig(mpf, 4)} min per frame on one machine`, more: `With ${nodes * 2} machines: ${dh(wall / 2)}; with ${nodes * 10}: ${dh(wall / 10)}` };
};

// ------------------------------------------------------------------ ND filter
export const ND: [string, number][] = [["ND2 (1 stop)", 1], ["ND4 (2 stops)", 2], ["ND8 (3 stops)", 3], ["ND16 (4 stops)", 4], ["ND32 (5 stops)", 5], ["ND64 (6 stops)", 6], ["ND128 (7 stops)", 7], ["ND256 (8 stops)", 8], ["ND500 (9 stops)", 9], ["ND1000 (10 stops)", 10], ["ND32000 (15 stops)", 15], ["ND100000 (16.6 stops)", 16.61], ["Custom stops (below)", 0]];
export const ndFilter: Calc = (v) => {
  const base = parseSpeed(txt(v, "base"));
  const ni = pick(v.nd, ND.length);
  const stops = ni === ND.length - 1 ? num(v.stops, 6) : ND[ni][1];
  const t = base * 2 ** stops;
  const mmss = t >= 60 ? `${Math.floor(t / 60)} min ${Math.round(t % 60)} s` : speedText(t);
  return { time: mmss, seconds: sig(t, 5), stops: r2(stops), od: r2(stops * 0.301), trans: `${sig(100 / 2 ** stops, 4)}% of light passes`, factor: `Light reduced ${nfmt(Math.round(2 ** stops))}×`, bulb: t > 30 ? "Longer than 30 s: use Bulb mode and a remote" : "Within normal shutter range" };
};

// ------------------------------------------------------------------ colour contrast (WCAG)
function hexRgb(s: string) {
  let t = s.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(t)) t = t.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(t)) throw new InputError(`"${s}" isn't a hex colour — use #1a73e8 or #fff.`);
  return [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16));
}
const lum = (rgb: number[]) => { const [r, g, b] = rgb.map((c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const colorContrast: Calc = (v) => {
  const a = lum(hexRgb(txt(v, "fg"))), b = lum(hexRgb(txt(v, "bg")));
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const pf = (x: number) => (ratio >= x ? "Pass" : "Fail");
  return { ratio: `${r2(Math.floor(ratio * 100) / 100)}:1`, value: Math.floor(ratio * 100) / 100, aa: `${pf(4.5)} (needs 4.5:1)`, aaLarge: `${pf(3)} (needs 3:1)`, aaa: `${pf(7)} (needs 7:1)`, aaaLarge: `${pf(4.5)} (needs 4.5:1)`, ui: `${pf(3)} (needs 3:1)`, lum: `${sig(a, 4)} / ${sig(b, 4)}` };
};

// ------------------------------------------------------------------ speaker SPL
export const BOUNDARY: [string, number][] = [["Free-standing / spec already half-space (+0 dB)", 0], ["Against a wall (+3 dB)", 3], ["In a corner (+6 dB)", 6]];
export const speakerSpl: Calc = (v) => {
  const sens = num(v.sens, 88), P = pos(v.watts, 50), d = pos(v.dist, 3), n = Math.max(1, Math.round(pos(v.count, 2))), bg = BOUNDARY[pick(v.boundary, 3)][1];
  if (P <= 0 || d <= 0) throw new InputError("Enter the amplifier power and listening distance.");
  const add = 10 * Math.log10(n) + bg - 20 * Math.log10(d);
  const spl = sens + 10 * Math.log10(P) + add;
  const target = num(v.target, 105);
  const need = 10 ** ((target + 3 - sens - add) / 10);
  return { spl: r1(spl), need: `${nfmt(Math.ceil(need))} W per speaker (incl. 3 dB headroom) for ${target} dB`, at1w: r1(sens + add), loss: `−${r1(20 * Math.log10(d))} dB from distance`, safe: spl > 100 ? "Above 100 dB: limit listening to about 15 minutes a day (NIOSH)" : spl > 85 ? "Above 85 dB: long sessions can damage hearing" : "Comfortable listening level" };
};

// ------------------------------------------------------------------ passive crossover
export const XO_ORDERS = ["1st order (6 dB/oct)", "2nd order Butterworth (12 dB/oct)", "2nd order Linkwitz-Riley (12 dB/oct)"];
export const crossover: Calc = (v) => {
  const ord = pick(v.order, 3), three = pick(v.ways, 2) === 1;
  const f1 = pos(v.f1, 2500), f2 = pos(v.f2, 4000), Rw = pos(v.rw, 8), Rt = pos(v.rt, 8), Rm = pos(v.rm, 8);
  if (f1 <= 0 || Rw <= 0 || Rt <= 0) throw new InputError("Enter the crossover frequency and driver impedances.");
  const LC = (R: number, f: number) => ord === 0 ? { L: R / (2 * Math.PI * f), C: 1 / (2 * Math.PI * f * R) } : ord === 1 ? { L: (0.2251 * R) / f, C: 0.1125 / (R * f) } : { L: (0.3183 * R) / f, C: 0.0796 / (R * f) };
  const mh = (x: number) => `${sig(x * 1000, 3)} mH`, uf = (x: number) => `${sig(x * 1e6, 3)} µF`;
  const low = LC(Rw, f1);
  let woofer: string, mid = "—", tweeter: string;
  if (!three) {
    const hi = LC(Rt, f1);
    woofer = ord === 0 ? `Series inductor ${mh(low.L)}` : `Series inductor ${mh(low.L)}, shunt capacitor ${uf(low.C)}`;
    tweeter = ord === 0 ? `Series capacitor ${uf(hi.C)}` : `Series capacitor ${uf(hi.C)}, shunt inductor ${mh(hi.L)}`;
  } else {
    if (f2 <= f1) throw new InputError("For a 3-way, the second crossover must be higher than the first.");
    const mHP = LC(Rm, f1), mLP = LC(Rm, f2), hi = LC(Rt, f2);
    woofer = ord === 0 ? `Series inductor ${mh(low.L)}` : `Series inductor ${mh(low.L)}, shunt capacitor ${uf(low.C)}`;
    mid = ord === 0 ? `Series capacitor ${uf(mHP.C)} then series inductor ${mh(mLP.L)}` : `High-pass: series ${uf(mHP.C)} + shunt ${mh(mHP.L)}; low-pass: series ${mh(mLP.L)} + shunt ${uf(mLP.C)}`;
    tweeter = ord === 0 ? `Series capacitor ${uf(hi.C)}` : `Series capacitor ${uf(hi.C)}, shunt inductor ${mh(hi.L)}`;
  }
  const w = pos(v.baffle, 0);
  return { woofer, mid, tweeter, polarity: ord === 0 ? "Connect all drivers in normal polarity" : "Reverse the tweeter's polarity (2nd order)", baffle: w > 0 ? `Baffle step near ${Math.round(115 / (w / 100))} Hz — a ${sig(Rw * 0.5, 2)}–${Rw} Ω-matched shelving circuit may be needed` : "—", slope: XO_ORDERS[ord] };
};

// ------------------------------------------------------------------ speaker wire
const GAUGES: [string, number][] = [["10 AWG (5.26 mm²)", 5.26], ["12 AWG (3.31 mm²)", 3.31], ["14 AWG (2.08 mm²)", 2.08], ["16 AWG (1.31 mm²)", 1.31], ["18 AWG (0.82 mm²)", 0.823], ["20 AWG (0.52 mm²)", 0.518], ["22 AWG (0.33 mm²)", 0.326]];
export const speakerWire: Calc = (v) => {
  const L = pos(v.length, 15) * (pick(v.units, 2) === 1 ? 0.3048 : 1), Z = pos(v.ohms, 8), maxLoss = pos(v.loss, 5) / 100;
  if (L <= 0 || Z <= 0) throw new InputError("Enter the wire length and speaker impedance.");
  const [gname, A] = GAUGES[pick(v.gauge, GAUGES.length)];
  const R = (2 * L * 0.01724) / A;
  const loss = R / (R + Z);
  const ok = GAUGES.filter(([, a]) => (2 * L * 0.01724) / a / ((2 * L * 0.01724) / a + Z) <= maxLoss);
  const maxLen = (a: number) => (maxLoss * Z * a) / ((1 - maxLoss) * 2 * 0.01724);
  return { loss: r2(loss * 100), db: r2(-10 * Math.log10(1 - loss)), ohms: sig(R, 3), rec: ok.length ? `${ok[ok.length - 1][0]} or thicker` : "Even 10 AWG loses too much — shorten the run or use a higher-impedance setup", df: `Wire alone limits damping factor to ${r1(Z / R)}`, table: GAUGES.map(([n, a]) => `${n}: up to ${r1(maxLen(a))} m (${r1(maxLen(a) / 0.3048)} ft)`).join("\n"), gauge: gname };
};

// ------------------------------------------------------------------ tube amp bias
export const TUBES: [string, number][] = [["EL34 (25 W)", 25], ["6L6GC (30 W)", 30], ["KT88 (35 W)", 35], ["6550 (35 W)", 35], ["KT66 (25 W)", 25], ["EL84 / 6BQ5 (12 W)", 12], ["6V6GT (14 W)", 14], ["KT77 (25 W)", 25], ["Custom (below)", 0]];
export const tubeBias: Calc = (v) => {
  const ti = pick(v.tube, TUBES.length);
  const pmax = ti === TUBES.length - 1 ? pos(v.pmax, 25) : TUBES[ti][1];
  const vp = pos(v.plate, 450), pct = pos(v.pct, 70) / 100, screen = pick(v.screen, 2) === 0;
  if (vp <= 0 || pmax <= 0) throw new InputError("Enter the plate voltage and the tube's maximum plate dissipation.");
  const ma = ((pmax * pct) / vp) * 1000 * (screen ? 1.05 : 1);
  return { ma: r1(ma), mv: `${r1(ma)} mV across a 1 Ω sense resistor (${r1(ma * 10)} mV across 10 Ω)`, range: `${r1(((pmax * 0.6) / vp) * 1000 * (screen ? 1.05 : 1))} – ${r1(((pmax * 0.7) / vp) * 1000 * (screen ? 1.05 : 1))} mA (60–70%, class AB)`, diss: `${r1(((ma / 1000) * vp) / (screen ? 1.05 : 1))} W plate dissipation (${r1(pct * 100)}% of ${pmax} W)`, warn: pct > 0.75 ? "Above 75%: runs hot and shortens tube life" : "Safe class AB range" };
};

// ------------------------------------------------------------------ audio file size
export const AUDIO_FMTS: [string, number][] = [["WAV / AIFF (uncompressed PCM)", 1], ["FLAC / ALAC (lossless, ≈ 55%)", 0.55], ["MP3 / AAC / Opus at the bitrate below", 0]];
export const audioSize: Calc = (v) => {
  const sr = pos(v.rate, 48000), bits = pos(v.bits, 24), ch = Math.max(1, Math.round(pos(v.channels, 2))), mins = pos(v.minutes, 3.5), fi = pick(v.format, 3), kbpsIn = pos(v.kbps, 320);
  const pcm = sr * bits * ch;
  const bps = fi === 2 ? kbpsIn * 1000 : pcm * AUDIO_FMTS[fi][1];
  const bytes = (bps * mins * 60) / 8;
  return { mb: r2(bytes / 1e6), kbps: Math.round(bps / 1000), perMin: r2((bps * 60) / 8 / 1e6), perHour: r2((bps * 3600) / 8 / 1e9), pcm: Math.round(pcm / 1000), gb: `${r1(1e9 / ((bps * 60) / 8))} minutes per GB` };
};

// ------------------------------------------------------------------ script / speech length
export const SCRIPT_TYPES: [string, number][] = [["Speech or presentation (130 wpm)", 130], ["Video voice-over / YouTube (150 wpm)", 150], ["Audiobook narration (155 wpm)", 155], ["Podcast / conversation (160 wpm)", 160], ["Fast read / ad copy (180 wpm)", 180], ["Screenplay (1 page ≈ 1 minute)", 0]];
export const scriptLength: Calc = (v) => {
  const ti = pick(v.type, SCRIPT_TYPES.length);
  const typed = txt(v, "text").split(/\s+/).filter(Boolean).length;
  const words = pos(v.words) > 0 ? pos(v.words) : typed;
  let mins: number;
  if (ti === SCRIPT_TYPES.length - 1) { const pages = pos(v.pages) > 0 ? pos(v.pages) : words / 180; if (pages <= 0) throw new InputError("Enter the page count (or words)."); mins = pages; }
  else { const wpm = pos(v.wpm) > 0 ? pos(v.wpm) : SCRIPT_TYPES[ti][1]; if (words <= 0) throw new InputError("Enter a word count or paste the text."); mins = words / wpm; }
  const s = Math.round(mins * 60);
  return { time: `${Math.floor(s / 60)} min ${s % 60} s`, minutes: r2(mins), words: Math.round(words), pages: r1(ti === SCRIPT_TYPES.length - 1 ? mins : words / 250), forTarget: pos(v.target) > 0 ? `${nfmt(Math.round(pos(v.target) * (ti === SCRIPT_TYPES.length - 1 ? 180 : pos(v.wpm) > 0 ? pos(v.wpm) : SCRIPT_TYPES[ti][1])))} words for ${pos(v.target)} minutes` : "—" };
};

export const techMediaCustomCalculators: Record<string, Calc> = {
  "steam-revenue-calculator": steamRevenue,
  "timecode-calculator": timecode,
  "shutter-angle-calculator": shutterAngle,
  "render-time-calculator": renderTime,
  "nd-filter-calculator": ndFilter,
  "color-contrast-calculator": colorContrast,
  "speaker-spl-calculator": speakerSpl,
  "crossover-calculator": crossover,
  "speaker-wire-calculator": speakerWire,
  "tube-amp-bias-calculator": tubeBias,
  "audio-file-size-calculator": audioSize,
  "script-length-calculator": scriptLength,
};
