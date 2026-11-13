// One-time (but safe to re-run) batch setup script: creates the 20 Finance tools from the vehicle
// keyword check (13 Nov 2026 — see Claude outputs/Vehicle_Build_Plan.json), each in its existing
// Finance sub-category. Formulas and rate tables live in src/lib/calc-engine-veh-fin.ts; examples
// are computed from the engine. All tools are created Published.
//
// HOW TO RUN
//   npx tsx prisma/create-veh-fin-calculators.ts        (VEH_DRY=1 → check only, no database)
// or
//   npm run db:create-veh-fin-calculators

import * as E from "../src/lib/calc-engine-veh-fin";
import { mk, num, money, dd, pct, date, upsertTools, type ToolDef } from "./trv-tool-kit";
import { money as money$, nfmt } from "../src/lib/trv-core";

const C = E.vehFinCustomCalculators;
const usd = (x: unknown) => money$(Number(x), "$", Number.isInteger(Number(x)) ? 0 : 2), gbp = (x: unknown) => money$(Number(x), "£"), eur = (x: unknown) => money$(Number(x), "€", Number.isInteger(Number(x)) ? 0 : 2), inr = (x: unknown) => money$(Number(x), "₹", 0), rm = (x: unknown) => money$(Number(x), "RM"), nf = (x: unknown) => nfmt(Number(x));
const LOAN_NOTE = "Estimates use standard monthly amortization. Your lender's rate, fees and rounding decide the real numbers — use the figures in your loan offer when you have them.";
const COST_NOTE = "Prices are typical 2026 US shop figures, rounded, to budget with. Labor rates differ a lot by region and shop; replace any default with a written quote.";
const TERM = (d = 60) => num("term", "Loan Term (months)", d, 1, 120, 1);

