import { join } from 'path'
import { log } from '../utils/logger.js'
import { getBaseUrl, getAuthHeader, slugify, isSandbox } from './dataforseo.service.js'
import { getOrFetch, readCached, writeCached } from '../utils/cache.js'
import Anthropic from '@anthropic-ai/sdk'
import { calculateCost, type ApiUsage } from './claude.service.js'
import type {
  IntentAnalysis,
  SerpModule,
  SerpModuleType,
  IntentType,
  IntentScore,
  IntentRecommendation,
  OrganicResult,
  LocationMetrics,
  LocalNationalComparison,
  OpportunityAlert,
  AutocompleteSuggestion,
  AutocompleteResult,
  CertaintyIndex,
} from '../../shared/types/index.js'

const CACHE_DIR = join(process.cwd(), 'data', 'cache')
const SERP_MODULE_TYPES: SerpModuleType[] = ['local_pack', 'featured_snippet', 'people_also_ask', 'video', 'images', 'shopping', 'knowledge_graph', 'top_stories']

const MODULE_SCORES: Record<SerpModuleType, { category: string; score: number; maxScore: number }> = {
  local_pack: { category: 'Local', score: 10, maxScore: 10 },
  featured_snippet: { category: 'Éditorial', score: 10, maxScore: 10 },
  people_also_ask: { category: 'Informationnel', score: 8, maxScore: 10 },
  video: { category: 'Multimédia', score: 6, maxScore: 10 },
  images: { category: 'Visuel', score: 5, maxScore: 10 },
  shopping: { category: 'E-Commerce', score: 7, maxScore: 10 },
  knowledge_graph: { category: 'Connaissance', score: 6, maxScore: 10 },
  top_stories: { category: 'Actualité', score: 5, maxScore: 10 },
}

const MODULE_RECOMMENDATIONS: Record<SerpModuleType, { action: string; priority: 'high' | 'medium' | 'low' }> = {
  local_pack: { action: 'Optimiser fiche Google Business Profile', priority: 'high' },
  featured_snippet: { action: 'Structurer le contenu pour la position zéro', priority: 'high' },
  people_also_ask: { action: 'Écrire un article FAQ structuré', priority: 'high' },
  video: { action: 'Créer un YouTube Short ou tutoriel vidéo', priority: 'medium' },
  images: { action: 'Optimiser les images avec alt-text et schema', priority: 'low' },
  shopping: { action: 'Envisager une page produit structurée', priority: 'medium' },
  knowledge_graph: { action: 'Enrichir le balisage schema.org', priority: 'medium' },
  top_stories: { action: 'Publier du contenu d\'actualité fréquent', priority: 'low' },
}

// --- Cache helpers removed — using shared cache.ts ---

// --- SERP Advanced API ---

async function fetchSerpAdvanced(keyword: string, locationCode: number = 2250): Promise<unknown> {
  const url = `${getBaseUrl()}/serp/google/organic/live/advanced`
  const auth = getAuthHeader()

  log.debug(`fetchSerpAdvanced start`, { keyword, locationCode })
  const start = Date.now()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        keyword,
        location_code: locationCode,
        language_code: 'fr',
        device: 'desktop',
        os: 'windows',
      }]),
    })
  } catch (err) {
    log.error(`fetchSerpAdvanced network error`, { keyword, ms: Date.now() - start, error: (err as Error).message })
    throw err
  }

  if (!res.ok) {
    log.error(`fetchSerpAdvanced HTTP error`, { keyword, status: res.status, ms: Date.now() - start })
    throw new Error(`DataForSEO SERP Advanced error: ${res.status}`)
  }
  const json = await res.json()

  if (json.tasks?.[0]?.status_code !== 20000) {
    log.error(`fetchSerpAdvanced API error`, { keyword, statusCode: json.tasks?.[0]?.status_code, ms: Date.now() - start })
    throw new Error(json.tasks?.[0]?.status_message ?? 'DataForSEO SERP error')
  }

  const result = json.tasks[0].result?.[0] ?? null
  log.debug(`fetchSerpAdvanced done`, { keyword, ms: Date.now() - start, itemCount: result?.items?.length ?? 0 })
  return result
}

