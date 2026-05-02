import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiSuggestionList from '@/components/moteur/ai-panel/AiSuggestionList.vue'

interface Item { id: string; label: string }

const items: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
]

describe('AiSuggestionList', () => {
  it('renders all items with checkboxes', () => {
    const w = mount(AiSuggestionList<Item>, {
      props: { items, handoffLabel: 'Envoyer' },
      slots: { default: ({ item }: { item: Item }) => item.label },
    })
    expect(w.findAll('input[type="checkbox"]').length).toBe(3)
    expect(w.text()).toContain('Alpha')
    expect(w.text()).toContain('Gamma')
  })

  it('pre-selects all items by default', () => {
    const w = mount(AiSuggestionList<Item>, {
      props: { items, handoffLabel: 'Envoyer' },
      slots: { default: ({ item }: { item: Item }) => item.label },
    })
    expect(w.text()).toContain('3 / 3 sélectionnés')
  })

  it('respects initialSelected', () => {
    const w = mount(AiSuggestionList<Item>, {
      props: { items, handoffLabel: 'Envoyer', initialSelected: ['a'] },
      slots: { default: ({ item }: { item: Item }) => item.label },
    })
    expect(w.text()).toContain('1 / 3 sélectionné')
  })

  it('toggles selection when checkbox clicked', async () => {
    const w = mount(AiSuggestionList<Item>, {
      props: { items, handoffLabel: 'Envoyer' },
      slots: { default: ({ item }: { item: Item }) => item.label },
    })
    await w.find('[data-testid="ai-suggestion-checkbox-a"]').trigger('change')
    expect(w.text()).toContain('2 / 3 sélectionnés')
  })

  it('emits "handoff" with selected items', async () => {
    const w = mount(AiSuggestionList<Item>, {
      props: { items, handoffLabel: 'Envoyer' },
      slots: { default: ({ item }: { item: Item }) => item.label },
    })
    await w.find('[data-testid="ai-suggestion-handoff"]').trigger('click')
    const handoff = w.emitted('handoff') as Item[][][]
    expect(handoff).toHaveLength(1)
    expect(handoff![0][0]).toHaveLength(3)
  })

  it('emits "selection-changed" on toggle', async () => {
    const w = mount(AiSuggestionList<Item>, {
      props: { items, handoffLabel: 'Envoyer' },
      slots: { default: ({ item }: { item: Item }) => item.label },
    })
    await w.find('[data-testid="ai-suggestion-checkbox-a"]').trigger('change')
    expect(w.emitted('selection-changed')).toBeDefined()
  })

  it('disables handoff when no items selected and disableEmpty=true', async () => {
    const w = mount(AiSuggestionList<Item>, {
      props: { items, handoffLabel: 'Envoyer', initialSelected: [], disableEmpty: true },
      slots: { default: ({ item }: { item: Item }) => item.label },
    })
    expect(w.find('[data-testid="ai-suggestion-handoff"]').attributes('disabled')).toBeDefined()
  })
})
