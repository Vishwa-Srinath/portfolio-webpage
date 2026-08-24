import Link from "next/link";
import type { ContentItem } from "@/lib/content";
import { ProjectCard } from "@/components/projects/ProjectCard";

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
          <ProjectCard key={project.slug} project={project} variant="featured" />
        ))}
      </div>
    </section>
  );
}
