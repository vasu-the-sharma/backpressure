"use client";

import { Waitlist } from "@/components/daily/Waitlist";
import {
  type Period,
  type ProPrice,
  annualSaving,
  formatMoney,
  perMonthOfAnnual,
} from "@/content/pricing/plans";
import { useState } from "react";

/**
 * Pro's price for this visitor's arm, with a monthly/annual switch. Joining
 * the waitlist records which billing period they picked; visitors in the
 * price test (`survey`) are then asked what price feels right.
 */
export function ProPlan({
  price,
  signedIn,
  waitlistOpen,
  survey,
}: {
  price: ProPrice;
  signedIn: boolean;
  waitlistOpen: boolean;
  survey: boolean;
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const save = annualSaving(price);

  return (
    <div>
      <fieldset className="inline-flex rounded-md border border-line-strong p-0.5">
        <legend className="sr-only">Billing</legend>
        {(["monthly", "annual"] as Period[]).map((p) => (
          <label
            key={p}
            className={`cursor-pointer rounded-[5px] px-2.5 py-1 text-xs transition-colors duration-150 ease-out has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
              period === p ? "bg-fill-2 text-fg" : "text-fg-3 hover:text-fg"
            }`}
          >
            <input
              type="radio"
              name="billing"
              value={p}
              checked={period === p}
              onChange={() => setPeriod(p)}
              className="sr-only"
            />
            {p === "monthly" ? "Monthly" : `Annual · save ${save}%`}
          </label>
        ))}
      </fieldset>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="tnum text-4xl font-semibold tracking-tight text-fg">
          {formatMoney(period === "monthly" ? price.monthly : price.annual, price.currency)}
        </span>
        <span className="text-sm text-fg-3">{period === "monthly" ? "a month" : "a year"}</span>
      </p>
      <p className="mt-1 text-xs text-fg-3">
        {period === "monthly"
          ? `Or ${formatMoney(price.annual, price.currency)} a year, about ${perMonthOfAnnual(price)} a month.`
          : `About ${perMonthOfAnnual(price)} a month, billed once a year.`}
      </p>

      <div className="mt-5">
        {waitlistOpen ? (
          <Waitlist
            source="pricing"
            signedIn={signedIn}
            period={period}
            survey={survey ? { currency: price.currency } : undefined}
          />
        ) : (
          <p className="text-sm text-fg-3">The waitlist opens soon.</p>
        )}
        <p className="mt-2 text-xs text-fg-3">No payment now. Pro opens soon.</p>
      </div>
    </div>
  );
}
