/**
 * Malaysia Extended tax calculators — 10 more Malaysia tools filed under the
 * EXISTING "Malaysia Tax & Salary Calculators" category (created by
 * calc-engine-malaysia.ts's income tax tool): EPF, SOCSO, EIS, PCB (Monthly
 * Tax Deduction estimate), SST, Real Property Gains Tax, Stamp Duty, Rental
 * Income Tax, Dividend Tax (new 2% tax), and a Capital Gains Tax explainer.
 *
 * See calc-engine.ts for how this file's `malaysiaExtendedCustomCalculators`
 * map merges into the app-wide `customCalculators` registry.
 *
 * Structural/accuracy notes worth calling out (see each tool's own
 * Assumptions text for the full visitor-facing version):
 *  - Malaysia's Capital Gains Tax regime (Section 4(aa), effective 1 Jan
 *    2024) applies ONLY to companies, LLPs, trust bodies, and co-operative
 *    societies — INDIVIDUALS are entirely excluded from it, even for
 *    unlisted shares. So the "Capital Gains Tax Calculator" here is an
 *    honest explainer confirming individuals owe no CGT, following the same
 *    "reframe rather than invent" pattern already used for New Zealand,
 *    Singapore, and Hong Kong's genuinely-non-taxed categories, rather than
 *    a duplicate of the Real Property Gains Tax tool (a separate, much
 *    older regime that DOES apply to individuals disposing of real
 *    property/RPC shares).
 *  - EPF (KWSP) rates depend on BOTH citizenship/registration status AND
 *    age — including the newly-mandatory 2%/2% rate for non-Malaysian
 *    employees registered on/after 1 August 1998, effective only from
 *    1 October 2025 (a major recent change, confirmed via KWSP's own news
 *    release).
 *  - SOCSO and EIS both share the RM6,000/month wage ceiling, raised from
 *    RM5,000 effective 1 October 2024. SOCSO's real contribution schedule
 *    is a fixed wage-band table (not a pure percentage), but this
 *    calculator uses the equivalent percentage rates as a close estimate —
 *    disclosed in the tool's Assumptions text.
 *  - The Monthly Tax Deduction (PCB) Calculator is an ESTIMATE using the
 *    same annual progressive brackets as the main income tax calculator,
 *    annualized and divided by 12 — not LHDN's exact Computerized
 *    Calculation Method formula/schedule (which includes additional
 *    rounding and adjustment rules) — disclosed in the tool's Assumptions
 *    text.
 *  - The Rental Income Tax Calculator does NOT include any special
 *    below-market-rent exemption — an earlier such incentive could not be
 *    confirmed as still in force, so it's treated as discontinued rather
 *    than guessed at.
 *  - Stamp Duty models only the well-corroborated general ad valorem MOT
 *    tiers, the loan/financing instrument rate, and the first-time-
 *    homebuyer exemption (extended to 31 Dec 2027 per Budget 2026) — it
 *    does NOT include a foreign-buyer surcharge rate, since that figure
 *    could only be corroborated by secondary property-industry sources,
 *    not an official primary source, at the time of writing.
 *
 * Figures confirmed via kwsp.gov.my (KWSP/EPF), perkeso.gov.my (SOCSO/EIS),
 * hasil.gov.my (LHDN — income tax, RPGT, stamp duty, dividend tax), and
 * mysst.customs.gov.my (RMCD — SST), currently in force as of 2026 unless
 * noted — see each tool's own Assumptions text for the full disclaimer
 * shown to visitors and source notes.
 */

import type { CalcInputValues, CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types"; // each side

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
