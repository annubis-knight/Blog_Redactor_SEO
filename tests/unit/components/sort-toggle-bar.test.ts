/**
 * Tests du composant `SortToggleBar` — barre de tri unifiée des conteneurs de
 * cards du Moteur. Vérifie :
 *   - Rendu des chips à partir de `options`.
 *   - Click cycle desc → asc → neutral et émet update:modelValue.
 *   - Le state actif applique les classes CSS appropriées.
 *   - Le slot `#filters` est rendu.
 *   - Le countLabel est affiché.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SortToggleBar from '../../../src/components/moteur/SortToggleBar.vue'
import type { SortState } from '../../../src/composables/moteur/useSortableList'

const OPTIONS = [
  { key: 'az', label: 'A-Z' },
  { key: 'score', label: 'Score' },
]

const NEUTRAL: SortState = { key: null, direction: 'neutral' }

describe('SortToggleBar — rendu', () => {
  it('rend une chip par option', () => {
    const wrapper = mount(SortToggleBar, { props: { options: OPTIONS, modelValue: NEUTRAL } })
    expect(wrapper.find('[data-testid="stb-chip-az"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stb-chip-score"]').exists()).toBe(true)
  })

  it('affiche le label de chaque option', () => {
    const wrapper = mount(SortToggleBar, { props: { options: OPTIONS, modelValue: NEUTRAL } })
    expect(wrapper.find('[data-testid="stb-chip-az"]').text()).toContain('A-Z')
    expect(wrapper.find('[data-testid="stb-chip-score"]').text()).toContain('Score')
  })

  it('affiche le countLabel si fourni', () => {
    const wrapper = mount(SortToggleBar, { props: { options: OPTIONS, modelValue: NEUTRAL, countLabel: '5 / 12 cartes' } })
    expect(wrapper.text()).toContain('5 / 12 cartes')
  })

  it('rend le slot #filters', () => {
    const wrapper = mount(SortToggleBar, {
      props: { options: OPTIONS, modelValue: NEUTRAL },
      slots: { filters: '<button data-testid="custom-filter">Filtre custom</button>' },
    })
    expect(wrapper.find('[data-testid="custom-filter"]').exists()).toBe(true)
  })
})

describe('SortToggleBar — état actif', () => {
  it('chip active a la classe --active quand modelValue.key match', () => {
    const wrapper = mount(SortToggleBar, {
      props: { options: OPTIONS, modelValue: { key: 'score', direction: 'desc' } },
    })
    expect(wrapper.find('[data-testid="stb-chip-score"]').classes()).toContain('stb__chip--active')
    expect(wrapper.find('[data-testid="stb-chip-az"]').classes()).not.toContain('stb__chip--active')
  })

  it('affiche flèche ↓ si direction = desc', () => {
    const wrapper = mount(SortToggleBar, {
      props: { options: OPTIONS, modelValue: { key: 'score', direction: 'desc' } },
    })
    const chip = wrapper.find('[data-testid="stb-chip-score"]')
    expect(chip.text()).toContain('\u2193') // ↓
  })

  it('affiche flèche ↑ si direction = asc', () => {
    const wrapper = mount(SortToggleBar, {
      props: { options: OPTIONS, modelValue: { key: 'score', direction: 'asc' } },
    })
    const chip = wrapper.find('[data-testid="stb-chip-score"]')
    expect(chip.text()).toContain('\u2191') // ↑
  })
})

describe('SortToggleBar — click et émission', () => {
  it('click sur chip neutre émet desc sur cette key', async () => {
    const wrapper = mount(SortToggleBar, { props: { options: OPTIONS, modelValue: NEUTRAL } })
    await wrapper.find('[data-testid="stb-chip-score"]').trigger('click')
    const events = wrapper.emitted('update:modelValue')
    expect(events).toHaveLength(1)
    expect(events![0][0]).toEqual({ key: 'score', direction: 'desc' })
  })

  it('click sur chip déjà desc émet asc', async () => {
    const wrapper = mount(SortToggleBar, {
      props: { options: OPTIONS, modelValue: { key: 'score', direction: 'desc' } },
    })
    await wrapper.find('[data-testid="stb-chip-score"]').trigger('click')
    const events = wrapper.emitted('update:modelValue')
    expect(events![0][0]).toEqual({ key: 'score', direction: 'asc' })
  })

  it('click sur chip déjà asc émet neutral (key=null)', async () => {
    const wrapper = mount(SortToggleBar, {
      props: { options: OPTIONS, modelValue: { key: 'score', direction: 'asc' } },
    })
    await wrapper.find('[data-testid="stb-chip-score"]').trigger('click')
    const events = wrapper.emitted('update:modelValue')
    expect(events![0][0]).toEqual({ key: null, direction: 'neutral' })
  })

  it('click sur chip différente repart sur desc', async () => {
    const wrapper = mount(SortToggleBar, {
      props: { options: OPTIONS, modelValue: { key: 'score', direction: 'asc' } },
    })
    await wrapper.find('[data-testid="stb-chip-az"]').trigger('click')
    const events = wrapper.emitted('update:modelValue')
    expect(events![0][0]).toEqual({ key: 'az', direction: 'desc' })
  })
})
