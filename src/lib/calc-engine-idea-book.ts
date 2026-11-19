/**
 * Idea build, batch book (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Arts & Entertainment > Books, Reading & Writing (41 tools).
 * Readability: Gunning Fog 0.4(words/sentences + 100·complex/words); SMOG 1.043√(poly·30/sent) + 3.1291;
 * Coleman–Liau 0.0588L − 0.296S − 15.8; ARI 4.71(chars/words) + 0.5(words/sent) − 21.43.
 * Syllables use a vowel-group heuristic. KDP: 70% royalty $2.99–$9.99 minus $0.15/MB delivery,
 * otherwise 35%; paperback 60% of list minus printing ($1.00 + $0.012/page B&W).
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${Math.round(min % 60)} min` : `${Math.round(min)} min`);
const WPP = [275, 250, 300, 180, 250, 500];
export const pageCount: Calc = (v) => {
  const w = p(v, "words", 80000), wpp = WPP[pick(v.font, WPP.length)];
  const pages = Math.ceil(w / wpp);
  return { pages: `${nfmt(pages)} pages`, wpp: `${wpp} words per page`, spine: `${(pages * 0.0025).toFixed(3)} in spine on white paper` };
};
export const readingSpeed: Calc = (v) => {
  const words = need(p(v, "words", 500), "Enter words read."), sec = need(p(v, "sec", 120), "Enter seconds taken.");
  const wpm = (words / sec) * 60;
  return { wpm: `${nfmt(wpm)} words per minute`, level: wpm < 150 ? "Below average" : wpm < 300 ? "Average adult (200–300 wpm)" : wpm < 450 ? "Fast reader" : "Very fast / skimming", book: `${hm(80000 / wpm)} for an 80,000-word novel` };
};
export const audiobookLength: Calc = (v) => {
  const w = p(v, "words", 90000), wpm = need(p(v, "wpm", 155), "Enter narration speed."), speed = p(v, "speed", 1);
  const min = w / wpm;
  return { len: hm(min), atSpeed: `${hm(min / Math.max(speed, 0.1))} at ${speed}× playback`, pfh: `${(min / 60).toFixed(1)} finished hours` };
};
export const kdpRoyalty: Calc = (v) => {
  const type = pick(v.type, 2), price = need(p(v, "price", 4.99), "Enter a list price."), mb = p(v, "mb", 2), pages = p(v, "pages", 300), sold = p(v, "sold", 100);
  let r: number, note: string;
  if (type === 0) { if (price >= 2.99 && price <= 9.99) { r = price * 0.7 - mb * 0.15; note = "70% royalty minus $0.15/MB delivery"; } else { r = price * 0.35; note = "35% royalty (outside $2.99–$9.99)"; } }
  else { const print = 1 + 0.012 * pages; r = price * 0.6 - print; note = `60% of list minus ${$(print)} printing`; }
  return { per: $(r), total: $(r * sold) + ` for ${nfmt(sold)} sales`, note };
};
export const selfPubCost: Calc = (v) => {
  const words = p(v, "words", 80000), edit = p(v, "edit", 0.02), cover = p(v, "cover", 500), format = p(v, "format", 300), isbn = p(v, "isbn", 125), mkt = p(v, "mkt", 500), proof = p(v, "proof", 0.008);
  const total = words * (edit + proof) + cover + format + isbn + mkt;
  return { total: $(total, 0), editing: $(words * edit, 0) + " editing", proof: $(words * proof, 0) + " proofreading", other: `${$(cover, 0)} cover · ${$(format, 0)} formatting · ${$(isbn, 0)} ISBN · ${$(mkt, 0)} marketing` };
};
export const printCost: Calc = (v) => {
  const pages = need(p(v, "pages", 300), "Enter page count."), ink = pick(v.ink, 3), qty = p(v, "qty", 1);
  const per = ink === 0 ? 1 + 0.012 * pages : ink === 1 ? 1 + 0.036 * pages : 1 + 0.07 * pages;
  return { cost: $(per) + " per copy", total: $(per * qty) + ` for ${nfmt(qty)}`, minPrice: $(per / 0.6) + " minimum list price at 60% royalty" };
};
export const writingPace: Calc = (v) => {
  const goal = p(v, "goal", 80000), done = p(v, "done", 10000), days = need(p(v, "days", 90), "Enter days left."), off = p(v, "off", 2);
  const writeDays = days * (7 - off) / 7, perDay = (goal - done) / writeDays;
  return { perDay: `${nfmt(Math.max(0, perDay))} words per writing day`, week: `${nfmt(Math.max(0, perDay) * (7 - off))} words a week`, pct: `${((100 * done) / Math.max(goal, 1)).toFixed(1)}% done` };
};
export const nanowrimo: Calc = (v) => {
  const day = Math.min(30, Math.max(1, Math.round(p(v, "day", 10)))), done = p(v, "done", 15000), goal = p(v, "goal", 50000);
  const target = (goal / 30) * day, left = goal - done, daysLeft = 30 - day + 1;
  return { perDay: `${nfmt(left / daysLeft)} words a day from today`, par: `${nfmt(target)} words is on pace for day ${day}`, status: done >= target ? `${nfmt(done - target)} words ahead` : `${nfmt(target - done)} words behind` };
};
const SP = [120, 140, 160, 180];
export const speechLength: Calc = (v) => {
  const w = p(v, "words", 1000), wpm = SP[pick(v.pace, 4)], target = p(v, "target", 5);
  return { len: hm(w / wpm), words: `${nfmt(target * wpm)} words for a ${target}-minute speech`, pace: `${wpm} words per minute` };
};
const EPP = [275, 550, 400];
export const essayPages: Calc = (v) => {
  const w = p(v, "words", 1500), e = EPP[pick(v.sp, 3)];
  return { pages: `${(w / e).toFixed(1)} pages`, wpp: `${e} words per page`, para: `≈ ${Math.round(w / 150)} paragraphs of 150 words` };
};
export const translationCost: Calc = (v) => {
  const w = p(v, "words", 5000), rate = p(v, "rate", 0.12), rush = p(v, "rush", 0) / 100, cert = p(v, "cert", 0), min = p(v, "min", 50);
  const total = Math.max(min, w * rate) * (1 + rush) + cert;
  return { total: $(total), days: `${Math.ceil(w / 2500)} working days at 2,500 words a day`, note: `${$(rate, 3)} per word${rush ? `, +${(rush * 100).toFixed(0)}% rush` : ""}` };
};
export const writingRate: Calc = (v) => {
  const words = need(p(v, "words", 1500), "Enter article length."), price = p(v, "price", 300), hrs = p(v, "hrs", 4), target = p(v, "target", 60);
  return { perWord: `${$(price / words, 3)} per word`, hourly: `${$(price / Math.max(hrs, 0.1))} per hour`, quote: `${$(target * hrs)} quote to earn ${$(target, 0)}/hour (${$((target * hrs) / words, 3)}/word)` };
};
const ER = [0.015, 0.025, 0.04, 0.075];
export const editingCost: Calc = (v) => {
  const w = p(v, "words", 80000), t = pick(v.type, 4), rate = ER[t];
  return { cost: $(w * rate, 0), range: `${$(w * rate * 0.7, 0)} – ${$(w * rate * 1.4, 0)}`, time: `${Math.ceil(w / [10000, 6000, 3500, 2500][t])} working days` };
};
export const readingGoal: Calc = (v) => {
  const goal = p(v, "goal", 52), read = p(v, "read", 20), dayOfYear = Math.min(365, Math.max(1, p(v, "doy", 200))), pages = p(v, "pages", 320);
  const left = goal - read, days = 366 - dayOfYear, onPace = (goal * dayOfYear) / 365;
  return { pace: `${(left / Math.max(days / 7, 1e-9)).toFixed(2)} books a week to finish`, pages: `${nfmt((left * pages) / Math.max(days, 1))} pages a day`, status: read >= onPace ? `${(read - onPace).toFixed(1)} books ahead of schedule` : `${(onPace - read).toFixed(1)} books behind` };
};
export const pagesPerDay: Calc = (v) => {
  const pages = p(v, "pages", 400), done = p(v, "done", 0), days = need(p(v, "days", 14), "Enter days."), ppm = p(v, "ppm", 1.2);
  const per = (pages - done) / days;
  return { per: `${Math.ceil(per)} pages a day`, time: `${hm(per / Math.max(ppm, 0.01))} of reading a day`, finish: `${pages - done} pages left` };
};
const BC = [1189, 260, 929, 150, 89];
export const biblePlan: Calc = (v) => {
  const ch = BC[pick(v.part, BC.length)], days = need(p(v, "days", 365), "Enter the number of days.");
  return { per: `${(ch / days).toFixed(2)} chapters a day`, time: `${hm((ch / days) * 4)} a day at about 4 minutes per chapter`, total: `${ch} chapters in ${days} days` };
};
// ---- text analysis
const syl = (w: string) => { const s = w.toLowerCase().replace(/[^a-z]/g, ""); if (!s) return 0; if (s.length <= 3) return 1; const m = s.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1); };
function stats(v: Record<string, number>) {
  const t = txt(v, "text");
  const words = t.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  if (words.length < 3) throw new InputError("Paste at least a sentence or two of text.");
  const sentences = Math.max(1, (t.match(/[.!?]+(\s|$)/g) || []).length);
  const letters = (t.match(/[a-z]/gi) || []).length, sy = words.map(syl), poly = sy.filter((x) => x >= 3).length;
  return { w: words.length, s: sentences, letters, chars: t.replace(/\s/g, "").length, syl: sy.reduce((a, b) => a + b, 0), poly };
}
const grade = (g: number) => (g < 6 ? "Easy (elementary)" : g < 9 ? "Plain English (middle school)" : g < 13 ? "High school level" : g < 17 ? "College level" : "Graduate / professional");
export const gunningFog: Calc = (v) => { const s = stats(v); const g = 0.4 * (s.w / s.s + (100 * s.poly) / s.w); return { idx: g.toFixed(1), level: grade(g), counts: `${s.w} words · ${s.s} sentences · ${s.poly} complex words` }; };
export const smog: Calc = (v) => { const s = stats(v); const g = 1.043 * Math.sqrt((s.poly * 30) / s.s) + 3.1291; return { idx: g.toFixed(1), level: grade(g), counts: `${s.poly} words of 3+ syllables in ${s.s} sentences${s.s < 30 ? " (SMOG is designed for 30+ sentences)" : ""}` }; };
export const colemanLiau: Calc = (v) => { const s = stats(v); const L = (s.letters / s.w) * 100, S = (s.s / s.w) * 100, g = 0.0588 * L - 0.296 * S - 15.8; return { idx: g.toFixed(1), level: grade(g), counts: `${L.toFixed(1)} letters and ${S.toFixed(1)} sentences per 100 words` }; };
export const ari: Calc = (v) => { const s = stats(v); const g = 4.71 * (s.chars / s.w) + 0.5 * (s.w / s.s) - 21.43; return { idx: g.toFixed(1), level: grade(g), counts: `${(s.chars / s.w).toFixed(2)} characters per word · ${(s.w / s.s).toFixed(1)} words per sentence` }; };
export const tweetLength: Calc = (v) => {
  const t = txt(v, "text"), n = [...t].length, urls = (t.match(/https?:\/\/\S+/g) || []);
  const xCount = n - urls.reduce((a, u) => a + [...u].length, 0) + urls.length * 23;
  return { x: `${xCount} / 280 characters on X${xCount > 280 ? " — too long" : ""}`, chars: `${n} characters, ${t.split(/\s+/).filter(Boolean).length} words`, other: `Threads ${n}/500 · Bluesky ${n}/300 · Instagram caption ${n}/2,200 · SMS ${Math.ceil(n / 160)} segment(s)` };
};
export const coverBleed: Calc = (v) => {
  const w = p(v, "w", 6), h = p(v, "h", 9), pages = p(v, "pages", 300), paper = pick(v.paper, 3), bleed = 0.125;
  const spine = pages * [0.002252, 0.0025, 0.002347][paper], fw = 2 * w + spine + 2 * bleed, fh = h + 2 * bleed;
  return { size: `${fw.toFixed(3)} × ${fh.toFixed(3)} in full cover`, spine: `${spine.toFixed(3)} in spine`, px: `${Math.round(fw * 300)} × ${Math.round(fh * 300)} px at 300 DPI` };
};
export const ebookSize: Calc = (v) => {
  const words = p(v, "words", 80000), imgs = p(v, "imgs", 10), kb = p(v, "kb", 300);
  const mb = (words * 6) / 1e6 * 0.4 + (imgs * kb) / 1024 + 0.1;
  return { mb: `${mb.toFixed(2)} MB`, fee: `${$(mb * 0.15)} KDP delivery fee per sale at 70%`, note: imgs ? `${imgs} images at ${kb} KB` : "text only" };
};
export const bookClub: Calc = (v) => {
  const pages = p(v, "pages", 350), meetings = need(p(v, "meet", 4), "Enter meetings."), weeksBetween = p(v, "wk", 1);
  const per = pages / meetings;
  return { per: `${Math.ceil(per)} pages before each meeting`, daily: `${Math.ceil(per / (7 * Math.max(weeksBetween, 0.1)))} pages a day`, span: `${meetings * weeksBetween} weeks to finish` };
};
export const haiku: Calc = (v) => {
  const lines = txt(v, "text").split(/\n|\//).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new InputError("Type your poem, one line per row or separated by /.");
  const counts = lines.map((l) => l.split(/\s+/).filter(Boolean).reduce((a, w) => a + syl(w), 0));
  const isHaiku = counts.length === 3 && counts[0] === 5 && counts[1] === 7 && counts[2] === 5;
  return { counts: counts.join(" – ") + " syllables", haiku: isHaiku ? "Yes — 5-7-5 haiku" : `Not 5-7-5 (${counts.length} lines)`, total: `${counts.reduce((a, b) => a + b, 0)} syllables in total` };
};
export const screenplayMinute: Calc = (v) => {
  const pages = p(v, "pages", 12), eighths = p(v, "e", 0), genre = pick(v.g, 3);
  const mpp = [1, 1.2, 0.8][genre], tot = pages + eighths / 8;
  return { min: hm(tot * mpp), mpp: `${mpp} min per page`, note: `${tot.toFixed(3)} pages (scene length in eighths: ${Math.round(tot * 8)}/8)` };
};
export const comicPanels: Calc = (v) => {
  const pages = p(v, "pages", 22), panels = p(v, "ppp", 5), mins = p(v, "mins", 60), rate = p(v, "rate", 150);
  const tot = pages * panels;
  return { panels: `${nfmt(tot)} panels`, time: `${((tot * mins) / 60).toFixed(0)} hours of art`, cost: `${$(pages * rate, 0)} at ${$(rate, 0)} per page` };
};
export const advanceEarnout: Calc = (v) => {
  const adv = p(v, "adv", 10000), price = need(p(v, "price", 26), "Enter list price."), roy = p(v, "roy", 10) / 100, ebook = p(v, "eb", 25) / 100, ebShare = p(v, "es", 20) / 100, ebPrice = p(v, "ebp", 9.99);
  const perPrint = price * roy, perEb = ebPrice * 0.7 * ebook, blended = perPrint * (1 - ebShare) + perEb * ebShare;
  return { copies: `${nfmt(Math.ceil(adv / blended))} copies to earn out`, per: `${$(blended)} royalty per copy (blended)`, note: `${$(perPrint)} hardcover · ${$(perEb)} ebook` };
};
export const kuEarnings: Calc = (v) => {
  const pages = p(v, "pages", 50000), rate = p(v, "rate", 0.0045);
  return { earn: $(pages * rate), rate: `${$(rate, 5)} per KENP page read`, book: `${$(rate * p(v, "kenp", 350))} per full read of a ${p(v, "kenp", 350)}-page book` };
};
export const blogReading: Calc = (v) => {
  const words = p(v, "words", 1800), imgs = p(v, "imgs", 4), wpm = need(p(v, "wpm", 238), "Enter reading speed.");
  const sec = (words / wpm) * 60 + Math.max(0, 12 * imgs - Math.max(0, imgs - 10) * 9);
  return { time: `${Math.max(1, Math.round(sec / 60))} min read`, sec: `${Math.round(sec)} seconds`, note: `${wpm} wpm + image viewing time (Medium method)` };
};
export const dsPages: Calc = (v) => {
  const w = p(v, "words", 2500), font = pick(v.font, 3), wpp = [275, 250, 300][font];
  return { pages: `${(w / wpp).toFixed(1)} pages double-spaced`, single: `${(w / (wpp * 2)).toFixed(1)} pages single-spaced`, words: `${wpp} words per double-spaced page` };
};
export const slidesPerMin: Calc = (v) => {
  const mins = p(v, "mins", 20), spm = p(v, "spm", 1), qa = p(v, "qa", 5);
  const talk = Math.max(0, mins - qa);
  return { slides: `${Math.round(talk * spm)} slides`, words: `${nfmt(talk * 140)} words of speaking at 140 wpm`, note: `${talk} minutes of talk + ${qa} minutes of questions` };
};
export const podcastWpm: Calc = (v) => {
  const words = need(p(v, "words", 9000), "Enter transcript word count."), mins = need(p(v, "mins", 60), "Enter episode length.");
  const wpm = words / mins;
  return { wpm: `${wpm.toFixed(0)} words per minute`, pace: wpm < 130 ? "Relaxed" : wpm < 170 ? "Typical conversational pace" : "Fast", script: `${nfmt(wpm * 30)} words for a 30-minute script at this pace` };
};
export const thesisPlan: Calc = (v) => {
  const goal = p(v, "goal", 60000), done = p(v, "done", 5000), weeks = need(p(v, "weeks", 30), "Enter weeks left."), edit = p(v, "edit", 6), days = p(v, "days", 5);
  const writeWeeks = Math.max(0.5, weeks - edit), perWeek = (goal - done) / writeWeeks;
  return { perWeek: `${nfmt(perWeek)} words a week`, perDay: `${nfmt(perWeek / Math.max(days, 1))} words a day (${days} days a week)`, plan: `${writeWeeks} weeks drafting + ${edit} weeks revising` };
};
const CR = [8, 6, 4, 12];
export const citationCount: Calc = (v) => {
  const w = p(v, "words", 10000), r = CR[pick(v.field, 4)];
  const n = (w / 1000) * r;
  return { cites: `${Math.round(n)} citations`, sources: `${Math.round(n * 0.6)}–${Math.round(n * 0.8)} unique sources`, pages: `${Math.ceil(n * 0.6 / 20)} pages of bibliography` };
};
export const GENRES = ["Adult literary / general fiction", "Romance", "Mystery / thriller", "Science fiction / fantasy", "Young adult", "Middle grade", "Picture book", "Memoir / non-fiction"];
const GW = [[80000, 100000], [70000, 90000], [70000, 90000], [90000, 120000], [60000, 80000], [30000, 55000], [300, 800], [70000, 90000]];
export const genreWords: Calc = (v) => {
  const g = pick(v.g, GW.length), you = p(v, "you", 85000), [a, b] = GW[g];
  return { range: `${nfmt(a)} – ${nfmt(b)} words`, verdict: you < a ? `${nfmt(a - you)} words short` : you > b ? `${nfmt(you - b)} words over — agents may hesitate` : "Within the typical range", pages: `${Math.round(a / 275)}–${Math.round(b / 275)} printed pages` };
};
export const narrationCost: Calc = (v) => {
  const words = p(v, "words", 80000), pfh = p(v, "pfh", 250), wpm = p(v, "wpm", 155), share = pick(v.model, 2);
  const hrs = words / wpm / 60;
  return { cost: share ? "$0 upfront (royalty share)" : $(hrs * pfh, 0), hours: `${hrs.toFixed(1)} finished hours`, note: share ? "Narrator receives 50% of royalties instead of a fee" : `${$(pfh, 0)} per finished hour` };
};
export const ghostwriter: Calc = (v) => {
  const words = p(v, "words", 60000), rate = p(v, "rate", 0.5), interviews = p(v, "iv", 20), ivr = p(v, "ivr", 100);
  const total = words * rate + interviews * ivr;
  return { total: $(total, 0), perWord: `${$(rate, 2)} per word`, months: `${Math.ceil(words / 10000)}–${Math.ceil(words / 6000)} months` };
};
export const bookMarketing: Calc = (v) => {
  const ads = p(v, "ads", 300), months = p(v, "m", 6), arc = p(v, "arc", 200), promo = p(v, "promo", 150), site = p(v, "site", 100), launch = p(v, "launch", 400);
  const total = ads * months + arc + promo * months / 2 + site + launch;
  return { total: $(total, 0), monthly: $(total / Math.max(months, 1), 0) + " a month", split: `ads ${$(ads * months, 0)} · ARCs ${$(arc, 0)} · newsletter promos ${$(promo * months / 2, 0)} · launch ${$(launch, 0)}` };
};
export const launchGoal: Calc = (v) => {
  const rank = pick(v.rank, 4), price = p(v, "price", 2.99);
  const sales = [500, 150, 50, 10][rank];
  return { sales: `${nfmt(sales)} sales a day`, money: `${$(sales * price * (price >= 2.99 ? 0.7 : 0.35), 0)} royalty a day at ${$(price)}`, rank: ["Top 100 on Kindle store", "Top 1,000", "Top 5,000", "Top 20,000"][rank] };
};
export const RANKS = ["Top 100 Kindle", "Top 1,000", "Top 5,000", "Top 20,000"];
export const wholesaleDiscount: Calc = (v) => {
  const list = need(p(v, "list", 16.99), "Enter list price."), disc = p(v, "disc", 55) / 100, print = p(v, "print", 4.6), returns = p(v, "ret", 10) / 100;
  const wholesale = list * (1 - disc), profit = (wholesale - print) * (1 - returns);
  return { profit: $(profit) + " per copy", wholesale: $(wholesale) + " wholesale price", minList: $(print / (1 - disc)) + " minimum list price to break even" };
};

// ---- registry (generated)
export const ideaBookCustomCalculators: Record<string, Calc> = {
  "book-page-count-from-word-count-calculator": pageCount,
  "reading-speed-wpm-calculator": readingSpeed,
  "audiobook-length-calculator": audiobookLength,
  "book-royalty-amazon-kdp-calculator": kdpRoyalty,
  "self-publishing-cost-calculator": selfPubCost,
  "book-print-cost-calculator": printCost,
  "writing-pace-novel-deadline-calculator": writingPace,
  "nanowrimo-daily-word-count-calculator": nanowrimo,
  "speech-length-words-to-minutes-calculator": speechLength,
  "essay-page-count-calculator": essayPages,
  "translation-cost-per-word-calculator": translationCost,
  "freelance-writing-rate-per-word-calculator": writingRate,
  "editing-cost-manuscript-calculator": editingCost,
  "reading-goal-books-per-year-calculator": readingGoal,
  "pages-per-day-reading-plan-calculator": pagesPerDay,
  "bible-reading-plan-calculator": biblePlan,
  "gunning-fog-index-calculator": gunningFog,
  "smog-readability-calculator": smog,
  "coleman-liau-index-calculator": colemanLiau,
  "automated-readability-index-calculator": ari,
  "character-count-tweet-length-calculator": tweetLength,
  "book-cover-size-bleed-calculator": coverBleed,
  "ebook-file-size-calculator": ebookSize,
  "book-club-reading-schedule-calculator": bookClub,
  "poem-syllable-counter-haiku-calculator": haiku,
  "screenplay-page-to-minute-calculator": screenplayMinute,
  "comic-page-panel-layout-calculator": comicPanels,
  "book-advance-earn-out-calculator": advanceEarnout,
  "kindle-unlimited-page-read-earnings-calculator": kuEarnings,
  "blog-post-reading-time-calculator": blogReading,
  "word-count-to-pages-double-spaced-calculator": dsPages,
  "presentation-slides-per-minute-calculator": slidesPerMin,
  "podcast-words-per-minute-calculator": podcastWpm,
  "thesis-writing-schedule-calculator": thesisPlan,
  "citation-count-pages-calculator": citationCount,
  "book-word-count-by-genre-calculator": genreWords,
  "audiobook-narration-cost-calculator": narrationCost,
  "ghostwriter-cost-calculator": ghostwriter,
  "book-marketing-budget-calculator": bookMarketing,
  "book-launch-sales-goal-calculator": launchGoal,
  "bookstore-wholesale-discount-calculator": wholesaleDiscount,
};
