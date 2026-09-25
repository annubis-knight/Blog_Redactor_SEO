import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionResult from '../../../src/components/actions/ActionResult.vue'

describe('ActionResult', () => {
  it('renders result text and Accept/Reject buttons', () => {
    const wrapper = mount(ActionResult, {
      props: { result: 'Reformulated text here', isStreaming: false },
    })

    expect(wrapper.find('.result-text').text()).toBe('Reformulated text here')
    expect(wrapper.find('.btn-accept').exists()).toBe(true)
    expect(wrapper.find('.btn-reject').exists()).toBe(true)
  })

  it('disables Accept button during streaming', () => {
    const wrapper = mount(ActionResult, {
      props: { result: 'Partial...', isStreaming: true },
    })

    const acceptBtn = wrapper.find('.btn-accept')
    expect((acceptBtn.element as HTMLButtonElement).disabled).toBe(true)

    const rejectBtn = wrapper.find('.btn-reject')
    expect((rejectBtn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('rien à accepter : Accepter désactivé', () => {
    const wrapper = mount(ActionResult, { props: { result: '', isStreaming: false } })
    expect((wrapper.find('.btn-accept').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('affiche l’avis du serveur (liens retirés)', () => {
    const wrapper = mount(ActionResult, {
      props: { result: 'Texte', isStreaming: false, notice: '1 lien absent de la recherche web a été retiré.' },
    })
    expect(wrapper.get('[data-testid="action-notice"]').text()).toContain('1 lien')
  })
})
