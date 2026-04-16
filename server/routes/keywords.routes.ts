import { Router } from 'express'
import { join } from 'path'
import { log } from '../utils/logger.js'
import { readCached, writeCached, slugify, isFresh } from '../utils/cache.js'
import { getKeywordsByCocoon, addKeyword, replaceKeyword, deleteKeyword, updateKeywordStatus, loadKeywordsDb, getArticleKeywords, saveArticleKeywords } from '../services/infra/data.service.js'
import { auditCocoonKeywords, getAuditCacheStatus, detectRedundancy } from '../services/external/dataforseo.service.js'
import { discoverKeywords, discoverFromDomain } from '../services/keyword/keyword-discovery.service.js'
import { previewMigration, applyMigration } from '../services/keyword/keyword-assignment.service.js'
import { fetchAutocomplete } from '../services/keyword/autocomplete.service.js'
import { suggestAll } from '../services/keyword/suggest.service.js'
import { computeWordGroups } from '../services/keyword/word-groups.service.js'
import type { ArticleKeywordAssignment } from '../services/keyword/keyword-assignment.service.js'
import type { Keyword, KeywordStatus } from '../../shared/types/index.js'

const router = Router()

/** GET /api/keywords/:cocoon — Keywords for a specific cocoon */
router.get('/keywords/:cocoon', async (req, res) => {
  try {
    const cocoonName = decodeURIComponent(req.params.cocoon)
    const keywords = await getKeywordsByCocoon(cocoonName)

    res.json({ data: keywords ?? [] })
  } catch (err) {
    log.error(`GET /api/keywords — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load keywords' } })
  }
})

/** POST /api/keywords/audit — Audit all keywords in a cocoon */
router.post('/keywords/audit', async (req, res) => {
  try {
    const { cocoonName, forceRefresh } = req.body as { cocoonName: string; forceRefresh?: boolean }
    if (!cocoonName) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'cocoonName is required' } })
      return
    }

    const keywords = await getKeywordsByCocoon(cocoonName)
    if (!keywords || keywords.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `No keywords found for cocoon: ${cocoonName}` } })
      return
    }

    const results = await auditCocoonKeywords(keywords, forceRefresh ?? false)
    const redundancies = detectRedundancy(results)

    // Add redundancy alerts to affected keywords
    for (const pair of redundancies) {
      const kw1 = results.find(r => r.keyword === pair.keyword1)
      const kw2 = results.find(r => r.keyword === pair.keyword2)
      if (kw1) {
        kw1.alerts.push({
          level: 'warning',
          type: 'redundant',
          message: `Redondant avec "${pair.keyword2}" (${pair.overlapPercent}% chevauchement)`,
          relatedKeyword: pair.keyword2,
        })
      }
      if (kw2) {
        kw2.alerts.push({
          level: 'warning',
          type: 'redundant',
          message: `Redondant avec "${pair.keyword1}" (${pair.overlapPercent}% chevauchement)`,
          relatedKeyword: pair.keyword1,
        })
      }
    }

    res.json({ data: { results, redundancies } })
  } catch (err) {
    log.error(`POST /api/keywords/audit — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'AUDIT_ERROR', message: 'Failed to audit keywords' } })
  }
})

/** GET /api/keywords/audit/:cocoon/status — Get audit cache status */
router.get('/keywords/audit/:cocoon/status', async (req, res) => {
  try {
    const cocoonName = decodeURIComponent(req.params.cocoon)
    const keywords = await getKeywordsByCocoon(cocoonName)
    if (!keywords || keywords.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `No keywords found for cocoon: ${cocoonName}` } })
      return
    }

    const status = await getAuditCacheStatus(keywords)
    res.json({ data: status })
  } catch (err) {
    log.error(`GET /api/keywords/audit/status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit status' } })
  }
})

/** POST /api/keywords — Add a keyword */
router.post('/keywords', async (req, res) => {
  try {
    const { keyword, cocoonName, type } = req.body as Keyword
    if (!keyword || !cocoonName || !type) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'keyword, cocoonName, and type are required' } })
      return
    }

    const result = await addKeyword({ keyword, cocoonName, type, status: 'suggested' })
    if (!result.success && result.duplicate) {
      res.status(409).json({ error: { code: 'DUPLICATE', message: `Le mot-clé "${keyword}" existe déjà` } })
      return
    }
    res.json({ data: { success: true } })
  } catch (err) {
    log.error(`POST /api/keywords — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add keyword' } })
  }
})

