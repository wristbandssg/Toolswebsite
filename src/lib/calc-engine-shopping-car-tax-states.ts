/**
 * Batch: "Shopping Calculators" → Sales Tax, VAT & Import Duty — state car
 * sales tax family (29 tools, one per state in the user's list).
 *
 * Every state tool runs the same engine with that state's rules, so each
 * page answers its own state's question rather than the generic one:
 *  - state rate and a typical local rate (editable),
 *  - how the trade-in is treated (full credit, none, capped, new cars only),
 *  - local tax caps (Florida's surtax on the first $5,000, Tennessee's local
 *    tax on the first $1,600 plus the 2.75% single-article tax),
 *  - price tiers (Arkansas), minimum tax (Virginia),
 *  - value-based taxes (Georgia TAVT on fair market value, Texas standard
 *    presumptive value on private sales, Oklahoma excise on used cars).
 * The generic car-sales-tax-calculator (existing) covers any state from a
 * rate the user types in.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-car-tax-states-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

interface StateRules {
  /** State rate, %. */
  rate: number;
  /** How the trade-in lowers the taxable price. */
  trade: "full" | "none" | "cap" | "new-only";
  /** Fixed trade-in credit cap ($) when trade = "cap" and no input overrides it. */
  tradeCap?: number;
  /** Local tax only applies to this much of the price ($). */
  localCap?: number;
  /** Extra state tax on a slice of the price: [from $, to $, rate %] (Tennessee single article). */
  slice?: [number, number, number];
  /** Used-car price tiers replacing the state rate: [under $, rate %] (Arkansas). */
  tiers?: [number, number][];
  /** Minimum tax ($). */
  minTax?: number;
  /** Extra flat-rate tax on the whole taxable price, % (Oklahoma 1.25% sales tax). */
  extraRate?: number;
  /** Used-car excise: flat $ on the first slice, rate on the rest (Oklahoma). */
  usedExcise?: [number, number];
  /** Tax base is the greater of price and a value input (Georgia FMV, Texas SPV on private sales). */
  valueBase?: "ga-fmv" | "tx-spv";
}

const STATES: Record<string, StateRules> = {
  missouri: { rate: 4.225, trade: "full" },
  california: { rate: 7.25, trade: "none" },
  arkansas: { rate: 6.5, trade: "full", tiers: [[4000, 0], [10000, 3.5]], localCap: 2500 },
  texas: { rate: 6.25, trade: "full", valueBase: "tx-spv" },
  florida: { rate: 6, trade: "full", localCap: 5000 },
  ohio: { rate: 5.75, trade: "new-only" },
  virginia: { rate: 4.15, trade: "none", minTax: 75 },
  tennessee: { rate: 7, trade: "full", localCap: 1600, slice: [1600, 3200, 2.75] },
  oklahoma: { rate: 3.25, trade: "none", extraRate: 1.25, usedExcise: [20, 1500] },
  illinois: { rate: 6.25, trade: "cap", tradeCap: 10000 },
  colorado: { rate: 2.9, trade: "full" },
  minnesota: { rate: 6.875, trade: "full" },
  alabama: { rate: 2, trade: "full" },
  kansas: { rate: 6.5, trade: "full" },
  utah: { rate: 4.85, trade: "full" },
  georgia: { rate: 7, trade: "full", valueBase: "ga-fmv" },
  "new-york": { rate: 4, trade: "full" },
  "new-jersey": { rate: 6.625, trade: "full" },
  washington: { rate: 6.8, trade: "full" },
  arizona: { rate: 5.6, trade: "full" },
  massachusetts: { rate: 6.25, trade: "full" },
  louisiana: { rate: 5, trade: "full" },
  nebraska: { rate: 5.5, trade: "full" },
  maine: { rate: 5.5, trade: "full" },
  michigan: { rate: 6, trade: "cap" },
  indiana: { rate: 7, trade: "full" },
  iowa: { rate: 5, trade: "full" },
  nevada: { rate: 6.85, trade: "full" },
  maryland: { rate: 6.5, trade: "full" },
};

/** State and local tax on a taxable price, before rounding. */
function taxOn(rules: StateRules, taxable: number, isUsed: boolean, localRate: number) {
  let stateTax: number;
  if (rules.usedExcise && isUsed) {
    const [flat, first] = rules.usedExcise;
    stateTax = (taxable > 0 ? flat : 0) + Math.max(0, taxable - first) * (rules.rate / 100);
  } else if (rules.tiers && isUsed) {
    const tier = rules.tiers.find(([upTo]) => taxable < upTo);
    stateTax = taxable * ((tier ? tier[1] : rules.rate) / 100);
  } else {
    stateTax = taxable * (rules.rate / 100);
  }
  if (rules.extraRate) stateTax += taxable * (rules.extraRate / 100);
  if (rules.slice) {
    const [from, to, r] = rules.slice;
    stateTax += Math.max(0, Math.min(taxable, to) - from) * (r / 100);
  }
  if (rules.minTax && taxable > 0) stateTax = Math.max(stateTax, rules.minTax);
  const localTax = (rules.localCap ? Math.min(taxable, rules.localCap) : taxable) * localRate;
  return { stateTax, localTax, total: stateTax + localTax };
}

function stateCarSalesTax(rules: StateRules): CustomCalculator {
  return (v) => {
    const price = nonNeg(v.price);
    const docFee = nonNeg(v.docFee);
    const otherFees = nonNeg(v.otherFees);
    const trade = Math.min(nonNeg(v.tradeIn), price + docFee);
    const isUsed = safeNumber(v.condition) === 1;
    const localRate = nonNeg(v.localRate) / 100;

    let credit = trade;
    if (rules.trade === "none") credit = 0;
    if (rules.trade === "new-only" && isUsed) credit = 0;
    if (rules.trade === "cap") {
      const cap = safeNumber(v.tradeCap) > 0 ? safeNumber(v.tradeCap) : rules.tradeCap ?? Infinity;
      credit = Math.min(trade, cap);
    }

    let base = price + docFee;
    if (rules.valueBase === "ga-fmv") base = Math.max(base, nonNeg(v.marketValue));
    if (rules.valueBase === "tx-spv" && safeNumber(v.privateSale) === 1) base = Math.max(base, 0.8 * nonNeg(v.marketValue));
    const taxable = Math.max(0, base - credit);
    const tax = taxOn(rules, taxable, isUsed, localRate);
    // Tax with no trade-in credit at all, for the savings line.
    const saved = taxOn(rules, base, isUsed, localRate).total - tax.total;

    return {
      salesTax: round2(tax.total),
      stateTax: round2(tax.stateTax),
      localTax: round2(tax.localTax),
      taxablePrice: round2(taxable),
      tradeInTaxSavings: round2(Math.max(0, saved)),
      outTheDoorPrice: round2(price + docFee + otherFees + tax.total - trade),
      effectiveRate: price > 0 ? round2((tax.total / price) * 100) : 0,
    };
  };
}

export const shoppingCarTaxStatesCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.entries(STATES).map(([state, rules]) => [`${state}-car-sales-tax-calculator`, stateCarSalesTax(rules)])
);
