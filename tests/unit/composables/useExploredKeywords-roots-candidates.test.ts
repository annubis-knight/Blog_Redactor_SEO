/**
 * FR-CAP-LOCK-INTEGRITY, FR-CAP-ROOTS — une racine n'est jamais un candidat d'office.
 *
 * Recette du 2026-09-30 : cliquer un mot d'une carte du Capitaine faisait
 * enregistrer la racine affichée comme un candidat de plus ; la liste se
 * reconstruisait alors avec la racine en carte à part, sortie de la colonne des
 * racines (défaut rendu systématique par le correctif CAP-7, qui a rétabli
 * l'enregistrement des études d'un article jamais étudié). La relecture range
 * désormais une telle étude sous son mot-clé long, avec ses mesures enregistrées.
 */
import { describe, it, expect, vi } from 'vitest'
import { useExploredKeywords } from '@/composables/keyword/useExploredKeywords'
import type { CaptainScanEntry, RichRootKeyword } from '@shared/types/keyword.types'

vi.mock('@/services/api.service', () => ({ apiPost: vi.fn() }))
vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const PARENT = 'prix creation site internet toulouse'
const ROOT = 'prix creation site internet'

// Historique tel que l'enregistrait l'ancienne version : la racine y figure
// aussi comme une étude à part, avec ses mesures.
const HISTORY: CaptainScanEntry[] = [
  { keyword: PARENT, kpis: [{ name: 'volume', rawValue: 673000 }], articleLevel: 'intermediaire', rootKeywords: [ROOT] },
  { keyword: ROOT, kpis: [{ name: 'volume', rawValue: 550000 }], articleLevel: 'intermediaire', rootKeywords: [] },
  { keyword: 'agence web toulouse', kpis: [{ name: 'volume', rawValue: 1200 }], articleLevel: 'intermediaire', rootKeywords: [] },
]
// Forme renvoyée par le serveur à la relecture : racines sans indicateurs.
const ROOTS: RichRootKeyword[] = [
  { keyword: ROOT, parentKeyword: PARENT, kpis: [], articleLevel: 'intermediaire', timestamp: '' },
]

describe('FR-CAP-LOCK-INTEGRITY, FR-CAP-ROOTS — restoreFromHistory', () => {
  it('range la racine sous son mot-clé long, pas en carte à part', () => {
    const carousel = useExploredKeywords()
    carousel.restoreFromHistory(HISTORY, 'intermediaire', ROOTS)
    expect(carousel.entries.value.map(e => e.card.keyword)).toEqual([PARENT, 'agence web toulouse'])
    expect([...carousel.entries.value[0]!.rootVariants.keys()]).toEqual([ROOT])
  })

  it('donne à la racine les mesures de sa propre étude enregistrée', () => {
    const carousel = useExploredKeywords()
    carousel.restoreFromHistory(HISTORY, 'intermediaire', ROOTS)
    const variant = carousel.entries.value[0]!.rootVariants.get(ROOT)!
    expect(variant.validation.kpis.map(k => k.rawValue)).toEqual([550000])
  })
})
