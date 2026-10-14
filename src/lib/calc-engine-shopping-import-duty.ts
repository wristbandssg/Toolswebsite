/**
 * Batch: "Shopping Calculators" → Sales Tax, VAT & Import Duty — import duty
 * calculators (18 tools): a generic one, 16 country ones and landed cost.
 *
 * Each country tool follows that country's own customs structure, with
 * 2026 default rates the user can change:
 *  - the valuation base (CIF in most countries; FOB in Canada, Australia
 *    and South Africa, which uplifts it by 10% for VAT),
 *  - the order the taxes stack (VAT/GST is charged on value + duty, plus
 *    levies such as India's social welfare surcharge, Nigeria's surcharge,
 *    CISS and ETLS, Kenya's IDF and RDL, Ghana's levies, Mexico's DTA),
 *  - low-value thresholds (UK £135, Australia A$1,000, Malaysia RM500 LVG,
 *    South Africa's flat-rate small parcels).
 * chinaImportDuty is importing FROM China INTO the US (the common search
 * intent): MFN duty + Section 301 + other tariffs + MPF/HMF, no de minimis.
 * The existing car-import-duty-calculator covers vehicles.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-import-duty-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => nonNeg(v) / 100;

/** Shared result shape: duty, taxes, fees, totals and the effective rate on the goods. */
function result(goods: number, freightIns: number, duty: number, tax: number, fees: number) {
  const charges = duty + tax + fees;
  return {
    totalImportCharges: round2(charges),
    importDuty: round2(duty),
    importTax: round2(tax),
    otherFees: round2(fees),
    landedCost: round2(goods + freightIns + charges),
    effectiveRate: goods > 0 ? round2((charges / goods) * 100) : 0,
  };
}

const cifOf = (v: Record<string, number>) => {
  const goods = nonNeg(v.goodsValue);
  const freightIns = nonNeg(v.shipping) + nonNeg(v.insurance);
  return { goods, freightIns, cif: goods + freightIns };
};

export const importDutyCalculator: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const base = safeNumber(v.valuationBasis) === 1 ? goods : cif; // 0 = CIF, 1 = FOB
  const exempt = nonNeg(v.dutyFreeThreshold) > 0 && goods <= nonNeg(v.dutyFreeThreshold);
  const duty = exempt ? 0 : base * pct(v.dutyRate);
  const tax = (base + duty) * pct(v.vatRate);
  return result(goods, freightIns, duty, tax, nonNeg(v.brokerageFee));
};

export const canadaImportDuty: CustomCalculator = (v) => {
  const goods = nonNeg(v.goodsValue);
  const freightIns = nonNeg(v.shipping);
  // Value for duty is the price paid; international freight isn't dutiable.
  const dutyFree = safeNumber(v.cusma) === 1 || goods <= nonNeg(v.dutyFreeThreshold);
  const duty = dutyFree ? 0 : goods * pct(v.dutyRate);
  const taxFree = goods <= nonNeg(v.taxFreeThreshold);
  const tax = taxFree ? 0 : (goods + duty) * pct(v.salesTaxRate);
  return result(goods, freightIns, duty, tax, nonNeg(v.brokerageFee));
};

export const ukImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  if (safeNumber(v.isGift) === 1 && goods <= 39) return result(goods, freightIns, 0, 0, 0);
  // Up to £135 the seller charges VAT at checkout and no duty is collected.
  const low = goods <= 135;
  const duty = low ? 0 : cif * pct(v.dutyRate);
  const tax = (low ? goods : cif + duty) * pct(v.vatRate);
  return result(goods, freightIns, duty, tax, low ? 0 : nonNeg(v.handlingFee));
};

export const euImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const low = goods <= nonNeg(v.dutyFreeThreshold);
  const duty = low ? nonNeg(v.lowValueFlatDuty) : cif * pct(v.dutyRate);
  const tax = (cif + duty) * pct(v.vatRate);
  return result(goods, freightIns, duty, tax, nonNeg(v.handlingFee));
};

export const indiaImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const bcd = cif * pct(v.dutyRate);
  const sws = bcd * pct(v.surchargeRate);
  const igst = (cif + bcd + sws) * pct(v.igstRate);
  return result(goods, freightIns, bcd + sws, igst, nonNeg(v.clearingFee));
};

export const mexicoImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const igi = cif * pct(v.dutyRate);
  const dta = cif * pct(v.dtaRate);
  const iva = (cif + igi + dta) * pct(v.ivaRate);
  return result(goods, freightIns, igi, iva, dta + nonNeg(v.brokerageFee));
};

export const chinaImportDuty: CustomCalculator = (v) => {
  const goods = nonNeg(v.goodsValue); // US customs value is the FOB price; freight isn't dutiable.
  const freightIns = nonNeg(v.shipping) + nonNeg(v.insurance);
  const duty = goods * (pct(v.dutyRate) + pct(v.section301Rate) + pct(v.otherTariffRate));
  const mpf = goods > 0 ? Math.min(651.5, Math.max(33.58, goods * 0.003464)) : 0;
  const hmf = safeNumber(v.byOcean) === 1 ? goods * 0.00125 : 0;
  return result(goods, freightIns, duty, 0, mpf + hmf + nonNeg(v.brokerageFee));
};

export const japanImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  if (goods <= 10000) return result(goods, freightIns, 0, 0, 0);
  const duty = cif * pct(v.dutyRate);
  const tax = (cif + duty) * pct(v.consumptionTaxRate);
  return result(goods, freightIns, duty, tax, nonNeg(v.handlingFee));
};

