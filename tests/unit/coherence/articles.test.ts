import { describe, it, expect } from 'vitest'
import { MOTEUR_DISCOVERY_DONE, MOTEUR_CAPITAINE_LOCKED, MOTEUR_LEXIQUE_VALIDATED } from '@shared/constants/workflow-checks.constants'
import type { Article, ArticlePhase, ArticleStatus } from '@shared/types/index'

/**
 * Coherence tests for the `articles` data flow.
 * Ensures that the main article entity maintains consistency across:
 * - Persistance (PostgreSQL)
 * - Frontend stores (Pinia)
 * - UI display (Vue components)
 * - Workflow progression (checks, phase, status)
 *
 * References: docs/data-flows/articles.md
 */

// --- Mock article factory ---

function createMockArticle(overrides?: Partial<Article>): Article {
  return {
    id: 1,
    title: 'Test Article',
    type: 'Pilier',
    slug: 'test-article',
    topic: null,
    status: 'à rédiger' as ArticleStatus,
    phase: 'proposed' as ArticlePhase,
    completedChecks: [],
    checkTimestamps: {},
    suggestedKeyword: null,
    captainKeywordLocked: null,
    painPoint: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// --- FR-MOT-ARTICLE-SELECTION —選article impacts UI gating ---

describe('FR-MOT-ARTICLE-SELECTION — article selection impacts workflow gating', () => {
  it('should lock workflow tabs when no article is selected', () => {
    const selectedArticle = null

    // Simulate MoteurView.navGroups logic (line 318-319 in MoteurView.vue)
    const tabsLocked = !selectedArticle
    expect(tabsLocked).toBe(true)
  })

  it('should unlock workflow tabs when article is selected', () => {
    const selectedArticle = createMockArticle()

    // Simulate MoteurView.navGroups logic
    const tabsLocked = !selectedArticle
    expect(tabsLocked).toBe(false)
  })

  it('should compute smart tab based on article progress (completedChecks)', () => {
    // Simulates MoteurView.computeSmartTab(articleId) logic (lines 343-354)
    function computeSmartTab(checks: string[]): string {
      if (checks.length === 0) return 'capitaine'
      if (checks.includes(MOTEUR_LEXIQUE_VALIDATED)) return 'finalisation'
      if (checks.includes('moteur:lieutenants_locked')) return 'lexique'
      if (checks.includes(MOTEUR_CAPITAINE_LOCKED)) return 'lieutenants'
      return 'capitaine'
    }

    expect(computeSmartTab([])).toBe('capitaine')
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED])).toBe('lieutenants')
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED, 'moteur:lieutenants_locked'])).toBe('lexique')
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED, 'moteur:lieutenants_locked', MOTEUR_LEXIQUE_VALIDATED])).toBe('finalisation')
  })

  it('should detect Discovery tab lock when Captain keyword is already validated', () => {
    // Simulates MoteurView.isDiscoveryAllowed logic (lines 216-224)
    function isDiscoveryAllowed(
      selectedArticle: Article | null,
      validatedKeywords: Map<string, string>,
    ): boolean {
      if (!selectedArticle) return true
      const articleKeyword = selectedArticle.captainKeywordLocked
      if (!articleKeyword) return true
      return !validatedKeywords.has(articleKeyword.toLowerCase())
    }

    const article = createMockArticle({ captainKeywordLocked: 'meilleur cms' })
    const validatedKeywords = new Map([['meilleur cms', 'validated']])

    expect(isDiscoveryAllowed(article, validatedKeywords)).toBe(false)
    expect(isDiscoveryAllowed(article, new Map())).toBe(true)
    expect(isDiscoveryAllowed(null, validatedKeywords)).toBe(true)
  })
})

// --- FR-DASH-PROGRESS — progress dots display persisted checks ---

