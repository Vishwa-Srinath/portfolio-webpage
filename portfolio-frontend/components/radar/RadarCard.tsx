import type { RadarEntry } from "@/lib/radar";
import { ExternalLink } from "lucide-react";

const STATUS_CONFIG: Record<
  RadarEntry["status"],
  { label: string; dotColor: string; textColor: string }
> = {
  adopted: {
    label: "Adopted",
    dotColor: "bg-[var(--accent-cyan)]",
    textColor: "text-[var(--accent-cyan)]",
  },
  trying: {
    label: "Trying",
    dotColor: "bg-[var(--accent-amber)]",
    textColor: "text-[var(--accent-amber)]",
  },
  watching: {
    label: "Watching",
    dotColor: "bg-[var(--fg-muted)]",
    textColor: "text-[var(--fg-muted)]",
  },
  dropped: {
    label: "Dropped",
    dotColor: "bg-[var(--accent-rose)]",
    textColor: "text-[var(--accent-rose)]",
  },
};

export function RadarCard({ entry }: { entry: RadarEntry }) {
  const config = STATUS_CONFIG[entry.status];

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 transition-colors hover:border-[var(--fg-muted)]/40">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${config.dotColor}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <time className="shrink-0 text-xs text-[var(--fg-muted)]">
          {new Date(entry.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>

      <h3
        className={`mt-2 text-base font-semibold ${
          entry.status === "dropped"
            ? "text-[var(--fg-muted)] line-through opacity-70"
            : "text-[var(--fg)]"
        }`}
      >
        {entry.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{entry.summary}</p>

      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--fg-muted)]">
          {entry.category}
        </span>
        {entry.link && (
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-[var(--accent-cyan)] transition-opacity hover:opacity-80"
          >
            Link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
