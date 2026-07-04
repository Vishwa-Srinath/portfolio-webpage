"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Menu, ChevronDown } from "lucide-react";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/cn";

export function MobileNav(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset accordion when drawer closes
  const closeDrawer = () => {
    setIsOpen(false);
    setOpenSection(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-elevated)] md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-72 transform bg-[var(--bg)] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <span className="text-lg font-bold">
            VS<span className="text-[var(--accent-cyan)]">.</span>
          </span>
          <button
            onClick={closeDrawer}
            className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-elevated)]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) =>
            item.children ? (
              <div key={item.href}>
                <button
                  onClick={() => setOpenSection(openSection === item.label ? null : item.label)}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  {item.label}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--fg-muted)] transition-transform duration-200",
                      openSection === item.label ? "rotate-180" : ""
                    )}
                  />
                </button>
                {openSection === item.label && (
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg px-4 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
                      >
                        <span className="text-sm font-medium" style={{ color: child.accent }}>
                          {child.label}
                        </span>
                        <p className="text-xs text-[var(--fg-muted)]">{child.description}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
                <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                className="rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[var(--bg-elevated)]"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </>
  );
}
