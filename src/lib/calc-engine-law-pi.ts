/**
 * Batch: "Law & Government Calculators" → Personal Injury & Settlement
 * Calculators (61 tools).
 *
 * Core claim model (US): special damages (medical bills + lost wages + future
 * costs + property) + general damages (pain and suffering = specials-based
 * multiplier for the chosen severity, or a per-diem amount) [+ punitive],
 * reduced by your share of fault under the state's rule (pure comparative,
 * modified 50% / 51% bar, or contributory negligence), optionally limited to
 * the at-fault party's policy limits, then attorney fees, case costs and
 * medical liens.
 *
 * INJURIES: each injury page has its own severity scale with typical
 * pain-and-suffering multipliers (low–high; the midpoint is used, adjustable).
 * ACCIDENTS: accident-type pages add their own rules — Michigan no-fault
 * (serious-impairment threshold, mini-tort up to $3,000), uninsured motorist
 * limits, dog bite strict liability, DUI punitive damages, wrongful death lost
 * support, medical malpractice non-economic caps, mesothelioma trust funds.
 *
 * Other tools: settlement tax (IRC §104(a)(2)), structured settlement payment,
 * mediation midpoint, class action payout per person, lemon law buyback (CA
 * usage offset), diminished value (17c), economic damages and lost wages
 * (present value), loss of consortium, FELA, Florida proposal for settlement
 * (§768.79 25% rule), crime victim compensation, CICA (UK), EU261 and UK261
 * flight compensation, Ogden multipliers (discount rate +0.5% from 11 Jan
 * 2025), UK no-win-no-fee (25% success fee cap), UK personal injury, defamation.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-law-pi-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

export const FAULT_RULES: [string, number][] = [
  ["Pure comparative (e.g. CA, NY, FL, MI, WA)", 0],
  ["Modified — barred at 51% (e.g. TX, IL, PA, OH, MI tort, NJ)", 1],
  ["Modified — barred at 50% (e.g. GA, CO, TN, AR)", 2],
  ["Contributory negligence — any fault bars (AL, MD, NC, VA, DC)", 3],
];

export function faultFactor(rule: number, faultPercent: number): number {
  const f = Math.min(100, nonNeg(faultPercent)) / 100;
  const r = Math.round(safeNumber(rule));
  if (r === 1 && f >= 0.51) return 0;
  if (r === 2 && f >= 0.5) return 0;
  if (r === 3 && f > 0) return 0;
  return 1 - f;
}

export interface Claim {
  medical: number;
  wages: number;
  future: number;
  property: number;
  multiplier: number;
  perDiem: number;
  punitive: number;
  rule: number;
  fault: number;
  policyLimit: number;
  feePct: number;
  costs: number;
  liens: number;
  nonEconomicCap?: number;
}

export function readClaim(v: Record<string, number>, multiplier: number): Claim {
  return {
    medical: nonNeg(v.medicalBills),
    wages: nonNeg(v.lostWages),
    future: nonNeg(v.futureCosts),
    property: nonNeg(v.propertyDamage),
    multiplier: nonNeg(v.multiplierOverride) > 0 ? nonNeg(v.multiplierOverride) : multiplier,
    perDiem: nonNeg(v.perDiemRate) * nonNeg(v.daysOfPain),
    punitive: nonNeg(v.punitiveDamages),
    rule: Math.round(safeNumber(v.faultRule)),
    fault: nonNeg(v.yourFaultPercent),
    policyLimit: nonNeg(v.policyLimit),
    feePct: Math.min(50, nonNeg(v.attorneyFeePercent, 33.33)),
    costs: nonNeg(v.caseCosts),
    liens: nonNeg(v.medicalLiens),
  };
}

export function settle(c: Claim) {
  const specials = c.medical + c.wages + c.future + c.property;
  let general = c.perDiem > 0 ? c.perDiem : (c.medical + c.future) * c.multiplier;
  if (c.nonEconomicCap !== undefined && c.nonEconomicCap > 0) general = Math.min(general, c.nonEconomicCap);
  const full = specials + general + c.punitive;
  const adjusted = full * faultFactor(c.rule, c.fault);
  const recoverable = c.policyLimit > 0 ? Math.min(adjusted, c.policyLimit) : adjusted;
  const fee = recoverable * (c.feePct / 100);
  const net = Math.max(0, recoverable - fee - c.costs - c.liens);
  return {
    estimatedSettlement: round2(recoverable),
    painAndSuffering: round2(general),
    specialDamages: round2(specials),
    afterFaultReduction: round2(adjusted),
    attorneyFee: round2(fee),
    netToYou: round2(net),
    lowEstimate: round2(recoverable * 0.75),
    highEstimate: round2(recoverable * 1.25),
  };
}

/** Injury pages: severity levels [label, low multiplier, high multiplier]. */
export interface InjuryType {
  slug: string;
  name: string;
  levels: [string, number, number][];
  note: string;
}
const I = (slug: string, name: string, levels: [string, number, number][], note: string): InjuryType => ({ slug, name, levels, note });
export const INJURIES: InjuryType[] = [
  I("back-injury-settlement-calculator", "Back Injury", [["Strain / sprain", 1.5, 2.5], ["Disc bulge with therapy", 2, 3.5], ["Herniated disc with injections", 3, 4.5], ["Back surgery (fusion, discectomy)", 4, 6]], "Back claims rise sharply with objective findings on MRI, injections and surgery."),
  I("neck-injury-settlement-calculator", "Neck Injury", [["Neck strain", 1.5, 2.5], ["Cervical disc injury", 2.5, 4], ["Neck surgery (ACDF)", 4, 6]], "Neck claims depend on imaging, nerve symptoms and surgery."),
  I("whiplash-settlement-calculator", "Whiplash", [["Mild (under 3 months)", 1.5, 2], ["Moderate (3–12 months)", 2, 3], ["Severe / chronic", 3, 4]], "Most whiplash claims are soft-tissue claims valued by treatment length."),
  I("soft-tissue-injury-settlement-calculator", "Soft Tissue Injury", [["Bruising / minor sprain", 1.5, 2], ["Sprain with physical therapy", 2, 2.5], ["Tear needing long treatment", 2.5, 3.5]], "Insurers often apply low multipliers to soft-tissue injuries without objective findings."),
  I("herniated-disc-settlement-calculator", "Herniated or Bulging Disc", [["Bulging disc, conservative care", 2, 3], ["Herniated disc, injections", 3, 4.5], ["Herniated disc, surgery", 4, 6]], "Pre-existing degeneration is the insurer's main argument; MRI comparison helps."),
  I("knee-injury-settlement-calculator", "Knee Injury", [["Sprain / contusion", 1.5, 2.5], ["Torn meniscus", 2.5, 4], ["ACL / ligament tear with surgery", 3.5, 5], ["Knee replacement", 4.5, 6]], "Surgery and future knee replacement drive knee settlements."),
  I("shoulder-injury-settlement-calculator", "Shoulder Injury", [["Strain", 1.5, 2.5], ["Labral / rotator cuff tear, no surgery", 2.5, 3.5], ["Rotator cuff surgery", 3.5, 5]], "Rotator cuff tears are often disputed as age-related — imaging timing matters."),
  I("ankle-injury-compensation-calculator", "Ankle Injury", [["Sprain", 1.5, 2.5], ["Fracture, cast", 2.5, 3.5], ["Fracture with surgery (ORIF)", 3.5, 5]], "Surgical fractures with hardware are valued higher, especially with lasting stiffness."),
  I("wrist-injury-compensation-calculator", "Wrist Injury", [["Sprain", 1.5, 2.5], ["Fracture, cast", 2.5, 3.5], ["Fracture with surgery / TFCC tear", 3.5, 5]], "Dominant-hand wrist injuries affecting work are valued higher."),
  I("hand-injury-compensation-calculator", "Hand Injury", [["Bruising / sprain", 1.5, 2.5], ["Fracture", 2.5, 3.5], ["Tendon / nerve damage or surgery", 3.5, 5], ["Loss of function", 5, 7]], "Grip loss and dominant-hand impairment raise value."),
  I("finger-injury-claim-calculator", "Finger Injury", [["Sprain / dislocation", 1.5, 2.5], ["Fracture", 2, 3], ["Amputation or permanent loss of use", 4, 6]], "Amputations and thumb/index-finger injuries are valued highest."),
  I("elbow-injury-claim-calculator", "Elbow Injury", [["Sprain", 1.5, 2.5], ["Fracture", 2.5, 3.5], ["Fracture with surgery / nerve damage", 3.5, 5]], "Ulnar nerve symptoms and loss of motion add value."),
  I("broken-arm-compensation-calculator", "Broken Arm", [["Simple fracture", 2, 3], ["Displaced fracture", 3, 4], ["Surgery with plates / pins", 4, 5.5]], "Surgery, hardware removal and lasting weakness increase the multiplier."),
  I("broken-jaw-compensation-calculator", "Broken Jaw", [["Fracture, no wiring", 2.5, 3.5], ["Wired jaw", 3.5, 4.5], ["Surgery with lasting TMJ problems", 4.5, 6]], "Eating and speech problems during wiring support a higher multiplier."),
  I("tbi-settlement-calculator", "Traumatic Brain Injury (TBI)", [["Concussion, full recovery", 2, 3.5], ["Post-concussion syndrome", 3.5, 5], ["Moderate TBI", 5, 7], ["Severe TBI", 7, 10]], "Neuropsychological testing documents cognitive loss; severe TBIs often reach policy limits."),
  I("nerve-damage-compensation-calculator", "Nerve Damage", [["Temporary numbness", 2, 3], ["Lasting nerve damage (radiculopathy)", 3, 5], ["Permanent loss of function", 5, 7]], "EMG / nerve conduction studies are key evidence."),
  I("crps-compensation-calculator", "CRPS (Complex Regional Pain Syndrome)", [["Early / improving CRPS", 4, 5], ["Chronic CRPS", 5, 7], ["Severe, disabling CRPS", 7, 10]], "CRPS is chronic and disputed; a pain specialist diagnosis is essential."),
  I("carpal-tunnel-compensation-calculator", "Carpal Tunnel Syndrome", [["Mild, splints", 1.5, 2.5], ["Injections / therapy", 2, 3], ["Release surgery", 3, 4]], "Work-caused carpal tunnel is usually a workers' comp claim, not a lawsuit."),
  I("burn-injury-compensation-calculator", "Burn Injury", [["First / small second-degree", 2, 3], ["Second-degree with scarring", 3, 5], ["Third-degree / skin grafts", 5, 8]], "Visible scarring, grafts and future reconstructive surgery drive burn values."),
  I("eye-injury-claim-calculator", "Eye Injury", [["Corneal abrasion", 1.5, 2.5], ["Injury with lasting vision change", 3, 5], ["Loss of an eye / blindness", 6, 10]], "Permanent vision loss is among the most valuable injuries."),
  I("scar-compensation-calculator", "Scarring (incl. facial scars)", [["Small, fading scar", 1.5, 2.5], ["Noticeable permanent scar", 2.5, 4], ["Disfiguring / facial scarring", 4, 6]], "Facial location, size and the person's age matter most."),
  I("hearing-loss-compensation-calculator", "Hearing Loss & Tinnitus", [["Temporary tinnitus", 1.5, 2.5], ["Permanent tinnitus", 2.5, 4], ["Permanent hearing loss", 4, 6]], "Audiograms before and after the incident make the case."),
  I("psychological-injury-compensation-calculator", "Psychological Injury (PTSD, anxiety, stress)", [["Short-term anxiety", 1.5, 2.5], ["Diagnosed PTSD / depression with therapy", 3, 4.5], ["Severe, long-term psychiatric injury", 4.5, 6]], "A diagnosis and treatment records are needed — many states limit emotional-only claims."),
  I("blood-clot-compensation-calculator", "Blood Clot (DVT / PE)", [["DVT, treated", 2.5, 3.5], ["Pulmonary embolism", 4, 6], ["Lasting damage (post-thrombotic)", 5, 7]], "Missed diagnosis of a clot is often a medical malpractice claim."),
];

