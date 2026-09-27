/**
 * Calculation Logic engine (see plan doc, Section 7: Calculator Tool Builder).
 *
 * This file is intentionally thin: it re-exports the shared types every
 * other file in the app imports from "@/lib/calc-engine" (unchanged, so
 * nothing outside this directory needs to change), merges every country's
 * `xxCustomCalculators` map into the single `customCalculators` registry
 * `runCalculator` looks a tool's slug up in, and hosts `runCalculator`
 * itself (country-agnostic — it doesn't know or care which country a
 * "custom" tool's slug belongs to).
 *
 * The actual tax logic lives one file per country:
 *  - calc-engine-us.ts — US federal + all 50 states (see that file's header)
 *  - calc-engine-uk.ts — UK income tax (rest of UK + Scotland)
 *  - calc-engine-canada.ts — Canada federal + all 10 provinces + 3 territories
 *  - calc-engine-india.ts — India, New Regime vs Old Regime (one national tool)
 *  - calc-engine-australia.ts — Australia, one national tool (no state income tax)
 *  - calc-engine-southafrica.ts — South Africa, one national tool (no provincial income tax)
 *  - calc-engine-pakistan.ts — Pakistan, one national tool (no provincial income tax)
 *  - calc-engine-hongkong.ts — Hong Kong, progressive vs. standard rate (lower wins)
 *  - calc-engine-malaysia.ts — Malaysia, one national tool (no state income tax)
 *  - calc-engine-philippines.ts — Philippines, one national tool (no province income tax)
 *  - calc-engine-newzealand.ts — New Zealand, one national tool (no state income tax)
 *  - calc-engine-singapore.ts — Singapore, one national tool (no state income tax)
 *  - calc-engine-us-tax-salary-calculators.ts — 30 US-federal-only "Tax
 *    Calculators" SEO variants (income tax + salary/paycheck families),
 *    filed directly under the Tax Calculators category as a
 *    national-baseline complement to calc-engine-us.ts's 50 state tools
 *  - calc-engine-capital-gains-sales-vat-calculators.ts — 32 more "Tax
 *    Calculators" tools (Capital Gains Tax, Sales Tax, VAT families), also
 *    filed directly under the Tax Calculators category
 *  - calc-engine-property-tax-self-employment-calculators.ts — 24 more
 *    "Tax Calculators" tools (Property Tax, Self-Employment Tax families),
 *    also filed directly under the Tax Calculators category
 *  - calc-engine-fica-paycheck-calculators.ts — 8 tools under the new
 *    "Tax & Paycheck Calculators" category (FICA breakdown, Dividend Tax,
 *    Estimated/Quarterly/Withholding planning)
 *  - calc-engine-uk-tax-paycheck-calculators.ts — 15 more UK tools under
 *    the existing "UK Tax & Salary Calculators" category (National
 *    Insurance, PAYE, Dividend/CGT/IHT/VAT/Stamp Duty, Self Employed/
 *    Freelance/Rental/Pension/Bonus/Overtime)
 *  - calc-engine-canada-extended-calculators.ts — 15 more Canada tools
 *    under the existing "Canada Tax & Salary Calculators" category (CPP,
 *    EI, Payroll Tax, Capital Gains/Dividend/Rental income tax — federal
 *    only, GST/HST/PST, Property Transfer Tax, Refund/Owing, Pension/
 *    Severance withholding)
 *  - calc-engine-australia-extended-calculators.ts — 15 more Australia
 *    tools under the existing "Australia Tax & Salary Calculators"
 *    category (Medicare Levy/Surcharge, GST, Capital Gains, Super/
 *    Division 293, PAYG, Payroll Tax (NSW), Dividend/Franking, Rental,
 *    Self-Employment/Contractor, FBT, HELP/HECS repayment, Working
 *    Holiday Maker tax)
 *  - calc-engine-newzealand-extended-calculators.ts — 10 more New Zealand
 *    tools under the existing "New Zealand Tax & Salary Calculators"
 *    category (PAYE secondary income, GST, ACC Levy, Self-Employed/
 *    Contractor tax, Rental, Dividend imputation, bright-line Capital
 *    Gains, Employer Payroll Obligations, KiwiSaver — NZ has no general
 *    CGT or separate payroll tax, both honestly reframed rather than
 *    invented, see that file's header)
 *  - calc-engine-singapore-extended-calculators.ts — 10 more Singapore
 *    tools under the existing "Singapore Tax & Salary Calculators"
 *    category (GST, CPF general + detailed Additional Wage contribution,
 *    Self-Employed MediSave, Corporate Tax, Property Tax, Stamp Duty
 *    (BSD+ABSD), Rental — plus Capital Gains and Dividend Tax honestly
 *    framed around Singapore's real "generally not taxed" rules, see that
 *    file's header)
 *  - calc-engine-india-extended-calculators.ts — 10 more India tools under
 *    the existing "India Tax & Salary Calculators" category (GST 2.0
 *    slabs, TDS, three distinct Capital Gains tools — general classifier,
 *    short-term, and long-term with the pre-23-Jul-2024 property
 *    indexation choice — Dividend Tax, Property Tax and Professional Tax
 *    (Mumbai/Maharashtra representative), Stamp Duty (Maharashtra
 *    representative), and presumptive-taxation Self Employment)
 *  - calc-engine-hongkong-extended-calculators.ts — 7 more Hong Kong tools
 *    under the existing "Hong Kong Tax & Salary Calculators" category
 *    (Profits Tax, Property Tax, Stamp Duty (AVD), Rental Income Tax
 *    (Property Tax vs Personal Assessment, whichever is lower), Capital
 *    Gains and Dividend Tax honestly framed around Hong Kong's "generally
 *    not taxed" rules, and MPF — an 8th "Salaries Tax" tool was skipped as
 *    a duplicate of the existing hong-kong-income-tax-calculator)
 *  - calc-engine-malaysia-extended-calculators.ts — 10 more Malaysia tools
 *    under the existing "Malaysia Tax & Salary Calculators" category (EPF,
 *    SOCSO, EIS, PCB/Monthly Tax Deduction estimate, SST, Real Property
 *    Gains Tax, Stamp Duty, Rental Income Tax, Dividend Tax (new 2% tax),
 *    and a Capital Gains Tax explainer honestly framed around Malaysia's
 *    CGT regime excluding individuals entirely)
 *  - calc-engine-philippines-extended-calculators.ts — 10 more Philippines
 *    tools under the existing "Philippines Tax & Salary Calculators"
 *    category (VAT, Withholding/EWT, Capital Gains Tax modeling its two
 *    genuinely distinct mechanisms — 6% real property vs 15% unlisted
 *    shares — Estate Tax, Donor's Tax, Percentage Tax, Documentary Stamp
 *    Tax, Real Property Tax (national statutory caps only, LGU rates
 *    vary), Dividend Tax, and Self Employed Tax comparing the 8% flat
 *    option against graduated rates + percentage tax)
 *  - calc-engine-us-estate-inheritance-gift.ts — 18 US state tools under
 *    the existing "Tax & Paycheck Calculators" category, first batch of
 *    the 50-state audit (see state_tax_audit.xlsx, delivered 27 Sep 2026):
 *    Gift Tax (Connecticut, the only US state with one), Inheritance Tax
 *    (Kentucky, Maryland, Nebraska, New Jersey, Pennsylvania), and Estate
 *    Tax (Connecticut, Hawaii, Illinois, Maine, Maryland, Massachusetts,
 *    Minnesota, New York, Oregon, Rhode Island, Vermont, Washington) — see
 *    that file's header for the disclosed graduated-schedule approximation
 *    (`graduatedEstimate`) used throughout, since the audit only confirmed
 *    each schedule's low/high rate, not every bracket edge
 *  - calc-engine-us-capital-gains-extended.ts — 6 US state Capital Gains
 *    Tax tools, second batch of the 50-state audit: Washington (unique
 *    excise tax), Hawaii (7.25% cap), Massachusetts (short/long-term
 *    split + surtax), Montana (distinct lower brackets), Maryland (new 2%
 *    surcharge above $350k AGI, layered on ordinary tax), and Missouri
 *    (honest $0 tool — first US state ever to repeal individual CGT)
 *  - calc-engine-us-payroll-tax-extended.ts — 15 US state "Payroll Tax"
 *    tools, third batch of the 50-state audit: every state with a genuine
 *    state-level payroll premium beyond ordinary withholding and SUTA
 *    (paid-family-leave/TDI/SDI-style programs) — AK, CA, CO, CT, DE, HI,
 *    ME, MA, MN, NJ, NY, OR, RI, VT, WA. Maryland's FAMLI is enacted but
 *    not yet collecting (delayed to 2027) so deliberately not built yet.
 *  - calc-engine-us-other-business-tax.ts — 16 US state "Business Tax"
 *    tools, fourth batch of the 50-state audit: a SECOND state-level
 *    business levy beyond the corporate tax (franchise/gross-receipts/
 *    net-worth/severance taxes) — AL, AR, CA, DE, GA, IL, KY, MA, MN, MS,
 *    NV, NH, NC, OR, SC, WV
 *  - calc-engine-us-transfer-tax.ts — 29 US state "Real Estate Transfer
 *    Tax" tools (the US equivalent of "stamp duty"), fifth batch of the
 *    50-state audit — every state with a genuine state-level transfer/
 *    conveyance/deed/mansion tax
 *  - calc-engine-us-corporate-tax.ts — 50 US state "Corporate Tax" tools,
 *    sixth batch of the 50-state audit, one per state including the states
 *    with no traditional corporate income tax (Nevada Commerce Tax, Ohio
 *    CAT, Texas Franchise/Margin Tax, Washington B&O — all genuine
 *    gross-receipts/margin substitutes) and the two states with no
 *    state-level business income tax of any kind (South Dakota, Wyoming —
 *    honest $0 tools, the "Missouri capital gains" precedent)
 *  - calc-engine-us-sales-tax.ts — 50 US state "Sales Tax" tools, seventh
 *    batch of the 50-state audit, one per state including the 4 states
 *    with genuinely no state-level general sales tax (Delaware, Montana,
 *    New Hampshire, Oregon — honest $0 tools), Alaska (no state rate but a
 *    real average local rate), and the two states whose closest analog is
 *    a different kind of levy (Hawaii's General Excise Tax, New Mexico's
 *    Gross Receipts Tax) disclosed plainly as such rather than mislabeled
 *  - calc-engine-us-property-tax.ts — 50 US state "Property Tax" tools,
 *    eighth batch of the 50-state audit, one per state, using each state's
 *    published average EFFECTIVE property tax rate (property tax paid as a
 *    % of value) since property tax is overwhelmingly local/county-set in
 *    the US with no single exact state rate — assumptions text discloses
 *    this plainly, with extra notes for the handful of states with a
 *    genuine small state-level component (Kentucky, Maryland, New
 *    Hampshire's SWEPT, Vermont's state-set town rates, Washington's State
 *    School Levy)
 *  - calc-engine-us-suta.ts — 50 US state "Unemployment Tax" (SUTA) tools,
 *    ninth batch of the 50-state audit, one per state: taxable wage base x
 *    new-employer rate, per employee. Colorado/Michigan/Nebraska
 *    (standard vs. construction), Mississippi (rate by employer year),
 *    North Dakota (positive- vs. negative-balance), and Wisconsin (payroll
 *    threshold) use a dropdown for their confirmed 2/3-way rate split; New
 *    Jersey is the only state that also charges SUTA to employees, so its
 *    tool returns a two-line employer/employee breakdown
 *  - calc-engine-us-income-tax-rates.ts — shared state income-tax rate
 *    table (each of the 41 income-tax states' confirmed flat/top marginal
 *    rate) and marginal/effective/total-tax estimator math, used by all 14
 *    files below. Per an explicit user decision (27 Sep 2026), this final
 *    "income-tax-derived family" batch (tenth and last batch of the
 *    50-state audit, 41 states x 14 SEO-angle variants = 574 tools) uses
 *    this SIMPLIFIED REPRESENTATIVE RATE approach rather than refactoring
 *    the existing 4000+ line calc-engine-us.ts to export its exact
 *    bracket tables — every tool built from it discloses this in its
 *    Assumptions text
 *  - calc-engine-us-tax-bracket.ts / -marginal-tax-rate.ts /
 *    -effective-tax-rate.ts / -tax-liability.ts / -tax-refund.ts /
 *    -taxable-income.ts / -tax-withholding.ts / -withholding-tax.ts /
 *    -bonus-tax.ts / -overtime-tax.ts / -commission-tax.ts /
 *    -freelance-tax.ts / -contractor-tax.ts / -estimated-quarterly-tax.ts
 *    — the 14 income-tax-derived family variants (41 tools each, one per
 *    income-tax state), all built on calc-engine-us-income-tax-rates.ts
 * Adding a new country means adding one more calc-engine-<country>.ts file
 * and one more line below merging its map in — no existing country's file
 * is touched.
 *
 * calc-engine-types.ts holds the shared types/helpers (CalcInputField,
 * CustomCalculator, safeNumber, runExpressionCalc, ...) every country file
 * implements against.
 */

