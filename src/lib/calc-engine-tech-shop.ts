/**
 * Batch: Tech keyword check (15 Nov 2026) — display, PC, audio, 3D-printing and drone setup tools:
 * Shopping > Electronics, Energy & Tech (9) and Shopping > Pricing, Markup & Seller Fee (Steam market
 * fee).
 *
 * Near-namesakes kept apart on purpose:
 *  - aspect-ratio-calculator = ratio & resize. screen-dimensions / tv-size / monitor-ppi (existing)
 *    do physical screen size. led-video-wall-calculator = modular LED cabinets & pixel pitch.
 *  - display-bandwidth-calculator = video signal Gbps vs HDMI/DisplayPort. bandwidth-calculator
 *    (existing) is internet bandwidth.
 *  - image-file-size-calculator = one image's file size. photo-storage / video-file-size (existing)
 *    count collections and video.
 *  - subwoofer-port-calculator = port length for a box tuning. subwoofer-box-calculator (existing)
 *    does box volume.
 *  - sim-racing-fov-calculator = in-game FOV from screen size & distance; field-of-view-calculator
 *    (existing) is camera lens FOV.
 *
 * Methods:
 *  - Display timing: CVT-RB2 style blanking — 80 px horizontal, ≥ 460 µs vertical blanking.
 *    Link payloads after encoding: HDMI 1.4 8.16, HDMI 2.0 14.4, HDMI 2.1 42.67, DP 1.2 17.28,
 *    DP 1.4 25.92, DP 2.1 UHBR13.5 52.22 and UHBR20 77.37 Gbps. DSC ≈ 3:1 visually lossless.
 *  - True RAM latency (ns) = CL × 2000 ÷ data rate (MT/s); bandwidth = MT/s × 8 B per channel.
 *  - Vented box (Helmholtz): L = c²·S/(4π²·Fb²·Vb) − end correction (0.85r flanged + 0.6r free end);
 *    peak port air speed = 2π·Fb·Sd·Xmax/S_port, aim < 17 m/s (≈ 5% of c).
 *  - E-steps: new = current × requested ÷ actual; theoretical = steps/rev × microsteps × gear ratio ÷
 *    (π × drive-gear diameter); Klipper rotation_distance = steps/rev × microsteps ÷ steps per mm.
 *  - FOV: horizontal = 2·atan(W/2d), vertical = 2·atan(H/2d); triple screens ≈ 3 × single-screen
 *    horizontal FOV with sides angled in by that amount.
 *  - GSD (cm/px) = sensor width (mm) × altitude (m) × 100 ÷ (focal length (mm) × image width (px)).
 *  - Steam Community Market: Steam fee 5% and game fee (10% for Valve games), each at least $0.01,
 *    both calculated on the amount the seller receives, rounded down to the cent.
 */

import { type TrvCalculator as Calc, InputError, pos, pick, sig, r1, r2, nfmt } from "./trv-core";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

