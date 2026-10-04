import { PlaygroundCanvas } from "@/components/PlaygroundCanvas";
import { getAllChallengeSlugs, getChallenge } from "@/content/challenges/registry";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllChallengeSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const challenge = getChallenge(slug);
  if (!challenge) return {};
  return { title: challenge.title, description: challenge.prompt };
}

export default async function ChallengePage({ params }: PageProps) {
  const { slug } = await params;
  const challenge = getChallenge(slug);
  if (!challenge) notFound();

  return (
    <article>
      <nav className="mb-6 flex items-center gap-2 text-sm text-fg-subtle">
        <Link href="/playground" className="transition-colors hover:text-fg">
          Playground
        </Link>
        <span aria-hidden className="opacity-50">
          /
        </span>
        <span className="text-fg-muted">{challenge.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">{challenge.title}</h1>
          <span className="badge">{challenge.company}</span>
          <span className="badge">{challenge.category}</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {challenge.requirements.map((r) => (
            <li key={r} className="badge">
              {r}
            </li>
          ))}
        </ul>
      </header>

      <p className="mb-4 text-xs text-fg-subtle">
        Drag from a node's right edge to connect it to the next. Each node carries traffic to its
        first connection, so build a path from the Client. Scale replicas with ± and press{" "}
        <span className="font-medium text-fg-muted">Run design</span>.
      </p>

      <PlaygroundCanvas challenge={challenge} />
    </article>
  );
}
