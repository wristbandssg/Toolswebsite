// One-time (but safe to re-run) batch setup script: 6 tools from the general keyword check
// (15 Nov 2026 — Claude outputs/General_Keyword_Check.md): S&P 500 return (Finance > Investment
// Returns & Planning), Roth 401(k) (Retirement), married filing jointly vs separately and estate tax
// (Tax & Paycheck), child & teen BMI (Sports Performance), bid bond cost (Construction Materials &
// Estimating). Formulas and data sources: src/lib/calc-engine-gen-fin.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-gen-fin-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-gen-fin";
import { mk, num, money, pct, dd, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.genFinCustomCalculators;

const INVEST: ToolDef[] = [
  mk({
    slug: "sp500-return-calculator", title: "S&P 500 Return Calculator (Historical Growth With Dividends)",
    meta: "S&P 500 Return Calculator — Historical Returns 1928–2025",
    desc: `See what an investment in the S&P 500 would be worth using the real year-by-year returns from 1928 to ${E.SP_END} with dividends reinvested, with yearly contributions, the average annual return (CAGR) and the inflation-adjusted result.`,
    inputs: [num("start", "Start Year (invest at the start of)", 2000, E.SP_START, E.SP_END, 1), num("end", "End Year (value at the end of)", E.SP_END, E.SP_START, E.SP_END, 1), money("amount", "Starting Investment", 10000), money("annual", "Added Each Year (optional)", 0)],
    results: [["value", "Ending Value", "t"], ["cagr", "Average Annual Return (CAGR)", "t"], ["real", "After Inflation", "t"], ["contributed", "Total Invested", "t"], ["gain", "Total Gain", "t"], ["lump", "Growth of $1", "t"], ["extremes", "Best & Worst Years", "t"], ["raw", "Ending Value (number)", "n", 0]],
    fn: C["sp500-return-calculator"], ex: { start: 2000, end: E.SP_END, amount: 10000, annual: 0 },
    exText: (o) => `Example: $10,000 put into the S&P 500 at the start of 2000 grew to ${o.value} by the end of ${E.SP_END} — ${o.cagr} a year, despite the 2000–2002 and 2008 crashes.`,
    how: "Each year's total return (price change plus dividends) is applied in order. A yearly addition is invested at the start of each following year. CAGR is the steady yearly rate that gives the same growth.\n\nThe inflation-adjusted figure divides by the rise in US consumer prices (CPI-U) over the same years, so it shows the value in your start year's dollars.",
    assume: `S&P 500 total returns 1928–${E.SP_END} from Aswath Damodaran, NYU Stern (Historical Returns on Stocks, Bonds and Bills). No fees, taxes or fund tracking error; an index fund's expense ratio would lower the result slightly. CPI uses annual averages. Past returns don't predict future returns.`,
    faq: [["What is the average return of the S&P 500?", "About 10% a year with dividends since 1928, or roughly 6–7% after inflation."], ["Does this include dividends?", "Yes. It uses total return, with dividends reinvested."]],
  }),
];

const RETIRE: ToolDef[] = [
  mk({
    slug: "roth-401k-calculator", title: "Roth 401(k) vs Traditional 401(k) Calculator",
    meta: "Roth 401(k) Calculator — Roth vs Traditional 401(k)",
    desc: "Compare a Roth 401(k) with a traditional 401(k): after-tax balance at retirement, the effect of your tax rate now vs in retirement, your employer match and the 2026 contribution limit ($24,500, plus catch-up).",
    inputs: [money("contrib", "Your Yearly Contribution", 10000), money("match", "Employer Match per Year", 3000), num("years", "Years Until Retirement", 30, 1, 60, 1), pct("ret", "Expected Annual Return", 7, 30), pct("tnow", "Tax Rate Now (marginal)", 22, 60), pct("tret", "Tax Rate in Retirement", 15, 60), num("age", "Your Age", 35, 16, 100, 1), dd("side", "Invest the Traditional Tax Savings?", E.ROTH_SIDE, 0), pct("drag", "Tax Drag on Side-Account Growth", 15, 50)],
    results: [["winner", "Better Choice", "t"], ["roth", "Roth 401(k) After Tax", "t"], ["trad", "Traditional 401(k) After Tax", "t"], ["diff", "Difference", "t"], ["breakeven", "Break-Even Retirement Tax Rate", "t"], ["detail", "Breakdown", "t"], ["limit", "2026 Limit Check", "t"]],
    fn: C["roth-401k-calculator"], ex: { contrib: 10000, match: 3000, years: 30, ret: 7, tnow: 22, tret: 15, age: 35, side: 0, drag: 15 },
    exText: (o) => `Example: $10,000 a year for 30 years at 7%, taxed at 22% now and 15% in retirement: ${o.winner} comes out ahead — Roth ${o.roth} vs traditional ${o.trad}.`,
    how: "A Roth 401(k) is taxed now and withdrawn tax-free; a traditional 401(k) saves tax now and is taxed when you withdraw. If your tax rate in retirement is lower than today, traditional usually wins; if it is higher, Roth wins.\n\nFor a fair comparison, the traditional saver invests the tax saved each year in a taxable account. Employer matches always go into the pre-tax side, so they are taxed on withdrawal either way.",
    assume: "Contributions at the start of each year, a constant return and flat tax rates. 2026 limits: $24,500 employee deferral, +$8,000 catch-up at 50+, or +$11,250 at ages 60–63. Ignores state tax, RMD rules and the 2026 rule that catch-ups for high earners must be Roth.",
    faq: [["Is a Roth 401(k) better than a traditional 401(k)?", "Roth is better if you expect a higher tax rate in retirement; traditional is better if you expect a lower one."], ["Can I contribute to both?", "Yes, but the $24,500 employee limit is shared between them."]],
  }),
];

const TAX: ToolDef[] = [
  mk({
    slug: "married-filing-jointly-vs-separately-calculator", title: "Married Filing Jointly vs Separately Calculator (2026)",
    meta: "Married Filing Jointly vs Separately Calculator 2026",
    desc: "Compare your 2026 federal income tax filing jointly vs separately: both spouses' tax, the Child Tax Credit, itemized vs standard deductions, and the tax you'd pay as two single filers.",
    inputs: [money("ia", "Spouse A Income", 90000), money("ib", "Spouse B Income", 40000), money("da", "Spouse A Itemized Deductions (0 = standard)", 0), money("db", "Spouse B Itemized Deductions (0 = standard)", 0), num("kids", "Children Under 17", 1, 0, 20, 1), dd("who", "Who Claims the Children When Filing Separately", E.CLAIM, 0)],
    results: [["better", "Lower Tax With", "t"], ["saving", "Saving", "t"], ["mfj", "Married Filing Jointly", "t"], ["mfs", "Married Filing Separately", "t"], ["credit", "Child Tax Credit", "t"], ["single", "Marriage Penalty Check", "t"]],
    fn: C["married-filing-jointly-vs-separately-calculator"], ex: { ia: 90000, ib: 40000, da: 0, db: 0, kids: 1, who: 0 },
    exText: (o) => `Example: incomes of $90,000 and $40,000 with one child: filing jointly costs ${String(o.mfj).split(" (")[0]} and separately ${String(o.mfs).split(" total")[0]}, so ${String(o.better).toLowerCase()} saves ${o.saving}.`,
    how: "Jointly, you add both incomes and use the joint brackets and the $32,200 standard deduction. Separately, each spouse uses brackets that are exactly half of the joint ones and a $16,100 deduction. If one spouse itemizes, both must.\n\nFor most couples, filing jointly costs less. Filing separately can help when one spouse has large medical bills, owes back taxes or is on income-driven student loan repayment.",
    assume: "2026 federal brackets and deductions, wages only, Child Tax Credit $2,200 per child phased out above $400,000 joint / $200,000 separate. Ignores state tax, the EITC and education credits (mostly unavailable when filing separately) and IRA deduction limits.",
    faq: [["Is it better to file jointly or separately?", "Jointly usually costs less. Separately helps in specific cases such as income-driven student loan payments or keeping liability separate."], ["Can we switch later?", "You can amend from separate to joint within 3 years, but not from joint to separate after the due date."]],
  }),
  mk({
    slug: "estate-tax-calculator", title: "Estate Tax Calculator (2026 Federal + State Inheritance Tax)",
    meta: "Estate Tax Calculator 2026 — Federal Estate & Inheritance Tax",
    desc: "Estimate 2026 federal estate tax with the $15 million exemption, portability (DSUE) and lifetime gifts, plus inheritance tax in Pennsylvania, New Jersey, Maryland or Nebraska, or a state estate tax at your own rate.",
    inputs: [money("gross", "Gross Estate Value", 20000000, "$", 1e12), money("debts", "Debts, Funeral & Administration Costs", 500000, "$", 1e12), money("marital", "Left to a Spouse (marital deduction)", 0, "$", 1e12), money("charity", "Left to Charity", 0, "$", 1e12), money("gifts", "Lifetime Taxable Gifts (after 1976)", 0, "$", 1e12), money("dsue", "Ported Exemption from a Late Spouse (DSUE)", 0, "$", 1e12), dd("state", "State", E.EST_STATES, 0), dd("heir", "Heir (for inheritance tax)", E.HEIRS, 1), money("share", "Amount This Heir Receives", 1000000, "$", 1e12), money("sex", "State Estate Tax Exemption (custom)", 2000000, "$", 1e12), pct("srate", "State Estate Tax Rate (custom)", 16, 40)],
    results: [["federal", "Federal Estate Tax", "t"], ["taxable", "Taxable Estate", "t"], ["exclusion", "Exemption Used", "t"], ["over", "Above / Below the Exemption", "t"], ["state", "State Tax", "t"], ["net", "Left After Debts & Taxes", "t"], ["rate", "Total Tax as % of the Estate", "t"], ["raw", "Federal Tax (number)", "n", 0]],
    fn: C["estate-tax-calculator"], ex: { gross: 20000000, debts: 500000, marital: 0, charity: 0, gifts: 0, dsue: 0, state: 0, heir: 1, share: 1000000, sex: 2000000, srate: 16 },
    exText: (o) => `Example: a $20 million estate with $500,000 of debts and costs owes ${o.federal} of federal estate tax in 2026, because ${String(o.over).toLowerCase()}.`,
    how: "Taxable estate = gross estate − debts and costs − gifts to a spouse − gifts to charity. Lifetime taxable gifts are added back, the IRS rate table is applied, and the unified credit for the exemption is subtracted. Above the exemption, the rate is effectively 40%.\n\nA surviving spouse can add the unused exemption of the spouse who died first (DSUE), if the estate filed a Form 706 to elect portability. Inheritance taxes are charged on what each heir receives, and the rate depends on how closely related they are.",
    assume: "2026 basic exclusion $15,000,000 per person (One Big Beautiful Bill Act, indexed from 2027). State inheritance rules: PA 0/4.5/12/15%; NJ Class A exempt, C 11–16%, D 15–16%; MD 10% for non-exempt heirs; NE 1/11/15% above $100k/$40k/$25k. Kentucky inheritance tax isn't modelled, and the custom state estate tax is a flat approximation (real state taxes are graduated). This is an estimate, not legal advice.",
    faq: [["How much can you inherit without paying federal tax?", "Heirs don't pay federal estate tax; the estate pays it, and only above $15 million in 2026 (up to $30 million for a married couple with portability)."], ["Which states have an inheritance tax?", "Pennsylvania, New Jersey, Maryland, Nebraska and Kentucky (Iowa's ended in 2025)."]],
  }),
];

const SPORTS: ToolDef[] = [
  mk({
    slug: "bmi-child-teen-calculator", title: "BMI Calculator for Children & Teens (BMI-for-Age Percentile)",
    meta: "Child BMI Calculator — BMI-for-Age Percentile (Ages 2–20)",
    desc: "Calculate BMI and the BMI-for-age percentile for a child or teen aged 2 to 20 using the CDC growth charts, with the weight category (underweight, healthy, overweight, obesity, severe obesity) and the healthy weight range for their height.",
    inputs: [dd("sex", "Sex", E.SEX, 0), num("years", "Age (years)", 10, 2, 20, 1), num("months", "Plus Months", 0, 0, 11, 1), dd("units", "Units", E.UNITS, 0), num("height", "Height (in or cm)", 55, 10, 250, 0.1), num("weight", "Weight (lb or kg)", 80, 5, 600, 0.1)],
    results: [["percentile", "BMI-for-Age Percentile", "t"], ["category", "Weight Category", "t"], ["bmi", "BMI", "n", 1], ["healthy", "Healthy BMI Range", "t"], ["weights", "Healthy Weight Range", "t"], ["of95", "Compared With the 95th Percentile", "t"], ["z", "Z-Score", "n", 2]],
    fn: C["bmi-child-teen-calculator"], ex: { sex: 0, years: 10, months: 0, units: 0, height: 55, weight: 80 },
    exText: (o) => `Example: a 10-year-old boy who is 55 in tall and weighs 80 lb has a BMI of ${o.bmi}, at the ${o.percentile} percentile — ${String(o.category).toLowerCase()}.`,
    how: "BMI is weight ÷ height², but children's BMI changes as they grow, so it is compared with other children of the same age and sex. The CDC LMS method turns the BMI into a z-score and percentile.\n\nBelow the 5th percentile is underweight, 5th to below 85th is a healthy weight, 85th to below 95th is overweight, and 95th or above is obesity. At 120% of the 95th percentile or more, it is severe obesity.",
    assume: "CDC 2000 BMI-for-age growth charts (LMS parameters, ages 2–20). Age is taken at the middle of the month. BMI is a screening tool, not a diagnosis — talk to your child's doctor. For adults, use the BMI Calculator.",
    faq: [["What is a healthy BMI for a 12-year-old?", "It depends on sex and exact age — roughly 15 to 21 for most 12-year-olds. Enter their details for the exact range."], ["Why can't I use the adult BMI chart for kids?", "Body fat changes with age and differs between boys and girls, so the same BMI means different things at different ages."]],
  }),
];

const BUILD: ToolDef[] = [
  mk({
    slug: "bid-bond-cost-calculator", title: "Bid Bond Cost Calculator",
    meta: "Bid Bond Calculator — Bid Bond Amount & Bond Cost",
    desc: "Work out the bid bond amount (penal sum) for a construction bid, what the bid bond costs, the performance and payment bond premium you'd pay if you win, and how much you could forfeit by withdrawing.",
    inputs: [money("bid", "Bid Amount", 750000, "$", 1e11), pct("pct", "Bid Bond Required (% of bid)", 10, 100), dd("fee", "Bid Bond Fee", E.BID_FEE, 0), money("flat", "Flat Fee (if charged)", 250), pct("feepct", "Fee % of Bond (if charged)", 1, 10), dd("tier", "Your Surety Rating", E.BOND_TIERS, 0), money("next", "Next-Lowest Bid (optional)", 0, "$", 1e11)],
    results: [["penal", "Bid Bond Amount (Penal Sum)", "t"], ["cost", "Bid Bond Cost", "t"], ["pp", "Performance & Payment Bond Premium if Awarded", "t"], ["rate", "Bond Rate", "t"], ["total", "Total Bonding Cost if You Win", "t"], ["forfeit", "Forfeit if You Withdraw", "t"], ["raw", "Penal Sum (number)", "n", 0]],
    fn: C["bid-bond-cost-calculator"], ex: { bid: 750000, pct: 10, fee: 0, flat: 250, feepct: 1, tier: 0, next: 0 },
    exText: (o) => `Example: a $750,000 bid with a 10% bid bond needs a ${o.penal} bond. If you win, performance and payment bonds cost about ${o.pp}.`,
    how: "A bid bond guarantees that you will sign the contract and provide performance and payment bonds if your bid wins. Public jobs usually require 5–10% of the bid, and 10% is the federal norm (FAR 28.101).\n\nMost sureties issue bid bonds free or for a small flat fee to bonded contractors; the real cost is the performance and payment bond premium on the contract, priced on a sliding scale.",
    assume: "Typical standard-market P&P schedule: 2.5% of the first $100k, 1.5% of the next $400k, 1.0% of the next $2M, 0.75% of the next $2.5M, 0.70% of the next $2.5M and 0.65% above. Preferred accounts ×0.8, higher-risk ×2. Actual rates depend on your surety, credit and financials.",
    faq: [["How much does a bid bond cost?", "Often nothing for an established bonded contractor, or a flat fee of about $100–$500."], ["What happens if I win and back out?", "The surety pays the owner — usually the difference to the next-lowest bid, up to the penal sum — and then recovers it from you."]],
  }),
];

async function main() {
  const all = [...INVEST, ...RETIRE, ...TAX, ...SPORTS, ...BUILD];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("investment-returns-planning-calculators", INVEST);
  await upsertTools("retirement-calculators", RETIRE);
  await upsertTools("tax-paycheck-calculators", TAX);
  await upsertTools("sports-performance-calculators", SPORTS);
  await upsertTools("construction-materials-estimating-calculators", BUILD);
}
main().catch((e) => { console.error(e); process.exit(1); });
