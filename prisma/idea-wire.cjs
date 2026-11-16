// Wires an idea batch: appends a slug→fn registry to the engine file, imports it in calc-engine.ts,
// adds the npm script. Usage: node wire.cjs <batch>   (e.g. art1). Idempotent.
const fs = require('fs');
const ROOT = 'C:/Users/agent/Downloads/calc-platform';
const b = process.argv[2];
const createF = `${ROOT}/prisma/create-idea-${b}-calculators.ts`;
const engF = `${ROOT}/src/lib/calc-engine-idea-${b}.ts`;
const src = fs.readFileSync(createF, 'utf8');
const pairs = [...src.matchAll(/slug: "([a-z0-9-]+)"[\s\S]*?fn: E\.(\w+)/g)].map(m => [m[1], m[2]]);
const reg = `idea${b[0].toUpperCase()}${b.slice(1)}CustomCalculators`.replace(/[^A-Za-z0-9]/g, '');
let eng = fs.readFileSync(engF, 'utf8');
eng = eng.replace(/\n\/\/ ---- registry \(generated\)[\s\S]*$/, '');
eng += `\n// ---- registry (generated)\nexport const ${reg}: Record<string, Calc> = {\n${pairs.map(([s, f]) => `  "${s}": ${f},`).join('\n')}\n};\n`;
fs.writeFileSync(engF, eng);
const ceF = `${ROOT}/src/lib/calc-engine.ts`;
let ce = fs.readFileSync(ceF, 'utf8');
if (!ce.includes(`from "./calc-engine-idea-${b}"`)) {
  const imp = `import { ${reg} } from "./calc-engine-idea-${b}";\n`;
  const lastImp = ce.lastIndexOf('\nimport ');
  const eol = ce.indexOf('\n', lastImp + 1);
  ce = ce.slice(0, eol + 1) + imp + ce.slice(eol + 1);
  ce = ce.replace('  ...lightCustomCalculators,\n', `  ...lightCustomCalculators,\n  ...${reg},\n`);
  if (!ce.includes(`...${reg},`)) throw new Error('registry anchor not found');
  fs.writeFileSync(ceF, ce);
}
const pkF = `${ROOT}/package.json`;
const pk = JSON.parse(fs.readFileSync(pkF, 'utf8'));
pk.scripts[`db:create-idea-${b}-calculators`] = `tsx prisma/create-idea-${b}-calculators.ts`;
fs.writeFileSync(pkF, JSON.stringify(pk, null, 2) + '\n');
console.log(`${b}: ${pairs.length} tools wired as ${reg}`);
