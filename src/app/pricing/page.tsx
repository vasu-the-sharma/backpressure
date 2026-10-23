import { auth } from "@/auth";
import { CtaLink } from "@/components/CtaLink";
import { Waitlist } from "@/components/daily/Waitlist";
import { VerticalIcon } from "@/components/icons";
import { ConsentBanner } from "@/components/pricing/Consent";
import { PriceExposure } from "@/components/pricing/PriceExposure";
import { ProPlan } from "@/components/pricing/ProPlan";
import { CheckGlyph } from "@/components/ui";
import {
  CONTROL_ARM,
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_PRICES,
  type PlanFeature,
  TEAMS_FEATURES,
  formatMoney,
} from "@/content/pricing/plans";
import { isAuthConfigured, isDbConfigured } from "@/server/config";
import { priceVisitor } from "@/server/visitor";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Backpressure is free to learn with. Pro adds every past daily puzzle and, soon, an AI interview coach. Teams adds interview mode and classrooms.",
};

/** Structured data so search engines and AI agents can read the plans: the control arm's price. */
function jsonLd(): string {
  const p = PRO_PRICES.intl[CONTROL_ARM];
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Backpressure Pro",
    description:
      "System design practice on a live simulator: every past daily puzzle, and an AI interview coach.",
    brand: { "@type": "Brand", name: "Backpressure" },
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      {
        "@type": "Offer",
        name: "Pro, monthly",
        price: String(p.monthly),
        priceCurrency: p.currency,
        availability: "https://schema.org/PreOrder",
      },
      {
        "@type": "Offer",
        name: "Pro, annual",
        price: String(p.annual),
        priceCurrency: p.currency,
        availability: "https://schema.org/PreOrder",
      },
    ],
  };
  // Keep "</script>" out of the payload whatever the strings become.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function PricingPage() {
  const visitor = await priceVisitor();
  const price = PRO_PRICES[visitor.segment][visitor.arm];
  const session = isAuthConfigured() ? await auth() : null;
  const signedIn = Boolean(session?.user?.id);
  const waitlistOpen = isDbConfigured();

  return (
    <div>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from our own constants, with "<" escaped
        dangerouslySetInnerHTML={{ __html: jsonLd() }}
      />
      {visitor.randomized && <PriceExposure page="pricing" />}

      <header className="mb-10 flex flex-col items-center pt-6 text-center sm:pt-10">
        <h1 className="display rise-in text-4xl text-fg sm:text-6xl">Pricing</h1>
        <p
          className="rise-in mt-4 max-w-xl text-base leading-relaxed text-fg-2"
          style={{ animationDelay: "80ms" }}
        >
          Learn for free. Upgrade when you&apos;re getting ready for interviews.
        </p>
      </header>

      {visitor.consent === "ask" && <ConsentBanner />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Plan
          name="Free"
          blurb="For learning how systems behave under load."
          features={FREE_FEATURES}
        >
          <p className="flex items-baseline gap-1.5">
            <span className="tnum text-4xl font-semibold tracking-tight text-fg">
              {formatMoney(0, price.currency)}
            </span>
            <span className="text-sm text-fg-3">forever</span>
          </p>
          <div className="mt-5">
            <CtaLink
              href="/daily"
              variant="secondary"
              icon={<VerticalIcon slug="playground" size={16} />}
            >
              Play today&apos;s puzzle
            </CtaLink>
          </div>
        </Plan>

        <Plan
          name="Pro"
          recommended
          blurb="For engineers preparing for system design interviews."
          features={PRO_FEATURES}
        >
          <ProPlan
            price={price}
            signedIn={signedIn}
            waitlistOpen={waitlistOpen}
            survey={visitor.randomized}
          />
        </Plan>

        <Plan
          name="Teams"
          blurb="For hiring teams, classrooms and on-call teams."
          features={TEAMS_FEATURES}
        >
          <p className="text-2xl font-semibold tracking-tight text-fg">Pricing on request</p>
          <p className="mt-1 text-xs text-fg-3">Shaped with the first teams that sign up.</p>
          <div className="mt-5">
            {waitlistOpen ? (
              <Waitlist
                plan="teams"
                source="pricing"
                signedIn={signedIn}
                cta="Tell me when Teams opens"
              />
            ) : (
              <p className="text-sm text-fg-3">The waitlist opens soon.</p>
            )}
          </div>
        </Plan>
      </div>

      <section className="panel mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-medium text-fg">Enterprise</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-2">
            A digital twin of your own production system to test changes and traffic spikes before
            they happen, with SSO and audit logs.
          </p>
        </div>
        <div className="sm:w-[22rem] sm:shrink-0">
          {waitlistOpen ? (
            <Waitlist plan="teams" source="enterprise" signedIn={signedIn} cta="Talk to us" />
          ) : (
            <p className="text-sm text-fg-3">Opening later.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto mt-20 max-w-3xl">
        <h2 id="faq" className="display text-3xl text-fg sm:text-4xl">
          Questions
        </h2>
        <dl className="mt-8 divide-y divide-line border-y border-line">
          <Faq q="Can I buy Pro today?">
            Not yet. Pro is opening soon: join the waitlist and we&apos;ll email you. Nothing is
            charged now.
          </Faq>
          <Faq q="What stays free?">
            The catalog, the Playground, quizzes, and today&apos;s daily puzzle with its leaderboard
            and streak. Free stays free.
          </Faq>
          <Faq q="Will the price change?">
            Prices before launch are still being tested. Join the waitlist and you keep the price
            you saw for your first year.
          </Faq>
          {visitor.segment === "in" && (
            <Faq q="Why is the price in rupees?">
              Prices in India are set for local purchasing power.
            </Faq>
          )}
        </dl>
      </section>
    </div>
  );
}

function Plan({
  name,
  blurb,
  features,
  recommended = false,
  children,
}: {
  name: string;
  blurb: string;
  features: PlanFeature[];
  recommended?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`plan-${name}`}
      className={`panel flex flex-col p-6 ${recommended ? "plan-recommended" : ""}`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 id={`plan-${name}`} className="text-base font-medium text-fg">
          {name}
        </h2>
        {recommended && <span className="text-xs text-fg-2">Recommended</span>}
      </header>
      <p className="mt-1 text-sm text-fg-2">{blurb}</p>
      <div className="mt-6">{children}</div>
      <ul className="mt-6 space-y-2 border-t border-line pt-5">
        {features.map((f) => (
          <li key={f.label} className="flex gap-2 text-sm text-fg-2">
            <CheckGlyph size={12} className="mt-1 shrink-0 text-fg-3" />
            <span>
              {f.label}
              {f.soon && (
                <span className="ml-1.5 rounded-sm border border-line-strong px-1 py-px text-[10px] text-fg-3">
                  Soon
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[16rem_1fr] sm:gap-8">
      <dt className="text-sm font-medium text-fg">{q}</dt>
      <dd className="text-sm leading-relaxed text-fg-2">{children}</dd>
    </div>
  );
}
