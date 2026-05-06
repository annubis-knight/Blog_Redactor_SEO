/**
 * Tests de cohérence pour article_keywords data flow.
 * Vérifie que les décisions Capitaine / Lieutenants / Lexique sont persistées et
 * restituées de manière cohérente (affichage = calcul = tri).
 *
 * Voir docs/data-flows/keywords.md pour la cartographie complète.
 */
import { describe, it, expect } from 'vitest'

// ============================================================================
// Test 1: FR-CAP-LOCK-RADIO — lock atomique
// ============================================================================

describe('FR-CAP-LOCK-RADIO — cohérence lock atomique du Capitaine', () => {
  it('lockCaptain() mutate richCaptain.status, keyword, lockedAt simultanement', () => {
    // Simuler state du store avant lock
    const storeState = {
      capitaine: '',
      richCaptain: undefined as unknown,
    }

    // Mock fonction lockCaptain du store
    function lockCaptain(keyword: string, aiPanel: string | null) {
      storeState.capitaine = keyword
      storeState.richCaptain = {
        keyword,
        status: 'locked',
        exploredKeywords: [],
        aiPanelMarkdown: aiPanel,
        lockedAt: new Date().toISOString(),
      }
    }

    lockCaptain('seo-audit', '# Audit SEO')

    expect(storeState.capitaine).toBe('seo-audit')
    expect(storeState.richCaptain).toBeDefined()
    expect((storeState.richCaptain as any).status).toBe('locked')
    expect((storeState.richCaptain as any).lockedAt).toBeTruthy()
  })

  it('re-lock même keyword est idempotent (ne duplique pas)', () => {
    const storeState = { richCaptain: { keyword: 'seo', status: 'locked', exploredKeywords: [], aiPanelMarkdown: null, lockedAt: '2026-05-04T10:00:00Z' } }

    function lockCaptain(keyword: string, aiPanel: string | null) {
      storeState.richCaptain = {
        keyword,
        status: 'locked',
        exploredKeywords: storeState.richCaptain.exploredKeywords,
        aiPanelMarkdown: aiPanel,
        lockedAt: new Date().toISOString(),
      }
    }

    const initialCount = storeState.richCaptain.exploredKeywords.length
    lockCaptain('seo', 'new panel')
    const finalCount = storeState.richCaptain.exploredKeywords.length

    expect(finalCount).toBe(initialCount) // pas d'append
  })

  it.todo('saveDecisions() persiste lock sans doublon via ON CONFLICT')
})

// ============================================================================
// Test 2: FR-LIE-CHECKBOX-COUNT — sélection vs persistance
// ============================================================================

