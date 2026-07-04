import { lanes } from "./lanes";

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; accent: string; description: string }[];
}

export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Tech Radar", href: "/radar" },
  {
    label: "Content",
    href: "/content",
    children: lanes
      .filter((l) => ["learn", "stories", "notes"].includes(l.key))
      .map((l) => ({
        label: l.label,
        href: l.href,
        accent: l.accentVar, // CSS var string like "var(--accent-violet)"
        description:
          l.key === "learn"
            ? "DSA & algorithms, companion to the YouTube series"
            : l.key === "stories"
            ? "Behind the Bit — computing history"
            : "Life, music, and informal notes",
      })),
  },
  { label: "Connect", href: "/contact" },
];
