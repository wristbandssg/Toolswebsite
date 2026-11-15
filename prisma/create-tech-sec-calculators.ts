// One-time (but safe to re-run) batch setup script: 8 security & developer tools from the tech keyword
// check (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md), filed under Science > Computer, Network
// & IT Calculators. Formulas live in src/lib/calc-engine-tech-sec.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-tech-sec-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-sec";
import { mk, num, dd, tx, date, T, runBatch, type ToolDef } from "./trv-tool-kit";

const C = E.techSecCustomCalculators;
const IT = "computer-network-it-calculators";

const TOOLS: ToolDef[] = [
  mk({
    slug: "cvss-3-1-calculator", title: "CVSS 3.1 Calculator (Base & Temporal Score)",
    meta: "CVSS 3.1 Calculator — Vulnerability Base Score from Vector",
    desc: "Paste a CVSS v3.1 vector string to get the base score, severity rating, impact and exploitability sub-scores, and the temporal score when exploit maturity, remediation level and report confidence are included.",
    inputs: [tx("vector", "CVSS 3.1 Vector String", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")],
    results: [["base", "Base Score", "n", 1], ["severity", "Severity", "t"], ["temporal", "Temporal Score", "t"], ["impact", "Impact Sub-Score", "n", 1], ["expl", "Exploitability Sub-Score", "n", 1]],
    fn: C["cvss-3-1-calculator"], ex: T("vector", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
    exText: (o) => `Example: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H (remote, no login, full impact) scores ${o.base} — ${o.severity}.`,
    how: "The vector lists eight base metrics: Attack Vector (N/A/L/P), Attack Complexity (L/H), Privileges Required (N/L/H), User Interaction (N/R), Scope (U/C) and Confidentiality, Integrity and Availability impact (H/L/N). Copy it from the NVD entry or the advisory.\n\nAdd E:, RL: and RC: for the temporal score. For example, E:P/RL:O/RC:C means proof-of-concept code exists, an official fix is out and the report is confirmed.",
    assume: "Implements the FIRST CVSS v3.1 specification, including its Roundup function. v3.0 vectors give the same result in almost every case. Environmental metrics (CR, IR, AR and the M* overrides) aren't included.",
    faq: [["What CVSS score is critical?", "9.0–10.0 is Critical, 7.0–8.9 High, 4.0–6.9 Medium and 0.1–3.9 Low."], ["Why does Scope: Changed raise the score?", "The flaw affects resources beyond the vulnerable component, such as a VM escape. The impact formula and the PR weights change to reflect that."]],
  }),
  mk({
    slug: "cvss-4-calculator", title: "CVSS 4.0 Calculator (CVSS-B, BT & BTE Score)",
    meta: "CVSS 4.0 Calculator — Score a v4.0 Vector String",
    desc: "Score a CVSS v4.0 vector with the official FIRST MacroVector method. Works for base metrics, threat (exploit maturity E) and environmental metrics, and shows the severity and MacroVector.",
    inputs: [tx("vector", "CVSS 4.0 Vector String", "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N")],
    results: [["score", "CVSS 4.0 Score", "n", 1], ["severity", "Severity", "t"], ["kind", "Score Type", "t"], ["macro", "MacroVector (EQ1–EQ6)", "t"]],
    fn: C["cvss-4-calculator"], ex: T("vector", "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"),
    exText: (o) => `Example: a remote, no-interaction flaw with high impact on the vulnerable system (VC/VI/VA:H) and none on others scores ${o.score} (${o.severity}) in CVSS 4.0, against 9.8 in v3.1.`,
    how: "CVSS 4.0 splits impact into the Vulnerable system (VC, VI, VA) and Subsequent systems (SC, SI, SA). It adds Attack Requirements (AT) and a three-level User Interaction (N, P = passive, A = active).\n\nAdd E:A, E:P or E:U for exploit maturity. Leaving it out assumes the worst case, Attacked. Add CR/IR/AR and M* metrics for an environmental score.",
    assume: "Uses the FIRST reference calculator's 270-entry MacroVector table and interpolation (BSD-2 licence). Supplemental metrics (S, AU, R, V, RE, U) don't change the score, so they are ignored.",
    faq: [["Is CVSS 4.0 different from 3.1?", "Yes. The metrics and maths are new, so the same flaw can score differently. 4.0 drops Scope and adds Attack Requirements and subsequent-system impact."], ["What is CVSS-BT?", "Base + Threat: the base score adjusted for exploit maturity (E)."]],
  }),
  mk({
    slug: "password-entropy-calculator", title: "Password Entropy & Strength Calculator (Crack Time)",
    meta: "Password Entropy Calculator — Strength in Bits & Time to Crack",
    desc: "Check how strong a password is: entropy in bits, the number of possible combinations and the average time to crack it at online or offline guessing speeds. Or enter a length and character-set size instead of a real password.",
    inputs: [tx("password", "Password (leave blank to use length & pool)", "Tr0ub4dor&3"), num("length", "Length (if no password)", 12, 1, 200, 1), num("pool", "Character Pool Size (if no password)", 94, 2, 100000, 1), dd("rate", "Attacker Speed", E.RATES.map(([l]) => l), 3)],
    results: [["crack", "Average Time to Crack", "t"], ["bits", "Entropy (bits)", "n", 1], ["strength", "Strength", "t"], ["combos", "Possible Combinations", "t"], ["pool", "Character Pool", "n", 0], ["length", "Length", "n", 0], ["note", "Note", "t"]],
    fn: C["password-entropy-calculator"], ex: { ...T("password", "Tr0ub4dor&3"), length: 12, pool: 94, rate: 3 },
    exText: (o) => `Example: "Tr0ub4dor&3" uses all four character types (pool ${o.pool}) over ${o.length} characters, which is ${o.bits} bits. That takes ${o.crack} on average for one GPU against a fast hash, if the password were random.`,
    how: "Entropy = length × log₂(pool). The pool is 26 for lower-case, 26 more for upper-case, 10 for digits and 33 for symbols. Each extra bit doubles the guesses needed. Length matters more than complexity: four random words beat a short password full of symbols.\n\nNothing you type is stored or sent anywhere except to calculate this result.",
    assume: "Assumes every character was chosen at random. Real passwords built from words, names, dates or keyboard patterns fall much faster to dictionary attacks. Average crack time = half the keyspace ÷ guesses per second.",
    faq: [["How many bits of entropy is a strong password?", "60+ bits is good, and 80+ bits resists offline GPU attacks. A random 16-character password with all character types is about 105 bits."], ["Is a long passphrase better?", "Yes. Four or five random common words give 50–65 bits and are easy to remember."]],
  }),
  mk({
    slug: "hash-calculator", title: "Hash Calculator (MD5, SHA-1, SHA-256 & SHA-512)",
    meta: "Hash Calculator — MD5, SHA-1, SHA-256, SHA-512 of Text",
    desc: "Generate the MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hash of any text (UTF-8) for checksums, verifying downloads or testing code.",
    inputs: [tx("text", "Text to Hash", "abc")],
    results: [["sha256", "SHA-256", "t"], ["md5", "MD5", "t"], ["sha1", "SHA-1", "t"], ["sha384", "SHA-384", "t"], ["sha512", "SHA-512", "t"], ["upper", "SHA-256 (upper case)", "t"], ["bytes", "Input Size (bytes, UTF-8)", "n", 0]],
    fn: C["hash-calculator"], ex: T("text", "abc"),
    exText: (o) => `Example: the SHA-256 of "abc" is ${o.sha256} and its MD5 is ${o.md5}.`,
    how: "A hash turns any input into a fixed-length fingerprint. Changing one character changes the whole hash. Compare the result with the checksum a website publishes to confirm a file or message wasn't changed.\n\nText is hashed exactly as typed, including spaces, using UTF-8 bytes.",
    assume: "Text up to 300 characters. To hash a whole file, use sha256sum (Linux/Mac) or certutil -hashfile (Windows). MD5 and SHA-1 are broken for security use; use them only for non-security checksums. Never store passwords as plain SHA hashes.",
    faq: [["Can a hash be reversed?", "No. Short or common inputs can still be found by guessing, which is why passwords need slow, salted hashes like bcrypt or Argon2."], ["Which hash should I use?", "SHA-256 or better for anything security-related."]],
  }),
  mk({
    slug: "unix-timestamp-calculator", title: "Unix Timestamp Converter (Epoch ↔ Date)",
    meta: "Unix Timestamp Calculator — Epoch Time to Date & Back",
    desc: "Convert a Unix epoch timestamp (seconds or milliseconds) to a UTC and local date and time, or a date and time to a timestamp. Includes ISO 8601, Discord timestamp tags and the 2038 check.",
    inputs: [dd("mode", "Convert", E.TS_MODES, 0), tx("ts", "Unix Timestamp (seconds or ms)", "1700000000"), date("date", "Date (for Date → timestamp)", "today"), tx("time", "Time (HH:MM, for Date → timestamp)", "12:00"), num("offset", "Your UTC Offset (hours)", 0, -12, 14, 0.25, "h")],
    results: [["seconds", "Unix Timestamp (seconds)", "t"], ["utc", "UTC Date & Time", "t"], ["local", "Local Date & Time", "t"], ["iso", "ISO 8601", "t"], ["millis", "Milliseconds", "t"], ["discord", "Discord Timestamp", "t"], ["y2038", "Year 2038 Check", "t"]],
    fn: C["unix-timestamp-calculator"], ex: { mode: 0, ...T("ts", "1700000000"), date: 20408, ...T("time", "12:00"), offset: 0 },
    exText: (o) => `Example: timestamp 1700000000 is ${o.utc} (${o.iso}).`,
    how: "Unix time counts seconds since 1 January 1970 00:00:00 UTC. A 10-digit number is seconds; a 13-digit number (JavaScript, Java) is milliseconds. Both are detected automatically.\n\nFor Date → timestamp, enter the date, the time and the UTC offset that time is in. For example, −5 for New York in winter or 5.5 for India.",
    assume: "Leap seconds are ignored, as in POSIX time. Enter the offset yourself because this tool doesn't apply daylight-saving rules. The Discord tag shows the time in each viewer's own time zone.",
    faq: [["What is epoch time?", "The number of seconds since 00:00:00 UTC on 1 January 1970."], ["What is the year 2038 problem?", "Signed 32-bit timestamps overflow at 03:14:07 UTC on 19 January 2038 (2,147,483,647 seconds)."]],
  }),
  mk({
    slug: "discord-permissions-calculator", title: "Discord Permissions Calculator (Bot Permission Integer)",
    meta: "Discord Permissions Calculator — Bot Invite Permission Integer",
    desc: "Turn a list of Discord permissions into the permission integer for a bot invite link, or decode an integer back into the permissions it grants.",
    inputs: [tx("perms", "Permission Names (comma-separated) or an Integer", "View Channel, Send Messages, Embed Links, Read Message History")],
    results: [["value", "Permission Integer", "t"], ["list", "Permissions", "t"], ["count", "Number of Permissions", "n", 0], ["hex", "Hex", "t"], ["invite", "Invite Link Template", "t"], ["note", "Note", "t"]],
    fn: C["discord-permissions-calculator"], ex: T("perms", "View Channel, Send Messages, Embed Links, Read Message History"),
    exText: (o) => `Example: View Channel, Send Messages, Embed Links and Read Message History = ${o.value}.`,
    how: "Every Discord permission is one bit. The integer is the sum of 2^bit for each permission you choose. Type names like Send Messages or Manage Roles, or paste an integer such as 8 to see what it grants.\n\nPut the number in the permissions= part of your bot's OAuth2 invite URL and replace YOUR_APP_ID with your application ID.",
    assume: "Uses Discord's documented permission bits up to Use External Apps (bit 50). Channel overwrites can still deny permissions in specific channels.",
    faq: [["What is permission 8?", "Administrator: it grants everything."], ["What integer lets a bot read and send messages?", "View Channel + Send Messages + Read Message History = 68608."]],
  }),
  mk({
    slug: "sms-segment-calculator", title: "SMS Segment & Length Calculator (GSM-7 vs Unicode)",
    meta: "SMS Segment Calculator — Characters, Encoding & Message Parts",
    desc: "Count how many SMS segments a text message uses. Detects GSM-7 vs Unicode (UCS-2) encoding, counts extended characters as two, and shows which characters (like emoji or curly quotes) force Unicode.",
    inputs: [tx("text", "Message Text", "Hi Sam, your appointment is confirmed for Tue 3pm. Reply STOP to opt out.")],
    results: [["segments", "SMS Segments", "n", 0], ["encoding", "Encoding", "t"], ["units", "Characters Counted", "n", 0], ["chars", "Characters Typed", "n", 0], ["left", "Characters Left in Last Segment", "n", 0], ["perPart", "Limit", "t"], ["culprits", "Unicode Characters Found", "t"]],
    fn: C["sms-segment-calculator"], ex: T("text", "Hi Sam, your appointment is confirmed for Tue 3pm. Reply STOP to opt out."),
    exText: (o) => `Example: this ${o.chars}-character reminder is plain GSM-7, so it fits in ${o.segments} segment with ${o.left} characters to spare.`,
    how: "A single GSM-7 SMS holds 160 characters. Longer messages are split into 153-character parts, because each part needs a header to rejoin them. A single emoji, curly quote or accented letter outside the GSM set switches the whole message to Unicode, which drops the limits to 70 and 67.\n\nCharacters like € [ ] { } ^ ~ | count as two in GSM-7.",
    assume: "GSM 03.38 default alphabet without national language shift tables. Carriers such as Twilio bill per segment, so cost = segments × price per segment.",
    faq: [["Why does my 100-character text use 2 SMS?", "It probably contains an emoji or a smart quote, which forces Unicode with a 70-character limit."], ["How many characters per SMS segment?", "160 in GSM-7 (153 when split), or 70 in Unicode (67 when split)."]],
  }),
  mk({
    slug: "infix-postfix-calculator", title: "Infix to Postfix & Prefix Converter (Shunting-Yard)",
    meta: "Infix to Postfix Calculator — Prefix, RPN & Evaluate",
    desc: "Convert an infix expression to postfix (reverse Polish) and prefix notation with the shunting-yard algorithm, showing the stack at each step. Also converts postfix or prefix back to infix and evaluates numeric expressions.",
    inputs: [dd("mode", "Convert", E.FIX_MODES, 0), tx("expr", "Expression", "A + B * (C - D) / E")],
    results: [["postfix", "Postfix (RPN)", "t"], ["prefix", "Prefix (Polish)", "t"], ["infix", "Infix", "t"], ["value", "Value", "t"], ["steps", "Shunting-Yard Steps", "t"]],
    fn: C["infix-postfix-calculator"], ex: { mode: 0, ...T("expr", "A + B * (C - D) / E") },
    exText: (o) => `Example: A + B * (C - D) / E becomes ${o.postfix} in postfix and ${o.prefix} in prefix.`,
    how: "Use letters or numbers with + − * / % ^ and brackets. ^ is right-associative (2^3^2 = 2^9); the other operators are left-associative.\n\nIn postfix the operator comes after its two operands (A B +), and in prefix before them (+ A B). Separate tokens with spaces when converting from postfix or prefix.",
    assume: "Binary operators only (no unary minus). Values are shown only when every operand is a number.",
    faq: [["Why use postfix notation?", "It needs no brackets and is easy for a computer to evaluate with one stack. RPN calculators work this way."], ["What is the shunting-yard algorithm?", "Dijkstra's method for converting infix to postfix: operands go straight to the output, and operators wait on a stack until a lower-precedence operator or a closing bracket arrives."]],
  }),
];

runBatch(IT, TOOLS);
