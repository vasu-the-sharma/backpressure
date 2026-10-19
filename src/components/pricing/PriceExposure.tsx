"use client";

import { useEffect } from "react";

/**
 * Tells the price test this page showed a Pro price, once it has rendered in
 * a real browser. Fire-and-forget; the server ignores repeats within a day.
 */
export function PriceExposure({ page }: { page: "pricing" | "daily-archive" }) {
  useEffect(() => {
    fetch("/api/pricing/exposure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page }),
      keepalive: true,
    }).catch(() => {});
  }, [page]);
  return null;
}
