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

  it('AC.17.A.2 — pinnedPredicate match UNIQUEMENT sur originalCard.keyword (Sprint 18)', () => {
    // Setup : 2 entries dont la 1ère a une racine active différente de son originalCard.
    // Ordre d'insertion : ["voiture electrique pas chere", "autre keyword"].
    const entries = ref<FakeEntry[]>([
      makeEntry('voiture electrique pas chere', 50, 'voiture electrique', 50),
      makeEntry('autre keyword', 80),
    ])
    const lockedKeyword = ref<string | null>(null)

    const isPinned = (entry: FakeEntry) =>
      lockedKeyword.value !== null && entry.originalCard.keyword === lockedKeyword.value

    const { sorted } = useSortableList<FakeEntry>({
      items: entries,
      getValue: (entry, key) => {
        if (key === 'az') return entry.originalCard.keyword
        return null
      },
      pinnedPredicate: isPinned,
    })

    // Cas 1 : lockedKeyword = la racine active "voiture electrique".
    // L'originalCard de l'entry 0 est "voiture electrique pas chere" — donc NE MATCHE PAS.
    // Aucun pin actif → ordre d'insertion respecté.
    lockedKeyword.value = 'voiture electrique'
    expect(isPinned(entries.value[0]!)).toBe(false)
    expect(sorted.value.filter(isPinned).length).toBe(0)

    // Cas 2 : lockedKeyword = l'originalCard de l'entry 0.
    // Le predicate match → pin actif → l'entry remonte en tête.
    lockedKeyword.value = 'voiture electrique pas chere'
    expect(isPinned(entries.value[0]!)).toBe(true)
    expect(sorted.value[0]?.originalCard.keyword).toBe('voiture electrique pas chere')
  })
})
