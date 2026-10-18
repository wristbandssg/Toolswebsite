// One-time (but safe to re-run) batch setup script: creates 60 personal injury and settlement
// calculators (Law & Government Calculators > Personal Injury & Settlement Calculators). The
// claim model, injury severity scales and accident rules live in src/lib/calc-engine-law-pi.ts;
// copy and examples are generated from them so they always match the calculator.
// Merged keywords (covered here, no separate page): Settlement, How Much Is My (Personal Injury)
// Case / Claim Worth, Average / How Is / Best Personal Injury, Injury Payout / Cost, Claim Payout,
// Compensation Math, Case Value for Accident Claims, Case Compensation, Case Connect, Get Max
// Settlement, Insurance (Injury) Compensation, Demand Letter, Reasonable Compensation (PI sense),
// California Personal Injury → personal-injury-settlement; California / Texas Pain and Suffering →
// pain-and-suffering; Crash Compensation, Auto Claim, MVA, Car Settlement and the California /
// Georgia / Texas / Ohio car accident keywords → car-accident-settlement (fault rule input);
// Commercial Truck → truck; Motorcycle Accident Claim → motorcycle; Rear End Settlement → rear-end;
// Fall Compensation, Slip Fall, Michigan Slip and Fall → slip-and-fall; DUI Cost → dui-accident;
// Misdiagnosis / Cancer Misdiagnosis → medical-malpractice; Birth Negligence → birth-injury;
// Asbestos Cancer Lawsuit → mesothelioma; Back Pain / Back Injury → back-injury; Whiplash (Injury)
// → whiplash; Bulging Disc → herniated-disc; Head Injury, Brain Injury, Concussion → tbi; Facial
// Scar / Scarring → scar; Tinnitus, Hearing Loss Compensation → hearing-loss; Stress Compensation
// → psychological-injury; Multiple Injury → personal-injury-settlement; Facebook, BCBS, Opioid
// (individuals), Maui Wildfire, MDL, Data Breach, AI and USAA settlement payouts → class-action-
// settlement-payout; California Lemon Law → lemon-law-buyback; Loss of Earnings (Compensation),
// Future Loss of Earnings, Lost Wage, Wage Loss → lost-wages; Criminal Compensation, Victim (Support)
// Compensation → crime-victim-compensation; Criminal Injuries (Compensation), CICA Loss of
// Earnings, Sexual Abuse / Assault Compensation → cica; Flight (Delay) Compensation UK, EU261 →
// eu261-flight-compensation; Accident at Work UK, NHS Compensation, Road (Traffic) Accident / RTA
// Compensation, Child Compensation, Dental Negligence → uk-personal-injury-compensation.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-pi-calculators.ts
// or
//   npm run db:create-law-pi-calculators

import * as E from "../src/lib/calc-engine-law-pi";

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

const CAT = "personal-injury-settlement-calculators";
const DISCLAIMER = "This is a rough estimate for negotiation planning, not legal advice — real settlements depend on evidence, liability, insurance and venue, and many cases settle for more or less.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const T = (t: ToolDef) => t;

const CLAIM_RESULTS = [
  { key: "estimatedSettlement", label: "Estimated Settlement Value", format: "currency", highlight: true },
  { key: "painAndSuffering", label: "Pain & Suffering", format: "currency" },
  { key: "specialDamages", label: "Economic (Special) Damages", format: "currency" },
  { key: "afterFaultReduction", label: "After Your Share of Fault", format: "currency" },
  { key: "attorneyFee", label: "Attorney Fee", format: "currency" },
  { key: "netToYou", label: "Net to You (after fees, costs, liens)", format: "currency" },
  { key: "lowEstimate", label: "Likely Range — Low", format: "currency" },
  { key: "highEstimate", label: "Likely Range — High", format: "currency" },
];

const claimInputs = (opts: { severity: [string, number, number][]; property?: boolean; punitive?: boolean; extra?: Record<string, unknown>[]; defaults?: Partial<Record<string, number>> }) => {
  const d = { medicalBills: 18000, lostWages: 6000, futureCosts: 0, propertyDamage: 0, ...opts.defaults };
  return [
    currencyField("medicalBills", "Medical Bills (billed or paid amount)", { default: d.medicalBills, max: 10000000, step: 100 }),
    currencyField("lostWages", "Lost Wages", { default: d.lostWages, max: 10000000, step: 100 }),
    currencyField("futureCosts", "Future Medical / Care Costs", { default: d.futureCosts, max: 50000000, step: 500 }),
    ...(opts.property ? [currencyField("propertyDamage", "Property Damage (vehicle, etc.)", { default: d.propertyDamage, max: 1000000, step: 100 })] : []),
    dropdown("severity", "Injury Severity", opts.severity.map(([l, lo, hi], i) => [`${l} (×${lo}–${hi})`, i] as [string, number]), 1),
    numberField("multiplierOverride", "Your Own Multiplier (0 = use severity)", { default: 0, max: 15, step: 0.25 }),
    ...(opts.punitive ? [currencyField("punitiveDamages", "Punitive Damages (if likely)", { default: 0, max: 100000000, step: 1000 })] : []),
    ...(opts.extra ?? []),
    dropdown("faultRule", "Your State's Fault Rule", E.FAULT_RULES, 0),
    percentField("yourFaultPercent", "Your Share of Fault", { default: 0, step: 5 }),
    currencyField("policyLimit", "At-Fault Party's Policy Limit (0 = no limit)", { default: 0, max: 100000000, step: 5000 }),
    percentField("attorneyFeePercent", "Attorney Fee", { default: 33.33, max: 50, step: 0.5 }),
    currencyField("caseCosts", "Case Costs (records, experts, filing)", { default: 0, max: 1000000, step: 100 }),
    currencyField("medicalLiens", "Medical Liens / Health Plan Reimbursement", { default: 0, max: 10000000, step: 100 }),
  ];
};
const claimEx = (extra: Record<string, number> = {}) => ({ medicalBills: 18000, lostWages: 6000, futureCosts: 0, propertyDamage: 0, severity: 1, multiplierOverride: 0, punitiveDamages: 0, faultRule: 0, yourFaultPercent: 0, policyLimit: 0, attorneyFeePercent: 33.33, caseCosts: 0, medicalLiens: 0, ...extra });

function injuryTool(t: E.InjuryType): ToolDef {
  const ex = r(E.injurySettlement(t), claimEx({ severity: 1 }));
  const short = t.name.replace(/ \(.*\)$/, "");
  return {
    slug: t.slug,
    title: `${t.name} Settlement Calculator`.replace("Compensation Settlement", "Compensation").replace(" Settlement Calculator", t.slug.includes("compensation") ? " Compensation Calculator" : t.slug.includes("claim") ? " Claim Calculator" : " Settlement Calculator"),
    description: `Estimate a ${short.toLowerCase()} settlement — medical bills, lost wages and pain and suffering by severity (${t.levels.map(([l]) => l.toLowerCase()).join(", ")}), adjusted for fault, policy limits and attorney fees.`,
    metaTitle: `${short} Settlement Calculator — Claim Value by Severity`.slice(0, 70),
    metaDescription: `Free ${short.toLowerCase()} settlement calculator. Pain and suffering multipliers by severity, fault, policy limits and your net after fees.`,
    calcInputs: claimInputs({ severity: t.levels }),
    calcResult: { label: "Estimated Settlement Value", format: "currency" },
    calcResults: [...CLAIM_RESULTS, { key: "multiplierUsed", label: "Pain & Suffering Multiplier Used", format: "number" }],
    instructions: `Add up your medical bills for the ${short.toLowerCase()} (ER, imaging, doctors, therapy, surgery) and lost wages, plus expected future care. Pick the severity that matches your diagnosis and treatment. ${t.note}`,
    examples: `Example: ${usd(18000)} of medical bills and ${usd(6000)} of lost wages for a ${t.levels[1][0].toLowerCase()} (multiplier ×${ex.multiplierUsed}) points to about ${usd(ex.estimatedSettlement)} — roughly ${usd(ex.netToYou)} after a one-third fee.`,
    assumptions: `Pain and suffering is estimated as medical costs × a severity multiplier (${t.levels.map(([l, lo, hi]) => `${l.toLowerCase()} ×${lo}–${hi}`).join("; ")} — the midpoint is used unless you set your own). Your fault reduces the total under your state's rule; the at-fault party's insurance limit often caps what's realistically collectible. ${DISCLAIMER}`,
    faq: [
      { question: `What is the average ${short.toLowerCase()} settlement?`, answer: `It ranges widely — from a few thousand dollars for ${t.levels[0][0].toLowerCase()} to six figures or more for ${t.levels[t.levels.length - 1][0].toLowerCase()} — driven mostly by medical treatment, lasting effects and insurance limits.` },
      { question: "How is pain and suffering calculated?", answer: "Insurers and lawyers commonly multiply medical costs by 1.5 to 5 (higher for permanent injuries) or use a daily rate for each day of pain." },
    ],
  };
}

