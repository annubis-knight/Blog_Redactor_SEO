/**
 * M15 / FR-LEX-METIER-ONLY — le lexique modifié depuis la Rédaction passe par
 * le même filtre que le Moteur. Avant, « vos » s'ajoutait sans rien dire, et la
 * suggestion de l'IA remplaçait le lexique par sa liste brute.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ArticleKeywordsPanel from '../../../src/components/keywords/ArticleKeywordsPanel.vue'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}))

function monter() {
  const store = useArticleKeywordsStore()
  store.initEmpty(7)
  store.setCapitaine('isolation combles')
  const wrapper = mount(ArticleKeywordsPanel, {
    props: { articleId: 7, articleTitle: 'Guide', cocoonName: 'Isolation' },
    global: { stubs: { KeywordLevelBadge: true } },
  })
  return { store, wrapper }
}

async function ajouter(wrapper: ReturnType<typeof mount>, terme: string) {
  const input = wrapper.find('input[placeholder="Ajouter un terme..."]')
  await input.setValue(terme)
  await input.trigger('keyup.enter')
}

describe('ArticleKeywordsPanel — lexique de la Rédaction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('refuse un mot générique et dit pourquoi', async () => {
    const { store, wrapper } = monter()

    await ajouter(wrapper, 'vos')

    expect(store.keywords!.lexique).toEqual([])
    expect(wrapper.find('.lexique-notice').text()).toContain('« vos » est un mot générique')
  })

  it('ajoute un terme du métier, sans message', async () => {
    const { store, wrapper } = monter()

    await ajouter(wrapper, 'pare-vapeur')

    expect(store.keywords!.lexique).toEqual(['pare-vapeur'])
    expect(wrapper.find('.lexique-notice').exists()).toBe(false)
  })

  it('après une suggestion, dit quels termes génériques ont été écartés', async () => {
    const { store, wrapper } = monter()
    store.suggestLexique = vi.fn().mockResolvedValue(['être', 'vos'])

    await wrapper.find('.btn-suggest-lexique').trigger('click')
    await flushPromises()

    expect(wrapper.find('.lexique-notice').text()).toBe('Termes génériques écartés de la suggestion : être, vos.')
  })
})