// --- Extract modules from SERP response ---

function extractModules(serpResult: any): SerpModule[] {
  if (!serpResult?.items) return []

  const foundTypes = new Set<SerpModuleType>()

  for (const item of serpResult.items) {
    const type = item.type as string
    if (type === 'local_pack') foundTypes.add('local_pack')
    else if (type === 'featured_snippet') foundTypes.add('featured_snippet')
    else if (type === 'people_also_ask') foundTypes.add('people_also_ask')
    else if (type === 'video') foundTypes.add('video')
    else if (type === 'images') foundTypes.add('images')
    else if (type === 'shopping') foundTypes.add('shopping')
    else if (type === 'knowledge_graph') foundTypes.add('knowledge_graph')
    else if (type === 'top_stories') foundTypes.add('top_stories')
  }

  return SERP_MODULE_TYPES.map(type => ({
    type,
    present: foundTypes.has(type),
    position: serpResult.items.findIndex((i: any) => i.type === type) + 1 || undefined,
  }))
}

function extractOrganicResults(serpResult: any): OrganicResult[] {
  if (!serpResult?.items) return []

  return serpResult.items
    .filter((i: any) => i.type === 'organic')
    .slice(0, 5)
    .map((i: any, idx: number) => ({
      position: i.rank_absolute ?? idx + 1,
      title: i.title ?? '',
      url: i.url ?? '',
      description: i.description ?? '',
      domain: i.domain ?? '',
    }))
}

function extractPaaQuestions(serpResult: any): string[] {
  if (!serpResult?.items) return []

  const questions: string[] = []
  for (const item of serpResult.items) {
    if (item.type === 'people_also_ask' && Array.isArray(item.items)) {
      for (const paaItem of item.items) {
        const question = paaItem.title ?? paaItem.question ?? ''
        if (question) questions.push(question)
      }
    }
  }
  return questions
}

// --- Claude Intent Classification ---

async function classifyIntentWithClaude(keyword: string, modules: SerpModule[], organicResults: OrganicResult[]): Promise<{ type: IntentType; confidence: number; reasoning: string; usage?: ApiUsage }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

  const modulesPresent = modules.filter(m => m.present).map(m => m.type).join(', ')
  const organicSummary = organicResults.map(r => `- ${r.title} (${r.domain})`).join('\n')

  log.debug(`classifyIntentWithClaude start`, { keyword, model, modulesPresent: modulesPresent || 'none' })
  const start = Date.now()

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model,
      max_tokens: 256,
      system: 'Tu es un expert SEO. Réponds UNIQUEMENT en JSON valide, sans markdown.',
      messages: [{
        role: 'user',
        content: `Classifie l'intention de recherche pour "${keyword}".

Modules SERP détectés: ${modulesPresent || 'aucun module spécial'}

Top résultats organiques:
${organicSummary || 'Aucun résultat'}

Réponds en JSON: {"type": "informational|transactional_local|navigational|mixed", "confidence": 0.0-1.0, "reasoning": "explication courte"}`,
      }],
    })
  } catch (err) {
    log.error(`classifyIntentWithClaude API call failed`, { keyword, model, ms: Date.now() - start, error: (err as Error).message })
    throw err
  }

  const usage: ApiUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
    estimatedCost: calculateCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }
  log.info(`classifyIntentWithClaude done`, { keyword, ms: Date.now() - start, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost: `$${usage.estimatedCost.toFixed(4)}` })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    const result = {
      type: parsed.type ?? 'mixed',
      confidence: parsed.confidence ?? 0.5,
      reasoning: parsed.reasoning ?? '',
      usage,
    }
    return result
  } catch (err) {
    log.warn(`classifyIntentWithClaude JSON parse failed, using fallback`, { keyword, rawLength: cleaned.length, error: (err as Error).message })
    // Fallback: infer from modules
    const hasLocalPack = modules.some(m => m.type === 'local_pack' && m.present)
    return {
      type: hasLocalPack ? 'transactional_local' : 'informational',
      confidence: 0.3,
      reasoning: 'Classification par défaut basée sur les modules SERP',
      usage,
    }
  }
}

