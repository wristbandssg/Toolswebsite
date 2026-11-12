/**
 * Shared helpers for the Travel Calculators engines (calc-engine-trv-*.ts).
 *
 * - A built-in place table (major world and US cities, airports by IATA code, sea ports) so users
 *   can type "London", "JFK" or "Singapore port" — or plain coordinates "40.71, -74.01".
 *   There is no live maps/routing service: road distance = great-circle distance × a road factor
 *   (1.2 by default, editable), which is how the tools say they estimate.
 * - Great-circle (haversine) distance, initial bearing and geographic midpoint.
 * - HH:MM time parsing/formatting and day-number helpers (date inputs arrive as whole days since
 *   1970-01-01 UTC, the CalculatorWidget convention).
 *
 * Utility module only: every trv batch keeps its own formulas and fare tables.
 */

import { InputError, txt, num, pos, pick, fmt, sig, type Vals, type Out } from "./sci-math-core";

export { InputError, txt, num, pos, pick, fmt, sig };
export type { Vals, Out };
export type TrvCalculator = (values: Vals) => Out;

export const R_MI = 3958.7613, R_KM = 6371.0088, KM_PER_MI = 1.609344, NM_PER_KM = 1 / 1.852;
export const RAD = Math.PI / 180;
/** Round to 2 dp (money). */
export const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : 0);
export const r1 = (x: number) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : 0);
export const r0 = (x: number) => (Number.isFinite(x) ? Math.round(x) : 0);
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// ------------------------------------------------------------------ places
export interface Place { name: string; lat: number; lon: number; kind: "city" | "airport" | "port"; code?: string }

