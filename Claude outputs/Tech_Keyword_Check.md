# Tech, Electronics & General Calculator keyword check (15 Nov 2026)

Checked against the live database (6,940 tools, 179 categories) and every `slug:` in `prisma/` (5,986 slugs). The user didn't supply a category structure ("ata tomi check kore dio"), so the live DB taxonomy was used.

## A. Summary

| | Count |
|---|---|
| Keywords submitted | ≈5,900, sent in 5 chat parts. This is an estimate: the parts were not saved to a file, so they were never counted exactly. |
| Brand, product, app or how-to searches (dropped, no tool possible) | ≈3,700. Examples: Casio/TI/Sharp/HP models, "ti 84 online", "calculator near me", "calculator app", "how to reset calculator", "python calculator code", the spam "calculator+fruit" keywords, magma/ase/pari docs. |
| Already built (merged into existing tools) | ≈1,500 keywords → about 120 existing tools |
| Merged into a new tool (secondary keyword) | ≈450 |
| Needs review | ≈150 keywords in about 25 groups (section E) |
| **Unique new tools** | **115** |

New tools by sub-category:
- Science > Computer, Network & IT (নতুন): 28
- Science > Electrical & Electronics Engineering: 22
- Science > Math: 6
- Science > Scientific & Graphing: 3
- Science > Mechanical & Structural: 3
- Science > Biology & Lab: 1
- Science > Earth, Weather & Environment: 1
- Shopping > Electronics, Energy & Tech: 9
- Shopping > Pricing, Markup & Seller Fee: 1
- House & Garden > HVAC, Plumbing & Electrical: 5
- Business & Industrial > Energy, Solar & Electrical: 2
- Business & Industrial > Manufacturing, Metals & Engineering: 1
- Business & Industrial > HR, Marketing & Business Operations: 8
- Arts & Entertainment > Art, Film & Creator Income: 6
- Arts & Entertainment > Music Theory, Instrument & Audio: 5
- Arts & Entertainment > Books, Reading & Writing: 1
- Arts & Entertainment > Tarot, Astrology & Fun: 7
- Jobs & Education > School Age, Calendar & Classroom: 1
- Jobs & Education > Salary, Income & Career: 1
- Finance > Investment > Investment Returns & Planning: 1
- Travel > Distance, Route & Travel Time: 2
- Law & Government > Government Fees & Public Finance: 1

**Limitations**
- Keywords were matched by intent against tool slugs, titles and descriptions. All 115 planned slugs were checked against the DB and the scripts, and none of them exist.
- One exception: `percentage-calculator` is in `prisma/seed.ts` but **not in the live DB**. It may have been deleted on purpose, so this needs checking.
- **Coverage gap:** the site has no basic percentage, fraction, age, date, time (hours & minutes) or basic calculator. These are very high-volume searches, so they are included as new tools.

## B. Category decisions (new tools)

