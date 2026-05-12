// @vitest-environment node
/**
 * Test anti-régression du branchement Haiku → signal 2 du score Pertinence.
 *
 * Vérifie que `computeRelevanceForSingleKeyword` accepte un `paaPainAlignmentOverride`
 * et l'utilise en lieu et place du calcul lexical, sans casser les cas existants.
 *
 * Couvre FR-CAP-PAA-JUDGE-HAIKU (signal 2 produit par Haiku).
 */
import { describe, it, expect } from 'vitest'
import { __test__ } from '../../../server/services/keyword/captain-relevance.service'

const { computeRelevanceForSingleKeyword } = __test__

// --- Helper : fabrique un metrics minimal valide pour le calcul ---
function makeMetrics(): import('../../../server/services/keyword/keyword-metrics.service').KeywordMetrics {
  return {
    keyword: 'site web sur mesure toulouse',
    searchVolume: 880,
    keywordDifficulty: 35,
    cpc: 5.2,
    competition: 0.5,
    intentRaw: 0.6,
    intentLabel: 'commercial',
    intentScore: null,
    paaQuestions: [
      { question: 'Combien coûte un site web sur mesure à Toulouse ?', answer: 'Compter 5000€-15000€...', isMatch: true, matchQuality: 'exact' },
      { question: 'Comment choisir une agence web Toulouse ?', answer: 'Vérifier références...', isMatch: true, matchQuality: 'exact' },
    ],
    autocompleteSuggestions: [
      { text: 'site web sur mesure toulouse prix', position: 1 },
      { text: 'site web sur mesure toulouse pas cher', position: 2 },
    ],
    paaQuestionsCount: 2,
    autocompleteSuggestionsCount: 2,
    fetchedAt: new Date('2026-05-12'),
    lang: 'fr',
    country: 'fr',
  } as unknown as import('../../../server/services/keyword/keyword-metrics.service').KeywordMetrics
}

const PAIN = 'Trouver un prestataire web qui livre un site qui convertit vraiment, pas juste joli, à Toulouse.'

