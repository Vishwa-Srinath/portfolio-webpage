"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

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
  { href: "https://youtube.com/@vishwasrinath", label: "YouTube", icon: YoutubeIcon },
];

type FormStatus = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) throw new Error("Something went wrong. Try again.");
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      {/* Form */}
      <div>
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-10 text-center">
            <CheckCircle className="h-12 w-12 text-[var(--accent-cyan)]" />
            <p className="text-lg font-semibold text-[var(--fg)]">Message sent!</p>
            <p className="text-sm text-[var(--fg-muted)]">
              I&apos;ll get back to you within a day or two.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-2 text-sm text-[var(--accent-cyan)] hover:underline"
            >
              Send another →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-[var(--fg)]">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                placeholder="Your name"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none transition-colors focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-[var(--fg)]">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none transition-colors focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-[var(--fg)]">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={6}
                placeholder="What's on your mind?"
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none transition-colors focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[var(--accent-rose)]/30 bg-[var(--accent-rose)]/10 px-4 py-3 text-sm text-[var(--accent-rose)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-cyan)] px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "sending" ? (
                "Sending..."
              ) : (
                <>
                  Send Message <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Right side: info */}
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Let&apos;s talk</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
            Whether it&apos;s about a project, a collaboration, a question about something I&apos;ve written, or just to say hi — I usually reply within a day or two.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--fg-muted)]">Find me on</p>
          <div className="mt-3 flex gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--fg-muted)] transition-all hover:border-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <link.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-[var(--border)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
            Current status
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-cyan)]" />
            <p className="text-sm text-[var(--fg)]">
              Available for internships &amp; interesting projects
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
