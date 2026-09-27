// One-time (but safe to re-run) batch setup script: creates 15 US state
// Payroll Tax Tools inside the existing "Tax & Paycheck Calculators"
// category — third batch of the 50-state audit.
//
// See src/lib/calc-engine-us-payroll-tax-extended.ts for the actual math
// and that file's header for which states have a genuine state-level
// payroll premium beyond ordinary withholding/SUTA (paid-family-leave,
// TDI/SDI-style programs), and Maryland's deliberate omission (FAMLI not
// yet collecting).
//
// HOW TO RUN
//   npx tsx prisma/create-us-payroll-tax-extended-calculators.ts
// or
//   npm run db:create-us-payroll-tax-extended-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "tax-paycheck-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(key: string, label: string, opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 300_000, step: opts.step ?? 1_000 };
}
function dropdownField(key: string, label: string, options: { label: string; value: number }[], defaultValue = 0) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}
function numberField(key: string, label: string, opts: { min?: number; max?: number; default?: number; step?: number } = {}) {
  return { key, label, type: "number", required: false, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}
function currencyResult(key: string, label: string, opts: { highlight?: boolean } = {}) {
  return { key, label, format: "currency", highlight: opts.highlight };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice, and shows the EMPLOYEE-paid share only — not any separate employer contribution — unless noted " +
  "otherwise. Consult your pay stub, your employer's payroll department, or the state agency that administers " +
  "this program for your exact withholding.";

const annualWagesField = currencyField("annualWages", "Annual Wages (Gross)", { max: 400_000 });
const SS_WAGE_BASE_PLACEHOLDER = 184_500;

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "alaska-payroll-tax-calculator",
    title: "Alaska Payroll Tax Calculator",
    description:
      "Alaska is one of only a few states requiring an employee-paid share of state unemployment insurance — " +
      "estimate your 0.5% contribution, capped at the state's UI wage base.",
    metaTitle: "Alaska Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Alaska payroll tax calculator. Alaska requires an employee-paid UI contribution of 0.5%, capped at the state wage base.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("wageBaseApplied", "UI Wage Base Applied"), currencyResult("employeePayrollTax", "Alaska Employee Payroll Tax", { highlight: true })],
    instructions:
      "Alaska is one of only three US states (along with New Jersey and Pennsylvania) that require employees " +
      "to contribute directly to state unemployment insurance, rather than funding it entirely through an " +
      "employer-paid tax. Alaska's employee share is 0.5% of wages, capped at the state's UI taxable wage " +
      "base. Enter your annual wages to see your estimated contribution.",
    assumptions: "This calculator uses Alaska's 0.5% employee UI contribution rate and its $54,200 UI wage base.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $70,000 in annual wages. Only the first $54,200 counts toward this contribution: $54,200 x 0.5% = $271.",
    faq: [{ question: "Why does Alaska charge employees for unemployment insurance?", answer: "Alaska is one of only three states (with New Jersey and Pennsylvania) that split UI funding between employer and employee, rather than funding it entirely from an employer-paid tax." }],
  },
  {
    slug: "california-payroll-tax-calculator",
    title: "California Payroll Tax Calculator",
    description: "Estimate California's State Disability Insurance (SDI) payroll tax — 1.3% of wages, with no wage cap.",
    metaTitle: "California Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free California payroll tax calculator. Estimate SDI: 1.3% of all wages, with no cap.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("employeePayrollTax", "California SDI Tax", { highlight: true })],
    instructions:
      "California's State Disability Insurance (SDI) program, which also funds Paid Family Leave, is deducted " +
      "from every paycheck at 1.3% of wages — and unlike most payroll taxes, there's no wage cap: every dollar " +
      "of wages is subject to it. Enter your annual wages to see your estimated SDI contribution.",
    assumptions: "This calculator uses California's current 1.3% SDI rate, applied without a wage cap.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $150,000 in annual wages. SDI: $150,000 x 1.3% = $1,950 — the full amount, since there's no cap.",
    faq: [{ question: "Is there a wage cap on California SDI?", answer: "No — unlike Social Security, every dollar of wages is subject to the 1.3% SDI rate." }],
  },
  {
    slug: "colorado-payroll-tax-calculator",
    title: "Colorado Payroll Tax Calculator",
    description: "Estimate your share of Colorado's FAMLI paid-leave payroll tax — 0.44% employee / 0.44% employer, capped at the Social Security wage base.",
    metaTitle: "Colorado Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Colorado payroll tax calculator. FAMLI paid leave: 0.44% employee share, capped at the SS wage base.",
    calcInputs: [annualWagesField],
    calcResults: [
      currencyResult("wageBaseApplied", "Wage Base Applied"),
      currencyResult("employeePayrollTax", "Colorado FAMLI — Your Share", { highlight: true }),
      currencyResult("employerShare", "Employer's Matching Share"),
      currencyResult("totalFamliContribution", "Total FAMLI Contribution"),
    ],
    instructions:
      "Colorado's Family and Medical Leave Insurance (FAMLI) program is funded 0.88% total, split evenly " +
      "between employer and employee (0.44% each), capped at the Social Security wage base. Enter your annual " +
      "wages to see your own 0.44% share.",
    assumptions: `This calculator uses Colorado's 0.44%/0.44% FAMLI split and the $${SS_WAGE_BASE_PLACEHOLDER} Social Security wage base as its cap.\n\n${GENERAL_DISCLAIMER}`,
    examples: "Example: $100,000 in annual wages. Your FAMLI share: $100,000 x 0.44% = $440; your employer matches with another $440.",
    faq: [{ question: "Do I pay the whole FAMLI premium?", answer: "No — it's split evenly, 0.44% from you and 0.44% from your employer." }],
  },
  {
    slug: "connecticut-payroll-tax-calculator",
    title: "Connecticut Payroll Tax Calculator",
    description: "Estimate Connecticut's Paid Leave payroll tax — 0.5% of wages, entirely employee-paid, capped at the Social Security wage base.",
    metaTitle: "Connecticut Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Connecticut payroll tax calculator. CT Paid Leave: 0.5% of wages, employee-paid, capped at the SS wage base.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("wageBaseApplied", "Wage Base Applied"), currencyResult("employeePayrollTax", "Connecticut Paid Leave Tax", { highlight: true })],
    instructions:
      "Connecticut's Paid Leave program is funded entirely by employees at 0.5% of wages, capped at the Social " +
      "Security wage base — there's no employer match. Enter your annual wages to see your estimated " +
      "contribution.",
    assumptions: `This calculator uses Connecticut's 0.5% employee-paid rate and the $${SS_WAGE_BASE_PLACEHOLDER} Social Security wage base as its cap.\n\n${GENERAL_DISCLAIMER}`,
    examples: "Example: $80,000 in annual wages. Connecticut Paid Leave tax: $80,000 x 0.5% = $400.",
    faq: [{ question: "Does my employer contribute to CT Paid Leave too?", answer: "No — this program is funded entirely by employees, with no employer match." }],
  },
  {
    slug: "delaware-payroll-tax-calculator",
    title: "Delaware Payroll Tax Calculator",
    description: "Estimate Delaware's new Paid Leave payroll tax — 0.4% employee share of a 0.8% total program that began collecting in 2025.",
    metaTitle: "Delaware Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Delaware payroll tax calculator. DE Paid Leave: 0.4% employee share of a new 0.8% program.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("employeePayrollTax", "Delaware Paid Leave — Your Share", { highlight: true })],
    instructions:
      "Delaware Paid Leave is a brand-new program: contributions began in 2025, with benefits payable starting " +
      "in 2026. It's funded 0.8% total, split evenly between employer and employee — 0.4% each. Enter your " +
      "annual wages to see your estimated share.",
    assumptions:
      "This calculator uses Delaware's 0.4% employee share of the 0.8% total program. Whether this program " +
      "applies a wage cap (similar to several other states' paid-leave programs) wasn't confirmed by this " +
      "tool's research — this calculator models it uncapped; verify with the Delaware Department of Labor if " +
      "your wages are high.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: $60,000 in annual wages. Delaware Paid Leave, your share: $60,000 x 0.4% = $240.",
    faq: [{ question: "Is Delaware Paid Leave a new program?", answer: "Yes — contributions began in 2025, with benefits first payable in 2026." }],
  },
  {
    slug: "hawaii-payroll-tax-calculator",
    title: "Hawaii Payroll Tax Calculator",
    description: "Estimate Hawaii's Temporary Disability Insurance (TDI) payroll tax — up to 0.5% of wages, subject to a low weekly cap.",
    metaTitle: "Hawaii Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Hawaii payroll tax calculator. TDI: up to 0.5% of wages, subject to a low weekly contribution cap.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("employeePayrollTax", "Hawaii TDI Tax (uncapped estimate)", { highlight: true })],
    instructions:
      "Hawaii's Temporary Disability Insurance (TDI) program allows employers to deduct up to 0.5% of an " +
      "employee's wages. Enter your annual wages to see an estimate at that rate.",
    assumptions:
      "IMPORTANT: Hawaii TDI actually caps the employee's weekly contribution at a small dollar figure set by " +
      "the state each year — this calculator shows an UNCAPPED 0.5% estimate, which is likely HIGHER than " +
      "what's actually withheld from your paycheck. Check your pay stub or the Hawaii Department of Labor and " +
      "Industrial Relations for the actual current weekly cap.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: $60,000 in annual wages. Uncapped estimate: $60,000 x 0.5% = $300 — your actual TDI deduction is likely lower due to the weekly cap.",
    faq: [{ question: "Is this calculator's figure exactly what I'll pay?", answer: "Likely not — it's an uncapped estimate. Hawaii TDI caps the actual weekly employee contribution at a low dollar amount, so your real deduction is probably smaller than this estimate." }],
  },
  {
    slug: "maine-payroll-tax-calculator",
    title: "Maine Payroll Tax Calculator",
    description: "Estimate Maine's Paid Family and Medical Leave payroll tax — 0.5% employee share at larger employers, fully employer-paid at smaller ones.",
    metaTitle: "Maine Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Maine payroll tax calculator. PFML: 0.5% employee share for employers with 15+ staff; $0 for employees at smaller employers.",
    calcInputs: [annualWagesField, dropdownField("employerSize", "Your Employer's Size", [
      { label: "Fewer than 15 employees", value: 0 },
      { label: "15 or more employees", value: 1 },
    ])],
    calcResults: [currencyResult("employeePayrollTax", "Maine PFML — Your Share", { highlight: true })],
    instructions:
      "Maine's Paid Family and Medical Leave (PFML) program works differently depending on your employer's " +
      "size. At employers with 15 or more employees, the 1% total program cost is split evenly, so you pay " +
      "0.5%. At smaller employers (fewer than 15), the employer covers the full 0.5% rate alone — you owe " +
      "nothing. Select your employer's size and enter your annual wages.",
    assumptions: "This calculator uses Maine's published 15-employee threshold and even 0.5%/0.5% split at larger employers.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $55,000 in annual wages at an employer with 20 staff. Your PFML share: $55,000 x 0.5% = $275.",
    faq: [{ question: "Do small-employer workers pay anything toward PFML?", answer: "No — at employers with fewer than 15 employees, the employer covers the entire premium; employees don't have anything withheld for it." }],
  },
  {
    slug: "massachusetts-payroll-tax-calculator",
    title: "Massachusetts Payroll Tax Calculator",
    description: "Estimate your share of Massachusetts's Paid Family and Medical Leave (PFML) payroll tax — a combined 0.88% program, capped at the Social Security wage base.",
    metaTitle: "Massachusetts Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Massachusetts payroll tax calculator. PFML: an estimated employee share of the 0.88% combined program.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("wageBaseApplied", "Wage Base Applied"), currencyResult("employeePayrollTax", "Massachusetts PFML — Estimated Share", { highlight: true })],
    instructions:
      "Massachusetts's Paid Family and Medical Leave (PFML) program totals 0.88% of wages (0.70% medical + " +
      "0.18% family), capped at the Social Security wage base, with the exact employer/employee split varying " +
      "by employer size and which portion (medical vs. family) is involved. This calculator estimates your " +
      "share as roughly half the total program cost. Enter your annual wages to see the estimate.",
    assumptions:
      "This calculator estimates the employee share as roughly 0.44% (half of the 0.88% total), which is a " +
      "simplification — Massachusetts's actual split varies by employer size (employers with 25+ workers must " +
      "cover a larger portion of the medical piece) and whether medical or family leave contributions are " +
      "involved. Check your pay stub for your exact withholding.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: $90,000 in annual wages. Estimated PFML share: $90,000 x 0.44% = $396.",
    faq: [{ question: "Is the employee/employer split always 50/50 in Massachusetts?", answer: "No — it varies by employer size and by whether it's the medical or family leave portion. This calculator uses roughly half as an estimate; check your actual pay stub for your precise withholding." }],
  },
  {
    slug: "minnesota-payroll-tax-calculator",
    title: "Minnesota Payroll Tax Calculator",
    description: "Estimate your share of Minnesota's brand-new (2026) Paid Leave payroll tax — 0.44% at larger employers, a reduced 0.33% at employers with 30 or fewer staff.",
    metaTitle: "Minnesota Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Minnesota payroll tax calculator. MN Paid Leave, first year live in 2026: 0.44% (or 0.33% at smaller employers) employee share.",
    calcInputs: [annualWagesField, dropdownField("employerSize", "Your Employer's Size", [
      { label: "30 or fewer employees (reduced rate)", value: 0 },
      { label: "More than 30 employees", value: 1 },
    ])],
    calcResults: [currencyResult("wageBaseApplied", "Wage Base Applied"), currencyResult("employeePayrollTax", "Minnesota Paid Leave — Your Share", { highlight: true })],
    instructions:
      "Minnesota Paid Leave became active for the first time in January 2026. The total program cost is 0.88% " +
      "at larger employers (split evenly, so 0.44% is your share) or a reduced 0.66% at employers with 30 or " +
      "fewer employees (so your share is 0.33%), capped at the Social Security wage base. Select your " +
      "employer's size and enter your annual wages.",
    assumptions: `This calculator uses Minnesota's published 0.88%/0.66% total rates (by employer size) with an even split, capped at the $${SS_WAGE_BASE_PLACEHOLDER} Social Security wage base. As a first-year program, verify current figures with the Minnesota Department of Employment and Economic Development.\n\n${GENERAL_DISCLAIMER}`,
    examples: "Example: $70,000 in annual wages at a large employer. Your share: $70,000 x 0.44% = $308.",
    faq: [{ question: "Is Minnesota Paid Leave a new program?", answer: "Yes — it went live for the first time in January 2026." }],
  },
  {
    slug: "new-jersey-payroll-tax-calculator",
    title: "New Jersey Payroll Tax Calculator",
    description: "Estimate New Jersey's combined TDI (0.19%) and FLI (0.23%) employee payroll taxes, capped at New Jersey's own wage base.",
    metaTitle: "New Jersey Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New Jersey payroll tax calculator. TDI + FLI: 0.42% combined employee share, capped at NJ's wage base.",
    calcInputs: [annualWagesField],
    calcResults: [
      currencyResult("wageBaseApplied", "Wage Base Applied"),
      currencyResult("tdiContribution", "Temporary Disability Insurance (TDI)"),
      currencyResult("fliContribution", "Family Leave Insurance (FLI)"),
      currencyResult("employeePayrollTax", "Total New Jersey Payroll Tax", { highlight: true }),
    ],
    instructions:
      "New Jersey withholds two separate employee-paid payroll taxes: Temporary Disability Insurance (TDI) at " +
      "0.19% and Family Leave Insurance (FLI) at 0.23%, both capped at New Jersey's own wage base ($171,100). " +
      "Enter your annual wages to see each contribution and the combined total.",
    assumptions: "This calculator uses New Jersey's 0.19% TDI and 0.23% FLI rates, both capped at the $171,100 wage base.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $90,000 in annual wages. TDI: $90,000 x 0.19% = $171. FLI: $90,000 x 0.23% = $207. Total: $378.",
    faq: [{ question: "Are TDI and FLI the same tax?", answer: "No — they're two separate programs (disability insurance and family leave insurance) with their own rates, though both share the same wage base cap." }],
  },
  {
    slug: "new-york-payroll-tax-calculator",
    title: "New York Payroll Tax Calculator",
    description: "Estimate New York's Paid Family Leave (PFL) payroll tax — 0.432% of wages, capped at an annual dollar maximum.",
    metaTitle: "New York Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free New York payroll tax calculator. PFL: 0.432% of wages, capped at $411.91 per year.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("annualCapApplied", "Annual Cap"), currencyResult("employeePayrollTax", "New York PFL Tax", { highlight: true })],
    instructions:
      "New York's Paid Family Leave (PFL) program is funded by an employee payroll deduction of 0.432% of " +
      "wages, capped at a fixed annual dollar maximum ($411.91) regardless of how high your wages are. Enter " +
      "your annual wages to see your estimated contribution.\n\n" +
      "New York also has a separate employer-side payroll tax in the New York City/MTA region (the MCTMT), " +
      "based on an employer's total payroll expense rather than any individual employee's wages — that's not " +
      "something an individual employee sees withheld, so it isn't modeled in this per-employee tool.",
    assumptions: "This calculator uses New York's 0.432% PFL rate and its $411.91 annual cap.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $120,000 in annual wages. Uncapped, that would be $518.40 — but the annual cap limits it to $411.91.",
    faq: [{ question: "Is there a maximum I'll ever pay for NY PFL?", answer: "Yes — $411.91 per year, regardless of how high your wages are." }],
  },
  {
    slug: "oregon-payroll-tax-calculator",
    title: "Oregon Payroll Tax Calculator",
    description: "Estimate Oregon's Statewide Transit Tax — a flat 0.1% of wages, with no cap.",
    metaTitle: "Oregon Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Oregon payroll tax calculator. Statewide Transit Tax: 0.1% of all wages.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("employeePayrollTax", "Oregon Statewide Transit Tax", { highlight: true })],
    instructions:
      "Oregon withholds a Statewide Transit Tax of 0.1% of wages from every paycheck, with no cap — a small but " +
      "universal deduction that funds public transit programs. A May 2026 ballot measure to raise this rate " +
      "failed, so it remains at 0.1%. Enter your annual wages to see your estimated contribution.",
    assumptions: "This calculator uses Oregon's current 0.1% rate, confirmed unchanged after the May 2026 ballot measure failed.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $55,000 in annual wages. Statewide Transit Tax: $55,000 x 0.1% = $55.",
    faq: [{ question: "Did Oregon just raise this tax?", answer: "No — a ballot measure to raise it failed in May 2026, so the rate remains 0.1%." }],
  },
  {
    slug: "rhode-island-payroll-tax-calculator",
    title: "Rhode Island Payroll Tax Calculator",
    description: "Estimate Rhode Island's TDI/TCI payroll tax — 1.1% of wages, capped at the state's own $100,000 wage base.",
    metaTitle: "Rhode Island Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Rhode Island payroll tax calculator. TDI/TCI: 1.1% of wages, capped at a $100,000 wage base.",
    calcInputs: [annualWagesField],
    calcResults: [currencyResult("wageBaseApplied", "Wage Base Applied"), currencyResult("employeePayrollTax", "Rhode Island TDI/TCI Tax", { highlight: true })],
    instructions:
      "Rhode Island's Temporary Disability Insurance / Temporary Caregiver Insurance (TDI/TCI) program is " +
      "funded entirely by employees, at 1.1% of wages, capped at a $100,000 wage base for 2026. Enter your " +
      "annual wages to see your estimated contribution.",
    assumptions: "This calculator uses Rhode Island's 1.1% employee rate and its $100,000 (2026) wage base.\n\n" + GENERAL_DISCLAIMER,
    examples: "Example: $120,000 in annual wages. Only the first $100,000 is subject to this tax: $100,000 x 1.1% = $1,100.",
    faq: [{ question: "Is TDI/TCI capped like Social Security?", answer: "Yes — only wages up to $100,000 (2026) are subject to it; anything above that isn't taxed further for this program." }],
  },
  {
    slug: "vermont-payroll-tax-calculator",
    title: "Vermont Payroll Tax Calculator",
    description: "Estimate Vermont's Child Care Contribution (CCC) — 0.44% of wages, normally employer-paid (with limited pass-through), or 0.11% for the self-employed.",
    metaTitle: "Vermont Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Vermont payroll tax calculator. Child Care Contribution: normally employer-paid, up to 25% may be passed through to employees; self-employed pay 0.11% directly.",
    calcInputs: [
      annualWagesField,
      dropdownField("workerType", "Your Work Status", [
        { label: "Employee", value: 0 },
        { label: "Self-Employed", value: 1 },
      ]),
      numberField("employerPassThroughPercent", "Employer Pass-Through (% of the 0.44%, employees only)", { min: 0, max: 25, default: 0, step: 5 }),
    ],
    calcResults: [currencyResult("employeePayrollTax", "Vermont Child Care Contribution — Your Cost", { highlight: true })],
    instructions:
      "Vermont's Child Care Contribution (CCC) funds child care programs at 0.44% of wages. For employees, " +
      "this is normally paid entirely by the employer — but Vermont law allows an employer to pass through up " +
      "to 25% of that 0.44% to the employee's paycheck. If you're self-employed, you pay a separate, lower " +
      "0.11% rate directly on your self-employment income.\n\n" +
      "Select whether you're an employee or self-employed. If you're an employee, enter what percentage (0-25%) " +
      "your employer passes through to you — check your pay stub, or assume 0% if you're not sure your " +
      "employer passes any of it through.",
    assumptions:
      "This calculator uses Vermont's 0.44% CCC rate (employer-side, with up to 25% passable to employees) and " +
      "0.11% self-employment rate. Most employees see $0 out of pocket unless their employer specifically " +
      "elects to pass through part of the cost.\n\n" +
      GENERAL_DISCLAIMER,
    examples: "Example: an employee earning $60,000 whose employer passes through the maximum 25%. Cost: $60,000 x 0.44% x 25% = $66.",
    faq: [
      { question: "Do most employees pay anything toward this?", answer: "Often not — the CCC is designed to be employer-paid, and pass-through to employees (up to 25% of the 0.44%) is optional for the employer, not automatic." },
      { question: "What if I'm self-employed?", answer: "Self-employed Vermonters pay a separate, lower 0.11% rate directly on their self-employment income." },
    ],
  },
  {
    slug: "washington-payroll-tax-calculator",
    title: "Washington Payroll Tax Calculator",
    description: "Estimate your combined share of Washington's two payroll programs: PFML (capped, split with employer) and the WA Cares long-term care fund (uncapped, fully employee-paid).",
    metaTitle: "Washington Payroll Tax Calculator (2026) — Free & Instant",
    metaDescription: "Free Washington payroll tax calculator. Combines PFML (your ~71% share of 1.13%) and WA Cares (0.58%, uncapped, employee-paid).",
    calcInputs: [annualWagesField],
    calcResults: [
      currencyResult("wageBaseApplied", "PFML Wage Base Applied"),
      currencyResult("pfmlEmployeeContribution", "PFML — Your Share"),
      currencyResult("waCaresContribution", "WA Cares Fund (Long-Term Care)"),
      currencyResult("employeePayrollTax", "Total Washington Payroll Tax", { highlight: true }),
    ],
    instructions:
      "Washington has two separate state-level payroll programs. Paid Family and Medical Leave (PFML) totals " +
      "1.13% of wages for 2026, split roughly 28.6% employer / 71.4% employee, capped at the Social Security " +
      "wage base. The WA Cares Fund (a long-term care benefit) is a separate 0.58% deduction, paid entirely by " +
      "the employee with NO wage cap. Enter your annual wages to see both, plus the combined total.",
    assumptions: `This calculator uses Washington's 2026 PFML rate (1.13% total, ~71.43% employee share, capped at the $${SS_WAGE_BASE_PLACEHOLDER} Social Security wage base) and its 0.58% uncapped WA Cares rate.\n\n${GENERAL_DISCLAIMER}`,
    examples: "Example: $100,000 in annual wages. PFML (your share): $100,000 x 1.13% x 71.43% = ~$807. WA Cares: $100,000 x 0.58% = $580. Combined: ~$1,387.",
    faq: [
      { question: "Is WA Cares capped like PFML?", answer: "No — WA Cares has no wage cap at all, unlike PFML which is capped at the Social Security wage base." },
      { question: "Do I pay all of the PFML premium myself?", answer: "No — it's split, with your employer covering roughly 28.6% and you covering roughly 71.4% of the 1.13% total." },
    ],
  },
];

async function main() {
  const category = await prisma.toolCategory.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Tax & Paycheck Calculators" },
    create: { name: "Tax & Paycheck Calculators", slug: CATEGORY_SLUG, templateKey: "category-template-1", viewStyle: "grid" },
  });

  for (const t of TOOLS) {
    const toolContent = {
      title: t.title,
      description: t.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(t.calcInputs),
      calcResult: JSON.stringify({ label: t.title, unit: "", format: "currency" }),
      calcResults: JSON.stringify(t.calcResults),
      instructions: paragraphsToHtml(t.instructions),
      examples: paragraphsToHtml(t.examples),
      assumptions: paragraphsToHtml(t.assumptions),
      faq: JSON.stringify(t.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await prisma.tool.update({ where: { slug: t.slug }, data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } } });
      console.log(`Updated "${t.slug}".`);
    } else {
      await prisma.tool.create({ data: { slug: t.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } } });
      console.log(`Created "${t.slug}" (status: draft).`);
    }
  }

  console.log(`\nDone — ${TOOLS.length} tools created/updated, all status "draft". Review in /admin/tools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
