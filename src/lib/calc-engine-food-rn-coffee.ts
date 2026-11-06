/**
 * Batch: "Food & Drink Calculators" → Restaurant & Fast Food Nutrition Calculators →
 * Coffee, Smoothie & Dessert Shop Nutrition Calculators.
 *
 * Data / methods:
 *  - Calories per menu item as published by each chain (US menus), collected 6 Nov 2026 from
 *    fastfoodnutrition.org, which republishes the chains' nutrition information. Pizza values are per
 *    slice where the chain lists slices. Only calories are used — no protein/carb figures are invented.
 *    Items with a size range are split into "(smallest size)" / "(largest size)" rows (for Subway these
 *    are the 6-inch and footlong). Chains whose listed data looked inconsistent or incomplete
 *    (Domino's, Marco's, Jet's, Blaze, MOD, Papa Murphy's, Penn Station) were not built.
 *  - Daily reference: 2,000 kcal (FDA). Burn rates for a 155 lb adult: brisk walking ≈ 4.5 kcal/min,
 *    running ≈ 11 kcal/min.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-rn-coffee-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));

export type MenuItem = [name: string, kcal: number];
export const SLOTS = 8;

/** Meal total from slots item1..8 (menu index) and qty1..8. */
export function mealCalories(menu: MenuItem[]): CustomCalculator {
  return (v) => {
    let total = 0;
    let items = 0;
    let top = 0;
    for (let i = 1; i <= SLOTS; i++) {
      const q = nonNeg(v[`qty${i}`]);
      if (q <= 0) continue;
      const k = menu[pick(v[`item${i}`], menu.length)][1] * q;
      total += k;
      items += q;
      top = Math.max(top, k);
    }
    const daily = nonNeg(v.dailyTarget, 2000) || 2000;
    return { totalCalories: Math.round(total), percentOfDailyCalories: round2((total / daily) * 100), caloriesLeftToday: Math.round(daily - total), walkingMinutesToBurn: Math.round(total / 4.5), runningMinutesToBurn: Math.round(total / 11), items: round2(items), biggestItemCalories: Math.round(top) };
  };
}

const S = "(smallest size)";
const L = "(largest size)";

