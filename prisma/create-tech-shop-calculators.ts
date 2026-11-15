// One-time (but safe to re-run) batch setup script: 10 display, PC, audio, 3D-printing, drone and
// Steam tools from the tech keyword check (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md):
// Shopping > Electronics, Energy & Tech (9) and Shopping > Pricing, Markup & Seller Fee (1).
// Formulas: src/lib/calc-engine-tech-shop.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-tech-shop-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-shop";
import { mk, num, dd, money, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.techShopCustomCalculators;

const TECH: ToolDef[] = [
  mk({
    slug: "aspect-ratio-calculator", title: "Aspect Ratio Calculator (16:9, 4:3, 21:9 & Resize)",
    meta: "Aspect Ratio Calculator — Find Ratio & Resize Keeping 16:9",
    desc: "Find the aspect ratio of any width × height (such as 1920 × 1080 = 16:9) and resize an image, video or screen to a new width or height without stretching. Includes 16:9, 4:3, 21:9, 9:16, 4:5 and cinema ratios.",
    inputs: [dd("preset", "Ratio", E.RATIOS.map(([l]) => l), 0), num("w", "Original Width (px)", 1920, 0, 1e6, 1, "px"), num("h", "Original Height (px)", 1080, 0, 1e6, 1, "px"), num("newW", "New Width (px, optional)", 1280, 0, 1e6, 1, "px"), num("newH", "New Height (px, optional)", 0, 0, 1e6, 1, "px")],
    results: [["ratio", "Aspect Ratio", "t"], ["newSize", "Resized Dimensions", "t"], ["decimal", "Decimal Ratio", "t"], ["nearest", "Standard Ratio", "t"], ["mp", "Megapixels", "n", 3], ["sizes", "Common Sizes at This Ratio", "t"], ["w", "Width (px)", "n", 0], ["h", "Height (px)", "n", 0]],
    fn: C["aspect-ratio-calculator"], ex: { preset: 0, w: 1920, h: 1080, newW: 1280, newH: 0 },
    exText: (o) => `Example: 1920 × 1080 is ${o.ratio}. Resizing to 1280 px wide keeps it at ${o.newSize}.`,
    how: "Aspect ratio is width ÷ height, reduced to its simplest whole numbers by dividing both by their greatest common divisor. 1920 × 1080 ÷ 120 = 16 × 9.\n\nTo resize without stretching, keep the ratio: new height = new width ÷ ratio. Enter a new width or a new height and the other side is calculated. Choose a preset to work from a standard ratio instead of a size.",
    assume: "Pixels are square. \"21:9\" monitors are really 64:27 (2560 × 1080) or 43:18 (3440 × 1440).",
    faq: [["What aspect ratio is 1920 × 1080?", "16:9."], ["What size is 9:16 for Reels and TikTok?", "1080 × 1920 pixels."], ["What is 4:5 on Instagram?", "1080 × 1350 for a portrait post."]],
  }),
  mk({
    slug: "led-video-wall-calculator", title: "LED Video Wall Calculator (Pixel Pitch, Resolution & Power)",
    meta: "LED Wall Calculator — Pixel Pitch, Size, Resolution & Power",
    desc: "Plan an LED video wall from the cabinet size, pixel pitch and number of cabinets. Get the total resolution, wall size and diagonal, viewing distance, maximum and typical power, weight and the number of processor ports.",
    inputs: [num("cw", "Cabinet Width (mm)", 500, 1, 5000, 1, "mm"), num("ch", "Cabinet Height (mm)", 500, 1, 5000, 1, "mm"), num("pitch", "Pixel Pitch (mm)", 2.6, 0.3, 50, 0.01, "mm"), num("nx", "Cabinets Wide", 8, 1, 500, 1), num("ny", "Cabinets High", 5, 1, 500, 1), num("watts", "Max Power per Cabinet (W)", 130, 0, 5000, 1, "W"), num("kg", "Weight per Cabinet (kg)", 7.5, 0, 500, 0.1, "kg")],
    results: [["res", "Wall Resolution", "t"], ["size", "Wall Size", "t"], ["diag", "Diagonal", "t"], ["aspect", "Aspect Ratio", "t"], ["view", "Viewing Distance", "t"], ["power", "Power", "t"], ["kg", "Total Weight (kg)", "n", 1], ["cabinets", "Cabinets", "n", 0], ["ports", "Sending-Card Ports (≈ 650k px each)", "n", 0], ["pixels", "Total Pixels", "t"]],
    fn: C["led-video-wall-calculator"], ex: { cw: 500, ch: 500, pitch: 2.6, nx: 8, ny: 5, watts: 130, kg: 7.5 },
    exText: (o) => `Example: 8 × 5 cabinets of 500 × 500 mm at 2.6 mm pitch make a ${o.size} wall of ${o.res}, drawing up to ${String(o.power).split(" W")[0]} W.`,
    how: "Pixel pitch is the distance between LED centres. Each cabinet holds (size ÷ pitch) pixels per side, so the wall's resolution is pixels per cabinet × the number of cabinets. Smaller pitch means a sharper image up close, at a higher cost.\n\nA rule of thumb: the closest comfortable viewing distance in metres ≈ pitch in mm, and the ideal is about 3 ×.",
    assume: "Typical power is about one third of maximum for normal video content. Gigabit sending-card ports carry about 650,000 pixels at 60 Hz. Check the manufacturer's data sheet.",
    faq: [["What pixel pitch do I need?", "For viewers 3 m away, 2.5–3 mm. For 10 m, 6–10 mm. For close-up retail or broadcast, under 2 mm."], ["How much power does an LED wall use?", "About 300–600 W per m² maximum indoors, with typical use about a third of that."]],
  }),
  mk({
    slug: "display-bandwidth-calculator", title: "HDMI & DisplayPort Bandwidth Calculator (Resolution, Hz & Bit Depth)",
    meta: "Display Bandwidth Calculator — Will HDMI 2.1 or DP 1.4 Do It?",
    desc: "Calculate the data rate a monitor or TV signal needs from its resolution, refresh rate, colour depth and chroma subsampling, then see which HDMI and DisplayPort versions can carry it, with or without DSC compression.",
    inputs: [num("w", "Horizontal Resolution (px)", 3840, 320, 20000, 1, "px"), num("h", "Vertical Resolution (px)", 2160, 200, 20000, 1, "px"), num("hz", "Refresh Rate (Hz)", 144, 1, 1000, 1, "Hz"), dd("depth", "Colour Depth", ["8-bit (SDR)", "10-bit (HDR)", "12-bit"], 1), dd("chroma", "Chroma", E.CHROMA.map(([l]) => l), 0)],
    results: [["gbps", "Required Data Rate (Gbps)", "n", 2], ["fits", "Works Uncompressed On", "t"], ["dsc", "Works With DSC", "t"], ["pclk", "Pixel Clock (MHz)", "n", 1], ["active", "Active Video Only (Gbps)", "n", 2], ["mode", "Mode", "t"], ["timing", "Timing", "t"]],
    fn: C["display-bandwidth-calculator"], ex: { w: 3840, h: 2160, hz: 144, depth: 1, chroma: 0 },
    exText: (o) => `Example: 4K at 144 Hz in 10-bit HDR needs about ${o.gbps} Gbps. Uncompressed that means ${o.fits}; ${o.dsc}.`,
    how: "Data rate = pixels per frame (including blanking) × refresh rate × bits per pixel. 10-bit RGB is 30 bits per pixel. 4:2:2 and 4:2:0 cut colour data to 2/3 and 1/2.\n\nEach cable standard has a maximum payload after encoding overhead. Display Stream Compression (DSC) packs about 3:1 with no visible loss, so DP 1.4 can run 4K 144 Hz HDR with DSC.",
    assume: "CVT reduced-blanking v2 timing (80-pixel horizontal blank, 460 µs vertical blank). Real monitors may use slightly different timings. Cable and port quality also matter.",
    faq: [["Can HDMI 2.0 do 4K 120 Hz?", "Not at full 8-bit RGB (about 25 Gbps needed vs 14.4). It needs 4:2:0, DSC or HDMI 2.1."], ["What bandwidth does 4K 60 Hz need?", "About 12.5 Gbps at 8-bit RGB, which fits HDMI 2.0 and DP 1.2."]],
  }),
  mk({
    slug: "image-file-size-calculator", title: "Image File Size Calculator (Megapixels to MB)",
    meta: "Image File Size Calculator — Pixels & Bit Depth to MB",
    desc: "Estimate an image's file size from its pixel dimensions, colour bit depth and format (uncompressed TIFF, PNG, JPEG, WebP/HEIC or AVIF), and how much space a batch of photos needs. Also gives megapixels and 300 dpi print size.",
    inputs: [num("w", "Width (px)", 6000, 1, 200000, 1, "px"), num("h", "Height (px)", 4000, 1, 200000, 1, "px"), dd("depth", "Colour Depth", E.DEPTHS.map(([l]) => l), 0), dd("format", "File Format", E.FORMATS.map(([l]) => l), 2), num("count", "Number of Images", 1, 1, 1e9, 1)],
    results: [["est", "Estimated File Size", "t"], ["raw", "Uncompressed Size", "t"], ["mp", "Megapixels", "n", 2], ["total", "Total for All Images", "t"], ["print", "Print Size", "t"], ["fmt", "Format", "t"]],
    fn: C["image-file-size-calculator"], ex: { w: 6000, h: 4000, depth: 0, format: 2, count: 1000 },
    exText: (o) => `Example: a 24 MP (6000 × 4000) photo is ${o.raw} uncompressed and about ${o.est} as a high-quality JPEG. 1,000 of them need ${String(o.total).split(" for")[0]}.`,
    how: "Uncompressed size = width × height × bits per pixel ÷ 8. A 24-bit RGB image uses 3 bytes per pixel. Compression then shrinks it: PNG is lossless at about 2:1 on photos, and JPEG high quality about 8:1.\n\nReal JPEG sizes depend on detail: noisy or textured scenes compress less than smooth skies.",
    assume: "Compression ratios are typical averages for photographs. Graphics with flat colour compress far better as PNG.",
    faq: [["How big is a 12 MP photo?", "About 36 MB uncompressed, and 3–5 MB as a JPEG."], ["Why is my PNG bigger than the JPEG?", "PNG is lossless, so photos stay large. JPEG throws away detail you can't easily see."]],
  }),
  mk({
    slug: "ram-latency-calculator", title: "RAM Latency Calculator (CAS Latency to Nanoseconds)",
    meta: "RAM Latency Calculator — CL & MT/s to True Latency (ns)",
    desc: "Convert RAM speed (MT/s) and CAS latency (CL) into true latency in nanoseconds, so DDR4 and DDR5 kits can be compared fairly. Also gives memory bandwidth and a second kit comparison.",
    inputs: [num("cl", "CAS Latency (CL) — Kit A", 30, 1, 100, 1), num("mts", "Speed (MT/s, e.g. 6000) — Kit A", 6000, 100, 20000, 1, "MT/s"), num("cl2", "CAS Latency — Kit B (optional)", 16, 0, 100, 1), num("mts2", "Speed — Kit B (optional)", 3200, 0, 20000, 1, "MT/s"), num("channels", "Memory Channels", 2, 1, 12, 1)],
    results: [["ns", "True Latency (ns)", "n", 2], ["compare", "Kit Comparison", "t"], ["bw", "Peak Bandwidth (GB/s)", "n", 1], ["cycle", "Clock Cycle (ns)", "n", 4], ["clock", "Memory Clock (MHz)", "t"], ["rule", "Kit", "t"]],
    fn: C["ram-latency-calculator"], ex: { cl: 30, mts: 6000, cl2: 16, mts2: 3200, channels: 2 },
    exText: (o) => `Example: DDR5-6000 CL30 has a true latency of ${o.ns} ns. ${o.compare}.`,
    how: "CAS latency is counted in clock cycles, and the memory clock is half the data rate (DDR = double data rate). True latency (ns) = CL × 2,000 ÷ MT/s. A higher CL at a higher speed can be just as fast.\n\nBandwidth = MT/s × 8 bytes × channels. Most desktops run dual channel.",
    assume: "First-word latency from CL only; real-world latency also depends on tRCD, tRP and the memory controller. Bandwidth is the theoretical peak.",
    faq: [["Is DDR5-6000 CL30 better than DDR4-3200 CL16?", "Same 10 ns latency, but nearly double the bandwidth."], ["What is good RAM latency?", "Around 10 ns or less is excellent for gaming."]],
  }),
  mk({
    slug: "subwoofer-port-calculator", title: "Subwoofer Port Calculator (Port Length for Box Tuning)",
    meta: "Subwoofer Port Calculator — Port Length for Tuning Frequency",
    desc: "Work out the port length for a vented (ported) subwoofer or speaker box from its net volume, tuning frequency and port size, for round or slot ports. Checks port air speed for chuffing and the volume the port takes up.",
    inputs: [num("vb", "Net Box Volume (L)", 50, 1, 2000, 0.1, "L"), num("fb", "Tuning Frequency (Hz)", 32, 10, 200, 0.5, "Hz"), dd("shape", "Port Type", E.PORT_SHAPES, 0), num("d", "Round Port Inside Diameter (cm)", 10, 1, 60, 0.1, "cm"), num("sw", "Slot Width (cm)", 5, 0, 100, 0.1, "cm"), num("sh", "Slot Height (cm)", 30, 0, 200, 0.1, "cm"), num("ports", "Number of Ports", 1, 1, 8, 1), dd("ends", "Port Ends", E.PORT_ENDS, 0), num("sd", "Driver Cone Area Sd (cm², optional)", 500, 0, 20000, 1, "cm²"), num("xmax", "Driver Xmax (mm, optional)", 12, 0, 100, 0.1, "mm")],
    results: [["cm", "Port Length (cm)", "n", 1], ["inch", "Port Length (in)", "n", 1], ["vel", "Peak Port Air Speed", "t"], ["area", "Port Area", "t"], ["vol", "Port Volume", "t"], ["check", "Tuning Check", "t"]],
    fn: C["subwoofer-port-calculator"], ex: { vb: 50, fb: 32, shape: 0, d: 10, sw: 5, sh: 30, ports: 1, ends: 0, sd: 500, xmax: 12 },
    exText: (o) => `Example: a 50 L box tuned to 32 Hz with one 10 cm round port needs a port about ${o.cm} cm (${o.inch} in) long. Peak air speed is ${o.vel}.`,
    how: "A ported box is a Helmholtz resonator: the air in the port bounces on the air spring of the box. A bigger box, a lower tuning or a smaller port all mean a longer port. The calculator subtracts the end correction for flanged and free port ends.\n\nToo small a port makes air rush noise (chuffing). Keep peak air speed under about 17 m/s by using a larger or second port.",
    assume: "Net internal volume after the driver, bracing and port are taken out. Slot ports that use a box wall act longer than calculated, so test and trim. Speed of sound 343 m/s.",
    faq: [["What frequency should I tune my sub box to?", "Usually 30–35 Hz for music and 25–30 Hz for home-theatre deep bass, near the driver's Fs."], ["Why does my port chuff?", "The air speed in the port is too high. Use more port area (which then needs a longer port)."]],
  }),
  mk({
    slug: "esteps-calculator", title: "E-Steps Calculator (3D Printer Extruder Calibration)",
    meta: "E-Steps Calculator — Calibrate Extruder Steps/mm & Klipper",
    desc: "Calibrate your 3D printer's extruder e-steps from a 100 mm test extrusion, or calculate theoretical steps per mm from the motor, microstepping and drive gear. Gives the M92 command and the Klipper rotation_distance.",
    inputs: [dd("mode", "Method", E.ESTEP_MODES, 0), num("current", "Current E-Steps (steps/mm)", 93, 1, 5000, 0.01), num("req", "Extrusion Requested (mm)", 100, 1, 1000, 1, "mm"), num("mark", "Mark Distance Above Extruder (mm)", 120, 1, 1000, 0.1, "mm"), num("left", "Distance Left to the Mark After (mm)", 23, 0, 1000, 0.1, "mm"), num("spr", "Motor Full Steps per Rev", 200, 1, 1000, 1), num("micro", "Microstepping", 16, 1, 256, 1), num("gear", "Drive Gear Effective Diameter (mm)", 11, 0.1, 50, 0.01, "mm"), num("ratio", "Extruder Gear Ratio (e.g. 3 for 3:1)", 1, 0.1, 100, 0.01)],
    results: [["esteps", "New E-Steps (steps/mm)", "n", 2], ["gcode", "Marlin Command", "t"], ["klipper", "Klipper", "t"], ["note", "Details", "t"]],
    fn: C["esteps-calculator"], ex: { mode: 0, current: 93, req: 100, mark: 120, left: 23, spr: 200, micro: 16, gear: 11, ratio: 1 },
    exText: (o) => `Example: with 93 steps/mm, asking for 100 mm left 23 mm of the 120 mm mark, so only 97 mm went through. The new value is ${o.esteps} steps/mm.`,
    how: "Heat the nozzle, mark the filament 120 mm above the extruder entry and send G1 E100 F100 (in relative mode, M83). Measure what's left to the mark: 20 mm means it's calibrated. New e-steps = current × requested ÷ actually extruded.\n\nSave with M92 E… then M500 (Marlin). Klipper uses rotation_distance instead, which is shown too.",
    assume: "Do the test slowly with the hot end at printing temperature, or extrude with the nozzle removed (cold) for the most accurate mechanical calibration. Tune flow rate separately in the slicer.",
    faq: [["What are typical e-steps?", "About 93 for a Creality stock extruder, 415 for a BMG/Orbiter-style 3:1 geared extruder, and 690 for a Bondtech LGX."], ["How do I convert e-steps to rotation_distance?", "rotation_distance = full steps × microsteps ÷ steps per mm. 200 × 16 ÷ 93 = 34.4."]],
  }),
  mk({
    slug: "sim-racing-fov-calculator", title: "Sim Racing FOV Calculator (Single & Triple Screens)",
    meta: "Sim Racing FOV Calculator — ACC, iRacing & Triple Screens",
    desc: "Work out the correct in-game field of view (FOV) for sim racing from your screen size, aspect ratio and eye distance, for one screen or triples. Gives vertical and horizontal FOV and the triple-screen side angle, with notes for ACC, Assetto Corsa and iRacing.",
    inputs: [num("diag", "Screen Diagonal (in)", 32, 10, 200, 0.5, "in"), dd("aspect", "Aspect Ratio", E.FOV_ASPECT.map(([l]) => l), 0), num("dist", "Eye-to-Screen Distance (cm)", 70, 10, 500, 1, "cm"), dd("screens", "Screens", ["Single", "Triple"], 0)],
    results: [["vfov", "Vertical FOV (°)", "n", 1], ["hfov", "Horizontal FOV (°)", "n", 1], ["angle", "Triple-Screen Side Angle", "t"], ["games", "Which Value to Use", "t"], ["screen", "Screen Size", "t"]],
    fn: C["sim-racing-fov-calculator"], ex: { diag: 32, aspect: 0, dist: 70, screens: 0 },
    exText: (o) => `Example: a 32" 16:9 screen 70 cm from your eyes needs a vertical FOV of ${o.vfov}° (horizontal ${o.hfov}°). It feels slow at first, but your speed and braking judgement improve.`,
    how: "A correct FOV makes the screen act like a window: objects appear at true size and distance. FOV = 2 × atan(screen size ÷ 2 ÷ eye distance). Measure from your eyes to the screen surface in your driving position.\n\nWith triples, angle each side screen inward so it faces your eyes. The angle equals one screen's horizontal FOV.",
    assume: "Flat screens with no bezel correction. Curved and ultrawide screens differ slightly. Games label FOV differently, so check your title's setting.",
    faq: [["Why does correct FOV feel slow?", "Most players are used to a wide, zoomed-out view. A true-to-life FOV shows the real speed, which helps you judge braking points."], ["What FOV for ACC?", "Use the vertical FOV from this calculator, often 30–45° on a single screen."]],
  }),
  mk({
    slug: "gsd-calculator", title: "GSD Calculator (Drone Ground Sample Distance)",
    meta: "GSD Calculator — Drone Mapping cm/pixel & Flight Altitude",
    desc: "Calculate ground sample distance (GSD) for drone mapping and photogrammetry from the camera's sensor width, focal length, image width and flight altitude, plus the photo footprint and the altitude needed for a target GSD.",
    inputs: [dd("preset", "Camera", E.DRONE_PRESETS.map(([l]) => l), 1), num("sw", "Sensor Width (mm)", 13.2, 0.1, 100, 0.01, "mm"), num("focal", "Focal Length (mm, real not 35 mm equiv.)", 8.8, 0.1, 500, 0.01, "mm"), num("iw", "Image Width (px)", 5472, 100, 100000, 1, "px"), num("ih", "Image Height (px)", 3648, 100, 100000, 1, "px"), num("alt", "Flight Altitude (m above ground)", 100, 1, 10000, 1, "m"), num("target", "Target GSD (cm/px, optional)", 2, 0, 1000, 0.01, "cm/px")],
    results: [["gsd", "GSD (cm/pixel)", "n", 3], ["inPx", "GSD (in/pixel)", "n", 3], ["foot", "Photo Footprint", "t"], ["area", "Area per Photo (ha)", "n", 2], ["alt", "Altitude for Target GSD", "t"]],
    fn: C["gsd-calculator"], ex: { preset: 1, sw: 13.2, focal: 8.8, iw: 5472, ih: 3648, alt: 100, target: 2 },
    exText: (o) => `Example: a Phantom 4 Pro at 100 m has a GSD of ${o.gsd} cm/pixel and covers ${o.foot}. For 2 cm/px, fly at ${String(o.alt).split(" for")[0]}.`,
    how: "GSD is the ground distance one pixel covers. GSD = sensor width × altitude ÷ (focal length × image width). Halve the altitude to halve the GSD (twice the detail), at the cost of four times as many photos.\n\nUse the real focal length from the camera specs or EXIF data, not the 35 mm equivalent.",
    assume: "Nadir (straight-down) photos over flat ground. Terrain height changes the real altitude above ground and so the GSD.",
    faq: [["What GSD do I need?", "1–2 cm/px for detailed inspection or survey, and 3–5 cm/px for general mapping and agriculture."], ["Does a bigger sensor give a better GSD?", "GSD depends on pixel size and focal length. More pixels across the sensor at the same focal length give a smaller GSD."]],
  }),
];

const PRICING: ToolDef[] = [
  mk({
    slug: "steam-market-fee-calculator", title: "Steam Market Fee Calculator (What You Receive After 15%)",
    meta: "Steam Market Fee Calculator — Seller Receives vs Buyer Pays",
    desc: "Work out what you receive when you sell an item on the Steam Community Market after the 5% Steam fee and the 10% game fee, or what to list it at to receive a set amount. Works for CS2, Dota 2 and TF2 skins and items.",
    inputs: [dd("mode", "Calculate", E.STEAM_MODES, 0), money("amount", "Price (buyer pays) or Amount You Want", 10), num("game", "Game Fee (%) — 10% for Valve games", 10, 0, 50, 0.1, "%")],
    results: [["receive", "You Receive", "c"], ["buyer", "Buyer Pays", "c"], ["fee", "Total Fees", "c"], ["steam", "Steam Fee (5%)", "c"], ["game", "Game Fee", "c"], ["pct", "Fees as % of Price", "p", 2]],
    fn: C["steam-market-fee-calculator"], ex: { mode: 0, amount: 10, game: 10 },
    exText: (o) => `Example: an item bought for $10.00 pays you $${Number(o.receive).toFixed(2)}, with $${Number(o.fee).toFixed(2)} in fees.`,
    how: "Steam adds two fees on top of the amount the seller receives: a 5% Steam transaction fee and a game fee set by the publisher (10% for Valve games such as CS2 and Dota 2). Each is at least $0.01 and is rounded down to the cent.\n\nSo you receive about 87% of the buyer's price. Money from sales goes to your Steam Wallet and can't be withdrawn as cash.",
    assume: "Fees in your wallet currency, rounded as Steam does. Some publishers set a different game fee, so enter it above.",
    faq: [["How much does Steam take from market sales?", "About 13% of the buyer's price (15% of what you receive): 5% to Steam plus 10% to the game for Valve titles."], ["What's the minimum price on the Steam Market?", "$0.03: you receive $0.01 plus $0.01 for each fee."]],
  }),
];

async function main() {
  const all = [...TECH, ...PRICING];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("electronics-energy-tech-calculators", TECH);
  await upsertTools("pricing-markup-seller-fee-calculators", PRICING);
}
main().catch((e) => { console.error(e); process.exit(1); });
