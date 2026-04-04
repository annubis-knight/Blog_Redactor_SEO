import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref, computed, nextTick } from 'vue'

// We test the locking logic and lock banner via a lightweight harness
// that mirrors MoteurView's Phase ① logic without importing the full view.

// --- Unit tests for isDiscoveryAllowed logic ---

function createIsDiscoveryAllowed(
  selectedArticle: { keyword: string } | null,
  keywords: { keyword: string; status: string }[],
) {
  const article = ref(selectedArticle)
  const kws = ref(keywords)

  return computed(() => {
    if (!article.value) return true
    const articleKw = article.value.keyword
    if (!articleKw) return true
    const kw = kws.value.find(
      k => k.keyword.toLowerCase() === articleKw.toLowerCase(),
    )
    return !kw || kw.status === 'suggested'
  })
}

describe('Phase ① Générer — Locking logic', () => {
  it('allows discovery when no article is selected', () => {
    const allowed = createIsDiscoveryAllowed(null, [])
    expect(allowed.value).toBe(true)
  })

  it('allows discovery when article has no keyword', () => {
    const allowed = createIsDiscoveryAllowed({ keyword: '' }, [])
    expect(allowed.value).toBe(true)
  })

  it('allows discovery when keyword is not in validated list', () => {
    const allowed = createIsDiscoveryAllowed(
      { keyword: 'erp cloud' },
      [{ keyword: 'other keyword', status: 'validated' }],
    )
    expect(allowed.value).toBe(true)
  })

  it('allows discovery when keyword status is suggested', () => {
    const allowed = createIsDiscoveryAllowed(
      { keyword: 'erp cloud' },
      [{ keyword: 'erp cloud', status: 'suggested' }],
    )
    expect(allowed.value).toBe(true)
  })

  it('locks discovery when keyword is validated', () => {
    const allowed = createIsDiscoveryAllowed(
      { keyword: 'erp cloud' },
      [{ keyword: 'erp cloud', status: 'validated' }],
    )
    expect(allowed.value).toBe(false)
  })

  it('locks discovery case-insensitively', () => {
    const allowed = createIsDiscoveryAllowed(
      { keyword: 'ERP Cloud' },
      [{ keyword: 'erp cloud', status: 'validated' }],
    )
    expect(allowed.value).toBe(false)
  })

  it('locks discovery for any non-suggested status', () => {
    const allowed = createIsDiscoveryAllowed(
      { keyword: 'erp cloud' },
      [{ keyword: 'erp cloud', status: 'approved' }],
    )
    expect(allowed.value).toBe(false)
  })
})

// --- Unit tests for lock banner visibility ---

import MoteurPhaseNavigation from '@/components/moteur/MoteurPhaseNavigation.vue'
import type { Phase } from '@/components/moteur/MoteurPhaseNavigation.vue'

const unlockedPhases: Phase[] = [
  {
    id: 'generer',
    label: 'Générer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true, locked: false },
      { id: 'radar', label: 'Radar', optional: true, locked: false },
    ],
  },
  {
    id: 'valider',
    label: 'Valider',
    number: 2,
    tabs: [
      { id: 'validation', label: 'Validation' },
      { id: 'intention', label: 'Intention' },
      { id: 'audit', label: 'Audit' },
      { id: 'local', label: 'Local' },
    ],
  },
  {
    id: 'assigner',
    label: 'Assigner',
    number: 3,
    tabs: [
      { id: 'assignation', label: 'Assignation' },
    ],
  },
]

const lockedPhases: Phase[] = [
  {
    id: 'generer',
    label: 'Générer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true, locked: true },
      { id: 'radar', label: 'Radar', optional: true, locked: true },
    ],
  },
  ...unlockedPhases.slice(1),
]

describe('Phase ① Générer — Navigation with unlocked tabs', () => {
  it('all 2 Phase ① tabs are accessible when unlocked', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: unlockedPhases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    // Discovery, Radar should not be locked
    expect(tabs[0].classes()).not.toContain('phase-tab--locked')
    expect(tabs[1].classes()).not.toContain('phase-tab--locked')
  })

  it('emits tab change for Phase ① tabs when unlocked', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: unlockedPhases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')

    await tabs[1].trigger('click') // Radar
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['radar'])
  })
})

describe('Phase ① Générer — Navigation with locked tabs', () => {
  it('Discovery and Radar are locked', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: lockedPhases, activeTab: 'validation' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    expect(tabs[0].classes()).toContain('phase-tab--locked')
    expect(tabs[1].classes()).toContain('phase-tab--locked')
  })

  it('clicking locked Discovery does not emit', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: lockedPhases, activeTab: 'validation' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    await tabs[0].trigger('click') // Discovery (locked)
    expect(wrapper.emitted('update:activeTab')).toBeFalsy()
  })

  it('clicking locked Radar does not emit', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: lockedPhases, activeTab: 'validation' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    await tabs[1].trigger('click') // Radar (locked)
    expect(wrapper.emitted('update:activeTab')).toBeFalsy()
  })
})

// --- Lock banner rendering tests ---
// We test the lock banner with a minimal component to avoid full MoteurView mocking

import { defineComponent, h } from 'vue'

