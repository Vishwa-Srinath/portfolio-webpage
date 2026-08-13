import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  redirects: async () =>
    ["/resume", "/resume.pdf"].map((source) => ({
      source,
      destination: "/documents/Vishwa_Srinath_CV.pdf",
      permanent: false,
    })),
};

export default config;
