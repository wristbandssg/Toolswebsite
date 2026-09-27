/**
 * calc-engine-us-corporate-tax.ts — US state Corporate Tax calculators
 * (Batch 6 of the state-tax-audit build-out, 50 tools — one per state).
 *
 * Every US state is covered, including the 4 states with genuinely NO
 * state-level business income tax of any kind (South Dakota, Wyoming) or no
 * traditional corporate income tax but a gross-receipts/margin substitute
 * (Nevada Commerce Tax, Ohio CAT, Texas Franchise/Margin Tax, Washington
 * B&O). Those are modeled honestly rather than skipped — see the
 * "honest reframing" precedent from the Missouri capital-gains tool.
 *
 * Where a state's schedule is graduated and the audit only confirmed the
 * low/high marginal rate (not every bracket edge), this file uses the same
 * disclosed `graduatedEstimate()` approximation established in
 * calc-engine-us-estate-inheritance-gift.ts / calc-engine-us-transfer-tax.ts:
 * it models the marginal rate rising smoothly from `lowRate` at $0 to
 * `highRate` at the `ceiling`, flat beyond the ceiling, and returns the area
 * under that line as the estimated total tax. Every tool that uses it says
 * so plainly in its Assumptions text.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";

/** Smooth marginal-rate approximation for a graduated schedule where only
 * the low/high rate (not exact bracket edges) is confirmed. See file header. */
function graduatedEstimate(
  taxable: number,
  lowRate: number,
  highRate: number,
  ceiling: number
): number {
  const t = Math.max(0, taxable);
  if (t <= 0) return 0;
  if (t >= ceiling) {
    const areaToCeiling = lowRate * ceiling + ((highRate - lowRate) * ceiling) / 2;
    return areaToCeiling + highRate * (t - ceiling);
  }
  return lowRate * t + ((highRate - lowRate) / ceiling) * ((t * t) / 2);
}

// ---------------------------------------------------------------------------
// Flat-rate states (simple `income * rate`)
// ---------------------------------------------------------------------------

function flatRateCalculator(rate: number): CustomCalculator {
  return (values) => {
    const income = Math.max(0, safeNumber(values.income));
    return income * rate;
  };
}

const alabamaCorporateTaxCalculator = flatRateCalculator(0.065);
const arizonaCorporateTaxCalculator = flatRateCalculator(0.049);
const coloradoCorporateTaxCalculator = flatRateCalculator(0.044);
const delawareCorporateTaxCalculator = flatRateCalculator(0.087);
const georgiaCorporateTaxCalculator = flatRateCalculator(0.0519);
const idahoCorporateTaxCalculator = flatRateCalculator(0.053);
const indianaCorporateTaxCalculator = flatRateCalculator(0.049);
const kentuckyCorporateTaxCalculator = flatRateCalculator(0.05);
const louisianaCorporateTaxCalculator = flatRateCalculator(0.055);
const marylandCorporateTaxCalculator = flatRateCalculator(0.0825);
const michiganCorporateTaxCalculator = flatRateCalculator(0.06);
const minnesotaCorporateTaxCalculator = flatRateCalculator(0.098);
const mississippiCorporateTaxCalculator = flatRateCalculator(0.04);
const missouriCorporateTaxCalculator = flatRateCalculator(0.04);
const montanaCorporateTaxCalculator = flatRateCalculator(0.0675);
const nebraskaCorporateTaxCalculator = flatRateCalculator(0.0455);
const newHampshireCorporateTaxCalculator = flatRateCalculator(0.075);
const newMexicoCorporateTaxCalculator = flatRateCalculator(0.059);
const newYorkCorporateTaxCalculator = flatRateCalculator(0.065);
const northCarolinaCorporateTaxCalculator = flatRateCalculator(0.02);
const oklahomaCorporateTaxCalculator = flatRateCalculator(0.04);
const pennsylvaniaCorporateTaxCalculator = flatRateCalculator(0.0749);
const rhodeIslandCorporateTaxCalculator = flatRateCalculator(0.07);
const southCarolinaCorporateTaxCalculator = flatRateCalculator(0.05);
const utahCorporateTaxCalculator = flatRateCalculator(0.045);
const virginiaCorporateTaxCalculator = flatRateCalculator(0.06);
const westVirginiaCorporateTaxCalculator = flatRateCalculator(0.065);
const wisconsinCorporateTaxCalculator = flatRateCalculator(0.079);

// North Dakota: top rate 4.31% confirmed, exact bracket structure not fully
// certain per the audit — modeled as a flat top-rate estimate, disclosed.
const northDakotaCorporateTaxCalculator = flatRateCalculator(0.0431);

