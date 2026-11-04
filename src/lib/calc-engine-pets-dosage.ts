/**
 * Batch: "Pets & Animals Calculators" → Pet Medication Dosage Calculators.
 *
 * Every tool is built from one shared mg/kg dosing model: dose (mg) = weight (kg) × mg/kg for the
 * selected indication, converted to tablets (rounded to the nearest ¼) or mL / g of a liquid,
 * paste or granule product. Dose ranges are commonly published veterinary ranges (Plumb's
 * Veterinary Drug Handbook, product labels, Merck Veterinary Manual) and are for reference only —
 * the tools tell owners to confirm every dose with their veterinarian.
 *
 * Special cases: melatonin uses published weight bands; fish oil doses EPA + DHA in mg/kg with the
 * NRC safe upper limit 310 mg × kg^0.75.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-pets-dosage-calculators.ts for the copy.
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
const quarter = (n: number) => Math.round(n * 4) / 4;

/** [label, mg/kg low, mg/kg high, doses per day (0 = single / monthly dose)] */
export type Indication = [string, number, number, number];
export interface Drug {
  indications: Indication[];
  /** Tablet / capsule / chew strengths in mg (empty = liquid only). */
  tablets: number[];
  /** Default liquid, paste or granule concentration (mg per mL or per g). */
  liquid: number;
}

export function weightKg(v: Record<string, number>) {
  return pick(v.weightUnit, 2) === 0 ? nonNeg(v.weight) * 0.45359237 : nonNeg(v.weight);
}

export function doseTool(d: Drug): CustomCalculator {
  return (v) => {
    const kg = weightKg(v);
    const [, lo, hi, perDay] = d.indications[pick(v.indication, d.indications.length)];
    const low = kg * lo;
    const high = kg * hi;
    const strength = d.tablets.length ? d.tablets[pick(v.tabletStrength, d.tablets.length)] : 0;
    const conc = nonNeg(v.concentration) > 0 ? nonNeg(v.concentration) : d.liquid;
    const tabsLow = strength > 0 ? quarter(low / strength) : 0;
    const tabsHigh = strength > 0 ? quarter(high / strength) : 0;
    return {
      doseLowMg: round2(low),
      doseHighMg: round2(high),
      tabletsLow: tabsLow,
      tabletsHigh: tabsHigh,
      liquidLow: round2(conc > 0 ? low / conc : 0),
      liquidHigh: round2(conc > 0 ? high / conc : 0),
      dosesPerDay: perDay,
      dailyMgHigh: round2(high * Math.max(1, perDay)),
      weightKg: round2(kg),
    };
  };
}

