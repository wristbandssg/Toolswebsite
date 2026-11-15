# Books, Publishing & Reading keyword check (15 Nov 2026)

Checked against the live database (6,928 tools). No category structure was supplied ("ata tomi check kore dio"), so the live DB taxonomy was used.

## A. Summary

| | Count |
|---|---|
| Keywords submitted | 30 |
| Already built (dropped) | 3 keywords → 3 existing tools |
| Merged into a new tool (secondary keyword) | 15 |
| Needs review | 0 (1 vague keyword merged, marked অনিশ্চিত) |
| **Unique new tools** | **12** |

New tools by sub-category: Arts & Entertainment > Art, Film & Creator Income 5 · Arts & Entertainment > Books, Reading & Writing (নতুন) 7

Limitation: matched by intent against tool slugs/titles in the live DB. Every planned slug was checked against the DB and the prisma/create-*.ts scripts, and none of them exist.

## B. Category decisions (new tools)

| Keyword | Main Category | Subcategory | কারণ (১ লাইনে) | নিশ্চয়তা |
|---|---|---|---|---|
| kdp print cost calculator | Arts & Entertainment | Art, Film & Creator Income | Author works out KDP paperback/hardcover print cost and royalty per sale, which is creator income. Shopping > Pricing (next to book-printing-cost) was the alternative. | মোটামুটি |
| kindle book calculator | Arts & Entertainment | Art, Film & Creator Income | Kindle eBook royalty (35% / 70% plus delivery fee) per sale. | নিশ্চিত |
| amazon book sales calculator | Arts & Entertainment | Art, Film & Creator Income | Estimates daily/monthly sales and income from Amazon Best Seller Rank. | নিশ্চিত |
| book publishing cost calculator | Arts & Entertainment | Art, Film & Creator Income | Total self-publishing budget (editing, cover, ISBN, formatting, marketing), so not the same as print cost. Shopping was the alternative. | মোটামুটি |
| book pricing calculator | Arts & Entertainment | Art, Film & Creator Income | Retail list price from print cost, target royalty and channel discount. | মোটামুটি |
| how long to read calculator | Arts & Entertainment | Books, Reading & Writing (নতুন) | Reading time from pages/words and WPM; leisure reading, not classroom. | নিশ্চিত |
| how many pages do i have to read a day calculator | Arts & Entertainment | Books, Reading & Writing (নতুন) | Pages/day needed to finish by a deadline. | নিশ্চিত |
| book percentage calculator | Arts & Entertainment | Books, Reading & Writing (নতুন) | % of book read from current page or Kindle location. | নিশ্চিত |
| audio book calculator | Arts & Entertainment | Books, Reading & Writing (নতুন) | Audiobook listening time left at 1x–3x playback speed. | নিশ্চিত |
| book page calculator | Arts & Entertainment | Books, Reading & Writing (নতুন) | Word count to printed book pages by trim size and font. | নিশ্চিত |
| beat sheet calculator | Arts & Entertainment | Books, Reading & Writing (নতুন) | Story-beat page/word positions (Save the Cat 15-beat structure) for a target length. | নিশ্চিত |
| poem meter calculator | Arts & Entertainment | Books, Reading & Writing (নতুন) | Syllable count per line and metre name (iambic pentameter etc.). | নিশ্চিত |

## C. Dropped or merged keywords

| Keyword | সিদ্ধান্ত ও কারণ | রাখা মূল Tool |
|---|---|---|
| book printing cost calculator | Already built | book-printing-cost-calculator (existing) |
| ingram cover calculator | Already built (cover and spine width) | book-cover-spine-calculator (existing) |
| ingram spark price calculator | Already built | ingramspark-price-calculator (existing) |
| kdp hardcover calculator | Merge: same KDP print-cost formula with a hardcover option | KDP Print Cost & Royalty Calculator |
| paperback calculator | Merge: KDP paperback cost and royalty | KDP Print Cost & Royalty Calculator |
| kdp book price calculator | Merge: list price needed to reach a KDP royalty | KDP Print Cost & Royalty Calculator |
| amazon self-publishing cost calculator | Merge: Amazon (KDP) cost per copy and royalty | KDP Print Cost & Royalty Calculator |
| kindle sales calculator | Merge: BSR to sales | Amazon Book Sales Calculator |
| kindle rank calculator | Merge: BSR to sales | Amazon Book Sales Calculator |
| book price calculator | Merge: wording variation | Book Pricing Calculator |
| book reading time calculator | Merge: wording variation | Reading Time Calculator |
| book time calculator | Merge: wording variation | Reading Time Calculator |
| reading pace calculator | Merge: WPM and pages/hour are the same inputs | Reading Time Calculator |
| book calculator | Merge: vague; reading time is the most likely intent | Reading Time Calculator (অনিশ্চিত) |
| audiobook progress calculator | Merge: time listened and time left use the same inputs | Audiobook Calculator |
| book length calculator | Merge: words to pages | Book Page Count Calculator |
| word pages to book pages calculator | Merge: Word-document pages to book pages | Book Page Count Calculator |
| save the cat calculator | Merge: Save the Cat is the beat sheet structure | Beat Sheet Calculator |

## D. Clean final list

**Arts & Entertainment Calculators**
- Art, Film & Creator Income Calculators
  - KDP Print Cost & Royalty Calculator (Paperback & Hardcover)
  - Kindle eBook Royalty Calculator
  - Amazon Book Sales Calculator (BSR to Sales)
  - Book Publishing Cost Calculator
  - Book Pricing Calculator
- Books, Reading & Writing Calculators (নতুন)
  - Reading Time Calculator
  - Pages Per Day Calculator
  - Book Percentage Calculator
  - Audiobook Calculator (Listening Time & Speed)
  - Book Page Count Calculator (Words to Pages)
  - Beat Sheet Calculator (Save the Cat)
  - Poem Meter Calculator

## E. Review notes

- "book calculator" is vague. It is merged into Reading Time. Should it go somewhere else?
- Should the 5 author-income tools go to Shopping > Pricing, Markup & Seller Fee (next to book-printing-cost) instead? Default: A&E > Creator Income.
- Existing ingramspark-price and book-cover-spine sit in Business & Industrial > Manufacturing. They could be moved to the new Books sub. Not moved without a yes.
