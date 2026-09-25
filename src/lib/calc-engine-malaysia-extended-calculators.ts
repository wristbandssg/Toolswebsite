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

// Resident individual tax bands — YA 2025 (same table as
// calc-engine-malaysia.ts, duplicated per this project's one-file-per-batch
// convention), used here by the PCB and Rental Income Tax calculators.
const MY_BRACKETS_2025: TaxBand[] = [
  { rate: 0, upTo: 5000 },
  { rate: 0.01, upTo: 20000 },
  { rate: 0.03, upTo: 35000 },
  { rate: 0.06, upTo: 50000 },
  { rate: 0.11, upTo: 70000 },
  { rate: 0.19, upTo: 100000 },
  { rate: 0.25, upTo: 400000 },
  { rate: 0.26, upTo: 600000 },
  { rate: 0.28, upTo: 2000000 },
  { rate: 0.3, upTo: Infinity },
];
const INDIVIDUAL_RELIEF_2025 = 9000;
const EPF_RELIEF_CAP_2025 = 7000;

// EPF/KWSP.
const EPF_WAGE_TIER_2026 = 5000;

// SOCSO/EIS — shared wage ceiling, effective 1 October 2024.
const SOCSO_EIS_WAGE_CEILING_2026 = 6000;
const SOCSO_CAT1_EMPLOYER_RATE = 0.0175;
const SOCSO_CAT1_EMPLOYEE_RATE = 0.005;
const SOCSO_CAT2_EMPLOYER_RATE = 0.0125;
const EIS_RATE = 0.002; // each side

// SST.
const SALES_TAX_RATES = { exempt: 0, five: 0.05, ten: 0.1 };
const SERVICE_TAX_RATES = { standard: 0.08, reduced: 0.06 };

// RPGT — citizen/PR schedule effective 1 Jan 2022; non-citizen/company
// schedule effective 1 Jan 2019.
const RPGT_CITIZEN_RATES = [0.3, 0.3, 0.3, 0.2, 0.15, 0]; // years 1,2,3,4,5,6+
const RPGT_NONCITIZEN_RATES = [0.3, 0.3, 0.3, 0.3, 0.3, 0.1];
const RPGT_EXEMPTION_FLAT = 10000;
const RPGT_EXEMPTION_PERCENT = 0.1;

// Stamp Duty — MOT ad valorem tiers.
function motStampDuty(value: number): number {
  let duty = 0;
  let floor = 0;
  const tiers: TaxBand[] = [
    { rate: 0.01, upTo: 100000 },
    { rate: 0.02, upTo: 500000 },
    { rate: 0.03, upTo: 1000000 },
    { rate: 0.04, upTo: Infinity },
  ];
  for (const tier of tiers) {
    if (value <= floor) break;
    const amountInTier = Math.min(value, tier.upTo) - floor;
    if (amountInTier > 0) duty += amountInTier * tier.rate;
    floor = tier.upTo;
    if (value <= tier.upTo) break;
  }
  return duty;
}
const LOAN_STAMP_DUTY_RATE = 0.005;
const FIRST_TIME_BUYER_EXEMPTION_CAP_2026 = 500000;

// Dividend Tax — new 2% tax, YA2025 onward.
const DIVIDEND_TAX_THRESHOLD_2026 = 100000;
const DIVIDEND_TAX_RATE_2026 = 0.02;

// ---------------------------------------------------------------------------
// 1. Malaysia EPF Calculator
// ---------------------------------------------------------------------------

const malaysiaEpfCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlyWage = Math.max(0, safeNumber(values.monthlyWage));
  const employeeCategory = safeNumber(values.employeeCategory); // 0=citizen/PR-or-pre1998, 1=nonMY-post1998
  const isAge60Plus = safeNumber(values.isAge60Plus) === 1;

  let employeeRate: number;
  let employerRate: number;

  if (employeeCategory === 1) {
    // Non-Malaysian registered on/after 1 Aug 1998 — flat 2%/2%, mandatory
    // from 1 October 2025, regardless of age.
    employeeRate = 0.02;
    employerRate = 0.02;
  } else if (isAge60Plus) {
    // Citizens, PRs, and non-Malaysians registered before 1 Aug 1998, 60+.
    // This tool treats citizens and PR/pre-1998 foreign workers together
    // using the citizen 60+ rates (0% employee / 4% employer) as the
    // common case — PR/pre-1998 foreign workers technically get a slightly
    // different 5.5%/6.5%-or-6% schedule; use the Assumptions text's note
    // if that applies to you.
    employeeRate = 0;
    employerRate = 0.04;
  } else {
    employeeRate = 0.11;
    employerRate = monthlyWage <= EPF_WAGE_TIER_2026 ? 0.13 : 0.12;
  }

  const employeeContribution = monthlyWage * employeeRate;
  const employerContribution = monthlyWage * employerRate;
  const totalContribution = employeeContribution + employerContribution;

  // Informational account split (effective 11 May 2024 restructuring).
  const akaunPersaraan = totalContribution * 0.75;
  const akaunSejahtera = totalContribution * 0.15;
  const akaunFleksibel = totalContribution * 0.1;

  return {
    employeeContribution,
    employerContribution,
    totalContribution,
    akaunPersaraan,
    akaunSejahtera,
    akaunFleksibel,
  };
};

