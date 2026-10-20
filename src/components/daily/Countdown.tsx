"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const two = (n: number) => String(n).padStart(2, "0");

/** Time left until `to` (ms since epoch), ticking; refreshes the page when it arrives. */
export function Countdown({ to }: { to: number }) {
  const router = useRouter();
  // Rendered only after mount, so the server's clock never mismatches the client's.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? null : Math.max(0, to - now);
  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  if (left === null) return <span className="tnum">--:--:--</span>;
  const s = Math.floor(left / 1000);
  return (
    <span className="tnum" suppressHydrationWarning>
      {two(Math.floor(s / 3600))}:{two(Math.floor((s % 3600) / 60))}:{two(s % 60)}
    </span>
  );
}
