import { join } from 'path'
import { readJson } from '../utils/json-storage.js'
import { rawArticlesDbSchema } from '../../shared/schemas/article.schema.js'
import { rawKeywordsDbSchema } from '../../shared/schemas/keyword.schema.js'
import type {
  RawArticle,
  RawArticlesDb,
  RawKeywordsDb,
  Article,
  Cocoon,
  CocoonStats,
  CountByType,
  CountByStatus,
  Keyword,
} from '../../shared/types/index.js'

const DATA_DIR = join(process.cwd(), 'data')

let cachedCocoons: Cocoon[] | null = null
let cachedKeywords: Keyword[] | null = null

/** Extract short slug from full URL */
function extractSlug(url: string): string {
  const parts = url.split('/pages/')
  return parts[1] || url
}

/** Convert a RawArticle to an Article (snake_case → camelCase) */
function mapArticle(raw: RawArticle): Article {
  return {
    title: raw.titre,
    type: raw.type,
    slug: extractSlug(raw.slug),
    theme: raw.theme,
    status: 'à rédiger',
  }
}

/** Compute stats for a list of articles */
function computeStats(articles: Article[]): CocoonStats {
  const byType: CountByType = { pilier: 0, intermediaire: 0, specialise: 0 }
  const byStatus: CountByStatus = { aRediger: 0, brouillon: 0, publie: 0 }

  for (const a of articles) {
    if (a.type === 'Pilier') byType.pilier++
    else if (a.type === 'Intermédiaire') byType.intermediaire++
    else byType.specialise++

    if (a.status === 'à rédiger') byStatus.aRediger++
    else if (a.status === 'brouillon') byStatus.brouillon++
    else byStatus.publie++
  }

  const completionPercent = articles.length > 0
    ? Math.round(((byStatus.brouillon + byStatus.publie) / articles.length) * 100)
    : 0

  return {
    totalArticles: articles.length,
    byType,
    byStatus,
    completionPercent,
  }
}

/** Load and validate the articles database, return cocoons with stats */
export async function loadArticlesDb(): Promise<Cocoon[]> {
  if (cachedCocoons) return cachedCocoons

  const raw = await readJson<RawArticlesDb>(join(DATA_DIR, 'BDD_Articles_Blog.json'))
  rawArticlesDbSchema.parse(raw)

  cachedCocoons = raw.cocons_semantiques.map((cocoon, index) => {
    const articles = cocoon.articles.map(mapArticle)
    return {
      id: index,
      name: cocoon.nom,
      articles,
      stats: computeStats(articles),
    }
  })

  return cachedCocoons
}

/** Load and validate the keywords database */
export async function loadKeywordsDb(): Promise<Keyword[]> {
  if (cachedKeywords) return cachedKeywords

  const raw = await readJson<RawKeywordsDb>(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'))
  rawKeywordsDbSchema.parse(raw)

  cachedKeywords = raw.seo_data.map((kw) => ({
    keyword: kw.mot_clef,
    cocoonName: kw.cocon_seo,
    type: kw.type_mot_clef,
  }))

  return cachedKeywords
}

/** Get all cocoons with statistics */
export async function getCocoons(): Promise<Cocoon[]> {
  return loadArticlesDb()
}

/** Get articles for a specific cocoon by index */
export async function getArticlesByCocoon(cocoonIndex: number): Promise<Article[] | null> {
  const cocoons = await loadArticlesDb()
  const cocoon = cocoons[cocoonIndex]
  return cocoon ? cocoon.articles : null
}

/** Get keywords for a specific cocoon by name */
export async function getKeywordsByCocoon(cocoonName: string): Promise<Keyword[] | null> {
  const allKeywords = await loadKeywordsDb()
  const filtered = allKeywords.filter((kw) => kw.cocoonName === cocoonName)
  return filtered.length > 0 ? filtered : null
}

/** Get a single article by slug, with its cocoon name */
export async function getArticleBySlug(slug: string): Promise<{ article: Article; cocoonName: string } | null> {
  const cocoons = await loadArticlesDb()
  for (const cocoon of cocoons) {
    const article = cocoon.articles.find(a => a.slug === slug)
    if (article) {
      return { article, cocoonName: cocoon.name }
    }
  }
  return null
}

/** Reset caches (useful for testing) */
export function resetCache(): void {
  cachedCocoons = null
  cachedKeywords = null
}
