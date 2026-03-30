import { join } from 'path'
import { log } from '../utils/logger.js'
import { slugify } from './dataforseo.service.js'
import { getOrFetch } from '../utils/cache.js'
import Anthropic from '@anthropic-ai/sdk'
import type {
  ContentGapAnalysis,
  CompetitorContent,
  ThematicGap,
} from '../../shared/types/index.js'

const CACHE_DIR = join(process.cwd(), 'data', 'cache')

async function searchWithTavily(
  keyword: string,
): Promise<{ url: string; title: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY must be set in environment variables')

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

  if (!res.ok) throw new Error(`Tavily API error: ${res.status}`)
  const json = await res.json()

  return (json.results ?? []).map((r: any) => ({
    url: r.url ?? '',
    title: r.title ?? '',
    content: (r.raw_content ?? r.content ?? '').slice(0, 5000), // limit content size
  }))
}

async function analyzeCompetitorContent(
  keyword: string,
  contents: { url: string; title: string; content: string }[],
): Promise<{
  competitors: CompetitorContent[]
  themes: ThematicGap[]
  localEntities: { entity: string; frequency: number }[]
}> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

  const contentSummaries = contents
    .map(
      (c, i) =>
        `--- Concurrent ${i + 1}: ${c.title} (${c.url}) ---\n${c.content.slice(0, 2000)}`,
    )
    .join('\n\n')

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system:
      'Tu es un expert SEO specialise en analyse concurrentielle. Reponds UNIQUEMENT en JSON valide.',
    messages: [
      {
        role: 'user',
        content: `Analyse ces ${contents.length} contenus concurrents pour le mot-cle "${keyword}".

${contentSummaries}

Reponds en JSON:
{
  "competitors": [{"url":"...","headings":["H2: ...","H3: ..."],"wordCount":1500,"localEntities":["Toulouse","Capitole"],"publishDate":"2024-06-15","readabilityScore":65,"paasCovered":["question PAA trouvee dans le contenu"]}],
  "themes": [{"theme":"nom du theme","frequency":3}],
  "localEntities": [{"entity":"Toulouse","frequency":4}]
}

Pour les themes: identifie les sujets/sous-sujets couverts par au moins 2 concurrents.
Pour les entites locales: detecte mentions de quartiers, villes, entreprises, lieux de Toulouse/Occitanie.
Pour publishDate: extrait la date de publication ou derniere mise a jour si visible (format YYYY-MM-DD). Si absente, omets le champ.
Pour readabilityScore: estime un score de lisibilite 0-100 (0=tres difficile, 100=tres facile) base sur la longueur des phrases et la complexite du vocabulaire.
Pour paasCovered: liste les questions PAA (People Also Ask) auxquelles le contenu repond explicitement.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return { competitors: [], themes: [], localEntities: [] }
  }
}

export async function analyzeContentGap(
  keyword: string,
  currentContent?: string,
): Promise<ContentGapAnalysis> {
  return getOrFetch<ContentGapAnalysis>(
    CACHE_DIR,
    `content-gap-${slugify(keyword)}`,
    Infinity,
    async () => {
      log.info(`Analyzing content gap for "${keyword}"`)

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

      return {
        keyword,
        competitors: analysis.competitors,
        themes,
        gaps,
        averageWordCount: avgWordCount,
        localEntitiesFromCompetitors: analysis.localEntities,
        cachedAt: new Date().toISOString(),
      }
    },
  )
}
