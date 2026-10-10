"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" className="flex flex-col items-center py-24 text-center">
      <p className="text-xs text-bad-fg">Something broke</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">This page hit an error.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-2">
        The simulator stopped unexpectedly. Retrying usually clears it; if it doesn&apos;t, reload
        the page.
        {error.digest && (
          <span className="tnum mt-2 block text-xs text-fg-3">ref {error.digest}</span>
        )}
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/" className="btn btn-secondary">
          Go home
        </a>
      </div>
    </section>
  );
}