export const DRUGS: Record<string, Drug> = {
  meloxicam: { indications: [["Day 1 loading dose", 0.2, 0.2, 1], ["Maintenance from day 2 (once daily)", 0.1, 0.1, 1]], tablets: [7.5, 15], liquid: 1.5 },
  ivermectin: { indications: [["Heartworm prevention (once monthly)", 0.006, 0.012, 0], ["Sarcoptic mange (vet-directed only)", 0.2, 0.3, 0]], tablets: [], liquid: 18.7 },
  cbd: { indications: [["Starting dose", 0.2, 0.5, 2], ["Research dose (arthritis studies)", 1, 2, 2]], tablets: [5, 10, 25], liquid: 10 },
  carprofen: { indications: [["Once daily", 4.4, 4.4, 1], ["Twice daily (split dose)", 2.2, 2.2, 2]], tablets: [25, 75, 100], liquid: 0 },
  doxycycline: { indications: [["Twice daily", 5, 5, 2], ["Once daily (tick-borne / heartworm protocol)", 10, 10, 1]], tablets: [50, 100], liquid: 10 },
  prednisone: { indications: [["Anti-inflammatory", 0.5, 1, 1], ["Immunosuppressive (vet-directed)", 2, 2, 1], ["Physiologic replacement (Addison's)", 0.1, 0.25, 1]], tablets: [1, 5, 10, 20, 50], liquid: 5 },
  fenbendazole: { indications: [["Roundworms, hookworms, whipworms (3 days)", 50, 50, 1], ["Giardia (5 days, vet-directed)", 50, 50, 1]], tablets: [], liquid: 100 },
  acepromazine: { indications: [["Dog oral tablets (travel / sedation)", 0.5, 2.2, 2], ["Dog / cat injection (vet only)", 0.01, 0.05, 1], ["Horse injection IV / IM (vet only)", 0.02, 0.05, 1]], tablets: [10, 25], liquid: 10 },
  metronidazole: { indications: [["Diarrhea / GI (standard)", 10, 15, 2], ["Anaerobic infection (vet-directed)", 15, 25, 2]], tablets: [250, 500], liquid: 50 },
  albon: { indications: [["Day 1 (loading)", 55, 55, 1], ["Day 2 onward", 27.5, 27.5, 1]], tablets: [125, 250, 500], liquid: 50 },
  trazodone: { indications: [["Situational anxiety (1–2 h before event)", 3, 5, 1], ["Daily use (vet-directed)", 2, 5, 2]], tablets: [50, 100, 150], liquid: 0 },
  alprazolam: { indications: [["Situational anxiety / noise phobia", 0.02, 0.1, 2]], tablets: [0.25, 0.5, 1], liquid: 1 },
  diphenhydramine: { indications: [["Allergies, itching, mild sedation", 2, 4, 3]], tablets: [25], liquid: 2.5 },
  clindamycin: { indications: [["Skin, wound or dental infection", 5.5, 11, 2], ["Bone / serious infection (vet-directed)", 11, 33, 2]], tablets: [25, 75, 150], liquid: 25 },
  bismuth: { indications: [["Diarrhea or upset stomach (short term)", 17.5, 17.5, 3]], tablets: [262], liquid: 17.5 },
  cetirizine: { indications: [["Allergies / itching (once daily)", 1, 1, 1]], tablets: [5, 10], liquid: 1 },
  cephalexin: { indications: [["Skin or general infection", 22, 30, 2]], tablets: [250, 500], liquid: 50 },
  dimenhydrinate: { indications: [["Motion sickness (30–60 min before travel)", 4, 8, 3]], tablets: [50], liquid: 2.5 },
  famotidine: { indications: [["Acid reducer / stomach upset", 0.5, 1, 2]], tablets: [10, 20], liquid: 8 },
  gs441524: { indications: [["Wet or dry FIP — injection", 4, 6, 1], ["Ocular FIP — injection", 8, 8, 1], ["Neurological FIP — injection", 10, 10, 1], ["Wet or dry FIP — oral tablets", 10, 12, 1]], tablets: [25, 50], liquid: 15 },
  pyrantel: { indications: [["Dogs & puppies (label dose)", 5, 10, 1], ["Cats & kittens", 20, 20, 1]], tablets: [22.7, 113.5], liquid: 4.54 },
  furosemide: { indications: [["Heart failure maintenance", 1, 2, 2], ["Acute fluid build-up (vet / hospital)", 2, 4, 3]], tablets: [12.5, 20, 40, 50], liquid: 10 },
  praziquantel: { indications: [["Tapeworms (single dose)", 5, 5, 0]], tablets: [34, 23], liquid: 56.8 },
  gabapentinCat: { indications: [["Pre-visit calming (2–3 h before)", 10, 20, 0], ["Chronic pain", 5, 10, 2]], tablets: [100], liquid: 50 },
  loratadine: { indications: [["Allergies (once daily)", 0.25, 0.5, 1]], tablets: [10], liquid: 1 },
  tramadol: { indications: [["Pain (vet-prescribed)", 2, 5, 3]], tablets: [50], liquid: 5 },
  ondansetron: { indications: [["Nausea / vomiting", 0.5, 1, 2]], tablets: [4, 8], liquid: 0.8 },
  azithromycin: { indications: [["Respiratory or general infection (once daily)", 5, 10, 1]], tablets: [250], liquid: 40 },
  loperamide: { indications: [["Diarrhea (dogs only, short term)", 0.1, 0.2, 3]], tablets: [2], liquid: 0.2 },
};

/** Melatonin weight bands (lb upper limit, mg low, mg high). */
export const MELATONIN: [number, number, number][] = [[10, 1, 1], [25, 1.5, 1.5], [100, 3, 3], [Infinity, 3, 6]];
export const melatonin: CustomCalculator = (v) => {
  const lb = weightKg(v) / 0.45359237;
  const [, lo, hi] = MELATONIN.find(([max]) => lb <= max) ?? MELATONIN[3];
  const strength = [1, 3, 5, 10][pick(v.tabletStrength, 4)];
  return { doseLowMg: lo, doseHighMg: hi, tabletsLow: quarter(lo / strength), tabletsHigh: quarter(hi / strength), liquidLow: 0, liquidHigh: 0, dosesPerDay: 3, dailyMgHigh: hi * 3, weightKg: round2(weightKg(v)) };
};

