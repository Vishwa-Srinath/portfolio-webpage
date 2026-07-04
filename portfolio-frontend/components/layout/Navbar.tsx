"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";

export function Navbar(): React.ReactNode {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight transition-colors hover:text-[var(--accent-cyan)]"
        >
          VS<span className="text-[var(--accent-cyan)]">.</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex" ref={dropdownRef}>
          {navigation.map((item) =>
            item.children ? (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                    pathname.startsWith("/content") || pathname.startsWith("/learn") || pathname.startsWith("/stories") || pathname.startsWith("/notes")
                      ? "bg-[var(--bg-elevated)] text-[var(--fg)]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                  )}
                >
                  {item.label}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      openDropdown === item.label ? "rotate-180" : ""
                    )}
                  />
                </button>

                {openDropdown === item.label && (
                  <div className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2 shadow-xl">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
                        onClick={() => setOpenDropdown(null)}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: child.accent }}
                        >
                          {child.label}
                        </span>
                        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                          {child.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "bg-[var(--bg-elevated)] text-[var(--fg)]"
                    : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MobileNav />
        </div>
      </nav>
    </header>
  );
}
