"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InlineRenameProps = {
  value: string;
  placeholder?: string;
  saveLabel?: string;
  cancelLabel?: string;
  onSubmit: (next: string) => void | Promise<void>;
  onCancel: () => void;
};

export function InlineRename({
  value,
  placeholder,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
}: InlineRenameProps) {
  const [draft, setDraft] = useState(value);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void onSubmit(draft);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-8"
      />
      <Button type="submit" size="sm">
        {saveLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </form>
  );
}
