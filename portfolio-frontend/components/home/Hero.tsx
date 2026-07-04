import Image from "next/image";
import Link from "next/link";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const socialLinks = [
  { href: "https://github.com/Vishwa-Srinath", label: "GitHub", icon: GithubIcon },
  { href: "https://linkedin.com/in/vishwa-srinath", label: "LinkedIn", icon: LinkedinIcon },
  { href: "https://youtube.com/@vishwasrinath", label: "YouTube DSA Series", icon: YoutubeIcon },
];

export function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-20 md:flex-row md:items-center md:py-28 md:text-left">
      {/* Profile photo */}
      <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full ring-4 ring-[var(--border)] ring-offset-4 ring-offset-[var(--bg)] md:h-52 md:w-52">
        <Image
          src="/images/profile/headshot.png"
          alt="Vishwa Srinath, CS&E undergraduate"
          fill
          sizes="(max-width: 768px) 160px, 208px"
          className="object-cover"
          priority
        />
      </div>

      {/* Text content */}
      <div className="text-center md:text-left">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--accent-cyan)]">
          University of Moratuwa · 23 Batch
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--fg)] md:text-5xl lg:text-6xl">
          Vishwa Srinath
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--fg-muted)]">
          CS&amp;E undergraduate building agentic AI systems, writing DSA content,
          and occasionally soldering an FPGA.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <Link
            href="/projects"
            className="inline-flex h-11 items-center rounded-full bg-[var(--accent-cyan)] px-6 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--accent-cyan)]/25"
          >
            View Projects
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-6 text-sm font-semibold text-[var(--fg)] transition-all hover:border-[var(--fg-muted)]"
          >
            Get in Touch
          </Link>
          <a
            href="/resume.pdf"
            download
            className="inline-flex h-11 items-center rounded-full px-6 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
          >
            Resume ↓
          </a>
        </div>

        {/* Social links */}
        <div className="mt-6 flex items-center justify-center gap-4 md:justify-start">
          {socialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className="text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
            >
              <link.icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
