import Link from "next/link";

export function BioStrip() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-base leading-relaxed text-[var(--fg-muted)] md:text-lg">
          I&apos;m a Computer Science &amp; Engineering undergraduate (23 Batch, University of Moratuwa)
          with a strong pull toward mathematics, machine learning, and the history of computing.
          Recent work spans agentic AI systems (FastAPI + Supabase + pgvector), FPGA-based digital
          design in VHDL, and a growing library of algorithm explainers. Outside of code, I&apos;m
          into music and telling the stories behind the machines we take for granted.
        </p>
        <Link
          href="/about"
          className="mt-6 inline-block text-sm font-medium text-[var(--accent-cyan)] transition-opacity hover:opacity-80"
        >
          More about me →
        </Link>
      </div>
    </section>
  );
}
