export interface Project {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  coverImage: string;
  liveUrl?: string;
  repoUrl?: string;
  featured: boolean;
}

export interface Article {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  coverImage?: string;
}

// Alias these across lanes (they're structurally identical)
export type Story = Article;
export type Note = Article;
