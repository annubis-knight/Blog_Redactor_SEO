import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import RecapToggle from '@/components/shared/RecapToggle.vue'
import { provideRecapRadioGroup } from '@/composables/ui/useRecapRadioGroup'

/** Helper: wraps children in a component that provides a radio group */
function createGroupWrapper(template: string, components: Record<string, any> = {}) {
  return defineComponent({
    components: { RecapToggle, ...components },
    setup() {
      provideRecapRadioGroup()
    },
    template,
  })
}

describe('RecapToggle — standalone (no provider)', () => {
  it('renders collapsed by default', () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Test Panel' },
    })
    expect(wrapper.find('.recap-toggle-body').classes()).toContain('collapsed')
    expect(wrapper.find('.recap-toggle-btn').attributes('aria-expanded')).toBe('false')
  })

  it('opens on click', async () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Test Panel' },
    })
    await wrapper.find('.recap-toggle-btn').trigger('click')
    expect(wrapper.find('.recap-toggle-body').classes()).not.toContain('collapsed')
    expect(wrapper.find('.recap-toggle-btn').attributes('aria-expanded')).toBe('true')
  })

  it('toggles back to collapsed on second click', async () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Test Panel' },
    })
    const btn = wrapper.find('.recap-toggle-btn')
    await btn.trigger('click')
    await btn.trigger('click')
    expect(wrapper.find('.recap-toggle-body').classes()).toContain('collapsed')
  })

  it('renders label text', () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Mon Panneau' },
    })
    expect(wrapper.find('.recap-toggle-label').text()).toBe('Mon Panneau')
  })
})

describe('RecapToggle — variant', () => {
  it('applies variant--recap by default', () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Test' },
    })
    expect(wrapper.find('.recap-toggle-wrapper').classes()).toContain('variant--recap')
  })

  it('applies variant--panel when specified', () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Test', variant: 'panel' },
    })
    expect(wrapper.find('.recap-toggle-wrapper').classes()).toContain('variant--panel')
  })
})

describe('RecapToggle — slots', () => {
  it('renders #header slot instead of label', () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test' },
      slots: {
        header: '<span class="custom-header">Custom</span>',
      },
    })
    expect(wrapper.find('.custom-header').exists()).toBe(true)
    expect(wrapper.find('.recap-toggle-label').exists()).toBe(false)
  })

  it('renders #between slot between header and body', () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Test' },
      slots: {
        between: '<div class="always-visible">Pain bar</div>',
        default: '<p>Body content</p>',
      },
    })
    const html = wrapper.html()
    const betweenIdx = html.indexOf('always-visible')
    const bodyIdx = html.indexOf('recap-toggle-body')
    expect(betweenIdx).toBeGreaterThan(-1)
    expect(betweenIdx).toBeLessThan(bodyIdx)
  })

  it('renders default slot as body content', async () => {
    const wrapper = mount(RecapToggle, {
      props: { panelId: 'test', label: 'Test' },
      slots: {
        default: '<p class="inner">Hello</p>',
      },
    })
    await wrapper.find('.recap-toggle-btn').trigger('click')
    expect(wrapper.find('.inner').text()).toBe('Hello')
  })
})

