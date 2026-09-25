/**
 * UK extended batch — 15 more UK-specific tools filed under the existing
 * "UK Tax & Salary Calculators" category (slug "uk-tax-salary-calculators",
 * created by create-uk-income-tax-tool.ts), alongside uk-income-tax-
 * calculator and scotland-income-tax-calculator (see calc-engine-uk.ts).
 *
 * This file deliberately does NOT import anything from calc-engine-uk.ts —
 * same per-file constant/helper duplication convention used everywhere
 * else on this site (see e.g. calc-engine-property-tax-self-employment-
 * calculators.ts's header) — so touching this file can never break the
 * two existing UK income tax tools, and vice versa.
 *
 * Every tool here is scoped to "rest of UK" (England, Wales, Northern
 * Ireland) income tax bands where income tax is involved — same scope as
 * uk-income-tax-calculator. National Insurance, Dividend Tax, Capital
 * Gains Tax, Inheritance Tax, VAT, and Stamp Duty Land Tax are NOT
 * devolved to Scotland (they're UK-wide), so those tools apply UK-wide
 * regardless of where the visitor lives; only the income-tax-rate-based
 * tools (PAYE, Self Employed, Freelance, Rental Income, Pension, Bonus,
 * Overtime) use rest-of-UK bands specifically, noted in each tool's own
 * copy.
 *
 * FIGURES — tax year 2026/27 (6 April 2026 – 5 April 2027), each sourced
 * directly from GOV.UK:
 *   - Personal Allowance £12,570 (tapered above £100,000): gov.uk/income-tax-rates
 *   - Rest-of-UK income tax bands 20%/40%/45%: gov.uk/income-tax-rates
 *   - National Insurance (Class 1 employee): Primary Threshold £12,570,
 *     Upper Earnings Limit £50,270, 8% main rate, 2% above UEL:
 *     gov.uk/national-insurance-rates-letters
 *   - National Insurance (Class 1 employer/secondary): Secondary Threshold
 *     £5,000/year, 15% rate: gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 *   - National Insurance (Class 4, self-employed): 6% on profits £12,570–
 *     £50,270, 2% above; Class 2 no longer compulsory above the Lower
 *     Profits Limit: gov.uk/self-employed-national-insurance-rates
 *   - Dividend Allowance £500, rates 10.75%/35.75%/39.35%: gov.uk/tax-on-dividends
 *   - Capital Gains Tax Annual Exempt Amount £3,000, rates 18%/24% (now
 *     equalised across asset types, including residential property):
 *     gov.uk/guidance/capital-gains-tax-rates-and-allowances
 *   - Inheritance Tax nil-rate band £325,000 (frozen to 2031), 40% rate,
 *     residence nil-rate band £175,000 tapering from £2m estates:
 *     gov.uk/inheritance-tax, gov.uk/guidance/inheritance-tax-residence-nil-rate-band
 *   - VAT standard rate 20%, reduced rate 5%, registration threshold
 *     £90,000: gov.uk/vat-rates, gov.uk/vat-registration/when-to-register
 *   - Stamp Duty Land Tax (England & Northern Ireland) standard and
 *     first-time-buyer bands, 5% additional-property surcharge:
 *     gov.uk/stamp-duty-land-tax/residential-property-rates
 *   - Pension Annual Allowance £60,000: gov.uk/tax-on-your-private-pension/annual-allowance
 *
 * Same "estimate-grade" model as every other calculator on this site — see
 * each tool's own Assumptions text for the full disclaimer shown to
 * visitors.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

// ---------------------------------------------------------------------------
// Shared UK constants and helpers
// ---------------------------------------------------------------------------

const PERSONAL_ALLOWANCE_2026 = 12570;
const PERSONAL_ALLOWANCE_TAPER_START_2026 = 100000;

function personalAllowanceFor(income: number): number {
  if (income <= PERSONAL_ALLOWANCE_TAPER_START_2026) return PERSONAL_ALLOWANCE_2026;
  const reduction = (income - PERSONAL_ALLOWANCE_TAPER_START_2026) / 2;
  return Math.max(0, PERSONAL_ALLOWANCE_2026 - reduction);
}

const UK_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.2, upTo: 37700 },
  { rate: 0.4, upTo: 112570 },
  { rate: 0.45, upTo: Infinity },
];

function progressiveTax(taxableIncome: number, bands: { rate: number; upTo: number }[]): number {
  let tax = 0;
  let bandFloor = 0;
  for (const band of bands) {
    if (taxableIncome <= bandFloor) break;
    const amountInBand = Math.min(taxableIncome, band.upTo) - bandFloor;
    if (amountInBand > 0) tax += amountInBand * band.rate;
    bandFloor = band.upTo;
    if (taxableIncome <= band.upTo) break;
  }
  return tax;
}

/** Tax on a SLICE of income of size `amount` stacking on top of `floor` —
 * same stacking-rule helper used throughout this project's other tax
 * families, duplicated here per this project's per-file convention. */
