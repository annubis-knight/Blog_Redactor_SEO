import { log } from '../../utils/logger.js'
import {
  getKeywordMetrics,
  upsertKeywordContentGap,
  isKeywordMetricsFresh,
} from '../keyword/keyword-metrics.service.js'
import { classifyWithTool } from '../external/ai-provider.service.js'
import type { ApiUsage } from '../external/claude.service.js'
import type {
  ContentGapAnalysis,
  CompetitorContent,
  ThematicGap,
} from '../../../shared/types/index.js'

// Sprint 15.5 — content gap analysis moved from api_cache[content-gap] to
// keyword_metrics.content_gap_analysis (cross-article).

async function searchWithTavily(
  keyword: string,
): Promise<{ url: string; title: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY must be set in environment variables')

  log.debug('Tavily search request', { keyword, search_depth: 'advanced', max_results: 5 })
  const start = Date.now()

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: keyword,
      search_depth: 'advanced',
      include_raw_content: true,
      max_results: 5,
    }),
  })

  if (!res.ok) {
    log.error('Tavily API error', { keyword, status: res.status, ms: Date.now() - start })
    throw new Error(`Tavily API error: ${res.status}`)
  }
  const json = await res.json()

  const results = (json.results ?? []).map((r: any) => ({
    url: r.url ?? '',
    title: r.title ?? '',
    content: (r.raw_content ?? r.content ?? '').slice(0, 5000), // limit content size
  }))

  const totalContentSize = results.reduce((sum: number, r: any) => sum + r.content.length, 0)
  log.info('Tavily search done', { keyword, resultCount: results.length, totalContentSize, ms: Date.now() - start })

  return results
}

async function analyzeCompetitorContent(
  keyword: string,
  contents: { url: string; title: string; content: string }[],
): Promise<{
  competitors: CompetitorContent[]
  themes: ThematicGap[]
  localEntities: { entity: string; frequency: number }[]
  _apiUsage?: ApiUsage
}> {
  const contentSummaries = contents
    .map(
      (c, i) =>
        `--- Concurrent ${i + 1}: ${c.title} (${c.url}) ---\n${c.content.slice(0, 2000)}`,
    )
    .join('\n\n')

  log.debug('AI analysis request', { keyword, contentCount: contents.length, promptSize: contentSummaries.length })
  const start = Date.now()

  interface ContentGapPayload {
    competitors: CompetitorContent[]
    themes: ThematicGap[]
    localEntities: { entity: string; frequency: number }[]
  }

  try {
    const { result, usage } = await classifyWithTool<ContentGapPayload>(
      'Tu es un expert SEO specialise en analyse concurrentielle. Reponds UNIQUEMENT en JSON valide.',
      `Analyse ces ${contents.length} contenus concurrents pour le mot-cle "${keyword}".

${contentSummaries}

Pour les themes: identifie les sujets/sous-sujets couverts par au moins 2 concurrents.
Pour les entites locales: detecte mentions de quartiers, villes, entreprises, lieux de Toulouse/Occitanie.
Pour publishDate: extrait la date de publication ou derniere mise a jour si visible (format YYYY-MM-DD). Si absente, omets le champ.
Pour readabilityScore: estime un score de lisibilite 0-100 (0=tres difficile, 100=tres facile) base sur la longueur des phrases et la complexite du vocabulaire.
Pour paasCovered: liste les questions PAA (People Also Ask) auxquelles le contenu repond explicitement.`,
      {
        name: 'analyze_content_gap',
        description: 'Analyse concurrentielle : competitors, themes partages et entites locales.',
        input_schema: {
          type: 'object' as const,
          properties: {
            competitors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  headings: { type: 'array', items: { type: 'string' } },
                  wordCount: { type: 'number' },
                  localEntities: { type: 'array', items: { type: 'string' } },
                  publishDate: { type: 'string' },
                  readabilityScore: { type: 'number' },
                  paasCovered: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            themes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  theme: { type: 'string' },
                  frequency: { type: 'number' },
                },
                required: ['theme', 'frequency'],
              },
            },
            localEntities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  entity: { type: 'string' },
                  frequency: { type: 'number' },
                },
                required: ['entity', 'frequency'],
              },
            },
          },
          required: ['competitors', 'themes', 'localEntities'],
        },
      },
      { maxTokens: 1024 },
    )

    log.info('AI analysis done', { keyword, ms: Date.now() - start, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost: `$${usage.estimatedCost.toFixed(4)}`, competitors: result.competitors?.length ?? 0, themes: result.themes?.length ?? 0, localEntities: result.localEntities?.length ?? 0 })

    return {
      competitors: result.competitors ?? [],
      themes: result.themes ?? [],
      localEntities: result.localEntities ?? [],
      _apiUsage: usage,
    }
  } catch (err) {
    log.error('AI content gap analysis failed', { keyword, error: (err as Error).message })
    return { competitors: [], themes: [], localEntities: [] }
  }
}

export async function analyzeContentGap(
  keyword: string,
  currentContent?: string,
): Promise<ContentGapAnalysis> {
  // Sprint 15.5 — DB-first on keyword_metrics.content_gap_analysis.
  // NOTE: the `presentInArticle` flag depends on currentContent, so we recompute
  // it on every call even on a DB hit. The rest (competitors, themes) is shared.
  const existing = await getKeywordMetrics(keyword)
  if (existing?.contentGapAnalysis && isKeywordMetricsFresh(existing.fetchedAt)) {
    log.debug(`Content gap DB hit for "${keyword}"`)
    const cached = existing.contentGapAnalysis as ContentGapAnalysis
    const currentLower = (currentContent ?? '').toLowerCase()
    const themes: ThematicGap[] = cached.themes.map(t => ({
      ...t,
      presentInArticle: currentLower.includes(t.theme.toLowerCase()),
    }))
    const gaps = themes.filter(t => !t.presentInArticle && t.frequency >= 3)
    return { ...cached, themes, gaps }
  }

  log.info(`Analyzing content gap for "${keyword}"`)
  const totalStart = Date.now()

  const searchResults = await searchWithTavily(keyword)
  log.debug(`Tavily returned ${searchResults.length} results for "${keyword}"`)

  const analysis = await analyzeCompetitorContent(keyword, searchResults)

  const avgWordCount =
    analysis.competitors.length > 0
      ? Math.round(
          analysis.competitors.reduce((sum, c) => sum + (c.wordCount || 0), 0) /
            analysis.competitors.length,
        )
      : 0

  const currentLower = (currentContent ?? '').toLowerCase()
  const themes: ThematicGap[] = analysis.themes.map((t) => ({
    ...t,
    presentInArticle: currentLower.includes(t.theme.toLowerCase()),
  }))
  const gaps = themes.filter((t) => !t.presentInArticle && t.frequency >= 3)

  log.info('Content gap analysis done', { keyword, competitors: analysis.competitors.length, themes: themes.length, gaps: gaps.length, avgWordCount, ms: Date.now() - totalStart })

  const result: ContentGapAnalysis = {
    keyword,
    competitors: analysis.competitors,
    themes,
    gaps,
    averageWordCount: avgWordCount,
    localEntitiesFromCompetitors: analysis.localEntities,
    cachedAt: new Date().toISOString(),
  }

  // Persist cross-article without the article-specific flags (themes stored with
  // presentInArticle set from the current call; next caller will recompute anyway).
  try { await upsertKeywordContentGap(keyword, result) }
  catch (err) { log.warn(`Content gap: DB persist failed — ${(err as Error).message}`) }

  return result
}
