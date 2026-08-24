import fs from "fs/promises";
import path from "path";
import { load as parseYaml } from "js-yaml";

export type ProjectStatus = "shipped" | "in-progress" | "archived";

export type TechCategory =
  | "ai"
  | "backend"
  | "database"
  | "frontend"
  | "infra"
  | "hardware";

export interface TechStackItem {
  name: string;
  category: TechCategory;
  note?: string;
}

export interface ProjectChallenge {
  title: string;
  detail: string;
}

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
  gallery?: ProjectImage[];
  status?: ProjectStatus;
  role?: string;
  timeframe?: string;
  coverVideo?: string;
  techStack?: TechStackItem[];
  demoVideoUrl?: string;
  problem?: string;
  approach?: string;
  challenges?: ProjectChallenge[];
  results?: string[];
  architectureDiagram?: string;
}

export interface ProjectImage {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  layout?: "half" | "portrait" | "wide";
  type?: "image" | "video";
  kind?: "screenshot" | "diagram";
}

export interface ContentItem {
  slug: string;
  frontmatter: ContentFrontmatter;
  content: string; // Raw MDX
}

const CONTENT_DIR = path.join(process.cwd(), "content");

function parseContentFile(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/u.exec(normalized);

  if (!match) {
    throw new Error("Content file is missing valid YAML frontmatter");
  }

  const data = parseYaml(match[1]);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Content frontmatter must be a YAML object");
  }

  return {
    data: data as Record<string, unknown>,
    content: match[2],
  };
}

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
          const { data, content: body } = parseContentFile(raw);
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
    const { data, content: body } = parseContentFile(raw);
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