| # | Keyword (main) | Main Category | Subcategory | কারণ (১ লাইনে) | নিশ্চয়তা |
|---|---|---|---|---|---|
| 1 | subnet calculator | Science | Computer, Network & IT (নতুন) | Network/broadcast/host range from an IPv4 + mask/CIDR. No IT sub exists yet, and 28 tools justify one. | নিশ্চিত |
| 2 | ipv6 subnet calculator | Science | Computer, Network & IT (নতুন) | 128-bit prefixes, so the method and result differ from IPv4. | নিশ্চিত |
| 3 | vlsm calculator | Science | Computer, Network & IT (নতুন) | Splits one block into variable-size subnets by host count. | নিশ্চিত |
| 4 | supernet calculator | Science | Computer, Network & IT (নতুন) | Route summarisation of many networks into one prefix. | নিশ্চিত |
| 5 | chmod calculator | Science | Computer, Network & IT (নতুন) | rwx ↔ octal Linux permissions (+ umask). | নিশ্চিত |
| 6 | cron calculator | Science | Computer, Network & IT (নতুন) | Cron expression → plain English + next run times. | নিশ্চিত |
| 7 | cvss 3.1 calculator | Science | Computer, Network & IT (নতুন) | CVSS v3.1 base/temporal score from vector. | নিশ্চিত |
| 8 | cvss 4.0 calculator | Science | Computer, Network & IT (নতুন) | v4.0 uses a different scoring method, so it is a separate tool. | নিশ্চিত |
| 9 | password entropy calculator | Science | Computer, Network & IT (নতুন) | Entropy bits + crack time from length & character set. | নিশ্চিত |
| 10 | hash calculator | Science | Computer, Network & IT (নতুন) | MD5 / SHA-1 / SHA-256 of text. | মোটামুটি |
| 11 | hex calculator | Science | Computer, Network & IT (নতুন) | Hexadecimal add/subtract/multiply. Math was the alternative. | মোটামুটি |
| 12 | programmer calculator | Science | Computer, Network & IT (নতুন) | Bin/oct/dec/hex base converter (decimal to binary). | নিশ্চিত |
| 13 | two's complement calculator | Science | Computer, Network & IT (নতুন) | Signed binary (1's/2's complement) at a chosen bit width. | নিশ্চিত |
| 14 | bitwise calculator | Science | Computer, Network & IT (নতুন) | AND/OR/XOR/NOT/shift. | নিশ্চিত |
| 15 | unix timestamp calculator | Science | Computer, Network & IT (নতুন) | Epoch ↔ date (incl. Discord timestamps). | নিশ্চিত |
| 16 | uptime / sla calculator | Science | Computer, Network & IT (নতুন) | 99.9% → allowed downtime per day/month/year. Not the same as reliability/MTBF. | নিশ্চিত |
| 17 | iops calculator | Science | Computer, Network & IT (নতুন) | RAID IOPS with write penalty. RAID capacity already exists, and this is performance. | নিশ্চিত |
| 18 | token calculator (openai/llm) | Science | Computer, Network & IT (নতুন) | Text/characters/words → estimated LLM tokens. | নিশ্চিত |
| 19 | ai api cost calculator | Science | Computer, Network & IT (নতুন) | Tokens × per-million price per model. Business was the alternative. | মোটামুটি |
| 20 | infix to postfix calculator | Science | Computer, Network & IT (নতুন) | Stack-based expression conversion (prefix/postfix). | নিশ্চিত |
| 21 | sms segment calculator | Science | Computer, Network & IT (নতুন) | GSM-7/UCS-2 length → number of SMS segments. | নিশ্চিত |
| 22 | discord permissions calculator | Science | Computer, Network & IT (নতুন) | Permission checkboxes ↔ integer bitfield. | মোটামুটি |
| 23 | byte calculator | Science | Computer, Network & IT (নতুন) | Bits/bytes/KB/KiB/GB/TB conversion. | নিশ্চিত |
| 24 | network latency calculator | Science | Computer, Network & IT (নতুন) | Distance → propagation delay, ping + bandwidth-delay product (throughput). | নিশ্চিত |
| 25 | voip bandwidth calculator | Science | Computer, Network & IT (নতুন) | Codec × calls → kbps. | নিশ্চিত |
| 26 | poe calculator | Science | Computer, Network & IT (নতুন) | PoE switch power budget per 802.3af/at/bt class. | নিশ্চিত |
| 27 | website carbon calculator | Science | Computer, Network & IT (নতুন) | Page weight × visits → CO₂ (SWD model). Earth & Environment was the alternative. | মোটামুটি |
| 28 | aws lambda cost calculator | Science | Computer, Network & IT (নতুন) | Requests × duration × memory at published rates. Other AWS/Azure pricing → Review. | মোটামুটি |
| 29 | watts to amps calculator | Science | Electrical & Electronics Engineering | DC/AC 1φ/3φ W↔A↔V with PF. ohms-law has no AC phase or PF. | নিশ্চিত |
| 30 | kva to amps calculator | Science | Electrical & Electronics Engineering | kVA/MVA ↔ amps, 1φ/3φ (transformer FLA). | নিশ্চিত |
| 31 | kva to kw calculator | Science | Electrical & Electronics Engineering | kVA ↔ kW ↔ VA ↔ W through the power factor. | নিশ্চিত |
| 32 | capacitor code calculator | Science | Electrical & Electronics Engineering | 3-digit code (104) ↔ pF/nF/µF + tolerance letter. | নিশ্চিত |
| 33 | op amp gain calculator | Science | Electrical & Electronics Engineering | Inverting/non-inverting gain (differential-amplifier exists separately). | নিশ্চিত |
| 34 | active filter calculator | Science | Electrical & Electronics Engineering | Sallen-Key/Butterworth 2nd-order LP/HP/BP/notch. rc-filter is 1st-order passive. | নিশ্চিত |
| 35 | lm317 calculator | Science | Electrical & Electronics Engineering | Vout = 1.25(1+R2/R1). | নিশ্চিত |
| 36 | boost converter calculator | Science | Electrical & Electronics Engineering | Duty cycle, inductor, capacitor (buck exists). | নিশ্চিত |
| 37 | noise figure calculator | Science | Electrical & Electronics Engineering | NF ↔ noise temp + cascaded (Friis) NF. | নিশ্চিত |
| 38 | eirp calculator | Science | Electrical & Electronics Engineering | Tx power − loss + antenna gain (EIRP/ERP). | নিশ্চিত |
| 39 | far field calculator | Science | Electrical & Electronics Engineering | Antenna far-field distance 2D²/λ. | নিশ্চিত |
| 40 | waveguide calculator | Science | Electrical & Electronics Engineering | Rectangular waveguide cutoff frequency (TE/TM modes). | নিশ্চিত |
| 41 | thermocouple calculator | Science | Electrical & Electronics Engineering | Type K/J/T mV ↔ °C (NIST). | নিশ্চিত |
| 42 | pcb via calculator | Science | Electrical & Electronics Engineering | Via current capacity, resistance, inductance. | নিশ্চিত |
| 43 | inrush current calculator | Science | Electrical & Electronics Engineering | Transformer/motor inrush. | নিশ্চিত |
| 44 | fault current calculator | Science | Electrical & Electronics Engineering | Available short-circuit current (point-to-point). line-to-line-fault is a different method. | নিশ্চিত |
| 45 | buck boost transformer calculator | Science | Electrical & Electronics Engineering | kVA sizing for buck/boost voltage correction. | নিশ্চিত |
| 46 | awg / wire gauge calculator | Science | Electrical & Electronics Engineering | AWG ↔ mm²/diameter, combined gauges, copper weight. wire-size picks a size for a load, which is different. | নিশ্চিত |
| 47 | fuse size calculator | Science | Electrical & Electronics Engineering | Fuse rating for a load/transformer primary (NEC 450). | নিশ্চিত |
| 48 | dmx dip switch calculator | Science | Electrical & Electronics Engineering | DMX address ↔ 9/10 DIP switches. Arts (stage lighting) was the alternative. | মোটামুটি |
| 49 | adc calculator | Science | Electrical & Electronics Engineering | Bits/Vref → LSB, code ↔ voltage. | নিশ্চিত |
| 50 | rf exposure calculator | Science | Electrical & Electronics Engineering | FCC MPE safe distance. | নিশ্চিত |
| 51 | basic calculator | Science | Scientific & Graphing | Simple 4-function online calculator with tape/history (10-key, adding machine, sum). | নিশ্চিত |
| 52 | big number calculator | Science | Scientific & Graphing | Arbitrary-precision arithmetic (large/full precision). | নিশ্চিত |
| 53 | 3d graphing calculator | Science | Scientific & Graphing | z = f(x,y) surface plot. graphing is 2D only. | নিশ্চিত |
| 54 | percentage calculator | Science | Math | X% of Y, X is what % of Y. Missing from the live DB (seed only). | নিশ্চিত |
| 55 | fraction calculator | Science | Math | Add/subtract/multiply/divide fractions. | নিশ্চিত |
| 56 | time calculator | Science | Math | Add/subtract hours & minutes, time duration, movie end time. | নিশ্চিত |
| 57 | date calculator | Science | Math | Days between dates, add/subtract days. | নিশ্চিত |
| 58 | age calculator | Science | Math | Exact age in years/months/days. Jobs & Education was the alternative. | মোটামুটি |
| 59 | factorial calculator | Science | Math | n! (big n). | নিশ্চিত |
| 60 | biosearch tm calculator | Science | Biology & Lab | Primer melting temperature. | নিশ্চিত |
| 61 | tolerance stack up calculator | Science | Mechanical & Structural Engineering | Worst-case + RSS stack-up. | নিশ্চিত |
| 62 | bearing frequency calculator | Science | Mechanical & Structural Engineering | BPFO/BPFI/BSF/FTF fault frequencies. | নিশ্চিত |
| 63 | vibration conversion calculator | Science | Mechanical & Structural Engineering | Displacement ↔ velocity ↔ acceleration at frequency. | নিশ্চিত |
| 64 | e6b flight calculator | Science | Earth, Weather & Environment | Wind triangle, ground speed, fuel, nav log (next to true-airspeed). Travel was the alternative. | মোটামুটি |
| 65 | aspect ratio calculator | Shopping | Electronics, Energy & Tech | 16:9/4:3/9:16 resize & resolution (incl. anamorphic). | নিশ্চিত |
| 66 | led wall calculator | Shopping | Electronics, Energy & Tech | Pixel pitch, cabinets → resolution, size, viewing distance. | নিশ্চিত |
| 67 | hdmi / displayport bandwidth calculator | Shopping | Electronics, Energy & Tech | Resolution × Hz × bit depth → Gbps vs cable spec. | নিশ্চিত |
| 68 | image file size calculator | Shopping | Electronics, Energy & Tech | Pixels × bit depth → MB (next to photo-storage). | নিশ্চিত |
| 69 | ram latency calculator | Shopping | Electronics, Energy & Tech | CAS latency + MT/s → true ns. | নিশ্চিত |
| 70 | subwoofer port calculator | Shopping | Electronics, Energy & Tech | Port length for a tuning frequency (subwoofer-box gives volume only). | মোটামুটি |
| 71 | esteps calculator | Shopping | Electronics, Energy & Tech | 3D printer e-steps / steps-per-mm / Klipper rotation distance. Business Mfg was the alternative. | মোটামুটি |
| 72 | sim racing fov calculator | Shopping | Electronics, Energy & Tech | Correct FOV from screen size & distance. Sports > Motorsports was the alternative. | মোটামুটি |
| 73 | gsd calculator | Shopping | Electronics, Energy & Tech | Drone ground sample distance (next to drone-flight-time). | নিশ্চিত |
| 74 | steam market calculator | Shopping | Pricing, Markup & Seller Fee | Steam 15% fee → seller receives / buyer pays. | নিশ্চিত |
| 75 | conduit bending calculator | House & Garden | HVAC, Plumbing & Electrical | Offset/kick/saddle multipliers & shrink. | নিশ্চিত |
| 76 | pull box calculator | House & Garden | HVAC, Plumbing & Electrical | NEC 314.28 straight/angle pull sizing. | নিশ্চিত |
| 77 | cable pulling tension calculator | House & Garden | HVAC, Plumbing & Electrical | Tension & sidewall pressure through bends. Business was the alternative. | মোটামুটি |
| 78 | led strip power calculator | House & Garden | HVAC, Plumbing & Electrical | Strip length × W/m → driver/PSU size (incl. landscape lighting). | নিশ্চিত |
| 79 | beam angle calculator | House & Garden | HVAC, Plumbing & Electrical | Beam angle + distance → spot diameter. | নিশ্চিত |
| 80 | solar panel string calculator | Business & Industrial | Energy, Solar & Electrical | Panels per string within inverter Voc/MPPT at cold temp. | নিশ্চিত |
| 81 | server power / data center power calculator | Business & Industrial | Energy, Solar & Electrical | Server watts → kWh cost + BTU/h cooling. pc-power-consumption covers home PCs. | মোটামুটি |
| 82 | weld settings calculator (miller) | Business & Industrial | Manufacturing, Metals & Engineering | MIG/TIG/stick amps, voltage, wire speed by thickness. | নিশ্চিত |
| 83 | app development cost calculator | Business & Industrial | HR, Marketing & Business Operations | Features × hours × rate (mobile/software). | নিশ্চিত |
| 84 | msp pricing calculator | Business & Industrial | HR, Marketing & Business Operations | Per-user/per-device managed IT pricing. | নিশ্চিত |
| 85 | ai agent roi calculator | Business & Industrial | HR, Marketing & Business Operations | Hours saved × rate − AI cost (voice agent, chatbot). | নিশ্চিত |
| 86 | test automation roi calculator | Business & Industrial | HR, Marketing & Business Operations | Manual vs automated test cost over releases. | নিশ্চিত |
| 87 | data breach cost calculator | Business & Industrial | HR, Marketing & Business Operations | Records × cost/record + downtime (cybersecurity risk). | মোটামুটি |
| 88 | pert calculator | Business & Industrial | HR, Marketing & Business Operations | (O+4M+P)/6 with σ. | নিশ্চিত |
| 89 | wsjf calculator | Business & Industrial | HR, Marketing & Business Operations | Cost of delay ÷ job size. | নিশ্চিত |
| 90 | sprint velocity calculator | Business & Industrial | HR, Marketing & Business Operations | Avg points/sprint → sprints to finish. | নিশ্চিত |
| 91 | steam revenue calculator | Arts & Entertainment | Art, Film & Creator Income | Reviews × multiplier × price → net game revenue. | নিশ্চিত |
| 92 | timecode calculator | Arts & Entertainment | Art, Film & Creator Income | SMPTE add/subtract, frames ↔ timecode, film footage. | নিশ্চিত |
| 93 | shutter angle calculator | Arts & Entertainment | Art, Film & Creator Income | Angle ↔ shutter speed at fps. | নিশ্চিত |
| 94 | render time calculator | Arts & Entertainment | Art, Film & Creator Income | Frames × time/frame ÷ nodes + render farm cost. | নিশ্চিত |
| 95 | nd filter calculator | Arts & Entertainment | Art, Film & Creator Income | ND stops → new shutter speed (next to photography-exposure). | নিশ্চিত |
| 96 | contrast ratio calculator | Arts & Entertainment | Art, Film & Creator Income | WCAG colour contrast (next to color-theory). | মোটামুটি |
| 97 | spl calculator | Arts & Entertainment | Music Theory, Instrument & Audio | Sensitivity + watts + distance → dB SPL. | নিশ্চিত |
| 98 | crossover calculator | Arts & Entertainment | Music Theory, Instrument & Audio | 2/3-way passive crossover L/C values (+ baffle step). | নিশ্চিত |
| 99 | speaker wire calculator | Arts & Entertainment | Music Theory, Instrument & Audio | Gauge vs length for <5% loss at the speaker impedance. | নিশ্চিত |
| 100 | weber bias calculator | Arts & Entertainment | Music Theory, Instrument & Audio | Tube amp bias current from plate voltage & dissipation. | নিশ্চিত |
| 101 | audio file size calculator | Arts & Entertainment | Music Theory, Instrument & Audio | Sample rate × bit depth × channels × time. | নিশ্চিত |
| 102 | script length calculator | Arts & Entertainment | Books, Reading & Writing | Words/pages → speaking or screen time (text to time). | নিশ্চিত |
| 103 | cs2 trade up calculator | Arts & Entertainment | Tarot, Astrology & Fun | Output float from 10 inputs + odds (float calculator). | মোটামুটি |
| 104 | dnd dpr calculator | Arts & Entertainment | Tarot, Astrology & Fun | Damage per round from attack bonus vs AC (+ hit points). | নিশ্চিত |
| 105 | nether portal calculator | Arts & Entertainment | Tarot, Astrology & Fun | Overworld ↔ Nether coordinates ÷8. | নিশ্চিত |
| 106 | minecraft xp calculator | Arts & Entertainment | Tarot, Astrology & Fun | XP points ↔ levels (+ enchantment cost). | নিশ্চিত |
| 107 | mee6 level calculator | Arts & Entertainment | Tarot, Astrology & Fun | XP needed per MEE6 level (5L²+50L+100). | নিশ্চিত |
| 108 | love calculator | Arts & Entertainment | Tarot, Astrology & Fun | Name-based fun compatibility %. | নিশ্চিত |
| 109 | scrabble point calculator | Arts & Entertainment | Tarot, Astrology & Fun | Word score with letter/word multipliers. | নিশ্চিত |
| 110 | typing speed calculator | Jobs & Education | School Age, Calendar & Classroom | Words/chars ÷ time → WPM & accuracy. Salary & Career was the alternative. | মোটামুটি |
| 111 | time card calculator | Jobs & Education | Salary, Income & Career | Clock in/out with lunch/breaks per day → weekly/biweekly decimal hours & pay. hours-worked only adds daily totals. | মোটামুটি |
| 112 | financial calculator (ba ii plus) | Finance | Investment > Investment Returns & Planning | Full TVM solver N, I/Y, PV, PMT, FV (BA II Plus / HP 12c style). | মোটামুটি |
| 113 | time zone calculator for meetings | Travel | Distance, Route & Travel Time | Best overlapping meeting hours across cities. | মোটামুটি |
| 114 | gps distance calculator | Travel | Distance, Route & Travel Time | Lat/long → great-circle distance & bearing. | নিশ্চিত |
| 115 | ranked choice voting calculator | Law & Government | Government Fees & Public Finance | Instant-runoff rounds from ballots. No better sub exists. | অনিশ্চিত |