export const FISH_OIL: [string, number][] = [["Skin & coat", 50], ["General health", 40], ["Arthritis / joint support", 125], ["Heart or kidney support (vet-directed)", 60]];
export const fishOil: CustomCalculator = (v) => {
  const kg = weightKg(v);
  const target = kg * FISH_OIL[pick(v.indication, FISH_OIL.length)][1];
  const upper = 310 * Math.pow(kg, 0.75);
  const dose = Math.min(target, upper);
  const perCap = Math.max(1, nonNeg(v.epaDhaPerCapsule, 300));
  const perMl = nonNeg(v.epaDhaPerMl);
  return { epaDhaMgPerDay: Math.round(dose), capsulesPerDay: quarter(dose / perCap), mlPerDay: round2(perMl > 0 ? dose / perMl : 0), safeUpperLimitMg: Math.round(upper), cappedAtUpperLimit: target > upper ? 1 : 0, weightKg: round2(kg) };
};

export const petsDosageCustomCalculators: Record<string, CustomCalculator> = {
  "meloxicam-dog-dosage-calculator": doseTool(DRUGS.meloxicam),
  "ivermectin-for-dogs-dosage-calculator": doseTool(DRUGS.ivermectin),
  "cbd-dosage-for-dogs-calculator": doseTool(DRUGS.cbd),
  "carprofen-dosage-calculator": doseTool(DRUGS.carprofen),
  "doxycycline-for-dogs-dosage-calculator": doseTool(DRUGS.doxycycline),
  "prednisone-for-dogs-dosage-calculator": doseTool(DRUGS.prednisone),
  "panacur-fenbendazole-dosage-calculator": doseTool(DRUGS.fenbendazole),
  "acepromazine-dosage-calculator": doseTool(DRUGS.acepromazine),
  "metronidazole-for-dogs-dosage-calculator": doseTool(DRUGS.metronidazole),
  "albon-dosage-calculator": doseTool(DRUGS.albon),
  "trazodone-for-dogs-dosage-calculator": doseTool(DRUGS.trazodone),
  "alprazolam-for-dogs-dosage-calculator": doseTool(DRUGS.alprazolam),
  "benadryl-for-dogs-dosage-calculator": doseTool(DRUGS.diphenhydramine),
  "clindamycin-for-dogs-dosage-calculator": doseTool(DRUGS.clindamycin),
  "pepto-bismol-for-dogs-dosage-calculator": doseTool(DRUGS.bismuth),
  "zyrtec-for-dogs-dosage-calculator": doseTool(DRUGS.cetirizine),
  "cephalexin-for-dogs-and-cats-dosage-calculator": doseTool(DRUGS.cephalexin),
  "dramamine-for-dogs-dosage-calculator": doseTool(DRUGS.dimenhydrinate),
  "famotidine-for-dogs-dosage-calculator": doseTool(DRUGS.famotidine),
  "fip-gs-441524-dosage-calculator": doseTool(DRUGS.gs441524),
  "pyrantel-pamoate-dewormer-dosage-calculator": doseTool(DRUGS.pyrantel),
  "furosemide-for-dogs-dosage-calculator": doseTool(DRUGS.furosemide),
  "praziquantel-dosage-calculator": doseTool(DRUGS.praziquantel),
  "gabapentin-for-cats-dosage-calculator": doseTool(DRUGS.gabapentinCat),
  "melatonin-for-dogs-dosage-calculator": melatonin,
  "claritin-for-dogs-dosage-calculator": doseTool(DRUGS.loratadine),
  "tramadol-for-dogs-dosage-calculator": doseTool(DRUGS.tramadol),
  "fish-oil-for-dogs-dosage-calculator": fishOil,
  "ondansetron-for-dogs-dosage-calculator": doseTool(DRUGS.ondansetron),
  "azithromycin-for-cats-dosage-calculator": doseTool(DRUGS.azithromycin),
  "imodium-for-dogs-dosage-calculator": doseTool(DRUGS.loperamide),
};