describe('moteur:captain-relevance — paaPainAlignmentOverride (Haiku)', () => {
  it('utilise l\'override Haiku quand fourni (signal 2 = override)', () => {
    const metrics = makeMetrics()
    // Override Haiku score 95 (très pertinent)
    const result = computeRelevanceForSingleKeyword(
      'site web sur mesure toulouse',
      PAIN,
      metrics,
      null,
      false,
      'commercial',
      95, // ← override Haiku
    )
    expect(result.total).not.toBeNull()
    expect(result.breakdown).not.toBeNull()
    // Le signal paaPain.normalized doit être exactement 95 (override appliqué)
    expect(result.breakdown!.paaPain.normalized).toBe(95)
  })

  it('utilise un override faible (15) → signal 2 reflète bien la valeur basse', () => {
    const metrics = makeMetrics()
    const result = computeRelevanceForSingleKeyword(
      'site web sur mesure toulouse',
      PAIN,
      metrics,
      null,
      false,
      'commercial',
      15,
    )
    expect(result.breakdown!.paaPain.normalized).toBe(15)
  })

  it('fallback lexical quand override = null (comportement historique)', () => {
    const metrics = makeMetrics()
    const result = computeRelevanceForSingleKeyword(
      'site web sur mesure toulouse',
      PAIN,
      metrics,
      null,
      false,
      'commercial',
      null, // ← pas d'override
    )
    // Le calcul lexical produit une valeur déterministe pour ces inputs
    expect(result.breakdown!.paaPain.normalized).toBeGreaterThanOrEqual(0)
    expect(result.breakdown!.paaPain.normalized).toBeLessThanOrEqual(100)
    expect(result.total).not.toBeNull()
  })

  it('fallback lexical quand override absent (default param)', () => {
    const metrics = makeMetrics()
    const resultWithoutOverride = computeRelevanceForSingleKeyword(
      'site web sur mesure toulouse',
      PAIN,
      metrics,
      null,
      false,
      'commercial',
    )
    const resultWithNullOverride = computeRelevanceForSingleKeyword(
      'site web sur mesure toulouse',
      PAIN,
      metrics,
      null,
      false,
      'commercial',
      null,
    )
    // Default param undefined ≡ null pour le comportement
    expect(resultWithoutOverride.breakdown!.paaPain.normalized).toBe(
      resultWithNullOverride.breakdown!.paaPain.normalized,
    )
  })

  it('override n\'affecte pas les autres signaux (painKeyword, acPain, intentPain, roots)', () => {
    const metrics = makeMetrics()
    const resultNoOverride = computeRelevanceForSingleKeyword(
      'site web sur mesure toulouse',
      PAIN,
      metrics,
      72, // rootsAverageScore
      false,
      'commercial',
      null,
    )
    const resultWithOverride = computeRelevanceForSingleKeyword(
      'site web sur mesure toulouse',
      PAIN,
      metrics,
      72,
      false,
      'commercial',
      88,
    )
    expect(resultWithOverride.breakdown!.painKeyword.normalized).toBe(
      resultNoOverride.breakdown!.painKeyword.normalized,
    )
    expect(resultWithOverride.breakdown!.acPain.normalized).toBe(
      resultNoOverride.breakdown!.acPain.normalized,
    )
    expect(resultWithOverride.breakdown!.intentPain.normalized).toBe(
      resultNoOverride.breakdown!.intentPain.normalized,
    )
    expect(resultWithOverride.breakdown!.roots.normalized).toBe(
      resultNoOverride.breakdown!.roots.normalized,
    )
    // Seul paaPain doit changer
    expect(resultWithOverride.breakdown!.paaPain.normalized).toBe(88)
    expect(resultNoOverride.breakdown!.paaPain.normalized).not.toBe(88)
  })

  it('parité 4 vs 16 PAA quand override Haiku → score signal 2 identique', () => {
    const m4 = makeMetrics()
    m4.paaQuestions = m4.paaQuestions.slice(0, 1) // peu de PAA en DB
    const m16 = makeMetrics()
    m16.paaQuestions = [...m16.paaQuestions, ...Array.from({ length: 14 }, (_, i) => ({
      question: `Question supplémentaire ${i} ?`,
      answer: 'Réponse.',
      isMatch: true,
      matchQuality: 'exact' as const,
    }))]

    // Avec override Haiku 90 dans les deux cas → la quantité de PAA en DB ne
    // doit pas affecter le score signal 2.
    const r4 = computeRelevanceForSingleKeyword(
      'site web', PAIN, m4, null, false, 'commercial', 90,
    )
    const r16 = computeRelevanceForSingleKeyword(
      'site web', PAIN, m16, null, false, 'commercial', 90,
    )
    expect(r4.breakdown!.paaPain.normalized).toBe(90)
    expect(r16.breakdown!.paaPain.normalized).toBe(90)
    expect(r4.breakdown!.paaPain.normalized).toBe(r16.breakdown!.paaPain.normalized)
  })

  it('override null + painPoint vide → unavailableReason no-pain (comportement préservé)', () => {
    const result = computeRelevanceForSingleKeyword(
      'site web', '', makeMetrics(), null, false, 'commercial', null,
    )
    expect(result.total).toBeNull()
    expect(result.unavailableReason).toBe('no-pain')
  })

  it('override fourni mais painPoint vide → unavailableReason no-pain l\'emporte', () => {
    // Si painPoint absent, on doit retourner no-pain, l'override est sans effet
    // (cohérent : pas de douleur = pas de pertinence)
    const result = computeRelevanceForSingleKeyword(
      'site web', '', makeMetrics(), null, false, 'commercial', 95,
    )
    expect(result.total).toBeNull()
    expect(result.unavailableReason).toBe('no-pain')
  })
})
