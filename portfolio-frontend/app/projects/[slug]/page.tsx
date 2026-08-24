import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircuitBoard,
  Code2,
  Clock3,
  ExternalLink,
  PlayCircle,
} from "lucide-react";
import { MDXContent } from "@/components/mdx/MDXContent";
import { ArchitectureDiagram } from "@/components/projects/ArchitectureDiagram";
import { ChallengeAccordion } from "@/components/projects/ChallengeAccordion";
import { ProjectGallery } from "@/components/projects/ProjectGallery";
import { ProjectDocumentation } from "@/components/projects/ProjectDocumentation";
import { ResultsList } from "@/components/projects/ResultsList";
import { TechStackChip } from "@/components/projects/TechStackChip";
import {
  getAllContentByType,
  getContentBySlug,
  sortByDate,
  type ProjectStatus,
  type TechCategory,
} from "@/lib/content";

interface Props {
  params: Promise<{ slug: string }>;
}

const statusLabel: Record<ProjectStatus, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  archived: "Archived",
};

const categoryLabel: Record<TechCategory, string> = {
  ai: "AI",
  backend: "Backend",
  database: "Database",
  frontend: "Frontend",
  infra: "Infrastructure",
  hardware: "Hardware",
};

const categoryOrder: TechCategory[] = [
  "ai",
  "backend",
  "database",
  "frontend",
  "infra",
  "hardware",
];

function StatusIcon({ status }: { status: ProjectStatus }) {
  if (status === "shipped") return <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />;
  if (status === "in-progress") return <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />;
  return <Archive aria-hidden="true" className="h-3.5 w-3.5" />;
}

