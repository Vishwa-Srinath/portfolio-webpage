import Link from "next/link";
import { lanes } from "@/lib/lanes";

export function LaneTeasers() {
  return (
    <section className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 text-2xl font-bold text-[var(--fg)] md:text-3xl">Explore</h2>
        <p className="mb-10 text-[var(--fg-muted)]">
          Projects, algorithms, history, and notes — pick a lane.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lanes.map((lane) => (
            <Link
              key={lane.key}
              href={lane.href}
              className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                ["--lane-accent" as string]: lane.accentVar,
              }}
            >
              <span className="mb-3 text-3xl">{lane.icon}</span>
              <h3
                className="text-base font-semibold transition-colors"
                style={{ color: lane.accentVar }}
              >
                {lane.label}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
                {lane.description}
              </p>
              <p
                className="mt-4 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: lane.accentVar }}
              >
                Explore {lane.label} →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