// City list: [name, lat, lon]. Coordinates are city centres (± ~2 km).
const CITIES: [string, number, number][] = [
  // United States
  ["New York, NY", 40.7128, -74.006], ["Los Angeles, CA", 34.0522, -118.2437], ["Chicago, IL", 41.8781, -87.6298], ["Houston, TX", 29.7604, -95.3698],
  ["Phoenix, AZ", 33.4484, -112.074], ["Philadelphia, PA", 39.9526, -75.1652], ["San Antonio, TX", 29.4241, -98.4936], ["San Diego, CA", 32.7157, -117.1611],
  ["Dallas, TX", 32.7767, -96.797], ["Austin, TX", 30.2672, -97.7431], ["San Jose, CA", 37.3382, -121.8863], ["Jacksonville, FL", 30.3322, -81.6557],
  ["Fort Worth, TX", 32.7555, -97.3308], ["Columbus, OH", 39.9612, -82.9988], ["Charlotte, NC", 35.2271, -80.8431], ["Indianapolis, IN", 39.7684, -86.1581],
  ["San Francisco, CA", 37.7749, -122.4194], ["Seattle, WA", 47.6062, -122.3321], ["Denver, CO", 39.7392, -104.9903], ["Washington, DC", 38.9072, -77.0369],
  ["Nashville, TN", 36.1627, -86.7816], ["Oklahoma City, OK", 35.4676, -97.5164], ["El Paso, TX", 31.7619, -106.485], ["Boston, MA", 42.3601, -71.0589],
  ["Portland, OR", 45.5152, -122.6784], ["Las Vegas, NV", 36.1699, -115.1398], ["Detroit, MI", 42.3314, -83.0458], ["Memphis, TN", 35.1495, -90.049],
  ["Louisville, KY", 38.2527, -85.7585], ["Baltimore, MD", 39.2904, -76.6122], ["Milwaukee, WI", 43.0389, -87.9065], ["Albuquerque, NM", 35.0844, -106.6504],
  ["Tucson, AZ", 32.2226, -110.9747], ["Fresno, CA", 36.7378, -119.7871], ["Sacramento, CA", 38.5816, -121.4944], ["Kansas City, MO", 39.0997, -94.5786],
  ["Atlanta, GA", 33.749, -84.388], ["Miami, FL", 25.7617, -80.1918], ["Orlando, FL", 28.5383, -81.3792], ["Tampa, FL", 27.9506, -82.4572],
  ["Raleigh, NC", 35.7796, -78.6382], ["Omaha, NE", 41.2565, -95.9345], ["Minneapolis, MN", 44.9778, -93.265], ["Cleveland, OH", 41.4993, -81.6944],
  ["Cincinnati, OH", 39.1031, -84.512], ["Pittsburgh, PA", 40.4406, -79.9959], ["St. Louis, MO", 38.627, -90.1994], ["New Orleans, LA", 29.9511, -90.0715],
  ["Salt Lake City, UT", 40.7608, -111.891], ["Honolulu, HI", 21.3069, -157.8583], ["Anchorage, AK", 61.2181, -149.9003], ["Buffalo, NY", 42.8864, -78.8784],
  ["Albany, NY", 42.6526, -73.7562], ["Newark, NJ", 40.7357, -74.1724], ["Atlantic City, NJ", 39.3643, -74.4229], ["Harrisburg, PA", 40.2732, -76.8867],
  ["Richmond, VA", 37.5407, -77.436], ["Norfolk, VA", 36.8508, -76.2859], ["Charleston, SC", 32.7765, -79.9311], ["Savannah, GA", 32.0809, -81.0912],
  ["Birmingham, AL", 33.5186, -86.8104], ["Little Rock, AR", 34.7465, -92.2896], ["Des Moines, IA", 41.5868, -93.625], ["Madison, WI", 43.0731, -89.4012],
  ["Green Bay, WI", 44.5133, -88.0133], ["Boise, ID", 43.615, -116.2023], ["Spokane, WA", 47.6588, -117.426], ["Reno, NV", 39.5296, -119.8138],
  ["Cheyenne, WY", 41.14, -104.8202], ["Billings, MT", 45.7833, -108.5007], ["Fargo, ND", 46.8772, -96.7898], ["Sioux Falls, SD", 43.5446, -96.7311],
  ["Wichita, KS", 37.6872, -97.3301], ["Tulsa, OK", 36.154, -95.9928], ["Portland, ME", 43.6591, -70.2568], ["Burlington, VT", 44.4759, -73.2121],
  ["Manchester, NH", 42.9956, -71.4548], ["Hartford, CT", 41.7658, -72.6734], ["Providence, RI", 41.824, -71.4128], ["Springfield, MA", 42.1015, -72.5898],
  ["Cumberland, MD", 39.6529, -78.7625], ["Olathe, KS", 38.8814, -94.8191], ["Key West, FL", 24.5551, -81.78], ["Asheville, NC", 35.5951, -82.5515],
  ["Colorado Springs, CO", 38.8339, -104.8214], ["Santa Fe, NM", 35.687, -105.9378], ["Lexington, KY", 38.0406, -84.5037], ["Knoxville, TN", 35.9606, -83.9207],
  ["Chattanooga, TN", 35.0456, -85.3097], ["Greenville, SC", 34.8526, -82.394], ["Columbia, SC", 34.0007, -81.0348], ["Jackson, MS", 32.2988, -90.1848],
  ["Mobile, AL", 30.6954, -88.0399], ["Pensacola, FL", 30.4213, -87.2169], ["Tallahassee, FL", 30.4383, -84.2807], ["Fort Lauderdale, FL", 26.1224, -80.1373],
  ["West Palm Beach, FL", 26.7153, -80.0534], ["Corpus Christi, TX", 27.8006, -97.3964], ["Lubbock, TX", 33.5779, -101.8552], ["Amarillo, TX", 35.222, -101.8313],
  ["Bakersfield, CA", 35.3733, -119.0187], ["Palm Springs, CA", 33.8303, -116.5453], ["Santa Barbara, CA", 34.4208, -119.6982], ["Monterey, CA", 36.6002, -121.8947],
  ["Eugene, OR", 44.0521, -123.0868], ["Flagstaff, AZ", 35.1983, -111.6513], ["Rapid City, SD", 44.0805, -103.231], ["Duluth, MN", 46.7867, -92.1005],
  ["Grand Rapids, MI", 42.9634, -85.6681], ["Ann Arbor, MI", 42.2808, -83.743], ["Toledo, OH", 41.6528, -83.5379], ["Akron, OH", 41.0814, -81.519],
  ["Erie, PA", 42.1292, -80.0851], ["Scranton, PA", 41.4089, -75.6624], ["Allentown, PA", 40.6084, -75.4902], ["Trenton, NJ", 40.2171, -74.7429],
  ["Wilmington, DE", 39.7391, -75.5398], ["Syracuse, NY", 43.0481, -76.1474], ["Rochester, NY", 43.1566, -77.6088], ["New Haven, CT", 41.3083, -72.9279],
  ["Worcester, MA", 42.2626, -71.8023], ["Jersey City, NJ", 40.7178, -74.0431], ["Long Beach, CA", 33.7701, -118.1937], ["Oakland, CA", 37.8044, -122.2712],
  ["Orlando Walt Disney World, FL", 28.3852, -81.5639], ["Anaheim Disneyland, CA", 33.8121, -117.919], ["Grand Canyon Village, AZ", 36.0544, -112.1401], ["Yellowstone (Old Faithful), WY", 44.4605, -110.8281],
  // Canada & Mexico & Caribbean
  ["Toronto, ON", 43.6532, -79.3832], ["Montreal, QC", 45.5017, -73.5673], ["Vancouver, BC", 49.2827, -123.1207], ["Calgary, AB", 51.0447, -114.0719],
  ["Edmonton, AB", 53.5461, -113.4938], ["Ottawa, ON", 45.4215, -75.6972], ["Winnipeg, MB", 49.8951, -97.1384], ["Quebec City, QC", 46.8139, -71.208],
  ["Halifax, NS", 44.6488, -63.5752], ["Mexico City", 19.4326, -99.1332], ["Cancun", 21.1619, -86.8515], ["Guadalajara", 20.6597, -103.3496],
  ["Kingston, Jamaica", 17.9712, -76.7936], ["Montego Bay, Jamaica", 18.4762, -77.8939], ["Havana", 23.1136, -82.3666], ["San Juan, Puerto Rico", 18.4655, -66.1057],
  // Europe
  ["London", 51.5074, -0.1278], ["Manchester", 53.4808, -2.2426], ["Birmingham, UK", 52.4862, -1.8904], ["Edinburgh", 55.9533, -3.1883],
  ["Glasgow", 55.8642, -4.2518], ["Dublin", 53.3498, -6.2603], ["Paris", 48.8566, 2.3522], ["Lyon", 45.764, 4.8357],
  ["Marseille", 43.2965, 5.3698], ["Nice", 43.7102, 7.262], ["Bordeaux", 44.8378, -0.5792], ["Brussels", 50.8503, 4.3517],
  ["Amsterdam", 52.3676, 4.9041], ["Berlin", 52.52, 13.405], ["Munich", 48.1351, 11.582], ["Frankfurt", 50.1109, 8.6821],
  ["Hamburg", 53.5511, 9.9937], ["Cologne", 50.9375, 6.9603], ["Zurich", 47.3769, 8.5417], ["Geneva", 46.2044, 6.1432],
  ["Vienna", 48.2082, 16.3738], ["Salzburg", 47.8095, 13.055], ["Prague", 50.0755, 14.4378], ["Budapest", 47.4979, 19.0402],
  ["Warsaw", 52.2297, 21.0122], ["Krakow", 50.0647, 19.945], ["Copenhagen", 55.6761, 12.5683], ["Stockholm", 59.3293, 18.0686],
  ["Oslo", 59.9139, 10.7522], ["Helsinki", 60.1699, 24.9384], ["Madrid", 40.4168, -3.7038], ["Barcelona", 41.3874, 2.1686],
  ["Seville", 37.3891, -5.9845], ["Valencia", 39.4699, -0.3763], ["Santiago de Compostela", 42.8782, -8.5448], ["Lisbon", 38.7223, -9.1393],
  ["Porto", 41.1579, -8.6291], ["Rome", 41.9028, 12.4964], ["Milan", 45.4642, 9.19], ["Venice", 45.4408, 12.3155],
  ["Florence", 43.7696, 11.2558], ["Naples", 40.8518, 14.2681], ["Athens", 37.9838, 23.7275], ["Istanbul", 41.0082, 28.9784],
  ["Ljubljana", 46.0569, 14.5058], ["Zagreb", 45.815, 15.9819], ["Split", 43.5081, 16.4402], ["Bratislava", 48.1486, 17.1077],
  ["Bucharest", 44.4268, 26.1025], ["Sofia", 42.6977, 23.3219], ["Reykjavik", 64.1466, -21.9426], ["Moscow", 55.7558, 37.6173],
  ["Saint-Jean-Pied-de-Port", 43.1636, -1.2376], ["Luxembourg", 49.6116, 6.1319], ["Monaco", 43.7384, 7.4246], ["Edinburgh Airport area", 55.95, -3.36],
  // Middle East & Africa
  ["Dubai", 25.2048, 55.2708], ["Abu Dhabi", 24.4539, 54.3773], ["Doha", 25.2854, 51.531], ["Riyadh", 24.7136, 46.6753],
  ["Jeddah", 21.4858, 39.1925], ["Tel Aviv", 32.0853, 34.7818], ["Amman", 31.9454, 35.9284], ["Cairo", 30.0444, 31.2357],
  ["Marrakech", 31.6295, -7.9811], ["Casablanca", 33.5731, -7.5898], ["Nairobi", -1.2921, 36.8219], ["Lagos", 6.5244, 3.3792],
  ["Accra", 5.6037, -0.187], ["Johannesburg", -26.2041, 28.0473], ["Cape Town", -33.9249, 18.4241], ["Durban", -29.8587, 31.0218],
  ["Addis Ababa", 8.9806, 38.7578],
  // Asia
  ["Tokyo", 35.6762, 139.6503], ["Osaka", 34.6937, 135.5023], ["Kyoto", 35.0116, 135.7681], ["Hiroshima", 34.3853, 132.4553],
  ["Sapporo", 43.0618, 141.3545], ["Nagoya", 35.1815, 136.9066], ["Fukuoka", 33.5904, 130.4017], ["Nara", 34.6851, 135.8048],
  ["Kanazawa", 36.5613, 136.6562], ["Sendai", 38.2682, 140.8694], ["Seoul", 37.5665, 126.978], ["Busan", 35.1796, 129.0756],
  ["Beijing", 39.9042, 116.4074], ["Shanghai", 31.2304, 121.4737], ["Guangzhou", 23.1291, 113.2644], ["Shenzhen", 22.5431, 114.0579],
  ["Hong Kong", 22.3193, 114.1694], ["Macau", 22.1987, 113.5439], ["Taipei", 25.033, 121.5654], ["Manila", 14.5995, 120.9842],
  ["Singapore", 1.3521, 103.8198], ["Kuala Lumpur", 3.139, 101.6869], ["Penang (George Town)", 5.4141, 100.3288], ["Bangkok", 13.7563, 100.5018],
  ["Phuket", 7.8804, 98.3923], ["Chiang Mai", 18.7883, 98.9853], ["Hanoi", 21.0278, 105.8342], ["Ho Chi Minh City", 10.8231, 106.6297],
  ["Jakarta", -6.2088, 106.8456], ["Bali (Denpasar)", -8.6705, 115.2126], ["Mumbai", 19.076, 72.8777], ["Delhi", 28.6139, 77.209],
  ["Bangalore", 12.9716, 77.5946], ["Chennai", 13.0827, 80.2707], ["Kolkata", 22.5726, 88.3639], ["Hyderabad", 17.385, 78.4867],
  ["Goa (Panaji)", 15.4909, 73.8278], ["Dhaka", 23.8103, 90.4125], ["Chittagong", 22.3569, 91.7832], ["Kathmandu", 27.7172, 85.324],
  ["Colombo", 6.9271, 79.8612], ["Male", 4.1755, 73.5093], ["Karachi", 24.8607, 67.0011], ["Lahore", 31.5204, 74.3587],
  ["Islamabad", 33.6844, 73.0479],
  // Oceania & South America
  ["Sydney", -33.8688, 151.2093], ["Melbourne", -37.8136, 144.9631], ["Brisbane", -27.4698, 153.0251], ["Perth", -31.9505, 115.8605],
  ["Adelaide", -34.9285, 138.6007], ["Gold Coast", -28.0167, 153.4], ["Cairns", -16.9186, 145.7781], ["Auckland", -36.8485, 174.7633],
  ["Wellington", -41.2865, 174.7762], ["Queenstown", -45.0312, 168.6626], ["Christchurch", -43.532, 172.6306], ["Fiji (Nadi)", -17.7765, 177.4356],
  ["Sao Paulo", -23.5505, -46.6333], ["Rio de Janeiro", -22.9068, -43.1729], ["Buenos Aires", -34.6037, -58.3816], ["Santiago", -33.4489, -70.6693],
  ["Lima", -12.0464, -77.0428], ["Bogota", 4.711, -74.0721], ["Cusco", -13.532, -71.9675], ["Panama City", 8.9824, -79.5199],
];