export type {
  CalcFieldType,
  CalcInputField,
  CalcResultConfig,
  CalcResultLineConfig,
  CalcInputValues,
  CustomCalculatorResult,
  CustomCalculator,
} from "./calc-engine-types";
export { safeNumber, CalculationError, runExpressionCalc } from "./calc-engine-types";

import type { CalcInputField, CalcInputValues, CustomCalculator, CustomCalculatorResult } from "./calc-engine-types";
import { CalculationError, runExpressionCalc } from "./calc-engine-types";
import { usCustomCalculators } from "./calc-engine-us";
import { ukCustomCalculators } from "./calc-engine-uk";
import { canadaCustomCalculators } from "./calc-engine-canada";
import { indiaCustomCalculators } from "./calc-engine-india";
import { australiaCustomCalculators } from "./calc-engine-australia";
import { southAfricaCustomCalculators } from "./calc-engine-southafrica";
import { pakistanCustomCalculators } from "./calc-engine-pakistan";
import { hongKongCustomCalculators } from "./calc-engine-hongkong";
import { malaysiaCustomCalculators } from "./calc-engine-malaysia";
import { philippinesCustomCalculators } from "./calc-engine-philippines";
import { newZealandCustomCalculators } from "./calc-engine-newzealand";
import { singaporeCustomCalculators } from "./calc-engine-singapore";
import { usTaxSalaryCustomCalculators } from "./calc-engine-us-tax-salary-calculators";
import { capitalGainsSalesVatCustomCalculators } from "./calc-engine-capital-gains-sales-vat-calculators";
import { propertyTaxSelfEmploymentCustomCalculators } from "./calc-engine-property-tax-self-employment-calculators";
import { ficaPaycheckCustomCalculators } from "./calc-engine-fica-paycheck-calculators";
import { ukExtendedCustomCalculators } from "./calc-engine-uk-tax-paycheck-calculators";
import { canadaExtendedCustomCalculators } from "./calc-engine-canada-extended-calculators";
import { australiaExtendedCustomCalculators } from "./calc-engine-australia-extended-calculators";
import { newZealandExtendedCustomCalculators } from "./calc-engine-newzealand-extended-calculators";
import { singaporeExtendedCustomCalculators } from "./calc-engine-singapore-extended-calculators";
import { indiaExtendedCustomCalculators } from "./calc-engine-india-extended-calculators";
import { hongKongExtendedCustomCalculators } from "./calc-engine-hongkong-extended-calculators";
import { malaysiaExtendedCustomCalculators } from "./calc-engine-malaysia-extended-calculators";
import { philippinesExtendedCustomCalculators } from "./calc-engine-philippines-extended-calculators";
import { usEstateInheritanceGiftCustomCalculators } from "./calc-engine-us-estate-inheritance-gift";
import { usCapitalGainsExtendedCustomCalculators } from "./calc-engine-us-capital-gains-extended";
import { usPayrollTaxExtendedCustomCalculators } from "./calc-engine-us-payroll-tax-extended";
import { usOtherBusinessTaxCustomCalculators } from "./calc-engine-us-other-business-tax";
import { usTransferTaxCustomCalculators } from "./calc-engine-us-transfer-tax";
import { usCorporateTaxCustomCalculators } from "./calc-engine-us-corporate-tax";
import { usSalesTaxCustomCalculators } from "./calc-engine-us-sales-tax";
import { usPropertyTaxCustomCalculators } from "./calc-engine-us-property-tax";
import { usSutaCustomCalculators } from "./calc-engine-us-suta";
import { usTaxBracketCustomCalculators } from "./calc-engine-us-tax-bracket";
import { usMarginalTaxRateCustomCalculators } from "./calc-engine-us-marginal-tax-rate";
import { usEffectiveTaxRateCustomCalculators } from "./calc-engine-us-effective-tax-rate";
import { usTaxLiabilityCustomCalculators } from "./calc-engine-us-tax-liability";
import { usTaxRefundCustomCalculators } from "./calc-engine-us-tax-refund";
import { usTaxableIncomeCustomCalculators } from "./calc-engine-us-taxable-income";
import { usTaxWithholdingCustomCalculators } from "./calc-engine-us-tax-withholding";
import { usWithholdingTaxCustomCalculators } from "./calc-engine-us-withholding-tax";
import { usBonusTaxCustomCalculators } from "./calc-engine-us-bonus-tax";
import { usOvertimeTaxCustomCalculators } from "./calc-engine-us-overtime-tax";
import { usCommissionTaxCustomCalculators } from "./calc-engine-us-commission-tax";
import { usFreelanceTaxCustomCalculators } from "./calc-engine-us-freelance-tax";
import { usContractorTaxCustomCalculators } from "./calc-engine-us-contractor-tax";
import { usEstimatedQuarterlyTaxCustomCalculators } from "./calc-engine-us-estimated-quarterly-tax";

