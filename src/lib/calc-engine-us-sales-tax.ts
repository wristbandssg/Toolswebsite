/**
 * calc-engine-us-sales-tax.ts — US state Sales Tax calculators (Batch 7 of
 * the state-tax-audit build-out, 50 tools — one per state).
 *
 * Every US state is covered, including the states with genuinely NO
 * state-level general sales tax (Delaware, Montana, New Hampshire, Oregon —
 * modeled honestly as $0 tools) and the two states whose closest analog is
 * a different kind of levy rather than a traditional buyer-facing sales tax
 * (Hawaii's General Excise Tax, New Mexico's Gross Receipts Tax — both
 * disclosed plainly as such rather than mislabeled "sales tax"). Alaska has
 * no STATE sales tax but many localities impose their own, so it's modeled
 * using the audit's average local rate rather than lumped in with the
 * true-zero states.
 *
 * Where a state's rate combines a state rate with an average local add-on
 * (because sales tax in that state genuinely varies by city/county and no
 * single number is exact), this file uses the state_tax_audit.xlsx's own
 * published "combined average" figure and discloses in the tool's
 * Assumptions text that actual local rates vary by jurisdiction — this
 * calculator is an estimate, not an exact lookup for a specific address.
 * Each tool's result covers state (and use) tax on a taxable purchase.
 */

import { CustomCalculator, safeNumber } from "./calc-engine-types";

function salesTaxCalculator(rate: number): CustomCalculator {
  return (values) => {
    const purchaseAmount = Math.max(0, safeNumber(values.purchaseAmount));
    const salesTax = purchaseAmount * rate;
    return { salesTax, totalWithTax: purchaseAmount + salesTax };
  };
}

const alabamaSalesTaxCalculator = salesTaxCalculator(0.0946);
const alaskaSalesTaxCalculator = salesTaxCalculator(0.0182);
const arizonaSalesTaxCalculator = salesTaxCalculator(0.0852);
const arkansasSalesTaxCalculator = salesTaxCalculator(0.0946);
const californiaSalesTaxCalculator = salesTaxCalculator(0.0899);
const coloradoSalesTaxCalculator = salesTaxCalculator(0.0789);
const connecticutSalesTaxCalculator = salesTaxCalculator(0.0635);
const delawareSalesTaxCalculator = salesTaxCalculator(0);
const floridaSalesTaxCalculator = salesTaxCalculator(0.0698);
const georgiaSalesTaxCalculator = salesTaxCalculator(0.0749);
const hawaiiGeneralExciseTaxCalculator = salesTaxCalculator(0.045);
const idahoSalesTaxCalculator = salesTaxCalculator(0.0603);
const illinoisSalesTaxCalculator = salesTaxCalculator(0.0898);
const indianaSalesTaxCalculator = salesTaxCalculator(0.07);
const iowaSalesTaxCalculator = salesTaxCalculator(0.0694);
const kansasSalesTaxCalculator = salesTaxCalculator(0.0871);
const kentuckySalesTaxCalculator = salesTaxCalculator(0.06);
const louisianaSalesTaxCalculator = salesTaxCalculator(0.1013);
const maineSalesTaxCalculator = salesTaxCalculator(0.055);
const marylandSalesTaxCalculator = salesTaxCalculator(0.06);
const massachusettsSalesTaxCalculator = salesTaxCalculator(0.0625);
const michiganSalesTaxCalculator = salesTaxCalculator(0.06);
const minnesotaSalesTaxCalculator = salesTaxCalculator(0.06875);
const mississippiSalesTaxCalculator = salesTaxCalculator(0.07);
const missouriSalesTaxCalculator = salesTaxCalculator(0.04225);
const montanaSalesTaxCalculator = salesTaxCalculator(0);
const nebraskaSalesTaxCalculator = salesTaxCalculator(0.055);
const nevadaSalesTaxCalculator = salesTaxCalculator(0.0685);
const newHampshireSalesTaxCalculator = salesTaxCalculator(0);
const newJerseySalesTaxCalculator = salesTaxCalculator(0.06625);
const newMexicoGrossReceiptsTaxCalculator = salesTaxCalculator(0.04875);
const newYorkSalesTaxCalculator = salesTaxCalculator(0.04);
const northCarolinaSalesTaxCalculator = salesTaxCalculator(0.0475);
const northDakotaSalesTaxCalculator = salesTaxCalculator(0.05);
const ohioSalesTaxCalculator = salesTaxCalculator(0.0575);
const oklahomaSalesTaxCalculator = salesTaxCalculator(0.045);
const oregonSalesTaxCalculator = salesTaxCalculator(0);
const pennsylvaniaSalesTaxCalculator = salesTaxCalculator(0.06);
const rhodeIslandSalesTaxCalculator = salesTaxCalculator(0.07);
const southCarolinaSalesTaxCalculator = salesTaxCalculator(0.06);
const southDakotaSalesTaxCalculator = salesTaxCalculator(0.042);
const tennesseeSalesTaxCalculator = salesTaxCalculator(0.07);
const texasSalesTaxCalculator = salesTaxCalculator(0.0625);
const utahSalesTaxCalculator = salesTaxCalculator(0.061);
const vermontSalesTaxCalculator = salesTaxCalculator(0.06);
const virginiaSalesTaxCalculator = salesTaxCalculator(0.053);
const washingtonSalesTaxCalculator = salesTaxCalculator(0.065);
const westVirginiaSalesTaxCalculator = salesTaxCalculator(0.06);
const wisconsinSalesTaxCalculator = salesTaxCalculator(0.05);
const wyomingSalesTaxCalculator = salesTaxCalculator(0.04);

