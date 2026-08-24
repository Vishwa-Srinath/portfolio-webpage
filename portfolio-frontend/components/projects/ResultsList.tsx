import { CheckCircle2 } from "lucide-react";

export function ResultsList({ results }: { results: string[] }) {
  if (results.length === 0) return null;

  return (
    <section className="mb-14" aria-labelledby="results-heading">
      <div className="mb-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
          What changed
        </p>
        <h2 id="results-heading" className="text-2xl font-bold text-[var(--fg)]">
          Results
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {results.map((result) => (
          <li
            key={result}
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-sm leading-relaxed text-[var(--fg)]"
          >
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-cyan)]"
            />
            {result}
          </li>
        ))}
      </ul>
    </section>
  );
}
