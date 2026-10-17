/**
 * Batch: "Real Estate Calculators" → Closing Cost Calculators — 54 state and
 * city closing cost tools plus a USDA closing cost tool (55 tools).
 *
 * Every location runs the same engine with its own rules, so each page
 * answers its own place's question rather than the generic one:
 *  - transfer / deed / documentary taxes, split the way they're customarily
 *    paid there (NYC RPTT + state tax + mansion tax, Philadelphia's 4.578%,
 *    Pittsburgh's 5%, NJ's graduated realty transfer fee and the 2025
 *    seller-paid mansion tax, SF's graduated rates, LA's Measure ULA,
 *    Chicago's city tax, Delaware's 4%, etc.),
 *  - mortgage taxes on the loan (NY mortgage recording tax, Florida note
 *    stamps + intangible tax, Georgia intangible tax, Minnesota mortgage
 *    registry tax, Alabama and Tennessee mortgage taxes),
 *  - who customarily buys the owner's title policy and the typical rate,
 *  - attorney-closing states' attorney fees,
 *  - local property tax and insurance for prepaids.
 * The generic closing-cost-calculator (existing) covers anywhere from a
 * percentage the user types in.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-closing-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const yes = (v: number) => Math.round(safeNumber(v)) === 1;

type Split = { buyer: number; seller: number };

/** Marginal brackets: [upper bound, rate %]. */
function bracketTax(amount: number, brackets: [number, number][]): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of brackets) {
    if (amount <= lower) break;
    tax += ((Math.min(amount, upper) - lower) * rate) / 100;
    lower = upper;
  }
  return tax;
}

/** Whole-price tiers: the rate of the tier the price falls in applies to the full price. */
function tierTax(price: number, tiers: [number, number][]): number {
  let rate = 0;
  for (const [from, r] of tiers) if (price >= from) rate = r;
  return (price * rate) / 100;
}

const seller = (pct: number) => (p: number): Split => ({ buyer: 0, seller: (p * pct) / 100 });
const buyer = (pct: number) => (p: number): Split => ({ buyer: (p * pct) / 100, seller: 0 });
const split = (pct: number) => (p: number): Split => ({ buyer: (p * pct) / 200, seller: (p * pct) / 200 });
const none = (): Split => ({ buyer: 0, seller: 0 });

const NYC_MANSION: [number, number][] = [
  [1_000_000, 1], [2_000_000, 1.25], [3_000_000, 1.5], [5_000_000, 2.25], [10_000_000, 3.25],
  [15_000_000, 3.5], [20_000_000, 3.75], [25_000_000, 3.9],
];
const NJ_RTF: [number, number][] = [
  [150_000, 0.4], [200_000, 0.67], [550_000, 0.78], [850_000, 0.96], [1_000_000, 1.06], [2_000_000, 1.16],
  [2_500_000, 1.21], [3_000_000, 1.26], [Infinity, 1.28],
];
const NJ_MANSION: [number, number][] = [[1_000_000, 1], [2_000_000, 2], [2_500_000, 2.5], [3_000_000, 3], [3_500_000, 3.5]];
const SF_TRANSFER: [number, number][] = [
  [100, 0.5], [250_000, 0.68], [1_000_000, 0.75], [5_000_000, 2.25], [10_000_000, 5.5], [25_000_000, 6],
];
// Los Angeles Measure ULA thresholds for July 2025–June 2026 (re-indexed each July).
const LA_ULA: [number, number][] = [[5_300_000, 4], [10_600_000, 5.5]];
const CT_STATE: [number, number][] = [[800_000, 0.75], [2_500_000, 1.25], [Infinity, 2.25]];
const RI_TAX: [number, number][] = [[800_000, 0.46], [Infinity, 0.92]];

export interface ClosingLocation {
  name: string;
  /** Transfer / deed taxes and who customarily pays them. */
  transfer: (price: number) => Split;
  /** Mortgage / note taxes paid by the buyer on the loan, %. */
  mortgageTaxRate: number | ((loan: number) => number);
  /** Owner's title policy as % of price, and who customarily pays for it. */
  ownerTitle: number;
  ownerTitlePaidBy: "buyer" | "seller" | "split";
  /** Lender's title policy (simultaneous issue) as % of the loan. */
  lenderTitle: number;
  /** Attorney or settlement agent fee for each side. */
  buyerSettlement: number;
  sellerSettlement: number;
  /** Property tax rate % and yearly insurance for prepaids. */
  taxRate: number;
  insurance: number;
}

