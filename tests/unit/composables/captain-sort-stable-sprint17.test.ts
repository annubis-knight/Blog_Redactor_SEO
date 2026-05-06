/**
 * Sprint 17 — Tests de régression FR-CAP-SORT-STABLE-ON-ROOT-VARIANT.
 *
 * Bug A : avant Sprint 17, le tri du Capitaine lisait `entry.card.keyword`,
 * qui change quand l'utilisateur active une racine (entry.card est remplacée
 * par la variante racine). La position de la card dans la liste changeait
 * donc à chaque clic sur un mot souligné — comportement non désiré.
 *
 * Fix : le tri (et le pinnedPredicate) lisent `entry.originalCard.keyword`,
 * qui reste stable même quand la racine active change.
 *
 * Ce fichier teste useSortableList directement avec le pattern utilisé par
 * CaptainPanel pour valider l'invariant.
 */
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSortableList } from '../../../src/composables/moteur/useSortableList'

interface FakeEntry {
  originalCard: { keyword: string; relevanceScore: { total: number } | null }
  card: { keyword: string; relevanceScore: { total: number } | null }
}

function makeEntry(originalKw: string, originalScore: number, currentKw?: string, currentScore?: number): FakeEntry {
  return {
    originalCard: { keyword: originalKw, relevanceScore: { total: originalScore } },
    card: {
      keyword: currentKw ?? originalKw,
      relevanceScore: { total: currentScore ?? originalScore },
    },
  }
}

describe('Sprint 17 — Tri Capitaine stable (FR-CAP-SORT-STABLE-ON-ROOT-VARIANT)', () => {
  it('AC.17.A.1 — Activer une racine ne change pas la position dans le tri A-Z', () => {
    const entries = ref<FakeEntry[]>([
      makeEntry('voiture electrique pas chere', 50),
      makeEntry('a meilleur keyword', 80),
      makeEntry('z keyword', 30),
    ])

    const { sorted, cycleSort } = useSortableList<FakeEntry>({
      items: entries,
      getValue: (entry, key) => {
        if (key === 'az') return entry.originalCard.keyword
        if (key === 'score') return entry.originalCard.relevanceScore?.total ?? null
        return null
      },
    })

    cycleSort('az')  // direction desc

    const indexOfVoiture = sorted.value.findIndex(
      e => e.originalCard.keyword === 'voiture electrique pas chere',
    )
    expect(indexOfVoiture).toBeGreaterThanOrEqual(0)
    const positionBefore = indexOfVoiture

    // Simulation : utilisateur active une racine — `card` est remplacée par
    // la variante racine. originalCard reste inchangée.
    entries.value[0]!.card = {
      keyword: 'voiture electrique',  // racine plus courte
      relevanceScore: { total: 50 },
    }

    const indexOfVoitureAfter = sorted.value.findIndex(
      e => e.originalCard.keyword === 'voiture electrique pas chere',
    )
    expect(indexOfVoitureAfter).toBe(positionBefore)
  })

  it('AC.17.A.2 — pinnedPredicate match originalCard.keyword OU card.keyword', () => {
    const entries = ref<FakeEntry[]>([
      makeEntry('voiture electrique pas chere', 50, 'voiture electrique', 50),
      makeEntry('autre keyword', 80),
    ])
    const lockedKeyword = ref<string | null>(null)

    const { sorted } = useSortableList<FakeEntry>({
      items: entries,
      getValue: (entry, key) => {
        if (key === 'az') return entry.originalCard.keyword
        return null
      },
      pinnedPredicate: (entry) => {
        if (lockedKeyword.value === null) return false
        return entry.originalCard.keyword === lockedKeyword.value
            || entry.card.keyword === lockedKeyword.value
      },
    })

    // Lock sur la racine active (card.keyword) : la card pinned remonte en haut
    lockedKeyword.value = 'voiture electrique'
    expect(sorted.value[0]?.originalCard.keyword).toBe('voiture electrique pas chere')

    // Lock sur l'originalCard.keyword : pareil
    lockedKeyword.value = 'voiture electrique pas chere'
    expect(sorted.value[0]?.originalCard.keyword).toBe('voiture electrique pas chere')
  })
})
