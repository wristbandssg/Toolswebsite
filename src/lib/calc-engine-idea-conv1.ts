/**
 * Idea build, batch conv1 (18 Nov 2026 — user asked to take the site from 9,259 to 10,000 tools): dedicated two-unit converters.
 * One factory, exact definitions only — no estimated data:
 * - Length/area/volume: international yard & pound (1959; 1 in = 2.54 cm, 1 lb = 0.45359237 kg), US survey-free definitions;
 *   US liquid gallon 231 in³ = 3.785411784 L, imperial gallon 4.54609 L, US cup = ½ pint = 236.5882365 mL, tbsp = ½ fl oz, tsp = ⅓ tbsp;
 *   nautical mile 1,852 m; acre 4,046.8564224 m²; hectare 10,000 m²; oil barrel 42 US gal; acre-foot 43,560 ft³.
 * - Mass: stone 14 lb, short ton 2,000 lb, long ton 2,240 lb, grain 64.79891 mg, metric carat 200 mg, tola 180 grains (11.6638038 g).
 * - Temperature: K = °C + 273.15, °R = °F + 459.67. Speed: knot = 1,852 m/h. Pressure: atm 101,325 Pa, psi 6,894.757293168 Pa,
 *   mmHg 133.322387415 Pa, inHg 3,386.389 Pa (0 °C), inH₂O 249.08891 Pa (4 °C), torr = atm/760.
 * - Energy: thermochemical calorie 4.184 J, IT Btu 1,055.05585262 J, therm 100,000 Btu, eV 1.602176634e-19 J (SI 2019), ft·lbf
 *   1.3558179483 J. Power: mechanical hp 745.69987158 W, metric hp (PS) 735.49875 W, Btu/h 0.29307107 W, refrigeration ton 12,000 Btu/h.
 * - Data: SI prefixes (1 GB = 10⁹ bytes) and IEC binary (1 GiB = 2³⁰ bytes). Time: Gregorian average month 30.436875 d, year 365.2425 d.
 * - Fuel economy: L/100 km = 235.2145833 ÷ US mpg = 282.4809363 ÷ UK mpg = 100 ÷ km/L.
 * - Angle: NATO mil = 1/6400 turn, MOA = 1 arcminute. Force: kgf = 9.80665 N, lbf = 4.4482216152605 N, kip 1,000 lbf.
 * - Radiation: 1 Sv = 100 rem, 1 Gy = 100 rad, 1 Ci = 3.7e10 Bq.
 * SKIPPED (a live tool already converts the same pair): Kelvin↔Fahrenheit (kelvin-fahrenheit-converter), torque N·m↔ft·lb
 * (torque-conversion-calculator), light-years/parsecs (light-year-converter-calculator, parsec-converter-calculator), troy ounces
 * (troy-ounce-calculator), pennyweight (pennyweight-calculator), foot-candles↔lux (foot-candle-calculator).
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";

export type Unit = { k: string; sg: string; pl: string; sy: string; sl: string; tt: string; f?: number; to?: (x: number) => number; from?: (x: number) => number; tv?: number[]; ex?: number };
export type Dim = { note: string; u: Record<string, Unit> };

const cap = (s: string) => s.replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
/** "key|singular|plural|symbol|factor[|slug[|title]]" */
export const U = (rows: string[], extra: Record<string, Partial<Unit>> = {}): Record<string, Unit> =>
  Object.fromEntries(rows.map((r) => { const [k, sg, pl, sy, f, sl, tt] = r.split("|"); return [k, { k, sg, pl, sy, f: f ? Number(f) : undefined, sl: sl || pl.replace(/[^a-z0-9]+/gi, "-").toLowerCase(), tt: tt || cap(pl), ...extra[k] }]; }));

