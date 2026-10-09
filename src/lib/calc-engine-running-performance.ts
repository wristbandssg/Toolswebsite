/**
 * Batch: "Sports Calculators" > Running Calculators, sub-batch B (Race
 * Scoring & Training Load, 9 tools). See calc-engine-running-pace.ts for
 * the full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - ageGradeCalculator: performance as % of the age-and-sex world-best
 *    standard (official WMA/USATF 2025 road factors, Alan Jones).
 *  - purdyPointsCalculator: Gardner–Purdy points (950 = the 1970 world
 *    standard), comparing any distance, ignoring age.
 *  - worldAthleticsPointsCalculator: World Athletics 2025 scoring-table
 *    points for road and track distance events.
 *  - runningPercentileCalculator: where a finish time ranks among
 *    recreational race finishers (also the marathon percentile).
 *  - marathonTrainingPlanCalculator: weekly volume build, cutbacks, peak
 *    and taper for a marathon or half marathon.
 *  - tenPercentRuleCalculator: safe weekly mileage increases.
 *  - runningRecoveryTimeCalculator: days to recover after a race or hard run.
 *  - acuteChronicWorkloadRatioCalculator: injury-risk load ratio.
 *  - trimpCalculator: Banister training impulse from heart rate.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-running-performance-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));
const isFemale = (v: number) => whole(v, 1) === 2;
const MILE = 1.609344;
const hmsSeconds = (v: Record<string, number>, p: string, dh: number, dm: number, ds: number) => nonNeg(v[`${p}Hours`], dh) * 3600 + nonNeg(v[`${p}Minutes`], dm) * 60 + nonNeg(v[`${p}Seconds`], ds);
function hms(prefix: string, sec: number) {
  const t = Math.round(Math.max(0, sec));
  return { [`${prefix}Hours`]: Math.floor(t / 3600), [`${prefix}Minutes`]: Math.floor((t % 3600) / 60), [`${prefix}Seconds`]: t % 60 };
}

// Race dropdown shared by the scoring tools: 1 mile, 5K, 8K, 5 mi, 10K,
// 15K, 10 mi, half, marathon, 50K, 100K (index into the tables below).
const RACE_KM = [MILE, 5, 8, 5 * MILE, 10, 15, 10 * MILE, 21.0975, 42.195, 50, 100];

// WMA/USATF road age-grading factors 2025 (Alan Jones, version 2025-07-25):
// per race, the open standard (seconds) and factors ×10000 for ages 5–100.
const AGE_FACTORS: Record<"M" | "F", { oc: number; f: string }[]> = {
  M: [
    { oc: 227, f: "5990,6502,6978,7418,7822,8190,8522,8818,9078,9302,9490,9660,9830,9958,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9977,9913,9844,9774,9705,9636,9566,9497,9427,9358,9289,9219,9150,9080,9011,8942,8872,8803,8733,8664,8595,8525,8456,8386,8317,8248,8178,8109,8039,7970,7901,7831,7762,7692,7623,7554,7484,7415,7345,7274,7196,7111,7019,6920,6814,6701,6581,6454,6320,6179,6031,5876,5714,5545,5369,5186,4997,4800,4596,4385,4168,3943,3711,3473,3227,2974,2715,2448,2175,1894,1607" }, // 1 Mile
    { oc: 769, f: "5533,6158,6734,7262,7742,8174,8559,8895,9183,9423,9615,9760,9880,9970,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9999,9987,9962,9924,9874,9810,9740,9670,9600,9530,9460,9390,9320,9250,9180,9110,9040,8970,8900,8830,8760,8690,8620,8550,8480,8410,8340,8270,8200,8130,8060,7990,7920,7850,7780,7710,7640,7570,7498,7422,7339,7250,7156,7055,6948,6836,6717,6592,6462,6325,6182,6034,5879,5718,5552,5379,5200,5016,4825,4628,4426,4217,4002,3782,3555,3322,3084,2839,2588,2332,2069" }, // 5 km
    { oc: 1255, f: "5265,5877,6445,6971,7454,7895,8294,8650,8963,9233,9461,9647,9797,9911,9978,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9998,9988,9969,9943,9909,9866,9817,9764,9706,9645,9580,9511,9438,9365,9291,9218,9144,9071,8998,8924,8851,8777,8704,8631,8557,8484,8411,8337,8264,8190,8117,8044,7970,7897,7823,7750,7677,7603,7529,7454,7376,7294,7206,7112,7010,6903,6789,6669,6541,6408,6268,6121,5969,5810,5644,5471,5292,5108,4915,4717,4513,4301,4083,3860,3629,3392,3148,2899,2642,2379,2110" }, // 8 km
    { oc: 1264, f: "5262,5873,6442,6968,7451,7892,8291,8646,8960,9231,9459,9645,9796,9910,9978,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9998,9988,9970,9943,9909,9866,9818,9765,9708,9647,9582,9512,9439,9366,9293,9219,9146,9072,8999,8925,8852,8779,8705,8632,8558,8485,8411,8338,8265,8191,8118,8044,7971,7897,7824,7751,7677,7604,7530,7454,7377,7295,7207,7113,7011,6904,6790,6670,6542,6409,6269,6123,5970,5811,5645,5472,5293,5109,4916,4718,4514,4302,4084,3861,3630,3393,3149,2899,2642,2379,2110" }, // 5 Mile
    { oc: 1584, f: "5138,5743,6308,6833,7318,7763,8168,8533,8858,9143,9388,9593,9758,9883,9968,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9997,9988,9973,9952,9925,9892,9853,9808,9757,9700,9637,9568,9494,9419,9344,9269,9194,9119,9044,8969,8894,8819,8744,8669,8594,8519,8444,8369,8294,8219,8144,8069,7994,7919,7844,7769,7694,7619,7544,7469,7394,7315,7230,7139,7040,6935,6823,6705,6579,6447,6309,6163,6011,5853,5687,5515,5336,5151,4958,4759,4554,4341,4122,3897,3664,3425,3179,2927,2667,2401,2129" }, // 10 km
    { oc: 2415, f: "4857,5537,6168,6749,7280,7762,8195,8578,8912,9196,9431,9616,9754,9865,9958,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9999,9995,9985,9968,9944,9912,9872,9825,9770,9708,9638,9564,9488,9411,9335,9258,9182,9105,9029,8952,8876,8799,8723,8646,8570,8493,8416,8340,8264,8187,8110,8034,7958,7881,7804,7728,7651,7575,7498,7422,7345,7265,7178,7085,6985,6878,6764,6644,6517,6382,6242,6094,5940,5779,5611,5436,5255,5067,4872,4670,4462,4246,4024,3796,3560,3318,3069,2813,2550,2281,2005" }, // 15 km
    { oc: 2595, f: "4808,5501,6144,6734,7273,7762,8200,8586,8921,9205,9438,9620,9753,9862,9957,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9999,9996,9988,9971,9947,9915,9875,9828,9772,9709,9638,9563,9487,9410,9333,9256,9179,9103,9026,8949,8872,8795,8719,8642,8565,8488,8411,8335,8258,8181,8104,8028,7951,7874,7797,7721,7644,7567,7490,7414,7337,7256,7169,7076,6975,6868,6754,6634,6506,6371,6230,6082,5928,5766,5598,5423,5240,5052,4857,4654,4446,4230,4007,3778,3542,3299,3050,2794,2530,2260,1984" }, // 10 Mile
    { oc: 3451, f: "4621,5364,6050,6678,7248,7762,8218,8616,8957,9241,9467,9636,9750,9850,9950,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9996,9982,9960,9928,9888,9839,9781,9714,9638,9560,9483,9405,9327,9249,9171,9094,9016,8938,8860,8782,8705,8627,8549,8471,8393,8316,8238,8160,8082,8004,7927,7849,7771,7693,7615,7538,7460,7382,7304,7223,7135,7040,6938,6830,6715,6593,6464,6328,6185,6036,5880,5717,5547,5370,5186,4996,4799,4595,4384,4167,3942,3711,3473,3228,2976,2718,2452,2180,1901" }, // Half Marathon
    { oc: 7235, f: "4414,5080,5702,6279,6812,7301,7745,8145,8500,8811,9078,9300,9500,9680,9820,9920,9980,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9999,9979,9934,9865,9783,9701,9619,9537,9455,9373,9291,9209,9127,9045,8963,8881,8799,8717,8635,8553,8471,8389,8307,8225,8143,8061,7979,7897,7815,7733,7651,7569,7487,7405,7323,7241,7155,7063,6963,6857,6743,6623,6495,6361,6219,6071,5915,5753,5583,5407,5223,5033,4835,4631,4419,4201,3975,3743,3503,3257,3003,2743,2475,2201,1919" }, // Marathon
    { oc: 8820, f: "4414,5080,5702,6279,6812,7301,7745,8145,8500,8811,9078,9300,9500,9680,9820,9920,9980,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9999,9979,9934,9865,9783,9701,9619,9537,9455,9373,9291,9209,9127,9045,8963,8881,8799,8717,8635,8553,8471,8389,8307,8225,8143,8061,7979,7897,7815,7733,7651,7569,7487,7405,7323,7241,7155,7063,6963,6857,6743,6623,6495,6361,6219,6071,5915,5753,5583,5407,5223,5033,4835,4631,4419,4201,3975,3743,3503,3257,3003,2743,2475,2201,1919" }, // 50 km
    { oc: 21360, f: "4414,5080,5702,6279,6812,7301,7745,8145,8500,8811,9078,9300,9500,9680,9820,9920,9980,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9999,9979,9934,9865,9783,9701,9619,9537,9455,9373,9291,9209,9127,9045,8963,8881,8799,8717,8635,8553,8471,8389,8307,8225,8143,8061,7979,7897,7815,7733,7651,7569,7487,7405,7323,7241,7155,7063,6963,6857,6743,6623,6495,6361,6219,6071,5915,5753,5583,5407,5223,5033,4835,4631,4419,4201,3975,3743,3503,3257,3003,2743,2475,2201,1919" }, // 100 km
  ],
  F: [
    { oc: NaN, f: "50000,60000,70000,80000,90000,100000,110000,120000,130000,140000,150000,160000,170000,180000,190000,200000,210000,220000,230000,240000,250000,260000,270000,280000,290000,300000,310000,320000,330000,340000,350000,360000,370000,380000,390000,400000,410000,420000,430000,440000,450000,460000,470000,480000,490000,500000,510000,520000,530000,540000,550000,560000,570000,580000,590000,600000,610000,620000,630000,640000,650000,660000,670000,680000,690000,700000,710000,720000,730000,740000,750000,760000,770000,780000,790000,800000,810000,820000,830000,840000,850000,860000,870000,880000,890000,900000,910000,920000,930000,940000,950000,960000,970000,980000,990000,1000000" }, // 1 Mile
    { oc: 253, f: "7220,7513,7792,8057,8308,8545,8768,8977,9172,9353,9520,9680,9840,9960,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,9938,9911,9878,9840,9797,9748,9695,9636,9573,9504,9430,9351,9266,9177,9082,8985,8888,8791,8694,8597,8500,8403,8306,8209,8111,8014,7917,7820,7723,7626,7529,7432,7335,7238,7140,7043,6946,6849,6752,6655,6558,6461,6364,6267,6168,6062,5946,5821,5686,5542,5388,5225,5053,4871,4680,4480,4270,4051,3822,3584,3336,3079,2813,2537,2252,1958" }, // 5 km
    { oc: 1087, f: "6884,7208,7516,7808,8084,8344,8588,8816,9028,9224,9406,9585,9763,9905,9971,9993,10000,10000,10000,10000,10000,10000,9998,9993,9982,9967,9946,9921,9891,9856,9816,9771,9722,9668,9608,9544,9475,9402,9323,9239,9151,9058,8965,8870,8774,8676,8578,8480,8382,8285,8186,8088,7990,7892,7795,7696,7599,7501,7403,7305,7207,7109,7011,6913,6815,6717,6619,6521,6424,6326,6228,6128,6026,5918,5802,5678,5547,5409,5263,5109,4947,4778,4601,4418,4226,4026,3819,3604,3382,3152,2915,2670,2417,2157,1889,1614" }, // 8 km
    { oc: 1365, f: "6867,7196,7507,7801,8078,8339,8581,8807,9016,9208,9384,9553,9722,9863,9946,9986,10000,10000,10000,10000,10000,10000,9999,9995,9986,9973,9955,9932,9906,9873,9836,9795,9749,9698,9643,9583,9519,9450,9375,9297,9214,9126,9036,8943,8846,8748,8650,8551,8452,8354,8255,8156,8057,7959,7860,7761,7663,7564,7466,7367,7268,7170,7071,6972,6874,6775,6676,6577,6479,6381,6282,6180,6074,5961,5840,5711,5575,5431,5281,5122,4955,4781,4599,4410,4214,4009,3797,3577,3350,3115,2872,2623,2365,2100,1827,1546" }, // 5 Mile
    { oc: 1375, f: "6867,7195,7507,7801,8078,8339,8581,8807,9016,9207,9383,9552,9721,9862,9945,9986,10000,10000,10000,10000,10000,10000,9999,9995,9987,9973,9955,9933,9906,9874,9837,9795,9750,9699,9644,9584,9520,9451,9377,9298,9215,9128,9038,8945,8848,8750,8652,8552,8454,8356,8257,8158,8059,7961,7862,7763,7665,7566,7467,7369,7270,7171,7072,6974,6875,6776,6678,6579,6481,6382,6283,6182,6075,5962,5841,5712,5576,5432,5281,5122,4955,4781,4599,4410,4213,4008,3796,3576,3349,3114,2871,2621,2363,2098,1825,1544" }, // 10 km
    { oc: 2084, f: "6662,7010,7339,7649,7940,8214,8467,8703,8920,9117,9297,9466,9636,9786,9896,9965,9995,10000,10000,10000,10000,10000,10000,9998,9991,9980,9964,9943,9919,9889,9855,9817,9774,9726,9674,9618,9557,9491,9421,9346,9267,9183,9096,9003,8905,8805,8705,8604,8504,8404,8303,8203,8102,8002,7902,7801,7701,7600,7500,7400,7299,7199,7098,6998,6898,6797,6697,6596,6496,6396,6295,6191,6080,5960,5833,5698,5556,5406,5248,5083,4909,4728,4540,4343,4139,3928,3708,3481,3246,3004,2753,2496,2230,1957,1676,1387" }, // 15 km
    { oc: 2629, f: "6432,6798,7144,7471,7779,8068,8337,8586,8817,9028,9219,9401,9582,9744,9866,9947,9989,10000,10000,10000,10000,10000,10000,9998,9991,9979,9963,9942,9917,9887,9853,9814,9770,9721,9669,9611,9549,9482,9411,9335,9254,9169,9080,8985,8886,8785,8683,8581,8479,8378,8276,8175,8073,7972,7870,7768,7667,7565,7463,7362,7260,7159,7057,6955,6854,6752,6650,6549,6447,6346,6244,6139,6026,5906,5777,5641,5497,5345,5186,5019,4843,4660,4469,4270,4064,3850,3627,3397,3160,2915,2661,2400,2131,1854,1569,1277" }, // 10 Mile
    { oc: 3557, f: "6135,6525,6894,7243,7572,7880,8168,8436,8684,8912,9119,9316,9513,9690,9827,9924,9981,10000,10000,10000,10000,10000,10000,9998,9991,9979,9962,9941,9915,9885,9850,9810,9765,9715,9661,9603,9539,9470,9397,9320,9237,9150,9059,8962,8861,8758,8654,8552,8448,8345,8241,8139,8035,7932,7829,7726,7622,7519,7416,7313,7209,7107,7003,6900,6797,6694,6590,6487,6384,6281,6177,6072,5958,5835,5705,5568,5421,5267,5106,4936,4758,4572,4379,4176,3967,3750,3523,3290,3049,2799,2541,2276,2003,1721,1432,1134" }, // Half Marathon
    { oc: 5450, f: "5737,6169,6575,6955,7310,7638,7941,8218,8469,8695,8894,9081,9268,9445,9602,9734,9832,9899,9943,9975,9994,10000,10000,9998,9992,9981,9966,9947,9924,9896,9864,9828,9788,9743,9694,9641,9584,9522,9456,9386,9311,9233,9150,9063,8971,8877,8781,8683,8583,8481,8377,8272,8165,8058,7951,7843,7736,7629,7522,7415,7308,7201,7094,6986,6879,6772,6665,6558,6451,6342,6228,6110,5984,5848,5706,5556,5396,5230,5055,4873,4682,4483,4277,4062,3840,3609,3370,3124,2869,2607,2336,2057,1771,1476,1173,863" }, // Marathon
    { oc: 7796, f: "5405,5874,6311,6718,7093,7438,7751,8034,8285,8506,8695,8869,9043,9217,9391,9553,9689,9801,9888,9950,9988,10000,10000,9998,9992,9983,9970,9953,9932,9907,9879,9847,9811,9771,9727,9680,9629,9574,9515,9453,9386,9316,9242,9165,9083,8998,8909,8816,8720,8619,8515,8407,8297,8186,8076,7965,7854,7744,7633,7523,7412,7301,7191,7080,6970,6859,6748,6638,6527,6413,6290,6159,6021,5874,5720,5557,5386,5208,5021,4827,4624,4413,4195,3968,3734,3491,3240,2982,2715,2441,2158,1867,1569,1262,948,625" }, // 50 km
    { oc: 17100, f: "5405,5874,6311,6718,7093,7438,7751,8034,8285,8506,8695,8869,9043,9217,9391,9553,9689,9801,9888,9950,9988,10000,10000,9998,9992,9983,9970,9953,9932,9907,9879,9847,9811,9771,9727,9680,9629,9574,9515,9453,9386,9316,9242,9165,9083,8998,8909,8816,8720,8619,8515,8407,8297,8186,8076,7965,7854,7744,7633,7523,7412,7301,7191,7080,6970,6859,6748,6638,6527,6413,6290,6159,6021,5874,5720,5557,5386,5208,5021,4827,4624,4413,4195,3968,3734,3491,3240,2982,2715,2441,2158,1867,1569,1262,948,625" }, // 100 km
  ],
};

const raceIndex = (v: number) => Math.min(RACE_KM.length - 1, Math.max(0, whole(v, 2) - 1));

/** Normal CDF (Abramowitz & Stegun 7.1.26). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// --- 1. Age Grade -----------------------------------------------------------
export const ageGradeCalculator: CustomCalculator = (values) => {
  const r = raceIndex(values.race);
  const sex = isFemale(values.sex) ? "F" : "M";
  const age = Math.min(100, Math.max(5, whole(values.age, 45)));
  const row = AGE_FACTORS[sex][r];
  const factor = Number(row.f.split(",")[age - 5]) / 10000;
  const t = hmsSeconds(values, "time", 0, 25, 0);
  // Age standard = open standard ÷ age factor; grade = standard ÷ your time.
  const standard = row.oc / factor;
  const grade = t > 0 ? (standard / t) * 100 : 0;

  return {
    ageGradePercent: round2(grade),
    // 5 world class (90%+), 4 national (80%+), 3 regional (70%+), 2 local (60%+), 1 below.
    level: grade >= 90 ? 5 : grade >= 80 ? 4 : grade >= 70 ? 3 : grade >= 60 ? 2 : 1,
    ageFactor: factor,
    ...hms("openEquivalent", t * factor),
    ...hms("ageStandard", standard),
  };
};

// --- 2. Purdy Points --------------------------------------------------------
// Gardner & Purdy (1970) world-standard velocity curve, metres → m/s.
function purdyStandardSeconds(m: number): number {
  const v =
    -11.15895 * Math.exp(-0.03796158 * m) +
    4.304605 * Math.exp(-0.001646772 * m) +
    0.5234627 * Math.exp(-0.000410767 * m) +
    4.03156 * Math.exp(-0.000007068099 * m) +
    2.316157 * Math.exp(-0.00000000522099 * m);
  return m / v;
}

export const purdyPointsCalculator: CustomCalculator = (values) => {
  const km = whole(values.race, 2) === 12 ? nonNeg(values.customKm, 5) : RACE_KM[raceIndex(values.race)];
  const m = km * 1000;
  const t = Math.max(1, hmsSeconds(values, "time", 0, 25, 0));
  const ts = purdyStandardSeconds(m);
  const v = m / ts;
  const k = 0.0654 - 0.00258 * v;
  const a = 85 / k;
  const b = 1 - 950 / a;
  const points = a * (ts / t - b);
  // Time worth 500 points (a common club benchmark).
  const t500 = ts / (500 / a + b);

  return { purdyPoints: Math.round(Math.max(0, points)), ...hms("worldStandard", ts), ...hms("time500Points", t500) };
};

// --- 3. World Athletics Points ----------------------------------------------
// 2025 scoring tables: points = floor(f × (T + shift)²), T in seconds.
// Events: 1 1500 m, 2 mile, 3 3000 m, 4 5K, 5 10K, 6 15K, 7 10 mi, 8 half, 9 marathon, 10 100K.
const WA: Record<string, [number, number]> = {
  "M-1": [-385, 0.04066], "M-2": [-415, 0.0351], "M-3": [-840, 0.00815], "M-4": [-1440, 0.002778], "M-5": [-3150, 0.000524],
  "M-6": [-4868, 0.0002162], "M-7": [-5250, 0.0001852], "M-8": [-7140, 0.0000947], "M-9": [-15300, 0.0000201], "M-10": [-48600, 0.000001765],
  "F-1": [-540, 0.0134], "F-2": [-580, 0.01165], "F-3": [-1200, 0.002539], "F-4": [-2100, 0.000808], "F-5": [-4500, 0.0001712],
  "F-6": [-7289, 0.0000595], "F-7": [-7904, 0.00005016], "F-8": [-10798, 0.00002596], "F-9": [-23400, 0.00000539], "F-10": [-61200, 8.74e-7],
};

export const worldAthleticsPointsCalculator: CustomCalculator = (values) => {
  const [shift, f] = WA[`${isFemale(values.sex) ? "F" : "M"}-${Math.min(10, Math.max(1, whole(values.event, 4)))}`];
  const t = hmsSeconds(values, "time", 0, 15, 0);
  const s = t + shift;
  const points = s >= 0 ? 0 : Math.floor(f * s * s);
  // Time for the next 100-point step up.
  const nextTarget = (Math.floor(points / 100) + 1) * 100;
  const tNext = -Math.sqrt(nextTarget / f) - shift;

  return { worldAthleticsPoints: Math.max(0, points), ...hms("timeForNext100", tNext), nextPointsLevel: nextTarget };
};

// --- 4. Running Percentile --------------------------------------------------
// Approximate median finish times (s) of recreational race finishers at
// 5K, 10K, half and marathon; other distances by Riegel from the 10K.
const MEDIANS: Record<"M" | "F", Record<string, number>> = {
  M: { "5": 1890, "10": 3480, "21.0975": 7200, "42.195": 15600 },
  F: { "5": 2280, "10": 4020, "21.0975": 8100, "42.195": 17100 },
};

export const runningPercentileCalculator: CustomCalculator = (values) => {
  const km = RACE_KM[raceIndex(values.race)];
  const med = isFemale(values.sex) ? MEDIANS.F : MEDIANS.M;
  const median = med[String(km)] ?? med["10"] * Math.pow(km / 10, 1.06);
  const t = Math.max(1, hmsSeconds(values, "time", 0, 25, 0));
  // Finish times are roughly log-normal with σ ≈ 0.2.
  const fasterThan = 1 - normCdf(Math.log(t / median) / 0.2);

  return {
    percentile: round2(fasterThan * 100),
    topPercent: round2((1 - fasterThan) * 100),
    ...hms("median", median),
    ...hms("top10Percent", median * Math.exp(-1.2816 * 0.2)),
  };
};

// --- 5. Marathon / Half Marathon Training Plan ------------------------------
export const marathonTrainingPlanCalculator: CustomCalculator = (values) => {
  const half = whole(values.race, 1) === 2;
  const weeks = Math.min(30, Math.max(8, whole(values.weeksToRace, 16)));
  const now = Math.max(5, nonNeg(values.currentWeekly, 30));
  const peak = Math.max(now, nonNeg(values.peakWeekly, half ? 50 : 65));
  const taper = half ? 2 : 3;
  const build = weeks - taper;
  // Grow toward the peak by 10% a week, with a cutback every 4th week.
  let v = now;
  let peakReached = 0;
  for (let w = 1; w <= build; w++) {
    if (w % 4 === 0) continue;
    v = Math.min(peak, v * 1.1);
    if (v >= peak && !peakReached) peakReached = w;
  }
  // Long-run caps: 20 km / 32 km (13 / 20 miles).
  const miles = whole(values.unit, 1) === 2;
  const longPeak = Math.min(half ? (miles ? 13 : 20) : miles ? 20 : 32, v * (half ? 0.33 : 0.35));

  return {
    peakWeeklyVolume: round2(v),
    peakWeek: peakReached || build,
    reachesPlannedPeak: v >= peak ? 1 : 0,
    taperStartsWeek: build + 1,
    taperWeeks: taper,
    longRunPeak: round2(longPeak),
    startingLongRun: round2(now * 0.3),
    raceWeekVolume: round2(v * 0.4),
  };
};

// --- 6. 10 Percent Rule -----------------------------------------------------
export const tenPercentRuleCalculator: CustomCalculator = (values) => {
  const now = nonNeg(values.currentWeekly, 30);
  const pct = Math.min(20, nonNeg(values.increasePercent, 10)) / 100;
  const weeks = whole(values.weeks, 8);
  const target = nonNeg(values.targetWeekly, 50);
  const after = now * Math.pow(1 + pct, weeks);
  const weeksToTarget = target > now && pct > 0 ? Math.ceil(Math.log(target / now) / Math.log(1 + pct)) : 0;
  let total = 0;
  for (let w = 1; w <= weeks; w++) total += now * Math.pow(1 + pct, w);

  return { weeklyAfter: round2(after), nextWeek: round2(now * (1 + pct)), weeksToTarget, totalOverPeriod: round2(total) };
};

// --- 7. Running Recovery Time -----------------------------------------------
export const runningRecoveryTimeCalculator: CustomCalculator = (values) => {
  const km = nonNeg(values.distance, 21.0975) * (whole(values.unit, 1) === 2 ? MILE : 1);
  const effort = ({ 1: 0.4, 2: 0.7, 3: 1 } as Record<number, number>)[whole(values.effort, 3)] ?? 1;
  const age = nonNeg(values.age, 35);
  // Classic guide: about one easy day per mile raced at full effort, a bit
  // more after 40; hard workouts resume after about half of that.
  const ageMult = age >= 50 ? 1.25 : age >= 40 ? 1.1 : 1;
  const days = (km / MILE) * effort * ageMult;

  return {
    fullRecoveryDays: Math.round(days),
    daysBeforeHardWorkout: Math.round(days * 0.5),
    daysBeforeNextRace: Math.round(days * 1.2),
    restDays: Math.min(3, Math.max(1, Math.round(km / 15))),
  };
};

// --- 8. Acute:Chronic Workload Ratio ----------------------------------------
export const acuteChronicWorkloadRatioCalculator: CustomCalculator = (values) => {
  const w = [1, 2, 3, 4].map((i) => nonNeg(values[`week${i}`], [40, 42, 38, 45][i - 1]));
  // Week 4 is the latest week. Rolling average: acute = latest week,
  // chronic = mean of the 4 weeks.
  const acute = w[3];
  const chronic = w.reduce((a, b) => a + b, 0) / 4;
  const ratio = chronic > 0 ? acute / chronic : 0;
  // Exponentially weighted version (Williams et al. 2017), applied weekly.
  const la = 2 / (1 + 1);
  const lc = 2 / (4 + 1);
  let ea = w[0];
  let ec = w[0];
  for (const x of w.slice(1)) {
    ea = x * la + ea * (1 - la);
    ec = x * lc + ec * (1 - lc);
  }

  return {
    acwr: round2(ratio),
    // 1 under-training (<0.8), 2 sweet spot (0.8–1.3), 3 caution (1.3–1.5), 4 high risk (>1.5).
    riskZone: ratio < 0.8 ? 1 : ratio <= 1.3 ? 2 : ratio <= 1.5 ? 3 : 4,
    acuteLoad: round2(acute),
    chronicLoad: round2(chronic),
    ewmaRatio: ec > 0 ? round2(ea / ec) : 0,
    maxSafeNextWeek: round2(chronic * 1.3),
  };
};

// --- 9. TRIMP (Banister) ----------------------------------------------------
export const trimpCalculator: CustomCalculator = (values) => {
  const minutes = nonNeg(values.minutes, 60);
  const rest = nonNeg(values.restingHr, 55);
  const max = Math.max(rest + 1, nonNeg(values.maxHr, 190));
  const avg = Math.min(max, Math.max(rest, nonNeg(values.avgHr, 150)));
  const hrr = (avg - rest) / (max - rest);
  const y = isFemale(values.sex) ? 0.86 * Math.exp(1.67 * hrr) : 0.64 * Math.exp(1.92 * hrr);
  const trimp = minutes * hrr * y;

  return {
    trimp: round2(trimp),
    heartRateReservePercent: round2(hrr * 100),
    trimpPerHour: minutes > 0 ? round2((trimp / minutes) * 60) : 0,
    // 1 easy (<50), 2 moderate (50–100), 3 hard (100–200), 4 very hard (>200).
    sessionLoad: trimp < 50 ? 1 : trimp < 100 ? 2 : trimp < 200 ? 3 : 4,
  };
};

export const runningPerformanceCustomCalculators: Record<string, CustomCalculator> = {
  "age-grade-calculator": ageGradeCalculator,
  "purdy-points-calculator": purdyPointsCalculator,
  "world-athletics-points-calculator": worldAthleticsPointsCalculator,
  "running-percentile-calculator": runningPercentileCalculator,
  "marathon-training-plan-calculator": marathonTrainingPlanCalculator,
  "10-percent-rule-running-calculator": tenPercentRuleCalculator,
  "running-recovery-time-calculator": runningRecoveryTimeCalculator,
  "acute-chronic-workload-ratio-calculator": acuteChronicWorkloadRatioCalculator,
  "trimp-calculator": trimpCalculator,
};