// ---------------------------------------------------------------------------
// 2. Malaysia SOCSO Calculator
// ---------------------------------------------------------------------------

const malaysiaSocsoCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlyWage = Math.max(0, safeNumber(values.monthlyWage));
  const isAge60Plus = safeNumber(values.isAge60Plus) === 1;

  const cappedWage = Math.min(monthlyWage, SOCSO_EIS_WAGE_CEILING_2026);

  const employeeContribution = isAge60Plus ? 0 : cappedWage * SOCSO_CAT1_EMPLOYEE_RATE;
  const employerContribution = isAge60Plus
    ? cappedWage * SOCSO_CAT2_EMPLOYER_RATE
    : cappedWage * SOCSO_CAT1_EMPLOYER_RATE;
  const totalContribution = employeeContribution + employerContribution;

  return { employeeContribution, employerContribution, totalContribution };
};

// ---------------------------------------------------------------------------
// 3. Malaysia EIS Calculator
// ---------------------------------------------------------------------------

const malaysiaEisCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlyWage = Math.max(0, safeNumber(values.monthlyWage));

  const cappedWage = Math.min(monthlyWage, SOCSO_EIS_WAGE_CEILING_2026);
  const employeeContribution = cappedWage * EIS_RATE;
  const employerContribution = cappedWage * EIS_RATE;
  const totalContribution = employeeContribution + employerContribution;

  return { employeeContribution, employerContribution, totalContribution };
};

// ---------------------------------------------------------------------------
// 4. Malaysia PCB (Monthly Tax Deduction) Calculator
// ---------------------------------------------------------------------------

const malaysiaPcbCalculator: CustomCalculator = (values: CalcInputValues) => {
  const monthlyGrossPay = Math.max(0, safeNumber(values.monthlyGrossPay));
  const monthlyEpfContribution = Math.max(0, safeNumber(values.monthlyEpfContribution));

  const annualGrossPay = monthlyGrossPay * 12;
  const annualEpf = monthlyEpfContribution * 12;
  const epfRelief = Math.min(annualEpf, EPF_RELIEF_CAP_2025);

  const annualChargeableIncome = Math.max(0, annualGrossPay - INDIVIDUAL_RELIEF_2025 - epfRelief);
  const estimatedAnnualTax = progressiveTax(annualChargeableIncome, MY_BRACKETS_2025);
  const estimatedMonthlyPcb = estimatedAnnualTax / 12;

  const netMonthlyPay = monthlyGrossPay - monthlyEpfContribution - estimatedMonthlyPcb;

  return {
    estimatedMonthlyPcb,
    estimatedAnnualTax,
    netMonthlyPay,
  };
};

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
// 6. Malaysia Capital Gains Tax Calculator (honest explainer — individuals excluded)
// ---------------------------------------------------------------------------

const malaysiaCapitalGainsTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const gainAmount = Math.max(0, safeNumber(values.gainAmount));
  const isCompanyOrLlp = safeNumber(values.isCompanyOrLlp) === 1;
  const acquiredBefore2024 = safeNumber(values.acquiredBefore2024) === 1;
  const electGrossBasis = safeNumber(values.electGrossBasis) === 1;
  const grossDisposalPrice = Math.max(0, safeNumber(values.grossDisposalPrice));

  if (!isCompanyOrLlp) {
    // Individuals are entirely outside Malaysia's CGT regime.
    return { taxableGain: 0, taxOnGain: 0, netGain: gainAmount, isSubjectToCgt: 0 };
  }

  let taxOnGain: number;
  if (acquiredBefore2024 && electGrossBasis) {
    taxOnGain = grossDisposalPrice * 0.02;
  } else {
    taxOnGain = gainAmount * 0.1;
  }

  return { taxableGain: gainAmount, taxOnGain, netGain: gainAmount - taxOnGain, isSubjectToCgt: 1 };
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