const mid = (lvl: [string, number, number]) => (lvl[1] + lvl[2]) / 2;
export const injurySettlement = (t: InjuryType): CustomCalculator => (v) => {
  const lvl = t.levels[Math.min(t.levels.length - 1, Math.max(0, Math.round(safeNumber(v.severity))))];
  return { ...settle(readClaim(v, mid(lvl))), multiplierUsed: nonNeg(v.multiplierOverride) > 0 ? nonNeg(v.multiplierOverride) : mid(lvl) };
};

export const SEVERITY_GENERAL: [string, number, number][] = [["Minor (weeks of treatment)", 1.5, 2], ["Moderate (months, full recovery)", 2, 3], ["Serious (surgery or lasting symptoms)", 3, 4], ["Severe / permanent", 4, 5]];
export const generalSettlement: CustomCalculator = (v) => {
  const lvl = SEVERITY_GENERAL[Math.min(3, Math.max(0, Math.round(safeNumber(v.severity))))];
  return { ...settle(readClaim(v, mid(lvl))), multiplierUsed: nonNeg(v.multiplierOverride) > 0 ? nonNeg(v.multiplierOverride) : mid(lvl) };
};

export const painAndSuffering: CustomCalculator = (v) => {
  const econ = nonNeg(v.medicalBills) + nonNeg(v.futureCosts);
  const mult = nonNeg(v.multiplier, 2.5);
  const byMultiplier = econ * mult;
  const byPerDiem = nonNeg(v.perDiemRate) * nonNeg(v.daysOfPain);
  const f = faultFactor(v.faultRule, v.yourFaultPercent);
  return {
    painAndSufferingMultiplier: round2(byMultiplier * f),
    painAndSufferingPerDiem: round2(byPerDiem * f),
    averageOfMethods: round2(((byMultiplier + byPerDiem) / (byPerDiem > 0 ? 2 : 1)) * f),
    economicDamages: round2(econ),
  };
};

