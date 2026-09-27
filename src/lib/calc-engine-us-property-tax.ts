/**
 * calc-engine-us-property-tax.ts — US state Property Tax calculators
 * (Batch 8 of the state-tax-audit build-out, 50 tools — one per state).
 *
 * Property tax is overwhelmingly a LOCAL tax in the US — assessed and
 * billed by counties, cities, and school districts rather than the state
 * itself — so there is no single exact "state" rate the way there is for
 * income or sales tax. Every tool here uses the state_tax_audit.xlsx's
 * published statewide AVERAGE EFFECTIVE rate (annual property tax paid as
 * a percentage of the property's value) as a reasonable estimator, and
 * discloses plainly that actual rates vary by county/municipality/school
 * district — this is not a substitute for a specific parcel's assessed
 * value and local mill rate.
 *
 * A handful of states have a genuine (if small) STATE-level property tax
 * component layered on top of the local system, per the audit's own
 * research: Kentucky (a small state-level rate per $100, cut annually),
 * Maryland (a small state-level rate per $100), New Hampshire (the
 * Statewide Education Property Tax, "SWEPT"), Vermont (the state sets
 * homestead/non-homestead education tax rates per town, billed locally),
 * and Washington (the State School Levy, a state-set rate collected via
 * counties). Those tools' Assumptions text calls this out specifically;
 * all of them are still folded into the single published average effective
 * rate rather than broken out as a separate line item, since the audit's
 * average already reflects the combined local + state burden.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";

function propertyTaxCalculator(avgEffectiveRate: number): CustomCalculator {
  return (values) => {
    const propertyValue = Math.max(0, safeNumber(values.propertyValue));
    return propertyValue * avgEffectiveRate;
  };
}

const alabamaPropertyTaxCalculator = propertyTaxCalculator(0.0038);
const alaskaPropertyTaxCalculator = propertyTaxCalculator(0.0114);
const arizonaPropertyTaxCalculator = propertyTaxCalculator(0.0052);
const arkansasPropertyTaxCalculator = propertyTaxCalculator(0.0057);
const californiaPropertyTaxCalculator = propertyTaxCalculator(0.0071);
const coloradoPropertyTaxCalculator = propertyTaxCalculator(0.0049);
const connecticutPropertyTaxCalculator = propertyTaxCalculator(0.0192);
const delawarePropertyTaxCalculator = propertyTaxCalculator(0.0053);
const floridaPropertyTaxCalculator = propertyTaxCalculator(0.0079);
const georgiaPropertyTaxCalculator = propertyTaxCalculator(0.0081);
const hawaiiPropertyTaxCalculator = propertyTaxCalculator(0.0027);
const idahoPropertyTaxCalculator = propertyTaxCalculator(0.0053);
const illinoisPropertyTaxCalculator = propertyTaxCalculator(0.0207);
const indianaPropertyTaxCalculator = propertyTaxCalculator(0.0074);
const iowaPropertyTaxCalculator = propertyTaxCalculator(0.0143);
const kansasPropertyTaxCalculator = propertyTaxCalculator(0.013);
const kentuckyPropertyTaxCalculator = propertyTaxCalculator(0.00785);
const louisianaPropertyTaxCalculator = propertyTaxCalculator(0.0055);
const mainePropertyTaxCalculator = propertyTaxCalculator(0.011);
const marylandPropertyTaxCalculator = propertyTaxCalculator(0.01);
const massachusettsPropertyTaxCalculator = propertyTaxCalculator(0.01);
const michiganPropertyTaxCalculator = propertyTaxCalculator(0.0125);
const minnesotaPropertyTaxCalculator = propertyTaxCalculator(0.0103);
const mississippiPropertyTaxCalculator = propertyTaxCalculator(0.007);
const missouriPropertyTaxCalculator = propertyTaxCalculator(0.0089);
const montanaPropertyTaxCalculator = propertyTaxCalculator(0.0061);
const nebraskaPropertyTaxCalculator = propertyTaxCalculator(0.0144);
const nevadaPropertyTaxCalculator = propertyTaxCalculator(0.005);
const newHampshirePropertyTaxCalculator = propertyTaxCalculator(0.015);
const newJerseyPropertyTaxCalculator = propertyTaxCalculator(0.0188);
const newMexicoPropertyTaxCalculator = propertyTaxCalculator(0.0063);
const newYorkPropertyTaxCalculator = propertyTaxCalculator(0.013);
const northCarolinaPropertyTaxCalculator = propertyTaxCalculator(0.0066);
const northDakotaPropertyTaxCalculator = propertyTaxCalculator(0.0092);
const ohioPropertyTaxCalculator = propertyTaxCalculator(0.0136);
const oklahomaPropertyTaxCalculator = propertyTaxCalculator(0.0079);
const oregonPropertyTaxCalculator = propertyTaxCalculator(0.0081);
const pennsylvaniaPropertyTaxCalculator = propertyTaxCalculator(0.0126);
const rhodeIslandPropertyTaxCalculator = propertyTaxCalculator(0.0119);
const southCarolinaPropertyTaxCalculator = propertyTaxCalculator(0.0049);
const southDakotaPropertyTaxCalculator = propertyTaxCalculator(0.0109);
const tennesseePropertyTaxCalculator = propertyTaxCalculator(0.0055);
const texasPropertyTaxCalculator = propertyTaxCalculator(0.0158);
const utahPropertyTaxCalculator = propertyTaxCalculator(0.0053);
const vermontPropertyTaxCalculator = propertyTaxCalculator(0.0171);
const virginiaPropertyTaxCalculator = propertyTaxCalculator(0.0074);
const washingtonPropertyTaxCalculator = propertyTaxCalculator(0.0084);
const westVirginiaPropertyTaxCalculator = propertyTaxCalculator(0.0054);
const wisconsinPropertyTaxCalculator = propertyTaxCalculator(0.0151);
const wyomingPropertyTaxCalculator = propertyTaxCalculator(0.0058);

export const usPropertyTaxCustomCalculators: Record<string, CustomCalculator> = {
  "alabama-property-tax-calculator": alabamaPropertyTaxCalculator,
  "alaska-property-tax-calculator": alaskaPropertyTaxCalculator,
  "arizona-property-tax-calculator": arizonaPropertyTaxCalculator,
  "arkansas-property-tax-calculator": arkansasPropertyTaxCalculator,
  "california-property-tax-calculator": californiaPropertyTaxCalculator,
  "colorado-property-tax-calculator": coloradoPropertyTaxCalculator,
  "connecticut-property-tax-calculator": connecticutPropertyTaxCalculator,
  "delaware-property-tax-calculator": delawarePropertyTaxCalculator,
  "florida-property-tax-calculator": floridaPropertyTaxCalculator,
  "georgia-property-tax-calculator": georgiaPropertyTaxCalculator,
  "hawaii-property-tax-calculator": hawaiiPropertyTaxCalculator,
  "idaho-property-tax-calculator": idahoPropertyTaxCalculator,
  "illinois-property-tax-calculator": illinoisPropertyTaxCalculator,
  "indiana-property-tax-calculator": indianaPropertyTaxCalculator,
  "iowa-property-tax-calculator": iowaPropertyTaxCalculator,
  "kansas-property-tax-calculator": kansasPropertyTaxCalculator,
  "kentucky-property-tax-calculator": kentuckyPropertyTaxCalculator,
  "louisiana-property-tax-calculator": louisianaPropertyTaxCalculator,
  "maine-property-tax-calculator": mainePropertyTaxCalculator,
  "maryland-property-tax-calculator": marylandPropertyTaxCalculator,
  "massachusetts-property-tax-calculator": massachusettsPropertyTaxCalculator,
  "michigan-property-tax-calculator": michiganPropertyTaxCalculator,
  "minnesota-property-tax-calculator": minnesotaPropertyTaxCalculator,
  "mississippi-property-tax-calculator": mississippiPropertyTaxCalculator,
  "missouri-property-tax-calculator": missouriPropertyTaxCalculator,
  "montana-property-tax-calculator": montanaPropertyTaxCalculator,
  "nebraska-property-tax-calculator": nebraskaPropertyTaxCalculator,
  "nevada-property-tax-calculator": nevadaPropertyTaxCalculator,
  "new-hampshire-property-tax-calculator": newHampshirePropertyTaxCalculator,
  "new-jersey-property-tax-calculator": newJerseyPropertyTaxCalculator,
  "new-mexico-property-tax-calculator": newMexicoPropertyTaxCalculator,
  "new-york-property-tax-calculator": newYorkPropertyTaxCalculator,
  "north-carolina-property-tax-calculator": northCarolinaPropertyTaxCalculator,
  "north-dakota-property-tax-calculator": northDakotaPropertyTaxCalculator,
  "ohio-property-tax-calculator": ohioPropertyTaxCalculator,
  "oklahoma-property-tax-calculator": oklahomaPropertyTaxCalculator,
  "oregon-property-tax-calculator": oregonPropertyTaxCalculator,
  "pennsylvania-property-tax-calculator": pennsylvaniaPropertyTaxCalculator,
  "rhode-island-property-tax-calculator": rhodeIslandPropertyTaxCalculator,
  "south-carolina-property-tax-calculator": southCarolinaPropertyTaxCalculator,
  "south-dakota-property-tax-calculator": southDakotaPropertyTaxCalculator,
  "tennessee-property-tax-calculator": tennesseePropertyTaxCalculator,
  "texas-property-tax-calculator": texasPropertyTaxCalculator,
  "utah-property-tax-calculator": utahPropertyTaxCalculator,
  "vermont-property-tax-calculator": vermontPropertyTaxCalculator,
  "virginia-property-tax-calculator": virginiaPropertyTaxCalculator,
  "washington-property-tax-calculator": washingtonPropertyTaxCalculator,
  "west-virginia-property-tax-calculator": westVirginiaPropertyTaxCalculator,
  "wisconsin-property-tax-calculator": wisconsinPropertyTaxCalculator,
  "wyoming-property-tax-calculator": wyomingPropertyTaxCalculator,
};
