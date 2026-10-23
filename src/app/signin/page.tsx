import { auth, signIn } from "@/auth";
import { LogoMark } from "@/components/Logo";
import { SetupNotice } from "@/components/SetupNotice";
import { isAuthConfigured, safeCallback } from "@/server/session";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  AccessDenied: "Google didn't allow that sign-in. Try again, or use a different account.",
  Configuration: "Sign-in is misconfigured on our side. Please try again later.",
  OAuthAccountNotLinked: "That email is already linked to another sign-in method.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  if (!isAuthConfigured()) return <SetupNotice />;
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeCallback(callbackUrl);

  const session = await auth();
  if (session?.user) redirect(redirectTo);

  return (
    <section className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <LogoMark size={28} className="text-fg" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">
        Sign in to Backpressure
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-2">
        Save every Playground run and quiz score to your account, and pick up where you left off on
        any device.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 w-full rounded-md border border-bad/40 bg-bad/[0.08] px-3 py-2.5 text-left text-xs text-bad-fg"
        >
          {ERRORS[error] ?? "Sign-in didn't complete. Please try again."}
        </p>
      )}

      <form
        className="mt-8 w-full"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo });
        }}
      >
        <button type="submit" className="btn btn-primary btn-lg w-full">
          <GoogleMark />
          Continue with Google
        </button>
      </form>
      <p className="mt-4 text-xs text-fg-3">
        New here? Continuing creates your account. Everything on the site stays free to use without
        one.
      </p>
      <p className="mt-2 text-xs text-fg-3">
        By continuing, you agree to the{" "}
        <Link
          href="/terms"
          className="focus-ring rounded-sm underline decoration-line-strong underline-offset-2 hover:text-fg"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="focus-ring rounded-sm underline decoration-line-strong underline-offset-2 hover:text-fg"
        >
          Privacy policy
        </Link>
        .
      </p>
    </section>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}
