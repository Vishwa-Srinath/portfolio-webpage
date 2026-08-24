import type { CSSProperties } from "react";
import type { TechStackItem } from "@/lib/content";

const categoryColor: Partial<Record<TechStackItem["category"], string>> = {
  ai: "var(--accent-violet)",
  frontend: "var(--accent-cyan)",
  infra: "var(--accent-amber)",
  hardware: "var(--accent-rose)",
};

interface Props {
  tech: TechStackItem;
}

export function TechStackChip({ tech }: Props) {
  const color = categoryColor[tech.category] ?? "var(--fg-muted)";
  const style: CSSProperties = {
    color,
    borderColor: `color-mix(in srgb, ${color} 38%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${color} 9%, transparent)`,
  };

  return (
    <span
      title={tech.note}
      className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={style}
    >
      {tech.name}
    </span>
  );
}
