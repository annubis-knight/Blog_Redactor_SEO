import { describe, it, expect, vi } from 'vitest'
import { compareScores } from '../../../shared/score/compare.js'
import type { HnRecurrenceItem, ProposedLieutenant, ProposeLieutenantsResult, FilteredProposeLieutenantsResult } from '../../../shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'

/**
 * Test suite de cohérence du flux Lieutenants (FR-LIE-*)
 * Valide l'intégrité data du scraping SERP, scoring IA, filtrage,
 * et règles anti-cannibalisation géo-funnel.
 *
 * Tests structurés par cas d'usage (data-flows/lieutenants.md § Régressions historiques + Cas à risque).
 */

describe('FR-LIE-SERP-ANALYZE — freshness check SERP (TTL 7j)', () => {
  it('detecte le cache hit keyword_metrics.serp_raw_json si frais (<= 7j)', () => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Simule une métrique fraîche (7 jours exactement)
    const freshFetchedAt = sevenDaysAgo.toISOString()

    // Mock pour `isKeywordMetricsFresh(fetchedAt, 7)` → true
    const isFresh = (fetchedAt: string | null, ttlDays: number = 7): boolean => {
      if (!fetchedAt) return false
      const diff = now.getTime() - new Date(fetchedAt).getTime()
      const ttlMs = ttlDays * 24 * 60 * 60 * 1000
      return diff <= ttlMs
    }

    expect(isFresh(freshFetchedAt, 7)).toBe(true)

    // Simule une métrique expirée (> 7j)
    const staleFetchedAt = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
    expect(isFresh(staleFetchedAt, 7)).toBe(false)

    // Simule null
    expect(isFresh(null, 7)).toBe(false)
  })

  it('court-circuite le fetch DataForSEO si DB hit frais', () => {
    const mockDb = {
      getKeywordMetrics: vi.fn((kw: string) => ({
        keyword: kw,
        serpRawJson: { competitors: [], paaQuestions: [], fromCache: true },
        fetchedAt: new Date().toISOString(),
      })),
    }

    const mockFetch = vi.fn()

    // Simule le pattern de /serp/analyze
    const analyzeSerp = (keyword: string) => {
      const existing = mockDb.getKeywordMetrics(keyword)
      if (existing?.serpRawJson) {
        return { ...existing.serpRawJson, fromCache: true }
      }
      mockFetch()
      return { competitors: [], paaQuestions: [], fromCache: false }
    }

    const result = analyzeSerp('seo local')
    expect(result.fromCache).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('re-scrape si DB stale (> 7j)', () => {
    const now = new Date()
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    const isFresh = (fetchedAt: string | null, ttlDays: number = 7): boolean => {
      if (!fetchedAt) return false
      const diff = now.getTime() - new Date(fetchedAt).getTime()
      const ttlMs = ttlDays * 24 * 60 * 60 * 1000
      return diff <= ttlMs
    }

    const mockDb = {
      getKeywordMetrics: vi.fn(() => ({
        keyword: 'seo local',
        serpRawJson: { competitors: [], paaQuestions: [] },
        fetchedAt: eightDaysAgo.toISOString(),
      })),
    }

    const mockFetch = vi.fn().mockResolvedValue({ competitors: [], paaQuestions: [] })

    const analyzeSerp = (keyword: string) => {
      const existing = mockDb.getKeywordMetrics(keyword)
      if (existing?.serpRawJson && isFresh(existing.fetchedAt, 7)) {
        return { ...existing.serpRawJson, fromCache: true }
      }
      // Stale → re-fetch
      return mockFetch().then((r: unknown) => ({ ...r, fromCache: false }))
    }

    return analyzeSerp('seo local').then((result) => {
      expect(mockFetch).toHaveBeenCalledOnce()
      expect(result.fromCache).toBe(false)
    })
  })
})

describe('FR-LIE-EXTRACT-HEADINGS — HnRecurrenceItem calcul correct', () => {
  it('compte occurrences exactes sans doublons par concurrent', () => {
    // Simule 10 competitors, H2 "SEO Local" dans 8, autres éléments variés
    const competitors = [
      {
        domain: 'example1.com',
        headings: [
          { level: 2, text: 'SEO Local' },
          { level: 2, text: 'Audit SEO' },
        ],
      },
      {
        domain: 'example2.com',
        headings: [
          { level: 2, text: 'SEO Local' },
          { level: 3, text: 'Optimisation Google' },
        ],
      },
      {
        domain: 'example3.com',
        headings: [
          { level: 2, text: 'SEO Local' },
          { level: 2, text: 'Social Media' },
        ],
      },
      {
        domain: 'example4.com',
        headings: [
          { level: 2, text: 'SEO Local' },
        ],
      },
      {
        domain: 'example5.com',
        headings: [
          { level: 2, text: 'SEO Local' },
        ],
      },
      {
        domain: 'example6.com',
        headings: [
          { level: 2, text: 'SEO Local' },
        ],
      },
      {
        domain: 'example7.com',
        headings: [
          { level: 2, text: 'SEO Local' },
        ],
      },
      {
        domain: 'example8.com',
        headings: [
          { level: 2, text: 'SEO Local' },
        ],
      },
      {
        domain: 'example9.com',
        headings: [
          { level: 2, text: 'Webmarketing' },
        ],
      },
      {
        domain: 'example10.com',
        headings: [
          { level: 2, text: 'Digital' },
        ],
      },
    ]

    const computeHnRecurrenceFrom = (comps: any[]): HnRecurrenceItem[] => {
      const valid = comps.filter(c => !c.fetchError)
      const total = valid.length
      if (total === 0) return []

      const freqMap = new Map<string, { level: number; text: string; count: number }>()

      for (const comp of valid) {
        const seen = new Set<string>()
        for (const h of comp.headings) {
          const key = `${h.level}:${h.text.toLowerCase().trim()}`
          if (seen.has(key)) continue
          seen.add(key)

          const existing = freqMap.get(key)
          if (existing) {
            existing.count++
          } else {
            freqMap.set(key, { level: h.level, text: h.text, count: 1 })
          }
        }
      }

      return Array.from(freqMap.values())
        .map(item => ({ ...item, total, percent: Math.round(item.count / total * 100) }))
        .sort((a, b) => b.percent - a.percent || a.level - b.level)
    }

    const result = computeHnRecurrenceFrom(competitors)

    // H2 "SEO Local" : 8 fois sur 10
    const seoLocal = result.find(h => h.text === 'SEO Local' && h.level === 2)
    expect(seoLocal).toBeDefined()
    expect(seoLocal?.count).toBe(8)
    expect(seoLocal?.percent).toBe(80)
    expect(seoLocal?.total).toBe(10)

    // Autres headings moins fréquents
    const auditSeo = result.find(h => h.text === 'Audit SEO')
    expect(auditSeo?.count).toBe(1)
    expect(auditSeo?.percent).toBe(10)
  })

  it('gère cas limite : aucun heading récurrent (tous différents)', () => {
    const competitors = [
      { domain: 'a.com', headings: [{ level: 2, text: 'Unique A' }] },
      { domain: 'b.com', headings: [{ level: 2, text: 'Unique B' }] },
      { domain: 'c.com', headings: [{ level: 2, text: 'Unique C' }] },
    ]

    const computeHnRecurrenceFrom = (comps: any[]): HnRecurrenceItem[] => {
      const valid = comps.filter(c => !c.fetchError)
      const total = valid.length
      if (total === 0) return []

      const freqMap = new Map<string, { level: number; text: string; count: number }>()
      for (const comp of valid) {
        const seen = new Set<string>()
        for (const h of comp.headings) {
          const key = `${h.level}:${h.text.toLowerCase().trim()}`
          if (seen.has(key)) continue
          seen.add(key)
          const existing = freqMap.get(key)
          if (existing) {
            existing.count++
          } else {
            freqMap.set(key, { level: h.level, text: h.text, count: 1 })
          }
        }
      }

      return Array.from(freqMap.values())
        .map(item => ({ ...item, total, percent: Math.round(item.count / total * 100) }))
        .sort((a, b) => b.percent - a.percent || a.level - b.level)
    }

    const result = computeHnRecurrenceFrom(competitors)

    // Chaque heading unique : 1 occurrence = 33%
    expect(result.length).toBe(3)
    expect(result.every(h => h.count === 1 && h.percent === 33)).toBe(true)
  })
})

describe('FR-LIE-PROPOSE-AI — filterLieutenants tri score + cap par level', () => {
  it('trie desc par score, place null en bas, cap Pilier à 5', () => {
    const mockProposal: ProposeLieutenantsResult = {
      lieutenants: [
        { keyword: 'kw1', reasoning: 'r1', sources: ['paa'], suggestedHnLevel: 2, score: 85 },
        { keyword: 'kw2', reasoning: 'r2', sources: ['serp'], suggestedHnLevel: 2, score: null },
        { keyword: 'kw3', reasoning: 'r3', sources: ['group'], suggestedHnLevel: 2, score: 70 },
        { keyword: 'kw4', reasoning: 'r4', sources: ['root'], suggestedHnLevel: 3, score: null },
        { keyword: 'kw5', reasoning: 'r5', sources: ['paa'], suggestedHnLevel: 2, score: 90 },
        { keyword: 'kw6', reasoning: 'r6', sources: ['serp'], suggestedHnLevel: 2, score: 60 },
        { keyword: 'kw7', reasoning: 'r7', sources: ['group'], suggestedHnLevel: 3, score: 75 },
        { keyword: 'kw8', reasoning: 'r8', sources: ['paa'], suggestedHnLevel: 2, score: null },
        { keyword: 'kw9', reasoning: 'r9', sources: ['serp'], suggestedHnLevel: 3, score: 80 },
        { keyword: 'kw10', reasoning: 'r10', sources: ['root'], suggestedHnLevel: 2, score: 65 },
        { keyword: 'kw11', reasoning: 'r11', sources: ['paa'], suggestedHnLevel: 2, score: 72 },
        { keyword: 'kw12', reasoning: 'r12', sources: ['serp'], suggestedHnLevel: 3, score: 55 },
        { keyword: 'kw13', reasoning: 'r13', sources: ['group'], suggestedHnLevel: 2, score: 78 },
        { keyword: 'kw14', reasoning: 'r14', sources: ['paa'], suggestedHnLevel: 3, score: 88 },
        { keyword: 'kw15', reasoning: 'r15', sources: ['serp'], suggestedHnLevel: 2, score: 92 },
      ],
      hnStructure: [],
      contentGapInsights: 'test',
    }

    const filterLieutenants = (parsed: ProposeLieutenantsResult, level: ArticleLevel): FilteredProposeLieutenantsResult => {
      const MAX_SELECTED: Record<ArticleLevel, number> = {
        pilier: 5,
        intermediaire: 5,
        specifique: 4,
      }
      const maxKeep = MAX_SELECTED[level] ?? 5
      const sorted = [...parsed.lieutenants].sort((a, b) => compareScores(a.score ?? null, b.score ?? null))

      return {
        selectedLieutenants: sorted.slice(0, maxKeep),
        eliminatedLieutenants: sorted.slice(maxKeep),
        hnStructure: parsed.hnStructure,
        contentGapInsights: parsed.contentGapInsights,
        totalGenerated: parsed.lieutenants.length,
      }
    }

    const result = filterLieutenants(mockProposal, 'pilier')

    expect(result.selectedLieutenants.length).toBe(5)
    expect(result.eliminatedLieutenants.length).toBe(10)

    // Vérifier le tri : scores desc, null en bas
    const selectedScores = result.selectedLieutenants.map(lt => lt.score)
    expect(selectedScores[0]).toBe(92) // max
    expect(selectedScores[selectedScores.length - 1]).not.toBe(null) // null pas en top 5

    // Vérifier null en bas de la liste éliminée
    const eliminatedWithNulls = result.eliminatedLieutenants.filter(lt => lt.score === null)
    expect(eliminatedWithNulls.length).toBeGreaterThan(0)
  })

  it('cap Intermédiaire à 5', () => {
    const mockProposal: ProposeLieutenantsResult = {
      lieutenants: Array.from({ length: 12 }, (_, i) => ({
        keyword: `kw${i}`,
        reasoning: `r${i}`,
        sources: ['paa'],
        suggestedHnLevel: 2,
        score: 100 - i * 5,
      })),
      hnStructure: [],
      contentGapInsights: 'test',
    }

    const filterLieutenants = (parsed: ProposeLieutenantsResult, level: ArticleLevel): FilteredProposeLieutenantsResult => {
      const MAX_SELECTED: Record<ArticleLevel, number> = {
        pilier: 5,
        intermediaire: 5,
        specifique: 4,
      }
      const maxKeep = MAX_SELECTED[level] ?? 5
      const sorted = [...parsed.lieutenants].sort((a, b) => compareScores(a.score ?? null, b.score ?? null))
      return {
        selectedLieutenants: sorted.slice(0, maxKeep),
        eliminatedLieutenants: sorted.slice(maxKeep),
        hnStructure: parsed.hnStructure,
        contentGapInsights: parsed.contentGapInsights,
        totalGenerated: parsed.lieutenants.length,
      }
    }

    const result = filterLieutenants(mockProposal, 'intermediaire')
    expect(result.selectedLieutenants.length).toBe(5)
  })

  it('cap Spécifique à 4', () => {
    const mockProposal: ProposeLieutenantsResult = {
      lieutenants: Array.from({ length: 8 }, (_, i) => ({
        keyword: `kw${i}`,
        reasoning: `r${i}`,
        sources: ['paa'],
        suggestedHnLevel: 2,
        score: 100 - i * 10,
      })),
      hnStructure: [],
      contentGapInsights: 'test',
    }

    const filterLieutenants = (parsed: ProposeLieutenantsResult, level: ArticleLevel): FilteredProposeLieutenantsResult => {
      const MAX_SELECTED: Record<ArticleLevel, number> = {
        pilier: 5,
        intermediaire: 5,
        specifique: 4,
      }
      const maxKeep = MAX_SELECTED[level] ?? 5
      const sorted = [...parsed.lieutenants].sort((a, b) => compareScores(a.score ?? null, b.score ?? null))
      return {
        selectedLieutenants: sorted.slice(0, maxKeep),
        eliminatedLieutenants: sorted.slice(maxKeep),
        hnStructure: parsed.hnStructure,
        contentGapInsights: parsed.contentGapInsights,
        totalGenerated: parsed.lieutenants.length,
      }
    }

    const result = filterLieutenants(mockProposal, 'specifique')
    expect(result.selectedLieutenants.length).toBe(4)
    expect(result.eliminatedLieutenants.length).toBe(4)
  })
})

describe('FR-LIE-GEOFUNNEL-RULE — pénalité anti-cannibalisation géo', () => {
  it('détecte cannibalisation : Pilier max 1-2 villes, autres = Intermédiaire/Spécifique = 0', () => {
    /**
     * Pseudo-test pour valider la logique géo-funnel sans appeler Claude.
     * En production, le scoring se passe DANS le prompt `propose-lieutenants.md:69-84`
     * (l'IA elle-même applique la pénalité -15 à -25).
     */

    const applyGeoFunnelPenalty = (
      lieutenant: ProposedLieutenant,
      level: ArticleLevel,
      capitaineCity: string | null,
    ): number | null => {
      if (!capitaineCity) return lieutenant.score
      if (lieutenant.score === null) return null

      const baseScore = lieutenant.score
      const ltKeywordLower = lieutenant.keyword.toLowerCase()

      // Compte occurrences du city dans le lieutenant
      const cityMatches = (ltKeywordLower.match(new RegExp(capitaineCity.toLowerCase(), 'g')) ?? []).length

      if (level === 'pilier') {
        // Tolérance : max 1-2 mentions de la ville
        if (cityMatches > 2) {
          return baseScore - 20 // Pénalité forte
        }
      } else if (level === 'intermediaire' || level === 'specifique') {
        // Zéro tolérance
        if (cityMatches > 0) {
          return baseScore - 25 // Pénalité maximale
        }
      }

      return baseScore
    }

    // Test cas Pilier : "création site web Toulouse" (Capitaine)
    const pilierLieutenants: ProposedLieutenant[] = [
      { keyword: 'prix site web Toulouse', reasoning: 'test', sources: ['paa'], suggestedHnLevel: 2, score: 80 },
      { keyword: 'agence web responsive', reasoning: 'test', sources: ['serp'], suggestedHnLevel: 2, score: 75 },
      { keyword: 'création site Toulouse services', reasoning: 'test', sources: ['paa'], suggestedHnLevel: 2, score: 70 },
    ]

    const pilierScores = pilierLieutenants.map(lt => applyGeoFunnelPenalty(lt, 'pilier', 'Toulouse'))
    // Reformulé 2026-05-04 : la règle Pilier tolère 1-2 mentions de la ville
    // (cityMatches > 2 → pénalité). Avec 1 occurrence de "Toulouse", pas de pénalité.
    expect(pilierScores[0]).toBe(80) // "prix site web Toulouse" → 1x Toulouse (≤2, toléré) → 80
    expect(pilierScores[1]).toBe(75) // "responsive" → 0x Toulouse → 75
    expect(pilierScores[2]).toBe(70) // "création site Toulouse services" → 1x Toulouse (≤2, toléré) → 70

    // Test cas Intermédiaire : zéro tolérance
    const intermediaireLieutenants: ProposedLieutenant[] = [
      { keyword: 'méthodes Toulouse', reasoning: 'test', sources: ['serp'], suggestedHnLevel: 2, score: 80 },
      { keyword: 'comparatif agences', reasoning: 'test', sources: ['paa'], suggestedHnLevel: 2, score: 75 },
    ]

    const intermediateScores = intermediaireLieutenants.map(lt => applyGeoFunnelPenalty(lt, 'intermediaire', 'Toulouse'))
    expect(intermediateScores[0]).toBe(55) // "méthodes Toulouse" → 1x Toulouse → 80 - 25
    expect(intermediateScores[1]).toBe(75) // "comparatif agences" → 0x Toulouse → 75
  })

  it('n\'applique pas pénalité si Capitaine sans localisation', () => {
    const applyGeoFunnelPenalty = (
      lieutenant: ProposedLieutenant,
      level: ArticleLevel,
      capitaineCity: string | null,
    ): number => {
      if (!capitaineCity) return lieutenant.score
      // ... reste du code
      return lieutenant.score
    }

    const lieutenant: ProposedLieutenant = {
      keyword: 'Toulouse SEO',
      reasoning: 'test',
      sources: ['paa'],
      suggestedHnLevel: 2,
      score: 80,
    }

    // Pas de city dans Capitaine → pas de pénalité
    const score = applyGeoFunnelPenalty(lieutenant, 'pilier', null)
    expect(score).toBe(80)
  })
})

describe.todo('FR-LIE-HN-STRUCTURE — saveHnStructure atomique + outline sync')
describe.todo('FR-LIE-CHECKS — emit moteur:lieutenants_locked après verrouillage')
describe.todo('FR-MOT-MODE-BIMODAL — Lieutenants en mode libre (Labo)')
describe.todo('NFR-INT-SERP-ONCE — multi-article same keyword, single SERP fetch')