interface AccidentSpec { slug: string; title: string; what: string; note: string; fn: E.CustomCalculator; property?: boolean; punitive?: boolean; extra?: Record<string, unknown>[]; exExtra?: Record<string, number>; faq: { question: string; answer: string }[]; defaults?: Partial<Record<string, number>> }
const ACCIDENTS: AccidentSpec[] = [
  { slug: "personal-injury-settlement-calculator", title: "Personal Injury Settlement Calculator", what: "any personal injury claim", note: "Use the injury- and accident-specific calculators in this category for tailored severity scales.", fn: E.generalSettlement, property: true, faq: [{ question: "How much is my personal injury case worth?", answer: "A common starting point is economic damages plus 1.5–5 × medical costs for pain and suffering, reduced by your share of fault and limited by available insurance." }, { question: "What is the average personal injury settlement?", answer: "Most settle for $3,000–$75,000; serious injuries with surgery or permanent harm reach six or seven figures." }] },
  { slug: "car-accident-settlement-calculator", title: "Car Accident Settlement Calculator", what: "a car accident injury claim", note: "Set your state's fault rule: California, New York and Florida use pure comparative fault; Texas, Ohio and Illinois bar recovery at 51%; Georgia at 50%; Virginia and Maryland any fault.", fn: E.accidentSettlement(), property: true, faq: [{ question: "How much is a car accident settlement worth?", answer: "Medical bills, lost wages and vehicle damage plus pain and suffering (often 1.5–5 × medical costs), reduced for your fault and limited by the other driver's policy." }, { question: "What if the other driver's insurance isn't enough?", answer: "Your own underinsured motorist coverage can pay the difference — see the uninsured motorist calculator." }] },
  { slug: "truck-accident-settlement-calculator", title: "Truck Accident Settlement Calculator", what: "a commercial truck (18-wheeler) accident claim", note: "Trucking companies carry at least $750,000 of liability insurance (more for hazardous loads), so serious claims are less often capped by limits; FMCSA violations strengthen liability.", fn: E.accidentSettlement(), property: true, defaults: { medicalBills: 60000, lostWages: 20000 }, exExtra: { medicalBills: 60000, lostWages: 20000, severity: 2 }, faq: [{ question: "Are truck accident settlements bigger than car accidents?", answer: "Usually — injuries are more severe and trucking companies carry $750,000 to several million in coverage." }, { question: "Who can be liable in a truck accident?", answer: "The driver, the carrier, the shipper/loader and maintenance companies can all share liability." }] },
  { slug: "motorcycle-accident-settlement-calculator", title: "Motorcycle Accident Settlement Calculator", what: "a motorcycle accident claim", note: "Rider bias and helmet use can reduce awards in some states; motorcycle injuries are usually severe.", fn: E.accidentSettlement(), property: true, defaults: { medicalBills: 45000, lostWages: 12000 }, exExtra: { medicalBills: 45000, lostWages: 12000, severity: 2 }, faq: [{ question: "Does not wearing a helmet reduce my settlement?", answer: "In some states it can be used to argue comparative fault for head injuries; in others it's not admissible." }, { question: "What is the average motorcycle accident settlement?", answer: "Often higher than car accidents because injuries are more serious — many range from $20,000 to well over $100,000." }] },
  { slug: "bus-accident-compensation-calculator", title: "Bus Accident Compensation Calculator", what: "a bus accident claim (city bus, school bus or charter)", note: "Claims against public transit agencies need a short-deadline notice of claim (often 30–180 days) and may face damage caps.", fn: E.accidentSettlement(), property: false, faq: [{ question: "Can I sue a city bus company?", answer: "Yes, but government transit agencies require a formal notice of claim within a short deadline and may have caps." }, { question: "Are bus companies held to a higher standard?", answer: "Common carriers owe passengers the highest duty of care in many states." }] },
  { slug: "rear-end-collision-settlement-calculator", title: "Rear-End Collision Settlement Calculator", what: "a rear-end collision claim", note: "The rear driver is usually presumed at fault, so liability disputes are rare; whiplash and back injuries are typical.", fn: E.accidentSettlement(), property: true, defaults: { medicalBills: 9000, lostWages: 2500 }, exExtra: { medicalBills: 9000, lostWages: 2500, severity: 1 }, faq: [{ question: "Who is at fault in a rear-end accident?", answer: "Almost always the driver who hit from behind, though a lead driver who braked suddenly or had no brake lights may share fault." }, { question: "What is a typical rear-end settlement?", answer: "Soft-tissue rear-end claims often settle for $5,000–$30,000; surgery cases for much more." }] },
  { slug: "slip-and-fall-settlement-calculator", title: "Slip and Fall Settlement Calculator", what: "a slip and fall (premises liability) claim", note: "You must show the owner knew or should have known of the hazard; your own attention to the hazard is a common fault argument.", fn: E.accidentSettlement(), faq: [{ question: "How much is a slip and fall settlement?", answer: "Commonly $10,000–$50,000; fractures and surgery push higher, while clear comparative fault reduces it." }, { question: "What do I need to prove in a slip and fall?", answer: "That a dangerous condition existed, the owner knew or should have known about it, and it caused your injury." }] },
  { slug: "dog-bite-settlement-calculator", title: "Dog Bite Settlement Calculator", what: "a dog bite claim", note: "Most states impose strict liability on dog owners (no need to prove the dog was dangerous) unless the dog was provoked; homeowner's insurance usually pays.", fn: E.accidentSettlement({ strictLiability: true }), extra: [dropdown("provokedDog", "Was the Dog Provoked or Were You Trespassing?", YESNO, 0)], faq: [{ question: "How much is a dog bite settlement?", answer: "The average homeowner's insurance dog bite claim is about $60,000–$70,000; scarring on the face or children's injuries are valued higher." }, { question: "Is the dog owner always liable?", answer: "In strict liability states, generally yes unless you provoked the dog or were trespassing; 'one-bite' states require prior knowledge." }] },
  { slug: "dui-accident-settlement-calculator", title: "DUI Accident Settlement Calculator", what: "an accident caused by a drunk or impaired driver", note: "Many states allow punitive damages against drunk drivers, and dram shop laws can make bars liable — but punitive damages often aren't covered by insurance.", fn: E.accidentSettlement(), property: true, punitive: true, faq: [{ question: "Do DUI accidents pay more?", answer: "Often — punitive damages and dram shop claims against bars can add to the value, though collecting punitives depends on the driver's assets." }, { question: "Can I sue the bar that served the drunk driver?", answer: "In states with dram shop laws, yes, if the bar served a visibly intoxicated person." }] },
  { slug: "medical-malpractice-settlement-calculator", title: "Medical Malpractice Settlement Calculator", what: "a medical malpractice or misdiagnosis claim", note: "Many states cap non-economic damages in malpractice cases (for example California's MICRA cap, which rises each year); expert testimony is required.", fn: E.accidentSettlement({ capField: true }), extra: [currencyField("nonEconomicCap", "Your State's Non-Economic Damages Cap (0 = none)", { default: 0, max: 10000000, step: 5000 })], defaults: { medicalBills: 120000, lostWages: 40000 }, exExtra: { medicalBills: 120000, lostWages: 40000, severity: 2, nonEconomicCap: 0 }, faq: [{ question: "What is the average medical malpractice settlement?", answer: "Paid claims average roughly $300,000–$400,000, though most claims are dropped or lost." }, { question: "Are there caps on malpractice damages?", answer: "Many states cap non-economic (pain and suffering) damages; economic damages are usually uncapped." }] },
  { slug: "birth-injury-compensation-calculator", title: "Birth Injury Compensation Calculator", what: "a birth injury claim (cerebral palsy, Erb's palsy, HIE)", note: "Lifetime care costs dominate birth injury claims — a life care plan from an expert is essential; non-economic caps may apply.", fn: E.accidentSettlement({ capField: true }), extra: [currencyField("nonEconomicCap", "Non-Economic Damages Cap (0 = none)", { default: 0, max: 10000000, step: 5000 })], defaults: { medicalBills: 150000, lostWages: 0, futureCosts: 2000000 }, exExtra: { medicalBills: 150000, lostWages: 0, futureCosts: 2000000, severity: 3, nonEconomicCap: 0 }, faq: [{ question: "How much are birth injury settlements?", answer: "Serious birth injuries like cerebral palsy often settle in the millions because of lifetime care needs." }, { question: "How long do I have to file a birth injury claim?", answer: "Deadlines vary — many states extend them for minors, but some have short medical malpractice limits; act quickly." }] },
  { slug: "mesothelioma-compensation-calculator", title: "Mesothelioma Compensation Calculator", what: "a mesothelioma or asbestos cancer claim", note: "Mesothelioma victims often recover from asbestos bankruptcy trust funds as well as lawsuits; trust payments are added here.", fn: E.accidentSettlement(), extra: [currencyField("trustFundRecovery", "Expected Asbestos Trust Fund Payments", { default: 300000, max: 50000000, step: 10000 })], defaults: { medicalBills: 400000, lostWages: 150000 }, exExtra: { medicalBills: 400000, lostWages: 150000, severity: 3, trustFundRecovery: 300000 }, faq: [{ question: "What is the average mesothelioma settlement?", answer: "Lawsuit settlements commonly fall between $1 million and $2.4 million, with trust fund claims adding more." }, { question: "What are asbestos trust funds?", answer: "Funds of over $30 billion set up by bankrupt asbestos companies to pay current and future victims." }] },
  { slug: "food-poisoning-claim-calculator", title: "Food Poisoning Claim Calculator", what: "a food poisoning claim against a restaurant or manufacturer", note: "Lab-confirmed illness linked to the food (or an outbreak) is key; most states apply strict product liability to contaminated food.", fn: E.accidentSettlement(), defaults: { medicalBills: 6000, lostWages: 2000 }, exExtra: { medicalBills: 6000, lostWages: 2000, severity: 1 }, faq: [{ question: "How much can I get for food poisoning?", answer: "Mild cases settle for a few thousand dollars; hospitalization or lasting illness (e.g. HUS from E. coli) for far more." }, { question: "How do I prove food poisoning?", answer: "A stool test or medical diagnosis tied to the food, receipts, and health department outbreak reports." }] },
];

function accidentTool(s: AccidentSpec): ToolDef {
  const ex = r(s.fn, claimEx(s.exExtra ?? {}));
  const d = { medicalBills: 18000, lostWages: 6000, ...s.defaults };
  return {
    slug: s.slug,
    title: s.title,
    description: `Estimate ${s.what} — economic damages, pain and suffering by injury severity, your share of fault, insurance limits and attorney fees — and what you'd take home.`,
    metaTitle: `${s.title} — Estimate Your Claim Value`.slice(0, 70),
    metaDescription: `Free ${s.title.toLowerCase()}. Medical bills, lost wages and pain and suffering, adjusted for fault and policy limits, with your net after fees.`,
    calcInputs: claimInputs({ severity: E.SEVERITY_GENERAL, property: s.property, punitive: s.punitive, extra: s.extra, defaults: s.defaults }),
    calcResult: { label: "Estimated Settlement Value", format: "currency" },
    calcResults: [...CLAIM_RESULTS, ...(s.slug === "mesothelioma-compensation-calculator" ? [{ key: "asbestosTrustFunds", label: "Asbestos Trust Funds", format: "currency" }] : [{ key: "multiplierUsed", label: "Pain & Suffering Multiplier Used", format: "number" }])],
    instructions: `Add up medical bills, lost income and expected future care${s.property ? ", plus property damage" : ""}, pick the injury severity, and enter your share of fault and the at-fault party's insurance limit if you know it. ${s.note}`,
    examples: `Example: ${usd(d.medicalBills)} of medical bills and ${usd(d.lostWages)} of lost wages${s.exExtra?.futureCosts ? ` with ${usd(s.exExtra.futureCosts)} of future care` : ""} gives an estimated value of about ${usd(ex.estimatedSettlement)} — ${usd(ex.netToYou)} to you after fees.`,
    assumptions: `Pain and suffering = medical costs × a severity multiplier (minor ×1.5–2, moderate ×2–3, serious ×3–4, severe ×4–5 — the midpoint is used unless you set your own). ${s.note} ${DISCLAIMER}`,
    faq: s.faq,
  };
}

