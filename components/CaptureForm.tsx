"use client";

import { useEffect, useReducer, useState } from "react";
import {
  loadCaptures,
  saveCapture,
  deleteCapture,
  newCapture,
  toMdx,
  slugify,
  type Capture,
  type CaptureType,
} from "@/lib/captures";

type FormState = Omit<Capture, "id" | "createdAt">;

const EMPTY: FormState = { type: "note", title: "", tags: "", content: "" };

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CaptureForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [saved, setSaved] = useState(false);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    setCaptures(loadCaptures());
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const capture: Capture = { ...newCapture(), ...form };
    saveCapture(capture);
    setCaptures(loadCaptures());
    setForm(EMPTY);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDownload(capture: Capture) {
    const slug = slugify(capture.title) || capture.id;
    const ext = capture.type === "note" ? "mdx" : "mdx";
    download(`${slug}.${ext}`, toMdx(capture));
  }

  function handleDelete(id: string) {
    deleteCapture(id);
    setCaptures(loadCaptures());
    forceUpdate();
  }

  const isValid = form.title.trim().length > 0;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Promise.all vs Promise.allSettled"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="tags" className="text-sm font-medium">
              Tags{" "}
              <span className="font-normal text-muted-foreground">
                (comma-separated)
              </span>
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              value={form.tags}
              onChange={handleChange}
              placeholder="javascript, promises, async"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            value={form.type}
            onChange={handleChange}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="note">Note</option>
            <option value="exercise-idea">Exercise idea</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="content" className="text-sm font-medium">
            Content{" "}
            <span className="font-normal text-muted-foreground">(Markdown)</span>
          </label>
          <textarea
            id="content"
            name="content"
            value={form.content}
            onChange={handleChange}
            rows={8}
            placeholder="Write your note here…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!isValid}
            onClick={handleSave}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Save draft
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Saved!
            </span>
          )}
        </div>
      </div>

      {captures.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Saved drafts</h2>
          <ul className="space-y-3">
            {captures.map((cap) => (
              <li
                key={cap.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {cap.type}
                    </span>
                    <span className="font-medium truncate">{cap.title}</span>
                  </div>
                  {cap.tags && (
                    <p className="text-xs text-muted-foreground">{cap.tags}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(cap.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(cap)}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Download MDX
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cap.id)}
                    className="rounded border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
