/**
 * Tests visibilité scanner-inputs par mode.
 *
 * Historique : la friction #7 (2026-05-04) masquait les inputs en mode workflow
 * pour éviter la redondance avec Discovery. Conséquence indésirable : sur
 * arrivée à froid sans keywords injectés, l'onglet Radar devenait un dead-end
 * (aucun moyen de générer manuellement).
 *
 * Décision 2026-05-11 : les inputs sont désormais visibles dans les 2 modes.
 * En mode workflow, un message d'avertissement (workflow-hint) clarifie que
 * la génération manuelle ne touche pas au basket.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RadarPanel from '../../../src/components/intent/RadarPanel.vue'

beforeEach(() => {
  setActivePinia(createPinia())
})

const COMMON_PROPS = {
  pilierKeyword: 'site web pme',
  articleTopic: 'Création de site web',
  articleKeyword: 'creation site web',
  articlePainPoint: 'Mon site ne convertit pas',
  articleLevel: 'pilier' as const,
  articleId: 64,
  injectedKeywords: [],
}

const COMMON_STUBS = {
  RadarCardCheckable: true,
  RadarLongTailSuggestions: true,
  RadarThermometer: true,
  RadarAiPanel: true,
  CpcFilterToggle: true,
  SortToggleBar: true,
}

describe('RadarPanel — scanner-inputs par mode', () => {
  it('mode "workflow" : .scanner-inputs est visible + workflow-hint affiché', () => {
    const w = mount(RadarPanel, {
      props: { ...COMMON_PROPS, mode: 'workflow' },
      global: { stubs: COMMON_STUBS },
    })
    expect(w.find('.scanner-inputs').exists()).toBe(true)
    expect(w.find('[data-testid="scanner-workflow-hint"]').exists()).toBe(true)
  })

  it('mode "libre" : .scanner-inputs reste visible, sans workflow-hint', () => {
    const w = mount(RadarPanel, {
      props: { ...COMMON_PROPS, mode: 'libre' },
      global: { stubs: COMMON_STUBS },
    })
    expect(w.find('.scanner-inputs').exists()).toBe(true)
    expect(w.find('[data-testid="scanner-workflow-hint"]').exists()).toBe(false)
  })
})
