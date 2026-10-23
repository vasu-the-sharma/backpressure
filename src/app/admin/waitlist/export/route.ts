import { auth } from "@/auth";
import { quotedPrice } from "@/content/pricing/plans";
import { getDb } from "@/db";
import { toCsv } from "@/lib/csv";
import { isAuthConfigured } from "@/server/config";
import { waitlistEntries } from "@/server/daily";

export const dynamic = "force-dynamic";

/** The whole waitlist as CSV, for admins. Anyone else gets a 404, like the admin pages. */
export async function GET() {
  const session = isAuthConfigured() ? await auth() : null;
  if (session?.user?.role !== "admin") return new Response("Not found", { status: 404 });

  const rows = await waitlistEntries(getDb());
  const csv = toCsv(
    ["email", "plan", "source", "price_shown", "price_variant", "period", "joined_at"],
    rows.map((r) => [
      r.email,
      r.plan,
      r.source,
      quotedPrice(r.priceVariant, r.priceCents),
      r.priceVariant,
      r.period,
      r.createdAt,
    ]),
  );
  const day = new Date().toISOString().slice(0, 10);
  // The byte-order mark tells Excel the file is UTF-8, so ₹ survives.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="backpressure-waitlist-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
