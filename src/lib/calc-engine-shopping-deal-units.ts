/**
 * Batch: "Shopping Calculators" → Discount, Tip & Unit Price — price per
 * unit, fees and warranties (11 tools).
 *
 * Price per unit: price-quantity-calculator (existing) compares unit
 * prices with no unit conversion. These five convert between package
 * units so two products in different sizes can be compared, each giving
 * the unit people search for plus a related one:
 *  - pricePerOunce (weight oz or fluid oz), pricePerPound (+ per kg; also
 *    covers "price per kg"), pricePerGram (+ per 100 g and per kg),
 *    pricePerLiter (+ per 100 ml), pricePerGallon (+ per quart).
 *
 * Fees and warranties:
 *  - rentToOwn: total paid vs the retail price and the implied APR.
 *  - lateFee: flat, one-time % or monthly % late fees after a grace period,
 *    with an optional legal cap.
 *  - restockingFee: refund after a restocking fee and lost shipping.
 *  - extendedWarranty: expected value of a product warranty and the
 *    break-even chance of a repair.
 *  - warrantyRefund: pro-rated refund when cancelling a service contract
 *    (by time or mileage, whichever is used more).
 *  - homeWarranty: yearly cost of a home warranty vs paying for repairs.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-deal-units-calculators.ts for the copy.
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

/** Package units: [grams or millilitres per unit, dimension]. Dropdown value = index. */
const UNITS: [number, "w" | "v"][] = [
  [28.349523125, "w"], // 0 oz
  [453.59237, "w"], // 1 lb
  [1, "w"], // 2 g
  [1000, "w"], // 3 kg
  [29.5735295625, "v"], // 4 fl oz
  [1, "v"], // 5 ml
  [1000, "v"], // 6 L
  [3785.411784, "v"], // 7 gal
  [946.352946, "v"], // 8 qt
];

function amountIn(size: number, unitIdx: number) {
  const [factor, dim] = UNITS[Math.min(UNITS.length - 1, Math.max(0, Math.round(safeNumber(unitIdx))))];
  return { base: size * factor, dim };
}

/**
 * Price per target unit for two products. target = [grams/ml per target unit,
 * dimension or "any" for the ounce tool], second = [factor, label] for the
 * related unit shown alongside.
 */
function unitPriceTool(target: number, dim: "w" | "v" | "oz", second: number): CustomCalculator {
  return (v) => {
    const per = (price: number, size: number, unit: number) => {
      const { base, dim: d } = amountIn(nonNeg(size), unit);
      if (base <= 0 || price <= 0) return { main: 0, alt: 0 };
      if (dim === "oz") {
        const ozSize = d === "w" ? base / 28.349523125 : base / 29.5735295625;
        return { main: price / ozSize, alt: (price / base) * (d === "w" ? 100 : 100) };
      }
      return { main: (price / base) * target, alt: (price / base) * second };
    };
    const a = per(nonNeg(v.price1), v.size1, v.unit1);
    const b = per(nonNeg(v.price2), v.size2, v.unit2);
    const both = a.main > 0 && b.main > 0;
    const cheaper = both ? (a.main <= b.main ? 1 : 2) : a.main > 0 ? 1 : 0;
    const saving = both ? (Math.abs(a.main - b.main) / Math.max(a.main, b.main)) * 100 : 0;
    return {
      unitPrice1: round2(a.main * 100) / 100,
      unitPrice2: round2(b.main * 100) / 100,
      cheaperOption: cheaper,
      savingWithCheaper: round2(saving),
      altUnitPrice1: round2(a.alt),
      altUnitPrice2: round2(b.alt),
    };
  };
}

export const pricePerOunce = unitPriceTool(28.349523125, "oz", 100);
export const pricePerPound = unitPriceTool(453.59237, "w", 1000);
export const pricePerGram = unitPriceTool(1, "w", 100);
export const pricePerLiter = unitPriceTool(1000, "v", 100);
export const pricePerGallon = unitPriceTool(3785.411784, "v", 946.352946);

/** Monthly rate r that makes n payments of pmt worth pv (bisection). */
function solveRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt * n <= pv) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const r = (lo + hi) / 2;
    const val = (pmt * (1 - Math.pow(1 + r, -n))) / r;
    if (val > pv) lo = r;
    else hi = r;
  }
  return (lo + hi) / 2;
}

export const rentToOwn: CustomCalculator = (v) => {
  const retail = nonNeg(v.retailPrice);
  const pmt = nonNeg(v.payment);
  const n = Math.max(0, Math.round(safeNumber(v.payments)));
  const perYear = safeNumber(v.frequency) === 0 ? 52 : safeNumber(v.frequency) === 1 ? 26 : 12;
  const total = pmt * n + nonNeg(v.fees);
  const r = solveRate(Math.max(0, retail - nonNeg(v.fees)), pmt, n);
  return {
    totalCost: round2(total),
    extraOverRetail: round2(total - retail),
    costMultiple: retail > 0 ? round2(total / retail) : 0,
    impliedApr: round2(r * perYear * 100),
    monthsToOwn: round2((n / perYear) * 12),
  };
};

