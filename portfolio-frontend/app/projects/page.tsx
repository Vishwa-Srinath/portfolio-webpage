import type { Metadata } from "next";
import { getAllContentByType, sortByDate } from "@/lib/content";
import { ProjectsShowcase } from "@/components/projects/ProjectsShowcase";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software systems, data-focused projects, community platforms, and FPGA experiments.",
  openGraph: {
    title: "Projects — Vishwa Srinath",
    images: [{ url: "/og/projects.png", width: 1200, height: 630 }],
  },
};

interface Props {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
  }>;
}

export default async function ProjectsPage({ searchParams }: Props) {
  const projects = sortByDate(await getAllContentByType("projects"), "desc");
  const query = await searchParams;
  const initialQuery = typeof query.q === "string" ? query.q : "";
  const initialCategory = typeof query.category === "string" ? query.category : "all";

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <header className="mb-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
          Selected engineering work
        </p>
        <h1 className="text-4xl font-bold text-[var(--fg)] md:text-5xl">Projects</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[var(--fg-muted)]">
          A collection of systems I have designed, built, and studied—presented through the
          problems, engineering decisions, and outcomes behind them.
        </p>
      </header>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
          Projects coming soon.
        </p>
      ) : (
        <ProjectsShowcase
          projects={projects}
          initialQuery={initialQuery}
          initialCategory={initialCategory}
        />
      )}
    </main>
  );
}
