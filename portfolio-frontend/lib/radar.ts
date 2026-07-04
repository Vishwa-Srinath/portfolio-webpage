import fs from "fs/promises";
import path from "path";

export interface RadarEntry {
  id: string;
  date: string;
  title: string;
  category: string;
  status: "watching" | "trying" | "adopted" | "dropped";
  summary: string;
  link?: string;
}

const RADAR_FILE = path.join(process.cwd(), "content", "radar", "entries.json");

export async function getAllRadarEntries(): Promise<RadarEntry[]> {
  try {
    const raw = await fs.readFile(RADAR_FILE, "utf-8");
    const entries: RadarEntry[] = JSON.parse(raw);
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export async function getLatestRadarEntries(count: number): Promise<RadarEntry[]> {
  const all = await getAllRadarEntries();
  return all.slice(0, count);
}
