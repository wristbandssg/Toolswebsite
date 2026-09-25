/**
 * Australia extended batch — 15 more Australia-specific tools filed under
 * the existing "Australia Tax & Salary Calculators" category (slug
 * "australia-tax-salary-calculators", created by create-australia-tax-
 * tool.ts), alongside australia-income-tax-calculator (see calc-engine-
 * australia.ts).
 *
 * This file deliberately does NOT import anything from calc-engine-
 * australia.ts — same per-file constant/helper duplication convention
 * used everywhere else on this site — so touching this file can never
 * break the existing income tax calculator, and vice versa.
 *
 * FIGURES — current Australian financial year FY2026-27 (1 July 2026 – 30
 * June 2027; the FBT year runs 1 April–31 March instead, noted where it
 * applies), each sourced directly from ato.gov.au (or revenue.nsw.gov.au
 * for the payroll tax example):
 *   - Income tax brackets, Low Income Tax Offset, Medicare Levy shade-in:
 *     same figures as calc-engine-australia.ts, this file's own copy per
 *     convention.
 *   - Medicare Levy Surcharge (single thresholds): 0% to $105,000, 1% to
 *     $123,000, 1.25% to $164,000, 1.5% above: ato.gov.au MLS thresholds
 *     page.
 *   - Division 293 tax: extra 15% on concessional super contributions for
 *     combined income + contributions above $250,000 (unindexed):
 *     ato.gov.au Division 293 page.
 *   - Super contributions tax: 15% standard rate: ato.gov.au concessional
 *     contributions page.
 *   - Superannuation Guarantee rate: 12% (same as calc-engine-
 *     australia.ts).
 *   - FBT (FBT year 2025-26/2026-27, rates unchanged through FBT year
 *     ending 31 March 2027): 47% flat rate, Type 1 gross-up 2.0802, Type 2
 *     gross-up 1.8868: ato.gov.au FBT rates and thresholds page.
 *   - HELP/HECS-HELP compulsory repayment (2026-27, marginal method):
 *     nil to $69,528; 15% of the slice $69,529–$129,717; $9,028 plus 17%
 *     of the slice $129,718–$186,050; 10% of total repayment income above
 *     $186,051: ato.gov.au study and training support loans page.
 *   - Working Holiday Maker tax: flat 15% (no tax-free threshold) to
 *     $45,000, then ordinary marginal rates (30%/37%/45%) above — this
 *     $45,000 threshold is an unindexed statutory figure, unchanged since
 *     introduction: ato.gov.au WHM tax rates page.
 *   - NSW Payroll Tax (used as a representative state example — payroll
 *     tax is state-based with no single national rate): 5.45% above a
 *     $1,200,000 annual threshold: revenue.nsw.gov.au.
 *
 * Same "estimate-grade" model as every other calculator on this site —
 * see each tool's own Assumptions text for the full disclaimer shown to
 * visitors.
 */

import type { CustomCalculator } from "./calc-engine-types";
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

function stackedTax(floor: number, amount: number, bands: TaxBand[]): number {
  let tax = 0;
  let remaining = Math.max(0, amount);
  let cursor = Math.max(0, floor);
  for (const band of bands) {
    if (remaining <= 0) break;
    if (cursor >= band.upTo) continue;
    const roomInBand = band.upTo - cursor;
    const amountHere = Math.min(remaining, roomInBand);
    tax += amountHere * band.rate;
    cursor += amountHere;
    remaining -= amountHere;
  }
  return tax;
}

const AU_BRACKETS_2026: TaxBand[] = [
  { rate: 0, upTo: 18200 },
  { rate: 0.15, upTo: 45000 },
  { rate: 0.3, upTo: 135000 },
  { rate: 0.37, upTo: 190000 },
  { rate: 0.45, upTo: Infinity },
];