## C. Keywords dropped or merged (grouped)

| Keyword(s) | সিদ্ধান্ত ও কারণ | রাখা মূল Tool |
|---|---|---|
| scientific calculator (online/free/app/casio/ti/sharp/desmos scientific, sci, scientifc…) | Already built | scientific-calculator |
| graphing calculator (desmos, ti-84 online, geogebra, casio graphing, polar/graph the function, statistics graphing…) | Already built | graphing-calculator (polar → polar-graphing, piecewise → piecewise-function) |
| cas calculator, rpn / reverse polish | Already built | cas, rpn |
| math solver, calculator that shows work, mathway, symbolab, photomath, ai math, handwriting/camera calculator | Already built (brand names = navigational) | math-solver |
| simplify, polynomial, factoring, matrix (desmos matrix, solve matrix), differentiate, integral, limit, algebra, nsolve, transpose, gauss-jordan, word problem, evaluate expressions, function notation/table, x and y table, complex multiply, quaternion, inverse fourier, discrete math, kmap, boolean algebra/simplification, truth table, logic gate | Already built | simplify, polynomial, factoring, matrix, derivative, integral, limit, algebra, nsolve, matrix-transpose, rref, word-problem, evaluate-expression, function-table, complex-number, quaternion, inverse-fourier-transform, discrete-math, karnaugh-map, boolean-algebra, truth-table |
| sig figs, scientific notation, log / log 2, exponent, absolute value | Already built | significant-figures, scientific-notation, log, log-base-2, exponent, absolute-value-equation |
| stats calculator, invnorm, exponential/cubic regression, histogram, stem and leaf, dot plot, monte carlo, f1 score, confusion matrix, rng, sample size (raosoft, surveymonkey, g*power), a/b test (optimizely, adobe, evan miller), audit/attribute/confidence-reliability sample size, ansi z1.4, ppk, simplex method/tableau | Already built | descriptive-statistics, inverse-normal-distribution, exponential-regression, polynomial-regression, histogram, stem-and-leaf-plot, dot-plot, monte-carlo-simulation, f1-score, random-number-generator, sample-size, power-analysis, ab-test-sample-size, reliability-sample-size, ansi-z14-sampling, cpk, linear-programming |
| binary / decimal-binary arithmetic, ieee 754 / floating point, big o / time complexity, crc / crc32 / crc8 / modbus crc, hamming, rsa, erasure coding / ceph | Already built | binary, ieee-754, big-o, crc, hamming-code, rsa, erasure-coding |
| ohms law, resistor color code (3/4/5 band), smd resistor, led resistor, voltage divider, current divider, parallel/series resistor & circuit, equivalent resistance, wheatstone | Already built | ohms-law, resistor-color-code, smd-resistor-code, led-resistor, voltage-divider, current-divider, series-parallel-circuit, wheatstone-bridge |
| capacitor series/parallel, capacitor charge/discharge, rc time constant, capacitive/inductive reactance, xc, capacitor impedance, capacitor energy, inductor, wire/trace inductance | Already built | capacitor-series-parallel, capacitor-charge-time, capacitive-reactance, inductive-reactance, reactance, capacitor-energy, inductance |
| rc/low/high-pass filter, lc / rf / band-pass filter, rc snubber, rlc, lc resonance/tank, 555 (astable), duty cycle, buck converter, transistor, diode, comparator, transfer function, nodal/mesh analysis, rms / vrms / rms to peak, symmetrical components | Already built | rc-filter, rf-filter, rc-snubber, rlc-circuit, lc-resonance, 555-timer, duty-cycle, buck-converter, transistor, diode, comparator-hysteresis, transfer-function, nodal-analysis, rms-voltage, symmetrical-components |
| pcb trace width/current/resistance, trace/microstrip/stripline/differential/coplanar impedance (jlcpcb), pcb clearance/creepage, pcb cost | Already built | pcb-trace-width, pcb-trace-resistance, pcb-trace-impedance, microstrip-impedance, stripline-impedance, differential-impedance, coplanar-waveguide, pcb-clearance, pcb-assembly-cost |
| antenna (dipole, j-pole, yagi, horn, patch, helical), link budget, fspl / path loss / friis, fresnel, line of sight / radio horizon, vswr / return loss, coax loss / rf cable / insertion loss, attenuator (pi/t/pad), skin depth/effect, noise floor / thermal noise, snr, ber, jitter, dbm ↔ watts/volts, rf wavelength, impedance matching, coax/cable impedance | Already built | dipole-antenna, j-pole-antenna, yagi-antenna, horn-antenna, patch-antenna, link-budget, free-space-path-loss, fresnel-zone, rf-line-of-sight, horizon-distance, vswr, coax-cable-loss, rf-attenuator, skin-depth, noise-floor, snr, bit-error-rate, phase-noise-jitter, dbm-to-watts, wavelength-frequency, impedance-matching, transmission-line |
| voltage drop (3 phase, dc, southwire, mm2, AU, voltage rise), cable/wire size (ampacity, derating, AU/UK, solar, 12v, earthing, HV, abyc), wire resistance, three-phase power/current/kW, power factor (kvar, apparent power, power triangle), kw, transformer size/turns/winding, motor FLA / hp to amps / vfd, arc flash/fault, busbar, heat trace, rtd/pt100, ntc thermistor, 4-20 mA, cable bundle | Already built | voltage-drop, wire-size, wire-resistance, three-phase-power, power-factor, kw, transformer-size, transformer-turns-ratio, motor, arc-flash, busbar, heat-trace, pt100, thermistor, 4-20ma, cable-bundle-diameter |
| conduit fill (raceway, wire/pipe/cable tray fill, southwire, nec, emt, pvc), box fill / junction box size, breaker size, electrical/panel/whole-house load, generator size, ac wire size, lumens ↔ watts, lighting layout (garage, high bay, can light), electrical work estimate | Already built | conduit-fill, box-fill, breaker-size, electrical-load, generator-size, ac-amps, lumens, lighting-layout, recessed-lighting-spacing, electrical-bid |
| ups runtime/sizing/va (apc), battery life/runtime/drain, battery pack (18650), battery charge time (solar charging), Ah / Wh, power bank, power station (jackery), inverter / dc to ac, solar battery / powerwall, victron mppt | Already built | ups-battery-backup, battery-life, battery-pack, battery-charge-time, watt-hours, power-bank, portable-power-station, inverter-size, solar-battery, solar-charge-controller |
| psu / power supply (outervision, newegg, msi, corsair, be quiet), bottleneck (cpu/gpu/ram), pc wattage/power draw, pc worth/value/laptop, pc build price, vram (llm), ram size, edpi & sens converters (valorant, cs2, apex, r6, fortnite, overwatch, cm/360, psa), mouse dpi | Already built | pc-power-supply, pc-bottleneck, pc-power-consumption, pc-worth, pc-build-price, vram, ram-size, edpi, mouse-sensitivity |
| tv size/distance/viewing angle, tv mount height, projector throw/distance/ratio (epson, benq, optoma, panasonic), projector screen size, screen/monitor dimensions & diagonal, ppi / pixel density / retina, megapixel / print size, crop factor, fov / lens / angle of view, dof, timelapse | Already built | tv-size, tv-mounting-height, projector-throw-distance, projector-screen-size, screen-dimensions, monitor-ppi, megapixel-print-size, crop-factor, field-of-view, depth-of-field, timelapse |
| download/upload/transfer time & speed, bandwidth (streaming, cdn, business), internet speed need, data usage, video bitrate (twitch, obs, h264/h265, bits per pixel), video file size (prores, arri, red), cctv/nvr/dvr/hikvision storage & bandwidth, hdd/storage size, raid (zfs, raidz, shr, synology, qnap, truenas, unraid, raid 5/6/10/60), cloud storage cost | Already built | download-time, bandwidth, internet-speed, data-usage, video-bitrate, video-file-size, security-camera-storage, hard-drive-size, raid, cloud-storage-cost |
| subwoofer box (sub box, enclosure, volume, wedge), speaker impedance / wiring / ohms, speaker wattage, headphone power/amp, speaker coverage / placement / ceiling, studio monitor placement, room mode, reverb time/delay/bpm, tempo to ms, tone stack, audio delay, decibel / db gain / db to watts, acoustic panels/treatment, helmholtz | Already built | subwoofer-box, speaker-impedance, speaker-wattage, headphone-impedance, qsc-speaker-coverage, studio-monitor-placement, room-mode, reverb-time, tempo-to-ms, tone-stack, audio-delay, decibel, acoustic-panels, helmholtz-resonator |
| playlist length (youtube, spotify), playback/video/audio speed (1.25x, 1.5x, 2x), audiobook, spotify streams/royalties, photography exposure (sunny 16, f-stop, shutter speed, pinhole, film), telescope focal ratio, rayleigh range | Already built | playlist, speed-playback, audiobook, spotify-royalty, photography-exposure, telescope, gaussian-beam |
| mining (gpu, asic, btc, monero, ravencoin, zcash, hash rate, solo) | Already built | crypto-mining-profitability |
| work hours / hours worked / employee hours, paycheck (gusto, quickbooks, intuit, paylocity, paycom, ukg), w-4, overtime (turbotax), bonus, employee cost, productivity / efficiency, call center / erlang c, it support cost, saas/erp/crm/lms roi & tco, rpa / ap automation roi, website price, downtime cost, nps, die per wafer, o-ring, thread / acme, milling feeds & speeds (cnc), welding rod, heat sink, cpk, reliability / mtbf / mttr, beam/truss/moment, gear/planetary/rack & pinion, v-belt, spring, garage door spring, plywood / cut list, 3d print cost, check digit (gs1, upc, gtin, sscc, barcode) | Already built | hours-worked, paycheck, tax-withholding, overtime, bonus, employee-cost, productivity, call-center-staffing, erlang-b, it-support-cost, saas-tco, rpa-roi, website-design-price, downtime-cost, nps, die-per-wafer, o-ring, thread, milling-speed-feed, welding, heat-sink, cpk, reliability, beam-load, truss, gear-ratio, planetary-gear, belt-size, spring, garage-door-spring-size, plywood-cut, 3d-print-price, check-digit |
| Excel/Sheets/app versions of existing intents (budget, vat, margin, markup, npv, roi, compound interest, inflation, yoy, gpa, grade, calorie, tip, paycheck, food cost, percent change/difference, carbon footprint, sales tax quickbooks, etsy fee, amazon fba, forex lot size mt4/mt5, schoology/skyward/focus grade, ap csa, ats resume, concept 2 erg, roof area google maps, duct size/manual d, eds load, crypto tax) | Merged (same calculation, the platform word is extra) | budget/vat/margin/markup/npv/roi/compound-interest/inflation/year-over-year-growth/gpa/final-grade/tip/paycheck/food-cost/percentage-change/percent-difference/carbon-footprint/etsy-fee/amazon-fba-fee/forex-lot-size/ap-csa-score/ats-score/rowing-split/duct-size/manual-j-load |
| ipv4/ip/cidr/netmask/wildcard/broadcast/network address/ip range/gateway/visual/jodies/solarwinds/mxtoolbox subnet | Merged into new tool #1 | subnet-calculator |
| linux / unix / umask / permissions calculator | Merged into new tool #5 | chmod-calculator |
| crontab, cron job, cron schedule | Merged into new tool #6 | cron-expression-calculator |
| cvss v3 / 3.1 / score / cve score / first cvss | Merged into new tool #7 | cvss-3-1-calculator |
| password strength / crack time / combination | Merged into new tool #9 | password-entropy-calculator |
| md5, sha256, checksum | Merged into new tool #10 | hash-calculator |
| decimal to binary, programmer/programming calculator | Merged into new tool #12 | programmer-calculator |
| xor, and, or, bit shift, left shift | Merged into new tool #14 | bitwise-calculator |
| epoch, unix time, timestamp difference, discord time | Merged into new tool #15 | unix-timestamp-calculator |
| sla, downtime, availability, slo, system availability | Merged into new tool #16 | uptime-sla-calculator |
| openai/chatgpt/claude/gpt/llm token, character/text to token | Merged into new tool #18 | llm-token-calculator |
| token cost, llm cost/pricing, openai/claude/gemini api cost | Merged into new tool #19 | ai-api-cost-calculator |
| watts↔amps↔volts, amp/watt calculator, ohms to amps, kw to amps (3φ), current/amp draw | Merged into new tool #29 | watts-to-amps-calculator |
| va/kva ↔ watts/kw, watts to va, kva calculator | Merged into new tool #31 | kva-to-kw-calculator |
| butterworth, sallen key, notch, 2nd-order low pass | Merged into new tool #34 | active-filter-calculator |
| short circuit, available fault current, aic, transformer fault/impedance | Merged into new tool #44 | fault-current-calculator |
| wire gauge, awg, combined wire gauge, copper wire weight | Merged into new tool #46 | awg-wire-gauge-calculator |
| 10 key, adding machine, simple/four-function/online calculator, sum multiple numbers, add decimals | Merged into new tool #51 | basic-calculator |
| hours and minutes, add up time, time duration, movie end time, elapsed time | Merged into new tool #56 | time-calculator |
| 16:9 / 4:3 / 9:16 / 4:5, screen/pixel/video/photo ratio, resolution, anamorphic | Merged into new tool #65 | aspect-ratio-calculator |
| video wall, pixel pitch, absen | Merged into new tool #66 | led-video-wall-calculator |
| port length, ported box, bass reflex, port tuning, precision port | Merged into new tool #70 | subwoofer-port-calculator |
| e-steps, steps per mm, klipper rotation distance, stepper motor | Merged into new tool #71 | esteps-calculator |
| steam tax / profit / market | Merged into new tool #74 | steam-market-fee-calculator |
| offset bend, conduit bend | Merged into new tool #75 | conduit-bending-calculator |
| frames, frame rate, film footage, rob's timecode | Merged into new tool #92 | timecode-calculator |
| time clock, timesheet (with lunch/breaks/biweekly/decimal), punch clock, redcort, 1728, kronos | Merged into new tool #111 | time-card-calculator |
| ba ii plus, hp 12c, hp 10bii, financial calculator | Merged into new tool #112 | financial-calculator |
| Casio/TI/Sharp/Canon/Victor/HP model names, "online ti-84", calculator watch/price/buy/near me/charger/battery, calculator app/download/widget/vault/hide, how-to/what-is questions, "python/java/html calculator code", fruit+calculator spam, magma/ase/pari docs | Dropped: brand, product, app or informational. No calculation to build. | — |

