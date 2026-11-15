// One-time (but safe to re-run) batch setup script: 12 film, photo, audio and writing tools from the
// tech keyword check (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md): Arts & Entertainment >
// Art, Film & Creator Income (6), Music Theory, Instrument & Audio (5), Books, Reading & Writing (1).
// Formulas: src/lib/calc-engine-tech-media.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-tech-media-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-media";
import { mk, num, dd, tx, money, pct, T, upsertTools, type ToolDef } from "./trv-tool-kit";
import { nfmt } from "../src/lib/trv-core";

const C = E.techMediaCustomCalculators;

const FILM: ToolDef[] = [
  mk({
    slug: "steam-revenue-calculator", title: "Steam Revenue Calculator (Game Sales from Reviews)",
    meta: "Steam Revenue Calculator — Estimate Game Sales from Reviews",
    desc: "Estimate how many copies a Steam game has sold and how much the developer earned, from its review count (Boxleiter method), price and average discount. Includes Steam's 30/25/20% revenue share, refunds and taxes.",
    inputs: [num("reviews", "Steam Reviews", 1000, 0, 1e8, 1), num("mult", "Sales per Review (20–60, 30 typical)", 30, 1, 200, 1), money("price", "Full Price", 19.99), pct("discount", "Average Discount Across Sales (%)", 35, 95), pct("deductions", "Refunds, VAT & Regional Pricing (%)", 15, 90)],
    results: [["net", "Developer Net Revenue", "c"], ["units", "Estimated Copies Sold", "t"], ["gross", "Gross Revenue (after discounts, refunds, tax)", "c"], ["cut", "Steam's Share", "c"], ["perUnit", "Net per Copy", "t"], ["perReview", "Net per Review", "t"], ["range", "Copies Range", "t"]],
    fn: C["steam-revenue-calculator"], ex: { reviews: 1000, mult: 30, price: 19.99, discount: 35, deductions: 15 },
    exText: (o) => `Example: a $19.99 game with 1,000 reviews has sold about ${o.units} copies. After discounts, refunds, tax and Steam's 30%, the developer gets about $${nfmt(Number(o.net))}.`,
    how: "Only a small share of buyers leave a review. The Boxleiter method multiplies reviews by about 30 (20–60, higher for older or cheaper games, lower for niche genres with engaged players) to estimate copies sold.\n\nMost copies sell at a discount, and refunds, VAT and cheaper regional prices cut gross revenue further. Steam keeps 30% of the first $10 M, 25% up to $50 M and 20% after that.",
    assume: "An estimate for market research, not real sales data. Multipliers vary a lot by genre, price and launch year. Excludes bundles, keys sold elsewhere and income tax.",
    faq: [["How many copies does a game with 100 reviews sell?", "Roughly 2,000–6,000, often about 3,000."], ["How much does Steam take?", "30% of revenue up to $10 million, 25% from $10 M to $50 M and 20% above $50 M."]],
  }),
  mk({
    slug: "timecode-calculator", title: "Timecode Calculator (SMPTE, Drop-Frame & Frames)",
    meta: "Timecode Calculator — Add, Subtract & Convert SMPTE Timecode",
    desc: "Add or subtract SMPTE timecodes, or convert timecode to frames, seconds and film footage, at 23.976, 24, 25, 29.97 drop-frame and non-drop, 30, 50, 59.94 and 60 fps.",
    inputs: [dd("fps", "Frame Rate", E.FPS.map(([l]) => l), 1), tx("a", "Timecode A (HH:MM:SS:FF or frames)", "01:00:00:00"), dd("op", "Operation", E.TC_OPS, 0), tx("b", "Timecode B", "00:30:15:12")],
    results: [["tc", "Result Timecode", "t"], ["frames", "Total Frames", "t"], ["real", "Real Time", "t"], ["seconds", "Seconds", "n", 4], ["film", "Film Footage", "t"], ["mode", "Mode", "t"]],
    fn: C["timecode-calculator"], ex: { fps: 1, ...T("a", "01:00:00:00"), op: 0, ...T("b", "00:30:15:12") },
    exText: (o) => `Example: at 24 fps, 01:00:00:00 + 00:30:15:12 = ${o.tc} (${o.frames} frames).`,
    how: "Timecode is hours:minutes:seconds:frames. Addition carries frames into seconds at the frame rate, not at 100.\n\nAt 29.97 drop-frame, frame numbers 00 and 01 are skipped at the start of every minute except every tenth minute, so the timecode stays in step with the clock. No actual frames are dropped. 23.976 fps uses 24-frame counting but runs 0.1% slower in real time.",
    assume: "Standard SMPTE 12M counting. Drop-frame is shown with a semicolon before the frames. Film footage assumes 35 mm 4-perf (16 frames per foot).",
    faq: [["What is drop-frame timecode?", "A counting method for 29.97 fps that skips frame numbers so one hour of timecode equals one hour of real time."], ["How many frames are in an hour at 29.97 DF?", "107,892."]],
  }),
  mk({
    slug: "shutter-angle-calculator", title: "Shutter Angle Calculator (Angle ↔ Shutter Speed, 180° Rule)",
    meta: "Shutter Angle Calculator — 180° Rule, Shutter Speed & Flicker",
    desc: "Convert between shutter angle and shutter speed at any frame rate, check the 180° rule for natural motion blur, and see whether a setting will flicker under 50 Hz or 60 Hz lighting.",
    inputs: [dd("mode", "Convert", E.SA_MODES, 0), num("fps", "Frame Rate (fps)", 24, 1, 1000, 0.001, "fps"), num("angle", "Shutter Angle (°)", 180, 1, 360, 0.1, "°"), tx("speed", "Shutter Speed (e.g. 1/50)", "1/50"), dd("mains", "Mains Lighting Frequency", ["50 Hz (Europe, Asia, Australia)", "60 Hz (Americas)"], 0)],
    results: [["speed", "Shutter Speed", "t"], ["angle", "Shutter Angle (°)", "n", 1], ["blur", "Motion Look", "t"], ["flicker", "Flicker Check", "t"], ["exposure", "Exposure Time", "t"]],
    fn: C["shutter-angle-calculator"], ex: { mode: 0, fps: 24, angle: 180, ...T("speed", "1/50"), mains: 0 },
    exText: (o) => `Example: 180° at 24 fps is ${o.speed}. ${o.flicker}.`,
    how: "Shutter speed = (angle ÷ 360) ÷ frame rate. The 180° rule (shutter speed ≈ 1 ÷ (2 × fps)) gives the motion blur audiences expect from film.\n\nNarrow angles (45–90°) give the crisp, jittery look of action scenes. Under mains lighting, choose an exposure that is a whole multiple of 1/100 s (50 Hz) or 1/120 s (60 Hz) to avoid flicker.",
    assume: "Rotary-shutter equivalent for digital cameras. LED fixtures may flicker at other frequencies; test before shooting.",
    faq: [["What shutter speed for 24 fps?", "1/48 s (or 1/50 s on most cameras) for 180°."], ["What shutter speed for 60 fps?", "1/120 s for 180°, or 1/125 on stills cameras."]],
  }),
  mk({
    slug: "render-time-calculator", title: "Render Time Calculator (Animation Frames & Render Farm Cost)",
    meta: "Render Time Calculator — Animation Frames, Machines & Farm Cost",
    desc: "Estimate how long an animation or VFX sequence takes to render from the number of frames (or duration × fps), minutes per frame and the number of machines, plus the render farm cost per node-hour.",
    inputs: [num("frames", "Frames (0 = use duration × fps)", 0, 0, 1e8, 1), num("seconds", "Animation Length (s)", 60, 0, 1e6, 0.1, "s"), num("fps", "Frame Rate", 24, 1, 240, 1, "fps"), num("minutes", "Render Time per Frame (min)", 5, 0.01, 10000, 0.1, "min"), num("nodes", "Machines / Nodes", 2, 1, 100000, 1), pct("overhead", "Overhead: loading, re-renders (%)", 10, 500), money("price", "Render Farm Price per Node-Hour (optional)", 1.2)],
    results: [["wall", "Total Render Time", "t"], ["hours", "Node-Hours", "n", 1], ["frames", "Frames", "t"], ["cost", "Render Farm Cost", "c"], ["perFrame", "Per Frame", "t"], ["more", "With More Machines", "t"]],
    fn: C["render-time-calculator"], ex: { frames: 0, seconds: 60, fps: 24, minutes: 5, nodes: 2, overhead: 10, price: 1.2 },
    exText: (o) => `Example: a 60-second, 24 fps animation (1,440 frames) at 5 minutes a frame takes ${o.wall} on 2 machines, or about $${nfmt(Number(o.cost))} on a farm at $1.20 per node-hour.`,
    how: "Render a few representative frames first and time them; heavy shots (fluids, hair, glass) can take many times longer than average. Total node-hours = frames × minutes per frame ÷ 60, plus overhead for scene loading and re-renders.\n\nRendering splits almost perfectly across machines, so doubling the nodes roughly halves the wait.",
    assume: "Each machine is as fast as the one you timed. Farm pricing varies (per GHz-hour, per OctaneBench-hour); convert to per node-hour for this estimate.",
    faq: [["How long does it take to render a 1-minute animation?", "At 24 fps that's 1,440 frames: 5 min/frame on one PC = 120 hours, so about 5 days."]],
  }),
  mk({
    slug: "nd-filter-calculator", title: "ND Filter Calculator (Long-Exposure Shutter Speed)",
    meta: "ND Filter Calculator — Shutter Speed with ND8, ND64, ND1000",
    desc: "Find your new shutter speed after adding a neutral density filter (ND2 to ND1000 and beyond, or any number of stops), for long exposures of water, clouds and video. Also shows the optical density and light transmission.",
    inputs: [tx("base", "Shutter Speed Without the Filter (e.g. 1/125)", "1/125"), dd("nd", "ND Filter", E.ND.map(([l]) => l), 9), num("stops", "Custom Stops", 6, 0, 30, 0.1)],
    results: [["time", "New Shutter Speed", "t"], ["seconds", "Seconds", "n", 4], ["stops", "Stops", "n", 2], ["od", "Optical Density", "n", 2], ["trans", "Light Transmission", "t"], ["factor", "Light Reduction", "t"], ["bulb", "Note", "t"]],
    fn: C["nd-filter-calculator"], ex: { ...T("base", "1/125"), nd: 9, stops: 6 },
    exText: (o) => `Example: 1/125 s with a 10-stop ND1000 becomes ${o.time}, enough to smooth waves and streak clouds.`,
    how: "Meter and focus without the filter, then fit it. Each stop halves the light, so the exposure time doubles: new time = base time × 2^stops. An ND1000 is 10 stops, and ND64 is 6.\n\nKeep the aperture and ISO the same. For exposures over 30 s, switch to Bulb mode and use a remote.",
    assume: "Ignores reciprocity failure (film) and ND colour casts. Strong NDs can be up to ⅓ stop off their rating, so check the histogram.",
    faq: [["How many stops is an ND1000?", "About 10 stops (2¹⁰ = 1,024)."], ["What ND filter for waterfalls?", "ND8–ND64 for silky water in daylight (½–2 s); ND1000 for very long exposures."]],
  }),
  mk({
    slug: "color-contrast-calculator", title: "Color Contrast Checker (WCAG Contrast Ratio)",
    meta: "Color Contrast Calculator — WCAG AA & AAA Contrast Ratio",
    desc: "Check the contrast ratio between text and background colours (hex) against WCAG 2 accessibility levels AA and AAA for normal text, large text and UI components.",
    inputs: [tx("fg", "Text / Foreground Colour (hex)", "#767676"), tx("bg", "Background Colour (hex)", "#ffffff")],
    results: [["ratio", "Contrast Ratio", "t"], ["aa", "WCAG AA — Normal Text", "t"], ["aaLarge", "WCAG AA — Large Text", "t"], ["aaa", "WCAG AAA — Normal Text", "t"], ["aaaLarge", "WCAG AAA — Large Text", "t"], ["ui", "UI Components & Graphics (AA)", "t"], ["lum", "Relative Luminance (fg / bg)", "t"], ["value", "Ratio (number)", "n", 2]],
    fn: C["color-contrast-calculator"], ex: { ...T("fg", "#767676"), ...T("bg", "#ffffff") },
    exText: (o) => `Example: grey #767676 on white is ${o.ratio}, which is the lightest grey that passes AA for normal text.`,
    how: "Contrast ratio = (lighter luminance + 0.05) ÷ (darker luminance + 0.05), from 1:1 (same colour) to 21:1 (black on white). WCAG AA needs 4.5:1 for normal text and 3:1 for large text (18 pt, or 14 pt bold). AAA needs 7:1 and 4.5:1.\n\nIcons, form borders and focus outlines need 3:1 against their background.",
    assume: "WCAG 2.x sRGB relative luminance. Doesn't cover transparency or text over images; test against the actual background pixels.",
    faq: [["What contrast ratio is accessible?", "At least 4.5:1 for body text (WCAG AA)."], ["What is the contrast of black on white?", "21:1, the maximum."]],
  }),
];

