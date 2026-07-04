import Link from "next/link";
import type { ContentItem } from "@/lib/content";

interface Props {
  item: ContentItem;
  basePath: string;
  accentColor?: string;
}

export function ArticleCard({ item, basePath, accentColor }: Props) {
  return (
    <Link
      href={`${basePath}/${item.slug}`}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--fg-muted)]/40 hover:shadow-md"
    >
      <h3
        className="text-base font-semibold text-[var(--fg)] transition-colors group-hover:underline"
        style={{ textDecorationColor: accentColor }}
      >
        {item.frontmatter.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--fg-muted)]">
        {item.frontmatter.summary}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <time className="text-xs text-[var(--fg-muted)]">
          {new Date(item.frontmatter.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>

        {item.frontmatter.tags && item.frontmatter.tags.length > 0 && (
          <div className="flex gap-1">
            {item.frontmatter.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--fg-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
