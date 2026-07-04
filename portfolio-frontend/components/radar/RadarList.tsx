"use client";

import { useState, useMemo } from "react";
import type { RadarEntry } from "@/lib/radar";
import { RadarCard } from "./RadarCard";

const STATUS_FILTERS = ["all", "adopted", "trying", "watching", "dropped"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type CategoryFilter = "all" | "framework" | "infra" | "language" | "hardware" | "paper" | "tool" | "model" | string;

export function RadarList({ entries }: { entries: RadarEntry[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const availableCategories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category));
    return ["all", ...Array.from(cats).sort()] as string[];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const statusOk = statusFilter === "all" || e.status === statusFilter;
      const catOk = categoryFilter === "all" || e.category === categoryFilter;
      return statusOk && catOk;
    });
  }, [entries, statusFilter, categoryFilter]);

  return (
    <div className="mt-10">
      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              statusFilter === status
                ? "bg-[var(--accent-cyan)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="mt-3 flex flex-wrap gap-2">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat as CategoryFilter)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              categoryFilter === cat
                ? "border-[var(--fg-muted)] text-[var(--fg)]"
                : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg-muted)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-8 space-y-4">
        {filtered.map((entry) => (
          <RadarCard key={entry.id} entry={entry} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-[var(--fg-muted)]">
            No entries match this filter.
          </p>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="mt-6 text-right text-sm text-[var(--fg-muted)]">
          Showing {filtered.length} of {entries.length} entries
        </p>
      )}
    </div>
  );
}