const L = 1e-3; // litre base for volume
export const DIMS: Record<string, Dim> = {
  len: { note: "Exact definitions: 1 inch = 2.54 cm, 1 foot = 0.3048 m, 1 yard = 0.9144 m, 1 mile = 1,609.344 m (international yard, 1959), 1 nautical mile = 1,852 m.", u: U([
    "mm|millimeter|millimeters|mm|0.001", "cm|centimeter|centimeters|cm|0.01", "m|meter|meters|m|1", "km|kilometer|kilometers|km|1000",
    "in|inch|inches|in|0.0254", "ft|foot|feet|ft|0.3048", "yd|yard|yards|yd|0.9144", "mi|mile|miles|mi|1609.344", "nmi|nautical mile|nautical miles|nmi|1852",
    "um|micrometer (micron)|micrometers|µm|1e-6|micrometers|Micrometers (Microns)", "nm|nanometer|nanometers|nm|1e-9", "ang|ångström|angstroms|Å|1e-10|angstroms|Angstroms",
    "mil|mil (thou)|mils|mil|0.0000254|mils|Mils (Thou)", "hand|hand|hands|hh|0.1016", "furlong|furlong|furlongs|fur|201.168", "chain|chain|chains|ch|20.1168",
    "rod|rod|rods|rd|5.0292", "fathom|fathom|fathoms|ftm|1.8288", "league|league|leagues|lea|4828.032", "au|astronomical unit|astronomical units|au|149597870700",
  ]) },
  area: { note: "Exact definitions: 1 ft² = 0.09290304 m², 1 acre = 43,560 ft² = 4,046.8564224 m², 1 hectare = 10,000 m², 1 mi² = 640 acres.", u: U([
    "mm2|square millimeter|square millimeters|mm²|1e-6", "cm2|square centimeter|square centimeters|cm²|1e-4", "m2|square meter|square meters|m²|1",
    "km2|square kilometer|square kilometers|km²|1e6", "in2|square inch|square inches|in²|0.00064516", "ft2|square foot|square feet|ft²|0.09290304",
    "yd2|square yard|square yards|yd²|0.83612736", "mi2|square mile|square miles|mi²|2589988.110336", "ha|hectare|hectares|ha|10000", "ac|acre|acres|ac|4046.8564224",
  ]) },
  vol: { note: "US customary liquid measures (1 US gallon = 231 in³ = 3.785411784 L) unless “imperial” is stated (1 imperial gallon = 4.54609 L). 1 cc = 1 cm³ = 1 mL.", u: U([
    "ml|milliliter|milliliters|mL|" + L, "l|liter|liters|L|1", "m3|cubic meter|cubic meters|m³|1000", "cm3|cubic centimeter|cubic centimeters|cm³|" + L, "cc|cc|cc|cc|" + L + "|cc|CC",
    "gal|US gallon|gallons|gal|3.785411784", "igal|imperial gallon|imperial gallons|imp gal|4.54609", "qt|US quart|quarts|qt|0.946352946", "pt|US pint|pints|pt|0.473176473",
    "ipt|imperial pint|imperial pints|imp pt|0.56826125|uk-pints|UK Pints", "cup|US cup|cups|cup|0.2365882365", "floz|US fluid ounce|fluid ounces|fl oz|0.0295735295625",
    "tbsp|tablespoon|tablespoons|tbsp|0.01478676478125", "tsp|teaspoon|teaspoons|tsp|0.00492892159375", "ft3|cubic foot|cubic feet|ft³|28.316846592",
    "in3|cubic inch|cubic inches|in³|0.016387064", "yd3|cubic yard|cubic yards|yd³|764.554857984", "bbl|oil barrel|barrels|bbl|158.987294928|barrels|Barrels (Oil)",
    "acft|acre-foot|acre-feet|ac·ft|1233481.83754752",
  ]) },
  wt: { note: "Exact definitions: 1 lb = 0.45359237 kg, 1 oz = 1/16 lb, 1 stone = 14 lb, 1 short ton = 2,000 lb, 1 long ton = 2,240 lb, 1 metric ton = 1,000 kg, 1 grain = 64.79891 mg, 1 carat = 200 mg, 1 tola = 180 grains.", u: U([
    "mcg|microgram|micrograms|mcg|1e-9", "mg|milligram|milligrams|mg|1e-6", "g|gram|grams|g|0.001", "kg|kilogram|kilograms|kg|1", "t|metric ton (tonne)|metric tons|t|1000|metric-tons|Metric Tons",
    "oz|ounce|ounces|oz|0.028349523125", "lb|pound|pounds|lb|0.45359237", "st|stone|stone|st|6.35029318|stone|Stone", "ston|short ton (US)|short tons|ton|907.18474|short-tons|US Short Tons",
    "lton|long ton (UK)|long tons|LT|1016.0469088|long-tons|UK Long Tons", "gr|grain|grains|gr|0.00006479891", "ct|carat|carats|ct|0.0002", "tola|tola|tolas|tola|0.0116638038",
  ]) },
  temp: { note: "K = °C + 273.15; °F = °C × 9/5 + 32; °R (Rankine) = °F + 459.67. Absolute zero is 0 K = −273.15 °C = −459.67 °F.", u: U([
    "c|degree Celsius|degrees Celsius|°C||celsius|Celsius", "f|degree Fahrenheit|degrees Fahrenheit|°F||fahrenheit|Fahrenheit", "k|kelvin|kelvins|K||kelvin|Kelvin", "r|degree Rankine|degrees Rankine|°R||rankine|Rankine",
  ], {
    c: { to: (x) => x + 273.15, from: (k) => k - 273.15, tv: [-40, -10, 0, 10, 20, 25, 30, 37, 100], ex: 25 },
    f: { to: (x) => (x + 459.67) * (5 / 9), from: (k) => k * 1.8 - 459.67, tv: [-40, 0, 32, 50, 68, 77, 98.6, 212, 350], ex: 77 },
    k: { to: (x) => x, from: (k) => k, tv: [0, 77, 200, 273.15, 293.15, 300, 373.15], ex: 300 },
    r: { to: (x) => x * (5 / 9), from: (k) => k * 1.8, tv: [0, 459.67, 491.67, 527.67, 671.67], ex: 527.67 },
  }) },
  speed: { note: "Exact definitions: 1 mph = 0.44704 m/s, 1 km/h = 1/3.6 m/s, 1 knot = 1 nautical mile (1,852 m) per hour, 1 ft/s = 0.3048 m/s.", u: U([
    "kmh|kilometer per hour|kilometers per hour|km/h|0.2777777777777778|kmh|km/h", "mph|mile per hour|miles per hour|mph|0.44704|mph|MPH", "kn|knot|knots|kn|0.5144444444444445",
    "ms|meter per second|meters per second|m/s|1", "fps|foot per second|feet per second|ft/s|0.3048",
  ]) },
  pres: { note: "1 atm = 101,325 Pa; 1 bar = 100,000 Pa; 1 psi = 6,894.757 Pa; 1 mmHg = 133.322 Pa; 1 inHg = 3,386.389 Pa (at 0 °C); 1 inH₂O = 249.089 Pa (at 4 °C); 1 torr = 1/760 atm; 1 hPa = 1 mbar.", u: U([
    "pa|pascal|pascals|Pa|1", "kpa|kilopascal|kilopascals|kPa|1000|kpa|kPa", "mpa|megapascal|megapascals|MPa|1e6|mpa|MPa", "hpa|hectopascal|hectopascals|hPa|100|hpa|hPa",
    "mbar|millibar|millibars|mbar|100|millibars", "bar|bar|bar|bar|100000|bar|Bar", "psi|psi|psi|psi|6894.757293168|psi|PSI", "atm|atmosphere|atmospheres|atm|101325|atm|Atmospheres",
    "mmhg|millimeter of mercury|mmHg|mmHg|133.322387415|mmhg|mmHg", "inhg|inch of mercury|inches of mercury|inHg|3386.389|inhg|inHg", "inh2o|inch of water|inches of water|inH₂O|249.08891|inches-of-water|Inches of Water",
    "torr|torr|torr|Torr|133.32236842105263|torr|Torr",
  ]) },
  energy: { note: "1 cal (thermochemical) = 4.184 J; 1 kcal (food Calorie) = 4,184 J; 1 kWh = 3.6 MJ; 1 Btu (IT) = 1,055.056 J; 1 therm = 100,000 Btu; 1 eV = 1.602176634 × 10⁻¹⁹ J; 1 ft·lbf = 1.3558 J.", u: U([
    "j|joule|joules|J|1", "kj|kilojoule|kilojoules|kJ|1000", "mj|megajoule|megajoules|MJ|1e6", "cal|calorie|calories|cal|4.184", "kcal|kilocalorie|kilocalories (Calories)|kcal|4184|kcal|Kcal",
    "wh|watt-hour|watt-hours|Wh|3600", "kwh|kilowatt-hour|kilowatt-hours|kWh|3600000|kwh|kWh", "btu|Btu|Btu|Btu|1055.05585262|btu|BTU", "therm|therm|therms|thm|105505585.262",
    "ev|electronvolt|electronvolts|eV|1.602176634e-19", "ftlb|foot-pound|foot-pounds|ft·lbf|1.3558179483314004", "erg|erg|ergs|erg|1e-7",
  ]) },
  power: { note: "1 mechanical horsepower = 745.7 W; 1 metric horsepower (PS) = 735.5 W; 1 Btu/h = 0.29307 W; 1 refrigeration ton = 12,000 Btu/h = 3.5169 kW.", u: U([
    "w|watt|watts|W|1", "kw|kilowatt|kilowatts|kW|1000", "hp|horsepower|horsepower|hp|745.69987158227|hp|Horsepower", "ps|metric horsepower (PS)|metric horsepower|PS|735.49875|metric-horsepower|Metric Horsepower (PS)",
    "btuh|Btu per hour|Btu per hour|Btu/h|0.29307107017222|btu-per-hour|BTU per Hour", "tr|refrigeration ton|tons of refrigeration|TR|3516.8528420666|tons-of-refrigeration|Tons of Refrigeration",
  ]) },
  data: { note: "SI (decimal) prefixes: 1 KB = 1,000 bytes, 1 MB = 10⁶, 1 GB = 10⁹, 1 TB = 10¹². IEC (binary) prefixes: 1 KiB = 1,024 bytes, 1 MiB = 2²⁰, 1 GiB = 2³⁰, 1 TiB = 2⁴⁰. 1 byte = 8 bits.", u: U([
    "bit|bit|bits|bit|0.125", "byte|byte|bytes|B|1", "kb|kilobyte|kilobytes|KB|1e3", "mb|megabyte|megabytes|MB|1e6", "gb|gigabyte|gigabytes|GB|1e9", "tb|terabyte|terabytes|TB|1e12", "pb|petabyte|petabytes|PB|1e15",
    "mib|mebibyte|mebibytes|MiB|1048576", "gib|gibibyte|gibibytes|GiB|1073741824", "tib|tebibyte|tebibytes|TiB|1099511627776",
  ]) },
  rate: { note: "Network speeds use bits (1 Mbps = 10⁶ bits/s); file transfer speeds use bytes (1 MB/s = 8 Mbps). Real downloads are slower than line speed because of protocol overhead.", u: U([
    "kbps|kilobit per second|kilobits per second|kbps|125|kbps|Kbps", "mbps|megabit per second|megabits per second|Mbps|125000|mbps|Mbps", "gbps|gigabit per second|gigabits per second|Gbps|125000000|gbps|Gbps",
    "mbs|megabyte per second|megabytes per second|MB/s|1000000|mb-per-second|MB/s",
  ]) },
  time: { note: "1 minute = 60 s, 1 hour = 3,600 s, 1 day = 86,400 s, 1 week = 7 days. Months and years use Gregorian averages: 1 year = 365.2425 days, 1 month = 30.436875 days.", u: U([
    "ms|millisecond|milliseconds|ms|0.001", "s|second|seconds|s|1", "min|minute|minutes|min|60", "h|hour|hours|h|3600", "d|day|days|d|86400", "wk|week|weeks|wk|604800",
    "mo|month|months|mo|2629746", "yr|year|years|yr|31556952",
  ]) },
  fuel: { note: "Fuel economy is inverse to fuel consumption: L/100 km = 235.215 ÷ US mpg = 282.481 ÷ UK (imperial) mpg = 100 ÷ km/L. US and UK gallons differ (3.785 L vs 4.546 L).", u: U([
    "mpg|mile per US gallon|mpg (US)|mpg|", "umpg|mile per imperial gallon|mpg (UK)|mpg UK||uk-mpg|UK MPG", "l100|liter per 100 km|liters per 100 km|L/100 km||liters-per-100km|L/100km", "kml|kilometer per liter|kilometers per liter|km/L||km-per-liter|km/L",
  ], {
    mpg: { sl: "mpg", tt: "MPG", to: (x) => 235.21458333333334 / x, from: (b) => 235.21458333333334 / b, tv: [15, 20, 25, 30, 35, 40, 50], ex: 30 },
    umpg: { to: (x) => 282.4809363318 / x, from: (b) => 282.4809363318 / b, tv: [20, 30, 40, 50, 60], ex: 40 },
    l100: { to: (x) => x, from: (b) => b, tv: [4, 5, 6, 7, 8, 10, 12, 15], ex: 7 },
    kml: { to: (x) => 100 / x, from: (b) => 100 / b, tv: [8, 10, 12, 15, 18, 20, 25], ex: 15 },
  }) },
  angle: { note: "360° = 2π radians = 400 gradians = 6,400 NATO mils; 1° = 60 arcminutes (MOA) = 3,600 arcseconds; 1 milliradian = 0.001 rad.", u: U([
    "deg|degree|degrees|°|1", "rad|radian|radians|rad|57.29577951308232", "grad|gradian|gradians|gon|0.9", "mil|NATO mil|mils (NATO)|mil|0.05625|mils|Mils",
    "arcmin|arcminute|arcminutes|′|0.016666666666666666", "arcsec|arcsecond|arcseconds|″|0.0002777777777777778", "moa|minute of angle|MOA|MOA|0.016666666666666666|moa|MOA",
    "mrad|milliradian|milliradians (MRAD)|mrad|0.05729577951308232|mrad|MRAD",
  ]) },
  force: { note: "1 kgf = 9.80665 N (standard gravity); 1 lbf = 4.4482216 N; 1 kip = 1,000 lbf; 1 dyne = 10⁻⁵ N.", u: U([
    "n|newton|newtons|N|1", "kn|kilonewton|kilonewtons|kN|1000", "lbf|pound-force|pounds-force|lbf|4.4482216152605|pounds-force|Pounds-Force", "kgf|kilogram-force|kilograms-force|kgf|9.80665|kilograms-force|Kilograms-Force",
    "kip|kip|kips|kip|4448.2216152605", "dyn|dyne|dynes|dyn|0.00001",
  ]) },
  dens: { note: "1 g/cm³ = 1 g/mL = 1 kg/L = 1,000 kg/m³; 1 lb/ft³ = 16.0185 kg/m³; 1 lb/US gal = 119.826 kg/m³.", u: U([
    "kgm3|kilogram per cubic meter|kilograms per cubic meter|kg/m³|1|kg-per-m3|kg/m³", "gcm3|gram per cubic centimeter|grams per cubic centimeter|g/cm³|1000|g-per-cm3|g/cm³",
    "lbft3|pound per cubic foot|pounds per cubic foot|lb/ft³|16.018463373960138|lb-per-ft3|lb/ft³", "lbgal|pound per US gallon|pounds per gallon|lb/gal|119.82642731689663|lb-per-gallon|lb/gal",
  ]) },
  flow: { note: "US gallons (3.785411784 L). 1 cfm = 1 ft³/min = 1.699 m³/h; 1 cfs = 448.83 gpm.", u: U([
    "lpm|liter per minute|liters per minute|L/min|0.016666666666666666|lpm|LPM", "lps|liter per second|liters per second|L/s|1|liters-per-second|L/s", "gpm|US gallon per minute|gallons per minute|gpm|0.0630901964|gpm|GPM",
    "cfm|cubic foot per minute|cubic feet per minute|cfm|0.4719474432|cfm|CFM", "cfs|cubic foot per second|cubic feet per second|cfs|28.316846592|cfs|CFS", "m3h|cubic meter per hour|cubic meters per hour|m³/h|0.2777777777777778|m3-per-hour|m³/h",
  ]) },
  freq: { note: "1 Hz = 1 cycle per second = 60 rpm; 1 rpm = 2π/60 rad/s.", u: U([
    "hz|hertz|hertz|Hz|1|hertz|Hertz", "rpm|revolution per minute|rpm|rpm|0.016666666666666666|rpm|RPM", "rads|radian per second|radians per second|rad/s|0.15915494309189535|radians-per-second|Radians per Second",
  ]) },
  rad: { note: "Exact definitions: 1 sievert (Sv) = 100 rem; 1 gray (Gy) = 100 rad; 1 curie (Ci) = 3.7 × 10¹⁰ becquerels (Bq). Dose limits and health effects depend on context — this only converts units.", u: U([
    "sv|sievert|sieverts|Sv|1", "msv|millisievert|millisieverts|mSv|0.001", "rem|rem|rem|rem|0.01|rem|Rem", "mrem|millirem|millirem|mrem|0.00001|millirem|Millirem",
  ]) },
  dose: { note: "1 gray (Gy) = 1 J/kg = 100 rad (radiation absorbed dose).", u: U(["gy|gray|grays|Gy|1", "rad|rad|rad|rad|0.01|rad|Rad"]) },
  act: { note: "1 curie (Ci) = 3.7 × 10¹⁰ becquerels (Bq) exactly; 1 Bq = one decay per second.", u: U(["bq|becquerel|becquerels|Bq|1", "ci|curie|curies|Ci|3.7e10", "mbq|megabecquerel|megabecquerels|MBq|1e6", "mci|millicurie|millicuries|mCi|3.7e7"]) },
};