const exPs = r(E.painAndSuffering, { medicalBills: 18000, futureCosts: 0, multiplier: 2.5, perDiemRate: 150, daysOfPain: 180, faultRule: 0, yourFaultPercent: 0 });
const exMi = r(E.michiganCarAccident, { medicalBills: 30000, futureCosts: 0, severity: 2, multiplierOverride: 0, seriousImpairment: 1, medicalBillsOverPipLimit: 0, wageLossAfter3Years: 0, vehicleDamageNotCovered: 2500, yourFaultPercent: 0, policyLimit: 250000, attorneyFeePercent: 33.33 });
const UM_EX = { ...claimEx({ medicalBills: 40000, lostWages: 10000, severity: 2 }), atFaultPolicyLimit: 25000, umLimit: 100000, vehiclesStacked: 1 };
const exUm = r(E.uninsuredMotorist, UM_EX);
const exWd = r(E.wrongfulDeath, { annualIncome: 75000, workYearsRemaining: 25, personalConsumptionPercent: 30, discountRatePercent: 3, wageGrowthPercent: 2, annualHouseholdServices: 8000, lossOfCompanionship: 500000, nonEconomicCap: 0, funeralAndMedical: 25000, faultRule: 0, decedentFaultPercent: 0, policyLimit: 0, attorneyFeePercent: 33.33 });
const exTax = r(E.settlementTax, { physicalInjury: 1, compensatoryDamages: 100000, lostWagesPortion: 30000, punitiveDamages: 20000, interest: 5000, emotionalDistressPortion: 0, medicalExpensesForEmotional: 0, taxRatePercent: 24 });
const exSs = r(E.structuredSettlement, { lumpSum: 250000, years: 20, annualRatePercent: 4 });
const exMed = r(E.mediationSettlement, { plaintiffDemand: 250000, defenseOffer: 80000, expectedVerdict: 300000, chanceOfWinningPercent: 60, trialCosts: 40000 });
const exCa = r(E.classAction, { settlementFund: 725000000, attorneyFeePercent: 25, adminCosts: 5000000, validClaims: 17000000, yourPoints: 1, averagePoints: 1, perPersonCap: 0 });
const exLl = r(E.lemonLaw, { purchasePrice: 42000, milesBeforeFirstRepair: 6000, offsetDivisor: 120000, incidentalCosts: 800, financeChargesPaid: 1500, loanBalancePaidOff: 30000 });
const exDv = r(E.diminishedValue, { preAccidentValue: 30000, damageSeverity: 1, mileage: 25000, marketLossPercent: 15 });
const exEd = r(E.economicDamages, { pastMedical: 40000, pastLostWages: 15000, annualFutureMedical: 4000, futureMedicalYears: 20, medicalInflationPercent: 3, annualEarningsLoss: 12000, yearsOfEarningsLoss: 15, growthPercent: 2, discountRatePercent: 3, otherLosses: 0 });
const exLw = r(E.lostWages, { hourlyRate: 28, annualSalary: 0, hoursPerWeek: 40, weeksMissed: 10, lostBenefitsAndPto: 1000, disabilityPaymentsReceived: 0, collateralSourceRule: 1, futureAnnualLoss: 0, futureYears: 0, growthPercent: 2, discountRatePercent: 3 });
const exLc = r(E.lossOfConsortium, { injuredSpouseDamages: 200000, consortiumPercent: 15, nonEconomicCap: 0 });
const exFela = r(E.fela, { ...claimEx({ medicalBills: 40000, lostWages: 30000, severity: 2 }), safetyStatuteViolation: 0 });
const exPfs = r(E.floridaProposalForSettlement, { expectedJudgment: 70000, defendantOffer: 100000, plaintiffOffer: 0, feesAfterOffer: 60000 });
const exCvc = r(E.crimeVictimComp, { medicalCosts: 12000, lostWages: 6000, counseling: 3000, funeralCosts: 0, relocation: 2000, insurancePaid: 4000, stateMaximum: 25000 });
const exCica = r(E.cica, { tariffAward: 11000, secondInjuryTariff: 2400, thirdInjuryTariff: 0, weeksUnableToWork: 40, specialExpenses: 500 });
const exEu = r(E.eu261, { flightDistanceKm: 2200, arrivalDelayHours: 4, scheme: 0, extraordinaryCircumstances: 0, cancelledOrDenied: 0, passengers: 2 });
const exOg = r(E.ogden, { yearsOfLoss: 25, discountRatePercent: 0.5, contingencyFactor: 0.9, annualLoss: 18000 });
const exNw = r(E.noWinNoFee, { generalDamages: 12000, pastLosses: 3000, futureLosses: 0, successFeePercent: 25, ateInsurancePremium: 0 });
const exUk = r(E.ukPersonalInjury, { severityBand: 1, positionInBandPercent: 50, lossOfEarnings: 2500, careAndTravel: 400, treatmentCosts: 600, contributoryNegligencePercent: 0, successFeePercent: 25 });
const exDf = r(E.defamation, { provableFinancialLoss: 40000, reputationHarm: 60000, actualMalice: 1, punitiveDamages: 50000, chanceOfWinningPercent: 50, attorneyFeePercent: 40 });

