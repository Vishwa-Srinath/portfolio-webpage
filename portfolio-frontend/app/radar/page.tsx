import type { Metadata } from "next";
import { getAllRadarEntries } from "@/lib/radar";
import { RadarList } from "@/components/radar/RadarList";

export const metadata: Metadata = {
  title: "Tech Radar",
  description: "Short, dated notes on what I'm reading, testing, and adopting. Not a blog — just a running log.",
};

export default async function RadarPage() {
  const entries = await getAllRadarEntries();

  const counts = {
    adopted: entries.filter((e) => e.status === "adopted").length,
    trying: entries.filter((e) => e.status === "trying").length,
    watching: entries.filter((e) => e.status === "watching").length,
    dropped: entries.filter((e) => e.status === "dropped").length,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-[var(--fg)] md:text-5xl">Tech Radar</h1>
        <p className="mt-3 text-lg text-[var(--fg-muted)]">
          Short, dated notes on what I&apos;m reading, testing, and adopting. Not a blog — just a
          running log.
        </p>
      </div>

      {/* Status summary row */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Adopted", count: counts.adopted, color: "var(--accent-cyan)" },
          { label: "Trying", count: counts.trying, color: "var(--accent-amber)" },
          { label: "Watching", count: counts.watching, color: "var(--fg-muted)" },
          { label: "Dropped", count: counts.dropped, color: "var(--accent-rose)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center"
          >
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.count}
            </p>
            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{stat.label}</p>
          </div>
        ))}
      </div>

      <RadarList entries={entries} />
    </main>
  );
}
