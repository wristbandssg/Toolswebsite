/**
 * Batch: "Arts & Entertainment Calculators" → Art, Film & Creator Income Calculators.
 *
 * Data / methods:
 *  - Streaming payouts per stream (2026 estimates from published industry analyses, editable):
 *    Spotify ≈ $0.003–0.005 (0.004), Apple Music ≈ $0.006–0.010 (0.008), YouTube Music ≈ $0.001–0.008
 *    (0.004), Amazon ≈ $0.004, Deezer ≈ $0.003–0.007 (0.0055), Tidal ≈ $0.012–0.015 (0.0135).
 *    SoundCloud and TikTok have no reliable public averages — defaults are conservative estimates.
 *    Spotify pays recording royalties only on tracks with ≥ 1,000 streams in the past 12 months.
 *  - US statutory mechanical rate 2026 (Phonorecords IV): 13.1¢ per song, or 2.52¢ per minute (or
 *    fraction) for songs over 5 minutes; 12.7¢ in 2025.
 *  - Publishing splits: writer's share 50% / publisher's share 50%; admin deals charge ~10–20% of the
 *    publisher's share; co-publishing gives the writer ~75% of total publishing income.
 *  - ASCAP restaurant/bar fees are per-occupant schedules (third-party estimates: recorded ≈ $2.3–4.0,
 *    live ≈ $5.0–6.9 per occupant, minimum ≈ $390) — editable, check ASCAP's current schedule.
 *  - Hyperfocal distance H = f² ÷ (N c) + f; depth of field near = s(H − f)/(H + s − 2f),
 *    far = s(H − f)/(H − s) (s < H). Circles of confusion: full frame 0.030 mm, APS-C 0.020,
 *    Micro Four Thirds 0.015, 1-inch 0.011, smartphone 0.004.
 *  - Sun position: NOAA solar-position equations; golden hour = sun elevation −4° to +6°,
 *    blue hour −6° to −4°, sunrise/sunset at −0.833°.
 *  - Event floor space: dancers ≈ 4.5 sq ft each; stage ≈ 20–30 sq ft per musician plus risers.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-arts-creative-calculators.ts for the copy.
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
const pct = (v: number, d = 0) => nonNeg(v, d) / 100;

// ---------- Streaming royalties ----------
/** Net to the artist after distributor fee, label/manager cut and their own split share. */
function net(gross: number, v: Record<string, number>) {
  const afterDistro = gross * (1 - pct(v.distributorFee));
  const afterLabel = afterDistro * (1 - pct(v.labelShare));
  return afterLabel * (pct(v.yourSplit, 100) || 1);
}
function platform(rateKey: string, defaultRate: number, minStreams = 0): CustomCalculator {
  return (v) => {
    const rate = nonNeg(v[rateKey], defaultRate);
    const tracks = Math.max(1, nonNeg(v.tracks, 1));
    const streams = nonNeg(v.streams);
    const perTrack = streams / tracks;
    const eligible = minStreams > 0 && perTrack < minStreams ? 0 : streams;
    const gross = eligible * rate;
    const take = net(gross, v);
    const target = nonNeg(v.targetIncome);
    const keep = take > 0 && gross > 0 ? take / gross : (1 - pct(v.distributorFee)) * (1 - pct(v.labelShare)) * (pct(v.yourSplit, 100) || 1);
    return { yourEarnings: round2(take), grossRoyalties: round2(gross), perThousandStreams: round2(rate * 1000 * keep), streamsForTarget: Math.ceil(rate * keep > 0 ? target / (rate * keep) : 0), eligibleStreams: Math.round(eligible), monthlyAtThisPace: round2(take / Math.max(1, nonNeg(v.months, 1))) };
  };
}
export const spotifyRoyalty = platform("rate", 0.004, 1000);
export const appleMusicRoyalty = platform("rate", 0.008);
export const youtubeMusicRoyalty = platform("rate", 0.004);
export const deezerRoyalty = platform("rate", 0.0055);
export const soundcloudRoyalty = platform("rate", 0.003);

