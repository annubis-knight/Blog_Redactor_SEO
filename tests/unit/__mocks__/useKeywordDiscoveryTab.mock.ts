import { vi } from 'vitest'
import { ref } from 'vue'

/**
 * Full mock factory for useKeywordDiscoveryTab composable.
 * Use via vi.mock path with createMock() or import the default mock.
 */
function createKeywordDiscoveryTabMock() {
  return {
    suggestAlphabetKw: ref([]),
    suggestQuestionsKw: ref([]),
    suggestIntentsKw: ref([]),
    suggestPrepositionsKw: ref([]),
    aiKeywords: ref([]),
    dataforseoKeywords: ref([]),
    suggestLoading: ref(false),
    aiLoading: ref(false),
    dataforseoLoading: ref(false),
    isAnyLoading: ref(false),
    wordGroups: ref([]),
    wordGroupsLoading: ref(false),
    activeGroupFilter: ref(null),
    error: ref(null),
    selectedCount: ref(0),
    hasResults: ref(false),
    relevanceFilterEnabled: ref(false),
    semanticLoading: ref(false),
    irrelevantCount: ref(0),
    scoringProgress: ref(0),
    uniqueKeywordCount: ref(0),
    relevantCount: ref(0),
    toggleRelevanceFilter: vi.fn(),
    isRelevant: vi.fn(() => true),
    getRelevanceScore: vi.fn(),
    filteringSuspect: ref(false),
    SOURCE_COLORS: {},
    getKeywordSources: vi.fn(() => []),
    isMultiSource: vi.fn(() => false),
    discover: vi.fn(),
    filteredList: vi.fn((list: unknown) => (Array.isArray(list) ? list : [])),
    toggleSelect: vi.fn(),
    isSelected: vi.fn(() => false),
    selectAllInSource: vi.fn(),
    deselectAllInSource: vi.fn(),
    isAllSourceSelected: vi.fn(() => false),
    setGroupFilter: vi.fn(),
    getRadarKeywords: vi.fn(() => []),
    analysisResult: ref(null),
    analysisLoading: ref(false),
    analyzeResults: vi.fn(),
    selectAllAnalysis: vi.fn(),
    deselectAllAnalysis: vi.fn(),
    isAllAnalysisSelected: vi.fn(() => false),
    cacheStatus: ref(null),
    cacheLoading: ref(false),
    checkCacheForSeed: vi.fn(),
    loadFromCache: vi.fn(),
    saveToCache: vi.fn(),
    clearCacheForSeed: vi.fn(),
    reset: vi.fn(),
  }
}

/**
 * Ready-to-use vi.mock factory.
 * Usage: vi.mock('../../../src/composables/keyword/useKeywordDiscoveryTab', mockKeywordDiscoveryTab)
 */
export const mockKeywordDiscoveryTab = () => ({
  useKeywordDiscoveryTab: () => createKeywordDiscoveryTabMock(),
})
