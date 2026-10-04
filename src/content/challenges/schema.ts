import type { LoadProfile, SloTarget } from "@/sim/score";
import type { NodeKind } from "@/sim/types";

/**
 * A playground challenge: a scenario the player designs a system for. The entry
 * `client` node is always provided on the canvas; `palette` lists the kinds the
 * player may add. Authored as typed modules for now; moves to a DB-backed
 * authoring UI per the architecture plan.
 */
export interface Challenge {
  slug: string;
  company: string;
  category: string;
  title: string;
  /** The brief shown to the player. */
  prompt: string;
  requirements: string[];
  /** Node kinds available to add (the client entry is implicit). */
  palette: NodeKind[];
  /** Kinds that must appear on the path from the entry for a valid submission. */
  requiredKinds?: NodeKind[];
  load: LoadProfile;
  slo: SloTarget;
  /** Optional nudge, revealed on demand. */
  hint?: string;
  /** The canonical approach, revealed once the design passes. */
  solution?: string;
}
