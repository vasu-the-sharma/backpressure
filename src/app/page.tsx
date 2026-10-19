import { CompareDemo } from "@/components/CompareDemo";
import { CtaLink } from "@/components/CtaLink";
import {
  LatencyCurve,
  Marquee,
  QueueOverflow,
  RiseWords,
  SeedReplay,
} from "@/components/LandingVisuals";
import { PointerLight } from "@/components/PointerLight";
import { Reveal } from "@/components/Reveal";
import { PlaygroundVignette, QuizVignette, SystemsVignette } from "@/components/Vignettes";
import { VerticalIcon } from "@/components/icons";
import { ChevronRight } from "@/components/ui";
import { getAllChallenges } from "@/content/challenges/registry";
import { getAllQuizzes } from "@/content/quizzes/registry";
import { getAllSystems } from "@/content/registry";
import { type Vertical, verticals } from "@/content/verticals";
import Link from "next/link";
import type { ReactNode } from "react";

const VIGNETTES: Record<string, ReactNode> = {
  systems: <SystemsVignette />,
  playground: <PlaygroundVignette />,
  quiz: <QuizVignette />,
};

const PRINCIPLES: Array<{ title: string; line: string; visual: ReactNode }> = [
  { title: "Deterministic", line: "Every run is seeded.", visual: <SeedReplay /> },
  { title: "Bounded queues", line: "Each tier holds a finite queue.", visual: <QueueOverflow /> },
  {
    title: "Directionally honest",
    line: "The shape is right; the numbers are a model.",
    visual: <LatencyCurve />,
  },
];

export default function Landing() {
  const systems = getAllSystems();
  const challenges = getAllChallenges();
  const quizzes = getAllQuizzes();

  const counts: Record<string, string> = {
    systems: `${systems.length} systems`,
    playground: `${challenges.length} challenges`,
    quiz: `${quizzes.reduce((n, q) => n + q.questions.length, 0)} questions`,
  };

  // Every real-world system the catalog and challenges are modelled on.
  const modelled = Array.from(
    new Set([...systems.map((s) => s.name), ...challenges.map((c) => c.company)]),
  );

  return (
    <div className="-mt-8 sm:-mt-10">
      <PointerLight />

      {/* ---------------- Hero ---------------- */}
      <section
        data-light
        className="relative isolate flex flex-col items-center pt-16 pb-12 text-center sm:pt-24 sm:pb-16"
      >
        <div aria-hidden className="hero-dots" />
        <div aria-hidden className="hero-dots hero-spot" />
        <h1 className="display text-5xl sm:text-7xl lg:text-[5.5rem]">
          <RiseWords text="Watch systems" />
          <br />
          <RiseWords text="push back." from={2} />
        </h1>
        <p
          className="rise-in mt-6 max-w-xl text-base leading-relaxed text-fg-2 sm:text-lg"
          style={{ animationDelay: "380ms" }}
        >
          A lab for system design.
        </p>
        <div
          className="rise-in mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row"
          style={{ animationDelay: "460ms" }}
        >
          <CtaLink
            href="/systems"
            variant="primary"
            icon={<VerticalIcon slug="systems" size={16} />}
          >
            Explore systems
          </CtaLink>
          <CtaLink href="/playground" icon={<VerticalIcon slug="playground" size={16} />}>
            Design your own
          </CtaLink>
        </div>
      </section>

      {/* ---------------- Live comparison ---------------- */}
      <section aria-labelledby="compare" className="rise-in" style={{ animationDelay: "560ms" }}>
        <div className="mb-6 text-center">
          <h2
            id="compare"
            className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Same system. Two kinds of traffic.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-fg-2 sm:text-base">
            Both sides run the identical architecture on the real engine; only the traffic differs.
            Watch the right side hit its limit, then add a database to rescue it.
          </p>
        </div>
        <CompareDemo />
      </section>

      {/* ---------------- Modelled on ---------------- */}
      <Reveal as="section" className="mt-20 border-y border-line py-8">
        <h2 className="text-center text-xs text-fg-3">Modelled on systems you use every day</h2>
        <div className="mt-5">
          <Marquee items={modelled} />
        </div>
      </Reveal>

      {/* ---------------- Products ---------------- */}
      <section className="mt-24" aria-labelledby="ways-in">
        <Reveal>
          <h2 id="ways-in" className="display text-4xl sm:text-5xl">
            Three ways in.
          </h2>
        </Reveal>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {verticals.map((v, i) => (
            <Reveal as="li" key={v.slug} delay={i * 80}>
              <ProductCard vertical={v} count={counts[v.slug]} />
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ---------------- Principles ---------------- */}
      <section className="mt-28" aria-labelledby="honest">
        <Reveal>
          <h2 id="honest" className="display max-w-2xl text-4xl sm:text-5xl">
            Honest by construction.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 80} className="bg-canvas p-6">
              <div className="flex h-24 items-center justify-center">{p.visual}</div>
              <div className="mt-6 flex items-baseline gap-3">
                <span className="tnum text-xs text-fg-3">0{i + 1}</span>
                <h3 className="text-base font-medium text-fg">{p.title}</h3>
              </div>
              <p className="mt-1.5 text-sm text-fg-2">{p.line}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      <Reveal as="section" className="mt-28 mb-12 flex flex-col items-center text-center">
        <h2 className="display max-w-3xl text-4xl sm:text-6xl">
          Find the bottleneck before your users do.
        </h2>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3 md:w-auto md:max-w-none md:flex-row">
          <CtaLink
            href="/systems"
            variant="primary"
            icon={<VerticalIcon slug="systems" size={16} />}
          >
            Start with a system
          </CtaLink>
          <CtaLink href="/playground" icon={<VerticalIcon slug="playground" size={16} />}>
            Open the playground
          </CtaLink>
          <CtaLink href="/quiz" icon={<VerticalIcon slug="quiz" size={16} />}>
            Take the quiz
          </CtaLink>
        </div>
      </Reveal>
    </div>
  );
}

function ProductCard({ vertical: v, count }: { vertical: Vertical; count?: string }) {
  return (
    <Link
      href={v.href}
      data-light
      className="card-light group focus-ring panel pressable pressable-subtle flex h-full flex-col overflow-hidden hover:border-line-strong"
    >
      {VIGNETTES[v.slug]}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-medium text-fg">{v.name}</h3>
          <span className="text-xs text-fg-3">{v.status === "live" ? "Live" : "Beta"}</span>
        </div>
        <p className="mt-1.5 flex-1 text-sm text-fg-2">{v.tagline}</p>
        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="tnum text-fg-3">{count}</span>
          <span className="inline-flex items-center gap-1 text-fg transition-transform duration-150 ease-out group-hover:translate-x-0.5">
            {v.cta}
            <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
