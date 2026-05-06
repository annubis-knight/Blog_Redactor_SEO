/**
 * Tests anti-régression pour FinalisationPanel (onglet Finalisation du Moteur).
 *
 * Composant 100 % lecture seule qui résume Capitaine + Lieutenants + Lexique
 * juste avant le passage à la Rédaction. Couvre :
 *   1. titre article injecté depuis prop
 *   2. capitaine affiché depuis le store (richCaptain.keyword, fallback flat)
 *   3. lieutenants : `richLieutenants` filtrés sur status='locked' affichés en priorité
 *   4. fallback lieutenants : flat list si aucun lock
 *   5. lexique : tous les termes en chips
 *   6. clic sur "Aller à la Rédaction" → emit navigate-redaction
 *   7. états vides : "Aucun lieutenant verrouillé" / "Aucun terme validé"
 *   8. lockedAt formaté en fr-FR
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FinalisationPanel from '../../../src/components/moteur/FinalisationPanel.vue'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'

const STUBS = {
  CollapsableSection: {
    props: ['title', 'defaultOpen'],
    template: '<div class="stub-collapse"><h3>{{ title }}</h3><slot /></div>',
  },
}

const SELECTED_ARTICLE = {
  id: 1,
  title: 'Mon article test',
  type: 'pilier' as const,
  cocoonId: 1,
  keyword: 'agence seo',
  painPoint: null,
}

describe('FinalisationPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('affiche le titre de l\'article passé en prop', () => {
    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Mon article test')
  })

  it('fallback "cet article" quand selectedArticle null', () => {
    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: null },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('cet article')
  })

  it('capitaine : affiche keyword depuis richCaptain en priorité', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1,
      capitaine: 'old-flat',
      richCaptain: {
        keyword: 'agence seo paris',
        status: 'locked',
        exploredKeywords: [],
        lockedAt: '2026-04-15T10:00:00.000Z',
        aiPanelMarkdown: null,
      },
      lieutenants: [],
      richLieutenants: [],
      lexique: [],
      richRootKeywords: [],
      hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })

    expect(wrapper.text()).toContain('agence seo paris')
    // Date formatée fr-FR : 15/04/2026
    expect(wrapper.text()).toContain('15/04/2026')
  })

  it('capitaine : fallback sur flat keyword si richCaptain absent', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1,
      capitaine: 'flat-only',
      richCaptain: null,
      lieutenants: [],
      richLieutenants: [],
      lexique: [],
      richRootKeywords: [],
      hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })

    expect(wrapper.text()).toContain('flat-only')
  })

  it('lieutenants : affiche richLieutenants filtrés sur status="locked"', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1,
      capitaine: null,
      richCaptain: null,
      lieutenants: [],
      richLieutenants: [
        { keyword: 'agence locale', reasoning: 'fort volume', status: 'locked', suggestedHnLevel: 2, sources: [], score: 80, kpis: null, lockedAt: null },
        { keyword: 'consultant seo', reasoning: 'pertinent', status: 'suggested', suggestedHnLevel: 3, sources: [], score: 70, kpis: null, lockedAt: null },
        { keyword: 'expert local', reasoning: 'niche', status: 'locked', suggestedHnLevel: 3, sources: [], score: 75, kpis: null, lockedAt: null },
      ],
      lexique: [],
      richRootKeywords: [],
      hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })

    expect(wrapper.text()).toContain('agence locale')
    expect(wrapper.text()).toContain('expert local')
    // suggested → exclu
    expect(wrapper.text()).not.toContain('consultant seo')
    // 2 lieutenants locked dans la section
    expect(wrapper.text()).toContain('Lieutenants (2)')
  })

  it('lieutenants : fallback sur flat list si aucun lock', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1,
      capitaine: null,
      richCaptain: null,
      lieutenants: ['kw1', 'kw2'],
      richLieutenants: [],
      lexique: [],
      richRootKeywords: [],
      hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })

    expect(wrapper.text()).toContain('kw1')
    expect(wrapper.text()).toContain('kw2')
    expect(wrapper.text()).toContain('Lieutenants (2)')
  })

  it('lieutenants vides → message dédié', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1, capitaine: null, richCaptain: null,
      lieutenants: [], richLieutenants: [], lexique: [], richRootKeywords: [], hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Aucun lieutenant verrouillé')
  })

  it('lexique : termes affichés en chips + compteur dans le titre', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1, capitaine: null, richCaptain: null,
      lieutenants: [], richLieutenants: [],
      lexique: ['référencement', 'seo local', 'backlink'],
      richRootKeywords: [], hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })

    expect(wrapper.text()).toContain('Lexique (3 termes)')
    expect(wrapper.text()).toContain('référencement')
    expect(wrapper.text()).toContain('backlink')
  })

  it('lexique vide → message dédié', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1, capitaine: null, richCaptain: null,
      lieutenants: [], richLieutenants: [], lexique: [], richRootKeywords: [], hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Aucun terme validé')
  })

  it('clic sur "Aller à la Rédaction" → emit navigate-redaction', async () => {
    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })
    await wrapper.find('[data-testid="finalisation-cta-redaction"]').trigger('click')
    expect(wrapper.emitted('navigate-redaction')).toBeTruthy()
  })

  it('lockedAt invalide ou absent → pas de date affichée', () => {
    const store = useArticleKeywordsStore()
    store.keywords = {
      articleId: 1,
      capitaine: null,
      richCaptain: {
        keyword: 'agence',
        status: 'locked',
        exploredKeywords: [],
        lockedAt: null,
        aiPanelMarkdown: null,
      },
      lieutenants: [], richLieutenants: [], lexique: [], richRootKeywords: [], hnStructure: [],
    } as never

    const wrapper = mount(FinalisationPanel, {
      props: { selectedArticle: SELECTED_ARTICLE as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).not.toContain('Verrouillé le')
  })
})