/** [category slug, dimension, "a-b a-b …"] */
export const PAIRS: [string, string, string][] = [
  ["math-calculators", "len", "in-cm cm-in mm-in in-mm ft-m m-ft ft-cm cm-ft m-in in-m yd-m m-yd km-mi mi-km mi-ft ft-mi in-ft ft-in yd-ft ft-yd mm-cm cm-mm cm-m m-cm m-km km-m mm-m m-mm nmi-km km-nmi nmi-mi mi-nmi mm-ft ft-mm km-ft ft-km mi-m m-mi mi-yd yd-mi yd-cm cm-yd in-yd yd-in um-mm mm-um nm-um ang-nm nm-ang mil-mm mm-mil mil-in hand-in hand-cm furlong-mi mi-furlong chain-ft rod-ft fathom-ft ft-fathom fathom-m league-mi"],
  ["astronomy-space-calculators", "len", "au-km km-au au-mi"],
  ["math-calculators", "area", "ft2-m2 m2-ft2 ac-ha ha-ac ac-ft2 ft2-ac km2-mi2 mi2-km2 m2-ha ha-m2 in2-cm2 cm2-in2 yd2-m2 m2-yd2 ac-m2 m2-ac mi2-ac ac-mi2 ft2-yd2 yd2-ft2 ha-km2 km2-ha in2-ft2 ft2-in2 cm2-m2 m2-cm2 in2-mm2 mm2-in2 ha-ft2 ft2-ha"],
  ["math-calculators", "vol", "l-gal gal-l qt-l l-qt pt-l l-pt gal-qt qt-gal ml-l l-ml m3-l l-m3 m3-gal gal-m3 ft3-gal gal-ft3 ft3-m3 m3-ft3 yd3-m3 m3-yd3 ft3-l l-ft3 yd3-ft3 ft3-yd3 in3-l l-in3 in3-cc cc-in3 cc-ml igal-gal gal-igal igal-l l-igal bbl-gal gal-bbl bbl-l acft-gal acft-m3 ipt-ml"],
  ["baking-recipe-calculators", "vol", "cup-ml ml-cup l-cup cup-floz floz-cup floz-ml ml-floz tbsp-ml ml-tbsp tsp-ml ml-tsp tbsp-tsp tsp-tbsp cup-tbsp tbsp-cup cup-tsp floz-tbsp tbsp-floz pt-cup cup-pt qt-cup cup-qt gal-cup cup-gal l-floz"],
  ["math-calculators", "wt", "kg-lb lb-kg g-oz oz-g oz-lb lb-oz g-kg kg-g mg-g g-mg mcg-mg mg-mcg st-kg kg-st st-lb lb-st t-lb lb-t ston-kg kg-ston ston-t t-ston lton-kg lton-t ston-lb lb-ston kg-oz oz-kg lb-g g-lb t-kg kg-t mg-oz gr-mg mg-gr gr-g g-gr"],
  ["gold-silver-jewelry-calculators", "wt", "ct-g g-ct ct-mg tola-g g-tola"],
  ["earth-weather-environment-calculators", "temp", "c-f f-c c-k k-c f-r r-f c-r"],
  ["physics-calculators", "speed", "mph-kmh kmh-mph kn-mph mph-kn kn-kmh kmh-kn ms-kmh kmh-ms ms-mph mph-ms fps-mph mph-fps fps-ms ms-fps kn-ms ms-kn fps-kmh kmh-fps"],
  ["physics-calculators", "pres", "psi-bar bar-psi psi-kpa kpa-psi psi-mpa mpa-psi atm-psi psi-atm bar-kpa kpa-bar bar-atm atm-bar mmhg-kpa kpa-mmhg mmhg-psi psi-mmhg inhg-hpa hpa-inhg inhg-mbar mbar-inhg torr-pa pa-torr inh2o-pa pa-inh2o kpa-atm atm-kpa psi-pa pa-psi mmhg-atm atm-mmhg inh2o-psi psi-inh2o kpa-inhg inhg-kpa"],
  ["physics-calculators", "energy", "kcal-kj kj-kcal kwh-btu btu-kwh j-cal cal-j kwh-mj mj-kwh btu-j j-btu therm-kwh kwh-therm ev-j j-ev ftlb-j j-ftlb btu-kcal kcal-btu kwh-kcal kcal-kwh therm-btu btu-therm erg-j j-erg"],
  ["physics-calculators", "power", "hp-kw kw-hp ps-kw kw-ps hp-ps ps-hp w-hp hp-w btuh-w w-btuh kw-btuh btuh-kw"],
  ["hvac-plumbing-electrical-calculators", "power", "tr-btuh btuh-tr tr-kw kw-tr"],
  ["computer-network-it-calculators", "data", "mb-gb gb-mb gb-tb tb-gb kb-mb mb-kb pb-tb tb-pb gb-gib gib-gb tb-tib tib-tb mb-mib mib-mb bit-byte byte-bit"],
  ["computer-network-it-calculators", "rate", "mbps-mbs mbs-mbps gbps-mbps mbps-gbps kbps-mbps mbps-kbps"],
  ["math-calculators", "time", "s-min min-s min-h h-min h-d d-h d-wk wk-d wk-mo mo-wk d-mo mo-d d-yr yr-d mo-yr yr-mo s-h h-s ms-s s-ms yr-wk h-wk wk-h"],
  ["car-ownership-fuel-ev-cost-calculators", "fuel", "mpg-l100 l100-mpg mpg-umpg umpg-mpg kml-mpg mpg-kml kml-l100 l100-kml umpg-l100 l100-umpg"],
  ["math-calculators", "angle", "deg-rad rad-deg deg-grad grad-deg deg-mil mil-deg arcmin-deg deg-arcmin arcsec-deg deg-arcsec"],
  ["sports-performance-calculators", "angle", "moa-mrad mrad-moa"],
  ["physics-calculators", "force", "n-lbf lbf-n kgf-n n-kgf kn-lbf lbf-kn kip-kn kn-kip kgf-lbf lbf-kgf dyn-n n-dyn"],
  ["physics-calculators", "dens", "kgm3-lbft3 lbft3-kgm3 gcm3-kgm3 kgm3-gcm3 gcm3-lbft3 lbgal-kgm3 kgm3-lbgal lbgal-gcm3"],
  ["hvac-plumbing-electrical-calculators", "flow", "gpm-lpm lpm-gpm cfm-m3h m3h-cfm cfs-gpm gpm-cfs lps-gpm gpm-lps cfm-lps lps-cfm gpm-m3h m3h-gpm"],
  ["physics-calculators", "freq", "hz-rpm rpm-hz rads-rpm rpm-rads"],
  ["physics-calculators", "rad", "sv-rem rem-sv msv-mrem mrem-msv"],
  ["physics-calculators", "dose", "gy-rad rad-gy"],
  ["physics-calculators", "act", "ci-bq bq-ci mci-mbq mbq-mci"],
];

