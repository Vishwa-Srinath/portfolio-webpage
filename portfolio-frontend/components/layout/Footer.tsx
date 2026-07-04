import Link from "next/link";
import { Github, Linkedin, Mail, ExternalLink } from "lucide-react";

const socialLinks = [
  { href: "https://github.com/Vishwa-Srinath", label: "GitHub", icon: Github },
  { href: "https://linkedin.com/in/vishwa-srinath", label: "LinkedIn", icon: Linkedin },
  { href: "mailto:hello@vishwasrinath.com", label: "Email", icon: Mail },
];

export function Footer(): React.ReactNode {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight">
              Vishwa Srinath<span className="text-[var(--accent-cyan)]">.</span>
            </Link>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              Full-stack engineer building systems that matter.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Explore
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { href: "/projects", label: "Projects" },
                { href: "/learn", label: "Learn" },
                { href: "/stories", label: "Stories" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Connect
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-8 md:flex-row">
          <p className="text-xs text-[var(--fg-muted)]">
            © {new Date().getFullYear()} Vishwa Srinath. Built with Next.js & FastAPI.
          </p>
          <a
            href="https://github.com/Vishwa-Srinath/portfolio-webpage"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
          >
            View Source <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