// ---------------------------------------------------------------------------
// 8. Malaysia Stamp Duty Calculator
// ---------------------------------------------------------------------------

const malaysiaStampDutyCalculator: CustomCalculator = (values: CalcInputValues) => {
  const propertyValue = Math.max(0, safeNumber(values.propertyValue));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const isFirstTimeBuyer = safeNumber(values.isFirstTimeBuyer) === 1;

  const isExempt = isFirstTimeBuyer && propertyValue <= FIRST_TIME_BUYER_EXEMPTION_CAP_2026;

  const motDuty = isExempt ? 0 : motStampDuty(propertyValue);
  const loanDuty = isExempt ? 0 : loanAmount * LOAN_STAMP_DUTY_RATE;
  const totalStampDuty = motDuty + loanDuty;

  return { motDuty, loanDuty, totalStampDuty, isExempt: isExempt ? 1 : 0 };
};

// ---------------------------------------------------------------------------
// 9. Malaysia Rental Income Tax Calculator
// ---------------------------------------------------------------------------

const malaysiaRentalIncomeTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const annualGrossRent = Math.max(0, safeNumber(values.annualGrossRent));
  const mortgageInterest = Math.max(0, safeNumber(values.mortgageInterest));
  const quitRentAndAssessment = Math.max(0, safeNumber(values.quitRentAndAssessment));
  const repairs = Math.max(0, safeNumber(values.repairs));
  const agentCommission = Math.max(0, safeNumber(values.agentCommission));
  const otherTaxableIncome = Math.max(0, safeNumber(values.otherTaxableIncome));

  const allowableDeductions = mortgageInterest + quitRentAndAssessment + repairs + agentCommission;
  const netRentalIncome = Math.max(0, annualGrossRent - allowableDeductions);

  const chargeableIncomeWithRental = Math.max(
    0,
    otherTaxableIncome + netRentalIncome - INDIVIDUAL_RELIEF_2025
  );
  const chargeableIncomeWithoutRental = Math.max(0, otherTaxableIncome - INDIVIDUAL_RELIEF_2025);

  const taxWithRental = progressiveTax(chargeableIncomeWithRental, MY_BRACKETS_2025);
  const taxWithoutRental = progressiveTax(chargeableIncomeWithoutRental, MY_BRACKETS_2025);
  const taxAttributableToRental = Math.max(0, taxWithRental - taxWithoutRental);

  return {
    netRentalIncome,
    allowableDeductions,
    taxAttributableToRental,
  };
};

// ---------------------------------------------------------------------------
// 10. Malaysia Dividend Tax Calculator
// ---------------------------------------------------------------------------

const malaysiaDividendTaxCalculator: CustomCalculator = (values: CalcInputValues) => {
  const dividendAmount = Math.max(0, safeNumber(values.dividendAmount));
  const isExemptSource = safeNumber(values.isExemptSource) === 1;

  if (isExemptSource) {
    return { taxableDividend: 0, taxOnDividend: 0, netDividend: dividendAmount };
  }

  const taxableDividend = Math.max(0, dividendAmount - DIVIDEND_TAX_THRESHOLD_2026);
  const taxOnDividend = taxableDividend * DIVIDEND_TAX_RATE_2026;
  const netDividend = dividendAmount - taxOnDividend;

  return { taxableDividend, taxOnDividend, netDividend };
};

export const malaysiaExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "malaysia-epf-calculator": malaysiaEpfCalculator,
  "malaysia-socso-calculator": malaysiaSocsoCalculator,
  "malaysia-eis-calculator": malaysiaEisCalculator,
  "malaysia-pcb-calculator": malaysiaPcbCalculator,
  "malaysia-sst-calculator": malaysiaSstCalculator,
  "malaysia-capital-gains-tax-calculator": malaysiaCapitalGainsTaxCalculator,
  "malaysia-real-property-gains-tax-calculator": malaysiaRpgtCalculator,
  "malaysia-stamp-duty-calculator": malaysiaStampDutyCalculator,
  "malaysia-rental-income-tax-calculator": malaysiaRentalIncomeTaxCalculator,
  "malaysia-dividend-tax-calculator": malaysiaDividendTaxCalculator,
};