/** Michigan no-fault: PIP covers economic loss; tort claim for pain only with serious impairment. */
export const michiganCarAccident: CustomCalculator = (v) => {
  const serious = Math.round(safeNumber(v.seriousImpairment)) === 1;
  const lvl = SEVERITY_GENERAL[Math.min(3, Math.max(0, Math.round(safeNumber(v.severity))))];
  const pain = serious ? (nonNeg(v.medicalBills) + nonNeg(v.futureCosts)) * (nonNeg(v.multiplierOverride) || mid(lvl)) : 0;
  const excessEconomic = nonNeg(v.medicalBillsOverPipLimit) + nonNeg(v.wageLossAfter3Years);
  const miniTort = Math.min(3000, nonNeg(v.vehicleDamageNotCovered));
  const f = faultFactor(1, v.yourFaultPercent);
  const tort = (pain + excessEconomic) * f;
  const limited = nonNeg(v.policyLimit) > 0 ? Math.min(tort, nonNeg(v.policyLimit)) : tort;
  const fee = limited * (Math.min(50, nonNeg(v.attorneyFeePercent, 33.33)) / 100);
  return {
    estimatedSettlement: round2(limited + miniTort),
    painAndSuffering: round2(pain * f),
    pipCoversMedicalAndWages: 1,
    miniTortRecovery: round2(miniTort),
    attorneyFee: round2(fee),
    netToYou: round2(limited - fee + miniTort),
  };
};

