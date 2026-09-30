/**
 * FR-CAP-ROOTS, FR-CAP-INPUT — études du Capitaine au geste près.
 *
 * - Une racine relue de la base arrive sans ses mesures : la choisir l'étudie
 *   (au lieu d'afficher « — » partout), et un échec d'étude remonte pour que
 *   l'écran dise « Impossible de valider … » (recette 2026-09-30, CAP-20 geste 4).
 * - Une racine déjà mesurée s'affiche sans nouvel appel.
 * - Deux demandes d'étude du même mot-clé pendant que la première tourne n'en
 *   font qu'une (double-clic sur « Analyser », recette 05 point 3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExploredKeywords } from '@/composables/keyword/useExploredKeywords'
import type { CaptainScanEntry, RichRootKeyword } from '@shared/types/keyword.types'

const scans: string[] = []
let failScans = false
let hold: Array<() => void> = []
let holdScans = false

vi.mock('@/services/api.service', () => ({
  apiPost: vi.fn(async (url: string) => {
    const keyword = decodeURIComponent(url.split('/').slice(-2)[0]!)
    scans.push(keyword)
    if (holdScans) await new Promise<void>(resolve => hold.push(resolve))
    if (failScans) throw new Error('Keyword validation failed')
    return {
      keyword,
      articleLevel: 'intermediaire',
      kpis: [{ name: 'volume', rawValue: 900, color: 'green', label: '900' }],
      verdict: { level: 'GO', greenCount: 1, totalKpis: 1, autoNoGo: false },
      fromCache: false,
      cachedAt: null,
    }
  }),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const HISTORY: CaptainScanEntry[] = [
  { keyword: 'prix recette b 2026', kpis: [{ name: 'volume', rawValue: 673000 }], articleLevel: 'intermediaire', rootKeywords: ['prix recette b'] },
]
// Forme renvoyée par le serveur à la relecture : racines sans indicateurs.
const ROOTS: RichRootKeyword[] = [
  { keyword: 'prix recette b', parentKeyword: 'prix recette b 2026', kpis: [], articleLevel: 'intermediaire', timestamp: '' },
]

beforeEach(() => {
  scans.length = 0
  failScans = false
  holdScans = false
  hold = []
})

describe('FR-CAP-ROOTS — racine relue sans mesure', () => {
  it('la choisir l’étudie, et affiche ses mesures', async () => {
    const carousel = useExploredKeywords()
    carousel.restoreFromHistory(HISTORY, 'intermediaire', ROOTS)
    expect(carousel.entries.value[0]!.rootVariants.get('prix recette b')!.validation.kpis, 'relue sans mesure').toEqual([])

    await carousel.addRootVariantToEntry(0, 'prix recette b', [0, 1, 2], 'intermediaire', 'Titre', 7)
    expect(scans).toEqual(['prix recette b'])
    expect(carousel.entries.value[0]!.card.keyword).toBe('prix recette b')
    expect(carousel.entries.value[0]!.validation!.kpis).toHaveLength(1)
  })

  it('une étude en échec remonte l’erreur (l’écran dit « Impossible de valider »), sans carte « — » muette', async () => {
    failScans = true
    const carousel = useExploredKeywords()
    carousel.restoreFromHistory(HISTORY, 'intermediaire', ROOTS)
    await expect(carousel.addRootVariantToEntry(0, 'prix recette b', [0, 1, 2], 'intermediaire', 'Titre', 7))
      .rejects.toThrow('Keyword validation failed')
    expect(carousel.entries.value[0]!.card.keyword, 'la carte reste sur le mot-clé complet').toBe('prix recette b 2026')
  })

  it('une racine déjà mesurée s’affiche sans nouvel appel', async () => {
    const carousel = useExploredKeywords()
    carousel.restoreFromHistory(HISTORY, 'intermediaire', ROOTS)
    await carousel.addRootVariantToEntry(0, 'prix recette b', [0, 1, 2], 'intermediaire')
    await carousel.addRootVariantToEntry(0, 'prix recette b', [0, 1, 2], 'intermediaire')
    expect(scans).toEqual(['prix recette b'])
  })
})

describe('FR-CAP-INPUT — une seule étude à la fois par mot-clé', () => {
  it('double demande pendant l’étude : un seul appel', async () => {
    holdScans = true
    const carousel = useExploredKeywords()
    const first = carousel.addEntry('zqxw vitrine kvj', 'intermediaire')
    const second = carousel.addEntry('ZQXW vitrine kvj ', 'intermediaire')
    expect(carousel.isScanning('zqxw vitrine kvj')).toBe(true)
    hold.forEach(resolve => resolve())
    await Promise.all([first, second])
    expect(scans).toEqual(['zqxw vitrine kvj'])
    expect(carousel.entries.value).toHaveLength(1)
    expect(carousel.entries.value[0]!.validation, 'la première étude n’est pas perdue').not.toBeNull()
    expect(carousel.isScanning('zqxw vitrine kvj')).toBe(false)
  })

  it('une fois l’étude finie, redemander ré-étudie (geste explicite)', async () => {
    const carousel = useExploredKeywords()
    await carousel.addEntry('agence web', 'intermediaire')
    await carousel.addEntry('agence web', 'intermediaire')
    expect(scans).toEqual(['agence web', 'agence web'])
  })
})