const AUDIO: ToolDef[] = [
  mk({
    slug: "speaker-spl-calculator", title: "Speaker SPL Calculator (Loudness from Sensitivity & Watts)",
    meta: "SPL Calculator — Speaker Loudness at Your Listening Distance",
    desc: "Calculate how loud speakers play (dB SPL) at your listening position from their sensitivity, amplifier power, distance, number of speakers and room placement, and the amplifier watts needed to reach a target level.",
    inputs: [num("sens", "Speaker Sensitivity (dB @ 1 W / 1 m)", 88, 60, 120, 0.5, "dB"), num("watts", "Amplifier Power per Speaker (W)", 50, 0.01, 1e5, 0.1, "W"), num("dist", "Listening Distance (m)", 3, 0.1, 1000, 0.1, "m"), num("count", "Number of Speakers", 2, 1, 100, 1), dd("boundary", "Placement", E.BOUNDARY.map(([l]) => l), 0), num("target", "Target Peak Level (dB)", 105, 60, 140, 1, "dB")],
    results: [["spl", "Maximum SPL at Listener (dB)", "n", 1], ["need", "Power Needed for Target", "t"], ["at1w", "SPL at 1 W (dB)", "n", 1], ["loss", "Distance Loss", "t"], ["safe", "Hearing Safety", "t"]],
    fn: C["speaker-spl-calculator"], ex: { sens: 88, watts: 50, dist: 3, count: 2, boundary: 0, target: 105 },
    exText: (o) => `Example: two 88 dB speakers with 50 W each reach about ${o.spl} dB at 3 m. Reference-level home theatre peaks (105 dB) would need ${String(o.need).split(" per")[0]} each.`,
    how: "SPL = sensitivity + 10 × log₁₀(watts) − 20 × log₁₀(distance) + 10 × log₁₀(number of speakers). Every doubling of power adds only 3 dB, while every doubling of distance loses 6 dB. That's why sensitivity matters so much: a 91 dB speaker needs half the power of an 88 dB one.\n\nAllow 3 dB or more of headroom so the amplifier doesn't clip on peaks.",
    assume: "Free-field inverse-square law. Rooms add some reinforcement at a distance, so real levels are often a few dB higher. Speakers can't exceed their power handling.",
    faq: [["How many watts do I need?", "For 100 dB at 3 m from a pair of 88 dB speakers, about 70 W each (plus headroom)."], ["How loud is 85 dB?", "About city traffic. Hours of exposure above 85 dB risk hearing damage."]],
  }),
  mk({
    slug: "crossover-calculator", title: "Speaker Crossover Calculator (2-Way & 3-Way Passive)",
    meta: "Crossover Calculator — Passive 2-Way & 3-Way Inductor/Capacitor",
    desc: "Design a passive speaker crossover: inductor and capacitor values for 2-way or 3-way speakers, 1st order or 2nd order Butterworth or Linkwitz-Riley, from the crossover frequency and driver impedances, with a baffle-step estimate.",
    inputs: [dd("ways", "Speaker", ["2-way (woofer + tweeter)", "3-way (woofer + mid + tweeter)"], 0), dd("order", "Filter Type", E.XO_ORDERS, 2), num("f1", "Crossover Frequency (Hz, woofer↔next)", 2500, 20, 20000, 1, "Hz"), num("f2", "Second Crossover (Hz, mid↔tweeter, 3-way)", 4000, 0, 20000, 1, "Hz"), num("rw", "Woofer Impedance (Ω)", 8, 1, 32, 0.1, "Ω"), num("rm", "Midrange Impedance (Ω)", 8, 1, 32, 0.1, "Ω"), num("rt", "Tweeter Impedance (Ω)", 8, 1, 32, 0.1, "Ω"), num("baffle", "Baffle Width (cm, optional)", 20, 0, 500, 0.5, "cm")],
    results: [["woofer", "Woofer (Low-Pass)", "t"], ["mid", "Midrange (Band-Pass)", "t"], ["tweeter", "Tweeter (High-Pass)", "t"], ["polarity", "Polarity", "t"], ["baffle", "Baffle Step", "t"], ["slope", "Slope", "t"]],
    fn: C["crossover-calculator"], ex: { ways: 0, order: 2, f1: 2500, f2: 4000, rw: 8, rm: 8, rt: 8, baffle: 20 },
    exText: (o) => `Example: a 2-way Linkwitz-Riley crossover at 2.5 kHz for 8 Ω drivers uses woofer: ${o.woofer}; tweeter: ${o.tweeter}.`,
    how: "The woofer gets a series inductor (it blocks highs); the tweeter gets a series capacitor (it blocks lows). 2nd-order filters add a shunt part to each and roll off at 12 dB/octave, protecting the tweeter better. Linkwitz-Riley sums flat at the crossover point; Butterworth gives a slight bump.\n\nUse the driver's impedance at the crossover frequency (often higher than nominal), or add a Zobel network to flatten it.",
    assume: "Textbook formulas with resistive driver loads. Real drivers need measurement and tuning. Use air-core inductors and film capacitors in the tweeter path.",
    faq: [["Why reverse the tweeter polarity?", "A 2nd-order crossover shifts the phase 180° between woofer and tweeter. Reversing the tweeter keeps them in step at the crossover."], ["What crossover frequency should I use?", "Usually 1.5–3.5 kHz for a 2-way, above the tweeter's resonance and below the woofer's breakup."]],
  }),
  mk({
    slug: "speaker-wire-calculator", title: "Speaker Wire Gauge Calculator (Length vs Power Loss)",
    meta: "Speaker Wire Gauge Calculator — What AWG for Your Run?",
    desc: "Find the right speaker wire gauge for your cable length and speaker impedance. Shows the power and dB lost in the wire, the damping-factor limit, and the maximum run length for each gauge from 10 to 22 AWG.",
    inputs: [num("length", "Cable Length (one way)", 15, 0.1, 10000, 0.1), dd("units", "Units", ["Metres", "Feet"], 0), num("ohms", "Speaker Impedance (Ω)", 8, 1, 32, 0.5, "Ω"), dd("gauge", "Wire Gauge to Check", E.GAUGE_LABELS, 3), pct("loss", "Maximum Acceptable Power Loss (%)", 5, 50)],
    results: [["rec", "Recommended Gauge", "t"], ["loss", "Power Lost in Chosen Wire (%)", "n", 2], ["db", "Level Lost (dB)", "n", 2], ["ohms", "Wire Resistance, Both Conductors (Ω)", "n", 3], ["df", "Damping Factor Limit", "t"], ["table", "Maximum Length per Gauge", "t"], ["gauge", "Gauge Checked", "t"]],
    fn: C["speaker-wire-calculator"], ex: { length: 15, units: 0, ohms: 8, gauge: 3, loss: 5 },
    exText: (o) => `Example: a 15 m run to an 8 Ω speaker loses ${o.loss}% of the power in 16 AWG. ${o.rec} keeps the loss under 5%.`,
    how: "The signal travels out and back, so the resistance is for twice the length. Power lost = wire resistance ÷ (wire resistance + speaker impedance). Lower-impedance speakers (4 Ω) need thicker wire for the same loss.\n\nKeep the loss under about 5% (0.2 dB) for hi-fi. Thicker wire beyond that makes no audible difference.",
    assume: "Pure copper (0.01724 Ω·mm²/m) and resistive loads. Copper-clad aluminium (CCA) wire has about 60% more resistance, so go up two gauges.",
    faq: [["Is 16 gauge speaker wire good enough?", "Yes for 8 Ω speakers up to about 15 m (50 ft). Use 14 AWG or thicker for longer runs or 4 Ω speakers."], ["Does expensive speaker cable sound better?", "Only resistance matters at audio frequencies. Choose the right gauge, not the price."]],
  }),
  mk({
    slug: "tube-amp-bias-calculator", title: "Tube Amp Bias Calculator (Plate Current & Dissipation)",
    meta: "Tube Bias Calculator — EL34, 6L6, KT88 Bias Current (mA)",
    desc: "Work out the bias current for power tubes such as EL34, 6L6GC, KT88, 6V6 and EL84 from the plate voltage, maximum plate dissipation and target percentage. Shows the reading across a 1 Ω or 10 Ω sense resistor.",
    inputs: [dd("tube", "Power Tube", E.TUBES.map(([l]) => l), 0), num("pmax", "Custom Max Plate Dissipation (W)", 25, 1, 200, 0.5, "W"), num("plate", "Plate Voltage (V)", 450, 50, 1500, 1, "V"), num("pct", "Target Dissipation (%)", 70, 10, 100, 1, "%"), dd("screen", "Bias Probe Measures", ["Cathode current (plate + screen)", "Plate current only"], 0)],
    results: [["ma", "Bias Current (mA per tube)", "n", 1], ["mv", "Meter Reading", "t"], ["range", "Class AB Range", "t"], ["diss", "Plate Dissipation", "t"], ["warn", "Check", "t"]],
    fn: C["tube-amp-bias-calculator"], ex: { tube: 0, pmax: 25, plate: 450, pct: 70, screen: 0 },
    exText: (o) => `Example: EL34s with 450 V on the plates biased at 70% need about ${o.ma} mA each (cathode current).`,
    how: "Bias current (mA) = maximum plate dissipation × target % ÷ plate voltage × 1,000. Push-pull class AB amps are usually biased at 60–70%. Measure the plate voltage with the amp warmed up and idling, not the B+ at the power supply.\n\nCathode-current probes and 1 Ω sense resistors include screen current (about 5% more), so the calculator adds it.",
    assume: "Lethal voltages are present inside tube amps. Only bias an amp if you're trained to work on high voltage. Class A single-ended amps may run at up to 90–100%.",
    faq: [["What should EL34 bias be?", "About 35–40 mA per tube at 450 V for 60–70% of 25 W."], ["What happens if bias is too hot?", "Tubes run red-plated, wear out fast and can fail."]],
  }),
  mk({
    slug: "audio-file-size-calculator", title: "Audio File Size Calculator (WAV, FLAC & MP3)",
    meta: "Audio File Size Calculator — WAV, FLAC, MP3 Size & Bitrate",
    desc: "Calculate audio file size and bitrate from sample rate, bit depth, channels and duration for WAV/AIFF, FLAC/ALAC or MP3/AAC at any bitrate. Also gives MB per minute, GB per hour and minutes per GB.",
    inputs: [dd("format", "Format", E.AUDIO_FMTS.map(([l]) => l), 0), num("rate", "Sample Rate (Hz)", 44100, 8000, 384000, 100, "Hz"), num("bits", "Bit Depth", 16, 8, 32, 1, "bit"), num("channels", "Channels", 2, 1, 64, 1), num("minutes", "Duration (min)", 3.5, 0, 1e6, 0.1, "min"), num("kbps", "Compressed Bitrate (kbps, for MP3/AAC)", 320, 8, 1536, 1, "kbps")],
    results: [["mb", "File Size (MB)", "n", 2], ["kbps", "Bitrate (kbps)", "n", 0], ["perMin", "MB per Minute", "n", 2], ["perHour", "GB per Hour", "n", 2], ["gb", "Recording Time per GB", "t"], ["pcm", "Uncompressed PCM Rate (kbps)", "n", 0]],
    fn: C["audio-file-size-calculator"], ex: { format: 0, rate: 44100, bits: 16, channels: 2, minutes: 3.5, kbps: 320 },
    exText: (o) => `Example: a 3½-minute CD-quality WAV (44.1 kHz, 16-bit stereo) is ${o.mb} MB at ${o.kbps} kbps.`,
    how: "Uncompressed size = sample rate × bit depth × channels × seconds ÷ 8. CD quality is 1,411 kbps, about 10 MB a minute. FLAC keeps every bit at roughly half the size. MP3 or AAC size depends only on the bitrate you choose.\n\nFor recording, 48 kHz / 24-bit is standard for video and 44.1 kHz for music.",
    assume: "FLAC ratio is a typical average for music (it varies with content). File headers and metadata add a few KB.",
    faq: [["How big is a 3-minute MP3?", "About 7.2 MB at 320 kbps, or 2.9 MB at 128 kbps."], ["How many minutes of WAV fit in 1 GB?", "About 95 minutes of CD-quality stereo."]],
  }),
];