export const uninsuredMotorist: CustomCalculator = (v) => {
  const lvl = SEVERITY_GENERAL[Math.min(3, Math.max(0, Math.round(safeNumber(v.severity))))];
  const c = readClaim(v, mid(lvl));
  c.policyLimit = 0;
  const full = settle(c).afterFaultReduction;
  const atFaultLimit = nonNeg(v.atFaultPolicyLimit);
  const umLimit = nonNeg(v.umLimit) * Math.max(1, Math.round(nonNeg(v.vehiclesStacked, 1)));
  const fromAtFault = Math.min(full, atFaultLimit);
  const fromUm = Math.min(Math.max(0, full - fromAtFault), umLimit);
  const total = fromAtFault + fromUm;
  const fee = total * (c.feePct / 100);
  return {
    totalRecovery: round2(total),
    fromAtFaultInsurer: round2(fromAtFault),
    fromYourUmUimCoverage: round2(fromUm),
    claimValue: round2(full),
    uncoveredAmount: round2(Math.max(0, full - total)),
    netToYou: round2(Math.max(0, total - fee - c.costs - c.liens)),
  };
};

export const wrongfulDeath: CustomCalculator = (v) => {
  const income = nonNeg(v.annualIncome);
  const years = Math.min(100, nonNeg(v.workYearsRemaining));
  const consumption = Math.min(80, nonNeg(v.personalConsumptionPercent, 30)) / 100;
  const r = Math.min(0.5, nonNeg(v.discountRatePercent, 3) / 100);
  const g = Math.min(0.5, nonNeg(v.wageGrowthPercent, 2) / 100);
  let pv = 0;
  for (let y = 1; y <= Math.round(years); y++) pv += (income * (1 - consumption) * Math.pow(1 + g, y - 1)) / Math.pow(1 + r, y);
  const services = nonNeg(v.annualHouseholdServices) * Math.round(years) * 0.8;
  const nonEcon = nonNeg(v.lossOfCompanionship);
  const cap = nonNeg(v.nonEconomicCap);
  const nonEconCapped = cap > 0 ? Math.min(nonEcon, cap) : nonEcon;
  const total = (pv + services + nonEconCapped + nonNeg(v.funeralAndMedical)) * faultFactor(v.faultRule, v.decedentFaultPercent);
  const limited = nonNeg(v.policyLimit) > 0 ? Math.min(total, nonNeg(v.policyLimit)) : total;
  const fee = limited * (Math.min(50, nonNeg(v.attorneyFeePercent, 33.33)) / 100);
  return {
    estimatedClaimValue: round2(limited),
    lostFinancialSupport: round2(pv),
    lostHouseholdServices: round2(services),
    lossOfCompanionship: round2(nonEconCapped),
    attorneyFee: round2(fee),
    netToFamily: round2(limited - fee),
  };
};

