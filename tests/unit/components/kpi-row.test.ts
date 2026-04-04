import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiRow from '../../../src/components/shared/KpiRow.vue'
import KpiItem from '../../../src/components/shared/KpiItem.vue'

describe('KpiRow', () => {
  const defaultKpis = [
    { name: 'volume', value: '1.5k', color: 'green', label: 'Vol.' },
    { name: 'kd', value: 30, color: 'orange', label: 'KD' },
    { name: 'cpc', value: '2.50€', label: 'CPC' },
  ]

  it('renders all KPI items', () => {
    const wrapper = mount(KpiRow, { props: { kpis: defaultKpis } })
    const items = wrapper.findAllComponents(KpiItem)
    expect(items).toHaveLength(3)
  })

  it('uses label prop over name for display', () => {
    const wrapper = mount(KpiRow, { props: { kpis: defaultKpis } })
    expect(wrapper.text()).toContain('Vol.')
    expect(wrapper.text()).not.toContain('volume')
  })

  it('falls back to name when label is missing', () => {
    const kpis = [{ name: 'volume', value: 100 }]
    const wrapper = mount(KpiRow, { props: { kpis } })
    expect(wrapper.text()).toContain('volume')
  })

  it('renders separators between items', () => {
    const wrapper = mount(KpiRow, { props: { kpis: defaultKpis } })
    const seps = wrapper.findAll('.kpi-sep')
    expect(seps).toHaveLength(2) // N-1 separators
  })

  it('renders no separator for single item', () => {
    const wrapper = mount(KpiRow, { props: { kpis: [{ name: 'vol', value: 100 }] } })
    expect(wrapper.findAll('.kpi-sep')).toHaveLength(0)
  })

  it('renders empty when kpis array is empty', () => {
    const wrapper = mount(KpiRow, { props: { kpis: [] } })
    expect(wrapper.findAllComponents(KpiItem)).toHaveLength(0)
  })
})

describe('KpiItem', () => {
  it('renders label and value', () => {
    const wrapper = mount(KpiItem, { props: { label: 'Vol.', value: '1.5k' } })
    expect(wrapper.find('.kpi-item__label').text()).toBe('Vol.')
    expect(wrapper.find('.kpi-item__value').text()).toBe('1.5k')
  })

  it('applies color style from color prop', () => {
    const wrapper = mount(KpiItem, { props: { label: 'KD', value: 30, color: 'green' } })
    const valueEl = wrapper.find('.kpi-item__value')
    expect(valueEl.attributes('style')).toContain('--color-success')
  })

  it('uses inherit when no color prop', () => {
    const wrapper = mount(KpiItem, { props: { label: 'CPC', value: '2.50€' } })
    const valueEl = wrapper.find('.kpi-item__value')
    expect(valueEl.attributes('style')).toContain('inherit')
  })

  it('returns inherit for unknown color', () => {
    const wrapper = mount(KpiItem, { props: { label: 'X', value: 0, color: 'unknown' } })
    const valueEl = wrapper.find('.kpi-item__value')
    expect(valueEl.attributes('style')).toContain('inherit')
  })
})
