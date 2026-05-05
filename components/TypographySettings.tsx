"use client";

import { useEffect, useRef, useState } from "react";
import { Type } from "lucide-react";

const SIZE_KEY = "typo.size";
const FAMILY_KEY = "typo.family";

type SizeOption = { id: string; label: string; value: string };
type FamilyOption = { id: string; label: string; value: string; sample?: string };

const SIZES: SizeOption[] = [
  { id: "compact", label: "Compact", value: "14px" },
  { id: "comfortable", label: "Comfortable", value: "16px" },
  { id: "large", label: "Large", value: "18px" },
  { id: "xl", label: "Extra Large", value: "20px" },
];

const FAMILIES: FamilyOption[] = [
  {
    id: "system",
    label: "System Sans",
    value:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: "geist",
    label: "Geist",
    value: "var(--font-geist-sans), system-ui, sans-serif",
  },
  {
    id: "serif",
    label: "Serif",
    value: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: "hyperlegible",
    label: "Hyperlegible",
    value: "var(--font-atkinson), system-ui, sans-serif",
  },
];

const DEFAULT_SIZE = SIZES[1];
const DEFAULT_FAMILY = FAMILIES[0];

function applySize(value: string) {
  document.documentElement.style.setProperty("--app-font-size", value);
}
function applyFamily(value: string) {
  document.documentElement.style.setProperty("--app-font-family", value);
}

export function TypographySettings() {
  const [open, setOpen] = useState(false);
  const [sizeId, setSizeId] = useState(DEFAULT_SIZE.id);
  const [familyId, setFamilyId] = useState(DEFAULT_FAMILY.id);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedSize = localStorage.getItem(SIZE_KEY);
      const savedFamily = localStorage.getItem(FAMILY_KEY);
      const matchedSize = SIZES.find((s) => s.value === savedSize);
      const matchedFamily = FAMILIES.find((f) => f.value === savedFamily);
      if (matchedSize) setSizeId(matchedSize.id);
      if (matchedFamily) setFamilyId(matchedFamily.id);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickSize(opt: SizeOption) {
    setSizeId(opt.id);
    applySize(opt.value);
    try {
      localStorage.setItem(SIZE_KEY, opt.value);
    } catch {
      // ignore
    }
  }

  function pickFamily(opt: FamilyOption) {
    setFamilyId(opt.id);
    applyFamily(opt.value);
    try {
      localStorage.setItem(FAMILY_KEY, opt.value);
    } catch {
      // ignore
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Typography settings"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Type size={16} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Typography settings"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Size
            </p>
            <div className="grid grid-cols-2 gap-1">
              {SIZES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => pickSize(opt)}
                  className={`rounded px-2 py-1 text-left text-xs transition-colors ${
                    sizeId === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Font
            </p>
            <div className="space-y-1">
              {FAMILIES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => pickFamily(opt)}
                  style={{ fontFamily: opt.value }}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors ${
                    familyId === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs opacity-70">Aa</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
