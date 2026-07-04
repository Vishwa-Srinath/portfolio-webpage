import type { Metadata } from "next";
import { getAllContentByType, sortByDate } from "@/lib/content";
import { getLaneByKey } from "@/lib/lanes";
import { ArticleCard } from "@/components/content/ArticleCard";

export const metadata: Metadata = {
  title: "Notes — Life, Music & Informal Thoughts",
  description:
    "Informal notes — dev environment setups, music, things that made me think.",
};

export default async function NotesPage() {
  const items = await getAllContentByType("notes");
  const sorted = sortByDate(items, "desc");
  const lane = getLaneByKey("notes")!;

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{lane.icon}</span>
          <h1
            className="text-4xl font-bold md:text-5xl"
            style={{ color: lane.accentVar }}
          >
            Notes
          </h1>
        </div>
        <p className="mt-2 max-w-xl text-lg text-[var(--fg-muted)]">
          Informal notes on dev environments, music, tools, and things that made me think.
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
          Notes coming soon.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <ArticleCard
              key={item.slug}
              item={item}
              basePath="/notes"
              accentColor={lane.accentVar}
            />
          ))}
        </div>
      )}
    </main>
  );
}