const LOAN: ToolDef[] = [
  mk({
    slug: "car-loan-credit-score-calculator", title: "Car Loan Calculator by Credit Score",
    meta: "Car Loan Calculator by Credit Score — Rate & Payment",
    desc: "See the auto loan rate you can expect for your credit score band and what it does to your monthly payment and total interest, for a new or used car.",
    inputs: [money("price", "Car Price", 35000), money("down", "Down Payment", 5000), money("trade", "Trade-In Value", 0), pct("tax", "Sales Tax Rate", 7, 15), money("fees", "Fees Rolled Into the Loan", 0), dd("band", "Credit Score Band", E.SCORE_BANDS.map((b) => b[0]), 1), dd("cond", "New or Used", ["New car", "Used car"], 0), TERM(60), num("apr", "Your Quoted APR (0 = typical for the band)", 0, 0, 40, 0.01, "%")],
    results: [["pay", "Monthly Payment", "c"], ["apr", "APR Used (%)", "n", 2], ["loan", "Amount Financed", "c"], ["interest", "Total Interest", "c"], ["extra", "Extra Interest vs Super Prime", "c"], ["best", "Payment at a Super Prime Rate", "c"], ["how", "How It's Worked Out", "t"]],
    fn: C["car-loan-credit-score-calculator"], ex: { price: 35000, down: 5000, trade: 0, tax: 7, fees: 0, band: 1, cond: 0, term: 60, apr: 0 },
    exText: (o) => `Example: a $35,000 new car with $5,000 down and 7% tax, prime credit (661–780), 60 months → about ${o.apr}% APR and a payment of ${usd(o.pay)} a month.`,
    how: "Pick your credit score band and whether the car is new or used. The calculator uses the typical APR for that band, or the rate you were quoted, and works out the payment on the price plus tax, less your down payment and trade-in.\n\nThe last two lines show what the same loan would cost at a super prime rate, so you can see what improving your score is worth.",
    assume: `Typical rates by band are rounded 2025–26 US averages (Experian State of the Automotive Finance Market): new 5.2% / 6.7% / 9.8% / 13.2% / 15.8%, used 6.8% / 9.1% / 13.7% / 19.0% / 21.6% from super prime to deep subprime. Lenders, terms and promotions vary. ${LOAN_NOTE}`,
    faq: [["What credit score do I need for a car loan?", "Many lenders approve scores from about 500 up, but the rate falls sharply above 660 (prime) and again above 780 (super prime)."], ["How much does a bad credit score add to a car loan?", "On a $30,000, 60-month loan, going from prime to subprime typically adds $4,000–$5,000 of interest."]],
  }),
  mk({
    slug: "car-loan-apr-calculator", title: "Car Loan APR Calculator",
    meta: "Car Loan APR Calculator — Find the True Rate With Fees",
    desc: "Work out the real APR on a car loan from the monthly payment, term and fees — the interest rate you're actually paying, including dealer and lender fees.",
    inputs: [money("amount", "Amount You Borrow (before fees)", 30000), money("pay", "Monthly Payment (0 = use the quoted rate)", 600), TERM(60), money("fees", "Loan Fees (origination, doc, add-ons)", 500), dd("financed", "Fees Are…", ["Paid up front", "Added to the loan"], 1), num("rate", "Quoted Interest Rate (if no payment)", 0, 0, 40, 0.01, "%")],
    results: [["apr", "True APR (%)", "n", 2], ["rate", "Interest Rate on the Loan (%)", "n", 2], ["pay", "Monthly Payment", "c"], ["interest", "Total Interest", "c"], ["cost", "Interest + Fees", "c"], ["total", "Total You Pay", "c"], ["how", "Inputs Used", "t"]],
    fn: C["car-loan-apr-calculator"], ex: { amount: 30000, pay: 600, term: 60, fees: 500, financed: 1, rate: 0 },
    exText: (o) => `Example: borrowing $30,000 with $500 of fees added to the loan and paying $600 a month for 60 months is a ${o.rate}% rate — but a true APR of ${o.apr}%.`,
    how: "Enter what you borrow, the monthly payment in your offer and the term. Add any fees and say whether they're paid up front or rolled into the loan. If you only have a quoted rate, leave the payment at 0 and type the rate.\n\nThe APR is the rate that makes your payments equal the money you actually received, so fees push it above the note rate.",
    assume: `The APR is solved numerically (Truth in Lending style, monthly compounding, no odd first period). ${LOAN_NOTE}`,
    faq: [["What's the difference between APR and interest rate on a car loan?", "The interest rate is charged on the balance; the APR also counts fees, so it shows the true yearly cost of borrowing."], ["Is a 7% APR good for a car loan?", "In 2026 it's around average for a new car with prime credit; under 5% is very good."]],
  }),
  mk({
    slug: "car-loan-eligibility-calculator", title: "Car Loan Eligibility Calculator",
    meta: "Car Loan Eligibility Calculator — How Much Can I Get Approved For?",
    desc: "Estimate how much car loan a lender is likely to approve from your income and existing debts, using debt-to-income and payment-to-income limits.",
    inputs: [money("income", "Gross Monthly Income", 6000), money("debts", "Other Monthly Debt Payments", 800), pct("dti", "Max Debt-to-Income Lenders Allow", 45, 70), pct("pti", "Max Car Payment as % of Income", 15, 40), num("apr", "Expected APR", 7.5, 0, 40, 0.01, "%"), TERM(60), money("down", "Down Payment / Trade-In", 4000), pct("tax", "Sales Tax Rate", 7, 15)],
    results: [["loan", "Estimated Maximum Loan", "c"], ["pay", "Maximum Monthly Payment", "c"], ["price", "Maximum Car Price (incl. tax)", "c"], ["dtiNow", "Debt-to-Income Now (%)", "n", 1], ["dtiAfter", "Debt-to-Income With the Car (%)", "n", 1], ["limit", "What Limits You", "t"]],
    fn: C["car-loan-eligibility-calculator"], ex: { income: 6000, debts: 800, dti: 45, pti: 15, apr: 7.5, term: 60, down: 4000, tax: 7 },
    exText: (o) => `Example: $6,000 a month gross with $800 of other debts at 7.5% for 60 months → a lender would likely approve up to about ${usd(o.loan)} (a ${usd(o.pay)} payment).`,
    how: "Enter your gross monthly income and the minimum payments on your other debts (credit cards, student loans, mortgage or rent if the lender counts it). Lenders cap both your total debt-to-income ratio and the car payment's share of income; the lower of the two sets your ceiling.\n\nFor Indian bank loans, set the debt-to-income limit to the bank's FOIR (often 50–60% of net income).",
    assume: `Typical US auto lenders allow total DTI of 40–50% and a payment-to-income ratio of 15–20%; credit score, job history and the car's value also matter. Pre-approval from the lender is the only firm answer. ${LOAN_NOTE}`,
    faq: [["How much car loan can I get on my salary?", "As a rule of thumb, lenders approve a payment up to about 15% of gross income, as long as all your debts stay under 45–50% of income."], ["Does pre-approval affect my credit score?", "A hard inquiry can lower it a few points; several auto loan inquiries within 14–45 days count as one."]],
  }),
  mk({
    slug: "pcp-car-finance-calculator", title: "PCP Car Finance Calculator (UK)",
    meta: "PCP Calculator UK — Personal Contract Purchase Monthly Payments",
    desc: "Calculate UK PCP car finance payments from the price, deposit, APR and optional final payment (GMFV) — plus the total payable and charge for credit.",
    inputs: [money("price", "Car Cash Price", 30000, "£"), money("deposit", "Your Deposit", 3000, "£"), money("px", "Part-Exchange Value", 0, "£"), money("contrib", "Dealer Deposit Contribution", 0, "£"), money("gmfv", "Optional Final Payment (GMFV / balloon)", 12000, "£"), num("apr", "APR", 9.9, 0, 40, 0.1, "%"), num("term", "Term (months)", 48, 12, 60, 1), money("fee", "Option-to-Purchase Fee", 10, "£"), num("miles", "Annual Mileage Allowance", 10000, 0, 50000, 500), num("excess", "Expected Excess Miles at the End", 0, 0, 100000, 100), num("ppm", "Excess Mileage Charge (pence per mile)", 8, 0, 50, 0.5)],
    results: [["pay", "Monthly Payment", "c", "GBP"], ["total", "Total Amount Payable", "c", "GBP"], ["charge", "Total Charge for Credit", "c", "GBP"], ["credit", "Amount of Credit", "c", "GBP"], ["handback", "Paid If You Hand It Back", "c", "GBP"], ["excess", "Excess Mileage Charge", "c", "GBP"], ["how", "Deal Used", "t"]],
    fn: C["pcp-car-finance-calculator"], ex: { price: 30000, deposit: 3000, px: 0, contrib: 0, gmfv: 12000, apr: 9.9, term: 48, fee: 10, miles: 10000, excess: 0, ppm: 8 },
    exText: (o) => `Example: a £30,000 car with £3,000 down, a £12,000 GMFV, 9.9% APR over 48 months → about ${gbp(o.pay)} a month and ${gbp(o.total)} in total if you buy the car at the end.`,
    how: "Enter the cash price, your deposit, any part-exchange and dealer contribution, and the optional final payment the finance company quotes (the guaranteed minimum future value). The monthly payment repays the difference plus interest on the whole balance, including the part you defer.\n\nAt the end you can pay the final payment and keep the car, hand it back (paying only for excess miles or damage), or part-exchange it.",
    assume: "Standard PCP maths: payment = (credit − GMFV discounted) × monthly rate ÷ (1 − (1 + rate)^−n). Representative APRs and GMFVs come from the lender; the GMFV depends on the car, term and mileage. FCA rules let you voluntarily terminate once you've paid half the total amount payable.",
    faq: [["Is PCP cheaper than HP?", "Monthly payments are lower because of the balloon, but you pay interest on the balloon too, so the total cost of buying the car is usually higher."], ["What happens at the end of a PCP?", "You pay the optional final payment to own the car, hand it back, or use any equity as a deposit on another car."]],
  }),
];

