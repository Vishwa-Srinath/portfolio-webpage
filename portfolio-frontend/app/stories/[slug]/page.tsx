import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllContentByType, getContentBySlug } from "@/lib/content";
import { MDXContent } from "@/components/mdx/MDXContent";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const items = await getAllContentByType("stories");
  return items.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getContentBySlug("stories", slug);
  if (!item) return {};
  return { title: item.frontmatter.title, description: item.frontmatter.summary };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const item = await getContentBySlug("stories", slug);
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <nav className="mb-8 flex items-center gap-2 text-sm text-[var(--fg-muted)]">
        <Link href="/stories" className="hover:text-[var(--fg)]">Behind the Bit</Link>
        <span>/</span>
        <span className="text-[var(--fg)]">{item.frontmatter.title}</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--fg)] md:text-4xl">{item.frontmatter.title}</h1>
        <p className="mt-3 text-lg text-[var(--fg-muted)]">{item.frontmatter.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <time className="text-sm text-[var(--fg-muted)]">
            {new Date(item.frontmatter.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </time>
          {item.frontmatter.tags?.map((tag) => (
            <span key={tag} className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--fg-muted)]">{tag}</span>
          ))}
        </div>
      </header>

      <div className="mb-10 border-t border-[var(--border)]" />
      <MDXContent source={item.content} />
    </main>
  );
}