const TOOLS: ToolDef[] = [
  ...ACCIDENTS.map(accidentTool),
  ...E.INJURIES.map(injuryTool),
  T({
    slug: "pain-and-suffering-calculator",
    title: "Pain and Suffering Calculator",
    description: "Calculate pain and suffering damages two ways — the multiplier method (medical costs × 1.5–5) and the per diem method (a daily rate for each day of pain) — adjusted for your share of fault.",
    metaTitle: "Pain and Suffering Calculator — Multiplier & Per Diem",
    metaDescription: "Free pain and suffering calculator. Multiplier method and per diem method side by side, with your fault reduction.",
    calcInputs: [currencyField("medicalBills", "Medical Bills", { default: 18000, max: 10000000, step: 100 }), currencyField("futureCosts", "Future Medical Costs", { default: 0, max: 50000000, step: 500 }), numberField("multiplier", "Multiplier (1.5 minor – 5 severe)", { default: 2.5, min: 1, max: 10, step: 0.25 }), currencyField("perDiemRate", "Per Diem Rate (often your daily wage)", { default: 150, max: 5000, step: 5 }), numberField("daysOfPain", "Days of Pain and Recovery", { default: 180, max: 20000 }), dropdown("faultRule", "Fault Rule", E.FAULT_RULES, 0), percentField("yourFaultPercent", "Your Share of Fault", { default: 0, step: 5 })],
    calcResult: { label: "Pain & Suffering (multiplier)", format: "currency" },
    calcResults: [
      { key: "painAndSufferingMultiplier", label: "Pain & Suffering — Multiplier Method", format: "currency", highlight: true },
      { key: "painAndSufferingPerDiem", label: "Pain & Suffering — Per Diem Method", format: "currency" },
      { key: "averageOfMethods", label: "Average of the Two Methods", format: "currency" },
      { key: "economicDamages", label: "Medical Costs Used", format: "currency" },
    ],
    instructions: "Enter your medical costs and choose a multiplier for the severity, and/or a daily rate and the number of days you were in pain or recovering (until maximum medical improvement).",
    examples: `Example: ${usd(18000)} of medical bills × 2.5 = ${usd(exPs.painAndSufferingMultiplier)}; at $150 a day for 180 days the per diem method gives ${usd(exPs.painAndSufferingPerDiem)}.`,
    assumptions: "Neither method is a legal formula — they're negotiation tools used by insurers and attorneys. Some states cap non-economic damages (mainly in malpractice cases). " + DISCLAIMER,
    faq: [
      { question: "How do you calculate pain and suffering?", answer: "Usually by multiplying medical costs by 1.5 to 5 depending on severity, or by charging a daily rate for each day of pain." },
      { question: "What multiplier should I use?", answer: "1.5–2 for minor soft-tissue injuries, 3–4 for injuries needing surgery, 5 or more for permanent or catastrophic injuries." },
    ],
  }),
  T({
    slug: "michigan-car-accident-settlement-calculator",
    title: "Michigan Car Accident Settlement Calculator (No-Fault)",
    description: "Estimate a Michigan car accident settlement under no-fault rules — PIP pays medical bills and wages; a pain and suffering lawsuit needs a serious impairment; plus excess economic losses and the mini-tort of up to $3,000.",
    metaTitle: "Michigan Car Accident Settlement Calculator — No-Fault",
    metaDescription: "Free Michigan auto accident settlement calculator. Serious impairment threshold, pain and suffering, excess economic damages and the $3,000 mini-tort.",
    calcInputs: [
      currencyField("medicalBills", "Medical Bills (for valuing pain and suffering)", { default: 30000, max: 10000000, step: 100 }),
      currencyField("futureCosts", "Future Medical", { default: 0, max: 50000000, step: 500 }),
      dropdown("severity", "Injury Severity", E.SEVERITY_GENERAL.map(([l, lo, hi], i) => [`${l} (×${lo}–${hi})`, i] as [string, number]), 2),
      numberField("multiplierOverride", "Your Own Multiplier (0 = use severity)", { default: 0, max: 15, step: 0.25 }),
      dropdown("seriousImpairment", "Serious Impairment of Body Function (or death / disfigurement)?", YESNO, 1),
      currencyField("medicalBillsOverPipLimit", "Medical Bills Above Your PIP Limit", { default: 0, max: 10000000, step: 100 }),
      currencyField("wageLossAfter3Years", "Wage Loss Beyond PIP (after 3 years / above cap)", { default: 0, max: 10000000, step: 100 }),
      currencyField("vehicleDamageNotCovered", "Vehicle Damage Not Covered (mini-tort)", { default: 2500, max: 100000, step: 50 }),
      percentField("yourFaultPercent", "Your Share of Fault (barred over 50%)", { default: 0, step: 5 }),
      currencyField("policyLimit", "At-Fault Driver's Bodily Injury Limit", { default: 250000, max: 10000000, step: 5000 }),
      percentField("attorneyFeePercent", "Attorney Fee", { default: 33.33, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Estimated Settlement", format: "currency" },
    calcResults: [
      { key: "estimatedSettlement", label: "Estimated Tort Settlement + Mini-Tort", format: "currency", highlight: true },
      { key: "painAndSuffering", label: "Pain & Suffering (if threshold met)", format: "currency" },
      { key: "pipCoversMedicalAndWages", label: "PIP Pays Medical & Wages (1 = yes)", format: "number" },
      { key: "miniTortRecovery", label: "Mini-Tort Recovery", format: "currency" },
      { key: "attorneyFee", label: "Attorney Fee", format: "currency" },
      { key: "netToYou", label: "Net to You", format: "currency" },
    ],
    instructions: "Your own PIP insurer pays medical bills and up to 3 years of wage loss regardless of fault. A lawsuit against the at-fault driver is for pain and suffering (only with a serious impairment), economic losses beyond your PIP limits, and vehicle damage not covered (mini-tort).",
    examples: `Example: a serious-impairment injury with ${usd(30000)} of medical treatment and ${usd(2500)} of uncovered vehicle damage: about ${usd(exMi.estimatedSettlement)} in total — ${usd(exMi.netToYou)} after fees.`,
    assumptions: "MCL 500.3135: non-economic damages need death, serious impairment of body function or permanent serious disfigurement (McCormick standard); recovery is barred if you're more than 50% at fault; mini-tort up to $3,000 since 2020. Since the 2019 reform, PIP medical coverage can be unlimited or limited ($500,000 / $250,000 / $50,000 Medicaid option / opt-out). " + DISCLAIMER,
    faq: [
      { question: "Can I sue for pain and suffering in Michigan?", answer: "Only if your injury is a serious impairment of body function, permanent serious disfigurement, or death." },
      { question: "What is the Michigan mini-tort?", answer: "A claim of up to $3,000 against the at-fault driver for vehicle damage your insurance doesn't cover." },
    ],
  }),
  T({
    slug: "uninsured-motorist-claim-calculator",
    title: "Uninsured / Underinsured Motorist Claim Calculator",
    description: "Estimate what your UM/UIM coverage pays after a crash with an uninsured or underinsured driver — the claim value, what the at-fault insurer pays, the gap your own coverage fills (with stacking) and what's left uncovered.",
    metaTitle: "Uninsured Motorist Claim Calculator — UM / UIM Payout",
    metaDescription: "Free UM/UIM claim calculator. Split your claim between the at-fault driver's limit and your uninsured/underinsured coverage, with stacking.",
    calcInputs: [
      ...claimInputs({ severity: E.SEVERITY_GENERAL, defaults: { medicalBills: 40000, lostWages: 10000 } }).filter((f) => (f as { key: string }).key !== "policyLimit"),
      currencyField("atFaultPolicyLimit", "At-Fault Driver's Bodily Injury Limit (0 if uninsured)", { default: 25000, max: 10000000, step: 5000 }),
      currencyField("umLimit", "Your UM/UIM Limit per Person", { default: 100000, max: 10000000, step: 5000 }),
      numberField("vehiclesStacked", "Vehicles Stacked (if your state allows)", { default: 1, min: 1, max: 5 }),
    ],
    calcResult: { label: "Total Recovery", format: "currency" },
    calcResults: [
      { key: "totalRecovery", label: "Total Insurance Recovery", format: "currency", highlight: true },
      { key: "fromAtFaultInsurer", label: "From the At-Fault Driver's Insurer", format: "currency" },
      { key: "fromYourUmUimCoverage", label: "From Your UM/UIM Coverage", format: "currency" },
      { key: "claimValue", label: "Full Claim Value", format: "currency" },
      { key: "uncoveredAmount", label: "Not Covered by Insurance", format: "currency" },
      { key: "netToYou", label: "Net to You", format: "currency" },
    ],
    instructions: "Value the claim (medical bills, wages, severity), then enter the other driver's bodily injury limit (0 for an uninsured or hit-and-run driver) and your own UM/UIM limit. Some states let you stack coverage across vehicles.",
    examples: `Example: a claim worth ${usd(exUm.claimValue)} against a driver with ${usd(25000)} of coverage: their insurer pays ${usd(exUm.fromAtFaultInsurer)} and your ${usd(100000)} UIM pays ${usd(exUm.fromYourUmUimCoverage)}.`,
    assumptions: "Underinsured coverage usually pays the amount above the at-fault policy (states differ — some reduce UIM by the at-fault limit instead). Hit-and-run claims fall under UM in most states, often requiring a prompt police report. Your insurer can dispute value like any adjuster. " + DISCLAIMER,
    faq: [
      { question: "What happens if the at-fault driver has no insurance?", answer: "Your uninsured motorist (UM) coverage pays up to your limit, as if it were the other driver's insurance." },
      { question: "What is stacking?", answer: "Combining UM/UIM limits for several vehicles on your policy; allowed in some states and policies." },
    ],
  }),
  T({
    slug: "hit-and-run-settlement-calculator",
    title: "Hit and Run Settlement Calculator",
    description: "Estimate a hit-and-run accident settlement — usually paid by your own uninsured motorist coverage — including the claim value, UM limits and anything left uncovered.",
    metaTitle: "Hit and Run Settlement Calculator — UM Claim Value",
    metaDescription: "Free hit and run settlement calculator. Value your injury claim and see what your uninsured motorist coverage pays.",
    calcInputs: [
      ...claimInputs({ severity: E.SEVERITY_GENERAL, defaults: { medicalBills: 25000, lostWages: 6000 } }).filter((f) => (f as { key: string }).key !== "policyLimit"),
      currencyField("atFaultPolicyLimit", "Driver's Coverage if Found (0 = not found)", { default: 0, max: 10000000, step: 5000 }),
      currencyField("umLimit", "Your Uninsured Motorist Limit", { default: 50000, max: 10000000, step: 5000 }),
      numberField("vehiclesStacked", "Vehicles Stacked", { default: 1, min: 1, max: 5 }),
    ],
    calcResult: { label: "Total Recovery", format: "currency" },
    calcResults: [
      { key: "totalRecovery", label: "Total Insurance Recovery", format: "currency", highlight: true },
      { key: "fromYourUmUimCoverage", label: "From Your UM Coverage", format: "currency" },
      { key: "fromAtFaultInsurer", label: "From the Driver's Insurer (if found)", format: "currency" },
      { key: "claimValue", label: "Full Claim Value", format: "currency" },
      { key: "uncoveredAmount", label: "Not Covered", format: "currency" },
      { key: "netToYou", label: "Net to You", format: "currency" },
    ],
    instructions: "Report the hit-and-run to police right away (many policies require it within 24 hours) and notify your insurer. Enter your damages and UM limit.",
    examples: `Example: with ${usd(25000)} of medical bills and a ${usd(50000)} UM limit, your own policy would pay about ${usd(r(E.uninsuredMotorist, { ...claimEx({ medicalBills: 25000, lostWages: 6000, severity: 1 }), atFaultPolicyLimit: 0, umLimit: 50000, vehiclesStacked: 1 }).totalRecovery)}.`,
    assumptions: "Hit-and-run injury claims are generally paid by uninsured motorist bodily injury coverage; some states require physical contact or an independent witness. Uninsured motorist property damage (UMPD) or collision covers the car. " + DISCLAIMER,
    faq: [
      { question: "Who pays for a hit and run?", answer: "Your own uninsured motorist coverage (and PIP/MedPay) if the driver isn't found; collision coverage pays for the car." },
      { question: "Will a hit-and-run claim raise my premium?", answer: "Usually not, since you weren't at fault, though rules vary by insurer and state." },
    ],
  }),
  T({
    slug: "wrongful-death-settlement-calculator",
    title: "Wrongful Death Settlement Calculator",
    description: "Estimate a wrongful death claim — the present value of lost financial support and household services, loss of companionship, funeral and medical costs — adjusted for fault, caps and insurance.",
    metaTitle: "Wrongful Death Settlement Calculator — Claim Value",
    metaDescription: "Free wrongful death calculator. Present value of lost income and services, companionship, funeral costs, fault and caps.",
    calcInputs: [
      currencyField("annualIncome", "Decedent's Annual Income", { default: 75000, max: 10000000, step: 500 }),
      numberField("workYearsRemaining", "Expected Remaining Work Years", { default: 25, max: 60 }),
      percentField("personalConsumptionPercent", "Personal Consumption (share the decedent would have spent on themselves)", { default: 30, max: 80, step: 1 }),
      percentField("wageGrowthPercent", "Wage Growth per Year", { default: 2, max: 10, step: 0.25 }),
      percentField("discountRatePercent", "Discount Rate", { default: 3, max: 10, step: 0.25 }),
      currencyField("annualHouseholdServices", "Value of Household Services per Year", { default: 8000, max: 200000, step: 100 }),
      currencyField("lossOfCompanionship", "Loss of Companionship / Guidance (estimate)", { default: 500000, max: 50000000, step: 10000 }),
      currencyField("nonEconomicCap", "State Cap on Non-Economic Damages (0 = none)", { default: 0, max: 50000000, step: 10000 }),
      currencyField("funeralAndMedical", "Funeral, Burial & Final Medical Costs", { default: 25000, max: 5000000, step: 500 }),
      dropdown("faultRule", "Fault Rule", E.FAULT_RULES, 0),
      percentField("decedentFaultPercent", "Decedent's Share of Fault", { default: 0, step: 5 }),
      currencyField("policyLimit", "Available Insurance (0 = no limit)", { default: 0, max: 100000000, step: 10000 }),
      percentField("attorneyFeePercent", "Attorney Fee", { default: 33.33, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Estimated Claim Value", format: "currency" },
    calcResults: [
      { key: "estimatedClaimValue", label: "Estimated Claim Value", format: "currency", highlight: true },
      { key: "lostFinancialSupport", label: "Lost Financial Support (present value)", format: "currency" },
      { key: "lostHouseholdServices", label: "Lost Household Services", format: "currency" },
      { key: "lossOfCompanionship", label: "Loss of Companionship (after cap)", format: "currency" },
      { key: "attorneyFee", label: "Attorney Fee", format: "currency" },
      { key: "netToFamily", label: "Net to the Family", format: "currency" },
    ],
    instructions: "Enter the decedent's earnings and remaining work life, the share of income they spent on themselves, household services they provided, and an estimate for loss of companionship. Who may sue and what's recoverable depends on the state's wrongful death and survival statutes.",
    examples: `Example: ${usd(75000)} income over 25 years (30% personal consumption) has a present value of about ${usd(Math.round(exWd.lostFinancialSupport))}; with services, companionship and funeral costs the claim is worth about ${usd(Math.round(exWd.estimatedClaimValue))}.`,
    assumptions: "Lost support = income × (1 − personal consumption), grown and discounted to present value; household services discounted 20%. Some states cap non-economic or total wrongful death damages, and a separate survival action covers the decedent's own pain before death. " + DISCLAIMER,
    faq: [
      { question: "How much is a wrongful death claim worth?", answer: "It depends mostly on the decedent's earning capacity, age, dependents and state caps — often several hundred thousand to several million dollars." },
      { question: "Who can file a wrongful death lawsuit?", answer: "Usually the spouse, children or parents, or the estate's personal representative, depending on state law." },
    ],
  }),
  T({
    slug: "settlement-tax-calculator",
    title: "Settlement Tax Calculator",
    description: "Estimate the tax on a lawsuit settlement — physical injury compensation is tax-free under IRC §104(a)(2), while punitive damages, interest, lost wages in non-physical cases and emotional distress awards are taxable.",
    metaTitle: "Settlement Tax Calculator — Is My Settlement Taxable?",
    metaDescription: "Free settlement tax calculator. Separate tax-free physical injury damages from taxable punitive damages, interest and non-physical awards.",
    calcInputs: [dropdown("physicalInjury", "Is the Claim for Physical Injury or Sickness?", [["Yes", 1], ["No (employment, defamation, emotional only)", 0]], 1), currencyField("compensatoryDamages", "Compensatory Damages (medical, pain & suffering)", { default: 100000, max: 100000000, step: 1000 }), currencyField("lostWagesPortion", "Lost Wages / Back Pay Portion", { default: 30000, max: 100000000, step: 1000 }), currencyField("emotionalDistressPortion", "Emotional Distress (non-physical claims)", { default: 0, max: 100000000, step: 1000 }), currencyField("medicalExpensesForEmotional", "Medical Costs for Emotional Distress", { default: 0, max: 10000000, step: 100 }), currencyField("punitiveDamages", "Punitive Damages", { default: 20000, max: 100000000, step: 1000 }), currencyField("interest", "Pre/Post-Judgment Interest", { default: 5000, max: 10000000, step: 100 }), percentField("taxRatePercent", "Your Marginal Tax Rate", { default: 24, max: 50, step: 1 })],
    calcResult: { label: "Estimated Tax", format: "currency" },
    calcResults: [
      { key: "estimatedTax", label: "Estimated Federal Tax", format: "currency", highlight: true },
      { key: "taxableAmount", label: "Taxable Amount", format: "currency" },
      { key: "taxFreeAmount", label: "Tax-Free Amount", format: "currency" },
      { key: "afterTaxSettlement", label: "After-Tax Settlement", format: "currency" },
    ],
    instructions: "Break the settlement into its parts as the agreement allocates them. In physical injury cases, compensatory damages including lost wages are tax-free; punitive damages and interest are always taxable.",
    examples: `Example: in a physical injury case, ${usd(130000)} of compensatory damages is tax-free, but ${usd(20000)} punitive and ${usd(5000)} interest are taxable — about ${usd(exTax.estimatedTax)} of tax at 24%.`,
    assumptions: "IRC §104(a)(2): damages received on account of personal physical injuries or physical sickness are excluded (except punitive damages); emotional distress is taxable unless it stems from a physical injury (medical costs for it are excludable); interest is taxable. Attorney fees may be deductible only in certain employment and whistleblower cases. Previously deducted medical expenses are taxable when reimbursed. " + DISCLAIMER,
    faq: [
      { question: "Are personal injury settlements taxable?", answer: "Generally no for compensation for physical injuries, but punitive damages and interest are taxable." },
      { question: "Is an employment settlement taxable?", answer: "Yes — back pay is wages (with withholding) and emotional distress damages are taxable income." },
    ],
  }),
  T({
    slug: "structured-settlement-calculator",
    title: "Structured Settlement Calculator (Monthly Payments)",
    description: "Turn a lump-sum settlement into a structured settlement — the monthly payment over a set number of years at an annuity rate — and how much more you'd receive in total.",
    metaTitle: "Structured Settlement Calculator — Monthly Payment",
    metaDescription: "Free structured settlement calculator. Monthly and yearly payments from a lump sum at an annuity rate, and total payout.",
    calcInputs: [currencyField("lumpSum", "Settlement Amount Funding the Annuity", { default: 250000, max: 100000000, step: 1000 }), numberField("years", "Payment Period (years)", { default: 20, min: 1, max: 60 }), percentField("annualRatePercent", "Annuity Interest Rate", { default: 4, max: 10, step: 0.1 })],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "annualPayment", label: "Annual Payment", format: "currency" },
      { key: "totalPaidOut", label: "Total Paid Out", format: "currency" },
      { key: "growthOverLumpSum", label: "Extra vs the Lump Sum", format: "currency" },
    ],
    instructions: "Enter the part of the settlement used to buy the annuity, the period and the insurer's rate (get a quote from a structured settlement broker).",
    examples: `Example: ${usd(250000)} over 20 years at 4% pays about ${usd(exSs.monthlyPayment)} a month — ${usd(Math.round(exSs.totalPaidOut))} in total.`,
    assumptions: "Level monthly payments (an annuity certain). Real structures can be life-contingent, increasing, or include lump sums at set dates. Payments from a physical injury structured settlement stay tax-free. Selling payments later usually means a steep discount and needs court approval. " + DISCLAIMER,
    faq: [
      { question: "Is a structured settlement better than a lump sum?", answer: "It provides guaranteed, tax-free income and protects against overspending, but you lose flexibility and can't easily change it." },
      { question: "Can I sell my structured settlement?", answer: "Yes, to a factoring company with court approval, usually at a significant discount." },
    ],
  }),
  T({
    slug: "mediation-settlement-calculator",
    title: "Mediation Settlement Calculator",
    description: "Plan a mediation — the midpoint between the demand and the offer, a reasonable bracket, and the risk-adjusted value of going to trial instead.",
    metaTitle: "Mediation Settlement Calculator — Midpoint & Trial Value",
    metaDescription: "Free mediation settlement calculator. Demand/offer midpoint and bracket compared with the expected value of trial.",
    calcInputs: [currencyField("plaintiffDemand", "Current Demand", { default: 250000, max: 1000000000, step: 1000 }), currencyField("defenseOffer", "Current Offer", { default: 80000, max: 1000000000, step: 1000 }), currencyField("expectedVerdict", "Expected Verdict if You Win", { default: 300000, max: 1000000000, step: 1000 }), percentField("chanceOfWinningPercent", "Chance of Winning", { default: 60, step: 5 }), currencyField("trialCosts", "Extra Cost of Going to Trial", { default: 40000, max: 100000000, step: 500 })],
    calcResult: { label: "Midpoint", format: "currency" },
    calcResults: [
      { key: "midpoint", label: "Midpoint", format: "currency", highlight: true },
      { key: "gap", label: "Gap Between Demand and Offer", format: "currency" },
      { key: "bracketLow", label: "Bracket — Low", format: "currency" },
      { key: "bracketHigh", label: "Bracket — High", format: "currency" },
      { key: "expectedTrialValue", label: "Expected Value of Trial", format: "currency" },
      { key: "settleIfAbove", label: "Settling Above This Beats Trial", format: "currency" },
    ],
    instructions: "Enter the latest numbers on the table and your honest view of the trial outcome. Settlements often land near the midpoint of the last moves.",
    examples: `Example: a ${usd(250000)} demand and ${usd(80000)} offer have a midpoint of ${usd(exMed.midpoint)}; with a 60% chance at a ${usd(300000)} verdict and ${usd(40000)} trial costs, trial is worth about ${usd(exMed.expectedTrialValue)}.`,
    assumptions: "Expected trial value = verdict × probability − trial costs (ignores appeals, delay and collection risk). Mediators often use brackets around the midpoint to close the gap. " + DISCLAIMER,
    faq: [
      { question: "Do mediations settle at the midpoint?", answer: "Often close to it, though the party with more trial risk usually moves further." },
      { question: "Is a mediation agreement binding?", answer: "Once both sides sign a settlement agreement it's generally enforceable." },
    ],
  }),
  T({
    slug: "class-action-settlement-payout-calculator",
    title: "Class Action Settlement Payout Calculator",
    description: "Estimate your payout from a class action settlement (Facebook, BCBS, data breach, opioid, wildfire, MDL…) — the fund after attorney fees and admin costs, divided by valid claims and your share.",
    metaTitle: "Class Action Settlement Payout Calculator — Per Person",
    metaDescription: "Free class action payout calculator. Net settlement fund after fees divided by valid claims, with points or allocation share and caps.",
    calcInputs: [currencyField("settlementFund", "Total Settlement Fund", { default: 725000000, max: 100000000000, step: 100000 }), percentField("attorneyFeePercent", "Class Counsel Fees", { default: 25, max: 50, step: 0.5 }), currencyField("adminCosts", "Notice & Administration Costs", { default: 5000000, max: 1000000000, step: 10000 }), numberField("validClaims", "Number of Valid Claims", { default: 17000000, min: 1, max: 1000000000 }), numberField("yourPoints", "Your Points / Allocation Units", { default: 1, max: 100000, step: 0.1 }), numberField("averagePoints", "Average Points per Claimant", { default: 1, min: 0.01, max: 100000, step: 0.1 }), currencyField("perPersonCap", "Per-Person Cap (0 = none)", { default: 0, max: 10000000, step: 10 })],
    calcResult: { label: "Estimated Payout", format: "currency" },
    calcResults: [
      { key: "estimatedPayout", label: "Your Estimated Payout", format: "currency", highlight: true },
      { key: "netFundAfterFees", label: "Net Fund After Fees & Costs", format: "currency" },
      { key: "averagePerClaimant", label: "Average per Claimant", format: "currency" },
      { key: "feesAndCosts", label: "Fees & Costs", format: "currency" },
    ],
    instructions: "Use the fund size, fees and claim count from the settlement website or final approval order. Many settlements allocate points (e.g. months of membership or level of injury) — enter yours and the average.",
    examples: `Example: a $725 million fund with 25% fees and 17 million valid claims pays about ${usd(exCa.estimatedPayout)} per claimant.`,
    assumptions: "Payout = (fund − fees − costs) ÷ claims × (your points ÷ average points), capped if the plan sets a maximum. Payouts drop as more people file and rise if fewer claim; final amounts are set after the claims deadline. " + DISCLAIMER,
    faq: [
      { question: "How much will I get from a class action settlement?", answer: "Usually a small amount per person — the net fund divided among everyone who files a valid claim, adjusted by allocation points." },
      { question: "Is class action settlement money taxable?", answer: "It depends on what it compensates — refunds generally aren't taxable; payments for lost income or punitive damages are." },
    ],
  }),
  T({
    slug: "lemon-law-buyback-calculator",
    title: "Lemon Law Buyback Calculator",
    description: "Estimate a lemon law buyback — the purchase price plus incidental costs and finance charges, minus the usage offset for miles driven before the first repair (California formula), and the cash you'd receive after the loan is paid off.",
    metaTitle: "Lemon Law Buyback Calculator — Refund & Mileage Offset",
    metaDescription: "Free lemon law buyback calculator. Price + incidentals + finance charges − mileage offset (miles ÷ 120,000 × price), net of loan payoff.",
    calcInputs: [currencyField("purchasePrice", "Price Paid (incl. taxes, registration, fees)", { default: 42000, max: 500000, step: 100 }), numberField("milesBeforeFirstRepair", "Miles at the First Repair Attempt for the Defect", { default: 6000, max: 200000 }), numberField("offsetDivisor", "Offset Divisor (120,000 in California)", { default: 120000, min: 1000, max: 200000, step: 1000 }), currencyField("incidentalCosts", "Incidental Costs (towing, rentals, repairs)", { default: 800, max: 50000, step: 10 }), currencyField("financeChargesPaid", "Finance Charges Paid", { default: 1500, max: 100000, step: 10 }), currencyField("loanBalancePaidOff", "Loan Balance the Manufacturer Pays Off", { default: 30000, max: 500000, step: 100 })],
    calcResult: { label: "Estimated Buyback", format: "currency" },
    calcResults: [
      { key: "estimatedBuyback", label: "Estimated Buyback Amount", format: "currency", highlight: true },
      { key: "usageOffset", label: "Usage Offset", format: "currency" },
      { key: "cashToYouAfterLoanPayoff", label: "Cash to You After Loan Payoff", format: "currency" },
      { key: "offsetPercentOfPrice", label: "Offset as % of Price", format: "percentage" },
    ],
    instructions: "Enter the total you paid, the odometer reading when you first took the car in for the defect, and any incidental costs. Many states use a similar offset with different divisors.",
    examples: `Example: a ${usd(42000)} car first repaired at 6,000 miles has a ${usd(exLl.usageOffset)} offset, so the buyback is about ${usd(exLl.estimatedBuyback)} — ${usd(exLl.cashToYouAfterLoanPayoff)} to you after a ${usd(30000)} loan payoff.`,
    assumptions: "California Song-Beverly Act (Civil Code §1793.2(d)(2)): offset = (miles before the first repair attempt ÷ 120,000) × price paid; manufacturers also refund collateral charges and incidental damages and pay attorney fees. Other states' lemon laws use different presumptions (e.g. 3–4 repair attempts or 30 days out of service in the first 12–24 months). " + DISCLAIMER,
    faq: [
      { question: "How is the lemon law mileage offset calculated?", answer: "In California, miles driven before the first repair attempt divided by 120,000, times the price paid." },
      { question: "Who pays my lawyer in a lemon law case?", answer: "In most states the manufacturer must pay the consumer's attorney fees if you win or settle." },
    ],
  }),
  T({
    slug: "diminished-value-calculator",
    title: "Diminished Value Calculator (17c Formula)",
    description: "Estimate your car's diminished value after an accident — the insurer's 17c formula (10% cap × damage × mileage multipliers) and a market-based estimate — for a diminished value claim.",
    metaTitle: "Diminished Value Calculator — 17c Formula & Market Value",
    metaDescription: "Free diminished value calculator. 17c formula with damage and mileage multipliers plus a market-based estimate for your claim.",
    calcInputs: [currencyField("preAccidentValue", "Pre-Accident Value", { default: 30000, max: 500000, step: 100 }), dropdown("damageSeverity", "Damage Severity", [["Severe structural damage", 0], ["Major damage to structure and panels", 1], ["Moderate structural and panel damage", 2], ["Minor structural / panel damage", 3], ["No structural damage", 4]], 1), numberField("mileage", "Mileage", { default: 25000, max: 300000, step: 100 }), percentField("marketLossPercent", "Market-Based Loss (appraiser estimate)", { default: 15, max: 50, step: 1 })],
    calcResult: { label: "Diminished Value (17c)", format: "currency" },
    calcResults: [
      { key: "diminishedValue17c", label: "Diminished Value — 17c Formula", format: "currency", highlight: true },
      { key: "marketBasedEstimate", label: "Market-Based Estimate", format: "currency" },
      { key: "baseLoss10Percent", label: "Base Loss (10% cap)", format: "currency" },
      { key: "damageMultiplier", label: "Damage Multiplier", format: "number" },
      { key: "mileageMultiplier", label: "Mileage Multiplier", format: "number" },
    ],
    instructions: "Enter the car's value before the accident (from NADA/KBB), the extent of damage and mileage. The 17c formula is the insurer's starting point; an independent appraisal is usually higher.",
    examples: `Example: a ${usd(30000)} car with major damage and 25,000 miles: the 17c formula gives ${usd(exDv.diminishedValue17c)}, while a 15% market loss would be ${usd(exDv.marketBasedEstimate)}.`,
    assumptions: "17c (from Georgia's State Farm case): base = 10% of value × damage multiplier (1.00 severe, 0.75 major, 0.50 moderate, 0.25 minor, 0 none) × mileage multiplier (1.0 under 20,000 miles down to 0 above 100,000). Diminished value claims are typically against the at-fault driver's insurer; a few states don't allow them. " + DISCLAIMER,
    faq: [
      { question: "What is a diminished value claim?", answer: "A claim for the loss in resale value a car suffers because it now has an accident history, even after repairs." },
      { question: "Can I claim diminished value from my own insurer?", answer: "Usually not — first-party diminished value claims are allowed in very few states (Georgia is the main one)." },
    ],
  }),
  T({
    slug: "economic-damages-calculator",
    title: "Economic Damages Calculator",
    description: "Calculate economic damages in an injury case — past medical bills and lost wages plus the present value of future medical care and lost earning capacity.",
    metaTitle: "Economic Damages Calculator — Past & Future Losses (PV)",
    metaDescription: "Free economic damages calculator. Past medical and wage losses plus present value of future medical costs and lost earnings.",
    calcInputs: [currencyField("pastMedical", "Past Medical Expenses", { default: 40000, max: 50000000, step: 100 }), currencyField("pastLostWages", "Past Lost Wages", { default: 15000, max: 50000000, step: 100 }), currencyField("annualFutureMedical", "Future Medical per Year", { default: 4000, max: 5000000, step: 100 }), numberField("futureMedicalYears", "Years of Future Care", { default: 20, max: 80 }), percentField("medicalInflationPercent", "Medical Cost Inflation", { default: 3, max: 10, step: 0.25 }), currencyField("annualEarningsLoss", "Lost Earning Capacity per Year", { default: 12000, max: 5000000, step: 100 }), numberField("yearsOfEarningsLoss", "Years of Earnings Loss", { default: 15, max: 60 }), percentField("growthPercent", "Wage Growth", { default: 2, max: 10, step: 0.25 }), percentField("discountRatePercent", "Discount Rate", { default: 3, max: 10, step: 0.25 }), currencyField("otherLosses", "Other Losses (home modifications, transport)", { default: 0, max: 10000000, step: 100 })],
    calcResult: { label: "Total Economic Damages", format: "currency" },
    calcResults: [
      { key: "totalEconomicDamages", label: "Total Economic Damages", format: "currency", highlight: true },
      { key: "pastDamages", label: "Past Damages", format: "currency" },
      { key: "futureMedicalPresentValue", label: "Future Medical (present value)", format: "currency" },
      { key: "futureEarningsPresentValue", label: "Future Lost Earnings (present value)", format: "currency" },
      { key: "otherLosses", label: "Other Losses", format: "currency" },
    ],
    instructions: "Enter past losses from bills and pay records, and future costs from a life care plan and vocational/economist reports if you have them.",
    examples: `Example: ${usd(55000)} of past losses, ${usd(4000)} a year of care for 20 years and ${usd(12000)} a year of lost earnings for 15 years: total economic damages of about ${usd(Math.round(exEd.totalEconomicDamages))}.`,
    assumptions: "Future amounts grow at the inflation/wage rate and are discounted to present value at the discount rate (net discount rate approach). Courts in some states require specific discount methods. Non-economic damages (pain and suffering) are separate. " + DISCLAIMER,
    faq: [
      { question: "What are economic damages?", answer: "Measurable financial losses — medical bills, lost wages and earning capacity, and other out-of-pocket costs." },
      { question: "Are economic damages capped?", answer: "Rarely — most damage caps apply to non-economic damages only." },
    ],
  }),
  T({
    slug: "lost-wages-calculator",
    title: "Lost Wages Calculator (Injury Claim)",
    description: "Calculate lost wages for an injury or accident claim — pay for the time you missed plus lost benefits and PTO, and the present value of future lost earnings.",
    metaTitle: "Lost Wages Calculator — Loss of Earnings for an Injury Claim",
    metaDescription: "Free lost wages calculator. Past wage loss, lost benefits and PTO, and present value of future loss of earnings.",
    calcInputs: [currencyField("hourlyRate", "Hourly Rate (0 = use salary)", { default: 28, max: 1000, step: 0.05 }), currencyField("annualSalary", "Annual Salary", { default: 0, max: 5000000, step: 500 }), numberField("hoursPerWeek", "Usual Hours per Week", { default: 40, max: 100 }), numberField("weeksMissed", "Weeks of Work Missed", { default: 10, max: 520, step: 0.5 }), currencyField("lostBenefitsAndPto", "Lost Benefits, Bonuses & PTO Used", { default: 1000, max: 1000000, step: 50 }), currencyField("disabilityPaymentsReceived", "Disability Payments Received", { default: 0, max: 1000000, step: 50 }), dropdown("collateralSourceRule", "State Ignores Collateral Payments (collateral source rule)?", [["Yes", 1], ["No — deduct them", 0]], 1), currencyField("futureAnnualLoss", "Future Earnings Loss per Year", { default: 0, max: 5000000, step: 100 }), numberField("futureYears", "Years of Future Loss", { default: 0, max: 60 }), percentField("growthPercent", "Wage Growth", { default: 2, max: 10, step: 0.25 }), percentField("discountRatePercent", "Discount Rate", { default: 3, max: 10, step: 0.25 })],
    calcResult: { label: "Total Lost Earnings", format: "currency" },
    calcResults: [
      { key: "totalLostEarnings", label: "Total Lost Earnings", format: "currency", highlight: true },
      { key: "pastLostWages", label: "Past Lost Wages", format: "currency" },
      { key: "futureLostEarningsPresentValue", label: "Future Loss (present value)", format: "currency" },
      { key: "hourlyRateUsed", label: "Hourly Rate Used", format: "currency" },
    ],
    instructions: "Enter your pay rate and the time missed (documented by your employer and doctor), plus lost benefits. Add future losses if you can't return to the same pay.",
    examples: `Example: 10 weeks off at $28 an hour plus ${usd(1000)} of lost benefits is ${usd(exLw.totalLostEarnings)} of lost wages.`,
    assumptions: "Past loss = hourly rate × hours × weeks + lost benefits; PTO used for injury days is recoverable. Under the collateral source rule (most states) disability or sick pay received doesn't reduce the claim. Future losses are grown and discounted to present value. Self-employed people use tax returns to prove lost income. " + DISCLAIMER,
    faq: [
      { question: "Can I claim lost wages if I used sick days?", answer: "Yes — PTO or sick days used because of the injury are generally recoverable." },
      { question: "How do I prove lost wages?", answer: "A letter from your employer, pay stubs or tax returns, and a doctor's note saying you couldn't work." },
    ],
  }),
  T({
    slug: "loss-of-consortium-calculator",
    title: "Loss of Consortium Calculator",
    description: "Estimate a spouse's loss of consortium claim — the loss of companionship, support and intimacy when a partner is seriously injured — commonly valued as a share of the injured spouse's damages.",
    metaTitle: "Loss of Consortium Calculator — Spouse's Claim Value",
    metaDescription: "Free loss of consortium calculator. Estimate the spouse's claim as a percentage of the injured partner's damages, with caps.",
    calcInputs: [currencyField("injuredSpouseDamages", "Injured Spouse's Total Damages", { default: 200000, max: 100000000, step: 1000 }), percentField("consortiumPercent", "Consortium Share (often 10–20%)", { default: 15, max: 50, step: 1 }), currencyField("nonEconomicCap", "Non-Economic Damages Cap (0 = none)", { default: 0, max: 10000000, step: 5000 })],
    calcResult: { label: "Loss of Consortium Value", format: "currency" },
    calcResults: [
      { key: "lossOfConsortiumValue", label: "Loss of Consortium Value", format: "currency", highlight: true },
      { key: "percentOfInjuredClaim", label: "Share of the Injured Spouse's Claim", format: "percentage" },
      { key: "combinedHouseholdClaim", label: "Combined Household Claim", format: "currency" },
    ],
    instructions: "Enter the injured spouse's total damages and a percentage reflecting how much the injury changed the relationship (more for permanent, life-altering injuries).",
    examples: `Example: a ${usd(200000)} injury claim with a 15% consortium share adds ${usd(exLc.lossOfConsortiumValue)} for the spouse.`,
    assumptions: "There's no formula in law; juries value consortium claims individually and they're often a modest share of the main claim. Many states count consortium under the same non-economic cap. Some states allow children or parents to claim consortium too. " + DISCLAIMER,
    faq: [
      { question: "What is loss of consortium?", answer: "The spouse's claim for loss of companionship, affection, intimacy and household help caused by the partner's injury." },
      { question: "Is loss of consortium a separate claim?", answer: "Yes, it belongs to the uninjured spouse, but it depends on the injured spouse's claim succeeding." },
    ],
  }),
  T({
    slug: "fela-settlement-calculator",
    title: "FELA Settlement Calculator (Railroad Workers)",
    description: "Estimate a FELA (Federal Employers' Liability Act) claim for an injured railroad worker — full damages including pain and suffering, reduced only by your comparative fault (none if a safety statute was violated).",
    metaTitle: "FELA Settlement Calculator — Railroad Injury Claim",
    metaDescription: "Free FELA settlement calculator. Railroad worker injury claim with pure comparative fault and the safety-statute rule.",
    calcInputs: [...claimInputs({ severity: E.SEVERITY_GENERAL, defaults: { medicalBills: 40000, lostWages: 30000 } }).filter((f) => (f as { key: string }).key !== "faultRule"), dropdown("safetyStatuteViolation", "Railroad Violated a Safety Statute (FSAA, LIA)?", YESNO, 0)],
    calcResult: { label: "Estimated Settlement", format: "currency" },
    calcResults: [...CLAIM_RESULTS, { key: "multiplierUsed", label: "Multiplier Used", format: "number" }],
    instructions: "Enter medical costs, lost wages (railroad wages are often high) and severity. FELA replaces workers' comp for railroad employees: you must show the railroad was at least partly negligent.",
    examples: `Example: ${usd(40000)} of medical bills and ${usd(30000)} of lost wages for a serious injury gives about ${usd(exFela.estimatedSettlement)} before fees.`,
    assumptions: "45 U.S.C. §51–60: the railroad is liable if its negligence played any part, even the slightest; pure comparative negligence reduces damages by the worker's share, except none when the railroad violated a safety statute. No damage caps; 3-year statute of limitations; Railroad Retirement sickness benefits may be repaid from the award. " + DISCLAIMER,
    faq: [
      { question: "Is FELA better than workers' comp?", answer: "It can be — FELA allows full damages including pain and suffering, but you must prove railroad negligence." },
      { question: "How long do I have to file a FELA claim?", answer: "Three years from the injury (or from when you knew of an occupational illness)." },
    ],
  }),
  T({
    slug: "florida-proposal-for-settlement-calculator",
    title: "Florida Proposal for Settlement Calculator (§768.79)",
    description: "Check the Florida offer of judgment / proposal for settlement fee-shifting rule — the defendant recovers fees if the judgment is 25% below its offer; the plaintiff if the judgment is 25% above their demand.",
    metaTitle: "Florida Proposal for Settlement Calculator — 25% Rule",
    metaDescription: "Free Florida proposal for settlement (§768.79) calculator. See whether the 25% rule shifts attorney fees based on the offer and judgment.",
    calcInputs: [currencyField("expectedJudgment", "Expected Judgment", { default: 70000, max: 1000000000, step: 1000 }), currencyField("defendantOffer", "Defendant's Proposal (0 if none)", { default: 100000, max: 1000000000, step: 1000 }), currencyField("plaintiffOffer", "Plaintiff's Proposal (0 if none)", { default: 0, max: 1000000000, step: 1000 }), currencyField("feesAfterOffer", "Fees & Costs Incurred After the Proposal", { default: 60000, max: 100000000, step: 1000 })],
    calcResult: { label: "Defendant Can Recover Fees? (1 = yes)", format: "number" },
    calcResults: [
      { key: "defendantCanRecoverFees", label: "Defendant Can Recover Fees? (1 = yes)", format: "number", highlight: true },
      { key: "plaintiffCanRecoverFees", label: "Plaintiff Can Recover Fees? (1 = yes)", format: "number" },
      { key: "judgmentBelowWhichPlaintiffPaysFees", label: "Judgment Below Which Plaintiff Pays Fees", format: "currency" },
      { key: "judgmentNeededToShiftFeesToDefendant", label: "Judgment Needed for Plaintiff's Fees", format: "currency" },
      { key: "feeExposure", label: "Fee Exposure", format: "currency" },
    ],
    instructions: "Enter the proposals made at least 45 days before trial (in the proper form) and the judgment you expect. Fees run from the date of the rejected proposal.",
    examples: `Example: a defendant offered ${usd(100000)}; a ${usd(70000)} judgment is at least 25% below it, so the plaintiff could owe about ${usd(exPfs.feeExposure)} of the defendant's fees and costs.`,
    assumptions: "Florida Statutes §768.79 and Rule 1.442: defendant entitled to fees if the judgment is at least 25% less than its offer (or no liability); plaintiff entitled if the judgment is at least 25% more than its demand. Strict form requirements; the court may disallow fees for bad-faith proposals. " + DISCLAIMER,
    faq: [
      { question: "What is a proposal for settlement in Florida?", answer: "A formal settlement offer that shifts attorney fees to the side that rejects it if the judgment misses it by 25% or more." },
      { question: "When can a proposal for settlement be served?", answer: "No earlier than 90 days after service on the defendant (or after the defendant appears) and no later than 45 days before trial." },
    ],
  }),
  T({
    slug: "crime-victim-compensation-calculator",
    title: "Crime Victim Compensation Calculator",
    description: "Estimate what your state's crime victim compensation program may pay — medical, counseling, lost wages, funeral and relocation costs, after insurance, up to the state maximum.",
    metaTitle: "Crime Victim Compensation Calculator — State Program Estimate",
    metaDescription: "Free crime victim compensation calculator. Eligible losses after insurance, up to your state's maximum award (often $25,000).",
    calcInputs: [currencyField("medicalCosts", "Medical & Dental Costs", { default: 12000, max: 5000000, step: 100 }), currencyField("lostWages", "Lost Wages / Support", { default: 6000, max: 5000000, step: 100 }), currencyField("counseling", "Counseling Costs", { default: 3000, max: 500000, step: 50 }), currencyField("funeralCosts", "Funeral & Burial Costs", { default: 0, max: 500000, step: 100 }), currencyField("relocation", "Relocation / Crime Scene Cleanup", { default: 2000, max: 200000, step: 50 }), currencyField("insurancePaid", "Insurance or Other Payments Received", { default: 4000, max: 5000000, step: 100 }), currencyField("stateMaximum", "Your State's Maximum Award", { default: 25000, max: 1000000, step: 1000 })],
    calcResult: { label: "Estimated Award", format: "currency" },
    calcResults: [
      { key: "estimatedAward", label: "Estimated Award", format: "currency", highlight: true },
      { key: "eligibleLosses", label: "Eligible Losses", format: "currency" },
      { key: "afterInsurance", label: "After Insurance and Other Payments", format: "currency" },
      { key: "stateMaximum", label: "State Maximum", format: "currency" },
    ],
    instructions: "Report the crime to police and cooperate with the investigation. Enter out-of-pocket losses and anything insurance or the offender already paid; find your state program's maximum (most are $10,000–$50,000).",
    examples: `Example: ${usd(23000)} of eligible losses with ${usd(4000)} paid by insurance could bring an award of about ${usd(exCvc.estimatedAward)}.`,
    assumptions: "State programs funded partly by the federal Crime Victims Fund (VOCA) pay victims of violent crime for unreimbursed expenses; property loss and pain and suffering are generally not covered. Programs are the payer of last resort and have filing deadlines (often 1–3 years). " + DISCLAIMER,
    faq: [
      { question: "What does crime victim compensation cover?", answer: "Medical and counseling costs, lost wages, funeral costs and sometimes relocation — not pain and suffering or stolen property." },
      { question: "Do I need a conviction to get victim compensation?", answer: "No — you usually need to report the crime and cooperate, but the offender doesn't have to be caught or convicted." },
    ],
  }),
  T({
    slug: "cica-compensation-calculator",
    title: "CICA Compensation Calculator (Criminal Injuries UK)",
    description: "Estimate a Criminal Injuries Compensation Authority (CICA) award — the tariff payment for your main injury plus 30% and 15% for the second and third, loss of earnings after 28 weeks at the SSP rate, and special expenses.",
    metaTitle: "CICA Calculator — Criminal Injuries Compensation (UK)",
    metaDescription: "Free CICA compensation calculator. Tariff award with 30%/15% for additional injuries, loss of earnings after 28 weeks and special expenses.",
    calcInputs: [currencyField("tariffAward", "Tariff Amount for Your Most Serious Injury (£)", { default: 11000, max: 250000, step: 100 }), currencyField("secondInjuryTariff", "Tariff for the Second Injury (£)", { default: 2400, max: 250000, step: 100 }), currencyField("thirdInjuryTariff", "Tariff for the Third Injury (£)", { default: 0, max: 250000, step: 100 }), numberField("weeksUnableToWork", "Weeks Unable to Work", { default: 40, max: 2600 }), currencyField("specialExpenses", "Special Expenses (£)", { default: 500, max: 500000, step: 50 })],
    calcResult: { label: "Total CICA Award", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "totalCicaAward", label: "Estimated Total Award", format: "currency", currency: "GBP", highlight: true },
      { key: "injuryPayment", label: "Injury Payment", format: "currency", currency: "GBP" },
      { key: "lossOfEarnings", label: "Loss of Earnings", format: "currency", currency: "GBP" },
      { key: "specialExpenses", label: "Special Expenses", format: "currency", currency: "GBP" },
    ],
    instructions: "Look up the tariff amount for each injury in the Criminal Injuries Compensation Scheme 2012 tariff (Annex E — e.g. sexual assault, fractures, scarring, mental injury). Loss of earnings needs at least 28 full weeks off work.",
    examples: `Example: an £11,000 main injury and a £2,400 second injury (30% = £720) plus 12 weeks of earnings loss after the first 28 weeks gives about £${exCica.totalCicaAward.toLocaleString("en-GB")}.`,
    assumptions: "Criminal Injuries Compensation Scheme 2012: 100% of the highest tariff, 30% of the second and 15% of the third; loss of earnings from the 29th week at the Statutory Sick Pay rate (£123.25 a week from April 2026 used here); maximum £500,000. Apply within 2 years; awards can be reduced for unspent convictions or not cooperating. " + DISCLAIMER,
    faq: [
      { question: "How much compensation does the CICA pay?", answer: "Tariff awards range from £1,000 to £250,000 for the injury, plus loss of earnings and expenses up to a £500,000 total." },
      { question: "Can I claim CICA if the attacker wasn't caught?", answer: "Yes — you need to report the crime and cooperate, but no conviction is required." },
    ],
  }),
  T({
    slug: "eu261-flight-compensation-calculator",
    title: "Flight Delay Compensation Calculator (EU261 / UK261)",
    description: "Check how much flight delay or cancellation compensation you can claim under EU261 (€250/€400/€600) or UK261 (£220/£350/£520) — by flight distance, arrival delay and extraordinary circumstances.",
    metaTitle: "Flight Delay Compensation Calculator — EU261 & UK261",
    metaDescription: "Free EU261 / UK261 flight compensation calculator. €250–€600 or £220–£520 per passenger by distance and delay, with the long-haul 50% rule.",
    calcInputs: [dropdown("scheme", "Rules", [["EU261 (EU flights / EU airlines)", 0], ["UK261 (flights from the UK / UK airlines)", 1]], 0), numberField("flightDistanceKm", "Flight Distance (km)", { default: 2200, max: 20000 }), numberField("arrivalDelayHours", "Arrival Delay (hours)", { default: 4, max: 72, step: 0.25 }), dropdown("cancelledOrDenied", "Cancelled (under 14 days' notice) or Denied Boarding?", YESNO, 0), dropdown("extraordinaryCircumstances", "Extraordinary Circumstances (weather, ATC strike, security)?", YESNO, 0), numberField("passengers", "Passengers on the Booking", { default: 2, min: 1, max: 20 })],
    calcResult: { label: "Compensation per Passenger", format: "number" },
    calcResults: [
      { key: "compensationPerPassenger", label: "Compensation per Passenger (€ or £)", format: "number", highlight: true },
      { key: "totalCompensation", label: "Total for the Booking", format: "number" },
      { key: "distanceBand", label: "Distance Band (1 ≤1,500 km, 2 ≤3,500, 3 longer)", format: "number" },
      { key: "eligible", label: "Eligible? (1 = yes)", format: "number" },
    ],
    instructions: "Enter the great-circle distance of the flight, how late you arrived at your final destination, and whether the flight was cancelled at short notice or you were denied boarding.",
    examples: `Example: a 2,200 km EU flight arriving 4 hours late gives €${exEu.compensationPerPassenger} per passenger — €${exEu.totalCompensation} for 2 people.`,
    assumptions: "Regulation (EC) 261/2004 (and the retained UK261): 3+ hours' arrival delay, short-notice cancellation or denied boarding pays €250 / €400 / €600 (UK £220 / £350 / £520) for flights up to 1,500 km / 1,500–3,500 km (and intra-EU over 1,500 km) / over 3,500 km; long-haul delays of 3–4 hours get 50%. No compensation for extraordinary circumstances. Claims can be made for up to 6 years in the UK (time limits vary in the EU). " + DISCLAIMER,
    faq: [
      { question: "How much compensation do I get for a delayed flight?", answer: "€250 to €600 (or £220 to £520 under UK rules) per passenger for arrivals 3+ hours late, depending on distance." },
      { question: "Does bad weather count as extraordinary circumstances?", answer: "Yes — severe weather, air traffic control strikes and security risks usually exempt the airline; technical faults usually don't." },
    ],
  }),
  T({
    slug: "ogden-tables-calculator",
    title: "Ogden Tables Calculator (Future Loss Multiplier)",
    description: "Estimate the Ogden multiplier for future loss of earnings or care in a UK personal injury claim — the annuity multiplier at the personal injury discount rate (+0.5% from January 2025), adjusted for contingencies.",
    metaTitle: "Ogden Tables Calculator — Future Loss Multiplier (+0.5%)",
    metaDescription: "Free Ogden multiplier calculator. Future loss multiplier at the +0.5% discount rate with a contingency factor, and the lump sum.",
    calcInputs: [numberField("yearsOfLoss", "Years of Future Loss (to retirement or for life)", { default: 25, max: 80, step: 0.5 }), percentField("discountRatePercent", "Personal Injury Discount Rate", { default: 0.5, max: 5, step: 0.25 }), numberField("contingencyFactor", "Contingency Reduction Factor (Ogden Tables A–D, 1 = none)", { default: 0.9, min: 0, max: 1, step: 0.01 }), currencyField("annualLoss", "Annual Net Loss (£)", { default: 18000, max: 1000000, step: 100 })],
    calcResult: { label: "Multiplier", format: "number" },
    calcResults: [
      { key: "multiplier", label: "Adjusted Multiplier", format: "number", highlight: true },
      { key: "futureLossLumpSum", label: "Future Loss Lump Sum", format: "currency", currency: "GBP" },
      { key: "unadjustedMultiplier", label: "Multiplier Before Contingencies", format: "number" },
      { key: "annualLoss", label: "Annual Loss", format: "currency", currency: "GBP" },
    ],
    instructions: "Enter the period of loss (for earnings, until expected retirement; for care, for the expected lifetime), the discount rate (+0.5% in England & Wales since 11 January 2025) and a contingency factor from the Ogden Tables' explanatory notes for employment risks.",
    examples: `Example: 25 years of £18,000 loss at +0.5% gives a multiplier of ${exOg.unadjustedMultiplier}, or ${exOg.multiplier} after a 0.9 contingency — about £${Math.round(exOg.futureLossLumpSum).toLocaleString("en-GB")}.`,
    assumptions: "Approximates the Ogden Tables with an annuity-certain at the discount rate; the real tables also include mortality, so for lifetime losses use the table figure for the claimant's age and sex. Scotland and Northern Ireland use their own rates. " + DISCLAIMER,
    faq: [
      { question: "What is the current Ogden discount rate?", answer: "+0.5% in England and Wales from 11 January 2025 (it was −0.25%)." },
      { question: "What are Ogden Tables used for?", answer: "To turn future annual losses (earnings, care, pension) into a single lump sum in UK personal injury claims." },
    ],
  }),
  T({
    slug: "no-win-no-fee-calculator",
    title: "No Win No Fee Calculator (UK Success Fee)",
    description: "Work out how much compensation you keep from a UK no win no fee claim — the success fee is capped at 25% of general damages and past losses in personal injury cases, plus any ATE insurance premium.",
    metaTitle: "No Win No Fee Calculator — How Much Do I Keep?",
    metaDescription: "Free no win no fee calculator. 25% success fee cap on general damages and past losses, ATE insurance and what you keep.",
    calcInputs: [currencyField("generalDamages", "General Damages (pain, suffering, loss of amenity, £)", { default: 12000, max: 10000000, step: 100 }), currencyField("pastLosses", "Past Losses (lost earnings, expenses, £)", { default: 3000, max: 10000000, step: 100 }), currencyField("futureLosses", "Future Losses (£ — protected from the fee)", { default: 0, max: 10000000, step: 100 }), percentField("successFeePercent", "Success Fee in Your Agreement", { default: 25, max: 25, step: 1 }), currencyField("ateInsurancePremium", "ATE Insurance Premium (£)", { default: 0, max: 100000, step: 10 })],
    calcResult: { label: "You Keep", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "youKeep", label: "You Keep", format: "currency", currency: "GBP", highlight: true },
      { key: "successFee", label: "Success Fee", format: "currency", currency: "GBP" },
      { key: "ateInsurance", label: "ATE Insurance", format: "currency", currency: "GBP" },
      { key: "totalCompensation", label: "Total Compensation", format: "currency", currency: "GBP" },
      { key: "youKeepPercent", label: "Share You Keep", format: "percentage" },
    ],
    instructions: "Enter the compensation broken down as in your settlement and the success fee percentage in your conditional fee agreement (CFA) or damages-based agreement.",
    examples: `Example: £12,000 general damages and £3,000 past losses with a 25% success fee: you keep £${exNw.youKeep.toLocaleString("en-GB")} (${exNw.youKeepPercent}%).`,
    assumptions: "LASPO 2012: in personal injury claims the success fee taken from damages is capped at 25% of general damages and past financial losses (future losses are protected). Base costs are usually paid by the losing side. Low-value road traffic claims under £5,000 go through the Official Injury Claim portal. " + DISCLAIMER,
    faq: [
      { question: "How much does a no win no fee solicitor take?", answer: "Up to 25% of your general damages and past losses in a personal injury claim, plus possibly an ATE premium." },
      { question: "Do I pay anything if I lose?", answer: "Usually not, if your agreement is truly no win no fee and covered by ATE insurance." },
    ],
  }),
  T({
    slug: "uk-personal-injury-compensation-calculator",
    title: "UK Personal Injury Compensation Calculator",
    description: "Estimate UK personal injury compensation (accident at work, road traffic accident, NHS clinical negligence) — general damages by severity band plus special damages, reduced for contributory negligence and a no win no fee deduction.",
    metaTitle: "UK Personal Injury Compensation Calculator — Claim Estimate",
    metaDescription: "Free UK compensation calculator for accidents at work, road traffic accidents and NHS negligence. General damages bands, special damages and what you keep.",
    calcInputs: [dropdown("severityBand", "Severity", E.UK_BANDS.map(([l, lo, hi], i) => [`${l} (£${lo.toLocaleString()}–£${hi.toLocaleString()})`, i] as [string, number]), 1), percentField("positionInBandPercent", "Position Within the Band", { default: 50, step: 5 }), currencyField("lossOfEarnings", "Loss of Earnings (£)", { default: 2500, max: 10000000, step: 50 }), currencyField("careAndTravel", "Care & Travel Costs (£)", { default: 400, max: 1000000, step: 10 }), currencyField("treatmentCosts", "Treatment Costs (£)", { default: 600, max: 1000000, step: 10 }), percentField("contributoryNegligencePercent", "Your Contributory Negligence", { default: 0, step: 5 }), percentField("successFeePercent", "No Win No Fee Success Fee", { default: 25, max: 25, step: 1 })],
    calcResult: { label: "Total Compensation", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "totalCompensation", label: "Estimated Total Compensation", format: "currency", currency: "GBP", highlight: true },
      { key: "generalDamages", label: "General Damages", format: "currency", currency: "GBP" },
      { key: "specialDamages", label: "Special Damages", format: "currency", currency: "GBP" },
      { key: "noWinNoFeeDeduction", label: "No Win No Fee Deduction", format: "currency", currency: "GBP" },
      { key: "youKeep", label: "You Keep", format: "currency", currency: "GBP" },
    ],
    instructions: "Pick the band that best describes your injury and recovery, then add financial losses you can prove. For whiplash from road traffic accidents under £5,000, the fixed Whiplash Injury Regulations tariff applies instead.",
    examples: `Example: a moderate injury recovered within 1–2 years (mid-band) with £3,500 of losses comes to about £${exUk.totalCompensation.toLocaleString("en-GB")} — £${exUk.youKeep.toLocaleString("en-GB")} after a 25% success fee.`,
    assumptions: "Bands are broad summaries of the Judicial College Guidelines (17th edition) brackets; your solicitor will use the specific bracket for your injury. Claims must usually be brought within 3 years (longer for children). Clinical negligence claims against the NHS are handled by NHS Resolution. " + DISCLAIMER,
    faq: [
      { question: "How much compensation will I get for my injury in the UK?", answer: "General damages follow Judicial College Guidelines — from a few thousand pounds for minor injuries to hundreds of thousands for life-changing ones — plus your financial losses." },
      { question: "How long do I have to claim?", answer: "Generally 3 years from the injury (or from when you knew about it); children have until age 21." },
    ],
  }),
  T({
    slug: "defamation-compensation-calculator",
    title: "Defamation Damages Calculator",
    description: "Estimate the value of a defamation (libel or slander) claim — provable financial loss, general damages for reputational harm and punitive damages where actual malice is shown — adjusted for risk and fees.",
    metaTitle: "Defamation Damages Calculator — Libel & Slander Claim Value",
    metaDescription: "Free defamation damages calculator. Special, general and punitive damages for libel or slander, risk-adjusted, after attorney fees.",
    calcInputs: [currencyField("provableFinancialLoss", "Provable Financial Loss (lost job, clients, contracts)", { default: 40000, max: 100000000, step: 1000 }), currencyField("reputationHarm", "General Damages for Reputational Harm", { default: 60000, max: 100000000, step: 1000 }), dropdown("actualMalice", "Can You Show Actual Malice (knowing falsity / reckless disregard)?", YESNO, 1), currencyField("punitiveDamages", "Punitive Damages (if malice)", { default: 50000, max: 1000000000, step: 1000 }), percentField("chanceOfWinningPercent", "Chance of Winning", { default: 50, step: 5 }), percentField("attorneyFeePercent", "Attorney Fee", { default: 40, max: 50, step: 1 })],
    calcResult: { label: "Risk-Adjusted Value", format: "currency" },
    calcResults: [
      { key: "riskAdjustedValue", label: "Risk-Adjusted Claim Value", format: "currency", highlight: true },
      { key: "specialDamages", label: "Special Damages", format: "currency" },
      { key: "generalDamages", label: "General Damages", format: "currency" },
      { key: "punitiveDamages", label: "Punitive Damages", format: "currency" },
      { key: "netAfterFees", label: "Net After Fees", format: "currency" },
    ],
    instructions: "Enter documented financial losses and your estimate of reputational harm. Public figures must prove actual malice; private individuals usually need only negligence, but punitive damages typically require malice.",
    examples: `Example: ${usd(40000)} of financial loss, ${usd(60000)} of reputational harm and ${usd(50000)} punitive at a 50% chance: about ${usd(exDf.riskAdjustedValue)} — ${usd(exDf.netAfterFees)} after a 40% fee.`,
    assumptions: "Defamation needs a false statement of fact, published to others, causing harm (some statements are defamatory per se). Truth and opinion are defenses; anti-SLAPP laws can make an unsuccessful plaintiff pay fees. Statutes of limitation are short (often 1–2 years). " + DISCLAIMER,
    faq: [
      { question: "How much can you sue for defamation?", answer: "It depends on provable harm — many cases settle for tens of thousands, while high-profile verdicts with malice reach millions." },
      { question: "What is actual malice?", answer: "Publishing a statement knowing it was false or with reckless disregard for whether it was true — required for public figures." },
    ],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-law-government-category.ts --apply" first.`);

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
