import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import type { NlpState, NlpResult } from '@shared/types/intent.types.js'

// Mock useNlpAnalysis composable with real refs
const nlpState = ref<NlpState>('disabled')
const downloadProgress = ref(0)
const estimatedTimeLeft = ref<number | null>(null)
const analysisProgress = ref({ done: 0, total: 0 })
const results = ref<Map<string, NlpResult>>(new Map())
const isEnabled = ref(false)
const nlpScoresForVerdict = computed(() => null)
const mockActivate = vi.fn(async () => { nlpState.value = 'active' })
const mockDeactivate = vi.fn(() => { nlpState.value = 'disabled' })
const mockCancel = vi.fn(() => { nlpState.value = 'disabled' })

vi.mock('@/composables/useNlpAnalysis', () => ({
  useNlpAnalysis: () => ({
    nlpState,
    downloadProgress,
    estimatedTimeLeft,
    analysisProgress,
    results,
    isEnabled,
    nlpScoresForVerdict,
    checkSupport: vi.fn(() => true),
    activate: mockActivate,
    deactivate: mockDeactivate,
    cancel: mockCancel,
    analyzeKeywords: vi.fn(),
    getNlpSignal: vi.fn(() => null),
    autoReactivate: vi.fn(),
  }),
}))

import NlpOptinBanner from '@/components/intent/NlpOptinBanner.vue'

describe('NlpOptinBanner', () => {
  beforeEach(() => {
    nlpState.value = 'disabled'
    downloadProgress.value = 0
    estimatedTimeLeft.value = null
    analysisProgress.value = { done: 0, total: 0 }
    mockActivate.mockClear()
    mockDeactivate.mockClear()
    mockCancel.mockClear()
    mockActivate.mockImplementation(async () => { nlpState.value = 'active' })
  })

  describe('State: Disabled', () => {
    it('shows Activer button and description', () => {
      const wrapper = mount(NlpOptinBanner)
      expect(wrapper.text()).toContain('Améliorer la précision des verdicts')
      expect(wrapper.text()).toContain('Premier chargement')
      expect(wrapper.text()).toContain('Gratuit, hors-ligne')

      const btn = wrapper.find('.nlp-btn--activate')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toBe('Activer l\'analyse sémantique')
      expect(btn.attributes('disabled')).toBeUndefined()
    })

    it('has disabled background class', () => {
      const wrapper = mount(NlpOptinBanner)
      expect(wrapper.find('.nlp-banner--disabled').exists()).toBe(true)
    })

    it('emits nlp-activated on click Activer', async () => {
      const wrapper = mount(NlpOptinBanner)
      await wrapper.find('.nlp-btn--activate').trigger('click')
      // Wait for async activate to resolve
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(mockActivate).toHaveBeenCalled()
      expect(wrapper.emitted('nlp-activated')).toBeTruthy()
    })
  })

  describe('State: Unsupported', () => {
    it('shows disabled button with message', () => {
      nlpState.value = 'unsupported'
      const wrapper = mount(NlpOptinBanner)

      expect(wrapper.text()).toContain('indisponible sur ce navigateur')
      const btn = wrapper.find('.nlp-btn--activate')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })

  describe('State: Loading model', () => {
    it('shows progress bar and cancel button', () => {
      nlpState.value = 'loading-model'
      downloadProgress.value = 52
      estimatedTimeLeft.value = 12

      const wrapper = mount(NlpOptinBanner)

      expect(wrapper.text()).toContain('Chargement du modèle NLP')
      expect(wrapper.text()).toContain('52%')
      expect(wrapper.text()).toContain('12s restantes')

      const progressFill = wrapper.find('.nlp-progress-fill')
      expect(progressFill.attributes('style')).toContain('width: 52%')

      const cancelBtn = wrapper.find('.nlp-btn--cancel')
      expect(cancelBtn.exists()).toBe(true)
      expect(cancelBtn.text()).toBe('Annuler')
    })

    it('has loading background class', () => {
      nlpState.value = 'loading-model'
      const wrapper = mount(NlpOptinBanner)
      expect(wrapper.find('.nlp-banner--loading').exists()).toBe(true)
    })

    it('calls cancel on Annuler click', async () => {
      nlpState.value = 'loading-model'
      const wrapper = mount(NlpOptinBanner)
      await wrapper.find('.nlp-btn--cancel').trigger('click')
      expect(mockCancel).toHaveBeenCalled()
    })
  })

  describe('State: Analyzing', () => {
    it('shows analysis dots and progress', () => {
      nlpState.value = 'analyzing'
      analysisProgress.value = { done: 2, total: 5 }

      const wrapper = mount(NlpOptinBanner)

      expect(wrapper.text()).toContain('Analyse de 5 mots-clés')
      const dots = wrapper.findAll('.nlp-dot')
      expect(dots).toHaveLength(5)

      const doneDots = wrapper.findAll('.nlp-dot--done')
      expect(doneDots).toHaveLength(2)

      const pendingDots = wrapper.findAll('.nlp-dot--pending')
      expect(pendingDots).toHaveLength(3)
    })

    it('has loading background class', () => {
      nlpState.value = 'analyzing'
      analysisProgress.value = { done: 0, total: 3 }
      const wrapper = mount(NlpOptinBanner)
      expect(wrapper.find('.nlp-banner--loading').exists()).toBe(true)
    })
  })

  describe('State: Active', () => {
    it('shows NLP actif and Désactiver button', () => {
      nlpState.value = 'active'
      const wrapper = mount(NlpOptinBanner)

      expect(wrapper.text()).toContain('Analyse sémantique active')
      expect(wrapper.text()).toContain('4e signal de confiance')

      const btn = wrapper.find('.nlp-btn--deactivate')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toBe('Désactiver')
    })

    it('has active background class', () => {
      nlpState.value = 'active'
      const wrapper = mount(NlpOptinBanner)
      expect(wrapper.find('.nlp-banner--active').exists()).toBe(true)
    })

    it('emits nlp-deactivated on click Désactiver', async () => {
      nlpState.value = 'active'
      const wrapper = mount(NlpOptinBanner)
      await wrapper.find('.nlp-btn--deactivate').trigger('click')

      expect(mockDeactivate).toHaveBeenCalled()
      expect(wrapper.emitted('nlp-deactivated')).toBeTruthy()
    })
  })

  describe('State: Error', () => {
    it('shows error message and Réessayer button', () => {
      nlpState.value = 'error'
      const wrapper = mount(NlpOptinBanner)

      expect(wrapper.text()).toContain('Erreur NLP')
      const btn = wrapper.find('.nlp-btn--retry')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toBe('Réessayer')
    })

    it('has error background class', () => {
      nlpState.value = 'error'
      const wrapper = mount(NlpOptinBanner)
      expect(wrapper.find('.nlp-banner--error').exists()).toBe(true)
    })

    it('retries on Réessayer click', async () => {
      nlpState.value = 'error'
      const wrapper = mount(NlpOptinBanner)
      await wrapper.find('.nlp-btn--retry').trigger('click')
      expect(mockActivate).toHaveBeenCalled()
    })
  })
})