// ------------------------------------------------------------------ aspect ratio
export const RATIOS: [string, number, number][] = [["Custom (use width × height)", 0, 0], ["16:9 (HD, 4K, YouTube)", 16, 9], ["4:3 (classic TV, iPad)", 4, 3], ["21:9 (ultrawide, ≈ 64:27)", 64, 27], ["32:9 (super ultrawide)", 32, 9], ["16:10 (laptops)", 16, 10], ["1:1 (square)", 1, 1], ["9:16 (vertical video, Reels)", 9, 16], ["4:5 (Instagram portrait)", 4, 5], ["3:2 (photo, 35 mm)", 3, 2], ["2.39:1 (anamorphic cinema)", 2.39, 1], ["1.85:1 (flat cinema)", 1.85, 1]];
const COMMON: [string, number][] = [["16:9", 16 / 9], ["4:3", 4 / 3], ["21:9", 64 / 27], ["32:9", 32 / 9], ["16:10", 1.6], ["1:1", 1], ["9:16", 9 / 16], ["4:5", 0.8], ["3:2", 1.5], ["2.39:1", 2.39], ["1.85:1", 1.85], ["5:4", 1.25], ["3:4", 0.75], ["2:3", 2 / 3]];
export const aspectRatio: Calc = (v) => {
  const pi = pick(v.preset, RATIOS.length);
  const w = pos(v.w, 1920), h = pos(v.h, 1080);
  let rw = RATIOS[pi][1], rh = RATIOS[pi][2];
  if (pi === 0) { if (w <= 0 || h <= 0) throw new InputError("Enter the width and height."); rw = w; rh = h; }
  const r = rw / rh;
  const nw = pos(v.newW), nh = pos(v.newH);
  const outW = nw > 0 ? nw : nh > 0 ? nh * r : w;
  const outH = nw > 0 ? nw / r : nh > 0 ? nh : w / r;
  const iw = Math.round(rw * 1000), ih = Math.round(rh * 1000), g = gcd(iw, ih);
  const simple = Number.isInteger(rw) && Number.isInteger(rh) ? `${rw / gcd(rw, rh)}:${rh / gcd(rw, rh)}` : `${iw / g}:${ih / g}`;
  const near = COMMON.reduce((b, c) => (Math.abs(Math.log(c[1] / r)) < Math.abs(Math.log(b[1] / r)) ? c : b));
  return { ratio: simple, decimal: `${sig(r, 5)}:1`, newSize: `${Math.round(outW)} × ${Math.round(outH)}`, w: Math.round(outW), h: Math.round(outH), mp: sig((outW * outH) / 1e6, 4), nearest: Math.abs(Math.log(near[1] / r)) < 0.01 ? `${near[0]} (exact or very close)` : `closest standard: ${near[0]}`, sizes: [480, 720, 1080, 1440, 2160].map((hh) => `${Math.round((hh * r) / 2) * 2} × ${hh}`).join(", ") };
};

// ------------------------------------------------------------------ LED video wall
export const ledWall: Calc = (v) => {
  const cw = pos(v.cw, 500), ch = pos(v.ch, 500), pitch = pos(v.pitch, 2.6), nx = Math.max(1, Math.round(pos(v.nx, 8))), ny = Math.max(1, Math.round(pos(v.ny, 5)));
  if (cw <= 0 || ch <= 0 || pitch <= 0) throw new InputError("Enter the cabinet size and pixel pitch.");
  const px = Math.round(cw / pitch), py = Math.round(ch / pitch);
  const W = px * nx, H = py * ny, wm = (cw * nx) / 1000, hm = (ch * ny) / 1000;
  const watts = pos(v.watts, 130) * nx * ny, kg = pos(v.kg, 7.5) * nx * ny;
  const pixels = W * H;
  return { res: `${nfmt(W)} × ${nfmt(H)} px`, size: `${sig(wm, 4)} × ${sig(hm, 4)} m (${sig(wm * 3.28084, 4)} × ${sig(hm * 3.28084, 4)} ft)`, diag: `${sig(Math.hypot(wm, hm), 4)} m (${sig((Math.hypot(wm, hm) / 0.0254), 4)} in)`, aspect: `${sig(W / H, 4)}:1`, cabinets: nx * ny, view: `minimum ≈ ${sig(pitch, 3)} m, comfortable ≈ ${sig(pitch * 3, 3)} m`, power: `${nfmt(watts)} W max, ≈ ${nfmt(watts / 3)} W typical (${sig(watts / 230, 4)} A at 230 V)`, kg: r1(kg), ports: Math.ceil(pixels / 650000), pixels: nfmt(pixels) };
};