/** Accident pages that use the general model with their own default severity / extras. */
export const accidentSettlement = (opts: { punitiveDefault?: number; strictLiability?: boolean; capField?: boolean } = {}): CustomCalculator => (v) => {
  const lvl = SEVERITY_GENERAL[Math.min(3, Math.max(0, Math.round(safeNumber(v.severity))))];
  const c = readClaim(v, mid(lvl));
  if (opts.strictLiability && Math.round(safeNumber(v.provokedDog)) !== 1) c.fault = 0;
  if (opts.capField) c.nonEconomicCap = nonNeg(v.nonEconomicCap);
  if (nonNeg(v.trustFundRecovery) > 0) {
    const r = settle(c);
    const trust = nonNeg(v.trustFundRecovery);
    return { ...r, estimatedSettlement: round2(r.estimatedSettlement + trust), asbestosTrustFunds: trust, netToYou: round2(r.netToYou + trust * (1 - c.feePct / 100)) };
  }
  return { ...settle(c), multiplierUsed: nonNeg(v.multiplierOverride) > 0 ? nonNeg(v.multiplierOverride) : mid(lvl) };
};

// --- Settlement mechanics -----------------------------------------------------------------------
export const settlementTax: CustomCalculator = (v) => {
  const physical = Math.round(safeNumber(v.physicalInjury, 1)) === 1;
  const comp = nonNeg(v.compensatoryDamages);
  const wages = nonNeg(v.lostWagesPortion);
  const punitive = nonNeg(v.punitiveDamages);
  const interest = nonNeg(v.interest);
  const emotional = nonNeg(v.emotionalDistressPortion);
  const taxable = (physical ? 0 : comp + wages + Math.max(0, emotional - nonNeg(v.medicalExpensesForEmotional))) + punitive + interest;
  const rate = Math.min(50, nonNeg(v.taxRatePercent, 24)) / 100;
  const total = comp + wages + punitive + interest + emotional;
  return {
    estimatedTax: round2(taxable * rate),
    taxableAmount: round2(taxable),
    taxFreeAmount: round2(total - taxable),
    afterTaxSettlement: round2(total - taxable * rate),
  };
};

export const structuredSettlement: CustomCalculator = (v) => {
  const pv = nonNeg(v.lumpSum);
  const n = Math.max(1, Math.round(nonNeg(v.years, 20) * 12));
  const r = nonNeg(v.annualRatePercent, 4) / 100 / 12;
  const pmt = r > 0 ? (pv * r) / (1 - Math.pow(1 + r, -n)) : pv / n;
  return {
    monthlyPayment: round2(pmt),
    totalPaidOut: round2(pmt * n),
    growthOverLumpSum: round2(pmt * n - pv),
    annualPayment: round2(pmt * 12),
  };
};

export const mediationSettlement: CustomCalculator = (v) => {
  const demand = nonNeg(v.plaintiffDemand);
  const offer = nonNeg(v.defenseOffer);
  const mid = (demand + offer) / 2;
  const trial = nonNeg(v.expectedVerdict) * (Math.min(100, nonNeg(v.chanceOfWinningPercent, 60)) / 100) - nonNeg(v.trialCosts);
  return {
    midpoint: round2(mid),
    gap: round2(demand - offer),
    expectedTrialValue: round2(trial),
    settleIfAbove: round2(Math.max(0, trial)),
    bracketHigh: round2(mid + (demand - offer) / 4),
    bracketLow: round2(mid - (demand - offer) / 4),
  };
};

export const classAction: CustomCalculator = (v) => {
  const fund = nonNeg(v.settlementFund);
  const fees = fund * (Math.min(50, nonNeg(v.attorneyFeePercent, 25)) / 100) + nonNeg(v.adminCosts);
  const net = Math.max(0, fund - fees);
  const claimants = Math.max(1, nonNeg(v.validClaims));
  const share = nonNeg(v.yourPoints, 1) / Math.max(1e-9, nonNeg(v.averagePoints, 1));
  const per = (net / claimants) * share;
  return {
    estimatedPayout: round2(Math.min(per, nonNeg(v.perPersonCap) || per)),
    netFundAfterFees: round2(net),
    averagePerClaimant: round2(net / claimants),
    feesAndCosts: round2(fees),
  };
};

export const lemonLaw: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const miles = nonNeg(v.milesBeforeFirstRepair);
  const offset = (miles / Math.max(1, nonNeg(v.offsetDivisor, 120000))) * price;
  const refund = price + nonNeg(v.incidentalCosts) + nonNeg(v.financeChargesPaid) - offset - nonNeg(v.loanBalancePaidOff);
  return {
    estimatedBuyback: round2(price + nonNeg(v.incidentalCosts) + nonNeg(v.financeChargesPaid) - offset),
    usageOffset: round2(offset),
    cashToYouAfterLoanPayoff: round2(refund),
    offsetPercentOfPrice: round2(price > 0 ? (offset / price) * 100 : 0),
  };
};