function stackedTax(floor: number, amount: number, bands: { rate: number; upTo: number }[]): number {
  let tax = 0;
  let remaining = Math.max(0, amount);
  let cursor = Math.max(0, floor);
  for (const band of bands) {
    if (remaining <= 0) break;
    if (cursor >= band.upTo) continue;
    const roomInBand = band.upTo - cursor;
    const amountHere = Math.min(remaining, roomInBand);
    tax += amountHere * band.rate;
    cursor += amountHere;
    remaining -= amountHere;
  }
  return tax;
}

function marginalRateAtFloor(floor: number, bands: { rate: number; upTo: number }[]): number {
  for (const band of bands) {
    if (floor < band.upTo) return band.rate;
  }
  return bands[bands.length - 1]?.rate ?? 0;
}

/** Taxable income after the (tapered) Personal Allowance comes out. */
function taxableAfterAllowance(income: number): number {
  return Math.max(0, income - personalAllowanceFor(income));
}

// National Insurance (Class 1, employee) — Primary Threshold, Upper
// Earnings Limit, main/upper rates.
const NI_PRIMARY_THRESHOLD_2026 = 12570;
const NI_UPPER_EARNINGS_LIMIT_2026 = 50270;
const NI_MAIN_RATE = 0.08;
const NI_UPPER_RATE = 0.02;

function employeeNationalInsurance(annualNiablePay: number): number {
  const mainBand = Math.max(0, Math.min(annualNiablePay, NI_UPPER_EARNINGS_LIMIT_2026) - NI_PRIMARY_THRESHOLD_2026);
  const upperBand = Math.max(0, annualNiablePay - NI_UPPER_EARNINGS_LIMIT_2026);
  return mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE;
}

// National Insurance (Class 1, employer/secondary) — Secondary Threshold,
// flat rate above it.
const NI_SECONDARY_THRESHOLD_2026 = 5000;
const NI_EMPLOYER_RATE = 0.15;

function employerNationalInsurance(annualPay: number): number {
  return Math.max(0, annualPay - NI_SECONDARY_THRESHOLD_2026) * NI_EMPLOYER_RATE;
}

// National Insurance (Class 4, self-employed).
const NI_CLASS4_LOWER_LIMIT_2026 = 12570;
const NI_CLASS4_UPPER_LIMIT_2026 = 50270;
const NI_CLASS4_MAIN_RATE = 0.06;
const NI_CLASS4_UPPER_RATE = 0.02;

function class4NationalInsurance(annualProfit: number): number {
  const mainBand = Math.max(0, Math.min(annualProfit, NI_CLASS4_UPPER_LIMIT_2026) - NI_CLASS4_LOWER_LIMIT_2026);
  const upperBand = Math.max(0, annualProfit - NI_CLASS4_UPPER_LIMIT_2026);
  return mainBand * NI_CLASS4_MAIN_RATE + upperBand * NI_CLASS4_UPPER_RATE;
}

function periodsFrom(raw: number | undefined): number {
  return safeNumber(raw, 12) || 12;
}

