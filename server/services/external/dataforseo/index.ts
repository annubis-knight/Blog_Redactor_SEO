// Public API of the DataForSEO service — split across multiple files for readability.
// Re-exports preserve the original `dataforseo.service.ts` surface so callers stay unchanged.

export {
  isSandbox,
  getBaseUrl,
  getAuthHeader,
  fetchDataForSeo,
  DataForSeoQuotaError,
  CostBudgetError,
} from './_client.js'

export {
  slugify,
  readCache,
  getMinRefreshHours,
  isCacheFresh,
} from './cache.js'

export {
  fetchSerp,
  fetchPaa,
} from './serp.js'

export {
  fetchRelatedKeywords,
  fetchKeywordSuggestions,
  fetchKeywordOverview,
  fetchKeywordOverviewBatch,
  fetchSearchIntentBatch,
} from './keywords.js'

export {
  getBrief,
} from './brief.js'

export {
  computeCompositeScore,
  generateAlerts,
  detectRedundancy,
  auditCocoonKeywords,
  getAuditCacheStatus,
} from './scoring.js'
