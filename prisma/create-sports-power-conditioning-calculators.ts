// One-time (but safe to re-run) batch setup script: creates the 12 tools of
// the sports performance sub-batch H (Power & Conditioning). See
// prisma/create-sports-strength-programming-calculators.ts for the full list
// of 8 sub-batches (76 tools under Sports Calculators > Sports Performance
// Calculators), and src/lib/calc-engine-sports-power-conditioning.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-power-conditioning-calculators.ts
// or
//   npm run db:create-sports-power-conditioning-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Sports Performance Calculators", slug: "sports-performance-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for training planning only. High-intensity intervals, jump and sprint tests are demanding — warm up thoroughly, build up gradually and check with a doctor first if you have a heart condition or other health concern.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });

const WUNIT: [string, number][] = [["kg / cm", 1], ["lb / in", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "wingate-test-calculator",
    title: "Wingate Test Calculator",
    description: "Analyse a 30-second Wingate anaerobic cycle test: relative peak power output (W/kg), mean power, fatigue index and total work — plus the right resistance to set.",
    metaTitle: "Wingate Test Calculator — Peak Power & Fatigue Index",
    metaDescription: "Free Wingate test calculator. Get relative peak power output, mean power, fatigue index and total work from a 30-second sprint test.",
    calcInputs: [
      dropdown("unit", "Weight Unit", WUNIT, 1),
      numberField("bodyweight", "Bodyweight", { default: 75, max: 400, step: 0.1 }),
      numberField("peakPower", "Peak Power (W, Highest 5 s)", { default: 900, max: 3000, step: 1 }),
      numberField("meanPower", "Mean Power Over 30 s (W)", { default: 650, max: 3000, step: 1 }),
      numberField("minPower", "Lowest Power (W, Last 5 s)", { default: 450, max: 3000, step: 1 }),
    ],
    calcResult: { label: "Relative Peak Power", format: "number" },
    calcResults: [num("relativePeakPower", "Relative Peak Power (W/kg)", true), num("relativeMeanPower", "Relative Mean Power (W/kg)"), pct("fatigueIndex", "Fatigue Index"), num("totalWorkKj", "Total Work (kJ)"), num("recommendedResistanceKg", "Recommended Flywheel Resistance (kg)")],
    instructions: "Enter bodyweight and the peak, mean and lowest power from your bike's Wingate readout.",
    examples: "Example: a 75 kg athlete with 900 W peak, 650 W mean and 450 W minimum power has a relative peak power of 12 W/kg, a 50% fatigue index and 19.5 kJ of work.",
    assumptions: "Fatigue index = (peak − minimum) ÷ peak. Standard Monark resistance is 0.075 kg per kg bodyweight. Trained male sprinters typically reach 11–14 W/kg peak. Also covers the peak power output calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a good Wingate peak power?", answer: "Untrained men average about 9–10 W/kg and women 7–8 W/kg; trained sprinters reach 12–15 W/kg." },
      { question: "What does the fatigue index show?", answer: "How much power drops over 30 seconds. Sprinters fade more (40–60%) than endurance athletes (25–40%)." },
    ],
  },
  {
    slug: "anaerobic-power-calculator",
    title: "Anaerobic Power Calculator",
    description: "Estimate anaerobic power from a vertical jump using the Lewis formula and the Harman peak and average power equations.",
    metaTitle: "Anaerobic Power Calculator — Lewis & Harman",
    metaDescription: "Free anaerobic power calculator. Estimate leg power in watts from vertical jump and bodyweight with the Lewis and Harman formulas.",
    calcInputs: [dropdown("unit", "Units", WUNIT, 1), numberField("bodyweight", "Bodyweight", { default: 75, max: 400, step: 0.1 }), numberField("jumpHeight", "Vertical Jump Height", { default: 50, max: 150, step: 0.5 })],
    calcResult: { label: "Lewis Power", format: "number" },
    calcResults: [num("lewisPowerWatts", "Lewis Anaerobic Power (W)", true), num("harmanPeakPowerWatts", "Harman Peak Power (W)"), num("harmanAveragePowerWatts", "Harman Average Power (W)"), num("lewisPowerPerKg", "Lewis Power per kg")],
    instructions: "Enter your bodyweight and best vertical jump (stand-and-reach jump height).",
    examples: "Example: a 75 kg athlete jumping 50 cm has a Lewis power of about 1,152 W (15.4 W/kg); the Harman equations give 3,973 W peak and 1,392 W average.",
    assumptions: "Lewis: √4.9 × mass × √jump height (m) × 9.81. Harman (1991): peak = 61.9 × cm + 36 × kg − 1,822; average = 21.2 × cm + 23 × kg − 1,393. The Lewis formula is known to under-estimate true peak power; use it to track change over time. " + DISCLAIMER,
    faq: [
      { question: "Why do the formulas give such different numbers?", answer: "Lewis gives an average power over the whole push-off; Harman's peak formula estimates the single instant of maximum power, which is much higher." },
      { question: "Which formula should I use?", answer: "Use one consistently. For peak power, the Sayers and Harman equations match lab measurements better than Lewis." },
    ],
  },
  {
    slug: "sayers-jump-power-calculator",
    title: "Sayers Jump Power Calculator",
    description: "Estimate peak leg power in watts from a countermovement or squat jump with the Sayers equation, plus power per kilogram.",
    metaTitle: "Sayers Jump Power Calculator — Peak Watts",
    metaDescription: "Free Sayers jump power calculator. Estimate peak power from countermovement or squat jump height and bodyweight.",
    calcInputs: [
      dropdown("unit", "Units", WUNIT, 1),
      numberField("bodyweight", "Bodyweight", { default: 75, max: 400, step: 0.1 }),
      numberField("jumpHeight", "Jump Height", { default: 50, max: 150, step: 0.5 }),
      dropdown("jumpType", "Jump Type", [["Countermovement jump (dip and jump)", 1], ["Squat jump (from a paused squat)", 2]], 1),
    ],
    calcResult: { label: "Peak Power", format: "number" },
    calcResults: [num("peakPowerWatts", "Peak Power (W)", true), num("peakPowerPerKg", "Peak Power per kg (W/kg)"), num("squatJumpFormulaWatts", "Squat-Jump Formula (W)")],
    instructions: "Enter bodyweight and jump height, and choose the jump type you tested.",
    examples: "Example: a 75 kg athlete with a 50 cm countermovement jump produces about 4,256 W of peak power — 56.7 W/kg.",
    assumptions: "Sayers et al. (1999): countermovement = 51.9 × cm + 48.9 × kg − 2,007; squat jump = 60.7 × cm + 45.3 × kg − 2,055. Accurate to within about 10% of force-plate values for most adults. " + DISCLAIMER,
    faq: [
      { question: "What is a good jump power?", answer: "Around 50–60 W/kg is typical for trained male athletes; elite jumpers and sprinters exceed 65 W/kg." },
      { question: "Countermovement or squat jump?", answer: "The countermovement jump is more natural and higher; the squat jump isolates concentric power. Pick one and stick with it for testing." },
    ],
  },
  {
    slug: "margaria-kalamen-calculator",
    title: "Margaria-Kalamen Calculator",
    description: "Calculate power from the Margaria-Kalamen stair sprint test — the time from the 3rd to the 9th step, your bodyweight and step height.",
    metaTitle: "Margaria-Kalamen Power Test Calculator",
    metaDescription: "Free Margaria-Kalamen calculator. Turn stair-sprint time, step height and bodyweight into anaerobic power in watts and W/kg.",
    calcInputs: [
      dropdown("unit", "Units", WUNIT, 1),
      numberField("bodyweight", "Bodyweight", { default: 75, max: 400, step: 0.1 }),
      numberField("stepHeight", "Height of One Step", { default: 17.5, max: 40, step: 0.1 }),
      numberField("timeSeconds", "Time from Step 3 to Step 9 (s)", { default: 0.6, min: 0.2, max: 3, step: 0.01 }),
    ],
    calcResult: { label: "Power", format: "number" },
    calcResults: [num("powerWatts", "Power (W)", true), num("powerPerKg", "Power per kg (W/kg)"), num("verticalHeightMeters", "Vertical Height Climbed (m)")],
    instructions: "Sprint 6 m to a staircase and up it three steps at a time. Time how long it takes to go from the 3rd to the 9th step (timing mats work best) and measure one step's height.",
    examples: "Example: a 75 kg athlete covering 6 steps of 17.5 cm (1.05 m) in 0.6 s produces about 1,288 W — 17.2 W/kg.",
    assumptions: "Power = mass × 9.81 × vertical height ÷ time. Hand timing is too slow for this test — use timing mats or video. " + DISCLAIMER,
    faq: [
      { question: "What does the Margaria-Kalamen test measure?", answer: "Short-burst anaerobic (alactic) leg power — the explosive ability used in sprint starts and jumps." },
      { question: "What is a good score?", answer: "For men aged 20–30, about 1,500+ W is excellent and 1,000–1,200 W average; women score roughly 20–30% lower." },
    ],
  },
  {
    slug: "hiit-interval-calculator",
    title: "HIIT Interval Calculator",
    description: "Plan any HIIT workout — work and rest intervals, rounds, sets, warm-up and cool-down — and see total time, work time, work-to-rest ratio and calories.",
    metaTitle: "HIIT Interval Calculator — Workout Time & Calories",
    metaDescription: "Free HIIT interval calculator. Plan work/rest intervals, rounds and sets and get total time, work-to-rest ratio and calories.",
    calcInputs: [
      numberField("workSeconds", "Work Interval (s)", { default: 40, min: 5, max: 600 }),
      numberField("restSeconds", "Rest Interval (s)", { default: 20, max: 600 }),
      numberField("rounds", "Rounds per Set", { default: 8, min: 1, max: 50 }),
      numberField("sets", "Sets", { default: 3, min: 1, max: 20 }),
      numberField("restBetweenSetsSeconds", "Rest Between Sets (s)", { default: 60, max: 600, required: false }),
      numberField("warmUpMinutes", "Warm-Up (Min)", { default: 5, max: 30, required: false }),
      numberField("coolDownMinutes", "Cool-Down (Min)", { default: 5, max: 30, required: false }),
      dropdown("unit", "Weight Unit", WUNIT, 1),
      numberField("bodyweight", "Bodyweight (for Calories)", { default: 75, max: 400, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total Time", format: "number" },
    calcResults: [num("totalMinutes", "Total Workout Time (Min)", true), num("workMinutes", "Time Working (Min)"), num("workToRestRatio", "Work-to-Rest Ratio"), num("totalIntervals", "Total Intervals"), num("estimatedCalories", "Estimated Calories")],
    instructions: "Enter your work and rest times, rounds per set, number of sets and rest between sets. Add warm-up and cool-down to see the whole session.",
    examples: "Example: 40 s on / 20 s off for 8 rounds, 3 sets with 60 s between, plus 5 minutes warm-up and cool-down, takes 35 minutes with 16 minutes of work (a 2:1 ratio) — about 310 kcal for a 75 kg person.",
    assumptions: "Calories assume about 10 METs while working and 4 METs for rest, warm-up and cool-down — real values depend on the exercises and effort. " + DISCLAIMER,
    faq: [
      { question: "What is a good HIIT work-to-rest ratio?", answer: "1:1 to 2:1 for most workouts; 1:2 or 1:3 when each interval is an all-out sprint." },
      { question: "How long should a HIIT workout be?", answer: "10–30 minutes of intervals is plenty — true high intensity can't be held much longer." },
    ],
  },
  {
    slug: "tabata-calculator",
    title: "Tabata Calculator",
    description: "Plan Tabata workouts — 20 seconds all-out, 10 seconds rest, 8 rounds per 4-minute block — with total time, work time, rounds and calories.",
    metaTitle: "Tabata Calculator — Tabata Timer Plan",
    metaDescription: "Free Tabata calculator. Plan 4-minute Tabata blocks and get total workout time, work time, rounds and calories burned.",
    calcInputs: [
      numberField("blocks", "Number of Tabata Blocks (4 Min Each)", { default: 4, min: 1, max: 15 }),
      numberField("restBetweenBlocksSeconds", "Rest Between Blocks (s)", { default: 60, max: 600 }),
      dropdown("intensity", "Exercise Type", [["Bodyweight moves", 1], ["Mixed (burpees, kettlebells)", 2], ["All-out sprint / bike", 3]], 2),
      dropdown("unit", "Weight Unit", WUNIT, 1),
      numberField("bodyweight", "Bodyweight (for Calories)", { default: 75, max: 400, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total Time", format: "number" },
    calcResults: [num("totalMinutes", "Total Time (Min)", true), num("workMinutes", "Time Working (Min)"), num("totalRounds", "Total Rounds"), num("estimatedCalories", "Estimated Calories")],
    instructions: "Enter how many 4-minute Tabata blocks you'll do, the rest between them and the type of exercise.",
    examples: "Example: 4 Tabata blocks with 1 minute between them take 19 minutes — 32 rounds and 10.7 minutes of all-out work — burning about 184 kcal at 75 kg.",
    assumptions: "Classic Tabata protocol (Izumi Tabata, 1996): 8 × 20 s work / 10 s rest. Calories use about 8/10/12 METs during work by exercise type and 4 METs during rest. " + DISCLAIMER,
    faq: [
      { question: "Is Tabata the same as HIIT?", answer: "Tabata is one specific HIIT protocol — 20/10 × 8. The original study used an all-out bike effort at about 170% of VO2 max." },
      { question: "Is one 4-minute Tabata enough?", answer: "Done truly all-out, one block is a big stimulus; most class versions use 3–6 blocks at a lower intensity." },
    ],
  },
  {
    slug: "emom-calculator",
    title: "EMOM Calculator",
    description: "Plan an EMOM (every minute on the minute) workout — total reps, volume, and how much rest you get each minute — and check that it's sustainable.",
    metaTitle: "EMOM Calculator — Every Minute on the Minute",
    metaDescription: "Free EMOM calculator. Get total reps, volume, work and rest per minute and check your EMOM is sustainable.",
    calcInputs: [
      numberField("minutes", "EMOM Length (Minutes)", { default: 12, min: 1, max: 60 }),
      numberField("repsPerMinute", "Reps Each Minute", { default: 10, min: 1, max: 100 }),
      numberField("secondsPerRep", "Seconds per Rep", { default: 3, min: 0.5, max: 20, step: 0.5 }),
      numberField("weight", "Weight Used (Optional)", { default: 24, max: 500, step: 0.5, required: false }),
    ],
    calcResult: { label: "Total Reps", format: "number" },
    calcResults: [num("totalReps", "Total Reps", true), num("totalVolume", "Total Volume (Reps × Weight)"), num("workSecondsPerMinute", "Work Seconds Each Minute"), num("restSecondsPerMinute", "Rest Seconds Each Minute"), num("sustainable", "Sustainable (1 = Yes, Under 45 s Work)")],
    instructions: "Enter the EMOM length, reps you'll do at the top of each minute, how long a rep takes you and the weight (for volume).",
    examples: "Example: a 12-minute EMOM of 10 kettlebell swings with a 24 kg bell is 120 reps and 2,880 kg of volume, with 30 seconds of rest each minute.",
    assumptions: "If work takes more than about 45 seconds a minute, there's too little rest to keep the clock — reduce reps. " + DISCLAIMER,
    faq: [
      { question: "What is an EMOM workout?", answer: "Every minute on the minute — you do a set number of reps at the start of each minute and rest for whatever time is left." },
      { question: "How do I pick EMOM reps?", answer: "Choose a number you can finish in 20–40 seconds while fresh, leaving enough rest for the later minutes." },
    ],
  },
  {
    slug: "amrap-score-calculator",
    title: "AMRAP Score Calculator",
    description: "Turn an AMRAP (as many rounds and reps as possible) result into total reps, decimal rounds, reps per minute and average time per round.",
    metaTitle: "AMRAP Score Calculator — Rounds + Reps",
    metaDescription: "Free AMRAP calculator. Convert rounds plus reps into total reps, rounds, reps per minute and time per round.",
    calcInputs: [numberField("repsPerRound", "Reps in One Round", { default: 30, min: 1, max: 500 }), numberField("roundsCompleted", "Full Rounds Completed", { default: 6, max: 200 }), numberField("extraReps", "Extra Reps into the Next Round", { default: 12, max: 499 }), numberField("timeCapMinutes", "Time Cap (Minutes)", { default: 20, min: 1, max: 120 })],
    calcResult: { label: "Total Reps", format: "number" },
    calcResults: [num("totalReps", "Total Reps (Score)", true), num("roundsDecimal", "Rounds (Decimal)"), num("repsPerMinute", "Reps per Minute"), num("secondsPerRound", "Average Seconds per Round")],
    instructions: "Enter the reps in one round of the workout, how many full rounds you finished, the extra reps you got into the next round and the time cap.",
    examples: "Example: 6 rounds + 12 reps of a 30-rep round in 20 minutes is 192 reps — 6.4 rounds, 9.6 reps a minute, about 3:08 per round.",
    assumptions: "Rounds + reps is converted to total reps for scoring and comparison. " + DISCLAIMER,
    faq: [
      { question: "How is an AMRAP scored?", answer: "As rounds plus reps (e.g. 6 + 12), which is the same as total reps when every round has the same reps." },
      { question: "How do I pace an AMRAP?", answer: "Aim for even rounds — start at a pace you can hold, then push in the last few minutes." },
    ],
  },
  {
    slug: "crossfit-open-score-calculator",
    title: "CrossFit Open Score Calculator",
    description: "Work out your CrossFit Open score from your workout ranks — total points, average rank and estimated overall percentile.",
    metaTitle: "CrossFit Open Score Calculator — Points & Percentile",
    metaDescription: "Free CrossFit Open score calculator. Add up your workout ranks into total points, average rank and percentile.",
    calcInputs: [
      numberField("participants", "Athletes in Your Division", { default: 200000, min: 1, max: 1000000, step: 100 }),
      numberField("rank1", "Workout 1 Rank", { default: 50000, max: 1000000 }),
      numberField("rank2", "Workout 2 Rank", { default: 60000, max: 1000000, required: false }),
      numberField("rank3", "Workout 3 Rank", { default: 45000, max: 1000000, required: false }),
    ],
    calcResult: { label: "Total Points", format: "number" },
    calcResults: [num("totalPoints", "Total Points (Lower Is Better)", true), num("averageRank", "Average Rank"), pct("averagePercentile", "Average Percentile"), pct("topPercent", "You're in the Top")],
    instructions: "Enter how many athletes are in your division and your rank on each Open workout from the leaderboard.",
    examples: "Example: ranks of 50,000, 60,000 and 45,000 among 200,000 athletes total 155,000 points — an average rank of 51,667, around the 74th percentile (top 26%).",
    assumptions: "CrossFit Open scoring: your rank in each workout is your points for it, and the lowest total wins. The percentile is the average of your workout percentiles — your overall percentile is usually close. Also covers the CrossFit score calculator. " + DISCLAIMER,
    faq: [
      { question: "How does CrossFit Open scoring work?", answer: "Each workout's rank becomes points (1st = 1 point), and the athlete with the fewest total points ranks highest." },
      { question: "What percentile makes Quarterfinals?", answer: "Roughly the top 10% of each division advances, though it changes from season to season." },
    ],
  },
  {
    slug: "murph-time-calculator",
    title: "Murph Time Calculator",
    description: "Predict your Murph time — 1-mile run, 100 pull-ups, 200 push-ups, 300 squats, 1-mile run — from your mile pace and rep speed, with or without a vest.",
    metaTitle: "Murph Time Calculator — Predict Your Murph",
    metaDescription: "Free Murph calculator. Predict your Murph workout time from mile pace, rep speed and rest, with or without a 20 lb vest.",
    calcInputs: [
      numberField("mileMinutes", "Mile Pace — Minutes", { default: 8, min: 4, max: 20 }),
      numberField("mileSeconds", "Mile Pace — Seconds", { default: 0, max: 59 }),
      numberField("pullUpSeconds", "Seconds per Pull-Up", { default: 3, min: 1, max: 15, step: 0.5 }),
      numberField("pushUpSeconds", "Seconds per Push-Up", { default: 2, min: 0.5, max: 10, step: 0.5 }),
      numberField("squatSeconds", "Seconds per Air Squat", { default: 1.5, min: 0.5, max: 10, step: 0.5 }),
      numberField("restMinutes", "Total Rest During Calisthenics (Min)", { default: 10, max: 60 }),
      dropdown("vest", "Weight Vest", [["No vest", 1], ["20 lb / 14 lb vest (Rx)", 2]], 1),
    ],
    calcResult: { label: "Total Time", format: "number" },
    calcResults: [num("totalMinutes", "Total Time (Minutes)", true), num("hours", "Hours"), num("minutes", "Minutes"), num("seconds", "Seconds"), num("runMinutes", "Running (Min)"), num("calisthenicsMinutes", "Pull-Ups, Push-Ups & Squats (Min)")],
    instructions: "Enter your mile pace for this workout (slower than a fresh mile), how long each rep takes and how much rest you expect in total during the calisthenics.",
    examples: "Example: 8:00 miles, 3 s pull-ups, 2 s push-ups, 1.5 s squats and 10 minutes of rest predict a Murph of about 45 minutes — 16 minutes running and 29 minutes of calisthenics.",
    assumptions: "A weight vest is assumed to slow everything about 12%. Partitioning (e.g. 20 rounds of 5-10-15) mostly affects rest, not rep speed. " + DISCLAIMER,
    faq: [
      { question: "What is a good Murph time?", answer: "Under an hour without a vest is solid; under 45 minutes with a vest is elite." },
      { question: "Can I partition Murph?", answer: "Yes — most people split the calisthenics into rounds (like 20 × 5 pull-ups, 10 push-ups, 15 squats). Rx means wearing the vest throughout." },
    ],
  },
  {
    slug: "hyrox-time-calculator",
    title: "Hyrox Time Calculator",
    description: "Predict your Hyrox finish time from your 1 km run pace, your time on each of the 8 stations and your Roxzone transitions — with run and station splits.",
    metaTitle: "Hyrox Time Calculator — Predict Your Finish",
    metaDescription: "Free Hyrox time calculator. Add 8 × 1 km runs, the 8 stations and Roxzone transitions to predict your finish time.",
    calcInputs: [
      numberField("runPaceMin", "Average 1 km Run — Minutes", { default: 5, min: 2, max: 15 }),
      numberField("runPaceSec", "Average 1 km Run — Seconds", { default: 30, max: 59 }),
      numberField("skiErg", "SkiErg 1000 m (s)", { default: 270, max: 1200 }),
      numberField("sledPush", "Sled Push 50 m (s)", { default: 180, max: 1200 }),
      numberField("sledPull", "Sled Pull 50 m (s)", { default: 240, max: 1200 }),
      numberField("burpeeBroadJumps", "Burpee Broad Jumps 80 m (s)", { default: 300, max: 1200 }),
      numberField("rowing", "Rowing 1000 m (s)", { default: 285, max: 1200 }),
      numberField("farmersCarry", "Farmers Carry 200 m (s)", { default: 120, max: 1200 }),
      numberField("sandbagLunges", "Sandbag Lunges 100 m (s)", { default: 270, max: 1200 }),
      numberField("wallBalls", "Wall Balls 100 Reps (s)", { default: 360, max: 1800 }),
      numberField("roxzoneMinutes", "Roxzone Transitions, Total (Min)", { default: 8, max: 30 }),
    ],
    calcResult: { label: "Finish Time", format: "number" },
    calcResults: [num("finishHours", "Finish — Hours", true), num("finishMinutes", "Finish — Minutes"), num("finishSeconds", "Finish — Seconds"), num("totalRunMinutes", "Running (Min)"), num("totalStationMinutes", "Stations (Min)"), num("roxzoneMinutes", "Roxzone (Min)"), pct("runShare", "Share of Time Running")],
    instructions: "Enter your realistic race-day 1 km pace (slower than a fresh 1 km) and your time on each station in seconds, plus total transition time.",
    examples: "Example: 5:30 per km, the default station times and 8 minutes of Roxzone add up to a finish of 1:25:45 — 44 minutes running, 33.75 minutes on stations.",
    assumptions: "Hyrox format: 8 × 1 km runs, each followed by a station — SkiErg 1000 m, sled push 50 m, sled pull 50 m, burpee broad jumps 80 m, row 1000 m, farmers carry 200 m, sandbag lunges 100 m, 100 wall balls. Station weights depend on your division. " + DISCLAIMER,
    faq: [
      { question: "What is a good Hyrox time?", answer: "Under 1:30 is a strong age-group time for Open men; under 1:15 is very competitive. Elite athletes finish under an hour." },
      { question: "What is the Roxzone?", answer: "The transition area between the run track and the stations — usually 5–10 minutes in total for most athletes." },
    ],
  },
  {
    slug: "hyrox-pace-calculator",
    title: "Hyrox Pace Calculator",
    description: "Work backward from a target Hyrox finish time to the 1 km run pace and average station time you need, with your Roxzone budget.",
    metaTitle: "Hyrox Pace Calculator — Target Time to Run Pace",
    metaDescription: "Free Hyrox pace calculator. Turn a target finish time into the 1 km run pace and station times you need.",
    calcInputs: [
      numberField("targetHours", "Target Time — Hours", { default: 1, max: 4 }),
      numberField("targetMinutes", "Target Time — Minutes", { default: 20, max: 59 }),
      numberField("roxzoneMinutes", "Expected Roxzone Time (Min)", { default: 7, max: 30 }),
      percentField("runSharePercent", "Share of Active Time Spent Running", { default: 50, min: 20, max: 80 }),
    ],
    calcResult: { label: "Run Pace", format: "number" },
    calcResults: [num("runPaceMinPerKm", "1 km Run Pace — Minutes", true), num("runPaceSecPerKm", "1 km Run Pace — Seconds"), num("averageStationMinutes", "Average Station Time (Min)"), num("totalRunMinutes", "Total Running (Min)"), num("totalStationMinutes", "Total Stations (Min)")],
    instructions: "Enter your target finish time, the Roxzone time you expect and how your time splits between running and stations (about 50% for most athletes; stronger runners run a bigger share).",
    examples: "Example: for a 1:20 finish with 7 minutes of Roxzone and a 50/50 split, you need to run each kilometre in 4:34 and average 4.56 minutes per station.",
    assumptions: "Running and station time are split evenly across the 8 runs and 8 stations; real station times vary a lot (sled pull and wall balls usually take longest). Pair with the Hyrox Time Calculator to test a station-by-station plan. " + DISCLAIMER,
    faq: [
      { question: "How fast should I run in Hyrox?", answer: "Most athletes run 30–60 seconds per km slower than their fresh 10K pace, because of the stations in between." },
      { question: "Where do people lose the most time?", answer: "Usually the sled pull, burpee broad jumps and wall balls — and in slowing runs late in the race." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
