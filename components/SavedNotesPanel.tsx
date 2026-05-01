"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  trackLabel,
  type InterviewTrack,
} from "@/lib/interviewSessions";
import type { InterviewNote } from "@/lib/interviewNotes";

type SortKey = "newest" | "oldest" | "title-asc" | "title-desc";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "title-asc": "Title A → Z",
  "title-desc": "Title Z → A",
};

export function SavedNotesPanel({ notes }: { notes: InterviewNote[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [trackFilter, setTrackFilter] = useState<"all" | InterviewTrack>(
    "all",
  );
  const [tagQuery, setTagQuery] = useState("");

  // Distinct tracks present in saved notes — drives the track filter dropdown.
  const tracks = useMemo<InterviewTrack[]>(() => {
    const set = new Set<InterviewTrack>();
    for (const n of notes) set.add(n.track);
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    let out = notes;
    if (trackFilter !== "all") {
      out = out.filter((n) => n.track === trackFilter);
    }
    if (q) {
      out = out.filter((n) =>
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.title.toLowerCase().includes(q),
      );
    }
    out = [...out].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
      }
    });
    return out;
  }, [notes, sortBy, trackFilter, tagQuery]);

  const hasActiveFilter =
    trackFilter !== "all" || tagQuery.trim().length > 0;

  function clearFilters() {
    setTrackFilter("all");
    setTagQuery("");
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder="Filter by tag or title…"
            className="h-8 pl-7 text-sm sm:w-56"
          />
        </div>
        <select
          value={trackFilter}
          onChange={(e) =>
            setTrackFilter(e.target.value as typeof trackFilter)
          }
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          aria-label="Filter by track"
        >
          <option value="all">All tracks</option>
          {tracks.map((t) => (
            <option key={t} value={t}>
              {trackLabel(t)}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          aria-label="Sort by"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 gap-1 text-xs"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {notes.length}
        </span>
      </div>

      {/* Grid (scrollable frame) */}
      <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border bg-card/40 p-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No notes match these filters.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((note) => (
              <Link
                key={note.id}
                href={`/notes/saved/${note.id}`}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-foreground/40">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">
                      {note.title}
                    </CardTitle>
                    <CardDescription>
                      {trackLabel(note.track)}
                      {note.context?.roleTitle
                        ? ` · ${note.context.roleTitle}`
                        : ""}
                      {note.context?.companyName
                        ? ` @ ${note.context.companyName}`
                        : ""}
                      {" · "}
                      {new Date(note.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  {note.tags.length > 0 && (
                    <CardContent className="flex flex-wrap gap-2">
                      {note.tags.slice(0, 6).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 6 && (
                        <span className="text-xs text-muted-foreground">
                          +{note.tags.length - 6}
                        </span>
                      )}
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
