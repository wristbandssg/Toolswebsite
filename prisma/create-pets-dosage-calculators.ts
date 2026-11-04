// One-time (but safe to re-run) batch setup script: creates 31 pet medication dosage calculators
// (Pets & Animals Calculators > Pet Medication Dosage Calculators). Dose ranges and the shared mg/kg
// model live in src/lib/calc-engine-pets-dosage.ts; examples are computed from the engine. Merged keywords
// (no separate page): Fenbendazole for Cats → panacur-fenbendazole; CBD Oil for Cats → cbd-dosage;
// Cephalexin for Cats → cephalexin; Ace Dosage for Horses → acepromazine; How Much Dewormer to Give a
// Puppy → pyrantel-pamoate-dewormer.
/* eslint-disable @typescript-eslint/no-unused-vars -- shared helper block; not every batch uses every helper */
//
// HOW TO RUN (after prisma/setup-pets-animals-category.ts --apply)
//   npx tsx prisma/create-pets-dosage-calculators.ts
// or
//   npm run db:create-pets-dosage-calculators

import * as E from "../src/lib/calc-engine-pets-dosage";

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

const CAT = "pet-medication-dosage-calculators";
const NOTE = "This is a reference calculator, not veterinary advice — always confirm the dose, frequency and suitability with your veterinarian, follow the product label, and never give human medicines that contain xylitol, acetaminophen, decongestants or other added ingredients.";

