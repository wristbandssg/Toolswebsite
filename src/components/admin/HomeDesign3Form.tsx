"use client";

import type { Design3Content } from "@/lib/homepage-config";
import {
  AutoButtons,
  Card,
  CategorySelect,
  Field,
  ListEditor,
  NumberField,
  Toggle,
  inputClass,
  type CategoryGroup,
} from "./HomepageFormParts";

// Editor for every piece of home page Design 3 ("Clean Library").

type LinkValue = { text: string; url: string };

const lines = (text: string) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const toolSlug = (v: string) => v.trim().replace(/^.*\/tools\//, "");

/** Text + URL pair, e.g. a section's "View all →" link or a button. */
function LinkField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: LinkValue;
  onChange: (v: LinkValue) => void;
}) {
  return (
    <div className="text-sm">
      <span className="font-medium">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputClass} placeholder="Text (empty = hidden)" value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} />
        <input className={inputClass} placeholder="Link, e.g. /calculators" value={value.url} onChange={(e) => onChange({ ...value, url: e.target.value })} />
      </div>
      {hint ? <span className="mt-1 block text-xs text-gray-400">{hint}</span> : null}
    </div>
  );
}

/** Heading + text + optional link — the top of most sections. */
function SectionTop({
  d,
  update,
  heading,
  text,
  linkKey,
}: {
  d: Design3Content;
  update: <K extends keyof Design3Content>(key: K, val: Design3Content[K]) => void;
  heading: keyof Design3Content;
  text: keyof Design3Content;
  linkKey?: keyof Design3Content;
}) {
  return (
    <>
      <Field label="Heading" value={d[heading] as string} onChange={(v) => update(heading, v as never)} />
      <Field label="Text Under the Heading" value={d[text] as string} onChange={(v) => update(text, v as never)} textarea rows={2} />
      {linkKey ? (
        <LinkField label="Link on the Right" value={d[linkKey] as LinkValue} onChange={(v) => update(linkKey, v as never)} />
      ) : null}
    </>
  );
}

/** Editor for a list of calculator cards (Popular / Trending). */
function ToolCardsEditor({
  items,
  onChange,
}: {
  items: Design3Content["popularTools"];
  onChange: (v: Design3Content["popularTools"]) => void;
}) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      makeNew={() => ({ toolSlug: "", icon: "", badge: "", description: "" })}
      addLabel="+ Add Calculator"
      renderRow={(t, set) => (
        <>
          <div className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem]">
            <input
              className={inputClass}
              list="d3-tool-slugs"
              placeholder="Calculator slug, e.g. mortgage-calculator"
              value={t.toolSlug}
              onChange={(e) => set({ toolSlug: toolSlug(e.target.value) })}
            />
            <input className={inputClass} placeholder="Icon" value={t.icon} onChange={(e) => set({ icon: e.target.value })} />
            <input className={inputClass} placeholder="Badge (optional)" value={t.badge} onChange={(e) => set({ badge: e.target.value })} />
          </div>
          <input
            className={inputClass}
            placeholder="Short text (empty = the calculator's own description)"
            value={t.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </>
      )}
    />
  );
}

