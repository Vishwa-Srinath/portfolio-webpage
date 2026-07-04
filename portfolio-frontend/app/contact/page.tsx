import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Connect — Vishwa Srinath",
  description:
    "Get in touch — for projects, collaborations, or just to say hi.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[var(--fg)] md:text-5xl">
          Let&apos;s talk
        </h1>
        <p className="mt-3 max-w-lg text-lg text-[var(--fg-muted)]">
          Whether it&apos;s a project, a collaboration, or just to say hi — I usually
          reply within a day or two.
        </p>
      </div>

      <ContactForm />
    </main>
  );
}
