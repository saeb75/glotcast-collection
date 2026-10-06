/** A small in-process cache with a time to live and a size cap (oldest entry evicted first). */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expires: number }>()

  constructor(
    private readonly ttlMs: number,
    private readonly max = 500,
  ) {}

  get(key: string, now = Date.now()): V | undefined {
    const hit = this.entries.get(key)
    if (!hit) return undefined
    if (hit.expires <= now) {
      this.entries.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: string, value: V, now = Date.now(), ttlMs = this.ttlMs): void {
    this.entries.delete(key)
    this.entries.set(key, { value, expires: now + ttlMs })
    while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value!)
  }

  /** Drops every entry whose value matches (e.g. the set pages that list a card). */
  deleteWhere(match: (value: V) => boolean): void {
    for (const [key, { value }] of this.entries) if (match(value)) this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
  }
}
