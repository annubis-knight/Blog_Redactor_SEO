import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import CaptainInput from '../../../src/components/moteur/CaptainInput.vue'
import CaptainVerdictPanel from '../../../src/components/moteur/CaptainVerdictPanel.vue'
import CaptainLockPanel from '../../../src/components/moteur/CaptainLockPanel.vue'

describe('CaptainInput', () => {
  const baseProps = {
    modelValue: 'seo technique',
    compositionWarnings: [] as { rule: string; message: string }[],
    compositionAllPass: true,
    articleLevel: 'intermediaire' as const,
    disabled: false,
  }

  it('émet submit quand on valide le keyword', async () => {
    const wrapper = mount(CaptainInput, { props: baseProps })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')!.length).toBe(1)
  })

  it('affiche les warnings de composition', () => {
    const wrapper = mount(CaptainInput, {
      props: {
        ...baseProps,
        compositionWarnings: [
          { rule: 'too-short', message: 'Mot trop court' },
          { rule: 'compound', message: 'Mot composé détecté' },
        ],
        compositionAllPass: false,
      },
    })

    const warnings = wrapper.find('[data-testid="composition-warnings"]')
    expect(warnings.exists()).toBe(true)
    expect(wrapper.text()).toContain('Mot trop court')
    expect(wrapper.text()).toContain('Mot composé détecté')
  })

  it('désactive le bouton quand disabled', () => {
    const wrapper = mount(CaptainInput, {
      props: { ...baseProps, modelValue: 'test', disabled: true },
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('émet update:modelValue quand le texte change', async () => {
    const wrapper = mount(CaptainInput, { props: baseProps })

    await wrapper.find('input').setValue('nouveau mot')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('émet submit sur Enter', async () => {
    const wrapper = mount(CaptainInput, { props: baseProps })

    await wrapper.find('input').trigger('keyup.enter')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })
})

describe('CaptainVerdictPanel', () => {
  const mockKpis = [
    { name: 'volume', rawValue: 1200, color: 'green' as const, label: '1 200', thresholds: { green: 500, orange: 100 } },
    { name: 'kd', rawValue: 35, color: 'green' as const, label: '35', thresholds: { green: 40, orange: 60 } },
    { name: 'cpc', rawValue: 2.1, color: 'orange' as const, label: '2.10€', thresholds: { green: 1, orange: 0.5 } },
  ]

  const baseProps = {
    verdict: 'GO' as const,
    verdictLabel: 'GO — 85%',
    kpis: mockKpis,
    fromCache: false,
    noGoMessage: null as string | null,
    articleLevel: 'intermediaire' as const,
  }

  it('affiche le thermomètre au bon niveau', () => {
    const wrapper = shallowMount(CaptainVerdictPanel, { props: baseProps })
    const thermo = wrapper.findComponent({ name: 'VerdictThermometer' })
    expect(thermo.exists()).toBe(true)
    expect(thermo.props('verdict')).toBe('GO')
  })

  it('affiche les KPIs', () => {
    const wrapper = mount(CaptainVerdictPanel, {
      props: baseProps,
      global: { stubs: { VerdictThermometer: true } },
    })

    expect(wrapper.find('[data-testid="kpi-volume"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="kpi-kd"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="kpi-cpc"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Vol.')
    expect(wrapper.text()).toContain('KD')
  })

  it('affiche NO-GO avec le message', () => {
    const wrapper = mount(CaptainVerdictPanel, {
      props: {
        ...baseProps,
        verdict: 'NO-GO' as const,
        verdictLabel: 'NO-GO',
        noGoMessage: 'Volume trop faible',
      },
      global: { stubs: { VerdictThermometer: true } },
    })

    const nogo = wrapper.find('[data-testid="nogo-feedback"]')
    expect(nogo.exists()).toBe(true)
    expect(nogo.text()).toContain('Volume trop faible')
  })

  it('affiche le slot root-zone', () => {
    const wrapper = mount(CaptainVerdictPanel, {
      props: baseProps,
      slots: { 'root-zone': '<div data-testid="root-zone-slot">Root zone content</div>' },
      global: { stubs: { VerdictThermometer: true } },
    })

    expect(wrapper.find('[data-testid="root-zone-slot"]').exists()).toBe(true)
  })
})

describe('CaptainLockPanel', () => {
  it('désactive le lock si canLock est false', () => {
    const wrapper = mount(CaptainLockPanel, {
      props: { isLocked: false, canLock: false, showSendToLieutenants: false },
    })

    const lockBtn = wrapper.find('[data-testid="lock-btn"]')
    expect(lockBtn.exists()).toBe(true)
    expect(lockBtn.attributes('disabled')).toBeDefined()
  })

  it('émet lock au clic', async () => {
    const wrapper = mount(CaptainLockPanel, {
      props: { isLocked: false, canLock: true, showSendToLieutenants: false },
    })

    await wrapper.find('[data-testid="lock-btn"]').trigger('click')
    expect(wrapper.emitted('lock')).toBeTruthy()
  })

  it('émet unlock au clic quand verrouillé', async () => {
    const wrapper = mount(CaptainLockPanel, {
      props: { isLocked: true, canLock: true, showSendToLieutenants: false },
    })

    const unlockBtn = wrapper.find('[data-testid="unlock-btn"]')
    expect(unlockBtn.exists()).toBe(true)
    await unlockBtn.trigger('click')
    expect(wrapper.emitted('unlock')).toBeTruthy()
  })

  it('affiche le bouton send-to-lieutenants quand activé', () => {
    const wrapper = mount(CaptainLockPanel, {
      props: { isLocked: true, canLock: true, showSendToLieutenants: true },
    })

    const sendBtn = wrapper.find('[data-testid="send-to-lieutenants-btn"]')
    expect(sendBtn.exists()).toBe(true)
  })
})
