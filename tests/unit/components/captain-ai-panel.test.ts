/**
 * Tests anti-régression pour CaptainAiPanel — panel d'avis IA streaming.
 *
 * Affiche le markdown SSE généré par Claude pendant la validation Capitaine.
 * Couvre :
 *   1. toggle open/close du panel
 *   2. dot streaming visible quand isStreaming=true
 *   3. message "Analyse en cours" quand streaming + pas encore de contenu
 *   4. error visible si error prop fournie
 *   5. parsedHtml rendu via v-safe-html
 *   6. message vide quand rien n'est en cours
 *   7. bouton regenerate visible UNIQUEMENT si canRegenerate + parsedHtml + !streaming
 *   8. clic regenerate → window.confirm puis emit('regenerate')
 *   9. verdictSummary affiché en tête si fourni
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CaptainAiPanel from '../../../src/components/moteur/CaptainAiPanel.vue'

// Stub minimal pour la directive v-safe-html (pas dispo dans test mounts isolés).
const safeHtmlStub = {
  mounted: (el: HTMLElement, binding: { value: string }) => {
    el.innerHTML = binding.value
  },
  updated: (el: HTMLElement, binding: { value: string }) => {
    el.innerHTML = binding.value
  },
}

const GLOBAL = {
  directives: { 'safe-html': safeHtmlStub },
}

describe('CaptainAiPanel', () => {
  beforeEach(() => {
    // Reset window.confirm spy entre tests
    vi.restoreAllMocks()
  })

  it('panel ouvert par défaut, contenu visible', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>Conseil</p>', isStreaming: false, error: null },
      global: GLOBAL,
    })
    expect(wrapper.find('[data-testid="ai-panel-content"]').exists()).toBe(true)
  })

  it('clic sur le toggle → ferme le panel', async () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>x</p>', isStreaming: false, error: null },
      global: GLOBAL,
    })
    expect(wrapper.find('[data-testid="ai-panel-content"]').exists()).toBe(true)
    await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="ai-panel-content"]').exists()).toBe(false)
  })

  it('dot streaming visible quand isStreaming=true', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '', isStreaming: true, error: null },
      global: GLOBAL,
    })
    expect(wrapper.find('.ai-panel-streaming-dot').exists()).toBe(true)
  })

  it('streaming sans contenu → "Analyse en cours..."', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '', isStreaming: true, error: null },
      global: GLOBAL,
    })
    expect(wrapper.text()).toContain('Analyse en cours')
  })

  it('error fourni → message d\'erreur affiché (pas de loading ni de contenu)', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '', isStreaming: false, error: 'API down' },
      global: GLOBAL,
    })
    expect(wrapper.find('.ai-panel-error').text()).toBe('API down')
    expect(wrapper.find('[data-testid="ai-panel-text"]').exists()).toBe(false)
  })

  it('parsedHtml fourni → rendu via v-safe-html', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p><strong>conseil</strong></p>', isStreaming: false, error: null },
      global: GLOBAL,
    })
    const text = wrapper.find('[data-testid="ai-panel-text"]')
    expect(text.exists()).toBe(true)
    expect(text.html()).toContain('<strong>conseil</strong>')
  })

  it('aucun état (pas de stream, pas d\'erreur, pas de contenu) → message vide', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '', isStreaming: false, error: null },
      global: GLOBAL,
    })
    expect(wrapper.text()).toContain('En attente des résultats')
  })

  it('REGRESSION GUARD : bouton regenerate visible UNIQUEMENT si canRegenerate + parsedHtml + !streaming', () => {
    // ❌ Pas canRegenerate → caché
    const w1 = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>x</p>', isStreaming: false, error: null, canRegenerate: false },
      global: GLOBAL,
    })
    expect(w1.find('[data-testid="ai-panel-regen"]').exists()).toBe(false)

    // ❌ Pas de parsedHtml → caché (évite double-trigger pendant le stream initial)
    const w2 = mount(CaptainAiPanel, {
      props: { parsedHtml: '', isStreaming: false, error: null, canRegenerate: true },
      global: GLOBAL,
    })
    expect(w2.find('[data-testid="ai-panel-regen"]').exists()).toBe(false)

    // ❌ Pendant streaming → caché
    const w3 = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>x</p>', isStreaming: true, error: null, canRegenerate: true },
      global: GLOBAL,
    })
    expect(w3.find('[data-testid="ai-panel-regen"]').exists()).toBe(false)

    // ✅ Tous les critères réunis → visible
    const w4 = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>x</p>', isStreaming: false, error: null, canRegenerate: true },
      global: GLOBAL,
    })
    expect(w4.find('[data-testid="ai-panel-regen"]').exists()).toBe(true)
  })

  it('clic regenerate → window.confirm puis emit("regenerate") si confirmé', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>x</p>', isStreaming: false, error: null, canRegenerate: true },
      global: GLOBAL,
    })
    await wrapper.find('[data-testid="ai-panel-regen"]').trigger('click')
    expect(window.confirm).toHaveBeenCalled()
    expect(wrapper.emitted('regenerate')).toBeTruthy()
  })

  it('REGRESSION GUARD : refus dans le confirm → PAS d\'emit regenerate', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>x</p>', isStreaming: false, error: null, canRegenerate: true },
      global: GLOBAL,
    })
    await wrapper.find('[data-testid="ai-panel-regen"]').trigger('click')
    expect(wrapper.emitted('regenerate')).toBeFalsy()
  })

  it('verdictSummary affiché en tête avec icon + label', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: {
        parsedHtml: '<p>x</p>',
        isStreaming: false,
        error: null,
        verdictSummary: { level: 'GO', label: 'Très bon', reason: 'Volume fort' },
      },
      global: GLOBAL,
    })
    const verdict = wrapper.find('[data-testid="ai-panel-verdict"]')
    expect(verdict.exists()).toBe(true)
    expect(verdict.text()).toContain('GO')
    expect(verdict.text()).toContain('Très bon')
    expect(verdict.text()).toContain('Volume fort')
  })

  it('verdictSummary absent → pas de bandeau', () => {
    const wrapper = mount(CaptainAiPanel, {
      props: { parsedHtml: '<p>x</p>', isStreaming: false, error: null, verdictSummary: null },
      global: GLOBAL,
    })
    expect(wrapper.find('[data-testid="ai-panel-verdict"]').exists()).toBe(false)
  })
})
