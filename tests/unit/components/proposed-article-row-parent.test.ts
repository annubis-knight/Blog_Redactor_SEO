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

describe('ProposedArticleRow — accepted border', () => {
  it('does not have accepted class when article is not accepted', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ accepted: false }),
        index: 0,
      },
    })
    const item = wrapper.find('.proposal-item')
    expect(item.classes()).not.toContain('accepted')
  })

  it('has accepted class when article is accepted', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle({ accepted: true }),
        index: 0,
      },
    })
    const item = wrapper.find('.proposal-item')
    expect(item.classes()).toContain('accepted')
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

describe('ProposedArticleRow — Titre label & bigger title (expanded)', () => {
  it('shows Titre label when expanded', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    // Collapsed: no label
    expect(wrapper.find('.proposal-title-block .keyword-label').exists()).toBe(false)

    await wrapper.find('.proposal-item').trigger('click')

    const label = wrapper.find('.proposal-title-block .keyword-label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Titre')
  })

  it('has expanded class on title when expanded', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')

    expect(wrapper.find('.expanded .proposal-title').exists()).toBe(true)
  })
})

describe('ProposedArticleRow — inline edit', () => {
  it('shows edit icon next to Titre label when expanded', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')

    const editBtn = wrapper.find('.proposal-title-block .edit-icon-btn')
    expect(editBtn.exists()).toBe(true)
  })

  it('shows edit icon next to Mot-clé and Slug labels when expanded', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle({ suggestedSlug: 'test-slug' }), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')

    const editBtns = wrapper.findAll('.edit-icon-btn')
    // Title + Keyword + Slug = 3
    expect(editBtns.length).toBe(3)
  })

  it('enters title edit mode on pencil click', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('.proposal-title-block .edit-icon-btn').trigger('click')

    const input = wrapper.find('.inline-edit-input--title')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Test article Spécialisé')
  })

  it('emits edit-title on blur with changed value', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 2 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('.proposal-title-block .edit-icon-btn').trigger('click')

    const input = wrapper.find('.inline-edit-input--title')
    await input.setValue('Nouveau titre')
    await input.trigger('blur')

    expect(wrapper.emitted('edit-title')).toEqual([[2, 'Nouveau titre']])
  })

  it('does not emit edit-title if value unchanged', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('.proposal-title-block .edit-icon-btn').trigger('click')

    const input = wrapper.find('.inline-edit-input--title')
    await input.trigger('blur')

    expect(wrapper.emitted('edit-title')).toBeUndefined()
  })

  it('enters keyword edit mode and emits edit-keyword on blur', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 1 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('.keyword-slider .edit-icon-btn').trigger('click')

    const input = wrapper.find('.keyword-slider .inline-edit-input')
    expect(input.exists()).toBe(true)
    await input.setValue('nouveau mot-clé')
    await input.trigger('blur')

    expect(wrapper.emitted('edit-keyword')).toEqual([[1, 'nouveau mot-clé']])
  })

  it('enters slug edit mode and emits edit-slug on blur', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle({ suggestedSlug: 'old-slug' }), index: 3 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    await wrapper.find('.slug-slider .edit-icon-btn').trigger('click')

    const input = wrapper.find('.slug-slider .inline-edit-input')
    expect(input.exists()).toBe(true)
    await input.setValue('new-slug')
    await input.trigger('blur')

    expect(wrapper.emitted('edit-slug')).toEqual([[3, 'new-slug']])
  })
})

describe('ProposedArticleRow — keyword badge color by type', () => {
  it('applies pilier color class for Pilier type', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle({ type: 'Pilier' }), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')

    const badge = wrapper.find('.keyword-badge')
    expect(badge.classes()).toContain('keyword-badge--pilier')
  })

  it('applies inter color class for Intermédiaire type', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle({ type: 'Intermédiaire' }), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')

    const badge = wrapper.find('.keyword-badge')
    expect(badge.classes()).toContain('keyword-badge--inter')
  })

  it('applies spe color class for Spécialisé type', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle({ type: 'Spécialisé' }), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')

    const badge = wrapper.find('.keyword-badge')
    expect(badge.classes()).toContain('keyword-badge--spe')
  })
})
