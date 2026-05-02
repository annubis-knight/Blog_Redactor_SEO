/**
 * 2026-05-02 — Composable de tri générique pour les conteneurs de cards du
 * Moteur (Radar, Capitaine, Lieutenants, Lexique).
 *
 * Fonctionnalités :
 *   - Tri sur N critères, key opaque (caller décide du sens : "score", "az", "density", …)
 *   - Direction cyclique : neutral → desc → asc → neutral
 *   - Item "épinglé" en haut, peu importe le tri (Capitaine : item verrouillé toujours en haut)
 *   - Filtre amont optionnel (Radar : filtre CPC) — appliqué AVANT tri
 *
 * Important : le caller fournit `getValue(item, key)` — c'est lui qui sait que
 * "score" sur Capitaine = `entry.card.relevanceScore.total` mais que "score"
 * sur Radar = `card.marketScore.total`. Le composable ne connaît rien du
 * domaine, il manipule juste des nombres et des strings.
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'

export type SortDirection = 'desc' | 'asc' | 'neutral'

export interface SortState {
  key: string | null
  direction: SortDirection
}

export interface SortOption {
  key: string
  label: string
}

export interface UseSortableListOptions<T> {
  items: Ref<T[]> | ComputedRef<T[]>
  /** Extracteur de valeur par critère. Renvoyer string pour tri alphabétique, number pour numérique. */
  getValue: (item: T, key: string) => string | number | null | undefined
  /** Items à toujours pousser en haut (utilisé pour l'item verrouillé du Capitaine). */
  pinnedPredicate?: (item: T) => boolean
  /** Filtre amont (ex: filtre CPC du Radar). Appliqué avant tri. */
  filter?: (item: T) => boolean
}

export interface UseSortableListReturn<T> {
  /** Liste filtrée + triée (stable, ne mute jamais l'input). */
  sorted: ComputedRef<T[]>
  /** État courant du tri. Modifiable depuis l'extérieur. */
  sortState: Ref<SortState>
  /** Cycle la direction sur une key : neutral → desc → asc → neutral. Si autre key, repart sur desc. */
  cycleSort: (key: string) => void
  /** Reset complet : aucune key active, ordre d'origine. */
  resetSort: () => void
}

/**
 * Compare deux valeurs en gérant null/undefined (toujours en bas) et types mixtes.
 * Renvoie un nombre négatif si a < b, positif si a > b.
 */
function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
  // null/undefined → toujours en bas (peu importe la direction)
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  // Pour les strings (A-Z), compare avec `localeCompare` insensible à la casse
  return String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' })
}

export function useSortableList<T>(opts: UseSortableListOptions<T>): UseSortableListReturn<T> {
  const sortState = ref<SortState>({ key: null, direction: 'neutral' })

  const sorted = computed<T[]>(() => {
    const list = opts.filter ? opts.items.value.filter(opts.filter) : [...opts.items.value]

    // Sépare les items épinglés des autres pour les remettre en tête après tri.
    let pinned: T[] = []
    let rest: T[] = list
    if (opts.pinnedPredicate) {
      pinned = list.filter(opts.pinnedPredicate)
      rest = list.filter(item => !opts.pinnedPredicate!(item))
    }

    const { key, direction } = sortState.value
    if (key && direction !== 'neutral') {
      const sign = direction === 'desc' ? -1 : 1
      rest = [...rest].sort((a, b) => sign * compareValues(opts.getValue(a, key), opts.getValue(b, key)))
    }
    // Sinon : ordre d'origine (rest est déjà la liste filtrée non triée)

    return [...pinned, ...rest]
  })

  function cycleSort(key: string) {
    const current = sortState.value
    if (current.key !== key) {
      // Nouvelle key : on attaque par desc (le plus utile par défaut sur des scores).
      sortState.value = { key, direction: 'desc' }
      return
    }
    // Même key : cycle desc → asc → neutral
    const next: SortDirection =
      current.direction === 'desc' ? 'asc' :
      current.direction === 'asc' ? 'neutral' :
      'desc'
    sortState.value = { key: next === 'neutral' ? null : key, direction: next }
  }

  function resetSort() {
    sortState.value = { key: null, direction: 'neutral' }
  }

  return { sorted, sortState, cycleSort, resetSort }
}