function lowIncomeTaxOffset(taxableIncome: number): number {
  if (taxableIncome <= 37500) return 700;
  if (taxableIncome <= 45000) return 700 - (taxableIncome - 37500) * 0.05;
  if (taxableIncome <= 66667) return Math.max(0, 325 - (taxableIncome - 45000) * 0.015);
  return 0;
}

const MEDICARE_LEVY_RATE = 0.02;
const MEDICARE_LEVY_LOWER_THRESHOLD_2026 = 28011;
const MEDICARE_LEVY_UPPER_THRESHOLD_2026 = 35013;
const MEDICARE_LEVY_SHADE_IN_RATE = 0.1;

function medicareLevy(taxableIncome: number): number {
  if (taxableIncome <= MEDICARE_LEVY_LOWER_THRESHOLD_2026) return 0;
  if (taxableIncome <= MEDICARE_LEVY_UPPER_THRESHOLD_2026) {
    return (taxableIncome - MEDICARE_LEVY_LOWER_THRESHOLD_2026) * MEDICARE_LEVY_SHADE_IN_RATE;
  }
  return taxableIncome * MEDICARE_LEVY_RATE;
}

/** Income tax + Medicare Levy − LITO, floored at $0 — the standard
 * "what does the ATO actually take" combination used across this file. */
function incomeTaxPlusMedicare(taxableIncome: number): { incomeTax: number; medicareLevyAmount: number } {
  const grossTax = progressiveTax(taxableIncome, AU_BRACKETS_2026);
  const offset = lowIncomeTaxOffset(taxableIncome);
  const incomeTax = Math.max(0, grossTax - offset);
  return { incomeTax, medicareLevyAmount: medicareLevy(taxableIncome) };
}

function periodsFrom(raw: number | undefined): number {
  return safeNumber(raw, 12) || 12;
}

// ---------------------------------------------------------------------------
// 1. Australia Medicare Levy Calculator — the levy alone, standalone.
// ---------------------------------------------------------------------------

const australiaMedicareLevyCalculator: CustomCalculator = (values) => {
  const taxableIncome = Math.max(0, safeNumber(values.taxableIncome));

  const levy = medicareLevy(taxableIncome);

  return {
    medicareLevy: levy,
    effectiveRate: taxableIncome > 0 ? (levy / taxableIncome) * 100 : 0,
  };
};

// ---------------------------------------------------------------------------
// 2. Australia Medicare Levy Surcharge Calculator — the EXTRA levy for
//    those without private hospital cover, income-tiered.
// ---------------------------------------------------------------------------

const MLS_BANDS_2026: { rate: number; upTo: number }[] = [
  { rate: 0, upTo: 105000 },
  { rate: 0.01, upTo: 123000 },
  { rate: 0.0125, upTo: 164000 },
  { rate: 0.015, upTo: Infinity },
];

function mlsRateFor(income: number): number {
  for (const band of MLS_BANDS_2026) {
    if (income <= band.upTo) return band.rate;
  }
  return MLS_BANDS_2026[MLS_BANDS_2026.length - 1].rate;
}

const australiaMedicareLevySurchargeCalculator: CustomCalculator = (values) => {
  const taxableIncome = Math.max(0, safeNumber(values.taxableIncome));
  const hasPrivateCover = safeNumber(values.hasPrivateCover) === 1;

  const rate = hasPrivateCover ? 0 : mlsRateFor(taxableIncome);
  const surcharge = taxableIncome * rate;

  return {
    surchargeRate: rate * 100,
    medicareLevySurcharge: surcharge,
  };
};

// ---------------------------------------------------------------------------
// 3. Australia GST Calculator — 10%, forward or reverse.
// ---------------------------------------------------------------------------

const GST_RATE = 0.1;

const australiaGstCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount));
  const isGstInclusive = safeNumber(values.isGstInclusive) === 1;

  let netAmount: number;
  let gstAmount: number;
  let grossAmount: number;

  if (isGstInclusive) {
    netAmount = amount / (1 + GST_RATE);
    gstAmount = amount - netAmount;
    grossAmount = amount;
  } else {
    netAmount = amount;
    gstAmount = amount * GST_RATE;
    grossAmount = amount + gstAmount;
  }

  return { netAmount, gstAmount, grossAmount };
};

