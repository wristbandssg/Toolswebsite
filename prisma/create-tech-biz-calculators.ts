// One-time (but safe to re-run) batch setup script: 8 IT business & project tools from the tech keyword
// check (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md), filed under Business & Industrial > HR,
// Marketing & Business Operations Calculators. Formulas: src/lib/calc-engine-tech-biz.ts.
//
// HOW TO RUN
//   npm run db:create-tech-biz-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-biz";
import { mk, num, dd, tx, money, pct, T, runBatch, type ToolDef } from "./trv-tool-kit";
import { nfmt } from "../src/lib/trv-core";

const C = E.techBizCustomCalculators;
const OPS = "hr-marketing-business-operations-calculators";

const TOOLS: ToolDef[] = [
  mk({
    slug: "app-development-cost-calculator", title: "App Development Cost Calculator (Mobile, Web & Software)",
    meta: "App Development Cost Calculator — How Much Does an App Cost?",
    desc: "Estimate what it costs to build a mobile app, web app or custom software from the platform, complexity, number of features, design level and developer rates by region. Shows total hours, a cost range, timeline and yearly maintenance.",
    inputs: [dd("platform", "Platform", E.APP_PLATFORMS.map(([l]) => l), 2), dd("complexity", "App Complexity", E.APP_COMPLEXITY.map(([l]) => l), 1), num("features", "Extra Features (chat, maps, offline, admin panel …)", 5, 0, 100, 1), dd("design", "Design", E.APP_DESIGN.map(([l]) => l), 1), dd("region", "Team Location / Rate", E.APP_RATES.map(([l]) => l), 1), num("rate", "Custom Hourly Rate ($)", 60, 0, 1000, 1, "$"), num("team", "Developers on the Project", 3, 1, 50, 1)],
    results: [["cost", "Estimated Cost", "c"], ["range", "Likely Range", "t"], ["hours", "Total Hours", "t"], ["weeks", "Timeline (weeks)", "n", 1], ["maint", "Maintenance", "t"], ["split", "Hours Breakdown", "t"]],
    fn: C["app-development-cost-calculator"], ex: { platform: 2, complexity: 1, features: 5, design: 1, region: 1, rate: 60, team: 3 },
    exText: (o) => `Example: a medium-complexity cross-platform app with 5 extra features and custom design, built by an Eastern European team at $45/h, costs about $${nfmt(Number(o.cost))} (${o.range}) and takes about ${o.weeks} weeks with 3 developers.`,
    how: "Cost = hours × hourly rate. Hours depend most on complexity: a simple app is about 400 hours, and a marketplace or real-time app 1,800 or more. Two separate native apps cost about 1.8× one; a cross-platform framework about 1.3×. QA adds 20% and project management 10%.\n\nBudget 15–20% of the build cost every year for updates, OS changes, hosting and bug fixes.",
    assume: "Ballpark estimates for planning and comparing quotes, not a fixed quote. Backend hosting, app store fees and marketing are extra.",
    faq: [["How much does it cost to make an app?", "Roughly $20,000–$60,000 for a simple app, $60,000–$150,000 for a medium one and $150,000+ for complex apps, depending heavily on the team's rates."], ["Is cross-platform cheaper?", "Usually about 30% cheaper than building separate iOS and Android apps."]],
  }),
  mk({
    slug: "msp-pricing-calculator", title: "MSP Pricing Calculator (Managed IT Services per User)",
    meta: "MSP Pricing Calculator — Managed IT Price per User & Margin",
    desc: "Price managed IT services: monthly revenue from per-user and per-server fees, your tool and technician costs, gross margin, and the per-user price needed to hit a target margin.",
    inputs: [num("users", "Users", 50, 0, 1e6, 1), num("devices", "Endpoints (PCs, laptops)", 60, 0, 1e6, 1), num("servers", "Servers", 3, 0, 1e5, 1), money("perUser", "Price per User per Month", 125), money("perServer", "Price per Server per Month", 200), money("tools", "Tool Stack Cost per Endpoint (RMM, AV, backup)", 12), num("hoursPerUser", "Support Hours per User per Month", 0.6, 0, 20, 0.05, "h"), money("labour", "Technician Cost per Hour", 45), pct("target", "Target Gross Margin (%)", 50, 90)],
    results: [["revenue", "Monthly Revenue", "c"], ["margin", "Gross Margin (%)", "n", 1], ["profit", "Monthly Gross Profit", "c"], ["cost", "Monthly Delivery Cost", "c"], ["annual", "Annual Contract Value", "c"], ["perUser", "Per-User Price for Target Margin", "t"], ["check", "Check", "t"]],
    fn: C["msp-pricing-calculator"], ex: { users: 50, devices: 60, servers: 3, perUser: 125, perServer: 200, tools: 12, hoursPerUser: 0.6, labour: 45, target: 50 },
    exText: (o) => `Example: 50 users at $125 plus 3 servers at $200 bring in $${nfmt(Number(o.revenue))} a month. Tools and technician time cost $${nfmt(Number(o.cost))}, so the gross margin is ${o.margin}%.`,
    how: "Most MSPs price per user (all devices included) with an extra fee per server. Delivery cost is the tool stack per endpoint plus technician time.\n\nA healthy managed-services gross margin is about 50–65%. Track support hours per user each month; it's the number that makes or breaks profitability.",
    assume: "Gross margin only (before sales, admin and overheads). Project work and hardware resale are separate.",
    faq: [["How much do MSPs charge per user?", "Typically $100–$200 per user per month for full managed IT in the US, depending on security and support level."], ["What margin should an MSP make?", "Around 50–65% gross margin on recurring services."]],
  }),
  mk({
    slug: "ai-automation-roi-calculator", title: "AI Agent ROI Calculator (Chatbot & Automation Savings)",
    meta: "AI ROI Calculator — Savings from AI Agents & Chatbots",
    desc: "Estimate the return on an AI agent, chatbot or voice AI: hours and money saved on tasks it handles, minus AI usage and platform fees and the setup cost. Shows monthly net savings, first-year ROI, payback and full-time equivalents freed.",
    inputs: [num("tasks", "Tasks / Conversations per Month", 2000, 0, 1e9, 1), num("minutes", "Minutes per Task Done Manually", 6, 0, 1000, 0.5, "min"), money("rate", "Staff Cost per Hour (fully loaded)", 30), pct("auto", "Share the AI Handles Fully (%)", 60), money("perTask", "AI Cost per Task (tokens, calls)", 0.05), money("fee", "Platform Fee per Month", 300), money("setup", "One-Time Setup Cost", 5000)],
    results: [["net", "Net Savings per Month", "c"], ["yearly", "First-Year Net Benefit", "c"], ["roi", "First-Year ROI (%)", "n", 1], ["payback", "Payback", "t"], ["hours", "Hours Saved per Month", "n", 1], ["fte", "Full-Time Equivalents Freed", "n", 2], ["run", "AI Running Cost per Month", "c"]],
    fn: C["ai-automation-roi-calculator"], ex: { tasks: 2000, minutes: 6, rate: 30, auto: 60, perTask: 0.05, fee: 300, setup: 5000 },
    exText: (o) => `Example: an AI agent handling 60% of 2,000 six-minute enquiries saves ${o.hours} staff hours a month. After running costs that's $${nfmt(Number(o.net))} a month, paying back the $5,000 setup in ${o.payback}.`,
    how: "Savings = tasks the AI fully resolves × minutes saved × staff cost per hour. Costs = AI usage per task + platform fee, plus the one-time build or integration cost.\n\nBe conservative about the containment rate (the share the AI handles without a human). 40–70% is common for well-scoped support bots.",
    assume: "Saved time is only real money if it's redeployed or avoids hiring. Quality, customer satisfaction and escalation handling aren't priced in.",
    faq: [["How do I calculate AI ROI?", "(Yearly savings − yearly AI costs − setup) ÷ (setup + yearly AI costs) × 100."], ["What is an FTE?", "A full-time equivalent: about 160 working hours a month."]],
  }),
  mk({
    slug: "test-automation-roi-calculator", title: "Test Automation ROI Calculator (Manual vs Automated Testing)",
    meta: "Test Automation ROI Calculator — Break-Even & 3-Year Savings",
    desc: "Compare manual testing with automated testing: the yearly cost of manual test runs, the build and maintenance cost of automation, break-even point in releases, and the 1-year and 3-year savings and ROI.",
    inputs: [num("tests", "Test Cases", 300, 1, 1e6, 1), num("minutes", "Manual Minutes per Test", 10, 0.1, 1000, 0.5, "min"), num("runs", "Test Runs per Release", 3, 1, 100, 1), num("releases", "Releases per Year", 24, 1, 1000, 1), money("rate", "Tester Cost per Hour", 50), num("buildHours", "Hours to Automate One Test", 2, 0, 100, 0.25, "h"), pct("maint", "Yearly Maintenance (% of build effort)", 20), money("infra", "Infrastructure Cost per Automated Run", 5)],
    results: [["y1", "First-Year Savings", "c"], ["y3", "3-Year Savings", "c"], ["breakeven", "Break-Even", "t"], ["roi3", "3-Year ROI (%)", "n", 1], ["manual", "Manual Testing Cost per Year", "c"], ["build", "Automation Build Cost", "c"], ["autoYear", "Automation Running Cost per Year", "c"]],
    fn: C["test-automation-roi-calculator"], ex: { tests: 300, minutes: 10, runs: 3, releases: 24, rate: 50, buildHours: 2, maint: 20, infra: 5 },
    exText: (o) => `Example: 300 tests × 10 minutes, run 3 times per release and 24 releases a year, cost $${nfmt(Number(o.manual))} a year by hand. Automating them costs $${nfmt(Number(o.build))} and breaks even after ${o.breakeven}.`,
    how: "Manual cost = tests × time × runs × releases × hourly cost. Automation costs the build once, plus yearly maintenance (scripts break as the product changes) and machine time.\n\nAutomation pays off fastest for stable, frequently run regression tests. Exploratory and one-off tests are better left manual.",
    assume: "Assumes the automated suite replaces the manual runs completely. Flaky-test triage time is included in the maintenance percentage.",
    faq: [["Is test automation worth it?", "Usually yes when the same tests run every release. Break-even typically comes after 5–15 releases."], ["How much maintenance does test automation need?", "About 15–30% of the original build effort every year."]],
  }),
  mk({
    slug: "data-breach-cost-calculator", title: "Data Breach Cost Calculator (Cyber Risk & Annual Loss)",
    meta: "Data Breach Cost Calculator — Cost per Record & Cyber Risk",
    desc: "Estimate what a data breach or ransomware incident could cost: per-record costs, downtime, fines and other expenses, plus the annualised loss expectancy (ALE) from the yearly chance of a breach, for cybersecurity budgeting.",
    inputs: [num("records", "Records Exposed", 10000, 0, 1e10, 1), money("perRecord", "Cost per Record", 165), num("downtime", "Downtime (hours)", 24, 0, 1e5, 1, "h"), money("revenueHour", "Revenue / Productivity Lost per Hour", 2000), money("fines", "Regulatory Fines & Legal", 0), money("other", "Other Costs (ransom, PR, insurance excess)", 0), pct("prob", "Chance of a Breach This Year (%)", 10)],
    results: [["total", "Estimated Breach Cost", "c"], ["ale", "Annualised Loss Expectancy", "c"], ["data", "Record-Related Costs", "c"], ["down", "Downtime Cost", "c"], ["perRecord", "Total per Record", "t"], ["budget", "Security Budget Guide", "t"]],
    fn: C["data-breach-cost-calculator"], ex: { records: 10000, perRecord: 165, downtime: 24, revenueHour: 2000, fines: 0, other: 0, prob: 10 },
    exText: (o) => `Example: 10,000 customer records at $165 each plus a day of downtime adds up to about $${nfmt(Number(o.total))}. At a 10% yearly chance, the expected loss is $${nfmt(Number(o.ale))} a year.`,
    how: "Per-record cost covers detection, notification, customer support, credit monitoring and lost business. IBM's yearly Cost of a Data Breach study puts it around $160–$170 per record on average, and higher in healthcare and finance.\n\nALE (annualised loss expectancy) = breach cost × yearly probability. Security controls that cost less than the risk they remove are worth it.",
    assume: "Averages vary widely by industry, country and breach size. Very large breaches have a lower cost per record. Enter fines that apply to you (GDPR, HIPAA, state laws).",
    faq: [["How much does a data breach cost?", "IBM's 2024 study puts the global average at about $4.9 million per breach, and over $9 million in the US."], ["What is ALE?", "Annualised loss expectancy: the average yearly loss from a risk (cost × chance per year)."]],
  }),
  mk({
    slug: "pert-estimate-calculator", title: "PERT Calculator (Three-Point Estimate & Project Probability)",
    meta: "PERT Calculator — Three-Point Estimate, Std Dev & P80/P95",
    desc: "Calculate PERT three-point estimates from optimistic, most likely and pessimistic durations for each task. Gives the expected project time, standard deviation, P50/P80/P95 durations and the probability of finishing by a deadline.",
    inputs: [tx("tasks", "Tasks as O, M, P (separate tasks with ;)", "2, 4, 8; 3, 5, 10; 1, 2, 4"), num("deadline", "Deadline (same units, optional)", 14, 0, 1e6, 0.5)],
    results: [["e", "Expected Duration", "n", 2], ["sd", "Standard Deviation", "n", 2], ["p80", "80% Confidence (P80)", "n", 1], ["p95", "95% Confidence (P95)", "n", 1], ["p50", "50% (P50)", "n", 1], ["prob", "Chance to Meet Deadline", "t"], ["each", "Per Task", "t"]],
    fn: C["pert-estimate-calculator"], ex: { ...T("tasks", "2, 4, 8; 3, 5, 10; 1, 2, 4"), deadline: 14 },
    exText: (o) => `Example: three tasks estimated at 2/4/8, 3/5/10 and 1/2/4 days give an expected ${o.e} days ± ${o.sd}. You can promise ${o.p80} days with 80% confidence; ${o.prob}.`,
    how: "For each task, PERT expected time E = (O + 4M + P) ÷ 6 and standard deviation σ = (P − O) ÷ 6. For tasks done one after another (the critical path), add the E values and combine the σ values as √(σ₁² + σ₂² + …).\n\nCommit to P80 or P95 rather than the expected value, which you'll miss about half the time.",
    assume: "Tasks are sequential and independent, and the total is roughly normally distributed. For parallel tasks, list only the critical path.",
    faq: [["What is the PERT formula?", "E = (Optimistic + 4 × Most likely + Pessimistic) ÷ 6."], ["What is P80 in project estimates?", "The duration you'll meet 80% of the time: expected + 0.84 standard deviations."]],
  }),
  mk({
    slug: "wsjf-calculator", title: "WSJF Calculator (Weighted Shortest Job First Prioritisation)",
    meta: "WSJF Calculator — SAFe Backlog Prioritization Scores",
    desc: "Rank backlog items with WSJF (Weighted Shortest Job First) from business value, time criticality, risk reduction / opportunity enablement and job size, as used in SAFe PI planning.",
    inputs: [tx("items", "Items: name: value, time criticality, risk/opportunity, size (separate with ;)", "Login: 8, 5, 3, 5; Search: 13, 8, 2, 8; Export: 3, 2, 1, 2")],
    results: [["top", "Do First", "t"], ["ranking", "Ranking", "t"], ["count", "Items", "n", 0], ["avg", "Average WSJF", "n", 2]],
    fn: C["wsjf-calculator"], ex: T("items", "Login: 8, 5, 3, 5; Search: 13, 8, 2, 8; Export: 3, 2, 1, 2"),
    exText: (o) => `Example: ${o.top} comes first. Search is the most valuable, but it's big, so smaller jobs with a good cost of delay score higher.`,
    how: "Cost of delay = user/business value + time criticality + risk reduction / opportunity enablement. WSJF = cost of delay ÷ job size. Do the highest WSJF first: it delivers the most value per unit of time.\n\nScore each factor relative to the other items, usually with modified Fibonacci numbers (1, 2, 3, 5, 8, 13, 20). The smallest item gets 1 in each column.",
    assume: "Relative scoring, as in the Scaled Agile Framework. Job size is a proxy for duration.",
    faq: [["What is WSJF?", "Weighted Shortest Job First: a SAFe method that ranks work by cost of delay divided by job size."], ["Why does a small job beat a big valuable one?", "Finishing it quickly delivers value sooner, and the big job's value is delayed only a little."]],
  }),
  mk({
    slug: "sprint-velocity-calculator", title: "Sprint Velocity Calculator (Scrum Forecast & Capacity)",
    meta: "Sprint Velocity Calculator — Average Velocity & Release Forecast",
    desc: "Calculate a Scrum team's average velocity from past sprints, forecast how many sprints and weeks the remaining backlog will take (with a best/worst range), and size the next sprint for team availability.",
    inputs: [tx("past", "Story Points Completed in Recent Sprints", "21, 25, 18, 24"), num("backlog", "Remaining Backlog (points)", 200, 0, 1e7, 1), num("length", "Sprint Length (weeks)", 2, 0.5, 8, 0.5, "wk"), pct("capacity", "Team Availability Next Sprint (%)", 80, 150)],
    results: [["avg", "Average Velocity", "n", 1], ["sprints", "Sprints to Finish (average)", "n", 0], ["weeks", "Weeks to Finish", "n", 1], ["range", "Likely Range", "t"], ["next", "Next Sprint Commitment (points)", "n", 0], ["sd", "Velocity Std Dev", "n", 1], ["recent", "Last 3 Sprints Average", "n", 1]],
    fn: C["sprint-velocity-calculator"], ex: { ...T("past", "21, 25, 18, 24"), backlog: 200, length: 2, capacity: 80 },
    exText: (o) => `Example: past sprints of 21, 25, 18 and 24 points average ${o.avg}. A 200-point backlog then needs about ${o.sprints} two-week sprints (${o.range}).`,
    how: "Velocity is the story points the team actually finishes per sprint. Use at least 3–5 recent sprints. Divide the remaining backlog by the average velocity to forecast, and use average ± one standard deviation for a realistic range.\n\nFor the next sprint, scale the average by availability (holidays, part-time members).",
    assume: "Assumes the backlog is estimated in the same points scale and the team stays the same. Scope creep isn't included, so add a buffer.",
    faq: [["How is velocity calculated?", "The average of completed story points over recent sprints."], ["Should I compare velocity between teams?", "No. Points are relative to each team, so velocity is for forecasting only."]],
  }),
];

runBatch(OPS, TOOLS);