// --- Finance_Calculators_Topical_SEO_Master.xlsx batches (general/global,
// not jurisdiction-specific) — filed under the pre-existing "Finance
// Calculators" category tree (see reparent-tool-categories-under-finance.ts
// for that tree). The Tax cluster from that same file was skipped: all 7 of
// its tools were already built under "Tax Calculators". ---
import { financeCreditDebtCustomCalculators } from "./calc-engine-finance-credit-debt";
import { financeSalaryIncomeCustomCalculators } from "./calc-engine-finance-salary-income";
import { financeBusinessCustomCalculators } from "./calc-engine-finance-business";
import { financeRealEstateCustomCalculators } from "./calc-engine-finance-real-estate";
import { financeCurrencyCustomCalculators } from "./calc-engine-finance-currency";
import { financeInvestmentCustomCalculators } from "./calc-engine-finance-investment";
import { financeRetirementCustomCalculators } from "./calc-engine-finance-retirement";
import { financeSavingsCustomCalculators } from "./calc-engine-finance-savings";
import { mortgageCoreCustomCalculators } from "./calc-engine-mortgage-core";
import { mortgagePaymentStrategiesCustomCalculators } from "./calc-engine-mortgage-payment-strategies";
import { mortgageRefinanceProgramsCustomCalculators } from "./calc-engine-mortgage-refinance-programs";