// Massachusetts: flat 8% "Corporate Excise Tax" on net income, with a fixed
// $456 minimum excise (the small non-income "corporate excise" floor every
// MA corporation owes even at a loss).
function massachusettsCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  const netIncomeExcise = income * 0.08;
  return Math.max(456, netIncomeExcise);
}

// California: flat 8.84% "franchise tax" (income-based) with an $800
// minimum franchise tax that applies even in loss years.
function californiaCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  return Math.max(800, income * 0.0884);
}

// Florida: first $50,000 of net income is exempt, 5.5% on the remainder.
function floridaCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  const taxable = Math.max(0, income - 50_000);
  return taxable * 0.055;
}

// ---------------------------------------------------------------------------
// Graduated-bracket states with a confirmed schedule
// ---------------------------------------------------------------------------

// Iowa: 5.5% on the first $100,000, 7.1% above.
function iowaCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  if (income <= 100_000) return income * 0.055;
  return 100_000 * 0.055 + (income - 100_000) * 0.071;
}

// Kansas: flat 4% base plus a 3% surtax on income over $50,000
// (effective top rate ~7%).
function kansasCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  const base = income * 0.04;
  const surtax = Math.max(0, income - 50_000) * 0.03;
  return base + surtax;
}

// Oregon: 6.6% "Corporate Excise Tax" on the first $1,000,000, 7.6% above.
function oregonCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  if (income <= 1_000_000) return income * 0.066;
  return 1_000_000 * 0.066 + (income - 1_000_000) * 0.076;
}

// Vermont: 3 confirmed brackets — 6% up to $10,000, 7% from $10,000 to
// $25,000, 8.5% above $25,000.
function vermontCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  if (income <= 10_000) return income * 0.06;
  if (income <= 25_000) return 10_000 * 0.06 + (income - 10_000) * 0.07;
  return 10_000 * 0.06 + 15_000 * 0.07 + (income - 25_000) * 0.085;
}

// Connecticut: flat 7.5% CIT, plus a 10% surtax (making the effective rate
// 8.25%) once ANNUAL GROSS INCOME exceeds $100 million.
function connecticutCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  const grossIncome = Math.max(0, safeNumber(values.grossIncome));
  const rate = grossIncome > 100_000_000 ? 0.0825 : 0.075;
  return income * rate;
}

// New Jersey: Corporation Business Tax — 6.5% up to $50,000 of NJ-allocated
// net income, 7.5% from $50,000-$100,000, 9% from $100,000 up to $10
// million, and a further 2.5% Corporate Transit Fee surtax layered on top
// above $10 million (effective ~11.5% top rate — "highest in the US").
// Disclosed approximation: the CTF surtax has shifted in recent legislative
// sessions, so this models current law as best confirmed by the audit.
function newJerseyCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  let tax: number;
  if (income <= 50_000) tax = income * 0.065;
  else if (income <= 100_000) tax = 50_000 * 0.065 + (income - 50_000) * 0.075;
  else tax = 50_000 * 0.065 + 50_000 * 0.075 + (income - 100_000) * 0.09;
  const transitFeeSurtax = Math.max(0, income - 10_000_000) * 0.025;
  return tax + transitFeeSurtax;
}

// Illinois: 7% Corporate Income Tax + 2.5% Personal Property Replacement
// Tax on the same base — combined ~9.5% effective. Returned as two line
// items so the breakdown is honest about what makes up the total.
function illinoisCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  const corporateIncomeTax = income * 0.07;
  const personalPropertyReplacementTax = income * 0.025;
  return {
    corporateIncomeTax,
    personalPropertyReplacementTax,
    totalTax: corporateIncomeTax + personalPropertyReplacementTax,
  };
}

// Tennessee: 6.5% Excise Tax on net income PLUS a separate 0.25% Franchise
// Tax on net worth ($100 minimum) — two genuinely different bases, so two
// inputs and a two-line-item breakdown.
function tennesseeCorporateTaxCalculator(values: Record<string, number>) {
  const income = Math.max(0, safeNumber(values.income));
  const netWorth = Math.max(0, safeNumber(values.netWorth));
  const exciseTax = income * 0.065;
  const franchiseTax = Math.max(100, netWorth * 0.0025);
  return { exciseTax, franchiseTax, totalTax: exciseTax + franchiseTax };
}

// ---------------------------------------------------------------------------
// Disclosed graduatedEstimate() approximations (low/high rate confirmed,
// exact bracket edges not independently re-verified this session)
// ---------------------------------------------------------------------------

