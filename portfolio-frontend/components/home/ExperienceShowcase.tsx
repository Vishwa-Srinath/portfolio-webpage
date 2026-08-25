import type { Experience } from "@/lib/experiences";
import { ExperienceCarousel } from "@/components/experiences/ExperienceCarousel";

interface Props {
  experiences: Experience[];
}

export function ExperienceShowcase({ experiences }: Props) {
  if (experiences.length === 0) return null;

  return (
    <section
      id="involvement"
      aria-labelledby="involvement-heading"
      className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-16"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent-violet)]">
            Beyond the classroom
          </p>
          <h2
            id="involvement-heading"
            className="text-2xl font-bold text-[var(--fg)] md:text-3xl"
          > 
            Beyond the Terminal
          </h2>
          <p className="mt-3 leading-relaxed text-[var(--fg-muted)]">
            Selected moments of leadership, department service, competition, and continued
            learning.
          </p>
        </div>

        <ExperienceCarousel experiences={experiences} />
      </div>
    </section>
  );
}
