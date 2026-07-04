import Link from "next/link";
import type { ContentItem } from "@/lib/content";

interface Props {
  project: ContentItem;
}

export function ProjectCard({ project }: Props) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-cyan)]/40 hover:shadow-lg hover:shadow-[var(--accent-cyan)]/5"
    >
      <div className="flex-1">
        <h2 className="text-base font-semibold text-[var(--fg)] transition-colors group-hover:text-[var(--accent-cyan)]">
          {project.frontmatter.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--fg-muted)]">
          {project.frontmatter.summary}
        </p>
      </div>

      {project.frontmatter.tags && project.frontmatter.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {project.frontmatter.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--fg-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <time className="text-xs text-[var(--fg-muted)]">
          {new Date(project.frontmatter.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          })}
        </time>
        <p className="text-xs font-medium text-[var(--accent-cyan)] opacity-0 transition-opacity group-hover:opacity-100">
          Read →
        </p>
      </div>
    </Link>
  );
}
