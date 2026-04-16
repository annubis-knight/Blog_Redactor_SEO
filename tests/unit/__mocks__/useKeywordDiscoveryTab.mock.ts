import { vi } from 'vitest'

/**
 * Full mock factory for useKeywordDiscoveryTab composable.
 * Use via vi.mock path with createMock() or import the default mock.
 */
export function createKeywordDiscoveryTabMock() {
  return {
    suggestAlphabetKw: { value: [] },
    suggestQuestionsKw: { value: [] },
    suggestIntentsKw: { value: [] },
    suggestPrepositionsKw: { value: [] },
    aiKeywords: { value: [] },
    dataforseoKeywords: { value: [] },
    suggestLoading: { value: false },
    aiLoading: { value: false },
    dataforseoLoading: { value: false },
    isAnyLoading: { value: false },
    wordGroups: { value: [] },
    wordGroupsLoading: { value: false },
    activeGroupFilter: { value: null },
    error: { value: null },
    selectedCount: { value: 0 },
    hasResults: { value: false },
    relevanceFilterEnabled: { value: false },
    semanticLoading: { value: false },
    irrelevantCount: { value: 0 },
    scoringProgress: { value: 0 },
    uniqueKeywordCount: { value: 0 },
    relevantCount: { value: 0 },
    toggleRelevanceFilter: vi.fn(),
    isRelevant: vi.fn(() => true),
    getRelevanceScore: vi.fn(),
    filteringSuspect: { value: false },
    SOURCE_COLORS: {},
    getKeywordSources: vi.fn(() => []),
    isMultiSource: vi.fn(() => false),
    discover: vi.fn(),
    filteredList: { value: [] },
    toggleSelect: vi.fn(),
    isSelected: vi.fn(() => false),
    selectAllInSource: vi.fn(),
    deselectAllInSource: vi.fn(),
    isAllSourceSelected: vi.fn(() => false),
    setGroupFilter: vi.fn(),
    getRadarKeywords: vi.fn(() => []),
    analysisResult: { value: null },
    analysisLoading: { value: false },
    analyzeResults: vi.fn(),
    selectAllAnalysis: vi.fn(),
    deselectAllAnalysis: vi.fn(),
    isAllAnalysisSelected: vi.fn(() => false),
    cacheStatus: { value: null },
    cacheLoading: { value: false },
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
