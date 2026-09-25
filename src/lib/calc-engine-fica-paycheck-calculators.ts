/**
 * "Tax & Paycheck Calculators" batch — 8 US-federal-only tools filed under
 * their own new category (slug "tax-paycheck-calculators"), a payroll-
 * withholding-focused sibling to the existing "Tax Calculators" category
 * (calc-engine-us-tax-salary-calculators.ts, calc-engine-capital-gains-
 * sales-vat-calculators.ts, calc-engine-property-tax-self-employment-
 * calculators.ts). This batch's angle is specifically the *line items on a
 * W-2 employee's paycheck* (FICA broken into its Social Security/Medicare/
 * Additional Medicare parts) plus the *quarterly/withholding-planning*
 * side of federal tax (Estimated Tax, Quarterly Tax, Tax Withholding),
 * rounded out with a Dividend Tax Calculator (qualified vs ordinary
 * dividends) — none of which exist as standalone tools anywhere else on
 * this site yet.
 *
 * Two tools that would have been an exact duplicate of existing content —
 * "Long Term Capital Gains Tax Calculator" and "Short Term Capital Gains
 * Tax Calculator" — were deliberately NOT rebuilt here: they already exist
 * verbatim as long-term-capital-gains-calculator and short-term-capital-
 * gains-calculator under the "Tax Calculators" category (see
 * calc-engine-capital-gains-sales-vat-calculators.ts). Rebuilding them
 * under a new slug would be duplicate content competing with the site's
 * own existing pages for the same search query, so this batch is 8 tools,
 * not the full 10 in the original list.
 *
 * FEDERAL FIGURES (2026 — same figures and sources as calc-engine-us-tax-
 * salary-calculators.ts and calc-engine-capital-gains-sales-vat-
 * calculators.ts; each file owns its own copy of these constants by this
 * project's established convention rather than cross-importing):
 *   - Tax brackets / standard deduction: IRS Rev. Proc. 2025-32 (2026
 *     inflation adjustments).
 *   - Social Security wage base: SSA's 2026 announcement ($184,500).
 *   - FICA rates: 6.2% Social Security (employee) + 1.45% Medicare
 *     (employee), +0.9% Additional Medicare above a filing-status
 *     threshold (fixed by statute, not inflation-adjusted).
 *   - Long-term capital gains / qualified dividend brackets (0%/15%/20%):
 *     same IRS Rev. Proc. 2025-32 source.
 *   - SECA (self-employment) rates: 12.4% Social Security + 2.9% Medicare
 *     on 92.35% of net self-employment earnings (IRC §1401), same wage
 *     base and Additional Medicare rules as above.
 *
 * Same "estimate-grade" model as every other calculator on this site:
 * standard deduction only (no itemizing or credits), federal only (no
 * state/local tax) — see each tool's own Assumptions text for the full
 * disclaimer shown to visitors.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

type FilingStatus = 0 | 1 | 2 | 3; // 0=Single 1=MFJ 2=MFS 3=HoH

const ORDINARY_BRACKETS_2026: Record<0 | 1 | 3, { rate: number; upTo: number }[]> = {
  0: [
    { rate: 0.1, upTo: 12400 },
    { rate: 0.12, upTo: 50400 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256225 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
  1: [
    { rate: 0.1, upTo: 24800 },
    { rate: 0.12, upTo: 100800 },
    { rate: 0.22, upTo: 211400 },
    { rate: 0.24, upTo: 403550 },
    { rate: 0.32, upTo: 512450 },
    { rate: 0.35, upTo: 768700 },
    { rate: 0.37, upTo: Infinity },
  ],
  3: [
    { rate: 0.1, upTo: 17700 },
    { rate: 0.12, upTo: 67450 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256200 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
};

const LTCG_BRACKETS_2026: Record<0 | 1 | 3, { rate: number; upTo: number }[]> = {
  0: [
    { rate: 0, upTo: 49450 },
    { rate: 0.15, upTo: 545500 },
    { rate: 0.2, upTo: Infinity },
  ],
  1: [
    { rate: 0, upTo: 98900 },
    { rate: 0.15, upTo: 613700 },
    { rate: 0.2, upTo: Infinity },
  ],
  3: [
    { rate: 0, upTo: 66200 },
    { rate: 0.15, upTo: 579600 },
    { rate: 0.2, upTo: Infinity },
  ],
};

const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  0: 16100,
  1: 32200,
  2: 16100,
  3: 24150,
};

const ADDITIONAL_MEDICARE_THRESHOLD_2026: Record<FilingStatus, number> = {
  0: 200000,
  1: 250000,
  2: 125000,
  3: 200000,
};

const SOCIAL_SECURITY_WAGE_BASE_2026 = 184500;
const SOCIAL_SECURITY_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;

const SELF_EMPLOYED_SOCIAL_SECURITY_RATE = 0.124;
const SELF_EMPLOYED_MEDICARE_RATE = 0.029;
const SE_NET_EARNINGS_FACTOR = 0.9235;

const FILING_STATUS_VALUES: FilingStatus[] = [0, 1, 2, 3];

function normalizeFilingStatus(raw: number | undefined): FilingStatus {
  const rounded = Math.round(safeNumber(raw, 0));
  return (FILING_STATUS_VALUES as number[]).includes(rounded) ? (rounded as FilingStatus) : 0;
}

function halveForMfs(brackets: { rate: number; upTo: number }[]) {
  return brackets.map((b) => ({ rate: b.rate, upTo: b.upTo === Infinity ? Infinity : b.upTo / 2 }));
}

function ordinaryBracketsFor(status: FilingStatus) {
  if (status === 2) return halveForMfs(ORDINARY_BRACKETS_2026[1]);
  return ORDINARY_BRACKETS_2026[status] ?? ORDINARY_BRACKETS_2026[0];
}

function ltcgBracketsFor(status: FilingStatus) {
  if (status === 2) return halveForMfs(LTCG_BRACKETS_2026[1]);
  return LTCG_BRACKETS_2026[status] ?? LTCG_BRACKETS_2026[0];
}

function progressiveTax(taxableIncome: number, brackets: { rate: number; upTo: number }[]): number {
  let tax = 0;
  let bandFloor = 0;
  for (const band of brackets) {
    if (taxableIncome <= bandFloor) break;
    const amountInBand = Math.min(taxableIncome, band.upTo) - bandFloor;
    if (amountInBand > 0) tax += amountInBand * band.rate;
    bandFloor = band.upTo;
    if (taxableIncome <= band.upTo) break;
  }
  return tax;
}

/** Tax on a SLICE of income of size `amount` stacking on top of `floor` —
 * same stacking-rule helper used in calc-engine-capital-gains-sales-vat-
 * calculators.ts, duplicated here per this project's per-file convention. */
