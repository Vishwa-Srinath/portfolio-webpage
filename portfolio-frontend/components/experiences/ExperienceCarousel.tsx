"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type {
  Experience,
  ExperienceCategory,
  ExperienceImage,
} from "@/lib/experiences";

const ROTATION_INTERVAL_MS = 8_000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const categoryLabels: Record<ExperienceCategory, string> = {
  leadership: "Leadership & Service",
  organizing: "Event Organizing",
  competition: "Competitions & Recognition",
  learning: "Research & Learning",
};

const categoryOrder: ExperienceCategory[] = [
  "leadership",
  "organizing",
  "competition",
  "learning",
];

type CategoryFilter = "all" | ExperienceCategory;

interface CarouselPosition {
  experienceIndex: number;
  imageIndex: number;
}

interface Props {
  experiences: Experience[];
}

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeToPageVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getPageVisibilitySnapshot() {
  return document.visibilityState === "visible";
}

function getPageVisibilityServerSnapshot() {
  return true;
}

export function ExperienceCarousel({ experiences }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [position, setPosition] = useState<CarouselPosition>({
    experienceIndex: 0,
    imageIndex: 0,
  });
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const pageIsVisible = useSyncExternalStore(
    subscribeToPageVisibility,
    getPageVisibilitySnapshot,
    getPageVisibilityServerSnapshot
  );

  const availableCategories = useMemo(
    () => categoryOrder.filter((category) => experiences.some((item) => item.category === category)),
    [experiences]
  );

  const filteredExperiences = useMemo(
    () =>
      selectedCategory === "all"
        ? experiences
        : experiences.filter((item) => item.category === selectedCategory),
    [experiences, selectedCategory]
  );

  const activeExperience =
    filteredExperiences[position.experienceIndex] ?? filteredExperiences[0];
  const activeImage: ExperienceImage | null =
    activeExperience?.images[position.imageIndex] ?? null;
  const totalFrames = filteredExperiences.reduce(
    (total, experience) => total + Math.max(experience.images.length, 1),
    0
  );
  const canNavigateExperiences = filteredExperiences.length > 1;
  const canAutoRotate = totalFrames > 1;
  const isActivelyRotating =
    canAutoRotate && rotationEnabled && !isHovered && !prefersReducedMotion && pageIsVisible;

  useEffect(() => {
    if (!isActivelyRotating) return;

    const timer = window.setInterval(() => {
      setPosition((current) => {
        const currentExperience =
          filteredExperiences[current.experienceIndex] ?? filteredExperiences[0];
        if (!currentExperience) return current;

        const imageCount = Math.max(currentExperience.images.length, 1);
        if (current.imageIndex + 1 < imageCount) {
          return { ...current, imageIndex: current.imageIndex + 1 };
        }

        return {
          experienceIndex: (current.experienceIndex + 1) % filteredExperiences.length,
          imageIndex: 0,
        };
      });
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [filteredExperiences, isActivelyRotating]);

  if (!activeExperience) return null;

  const categoryLabel = categoryLabels[activeExperience.category];
  const slidePosition = `${String(position.experienceIndex + 1).padStart(2, "0")} / ${String(
    filteredExperiences.length
  ).padStart(2, "0")}`;

  function chooseCategory(category: CategoryFilter) {
    setSelectedCategory(category);
    setPosition({ experienceIndex: 0, imageIndex: 0 });
    setRotationEnabled(false);
  }

  function goToExperience(index: number) {
    setPosition({ experienceIndex: index, imageIndex: 0 });
    setRotationEnabled(false);
  }

  function goToImage(index: number) {
    setPosition((current) => ({ ...current, imageIndex: index }));
    setRotationEnabled(false);
  }

  function showPrevious() {
    goToExperience(
      (position.experienceIndex - 1 + filteredExperiences.length) %
        filteredExperiences.length
    );
  }

  function showNext() {
    goToExperience((position.experienceIndex + 1) % filteredExperiences.length);
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Leadership and involvement highlights"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setRotationEnabled(false)}
    >
      {availableCategories.length > 1 && (
        <div
          role="group"
          aria-label="Filter involvement highlights"
          className="mb-5 flex gap-2 overflow-x-auto pb-1"
        >
          <FilterButton
            label="All"
            selected={selectedCategory === "all"}
            onClick={() => chooseCategory("all")}
          />
          {availableCategories.map((category) => (
            <FilterButton
              key={category}
              label={categoryLabels[category]}
              selected={selectedCategory === category}
              onClick={() => chooseCategory(category)}
            />
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
        <article
          key={activeExperience.slug}
          role="group"
          aria-roledescription="slide"
          aria-label={`${activeExperience.title}, ${position.experienceIndex + 1} of ${
            filteredExperiences.length
          }`}
          className="involvement-slide-enter grid lg:min-h-[30rem] lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]"
        >
          <figure className="flex min-w-0 flex-col border-b border-[var(--border)] bg-[var(--bg-elevated)] lg:border-b-0 lg:border-r">
            <div className="relative aspect-[16/10] min-h-0 lg:flex-1 lg:aspect-auto lg:min-h-[30rem]">
              {activeImage ? (
                <Image
                  key={`${activeExperience.slug}-${position.imageIndex}`}
                  src={activeImage.src}
                  alt={activeImage.alt}
                  width={activeImage.width}
                  height={activeImage.height}
                  sizes="(max-width: 1023px) calc(100vw - 2rem), 590px"
                  className="involvement-slide-enter absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-full min-h-[18rem] items-center justify-center p-8"
                >
                  <div className="text-center">
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-violet)]">
                      {categoryLabel}
                    </span>
                    <span className="mx-auto mt-5 block h-px w-16 bg-[var(--border)]" />
                  </div>
                </div>
              )}
            </div>
            {activeImage?.caption && (
              <figcaption className="border-t border-[var(--border)] px-4 py-3 text-xs leading-relaxed text-[var(--fg-muted)]">
                {activeImage.caption}
              </figcaption>
            )}
            {activeExperience.images.length > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-1.5">
                <span
                  aria-live={isActivelyRotating ? "off" : "polite"}
                  aria-atomic="true"
                  className="shrink-0 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[var(--fg-muted)]"
                >
                  Photo {position.imageIndex + 1} / {activeExperience.images.length}
                </span>
                <div
                  role="group"
                  aria-label={`Choose a photo for ${activeExperience.title}`}
                  className="flex min-w-0 items-center justify-end overflow-x-auto"
                >
                  {activeExperience.images.map((item, index) => (
                    <button
                      key={item.src}
                      type="button"
                      onClick={() => goToImage(index)}
                      aria-label={`Show photo ${index + 1} of ${activeExperience.images.length}`}
                      aria-current={index === position.imageIndex ? "true" : undefined}
                      className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 rounded-full transition-all ${
                          index === position.imageIndex
                            ? "w-5 bg-[var(--accent-cyan)]"
                            : "w-1.5 bg-[var(--border)]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </figure>

          <div className="flex min-w-0 flex-col p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
              {categoryLabel} ·{" "}
              <time dateTime={activeExperience.date}>{activeExperience.dateLabel}</time>
            </p>
            <h3 className="mt-3 text-2xl font-bold leading-tight text-[var(--fg)]">
              {activeExperience.title}
            </h3>

            <p className="mt-3 text-sm font-medium text-[var(--fg)]">
              {activeExperience.role} · {activeExperience.organization}
            </p>
            {activeExperience.location && (
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{activeExperience.location}</p>
            )}

            <p className="mt-6 text-sm leading-7 text-[var(--fg-muted)]">
              {activeExperience.summary}
            </p>

            <div className="mt-5 border-l-2 border-[var(--accent-violet)] pl-4">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                Contribution
              </p>
              <p className="mt-1.5 text-sm leading-6 text-[var(--fg)]">
                {activeExperience.contribution}
              </p>
            </div>

            {activeExperience.outcome && (
              <div className="mt-5">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                  Outcome
                </p>
                <p className="mt-1.5 text-sm leading-6 text-[var(--fg)]">
                  {activeExperience.outcome}
                </p>
              </div>
            )}

            {activeExperience.links.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-7">
                {activeExperience.links.map((link) => {
                  const isExternal = /^https?:\/\//u.test(link.url);
                  return (
                    <a
                      key={`${link.label}-${link.url}`}
                      href={link.url}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noreferrer" : undefined}
                      className="focus-ring inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-cyan)] hover:underline"
                    >
                      {link.label}
                      {isExternal && (
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        {canAutoRotate && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 sm:px-5">
            {prefersReducedMotion ? (
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                Manual navigation
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setRotationEnabled((current) => !current)}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                aria-label={rotationEnabled ? "Pause automatic rotation" : "Start automatic rotation"}
              >
                {rotationEnabled ? (
                  <Pause aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <Play aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                {rotationEnabled ? "Pause" : "Play"}
              </button>
            )}

            <div className="flex items-center gap-1">
              {canNavigateExperiences && (
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label="Show previous involvement highlight"
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
              <span
                aria-live={isActivelyRotating ? "off" : "polite"}
                aria-atomic="true"
                className="min-w-16 text-center font-mono text-xs text-[var(--fg-muted)]"
              >
                {slidePosition}
                <span className="sr-only">: {activeExperience.title}</span>
              </span>
              {canNavigateExperiences && (
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Show next involvement highlight"
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>

            {canNavigateExperiences && (
              <div className="order-3 flex w-full items-center justify-center sm:order-none sm:w-auto">
                {filteredExperiences.map((item, index) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => goToExperience(index)}
                    aria-label={`Show ${item.title}`}
                    aria-current={index === position.experienceIndex ? "true" : undefined}
                    className="focus-ring group flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 rounded-full transition-all duration-200 ${
                        index === position.experienceIndex
                          ? "w-5 bg-[var(--accent-cyan)]"
                          : "w-2 bg-[var(--border)] group-hover:bg-[var(--fg-muted)]"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function FilterButton({ label, selected, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`focus-ring shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        selected
          ? "border-[var(--accent-cyan)] bg-[var(--bg)] text-[var(--accent-cyan)]"
          : "border-transparent text-[var(--fg-muted)] hover:border-[var(--border)] hover:bg-[var(--bg)] hover:text-[var(--fg)]"
      }`}
    >
      {label}
    </button>
  );
}
