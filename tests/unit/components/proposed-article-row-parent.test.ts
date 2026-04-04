import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('ProposedArticleRow — parentTitle display', () => {
  it('shows parentTitle badge when parentTitle is present and collapsed', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Mon Intermédiaire Parent' }),
        index: 0,
      },
    })
    const badge = wrapper.find('[data-testid="parent-title-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Mon Intermédiaire Parent')
  })

  it('hides parentTitle badge when parentTitle is null', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: null }),
        index: 0,
      },
    })
    expect(wrapper.find('[data-testid="parent-title-badge"]').exists()).toBe(false)
  })

  it('truncates parentTitle at 30 characters', () => {
    const longTitle = 'Ceci est un titre très très long qui dépasse trente caractères facilement'
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: longTitle }),
        index: 0,
      },
    })
    const badge = wrapper.find('[data-testid="parent-title-badge"]')
    expect(badge.exists()).toBe(true)
    // The displayed text should be truncated to 30 chars + ellipsis
    const displayed = badge.text()
    expect(displayed.length).toBeLessThanOrEqual(longTitle.length)
    expect(displayed).toContain('…')
    // Verify first 30 chars are present
    expect(displayed).toContain(longTitle.slice(0, 30))
  })

  it('hides parentTitle badge when expanded', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Mon Parent' }),
        index: 0,
      },
    })
    // Initially collapsed — badge visible
    expect(wrapper.find('[data-testid="parent-title-badge"]').exists()).toBe(true)

    // Expand the card
    await wrapper.find('.proposal-item').trigger('click')

    // Badge should be hidden when expanded
    expect(wrapper.find('[data-testid="parent-title-badge"]').exists()).toBe(false)
  })
})

describe('ProposedArticleRow — groupColor', () => {
  it('applies border-left when groupColor is provided', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle(),
        index: 0,
        groupColor: '#3b82f6',
      },
    })
    const item = wrapper.find('.proposal-item')
    const style = item.attributes('style') ?? ''
    expect(style).toContain('border-left')
    expect(style).toContain('3px solid')
  })

  it('does not apply border-left when groupColor is absent', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle(),
        index: 0,
      },
    })
    const item = wrapper.find('.proposal-item')
    const style = item.attributes('style') ?? ''
    expect(style).not.toContain('border-left')
  })
})

describe('ProposedArticleRow — kebab dropdown (collapsed)', () => {
  it('opens kebab menu on click', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    expect(wrapper.find('[data-testid="actions-menu"]').exists()).toBe(false)

    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')

    expect(wrapper.find('[data-testid="actions-menu"]').exists()).toBe(true)
  })

  it('shows 3 regen items without link when no availableParents', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')

    const items = wrapper.findAll('.actions-menu-item')
    expect(items).toHaveLength(3)
    expect(items[0].text()).toBe('Régénérer le titre')
    expect(items[1].text()).toBe('Régénérer le mot-clé')
    expect(items[2].text()).toBe('Régénérer le slug')
  })

  it('shows 4 items including link when availableParents provided', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0, availableParents: ['Parent A'] },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')

    const items = wrapper.findAll('.actions-menu-item')
    expect(items).toHaveLength(4)
    expect(items[3].text()).toBe('Rattacher à un intermédiaire')
  })

  it('emits regenerate-title from kebab and closes menu', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 1 },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.findAll('.actions-menu-item')[0].trigger('click')

    expect(wrapper.emitted('regenerate-title')).toEqual([[1]])
    expect(wrapper.find('[data-testid="actions-menu"]').exists()).toBe(false)
  })

  it('emits regenerate-keyword from kebab', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 2 },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.findAll('.actions-menu-item')[1].trigger('click')

    expect(wrapper.emitted('regenerate-keyword')).toEqual([[2]])
  })

  it('emits regenerate-slug from kebab', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 3 },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.findAll('.actions-menu-item')[2].trigger('click')

    expect(wrapper.emitted('regenerate-slug')).toEqual([[3]])
  })

  it('closes kebab menu on backdrop click', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="actions-menu"]').exists()).toBe(true)

    await wrapper.find('.actions-menu-backdrop').trigger('click')

    expect(wrapper.find('[data-testid="actions-menu"]').exists()).toBe(false)
  })
})

describe('ProposedArticleRow — link parent via kebab', () => {
  const parents = ['Intermédiaire A', 'Intermédiaire B', 'Intermédiaire C']

  it('shows link item in kebab when availableParents is provided', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Intermédiaire A' }),
        index: 0,
        availableParents: parents,
      },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="link-parent-btn"]').exists()).toBe(true)
  })

  it('hides link item in kebab when availableParents is empty', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0, availableParents: [] },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="link-parent-btn"]').exists()).toBe(false)
  })

  it('opens parent menu from kebab link item', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Intermédiaire A' }),
        index: 0,
        availableParents: parents,
      },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.find('[data-testid="link-parent-btn"]').trigger('click')

    const menu = wrapper.find('[data-testid="parent-menu"]')
    expect(menu.exists()).toBe(true)
    const items = menu.findAll('.parent-menu-item')
    expect(items).toHaveLength(3)
  })

  it('emits change-parent on menu item click', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Intermédiaire A' }),
        index: 2,
        availableParents: parents,
      },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.find('[data-testid="link-parent-btn"]').trigger('click')

    await wrapper.findAll('.parent-menu-item')[1].trigger('click')

    expect(wrapper.emitted('change-parent')).toEqual([[2, 'Intermédiaire B']])
  })

  it('closes parent menu after selecting', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Intermédiaire A' }),
        index: 0,
        availableParents: parents,
      },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.find('[data-testid="link-parent-btn"]').trigger('click')

    await wrapper.findAll('.parent-menu-item')[1].trigger('click')

    expect(wrapper.find('[data-testid="parent-menu"]').exists()).toBe(false)
  })

  it('closes parent menu on backdrop click', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Intermédiaire A' }),
        index: 0,
        availableParents: parents,
      },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.find('[data-testid="link-parent-btn"]').trigger('click')

    await wrapper.find('.parent-menu-backdrop').trigger('click')

    expect(wrapper.find('[data-testid="parent-menu"]').exists()).toBe(false)
  })

  it('highlights current parent in menu', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ parentTitle: 'Intermédiaire B' }),
        index: 0,
        availableParents: parents,
      },
    })
    await wrapper.find('[data-testid="kebab-btn"]').trigger('click')
    await wrapper.find('[data-testid="link-parent-btn"]').trigger('click')

    const items = wrapper.findAll('.parent-menu-item')
    expect(items[0].classes()).not.toContain('parent-menu-item--active')
    expect(items[1].classes()).toContain('parent-menu-item--active')
    expect(items[2].classes()).not.toContain('parent-menu-item--active')
  })
})

