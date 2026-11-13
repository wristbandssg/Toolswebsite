// One-time (but safe to re-run) batch setup script: creates the 21 diet tools from the fitness
// keyword check (13 Nov 2026 — Claude outputs/Fitness_Build_Plan.json): 20 in Food & Drink >
// Diet, Macro & Meal Planning and the Bibibop meal counter in Food & Drink > Restaurant > Mexican,
// Bowl & Salad. Formulas live in src/lib/calc-engine-fit-diet.ts; examples are computed from the
// engine. All tools are Published.
//
// HOW TO RUN
//   npx tsx prisma/create-fit-diet-calculators.ts        (FIT_DRY=1 → check only, no database)
// or
//   npm run db:create-fit-diet-calculators

import * as E from "../src/lib/calc-engine-fit-diet";
import { mk, num, dd, tx, date, T, upsertTools, type ToolDef } from "./trv-tool-kit";
import { nfmt } from "../src/lib/trv-core";

const C = E.fitDietCustomCalculators;
const n = (x: unknown, dp = 0) => nfmt(Number(x), dp);
const MED = "These are estimates for healthy adults, not medical advice. If you are pregnant, breastfeeding, under 18, have a medical condition or take medication that affects appetite or weight, check your plan with a doctor or registered dietitian.";
const EX = { sex: 0, units: 0, age: 35, weight: 180, height: 70, activity: 1 };
const bodyIn = (wDef = 180) => [dd("sex", "Sex", ["Male", "Female"], 0), dd("units", "Units", ["US (lb, inches)", "Metric (kg, cm)"], 0), num("age", "Age", 35, 13, 100, 1), num("weight", "Weight (lb or kg)", wDef, 25, 800, 0.1), num("height", "Height (inches or cm)", 70, 48, 230, 0.1)];
const act = (def = 1) => dd("activity", "Activity Level", E.ACT_LABELS, def);