const BUY: ToolDef[] = [
  mk({
    slug: "negative-equity-car-calculator", title: "Negative Equity Car Calculator",
    meta: "Negative Equity Car Calculator — Upside-Down Trade-In Rollover",
    desc: "See how much negative equity you have on your trade-in and what rolling it into a new car loan does to your payment, loan-to-value and total cost.",
    inputs: [money("owed", "Payoff Owed on Current Car", 22000), money("value", "Trade-In Value Offered", 17000), money("price", "New Car Price", 35000), money("down", "Cash Down Payment", 2000), pct("tax", "Sales Tax Rate", 7, 15), dd("taxcredit", "State Gives Trade-In Tax Credit?", ["No", "Yes"], 1), money("fees", "Dealer / Title Fees", 800), num("apr", "APR", 7.5, 0, 40, 0.01, "%"), TERM(72)],
    results: [["pay", "New Monthly Payment", "c"], ["neg", "Negative Equity Rolled In", "c"], ["loan", "New Loan Amount", "c"], ["cost", "Total Cost of the Negative Equity", "c"], ["extra", "Payment Added by Negative Equity", "c"], ["ltv", "Loan-to-Value (%)", "n", 1], ["equity", "Your Equity", "t"]],
    fn: C["negative-equity-car-calculator"], ex: { owed: 22000, value: 17000, price: 35000, down: 2000, tax: 7, taxcredit: 1, fees: 800, apr: 7.5, term: 72 },
    exText: (o) => `Example: owing $22,000 on a car worth $17,000 and buying a $35,000 car → ${usd(o.neg)} of negative equity, a ${usd(o.loan)} loan and ${usd(o.pay)} a month over 72 months.`,
    how: "Enter what you still owe (the 10-day payoff), the dealer's trade-in offer and the new deal. If you owe more than the car is worth, the difference is added to the new loan, and you pay interest on it for the whole term.\n\nA loan-to-value over 120–125% is hard to get approved and leaves you upside down again.",
    assume: `Trade-in tax credit (in most states) lowers the taxable price by the trade value. GAP insurance is strongly advised when the loan-to-value is over 100%. ${LOAN_NOTE}`,
    faq: [["Can I trade in a car with negative equity?", "Yes — the dealer pays off your loan and adds the shortfall to the new loan, but you'll owe more than the new car is worth."], ["How do I get out of negative equity?", "Pay extra on the current loan, keep the car longer, or pay the difference in cash when you trade."]],
  }),
  mk({
    slug: "20-4-10-rule-car-calculator", title: "20/4/10 Rule Car Affordability Calculator",
    meta: "20/4/10 Rule Calculator — How Much Car Can I Afford?",
    desc: "Check a car against the 20/4/10 rule — 20% down, a loan of 4 years or less, and car costs under 10% of income — and find the most car the rule allows.",
    inputs: [money("income", "Gross Annual Income", 80000), money("price", "Car Price (incl. tax & fees)", 35000), money("down", "Down Payment", 7000), num("apr", "APR", 7, 0, 40, 0.01, "%"), num("term", "Loan Term (months)", 48, 1, 96, 1), money("other", "Monthly Insurance + Fuel (counted in the 10%)", 250)],
    results: [["maxPrice", "Most Car the Rule Allows", "c"], ["verdict", "Does This Car Pass?", "t"], ["pay", "Monthly Payment", "c"], ["share", "Car Costs as % of Income", "n", 1], ["minDown", "20% Down Payment", "c"], ["budget", "Max Payment Under the Rule", "c"]],
    fn: C["20-4-10-rule-car-calculator"], ex: { income: 80000, price: 35000, down: 7000, apr: 7, term: 48, other: 250 },
    exText: (o) => `Example: on an $80,000 income with $250 a month for insurance and fuel, the 20/4/10 rule allows a car of up to about ${usd(o.maxPrice)}. A $35,000 car with $7,000 down: ${String(o.verdict).toLowerCase()}.`,
    how: "The rule: put at least 20% down, finance for no more than 4 years (48 months), and keep the payment plus insurance and fuel under 10% of gross monthly income. Enter your income and the car you're considering.\n\nSome versions count only the payment in the 10%; set insurance and fuel to 0 for that version.",
    assume: `The maximum price assumes a 48-month loan at your APR and exactly 20% down. It's a conservative budgeting rule, not a lender limit. ${LOAN_NOTE}`,
    faq: [["What is the 20/4/10 rule for buying a car?", "Put 20% down, finance for 4 years or less, and keep total car costs under 10% of gross income."], ["Is the 20/4/10 rule realistic in 2026?", "It's strict with today's prices — many buyers stretch to 15%, but the rule keeps you from being upside down."]],
  }),
  mk({
    slug: "ireland-vrt-calculator", title: "Ireland VRT Calculator",
    meta: "VRT Calculator Ireland — Vehicle Registration Tax & NOx Levy",
    desc: "Estimate Irish Vehicle Registration Tax (VRT) on a new or imported car from its OMSP, WLTP CO2 emissions and NOx — including the NOx levy and EV relief.",
    inputs: [money("omsp", "Open Market Selling Price (OMSP)", 30000, "€"), num("co2", "CO2 Emissions (WLTP, g/km)", 120, 0, 500, 1), num("nox", "NOx Emissions (mg/km)", 20, 0, 1000, 1), dd("fuel", "Fuel", ["Petrol / hybrid", "Diesel", "Battery electric"], 0), money("relief", "EV VRT Relief", 5000, "€"), num("rate", "VRT Rate Override (%, 0 = by CO2 band)", 0, 0, 50, 0.01)],
    results: [["total", "Total VRT Payable", "c", "EUR"], ["vrt", "VRT (CO2 Charge)", "c", "EUR"], ["levy", "NOx Levy", "c", "EUR"], ["rate", "VRT Rate (%)", "n", 2], ["pct", "Total as % of OMSP", "n", 1], ["how", "How It's Worked Out", "t"]],
    fn: C["ireland-vrt-calculator"], ex: { omsp: 30000, co2: 120, nox: 20, fuel: 0, relief: 5000, rate: 0 },
    exText: (o) => `Example: a €30,000 OMSP petrol car with 120 g/km CO2 and 20 mg/km NOx → about ${eur(o.total)} of VRT.`,
    how: "Enter the OMSP — Revenue's estimate of the car's retail price in Ireland, including VAT and VRT (for a used import, find it with Revenue's VRT calculator using the model and year). Add the WLTP CO2 and the NOx figure from the certificate of conformity.\n\nThe VRT rate rises with CO2; the NOx levy is charged per mg/km on top. Battery EVs get relief off the VRT (check that it still applies when you register).",
    assume: "Category A VRT bands (Finance Act 2020, WLTP): 7% up to 50 g/km rising to 37% over 190 g/km, minimum €200. NOx levy: €5/mg up to 40, €15/mg from 40–80, €25/mg over 80, capped at €4,850 for diesel and €600 for other cars. Revenue reviews the bands in each Budget — use the override if the rate has changed.",
    faq: [["How is VRT calculated in Ireland?", "VRT = OMSP × the rate for the car's CO2 band, plus the NOx levy."], ["Do I pay VRT on a car imported from the UK?", "Yes — post-Brexit you also pay customs duty and VAT on many UK used cars before VRT."]],
  }),
];

