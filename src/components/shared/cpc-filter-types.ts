export type CpcFilter = 'with' | 'without' | null

/** Returns true if the given CPC value matches the filter. */
export function matchesCpcFilter(cpc: number | null | undefined, filter: CpcFilter): boolean {
  if (filter === null) return true
  const hasCpc = typeof cpc === 'number' && cpc > 0
  return filter === 'with' ? hasCpc : !hasCpc
}