## D. Clean Final List

**Science Calculators**
- Computer, Network & IT Calculators (নতুন): subnet, IPv6 subnet, VLSM, supernet, chmod, cron expression, CVSS 3.1, CVSS 4.0, password entropy, hash, hex, programmer (base converter), two's complement, bitwise, unix timestamp, uptime/SLA, IOPS, LLM token, AI API cost, infix-postfix, SMS segment, Discord permissions, byte (data size), network latency, VoIP bandwidth, PoE, website carbon, AWS Lambda cost
- Electrical & Electronics Engineering Calculators: watts to amps, kVA to amps, kVA to kW, capacitor code, op-amp gain, active filter, LM317, boost converter, noise figure, EIRP, far field, waveguide cutoff, thermocouple, PCB via, inrush current, fault current, buck-boost transformer, AWG wire gauge, fuse size, DMX DIP switch, ADC resolution, RF exposure
- Scientific & Graphing Calculators: basic calculator, big number, 3D graphing
- Math Calculators: percentage, fraction, time (hours & minutes), date, age, factorial
- Mechanical & Structural Engineering Calculators: tolerance stack-up, bearing fault frequency, vibration conversion
- Biology & Lab Calculators: primer Tm
- Earth, Weather & Environment Calculators: E6B flight

**Shopping Calculators**
- Electronics, Energy & Tech Calculators: aspect ratio, LED video wall, display (HDMI/DP) bandwidth, image file size, RAM latency, subwoofer port, e-steps, sim racing FOV, drone GSD
- Pricing, Markup & Seller Fee Calculators: Steam market fee

