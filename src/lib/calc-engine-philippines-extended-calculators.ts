/**
 * Philippines extra tax calculator (Philippines Tax & Salary Calculators category).
 *
 * Holds one live tool: philippines-vat-calculator — 12% VAT added to or taken
 * out of a price. The main Philippines income-tax tool lives in
 * calc-engine-philippines.ts.
 *
 * The map at the bottom (philippinesExtendedCustomCalculators) is merged into
 * the app-wide registry in calc-engine.ts — key = the tool's slug in the database.
 */

import type { CalcInputValues, CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

const VAT_RATE_2026 = 0.12;

// ---------------------------------------------------------------------------
// 1. Philippines VAT Calculator
// ---------------------------------------------------------------------------

const philippinesVatCalculator: CustomCalculator = (values: CalcInputValues) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const isZeroRatedOrExempt = safeNumber(values.isZeroRatedOrExempt) === 1;
  const isInclusive = safeNumber(values.isInclusive) === 1;

  if (isZeroRatedOrExempt) {
    return { netAmount: amount, vatAmount: 0, grossAmount: amount };
  }

  let netAmount: number;
  let vatAmount: number;
  if (isInclusive) {
    netAmount = amount / (1 + VAT_RATE_2026);
    vatAmount = amount - netAmount;
  } else {
    netAmount = amount;
    vatAmount = amount * VAT_RATE_2026;
  }
  const grossAmount = netAmount + vatAmount;

  return { netAmount, vatAmount, grossAmount };
};

export const philippinesExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "philippines-vat-calculator": philippinesVatCalculator,
};
