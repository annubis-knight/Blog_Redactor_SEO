/**
 * Sprint C-1 (2026-05-02) — Tests LieutenantsAiPanel.
 *
 * Wrapper qui regroupe LieutenantProposals + LieutenantH2Structure dans deux
 * sections togglables, posé en bas de page sous la coque commune <AiPanel
 * variant="suggestion">.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LieutenantsAiPanel from '@/components/moteur/LieutenantsAiPanel.vue'

const STUBS = {
  // Stubs nommés (pour findComponent({ name: '…' })) avec émetteurs équivalents.
  LieutenantProposals: {
    name: 'LieutenantProposals',
    emits: ['toggle', 'retry'],
    template: '<div data-testid="stub-proposals" />',
  },
  LieutenantH2Structure: {
    name: 'LieutenantH2Structure',
    emits: ['save-hn', 'update:activeHnTab'],
    template: '<div data-testid="stub-hn-structure" />',
  },
}

const COMMON_PROPS = {
  iaIsStreaming: false,
  iaChunks: '',
  iaError: null,
  lieutenantCards: [],
  eliminatedCards: [],
  totalGenerated: 0,
  selectedCards: new Map(),
  isLocked: false,
  contentGapInsights: '',
  hnStructure: [],
  activeHnRecurrence: [],
  hnRecurrence: [],
  serpResultsByKeyword: new Map(),
  activeHnTab: '',
  hnSaved: false,
  isSavingHn: false,
}

describe('LieutenantsAiPanel', () => {
  it('rend une carte AiPanel suggestion en bas de page', () => {
    const w = mount(LieutenantsAiPanel, { props: COMMON_PROPS, global: { stubs: STUBS } })
    expect(w.find('[data-testid="ai-panel-suggestion"]').exists()).toBe(true)
  })

  it('par défaut, montre la section Propositions, pas la section Structure Hn', () => {
    const w = mount(LieutenantsAiPanel, { props: COMMON_PROPS, global: { stubs: STUBS } })
    expect(w.find('[data-testid="stub-proposals"]').exists()).toBe(true)
    expect(w.find('[data-testid="stub-hn-structure"]').exists()).toBe(false)
  })

  it('toggle bascule sur la section Structure Hn', async () => {
    const w = mount(LieutenantsAiPanel, { props: COMMON_PROPS, global: { stubs: STUBS } })
    await w.find('[data-testid="lieutenants-tab-hn"]').trigger('click')
    expect(w.find('[data-testid="stub-hn-structure"]').exists()).toBe(true)
    expect(w.find('[data-testid="stub-proposals"]').exists()).toBe(false)
  })

  it('toggle revient sur Propositions', async () => {
    const w = mount(LieutenantsAiPanel, { props: COMMON_PROPS, global: { stubs: STUBS } })
    await w.find('[data-testid="lieutenants-tab-hn"]').trigger('click')
    await w.find('[data-testid="lieutenants-tab-proposals"]').trigger('click')
    expect(w.find('[data-testid="stub-proposals"]').exists()).toBe(true)
    expect(w.find('[data-testid="stub-hn-structure"]').exists()).toBe(false)
  })

  it('propage les events toggle / retry / save-hn au parent', async () => {
    const w = mount(LieutenantsAiPanel, {
      props: COMMON_PROPS,
      global: { stubs: STUBS },
    })
    // Sur la section proposals : émet directement les events stub.
    const proposals = w.findComponent({ name: 'LieutenantProposals' })
    proposals.vm.$emit('toggle', { keyword: 'foo' })
    proposals.vm.$emit('retry')
    expect(w.emitted('toggle')).toBeTruthy()
    expect(w.emitted('retry')).toBeTruthy()

    // Bascule sur HN puis émet save-hn.
    await w.find('[data-testid="lieutenants-tab-hn"]').trigger('click')
    const hn = w.findComponent({ name: 'LieutenantH2Structure' })
    hn.vm.$emit('save-hn')
    expect(w.emitted('save-hn')).toBeTruthy()
  })
})
