/**
 * Batch: "Food & Drink Calculators" → Restaurant & Fast Food Nutrition Calculators →
 * Pizza, Sub & Sandwich Nutrition Calculators.
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
 * See prisma/create-food-rn-pizza-calculators.ts for the copy.
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
  subway: [["6-inch Italian B.M.T.", 360], ["Lay's Classic Potato Chips", 230], ["Coca-Cola Classic", 260], ["Footlong Italian B.M.T.", 1080], ["6-inch Oven Roasted Turkey", 160], ["Footlong Oven Roasted Turkey", 640], ["6-inch Veggie Delite", 140], ["6-inch Black Forest Ham", 170], ["6-inch Roast Beef", 200], ["6-inch Cold Cut Combo", 280], ["6-inch Steak and Cheese", 320], ["6-inch Sweet Onion Chicken Teriyaki", 340], ["6-inch Meatball Marinara", 410], ["6-inch Tuna", 430], ["6-inch Subway Club", 460], ["6-inch Chicken & Bacon Ranch", 530], ["6-inch Chipotle Chicken and Cheese", 450], ["Footlong Meatball Marinara", 1310], ["Footlong Chicken & Bacon Ranch", 1410], ["Rotisserie-Style Chicken Caesar Wrap", 730], ["Turkey, Bacon & Guacamole Wrap", 810], ["Veggie Delite Salad", 50], ["Italian B.M.T. Salad", 230], ["Chocolate Chip Cookie", 220], ["Oatmeal Raisin Cookie", 200], ["Baked Lay's", 130], ["Doritos Nacho Cheese", 250], ["Diet Coke", 0]],
  pizzahut: [[`Hand-Tossed Pepperoni slice ${S}`, 230], [`Hand-Tossed Pepperoni slice ${L}`, 310], [`Hand-Tossed Cheese slice ${S}`, 130], [`Hand-Tossed Cheese slice ${L}`, 300], [`Hand-Tossed Meat Lover's slice ${S}`, 300], [`Pepperoni Pan slice ${S}`, 260], [`Pepperoni Pan slice ${L}`, 620], [`Supreme Pan slice ${S}`, 280], [`Meat Lover's Pan slice ${S}`, 320], [`Thin 'n Crispy Cheese slice ${S}`, 110], ["Thin 'n Crispy Pepperoni slice", 210], ["Cheese Stuffed Crust slice", 310], ["Pepperoni Stuffed Crust slice", 340], ["Breadstick (each)", 140], ["Breadstick with Cheese (each)", 170], ["Fried Cheese Sticks (4)", 380], ["All American Wing", 80], ["Buffalo Mild Wing", 110], ["Honey BBQ Wing", 140], ["Lemon Pepper Wing", 150], ["Garlic Parmesan Wing", 180], ["Chicken Alfredo Pasta", 520], ["Meaty Marinara Pasta", 450], ["Apple Pie (2 pies)", 330]],
  papajohns: [[`Pepperoni Pizza slice ${S}`, 210], [`Pepperoni Pizza slice ${L}`, 340], [`Cheese Pizza slice ${S}`, 180], [`Cheese Pizza slice ${L}`, 300], [`The Meats Pizza slice ${S}`, 240], [`The Meats Pizza slice ${L}`, 400], [`BBQ Chicken Bacon Pizza slice ${S}`, 230], [`Spicy Italian Pizza slice ${S}`, 240], ["Garlic Sauce (1 tbsp)", 75], ["Breadsticks", 290], ["Parmesan Breadsticks", 340], ["Cheesesticks", 370], ["Spicy Buffalo Wings", 170], ["BBQ Wings", 190], ["Honey Chipotle Wings", 190], [`Unsauced Boneless Wings ${S}`, 590], ["Chicken Poppers", 100], ["Italian Papadia", 940], ["Philly Cheesesteak Papadia", 810], ["Grilled Buffalo Chicken Papadia", 910], ["Grilled BBQ Chicken & Bacon Papadia", 840], ["Apple Pie", 480], ["Cinnaepie", 560], ["Twix Papa Bites", 80]],
  littlecaesars: [["Hot-N-Ready Pepperoni slice", 276], ["Crazy Bread (1 stick)", 100], ["Crazy Sauce", 30], ["Hot-N-Ready Cheese slice", 244], [`ExtraMostBestest slice ${S}`, 284], ["3 Meat Treat slice", 346], ["5 Meat Feast slice", 343], ["Ultimate Supreme slice", 303], ["Hula Hawaiian slice", 273], ["Italian Sausage slice", 284], ["Seasoned Beef slice", 344], ["Veggie slice", 281], ["Pepperoni Cheeser!Cheeser! slice", 300], ["Soft Pretzel Crust Pepperoni slice", 270], ["Stuffed Crazy Bread", 327], ["Italian Cheese Bread", 134], [`Crazy Puffs ${S}`, 580], ["Oven Roasted Caesar Wings", 510], ["Buffalo Caesar Wings", 510], ["BBQ Caesar Wings", 620], ["Garlic Parmesan Caesar Wings", 670], ["Ranch Dipping Sauce", 230], ["Buttery Garlic Dipping Sauce", 370], ["Cheezy Jalapeño Dipping Sauce", 210]],
  jerseymikes: [[`Original Italian ${S}`, 560], ["French Fries", 310], ["Lay's Classic Chips", 240], [`Original Italian ${L}`, 1780], [`Club Sub ${S}`, 640], [`Club Supreme ${S}`, 650], [`Turkey & Provolone ${S}`, 460], [`Turkey Club ${S}`, 620], [`Roast Beef & Provolone ${S}`, 530], [`Ham & Provolone ${S}`, 470], [`Number Four ${S}`, 460], [`Super Sub ${S}`, 490], [`Tuna Fish ${S}`, 600], [`Turkey & Provolone ${L}`, 1480], [`Club Sub ${L}`, 2140], ["Baked Lay's", 140], ["Sun Chips", 210], ["Cheetos", 310], ["Fritos", 320], ["Funyuns", 160]],
  jimmyjohns: [[`Turkey Tom ${S}`, 250], ["Regular Jimmy Chips", 300], ["Chocolate Chip Cookie", 410], [`Turkey Tom ${L}`, 950], [`Vito ${S}`, 350], [`Pepe ${S}`, 370], [`Big John ${S}`, 270], [`Totally Tuna ${S}`, 270], [`JJ BLT ${S}`, 360], [`Ultimate Porker ${S}`, 340], [`Veggie ${S}`, 440], [`Country Club ${S}`, 430], [`Billy Club ${S}`, 460], [`Hunter's Club ${S}`, 480], [`Beach Club ${S}`, 510], [`Italian Night Club ${S}`, 580], [`Spicy East Coast Italian ${S}`, 740], [`J.J. Gargantuan ${S}`, 730], [`Slim 4 Turkey Breast ${S}`, 70], [`Slim 1 Ham & Cheese ${S}`, 190], ["Turkey Picklewich", 190], ["Chicken Caesar Unwich", 620], ["Thinny Chips", 260], ["Oatmeal Raisin Cookie", 370], ["Fudge Chocolate Brownie", 350], ["Kickin' Ranch", 160], ["Avocado Spread", 70]],
  firehouse: [[`Turkey Sub ${S}`, 341], ["Lay's Original Chips", 240], ["Chocolate Chip Cookie", 310], [`Turkey Sub ${L}`, 1035], [`Ham Sub ${S}`, 383], [`Roast Beef Sub ${S}`, 373], [`Meatball Sub ${S}`, 462], [`Italian Sub ${S}`, 473], [`Club on a Sub ${S}`, 387], [`Cajun Chicken Sub ${S}`, 363], [`Chicken Breast Sub ${S}`, 372], [`Meatball Sub ${L}`, 1308], [`Italian Sub ${L}`, 1445], ["Firehouse Chopped Salad with Grilled Chicken", 375], ["Firehouse Chopped Salad with Turkey", 224], ["Firehouse Chopped Side Salad", 62], ["Chili Side", 180], ["Coleslaw Side", 140], ["5-Cheese Mac & Cheese", 380], ["Oatmeal Raisin Cookie", 290], ["Brownie", 430], ["Rice Krispies Treat", 45]],
  potbelly: [[`Turkey Breast ${S}`, 378], [`Chili ${S}`, 185], ["Oatmeal Chocolate Chip Cookie", 420], [`Turkey Breast ${L}`, 767], [`Italian ${S}`, 566], [`Meatball ${S}`, 473], [`Mediterranean ${S}`, 349], [`Veggie Melt ${S}`, 412], ["Hammie Skinny", 336], ["T-K-Y Skinny", 301], ["Mushroom Melt Skinny", 354], [`Italian ${L}`, 1115], ["A Wreck Salad", 635], ["Powerhouse Salad", 541], ["Clubhouse Salad", 696], ["Italian Salad", 640], [`Classic Tomato Soup ${S}`, 120], ["Chocolate Brownie Cookie", 420], ["Sugar Cookie", 500], ["Vanilla Shake with Toppings", 515], ["Chocolate Shake with Toppings", 642]],
  panera: [["Full Bacon Turkey Bravo Sandwich", 640], ["Signature Mac & Cheese (small)", 470], ["Premium Orange Juice", 160], ["Full Roasted Turkey & Avocado BLT", 690], ["Full Napa Almond Chicken Salad Sandwich", 630], ["Smoky Buffalo Chicken Melt", 830], ["Pepperoni Mozzarella Melt", 990], ["Croque Monsieur Croissant Toast", 440], ["Full Strawberry Poppyseed Salad with Chicken", 360], ["Signature Mac & Cheese (large)", 980], ["Chicken Tortellini Alfredo", 750], ["Sourdough Bread Bowl (bread only)", 670], ["Plain Bagel", 280], ["Everything Bagel", 290], ["Asiago Cheese Bagel", 320], ["Chocolate Chip Bagel", 360], ["Bear Claw", 500], ["Vanilla Cinnamon Roll", 620], ["Pumpkin Muffin", 570], ["Kitchen Sink Cookie", 800], ["Brownie", 400], ["Iced Caramel Latte", 430], ["Hot Chocolate", 380], ["Diet Pepsi", 0]],
  mcalisters: [[`Grilled Chicken Sandwich ${S}`, 282], [`Garden Salad ${S}`, 150], ["Sweet Tea", 150], [`Grilled Chicken Sandwich ${L}`, 564], [`Garden Fresh Turkey Sandwich ${S}`, 335], [`Reuben ${S}`, 450], [`The Veggie Sandwich ${S}`, 340], [`Reuben ${L}`, 899], [`Justaspud ${S}`, 360], [`Veggie Spud ${S}`, 457], [`Pecanberry Salad ${S}`, 188], [`Savannah Chopped Salad ${S}`, 236], [`Fire Roasted Vegetable Soup ${S}`, 60], ["Chocolate Chip Cookie", 370], ["Sugar Cookie", 340], ["Heath Cookie", 410], ["Brownie", 430], ["Brookie", 480]],
  schlotzskys: [[`The Original Sandwich ${S}`, 390], [`Broccoli Cheese Soup`, 185], ["Chocolate Chip Cookie", 160], [`The Original Sandwich ${L}`, 1550], [`Fresh Veggie Pizza ${S}`, 460], [`Southwestern Chicken Salad ${S}`, 300], [`Garden Salad ${S}`, 25], ["Chicken Noodle Soup", 140], ["Chicken Tortilla Soup", 315], ["Tomato Basil Soup", 322], ["Loaded Potato Soup", 385], ["French Onion Soup", 235], ["Chili Timberline Soup", 380], ["Garden Vegetable Soup", 109], ["Sugar Cookie", 160], ["Oatmeal Raisin Cookie", 150], ["Chocolate Chunk Cookie", 540], ["White Chocolate Macadamia Nut Cookie", 550]],
  whichwich: [[`Chicken Sandwich ${S}`, 370], [`Club Sandwich ${S}`, 460], [`Buffalo Chicken Sandwich ${S}`, 380], [`Chicken Pesto Sandwich ${S}`, 430], [`Corned Beef Sandwich ${S}`, 410], [`Cordon Bleu Sandwich ${S}`, 380], [`Avocado Sandwich ${S}`, 400], [`Black Bean Patty Sandwich ${S}`, 450], [`Caprese Sandwich ${S}`, 550], [`Chicken Salad Sandwich ${S}`, 920], [`Egg Salad Sandwich ${S}`, 1190], [`Chicken Sandwich ${L}`, 740], [`Club Sandwich ${L}`, 920], ["Italian Club", 700], ["Gyro", 810], ["Meatball Grinder", 1000], ["Cobb Salad Wrap", 870], ["Chocolate Shake", 880], ["Strawberry Shake", 800]],
  chickensaladchick: [["Classic Carol Chicken Salad", 400], ["Pasta Salad", 250], ["Fresh Fruit", 80], ["Barbie-Q Chicken Salad", 390], ["Buffalo Barclay Chicken Salad", 390], ["Cranberry Kelli Chicken Salad", 460], ["Dixie Chick Chicken Salad", 370], ["Fancy Nancy Chicken Salad", 410], ["Fruity Fran Chicken Salad", 340], ["Jalapeño Holly Chicken Salad", 370], ["Jazzy Julie Chicken Salad", 440], ["Kickin' Kay Lynne Chicken Salad", 380], ["Lauryn's Lemon Basil Chicken Salad", 390], ["Luau Lydia Chicken Salad", 370], ["Nutty Nana Chicken Salad", 420], ["Olivia's Old South Chicken Salad", 380], ["Sassy Scotty Chicken Salad", 450], ["Chicken Salad BLT", 760], ["Pimento Cheese BLT", 940], ["Turkey Club", 650], ["Turkey Pesto", 600], ["Broccoli Salad", 170], ["Mac 'n Cheese", 350], ["Doritos", 260]],
  cpk: [["Bolognese Spaghetti", 870], [`Caesar Salad ${S}`, 340], ["Vanilla Ice Cream", 280], ["Tomato Basil Spaghetti", 950], ["Kung Pao Spaghetti", 890], ["Chicken Tequila Fettuccine", 1210], ["Garlic Cream Fettuccine", 1260], ["Jambalaya Linguini Fini", 1230], ["Shrimp Scampi Zucchini", 480], [`Waldorf Chicken Salad ${S}`, 660], ["Petite Wedge", 270], [`Lettuce Wraps ${S}`, 430], ["Szechwan Chicken Dumplings", 340], ["Sticky Asian Cauliflower", 480], ["Spinach Artichoke Dip", 940], ["Avocado Club Egg Rolls", 1240], ["Salted Caramel Pudding", 530], ["Belgian Chocolate Soufflé Cake", 660], ["Key Lime Pie", 790], ["Red Velvet Cake", 960], ["Butter Cake", 1090]],
  newks: [[`Club Sandwich ${S}`, 453], ["Caesar Salad", 224], ["Apple Sauce", 41], [`Club Sandwich ${L}`, 907], ["Vegetarian Club Sandwich", 405], ["Spicy Southwest Caesar Sandwich", 1010], ["Greek Salad", 203], ["Ahi Tuna Salad", 326], ["Chef Salad", 412], ["Black & Bleu Salad", 538], ["Southern Salad", 595], ["Ultimate Salad", 670], ["Cobb Salad", 721], ["Favorite Salad", 740], ["Q Salad", 840], ["Margherita Pizza", 802], ["Pepperoni Pizza", 1022], ["BBQ Chicken Pizza", 1083], ["Veggie Pizza", 1217], ["Coleslaw", 226], ["Cheetos", 304], ["Caramel Cake Slice", 678], ["Chocolate Cake Slice", 825], ["Strawberry Cake Slice", 745]],
  mellowmushroom: [[`Cheese Pizza slice ${S}`, 269], [`House Salad ${S}`, 91], ["Sugar Cookie", 630], [`Cheese Pizza slice ${L}`, 351], [`House Special Pizza slice ${S}`, 392], [`House Special Pizza slice ${L}`, 499], ["Cheese Calzone", 1195], ["Chicken and Cheese Calzone", 1335], ["Steak and Cheese Calzone", 1395], ["Veggie Supreme Calzone", 1236], ["The Sausagefest Calzone", 1300], ["The Ritz Burger", 1137], ["Pizzaiola Burger", 1404], ["Bruschetta", 340], ["Hummus Dip", 140], ["Spinach Artichoke Dip", 310], ["Meatball Trio", 360], ["Magic Mushroom Soup", 350], ["Tomato Bisque", 290], [`Caesar Salad ${S}`, 418], ["Mellow Chick Salad", 420], ["Bacon Bleu Wedge Salad", 570]],
  wawa: [["Italian Hoagie (classic, ham, salami & pepperoni)", 500], [`Macaroni and Cheese ${S}`, 350], ["Regular Coffee (black)", 0], ["Shorti Roll", 240], ["Classic Roll", 350], ["Wheat Shorti Roll", 230], ["Wheat Classic Roll", 360], ["Sausage, Egg & Cheese Biscuit", 690], ["Sausage, Egg & Cheese Croissant", 550], ["Turkey Sausage, Egg & Cheese Croissant", 450], ["Bacon, Egg & Cheese Bagel", 430], ["Veggie Breakfast Bagel", 445], [`Chicken Noodle Soup ${S}`, 130], [`Chili ${S}`, 240], [`Chipotle Mac & Cheese ${S}`, 396], [`Mango Smoothie ${S}`, 420], [`Strawberry Smoothie ${S}`, 390]],
  donatos: [["Big Don Italian Sub with House Italian Dressing", 660], ["Italian Garlic Breadsticks", 280], ["Caprese Side Salad with Balsamic Vinaigrette", 220], ["Big Don Italian Sub with Marinara", 600], ["Chicken Bacon Ranch Sub", 740], ["Fresh Vegy Sub", 490], ["Ham & Smoked Provolone Sub", 560], ["Hot Chicken Sub", 840], ["Meatball Sub", 850], ["Steak Hoagie with Marinara Sauce", 640], [`Boneless Chicken Wings ${S}`, 330], [`Traditional Chicken Wings ${S}`, 380], ["Italian Side Salad with House Italian Dressing", 330], ["Chicken Caprese Entrée Salad", 400], ["Italian Chef Entrée Salad", 500], ["Chicken Harvest Entrée Salad", 600]],
};

export const foodRnPizzaCustomCalculators: Record<string, CustomCalculator> = {
  "subway-calorie-calculator": mealCalories(MENUS.subway),
  "pizza-hut-nutrition-calculator": mealCalories(MENUS.pizzahut),
  "papa-johns-nutrition-calculator": mealCalories(MENUS.papajohns),
  "little-caesars-nutrition-calculator": mealCalories(MENUS.littlecaesars),
  "jersey-mikes-nutrition-calculator": mealCalories(MENUS.jerseymikes),
  "jimmy-johns-nutrition-calculator": mealCalories(MENUS.jimmyjohns),
  "firehouse-subs-nutrition-calculator": mealCalories(MENUS.firehouse),
  "potbelly-nutrition-calculator": mealCalories(MENUS.potbelly),
  "panera-nutrition-calculator": mealCalories(MENUS.panera),
  "mcalisters-nutrition-calculator": mealCalories(MENUS.mcalisters),
  "schlotzskys-nutrition-calculator": mealCalories(MENUS.schlotzskys),
  "which-wich-calorie-calculator": mealCalories(MENUS.whichwich),
  "chicken-salad-chick-nutrition-calculator": mealCalories(MENUS.chickensaladchick),
  "california-pizza-kitchen-nutrition-calculator": mealCalories(MENUS.cpk),
  "newks-nutrition-calculator": mealCalories(MENUS.newks),
  "mellow-mushroom-nutrition-calculator": mealCalories(MENUS.mellowmushroom),
  "wawa-nutrition-calculator": mealCalories(MENUS.wawa),
  "donatos-nutrition-calculator": mealCalories(MENUS.donatos),
};
