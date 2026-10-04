/**
 * The product verticals that make up Backpressure. The navbar tabs and the
 * landing-page cards both render from this one list, so adding a vertical here
 * surfaces it everywhere. This is the seam for growing Backpressure into an
 * umbrella of tools that all share the simulation engine.
 */
export type VerticalStatus = "live" | "beta" | "soon";

export interface Vertical {
  slug: string;
  name: string;
  href: string;
  /** Short line under the name. */
  tagline: string;
  /** One or two sentences for the landing card. */
  description: string;
  status: VerticalStatus;
  /** Landing-card call to action. */
  cta: string;
}

export const verticals: Vertical[] = [
  {
    slug: "systems",
    name: "Systems",
    href: "/systems",
    tagline: "Drive real systems under load",
    description:
      "Open a famous system — Uber, WhatsApp, a URL shortener — then send it traffic, break a node, and scale it while latency, throughput, and the bottleneck respond in real time.",
    status: "live",
    cta: "Explore systems",
  },
  {
    slug: "playground",
    name: "Playground",
    href: "/playground",
    tagline: "Design a system, then run it",
    description:
      "Build an architecture on a canvas and run it against real load. You pass when the design holds the SLO — the same simulator that drives the catalog grades your work.",
    status: "beta",
    cta: "Open the playground",
  },
  {
    slug: "quiz",
    name: "Quiz",
    href: "/quiz",
    tagline: "Test your instincts",
    description:
      "Fast multiple-choice drills on load, caching, fan-out, and bottlenecks. Answer, get the reasoning immediately, and sharpen the instincts the simulator is built to train.",
    status: "beta",
    cta: "Take a quiz",
  },
];

/** The verticals that are navigable today (anything not "soon"). */
export const liveVerticals = verticals.filter((v) => v.status !== "soon");