const LockBannerHarness = defineComponent({
  props: {
    selectedArticle: { type: Object, default: null },
    isDiscoveryAllowed: { type: Boolean, default: true },
    activeTab: { type: String, default: 'discovery' },
  },
  setup(props) {
    const isInGenererPhase = computed(() =>
      props.activeTab === 'discovery' || props.activeTab === 'radar',
    )

    return () => {
      if (props.selectedArticle && !props.isDiscoveryAllowed && isInGenererPhase.value) {
        return h('div', { class: 'lock-banner' }, [
          h('p', { class: 'lock-banner-message' },
            'Les onglets Discovery et Radar sont verrouillés car des mots-clés sont déjà validés pour cet article.',
          ),
          h('button', { class: 'lock-banner-link' }, 'Voir l\'Audit →'),
        ])
      }
      return h('div', { class: 'no-banner' })
    }
  },
})

describe('Lock banner visibility', () => {
  it('shows lock banner when article selected, discovery locked, in generer phase', () => {
    const wrapper = mount(LockBannerHarness, {
      props: {
        selectedArticle: { keyword: 'test' },
        isDiscoveryAllowed: false,
        activeTab: 'discovery',
      },
    })

    expect(wrapper.find('.lock-banner').exists()).toBe(true)
    expect(wrapper.find('.lock-banner-message').text()).toContain('verrouillés')
    expect(wrapper.find('.lock-banner-link').exists()).toBe(true)
  })

  it('shows lock banner on radar tab', () => {
    const wrapper = mount(LockBannerHarness, {
      props: {
        selectedArticle: { keyword: 'test' },
        isDiscoveryAllowed: false,
        activeTab: 'radar',
      },
    })

    expect(wrapper.find('.lock-banner').exists()).toBe(true)
  })

  it('hides lock banner when discovery is allowed', () => {
    const wrapper = mount(LockBannerHarness, {
      props: {
        selectedArticle: { keyword: 'test' },
        isDiscoveryAllowed: true,
        activeTab: 'discovery',
      },
    })

    expect(wrapper.find('.lock-banner').exists()).toBe(false)
  })

  it('hides lock banner when no article selected', () => {
    const wrapper = mount(LockBannerHarness, {
      props: {
        selectedArticle: null,
        isDiscoveryAllowed: false,
        activeTab: 'discovery',
      },
    })

    expect(wrapper.find('.lock-banner').exists()).toBe(false)
  })

  it('hides lock banner when not in generer phase', () => {
    const wrapper = mount(LockBannerHarness, {
      props: {
        selectedArticle: { keyword: 'test' },
        isDiscoveryAllowed: false,
        activeTab: 'validation', // Phase ②
      },
    })

    expect(wrapper.find('.lock-banner').exists()).toBe(false)
  })
})

// --- Cross-tab communication tests ---

describe('Phase ① Générer — Cross-tab handleSendToRadar', () => {
  it('handleSendToRadar sets discoveryRadarKeywords and navigates to radar', () => {
    // Simulate MoteurView's handleSendToRadar logic
    const discoveryRadarKeywords = ref<any[]>([])
    const activeTab = ref<string>('discovery')

    function handleSendToRadar(keywords: any[]) {
      discoveryRadarKeywords.value = keywords
      activeTab.value = 'radar'
    }

    const fakeKeywords = [
      { keyword: 'erp cloud', score: 80 },
      { keyword: 'logiciel gestion', score: 60 },
    ]

    handleSendToRadar(fakeKeywords)

    expect(discoveryRadarKeywords.value).toEqual(fakeKeywords)
    expect(activeTab.value).toBe('radar')
  })
})

describe('Phase ① Générer — Redirect on article selection', () => {
  it('redirects from discovery to validation when selecting validated article', () => {
    const activeTab = ref<string>('discovery')
    const keywords = [{ keyword: 'erp cloud', status: 'validated' }]

    // Simulate handleSelectArticle redirect logic
    const article = { keyword: 'erp cloud', slug: 'test', title: 'Test' }
    const kw = keywords.find(
      k => k.keyword.toLowerCase() === article.keyword.toLowerCase(),
    )
    const isValidated = kw && kw.status !== 'suggested'
    if (isValidated && (activeTab.value === 'discovery' || activeTab.value === 'radar')) {
      activeTab.value = 'validation'
    }

    expect(activeTab.value).toBe('validation')
  })

  it('redirects from radar to validation when selecting validated article', () => {
    const activeTab = ref<string>('radar')
    const keywords = [{ keyword: 'erp cloud', status: 'validated' }]

    const article = { keyword: 'erp cloud', slug: 'test', title: 'Test' }
    const kw = keywords.find(
      k => k.keyword.toLowerCase() === article.keyword.toLowerCase(),
    )
    const isValidated = kw && kw.status !== 'suggested'
    if (isValidated && (activeTab.value === 'discovery' || activeTab.value === 'radar')) {
      activeTab.value = 'validation'
    }

    expect(activeTab.value).toBe('validation')
  })

  it('does not redirect when selecting non-validated article', () => {
    const activeTab = ref<string>('discovery')
    const keywords = [{ keyword: 'erp cloud', status: 'suggested' }]

    const article = { keyword: 'erp cloud', slug: 'test', title: 'Test' }
    const kw = keywords.find(
      k => k.keyword.toLowerCase() === article.keyword.toLowerCase(),
    )
    const isValidated = kw && kw.status !== 'suggested'
    if (isValidated && (activeTab.value === 'discovery' || activeTab.value === 'radar')) {
      activeTab.value = 'validation'
    }

    expect(activeTab.value).toBe('discovery')
  })
})
