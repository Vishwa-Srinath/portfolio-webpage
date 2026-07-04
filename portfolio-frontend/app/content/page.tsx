import type { Metadata } from "next";
import Link from "next/link";
import { lanes } from "@/lib/lanes";
import { getAllContentByType, sortByDate } from "@/lib/content";
import { ArticleCard } from "@/components/content/ArticleCard";

export const metadata: Metadata = {
  title: "Content",
  description: "DSA articles, computing history stories, and personal notes from Vishwa Srinath.",
};

export default async function ContentHubPage() {
  const contentLanes = lanes.filter((l) =>
    ["learn", "stories", "notes"].includes(l.key)
  );

  const previews = await Promise.all(
    contentLanes.map(async (lane) => {
      const items = await getAllContentByType(
        lane.key as "learn" | "stories" | "notes"
      );
      const latest = sortByDate(items, "desc").slice(0, 3);
      return { lane, latest };
    })
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold text-[var(--fg)] md:text-5xl">Content</h1>
      <p className="mt-3 max-w-xl text-lg text-[var(--fg-muted)]">
        Algorithms, computing history, and the occasional life update.
      </p>

      <div className="mt-14 space-y-16">
        {previews.map(({ lane, latest }) => (
          <section key={lane.key}>
            <div className="mb-6 flex items-baseline justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lane.icon}</span>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: lane.accentVar }}
                >
                  {lane.label}
                </h2>
              </div>
              <Link
                href={lane.href}
                className="text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
              >
                View all →
              </Link>
            </div>

            {latest.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--fg-muted)]">
                {lane.label} articles coming soon.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {latest.map((item) => (
                  <ArticleCard
                    key={item.slug}
                    item={item}
                    basePath={lane.href}
                    accentColor={lane.accentVar}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
