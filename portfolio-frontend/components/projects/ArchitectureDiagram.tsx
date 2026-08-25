"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { ProjectLightbox } from "./ProjectLightbox";

interface Props {
  src: string;
  title: string;
}

export function ArchitectureDiagram({ src, title }: Props) {
  const [open, setOpen] = useState(false);
  const alt = `${title} architecture diagram`;

  return (
    <section className="mb-14" aria-labelledby="architecture-heading">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
          System view
        </p>
        <h2 id="architecture-heading" className="text-2xl font-bold text-[var(--fg)]">
          Architecture
        </h2>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring group relative block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-left transition-colors hover:border-[var(--accent-cyan)]/50 sm:p-6"
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={700}
          sizes="(max-width: 1023px) 100vw, 960px"
          className="h-auto w-full rounded-lg object-contain"
        />
        <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)]/90 px-2.5 py-1 text-xs text-[var(--fg-muted)] backdrop-blur transition-colors group-hover:text-[var(--accent-cyan)]">
          <Maximize2 aria-hidden="true" className="h-3 w-3" /> Expand
        </span>
      </button>

      {open && (
        <ProjectLightbox
          items={[{ src, alt }]}
          index={0}
          onClose={() => setOpen(false)}
          onNavigate={() => undefined}
        />
      )}
    </section>
  );
}