export const PLATFORMS: [string, string, number][] = [["spotify", "Spotify", 0.004], ["apple", "Apple Music", 0.008], ["youtube", "YouTube Music", 0.004], ["amazon", "Amazon Music", 0.004], ["deezer", "Deezer", 0.0055], ["tidal", "Tidal", 0.0135], ["soundcloud", "SoundCloud", 0.003]];
export const royalty: CustomCalculator = (v) => {
  let gross = 0;
  let streams = 0;
  for (const [k, , r] of PLATFORMS) {
    gross += nonNeg(v[`${k}Streams`]) * nonNeg(v[`${k}Rate`], r);
    streams += nonNeg(v[`${k}Streams`]);
  }
  const take = net(gross, v);
  const blended = streams > 0 ? take / streams : 0;
  const target = nonNeg(v.targetIncome);
  return { yourEarnings: round2(take), grossRoyalties: round2(gross), totalStreams: Math.round(streams), blendedPerStream: Math.round(blended * 1e5) / 1e5, perThousandStreams: round2(blended * 1000), streamsForTarget: Math.ceil(blended > 0 ? target / blended : 0) };
};

export const tiktokRoyalty: CustomCalculator = (v) => {
  const creations = nonNeg(v.videosCreated);
  const views = nonNeg(v.views);
  const gross = creations * nonNeg(v.perCreation, 0.003) + (views / 1000) * nonNeg(v.perThousandViews, 0.02) + nonNeg(v.streamsFromTikTok) * nonNeg(v.streamRate, 0.004);
  const take = net(gross, v);
  return { yourEarnings: round2(take), grossRoyalties: round2(gross), fromVideoCreations: round2(creations * nonNeg(v.perCreation, 0.003)), fromViews: round2((views / 1000) * nonNeg(v.perThousandViews, 0.02)), fromSpilloverStreams: round2(nonNeg(v.streamsFromTikTok) * nonNeg(v.streamRate, 0.004)) };
};

export const mechanicalRoyalty: CustomCalculator = (v) => {
  const minutes = nonNeg(v.songMinutes, 3.5);
  const cents = nonNeg(v.rateCents, 13.1);
  const perMin = nonNeg(v.perMinuteCents, 2.52);
  const perUnit = minutes > 5 ? Math.max(cents, Math.ceil(minutes) * perMin) : cents;
  const units = nonNeg(v.units);
  const gross = (units * perUnit) / 100 + nonNeg(v.streams) * nonNeg(v.streamingMechanicalRate);
  const writerShare = gross * (pct(v.yourShare, 100) || 1);
  return { totalMechanicals: round2(gross), yourShare: round2(writerShare), centsPerUnit: round2(perUnit), physicalAndDownloads: round2((units * perUnit) / 100), afterAdminFee: round2(writerShare * (1 - pct(v.adminFee))) };
};

export const performanceRoyalty: CustomCalculator = (v) => {
  const gross = nonNeg(v.streams) * nonNeg(v.streamRate, 0.0008) + nonNeg(v.radioSpins) * nonNeg(v.spinRate, 2) + nonNeg(v.tvUses) * nonNeg(v.tvRate, 50) + nonNeg(v.liveShows) * nonNeg(v.liveRate, 5);
  const writer = gross * 0.5;
  const publisher = gross * 0.5;
  const share = pct(v.yourSongShare, 100) || 1;
  const selfPublished = pick(v.selfPublished, 2) === 1;
  return { yourPerformanceRoyalties: round2((writer + (selfPublished ? publisher : 0)) * share), totalCollected: round2(gross), writerShare: round2(writer * share), publisherShare: round2(publisher * share), fromStreams: round2(nonNeg(v.streams) * nonNeg(v.streamRate, 0.0008)), fromRadio: round2(nonNeg(v.radioSpins) * nonNeg(v.spinRate, 2)) };
};

export const DEALS: [string, number][] = [["Self-published (keep 100%)", 1], ["Administration deal (writer keeps 100% minus fee)", 1], ["Co-publishing deal (writer ≈ 75%)", 0.75], ["Traditional publishing deal (writer ≈ 50%)", 0.5]];
export const publishingRoyalty: CustomCalculator = (v) => {
  const gross = nonNeg(v.mechanical) + nonNeg(v.performance) + nonNeg(v.sync) + nonNeg(v.print) + nonNeg(v.other);
  const deal = pick(v.dealType, DEALS.length);
  const adminFee = deal === 1 ? pct(v.adminFee, 15) * gross * 0.5 : 0;
  const writerTotal = (gross - adminFee) * DEALS[deal][1];
  const share = pct(v.yourSongShare, 100) || 1;
  return { yourIncome: round2(writerTotal * share), totalPublishingIncome: round2(gross), publisherKeeps: round2((gross - adminFee - writerTotal) * share), adminFeePaid: round2(adminFee * share), writerShareOnly: round2(gross * 0.5 * share), effectivePercent: round2(gross > 0 ? (writerTotal / gross) * 100 : 0) };
};