// ------------------------------------------------------------------ display (HDMI/DP) bandwidth
export const CHROMA: [string, number][] = [["RGB / 4:4:4", 3], ["4:2:2", 2], ["4:2:0", 1.5]];
const LINKS: [string, number][] = [["HDMI 1.4", 8.16], ["HDMI 2.0", 14.4], ["DisplayPort 1.2", 17.28], ["DisplayPort 1.4", 25.92], ["HDMI 2.1 (48G FRL)", 42.67], ["DisplayPort 2.1 UHBR13.5", 52.22], ["DisplayPort 2.1 UHBR20", 77.37]];
export const displayBandwidth: Calc = (v) => {
  const w = Math.round(pos(v.w, 3840)), h = Math.round(pos(v.h, 2160)), hz = pos(v.hz, 60);
  if (w <= 0 || h <= 0 || hz <= 0) throw new InputError("Enter the resolution and refresh rate.");
  const bits = [8, 10, 12][pick(v.depth, 3)], [cname, ch] = CHROMA[pick(v.chroma, 3)];
  const vblank = 460e-6 * hz;
  if (vblank >= 0.9) throw new InputError("That refresh rate is too high for standard timing.");
  const vt = Math.ceil(h / (1 - vblank)), ht = w + 80;
  const pclk = ht * vt * hz;
  const gbps = (pclk * bits * ch) / 1e9;
  const ok = LINKS.filter(([, c]) => c >= gbps).map(([n]) => n);
  const dsc = LINKS.filter(([, c]) => c >= gbps / 3 && c < gbps).map(([n]) => n);
  return { gbps: sig(gbps, 4), pclk: sig(pclk / 1e6, 5), fits: ok.length ? ok.join(", ") : "None without compression", dsc: dsc.length ? `With DSC: ${dsc.join(", ")}` : "—", mode: `${w}×${h} @ ${hz} Hz, ${bits}-bit ${cname}`, active: sig((w * h * hz * bits * ch) / 1e9, 4), timing: `${ht} × ${vt} total (incl. blanking)` };
};

// ------------------------------------------------------------------ image file size
export const DEPTHS: [string, number][] = [["8-bit RGB (24 bits/pixel)", 24], ["8-bit RGBA (32)", 32], ["16-bit RGB (48)", 48], ["8-bit greyscale (8)", 8], ["1-bit black & white (1)", 1], ["RAW 14-bit sensor (14)", 14]];
export const FORMATS: [string, number][] = [["Uncompressed (BMP, TIFF)", 1], ["PNG (lossless, ~2:1)", 2], ["JPEG high quality (~8:1)", 8], ["JPEG medium (~15:1)", 15], ["WebP / HEIC (~20:1)", 20], ["AVIF (~25:1)", 25]];
export const imageFileSize: Calc = (v) => {
  const w = pos(v.w, 6000), h = pos(v.h, 4000);
  if (w <= 0 || h <= 0) throw new InputError("Enter the image width and height in pixels.");
  const bpp = DEPTHS[pick(v.depth, DEPTHS.length)][1], [fname, ratio] = FORMATS[pick(v.format, FORMATS.length)];
  const raw = (w * h * bpp) / 8;
  const est = raw / ratio;
  const mb = (b: number) => `${sig(b / 1e6, 4)} MB (${sig(b / 1048576, 4)} MiB)`;
  const n = pos(v.count, 1);
  return { est: mb(est), raw: mb(raw), mp: sig((w * h) / 1e6, 4), total: n > 1 ? `${sig((est * n) / 1e9, 4)} GB for ${nfmt(n)} images` : "—", print: `${sig(w / 300, 4)} × ${sig(h / 300, 4)} in at 300 dpi`, fmt: fname };
};