// ---------------------------------------------------------------------------
// 4. Australia Capital Gains Tax Calculator — no separate CGT regime: the
//    gain (discounted 50% if held 12+ months) is added to taxable income
//    and taxed at marginal rates, plus the Medicare Levy.
// ---------------------------------------------------------------------------

const CGT_DISCOUNT_RATE = 0.5;

const australiaCapitalGainsTaxCalculator: CustomCalculator = (values) => {
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));
  const gainAmount = Math.max(0, safeNumber(values.gainAmount));
  const heldOverTwelveMonths = safeNumber(values.heldOverTwelveMonths) === 1;

  const discountedGain = heldOverTwelveMonths ? gainAmount * CGT_DISCOUNT_RATE : gainAmount;
  const incomeTaxOnGain = stackedTax(otherTaxableIncome, discountedGain, AU_BRACKETS_2026);
  const medicareLevyOnGain = discountedGain * MEDICARE_LEVY_RATE;
  const totalTaxOnGain = incomeTaxOnGain + medicareLevyOnGain;
  const netProceeds = Math.max(0, gainAmount - totalTaxOnGain);
  const effectiveRate = gainAmount > 0 ? (totalTaxOnGain / gainAmount) * 100 : 0;

  return {
    discountedGain,
    incomeTaxOnGain,
    medicareLevyOnGain,
    totalTaxOnGain,
    netProceeds,
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// 5. Australia Superannuation Tax Calculator — 15% contributions tax, plus
//    the Division 293 extra 15% for high-income earners.
// ---------------------------------------------------------------------------

const SUPER_CONTRIBUTIONS_TAX_RATE = 0.15;
const DIVISION_293_THRESHOLD = 250000;
const DIVISION_293_RATE = 0.15;

const australiaSuperannuationTaxCalculator: CustomCalculator = (values) => {
  const taxableIncome = Math.max(0, safeNumber(values.taxableIncome));
  const concessionalContributions = Math.max(0, safeNumber(values.concessionalContributions));

  const standardContributionsTax = concessionalContributions * SUPER_CONTRIBUTIONS_TAX_RATE;

  const combinedIncome = taxableIncome + concessionalContributions;
  const excessOverThreshold = Math.max(0, combinedIncome - DIVISION_293_THRESHOLD);
  const division293Base = Math.min(excessOverThreshold, concessionalContributions);
  const division293Tax = division293Base * DIVISION_293_RATE;

  const totalSuperTax = standardContributionsTax + division293Tax;

  return {
    standardContributionsTax,
    division293Tax,
    totalSuperTax,
    netContributionAfterTax: Math.max(0, concessionalContributions - totalSuperTax),
  };
};

// ---------------------------------------------------------------------------
// 6. Australia PAYG Calculator — estimated PAYG withholding for one pay
//    period, from an annual salary.
// ---------------------------------------------------------------------------

const australiaPaygCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const periods = periodsFrom(values.payFrequency);

  const { incomeTax, medicareLevyAmount } = incomeTaxPlusMedicare(annualSalary);
  const totalAnnualWithholding = incomeTax + medicareLevyAmount;

  return {
    annualIncomeTax: incomeTax,
    annualMedicareLevy: medicareLevyAmount,
    totalAnnualWithholding,
    paygPerPeriod: totalAnnualWithholding / periods,
    netPayPerPeriod: annualSalary / periods - totalAnnualWithholding / periods,
  };
};

// ---------------------------------------------------------------------------
// 7. Australia Payroll Tax Calculator — EMPLOYER-side, state payroll tax,
//    using New South Wales as a representative example.
// ---------------------------------------------------------------------------

const NSW_PAYROLL_TAX_THRESHOLD = 1200000;
const NSW_PAYROLL_TAX_RATE = 0.0545;

