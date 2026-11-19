/**
 * Philippines Extended tax calculators — 10 more Philippines tools filed
 * under the EXISTING "Philippines Tax & Salary Calculators" category
 * (created by calc-engine-philippines.ts's income tax tool): VAT,
 * Withholding Tax (EWT), Capital Gains Tax (two distinct mechanisms),
 * Estate Tax, Donor's Tax, Percentage Tax, Documentary Stamp Tax, Real
 * Property Tax, Dividend Tax, and Self Employed Tax (8% flat option).
 *
 * See calc-engine.ts for how this file's
 * `philippinesExtendedCustomCalculators` map merges into the app-wide
 * `customCalculators` registry.
 *
 * Structural/accuracy notes worth calling out (see each tool's own
 * Assumptions text for the full visitor-facing version):
 *  - Capital Gains Tax genuinely has TWO separate mechanisms under
 *    Philippine law depending on the asset: 6% final tax on real property
 *    capital assets (base = higher of gross selling price or fair market/
 *    zonal value), versus 15% final tax on unlisted shares (base = net
 *    capital gain) — modeled as two selectable branches of one tool rather
 *    than two tools, since they share almost no other structure.
 *  - Percentage Tax reverted to its standard 3% rate on 1 July 2023, after
 *    a temporary 1% COVID-era rate (RA 11534/CREATE Act) expired —
 *    confirmed via BIR's own RMC No. 69-2023. This tool uses 3%, not 1%.
 *  - Real Property Tax is fundamentally an LGU (local government unit) tax
 *    with rates and assessment levels that vary by locality — this
 *    calculator applies only the NATIONAL STATUTORY CAPS (1% province, 2%
 *    city/Metro Manila, plus 1% Special Education Fund) to a user-supplied
 *    assessed value or assessment level, and does NOT hard-code any
 *    specific city's (e.g. Quezon City, Manila) actual ordinance rates or
 *    assessment-level schedule, since no current one could be confirmed
 *    against a live official source.
 *  - Dividend Tax rates (10% resident/citizen, 20%/25% non-resident alien)
 *    reflect long-standing NIRC provisions not amended by TRAIN or CREATE —
 *    the least-recently-reconfirmed figures in this batch; flagged in the
 *    tool's own Assumptions text as worth an independent check against a
 *    current BIR source before relying on them for a specific transaction.
 *  - Withholding Tax (EWT) models a representative subset of common
 *    Alphanumeric Tax Code (ATC) categories from RR 11-2018 — not the full
 *    ATC table, which has dozens of narrower categories.
 *
 * Figures confirmed via bir.gov.ph (BIR) and the National Internal Revenue
 * Code as amended by RA 10963 (TRAIN) and RA 11534 (CREATE), currently in
 * force as of 2026 unless noted — see each tool's own Assumptions text for
 * the full disclaimer shown to visitors and source notes.
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
