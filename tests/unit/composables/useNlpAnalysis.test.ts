import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @huggingface/transformers before any import
const mockPipeline = vi.fn()
vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
}))

// We need to test the composable functions directly
// Since the composable uses singleton state, we test via the exported function
import { useNlpAnalysis } from '@/composables/intent/useNlpAnalysis'
import { ref } from 'vue'

// Mock onMounted to just call the callback
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (fn: () => void) => fn(),
  }
})

describe('useNlpAnalysis', () => {
  let storageMock: Record<string, string>

  beforeEach(() => {
    storageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, value: string) => { storageMock[key] = value },
      removeItem: (key: string) => { delete storageMock[key] },
    })

    // Reset state between tests
    const nlp = useNlpAnalysis()
    nlp.deactivate()
    mockPipeline.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('checkSupport', () => {
    it('returns true when WebAssembly is available', () => {
      vi.stubGlobal('WebAssembly', {})
      const nlp = useNlpAnalysis()
      expect(nlp.checkSupport()).toBe(true)
      expect(nlp.nlpState.value).not.toBe('unsupported')
    })

    it('returns false and sets unsupported when WebAssembly is absent', () => {
      // @ts-expect-error - deliberately removing WebAssembly
      vi.stubGlobal('WebAssembly', undefined)
      const nlp = useNlpAnalysis()
      const result = nlp.checkSupport()
      expect(result).toBe(false)
      expect(nlp.nlpState.value).toBe('unsupported')
    })
  })

  describe('activate', () => {
    it('changes state from disabled to loading-model', async () => {
      vi.stubGlobal('WebAssembly', {})
      const mockClassifier = vi.fn()
      mockPipeline.mockImplementation(() => new Promise((resolve) => {
        setTimeout(() => resolve(mockClassifier), 10)
      }))

      const nlp = useNlpAnalysis()
      const promise = nlp.activate()

      // State should be loading-model immediately
      expect(nlp.nlpState.value).toBe('loading-model')

      await promise

      expect(nlp.nlpState.value).toBe('active')
      expect(nlp.isEnabled.value).toBe(true)
    })

    it('sets error state on pipeline failure', async () => {
      vi.stubGlobal('WebAssembly', {})
      mockPipeline.mockRejectedValue(new Error('Network error'))

      const nlp = useNlpAnalysis()
      await nlp.activate()

      expect(nlp.nlpState.value).toBe('error')
    })

    it('does nothing when unsupported', async () => {
      // @ts-expect-error - deliberately removing WebAssembly
      vi.stubGlobal('WebAssembly', undefined)
      const nlp = useNlpAnalysis()
      nlp.checkSupport()
      await nlp.activate()
      expect(nlp.nlpState.value).toBe('unsupported')
      expect(mockPipeline).not.toHaveBeenCalled()
    })

    it('persists enabled state in localStorage', async () => {
      vi.stubGlobal('WebAssembly', {})
      mockPipeline.mockResolvedValue(vi.fn())

      const nlp = useNlpAnalysis()
      await nlp.activate()

      expect(storageMock['nlp-enabled']).toBe('true')
    })
  })

  describe('deactivate', () => {
    it('sets state to disabled and persists in localStorage', async () => {
      vi.stubGlobal('WebAssembly', {})
      mockPipeline.mockResolvedValue(vi.fn())

      const nlp = useNlpAnalysis()
      await nlp.activate()
      expect(nlp.nlpState.value).toBe('active')

      nlp.deactivate()
      expect(nlp.nlpState.value).toBe('disabled')
      expect(nlp.isEnabled.value).toBe(false)
      expect(storageMock['nlp-enabled']).toBe('false')
    })

    it('clears results on deactivate', async () => {
      vi.stubGlobal('WebAssembly', {})
      const mockClassifier = vi.fn().mockResolvedValue({
        labels: ['problème technique'],
        scores: [0.9],
      })
      mockPipeline.mockResolvedValue(mockClassifier)

      const nlp = useNlpAnalysis()
      await nlp.activate()
      await nlp.analyzeKeywords(['test'])
      expect(nlp.results.value.size).toBe(1)

      nlp.deactivate()
      expect(nlp.results.value.size).toBe(0)
    })
  })

  describe('cancel', () => {
    it('reverts to disabled state', () => {
      vi.stubGlobal('WebAssembly', {})
      const nlp = useNlpAnalysis()
      // Simulate a loading state
      nlp.cancel()
      expect(nlp.nlpState.value).toBe('disabled')
      expect(nlp.downloadProgress.value).toBe(0)
    })
  })

  describe('analyzeKeywords', () => {
    it('updates analysisProgress as keywords are processed', async () => {
      vi.stubGlobal('WebAssembly', {})
      const mockClassifier = vi.fn().mockResolvedValue({
        labels: ['problème technique', 'besoin financier', 'information générale'],
        scores: [0.85, 0.10, 0.05],
      })
      mockPipeline.mockResolvedValue(mockClassifier)

      const nlp = useNlpAnalysis()
      await nlp.activate()

      await nlp.analyzeKeywords(['kw1', 'kw2', 'kw3'])

      expect(nlp.analysisProgress.value).toEqual({ done: 3, total: 3 })
      expect(nlp.results.value.size).toBe(3)
      expect(nlp.nlpState.value).toBe('active')
    })

    it('stores NLP results with label and confidence', async () => {
      vi.stubGlobal('WebAssembly', {})
      const mockClassifier = vi.fn().mockResolvedValue({
        labels: ['besoin financier', 'problème technique'],
        scores: [0.75, 0.25],
      })
      mockPipeline.mockResolvedValue(mockClassifier)

      const nlp = useNlpAnalysis()
      await nlp.activate()
      await nlp.analyzeKeywords(['fuite robinet'])

      const result = nlp.results.value.get('fuite robinet')
      expect(result).toBeDefined()
      expect(result!.label).toBe('besoin financier')
      expect(result!.confidence).toBe(0.75)
      expect(result!.allScores).toHaveLength(2)
    })

    it('handles classification error gracefully', async () => {
      vi.stubGlobal('WebAssembly', {})
      const mockClassifier = vi.fn().mockRejectedValue(new Error('inference error'))
      mockPipeline.mockResolvedValue(mockClassifier)

      const nlp = useNlpAnalysis()
      await nlp.activate()
      await nlp.analyzeKeywords(['bad-keyword'])

      const result = nlp.results.value.get('bad-keyword')
      expect(result).toBeDefined()
      expect(result!.label).toBe('information générale')
      expect(result!.confidence).toBe(0)
    })
  })

  describe('getNlpSignal', () => {
    it('returns null if no result for keyword', () => {
      const nlp = useNlpAnalysis()
      expect(nlp.getNlpSignal('unknown')).toBeNull()
    })

    it('returns score object when result exists', async () => {
      vi.stubGlobal('WebAssembly', {})
      const mockClassifier = vi.fn().mockResolvedValue({
        labels: ['question santé'],
        scores: [0.92],
      })
      mockPipeline.mockResolvedValue(mockClassifier)

      const nlp = useNlpAnalysis()
      await nlp.activate()
      await nlp.analyzeKeywords(['mal de dos'])

      const signal = nlp.getNlpSignal('mal de dos')
      expect(signal).not.toBeNull()
      expect(signal!.score).toBe(0.92)
      expect(signal!.label).toBe('question santé')
    })
  })

  describe('autoReactivate', () => {
    it('reads localStorage and activates if true', async () => {
      vi.stubGlobal('WebAssembly', {})
      storageMock['nlp-enabled'] = 'true'
      mockPipeline.mockResolvedValue(vi.fn())

      const nlp = useNlpAnalysis()
      nlp.autoReactivate()

      // Wait for async activate
      await vi.waitFor(() => {
        expect(nlp.nlpState.value).toBe('active')
      })
    })

    it('does nothing if localStorage is false', () => {
      vi.stubGlobal('WebAssembly', {})
      storageMock['nlp-enabled'] = 'false'

      const nlp = useNlpAnalysis()
      nlp.autoReactivate()
      expect(nlp.nlpState.value).not.toBe('loading-model')
    })

    it('does nothing if WebAssembly is unsupported', () => {
      // @ts-expect-error - deliberately removing WebAssembly
      vi.stubGlobal('WebAssembly', undefined)
      storageMock['nlp-enabled'] = 'true'

      const nlp = useNlpAnalysis()
      nlp.autoReactivate()
      expect(nlp.nlpState.value).toBe('unsupported')
      expect(mockPipeline).not.toHaveBeenCalled()
    })
  })

  describe('nlpScoresForVerdict', () => {
    it('returns null when no results', () => {
      const nlp = useNlpAnalysis()
      expect(nlp.nlpScoresForVerdict.value).toBeNull()
    })

    it('returns record of keyword -> confidence when results exist', async () => {
      vi.stubGlobal('WebAssembly', {})
      const mockClassifier = vi.fn().mockResolvedValue({
        labels: ['problème technique'],
        scores: [0.8],
      })
      mockPipeline.mockResolvedValue(mockClassifier)

      const nlp = useNlpAnalysis()
      await nlp.activate()
      await nlp.analyzeKeywords(['kw1', 'kw2'])

      const scores = nlp.nlpScoresForVerdict.value
      expect(scores).not.toBeNull()
      expect(scores!['kw1']).toBe(0.8)
      expect(scores!['kw2']).toBe(0.8)
    })
  })
})
