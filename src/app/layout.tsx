import { Logo, LogoMark } from "@/components/Logo";
import { liveVerticals } from "@/content/verticals";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-edge bg-ink/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
              <Link
                href="/"
                aria-label="Backpressure home"
                className="rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]"
              >
                <Logo responsive />
              </Link>
              <div className="flex items-center gap-5">
                <nav className="flex items-center gap-4 text-sm">
                  {liveVerticals.map((v) => (
                    <Link
                      key={v.slug}
                      href={v.href}
                      className="text-fg-muted transition-colors hover:text-fg"
                    >
                      {v.name}
                    </Link>
                  ))}
                </nav>
                <span className="badge badge-dot hidden sm:inline-flex">teaching model</span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
            {children}
          </main>

          <footer className="border-t border-edge">
            <div className="mx-auto flex max-w-5xl flex-col justify-between gap-5 px-4 py-9 text-sm text-fg-subtle sm:flex-row sm:items-center sm:px-6">
              <div className="flex items-center gap-2.5">
                <LogoMark size={22} id="bp-footer" />
                <span className="font-display font-semibold text-fg">Backpressure</span>
              </div>
              <p className="max-w-md leading-relaxed">
                A teaching model of how systems behave under load. Numbers come from a simplified
                simulator — directionally honest, not production telemetry.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
