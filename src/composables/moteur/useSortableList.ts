/**
 * Composable tri générique (Radar, Capitaine, Lieutenants, Lexique).
 * N critères, direction cyclique, item épinglé haut, filtre amont optionnel.
 * Caller fournit getValue() : composable agnostique domaine.
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
 * Compare deux valeurs définies (non null/undefined) selon leur type.
 * Renvoie un nombre négatif si a < b, positif si a > b.
 *
 * IMPORTANT : la gestion des null/undefined est faite **en amont** dans le
 * .sort() callback, pour que les nulls restent toujours en bas peu importe
 * la direction (sinon `sign * compareValues(null, X)` enverrait null en haut
 * en mode desc — bug).
 */
function compareDefined(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
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
      rest = [...rest].sort((a, b) => {
        const va = opts.getValue(a, key)
        const vb = opts.getValue(b, key)
        // null/undefined toujours en bas, indépendamment de la direction.
        // Sans cette règle, `sign * 1` envoie les nulls en haut quand on trie desc.
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        return sign * compareDefined(va, vb)
      })
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
