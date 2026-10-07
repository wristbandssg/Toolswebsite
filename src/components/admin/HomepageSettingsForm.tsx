"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HOME_DESIGNS, type Design1Content, type HomepageSettings } from "@/lib/homepage-config";
import { HOME_ICONS } from "@/lib/home-icons";

import {
  Card,
  cardId,
  CategorySelect,
  Field,
  RowControls,
  Toggle,
  inputClass,
  moveItem,
  smallButton,
  type CategoryGroup,
} from "./HomepageFormParts";
import HomeDesign2Form from "./HomeDesign2Form";
import HomeDesign3Form from "./HomeDesign3Form";

// Card titles per design, for the side menu's jump links (must match the Card titles).
const DESIGN1_SECTIONS = ["Top Section (Hero)", "Category Icon Tiles", "About Section", "Calculator Sections", "Featured In (Logos)", "SEO"];
const DESIGN2_SECTIONS = [
  "Top Section (Hero)",
  "Feature Row",
  "Category Cards",
  "Popular Calculators",
  "How-To Steps",
  "Two Text Columns",
  "Category Guides",
  "Use Cases & Search Keywords",
  "FAQ",
  "Blogs",
  "SEO (Design 2)",
];
const DESIGN3_SECTIONS = [
  "Top Section (Hero)",
  "Popular Calculators",
  "Category Cards",
  "Featured Hub",
  "What Can You Calculate?",
  "How-To Steps",
  "Trending Calculators",
  "Guides (Blog Posts)",
  "Calculators by Country",
  "Trust Row",
  "FAQ",
  "Call to Action",
  "SEO (Design 3)",
];

