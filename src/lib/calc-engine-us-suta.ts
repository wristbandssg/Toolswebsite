/**
 * calc-engine-us-suta.ts — US state Unemployment Tax (SUTA / State
 * Unemployment Tax Act) calculators (Batch 9 of the state-tax-audit
 * build-out, 50 tools — one per state).
 *
 * Every state's SUTA has two moving parts: a taxable WAGE BASE (only the
 * first $X of each employee's annual wages is taxed) and a NEW-EMPLOYER
 * RATE (the flat rate a business with no unemployment-claims history pays
 * — as opposed to its "experience rate," which adjusts up or down over
 * time based on that employer's own layoff history and isn't modeled
 * here, since it's employer-specific rather than a published state
 * figure). Every tool computes: min(annual wages, wage base) x new-employer
 * rate, per employee.
 *
 * A handful of states have a genuinely bifurcated new-employer rate that
 * the audit confirmed as a clean 2-way (or 3-way) split, modeled with a
 * dropdown: Colorado and Michigan and Nebraska (standard vs. construction
 * industry), Mississippi (rate rises by the employer's year 1/2/3), North
 * Dakota (positive-balance vs. negative-balance industry classification),
 * and Wisconsin (payroll under vs. at/above $500,000). New Jersey is unique
 * among all 50 states in also charging a small SUTA contribution directly
 * to EMPLOYEES (0.425%) on top of the employer's share, so its tool
 * returns a two-line breakdown.
 *
 * Several states' new-employer rate could not be pinned to one clean
 * published figure this session (Louisiana, Maryland, Minnesota, Montana,
 * New Hampshire, South Carolina, Utah, Washington, West Virginia, Wyoming
 * — genuinely wide industry-by-industry variance, or conflicting sources).
 * Those use either the audit's own midpoint of a confirmed range, or (where
 * no range was even confirmed) a disclosed placeholder — every one of
 * these tools says so plainly in its Assumptions text and recommends
 * verifying the current rate with that state's unemployment agency.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";

function flatSutaCalculator(wageBase: number, rate: number): CustomCalculator {
  return (values) => {
    const annualWages = Math.max(0, safeNumber(values.annualWages));
    const taxableWages = Math.min(annualWages, wageBase);
    return taxableWages * rate;
  };
}

const alabamaSutaCalculator = flatSutaCalculator(8_000, 0.027);
const alaskaSutaCalculator = flatSutaCalculator(54_200, 0.015);
const arizonaSutaCalculator = flatSutaCalculator(8_000, 0.02);
const arkansasSutaCalculator = flatSutaCalculator(7_000, 0.02);
const californiaSutaCalculator = flatSutaCalculator(7_000, 0.034);
const connecticutSutaCalculator = flatSutaCalculator(27_000, 0.019);
const delawareSutaCalculator = flatSutaCalculator(14_500, 0.012);
const floridaSutaCalculator = flatSutaCalculator(7_000, 0.027);
const georgiaSutaCalculator = flatSutaCalculator(9_500, 0.027);
const hawaiiSutaCalculator = flatSutaCalculator(64_500, 0.024);
const idahoSutaCalculator = flatSutaCalculator(58_300, 0.01);
const illinoisSutaCalculator = flatSutaCalculator(14_250, 0.0335);
const indianaSutaCalculator = flatSutaCalculator(9_500, 0.025);
const iowaSutaCalculator = flatSutaCalculator(20_400, 0.01);
const kansasSutaCalculator = flatSutaCalculator(15_100, 0.0175);
const kentuckySutaCalculator = flatSutaCalculator(12_000, 0.027);
const louisianaSutaCalculator = flatSutaCalculator(7_000, 0.02);
const maineSutaCalculator = flatSutaCalculator(12_000, 0.0254);
const marylandSutaCalculator = flatSutaCalculator(8_500, 0.018);
const massachusettsSutaCalculator = flatSutaCalculator(15_000, 0.0213);
const minnesotaSutaCalculator = flatSutaCalculator(44_000, 0.029);
const missouriSutaCalculator = flatSutaCalculator(9_000, 0.02376);
const montanaSutaCalculator = flatSutaCalculator(47_300, 0.017);
const nevadaSutaCalculator = flatSutaCalculator(43_700, 0.0295);
const newHampshireSutaCalculator = flatSutaCalculator(14_000, 0.022);
const newMexicoSutaCalculator = flatSutaCalculator(34_800, 0.01);
const newYorkSutaCalculator = flatSutaCalculator(13_000, 0.041);
const northCarolinaSutaCalculator = flatSutaCalculator(34_200, 0.01);
const ohioSutaCalculator = flatSutaCalculator(9_000, 0.0285);
const oklahomaSutaCalculator = flatSutaCalculator(25_000, 0.015);
const oregonSutaCalculator = flatSutaCalculator(56_700, 0.024);
const pennsylvaniaSutaCalculator = flatSutaCalculator(10_000, 0.03822);
const rhodeIslandSutaCalculator = flatSutaCalculator(30_800, 0.0121);
const southCarolinaSutaCalculator = flatSutaCalculator(14_000, 0.01);
const southDakotaSutaCalculator = flatSutaCalculator(15_000, 0.0175);
const tennesseeSutaCalculator = flatSutaCalculator(7_000, 0.027);
const texasSutaCalculator = flatSutaCalculator(9_000, 0.027);
const utahSutaCalculator = flatSutaCalculator(50_700, 0.025);
const vermontSutaCalculator = flatSutaCalculator(15_400, 0.01);
const virginiaSutaCalculator = flatSutaCalculator(8_000, 0.025);
const washingtonSutaCalculator = flatSutaCalculator(78_200, 0.013);
const westVirginiaSutaCalculator = flatSutaCalculator(9_500, 0.027);
const wyomingSutaCalculator = flatSutaCalculator(33_800, 0.02);

// ---------------------------------------------------------------------------
// Two-way (or three-way) industry/experience dropdown states
// ---------------------------------------------------------------------------

// Colorado: 3.05% standard, 6.285% heavy construction.
function coloradoSutaCalculator(values: Record<string, number>) {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const isHeavyConstruction = safeNumber(values.isHeavyConstruction) === 1;
  const taxableWages = Math.min(annualWages, 30_600);
  return taxableWages * (isHeavyConstruction ? 0.06285 : 0.0305);
}

// Michigan: 2.7% standard, 5% construction.
function michiganSutaCalculator(values: Record<string, number>) {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const isConstruction = safeNumber(values.isConstruction) === 1;
  const taxableWages = Math.min(annualWages, 9_000);
  return taxableWages * (isConstruction ? 0.05 : 0.027);
}

// Nebraska: 1.25% standard, 5.40% construction.
function nebraskaSutaCalculator(values: Record<string, number>) {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const isConstruction = safeNumber(values.isConstruction) === 1;
  const taxableWages = Math.min(annualWages, 9_000);
  return taxableWages * (isConstruction ? 0.054 : 0.0125);
}

// Mississippi: rate rises by the employer's year (1.0% / 1.1% / 1.2%).
function mississippiSutaCalculator(values: Record<string, number>) {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const employerYear = safeNumber(values.employerYear, 1); // 1, 2, or 3
  const taxableWages = Math.min(annualWages, 14_000);
  const rate = employerYear >= 3 ? 0.012 : employerYear === 2 ? 0.011 : 0.01;
  return taxableWages * rate;
}

// North Dakota: bifurcated 1.03% (positive-balance) / 6.09% (negative-balance).
function northDakotaSutaCalculator(values: Record<string, number>) {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const isNegativeBalance = safeNumber(values.isNegativeBalance) === 1;
  const taxableWages = Math.min(annualWages, 46_600);
  return taxableWages * (isNegativeBalance ? 0.0609 : 0.0103);
}

// Wisconsin: 3.05% for payroll under $500,000, 3.25% at/above.
function wisconsinSutaCalculator(values: Record<string, number>) {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const totalAnnualPayroll = Math.max(0, safeNumber(values.totalAnnualPayroll));
  const taxableWages = Math.min(annualWages, 14_000);
  return taxableWages * (totalAnnualPayroll >= 500_000 ? 0.0325 : 0.0305);
}

// New Jersey: unique two-payer structure — employer pays 2.8%, employee
// also pays 0.425% (both on the same wage base).
function newJerseySutaCalculator(values: Record<string, number>) {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const taxableWages = Math.min(annualWages, 44_800);
  const employerSuta = taxableWages * 0.028;
  const employeeSuta = taxableWages * 0.00425;
  return { employerSuta, employeeSuta, totalSuta: employerSuta + employeeSuta };
}

export const usSutaCustomCalculators: Record<string, CustomCalculator> = {
  "alabama-unemployment-tax-calculator": alabamaSutaCalculator,
  "alaska-unemployment-tax-calculator": alaskaSutaCalculator,
  "arizona-unemployment-tax-calculator": arizonaSutaCalculator,
  "arkansas-unemployment-tax-calculator": arkansasSutaCalculator,
  "california-unemployment-tax-calculator": californiaSutaCalculator,
  "colorado-unemployment-tax-calculator": coloradoSutaCalculator,
  "connecticut-unemployment-tax-calculator": connecticutSutaCalculator,
  "delaware-unemployment-tax-calculator": delawareSutaCalculator,
  "florida-unemployment-tax-calculator": floridaSutaCalculator,
  "georgia-unemployment-tax-calculator": georgiaSutaCalculator,
  "hawaii-unemployment-tax-calculator": hawaiiSutaCalculator,
  "idaho-unemployment-tax-calculator": idahoSutaCalculator,
  "illinois-unemployment-tax-calculator": illinoisSutaCalculator,
  "indiana-unemployment-tax-calculator": indianaSutaCalculator,
  "iowa-unemployment-tax-calculator": iowaSutaCalculator,
  "kansas-unemployment-tax-calculator": kansasSutaCalculator,
  "kentucky-unemployment-tax-calculator": kentuckySutaCalculator,
  "louisiana-unemployment-tax-calculator": louisianaSutaCalculator,
  "maine-unemployment-tax-calculator": maineSutaCalculator,
  "maryland-unemployment-tax-calculator": marylandSutaCalculator,
  "massachusetts-unemployment-tax-calculator": massachusettsSutaCalculator,
  "michigan-unemployment-tax-calculator": michiganSutaCalculator,
  "minnesota-unemployment-tax-calculator": minnesotaSutaCalculator,
  "mississippi-unemployment-tax-calculator": mississippiSutaCalculator,
  "missouri-unemployment-tax-calculator": missouriSutaCalculator,
  "montana-unemployment-tax-calculator": montanaSutaCalculator,
  "nebraska-unemployment-tax-calculator": nebraskaSutaCalculator,
  "nevada-unemployment-tax-calculator": nevadaSutaCalculator,
  "new-hampshire-unemployment-tax-calculator": newHampshireSutaCalculator,
  "new-jersey-unemployment-tax-calculator": newJerseySutaCalculator,
  "new-mexico-unemployment-tax-calculator": newMexicoSutaCalculator,
  "new-york-unemployment-tax-calculator": newYorkSutaCalculator,
  "north-carolina-unemployment-tax-calculator": northCarolinaSutaCalculator,
  "north-dakota-unemployment-tax-calculator": northDakotaSutaCalculator,
  "ohio-unemployment-tax-calculator": ohioSutaCalculator,
  "oklahoma-unemployment-tax-calculator": oklahomaSutaCalculator,
  "oregon-unemployment-tax-calculator": oregonSutaCalculator,
  "pennsylvania-unemployment-tax-calculator": pennsylvaniaSutaCalculator,
  "rhode-island-unemployment-tax-calculator": rhodeIslandSutaCalculator,
  "south-carolina-unemployment-tax-calculator": southCarolinaSutaCalculator,
  "south-dakota-unemployment-tax-calculator": southDakotaSutaCalculator,
  "tennessee-unemployment-tax-calculator": tennesseeSutaCalculator,
  "texas-unemployment-tax-calculator": texasSutaCalculator,
  "utah-unemployment-tax-calculator": utahSutaCalculator,
  "vermont-unemployment-tax-calculator": vermontSutaCalculator,
  "virginia-unemployment-tax-calculator": virginiaSutaCalculator,
  "washington-unemployment-tax-calculator": washingtonSutaCalculator,
  "west-virginia-unemployment-tax-calculator": westVirginiaSutaCalculator,
  "wisconsin-unemployment-tax-calculator": wisconsinSutaCalculator,
  "wyoming-unemployment-tax-calculator": wyomingSutaCalculator,
};
