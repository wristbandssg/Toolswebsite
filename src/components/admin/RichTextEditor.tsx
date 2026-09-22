"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

const TEXT_COLORS = [
  "#111827",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#6b7280",
];

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#fed7aa",
  "#fecaca",
  "#bbf7d0",
  "#bfdbfe",
  "#e9d5ff",
  "#fbcfe8",
  "#e5e7eb",
];

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🙂", "😉",
  "😊", "😍", "🤔", "😐", "😴", "😢", "😭", "😡",
  "👍", "👎", "👏", "🙏", "💡", "✅", "❌", "⭐",
  "🔥", "🎉", "📌", "📝", "💰", "📊", "🚀", "⚠️",
];

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm font-medium disabled:opacity-40 ${
        active
          ? "bg-indigo-600 text-white"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

/** Popover wrapper — click the trigger to open a small panel, closes when clicking outside or after a selection. */
function Popover({
  label,
  trigger,
  children,
}: {
  label: string;
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="rounded px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        {trigger}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function FormatSelect({ editor }: { editor: Editor }) {
  const value = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : editor.isActive("heading", { level: 4 })
        ? "h4"
        : "p";

  function apply(v: string) {
    if (v === "p") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = Number(v.slice(1)) as 2 | 3 | 4;
      editor.chain().focus().setHeading({ level }).run();
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => apply(e.target.value)}
      aria-label="Paragraph style"
      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <option value="p">Paragraph</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
      <option value="h4">Heading 4</option>
    </select>
  );
}

function Toolbar({
  editor,
  onUploadImage,
  onTogglePreview,
  previewOpen,
}: {
  editor: Editor;
  onUploadImage: () => void;
  onTogglePreview: () => void;
  previewOpen: boolean;
}) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 p-2 dark:border-gray-700">
      <FormatSelect editor={editor} />
      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton
        label="Align Left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        ⯇
      </ToolbarButton>
      <ToolbarButton
        label="Align Center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        ☰
      </ToolbarButton>
      <ToolbarButton
        label="Align Right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        ⯈
      </ToolbarButton>
      <ToolbarButton
        label="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        ≡
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <Popover label="Text Color" trigger={<span className="font-bold text-red-600">A</span>}>
        {(close) => (
          <div className="grid grid-cols-5 gap-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setColor(c).run();
                  close();
                }}
                className="h-6 w-6 rounded border border-gray-200 dark:border-gray-600"
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              title="Reset color"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                close();
              }}
              className="col-span-5 mt-1 rounded border border-gray-200 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        )}
      </Popover>

      <Popover
        label="Highlight"
        trigger={<span className="rounded bg-yellow-200 px-1 text-gray-800">H</span>}
      >
        {(close) => (
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color: c }).run();
                  close();
                }}
                className="h-6 w-6 rounded border border-gray-200 dark:border-gray-600"
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              title="Remove highlight"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                close();
              }}
              className="col-span-4 mt-1 rounded border border-gray-200 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Remove
            </button>
          </div>
        )}
      </Popover>

      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton
        label="Bullet List"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered List"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        &quot;
      </ToolbarButton>
      <ToolbarButton
        label="Code Block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {"</>"}
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal Rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        ―
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        Link
      </ToolbarButton>
      <ToolbarButton label="Insert Image" onClick={onUploadImage}>
        Image
      </ToolbarButton>
      <ToolbarButton
        label="Insert Table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        Table
      </ToolbarButton>

      <Popover label="Insert Emoji" trigger={<span>🙂</span>}>
        {(close) => (
          <div className="grid max-w-[220px] grid-cols-8 gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  editor.chain().focus().insertContent(e).run();
                  close();
                }}
                className="rounded p-1 text-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </Popover>

      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↺
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↻
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <ToolbarButton label="Preview" active={previewOpen} onClick={onTogglePreview}>
        {previewOpen ? "Editing" : "Preview"}
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit v3 bundles its own Link/Underline — disabled here so the
      // separately-configured instances below (with our own options) are
      // the only ones registered, avoiding duplicate-extension warnings.
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ HTMLAttributes: { class: "rounded-lg" } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose max-w-none dark:prose-invert min-h-[240px] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync if `value` is replaced from outside (e.g. when
  // loading an existing post into the edit form after the editor mounted).
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  async function handleImageUpload() {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          window.alert(data.error ?? "Upload failed.");
          return;
        }
        editor.chain().focus().setImage({ src: data.media.url, alt: file.name }).run();
      } catch {
        window.alert("Network error while uploading the image.");
      }
    };
    input.click();
  }

  if (!editor) {
    return (
      <div className="min-h-[280px] rounded-lg border border-gray-300 dark:border-gray-700" />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800">
      <Toolbar
        editor={editor}
        onUploadImage={handleImageUpload}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
        previewOpen={previewOpen}
      />
      {previewOpen ? (
        <div
          className="prose max-w-none px-3 py-2 dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-300 [&_th]:px-2 [&_th]:py-1 dark:[&_td]:border-gray-600 dark:[&_th]:border-gray-600"
          dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
        />
      ) : (
        <div className="[&_.ProseMirror_table]:w-full [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-1 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:bg-gray-50 [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-1 dark:[&_.ProseMirror_td]:border-gray-600 dark:[&_.ProseMirror_th]:border-gray-600 dark:[&_.ProseMirror_th]:bg-gray-900">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
