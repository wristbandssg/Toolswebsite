// One-time (but safe to re-run) setup script: 1 tool from the review list of the 7,423-keyword
// popular check (16 Nov 2026 — Claude outputs/Popular_Keyword_Check_2.md).
// Science > Astronomy & Space: speed of light calculator.
// Formulas: src/lib/calc-engine-light.ts. Published.
//
// HOW TO RUN
//   npm run db:create-light-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-light";
import { mk, dd, num, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.lightCustomCalculators;

const SPACE: ToolDef[] = [
  mk({
    slug: "speed-of-light-calculator", title: "Speed of Light Calculator (Light Travel Time, Distance & Fraction of c)",
    meta: "Speed of Light Calculator — How Long Light Takes to Travel",
    desc: "Find how long light takes to reach the Moon, the Sun, Mars, the nearest star or any distance you enter, how far light travels in a given time, and what fraction of the speed of light a speed is, with its Lorentz factor.",
    inputs: [
      dd("mode", "Calculate", E.LIGHT_MODES, 0),
      dd("preset", "Distance (travel-time mode)", E.PRESETS.map((p) => p[0]), 2),
      num("distance", "Custom Distance", 384400, 0, 1e15, 0.001), dd("distUnit", "Distance Unit", E.DIST_UNITS, 0),
      num("time", "Time (distance mode)", 1, 0, 1e12, 0.000001), dd("timeUnit", "Time Unit", E.TIME_UNITS, 0),
      num("speed", "Speed (fraction mode)", 1000, 0, 1e9, 0.001), dd("speedUnit", "Speed Unit", E.SPEED_UNITS, 0),
    ],
    results: [["answer", "Answer", "t"], ["detail", "Details", "t"], ["distance", "Distance / Speed", "t"], ["roundTrip", "For Scale", "t"], ["c", "Speed of Light", "t"]],
    fn: C["speed-of-light-calculator"], ex: { mode: 0, preset: 2, distance: 384400, distUnit: 0, time: 1, timeUnit: 0, speed: 1000, speedUnit: 0 },
    exText: (o) => `Example: sunlight takes ${o.answer} to reach Earth.`,
    how: "Light in a vacuum travels at exactly 299,792,458 meters per second (about 186,282 miles per second). Travel time = distance ÷ c, and distance = c × time.\n\nLight takes about 1.28 seconds to reach the Moon, 8 minutes 19 seconds to come from the Sun, between 3 and 22 minutes to reach Mars depending on where the planets are, and 4.25 years to arrive from Proxima Centauri, the nearest star. A light-year is the distance light covers in one year, about 9.46 trillion km.\n\nIn fraction mode, β = v ÷ c, and the Lorentz factor γ = 1 ÷ √(1 − β²) tells you how much time slows for something moving at that speed.",
    assume: "Light speed in a vacuum. In glass or water light is slower (c ÷ refractive index). Planet distances change through the year, so the presets use closest or average values. A year is 365.25 days.",
    faq: [
      ["How long does light take to get from the Sun to Earth?", "About 8 minutes 20 seconds (499 seconds) on average."],
      ["How fast is the speed of light in mph?", "About 670,616,629 mph, or 186,282 miles per second."],
      ["How long does light take to reach the Moon?", "About 1.28 seconds, so a radio round trip takes about 2.56 seconds."],
      ["Can anything go faster than light?", "Nothing with mass can reach it: as speed approaches c, the energy needed grows without limit."],
    ],
  }),
];

async function main() {
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${SPACE.length} tool definitions`); for (const t of SPACE) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("astronomy-space-calculators", SPACE);
}
main().catch((e) => { console.error(e); process.exit(1); });
