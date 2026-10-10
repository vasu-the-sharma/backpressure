import { LiveDemo } from "@/components/LiveDemo";
import { Reveal } from "@/components/Reveal";
import { PlaygroundVignette, QuizVignette, SystemsVignette } from "@/components/Vignettes";
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

const PRINCIPLES = [
  {
    title: "Deterministic",
    body: "Every run is seeded. The same graph, load, and seed replay exactly — so a failure you find is a failure you can show someone.",
  },
  {
    title: "Bounded queues",
    body: "Each tier serves a fixed amount per tick and holds a finite queue. Bursts build queues below capacity; past it, requests are dropped and counted.",
  },
  {
    title: "Directionally honest",
    body: "Tail latency rises as utilization nears one, an outage cascades, scaling moves the bottleneck. The shape is right; the numbers are a model, not telemetry.",
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
      {/* ---------------- Hero ---------------- */}
      <section className="flex flex-col items-center pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
        <h1 className="display rise-in text-5xl sm:text-7xl lg:text-[5.5rem]">
          Watch systems
          <br />
          push back.
        </h1>
        <p
          className="rise-in mt-6 max-w-xl text-base leading-relaxed text-fg-2 sm:text-lg"
          style={{ animationDelay: "80ms" }}
        >
          A lab for system design. Drive real architectures under load, break them, scale them — and
          see exactly where they fail.
        </p>
        <div
          className="rise-in mt-8 flex flex-wrap justify-center gap-3"
          style={{ animationDelay: "160ms" }}
        >
          <Link href="/systems" className="btn btn-primary btn-lg">
            Explore systems
          </Link>
          <Link href="/playground" className="btn btn-secondary btn-lg">
            Design your own
          </Link>
        </div>
      </section>

      {/* ---------------- Live product ---------------- */}
      <section className="rise-in" style={{ animationDelay: "260ms" }}>
        <LiveDemo />
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-fg-3">
          This is the real engine, not a recording. Offered load sweeps past the database's capacity
          every 16 seconds — watch its queue fill, p99 double, and requests drop, then recover.
        </p>
      </section>

      {/* ---------------- Modelled on ---------------- */}
      <Reveal as="section" className="mt-20 border-y border-line py-8">
        <h2 className="text-center text-xs text-fg-3">Modelled on systems you use every day</h2>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {modelled.map((name) => (
            <li key={name} className="text-lg font-medium tracking-tight text-fg-2">
              {name}
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ---------------- Products ---------------- */}
      <section className="mt-24" aria-labelledby="ways-in">
        <Reveal>
          <h2 id="ways-in" className="display text-4xl sm:text-5xl">
            Three ways in.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-2">
            Drive a system someone else designed, design one yourself and get graded, or test the
            instincts both are built to train. One simulator underneath all three.
          </p>
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
              <p className="tnum text-xs text-fg-3">0{i + 1}</p>
              <h3 className="mt-6 text-base font-medium text-fg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      <Reveal as="section" className="mt-28 mb-12 flex flex-col items-center text-center">
        <h2 className="display max-w-3xl text-4xl sm:text-6xl">
          Find the bottleneck before your users do.
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/systems" className="btn btn-primary btn-lg">
            Start with a system
          </Link>
          <Link href="/quiz" className="btn btn-ghost btn-lg">
            Take the quiz
            <ChevronRight size={14} />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

function ProductCard({ vertical: v, count }: { vertical: Vertical; count?: string }) {
  return (
    <Link
      href={v.href}
      className="group focus-ring panel flex h-full flex-col overflow-hidden transition-colors duration-150 ease-out hover:border-line-strong"
    >
      {VIGNETTES[v.slug]}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-medium text-fg">{v.name}</h3>
          <span className="text-xs text-fg-3">{v.status === "live" ? "Live" : "Beta"}</span>
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-2">{v.description}</p>
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
