import type { Metadata } from "next";
import { getAllContentByType, sortByDate } from "@/lib/content";
import { ProjectCard } from "@/components/projects/ProjectCard";

export const metadata: Metadata = {
  title: "Projects",
  description: "Full-stack systems, agentic AI, FPGA experiments, and hackathon builds.",
  openGraph: {
    title: "Projects — Vishwa Srinath",
    images: [{ url: "/og/projects.png", width: 1200, height: 630 }],
  },
};

export default async function ProjectsPage() {
  const projects = await getAllContentByType("projects");
  const sorted = sortByDate(projects, "desc");

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[var(--fg)] md:text-5xl">Projects</h1>
        <p className="mt-3 max-w-xl text-lg text-[var(--fg-muted)]">
          Full-stack builds, agentic AI systems, competitive code, and FPGA experiments.
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-[var(--fg-muted)]">Projects coming soon.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