// ---------------------------------------------------------------------------
// 1. UK National Insurance Calculator — the employee Class 1 NI piece
//    alone, standalone (uk-income-tax-calculator bundles this WITH income
//    tax; this tool is for a visitor who just wants the NI figure).
// ---------------------------------------------------------------------------

const ukNationalInsuranceCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periods = periodsFrom(values.payFrequency);

  const annualNi = employeeNationalInsurance(annualSalary);

  return {
    annualNationalInsurance: annualNi,
    perPeriodNationalInsurance: annualNi / periods,
    mainRateBand: Math.max(0, Math.min(annualSalary, NI_UPPER_EARNINGS_LIMIT_2026) - NI_PRIMARY_THRESHOLD_2026),
    upperRateBand: Math.max(0, annualSalary - NI_UPPER_EARNINGS_LIMIT_2026),
  };
};

// ---------------------------------------------------------------------------
// 2. UK PAYE Calculator — a single payslip's Income Tax and National
//    Insurance, calculated on a "Week 1/Month 1" (non-cumulative, per-
//    period) basis, the way real UK payroll calculates NI every period and
//    the way new starters or irregular pay are taxed — genuinely different
//    from uk-income-tax-calculator's smoothed ANNUAL-salary-divided-evenly
//    model, and more realistic for a one-off or irregular payment.
// ---------------------------------------------------------------------------

const ukPayeCalculator: CustomCalculator = (values) => {
  const grossPayThisPeriod = Math.max(0, safeNumber(values.grossPayThisPeriod));
  const periods = periodsFrom(values.payFrequency);

  const periodicAllowance = PERSONAL_ALLOWANCE_2026 / periods;
  const periodicBands = UK_BANDS_2026.map((b) => ({ rate: b.rate, upTo: b.upTo === Infinity ? Infinity : b.upTo / periods }));
  const taxableThisPeriod = Math.max(0, grossPayThisPeriod - periodicAllowance);
  const incomeTaxThisPeriod = progressiveTax(taxableThisPeriod, periodicBands);

  const periodicPT = NI_PRIMARY_THRESHOLD_2026 / periods;
  const periodicUEL = NI_UPPER_EARNINGS_LIMIT_2026 / periods;
  const niMainBand = Math.max(0, Math.min(grossPayThisPeriod, periodicUEL) - periodicPT);
  const niUpperBand = Math.max(0, grossPayThisPeriod - periodicUEL);
  const nationalInsuranceThisPeriod = niMainBand * NI_MAIN_RATE + niUpperBand * NI_UPPER_RATE;

  const netPayThisPeriod = grossPayThisPeriod - incomeTaxThisPeriod - nationalInsuranceThisPeriod;

  return {
    incomeTaxThisPeriod,
    nationalInsuranceThisPeriod,
    totalDeductionsThisPeriod: incomeTaxThisPeriod + nationalInsuranceThisPeriod,
    netPayThisPeriod,
  };
};

// ---------------------------------------------------------------------------
// 3. UK Employer National Insurance Calculator — the EMPLOYER's own Class 1
//    (secondary) NI cost of an employee, on top of gross salary.
// ---------------------------------------------------------------------------

const ukEmployerNationalInsuranceCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));

  const employerNi = employerNationalInsurance(annualSalary);
  const totalEmploymentCost = annualSalary + employerNi;

  return {
    employerNationalInsurance: employerNi,
    totalEmploymentCost,
    thresholdUsed: NI_SECONDARY_THRESHOLD_2026,
  };
};

// ---------------------------------------------------------------------------
// 4. UK Dividend Tax Calculator — Dividend Allowance (£500, tax-free) then
//    the 10.75%/35.75%/39.35% dividend rates, stacked on top of other
//    income the same way HMRC's own worksheet stacks dividends last.
// ---------------------------------------------------------------------------

const UK_DIVIDEND_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.1075, upTo: 37700 },
  { rate: 0.3575, upTo: 112570 },
  { rate: 0.3935, upTo: Infinity },
];
const DIVIDEND_ALLOWANCE_2026 = 500;

const ukDividendTaxCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const dividendIncome = Math.max(0, safeNumber(values.dividendIncome));

  const floor = taxableAfterAllowance(otherIncome);
  const taxableDividends = Math.max(0, dividendIncome - DIVIDEND_ALLOWANCE_2026);
  const dividendTax = stackedTax(floor, taxableDividends, UK_DIVIDEND_BANDS_2026);
  const netDividends = Math.max(0, dividendIncome - dividendTax);

  return {
    taxFreeAllowanceUsed: Math.min(dividendIncome, DIVIDEND_ALLOWANCE_2026),
    taxableDividends,
    dividendTax,
    netDividends,
  };
};

// ---------------------------------------------------------------------------
// 5. UK Capital Gains Tax Calculator — Annual Exempt Amount (£3,000) then
//    18%/24%, now equalised across asset types including residential
//    property (from 30 October 2024).
// ---------------------------------------------------------------------------

const UK_CGT_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0.18, upTo: 37700 },
  { rate: 0.24, upTo: Infinity },
];
const CGT_ANNUAL_EXEMPT_AMOUNT_2026 = 3000;

const ukCapitalGainsTaxCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const gainAmount = Math.max(0, safeNumber(values.gainAmount));

  const floor = taxableAfterAllowance(otherIncome);
  const taxableGain = Math.max(0, gainAmount - CGT_ANNUAL_EXEMPT_AMOUNT_2026);
  const capitalGainsTax = stackedTax(floor, taxableGain, UK_CGT_BANDS_2026);
  const netProceeds = Math.max(0, gainAmount - capitalGainsTax);
  const effectiveRate = gainAmount > 0 ? (capitalGainsTax / gainAmount) * 100 : 0;

  return {
    exemptAmountUsed: Math.min(gainAmount, CGT_ANNUAL_EXEMPT_AMOUNT_2026),
    taxableGain,
    capitalGainsTax,
    netProceeds,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 6. UK Property Tax Calculator — UK's actual recurring annual property
//    tax is Council Tax, not a US-style assessed-value percentage — banded
//    A–H as a multiplier of the local authority's Band D charge.
// ---------------------------------------------------------------------------

const COUNCIL_TAX_BAND_MULTIPLIERS: Record<number, number> = {
  0: 6 / 9, // Band A
  1: 7 / 9, // Band B
  2: 8 / 9, // Band C
  3: 9 / 9, // Band D
  4: 11 / 9, // Band E
  5: 13 / 9, // Band F
  6: 15 / 9, // Band G
  7: 18 / 9, // Band H
};

const ukPropertyTaxCalculator: CustomCalculator = (values) => {
  const bandDCharge = Math.max(0, safeNumber(values.bandDCharge));
  const bandIndex = Math.round(safeNumber(values.councilTaxBand, 3));
  const multiplier = COUNCIL_TAX_BAND_MULTIPLIERS[bandIndex] ?? COUNCIL_TAX_BAND_MULTIPLIERS[3];

  const annualCouncilTax = bandDCharge * multiplier;

  return {
    annualCouncilTax,
    monthlyCouncilTax: annualCouncilTax / 12,
    bandMultiplier: multiplier * 100,
  };
};

// ---------------------------------------------------------------------------
// 7. UK Stamp Duty Calculator — SDLT, England & Northern Ireland, full
//    tiered bands (standard, first-time buyer relief, and the additional-
//    property surcharge) — unlike the site's generic, flat-rate Stamp Duty
//    Calculator under Tax Calculators, which explicitly doesn't model
//    tiered bands.
// ---------------------------------------------------------------------------

const SDLT_STANDARD_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 125000 },
  { rate: 0.02, upTo: 250000 },
  { rate: 0.05, upTo: 925000 },
  { rate: 0.1, upTo: 1500000 },
  { rate: 0.12, upTo: Infinity },
];
const SDLT_FTB_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 300000 },
  { rate: 0.05, upTo: 500000 },
];
const SDLT_FTB_RELIEF_CEILING = 500000;
const SDLT_ADDITIONAL_PROPERTY_SURCHARGE = 0.05;

