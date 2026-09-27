/**
 * calc-engine-us-income-tax-rates.ts — shared state income-tax rate table
 * and helper math for Batch 10 of the state-tax-audit build-out: the
 * "income-tax-derived family" (14 SEO-angle calculators x the 41 states
 * that have a personal income tax = 574 tools: Tax Bracket, Marginal Tax
 * Rate, Effective Tax Rate, Tax Liability, Tax Refund, Taxable Income,
 * Tax Withholding, Withholding Tax, Bonus Tax, Overtime Tax, Commission
 * Tax, Freelance Tax, Contractor Tax, Estimated Quarterly Tax).
 *
 * Per an explicit user decision (see chat, 27 Sep 2026): rather than
 * refactoring the existing 4000+ line calc-engine-us.ts (one big
 * self-contained function per state, covering the full paycheck
 * calculators already live on the site) to export its exact bracket
 * tables, this family uses a SIMPLIFIED REPRESENTATIVE RATE per state —
 * each state's confirmed TOP marginal rate (flat states: their one flat
 * rate; graduated states: their published top bracket rate), the same
 * "disclosed approximation" spirit used throughout this audit (see
 * calc-engine-us-corporate-tax.ts's graduatedEstimate). This keeps this
 * very large batch tractable and internally consistent, at the cost of
 * not exactly matching the more detailed brackets in the existing full
 * paycheck calculators — every tool in this family discloses this in its
 * Assumptions text.
 *
 * For a graduated state, "low rate" is the audit's own confirmed bottom
 * bracket rate where one was given (Minnesota, Missouri, Montana,
 * Nebraska, New Jersey); otherwise a generic low starting rate of 1% is
 * used, and every graduated state uses a single representative ceiling of
 * $250,000 (a common order-of-magnitude for where many states' top
 * bracket begins) to approximate a smooth marginal-rate curve from low to
 * top rate. This is a simplification, not an exact bracket lookup.
 */

export interface StateIncomeTaxRate {
  name: string;
  topRate: number;
  isFlat: boolean;
  lowRate: number;
}

const GRADUATED_CEILING = 250_000;

