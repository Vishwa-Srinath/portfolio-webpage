import "server-only";

import type { Dirent } from "fs";
import fs from "fs/promises";
import path from "path";
import { load as parseYaml } from "js-yaml";

export const EXPERIENCE_CATEGORIES = [
  "leadership",
  "organizing",
  "competition",
  "learning",
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

export const EXPERIENCE_CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  leadership: "Leadership & Service",
  organizing: "Event Organizing",
  competition: "Competitions & Recognition",
  learning: "Research & Learning",
};

export interface ExperienceImage {
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
}

export interface ExperienceLink {
  label: string;
  url: string;
}

/**
 * Normalized, JSON-serializable experience metadata. This can be passed from a
 * Server Component to the small interactive carousel without further mapping.
 */
export interface Experience {
  slug: string;
  title: string;
  category: ExperienceCategory;
  date: string;
  dateLabel: string;
  role: string;
  organization: string;
  location?: string;
  summary: string;
  contribution: string;
  outcome?: string;
  featured: boolean;
  published: boolean;
  order: number;
  images: ExperienceImage[];
  links: ExperienceLink[];
}

const EXPERIENCES_DIR = path.join(process.cwd(), "content", "experiences");
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

const EXPERIENCE_FIELDS = new Set([
  "title",
  "slug",
  "category",
  "date",
  "dateLabel",
  "role",
  "organization",
  "location",
  "summary",
  "contribution",
  "outcome",
  "featured",
  "published",
  "order",
  "images",
  "links",
]);

const IMAGE_FIELDS = new Set(["src", "alt", "caption", "width", "height"]);
const LINK_FIELDS = new Set(["label", "url"]);

function contentError(fileName: string, field: string, message: string): never {
  const fieldLabel = field ? ` field "${field}"` : "";
  throw new Error(`Invalid experience content in ${fileName}:${fieldLabel} ${message}`);
}

function asRecord(
  value: unknown,
  fileName: string,
  field: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    contentError(fileName, field, "must be a YAML object.");
  }

  return value as Record<string, unknown>;
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowedFields: Set<string>,
  fileName: string,
  fieldPrefix = "",
): void {
  for (const key of Object.keys(value)) {
    if (!allowedFields.has(key)) {
      const field = fieldPrefix ? `${fieldPrefix}.${key}` : key;
      contentError(fileName, field, "is not a supported field (check for a typo).");
    }
  }
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
  fileName: string,
  fieldName = key,
): string {
  const candidate = value[key];
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    contentError(fileName, fieldName, "must be a non-empty string.");
  }

  return candidate.trim();
}

function optionalString(
  value: Record<string, unknown>,
  key: string,
  fileName: string,
  fieldName = key,
): string | undefined {
  const candidate = value[key];
  if (candidate === undefined || candidate === null) {
    return undefined;
  }
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    contentError(fileName, fieldName, "must be a non-empty string when provided.");
  }

  return candidate.trim();
}

function requiredBoolean(
  value: Record<string, unknown>,
  key: string,
  fileName: string,
): boolean {
  const candidate = value[key];
  if (typeof candidate !== "boolean") {
    contentError(fileName, key, "must be true or false (without quotes).");
  }

  return candidate;
}

function optionalOrder(value: Record<string, unknown>, fileName: string): number {
  const candidate = value.order;
  if (candidate === undefined || candidate === null) {
    return 0;
  }
  if (!Number.isInteger(candidate) || (candidate as number) < 0) {
    contentError(fileName, "order", "must be a non-negative whole number.");
  }

  return candidate as number;
}

function normalizeDate(value: string, fileName: string): string {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    contentError(fileName, "date", "must use the quoted YYYY-MM-DD format.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    contentError(fileName, "date", "must be a real calendar date.");
  }

  return value;
}

function defaultDateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function parseCategory(
  value: Record<string, unknown>,
  fileName: string,
): ExperienceCategory {
  const category = requiredString(value, "category", fileName);
  if (!(EXPERIENCE_CATEGORIES as readonly string[]).includes(category)) {
    contentError(
      fileName,
      "category",
      `must be one of: ${EXPERIENCE_CATEGORIES.join(", ")}.`,
    );
  }

  return category as ExperienceCategory;
}

function parseImages(
  value: Record<string, unknown>,
  fileName: string,
): ExperienceImage[] {
  const candidate = value.images;
  if (candidate === undefined || candidate === null) {
    return [];
  }
  if (!Array.isArray(candidate)) {
    contentError(fileName, "images", "must be a YAML list.");
  }

  return candidate.map((item, index) => {
    const prefix = `images[${index}]`;
    const image = asRecord(item, fileName, prefix);
    rejectUnknownFields(image, IMAGE_FIELDS, fileName, prefix);

    const src = requiredString(image, "src", fileName, `${prefix}.src`);
    if (!src.startsWith("/images/involvement/") || src.includes("..")) {
      contentError(
        fileName,
        `${prefix}.src`,
        "must be a safe local path under /images/involvement/.",
      );
    }

    const width = image.width;
    const height = image.height;
    if (!Number.isInteger(width) || (width as number) <= 0) {
      contentError(fileName, `${prefix}.width`, "must be a positive whole number.");
    }
    if (!Number.isInteger(height) || (height as number) <= 0) {
      contentError(fileName, `${prefix}.height`, "must be a positive whole number.");
    }

    return {
      src,
      alt: requiredString(image, "alt", fileName, `${prefix}.alt`),
      caption: optionalString(image, "caption", fileName, `${prefix}.caption`),
      width: width as number,
      height: height as number,
    };
  });
}

function isSupportedLinkUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseLinks(
  value: Record<string, unknown>,
  fileName: string,
): ExperienceLink[] {
  const candidate = value.links;
  if (candidate === undefined || candidate === null) {
    return [];
  }
  if (!Array.isArray(candidate)) {
    contentError(fileName, "links", "must be a YAML list.");
  }

  return candidate.map((item, index) => {
    const prefix = `links[${index}]`;
    const link = asRecord(item, fileName, prefix);
    rejectUnknownFields(link, LINK_FIELDS, fileName, prefix);

    const url = requiredString(link, "url", fileName, `${prefix}.url`);
    if (!isSupportedLinkUrl(url)) {
      contentError(
        fileName,
        `${prefix}.url`,
        "must be an http(s) URL or a safe site-root path.",
      );
    }

    return {
      label: requiredString(link, "label", fileName, `${prefix}.label`),
      url,
    };
  });
}

function parseFrontmatter(raw: string, fileName: string): Record<string, unknown> {
  const normalized = raw.replace(/^\uFEFF/u, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(normalized);

  if (!match) {
    contentError(fileName, "", "is missing a valid YAML frontmatter block.");
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unable to parse YAML.";
    contentError(fileName, "", `contains invalid YAML: ${detail}`);
  }

  return asRecord(parsed, fileName, "frontmatter");
}

function parseExperience(raw: string, fileName: string): Experience {
  const data = parseFrontmatter(raw, fileName);
  rejectUnknownFields(data, EXPERIENCE_FIELDS, fileName);

  const fileSlug = fileName.slice(0, -".mdx".length);
  const slug = requiredString(data, "slug", fileName);
  if (!SLUG_PATTERN.test(slug)) {
    contentError(
      fileName,
      "slug",
      "must contain only lowercase letters, numbers, and single hyphens.",
    );
  }
  if (slug !== fileSlug) {
    contentError(fileName, "slug", `must match the filename (${fileSlug}).`);
  }

  const date = normalizeDate(requiredString(data, "date", fileName), fileName);

  return {
    slug,
    title: requiredString(data, "title", fileName),
    category: parseCategory(data, fileName),
    date,
    dateLabel: optionalString(data, "dateLabel", fileName) ?? defaultDateLabel(date),
    role: requiredString(data, "role", fileName),
    organization: requiredString(data, "organization", fileName),
    location: optionalString(data, "location", fileName),
    summary: requiredString(data, "summary", fileName),
    contribution: requiredString(data, "contribution", fileName),
    outcome: optionalString(data, "outcome", fileName),
    featured: requiredBoolean(data, "featured", fileName),
    published: requiredBoolean(data, "published", fileName),
    order: optionalOrder(data, fileName),
    images: parseImages(data, fileName),
    links: parseLinks(data, fileName),
  };
}

function compareExperiences(a: Experience, b: Experience): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.date !== b.date) {
    return a.date > b.date ? -1 : 1;
  }
  if (a.title !== b.title) {
    return a.title < b.title ? -1 : 1;
  }
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/** Read and validate every `.mdx` entry, including unpublished drafts. */
export async function getAllExperiences(): Promise<Experience[]> {
  let directoryEntries: Dirent<string>[];

  try {
    directoryEntries = await fs.readdir(EXPERIENCES_DIR, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const fileNames = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name)
    .sort();

  const experiences: Experience[] = [];
  const slugs = new Map<string, string>();

  // Read sequentially so validation always reports the first file alphabetically.
  for (const fileName of fileNames) {
    let raw: string;
    try {
      raw = await fs.readFile(path.join(EXPERIENCES_DIR, fileName), "utf-8");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to read file.";
      throw new Error(`Unable to read experience content ${fileName}: ${detail}`);
    }

    const experience = parseExperience(raw, fileName);
    const previousFile = slugs.get(experience.slug);
    if (previousFile) {
      contentError(
        fileName,
        "slug",
        `duplicates the slug already used by ${previousFile}.`,
      );
    }
    slugs.set(experience.slug, fileName);
    experiences.push(experience);
  }

  return experiences.sort(compareExperiences);
}

/** Return all public entries, including entries not selected for the homepage. */
export async function getPublishedExperiences(): Promise<Experience[]> {
  const experiences = await getAllExperiences();
  return experiences.filter((experience) => experience.published);
}

/** Return the curated public homepage set. */
export async function getFeaturedExperiences(limit?: number): Promise<Experience[]> {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
    throw new Error("Experience limit must be a non-negative whole number.");
  }

  const experiences = await getAllExperiences();
  const featured = experiences.filter(
    (experience) => experience.published && experience.featured,
  );

  return limit === undefined ? featured : featured.slice(0, limit);
}