export async function generateStaticParams() {
  const projects = await getAllContentByType("projects");
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getContentBySlug("projects", slug);
  if (!project) return {};

  return {
    title: { absolute: `${project.frontmatter.title} — Vishwa` },
    description: project.frontmatter.summary,
    openGraph: {
      title: project.frontmatter.title,
      description: project.frontmatter.summary,
      ...(project.frontmatter.coverImage
        ? {
            images: [
              {
                url: project.frontmatter.coverImage,
                width: 1200,
                height: 630,
                alt: `${project.frontmatter.title} project preview`,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [project, allProjects] = await Promise.all([
    getContentBySlug("projects", slug),
    getAllContentByType("projects"),
  ]);
  if (!project) notFound();

  const { frontmatter } = project;
  const projects = sortByDate(allProjects, "desc");
  const currentIndex = projects.findIndex((item) => item.slug === slug);
  const previousProject = currentIndex > 0 ? projects[currentIndex - 1] : null;
  const nextProject = currentIndex >= 0 && currentIndex < projects.length - 1
    ? projects[currentIndex + 1]
    : null;
  const groupedTech = categoryOrder
    .map((category) => ({
      category,
      items: frontmatter.techStack?.filter((tech) => tech.category === category) ?? [],
    }))
    .filter((group) => group.items.length > 0);
  const hasActions = Boolean(frontmatter.repoUrl || frontmatter.liveUrl || frontmatter.demoVideoUrl);
  const hasMeta = Boolean(frontmatter.role || frontmatter.timeframe || frontmatter.date);
  const hasDeepDive = project.content.trim().length > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <nav className="mb-8">
        <Link
          href="/projects"
          className="focus-ring inline-flex items-center gap-2 rounded-sm text-sm text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to projects
        </Link>
      </nav>

      <header className="mb-8 max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
            Project case study
          </p>
          {frontmatter.status && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--fg)]">
              <StatusIcon status={frontmatter.status} />
              {statusLabel[frontmatter.status]}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight text-[var(--fg)] md:text-5xl">
          {frontmatter.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[var(--fg-muted)]">
          {frontmatter.summary}
        </p>

        {hasMeta && (
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-[var(--fg-muted)]">
            {frontmatter.role && <span>{frontmatter.role}</span>}
            {frontmatter.role && frontmatter.timeframe && <span aria-hidden="true">·</span>}
            {frontmatter.timeframe && <span>{frontmatter.timeframe}</span>}
            {(frontmatter.role || frontmatter.timeframe) && <span aria-hidden="true">·</span>}
            <time dateTime={frontmatter.date}>
              {new Date(frontmatter.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </time>
          </div>
        )}
      </header>

      <section aria-label="Project cover" className="relative mb-6 aspect-[21/9] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        {frontmatter.coverVideo ? (
          <video
            src={frontmatter.coverVideo}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          >
            Your browser does not support this project preview video.
          </video>
        ) : frontmatter.coverImage ? (
          <Image
            src={frontmatter.coverImage}
            alt={`${frontmatter.title} project cover`}
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 960px"
            className="object-cover object-[center_12%]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--bg),var(--bg-elevated))]">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-[var(--fg-muted)]">
              <CircuitBoard aria-hidden="true" className="h-6 w-6 text-[var(--accent-cyan)]" />
              <span className="font-mono text-xs uppercase tracking-[0.16em]">Project visual to be added</span>
            </div>
          </div>
        )}
      </section>

      {hasActions && (
        <div className="mb-14 flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-6">
          {frontmatter.repoUrl && (
            <a
              href={frontmatter.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--accent-cyan)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
            >
              <Code2 aria-hidden="true" className="h-4 w-4" /> GitHub
            </a>
          )}
          {frontmatter.liveUrl && (
            <a
              href={frontmatter.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--fg)] transition-colors hover:border-[var(--accent-cyan)]"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" /> Live demo
            </a>
          )}
          {frontmatter.demoVideoUrl && (
            <a
              href={frontmatter.demoVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--fg)] transition-colors hover:border-[var(--accent-cyan)]"
            >
              <PlayCircle aria-hidden="true" className="h-4 w-4" /> Watch demo
            </a>
          )}
        </div>
      )}

      <div className="max-w-4xl">
        {frontmatter.problem && (
          <section className="mb-14" aria-labelledby="problem-heading">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
              01 · Context
            </p>
            <h2 id="problem-heading" className="text-2xl font-bold text-[var(--fg)]">
              The problem
            </h2>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[var(--fg-muted)]">
              {frontmatter.problem}
            </p>
          </section>
        )}

        {(frontmatter.approach || groupedTech.length > 0) && (
          <section className="mb-14" aria-labelledby="approach-heading">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
              02 · Solution
            </p>
            <h2 id="approach-heading" className="text-2xl font-bold text-[var(--fg)]">
              The approach
            </h2>
            {frontmatter.approach && (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--fg-muted)]">
                {frontmatter.approach}
              </p>
            )}
            {groupedTech.length > 0 && (
              <div className="mt-7 grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:grid-cols-2">
                {groupedTech.map((group) => (
                  <div key={group.category}>
                    <h3 className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                      {categoryLabel[group.category]}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((tech) => (
                        <TechStackChip key={`${group.category}-${tech.name}`} tech={tech} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {frontmatter.architectureDiagram && (
          <ArchitectureDiagram src={frontmatter.architectureDiagram} title={frontmatter.title} />
        )}

        {frontmatter.gallery && frontmatter.gallery.length > 0 && (
          <ProjectGallery images={frontmatter.gallery} />
        )}

        {frontmatter.challenges && frontmatter.challenges.length > 0 && (
          <ChallengeAccordion challenges={frontmatter.challenges} />
        )}

        {frontmatter.results && frontmatter.results.length > 0 && (
          <ResultsList results={frontmatter.results} />
        )}

        {frontmatter.documentation && frontmatter.documentation.length > 0 && (
          <ProjectDocumentation documents={frontmatter.documentation} />
        )}

        {hasDeepDive && (
          <section className="mb-16 border-t border-[var(--border)] pt-12" aria-labelledby="deep-dive-heading">
            <div className="mb-8">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
                Detailed notes
              </p>
              <h2 id="deep-dive-heading" className="text-2xl font-bold text-[var(--fg)]">
                Deep dive
              </h2>
            </div>
            <MDXContent source={project.content} />
          </section>
        )}
      </div>

      <nav aria-label="Project navigation" className="border-t border-[var(--border)] pt-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {previousProject ? (
            <Link
              href={`/projects/${previousProject.slug}`}
              className="focus-ring group rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 transition-colors hover:border-[var(--accent-cyan)]/50"
            >
              <span className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Previous project
              </span>
              <span className="mt-2 block font-semibold text-[var(--fg)] group-hover:text-[var(--accent-cyan)]">
                {previousProject.frontmatter.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {nextProject && (
            <Link
              href={`/projects/${nextProject.slug}`}
              className="focus-ring group rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-right transition-colors hover:border-[var(--accent-cyan)]/50"
            >
              <span className="flex items-center justify-end gap-2 text-xs text-[var(--fg-muted)]">
                Next project <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              <span className="mt-2 block font-semibold text-[var(--fg)] group-hover:text-[var(--accent-cyan)]">
                {nextProject.frontmatter.title}
              </span>
            </Link>
          )}
        </div>

        {frontmatter.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Explore related
            </span>
            {frontmatter.tags.map((tag) => (
              <Link
                key={tag}
                href={`/projects?q=${encodeURIComponent(tag)}`}
                className="focus-ring rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--fg)]"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </main>
  );
}
