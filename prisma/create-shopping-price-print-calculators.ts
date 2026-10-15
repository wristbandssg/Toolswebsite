// One-time (but safe to re-run) batch setup script: creates 9 printing and apparel tools
// from the user's shopping list (Shopping Calculators > Pricing, Markup & Seller Fee Calculators).
// See src/lib/calc-engine-shopping-price-print.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-price-print-calculators.ts
// or
//   npm run db:create-shopping-price-print-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Pricing, Markup & Seller Fee Calculators", slug: "pricing-markup-seller-fee-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "printing-cost-calculator",
    title: "Printing Cost Calculator",
    description: "Work out the cost of printing documents, flyers or booklets — pages, copies, single or double-sided, colour and black-and-white per-page costs, paper and binding.",
    metaTitle: "Printing Cost Calculator — Cost per Page & Copy",
    metaDescription: "Free printing cost calculator. Find the total and per-copy cost of printing documents and flyers in colour or B&W, with paper and binding.",
    calcInputs: [
      numberField("copies", "Copies", { default: 50, max: 1000000 }),
      numberField("pages", "Pages per Copy", { default: 12, max: 10000 }),
      dropdown("sides", "Printing", [["Single-sided", 1], ["Double-sided", 2]], 2),
      percentField("colorShare", "Share of Pages in Colour", { default: 25, max: 100, step: 5 }),
      currencyField("bwPerPage", "Black & White Cost per Page", { default: 0.08, max: 5, step: 0.005 }),
      currencyField("colorPerPage", "Colour Cost per Page", { default: 0.35, max: 10, step: 0.01 }),
      currencyField("paperPerSheet", "Paper per Sheet", { default: 0.01, max: 2, step: 0.005, required: false }),
      currencyField("bindingPerCopy", "Binding / Stapling per Copy", { default: 1.5, max: 100, step: 0.25, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Printing Cost", format: "currency", highlight: true },
      { key: "costPerCopy", label: "Cost per Copy", format: "currency" },
      { key: "printingCost", label: "Ink / Toner or Print Charge", format: "currency" },
      { key: "paperCost", label: "Paper", format: "currency" },
      { key: "sheetsUsed", label: "Sheets Used", format: "number" },
      { key: "costPerPage", label: "All-In Cost per Page", format: "currency", decimals: 3 },
    ],
    instructions:
      "Enter the copies and pages per copy, whether it's double-sided and how many pages are in colour. Use a print shop's per-page prices, or your printer's cost per page (cartridge price ÷ page yield).\n\n" +
      "Add paper per sheet if it isn't included, and binding or stapling.",
    examples: "Example: 50 copies of a 12-page double-sided booklet with a quarter of pages in colour costs $88.50 to print plus paper and binding — $166.50 in total, or $3.33 a copy.",
    assumptions: "Print shops typically charge about $0.08–$0.15 per B&W page and $0.30–$0.90 per colour page; home inkjets often cost $0.05–$0.10 per B&W page and $0.15–$0.30 per colour page in ink. Large runs (500+) are usually cheaper on an offset press.",
    faq: [
      { question: "How much does printing cost per page?", answer: "Around 8–15 cents for black and white and 30–90 cents for colour at a print shop; home printing is often cheaper per page but uses costly cartridges." },
      { question: "How do I work out my printer's cost per page?", answer: "Divide the cartridge price by its rated page yield. A $40 cartridge rated for 500 pages costs 8 cents a page." },
    ],
  },
  {
    slug: "book-printing-cost-calculator",
    title: "Book Printing Cost Calculator",
    description: "Estimate the print-on-demand cost of a book by page count, interior and binding, the royalty at your list price, and the cost of author copies.",
    metaTitle: "Book Printing Cost Calculator — POD Cost & Royalty",
    metaDescription: "Free book printing cost calculator. Estimate print-on-demand cost per book by pages, interior and binding, plus royalty and author copies.",
    calcInputs: [
      numberField("pages", "Page Count", { default: 280, min: 24, max: 1000 }),
      dropdown("interior", "Interior", [["Black & white", 0], ["Standard colour", 1], ["Premium colour", 2]], 0),
      dropdown("binding", "Binding", [["Paperback", 0], ["Hardcover", 1]], 0),
      currencyField("hardcoverExtra", "Hardcover Extra per Book", { default: 5.8, max: 50, step: 0.05, required: false }),
      currencyField("listPrice", "List Price", { default: 16.99, max: 1000, step: 0.01 }),
      percentField("royaltyRate", "Royalty Rate", { default: 60, max: 100, step: 1 }),
      numberField("copies", "Author Copies to Order", { default: 50, max: 100000, required: false }),
      currencyField("shippingPerBook", "Shipping per Author Copy", { default: 1, max: 50, step: 0.05, required: false }),
    ],
    calcResult: { label: "Print Cost per Book", format: "currency" },
    calcResults: [
      { key: "printCostPerBook", label: "Print Cost per Book", format: "currency", highlight: true },
      { key: "royaltyPerSale", label: "Royalty per Sale", format: "currency" },
      { key: "minimumListPrice", label: "Lowest List Price Before Royalty Turns Negative", format: "currency" },
      { key: "totalPrintCost", label: "Print Cost of Author Copies", format: "currency" },
      { key: "authorCopiesWithShipping", label: "Author Copies With Shipping", format: "currency" },
    ],
    instructions:
      "Enter the page count, interior type and binding, then your list price and royalty rate (60% on Amazon KDP for books sold on Amazon). Add how many author copies you want and the shipping per copy.",
    examples: "Example: a 280-page black-and-white paperback costs about $4.36 to print. At $16.99 and a 60% royalty you earn $5.83 per sale, and 50 author copies cost $268.00 with shipping.",
    assumptions: "Print-on-demand cost ≈ $1.00 per book + a per-page charge (about 1.2¢ B&W, 3.6¢ standard colour, 7¢ premium colour), similar to Amazon KDP's US paperback pricing; hardcovers cost more. Royalty = list price × royalty rate − print cost. Offset printing of 1,000+ copies is much cheaper per book but needs upfront money.",
    faq: [
      { question: "How much does it cost to print a book?", answer: "A 200–300 page black-and-white paperback typically costs $3.50–$5 to print on demand; colour interiors cost several times more." },
      { question: "How are KDP paperback royalties calculated?", answer: "60% of the list price (for Amazon sales) minus the printing cost." },
    ],
  },
  {
    slug: "large-format-printing-cost-calculator",
    title: "Large Format Printing Cost Calculator",
    description: "Estimate the cost of banners, posters, canvas prints and signs by size and material per square foot, with finishing like grommets and hems and a design fee.",
    metaTitle: "Large Format Printing Cost Calculator — Banners",
    metaDescription: "Free large format printing cost calculator. Price vinyl banners, posters, canvas and foam board by square foot, finishing and quantity.",
    calcInputs: [
      numberField("widthFt", "Width", { unit: "ft", default: 3, max: 100, step: 0.5 }),
      numberField("heightFt", "Height", { unit: "ft", default: 6, max: 100, step: 0.5 }),
      dropdown("material", "Material", [["13 oz vinyl banner — about $4/sq ft", 0], ["Poster paper — about $2.50/sq ft", 1], ["Mesh banner — about $5/sq ft", 2], ["Canvas — about $10/sq ft", 3], ["Foam board / Coroplast — about $8/sq ft", 4], ["Backlit film / premium — about $12/sq ft", 5]], 0),
      currencyField("customRate", "Custom Rate per Sq Ft (0 = Use Material)", { default: 0, max: 100, step: 0.25, required: false }),
      numberField("quantity", "Quantity", { default: 2, min: 1, max: 10000 }),
      currencyField("finishingEach", "Finishing per Piece (Grommets, Hems, Stands)", { default: 10, max: 1000, step: 1, required: false }),
      currencyField("designFee", "Design Fee", { default: 0, max: 10000, step: 5, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "costEach", label: "Cost Each", format: "currency" },
      { key: "squareFeetEach", label: "Square Feet Each", format: "number" },
      { key: "printingCost", label: "Printing", format: "currency" },
      { key: "ratePerSqFt", label: "Rate per Sq Ft", format: "currency" },
    ],
    instructions:
      "Enter the width and height in feet, the material and quantity. Use a custom rate per square foot if you have a quote, then add finishing per piece and any design fee.",
    examples: "Example: two 3 × 6 ft vinyl banners (18 sq ft each) at $4 per sq ft with $10 of grommets and hems each cost $164.00 — $82.00 a banner.",
    assumptions: "Typical print-shop rates: vinyl banners $3–$6 per sq ft, posters $2–$4, canvas $8–$15, rigid signs $6–$12. Rush service, installation and very small orders (minimum charges) cost more.",
    faq: [
      { question: "How much does a vinyl banner cost per square foot?", answer: "Usually $3 to $6 per square foot for a standard 13 oz banner, including hems and grommets at many shops." },
      { question: "What's the difference between vinyl and mesh banners?", answer: "Mesh has tiny holes that let wind through, so it's better for fences and windy outdoor spots; it costs a little more." },
    ],
  },
  {
    slug: "label-printing-cost-calculator",
    title: "Label Printing Cost Calculator",
    description: "Estimate the cost of custom product labels or stickers — setup fee spread over the run plus material by label size — and the price per label at different quantities.",
    metaTitle: "Label Printing Cost Calculator — Cost per Label",
    metaDescription: "Free label printing cost calculator. Estimate custom label and sticker costs from size, quantity, material per square inch and setup fees.",
    calcInputs: [
      numberField("quantity", "Number of Labels", { default: 1000, max: 10000000, step: 50 }),
      numberField("widthIn", "Label Width", { unit: "in", default: 3, max: 50, step: 0.25 }),
      numberField("heightIn", "Label Height", { unit: "in", default: 2, max: 50, step: 0.25 }),
      currencyField("costPerSqIn", "Material & Print Cost per Sq In", { default: 0.012, max: 1, step: 0.001 }),
      currencyField("setupFee", "Setup / Plate Fee", { default: 60, max: 10000, step: 5, required: false }),
      currencyField("finishingFee", "Lamination, Die-Cut or Foil Fee", { default: 25, max: 10000, step: 5, required: false }),
    ],
    calcResult: { label: "Cost per Label", format: "currency" },
    calcResults: [
      { key: "costPerLabel", label: "Cost per Label", format: "currency", decimals: 3, highlight: true },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "materialCost", label: "Material & Printing", format: "currency" },
      { key: "setupShare", label: "Setup as % of Total", format: "percentage" },
      { key: "labelArea", label: "Label Area (sq in)", format: "number" },
    ],
    instructions:
      "Enter the quantity and label size, the material and print cost per square inch from your printer or supplier, and any setup and finishing fees.\n\n" +
      "Try different quantities to see how the setup cost spreads out.",
    examples: "Example: 1,000 labels of 3 × 2 in at 1.2¢ per sq in with $60 setup and $25 finishing cost $157.00 — $0.157 a label.",
    assumptions: "Digital roll labels in small runs often cost $0.10–$0.40 each; large flexographic runs drop to a few cents. Waterproof materials, foil and special shapes cost more. Printing your own on sheet labels avoids setup fees but costs more per label in ink and time.",
    faq: [
      { question: "How much do custom labels cost?", answer: "From a few cents each for large runs to $0.20–$0.50 each for small digital runs, depending on size, material and finish." },
      { question: "Why are small label orders so expensive per label?", answer: "Setup costs are the same for 100 or 10,000 labels, so they make up most of the price on short runs." },
    ],
  },
  {
    slug: "screen-printing-cost-calculator",
    title: "Screen Printing Cost Calculator",
    description: "Estimate a screen printing order — screen fees per colour, print charges per colour per shirt, blank shirts and markup — per shirt and for the whole order.",
    metaTitle: "Screen Printing Cost Calculator — Price per Shirt",
    metaDescription: "Free screen printing cost calculator. Price custom shirts from quantity, colours front and back, screen fees, blanks and markup.",
    calcInputs: [
      numberField("quantity", "Number of Shirts", { default: 48, min: 1, max: 100000 }),
      numberField("frontColors", "Colours on the Front", { default: 2, max: 12 }),
      numberField("backColors", "Colours on the Back", { default: 1, max: 12, required: false }),
      currencyField("screenFee", "Screen / Setup Fee per Colour", { default: 25, max: 200, step: 1 }),
      currencyField("perColorPerShirt", "Print Charge per Colour per Shirt", { default: 0.9, max: 20, step: 0.05 }),
      currencyField("blankCost", "Blank Shirt Cost", { default: 4.5, max: 100, step: 0.05 }),
      percentField("markup", "Markup", { default: 40, max: 300, step: 1 }),
    ],
    calcResult: { label: "Price per Shirt", format: "currency" },
    calcResults: [
      { key: "pricePerShirt", label: "Price per Shirt", format: "currency", highlight: true },
      { key: "orderTotal", label: "Order Total", format: "currency" },
      { key: "costPerShirt", label: "Cost per Shirt", format: "currency" },
      { key: "screenFees", label: "Screen Fees", format: "currency" },
      { key: "profitOnOrder", label: "Profit on the Order", format: "currency" },
    ],
    instructions:
      "Enter the number of shirts and the number of ink colours on each print location. Add the screen fee per colour, the print charge per colour per shirt (it falls as quantity rises), the blank shirt cost and your markup.",
    examples: "Example: 48 shirts with a 2-colour front and 1-colour back. Three screens cost $75.00, and with $4.50 blanks and 40% markup each shirt is $12.27 — $588.84 for the order.",
    assumptions: "Each colour needs its own screen, so designs with many colours cost more on small runs; above about 6 colours or for photographic prints, DTG or transfers are often cheaper. Dark garments may need an underbase, adding a colour.",
    faq: [
      { question: "How much does screen printing cost per shirt?", answer: "Often $8–$15 per shirt for 24–50 shirts with a 1–2 colour design, dropping to $5–$8 for larger orders." },
      { question: "Why does each colour cost extra?", answer: "Every colour needs a separate screen and a separate pass on the press, which adds setup and print time." },
    ],
  },
  {
    slug: "dtg-pricing-calculator",
    title: "DTG Pricing Calculator",
    description: "Price direct-to-garment (DTG) printed shirts from the blank, ink and pretreatment by print size and garment colour, machine and labor time, and markup.",
    metaTitle: "DTG Pricing Calculator — Direct to Garment Price",
    metaDescription: "Free DTG pricing calculator. Price direct-to-garment shirts from blank, ink and pretreat cost, print size, dark or light shirts, time and markup.",
    calcInputs: [
      currencyField("blankCost", "Blank Shirt Cost", { default: 5, max: 100, step: 0.05 }),
      dropdown("printSize", "Print Size", [["Small (chest logo, up to 5 × 5 in)", 0], ["Standard (up to 12 × 14 in)", 1], ["Oversize (up to 16 × 20 in)", 2]], 1),
      dropdown("darkGarment", "Garment Colour", [["Light (no white underbase)", 0], ["Dark (white ink + pretreat)", 1]], 1),
      numberField("minutesPerShirt", "Minutes per Shirt (Pretreat, Print, Cure)", { unit: "minutes", default: 6, max: 60, step: 0.5 }),
      currencyField("laborRate", "Labor Rate per Hour", { default: 18, max: 200, step: 1 }),
      currencyField("machineRate", "Machine Cost per Hour", { default: 12, max: 200, step: 1, required: false }),
      percentField("markup", "Markup", { default: 60, max: 300, step: 1 }),
      numberField("quantity", "Quantity", { default: 12, min: 1, max: 10000, required: false }),
    ],
    calcResult: { label: "Price per Shirt", format: "currency" },
    calcResults: [
      { key: "pricePerShirt", label: "Price per Shirt", format: "currency", highlight: true },
      { key: "costPerShirt", label: "Cost per Shirt", format: "currency" },
      { key: "inkAndPretreat", label: "Ink & Pretreat", format: "currency" },
      { key: "laborAndMachine", label: "Labor & Machine Time", format: "currency" },
      { key: "orderTotal", label: "Order Total", format: "currency" },
    ],
    instructions:
      "Enter the blank cost, choose the print size and whether the shirt is dark (dark shirts need pretreatment and white ink). Add the minutes per shirt, labor and machine rates, markup and quantity.",
    examples: "Example: a $5 dark shirt with a standard-size print uses about $4.80 of ink and pretreat. With 6 minutes of time and 60% markup, charge $20.48 a shirt — $245.76 for 12.",
    assumptions: "Typical ink and pretreat: about $1.50 small, $3 standard, $5 oversize on light shirts, roughly 60% more on dark shirts. Machine cost per hour covers the printer's lease or depreciation and maintenance. DTG suits small runs and full-colour designs; screen printing wins on big runs.",
    faq: [
      { question: "How much does DTG printing cost?", answer: "Usually $3–$8 in ink, pretreat and time per shirt on top of the blank; retail DTG shirts often sell for $18–$30." },
      { question: "Is DTG cheaper than screen printing?", answer: "For small orders and many colours, yes. For large orders of simple designs, screen printing is cheaper per shirt." },
    ],
  },
  {
    slug: "htv-vinyl-shirt-pricing-calculator",
    title: "HTV / Vinyl Shirt Pricing Calculator",
    description: "Price heat transfer vinyl (HTV) shirts from the vinyl used by square inch and layers, the blank, weeding and pressing time, and your markup.",
    metaTitle: "HTV Vinyl Shirt Pricing Calculator — Price a Shirt",
    metaDescription: "Free HTV vinyl shirt pricing calculator. Price heat transfer vinyl shirts from vinyl size, layers, blank cost, weeding time and markup.",
    calcInputs: [
      currencyField("blankCost", "Blank Shirt Cost", { default: 4.5, max: 100, step: 0.05 }),
      numberField("designWidthIn", "Design Width", { unit: "in", default: 10, max: 30, step: 0.5 }),
      numberField("designHeightIn", "Design Height", { unit: "in", default: 8, max: 30, step: 0.5 }),
      numberField("layers", "Vinyl Layers / Colours", { default: 2, min: 1, max: 6 }),
      currencyField("rollPrice", "Vinyl Roll Price", { default: 12, max: 500, step: 0.25 }),
      numberField("rollWidthIn", "Roll Width", { unit: "in", default: 12, max: 60 }),
      numberField("rollLengthFt", "Roll Length", { unit: "ft", default: 5, max: 150 }),
      percentField("wastePercent", "Waste Around the Design", { default: 25, max: 100, step: 5 }),
      numberField("minutes", "Cutting, Weeding & Pressing Time", { unit: "minutes", default: 20, max: 240 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 200, step: 1 }),
      percentField("markup", "Markup", { default: 40, max: 300, step: 1 }),
    ],
    calcResult: { label: "Price per Shirt", format: "currency" },
    calcResults: [
      { key: "pricePerShirt", label: "Price per Shirt", format: "currency", highlight: true },
      { key: "costPerShirt", label: "Cost per Shirt", format: "currency" },
      { key: "vinylCost", label: "Vinyl Cost", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "profitPerShirt", label: "Profit per Shirt", format: "currency" },
    ],
    instructions:
      "Enter the blank cost and the design's width and height, the number of vinyl layers, and your vinyl roll's price, width and length. Add a waste allowance, the time to cut, weed and press, your hourly rate and markup.",
    examples: "Example: a 10 × 8 in two-layer design from a $12, 12 in × 5 ft roll uses $3.33 of vinyl. With a $4.50 blank and 20 minutes at $18 an hour, plus 40% markup, the shirt sells for $19.37.",
    assumptions: "Vinyl cost = design area × (1 + waste) ÷ roll area × roll price × layers. Intricate designs take much longer to weed — time is usually the biggest cost. Glitter and specialty vinyl cost more per roll.",
    faq: [
      { question: "How much should I charge for a vinyl shirt?", answer: "Many crafters charge $15–$25 for a one- or two-colour HTV shirt, covering the blank, vinyl, time and profit." },
      { question: "How much HTV does a shirt design use?", answer: "A typical adult front design of 10 × 10 in uses about 100 sq in per layer, plus waste around the edges." },
    ],
  },
  {
    slug: "t-shirt-pricing-calculator",
    title: "T-Shirt Pricing Calculator",
    description: "Set a retail price for custom T-shirts or merch that hits your target profit margin after the blank, printing, packaging, shipping and platform and payment fees.",
    metaTitle: "T-Shirt Pricing Calculator — Retail Price & Profit",
    metaDescription: "Free T-shirt pricing calculator. Price custom tees and merch to reach your target margin after blanks, printing, shipping and platform fees.",
    calcInputs: [
      currencyField("blankCost", "Blank Shirt Cost", { default: 5.5, max: 100, step: 0.05 }),
      currencyField("printCost", "Printing Cost per Shirt", { default: 4, max: 100, step: 0.05 }),
      currencyField("packaging", "Packaging & Tags", { default: 0.75, max: 20, step: 0.05, required: false }),
      currencyField("shippingCost", "Shipping Cost You Cover", { default: 4.5, max: 50, step: 0.05, required: false }),
      percentField("platformFee", "Platform Fee", { default: 6.5, max: 30, step: 0.1, required: false }),
      percentField("paymentRate", "Payment Processing Rate", { default: 3, max: 10, step: 0.1 }),
      currencyField("paymentFixed", "Payment Fixed Fee", { default: 0.25, max: 5, step: 0.01, required: false }),
      percentField("targetMargin", "Target Profit Margin", { default: 35, max: 80, step: 1 }),
    ],
    calcResult: { label: "Retail Price", format: "currency" },
    calcResults: [
      { key: "retailPrice", label: "Retail Price", format: "currency", highlight: true },
      { key: "roundedPrice", label: "Rounded Price ($)", format: "number" },
      { key: "profitPerShirt", label: "Profit per Shirt", format: "currency" },
      { key: "totalCost", label: "Total Cost per Shirt", format: "currency" },
      { key: "feesPerSale", label: "Fees per Sale", format: "currency" },
    ],
    instructions:
      "Enter the blank, printing, packaging and shipping costs per shirt, then your platform and payment fees and the profit margin you want. The price is set so the margin is left after fees.",
    examples: "Example: $14.75 of costs with 6.5% platform and 3% + $0.25 payment fees at a 35% margin needs a $27.03 price, which leaves $9.46 profit per shirt — round up to $27.99 on the listing.",
    assumptions: "Price = (costs + fixed fee) ÷ (1 − fee rate − margin). If you offer free shipping, include it as a cost. Print-on-demand services bundle blank, printing and shipping into one base cost.",
    faq: [
      { question: "How much should I sell custom T-shirts for?", answer: "Most indie brands and merch sellers price tees at $22–$35, enough for a 30–40% margin after costs and fees." },
      { question: "How do I price shirts for a target margin?", answer: "Divide your total cost by (1 − fee rate − margin). Adding a percentage to cost (markup) gives a lower margin than it seems." },
    ],
  },
  {
    slug: "t-shirt-order-size-breakdown-calculator",
    title: "T-Shirt Order Size Breakdown Calculator",
    description: "Split a bulk T-shirt order into sizes — S to 3XL — using a typical size curve for adults, women or youth, so you order the right mix.",
    metaTitle: "T-Shirt Size Breakdown Calculator — Bulk Orders",
    metaDescription: "Free T-shirt order size breakdown calculator. Split a bulk shirt order into S–3XL quantities with typical size curves for adults, women and youth.",
    calcInputs: [
      numberField("totalShirts", "Total Shirts to Order", { default: 100, max: 100000 }),
      dropdown("audience", "Audience", [["Adult unisex", 0], ["Women's fit", 1], ["Youth (XS–XL)", 2]], 0),
    ],
    calcResult: { label: "Large", format: "number" },
    calcResults: [
      { key: "large", label: "Large (Youth M)", format: "number", highlight: true },
      { key: "small", label: "Small (Youth XS)", format: "number" },
      { key: "medium", label: "Medium (Youth S)", format: "number" },
      { key: "xl", label: "XL (Youth L)", format: "number" },
      { key: "xxl", label: "2XL (Youth XL)", format: "number" },
      { key: "xxxl", label: "3XL", format: "number" },
      { key: "totalShirts", label: "Total", format: "number" },
    ],
    instructions:
      "Enter the total number of shirts and choose the audience. The calculator splits the order with a typical size curve and makes sure the sizes add up to your total.\n\n" +
      "If you can, collect sizes from the group instead — use this when you can't.",
    examples: "Example: 100 adult unisex shirts split as 8 S, 24 M, 30 L, 22 XL, 11 2XL and 5 3XL.",
    assumptions: "Adult unisex curve used: S 8%, M 24%, L 30%, XL 22%, 2XL 11%, 3XL 5% — close to what US printers see for mixed groups. Women's fits skew smaller; for youth orders the slots map to XS–XL. Adjust for your group (sports teams and older groups run larger).",
    faq: [
      { question: "What size breakdown should I order for T-shirts?", answer: "For a mixed adult group, roughly 8% S, 24% M, 30% L, 22% XL, 11% 2XL and 5% 3XL." },
      { question: "Should I order extra shirts?", answer: "Ordering a few extra in M and L covers late sign-ups and sizing swaps." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
