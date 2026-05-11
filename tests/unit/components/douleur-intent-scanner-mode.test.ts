/**
 * Tests visibilité scanner-inputs par mode.
 *
 * Décision 2026-05-11 (chantier radar-dbfirst-refactor) :
 * - La génération courte-traîne IA Haiku (ex-section "Keyword Radar") est
 *   déplacée vers Discovery (cf. FR-DIS-LONGTAIL-GENERATION).
 * - En mode workflow, DouleurScannerInputs est donc masqué (show-inputs=false).
 *   L'input texte unitaire (Sprint B, FR-RAD-MANUAL-ADD) remplace la voie
 *   d'ajout manuel.
 * - En mode libre (LaboView), les inputs restent disponibles pour la saisie
 *   manuelle complète.
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
  it('mode "workflow" : .scanner-inputs est masqué (génération déplacée vers Discovery)', () => {
    const w = mount(RadarPanel, {
      props: { ...COMMON_PROPS, mode: 'workflow' },
      global: { stubs: COMMON_STUBS },
    })
    expect(w.find('.scanner-inputs').exists()).toBe(false)
  })

  it('mode "libre" : .scanner-inputs reste visible (saisie manuelle complète)', () => {
    const w = mount(RadarPanel, {
      props: { ...COMMON_PROPS, mode: 'libre' },
      global: { stubs: COMMON_STUBS },
    })
    expect(w.find('.scanner-inputs').exists()).toBe(true)
  })
})