/** PUT /api/keywords — Replace a keyword */
router.put('/keywords', async (req, res) => {
  try {
    const { oldKeyword, newKeyword } = req.body as { oldKeyword: string; newKeyword: Keyword }
    if (!oldKeyword || !newKeyword?.keyword) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'oldKeyword and newKeyword are required' } })
      return
    }

    const success = await replaceKeyword(oldKeyword, newKeyword)
    if (!success) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Keyword not found: ${oldKeyword}` } })
      return
    }

    res.json({ data: { success: true } })
  } catch (err) {
    log.error(`PUT /api/keywords — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to replace keyword' } })
  }
})

/** PATCH /api/keywords/:keyword/status — Update keyword validation status */
router.patch('/keywords/:keyword/status', async (req, res) => {
  try {
    const keywordText = decodeURIComponent(req.params.keyword)
    const { status } = req.body as { status: KeywordStatus }
    if (!status || !['suggested', 'validated', 'rejected'].includes(status)) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'status must be suggested, validated, or rejected' } })
      return
    }

    const success = await updateKeywordStatus(keywordText, status)
    if (!success) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Keyword not found: ${keywordText}` } })
      return
    }

    res.json({ data: { success: true } })
  } catch (err) {
    log.error(`PATCH /api/keywords/status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update keyword status' } })
  }
})

/** DELETE /api/keywords/:keyword — Delete a keyword */
router.delete('/keywords/:keyword', async (req, res) => {
  try {
    const keywordText = decodeURIComponent(req.params.keyword)
    const success = await deleteKeyword(keywordText)
    if (!success) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Keyword not found: ${keywordText}` } })
      return
    }

    res.json({ data: { success: true } })
  } catch (err) {
    log.error(`DELETE /api/keywords — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete keyword' } })
  }
})

/** POST /api/keywords/discover — Discover keywords from a seed */
router.post('/keywords/discover', async (req, res) => {
  try {
    const { keyword, options } = req.body as { keyword: string; options?: { maxResults?: number } }
    if (!keyword) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'keyword is required' } })
      return
    }

    const result = await discoverKeywords(keyword, options)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/keywords/discover — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'DISCOVERY_ERROR', message: 'Failed to discover keywords' } })
  }
})

/** POST /api/keywords/discover-from-site — Discover keywords from a competitor domain */
router.post('/keywords/discover-from-site', async (req, res) => {
  try {
    const { domain, options } = req.body as { domain: string; options?: { maxResults?: number } }
    if (!domain) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'domain is required' } })
      return
    }

    // Load all existing keywords for comparison
    const allKeywords = await loadKeywordsDb()
    const existingKeywords = allKeywords.map(k => k.keyword)

    const result = await discoverFromDomain(domain, options, existingKeywords)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/keywords/discover-from-site — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'DISCOVERY_ERROR', message: 'Failed to discover keywords from site' } })
  }
})