// --- Main orchestrator ---

export async function analyzeIntent(keyword: string, locationCode: number = 2250): Promise<IntentAnalysis> {
  return getOrFetch<IntentAnalysis>(
    CACHE_DIR,
    `intent-${slugify(keyword)}`,
    Infinity,
    async () => {
      log.info(`Analyzing intent for "${keyword}"`, { locationCode })

      const analyzeStart = Date.now()

      const serpResult = await fetchSerpAdvanced(keyword, locationCode)
      log.debug(`SERP Advanced fetched for "${keyword}"`)

      const modules = extractModules(serpResult)
      const topOrganicResults = extractOrganicResults(serpResult)
      const paaQuestions = extractPaaQuestions(serpResult)
      const modulesDetected = modules.filter(m => m.present).map(m => m.type)
      log.debug(`SERP modules detected for "${keyword}"`, { count: modulesDetected.length, modules: modulesDetected })

      const scores: IntentScore[] = modules
        .filter(m => m.present)
        .map(m => MODULE_SCORES[m.type])

      if (topOrganicResults.length > 0) {
        scores.push({
          category: 'Résultats organiques',
          score: Math.min(topOrganicResults.length, 5) * 2,
          maxScore: 10,
        })
      }

      const recommendations: IntentRecommendation[] = modules
        .filter(m => m.present)
        .map(m => ({ module: m.type, ...MODULE_RECOMMENDATIONS[m.type] }))

      if (recommendations.length === 0 && topOrganicResults.length > 0) {
        recommendations.push({
          module: 'featured_snippet',
          action: 'Aucun module SERP spécial détecté — le terrain est libre pour un article de fond bien structuré visant la position zéro.',
          priority: 'medium',
        })
      }

      log.debug(`Classifying intent with Claude for "${keyword}"`)
      const classification = await classifyIntentWithClaude(keyword, modules, topOrganicResults)
      log.info(`Intent analysis complete for "${keyword}"`, { intent: classification.type, confidence: classification.confidence, modulesDetected: modulesDetected.length, organicResults: topOrganicResults.length, paaQuestions: paaQuestions.length, ms: Date.now() - analyzeStart })

      return {
        keyword,
        modules,
        scores,
        dominantIntent: classification.type,
        classification,
        recommendations,
        topOrganicResults,
        paaQuestions,
        cachedAt: new Date().toISOString(),
      }
    },
  )
}

// --- Local vs National Comparison (Epic 12) ---

async function fetchKeywordOverviewForLocation(keyword: string, locationCode: number): Promise<LocationMetrics> {
  const url = `${getBaseUrl()}/dataforseo_labs/google/keyword_overview/live`
  const auth = getAuthHeader()

  log.debug(`fetchKeywordOverviewForLocation start`, { keyword, locationCode })
  const start = Date.now()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        keywords: [keyword],
        location_code: locationCode,
        language_code: 'fr',
      }]),
    })
  } catch (err) {
    log.error(`fetchKeywordOverviewForLocation network error`, { keyword, locationCode, ms: Date.now() - start, error: (err as Error).message })
    throw err
  }

  if (!res.ok) {
    log.error(`fetchKeywordOverviewForLocation HTTP error`, { keyword, locationCode, status: res.status, ms: Date.now() - start })
    throw new Error(`DataForSEO Keyword Overview error: ${res.status}`)
  }
  const json = await res.json()

  const item = json.tasks?.[0]?.result?.[0]?.items?.[0]
  if (!item) {
    log.debug(`fetchKeywordOverviewForLocation no data`, { keyword, locationCode, ms: Date.now() - start })
    return { searchVolume: 0, keywordDifficulty: 0, cpc: 0, competition: 0, monthlySearches: [] }
  }

  log.debug(`fetchKeywordOverviewForLocation done`, { keyword, locationCode, ms: Date.now() - start, volume: item.keyword_info?.search_volume })
  return {
    searchVolume: item.keyword_info?.search_volume ?? 0,
    keywordDifficulty: item.keyword_info?.keyword_difficulty ?? 0,
    cpc: item.keyword_info?.cpc ?? 0,
    competition: item.keyword_info?.competition ?? 0,
    monthlySearches: item.keyword_info?.monthly_searches?.map((m: any) => m.search_volume) ?? [],
  }
}

