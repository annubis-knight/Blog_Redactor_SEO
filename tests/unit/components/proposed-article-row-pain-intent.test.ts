/**
 * Tests TDD pour le dropdown radio painIntentExpected dans ProposedArticleRow.vue.
 * FR : FR-PIE-CERVEAU-OVERRIDE.
 *
 * Couvre :
 *   1. Affichage de la valeur courante.
 *   2. Émission d'un event au changement.
 *   3. 5 options : 4 valeurs + « Non défini » (null).
 *   4. Le dropdown apparaît uniquement quand l'article est déplié.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ProposedArticle } from '../../../shared/types/strategy.types'
import ProposedArticleRow from '../../../src/components/strategy/ProposedArticleRow.vue'

function makeArticle(overrides: Partial<ProposedArticle> = {}): ProposedArticle {
  return {
    title: 'Test article Spécialisé',
    suggestedTitles: ['Test article Spécialisé'],
    type: 'Spécialisé',
    parentTitle: null,
    rationale: 'Test rationale',
    painPoint: 'Test pain point',
    painIntentExpected: 'informational',
    suggestedKeyword: 'comment optimiser seo site professionnel',
    suggestedKeywords: [],
    suggestedSlug: '',
    suggestedSlugs: [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: false,
    createdInDb: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Le dropdown vit dans le bloc `.proposal-details` rendu uniquement quand
 * l'article est déplié (v-if="expanded"). On clique donc sur la zone pour
 * déplier avant d'inspecter le select.
 */
async function mountExpanded(article: ProposedArticle) {
  const wrapper = mount(ProposedArticleRow, { props: { article, index: 0 } })
  await wrapper.find('.proposal-item').trigger('click')
  return wrapper
}

describe('ProposedArticleRow — pain intent expected dropdown', () => {
  it('expose un select avec data-testid="pain-intent-select"', async () => {
    const wrapper = await mountExpanded(makeArticle())
    const select = wrapper.find('[data-testid="pain-intent-select"]')
    expect(select.exists()).toBe(true)
  })

  it('affiche la valeur courante painIntentExpected', async () => {
    const wrapper = await mountExpanded(makeArticle({ painIntentExpected: 'commercial' }))
    const select = wrapper.find<HTMLSelectElement>('[data-testid="pain-intent-select"]')
    expect(select.element.value).toBe('commercial')
  })

  it('affiche la valeur vide quand painIntentExpected est null', async () => {
    const wrapper = await mountExpanded(makeArticle({ painIntentExpected: null }))
    const select = wrapper.find<HTMLSelectElement>('[data-testid="pain-intent-select"]')
    expect(select.element.value).toBe('')
  })

  it('contient exactement 5 options : 4 valeurs + Non défini', async () => {
    const wrapper = await mountExpanded(makeArticle())
    const options = wrapper.findAll('[data-testid="pain-intent-select"] option')
    expect(options).toHaveLength(5)
    const values = options.map(o => o.attributes('value'))
    expect(values).toContain('')
    expect(values).toContain('informational')
    expect(values).toContain('commercial')
    expect(values).toContain('transactional')
    expect(values).toContain('navigational')
  })

  it('émet update:pain-intent-expected quand l\'utilisateur change la valeur', async () => {
    const wrapper = await mountExpanded(makeArticle({ painIntentExpected: 'informational' }))
    const select = wrapper.find('[data-testid="pain-intent-select"]')
    await select.setValue('commercial')
    expect(wrapper.emitted('update:pain-intent-expected')).toBeTruthy()
    expect(wrapper.emitted('update:pain-intent-expected')![0]).toEqual(['commercial'])
  })

  it('émet null quand l\'utilisateur sélectionne « Non défini »', async () => {
    const wrapper = await mountExpanded(makeArticle({ painIntentExpected: 'commercial' }))
    const select = wrapper.find('[data-testid="pain-intent-select"]')
    await select.setValue('')
    expect(wrapper.emitted('update:pain-intent-expected')).toBeTruthy()
    expect(wrapper.emitted('update:pain-intent-expected')![0]).toEqual([null])
  })
})
