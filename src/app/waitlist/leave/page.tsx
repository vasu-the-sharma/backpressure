import { LeaveWaitlist } from "@/components/LeaveWaitlist";
import { readWaitlistToken } from "@/server/tokens";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leave the waitlist", robots: { index: false } };
export const dynamic = "force-dynamic";

/** "a•••@example.com": enough to recognise your address, not enough to read someone else's. */
function mask(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}•••@${domain}`;
}

/**
 * Where the link in a waitlist email lands. Leaving takes a button press, so
 * mail scanners that open every link can't remove anyone by accident.
 */
export default async function LeaveWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const email = readWaitlistToken(t);

  return (
    <section className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Leave the waitlist</h1>
      {email && t ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-fg-2">
            Take <span className="text-fg">{mask(email)}</span> off every Backpressure waitlist. We
            won&apos;t email it about Pro or Teams again.
          </p>
          <LeaveWaitlist token={t} />
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          This link isn&apos;t valid. Use the one at the bottom of your latest waitlist email.
        </p>
      )}
    </section>
  );
}