/** GET /api/articles/:id/keywords — Get keywords for a specific article */
router.get('/articles/:id/keywords', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const keywords = await getArticleKeywords(id)
    res.json({ data: keywords })
  } catch (err) {
    log.error(`GET /api/articles/${id}/keywords — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article keywords' } })
  }
})

/** PUT /api/articles/:id/keywords — Save keywords for a specific article */
router.put('/articles/:id/keywords', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const { capitaine, lieutenants, lexique, rootKeywords, hnStructure, richCaptain, richRootKeywords, richLieutenants } = req.body as {
      capitaine: string; lieutenants: string[]; lexique: string[]; rootKeywords?: string[]; hnStructure?: any[]
      richCaptain?: any; richRootKeywords?: any[]; richLieutenants?: any[]
    }
    if (capitaine === undefined) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'capitaine is required' } })
      return
    }
    const saved = await saveArticleKeywords(id, {
      capitaine,
      lieutenants: lieutenants ?? [],
      lexique: lexique ?? [],
      rootKeywords: rootKeywords ?? [],
      hnStructure: hnStructure ?? [],
      ...(richCaptain !== undefined && { richCaptain }),
      ...(richRootKeywords !== undefined && { richRootKeywords }),
      ...(richLieutenants !== undefined && { richLieutenants }),
    })
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/articles/${id}/keywords — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save article keywords' } })
  }
})

/** POST /api/keywords/migrate/:cocoonName/preview — Preview keyword migration */
router.post('/keywords/migrate/:cocoonName/preview', async (req, res) => {
  try {
    const cocoonName = decodeURIComponent(req.params.cocoonName)
    const preview = await previewMigration(cocoonName)
    res.json({ data: preview })
  } catch (err) {
    log.error(`POST /api/keywords/migrate/preview — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'MIGRATION_ERROR', message: 'Failed to preview migration' } })
  }
})

/** POST /api/keywords/migrate/:cocoonName/apply — Apply keyword migration */
router.post('/keywords/migrate/:cocoonName/apply', async (req, res) => {
  try {
    const { assignments } = req.body as { assignments: ArticleKeywordAssignment[] }
    if (!assignments || !Array.isArray(assignments)) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'assignments array is required' } })
      return
    }
    const results = await applyMigration(assignments)
    res.json({ data: results })
  } catch (err) {
    log.error(`POST /api/keywords/migrate/apply — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'MIGRATION_ERROR', message: 'Failed to apply migration' } })
  }
})

/** POST /api/keywords/lexique-suggest — Suggest lexique for an article */
router.post('/keywords/lexique-suggest', async (req, res) => {
  try {
    const { capitaine, articleTitle, cocoonName } = req.body as { capitaine: string; articleTitle: string; cocoonName: string }
    if (!capitaine) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'capitaine is required' } })
      return
    }

    const { loadPrompt } = await import('../utils/prompt-loader.js')
    const { streamChatCompletion, USAGE_SENTINEL } = await import('../services/external/claude.service.js')

    const cocoonSlug = cocoonName
      ? cocoonName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : undefined

    const prompt = await loadPrompt('lexique-suggest', {
      capitaine,
      articleTitle: articleTitle || '',
      cocoonName: cocoonName || '',
    }, cocoonSlug ? { cocoonSlug } : undefined)

    let content = ''
    for await (const chunk of streamChatCompletion(prompt, `Génère le lexique LSI pour le mot-clé "${capitaine}".`, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) continue
      content += chunk
    }

    // Parse JSON array from response
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const lexique = JSON.parse(cleaned) as string[]

    res.json({ data: { lexique } })
  } catch (err) {
    log.error(`POST /api/keywords/lexique-suggest — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'SUGGESTION_ERROR', message: 'Failed to suggest lexique' } })
  }
})

