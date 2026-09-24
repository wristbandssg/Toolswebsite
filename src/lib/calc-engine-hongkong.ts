/**
 * Hong Kong salaries tax calculator — a single national/territory-wide
 * tool, like India, Australia, South Africa, and Pakistan: Hong Kong has no
 * further regional/district-level income tax split.
 *
 * See calc-engine.ts for how this file's `hongKongCustomCalculators` map
 * merges into the app-wide `customCalculators` registry.
 *
 * Structural note — Hong Kong's salaries tax is genuinely unusual among the
 * countries in this project: every taxpayer's final bill is the LOWER of
 * two entirely different calculations, not just one rate table:
 *  (a) PROGRESSIVE: 2%/6%/10%/14%/17% bands applied to "net chargeable
 *      income" — assessable income, minus the mandatory MPF contribution
 *      deduction, minus personal allowances (Basic or Married).
 *  (b) STANDARD RATE: a flat two-tiered rate (15% on the first
 *      HKD 5,000,000, 16% on the remainder) applied to "net income" —
 *      assessable income minus the MPF deduction only, i.e. BEFORE personal
 *      allowances are subtracted.
 * The IRD computes both and charges whichever is lower, which is why
 * `hongKongIncomeTaxCalculator` below computes both `progressiveTax(...)`
 * and `standardRateTax` and takes `Math.min(...)` of them — dropping either
 * calculation would give the wrong answer for real taxpayers (the standard
 * rate mechanism specifically exists to cap the bill for higher earners
 * with few allowances/deductions).
 *
 * MPF (Mandatory Provident Fund) is Hong Kong's FICA/UIF/EOBI equivalent:
 * employees contribute 5% of relevant income, capped at a relevant income
 * ceiling of HKD 30,000/month (so contributions top out at HKD 1,500/month,
 * HKD 18,000/year) — and, unlike UIF in South Africa or EOBI in Pakistan,
 * the mandatory employee MPF contribution IS an allowable deduction from
 * assessable income for salaries tax purposes, which is why it's subtracted
 * before either tax calculation below rather than treated as a pure
 * post-tax deduction.
 *
 * Figures are for the 2025/26 year of assessment (1 April 2025 – 31 March
 * 2026), confirmed via PwC's Worldwide Tax Summaries and cross-checked
 * against published Hong Kong salaries tax guides for the Basic Allowance
 * and Married Person's Allowance amounts — see the Tool's own Instructions/
 * Assumptions text for the full disclaimer shown to visitors.
 */

import type { CalcInputValues, CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

interface TaxBand {
  rate: number;
  upTo: number;
}

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

// ---------------------------------------------------------------------------
// Progressive bands (on NET CHARGEABLE income, i.e. after allowances) —
// 2025/26, confirmed via PwC Worldwide Tax Summaries: 2% up to HKD 50,000,
// then 6%/10%/14% in further HKD 50,000 steps, 17% above HKD 200,000.
// ---------------------------------------------------------------------------

const HK_PROGRESSIVE_BANDS_2025: TaxBand[] = [
  { rate: 0.02, upTo: 50000 },
  { rate: 0.06, upTo: 100000 },
  { rate: 0.1, upTo: 150000 },
  { rate: 0.14, upTo: 200000 },
  { rate: 0.17, upTo: Infinity },
];

// Two-tiered standard rate, applied to NET income (before allowances) —
// whichever of this or the progressive calculation above is lower is what
// the taxpayer actually pays (see file header).
const STANDARD_RATE_TIER1 = 0.15;
const STANDARD_RATE_TIER1_CEILING = 5000000;
const STANDARD_RATE_TIER2 = 0.16;

function standardRateTax(netIncome: number): number {
  if (netIncome <= STANDARD_RATE_TIER1_CEILING) return netIncome * STANDARD_RATE_TIER1;
  return (
    STANDARD_RATE_TIER1_CEILING * STANDARD_RATE_TIER1 +
    (netIncome - STANDARD_RATE_TIER1_CEILING) * STANDARD_RATE_TIER2
  );
}

// ---------------------------------------------------------------------------
// Personal allowances — 2025/26, confirmed via published Hong Kong salaries
// tax guides: Basic Allowance HKD 132,000; Married Person's Allowance is
// exactly double, HKD 264,000 (available when married with a spouse who has
// no net chargeable income of their own).
// ---------------------------------------------------------------------------

const BASIC_ALLOWANCE_2025 = 132000;
const MARRIED_ALLOWANCE_2025 = 264000;

// ---------------------------------------------------------------------------
// MPF (Mandatory Provident Fund) — employee contributes 5% of relevant
// income, capped at a HKD 30,000/month relevant income ceiling, so
// contributions top out at HKD 1,500/month (HKD 18,000/year) regardless of
// how much more someone earns above that. Deductible from assessable
// income for salaries tax purposes (see file header).
// ---------------------------------------------------------------------------

const MPF_RATE = 0.05;
const MPF_ANNUAL_CAP = 18000;

function annualMpf(annualSalary: number): number {
  return Math.min(annualSalary * MPF_RATE, MPF_ANNUAL_CAP);
}

const hongKongIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periodsPerYear = safeNumber(values.payFrequency, 12) || 12;
  const isMarried = safeNumber(values.maritalStatus, 0) !== 0;

  const annualMpfAmount = annualMpf(annualSalary);
  const netIncome = Math.max(0, annualSalary - annualMpfAmount);

  const allowance = isMarried ? MARRIED_ALLOWANCE_2025 : BASIC_ALLOWANCE_2025;
  const netChargeableIncome = Math.max(0, netIncome - allowance);

  const progressive = progressiveTax(netChargeableIncome, HK_PROGRESSIVE_BANDS_2025);
  const standard = standardRateTax(netIncome);
  const annualIncomeTax = Math.min(progressive, standard);

  const annualTotalDeductions = annualIncomeTax + annualMpfAmount;
  const annualNetPay = Math.max(0, annualSalary - annualTotalDeductions);

  return {
    grossPayPerPeriod: annualSalary / periodsPerYear,
    incomeTax: annualIncomeTax / periodsPerYear,
    mpf: annualMpfAmount / periodsPerYear,
    totalDeductions: annualTotalDeductions / periodsPerYear,
    netPayPerPeriod: annualNetPay / periodsPerYear,
    annualNetPay,
  };
};

export const hongKongCustomCalculators: Record<string, CustomCalculator> = {
  "hong-kong-income-tax-calculator": hongKongIncomeTaxCalculator,
};