const loc = (name: string, o: Partial<ClosingLocation> & Pick<ClosingLocation, "taxRate">): ClosingLocation => ({
  name,
  transfer: none,
  mortgageTaxRate: 0,
  ownerTitle: 0.4,
  ownerTitlePaidBy: "seller",
  lenderTitle: 0.15,
  buyerSettlement: 600,
  sellerSettlement: 600,
  insurance: 1800,
  ...o,
});

const florida = (name: string, deedRate: number, buyerTitle: boolean, taxRate: number) =>
  loc(name, {
    transfer: seller(deedRate),
    mortgageTaxRate: 0.55, // 0.35% note stamps + 0.2% intangible tax
    ownerTitle: 0.55,
    ownerTitlePaidBy: buyerTitle ? "buyer" : "seller",
    lenderTitle: 0.1,
    taxRate,
    insurance: 4500,
  });
const texas = (name: string, taxRate: number) =>
  loc(name, { ownerTitle: 0.55, ownerTitlePaidBy: "seller", lenderTitle: 0.1, buyerSettlement: 700, sellerSettlement: 700, taxRate, insurance: 3200 });
const california = (name: string, transfer: (p: number) => Split, buyerTitle: boolean, taxRate: number) =>
  loc(name, { transfer, ownerTitle: 0.3, ownerTitlePaidBy: buyerTitle ? "buyer" : "seller", lenderTitle: 0.15, buyerSettlement: 1500, sellerSettlement: 1500, taxRate, insurance: 1600 });
const pennsylvania = (name: string, totalPct: number, taxRate: number) =>
  loc(name, { transfer: split(totalPct), ownerTitle: 0.6, ownerTitlePaidBy: "buyer", lenderTitle: 0.15, buyerSettlement: 750, sellerSettlement: 500, taxRate, insurance: 1300 });

