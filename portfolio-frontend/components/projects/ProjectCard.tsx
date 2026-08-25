import Image from "next/image";
import Link from "next/link";
import { Archive, CheckCircle2, Code2, Clock3 } from "lucide-react";
import type { ContentItem, ProjectStatus } from "@/lib/content";
import { TechStackChip } from "./TechStackChip";

interface Props {
  project: ContentItem;
  variant?: "default" | "featured";
}

const statusLabel: Record<ProjectStatus, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  archived: "Archived",
};

function StatusIcon({ status }: { status: ProjectStatus }) {
  if (status === "shipped") return <CheckCircle2 aria-hidden="true" className="h-3 w-3" />;
  if (status === "in-progress") return <Clock3 aria-hidden="true" className="h-3 w-3" />;
  return <Archive aria-hidden="true" className="h-3 w-3" />;
}

export function ProjectCard({ project, variant = "default" }: Props) {
  const { frontmatter, slug } = project;
  const isFeatured = variant === "featured";
  const projectHref = `/projects/${slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-cyan)]/40 hover:shadow-lg hover:shadow-[var(--accent-cyan)]/5">
      <Link
        href={projectHref}
        aria-label={`View ${frontmatter.title}`}
        className={`focus-ring relative block overflow-hidden border-b border-[var(--border)] bg-[var(--bg)] ${
          isFeatured ? "aspect-[16/9]" : "aspect-[16/10]"
        }`}
      >
        {frontmatter.coverImage ? (
          <Image
            src={frontmatter.coverImage}
            alt={`${frontmatter.title} project preview`}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,var(--bg),var(--bg-elevated))] px-6 text-center">
            <span className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-[var(--accent-cyan)] transition-transform duration-300 group-hover:scale-105">
              <Code2 aria-hidden="true" className="h-6 w-6" />
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              Project case study
            </span>
          </div>
        )}

        {frontmatter.status && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)]/90 px-2.5 py-1 text-xs font-medium text-[var(--fg)] backdrop-blur">
            <StatusIcon status={frontmatter.status} />
            {statusLabel[frontmatter.status]}
          </span>
        )}
        {frontmatter.coverImage && (
          <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--bg)]/60 to-transparent" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-base font-semibold">
          <Link
            href={projectHref}
            className="focus-ring rounded-sm text-[var(--fg)] transition-colors group-hover:text-[var(--accent-cyan)]"
          >
            {frontmatter.title}
          </Link>
        </h2>
        <p
          className={`mt-2 text-sm leading-relaxed text-[var(--fg-muted)] ${
            isFeatured ? "line-clamp-3" : "line-clamp-2"
          }`}
        >
          {frontmatter.summary}
        </p>

        {frontmatter.techStack && frontmatter.techStack.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {frontmatter.techStack.slice(0, 4).map((tech) => (
              <TechStackChip key={`${tech.category}-${tech.name}`} tech={tech} />
            ))}
            {frontmatter.techStack.length > 4 && (
              <span className="rounded-full px-2 py-0.5 text-xs text-[var(--fg-muted)]">
                +{frontmatter.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-xs">
          <time className="text-[var(--fg-muted)]" dateTime={frontmatter.date}>
            {new Date(frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
            })}
          </time>
          <Link
            href={projectHref}
            className="focus-ring rounded-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--accent-cyan)]"
          >
            Read case study →
          </Link>
        </div>
      </div>
    </article>
  );
}
