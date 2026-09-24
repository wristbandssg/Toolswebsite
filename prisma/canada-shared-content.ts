// Shared content builder for the 13 Canada province/territory tool-setup
// scripts (create-<province>-income-tax-tool.ts). Not a runnable script
// itself — imported by each of the 13.
//
// Unlike the US state scripts (each state's tax mechanism genuinely
// differs — flat rate, federal-AGI-based, phased deductions, ...) and the
// 2 UK scripts (small enough to just write twice), Canada's 13
// jurisdictions share one real mechanic (federal tax + that jurisdiction's
// own bracket table/Basic-Personal-Amount credit + CPP + EI — see
// calc-engine-canada.ts's header) with only Ontario and Quebec genuinely
// different. Duplicating ~300 lines of near-identical prose 13 times would
// make the 11 "plain" scripts harder to keep consistent and correct, not
// easier — so the shared boilerplate (instructions/assumptions/examples/
// FAQ scaffolding, calcInputs, the standard calcResults shape) lives here,
// and each per-province script supplies only what's actually unique to
// that jurisdiction: its name, bracket figures, Basic Personal Amount, and
// a verified baseline example (see each script's own data — all example
// figures were computed by calc-engine-canada.ts itself and checked by
// hand before being written into this content, the same as every other
// tool in this project).

export function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

export interface CanadaBaselineExample {
  grossMonthly: number;
  federalTaxMonthly: number;
  provincialTaxMonthly: number;
  extraLine?: { label: string; monthly: number };
  payrollLabel: string; // "CPP" or "QPP"
  payrollMonthly: number;
  secondPayrollLabel?: string; // "QPIP" for Quebec only
  secondPayrollMonthly?: number;
  eiMonthly: number;
  totalDeductionsMonthly: number;
  netMonthly: number;
  annualNet: number;
}

export interface CanadaProvinceContent {
  slug: string;
  name: string; // e.g. "Ontario"
  adjective: string; // e.g. "Ontario's" / "British Columbia's" — used mid-sentence
  bracketDescription: string; // plain-English bracket summary, one sentence
  bpa: number;
  lowestRatePercent: string; // e.g. "5.05%"
  specialNote?: string; // Ontario surtax/health premium or Quebec QPP/QPIP/abatement paragraph
  baseline: CanadaBaselineExample;
}

