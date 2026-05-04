/**
 * Sprint 1 (2026-05-04) — Tests LieutenantsAiPanel (REFONTE).
 *
 * Histoire : Sprint C-1 (2026-05-02) avait fait de ce composant un wrapper
 * qui absorbait `LieutenantProposals` (cards Lieutenants = container PRINCIPAL)
 * et `LieutenantH2Structure` (= container PRINCIPAL). C'était la cause racine
 * de la friction utilisateur "mes mots-clés Lieutenants apparaissent dans le
 * panel IA au lieu du container principal" (audit 2026-05-03).
 *
 * Sprint 1 (2026-05-04) refait LieutenantsAiPanel en panel PUR :
 *   - streaming chunk
 *   - bouton Régénérer (event `retry`)
 *   - erreur IA + retry
 *   - content-gap insights
 *
 * Plus AUCUN container principal Lieutenants ni Hn n'est wrappé ici.
 * Test verrou anti-régression :
 *   tests/unit/components/lieutenants-selection-architecture.test.ts
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LieutenantsAiPanel from '@/components/moteur/LieutenantsAiPanel.vue'

const STUBS = {
  AiPanelHeader: {
    name: 'AiPanelHeader',
    template: '<div data-testid="ai-panel-header"><h3>{{ title }}</h3><p>{{ subtitle }}</p></div>',
    props: ['title', 'subtitle'],
  },
}

const BASE_PROPS = {
  iaIsStreaming: false,
  iaChunks: '',
  iaError: null,
  isLocked: false,
  contentGapInsights: '',
  totalGenerated: 0,
}

describe('LieutenantsAiPanel — panel IA pur (post-Sprint 1)', () => {
  it('rend la coque purple commune avec le testid ai-panel-suggestion', () => {
    const w = mount(LieutenantsAiPanel, { props: BASE_PROPS, global: { stubs: STUBS } })
    expect(w.find('[data-testid="ai-panel-suggestion"]').exists()).toBe(true)
  })

  it('NE rend PAS de stub LieutenantProposals (= container principal n\'est PAS ici)', () => {
    // Verrou anti-régression : si quelqu'un re-importe LieutenantProposals
    // dans LieutenantsAiPanel, ce test casse.
    const w = mount(LieutenantsAiPanel, { props: BASE_PROPS, global: { stubs: STUBS } })
    expect(w.findComponent({ name: 'LieutenantProposals' }).exists()).toBe(false)
  })

  it('NE rend PAS de stub LieutenantH2Structure (= container principal n\'est PAS ici)', () => {
    const w = mount(LieutenantsAiPanel, { props: BASE_PROPS, global: { stubs: STUBS } })
    expect(w.findComponent({ name: 'LieutenantH2Structure' }).exists()).toBe(false)
  })

  it('affiche un message d\'idle avec totalGenerated quand pas de streaming', () => {
    const w = mount(LieutenantsAiPanel, {
      props: { ...BASE_PROPS, totalGenerated: 5 },
      global: { stubs: STUBS },
    })
    expect(w.html()).toContain('5')
    expect(w.find('[data-testid="ai-regen-btn"]').exists()).toBe(true)
  })

  it('affiche le bloc streaming quand iaIsStreaming est vrai', () => {
    const w = mount(LieutenantsAiPanel, {
      props: { ...BASE_PROPS, iaIsStreaming: true, iaChunks: 'token by token' },
      global: { stubs: STUBS },
    })
    expect(w.find('.lap__streaming').exists()).toBe(true)
    expect(w.html()).toContain('token by token')
  })

  it('affiche le bloc erreur + bouton retry quand iaError est posé', () => {
    const w = mount(LieutenantsAiPanel, {
      props: { ...BASE_PROPS, iaError: 'Endpoint failed' },
      global: { stubs: STUBS },
    })
    expect(w.find('.lap__error').exists()).toBe(true)
    expect(w.html()).toContain('Endpoint failed')
    expect(w.find('[data-testid="ai-retry-btn"]').exists()).toBe(true)
  })

  it('affiche les content-gap insights quand contentGapInsights est défini', () => {
    const w = mount(LieutenantsAiPanel, {
      props: { ...BASE_PROPS, contentGapInsights: 'Manque section retour client' },
      global: { stubs: STUBS },
    })
    expect(w.find('.lap__insights').exists()).toBe(true)
    expect(w.html()).toContain('Manque section retour client')
  })

  it('clic sur le bouton retry émet l\'event `retry`', async () => {
    const w = mount(LieutenantsAiPanel, {
      props: { ...BASE_PROPS, iaError: 'failed' },
      global: { stubs: STUBS },
    })
    await w.find('[data-testid="ai-retry-btn"]').trigger('click')
    expect(w.emitted('retry')).toBeTruthy()
  })

  it('clic sur le bouton "Régénérer" en idle émet aussi `retry`', async () => {
    const w = mount(LieutenantsAiPanel, {
      props: { ...BASE_PROPS, totalGenerated: 3 },
      global: { stubs: STUBS },
    })
    await w.find('[data-testid="ai-regen-btn"]').trigger('click')
    expect(w.emitted('retry')).toBeTruthy()
  })

  it('le bouton régénérer disparaît si isLocked=true (pas d\'IA après lock)', () => {
    const w = mount(LieutenantsAiPanel, {
      props: { ...BASE_PROPS, totalGenerated: 3, isLocked: true },
      global: { stubs: STUBS },
    })
    expect(w.find('[data-testid="ai-regen-btn"]').exists()).toBe(false)
  })
})
