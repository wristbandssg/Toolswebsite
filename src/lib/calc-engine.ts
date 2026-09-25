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
