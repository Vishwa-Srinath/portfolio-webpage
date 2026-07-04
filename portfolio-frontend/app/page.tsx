import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { BioStrip } from "@/components/home/BioStrip";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { LaneTeasers } from "@/components/home/LaneTeasers";
import { getAllContentByType, sortByDate, filterFeatured } from "@/lib/content";

export const metadata: Metadata = {
  title: "Vishwa Srinath — CS&E Undergraduate",
  description:
    "CS&E undergraduate at University of Moratuwa building agentic AI systems, DSA content, and FPGA projects.",
  openGraph: {
    title: "Vishwa Srinath — CS&E Undergraduate",
    description: "CS&E undergraduate at University of Moratuwa building agentic AI systems, DSA content, and FPGA projects.",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
  },
};

export default async function HomePage() {
  const projects = await getAllContentByType("projects");
  const featured = sortByDate(filterFeatured(projects), "desc").slice(0, 3);

  return (
    <>
      <Hero />
      <BioStrip />
      <FeaturedProjects projects={featured} />
      <LaneTeasers />
    </>
  );
}