const australiaPayrollTaxCalculator: CustomCalculator = (values) => {
  const annualTaxableWages = Math.max(0, safeNumber(values.annualTaxableWages));

  const wagesOverThreshold = Math.max(0, annualTaxableWages - NSW_PAYROLL_TAX_THRESHOLD);
  const payrollTax = wagesOverThreshold * NSW_PAYROLL_TAX_RATE;

  return {
    wagesOverThreshold,
    payrollTax,
  };
};

// ---------------------------------------------------------------------------
// 8. Australia Dividend Tax Calculator — franked dividends and franking
//    credits (Australia's dividend imputation system).
// ---------------------------------------------------------------------------

const COMPANY_TAX_RATE = 0.3; // used to gross a fully-franked dividend back up to its pre-tax equivalent

const australiaDividendTaxCalculator: CustomCalculator = (values) => {
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));
  const frankedDividend = Math.max(0, safeNumber(values.frankedDividend));
  const frankingPercentage = Math.min(100, Math.max(0, safeNumber(values.frankingPercentage, 100))) / 100;

  const frankingCredit = frankedDividend * frankingPercentage * (COMPANY_TAX_RATE / (1 - COMPANY_TAX_RATE));
  const grossedUpDividend = frankedDividend + frankingCredit;

  const { incomeTax } = incomeTaxPlusMedicare(otherTaxableIncome + grossedUpDividend);
  const { incomeTax: incomeTaxWithoutDividend } = incomeTaxPlusMedicare(otherTaxableIncome);
  const taxOnDividend = Math.max(0, incomeTax - incomeTaxWithoutDividend);
  const netTaxPayable = Math.max(0, taxOnDividend - frankingCredit);
  const refundableCredit = Math.max(0, frankingCredit - taxOnDividend);

  return {
    grossedUpDividend,
    frankingCredit,
    taxOnDividend,
    netTaxPayable,
    refundableCredit,
  };
};

// ---------------------------------------------------------------------------
// 9. Australia Rental Income Tax Calculator — rental profit (or loss —
//    "negative gearing") stacked on other income.
// ---------------------------------------------------------------------------

const australiaRentalIncomeTaxCalculator: CustomCalculator = (values) => {
  const annualRentalIncome = Math.max(0, safeNumber(values.annualRentalIncome));
  const allowableExpenses = Math.max(0, safeNumber(values.allowableExpenses));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  const rentalResult = annualRentalIncome - allowableExpenses; // can be negative (a loss)
  const combinedTaxableIncome = Math.max(0, otherTaxableIncome + rentalResult);

  const { incomeTax: taxWithRental } = incomeTaxPlusMedicare(combinedTaxableIncome);
  const { incomeTax: taxWithoutRental } = incomeTaxPlusMedicare(otherTaxableIncome);
  const taxImpact = taxWithRental - taxWithoutRental; // negative = tax SAVING from a loss

  return {
    rentalResult,
    taxImpact,
    isNegativelyGeared: rentalResult < 0 ? 1 : 0,
  };
};

// ---------------------------------------------------------------------------
// 10. Australia Self Employment Tax Calculator — Australia has no separate
//     self-employment/FICA-style tax: income tax + Medicare Levy on net
//     business profit is the whole picture (super is voluntary for the
//     self-employed, not compulsory — see this tool's FAQ).
// ---------------------------------------------------------------------------

const australiaSelfEmploymentTaxCalculator: CustomCalculator = (values) => {
  const netProfit = Math.max(0, safeNumber(values.netProfit));

  const { incomeTax, medicareLevyAmount } = incomeTaxPlusMedicare(netProfit);
  const totalTax = incomeTax + medicareLevyAmount;

  return {
    incomeTax,
    medicareLevyAmount,
    totalTax,
    netProfitAfterTax: Math.max(0, netProfit - totalTax),
    effectiveRate: netProfit > 0 ? (totalTax / netProfit) * 100 : 0,
  };
};

