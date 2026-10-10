"use client";

import { liveVerticals } from "@/content/verticals";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Top-level navigation. Rendered from the verticals registry; marks the current section. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {liveVerticals.map((v) => {
        const active = pathname === v.href || pathname.startsWith(`${v.href}/`);
        return (
          <Link
            key={v.slug}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ease-out ${
              active
                ? "bg-fill font-medium text-fg"
                : "text-fg-2 hover:bg-fill hover:text-fg active:bg-fill-2"
            }`}
          >
            {v.name}
          </Link>
        );
      })}
    </nav>
  );
}
