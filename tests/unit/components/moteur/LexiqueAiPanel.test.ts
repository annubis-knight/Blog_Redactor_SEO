/**
 * Sprint C-2 (2026-05-02) — Tests LexiqueAiPanel.
 *
 * Wrapper bas-de-page qui regroupe l'analyse IA du Lexique sous la coque
 * commune. L'extraction TF-IDF reste à sa place dans LexiqueExtraction.vue.
 * Ce panel résume les recommandations IA et expose le CTA de régénération.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LexiqueAiPanel from '@/components/moteur/LexiqueAiPanel.vue'

describe('LexiqueAiPanel', () => {
  const COMMON = {
    iaIsStreaming: false,
    iaError: null as string | null,
    recommendationsCount: 0,
    recommendedCount: 0,
    notRecommendedCount: 0,
    canTrigger: true,
  }

  it('rend la coque AiPanel suggestion', () => {
    const w = mount(LexiqueAiPanel, { props: COMMON })
    expect(w.find('[data-testid="ai-panel-suggestion"]').exists()).toBe(true)
  })

  it('idle: bouton "Analyser avec l\'IA" présent + pas de stats', () => {
    const w = mount(LexiqueAiPanel, { props: COMMON })
    expect(w.find('[data-testid="ai-trigger-primary"]').exists()).toBe(true)
    expect(w.find('[data-testid="lexique-ai-stats"]').exists()).toBe(false)
  })

  it('streaming: skeleton visible, CTA disabled', () => {
    const w = mount(LexiqueAiPanel, { props: { ...COMMON, iaIsStreaming: true } })
    expect(w.find('[data-testid="ai-trigger-primary"]').attributes('disabled')).toBeDefined()
  })

  it('success: stats visibles avec nb total / recommandés / écartés', () => {
    const w = mount(LexiqueAiPanel, {
      props: { ...COMMON, recommendationsCount: 12, recommendedCount: 8, notRecommendedCount: 4 },
    })
    const stats = w.find('[data-testid="lexique-ai-stats"]')
    expect(stats.exists()).toBe(true)
    expect(stats.text()).toContain('12')
    expect(stats.text()).toContain('8')
    expect(stats.text()).toContain('4')
  })

  it('success: CTA bascule en "Régénérer" + confirmation', async () => {
    const w = mount(LexiqueAiPanel, {
      props: { ...COMMON, recommendationsCount: 5, recommendedCount: 3, notRecommendedCount: 2 },
    })
    expect(w.find('[data-testid="ai-trigger-regen"]').exists()).toBe(true)
  })

  it('error: bloc d\'erreur affiché', () => {
    const w = mount(LexiqueAiPanel, { props: { ...COMMON, iaError: 'Claude API down' } })
    const err = w.find('[data-testid="ai-panel-error"]')
    expect(err.exists()).toBe(true)
    expect(err.text()).toContain('Claude API down')
  })

  it('clic CTA → emit("trigger")', async () => {
    const w = mount(LexiqueAiPanel, { props: COMMON })
    await w.find('[data-testid="ai-trigger-primary"]').trigger('click')
    expect(w.emitted('trigger')).toBeTruthy()
  })

  it('canTrigger=false → CTA désactivé', () => {
    const w = mount(LexiqueAiPanel, { props: { ...COMMON, canTrigger: false } })
    expect(w.find('[data-testid="ai-trigger-primary"]').attributes('disabled')).toBeDefined()
  })
})
