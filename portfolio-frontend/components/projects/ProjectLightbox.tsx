"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxItem {
  src: string;
  alt: string;
  caption?: string;
  type?: "image" | "video";
}

interface Props {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ProjectLightbox({ items, index, onClose, onNavigate }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const current = items[index];

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < items.length - 1) onNavigate(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    },
    [index, items.length, onClose, onNavigate]
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [handleKey]);

  if (!current) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Project media viewer"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/95 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="Close media viewer"
        onClick={onClose}
        className="focus-ring absolute right-4 top-4 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-[var(--fg)] transition-colors hover:text-[var(--accent-cyan)] sm:right-5 sm:top-5"
      >
        <X className="h-5 w-5" />
      </button>

      {index > 0 && (
        <button
          type="button"
          aria-label="Previous project image"
          onClick={() => onNavigate(index - 1)}
          className="focus-ring absolute bottom-4 left-[calc(50%-3rem)] rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-[var(--fg)] transition-colors hover:text-[var(--accent-cyan)] sm:bottom-auto sm:left-4"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          aria-label="Next project image"
          onClick={() => onNavigate(index + 1)}
          className="focus-ring absolute bottom-4 right-[calc(50%-3rem)] rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-[var(--fg)] transition-colors hover:text-[var(--accent-cyan)] sm:bottom-auto sm:right-4"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="max-h-[86vh] max-w-[90vw]">
        {current.type === "video" ? (
          <video
            src={current.src}
            controls
            autoPlay
            className="max-h-[78vh] max-w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
          >
            Your browser does not support this project video.
          </video>
        ) : (
          <Image
            src={current.src}
            alt={current.alt}
            width={1600}
            height={1000}
            sizes="90vw"
            className="h-auto max-h-[78vh] w-auto max-w-full rounded-xl object-contain"
          />
        )}
        {current.caption && (
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-[var(--fg-muted)]">
            {current.caption}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
