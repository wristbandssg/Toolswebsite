"use client";

import { useState } from "react";

// Scientific calculator for home page Design 1. A dark display holds the
// type-your-calculation box (Enter or "Solve" evaluates it), the result, the
// Deg/Rad switch and memory keys. Below it, a function pad and a number pad
// sit side by side on wide screens; on phones the number pad comes first and
// the function pad folds behind a "More functions" toggle so keys stay big
// enough to tap. Key presses insert readable text (×, ÷, π, √) that is
// translated to mathjs syntax on evaluation; mathjs loads on first use.

const DEG_FUNCS: Record<string, (x: number) => number> = {
  sind: (x) => Math.sin((x * Math.PI) / 180),
  cosd: (x) => Math.cos((x * Math.PI) / 180),
  tand: (x) => Math.tan((x * Math.PI) / 180),
  asind: (x) => (Math.asin(x) * 180) / Math.PI,
  acosd: (x) => (Math.acos(x) * 180) / Math.PI,
  atand: (x) => (Math.atan(x) * 180) / Math.PI,
};

/** Translates what the user sees/typed into a mathjs expression. */
export function toMathExpression(input: string, degrees: boolean): string {
  let e = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/√\(/g, "sqrt(")
    .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*/gi, "($1/100)*")
    .replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)")
    .replace(/\blog\(/g, "log10(")
    .replace(/\bln\(/g, "log(");
  if (degrees) e = e.replace(/\b(a?)(sin|cos|tan)\(/g, (_m, a: string, f: string) => `${a}${f}d(`);
  const open = (e.match(/\(/g) ?? []).length - (e.match(/\)/g) ?? []).length;
  return open > 0 ? e + ")".repeat(open) : e;
}

function formatResult(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  const rounded = Number.parseFloat(n.toPrecision(12));
  return Math.abs(rounded) >= 1e15 || (Math.abs(rounded) < 1e-9 && rounded !== 0)
    ? rounded.toExponential(8)
    : String(rounded);
}

type Action = "clear" | "back" | "equals" | "rnd";
type Key = { label: string; insert?: string; action?: Action; tone: "fn" | "num" | "op" | "accent" | "danger"; title?: string };

// Function pad: 5 columns x 5 rows.
const FUNCTION_KEYS: Key[] = [
  { label: "sin", insert: "sin(", tone: "fn" },
  { label: "cos", insert: "cos(", tone: "fn" },
  { label: "tan", insert: "tan(", tone: "fn" },
  { label: "(", insert: "(", tone: "fn" },
  { label: ")", insert: ")", tone: "fn" },
  { label: "sin⁻¹", insert: "asin(", tone: "fn" },
  { label: "cos⁻¹", insert: "acos(", tone: "fn" },
  { label: "tan⁻¹", insert: "atan(", tone: "fn" },
  { label: "π", insert: "π", tone: "fn" },
  { label: "e", insert: "e", tone: "fn" },
  { label: "xʸ", insert: "^", tone: "fn" },
  { label: "x³", insert: "^3", tone: "fn" },
  { label: "x²", insert: "^2", tone: "fn" },
  { label: "eˣ", insert: "e^(", tone: "fn" },
  { label: "10ˣ", insert: "10^(", tone: "fn" },
  { label: "ʸ√x", insert: "nthRoot(", tone: "fn", title: "nthRoot(x, y)" },
  { label: "∛x", insert: "cbrt(", tone: "fn" },
  { label: "√x", insert: "√(", tone: "fn" },
  { label: "ln", insert: "ln(", tone: "fn" },
  { label: "log", insert: "log(", tone: "fn" },
  { label: "1/x", insert: "1/(", tone: "fn" },
  { label: "%", insert: "%", tone: "fn" },
  { label: "n!", insert: "!", tone: "fn" },
  { label: "±", insert: "−(", tone: "fn" },
  { label: "RND", action: "rnd", tone: "fn", title: "Random number" },
];

// Number pad: 4 columns x 5 rows.
const NUMBER_KEYS: Key[] = [
  { label: "AC", action: "clear", tone: "danger" },
  { label: "⌫", action: "back", tone: "op", title: "Backspace" },
  { label: "Ans", insert: "Ans", tone: "op" },
  { label: "÷", insert: "÷", tone: "op" },
  { label: "7", insert: "7", tone: "num" },
  { label: "8", insert: "8", tone: "num" },
  { label: "9", insert: "9", tone: "num" },
  { label: "×", insert: "×", tone: "op" },
  { label: "4", insert: "4", tone: "num" },
  { label: "5", insert: "5", tone: "num" },
  { label: "6", insert: "6", tone: "num" },
  { label: "−", insert: "−", tone: "op" },
  { label: "1", insert: "1", tone: "num" },
  { label: "2", insert: "2", tone: "num" },
  { label: "3", insert: "3", tone: "num" },
  { label: "+", insert: "+", tone: "op" },
  { label: "0", insert: "0", tone: "num" },
  { label: ".", insert: ".", tone: "num" },
  { label: "EXP", insert: "×10^(", tone: "num", title: "× 10 to the power" },
  { label: "=", action: "equals", tone: "accent" },
];

const TONE: Record<Key["tone"], string> = {
  fn: "bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-100 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-100 dark:ring-sky-900 dark:hover:bg-sky-900/70",
  num: "bg-white text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-700",
  op: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-600",
  accent: "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/30 hover:from-sky-600 hover:to-indigo-700",
  danger: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
};

function Pad({ keys, columns, onPress }: { keys: Key[]; columns: string; onPress: (k: Key) => void }) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {keys.map((key) => (
        <button
          key={key.label}
          type="button"
          title={key.title}
          onClick={() => onPress(key)}
          className={`h-11 select-none rounded-xl text-sm font-semibold transition duration-100 active:scale-95 sm:h-12 sm:text-base ${TONE[key.tone]}`}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}

export default function ScientificCalculator({ placeholder }: { placeholder: string }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [ans, setAns] = useState(0);
  const [memory, setMemory] = useState(0);
  const [degrees, setDegrees] = useState(true);
  const [showFunctions, setShowFunctions] = useState(false);

  async function solve(): Promise<number | null> {
    if (!input.trim()) return null;
    try {
      const { evaluate } = await import("mathjs");
      const value = Number(evaluate(toMathExpression(input, degrees), { ...DEG_FUNCS, Ans: ans }));
      setResult(formatResult(value));
      if (Number.isFinite(value)) {
        setAns(value);
        return value;
      }
    } catch {
      setResult("Error");
    }
    return null;
  }

  function press(key: Key) {
    if (key.insert) {
      setInput((v) => v + key.insert);
      return;
    }
    if (key.action === "clear") {
      setInput("");
      setResult(null);
    } else if (key.action === "back") {
      setInput((v) => v.slice(0, -1));
    } else if (key.action === "equals") {
      void solve();
    } else if (key.action === "rnd") {
      setInput((v) => v + Math.random().toFixed(4));
    }
  }

  async function memoryAdd(sign: 1 | -1) {
    const value = (await solve()) ?? ans;
    setMemory((m) => m + sign * value);
  }

  const chip =
    "rounded-lg px-2.5 py-1 text-xs font-semibold transition";

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-5 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      {/* Display */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-inner sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-lg bg-white/10 p-0.5">
            {(["Deg", "Rad"] as const).map((mode) => {
              const active = (mode === "Deg") === degrees;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDegrees(mode === "Deg")}
                  className={`${chip} ${active ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-1 hidden text-xs text-slate-400 sm:inline">
              Memory: <span className="tabular-nums text-slate-200">{formatResult(memory)}</span>
            </span>
            <button type="button" className={`${chip} bg-white/10 hover:bg-white/20`} onClick={() => void memoryAdd(1)} title="Add result to memory">
              M+
            </button>
            <button type="button" className={`${chip} bg-white/10 hover:bg-white/20`} onClick={() => void memoryAdd(-1)} title="Subtract result from memory">
              M−
            </button>
            <button
              type="button"
              className={`${chip} bg-white/10 hover:bg-white/20`}
              onClick={() => setInput((v) => v + formatResult(memory))}
              title="Recall memory"
            >
              MR
            </button>
          </div>
        </div>

        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void solve();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            aria-label="Calculation"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-base text-white placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:bg-white/10 sm:text-lg"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:brightness-110 active:scale-95"
          >
            Solve
          </button>
        </form>

        <div className="mt-3 flex min-h-[2.75rem] items-end justify-end overflow-x-auto" aria-live="polite">
          <span className={`whitespace-nowrap text-3xl font-bold tabular-nums sm:text-4xl ${result === "Error" ? "text-rose-300" : "text-white"}`}>
            {result !== null ? `= ${result}` : <span className="text-slate-500">0</span>}
          </span>
        </div>
      </div>

      {/* Keypads */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[5fr_4fr]">
        <div className="order-2 lg:order-1">
          <button
            type="button"
            onClick={() => setShowFunctions((v) => !v)}
            className="mb-2 w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 lg:hidden dark:border-slate-700 dark:text-slate-300"
            aria-expanded={showFunctions}
          >
            {showFunctions ? "Hide functions ▲" : "More functions (sin, √, log…) ▼"}
          </button>
          <div className={`${showFunctions ? "block" : "hidden"} lg:block`}>
            <Pad keys={FUNCTION_KEYS} columns="grid-cols-5" onPress={press} />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Pad keys={NUMBER_KEYS} columns="grid-cols-4" onPress={press} />
        </div>
      </div>
    </div>
  );
}