**House & Garden Calculators**
- HVAC, Plumbing & Electrical Calculators: conduit bending, pull box, cable pulling tension, LED strip power, beam angle

**Business & Industrial Calculators**
- Energy, Solar & Electrical Calculators: solar panel string, server/data center power
- Manufacturing, Metals & Engineering Calculators: weld settings
- HR, Marketing & Business Operations Calculators: app development cost, MSP pricing, AI agent ROI, test automation ROI, data breach cost, PERT, WSJF, sprint velocity

**Arts & Entertainment Calculators**
- Art, Film & Creator Income Calculators: Steam revenue, timecode, shutter angle, render time, ND filter, color contrast
- Music Theory, Instrument & Audio Calculators: speaker SPL, crossover, speaker wire, tube amp bias, audio file size
- Books, Reading & Writing Calculators: script length
- Tarot, Astrology & Fun Calculators: CS2 trade-up, D&D DPR, Minecraft nether portal, Minecraft XP, MEE6 level, love, Scrabble score

**Jobs & Education Calculators**
- School Age, Calendar & Classroom Calculators: typing speed
- Salary, Income & Career Calculators: time card

**Finance Calculators**
- Investment > Investment Returns & Planning Calculators: financial (TVM / BA II Plus)

**Travel Calculators**
- Distance, Route & Travel Time Calculators: time zone meeting, GPS coordinates distance

