import { describe, expect, it } from "vitest";
import { Fifo } from "./fifo";

describe("Fifo", () => {
  it("preserves order across internal compaction", () => {
    const q = new Fifo<number>();
    const out: number[] = [];
    let next = 0;
    // Interleave pushes and shifts well past the compaction threshold.
    for (let round = 0; round < 50; round++) {
      for (let i = 0; i < 300; i++) q.push(next++);
      for (let i = 0; i < 250; i++) out.push(q.shift() as number);
    }
    while (q.length > 0) out.push(q.shift() as number);
    expect(out).toEqual(Array.from({ length: next }, (_, i) => i));
    expect(q.shift()).toBeUndefined();
  });

  it("truncate drops the tail and keeps the head", () => {
    const q = new Fifo<number>();
    for (let i = 0; i < 10; i++) q.push(i);
    q.shift();
    q.truncate(3);
    expect(q.length).toBe(3);
    expect([q.shift(), q.shift(), q.shift(), q.shift()]).toEqual([1, 2, 3, undefined]);
  });
});
