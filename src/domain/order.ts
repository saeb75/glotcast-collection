/** Ordered id lists (list episodes, home slider, home and explore lists). */

/** The item moved from one index to another; the rest keep their order. */
export function move<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items]
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

/** Appended once (an id already there stays where it is). */
export const addUnique = <T>(items: readonly T[], item: T): T[] =>
  items.includes(item) ? [...items] : [...items, item]

export const without = <T>(items: readonly T[], item: T): T[] => items.filter((i) => i !== item)

/** Same ids in the same order. */
export const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i])
