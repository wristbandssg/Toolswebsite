// One-time (but safe to re-run) batch setup script: creates 28 pet age, growth and breeding calculators
// (Pets & Animals Calculators > Pet Age, Growth & Breeding Calculators). Formulas, growth curves and
// gestation tables live in src/lib/calc-engine-pets-growth.ts; examples are computed from the engine.
// Merged keywords (no separate page): Puppy Age, Breed / Birthday Dog Age, Yorkie & Chihuahua Age → dog-age;
// Cat Birthday → cat-age; Animal Years to Human Years, Hamster / Bird / Guinea Pig / Rabbit / Bearded Dragon
// Age → pet-age; Cat QoL → pet-quality-of-life; Dog Size + 12 breed weight keywords → puppy-weight; Doodle,
// Bernedoodle, Cavapoo, Maltipoo, Aussiedoodle Weight → goldendoodle-weight; Pet Weight → dog-bmi; Cat Weight
// → cat-bmi; Week by Week, Dachshund & Yorkie Pregnancy, Lap Day → dog-pregnancy; Coat Color, Animal Genetics
// Color → dog-color-genetics; Maine Coon Color → cat-coat-color.
/* eslint-disable @typescript-eslint/no-unused-vars -- shared helper block; not every batch uses every helper */
//
// HOW TO RUN (after prisma/setup-pets-animals-category.ts --apply)
//   npx tsx prisma/create-pets-growth-calculators.ts
// or
//   npm run db:create-pets-growth-calculators

import * as E from "../src/lib/calc-engine-pets-growth";

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

const CAT = "pet-age-growth-breeding-calculators";
const NOTE = "Estimates based on averages — individual animals vary with breed, genetics and health, so use these as a guide and talk to your veterinarian about your pet.";

