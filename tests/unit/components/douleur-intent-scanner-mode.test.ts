/**
 * Sprint 5 (2026-05-04) — Tests masquage scanner-inputs en mode workflow.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   #7 — « à quoi sert scanner-inputs dans l'onglet Radar alors qu'on a un
 *         onglet Discovery ? »
 *
 * En mode `workflow` (Moteur), broadKeyword/specificTopic/painPoint sont
 * injectés depuis l'article. Les inputs étaient redondants et gênants.
 * En mode `libre` (Labo), ils restent disponibles pour la saisie manuelle.
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

describe('RadarPanel — scanner-inputs par mode (Sprint 5 #7)', () => {
  it('AC7 — mode "workflow" : .scanner-inputs est masqué', () => {
    const w = mount(RadarPanel, {
      props: { ...COMMON_PROPS, mode: 'workflow' },
      global: {
        stubs: {
          RadarCardCheckable: true,
          RadarLongTailSuggestions: true,
          RadarThermometer: true,
          RadarAiPanel: true,
          CpcFilterToggle: true,
          SortToggleBar: true,
        },
      },
    })
    expect(w.find('.scanner-inputs').exists()).toBe(false)
  })

  it('AC7 — mode "libre" : .scanner-inputs reste visible', () => {
    const w = mount(RadarPanel, {
      props: { ...COMMON_PROPS, mode: 'libre' },
      global: {
        stubs: {
          RadarCardCheckable: true,
          RadarLongTailSuggestions: true,
          RadarThermometer: true,
          RadarAiPanel: true,
          CpcFilterToggle: true,
          SortToggleBar: true,
        },
      },
    })
    expect(w.find('.scanner-inputs').exists()).toBe(true)
  })
})