const money = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildCalcInputs() {
  return [
    {
      key: "annualSalary",
      label: "Annual Salary",
      type: "currency",
      unit: "CAD/year",
      required: true,
      min: 0,
      max: 300000,
      step: 1000,
    },
    {
      key: "payFrequency",
      label: "Pay Frequency",
      type: "dropdown",
      required: true,
      default: 12,
      options: [
        { label: "Weekly (52 payments/year)", value: 52 },
        { label: "Biweekly (26 payments/year)", value: 26 },
        { label: "Monthly (12 payments/year)", value: 12 },
        { label: "Annually (1 payment/year)", value: 1 },
      ],
    },
    {
      key: "preTaxDeductions",
      label: "Pre-Tax Deductions",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
    {
      key: "postTaxDeductions",
      label: "Post-Tax Deductions",
      unit: "per payment",
      type: "currency",
      required: false,
      default: 0,
      min: 0,
    },
  ];
}

export function buildCalcResults(p: CanadaProvinceContent) {
  const lines: { key: string; label: string; format: string; currency: string; highlight?: boolean }[] = [
    { key: "grossPayPerPeriod", label: "Gross Pay (per payment)", format: "currency", currency: "CAD" },
    { key: "federalTax", label: "Federal Tax (per payment)", format: "currency", currency: "CAD" },
    {
      key: "provincialTax",
      label: `${p.name} Provincial Tax (per payment)`,
      format: "currency",
      currency: "CAD",
    },
  ];
  if (p.baseline.extraLine) {
    lines.push({
      key: "ontarioHealthPremium",
      label: p.baseline.extraLine.label,
      format: "currency",
      currency: "CAD",
    });
  }
  lines.push({
    key: p.baseline.payrollLabel === "QPP" ? "qpp" : "cpp",
    label: `${p.baseline.payrollLabel} Contribution (per payment)`,
    format: "currency",
    currency: "CAD",
  });
  if (p.baseline.secondPayrollLabel) {
    lines.push({
      key: "qpip",
      label: `${p.baseline.secondPayrollLabel} Premium (per payment)`,
      format: "currency",
      currency: "CAD",
    });
  }
  lines.push({ key: "ei", label: "EI Premium (per payment)", format: "currency", currency: "CAD" });
  lines.push({ key: "totalDeductions", label: "Total Deductions (per payment)", format: "currency", currency: "CAD" });
  lines.push({
    key: "netPayPerPeriod",
    label: "Your Take-Home Pay (per payment)",
    format: "currency",
    currency: "CAD",
    highlight: true,
  });
  lines.push({ key: "annualNetPay", label: "Estimated Annual Take-Home Pay", format: "currency", currency: "CAD" });
  return lines;
}

export function buildInstructions(p: CanadaProvinceContent): string {
  return (
    `This ${p.name} income tax calculator works out what's actually taken out of your salary — federal tax, ` +
    `${p.name} provincial tax, ${p.baseline.payrollLabel === "QPP" ? "QPP" : "CPP"}, and EI` +
    `${p.baseline.secondPayrollLabel ? `, plus ${p.baseline.secondPayrollLabel}` : ""} — and what you take home.\n\n` +
    "Enter your annual salary and choose how often you're paid. Add any pre-tax deductions (such as RRSP " +
    "contributions made through payroll) and post-tax deductions if they apply to you — otherwise leave them at " +
    "$0. Click Calculate to see a full breakdown, both per payment and for the year.\n\n" +
    "Canada's income tax works differently from a flat deduction: your Basic Personal Amount isn't subtracted " +
    `from your income before tax is calculated — it's a tax CREDIT, worth your Basic Personal Amount multiplied ` +
    `by the lowest bracket rate, subtracted from the tax you'd otherwise owe. This calculator applies that credit ` +
    `for both the federal Basic Personal Amount and ${p.name}'s own Basic Personal Amount ($${p.bpa.toLocaleString()}) automatically.` +
    (p.specialNote ? `\n\n${p.specialNote}` : "")
  );
}

export function buildAssumptions(p: CanadaProvinceContent): string {
  return (
    `This calculator uses confirmed 2026 tax year figures: federal brackets from 14% up to 33%, a federal Basic ` +
    `Personal Amount of $16,452 (tapering to $14,829 for taxable income between $181,440 and $258,482), and ` +
    `${p.name}'s own 2026 brackets (${p.bracketDescription}) with a $${p.bpa.toLocaleString()} Basic Personal ` +
    `Amount credited at ${p.lowestRatePercent}. ` +
    (p.baseline.payrollLabel === "QPP"
      ? "It includes the Quebec Pension Plan (QPP, including the QPP2 second-additional tier above $74,600 of " +
        "earnings) and the Quebec Parental Insurance Plan (QPIP) instead of CPP, and EI at Quebec's own reduced " +
        "rate, since Quebec administers these separately from the rest of Canada.\n\n"
      : "It includes CPP (Canada Pension Plan, including the CPP2 second-additional tier above $74,600 of " +
        "earnings) and EI (Employment Insurance) at the standard 2026 rates.\n\n") +
    "It doesn't account for other non-refundable tax credits (such as the Canada Employment Amount, medical " +
    "expenses, or tuition), RRSP contribution room limits, or every possible payroll deduction, so treat it as a " +
    "close estimate rather than an exact paystub figure — your actual take-home pay may vary depending on your " +
    "personal tax situation and your employer's payroll system.\n\n" +
    "Pre-tax deductions you enter (like RRSP contributions made through payroll) are assumed to reduce pay for " +
    "both income tax and payroll deductions alike — some deduction types only reduce one or the other, which " +
    "this calculator doesn't distinguish between.\n\n" +
    "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
    "advice. For guidance specific to your situation, consult a qualified accountant, tax professional, or the " +
    "CRA (or Revenu Québec, for Quebec residents) directly."
  );
}

export function buildExamples(p: CanadaProvinceContent): string {
  const b = p.baseline;
  const parts = [
    `Example: someone earning $60,000 a year in ${p.name}, paid monthly, with no pre-tax or post-tax ` +
      `deductions, takes home approximately ${money(b.netMonthly)} per month — about ${money(b.annualNet)} for ` +
      `the year — after federal tax (${money(b.federalTaxMonthly)}/month), ${p.name} provincial tax ` +
      `(${money(b.provincialTaxMonthly)}/month)` +
      (b.extraLine ? `, the ${b.extraLine.label.replace(" (per payment)", "")} (${money(b.extraLine.monthly)}/month)` : "") +
      `, ${b.payrollLabel} (${money(b.payrollMonthly)}/month)` +
      (b.secondPayrollLabel ? `, ${b.secondPayrollLabel} (${money(b.secondPayrollMonthly ?? 0)}/month)` : "") +
      `, and EI (${money(b.eiMonthly)}/month).`,
  ];
  return parts.join("\n\n");
}

export function buildFaq(p: CanadaProvinceContent) {
  const base = [
    {
      question: `Why isn't the Basic Personal Amount just subtracted from my income, like a standard deduction?`,
      answer:
        "In Canada, the Basic Personal Amount is a non-refundable tax CREDIT, not a deduction — it's multiplied " +
        "by the lowest tax bracket rate (federally, and separately for the province or territory) and that " +
        "amount is subtracted from the tax you'd otherwise owe, after applying the bracket rates to your full " +
        "taxable income. This calculator applies both credits automatically.",
    },
    {
      question: `What payroll deductions does this calculator include for ${p.name}?`,
      answer:
        b.faqPayrollAnswer(p),
    },
    {
      question: "How accurate is this calculator?",
      answer:
        "It's an estimate, using confirmed 2026 federal and " +
        `${p.name} tax figures. It doesn't account for every non-refundable credit, RRSP contribution limits, ` +
        "or every possible payroll deduction, so your actual pay stub may differ slightly.",
    },
    {
      question: "How do pre-tax deductions affect my take-home pay?",
      answer:
        "Pre-tax deductions (like RRSP contributions made through payroll) are subtracted from your pay before " +
        "federal tax, provincial tax, and payroll deductions are calculated, which lowers all of them — so your " +
        "take-home pay drops by less than the full deduction amount.",
    },
  ];
  return base;
}

// Small helper object used only by buildFaq above, to keep that function
// readable — not exported.
const b = {
  faqPayrollAnswer(p: CanadaProvinceContent): string {
    if (p.baseline.payrollLabel === "QPP") {
      return (
        "Federal income tax, Quebec provincial income tax, the Quebec Pension Plan (QPP, including the QPP2 " +
        "tier above $74,600 of earnings), the Quebec Parental Insurance Plan (QPIP), and Employment Insurance " +
        "(EI) at Quebec's own reduced rate — Quebec administers pension and parental-leave contributions " +
        "separately from the rest of Canada."
      );
    }
    return (
      `Federal income tax, ${p.name} provincial income tax, the Canada Pension Plan (CPP, including the CPP2 ` +
      "tier above $74,600 of earnings), and Employment Insurance (EI)." +
      (p.specialNote ? " Ontario also includes the Ontario Health Premium and Ontario Surtax where they apply." : "")
    );
  },
};

export function buildToolContent(p: CanadaProvinceContent, categoryId: string) {
  return {
    title: `${p.name} Income Tax Calculator`,
    description:
      `Work out federal tax, ${p.name} provincial tax, and take-home pay with this ${p.name} income tax ` +
      `calculator. Enter your salary and pay frequency to see a full breakdown for 2026.`,
    templateKey: "tool-template-3",
    categoryId,
    calcType: "custom" as const,
    calcFormula: null,
    calcInputs: JSON.stringify(buildCalcInputs()),
    calcResult: JSON.stringify({ label: "Take-Home Pay", unit: "", format: "currency", currency: "CAD" }),
    calcResults: JSON.stringify(buildCalcResults(p)),
    instructions: paragraphsToHtml(buildInstructions(p)),
    examples: paragraphsToHtml(buildExamples(p)),
    assumptions: paragraphsToHtml(buildAssumptions(p)),
    faq: JSON.stringify(buildFaq(p)),
  };
}

export function buildSeoMeta(p: CanadaProvinceContent) {
  return {
    contentType: "tool",
    metaTitle: `${p.name} Income Tax Calculator (2026) — Salary & Take-Home Pay`,
    metaDescription:
      `Free ${p.name} income tax calculator. Estimate federal tax, provincial tax, and take-home pay for 2026.`,
    schemaType: "SoftwareApplication",
  };
}
