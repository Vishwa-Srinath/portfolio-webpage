import Link from "next/link";
import type { ContentItem } from "@/lib/content";

interface Props {
  projects: ContentItem[];
}

export function FeaturedProjects({ projects }: Props) {
  if (projects.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-10 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold text-[var(--fg)] md:text-3xl">Featured Projects</h2>
        <Link
          href="/projects"
          className="text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          See all →
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-cyan)]/40 hover:shadow-lg hover:shadow-[var(--accent-cyan)]/5"
          >
            <div className="flex-1">
              <h3 className="text-base font-semibold text-[var(--fg)] transition-colors group-hover:text-[var(--accent-cyan)]">
                {project.frontmatter.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--fg-muted)]">
                {project.frontmatter.summary}
              </p>
            </div>

            {project.frontmatter.tags && project.frontmatter.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.frontmatter.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--fg-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs font-medium text-[var(--accent-cyan)] opacity-0 transition-opacity group-hover:opacity-100">
              Read case study →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
