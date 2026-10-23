import { SetupNotice } from "@/components/SetupNotice";
import { WaitlistMailer } from "@/components/admin/WaitlistMailer";
import { Breadcrumbs } from "@/components/ui";
import { quotedPrice } from "@/content/pricing/plans";
import { getDb } from "@/db";
import { timeAgo } from "@/lib/format";
import { isEmailConfigured } from "@/server/config";
import { waitlistCounts, waitlistEntries } from "@/server/daily";
import { isAuthConfigured, requireAdmin } from "@/server/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Waitlist", robots: { index: false } };
export const dynamic = "force-dynamic";

const SHOWN = 100;

/** Everyone waiting for a paid plan, the price each was shown, and a way to write to them. */
export default async function AdminWaitlistPage() {
  if (!isAuthConfigured()) return <SetupNotice />;
  await requireAdmin("/admin/waitlist");
  const db = getDb();
  const [counts, entries] = await Promise.all([waitlistCounts(db), waitlistEntries(db)]);
  const latest = entries.slice(-SHOWN).reverse();
  const planCounts = { pro: counts.pro ?? 0, teams: counts.teams ?? 0 };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Waitlist" }]} />
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Waitlist</h1>
          <p className="mt-1 text-xs text-fg-3">
            <span className="tnum text-fg">{planCounts.pro}</span> waiting for Pro ·{" "}
            <span className="tnum text-fg">{planCounts.teams}</span> for Teams
          </p>
        </div>
        {/* A file download, so a plain link rather than client-side navigation. */}
        <a href="/admin/waitlist/export" download className="btn btn-secondary btn-sm self-start">
          Download CSV
        </a>
      </header>

      <WaitlistMailer counts={planCounts} ready={isEmailConfigured()} />

      <section aria-labelledby="people" className="mt-8">
        <h2 id="people" className="text-base font-medium text-fg">
          Latest sign-ups
        </h2>
        {latest.length === 0 ? (
          <p className="panel mt-3 px-4 py-10 text-center text-sm text-fg-3">No one yet.</p>
        ) : (
          <div className="panel mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-xs text-fg-3">
                  <th scope="col" className="px-4 py-2.5 font-normal">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-normal">
                    Plan
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-normal">
                    From
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-normal">
                    Price shown
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-normal">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {latest.map((w) => (
                  <tr key={`${w.email}-${w.plan}`}>
                    <td className="px-4 py-2 text-fg">{w.email}</td>
                    <td className="px-4 py-2 text-xs text-fg-2">
                      {w.plan === "pro" ? "Pro" : "Teams"}
                    </td>
                    <td className="px-4 py-2 text-xs text-fg-3">{w.source}</td>
                    <td className="tnum px-4 py-2 text-xs text-fg-2">
                      {quotedPrice(w.priceVariant, w.priceCents) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-fg-3">
                      {timeAgo(w.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {entries.length > SHOWN && (
          <p className="mt-2 text-xs text-fg-3">
            Showing the latest {SHOWN}. The CSV has all{" "}
            <span className="tnum">{entries.length.toLocaleString("en-US")}</span>.
          </p>
        )}
      </section>
    </div>
  );
}
