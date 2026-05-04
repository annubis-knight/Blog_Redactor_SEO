import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiPanel from '@/components/moteur/ai-panel/AiPanel.vue'

// Sprint 3 (2026-05-04) — depuis le sprint 3, les panels IA sont COLLAPSED
// par défaut. Les tests existants ci-dessous testent le contenu rendu QUAND
// le panel est déployé (cas usuel : utilisateur clique pour expand).
// Ils utilisent `defaultCollapsed: false` pour rester focalisés sur leur
// contrat d'origine. Tests dédiés au collapse vivent dans ai-panel-collapse.test.ts.
const NON_COLLAPSED = { defaultCollapsed: false } as const

describe('AiPanel', () => {
  it('renders idle state with CTA "Analyser"', () => {
    const w = mount(AiPanel, {
      props: { variant: 'suggestion', title: 'Test', state: 'idle', ...NON_COLLAPSED },
    })
    expect(w.find('[data-testid="ai-panel-suggestion"]').exists()).toBe(true)
    expect(w.find('[data-testid="ai-trigger-primary"]').text()).toContain('Analyser')
    expect(w.find('[data-testid="ai-panel-skeleton"]').exists()).toBe(false)
  })

  it('renders skeleton when state="streaming"', () => {
    const w = mount(AiPanel, {
      props: { variant: 'suggestion', title: 'Test', state: 'streaming', ...NON_COLLAPSED },
    })
    expect(w.find('[data-testid="ai-panel-skeleton"]').exists()).toBe(true)
  })

  it('renders error message when state="error"', () => {
    const w = mount(AiPanel, {
      props: { variant: 'suggestion', title: 'Test', state: 'error', error: 'Boom', ...NON_COLLAPSED },
    })
    expect(w.find('[data-testid="ai-panel-error"]').text()).toContain('Boom')
  })

  it('renders default slot when state="success"', () => {
    const w = mount(AiPanel, {
      props: { variant: 'suggestion', title: 'Test', state: 'success', ...NON_COLLAPSED },
      slots: { default: '<p data-testid="content">Hello</p>' },
    })
    expect(w.find('[data-testid="content"]').exists()).toBe(true)
  })

  it('shows stale notice when isStale=true and state=success', () => {
    const w = mount(AiPanel, {
      props: { variant: 'suggestion', title: 'T', state: 'success', isStale: true, ...NON_COLLAPSED },
    })
    expect(w.find('[data-testid="ai-panel-stale"]').exists()).toBe(true)
  })

  it('uses regen variant on success state', () => {
    const w = mount(AiPanel, {
      props: { variant: 'suggestion', title: 'T', state: 'success', ...NON_COLLAPSED },
    })
    expect(w.find('[data-testid="ai-trigger-regen"]').exists()).toBe(true)
    expect(w.find('[data-testid="ai-trigger-primary"]').exists()).toBe(false)
  })

  it('emits "trigger" when CTA clicked', async () => {
    const w = mount(AiPanel, {
      props: { variant: 'suggestion', title: 'T', state: 'idle', ...NON_COLLAPSED },
    })
    await w.find('[data-testid="ai-trigger-primary"]').trigger('click')
    expect(w.emitted('trigger')).toHaveLength(1)
  })

  it('applies advice variant class', () => {
    const w = mount(AiPanel, {
      props: { variant: 'advice', title: 'T', state: 'idle', ...NON_COLLAPSED },
    })
    expect(w.find('[data-testid="ai-panel-advice"]').classes()).toContain('aip--advice')
  })
})