export const diminishedValue: CustomCalculator = (v) => {
  const value = nonNeg(v.preAccidentValue);
  const base = value * 0.1;
  const dmg = [1, 0.75, 0.5, 0.25, 0][Math.min(4, Math.max(0, Math.round(safeNumber(v.damageSeverity))))];
  const miles = nonNeg(v.mileage);
  const mm = miles < 20000 ? 1 : miles < 40000 ? 0.8 : miles < 60000 ? 0.6 : miles < 80000 ? 0.4 : miles < 100000 ? 0.2 : 0;
  const dv17c = base * dmg * mm;
  const market = value * (nonNeg(v.marketLossPercent, 15) / 100);
  return {
    diminishedValue17c: round2(dv17c),
    marketBasedEstimate: round2(market),
    baseLoss10Percent: round2(base),
    damageMultiplier: dmg,
    mileageMultiplier: mm,
  };
};

function pvStream(annual: number, yearsIn: number, growthIn: number, discountIn: number) {
  // Keep inputs in a realistic range so present values stay finite.
  const years = Math.min(100, Math.max(0, yearsIn));
  const growth = Math.min(0.5, Math.max(0, growthIn));
  const discount = Math.min(0.5, Math.max(0, discountIn));
  let pv = 0;
  for (let y = 1; y <= Math.round(years); y++) pv += (annual * Math.pow(1 + growth, y - 1)) / Math.pow(1 + discount, y);
  const frac = years - Math.round(years);
  if (frac > 0) pv += (annual * frac * Math.pow(1 + growth, Math.round(years))) / Math.pow(1 + discount, Math.round(years) + 1);
  return pv;
}

export const economicDamages: CustomCalculator = (v) => {
  const g = nonNeg(v.growthPercent, 2) / 100;
  const r = nonNeg(v.discountRatePercent, 3) / 100;
  const pastMed = nonNeg(v.pastMedical);
  const pastWages = nonNeg(v.pastLostWages);
  const futureMed = pvStream(nonNeg(v.annualFutureMedical), nonNeg(v.futureMedicalYears), nonNeg(v.medicalInflationPercent, 3) / 100, r);
  const futureWages = pvStream(nonNeg(v.annualEarningsLoss), nonNeg(v.yearsOfEarningsLoss), g, r);
  const other = nonNeg(v.otherLosses);
  return {
    totalEconomicDamages: round2(pastMed + pastWages + futureMed + futureWages + other),
    pastDamages: round2(pastMed + pastWages),
    futureMedicalPresentValue: round2(futureMed),
    futureEarningsPresentValue: round2(futureWages),
    otherLosses: round2(other),
  };
};

export const lostWages: CustomCalculator = (v) => {
  const hourly = nonNeg(v.hourlyRate) > 0 ? nonNeg(v.hourlyRate) : nonNeg(v.annualSalary) / 2080;
  const past = hourly * nonNeg(v.hoursPerWeek, 40) * nonNeg(v.weeksMissed) + nonNeg(v.lostBenefitsAndPto) - nonNeg(v.disabilityPaymentsReceived) * (Math.round(safeNumber(v.collateralSourceRule, 1)) === 1 ? 0 : 1);
  const future = pvStream(nonNeg(v.futureAnnualLoss), nonNeg(v.futureYears), nonNeg(v.growthPercent, 2) / 100, nonNeg(v.discountRatePercent, 3) / 100);
  return {
    totalLostEarnings: round2(Math.max(0, past) + future),
    pastLostWages: round2(Math.max(0, past)),
    futureLostEarningsPresentValue: round2(future),
    hourlyRateUsed: round2(hourly),
  };
};

export const lossOfConsortium: CustomCalculator = (v) => {
  const injured = nonNeg(v.injuredSpouseDamages);
  const pct = Math.min(50, nonNeg(v.consortiumPercent, 15)) / 100;
  const cap = nonNeg(v.nonEconomicCap);
  const raw = injured * pct;
  return {
    lossOfConsortiumValue: round2(cap > 0 ? Math.min(raw, cap) : raw),
    percentOfInjuredClaim: round2(pct * 100),
    combinedHouseholdClaim: round2(injured + (cap > 0 ? Math.min(raw, cap) : raw)),
  };
};

export const fela: CustomCalculator = (v) => {
  const lvl = SEVERITY_GENERAL[Math.min(3, Math.max(0, Math.round(safeNumber(v.severity))))];
  const c = readClaim(v, mid(lvl));
  c.rule = 0; // FELA: pure comparative negligence; no fault reduction if the railroad violated a safety statute
  if (Math.round(safeNumber(v.safetyStatuteViolation)) === 1) c.fault = 0;
  return { ...settle(c), multiplierUsed: mid(lvl) };
};

