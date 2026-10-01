import type { SystemGraph } from "@/sim/types";
import { z } from "zod";

/**
 * Content lives in the repo as typed data, validated by these schemas at build
 * time. Bad content fails `next build`, not a user's page load. The `graph`
 * field is the single source of truth: it renders the diagram and configures
 * the simulator.
 *
 * Only the core fields are required. The rich sections (challenge, trade-offs,
 * services, interview) are optional so a system can ship with just its graph
 * and have prose filled in progressively.
 */

export const nodeKindSchema = z.enum([
  "client",
  "cdn",
  "gateway",
  "lb",
  "service",
  "cache",
  "queue",
  "db",
  "storage",
]);

export const simNodeSchema = z.object({
  id: z.string().min(1),
  kind: nodeKindSchema,
  label: z.string().min(1),
  capacityPerTick: z.number().positive(),
  replicas: z.number().int().positive().default(1),
  queueMax: z.number().int().nonnegative(),
  baseLatencyMs: z.number().nonnegative(),
  cacheHitRatio: z.number().min(0).max(1).optional(),
  down: z.boolean().optional(),
});

export const simEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const systemGraphSchema = z.object({
  nodes: z.array(simNodeSchema).min(1),
  edges: z.array(simEdgeSchema),
  entryId: z.string().min(1),
});

export const tradeoffSchema = z.object({
  question: z.string(),
  chosen: z.string(),
  alternatives: z.array(z.string()),
  rationale: z.string(),
});

export const serviceRowSchema = z.object({
  component: z.string(),
  tier: z.string(),
  stack: z.array(z.string()),
  function: z.string(),
});

export const challengeSchema = z.object({
  title: z.string(),
  bottleneck: z.string(),
  solution: z.string(),
});

export const systemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be kebab-case (a-z, 0-9, hyphen)"),
  name: z.string().min(1),
  icon: z.string().optional(),
  category: z.string().min(1),
  sla: z.string().optional(),
  blurb: z.string().min(1),
  graph: systemGraphSchema,
  defaultArrivalRatePerTick: z.number().positive().default(200),
  challenge: challengeSchema.optional(),
  tradeoffs: z.array(tradeoffSchema).optional(),
  services: z.array(serviceRowSchema).optional(),
  interview: z.array(z.string()).optional(),
});

/** Validated, defaults-applied system (what the app consumes). */
export type System = z.output<typeof systemSchema>;

/** Authoring shape (defaults optional), used when writing a system module. */
export type SystemInput = z.input<typeof systemSchema>;

// Compile-time guarantee that a validated graph is accepted by the engine.
type _GraphMatchesEngine = System["graph"] extends SystemGraph ? true : never;
const _graphMatchesEngine: _GraphMatchesEngine = true;
void _graphMatchesEngine;
