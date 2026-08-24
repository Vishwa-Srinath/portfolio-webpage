"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ContentItem, TechCategory } from "@/lib/content";
import { ProjectCard } from "./ProjectCard";

const categoryOptions: Array<{ value: "all" | TechCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI" },
  { value: "backend", label: "Backend" },
  { value: "database", label: "Database" },
  { value: "frontend", label: "Frontend" },
  { value: "infra", label: "Infrastructure" },
  { value: "hardware", label: "Hardware" },
];

interface Props {
  projects: ContentItem[];
  initialQuery?: string;
  initialCategory?: string;
}

export function ProjectsShowcase({
  projects,
  initialQuery = "",
  initialCategory = "all",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<"all" | TechCategory>(() =>
    categoryOptions.some((option) => option.value === initialCategory)
      ? (initialCategory as "all" | TechCategory)
      : "all"
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      const trimmedQuery = query.trim();
      if (trimmedQuery) params.set("q", trimmedQuery);
      if (category !== "all") params.set("category", category);
      const nextUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
      startTransition(() => router.replace(nextUrl, { scroll: false }));
    }, 150);

    return () => window.clearTimeout(timer);
  }, [category, pathname, query, router]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return projects.filter((project) => {
      const searchable = [
        project.frontmatter.title,
        project.frontmatter.summary,
        ...(project.frontmatter.tags ?? []),
      ]
        .join(" ")
        .toLocaleLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesCategory =
        category === "all" ||
        project.frontmatter.techStack?.some((tech) => tech.category === category);

      return matchesQuery && matchesCategory;
    });
  }, [category, projects, query]);

  const featuredProjects = filteredProjects.filter((project) => project.frontmatter.featured);
  const hasActiveFilters = query.trim().length > 0 || category !== "all";

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  return (
    <div>
      <section aria-label="Project filters" className="mb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search projects</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, tools, or topics"
              className="focus-ring h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] pl-10 pr-10 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filter by discipline">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
            {categoryOptions.map((option) => {
              const isActive = category === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  aria-pressed={isActive}
                  className={`focus-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)] text-[var(--bg)]"
                      : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:border-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
          <p className="font-medium text-[var(--fg)]">No projects match those filters.</p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Try a broader search or return to the full collection.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="focus-ring mt-5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--fg)] hover:border-[var(--accent-cyan)]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {featuredProjects.length > 0 && (
            <section aria-labelledby="featured-projects-heading" className="mb-14">
              <div className="mb-6 flex items-center gap-4">
                <h2 id="featured-projects-heading" className="shrink-0 text-xl font-bold text-[var(--fg)]">
                  Featured
                </h2>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredProjects.map((project) => (
                  <ProjectCard key={project.slug} project={project} variant="featured" />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="all-projects-heading">
            <div className="mb-6 flex items-center gap-4">
              <h2 id="all-projects-heading" className="shrink-0 text-xl font-bold text-[var(--fg)]">
                All projects <span className="text-[var(--fg-muted)]">({filteredProjects.length})</span>
              </h2>
              <span className="h-px flex-1 bg-[var(--border)]" />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="focus-ring shrink-0 text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="grid gap-6 transition-all duration-200 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
