/**
 * US state "Real Estate Transfer Tax" calculators (the closest US
 * equivalent to what other countries call "stamp duty") — 29 tools under
 * the existing "Tax & Paycheck Calculators" category, fifth batch of the
 * 50-state audit (see state_tax_audit.xlsx, 27 Sep 2026): Alabama,
 * Arkansas, California, Connecticut, Delaware, Florida, Georgia, Hawaii,
 * Illinois, Iowa, Kentucky, Maine, Maryland, Massachusetts, Michigan,
 * Minnesota, Nebraska, Nevada, New Hampshire, New Jersey, New York, North
 * Carolina, Oklahoma, Pennsylvania, Rhode Island, South Carolina, Vermont,
 * Virginia, Washington. The other 21 states have none, ban it outright
 * (North Dakota, Missouri, Montana), or only tax it at the county level
 * (Ohio) rather than statewide.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

function graduatedEstimate(taxable: number, lowRate: number, highRate: number, ceiling: number): number {
  const t = Math.max(0, taxable);
  if (t <= 0) return 0;
  if (t >= ceiling) {
    const areaToCeiling = lowRate * ceiling + ((highRate - lowRate) * ceiling) / 2;
    return areaToCeiling + highRate * (t - ceiling);
  }
  return lowRate * t + ((highRate - lowRate) / ceiling) * ((t * t) / 2);
}

function alabamaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const deedTax = price * 0.001;
  const mortgageTax = loanAmount * 0.0015;
  return { deedTax, mortgageTax, totalTransferTax: deedTax + mortgageTax };
}
function arkansasTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.0033 };
}
function californiaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.0011 };
}
function connecticutTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const tax = 0.0075 * Math.min(price, 2_500_000) + 0.0125 * Math.max(0, price - 2_500_000);
  return { totalTransferTax: tax };
}
function delawareTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.04 };
}
function floridaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.007 };
}
function georgiaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.001 };
}
function hawaiiTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const ownerOccupied = safeNumber(values.ownerOccupied); // 1 = yes
  const base = graduatedEstimate(price, 0.001, 0.0125, 10_000_000);
  const tax = ownerOccupied === 1 ? base * 0.5 : base;
  return { totalTransferTax: tax };
}
function illinoisTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { stateTax: price * 0.001, countyTax: price * 0.0005, totalTransferTax: price * 0.0015 };
}
function iowaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const taxable = Math.max(0, price - 500);
  return { totalTransferTax: taxable * 0.0016 };
}
function kentuckyTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.001 };
}
function maineTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const total = price * 0.0044;
  return { buyerShare: total / 2, sellerShare: total / 2, totalTransferTax: total };
}
function marylandTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const firstTimeBuyer = safeNumber(values.firstTimeBuyer);
  const rate = firstTimeBuyer === 1 ? 0.0025 : 0.005;
  return { totalTransferTax: price * rate };
}
function massachusettsTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.00456 };
}
function michiganTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const stateTax = price * 0.0075;
  const countyTax = price * 0.0011;
  return { stateTax, countyTax, totalTransferTax: stateTax + countyTax };
}
function minnesotaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const deedTax = price * 0.0033;
  const mortgageRegistryTax = loanAmount * 0.0023;
  return { deedTax, mortgageRegistryTax, totalTransferTax: deedTax + mortgageRegistryTax };
}
function nebraskaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.00332 };
}
function nevadaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.0039 };
}
function newHampshireTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const buyerShare = price * 0.0075;
  const sellerShare = price * 0.0075;
  return { buyerShare, sellerShare, totalTransferTax: buyerShare + sellerShare };
}
const NJ_MANSION_TAX_TIERS: { upTo: number; rate: number }[] = [
  { upTo: 1_000_000, rate: 0 },
  { upTo: 2_000_000, rate: 0.01 },
  { upTo: 2_500_000, rate: 0.02 },
  { upTo: 3_000_000, rate: 0.025 },
  { upTo: 3_500_000, rate: 0.03 },
  { upTo: Infinity, rate: 0.035 },
];
function newJerseyTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const realtyTransferFee = graduatedEstimate(price, 0.004, 0.014, 1_000_000);
  const mansionTaxRate = NJ_MANSION_TAX_TIERS.find((t) => price <= t.upTo)?.rate ?? 0.035;
  const mansionTax = price * mansionTaxRate;
  return { realtyTransferFee, mansionTax, totalTransferTax: realtyTransferFee + mansionTax };
}
function newYorkTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const stateRett = price * 0.004;
  const mansionTax = price >= 1_000_000 ? price * 0.01 : 0;
  return { stateRett, mansionTax, totalTransferTax: stateRett + mansionTax };
}
function northCarolinaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.002 };
}
function oklahomaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.0015 };
}
function pennsylvaniaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const stateTax = price * 0.01;
  const localTax = price * 0.01;
  return { stateTax, localTax, totalTransferTax: stateTax + localTax };
}
function rhodeIslandTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const baseTax = price * 0.0075;
  const surcharge = Math.max(0, price - 800_000) * 0.015;
  return { baseTax, surcharge, totalTransferTax: baseTax + surcharge };
}
function southCarolinaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const stateTax = price * 0.0026;
  const totalTax = price * 0.0037;
  return { statePortion: stateTax, totalTransferTax: totalTax };
}
function vermontTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const propertyType = safeNumber(values.propertyType); // 0 principal residence, 1 non-principal residential
  if (propertyType === 1) {
    return { totalTransferTax: price * 0.0362 };
  }
  const tax = 0.005 * Math.min(price, 200_000) + 0.0147 * Math.max(0, price - 200_000);
  return { totalTransferTax: tax };
}
function virginiaTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  return { totalTransferTax: price * 0.0025 };
}
function washingtonTransferTaxCalculator(values: Record<string, number>) {
  const price = Math.max(0, safeNumber(values.propertyPrice));
  const T1 = 525_000;
  const T2 = 1_525_000;
  const T3 = 3_025_000;
  let tax = 0;
  tax += 0.011 * Math.min(price, T1);
  if (price > T1) tax += 0.0128 * (Math.min(price, T2) - T1);
  if (price > T2) tax += 0.0275 * (Math.min(price, T3) - T2);
  if (price > T3) tax += 0.03 * (price - T3);
  return { totalTransferTax: tax };
}

export const usTransferTaxCustomCalculators: Record<string, CustomCalculator> = {
  "alabama-transfer-tax-calculator": alabamaTransferTaxCalculator,
  "arkansas-transfer-tax-calculator": arkansasTransferTaxCalculator,
  "california-transfer-tax-calculator": californiaTransferTaxCalculator,
  "connecticut-transfer-tax-calculator": connecticutTransferTaxCalculator,
  "delaware-transfer-tax-calculator": delawareTransferTaxCalculator,
  "florida-transfer-tax-calculator": floridaTransferTaxCalculator,
  "georgia-transfer-tax-calculator": georgiaTransferTaxCalculator,
  "hawaii-transfer-tax-calculator": hawaiiTransferTaxCalculator,
  "illinois-transfer-tax-calculator": illinoisTransferTaxCalculator,
  "iowa-transfer-tax-calculator": iowaTransferTaxCalculator,
  "kentucky-transfer-tax-calculator": kentuckyTransferTaxCalculator,
  "maine-transfer-tax-calculator": maineTransferTaxCalculator,
  "maryland-transfer-tax-calculator": marylandTransferTaxCalculator,
  "massachusetts-transfer-tax-calculator": massachusettsTransferTaxCalculator,
  "michigan-transfer-tax-calculator": michiganTransferTaxCalculator,
  "minnesota-transfer-tax-calculator": minnesotaTransferTaxCalculator,
  "nebraska-transfer-tax-calculator": nebraskaTransferTaxCalculator,
  "nevada-transfer-tax-calculator": nevadaTransferTaxCalculator,
  "new-hampshire-transfer-tax-calculator": newHampshireTransferTaxCalculator,
  "new-jersey-transfer-tax-calculator": newJerseyTransferTaxCalculator,
  "new-york-transfer-tax-calculator": newYorkTransferTaxCalculator,
  "north-carolina-transfer-tax-calculator": northCarolinaTransferTaxCalculator,
  "oklahoma-transfer-tax-calculator": oklahomaTransferTaxCalculator,
  "pennsylvania-transfer-tax-calculator": pennsylvaniaTransferTaxCalculator,
  "rhode-island-transfer-tax-calculator": rhodeIslandTransferTaxCalculator,
  "south-carolina-transfer-tax-calculator": southCarolinaTransferTaxCalculator,
  "vermont-transfer-tax-calculator": vermontTransferTaxCalculator,
  "virginia-transfer-tax-calculator": virginiaTransferTaxCalculator,
  "washington-transfer-tax-calculator": washingtonTransferTaxCalculator,
};
