import type { Metadata } from "next";
import { getAllContentByType, sortByDate } from "@/lib/content";
import { getLaneByKey } from "@/lib/lanes";
import { ArticleCard } from "@/components/content/ArticleCard";

export const metadata: Metadata = {
  title: "Learn — DSA & Algorithms",
  description:
    "Deep dives into data structures, algorithms, and competitive programming. Companion to the YouTube series.",
};

export default async function LearnPage() {
  const items = await getAllContentByType("learn");
  const sorted = sortByDate(items, "desc");
  const lane = getLaneByKey("learn")!;

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{lane.icon}</span>
          <h1
            className="text-4xl font-bold md:text-5xl"
            style={{ color: lane.accentVar }}
          >
            Learn
          </h1>
        </div>
        <p className="mt-2 max-w-xl text-lg text-[var(--fg-muted)]">
          Data structures, algorithms, and deep dives — companion to the DSA YouTube series.
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
          Articles coming soon. Subscribe to the YouTube series for updates.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <ArticleCard
              key={item.slug}
              item={item}
              basePath="/learn"
              accentColor={lane.accentVar}
            />
          ))}
        </div>
      )}
    </main>
  );
}
