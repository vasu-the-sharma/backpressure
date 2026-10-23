import { A, Bullets, ContactLine, LegalPage, LegalSection } from "@/components/Legal";
import { PriceTestChoice } from "@/components/pricing/Consent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Backpressure collects, why, who handles it, and what you can do about it.",
};

/** The privacy policy. Keep it in step with the code: every cookie, table and provider is listed. */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro={
        <p>
          What Backpressure collects, why, who handles it for us, and what you can do about it. The
          short version: everything works without an account, there are no ads or ad trackers, and
          we never sell your data.
        </p>
      }
    >
      <LegalSection id="collect" title="What we collect">
        <p>
          <strong className="font-medium text-fg">Without an account.</strong> Your quiz scores,
          solved challenges and daily-puzzle runs stay in your browser&apos;s local storage. They
          don&apos;t reach our servers.
        </p>
        <p>
          <strong className="font-medium text-fg">With an account.</strong> When you sign in with
          Google, Google gives us your name, email address and profile picture. We keep those, your
          role, when you joined and were last seen, and the sign-in tokens Google issues for your
          account. While you&apos;re signed in we also keep each Playground run (whether it passed,
          its latency, error rate, throughput and number of components), each finished quiz score,
          and your best result for each daily puzzle. Solving a daily puzzle puts your first name
          and initial on that day&apos;s leaderboard.
        </p>
        <p>
          <strong className="font-medium text-fg">Waitlists.</strong> If you join the Pro or Teams
          waitlist, we keep your email address, the plan, the page you joined from, and the price
          and billing period you were shown. If you weren&apos;t signed in, we also keep a
          fingerprint of your network for 24 hours to stop automated sign-ups: a one-way hash of
          your IP address that changes every day. We never store the IP address itself.
        </p>
        <p>
          <strong className="font-medium text-fg">The price test.</strong> Pro&apos;s price
          isn&apos;t set yet, so visitors see one of three. For visitors in the test we keep a
          random ID, which price it was shown, whether it was in India or elsewhere (we don&apos;t
          store the country), and the days it viewed a page showing a price. If you answer the four
          pricing questions after joining the waitlist, your answers are kept with that random ID.
          If you join the Pro waitlist while in the test, your entry is linked to the ID too.
        </p>
        <p>
          <strong className="font-medium text-fg">Analytics.</strong> Vercel Web Analytics counts
          page views without cookies. It records the page (we drop anything after the “?” in the
          address), the referring site, and your country, browser, operating system and device type.
          A visit is recognised by a hash of the request that Vercel discards after 24 hours.
        </p>
        <p>
          <strong className="font-medium text-fg">Logs.</strong> Our host keeps standard request
          logs, including IP addresses, for a short time to run and secure the site.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and local storage">
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-fg-3">
                <th scope="col" className="px-3 py-2 font-normal">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  What it&apos;s for
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Kept for
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COOKIES.map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-2 align-top font-mono text-fg">{c.name}</td>
                  <td className="px-3 py-2 align-top">{c.purpose}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">{c.kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-3">
          On the live site the sign-in cookies&apos; names start with __Secure- or __Host-.
        </p>
        <p>
          The sign-in cookies are needed to sign in. The price-test cookies are only set on Pricing
          and Past puzzles. In the EU, the EEA, the UK and Switzerland we ask before setting them.
          Wherever you are, you can change your answer here:
        </p>
        <PriceTestChoice />
        <p>
          Not allowing them shows you the standard price, keeps you out of the test, and removes the
          test cookies the next time you open one of those pages.
        </p>
      </LegalSection>

      <LegalSection id="use" title="How we use it">
        <Bullets>
          <li>To run your account and show your progress and leaderboard results.</li>
          <li>To re-grade runs on our server, so the leaderboard stays fair.</li>
          <li>
            To email you about a waitlist you joined: a confirmation, then when the plan opens.
            Nothing else, and never on anyone else&apos;s behalf.
          </li>
          <li>To set Pro&apos;s price, from the price test and the survey.</li>
          <li>To count visits, and to keep the site working and secure.</li>
        </Bullets>
        <p>
          In data-protection terms, we rely on our agreement with you to run your account, on your
          consent for the waitlist and, where we ask, the price-test cookies, and on our legitimate
          interest in a secure, working site for the rest.
        </p>
      </LegalSection>

      <LegalSection id="providers" title="Who handles it for us">
        <Bullets>
          <li>
            <A href="https://vercel.com/legal/privacy-policy">Vercel</A>: hosting, request logs and
            Web Analytics.
          </li>
          <li>
            <A href="https://neon.com/privacy-policy">Neon</A>: our database.
          </li>
          <li>
            <A href="https://policies.google.com/privacy">Google</A>: sign-in.
          </li>
          <li>
            <A href="https://resend.com/legal/privacy-policy">Resend</A>: sending email. We
            don&apos;t track whether you open or click our emails.
          </li>
        </Bullets>
        <p>
          They handle data only to provide their service to us. Some of them are in the United
          States, so your data may be processed there. We don&apos;t sell or share your data with
          anyone else unless the law requires it.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <Bullets>
          <li>Your account and progress: until you delete your account.</li>
          <li>
            Waitlist entries: until you leave, or a year after the plan opens (long enough to honour
            the price you were shown).
          </li>
          <li>Network fingerprints: 24 hours.</li>
          <li>Price-test records and survey answers: while the price test runs.</li>
          <li>Local storage: until you clear it in your browser.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="rights" title="Your choices">
        <Bullets>
          <li>Leave a waitlist with the link at the bottom of any waitlist email.</li>
          <li>
            Turn the price-test cookies on or off in <A href="#cookies">Cookies</A> above.
          </li>
          <li>Clear your local progress by clearing this site&apos;s data in your browser.</li>
          <li>
            Download a copy of your data, or delete your account and everything linked to it, from{" "}
            <A href="/account">your account page</A>.
          </li>
          <li>Ask us to correct anything, or for help with any of this. Contact us below.</li>
        </Bullets>
        <p>
          If you&apos;re in the EU, the EEA or the UK, you can also complain to your data-protection
          authority.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          Backpressure isn&apos;t meant for children under 13, and we don&apos;t knowingly collect
          their data.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          When this policy changes, we update it here and change the date at the top. See also the{" "}
          <A href="/terms">Terms</A>.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <ContactLine />
      </LegalSection>
    </LegalPage>
  );
}

const COOKIES: Array<{ name: string; purpose: string; kept: string }> = [
  {
    name: "authjs.session-token",
    purpose: "Keeps you signed in.",
    kept: "30 days",
  },
  {
    name: "authjs.csrf-token, authjs.callback-url",
    purpose: "Protect the sign-in form and return you to the page you were on.",
    kept: "Until you close the browser",
  },
  {
    name: "authjs.pkce.code_verifier",
    purpose: "Secures the hand-off to Google while you sign in.",
    kept: "15 minutes",
  },
  { name: "bp_vid", purpose: "The price test's random ID.", kept: "1 year" },
  { name: "bp_arm", purpose: "Which of the three Pro prices you see.", kept: "1 year" },
  { name: "bp_consent", purpose: "Your answer about the price-test cookies.", kept: "1 year" },
  {
    name: "bp.* (local storage)",
    purpose: "Your quiz scores, solved challenges and daily-puzzle runs when signed out.",
    kept: "Until you clear it",
  },
];
