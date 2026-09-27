/**
 * US state "Payroll Tax" calculators (canonical 32-item list, item 5) — 15
 * tools under the existing "Tax & Paycheck Calculators" category, third
 * batch of the 50-state audit (see state_tax_audit.xlsx, 27 Sep 2026). This
 * covers genuine state-level payroll PREMIUMS beyond ordinary income tax
 * withholding and SUTA (paid-family-leave, temporary disability, and
 * similar programs): Alaska, California, Colorado, Connecticut, Delaware,
 * Hawaii, Maine, Massachusetts, Minnesota, New Jersey, New York, Oregon,
 * Rhode Island, Vermont, Washington. Maryland's FAMLI program is enacted
 * but not yet collecting (delayed to 1/1/2027 per the audit) — deliberately
 * NOT built here; revisit once it's actually live. The other 34 states have
 * no such program (SUTA alone; see the Unemployment Tax batch instead).
 *
 * Every function returns the EMPLOYEE-paid share (what actually comes out
 * of a paycheck) as its headline figure, since that's what a worker
 * searching for one of these calculators wants — several programs split
 * cost between employer and employee, or are entirely employer-paid; see
 * each function's comment and the matching Tool's Assumptions text for the
 * split assumed and how confident the audit was in it.
 */

import type { CustomCalculator } from "./calc-engine-types";
import { safeNumber } from "./calc-engine-types";

const SS_WAGE_BASE_2026 = 184_500; // shared federal Social Security wage base, reused where a program caps at it

function alaskaPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const AK_UI_WAGE_BASE = 54_200;
  const tax = Math.min(wages, AK_UI_WAGE_BASE) * 0.005;
  return { wageBaseApplied: AK_UI_WAGE_BASE, employeePayrollTax: tax };
}

function californiaPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const tax = wages * 0.013; // CA SDI, no wage cap
  return { employeePayrollTax: tax };
}

function coloradoPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const capped = Math.min(wages, SS_WAGE_BASE_2026);
  const employeeShare = capped * 0.0044;
  const employerShare = capped * 0.0044;
  return { wageBaseApplied: SS_WAGE_BASE_2026, employeePayrollTax: employeeShare, employerShare, totalFamliContribution: employeeShare + employerShare };
}

function connecticutPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const capped = Math.min(wages, SS_WAGE_BASE_2026);
  const tax = capped * 0.005; // CT Paid Leave, employee-paid entirely
  return { wageBaseApplied: SS_WAGE_BASE_2026, employeePayrollTax: tax };
}

function delawarePayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const tax = wages * 0.004; // DE Paid Leave employee share; wage-cap status unconfirmed, modeled uncapped
  return { employeePayrollTax: tax };
}

function hawaiiPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const tax = wages * 0.005; // HI TDI employee share, likely an overestimate — see assumptions (weekly cap not modeled)
  return { employeePayrollTax: tax };
}

function mainePayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const employerSize = safeNumber(values.employerSize); // 0 = fewer than 15 staff, 1 = 15+ staff
  const tax = employerSize === 1 ? wages * 0.005 : 0; // <15 staff: fully employer-paid, employee owes $0
  return { employeePayrollTax: tax };
}

function massachusettsPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const capped = Math.min(wages, SS_WAGE_BASE_2026);
  const tax = capped * 0.0044; // rough average employee-side share of the 0.88% PFML program — see assumptions
  return { wageBaseApplied: SS_WAGE_BASE_2026, employeePayrollTax: tax };
}

function minnesotaPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const employerSize = safeNumber(values.employerSize); // 0 = 30 or fewer staff (reduced rate), 1 = more than 30
  const capped = Math.min(wages, SS_WAGE_BASE_2026);
  const rate = employerSize === 1 ? 0.0044 : 0.0033;
  const tax = capped * rate;
  return { wageBaseApplied: SS_WAGE_BASE_2026, employeePayrollTax: tax };
}

function newJerseyPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const NJ_WAGE_BASE = 171_100;
  const capped = Math.min(wages, NJ_WAGE_BASE);
  const tdi = capped * 0.0019;
  const fli = capped * 0.0023;
  return { wageBaseApplied: NJ_WAGE_BASE, tdiContribution: tdi, fliContribution: fli, employeePayrollTax: tdi + fli };
}

function newYorkPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const PFL_CAP = 411.91;
  const pfl = Math.min(wages * 0.00432, PFL_CAP);
  return { employeePayrollTax: pfl, annualCapApplied: PFL_CAP };
}

function oregonPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const tax = wages * 0.001; // Statewide Transit Tax, uncapped
  return { employeePayrollTax: tax };
}

function rhodeIslandPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const RI_WAGE_BASE = 100_000;
  const tax = Math.min(wages, RI_WAGE_BASE) * 0.011;
  return { wageBaseApplied: RI_WAGE_BASE, employeePayrollTax: tax };
}

function vermontPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const workerType = safeNumber(values.workerType); // 0 = employee, 1 = self-employed
  if (workerType === 1) {
    return { employeePayrollTax: wages * 0.0011 };
  }
  const passThroughPercent = Math.min(25, Math.max(0, safeNumber(values.employerPassThroughPercent)));
  const tax = wages * 0.0044 * (passThroughPercent / 100);
  return { employeePayrollTax: tax };
}

function washingtonPayrollTaxCalculator(values: Record<string, number>) {
  const wages = Math.max(0, safeNumber(values.annualWages));
  const cappedForPfml = Math.min(wages, SS_WAGE_BASE_2026);
  const pfmlEmployeeShare = cappedForPfml * 0.0113 * 0.7143;
  const waCares = wages * 0.0058; // no wage cap, 100% employee-paid
  return {
    wageBaseApplied: SS_WAGE_BASE_2026,
    pfmlEmployeeContribution: pfmlEmployeeShare,
    waCaresContribution: waCares,
    employeePayrollTax: pfmlEmployeeShare + waCares,
  };
}

export const usPayrollTaxExtendedCustomCalculators: Record<string, CustomCalculator> = {
  "alaska-payroll-tax-calculator": alaskaPayrollTaxCalculator,
  "california-payroll-tax-calculator": californiaPayrollTaxCalculator,
  "colorado-payroll-tax-calculator": coloradoPayrollTaxCalculator,
  "connecticut-payroll-tax-calculator": connecticutPayrollTaxCalculator,
  "delaware-payroll-tax-calculator": delawarePayrollTaxCalculator,
  "hawaii-payroll-tax-calculator": hawaiiPayrollTaxCalculator,
  "maine-payroll-tax-calculator": mainePayrollTaxCalculator,
  "massachusetts-payroll-tax-calculator": massachusettsPayrollTaxCalculator,
  "minnesota-payroll-tax-calculator": minnesotaPayrollTaxCalculator,
  "new-jersey-payroll-tax-calculator": newJerseyPayrollTaxCalculator,
  "new-york-payroll-tax-calculator": newYorkPayrollTaxCalculator,
  "oregon-payroll-tax-calculator": oregonPayrollTaxCalculator,
  "rhode-island-payroll-tax-calculator": rhodeIslandPayrollTaxCalculator,
  "vermont-payroll-tax-calculator": vermontPayrollTaxCalculator,
  "washington-payroll-tax-calculator": washingtonPayrollTaxCalculator,
};
