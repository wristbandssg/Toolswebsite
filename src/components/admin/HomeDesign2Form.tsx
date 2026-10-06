"use client";

import { useState } from "react";
import type { Design2Content, D2Chip } from "@/lib/homepage-config";
import RichTextEditor from "./RichTextEditor";
import {
  Card,
  CategorySelect,
  Field,
  RowControls,
  Toggle,
  inputClass,
  moveItem,
  smallButton,
  type CategoryGroup,
} from "./HomepageFormParts";

// Editor for every piece of home page Design 2 ("Category Showcase").

const CHIP_COLORS: D2Chip["color"][] = ["green", "blue", "gray", "amber", "purple"];

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))}
      />
      {hint ? <span className="mt-1 block text-xs text-gray-400">{hint}</span> : null}
    </label>
  );
}

/** Generic list editor: one bordered row per item with move/remove controls, plus an Add button. */
function ListEditor<T>({
  items,
  onChange,
  makeNew,
  addLabel,
  renderRow,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  makeNew: () => T;
  addLabel: string;
  renderRow: (item: T, set: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-400">#{i + 1}</span>
            <RowControls
              index={i}
              length={items.length}
              onMove={(from, to) => onChange(moveItem(items, from, to))}
              onRemove={(idx) => onChange(items.filter((_, j) => j !== idx))}
            />
          </div>
          {renderRow(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
        </div>
      ))}
      <button type="button" className={smallButton} onClick={() => onChange([...items, makeNew()])}>
        {addLabel}
      </button>
    </div>
  );
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const slugLines = (text: string) =>
  text
    .split(/[\n,]+/)
    .map((s) => s.trim().replace(/^.*\/tools\//, ""))
    .filter(Boolean);

export default function HomeDesign2Form({
  value: d,
  onChange,
  categoryGroups,
  autoCategorySlugs,
  tools,
  onError,
}: {
  value: Design2Content;
  onChange: (next: Design2Content) => void;
  categoryGroups: CategoryGroup[];
  autoCategorySlugs: string[];
  tools: { slug: string; title: string }[];
  onError: (message: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  function update<K extends keyof Design2Content>(key: K, val: Design2Content[K]) {
    onChange({ ...d, [key]: val });
  }

  async function uploadHeroImage(file: File) {
    setUploading(true);
    onError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Image upload failed.");
        return;
      }
      update("heroImageUrl", data.media.url as string);
    } catch {
      onError("Network error while uploading the image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <datalist id="d2-tool-slugs">
        {tools.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.title}
          </option>
        ))}
      </datalist>

      <p className="rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
        In any text you can write <strong>{"{siteName}"}</strong> (your site name) and <strong>{"{count}"}</strong> (number of
        published calculators). Icons are emoji — paste one like 💰 📈 🏠 ❤️. Leave a category or calculator list empty to fill
        it automatically.
      </p>

      <Card title="Top Section (Hero)">
        <Field label="Small Badge Above the Title" hint="Leave empty to hide." value={d.heroBadge} onChange={(v) => update("heroBadge", v)} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title — Line 1" value={d.heroTitleLine1} onChange={(v) => update("heroTitleLine1", v)} />
          <Field label="Title — Line 2 (blue)" value={d.heroTitleHighlight} onChange={(v) => update("heroTitleHighlight", v)} />
          <Field label="Title — Line 3" value={d.heroTitleLine3} onChange={(v) => update("heroTitleLine3", v)} />
        </div>
        <Field label="Text Under the Title" value={d.heroText} onChange={(v) => update("heroText", v)} textarea />
        <div>
          <p className="text-sm font-medium">Check Chips</p>
          <div className="mt-2">
            <ListEditor
              items={d.heroChips}
              onChange={(v) => update("heroChips", v)}
              makeNew={() => ({ text: "", color: "gray" as const })}
              addLabel="+ Add Chip"
              renderRow={(chip, set) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                  <input className={inputClass} placeholder="e.g. No Registration" value={chip.text} onChange={(e) => set({ text: e.target.value })} />
                  <select className={inputClass} value={chip.color} onChange={(e) => set({ color: e.target.value as D2Chip["color"] })}>
                    {CHIP_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c[0].toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Picture on the Right</p>
          <p className="mt-1 text-xs text-gray-400">Leave empty to show the built-in calculator illustration.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {d.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.heroImageUrl} alt="" className="h-16 w-24 rounded border border-gray-200 object-cover" />
            ) : null}
            <input
              className={`${inputClass} mt-0 max-w-md`}
              placeholder="Image URL (optional)"
              value={d.heroImageUrl}
              onChange={(e) => update("heroImageUrl", e.target.value)}
            />
            <label className={`${smallButton} cursor-pointer`}>
              {uploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadHeroImage(file);
                  e.target.value = "";
                }}
              />
            </label>
            {d.heroImageUrl ? (
              <button type="button" className={smallButton} onClick={() => update("heroImageUrl", "")}>
                Use built-in illustration
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card title="Feature Row" hint="The row of short benefits under the hero.">
        <Toggle label="Show the feature row" checked={d.showFeatures} onChange={(v) => update("showFeatures", v)} />
        <ListEditor
          items={d.features}
          onChange={(v) => update("features", v)}
          makeNew={() => ({ icon: "", title: "", text: "" })}
          addLabel="+ Add Feature"
          renderRow={(f, set) => (
            <div className="grid gap-2 sm:grid-cols-[5rem_1fr_2fr]">
              <input className={inputClass} placeholder="Icon" value={f.icon} onChange={(e) => set({ icon: e.target.value })} />
              <input className={inputClass} placeholder="Title" value={f.title} onChange={(e) => set({ title: e.target.value })} />
              <input className={inputClass} placeholder="Text" value={f.text} onChange={(e) => set({ text: e.target.value })} />
            </div>
          )}
        />
      </Card>

      <Card
        title="Category Cards"
        hint="Big cards linking to category pages. Leave the list empty to show the biggest categories automatically; empty icon, title or description fields are filled from the category."
      >
        <Toggle label="Show category cards" checked={d.showCategories} onChange={(v) => update("showCategories", v)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small Label Above the Heading" value={d.categoriesEyebrow} onChange={(v) => update("categoriesEyebrow", v)} />
          <Field label="Link Text on Each Card" value={d.categoriesLinkText} onChange={(v) => update("categoriesLinkText", v)} />
        </div>
        <Field label="Heading" value={d.categoriesHeading} onChange={(v) => update("categoriesHeading", v)} />
        <Field label="Text Under the Heading" value={d.categoriesText} onChange={(v) => update("categoriesText", v)} textarea rows={2} />
        <NumberField label="Cards When Automatic" min={1} max={30} value={d.autoCategoryCount} onChange={(v) => update("autoCategoryCount", v)} />
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
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Description (empty = the category's own text)"
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

      <Card
        title="Popular Calculators"
        hint="Small calculator tiles. Leave the list empty to show calculators marked Popular first. Type a calculator's URL slug — suggestions appear as you type."
      >
        <Toggle label="Show popular calculators" checked={d.showPopular} onChange={(v) => update("showPopular", v)} />
        <Field label="Small Label Above the Heading" value={d.popularEyebrow} onChange={(v) => update("popularEyebrow", v)} />
        <Field label="Heading" value={d.popularHeading} onChange={(v) => update("popularHeading", v)} />
        <Field label="Text Under the Heading" value={d.popularText} onChange={(v) => update("popularText", v)} textarea rows={2} />
        <NumberField label="Calculators When Automatic" min={1} max={40} value={d.autoPopularCount} onChange={(v) => update("autoPopularCount", v)} />
        <ListEditor
          items={d.popularTools}
          onChange={(v) => update("popularTools", v)}
          makeNew={() => ({ toolSlug: "", icon: "" })}
          addLabel="+ Add Calculator"
          renderRow={(t, set) => (
            <div className="grid gap-2 sm:grid-cols-[1fr_5rem]">
              <input
                className={inputClass}
                list="d2-tool-slugs"
                placeholder="Calculator slug, e.g. mortgage-calculator"
                value={t.toolSlug}
                onChange={(e) => set({ toolSlug: e.target.value.trim().replace(/^.*\/tools\//, "") })}
              />
              <input className={inputClass} placeholder="Icon" value={t.icon} onChange={(e) => set({ icon: e.target.value })} />
            </div>
          )}
        />
      </Card>

      <Card title="How-To Steps">
        <Toggle label="Show the steps" checked={d.showSteps} onChange={(v) => update("showSteps", v)} />
        <Field label="Small Label Above the Heading" value={d.stepsEyebrow} onChange={(v) => update("stepsEyebrow", v)} />
        <Field label="Heading" value={d.stepsHeading} onChange={(v) => update("stepsHeading", v)} />
        <ListEditor
          items={d.steps}
          onChange={(v) => update("steps", v)}
          makeNew={() => ({ icon: "", title: "", text: "" })}
          addLabel="+ Add Step"
          renderRow={(s, set) => (
            <>
              <div className="grid gap-2 sm:grid-cols-[5rem_1fr]">
                <input className={inputClass} placeholder="Icon" value={s.icon} onChange={(e) => set({ icon: e.target.value })} />
                <input className={inputClass} placeholder="Title" value={s.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <textarea className={inputClass} rows={2} placeholder="Text" value={s.text} onChange={(e) => set({ text: e.target.value })} />
            </>
          )}
        />
      </Card>

      <Card
        title="Two Text Columns"
        hint="Free-form content side by side. Use Heading 2 for the column title, Heading 3 for sub-titles, and bullet lists (shown with arrows)."
      >
        <Toggle label="Show the text columns" checked={d.showInfo} onChange={(v) => update("showInfo", v)} />
        <div>
          <p className="mb-2 text-sm font-medium">Left Column</p>
          <RichTextEditor value={d.infoLeftHtml} onChange={(html) => update("infoLeftHtml", html)} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Right Column</p>
          <RichTextEditor value={d.infoRightHtml} onChange={(html) => update("infoRightHtml", html)} />
        </div>
      </Card>

      <Card
        title="Category Guides"
        hint="Cards with a category's description and a list of its calculators. Leave the list empty to fill it automatically. Pinned calculators (slugs, one per line) show first."
      >
        <Toggle label="Show category guides" checked={d.showGuides} onChange={(v) => update("showGuides", v)} />
        <Field label="Small Label Above the Heading" value={d.guidesEyebrow} onChange={(v) => update("guidesEyebrow", v)} />
        <Field label="Heading" value={d.guidesHeading} onChange={(v) => update("guidesHeading", v)} />
        <Field label="Text Under the Heading" value={d.guidesText} onChange={(v) => update("guidesText", v)} textarea rows={2} />
        <Field
          label="Link Text Under Each Card"
          hint="{name} = the category name."
          value={d.guidesLinkText}
          onChange={(v) => update("guidesLinkText", v)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Cards When Automatic" min={1} max={30} value={d.autoGuideCount} onChange={(v) => update("autoGuideCount", v)} />
          <NumberField label="Calculators per Card" min={1} max={15} value={d.guideToolsPerCard} onChange={(v) => update("guideToolsPerCard", v)} />
        </div>
        <ListEditor
          items={d.guideCards}
          onChange={(v) => update("guideCards", v)}
          makeNew={() => ({ categorySlug: "", icon: "", title: "", text: "", toolSlugs: [] as string[] })}
          addLabel="+ Add Guide Card"
          renderRow={(g, set) => (
            <>
              <div className="grid gap-2 sm:grid-cols-[1fr_5rem_1fr]">
                <CategorySelect groups={categoryGroups} value={g.categorySlug} onChange={(v) => set({ categorySlug: v })} />
                <input className={inputClass} placeholder="Icon" value={g.icon} onChange={(e) => set({ icon: e.target.value })} />
                <input className={inputClass} placeholder="Title (empty = category name)" value={g.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="Text (empty = the category's own text)"
                value={g.text}
                onChange={(e) => set({ text: e.target.value })}
              />
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Pinned calculators — slugs, one per line (optional)"
                value={g.toolSlugs.join("\n")}
                onChange={(e) => set({ toolSlugs: slugLines(e.target.value) })}
              />
            </>
          )}
        />
        <AutoButtons
          empty={d.guideCards.length === 0}
          onStart={() =>
            update(
              "guideCards",
              autoCategorySlugs.slice(0, d.autoGuideCount).map((slug) => ({ categorySlug: slug, icon: "", title: "", text: "", toolSlugs: [] }))
            )
          }
          onReset={() => update("guideCards", [])}
        />
      </Card>

      <Card title="Use Cases & Search Keywords">
        <Toggle label="Show use cases" checked={d.showUseCases} onChange={(v) => update("showUseCases", v)} />
        <Field label="Small Label Above the Heading" value={d.useCasesEyebrow} onChange={(v) => update("useCasesEyebrow", v)} />
        <Field label="Heading" value={d.useCasesHeading} onChange={(v) => update("useCasesHeading", v)} />
        <Field label="Text Under the Heading" value={d.useCasesText} onChange={(v) => update("useCasesText", v)} textarea rows={2} />
        <ListEditor
          items={d.useCases}
          onChange={(v) => update("useCases", v)}
          makeNew={() => ({ icon: "", title: "", text: "", bullets: [] as string[] })}
          addLabel="+ Add Use Case"
          renderRow={(u, set) => (
            <>
              <div className="grid gap-2 sm:grid-cols-[5rem_1fr]">
                <input className={inputClass} placeholder="Icon" value={u.icon} onChange={(e) => set({ icon: e.target.value })} />
                <input className={inputClass} placeholder="Title" value={u.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <textarea className={inputClass} rows={3} placeholder="Text" value={u.text} onChange={(e) => set({ text: e.target.value })} />
              <textarea
                className={inputClass}
                rows={4}
                placeholder="Bullet points — one per line"
                value={u.bullets.join("\n")}
                onChange={(e) => set({ bullets: e.target.value.split("\n") })}
                onBlur={(e) => set({ bullets: lines(e.target.value) })}
              />
            </>
          )}
        />
        <Field label="Keyword Box — Bold Label" value={d.keywordsLabel} onChange={(v) => update("keywordsLabel", v)} />
        <Field
          label="Keyword Box — Text"
          hint="Leave empty to hide the keyword box."
          value={d.keywordsText}
          onChange={(v) => update("keywordsText", v)}
          textarea
          rows={3}
        />
      </Card>

      <Card title="FAQ" hint="Shown full width as a numbered accordion (click a question to open its answer), and added to the page as FAQ structured data for Google.">
        <Toggle label="Show the FAQ" checked={d.showFaq} onChange={(v) => update("showFaq", v)} />
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

      <Card title="Blogs" hint="The latest published blog posts, newest first. Every card has the same size: title up to 2 lines, text up to 2 lines. The button appears over the picture when the mouse is on a card.">
        <Toggle label="Show blogs" checked={d.showBlogs} onChange={(v) => update("showBlogs", v)} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Heading" value={d.blogsHeading} onChange={(v) => update("blogsHeading", v)} />
          <NumberField label="Number of Posts" min={1} max={24} value={d.blogCount} onChange={(v) => update("blogCount", v)} />
          <Field label="Button Text (on hover)" hint="Leave empty for no button." value={d.blogButtonText} onChange={(v) => update("blogButtonText", v)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Layout</span>
            <select className={inputClass} value={d.blogLayout} onChange={(e) => update("blogLayout", e.target.value as Design2Content["blogLayout"])}>
              <option value="slider">Slider (arrows, dots, swipe)</option>
              <option value="grid">Grid (all cards at once)</option>
            </select>
          </label>
          <NumberField
            label="Words in Each Card's Text"
            hint="The text under the title stops after this many words (0 = title only). Uses the post's excerpt, or its content when there is none."
            min={0}
            max={80}
            value={d.blogExcerptWords}
            onChange={(v) => update("blogExcerptWords", v)}
          />
          <div className="pt-6">
            <Toggle label="Slide automatically (every 5 seconds)" checked={d.blogAutoplay} onChange={(v) => update("blogAutoplay", v)} />
          </div>
        </div>
      </Card>

      <Card title="SEO (Design 2)">
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

function AutoButtons({ empty, onStart, onReset }: { empty: boolean; onStart: () => void; onReset: () => void }) {
  return empty ? (
    <button type="button" className={smallButton} onClick={onStart}>
      Start from the automatic list
    </button>
  ) : (
    <button type="button" className={smallButton} onClick={onReset}>
      Back to automatic
    </button>
  );
}