const DIET: ToolDef[] = [
  mk({
    slug: "calorie-calculator", title: "Calorie Calculator",
    meta: "Calorie Calculator — How Many Calories Should I Eat a Day?",
    desc: "Find how many calories you need a day to maintain, lose or gain weight — from your age, sex, height, weight and activity, using the Mifflin-St Jeor equation.",
    inputs: [...bodyIn(), act(), dd("goal", "Goal", E.GOALS.map(([l]) => l), 2)],
    results: [["calories", "Daily Calories for Your Goal", "n", 0], ["maintenance", "Maintenance Calories (TDEE)", "n", 0], ["bmr", "BMR (Calories at Rest)", "n", 0], ["change", "Expected Weekly Change (lb or kg)", "n", 2], ["note", "Note", "t"], ["lose", "To Lose ~1 lb (0.5 kg) a Week", "n", 0], ["gain", "To Gain ~1 lb (0.5 kg) a Week", "n", 0]],
    fn: C["calorie-calculator"], ex: { ...EX, goal: 2 },
    exText: (o) => `Example: a 35-year-old man, 5'10" and 180 lb, lightly active, maintains on about ${n(o.maintenance)} kcal a day; to lose 1 lb a week he eats about ${n(o.calories)} kcal.`,
    how: "The calculator first estimates your basal metabolic rate (BMR) — the calories your body burns at rest — with the Mifflin-St Jeor equation, then multiplies it by an activity factor to get your maintenance calories (TDEE). Your goal adds or subtracts calories from that: about 500 kcal a day for each pound per week.\n\nUse the number as a starting point. Weigh yourself a few times a week for 2–3 weeks; if the average isn't moving the way you want, adjust by 100–200 kcal.",
    assume: `Mifflin-St Jeor: 10 × kg + 6.25 × cm − 5 × age + 5 (men) or − 161 (women). Activity factors 1.2–1.9. 3,500 kcal ≈ 1 lb of body weight (7,700 kcal ≈ 1 kg). Weight-loss targets are never set below 1,500 kcal (men) or 1,200 kcal (women). ${MED}`,
    faq: [["How many calories should I eat a day?", "Most women need about 1,600–2,400 and most men 2,000–3,000 kcal to maintain weight, depending on size and activity — enter your details for your own number."], ["How many calories should I eat to lose weight?", "About 500 kcal below your maintenance calories to lose roughly 1 lb (0.5 kg) a week."], ["Is the Mifflin-St Jeor equation accurate?", "It is the most accurate of the common equations for most adults, usually within about 10% of measured BMR."]],
  }),
  mk({
    slug: "tdee-calculator", title: "TDEE Calculator",
    meta: "TDEE Calculator — Total Daily Energy Expenditure & Maintenance Calories",
    desc: "Calculate your TDEE (total daily energy expenditure) — your maintenance calories — with Mifflin-St Jeor, or Katch-McArdle if you know your body fat, at every activity level.",
    inputs: [...bodyIn(), act(), num("bodyFat", "Body Fat % (Optional, 0 = Unknown)", 0, 0, 69, 0.1)],
    results: [["tdee", "Your TDEE (Maintenance Calories)", "n", 0], ["bmr", "BMR", "n", 0], ["formula", "Formula Used", "t"], ["sedentary", "TDEE if Sedentary", "n", 0], ["light", "TDEE if Lightly Active", "n", 0], ["moderate", "TDEE if Moderately Active", "n", 0], ["very", "TDEE if Very Active", "n", 0], ["extra", "TDEE if Extra Active", "n", 0], ["cut", "Calories to Lose Weight (−500)", "n", 0], ["bulk", "Calories for a Lean Bulk (+300)", "n", 0]],
    fn: C["tdee-calculator"], ex: { ...EX, bodyFat: 0 },
    exText: (o) => `Example: 35 years old, 5'10", 180 lb and lightly active → BMR ${n(o.bmr)} kcal and a TDEE of about ${n(o.tdee)} kcal a day.`,
    how: "TDEE is everything you burn in a day: your BMR plus daily movement, exercise and digestion. Eating at your TDEE keeps your weight stable; eating below it makes you lose weight.\n\nIf you know your body fat percentage (from calipers, a DEXA scan or a smart scale), enter it — the Katch-McArdle formula uses your lean mass and is more accurate for very muscular or very lean people.",
    assume: `Mifflin-St Jeor (default) or Katch-McArdle (370 + 21.6 × lean mass in kg). Activity multipliers: 1.2 sedentary, 1.375 light, 1.55 moderate, 1.725 very active, 1.9 extra active. If you train for many hours a week, the TDEE for Athletes Calculator (training hours based) may fit better. ${MED}`,
    faq: [["What does TDEE stand for?", "Total daily energy expenditure — the total calories you burn in a day."], ["Is TDEE the same as maintenance calories?", "Yes. Eating your TDEE keeps your weight roughly the same."], ["How do I use TDEE to lose weight?", "Eat 300–500 kcal below it; 500 kcal a day is about 1 lb (0.45 kg) a week."]],
  }),
  mk({
    slug: "calorie-deficit-calculator", title: "Calorie Deficit Calculator",
    meta: "Calorie Deficit Calculator — Daily Calories & Time to Goal Weight",
    desc: "Plan a calorie deficit: see your daily calorie target, how fast you'll lose weight and how many weeks to reach your goal — with your TDEE re-calculated as you lose.",
    inputs: [...bodyIn(), act(), num("goal", "Goal Weight (lb or kg)", 165, 25, 800, 0.1), num("deficit", "Daily Calorie Deficit (kcal)", 500, 50, 2000, 25)],
    results: [["intake", "Daily Calorie Target", "n", 0], ["tdee", "Your TDEE Now", "n", 0], ["weekly", "Weekly Loss (lb or kg)", "n", 2], ["weeks", "Weeks to Goal (TDEE Adjusts as You Lose)", "n", 1], ["linear", "Weeks to Goal (Simple 3,500-kcal Rule)", "n", 1], ["pct", "Deficit as % of TDEE", "n", 1], ["status", "Is It Safe?", "t"], ["plateau", "What to Expect", "t"]],
    fn: C["calorie-deficit-calculator"], ex: { ...EX, goal: 165, deficit: 500 },
    exText: (o) => `Example: 180 lb, lightly active, with a 500 kcal daily deficit → eat about ${n(o.intake)} kcal, lose about ${o.weekly} lb a week and reach 165 lb in roughly ${o.weeks} weeks.`,
    how: "A calorie deficit means eating fewer calories than you burn. Choose how big a deficit you want — 300–500 kcal a day is easy to sustain, 750–1,000 kcal is fast and harder.\n\nAs you lose weight your body burns a little less, so the calculator re-checks your TDEE every week. That's why the 'adjusted' time to goal is longer than the simple 3,500-calorie-per-pound estimate.",
    assume: `TDEE from Mifflin-St Jeor × activity, recalculated weekly at your new weight; 7,700 kcal ≈ 1 kg (3,500 kcal ≈ 1 lb). Targets below 1,500 kcal (men) / 1,200 kcal (women), or losses above 1% of body weight a week, are flagged. ${MED}`,
    faq: [["What is a good calorie deficit?", "About 500 kcal a day (≈1 lb a week) for most people; 20–25% below TDEE at most."], ["How long will it take to lose 20 pounds in a 500 calorie deficit?", "About 20 weeks by the simple rule, a little longer once your falling TDEE is counted."], ["Why did my weight loss slow down?", "Your TDEE drops as you get lighter, and water weight hides fat loss from week to week — recalculate every 10 lb or so."]],
  }),
  mk({
    slug: "weight-loss-calculator", title: "Weight Loss Calculator (By Date)",
    meta: "Weight Loss Calculator by Date — Calories to Reach Your Goal",
    desc: "Enter your goal weight and goal date to see the daily calories and calorie deficit you need, how much you'd lose each week and whether the pace is realistic.",
    inputs: [...bodyIn(), act(), num("goal", "Goal Weight (lb or kg)", 165, 25, 800, 0.1), date("start", "Start Date", "today"), date("end", "Goal Date", "today+120")],
    results: [["intake", "Daily Calories to Hit Your Goal Date", "n", 0], ["deficit", "Daily Calorie Deficit Needed", "n", 0], ["weekly", "Weight Lost per Week (lb or kg)", "n", 2], ["total", "Total to Lose (lb or kg)", "n", 1], ["days", "Days to Goal", "n", 0], ["status", "Is the Pace Realistic?", "t"], ["safeDate", "Comfortable Goal Date (~0.75% a Week)", "t"], ["tdee", "Your TDEE Now", "n", 0]],
    fn: C["weight-loss-calculator"], ex: { ...EX, goal: 165, start: 20500, end: 20620 },
    exText: (o) => `Example: losing from 180 to 165 lb in 120 days needs a deficit of about ${n(o.deficit)} kcal a day — eating around ${n(o.intake)} kcal — or ${o.weekly} lb a week.`,
    how: "Pick your goal weight and the date you want to reach it. The calculator works out the total energy you need to lose (about 3,500 kcal per lb), spreads it over the days you have and subtracts it from your average TDEE over the plan.\n\nIf the pace is faster than about 1% of your body weight a week, it suggests a more comfortable date instead.",
    assume: `TDEE from Mifflin-St Jeor × activity at your average weight over the plan; 7,700 kcal per kg of loss. Real weight loss is not linear — water and glycogen make the first week faster and later weeks slower. ${MED}`,
    faq: [["How much weight can I lose in 3 months?", "About 6–13 kg (12–26 lb) at a sustainable 0.5–1 kg a week."], ["When will I reach my goal weight?", "Enter your goal and try dates until the pace is around 0.5–1% of your body weight a week."], ["Is losing 2 lb a week safe?", "For people with a lot to lose, often yes; for lighter people it can mean too large a deficit."]],
  }),
  mk({
    slug: "weight-loss-percentage-calculator", title: "Weight Loss Percentage Calculator",
    desc: "Calculate the percentage of body weight you've lost (or gained) from your starting and current weight — plus how far you are to your goal and your 5% and 10% milestones.",
    inputs: [num("start", "Starting Weight", 200, 1, 1000, 0.1), num("current", "Current Weight", 185, 1, 1000, 0.1), num("goal", "Goal Weight (Optional, 0 = None)", 170, 0, 1000, 0.1)],
    results: [["pct", "Weight Lost (%)", "n", 2], ["lost", "Weight Lost (same unit)", "n", 2], ["status", "Milestone", "t"], ["toGoal", "Left to Goal", "n", 2], ["ofGoal", "Progress to Goal (%)", "n", 1], ["bmi5", "Weight at 5% Lost", "n", 1], ["bmi10", "Weight at 10% Lost", "n", 1]],
    fn: C["weight-loss-percentage-calculator"], ex: { start: 200, current: 185, goal: 170 },
    exText: (o) => `Example: from 200 to 185 lb is ${o.pct}% of your starting weight — ${o.ofGoal}% of the way to a 170 lb goal.`,
    how: "Weight loss percentage = (starting weight − current weight) ÷ starting weight × 100. Use any unit (lb, kg or stone converted to lb) as long as all weights use the same one.\n\nDoctors often use percentages: losing 5% of your weight improves blood pressure and blood sugar, and 10% gives bigger benefits.",
    assume: "A negative result means weight gained. The 5% and 10% milestones are measured from your starting weight.",
    faq: [["How do I calculate my weight loss percentage?", "Subtract your current weight from your starting weight, divide by your starting weight and multiply by 100."], ["What percentage of weight loss is significant?", "5% is the usual clinical milestone; 10% or more brings larger health benefits."]],
  }),
  mk({
    slug: "protein-intake-calculator", title: "Protein Intake Calculator",
    meta: "Protein Calculator — How Much Protein Do I Need a Day?",
    desc: "Find how much protein you need a day for your goal — maintenance, weight loss, age 50+ or GLP-1 medication — in grams per day and per meal.",
    inputs: [dd("units", "Units", ["US (lb)", "Metric (kg)"], 0), num("weight", "Current Weight (lb or kg)", 180, 25, 800, 0.1), num("goalWeight", "Goal Weight (Optional, 0 = Use Current)", 0, 0, 800, 0.1), dd("goal", "Goal", E.PROTEIN_GOALS.map(([l]) => l), 2), num("meals", "Meals per Day", 3, 1, 8, 1)],
    results: [["mid", "Daily Protein Target (g)", "n", 0], ["low", "Low End of Range (g)", "n", 0], ["high", "High End of Range (g)", "n", 0], ["perMeal", "Per Meal (g)", "n", 0], ["kcal", "Calories From Protein", "n", 0], ["perLb", "Grams per lb of Body Weight", "n", 2], ["basis", "Weight Used", "t"]],
    fn: C["protein-intake-calculator"], ex: { units: 0, weight: 180, goalWeight: 0, goal: 2, meals: 3 },
    exText: (o) => `Example: a 180 lb adult trying to lose weight → about ${o.mid} g of protein a day (${o.low}–${o.high} g), or ${o.perMeal} g per meal.`,
    how: "Choose your goal; the calculator multiplies your weight in kg by the protein range that research supports for it. If you have a lot of weight to lose, enter your goal weight — protein needs follow lean mass, not fat.\n\nFor building muscle, use the Protein for Muscle Gain Calculator, which uses the higher 1.6–2.2 g/kg strength-training range with lean-mass adjustments.",
    assume: `Ranges (g per kg): RDA 0.8; active adults 1.1–1.4; weight loss 1.2–1.6; weight loss with lifting 1.6–2.2; age 50+ 1.0–1.2 (PROT-AGE); GLP-1 users 1.2–1.5 (common clinical guidance to protect muscle). 4 kcal per gram. People with kidney disease should follow their doctor's protein limit. ${MED}`,
    faq: [["How much protein do I need a day?", "At least 0.8 g per kg (0.36 g per lb); 1.2–1.6 g/kg when losing weight."], ["How much protein should I eat to lose weight?", "About 1.2–1.6 g per kg of body weight (or goal weight), and up to 2.2 g/kg if you lift weights."], ["How much protein per meal?", "Around 25–40 g spread over 3–4 meals works well for most people."]],
  }),
  mk({
    slug: "keto-calculator", title: "Keto Calculator",
    meta: "Keto Macro Calculator — Fat, Protein & Net Carbs for Keto",
    desc: "Calculate your keto macros — daily calories, fat, protein and net carbs — from your body, activity and goal, with protein set by lean mass.",
    inputs: [...bodyIn(), act(0), num("bodyFat", "Body Fat % (Optional, 0 = Estimate)", 0, 0, 69, 0.1), dd("goal", "Goal", ["Maintain", "Lose slowly (−10%)", "Lose weight (−20%)", "Lose fast (−25%)", "Gain (+10%)"], 2), num("carbs", "Net Carbs per Day (g)", 25, 5, 100, 1), num("proteinPerLean", "Protein per kg of Lean Mass (g)", 1.6, 0.8, 2.5, 0.1)],
    results: [["calories", "Daily Calories", "n", 0], ["fat", "Fat (g)", "n", 0], ["protein", "Protein (g)", "n", 0], ["carbs", "Net Carbs (g)", "n", 0], ["fatPct", "Fat (% of Calories)", "n", 0], ["proteinPct", "Protein (%)", "n", 0], ["carbPct", "Carbs (%)", "n", 0], ["tdee", "Maintenance Calories", "n", 0], ["bf", "Body Fat Used (%)", "n", 1], ["lean", "Lean Mass (lb or kg)", "n", 1]],
    fn: C["keto-calculator"], ex: { ...EX, activity: 0, bodyFat: 0, goal: 2, carbs: 25, proteinPerLean: 1.6 },
    exText: (o) => `Example: 180 lb, 5'10", sedentary, losing weight on keto → about ${n(o.calories)} kcal: ${o.fat} g fat, ${o.protein} g protein and ${o.carbs} g net carbs (${o.fatPct}% fat).`,
    how: "Keto keeps net carbs (total carbs minus fiber) at about 20–50 g a day so your body switches to burning fat and ketones. Protein is set from your lean mass so you keep muscle, and fat fills the rest of your calories.\n\nOn keto, fat is a lever: if you're losing weight, you don't need to hit the fat number exactly — protein and carbs are the targets.",
    assume: `BMR from Katch-McArdle when body fat is entered, otherwise Mifflin-St Jeor with body fat estimated by the Deurenberg formula. 4 kcal per g of protein and carbs, 9 per g of fat. Calories never go below 1,500 (men) / 1,200 (women). ${MED}`,
    faq: [["How many carbs can I eat on keto?", "Usually 20–50 g of net carbs a day; 20–25 g is the classic starting point."], ["How much protein on keto?", "About 1.2–2.0 g per kg of lean mass — enough to keep muscle without blocking ketosis."], ["How much weight will I lose on keto?", "Often 2–5 lb of water in the first week, then the same as any diet with the same calorie deficit."]],
  }),
  mk({
    slug: "intermittent-fasting-calculator", title: "Intermittent Fasting Calculator",
    meta: "Intermittent Fasting Calculator — 16:8, 18:6, OMAD Eating Window",
    desc: "Work out your intermittent fasting schedule — when your fast ends and your eating window opens and closes for 16:8, 18:6, 20:4, OMAD or a 36-hour fast.",
    inputs: [dd("protocol", "Fasting Schedule", E.IF_PROTOCOLS.map(([l]) => l), 0), num("customHours", "Custom Fasting Hours (Custom Only)", 16, 1, 120, 0.5), tx("lastMeal", "Last Meal Finished At (HH:MM)", "20:00")],
    results: [["opens", "Eating Window Opens (Fast Ends)", "t"], ["closes", "Eating Window Closes", "t"], ["fast", "Fasting Hours", "n", 1], ["eat", "Eating Hours per Day", "n", 1], ["ketosis", "Fat-Burning Point", "t"], ["weekly", "Hours Fasted per Week (Daily Plans)", "n", 1]],
    fn: C["intermittent-fasting-calculator"], ex: { protocol: 0, customHours: 16, ...T("lastMeal", "20:00") },
    exText: (o) => `Example: on 16:8 with your last meal at 8 pm, your fast ends at ${o.opens} and your eating window closes at ${o.closes}.`,
    how: "Enter the time you finish your last meal and pick a schedule. The fast ends that many hours later and your eating window runs for the rest of the 24 hours.\n\nIntermittent fasting works mainly by making it easier to eat less. Calories and protein still matter inside the eating window.",
    assume: `Times are in 24-hour format; "+1 day" means the next day. Fasting is not suitable for people with diabetes on insulin, a history of eating disorders, or during pregnancy. ${MED}`,
    faq: [["What is the 16:8 fasting window?", "Fast for 16 hours (including sleep) and eat within 8 hours — for example 12 pm to 8 pm."], ["Can I drink coffee while fasting?", "Black coffee, tea and water don't break a fast for most purposes."], ["When does fat burning start when fasting?", "Mild ketosis usually begins after about 12–16 hours without food."]],
  }),
  mk({
    slug: "fasting-weight-loss-calculator", title: "Fasting Weight Loss Calculator",
    meta: "Water Fasting Weight Loss Calculator — Fat vs Water Weight",
    desc: "Estimate how much weight you'd lose on a water fast, extended fast or OMAD — split into fat loss and water/glycogen weight that comes back after eating.",
    inputs: [...bodyIn(200), num("days", "Number of Fasting Days", 3, 1, 60, 1), num("eaten", "Calories Eaten per Day (0 = Water Fast)", 0, 0, 3000, 25), dd("activity", "Activity While Fasting", ["Resting / light", "Normal daily activity"], 1)],
    results: [["total", "Expected Scale Weight Loss (lb or kg)", "n", 1], ["fat", "Of Which Fat / Tissue", "n", 1], ["water", "Of Which Water & Glycogen", "n", 1], ["perDay", "Average Loss per Day", "n", 2], ["deficit", "Daily Calorie Deficit", "n", 0], ["end", "Expected Weight After", "n", 1], ["warning", "Safety", "t"]],
    fn: C["fasting-weight-loss-calculator"], ex: { ...EX, weight: 200, days: 3, eaten: 0, activity: 1 },
    exText: (o) => `Example: a 200 lb man water-fasting for 3 days could see about ${o.total} lb less on the scale — about ${o.fat} lb of fat/tissue and ${o.water} lb of water and glycogen.`,
    how: "Fasting burns your normal daily calories with little or nothing coming in. That deficit divided by about 3,500 kcal per lb is real tissue loss. On top of that, the first 2–3 days empty your glycogen stores, which hold water — that part returns when you eat carbs again.\n\nFor OMAD or a fasting-mimicking diet, enter the calories you eat in your meal.",
    assume: `Daily burn = Mifflin-St Jeor BMR × activity, reduced 5% for the metabolic slowdown of fasting. Water/glycogen loss ≈ 2% of body weight over the first 3 days of a fast under 800 kcal (1% with more food). ${MED}`,
    faq: [["How much weight do you lose on a 3-day water fast?", "Often 2–4% of body weight on the scale, but most of it is water; real fat loss is about 1–2 lb."], ["Is water fast weight loss permanent?", "The fat loss is; the water and glycogen weight returns within a few days of eating normally."]],
  }),
  mk({
    slug: "weight-watchers-points-calculator", title: "Weight Watchers Points Calculator",
    meta: "WW Points Calculator — SmartPoints, PointsPlus & Classic Points",
    desc: "Calculate a food's Weight Watchers points from its nutrition label — SmartPoints, PointsPlus and original Points — using the published formulas.",
    inputs: [num("calories", "Calories", 250, 0, 5000, 1), num("fat", "Total Fat (g)", 10, 0, 500, 0.1), num("satFat", "Saturated Fat (g)", 3, 0, 300, 0.1), num("sugar", "Sugar (g)", 5, 0, 500, 0.1), num("protein", "Protein (g)", 12, 0, 500, 0.1), num("carbs", "Carbohydrates (g)", 25, 0, 1000, 0.1), num("fiber", "Fiber (g)", 3, 0, 200, 0.1), num("servings", "Servings", 1, 0.25, 50, 0.25)],
    results: [["smart", "SmartPoints", "n", 0], ["plus", "PointsPlus", "n", 0], ["classic", "Original Points (1997)", "n", 0], ["smartExact", "SmartPoints (unrounded)", "n", 1], ["plusExact", "PointsPlus (unrounded)", "n", 1], ["classicExact", "Original Points (unrounded)", "n", 1]],
    fn: C["weight-watchers-points-calculator"], ex: { calories: 250, fat: 10, satFat: 3, sugar: 5, protein: 12, carbs: 25, fiber: 3, servings: 1 },
    exText: (o) => `Example: a food with 250 kcal, 10 g fat (3 g saturated), 5 g sugar, 12 g protein, 25 g carbs and 3 g fiber is ${o.smart} SmartPoints, ${o.plus} PointsPlus or ${o.classic} original Points.`,
    how: "Copy the numbers from the nutrition label for one serving, then set how many servings you ate. Each WW system weights the nutrients differently: SmartPoints penalizes saturated fat and sugar and rewards protein; PointsPlus uses protein, carbs, fat and fiber; the original Points used calories, fat and fiber.\n\nWW's current app formula (2025 Points) isn't published, so its numbers can differ from these.",
    assume: "Classic: cal/50 + fat/12 − min(fiber, 4)/5. PointsPlus: protein/10.9375 + carbs/9.2105 + fat/3.8889 − fiber/12.5. SmartPoints: 0.0305 × cal + 0.275 × sat fat + 0.12 × sugar − 0.098 × protein. Rounded to the nearest whole point, never below 0. Independent calculator — not affiliated with or endorsed by WW International.",
    faq: [["How are Weight Watchers points calculated?", "From the nutrition label — calories, saturated fat, sugar and protein for SmartPoints; protein, carbs, fat and fiber for PointsPlus."], ["Why does the WW app show a different number?", "WW's newest program uses an updated, unpublished formula and zero-point foods."]],
  }),
  mk({
    slug: "carb-cycling-calculator", title: "Carb Cycling Calculator",
    desc: "Plan carb cycling: calories, carbs, protein and fat for your high-carb (training) days and low-carb (rest) days, keeping your weekly calories on target.",
    inputs: [...bodyIn(), act(2), dd("goal", "Goal", ["Fat loss (−20%)", "Slow fat loss (−10%)", "Maintain", "Lean gain (+10%)"], 0), num("highDays", "High-Carb Days per Week", 3, 1, 6, 1), num("proteinPerKg", "Protein (g per kg of body weight)", 2, 1.2, 3, 0.1)],
    results: [["hiCal", "High-Day Calories", "n", 0], ["loCal", "Low-Day Calories", "n", 0], ["protein", "Protein Every Day (g)", "n", 0], ["hiCarb", "High-Day Carbs (g)", "n", 0], ["hiFat", "High-Day Fat (g)", "n", 0], ["loCarb", "Low-Day Carbs (g)", "n", 0], ["loFat", "Low-Day Fat (g)", "n", 0], ["weekly", "Weekly Calories", "n", 0], ["tdee", "Maintenance (TDEE)", "n", 0]],
    fn: C["carb-cycling-calculator"], ex: { ...EX, activity: 2, goal: 0, highDays: 3, proteinPerKg: 2 },
    exText: (o) => `Example: 180 lb, moderately active, cutting with 3 high days → high days ${n(o.hiCal)} kcal (${o.hiCarb} g carbs), low days ${n(o.loCal)} kcal (${o.loCarb} g carbs), ${o.protein} g protein daily.`,
    how: "Put your high-carb days on your hardest training days (legs, long sessions) and low-carb days on rest days. High days run 15% above your daily target, mostly from carbs with fat kept low; low days drop carbs to about 1 g per kg and use a bit more fat, so the week still averages out.\n\nThe 'Leangains' style (training days high carb, rest days high fat) is the same idea.",
    assume: `Target = TDEE (Mifflin-St Jeor × activity) × goal factor. High day = 1.15 × target, 20% of calories from fat. Low day carbs = 1 g/kg. ${MED}`,
    faq: [["How many high carb days should I have?", "Usually the same as your hard training days — 2–4 a week."], ["Does carb cycling burn more fat?", "Fat loss still depends on your weekly calories; carb cycling mainly puts carbs where they help training."]],
  }),
  mk({
    slug: "carb-intake-calculator", title: "Carb Intake Calculator",
    meta: "Carb Calculator — How Many Carbs Should I Eat a Day?",
    desc: "Find how many carbs you should eat a day to lose weight, eat for general health, build muscle or fuel endurance training — in grams per day and per meal.",
    inputs: [...bodyIn(), act(), dd("goal", "Goal", E.CARB_GOALS.map(([l]) => l), 0), num("meals", "Meals per Day", 3, 1, 8, 1)],
    results: [["carbs", "Daily Carbs (g)", "n", 0], ["low", "Range — Low (g)", "n", 0], ["high", "Range — High (g)", "n", 0], ["perMeal", "Per Meal (g)", "n", 0], ["calories", "Daily Calories Used", "n", 0], ["pct", "Carbs (% of Calories)", "n", 0]],
    fn: C["carb-intake-calculator"], ex: { ...EX, goal: 0, meals: 3 },
    exText: (o) => `Example: 180 lb, lightly active, losing weight on a moderate-carb plan → about ${o.carbs} g of carbs a day (${o.low}–${o.high} g), ${o.perMeal} g per meal, on ${n(o.calories)} kcal.`,
    how: "Your carb target depends on your goal. For weight loss the calculator takes 500 kcal off your TDEE and puts 35–45% of it into carbs (or under 130 g for low-carb). General health uses the 45–65% range in the Dietary Guidelines. Muscle gain and endurance targets scale with body weight (grams per kg), as sports nutrition guidelines do.",
    assume: `TDEE from Mifflin-St Jeor × activity; 4 kcal per g of carbs. Low-carb = 50–130 g a day (below 50 g is ketogenic — use the Keto Calculator). Endurance 6–10 g/kg and muscle gain 4–7 g/kg follow ISSN/ACSM sports-nutrition ranges. ${MED}`,
    faq: [["How many carbs should I eat to lose weight?", "Many people do well on 100–150 g a day; low-carb plans use 50–130 g."], ["How many carbs do I need to build muscle?", "About 4–7 g per kg of body weight a day when training hard."]],
  }),
  mk({
    slug: "fiber-intake-calculator", title: "Fiber Intake Calculator",
    meta: "Fiber Calculator — How Much Fiber per Day (Also for Weight Loss)",
    desc: "Find how much fiber you should eat a day — by calories (14 g per 1,000 kcal) and by age and sex — with a per-meal target and food equivalents.",
    inputs: [dd("sex", "Sex", ["Male", "Female"], 1), num("age", "Age", 35, 1, 100, 1), num("calories", "Daily Calories", 1800, 800, 6000, 50), num("meals", "Meals per Day", 3, 1, 8, 1)],
    results: [["target", "Daily Fiber Target (g)", "n", 0], ["byCal", "By Calories (14 g per 1,000 kcal)", "n", 0], ["ai", "IOM Adequate Intake for Age & Sex (g)", "n", 0], ["perMeal", "Per Meal (g)", "n", 1], ["lentils", "Same as Cups of Cooked Lentils", "n", 1], ["oats", "Same as Cups of Cooked Oatmeal", "n", 1]],
    fn: C["fiber-intake-calculator"], ex: { sex: 1, age: 35, calories: 1800, meals: 3 },
    exText: (o) => `Example: a 35-year-old woman eating 1,800 kcal should aim for about ${o.target} g of fiber a day — ${o.perMeal} g per meal.`,
    how: "Fiber keeps you full, steadies blood sugar and supports gut health — which is why it helps with weight loss. The Dietary Guidelines recommend 14 g per 1,000 kcal; the Institute of Medicine sets adequate intakes of 25 g (women) and 38 g (men) under 50. The calculator uses whichever is higher.\n\nIncrease fiber gradually over a couple of weeks and drink more water to avoid bloating.",
    assume: "IOM adequate intakes: men 38 g (≤50) / 30 g (51+), women 25 g / 21 g. Cooked lentils ≈ 15.6 g fiber per cup; cooked oatmeal ≈ 4 g per cup. Children's needs are lower than these adult values.",
    faq: [["How much fiber should I eat a day to lose weight?", "At least 25–30 g; studies link each extra 10 g a day with less belly fat gain."], ["Can you eat too much fiber?", "Above about 70 g a day, or a sudden big increase, can cause bloating and discomfort."]],
  }),
  mk({
    slug: "body-recomposition-calculator", title: "Body Recomposition Calculator",
    meta: "Body Recomp Calculator — Calories & Macros to Lose Fat and Build Muscle",
    desc: "Plan a body recomposition: training-day and rest-day calories and macros to lose fat and build muscle at the same time, from your lean mass and training days.",
    inputs: [...bodyIn(), num("bodyFat", "Body Fat %", 25, 3, 69, 0.1), num("trainingDays", "Strength Training Days per Week", 4, 2, 7, 1), act(1)],
    results: [["train", "Training-Day Calories", "n", 0], ["rest", "Rest-Day Calories", "n", 0], ["avg", "Average Daily Calories", "n", 0], ["weekly", "Weekly Balance vs Maintenance (kcal)", "n", 0], ["protein", "Protein (g, every day)", "n", 0], ["fat", "Fat (g, every day)", "n", 0], ["trainCarbs", "Training-Day Carbs (g)", "n", 0], ["restCarbs", "Rest-Day Carbs (g)", "n", 0], ["tdee", "Maintenance (TDEE)", "n", 0], ["lean", "Lean Mass (lb or kg)", "n", 1], ["fit", "Is Recomp Right for You?", "t"]],
    fn: C["body-recomposition-calculator"], ex: { ...EX, bodyFat: 25, trainingDays: 4 },
    exText: (o) => `Example: 180 lb at 25% body fat, lifting 4 days a week → ${n(o.train)} kcal on training days and ${n(o.rest)} on rest days, with ${o.protein} g protein daily.`,
    how: "Recomposition means losing fat and gaining muscle at once. It works best for beginners, people returning to training and those with more body fat. You eat a little above maintenance on lifting days to fuel muscle growth and below it on rest days, so the week ends in a small deficit.\n\nKeep protein high every day, lift with progressive overload and track waist size and strength, not just the scale.",
    assume: `TDEE = Katch-McArdle (from your lean mass) × activity. Training days +10%, rest days −20%. Protein 2.6 g per kg of lean mass (≈1 g per lb of body weight for most), fat 0.8 g per kg, carbs fill the rest. ${MED}`,
    faq: [["Can you lose fat and gain muscle at the same time?", "Yes — especially beginners, returning lifters and people with higher body fat."], ["How long does body recomposition take?", "Visible changes usually take 8–12 weeks of consistent training and protein."]],
  }),
  mk({
    slug: "reverse-diet-calculator", title: "Reverse Diet Calculator",
    desc: "Plan a reverse diet after a cut: how many weeks it takes to raise your calories back to maintenance with weekly increases, and the week-by-week calorie schedule.",
    inputs: [num("current", "Calories You Eat Now", 1500, 800, 5000, 10), num("target", "Target / Maintenance Calories", 2200, 1000, 6000, 10), num("step", "Increase per Week (kcal)", 100, 25, 300, 5)],
    results: [["weeks", "Weeks to Reach Maintenance", "n", 0], ["plan", "Weekly Schedule", "t"], ["carbsPerWeek", "Add Carbs per Week (g, ~75%)", "n", 0], ["fatPerWeek", "Add Fat per Week (g, ~25%)", "n", 0], ["total", "Total Increase (kcal)", "n", 0]],
    fn: C["reverse-diet-calculator"], ex: { current: 1500, target: 2200, step: 100 },
    exText: (o) => `Example: going from 1,500 to 2,200 kcal at +100 kcal a week takes ${o.weeks} weeks — add about ${o.carbsPerWeek} g of carbs and ${o.fatPerWeek} g of fat each week.`,
    how: "After a long diet, a reverse diet raises calories slowly so you can return to maintenance with minimal fat regain and keep an eye on the scale. Most people add 50–150 kcal a week, mostly as carbs and a little fat, while keeping protein the same.\n\nIf your weekly average weight climbs more than about 0.5% in a week, hold that calorie level for an extra week before increasing again.",
    assume: "Find your target with the TDEE Calculator. A small scale increase in the first week (water and glycogen) is normal and not fat gain.",
    faq: [["How much should I increase calories when reverse dieting?", "About 50–150 kcal a week, or 5% of your intake."], ["Do you gain weight when reverse dieting?", "Usually 1–3 lb of water and glycogen at first; fat gain is small if you increase slowly."]],
  }),
  mk({
    slug: "psmf-calculator", title: "PSMF Calculator",
    meta: "PSMF Calculator — Protein-Sparing Modified Fast Macros",
    desc: "Calculate a protein-sparing modified fast (PSMF): daily protein from your lean mass and body-fat category, the very low calories that follow, and how long to stay on it.",
    inputs: [dd("sex", "Sex", ["Male", "Female"], 0), dd("units", "Units", ["US (lb)", "Metric (kg)"], 0), num("weight", "Weight (lb or kg)", 200, 25, 800, 0.1), num("bodyFat", "Body Fat %", 25, 4, 69, 0.1), dd("activity", "Exercise", E.PSMF_ACT, 2)],
    results: [["protein", "Daily Protein (g)", "n", 0], ["calories", "Daily Calories (approx.)", "n", 0], ["fat", "Fat (g, max)", "n", 0], ["carbs", "Carbs (g, from vegetables)", "n", 0], ["category", "Your PSMF Category", "t"], ["duration", "How Long & Refeeds", "t"], ["weekly", "Expected Weekly Loss (lb or kg)", "n", 2], ["perLb", "Protein per lb of Lean Mass (g)", "n", 2]],
    fn: C["psmf-calculator"], ex: { sex: 0, units: 0, weight: 200, bodyFat: 25, activity: 2 },
    exText: (o) => `Example: a 200 lb man at 25% body fat who lifts → about ${o.protein} g of protein and roughly ${n(o.calories)} kcal a day, ${String(o.duration).split(",")[0]}.`,
    how: "A PSMF is a crash diet made almost entirely of lean protein (chicken breast, white fish, egg whites, fat-free dairy) plus fibrous vegetables. Protein is set high to protect muscle while calories are very low. The leaner you are, the more protein per pound of lean mass you need and the shorter the diet should be.\n\nTake a multivitamin, sodium, potassium, magnesium and fish oil during a PSMF.",
    assume: `Lyle McDonald's categories (men ≤15 / 16–25 / 26%+; women ≤24 / 25–34 / 35%+ body fat). Protein g per lb lean mass: Cat 1 1.25/1.5/2.0, Cat 2 0.9/1.1/1.25, Cat 3 0.8/0.9/1.0 (inactive/aerobic/weights). Fat ≈ 15 g and carbs ≈ 25 g from incidental sources. A PSMF is an aggressive diet — use it only short term and only with medical supervision if you have any health condition. ${MED}`,
    faq: [["What is a PSMF diet?", "A protein-sparing modified fast: very low calories from lean protein and vegetables to lose fat fast while keeping muscle."], ["How long can you do a PSMF?", "From under two weeks for lean people to 6–12 weeks for people with a lot of fat to lose, with refeeds."]],
  }),
  mk({
    slug: "zigzag-diet-calculator", title: "Zigzag Calorie Cycling Calculator",
    meta: "Zigzag Diet Calculator — Calorie Cycling Schedule",
    desc: "Build a zigzag (calorie cycling) diet: high days at maintenance and lower days that keep your weekly deficit — with a Monday–Sunday calorie schedule.",
    inputs: [...bodyIn(), act(), num("deficit", "Average Daily Deficit (kcal)", 500, 100, 1000, 25), dd("pattern", "Pattern", E.ZIG_PATTERNS, 0)],
    results: [["low", "Low-Day Calories", "n", 0], ["high", "High-Day Calories (Maintenance)", "n", 0], ["avg", "Average Daily Calories", "n", 0], ["weekly", "Weekly Calories", "n", 0], ["schedule", "Your Week", "t"], ["lossWeek", "Expected Weekly Loss (lb or kg)", "n", 2]],
    fn: C["zigzag-diet-calculator"], ex: { ...EX, deficit: 500, pattern: 0 },
    exText: (o) => `Example: 180 lb, lightly active, 500 kcal average deficit with weekend high days → ${n(o.low)} kcal Monday–Friday and ${n(o.high)} kcal on Saturday and Sunday.`,
    how: "Calorie cycling (zig-zagging) keeps the same weekly deficit but moves calories around — usually so you can eat more at weekends or on social days. Weight loss is the same as a flat diet with the same weekly total; the benefit is that it's easier to stick to.",
    assume: `High days = your TDEE (Mifflin-St Jeor × activity). Low days take the whole weekly deficit and never drop below 1,500 (men) / 1,200 (women) kcal. ${MED}`,
    faq: [["Does calorie cycling work?", "Yes, as well as a steady deficit with the same weekly calories — and many people find it easier to follow."], ["What is the zig zag diet?", "Alternating higher- and lower-calorie days around the same weekly average."]],
  }),
  mk({
    slug: "net-calorie-calculator", title: "Net Calorie Calculator",
    meta: "Net Calorie Calculator — Calories In Minus Calories Out (CICO)",
    desc: "Calculate your net calories — food eaten minus exercise burned — and whether you're in a deficit or surplus against your daily needs, with the weekly weight effect.",
    inputs: [dd("units", "Weight Unit for Results", ["lb", "kg"], 0), num("eaten", "Calories Eaten Today", 2000, 0, 10000, 10), num("exercise", "Calories Burned Exercising", 400, 0, 5000, 10), num("needs", "Daily Needs Without Exercise (kcal)", 2000, 800, 6000, 10)],
    results: [["net", "Net Calories (Eaten − Exercise)", "n", 0], ["balance", "Balance vs Your Needs (kcal)", "n", 0], ["status", "Result", "t"], ["week", "Weight Change if Every Day Is Like This — per Week", "n", 2], ["month", "— per Month", "n", 2]],
    fn: C["net-calorie-calculator"], ex: { units: 0, eaten: 2000, exercise: 400, needs: 2000 },
    exText: (o) => `Example: eating 2,000 kcal and burning 400 in exercise with needs of 2,000 → ${n(o.net)} net calories, a ${String(o.status).toLowerCase()} — about ${-Number(o.week)} lb a week.`,
    how: "Net calories = calories eaten − calories burned through exercise. Compare that with your needs without exercise (your TDEE at a sedentary or light level — see the TDEE Calculator) to see your calorie balance.\n\nFitness trackers often overestimate exercise calories by 20–40%, so many people eat back only half of them.",
    assume: "3,500 kcal ≈ 1 lb and 7,700 kcal ≈ 1 kg. Don't count exercise in both your needs and your exercise calories.",
    faq: [["What are net calories?", "The calories you eat minus the calories you burn through exercise."], ["Should I eat back exercise calories?", "Eating back about half is a common, safe approach because trackers overestimate."]],
  }),
  mk({
    slug: "thermic-effect-of-food-calculator", title: "Thermic Effect of Food Calculator",
    meta: "Thermic Effect of Food (TEF) Calculator — Calories Burned Digesting",
    desc: "Estimate the thermic effect of food (TEF) — the calories your body burns digesting protein, carbs, fat and alcohol — and your net calories after digestion.",
    inputs: [num("protein", "Protein (g)", 120, 0, 600, 1), num("carbs", "Carbohydrates (g)", 250, 0, 1500, 1), num("fat", "Fat (g)", 70, 0, 500, 1), num("alcohol", "Alcohol (g)", 0, 0, 300, 1)],
    results: [["tef", "Calories Burned Digesting (TEF)", "n", 0], ["low", "Low Estimate", "n", 0], ["high", "High Estimate", "n", 0], ["total", "Calories Eaten", "n", 0], ["pct", "TEF as % of Intake", "n", 1], ["net", "Net Calories After TEF", "n", 0], ["fromProtein", "TEF From Protein Alone", "n", 0]],
    fn: C["thermic-effect-of-food-calculator"], ex: { protein: 120, carbs: 250, fat: 70, alcohol: 0 },
    exText: (o) => `Example: 120 g protein, 250 g carbs and 70 g fat (${n(o.total)} kcal) cost about ${o.tef} kcal to digest — ${o.pct}% of what you ate.`,
    how: "Digesting and processing food uses energy. Protein costs the most (20–30% of its calories), carbs 5–10%, and fat almost nothing (0–3%). That's one reason higher-protein diets help with weight loss.\n\nTEF is usually about 10% of total intake and is already included in TDEE estimates — don't subtract it twice.",
    assume: "Calories: protein and carbs 4 kcal/g, fat 9, alcohol 7. TEF ranges from Westerterp (2004).",
    faq: [["What is the thermic effect of food?", "The extra calories your body burns digesting and absorbing food — about 10% of what you eat."], ["Which food has the highest thermic effect?", "Protein: 20–30% of its calories are used just to process it."]],
  }),
  mk({
    slug: "water-intake-calculator", title: "Water Intake Calculator",
    meta: "Water Intake Calculator — How Much Water Should I Drink a Day?",
    desc: "Find how much water to drink a day from your weight, exercise and climate — with extra for creatine — in liters, ounces, cups and per waking hour.",
    inputs: [dd("sex", "Sex", ["Male", "Female"], 0), dd("units", "Units", ["US (lb)", "Metric (kg)"], 0), num("weight", "Weight (lb or kg)", 180, 25, 800, 0.1), num("exercise", "Exercise Minutes per Day", 30, 0, 600, 5), dd("climate", "Climate", ["Temperate", "Hot or humid"], 0), dd("creatine", "Taking Creatine?", ["No", "Yes"], 0), num("sleep", "Hours of Sleep", 8, 4, 12, 0.5)],
    results: [["liters", "Daily Water (liters)", "n", 2], ["oz", "Daily Water (fl oz)", "n", 0], ["cups", "Cups (8 oz)", "n", 1], ["perHour", "mL per Waking Hour", "n", 0], ["nasem", "National Academies Reference", "t"], ["tip", "Weight-Loss Tip", "t"]],
    fn: C["water-intake-calculator"], ex: { sex: 0, units: 0, weight: 180, exercise: 30, climate: 0, creatine: 0, sleep: 8 },
    exText: (o) => `Example: a 180 lb man exercising 30 minutes a day should drink about ${o.liters} L (${o.oz} oz, ${o.cups} cups) of water.`,
    how: "The base is about 33 mL per kg of body weight (½ oz per lb), plus about 350 mL (12 oz) for every 30 minutes of exercise, 500 mL more in hot weather and 500 mL more if you take creatine, which pulls water into muscle.\n\nPale-yellow urine is the simplest check that you're drinking enough.",
    assume: "Drinks only — food provides about 20% of total water. People with heart or kidney conditions may need to limit fluids; follow your doctor's advice. The creatine allowance is a common practical suggestion rather than an official guideline.",
    faq: [["How much water should I drink a day?", "Roughly half an ounce per pound (33 mL per kg) of body weight, more when you exercise or it's hot."], ["How much water should I drink on creatine?", "About 3–4 liters a day for most adults — roughly 0.5 L more than usual."], ["Does drinking water help weight loss?", "Water before meals can help you eat less, and swapping sugary drinks for water cuts calories."]],
  }),
];

