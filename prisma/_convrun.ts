import * as E from "../src/lib/calc-engine-idea-conv1";
let bad = 0;
for (const c of E.CONVS) {
  for (const d of [0, 1]) { try { const o = c.fn({ x: c.ex, d, p: 0 } as never) as Record<string, string>; if (/NaN|undefined|—/.test(JSON.stringify(o))) { bad++; console.log("BAD", c.slug, d, JSON.stringify(o)); } } catch (e) { bad++; console.log("ERR", c.slug, d, (e as Error).message); } }
}
const show = (s: string) => { const c = E.CONVS.find((x) => x.slug === s)!; const o = c.fn({ x: c.ex, d: 0, p: 0 } as never) as Record<string, string>; console.log(s, "|", c.title, "|", o.r, "|", o.f, "|", c.how.slice(0, 90)); };
["inches-to-centimeters-converter","celsius-to-fahrenheit-converter","fahrenheit-to-celsius-converter","mpg-to-liters-per-100km-converter","mpg-to-uk-mpg-converter","kml-to-mpg-converter","psi-to-bar-converter","electronvolts-to-joules-converter","acres-to-hectares-converter","months-to-weeks-converter","degrees-to-radians-converter","moa-to-mrad-converter","mbps-to-mb-per-second-converter","cups-to-milliliters-converter","stone-to-pounds-converter","celsius-to-rankine-converter","kelvin-to-celsius-converter","tons-of-refrigeration-to-btu-per-hour-converter","curies-to-becquerels-converter","grams-to-tolas-converter"].forEach((s) => { try { show(s); } catch { console.log("MISSING", s); } });
console.log("bad", bad, "of", E.CONVS.length * 2);