const OWN: ToolDef[] = [
  mk({
    slug: "ev-charging-time-calculator", title: "EV Charging Time Calculator",
    meta: "EV Charging Time Calculator — How Long to Charge an Electric Car",
    desc: "Work out how long it takes to charge an electric car from your battery size, starting and target charge, charger power and the car's maximum charge rate.",
    inputs: [num("bat", "Usable Battery Size (kWh)", 75, 1, 250, 0.1), num("from", "Starting Charge (%)", 20, 0, 100, 1), num("to", "Target Charge (%)", 80, 1, 100, 1), dd("ch", "Charger", E.EV_CHARGERS.map((c) => c[0]), 1), num("kw", "Charger kW (custom, 0 = preset)", 0, 0, 400, 0.1), num("acmax", "Car's Max AC Charge Rate (kW)", 11, 1, 22, 0.1), num("dcmax", "Car's Max DC Charge Rate (kW)", 150, 10, 350, 1), num("eff", "Charging Efficiency (%)", 90, 50, 100, 1), money("price", "Electricity Price per kWh", 0.17)],
    results: [["time", "Charging Time", "t"], ["hours", "Hours", "n", 2], ["kwh", "Energy Added to Battery (kWh)", "n", 1], ["grid", "Energy From the Grid (kWh)", "n", 1], ["power", "Charging Power Used (kW)", "n", 1], ["cost", "Cost of This Charge", "c"], ["how", "How It's Worked Out", "t"]],
    fn: C["ev-charging-time-calculator"], ex: { bat: 75, from: 20, to: 80, ch: 1, kw: 0, acmax: 11, dcmax: 150, eff: 90, price: 0.17 },
    exText: (o) => `Example: a 75 kWh battery from 20% to 80% on a 7 kW home charger takes about ${o.time}.`,
    how: "Choose your charger and enter the battery's usable capacity. The car can't charge faster than its own on-board limit (AC) or its peak DC rate, so the lower of the charger and the car is used.\n\nDC fast charging slows sharply above 80%, which is why most road-trip stops end at 80%.",
    assume: "AC charging is modelled at a constant rate; DC at about 80% of peak power up to 80% charge and 40% of peak above it. Cold batteries, preconditioning and shared chargers change real times.",
    faq: [["How long does it take to charge an EV at home?", "On a 7 kW Level 2 charger, about 6–10 hours from low to full for most cars; on a household plug, 1–3 days."], ["Why does EV charging slow down after 80%?", "The battery management system lowers the power to protect the cells as they fill up."]],
  }),
  mk({
    slug: "ev-range-calculator", title: "EV Range Calculator",
    meta: "EV Range Calculator — Real-World Electric Car Range",
    desc: "Estimate an electric car's real-world range from battery size, efficiency, state of charge, temperature and driving speed — in miles and kilometres.",
    inputs: [num("bat", "Usable Battery (kWh)", 75, 1, 250, 0.1), num("eff", "Rated Efficiency (kWh per 100 miles)", 28, 10, 80, 0.1), num("soc", "Current Charge (%)", 100, 0, 100, 1), num("reserve", "Buffer to Keep (%)", 10, 0, 50, 1), dd("temp", "Outside Temperature", E.TEMP_F.map((t) => t[0]), 3), dd("speed", "Driving", E.SPEED_F.map((s) => s[0]), 1), num("load", "Extra Load / Towing / Roof Box (%)", 0, 0, 100, 1)],
    results: [["mi", "Estimated Range (miles)", "n", 0], ["km", "Estimated Range (km)", "n", 0], ["full", "Range on a Full Battery (miles)", "n", 0], ["eff", "Adjusted Efficiency (kWh/100 mi)", "n", 1], ["mpk", "Miles per kWh", "n", 2], ["how", "How It's Worked Out", "t"]],
    fn: C["ev-range-calculator"], ex: { bat: 75, eff: 28, soc: 100, reserve: 10, temp: 3, speed: 1, load: 0 },
    exText: (o) => `Example: a 75 kWh EV rated at 28 kWh/100 mi, from 100% down to a 10% buffer in mild weather → about ${nf(o.mi)} miles (${nf(o.km)} km).`,
    how: "Enter the usable battery size and the car's rated efficiency (from the EPA label or the car's trip computer; 1 mi/kWh = 100 kWh/100 mi). The calculator applies typical penalties for cold or hot weather, motorway speed and extra load.\n\nTowing a trailer can add 50–100% to consumption.",
    assume: "Condition factors are averages from fleet data (Recurrent, AAA, Geotab): about +40% consumption below 20°F with heating, +27% at 75 mph versus mixed driving. Individual cars differ.",
    faq: [["How much range does an EV lose in winter?", "Typically 20–40% in freezing weather, less with a heat pump and preconditioning."], ["Is the EPA range accurate?", "It's close for mixed driving in mild weather; steady 75 mph highway driving usually gets 15–25% less."]],
  }),
  mk({
    slug: "fuel-range-calculator", title: "Fuel Range Calculator (Distance to Empty)",
    meta: "Fuel Range Calculator — How Far Can I Drive on My Tank?",
    desc: "Calculate how far you can drive on the fuel left in your tank from tank size, fuel level and fuel economy — in miles (MPG) or kilometres (L/100 km).",
    inputs: [dd("unit", "Units", ["US gallons & MPG", "Litres & L/100 km"], 0), num("tank", "Tank Size", 14, 1, 300, 0.1), num("level", "Fuel Level (%)", 25, 0, 100, 1), num("econ", "Fuel Economy (MPG or L/100 km)", 30, 1, 100, 0.1), num("reserve", "Fuel to Keep in Reserve (gal or L)", 0, 0, 50, 0.1)],
    results: [["dist", "Distance You Can Drive", "n", 0], ["full", "Range on a Full Tank", "n", 0], ["fuel", "Usable Fuel Left", "n", 1], ["other", "Distance in the Other Unit (km / mi)", "n", 0], ["how", "How It's Worked Out", "t"]],
    fn: C["fuel-range-calculator"], ex: { unit: 0, tank: 14, level: 25, econ: 30, reserve: 0 },
    exText: (o) => `Example: a 14-gallon tank a quarter full at 30 MPG → about ${nf(o.dist)} miles to empty (${nf(o.full)} miles on a full tank).`,
    how: "Enter your tank size, how full it is (the gauge reading as a percentage) and your real fuel economy. Range = fuel left × MPG, or fuel left ÷ L/100 km × 100.\n\nMost cars still have 1–2.5 gallons (4–10 L) when the low-fuel light comes on; enter a reserve if you don't want to count it.",
    assume: "Fuel gauges aren't linear and real economy changes with speed, traffic and weather, so keep a margin — running a tank dry can damage the fuel pump.",
    faq: [["How far can I drive when the fuel light comes on?", "Usually 30–60 miles, but it depends on the car; check your owner's manual for the reserve size."], ["How do I calculate miles left in my tank?", "Multiply the gallons left by your MPG."]],
  }),
  mk({
    slug: "annual-mileage-calculator", title: "Annual Mileage Calculator",
    meta: "Annual Mileage Calculator — Miles per Year From Your Odometer",
    desc: "Calculate how many miles a year you drive from two odometer readings and dates — and check it against a lease or insurance mileage allowance.",
    inputs: [num("odo1", "First Odometer Reading", 12000, 0, 2000000, 1), date("d1", "Date of First Reading", "today-365"), num("odo2", "Current Odometer Reading", 25000, 0, 2000000, 1), date("d2", "Date of Current Reading", "today"), num("allow", "Allowance per Year (lease / insurance)", 12000, 0, 100000, 500), num("years", "Lease / Policy Term (years)", 3, 0.5, 10, 0.5), money("fee", "Excess Mileage Fee per Mile", 0.25)],
    results: [["year", "Miles per Year", "n", 0], ["month", "Miles per Month", "n", 0], ["day", "Miles per Day", "n", 1], ["projected", "Projected Miles Over the Term", "n", 0], ["over", "Projected Miles Over Allowance", "n", 0], ["cost", "Projected Excess Mileage Charge", "c"], ["verdict", "Against the Allowance", "t"]],
    fn: C["annual-mileage-calculator"], ex: { odo1: 12000, d1: 20000, odo2: 25000, d2: 20365, allow: 12000, years: 3, fee: 0.25 },
    exText: (o) => `Example: 13,000 miles driven in a year → ${nf(o.year)} miles a year, ${nf(o.month)} a month.`,
    how: "Enter two odometer readings and the dates you took them (an old service invoice, MOT or inspection record works). The calculator scales the miles to a full year.\n\nThe average US driver covers about 13,500 miles a year (FHWA); UK drivers average about 7,000.",
    assume: "Assumes your driving pattern stays the same; a new commute or long trips will change the projection.",
    faq: [["What is considered high mileage per year?", "Over 15,000 miles a year in the US (over 10,000 in the UK) is usually considered high."], ["How many miles a year is normal on a lease?", "Leases usually allow 10,000, 12,000 or 15,000 miles a year."]],
  }),
  mk({
    slug: "car-cost-per-mile-calculator", title: "Car Cost per Mile Calculator",
    meta: "Cost per Mile Calculator — What Does My Car Cost to Drive?",
    desc: "Work out what your car really costs per mile — fuel, maintenance, tyres, insurance, depreciation, interest and fees — and compare it to the IRS mileage rate.",
    inputs: [num("miles", "Miles Driven per Year", 12000, 1, 200000, 100), num("mpg", "Fuel Economy (MPG)", 28, 1, 150, 0.1), money("gas", "Fuel Price per Gallon", 3.2), money("maint", "Maintenance & Repairs per Year", 900), money("tires", "Tires per Year", 200), money("ins", "Insurance per Year", 1800), money("dep", "Depreciation per Year", 3500), money("interest", "Loan Interest per Year", 900), money("reg", "Registration & Taxes per Year", 150), money("park", "Parking & Tolls per Year", 0)],
    results: [["cpm", "Total Cost per Mile", "c"], ["fuelpm", "Fuel per Mile", "c"], ["runpm", "Running Costs per Mile", "c"], ["fixedpm", "Ownership Costs per Mile", "c"], ["year", "Total per Year", "c"], ["month", "Total per Month", "c"], ["irs", "IRS 70¢/mile Equivalent (2025)", "c"]],
    fn: C["car-cost-per-mile-calculator"], ex: { miles: 12000, mpg: 28, gas: 3.2, maint: 900, tires: 200, ins: 1800, dep: 3500, interest: 900, reg: 150, park: 0 },
    exText: (o) => `Example: 12,000 miles a year at 28 MPG and $3.20 gas, with typical ownership costs → about ${usd(o.cpm)} a mile (${usd(o.month)} a month).`,
    how: "Enter your yearly mileage and what you spend on each cost. Running costs (fuel, maintenance, tyres) grow with every mile; ownership costs (insurance, depreciation, interest, registration) are paid even if the car sits.\n\nDriving more lowers the cost per mile, because the fixed costs are spread over more miles.",
    assume: "AAA's 2025 Your Driving Costs puts the average new car at about 80¢ a mile including depreciation. The IRS business rate is 70¢ a mile for 2025 (check the current year's rate).",
    faq: [["How much does it cost to drive a car per mile?", "Fuel alone is about 10–15¢ a mile for most cars; the full cost with depreciation and insurance is usually 60–90¢."], ["What is the cheapest part of owning a car?", "For most people it's maintenance; depreciation is the biggest cost on a new car."]],
  }),
  mk({
    slug: "uk-car-tax-calculator", title: "UK Car Tax (VED) Calculator",
    meta: "Car Tax Calculator UK — Road Tax (VED) by CO2 & List Price",
    desc: "Work out UK car tax (Vehicle Excise Duty) — first-year rate, standard rate, expensive car supplement and pre-2017 bands — by CO2, fuel and list price.",
    inputs: [dd("era", "First Registered", ["On or after 1 April 2017", "1 March 2001 – 31 March 2017", "Before 1 March 2001"], 0), num("co2", "CO2 Emissions (g/km)", 130, 0, 500, 1), dd("fuel", "Fuel", ["Petrol / hybrid / RDE2 diesel", "Diesel (not RDE2)", "Alternative fuel", "Electric"], 0), money("list", "List Price When New (incl. options)", 30000, "£"), num("cc", "Engine Size (cc, pre-2001 only)", 1600, 0, 10000, 1), dd("pay", "How You Pay", ["12 months in one go", "Monthly Direct Debit", "6 months / instalments"], 0), money("std", "Standard Rate", 195, "£"), money("ecs", "Expensive Car Supplement", 425, "£")],
    results: [["annual", "Car Tax per Year", "c", "GBP"], ["first", "First-Year Rate (new car)", "c", "GBP"], ["year2", "Rate From Year 2", "c", "GBP"], ["six", "6-Month Payment", "c", "GBP"], ["monthly", "Per Month", "c", "GBP"], ["band", "Band / Rule", "t"], ["how", "Payment Used", "t"]],
    fn: C["uk-car-tax-calculator"], ex: { era: 0, co2: 130, fuel: 0, list: 30000, cc: 1600, pay: 0, std: 195, ecs: 425 },
    exText: (o) => `Example: a 2020 petrol car with 130 g/km CO2 and a £30,000 list price pays ${gbp(o.annual)} a year; new, its first-year rate would be ${gbp(o.first)}.`,
    how: "Pick when the car was first registered and enter its CO2 figure from the V5C. Cars from April 2017 pay a CO2-based first-year rate, then the flat standard rate, plus the expensive car supplement in years 2–6 if the list price was over £40,000. Cars from 2001–2017 pay by CO2 band A–M; older cars by engine size.\n\nElectric cars have paid car tax since 1 April 2025.",
    assume: "Rates are the April 2025 GOV.UK tables (standard rate £195, expensive car supplement £425, first-year £10–£5,490). Rates rise with RPI each April — enter the current standard rate and supplement if they've changed. Paying monthly or 6-monthly costs 5–10% more.",
    faq: [["How much is car tax for a car registered after 2017?", "£195 a year at the April 2025 rate, plus £425 a year in years 2–6 if it cost over £40,000 new."], ["Do electric cars pay road tax in the UK?", "Yes, since April 2025: £10 in the first year, then the standard rate."]],
  }),
];