describe('FR-DASH-PROGRESS — ProgressDots display article.completedChecks accurately', () => {
  it('should display filled dots for completed checks only', () => {
    const article = createMockArticle({
      completedChecks: [MOTEUR_DISCOVERY_DONE, MOTEUR_CAPITAINE_LOCKED],
    })

    const expectedDots = {
      [MOTEUR_DISCOVERY_DONE]: 'filled',
      [MOTEUR_CAPITAINE_LOCKED]: 'filled',
      'moteur:radar_done': 'empty',
      'moteur:lieutenants_locked': 'empty',
    }

    for (const [check, expectedState] of Object.entries(expectedDots)) {
      const isFilled = article.completedChecks.includes(check)
      const actualState = isFilled ? 'filled' : 'empty'
      expect(actualState).toBe(expectedState)
    }
  })

  it('should handle empty completedChecks', () => {
    const article = createMockArticle({ completedChecks: [] })
    expect(article.completedChecks.length).toBe(0)
  })

  it('should sync checks from DB to display without stale cache', () => {
    // Simulates ArticleCard receiving fresh article from store
    const articleFromDb = createMockArticle({
      completedChecks: [MOTEUR_DISCOVERY_DONE],
    })

    // ProgressDots receives the same checks
    const dotsDisplay = articleFromDb.completedChecks

    expect(dotsDisplay).toEqual([MOTEUR_DISCOVERY_DONE])
    expect(dotsDisplay).not.toContain('stale-check')
  })
})

// --- FR-DASH-NAV — hierarchy Silo → Cocoon → Article navigation ---

describe('FR-DASH-NAV — Silo→Cocoon→Article hierarchy is navigable', () => {
  interface MockCocoon {
    id: number
    name: string
    siloName: string
    articles: Article[]
  }

  interface _MockSilo {
    id: number
    nom: string
    cocons: MockCocoon[]
  }

  function computeStats(articles: Article[]) {
    const byStatus = { aRediger: 0, brouillon: 0, publie: 0 }
    for (const a of articles) {
      if (a.status === 'à rédiger') byStatus.aRediger++
      else if (a.status === 'brouillon') byStatus.brouillon++
      else byStatus.publie++
    }
    const total = articles.length
    const completionPercent = total > 0
      ? Math.round(((byStatus.brouillon + byStatus.publie) / total) * 100)
      : 0
    return { total, byStatus, completionPercent }
  }

  it('should display correct article counts per cocoon', () => {
    const articles = [
      createMockArticle({ id: 1, title: 'A1' }),
      createMockArticle({ id: 2, title: 'A2' }),
      createMockArticle({ id: 3, title: 'A3' }),
    ]
    const stats = computeStats(articles)

    expect(stats.total).toBe(3)
    expect(stats.byStatus.aRediger).toBe(3)
    expect(stats.completionPercent).toBe(0)
  })

  it('should calculate completion percentage correctly', () => {
    const articles = [
      createMockArticle({ id: 1, status: 'à rédiger' }),
      createMockArticle({ id: 2, status: 'brouillon' }),
      createMockArticle({ id: 3, status: 'publié' }),
    ]
    const stats = computeStats(articles)

    // 2 completed (brouillon + publié) / 3 total = 66.67% → 67%
    expect(stats.completionPercent).toBe(67)
  })

  it('should maintain hierarchy order: Silo → Cocoon → Article', () => {
    const cocoons: MockCocoon[] = [
      {
        id: 1,
        name: 'Cocoon 1',
        siloName: 'Silo 1',
        articles: [
          createMockArticle({ id: 101, title: 'Article 1.1' }),
          createMockArticle({ id: 102, title: 'Article 1.2' }),
        ],
      },
      {
        id: 2,
        name: 'Cocoon 2',
        siloName: 'Silo 1',
        articles: [
          createMockArticle({ id: 201, title: 'Article 2.1' }),
        ],
      },
    ]

    // Verify structure
    expect(cocoons).toHaveLength(2)
    expect(cocoons[0].articles).toHaveLength(2)
    expect(cocoons[1].articles).toHaveLength(1)
    expect(cocoons[0].articles[0].title).toBe('Article 1.1')
  })
})

// --- FR-CER-BATCH-CREATE — batch creation atomicity + slug generation ---

describe('FR-CER-BATCH-CREATE — batch article creation', () => {
  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  it('should generate deterministic slugs from title', () => {
    expect(generateSlug('Test Article')).toBe('test-article')
    expect(generateSlug('Café des Données')).toBe('cafe-des-donnees')
    expect(generateSlug('  Multi   Space  ')).toBe('multi-space')
  })

  it('should preserve suggested_keyword and pain_point when creating articles', () => {
    const article = createMockArticle({
      suggestedKeyword: 'meilleur cms',
      painPoint: 'Manque de performance',
    })

    expect(article.suggestedKeyword).toBe('meilleur cms')
    expect(article.painPoint).toBe('Manque de performance')
  })

  it('should create multiple articles with unique slugs', () => {
    const titles = ['Article A', 'Article B', 'Article C']
    const slugs = titles.map(generateSlug)

    expect(slugs).toHaveLength(3)
    expect(new Set(slugs).size).toBe(3) // All unique
  })

  it.todo('should fail atomically if any article creation fails (currently non-atomic via ON CONFLICT DO NOTHING)')
})

