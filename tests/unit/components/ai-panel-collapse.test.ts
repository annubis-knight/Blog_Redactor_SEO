/**
 * Sprint 3 (2026-05-04) — Tests panels IA collapse par défaut.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   « les panel ia doivent être collapse par defaut »
 *   « les panel ia de la sidebar doivent être collapse par defaut »
 *
 * Aujourd'hui les panels s'étalent inutilement à l'ouverture, occupent
 * de l'espace pour rien si l'utilisateur n'a pas demandé d'analyse IA.
 *
 * Spec : nouvelle prop `defaultCollapsed: boolean = true`. Auto-uncollapse
 * pendant streaming/error pour ne pas masquer une opération en cours.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AiPanel from '../../../src/components/moteur/ai-panel/AiPanel.vue'

const STUBS = {
  AiPanelHeader: { name: 'AiPanelHeader', template: '<div class="aiph-stub" data-testid="ai-panel-header"></div>', props: ['title', 'subtitle'] },
  AiTriggerButton: { name: 'AiTriggerButton', template: '<button class="atb-stub"></button>', props: ['variant', 'loading', 'disabled', 'label', 'confirmMessage'], emits: ['click'] },
  AiPanelSkeleton: { name: 'AiPanelSkeleton', template: '<div class="aips-stub"></div>', props: ['lines'] },
}

const BASE_PROPS = {
  variant: 'suggestion' as const,
  title: 'Test',
  subtitle: 'Sub',
  state: 'idle' as const,
}

function mountAiPanel(propsOverride: Record<string, unknown> = {}) {
  return mount(AiPanel, { props: { ...BASE_PROPS, ...propsOverride }, global: { stubs: STUBS } })
}

describe('AiPanel — collapse par défaut (Sprint 3)', () => {
  it('AC3 — par défaut, le body est masqué (collapsed)', () => {
    const w = mountAiPanel()
    // Le footer (CTA) ET le body ne doivent PAS être visibles si collapsed.
    expect(w.find('[data-testid="ai-panel-collapsed"]').exists()).toBe(true)
    expect(w.find('.aip__footer').exists()).toBe(false)
  })

  it('AC3 — clic sur le bouton expand développe le panel', async () => {
    const w = mountAiPanel()
    await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
    expect(w.find('[data-testid="ai-panel-collapsed"]').exists()).toBe(false)
    expect(w.find('.aip__footer').exists()).toBe(true)
  })

  it('AC3 — re-clic sur le bouton replie le panel', async () => {
    const w = mountAiPanel()
    await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
    await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
    expect(w.find('[data-testid="ai-panel-collapsed"]').exists()).toBe(true)
  })

  it('AC3 — état "streaming" auto-déploie le panel', async () => {
    const w = mountAiPanel({ state: 'streaming' })
    await nextTick()
    // streaming ouvre automatiquement (l'utilisateur veut voir le streaming)
    expect(w.find('[data-testid="ai-panel-collapsed"]').exists()).toBe(false)
  })

  it('AC3 — état "error" auto-déploie le panel', async () => {
    const w = mountAiPanel({ state: 'error', error: 'Failed' })
    await nextTick()
    expect(w.find('[data-testid="ai-panel-collapsed"]').exists()).toBe(false)
    expect(w.find('[data-testid="ai-panel-error"]').exists()).toBe(true)
  })

  it('AC3 — prop `defaultCollapsed: false` désactive le collapse initial', () => {
    const w = mountAiPanel({ defaultCollapsed: false })
    expect(w.find('[data-testid="ai-panel-collapsed"]').exists()).toBe(false)
    expect(w.find('.aip__footer').exists()).toBe(true)
  })

  it('AC3 — état "success" reste collapsed si l\'utilisateur a fermé', async () => {
    const w = mountAiPanel({ state: 'success' })
    // Ouvert puis fermé manuellement
    await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
    await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
    // Reste collapsed même si state success
    expect(w.find('[data-testid="ai-panel-collapsed"]').exists()).toBe(true)
  })
})