export const floridaProposalForSettlement: CustomCalculator = (v) => {
  const judgment = nonNeg(v.expectedJudgment);
  const defOffer = nonNeg(v.defendantOffer);
  const plOffer = nonNeg(v.plaintiffOffer);
  const fees = nonNeg(v.feesAfterOffer);
  const defendantRecovers = defOffer > 0 && judgment <= defOffer * 0.75;
  const plaintiffRecovers = plOffer > 0 && judgment >= plOffer * 1.25;
  return {
    plaintiffCanRecoverFees: plaintiffRecovers ? 1 : 0,
    defendantCanRecoverFees: defendantRecovers ? 1 : 0,
    judgmentNeededToShiftFeesToDefendant: round2(plOffer * 1.25),
    judgmentBelowWhichPlaintiffPaysFees: round2(defOffer * 0.75),
    feeExposure: round2(defendantRecovers || plaintiffRecovers ? fees : 0),
  };
};

export const crimeVictimComp: CustomCalculator = (v) => {
  const losses = nonNeg(v.medicalCosts) + nonNeg(v.lostWages) + nonNeg(v.counseling) + nonNeg(v.funeralCosts) + nonNeg(v.relocation);
  const covered = Math.max(0, losses - nonNeg(v.insurancePaid));
  const cap = nonNeg(v.stateMaximum, 25000);
  return {
    estimatedAward: round2(Math.min(covered, cap)),
    eligibleLosses: round2(losses),
    afterInsurance: round2(covered),
    stateMaximum: cap,
  };
};

export const cica: CustomCalculator = (v) => {
  const tariff = nonNeg(v.tariffAward);
  const second = nonNeg(v.secondInjuryTariff) * 0.3;
  const third = nonNeg(v.thirdInjuryTariff) * 0.15;
  const weeksOff = nonNeg(v.weeksUnableToWork);
  const lossOfEarnings = Math.max(0, weeksOff - 28) * 123.25;
  const special = nonNeg(v.specialExpenses);
  return {
    totalCicaAward: round2(Math.min(500000, tariff + second + third + lossOfEarnings + special)),
    injuryPayment: round2(tariff + second + third),
    lossOfEarnings: round2(lossOfEarnings),
    specialExpenses: round2(special),
  };
};

export const eu261: CustomCalculator = (v) => {
  const km = nonNeg(v.flightDistanceKm);
  const delay = nonNeg(v.arrivalDelayHours);
  const uk = Math.round(safeNumber(v.scheme)) === 1;
  const band = km <= 1500 ? 0 : km <= 3500 ? 1 : 2;
  const amounts = uk ? [220, 350, 520] : [250, 400, 600];
  const extraordinary = Math.round(safeNumber(v.extraordinaryCircumstances)) === 1;
  const rerouted = Math.round(safeNumber(v.cancelledOrDenied)) === 1;
  let amount = delay >= 3 || rerouted ? amounts[band] : 0;
  // Within band thresholds of 2/3/4 hours the award can be halved (rerouting rule, long-haul 3–4 h delays).
  if (amount > 0 && band === 2 && delay < 4 && !rerouted) amount /= 2;
  if (extraordinary) amount = 0;
  const pax = Math.max(1, Math.round(nonNeg(v.passengers, 1)));
  return {
    compensationPerPassenger: round2(amount),
    totalCompensation: round2(amount * pax),
    distanceBand: band + 1,
    eligible: amount > 0 ? 1 : 0,
  };
};

/** Ogden-style multiplier: annuity-certain at the discount rate (approximation of the tables). */
export const ogden: CustomCalculator = (v) => {
  const years = nonNeg(v.yearsOfLoss);
  const r = safeNumber(v.discountRatePercent, 0.5) / 100;
  const mult = Math.abs(r) < 1e-9 ? years : (1 - Math.pow(1 + r, -years)) / r;
  const contingency = Math.min(1, nonNeg(v.contingencyFactor, 1));
  const annual = nonNeg(v.annualLoss);
  return {
    multiplier: round2(mult * contingency),
    futureLossLumpSum: round2(annual * mult * contingency),
    unadjustedMultiplier: round2(mult),
    annualLoss: round2(annual),
  };
};

export const noWinNoFee: CustomCalculator = (v) => {
  const general = nonNeg(v.generalDamages);
  const pastLosses = nonNeg(v.pastLosses);
  const future = nonNeg(v.futureLosses);
  const fee = Math.min((general + pastLosses) * 0.25, (general + pastLosses + future) * (Math.min(100, nonNeg(v.successFeePercent, 25)) / 100));
  const ate = nonNeg(v.ateInsurancePremium);
  const total = general + pastLosses + future;
  return {
    youKeep: round2(total - fee - ate),
    successFee: round2(fee),
    ateInsurance: round2(ate),
    totalCompensation: round2(total),
    youKeepPercent: round2(total > 0 ? ((total - fee - ate) / total) * 100 : 0),
  };
};