function tieredTax(price: number, bands: { rate: number; upTo: number }[]): number {
  return stackedTax(0, price, bands);
}

const ukStampDutyCalculator: CustomCalculator = (values) => {
  const propertyPrice = Math.max(0, safeNumber(values.propertyPrice));
  const isFirstTimeBuyer = safeNumber(values.isFirstTimeBuyer) === 1;
  const isAdditionalProperty = safeNumber(values.isAdditionalProperty) === 1;

  let baseDuty: number;
  if (isFirstTimeBuyer && propertyPrice <= SDLT_FTB_RELIEF_CEILING) {
    baseDuty = tieredTax(propertyPrice, SDLT_FTB_BANDS_2026);
  } else {
    baseDuty = tieredTax(propertyPrice, SDLT_STANDARD_BANDS_2026);
  }

  const surcharge = isAdditionalProperty ? propertyPrice * SDLT_ADDITIONAL_PROPERTY_SURCHARGE : 0;
  const totalStampDuty = baseDuty + surcharge;
  const effectiveRate = propertyPrice > 0 ? (totalStampDuty / propertyPrice) * 100 : 0;

  return {
    baseDuty,
    additionalPropertySurcharge: surcharge,
    totalStampDuty,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 8. UK Inheritance Tax Calculator — nil-rate band + residence nil-rate
//    band (with its £2m taper), 40% on the excess.
// ---------------------------------------------------------------------------

const IHT_NIL_RATE_BAND_2026 = 325000;
const IHT_RESIDENCE_NIL_RATE_BAND_2026 = 175000;
const IHT_RNRB_TAPER_START_2026 = 2000000;
const IHT_RATE = 0.4;

const ukInheritanceTaxCalculator: CustomCalculator = (values) => {
  const estateValue = Math.max(0, safeNumber(values.estateValue));
  const passingHomeToDescendants = safeNumber(values.passingHomeToDescendants) === 1;

  let residenceNilRateBand = passingHomeToDescendants ? IHT_RESIDENCE_NIL_RATE_BAND_2026 : 0;
  if (passingHomeToDescendants && estateValue > IHT_RNRB_TAPER_START_2026) {
    const reduction = (estateValue - IHT_RNRB_TAPER_START_2026) / 2;
    residenceNilRateBand = Math.max(0, IHT_RESIDENCE_NIL_RATE_BAND_2026 - reduction);
  }

  const totalNilRateBand = IHT_NIL_RATE_BAND_2026 + residenceNilRateBand;
  const taxableEstate = Math.max(0, estateValue - totalNilRateBand);
  const inheritanceTax = taxableEstate * IHT_RATE;
  const netEstate = Math.max(0, estateValue - inheritanceTax);

  return {
    totalNilRateBand,
    taxableEstate,
    inheritanceTax,
    netEstate,
  };
};

// ---------------------------------------------------------------------------
// 9. UK VAT Calculator — 20% standard / 5% reduced / 0% zero, forward
//    (add VAT to a net price) or reverse (extract VAT from a gross price).
// ---------------------------------------------------------------------------

const ukVatCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const vatRatePercent = safeNumber(values.vatRate, 20);
  const isVatInclusive = safeNumber(values.isVatInclusive) === 1;
  const rate = vatRatePercent / 100;

  let netAmount: number;
  let vatAmount: number;
  let grossAmount: number;

  if (isVatInclusive) {
    netAmount = amount / (1 + rate);
    vatAmount = amount - netAmount;
    grossAmount = amount;
  } else {
    netAmount = amount;
    vatAmount = amount * rate;
    grossAmount = amount + vatAmount;
  }

  return { netAmount, vatAmount, grossAmount };
};

// ---------------------------------------------------------------------------
// 10. UK Self Employed Tax Calculator — the full picture for a UK sole
//     trader: Income Tax (rest-of-UK bands) + Class 4 NIC on the same
//     profit. Class 2 NIC is no longer compulsory above the Lower Profits
//     Limit (it's now automatically treated as paid for those above it),
//     so it isn't added as a separate charge — see this tool's FAQ.
// ---------------------------------------------------------------------------

const ukSelfEmployedTaxCalculator: CustomCalculator = (values) => {
  const netProfit = Math.max(0, safeNumber(values.netProfit));

  const taxableProfit = taxableAfterAllowance(netProfit);
  const incomeTax = progressiveTax(taxableProfit, UK_BANDS_2026);
  const class4Ni = class4NationalInsurance(netProfit);
  const totalTaxAndNi = incomeTax + class4Ni;
  const takeHomeProfit = Math.max(0, netProfit - totalTaxAndNi);
  const effectiveRate = netProfit > 0 ? (totalTaxAndNi / netProfit) * 100 : 0;

  return {
    incomeTax,
    class4NationalInsurance: class4Ni,
    totalTaxAndNi,
    takeHomeProfit,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 11. UK Freelance Tax Calculator — a quicker "how much should I set
//     aside from THIS payment" tool for a freelancer, using an annual
//     profit estimate only to find the right marginal rate to apply —
//     the Self Employed Tax Calculator above is the full annual picture.
// ---------------------------------------------------------------------------

const ukFreelanceTaxCalculator: CustomCalculator = (values) => {
  const paymentAmount = Math.max(0, safeNumber(values.paymentAmount));
  const estimatedAnnualProfit = Math.max(0, safeNumber(values.estimatedAnnualProfit));

  const floor = taxableAfterAllowance(estimatedAnnualProfit);
  const incomeTaxRate = marginalRateAtFloor(floor, UK_BANDS_2026);
  const class4Rate =
    estimatedAnnualProfit <= NI_CLASS4_LOWER_LIMIT_2026
      ? 0
      : estimatedAnnualProfit <= NI_CLASS4_UPPER_LIMIT_2026
        ? NI_CLASS4_MAIN_RATE
        : NI_CLASS4_UPPER_RATE;
  const combinedRate = incomeTaxRate + class4Rate;

  const suggestedSetAside = paymentAmount * combinedRate;
  const keepForYourself = Math.max(0, paymentAmount - suggestedSetAside);

  return {
    combinedRate: combinedRate * 100,
    suggestedSetAside,
    keepForYourself,
  };
};

// ---------------------------------------------------------------------------
// 12. UK Rental Income Tax Calculator — models Section 24: mortgage
//     interest is NOT deducted from rental profit (unlike other allowable
//     expenses) — landlords instead get a 20% tax credit on it, a well-
//     known and often-misunderstood UK-specific rule.
// ---------------------------------------------------------------------------

const MORTGAGE_INTEREST_RELIEF_RATE = 0.2;

const ukRentalIncomeTaxCalculator: CustomCalculator = (values) => {
  const annualRentalIncome = Math.max(0, safeNumber(values.annualRentalIncome));
  const allowableExpenses = Math.max(0, safeNumber(values.allowableExpenses));
  const mortgageInterest = Math.max(0, safeNumber(values.mortgageInterest));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));

  const rentalProfit = Math.max(0, annualRentalIncome - allowableExpenses);
  const floor = taxableAfterAllowance(otherIncome);
  const incomeTaxBeforeRelief = stackedTax(floor, rentalProfit, UK_BANDS_2026);
  const mortgageInterestTaxCredit = mortgageInterest * MORTGAGE_INTEREST_RELIEF_RATE;
  const incomeTaxOnRental = Math.max(0, incomeTaxBeforeRelief - mortgageInterestTaxCredit);
  const netRentalIncome = rentalProfit - mortgageInterest - incomeTaxOnRental;

  return {
    rentalProfit,
    incomeTaxOnRental,
    mortgageInterestTaxCredit,
    netRentalIncome,
  };
};

// ---------------------------------------------------------------------------
// 13. UK Pension Tax Calculator — tax relief on a contribution at your
//     marginal Income Tax rate, plus the Annual Allowance (£60,000) excess
//     charge if you contribute more than that in a year.
// ---------------------------------------------------------------------------

const PENSION_ANNUAL_ALLOWANCE_2026 = 60000;

const ukPensionTaxCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome));
  const annualContribution = Math.max(0, safeNumber(values.annualContribution));

  const floor = taxableAfterAllowance(annualIncome);
  const marginalRate = marginalRateAtFloor(floor, UK_BANDS_2026);
  const taxReliefReceived = annualContribution * marginalRate;
  const netCostOfContribution = annualContribution - taxReliefReceived;

  const excessOverAllowance = Math.max(0, annualContribution - PENSION_ANNUAL_ALLOWANCE_2026);
  const annualAllowanceCharge = excessOverAllowance * marginalRate;

  return {
    marginalRate: marginalRate * 100,
    taxReliefReceived,
    netCostOfContribution,
    excessOverAllowance,
    annualAllowanceCharge,
  };
};

