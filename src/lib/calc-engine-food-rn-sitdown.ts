/**
 * Batch: "Food & Drink Calculators" → Restaurant & Fast Food Nutrition Calculators →
 * Sit-Down Restaurant Nutrition Calculators.
 *
 * Data / methods:
 *  - Calories per menu item as published by each chain (US menus), collected 6 Nov 2026 from
 *    fastfoodnutrition.org, which republishes the chains' nutrition information. Only calories are
 *    used — no protein/carb figures are invented. Items with a size range are split into
 *    "(smallest size)" / "(largest size)" rows. Chains not available on the source (BJ's, Cheddar's,
 *    Yard House, Chuy's, Sonny's BBQ, Saltgrass, Egg Harbor, La Madeleine, Metro Diner, Wildflower)
 *    were not built.
 *  - Daily reference: 2,000 kcal (FDA). Burn rates for a 155 lb adult: brisk walking ≈ 4.5 kcal/min,
 *    running ≈ 11 kcal/min.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-rn-sitdown-calculators.ts for the copy.
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
  applebees: [["Classic Bacon Cheeseburger", 881], ["Garlic Mashed Potatoes", 280], ["Brownie Bite with Vanilla Ice Cream", 350], [`Sirloin Steak ${S}`, 200], [`Sirloin Steak ${L}`, 270], ["Grilled Chicken Breast", 190], ["Cedar Grilled Lemon Chicken", 600], ["Chicken Tenders Plate", 1151], ["Classic Three Cheese Chicken Penne", 490], ["Stuffed Rigatoni", 881], [`Double-Glazed Baby Back Ribs ${S}`, 460], [`Double-Glazed Baby Back Ribs ${L}`, 910], ["Triple Bacon Burger", 1171], ["Boneless Wings", 681], ["Chips & Salsa", 621], ["Spinach & Artichoke Dip with Chips", 931], ["Crunchy Onion Rings", 1291], [`Mozzarella Sticks ${S}`, 450], ["Thai Shrimp Salad", 390], ["Grilled Chicken Caesar Salad", 771], ["Buffalo Chicken Wedge Salad", 1120], ["Steamed Broccoli", 100], ["Garlicky Green Beans", 160], ["Baked Potato", 530], ["Hot Fudge Sundae Shooter", 410]],
  chilis: [["Just Bacon Burger", 1031], ["Homestyle Fries", 210], ["Molten Chocolate Cake", 1171], ["Classic Ribeye", 631], [`Classic Sirloin Steak ${S}`, 260], [`Classic Sirloin Steak ${L}`, 390], ["Crispy Chicken Crispers", 1381], ["Crispy Honey-Chipotle Chicken Crispers", 1832], ["Chili Burger", 1021], ["Southern Smokehouse Burger", 1261], ["The Boss Burger", 1532], ["Grilled Steak Fajitas", 671], ["Shrimp Fajitas", 320], ["Mushroom Jack Fajitas", 721], [`House BBQ Ribs ${S}`, 721], [`Honey Chipotle BBQ Baby Back Ribs ${S}`, 741], ["Grilled Chicken Salad", 440], ["Santa Fe Chicken Salad", 631], ["Awesome Blossom", 821], ["Big Mouth Bites", 781], [`Bone-In Chicken Wings ${S}`, 801], [`Texas Cheese Fries ${S}`, 1341], ["Skillet Queso", 1431], ["Cheesecake", 721]],
  olivegarden: [["Fettuccine Alfredo", 1010], ["Breadstick", 140], [`House Salad ${S}`, 70], ["Tiramisu", 470], ["Lasagna Classico", 930], ["Chicken Parmigiana (lunch)", 760], ["Chicken Parmigiana (dinner)", 1060], ["Chicken Marsala", 1080], ["Chicken Piccata", 500], ["Chicken Margherita", 590], ["Linguine di Mare", 570], ["Zoodles Primavera", 570], ["Zuppa Toscana", 220], ["Chicken & Gnocchi Soup", 230], ["Pasta e Fagioli", 150], ["Minestrone Soup", 110], [`House Salad ${L}`, 150], ["Calamari", 870], ["Stuffed Mushrooms", 380], ["Garlic Mussels Marinara", 510], ["Amaretto Tiramisu", 220], ["Chocolate Mousse", 240], ["Warm Apple Crostata", 630]],
  texasroadhouse: [[`Sirloin Steak ${S}`, 250], ["Baked Potato", 380], ["Steak Fries", 360], [`Sirloin Steak ${L}`, 670], [`Dallas Filet ${S}`, 270], [`New York Strip ${S}`, 420], [`Ft. Worth Ribeye ${S}`, 800], ["Bone-In Ribeye", 1480], ["Porterhouse T-Bone", 1040], [`Prime Rib ${S}`, 780], [`Ribs ${S}`, 900], ["Grilled BBQ Chicken", 260], ["Herb Crusted Chicken", 250], ["Country Fried Chicken", 750], [`Smothered Chicken ${S}`, 400], ["Grilled Shrimp", 240], ["Cactus Blossom", 1700], ["Cheese Fries", 1240], ["Tater Skins", 1020], ["Fried Pickles", 550], ["Mashed Potatoes", 220], ["Sweet Potato", 350], ["Loaded Baked Potato", 650], ["Coleslaw", 330], ["Strawberry Cheesecake", 780], ["Big Ol' Brownie", 1230]],
  ihop: [[`Original Buttermilk Pancakes ${S}`, 300], ["Hash Browns", 210], ["Omelette", 400], [`Original Buttermilk Pancakes ${L}`, 741], ["French Crème Brûlée Pancakes", 631], ["Gluten Friendly Pancakes", 540], ["Belgian Waffle with Whipped Butter", 591], ["Gluten Friendly Belgian Waffle", 410], ["Swedish Crepe", 591], ["Cheese Blintzes with Blueberry Compote", 891], ["Egg White Omelette", 100], ["Spinach & Mushroom Omelette", 911], ["Big Steak Omelette", 1041], ["Bacon Temptation Omelette", 1111], ["Colorado Omelette", 1251], ["Chicken & Waffles", 1051], ["Chicken & Pancakes Combo", 901], ["Eggs Benedict Combo", 851], ["Huevos Rancheros Combo", 661], ["Loco Moco Combo", 871], ["Cowboy BBQ Steakburger", 951], ["Mega Monster Cheeseburger", 1071], ["Crispy Breakfast Potatoes", 280], ["Crispy Potato Cakes", 370], ["Onion Rings", 531]],
  dennys: [["Original Grand Slam (without eggs)", 711], ["Hash Browns", 170], ["Chocolate Lava Cake", 701], ["All-American Slam with Hash Browns", 931], ["Super Slam Breakfast", 881], ["Lumberjack Slam", 971], ["The Grand Slamwich with Hash Browns", 1321], ["Stack of Buttermilk Pancakes", 450], ["Choconana Pancake Breakfast", 911], ["Cinnamon Roll Pancake Breakfast", 1351], ["Santa Fe Sizzlin' Skillet", 521], ["Supreme Sizzlin' Skillet", 561], ["Bourbon Chicken Sizzlin' Skillet Dinner", 881], ["America's Diner Cheeseburger", 791], ["Slamburger", 851], ["Double Cheeseburger", 981], ["Bacon Avocado Cheeseburger", 1001], ["Club Sandwich", 831], ["Holiday Turkey Melt", 1141], ["Slow-Cooked Pot Roast Dinner", 400], ["Homestyle Meatloaf Dinner", 591], ["French Fries", 400], ["Seasoned Fries", 490], [`New York Style Cheesecake ${S}`, 500]],
  crackerbarrel: [["Chicken n' Dumplins", 450], ["Biscuit", 160], ["Peach Cobbler with Ice Cream", 490], ["Meatloaf", 521], ["Chicken n' Dumplins & Meatloaf Sampler", 861], ["Country Fried Steak", 600], ["Chicken Fried Chicken", 1141], ["Southern Fried Chicken", 1642], [`Buttermilk Pancakes ${S}`, 631], ["Wild Maine Blueberry Pancakes", 761], ["Pecan Pancakes", 1131], ["Momma's Pancake Breakfast", 881], ["French Toast", 861], ["Momma's French Toast Breakfast", 1001], ["Grandma's Sampler Breakfast", 861], ["Double Meat Breakfast", 721], ["Sunrise Sampler Breakfast", 921], ["Southwestern Scramble Breakfast", 1001], ["Gravy n' Biscuits", 711], ["Mashed Potatoes", 200], ["Sweet Potato Casserole", 190], ["Dumplins (side)", 210], ["All American Apple Pie with Ice Cream", 461], ["Apple Dumplin' with Ice Cream", 1712]],
  outback: [["Prime Center-Cut Filet", 440], ["Aussie Fries", 410], ["Honey Wheat Bread and Whipped Butter", 310], ["Chargrilled Ribeye", 890], ["Bone-In Natural Cut Ribeye", 950], ["Wagyu Filet", 520], [`Baby Back Ribs ${S}`, 910], [`Alice Springs Chicken ${S}`, 440], [`Alice Springs Chicken ${L}`, 790], ["Parmesan-Herb Crusted Chicken", 510], ["Chicken Fried Chicken", 1140], [`Grilled Salmon ${S}`, 380], ["Simply Grilled Mahi", 220], ["Grilled Alaskan Halibut", 310], ["Hand-Breaded Shrimp", 470], ["Bloomin' Onion", 1950], ["Homestyle Mashed Potatoes", 240], ["Steamed Broccoli", 150], ["Steakhouse Mac & Cheese", 850], ["Ice Cream", 300], ["Key Lime Pie", 1010], ["New York Style Cheesecake", 930], ["Triple-Layer Carrot Cake", 1290]],
  longhorn: [[`Flo's Filet ${S}`, 330], ["Fresh Steamed Broccoli", 90], ["Mashed Potatoes", 340], [`Flo's Filet ${L}`, 450], ["Ribeye Steak", 810], ["Outlaw Ribeye Steak", 1250], ["New York Strip / Kansas City Strip", 630], ["The LongHorn Steak", 1280], ["Fire-Grilled T-Bone Steak", 1130], ["Chop Steak", 570], ["Churrasco Steak with Plantains", 840], [`Salmon ${S}`, 300], [`Redrock Grilled Shrimp ${S}`, 160], [`Parmesan Crusted Chicken ${S}`, 650], [`Chicken Tenders ${S}`, 420], ["Chicken Fried Chicken", 800], ["Crispy Buttermilk Chicken Sandwich", 920], ["Seasoned Steakhouse Wings", 460], ["Fried Pickles", 690], ["Texas Brisket Queso", 1070], [`Sweet Potato ${S}`, 240], ["Strawberries & Cream Shortcake", 640], ["Molten Lava Cake", 1100], ["Praline Cheesecake", 990]],
  redrobin: [["Gourmet Cheeseburger", 881], ["Steak Fries", 370], [`Vanilla Milkshake ${S}`, 511], ["Bacon Cheeseburger", 1051], ["Big Tavern Burger", 871], ["Wedge Burger", 430], ["Grilled Turkey Burger", 721], ["Burnin' Love Chicken Burger", 761], ["Blackened Chicken Sandwich", 641], ["Simply Grilled Chicken Sandwich", 851], ["Crispy Chicken Sandwich", 1351], ["House Salad", 110], ["Classic Wedge Salad", 420], ["Avo-Cobb-O Salad", 560], ["Mighty Caesar Salad", 661], ["Fried Mushrooms", 410], ["Zucchini Sticks", 452], ["Fried Cheese Sticks", 600], ["Guacamole, Salsa & Chips", 656], ["Chili Con Queso", 730], [`Chocolate Milkshake ${S}`, 550], [`Chocolate Milkshake ${L}`, 1031], ["Chillin' Mango Smoothie", 220]],
  wafflehouse: [["Classic Waffle", 410], [`Hashbrowns ${S}`, 190], ["Two Scrambled Eggs", 180], ["Bacon (strip serving)", 140], ["Sausage (serving)", 260], ["Scrambled Egg (1)", 90], ["Raisin Toast", 300], [`Hashbrowns ${L}`, 571], [`Bacon Side ${L}`, 230], [`Sausage Side ${L}`, 390], ["Bacon, Egg & Cheese Breakfast Sandwich", 410], ["Sausage Breakfast Sandwich", 390], ["Ham & Cheese Waffle Sandwich", 380], ["Grilled Cheese Sandwich", 330], ["BLT Sandwich", 275], ["Grilled Chicken Sandwich Deluxe", 490], ["Original Angus Cheeseburger", 516], ["Texas Angus Patty Melt", 731], ["Sirloin Steak & Two Scrambled Eggs", 661], ["T-Bone Steak & Two Scrambled Eggs", 1231]],
  redlobster: [["Walt's Favorite Shrimp", 620], ["Cheddar Bay Biscuit", 160], ["Baked Potato", 210], ["Garlic-Grilled Shrimp", 350], ["Snow Crab Legs", 440], ["Rock Lobster Tail", 710], ["Parmesan-Crusted Fresh Tilapia", 550], ["Fish and Chips", 900], ["Parrot Isle Jumbo Coconut Shrimp", 960], ["Sweet Chili Shrimp", 1100], ["Seaside Shrimp Trio", 1300], ["Crispy Shrimp Lettuce Wraps", 620], ["Shrimp Cocktail", 130], ["Seafood-Stuffed Mushrooms", 440], ["Mozzarella Cheesesticks", 810], ["Crispy Calamari and Vegetables", 1770], ["Lobster and Langostino Pizza", 690], ["Garden Side Salad", 70], ["Caesar Side Salad", 290], ["Broccoli", 40], ["Asparagus", 90], ["Wild Rice Pilaf", 140], ["Mashed Potatoes", 190], ["French Fries", 290], ["Coleslaw", 260]],
  pfchangs: [["Mongolian Beef", 770], [`Fried Rice ${S}`, 910], [`Lettuce Wraps ${S}`, 640], ["Mongolian Beef Bowl", 790], ["Gluten Free Mongolian Beef", 740], [`Orange Peel Chicken ${S}`, 580], [`Orange Peel Chicken ${L}`, 860], [`Orange Peel Shrimp ${S}`, 390], [`Lo Mein ${S}`, 760], [`Lo Mein ${L}`, 1050], ["Fried Rice (lunch)", 300], [`Fried Rice ${L}`, 1200], [`Lettuce Wraps ${L}`, 730], ["Gluten Free Chicken Lettuce Wraps", 490], ["Dynamite Shrimp Lettuce Wraps", 1280], [`Pan Fried Pork Dumplings ${S}`, 330], [`Steamed Shrimp Dumplings ${S}`, 190], ["Mongolian Potstickers", 700], ["Good Fortune Cheesecake", 290], ["New York-Style Cheesecake", 940], ["Vietnamese Chocolate Lava Cake", 800]],
  firstwatch: [["Avocado Toast", 630], ["Kale Tonic Fresh Juice", 130], ["Sunrise Granola Bowl", 490], [`The Traditional ${S}`, 1020], [`Tri-Fecta with Belgian Waffle ${S}`, 860], [`Tri-Fecta with Multigrain Pancake ${S}`, 990], ["Belgian Waffle", 620], ["Multigrain Pancake", 710], ["French Toast", 840], ["Morning Market Veg Egg White Omelet", 690], ["Morning Market Veg Omelet", 860], ["Bacado Egg White Omelet", 840], ["Farm Stand Breakfast Tacos", 930], ["Elevated Egg Sandwich", 1090], ["Market Hash", 1230], ["Farmhouse Hash", 1250], ["Pesto Chicken Quinoa Bowl", 650], ["Power Breakfast Quinoa Bowl", 870], ["Market Veggie Sandwich", 830], ["Ham and Gruyère Melt", 890], ["Monterey Club", 1070], ["Morning Meditation Fresh Juice", 140]],
  rubytuesday: [["Top Sirloin", 421], ["Baked Potato", 251], ["New York Cheesecake", 977], ["Petite Sirloin", 305], ["New York Strip", 563], ["Cajun Rib Eye", 707], ["Hickory Bourbon Chicken", 250], ["Chicken Bella", 351], ["Chicken Fresco", 359], ["Smoky Mountain Chicken", 517], ["Double Decker Chicken", 706], [`Half-Rack Baby-Back Ribs ${S}`, 471], [`Full-Rack Baby-Back Ribs ${S}`, 942], [`Southern Style Chicken Tender Dinner ${S}`, 948], ["Ruby's Classic Burger", 1076], ["Classic Cheeseburger", 1131], ["Bacon Cheeseburger", 1225], ["Smokehouse Burger", 1385], ["French Fries", 511], ["Mashed Potatoes", 293], ["Onion Rings", 351], ["Croutons (salad bar)", 102], ["Candied Walnuts (salad bar)", 208], ["Key Lime Cake", 766]],
  bobevans: [["Country Biscuit Breakfast", 520], ["Hashbrowns", 200], ["Banana Nut Bread", 420], ["Buttermilk Hotcakes", 1150], ["Double Blueberry Hotcakes", 1090], ["Cinnamon Supreme Hotcakes", 1070], ["Double Chocolate Hotcakes", 1120], ["Multigrain Hotcakes", 1200], ["Brioche French Toast", 830], ["Country-Fried Steak & Eggs", 540], ["Ham Biscuit Benedict", 440], ["Western Omelet", 650], ["Sunshine Skillet", 760], ["Pot Roast Hash", 580], [`Sausage Gravy ${S}`, 220], ["Home Fries", 250], ["Cup of Grits", 240], ["Country Fried Steak", 540], ["Macaroni & Cheese", 250], ["Mashed Potatoes & Country Gravy", 170], ["Baked Potato", 330], ["Dinner Rolls", 380], ["Cinnabiscuits", 710], ["Caramel Sundae", 190], ["Chocolate Chunk Cookie", 520]],
  perkins: [["Buttermilk Short Stack Pancakes", 540], ["Blueberry Muffin", 650], ["Key Lime Pie (slice)", 620], ["Blueberry Pancakes", 570], ["The Everything Omelet", 550], ["Turkey Sausage Omelet", 600], ["Granny's Country Omelet", 640], ["Farmer's Omelet", 660], ["Belgian Waffle Platter", 620], [`French Toast ${S}`, 490], ["Strawberry Croissant French Toast Platter", 760], ["Cinnamon Roll French Toast Platter", 810], ["Apple Cinnamon Muffin", 630], ["Lemon Poppy Seed Muffin", 700], ["Pumpkin Pie (slice)", 400], ["Cherry Pie (slice)", 580], ["Southern Pecan Pie (slice)", 670], ["Banana Cream Pie (slice)", 700], ["The Classic Burger", 760], ["The Classic Cheeseburger", 910], ["The Breakfast Burger", 1120], ["Grilled Salmon Dinner", 430], ["Classic Pot Roast Dinner", 560], ["Country Fried Steak Dinner", 570], ["Meatloaf Dinner", 1060]],
};

export const foodRnSitdownCustomCalculators: Record<string, CustomCalculator> = {
  "applebees-nutrition-calculator": mealCalories(MENUS.applebees),
  "chilis-nutrition-calculator": mealCalories(MENUS.chilis),
  "olive-garden-nutrition-calculator": mealCalories(MENUS.olivegarden),
  "texas-roadhouse-nutrition-calculator": mealCalories(MENUS.texasroadhouse),
  "ihop-nutrition-calculator": mealCalories(MENUS.ihop),
  "dennys-nutrition-calculator": mealCalories(MENUS.dennys),
  "cracker-barrel-nutrition-calculator": mealCalories(MENUS.crackerbarrel),
  "outback-nutrition-calculator": mealCalories(MENUS.outback),
  "longhorn-nutrition-calculator": mealCalories(MENUS.longhorn),
  "red-robin-nutrition-calculator": mealCalories(MENUS.redrobin),
  "waffle-house-nutrition-calculator": mealCalories(MENUS.wafflehouse),
  "red-lobster-nutrition-calculator": mealCalories(MENUS.redlobster),
  "p-f-changs-nutrition-calculator": mealCalories(MENUS.pfchangs),
  "first-watch-nutrition-calculator": mealCalories(MENUS.firstwatch),
  "ruby-tuesday-nutrition-calculator": mealCalories(MENUS.rubytuesday),
  "bob-evans-nutrition-calculator": mealCalories(MENUS.bobevans),
  "perkins-nutrition-calculator": mealCalories(MENUS.perkins),
};
