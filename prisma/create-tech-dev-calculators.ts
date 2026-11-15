// One-time (but safe to re-run) batch setup script: 8 number-base, AI token and cloud cost tools
// from the tech keyword check (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md), filed under
// Science > Computer, Network & IT Calculators. Formulas: src/lib/calc-engine-tech-dev.ts.
//
// HOW TO RUN
//   npm run db:create-tech-dev-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-dev";
import { mk, num, dd, tx, pct, T, runBatch, type ToolDef } from "./trv-tool-kit";

const C = E.techDevCustomCalculators;
const IT = "computer-network-it-calculators";

const TOOLS: ToolDef[] = [
  mk({
    slug: "programmer-calculator", title: "Programmer Calculator (Binary, Hex, Octal & Decimal Converter)",
    meta: "Programmer Calculator — Convert Decimal, Hex, Binary & Octal",
    desc: "Convert a number between decimal, hexadecimal, binary and octal in one step, with grouped digits, the bit and byte length, and the matching ASCII/Unicode character. Handles very large numbers exactly.",
    inputs: [tx("value", "Number (prefix 0x, 0b or 0o also works)", "255"), dd("from", "Number Is In", E.BASES.map(([l]) => l), 0)],
    results: [["hex", "Hexadecimal", "t"], ["dec", "Decimal", "t"], ["bin", "Binary", "t"], ["oct", "Octal", "t"], ["bits", "Bits Needed", "n", 0], ["bytes", "Bytes Needed", "n", 0], ["ascii", "Character", "t"]],
    fn: C["programmer-calculator"], ex: { ...T("value", "255"), from: 0 },
    exText: (o) => `Example: decimal 255 = hex ${o.hex} = binary ${o.bin} = octal ${o.oct}, which fits in ${o.bytes} byte.`,
    how: "Type the number and pick its base, or just type a prefix: 0x for hex, 0b for binary or 0o for octal. Each hex digit is exactly 4 bits, which is why programmers use hex as shorthand for binary.\n\nDecimal to binary works by repeatedly dividing by 2. The remainders, read upwards, are the bits.",
    assume: "Whole numbers only (any size). Negative numbers are shown with a minus sign; for fixed-width signed patterns use the Two's Complement Calculator.",
    faq: [["How do I convert decimal to binary?", "Divide by 2 repeatedly and read the remainders from last to first. 13 → 1101."], ["What is FF in decimal?", "255."]],
  }),
  mk({
    slug: "hex-calculator", title: "Hex Calculator (Hexadecimal Add, Subtract, Multiply & Divide)",
    meta: "Hex Calculator — Hexadecimal Addition, Subtraction & More",
    desc: "Add, subtract, multiply or divide two hexadecimal numbers, or combine them with AND, OR and XOR. The answer is shown in hex, decimal and binary.",
    inputs: [tx("a", "First Hex Number", "1A3F"), dd("op", "Operation", E.HEX_OPS, 0), tx("b", "Second Hex Number", "FF")],
    results: [["hex", "Result (Hex)", "t"], ["dec", "Result (Decimal)", "t"], ["bin", "Result (Binary)", "t"], ["eq", "Equation", "t"], ["aDec", "First Number in Decimal", "t"], ["bDec", "Second Number in Decimal", "t"]],
    fn: C["hex-calculator"], ex: { ...T("a", "1A3F"), op: 0, ...T("b", "FF") },
    exText: (o) => `Example: 1A3F + FF = ${o.hex} (decimal ${o.dec}).`,
    how: "Hex digits run 0–9 then A–F (10–15). When adding, a column that reaches 16 carries 1 into the next column, just as 10 does in decimal.\n\nDivision gives the whole-number quotient. Use mod for the remainder.",
    assume: "Whole numbers of any size. Letters can be upper or lower case, and a 0x prefix is optional.",
    faq: [["What is F + 1 in hex?", "10 (sixteen in decimal)."], ["How do I subtract hex numbers?", "Column by column, borrowing 16 instead of 10."]],
  }),
  mk({
    slug: "twos-complement-calculator", title: "Two's Complement Calculator (Signed Binary)",
    meta: "Two's Complement Calculator — Decimal ↔ Signed Binary",
    desc: "Convert a negative or positive decimal number to its two's complement binary and hex pattern at 4, 8, 16, 32 or 64 bits, or decode a bit pattern back to a signed number. Shows the one's complement too.",
    inputs: [dd("mode", "Convert", E.TC_MODES, 0), tx("value", "Number or Bit Pattern", "-42"), dd("width", "Bit Width", E.WIDTHS.map((w) => `${w}-bit`), 1)],
    results: [["binary", "Two's Complement Binary", "t"], ["decimal", "Signed Decimal", "t"], ["hex", "Hex", "t"], ["ones", "One's Complement", "t"], ["unsigned", "Same Bits as Unsigned", "t"], ["range", "Range at This Width", "t"], ["how", "How It's Formed", "t"]],
    fn: C["twos-complement-calculator"], ex: { mode: 0, ...T("value", "-42"), width: 1 },
    exText: (o) => `Example: −42 in 8-bit two's complement is ${o.binary} (${o.hex}), which is ${o.unsigned} if read as unsigned.`,
    how: "To make a negative number, write its positive value in binary, flip every bit (one's complement) and add 1. The top bit then works as the sign: 1 means negative.\n\nTo decode, enter the bit pattern (binary, or hex with 0x) and choose the width. If the top bit is 1, the value is the pattern minus 2^width.",
    assume: "Standard two's complement integers as used by every modern CPU. The width must hold the number.",
    faq: [["What is −1 in two's complement?", "All ones: 11111111 in 8 bits (0xFF)."], ["Why use two's complement?", "Adding and subtracting work the same for signed and unsigned numbers, and there is only one zero."]],
  }),
  mk({
    slug: "bitwise-calculator", title: "Bitwise Calculator (AND, OR, XOR, NOT & Bit Shift)",
    meta: "Bitwise Calculator — AND, OR, XOR, NOT, Left & Right Shift",
    desc: "Apply bitwise AND, OR, XOR, NOT, NAND, NOR or a left/right bit shift to two numbers (decimal, 0x hex or 0b binary) at a chosen bit width. Shows the result in decimal, hex and binary side by side.",
    inputs: [tx("a", "A (decimal, 0x… or 0b…)", "0b11001010"), dd("op", "Operation", E.BIT_OPS, 2), tx("b", "B (or shift amount)", "0x0F"), dd("width", "Bit Width", E.WIDTHS.map((w) => `${w}-bit`), 1)],
    results: [["bin", "Result (Binary)", "t"], ["dec", "Result (Decimal)", "t"], ["hex", "Result (Hex)", "t"], ["signed", "Result as Signed", "t"], ["aBin", "A in Binary", "t"], ["bBin", "B in Binary", "t"]],
    fn: C["bitwise-calculator"], ex: { ...T("a", "0b11001010"), op: 2, ...T("b", "0x0F"), width: 1 },
    exText: (o) => `Example: 11001010 XOR 00001111 = ${o.bin} (${o.dec}). XOR with 0x0F flips the low four bits.`,
    how: "AND keeps a bit only if both inputs have it, so it's used to mask bits out. OR sets bits. XOR flips the bits where B is 1. NOT inverts every bit within the chosen width.\n\nA left shift by n multiplies by 2ⁿ, dropping bits that fall off the top. A right shift divides by 2ⁿ (logical shift).",
    assume: "Values are taken modulo 2^width; negative inputs are stored as two's complement. A right shift is logical (fills with zeros).",
    faq: [["What is XOR used for?", "Toggling bits, simple checksums, parity, and swapping values without a temporary variable."], ["What does 1 << 4 equal?", "16."]],
  }),
  mk({
    slug: "llm-token-calculator", title: "LLM Token Calculator (Text to Tokens Estimate)",
    meta: "Token Calculator — Estimate ChatGPT, Claude & LLM Tokens",
    desc: "Estimate how many tokens a piece of text uses in ChatGPT, Claude, Gemini and other LLMs from its characters and words, with a likely range, page count and the share of a context window it fills.",
    inputs: [tx("text", "Text (paste a sample)", "Tokens are the chunks of text a language model reads. One token is about four characters of English."), num("words", "Or Word Count (overrides the text)", 0, 0, 1e8, 1), num("context", "Context Window (tokens)", 200000, 0, 1e8, 1000)],
    results: [["tokens", "Estimated Tokens", "n", 0], ["range", "Likely Range", "t"], ["words", "Words", "n", 0], ["chars", "Characters", "n", 0], ["pages", "Pages (500 words)", "n", 2], ["fits", "Context Window Used", "t"], ["perToken", "Characters per Token", "n", 2]],
    fn: C["llm-token-calculator"], ex: { ...T("text", "Tokens are the chunks of text a language model reads. One token is about four characters of English."), words: 0, context: 200000 },
    exText: (o) => `Example: this ${o.words}-word sentence is about ${o.tokens} tokens.`,
    how: "LLMs read text as tokens: whole short words, pieces of longer words, punctuation and spaces. In English one token averages about 4 characters, or 3/4 of a word, so 1,000 words ≈ 1,330 tokens.\n\nFor exact counts, use the provider's own tokenizer or token-counting API. For a long document, enter its word count instead of pasting it.",
    assume: "Estimate for English prose. Code, numbers, non-English text and emoji use more tokens per character. Tokenizers differ by model (newer Claude tokenizers can use up to ~35% more tokens for the same text). The text box holds 300 characters.",
    faq: [["How many tokens is 1,000 words?", "About 1,300–1,400 tokens in English."], ["Do spaces count as tokens?", "Usually a space joins the word after it in one token."]],
  }),
  mk({
    slug: "ai-api-cost-calculator", title: "AI API Cost Calculator (LLM Token Pricing)",
    meta: "AI API Cost Calculator — Claude, OpenAI & Gemini Token Cost",
    desc: "Estimate what an AI API costs per request, per day, per month and per year from input and output tokens per request, the number of requests and each model's price per million tokens. Includes prompt-caching and batch discounts.",
    inputs: [dd("model", "Model", E.AI_MODELS.map(([l]) => l), 1), num("customIn", "Custom Input Price ($ per 1M tokens)", 0, 0, 1000, 0.01, "$"), num("customOut", "Custom Output Price ($ per 1M tokens)", 0, 0, 1000, 0.01, "$"), num("inTok", "Input Tokens per Request", 2000, 0, 1e7, 1), num("outTok", "Output Tokens per Request", 500, 0, 1e7, 1), num("requests", "Requests per Day", 1000, 0, 1e9, 1), pct("cached", "Input Served from Prompt Cache (%)", 0), dd("batch", "Batch API (50% off)", ["No", "Yes"], 0)],
    results: [["monthly", "Monthly Cost", "c"], ["per", "Cost per Request", "t"], ["perThousand", "Cost per 1,000 Requests", "c"], ["daily", "Daily Cost", "c"], ["yearly", "Yearly Cost", "c"], ["inShare", "Share from Input Tokens", "p", 1], ["rates", "Rates Used", "t"]],
    fn: C["ai-api-cost-calculator"], ex: { model: 1, customIn: 0, customOut: 0, inTok: 2000, outTok: 500, requests: 1000, cached: 0, batch: 0 },
    exText: (o) => `Example: 1,000 requests a day on Claude Sonnet 5.5, each with 2,000 input and 500 output tokens, costs about $${o.monthly} a month (${o.per} per request).`,
    how: "Cost per request = input tokens × input price + output tokens × output price, with prices quoted per million tokens. Output tokens usually cost about 5× more than input.\n\nIf you resend the same long prompt, prompt caching bills those cached input tokens at about 10% of the normal price. Batch processing halves the price for jobs that can wait. For OpenAI, Gemini or any other model, choose Custom and enter its current prices.",
    assume: "Claude presets are Anthropic's first-party list prices (cached November 2026). Prompt-cache writes cost a little more than normal input and aren't modelled. A month is 30 days. Prices change, so check the provider's pricing page.",
    faq: [["How much does the Claude API cost?", "From $0.10 / $0.50 per million input / output tokens for Haiku 5.5 to $8 / $40 for Fable 5.2. Sonnet 5.5 is $2 / $10."], ["How can I cut AI API costs?", "Cache long repeated prompts, batch non-urgent jobs, keep outputs short and use the smallest model that does the job well."]],
  }),
  mk({
    slug: "aws-lambda-cost-calculator", title: "AWS Lambda Cost Calculator (Requests & GB-Seconds)",
    meta: "AWS Lambda Pricing Calculator — Monthly Cost from Invocations",
    desc: "Estimate your monthly AWS Lambda bill from invocations, average duration and memory size, on x86 or Arm (Graviton), with or without the always-free tier. Shows the compute (GB-second) and request charges.",
    inputs: [num("requests", "Invocations per Month", 5000000, 0, 1e12, 1), num("ms", "Average Duration (ms)", 120, 1, 900000, 1, "ms"), num("memory", "Memory (MB)", 512, 128, 10240, 1, "MB"), dd("arch", "Architecture", E.ARCH, 0), dd("free", "Free Tier", ["Include (1 M requests + 400,000 GB-s)", "Exclude"], 0)],
    results: [["total", "Monthly Cost", "c"], ["compute", "Compute (GB-s) Charge", "c"], ["reqCost", "Request Charge", "c"], ["gbs", "GB-Seconds Used", "n", 0], ["perMillion", "Cost per Million Invocations", "c"], ["yearly", "Yearly Cost", "c"], ["note", "Note", "t"]],
    fn: C["aws-lambda-cost-calculator"], ex: { requests: 5000000, ms: 120, memory: 512, arch: 0, free: 0 },
    exText: (o) => `Example: 5 million invocations a month at 120 ms and 512 MB use ${o.gbs} GB-seconds. After the free tier that costs about $${o.total} a month.`,
    how: "Lambda bills $0.20 per million requests plus compute: GB-seconds = invocations × duration (s) × memory (GB), at $0.0000166667 per GB-s on x86 or about 20% less on Arm.\n\nCompute and memory scale together, so doubling memory can halve the duration of CPU-bound functions and cost the same.",
    assume: "US East (N. Virginia) on-demand list prices. Excludes provisioned concurrency, ephemeral storage above 512 MB, data transfer and tiered discounts above 6 billion GB-s. Duration is billed per 1 ms.",
    faq: [["Is AWS Lambda free?", "The first 1 million requests and 400,000 GB-seconds each month are free on every account."], ["Is Arm cheaper on Lambda?", "Yes. Graviton (Arm) compute is about 20% cheaper per GB-second."]],
  }),
  mk({
    slug: "website-carbon-calculator", title: "Website Carbon Calculator (CO₂ per Page View)",
    meta: "Website Carbon Calculator — CO₂ per Page View & per Year",
    desc: "Estimate the carbon footprint of a web page from its transfer size and monthly page views, using the Sustainable Web Design model. Shows grams of CO₂ per view, yearly emissions and energy, and the effect of green hosting.",
    inputs: [num("mb", "Page Size (MB transferred)", 2, 0.001, 1000, 0.01, "MB"), num("views", "Page Views per Month", 10000, 0, 1e10, 1), dd("green", "Hosting", ["Standard grid electricity", "Green / renewable-powered hosting"], 0)],
    results: [["perView", "CO₂ per Page View (g)", "n", 3], ["yearly", "CO₂ per Year (kg)", "n", 2], ["kwhYear", "Energy per Year (kWh)", "n", 1], ["trees", "Trees to Absorb It (per year)", "n", 1], ["driving", "Same as Driving", "t"], ["kettle", "Same Energy as", "t"]],
    fn: C["website-carbon-calculator"], ex: { mb: 2, views: 10000, green: 0 },
    exText: (o) => `Example: a 2 MB page viewed 10,000 times a month emits about ${o.perView} g of CO₂ per view, or ${o.yearly} kg a year.`,
    how: "Find the page size in your browser's developer tools: Network tab, reload, and read the total transferred. Every gigabyte moved uses energy in data centres, networks and visitors' devices.\n\nThe quickest cuts are compressing images (WebP/AVIF), lazy-loading media, removing unused scripts and caching well so returning visitors download less.",
    assume: "Sustainable Web Design model v3: 0.81 kWh per GB, 25% returning visitors who reload 2% of the page, and a global average grid of 442 g CO₂e/kWh. Green hosting only changes the data-centre share (15%). Results are estimates.",
    faq: [["How much CO₂ does a website produce?", "A typical 2 MB page produces about half a gram per view, so a site with 100,000 monthly views emits about 650 kg a year."], ["Does green hosting make a site carbon neutral?", "No. It cuts the data-centre part, but networks and visitors' devices use most of the energy."]],
  }),
];

runBatch(IT, TOOLS);
