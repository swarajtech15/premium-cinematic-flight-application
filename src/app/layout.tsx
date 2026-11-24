import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { INTRO_BOOTSTRAP } from "@/lib/cinematic-entry";
import { THEME_BOOTSTRAP } from "@/lib/demo-profile";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Airlines — Have your journey starting here",
  description:
    "A luxury flight booking experience. Search flights, compare fares, choose your seat and travel beautifully.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }} />
      </head>
      <body className="min-h-screen bg-cream-100 text-ink-900 antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
