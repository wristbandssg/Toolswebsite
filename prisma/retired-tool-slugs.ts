// Tools deleted as duplicates in prisma/cleanup-structure-and-duplicates.ts
// (same calculation and search intent as the tool shown next to each). Seed
// scripts that still define them skip these, so a re-run can't bring them back.
export const RETIRED_TOOL_SLUGS = new Set<string>([
  "self-employment-tax-estimator", // -> self-employment-tax-calculator
  "individual-income-tax-calculator", // -> income-tax-calculator
  "personal-income-tax-calculator", // -> income-tax-calculator
  "retirement-income-tax-calculator", // -> retirement-tax-calculator
  "salary-tax-calculator", // -> take-home-pay-calculator
  "payroll-tax-calculator", // -> take-home-pay-calculator
  "salary-after-tax-calculator", // -> take-home-pay-calculator
  "net-salary-calculator", // -> take-home-pay-calculator
  "annual-salary-tax-calculator", // -> take-home-pay-calculator
  "paycheck-tax-calculator", // -> take-home-pay-calculator
  "salary-withholding-calculator", // -> take-home-pay-calculator
  "monthly-salary-tax-calculator", // -> take-home-pay-calculator
  "weekly-salary-tax-calculator", // -> take-home-pay-calculator
  "biweekly-salary-tax-calculator", // -> take-home-pay-calculator
  "freelancer-tax-calculator", // -> self-employment-tax-calculator
  "contractor-tax-calculator", // -> self-employment-tax-calculator
  "gig-worker-tax-calculator", // -> self-employment-tax-calculator
  "side-hustle-tax-calculator", // -> self-employment-tax-calculator
  "sole-trader-tax-calculator", // -> self-employment-tax-calculator
  "freelancer-income-tax-calculator", // -> business-income-tax-calculator
  "foreign-income-tax-calculator", // -> income-tax-calculator
  "investment-income-tax-calculator", // -> income-tax-calculator
  "commission-tax-calculator", // -> bonus-tax-calculator
  "stock-capital-gains-calculator", // -> capital-gains-tax-calculator
  "sales-tax-exclusive-calculator", // -> sales-tax-calculator
  "sales-tax-inclusive-calculator", // -> reverse-sales-tax-calculator
  "pre-tax-price-calculator", // -> reverse-sales-tax-calculator
  "post-tax-price-calculator", // -> sales-tax-calculator
  "consumer-use-tax-calculator", // -> use-tax-calculator
  "city-sales-tax-calculator", // -> combined-sales-tax-calculator
  "county-sales-tax-calculator", // -> combined-sales-tax-calculator
  "vat-exclusive-calculator", // -> vat-calculator
  "vat-inclusive-calculator", // -> reverse-vat-calculator
  "input-vat-calculator", // -> vat-calculator
  "output-vat-calculator", // -> vat-calculator
  "annual-property-tax-calculator", // -> property-tax-calculator
  "real-estate-tax-calculator", // -> property-tax-calculator
  "monthly-property-tax-calculator", // -> property-tax-calculator
  "property-purchase-tax-calculator", // -> property-transfer-tax-calculator
  "property-sale-tax-calculator", // -> property-transfer-tax-calculator
  "self-employed-gst-calculator", // -> self-employed-vat-calculator
  "nominal-to-effective-interest-rate-calculator", // -> effective-interest-rate-calculator
  "effective-to-nominal-interest-rate-calculator", // -> nominal-interest-rate-calculator
  "quarterly-compound-interest-calculator", // -> compound-interest-calculator
  "semiannual-compound-interest-calculator", // -> compound-interest-calculator
  "annual-compound-interest-calculator", // -> compound-interest-calculator
  "buy-vs-rent-calculator", // -> rent-vs-buy-calculator
  "currency-cross-rate-calculator", // -> cross-currency-rate-calculator
  "independent-contractor-tax-calculator", // -> self-employment-tax-calculator
]);