export const usSalesTaxCustomCalculators: Record<string, CustomCalculator> = {
  "alabama-sales-tax-calculator": alabamaSalesTaxCalculator,
  "alaska-sales-tax-calculator": alaskaSalesTaxCalculator,
  "arizona-sales-tax-calculator": arizonaSalesTaxCalculator,
  "arkansas-sales-tax-calculator": arkansasSalesTaxCalculator,
  "california-sales-tax-calculator": californiaSalesTaxCalculator,
  "colorado-sales-tax-calculator": coloradoSalesTaxCalculator,
  "connecticut-sales-tax-calculator": connecticutSalesTaxCalculator,
  "delaware-sales-tax-calculator": delawareSalesTaxCalculator,
  "florida-sales-tax-calculator": floridaSalesTaxCalculator,
  "georgia-sales-tax-calculator": georgiaSalesTaxCalculator,
  "hawaii-sales-tax-calculator": hawaiiGeneralExciseTaxCalculator,
  "idaho-sales-tax-calculator": idahoSalesTaxCalculator,
  "illinois-sales-tax-calculator": illinoisSalesTaxCalculator,
  "indiana-sales-tax-calculator": indianaSalesTaxCalculator,
  "iowa-sales-tax-calculator": iowaSalesTaxCalculator,
  "kansas-sales-tax-calculator": kansasSalesTaxCalculator,
  "kentucky-sales-tax-calculator": kentuckySalesTaxCalculator,
  "louisiana-sales-tax-calculator": louisianaSalesTaxCalculator,
  "maine-sales-tax-calculator": maineSalesTaxCalculator,
  "maryland-sales-tax-calculator": marylandSalesTaxCalculator,
  "massachusetts-sales-tax-calculator": massachusettsSalesTaxCalculator,
  "michigan-sales-tax-calculator": michiganSalesTaxCalculator,
  "minnesota-sales-tax-calculator": minnesotaSalesTaxCalculator,
  "mississippi-sales-tax-calculator": mississippiSalesTaxCalculator,
  "missouri-sales-tax-calculator": missouriSalesTaxCalculator,
  "montana-sales-tax-calculator": montanaSalesTaxCalculator,
  "nebraska-sales-tax-calculator": nebraskaSalesTaxCalculator,
  "nevada-sales-tax-calculator": nevadaSalesTaxCalculator,
  "new-hampshire-sales-tax-calculator": newHampshireSalesTaxCalculator,
  "new-jersey-sales-tax-calculator": newJerseySalesTaxCalculator,
  "new-mexico-sales-tax-calculator": newMexicoGrossReceiptsTaxCalculator,
  "new-york-sales-tax-calculator": newYorkSalesTaxCalculator,
  "north-carolina-sales-tax-calculator": northCarolinaSalesTaxCalculator,
  "north-dakota-sales-tax-calculator": northDakotaSalesTaxCalculator,
  "ohio-sales-tax-calculator": ohioSalesTaxCalculator,
  "oklahoma-sales-tax-calculator": oklahomaSalesTaxCalculator,
  "oregon-sales-tax-calculator": oregonSalesTaxCalculator,
  "pennsylvania-sales-tax-calculator": pennsylvaniaSalesTaxCalculator,
  "rhode-island-sales-tax-calculator": rhodeIslandSalesTaxCalculator,
  "south-carolina-sales-tax-calculator": southCarolinaSalesTaxCalculator,
  "south-dakota-sales-tax-calculator": southDakotaSalesTaxCalculator,
  "tennessee-sales-tax-calculator": tennesseeSalesTaxCalculator,
  "texas-sales-tax-calculator": texasSalesTaxCalculator,
  "utah-sales-tax-calculator": utahSalesTaxCalculator,
  "vermont-sales-tax-calculator": vermontSalesTaxCalculator,
  "virginia-sales-tax-calculator": virginiaSalesTaxCalculator,
  "washington-sales-tax-calculator": washingtonSalesTaxCalculator,
  "west-virginia-sales-tax-calculator": westVirginiaSalesTaxCalculator,
  "wisconsin-sales-tax-calculator": wisconsinSalesTaxCalculator,
  "wyoming-sales-tax-calculator": wyomingSalesTaxCalculator,
};
