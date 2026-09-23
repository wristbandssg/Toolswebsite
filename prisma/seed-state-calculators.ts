// One-time (but safe to re-run) setup script: seeds the "Other state
// calculators" directory (StateCalculatorLink) with all 50 US states.
//
// Only Nevada is linked to a real tool (nevada-tax-calculator) right now —
// every other state's `toolSlug` is left null, so its button shows in the
// grid as "coming soon" until that state's calculator actually gets built.
// Link a state to its tool later either by editing prisma/schema-driven
// data directly in /admin/state-calculators (preferred — no redeploy
// needed), or by re-running this script after adding its slug below.
//
// Uses `upsert` keyed by `abbreviation`, so running it again just updates
// state names / order to match this file rather than creating duplicates —
// it will NOT overwrite a `toolSlug` you've since set from the admin panel,
// since that field isn't included in the `update` payload below.
//
// HOW TO RUN
//   npx tsx prisma/seed-state-calculators.ts
// or
//   npm run db:seed-state-calculators

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// [Full state name, abbreviation, toolSlug | null] — alphabetical by name,
// which is also the order the grid displays them in.
const STATES: [string, string, string | null][] = [
  ["Alabama", "AL", null],
  ["Alaska", "AK", null],
  ["Arizona", "AZ", null],
  ["Arkansas", "AR", null],
  ["California", "CA", null],
  ["Colorado", "CO", null],
  ["Connecticut", "CT", null],
  ["Delaware", "DE", null],
  ["Florida", "FL", null],
  ["Georgia", "GA", null],
  ["Hawaii", "HI", null],
  ["Idaho", "ID", null],
  ["Illinois", "IL", null],
  ["Indiana", "IN", null],
  ["Iowa", "IA", null],
  ["Kansas", "KS", null],
  ["Kentucky", "KY", null],
  ["Louisiana", "LA", null],
  ["Maine", "ME", null],
  ["Maryland", "MD", null],
  ["Massachusetts", "MA", null],
  ["Michigan", "MI", null],
  ["Minnesota", "MN", null],
  ["Mississippi", "MS", null],
  ["Missouri", "MO", null],
  ["Montana", "MT", null],
  ["Nebraska", "NE", null],
  ["Nevada", "NV", "nevada-tax-calculator"],
  ["New Hampshire", "NH", null],
  ["New Jersey", "NJ", null],
  ["New Mexico", "NM", null],
  ["New York", "NY", null],
  ["North Carolina", "NC", null],
  ["North Dakota", "ND", null],
  ["Ohio", "OH", null],
  ["Oklahoma", "OK", null],
  ["Oregon", "OR", null],
  ["Pennsylvania", "PA", null],
  ["Rhode Island", "RI", null],
  ["South Carolina", "SC", null],
  ["South Dakota", "SD", null],
  ["Tennessee", "TN", null],
  ["Texas", "TX", null],
  ["Utah", "UT", null],
  ["Vermont", "VT", null],
  ["Virginia", "VA", null],
  ["Washington", "WA", null],
  ["West Virginia", "WV", null],
  ["Wisconsin", "WI", null],
  ["Wyoming", "WY", null],
];

async function main() {
  for (const [stateName, abbreviation, toolSlug] of STATES) {
    const order = STATES.findIndex((s) => s[1] === abbreviation);
    await prisma.stateCalculatorLink.upsert({
      where: { abbreviation },
      update: { stateName, order },
      create: { stateName, abbreviation, toolSlug, order },
    });
  }
  console.log(`Seeded ${STATES.length} state calculator entries. Only Nevada is linked so far.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