export const thailandImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const duty = cif * pct(v.dutyRate);
  const excise = (cif + duty) * pct(v.exciseRate);
  const vat = (cif + duty + excise) * pct(v.vatRate);
  return result(goods, freightIns, duty + excise, vat, nonNeg(v.handlingFee));
};

export const turkeyImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const duty = cif * (pct(v.dutyRate) + pct(v.additionalDutyRate));
  const otv = (cif + duty) * pct(v.otvRate);
  const kdv = (cif + duty + otv) * pct(v.kdvRate);
  return result(goods, freightIns, duty, otv + kdv, nonNeg(v.handlingFee));
};

export const australiaImportDuty: CustomCalculator = (v) => {
  const goods = nonNeg(v.goodsValue);
  const freightIns = nonNeg(v.shipping) + nonNeg(v.insurance);
  // A$1,000 or less: no duty or GST at the border (GST is charged by the seller).
  if (goods <= 1000) return result(goods, freightIns, 0, goods * 0.1, 0);
  const duty = goods * pct(v.dutyRate); // customs value = FOB
  const gst = (goods + duty + freightIns) * pct(v.gstRate);
  return result(goods, freightIns, duty, gst, nonNeg(v.processingCharge));
};

export const southAfricaImportDuty: CustomCalculator = (v) => {
  const goods = nonNeg(v.goodsValue);
  const freightIns = nonNeg(v.shipping) + nonNeg(v.insurance);
  const smallParcel = safeNumber(v.postal) === 1 && goods <= 500;
  const duty = goods * (smallParcel ? 0.2 : pct(v.dutyRate));
  // VAT is on the customs value uplifted by 10%, plus duty.
  const vat = (goods * 1.1 + duty) * pct(v.vatRate);
  return result(goods, freightIns, duty, vat, nonNeg(v.handlingFee));
};

export const nigeriaImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const duty = cif * pct(v.dutyRate);
  const surcharge = duty * 0.07;
  const ciss = goods * 0.01;
  const etls = cif * 0.005;
  const vat = (cif + duty + surcharge + ciss + etls) * pct(v.vatRate);
  return result(goods, freightIns, duty + surcharge, vat, ciss + etls + nonNeg(v.clearingFee));
};

export const kenyaImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const duty = cif * pct(v.dutyRate);
  const excise = (cif + duty) * pct(v.exciseRate);
  const vat = (cif + duty + excise) * pct(v.vatRate);
  const levies = cif * (pct(v.idfRate) + pct(v.rdlRate));
  return result(goods, freightIns, duty + excise, vat, levies + nonNeg(v.clearingFee));
};

export const malaysiaImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  // Low-value goods (RM500 or less) bought online: 10% LVG sales tax, no duty.
  if (goods <= 500) return result(goods, freightIns, 0, goods * 0.1, 0);
  const duty = cif * pct(v.dutyRate);
  const tax = (cif + duty) * pct(v.salesTaxRate);
  return result(goods, freightIns, duty, tax, nonNeg(v.handlingFee));
};

export const vietnamImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const duty = cif * pct(v.dutyRate);
  const sct = (cif + duty) * pct(v.sctRate);
  const vat = (cif + duty + sct) * pct(v.vatRate);
  return result(goods, freightIns, duty + sct, vat, nonNeg(v.handlingFee));
};

export const ghanaImportDuty: CustomCalculator = (v) => {
  const { goods, freightIns, cif } = cifOf(v);
  const duty = cif * pct(v.dutyRate);
  const levies = cif * pct(v.leviesRate); // ECOWAS, AU, EXIM levies and processing fee
  const vat = (cif + duty) * (pct(v.vatRate) + pct(v.nhilGetfundRate));
  return result(goods, freightIns, duty, vat, levies + nonNeg(v.clearingFee));
};

export const landedCostCalculator: CustomCalculator = (v) => {
  const units = Math.max(1, Math.round(safeNumber(v.units, 1)));
  const product = nonNeg(v.unitCost) * units;
  const freight = nonNeg(v.shipping) + nonNeg(v.insurance);
  const dutyBase = safeNumber(v.valuationBasis) === 1 ? product : product + freight;
  const duty = dutyBase * pct(v.dutyRate);
  const fees = nonNeg(v.customsFees) + nonNeg(v.inlandFreight);
  const total = product + freight + duty + fees;
  return {
    landedCostPerUnit: round2(total / units),
    totalLandedCost: round2(total),
    productCost: round2(product),
    importDuty: round2(duty),
    freightAndFees: round2(freight + fees),
    markupOverProduct: product > 0 ? round2(((total - product) / product) * 100) : 0,
  };
};

export const shoppingImportDutyCustomCalculators: Record<string, CustomCalculator> = {
  "import-duty-calculator": importDutyCalculator,
  "canada-import-duty-calculator": canadaImportDuty,
  "uk-import-duty-calculator": ukImportDuty,
  "eu-import-duty-calculator": euImportDuty,
  "india-import-duty-calculator": indiaImportDuty,
  "mexico-import-duty-calculator": mexicoImportDuty,
  "china-import-duty-calculator": chinaImportDuty,
  "japan-import-duty-calculator": japanImportDuty,
  "thailand-import-duty-calculator": thailandImportDuty,
  "turkey-import-duty-calculator": turkeyImportDuty,
  "australia-import-duty-calculator": australiaImportDuty,
  "south-africa-import-duty-calculator": southAfricaImportDuty,
  "nigeria-import-duty-calculator": nigeriaImportDuty,
  "kenya-import-duty-calculator": kenyaImportDuty,
  "malaysia-import-duty-calculator": malaysiaImportDuty,
  "vietnam-import-duty-calculator": vietnamImportDuty,
  "ghana-import-duty-calculator": ghanaImportDuty,
  "landed-cost-calculator": landedCostCalculator,
};
