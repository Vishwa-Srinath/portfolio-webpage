import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Vishwa Srinath",
  description:
    "CS&E undergraduate at the University of Moratuwa. Full bio, education timeline, skills, and resume.",
};

const skills = {
  Core: ["Python", "TypeScript", "SQL", "FastAPI", "Next.js"],
  Comfortable: ["VHDL", "n8n", "Supabase / Postgres", "Pydantic AI", "Docker"],
  Exploring: ["Rust", "WebGPU", "Edge Functions"],
};

const timeline = [
  { year: "Present", items: ["Second-year undergraduate in Computer Science and Engineering"] },
  { year: "2025", items: ["September — selected Computer Science and Engineering as my field of specialisation"] },
  { year: "2024", items: ["January — completed the G.C.E. Advanced Level examination", "December — entered the Faculty of Engineering at the University of Moratuwa"] },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold text-[var(--fg)] md:text-5xl">About</h1>

      {/* Full bio */}
      <section className="mt-8">
        <p className="text-base leading-relaxed text-[var(--fg-muted)]">
          I am a Computer Science and Engineering undergraduate in the Faculty of Engineering at the
          University of Moratuwa. I am passionate about solving real-world problems through an
          engineering mindset and applying the knowledge I gain through my studies.
        </p>
        <p className="mt-4 text-base leading-relaxed text-[var(--fg-muted)]">
          My key areas of interest include database systems, data science, machine learning, artificial
          intelligence, and mathematics. I am always eager to learn, take on new projects and
          challenges, and embrace responsibility.
        </p>
      </section>

      {/* Education */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-[var(--fg)]">Education</h2>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <p className="font-semibold text-[var(--fg)]">University of Moratuwa</p>
            <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
              B.Sc. Eng. in Computer Science &amp; Engineering · 24 Batch · Second Year
            </p>
            <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-relaxed text-[var(--fg-muted)]">
              After a competitive first semester in the Faculty of Engineering, I earned a place in
              the Computer Science and Engineering programme—the field I had always hoped to pursue.
              Its emphasis on mathematics and problem-solving closely matches my interests, and I
              continue to learn, grow, and strengthen my skills.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <p className="font-semibold text-[var(--fg)]">Maliyadeva College, Kurunegala</p>
            <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
              G.C.E. Advanced Level · Physical Science Stream · Completed January 2024
            </p>
            <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-relaxed text-[var(--fg-muted)]">
              Driven by a strong passion for mathematics and physics, I chose the Physical Science
              stream and earned A passes in Combined Mathematics, Physics, Chemistry, and English. I
              achieved a national rank of 602 and a Kurunegala District rank of 29.
            </p>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-[var(--fg)]">Skills</h2>
        <div className="space-y-4">
          {Object.entries(skills).map(([level, list]) => (
            <div key={level} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
              <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)] sm:pt-0.5">
                {level}
              </span>
              <div className="flex flex-wrap gap-2">
                {list.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-sm text-[var(--fg)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mt-12">
        <h2 className="mb-6 text-xl font-bold text-[var(--fg)]">Timeline</h2>
        <div className="space-y-8">
          {timeline.map((entry) => (
            <div key={entry.year} className="flex gap-6">
              <span className="w-16 shrink-0 pt-0.5 text-sm font-bold text-[var(--accent-cyan)]">
                {entry.year}
              </span>
              <ul className="space-y-2">
                {entry.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--fg-muted)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-cyan)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Resume */}
      <section className="mt-14 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
        <p className="text-[var(--fg-muted)]">Want the full picture?</p>
        <a
          href="/resume.pdf"
          download
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent-cyan)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Download Resume (PDF) ↓
        </a>
      </section>
    </main>
  );
}
