/**
 * Malaysia extra tax calculators (Malaysia Tax & Salary Calculators category).
 *
 * Holds two live tools:
 *  - malaysia-sst-calculator — Sales and Service Tax on a price.
 *  - malaysia-real-property-gains-tax-calculator — RPGT on a property sale,
 *    using the holding-period rate table.
 * The main Malaysia income-tax tool lives in calc-engine-malaysia.ts.
 *
 * The map at the bottom (malaysiaExtendedCustomCalculators) is merged into the
 * app-wide registry in calc-engine.ts — key = the tool's slug in the database.
 */

import type { CalcInputValues, CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

// SST.
const SALES_TAX_RATES = { exempt: 0, five: 0.05, ten: 0.1 };
const SERVICE_TAX_RATES = { standard: 0.08, reduced: 0.06 };

// RPGT — citizen/PR schedule effective 1 Jan 2022; non-citizen/company
// schedule effective 1 Jan 2019.
const RPGT_CITIZEN_RATES = [0.3, 0.3, 0.3, 0.2, 0.15, 0]; // years 1,2,3,4,5,6+
const RPGT_NONCITIZEN_RATES = [0.3, 0.3, 0.3, 0.3, 0.3, 0.1];
const RPGT_EXEMPTION_FLAT = 10000;
const RPGT_EXEMPTION_PERCENT = 0.1;

// ---------------------------------------------------------------------------
// 5. Malaysia SST Calculator
// ---------------------------------------------------------------------------

const malaysiaSstCalculator: CustomCalculator = (values: CalcInputValues) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const taxType = safeNumber(values.taxType); // 0=sales-exempt,1=sales5,2=sales10,3=service8,4=service6
  const isInclusive = safeNumber(values.isInclusive) === 1;

  let rate = 0;
  if (taxType === 1) rate = SALES_TAX_RATES.five;
  else if (taxType === 2) rate = SALES_TAX_RATES.ten;
  else if (taxType === 3) rate = SERVICE_TAX_RATES.standard;
  else if (taxType === 4) rate = SERVICE_TAX_RATES.reduced;

  let netAmount: number;
  let taxAmount: number;
  if (isInclusive) {
    netAmount = amount / (1 + rate);
    taxAmount = amount - netAmount;
  } else {
    netAmount = amount;
    taxAmount = amount * rate;
  }
  const grossAmount = netAmount + taxAmount;

  return { netAmount, taxAmount, grossAmount, rateUsed: rate * 100 };
};

// ---------------------------------------------------------------------------
// 7. Malaysia Real Property Gains Tax (RPGT) Calculator
// ---------------------------------------------------------------------------

const malaysiaRpgtCalculator: CustomCalculator = (values: CalcInputValues) => {
  const disposalPrice = Math.max(0, safeNumber(values.disposalPrice));
  const acquisitionPrice = Math.max(0, safeNumber(values.acquisitionPrice));
  const yearsHeld = Math.max(0, safeNumber(values.yearsHeld));
  const isCitizenOrPr = safeNumber(values.isCitizenOrPr) === 1;

  const chargeableGain = Math.max(0, disposalPrice - acquisitionPrice);
  const exemption = Math.max(RPGT_EXEMPTION_FLAT, chargeableGain * RPGT_EXEMPTION_PERCENT);
  const netChargeableGain = Math.max(0, chargeableGain - exemption);

  const yearIndex = Math.min(Math.max(Math.ceil(yearsHeld) - 1, 0), 5);
  const rateTable = isCitizenOrPr ? RPGT_CITIZEN_RATES : RPGT_NONCITIZEN_RATES;
  const rateUsed = rateTable[yearIndex];

  const rpgtPayable = netChargeableGain * rateUsed;
  const netProceeds = disposalPrice - rpgtPayable;

  return { chargeableGain, exemption, netChargeableGain, rateUsed: rateUsed * 100, rpgtPayable, netProceeds };
};

export const malaysiaExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "malaysia-sst-calculator": malaysiaSstCalculator,
  "malaysia-real-property-gains-tax-calculator": malaysiaRpgtCalculator,
};