const INS: ToolDef[] = [
  mk({
    slug: "idv-calculator", title: "IDV Calculator (Insured Declared Value)",
    meta: "IDV Calculator — Car & Bike Insured Declared Value (India)",
    desc: "Calculate your vehicle's Insured Declared Value (IDV) with the IRDAI depreciation slabs — and estimate the own-damage and third-party premium for car insurance in India.",
    inputs: [money("price", "Ex-Showroom Price", 800000, "₹"), money("acc", "Fitted Accessories", 0, "₹"), dd("age", "Vehicle Age", E.IDV_DEP.map((d) => `${d[0]} (−${d[1]}%)`), 3), num("dep", "Depreciation Override (%)", 0, 0, 95, 1), dd("cc", "Engine Size", ["Up to 1,000 cc", "1,000–1,500 cc", "Over 1,500 cc"], 1), dd("zone", "Registration Zone", ["Zone A (Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Ahmedabad, Hyderabad, Pune)", "Zone B (rest of India)"], 0), dd("ncb", "No Claim Bonus", E.NCB.map((n) => `${n}%`), 2), num("disc", "Insurer Discount on OD (%)", 0, 0, 90, 1), num("rate", "OD Rate Override (% of IDV)", 0, 0, 10, 0.001), money("pa", "Owner-Driver PA Cover", 375, "₹")],
    results: [["idv", "Insured Declared Value (IDV)", "c", "INR"], ["dep", "Depreciation Applied (%)", "n", 0], ["od", "Own Damage Premium", "c", "INR"], ["tp", "Third-Party Premium", "c", "INR"], ["gst", "GST (18%)", "c", "INR"], ["total", "Estimated Total Premium", "c", "INR"], ["how", "How It's Worked Out", "t"]],
    fn: C["idv-calculator"], ex: { price: 800000, acc: 0, age: 3, dep: 0, cc: 1, zone: 0, ncb: 2, disc: 0, rate: 0, pa: 375 },
    exText: (o) => `Example: an ₹8,00,000 ex-showroom car, 2–3 years old, 1,200 cc in Mumbai with 25% NCB → IDV ${inr(o.idv)} and a premium of about ${inr(o.total)}.`,
    how: "IDV is the most your insurer pays if the vehicle is stolen or a total loss. It's the ex-showroom price (plus fitted accessories) less the IRDAI depreciation for the vehicle's age. Registration and insurance costs are not included.\n\nFor vehicles over 5 years old the IDV is agreed between you and the insurer; the calculator shows a typical figure.",
    assume: "Depreciation slabs per the India Motor Tariff: up to 6 months 5%, 6–12 months 15%, 1–2 years 20%, 2–3 years 30%, 3–4 years 40%, 4–5 years 50%. OD rates are the former tariff rates (insurers now discount them); third-party premiums are the IRDAI rates in force since 2019 (₹2,094 / ₹3,416 / ₹7,897 for private cars). Confirm with the insurer's quote.",
    faq: [["Should I choose a higher or lower IDV?", "A higher IDV means a bigger payout on total loss for a slightly higher premium; a very low IDV saves little and risks under-insurance."], ["Does IDV include the road tax and registration?", "No — only the ex-showroom price and fitted accessories, less depreciation."]],
  }),
  mk({
    slug: "ctp-green-slip-calculator", title: "CTP Green Slip Calculator (NSW)",
    meta: "Green Slip Calculator NSW — CTP Insurance Price Estimate",
    desc: "Estimate the price of a NSW CTP Green Slip by region, driver age, vehicle use and claims history — for 12, 6 or 3 months — and compare quotes.",
    inputs: [dd("region", "Where the Vehicle Is Garaged", E.CTP_REGION.map((r) => r[0]), 0), dd("age", "Youngest Driver's Age", E.CTP_AGE.map((a) => a[0]), 3), dd("veh", "Vehicle & Use", E.CTP_VEH.map((t) => t[0]), 0), num("claims", "At-Fault Claims in the Last 3 Years", 0, 0, 5, 1), dd("term", "Policy Length", ["12 months", "6 months", "3 months"], 0), money("base", "Your Quote / Base Price (0 = typical)", 0), money("refund", "CTP Refund / Rebate Expected", 0)],
    results: [["prem", "Estimated Green Slip Price", "c", "AUD"], ["annual", "12-Month Equivalent", "c", "AUD"], ["low", "Cheapest Insurer (approx.)", "c", "AUD"], ["high", "Dearest Insurer (approx.)", "c", "AUD"], ["gst", "GST Included", "c", "AUD"], ["net", "After Refund", "c", "AUD"], ["how", "How It's Worked Out", "t"]],
    fn: C["ctp-green-slip-calculator"], ex: { region: 0, age: 3, veh: 0, claims: 0, term: 0, base: 0, refund: 0 },
    exText: (o) => `Example: a private car garaged in Sydney with a driver aged 30–54 and no claims → about ${usd(o.prem)} for 12 months.`,
    how: "Green Slip prices depend mostly on where the car is garaged, the youngest driver's age, how the vehicle is used and claims history. Use this to budget, then get exact quotes from the six licensed insurers on the SIRA Green Slip price checker.\n\nShorter policies cost proportionally the same but you pay more often.",
    assume: "Typical 2025–26 private passenger prices, rounded, from the SIRA price checker ranges; the factors are averages, not an insurer's rating. Prices include GST. The cheapest and dearest quotes are usually about ±12% of the average.",
    faq: [["How much is a Green Slip in NSW?", "Most private cars pay about $450–$750 for 12 months; young drivers and rideshare vehicles pay more."], ["Can I get a refund on my Green Slip?", "You may get a partial refund if you cancel the registration, plus SIRA's periodic CTP refunds for over-collected premiums."]],
  }),
  mk({
    slug: "malaysia-car-insurance-calculator", title: "Malaysia Car Insurance Calculator",
    meta: "Car Insurance Calculator Malaysia — Comprehensive, TPFT & NCD",
    desc: "Estimate your Malaysia car insurance premium — comprehensive, third party fire & theft or third party — by sum insured, engine cc, region and NCD, with SST and add-ons.",
    inputs: [money("si", "Sum Insured (market value)", 60000, "RM"), dd("cc", "Engine Capacity", E.MY_CC_BANDS, 1), dd("region", "Region", ["Peninsular Malaysia", "Sabah, Sarawak & Labuan"], 0), dd("cover", "Cover", ["Comprehensive", "Third party, fire & theft", "Third party only"], 0), dd("ncd", "No Claim Discount (NCD)", E.MY_NCD.map((n) => `${n}%`), 4), num("disc", "Insurer Discount (%)", 0, 0, 50, 1), money("ws", "Windscreen Cover Sum (0 = none)", 0, "RM"), dd("flood", "Special Perils / Flood Cover", ["No", "Yes (0.25% of sum insured)"], 0), money("other", "Other Add-Ons (e.g. all drivers, towing)", 0, "RM")],
    results: [["total", "Estimated Premium Payable", "c", "MYR"], ["basic", "Basic Premium (tariff)", "c", "MYR"], ["ncdAmt", "NCD Saving", "c", "MYR"], ["addons", "Add-Ons", "c", "MYR"], ["sst", "SST (8%)", "c", "MYR"], ["how", "How It's Worked Out", "t"]],
    fn: C["malaysia-car-insurance-calculator"], ex: { si: 60000, cc: 1, region: 0, cover: 0, ncd: 4, disc: 0, ws: 0, flood: 0, other: 0 },
    exText: (o) => `Example: a 1.5-litre car insured for RM60,000 in Peninsular Malaysia with 45% NCD → about ${rm(o.total)} including SST and stamp duty.`,
    how: "The basic comprehensive premium is the tariff rate for your engine size on the first RM1,000 of sum insured, plus RM26 per RM1,000 after that (RM20.30 in Sabah, Sarawak and Labuan). Your NCD then comes off, add-ons are added, and 8% SST and RM10 stamp duty go on top.\n\nNCD steps up 25% → 30% → 38.33% → 45% → 55% for each claim-free year.",
    assume: "Uses the Malaysian motor tariff rates that insurers' pricing is still benchmarked against. Since phased liberalisation, insurers price by risk, so quotes can be 10–20% higher or lower. Road tax isn't included.",
    faq: [["How is car insurance calculated in Malaysia?", "From the sum insured and engine cc using the tariff, minus your NCD, plus add-ons, SST and stamp duty."], ["What is the maximum NCD in Malaysia?", "55%, after five consecutive claim-free years."]],
  }),
];

