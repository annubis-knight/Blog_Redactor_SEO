/**
 * Tests du composable de tri générique `useSortableList`. Couvre :
 *   - Tri numérique et string
 *   - Cycle desc → asc → neutral
 *   - Items "pinned" (épinglés en haut, ex: lock Capitaine)
 *   - Filtre amont (ex: CPC sur Radar)
 *   - Stabilité null/undefined (toujours en bas)
 */
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSortableList } from '../../../../src/composables/moteur/useSortableList'

interface Item {
  keyword: string
  score: number | null
  cpc?: number
  locked?: boolean
}

const SAMPLE: Item[] = [
  { keyword: 'banane', score: 80 },
  { keyword: 'abricot', score: 50 },
  { keyword: 'cerise', score: 100 },
  { keyword: 'datte', score: null },
]

describe('useSortableList — tri par défaut (neutral)', () => {
  it('renvoie l\'ordre d\'origine si state.direction = neutral', () => {
    const items = ref([...SAMPLE])
    const { sorted } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    expect(sorted.value.map(i => i.keyword)).toEqual(['banane', 'abricot', 'cerise', 'datte'])
  })
})

describe('useSortableList — cycleSort', () => {
  it('first click sur une key passe directement en desc', () => {
    const items = ref([...SAMPLE])
    const { sorted, cycleSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    cycleSort('score')
    expect(sorted.value.map(i => i.keyword)).toEqual(['cerise', 'banane', 'abricot', 'datte'])
  })

  it('second click cycle vers asc', () => {
    const items = ref([...SAMPLE])
    const { sorted, cycleSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    cycleSort('score')
    cycleSort('score')
    expect(sorted.value.map(i => i.keyword)).toEqual(['abricot', 'banane', 'cerise', 'datte'])
  })

  it('third click revient à neutral (ordre d\'origine)', () => {
    const items = ref([...SAMPLE])
    const { sorted, cycleSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    cycleSort('score')
    cycleSort('score')
    cycleSort('score')
    expect(sorted.value.map(i => i.keyword)).toEqual(['banane', 'abricot', 'cerise', 'datte'])
  })

  it('changer de key repart sur desc', () => {
    const items = ref([...SAMPLE])
    const { sorted, sortState, cycleSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    cycleSort('score')
    cycleSort('az')
    expect(sortState.value).toEqual({ key: 'az', direction: 'desc' })
    expect(sorted.value.map(i => i.keyword)).toEqual(['datte', 'cerise', 'banane', 'abricot'])
  })
})

describe('useSortableList — null values', () => {
  it('null/undefined sont toujours en bas, peu importe la direction', () => {
    const items = ref([...SAMPLE])
    const { sorted, cycleSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    cycleSort('score') // desc
    expect(sorted.value[sorted.value.length - 1].keyword).toBe('datte')
    cycleSort('score') // asc
    expect(sorted.value[sorted.value.length - 1].keyword).toBe('datte')
  })
})

describe('useSortableList — pinnedPredicate', () => {
  it('items épinglés restent en tête, peu importe le tri', () => {
    const items = ref<Item[]>([
      { keyword: 'banane', score: 80 },
      { keyword: 'abricot', score: 50, locked: true },
      { keyword: 'cerise', score: 100 },
    ])
    const { sorted, cycleSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
      pinnedPredicate: (it) => !!it.locked,
    })
    // Tri par score desc → cerise(100) puis banane(80), mais abricot reste en TÊTE (pinned)
    cycleSort('score')
    expect(sorted.value.map(i => i.keyword)).toEqual(['abricot', 'cerise', 'banane'])
  })

  it('plusieurs items épinglés sont tous en tête', () => {
    const items = ref<Item[]>([
      { keyword: 'banane', score: 80 },
      { keyword: 'abricot', score: 50, locked: true },
      { keyword: 'cerise', score: 100, locked: true },
    ])
    const { sorted, cycleSort } = useSortableList<Item>({
      items,
      getValue: (_, key) => (key === 'az' ? '' : 0),
      pinnedPredicate: (it) => !!it.locked,
    })
    cycleSort('score')
    expect(sorted.value.slice(0, 2).map(i => i.keyword).sort()).toEqual(['abricot', 'cerise'])
    expect(sorted.value[2].keyword).toBe('banane')
  })
})

describe('useSortableList — filter', () => {
  it('le filtre amont retire des items avant tri', () => {
    const items = ref<Item[]>([
      { keyword: 'a', score: 10, cpc: 0 },
      { keyword: 'b', score: 20, cpc: 5 },
      { keyword: 'c', score: 30, cpc: 0 },
    ])
    const { sorted } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
      filter: (it) => (it.cpc ?? 0) > 0,
    })
    expect(sorted.value).toHaveLength(1)
    expect(sorted.value[0].keyword).toBe('b')
  })
})

describe('useSortableList — A-Z accent insensitivity (fr)', () => {
  it('tri alphabétique français insensible aux accents', () => {
    const items = ref<Item[]>([
      { keyword: 'éviction', score: 0 },
      { keyword: 'abricot', score: 0 },
      { keyword: 'évidence', score: 0 },
    ])
    const { sorted, cycleSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    cycleSort('az') // desc
    cycleSort('az') // asc
    // En asc fr (sensitivity:base), évic- < évid- (c < d en 4e position)
    // donc abricot < éviction < évidence
    expect(sorted.value.map(i => i.keyword)).toEqual(['abricot', 'éviction', 'évidence'])
  })
})

describe('useSortableList — resetSort', () => {
  it('remet l\'état initial', () => {
    const items = ref([...SAMPLE])
    const { sortState, cycleSort, resetSort } = useSortableList<Item>({
      items,
      getValue: (it, key) => (key === 'az' ? it.keyword : it.score),
    })
    cycleSort('score')
    expect(sortState.value.key).toBe('score')
    resetSort()
    expect(sortState.value).toEqual({ key: null, direction: 'neutral' })
  })
})