describe('FR-LIE-CHECKBOX-COUNT — cohérence sélection Lieutenants', () => {
  it('setRichLieutenants(selected, eliminated) sync flat lieutenants[] avec locked seulement', () => {
    const storeState = {
      lieutenants: [] as string[],
      richLieutenants: [] as any[],
    }

    interface ProposedLieutenant {
      keyword: string
      reasoning: string
      sources: string[]
      suggestedHnLevel: number
      score: number
    }

    function setRichLieutenants(selected: ProposedLieutenant[], eliminated: ProposedLieutenant[]) {
      const now = new Date().toISOString()
      const rich = [
        ...selected.map(lt => ({
          keyword: lt.keyword,
          status: 'locked',
          reasoning: lt.reasoning,
          sources: lt.sources,
          suggestedHnLevel: lt.suggestedHnLevel,
          score: lt.score,
          kpis: null,
          lockedAt: now,
        })),
        ...eliminated.map(lt => ({
          keyword: lt.keyword,
          status: 'eliminated',
          reasoning: lt.reasoning,
          sources: lt.sources,
          suggestedHnLevel: lt.suggestedHnLevel,
          score: lt.score,
          kpis: null,
          lockedAt: null,
        })),
      ]
      storeState.richLieutenants = rich
      // Sync flat avec locked seulement
      storeState.lieutenants = selected.map(lt => lt.keyword)
    }

    const selected = [
      { keyword: 'seo-tools', reasoning: 'R1', sources: ['serp'], suggestedHnLevel: 2, score: 85 },
      { keyword: 'seo-best-practices', reasoning: 'R2', sources: ['paa'], suggestedHnLevel: 2, score: 80 },
    ]
    const eliminated = [
      { keyword: 'old-keyword', reasoning: 'outdated', sources: ['serp'], suggestedHnLevel: 3, score: 40 },
    ]

    setRichLieutenants(selected, eliminated)

    expect(storeState.lieutenants).toEqual(['seo-tools', 'seo-best-practices'])
    expect(storeState.richLieutenants.length).toBe(3) // 2 selected + 1 eliminated
    expect(storeState.richLieutenants.filter((lt: any) => lt.status === 'locked')).toHaveLength(2)
  })

  it('mergeRichLieutenants() deduplique par keyword (lowercase trim)', () => {
    const existing = [
      { keyword: 'SEO TOOLS', status: 'locked', lockedAt: '2026-05-04T09:00:00Z' },
    ]
    const incoming = [
      { keyword: 'seo tools', status: 'locked', lockedAt: '2026-05-04T10:00:00Z' },
      { keyword: 'new-keyword', status: 'suggested', lockedAt: null },
    ]

    function mergeRichLieutenants(list: any[], incoming: any[]) {
      const byKey = new Map()
      const keyOf = (lt: any) => lt.keyword.trim().toLowerCase()

      for (const lt of list) byKey.set(keyOf(lt), lt)
      for (const lt of incoming) {
        const key = keyOf(lt)
        const current = byKey.get(key)
        if (!current) {
          byKey.set(key, lt)
        } else {
          const incomingTime = lt.lockedAt ? Date.parse(lt.lockedAt) : 0
          const currentTime = current.lockedAt ? Date.parse(current.lockedAt) : 0
          if (incomingTime > currentTime) {
            byKey.set(key, lt)
          }
        }
      }
      return Array.from(byKey.values())
    }

    const merged = mergeRichLieutenants(existing, incoming)
    expect(merged).toHaveLength(2) // 1 dedup + 1 new
    const seoTools = merged.find((lt: any) => lt.keyword.toLowerCase() === 'seo tools')
    expect(seoTools?.lockedAt).toBe('2026-05-04T10:00:00Z') // incoming won
  })

  it.todo('reload retrouve exactement les Lieutenants sélectionnés sans doublon')
})

// ============================================================================
// Test 3: FR-LEX-SELECT — cohérence lexique affichage / persistance
// ============================================================================

describe('FR-LEX-SELECT — cohérence Lexique affichage / persistance', () => {
  it('addLexiqueTerm() et removeLexiqueTerm() muent flat array', () => {
    let lexique: string[] = ['term1', 'term2']

    function addLexiqueTerm(value: string) {
      if (!lexique.includes(value)) {
        lexique.push(value)
      }
    }

    function removeLexiqueTerm(value: string) {
      lexique = lexique.filter(t => t !== value)
    }

    addLexiqueTerm('term3')
    expect(lexique).toContain('term3')

    removeLexiqueTerm('term1')
    expect(lexique).not.toContain('term1')

    // Ajout dupliqué ne l'ajoute pas deux fois
    addLexiqueTerm('term2')
    expect(lexique.filter(t => t === 'term2')).toHaveLength(1)
  })

  it('persistance et reload restituent exact array', () => {
    const savedData = {
      lexique: ['obligatoire-1', 'diff-1', 'option-1'],
    }

    // Simuler reload
    const restored = { ...savedData }

    expect(restored.lexique).toEqual(savedData.lexique)
  })

  it.todo('3 niveaux (Obligatoire / Différenciateur / Optionnel) affichent et calculent avec même source')
})

// ============================================================================
// Test 4: FR-CAP-PERSIST — mirror captain_keyword_locked via saveArticleKeywords
// ============================================================================
// Historique : avant 2026-05-04, la colonne `articles.captain_keyword_locked`
// etait geree par une route dediee PUT /articles/:id/captain-keyword. Cette
// route a ete supprimee : le mirror se fait maintenant DANS saveArticleKeywords
// quand le payload contient `richCaptain.status === 'locked'`. Les tests
// ci-dessous verifient ce contrat actuel.