const OWN2: ToolDef[] = [
  mk({
    slug: "mpge-calculator", title: "MPGe & Miles per kWh Calculator",
    meta: "MPGe Calculator — Convert kWh/100 mi, mi/kWh & MPGe",
    desc: "Convert EV efficiency between MPGe, miles per kWh, kWh per 100 miles and kWh per 100 km — and compare the cost per mile with a gas car.",
    inputs: [dd("mode", "I Know the Efficiency In", ["kWh per 100 miles", "Miles per kWh", "MPGe", "kWh per 100 km"], 1), num("x", "Efficiency Value", 3.5, 0.01, 1000, 0.01), money("elec", "Electricity Price per kWh", 0.17), money("gas", "Gas Price per Gallon", 3.2), num("mpg", "Gas Car MPG to Compare", 30, 1, 150, 0.1)],
    results: [["mpge", "MPGe", "n", 1], ["mpk", "Miles per kWh", "n", 2], ["kwh100", "kWh per 100 Miles", "n", 1], ["kwhkm", "kWh per 100 km", "n", 1], ["cpm", "EV Cost per Mile ($)", "n", 3], ["gasCpm", "Gas Car Cost per Mile ($)", "n", 3], ["breakeven", "Electricity Price Where Costs Match ($/kWh)", "n", 2], ["how", "Conversion", "t"]],
    fn: C["mpge-calculator"], ex: { mode: 1, x: 3.5, elec: 0.17, gas: 3.2, mpg: 30 },
    exText: (o) => `Example: 3.5 miles per kWh = ${o.kwh100} kWh/100 mi = ${o.mpge} MPGe. At 17¢/kWh that's ${o.cpm} $/mile against ${o.gasCpm} for a 30 MPG gas car.`,
    how: "The EPA defines one gallon of gasoline as 33.705 kWh, so MPGe = 3,370.5 ÷ kWh per 100 miles. Enter whichever figure you have — from the window sticker or your car's trip computer — and the others are worked out.\n\nCharging losses (about 10%) aren't in the car's display; the EPA rating includes them.",
    assume: "Energy equivalence per the EPA (33.705 kWh per gallon). Cost per mile uses your electricity and gas prices only, not maintenance.",
    faq: [["What is a good MPGe?", "Most EVs rate 90–130 MPGe; the most efficient small EVs exceed 130."], ["How many miles per kWh does an EV get?", "Typically 3–4.5 miles per kWh in mild weather."]],
  }),
];

