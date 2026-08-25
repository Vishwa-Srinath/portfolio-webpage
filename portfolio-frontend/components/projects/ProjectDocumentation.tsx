import { ExternalLink, FileText } from "lucide-react";
import type { ProjectDocument } from "@/lib/content";

export function ProjectDocumentation({ documents }: { documents: ProjectDocument[] }) {
  if (documents.length === 0) return null;

  return (
    <section className="mb-14" aria-labelledby="project-documentation-heading">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
          Supporting material
        </p>
        <h2 id="project-documentation-heading" className="text-2xl font-bold text-[var(--fg)]">
          Project documentation
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Analysis, design, and technical documents created during the project.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {documents.map((document) => (
          <a
            key={`${document.title}-${document.url}`}
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition-colors hover:border-[var(--accent-cyan)]/50"
          >
            <span className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-[var(--accent-cyan)]">
              <FileText aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2 font-semibold text-[var(--fg)] group-hover:text-[var(--accent-cyan)]">
                {document.title}
                <ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              </span>
              {document.description && (
                <span className="mt-1 block text-sm leading-relaxed text-[var(--fg-muted)]">
                  {document.description}
                </span>
              )}
              {document.provider && (
                <span className="mt-2 block text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                  {document.provider}
                </span>
              )}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