/** POST /api/keywords/translate-pain — Translate a client pain point into SEO keywords */
router.post('/keywords/translate-pain', async (req, res) => {
  try {
    const { painText, cocoonName: painCocoonName } = req.body as { painText: string; cocoonName?: string }
    if (!painText || !painText.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'painText is required' } })
      return
    }

    const { loadPrompt } = await import('../utils/prompt-loader.js')
    const { streamChatCompletion, USAGE_SENTINEL } = await import('../services/external/claude.service.js')

    const painCocoonSlug = painCocoonName
      ? painCocoonName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : undefined

    const prompt = await loadPrompt('pain-translate', {}, painCocoonSlug ? { cocoonSlug: painCocoonSlug } : undefined)

    let content = ''
    for await (const chunk of streamChatCompletion(prompt, `Traduis cette douleur client en mots-clés SEO : "${painText}"`, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) continue
      content += chunk
    }

    // Parse JSON from response
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const result = JSON.parse(cleaned) as { keywords: Array<{ keyword: string; reasoning: string }> }

    res.json({ data: { keywords: result.keywords } })
  } catch (err) {
    log.error(`POST /api/keywords/translate-pain — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'TRANSLATION_ERROR', message: 'Failed to translate pain point into keywords' } })
  }
})

/** POST /api/keywords/validate-pain — Validate translated keywords via multi-source (DataForSEO + Discussions + Autocomplete) */
const VALIDATION_CACHE_DIR = join(process.cwd(), 'data', 'cache', 'validation')

router.post('/keywords/validate-pain', async (req, res) => {
  try {
    const { keywords } = req.body as { keywords: string[] }
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'keywords array is required' } })
      return
    }

    // Check cache — key based on sorted keywords
    const sortedKw = [...keywords].sort()
    const cacheKey = slugify(sortedKw.join('-'))
    const cached = await readCached(VALIDATION_CACHE_DIR, cacheKey)
    if (cached && isFresh(cached.cachedAt, 24 * 60 * 60 * 1000)) {
      log.debug(`[validate-pain] Cache hit for ${keywords.length} keywords`)
      res.json({ data: cached.data })
      return
    }

    const { fetchKeywordOverviewBatch, fetchRelatedKeywords } = await import('../services/external/dataforseo.service.js')
    const { fetchCommunityDiscussions } = await import('../services/intent/community-discussions.service.js')
    const { fetchAutocomplete } = await import('../services/keyword/autocomplete.service.js')

    const overviews = await fetchKeywordOverviewBatch(keywords)

    const results = await Promise.all(
      keywords.map(async (kw) => {
        const kwLower = kw.toLowerCase()
        const overview = overviews.get(kwLower)

        // Fetch all 3 sources in parallel via Promise.allSettled
        const [relatedResult, communityResult, autocompleteResult] = await Promise.allSettled([
          fetchRelatedKeywords(kw),
          fetchCommunityDiscussions(kw),
          fetchAutocomplete(kw),
        ])

        // DataForSEO data
        const relatedCount = relatedResult.status === 'fulfilled' ? relatedResult.value.length : 0
        const dataforseo = {
          searchVolume: overview?.searchVolume ?? 0,
          difficulty: overview?.difficulty ?? 0,
          cpc: overview?.cpc ?? 0,
          competition: overview?.competition ?? 0,
          relatedCount,
        }

        // Community signal
        const community = communityResult.status === 'fulfilled' ? communityResult.value : null

        // Autocomplete signal
        const autocomplete = autocompleteResult.status === 'fulfilled' ? autocompleteResult.value : null

        // Server-side verdict (simplified scoring)
        const verdict = computeServerVerdict(dataforseo, community, autocomplete)

        return { keyword: kw, dataforseo, community, autocomplete, verdict }
      }),
    )

    // Save to cache
    await writeCached(VALIDATION_CACHE_DIR, cacheKey, { results })
    log.debug(`[validate-pain] Cached results for ${keywords.length} keywords`)

    res.json({ data: { results } })
  } catch (err) {
    log.error(`POST /api/keywords/validate-pain — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'VALIDATION_ERROR', message: 'Failed to validate keywords' } })
  }
})