// Airports: [IATA, city/name, lat, lon]
const AIRPORTS: [string, string, number, number][] = [
  ["ATL", "Atlanta Hartsfield-Jackson", 33.6407, -84.4277], ["LAX", "Los Angeles", 33.9416, -118.4085], ["ORD", "Chicago O'Hare", 41.9742, -87.9073], ["DFW", "Dallas/Fort Worth", 32.8998, -97.0403],
  ["DEN", "Denver", 39.8561, -104.6737], ["JFK", "New York JFK", 40.6413, -73.7781], ["LGA", "New York LaGuardia", 40.7769, -73.874], ["EWR", "Newark", 40.6895, -74.1745],
  ["SFO", "San Francisco", 37.6213, -122.379], ["SEA", "Seattle-Tacoma", 47.4502, -122.3088], ["LAS", "Las Vegas Harry Reid", 36.084, -115.1537], ["MCO", "Orlando", 28.4312, -81.3081],
  ["MIA", "Miami", 25.7959, -80.287], ["CLT", "Charlotte", 35.214, -80.9431], ["PHX", "Phoenix Sky Harbor", 33.4342, -112.0116], ["IAH", "Houston Bush", 29.9902, -95.3368],
  ["HOU", "Houston Hobby", 29.6454, -95.2789], ["BOS", "Boston Logan", 42.3656, -71.0096], ["MSP", "Minneapolis-St Paul", 44.8848, -93.2223], ["DTW", "Detroit", 42.2162, -83.3554],
  ["FLL", "Fort Lauderdale", 26.0742, -80.1506], ["PHL", "Philadelphia", 39.8744, -75.2424], ["BWI", "Baltimore/Washington", 39.1774, -76.6684], ["DCA", "Washington Reagan", 38.8512, -77.0402],
  ["IAD", "Washington Dulles", 38.9531, -77.4565], ["SLC", "Salt Lake City", 40.7899, -111.9791], ["SAN", "San Diego", 32.7338, -117.1933], ["TPA", "Tampa", 27.9755, -82.5332],
  ["PDX", "Portland", 45.5898, -122.5951], ["HNL", "Honolulu", 21.3245, -157.9251], ["AUS", "Austin", 30.1975, -97.6664], ["BNA", "Nashville", 36.1263, -86.6774],
  ["MDW", "Chicago Midway", 41.7868, -87.7522], ["DAL", "Dallas Love Field", 32.8471, -96.8518], ["OAK", "Oakland", 37.7126, -122.2197], ["SJC", "San Jose", 37.3639, -121.9289],
  ["STL", "St. Louis", 38.7499, -90.37], ["MSY", "New Orleans", 29.9934, -90.258], ["RDU", "Raleigh-Durham", 35.8801, -78.788], ["ANC", "Anchorage", 61.1743, -149.9963],
  ["TEB", "Teterboro", 40.8501, -74.0608], ["VNY", "Van Nuys", 34.2098, -118.49], ["PBI", "West Palm Beach", 26.6832, -80.0956], ["HPN", "White Plains Westchester", 41.067, -73.7076],
  ["OPF", "Miami Opa-locka", 25.907, -80.278], ["SDL", "Scottsdale", 33.6229, -111.9105], ["ASE", "Aspen", 39.2232, -106.8688], ["EGE", "Vail/Eagle", 39.6426, -106.9177],
  ["LGB", "Long Beach", 33.8177, -118.1516], ["SNA", "Orange County John Wayne", 33.6757, -117.8682], ["BUR", "Burbank", 34.2007, -118.3587], ["SMF", "Sacramento", 38.6954, -121.5908],
  ["PIT", "Pittsburgh", 40.4915, -80.2329], ["CLE", "Cleveland", 41.4117, -81.8498], ["CMH", "Columbus", 39.998, -82.8919], ["IND", "Indianapolis", 39.7173, -86.2944],
  ["MCI", "Kansas City", 39.2976, -94.7139], ["CVG", "Cincinnati", 39.0489, -84.6678], ["JAX", "Jacksonville", 30.4941, -81.6879], ["RSW", "Fort Myers", 26.5362, -81.7552],
  ["SAT", "San Antonio", 29.5337, -98.4698], ["OGG", "Maui Kahului", 20.8986, -156.4305], ["LTN", "London Luton", 51.8747, -0.3683], ["FAB", "Farnborough", 51.2758, -0.7763],
  ["LBG", "Paris Le Bourget", 48.9694, 2.4414], ["HTO", "East Hampton", 40.9596, -72.2518], ["ACY", "Atlantic City", 39.4576, -74.5772], ["MSN", "Madison", 43.1399, -89.3375],
  ["YYZ", "Toronto Pearson", 43.6777, -79.6248], ["YVR", "Vancouver", 49.1967, -123.1815], ["YUL", "Montreal", 45.4706, -73.7408], ["YYC", "Calgary", 51.1215, -114.0076],
  ["YOW", "Ottawa", 45.3225, -75.6692], ["MEX", "Mexico City", 19.4361, -99.0719], ["CUN", "Cancun", 21.0365, -86.877], ["MBJ", "Montego Bay", 18.5037, -77.9134],
  ["KIN", "Kingston", 17.9357, -76.7875], ["SJU", "San Juan", 18.4394, -66.0018], ["GRU", "Sao Paulo Guarulhos", -23.4356, -46.4731], ["GIG", "Rio de Janeiro", -22.8099, -43.2506],
  ["EZE", "Buenos Aires Ezeiza", -34.8222, -58.5358], ["SCL", "Santiago", -33.393, -70.7858], ["LIM", "Lima", -12.0219, -77.1143], ["BOG", "Bogota", 4.7016, -74.1469],
  ["LHR", "London Heathrow", 51.47, -0.4543], ["LGW", "London Gatwick", 51.1537, -0.1821], ["STN", "London Stansted", 51.886, 0.2389], ["MAN", "Manchester", 53.3537, -2.275],
  ["EDI", "Edinburgh", 55.95, -3.3725], ["DUB", "Dublin", 53.4264, -6.2499], ["CDG", "Paris Charles de Gaulle", 49.0097, 2.5479], ["ORY", "Paris Orly", 48.7262, 2.3652],
  ["AMS", "Amsterdam Schiphol", 52.3105, 4.7683], ["FRA", "Frankfurt", 50.0379, 8.5622], ["MUC", "Munich", 48.3538, 11.7861], ["BER", "Berlin Brandenburg", 52.3667, 13.5033],
  ["ZRH", "Zurich", 47.4582, 8.5555], ["GVA", "Geneva", 46.2381, 6.109], ["VIE", "Vienna", 48.1103, 16.5697], ["BRU", "Brussels", 50.901, 4.4856],
  ["CPH", "Copenhagen", 55.618, 12.656], ["ARN", "Stockholm Arlanda", 59.6498, 17.9238], ["OSL", "Oslo", 60.1976, 11.1004], ["HEL", "Helsinki", 60.3172, 24.9633],
  ["MAD", "Madrid Barajas", 40.4983, -3.5676], ["BCN", "Barcelona", 41.2974, 2.0833], ["LIS", "Lisbon", 38.7742, -9.1342], ["FCO", "Rome Fiumicino", 41.8003, 12.2389],
  ["CIA", "Rome Ciampino", 41.7994, 12.5949], ["MXP", "Milan Malpensa", 45.6306, 8.7281], ["VCE", "Venice", 45.5053, 12.3519], ["ATH", "Athens", 37.9364, 23.9445],
  ["IST", "Istanbul", 41.2753, 28.7519], ["SAW", "Istanbul Sabiha Gokcen", 40.8986, 29.3092], ["WAW", "Warsaw", 52.1657, 20.9671], ["PRG", "Prague", 50.1008, 14.26],
  ["BUD", "Budapest", 47.4369, 19.2556], ["KEF", "Reykjavik Keflavik", 63.985, -22.6056], ["NCE", "Nice", 43.6584, 7.2159], ["DXB", "Dubai", 25.2532, 55.3657],
  ["AUH", "Abu Dhabi", 24.433, 54.6511], ["DOH", "Doha Hamad", 25.2731, 51.6081], ["RUH", "Riyadh", 24.9576, 46.6988], ["JED", "Jeddah", 21.6796, 39.1565],
  ["TLV", "Tel Aviv", 32.0055, 34.8854], ["CAI", "Cairo", 30.1219, 31.4056], ["JNB", "Johannesburg", -26.1367, 28.2411], ["CPT", "Cape Town", -33.9715, 18.6021],
  ["NBO", "Nairobi", -1.3192, 36.9278], ["ADD", "Addis Ababa", 8.9779, 38.7993], ["LOS", "Lagos", 6.5774, 3.3212], ["CMN", "Casablanca", 33.3675, -7.5898],
  ["HND", "Tokyo Haneda", 35.5494, 139.7798], ["NRT", "Tokyo Narita", 35.772, 140.3929], ["KIX", "Osaka Kansai", 34.4347, 135.244], ["ITM", "Osaka Itami", 34.7855, 135.4382],
  ["CTS", "Sapporo New Chitose", 42.7752, 141.6923], ["FUK", "Fukuoka", 33.5859, 130.4511], ["ICN", "Seoul Incheon", 37.4602, 126.4407], ["PEK", "Beijing Capital", 40.0799, 116.6031],
  ["PVG", "Shanghai Pudong", 31.1443, 121.8083], ["CAN", "Guangzhou", 23.3924, 113.2988], ["HKG", "Hong Kong", 22.308, 113.9185], ["TPE", "Taipei Taoyuan", 25.0797, 121.2342],
  ["MNL", "Manila", 14.5086, 121.0198], ["SIN", "Singapore Changi", 1.3644, 103.9915], ["KUL", "Kuala Lumpur", 2.7456, 101.7072], ["BKK", "Bangkok Suvarnabhumi", 13.69, 100.7501],
  ["DMK", "Bangkok Don Mueang", 13.9126, 100.6067], ["HKT", "Phuket", 8.1132, 98.3169], ["SGN", "Ho Chi Minh City", 10.8188, 106.6519], ["HAN", "Hanoi", 21.2187, 105.8042],
  ["CGK", "Jakarta", -6.1256, 106.6559], ["DPS", "Bali Denpasar", -8.7482, 115.1675], ["BOM", "Mumbai", 19.0896, 72.8656], ["DEL", "Delhi", 28.5562, 77.1],
  ["BLR", "Bengaluru", 13.1986, 77.7066], ["MAA", "Chennai", 12.9941, 80.1709], ["HYD", "Hyderabad", 17.2403, 78.4294], ["CCU", "Kolkata", 22.6547, 88.4467],
  ["DAC", "Dhaka", 23.8433, 90.3978], ["CMB", "Colombo", 7.1808, 79.8841], ["MLE", "Male", 4.1918, 73.529], ["KTM", "Kathmandu", 27.6966, 85.3591],
  ["KHI", "Karachi", 24.9065, 67.1608], ["SYD", "Sydney", -33.9399, 151.1753], ["MEL", "Melbourne", -37.669, 144.841], ["BNE", "Brisbane", -27.3842, 153.1175],
  ["PER", "Perth", -31.9385, 115.9672], ["ADL", "Adelaide", -34.945, 138.5306], ["AKL", "Auckland", -37.0082, 174.785], ["WLG", "Wellington", -41.3272, 174.8053],
  ["CHC", "Christchurch", -43.4894, 172.5322], ["ZQN", "Queenstown", -45.0211, 168.7392], ["NAN", "Nadi", -17.7554, 177.4431], ["OOL", "Gold Coast", -28.1644, 153.5047],
];