function stackedTax(floor: number, amount: number, brackets: { rate: number; upTo: number }[]): number {
  let tax = 0;
  let remaining = Math.max(0, amount);
  let cursor = Math.max(0, floor);
  for (const band of brackets) {
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

function otherTaxableIncome(otherIncome: number, filingStatus: FilingStatus): number {
  return Math.max(0, otherIncome - STANDARD_DEDUCTION_2026[filingStatus]);
}

function federalIncomeTax(grossIncome: number, filingStatus: FilingStatus): number {
  const taxableIncome = Math.max(0, grossIncome - STANDARD_DEDUCTION_2026[filingStatus]);
  return progressiveTax(taxableIncome, ordinaryBracketsFor(filingStatus));
}

function periodsFrom(raw: number | undefined): number {
  return safeNumber(raw, 12) || 12;
}

// ---------------------------------------------------------------------------
// FICA Tax Calculator — the combined employee-side FICA bill (Social
// Security + Medicare + Additional Medicare where it applies) in one place.
// ---------------------------------------------------------------------------

const ficaTaxCalculator: CustomCalculator = (values) => {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const periods = periodsFrom(values.payFrequency);

  const socialSecurityTax = Math.min(annualWages, SOCIAL_SECURITY_WAGE_BASE_2026) * SOCIAL_SECURITY_RATE;
  const medicareTax = annualWages * MEDICARE_RATE;
  const threshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const additionalMedicareTax = Math.max(0, annualWages - threshold) * ADDITIONAL_MEDICARE_RATE;
  const totalFicaTax = socialSecurityTax + medicareTax + additionalMedicareTax;

  return {
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    totalFicaTax,
    perPaycheckFica: totalFicaTax / periods,
    wagesAfterFica: Math.max(0, annualWages - totalFicaTax),
  };
};

// ---------------------------------------------------------------------------
// Social Security Tax Calculator — the 6.2% employee-side piece alone,
// capped at the wage base. (Self-employed visitors should use the Self-
// Employed Social Security Calculator under Tax Calculators instead — that
// one uses the 12.4% combined SECA rate on 92.35% of net profit.)
// ---------------------------------------------------------------------------

const socialSecurityTaxCalculator: CustomCalculator = (values) => {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const periods = periodsFrom(values.payFrequency);

  const taxableWages = Math.min(annualWages, SOCIAL_SECURITY_WAGE_BASE_2026);
  const socialSecurityTax = taxableWages * SOCIAL_SECURITY_RATE;
  const wagesAboveWageBase = Math.max(0, annualWages - SOCIAL_SECURITY_WAGE_BASE_2026);

  return {
    socialSecurityTax,
    perPaycheckTax: socialSecurityTax / periods,
    taxableWages,
    wagesAboveWageBase,
  };
};

// ---------------------------------------------------------------------------
// Medicare Tax Calculator — the 1.45% employee-side piece alone, uncapped.
// (Additional Medicare Tax has its own calculator below — this one is just
// the base rate every employee pays on every dollar.)
// ---------------------------------------------------------------------------

const medicareTaxCalculator: CustomCalculator = (values) => {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const periods = periodsFrom(values.payFrequency);

  const medicareTax = annualWages * MEDICARE_RATE;

  return {
    medicareTax,
    perPaycheckTax: medicareTax / periods,
  };
};

// ---------------------------------------------------------------------------
// Additional Medicare Tax Calculator — the extra 0.9% that kicks in above a
// filing-status threshold (IRC §3101(b)(2)), fixed by statute since 2013.
// ---------------------------------------------------------------------------

const additionalMedicareTaxCalculator: CustomCalculator = (values) => {
  const annualWages = Math.max(0, safeNumber(values.annualWages));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const threshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const wagesOverThreshold = Math.max(0, annualWages - threshold);
  const additionalMedicareTax = wagesOverThreshold * ADDITIONAL_MEDICARE_RATE;

  return {
    threshold,
    wagesOverThreshold,
    additionalMedicareTax,
  };
};

// ---------------------------------------------------------------------------
// Dividend Tax Calculator — qualified dividends (taxed like long-term
// capital gains, stacked on top of other ordinary income) and ordinary/
// non-qualified dividends (taxed as ordinary income) modeled separately,
// same "Schedule D stacking" approach as the Capital Gains Tax family.
// ---------------------------------------------------------------------------

const dividendTaxCalculator: CustomCalculator = (values) => {
  const otherIncome = Math.max(0, safeNumber(values.otherIncome));
  const ordinaryDividends = Math.max(0, safeNumber(values.ordinaryDividends));
  const qualifiedDividends = Math.max(0, safeNumber(values.qualifiedDividends));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  const floorAfterDeduction = otherTaxableIncome(otherIncome, filingStatus);
  const ordinaryBrackets = ordinaryBracketsFor(filingStatus);
  const ltcgBrackets = ltcgBracketsFor(filingStatus);

  // Ordinary (non-qualified) dividends are just ordinary income — they
  // stack directly on top of the filer's other ordinary income.
  const ordinaryDividendTax = stackedTax(floorAfterDeduction, ordinaryDividends, ordinaryBrackets);

  // Qualified dividends get the preferential 0%/15%/20% rate, but the
  // *rate* they land in still depends on total income — so they stack on
  // top of other ordinary income AND the ordinary dividends already
  // counted above (mirrors the IRS Qualified Dividends and Capital Gain
  // Tax Worksheet's ordering).
  const floorForQualified = floorAfterDeduction + ordinaryDividends;
  const qualifiedDividendTax = stackedTax(floorForQualified, qualifiedDividends, ltcgBrackets);

  const totalDividendTax = ordinaryDividendTax + qualifiedDividendTax;
  const totalDividends = ordinaryDividends + qualifiedDividends;
  const effectiveRate = totalDividends > 0 ? (totalDividendTax / totalDividends) * 100 : 0;

  return {
    ordinaryDividendTax,
    qualifiedDividendTax,
    totalDividendTax,
    netDividends: Math.max(0, totalDividends - totalDividendTax),
    effectiveRate,
  };
};

// ---------------------------------------------------------------------------
// Tax Withholding Calculator — a paycheck "checkup": is your current
// per-paycheck withholding tracking your actual projected federal tax
// liability, or are you headed for a bill (or a big refund) at filing time?
// ---------------------------------------------------------------------------

const taxWithholdingCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const periods = periodsFrom(values.payFrequency);
  const currentWithholdingPerPaycheck = Math.max(0, safeNumber(values.currentWithholdingPerPaycheck));

  const estimatedAnnualTax = federalIncomeTax(annualSalary, filingStatus);
  const projectedAnnualWithholding = currentWithholdingPerPaycheck * periods;
  const difference = projectedAnnualWithholding - estimatedAnnualTax; // + = refund, - = balance due
  const suggestedAdjustmentPerPaycheck = -difference / periods;

  return {
    estimatedAnnualTax,
    projectedAnnualWithholding,
    projectedRefundOrBalance: difference,
    suggestedAdjustmentPerPaycheck,
  };
};

// ---------------------------------------------------------------------------
// Estimated Tax Calculator — a full-year projection for someone with
// income that isn't (fully) covered by paycheck withholding: combines
// federal income tax on total income with self-employment tax on any
// self-employment profit, nets off tax already withheld/paid, and splits
// what's left into four quarterly estimated payments (Form 1040-ES logic,
// simplified to this site's usual "estimate-grade" level — no prior-year
// safe-harbor calculation, since that needs last year's return).
// ---------------------------------------------------------------------------

const estimatedTaxCalculator: CustomCalculator = (values) => {
  const wagesAndOtherIncome = Math.max(0, safeNumber(values.wagesAndOtherIncome));
  const netSelfEmploymentProfit = Math.max(0, safeNumber(values.netSelfEmploymentProfit));
  const filingStatus = normalizeFilingStatus(values.filingStatus);
  const taxAlreadyPaid = Math.max(0, safeNumber(values.taxAlreadyPaid));

  const seNetEarnings = netSelfEmploymentProfit * SE_NET_EARNINGS_FACTOR;
  const seSocialSecurity = Math.min(seNetEarnings, SOCIAL_SECURITY_WAGE_BASE_2026) * SELF_EMPLOYED_SOCIAL_SECURITY_RATE;
  const seMedicare = seNetEarnings * SELF_EMPLOYED_MEDICARE_RATE;
  const totalIncomeForAdditionalMedicare = wagesAndOtherIncome + seNetEarnings;
  const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const seAdditionalMedicare =
    Math.max(0, totalIncomeForAdditionalMedicare - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE;
  const selfEmploymentTax = seSocialSecurity + seMedicare + seAdditionalMedicare;
  const deductibleHalfSeTax = (seSocialSecurity + seMedicare) / 2;

  const totalIncome = wagesAndOtherIncome + netSelfEmploymentProfit;
  const taxableIncome = Math.max(0, totalIncome - deductibleHalfSeTax - STANDARD_DEDUCTION_2026[filingStatus]);
  const incomeTax = progressiveTax(taxableIncome, ordinaryBracketsFor(filingStatus));

  const totalEstimatedTax = incomeTax + selfEmploymentTax;
  const remainingBalance = Math.max(0, totalEstimatedTax - taxAlreadyPaid);
  const quarterlyPayment = remainingBalance / 4;

  return {
    incomeTax,
    selfEmploymentTax,
    totalEstimatedTax,
    remainingBalance,
    quarterlyPayment,
  };
};

// ---------------------------------------------------------------------------
// Quarterly Tax Calculator — a narrower, per-quarter companion to the
// Estimated Tax Calculator above: "I made this much THIS quarter, what do
// I owe by this quarter's deadline?" rather than a whole-year projection.
// ---------------------------------------------------------------------------

const quarterlyTaxCalculator: CustomCalculator = (values) => {
  const thisQuarterNetProfit = Math.max(0, safeNumber(values.thisQuarterNetProfit));
  const otherAnnualIncome = Math.max(0, safeNumber(values.otherAnnualIncome));
  const filingStatus = normalizeFilingStatus(values.filingStatus);

  // Annualize this quarter's profit (assume a representative, even
  // quarter) purely to find the marginal position/rate — same simplifying
  // assumption used by the Second Job Tax Calculator elsewhere on this
  // site for "extra income stacked on top of a base" scenarios.
  const annualizedProfit = thisQuarterNetProfit * 4;
  const seNetEarnings = annualizedProfit * SE_NET_EARNINGS_FACTOR;
  const quarterSeNetEarnings = seNetEarnings / 4;

  const annualSocialSecurityBase = Math.max(0, SOCIAL_SECURITY_WAGE_BASE_2026 - otherAnnualIncome);
  const seSocialSecurity = Math.min(seNetEarnings, annualSocialSecurityBase) * SELF_EMPLOYED_SOCIAL_SECURITY_RATE;
  const seMedicare = seNetEarnings * SELF_EMPLOYED_MEDICARE_RATE;
  const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD_2026[filingStatus];
  const seAdditionalMedicare =
    Math.max(0, otherAnnualIncome + seNetEarnings - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE;
  const annualSelfEmploymentTax = seSocialSecurity + seMedicare + seAdditionalMedicare;
  const quarterlySelfEmploymentTax = annualSelfEmploymentTax / 4;

  const deductibleHalfSeTax = (seSocialSecurity + seMedicare) / 2;
  const floor = otherTaxableIncome(otherAnnualIncome, filingStatus);
  const annualIncomeTaxOnProfit = stackedTax(
    floor,
    Math.max(0, annualizedProfit - deductibleHalfSeTax),
    ordinaryBracketsFor(filingStatus)
  );
  const quarterlyIncomeTax = annualIncomeTaxOnProfit / 4;

  const quarterlyPaymentDue = quarterlyIncomeTax + quarterlySelfEmploymentTax;

  return {
    quarterlySelfEmploymentTax,
    quarterlyIncomeTax,
    quarterlyPaymentDue,
    quarterSeNetEarnings,
  };
};

export const ficaPaycheckCustomCalculators: Record<string, CustomCalculator> = {
  "fica-tax-calculator": ficaTaxCalculator,
  "social-security-tax-calculator": socialSecurityTaxCalculator,
  "medicare-tax-calculator": medicareTaxCalculator,
  "additional-medicare-tax-calculator": additionalMedicareTaxCalculator,
  "dividend-tax-calculator": dividendTaxCalculator,
  "tax-withholding-calculator": taxWithholdingCalculator,
  "estimated-tax-calculator": estimatedTaxCalculator,
  "quarterly-tax-calculator": quarterlyTaxCalculator,
};