const REPAIR: ToolDef[] = [
  mk({
    slug: "engine-rebuild-cost-calculator", title: "Engine Rebuild Cost Calculator",
    desc: "Estimate what an engine rebuild costs — parts, machine shop work and labor — for a 4-cylinder, V6, V8 or diesel, from a basic refresh to a performance build.",
    inputs: [dd("engine", "Engine", E.REBUILD.map((e) => e[0]), 2), dd("level", "Rebuild Level", E.REBUILD_LVL.map((l) => l[0]), 1), dd("rr", "Engine Removal & Install", ["By the shop (+6 h)", "I'll do it / already out"], 0), money("rate", "Shop Labor Rate per Hour", 130), num("hours", "Rebuild Labor Hours (0 = typical)", 0, 0, 200, 0.5), money("parts", "Parts Cost (0 = typical)", 0), money("machine", "Machine Shop Cost (0 = typical)", 0), money("extras", "Fluids, Gaskets, Shipping", 300)],
    results: [["total", "Estimated Rebuild Cost", "c"], ["low", "Low Estimate", "c"], ["high", "High Estimate", "c"], ["parts", "Parts", "c"], ["machine", "Machine Shop", "c"], ["labor", "Labor", "c"], ["how", "How It's Worked Out", "t"]],
    fn: C["engine-rebuild-cost-calculator"], ex: { engine: 2, level: 1, rr: 0, rate: 130, hours: 0, parts: 0, machine: 0, extras: 300 },
    exText: (o) => `Example: a full rebuild of a V8 with the shop removing and refitting it at $130 an hour → about ${usd(o.total)} (range ${usd(o.low)}–${usd(o.high)}).`,
    how: "Choose the engine and how deep the rebuild goes. A refresh replaces wear parts; a full rebuild adds machine work (boring, decking, crank grinding); a performance build adds upgraded internals.\n\nCompare the total with a remanufactured or used engine before you decide — a reman long block is often similar money with a warranty.",
    assume: COST_NOTE,
    faq: [["How much does it cost to rebuild an engine?", "Typically $3,000–$6,000 for a 4-cylinder and $5,000–$10,000 for a V8 at a shop; more for diesels and performance builds."], ["Is it cheaper to rebuild or replace an engine?", "Rebuilding is often cheaper for common engines; a used engine is cheapest but riskier."]],
  }),
  mk({
    slug: "clutch-replacement-cost-calculator", title: "Clutch Replacement Cost Calculator",
    desc: "Estimate clutch replacement cost — clutch kit, flywheel resurfacing or replacement and labor hours — for front-, rear- and all-wheel-drive cars.",
    inputs: [dd("type", "Drivetrain", E.CLUTCH.map((c) => c[0]), 0), money("rate", "Shop Labor Rate per Hour", 130), num("hours", "Labor Hours (0 = typical)", 0, 0, 30, 0.5), money("kit", "Clutch Kit Price (0 = typical)", 0), dd("fw", "Flywheel", ["Reuse as is", "Resurface", "Replace single-mass", "Replace dual-mass"], 1), dd("slave", "Replace Slave Cylinder / Release Bearing?", ["No (in kit)", "Yes"], 0), money("extras", "Fluid, Seals, Bolts", 80)],
    results: [["total", "Estimated Clutch Replacement Cost", "c"], ["low", "Low Estimate", "c"], ["high", "High Estimate", "c"], ["parts", "Parts", "c"], ["labor", "Labor", "c"], ["how", "How It's Worked Out", "t"]],
    fn: C["clutch-replacement-cost-calculator"], ex: { type: 0, rate: 130, hours: 0, kit: 0, fw: 1, slave: 0, extras: 80 },
    exText: (o) => `Example: a front-wheel-drive car with the flywheel resurfaced at $130 an hour → about ${usd(o.total)}.`,
    how: "Pick the drivetrain — it decides most of the labor time, because the transmission has to come out. A dual-mass flywheel is the most expensive part; many shops insist on replacing it if it's worn.\n\nIf you have a written quote, enter its hours and parts prices to check them.",
    assume: COST_NOTE,
    faq: [["How much does it cost to replace a clutch?", "Usually $1,200–$2,500 at an independent shop; AWD cars and dual-mass flywheels can push it past $3,000."], ["How long does a clutch replacement take?", "About 4–8 hours of labor for most cars."]],
  }),
  mk({
    slug: "car-restoration-cost-calculator", title: "Car Restoration Cost Calculator",
    desc: "Estimate the cost and time of restoring a classic car — driver, show or concours quality — from shop hours, labor rate, parts and the car's starting condition.",
    inputs: [dd("level", "Restoration Level", E.RESTO.map((r) => r[0]), 1), dd("cond", "Starting Condition", ["Solid, running car", "Average project", "Rusty / incomplete"], 1), money("rate", "Shop Rate per Hour", 90), num("hours", "Shop Hours (0 = typical for the level)", 0, 0, 10000, 10), money("parts", "Parts Budget (0 = typical)", 0), money("paint", "Paint & Materials (if separate)", 0), money("engine", "Engine / Drivetrain Rebuild", 0), num("week", "Hours Worked per Week", 30, 1, 80, 1), money("buy", "Price Paid for the Car", 0), money("after", "Expected Value When Finished", 0)],
    results: [["total", "Estimated Restoration Cost", "c"], ["labor", "Labor", "c"], ["parts", "Parts", "c"], ["hours", "Shop Hours", "n", 0], ["months", "Estimated Time (months)", "n", 1], ["value", "Value Gain After Costs", "c"], ["how", "How It's Worked Out", "t"]],
    fn: C["car-restoration-cost-calculator"], ex: { level: 1, cond: 1, rate: 90, hours: 0, parts: 0, paint: 0, engine: 0, week: 30, buy: 0, after: 0 },
    exText: (o) => `Example: a show-quality restoration of an average project at $90 an hour → about ${usd(o.total)} and ${o.months} months of shop time.`,
    how: "Choose the level you want and how rough the car is. Labor is most of the bill: a driver-quality job takes roughly 500–900 hours, a show car 1,200–2,000 and a concours frame-off 2,000–3,500.\n\nEnter what you paid and the expected finished value to see if the project makes financial sense — most restorations cost more than the car is worth afterwards.",
    assume: "Hours and parts ratios are typical figures from restoration shops (2025–26); rare models, rust and parts availability change them a lot. Shop rates range from $60 to $150 an hour.",
    faq: [["How much does it cost to restore a classic car?", "Roughly $50,000–$90,000 for driver quality and $100,000–$250,000+ for show or concours work at a professional shop."], ["How long does a car restoration take?", "Usually 6–18 months of shop time, often longer while waiting for parts."]],
  }),
];

export const VEH_FIN: [string, ToolDef[]][] = [
  ["auto-vehicle-loan-calculators", LOAN],
  ["car-buying-selling-calculators", BUY],
  ["car-ownership-fuel-ev-cost-calculators", [...OWN, ...OWN2]],
  ["auto-vehicle-insurance-calculators", INS],
  ["car-maintenance-repair-upgrade-calculators", REPAIR],
];

async function main() {
  const all = VEH_FIN.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.VEH_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  for (const [cat, tools] of VEH_FIN) await upsertTools(cat, tools);
}
main().catch((e) => { console.error(e); process.exit(1); });
