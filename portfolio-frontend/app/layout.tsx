import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SkipToContent } from "@/components/shared/SkipToContent";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vishwa Srinath — Full-Stack Engineer",
    template: "%s — Vishwa Srinath",
  },
  description:
    "Full-stack engineer building systems that matter. Projects, technical writing, and engineering stories.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vishwasrinath.com"),
  openGraph: {
    title: "Vishwa Srinath — Full-Stack Engineer",
    description: "Full-stack engineer building systems that matter.",
    url: "/",
    siteName: "Vishwa Srinath",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[var(--bg)] font-sans text-[var(--fg)] antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SkipToContent />
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