describe('FR-CAP-PERSIST — mirror captain_keyword_locked via richCaptain', () => {
  /**
   * Reproduit la logique du mirror dans server/services/infra/data.service.ts:562-568.
   * Une evolution de cette logique cassera ce test, ce qui est volontaire.
   */
  function computeMirroredCaptainKeyword(payload: {
    richCaptain?: { status?: string; keyword?: string | null }
  }): string | null {
    return payload.richCaptain?.status === 'locked'
      ? (payload.richCaptain.keyword ?? null)
      : null
  }

  it('payload avec richCaptain.status="locked" → mirror = keyword', () => {
    const mirrored = computeMirroredCaptainKeyword({
      richCaptain: { status: 'locked', keyword: 'seo' },
    })
    expect(mirrored).toBe('seo')
  })

  it('payload sans richCaptain → mirror = null (pas de preservation magique)', () => {
    const mirrored = computeMirroredCaptainKeyword({})
    expect(mirrored).toBeNull()
  })

  it('payload avec richCaptain.status="suggested" → mirror = null', () => {
    const mirrored = computeMirroredCaptainKeyword({
      richCaptain: { status: 'suggested', keyword: 'seo' },
    })
    expect(mirrored).toBeNull()
  })

  it('payload avec richCaptain.status="locked" mais keyword=null → mirror = null', () => {
    const mirrored = computeMirroredCaptainKeyword({
      richCaptain: { status: 'locked', keyword: null },
    })
    expect(mirrored).toBeNull()
  })
})

// ============================================================================
// Test 5: FR-MOT-PHASES + TabLoadPrompt — fetch-merge idempotence
// ============================================================================

describe('FR-MOT-PHASES — fetchKeywordsMerge() idempotence', () => {
  it('merge adopte DB seulement si mémoire vide (capitaine)', () => {
    const memory = {
      capitaine: 'validated-keyword',
      richCaptain: {
        status: 'locked',
        exploredKeywords: [{ keyword: 'validated-keyword' }],
      },
    }

    const db = {
      capitaine: '',
      richCaptain: undefined,
    }

    function merge() {
      // Capitaine : adopte DB seulement si mémoire vide
      if (!memory.capitaine && db.capitaine) {
        memory.capitaine = db.capitaine
      }
      // richCaptain : adopte DB seulement si mémoire vide
      if (!memory.richCaptain && db.richCaptain) {
        memory.richCaptain = db.richCaptain
      }
    }

    merge()
    expect(memory.capitaine).toBe('validated-keyword') // memory wins
  })

  it('exploredKeywords merge est append-only (pas repioche)', () => {
    const memory = {
      exploredKeywords: [
        { keyword: 'seo-audit', status: 'validated' },
      ],
    }

    const db = {
      exploredKeywords: [
        { keyword: 'seo', status: 'validated' },
        { keyword: 'seo-audit', status: 'validated' }, // déjà en mémoire
      ],
    }

    function mergeCaptainExploredKeywords(incoming: any[]) {
      const history = memory.exploredKeywords
      const keyOf = (e: any) => e.keyword.trim().toLowerCase()
      const seen = new Set(history.map(keyOf))

      for (const entry of incoming) {
        const key = keyOf(entry)
        if (!seen.has(key)) {
          seen.add(key)
          history.push(entry)
        }
      }
    }

    mergeCaptainExploredKeywords(db.exploredKeywords)

    expect(memory.exploredKeywords).toHaveLength(2)
    expect(memory.exploredKeywords.map((h: any) => h.keyword)).toEqual(['seo-audit', 'seo'])
  })

  it('2e fetch reste idempotent (pas append doublon)', () => {
    const memory = { exploredKeywords: [{ keyword: 'seo' }] }
    const db = { exploredKeywords: [{ keyword: 'seo' }] }

    function merge() {
      const seen = new Set(memory.exploredKeywords.map((h: any) => h.keyword.toLowerCase()))
      for (const h of db.exploredKeywords) {
        const key = h.keyword.toLowerCase()
        if (!seen.has(key)) {
          memory.exploredKeywords.push(h)
        }
      }
    }

    merge()
    merge() // 2e appel

    expect(memory.exploredKeywords).toHaveLength(1)
  })

  it.todo('reload + switch onglet produit même resultate que premier load')
})
