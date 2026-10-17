/** Shown on account pages when this deployment has no database or Google sign-in configured. */
export function SetupNotice() {
  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        Accounts aren&apos;t set up here
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-2">
        This deployment has no database or Google sign-in configured, so signing in is turned off.
        Everything else works without an account.
      </p>
      <p className="mt-3 text-xs text-fg-3">
        Setting it up: add <code className="tnum">DATABASE_URL</code>,{" "}
        <code className="tnum">AUTH_SECRET</code>, <code className="tnum">AUTH_GOOGLE_ID</code> and{" "}
        <code className="tnum">AUTH_GOOGLE_SECRET</code> (see{" "}
        <code className="tnum">.env.example</code>).
      </p>
    </section>
  );
}