export const CLOSING_LOCATIONS: Record<string, ClosingLocation> = {
  "florida-closing-cost-calculator": florida("Florida", 0.7, false, 1.6),
  "miami-closing-cost-calculator": florida("Miami", 0.6, true, 1.8),
  "texas-closing-cost-calculator": texas("Texas", 1.8),
  "houston-closing-cost-calculator": texas("Houston", 2.1),
  "san-antonio-closing-cost-calculator": texas("San Antonio", 2.2),
  "nyc-closing-cost-calculator": loc("New York City", {
    transfer: (p) => ({
      buyer: tierTax(p, NYC_MANSION),
      seller: p * (p >= 3_000_000 ? 0.0065 : 0.004) + p * (p > 500_000 ? 0.01425 : 0.01),
    }),
    mortgageTaxRate: (loan) => loan * (loan >= 500_000 ? 0.01925 : 0.018),
    ownerTitle: 0.45, ownerTitlePaidBy: "buyer", lenderTitle: 0.3, buyerSettlement: 3000, sellerSettlement: 3000, taxRate: 0.9, insurance: 1800,
  }),
  "ny-closing-cost-calculator": loc("New York State", {
    transfer: (p) => ({ buyer: p >= 1_000_000 ? p * 0.01 : 0, seller: p * 0.004 }),
    mortgageTaxRate: 0.75,
    ownerTitle: 0.45, ownerTitlePaidBy: "buyer", lenderTitle: 0.3, buyerSettlement: 1500, sellerSettlement: 1500, taxRate: 1.6, insurance: 1500,
  }),
  "long-island-closing-costs-calculator": loc("Long Island", {
    transfer: (p) => ({ buyer: p >= 1_000_000 ? p * 0.01 : 0, seller: p * 0.004 }),
    mortgageTaxRate: 0.8,
    ownerTitle: 0.45, ownerTitlePaidBy: "buyer", lenderTitle: 0.3, buyerSettlement: 2000, sellerSettlement: 2000, taxRate: 2.0, insurance: 1900,
  }),
  "nj-closing-cost-calculator": loc("New Jersey", {
    transfer: (p) => ({ buyer: 0, seller: bracketTax(p, NJ_RTF) + tierTax(p, NJ_MANSION) }),
    ownerTitle: 0.5, ownerTitlePaidBy: "buyer", lenderTitle: 0.15, buyerSettlement: 1500, sellerSettlement: 1500, taxRate: 2.2, insurance: 1500,
  }),
  "pa-closing-cost-calculator": pennsylvania("Pennsylvania", 2, 1.5),
  "philadelphia-closing-cost-calculator": pennsylvania("Philadelphia", 4.578, 1.4),
  "pittsburgh-closing-cost-calculator": pennsylvania("Pittsburgh", 5, 2.0),
  "georgia-closing-cost-calculator": loc("Georgia", {
    transfer: seller(0.1), mortgageTaxRate: 0.3, ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 1000, sellerSettlement: 400, taxRate: 0.9, insurance: 2000,
  }),
  "atlanta-closing-cost-calculator": loc("Atlanta", {
    transfer: seller(0.1), mortgageTaxRate: 0.3, ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 1100, sellerSettlement: 450, taxRate: 1.05, insurance: 2000,
  }),
  "maryland-closing-cost-calculator": loc("Maryland", {
    transfer: split(1.7), ownerTitle: 0.45, ownerTitlePaidBy: "buyer", buyerSettlement: 900, sellerSettlement: 500, taxRate: 1.0, insurance: 1500,
  }),
  "michigan-closing-cost-calculator": loc("Michigan", { transfer: seller(0.86), ownerTitle: 0.4, ownerTitlePaidBy: "seller", taxRate: 1.6, insurance: 1600 }),
  "indiana-closing-cost-calculator": loc("Indiana", { ownerTitle: 0.35, ownerTitlePaidBy: "seller", taxRate: 0.85, insurance: 1600 }),
  "north-carolina-closing-cost-calculator": loc("North Carolina", {
    transfer: seller(0.2), ownerTitle: 0.2, ownerTitlePaidBy: "buyer", lenderTitle: 0.1, buyerSettlement: 900, sellerSettlement: 400, taxRate: 0.8, insurance: 1800,
  }),
  "tn-closing-cost-calculator": loc("Tennessee", {
    transfer: buyer(0.37), mortgageTaxRate: (loan) => Math.max(0, loan - 2000) * 0.00115, ownerTitle: 0.4, ownerTitlePaidBy: "buyer", taxRate: 0.65, insurance: 1900,
  }),
  "ohio-buyer-closing-costs-calculator": loc("Ohio", { transfer: seller(0.4), ownerTitle: 0.4, ownerTitlePaidBy: "split", taxRate: 1.5, insurance: 1300 }),
  "arkansas-closing-cost-calculator": loc("Arkansas", { transfer: split(0.33), ownerTitle: 0.35, ownerTitlePaidBy: "seller", taxRate: 0.6, insurance: 2700 }),
  "california-closing-cost-calculator": california("California", seller(0.11), false, 1.2),
  "los-angeles-closing-cost-calculator": california("Los Angeles", (p) => ({ buyer: 0, seller: p * 0.0056 + tierTax(p, LA_ULA) }), false, 1.2),
  "san-francisco-closing-cost-calculator": california("San Francisco", (p) => ({ buyer: 0, seller: tierTax(p, SF_TRANSFER) }), true, 1.18),
  "san-diego-closing-cost-calculator": california("San Diego", seller(0.11), false, 1.15),
  "mn-closing-cost-calculator": loc("Minnesota", { transfer: seller(0.33), mortgageTaxRate: 0.24, ownerTitle: 0.35, ownerTitlePaidBy: "buyer", taxRate: 1.1, insurance: 2400 }),
  "oklahoma-closing-cost-calculator": loc("Oklahoma", { transfer: seller(0.15), ownerTitle: 0.35, ownerTitlePaidBy: "buyer", taxRate: 0.9, insurance: 4200 }),
  "wisconsin-closing-costs-calculator": loc("Wisconsin", { transfer: seller(0.3), ownerTitle: 0.35, ownerTitlePaidBy: "seller", taxRate: 1.6, insurance: 1200 }),
  "virginia-closing-costs-calculator": loc("Virginia", {
    transfer: (p) => ({ buyer: p * 0.00333, seller: p * 0.001 }), ownerTitle: 0.3, ownerTitlePaidBy: "buyer", buyerSettlement: 800, sellerSettlement: 500, taxRate: 0.85, insurance: 1400,
  }),
  "south-carolina-closing-costs-calculator": loc("South Carolina", {
    transfer: seller(0.37), ownerTitle: 0.3, ownerTitlePaidBy: "buyer", buyerSettlement: 1000, sellerSettlement: 500, taxRate: 0.55, insurance: 2200,
  }),
  "arizona-closing-cost-calculator": loc("Arizona", { ownerTitle: 0.4, ownerTitlePaidBy: "seller", buyerSettlement: 900, sellerSettlement: 900, taxRate: 0.6, insurance: 1700 }),
  "oregon-closing-cost-calculator": loc("Oregon", { ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 1000, sellerSettlement: 1000, taxRate: 0.95, insurance: 1200 }),
  "alabama-closing-cost-calculator": loc("Alabama", { transfer: buyer(0.1), mortgageTaxRate: 0.15, ownerTitle: 0.35, ownerTitlePaidBy: "buyer", taxRate: 0.45, insurance: 2600 }),
  "colorado-closing-cost-calculator": loc("Colorado", { transfer: buyer(0.01), ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 650, sellerSettlement: 650, taxRate: 0.55, insurance: 3500 }),
  "delaware-closing-cost-calculator": loc("Delaware", {
    transfer: split(4), ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 1200, sellerSettlement: 600, taxRate: 0.6, insurance: 1300,
  }),
  "illinois-closing-cost-calculator": loc("Illinois", {
    transfer: seller(0.15), ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 900, sellerSettlement: 900, taxRate: 2.1, insurance: 1700,
  }),
  "chicago-closing-cost-calculator": loc("Chicago", {
    transfer: (p) => ({ buyer: p * 0.0075, seller: p * 0.0015 + p * 0.003 }), ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 950, sellerSettlement: 950, taxRate: 1.9, insurance: 1700,
  }),
  "louisiana-closing-cost-calculator": loc("Louisiana", { ownerTitle: 0.4, ownerTitlePaidBy: "buyer", buyerSettlement: 900, sellerSettlement: 500, taxRate: 0.6, insurance: 4600 }),
  "massachusetts-closing-cost-calculator": loc("Massachusetts", {
    transfer: seller(0.456), ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 1500, sellerSettlement: 1000, taxRate: 1.1, insurance: 1700,
  }),
  "missouri-closing-cost-calculator": loc("Missouri", { ownerTitle: 0.35, ownerTitlePaidBy: "seller", taxRate: 1.0, insurance: 2200 }),
  "utah-closing-cost-calculator": loc("Utah", { ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 700, sellerSettlement: 700, taxRate: 0.55, insurance: 1100 }),
  "iowa-closing-cost-calculator": loc("Iowa", {
    transfer: (p) => ({ buyer: 0, seller: Math.max(0, p - 500) * 0.0016 }), ownerTitle: 0.05, ownerTitlePaidBy: "buyer", lenderTitle: 0.05, taxRate: 1.5, insurance: 1900,
  }),
  "ky-closing-cost-calculator": loc("Kentucky", { transfer: seller(0.1), ownerTitle: 0.35, ownerTitlePaidBy: "buyer", taxRate: 0.85, insurance: 2000 }),
  "nevada-closing-cost-calculator": loc("Nevada", { transfer: seller(0.39), ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 800, sellerSettlement: 800, taxRate: 0.55, insurance: 1200 }),
  "las-vegas-closing-cost-calculator": loc("Las Vegas", { transfer: seller(0.51), ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 850, sellerSettlement: 850, taxRate: 0.6, insurance: 1200 }),
  "nebraska-closing-cost-calculator": loc("Nebraska", { transfer: seller(0.225), ownerTitle: 0.35, ownerTitlePaidBy: "split", taxRate: 1.6, insurance: 3800 }),
  "connecticut-closing-cost-calculator": loc("Connecticut", {
    transfer: (p) => ({ buyer: 0, seller: bracketTax(p, CT_STATE) + p * 0.0025 }), ownerTitle: 0.4, ownerTitlePaidBy: "buyer", buyerSettlement: 1500, sellerSettlement: 1000, taxRate: 1.9, insurance: 1700,
  }),
  "idaho-closing-costs-calculator": loc("Idaho", { ownerTitle: 0.35, ownerTitlePaidBy: "seller", buyerSettlement: 700, sellerSettlement: 700, taxRate: 0.6, insurance: 1200 }),
  "kansas-closing-cost-calculator": loc("Kansas", { ownerTitle: 0.35, ownerTitlePaidBy: "split", taxRate: 1.35, insurance: 3600 }),
  "maine-closing-costs-calculator": loc("Maine", { transfer: split(0.44), ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 1000, sellerSettlement: 500, taxRate: 1.1, insurance: 1300 }),
  "mississippi-closing-cost-calculator": loc("Mississippi", { ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 800, sellerSettlement: 400, taxRate: 0.75, insurance: 2700 }),
  "new-hampshire-closing-cost-calculator": loc("New Hampshire", { transfer: split(1.5), ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 900, sellerSettlement: 600, taxRate: 1.6, insurance: 1200 }),
  "new-mexico-closing-cost-calculator": loc("New Mexico", { ownerTitle: 0.45, ownerTitlePaidBy: "seller", buyerSettlement: 700, sellerSettlement: 700, taxRate: 0.7, insurance: 1700 }),
  "rhode-island-closing-cost-calculator": loc("Rhode Island", {
    transfer: (p) => ({ buyer: 0, seller: bracketTax(p, RI_TAX) }), ownerTitle: 0.35, ownerTitlePaidBy: "buyer", buyerSettlement: 1200, sellerSettlement: 600, taxRate: 1.25, insurance: 1600,
  }),
};