const BOWL: ToolDef[] = [mk({
  slug: "bibibop-nutrition-calculator", title: "Bibibop Nutrition Calculator (Bowl Calorie Counter)",
  meta: "Bibibop Nutrition Calculator — Build Your Bowl Calories",
  desc: "Build a BIBIBOP Asian Grill bowl and count the calories — bases, proteins, hot and cold toppings, sauces, sides and drinks — with your daily calorie share.",
  inputs: [...[[0, 1], [6, 1], [18, 1], [19, 1], [29, 1], [25, 1], [36, 0], [44, 0]].flatMap(([idx, q], i) => [dd(`item${i + 1}`, `Item ${i + 1}`, E.BIBIBOP.map(([nm, c]) => `${nm} — ${c} cal`), idx), num(`qty${i + 1}`, `Item ${i + 1} — How Many`, q, 0, 20, 1)]), num("dailyTarget", "Your Daily Calorie Target", 2000, 800, 6000, 50)],
  results: [["total", "Bowl / Meal Calories", "n", 0], ["pct", "Share of Your Daily Calories (%)", "n", 2], ["left", "Calories Left Today", "n", 0], ["walk", "Minutes of Brisk Walking to Burn It", "n", 0], ["run", "Minutes of Running to Burn It", "n", 0], ["items", "Items", "n", 0], ["top", "Highest-Calorie Item (kcal)", "n", 0]],
  fn: C["bibibop-nutrition-calculator"], ex: { item1: 0, qty1: 1, item2: 6, qty2: 1, item3: 18, qty3: 1, item4: 19, qty4: 1, item5: 29, qty5: 1, item6: 25, qty6: 1, item7: 36, qty7: 0, item8: 44, qty8: 0, dailyTarget: 2000 },
  exText: (o) => `Example: white rice, chicken, roasted sesame broccoli, avocado, kale and Yum Yum sauce come to ${n(o.total)} calories — ${o.pct}% of a 2,000-calorie day.`,
  how: "Pick a base, a protein, your toppings and a sauce (set 'How Many' to 2 for double portions). Calories are for original-sized bowls; a BibiCup uses half-portions of the base.\n\nYum Yum is the highest-calorie sauce (140); Spicy Sriracha (25) is the lightest. Romaine or kale bases save 80–250 calories over rice or noodles.",
  assume: "Calories from BIBIBOP's published nutrition information (updated 26 Aug 2025). Recipes and portions change, so check BIBIBOP's own nutrition sheet for the latest figures and allergens. Exercise times are for a 155 lb adult (brisk walking ≈ 4.5 kcal/min, running ≈ 11 kcal/min). Independent calculator — not affiliated with or endorsed by BIBIBOP Asian Grill.",
  faq: [["How many calories are in a Bibibop bowl?", "Usually 500–900 calories depending on base, protein and sauce."], ["What is the lowest-calorie Bibibop bowl?", "A crispy romaine base with chicken or tofu, vegetables and Spicy Sriracha sauce can be under 350 calories."]],
})];

export const FIT_DIET: [string, ToolDef[]][] = [
  ["diet-macro-meal-planning-calculators", DIET],
  ["mexican-bowl-salad-restaurant-nutrition-calculators", BOWL],
];

async function main() {
  const all = FIT_DIET.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.FIT_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  for (const [cat, tools] of FIT_DIET) await upsertTools(cat, tools);
}
main().catch((e) => { console.error(e); process.exit(1); });