// ---------------------------------------------------------------------------
// 14. UK Bonus Tax Calculator — a bonus stacks on top of your existing
//     salary, so it's taxed at your HIGHEST marginal rate(s), not from £0.
// ---------------------------------------------------------------------------

const ukBonusTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const bonusAmount = Math.max(0, safeNumber(values.bonusAmount));

  const floor = taxableAfterAllowance(annualSalary);
  const incomeTaxOnBonus = stackedTax(floor, bonusAmount, UK_BANDS_2026);
  const niOnBonus = employeeNationalInsurance(annualSalary + bonusAmount) - employeeNationalInsurance(annualSalary);
  const totalDeductions = incomeTaxOnBonus + Math.max(0, niOnBonus);
  const netBonus = Math.max(0, bonusAmount - totalDeductions);
  const effectiveRate = bonusAmount > 0 ? (totalDeductions / bonusAmount) * 100 : 0;

  return {
    incomeTaxOnBonus,
    niOnBonus: Math.max(0, niOnBonus),
    totalDeductions,
    netBonus,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 15. UK Overtime Tax Calculator — overtime pay, same stacking logic as
//     the Bonus Tax Calculator, framed per extra hours worked.
// ---------------------------------------------------------------------------

const ukOvertimeTaxCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const overtimePay = Math.max(0, safeNumber(values.overtimePay));

  const floor = taxableAfterAllowance(annualSalary);
  const incomeTaxOnOvertime = stackedTax(floor, overtimePay, UK_BANDS_2026);
  const niOnOvertime =
    employeeNationalInsurance(annualSalary + overtimePay) - employeeNationalInsurance(annualSalary);
  const totalDeductions = incomeTaxOnOvertime + Math.max(0, niOnOvertime);
  const netOvertimePay = Math.max(0, overtimePay - totalDeductions);
  const effectiveRate = overtimePay > 0 ? (totalDeductions / overtimePay) * 100 : 0;

  return {
    incomeTaxOnOvertime,
    niOnOvertime: Math.max(0, niOnOvertime),
    totalDeductions,
    netOvertimePay,
    effectiveRate,
  };
};

export const ukExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "uk-national-insurance-calculator": ukNationalInsuranceCalculator,
  "uk-paye-calculator": ukPayeCalculator,
  "uk-employer-national-insurance-calculator": ukEmployerNationalInsuranceCalculator,
  "uk-dividend-tax-calculator": ukDividendTaxCalculator,
  "uk-capital-gains-tax-calculator": ukCapitalGainsTaxCalculator,
  "uk-property-tax-calculator": ukPropertyTaxCalculator,
  "uk-stamp-duty-calculator": ukStampDutyCalculator,
  "uk-inheritance-tax-calculator": ukInheritanceTaxCalculator,
  "uk-vat-calculator": ukVatCalculator,
  "uk-self-employed-tax-calculator": ukSelfEmployedTaxCalculator,
  "uk-freelance-tax-calculator": ukFreelanceTaxCalculator,
  "uk-rental-income-tax-calculator": ukRentalIncomeTaxCalculator,
  "uk-pension-tax-calculator": ukPensionTaxCalculator,
  "uk-bonus-tax-calculator": ukBonusTaxCalculator,
  "uk-overtime-tax-calculator": ukOvertimeTaxCalculator,
};
