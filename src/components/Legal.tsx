import { contactEmail } from "@/server/config";
import Link from "next/link";
import type { ReactNode } from "react";

/** Shared frame for the privacy policy and terms: one readable column, sections with anchors. */

export const LEGAL_UPDATED = "20 October 2026";

export const REPO_URL = "https://github.com/vasu-the-sharma/backpressure";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-10 pt-6 sm:pt-10">
        <h1 className="display text-4xl text-fg sm:text-5xl">{title}</h1>
        <p className="mt-3 text-xs text-fg-3">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-6 text-base leading-relaxed text-fg-2">{intro}</div>
      </header>
      <div className="space-y-10">{children}</div>
    </article>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <h2 id={`${id}-title`} className="text-base font-medium text-fg">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg-2">{children}</div>
    </section>
  );
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-fg-3">{children}</ul>;
}

const linkClass =
  "focus-ring rounded-sm text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg";

/** A link inside legal text: in-site paths use client navigation, others open normally. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  return href.startsWith("/") ? (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  ) : (
    <a href={href} className={linkClass} rel="noreferrer">
      {children}
    </a>
  );
}

/** How to reach us: CONTACT_EMAIL when it's set, otherwise a GitHub issue asking for a private address. */
export function ContactLine() {
  const email = contactEmail();
  return email ? (
    <p>
      Email <A href={`mailto:${email}`}>{email}</A>.
    </p>
  ) : (
    <p>
      Open an issue on <A href={`${REPO_URL}/issues`}>GitHub</A> asking for a private contact
      address, and leave personal details out of the issue itself.
    </p>
  );
}
