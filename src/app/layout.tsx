import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "System Design Lab",
    template: "%s | System Design Lab",
  },
  description:
    "Interactive, honest models of how large-scale systems behave under load. Send traffic, break a node, scale it, and watch the bottleneck move.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-[var(--color-edge)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              System Design Lab
            </Link>
            <span className="text-xs text-slate-500">teaching model, not production telemetry</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