// Alaska: 0% to 9.4%, ceiling confirmed at $222,000 (audit's own figure).
function alaskaCorporateTaxCalculator(values: Record<string, number>) {
  const income = safeNumber(values.income);
  return graduatedEstimate(income, 0, 0.094, 222_000);
}

// Arkansas: 1% to 4.3%; ceiling not independently confirmed this session —
// modeled with a $25,000 ceiling (Arkansas's traditional small-bracket
// cutoff), disclosed as an approximation in the tool's Assumptions text.
function arkansasCorporateTaxCalculator(values: Record<string, number>) {
  const income = safeNumber(values.income);
  return graduatedEstimate(income, 0.01, 0.043, 25_000);
}

// Hawaii: 4.4% to 6.4%; top bracket confirmed to begin at $100,000.
function hawaiiCorporateTaxCalculator(values: Record<string, number>) {
  const income = safeNumber(values.income);
  return graduatedEstimate(income, 0.044, 0.064, 100_000);
}

// Maine: 3.5% to 8.93%; exact intermediate bracket edges not independently
// re-verified this session — modeled with a $3,500,000 ceiling (Maine's
// top-bracket start), disclosed as an approximation.
function maineCorporateTaxCalculator(values: Record<string, number>) {
  const income = safeNumber(values.income);
  return graduatedEstimate(income, 0.035, 0.0893, 3_500_000);
}

// ---------------------------------------------------------------------------
// States with NO traditional corporate income tax — genuine gross-receipts
// or margin-tax substitutes, modeled honestly rather than skipped.
// ---------------------------------------------------------------------------

// Nevada: no corporate/business income tax. Commerce Tax applies only above
// $4M/year in Nevada gross revenue, at industry-varying rates. This models
// the general/default Commerce Tax rate (0.111%) as a disclosed
// approximation — actual rate varies by NAICS industry sector.
function nevadaCorporateTaxCalculator(values: Record<string, number>) {
  const grossRevenue = Math.max(0, safeNumber(values.grossRevenue));
  const taxable = Math.max(0, grossRevenue - 4_000_000);
  return taxable * 0.00111;
}

// Ohio: no corporate income tax. Commercial Activity Tax (CAT) is 0.26% on
// gross receipts above a $6,000,000 annual exclusion.
function ohioCorporateTaxCalculator(values: Record<string, number>) {
  const grossReceipts = Math.max(0, safeNumber(values.grossReceipts));
  const taxable = Math.max(0, grossReceipts - 6_000_000);
  return taxable * 0.0026;
}

// Texas: no traditional corporate income tax. Franchise ("Margin") Tax:
// $0 below the $2.47M no-tax-due revenue threshold; otherwise 0.75%
// (standard) or 0.375% (retail/wholesale, selected via dropdown) applied to
// total revenue as a simplified stand-in for "taxable margin" (the true
// margin base nets out cost of goods sold or compensation — disclosed
// approximation).
function texasCorporateTaxCalculator(values: Record<string, number>) {
  const revenue = Math.max(0, safeNumber(values.revenue));
  const isRetailWholesale = safeNumber(values.isRetailWholesale) === 1;
  if (revenue <= 2_470_000) return 0;
  const rate = isRetailWholesale ? 0.00375 : 0.0075;
  return revenue * rate;
}

// Washington: no corporate/business income tax. Business & Occupation
// (B&O) tax is a gross-receipts tax with a rate that depends on business
// classification, selected via dropdown: Retailing (0.471%), Wholesaling /
// Manufacturing (0.484%), or Service & Other — which, as of the January
// 2026 reform, is tiered by annual gross revenue (1.5% under $1M, 1.75%
// from $1M-$5M, 2.1% above $5M). Tier thresholds are a disclosed
// approximation of the reform as captured by the audit.
function washingtonCorporateTaxCalculator(values: Record<string, number>) {
  const grossRevenue = Math.max(0, safeNumber(values.grossRevenue));
  const classification = safeNumber(values.classification); // 0=Retailing,1=Wholesale/Mfg,2=Service&Other
  if (classification === 0) return grossRevenue * 0.00471;
  if (classification === 1) return grossRevenue * 0.00484;
  // Service & Other — tiered
  if (grossRevenue <= 1_000_000) return grossRevenue * 0.015;
  if (grossRevenue <= 5_000_000) return grossRevenue * 0.0175;
  return grossRevenue * 0.021;
}

// ---------------------------------------------------------------------------
// States with genuinely NO state-level business income tax of any kind
// (honest $0 tools — the "Missouri capital gains" precedent)
// ---------------------------------------------------------------------------

