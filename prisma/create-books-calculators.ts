// One-time (but safe to re-run) batch setup script: creates the 12 new tools from the books,
// publishing & reading keyword check (15 Nov 2026 — Claude outputs/Books_Keyword_Check.md).
// Arts & Entertainment > Art, Film & Creator Income (5) and > Books, Reading & Writing (7, new sub —
// created by prisma/setup-arts-entertainment-category.ts --apply). Formulas live in
// src/lib/calc-engine-books.ts; examples are computed from the engine. All tools are Published.
//
// HOW TO RUN
//   npx tsx prisma/setup-arts-entertainment-category.ts --apply   (once, creates the new sub)
//   npx tsx prisma/create-books-calculators.ts        (BOOKS_DRY=1 → check only, no database)
// or
//   npm run db:create-books-calculators

import * as E from "../src/lib/calc-engine-books";
import { mk, num, money, pct, dd, date, tx, T, upsertTools, type ToolDef } from "./trv-tool-kit";
import { nfmt } from "../src/lib/trv-core";

const C = E.booksCustomCalculators;
const n = (x: unknown, dp = 0) => nfmt(Number(x), dp);
const d$ = (x: unknown) => `$${Number(x).toFixed(2)}`;

const INCOME: ToolDef[] = [
  mk({
    slug: "kdp-print-cost-calculator", title: "KDP Print Cost & Royalty Calculator (Paperback & Hardcover)",
    meta: "KDP Print Cost Calculator — Paperback & Hardcover Royalty",
    desc: "Calculate Amazon KDP printing cost and royalty for a paperback or hardcover from page count, ink and trim size. Shows the 50%/60% royalty rate, expanded distribution, minimum list price and the price you need for a target royalty.",
    inputs: [dd("format", "Format", E.KDP_FORMATS, 0), dd("ink", "Ink & Paper", E.KDP_INKS, 0), dd("trim", "Trim Size", E.KDP_TRIMS, 0), num("pages", "Page Count", 250, 24, 828, 1), money("price", "List Price (Amazon.com)", 14.99), money("target", "Target Royalty per Copy", 3), num("copies", "Copies Sold per Month (Optional)", 0, 0, 1e6, 1), money("override", "Print Cost Override (Optional — from KDP's calculator)", 0)],
    results: [["royalty", "Royalty per Amazon Sale", "c"], ["cost", "Printing Cost per Copy", "c"], ["rate", "Royalty Rate", "p", 0], ["expanded", "Expanded Distribution Royalty", "t"], ["minPrice", "Minimum List Price", "c"], ["targetPrice", "List Price for Your Target Royalty", "c"], ["monthly", "Monthly Royalties", "c"], ["note", "Note", "t"]],
    fn: C["kdp-print-cost-calculator"], ex: { format: 0, ink: 0, trim: 0, pages: 250, price: 14.99, target: 3, copies: 0, override: 0 },
    exText: (o) => `Example: a 250-page black-ink 6" × 9" paperback costs ${d$(o.cost)} to print. At $14.99 it earns ${o.rate}%, which is ${d$(o.royalty)} per Amazon sale. The lowest list price KDP allows is ${d$(o.minPrice)}.`,
    how: "KDP prints each copy on demand and takes the printing cost out of your royalty: royalty = list price × royalty rate − printing cost. On Amazon.com a paperback earns 60% at $9.99 or more and 50% below $9.99. Hardcovers earn 60%.\n\nChoose the format, ink and trim size, and enter the page count from your final interior file. Large trim means wider than 6.12\" or taller than 9\". Expanded distribution (bookstores and libraries) pays 40% of list price minus printing.",
    assume: "Uses KDP's 2025 US marketplace printing table: black-ink paperback $2.30 up to 108 pages, then $1.00 + $0.012 per page ($2.84 and $0.017 for large trim); premium colour $3.60 up to 40 pages, then $1.00 + $0.065 per page; standard colour $1.00 + $0.0255 per page (72–600 pages). Hardcover black ink $6.80 up to 108 pages, then $5.65 + $0.012 per page. Other marketplaces use different costs and VAT. KDP changes its prices from time to time, so enter the figure from KDP's own calculator as an override if it differs.",
    faq: [["How much does KDP charge to print a book?", "A 250-page black-ink paperback costs about $4.00 per copy on Amazon.com. Colour and hardcovers cost much more."], ["What royalty does KDP pay on paperbacks?", "On Amazon.com, 60% of the list price at $9.99 or more and 50% below $9.99, minus the printing cost. Expanded distribution pays 40% minus printing."], ["Can I set any price on KDP?", "No. The list price must cover printing at your royalty rate. The minimum list price above is the lowest KDP allows."]],
  }),
  mk({
    slug: "kindle-royalty-calculator", title: "Kindle eBook Royalty Calculator (35% vs 70%)",
    meta: "Kindle Royalty Calculator — 35% vs 70% Plan & KU Page Reads",
    desc: "Calculate your Kindle eBook royalty per sale on the 35% and 70% plans, including the delivery fee for your file size. Add monthly sales and Kindle Unlimited page reads to estimate your monthly KDP income.",
    inputs: [money("price", "eBook List Price", 4.99, "$", 200), num("sizeMB", "File Size (MB)", 2, 0, 650, 0.1), num("sales", "Sales per Month (Optional)", 0, 0, 1e7, 1), num("kenp", "Kindle Unlimited Pages Read per Month (Optional)", 0, 0, 1e9, 1), num("kenpRate", "KENP Rate ($ per Page)", 0.0045, 0, 0.02, 0.0001, "$")],
    results: [["best", "Royalty per Sale (Best Plan)", "c"], ["plan", "Which Plan", "t"], ["r70", "70% Plan Royalty", "t"], ["r35", "35% Plan Royalty", "c"], ["delivery", "Delivery Fee (70% Plan)", "c"], ["monthlySales", "Monthly Sales Royalties", "c"], ["ku", "Monthly Kindle Unlimited Income", "c"], ["total", "Total Monthly KDP Income", "c"]],
    fn: C["kindle-royalty-calculator"], ex: { price: 4.99, sizeMB: 2, sales: 100, kenp: 20000, kenpRate: 0.0045 },
    exText: (o) => `Example: a $4.99 eBook with a 2 MB file earns ${d$(o.best)} per sale on the 70% plan. 100 sales and 20,000 KU pages a month bring in about ${d$(o.total)}.`,
    how: "On the 70% plan you get 70% of the list price after a delivery fee of $0.15 per MB. The 70% plan is only allowed for prices from $2.99 to $9.99. The 35% plan pays 35% of the list price with no delivery fee, at any price from $0.99.\n\nKindle Unlimited pays per page read (KENP) from a monthly fund. The rate is usually close to $0.0045 per page. Enter the latest rate from your KDP reports.",
    assume: "Amazon.com (US) rules with no VAT. Delivery fee $0.15/MB, minimum $0.01. The 70% plan also needs the book to be priced at least 20% below the print edition. Other marketplaces have different fees and VAT.",
    faq: [["Is the 70% or 35% Kindle royalty better?", "The 70% plan pays more for nearly every book priced $2.99–$9.99. It only loses when the file is very large, such as an image-heavy book."], ["How much does Kindle Unlimited pay per page?", "Usually around $0.004–$0.005 per page read. The rate changes every month."]],
  }),
  mk({
    slug: "amazon-book-sales-calculator", title: "Amazon Book Sales Calculator (BSR to Sales)",
    meta: "Amazon Book Sales Calculator — Kindle & Paperback BSR to Sales",
    desc: "Estimate how many copies a book sells a day and a month from its Amazon Best Sellers Rank (BSR), in the Kindle Store or the print Books store. Add your royalty per copy to see the monthly and yearly income.",
    inputs: [dd("store", "Amazon Store", E.BSR_STORES, 0), num("bsr", "Best Sellers Rank (BSR)", 25000, 1, 1e7, 1), money("royalty", "Royalty per Copy", 3)],
    results: [["daily", "Estimated Sales per Day", "n", 2], ["monthly", "Estimated Sales per Month", "n", 0], ["monthlyRoyalty", "Estimated Monthly Royalties", "c"], ["yearly", "Estimated Sales per Year", "n", 0], ["yearlyRoyalty", "Estimated Yearly Royalties", "c"], ["tier", "What This Rank Means", "t"]],
    fn: C["amazon-book-sales-calculator"], ex: { store: 0, bsr: 25000, royalty: 3 },
    exText: (o) => `Example: a Kindle eBook ranked #25,000 sells about ${o.daily} copies a day, or roughly ${n(o.monthly)} a month. At $3 a copy that is about ${d$(o.monthlyRoyalty)} a month.`,
    how: "Find the Best Sellers Rank under Product Details on the book's Amazon page. Use the overall rank (for example \"#25,000 in Kindle Store\"), not a category rank.\n\nBSR is updated every hour and weighted toward recent sales, so one day's rank can jump around. Check it over several days for a better estimate.",
    assume: "Sales are estimated from the rank on a smooth log-log curve through commonly cited industry estimates for Amazon.com. Amazon doesn't publish its formula, and the real numbers change with the season and the competition. Treat the result as a rough range, not an exact figure. Kindle Unlimited borrows count toward eBook rank.",
    faq: [["How many books does a BSR of 100,000 sell?", "About one copy a day in the Kindle Store, and a little less in print."], ["Is a lower BSR better?", "Yes. #1 is the best-selling book in the store, so the smaller the number, the more copies it sells."]],
  }),
  mk({
    slug: "book-publishing-cost-calculator", title: "Book Publishing Cost Calculator (Self-Publishing Budget)",
    meta: "Book Publishing Cost Calculator — Self-Publishing Budget",
    desc: "Add up what it costs to self-publish a book: editing for your word count, cover design, formatting, ISBNs, illustrations, copyright and marketing. Shows how many copies you need to sell to break even.",
    inputs: [num("words", "Word Count", 80000, 0, 1e6, 100), dd("edit", "Editing", E.EDIT_LEVELS.map(([l]) => l), 2), dd("cover", "Cover Design", E.COVERS.map(([l]) => l), 3), money("formatting", "Interior Formatting / Typesetting", 300), dd("isbn", "ISBN", E.ISBNS.map(([l]) => l), 0), money("illustrations", "Illustrations / Images", 0), money("copyright", "Copyright Registration (US $65)", 65), money("marketing", "Launch Marketing & Ads", 500), num("authorCopies", "Author Copies to Order", 0, 0, 1e5, 1), money("copyCost", "Cost per Author Copy (Print + Shipping)", 6), money("royalty", "Royalty per Copy Sold", 3)],
    results: [["total", "Total Publishing Cost", "c"], ["edit", "Editing", "c"], ["cover", "Cover Design", "c"], ["isbn", "ISBN", "c"], ["other", "Formatting, Illustrations & Copyright", "c"], ["marketing", "Marketing & Author Copies", "c"], ["breakEven", "Copies to Sell to Break Even", "n", 0], ["perThousand", "Cost per 1,000 Words", "c"]],
    fn: C["book-publishing-cost-calculator"], ex: { words: 80000, edit: 2, cover: 3, formatting: 300, isbn: 0, illustrations: 0, copyright: 65, marketing: 500, authorCopies: 0, copyCost: 6, royalty: 3 },
    exText: (o) => `Example: an 80,000-word novel with copy editing, a custom print cover, $300 formatting and $500 of launch ads costs about ${d$(o.total)} to publish. At $3 a copy you need to sell ${n(o.breakEven)} copies to break even.`,
    how: "Editing is usually the largest cost and is priced per word. Proofreading is cheapest. Developmental editing (story and structure) costs the most. Pick the levels you plan to buy and enter your real quotes for everything else.\n\nPrint-on-demand platforms like KDP and IngramSpark charge nothing upfront to publish, so this budget is what you spend before your first sale.",
    assume: "Typical 2026 US freelance rates: proofreading ~$0.015/word, copy editing ~$0.025, line editing ~$0.035, developmental plus copy editing ~$0.065. Cover prices are mid-range quotes. A Bowker ISBN costs $125 for one or $295 for ten. US copyright registration is $65 online. Your own quotes will differ.",
    faq: [["How much does it cost to self-publish a book?", "Most indie authors spend $1,500–$5,000 on editing, a cover and formatting. You can publish for almost nothing if you do it yourself."], ["Do I need to buy an ISBN?", "No. KDP and IngramSpark give you a free ISBN, but they will be listed as the publisher. Buy your own if you want your imprint on the book."]],
  }),
  mk({
    slug: "book-pricing-calculator", title: "Book Pricing Calculator (List Price from Cost & Profit)",
    meta: "Book Pricing Calculator — Set Your Book's List Price",
    desc: "Work out what to price a book for any sales channel (bookstores, wholesalers, Amazon or direct) from its unit cost, the profit you want per copy and the retailer discount. Includes the break-even price, a $x.99 price and typical genre prices.",
    inputs: [money("unitCost", "Unit Cost per Copy (Printing + Shipping)", 4.5), money("profit", "Profit Wanted per Copy", 3), pct("discount", "Retailer / Wholesale Discount (%)", 40, 95), dd("genre", "Book Type (for Typical Prices)", E.GENRES.map(([l]) => l), 0)],
    results: [["charm", "Suggested List Price ($x.99)", "c"], ["recommended", "Exact Price for Your Profit", "c"], ["breakEven", "Break-Even List Price", "c"], ["net", "Your Profit per Copy at the Suggested Price", "c"], ["margin", "Profit Margin (% of List Price)", "p", 1], ["retailer", "Retailer's Share per Copy", "c"], ["typical", "Typical Price Range for This Type", "t"]],
    fn: C["book-pricing-calculator"], ex: { unitCost: 4.5, profit: 3, discount: 40, genre: 0 },
    exText: (o) => `Example: a book that costs $4.50 to print, sold with a 40% retailer discount, needs a list price of ${d$(o.recommended)} to earn $3 a copy. Rounded to ${d$(o.charm)}, you make ${d$(o.net)} per sale.`,
    how: "Retailers and wholesalers keep a discount off the list price, which is their share. You get the rest, minus what the book cost you to make. List price = (unit cost + profit) ÷ (1 − discount).\n\nCommon discounts: Amazon KDP keeps about 40%. Bookstores through IngramSpark expect 40–55%. Direct sales at events have a 0% discount. For KDP's own royalty tiers, use the KDP Print Cost & Royalty Calculator.",
    assume: "Unit cost includes printing and any shipping you pay per copy. The suggested price is rounded up to the next $x.99. Genre ranges are typical 2026 US list prices for indie and small-press books, so check what comparable titles in your category actually sell for.",
    faq: [["How do I price my book?", "Start from the price of similar books in your genre, then check that it covers your cost and the retailer discount with the profit you want. This calculator does that check."], ["What discount do bookstores expect?", "Usually 40–55% off list price, and they also expect the book to be returnable."]],
  }),
];

