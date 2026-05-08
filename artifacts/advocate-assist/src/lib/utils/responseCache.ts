// ── ResponseCache — ported from llm.py ResponseCache class ────────────────────
// MD5-keyed in-memory cache with TTL and max-size eviction.

import crypto from "crypto";

interface CacheEntry<T> {
  data: T;
  time: number;
}

export class ResponseCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(
    private ttl = 300_000,   // 5 minutes (matches llm.py)
    private maxSize = 30     // 30 entries max
  ) {}

  private key(input: string): string {
    return crypto.createHash("md5").update(input).digest("hex");
  }

  get(input: string): T | null {
    const k = this.key(input);
    const entry = this.cache.get(k);
    if (!entry) return null;
    if (Date.now() - entry.time > this.ttl) {
      this.cache.delete(k);
      return null;
    }
    return entry.data;
  }

  set(input: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = [...this.cache.entries()].sort(
        ([, a], [, b]) => a.time - b.time
      )[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(this.key(input), { data, time: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton instance for chat responses
export const chatCache = new ResponseCache<string>();
