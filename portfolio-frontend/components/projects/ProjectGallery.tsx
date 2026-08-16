import Image from "next/image";
import type { ProjectImage } from "@/lib/content";

interface Props {
  images: ProjectImage[];
}

const layoutClasses: Record<NonNullable<ProjectImage["layout"]>, string> = {
  half: "md:col-span-3",
  portrait: "md:col-span-3",
  wide: "md:col-span-6",
};

export function ProjectGallery({ images }: Props) {
  return (
    <section aria-labelledby="project-gallery-heading" className="mb-12">
      <div className="mb-5">
        <h2 id="project-gallery-heading" className="text-xl font-bold text-[var(--fg)]">
          Product &amp; architecture
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Selected screens and technical design work from the project.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        {images.map((image) => (
          <figure
            key={image.src}
            className={layoutClasses[image.layout ?? "wide"]}
          >
            <div
              className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] ${
                image.layout === "portrait" ? "flex items-center justify-center p-3" : ""
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes={
                  image.layout === "half" || image.layout === "portrait"
                      ? "(max-width: 767px) 100vw, 50vw"
                      : "(max-width: 767px) 100vw, 768px"
                }
                className={
                  image.layout === "portrait"
                    ? "mx-auto h-auto max-h-[34rem] w-auto max-w-full object-contain"
                    : "h-auto w-full object-contain"
                }
              />
            </div>
            <figcaption className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              {image.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