**Law & Government Calculators**
- Government Fees & Public Finance Calculators: ranked choice voting

## E. Review Notes

**No new tool: vendor pricing.** AWS (EC2, RDS, S3, Fargate, Bedrock, DocumentDB, OpenSearch, egress, savings plan, TCO), Azure (VM, AVD, SQL, backup, files, Databricks, DevOps, Fabric, Sentinel, TCO), GCP/BigQuery/Cloud Run/Cloud SQL, OCI, Snowflake, Databricks, MongoDB, Firebase, Vercel, Cloudflare/R2, Backblaze, DigitalOcean, GitHub, Atlassian/Jira, Datadog, Splunk, Salesforce, NetSuite, Sage, Acumatica, ServiceNow, Intercom, Airbyte, Twilio, Nerdio, VMware/Veeam/Nutanix/Red Hat/Meraki/Windows Server/SQL Server/Oracle licensing.
- These prices change often, and every vendor already has an official calculator.
- Only AWS Lambda was kept (#28), because its formula is simple.
- Should we build a few generic "cloud VM cost" or "SQL Server core licensing" tools?

**No new tool: needs game data or a benchmark database.** FPS calculators (pc/laptop/game/fortnite/valorant/rust), PC benchmark/performance, OSRS/ARK/Epic Seven/Star Citizen DPS, Skyrim perk/alchemy, Fallout 4, Titan Quest, D2 runes, Project Diablo, WoW talents, Mythic+ score, Pokémon GO evolve, MTG bracket, Factorio, Borderlands 4, GBF spark, Roblox games (Grow a Garden, Steal a Brainrot, FNAF TD, MM2), Uma rank, NCAA 26 hard sell, Minecraft crafting/server RAM/circle, CS2/Steam inventory value.

**No Health main category.** Sleep calculator (sleepyti.me), TOLAC, AAPC E/M coding, ASHA workload, due date (Excel). Same rule as the fitness batch.

**Looks / AI fun with no real formula:** golden ratio face, facial/photo/AI age, looksmax, mogger, AI love calculator. The love calculator (#108) is kept as name-based fun only.

**Software, plugins and builders (not calculators):** WooCommerce/Shopify/BigCommerce/Magento shipping plugins, WordPress/Webflow calculator plugins, calculator builder/widget/embed, quote/estimation builders, convert Excel to web page.

**Document generators (do not build):** pay stub / check stub / bank statement generators.

**Security / bypass (do not build):** Nissan BCM PIN, Ford incode, HID/Brivo card format.

**Vague or unclear:** sag, curve, grid, raster, tally, screen time, pomodoro, cps (clicks per second), yes/no, 4/20, 7/11, dla, dg labor, erc, ees, nds, apm, ape, pau, ma, sus, chocolate bar, harmonics, k-factor, neutral sizing, earthing design, relay, PID tuning, STM32 timer, EARFCN, MTU, PCIe lanes, TDP, Unifi capacity, linear actuator, involute spline, AWC wood connection, structural frame, STC wall rating, screen-printing emulsion exposure, heat shrink, pentest/PCI cost, cloud migration/private cloud/colocation, data migration, load testing, live streaming/chatbot cost, software maintenance, Tableau→Power BI migration, SaaS revenue, AES/DES, regex, JSON/string/text length, word counter, stone→pounds converter, TSI score, SPRS score, EPSS (FIRST model), SSVC, cyclomatic complexity, lambda calculus.

**Questions for you (অনিশ্চিত)**
1. **Computer, Network & IT** is a new Science sub with 28 tools. Should we also move raid, erasure-coding, binary, ieee-754, big-o, crc, hamming-code and bloom-filter into it?
2. **percentage-calculator** is in seed.ts but not in the live DB. Was it deleted on purpose?
3. **Ranked choice voting (#115):** OK to put it in Law & Government > Government Fees & Public Finance, or should it go to Review?
4. **Time card (#111):** a separate tool, or extend hours-worked with in/out and lunch fields?
