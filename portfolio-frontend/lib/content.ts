import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export interface ContentFrontmatter {
  title: string;
  slug: string;
  summary: string;
  date: string;
  tags: string[];
  coverImage?: string;
  liveUrl?: string;
  repoUrl?: string;
  featured?: boolean;
}

export interface ContentItem {
  slug: string;
  frontmatter: ContentFrontmatter;
  content: string; // Raw MDX
}

const CONTENT_DIR = path.join(process.cwd(), "content");

export async function getAllContentByType(
  type: "projects" | "learn" | "stories" | "notes"
): Promise<ContentItem[]> {
  const dir = path.join(CONTENT_DIR, type);

  try {
    const files = await fs.readdir(dir);

    const items = await Promise.all(
      files
        .filter((f) => f.endsWith(".mdx"))
        .map(async (file) => {
          const raw = await fs.readFile(path.join(dir, file), "utf-8");
          const { data, content: body } = matter(raw);
          const slug = file.replace(".mdx", "");
          return {
            slug,
            frontmatter: { ...data, slug } as ContentFrontmatter,
            content: body,
          };
        })
    );

    return items;
  } catch {
    // Directory doesn't exist yet — return empty
    return [];
  }
}

export async function getContentBySlug(
  type: "projects" | "learn" | "stories" | "notes",
  slug: string
): Promise<ContentItem | null> {
  try {
    const file = path.join(CONTENT_DIR, type, `${slug}.mdx`);
    const raw = await fs.readFile(file, "utf-8");
    const { data, content: body } = matter(raw);
    return {
      slug,
      frontmatter: { ...data, slug } as ContentFrontmatter,
      content: body,
    };
  } catch {
    return null;
  }
}

export function sortByDate(
  items: ContentItem[],
  direction: "asc" | "desc" = "desc"
): ContentItem[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime();
    const dateB = new Date(b.frontmatter.date).getTime();
    return direction === "desc" ? dateB - dateA : dateA - dateB;
  });
}

export function filterFeatured(items: ContentItem[]): ContentItem[] {
  return items.filter((item) => item.frontmatter.featured);
}
