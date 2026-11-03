import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "MediaMatrix — Discover your next story", template: "%s · MediaMatrix" },
  description: "Independent movie and TV discovery, official streaming availability, authorized playback, and personal media management.",
  applicationName: "MediaMatrix",
  keywords: ["movies", "TV series", "streaming availability", "watchlist", "live TV"],
  openGraph: {
    title: "MediaMatrix",
    description: "Discover what to watch and where to watch it.",
    type: "website",
    siteName: "MediaMatrix",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080A0D",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <SessionProvider>
          <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition focus:translate-y-0">Skip to content</a>
          <SiteHeader />
          <main id="main-content" className="min-h-[75vh] pb-24 md:pb-0">{children}</main>
          <SiteFooter />
          <MobileBottomNav />
        </SessionProvider>
      </body>
    </html>
  );
}
