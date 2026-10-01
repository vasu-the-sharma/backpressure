/**
 * mulberry32: a tiny, fast, seeded pseudo-random generator.
 *
 * Determinism is a hard requirement for this engine: the same seed must
 * produce the same run so that a simulation state can be encoded in a URL and
 * reproduced exactly by anyone who opens it. We therefore never read the
 * wall clock inside the model.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
