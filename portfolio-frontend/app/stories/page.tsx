import type { Metadata } from "next";
import { getAllContentByType, sortByDate } from "@/lib/content";
import { getLaneByKey } from "@/lib/lanes";
import { ArticleCard } from "@/components/content/ArticleCard";

export const metadata: Metadata = {
  title: "Behind the Bit — Computing History Stories",
  description:
    "The human stories behind the machines we take for granted — bugs, breakthroughs, and decisions that shaped computing.",
};

export default async function StoriesPage() {
  const items = await getAllContentByType("stories");
  const sorted = sortByDate(items, "desc");
  const lane = getLaneByKey("stories")!;

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{lane.icon}</span>
          <h1
            className="text-4xl font-bold md:text-5xl"
            style={{ color: lane.accentVar }}
          >
            Behind the Bit
          </h1>
        </div>
        <p className="mt-2 max-w-xl text-lg text-[var(--fg-muted)]">
          The human stories behind the machines and systems we take for granted.
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
          Episodes coming soon. Follow on Facebook: Behind the Bit.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <ArticleCard
              key={item.slug}
              item={item}
              basePath="/stories"
              accentColor={lane.accentVar}
            />
          ))}
        </div>
      )}
    </main>
  );
}
