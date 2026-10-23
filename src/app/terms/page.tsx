import { A, Bullets, ContactLine, LegalPage, LegalSection, REPO_URL } from "@/components/Legal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Backpressure, its waitlists and its leaderboard.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro={
        <p>
          These terms cover your use of Backpressure. By using the site you agree to them; if you
          don&apos;t, please don&apos;t use it. How we handle your data is in the{" "}
          <A href="/privacy">Privacy policy</A>.
        </p>
      }
    >
      <LegalSection id="service" title="The site">
        <p>
          Backpressure is a system design lab: simulated architectures, Playground challenges,
          quizzes and a daily puzzle. It&apos;s free to use. We may change, add or remove features
          at any time.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="Accounts">
        <p>
          You sign in with Google. You&apos;re responsible for what happens under your account, so
          keep your Google account secure. We may suspend accounts that break these terms.
        </p>
      </LegalSection>

      <LegalSection id="fair-play" title="Fair play">
        <p>Please don&apos;t:</p>
        <Bullets>
          <li>try to get around the site&apos;s security, or reach data that isn&apos;t yours;</li>
          <li>
            send automated traffic, scrape at volume, or load the site more than normal use would;
          </li>
          <li>
            submit results any way other than through the site, or otherwise game a leaderboard;
          </li>
          <li>sign anyone else up to a waitlist without their permission.</li>
        </Bullets>
        <p>We may remove results or entries that look automated or abusive.</p>
      </LegalSection>

      <LegalSection id="simulator" title="What the simulator is">
        <p>
          The simulations are teaching models. They show how systems behave in general, not how any
          real company&apos;s systems perform, so don&apos;t base production decisions on their
          numbers. Company names describe well-known architectures; those companies aren&apos;t
          affiliated with Backpressure and haven&apos;t endorsed it.
        </p>
      </LegalSection>

      <LegalSection id="paid-plans" title="Paid plans and waitlists">
        <Bullets>
          <li>Pro and Teams aren&apos;t on sale yet. Nothing is charged now.</li>
          <li>Joining a waitlist isn&apos;t a purchase, and commits neither you nor us to one.</li>
          <li>
            Prices shown before launch are being tested: different visitors may see different
            prices, and the price at launch may differ.
          </li>
          <li>
            If you joined the Pro waitlist when a price was shown, you&apos;ll be offered that
            price, for the billing period you chose, for your first year of Pro.
          </li>
          <li>Paid plans will come with their own terms when they open.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="your-content" title="Your designs and results">
        <p>
          What you build and submit stays yours. You let us store it and show it as the site works:
          for example, your first name and initial next to your result on a daily leaderboard.
        </p>
      </LegalSection>

      <LegalSection id="our-content" title="Our content and code">
        <p>
          The site, its simulations, challenges, puzzles, writing and design are ours. The source
          code is public on <A href={REPO_URL}>GitHub</A> so you can read it, but unless a licence
          file in the repository says otherwise, no licence to copy, modify or redistribute it is
          granted. Sharing links to the site and screenshots of your results is welcome.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="No warranty, limited liability">
        <p>
          The site is provided as is, without warranties of any kind. We don&apos;t promise it will
          always be available or free of errors. As far as the law allows, we aren&apos;t liable for
          any indirect or consequential loss from using it, and our total liability to you is
          limited to what you&apos;ve paid us in the last 12 months. Nothing in these terms limits
          liability that the law doesn&apos;t allow us to limit.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update these terms. The date at the top shows the current version, and using the
          site after a change means you accept it.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <ContactLine />
      </LegalSection>
    </LegalPage>
  );
}
