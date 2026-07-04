import type { NextConfig } from "next";

const config: NextConfig = {
  eslint: {
    dirs: ["app", "components", "lib"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  redirects: async () => [
    {
      source: "/resume",
      destination: "/resume.pdf",
      permanent: false,
    },
  ],
};

export default config;