export default function HomepageSettingsForm({
  initial,
  categoryGroups,
  autoTileSlugs,
  autoSectionSlugs,
  autoCategorySlugs2,
  tools,
}: {
  initial: HomepageSettings;
  categoryGroups: CategoryGroup[];
  autoTileSlugs: string[];
  autoSectionSlugs: string[];
  autoCategorySlugs2: string[];
  tools: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<HomepageSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const d = settings.design1;
  // Which design's content the form is editing (starts on the live one).
  const [editing, setEditing] = useState<1 | 2 | 3>(initial.activeDesign === 2 || initial.activeDesign === 3 ? initial.activeDesign : 1);

  function update<K extends keyof Design1Content>(key: K, value: Design1Content[K]) {
    setSaved(false);
    setSettings((s) => ({ ...s, design1: { ...s.design1, [key]: value } }));
  }

  async function uploadLogo(index: number, file: File) {
    setUploadingIndex(index);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Logo upload failed.");
        return;
      }
      update(
        "featuredLogos",
        d.featuredLogos.map((l, i) => (i === index ? { ...l, imageUrl: data.media.url as string } : l))
      );
    } catch {
      setError("Network error while uploading the logo.");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const cleaned: HomepageSettings = {
        ...settings,
        design1: {
          ...d,
          iconItems: d.iconItems.filter((i) => i.categorySlug),
          sections: d.sections.filter((s) => s.categorySlug),
        },
        design2: {
          ...settings.design2,
          categoryCards: settings.design2.categoryCards.filter((c) => c.categorySlug),
          popularTools: settings.design2.popularTools.filter((t) => t.toolSlug),
          guideCards: settings.design2.guideCards.filter((g) => g.categorySlug),
          heroChips: settings.design2.heroChips.filter((c) => c.text.trim()),
          faqs: settings.design2.faqs.filter((f) => f.question.trim()),
          useCases: settings.design2.useCases.map((u) => ({ ...u, bullets: u.bullets.map((b) => b.trim()).filter(Boolean) })),
        },
        design3: {
          ...settings.design3,
          heroChips: settings.design3.heroChips.filter((c) => c.text.trim()),
          popularTools: settings.design3.popularTools.filter((t) => t.toolSlug),
          trendingTools: settings.design3.trendingTools.filter((t) => t.toolSlug),
          categoryCards: settings.design3.categoryCards.filter((c) => c.categorySlug),
          hubItems: settings.design3.hubItems.filter((h) => h.title.trim()),
          countries: settings.design3.countries.filter((c) => c.categorySlug || c.url.trim()),
          faqs: settings.design3.faqs.filter((f) => f.question.trim()),
          columns: settings.design3.columns.map((col) => ({ ...col, bullets: col.bullets.map((b) => b.trim()).filter(Boolean) })),
        },
      };
      const res = await fetch("/api/homepage-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the home page settings.");
        return;
      }
      setSettings(data.settings);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      <Card title="Active Design" hint="Only one design is live at a time. Designs that aren't built yet can't be selected.">
        <div className="grid gap-3 sm:grid-cols-3">
          {HOME_DESIGNS.map((design) => {
            const active = settings.activeDesign === design.id;
            return (
              <label
                key={design.id}
                className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm ${
                  active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-gray-200 dark:border-gray-700"
                } ${design.ready ? "" : "cursor-not-allowed opacity-50"}`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <input
                    type="radio"
                    name="activeDesign"
                    disabled={!design.ready}
                    checked={active}
                    onChange={() => {
                      setSaved(false);
                      setSettings((s) => ({ ...s, activeDesign: design.id }));
                    }}
                  />
                  {design.name}
                </span>
                <span className="mt-1 text-xs text-gray-500">{design.ready ? "Ready" : "Not built yet"}</span>
              </label>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <h2 className="text-lg font-bold">Edit Content For</h2>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEditing(n)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                editing === n ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              Design {n}
              {settings.activeDesign === n ? " (live)" : ""}
            </button>
          ))}
        </div>
      </div>

      {editing === 3 ? (
        <HomeDesign3Form
          value={settings.design3}
          onChange={(next) => {
            setSaved(false);
            setSettings((s) => ({ ...s, design3: next }));
          }}
          categoryGroups={categoryGroups}
          autoCategorySlugs={autoCategorySlugs2}
          tools={tools}
        />
      ) : editing === 2 ? (
        <HomeDesign2Form
          value={settings.design2}
          onChange={(next) => {
            setSaved(false);
            setSettings((s) => ({ ...s, design2: next }));
          }}
          categoryGroups={categoryGroups}
          autoCategorySlugs={autoCategorySlugs2}
          tools={tools}
          onError={setError}
        />
      ) : (
      <>

      <Card title="Top Section (Hero)">
        <Field label="Title" hint="Leave empty to use the site name." value={d.title} onChange={(v) => update("title", v)} />
        <Field label="Subtitle" hint="Short line under the title. Leave empty to hide it." value={d.subtitle} onChange={(v) => update("subtitle", v)} />
        <Toggle label="Show the scientific calculator" checked={d.showCalculator} onChange={(v) => update("showCalculator", v)} />
        <Field
          label="Calculator Input Placeholder"
          value={d.calculatorPlaceholder}
          onChange={(v) => update("calculatorPlaceholder", v)}
        />
        <Toggle label="Show the search box" checked={d.showSearch} onChange={(v) => update("showSearch", v)} />
        <Field label="Search Placeholder" value={d.searchPlaceholder} onChange={(v) => update("searchPlaceholder", v)} />
        <Field
          label="Line Under the Search"
          hint="Use {count} for the number of published calculators. Leave empty to hide."
          value={d.exploreText}
          onChange={(v) => update("exploreText", v)}
        />
      </Card>

      <Card
        title="Category Icon Tiles"
        hint="Leave the list empty to show the categories automatically (biggest first). Add rows to choose exactly which categories show, in which order, with your own label and icon."
      >
        <Toggle label="Show category icon tiles" checked={d.showIconGrid} onChange={(v) => update("showIconGrid", v)} />
        {d.iconItems.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800">
            Automatic: {autoTileSlugs.length} categories are shown right now.
          </p>
        ) : null}
        {d.iconItems.map((item, i) => {
          const Preview = HOME_ICONS[item.icon]?.icon;
          return (
            <div key={i} className="grid gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] dark:border-gray-700">
              <CategorySelect
                groups={categoryGroups}
                value={item.categorySlug}
                onChange={(v) => update("iconItems", d.iconItems.map((x, j) => (j === i ? { ...x, categorySlug: v } : x)))}
              />
              <input
                className={inputClass}
                placeholder="Label (empty = category name)"
                value={item.label}
                onChange={(e) => update("iconItems", d.iconItems.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <div className="flex items-center gap-2">
                <select
                  className={inputClass}
                  value={item.icon}
                  onChange={(e) => update("iconItems", d.iconItems.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}
                >
                  <option value="">Automatic icon</option>
                  {Object.entries(HOME_ICONS).map(([key, v]) => (
                    <option key={key} value={key}>
                      {v.label}
                    </option>
                  ))}
                </select>
                {Preview ? <Preview aria-hidden className="mt-1 h-6 w-6 shrink-0 text-gray-600" /> : null}
              </div>
              <div className="flex items-center">
                <RowControls
                  index={i}
                  length={d.iconItems.length}
                  onMove={(from, to) => update("iconItems", moveItem(d.iconItems, from, to))}
                  onRemove={(idx) => update("iconItems", d.iconItems.filter((_, j) => j !== idx))}
                />
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={smallButton}
            onClick={() => update("iconItems", [...d.iconItems, { categorySlug: "", label: "", icon: "" }])}
          >
            + Add Tile
          </button>
          {d.iconItems.length === 0 ? (
            <button
              type="button"
              className={smallButton}
              onClick={() => update("iconItems", autoTileSlugs.map((slug) => ({ categorySlug: slug, label: "", icon: "" })))}
            >
              Start from the automatic list
            </button>
          ) : (
            <button type="button" className={smallButton} onClick={() => update("iconItems", [])}>
              Back to automatic
            </button>
          )}
        </div>
      </Card>

      <Card title="About Section">
        <Toggle label="Show the About section" checked={d.showAbout} onChange={(v) => update("showAbout", v)} />
        <Field
          label="Heading"
          hint={'Leave empty for "About <site name>".'}
          value={d.aboutHeading}
          onChange={(v) => update("aboutHeading", v)}
        />
        <Field
          label="Text"
          hint="Separate paragraphs with a blank line. Leave empty to use the default text."
          value={d.aboutText}
          onChange={(v) => update("aboutText", v)}
          textarea
          rows={7}
        />
      </Card>

      <Card
        title="Calculator Sections"
        hint="One block of calculator links per category. Leave the list empty to show the biggest categories automatically. In a row you can pin calculators (their URL slugs, one per line) — pinned ones show first, the rest fill in automatically (Popular first)."
      >
        <Toggle label="Show calculator sections" checked={d.showSections} onChange={(v) => update("showSections", v)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Links per Section</span>
            <input
              type="number"
              min={3}
              max={31}
              className={inputClass}
              value={d.linksPerSection}
              onChange={(e) => update("linksPerSection", Math.min(31, Math.max(3, Number(e.target.value) || 11)))}
            />
            <span className="mt-1 block text-xs text-gray-400">A &quot;See More&quot; link is added after them.</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Sections When Automatic</span>
            <input
              type="number"
              min={1}
              max={30}
              className={inputClass}
              value={d.autoSectionCount}
              onChange={(e) => update("autoSectionCount", Math.min(30, Math.max(1, Number(e.target.value) || 8)))}
            />
          </label>
        </div>
        {d.sections.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800">
            Automatic: the {Math.min(d.autoSectionCount, autoSectionSlugs.length)} biggest categories are shown.
          </p>
        ) : null}
        {d.sections.map((section, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <CategorySelect
                groups={categoryGroups}
                value={section.categorySlug}
                onChange={(v) => update("sections", d.sections.map((x, j) => (j === i ? { ...x, categorySlug: v } : x)))}
              />
              <input
                className={inputClass}
                placeholder="Heading (empty = category name)"
                value={section.heading}
                onChange={(e) => update("sections", d.sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))}
              />
              <div className="flex items-center">
                <RowControls
                  index={i}
                  length={d.sections.length}
                  onMove={(from, to) => update("sections", moveItem(d.sections, from, to))}
                  onRemove={(idx) => update("sections", d.sections.filter((_, j) => j !== idx))}
                />
              </div>
            </div>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Pinned calculators — URL slugs, one per line (optional), e.g. mortgage-calculator"
              value={section.toolSlugs.join("\n")}
              onChange={(e) =>
                update(
                  "sections",
                  d.sections.map((x, j) =>
                    j === i
                      ? {
                          ...x,
                          toolSlugs: e.target.value
                            .split(/[\n,]+/)
                            .map((s) => s.trim().replace(/^.*\/tools\//, ""))
                            .filter(Boolean),
                        }
                      : x
                  )
                )
              }
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={smallButton}
            onClick={() => update("sections", [...d.sections, { categorySlug: "", heading: "", toolSlugs: [] }])}
          >
            + Add Section
          </button>
          {d.sections.length === 0 ? (
            <button
              type="button"
              className={smallButton}
              onClick={() =>
                update(
                  "sections",
                  autoSectionSlugs.slice(0, d.autoSectionCount).map((slug) => ({ categorySlug: slug, heading: "", toolSlugs: [] }))
                )
              }
            >
              Start from the automatic list
            </button>
          ) : (
            <button type="button" className={smallButton} onClick={() => update("sections", [])}>
              Back to automatic
            </button>
          )}
        </div>
      </Card>

      <Card title="Featured In (Logos)" hint="Logos of sites that featured you. Upload an image or enter a name; the link is optional.">
        <Toggle label="Show the Featured In section" checked={d.showFeatured} onChange={(v) => update("showFeatured", v)} />
        <Field label="Heading" value={d.featuredHeading} onChange={(v) => update("featuredHeading", v)} />
        {d.featuredLogos.map((logo, i) => (
          <div key={i} className="grid items-center gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto_auto] dark:border-gray-700">
            <input
              className={inputClass}
              placeholder="Name (used as alt text)"
              value={logo.name}
              onChange={(e) => update("featuredLogos", d.featuredLogos.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <input
              className={inputClass}
              placeholder="Link (optional)"
              value={logo.url}
              onChange={(e) => update("featuredLogos", d.featuredLogos.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
            />
            <div className="flex items-center gap-2">
              {logo.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.imageUrl} alt="" className="h-8 w-16 rounded border border-gray-200 object-contain" />
              ) : null}
              <label className={`${smallButton} cursor-pointer`}>
                {uploadingIndex === i ? "Uploading..." : logo.imageUrl ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadLogo(i, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <RowControls
              index={i}
              length={d.featuredLogos.length}
              onMove={(from, to) => update("featuredLogos", moveItem(d.featuredLogos, from, to))}
              onRemove={(idx) => update("featuredLogos", d.featuredLogos.filter((_, j) => j !== idx))}
            />
          </div>
        ))}
        <button
          type="button"
          className={smallButton}
          onClick={() => update("featuredLogos", [...d.featuredLogos, { name: "", imageUrl: "", url: "" }])}
        >
          + Add Logo
        </button>
      </Card>

      <Card title="SEO">
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

      </>
      )}

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-white/90 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Home Page"}
        </button>
        {saved ? <span className="text-sm text-green-600">Saved — the live home page is updated.</span> : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </form>

      {/* Side menu: what's live, a link to the site, and jump links to each section. */}
      <aside className="h-fit space-y-4 xl:sticky xl:top-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Live Now</p>
          <p className="mt-1 font-semibold">{HOME_DESIGNS.find((x) => x.id === settings.activeDesign)?.name}</p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            View Home Page ↗
          </a>
        </div>
        <nav className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Design {editing} Sections</p>
          <ul className="mt-3 space-y-0.5 text-sm">
            {(editing === 3 ? DESIGN3_SECTIONS : editing === 2 ? DESIGN2_SECTIONS : DESIGN1_SECTIONS).map((title) => (
              <li key={title}>
                <a
                  href={`#${cardId(title)}`}
                  className="block rounded-lg px-2.5 py-1.5 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-300 dark:hover:bg-indigo-950/50"
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-400 dark:border-gray-800">
            Changes go live when you press <strong>Save Home Page</strong>.
          </p>
        </nav>
      </aside>
    </div>
  );
}
