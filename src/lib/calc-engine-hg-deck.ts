/**
 * Batch: "House & Garden Calculators" → Deck, Fence & Stair Calculators.
 *
 * Data / methods:
 *  - Stairs (IRC R311.7): riser ≤ 7¾ in, tread ≥ 10 in, nosing ¾–1¼ in where treads are under 11 in;
 *    comfort rule 2R + T ≈ 24–25½ in. Spiral stairs (R311.7.10.1): riser ≤ 9½ in, tread ≥ 6¾ in at the
 *    walkline 12 in from the narrow edge, clear width ≥ 26 in, headroom ≥ 6 ft 6 in.
 *  - Stringer throat = board depth − R·T ÷ √(R² + T²); keep ≥ 5 in (3½ in absolute minimum).
 *  - Guards: openings must not pass a 4 in sphere (balusters < 4 in apart); guards 36 in on decks.
 *  - Deck loads: 40 psf live + 10 psf dead; footing area = load ÷ soil bearing (1,500 psf default).
 *  - Deck beam spans from bending and L/360 live-load deflection, NDS 2018 No. 2 values with wet-service
 *    factors (Fb × 0.85, E × 0.9): SYP Fb 1,000/925/800/750 by size, E 1.4M; DF-L 900, E 1.6M;
 *    Hem-fir 850, E 1.3M; SPF 875, E 1.4M; size factors 1.2/1.1/1.0 for 2×8–2×12 (not SYP).
 *  - Chain link: line posts ≤ 10 ft apart, top rail sticks 21 ft, one tension band per foot of height
 *    on terminal posts, fabric ties every 12 in on line posts and 24 in on the top rail.
 *  - Fire glass bulk density ≈ 100 lb per cu ft: pounds ≈ length × width × depth (in) ÷ 17.3
 *    (round pits: diameter² × 0.785 × depth ÷ 17.3).
 *  - Costs are typical 2026 US installed prices (editable inputs), not quotes.
 *
 * Self-contained: no imports from any other batch, per this project's established per-batch convention.
 * See prisma/create-hg-deck-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

const num = (x: number, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const pos = (x: number, d = 0) => Math.max(0, num(x, d));
const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const spread = (t: number) => ({ costLow: r2(t * 0.85), costHigh: r2(t * 1.25) });
const DEG = 180 / Math.PI;

// ---------- Stairs ----------
function stairCore(totalRise: number, maxRiser: number, tread: number) {
  const risers = Math.max(1, ceil(totalRise / Math.max(4, maxRiser)));
  const riser = totalRise / risers;
  const treads = risers - 1;
  return { risers, riser, treads, run: treads * tread };
}
export const STAIR_COMFORT = ["Steep — 2R + T below 24 in", "Comfortable — 2R + T between 24 and 25.5 in", "Shallow — 2R + T above 25.5 in", "Over the code — riser above 7¾ in"];
export const stair: CustomCalculator = (v) => {
  const s = stairCore(pos(v.totalRise, 108), pos(v.targetRiser, 7.5), pos(v.tread, 10.5));
  const twoRT = 2 * s.riser + pos(v.tread, 10.5);
  return { risers: s.risers, riserHeight: r2(s.riser), treads: s.treads, totalRun: r1(s.run), angleDeg: r1(Math.atan(s.riser / pos(v.tread, 10.5)) * DEG), comfort: s.riser > 7.75 ? 3 : twoRT < 24 ? 0 : twoRT <= 25.5 ? 1 : 2, twoRPlusT: r2(twoRT) };
};

export const stairStringer: CustomCalculator = (v) => {
  const s = stairCore(pos(v.totalRise, 54), 7.75, pos(v.tread, 10));
  const lenIn = Math.sqrt(pos(v.totalRise, 54) ** 2 + (s.run + pos(v.tread, 10)) ** 2);
  const throat = pos(v.boardDepth, 11.25) - (s.riser * pos(v.tread, 10)) / Math.sqrt(s.riser ** 2 + pos(v.tread, 10) ** 2);
  return { risers: s.risers, riserHeight: r2(s.riser), treads: s.treads, totalRun: r1(s.run), stringerLengthFt: r2(lenIn / 12), boardLengthFt: Math.ceil(lenIn / 12 / 2) * 2, stringers: ceil(pos(v.stairWidth, 36) / 16) + 1, throatIn: r2(throat) };
};

export const deckStair: CustomCalculator = (v) => {
  const tread = 2 * 5.5 + 0.25;
  const s = stairCore(pos(v.deckHeight, 30), 7.5, tread);
  const width = pos(v.stairWidth, 48);
  return { steps: s.risers, riserHeight: r2(s.riser), treads: s.treads, totalRunIn: r1(s.run), stringers: ceil(width / 16) + 1, treadBoards: s.treads * 2, landingPadSqFt: r1((width / 12 + 1) * 3.5), stringerLengthFt: r2(Math.sqrt(pos(v.deckHeight, 30) ** 2 + (s.run + tread) ** 2) / 12) };
};

export const stairLanding: CustomCalculator = (v) => {
  const tread = pos(v.tread, 10.5);
  const s = stairCore(pos(v.totalRise, 108), 7.5, tread);
  const r1n = Math.max(1, Math.min(s.risers - 1, Math.round(pos(v.risersBeforeLanding) || s.risers / 2)));
  const r2n = s.risers - r1n;
  const run1 = (r1n - 1) * tread, run2 = (r2n - 1) * tread;
  return { risers: s.risers, riserHeight: r2(s.riser), flight1Risers: r1n, flight2Risers: r2n, flight1Run: r1(run1), flight2Run: r1(run2), landingHeight: r2(r1n * s.riser), straightRunTotal: r1(run1 + pos(v.landingDepth, 36) + run2) };
};

export const STAIR_ANGLES = ["Ramp territory (under 20°) — use a ramp or long steps", "Gentle stairs (20–30°)", "Ideal stairs (30–37°)", "Steep stairs (37–42°) — allowed only near the IRC limit", "Ship's ladder / ladder (over 42°)"];
export const stairAngle: CustomCalculator = (v) => {
  const a = Math.atan(pos(v.rise, 7.5) / Math.max(0.01, pos(v.run, 10))) * DEG;
  return { angleDeg: r1(a), category: a < 20 ? 0 : a < 30 ? 1 : a <= 37 ? 2 : a <= 42 ? 3 : 4, slopePercent: r1((pos(v.rise, 7.5) / Math.max(0.01, pos(v.run, 10))) * 100), handrailAngleDeg: r1(a) };
};

export const stairTread: CustomCalculator = (v) => {
  const n = Math.max(1, Math.round(pos(v.treads, 13)));
  const depth = pos(v.treadDepth, 10.5) + pos(v.nosing, 1), w = pos(v.width, 36);
  const bf = (n * depth * w * pos(v.thickness, 1)) / 144;
  return { treadSizeIn: r2(depth), treads: n, linearFeet: r1((n * w) / 12), boardFeet: r1(bf), riserBoards: n + 1, cost: r2(n * pos(v.pricePerTread)) };
};

export const spiralStaircase: CustomCalculator = (v) => {
  const H = pos(v.floorHeight, 108), D = [48, 60, 72][pick(v.diameter, 3)], rot = [270, 300, 360][pick(v.rotation, 3)];
  const risers = ceil(H / 9.5), riser = H / risers, treads = risers - 1;
  const deg = rot / risers;
  const walk = Math.min(D / 2, 12 + 2.5);
  const walkDepth = (2 * Math.PI * walk * deg) / 360;
  return { risers, riserHeight: r2(riser), treads, degreesPerTread: r1(deg), walklineTreadIn: r2(walkDepth), compliant: walkDepth >= 6.75 && riser <= 9.5 && D >= 52 ? 1 : 0, openingIn: D + 2 };
};
export const SPIRAL_OK = ["Check — tread or width may be under the IRC spiral-stair minimums", "Meets the IRC spiral-stair minimums used here"];

// ---------- Deck structure ----------
const DEPTH = [7.25, 9.25, 11.25];
const SYPFB = [925, 800, 750];
export const BEAMS = ["2-ply 2×8", "2-ply 2×10", "2-ply 2×12", "3-ply 2×10", "3-ply 2×12"];
const BEAM_PLY = [2, 2, 2, 3, 3], BEAM_D = [0, 1, 2, 1, 2];
export const SPECIES = ["Southern yellow pine No. 2", "Douglas fir-larch No. 2", "Hem-fir No. 2", "Spruce-pine-fir No. 2"];
const FB = [0, 900, 850, 875], CF = [1.2, 1.1, 1.0], EM = [1.4e6, 1.6e6, 1.3e6, 1.4e6];
export const deckBeamSpan: CustomCalculator = (v) => {
  const b = pick(v.beam, 5), sp = pick(v.species, 4), di = BEAM_D[b];
  const d = DEPTH[di], bw = 1.5 * BEAM_PLY[b];
  const S = (bw * d * d) / 6, I = (bw * d ** 3) / 12;
  const Fb = (sp === 0 ? SYPFB[di] : FB[sp] * CF[di]) * 0.85;
  const E = EM[sp] * 0.9;
  const trib = pos(v.joistSpan, 12) / 2 + pos(v.cantilever);
  const wT = 50 * trib, wL = 40 * trib; // lb/ft
  const Lb = Math.sqrt((8 * Fb * S) / 12 / wT);
  const Ld = Math.pow((384 * E * I) / (5 * (wL / 12) * 360), 1 / 3) / 12;
  const L = Math.min(Lb, Ld);
  return { maxSpanFt: r2(L), feet: Math.floor(L), inches: Math.round((L - Math.floor(L)) * 12), posts: ceil(pos(v.deckLength, 16) / Math.max(1, L)) + 1, tributaryFt: r2(trib) };
};

export const deckFooting: CustomCalculator = (v) => {
  const span = pos(v.joistSpan, 12), postSp = pos(v.postSpacing, 8);
  const trib = pick(v.support, 2) === 0 ? span / 2 : span / 2 + pos(v.cantilever);
  const load = 50 * trib * postSp;
  const area = load / Math.max(500, pos(v.soilBearing, 1500));
  const dia = Math.sqrt((area * 4) / Math.PI) * 12;
  const posts = (ceil(pos(v.deckLength, 16) / Math.max(1, postSp)) + 1) * Math.max(1, Math.round(pos(v.beams, 1)));
  const footDia = Math.max(12, Math.ceil(dia / 2) * 2);
  const depth = Math.max(12, pos(v.frostDepth, 36));
  const cuFt = (Math.PI * (footDia / 24) ** 2 * depth) / 12;
  return { footingDiameterIn: footDia, loadPerFootingLb: Math.round(load), footings: posts, bagsPerFooting: ceil(cuFt / 0.6), totalBags: posts * ceil(cuFt / 0.6), depthIn: depth };
};

export const deckBoardSpacing: CustomCalculator = (v) => {
  const W = pos(v.deckWidth, 12) * 12, bw = pos(v.boardWidth, 5.5), gap = pick(v.moisture, 2) === 1 ? 0 : pos(v.gap, 0.1875);
  const n = Math.max(1, Math.floor((W + gap) / (bw + gap)));
  const lastRip = W - n * (bw + gap);
  const evenGap = n > 1 ? (W - n * bw) / (n - 1) : 0;
  return { boards: n + (lastRip > 0.5 ? 1 : 0), gapIn: r2(gap), lastBoardRipIn: r2(Math.max(0, lastRip)), evenGapIn: r2(Math.max(0, evenGap)), sqFt: r1((W / 12) * pos(v.deckLength, 16)) };
};

export const underDeckDrainage: CustomCalculator = (v) => {
  const a = pos(v.length, 16) * pos(v.width, 12);
  const joists = Math.floor((pos(v.length, 16) * 12) / pos(v.joistSpacing, 16)) + 1;
  return { troughs: Math.max(0, joists - 1), troughLengthFt: r1(pos(v.width, 12)), gutterFeet: Math.ceil(pos(v.length, 16)), downspouts: ceil(pos(v.length, 16) / 20), cost: r2(a * pos(v.ratePerSqFt, 5)) };
};

export const shedRamp: CustomCalculator = (v) => {
  const ratio = [12, 8, 6, 4][pick(v.slope, 4)];
  const H = pos(v.height, 12), run = H * ratio;
  const len = Math.sqrt(H * H + run * run);
  return { runIn: r1(run), rampLengthIn: r1(len), angleDeg: r1(Math.atan(1 / ratio) * DEG), runners: ceil(pos(v.width, 48) / 16) + 1, deckBoards: ceil(len / 5.75) };
};

// ---------- Fences ----------
export const fencePicket: CustomCalculator = (v) => {
  const L = pos(v.length, 100) * 12, ps = pos(v.postSpacing, 8) * 12, pw = pos(v.postWidth, 3.5);
  const sections = ceil(L / ps);
  const net = L - (sections + 1) * pw;
  const pickets = ceil(Math.max(0, net) / (pos(v.picketWidth, 5.5) + pos(v.gap, 0.5)) * 1.05);
  const rails = sections * Math.max(2, Math.round(pos(v.rails, 2)));
  return { pickets, sections, posts: sections + 1, rails, fasteners: pickets * Math.max(2, Math.round(pos(v.rails, 2))) * 2, picketsPerSection: ceil(pickets / Math.max(1, sections)) };
};

export const boardOnBoardFence: CustomCalculator = (v) => {
  const L = pos(v.length, 100) * 12, w = pos(v.picketWidth, 5.5), ov = pos(v.overlap, 1);
  const gap = Math.max(0, w - 2 * ov);
  const front = ceil(L / (w + gap)), back = front;
  const sections = ceil(L / (pos(v.postSpacing, 8) * 12));
  const rails = sections * (pos(v.height, 6) >= 6 ? 3 : 2);
  return { pickets: ceil((front + back) * 1.05), frontPickets: front, backPickets: back, gapIn: r2(gap), posts: sections + 1, rails };
};

export const fencePost: CustomCalculator = (v) => {
  const sections = ceil(pos(v.length, 150) / Math.max(1, pos(v.spacing, 8)));
  const gates = Math.round(pos(v.gates));
  const posts = sections + 1 + Math.round(pos(v.corners)) + gates;
  const gw = pos(v.gateWidth, 4);
  return { posts, linePosts: Math.max(0, posts - 2 - Math.round(pos(v.corners)) - gates * 2), sections, gatePostSize: gw <= 4 ? 0 : gw <= 6 ? 1 : 2 };
};
export const GATE_POSTS = ["4×4 posts are fine (gate up to 4 ft)", "Use 6×6 gate posts (gate 4–6 ft)", "Use 6×6 or steel posts with a cane bolt / wheel (over 6 ft)"];

export const fencePostDepth: CustomCalculator = (v) => {
  const h = pos(v.height, 6) * 12;
  const depth = Math.max(24, h / 2, pos(v.frostDepth));
  const pw = pos(v.postWidth, 3.5), dia = pw * 3;
  const cuFt = (Math.PI * (dia / 24) ** 2 * (depth / 12)) - ((pw / 12) ** 2) * (depth / 12);
  const total = (h + depth) / 12;
  return { depthIn: Math.ceil(depth), holeDiameterIn: r1(dia), postLengthFt: [8, 10, 12, 14, 16].find((x) => x >= total) ?? Math.ceil(total), bagsPerHole: ceil((cuFt * 0.85) / 0.6), gravelInches: 6 };
};

export const chainLinkFence: CustomCalculator = (v) => {
  const L = pos(v.length, 150), gates = Math.round(pos(v.gates, 1)), corners = Math.round(pos(v.corners, 2));
  const fabric = Math.max(0, L - gates * pos(v.gateWidth, 4));
  const terminals = 2 + corners + gates * 2;
  const line = Math.max(0, ceil(fabric / 10) - 1 - corners);
  const H = pos(v.height, 4);
  return { fabricFt: Math.ceil(fabric * 1.03), linePosts: line, terminalPosts: terminals, topRailSticks: ceil(fabric / 21 * 1.05), tensionBars: terminals + corners, tensionBands: (terminals + corners) * Math.round(H - 1), ties: Math.round(line * H + fabric / 2), concreteBags: (line + terminals) * 2 };
};

export const vinylFence: CustomCalculator = (v) => {
  const L = pos(v.length, 150), pw = [6, 8][pick(v.panel, 2)];
  const gates = Math.round(pos(v.gates, 1)), corners = Math.round(pos(v.corners, 2));
  const panels = ceil(Math.max(0, L - gates * pos(v.gateWidth, 4)) / pw);
  const posts = panels + 1 + corners + gates;
  return { panels, posts, postCaps: posts, concreteBags: posts * 2, gates };
};

export const railing: CustomCalculator = (v) => {
  const L = pos(v.length, 40) * 12, ps = pos(v.postSpacing, 6) * 12;
  const sections = ceil(L / ps);
  const posts = sections + 1 + Math.round(pos(v.corners));
  const clear = ps - 3.5;
  const bw = pos(v.balusterWidth, 1.5);
  const perSection = ceil((clear - 3.9) / (bw + 3.9));
  return { posts, sections, balusters: perSection * sections, railFeet: Math.ceil((L / 12) * 2), cost: r2((L / 12) * pos(v.pricePerFoot, 35)) };
};

export const balusterSpacing: CustomCalculator = (v) => {
  const L = pos(v.railLength, 72), w = pos(v.balusterWidth, 1.5), g = Math.min(pos(v.maxGap, 3.875), 3.999);
  const n = Math.max(0, ceil((L - g) / (w + g)));
  const gap = (L - n * w) / (n + 1);
  return { balusters: n, actualGapIn: r2(gap), onCenterIn: r2(gap + w), totalBalusters: n * Math.max(1, Math.round(pos(v.sections, 1))) };
};

export const gateBrace: CustomCalculator = (v) => {
  const W = pos(v.gateWidth, 42), H = Math.max(0, pos(v.railSpacing, 48) - pos(v.railWidth, 3.5));
  const len = Math.sqrt(W * W + H * H);
  const a = Math.atan2(H, W) * DEG;
  return { braceLengthIn: r2(len), braceAngleDeg: r1(a), cutAngleDeg: r1(90 - a) };
};

// ---------- Costs ----------
const CHAIN_RATE = [16, 20, 25];
export const chainLinkFenceCost: CustomCalculator = (v) => {
  const L = pos(v.length, 150);
  const total = L * CHAIN_RATE[pick(v.height, 3)] * (pick(v.coating, 2) ? 1.25 : 1) + pos(v.walkGates) * 300 + pos(v.driveGates) * 600 + (pick(v.slats, 2) ? L * 4 : 0) + (pick(v.removal, 2) ? L * 3 : 0);
  return { totalCost: r2(total), ...spread(total), perFoot: L ? r2(total / L) : 0 };
};

function fenceCost(rates: number[][], walk: number, drive: number): CustomCalculator {
  return (v) => {
    const L = pos(v.length, 150);
    const total = L * (pos(v.customRate) || rates[pick(v.style, rates.length)][pick(v.height, 3)]) + pos(v.walkGates) * walk + pos(v.driveGates) * drive + (pick(v.removal, 2) ? L * 3 : 0);
    return { totalCost: r2(total), ...spread(total), perFoot: L ? r2(total / L) : 0 };
  };
}
export const VINYL_STYLES = ["Picket", "Privacy", "Ranch rail (2–3 rail)"];
export const vinylFenceCost = fenceCost([[22, 26, 30], [28, 32, 36], [14, 16, 18]], 450, 1500);
export const METAL_STYLES = ["Aluminum", "Steel / ornamental", "Wrought iron"];
export const metalFenceCost = fenceCost([[28, 32, 38], [32, 38, 45], [45, 55, 65]], 500, 2500);
export const COMPOSITE_STYLES = ["Composite privacy", "Composite semi-privacy"];
export const compositeFenceCost = fenceCost([[45, 55, 65], [40, 48, 58]], 600, 2000);
export const POOL_FENCES = ["Removable mesh", "Aluminum", "Vinyl", "Wrought iron", "Frameless glass"];
const POOL_RATE = [20, 35, 30, 55, 150];
export const poolFenceCost: CustomCalculator = (v) => {
  const L = pos(v.length, 120);
  const total = L * (pos(v.customRate) || POOL_RATE[pick(v.type, 5)]) + Math.max(1, pos(v.gates, 1)) * 600;
  return { totalCost: r2(total), ...spread(total), perFoot: L ? r2(total / L) : 0 };
};

export const GATES = ["Wood walk gate", "Vinyl walk gate", "Chain link walk gate", "Aluminum walk gate", "Wood double drive gate", "Vinyl double drive gate", "Aluminum double drive gate", "Wrought iron driveway gate"];
const GATE_RATE = [350, 450, 250, 500, 1200, 1500, 2000, 3500];
export const gateCost: CustomCalculator = (v) => {
  const total = Math.max(1, pos(v.count, 1)) * GATE_RATE[pick(v.gate, GATE_RATE.length)] + (pick(v.opener, 2) ? 2000 : 0);
  return { totalCost: r2(total), ...spread(total) };
};

export const deckRepairCost: CustomCalculator = (v) => {
  const total = pos(v.boards) * 40 + pos(v.joists) * 150 + pos(v.railingFeet) * 40 + pos(v.posts) * 400 + (pick(v.stairs, 2) ? 1500 : 0) + pos(v.inspection, 250);
  return { totalCost: r2(total), ...spread(total) };
};

export const deckStainingCost: CustomCalculator = (v) => {
  const a = pos(v.area, 300);
  const total = Math.max(400, a * (pos(v.rate, 3) + (pick(v.prep, 2) ? 1 : 0)) * (pick(v.stain, 2) ? 1.15 : 1) + pos(v.railingFeet) * 5 + pos(v.stairs) * 50);
  return { totalCost: r2(total), ...spread(total), perSqFt: a ? r2(total / a) : 0 };
};

export const STAIN_TYPES = ["Transparent / toner", "Semi-transparent", "Solid stain", "Deck paint / resurfacer"];
const STAIN_COV = [250, 200, 150, 75];
export const stain: CustomCalculator = (v) => {
  const isFence = pick(v.mode, 2) === 1;
  const area = isFence ? pos(v.length, 100) * pos(v.width, 6) * Math.max(1, Math.round(pos(v.sides, 1))) : pos(v.length, 16) * pos(v.width, 12) + pos(v.railingFeet) * 3;
  const gal = (area * Math.max(1, pos(v.coats, 2))) / STAIN_COV[pick(v.stain, 4)] * (pick(v.rough, 2) ? 1.3 : 1);
  return { gallons: r1(gal), area: Math.round(area), oneGallonCans: ceil(gal), fiveGallonPails: ceil(gal / 5) };
};

export const PORCH_TYPES = ["Open porch (deck-style)", "Covered porch (with roof)", "Screened porch", "Enclosed three-season porch"];
const PORCH_RATE = [35, 70, 90, 150];
export const porchCost: CustomCalculator = (v) => {
  const a = pos(v.depth, 8) * pos(v.width, 20);
  const total = a * (pos(v.customRate) || PORCH_RATE[pick(v.type, 4)]) + pos(v.railingFeet) * 35 + pos(v.steps) * 150;
  return { totalCost: r2(total), ...spread(total), area: Math.round(a), perSqFt: a ? r2(total / a) : 0 };
};

export const STAIRCASES = ["Straight, basic wood", "Straight, carpeted", "Straight, hardwood", "L- or U-shaped with landing", "Spiral (kit, installed)", "Floating / custom"];
const STAIRCASE_RATE = [2500, 3500, 6000, 8000, 5000, 15000];
export const staircaseCost: CustomCalculator = (v) => {
  const total = STAIRCASE_RATE[pick(v.type, STAIRCASE_RATE.length)] * Math.max(0.5, pos(v.floorHeight, 9) / 9) + pos(v.railingFeet) * pos(v.railingPerFoot, 60);
  return { totalCost: r2(total), ...spread(total) };
};

export const AWNINGS = ["Fixed fabric", "Retractable (manual)", "Retractable (motorized)", "Aluminum / metal", "Polycarbonate or glass"];
const AWNING_RATE = [25, 35, 55, 30, 60];
export const awningCost: CustomCalculator = (v) => {
  const a = pos(v.width, 12) * pos(v.projection, 10);
  const total = a * AWNING_RATE[pick(v.type, 5)] + pos(v.install, 500);
  return { totalCost: r2(total), ...spread(total), area: Math.round(a), projectionMinFt: r1((pos(v.windowHeight) / 12) / 3), projectionMaxFt: r1((pos(v.windowHeight) / 12) / 2) };
};

export const GAZEBO_SIZES = ["8 × 8 ft (2–4 people, benches)", "10 × 10 ft (table for 4)", "12 × 12 ft (table for 6 or lounge set)", "12 × 16 ft (table for 8, or hot tub)", "14 × 20 ft or larger (big dining / entertaining)"];
export const gazeboSize: CustomCalculator = (v) => {
  const people = pos(v.people, 6);
  let a = people * 15 + [0, 50, 90][pick(v.furniture, 3)] + (pick(v.hotTub, 2) ? 100 : 0) + (pick(v.grill, 2) ? 30 : 0);
  a = Math.max(64, a);
  const size = a <= 64 ? 0 : a <= 100 ? 1 : a <= 144 ? 2 : a <= 192 ? 3 : 4;
  return { recommendedSqFt: Math.round(a), size, squareSideFt: Math.ceil(Math.sqrt(a)) };
};

export const firePitGlass: CustomCalculator = (v) => {
  const round = pick(v.shape, 2) === 0;
  const areaSqIn = round ? pos(v.diameter, 36) ** 2 * 0.785 : pos(v.lengthIn, 36) * pos(v.widthIn, 12);
  const depth = pos(v.depth, 4) - (pick(v.filler, 2) ? Math.max(0, pos(v.depth, 4) - 1.5) : 0);
  const lb = (areaSqIn * depth) / 17.28; // ≈ 100 lb per cu ft bulk
  return { pounds: Math.ceil(lb), bags10lb: ceil(lb / 10), cost: r2(Math.ceil(lb) * pos(v.pricePerLb, 4)), glassDepthIn: r2(depth) };
};

export const PERGOLA_BEAMS = ["2-ply 2×8 (posts up to 8 ft apart)", "2-ply 2×10 (up to 10 ft)", "2-ply 2×12 (up to 12 ft)", "Over 12 ft — use a larger timber (e.g. 6×10) or steel, engineered"];
export const pergola: CustomCalculator = (v) => {
  const L = pos(v.length, 12), W = pos(v.width, 12), oh = pos(v.overhang, 1);
  const sp = Math.max(1, pos(v.postSpacing, 10));
  const postsPerSide = ceil(L / sp) + 1;
  const rafters = Math.floor((L * 12) / pos(v.rafterSpacing, 16)) + 1;
  const slats = Math.floor((W * 12) / pos(v.slatSpacing, 12)) + 1;
  return { posts: postsPerSide * 2, beamBoards: 4, beamLengthFt: r1(L + 2 * oh), rafters, rafterLengthFt: r1(W + 2 * oh), topSlats: slats, beamSize: sp <= 8 ? 0 : sp <= 10 ? 1 : sp <= 12 ? 2 : 3, concreteBags: postsPerSide * 2 * 3 };
};

export const BALCONIES = ["Wood or composite (deck-style)", "Prefab steel / bolt-on", "Cantilevered concrete", "Juliet balcony (railing only)"];
export const balconyCost: CustomCalculator = (v) => {
  const t = pick(v.type, 4), a = pos(v.depth, 5) * pos(v.width, 10);
  const railing = (t === 3 ? pos(v.width, 10) : pos(v.width, 10) + 2 * pos(v.depth, 5)) * [40, 60, 200][pick(v.railing, 3)];
  const total = (t === 3 ? 2500 : a * [60, 100, 150][t]) + railing + pos(v.engineering, 1500);
  return { totalCost: r2(total), ...spread(total), area: Math.round(a) };
};

export const hgDeckCustomCalculators: Record<string, CustomCalculator> = {
  "stair-calculator": stair,
  "stair-stringer-calculator": stairStringer,
  "deck-stair-calculator": deckStair,
  "stair-landing-calculator": stairLanding,
  "stair-angle-calculator": stairAngle,
  "stair-tread-calculator": stairTread,
  "spiral-staircase-calculator": spiralStaircase,
  "deck-beam-span-calculator": deckBeamSpan,
  "deck-footing-calculator": deckFooting,
  "deck-board-spacing-calculator": deckBoardSpacing,
  "under-deck-drainage-calculator": underDeckDrainage,
  "shed-ramp-calculator": shedRamp,
  "fence-picket-calculator": fencePicket,
  "board-on-board-fence-calculator": boardOnBoardFence,
  "fence-post-calculator": fencePost,
  "fence-post-depth-calculator": fencePostDepth,
  "chain-link-fence-calculator": chainLinkFence,
  "vinyl-fence-calculator": vinylFence,
  "railing-calculator": railing,
  "baluster-spacing-calculator": balusterSpacing,
  "gate-brace-calculator": gateBrace,
  "chain-link-fence-cost-calculator": chainLinkFenceCost,
  "vinyl-fence-cost-calculator": vinylFenceCost,
  "metal-fence-cost-calculator": metalFenceCost,
  "composite-fence-cost-calculator": compositeFenceCost,
  "pool-fence-cost-calculator": poolFenceCost,
  "gate-cost-calculator": gateCost,
  "deck-repair-cost-calculator": deckRepairCost,
  "deck-staining-cost-calculator": deckStainingCost,
  "stain-calculator": stain,
  "porch-cost-calculator": porchCost,
  "staircase-cost-calculator": staircaseCost,
  "awning-cost-calculator": awningCost,
  "gazebo-size-calculator": gazeboSize,
  "fire-glass-calculator": firePitGlass,
  "pergola-calculator": pergola,
  "balcony-cost-calculator": balconyCost,
};