describe('RecapToggle — radio group behavior', () => {
  it('all panels collapsed by default', () => {
    const Wrapper = createGroupWrapper(`
      <div>
        <RecapToggle panel-id="a" label="A" />
        <RecapToggle panel-id="b" label="B" />
        <RecapToggle panel-id="c" label="C" />
      </div>
    `)
    const wrapper = mount(Wrapper)
    const bodies = wrapper.findAll('.recap-toggle-body')
    expect(bodies).toHaveLength(3)
    bodies.forEach(body => {
      expect(body.classes()).toContain('collapsed')
    })
  })

  it('clicking one panel opens it', async () => {
    const Wrapper = createGroupWrapper(`
      <div>
        <RecapToggle panel-id="a" label="A" />
        <RecapToggle panel-id="b" label="B" />
      </div>
    `)
    const wrapper = mount(Wrapper)
    const buttons = wrapper.findAll('.recap-toggle-btn')
    await buttons[0].trigger('click')

    const bodies = wrapper.findAll('.recap-toggle-body')
    expect(bodies[0].classes()).not.toContain('collapsed')
    expect(bodies[1].classes()).toContain('collapsed')
  })

  it('opening panel B closes panel A (radio behavior)', async () => {
    const Wrapper = createGroupWrapper(`
      <div>
        <RecapToggle panel-id="a" label="A" />
        <RecapToggle panel-id="b" label="B" />
      </div>
    `)
    const wrapper = mount(Wrapper)
    const buttons = wrapper.findAll('.recap-toggle-btn')

    // Open A
    await buttons[0].trigger('click')
    expect(wrapper.findAll('.recap-toggle-body')[0].classes()).not.toContain('collapsed')

    // Open B — A should close
    await buttons[1].trigger('click')
    const bodies = wrapper.findAll('.recap-toggle-body')
    expect(bodies[0].classes()).toContain('collapsed')
    expect(bodies[1].classes()).not.toContain('collapsed')
  })

  it('re-clicking the open panel closes it', async () => {
    const Wrapper = createGroupWrapper(`
      <div>
        <RecapToggle panel-id="a" label="A" />
        <RecapToggle panel-id="b" label="B" />
      </div>
    `)
    const wrapper = mount(Wrapper)
    const buttons = wrapper.findAll('.recap-toggle-btn')

    await buttons[0].trigger('click') // open A
    await buttons[0].trigger('click') // close A

    wrapper.findAll('.recap-toggle-body').forEach(body => {
      expect(body.classes()).toContain('collapsed')
    })
  })

  it('aria-expanded reflects open state across group', async () => {
    const Wrapper = createGroupWrapper(`
      <div>
        <RecapToggle panel-id="a" label="A" />
        <RecapToggle panel-id="b" label="B" />
      </div>
    `)
    const wrapper = mount(Wrapper)
    const buttons = wrapper.findAll('.recap-toggle-btn')

    expect(buttons[0].attributes('aria-expanded')).toBe('false')
    expect(buttons[1].attributes('aria-expanded')).toBe('false')

    await buttons[0].trigger('click')
    expect(buttons[0].attributes('aria-expanded')).toBe('true')
    expect(buttons[1].attributes('aria-expanded')).toBe('false')

    await buttons[1].trigger('click')
    expect(buttons[0].attributes('aria-expanded')).toBe('false')
    expect(buttons[1].attributes('aria-expanded')).toBe('true')
  })

  it('handles dynamic panel addition (v-if)', async () => {
    const DynamicWrapper = defineComponent({
      components: { RecapToggle },
      setup() {
        provideRecapRadioGroup()
        const showC = ref(false)
        return { showC }
      },
      template: `
        <div>
          <RecapToggle panel-id="a" label="A" />
          <RecapToggle panel-id="b" label="B" />
          <RecapToggle v-if="showC" panel-id="c" label="C" />
          <button class="toggle-c" @click="showC = !showC">Toggle C</button>
        </div>
      `,
    })

    const wrapper = mount(DynamicWrapper)

    // Open A
    await wrapper.findAll('.recap-toggle-btn')[0].trigger('click')
    expect(wrapper.findAll('.recap-toggle-body')[0].classes()).not.toContain('collapsed')

    // Add panel C
    await wrapper.find('.toggle-c').trigger('click')
    await nextTick()

    // Open C — A should close
    const allButtons = wrapper.findAll('.recap-toggle-btn')
    await allButtons[2].trigger('click')

    const allBodies = wrapper.findAll('.recap-toggle-body')
    expect(allBodies[0].classes()).toContain('collapsed') // A closed
    expect(allBodies[1].classes()).toContain('collapsed') // B still closed
    expect(allBodies[2].classes()).not.toContain('collapsed') // C open
  })
})