const toBase = (u: Unit, x: number) => (u.to ? u.to(x) : x * (u.f as number));
const fromBase = (u: Unit, b: number) => (u.from ? u.from(b) : b / (u.f as number));
const conv = (a: Unit, b: Unit, x: number) => fromBase(b, toBase(a, x));
export { conv };
export const nf = (x: number, dp = -1) => {
  if (!Number.isFinite(x)) return "—";
  if (dp >= 0) return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
  const a = Math.abs(x);
  if (a !== 0 && (a < 1e-6 || a >= 1e15)) return x.toExponential(6).replace(/\.?0+e/, "e").replace("e+", " × 10^").replace("e-", " × 10^-");
  return Number(x.toPrecision(10)).toLocaleString("en-US", { maximumFractionDigits: 10 });
};
const kind = (a: Unit, b: Unit) => (a.f !== undefined && b.f !== undefined ? "lin" : a.k === "l100" || b.k === "l100" || ["mpg", "umpg", "kml"].includes(a.k) ? "inv" : "aff");

const TF: Record<string, string> = { "c-f": "°F = °C × 9/5 + 32", "f-c": "°C = (°F − 32) × 5/9", "c-k": "K = °C + 273.15", "k-c": "°C = K − 273.15", "f-r": "°R = °F + 459.67", "r-f": "°F = °R − 459.67", "c-r": "°R = (°C + 273.15) × 9/5", "r-c": "°C = °R × 5/9 − 273.15", "f-k": "K = (°F + 459.67) × 5/9", "k-f": "°F = K × 9/5 − 459.67", "k-r": "°R = K × 9/5", "r-k": "K = °R × 5/9" };
function formula(a: Unit, b: Unit) {
  if (a.sy.startsWith("°") || b.sy.startsWith("°") || (a.k === "k" && b.k === "r") || (a.k === "r" && b.k === "k")) { const tf = TF[`${a.k}-${b.k}`]; if (tf && (a.to || b.to)) return tf; }
  const t = kind(a, b);
  if (t === "lin") { const k = conv(a, b, 1); return `${b.sy} = ${a.sy} × ${nf(k)}`; }
  if (t === "inv") { const c1 = conv(a, b, 1), c2 = conv(a, b, 2); return Math.abs(c2 - 2 * c1) < 1e-9 * Math.abs(c1) ? `${b.sy} = ${a.sy} × ${nf(c1)}` : `${b.sy} = ${nf(c1)} ÷ ${a.sy}`; }
  const c0 = conv(a, b, 0), s = conv(a, b, 1) - c0;
  return `${b.sy} = ${a.sy}${Math.abs(s - 1) < 1e-12 ? "" : ` × ${nf(s)}`}${Math.abs(c0) < 1e-12 ? "" : ` ${c0 < 0 ? "−" : "+"} ${nf(Math.abs(c0))}`}`;
}

