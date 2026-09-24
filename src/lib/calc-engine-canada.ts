/**
 * Canada federal + provincial/territorial income tax calculators.
 *
 * See calc-engine.ts for how this file's `canadaCustomCalculators` map
 * merges into the app-wide `customCalculators` registry, and
 * calc-engine-uk.ts's header for how the per-country file split works in
 * general.
 *
 * Canada's tax structure is closer to the US model than the UK's (federal
 * tax + a separate provincial/territorial tax, both progressive-bracket),
 * but has one structural difference big enough to get wrong if copied
 * blindly from the US or UK files: the Basic Personal Amount (BPA) is NOT
 * a deduction subtracted from income before tax brackets apply (like a US
 * standard deduction or the UK Personal Allowance). It's a NON-REFUNDABLE
 * TAX CREDIT — brackets apply to the full taxable income, tax is computed,
 * and then (BPA × that jurisdiction's lowest bracket rate) is subtracted
 * from the tax owed. Every calculator below follows that mechanic for both
 * the federal and provincial/territorial amounts.
 *
 * Also unlike the US (all 50 states share one federal calculation) and the
 * UK (income tax devolved, National Insurance is not), Canada has THREE
 * jurisdictions with genuinely different mechanics from the rest:
 *  - Ontario stacks a provincial SURTAX (an extra percentage of Ontario
 *    tax itself, above two thresholds) and an Ontario Health Premium (a
 *    flat lookup-table amount by income band, unchanged since 2004) on
 *    top of the ordinary bracket calculation — see ontarioIncomeTaxCalculator.
 *  - Quebec administers its own tax system separately from the CRA:
 *    residents get a 16.5% federal tax abatement (Quebec collects more of
 *    its own revenue instead of relying on federal transfers), pay into
 *    the Quebec Pension Plan (QPP, at a higher combined rate than CPP)
 *    instead of CPP, pay into the Quebec Parental Insurance Plan (QPIP)
 *    on top of a reduced-rate EI premium, and use their own bracket table
 *    and Basic Personal Amount — see quebecIncomeTaxCalculator.
 *  - Every other province/territory (11 of the 13) shares one mechanic —
 *    federal tax + that jurisdiction's own bracket table/BPA + CPP + EI —
 *    generated below via `makeProvincialCalculator` rather than duplicated
 *    13 times, since (unlike the US, where states genuinely differ in
 *    mechanism — flat rate, federal-AGI-based, phased deductions, ...) the
 *    only thing that differs between these 11 is the numbers themselves.
 *
 * Figures are for the 2026 tax year, sourced from CRA (canada.ca), Revenu
 * Québec, and KPMG Canada's published 2026 federal/provincial/territorial
 * rate card (see each constant's comment) — see each Tool's own
 * Instructions/Assumptions text for the full disclaimer shown to visitors.
 */