const READ: ToolDef[] = [
  mk({
    slug: "reading-time-calculator", title: "Reading Time Calculator (How Long to Read a Book)",
    meta: "Reading Time Calculator — How Long to Read a Book",
    desc: "Find out how long a book will take to read from its page or word count and your reading speed. You can time your own pace, see slow, average and fast readers side by side, and see how many days it takes at your daily reading time.",
    inputs: [dd("amount", "Book Length As", ["Pages", "Words"], 0), num("pages", "Pages", 300, 1, 1e5, 1), num("words", "Words", 80000, 1, 1e7, 100), num("wordsPerPage", "Words per Page", 250, 50, 1000, 1), num("wpm", "Reading Speed (words per minute)", 238, 50, 1500, 1), num("testPages", "Pace Test — Pages Read (Optional)", 0, 0, 1000, 0.5), num("testMinutes", "Pace Test — Minutes Taken (Optional)", 0, 0, 600, 0.5), num("minutesPerDay", "Reading Time per Day (minutes)", 30, 0, 1440, 1)],
    results: [["time", "Time to Read", "t"], ["hours", "Hours", "n", 1], ["days", "Days at Your Daily Reading Time", "n", 0], ["wpm", "Reading Speed Used (wpm)", "n", 0], ["pagesPerHour", "Pages per Hour", "n", 0], ["slow", "Slow Reader (150 wpm)", "t"], ["avg", "Average Adult (238 wpm)", "t"], ["fast", "Fast Reader (400 wpm)", "t"], ["words", "Words in the Book", "n", 0]],
    fn: C["reading-time-calculator"], ex: { amount: 0, pages: 300, words: 80000, wordsPerPage: 250, wpm: 238, testPages: 0, testMinutes: 0, minutesPerDay: 30 },
    exText: (o) => `Example: a 300-page book (about ${n(o.words)} words) takes ${o.time} at the average 238 words a minute. Reading 30 minutes a day, that's ${o.days} days.`,
    how: "Reading time = words ÷ reading speed. A typical paperback page holds about 250 words, so enter pages, or the exact word count if you know it.\n\nTo use your own pace, read for 10 minutes and enter the pages you got through and the minutes. The calculator works out your words per minute and uses it in place of the speed above.",
    assume: "Average adult silent reading speed for non-fiction is about 238 wpm and for fiction about 260 wpm (Brysbaert 2019 meta-analysis). Dense, technical or second-language reading is slower. Words per page vary with trim size and font: about 250 for a trade paperback and 300–400 for a large-format book.",
    faq: [["How long does it take to read 300 pages?", "About 5 hours at an average 238 words a minute, assuming 250 words a page."], ["What is a good reading speed?", "Most adults read 200–300 words a minute. Above 400 with good understanding is fast."]],
  }),
  mk({
    slug: "pages-per-day-calculator", title: "Pages Per Day Calculator (Finish a Book by a Date)",
    meta: "Pages Per Day Calculator — How Many Pages to Read a Day",
    desc: "Work out how many pages you need to read a day to finish a book by your target date. Shows pages per week, minutes a day and how far through you are, with days off taken out.",
    inputs: [num("total", "Total Pages", 400, 1, 1e5, 1), num("read", "Pages Already Read", 0, 0, 1e5, 1), date("start", "Start Reading On", "today"), date("end", "Finish By", "today+29"), num("daysOff", "Days Off (No Reading)", 0, 0, 3650, 1), num("pagesPerHour", "Your Pages per Hour", 40, 1, 500, 1)],
    results: [["ppd", "Pages to Read per Day", "n", 0], ["perWeek", "Pages per Week", "n", 0], ["minutes", "Minutes per Day", "n", 0], ["left", "Pages Left", "n", 0], ["days", "Reading Days", "n", 0], ["done", "Already Read (%)", "p", 1], ["finish", "Finish Date", "d"]],
    fn: C["pages-per-day-calculator"], ex: { total: 400, read: 0, start: 20407, end: 20436, daysOff: 0, pagesPerHour: 40 },
    exText: (o) => `Example: to read a 400-page book in 30 days you need ${o.ppd} pages a day, which is about ${o.minutes} minutes at 40 pages an hour.`,
    how: "Pages per day = pages left ÷ reading days, rounded up so you finish on time. The start and finish dates both count as reading days. Take out any days you know you won't read.\n\nUse it for a book club deadline, a school reading assignment or a yearly reading challenge.",
    assume: "Reading days include both the start and finish dates. Minutes per day use the pages per hour you enter. About 40 pages an hour is typical for a trade paperback at average speed.",
    faq: [["How many pages a day to finish a book in a week?", "Divide the pages by 7. A 350-page book needs 50 pages a day, about 1 hour 15 minutes."], ["How many pages a day to read 52 books a year?", "About 43 pages a day for books that average 300 pages (300 × 52 ÷ 365)."]],
  }),
  mk({
    slug: "book-percentage-calculator", title: "Book Percentage Calculator (How Far Through a Book)",
    meta: "Book Percentage Calculator — Page to % Read (and % to Page)",
    desc: "Find what percentage of a book you've read from your current page or Kindle location, or turn a percentage into a page number. Shows the pages and percentage left.",
    inputs: [dd("mode", "Calculate", E.PCT_MODES, 0), num("total", "Total Pages (or Locations)", 320, 1, 1e6, 1), num("current", "Current Page (or Location)", 100, 0, 1e6, 1), pct("percent", "Percentage (for % → Page)", 50)],
    results: [["pct", "Percentage Read", "p", 1], ["page", "Page / Location", "n", 0], ["left", "Pages Left", "n", 0], ["leftPct", "Percentage Left", "p", 1], ["fraction", "Progress", "t"]],
    fn: C["book-percentage-calculator"], ex: { mode: 0, total: 320, current: 100, percent: 50 },
    exText: (o) => `Example: on page 100 of a 320-page book you are ${o.pct}% through, with ${o.left} pages to go.`,
    how: "Percentage read = current page ÷ total pages × 100. It works the same for Kindle locations: enter the current and total location.\n\nSwitch to \"Percentage → page\" to find the page you need to reach for a book club checkpoint, such as 25% or the halfway point.",
    assume: "Uses the total pages you enter. Front matter and back matter (index, notes) make the story itself a little shorter than the page count.",
    faq: [["What page is halfway through a book?", "Divide the total pages by 2. Page 160 of 320 is 50%."], ["How do I calculate the percentage of a book read?", "Divide your current page by the total pages and multiply by 100."]],
  }),
  mk({
    slug: "audiobook-calculator", title: "Audiobook Calculator (Listening Time & Playback Speed)",
    meta: "Audiobook Calculator — Time Left at 1.25×, 1.5×, 2× Speed",
    desc: "Calculate how long an audiobook takes at any playback speed and how much time is left from where you are. Also shows your progress, days to finish and the time faster playback saves.",
    inputs: [num("totalH", "Audiobook Length — Hours", 10, 0, 200, 1), num("totalM", "Length — Minutes", 0, 0, 59, 1), num("doneH", "Listened So Far — Hours", 0, 0, 200, 1), num("doneM", "Listened — Minutes", 0, 0, 59, 1), num("speed", "Playback Speed (×)", 1.5, 0.5, 4, 0.05), num("minutesPerDay", "Listening Time per Day (minutes)", 45, 0, 1440, 1)],
    results: [["left", "Time Left at This Speed", "t"], ["atSpeed", "Whole Book at This Speed", "t"], ["saved", "Time Saved vs 1×", "t"], ["pct", "Progress (%)", "p", 1], ["days", "Days to Finish", "n", 0], ["wpm", "Words per Minute You Hear", "n", 0], ["words", "Approximate Words in the Book", "n", 0], ["pages", "Approximate Print Pages", "n", 0]],
    fn: C["audiobook-calculator"], ex: { totalH: 10, totalM: 0, doneH: 0, doneM: 0, speed: 1.5, minutesPerDay: 45 },
    exText: (o) => `Example: a 10-hour audiobook at 1.5× takes ${o.atSpeed}, saving ${o.saved}. Listening 45 minutes a day, you finish in ${o.days} days.`,
    how: "Real listening time = remaining length ÷ playback speed. Enter the length shown in your app at 1× and how far you've got, or leave \"listened\" at 0 for the whole book.\n\nMost listeners understand speech well up to about 1.5–2×. Above that, comprehension usually drops.",
    assume: "Audiobook narration averages about 155 words a minute at 1× speed. Print pages assume 250 words a page. App progress bars and chapter lengths may round slightly differently.",
    faq: [["How long is a 10-hour audiobook at 1.5 speed?", "6 hours 40 minutes, saving 3 hours 20 minutes."], ["How many pages is a 10-hour audiobook?", "About 370 print pages (10 × 60 × 155 words ÷ 250 words a page)."]],
  }),
  mk({
    slug: "book-page-count-calculator", title: "Book Page Count Calculator (Words to Book Pages)",
    meta: "Book Page Count Calculator — Word Count to Book Pages",
    desc: "Convert a word count, or pages in Word or Google Docs, into printed book pages for your trim size and font size. Also shows the spine width, the length class (novella, novel …) and the reading time.",
    inputs: [dd("source", "Start From", E.PC_SOURCES, 0), num("words", "Word Count", 80000, 1, 1e7, 100), num("docPages", "Manuscript Pages", 300, 1, 1e5, 1), dd("spacing", "Manuscript Spacing", E.SPACING.map(([l]) => l), 0), dd("trim", "Book Trim Size", E.TRIMS.map(([l]) => l), 3), dd("font", "Body Font Size", E.FONTS.map(([l]) => l), 1), num("extra", "Front & Back Matter Pages", 10, 0, 500, 1)],
    results: [["pages", "Printed Book Pages", "n", 0], ["body", "Pages of Text", "n", 0], ["wpp", "Words per Book Page", "n", 0], ["words", "Word Count", "n", 0], ["kind", "Length Class", "t"], ["spineWhite", "Spine Width — White Paper (in)", "n", 2], ["spineCream", "Spine Width — Cream Paper (in)", "n", 2], ["readTime", "Reading Time (238 wpm)", "t"]],
    fn: C["book-page-count-calculator"], ex: { source: 0, words: 80000, docPages: 300, spacing: 0, trim: 3, font: 1, extra: 10 },
    exText: (o) => `Example: an 80,000-word ${String(o.kind).toLowerCase()} set at 11 pt in a 6" × 9" book comes to about ${o.pages} pages, with a ${o.spineWhite}" spine on white paper.`,
    how: "Book pages = words ÷ words per page, plus front and back matter (title page, copyright, contents, acknowledgements), rounded up to an even number. Smaller trim sizes and bigger fonts mean more pages.\n\nIf you only know your Word or Google Docs page count, choose \"Manuscript pages\" and its line spacing. A double-spaced 12 pt page holds about 250 words.",
    assume: "Words per page at 11 pt with normal margins: 5×8 ≈ 260, 5.25×8 ≈ 280, 5.5×8.5 ≈ 300, 6×9 ≈ 350, 7×10 ≈ 450, 8.5×11 ≈ 600. 10 pt fits about 15% more and 12 pt about 13% less. Spine width uses KDP's paper thickness (white 0.002252\", cream 0.0025\" per page). Length classes follow SFWA award categories. Your typeset file is the final word.",
    faq: [["How many pages is 80,000 words?", "About 240 pages in a 6\" × 9\" book, or about 320 in a 5\" × 8\" paperback."], ["How many words are on a book page?", "About 250–300 in a typical paperback and 350–400 in a 6\" × 9\" book."]],
  }),
  mk({
    slug: "beat-sheet-calculator", title: "Beat Sheet Calculator (Save the Cat Story Beats)",
    meta: "Beat Sheet Calculator — Save the Cat Beats for Novels & Scripts",
    desc: "Find where each of the 15 Save the Cat story beats falls in your screenplay (page numbers) or novel (word count and chapter). Covers the catalyst, midpoint, All Is Lost, finale and every beat in between.",
    inputs: [dd("mode", "Writing", E.BEAT_MODES, 1), num("pages", "Screenplay Length (pages)", 110, 10, 300, 1), num("words", "Novel Length (words)", 80000, 1000, 500000, 500), num("chapters", "Number of Chapters (Optional)", 0, 0, 300, 1)],
    results: [["catalyst", "Catalyst", "t"], ["opening", "Opening Image", "t"], ["theme", "Theme Stated", "t"], ["setup", "Set-Up", "t"], ["debate", "Debate", "t"], ["breakTwo", "Break into Two", "t"], ["bStory", "B Story", "t"], ["fun", "Fun and Games", "t"], ["midpoint", "Midpoint", "t"], ["badGuys", "Bad Guys Close In", "t"], ["allLost", "All Is Lost", "t"], ["darkNight", "Dark Night of the Soul", "t"], ["breakThree", "Break into Three", "t"], ["finale", "Finale", "t"], ["final", "Final Image", "t"], ["length", "Total Length", "t"]],
    fn: C["beat-sheet-calculator"], ex: { mode: 1, pages: 110, words: 80000, chapters: 40 },
    exText: (o) => `Example: in an 80,000-word, 40-chapter novel the Catalyst lands at ${o.catalyst}, the Midpoint at ${o.midpoint} and All Is Lost at ${o.allLost}.`,
    how: "Save the Cat splits a story into 15 beats, each at a set point in the story. For screenplays the calculator scales Blake Snyder's page numbers for a 110-page script to your length. For novels it uses the percentage version from Jessica Brody's Save the Cat! Writes a Novel.\n\nAdd your chapter count to see which chapter each beat belongs in. The beats are guides, not rules. Most stories move them a little.",
    assume: "Screenplay beats from Snyder's 110-page sheet: Theme p. 5, Catalyst p. 12, Break into Two p. 25, B Story p. 30, Midpoint p. 55, All Is Lost p. 75, Break into Three p. 85. Novel beats by percentage: Catalyst 10%, Break into Two 20%, B Story 22%, Midpoint 50%, All Is Lost 75%, Break into Three 80%. One screenplay page ≈ one minute of screen time.",
    faq: [["Where should the midpoint be?", "Halfway: page 55 of a 110-page script, or word 40,000 of an 80,000-word novel."], ["What are the 15 Save the Cat beats?", "Opening Image, Theme Stated, Set-Up, Catalyst, Debate, Break into Two, B Story, Fun and Games, Midpoint, Bad Guys Close In, All Is Lost, Dark Night of the Soul, Break into Three, Finale and Final Image."]],
  }),
  mk({
    slug: "poem-meter-calculator", title: "Poem Meter Calculator (Syllable Counter & Scansion)",
    meta: "Poem Meter Calculator — Syllables per Line & Meter Finder",
    desc: "Count the syllables in each line of a poem and find its likely meter, such as iambic pentameter or tetrameter. Also checks a haiku's 5-7-5 pattern and whether the lines are regular.",
    inputs: [tx("lines", "Poem Lines (separate lines with / )", "Shall I compare thee to a summer's day? / Thou art more lovely and more temperate")],
    results: [["meter", "Likely Meter", "t"], ["counts", "Syllables per Line", "t"], ["pattern", "Stress Template (Iambic)", "t"], ["regular", "Line Regularity", "t"], ["lines", "Lines", "n", 0], ["avg", "Average Syllables per Line", "n", 1]],
    fn: C["poem-meter-calculator"], ex: T("lines", "Shall I compare thee to a summer's day? / Thou art more lovely and more temperate"),
    exText: (o) => `Example: Shakespeare's "Shall I compare thee to a summer's day? / Thou art more lovely and more temperate" counts ${o.counts} syllables, which is ${o.meter}.`,
    how: "Type or paste one or more lines and separate them with a slash (/). The calculator counts the syllables in each line and matches the count to a meter. 10 syllables in two-syllable feet is pentameter, and 8 is tetrameter. An extra unstressed syllable at the end is a feminine ending.\n\nSyllable count only tells you the line length. To tell iambic (da-DUM) from trochaic (DUM-da), read the line aloud and mark where the stresses fall.",
    assume: "Syllables are counted with a spelling-based rule (vowel groups, a silent final -e, -es and -ed). It is right for most English words, but names, rare words and poetic contractions (e'er, o'er, heav'n) may be off by one. Meter is inferred from syllable count, not from dictionary stress.",
    faq: [["How many syllables is iambic pentameter?", "10: five iambs (da-DUM), sometimes with an 11th unstressed syllable at the end."], ["What meter has 8 syllables a line?", "Iambic or trochaic tetrameter: four two-syllable feet."]],
  }),
];

export const BOOKS: [string, ToolDef[]][] = [
  ["art-film-creator-income-calculators", INCOME],
  ["books-reading-writing-calculators", READ],
];

async function main() {
  const all = BOOKS.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.BOOKS_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  for (const [cat, tools] of BOOKS) await upsertTools(cat, tools);
}
main().catch((e) => { console.error(e); process.exit(1); });
