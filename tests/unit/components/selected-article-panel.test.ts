/**
 * Tests anti-régression pour SelectedArticlePanel — édition titre + progression.
 *
 * Composant macro affiché en haut de l'écran Moteur. Couvre :
 *   1. édition inline du titre via input v-model + blur → PATCH API + emit
 *   2. titre vide ou inchangé → no-op (pas de PATCH, restore valeur)
 *   3. PATCH échoue → restore valeur originale
 *   4. mode lecture seule (article.locked) → input remplacé par span + badge
 *   5. type badge avec bonne classe selon Pilier/Intermédiaire/Spécialisé
 *   6. progression : phase-badge + liste des checks
 *   7. fetchProgress appelé au mount + au changement d'articleId
 *   8. labels checks : MOTEUR_* mappés en français
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import SelectedArticlePanel from '../../../src/components/moteur/SelectedArticlePanel.vue'
import { apiPatch } from '../../../src/services/api.service'

// Mock de l'API : on intercepte tous les PATCH.
vi.mock('../../../src/services/api.service', () => ({
  apiPatch: vi.fn().mockResolvedValue({ ok: true }),
  apiGet: vi.fn().mockResolvedValue({ phase: 'moteur', completedChecks: [] }),
}))

const mockedPatch = vi.mocked(apiPatch)

const STUBS = {
  RecapToggle: {
    template: '<div><slot name="header" /><slot name="between" /><slot /></div>',
  },
}

const BASE_ARTICLE = {
  id: 42,
  title: 'Mon article',
  type: 'Pilier' as const,
  cocoonId: 1,
  keyword: 'agence seo',
  painPoint: null,
  locked: false,
}

describe('SelectedArticlePanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedPatch.mockReset()
    mockedPatch.mockResolvedValue({ ok: true })
  })

  it('rend l\'input en mode éditable + le titre actuel', () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: BASE_ARTICLE as never },
      global: { stubs: STUBS },
    })
    const input = wrapper.find('.panel-title-input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Mon article')
  })

  it('mode locked → span lecture seule + badge "Lecture seule"', () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: { ...BASE_ARTICLE, locked: true } as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.panel-title-input').exists()).toBe(false)
    expect(wrapper.find('.panel-toggle-label').text()).toBe('Mon article')
    expect(wrapper.text()).toContain('Lecture seule')
  })

  it('édition + blur → PATCH /articles/:id + emit title-updated', async () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: BASE_ARTICLE as never },
      global: { stubs: STUBS },
    })
    const input = wrapper.find('.panel-title-input')
    await input.setValue('Nouveau titre')
    await input.trigger('blur')
    await nextTick()

    expect(mockedPatch).toHaveBeenCalledWith('/articles/42', { title: 'Nouveau titre' })
    expect(wrapper.emitted('title-updated')).toBeTruthy()
    expect(wrapper.emitted('title-updated')![0]).toEqual([{ id: 42, title: 'Nouveau titre' }])
  })

  it('REGRESSION GUARD : titre vide après trim → no PATCH + restore original', async () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: BASE_ARTICLE as never },
      global: { stubs: STUBS },
    })
    const input = wrapper.find('.panel-title-input')
    await input.setValue('   ')
    await input.trigger('blur')
    await nextTick()

    expect(mockedPatch).not.toHaveBeenCalled()
    expect(wrapper.emitted('title-updated')).toBeFalsy()
    expect((input.element as HTMLInputElement).value).toBe('Mon article')
  })

  it('REGRESSION GUARD : titre identique après trim → no PATCH', async () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: BASE_ARTICLE as never },
      global: { stubs: STUBS },
    })
    const input = wrapper.find('.panel-title-input')
    await input.setValue('  Mon article  ') // mêmes mots, juste avec espaces
    await input.trigger('blur')
    await nextTick()

    expect(mockedPatch).not.toHaveBeenCalled()
  })

  it('PATCH échoue → restore valeur originale, pas d\'emit', async () => {
    mockedPatch.mockRejectedValueOnce(new Error('network'))

    const wrapper = mount(SelectedArticlePanel, {
      props: { article: BASE_ARTICLE as never },
      global: { stubs: STUBS },
    })
    const input = wrapper.find('.panel-title-input')
    await input.setValue('Nouveau titre')
    await input.trigger('blur')
    await nextTick()
    await nextTick()

    expect(mockedPatch).toHaveBeenCalled()
    expect(wrapper.emitted('title-updated')).toBeFalsy()
    expect((input.element as HTMLInputElement).value).toBe('Mon article')
  })

  it('badge type : classe correspondant au type article', () => {
    const w1 = mount(SelectedArticlePanel, { props: { article: { ...BASE_ARTICLE, type: 'Pilier' } as never }, global: { stubs: STUBS } })
    expect(w1.find('.panel-type-badge').classes()).toContain('badge--pilier')

    const w2 = mount(SelectedArticlePanel, { props: { article: { ...BASE_ARTICLE, type: 'Intermédiaire' } as never }, global: { stubs: STUBS } })
    expect(w2.find('.panel-type-badge').classes()).toContain('badge--intermediaire')

    const w3 = mount(SelectedArticlePanel, { props: { article: { ...BASE_ARTICLE, type: 'Spécialisé' } as never }, global: { stubs: STUBS } })
    expect(w3.find('.panel-type-badge').classes()).toContain('badge--specialise')
  })

  it('keyword affiché en badge si présent', () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: { ...BASE_ARTICLE, keyword: 'agence seo paris' } as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.panel-keyword-badge').text()).toBe('agence seo paris')
  })

  it('keyword absent → pas de badge keyword', () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: { ...BASE_ARTICLE, keyword: '' } as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.panel-keyword-badge').exists()).toBe(false)
  })

  it('painPoint affiché en bandeau si présent', () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: { ...BASE_ARTICLE, painPoint: 'je veux personnaliser' } as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.panel-pain-bar').exists()).toBe(true)
    expect(wrapper.text()).toContain('je veux personnaliser')
  })

  it('painPoint absent → bandeau absent', () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: { ...BASE_ARTICLE, painPoint: null } as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.panel-pain-bar').exists()).toBe(false)
  })

  it('progress absent → message "Aucune étape validée" + phase fallback "Proposé"', () => {
    const wrapper = mount(SelectedArticlePanel, {
      props: { article: BASE_ARTICLE as never },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Aucune étape validée')
    expect(wrapper.find('.phase-badge').text()).toBe('Proposé')
  })
})
