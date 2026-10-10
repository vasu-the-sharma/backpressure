import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared layout primitives. They encode the type scale so pages cannot drift:
 *   page title  text-2xl font-semibold tracking-tight
 *   section     text-base font-medium
 *   body        text-sm text-fg-2 leading-relaxed
 *   meta        text-xs text-fg-3
 */

export function PageHeader({
  title,
  description,
  meta,
  actions,
  display = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Index pages open with display type; detail pages keep the compact title. */
  display?: boolean;
}) {
  return (
    <header
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
        display ? "mb-10 pt-6 sm:pt-10" : "mb-8"
      }`}
    >
      <div className="min-w-0">
        <h1
          className={
            display
              ? "display rise-in text-4xl text-fg sm:text-6xl"
              : "text-2xl font-semibold tracking-tight text-fg"
          }
        >
          {title}
        </h1>
        {meta && <div className="mt-1 text-xs text-fg-3">{meta}</div>}
        {description && (
          <p
            className={`max-w-2xl leading-relaxed text-fg-2 ${
              display ? "rise-in mt-4 text-base" : "mt-2 text-sm"
            }`}
            style={display ? { animationDelay: "80ms" } : undefined}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  aside,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-medium text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-fg-2">{description}</p>}
      </div>
      {aside && <div className="shrink-0 text-xs text-fg-3">{aside}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-fg-3">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-fg-4" />}
            {item.href ? (
              <Link
                href={item.href}
                className="focus-ring rounded-sm transition-colors duration-150 ease-out hover:text-fg"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ChevronRight({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

export function CheckGlyph({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m3 8.5 3 3 7-7" />
    </svg>
  );
}

export function CrossGlyph({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
