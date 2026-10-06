"use client";

import { useState } from "react";

// A working scientific calculator for the home page hero. Each key press adds
// a token with what to SHOW and what to EVALUATE (mathjs syntax), so the
// display stays readable while the math stays exact. mathjs is loaded only
// when "=" is first pressed, keeping it out of the initial page bundle.

type Token = { show: string; expr: string };

const DEG_FUNCS: Record<string, (x: number) => number> = {
  sind: (x) => Math.sin((x * Math.PI) / 180),
  cosd: (x) => Math.cos((x * Math.PI) / 180),
  tand: (x) => Math.tan((x * Math.PI) / 180),
  asind: (x) => (Math.asin(x) * 180) / Math.PI,
  acosd: (x) => (Math.acos(x) * 180) / Math.PI,
  atand: (x) => (Math.atan(x) * 180) / Math.PI,
};

type Key = { label: string; token?: Token; action?: "clear" | "back" | "equals" | "ans"; kind?: "fn" | "num" | "op" | "eq" };

const KEYS: Key[] = [
  { label: "sin", token: { show: "sin(", expr: "sin(" }, kind: "fn" },
  { label: "cos", token: { show: "cos(", expr: "cos(" }, kind: "fn" },
  { label: "tan", token: { show: "tan(", expr: "tan(" }, kind: "fn" },
  { label: "(", token: { show: "(", expr: "(" }, kind: "fn" },
  { label: ")", token: { show: ")", expr: ")" }, kind: "fn" },
  { label: "sin⁻¹", token: { show: "sin⁻¹(", expr: "asin(" }, kind: "fn" },
  { label: "cos⁻¹", token: { show: "cos⁻¹(", expr: "acos(" }, kind: "fn" },
  { label: "tan⁻¹", token: { show: "tan⁻¹(", expr: "atan(" }, kind: "fn" },
  { label: "AC", action: "clear", kind: "op" },
  { label: "⌫", action: "back", kind: "op" },
  { label: "ln", token: { show: "ln(", expr: "log(" }, kind: "fn" },
  { label: "log", token: { show: "log(", expr: "log10(" }, kind: "fn" },
  { label: "√", token: { show: "√(", expr: "sqrt(" }, kind: "fn" },
  { label: "x²", token: { show: "²", expr: "^2" }, kind: "fn" },
  { label: "xʸ", token: { show: "^", expr: "^" }, kind: "fn" },
  { label: "π", token: { show: "π", expr: "pi" }, kind: "fn" },
  { label: "e", token: { show: "e", expr: "e" }, kind: "fn" },
  { label: "n!", token: { show: "!", expr: "!" }, kind: "fn" },
  { label: "%", token: { show: "%", expr: "/100" }, kind: "fn" },
  { label: "÷", token: { show: "÷", expr: "/" }, kind: "op" },
  { label: "7", token: { show: "7", expr: "7" }, kind: "num" },
  { label: "8", token: { show: "8", expr: "8" }, kind: "num" },
  { label: "9", token: { show: "9", expr: "9" }, kind: "num" },
  { label: "Ans", action: "ans", kind: "fn" },
  { label: "×", token: { show: "×", expr: "*" }, kind: "op" },
  { label: "4", token: { show: "4", expr: "4" }, kind: "num" },
  { label: "5", token: { show: "5", expr: "5" }, kind: "num" },
  { label: "6", token: { show: "6", expr: "6" }, kind: "num" },
  { label: "EXP", token: { show: "×10^", expr: "*10^" }, kind: "fn" },
  { label: "−", token: { show: "−", expr: "-" }, kind: "op" },
  { label: "1", token: { show: "1", expr: "1" }, kind: "num" },
  { label: "2", token: { show: "2", expr: "2" }, kind: "num" },
  { label: "3", token: { show: "3", expr: "3" }, kind: "num" },
  { label: "±", token: { show: "−", expr: "-" }, kind: "fn" },
  { label: "+", token: { show: "+", expr: "+" }, kind: "op" },
  { label: "0", token: { show: "0", expr: "0" }, kind: "num" },
  { label: ".", token: { show: ".", expr: "." }, kind: "num" },
  { label: "00", token: { show: "00", expr: "00" }, kind: "num" },
  { label: "=", action: "equals", kind: "eq" },
];

function formatResult(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  const rounded = Number.parseFloat(n.toPrecision(12));
  return Math.abs(rounded) >= 1e15 || (Math.abs(rounded) < 1e-9 && rounded !== 0)
    ? rounded.toExponential(8)
    : rounded.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

export default function ScientificCalculator() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [result, setResult] = useState("0");
  const [ans, setAns] = useState<number | null>(null);
  const [degrees, setDegrees] = useState(true);
  const [justEvaluated, setJustEvaluated] = useState(false);

  async function evaluate() {
    if (tokens.length === 0) return;
    let expr = tokens.map((t) => t.expr).join("");
    if (degrees) expr = expr.replace(/\b(a?)(sin|cos|tan)\(/g, (_m, a: string, f: string) => `${a}${f}d(`);
    // Close any brackets the user left open.
    const open = (expr.match(/\(/g) ?? []).length - (expr.match(/\)/g) ?? []).length;
    if (open > 0) expr += ")".repeat(open);
    try {
      const { evaluate: mathEvaluate } = await import("mathjs");
      const value = Number(mathEvaluate(expr, { ...DEG_FUNCS }));
      setResult(formatResult(value));
      if (Number.isFinite(value)) setAns(value);
    } catch {
      setResult("Error");
    }
    setJustEvaluated(true);
  }

  function press(key: Key) {
    if (key.action === "clear") {
      setTokens([]);
      setResult("0");
      setJustEvaluated(false);
      return;
    }
    if (key.action === "back") {
      setTokens((t) => t.slice(0, -1));
      setJustEvaluated(false);
      return;
    }
    if (key.action === "equals") {
      void evaluate();
      return;
    }
    const token: Token | undefined =
      key.action === "ans" ? (ans === null ? undefined : { show: "Ans", expr: `(${ans})` }) : key.token;
    if (!token) return;
    setTokens((t) => {
      // After "=", typing a number starts fresh; an operator continues from Ans.
      if (justEvaluated) {
        if (key.kind === "op" && ans !== null) return [{ show: "Ans", expr: `(${ans})` }, token];
        return [token];
      }
      return [...t, token];
    });
    setJustEvaluated(false);
  }

  const keyClass: Record<NonNullable<Key["kind"]>, string> = {
    fn: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60",
    num: "bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
    op: "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
    eq: "bg-indigo-600 text-white hover:bg-indigo-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 rounded-xl bg-white p-3 text-right shadow-inner dark:bg-gray-950">
        <div className="min-h-[1.25rem] truncate text-sm text-gray-500" aria-label="Expression">
          {tokens.map((t) => t.show).join("") || " "}
        </div>
        <div className="truncate text-3xl font-semibold tabular-nums text-gray-900 dark:text-gray-50" aria-live="polite">
          {result}
        </div>
      </div>
      <div className="mb-2 flex justify-end gap-1 text-xs">
        {(["Deg", "Rad"] as const).map((mode) => {
          const active = (mode === "Deg") === degrees;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setDegrees(mode === "Deg")}
              className={`rounded-md px-2.5 py-1 font-semibold transition ${
                active ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:text-gray-800 dark:bg-gray-800"
              }`}
            >
              {mode}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {KEYS.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => press(key)}
            className={`h-10 rounded-lg text-sm font-semibold shadow-sm transition active:scale-95 ${keyClass[key.kind ?? "num"]} ${
              key.label === "=" ? "col-span-2" : ""
            }`}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