export const closingCostFor = (location: ClosingLocation): CustomCalculator => (v) => {
  const price = nonNeg(v.homePrice);
  const loan = price * (1 - nonNeg(v.downPaymentPercent) / 100);
  const transfer = location.transfer(price);
  const mortgageTax = typeof location.mortgageTaxRate === "function" ? location.mortgageTaxRate(loan) : (loan * location.mortgageTaxRate) / 100;
  const owner = (price * location.ownerTitle) / 100;
  const ownerBuyer = location.ownerTitlePaidBy === "buyer" ? owner : location.ownerTitlePaidBy === "split" ? owner / 2 : 0;
  const ownerSeller = owner - ownerBuyer;
  const lenderTitle = loan > 0 ? Math.max(300, (loan * location.lenderTitle) / 100) : 0;
  const lenderFees = loan > 0 ? (loan * nonNeg(v.originationPercent)) / 100 + nonNeg(v.otherLenderFees) : 0;
  const recording = loan > 0 ? 250 : 150;
  const buyerClosing = lenderFees + lenderTitle + ownerBuyer + transfer.buyer + mortgageTax + location.buyerSettlement + recording;
  const taxYear = (price * nonNeg(v.propertyTaxRate, location.taxRate)) / 100;
  const ins = nonNeg(v.annualInsurance, location.insurance);
  const months = nonNeg(v.escrowMonths, 3);
  const prepaids = loan > 0 ? ins + months * ((taxYear + ins) / 12) + ((loan * nonNeg(v.interestRate)) / 100 / 365) * 15 : 0;
  const sellerCosts = (price * nonNeg(v.commissionPercent)) / 100 + transfer.seller + ownerSeller + location.sellerSettlement;
  return {
    buyerClosingCosts: round2(buyerClosing),
    buyerCashWithPrepaids: round2(buyerClosing + prepaids),
    buyerClosingPercent: price > 0 ? round2((buyerClosing / price) * 100) : 0,
    transferAndMortgageTaxesBuyer: round2(transfer.buyer + mortgageTax),
    transferTaxesSeller: round2(transfer.seller),
    sellerClosingCosts: round2(sellerCosts),
    sellerClosingPercent: price > 0 ? round2((sellerCosts / price) * 100) : 0,
    prepaidsAndEscrow: round2(prepaids),
  };
};