// ---------------------------------------------------------------------------
// 11. Australia Contractor Tax Calculator — income tax + Medicare Levy on
//     net contracting income, with a Personal Services Income (PSI) toggle
//     that flags whether deductions are restricted the way an employee's
//     would be.
// ---------------------------------------------------------------------------

const australiaContractorTaxCalculator: CustomCalculator = (values) => {
  const netContractingIncome = Math.max(0, safeNumber(values.netContractingIncome));
  const psiRulesApply = safeNumber(values.psiRulesApply) === 1;

  const { incomeTax, medicareLevyAmount } = incomeTaxPlusMedicare(netContractingIncome);
  const totalTax = incomeTax + medicareLevyAmount;
  const suggestedWithholdingRate = netContractingIncome > 0 ? (totalTax / netContractingIncome) * 100 : 0;

  return {
    incomeTax,
    medicareLevyAmount,
    totalTax,
    netIncomeAfterTax: Math.max(0, netContractingIncome - totalTax),
    suggestedWithholdingRate,
    // PSI rules apply is echoed back purely so the Tool's own copy/FAQ can
    // explain what it means for this visitor — it doesn't change the tax
    // MATH here (PSI mainly restricts which DEDUCTIONS you can claim
    // before arriving at "net contracting income", which happens before
    // this calculator, not a different tax rate).
    psiRulesApply: psiRulesApply ? 1 : 0,
  };
};

// ---------------------------------------------------------------------------
// 12. Australia Fringe Benefits Tax Calculator — 47% flat rate on the
//     grossed-up taxable value of a benefit.
// ---------------------------------------------------------------------------

const FBT_RATE = 0.47;
const FBT_TYPE_1_GROSSUP = 2.0802;
const FBT_TYPE_2_GROSSUP = 1.8868;

const australiaFringeBenefitsTaxCalculator: CustomCalculator = (values) => {
  const taxableValueOfBenefit = Math.max(0, safeNumber(values.taxableValueOfBenefit));
  const isType1 = safeNumber(values.benefitType, 1) === 1;

  const grossUpRate = isType1 ? FBT_TYPE_1_GROSSUP : FBT_TYPE_2_GROSSUP;
  const grossedUpValue = taxableValueOfBenefit * grossUpRate;
  const fbtPayable = grossedUpValue * FBT_RATE;

  return {
    grossUpRateUsed: grossUpRate,
    grossedUpValue,
    fbtPayable,
  };
};

// ---------------------------------------------------------------------------
// 13. Australia HELP Repayment Calculator — 2026-27 marginal repayment
//     method.
// ---------------------------------------------------------------------------

const HELP_THRESHOLD_1_2026 = 69528;
const HELP_THRESHOLD_2_2026 = 129717;
const HELP_THRESHOLD_3_2026 = 186050;
const HELP_RATE_TIER_1 = 0.15;
const HELP_RATE_TIER_2 = 0.17;
const HELP_TIER_2_BASE = 9028;
const HELP_FLAT_RATE_TOP = 0.1;

function helpRepaymentAmount(repaymentIncome: number): number {
  if (repaymentIncome <= HELP_THRESHOLD_1_2026) return 0;
  if (repaymentIncome <= HELP_THRESHOLD_2_2026) {
    return (repaymentIncome - HELP_THRESHOLD_1_2026) * HELP_RATE_TIER_1;
  }
  if (repaymentIncome <= HELP_THRESHOLD_3_2026) {
    return HELP_TIER_2_BASE + (repaymentIncome - HELP_THRESHOLD_2_2026) * HELP_RATE_TIER_2;
  }
  return repaymentIncome * HELP_FLAT_RATE_TOP;
}

const australiaHelpRepaymentCalculator: CustomCalculator = (values) => {
  const repaymentIncome = Math.max(0, safeNumber(values.repaymentIncome));

  const compulsoryRepayment = helpRepaymentAmount(repaymentIncome);

  return {
    compulsoryRepayment,
    effectiveRate: repaymentIncome > 0 ? (compulsoryRepayment / repaymentIncome) * 100 : 0,
  };
};

