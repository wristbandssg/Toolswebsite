// One-time (but safe to re-run) batch setup script: creates 19 veterinary clinical and pet toxicity
// calculators (Pets & Animals Calculators > Vet Clinical & Toxicity Calculators). Doses, thresholds and
// formulas live in src/lib/calc-engine-pets-vet.ts; examples are computed from the engine. Merged keywords
// (no separate page): Dog Toxicity, Cat Chocolate Toxicity → dog-chocolate-toxicity; Dog Garlic Toxicity →
// dog-onion-garlic-toxicity; Veterinary Salary → veterinary-production-salary.
//
// HOW TO RUN (after prisma/setup-pets-animals-category.ts --apply)
//   npx tsx prisma/create-pets-vet-calculators.ts
// or
//   npm run db:create-pets-vet-calculators

import * as E from "../src/lib/calc-engine-pets-vet";

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
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
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const yn = (key: string, label: string, def = 0) => dropdown(key, label, YESNO, def);
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const cur = (key: string, label: string, def: number, max = 10000000, step = 1) => currencyField(key, label, { default: def, max, step });
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][]; currency?: string }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  const c = s.currency ? { currency: s.currency } : {};
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Estimator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainFmt === "c" ? c : {}) },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(f === "c" ? c : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CAT = "vet-clinical-toxicity-calculators";
const NOTE = "Reference tool only, not veterinary advice. If your pet may have eaten something toxic, call your veterinarian, the ASPCA Animal Poison Control Center (888-426-4435) or Pet Poison Helpline (855-764-7661) right away — don't wait for signs. Clinical tools are aids for veterinary professionals; verify every calculation.";

const dateField = (key: string, label: string, def: number | string = "today") => ({ key, label, type: "date", required: true, default: def });
const WEIGHT = (def = 40) => [dropdown("weightUnit", "Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0), num("weight", "Weight", def, 3000, 0.1)];
const SPECIES = dropdown("species", "Species", opts(["Dog", "Cat"]), 0);
const RISK = "Risk Level (0 none · 1 mild · 2 moderate · 3 severe · 4 potentially lethal)";

const TOOLS: ToolDef[] = [
  mk({
    slug: "vet-dosage-calculator", title: "Vet Dosage Calculator (mg/kg to mL)",
    desc: "Convert any veterinary drug dose — mg/kg × body weight — into mg per dose, mL of injectable or oral liquid, tablets per dose, daily total and full-course amount.",
    meta: "Vet Calculator — Drug Dose mg/kg to mL & Tablets",
    inputs: [...WEIGHT(22), num("doseMgPerKg", "Dose (mg/kg)", 10, 1000, 0.001), num("concentration", "Liquid Concentration (mg/mL, 0 = none)", 50, 1000, 0.01), num("tabletMg", "Tablet Strength (mg, 0 = none)", 100, 5000, 0.01), num("timesPerDay", "Doses per Day", 2, 6, 1, 1), num("days", "Course Length (days)", 7, 365, 1, 1)],
    results: [["doseMg", "Dose (mg)", "n"], ["volumeMl", "Volume per Dose (mL)", "n"], ["tablets", "Tablets per Dose (nearest ¼)", "n"], ["dailyMg", "Daily Total (mg)", "n"], ["totalCourseMg", "Full Course (mg)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.vetDose, ex: { weightUnit: 0, weight: 22, doseMgPerKg: 10, concentration: 50, tabletMg: 100, timesPerDay: 2, days: 7 },
    exText: (o) => `Example: 10 mg/kg for a 22 lb (${o.weightKg} kg) patient is ${o.doseMg} mg — ${o.volumeMl} mL of a 50 mg/mL liquid or ${o.tablets} × 100 mg tablets.`,
    how: "Enter the patient's weight, the prescribed mg/kg dose and the product's strength.",
    assume: "Dose = weight (kg) × mg/kg; volume = dose ÷ concentration. Check units carefully (mg vs mcg, mg/mL vs %; 1% = 10 mg/mL).",
    faq: [["How do you calculate a vet drug dose?", "Multiply weight in kg by the mg/kg dose, then divide by the concentration in mg/mL to get mL."]],
  }),
  mk({
    slug: "veterinary-anesthesia-calculator", title: "Veterinary Anesthesia Calculator",
    desc: "Calculate a veterinary anesthetic protocol — premedication and induction drug volumes for up to four drugs (dexmedetomidine, butorphanol, ketamine, propofol, alfaxalone…) — plus intra-op fluid rate.",
    inputs: [...WEIGHT(44), SPECIES, ...[1, 2, 3, 4].flatMap((i) => [dropdown(`drug${i}`, `Drug ${i}`, opts(E.ANESTHESIA.map(([n, d, c]) => `${n} — ${d} mg/kg, ${c} mg/mL`)), [0, 1, 5, 7][i - 1]), num(`dose${i}`, `Drug ${i} Dose (mg/kg, 0 = default)`, 0, 100, 0.001), num(`conc${i}`, `Drug ${i} Concentration (mg/mL, 0 = default)`, 0, 1000, 0.01)]), dropdown("dripSet", "Drip Set", [["60 gtt/mL (micro)", 60], ["20 gtt/mL", 20], ["15 gtt/mL", 15], ["10 gtt/mL", 10]], 60)],
    results: [["ml1", "Drug 1 Volume (mL)", "n"], ["mg1", "Drug 1 Dose (mg)", "n"], ["ml2", "Drug 2 Volume (mL)", "n"], ["mg2", "Drug 2 Dose (mg)", "n"], ["ml3", "Drug 3 Volume (mL)", "n"], ["mg3", "Drug 3 Dose (mg)", "n"], ["ml4", "Drug 4 Volume (mL)", "n"], ["mg4", "Drug 4 Dose (mg)", "n"], ["fluidRateMlPerHour", "Anesthetic Fluid Rate (mL/h)", "n"], ["fluidDropsPerMinute", "Drops per Minute", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.anesthesia, ex: { weightUnit: 0, weight: 44, species: 0, drug1: 0, dose1: 0, conc1: 0, drug2: 1, dose2: 0, conc2: 0, drug3: 5, dose3: 0, conc3: 0, drug4: 7, dose4: 0, conc4: 0, dripSet: 60 },
    exText: (o) => `Example: a 44 lb (${o.weightKg} kg) dog premedicated with dexmedetomidine 5 mcg/kg (${o.ml1} mL) and butorphanol 0.2 mg/kg (${o.ml2} mL), induced with propofol up to 4 mg/kg (${o.ml3} mL to effect), runs fluids at ${o.fluidRateMlPerHour} mL/h.`,
    how: "Choose the drugs in your protocol, override doses and concentrations as needed, and draw up induction agents to effect.",
    assume: "Default doses are common published starting points for healthy (ASA I–II) patients; reduce for sick, geriatric or brachycephalic patients. Fluid rates per the 2024 AAHA Fluid Therapy Guidelines (dogs 5, cats 3 mL/kg/h).",
    faq: [["What fluid rate is used under anesthesia?", "AAHA recommends about 5 mL/kg/h for dogs and 3 mL/kg/h for cats, adjusted to the patient."]],
  }),
  mk({
    slug: "vet-emergency-drug-calculator", title: "Vet Emergency Drug Calculator (CPR)",
    desc: "Calculate veterinary CPR and emergency drug volumes by weight — epinephrine, atropine, vasopressin, lidocaine, amiodarone, naloxone, flumazenil — and defibrillation energy, per RECOVER guidelines.",
    meta: "Emergency Drug Calculator Vet — RECOVER CPR Doses",
    inputs: WEIGHT(44),
    results: [["ml0", "Epinephrine low dose 0.01 mg/kg (mL of 1 mg/mL)", "n"], ["epinephrineHighDoseMl", "Epinephrine high dose 0.1 mg/kg (mL, prolonged CPR)", "n"], ["ml1", "Atropine 0.04 mg/kg (mL of 0.54 mg/mL)", "n"], ["ml2", "Vasopressin 0.8 U/kg (mL of 20 U/mL)", "n"], ["ml3", "Lidocaine 2 mg/kg (mL of 20 mg/mL, dogs)", "n"], ["ml4", "Amiodarone 5 mg/kg (mL of 50 mg/mL)", "n"], ["ml5", "Naloxone 0.04 mg/kg (mL of 0.4 mg/mL)", "n"], ["ml6", "Flumazenil 0.01 mg/kg (mL of 0.1 mg/mL)", "n"], ["defibJoulesLow", "Defibrillation Biphasic Low (J)", "n"], ["defibJoulesHigh", "Defibrillation Biphasic High (J)", "n"], ["compressionsPerMinute", "Chest Compressions per Minute", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.emergencyDrugs, ex: { weightUnit: 0, weight: 44 },
    exText: (o) => `Example: for a 44 lb (${o.weightKg} kg) dog, low-dose epinephrine is ${o.ml0} mL of 1 mg/mL, atropine ${o.ml1} mL, and biphasic defibrillation ${o.defibJoulesLow}–${o.defibJoulesHigh} J.`,
    how: "Enter the patient's weight before an emergency and print or post the drug sheet in your crash cart.",
    assume: "RECOVER 2024 small animal CPR guidelines: epinephrine 0.01 mg/kg every other 2-minute cycle (high dose 0.1 mg/kg after prolonged CPR), vasopressin 0.8 U/kg, atropine 0.04 mg/kg, lidocaine 2 mg/kg (dogs), amiodarone 5 mg/kg; compressions 100–120/min. Verify concentrations on your stock.",
    faq: [["What is the epinephrine dose for a dog in cardiac arrest?", "0.01 mg/kg IV/IO every other 2-minute CPR cycle (RECOVER low dose)."]],
  }),
  mk({
    slug: "veterinary-fluid-rate-calculator", title: "Veterinary Fluid Rate Calculator",
    desc: "Calculate IV fluid rates for dogs and cats — maintenance, dehydration deficit replacement and ongoing losses — in mL/hour, drops per minute and seconds per drop.",
    inputs: [...WEIGHT(22), SPECIES, pct("dehydrationPercent", "Estimated Dehydration", 7, 15, 0.5), num("replaceHours", "Replace Deficit Over (hours)", 24, 48, 1, 4), num("ongoingLossesMlPerDay", "Ongoing Losses (mL/day — vomit, diarrhea)", 0, 10000, 10), dropdown("dripSet", "Drip Set", [["10 gtt/mL", 10], ["15 gtt/mL", 15], ["20 gtt/mL", 20], ["60 gtt/mL (micro)", 60]], 15)],
    results: [["totalRateMlPerHour", "Total Fluid Rate (mL/h)", "n"], ["maintenanceMlPerHour", "Maintenance (mL/h)", "n"], ["maintenanceMlPerDay", "Maintenance (mL/day)", "n"], ["deficitMl", "Dehydration Deficit (mL)", "n"], ["dropsPerMinute", "Drops per Minute", "n"], ["secondsPerDrop", "Seconds per Drop", "n"], ["first24hTotalMl", "First 24 h Total (mL)", "n"]],
    fn: E.fluidRate, ex: { weightUnit: 0, weight: 22, species: 0, dehydrationPercent: 7, replaceHours: 24, ongoingLossesMlPerDay: 0, dripSet: 15 },
    exText: (o) => `Example: a 22 lb dog that is 7% dehydrated needs ${o.maintenanceMlPerHour} mL/h maintenance plus its ${fmt(o.deficitMl, 0)} mL deficit over 24 h — ${o.totalRateMlPerHour} mL/h total.`,
    how: "Enter weight, estimated dehydration (5–12%) and how fast to replace it, plus measured ongoing losses.",
    assume: "Maintenance 132 × kg^0.75 (dogs) and 80 × kg^0.75 (cats) mL/day (AAHA). Shock boluses are separate. Reassess weight, urine output and electrolytes frequently; use lower rates in cardiac patients.",
    faq: [["How do you calculate a dog's fluid rate?", "Maintenance (132 × kg^0.75 mL/day ÷ 24) plus the dehydration deficit (% × kg × 1,000 mL) spread over the replacement time."]],
  }),
  mk({
    slug: "veterinary-cri-calculator", title: "Veterinary CRI Calculator (Constant Rate Infusion)",
    desc: "Calculate a constant rate infusion for dogs and cats — mg per hour from mcg/kg/min or mg/kg/h, drug mL per hour neat, or how much drug to add to a fluid bag at your fluid rate.",
    meta: "CRI Calculator Veterinary — Constant Rate Infusion",
    inputs: [...WEIGHT(22), dropdown("doseUnit", "Dose Unit", opts(["mcg/kg/min", "mg/kg/h"]), 0), num("dose", "Dose", 2, 1000, 0.001), num("drugConcentration", "Drug Concentration (mg/mL)", 10, 1000, 0.01), num("bagVolume", "Fluid Bag Volume (mL)", 500, 5000, 1), num("fluidRateMlPerHour", "Fluid Rate (mL/h)", 30, 1000, 0.1)],
    results: [["mgToAddToBag", "Drug to Add to Bag (mg)", "n"], ["mlOfDrugToAddToBag", "Drug to Add to Bag (mL)", "n"], ["mgPerHour", "Drug Delivered (mg/h)", "n"], ["drugMlPerHourNeat", "Drug Rate if Run Neat (mL/h)", "n"], ["bagLastsHours", "Bag Lasts (h)", "n"], ["finalConcentrationMgPerMl", "Final Bag Concentration (mg/mL)", "n"]],
    fn: E.cri, ex: { weightUnit: 0, weight: 22, doseUnit: 0, dose: 2, drugConcentration: 10, bagVolume: 500, fluidRateMlPerHour: 30 },
    exText: (o) => `Example: a 2 mcg/kg/min CRI for a 22 lb dog delivers ${o.mgPerHour} mg/h; at 30 mL/h, add ${o.mgToAddToBag} mg (${o.mlOfDrugToAddToBag} mL of 10 mg/mL) to a 500 mL bag.`,
    how: "Enter the dose, the drug's concentration and the bag and rate you'll run. Remove an equal volume of fluid from the bag before adding drug if precision matters.",
    assume: "mg/h = mcg/kg/min × kg × 60 ÷ 1,000 (or mg/kg/h × kg). If you change the fluid rate, the drug rate changes too — label the bag clearly.",
    faq: [["How do you calculate a CRI?", "Convert the dose to mg per hour, multiply by how many hours the bag will run, and add that amount to the bag."]],
  }),
  mk({
    slug: "dog-body-surface-area-calculator", title: "Dog & Cat Body Surface Area Calculator",
    desc: "Calculate body surface area (m²) for dogs and cats from weight with the veterinary BSA formula — and convert mg/m² chemotherapy doses into total mg and mg/kg.",
    meta: "Body Surface Area Calculator Dog — m² for Chemo Dosing",
    inputs: [...WEIGHT(44), SPECIES, num("doseMgPerM2", "Drug Dose (mg/m², 0 = BSA only)", 0, 10000, 0.01)],
    results: [["bodySurfaceAreaM2", "Body Surface Area (m²)", "n"], ["doseMg", "Total Dose (mg)", "n"], ["mgPerKgEquivalent", "Equivalent Dose (mg/kg)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.bsa, ex: { weightUnit: 0, weight: 44, species: 0, doseMgPerM2: 0 },
    exText: (o) => `Example: a 44 lb (${o.weightKg} kg) dog has a body surface area of about ${o.bodySurfaceAreaM2} m².`,
    how: "Enter the patient's weight and species, and the drug's mg/m² dose if converting a chemotherapy protocol.",
    assume: "BSA (m²) = K × weight(g)^(2/3) × 10⁻⁴, with K = 10.1 for dogs and 10.0 for cats. Very small dogs are over-dosed by BSA for some drugs (e.g. doxorubicin is dosed per kg under 10–15 kg).",
    faq: [["Why are chemo drugs dosed by BSA?", "Body surface area tracks metabolic rate and drug clearance better than weight across body sizes."]],
  }),
  mk({
    slug: "dog-oxygen-flow-rate-calculator", title: "Dog & Cat Oxygen Flow Rate Calculator",
    desc: "Calculate oxygen flow rates for dogs and cats by weight — nasal cannula, flow-by, face mask, non-rebreathing and rebreathing anesthesia circuits, oxygen cage — and E-cylinder duration.",
    meta: "Oxygen Flow Rate Calculator Dog — Nasal, Mask & Circuit",
    inputs: [...WEIGHT(44), dropdown("method", "Delivery Method", opts(E.O2_METHODS.map(([n, k, m]) => (k ? `${n} — ${k} mL/kg/min` : `${n} — ≥ ${m} L/min`))), 0)],
    results: [["flowLitersPerMinute", "Oxygen Flow (L/min)", "n"], ["flowMlPerMinute", "Oxygen Flow (mL/min)", "n"], ["cylinderHoursEType", "E-Cylinder Duration (h, full)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.oxygenFlow, ex: { weightUnit: 0, weight: 44, method: 0 },
    exText: (o) => `Example: nasal oxygen for a 44 lb (${o.weightKg} kg) dog runs at about ${o.flowLitersPerMinute} L/min; a full E cylinder lasts roughly ${o.cylinderHoursEType} hours.`,
    how: "Choose the delivery method and enter the patient's weight.",
    assume: "Typical rates: nasal 50–100 mL/kg/min, mask 100–200, non-rebreathing circuit 200–300 mL/kg/min, rebreathing maintenance 20–40 (minimum 0.5–1 L/min), flow-by 2–5 L/min. E cylinder ≈ 680 L.",
    faq: [["What oxygen flow rate for a dog nasal cannula?", "About 50–100 mL per kg per minute, humidified."]],
  }),
  mk({
    slug: "heartworm-treatment-calculator", title: "Heartworm Treatment Calculator (AHS Protocol)",
    desc: "Plan dog heartworm treatment with the American Heartworm Society protocol — melarsomine (Immiticide) volume per injection, doxycycline dose, injection dates, exercise restriction and retest date — plus estimated cost.",
    inputs: [...WEIGHT(50), dateField("diagnosisDate", "Diagnosis / Day 0"), cur("costBase", "Clinic Base Cost (tests, imaging, exams)", 600, 20000, 10), cur("costPerKg", "Drug Cost per kg", 25, 500, 1)],
    results: [["melarsomineMlPerInjection", "Melarsomine per Injection (mL of 25 mg/mL)", "n"], ["melarsomineMgPerInjection", "Melarsomine per Injection (mg)", "n"], ["doxycyclineMgTwiceDaily", "Doxycycline Days 1–28 (mg, twice daily)", "n"], ["firstInjectionDate", "First Melarsomine Injection (day 60)", "d"], ["secondInjectionDate", "Second Injection (day 90)", "d"], ["thirdInjectionDate", "Third Injection (day 91)", "d"], ["restrictExerciseUntil", "Strict Exercise Restriction Until", "d"], ["antigenRetestDate", "Antigen Retest (≈ 9 months after)", "d"], ["estimatedTreatmentCost", "Estimated Treatment Cost", "c"]],
    fn: E.heartworm, ex: { weightUnit: 0, weight: 50, diagnosisDate: 20759, costBase: 600, costPerKg: 25 },
    exText: (o) => `Example: a 50 lb dog needs ${o.melarsomineMlPerInjection} mL of melarsomine per injection and ${o.doxycyclineMgTwiceDaily} mg of doxycycline twice daily for the first 28 days; estimated cost about ${usd(o.estimatedTreatmentCost)}.`,
    how: "Enter the dog's weight and the diagnosis date. Your vet will tailor the plan to disease severity.",
    assume: "AHS 2024 protocol: start a macrocyclic lactone preventive and prednisone as needed on day 0, doxycycline 10 mg/kg BID days 1–28, melarsomine 2.5 mg/kg deep IM on days 60, 90 and 91, strict rest until 6–8 weeks after the last injection, antigen test 9 months later. Costs vary widely ($500–2,000+).",
    faq: [["How long does heartworm treatment take?", "About 3–4 months of treatment plus several weeks of strict rest, with a retest about 9 months after the last injection."]],
  }),
  mk({
    slug: "dog-heart-rate-calculator", title: "Dog & Cat Heart Rate Calculator",
    desc: "Check your dog's or cat's heart rate and resting breathing rate — count beats and breaths for a few seconds to get per-minute rates — compared with the normal range for size and age.",
    inputs: [dropdown("size", "Pet", opts(E.HR_RANGES.map(([n, lo, hi]) => `${n} (${lo}–${hi} bpm)`)), 2), num("beatsCounted", "Heartbeats Counted", 25, 200), dropdown("countSeconds", "Counted For", [["15 seconds", 15], ["30 seconds", 30], ["60 seconds", 60]], 15), num("breathsCounted", "Breaths Counted While Asleep / Resting", 10, 100), dropdown("breathSeconds", "Breaths Counted For", [["30 seconds", 30], ["60 seconds", 60]], 30)],
    results: [["heartRateBpm", "Heart Rate (beats per minute)", "n"], ["status", "Status (1 low · 2 normal · 3 high)", "n"], ["normalLow", "Normal Range Low", "n"], ["normalHigh", "Normal Range High", "n"], ["restingBreathsPerMinute", "Resting Breaths per Minute", "n"], ["breathingConcern", "Breathing Above 30/min (1 = call vet)", "n"]],
    fn: E.heartRate, ex: { size: 2, beatsCounted: 25, countSeconds: 15, breathsCounted: 10, breathSeconds: 30 },
    exText: (o) => `Example: 25 beats in 15 seconds is ${o.heartRateBpm} bpm — normal for a medium dog — and 10 breaths in 30 seconds while asleep is ${o.restingBreathsPerMinute} per minute.`,
    how: "Feel the heartbeat on the left chest just behind the elbow (or the femoral pulse inside the thigh) and count for 15–30 seconds. Count breaths while your pet sleeps.",
    assume: "Typical resting ranges; excitement and heat raise heart rate. A sleeping breathing rate consistently over 30 per minute in a dog with heart disease is an early sign of heart failure — call your vet.",
    faq: [["What is a normal heart rate for a dog?", "About 60–140 bpm in adults (smaller dogs faster) and up to 160+ in puppies."]],
  }),
  mk({
    slug: "veterinary-production-salary-calculator", title: "Veterinary Production & Salary Calculator",
    desc: "Calculate associate veterinarian pay under ProSal or production-based compensation — production pay, bonus over base, break-even production, negative accrual and earnings per day.",
    meta: "Veterinary Production & Salary Calculator (ProSal)",
    inputs: [cur("annualProduction", "Annual Gross Production", 700000, 10000000, 1000), pct("productionPercent", "Production Percentage", 20, 40, 0.5), cur("baseSalary", "Guaranteed Base Salary", 120000, 1000000, 500), num("daysWorked", "Days Worked per Year", 220, 365, 1, 1)],
    results: [["annualCompensation", "Annual Compensation", "c"], ["productionPay", "Production Pay", "c"], ["bonusOverBase", "Bonus over Base", "c"], ["productionToBreakEven", "Production Needed to Exceed Base", "c"], ["negativeAccrual", "Negative Accrual (shortfall)", "c"], ["productionPerDay", "Production per Day", "c"], ["earningsPerDay", "Earnings per Day", "c"]],
    fn: E.vetProduction, ex: { annualProduction: 700000, productionPercent: 20, baseSalary: 120000, daysWorked: 220 },
    exText: (o) => `Example: $700,000 of production at 20% earns ${usd(o.productionPay)} — ${usd(o.bonusOverBase)} over a $120,000 base; you need ${usd(o.productionToBreakEven)} of production to beat the base.`,
    how: "Enter your expected production (your contract defines what counts — services, products, or both), percentage and base.",
    assume: "ProSal: pay = the greater of base or production × percentage, usually reconciled quarterly. Small animal associates typically earn 18–25% of production; 2026 US median veterinarian pay is roughly $120,000–140,000.",
    faq: [["What is a good production percentage for a vet?", "About 20–25% of services is common for small animal associates."]],
  }),
  mk({
    slug: "dog-chocolate-toxicity-calculator", title: "Dog Chocolate Toxicity Calculator",
    desc: "Find out if the chocolate your dog (or cat) ate is dangerous — theobromine + caffeine dose in mg/kg by chocolate type and amount — with the risk level and when to call the vet.",
    meta: "Dog Chocolate Calculator — Is It Toxic? (Dogs & Cats)",
    inputs: [...WEIGHT(30), SPECIES, dropdown("chocolate", "Type of Chocolate", opts(E.CHOCOLATE.map(([n, m]) => `${n} (~${m} mg/oz)`)), 1), dropdown("amountUnit", "Amount Unit", opts(["Ounces", "Grams"]), 0), num("amount", "Amount Eaten", 3, 1000, 0.1)],
    results: [["riskLevel", RISK, "n"], ["doseMgPerKg", "Methylxanthine Dose (mg/kg)", "n"], ["methylxanthinesMg", "Theobromine + Caffeine Eaten (mg)", "n"], ["mildSignsAtOz", "Mild Signs Possible from (oz of this chocolate)", "n"], ["severeSignsAtOz", "Seizures Possible from (oz)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.chocolate, ex: { weightUnit: 0, weight: 30, species: 0, chocolate: 1, amountUnit: 0, amount: 3 },
    exText: (o) => `Example: a 30 lb dog that ate 3 oz of milk chocolate took in about ${o.doseMgPerKg} mg/kg — risk level ${o.riskLevel}; mild signs (vomiting, restlessness) are possible from about ${o.mildSignsAtOz} oz.`,
    how: "Choose the chocolate type (check the label's cocoa %) and estimate the most your pet could have eaten.",
    assume: "Signs in dogs: ~20 mg/kg mild (vomiting, thirst, hyperactivity), 40 mg/kg heart effects, 60 mg/kg tremors and seizures; deaths reported above ~100–200 mg/kg. Cats are more sensitive. Typical methylxanthine content per ounce varies by brand.",
    faq: [["How much chocolate is toxic to a dog?", "Problems start around 20 mg/kg of theobromine — about 1 oz of milk chocolate per 3 lb of dog, or much less for dark or baking chocolate."]],
  }),
  mk({
    slug: "dog-raisin-grape-toxicity-calculator", title: "Dog Raisin & Grape Toxicity Calculator",
    desc: "Assess how dangerous grapes or raisins are for your dog — grams per kg eaten compared with the lowest doses that have caused kidney failure — and why any amount warrants a vet call.",
    meta: "Dog Raisin Toxicity Calculator — Grapes & Raisins",
    inputs: [...WEIGHT(30), dropdown("form", "What Was Eaten", opts(["Grapes (count)", "Raisins (count)", "Grams (weighed)"]), 1), num("amount", "Number Eaten (or grams)", 10, 5000, 1), yn("gramsAreRaisins", "If grams: are they raisins / currants / sultanas?", 1)],
    results: [["callVetNow", "Call Your Vet Now (1 = yes)", "n"], ["riskLevel", RISK, "n"], ["gramsPerKg", "Amount Eaten (g/kg)", "n"], ["percentOfLowestToxicDose", "% of Lowest Reported Toxic Dose", "n"], ["gramsEaten", "Total Eaten (g)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.raisin, ex: { weightUnit: 0, weight: 30, form: 1, amount: 10, gramsAreRaisins: 1 },
    exText: (o) => `Example: 10 raisins for a 30 lb dog is ${o.gramsPerKg} g/kg — ${o.percentOfLowestToxicDose}% of the lowest dose reported to cause kidney failure. Because the reaction is unpredictable, call your vet anyway.`,
    how: "Count or weigh what was eaten. Induce vomiting only if your vet or poison control tells you to.",
    assume: "Toxicity is idiosyncratic (tartaric acid is the likely cause); some dogs are affected by very small amounts. Lowest reported toxic doses: raisins ~2.8 g/kg, grapes ~19.6 g/kg. Averages: grape ≈ 5 g, raisin ≈ 0.5 g.",
    faq: [["How many grapes are toxic to a dog?", "There is no known safe amount — even a few grapes or raisins can cause kidney failure in some dogs."]],
  }),
  mk({
    slug: "dog-onion-garlic-toxicity-calculator", title: "Dog Onion & Garlic Toxicity Calculator",
    desc: "Calculate onion or garlic toxicity in dogs and cats — fresh, cooked or powdered — as onion-equivalent percent of body weight, with risk level and the amount that causes anemia.",
    meta: "Dog Onion & Garlic Toxicity Calculator",
    inputs: [...WEIGHT(30), SPECIES, dropdown("form", "What Was Eaten", opts(E.ALLIUM.map(([n, f]) => `${n} (×${f} potency)`)), 0), dropdown("amountUnit", "Amount Unit", opts(["Grams", "Ounces"]), 0), num("amount", "Amount Eaten", 100, 10000, 1)],
    results: [["riskLevel", RISK, "n"], ["onionEquivalentPercentBodyWeight", "Onion Equivalent (% of body weight)", "n"], ["onionEquivalentGrams", "Onion Equivalent (g)", "n"], ["gramsPerKg", "Onion Equivalent (g/kg)", "n"], ["concernThresholdGrams", "Concern Threshold for This Food (g)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.onionGarlic, ex: { weightUnit: 0, weight: 30, species: 0, form: 0, amount: 100, amountUnit: 0 },
    exText: (o) => `Example: 100 g of onion eaten by a 30 lb dog is ${o.onionEquivalentPercentBodyWeight}% of body weight — risk level ${o.riskLevel}; concern starts at about ${o.concernThresholdGrams} g.`,
    how: "Choose the form (powders and garlic are much stronger) and estimate the amount. Repeated small amounts over days also add up.",
    assume: "Merck: toxicosis is consistent above 0.5% of body weight in onions eaten at once (cats are more sensitive); garlic is about 5× more potent than onion, powders far more. Anemia can appear 1–5 days later.",
    faq: [["How much onion is toxic to a dog?", "About 0.5% of body weight — roughly 70 g (half a medium onion) for a 30 lb dog."]],
  }),
  mk({
    slug: "dog-caffeine-toxicity-calculator", title: "Dog Caffeine Toxicity Calculator",
    desc: "Check whether caffeine your dog swallowed — coffee, grounds, beans, espresso, energy drinks, tea or caffeine pills — is dangerous, as mg/kg with a risk level.",
    inputs: [...WEIGHT(20), dropdown("source", "Source", opts(E.CAFFEINE.map(([n, m]) => `${n} (~${m} mg)`)), 2), num("servings", "How Many (cups, shots, tbsp, beans, pills…)", 2, 1000, 0.25)],
    results: [["riskLevel", RISK, "n"], ["doseMgPerKg", "Caffeine Dose (mg/kg)", "n"], ["caffeineMg", "Caffeine Eaten (mg)", "n"], ["mildSignsAtMg", "Mild Signs Possible from (mg)", "n"], ["lethalRangeFromMg", "Lethal Range Starts Around (mg)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.caffeine, ex: { weightUnit: 0, weight: 20, source: 2, servings: 2 },
    exText: (o) => `Example: two tablespoons of coffee grounds (${o.caffeineMg} mg) for a 20 lb dog is ${o.doseMgPerKg} mg/kg — risk level ${o.riskLevel}.`,
    how: "Choose what was eaten and how much. Caffeine pills and pre-workout powders are the most dangerous.",
    assume: "Signs from about 20 mg/kg (restlessness, vomiting), severe at 40–80 mg/kg (tremors, arrhythmias, seizures); lethal around 140–150 mg/kg. Caffeine content varies by product.",
    faq: [["How much coffee can kill a dog?", "Caffeine becomes life-threatening around 140 mg/kg — a few caffeine pills or a large amount of grounds for a small dog."]],
  }),
  mk({
    slug: "xylitol-toxicity-in-dogs-calculator", title: "Xylitol Toxicity in Dogs Calculator",
    desc: "Calculate the xylitol dose your dog ate from sugar-free gum, mints, peanut butter, candy or sweetener — g/kg with the hypoglycemia and liver-failure thresholds.",
    inputs: [...WEIGHT(20), dropdown("source", "Source", opts(E.XYLITOL_SOURCES.map(([n, g]) => `${n} (~${g} g)`)), 1), num("quantity", "Quantity Eaten", 5, 1000, 0.25), num("gramsPerItem", "Xylitol per Item from Label (g, 0 = typical)", 0, 100, 0.01)],
    results: [["riskLevel", RISK, "n"], ["doseGramsPerKg", "Xylitol Dose (g/kg)", "n"], ["xylitolGrams", "Xylitol Eaten (g)", "n"], ["hypoglycemiaAtGrams", "Low Blood Sugar Possible from (g)", "n"], ["liverFailureAtGrams", "Liver Failure Possible from (g)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.xylitol, ex: { weightUnit: 0, weight: 20, source: 1, quantity: 5, gramsPerItem: 0 },
    exText: (o) => `Example: 5 pieces of xylitol gum (~${o.xylitolGrams} g) for a 20 lb dog is ${o.doseGramsPerKg} g/kg — risk level ${o.riskLevel}. Low blood sugar can start within 30–60 minutes.`,
    how: "Check the label for grams of xylitol per piece (it may be listed as 'birch sugar' or 'sugar alcohol'). This is an emergency — head to a vet.",
    assume: "Dogs: ≥ 0.1 g/kg causes hypoglycemia, ≥ 0.5 g/kg can cause acute liver failure. Xylitol per piece of gum ranges from about 0.2 to over 1 g.",
    faq: [["How much xylitol is toxic to dogs?", "As little as 0.1 g per kg — one or two pieces of some gums for a small dog."]],
  }),
  mk({
    slug: "ibuprofen-toxicity-dogs-calculator", title: "Ibuprofen Toxicity Calculator for Dogs & Cats",
    desc: "Calculate the ibuprofen (Advil, Motrin) dose your dog or cat swallowed in mg/kg and see the risk of stomach ulcers, kidney injury and seizures.",
    inputs: [...WEIGHT(30), SPECIES, num("tablets", "Tablets Eaten", 2, 500, 0.5), num("mgPerTablet", "mg per Tablet", 200, 1000, 1, 1)],
    results: [["riskLevel", RISK, "n"], ["doseMgPerKg", "Ibuprofen Dose (mg/kg)", "n"], ["totalMg", "Total Ibuprofen (mg)", "n"], ["giUlcerAtMg", "Stomach Ulcers Possible from (mg)", "n"], ["kidneyInjuryAtMg", "Kidney Injury Possible from (mg)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.ibuprofen, ex: { weightUnit: 0, weight: 30, species: 0, tablets: 2, mgPerTablet: 200 },
    exText: (o) => `Example: two 200 mg tablets in a 30 lb dog is ${o.doseMgPerKg} mg/kg — risk level ${o.riskLevel}; kidney injury becomes likely from about ${fmt(o.kidneyInjuryAtMg, 0)} mg.`,
    how: "Count missing tablets (assume the worst) and enter the strength. Never give human NSAIDs to pets.",
    assume: "Dogs: GI signs from ~25 mg/kg, ulcers ≥ 50, kidney failure ≥ 175, seizures/coma ≥ 400 mg/kg. Cats are about twice as sensitive. Naproxen is far more toxic — use poison control.",
    faq: [["Is one Advil toxic to a dog?", "One 200 mg tablet can cause stomach problems in dogs under about 15–20 lb and is dangerous for cats."]],
  }),
  mk({
    slug: "dog-vitamin-d-toxicity-calculator", title: "Vitamin D Toxicity Calculator for Dogs",
    desc: "Calculate vitamin D (cholecalciferol) exposure from supplements, prescription capsules or rodenticides in mg/kg and IU/kg, with the risk of dangerous high calcium.",
    meta: "Vitamin D Toxicity Calculator Dog — IU & mg/kg",
    inputs: [...WEIGHT(30), dropdown("unit", "Label Lists", opts(["IU per tablet / capsule", "mg per tablet / capsule"]), 0), num("amountPerUnit", "Amount per Unit", 5000, 100000, 1), num("quantity", "Number Eaten", 10, 1000, 1)],
    results: [["riskLevel", RISK, "n"], ["doseMgPerKg", "Cholecalciferol Dose (mg/kg)", "n"], ["iuPerKg", "Dose (IU/kg)", "n"], ["totalIu", "Total Vitamin D (IU)", "n"], ["concernAtIu", "Concern Threshold for This Dog (IU)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.vitaminD, ex: { weightUnit: 0, weight: 30, unit: 0, amountPerUnit: 5000, quantity: 10 },
    exText: (o) => `Example: ten 5,000 IU capsules (${fmt(o.totalIu, 0)} IU) for a 30 lb dog is ${fmt(o.iuPerKg, 0)} IU/kg — risk level ${o.riskLevel}.`,
    how: "Check the label for IU or mg per pill (1 mg = 40,000 IU). Cholecalciferol rodent baits are far more concentrated — use poison control.",
    assume: "Hypercalcemia can occur from about 0.1 mg/kg (4,000 IU/kg); kidney failure risk rises sharply above 0.5 mg/kg. Signs may take 12–36 hours to appear.",
    faq: [["How much vitamin D is toxic to dogs?", "Around 0.1 mg per kg (4,000 IU/kg) can raise blood calcium dangerously."]],
  }),
  mk({
    slug: "bromethalin-dog-poisoning-calculator", title: "Bromethalin Rat Poison Calculator for Dogs & Cats",
    desc: "Estimate bromethalin rat-bait exposure in dogs and cats — mg/kg from grams of bait and concentration — with the risk band and the amount linked to paralytic syndrome.",
    meta: "Bromethalin Dog Survival Rate & Dose Calculator",
    inputs: [...WEIGHT(30), SPECIES, dropdown("amountUnit", "Bait Amount Unit", opts(["Grams", "Ounces"]), 0), num("amount", "Bait Eaten", 16, 5000, 0.5), num("concentrationPercent", "Bromethalin Concentration (%)", 0.01, 0.1, 0.001, 0.001)],
    results: [["riskLevel", RISK, "n"], ["doseMgPerKg", "Bromethalin Dose (mg/kg)", "n"], ["bromethalinMg", "Bromethalin Eaten (mg)", "n"], ["paralyticSyndromeAtGramsBait", "Paralytic Signs Possible from (g bait)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.bromethalin, ex: { weightUnit: 0, weight: 30, species: 0, amountUnit: 0, amount: 16, concentrationPercent: 0.01 },
    exText: (o) => `Example: one 16 g block of 0.01% bait in a 30 lb dog is ${o.doseMgPerKg} mg/kg — risk level ${o.riskLevel}.`,
    how: "Check the package's active ingredient and percentage (most US blocks are 0.01% bromethalin). Treatment works best within hours — there's no antidote.",
    assume: "Dogs: paralytic syndrome from roughly 1.75 mg/kg, convulsant syndrome above ~5 mg/kg (oral LD50 ≈ 2.4–5.6 mg/kg); cats are far more sensitive. Prognosis worsens with dose and once neurologic signs appear — survival can't be predicted precisely, so treat early.",
    faq: [["Can a dog survive bromethalin poisoning?", "Many do with early decontamination and activated charcoal; once severe neurologic signs develop the outlook is guarded."]],
  }),
  mk({
    slug: "hydrogen-peroxide-dose-for-dogs-calculator", title: "Hydrogen Peroxide Dose for Dogs Calculator",
    desc: "Calculate how much 3% hydrogen peroxide is used to make a dog vomit — 1 mL per lb up to 45 mL — in mL, teaspoons and tablespoons, only when a vet or poison control advises it.",
    meta: "Hydrogen Peroxide Dose for Dogs — How Much to Induce Vomiting",
    inputs: WEIGHT(30),
    results: [["doseMl", "3% Hydrogen Peroxide (mL)", "n"], ["doseTeaspoons", "Teaspoons", "n"], ["doseTablespoons", "Tablespoons", "n"], ["maxDoses", "Maximum Doses", "n"], ["repeatAfterMinutes", "Repeat Once If No Vomiting After (min)", "n"], ["cappedAtMaximum", "Capped at 45 mL Maximum (1 = yes)", "n"]],
    fn: E.peroxide, ex: { weightUnit: 0, weight: 30 },
    exText: (o) => `Example: a 30 lb dog would get ${o.doseMl} mL (${o.doseTablespoons} tbsp) of fresh 3% hydrogen peroxide, repeated once after 15 minutes if needed — only on veterinary advice.`,
    how: "Call a vet or poison control first — vomiting is dangerous after caustics, sharp objects, petroleum products, or in drowsy, seizing or brachycephalic dogs. Never use in cats.",
    assume: "Common guidance: 1 mL per lb (1 tsp per 5 lb) of fresh 3% peroxide, maximum 45 mL per dose, no more than two doses. It can cause stomach irritation and ulcers; vets prefer apomorphine.",
    faq: [["How much hydrogen peroxide do I give my dog to throw up?", "About 1 teaspoon per 5 lb, up to 3 tablespoons — but only after your vet or poison control says to."], ["Can I give a cat hydrogen peroxide?", "No — it can cause severe stomach ulcers in cats."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-pets-animals-category.ts --apply" first.`);

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
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
