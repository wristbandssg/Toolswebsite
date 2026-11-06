/**
 * Batch: "Food & Drink Calculators" → Restaurant & Fast Food Nutrition Calculators →
 * Mexican, Bowl & Salad Restaurant Nutrition Calculators.
 *
 * Data / methods:
 *  - Calories per menu item or build-your-own component as published by each chain (US menus),
 *    collected 6 Nov 2026 from fastfoodnutrition.org, which republishes the chains' nutrition
 *    information. Chipotle's tortilla and protein figures are Chipotle's own published values.
 *    Only calories are used — no protein/carb figures are invented. Items with a size range are
 *    split into "(smallest size)" / "(largest size)" rows. Chains whose listed data looked
 *    inconsistent (Moe's, Costa Vida, Saladworks) or that were not available were not built.
 *  - Daily reference: 2,000 kcal (FDA). Burn rates for a 155 lb adult: brisk walking ≈ 4.5 kcal/min,
 *    running ≈ 11 kcal/min.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-rn-bowl-calculators.ts for the copy.
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
  chipotle: [["Chicken", 180], ["Flour tortilla (burrito)", 320], ["White rice", 170], ["Black beans", 120], ["Steak", 150], ["Carnitas", 210], ["Barbacoa", 170], ["Sofritas", 150], ["Brown rice", 160], ["Cilantro-lime cauliflower rice", 40], ["Pinto beans", 120], ["Fajita veggies", 20], ["Tomato salsa", 20], ["Corn salsa", 80], ["Green tomatillo salsa", 15], ["Red tomatillo salsa", 40], ["Sour cream", 120], ["Cheese", 100], ["Guacamole", 150], ["Queso", 120], ["Lettuce", 10], ["Supergreens", 15], ["Chips", 570], ["Chips & guacamole", 720], ["Vinaigrette dressing", 260], [`Tractor Lemonade ${S}`, 150], ["Izze Sparkling Clementine", 160], ["Organic black tea", 30]],
  tacobell: [["Crunchwrap Supreme", 530], ["Crunchy Taco", 170], ["Crunchy Taco Supreme", 190], ["Soft Taco (beef)", 180], ["Soft Taco Supreme (beef)", 210], ["Black Bean Soft Taco", 170], ["Double Decker Taco", 310], ["Black Bean Crunchwrap Supreme", 510], ["Mexican Pizza", 530], ["Bean Burrito", 350], ["Beefy 5-Layer Burrito", 490], ["Burrito Supreme (beef)", 390], ["Cheese Quesadilla", 450], ["Chicken Quesadilla", 510], ["Steak Quesadilla", 520], [`Grande Nachos ${S}`, 1010], ["Cantina Chicken Bowl", 490], ["Veggie Power Bowl", 430], [`Nacho Fries ${S}`, 330], [`Nacho Fries ${L}`, 470], ["Cheesy Fiesta Potatoes", 230], ["Black Beans & Rice", 170], ["Pintos n Cheese", 180], ["Cinnamon Twists", 170], ["Salted Caramel Churros", 230], ["Orange Juice", 140], ["Diet Pepsi", 0]],
  qdoba: [["Grilled adobo chicken", 150], ["Whole wheat flour tortilla", 270], ["Cilantro lime rice", 190], ["Black beans", 140], ["Corn tortilla", 60], ["Seasoned brown rice", 170], ["Pinto beans", 130], ["Grilled steak", 230], ["Ground beef", 190], ["Pulled pork", 140], ["Smoked brisket", 270], ["Chorizo", 210], ["Impossible plant-based protein", 180], [`3-Cheese Queso ${S}`, 90], [`3-Cheese Queso ${L}`, 190], [`Guacamole ${S}`, 90], [`Guacamole ${L}`, 170], ["Shredded cheese", 110], ["Cotija cheese", 30], ["Lite sour cream", 50], ["Pico de gallo", 10], ["Salsa roja", 20], ["Corn tortilla chips", 560], ["Chicken Protein Bowl", 610], ["Chicken Queso Bowl", 780], ["Chicken Queso Burrito", 1080], ["Steak Fajita Quesadilla", 1130], [`Street Style Chicken Tacos ${S}`, 470]],
  cava: [["Grilled chicken", 250], ["Grain bowl base", 247], ["Hummus", 30], ["Greek vinaigrette", 130], ["Salad base", 18], ["Greens & grains base", 132], ["RightRice base", 370], ["Pita", 230], ["Mini pita", 110], ["Harissa honey chicken", 260], ["Braised lamb", 280], ["Spicy lamb meatballs", 220], ["Grilled meatballs", 190], ["Falafel", 270], ["Roasted vegetables", 70], ["Roasted white sweet potato", 190], ["Roasted red pepper hummus", 25], ["Tzatziki", 25], ["Crazy Feta", 60], ["Eggplant & red pepper dip", 15], ["Harissa", 60], ["Garlic sauce", 170], ["Pita chips", 260], ["Side pita", 110], ["Spicy lentil soup", 190], ["Chicken & RightRice Bowl", 490], ["Harissa Avocado Bowl", 810], ["Tahini Caesar Bowl", 660], ["Greek Salad", 540]],
  panda: [["Orange Chicken", 370], ["Chow Mein", 510], ["Beijing Beef", 470], ["Broccoli Beef", 150], ["Kung Pao Chicken", 290], ["Honey Walnut Shrimp", 360], ["Mushroom Chicken", 220], ["Black Pepper Chicken", 280], ["Teriyaki Chicken", 340], ["Fried Rice", 520], ["Steamed White Rice", 380], ["Steamed Brown Rice", 420], ["Super Greens", 90], ["Chicken Egg Roll", 200], ["Veggie Spring Roll", 160], ["Cream Cheese Rangoon", 190], ["Chicken Potsticker", 220], [`Hot & Sour Soup ${S}`, 120], [`Pepsi ${S}`, 130], [`Pepsi ${L}`, 460], [`Tropicana Lemonade ${S}`, 130], ["Diet Pepsi", 0]],
  sweetgreen: [["Harvest Bowl", 695], ["Chicken Pesto Parm Bowl", 530], ["Chicken Avocado Ranch Bowl", 755], ["Crispy Rice Bowl", 635], ["Fish Taco Bowl", 685], ["Shroomami Bowl", 685], ["Kale Caesar Salad", 405], ["Super Green Goddess Salad", 460], ["Guacamole Greens Salad", 545], ["Hummus Crunch Salad", 390], ["Buffalo Chicken Salad", 445], ["BBQ Chicken Salad", 585], ["Garden Cobb Salad", 650], ["Chopped romaine (base)", 15], ["Shredded kale (base)", 20], ["Baby spinach (base)", 15], ["Arugula (base)", 15], ["Warm quinoa", 120], ["Warm wild rice", 190], ["Roasted chicken", 110], ["Blackened chicken", 130], ["Roasted sesame tofu", 160], ["Roasted steelhead", 150]],
  deltaco: [[`The Del Taco ${S}`, 300], [`Crinkle Cut Fries ${S}`, 160], [`Chocolate Shake ${S}`, 250], [`Value Taco ${S}`, 130], [`Street Taco ${S}`, 170], ["Chicken Al Carbon Taco", 150], ["Grilled Chicken Taco", 210], ["Crispy Chicken Taco", 230], [`Bean & Cheese Burrito ${S}`, 450], ["Del Beef Burrito", 500], ["Grilled Chicken Burrito", 530], ["8 Layer Veggie Burrito", 530], ["Macho Combo Burrito", 950], [`Epic Cali Bacon Burrito ${S}`, 1030], ["Quesadilla", 460], ["Chicken Quesadilla", 550], ["3 Layer Queso Nachos", 270], [`Queso Loaded Nachos ${S}`, 550], ["Carne Asada Fries", 810], ["Chili Cheddar Fries", 570], [`Crinkle Cut Fries ${L}`, 470], [`Breakfast Burrito ${S}`, 430], ["Hashbrown Sticks", 230], ["Mini Churro Dipper Shake", 450]],
  noodles: [[`Wisconsin Mac & Cheese ${S}`, 490], [`Wisconsin Mac & Cheese ${L}`, 981], [`Pesto Cavatappi ${S}`, 370], [`Pesto Cavatappi ${L}`, 731], [`Japanese Pan Noodles ${S}`, 320], [`Japanese Pan Noodles ${L}`, 641], [`Pad Thai Noodles ${S}`, 521], [`Penne Rosa ${S}`, 360], [`Spaghetti & Meatballs ${S}`, 671], [`Shrimp Scampi ${S}`, 461], [`Buttered Egg Noodles ${S}`, 380], [`Buffalo Chicken Mac & Cheese ${S}`, 651], [`BBQ Pork Mac & Cheese ${S}`, 691], [`Alfredo Montamore with Parmesan-Crusted Chicken ${S}`, 801], [`Caesar Salad ${S}`, 160], [`Caesar Chicken Salad ${S}`, 270], [`The Med Salad with Chicken ${S}`, 250], [`Chicken Veracruz Salad ${S}`, 380], [`Chicken Noodle Soup ${S}`, 190], [`Thai Chicken Soup ${S}`, 250], [`Tomato Basil Bisque ${S}`, 290]],
  caferio: [["Fire-grilled chicken (burrito)", 361], ["Flour tortilla (burrito)", 442], ["Cilantro lime rice (burrito)", 105], ["Black beans (burrito)", 153], ["Wheat tortilla (burrito)", 423], ["Fire-grilled steak (burrito)", 251], ["Fire-grilled salmon (burrito)", 217], ["Shredded chicken (burrito)", 238], ["Sweet pork barbacoa (burrito)", 292], ["Spicy green chile pork (burrito)", 292], ["Chile roasted beef (burrito)", 199], ["Cheddar jack cheese (burrito)", 111], ["Creamy tomatillo dressing (burrito)", 161], ["Corn tortilla (taco)", 64], ["Shredded chicken (tacos)", 190], ["Fire-grilled steak (tacos)", 100], ["Fire-grilled chicken (salad)", 217], ["Tortilla chip strips (salad)", 188], ["Cilantro lime dressing (salad)", 215], ["Chips & Salsa", 457], ["Chips, Salsa & Guacamole", 501], ["Chips, Salsa & Queso", 493], ["Salmon Tacos", 530], ["Fresh Lime Pie", 435]],
  peiwei: [[`Orange Chicken ${S}`, 670], ["Chicken Egg Roll", 200], [`Kung Pao Chicken ${S}`, 788], [`Kung Pao Shrimp ${S}`, 630], [`Mongolian Steak ${S}`, 580], [`Sweet & Sour Chicken ${S}`, 650], [`Teriyaki Chicken ${S}`, 728], [`Thai Coconut Curry Chicken ${S}`, 430], [`Original Shrimp ${S}`, 650], [`Chicken Pad Thai ${S}`, 1370], ["Chicken Fried Rice", 1106], ["Chicken Lo Mein", 1170], ["Dan Dan Noodles", 990], ["Spicy Polynesian Poke Bowl", 710], ["Asian Chopped Chicken Salad", 660], ["Chicken Lettuce Wraps", 810], ["Pork Egg Rolls", 280], ["Vegetable Spring Rolls", 120], ["Crab Wonton", 85], ["Mongolian Green Beans", 430], ["Yum Yum Shrimp", 260]],
  freebirds: [["Chicken Burrito", 546], ["Mission tortilla chips", 230], [`Queso side ${S}`, 211], ["Spicy Chicken Burrito", 864], ["BBQ Classic Burrito", 748], ["Chicken Bowl", 515], ["Steak Bowl", 527], ["Lite Chicken Bowl", 292], ["Vegan Bowl", 412], [`Queso side ${L}`, 358], [`Guacamole side ${S}`, 143], [`Guacamole side ${L}`, 242], ["Flour taco tortilla", 110], ["Corn taco tortilla", 60], ["Steak (nachos portion)", 196], ["Carnitas (nachos portion)", 165], ["Ground beef (nachos portion)", 185], ["White-meat chicken (nachos portion)", 107], ["Calabacitas tempeh (nachos portion)", 75]],
};

export const foodRnBowlCustomCalculators: Record<string, CustomCalculator> = {
  "chipotle-nutrition-calculator": mealCalories(MENUS.chipotle),
  "taco-bell-nutrition-calculator": mealCalories(MENUS.tacobell),
  "qdoba-calorie-calculator": mealCalories(MENUS.qdoba),
  "cava-nutrition-calculator": mealCalories(MENUS.cava),
  "panda-express-calorie-calculator": mealCalories(MENUS.panda),
  "sweetgreen-calorie-calculator": mealCalories(MENUS.sweetgreen),
  "del-taco-nutrition-calculator": mealCalories(MENUS.deltaco),
  "noodles-and-company-nutrition-calculator": mealCalories(MENUS.noodles),
  "cafe-rio-nutrition-calculator": mealCalories(MENUS.caferio),
  "pei-wei-nutrition-calculator": mealCalories(MENUS.peiwei),
  "freebird-nutrition-calculator": mealCalories(MENUS.freebirds),
};