const WEIGHT = (def = 40) => [dropdown("weightUnit", "Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0), num("weight", "Pet's Weight", def, 2000, 0.1)];

interface DrugSpec { slug: string; title: string; key: keyof typeof E.DRUGS; desc: string; meta?: string; tabletName?: string; liquidName?: string; liquidUnit?: string; exWeight?: number; how: string; assume: string; faq: [string, string][] }
function drugTool(s: DrugSpec): ToolDef {
  const d = E.DRUGS[s.key];
  const tabName = s.tabletName ?? "Tablet";
  const liqUnit = s.liquidUnit ?? "mL";
  const liqName = s.liquidName ?? "liquid";
  const inputs: Record<string, unknown>[] = [...WEIGHT(s.exWeight ?? 40), dropdown("indication", "Use", opts(d.indications.map(([n, lo, hi, f]) => `${n} — ${lo === hi ? lo : `${lo}–${hi}`} mg/kg${f > 0 ? `, ${f}× daily` : ""}`)), 0)];
  if (d.tablets.length) inputs.push(dropdown("tabletStrength", `${tabName} Strength`, opts(d.tablets.map((t) => `${t} mg`)), 0));
  if (d.liquid > 0) inputs.push(num("concentration", `${liqName[0].toUpperCase()}${liqName.slice(1)} Strength (mg per ${liqUnit}; 0 = typical ${d.liquid})`, 0, 1000, 0.01));
  const results: Line[] = [["doseLowMg", "Dose — Low End (mg)", "n"], ["doseHighMg", "Dose — High End (mg)", "n"]];
  if (d.tablets.length) results.push(["tabletsLow", `${tabName}s per Dose — Low (nearest ¼)`, "n"], ["tabletsHigh", `${tabName}s per Dose — High`, "n"]);
  if (d.liquid > 0) results.push(["liquidLow", `${liqName[0].toUpperCase()}${liqName.slice(1)} per Dose — Low (${liqUnit})`, "n"], ["liquidHigh", `${liqName[0].toUpperCase()}${liqName.slice(1)} per Dose — High (${liqUnit})`, "n"]);
  results.push(["dosesPerDay", "Doses per Day (0 = single or monthly dose)", "n"], ["dailyMgHigh", "Maximum Daily Total (mg)", "n"], ["weightKg", "Weight (kg)", "n"]);
  const ex = { weightUnit: 0, weight: s.exWeight ?? 40, indication: 0, tabletStrength: 0, concentration: 0 };
  const first = d.indications[0];
  return mk({
    slug: s.slug, title: s.title, desc: s.desc, meta: s.meta, inputs, results, fn: E.doseTool(d), ex,
    exText: (o) => `Example: a ${s.exWeight ?? 40} lb (${o.weightKg} kg) pet at ${first[1] === first[2] ? first[1] : `${first[1]}–${first[2]}`} mg/kg gets ${o.doseLowMg === o.doseHighMg ? `${o.doseLowMg} mg` : `${o.doseLowMg}–${o.doseHighMg} mg`} per dose${d.tablets.length ? ` — about ${o.tabletsLow === o.tabletsHigh ? o.tabletsLow : `${o.tabletsLow}–${o.tabletsHigh}`} × ${d.tablets[0]} mg ${tabName.toLowerCase()}` : ""}${d.liquid > 0 ? ` or ${o.liquidLow === o.liquidHigh ? o.liquidLow : `${o.liquidLow}–${o.liquidHigh}`} ${liqUnit} of a ${d.liquid} mg/${liqUnit} ${liqName}` : ""}.`,
    how: `Enter your pet's current weight, choose the use your vet prescribed and the product strength you have. ${s.how}`,
    assume: `Dose = weight (kg) × mg/kg; tablets rounded to the nearest quarter. ${s.assume}`,
    faq: s.faq,
  });
}

const TOOLS: ToolDef[] = [
  drugTool({ slug: "meloxicam-dog-dosage-calculator", title: "Meloxicam Dog Dosage Calculator", key: "meloxicam", desc: "Calculate a dog's meloxicam (Metacam) dose by weight — the 0.2 mg/kg first-day loading dose and 0.1 mg/kg daily maintenance — in mg, mL of 1.5 mg/mL suspension or tablets.", liquidName: "oral suspension", how: "Use the syringe that comes with the vet suspension when possible — it's marked by body weight.", assume: "Label dosing for Metacam oral suspension (1.5 mg/mL or 0.5 mg/mL). Human 7.5/15 mg tablets are far too strong for most dogs and are only split under veterinary direction. Give with food; stop and call your vet for vomiting, black stool or lethargy. Never combine with other NSAIDs or steroids.", faq: [["How much meloxicam can I give my dog?", "The label dose is 0.1 mg/kg once daily after a single 0.2 mg/kg first dose."], ["Can dogs take human meloxicam?", "Only if your vet prescribes it and splits it — a 7.5 mg tablet is a full day's dose for a 165 lb dog."]] }),
  drugTool({ slug: "ivermectin-for-dogs-dosage-calculator", title: "Ivermectin 1.87% for Dogs Dosage Calculator", key: "ivermectin", desc: "Calculate ivermectin for dogs by weight — the tiny heartworm-preventive dose and the higher vet-only mange dose — including grams of 1.87% horse paste, with MDR1 breed warnings.", meta: "Ivermectin 1.87 Dosage for Dogs Calculator", liquidName: "paste", liquidUnit: "g", exWeight: 50, how: "Weigh paste on a gram scale; the horse syringe markings are far too coarse for dogs.", assume: "Horse paste is 1.87% (18.7 mg ivermectin per gram). Heartworm prevention uses 0.006–0.012 mg/kg monthly; higher doses are for vets only. Collies, Shelties, Australian Shepherds and other MDR1-mutation breeds can die from overdose — test first. Overdosing horse paste is a common cause of ivermectin poisoning.", faq: [["Is horse ivermectin safe for dogs?", "It can be dangerous — the doses are hard to measure and MDR1 breeds are very sensitive. Use dog-labeled heartworm products when possible."]] }),
  drugTool({ slug: "cbd-dosage-for-dogs-calculator", title: "CBD Dosage Calculator for Dogs & Cats", key: "cbd", desc: "Calculate CBD oil or chew doses for dogs and cats by weight — starting and research-level mg/kg — with mL of oil and number of chews.", meta: "CBD Dosage Dogs & Cats Calculator — mg and mL by Weight", tabletName: "Chew", liquidName: "oil", how: "Check the bottle's total mg of CBD and volume (e.g. 300 mg in 30 mL = 10 mg/mL). Start low and increase slowly. Cats: use the starting dose.", assume: "Starting 0.2–0.5 mg/kg twice daily; arthritis studies in dogs used about 2 mg/kg twice daily. CBD products are not FDA-approved for pets; THC is toxic to pets — use pet-specific, THC-free products and tell your vet (CBD can raise liver enzymes and interact with drugs).", faq: [["How much CBD should I give my dog?", "Many vets start around 0.2–0.5 mg per kg twice daily and adjust; research doses go up to 2 mg/kg."], ["Can cats have CBD oil?", "Cats can take pet CBD at low doses, but they metabolize it differently — start at the low end and ask your vet."]] }),
  drugTool({ slug: "carprofen-dosage-calculator", title: "Carprofen Dosage Calculator for Dogs", key: "carprofen", desc: "Calculate a dog's carprofen (Rimadyl, Novox) dose by weight — 4.4 mg/kg once daily or 2.2 mg/kg twice daily — with the number of 25, 75 or 100 mg tablets.", meta: "Carprofen Dose for Dogs by Weight Calculator", how: "Carprofen caplets are scored for halving; chewables can be split with a pill cutter.", assume: "Label dose 4.4 mg/kg/day once daily or divided twice daily. Not for cats. Don't combine with other NSAIDs or steroids; your vet may want periodic blood tests for liver and kidney function.", faq: [["How much carprofen for a 50 lb dog?", "About 100 mg a day (4.4 mg/kg) — one 100 mg tablet daily or 50 mg twice daily."]] }),
  drugTool({ slug: "doxycycline-for-dogs-dosage-calculator", title: "Doxycycline for Dogs Dosage Calculator", key: "doxycycline", desc: "Calculate doxycycline for dogs by weight — 5 mg/kg twice daily or 10 mg/kg once daily for tick-borne disease and heartworm protocols — in tablets or mL of suspension.", meta: "Doxycycline for Dogs Dosage Chart Calculator", liquidName: "suspension", how: "Follow each pill with food or water so it doesn't lodge in the esophagus.", assume: "Common dosing 5 mg/kg q12h or 10 mg/kg q24h (Lyme, Ehrlichia, Anaplasma, and the 28-day AHS heartworm protocol). Give with food; don't give with dairy, antacids or iron. In cats, always follow with water — dry pills can cause esophageal strictures.", faq: [["How long do dogs take doxycycline?", "Usually 28 days for tick-borne diseases and for the heartworm treatment protocol."]] }),
  drugTool({ slug: "prednisone-for-dogs-dosage-calculator", title: "Prednisone for Dogs Dosage Calculator", key: "prednisone", desc: "Calculate a dog's prednisone dose by weight for anti-inflammatory, immunosuppressive or Addison's (physiologic) use — mg, tablets and liquid — with tapering reminders.", meta: "Dog Prednisone Dosage Calculator — mg by Weight", how: "Give in the morning with food for dogs (cats usually get prednisolone in the evening).", assume: "Typical ranges: physiologic 0.1–0.25, anti-inflammatory 0.5–1, immunosuppressive ~2 mg/kg/day. Courses longer than a couple of weeks must be tapered — never stop suddenly. Side effects include thirst, urination, hunger and panting. Cats should get prednisolone instead.", faq: [["Can I stop prednisone suddenly?", "No — after more than a short course it must be tapered as your vet directs to avoid an adrenal crisis."]] }),
  drugTool({ slug: "panacur-fenbendazole-dosage-calculator", title: "Panacur (Fenbendazole) Dosage Calculator for Dogs & Cats", key: "fenbendazole", desc: "Calculate Panacur (fenbendazole) for dogs and cats by weight — 50 mg/kg daily for 3 or 5 days — in grams of 22.2% granules or mL of 10% (100 mg/mL) suspension.", meta: "Panacur & Fenbendazole for Cats Dosage Chart Calculator", liquidName: "suspension", exWeight: 20, how: "For Panacur C granules (22.2%), set the strength to 222 mg per g and weigh or use the packet sizes.", assume: "Label dose 50 mg/kg once daily for 3 consecutive days (dogs); 5 days is common for Giardia. Same mg/kg is used off-label for cats. Mix granules into a small amount of food.", faq: [["How much Panacur for a dog?", "50 mg per kg a day for three days — one 1 g packet of granules per 10 lb of body weight per day."], ["Can I use fenbendazole for my cat?", "Yes, vets commonly use 50 mg/kg daily for 3–5 days."]] }),
  drugTool({ slug: "acepromazine-dosage-calculator", title: "Acepromazine Dosage Calculator (Dogs, Cats & Horses)", key: "acepromazine", desc: "Calculate acepromazine doses by weight — oral tablets for dogs, and injectable doses for dogs, cats and horses (ace for horses) — in mg, tablets and mL of 10 mg/mL injection.", meta: "Acepromazine & Ace Dosage for Horses Calculator", liquidName: "injection", exWeight: 50, how: "Oral tablets take 45–60 minutes to work. Injectable doses are for veterinarians only.", assume: "Oral dogs 0.5–2.2 mg/kg; injectable dogs/cats 0.01–0.05 mg/kg (max ~3 mg per dog); horses 0.02–0.05 mg/kg IV/IM (a 1,000 lb horse ≈ 10–20 mg). Giant breeds, Boxers and MDR1 breeds are sensitive — use the low end. Ace calms but doesn't relieve fear or pain. Never inject into an artery in horses.", faq: [["How much ace for a horse?", "Typically 0.02–0.05 mg/kg IV or IM — about 1–2 mL of 10 mg/mL for a 1,000 lb horse."]] }),
  drugTool({ slug: "metronidazole-for-dogs-dosage-calculator", title: "Metronidazole for Dogs Dosage Calculator", key: "metronidazole", desc: "Calculate a dog's metronidazole (Flagyl) dose by weight — 10–15 mg/kg twice daily for diarrhea, up to 25 mg/kg for infections — in tablets or mL of suspension.", liquidName: "suspension", how: "Tablets are very bitter; hide them in food or ask for a flavored compound.", assume: "Common dosing 10–15 mg/kg q12h (diarrhea), up to 25 mg/kg q12h under veterinary direction. High doses or long courses can cause neurologic signs (wobbliness, head tilt) — stop and call your vet.", faq: [["How much metronidazole for a 40 lb dog?", "About 180–270 mg twice daily at 10–15 mg/kg — often half of a 500 mg tablet."]] }),
  drugTool({ slug: "albon-dosage-calculator", title: "Albon (Sulfadimethoxine) Dosage Calculator", key: "albon", desc: "Calculate Albon (sulfadimethoxine) for dogs and cats by weight — the 55 mg/kg first dose and 27.5 mg/kg daily after — in tablets or mL of 5% suspension.", liquidName: "suspension", exWeight: 15, how: "Treatment usually continues until the pet has been free of signs for 2 days (often 5–20 days).", assume: "Label: 55 mg/kg on day 1, then 27.5 mg/kg once daily. Suspension is 50 mg/mL. Keep fresh water available. Used for coccidia and bacterial infections.", faq: [["How much Albon for a puppy?", "About 1 mL per 2 lb on day one (55 mg/kg), then half that daily."]] }),
  drugTool({ slug: "trazodone-for-dogs-dosage-calculator", title: "Trazodone for Dogs Dosage Calculator", key: "trazodone", desc: "Calculate a dog's trazodone dose by weight for situational anxiety (vet visits, travel, fireworks) or daily use — 2–5 mg/kg — with 50, 100 or 150 mg tablets.", how: "For events, give 1–2 hours beforehand; your vet may suggest a test dose at home first.", assume: "Common dosing 2–5 mg/kg orally (some protocols up to 7–10 mg/kg). Avoid combining with other serotonergic drugs (fluoxetine, tramadol) unless your vet approves.", faq: [["How long does trazodone take to work in dogs?", "About 1–2 hours, lasting roughly 4–8 hours."]] }),
  drugTool({ slug: "alprazolam-for-dogs-dosage-calculator", title: "Alprazolam for Dogs Dosage Calculator", key: "alprazolam", desc: "Calculate an alprazolam (Xanax) dose for dogs with noise phobia or situational anxiety — 0.02–0.1 mg/kg — with 0.25, 0.5 or 1 mg tablets.", meta: "Alprazolam for Dogs Dosage Chart Calculator", how: "Give 30–60 minutes before a trigger such as a thunderstorm. Prescription only.", assume: "Common range 0.02–0.1 mg/kg up to every 6–12 hours. Can cause sedation or, occasionally, excitement. Don't use in pregnant dogs or with liver disease. Controlled substance — keep secure.", faq: [["How much Xanax can a dog have?", "Vets typically prescribe 0.02–0.1 mg/kg — about 0.25–1 mg for a 25 lb dog."]] }),
  drugTool({ slug: "benadryl-for-dogs-dosage-calculator", title: "Benadryl for Dogs Dosage Calculator", key: "diphenhydramine", desc: "Calculate Benadryl (diphenhydramine) for dogs by weight — 2–4 mg/kg (about 1 mg per lb) every 8–12 hours — in 25 mg tablets or mL of children's liquid.", meta: "Benadryl Dosage for Dogs — How Much & How Often", liquidName: "children's liquid", exWeight: 25, how: "Use plain diphenhydramine only — not 'Benadryl Allergy Plus', cold or 'D' products.", assume: "About 1 mg per lb (2–4 mg/kg) every 8–12 hours. Children's liquid is 12.5 mg per 5 mL (2.5 mg/mL) — check that it contains no xylitol. Can cause drowsiness or, rarely, excitement. Ask your vet if your dog has glaucoma, heart or prostate disease.", faq: [["How often can I give my dog Benadryl?", "Every 8–12 hours, up to three times a day."], ["How much Benadryl for a 25 lb dog?", "About 25 mg — one standard tablet."]] }),
  drugTool({ slug: "clindamycin-for-dogs-dosage-calculator", title: "Clindamycin for Dogs Dosage Calculator", key: "clindamycin", desc: "Calculate clindamycin (Antirobe) for dogs and cats by weight — 5.5–11 mg/kg every 12 hours for wounds, abscesses and dental infections — in capsules or mL of Aquadrops.", tabletName: "Capsule", liquidName: "oral drops", how: "Follow capsules with water or food.", assume: "Label: 5.5–11 mg/kg q12h (skin, wounds, dental); up to 11–33 mg/kg for bone infections. Antirobe Aquadrops are 25 mg/mL. Can cause vomiting or diarrhea.", faq: [["How much clindamycin for a dog?", "Usually 5.5–11 mg per kg twice a day for 7–28 days depending on the infection."]] }),
  drugTool({ slug: "pepto-bismol-for-dogs-dosage-calculator", title: "Pepto-Bismol for Dogs Dosage Calculator", key: "bismuth", desc: "Calculate Pepto-Bismol (bismuth subsalicylate) for dogs by weight — tablets or mL of regular-strength liquid — for short-term diarrhea, with cat warning.", meta: "Pepto Bismol Tablet Dosage for Dogs by Weight", tabletName: "Chewable Tablet", liquidName: "liquid", exWeight: 30, how: "Use only for a day or two; stools may turn black, which can hide bleeding.", assume: "About 17.5 mg/kg every 6–8 hours (≈ 1 tsp liquid per 10 lb); regular-strength liquid is 262 mg per 15 mL, chewables 262 mg. Contains salicylate — never for cats, and not with NSAIDs, steroids or in dogs with bleeding problems. See a vet if diarrhea lasts over 24–48 hours or there is blood.", faq: [["Can I give my dog Pepto-Bismol?", "Occasionally, at the right dose for a day or two — but ask your vet first, and never give it to cats."]] }),
  drugTool({ slug: "zyrtec-for-dogs-dosage-calculator", title: "Zyrtec for Dogs Dosage Calculator", key: "cetirizine", desc: "Calculate Zyrtec (cetirizine) for dogs by weight — about 1 mg/kg (0.5 mg per lb) once daily — with 5 or 10 mg tablets or mL of children's liquid.", meta: "Zyrtec for Dogs Dosage Chart Calculator", liquidName: "children's liquid", exWeight: 20, how: "Use plain cetirizine — never Zyrtec-D, which contains pseudoephedrine (toxic to dogs).", assume: "Common dosing 1 mg/kg once daily (can be twice daily for some dogs). Children's liquid is 1 mg/mL; check it's xylitol-free.", faq: [["How much Zyrtec can I give my dog?", "About 0.5 mg per lb once daily — 10 mg for a 20 lb dog."]] }),
  drugTool({ slug: "cephalexin-for-dogs-and-cats-dosage-calculator", title: "Cephalexin for Dogs & Cats Dosage Calculator", key: "cephalexin", desc: "Calculate cephalexin (Keflex, Rilexine) for dogs and cats by weight — 22–30 mg/kg every 12 hours — in 250 or 500 mg capsules or mL of 250 mg/5 mL suspension.", tabletName: "Capsule", liquidName: "suspension", how: "Finish the full course even if your pet looks better.", assume: "Common dosing 22–30 mg/kg q12h (skin infections often 3–6 weeks). Suspension 250 mg/5 mL = 50 mg/mL. Can cause stomach upset — give with food.", faq: [["How much cephalexin for a 40 lb dog?", "About 400–550 mg twice daily — usually one 500 mg capsule."], ["Can cats take cephalexin?", "Yes, at the same mg/kg, usually as a liquid."]] }),
  drugTool({ slug: "dramamine-for-dogs-dosage-calculator", title: "Dramamine for Dogs Dosage Calculator", key: "dimenhydrinate", desc: "Calculate Dramamine (dimenhydrinate) for dogs with car sickness by weight — 4–8 mg/kg every 8 hours — in 50 mg tablets or mL of children's liquid.", meta: "Dramamine for Dogs Dosage Chart Calculator", liquidName: "children's liquid", exWeight: 30, how: "Give 30–60 minutes before travel. 'Less Drowsy' Dramamine is meclizine, which is dosed differently.", assume: "Common dosing 4–8 mg/kg q8h (dogs); cats 12.5 mg total. Causes drowsiness; avoid with glaucoma or urinary retention.", faq: [["How much Dramamine for a 30 lb dog?", "About 50–100 mg — one to two 50 mg tablets."]] }),
  drugTool({ slug: "famotidine-for-dogs-dosage-calculator", title: "Famotidine (Pepcid) for Dogs Dosage Calculator", key: "famotidine", desc: "Calculate famotidine (Pepcid AC) for dogs and cats by weight — 0.5–1 mg/kg every 12 hours — in 10 or 20 mg tablets or mL of suspension.", meta: "Famotidine Dogs Dosage Calculator — Pepcid by Weight", liquidName: "suspension", how: "Give on an empty stomach 15–30 minutes before a meal for best effect.", assume: "Common dosing 0.5–1 mg/kg q12h. Use plain famotidine — not 'Pepcid Complete', which contains antacids. Suspension 40 mg/5 mL = 8 mg/mL.", faq: [["Can I give my dog Pepcid?", "Plain famotidine is commonly used at 0.5–1 mg/kg twice daily — check with your vet first."]] }),
  drugTool({ slug: "fip-gs-441524-dosage-calculator", title: "FIP Dosage Calculator (GS-441524)", key: "gs441524", desc: "Calculate GS-441524 doses for cats with FIP by weight — wet, dry, ocular and neurological FIP, injectable or oral — in mL and tablets, with weekly reweighing reminders.", meta: "FIP Dosage Calculator — GS-441524 mg and mL by Weight", liquidName: "injection", exWeight: 8, how: "Reweigh your cat every week and recalculate — dosing must follow weight gain.", assume: "Common protocols: wet/dry 4–6 mg/kg SC daily, ocular 8 mg/kg, neurological 10 mg/kg; oral tablets about 10–12 mg/kg; treatment typically 84 days. Use products prescribed by a veterinarian (compounded GS-441524 is available by prescription in the US, UK and other countries).", faq: [["How long is FIP treatment?", "Usually 84 days of daily GS-441524, followed by observation."]] }),
  drugTool({ slug: "pyrantel-pamoate-dewormer-dosage-calculator", title: "Pyrantel Pamoate Dewormer Dosage Calculator (Puppies & Cats)", key: "pyrantel", desc: "Calculate pyrantel pamoate dewormer for puppies, dogs, kittens and cats by weight — label dose for dogs and the higher cat dose — in mL of 4.54 mg/mL liquid or tablets.", meta: "How Much Dewormer to Give a Puppy & Pyrantel for Cats", liquidName: "liquid", exWeight: 10, how: "Deworm puppies and kittens at 2, 4, 6 and 8 weeks, then monthly until 6 months (CAPC).", assume: "Dogs 5–10 mg/kg (Nemex-2: 1 tsp / 5 mL per 10 lb); cats ~20 mg/kg (vet-directed). 4.54 mg/mL is the common liquid strength. Treats roundworms and hookworms — not tapeworms or whipworms.", faq: [["How much dewormer do I give a puppy?", "Pyrantel at about 1 mL per 2 lb (5 mg/kg) of 4.54 mg/mL liquid, repeated every 2 weeks while young."]] }),
  drugTool({ slug: "furosemide-for-dogs-dosage-calculator", title: "Furosemide for Dogs Dosage Calculator (Heart Failure)", key: "furosemide", desc: "Calculate furosemide (Lasix, Salix) for dogs with congestive heart failure by weight — 1–2 mg/kg twice daily at home — in tablets or mL of oral solution.", meta: "Furosemide Dosage for Dogs With Heart Failure Calculator", liquidName: "oral solution", exWeight: 25, how: "Track your dog's sleeping breathing rate at home — over 30–35 breaths a minute means call your vet.", assume: "Home maintenance commonly 1–2 mg/kg q8–12h, adjusted to resting respiratory rate; acute congestion is treated in hospital at higher doses. Leave water available; your vet will check kidney values and electrolytes.", faq: [["How much Lasix for a dog in heart failure?", "Often 1–2 mg/kg two or three times a day, adjusted by your vet."]] }),
  drugTool({ slug: "praziquantel-dosage-calculator", title: "Praziquantel Dosage Calculator for Dogs & Cats", key: "praziquantel", desc: "Calculate praziquantel (Droncit) tapeworm dewormer for dogs and cats by weight — 5 mg/kg single dose — in 34 mg dog or 23 mg cat tablets or mL of injectable.", meta: "Praziquantel Dosage Calculator for Dogs", liquidName: "injection", exWeight: 30, how: "A single dose kills tapeworms; treat fleas too, or Dipylidium tapeworms return.", assume: "Common dosing 5 mg/kg once (Echinococcus protocols may differ). Droncit tablets: 34 mg (dog), 23 mg (cat); injectable 56.8 mg/mL (vet use).", faq: [["How much praziquantel for a dog?", "About 5 mg per kg once — one 34 mg tablet per 15 lb."]] }),
  drugTool({ slug: "gabapentin-for-cats-dosage-calculator", title: "Gabapentin for Cats Dosage Calculator", key: "gabapentinCat", desc: "Calculate gabapentin for cats by weight in kg — pre-vet-visit calming (10–20 mg/kg) and chronic pain (5–10 mg/kg twice daily) — in 100 mg capsules or mL of 50 mg/mL liquid.", meta: "Gabapentin for Cats Dosage Chart (kg) Calculator", tabletName: "Capsule", liquidName: "compounded liquid", exWeight: 10, how: "For vet visits, give 2–3 hours before leaving home; many cats get one 100 mg capsule.", assume: "Pre-visit 10–20 mg/kg (often 50–100 mg per cat); chronic pain 5–10 mg/kg q12h. Causes sedation and wobbliness for a few hours. Never use human gabapentin liquid — it contains xylitol. Lower doses for cats with kidney disease.", faq: [["How much gabapentin for a cat before the vet?", "Usually 50–100 mg about 2–3 hours before the visit."]] }),
  mk({
    slug: "melatonin-for-dogs-dosage-calculator", title: "Melatonin for Dogs Dosage Calculator", desc: "Find the melatonin dose for your dog by weight band — anxiety, sleep or alopecia — in mg and tablets, up to three times daily.", meta: "Melatonin for Dogs Dosage Chart by Weight",
    inputs: [...WEIGHT(30), dropdown("tabletStrength", "Tablet Strength", opts(["1 mg", "3 mg", "5 mg", "10 mg"]), 1)],
    results: [["doseLowMg", "Dose — Low End (mg)", "n"], ["doseHighMg", "Dose — High End (mg)", "n"], ["tabletsLow", "Tablets per Dose — Low", "n"], ["tabletsHigh", "Tablets per Dose — High", "n"], ["dosesPerDay", "Maximum Doses per Day", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.melatonin, ex: { weightUnit: 0, weight: 30, tabletStrength: 1 },
    exText: (o) => `Example: a 30 lb dog takes about ${o.doseLowMg} mg of melatonin — one 3 mg tablet — up to three times a day.`,
    how: "Enter your dog's weight and the tablet you have. Use plain melatonin without xylitol or added sleep aids.",
    assume: "Common weight bands: under 10 lb 1 mg; 10–25 lb 1.5 mg; 26–100 lb 3 mg; over 100 lb 3–6 mg; up to every 8 hours. Melatonin is a supplement, not FDA-approved for dogs.",
    faq: [["How much melatonin can I give my dog?", "About 1–6 mg depending on size, up to three times a day."]],
  }),
  drugTool({ slug: "claritin-for-dogs-dosage-calculator", title: "Claritin for Dogs Dosage Calculator", key: "loratadine", desc: "Calculate Claritin (loratadine) for dogs by weight — 0.25–0.5 mg/kg once daily — with 10 mg tablets or mL of children's liquid, and the Claritin-D warning.", meta: "Claritin for Dogs Dosage Chart Calculator", liquidName: "children's liquid", exWeight: 30, how: "Never use Claritin-D — the decongestant pseudoephedrine can kill dogs.", assume: "Common dosing 0.25–0.5 mg/kg once daily (often 5 mg for small and 10 mg for larger dogs). Children's liquid 1 mg/mL — check for xylitol.", faq: [["Can dogs take Claritin?", "Plain loratadine is used for dog allergies; never the 'D' version."]] }),
  drugTool({ slug: "tramadol-for-dogs-dosage-calculator", title: "Tramadol for Dogs Dosage Calculator (50 mg Tablets)", key: "tramadol", desc: "Calculate tramadol for dogs by weight — 2–5 mg/kg every 8–12 hours — as fractions of a 50 mg tablet, for vet-prescribed pain relief.", meta: "50mg Tramadol for Dogs Dosage Chart Calculator", liquidName: "compounded liquid", exWeight: 40, how: "Prescription only; don't combine with trazodone, SSRIs or other serotonergic drugs without your vet's approval.", assume: "Common dosing 2–5 mg/kg q8–12h; evidence for pain relief in dogs is limited, so vets often pair it with an NSAID. Controlled substance. Can cause sedation or nausea.", faq: [["How much tramadol for a 40 lb dog?", "About 36–90 mg per dose — roughly 1–2 tablets of 50 mg — as prescribed."]] }),
  mk({
    slug: "fish-oil-for-dogs-dosage-calculator", title: "Fish Oil Dosage Calculator for Dogs", desc: "Calculate omega-3 fish oil for dogs by weight — EPA + DHA mg per day for skin, joints, heart or kidneys — with capsules or mL, capped at the NRC safe upper limit.", meta: "Fish Oil Dosage Calculator for Dogs — EPA + DHA mg",
    inputs: [...WEIGHT(50), dropdown("indication", "Goal", opts(E.FISH_OIL.map(([n, m]) => `${n} (${m} mg/kg EPA+DHA)`)), 0), num("epaDhaPerCapsule", "EPA + DHA per Capsule (mg)", 300, 2000, 10), num("epaDhaPerMl", "EPA + DHA per mL of Liquid (0 = none)", 0, 1000, 1)],
    results: [["epaDhaMgPerDay", "EPA + DHA per Day (mg)", "n"], ["capsulesPerDay", "Capsules per Day", "n"], ["mlPerDay", "Liquid per Day (mL)", "n"], ["safeUpperLimitMg", "NRC Safe Upper Limit (mg)", "n"], ["cappedAtUpperLimit", "Capped at Upper Limit (1 = yes)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.fishOil, ex: { weightUnit: 0, weight: 50, indication: 0, epaDhaPerCapsule: 300, epaDhaPerMl: 0 },
    exText: (o) => `Example: a 50 lb dog needs about ${fmt(o.epaDhaMgPerDay, 0)} mg of EPA + DHA a day for skin and coat — about ${o.capsulesPerDay} capsules with 300 mg each.`,
    how: "Read the label for combined EPA + DHA (not total fish oil). Increase gradually over a week to avoid loose stool.",
    assume: "Common targets: 40–50 mg/kg EPA+DHA for general and skin health, 100–150 mg/kg for osteoarthritis; NRC safe upper limit 310 mg × kg^0.75. High doses can affect clotting — tell your vet before surgery.",
    faq: [["How much fish oil should I give my dog?", "About 50 mg of combined EPA and DHA per kg per day for skin, more for joints."]],
  }),
  drugTool({ slug: "ondansetron-for-dogs-dosage-calculator", title: "Ondansetron for Dogs Dosage Calculator", key: "ondansetron", desc: "Calculate ondansetron (Zofran) for dogs by weight per pound or kg — 0.5–1 mg/kg every 12 hours — in 4 or 8 mg tablets or mL of oral solution.", meta: "Ondansetron Dose for Dogs per Pound Calculator", liquidName: "oral solution", exWeight: 40, how: "Persistent vomiting needs a vet visit — anti-nausea drugs can hide obstruction or poisoning.", assume: "Common dosing 0.5–1 mg/kg q8–12h (range 0.1–1 mg/kg). Oral solution 4 mg/5 mL = 0.8 mg/mL. Use caution in MDR1 breeds.", faq: [["How much Zofran per pound for a dog?", "About 0.25–0.5 mg per lb, two or three times a day."]] }),
  drugTool({ slug: "azithromycin-for-cats-dosage-calculator", title: "Azithromycin for Cats Dosage Calculator", key: "azithromycin", desc: "Calculate azithromycin (Zithromax) for cats by weight — 5–10 mg/kg once daily — in mL of 200 mg/5 mL suspension or tablet fractions.", liquidName: "suspension", exWeight: 10, how: "Courses are often short (3–5 days) or every-other-day; follow your vet's schedule.", assume: "Common dosing 5–10 mg/kg once daily, sometimes every 48–72 hours for longer courses (upper respiratory infections, Bartonella). Suspension 200 mg/5 mL = 40 mg/mL; can cause vomiting.", faq: [["How much azithromycin for a cat?", "About 5–10 mg per kg — roughly 0.5–1 mL of 40 mg/mL suspension for a 10 lb cat."]] }),
  drugTool({ slug: "imodium-for-dogs-dosage-calculator", title: "Imodium for Dogs Dosage Calculator", key: "loperamide", desc: "Calculate Imodium (loperamide) for dogs by weight — 0.1–0.2 mg/kg every 8–12 hours — in 2 mg tablets or mL of liquid, with MDR1 breed and cat warnings.", meta: "Imodium Dosage for Dogs by Weight (e.g. 20 lb Dog)", liquidName: "liquid", exWeight: 20, how: "Use for a day or two only. Don't use if there's blood, fever, vomiting or suspected poisoning.", assume: "Common dosing 0.1–0.2 mg/kg q8–12h (a 20 lb dog ≈ 1 mg). Never in Collies, Shelties, Aussies or other MDR1 breeds (can cause severe sedation), nor in cats without vet direction. Liquid 1 mg/5 mL = 0.2 mg/mL.", faq: [["How much Imodium for a 20 lb dog?", "About 1 mg — half a 2 mg tablet — up to three times a day for a day or two."]] }),
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
