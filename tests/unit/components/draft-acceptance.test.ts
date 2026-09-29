/**
 * FR-CER-PARENT-WRITTEN-GATE — le bandeau « premier jet accepté » : tant que
 * l'étape manque, il propose de la demander ; posée, il le dit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const { mockApiGet } = vi.hoisted(() => ({ mockApiGet: vi.fn() }))
vi.mock('../../../src/services/api.service', () => ({ apiGet: mockApiGet, apiPost: vi.fn(), apiPut: vi.fn() }))

import DraftAcceptance from '../../../src/components/article/DraftAcceptance.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
})

describe('DraftAcceptance', () => {
  it('étape absente : le bandeau propose de valider le premier jet', async () => {
    mockApiGet.mockResolvedValue({ phase: 'redaction', completedChecks: ['moteur:lexique_validated'] })
    const wrapper = mount(DraftAcceptance, { props: { articleId: 7, hasContent: true } })
    await flushPromises()
    expect(mockApiGet).toHaveBeenCalledWith('/articles/7/progress')
    expect(wrapper.text()).toMatch(/pas encore accepté/)
    await wrapper.get('[data-testid="draft-accept"]').trigger('click')
    expect(wrapper.emitted('accept')).toHaveLength(1)
  })

  it('étape posée : le bandeau le dit, sans bouton', async () => {
    mockApiGet.mockResolvedValue({ phase: 'redaction', completedChecks: ['redaction:draft_accepted'] })
    const wrapper = mount(DraftAcceptance, { props: { articleId: 7, hasContent: true } })
    await flushPromises()
    expect(wrapper.find('[data-testid="draft-accepted"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="draft-accept"]').exists()).toBe(false)
  })

  it('sans texte, rien à valider', async () => {
    mockApiGet.mockResolvedValue(null)
    const wrapper = mount(DraftAcceptance, { props: { articleId: 7, hasContent: false } })
    await flushPromises()
    expect(wrapper.find('[data-testid="draft-acceptance"]').exists()).toBe(false)
  })
})