export const STATE_INCOME_TAX_RATES: Record<string, StateIncomeTaxRate> = {
  alabama: { name: "Alabama", topRate: 0.05, isFlat: false, lowRate: 0.02 },
  arizona: { name: "Arizona", topRate: 0.025, isFlat: true, lowRate: 0.025 },
  arkansas: { name: "Arkansas", topRate: 0.039, isFlat: false, lowRate: 0.02 },
  california: { name: "California", topRate: 0.133, isFlat: false, lowRate: 0.01 },
  colorado: { name: "Colorado", topRate: 0.044, isFlat: true, lowRate: 0.044 },
  connecticut: { name: "Connecticut", topRate: 0.0699, isFlat: false, lowRate: 0.02 },
  delaware: { name: "Delaware", topRate: 0.066, isFlat: false, lowRate: 0.02 },
  georgia: { name: "Georgia", topRate: 0.0519, isFlat: true, lowRate: 0.0519 },
  hawaii: { name: "Hawaii", topRate: 0.11, isFlat: false, lowRate: 0.01 },
  idaho: { name: "Idaho", topRate: 0.053, isFlat: true, lowRate: 0.053 },
  illinois: { name: "Illinois", topRate: 0.0495, isFlat: true, lowRate: 0.0495 },
  indiana: { name: "Indiana", topRate: 0.0295, isFlat: true, lowRate: 0.0295 },
  iowa: { name: "Iowa", topRate: 0.038, isFlat: true, lowRate: 0.038 },
  kansas: { name: "Kansas", topRate: 0.0558, isFlat: false, lowRate: 0.02 },
  kentucky: { name: "Kentucky", topRate: 0.035, isFlat: true, lowRate: 0.035 },
  louisiana: { name: "Louisiana", topRate: 0.03, isFlat: true, lowRate: 0.03 },
  maine: { name: "Maine", topRate: 0.0715, isFlat: false, lowRate: 0.02 },
  maryland: { name: "Maryland", topRate: 0.065, isFlat: false, lowRate: 0.02 },
  massachusetts: { name: "Massachusetts", topRate: 0.09, isFlat: false, lowRate: 0.05 },
  michigan: { name: "Michigan", topRate: 0.0425, isFlat: true, lowRate: 0.0425 },
  minnesota: { name: "Minnesota", topRate: 0.0985, isFlat: false, lowRate: 0.0535 },
  mississippi: { name: "Mississippi", topRate: 0.04, isFlat: true, lowRate: 0.04 },
  missouri: { name: "Missouri", topRate: 0.047, isFlat: false, lowRate: 0.02 },
  montana: { name: "Montana", topRate: 0.0565, isFlat: false, lowRate: 0.047 },
  nebraska: { name: "Nebraska", topRate: 0.0455, isFlat: false, lowRate: 0.0246 },
  "new-jersey": { name: "New Jersey", topRate: 0.1075, isFlat: false, lowRate: 0.014 },
  "new-mexico": { name: "New Mexico", topRate: 0.059, isFlat: false, lowRate: 0.01 },
  "new-york": { name: "New York", topRate: 0.109, isFlat: false, lowRate: 0.01 },
  "north-carolina": { name: "North Carolina", topRate: 0.0399, isFlat: true, lowRate: 0.0399 },
  "north-dakota": { name: "North Dakota", topRate: 0.025, isFlat: false, lowRate: 0.01 },
  ohio: { name: "Ohio", topRate: 0.0275, isFlat: true, lowRate: 0.0275 },
  oklahoma: { name: "Oklahoma", topRate: 0.045, isFlat: false, lowRate: 0.01 },
  oregon: { name: "Oregon", topRate: 0.099, isFlat: false, lowRate: 0.02 },
  pennsylvania: { name: "Pennsylvania", topRate: 0.0307, isFlat: true, lowRate: 0.0307 },
  "rhode-island": { name: "Rhode Island", topRate: 0.0599, isFlat: false, lowRate: 0.02 },
  "south-carolina": { name: "South Carolina", topRate: 0.0521, isFlat: false, lowRate: 0.02 },
  utah: { name: "Utah", topRate: 0.045, isFlat: true, lowRate: 0.045 },
  vermont: { name: "Vermont", topRate: 0.0875, isFlat: false, lowRate: 0.02 },
  virginia: { name: "Virginia", topRate: 0.0575, isFlat: false, lowRate: 0.02 },
  "west-virginia": { name: "West Virginia", topRate: 0.0482, isFlat: false, lowRate: 0.02 },
  wisconsin: { name: "Wisconsin", topRate: 0.0765, isFlat: false, lowRate: 0.02 },
};

export const INCOME_TAX_STATE_SLUGS = Object.keys(STATE_INCOME_TAX_RATES);

/** Estimated marginal rate on the next dollar earned at `income`, for a
 * graduated state — rises smoothly from lowRate at $0 to topRate at the
 * shared ceiling, flat at topRate beyond it. For a flat state, the
 * marginal rate is always topRate regardless of income. */
export function marginalRateEstimate(income: number, state: StateIncomeTaxRate): number {
  if (state.isFlat) return state.topRate;
  const x = Math.max(0, income);
  if (x >= GRADUATED_CEILING) return state.topRate;
  return state.lowRate + ((state.topRate - state.lowRate) * x) / GRADUATED_CEILING;
}

/** Estimated TOTAL state income tax on `income` (the area under the
 * marginal-rate line described above) — for a flat state this is simply
 * income x topRate. */
export function totalTaxEstimate(income: number, state: StateIncomeTaxRate): number {
  const x = Math.max(0, income);
  if (state.isFlat) return x * state.topRate;
  if (x >= GRADUATED_CEILING) {
    const areaToCeiling =
      state.lowRate * GRADUATED_CEILING + ((state.topRate - state.lowRate) * GRADUATED_CEILING) / 2;
    return areaToCeiling + state.topRate * (x - GRADUATED_CEILING);
  }
  return state.lowRate * x + ((state.topRate - state.lowRate) / GRADUATED_CEILING) * ((x * x) / 2);
}

/** Estimated EFFECTIVE (average) rate on `income` — total tax divided by
 * income, i.e. the blended rate across all of it rather than the rate on
 * the next dollar. Always <= the marginal rate for a graduated state;
 * equal to it for a flat state. */
export function effectiveRateEstimate(income: number, state: StateIncomeTaxRate): number {
  const x = Math.max(0, income);
  if (x <= 0) return 0;
  return totalTaxEstimate(x, state) / x;
}
