/**
 * FR-CAP-ROOTS — les racines d'un mot-clé long, juste après l'étude et à la
 * réouverture (recette du 2026-09-30, CAP-15).
 *
 * - Juste après l'étude : les racines s'affichaient dans l'ordre où leurs
 *   études aboutissaient ; elles vont de la plus longue à la plus courte,
 *   quel que soit l'ordre d'arrivée.
 * - À la réouverture : une racine sans étude enregistrée pour l'article, que
 *   la base connaît déjà (`keyword_metrics`), revient avec ses indicateurs,
 *   ses questions et son Score Pertinence, sans appel ; une racine jamais
 *   mesurée reste à étudier au clic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExploredKeywords, isVariantMeasured } from '@/composables/keyword/useExploredKeywords'
import { extractRoots } from '@/composables/keyword/useCapitaineScan'
import type { CaptainScanEntry, RichRootKeyword } from '@shared/types/keyword.types'

const scans: string[] = []
const pending = new Map<string, () => void>()

vi.mock('@/services/api.service', () => ({
  apiPost: vi.fn(async (url: string) => {
    const keyword = decodeURIComponent(url.split('/').slice(-2)[0]!)
    scans.push(keyword)
    const isParent = keyword === PARENT
    // Les racines attendent qu'on les libère, dans l'ordre choisi par le test.
    if (!isParent) await new Promise<void>(resolve => pending.set(keyword, resolve))
    return {
      keyword,
      articleLevel: 'intermediaire',
      // Volume du mot-clé long pas au vert : ses racines sont étudiées d'office.
      kpis: [{ name: 'volume', rawValue: isParent ? 10 : 900, color: isParent ? 'red' : 'green', label: 'Volume' }],
      verdict: { level: 'ORANGE', greenCount: 0, totalKpis: 1, autoNoGo: false },
      fromCache: false,
      cachedAt: null,
      relevanceScore: null,
    }
  }),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const PARENT = 'cours piano intermédiaire paris enfants'

beforeEach(() => {
  scans.length = 0
  pending.clear()
})

async function until(check: () => boolean) {
  for (let i = 0; i < 50 && !check(); i++) await new Promise(r => setTimeout(r, 0))
}

describe('FR-CAP-ROOTS — ordre des racines juste après l’étude', () => {
  it('de la plus longue à la plus courte, même si les plus courtes aboutissent d’abord', async () => {
    const roots = extractRoots(PARENT)
    expect(roots.length).toBeGreaterThanOrEqual(3)

    const carousel = useExploredKeywords()
    const study = carousel.addEntry(PARENT, 'intermediaire', 'Cours de piano', 7, 'Mon enfant décroche du piano')
    await until(() => pending.size === roots.length)
    // Les études aboutissent de la plus courte à la plus longue.
    for (const root of [...roots].reverse()) {
      pending.get(root)!()
      await new Promise(r => setTimeout(r, 0))
    }
    await study

    expect([...carousel.entries.value[0]!.rootVariants.keys()]).toEqual(roots)
  })
})

describe('FR-CAP-ROOTS — racine relue sans étude enregistrée', () => {
  const HISTORY: CaptainScanEntry[] = [
    { keyword: 'création site internet toulouse', kpis: [{ name: 'volume', rawValue: 90 }], articleLevel: 'intermediaire', rootKeywords: ['création site internet', 'création site'] },
  ]
  // Forme renvoyée par le serveur : « création site internet » est connue de la
  // base (mesures communes), « création site » jamais mesurée.
  const ROOTS: RichRootKeyword[] = [
    {
      keyword: 'création site internet', parentKeyword: 'création site internet toulouse', articleLevel: 'intermediaire', timestamp: '',
      kpis: [{ name: 'volume', rawValue: 673000 }, { name: 'kd', rawValue: 54 }, { name: 'cpc', rawValue: 4.63 }],
      paaQuestions: [{ question: 'Quel est le prix d’un site internet ?', answer: null, match: 'partial', matchQuality: 'stem' }],
      relevanceScore: { total: 62, verdict: 'GO', breakdown: {} as never, rootsContext: {} as never },
      relevanceUnavailableReason: null,
    },
    { keyword: 'création site', parentKeyword: 'création site internet toulouse', articleLevel: 'intermediaire', timestamp: '', kpis: [] },
  ]

  it('ses mesures connues reviennent sans appel : indicateurs, questions, Score Pertinence', () => {
    const carousel = useExploredKeywords()
    carousel.restoreFromHistory(HISTORY, 'intermediaire', ROOTS)
    const variant = carousel.entries.value[0]!.rootVariants.get('création site internet')!

    expect(scans).toEqual([])
    expect(isVariantMeasured(variant)).toBe(true)
    expect(variant.card.kpis!.searchVolume).toBe(673000)
    expect(variant.card.paaItems.map(p => p.question)).toEqual(['Quel est le prix d’un site internet ?'])
    expect(variant.card.relevanceScore?.total).toBe(62)
  })

  it('une racine jamais mesurée reste à étudier au clic, de la plus longue à la plus courte', () => {
    const carousel = useExploredKeywords()
    carousel.restoreFromHistory(HISTORY, 'intermediaire', ROOTS)
    const entry = carousel.entries.value[0]!

    expect([...entry.rootVariants.keys()]).toEqual(['création site internet', 'création site'])
    expect(isVariantMeasured(entry.rootVariants.get('création site')!)).toBe(false)
    expect(scans).toEqual([])
  })
})