const BOOKS: ToolDef[] = [
  mk({
    slug: "script-length-calculator", title: "Script Length Calculator (Words to Speaking Time & Runtime)",
    meta: "Script Length Calculator — Words to Minutes for Speech & Video",
    desc: "Turn a script's word count into speaking or screen time for speeches, presentations, YouTube voice-overs, podcasts and audiobooks, or a screenplay's page count into runtime. Also tells you how many words fit a target length.",
    inputs: [dd("type", "Script Type", E.SCRIPT_TYPES.map(([l]) => l), 1), num("words", "Word Count", 1500, 0, 1e7, 1), tx("text", "Or Paste Text (if no word count)", ""), num("pages", "Screenplay Pages", 0, 0, 1000, 1), num("wpm", "Custom Speaking Rate (wpm, optional)", 0, 0, 400, 1, "wpm"), num("target", "Target Length (min, optional)", 10, 0, 10000, 0.5, "min")],
    results: [["time", "Runtime", "t"], ["minutes", "Minutes", "n", 2], ["words", "Words", "n", 0], ["pages", "Pages", "n", 1], ["forTarget", "Words for Target Length", "t"]],
    fn: C["script-length-calculator"], ex: { type: 1, words: 1500, ...T("text", ""), pages: 0, wpm: 0, target: 10 },
    exText: (o) => `Example: a 1,500-word YouTube voice-over at 150 wpm runs ${o.time}.`,
    how: "Speaking time = words ÷ speaking rate. Most people present at about 130 words per minute, narrate videos at about 150, and talk in podcasts at about 160. Screenplays in standard format run about one page per minute.\n\nRead a paragraph aloud and time it to find your own rate, then enter it as a custom wpm.",
    assume: "Average pace without long pauses, slides or demos. Screenplay pages from words assume about 180 words per page.",
    faq: [["How long is a 1,000-word speech?", "About 7–8 minutes at a normal presenting pace."], ["How many words is a 5-minute speech?", "About 650–750 words."]],
  }),
];

async function main() {
  const all = [...FILM, ...AUDIO, ...BOOKS];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("art-film-creator-income-calculators", FILM);
  await upsertTools("music-theory-instrument-audio-calculators", AUDIO);
  await upsertTools("books-reading-writing-calculators", BOOKS);
}
main().catch((e) => { console.error(e); process.exit(1); });