// ------------------------------------------------------------------ RAM latency
export const ramLatency: Calc = (v) => {
  const cl = pos(v.cl, 30), mt = pos(v.mts, 6000);
  if (cl <= 0 || mt <= 0) throw new InputError("Enter the CAS latency (CL) and the speed in MT/s.");
  const ns = (cl * 2000) / mt;
  const cl2 = pos(v.cl2), mt2 = pos(v.mts2);
  const ns2 = cl2 > 0 && mt2 > 0 ? (cl2 * 2000) / mt2 : NaN;
  const ch = Math.max(1, Math.round(pos(v.channels, 2)));
  return { ns: r2(ns), bw: r1((mt * 8 * ch) / 1000), cycle: sig(2000 / mt, 4), clock: nfmt(mt / 2), compare: Number.isFinite(ns2) ? `Kit B: ${r2(ns2)} ns — ${Math.abs(ns - ns2) < 0.05 ? "about the same latency" : ns < ns2 ? `Kit A is ${r2(ns2 - ns)} ns faster` : `Kit B is ${r2(ns - ns2)} ns faster`}; bandwidth ${r1((mt2 * 8 * ch) / 1000)} GB/s` : "—", rule: `DDR${mt >= 4800 ? "5" : mt >= 2133 ? "4" : "3"}-${mt} CL${cl}` };
};
export const subPort: Calc = (v) => {
  const Vb = pos(v.vb, 50) / 1000, fb = pos(v.fb, 32), n = Math.max(1, Math.round(pos(v.ports, 1)));
  if (Vb <= 0 || fb <= 0) throw new InputError("Enter the net box volume and tuning frequency.");
  const round = pick(v.shape, 2) === 0;
  const S1 = round ? Math.PI * (pos(v.d, 10) / 200) ** 2 : (pos(v.sw, 5) / 100) * (pos(v.sh, 30) / 100);
  if (S1 <= 0) throw new InputError("Enter the port size.");
  const S = S1 * n, r = Math.sqrt(S1 / Math.PI);
  const corr = [0.85 + 0.6, 0.85 * 2, 0.6 * 2][pick(v.ends, 3)] * r;
  const c = 343;
  const L = (c * c * S) / (4 * Math.PI * Math.PI * fb * fb * Vb) - corr;
  if (L <= 0) throw new InputError("The port is too small for this tuning — the length comes out negative. Use a smaller port area or lower tuning.");
  const sd = pos(v.sd, 0) / 1e4, xmax = pos(v.xmax, 0) / 1000;
  const vel = sd > 0 && xmax > 0 ? (2 * Math.PI * fb * sd * xmax) / S : NaN;
  const portVol = S * L * 1000;
  return { cm: r1(L * 100), inch: r1((L * 100) / 2.54), area: `${r1(S * 1e4)} cm² total (${n} port${n > 1 ? "s" : ""})`, vol: `${r2(portVol)} L — add this to the box's gross volume`, vel: Number.isFinite(vel) ? `${r1(vel)} m/s — ${vel < 17 ? "OK" : vel < 25 ? "may chuff at full power" : "too fast, use more port area"}` : "— (enter Sd and Xmax)", check: `Tuning check: ${r1((c / (2 * Math.PI)) * Math.sqrt(S / (Vb * (L + corr))))} Hz` };
};
export const esteps: Calc = (v) => {
  const mode = pick(v.mode, 2);
  const micro = pos(v.micro, 16), spr = pos(v.spr, 200);
  let val: number, note: string;
  if (mode === 0) {
    const cur = pos(v.current, 93), req = pos(v.req, 100);
    const actual = pos(v.mark, 120) - pos(v.left, 20);
    if (actual <= 0 || cur <= 0) throw new InputError("Enter your current e-steps and the filament actually extruded (mark − distance left).");
    val = (cur * req) / actual;
    note = `Extruded ${r2(actual)} mm of ${req} mm (${r1((actual / req) * 100)}%)`;
  } else {
    const d = pos(v.gear, 11), ratio = pos(v.ratio, 1);
    if (d <= 0) throw new InputError("Enter the drive gear's effective diameter.");
    val = (spr * micro * ratio) / (Math.PI * d);
    note = `${spr} steps × ${micro} microsteps × ${ratio}:1 ÷ (π × ${d} mm)`;
  }
  return { esteps: r2(val), gcode: `M92 E${r2(val)} then M500 to save`, klipper: `rotation_distance: ${sig((spr * micro) / val, 6)}`, note };
};