/** Compute a simplified server-side verdict based on the 3 sources */
function computeServerVerdict(
  dataforseo: { searchVolume: number; cpc: number; relatedCount: number },
  community: { discussionsCount: number; freshness: string } | null,
  autocomplete: { suggestionsCount: number; hasKeyword: boolean } | null,
): { category: string; confidence: number; sourcesAvailable: number } {
  let sourcesAvailable = 1 // DataForSEO always present
  if (community) sourcesAvailable++
  if (autocomplete) sourcesAvailable++

  const vol = dataforseo.searchVolume
  const cpc = dataforseo.cpc
  const discCount = community?.discussionsCount ?? 0
  const freshness = community?.freshness ?? 'old'
  const autoCount = autocomplete?.suggestionsCount ?? 0
  const autoHas = autocomplete?.hasKeyword ?? false

  // Scoring
  let score = 0
  if (vol > 200) score += 2
  else if (vol > 50) score += 1
  if (cpc > 3) score += 2
  else if (cpc > 1) score += 1
  if (discCount >= 5 && freshness === 'recent') score += 2
  else if (discCount >= 3) score += 1
  if (autoHas) score += 2
  else if (autoCount >= 5) score += 1

  // Map score to category
  let category: string
  if (score >= 7) category = 'brulante'
  else if (score >= 5) category = 'confirmee'
  else if (score >= 3) category = 'emergente'
  else if (score >= 2 && discCount === 0 && autoCount > 0) category = 'latente'
  else if (score <= 1) category = 'froide'
  else category = 'incertaine'

  const confidence = Math.min(1, sourcesAvailable / 3 * 0.7 + (score > 0 ? 0.3 : 0))

  return { category, confidence: Math.round(confidence * 100) / 100, sourcesAvailable }
}

/** POST /api/keywords/autocomplete-suggest — Get Google Autocomplete suggestions as keyword candidates */
router.post('/keywords/autocomplete-suggest', async (req, res) => {
  try {
    const { keyword } = req.body as { keyword: string }
    if (!keyword?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'keyword is required' } })
      return
    }

    const signal = await fetchAutocomplete(keyword.trim())
    log.info(`Autocomplete suggest for "${keyword.trim()}" — ${signal.suggestionsCount} suggestions`)
    res.json({ data: { suggestions: signal.suggestions, seed: keyword.trim() } })
  } catch (err) {
    log.error(`POST /api/keywords/autocomplete-suggest — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'AUTOCOMPLETE_ERROR', message: 'Failed to fetch autocomplete suggestions' } })
  }
})

/** POST /api/keywords/suggest-all — Run all 4 Google Suggest strategies in parallel */
router.post('/keywords/suggest-all', async (req, res) => {
  try {
    const { keyword, language, country } = req.body as { keyword: string; language?: string; country?: string }
    if (!keyword?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'keyword is required' } })
      return
    }

    const result = await suggestAll(keyword.trim(), language ?? 'fr', country ?? 'fr')
    res.json({
      data: {
        alphabet: { items: result.alphabet, count: result.alphabet.length },
        questions: { items: result.questions, count: result.questions.length },
        intents: { items: result.intents, count: result.intents.length },
        prepositions: { items: result.prepositions, count: result.prepositions.length },
        totalUnique: result.totalUnique,
      },
    })
  } catch (err) {
    log.error(`POST /api/keywords/suggest-all — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'SUGGEST_ERROR', message: 'Failed to fetch suggestions' } })
  }
})

