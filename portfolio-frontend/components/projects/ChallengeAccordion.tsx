import type { ProjectChallenge } from "@/lib/content";

export function ChallengeAccordion({ challenges }: { challenges: ProjectChallenge[] }) {
  if (challenges.length === 0) return null;

  return (
    <section className="mb-14" aria-labelledby="challenges-heading">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
          Engineering trade-offs
        </p>
        <h2 id="challenges-heading" className="text-2xl font-bold text-[var(--fg)]">
          Challenges
        </h2>
      </div>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        {challenges.map((challenge) => (
          <details key={challenge.title} className="group px-5 py-4 open:bg-[var(--bg)]/30">
            <summary className="focus-ring cursor-pointer list-none rounded-sm text-sm font-semibold text-[var(--fg)] marker:hidden">
              <span
                aria-hidden="true"
                className="mr-2 inline-block text-[var(--accent-cyan)] transition-transform group-open:rotate-90"
              >
                ▸
              </span>
              {challenge.title}
            </summary>
            <p className="mt-3 max-w-3xl pl-5 text-sm leading-relaxed text-[var(--fg-muted)]">
              {challenge.detail}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
