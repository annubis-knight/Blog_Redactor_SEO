/**
 * Chantier 3 — E1-S3 : LexiquePanel pré-check SERP (FR-LEX-PRECHECK-SERP).
 *
 * Couvre :
 *   - AC.LEX-PRECHECK.3 : mount avec exists=false → message + CTA visible,
 *                         bouton « Extraire » absent.
 *   - AC.LEX-PRECHECK.3 : mount avec exists=true → bouton « Extraire » visible.
 *   - AC.LEX-PRECHECK.4 : clic CTA → modale → confirm → POST /serp/tfidf
 *                         appelé avec triggerScrapeIfMissing:true.
 *   - AC.LEX-PRECHECK.5 : exists=false sans clic CTA → 0 appel POST /serp/tfidf
 *                         (anti-404 console).
 *
 * Le composant est complexe (Pinia stores, 6 sous-composants). On stub
 * agressivement les dépendances et on cible la logique de gating UX.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LexiquePanel from '../../../../src/components/moteur/LexiquePanel.vue'
import { apiGet, apiPost } from '../../../../src/services/api.service'

vi.mock('../../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

// useLexiqueIa : non utilisé pour ces tests, on stub minimal.
vi.mock('../../../../src/composables/lexique/useLexiqueIa', () => ({
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

const mockedGet = vi.mocked(apiGet)
const mockedPost = vi.mocked(apiPost)

const STUBS = {
  KeywordAssistPanel: true,
  LexiqueAiPanel: true,
  LexiqueTermsList: true,
  LexiqueMultiKeywordPanel: true,
  SortToggleBar: true,
  ConfirmModal: {
    props: ['open', 'title', 'message', 'confirmLabel', 'cancelLabel'],
    template: `<div v-if="open" data-testid="confirm-modal">
      <button data-testid="confirm-modal-confirm" @click="$emit('confirm')">OK</button>
      <button data-testid="confirm-modal-cancel" @click="$emit('cancel')">X</button>
    </div>`,
  },
}

const BASE_PROPS = {
  selectedArticle: { id: 1, slug: 'a', cocoonSlug: 'c', painPoint: null, title: 'T' } as unknown as Parameters<typeof mount>[1],
  captainKeyword: 'mon mot-clé',
  articleLevel: 'intermediate' as unknown,
  selectedLieutenants: [],
  isCaptaineLocked: true,
  initialLocked: false,
  cocoonSlug: 'c',
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockedGet.mockReset()
  mockedPost.mockReset()
})

function setupExists(value: { exists: boolean; scrapedAt: string | null }) {
  mockedGet.mockImplementation(async (path: string) => {
    if (path.includes('/serp/exists')) return value
    // hydrateFromDb / mergeFromDb appellent /articles/:id/explorations
    if (path.includes('/explorations')) return { lexique: [] }
    return {}
  })
}

describe('LexiquePanel pré-check SERP — chantier 3 E1-S3', () => {
  it('AC.LEX-PRECHECK.3 — exists=false → message + CTA visibles, btn-extract absent', async () => {
    setupExists({ exists: false, scrapedAt: null })

    const wrapper = mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="precheck-missing"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="btn-trigger-serp-scrape"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="btn-extract"]').exists()).toBe(false)
  })

  it('AC.LEX-PRECHECK.3 — exists=true → btn-extract visible immédiatement', async () => {
    setupExists({ exists: true, scrapedAt: '2026-05-08T10:00:00.000Z' })

    const wrapper = mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="precheck-missing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="btn-extract"]').exists()).toBe(true)
  })

  it('AC.LEX-PRECHECK.4 — clic CTA → modale → confirm → POST /serp/tfidf avec triggerScrapeIfMissing:true', async () => {
    setupExists({ exists: false, scrapedAt: null })
    mockedPost.mockResolvedValueOnce({ obligatoire: [], differenciateur: [], optionnel: [] })

    const wrapper = mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()

    // Clic sur le CTA → modale s'ouvre
    await wrapper.find('[data-testid="btn-trigger-serp-scrape"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="confirm-modal"]').exists()).toBe(true)

    // 0 appel POST /serp/tfidf avant confirmation
    const tfidfCallsBefore = mockedPost.mock.calls.filter(c => c[0] === '/serp/tfidf').length
    expect(tfidfCallsBefore).toBe(0)

    // Confirm → 1 appel POST /serp/tfidf avec triggerScrapeIfMissing:true
    await wrapper.find('[data-testid="confirm-modal-confirm"]').trigger('click')
    await flushPromises()

    const tfidfCalls = mockedPost.mock.calls.filter(c => c[0] === '/serp/tfidf')
    expect(tfidfCalls).toHaveLength(1)
    expect(tfidfCalls[0][1]).toMatchObject({
      keyword: 'mon mot-clé',
      triggerScrapeIfMissing: true,
    })
  })

  it('AC.LEX-PRECHECK.5 — exists=false sans clic CTA → 0 appel POST /serp/tfidf (anti-404)', async () => {
    setupExists({ exists: false, scrapedAt: null })

    mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()
    // Encore un tick pour s'assurer que tous les watchers immediate ont tourné
    await flushPromises()

    const tfidfCalls = mockedPost.mock.calls.filter(c => c[0] === '/serp/tfidf')
    expect(tfidfCalls).toHaveLength(0)
  })
})