export function makeConv(dim: string, ak: string, bk: string, D: Dim = DIMS[dim]): Calc {
  const A = D.u[ak], B = D.u[bk];
  return (v) => {
    const x = num(v.x, A.ex ?? 10), back = pick(v.d, 2) === 1, dp = [-1, 0, 1, 2, 3, 4, 6][pick(v.p, 7)];
    const [from, to] = back ? [B, A] : [A, B];
    if (dim === "fuel" && !(x > 0)) throw new InputError("Enter a fuel-economy value greater than 0.");
    const y = conv(from, to, x);
    if (!Number.isFinite(y)) throw new InputError(`${cap(from.pl)} must not be zero for this conversion.`);
    if (from.to && !from.f && dim === "temp" && toBase(from, x) < 0) throw new InputError("That is below absolute zero.");
    const tv = from.tv ?? [1, 2, 5, 10, 20, 50, 100, 1000];
    return { r: `${nf(x)}${from.sy === "°" ? "" : " "}${from.sy} = ${nf(y, dp)} ${to.sy}`, f: formula(from, to), t: tv.map((q) => `${nf(q)} ${from.sy} = ${nf(conv(from, to, q))} ${to.sy}`).join(" · "), note: D.note };
  };
}

export type ConvInfo = { cat: string; slug: string; fn: Calc; title: string; desc: string; how: string; faq: string[]; note: string; a: Unit; b: Unit; ex: number };
export const buildConvs = (pairs: [string, string, string][], dims: Record<string, Dim> = DIMS): ConvInfo[] => pairs.flatMap(([cat, dim, list]) => list.split(" ").map((p) => {
  const [ak, bk] = p.split("-"), D = dims[dim], a = D.u[ak], b = D.u[bk];
  if (!a || !b) throw new Error(`Unknown unit in ${dim}: ${p}`);
  const ex = a.ex ?? 10, k1 = conv(a, b, 1), t = kind(a, b), fwd = formula(a, b), rev = formula(b, a);
  const how = t === "lin" ? `1 ${a.sg} = ${nf(k1)} ${b.pl}, so multiply the number of ${a.pl} by ${nf(k1)}: ${fwd}.` : `Use ${fwd}. Going the other way: ${rev}.`;
  return {
    cat, a, b, ex, note: D.note, fn: makeConv(dim, ak, bk, D), slug: `${a.sl}-to-${b.sl}-converter`, title: `${a.tt} to ${b.tt} Converter`,
    desc: `Convert ${a.pl} (${a.sy}) to ${b.pl} (${b.sy}) instantly — with the exact formula and a quick conversion table.`,
    how,
    faq: t === "lin"
      ? [`How many ${b.pl} are in one ${a.sg}?`, `One ${a.sg} equals ${nf(k1)} ${b.pl}.`, `How do I convert ${b.pl} back to ${a.pl}?`, `Divide by ${nf(k1)} — or multiply by ${nf(1 / k1)}. Use the direction switch to convert automatically.`, `What is ${nf(ex)} ${a.sy} in ${b.sy}?`, `${nf(ex)} ${a.sy} = ${nf(conv(a, b, ex))} ${b.sy}.`]
      : [`What is the formula to convert ${a.pl} to ${b.pl}?`, `${fwd}.`, `How do I convert ${b.pl} back to ${a.pl}?`, `${rev}.`, `What is ${nf(ex)} ${a.sy} in ${b.sy}?`, `${nf(ex)} ${a.sy} = ${nf(conv(a, b, ex))} ${b.sy}.`],
  };
}));
export const CONVS = buildConvs(PAIRS);
export const convCalcs: Record<string, Calc> = Object.fromEntries(CONVS.map((c) => [c.slug, c.fn]));

// ---- registry (generated)
export const ideaConv1CustomCalculators: Record<string, Calc> = {
  ...convCalcs,

};
