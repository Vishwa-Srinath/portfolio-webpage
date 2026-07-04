import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllContentByType, getContentBySlug } from "@/lib/content";
import { MDXContent } from "@/components/mdx/MDXContent";
import { ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const projects = await getAllContentByType("projects");
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getContentBySlug("projects", slug);
  if (!project) return {};
  return {
    title: project.frontmatter.title,
    description: project.frontmatter.summary,
    openGraph: {
      title: `${project.frontmatter.title} — Vishwa Srinath`,
      description: project.frontmatter.summary,
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getContentBySlug("projects", slug);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-[var(--fg-muted)]">
        <Link href="/projects" className="hover:text-[var(--fg)]">
          Projects
        </Link>
        <span>/</span>
        <span className="text-[var(--fg)]">{project.frontmatter.title}</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--fg)] md:text-4xl">
          {project.frontmatter.title}
        </h1>
        <p className="mt-3 text-lg text-[var(--fg-muted)]">{project.frontmatter.summary}</p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <time className="text-sm text-[var(--fg-muted)]">
            {new Date(project.frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })}
          </time>
          {project.frontmatter.repoUrl && (
            <a
              href={project.frontmatter.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-cyan)] hover:underline"
            >
              View Code <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {project.frontmatter.liveUrl && (
            <a
              href={project.frontmatter.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              Live Demo <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {project.frontmatter.tags && project.frontmatter.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.frontmatter.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--fg-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="mb-10 border-t border-[var(--border)]" />
      <MDXContent source={project.content} />
    </main>
  );
}