export const UK_BANDS: [string, number, number][] = [
  ["Minor injury, recovered within months", 1500, 4500],
  ["Moderate injury, recovered within 1–2 years", 4500, 15000],
  ["Serious injury with lasting symptoms", 15000, 50000],
  ["Severe / permanent injury", 50000, 150000],
  ["Very severe (life-changing)", 150000, 400000],
];
export const ukPersonalInjury: CustomCalculator = (v) => {
  const band = UK_BANDS[Math.min(UK_BANDS.length - 1, Math.max(0, Math.round(safeNumber(v.severityBand))))];
  const pos = Math.min(100, nonNeg(v.positionInBandPercent, 50)) / 100;
  const general = band[1] + (band[2] - band[1]) * pos;
  const special = nonNeg(v.lossOfEarnings) + nonNeg(v.careAndTravel) + nonNeg(v.treatmentCosts);
  const f = 1 - Math.min(100, nonNeg(v.contributoryNegligencePercent)) / 100;
  const total = (general + special) * f;
  const fee = Math.min((general * f + special * f) * 0.25, total * (nonNeg(v.successFeePercent, 25) / 100));
  return {
    totalCompensation: round2(total),
    generalDamages: round2(general * f),
    specialDamages: round2(special * f),
    noWinNoFeeDeduction: round2(fee),
    youKeep: round2(total - fee),
  };
};

export const defamation: CustomCalculator = (v) => {
  const special = nonNeg(v.provableFinancialLoss);
  const general = nonNeg(v.reputationHarm);
  const punitive = Math.round(safeNumber(v.actualMalice)) === 1 ? nonNeg(v.punitiveDamages) : 0;
  const total = (special + general + punitive) * (Math.min(100, nonNeg(v.chanceOfWinningPercent, 50)) / 100);
  const fee = total * (Math.min(50, nonNeg(v.attorneyFeePercent, 40)) / 100);
  return {
    riskAdjustedValue: round2(total),
    specialDamages: round2(special),
    generalDamages: round2(general),
    punitiveDamages: round2(punitive),
    netAfterFees: round2(total - fee),
  };
};

export const lawPiCustomCalculators: Record<string, CustomCalculator> = {
  "personal-injury-settlement-calculator": generalSettlement,
  "pain-and-suffering-calculator": painAndSuffering,
  "car-accident-settlement-calculator": accidentSettlement(),
  "michigan-car-accident-settlement-calculator": michiganCarAccident,
  "truck-accident-settlement-calculator": accidentSettlement(),
  "motorcycle-accident-settlement-calculator": accidentSettlement(),
  "bus-accident-compensation-calculator": accidentSettlement(),
  "hit-and-run-settlement-calculator": uninsuredMotorist,
  "uninsured-motorist-claim-calculator": uninsuredMotorist,
  "rear-end-collision-settlement-calculator": accidentSettlement(),
  "slip-and-fall-settlement-calculator": accidentSettlement(),
  "dog-bite-settlement-calculator": accidentSettlement({ strictLiability: true }),
  "dui-accident-settlement-calculator": accidentSettlement(),
  "wrongful-death-settlement-calculator": wrongfulDeath,
  "medical-malpractice-settlement-calculator": accidentSettlement({ capField: true }),
  "birth-injury-compensation-calculator": accidentSettlement({ capField: true }),
  "mesothelioma-compensation-calculator": accidentSettlement(),
  "food-poisoning-claim-calculator": accidentSettlement(),
  ...Object.fromEntries(INJURIES.map((t) => [t.slug, injurySettlement(t)])),
  "settlement-tax-calculator": settlementTax,
  "structured-settlement-calculator": structuredSettlement,
  "mediation-settlement-calculator": mediationSettlement,
  "class-action-settlement-payout-calculator": classAction,
  "lemon-law-buyback-calculator": lemonLaw,
  "diminished-value-calculator": diminishedValue,
  "economic-damages-calculator": economicDamages,
  "lost-wages-calculator": lostWages,
  "loss-of-consortium-calculator": lossOfConsortium,
  "fela-settlement-calculator": fela,
  "florida-proposal-for-settlement-calculator": floridaProposalForSettlement,
  "crime-victim-compensation-calculator": crimeVictimComp,
  "cica-compensation-calculator": cica,
  "eu261-flight-compensation-calculator": eu261,
  "ogden-tables-calculator": ogden,
  "no-win-no-fee-calculator": noWinNoFee,
  "uk-personal-injury-compensation-calculator": ukPersonalInjury,
  "defamation-compensation-calculator": defamation,
};