// Merged in country order (US first, since it was here first) — a slug is
// unique across every country's map (US states use bare state names like
// "alabama-tax-calculator"; every other country uses a country/region
// prefix like "uk-income-tax-calculator", "scotland-income-tax-calculator",
// "ontario-income-tax-calculator", "india-income-tax-calculator",
// "australia-income-tax-calculator", "south-africa-income-tax-calculator",
// "pakistan-income-tax-calculator", "hong-kong-income-tax-calculator",
// "malaysia-income-tax-calculator", "philippines-income-tax-calculator",
// "new-zealand-income-tax-calculator", "singapore-income-tax-calculator" —
// see each country file's header for its own slug convention), so a plain
// spread merge is safe: no two countries' keys collide.
export const customCalculators: Record<string, CustomCalculator> = {
  ...usCustomCalculators,
  ...ukCustomCalculators,
  ...canadaCustomCalculators,
  ...indiaCustomCalculators,
  ...australiaCustomCalculators,
  ...southAfricaCustomCalculators,
  ...pakistanCustomCalculators,
  ...hongKongCustomCalculators,
  ...malaysiaCustomCalculators,
  ...philippinesCustomCalculators,
  ...newZealandCustomCalculators,
  ...singaporeCustomCalculators,
  ...usTaxSalaryCustomCalculators,
  ...capitalGainsSalesVatCustomCalculators,
  ...propertyTaxSelfEmploymentCustomCalculators,
  ...ficaPaycheckCustomCalculators,
  ...ukExtendedCustomCalculators,
  ...canadaExtendedCustomCalculators,
  ...australiaExtendedCustomCalculators,
  ...newZealandExtendedCustomCalculators,
  ...singaporeExtendedCustomCalculators,
  ...indiaExtendedCustomCalculators,
  ...hongKongExtendedCustomCalculators,
  ...malaysiaExtendedCustomCalculators,
  ...philippinesExtendedCustomCalculators,
  ...usEstateInheritanceGiftCustomCalculators,
  ...usCapitalGainsExtendedCustomCalculators,
  ...usPayrollTaxExtendedCustomCalculators,
  ...usOtherBusinessTaxCustomCalculators,
  ...usTransferTaxCustomCalculators,
  ...usCorporateTaxCustomCalculators,
  ...usSalesTaxCustomCalculators,
  ...usPropertyTaxCustomCalculators,
  ...usSutaCustomCalculators,
  ...usTaxBracketCustomCalculators,
  ...usMarginalTaxRateCustomCalculators,
  ...usEffectiveTaxRateCustomCalculators,
  ...usTaxLiabilityCustomCalculators,
  ...usTaxRefundCustomCalculators,
  ...usTaxableIncomeCustomCalculators,
  ...usTaxWithholdingCustomCalculators,
  ...usWithholdingTaxCustomCalculators,
  ...usBonusTaxCustomCalculators,
  ...usOvertimeTaxCustomCalculators,
  ...usCommissionTaxCustomCalculators,
  ...usFreelanceTaxCustomCalculators,
  ...usContractorTaxCustomCalculators,
  ...usEstimatedQuarterlyTaxCustomCalculators,
  ...financeCreditDebtCustomCalculators,
  ...financeSalaryIncomeCustomCalculators,
  ...financeBusinessCustomCalculators,
  ...financeRealEstateCustomCalculators,
  ...financeCurrencyCustomCalculators,
  ...financeInvestmentCustomCalculators,
  ...financeRetirementCustomCalculators,
  ...financeSavingsCustomCalculators,
  ...mortgageCoreCustomCalculators,
  ...mortgagePaymentStrategiesCustomCalculators,
  ...mortgageRefinanceProgramsCustomCalculators,
};

export function runCalculator(
  calcType: "expression" | "custom",
  toolSlug: string,
  formula: string | null,
  fields: CalcInputField[],
  values: CalcInputValues
): CustomCalculatorResult {
  if (calcType === "custom") {
    const fn = customCalculators[toolSlug];
    if (!fn) {
      throw new CalculationError(
        `No custom calculator has been registered for "${toolSlug}".`
      );
    }
    return fn(values);
  }
  if (!formula) {
    throw new CalculationError("No formula has been set for this tool yet.");
  }
  return runExpressionCalc(formula, fields, values);
}
