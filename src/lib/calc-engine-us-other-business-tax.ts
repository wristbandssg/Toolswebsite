/**
 * US state "Business Tax" calculators (canonical 32-item list) — a SECOND
 * state-level business levy beyond the corporate income tax (or its
 * substitute), covered under the existing "Tax & Paycheck Calculators"
 * category. Fourth batch of the 50-state audit (see state_tax_audit.xlsx,
 * 27 Sep 2026): Alabama, Arkansas, California, Delaware, Georgia, Illinois,
 * Kentucky, Massachusetts, Minnesota, Mississippi, Nevada, New Hampshire,
 * North Carolina, Oregon, South Carolina, West Virginia — 16 states with a
 * genuine, confirmed second business levy. The other 34 states either have
 * no such second levy, or what they have is already counted as that
 * state's Corporate Tax substitute (Ohio's CAT, Texas's Margin Tax,
 * Washington's B&O, Tennessee's Franchise Tax) — not duplicated here.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

function alabamaBusinessTaxCalculator(values: Record<string, number>) {
  const netWorth = Math.max(0, safeNumber(values.netWorth));
  const CEILING = 10_000_000;
  const raw = 0.00025 * Math.min(netWorth, CEILING) + ((0.00175 - 0.00025) / CEILING) * (Math.min(netWorth, CEILING) ** 2 / 2) + (netWorth > CEILING ? 0.00175 * (netWorth - CEILING) : 0);
  const tax = Math.min(15_000, Math.max(100, raw));
  return { businessPrivilegeTax: tax };
}

function arkansasBusinessTaxCalculator(values: Record<string, number>) {
  const entityType = safeNumber(values.entityType); // 0 stock corp, 1 non-stock corp, 2 LLC
  const capitalStock = Math.max(0, safeNumber(values.capitalStock));
  let tax: number;
  if (entityType === 1) tax = 300;
  else if (entityType === 2) tax = 150;
  else tax = Math.max(150, capitalStock * 0.0027);
  return { franchiseTax: tax };
}

const CA_LLC_FEE_TIERS: { upTo: number; fee: number }[] = [
  { upTo: 249_999, fee: 0 },
  { upTo: 499_999, fee: 900 },
  { upTo: 999_999, fee: 2_500 },
  { upTo: 4_999_999, fee: 6_000 },
  { upTo: Infinity, fee: 11_790 },
];
function californiaBusinessTaxCalculator(values: Record<string, number>) {
  const entityType = safeNumber(values.entityType); // 0 corporation, 1 LLC
  const receipts = Math.max(0, safeNumber(values.californiaReceipts));
  const llcFee = entityType === 1 ? (CA_LLC_FEE_TIERS.find((t) => receipts <= t.upTo)?.fee ?? 11_790) : 0;
  const tax = 800 + llcFee;
  return { minimumFranchiseTax: 800, llcGrossReceiptsFee: llcFee, totalBusinessTax: tax };
}

function delawareBusinessTaxCalculator(values: Record<string, number>) {
  const grossReceipts = Math.max(0, safeNumber(values.grossReceipts));
  const grtRatePercent = Math.min(1.9914, Math.max(0.0945, safeNumber(values.grtRatePercent, 0.0945)));
  const authorizedShares = Math.max(0, safeNumber(values.authorizedShares));
  const grossReceiptsTax = grossReceipts * (grtRatePercent / 100);
  const franchiseTax = Math.min(200_000, Math.max(175, 175 + Math.ceil(Math.max(0, authorizedShares - 10_000) / 10_000) * 85));
  return { grossReceiptsTax, franchiseTax, totalBusinessTax: grossReceiptsTax + franchiseTax };
}

function georgiaBusinessTaxCalculator(values: Record<string, number>) {
  const netWorth = Math.max(0, safeNumber(values.netWorth));
  const LOW = 100_000;
  const HIGH = 22_000_000;
  let tax: number;
  if (netWorth <= LOW) tax = 0;
  else if (netWorth >= HIGH) tax = 5_000;
  else {
    const fraction = (netWorth - LOW) / (HIGH - LOW);
    tax = 10 + fraction * (5_000 - 10);
  }
  return { netWorthTax: tax };
}

function illinoisBusinessTaxCalculator(values: Record<string, number>) {
  const paidInCapital = Math.max(0, safeNumber(values.allocatedPaidInCapital));
  const tax = Math.min(2_000_000, Math.max(25, paidInCapital * 0.001));
  return { franchiseTax: tax };
}

function kentuckyBusinessTaxCalculator(values: Record<string, number>) {
  const grossReceipts = Math.max(0, safeNumber(values.grossReceipts));
  const grossProfits = Math.max(0, safeNumber(values.grossProfits));
  const tax = Math.max(175, Math.min(grossReceipts * 0.00095, grossProfits * 0.0075));
  return { lletTax: tax };
}

function massachusettsBusinessTaxCalculator(values: Record<string, number>) {
  const propertyOrNetWorth = Math.max(0, safeNumber(values.tangiblePropertyOrNetWorth));
  const tax = propertyOrNetWorth * 0.0026;
  return { corporateExciseNonIncomeTax: tax };
}

function minnesotaBusinessTaxCalculator(values: Record<string, number>) {
  const netTaxCapacity = Math.max(0, safeNumber(values.netTaxCapacity));
  const propertyClass = safeNumber(values.propertyClass); // 0 commercial/industrial, 1 seasonal-recreational
  const rate = propertyClass === 1 ? 0.09203 : 0.28313;
  const tax = netTaxCapacity * rate;
  return { stateGeneralPropertyTax: tax };
}

function mississippiBusinessTaxCalculator(values: Record<string, number>) {
  const capital = Math.max(0, safeNumber(values.capital));
  const tax = Math.max(25, capital * 0.0005);
  return { franchiseTax: tax };
}

function nevadaBusinessTaxCalculator(values: Record<string, number>) {
  const quarterlyPayroll = Math.max(0, safeNumber(values.quarterlyPayroll));
  const businessType = safeNumber(values.businessType); // 0 general, 1 financial institution
  const EXEMPTION = 50_000;
  const rate = businessType === 1 ? 0.01554 : 0.01378;
  const tax = Math.max(0, quarterlyPayroll - EXEMPTION) * rate;
  return { quarterlyExemption: EXEMPTION, modifiedBusinessTax: tax };
}

function newHampshireBusinessTaxCalculator(values: Record<string, number>) {
  const compensationPaid = Math.max(0, safeNumber(values.compensationPaid));
  const interestPaid = Math.max(0, safeNumber(values.interestPaid));
  const dividendsPaid = Math.max(0, safeNumber(values.dividendsPaid));
  const base = compensationPaid + interestPaid + dividendsPaid;
  const tax = base * 0.0055;
  return { valueAddedBase: base, businessEnterpriseTax: tax };
}

function northCarolinaBusinessTaxCalculator(values: Record<string, number>) {
  const taxBase = Math.max(0, safeNumber(values.franchiseTaxBase));
  const tax = Math.max(200, taxBase * 0.0015);
  return { franchiseTax: tax };
}

function oregonBusinessTaxCalculator(values: Record<string, number>) {
  const commercialActivity = Math.max(0, safeNumber(values.taxableCommercialActivity));
  const tax = 250 + Math.max(0, commercialActivity - 1_000_000) * 0.0057;
  return { corporateActivityTax: tax };
}

function southCarolinaBusinessTaxCalculator(values: Record<string, number>) {
  const capital = Math.max(0, safeNumber(values.capital));
  const tax = Math.max(25, capital * 0.001 + 15);
  return { corporateLicenseFee: tax };
}

function westVirginiaBusinessTaxCalculator(values: Record<string, number>) {
  const productionType = safeNumber(values.productionType); // 0 coal, 1 natural gas/oil
  const grossValue = Math.max(0, safeNumber(values.grossValue));
  const tonsProduced = Math.max(0, safeNumber(values.tonsProduced));
  const adValorem = grossValue * 0.05;
  const tax = productionType === 0 ? Math.max(tonsProduced * 0.75, adValorem) : adValorem;
  return { severanceTax: tax };
}

export const usOtherBusinessTaxCustomCalculators: Record<string, CustomCalculator> = {
  "alabama-business-tax-calculator": alabamaBusinessTaxCalculator,
  "arkansas-business-tax-calculator": arkansasBusinessTaxCalculator,
  "california-business-tax-calculator": californiaBusinessTaxCalculator,
  "delaware-business-tax-calculator": delawareBusinessTaxCalculator,
  "georgia-business-tax-calculator": georgiaBusinessTaxCalculator,
  "illinois-business-tax-calculator": illinoisBusinessTaxCalculator,
  "kentucky-business-tax-calculator": kentuckyBusinessTaxCalculator,
  "massachusetts-business-tax-calculator": massachusettsBusinessTaxCalculator,
  "minnesota-business-tax-calculator": minnesotaBusinessTaxCalculator,
  "mississippi-business-tax-calculator": mississippiBusinessTaxCalculator,
  "nevada-business-tax-calculator": nevadaBusinessTaxCalculator,
  "new-hampshire-business-tax-calculator": newHampshireBusinessTaxCalculator,
  "north-carolina-business-tax-calculator": northCarolinaBusinessTaxCalculator,
  "oregon-business-tax-calculator": oregonBusinessTaxCalculator,
  "south-carolina-business-tax-calculator": southCarolinaBusinessTaxCalculator,
  "west-virginia-business-tax-calculator": westVirginiaBusinessTaxCalculator,
};