function southDakotaCorporateTaxCalculator(): number {
  return 0;
}

function wyomingCorporateTaxCalculator(): number {
  return 0;
}

export const usCorporateTaxCustomCalculators: Record<string, CustomCalculator> = {
  "alabama-corporate-tax-calculator": alabamaCorporateTaxCalculator,
  "alaska-corporate-tax-calculator": alaskaCorporateTaxCalculator,
  "arizona-corporate-tax-calculator": arizonaCorporateTaxCalculator,
  "arkansas-corporate-tax-calculator": arkansasCorporateTaxCalculator,
  "california-corporate-tax-calculator": californiaCorporateTaxCalculator,
  "colorado-corporate-tax-calculator": coloradoCorporateTaxCalculator,
  "connecticut-corporate-tax-calculator": connecticutCorporateTaxCalculator,
  "delaware-corporate-tax-calculator": delawareCorporateTaxCalculator,
  "florida-corporate-tax-calculator": floridaCorporateTaxCalculator,
  "georgia-corporate-tax-calculator": georgiaCorporateTaxCalculator,
  "hawaii-corporate-tax-calculator": hawaiiCorporateTaxCalculator,
  "idaho-corporate-tax-calculator": idahoCorporateTaxCalculator,
  "illinois-corporate-tax-calculator": illinoisCorporateTaxCalculator,
  "indiana-corporate-tax-calculator": indianaCorporateTaxCalculator,
  "iowa-corporate-tax-calculator": iowaCorporateTaxCalculator,
  "kansas-corporate-tax-calculator": kansasCorporateTaxCalculator,
  "kentucky-corporate-tax-calculator": kentuckyCorporateTaxCalculator,
  "louisiana-corporate-tax-calculator": louisianaCorporateTaxCalculator,
  "maine-corporate-tax-calculator": maineCorporateTaxCalculator,
  "maryland-corporate-tax-calculator": marylandCorporateTaxCalculator,
  "massachusetts-corporate-tax-calculator": massachusettsCorporateTaxCalculator,
  "michigan-corporate-tax-calculator": michiganCorporateTaxCalculator,
  "minnesota-corporate-tax-calculator": minnesotaCorporateTaxCalculator,
  "mississippi-corporate-tax-calculator": mississippiCorporateTaxCalculator,
  "missouri-corporate-tax-calculator": missouriCorporateTaxCalculator,
  "montana-corporate-tax-calculator": montanaCorporateTaxCalculator,
  "nebraska-corporate-tax-calculator": nebraskaCorporateTaxCalculator,
  "nevada-corporate-tax-calculator": nevadaCorporateTaxCalculator,
  "new-hampshire-corporate-tax-calculator": newHampshireCorporateTaxCalculator,
  "new-jersey-corporate-tax-calculator": newJerseyCorporateTaxCalculator,
  "new-mexico-corporate-tax-calculator": newMexicoCorporateTaxCalculator,
  "new-york-corporate-tax-calculator": newYorkCorporateTaxCalculator,
  "north-carolina-corporate-tax-calculator": northCarolinaCorporateTaxCalculator,
  "north-dakota-corporate-tax-calculator": northDakotaCorporateTaxCalculator,
  "ohio-corporate-tax-calculator": ohioCorporateTaxCalculator,
  "oklahoma-corporate-tax-calculator": oklahomaCorporateTaxCalculator,
  "oregon-corporate-tax-calculator": oregonCorporateTaxCalculator,
  "pennsylvania-corporate-tax-calculator": pennsylvaniaCorporateTaxCalculator,
  "rhode-island-corporate-tax-calculator": rhodeIslandCorporateTaxCalculator,
  "south-carolina-corporate-tax-calculator": southCarolinaCorporateTaxCalculator,
  "south-dakota-corporate-tax-calculator": southDakotaCorporateTaxCalculator,
  "tennessee-corporate-tax-calculator": tennesseeCorporateTaxCalculator,
  "texas-corporate-tax-calculator": texasCorporateTaxCalculator,
  "utah-corporate-tax-calculator": utahCorporateTaxCalculator,
  "vermont-corporate-tax-calculator": vermontCorporateTaxCalculator,
  "virginia-corporate-tax-calculator": virginiaCorporateTaxCalculator,
  "washington-corporate-tax-calculator": washingtonCorporateTaxCalculator,
  "west-virginia-corporate-tax-calculator": westVirginiaCorporateTaxCalculator,
  "wisconsin-corporate-tax-calculator": wisconsinCorporateTaxCalculator,
  "wyoming-corporate-tax-calculator": wyomingCorporateTaxCalculator,
};