const dateField = (key: string, label: string, def: number | string = "today") => ({ key, label, type: "date", required: true, default: def });
const AGE = (birth = "today-1461", years = 4, months = 0) => [dropdown("mode", "Enter Age As", opts(["Birth date", "Years and months"]), 1), dateField("birthDate", "Birth Date", birth), num("years", "Age — Years", years, 100, 1), num("months", "Age — Months", months, 11, 1)];
const SIZE5 = (def = 2) => dropdown("size", "Adult Size", opts(["Toy (under 10 lb)", "Small (10–25 lb)", "Medium (25–50 lb)", "Large (50–90 lb)", "Giant (over 90 lb)"]), def);
const WUNIT = dropdown("weightUnit", "Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0);
const BREED = (def = 0) => dropdown("breed", "Breed", opts(E.BREEDS.map(([n, , lo, hi]) => (hi ? `${n} (${lo}–${hi} lb)` : n))), def);
const GENO = (key: string, label: string, def: number, labels: string[]) => dropdown(key, label, opts(labels), def);
const D0 = 20759;

const TOOLS: ToolDef[] = [
  mk({
    slug: "dog-age-calculator", title: "Dog Age Calculator (Dog Years to Human Years)",
    desc: "Convert your dog's age to human years by size or breed — from a birthday or age — with the AVMA method and the new epigenetic (DNA) formula, plus life stage and senior age.",
    meta: "Dog Age Calculator — Dog Years to Human Years by Breed & Birthday",
    inputs: [...AGE("today-1461", 4, 0), SIZE5(2)],
    results: [["humanYears", "Age in Human Years", "n"], ["epigeneticHumanYears", "Epigenetic (DNA) Estimate", "n"], ["dogAgeYears", "Dog's Age (years)", "n"], ["ageInWeeks", "Age in Weeks", "n"], ["lifeStage", "Life Stage (1 puppy · 2 young adult · 3 adult · 4 senior)", "n"], ["seniorFromAge", "Senior From Age", "n"]],
    fn: E.dogAge, ex: { mode: 1, birthDate: D0, years: 4, months: 0, size: 2 },
    exText: (o) => `Example: a 4-year-old medium dog is about ${o.humanYears} in human years (${o.epigeneticHumanYears} by the epigenetic formula) and becomes a senior around ${o.seniorFromAge}.`,
    how: "Enter your dog's birthday (or age) and adult size. Works for puppies, Yorkies, Chihuahuas and any breed — pick the size that matches.",
    assume: "AVMA: year one ≈ 15 human years, year two adds 9, then 4–7 per year depending on size (bigger dogs age faster). The UC San Diego DNA-methylation study proposes 16 × ln(dog age) + 31. The old '×7' rule is inaccurate.",
    faq: [["How old is my dog in human years?", "Roughly 15 at one year, 24 at two, then 4–7 years per dog year depending on size."], ["Do small dogs age slower?", "Yes — small breeds age more slowly after the first two years and live longer."]],
  }),
  mk({
    slug: "cat-age-calculator", title: "Cat Age Calculator (Cat Years to Human Years)",
    desc: "Convert your cat's age to human years from its birthday or age — 15 at one, 24 at two, then 4 per year — with life stage and next birthday.",
    meta: "Cat Age Calculator — Cat Years to Human Years & Birthday",
    inputs: AGE("today-2192", 6, 0),
    results: [["humanYears", "Age in Human Years", "n"], ["catAgeYears", "Cat's Age (years)", "n"], ["ageInWeeks", "Age in Weeks", "n"], ["lifeStage", "Life Stage (1 kitten · 2 adult · 3 mature · 4 senior)", "n"], ["nextBirthday", "Next Birthday", "d"]],
    fn: E.catAge, ex: { mode: 1, birthDate: D0, years: 6, months: 0 },
    exText: (o) => `Example: a 6-year-old cat is about ${o.humanYears} in human years.`,
    how: "Enter your cat's birthday or age. If you don't know it, your vet can estimate from teeth and eyes.",
    assume: "AAHA/AAFP feline life stage guidelines: 15 human years at one, 24 at two, then about 4 per year. Kitten under 1, adult 1–6, mature 7–10, senior 11+.",
    faq: [["How old is a 10-year-old cat in human years?", "About 56."]],
  }),
  mk({
    slug: "pet-age-calculator", title: "Pet Age Calculator (Animal Years to Human Years)",
    desc: "Convert any pet's age to human years — rabbit, hamster, guinea pig, rat, ferret, budgie, cockatiel, parrot, bearded dragon, gecko, tortoise, goldfish, mini pig and more — by average lifespan.",
    meta: "Pet Age Calculator — Animal Years to Human Years",
    inputs: [dropdown("species", "Animal", opts(E.PET_LIFESPANS.map(([n, l]) => `${n} (~${l} yr lifespan)`)), 0), ...AGE("today-1096", 3, 0)],
    results: [["humanYears", "Age in Human Years", "n"], ["percentOfLifespan", "% of Average Lifespan Lived", "p"], ["expectedLifespanYears", "Average Lifespan (years)", "n"], ["yearsRemaining", "Typical Years Remaining", "n"], ["ratio", "Human Years per Pet Year", "n"]],
    fn: E.petAge, ex: { species: 0, mode: 1, birthDate: D0, years: 3, months: 0 },
    exText: (o) => `Example: a 3-year-old rabbit is about ${o.humanYears} in human years — ${o.percentOfLifespan}% of a typical 10-year life.`,
    how: "Choose your pet and enter its age or birthday.",
    assume: "Human-equivalent age = pet age ÷ average lifespan × 79 years (US life expectancy). Real aging is faster early in life for most species, so young pets are 'older' than this suggests.",
    faq: [["How old is a 2-year-old hamster in human years?", "Around 63 — hamsters typically live 2–3 years."]],
  }),
  mk({
    slug: "dog-life-expectancy-calculator", title: "Dog Life Expectancy Calculator (Mixed Breed)",
    desc: "Estimate how long your dog will live — by adult size, mixed or purebred, neutering, body weight and flat-faced breeds — with years remaining.",
    meta: "Mixed Breed Dog Life Expectancy Calculator",
    inputs: [SIZE5(2), dropdown("breedType", "Breeding", opts(["Purebred", "Mixed breed"]), 1), yn("neutered", "Spayed / Neutered?", 1), yn("overweight", "Overweight?"), yn("brachycephalic", "Flat-Faced Breed (Bulldog, Pug…)?"), ...AGE("today-1826", 5, 0)],
    results: [["expectedLifespanYears", "Expected Lifespan (years)", "n"], ["yearsRemaining", "Years Remaining", "n"], ["lifespanLow", "Typical Range — Low", "n"], ["lifespanHigh", "Typical Range — High", "n"], ["percentLived", "Share of Life Lived", "p"]],
    fn: E.dogLifeExpectancy, ex: { size: 2, breedType: 1, neutered: 1, overweight: 0, brachycephalic: 0, mode: 1, birthDate: D0, years: 5, months: 0 },
    exText: (o) => `Example: a neutered, mixed-breed medium dog of 5 has a life expectancy of about ${o.expectedLifespanYears} years — around ${o.yearsRemaining} more.`,
    how: "Choose your dog's adult size and a few health factors.",
    assume: "Size averages from UK VetCompass and US studies; mixed breeds live ~0.5 years longer on average; keeping dogs lean added ~1.8 years in Purina's lifetime study; flat-faced breeds have shorter lives.",
    faq: [["How long do mixed breed dogs live?", "About 12–14 years on average, depending mostly on size."]],
  }),
  mk({
    slug: "cat-lifespan-calculator", title: "Cat Lifespan Calculator",
    desc: "Estimate your cat's life expectancy — indoor, indoor/outdoor or outdoor, neutered, purebred or mixed, weight — with years remaining.",
    inputs: [dropdown("lifestyle", "Lifestyle", opts(["Indoor only", "Indoor / outdoor", "Mostly outdoor"]), 0), yn("neutered", "Spayed / Neutered?", 1), dropdown("breedType", "Breed", opts(["Mixed / domestic", "Purebred"]), 0), yn("overweight", "Overweight?"), ...AGE("today-2922", 8, 0)],
    results: [["expectedLifespanYears", "Expected Lifespan (years)", "n"], ["yearsRemaining", "Years Remaining", "n"], ["lifespanLow", "Typical Range — Low", "n"], ["lifespanHigh", "Typical Range — High", "n"], ["percentLived", "Share of Life Lived", "p"]],
    fn: E.catLifespan, ex: { lifestyle: 0, neutered: 1, breedType: 0, overweight: 0, mode: 1, birthDate: D0, years: 8, months: 0 },
    exText: (o) => `Example: a neutered indoor domestic cat of 8 can expect to live about ${o.expectedLifespanYears} years — roughly ${o.yearsRemaining} more.`,
    how: "Choose your cat's lifestyle and health factors.",
    assume: "Indoor cats commonly reach 13–17+ years; outdoor cats face traffic, predators and disease. Estimates are population averages.",
    faq: [["How long do indoor cats live?", "Typically 13–17 years, and many live past 20."]],
  }),
  mk({
    slug: "pet-quality-of-life-calculator", title: "Dog & Cat Quality of Life Calculator",
    desc: "Score your dog's or cat's quality of life with the HHHHHMM scale — hurt, hunger, hydration, hygiene, happiness, mobility and more good days than bad — to support end-of-life decisions.",
    meta: "Dog & Cat Quality of Life Calculator (HHHHHMM Scale)",
    inputs: [num("hurt", "Hurt — pain controlled, breathing easy (0–10)", 7, 10), num("hunger", "Hunger — eating enough (0–10)", 6, 10), num("hydration", "Hydration — drinking enough (0–10)", 7, 10), num("hygiene", "Hygiene — clean, no sores (0–10)", 6, 10), num("happiness", "Happiness — interest, joy, interaction (0–10)", 5, 10), num("mobility", "Mobility — can get up and move (0–10)", 4, 10), num("moreGoodDays", "More Good Days Than Bad (0–10)", 5, 10)],
    results: [["totalScore", "Total Score", "n"], ["outOf", "Out Of", "n"], ["acceptable", "Acceptable Quality of Life (score > 35) (1 = yes)", "n"], ["lowScoringAreas", "Areas Scoring 3 or Less", "n"], ["percent", "Score (%)", "p"]],
    fn: E.qualityOfLife, ex: { hurt: 7, hunger: 6, hydration: 7, hygiene: 6, happiness: 5, mobility: 4, moreGoodDays: 5 },
    exText: (o) => `Example: scores of 7, 6, 7, 6, 5, 4 and 5 total ${o.totalScore}/70 — above the 35-point line, so quality of life is still considered acceptable.`,
    how: "Score each area from 0 (worst) to 10 (best) honestly, ideally on several days, and discuss the result with your veterinarian.",
    assume: "Dr Alice Villalobos's HHHHHMM Quality of Life Scale: a total above 35 suggests acceptable quality of life for hospice care. It's a conversation aid, not a decision rule.",
    faq: [["How do I know when it's time to put my dog down?", "When bad days outnumber good ones, pain can't be controlled or the quality-of-life score drops below about 35 — talk it through with your vet."]],
  }),
  mk({
    slug: "dog-sleep-calculator", title: "How Much Sleep Do Dogs Need by Age Calculator",
    desc: "Find how many hours a day your dog should sleep by age (puppy, adult, senior), size and activity level — with naps and awake time.",
    meta: "How Much Sleep Do Dogs Need by Age",
    inputs: [dropdown("stage", "Age", opts(E.SLEEP.map(([n, lo, hi]) => `${n} (${lo}–${hi} h)`)), 1), dropdown("size", "Size", opts(["Small", "Medium", "Large / giant"]), 1), dropdown("activity", "Daily Activity", opts(["Low", "Moderate", "High / working dog"]), 1)],
    results: [["sleepHoursLow", "Sleep per Day — Low (h)", "n"], ["sleepHoursHigh", "Sleep per Day — High (h)", "n"], ["napsPerDay", "Typical Naps per Day", "n"], ["awakeHoursHigh", "Awake Hours (max)", "n"]],
    fn: E.dogSleep, ex: { stage: 1, size: 1, activity: 1 },
    exText: (o) => `Example: an adult medium dog with moderate activity sleeps about ${o.sleepHoursLow}–${o.sleepHoursHigh} hours a day.`,
    how: "Choose your dog's life stage, size and activity level.",
    assume: "Puppies sleep 18–20 hours, adults 12–14 and seniors 14–18; large breeds and less active dogs sleep more. Sudden changes in sleep can signal illness.",
    faq: [["Is it normal for my dog to sleep all day?", "Adult dogs commonly sleep 12–14 hours a day; puppies and seniors even more."]],
  }),
  mk({
    slug: "puppy-weight-calculator", title: "Puppy Weight Calculator (Adult Size Predictor)",
    desc: "Predict your puppy's adult weight from current weight and age — by breed (Yorkie, Chihuahua, Golden Retriever, German Shepherd, Great Dane, Cane Corso and more) or size for mixed breeds.",
    meta: "Puppy Weight Calculator — How Big Will My Dog Get?",
    inputs: [BREED(14), SIZE5(2), WUNIT, num("currentWeight", "Current Weight", 25, 300, 0.1), num("ageWeeks", "Age (weeks)", 16, 104, 1, 1)],
    results: [["predictedAdultWeight", "Predicted Adult Weight", "n"], ["percentGrown", "Grown So Far (% of adult weight)", "p"], ["weightAt6Months", "Expected Weight at 6 Months", "n"], ["weightAt1Year", "Expected Weight at 1 Year", "n"], ["breedStandardLowLb", "Breed Standard Low (lb)", "n"], ["breedStandardHighLb", "Breed Standard High (lb)", "n"], ["sizeClass", "Size Class (1 toy … 5 giant)", "n"]],
    fn: E.puppyWeight, ex: { breed: 14, size: 2, weightUnit: 0, currentWeight: 25, ageWeeks: 16 },
    exText: (o) => `Example: a 16-week-old Golden Retriever weighing 25 lb is about ${o.percentGrown}% grown and should reach roughly ${o.predictedAdultWeight} lb.`,
    how: "Pick your puppy's breed (or 'Mixed breed' and the expected adult size), then enter today's weight and age in weeks. Results use the same unit as the weight you enter.",
    assume: "Share-of-adult-weight curves by size class: toy dogs finish growing at ~9–10 months, giant breeds at 18–24 months. Predictions are most reliable after 12–16 weeks.",
    faq: [["How can I tell how big my puppy will get?", "Divide current weight by the share of adult weight typical for its age and size — about 50% at 16 weeks for small breeds and 35% for large."], ["When do puppies stop growing?", "Small breeds around 9–12 months, large and giant breeds at 15–24 months."]],
  }),
  mk({
    slug: "goldendoodle-weight-calculator", title: "Goldendoodle & Doodle Weight Calculator",
    desc: "Predict a Goldendoodle, Bernedoodle, Aussiedoodle, Cavapoo, Maltipoo or other doodle's adult weight from the parents' weights, generation (F1, F1B, F2) and sex — refined by current weight.",
    meta: "Goldendoodle Weight Calculator — Doodle Adult Size",
    inputs: [num("poodleParentWeight", "Poodle Parent Weight (lb)", 15, 100, 0.5), num("otherParentWeight", "Other Parent Weight (lb — Golden, Bernese, Aussie, Cavalier, Maltese…)", 65, 150, 0.5), dropdown("generation", "Generation", opts(E.DOODLE_GEN.map(([n]) => n)), 0), dropdown("sex", "Sex", opts(["Male", "Female"]), 0), num("currentWeight", "Puppy's Current Weight (lb, optional)", 12, 150, 0.1), num("ageWeeks", "Puppy's Age (weeks, optional)", 12, 104, 1)],
    results: [["predictedAdultWeight", "Predicted Adult Weight (lb)", "n"], ["rangeLow", "Likely Range — Low (lb)", "n"], ["rangeHigh", "Likely Range — High (lb)", "n"], ["estimateFromParents", "Estimate from Parents (lb)", "n"], ["estimateFromCurrentWeight", "Estimate from Growth (lb)", "n"], ["sizeCategory", "Size (1 toy · 2 mini · 3 medium · 4 standard · 5 large)", "n"]],
    fn: E.doodleWeight, ex: { poodleParentWeight: 15, otherParentWeight: 65, generation: 0, sex: 0, currentWeight: 12, ageWeeks: 12 },
    exText: (o) => `Example: an F1 male from a 15 lb mini poodle and a 65 lb Golden weighing 12 lb at 12 weeks should mature around ${o.predictedAdultWeight} lb (${o.rangeLow}–${o.rangeHigh}).`,
    how: "Ask your breeder for both parents' weights and the generation. Adding your puppy's current weight and age improves the estimate.",
    assume: "Expected weight = poodle share × poodle weight + the rest × other parent (F1 50%, F1B 75%), females ~8% lighter; averaged with a growth-curve estimate when a current weight is given. Doodle litters vary widely.",
    faq: [["How big will my mini Goldendoodle get?", "Usually 25–40 lb, depending on the poodle parent's size and generation."]],
  }),
  mk({
    slug: "dog-bmi-calculator", title: "Dog BMI & Ideal Weight Calculator",
    desc: "Find your dog's ideal weight from body condition score (BCS 1–9) — percent overweight, pounds to lose or gain, and estimated body fat — for any breed.",
    meta: "Dog BMI Calculator — Ideal Weight from Body Condition",
    inputs: [num("weight", "Current Weight (lb or kg)", 60, 300, 0.1), num("bcs", "Body Condition Score (1–9; 5 = ideal)", 7, 9, 1, 1)],
    results: [["idealWeight", "Ideal Weight (same unit)", "n"], ["percentOverIdeal", "% Over (−) / Under Ideal", "n"], ["weightToLose", "Weight to Lose", "n"], ["weightToGain", "Weight to Gain", "n"], ["category", "Category (1 underweight · 2 ideal · 3 overweight · 4 obese)", "n"], ["bodyFatEstimatePercent", "Estimated Body Fat (%)", "n"]],
    fn: E.dogBmi, ex: { weight: 60, bcs: 7 },
    exText: (o) => `Example: a 60 lb dog with a body condition score of 7/9 has an ideal weight of about ${o.idealWeight} lb — ${o.weightToLose} lb to lose.`,
    how: "Score your dog using the WSAVA 9-point chart: at 5 you can feel ribs easily with a slight fat cover and see a waist from above.",
    assume: "Each BCS point above 5 ≈ 10% excess weight (WSAVA/Laflamme). Dogs don't have a true BMI because body shapes vary so much by breed.",
    faq: [["How do I know if my dog is overweight?", "If you can't easily feel the ribs or see a waist from above, your dog is probably a 6 or more on the 9-point scale."]],
  }),
  mk({
    slug: "cat-bmi-calculator", title: "Cat BMI & Ideal Weight Calculator",
    desc: "Calculate your cat's body fat with the feline BMI (FBMI) — ribcage circumference and lower-leg length — plus ideal weight and how much to lose.",
    meta: "Cat BMI Calculator — Feline Body Fat & Ideal Weight",
    inputs: [dropdown("lengthUnit", "Measurement Unit", opts(["Inches", "Centimeters"]), 0), num("ribcage", "Ribcage Circumference (at 9th rib)", 15, 60, 0.1), num("legLength", "Lower Hind Leg Length (knee to ankle)", 5, 30, 0.1), num("weight", "Current Weight (lb or kg)", 13, 40, 0.1)],
    results: [["bodyFatPercent", "Body Fat (%)", "n"], ["category", "Category (1 thin · 2 ideal · 3 overweight · 4 obese)", "n"], ["idealWeight", "Ideal Weight (same unit)", "n"], ["weightToLose", "Weight to Lose", "n"], ["leanMass", "Lean Body Mass", "n"]],
    fn: E.catBmi, ex: { lengthUnit: 0, ribcage: 15, legLength: 5, weight: 13 },
    exText: (o) => `Example: a 13 lb cat with a 15 in ribcage and 5 in lower leg has about ${o.bodyFatPercent}% body fat; its ideal weight is roughly ${o.idealWeight} lb.`,
    how: "With your cat standing, measure around the chest at the 9th rib and the lower hind leg from the middle of the knee to the ankle.",
    assume: "Feline BMI (Hawthorne & Butterwick, Waltham): body fat % = ((ribcage ÷ 0.7062) − leg) ÷ 0.9156 − leg, in cm. Healthy cats are about 10–30% fat; ideal weight assumes 20% fat.",
    faq: [["What is a healthy weight for a cat?", "Most domestic cats are ideal at 8–11 lb, but frame size matters — body fat is a better guide."]],
  }),
  mk({
    slug: "dog-weight-loss-calculator", title: "Dog Weight Loss Calculator (Calories for Weight Loss)",
    desc: "Plan safe weight loss for your dog — daily calories at 1.0 × RER of target weight, cups of food, treat allowance, weekly loss and weeks to goal.",
    meta: "Dog Calorie Calculator for Weight Loss",
    inputs: [WUNIT, num("currentWeight", "Current Weight", 70, 300, 0.1), num("targetWeight", "Target (Ideal) Weight", 60, 300, 0.1), pct("weeklyRate", "Target Loss per Week (% of body weight)", 1.5, 2, 0.1), num("kcalPerCup", "Food Calories per Cup (kcal)", 350, 1000, 1)],
    results: [["dailyCalories", "Daily Calories for Weight Loss (kcal)", "n"], ["cupsPerDay", "Cups of Food per Day", "n"], ["treatCaloriesMax", "Treat Allowance (kcal, 10%)", "n"], ["weeklyLoss", "Loss in First Week", "n"], ["weeksToGoal", "Weeks to Goal", "n"], ["totalToLose", "Total to Lose", "n"]],
    fn: E.dogWeightLoss, ex: { weightUnit: 0, currentWeight: 70, targetWeight: 60, weeklyRate: 1.5, kcalPerCup: 350 },
    exText: (o) => `Example: a 70 lb dog slimming to 60 lb needs about ${o.dailyCalories} kcal a day (${o.cupsPerDay} cups of a 350 kcal/cup food) and should reach goal in about ${o.weeksToGoal} weeks.`,
    how: "Enter current and ideal weight (from the Dog BMI calculator), the safe weekly loss rate and your food's kcal per cup from the bag.",
    assume: "Weight-loss energy = 1.0 × RER at target weight (RER = 70 × kg^0.75), aiming for 1–2% loss per week. Recheck weight every 2–4 weeks and adjust by 10%.",
    faq: [["How many calories should a dog eat to lose weight?", "About 1.0 × resting energy at its ideal weight — roughly 1,000 kcal for a dog whose ideal weight is 60 lb."]],
  }),
  mk({
    slug: "cat-weight-loss-calculator", title: "Cat Weight Loss Calculator (Calories to Lose Weight)",
    desc: "Plan safe weight loss for a cat — daily calories at 0.8 × RER of target weight, cups or cans, treat allowance, weekly loss and weeks to goal.",
    meta: "Cat Calorie Calculator to Lose Weight",
    inputs: [WUNIT, num("currentWeight", "Current Weight", 15, 40, 0.1), num("targetWeight", "Target (Ideal) Weight", 11, 40, 0.1), pct("weeklyRate", "Target Loss per Week (% of body weight)", 1, 2, 0.1), num("kcalPerCup", "Food Calories per Cup (kcal)", 400, 1000, 1)],
    results: [["dailyCalories", "Daily Calories for Weight Loss (kcal)", "n"], ["cupsPerDay", "Cups of Food per Day", "n"], ["treatCaloriesMax", "Treat Allowance (kcal, 10%)", "n"], ["weeklyLoss", "Loss in First Week", "n"], ["weeksToGoal", "Weeks to Goal", "n"], ["totalToLose", "Total to Lose", "n"]],
    fn: E.catWeightLoss, ex: { weightUnit: 0, currentWeight: 15, targetWeight: 11, weeklyRate: 1, kcalPerCup: 400 },
    exText: (o) => `Example: a 15 lb cat slimming to 11 lb should eat about ${o.dailyCalories} kcal a day and lose roughly ${o.weeklyLoss} lb a week, reaching goal in about ${o.weeksToGoal} weeks.`,
    how: "Enter current and target weight and your food's calories. Never let a cat go without food — rapid loss can cause fatal fatty liver (hepatic lipidosis).",
    assume: "Weight-loss energy = 0.8 × RER at target weight; safe loss 0.5–2% per week (aim ~1%).",
    faq: [["How fast should a cat lose weight?", "About 1% of body weight a week — never more than 2%."]],
  }),
  mk({
    slug: "dog-exercise-calculator", title: "Dog Exercise Calculator",
    desc: "Find how much exercise your dog needs each day by energy level and age — puppy 5-minute rule, adults and seniors — with walks per day, minutes per walk and miles.",
    inputs: [dropdown("stage", "Age", opts(["Puppy (under 12 months)", "Adult", "Senior"]), 1), num("ageMonths", "Age (months, for puppies)", 4, 12, 1), dropdown("energy", "Breed Energy Level", opts(["Low (Bulldog, Basset, Shih Tzu)", "Moderate (Labrador, Golden, Beagle)", "High (Border Collie, Husky, Aussie)", "Working / sporting"]), 1), yn("weightLoss", "On a Weight-Loss Plan?"), yn("brachycephalic", "Flat-Faced Breed?")],
    results: [["minutesPerDay", "Exercise per Day (min)", "n"], ["walksPerDay", "Walks per Day", "n"], ["minutesPerWalk", "Minutes per Walk", "n"], ["milesPerDayAtWalkingPace", "Miles per Day at Walking Pace", "n"], ["weeklyHours", "Hours per Week", "n"]],
    fn: E.dogExercise, ex: { stage: 1, ageMonths: 4, energy: 1, weightLoss: 0, brachycephalic: 0 },
    exText: (o) => `Example: an adult moderate-energy dog needs about ${o.minutesPerDay} minutes a day — ${o.walksPerDay} walks of ${o.minutesPerWalk} minutes.`,
    how: "Choose life stage and energy level. Mental exercise (sniffing, puzzle toys, training) counts too.",
    assume: "Puppies: about 5 minutes of structured exercise per month of age, twice daily. Flat-faced breeds and hot weather need shorter, gentler sessions.",
    faq: [["How much exercise does a dog need?", "Most adult dogs need 30–120 minutes a day depending on breed and age."]],
  }),
  mk({
    slug: "puppy-height-calculator", title: "Puppy Height Calculator",
    desc: "Predict how tall your puppy will be at the shoulder from current height, age and breed or size — with share of adult height and expected height at 6 months.",
    inputs: [BREED(16), SIZE5(3), dropdown("heightUnit", "Height Unit", opts(["Inches", "Centimeters"]), 0), num("currentHeight", "Current Shoulder Height", 14, 100, 0.1), num("ageWeeks", "Age (weeks)", 16, 104, 1, 1)],
    results: [["predictedAdultHeight", "Predicted Adult Height", "n"], ["percentOfAdultHeight", "Height Reached So Far", "p"], ["heightAt6Months", "Expected Height at 6 Months", "n"], ["adultHeightCm", "Adult Height (cm)", "n"]],
    fn: E.puppyHeight, ex: { breed: 16, size: 3, heightUnit: 0, currentHeight: 14, ageWeeks: 16 },
    exText: (o) => `Example: a 16-week-old German Shepherd standing 14 in at the shoulder should reach about ${o.predictedAdultHeight} in.`,
    how: "Measure from the floor to the top of the shoulder blades with your puppy standing square.",
    assume: "Height grows faster than weight — share of adult height ≈ square root of share of adult weight (most dogs reach ~75% of adult height by 6 months).",
    faq: [["How tall will my puppy be?", "Roughly 75% of adult height by 6 months — divide the 6-month height by 0.75."]],
  }),
  mk({
    slug: "puppy-paw-size-calculator", title: "Puppy Paw Size Calculator",
    desc: "Estimate your puppy's adult size from front paw width and age — a fun rule-of-thumb predictor with estimated adult weight and size category.",
    inputs: [dropdown("unit", "Unit", opts(["Inches", "Centimeters"]), 0), num("pawWidth", "Front Paw Width", 2, 12, 0.05), num("ageWeeks", "Age (weeks)", 12, 52, 1, 1)],
    results: [["estimatedAdultWeightLb", "Estimated Adult Weight (lb)", "n"], ["estimatedAdultWeightKg", "Estimated Adult Weight (kg)", "n"], ["adultPawWidthIn", "Estimated Adult Paw Width (in)", "n"], ["sizeCategory", "Size (1 toy · 2 small · 3 medium · 4 large · 5 giant)", "n"]],
    fn: E.pawSize, ex: { unit: 0, pawWidth: 2, ageWeeks: 12 },
    exText: (o) => `Example: a 12-week-old puppy with 2 in wide front paws may grow to about ${o.estimatedAdultWeightLb} lb.`,
    how: "Measure the widest part of a front paw with the puppy standing. For a better estimate, use the Puppy Weight Calculator.",
    assume: "Paws reach ~75% of adult width by 12 weeks; adult paw width is mapped to typical adult weights. Paw size is only a loose predictor.",
    faq: [["Do big paws mean a big dog?", "Often, but not always — weight at a known age is a much better predictor."]],
  }),
  mk({
    slug: "dog-pregnancy-calculator", title: "Dog Pregnancy Calculator (Due Date Week by Week)",
    desc: "Calculate your dog's whelping date from the breeding date, LH surge (LH day) or ovulation date — with the due window, ultrasound and x-ray dates, current week and days to go.",
    meta: "Dog Pregnancy Calculator — Due Date Week by Week",
    inputs: [dropdown("basedOn", "Date You Know", opts(["Breeding / mating date", "LH surge (LH day 0)", "Ovulation date"]), 0), dateField("eventDate", "Date", "today-21")],
    results: [["dueDate", "Estimated Whelping Date", "d"], ["earliestDue", "Earliest Likely", "d"], ["latestDue", "Latest Likely", "d"], ["ultrasoundFrom", "Ultrasound Confirmation From", "d"], ["xrayFrom", "X-Ray Puppy Count From", "d"], ["startTemperatureChecks", "Start Temperature Checks", "d"], ["currentWeek", "Week of Pregnancy Today", "n"], ["daysToDue", "Days to Due Date", "n"]],
    fn: E.dogPregnancy, ex: { basedOn: 0, eventDate: D0 },
    exText: () => `Example: a dog bred on 2 Nov 2026 is due around 4 January 2027 (63 days), with an ultrasound from about 27 November.`,
    how: "Choose which date you know. LH-surge and ovulation dates from progesterone testing are far more accurate than mating dates. Works for Dachshunds, Yorkies and any breed.",
    assume: "Whelping 63 ± 5 days from breeding, 65 days from the LH surge, 63 days from ovulation. Ultrasound from ~day 25, x-ray from ~day 45 (skeletons visible). A temperature drop below ~99 °F usually means labor within 24 hours.",
    faq: [["How long are dogs pregnant?", "About 63 days (9 weeks), ranging from 58 to 68 days from breeding."], ["What is LH day in dogs?", "The day of the luteinizing hormone surge; ovulation follows about 2 days later and puppies arrive about 65 days after it."]],
  }),
  mk({
    slug: "cat-pregnancy-calculator", title: "Cat Pregnancy Calculator (Due Date)",
    desc: "Calculate when your cat's kittens are due from the mating date — the 65-day gestation and due window, ultrasound and x-ray dates, nesting time and days to go.",
    inputs: [dateField("breedingDate", "Mating Date", "today-14")],
    results: [["dueDate", "Estimated Due Date", "d"], ["earliestDue", "Earliest Likely", "d"], ["latestDue", "Latest Likely", "d"], ["ultrasoundFrom", "Ultrasound From", "d"], ["xrayFrom", "X-Ray Kitten Count From", "d"], ["nestingFrom", "Nesting Behavior From", "d"], ["daysPregnant", "Days Pregnant Today", "n"], ["daysToDue", "Days to Due Date", "n"]],
    fn: E.catPregnancy, ex: { breedingDate: D0 },
    exText: () => `Example: a cat mated on 2 Nov 2026 is due around 6 January 2027.`,
    how: "Enter the mating date (or the first day of the heat she was with a tom).",
    assume: "Feline gestation averages 63–67 days (65 used here; range ~61–72). Ultrasound from ~day 15, x-ray from ~day 45.",
    faq: [["How long are cats pregnant?", "About 9 weeks — 63 to 67 days."]],
  }),
  mk({
    slug: "rabbit-gestation-calculator", title: "Rabbit Gestation Calculator",
    desc: "Calculate when a doe rabbit will kindle — the 31-day gestation and window, when to palpate and when to put in the nest box.",
    inputs: [dateField("breedingDate", "Breeding Date", "today-7")],
    results: [["dueDate", "Estimated Kindling Date", "d"], ["earliestDue", "Earliest Likely", "d"], ["latestDue", "Latest Likely", "d"], ["palpateFrom", "Palpate for Pregnancy From", "d"], ["nestBoxIn", "Put Nest Box In", "d"], ["daysToDue", "Days to Kindling", "n"]],
    fn: E.rabbitGestation, ex: { breedingDate: D0 },
    exText: () => `Example: a doe bred on 2 Nov 2026 should kindle around 3 December 2026; add the nest box around 30 November.`,
    how: "Enter the breeding date.",
    assume: "Rabbit gestation 31 days (28–35). Palpation from about day 10–14; nest box on day 27–28. Contact a vet if no kits by day 33.",
    faq: [["How long are rabbits pregnant?", "About a month — 31 days on average."]],
  }),
  mk({
    slug: "guinea-pig-gestation-calculator", title: "Guinea Pig Gestation Calculator",
    desc: "Calculate a guinea pig sow's due date — the 68-day gestation and range — and when to separate the boar to prevent an immediate re-breeding.",
    inputs: [dateField("breedingDate", "Date Boar and Sow Were Together", "today-21")],
    results: [["dueDate", "Estimated Due Date", "d"], ["earliestDue", "Earliest Likely", "d"], ["latestDue", "Latest Likely", "d"], ["separateBoarBy", "Separate the Boar By", "d"], ["daysToDue", "Days to Due Date", "n"]],
    fn: E.guineaPigGestation, ex: { breedingDate: D0 },
    exText: () => `Example: a sow bred on 2 Nov 2026 is due around 9 January 2027.`,
    how: "Enter the date the pair was together. Sows can re-breed within hours of giving birth.",
    assume: "Guinea pig gestation 59–72 days (average ~68). First pregnancies after about 7–8 months old risk dystocia because the pelvis fuses.",
    faq: [["How long is a guinea pig pregnant?", "About 9–10 weeks (59–72 days)."]],
  }),
  mk({
    slug: "donkey-gestation-calculator", title: "Donkey Gestation Calculator",
    desc: "Calculate a jenny's foaling date — about 12 months for standard donkeys and slightly less for miniatures — with the wide foaling window, pregnancy check and pre-foaling vaccination date.",
    inputs: [dateField("breedingDate", "Breeding Date", "today-30"), dropdown("type", "Donkey Type", opts(["Standard / large donkey", "Miniature donkey"]), 0)],
    results: [["dueDate", "Estimated Foaling Date", "d"], ["earliestDue", "Earliest Likely", "d"], ["latestDue", "Latest Likely", "d"], ["pregnancyCheckFrom", "Ultrasound Check From", "d"], ["vaccinateBy", "Pre-Foaling Vaccines By", "d"], ["daysToDue", "Days to Foaling", "n"]],
    fn: E.donkeyGestation, ex: { breedingDate: D0, type: 0 },
    exText: () => `Example: a jenny bred on 2 Nov 2026 is due around 2 November 2027 — but anywhere from mid-October to late November is normal.`,
    how: "Enter the breeding date. Donkey gestation is long and variable, so start foal watch a month early.",
    assume: "Average donkey gestation ~12 months (11–14 months, about 340–395 days); miniature donkeys average ~11.5–12 months. Vaccinate 4–6 weeks before foaling.",
    faq: [["How long is a donkey pregnant?", "About 12 months, often longer than a horse."]],
  }),
  mk({
    slug: "egg-incubation-calculator", title: "Chicken Egg Incubation Calculator",
    desc: "Calculate the hatch date for chicken, duck, Muscovy, goose, turkey, quail, guinea fowl or peafowl eggs — candling days, lockdown date and incubator temperature.",
    meta: "Chicken Incubation Calculator — Hatch Date & Lockdown",
    inputs: [dropdown("species", "Bird", opts(E.INCUBATION.map(([n, d]) => `${n} (${d} days)`)), 0), dateField("setDate", "Date Eggs Were Set")],
    results: [["hatchDate", "Expected Hatch Date", "d"], ["firstCandling", "First Candling", "d"], ["secondCandling", "Second Candling", "d"], ["lockdownDate", "Lockdown (stop turning, raise humidity)", "d"], ["incubationDays", "Incubation Period (days)", "n"], ["temperatureF", "Forced-Air Incubator Temperature (°F)", "n"], ["dayOfIncubationToday", "Day of Incubation Today", "n"]],
    fn: E.incubation, ex: { species: 0, setDate: D0 },
    exText: () => `Example: chicken eggs set on 2 Nov 2026 should hatch around 23 November, with lockdown on 20 November.`,
    how: "Choose the bird and the date you set the eggs.",
    assume: "Forced-air incubators at 99.5 °F (still-air ~101–102 °F at egg top); humidity ~45–55% then 65–70% at lockdown. Turn eggs 3–5 times daily until lockdown.",
    faq: [["How long do chicken eggs take to hatch?", "21 days at 99.5 °F."]],
  }),
  mk({
    slug: "dog-heat-cycle-calculator", title: "Dog Heat Cycle Calculator",
    desc: "Predict your dog's next heat (season) from the last one — fertile window, when the heat ends and the following cycle — by size or your dog's own interval.",
    inputs: [dateField("lastHeatStart", "First Day of Last Heat", "today-150"), SIZE5(2), num("intervalMonths", "Your Dog's Usual Interval (months, 0 = typical)", 0, 18, 0.5)],
    results: [["nextHeatStart", "Next Heat Starts About", "d"], ["fertileWindowStart", "Fertile Window Starts", "d"], ["fertileWindowEnd", "Fertile Window Ends", "d"], ["heatEnds", "Heat Ends About", "d"], ["followingHeatStart", "Following Heat", "d"], ["currentCycleFertileStart", "Last Cycle's Fertile Days Began", "d"], ["intervalMonths", "Interval Used (months)", "n"]],
    fn: E.dogHeatCycle, ex: { lastHeatStart: D0, size: 2, intervalMonths: 0 },
    exText: () => `Example: a medium dog whose last heat began 2 Nov 2026 will likely come into heat again around early May 2027, with fertile days roughly days 10–15.`,
    how: "Enter the first day of bleeding/swelling of the last heat. Use progesterone testing to time breeding precisely.",
    assume: "Most dogs cycle every 6–7 months (small breeds as often as 4–5, giant breeds every 12–18). Heat lasts ~2–3 weeks; most fertile around days 9–14.",
    faq: [["How often do dogs go into heat?", "About twice a year, usually every 6–7 months."]],
  }),
  mk({
    slug: "dog-ovulation-calculator", title: "Dog Ovulation Calculator (Progesterone Timing)",
    desc: "Time dog breeding from a progesterone test — estimated ovulation date, best breeding days for natural, fresh, chilled or frozen semen, whelping date and when to retest.",
    inputs: [num("progesterone", "Progesterone Result (ng/mL)", 5, 50, 0.1), dateField("testDate", "Test Date"), dropdown("breedingMethod", "Breeding Method", opts(["Natural breeding", "Fresh AI", "Chilled semen", "Frozen semen"]), 0)],
    results: [["estimatedOvulationDate", "Estimated Ovulation", "d"], ["bestBreedingStart", "Best Breeding From", "d"], ["bestBreedingEnd", "Best Breeding Until", "d"], ["whelpingDate", "Expected Whelping", "d"], ["stage", "Stage (1 baseline · 2 LH surge · 3 ovulating · 4 post-ovulation)", "n"], ["retestInDays", "Retest In (days, 0 = no)", "n"]],
    fn: E.dogOvulation, ex: { progesterone: 5, testDate: D0, breedingMethod: 0 },
    exText: () => `Example: a progesterone of 5 ng/mL on 2 Nov 2026 suggests ovulation that day — breed naturally about 4–6 November; puppies due around 4 January 2027.`,
    how: "Enter the latest progesterone result from your vet. Labs differ — follow your reproduction vet's interpretation.",
    assume: "Typical interpretation (ng/mL): < 2 baseline, 2–3 LH surge (ovulation ~2 days later), 4–10 ovulation, > 10 after ovulation. Eggs need ~2 days to mature after ovulation; frozen semen is inseminated later. Whelping ≈ 63 days after ovulation.",
    faq: [["What progesterone level means a dog is ovulating?", "Roughly 4–10 ng/mL; breeding is best about 2–4 days after ovulation."]],
  }),
  mk({
    slug: "dog-color-genetics-calculator", title: "Dog Coat Color Genetics Calculator",
    desc: "Predict puppy coat colors from the parents' B (brown/liver), D (dilute/blue) and E (yellow/red) genotypes — percent black, liver, blue, isabella/lilac and yellow puppies.",
    meta: "Dog Color Genetics Calculator — Puppy Coat Color Odds",
    inputs: [GENO("sireB", "Sire — B locus", 1, ["B/B (no brown)", "B/b (carries brown)", "b/b (brown / liver)"]), GENO("damB", "Dam — B locus", 1, ["B/B", "B/b", "b/b"]), GENO("sireD", "Sire — D locus", 0, ["D/D (no dilute)", "D/d (carries dilute)", "d/d (dilute)"]), GENO("damD", "Dam — D locus", 1, ["D/D", "D/d", "d/d"]), GENO("sireE", "Sire — E locus", 1, ["E/E (no yellow)", "E/e (carries yellow)", "e/e (yellow / red)"]), GENO("damE", "Dam — E locus", 1, ["E/E", "E/e", "e/e"])],
    results: [["blackPercent", "Black (or black-based)", "p"], ["liverChocolatePercent", "Liver / Chocolate", "p"], ["bluePercent", "Blue", "p"], ["isabellaLilacPercent", "Isabella / Lilac", "p"], ["yellowRedCreamPercent", "Yellow / Red / Cream (e/e)", "p"], ["carriesChocolatePercent", "Puppies Carrying Brown (B/b)", "p"]],
    fn: E.dogColor, ex: { sireB: 1, damB: 1, sireD: 0, damD: 1, sireE: 1, damE: 1 },
    exText: (o) => `Example: two black parents that both carry brown and yellow (one also carries dilute) produce about ${o.blackPercent}% black, ${o.liverChocolatePercent}% liver and ${o.yellowRedCreamPercent}% yellow puppies.`,
    how: "Enter each parent's genotype from a DNA test (Embark, Wisdom Panel, UC Davis) — color alone can hide carried genes.",
    assume: "Independent Mendelian loci: E/e masks B and D in e/e (yellow) dogs; b/b = liver/chocolate, d/d = dilute (blue, isabella). Other genes (K, A, merle, spotting) also affect appearance and aren't modeled.",
    faq: [["Can two black dogs have chocolate puppies?", "Yes — if both carry the brown gene (B/b), about 25% of puppies will be chocolate."]],
  }),
  mk({
    slug: "cat-coat-color-calculator", title: "Cat Coat Color Calculator (Maine Coon & Other Breeds)",
    desc: "Predict kitten colors from the parents — red/orange, cream, black, blue, tortoiseshell and blue-cream — using the sex-linked orange gene and dilute gene, by kitten sex.",
    meta: "Maine Coon Color Calculator — Kitten Coat Colors",
    inputs: [dropdown("sireOrange", "Sire's Color", opts(["Black-based (black / blue)", "Red-based (red / cream)"]), 0), dropdown("damOrange", "Dam's Color", opts(["Black-based (o/o)", "Tortoiseshell (O/o)", "Red-based (O/O)"]), 1), GENO("sireD", "Sire — Dilute", 1, ["D/D (dense)", "D/d (dense, carries dilute)", "d/d (dilute: blue / cream)"]), GENO("damD", "Dam — Dilute", 1, ["D/D", "D/d", "d/d"])],
    results: [["maleRed", "Male — Red", "p"], ["maleCream", "Male — Cream", "p"], ["maleBlack", "Male — Black", "p"], ["maleBlue", "Male — Blue", "p"], ["femaleTortie", "Female — Tortoiseshell", "p"], ["femaleBlueCreamTortie", "Female — Blue-Cream (dilute tortie)", "p"], ["femaleRed", "Female — Red", "p"], ["femaleCream", "Female — Cream", "p"], ["femaleBlack", "Female — Black", "p"], ["femaleBlue", "Female — Blue", "p"]],
    fn: E.catColor, ex: { sireOrange: 0, damOrange: 1, sireD: 1, damD: 1 },
    exText: (o) => `Example: a black male (carrying dilute) bred to a tortie female (carrying dilute): male kittens are ${o.maleRed}% red and ${o.maleBlack}% black; females ${o.femaleTortie}% tortie.`,
    how: "Enter each parent's base color (white and patterns like tabby or white spotting sit on top of these colors).",
    assume: "The orange gene is on the X chromosome: males show one allele, females can be tortoiseshell. Dilute is autosomal recessive. Percentages are within each sex. Dominant white, tabby, colorpoint and silver genes are not modeled.",
    faq: [["Can a male cat be tortoiseshell?", "Very rarely — only with an extra X chromosome (XXY), and those males are usually sterile."]],
  }),
  mk({
    slug: "rabbit-color-calculator", title: "Rabbit Color Genetics Calculator",
    desc: "Predict rabbit kit colors from the parents' A (agouti), B (chocolate) and D (dilute) genotypes — chestnut, opal, chocolate agouti, lynx, black, blue, chocolate and lilac.",
    inputs: [GENO("sireA", "Buck — A locus", 1, ["A/A (agouti)", "A/a (agouti, carries self)", "a/a (self)"]), GENO("damA", "Doe — A locus", 1, ["A/A", "A/a", "a/a"]), GENO("sireB", "Buck — B locus", 1, ["B/B (black-based)", "B/b (carries chocolate)", "b/b (chocolate)"]), GENO("damB", "Doe — B locus", 1, ["B/B", "B/b", "b/b"]), GENO("sireD", "Buck — D locus", 1, ["D/D (dense)", "D/d (carries dilute)", "d/d (dilute)"]), GENO("damD", "Doe — D locus", 0, ["D/D", "D/d", "d/d"])],
    results: [["chestnutAgouti", "Chestnut Agouti", "p"], ["opal", "Opal", "p"], ["chocolateAgouti", "Chocolate Agouti", "p"], ["lynx", "Lynx", "p"], ["black", "Black (self)", "p"], ["blue", "Blue", "p"], ["chocolate", "Chocolate", "p"], ["lilac", "Lilac", "p"]],
    fn: E.rabbitColor, ex: { sireA: 1, damA: 1, sireB: 1, damB: 1, sireD: 1, damD: 0 },
    exText: (o) => `Example: two chestnut parents carrying self and chocolate (buck also carries dilute) give about ${o.chestnutAgouti}% chestnut, ${o.black}% black and ${o.chocolate}% chocolate kits.`,
    how: "Enter known genotypes from pedigrees or test breedings.",
    assume: "Independent A, B and D loci with simple dominance. C (chinchilla/REW), E (extension) and En (broken) also change appearance and aren't modeled.",
    faq: [["What colors can two chestnut rabbits produce?", "If both carry recessives, they can produce black, chocolate, blue, lilac, opal and lynx kits as well."]],
  }),
  mk({
    slug: "inbreeding-coefficient-calculator", title: "Inbreeding Coefficient (COI) Calculator",
    desc: "Calculate Wright's coefficient of inbreeding (COI) for a planned litter of dogs, cats, horses or livestock from up to four common-ancestor paths, including ancestors' own inbreeding.",
    meta: "Inbreeding Calculator — Coefficient of Inbreeding (COI)",
    inputs: [1, 2, 3, 4].flatMap((i) => [num(`sireGen${i}`, `Common Ancestor ${i} — Generations Back on Sire's Side (0 = none)`, [1, 2, 0, 0][i - 1], 20), num(`damGen${i}`, `Common Ancestor ${i} — Generations Back on Dam's Side`, [1, 2, 0, 0][i - 1], 20), pct(`ancestorCoi${i}`, `Common Ancestor ${i} — Own COI`, 0, 100, 0.1)]),
    results: [["coiPercent", "Coefficient of Inbreeding (COI %)", "p"], ["commonAncestorPaths", "Common Ancestor Paths Counted", "n"], ["equivalentRelationship", "Comparable To (1 cousins · 2 half-siblings × … · 3 half-siblings · 4 full siblings)", "n"]],
    fn: E.inbreeding, ex: { sireGen1: 1, damGen1: 1, ancestorCoi1: 0, sireGen2: 2, damGen2: 2, ancestorCoi2: 0, sireGen3: 0, damGen3: 0, ancestorCoi3: 0, sireGen4: 0, damGen4: 0, ancestorCoi4: 0 },
    exText: (o) => `Example: a mating where sire and dam share a parent (1 generation back on each side) and a grandparent (2 back) has a COI of about ${o.coiPercent}%.`,
    how: "For each ancestor appearing on both sides of the pedigree, count generations from the sire to that ancestor and from the dam to it (a parent = 1). Enter each separate path.",
    assume: "Wright's formula: COI = Σ (½)^(n₁ + n₂ + 1) × (1 + F_A). Half-sibling matings give 12.5%, full siblings or parent–offspring 25%. Many breed clubs advise keeping 10-generation COI under ~5–6%.",
    faq: [["What is a good COI for dogs?", "Lower is better; under about 5% over 10 generations is a common goal."]],
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