export const ascapFee: CustomCalculator = (v) => {
  const occ = nonNeg(v.occupancy);
  const type = pick(v.musicType, 3); // recorded, live, both
  const rec = nonNeg(v.recordedRate, 3.2);
  const live = nonNeg(v.liveRate, 5.9) * [0.85, 1, 1.15][pick(v.liveNights, 3)];
  const perOcc = type === 0 ? rec : type === 1 ? live : rec + live * 0.6;
  const base = occ * perOcc * (pick(v.coverCharge, 2) === 1 ? 1.1 : 1);
  const fee = Math.max(nonNeg(v.minimumFee, 390), base);
  return { annualAscapFee: round2(fee), monthlyCost: round2(fee / 12), perOccupantRate: round2(perOcc), calculatedBeforeMinimum: round2(base), allThreeProsEstimate: round2(fee * 2.6) };
};

// ---------- Visual art, photography & film ----------
export const HUE_NAMES = ["Red", "Red-orange", "Orange", "Yellow-orange", "Yellow", "Yellow-green", "Green", "Spring green", "Cyan", "Azure", "Blue", "Violet", "Magenta", "Rose"];
const hueName = (h: number) => {
  const x = ((h % 360) + 360) % 360;
  const stops = [15, 30, 45, 60, 75, 100, 145, 165, 190, 220, 250, 280, 320, 345];
  const i = stops.findIndex((s) => x < s);
  return i === -1 ? 0 : i;
};
export const colorTheory: CustomCalculator = (v) => {
  const h = ((safeNumber(v.hue, 210) % 360) + 360) % 360;
  const w = (d: number) => Math.round(((h + d) % 360 + 360) % 360);
  return { baseName: hueName(h), complementary: w(180), complementaryName: hueName(w(180)), triadic1: w(120), triadic2: w(240), splitComp1: w(150), splitComp2: w(210), analogous1: w(-30), analogous2: w(30), tetradic: w(90), tetradicName: hueName(w(90)) };
};

export const muralCost: CustomCalculator = (v) => {
  const area = nonNeg(v.width) * nonNeg(v.height);
  const rate = nonNeg(v.ratePerSqFt) > 0 ? nonNeg(v.ratePerSqFt) : [15, 30, 55, 90][pick(v.complexity, 4)];
  const art = area * rate;
  const supplies = area * nonNeg(v.suppliesPerSqFt, 1.5);
  const access = nonNeg(v.equipmentDays) * nonNeg(v.equipmentRate, 250);
  const subtotal = art + supplies + access + nonNeg(v.designFee) + nonNeg(v.travel);
  const total = subtotal * (1 + pct(v.sealerPercent, 0));
  return { totalCost: round2(total), artistFee: round2(art), supplies: round2(supplies), equipmentAccess: round2(access), wallArea: round2(area), costPerSqFt: round2(area > 0 ? total / area : 0) };
};

