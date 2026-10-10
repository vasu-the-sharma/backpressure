/**
 * A first-in, first-out queue with O(1) push and shift.
 *
 * `Array.prototype.shift` is O(n): draining thousands of requests a tick from
 * a node whose queue holds tens of thousands (any overloaded design) went
 * quadratic and took tens of seconds to score. This keeps a head index instead
 * and compacts the backing array only once the consumed prefix dominates it.
 * Ordering is identical to the array it replaces, so runs stay deterministic
 * and byte-for-byte the same.
 */
export class Fifo<T> {
  private items: T[] = [];
  private head = 0;

  get length(): number {
    return this.items.length - this.head;
  }

  push(item: T): void {
    this.items.push(item);
  }

  shift(): T | undefined {
    if (this.head >= this.items.length) return undefined;
    const item = this.items[this.head];
    this.head += 1;
    if (this.head >= 1024 && this.head * 2 >= this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  /** Keep only the first `n` queued items (the overflow at the tail is dropped). */
  truncate(n: number): void {
    if (n < this.length) this.items.length = this.head + Math.max(0, n);
  }

  clear(): void {
    this.items = [];
    this.head = 0;
  }
}
