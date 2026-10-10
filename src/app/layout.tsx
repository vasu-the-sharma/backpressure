import { Logo } from "@/components/Logo";
import { SiteNav } from "@/components/SiteNav";
import { liveVerticals } from "@/content/verticals";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Inter's optical-size axis switches to its tighter display cut at large sizes.
const sans = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-inter",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Backpressure — see systems behave under load",
    template: "%s · Backpressure",
  },
  description:
    "Interactive, honest models of how large-scale systems behave under load. Send traffic, break a node, scale it, and watch the bottleneck move.",
  applicationName: "Backpressure",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <head>
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
            <Link
              href="/"
              aria-label="Backpressure home"
              className="focus-ring -mx-1.5 rounded-md px-1.5 py-1 transition-opacity duration-150 ease-out hover:opacity-80"
            >
              <Logo compact />
            </Link>
            <SiteNav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-3 text-xs leading-relaxed text-fg-3">
                Break it here, not in production.
              </p>
            </div>
            <nav aria-label="Footer">
              <p className="text-xs font-medium text-fg">Product</p>
              <ul className="mt-3 space-y-2">
                {liveVerticals.map((v) => (
                  <li key={v.slug}>
                    <Link
                      href={v.href}
                      className="focus-ring rounded-sm text-xs text-fg-3 transition-colors duration-150 ease-out hover:text-fg"
                    >
                      {v.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
