import { PlaygroundCanvas } from "@/components/PlaygroundCanvas";
import { Breadcrumbs } from "@/components/ui";
import { getAllChallengeSlugs, getChallenge } from "@/content/challenges/registry";
import type { Metadata } from "next";
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
      <Breadcrumbs
        items={[{ label: "Playground", href: "/playground" }, { label: challenge.title }]}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{challenge.title}</h1>
        <p className="mt-1 text-xs text-fg-3">
          {challenge.company} · {challenge.category} · {challenge.load.label}
        </p>
      </header>

      <PlaygroundCanvas challenge={challenge} />
    </article>
  );
}
