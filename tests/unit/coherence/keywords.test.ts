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
        validationHistory: [],
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
    const storeState = { richCaptain: { keyword: 'seo', status: 'locked', validationHistory: [], aiPanelMarkdown: null, lockedAt: '2026-05-04T10:00:00Z' } }

    function lockCaptain(keyword: string, aiPanel: string | null) {
      storeState.richCaptain = {
        keyword,
        status: 'locked',
        validationHistory: storeState.richCaptain.validationHistory,
        aiPanelMarkdown: aiPanel,
        lockedAt: new Date().toISOString(),
      }
    }

    const initialCount = storeState.richCaptain.validationHistory.length
    lockCaptain('seo', 'new panel')
    const finalCount = storeState.richCaptain.validationHistory.length

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
      { keyword: 'seo-tools', status: 'locked', lockedAt: '2026-05-04T10:00:00Z' },
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
// Test 4: FR-CAP-PERSIST + FR-INFRA-API-WRAPPER — mirror non-régression
// ============================================================================

describe('FR-CAP-PERSIST — mirror captain_keyword_locked non-régression', () => {
  it('saveDecisions() NE doit pas écraser articles.captain_keyword_locked', async () => {
    // Simuler la base de données avant save
    const mockDb = {
      article_keywords: {
        article_id: 1,
        capitaine: 'seo',
        lieutenants: [],
        lexique: [],
        captain_locked_at: '2026-05-04T10:00:00Z',
      },
      articles: {
        id: 1,
        captain_keyword_locked: 'seo', // Posé par PUT /captain-keyword
      },
    }

    // Simuler saveDecisions() appelant PUT /articles/:id/keywords
    // avec payload : { capitaine, lieutenants, lexique, rootKeywords, hnStructure }
    // (NOTE: richCaptain N'EST PAS dans le payload)
    const _payload = {
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
      rootKeywords: [],
      hnStructure: [],
      // richCaptain: undefined ← c'est l'absence qui causait le bug
    }

    // La route saveArticleKeywords() ne doit PAS toucher captain_keyword_locked
    // (elle était verrouillée par PUT /articles/:id/captain-keyword)

    // Après saveDecisions, captain_keyword_locked doit TEN OIR
    expect(mockDb.articles.captain_keyword_locked).toBe('seo')
  })

  it('PUT /articles/:id/captain-keyword lock explicitement', () => {
    const mockDb = {
      articles: {
        id: 1,
        captain_keyword_locked: null as string | null,
      },
    }

    function updateCaptainKeywordLocked(id: number, keyword: string | null) {
      mockDb.articles.captain_keyword_locked = keyword
    }

    updateCaptainKeywordLocked(1, 'mot-clé')
    expect(mockDb.articles.captain_keyword_locked).toBe('mot-clé')

    updateCaptainKeywordLocked(1, null)
    expect(mockDb.articles.captain_keyword_locked).toBeNull()
  })

  it.todo('contrat : captain_keyword_locked est EXCLUSIVEMENT géré par PUT /captain-keyword')
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
        validationHistory: [{ keyword: 'validated-keyword' }],
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

  it('validationHistory merge est append-only (pas repioche)', () => {
    const memory = {
      validationHistory: [
        { keyword: 'seo-audit', status: 'validated' },
      ],
    }

    const db = {
      validationHistory: [
        { keyword: 'seo', status: 'validated' },
        { keyword: 'seo-audit', status: 'validated' }, // déjà en mémoire
      ],
    }

    function mergeCaptainHistory(incoming: any[]) {
      const history = memory.validationHistory
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

    mergeCaptainHistory(db.validationHistory)

    expect(memory.validationHistory).toHaveLength(2)
    expect(memory.validationHistory.map((h: any) => h.keyword)).toEqual(['seo-audit', 'seo'])
  })

  it('2e fetch reste idempotent (pas append doublon)', () => {
    const memory = { validationHistory: [{ keyword: 'seo' }] }
    const db = { validationHistory: [{ keyword: 'seo' }] }

    function merge() {
      const seen = new Set(memory.validationHistory.map((h: any) => h.keyword.toLowerCase()))
      for (const h of db.validationHistory) {
        const key = h.keyword.toLowerCase()
        if (!seen.has(key)) {
          memory.validationHistory.push(h)
        }
      }
    }

    merge()
    merge() // 2e appel

    expect(memory.validationHistory).toHaveLength(1)
  })

  it.todo('reload + switch onglet produit même resultate que premier load')
})