export const MENUS: Record<string, MenuItem[]> = {
  starbucks: [[`Caffè Latte ${S}`, 100], ["Butter Croissant", 260], ["Birthday Cake Pop", 170], [`Caffè Latte ${L}`, 240], [`Caramel Macchiato ${S}`, 120], [`Caramel Macchiato ${L}`, 310], [`Caffè Mocha ${S}`, 150], [`Caffè Mocha ${L}`, 380], [`Vanilla Latte ${S}`, 130], [`Vanilla Latte ${L}`, 320], [`Pumpkin Spice Latte ${S}`, 160], [`Pumpkin Spice Latte ${L}`, 400], [`Caramel Frappuccino ${S}`, 260], [`Caramel Frappuccino ${L}`, 470], [`Mocha Frappuccino ${S}`, 240], ["Peppermint Mocha Frappuccino", 360], ["Iced Peppermint Mocha", 260], [`Iced Chai Tea Latte ${S}`, 180], [`Pink Drink ${S}`, 110], [`Pink Drink ${L}`, 270], [`Mango Dragonfruit Refresher ${S}`, 70], ["Nitro Cold Brew", 5], ["Bacon, Gouda & Egg Breakfast Sandwich", 370], ["Impossible Breakfast Sandwich", 430], ["Chocolate Croissant", 340]],
  dunkin: [["Glazed Donut", 260], ["Hash Browns", 140], [`Pineapple Coolatta ${S}`, 230], ["Jelly Donut", 270], ["Boston Kreme Donut", 300], ["Chocolate Frosted Donut", 280], ["Old Fashioned Cake Donut", 290], ["Glazed Stick", 410], ["Glazed Munchkin", 70], ["Jelly Munchkin", 70], ["Powdered Munchkin", 60], ["Old Fashioned Munchkin", 60], ["Egg & Cheese Wake-Up Wrap", 180], ["Bacon, Egg & Cheese Wake-Up Wrap", 210], ["Sausage, Egg & Cheese Wake-Up Wrap", 290], [`Egg and Cheese Sandwich ${S}`, 300], [`Bacon, Egg & Cheese Sandwich ${S}`, 350], [`Ham, Egg & Cheese Sandwich ${S}`, 320], [`Sausage, Egg & Cheese Sandwich ${S}`, 500], [`Sausage, Egg & Cheese Sandwich ${L}`, 700], [`Snack n Go Wrap ${S}`, 210], [`Dunkin' Wrap ${S}`, 380], [`Pineapple Coolatta ${L}`, 460]],
  timhortons: [[`Iced Capp ${S}`, 310], ["Honey Cruller Donut", 310], ["Hash Browns", 130], [`Iced Capp ${L}`, 500], [`Latte ${S}`, 80], [`Latte ${L}`, 160], [`Iced Latte ${S}`, 210], [`Iced Latte ${L}`, 380], ["Boston Cream Donut", 220], ["Old Fashion Glazed Donut", 270], ["Sour Cream Glazed Donut", 340], ["Oreo Donut", 420], ["Birthday Cake Timbit", 80], ["Chocolate Glazed Timbit", 70], ["Plain Bagel", 300], ["Everything Bagel", 300], ["Four Cheese Bagel", 320], ["Bacon Breakfast Sandwich", 420], ["Sausage Breakfast Sandwich", 530], ["Aged Cheddar Biscuit Breakfast Sandwich", 540], ["Croissant Breakfast Sandwich", 600], [`Chicken Noodle Soup ${S}`, 120], [`Broccoli Cheddar Soup ${S}`, 180], [`Hearty Vegetable Soup ${S}`, 80]],
  caribou: [[`Mocha ${S}`, 250], ["Maine Blueberry Muffin", 380], ["Cold Press Iced Coffee", 5], [`Mocha ${L}`, 500], [`Latte ${S}`, 120], [`Latte ${L}`, 220], [`Iced Latte ${S}`, 80], [`Iced Mocha ${S}`, 250], [`Cold Press Latte ${S}`, 70], [`Caramel High Rise ${S}`, 440], [`Coffee Cooler ${S}`, 280], [`Caramel Cooler ${S}`, 610], [`Caramel Cooler ${L}`, 830], ["Plain Bagel", 270], ["Asiago Bagel", 290], ["Bacon, Egg & Cheese Bagel", 610], ["Sausage Biscuit", 590], ["Classic Oatmeal", 260], ["Blueberry Almond Oatmeal", 340], ["Banana Bread", 280], ["Apple Fritter", 420], ["Chocolate Hazelnut Croissant", 400], ["Cinnamon Coffee Cake", 530]],
  tropicalsmoothie: [["Blueberry Bliss Smoothie", 340], ["Chicken Pesto Toasted Flatbread", 430], ["Thai Chicken Bowl", 380], ["Acai Berry Boost Smoothie", 470], ["Avocolada Smoothie", 600], ["Bahama Mama Smoothie", 500], ["Beach Bum Smoothie", 550], ["Blimey Limey Smoothie", 440], ["Chia Banana Boost with Strawberry Smoothie", 610], ["Chia Banana Boost with Peanut Butter Smoothie", 780], ["Baja Chicken Bowl", 470], ["Buffalo Chicken Bowl", 420], ["Caribbean Jerk Chicken Bowl", 440], ["Supergreen Caesar Chicken Bowl", 570], ["Hummus Veggie Bowl", 620], ["Chicken Bacon Ranch Toasted Flatbread", 500], ["Chipotle Chicken Club Toasted Flatbread", 490], ["Cali Chicken Club Toasted Flatbread", 570], ["Chicken Apple Club Toasted Flatbread", 580], ["Buffalo Chicken Toasted Wrap", 510], ["Thai Chicken Toasted Wrap", 500], ["Caribbean Jerk Chicken Toasted Wrap", 590], ["Baja Chicken Toasted Wrap", 640], ["Three Cheese Chicken Quesadilla", 550], ["Island Chicken Quesadilla", 570], ["Santa Fe Chicken Quesadilla", 600]],
  smoothieking: [[`Blueberry Heaven ${S}`, 260], [`Pure Recharge Strawberry ${S}`, 160], [`Vegan Mixed Berry ${S}`, 310], [`Blueberry Heaven ${L}`, 530], [`Daily Warrior ${S}`, 680], [`Daily Warrior ${L}`, 1360], [`Hydration Tart Cherry Lemonade ${S}`, 250], [`Immune Builder Mixed Berry ${S}`, 340], [`Immune Builder Orange ${S}`, 320], [`Immune Builder Veggie Superfood ${S}`, 360], [`Pure Recharge Mango Strawberry ${S}`, 300], [`Pure Recharge Pineapple ${S}`, 340], [`Vegan Dark Chocolate Banana ${S}`, 350], [`Vegan Mango Kale ${S}`, 330], [`Vegan Nutty Super Grain ${S}`, 520], [`Vegan Pineapple Spinach ${S}`, 360], [`Vegan Mixed Berry ${L}`, 620], [`Vegan Nutty Super Grain ${L}`, 1040]],
  jamba: [[`Mango-A-Go-Go Smoothie ${S}`, 300], [`Strawberries Wild Smoothie ${S}`, 240], ["Acai Primo Bowl", 510], [`Mango-A-Go-Go Smoothie ${L}`, 510], [`Strawberries Wild Smoothie ${L}`, 430], [`Razzmatazz Smoothie ${S}`, 270], [`Orange Dream Machine Smoothie ${S}`, 310], [`Strawberry Surf Rider Smoothie ${S}`, 250], [`Watermelon Breeze Smoothie ${S}`, 280], [`Pumpkin Smash Smoothie ${S}`, 290], [`Peanut Butter Moo'D Smoothie ${S}`, 430], [`Peanut Butter Moo'D Smoothie ${L}`, 910], ["Chunky Strawberry Bowl", 580], ["Island Pitaya Bowl", 480], ["Nutty Almond Butter Bowl", 430], ["Peachy Green Goodness Bowl", 510], ["Vanilla Blue Sky Bowl", 330], [`Purely Orange Juice ${S}`, 220], [`Purely Carrot Juice ${S}`, 190], [`Orange Carrot Twist Juice ${S}`, 210]],
  dairyqueen: [[`Oreo Blizzard ${S}`, 380], ["Chicken Strips", 280], [`French Fries ${S}`, 280], [`Oreo Blizzard ${L}`, 1140], [`Butterfinger Blizzard ${S}`, 350], [`Butterfinger Blizzard ${L}`, 970], [`Vanilla Cone ${S}`, 160], [`Vanilla Cone ${L}`, 450], [`Chocolate Cone ${S}`, 160], ["Chocolate Dilly Bar", 220], ["No Sugar Added Dilly Bar", 200], ["Non-Dairy Dilly Bar", 240], [`Chocolate Sundae ${S}`, 270], [`Caramel Sundae ${S}`, 300], [`Vanilla Shake ${S}`, 520], [`Chocolate Shake ${S}`, 530], [`Strawberry Shake ${S}`, 490], [`Chocolate Shake ${L}`, 920], ["Original Cheeseburger", 400], ["Original Double Cheeseburger", 560], ["Deluxe Cheeseburger", 660], [`French Fries ${L}`, 470]],
  baskinrobbins: [[`Chocolate Chip Cookie Dough Ice Cream ${S}`, 180], ["Sugar Cone", 45], ["Two-Scoop Sundae", 570], [`Chocolate Chip Cookie Dough Ice Cream ${L}`, 280], [`Vanilla Ice Cream ${S}`, 150], [`Chocolate Ice Cream ${S}`, 150], [`Mint Chocolate Chip Ice Cream ${S}`, 160], [`OREO Cookies 'n Cream Ice Cream ${S}`, 160], [`Pralines 'n Cream Ice Cream ${S}`, 170], [`Jamoca Almond Fudge Ice Cream ${S}`, 160], [`Rocky Road Ice Cream ${S}`, 170], [`Very Berry Strawberry Ice Cream ${S}`, 130], ["Cake Cone", 25], ["Waffle Cone", 160], ["Sprinkle Cone", 310], ["Banana Split", 960], ["Oreo Layered Sundae", 930], ["Chocolate Chip Cookie Dough Sundae", 1100], ["Snickers Sundae", 1110], [`Vanilla Milkshake ${S}`, 680], [`World Class Chocolate Milkshake ${S}`, 710], [`Oreo Cookies n' Cream Milkshake ${S}`, 720], [`Peanut Butter 'n Chocolate Milkshake ${S}`, 790], ["Sundae Shake", 780]],
  coldstone: [[`Cake Batter Ice Cream ${S}`, 220], ["OREO Cookies (mix-in)", 110], ["Waffle Cone or Bowl", 110], [`Cake Batter Ice Cream ${L}`, 860], [`Vanilla Bean Ice Cream ${S}`, 200], [`Chocolate Ice Cream ${S}`, 200], [`Strawberry Ice Cream ${S}`, 200], [`Classic Cookie Dough Ice Cream ${S}`, 220], [`Birthday Cake Remix ${S}`, 670], [`Birthday Cake Remix ${L}`, 1190], [`Chocolate Devotion ${S}`, 610], [`Cheesecake Fantasy ${S}`, 410], [`Berry Berry Berry Good ${S}`, 380], [`Banana Caramel Crunch ${S}`, 450], [`Apple Pie A La Cold Stone ${S}`, 460], ["Chocolate Chips (mix-in)", 90], ["Peanut M&M'S (mix-in)", 100], ["Reese's Peanut Butter Cups (mix-in)", 160], ["Cookie Dough (mix-in)", 160], ["Brownies (mix-in)", 190], ["Sugar Cone", 50], ["Cake Cone", 25], ["Dipped Waffle Cone or Bowl", 310], [`Very Vanilla Shake ${S}`, 740], [`Oh Fudge! Shake ${S}`, 710]],
};

export const foodRnCoffeeCustomCalculators: Record<string, CustomCalculator> = {
  "starbucks-calorie-calculator": mealCalories(MENUS.starbucks),
  "dunkin-calorie-calculator": mealCalories(MENUS.dunkin),
  "tim-hortons-calories-calculator": mealCalories(MENUS.timhortons),
  "caribou-nutrition-calculator": mealCalories(MENUS.caribou),
  "tropical-smoothie-nutrition-calculator": mealCalories(MENUS.tropicalsmoothie),
  "smoothie-king-nutrition-calculator": mealCalories(MENUS.smoothieking),
  "jamba-juice-nutrition-calculator": mealCalories(MENUS.jamba),
  "dairy-queen-nutrition-calculator": mealCalories(MENUS.dairyqueen),
  "baskin-robbins-nutrition-calculator": mealCalories(MENUS.baskinrobbins),
  "cold-stone-calorie-calculator": mealCalories(MENUS.coldstone),
};