// ------------------------------------------------------------------ sim racing FOV
export const FOV_ASPECT: [string, number][] = [["16:9", 16 / 9], ["21:9", 64 / 27], ["32:9", 32 / 9], ["16:10", 1.6]];
export const simFov: Calc = (v) => {
  const diag = pos(v.diag, 32) * 2.54, ar = FOV_ASPECT[pick(v.aspect, 4)][1], d = pos(v.dist, 70), screens = pick(v.screens, 2) === 1 ? 3 : 1;
  if (diag <= 0 || d <= 0) throw new InputError("Enter the screen size and your eye-to-screen distance.");
  const H = diag / Math.sqrt(1 + ar * ar), W = H * ar;
  const deg = (x: number) => (x * 180) / Math.PI;
  const h1 = deg(2 * Math.atan(W / 2 / d)), vf = deg(2 * Math.atan(H / 2 / d));
  const hf = screens === 3 ? Math.min(360, 3 * h1) : h1;
  return { vfov: r1(vf), hfov: r1(hf), angle: screens === 3 ? `Angle each side screen in by ${r1(h1)}°` : "—", games: `Assetto Corsa / ACC / rFactor 2 / AMS2: vertical ${r1(vf)}°. iRacing: horizontal ${r1(hf)}° (or enter the distance in its FOV tool).`, screen: `${r1(W)} × ${r1(H)} cm per screen` };
};

// ------------------------------------------------------------------ drone GSD
export const DRONE_PRESETS: [string, number, number, number, number][] = [["Custom (enter below)", 0, 0, 0, 0], ["DJI Phantom 4 Pro / RTK (1\", 8.8 mm)", 13.2, 8.8, 5472, 3648]];
export const gsd: Calc = (v) => {
  const p = DRONE_PRESETS[pick(v.preset, DRONE_PRESETS.length)];
  const sw = p[1] || pos(v.sw, 13.2), f = p[2] || pos(v.focal, 8.8), iw = p[3] || pos(v.iw, 5472), ih = p[4] || pos(v.ih, 3648);
  const alt = pos(v.alt, 100);
  if (sw <= 0 || f <= 0 || iw <= 0) throw new InputError("Enter the sensor width, focal length and image width.");
  const g = (sw * alt * 100) / (f * iw);
  const target = pos(v.target);
  return { gsd: sig(g, 4), inPx: sig(g / 2.54, 4), foot: `${r1((g * iw) / 100)} × ${r1((g * ih) / 100)} m per photo`, area: r2(((g * iw) / 100) * ((g * ih) / 100) / 10000), alt: target > 0 ? `${r1((target * f * iw) / (sw * 100))} m for ${target} cm/px` : "—" };
};
export const steamFee: Calc = (v) => {
  const gamePct = pos(v.game, 10) / 100;
  const fees = (recv: number) => Math.max(1, Math.floor(recv * 0.05)) + Math.max(1, Math.floor(recv * gamePct));
  let recv: number, buyer: number;
  if (pick(v.mode, 2) === 0) {
    buyer = Math.round(pos(v.amount, 10) * 100);
    if (buyer < 3) throw new InputError("The lowest Steam Market price is $0.03.");
    recv = Math.floor(buyer / (1 + 0.05 + gamePct));
    while (recv + 1 + fees(recv + 1) <= buyer) recv++;
    while (recv > 0 && recv + fees(recv) > buyer) recv--;
  } else {
    recv = Math.max(1, Math.round(pos(v.amount, 10) * 100));
    buyer = recv + fees(recv);
  }
  const f = fees(recv), steam = Math.max(1, Math.floor(recv * 0.05));
  return { receive: r2(recv / 100), buyer: r2((recv + f) / 100), fee: r2(f / 100), steam: r2(steam / 100), game: r2((f - steam) / 100), pct: r2((f / (recv + f)) * 100) };
};

export const techShopCustomCalculators: Record<string, Calc> = {
  "aspect-ratio-calculator": aspectRatio,
  "led-video-wall-calculator": ledWall,
  "display-bandwidth-calculator": displayBandwidth,
  "image-file-size-calculator": imageFileSize,
  "ram-latency-calculator": ramLatency,
  "subwoofer-port-calculator": subPort,
  "esteps-calculator": esteps,
  "sim-racing-fov-calculator": simFov,
  "gsd-calculator": gsd,
  "steam-market-fee-calculator": steamFee,
};
