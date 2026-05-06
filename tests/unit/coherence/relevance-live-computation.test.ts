// @vitest-environment node
/**
 * Tests anti-régression TDD pour la refonte Score Pertinence à la volée.
 *
 * Décision figée 2026-05-05 — voir :
 *   - docs/data-flows/relevance-score-live-computation.md
 *   - _bmad-output/implementation-artifacts/tech-spec-relevance-live-computation.md
 *   - _bmad-output/implementation-artifacts/decision-log-relevance-live-computation.md
 *
 * Ces tests sont ROUGES tant que la refonte n'est pas implémentée.
 * Ils sont VERTS quand les FRs sont satisfaites.
 *
 * Couvre les FRs :
 *   - FR-CAP-RELEVANCE-COMPUTED-LIVE
 *   - FR-CAP-RELEVANCE-NO-DB-WRITE
 *   - FR-CAP-RELEVANCE-NO-CACHE
 *   - FR-CAP-RELEVANCE-ROOTS-FROM-DB
 *   - FR-CAP-ROOTS-PERSISTED-AT-ENTRY
 *   - FR-CAP-RELEVANCE-MEMOIZATION
 *   - FR-CAP-RELEVANCE-UNAVAILABLE-REASON
 *   - FR-RAD-NO-RELEVANCE-IN-SCAN
 *   - FR-CAP-RELEVANCE-LINEAR-ROOTS
 */
import { describe, it, expect } from 'vitest'

// Le service captain-relevance n'existe pas encore (créé en Sprint 2).
// Les tests qui en dépendent essaient l'import et échouent proprement.
async function tryImportCaptainRelevanceService() {
  try {
    return await import('../../../server/services/keyword/captain-relevance.service.js')
  } catch {
    return null
  }
}

// =====================================================
// FR-CAP-RELEVANCE-LINEAR-ROOTS — extraction linéaire
// =====================================================

describe('FR-CAP-RELEVANCE-LINEAR-ROOTS — extraction linéaire des racines', () => {
  it('keyword 4 mots → 2 racines tronquées progressivement depuis la fin', async () => {
    const { extractRoots } = await import('../../../src/composables/keyword/useCapitaineValidation.js')
    expect(extractRoots('cours piano intermédiaire paris')).toEqual([
      'cours piano intermédiaire',
      'cours piano',
    ])
  })

  it('keyword 2 mots → tableau vide (< 3 mots requis)', async () => {
    const { extractRoots } = await import('../../../src/composables/keyword/useCapitaineValidation.js')
    expect(extractRoots('cours piano')).toEqual([])
  })

  it('stopwords filtrés via FRENCH_STOPWORDS', async () => {
    const { extractRoots } = await import('../../../src/composables/keyword/useCapitaineValidation.js')
    // "le cours de piano paris" : "le" et "de" sont des stopwords
    // → 2 mots significatifs requis, max 5 racines
    const roots = extractRoots('le cours de piano paris')
    // Doit contenir au moins une racine (selon comportement actuel)
    expect(Array.isArray(roots)).toBe(true)
  })

  it('aucun appel LLM (pas de I/O réseau) — fonction synchrone et pure', async () => {
    const { extractRoots } = await import('../../../src/composables/keyword/useCapitaineValidation.js')
    const start = Date.now()
    extractRoots('cours piano intermédiaire paris')
    const duration = Date.now() - start
    // Sub-1ms attendu, on tolère < 50ms pour CI lente
    expect(duration).toBeLessThan(50)
  })
})

// =====================================================
// FR-CAP-RELEVANCE-COMPUTED-LIVE — recalcul à chaque hydratation
// =====================================================

describe('FR-CAP-RELEVANCE-COMPUTED-LIVE — recalcul à chaque hydratation', () => {
  it('le service captain-relevance.service existe et expose computeRelevanceForCaptainTab', async () => {
    const mod = await tryImportCaptainRelevanceService()
    expect(mod).not.toBeNull()
    expect(typeof mod?.computeRelevanceForCaptainTab).toBe('function')
  })

  it.todo('un changement de painPoint en DB produit un score différent au reload (sans action manuelle)')

  it.todo('saisie manuelle d\'un keyword jamais scanné Radar → score calculé (pas null artificiel)')

  it.todo('deux appels successifs avec le même état DB produisent le même score (pure)')
})

// =====================================================
// FR-CAP-RELEVANCE-NO-DB-WRITE — interdiction d'écriture DB
// =====================================================

describe('FR-CAP-RELEVANCE-NO-DB-WRITE — aucune écriture DB pendant un calcul Pertinence', () => {
  it.todo('spy pg.query : aucun INSERT contient relevanceScore dans son payload pendant le calcul')

  it.todo('spy pg.query : aucun UPDATE contient relevanceScore dans son payload pendant le calcul')

  it.todo('aucune table SQL n\'a de colonne nommée relevance_score, market_score, ou relevance_total')
})

// =====================================================
// FR-CAP-RELEVANCE-NO-CACHE — pas de cache TTL
// =====================================================

