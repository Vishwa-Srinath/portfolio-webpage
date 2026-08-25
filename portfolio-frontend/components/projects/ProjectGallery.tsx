"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import type { ProjectImage } from "@/lib/content";
import { ProjectLightbox } from "./ProjectLightbox";

interface Props {
  images: ProjectImage[];
}

const layoutClasses: Record<NonNullable<ProjectImage["layout"]>, string> = {
  half: "md:col-span-3",
  portrait: "md:col-span-3",
  wide: "md:col-span-6",
};

export function ProjectGallery({ images }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section aria-labelledby="project-gallery-heading" className="mb-14">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
          Visual walkthrough
        </p>
        <h2 id="project-gallery-heading" className="text-2xl font-bold text-[var(--fg)]">
          Product &amp; architecture
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Selected screens and technical design work. Open any item for a closer view.
        </p>
      </div>

      <div className="grid gap-x-4 gap-y-7 md:grid-cols-6">
        {images.map((image, index) => (
          <figure key={image.src} className={layoutClasses[image.layout ?? "wide"]}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Expand ${image.alt}`}
              className="focus-ring group block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] text-left transition-colors hover:border-[var(--accent-cyan)]/50"
            >
              {image.kind === "screenshot" && (
                <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--fg-muted)]/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--fg-muted)]/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--fg-muted)]/20" />
                  <span className="ml-auto flex items-center gap-1 text-[0.65rem] text-[var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 aria-hidden="true" className="h-3 w-3" /> Expand
                  </span>
                </div>
              )}
              <div
                className={
                  image.layout === "portrait"
                    ? "flex min-h-[20rem] items-center justify-center p-3"
                    : "relative"
                }
              >
                {image.type === "video" ? (
                  <video
                    src={image.src}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-auto w-full object-contain"
                  />
                ) : (
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes={
                      image.layout === "half" || image.layout === "portrait"
                        ? "(max-width: 767px) 100vw, 50vw"
                        : "(max-width: 767px) 100vw, 960px"
                    }
                    className={
                      image.layout === "portrait"
                        ? "mx-auto h-auto max-h-[34rem] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                        : "h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    }
                  />
                )}
              </div>
            </button>
            <figcaption className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              {image.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      {openIndex !== null && (
        <ProjectLightbox
          items={images.map((image) => ({
            src: image.src,
            alt: image.alt,
            caption: image.caption,
            type: image.type,
          }))}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </section>
  );
}
