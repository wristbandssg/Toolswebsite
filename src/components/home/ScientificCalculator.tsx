"use client";

import { useState } from "react";

// Scientific calculator for home page Design 1: a text box you can type a
// calculation into (Enter or "Solve" evaluates it) plus a 10-column keypad —
// function keys, number pad and operators/memory. Key presses insert readable
// text (×, ÷, π, √) that is translated to mathjs syntax on evaluation. mathjs
// is loaded on the first evaluation, keeping it out of the initial bundle.

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

type Key = {
  label: string;
  insert?: string;
  action?: "clear" | "back" | "equals" | "rnd" | "mplus" | "mminus" | "mr";
  style: "fn" | "num" | "op" | "dark";
  title?: string;
};

// Five rows of 10 keys (the Deg/Rad switch takes the first two cells of row 1).
const ROWS: Key[][] = [
  [
    { label: "sin", insert: "sin(", style: "fn" },
    { label: "cos", insert: "cos(", style: "fn" },
    { label: "tan", insert: "tan(", style: "fn" },
    { label: "7", insert: "7", style: "num" },
    { label: "8", insert: "8", style: "num" },
    { label: "9", insert: "9", style: "num" },
    { label: "+", insert: "+", style: "op" },
    { label: "⌫", action: "back", style: "op", title: "Backspace" },
  ],
  [
    { label: "sin⁻¹", insert: "asin(", style: "fn" },
    { label: "cos⁻¹", insert: "acos(", style: "fn" },
    { label: "tan⁻¹", insert: "atan(", style: "fn" },
    { label: "π", insert: "π", style: "fn" },
    { label: "e", insert: "e", style: "fn" },
    { label: "4", insert: "4", style: "num" },
    { label: "5", insert: "5", style: "num" },
    { label: "6", insert: "6", style: "num" },
    { label: "−", insert: "−", style: "op" },
    { label: "Ans", insert: "Ans", style: "dark" },
  ],
  [
    { label: "xʸ", insert: "^", style: "fn" },
    { label: "x³", insert: "^3", style: "fn" },
    { label: "x²", insert: "^2", style: "fn" },
    { label: "eˣ", insert: "e^(", style: "fn" },
    { label: "10ˣ", insert: "10^(", style: "fn" },
    { label: "1", insert: "1", style: "num" },
    { label: "2", insert: "2", style: "num" },
    { label: "3", insert: "3", style: "num" },
    { label: "×", insert: "×", style: "op" },
    { label: "M+", action: "mplus", style: "op", title: "Add result to memory" },
  ],
  [
    { label: "ʸ√x", insert: "nthRoot(", style: "fn", title: "nthRoot(x, y)" },
    { label: "∛x", insert: "cbrt(", style: "fn" },
    { label: "√x", insert: "√(", style: "fn" },
    { label: "ln", insert: "ln(", style: "fn" },
    { label: "log", insert: "log(", style: "fn" },
    { label: "0", insert: "0", style: "num" },
    { label: ".", insert: ".", style: "num" },
    { label: "EXP", insert: "×10^(", style: "num" },
    { label: "÷", insert: "÷", style: "op" },
    { label: "M−", action: "mminus", style: "op", title: "Subtract result from memory" },
  ],
  [
    { label: "(", insert: "(", style: "fn" },
    { label: ")", insert: ")", style: "fn" },
    { label: "1/x", insert: "1/(", style: "fn" },
    { label: "%", insert: "%", style: "fn" },
    { label: "n!", insert: "!", style: "fn" },
    { label: "±", insert: "−(", style: "num" },
    { label: "RND", action: "rnd", style: "num", title: "Random number" },
    { label: "AC", action: "clear", style: "dark" },
    { label: "=", action: "equals", style: "op" },
    { label: "MR", action: "mr", style: "op", title: "Recall memory" },
  ],
];

const KEY_STYLE: Record<Key["style"], string> = {
  fn: "bg-sky-100 text-slate-800 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900",
  num: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
  op: "bg-sky-100 text-slate-800 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900",
  dark: "bg-sky-800 text-white hover:bg-sky-900",
};

export default function ScientificCalculator({ placeholder }: { placeholder: string }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [ans, setAns] = useState(0);
  const [memory, setMemory] = useState(0);
  const [degrees, setDegrees] = useState(true);

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

  async function press(key: Key) {
    if (key.insert) {
      setInput((v) => v + key.insert);
      return;
    }
    switch (key.action) {
      case "clear":
        setInput("");
        setResult(null);
        break;
      case "back":
        setInput((v) => v.slice(0, -1));
        break;
      case "equals":
        await solve();
        break;
      case "rnd":
        setInput((v) => v + Math.random().toFixed(4));
        break;
      case "mplus":
      case "mminus": {
        const value = (await solve()) ?? ans;
        setMemory((m) => (key.action === "mplus" ? m + value : m - value));
        break;
      }
      case "mr":
        setInput((v) => v + formatResult(memory));
        break;
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <form
        className="flex gap-2"
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
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
        />
        <button type="submit" className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
          Solve
        </button>
      </form>
      <div className="mt-2 min-h-[1.75rem] text-right text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50" aria-live="polite">
        {result ?? ""}
      </div>

      <div className="mt-2 grid grid-cols-10 gap-1.5">
        {ROWS.map((row, r) => (
          <div key={r} className="contents">
            {r === 0 ? (
              <div className="col-span-2 flex items-center justify-around rounded-md bg-white text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {(["Deg", "Rad"] as const).map((mode) => (
                  <label key={mode} className="flex cursor-pointer items-center gap-1">
                    <input
                      type="radio"
                      name="angle-mode"
                      checked={(mode === "Deg") === degrees}
                      onChange={() => setDegrees(mode === "Deg")}
                      className="h-3 w-3"
                    />
                    {mode}
                  </label>
                ))}
              </div>
            ) : null}
            {row.map((key) => (
              <button
                key={key.label}
                type="button"
                title={key.title}
                onClick={() => void press(key)}
                className={`h-8 rounded-md text-xs font-medium shadow-sm transition active:scale-95 sm:h-9 sm:text-sm ${KEY_STYLE[key.style]}`}
              >
                {key.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
