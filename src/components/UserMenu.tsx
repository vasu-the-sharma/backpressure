"use client";

import { useAuthEnabled } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Header control: "Sign in" when signed out, an account menu when signed in. */
export function UserMenu() {
  const enabled = useAuthEnabled();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click, Escape, or navigation.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: close whenever the route changes
  useEffect(() => setOpen(false), [pathname]);

  if (!enabled) return null;
  if (status === "loading") return <span className="skeleton h-7 w-16" aria-hidden />;

  if (!session?.user) {
    const back = pathname === "/signin" ? "/account" : pathname;
    return (
      <Link
        href={`/signin?callbackUrl=${encodeURIComponent(back)}`}
        className="btn btn-secondary btn-sm"
      >
        Sign in
      </Link>
    );
  }

  const { user } = session;
  const item =
    "focus-ring block rounded-md px-2.5 py-1.5 text-sm text-fg-2 transition-colors duration-150 ease-out hover:bg-fill hover:text-fg";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="focus-ring flex items-center rounded-full transition-opacity duration-150 ease-out hover:opacity-85"
      >
        <Avatar name={user.name} email={user.email} image={user.image} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-60 rounded-lg border border-line-strong bg-surface-2 p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]"
        >
          <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm text-fg">{user.name ?? "Signed in"}</p>
            <p className="truncate text-xs text-fg-3">{user.email}</p>
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" href="/account" className={item}>
              Your progress
            </Link>
            {user.role === "admin" && (
              <Link role="menuitem" href="/admin" className={item}>
                Admin
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              onClick={() => signOut({ redirectTo: "/" })}
              className={`${item} w-full text-left`}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
