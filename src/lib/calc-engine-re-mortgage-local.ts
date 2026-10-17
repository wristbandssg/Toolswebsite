/**
 * Batch: "Real Estate Calculators" → Mortgage Calculators by State, City &
 * Country (32 tools):
 *
 *  - 29 US state and city mortgage / house payment calculators. They share
 *    one PITI engine (principal & interest, property tax, insurance, PMI,
 *    HOA and a local extra such as Mello-Roos, MUD or flood insurance); each
 *    page carries its own place's tax rate, insurance cost and price
 *    defaults (see LOCAL_MORTGAGES), so each answers its own place's
 *    question.
 *  - uaeMortgage: UAE Central Bank LTV caps and Dubai purchase costs (DLD
 *    4%, mortgage registration, agent and bank fees with VAT).
 *  - spainMortgage: resident vs non-resident LTV, ITP (resale) or IVA + AJD
 *    (new build), notary/registry/gestor costs.
 *  - singaporeMortgageAffordability: TDSR 55% / MSR 30% at the 4% stress
 *    rate, LTV 75% (55% for long tenures), Buyer's Stamp Duty and funds.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-re-mortgage-local-calculators.ts for the copy.
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

/** Monthly principal & interest on a fully amortizing loan. */
function pmt(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Loan a monthly P&I payment supports. */
function loanFromPayment(payment: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (payment <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

export interface LocalMortgage {
  name: string;
  price: number;
  taxRate: number;
  insurance: number;
  hoa?: number;
  /** Label for a local monthly extra (Mello-Roos, MUD, flood insurance); omitted when not relevant. */
  extraLabel?: string;
  extraDefault?: number;
}

export const LOCAL_MORTGAGES: Record<string, LocalMortgage> = {
  "san-diego-mortgage-calculator": { name: "San Diego", price: 950000, taxRate: 1.15, insurance: 1700, extraLabel: "Mello-Roos / Special Taxes per Month", extraDefault: 0 },
  "los-angeles-mortgage-calculator": { name: "Los Angeles", price: 950000, taxRate: 1.2, insurance: 1800, extraLabel: "Mello-Roos / Special Assessments per Month", extraDefault: 0 },
  "long-island-mortgage-calculator": { name: "Long Island", price: 700000, taxRate: 2.0, insurance: 1900, extraLabel: "Flood Insurance per Month", extraDefault: 0 },
  "nyc-mortgage-payment-calculator": { name: "New York City", price: 850000, taxRate: 0.9, insurance: 900, hoa: 900 },
  "san-francisco-mortgage-calculator": { name: "San Francisco", price: 1350000, taxRate: 1.18, insurance: 1800, hoa: 0 },
  "pittsburgh-mortgage-calculator": { name: "Pittsburgh", price: 250000, taxRate: 2.0, insurance: 1200 },
  "orlando-mortgage-calculator": { name: "Orlando", price: 400000, taxRate: 1.6, insurance: 4500, extraLabel: "CDD / Flood Insurance per Month", extraDefault: 0 },
  "sacramento-mortgage-calculator": { name: "Sacramento", price: 550000, taxRate: 1.15, insurance: 1600, extraLabel: "Mello-Roos / Special Taxes per Month", extraDefault: 0 },
  "dallas-texas-mortgage-calculator": { name: "Dallas", price: 400000, taxRate: 2.2, insurance: 3800, extraLabel: "MUD / PID Assessment per Month", extraDefault: 0 },
  "florida-mortgage-calculator": { name: "Florida", price: 400000, taxRate: 1.6, insurance: 4500, extraLabel: "Flood Insurance per Month", extraDefault: 0 },
  "indiana-mortgage-calculator": { name: "Indiana", price: 260000, taxRate: 0.85, insurance: 1600 },
  "nh-mortgage-calculator": { name: "New Hampshire", price: 450000, taxRate: 1.6, insurance: 1200 },
  "alaska-mortgage-calculator": { name: "Alaska", price: 380000, taxRate: 1.1, insurance: 1300 },
  "arkansas-mortgage-calculator": { name: "Arkansas", price: 220000, taxRate: 0.6, insurance: 2700 },
  "louisiana-mortgage-calculator": { name: "Louisiana", price: 230000, taxRate: 0.6, insurance: 4600, extraLabel: "Flood Insurance per Month", extraDefault: 0 },
  "oregon-mortgage-calculator": { name: "Oregon", price: 480000, taxRate: 0.95, insurance: 1200 },
  "ohio-house-payment-calculator": { name: "Ohio", price: 230000, taxRate: 1.5, insurance: 1300 },
  "rochester-ny-mortgage-calculator": { name: "Rochester, NY", price: 230000, taxRate: 2.8, insurance: 1100 },
  "utah-house-payment-calculator": { name: "Utah", price: 520000, taxRate: 0.55, insurance: 1100 },
  "alabama-home-loan-calculator": { name: "Alabama", price: 250000, taxRate: 0.45, insurance: 2600 },
  "tn-house-payment-calculator": { name: "Tennessee", price: 350000, taxRate: 0.65, insurance: 1900 },
  "ky-house-payment-calculator": { name: "Kentucky", price: 250000, taxRate: 0.85, insurance: 2000 },
  "raleigh-nc-mortgage-calculator": { name: "Raleigh, NC", price: 430000, taxRate: 0.9, insurance: 1500 },
  "san-marcos-tx-mortgage-calculator": { name: "San Marcos, TX", price: 320000, taxRate: 2.1, insurance: 3600, extraLabel: "MUD / PID Assessment per Month", extraDefault: 0 },
  "taxes-california-mortgage-calculator": { name: "California", price: 750000, taxRate: 1.2, insurance: 1600, extraLabel: "Mello-Roos / Special Taxes per Month", extraDefault: 0 },
  "ga-house-payment-calculator": { name: "Georgia", price: 350000, taxRate: 0.9, insurance: 2000 },
  "missouri-house-payment-calculator": { name: "Missouri", price: 250000, taxRate: 1.0, insurance: 2200 },
  "oklahoma-simple-mortgage-calculator": { name: "Oklahoma", price: 220000, taxRate: 0.9, insurance: 4200 },
  "sc-mortgage-payment-calculator": { name: "South Carolina", price: 320000, taxRate: 0.55, insurance: 2200 },
};

export const localMortgagePayment: CustomCalculator = (v) => {
  const price = nonNeg(v.homePrice);
  const loan = price * (1 - nonNeg(v.downPaymentPercent) / 100);
  const years = nonNeg(v.loanTerm, 30) || 30;
  const pi = pmt(loan, nonNeg(v.interestRate), years);
  const tax = (price * nonNeg(v.propertyTaxRate)) / 100 / 12;
  const ins = nonNeg(v.annualInsurance) / 12;
  const pmi = price > 0 && loan / price > 0.8 ? (loan * nonNeg(v.pmiRate, 0.5)) / 100 / 12 : 0;
  const total = pi + tax + ins + pmi + nonNeg(v.monthlyHoa) + nonNeg(v.localExtra);
  return {
    monthlyPayment: round2(total),
    principalAndInterest: round2(pi),
    monthlyPropertyTax: round2(tax),
    monthlyInsurance: round2(ins),
    monthlyPmi: round2(pmi),
    loanAmount: round2(loan),
    totalInterest: round2(pi * years * 12 - loan),
  };
};

export const uaeMortgage: CustomCalculator = (v) => {
  const price = nonNeg(v.propertyPrice);
  const national = yes(v.uaeNational);
  const firstHome = !yes(v.secondHome);
  const offPlan = yes(v.offPlan);
  // UAE Central Bank caps (2013 regulation): first home up to AED 5M — 80% (85% nationals); above — 70% (75%); later homes 60% (65%); off-plan 50%.
  let maxLtv = firstHome ? (price <= 5_000_000 ? (national ? 85 : 80) : national ? 75 : 70) : national ? 65 : 60;
  if (offPlan) maxLtv = Math.min(maxLtv, 50);
  const ltv = Math.min(maxLtv, nonNeg(v.ltvWanted, maxLtv));
  const loan = (price * ltv) / 100;
  const years = Math.min(25, nonNeg(v.loanTerm, 25) || 25);
  const pay = pmt(loan, nonNeg(v.interestRate), years);
  const dld = price * 0.04 + 580;
  const registration = loan * 0.0025 + 290;
  const agent = price * (nonNeg(v.agentFeePercent) / 100) * 1.05;
  const bank = loan * (nonNeg(v.bankFeePercent) / 100) * 1.05 + nonNeg(v.valuationFee);
  const upfront = dld + registration + agent + bank + nonNeg(v.trusteeFee);
  return {
    monthlyPayment: round2(pay),
    loanAmount: round2(loan),
    downPayment: round2(price - loan),
    upfrontCosts: round2(upfront),
    totalCashNeeded: round2(price - loan + upfront),
    dldTransferFee: round2(dld),
    maxLoanToValue: maxLtv,
  };
};

export const spainMortgage: CustomCalculator = (v) => {
  const price = nonNeg(v.propertyPrice);
  const maxLtv = yes(v.nonResident) ? 70 : 80;
  const ltv = Math.min(maxLtv, nonNeg(v.ltvWanted, maxLtv));
  const loan = (price * ltv) / 100;
  const years = nonNeg(v.loanTerm, 25) || 25;
  const pay = pmt(loan, nonNeg(v.interestRate), years);
  const newBuild = yes(v.newBuild);
  const taxes = newBuild ? price * 0.1 + (price * nonNeg(v.ajdRate)) / 100 : (price * nonNeg(v.itpRate)) / 100;
  const fees = (price * nonNeg(v.notaryRegistryPercent)) / 100 + nonNeg(v.valuationFee);
  return {
    monthlyPayment: round2(pay),
    loanAmount: round2(loan),
    downPayment: round2(price - loan),
    purchaseTaxes: round2(taxes),
    notaryRegistryAndFees: round2(fees),
    totalCashNeeded: round2(price - loan + taxes + fees),
    totalInterest: round2(pay * years * 12 - loan),
  };
};

/** Singapore Buyer's Stamp Duty on residential property (from 15 Feb 2023). */
function singaporeBsd(price: number): number {
  const bands: [number, number][] = [[180_000, 1], [360_000, 2], [1_000_000, 3], [1_500_000, 4], [3_000_000, 5], [Infinity, 6]];
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of bands) {
    if (price <= lower) break;
    tax += ((Math.min(price, upper) - lower) * rate) / 100;
    lower = upper;
  }
  return tax;
}

export const singaporeMortgageAffordability: CustomCalculator = (v) => {
  const income = nonNeg(v.monthlyIncome);
  const debts = nonNeg(v.otherDebtPayments);
  const hdbOrEc = yes(v.hdbOrEc);
  const tenure = Math.min(hdbOrEc ? 30 : 35, nonNeg(v.loanTenure, 30) || 30);
  const stress = Math.max(4, nonNeg(v.interestRate));
  const tdsrRoom = income * 0.55 - debts;
  const capPayment = Math.max(0, hdbOrEc ? Math.min(income * 0.3, tdsrRoom) : tdsrRoom);
  const maxLoan = loanFromPayment(capPayment, stress, tenure);
  const longTenure = tenure > 30 || nonNeg(v.age) + tenure > 65;
  const ltv = longTenure ? 0.55 : 0.75;
  const funds = nonNeg(v.cashAndCpf);
  let lo = 0;
  let hi = 50_000_000;
  for (let i = 0; i < 80; i++) {
    const p = (lo + hi) / 2;
    const loan = Math.min(maxLoan, p * ltv);
    if (p - loan + singaporeBsd(p) <= funds) lo = p;
    else hi = p;
  }
  const price = lo;
  const loan = Math.min(maxLoan, price * ltv);
  return {
    maxPropertyPrice: round2(price),
    maxLoan: round2(maxLoan),
    loanAtThatPrice: round2(loan),
    monthlyInstalment: round2(pmt(loan, nonNeg(v.interestRate), tenure)),
    buyersStampDuty: round2(singaporeBsd(price)),
    downPaymentNeeded: round2(price - loan),
    minimumCashDownPayment: round2(price * (longTenure ? 0.1 : 0.05)),
  };
};

export const reMortgageLocalCustomCalculators: Record<string, CustomCalculator> = {
  ...Object.fromEntries(Object.keys(LOCAL_MORTGAGES).map((slug) => [slug, localMortgagePayment])),
  "uae-mortgage-calculator": uaeMortgage,
  "property-in-spain-mortgage-calculator": spainMortgage,
  "singapore-mortgage-affordability-calculator": singaporeMortgageAffordability,
};