// Sea ports: [name, lat, lon] (harbour approaches).
const PORTS: [string, number, number][] = [
  ["Shanghai", 31.23, 121.49], ["Singapore", 1.26, 103.84], ["Ningbo", 29.87, 121.85], ["Shenzhen", 22.48, 113.88], ["Guangzhou", 22.77, 113.6],
  ["Busan", 35.1, 129.04], ["Hong Kong", 22.29, 114.16], ["Qingdao", 36.07, 120.32], ["Tianjin", 38.98, 117.75], ["Kaohsiung", 22.61, 120.28],
  ["Tokyo", 35.6, 139.79], ["Yokohama", 35.45, 139.66], ["Kobe", 34.68, 135.2], ["Port Klang", 3.0, 101.39], ["Tanjung Pelepas", 1.36, 103.55],
  ["Laem Chabang", 13.08, 100.88], ["Ho Chi Minh City", 10.77, 106.71], ["Manila", 14.6, 120.95], ["Jakarta (Tanjung Priok)", -6.1, 106.88], ["Colombo", 6.95, 79.84],
  ["Chittagong", 22.31, 91.8], ["Mumbai (Nhava Sheva)", 18.95, 72.95], ["Chennai", 13.1, 80.3], ["Karachi", 24.84, 66.98], ["Jebel Ali (Dubai)", 25.01, 55.06],
  ["Dammam", 26.5, 50.2], ["Jeddah", 21.47, 39.17], ["Salalah", 16.94, 54.0], ["Port Said", 31.26, 32.3], ["Piraeus", 37.94, 23.63],
  ["Istanbul (Ambarli)", 40.97, 28.69], ["Valencia", 39.44, -0.32], ["Barcelona", 41.35, 2.16], ["Algeciras", 36.13, -5.43], ["Genoa", 44.4, 8.92],
  ["Marseille", 43.33, 5.35], ["Lisbon", 38.7, -9.15], ["Rotterdam", 51.95, 4.14], ["Antwerp", 51.27, 4.33], ["Hamburg", 53.54, 9.97],
  ["Bremerhaven", 53.56, 8.55], ["Le Havre", 49.48, 0.12], ["Felixstowe", 51.95, 1.32], ["Southampton", 50.9, -1.4], ["Gothenburg", 57.69, 11.86],
  ["Gdansk", 54.4, 18.67], ["St. Petersburg", 59.88, 30.21], ["New York/New Jersey", 40.67, -74.04], ["Savannah", 32.08, -81.09], ["Charleston", 32.78, -79.92],
  ["Norfolk", 36.9, -76.33], ["Miami", 25.77, -80.17], ["Houston", 29.73, -95.27], ["New Orleans", 29.93, -90.06], ["Los Angeles/Long Beach", 33.74, -118.26],
  ["Oakland", 37.8, -122.32], ["Seattle", 47.58, -122.35], ["Vancouver", 49.29, -123.11], ["Halifax", 44.64, -63.56], ["Montreal", 45.53, -73.53],
  ["Panama (Balboa)", 8.95, -79.57], ["Colon", 9.36, -79.9], ["Kingston", 17.97, -76.8], ["Santos", -23.98, -46.3], ["Buenos Aires", -34.6, -58.37],
  ["Valparaiso", -33.03, -71.63], ["Callao", -12.05, -77.15], ["Durban", -29.87, 31.03], ["Cape Town", -33.91, 18.43], ["Mombasa", -4.06, 39.67],
  ["Lagos (Apapa)", 6.44, 3.37], ["Tangier Med", 35.88, -5.5], ["Sydney", -33.85, 151.2], ["Melbourne", -37.84, 144.92], ["Brisbane", -27.38, 153.17],
  ["Fremantle", -32.05, 115.74], ["Auckland", -36.84, 174.77], ["Honolulu", 21.31, -157.87], ["Anchorage", 61.24, -149.89], ["Juneau", 58.3, -134.41],
  ["Bellingham", 48.74, -122.5], ["Nassau", 25.08, -77.35], ["Cozumel", 20.51, -86.95], ["Port Canaveral", 28.41, -80.62], ["Fort Lauderdale (Port Everglades)", 26.09, -80.12],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const ALL: Place[] = [
  ...AIRPORTS.map(([code, name, lat, lon]) => ({ name: `${name} (${code})`, lat, lon, kind: "airport" as const, code })),
  ...CITIES.map(([name, lat, lon]) => ({ name, lat, lon, kind: "city" as const })),
  ...PORTS.map(([name, lat, lon]) => ({ name: `Port of ${name}`, lat, lon, kind: "port" as const })),
];

/**
 * Finds a place from what the user typed: coordinates "lat, lon", an IATA code ("JFK"), or a
 * city / airport / port name (exact, then prefix, then contains). `prefer` picks between a city
 * and a port or airport with the same name.
 */
export function findPlace(raw: string, prefer: Place["kind"] = "city"): Place {
  const s = raw.trim();
  if (!s) throw new InputError("Enter a place — a city, an airport code (e.g. JFK) or coordinates like 40.71, -74.01.");
  const c = s.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (c) {
    const lat = Number(c[1]), lon = Number(c[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new InputError(`"${s}": latitude must be −90…90 and longitude −180…180.`);
    return { name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon, kind: "city" };
  }
  if (/^[A-Za-z]{3}$/.test(s)) {
    const a = ALL.find((p) => p.code === s.toUpperCase());
    if (a) return a;
  }
  const q = norm(s.replace(/^port of /i, ""));
  const order = (p: Place) => (p.kind === prefer ? 0 : p.kind === "city" ? 1 : 2);
  const key = (p: Place) => norm(p.name.replace(/^Port of /, ""));
  const base = (p: Place) => key(p).replace(/ [a-z]{2}$/, "");
  const pools = [
    ALL.filter((p) => key(p) === q || base(p) === q),
    ALL.filter((p) => key(p).startsWith(q)),
    ALL.filter((p) => key(p).includes(q)),
  ];
  for (const pool of pools) if (pool.length) return [...pool].sort((a, b) => order(a) - order(b))[0];
  throw new InputError(`"${s}" isn't in the built-in place list. Type a major city, an airport code (e.g. LHR) or coordinates like 51.5, -0.12.`);
}

/** Places typed in a text box separated by ";" or "→" or new lines. */
export function placeList(raw: string, min = 2, max = 12, prefer: Place["kind"] = "city"): Place[] {
  const parts = raw.split(/\s*(?:;|→|->|\n|\|)\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length < min) throw new InputError(`Enter at least ${min} places separated by semicolons, e.g. "Chicago; St. Louis; Kansas City".`);
  if (parts.length > max) throw new InputError(`Up to ${max} places are supported.`);
  return parts.map((p) => findPlace(p, prefer));
}

/** Great-circle distance in km (haversine). */
export function gcKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = (b.lat - a.lat) * RAD, dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** Initial compass bearing a → b in degrees (0 = north). */
export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const p1 = a.lat * RAD, p2 = b.lat * RAD, dl = (b.lon - a.lon) * RAD;
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compass = (deg: number) => COMPASS[Math.round(deg / 22.5) % 16];
/** Geographic midpoint of points (average of unit vectors). */
export function midpoint(pts: { lat: number; lon: number }[]) {
  let x = 0, y = 0, z = 0;
  for (const p of pts) {
    const la = p.lat * RAD, lo = p.lon * RAD;
    x += Math.cos(la) * Math.cos(lo); y += Math.cos(la) * Math.sin(lo); z += Math.sin(la);
  }
  x /= pts.length; y /= pts.length; z /= pts.length;
  return { lat: Math.atan2(z, Math.hypot(x, y)) / RAD, lon: Math.atan2(y, x) / RAD };
}
/** Nearest place in the built-in list to a point (for describing a midpoint). */
export function nearestPlace(p: { lat: number; lon: number }, kind: Place["kind"] = "city") {
  let best = ALL[0], bd = Infinity;
  for (const q of ALL) if (q.kind === kind) { const d = gcKm(p, q); if (d < bd) { bd = d; best = q; } }
  return { place: best, km: bd };
}
export const latLonText = (p: { lat: number; lon: number }) => `${Math.abs(p.lat).toFixed(4)}°${p.lat >= 0 ? "N" : "S"}, ${Math.abs(p.lon).toFixed(4)}°${p.lon >= 0 ? "E" : "W"}`;

// ------------------------------------------------------------------ times & dates
/** "HH:MM" (24 h, also "7:30 pm") → minutes after midnight. */
export function parseClock(raw: string, label = "Time"): number {
  const s = raw.trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) throw new InputError(`${label}: enter a time like 14:30 or 2:30 pm.`);
  let h = Number(m[1]);
  const mi = Number(m[2] ?? 0);
  if (m[3]) { if (h < 1 || h > 12) throw new InputError(`${label}: hours must be 1–12 with am/pm.`); h = (h % 12) + (m[3] === "pm" ? 12 : 0); }
  if (h > 23 || mi > 59) throw new InputError(`${label}: enter a valid time (00:00–23:59).`);
  return h * 60 + mi;
}
/** Minutes after midnight (any integer) → "HH:MM" plus a day offset note. */
export function clockText(min: number): string {
  const r = Math.round(min), day = Math.floor(r / 1440), m = ((r % 1440) + 1440) % 1440;
  const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return day === 0 ? t : `${t} (${day > 0 ? "+" : "−"}${Math.abs(day)} day${Math.abs(day) > 1 ? "s" : ""})`;
}
/** Minutes → "3 h 25 min". */
export function durText(min: number): string {
  const r = Math.max(0, Math.round(min)), d = Math.floor(r / 1440), h = Math.floor((r % 1440) / 60), m = r % 60;
  return [d ? `${d} d` : "", h ? `${h} h` : "", `${m} min`].filter(Boolean).join(" ").replace(/^0 min$/, "0 min");
}
/** Whole days since 1970-01-01 (date input) → "Mon, Jan 5, 2026". */
export function dayText(day: number): string {
  return new Date(Math.round(day) * 86400000).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", year: "numeric", month: "short", day: "numeric" });
}
export const dayOfWeek = (day: number) => ((Math.round(day) % 7) + 7 + 4) % 7; // 0 = Sunday
export const dayParts = (day: number) => { const d = new Date(Math.round(day) * 86400000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
export const dayNum = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m - 1, d) / 86400000);
/** Reads a date input (day number); `def` used when missing. */
export const dateIn = (v: Vals, key: string, def: number) => { const x = v[key]; return typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.round(x) : def; };

/** Money text with a currency symbol (used inside text results). */
export const money = (x: number, sym = "$", dp = 2) => `${x < 0 ? "−" : ""}${sym}${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
export const nfmt = (x: number, dp = 0) => x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** Every airport in the built-in table (for nearest-airport searches). */
export const airportList = (): Place[] => ALL.filter((p) => p.kind === "airport");