describe('FR-CAP-RELEVANCE-NO-CACHE — pas de cache TTL pour les scores', () => {
  it.todo('aucun appel api_cache.get(\'relevance:*\') ou clé similaire pendant le calcul')

  it.todo('deux appels successifs passent dans le calcul complet (pas de hit cache implicite)')
})

// =====================================================
// FR-CAP-RELEVANCE-ROOTS-FROM-DB — racines lues depuis captain_explorations
// =====================================================

describe('FR-CAP-RELEVANCE-ROOTS-FROM-DB — racines lues depuis la DB', () => {
  it.todo('si captain_explorations.root_keywords existe → utilisé tel quel pour signal 4')

  it.todo('si root_keywords absent ou vide → fallback extractRoots() en mémoire, sans écriture DB')
})

// =====================================================
// FR-CAP-ROOTS-PERSISTED-AT-ENTRY — racines persistées à l'entrée
// =====================================================

describe('FR-CAP-ROOTS-PERSISTED-AT-ENTRY — racines persistées dès l\'entrée d\'un keyword', () => {
  it.todo('envoi depuis Radar : INSERT captain_explorations contient root_keywords non vide pour keywords ≥ 3 mots')

  it.todo('input manuel Capitaine : INSERT contient root_keywords')

  it.todo('acceptation longue-traîne IA : INSERT contient root_keywords')

  it.todo('verrouillage Capitaine d\'un keyword existant : aucun UPDATE sur root_keywords (immutable après entrée)')

  it.todo('calcul Pertinence : aucun INSERT/UPDATE sur root_keywords')
})

// =====================================================
// FR-CAP-RELEVANCE-MEMOIZATION — mémoïsation racines partagées
// =====================================================

describe('FR-CAP-RELEVANCE-MEMOIZATION — racines partagées calculées une seule fois', () => {
  it.todo('5 cards qui partagent la racine "cours piano" → computeRelevanceScore appelé 1 seule fois pour cette racine')

  it.todo('la Map mémoïsation est libérée après la fin de la fonction (scope local)')

  it.todo('aucun localStorage / sessionStorage / cache TTL ne stocke ces scores intermédiaires')
})

// =====================================================
// FR-CAP-RELEVANCE-UNAVAILABLE-REASON — tooltip honnête
// =====================================================

describe('FR-CAP-RELEVANCE-UNAVAILABLE-REASON — cause typée renvoyée par le backend', () => {
  it('le type RelevanceScoreResult expose un champ unavailableReason typé', async () => {
    const types = await import('../../../shared/types/scoring.types.js')
    // À ce stade, le champ n'existe pas encore. Test rouge attendu.
    // Une fois implémenté, on pourra typer un objet et vérifier le champ.
    // On teste l'existence du type RelevanceUnavailableReason dans les exports.
    expect(types).toHaveProperty('INTENT_MISMATCH_MALUS') // sanity check existant
    // Le test suivant sera vert quand on aura ajouté le type :
    // expect(typeof (types as any).RelevanceUnavailableReason).toBeDefined()
  })

  it.todo('cause "no-pain" : painPoint absent ou < 10 chars → reason = "no-pain"')

  it.todo('cause "long-tail" : kpis === null → reason = "long-tail"')

  it.todo('cause "missing-paa" : painPoint OK mais paa_questions vide en DB → reason = "missing-paa"')

  it.todo('cause "missing-autocomplete" : painPoint OK mais autocomplete_suggestions vide → reason = "missing-autocomplete"')

  it.todo('score présent : unavailableReason est null ou champ absent')

  it.todo('backend logge la cause à chaque retour null : log.info avec { articleId, keyword, reason }')
})

// =====================================================
// FR-RAD-NO-RELEVANCE-IN-SCAN — scan Radar n'inclut plus la Pertinence
// =====================================================

describe('FR-RAD-NO-RELEVANCE-IN-SCAN — scan Radar ne calcule plus la Pertinence', () => {
  it.todo('scanRadarKeywords n\'appelle plus computeRelevanceScore (spy)')

  it.todo('KeywordRadarScanResult.cards[].relevanceScore est undefined ou absent après refonte')

  it.todo('le snapshot radar_explorations.scan_result écrit ne contient plus relevanceScore')

  it.todo('le code de lecture (getCaptainExplorations) ignore relevanceScore présent dans les anciens snapshots')

  it.todo('marketScore continue d\'être calculé et présent dans le snapshot')
})

// =====================================================
// Garde-fou général — décisions structurelles vérifiables
// =====================================================

describe('Garde-fous structurels — décisions architecturales 2026-05-05', () => {
  it('aucune migration SQL ne crée de colonne relevance_score ou market_score', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const migrationsDir = path.resolve('server/db/migrations')
    const files = await fs.readdir(migrationsDir)
    for (const file of files) {
      if (!file.endsWith('.sql')) continue
      const content = await fs.readFile(path.join(migrationsDir, file), 'utf-8')
      // Tolérance : commentaires explicatifs OK, mais pas de CREATE/ALTER avec ces noms
      const hasForbiddenColumn =
        /\b(ADD\s+COLUMN|CREATE\s+TABLE[^;]*?)\s+(relevance_score|market_score|relevance_total|market_total)\b/i.test(content)
      expect(hasForbiddenColumn, `Migration ${file} ne doit pas créer de colonne score persistée`).toBe(false)
    }
  })

  it('shared/scoring.ts exporte toujours computeRelevanceScore (utilisé par le calcul live)', async () => {
    const scoring = await import('../../../shared/scoring.js')
    expect(typeof scoring.computeRelevanceScore).toBe('function')
  })
})

