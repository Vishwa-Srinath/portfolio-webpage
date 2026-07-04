export interface LaneConfig {
  key: "projects" | "learn" | "stories" | "notes";
  label: string;
  description: string;
  accent: string;
  accentVar: string;
  icon: string;
  href: string;
}

export const lanes: LaneConfig[] = [
  {
    key: "projects",
    label: "Projects",
    description: "Full-stack systems, agentic AI, FPGA work.",
    accent: "accent-cyan",
    accentVar: "var(--accent-cyan)",
    icon: "🚀",
    href: "/projects",
  },
  {
    key: "learn",
    label: "Learn",
    description: "Algorithms, data structures, and deep dives.",
    accent: "accent-violet",
    accentVar: "var(--accent-violet)",
    icon: "📚",
    href: "/learn",
  },
  {
    key: "stories",
    label: "Stories",
    description: "Episodes from the engineering journey.",
    accent: "accent-amber",
    accentVar: "var(--accent-amber)",
    icon: "✍️",
    href: "/stories",
  },
  {
    key: "notes",
    label: "Notes",
    description: "Quick thoughts, music, and random finds.",
    accent: "accent-rose",
    accentVar: "var(--accent-rose)",
    icon: "📝",
    href: "/notes",
  },
];

export function getLaneByKey(key: string): LaneConfig | undefined {
  return lanes.find((l) => l.key === key);
}
