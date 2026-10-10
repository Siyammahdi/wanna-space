import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";

import { MotionPreference } from "@/components/theme/motion-preference";
import { site } from "@/config/site";
import { timeZoneScript } from "@/lib/dates";
import { devicePrefsInitScript } from "@/lib/settings";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#171b17" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript + devicePrefsInitScript + timeZoneScript,
          }}
        />
      </head>
      {/* Browser extensions (e.g. Grammarly) inject attributes on <body>. */}
      <body className="min-h-full bg-canvas text-ink" suppressHydrationWarning>
        <MotionPreference>{children}</MotionPreference>
      </body>
    </html>
  );
}
