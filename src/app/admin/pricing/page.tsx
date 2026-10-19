import { SetupNotice } from "@/components/SetupNotice";
import { PriceTestSegment } from "@/components/pricing/PriceTestResults";
import { Breadcrumbs } from "@/components/ui";
import { visitorsPerArm } from "@/content/pricing/analysis";
import type { Currency, Segment } from "@/content/pricing/plans";
import { getDb } from "@/db";
import { pricingResults } from "@/server/pricing";
import { isAuthConfigured, requireAdmin } from "@/server/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Price test", robots: { index: false } };
export const dynamic = "force-dynamic";

const SEGMENTS: Array<{ id: Segment; label: string; currency: Currency }> = [
  { id: "intl", label: "International (USD)", currency: "USD" },
  { id: "in", label: "India (INR)", currency: "INR" },
];

/**
 * Results of the live Pro price test: join rate per arm with a 95% interval,
 * and the Van Westendorp read of what people say the price should be.
 */
export default async function AdminPricingPage() {
  if (!isAuthConfigured()) return <SetupNotice />;
  await requireAdmin("/admin/pricing");
  const results = await pricingResults(getDb());
  const needed = visitorsPerArm(0.04, 0.025);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Price test" }]} />
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Price test</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-2">
          Each visitor to Pricing or the daily archive sees one Pro price, chosen at random and
          kept. Joining the waitlist at that price is the signal; after joining, people answer four
          questions about what price feels right.
        </p>
      </header>

      <div className="space-y-6">
        {SEGMENTS.map((s) => (
          <PriceTestSegment
            key={s.id}
            label={s.label}
            currency={s.currency}
            result={results[s.id]}
          />
        ))}
      </div>

      <section className="panel mt-6 p-5 text-sm leading-relaxed text-fg-2">
        <h2 className="text-base font-medium text-fg">Reading it</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Below about 300 visitors an arm, treat differences as noise. Telling a 4% join rate from
            2.5% takes about <span className="tnum text-fg">{needed.toLocaleString("en-US")}</span>{" "}
            visitors an arm.
          </li>
          <li>
            Pick the highest price whose join rate isn&apos;t clearly lower than the best arm&apos;s
            (their ranges overlap). The revenue index (price × join rate) shows the trade-off.
          </li>
          <li>
            The survey measures how prices are perceived, not who will pay. Use its range to choose
            the next arms, and confirm with real purchases once billing exists, on new customers
            first.
          </li>
          <li>Wait for 100 to 300 survey answers per region before leaning on its numbers.</li>
        </ul>
      </section>
    </div>
  );
}