export async function compareLocalNational(keyword: string): Promise<LocalNationalComparison> {
  return getOrFetch<LocalNationalComparison>(
    CACHE_DIR,
    `local-national-${slugify(keyword)}`,
    Infinity,
    async () => {
      log.info(`Comparing local vs national for "${keyword}"`)

      const compareStart = Date.now()
      const nationalCode = isSandbox() ? 2250 : 2742
      const localCode = isSandbox() ? 2250 : 1006157

      const [national, local] = await Promise.all([
        fetchKeywordOverviewForLocation(keyword, nationalCode),
        fetchKeywordOverviewForLocation(keyword, localCode),
      ])
      log.debug(`Local vs national data fetched`, { keyword, ms: Date.now() - compareStart, nationalVolume: national.searchVolume, localVolume: local.searchVolume })

      const kdNational = Math.max(national.keywordDifficulty, 1)
      const opportunityIndex = Math.round((local.searchVolume * (100 - local.keywordDifficulty)) / kdNational)

      const threshold = parseInt(process.env.LOCAL_OPPORTUNITY_THRESHOLD ?? '60', 10)
      let alert: OpportunityAlert | null = null
      if (opportunityIndex >= threshold) {
        alert = {
          keyword,
          index: opportunityIndex,
          message: `Ce mot-clé est une opportunité locale ! Indice ${opportunityIndex} (seuil: ${threshold})`,
          type: 'opportunity',
        }
      }

      return {
        keyword,
        local,
        national,
        opportunityIndex,
        alert,
        cachedAt: new Date().toISOString(),
      }
    },
  )
}

// --- Autocomplete Validation (Epic 13) ---

async function fetchGoogleAutocomplete(keyword: string): Promise<string[]> {
  const url = `${getBaseUrl()}/serp/google/autocomplete/live/advanced`
  const auth = getAuthHeader()

  log.debug(`fetchGoogleAutocomplete start`, { keyword })
  const start = Date.now()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        keyword,
        language_code: 'fr',
        location_code: 2250,
      }]),
    })
  } catch (err) {
    log.error(`fetchGoogleAutocomplete network error`, { keyword, ms: Date.now() - start, error: (err as Error).message })
    throw err
  }

  if (!res.ok) {
    log.error(`fetchGoogleAutocomplete HTTP error`, { keyword, status: res.status, ms: Date.now() - start })
    throw new Error(`DataForSEO Autocomplete error: ${res.status}`)
  }
  const json = await res.json()

  const items = json.tasks?.[0]?.result?.[0]?.items ?? []
  const suggestions = items.map((i: any) => i.suggestion ?? i.keyword ?? '').filter(Boolean)
  log.debug(`fetchGoogleAutocomplete done`, { keyword, ms: Date.now() - start, suggestionsCount: suggestions.length })
  return suggestions
}