/** POST /api/keywords/relevance-score — Classify keyword relevance via Claude Haiku (tool_use) */
router.post('/keywords/relevance-score', async (req, res) => {
  try {
    const { seed, keywords, strict, articleContext } = req.body as {
      seed: string
      keywords: string[]
      strict?: boolean
      articleContext?: { title?: string; painPoint?: string }
    }
    if (!seed?.trim() || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed and keywords array are required' } })
      return
    }

    const { classifyWithTool } = await import('../services/external/claude.service.js')
    const { getThemeConfig } = await import('../services/strategy/theme-config.service.js')

    // Load business context from theme config
    const theme = await getThemeConfig()
    const contextLines: string[] = []
    if (theme.avatar.sector) contextLines.push(`Secteur : ${theme.avatar.sector}`)
    if (theme.positioning.targetAudience) contextLines.push(`Audience cible : ${theme.positioning.targetAudience}`)
    if (theme.offerings.services.length > 0) contextLines.push(`Services : ${theme.offerings.services.join(', ')}`)
    if (articleContext?.title) contextLines.push(`Article : ${articleContext.title}`)
    if (articleContext?.painPoint) contextLines.push(`Problématique : ${articleContext.painPoint}`)
    const businessContext = contextLines.length > 0
      ? `\n\nContexte business du site :\n${contextLines.join('\n')}`
      : ''

    // Build numbered keyword list for the prompt
    const numberedList = keywords.map((kw, i) => `${i}. ${kw}`).join('\n')

    const systemPrompt = strict
      ? `Tu es un expert SEO français. On te présente des mots-clés qui ont DÉJÀ été pré-classés comme pertinents pour le sujet donné. Ta tâche est de faire une VÉRIFICATION STRICTE et d'identifier ceux qui ne devraient PAS être considérés pertinents.

Sois très strict. Un mot-clé doit clairement aider le référencement d'un article sur ce sujet, dans le contexte business décrit, pour rester pertinent.

Rejette systématiquement :
- Les homonymies (même mot, contexte différent : "croissance" business vs "croissance" biologique)
- Les mots-clés géographiques/pays hors contexte (ex: "développement maroc" quand le sujet est business/entreprise)
- Les mots-clés d'un domaine adjacent mais distinct du secteur d'activité
- Les mots-clés trop génériques qui ne ciblent pas l'intention du seed`
      : `Tu es un expert SEO français. Ta tâche est d'identifier les mots-clés qui ne sont PAS pertinents pour le sujet donné, dans le contexte business décrit.

Règles de classification :
1. PERTINENT : le mot-clé cible la même intention de recherche ou le même domaine d'expertise que le seed, dans le contexte du secteur d'activité.
2. NON PERTINENT : le mot-clé partage des mots avec le seed mais dans un contexte complètement différent (homonymie, sens figuré vs littéral, domaine différent du secteur).

Sois strict : si le mot-clé serait hors-sujet dans un article traitant du seed pour cette audience, marque-le NON pertinent.`

    const userPrompt = strict
      ? `Sujet : "${seed.trim()}"${businessContext}

Ces ${keywords.length} mots-clés ont été pré-classés comme pertinents. Vérifie chacun strictement et identifie ceux qui sont en réalité hors-sujet :

${numberedList}`
      : `Sujet : "${seed.trim()}"${businessContext}

Voici ${keywords.length} mots-clés. Identifie les indices de ceux qui ne sont PAS pertinents pour ce sujet :

${numberedList}`

    interface ClassifyResult {
      irrelevant_indices: number[]
    }

    const { result } = await classifyWithTool<ClassifyResult>(
      systemPrompt,
      userPrompt,
      {
        name: 'classify_relevance',
        description: 'Returns the indices of keywords that are NOT relevant to the topic',
        input_schema: {
          type: 'object' as const,
          properties: {
            irrelevant_indices: {
              type: 'array',
              items: { type: 'integer' },
              description: 'Array of 0-based indices of keywords that are NOT relevant to the seed topic',
            },
          },
          required: ['irrelevant_indices'],
        },
      },
    )

    // Convert to score map: relevant = 1, irrelevant = 0
    const irrelevantSet = new Set(result.irrelevant_indices)
    const scoreMap: Record<string, number> = {}
    for (let i = 0; i < keywords.length; i++) {
      scoreMap[keywords[i].toLowerCase()] = irrelevantSet.has(i) ? 0 : 1
    }

    log.info(`Relevance ${strict ? 'STRICT' : 'pass-1'}: ${keywords.length} kw, ${irrelevantSet.size} irrelevant for "${seed.trim()}"`)
    res.json({ data: { scores: scoreMap, fallback: false } })
  } catch (err) {
    log.error(`POST /api/keywords/relevance-score — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'SCORING_ERROR', message: 'Failed to classify keyword relevance' } })
  }
})

/** POST /api/keywords/analyze-discovery — AI analysis of relevant keywords to produce a curated shortlist */
router.post('/keywords/analyze-discovery', async (req, res) => {
  try {
    const { seed, keywords, wordGroups, articleContext } = req.body as {
      seed: string
      keywords: Array<{ keyword: string; sources: string[]; searchVolume?: number; difficulty?: number; cpc?: number; intent?: string }>
      wordGroups: Array<{ word: string; count: number }>
      articleContext?: { title?: string; painPoint?: string }
    }
    if (!seed?.trim() || !keywords || keywords.length === 0) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed and keywords are required' } })
      return
    }

    const { classifyWithTool } = await import('../services/external/claude.service.js')
    const { getThemeConfig } = await import('../services/strategy/theme-config.service.js')

    // Business context
    const theme = await getThemeConfig()
    const contextLines: string[] = []
    if (theme.avatar.sector) contextLines.push(`Secteur : ${theme.avatar.sector}`)
    if (theme.positioning.targetAudience) contextLines.push(`Audience cible : ${theme.positioning.targetAudience}`)
    if (theme.offerings.services.length > 0) contextLines.push(`Services : ${theme.offerings.services.join(', ')}`)
    if (theme.positioning.mainPromise) contextLines.push(`Promesse : ${theme.positioning.mainPromise}`)
    if (articleContext?.title) contextLines.push(`Article visé : ${articleContext.title}`)
    const businessContext = contextLines.length > 0 ? contextLines.join('\n') : 'Non renseigné'
    const painPointBlock = articleContext?.painPoint
      ? `\nPOINT DE DOULEUR CLIENT (critère prioritaire) :\n"${articleContext.painPoint}"\nLes mots-clés qui captent cette douleur ou y apportent une réponse doivent être priorisés.\n`
      : ''

    // Format keyword list with metadata
    const kwLines = keywords.map((kw, i) => {
      const meta: string[] = []
      if (kw.sources.length >= 2) meta.push(`multi-source ×${kw.sources.length}: ${kw.sources.join(', ')}`)
      else meta.push(`source: ${kw.sources[0]}`)
      if (kw.searchVolume != null) meta.push(`vol: ${kw.searchVolume}`)
      if (kw.difficulty != null) meta.push(`KD: ${kw.difficulty}`)
      if (kw.cpc != null) meta.push(`CPC: ${kw.cpc.toFixed(2)}€`)
      if (kw.intent) meta.push(`intent: ${kw.intent}`)
      return `${i}. ${kw.keyword} [${meta.join(' | ')}]`
    }).join('\n')

    // Format word groups
    const groupLines = wordGroups.slice(0, 30).map(g => `"${g.word}" (${g.count})`).join(', ')

    const systemPrompt = `Tu es un expert SEO senior spécialisé en stratégie de contenu. Tu analyses un pool de mots-clés issus de la phase Discovery pour sélectionner les 20 à 30 mots-clés les plus stratégiques à envoyer en validation approfondie.

Tu dois raisonner comme un stratège SEO : pense en termes de cocon sémantique, d'intention de recherche, de couverture thématique et de potentiel business.

MÉTHODOLOGIE (dans cet ordre) :

ÉTAPE 1 — COMPRENDRE LE POINT DE DOULEUR
Le point de douleur client est CENTRAL. C'est la raison pour laquelle l'utilisateur va chercher sur Google. Demande-toi : "Si un prospect souffre de ce problème, quels mots-clés taperait-il ?". Priorise fortement les mots-clés qui captent cette intention de douleur (questions, frustrations, recherche de solutions).

ÉTAPE 2 — ÉVALUER LES GROUPES THÉMATIQUES
Les groupes de mots listés ci-dessous sont calculés automatiquement. Beaucoup sont du bruit (mots génériques, groupes avec 2-3 occurrences). AVANT de les utiliser, évalue lesquels sont réellement pertinents par rapport au sujet, au point de douleur et au contexte business. Ignore les groupes non pertinents. Utilise les groupes pertinents comme signal de sous-thèmes importants à couvrir.

ÉTAPE 3 — APPLIQUER LES CRITÈRES DE SÉLECTION
1. ALIGNEMENT DOULEUR : Le mot-clé capte-t-il l'intention d'un prospect qui souffre du problème décrit ? (critère n°1)
2. MULTI-SOURCE : Présent dans 2+ sources = signal fort (Google Suggest + DataForSEO + IA s'accordent)
3. INTENTION COMMERCIALE : Privilégie transactionnelle/commerciale (CPC élevé, intent "commercial"/"transactional")
4. VOLUME vs DIFFICULTÉ : Bon ratio = opportunité
5. VARIÉTÉ D'INTENTIONS : Mélange informationnelle + commerciale + transactionnelle pour un cocon complet
6. LONGUE TRAÎNE STRATÉGIQUE : Questions et phrases qui ciblent une intention précise

IMPORTANT :
- Sélectionne exactement entre 20 et 30 mots-clés
- Chaque mot-clé DOIT avoir une explication courte (1-2 phrases) qui explique POURQUOI ce mot-clé est stratégique par rapport au point de douleur et au business
- Attribue une priorité : "high" (incontournable, lié au pain point ou forte valeur business), "medium" (recommandé, renforce le cocon), "low" (bonus/complément)
- Ne sélectionne PAS un mot-clé juste parce qu'il appartient à un groupe — sélectionne-le parce qu'il est stratégique`

    const userPrompt = `CONTEXTE BUSINESS :
${businessContext}
${painPointBlock}
MOT-CLÉ RACINE : "${seed.trim()}"

GROUPES THÉMATIQUES DÉTECTÉS (évalue leur pertinence avant de les utiliser) :
${groupLines}

POOL DE ${keywords.length} MOTS-CLÉS PERTINENTS :
${kwLines}

Analyse ce pool en suivant la méthodologie (comprendre la douleur → évaluer les groupes → appliquer les critères). Sélectionne les 20-30 mots-clés les plus stratégiques.`

    interface AnalysisResult {
      keywords: Array<{
        keyword: string
        reasoning: string
        priority: 'high' | 'medium' | 'low'
      }>
      summary: string
    }

    const { result, usage } = await classifyWithTool<AnalysisResult>(
      systemPrompt,
      userPrompt,
      {
        name: 'curate_keywords',
        description: 'Returns a curated shortlist of the most strategic keywords with reasoning',
        input_schema: {
          type: 'object' as const,
          properties: {
            keywords: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  keyword: { type: 'string', description: 'The exact keyword text' },
                  reasoning: { type: 'string', description: 'Why this keyword was selected (1-2 sentences)' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Strategic priority level' },
                },
                required: ['keyword', 'reasoning', 'priority'],
              },
              description: 'Curated list of 20-30 strategic keywords',
            },
            summary: {
              type: 'string',
              description: 'A brief 2-3 sentence strategy summary explaining the overall selection logic',
            },
          },
          required: ['keywords', 'summary'],
        },
      },
      'claude-haiku-4-5-20251001',
      8192,
    )

    log.info(`Discovery analysis: ${result.keywords.length} keywords selected from ${keywords.length} (cost: $${usage.estimatedCost.toFixed(4)})`)
    res.json({ data: { ...result, usage } })
  } catch (err) {
    log.error(`POST /api/keywords/analyze-discovery — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'ANALYSIS_ERROR', message: 'Failed to analyze discovery results' } })
  }
})

/** POST /api/keywords/word-groups — Compute word groups from a keyword list */
router.post('/keywords/word-groups', async (req, res) => {
  try {
    const { keywords, minCount, maxGroups } = req.body as { keywords: string[]; minCount?: number; maxGroups?: number }
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'keywords array is required' } })
      return
    }

    const groups = computeWordGroups(keywords, minCount ?? 2, maxGroups ?? 50)
    log.info(`Word groups: ${groups.length} groups from ${keywords.length} keywords`)
    res.json({ data: { groups } })
  } catch (err) {
    log.error(`POST /api/keywords/word-groups — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'WORD_GROUPS_ERROR', message: 'Failed to compute word groups' } })
  }
})

export default router
