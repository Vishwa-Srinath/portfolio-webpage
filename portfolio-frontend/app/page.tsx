import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { BioStrip } from "@/components/home/BioStrip";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { ExperienceShowcase } from "@/components/home/ExperienceShowcase";
import { getAllContentByType, sortByDate, filterFeatured } from "@/lib/content";
import { getFeaturedExperiences } from "@/lib/experiences";

export const metadata: Metadata = {
  title: "Vishwa Srinath — CS&E Undergraduate",
  description:
    "CS&E undergraduate at the University of Moratuwa exploring database systems, data science, AI, mathematics, and FPGA design.",
  openGraph: {
    title: "Vishwa Srinath — CS&E Undergraduate",
    description:
      "CS&E undergraduate at the University of Moratuwa exploring database systems, data science, AI, mathematics, and FPGA design.",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
  },
};

export default async function HomePage() {
  const [projects, experiences] = await Promise.all([
    getAllContentByType("projects"),
    getFeaturedExperiences(6),
  ]);
  const featured = sortByDate(filterFeatured(projects), "desc").slice(0, 3);

  return (
    <>
      <Hero />
      <BioStrip />
      <FeaturedProjects projects={featured} />
      <ExperienceShowcase experiences={experiences} />
    </>
  );
}