import type { CalcInputValues, CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface TaxBand {
  rate: number;
  upTo: number;
}

/** Cumulative-threshold progressive tax — same shape used in calc-engine-uk.ts. */
function progressiveTax(taxableIncome: number, bands: TaxBand[]): number {
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

interface ReadInputs {
  annualSalary: number;
  periodsPerYear: number;
  annualPreTax: number;
  annualPostTax: number;
  taxableAnnualWages: number;
}

function readInputs(values: CalcInputValues): ReadInputs {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const preTaxPerPeriod = Math.max(0, safeNumber(values.preTaxDeductions));
  const postTaxPerPeriod = Math.max(0, safeNumber(values.postTaxDeductions));
  const annualPreTax = preTaxPerPeriod * periodsPerYear;
  const annualPostTax = postTaxPerPeriod * periodsPerYear;
  const taxableAnnualWages = Math.max(0, annualSalary - annualPreTax);
  return { annualSalary, periodsPerYear, annualPreTax, annualPostTax, taxableAnnualWages };
}

// ---------------------------------------------------------------------------
// Federal income tax — 2026 brackets and Basic Personal Amount, confirmed
// via canada.ca ("Current year tax rates and income brackets (2026)"): the
// bottom rate was cut to 14% (from 14.5% in 2025, effective for the full
// 2026 year). The federal BPA has an "enhanced" amount ($16,452) available
// in full up to $181,440 of taxable income, tapering straight-line down to
// a "base" amount ($14,829) at $258,482 and above — the only jurisdiction
// in this file whose BPA tapers by income; every province/territory below
// uses one flat BPA regardless of income.
// ---------------------------------------------------------------------------

const FEDERAL_BRACKETS_2026: TaxBand[] = [
  { rate: 0.14, upTo: 58523 },
  { rate: 0.205, upTo: 117045 },
  { rate: 0.26, upTo: 181440 },
  { rate: 0.29, upTo: 258482 },
  { rate: 0.33, upTo: Infinity },
];

const FEDERAL_LOWEST_RATE = 0.14;
const FEDERAL_BPA_MAX_2026 = 16452;
const FEDERAL_BPA_MIN_2026 = 14829;
const FEDERAL_BPA_TAPER_START_2026 = 181440;
const FEDERAL_BPA_TAPER_END_2026 = 258482;

function federalBpaFor(taxableIncome: number): number {
  if (taxableIncome <= FEDERAL_BPA_TAPER_START_2026) return FEDERAL_BPA_MAX_2026;
  if (taxableIncome >= FEDERAL_BPA_TAPER_END_2026) return FEDERAL_BPA_MIN_2026;
  const span = FEDERAL_BPA_TAPER_END_2026 - FEDERAL_BPA_TAPER_START_2026;
  const reduction =
    ((FEDERAL_BPA_MAX_2026 - FEDERAL_BPA_MIN_2026) * (taxableIncome - FEDERAL_BPA_TAPER_START_2026)) / span;
  return FEDERAL_BPA_MAX_2026 - reduction;
}

/** Federal tax payable — bracket tax minus the BPA credit, floored at $0. */
function federalIncomeTax(taxableIncome: number): number {
  const grossTax = progressiveTax(taxableIncome, FEDERAL_BRACKETS_2026);
  const credit = federalBpaFor(taxableIncome) * FEDERAL_LOWEST_RATE;
  return Math.max(0, grossTax - credit);
}

// ---------------------------------------------------------------------------
// CPP (Canada Pension Plan) and EI (Employment Insurance) — 2026 figures
// confirmed via CRA announcements: CPP basic exemption $3,500 (unchanged),
// maximum pensionable earnings $74,600, employee rate 5.95%; CPP2 (the
// "second additional" tier introduced in 2024) applies 4% between $74,600
// and the CPP2 maximum pensionable earnings of $85,000. Combined into one
// "cpp" figure below rather than split into two result lines, since CPP2
// only affects earners above $74,600/year. EI maximum insurable earnings
// $68,900, employee rate 1.63% outside Quebec (Quebec's own reduced rate is
// handled separately in quebecIncomeTaxCalculator, alongside QPIP).
// ---------------------------------------------------------------------------

const CPP_BASIC_EXEMPTION_2026 = 3500;
const CPP_MAX_PENSIONABLE_2026 = 74600;
const CPP_RATE_2026 = 0.0595;
const CPP2_MAX_PENSIONABLE_2026 = 85000;
const CPP2_RATE_2026 = 0.04;

function cppContribution(annualNiablePay: number): number {
  const base = Math.max(0, Math.min(annualNiablePay, CPP_MAX_PENSIONABLE_2026) - CPP_BASIC_EXEMPTION_2026);
  const cpp2 = Math.max(0, Math.min(annualNiablePay, CPP2_MAX_PENSIONABLE_2026) - CPP_MAX_PENSIONABLE_2026);
  return base * CPP_RATE_2026 + cpp2 * CPP2_RATE_2026;
}

const EI_MAX_INSURABLE_2026 = 68900;
const EI_RATE_OUTSIDE_QUEBEC_2026 = 0.0163;
const EI_RATE_QUEBEC_2026 = 0.013;

function eiPremium(annualNiablePay: number, rate: number): number {
  return Math.min(annualNiablePay, EI_MAX_INSURABLE_2026) * rate;
}

// ---------------------------------------------------------------------------
// Provincial/territorial bracket tables and Basic Personal Amounts — 2026,
// confirmed via KPMG Canada's published federal/provincial/territorial
// income tax rates and brackets for 2026 (brackets) and cross-checked BPA
// figures (Ontario's and Quebec's independently confirmed against
// canadianmoneyhelp.ca and Revenu Québec respectively — both matched
// exactly). "Lowest rate" is that jurisdiction's own bottom-bracket rate,
// which is what its BPA credit is calculated at (provincial/territorial
// BPAs are flat — none of them taper by income the way the federal one
// does).
// ---------------------------------------------------------------------------

interface ProvinceConfig {
  name: string;
  brackets: TaxBand[];
  bpa: number;
  lowestRate: number;
}

const ONTARIO: ProvinceConfig = {
  name: "Ontario",
  brackets: [
    { rate: 0.0505, upTo: 53891 },
    { rate: 0.0915, upTo: 107785 },
    { rate: 0.1116, upTo: 150000 },
    { rate: 0.1216, upTo: 220000 },
    { rate: 0.1316, upTo: Infinity },
  ],
  bpa: 12989,
  lowestRate: 0.0505,
};

const QUEBEC: ProvinceConfig = {
  name: "Quebec",
  brackets: [
    { rate: 0.14, upTo: 54345 },
    { rate: 0.19, upTo: 108680 },
    { rate: 0.24, upTo: 132245 },
    { rate: 0.2575, upTo: Infinity },
  ],
  bpa: 18952,
  lowestRate: 0.14,
};

const BRITISH_COLUMBIA: ProvinceConfig = {
  name: "British Columbia",
  brackets: [
    { rate: 0.0506, upTo: 50363 },
    { rate: 0.077, upTo: 100728 },
    { rate: 0.105, upTo: 115648 },
    { rate: 0.1229, upTo: 140430 },
    { rate: 0.147, upTo: 190405 },
    { rate: 0.168, upTo: 265545 },
    { rate: 0.205, upTo: Infinity },
  ],
  bpa: 13216,
  lowestRate: 0.0506,
};

const ALBERTA: ProvinceConfig = {
  name: "Alberta",
  brackets: [
    { rate: 0.08, upTo: 61200 },
    { rate: 0.1, upTo: 154259 },
    { rate: 0.12, upTo: 185111 },
    { rate: 0.13, upTo: 246813 },
    { rate: 0.14, upTo: 370220 },
    { rate: 0.15, upTo: Infinity },
  ],
  bpa: 22769,
  lowestRate: 0.08,
};

const SASKATCHEWAN: ProvinceConfig = {
  name: "Saskatchewan",
  brackets: [
    { rate: 0.105, upTo: 54532 },
    { rate: 0.125, upTo: 155805 },
    { rate: 0.145, upTo: Infinity },
  ],
  bpa: 20381,
  lowestRate: 0.105,
};

const MANITOBA: ProvinceConfig = {
  name: "Manitoba",
  brackets: [
    { rate: 0.108, upTo: 47000 },
    { rate: 0.1275, upTo: 100000 },
    { rate: 0.174, upTo: Infinity },
  ],
  bpa: 15780,
  lowestRate: 0.108,
};

const NOVA_SCOTIA: ProvinceConfig = {
  name: "Nova Scotia",
  brackets: [
    { rate: 0.0879, upTo: 30995 },
    { rate: 0.1495, upTo: 61991 },
    { rate: 0.1667, upTo: 97417 },
    { rate: 0.175, upTo: 157124 },
    { rate: 0.21, upTo: Infinity },
  ],
  bpa: 11932,
  lowestRate: 0.0879,
};

const NEW_BRUNSWICK: ProvinceConfig = {
  name: "New Brunswick",
  brackets: [
    { rate: 0.094, upTo: 52333 },
    { rate: 0.14, upTo: 104666 },
    { rate: 0.16, upTo: 193861 },
    { rate: 0.195, upTo: Infinity },
  ],
  bpa: 13664,
  lowestRate: 0.094,
};

const PRINCE_EDWARD_ISLAND: ProvinceConfig = {
  name: "Prince Edward Island",
  brackets: [
    { rate: 0.095, upTo: 33928 },
    { rate: 0.1347, upTo: 65820 },
    { rate: 0.166, upTo: 106890 },
    { rate: 0.1762, upTo: 142250 },
    { rate: 0.19, upTo: Infinity },
  ],
  bpa: 15000,
  lowestRate: 0.095,
};

const NEWFOUNDLAND_AND_LABRADOR: ProvinceConfig = {
  name: "Newfoundland and Labrador",
  brackets: [
    { rate: 0.087, upTo: 44678 },
    { rate: 0.145, upTo: 89354 },
    { rate: 0.158, upTo: 159528 },
    { rate: 0.178, upTo: 223340 },
    { rate: 0.198, upTo: 285319 },
    { rate: 0.208, upTo: 570638 },
    { rate: 0.213, upTo: 1141275 },
    { rate: 0.218, upTo: Infinity },
  ],
  bpa: 13094,
  lowestRate: 0.087,
};

const YUKON: ProvinceConfig = {
  name: "Yukon",
  brackets: [
    { rate: 0.064, upTo: 58523 },
    { rate: 0.09, upTo: 117045 },
    { rate: 0.109, upTo: 181440 },
    { rate: 0.128, upTo: 500000 },
    { rate: 0.15, upTo: Infinity },
  ],
  bpa: 16452,
  lowestRate: 0.064,
};

const NORTHWEST_TERRITORIES: ProvinceConfig = {
  name: "Northwest Territories",
  brackets: [
    { rate: 0.059, upTo: 53003 },
    { rate: 0.086, upTo: 106009 },
    { rate: 0.122, upTo: 172346 },
    { rate: 0.1405, upTo: Infinity },
  ],
  bpa: 18198,
  lowestRate: 0.059,
};

const NUNAVUT: ProvinceConfig = {
  name: "Nunavut",
  brackets: [
    { rate: 0.04, upTo: 55801 },
    { rate: 0.07, upTo: 111602 },
    { rate: 0.09, upTo: 181439 },
    { rate: 0.115, upTo: Infinity },
  ],
  bpa: 19659,
  lowestRate: 0.04,
};

// ---------------------------------------------------------------------------
// Generic calculator factory — used by every jurisdiction EXCEPT Ontario and
// Quebec, which have genuinely different mechanics (see file header) and so
// get their own hand-written functions below instead of going through this
// factory.
// ---------------------------------------------------------------------------

function makeProvincialCalculator(province: ProvinceConfig): CustomCalculator {
  return (values) => {
    const { annualSalary, periodsPerYear, annualPreTax, annualPostTax, taxableAnnualWages } = readInputs(values);

    const annualFederalTax = federalIncomeTax(taxableAnnualWages);
    const provincialGrossTax = progressiveTax(taxableAnnualWages, province.brackets);
    const annualProvincialTax = Math.max(0, provincialGrossTax - province.bpa * province.lowestRate);
    const annualCpp = cppContribution(taxableAnnualWages);
    const annualEi = eiPremium(taxableAnnualWages, EI_RATE_OUTSIDE_QUEBEC_2026);

    const annualTotalDeductions =
      annualFederalTax + annualProvincialTax + annualCpp + annualEi + annualPreTax + annualPostTax;
    const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

    return {
      grossPayPerPeriod: annualSalary / periodsPerYear,
      federalTax: annualFederalTax / periodsPerYear,
      provincialTax: annualProvincialTax / periodsPerYear,
      cpp: annualCpp / periodsPerYear,
      ei: annualEi / periodsPerYear,
      totalDeductions: annualTotalDeductions / periodsPerYear,
      netPayPerPeriod: annualNetPay / periodsPerYear,
      annualNetPay,
    };
  };
}

// ---------------------------------------------------------------------------
// Ontario — the ordinary bracket calculation above, PLUS an Ontario Surtax
// (an extra 20%/36% of Ontario tax itself, above two thresholds measured in
// dollars of tax, not income) and an Ontario Health Premium (a flat
// lookup-table amount by taxable income band, in place since 2004 and never
// inflation-adjusted). Sourced via canadianmoneyhelp.ca's 2026 breakdown,
// cross-checked against Ontario's own published Health Premium schedule
// (Taxation Act, Schedule 1) for the exact income breakpoints.
// ---------------------------------------------------------------------------

const ONTARIO_SURTAX_THRESHOLD_1_2026 = 5818; // no surtax below this much Ontario tax
const ONTARIO_SURTAX_THRESHOLD_2_2026 = 7446;
const ONTARIO_SURTAX_RATE_1 = 0.2;
const ONTARIO_SURTAX_RATE_2 = 0.36;

function ontarioSurtax(ontarioTaxBeforeSurtax: number): number {
  const tier1 = Math.max(0, ontarioTaxBeforeSurtax - ONTARIO_SURTAX_THRESHOLD_1_2026) * ONTARIO_SURTAX_RATE_1;
  const tier2 = Math.max(0, ontarioTaxBeforeSurtax - ONTARIO_SURTAX_THRESHOLD_2_2026) * ONTARIO_SURTAX_RATE_2;
  return tier1 + tier2;
}

/** Ontario Health Premium — unchanged since 2004, so these breakpoints are
 * not a "2026" figure so much as a long-standing constant. */
function ontarioHealthPremium(taxableIncome: number): number {
  if (taxableIncome <= 20000) return 0;
  if (taxableIncome <= 25000) return Math.min(300, (taxableIncome - 20000) * 0.06);
  if (taxableIncome <= 36000) return 300;
  if (taxableIncome <= 38500) return Math.min(450, 300 + (taxableIncome - 36000) * 0.06);
  if (taxableIncome <= 48000) return 450;
  if (taxableIncome <= 48600) return Math.min(600, 450 + (taxableIncome - 48000) * 0.25);
  if (taxableIncome <= 72000) return 600;
  if (taxableIncome <= 72600) return Math.min(750, 600 + (taxableIncome - 72000) * 0.25);
  if (taxableIncome <= 200000) return 750;
  if (taxableIncome <= 200600) return Math.min(900, 750 + (taxableIncome - 200000) * 0.25);
  return 900;
}

const ontarioIncomeTaxCalculator: CustomCalculator = (values) => {
  const { annualSalary, periodsPerYear, annualPreTax, annualPostTax, taxableAnnualWages } = readInputs(values);

  const annualFederalTax = federalIncomeTax(taxableAnnualWages);

  const ontarioGrossTax = progressiveTax(taxableAnnualWages, ONTARIO.brackets);
  const ontarioTaxBeforeSurtax = Math.max(0, ontarioGrossTax - ONTARIO.bpa * ONTARIO.lowestRate);
  const annualSurtax = ontarioSurtax(ontarioTaxBeforeSurtax);
  const annualProvincialTax = ontarioTaxBeforeSurtax + annualSurtax;
  const annualHealthPremium = ontarioHealthPremium(taxableAnnualWages);

  const annualCpp = cppContribution(taxableAnnualWages);
  const annualEi = eiPremium(taxableAnnualWages, EI_RATE_OUTSIDE_QUEBEC_2026);

  const annualTotalDeductions =
    annualFederalTax +
    annualProvincialTax +
    annualHealthPremium +
    annualCpp +
    annualEi +
    annualPreTax +
    annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalTax: annualFederalTax / periodsPerYear,
    provincialTax: annualProvincialTax / periodsPerYear,
    ontarioHealthPremium: annualHealthPremium / periodsPerYear,
    cpp: annualCpp / periodsPerYear,
    ei: annualEi / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Quebec — fully self-contained, since Quebec administers its own tax
// system rather than piggybacking on the CRA the way every other province
// does. Confirmed via Revenu Québec's own "Employers: Principal Changes for
// 2026" page: QPP replaces CPP (6.30% combined base + first-additional
// rate, vs. CPP's 5.95% elsewhere — same $3,500 exemption, $74,600 maximum
// pensionable earnings, and 4% QPP2 tier above that up to $85,000), QPIP
// (Quebec Parental Insurance Plan) adds 0.430% up to its own $103,000
// maximum insurable earnings, and EI is charged at a reduced 1.30% (vs
// 1.63% elsewhere) since QPIP covers parental leave separately. Quebec
// residents also get a 16.5% federal tax abatement — a flat reduction of
// federal tax otherwise payable, in place for decades, reflecting that
// Quebec collects more of its own revenue instead of relying on federal
// transfers for certain programs.
// ---------------------------------------------------------------------------

const QUEBEC_ABATEMENT_RATE = 0.165;
const QPP_RATE_2026 = 0.063;
const QPIP_MAX_INSURABLE_2026 = 103000;
const QPIP_RATE_2026 = 0.0043;

function qppContribution(annualNiablePay: number): number {
  const base = Math.max(0, Math.min(annualNiablePay, CPP_MAX_PENSIONABLE_2026) - CPP_BASIC_EXEMPTION_2026);
  const qpp2 = Math.max(0, Math.min(annualNiablePay, CPP2_MAX_PENSIONABLE_2026) - CPP_MAX_PENSIONABLE_2026);
  return base * QPP_RATE_2026 + qpp2 * CPP2_RATE_2026;
}

function qpipPremium(annualNiablePay: number): number {
  return Math.min(annualNiablePay, QPIP_MAX_INSURABLE_2026) * QPIP_RATE_2026;
}

const quebecIncomeTaxCalculator: CustomCalculator = (values) => {
  const { annualSalary, periodsPerYear, annualPreTax, annualPostTax, taxableAnnualWages } = readInputs(values);

  const annualFederalTax = federalIncomeTax(taxableAnnualWages) * (1 - QUEBEC_ABATEMENT_RATE);

  const quebecGrossTax = progressiveTax(taxableAnnualWages, QUEBEC.brackets);
  const annualProvincialTax = Math.max(0, quebecGrossTax - QUEBEC.bpa * QUEBEC.lowestRate);

  const annualQpp = qppContribution(taxableAnnualWages);
  const annualQpip = qpipPremium(taxableAnnualWages);
  const annualEi = eiPremium(taxableAnnualWages, EI_RATE_QUEBEC_2026);

  const annualTotalDeductions =
    annualFederalTax + annualProvincialTax + annualQpp + annualQpip + annualEi + annualPreTax + annualPostTax;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    federalTax: annualFederalTax / periodsPerYear,
    provincialTax: annualProvincialTax / periodsPerYear,
    qpp: annualQpp / periodsPerYear,
    qpip: annualQpip / periodsPerYear,
    ei: annualEi / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const canadaCustomCalculators: Record<string, CustomCalculator> = {
  "ontario-income-tax-calculator": ontarioIncomeTaxCalculator,
  "quebec-income-tax-calculator": quebecIncomeTaxCalculator,
  "british-columbia-income-tax-calculator": makeProvincialCalculator(BRITISH_COLUMBIA),
  "alberta-income-tax-calculator": makeProvincialCalculator(ALBERTA),
  "manitoba-income-tax-calculator": makeProvincialCalculator(MANITOBA),
  "saskatchewan-income-tax-calculator": makeProvincialCalculator(SASKATCHEWAN),
  "nova-scotia-income-tax-calculator": makeProvincialCalculator(NOVA_SCOTIA),
  "new-brunswick-income-tax-calculator": makeProvincialCalculator(NEW_BRUNSWICK),
  "prince-edward-island-income-tax-calculator": makeProvincialCalculator(PRINCE_EDWARD_ISLAND),
  "newfoundland-and-labrador-income-tax-calculator": makeProvincialCalculator(NEWFOUNDLAND_AND_LABRADOR),
  "yukon-income-tax-calculator": makeProvincialCalculator(YUKON),
  "northwest-territories-income-tax-calculator": makeProvincialCalculator(NORTHWEST_TERRITORIES),
  "nunavut-income-tax-calculator": makeProvincialCalculator(NUNAVUT),
};