export const usdaClosingCosts: CustomCalculator = (v) => {
  const price = nonNeg(v.homePrice);
  const appraisal = Math.max(price, nonNeg(v.appraisedValue));
  const closing = (price * nonNeg(v.closingCostPercent)) / 100;
  const prepaids = nonNeg(v.prepaids);
  const sellerCredit = Math.min(nonNeg(v.sellerCredit), price * 0.06);
  // USDA lets the loan go up to the appraised value (+ guarantee fee), so closing costs can be financed into the gap.
  const financeable = yes(v.financeClosingCosts) ? Math.max(0, appraisal - price) : 0;
  const unpaid = Math.max(0, closing + prepaids - sellerCredit);
  const financed = Math.min(financeable, unpaid);
  const baseLoan = price + financed;
  const fee = baseLoan * 0.01;
  const loan = baseLoan + fee;
  return {
    cashToClose: round2(unpaid - financed + nonNeg(v.downPayment)),
    totalClosingCosts: round2(closing + prepaids),
    upfrontGuaranteeFee: round2(fee),
    closingCostsFinanced: round2(financed),
    sellerCreditApplied: round2(sellerCredit),
    totalLoanAmount: round2(Math.max(0, loan - nonNeg(v.downPayment))),
    monthlyAnnualFee: round2((baseLoan * 0.0035) / 12),
  };
};

export const reClosingCustomCalculators: Record<string, CustomCalculator> = {
  ...Object.fromEntries(Object.entries(CLOSING_LOCATIONS).map(([slug, l]) => [slug, closingCostFor(l)])),
  "usda-closing-costs-calculator": usdaClosingCosts,
};