export async function validateAutocomplete(keyword: string, prefixes?: string[]): Promise<AutocompleteResult> {
  // Check cache — skip if prefixes provided (expansion = fresh data)
  if (!prefixes || prefixes.length === 0) {
    const cached = await readCached<AutocompleteResult>(CACHE_DIR, `autocomplete-${slugify(keyword)}`)
    if (cached) {
      log.debug(`Autocomplete cache hit for "${keyword}"`)
      return cached.data
    }
  }

  log.info(`Validating autocomplete for "${keyword}"${prefixes?.length ? ` (${prefixes.length} prefixes)` : ''}`)

  const validateStart = Date.now()

  // Fetch autocomplete for main keyword + optional prefixes
  const queries = [keyword, ...(prefixes ?? [])]
  const allSuggestions: AutocompleteSuggestion[] = []
  const seenKeywords = new Set<string>()

  for (const query of queries) {
    const suggestions = await fetchGoogleAutocomplete(query)
    for (const s of suggestions) {
      const lower = s.toLowerCase()
      if (!seenKeywords.has(lower)) {
        seenKeywords.add(lower)
        allSuggestions.push({ keyword: s, type: 'autocomplete', searchVolume: null })
      }
    }
  }
  log.debug(`Autocomplete suggestions collected`, { keyword, queries: queries.length, uniqueSuggestions: allSuggestions.length })

  // Validate keyword existence in autocomplete (word-level matching)
  const keywordLower = keyword.toLowerCase()
  const keywordWords = keywordLower.split(/\s+/).filter(w => w.length > 2)
  const validated = allSuggestions.length > 0 && (
    // Exact substring match
    allSuggestions.some(s => s.keyword.toLowerCase().includes(keywordLower)) ||
    // Word-level: majority of keyword words appear in at least one suggestion
    (keywordWords.length > 0 && allSuggestions.some(s => {
      const sLower = s.keyword.toLowerCase()
      const matchCount = keywordWords.filter(w => sLower.includes(w)).length
      return matchCount >= Math.ceil(keywordWords.length / 2)
    }))
  )

  // Enrich certainty index with volume and SERP density (Epic 18)
  let volumeNormalized = 0
  let serpDensity = 0

  try {
    // Fetch volume from keyword overview — national scope
    // Sandbox only accepts 2250; production uses France (2742)
    const volumeLocation = isSandbox() ? 2250 : 2742
    const metrics = await fetchKeywordOverviewForLocation(keyword, volumeLocation)
    // Normalize: 0-1000 mapped to 0-1
    volumeNormalized = Math.min(metrics.searchVolume / 1000, 1)
  } catch (err) {
    log.warn(`Autocomplete volume enrichment failed`, { keyword, error: (err as Error).message })
  }

  try {
    // Fetch SERP to count relevant organic results
    const serpResult = await fetchSerpAdvanced(keyword, 2250)
    if (serpResult && (serpResult as any).items) {
      const organicCount = (serpResult as any).items.filter((i: any) => i.type === 'organic').length
      // Normalize: 10 organic results = density 1.0
      serpDensity = Math.min(organicCount / 10, 1)
    }
  } catch (err) {
    log.warn(`Autocomplete SERP density enrichment failed`, { keyword, error: (err as Error).message })
  }

  // Calculate certainty index with weights: autocomplete 40%, volume 30%, serp 30%
  const certaintyIndex: CertaintyIndex = {
    autocompleteExists: validated ? 1 : 0,
    volumeNormalized,
    serpDensity,
    total: (validated ? 0.4 : 0) + (volumeNormalized * 0.3) + (serpDensity * 0.3),
  }

  const result: AutocompleteResult = {
    keyword,
    suggestions: allSuggestions.slice(0, 20),
    validated,
    certaintyIndex,
    cachedAt: new Date().toISOString(),
  }

  await writeCached(CACHE_DIR, `autocomplete-${slugify(keyword)}`, result)
  log.info(`Autocomplete validation done`, { keyword, ms: Date.now() - validateStart, validated, suggestionsCount: result.suggestions.length, certaintyTotal: certaintyIndex.total.toFixed(2) })
  return result
}