// ---------------------------------------------------------------------------
// 14. Australia HECS Repayment Calculator — same repayment formula as
//     HELP, but framed around an outstanding LOAN BALANCE: this year's
//     compulsory repayment plus annual indexation, showing the balance
//     change for the year — a genuinely different question from "what do
//     I repay this year" alone.
// ---------------------------------------------------------------------------

const australiaHecsRepaymentCalculator: CustomCalculator = (values) => {
  const repaymentIncome = Math.max(0, safeNumber(values.repaymentIncome));
  const currentLoanBalance = Math.max(0, safeNumber(values.currentLoanBalance));
  const indexationRate = Math.max(0, safeNumber(values.indexationRate)) / 100;

  const compulsoryRepayment = helpRepaymentAmount(repaymentIncome);
  const indexationAmount = currentLoanBalance * indexationRate;
  const newLoanBalance = Math.max(0, currentLoanBalance + indexationAmount - compulsoryRepayment);

  return {
    compulsoryRepayment,
    indexationAmount,
    newLoanBalance,
  };
};

// ---------------------------------------------------------------------------
// 15. Australia Working Holiday Tax Calculator — flat 15% to $45,000, then
//     ordinary marginal rates above.
// ---------------------------------------------------------------------------

const WHM_FLAT_THRESHOLD = 45000;
const WHM_FLAT_RATE = 0.15;
const WHM_BANDS_ABOVE_THRESHOLD: TaxBand[] = [
  { rate: 0.3, upTo: 135000 },
  { rate: 0.37, upTo: 190000 },
  { rate: 0.45, upTo: Infinity },
];

const australiaWorkingHolidayTaxCalculator: CustomCalculator = (values) => {
  const annualIncome = Math.max(0, safeNumber(values.annualIncome));

  const flatPortion = Math.min(annualIncome, WHM_FLAT_THRESHOLD);
  const taxOnFlatPortion = flatPortion * WHM_FLAT_RATE;
  const amountAboveThreshold = Math.max(0, annualIncome - WHM_FLAT_THRESHOLD);
  const taxAboveThreshold = stackedTax(WHM_FLAT_THRESHOLD, amountAboveThreshold, WHM_BANDS_ABOVE_THRESHOLD);
  const totalTax = taxOnFlatPortion + taxAboveThreshold;

  return {
    taxOnFlatPortion,
    taxAboveThreshold,
    totalTax,
    netIncome: Math.max(0, annualIncome - totalTax),
  };
};

export const australiaExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "australia-medicare-levy-calculator": australiaMedicareLevyCalculator,
  "australia-medicare-levy-surcharge-calculator": australiaMedicareLevySurchargeCalculator,
  "australia-gst-calculator": australiaGstCalculator,
  "australia-capital-gains-tax-calculator": australiaCapitalGainsTaxCalculator,
  "australia-superannuation-tax-calculator": australiaSuperannuationTaxCalculator,
  "australia-payg-calculator": australiaPaygCalculator,
  "australia-payroll-tax-calculator": australiaPayrollTaxCalculator,
  "australia-dividend-tax-calculator": australiaDividendTaxCalculator,
  "australia-rental-income-tax-calculator": australiaRentalIncomeTaxCalculator,
  "australia-self-employment-tax-calculator": australiaSelfEmploymentTaxCalculator,
  "australia-contractor-tax-calculator": australiaContractorTaxCalculator,
  "australia-fringe-benefits-tax-calculator": australiaFringeBenefitsTaxCalculator,
  "australia-help-repayment-calculator": australiaHelpRepaymentCalculator,
  "australia-hecs-repayment-calculator": australiaHecsRepaymentCalculator,
  "australia-working-holiday-tax-calculator": australiaWorkingHolidayTaxCalculator,
};
