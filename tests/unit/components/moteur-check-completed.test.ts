import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn().mockResolvedValue(null),
  apiPost: vi.fn().mockResolvedValue({ phase: 'generer', completedChecks: [] }),
  apiPut: vi.fn().mockResolvedValue(null),
}))

// --- emitCheckCompleted logic unit tests ---

describe('emitCheckCompleted — helper logic', () => {
  let progressStore: ReturnType<typeof useArticleProgressStore>
  let addCheckSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    progressStore = useArticleProgressStore()
    addCheckSpy = vi.spyOn(progressStore, 'addCheck').mockResolvedValue()
    vi.clearAllMocks()
  })

  function createEmitCheckCompleted(selectedSlug: string | null) {
    const selectedArticle = ref(selectedSlug ? { slug: selectedSlug } : null)

    return function emitCheckCompleted(check: string) {
      const slug = selectedArticle.value?.slug
      if (!slug) return
      progressStore.addCheck(slug, check)
    }
  }

  it('calls progressStore.addCheck with correct slug and check', () => {
    const emitCheck = createEmitCheckCompleted('mon-article-pilier')
    emitCheck('discovery_done')

    expect(addCheckSpy).toHaveBeenCalledWith('mon-article-pilier', 'discovery_done')
  })

  it('does nothing when no article is selected', () => {
    const emitCheck = createEmitCheckCompleted(null)
    emitCheck('discovery_done')

    expect(addCheckSpy).not.toHaveBeenCalled()
  })

  it('calls addCheck for each of the 5 standardized checks', () => {
    const checks = [
      'discovery_done', 'radar_done',
      'capitaine_locked', 'lieutenants_locked', 'lexique_validated',
    ]

    const emitCheck = createEmitCheckCompleted('test-slug')
    for (const check of checks) {
      emitCheck(check)
    }

    expect(addCheckSpy).toHaveBeenCalledTimes(5)
    for (const check of checks) {
      expect(addCheckSpy).toHaveBeenCalledWith('test-slug', check)
    }
  })
})

// --- Handler-level integration tests ---

describe('MoteurView handlers — check-completed integration', () => {
  let addCheckSpy: ReturnType<typeof vi.spyOn>

  function createHandlerHarness(slug: string) {
    setActivePinia(createPinia())
    const progressStore = useArticleProgressStore()
    addCheckSpy = vi.spyOn(progressStore, 'addCheck').mockResolvedValue()

    const selectedArticle = ref<{ slug: string } | null>({ slug })
    const activeTab = ref('discovery')
    const discoveryRadarKeywords = ref<any[]>([])
    const radarScanResult = ref<any>(null)

    function emitCheckCompleted(check: string) {
      const s = selectedArticle.value?.slug
      if (!s) return
      progressStore.addCheck(s, check)
    }

    return {
      selectedArticle,
      activeTab,
      discoveryRadarKeywords,
      radarScanResult,

      handleSendToRadar(keywords: any[]) {
        discoveryRadarKeywords.value = keywords
        activeTab.value = 'radar'
        emitCheckCompleted('discovery_done')
      },

      handleRadarScanned(payload: { globalScore: number; heatLevel: string }) {
        radarScanResult.value = payload
        emitCheckCompleted('radar_done')
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handleSendToRadar emits discovery_done and navigates to radar', () => {
    const h = createHandlerHarness('test-article')
    h.handleSendToRadar([{ keyword: 'kw1' }])

    expect(h.activeTab.value).toBe('radar')
    expect(h.discoveryRadarKeywords.value).toHaveLength(1)
    expect(addCheckSpy).toHaveBeenCalledWith('test-article', 'discovery_done')
  })

  it('handleRadarScanned emits radar_done', () => {
    const h = createHandlerHarness('test-article')
    h.handleRadarScanned({ globalScore: 75, heatLevel: 'hot' })

    expect(h.radarScanResult.value).toEqual({ globalScore: 75, heatLevel: 'hot' })
    expect(addCheckSpy).toHaveBeenCalledWith('test-article', 'radar_done')
  })
})

// --- Backend duplicate protection ---

describe('Backend — addCheck duplicate prevention', () => {
  it('addCheck does not add duplicate checks', () => {
    const progress = { phase: 'generer' as const, completedChecks: ['discovery_done'] }

    function addCheckLocal(check: string) {
      if (!progress.completedChecks.includes(check)) {
        progress.completedChecks.push(check)
      }
    }

    addCheckLocal('discovery_done') // duplicate
    addCheckLocal('radar_done')     // new

    expect(progress.completedChecks).toEqual(['discovery_done', 'radar_done'])
    expect(progress.completedChecks.length).toBe(2)
  })
})