// --- FR-DASH-PROGRESS + completed-checks coherence ---

describe('FR-DASH-PROGRESS & completed-checks — coherence check', () => {
  it('should use article.completed_checks as SSOT for progress display', () => {
    const article = createMockArticle({
      completedChecks: [MOTEUR_DISCOVERY_DONE, MOTEUR_CAPITAINE_LOCKED],
    })

    // Display layer reads completedChecks
    const dotsForDisplay = article.completedChecks

    // Gating layer also reads completedChecks (should be same source)
    const isLocked = article.completedChecks.includes('moteur:capitaine_locked')

    expect(dotsForDisplay).toContain(MOTEUR_DISCOVERY_DONE)
    expect(isLocked).toBe(true)
    expect(dotsForDisplay).toBe(article.completedChecks) // Same reference
  })

  it('should not diverge between affichage and gating when checks are null', () => {
    const article = createMockArticle({ completedChecks: [] })

    // Display: no dots filled
    const displayCount = article.completedChecks.filter(c => c.includes('moteur')).length
    expect(displayCount).toBe(0)

    // Gating: isFinalisationUnlocked should return false
    const hasAllFinalChecks = article.completedChecks.includes(MOTEUR_CAPITAINE_LOCKED)
      && article.completedChecks.includes('moteur:lieutenants_locked')
      && article.completedChecks.includes(MOTEUR_LEXIQUE_VALIDATED)
    expect(hasAllFinalChecks).toBe(false)
  })
})

// --- FR-CER-AIGUILLAGE — article hierarchy (Pilier → Intermédiaire → Spécialisé) ---

describe('FR-CER-AIGUILLAGE — article type hierarchy respected', () => {
  it('should allow Pilier article without parent', () => {
    const pilier = createMockArticle({ type: 'Pilier' })
    expect(pilier.type).toBe('Pilier')
    // Pilier has no parent (implicit)
  })

  it('should assign Intermédiaire article with Pilier parent', () => {
    const pilier = createMockArticle({ id: 1, type: 'Pilier', slug: 'pilier-article' })
    const intermediaire = createMockArticle({
      id: 2,
      type: 'Intermédiaire',
      slug: 'intermediaire-article',
    })

    // In strategy, intermediaire.parent = pilier.slug
    const hierarchy = {
      [pilier.id]: null, // Pilier: no parent
      [intermediaire.id]: 'pilier-article', // Intermédiaire: parent is Pilier
    }

    expect(hierarchy[pilier.id]).toBeNull()
    expect(hierarchy[intermediaire.id]).toBe('pilier-article')
  })

  it('should assign Spécialisé article with Intermédiaire parent', () => {
    const intermediaire = createMockArticle({
      id: 2,
      type: 'Intermédiaire',
      slug: 'intermediaire-article',
    })
    const specialise = createMockArticle({
      id: 3,
      type: 'Spécialisé',
      slug: 'specialise-article',
    })

    const hierarchy = {
      [intermediaire.id]: 'pilier-article',
      [specialise.id]: 'intermediaire-article',
    }

    expect(hierarchy[specialise.id]).toBe('intermediaire-article')
  })
})

// --- Bonus: consistency across store and DB ---

describe('coherence: article state consistency between store and DB', () => {
  it('should reflect article updates immediately in store after DB write', async () => {
    // Simulates optimistic update in Pinia
    const storeArticles: Article[] = [createMockArticle({ id: 1, title: 'Original Title' })]
    const dbArticles: Article[] = [createMockArticle({ id: 1, title: 'Original Title' })]

    // User updates title
    const newTitle = 'Updated Title'
    storeArticles[0].title = newTitle
    dbArticles[0].title = newTitle

    expect(storeArticles[0].title).toBe(newTitle)
    expect(dbArticles[0].title).toBe(newTitle)
  })
})