export const lateFee: CustomCalculator = (v) => {
  const due = nonNeg(v.amountDue);
  const daysLate = Math.max(0, nonNeg(v.daysLate) - nonNeg(v.graceDays));
  const type = Math.round(safeNumber(v.feeType));
  let fee = 0;
  if (daysLate > 0) {
    if (type === 0) fee = nonNeg(v.flatFee);
    else if (type === 1) fee = due * pct(v.feeRate);
    else fee = due * pct(v.feeRate) * (daysLate / 30);
    fee += nonNeg(v.dailyFee) * daysLate;
  }
  const cap = pct(v.capPercent);
  if (cap > 0) fee = Math.min(fee, due * cap);
  return {
    lateFee: round2(fee),
    totalDue: round2(due + fee),
    daysChargeable: daysLate,
    feeAsPercentOfDue: due > 0 ? round2((fee / due) * 100) : 0,
    annualizedRate: due > 0 && daysLate > 0 ? round2((fee / due) * (365 / Math.max(1, nonNeg(v.daysLate))) * 100) : 0,
  };
};

export const restockingFee: CustomCalculator = (v) => {
  const price = nonNeg(v.itemPrice);
  const fee = price * pct(v.feePercent);
  const lost = fee + nonNeg(v.returnShipping) + nonNeg(v.originalShipping);
  return {
    refund: round2(price - fee - nonNeg(v.returnShipping) + (safeNumber(v.shippingRefunded) === 1 ? nonNeg(v.originalShipping) : 0)),
    restockingFee: round2(fee),
    totalCostOfReturning: round2(safeNumber(v.shippingRefunded) === 1 ? lost - nonNeg(v.originalShipping) : lost),
    lostAsPercentOfPrice: price > 0 ? round2(((safeNumber(v.shippingRefunded) === 1 ? lost - nonNeg(v.originalShipping) : lost) / price) * 100) : 0,
  };
};

export const extendedWarranty: CustomCalculator = (v) => {
  const price = nonNeg(v.productPrice);
  const cost = nonNeg(v.warrantyCost);
  const p = Math.min(1, pct(v.failureChance));
  const repair = nonNeg(v.repairCost);
  const deductible = nonNeg(v.deductible);
  const covered = Math.max(0, repair - deductible);
  const expectedBenefit = p * covered;
  return {
    expectedValue: round2(expectedBenefit - cost),
    expectedRepairCost: round2(p * repair),
    warrantyAsPercentOfPrice: price > 0 ? round2((cost / price) * 100) : 0,
    breakEvenFailureChance: covered > 0 ? round2(Math.min(100, (cost / covered) * 100)) : 0,
    worthIt: expectedBenefit > cost ? 1 : 0,
  };
};

export const warrantyRefund: CustomCalculator = (v) => {
  const price = nonNeg(v.contractPrice);
  const termMonths = nonNeg(v.termMonths);
  const timeUsed = termMonths > 0 ? Math.min(1, nonNeg(v.monthsUsed) / termMonths) : 0;
  const milesUsed = nonNeg(v.termMiles) > 0 ? Math.min(1, nonNeg(v.milesUsed) / nonNeg(v.termMiles)) : 0;
  const used = Math.max(timeUsed, milesUsed);
  const unused = price * (1 - used);
  const refund = Math.max(0, unused - nonNeg(v.cancelFee) - nonNeg(v.claimsPaid));
  return {
    refund: round2(refund),
    percentUsed: round2(used * 100),
    unusedValue: round2(unused),
    cancellationFee: round2(nonNeg(v.cancelFee)),
    refundPercentOfPrice: price > 0 ? round2((refund / price) * 100) : 0,
  };
};

export const homeWarranty: CustomCalculator = (v) => {
  const premium = nonNeg(v.monthlyPremium) * 12;
  const calls = nonNeg(v.callsPerYear);
  const fees = calls * nonNeg(v.serviceFee);
  const withWarranty = premium + fees;
  const avgRepair = nonNeg(v.avgRepairCost);
  const cap = nonNeg(v.coverageCap);
  const overCap = cap > 0 ? Math.max(0, avgRepair - cap) * calls : 0;
  const without = calls * avgRepair;
  const breakEven = avgRepair - nonNeg(v.serviceFee) > 0 ? premium / (avgRepair - nonNeg(v.serviceFee)) : 0;
  return {
    yearlySavings: round2(without - withWarranty - overCap),
    costWithWarranty: round2(withWarranty + overCap),
    costWithoutWarranty: round2(without),
    annualPremium: round2(premium),
    breakEvenRepairsPerYear: round2(breakEven),
  };
};

export const shoppingDealUnitsCustomCalculators: Record<string, CustomCalculator> = {
  "price-per-ounce-calculator": pricePerOunce,
  "price-per-pound-calculator": pricePerPound,
  "price-per-gram-calculator": pricePerGram,
  "price-per-liter-calculator": pricePerLiter,
  "price-per-gallon-calculator": pricePerGallon,
  "rent-to-own-calculator": rentToOwn,
  "late-fee-calculator": lateFee,
  "restocking-fee-calculator": restockingFee,
  "extended-warranty-calculator": extendedWarranty,
  "warranty-refund-calculator": warrantyRefund,
  "home-warranty-calculator": homeWarranty,
};
