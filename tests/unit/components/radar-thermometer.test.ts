/**
 * Tests anti-régression pour RadarThermometer — jauge globale du Radar.
 *
 * Macro affiché en tête de l'onglet Radar du Moteur. Couvre :
 *   1. score 0-100 affiché tel quel "X/100"
 *   2. icon/label/color dérivés du heatLevel via composable
 *   3. mode compact masque les KPIs et le verdict
 *   4. KPIs (keywords/autocomplete/PAA) affichés si fournis et non compact
 *   5. verdict text affiché en mode normal seulement
 *   6. ConfidenceBar reçoit value = score/100
 *   7. border color du conteneur reflète heatLevel
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarThermometer from '../../../src/components/shared/RadarThermometer.vue'

const STUBS = {
  ConfidenceBar: { props: ['value'], template: '<div class="stub-bar" :data-value="value" />' },
}

describe('RadarThermometer', () => {
  it('affiche le score formaté X/100', () => {
    const wrapper = mount(RadarThermometer, {
      props: { globalScore: 78, heatLevel: 'chaude' },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.thermo-score').text()).toBe('78/100')
  })

  it('REGRESSION GUARD : ConfidenceBar reçoit la valeur normalisée 0-1', () => {
    const wrapper = mount(RadarThermometer, {
      props: { globalScore: 65, heatLevel: 'tiede' },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.stub-bar').attributes('data-value')).toBe('0.65')
  })

  it('mode compact : KPIs et verdict masqués même si fournis', () => {
    const wrapper = mount(RadarThermometer, {
      props: {
        globalScore: 80,
        heatLevel: 'chaude',
        keywordsCount: 25,
        autocompleteCount: 10,
        paaTotal: 8,
        verdict: 'Très bon potentiel',
        compact: true,
      },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.thermo-kpis').exists()).toBe(false)
    expect(wrapper.find('.thermo-verdict').exists()).toBe(false)
    expect(wrapper.classes()).toContain('thermometer--compact')
  })

  it('mode normal : KPIs affichés quand fournis', () => {
    const wrapper = mount(RadarThermometer, {
      props: {
        globalScore: 80,
        heatLevel: 'chaude',
        keywordsCount: 25,
        autocompleteCount: 10,
        paaTotal: 8,
      },
      global: { stubs: STUBS },
    })
    const kpis = wrapper.findAll('.kpi')
    expect(kpis).toHaveLength(3)
    expect(kpis[0].find('.kpi-value').text()).toBe('25')
    expect(kpis[1].find('.kpi-value').text()).toBe('10')
    expect(kpis[2].find('.kpi-value').text()).toBe('8')
  })

  it('mode normal sans aucun KPI fourni → bloc kpis absent', () => {
    const wrapper = mount(RadarThermometer, {
      props: { globalScore: 80, heatLevel: 'chaude' },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.thermo-kpis').exists()).toBe(false)
  })

  it('verdict affiché si fourni en mode normal', () => {
    const wrapper = mount(RadarThermometer, {
      props: { globalScore: 80, heatLevel: 'chaude', verdict: 'Excellent' },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.thermo-verdict').text()).toBe('Excellent')
  })

  it('mode normal sans verdict → bloc absent', () => {
    const wrapper = mount(RadarThermometer, {
      props: { globalScore: 80, heatLevel: 'chaude' },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.thermo-verdict').exists()).toBe(false)
  })

  it('KPI absent (un seul fourni) → un seul bloc rendu', () => {
    const wrapper = mount(RadarThermometer, {
      props: { globalScore: 80, heatLevel: 'chaude', keywordsCount: 5 },
      global: { stubs: STUBS },
    })
    expect(wrapper.findAll('.kpi')).toHaveLength(1)
  })

  it('score 0 et heatLevel froide : tout reste rendu (pas de crash)', () => {
    const wrapper = mount(RadarThermometer, {
      props: { globalScore: 0, heatLevel: 'froide' },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.thermo-score').text()).toBe('0/100')
    expect(wrapper.find('.stub-bar').attributes('data-value')).toBe('0')
  })
})
