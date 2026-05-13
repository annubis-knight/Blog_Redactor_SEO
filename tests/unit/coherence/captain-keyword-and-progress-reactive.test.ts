/**
 * FR-MOT-DISPLAY-FROM-STORE — coherence test for the 3 reactivity bugs fixed
 * by tech-spec-reactive-captain-and-progress-v2 (2026-05-07).
 *
 * Couverture des 10 ACs du tech-spec :
 *   AC1  Lock Capitaine "X" → "Y" sur article sélectionné → tree affiche "Y"
 *   AC2  Lock Capitaine "X" → "Y" sur article sélectionné → lexique-header affiche "Y"
 *   AC3  Validation d'un check Moteur → ProgressDots reflète le check
 *   AC4  Uncheck → dot redevient vide
 *   AC5  Switch article A → B → A : pas de bleed-through
 *   AC6  FR-MOT-DISPLAY-FROM-STORE existe au PRD (couvert par contract test)
 *   AC7  docs/data-flows/captain-keyword-locked.md existe (couvert par fs check)
 *   AC8  completed-checks.md enrichi avec note ProgressDots + synced_with
 *   AC9  Test suite passe au vert
 *   AC10 Pas de régression cannibalization (icône warning + cohérence affichage/calcul)
 *
 * Stratégie pour reproduire les bugs (faire échouer le test SI le fix est retiré) :
 *   - Bug n°1/2 : props figées (`art.keyword = "design"`, `captainKeyword = "X"`),
 *     puis mutation du STORE seul. Sans le fix, le composant lit la prop figée
 *     et affiche "design" / "X" → test échoue. Avec fix, lit le store → passe.
 *   - Bug n°3 : mutation in-place de `progressMap[id].completedChecks.push(...)`
 *     (pattern réaliste de Pinia). Sans le fix de l'overlay store dans
 *     `unifiedCapitainesMap` ET la cohérence affichage/calcul, certains
 *     scénarios (cannibalization après lock) divergent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'
import LexiquePanel from '@/components/moteur/LexiquePanel.vue'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import {
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_RADAR_DONE,
} from '@shared/constants/workflow-checks.constants.js'
import type { Article } from '@shared/types/index.js'

// ---- Mocks réseau (le store fait apiPost/apiPut, qu'on stub pour rester pur) ----
vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/explorations')) return Promise.resolve({ lexique: [] })
    if (url.includes('/progress')) return Promise.resolve({ phase: 'moteur', completedChecks: [] })
    if (url.includes('/keywords')) return Promise.resolve(null)
    return Promise.resolve(null)
  }),
  apiPost: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/serp/tfidf')) return Promise.resolve({ obligatoire: [], differenciateur: [], optionnel: [] })
    return Promise.resolve({ phase: 'moteur', completedChecks: [] })
  }),
  apiPut: vi.fn().mockResolvedValue(null),
  apiPatch: vi.fn().mockResolvedValue(null),
  apiDelete: vi.fn().mockResolvedValue({ cleared: 0 }),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/composables/lexique/useLexiqueIa', () => ({
  useLexiqueIa: () => ({
    iaIsStreaming: { value: false },
    iaError: { value: null },
    iaResult: { value: null },
    iaRecommendations: { value: new Map() },
    iaRecommendedCount: { value: 0 },
    iaNotRecommendedCount: { value: 0 },
    iaAbort: vi.fn(),
    getRecommendation: vi.fn(),
    isIaRecommended: vi.fn(),
    generateLexiqueUpfront: vi.fn(),
  }),
}))

const ARTICLE_ID_A = 42
const ARTICLE_ID_B = 99
const SUGGESTED_KEYWORD_A = 'design'
const SUGGESTED_KEYWORD_B = 'typographie'

const articleA: Article = {
  id: ARTICLE_ID_A,
  title: 'Design émotionnel',
  type: 'pilier',
  slug: 'design-emotionnel',
  topic: null,
  status: 'à rédiger',
  phase: 'proposed',
  completedChecks: [],
  suggestedKeyword: SUGGESTED_KEYWORD_A,
  captainKeywordLocked: null,
  painPoint: null,
}

const articleB: Article = {
  id: ARTICLE_ID_B,
  title: 'Typographie web',
  type: 'pilier',
  slug: 'typographie-web',
  topic: null,
  status: 'à rédiger',
  phase: 'proposed',
  completedChecks: [],
  suggestedKeyword: SUGGESTED_KEYWORD_B,
  captainKeywordLocked: null,
  painPoint: null,
}

const lexiqueStubs = {
  KeywordAssistPanel: { template: '<div />' },
  LexiqueAiPanel: { template: '<div />' },
  LexiqueTermsList: { template: '<div />' },
  LexiqueMultiKeywordPanel: { template: '<div />' },
  SortToggleBar: { template: '<div />' },
}

beforeEach(() => {
  setActivePinia(createPinia())
})

// =====================================================
// AC1 — Bug n°1 : Tree keyword réactif (MoteurContextRecap)
// =====================================================

describe('AC1 — FR-MOT-DISPLAY-FROM-STORE : tree keyword réactif au lock Capitaine', () => {
  it('lock initial "X" sur article sélectionné → tree affiche "X" même si la prop dit "design"', async () => {
    // SCÉNARIO PRODUCTION : le parent (MoteurView) fournit articleA dont le
    // suggestedKeyword est "design" et captainKeywordLocked est null.
    // L'utilisateur verrouille "X" via CaptainPanel → mute le store seul.
    // Sans le fix : le tree lit `art.keyword` = "design" et reste figé.
    // Avec le fix : `getDisplayedKeyword` lit le store → "X".
    const articleKeywordsStore = useArticleKeywordsStore()
    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()

    // Avant lock : tree affiche le suggestedKeyword (la prop figée).
    expect(wrapper.find('.tree-article-keyword').text()).toBe(SUGGESTED_KEYWORD_A)

    // Lock "X" via le store — sans changement des props.
    articleKeywordsStore.lockCaptain('X', null, ARTICLE_ID_A)
    await nextTick()

    expect(wrapper.find('.tree-article-keyword').text()).toBe('X')
  })

  it('re-lock "X" → "Y" sans reload → tree affiche "Y"', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.lockCaptain('X', null, ARTICLE_ID_A)

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()
    expect(wrapper.find('.tree-article-keyword').text()).toBe('X')

    articleKeywordsStore.lockCaptain('Y', null, ARTICLE_ID_A)
    await nextTick()
    expect(wrapper.find('.tree-article-keyword').text()).toBe('Y')
  })

  it('chemin production complet : keywords === null → ensureKeywords → lockCaptain → tree refresh', async () => {
    // F7 — démarre avec keywords === null (cas premier lock sans fetchKeywordsMerge préalable).
    const articleKeywordsStore = useArticleKeywordsStore()
    expect(articleKeywordsStore.keywords).toBeNull()

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()
    expect(wrapper.find('.tree-article-keyword').text()).toBe(SUGGESTED_KEYWORD_A)

    // CaptainPanel appelle ce chemin réel : `lockCaptain(kw, panel, articleId)`
    // qui passe par `ensureKeywords(articleId)` → `initEmpty(articleId)` quand store vide.
    articleKeywordsStore.lockCaptain('X', null, ARTICLE_ID_A)
    await nextTick()

    expect(articleKeywordsStore.keywords?.articleId).toBe(ARTICLE_ID_A)
    expect(wrapper.find('.tree-article-keyword').text()).toBe('X')
  })

  it('article non sélectionné : tree lit la projection capitainesMap (pas le store)', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.lockCaptain('store-value', null, ARTICLE_ID_A)

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: null,
        capitainesMap: { [ARTICLE_ID_A]: 'map-value' },
      },
    })
    await nextTick()

    expect(wrapper.find('.tree-article-keyword').text()).toBe('map-value')
  })

  it('F1 — garde art.id > 0 : article proposé non persisté (id=0) ne consomme pas le store', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    // setCapitaine sans articleId → seed { articleId: 0, capitaine: 'leak' }.
    articleKeywordsStore.setCapitaine('leak')
    expect(articleKeywordsStore.keywords?.articleId).toBe(0)

    const proposedArticle: Article = { ...articleA, id: 0 }
    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [proposedArticle],
        publishedArticles: [],
        selectedSlug: proposedArticle.slug,
        capitainesMap: {},
      },
    })
    await nextTick()

    // Le store contient "leak" pour articleId=0, mais la garde art.id > 0
    // empêche la lecture → on retombe sur suggestedKeyword.
    expect(wrapper.find('.tree-article-keyword').text()).toBe(SUGGESTED_KEYWORD_A)
  })
})

// =====================================================
// AC2 — Bug n°2 : Lexique header réactif (LexiquePanel)
// =====================================================

describe('AC2 — FR-MOT-DISPLAY-FROM-STORE : lexique-header réactif au lock Capitaine', () => {
  function mountLexique(captainKeyword: string | null, articleId = ARTICLE_ID_A) {
    return mount(LexiquePanel, {
      props: {
        selectedArticle: {
          id: articleId,
          slug: articleA.slug,
          title: articleA.title,
          keyword: SUGGESTED_KEYWORD_A,
          type: articleA.type,
          locked: false,
          source: 'proposed' as const,
        },
        captainKeyword,
        articleLevel: 'pilier' as const,
        selectedLieutenants: [],
        isCaptaineLocked: !!captainKeyword,
      },
      global: { stubs: lexiqueStubs },
    })
  }

  it('re-lock "X" → "Z" sans changement de prop → lexique-header affiche "Z"', async () => {
    // SCÉNARIO PRODUCTION : MoteurView fournit `captainKeyword="X"` (figé via
    // computed sur source statique). L'utilisateur re-lock "Z" via CaptainPanel
    // → store mute, prop reste "X". Sans fix : header reste "X". Avec fix : "Z".
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.lockCaptain('X', null, ARTICLE_ID_A)

    const wrapper = mountLexique('X')
    await nextTick()
    expect(wrapper.find('.captain-keyword').text()).toBe('X')

    articleKeywordsStore.lockCaptain('Z', null, ARTICLE_ID_A)
    await nextTick()
    expect(wrapper.find('.captain-keyword').text()).toBe('Z')
  })

  it('AC5 — bleed-through : autre articleId dans le store → fallback sur prop', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    // Store contient les keywords d'un AUTRE article (race entre switch et fetch).
    articleKeywordsStore.lockCaptain('autre-cap', null, ARTICLE_ID_B)

    const wrapper = mountLexique('prop-value', ARTICLE_ID_A)
    await nextTick()

    // articleId du store (B) ≠ selectedArticle.id (A) → on utilise la prop.
    expect(wrapper.find('.captain-keyword').text()).toBe('prop-value')
  })

  it('F1 — garde selectedArticle.id > 0 : article proposé non persisté ne consomme pas le store', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.setCapitaine('leak') // seed articleId=0

    const wrapper = mountLexique('prop-value', 0)
    await nextTick()

    expect(wrapper.find('.captain-keyword').text()).toBe('prop-value')
  })

  it('store vide → fallback sur prop captainKeyword (pas de crash)', async () => {
    const wrapper = mountLexique('prop-value')
    await nextTick()
    expect(wrapper.find('.captain-keyword').text()).toBe('prop-value')
  })

  it('captainKeyword null + store vide → affiche "—"', async () => {
    const wrapper = mountLexique(null)
    await nextTick()
    expect(wrapper.find('.captain-keyword').text()).toBe('—')
  })
})

// =====================================================
// AC3 + AC4 — Bug n°3 : ProgressDots réactif (in-place mutation)
// =====================================================

describe('AC3/AC4 — FR-MOT-DISPLAY-FROM-STORE : ProgressDots réactif au check', () => {
  it('AC3 — addCheck via store action → dot correspondant passe à --filled', async () => {
    const progressStore = useArticleProgressStore()
    // État initial : pré-fetch progress vide (chemin réaliste : MoteurContextRecap
    // déclenche `fetchProgress` au mount via le watcher immediate).
    progressStore.progressMap[String(ARTICLE_ID_A)] = {
      phase: 'moteur',
      completedChecks: [],
    }

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()
    expect(wrapper.findAll('.progress-dot--filled').length).toBe(0)

    // Mutation IN-PLACE (pattern réaliste : Pinia store muté par optimistic update
    // OU réponse API qui replace la value du Record). Les deux paths doivent re-render.
    const entry = progressStore.progressMap[String(ARTICLE_ID_A)]
    if (entry) entry.completedChecks = [MOTEUR_CAPITAINE_LOCKED]
    await nextTick()
    expect(wrapper.findAll('.progress-dot--filled').length).toBe(1)
  })

  it('AC3 — pattern API replace (progressMap[id] = newRes) re-render', async () => {
    const progressStore = useArticleProgressStore()
    progressStore.progressMap[String(ARTICLE_ID_A)] = {
      phase: 'moteur',
      completedChecks: [],
    }

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()
    expect(wrapper.findAll('.progress-dot--filled').length).toBe(0)

    progressStore.progressMap[String(ARTICLE_ID_A)] = {
      phase: 'moteur',
      completedChecks: [MOTEUR_RADAR_DONE, MOTEUR_CAPITAINE_LOCKED],
    }
    await nextTick()
    expect(wrapper.findAll('.progress-dot--filled').length).toBe(2)
  })

  it('AC4 — uncheck → dot revient vide (in-place)', async () => {
    const progressStore = useArticleProgressStore()
    progressStore.progressMap[String(ARTICLE_ID_A)] = {
      phase: 'moteur',
      completedChecks: [MOTEUR_RADAR_DONE],
    }

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()
    expect(wrapper.findAll('.progress-dot--filled').length).toBe(1)

    const entry = progressStore.progressMap[String(ARTICLE_ID_A)]
    if (entry) entry.completedChecks = []
    await nextTick()
    expect(wrapper.findAll('.progress-dot--filled').length).toBe(0)
  })
})

// =====================================================
// AC5 — Switch article : pas de bleed-through
// =====================================================

describe('AC5 — Switch article A → B → A : pas de bleed-through', () => {
  it('A locké "X" puis switch sur B (store reset) → tree de A retombe sur suggestedKeyword', async () => {
    // Reproduit la séquence de MoteurView.handleSelectArticle : on $reset
    // le store avant fetchKeywordsMerge du nouvel article (F6).
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.lockCaptain('X', null, ARTICLE_ID_A)

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA, articleB],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()

    const keywordSpansA = wrapper.findAll('.tree-article-keyword')
    expect(keywordSpansA[0]?.text()).toBe('X')
    expect(keywordSpansA[1]?.text()).toBe(SUGGESTED_KEYWORD_B)

    // Switch sur B : MoteurView appellerait $reset() puis fetchKeywordsMerge(B).
    articleKeywordsStore.$reset()
    await wrapper.setProps({ selectedSlug: articleB.slug })
    await nextTick()

    const keywordSpansB = wrapper.findAll('.tree-article-keyword')
    // Pas de bleed-through : A retombe sur suggestedKeyword car store vide.
    expect(keywordSpansB[0]?.text()).toBe(SUGGESTED_KEYWORD_A)
    expect(keywordSpansB[1]?.text()).toBe(SUGGESTED_KEYWORD_B)
  })

  it('F9 — fetchKeywordsMerge stale après lock optimiste : la valeur fraîche du store l\'emporte', async () => {
    // Scénario race : utilisateur lock "Y" (optimistic) ; fetchKeywordsMerge
    // retourne ensuite la DB stale "X-old". Le merge ne doit PAS clobber "Y".
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.lockCaptain('Y', null, ARTICLE_ID_A) // optimiste local

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: {},
      },
    })
    await nextTick()
    expect(wrapper.find('.tree-article-keyword').text()).toBe('Y')

    // Simule la résolution tardive de fetchKeywordsMerge avec DB stale.
    // fetchKeywordsMerge n'écrase pas un capitaine déjà set côté local
    // (cf. article-keywords.store.ts:67 : `if (!local.capitaine && remote.capitaine)`).
    await articleKeywordsStore.fetchKeywordsMerge(ARTICLE_ID_A)
    await nextTick()

    expect(wrapper.find('.tree-article-keyword').text()).toBe('Y')
  })
})

// =====================================================
// AC10 — Pas de régression cannibalization (cohérence affichage/calcul)
// =====================================================

describe('AC10 — cannibalization : cohérence affichage/calcul après lock store', () => {
  it('lock même Capitaine sur 2 articles via store → icône warning sur les 2 (calcul = affichage)', async () => {
    // F5 — Sans l'overlay store dans `unifiedCapitainesMap`, le tree afficherait
    // "duplicate" sur l'article sélectionné (via getDisplayedKeyword), mais
    // hasCannibalization() lirait la prop figée → drift §2.0. Avec l'overlay :
    // les deux sources sont alignées.
    //
    // Setup réaliste : articleB est déjà locké côté backend ("duplicate" en DB,
    // donc captainKeywordLocked='duplicate'). L'utilisateur lock le même mot
    // sur articleA via CaptainPanel → store mute pour A. Le tree doit alors
    // détecter la collision A ↔ B et afficher 2 icônes.
    const articleKeywordsStore = useArticleKeywordsStore()
    const articleBLocked: Article = { ...articleB, captainKeywordLocked: 'duplicate' }
    articleKeywordsStore.lockCaptain('duplicate', null, ARTICLE_ID_A)

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA, articleBLocked],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: { [ARTICLE_ID_B]: 'duplicate' },
      },
    })
    await nextTick()

    // Affichage : tree montre "duplicate" pour les 2.
    const keywords = wrapper.findAll('.tree-article-keyword').map(s => s.text())
    expect(keywords).toEqual(['duplicate', 'duplicate'])

    // Calcul : v-if="hasCannibalization(art.id)" → IconWarning rendue.
    // Le HTML contient soit `<!--v-if-->` (absent) soit `class="warning-cannibal"` (présent).
    const html = wrapper.html()
    const warningCount = (html.match(/warning-cannibal/g) || []).length
    expect(warningCount).toBe(2)
  })

  it('keywords différents → aucune icône cannibalization', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.lockCaptain('unique-A', null, ARTICLE_ID_A)

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [articleA, articleB],
        publishedArticles: [],
        selectedSlug: articleA.slug,
        capitainesMap: { [ARTICLE_ID_B]: 'unique-B' },
      },
    })
    await nextTick()

    const html = wrapper.html()
    expect(html.includes('warning-cannibal')).toBe(false)
  })
})

// =====================================================
// AC6/AC7/AC8 — Documentation présente et cohérente
// =====================================================

describe('AC6/AC7/AC8 — documentation FR + data-flows', () => {
  const PROJECT_ROOT = resolve(__dirname, '../../..')

  it('AC6 — FR-MOT-DISPLAY-FROM-STORE est dans le PRD', () => {
    const prd = readFileSync(resolve(PROJECT_ROOT, '_bmad-output/planning-artifacts/prd.md'), 'utf8')
    expect(prd).toContain('FR-MOT-DISPLAY-FROM-STORE')
    expect(prd).toMatch(/FR-MOT-DISPLAY-FROM-STORE[\s\S]*Statut.*active/)
  })

  it('AC7 — docs/data-flows/captain-keyword-locked.md existe avec frontmatter standard', () => {
    const path = resolve(PROJECT_ROOT, 'docs/data-flows/captain-keyword-locked.md')
    expect(existsSync(path)).toBe(true)
    const doc = readFileSync(path, 'utf8')
    expect(doc).toMatch(/^---\nname: captain-keyword-locked/)
    expect(doc).toContain('## Producteurs')
    expect(doc).toContain('## Consommateurs')
    expect(doc).toContain('## Persistance')
  })

  it('AC8 — completed-checks.md enrichi avec note ProgressDots et synced_with', () => {
    const doc = readFileSync(
      resolve(PROJECT_ROOT, 'docs/data-flows/completed-checks.md'),
      'utf8',
    )
    expect(doc).toContain('synced_with: [captain-keyword-locked.md]')
    expect(doc).toContain('FR-MOT-DISPLAY-FROM-STORE')
    expect(doc).toContain('ProgressDots non réactifs')
  })
})