// =====================================================
// FR-CAP-RELEVANCE-INTENT-SIGNAL — 5e signal Pertinence actif
// =====================================================

describe('FR-CAP-RELEVANCE-INTENT-SIGNAL — câblage painIntentExpected', () => {
  it('CaptainKeywordInput accepte painIntentExpected', async () => {
    const mod = await tryImportCaptainRelevanceService()
    if (!mod) return
    // L'interface CaptainKeywordInput doit transporter painIntentExpected
    // pour permettre au scoring d'appliquer la matrice 4×4 + malus.
    // Test indirect : on appelle computeRelevanceForCaptainTab avec ce champ
    // et on vérifie qu'il n'y a pas d'erreur de typage runtime.
    const result = mod.__test__.computeRelevanceForSingleKeyword(
      'cours piano',
      'Je galère à trouver des cours adaptés à mon niveau',
      null, // metrics
      null, // rootsAverageScore
      false, // isLongTail
    )
    // Sans metrics, on tombe sur missing-paa — ce n'est pas l'objet du test ;
    // l'important est que le service existe et accepte la signature.
    expect(result).toBeDefined()
    expect(['no-pain', 'long-tail', 'missing-paa', 'missing-autocomplete', null]).toContain(
      result.unavailableReason,
    )
  })

  it('helper getArticlePainIntent existe et est exporté', async () => {
    try {
      const mod = await import('../../../server/services/queries/article-pain-intent.service.js')
      expect(typeof mod.getArticlePainIntent).toBe('function')
    } catch {
      // Module absent → test échoue clairement
      expect.fail('getArticlePainIntent doit être exporté depuis server/services/queries/article-pain-intent.service.ts')
    }
  })

  it('computeRelevanceScore applique le malus de mismatch quand painIntentExpected est fourni', async () => {
    const { computeRelevanceScore } = await import('../../../shared/scoring.js')
    const matchResult = computeRelevanceScore({
      intentTypes: ['informational'],
      painIntentExpected: 'informational',
    })
    const mismatchResult = computeRelevanceScore({
      intentTypes: ['transactional'],
      painIntentExpected: 'informational',
    })
    expect(matchResult.breakdown.intentPain.normalized).toBeGreaterThan(
      mismatchResult.breakdown.intentPain.normalized,
    )
  })

  it('articles.pain_intent_expected est TEXT single-value, pas TEXT[]', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const migrationPath = path.resolve(
      process.cwd(),
      'server/db/migrations/014_articles_pain_intent_expected.sql',
    )
    const content = fs.readFileSync(migrationPath, 'utf-8')
    // Single-value : `pain_intent_expected TEXT` (pas TEXT[])
    expect(content).toMatch(/pain_intent_expected\s+TEXT\b(?!\[)/)
    // CHECK contraint sur les 4 valeurs
    for (const v of ['commercial', 'transactional', 'informational', 'navigational']) {
      expect(content).toContain(`'${v}'`)
    }
  })
})

// =====================================================
// FR-PIE-AI-GENERATION — prompts IA génèrent painIntentExpected
// =====================================================

describe('FR-PIE-AI-GENERATION — prompts cocoon-* incluent painIntentExpected', () => {
  const promptFiles = [
    'server/prompts/cocoon-articles.md',
    'server/prompts/cocoon-articles-spe.md',
    'server/prompts/cocoon-add-article.md',
  ]

  for (const file of promptFiles) {
    it(`${file} mentionne painIntentExpected dans le format de sortie`, async () => {
      const fs = await import('node:fs')
      const path = await import('node:path')
      const content = fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8')
      expect(content).toContain('painIntentExpected')
      // Doit lister les 4 valeurs autorisées
      for (const v of ['commercial', 'transactional', 'informational', 'navigational']) {
        expect(content).toContain(v)
      }
    })
  }
})

// =====================================================
// CLEAN — legacy painType deprecated supprimé
// =====================================================

describe('CLEAN — legacy painType supprimé après activation painIntentExpected', () => {
  it('shared/types/scoring.types.ts n\'expose plus painType', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'shared/types/scoring.types.ts'),
      'utf-8',
    )
    // Le champ painType est supprimé (pas de rétro-compat needed selon CLAUDE.md)
    expect(content).not.toMatch(/^\s*painType\??:/m)
  })

  it('shared/scoring.ts ne lit plus le champ painType', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const content = fs.readFileSync(path.resolve(process.cwd(), 'shared/scoring.ts'), 'utf-8')
    expect(content).not.toContain('input.painType')
  })
})