export const SENSORS: [string, number][] = [["Full frame (35 mm)", 0.03], ["APS-C (Nikon, Sony, Fuji)", 0.02], ["APS-C (Canon)", 0.019], ["Micro Four Thirds", 0.015], ["1-inch", 0.011], ["Smartphone main camera", 0.004], ["Medium format (44 × 33)", 0.037]];
export const hyperfocal: CustomCalculator = (v) => {
  const f = nonNeg(v.focalLength, 24);
  const N = nonNeg(v.aperture, 8) || 8;
  const c = nonNeg(v.coc) > 0 ? nonNeg(v.coc) : SENSORS[pick(v.sensor, SENSORS.length)][1];
  const H = f * f / (N * c) + f; // mm
  const s = (pick(v.distanceUnit, 2) === 0 ? nonNeg(v.subjectDistance) * 304.8 : nonNeg(v.subjectDistance) * 1000);
  const near = s > 0 ? (s * (H - f)) / (H + s - 2 * f) : 0;
  const far = s > 0 && s < H ? (s * (H - f)) / (H - s) : 0;
  return { hyperfocalMeters: round2(H / 1000), hyperfocalFeet: round2(H / 304.8), nearLimitAtHyperfocalMeters: round2(H / 2000), nearLimitMeters: round2(near / 1000), farLimitMeters: round2(far / 1000), farIsInfinity: s >= H ? 1 : 0, cocUsed: c };
};

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
/** NOAA solar elevation (degrees) at a UTC time, for a day number (days since 1970-01-01 UTC). */
function solarElevation(day: number, minutesUtc: number, lat: number, lon: number) {
  const jd = day + 2440587.5 + minutesUtc / 1440;
  const t = (jd - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const cEq = Math.sin(rad(m)) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(rad(2 * m)) * (0.019993 - 0.000101 * t) + Math.sin(rad(3 * m)) * 0.000289;
  const trueLong = l0 + cEq;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime = 4 * deg(y * Math.sin(2 * rad(l0)) - 2 * e * Math.sin(rad(m)) + 4 * e * y * Math.sin(rad(m)) * Math.cos(2 * rad(l0)) - 0.5 * y * y * Math.sin(4 * rad(l0)) - 1.25 * e * e * Math.sin(2 * rad(m)));
  const trueSolar = (minutesUtc + eqTime + 4 * lon + 1440) % 1440;
  const ha = trueSolar / 4 < 0 ? trueSolar / 4 + 180 : trueSolar / 4 - 180;
  const zen = deg(Math.acos(Math.sin(rad(lat)) * Math.sin(rad(decl)) + Math.cos(rad(lat)) * Math.cos(rad(decl)) * Math.cos(rad(ha))));
  return 90 - zen;
}
/** Labels for clock results: index = minutes after midnight ÷ 5. */
export const TIME_LABELS = [...Array(289)].map((_, i) => {
  if (i === 288) return "—";
  const h = Math.floor((i * 5) / 60);
  const m = (i * 5) % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
});
export const goldenHour: CustomCalculator = (v) => {
  const day = Math.round(safeNumber(v.date));
  const lat = Math.max(-89, Math.min(89, safeNumber(v.latitude, 40.71)));
  const lon = safeNumber(v.longitude, -74.01);
  const tz = safeNumber(v.utcOffset, -5);
  const el = (localMin: number) => solarElevation(day, localMin - tz * 60, lat, lon);
  const crossing = (threshold: number, rising: boolean) => {
    for (let m = rising ? 0 : 1439; rising ? m < 720 + 300 : m > 400; m += rising ? 1 : -1) {
      const a = el(m);
      if (a >= threshold) return m;
    }
    return -1;
  };
  const idx = (m: number) => (m < 0 ? 288 : Math.round(m / 5) % 288);
  const sunrise = crossing(-0.833, true);
  const sunset = crossing(-0.833, false);
  const amEnd = crossing(6, true);
  const pmStart = crossing(6, false);
  const amBlue = crossing(-6, true);
  const pmBlue = crossing(-6, false);
  const pmGoldenEnd = crossing(-4, false);
  let maxEl = -90;
  for (let m = 0; m < 1440; m += 5) maxEl = Math.max(maxEl, el(m));
  return { eveningGoldenStart: idx(pmStart), sunset: idx(sunset), eveningBlueHourEnd: idx(pmBlue), morningBlueHourStart: idx(amBlue), sunrise: idx(sunrise), morningGoldenEnd: idx(amEnd), eveningGoldenEnd: idx(pmGoldenEnd), eveningGoldenMinutes: pmStart >= 0 && pmGoldenEnd >= 0 ? pmGoldenEnd - pmStart : 0, maxSunElevation: round2(maxEl) };
};

export const ANIMATION: [string, number][] = [["Whiteboard / explainer", 1500], ["2D motion graphics", 3500], ["2D character animation", 7000], ["3D animation (product / explainer)", 10000], ["3D character animation", 20000], ["Stop motion", 12000]];
export const animationCost: CustomCalculator = (v) => {
  const minutes = nonNeg(v.minutes, 1);
  const rate = nonNeg(v.ratePerMinute) > 0 ? nonNeg(v.ratePerMinute) : ANIMATION[pick(v.style, ANIMATION.length)][1];
  const complexity = [0.75, 1, 1.5][pick(v.complexity, 3)];
  const base = minutes * rate * complexity;
  const extras = nonNeg(v.voiceOver) + nonNeg(v.music) + nonNeg(v.script);
  const revisions = base * 0.08 * nonNeg(v.extraRevisions);
  const rush = pick(v.rush, 2) === 1 ? base * 0.25 : 0;
  const total = base + extras + revisions + rush;
  return { totalCost: round2(total), animationCost: round2(base), extras: round2(extras + revisions + rush), costPerMinute: round2(minutes > 0 ? total / minutes : 0), costPerSecond: round2(minutes > 0 ? total / (minutes * 60) : 0), productionWeeks: round2(Math.max(2, minutes * [2, 3, 4, 5, 7, 8][pick(v.style, ANIMATION.length)] * complexity)) };
};

export const movieBudget: CustomCalculator = (v) => {
  const days = nonNeg(v.shootDays, 15);
  const crew = nonNeg(v.crewSize) * nonNeg(v.crewDayRate) * days;
  const cast = nonNeg(v.castCost);
  const equip = nonNeg(v.equipmentPerDay) * days;
  const loc = nonNeg(v.locationsPerDay) * days;
  const food = (nonNeg(v.crewSize) + nonNeg(v.castSize)) * nonNeg(v.mealsPerPersonDay, 30) * days;
  const above = cast + nonNeg(v.writerDirector);
  const production = crew + equip + loc + food + nonNeg(v.artDept);
  const post = (production + above) * pct(v.postPercent, 20);
  const subtotal = above + production + post;
  const insurance = subtotal * pct(v.insurancePercent, 3);
  const contingency = subtotal * pct(v.contingencyPercent, 10);
  const total = subtotal + insurance + contingency + nonNeg(v.festivalMarketing);
  return { totalBudget: round2(total), aboveTheLine: round2(above), productionCosts: round2(production), postProduction: round2(post), insuranceAndContingency: round2(insurance + contingency), costPerShootDay: round2(days > 0 ? (production + above) / days : 0), costPerFinishedMinute: round2(nonNeg(v.runtimeMinutes) > 0 ? total / nonNeg(v.runtimeMinutes) : 0) };
};

// ---------- Live events & music business ----------
export const danceFloor: CustomCalculator = (v) => {
  const dancers = nonNeg(v.guests) * pct(v.dancingPercent, 40);
  const area = dancers * nonNeg(v.sqFtPerDancer, 4.5);
  const side = Math.sqrt(area);
  const panel = [9, 16, 4][pick(v.panelSize, 3)];
  const sidePanels = Math.ceil(side / Math.sqrt(panel));
  return { floorAreaSqFt: Math.round(area), dancersAtOnce: Math.round(dancers), squareSideFt: round2(side), panelsNeeded: Math.ceil(area / panel), squareLayoutPanels: sidePanels * sidePanels, squareLayoutSideFt: round2(sidePanels * Math.sqrt(panel)) };
};

export const pipeAndDrape: CustomCalculator = (v) => {
  const len = nonNeg(v.lengthFt, 30);
  const spacing = nonNeg(v.uprightSpacing, 10) || 10;
  const sections = Math.ceil(len / spacing);
  const uprights = sections + 1 + Math.max(0, Math.round(nonNeg(v.corners)));
  const fullness = 1 + pct(v.fullness, 100);
  const panelW = nonNeg(v.panelWidthFt, 5) || 5;
  const panels = Math.ceil((len * fullness) / panelW);
  return { uprights, crossbars: sections, bases: uprights, drapePanels: panels, fabricLinearFeet: round2(len * fullness), fabricSqFt: round2(len * fullness * nonNeg(v.heightFt, 8)), rentalCost: round2(sections * nonNeg(v.pricePerSection, 25)) };
};

export const STAGE_ACTS: [string, number][] = [["Band (per musician)", 25], ["DJ booth", 0], ["Speakers / presenters (per person)", 15], ["Dance troupe (per dancer)", 40], ["Choir (per singer)", 6], ["Theater cast (per actor)", 35]];
export const stageSize: CustomCalculator = (v) => {
  const per = STAGE_ACTS[pick(v.act, STAGE_ACTS.length)][1];
  const performers = nonNeg(v.performers, 5);
  const riser = pick(v.drumRiser, 2) === 1 ? 64 : 0;
  const dj = pick(v.act, STAGE_ACTS.length) === 1 ? 64 : 0;
  const area = (performers * per + riser + dj + nonNeg(v.extraSqFt)) * 1.15;
  const width = Math.sqrt(area * 2);
  const depth = width / 2;
  const audience = nonNeg(v.audience);
  const height = audience <= 50 ? 12 : audience <= 150 ? 18 : audience <= 400 ? 24 : audience <= 1000 ? 36 : 48;
  return { stageAreaSqFt: Math.round(area), widthFt: round2(width), depthFt: round2(depth), decks4x8: Math.ceil(area / 32), stageHeightIn: height, stepsNeeded: Math.ceil(height / 7.5) };
};

export const vividSeats: CustomCalculator = (v) => {
  const sub = nonNeg(v.ticketPrice) * nonNeg(v.quantity, 1);
  const fee = sub * pct(v.buyerFeePercent, 30);
  const total = sub + fee + nonNeg(v.deliveryFee, 2.5) + (sub + fee) * pct(v.salesTax);
  const sellerPayout = sub * (1 - pct(v.sellerFeePercent, 10));
  return { totalYouPay: round2(total), serviceFees: round2(fee + nonNeg(v.deliveryFee, 2.5)), perTicketAllIn: round2(nonNeg(v.quantity, 1) > 0 ? total / nonNeg(v.quantity, 1) : 0), feesAsPercent: round2(sub > 0 ? ((total - sub) / sub) * 100 : 0), sellerPayout: round2(sellerPayout) };
};

export const bandProfit: CustomCalculator = (v) => {
  const tickets = nonNeg(v.ticketsSold) * nonNeg(v.ticketPrice) * pct(v.doorSplit, 70);
  const merchProfit = nonNeg(v.merchSales) * (1 - pct(v.merchCostPercent, 40));
  const revenue = nonNeg(v.guarantee) + tickets + merchProfit + nonNeg(v.tips);
  const commission = (nonNeg(v.guarantee) + tickets) * pct(v.agentPercent, 10) + revenue * pct(v.managerPercent, 15);
  const travel = nonNeg(v.miles) * nonNeg(v.costPerMile, 0.7) + nonNeg(v.hotel) + nonNeg(v.food) + nonNeg(v.otherCosts);
  const profit = revenue - commission - travel;
  const members = Math.max(1, nonNeg(v.members, 4));
  return { profit: round2(profit), perMember: round2(profit / members), revenue: round2(revenue), commissions: round2(commission), expenses: round2(travel), merchProfit: round2(merchProfit), breakEvenTickets: Math.ceil(nonNeg(v.ticketPrice) * pct(v.doorSplit, 70) > 0 ? Math.max(0, travel + commission - nonNeg(v.guarantee) - merchProfit) / (nonNeg(v.ticketPrice) * pct(v.doorSplit, 70)) : 0) };
};

export const podcastIncome: CustomCalculator = (v) => {
  const downloads = nonNeg(v.downloadsPerEpisode) * nonNeg(v.episodesPerMonth, 4);
  const adRev = (downloads / 1000) * nonNeg(v.cpm, 22) * nonNeg(v.adSlots, 2) * pct(v.sellThrough, 60) * (1 - pct(v.networkShare, 30));
  const support = nonNeg(v.supporters) * nonNeg(v.supportPrice, 5) * (1 - pct(v.platformFee, 8));
  const monthly = adRev + support + nonNeg(v.otherMonthly);
  return { monthlyIncome: round2(monthly), yearlyIncome: round2(monthly * 12), adIncomeMonthly: round2(adRev), listenerSupportMonthly: round2(support), perEpisode: round2(nonNeg(v.episodesPerMonth, 4) > 0 ? monthly / nonNeg(v.episodesPerMonth, 4) : 0), monthlyDownloads: Math.round(downloads) };
};

export const artsCreativeCustomCalculators: Record<string, CustomCalculator> = {
  "spotify-royalty-calculator": spotifyRoyalty,
  "apple-music-royalties-calculator": appleMusicRoyalty,
  "youtube-music-royalty-calculator": youtubeMusicRoyalty,
  "deezer-royalties-calculator": deezerRoyalty,
  "soundcloud-royalty-calculator": soundcloudRoyalty,
  "royalty-calculator": royalty,
  "tiktok-royalty-calculator": tiktokRoyalty,
  "mechanical-royalty-calculator": mechanicalRoyalty,
  "performance-royalty-calculator": performanceRoyalty,
  "music-publishing-royalty-calculator": publishingRoyalty,
  "ascap-license-fee-calculator": ascapFee,
  "color-theory-calculator": colorTheory,
  "mural-cost-calculator": muralCost,
  "hyperfocal-length-calculator": hyperfocal,
  "golden-hour-photography-calculator": goldenHour,
  "animation-cost-calculator": animationCost,
  "movie-budget-calculator": movieBudget,
  "dance-floor-size-calculator": danceFloor,
  "pipe-and-drape-calculator": pipeAndDrape,
  "stage-size-calculator": stageSize,
  "vivid-seats-fees-calculator": vividSeats,
  "band-profit-calculator": bandProfit,
  "podcast-income-calculator": podcastIncome,
};
