/**
 * Idea build, batch fun3 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Arts & Entertainment > Tarot, Astrology & Fun — tabletop, card, casino and lottery (27 tools).
 * Poker 5-card hand counts from C(52,5) = 2,598,960; craps from 36 dice combinations; keno
 * hypergeometric (80 numbers, 20 drawn); Mega Millions 5/70 + 1/24 (C(70,5)·24 = 302,575,350).
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const C = (n: number, k: number) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const odds = (pr: number) => (pr > 0 ? `1 in ${nfmt(1 / pr, 1 / pr < 100 ? 1 : 0)}` : "impossible");

export const bingoOdds: Calc = (v) => {
  const calls = Math.round(p(v, "calls", 40)), cards = Math.max(1, Math.round(p(v, "cards", 4))), need0 = Math.min(5, Math.max(4, Math.round(p(v, "need", 4))));
  const pLine = C(calls, need0) > 0 ? C(75 - need0, calls - need0) / C(75, calls) : 0;
  const pCard = 1 - Math.pow(1 - pLine, 12), pAny = 1 - Math.pow(1 - pCard, cards);
  return { chance: `${(pAny * 100).toFixed(2)}% chance of a line with ${cards} card(s) by call ${calls}`, card: `${(pCard * 100).toFixed(3)}% per card`, note: `Approximation treating the 12 lines as independent; centre is free (${need0} numbers per line)` };
};
export const monopolyRent: Calc = (v) => {
  const base = need(p(v, "base", 26), "Enter the base rent."), houses = Math.min(5, Math.round(p(v, "h", 0))), set = pick(v.set, 2);
  const mult = [1, 5, 15, 45, 62, 75][houses];
  const rent = houses === 0 ? base * (set ? 2 : 1) : base * mult;
  return { rent: `$${nfmt(rent)} rent`, note: houses ? `${houses === 5 ? "Hotel" : `${houses} house(s)`} ≈ ${mult}× base` : set ? "Monopoly owned — double base rent" : "Base rent", tip: "Approximate multipliers; check the property's title deed for exact amounts" };
};
export const yahtzee: Calc = (v) => {
  const up = [1, 2, 3, 4, 5, 6].map((i) => p(v, `u${i}`, [3, 6, 9, 12, 15, 18][i - 1])), upSum = up.reduce((a, b) => a + b, 0), bonus = upSum >= 63 ? 35 : 0;
  const low = p(v, "tk", 20) + p(v, "fk", 0) + (pick(v.fh, 2) ? 25 : 0) + (pick(v.ss, 2) ? 30 : 0) + (pick(v.ls, 2) ? 40 : 0) + (pick(v.yz, 2) ? 50 : 0) + p(v, "ch", 22) + p(v, "yb", 0) * 100;
  return { total: `${upSum + bonus + low} points`, upper: `Upper ${upSum}${bonus ? " + 35 bonus" : ` (${63 - upSum} short of the bonus)`}`, lower: `Lower section ${low}` };
};
export const YESNO = ["No", "Yes"];
export const shuffle: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 52)));
  let lg = 0; for (let i = 2; i <= n; i++) lg += Math.log10(i);
  return { perms: `${(10 ** (lg % 1)).toFixed(3)} × 10^${Math.floor(lg)} orderings`, digits: `${Math.floor(lg) + 1} digits long`, note: n === 52 ? "Almost certainly no well-shuffled deck has ever been in the same order twice" : `${n}! possible orders` };
};
export const manaCurve: Calc = (v) => {
  const deck = Math.round(p(v, "deck", 60)), lands = Math.round(p(v, "lands", 24)), turn = Math.round(p(v, "turn", 4)), play = pick(v.play, 2);
  const seen = 7 + turn - (play ? 1 : 0), needL = turn;
  let pr = 0; for (let k = needL; k <= Math.min(lands, seen); k++) pr += (C(lands, k) * C(deck - lands, seen - k)) / C(deck, seen);
  return { chance: `${(pr * 100).toFixed(1)}% to have ${needL}+ lands by turn ${turn}`, seen: `${seen} cards seen (${play ? "on the play" : "on the draw"})`, avg: `${((seen * lands) / deck).toFixed(2)} lands expected` };
};
export const PLAYDRAW = ["On the draw", "On the play"];
export const warhammerHit: Calc = (v) => {
  const n = Math.round(p(v, "n", 20)), hit = Math.min(6, Math.max(2, Math.round(p(v, "hit", 3)))), wound = Math.min(6, Math.max(2, Math.round(p(v, "wound", 4)))), save = Math.min(7, Math.max(2, Math.round(p(v, "save", 4)))), dmg = p(v, "dmg", 1);
  const ph = (7 - hit) / 6, pw = (7 - wound) / 6, pf = save >= 7 ? 1 : (save - 1) / 6;
  const ex = n * ph * pw * pf;
  return { wounds: `${ex.toFixed(2)} unsaved wounds expected`, dmg: `${(ex * dmg).toFixed(2)} damage expected`, chain: `${(n * ph).toFixed(1)} hits → ${(n * ph * pw).toFixed(1)} wounds → ${ex.toFixed(2)} failed saves` };
};
export const trivia: Calc = (v) => {
  const right = p(v, "r", 34), total = need(p(v, "t", 40), "Enter total questions."), bonus = p(v, "b", 0);
  const pct = (100 * right) / total;
  return { pct: `${pct.toFixed(1)}%`, grade: pct >= 90 ? "Trivia champion" : pct >= 75 ? "Strong" : pct >= 50 ? "Respectable" : "Better luck next round", score: `${right + bonus} points including bonuses` };
};
export const HANDS = ["Royal flush", "Straight flush", "Four of a kind", "Full house", "Flush", "Straight", "Three of a kind", "Two pair", "One pair", "High card"];
const HAND_N = [4, 36, 624, 3744, 5108, 10200, 54912, 123552, 1098240, 1302540];
export const pokerHand: Calc = (v) => {
  const h = pick(v.hand, 10), pr = HAND_N[h] / 2598960, atLeast = HAND_N.slice(0, h + 1).reduce((a, b) => a + b, 0) / 2598960;
  return { prob: `${(pr * 100).toFixed(4)}% (${odds(pr)})`, combos: `${nfmt(HAND_N[h])} of 2,598,960 five-card hands`, better: `${(atLeast * 100).toFixed(4)}% to get ${HANDS[h].toLowerCase()} or better` };
};
export const blackjack: Calc = (v) => {
  const decks = Math.max(1, Math.round(p(v, "decks", 6))), s17 = pick(v.s17, 2), das = pick(v.das, 2), sur = pick(v.sur, 2), pays = pick(v.pays, 2);
  let edge = 0.0 + (decks === 1 ? -0.48 : decks === 2 ? -0.19 : decks <= 4 ? -0.06 : decks <= 6 ? 0 : 0.03) + (s17 ? 0 : 0.2) + (das ? -0.14 : 0) + (sur ? -0.08 : 0) + (pays ? 1.39 : 0) + 0.54;
  edge = Math.max(-1, edge);
  return { edge: `${edge.toFixed(2)}% house edge with basic strategy`, loss: `${$(edge / 100 * p(v, "bet", 25) * p(v, "hands", 80))} expected loss per hour at ${$(p(v, "bet", 25), 0)} × ${p(v, "hands", 80)} hands`, note: pays ? "6:5 blackjack adds about 1.4% to the house edge — avoid it" : "3:2 payout" };
};
export const S17 = ["Dealer hits soft 17 (H17)", "Dealer stands on soft 17 (S17)"];
export const PAYS = ["Blackjack pays 3:2", "Blackjack pays 6:5"];
export const CRAPS = ["Pass line", "Don't pass", "Field", "Any 7", "Hard 6 or 8", "Place 6 or 8", "Any craps"];
const CR_EDGE = [1.41, 1.36, 5.56, 16.67, 9.09, 1.52, 11.11];
const CR_WIN = [0.4929, 0.4793, 0.4444, 0.1667, 0.0909, 0.4545, 0.1111];
export const crapsOdds: Calc = (v) => { const b = pick(v.bet, CRAPS.length); return { edge: `${CR_EDGE[b]}% house edge`, win: `${(CR_WIN[b] * 100).toFixed(2)}% chance to win the bet`, note: b <= 1 ? "Take free odds behind your line bet to lower the overall edge" : "Higher-edge proposition bet" }; };
export const kenoOdds: Calc = (v) => {
  const spots = Math.min(10, Math.max(1, Math.round(p(v, "spots", 6)))), hits = Math.min(spots, Math.max(0, Math.round(p(v, "hits", 6))));
  const pr = (C(20, hits) * C(60, spots - hits)) / C(80, spots);
  return { prob: `${(pr * 100).toFixed(5)}% (${odds(pr)})`, note: `Catching exactly ${hits} of ${spots} picked`, all: `${odds(C(20, spots) / C(80, spots))} to catch all ${spots}` };
};
export const slotRtp: Calc = (v) => {
  const rtp = Math.min(100, p(v, "rtp", 96)) / 100, bet = p(v, "bet", 1), spins = p(v, "spins", 600);
  const wager = bet * spins;
  return { loss: `${$(wager * (1 - rtp))} expected loss per session`, wager: `${$(wager)} wagered in ${nfmt(spins)} spins`, edge: `${((1 - rtp) * 100).toFixed(2)}% house edge` };
};
export const megaMillions: Calc = (v) => {
  const tix = Math.max(1, Math.round(p(v, "tix", 1))), jackpot = p(v, "jp", 500e6), cost = p(v, "cost", 5);
  const pr = 1 / (C(70, 5) * 24);
  return { odds: `1 in ${nfmt(C(70, 5) * 24)} for the jackpot per ticket`, yours: `${odds(tix * pr)} with ${nfmt(tix)} tickets`, ev: `${$(jackpot * pr * 0.45 - cost)} jackpot expected value per ticket after ~55% tax & cash option (ignores sharing)` };
};
export const raffleOdds: Calc = (v) => {
  const sold = need(p(v, "sold", 500), "Enter tickets sold."), mine = p(v, "mine", 5), prizes = Math.max(1, Math.round(p(v, "prizes", 1)));
  const lose = C(sold - mine, prizes) / C(sold, prizes);
  return { chance: `${((1 - lose) * 100).toFixed(2)}% chance to win at least one prize`, odds: odds(1 - lose), note: `${mine} of ${nfmt(sold)} tickets, ${prizes} prize(s) drawn without replacement` };
};
export const squares: Calc = (v) => {
  const a = Math.round(num(v.a, 7)) % 10, b = Math.round(num(v.b, 0)) % 10;
  const P = [0.18, 0.06, 0.04, 0.17, 0.12, 0.03, 0.08, 0.2, 0.06, 0.06];
  const pr = P[a] * P[b] * 1.3;
  return { chance: `${(Math.min(pr, 0.06) * 100).toFixed(2)}% per quarter (approx.)`, rank: a + b === 7 || (a === 7 && b === 0) || (a === 0 && b === 7) ? "One of the best squares" : (a === 2 || a === 5) && (b === 2 || b === 5) ? "One of the worst squares" : "Average square", note: "Based on historical NFL final-digit frequencies (0, 3, 7 most common)" };
};
export const boardScore: Calc = (v) => {
  const raw = txt(v, "scores");
  const rows = raw.split(/\n|;/).map((r) => r.split(/[:,]/).map((s) => s.trim())).filter((r) => r[0]);
  if (!rows.length) throw new InputError("Enter one player per line like: Alex: 12, 8, 15");
  const tot = rows.map(([n, ...s]) => [n, s.map(Number).filter((x) => Number.isFinite(x)).reduce((a, b) => a + b, 0)] as [string, number]).sort((x, y) => y[1] - x[1]);
  return { winner: `${tot[0][0]} wins with ${tot[0][1]}`, table: tot.map(([n, s], i) => `${i + 1}. ${n} ${s}`).join(" · "), gap: tot.length > 1 ? `${tot[0][1] - tot[1][1]} points ahead of 2nd` : "—" };
};
export const chessClock: Calc = (v) => {
  const base = p(v, "base", 15), inc = p(v, "inc", 10), moves = need(p(v, "moves", 40), "Enter expected moves.");
  const est = base + (inc * moves) / 60, perMove = (est * 60) / moves;
  return { perMove: `${perMove.toFixed(1)} s per move on average`, total: `${est.toFixed(1)} min per player for ${moves} moves`, cat: est < 3 ? "Bullet" : est < 10 ? "Blitz" : est < 60 ? "Rapid" : "Classical" };
};
export const cribbage: Calc = (v) => {
  const fif = p(v, "f", 2), pairs = p(v, "p", 1), runs = p(v, "r", 3), flush = p(v, "fl", 0), nobs = pick(v.nobs, 2);
  const total = fif * 2 + pairs * 2 + runs + flush + (nobs ? 1 : 0);
  return { total: `${total} points`, parts: `15s ${fif * 2} · pairs ${pairs * 2} · runs ${runs} · flush ${flush} · nobs ${nobs ? 1 : 0}`, note: "Enter the total length of all runs (e.g. a double run of 3 = 6)" };
};
export const spades: Calc = (v) => {
  const bid = Math.round(p(v, "bid", 5)), won = Math.round(p(v, "won", 6)), bags = Math.round(p(v, "bags", 7)), nil = pick(v.nil, 3);
  let score = won >= bid ? bid * 10 + (won - bid) : -bid * 10;
  const newBags = bags + Math.max(0, won - bid);
  let note = "";
  if (newBags >= 10) { score -= 100; note = " (−100 for 10 bags)"; }
  if (nil === 1) score += 100; else if (nil === 2) score -= 100;
  return { score: `${score >= 0 ? "+" : ""}${score} this round${note}`, bags: `${newBags % 10} bags carried forward`, made: won >= bid ? "Contract made" : "Set — lost 10 × bid" };
};
export const NIL = ["No nil bid", "Nil made (+100)", "Nil failed (−100)"];
export const hearts: Calc = (v) => {
  const h = Math.round(p(v, "h", 5)), q = pick(v.q, 2), shoot = pick(v.s, 2);
  return shoot ? { pts: "0 for you, 26 to every opponent (shot the moon)", note: "All 13 hearts and the Queen of Spades", total: "26" } : { pts: `${h + (q ? 13 : 0)} points`, note: `${h} hearts${q ? " + Queen of Spades (13)" : ""}`, total: "Lowest score wins at 100" };
};
export const rummy: Calc = (v) => {
  const ace = pick(v.ace, 2), faces = p(v, "f", 2), aces = p(v, "a", 1), pips = p(v, "pip", 14);
  const pts = faces * 10 + aces * (ace ? 11 : 1) + pips;
  return { pts: `${pts} points in hand`, parts: `${faces} face cards ×10, ${aces} aces ×${ace ? 11 : 1}, ${pips} in number cards`, note: "Losers' deadwood goes to the winner" };
};
export const ACE = ["Ace = 1", "Ace = 11 (or 15 in some rules)"];
export const BRIDGE_SUIT = ["♣ Clubs", "♦ Diamonds", "♥ Hearts", "♠ Spades", "No trump"];
export const bridgeScore: Calc = (v) => {
  const lvl = Math.min(7, Math.max(1, Math.round(p(v, "lvl", 4)))), suit = pick(v.suit, 5), tricks = Math.round(p(v, "tricks", 10)), dbl = pick(v.dbl, 3), vul = pick(v.vul, 2);
  const needT = 6 + lvl, mult = [1, 2, 4][dbl];
  if (tricks < needT) {
    const under = needT - tricks;
    let pen = 0;
    if (dbl === 0) pen = under * (vul ? 100 : 50);
    else for (let i = 1; i <= under; i++) pen += vul ? (i === 1 ? 200 : 300) : i === 1 ? 100 : i <= 3 ? 200 : 300;
    if (dbl === 2) pen *= 2;
    return { score: `−${pen} (down ${under})`, detail: `${lvl}${["♣", "♦", "♥", "♠", "NT"][suit]} needed ${needT} tricks`, bonus: "Defenders score the penalty" };
  }
  const per = suit <= 1 ? 20 : 30, trickPts = (suit === 4 ? 40 + (lvl - 1) * 30 : lvl * per) * mult;
  const game = trickPts >= 100, over = tricks - needT;
  let score = trickPts + (game ? (vul ? 500 : 300) : 50) + (dbl ? 50 * dbl : 0);
  score += dbl === 0 ? over * per : over * (vul ? 200 : 100) * (dbl === 2 ? 2 : 1);
  if (lvl === 6) score += vul ? 750 : 500; if (lvl === 7) score += vul ? 1500 : 1000;
  return { score: `+${score}`, detail: `${trickPts} trick points${game ? " — game" : " — part score"}, ${over} overtrick(s)`, bonus: lvl >= 6 ? "Slam bonus included" : "Duplicate scoring" };
};
export const DBL = ["Undoubled", "Doubled", "Redoubled"];
export const VUL = ["Not vulnerable", "Vulnerable"];
export const euchre: Calc = (v) => {
  const tricks = Math.min(5, Math.round(p(v, "t", 3))), makers = pick(v.m, 2), alone = pick(v.a, 2);
  let pts = 0, note = "";
  if (makers) { if (tricks === 5) { pts = alone ? 4 : 2; note = alone ? "March alone" : "March"; } else if (tricks >= 3) { pts = 1; note = "Made it"; } else { pts = -2; note = "Euchred — opponents score 2"; } }
  else { pts = tricks >= 3 ? 2 : 0; note = tricks >= 3 ? "Euchred the makers" : "Defended but makers made it"; }
  return { pts: pts < 0 ? `Opponents +${-pts}` : `+${pts} points`, note, game: "First to 10 wins" };
};
export const MAKERS = ["Defending", "Called trump (makers)"];
export const golfCards: Calc = (v) => {
  const rounds = txt(v, "rounds").split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!rounds.length || rounds.some((x) => !Number.isFinite(x))) throw new InputError("Enter each hole's score separated by commas.");
  const tot = rounds.reduce((a, b) => a + b, 0);
  return { total: `${tot} points over ${rounds.length} holes`, avg: `${(tot / rounds.length).toFixed(2)} per hole`, best: `Best hole ${Math.min(...rounds)}, worst ${Math.max(...rounds)} — lowest total wins` };
};

// ---- registry (generated)
export const ideaFun3CustomCalculators: Record<string, Calc> = {
  "bingo-odds-calculator": bingoOdds,
  "monopoly-rent-calculator": monopolyRent,
  "yahtzee-score-calculator": yahtzee,
  "card-shuffle-combinations-calculator": shuffle,
  "magic-the-gathering-mana-curve-calculator": manaCurve,
  "warhammer-hit-probability-calculator": warhammerHit,
  "trivia-score-percentage-calculator": trivia,
  "poker-hand-probability-calculator": pokerHand,
  "blackjack-basic-strategy-odds-calculator": blackjack,
  "craps-odds-calculator": crapsOdds,
  "keno-odds-calculator": kenoOdds,
  "slot-machine-rtp-calculator": slotRtp,
  "mega-millions-odds-calculator": megaMillions,
  "raffle-odds-calculator": raffleOdds,
  "super-bowl-squares-odds-calculator": squares,
  "board-game-score-tracker-calculator": boardScore,
  "chess-time-control-per-move-calculator": chessClock,
  "cribbage-score-calculator": cribbage,
  "spades-score-calculator": spades,
  "hearts-card-game-score-calculator": hearts,
  "rummy-score-calculator": rummy,
  "bridge-contract-score-calculator": bridgeScore,
  "euchre-score-calculator": euchre,
  "golf-card-game-score-calculator": golfCards,
};
