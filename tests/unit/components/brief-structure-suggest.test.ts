/**
 * FR-CER-MICRO-CONTEXT — « Suggerer par IA » marche sur un article sans
 * capitaine, et un échec se dit à l'écran.
 *
 * Recette du 2026-09-30 (INFRA-9) : sur un enfant sans capitaine,
 * `article_keywords.capitaine` vaut une chaîne vide ; `capitaine ?? titre` la
 * laissait passer, le serveur répondait 400 (« keyword are required ») et
 * l'écran ne montrait rien — ni suggestion, ni erreur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import BriefStructureStep from '../../../src/components/workflow/BriefStructureStep.vue'
import { apiGet } from '../../../src/services/api.service'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn().mockResolvedValue({ ok: true }),
}))

const streaming = vi.hoisted(() => ({
  startStream: vi.fn(),
  error: null as unknown as { value: string | null },
}))

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => ({
    isStreaming: ref(false),
    error: streaming.error,
    startStream: streaming.startStream,
  }),
}))

const STUBS = {
  CollapsableSection: { template: '<div><slot name="header" /><slot /></div>' },
  ContextRecap: true,
  RecapToggle: { template: '<div><slot /></div>' },
  KeywordList: true,
  ContentRecommendation: true,
  OutlineEditor: true,
  OutlineDisplay: true,
  ArticleKeywordsPanel: true,
  Transition: { template: '<div><slot /></div>' },
}

const THEME_CONFIG_VIDE = {
  avatar: { sector: '', companySize: '', location: '', budget: '', digitalMaturity: '' },
  positioning: { targetAudience: '', mainPromise: '', differentiators: [], painPoints: [] },
  offerings: { services: [], mainCTA: '', ctaTarget: '' },
  toneOfVoice: { style: '', vocabulary: [] },
}

const PROPS = { articleId: 1344, cocoonName: 'Recette', siloName: 'Silo', articleTitle: 'Erreurs à éviter : le guide complet' }

async function mountWithCaptain(capitaine: string) {
  const wrapper = mount(BriefStructureStep, { props: PROPS, global: { stubs: STUBS } })
  useArticleKeywordsStore().keywords = { articleId: 1344, capitaine, lieutenants: [], lexique: [] }
  await flushPromises()
  return wrapper
}

describe('FR-CER-MICRO-CONTEXT — suggestion du micro-contexte (recette 2026-09-30, INFRA-9)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    streaming.startStream.mockReset()
    streaming.error = ref<string | null>(null)
    vi.mocked(apiGet).mockImplementation(((url: string) =>
      Promise.resolve(url === '/theme/config' ? structuredClone(THEME_CONFIG_VIDE) : null)) as never)
  })

  it('sans capitaine (chaîne vide) : le titre de l’article sert de sujet, jamais un mot-clé vide', async () => {
    const wrapper = await mountWithCaptain('')
    await wrapper.find('[data-testid="suggest-micro-context"]').trigger('click')
    expect(streaming.startStream).toHaveBeenCalledTimes(1)
    const body = streaming.startStream.mock.calls[0]![1] as { keyword: string }
    expect(body.keyword).toBe('Erreurs à éviter : le guide complet')
  })

  it('avec un capitaine : c’est lui le sujet', async () => {
    const wrapper = await mountWithCaptain('erreurs à éviter')
    await wrapper.find('[data-testid="suggest-micro-context"]').trigger('click')
    const body = streaming.startStream.mock.calls[0]![1] as { keyword: string }
    expect(body.keyword).toBe('erreurs à éviter')
  })

  it('un échec de la suggestion s’affiche, en français', async () => {
    const wrapper = await mountWithCaptain('erreurs à éviter')
    expect(wrapper.find('[data-testid="suggest-error"]').exists()).toBe(false)
    streaming.error.value = 'articleId, articleTitle, keyword are required'
    await flushPromises()
    const error = wrapper.find('[data-testid="suggest-error"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toBe('La suggestion n’a pas abouti. Réessayez dans un instant.')
  })
})