export default function HomeDesign3Form({
  value: d,
  onChange,
  categoryGroups,
  autoCategorySlugs,
  tools,
}: {
  value: Design3Content;
  onChange: (next: Design3Content) => void;
  categoryGroups: CategoryGroup[];
  autoCategorySlugs: string[];
  tools: { slug: string; title: string }[];
}) {
  function update<K extends keyof Design3Content>(key: K, val: Design3Content[K]) {
    onChange({ ...d, [key]: val });
  }

  return (
    <div className="space-y-6">
      <datalist id="d3-tool-slugs">
        {tools.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.title}
          </option>
        ))}
      </datalist>

      <p className="rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
        In any text you can write <strong>{"{siteName}"}</strong> (your site name), <strong>{"{count}"}</strong> (number of
        published calculators) and <strong>{"{categoryCount}"}</strong> (number of categories). Icons are emoji — paste one
        like 💰 📈 🏠. Leave a list empty to fill it automatically. The site header and footer come from the Header Builder and
        Footer Builder.
      </p>

      <Card title="Top Section (Hero)">
        <Field label="Small Badge Above the Title" hint="Leave empty to hide." value={d.heroBadge} onChange={(v) => update("heroBadge", v)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title — Line 1" value={d.heroTitleLine1} onChange={(v) => update("heroTitleLine1", v)} />
          <Field label="Title — Line 2 (blue-purple gradient)" value={d.heroTitleLine2} onChange={(v) => update("heroTitleLine2", v)} />
        </div>
        <Field label="Text Under the Title" value={d.heroText} onChange={(v) => update("heroText", v)} textarea />
        <Toggle label="Show the search box" checked={d.showSearch} onChange={(v) => update("showSearch", v)} />
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field label="Search Placeholder" value={d.searchPlaceholder} onChange={(v) => update("searchPlaceholder", v)} />
          <Field label="Search Button Text" hint="Empty = no button." value={d.searchButtonText} onChange={(v) => update("searchButtonText", v)} />
        </div>
        <div>
          <p className="text-sm font-medium">Quick Links Under the Search</p>
          <p className="mt-1 text-xs text-gray-400">Leave empty to show popular calculators automatically.</p>
          <div className="mt-2 space-y-3">
            <NumberField label="Links When Automatic" hint="0 = none." min={0} max={12} value={d.autoChipCount} onChange={(v) => update("autoChipCount", v)} />
            <ListEditor
              items={d.heroChips}
              onChange={(v) => update("heroChips", v)}
              makeNew={() => ({ text: "", url: "" })}
              addLabel="+ Add Quick Link"
              renderRow={(chip, set) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={inputClass} placeholder="Text, e.g. Mortgage" value={chip.text} onChange={(e) => set({ text: e.target.value })} />
                  <input className={inputClass} placeholder="Link, e.g. /tools/mortgage-calculator" value={chip.url} onChange={(e) => set({ url: e.target.value })} />
                </div>
              )}
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Numbers Row</p>
          <div className="mt-2">
            <ListEditor
              items={d.heroStats}
              onChange={(v) => update("heroStats", v)}
              makeNew={() => ({ value: "", label: "" })}
              addLabel="+ Add Number"
              renderRow={(s, set) => (
                <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                  <input className={inputClass} placeholder="e.g. {count}+" value={s.value} onChange={(e) => set({ value: e.target.value })} />
                  <input className={inputClass} placeholder="e.g. Free calculators" value={s.label} onChange={(e) => set({ label: e.target.value })} />
                </div>
              )}
            />
          </div>
        </div>
      </Card>

      <Card
        title="Popular Calculators"
        hint="Calculator cards. Leave the list empty to show calculators marked Popular first. Type a calculator's URL slug — suggestions appear as you type."
      >
        <Toggle label="Show popular calculators" checked={d.showPopular} onChange={(v) => update("showPopular", v)} />
        <SectionTop d={d} update={update} heading="popularHeading" text="popularText" linkKey="popularLink" />
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Cards When Automatic" min={1} max={40} value={d.autoPopularCount} onChange={(v) => update("autoPopularCount", v)} />
          <Field
            label="Badge (Automatic List)"
            hint="Shown on calculators marked Popular."
            value={d.popularAutoBadge}
            onChange={(v) => update("popularAutoBadge", v)}
          />
          <Field label="Link Text on Each Card" value={d.popularCardLinkText} onChange={(v) => update("popularCardLinkText", v)} />
        </div>
        <ToolCardsEditor items={d.popularTools} onChange={(v) => update("popularTools", v)} />
      </Card>

      <Card
        title="Category Cards"
        hint="The dark section with category cards. Leave the list empty to show the biggest categories automatically; empty fields are filled from the category."
      >
        <Toggle label="Show category cards" checked={d.showCategories} onChange={(v) => update("showCategories", v)} />
        <SectionTop d={d} update={update} heading="categoriesHeading" text="categoriesText" linkKey="categoriesLink" />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Cards When Automatic" min={1} max={30} value={d.autoCategoryCount} onChange={(v) => update("autoCategoryCount", v)} />
          <Field
            label="Count Line on Each Card"
            hint="{n} = calculators in that category."
            value={d.categoryCountText}
            onChange={(v) => update("categoryCountText", v)}
          />
        </div>
        {d.categoryCards.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800">
            Automatic: the {Math.min(d.autoCategoryCount, autoCategorySlugs.length)} biggest categories are shown.
          </p>
        ) : null}
        <ListEditor
          items={d.categoryCards}
          onChange={(v) => update("categoryCards", v)}
          makeNew={() => ({ categorySlug: "", icon: "", title: "", description: "" })}
          addLabel="+ Add Card"
          renderRow={(card, set) => (
            <>
              <div className="grid gap-2 sm:grid-cols-[1fr_5rem_1fr]">
                <CategorySelect groups={categoryGroups} value={card.categorySlug} onChange={(v) => set({ categorySlug: v })} />
                <input className={inputClass} placeholder="Icon" value={card.icon} onChange={(e) => set({ icon: e.target.value })} />
                <input className={inputClass} placeholder="Title (empty = category name)" value={card.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <input
                className={inputClass}
                placeholder="Short text (empty = the category's own text)"
                value={card.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </>
          )}
        />
        <AutoButtons
          empty={d.categoryCards.length === 0}
          onStart={() =>
            update(
              "categoryCards",
              autoCategorySlugs.slice(0, d.autoCategoryCount).map((slug) => ({ categorySlug: slug, icon: "", title: "", description: "" }))
            )
          }
          onReset={() => update("categoryCards", [])}
        />
      </Card>

      <Card title="Featured Hub" hint="A big blue card plus up to a few side links.">
        <Toggle label="Show the featured hub" checked={d.showHub} onChange={(v) => update("showHub", v)} />
        <SectionTop d={d} update={update} heading="hubHeading" text="hubText" />
        <Field label="Blue Card — Small Label" value={d.hubEyebrow} onChange={(v) => update("hubEyebrow", v)} />
        <Field label="Blue Card — Title" value={d.hubTitle} onChange={(v) => update("hubTitle", v)} />
        <Field label="Blue Card — Text" value={d.hubBody} onChange={(v) => update("hubBody", v)} textarea rows={2} />
        <LinkField
          label="Blue Card — Button"
          hint="Leave the link empty to go to your biggest category."
          value={d.hubButton}
          onChange={(v) => update("hubButton", v)}
        />
        <div>
          <p className="text-sm font-medium">Side Links</p>
          <p className="mt-1 text-xs text-gray-400">Leave empty to show the next 3 biggest categories automatically.</p>
          <div className="mt-2">
            <ListEditor
              items={d.hubItems}
              onChange={(v) => update("hubItems", v)}
              makeNew={() => ({ title: "", text: "", url: "" })}
              addLabel="+ Add Side Link"
              renderRow={(h, set) => (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={inputClass} placeholder="Title, e.g. Tax Calculators" value={h.title} onChange={(e) => set({ title: e.target.value })} />
                    <input className={inputClass} placeholder="Link, e.g. /tools/category/tax-calculators" value={h.url} onChange={(e) => set({ url: e.target.value })} />
                  </div>
                  <input className={inputClass} placeholder="Short text" value={h.text} onChange={(e) => set({ text: e.target.value })} />
                </>
              )}
            />
          </div>
        </div>
      </Card>

      <Card title="What Can You Calculate?" hint="White boxes side by side, each with a title, text and bullet points.">
        <Toggle label="Show these boxes" checked={d.showColumns} onChange={(v) => update("showColumns", v)} />
        <SectionTop d={d} update={update} heading="columnsHeading" text="columnsText" />
        <ListEditor
          items={d.columns}
          onChange={(v) => update("columns", v)}
          makeNew={() => ({ title: "", text: "", bullets: [] as string[] })}
          addLabel="+ Add Box"
          renderRow={(col, set) => (
            <>
              <input className={inputClass} placeholder="Title" value={col.title} onChange={(e) => set({ title: e.target.value })} />
              <textarea className={inputClass} rows={2} placeholder="Text" value={col.text} onChange={(e) => set({ text: e.target.value })} />
              <textarea
                className={inputClass}
                rows={5}
                placeholder="Bullet points — one per line"
                value={col.bullets.join("\n")}
                onChange={(e) => set({ bullets: e.target.value.split("\n") })}
                onBlur={(e) => set({ bullets: lines(e.target.value) })}
              />
            </>
          )}
        />
      </Card>

      <Card title="How-To Steps" hint='Each step is numbered automatically ("STEP 01", "STEP 02"…).'>
        <Toggle label="Show the steps" checked={d.showSteps} onChange={(v) => update("showSteps", v)} />
        <SectionTop d={d} update={update} heading="stepsHeading" text="stepsText" />
        <Field label="Step Label" hint='Shown before the number, e.g. "STEP".' value={d.stepLabel} onChange={(v) => update("stepLabel", v)} />
        <ListEditor
          items={d.steps}
          onChange={(v) => update("steps", v)}
          makeNew={() => ({ title: "", text: "" })}
          addLabel="+ Add Step"
          renderRow={(s, set) => (
            <>
              <input className={inputClass} placeholder="Title" value={s.title} onChange={(e) => set({ title: e.target.value })} />
              <textarea className={inputClass} rows={2} placeholder="Text" value={s.text} onChange={(e) => set({ text: e.target.value })} />
            </>
          )}
        />
      </Card>

      <Card title="Trending Calculators" hint="The dark section of calculator cards. Leave the list empty to show the most recently updated calculators.">
        <Toggle label="Show trending calculators" checked={d.showTrending} onChange={(v) => update("showTrending", v)} />
        <SectionTop d={d} update={update} heading="trendingHeading" text="trendingText" linkKey="trendingLink" />
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Cards When Automatic" min={1} max={40} value={d.autoTrendingCount} onChange={(v) => update("autoTrendingCount", v)} />
          <Field label="Badge (Automatic List)" hint="Empty = no badge." value={d.trendingBadge} onChange={(v) => update("trendingBadge", v)} />
          <Field label="Link Text on Each Card" value={d.trendingCardLinkText} onChange={(v) => update("trendingCardLinkText", v)} />
        </div>
        <ToolCardsEditor items={d.trendingTools} onChange={(v) => update("trendingTools", v)} />
      </Card>

      <Card title="Guides (Blog Posts)" hint="Your latest published blog posts, newest first. The post's featured image is used as the picture.">
        <Toggle label="Show guides" checked={d.showGuides} onChange={(v) => update("showGuides", v)} />
        <SectionTop d={d} update={update} heading="guidesHeading" text="guidesText" linkKey="guidesLink" />
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Number of Posts" min={1} max={24} value={d.guideCount} onChange={(v) => update("guideCount", v)} />
          <NumberField
            label="Words in Each Card's Text"
            hint="0 = title only."
            min={0}
            max={80}
            value={d.guideExcerptWords}
            onChange={(v) => update("guideExcerptWords", v)}
          />
          <Field label="Link Text on Each Card" value={d.guideLinkText} onChange={(v) => update("guideLinkText", v)} />
        </div>
      </Card>

      <Card
        title="Calculators by Country"
        hint="Leave the list empty to show every category named after a country automatically (e.g. UK Tax & Salary Calculators). Pick a category for each row, or type a link instead."
      >
        <Toggle label="Show countries" checked={d.showCountries} onChange={(v) => update("showCountries", v)} />
        <SectionTop d={d} update={update} heading="countriesHeading" text="countriesText" linkKey="countriesLink" />
        <ListEditor
          items={d.countries}
          onChange={(v) => update("countries", v)}
          makeNew={() => ({ flag: "", label: "", categorySlug: "", url: "" })}
          addLabel="+ Add Country"
          renderRow={(item, set) => (
            <div className="grid gap-2 sm:grid-cols-[4.5rem_1fr_1fr_1fr]">
              <input className={inputClass} placeholder="🇲🇾" value={item.flag} onChange={(e) => set({ flag: e.target.value })} />
              <input className={inputClass} placeholder="Name, e.g. Malaysia" value={item.label} onChange={(e) => set({ label: e.target.value })} />
              <CategorySelect groups={categoryGroups} value={item.categorySlug} onChange={(v) => set({ categorySlug: v })} />
              <input
                className={inputClass}
                placeholder="…or a link"
                disabled={!!item.categorySlug}
                value={item.url}
                onChange={(e) => set({ url: e.target.value })}
              />
            </div>
          )}
        />
      </Card>

      <Card title="Trust Row" hint='The small "Built for Clarity" cards.'>
        <Toggle label="Show the trust row" checked={d.showTrust} onChange={(v) => update("showTrust", v)} />
        <SectionTop d={d} update={update} heading="trustHeading" text="trustText" />
        <ListEditor
          items={d.trustItems}
          onChange={(v) => update("trustItems", v)}
          makeNew={() => ({ icon: "", title: "", text: "" })}
          addLabel="+ Add Item"
          renderRow={(t, set) => (
            <div className="grid gap-2 sm:grid-cols-[5rem_1fr_2fr]">
              <input className={inputClass} placeholder="Icon" value={t.icon} onChange={(e) => set({ icon: e.target.value })} />
              <input className={inputClass} placeholder="Title" value={t.title} onChange={(e) => set({ title: e.target.value })} />
              <input className={inputClass} placeholder="Text" value={t.text} onChange={(e) => set({ text: e.target.value })} />
            </div>
          )}
        />
      </Card>

      <Card title="FAQ" hint="The first question starts open. Also added to the page as FAQ structured data for Google.">
        <Toggle label="Show the FAQ" checked={d.showFaq} onChange={(v) => update("showFaq", v)} />
        <SectionTop d={d} update={update} heading="faqHeading" text="faqText" />
        <ListEditor
          items={d.faqs}
          onChange={(v) => update("faqs", v)}
          makeNew={() => ({ question: "", answer: "" })}
          addLabel="+ Add Question"
          renderRow={(f, set) => (
            <>
              <input className={inputClass} placeholder="Question" value={f.question} onChange={(e) => set({ question: e.target.value })} />
              <textarea className={inputClass} rows={3} placeholder="Answer" value={f.answer} onChange={(e) => set({ answer: e.target.value })} />
            </>
          )}
        />
      </Card>

      <Card title="Call to Action" hint="The dark banner at the bottom of the page.">
        <Toggle label="Show the call to action" checked={d.showCta} onChange={(v) => update("showCta", v)} />
        <Field label="Heading" value={d.ctaHeading} onChange={(v) => update("ctaHeading", v)} />
        <Field label="Text" value={d.ctaText} onChange={(v) => update("ctaText", v)} textarea rows={2} />
        <LinkField label="Button" value={d.ctaButton} onChange={(v) => update("ctaButton", v)} />
      </Card>

      <Card title="SEO (Design 3)">
        <Field
          label="Meta Title"
          hint={'Leave empty for "<site name> — Free Online Calculators".'}
          value={d.metaTitle}
          onChange={(v) => update("metaTitle", v)}
        />
        <Field
          label="Meta Description"
          hint="Leave empty to use the site description from Website Settings."
          value={d.metaDescription}
          onChange={(v) => update("metaDescription", v)}
          textarea
          rows={2}
        />
      </Card>
    </div>
  );
}