describe('ProposedArticleRow — regen dropdown (expanded)', () => {
  it('shows regen dropdown button when expanded', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')

    expect(wrapper.find('[data-testid="regen-dropdown-btn"]').exists()).toBe(true)
  })

  it('opens regen menu on click', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('[data-testid="regen-dropdown-btn"]').trigger('click')

    const menu = wrapper.find('[data-testid="regen-menu"]')
    expect(menu.exists()).toBe(true)
    const items = menu.findAll('.actions-menu-item')
    expect(items).toHaveLength(3)
    expect(items[0].text()).toBe('Titre')
    expect(items[1].text()).toBe('Mot-clé')
    expect(items[2].text()).toBe('Slug')
  })

  it('emits regenerate-title from regen dropdown', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 1 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('[data-testid="regen-dropdown-btn"]').trigger('click')
    await wrapper.findAll('[data-testid="regen-menu"] .actions-menu-item')[0].trigger('click')

    expect(wrapper.emitted('regenerate-title')).toEqual([[1]])
    expect(wrapper.find('[data-testid="regen-menu"]').exists()).toBe(false)
  })

  it('emits regenerate-keyword from regen dropdown', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 2 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('[data-testid="regen-dropdown-btn"]').trigger('click')
    await wrapper.findAll('[data-testid="regen-menu"] .actions-menu-item')[1].trigger('click')

    expect(wrapper.emitted('regenerate-keyword')).toEqual([[2]])
  })

  it('emits regenerate-slug from regen dropdown', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 3 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('[data-testid="regen-dropdown-btn"]').trigger('click')
    await wrapper.findAll('[data-testid="regen-menu"] .actions-menu-item')[2].trigger('click')

    expect(wrapper.emitted('regenerate-slug')).toEqual([[3]])
  })

  it('closes regen menu on backdrop click', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('[data-testid="regen-dropdown-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="regen-menu"]').exists()).toBe(true)

    await wrapper.find('[data-testid="regen-menu"] .actions-menu-backdrop').trigger('click')

    expect(wrapper.find('[data-testid="regen-menu"]').exists()).toBe(false)
  })
})

describe('ProposedArticleRow — composition tooltip', () => {
  it('shows warning badge with total count (composition + structural)', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle(),
        index: 0,
        compositionResult: {
          allPass: false,
          warningCount: 2,
          results: [
            { rule: 'word_count', pass: false, severity: 'warning' as const, message: 'Trop court' },
            { rule: 'location', pass: false, severity: 'warning' as const, message: 'Pas de lieu' },
          ],
        },
        structuralWarnings: [
          { type: 'orphan_spe', message: 'Intermédiaire inexistant' },
        ],
      },
    })
    const badge = wrapper.find('[data-testid="composition-badge-warn"]')
    expect(badge.exists()).toBe(true)
    // 2 composition + 1 structural = 3
    expect(badge.text()).toContain('3')
  })

  it('shows tooltip on badge hover with structural + composition sections', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle(),
        index: 0,
        compositionResult: {
          allPass: false,
          warningCount: 1,
          results: [
            { rule: 'word_count', pass: false, severity: 'warning' as const, message: 'Trop court' },
          ],
        },
        structuralWarnings: [
          { type: 'orphan_spe', message: 'Intermédiaire inexistant' },
        ],
      },
    })
    // No tooltip initially
    expect(wrapper.find('[data-testid="composition-tooltip"]').exists()).toBe(false)

    // Hover badge
    await wrapper.find('[data-testid="composition-badge-warn"]').trigger('mouseenter')

    const tooltip = wrapper.find('[data-testid="composition-tooltip"]')
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.text()).toContain('Structure')
    expect(tooltip.text()).toContain('Intermédiaire inexistant')
    expect(tooltip.text()).toContain('Trop court')
  })

  it('shows ok badge when no warnings at all', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle(),
        index: 0,
        compositionResult: {
          allPass: true,
          warningCount: 0,
          results: [
            { rule: 'word_count', pass: true, severity: 'info' as const, message: 'OK' },
          ],
        },
        structuralWarnings: [],
      },
    })
    expect(wrapper.find('[data-testid="composition-badge-ok"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="composition-badge-warn"]').exists()).toBe(false)
  })

  it('shows warn badge with only structural warnings (no composition result)', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ suggestedKeyword: '' }),
        index: 0,
        structuralWarnings: [
          { type: 'missing_parent', message: 'Pas de lien vers un Intermédiaire' },
        ],
      },
    })
    const badge = wrapper.find('[data-testid="composition-badge-warn"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('1')
  })
})
