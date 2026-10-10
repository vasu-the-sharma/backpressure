import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-center py-24 text-center">
      <p className="tnum text-xs text-fg-3">404</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">Nothing at this address.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-2">
        The page you asked for doesn&apos;t exist — it may have moved when the catalog was
        reorganised.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Go home
        </Link>
        <Link href="/systems" className="btn btn-secondary">
          Browse systems
        </Link>
      </div>
    </section>
  );
}
