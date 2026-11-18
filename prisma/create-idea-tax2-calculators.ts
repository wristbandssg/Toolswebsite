// Idea build, batch tax2 (18 Nov 2026): Europe (3) + Latin America & Africa (1) = 4 tools, built after the 2026 tables were verified.
// Rules and sources: src/lib/calc-engine-idea-tax2.ts. Still held (2026 tables unverified): see create-idea-tax1-calculators.ts header.
// Create-only. Run: npm run db:create-idea-tax2-calculators

import * as E from "../src/lib/calc-engine-idea-tax2";
import { t, num, pct, dd, runIdeas, type ToolDef } from "./idea-kit";

const p = (k: string, l: string, d: number) => num(k, l, d, 0, 1e12, 0.01);
const G = "Estimate for planning — payroll rules, allowances and personal circumstances change the real figure. Check your payslip or a tax adviser.";

const EU: ToolDef[] = [
  t({ slug: "germany-net-salary-brutto-netto-calculator", fn: E.deBruttoNetto, title: "Germany Brutto Netto Calculator (2026)", desc: "Convert a German gross monthly salary to net after Lohnsteuer, Soli, church tax and social insurance (2026).", in: [p("g", "Gross Monthly Salary (€)", 4500), dd("c", "Tax Class", ["I / IV", "II (single parent)", "III (married, splitting)"], 0), pct("z", "Health Insurance Zusatzbeitrag (%)", 2.9, 5), dd("k", "Childless (23+)?", ["No", "Yes (+0.6% PV)"], 0), dd("r", "Church Tax", ["None", "8% (BY, BW)", "9% (other states)"], 0)], r: "n:Net Salary|d:Deductions|note:Note", ex: { g: 4500, c: 0, z: 2.9, k: 0, r: 0 }, how: "Net = gross − Lohnsteuer (2026 §32a tariff) − Soli − church tax − RV, AV, KV, PV.", as: G, faq: ["How much is net from €4,500 gross in Germany?", "Roughly €2,900 a month in tax class I without church tax.", "What are the 2026 contribution ceilings?", "€8,450/month for pension and unemployment, €5,812.50 for health and care."] }),
  t({ slug: "germany-solidarity-surcharge-calculator", fn: E.deSoli, title: "Germany Solidarity Surcharge (Soli) Calculator", desc: "Check whether you pay the German Solidaritätszuschlag in 2026 and how much.", in: [dd("m", "Enter", ["Taxable income (zvE)", "Income tax amount"], 0), p("x", "Amount (€)", 60000), dd("s", "Assessment", ["Single", "Joint (married)"], 0)], r: "s:Soli|d:Details|note:Note", ex: { m: 0, x: 60000, s: 0 }, how: "Soli = 5.5% of income tax above the €20,350 Freigrenze, limited to 11.9% of the excess.", as: G, faq: ["Who still pays Soli in 2026?", "People whose income tax exceeds €20,350 (single).", "What is the Milderungszone?", "A phase-in where Soli is capped at 11.9% of the excess."] }),
  t({ slug: "netherlands-net-salary-calculator", fn: E.nlNet, title: "Netherlands Net Salary Calculator (2026)", desc: "Estimate Dutch net salary after box 1 tax and the 2026 general and labour tax credits.", in: [p("g", "Annual Gross Salary (€, excl. holiday pay)", 50000), dd("h", "Add 8% Holiday Allowance?", ["Yes", "No"], 0), pct("p", "Employee Pension Contribution (%)", 0, 30), p("a", "Arbeidskorting (€, blank = auto)", 0)], r: "n:Net Salary|d:Breakdown|note:Note", ex: { g: 50000, h: 0, p: 0, a: 0 }, how: "Net = gross − (box 1 tax − algemene heffingskorting − arbeidskorting) − pension.", as: G, faq: ["What are the Dutch tax rates for 2026?", "35.75%, 37.56% and 49.5%.", "What is the general tax credit in 2026?", "Up to €3,115, reduced above €29,736."] }),
];

const LA: ToolDef[] = [
  t({ slug: "nigeria-paye-tax-calculator", fn: E.ngPaye, title: "Nigeria PAYE Calculator (2026 Tax Act)", desc: "Calculate Nigerian PAYE under the Nigeria Tax Act 2025 bands with pension, NHF and rent relief.", in: [p("g", "Annual Gross Income (₦)", 6000000), p("b", "Pensionable Pay (₦, blank = gross)", 0), pct("p", "Employee Pension Rate (%)", 8, 20), p("n", "NHF Contribution (₦/yr)", 0), p("h", "NHIS Contribution (₦/yr)", 0), p("r", "Annual Rent Paid (₦)", 0)], r: "t:PAYE|n:Take-Home|note:Calculation", ex: { g: 6000000, b: 0, p: 8, n: 0, h: 0, r: 0 }, how: "Taxable = gross − pension − NHF − NHIS − rent relief; 0% on first ₦800k then 15–25%.", as: G, faq: ["What is tax-free in Nigeria from 2026?", "The first ₦800,000 of taxable income.", "What is rent relief?", "20% of annual rent, up to ₦500,000."] }),
];

runIdeas([["europe-tax-salary-calculators", EU], ["latin-america-africa-tax-salary-calculators", LA]]).catch((e) => { console.error(e); process.exit(1); });
