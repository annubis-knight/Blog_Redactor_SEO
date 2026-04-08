import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { log } from '../utils/logger.js'
import { rawArticlesDbSchema } from '../../shared/schemas/article.schema.js'
import { rawKeywordsDbSchema } from '../../shared/schemas/keyword.schema.js'
import { rawArticleKeywordsDbSchema } from '../../shared/schemas/article-keywords.schema.js'
import { microContextDbSchema } from '../../shared/schemas/article-micro-context.schema.js'
import type {
  RawArticle,
  RawArticlesDb,
  RawKeywordsDb,
  RawCocoon,
  Article,
  ArticleType,
  ArticleStatus,
  ArticleKeywords,
  RawArticleKeywordsDb,
  Cocoon,
  CocoonStats,
  CountByType,
  CountByStatus,
  Keyword,
  KeywordStatus,
  Theme,
  Silo,
  SiloStats,
  ArticleMicroContext,
} from '../../shared/types/index.js'

const DATA_DIR = join(process.cwd(), 'data')
const STATUS_FILE = join(DATA_DIR, 'article-statuses.json')
const ARTICLE_KEYWORDS_FILE = join(DATA_DIR, 'article-keywords.json')
const MICRO_CONTEXT_FILE = join(DATA_DIR, 'article-micro-context.json')

let cachedCocoons: Cocoon[] | null = null
let cachedKeywords: Keyword[] | null = null
let cachedStatuses: Record<string, ArticleStatus> | null = null
let cachedTheme: Theme | null = null
let cachedSilos: Silo[] | null = null
let cachedArticleKeywords: ArticleKeywords[] | null = null
let cachedMicroContexts: ArticleMicroContext[] | null = null

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
    topic: raw.topic,
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

/** Compute aggregated silo stats from its cocoons */
function computeSiloStats(cocoons: Cocoon[]): SiloStats {
  const allArticles = cocoons.flatMap(c => c.articles)
  const base = computeStats(allArticles)
  return {
    totalArticles: base.totalArticles,
    byType: base.byType,
    byStatus: base.byStatus,
    completionPercent: base.completionPercent,
  }
}

/** Load and validate the articles database, populate caches */
async function loadDb(): Promise<void> {
  if (cachedCocoons && cachedTheme && cachedSilos) {
    log.debug('loadDb() — cache hit, skip reload')
    return
  }

  log.info('Chargement BDD_Articles_Blog.json...')
  const raw = await readJson<RawArticlesDb>(join(DATA_DIR, 'BDD_Articles_Blog.json'))
  rawArticlesDbSchema.parse(raw)

  cachedTheme = {
    nom: raw.theme.nom,
    description: raw.theme.description,
  }

  let globalCocoonIndex = 0
  const allCocoons: Cocoon[] = []
  const silos: Silo[] = []

  for (let siloIdx = 0; siloIdx < raw.silos.length; siloIdx++) {
    const rawSilo = raw.silos[siloIdx]!
    const siloCocoons: Cocoon[] = []

    for (const rawCocoon of rawSilo.cocons) {
      const articles = rawCocoon.articles.map(mapArticle)
      const cocoon: Cocoon = {
        id: globalCocoonIndex++,
        name: rawCocoon.nom,
        siloName: rawSilo.nom,
        articles,
        stats: computeStats(articles),
      }
      siloCocoons.push(cocoon)
      allCocoons.push(cocoon)
    }

    silos.push({
      id: siloIdx,
      nom: rawSilo.nom,
      description: rawSilo.description,
      cocons: siloCocoons,
      stats: computeSiloStats(siloCocoons),
    })
  }

  cachedCocoons = allCocoons
  cachedSilos = silos

  log.info('BDD chargée', { silos: silos.length, cocoons: allCocoons.length, articles: allCocoons.reduce((s, c) => s + c.articles.length, 0) })

  await applyStatusOverrides(cachedCocoons)
  // Recompute silo stats after status overrides
  for (const silo of cachedSilos) {
    silo.stats = computeSiloStats(silo.cocons)
  }
}

/** Load and validate the articles database, return cocoons with stats */
export async function loadArticlesDb(): Promise<Cocoon[]> {
  await loadDb()
  return cachedCocoons!
}

/** Load and validate the keywords database */
export async function loadKeywordsDb(): Promise<Keyword[]> {
  if (cachedKeywords) {
    log.debug('loadKeywordsDb() — cache hit')
    return cachedKeywords
  }

  log.info('Chargement BDD_Mots_Clefs_SEO.json...')
  const raw = await readJson<RawKeywordsDb>(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'))
  rawKeywordsDbSchema.parse(raw)

  cachedKeywords = raw.seo_data.map((kw) => ({
    keyword: kw.mot_clef,
    cocoonName: kw.cocon_seo,
    type: kw.type_mot_clef,
    status: kw.statut ?? 'suggested',
  }))

  log.info('Keywords chargés', { count: cachedKeywords.length })
  return cachedKeywords
}

/** Get the blog theme */
export async function getTheme(): Promise<Theme> {
  await loadDb()
  return cachedTheme!
}

/** Get all silos with their cocoons and stats */
export async function getSilos(): Promise<Silo[]> {
  await loadDb()
  return cachedSilos!
}

/** Get a silo by name */
export async function getSiloByName(name: string): Promise<Silo | null> {
  const silos = await getSilos()
  return silos.find(s => s.nom === name) ?? null
}

/** Get cocoons belonging to a specific silo */
export async function getCocoonsBySilo(siloName: string): Promise<Cocoon[]> {
  const silo = await getSiloByName(siloName)
  return silo ? silo.cocons : []
}

/** Get all cocoons with statistics (flattened from silos) */
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

/** Load article status overrides from disk */
async function loadStatuses(): Promise<Record<string, ArticleStatus>> {
  if (cachedStatuses) return cachedStatuses
  try {
    cachedStatuses = await readJson<Record<string, ArticleStatus>>(STATUS_FILE)
  } catch {
    cachedStatuses = {}
  }
  return cachedStatuses
}

/** Update an article's status (persisted in article-statuses.json) */
export async function updateArticleStatus(slug: string, status: ArticleStatus): Promise<void> {
  log.info('updateArticleStatus', { slug, status })
  const statuses = await loadStatuses()
  statuses[slug] = status
  await writeJson(STATUS_FILE, statuses)
  cachedStatuses = statuses

  // Invalidate caches so stats are recalculated
  cachedCocoons = null
  cachedSilos = null
  cachedTheme = null
}

/** Apply status overrides to articles loaded from BDD */
async function applyStatusOverrides(cocoons: Cocoon[]): Promise<void> {
  const statuses = await loadStatuses()
  for (const cocoon of cocoons) {
    for (const article of cocoon.articles) {
      const override = statuses[article.slug]
      if (override) {
        article.status = override
      }
    }
    // Recompute stats with updated statuses
    cocoon.stats = computeStats(cocoon.articles)
  }
}

/** Add a keyword to the database (rejects duplicates) */
export async function addKeyword(keyword: Keyword): Promise<{ success: boolean; duplicate?: boolean }> {
  const raw = await readJson<RawKeywordsDb>(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'))
  const exists = raw.seo_data.some(k => k.mot_clef.toLowerCase() === keyword.keyword.toLowerCase())
  if (exists) {
    log.warn('addKeyword — doublon détecté', { keyword: keyword.keyword })
    return { success: false, duplicate: true }
  }
  raw.seo_data.push({
    mot_clef: keyword.keyword,
    cocon_seo: keyword.cocoonName,
    type_mot_clef: keyword.type,
    statut: keyword.status ?? 'suggested',
  })
  await writeJson(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'), raw)
  cachedKeywords = null
  log.info('addKeyword — succès', { keyword: keyword.keyword, cocoon: keyword.cocoonName })
  return { success: true }
}

/** Replace a keyword in the database */
export async function replaceKeyword(oldKeyword: string, newKeyword: Keyword): Promise<boolean> {
  const raw = await readJson<RawKeywordsDb>(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'))
  const idx = raw.seo_data.findIndex(k => k.mot_clef === oldKeyword)
  if (idx === -1) return false
  raw.seo_data[idx] = {
    mot_clef: newKeyword.keyword,
    cocon_seo: newKeyword.cocoonName,
    type_mot_clef: newKeyword.type,
    statut: newKeyword.status ?? 'suggested',
  }
  await writeJson(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'), raw)
  cachedKeywords = null
  return true
}

/** Update a keyword's validation status */
export async function updateKeywordStatus(keywordText: string, status: KeywordStatus): Promise<boolean> {
  const raw = await readJson<RawKeywordsDb>(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'))
  const entry = raw.seo_data.find(k => k.mot_clef === keywordText)
  if (!entry) return false
  entry.statut = status
  await writeJson(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'), raw)
  cachedKeywords = null
  return true
}

/** Delete a keyword from the database */
export async function deleteKeyword(keywordText: string): Promise<boolean> {
  const raw = await readJson<RawKeywordsDb>(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'))
  const idx = raw.seo_data.findIndex(k => k.mot_clef === keywordText)
  if (idx === -1) return false
  raw.seo_data.splice(idx, 1)
  await writeJson(join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'), raw)
  cachedKeywords = null
  return true
}

/** Load all article keywords */
async function loadArticleKeywords(): Promise<ArticleKeywords[]> {
  if (cachedArticleKeywords) return cachedArticleKeywords
  try {
    const raw = await readJson<RawArticleKeywordsDb>(ARTICLE_KEYWORDS_FILE)
    rawArticleKeywordsDbSchema.parse(raw)
    cachedArticleKeywords = raw.keywords_par_article
  } catch {
    cachedArticleKeywords = []
  }
  return cachedArticleKeywords
}

/** Get article keywords by slug */
export async function getArticleKeywords(slug: string): Promise<ArticleKeywords | null> {
  const all = await loadArticleKeywords()
  return all.find(ak => ak.articleSlug === slug) ?? null
}

/** Save article keywords for a slug */
export async function saveArticleKeywords(slug: string, data: Omit<ArticleKeywords, 'articleSlug'>): Promise<ArticleKeywords> {
  const all = await loadArticleKeywords()
  const existing = all.findIndex(ak => ak.articleSlug === slug)
  const entry: ArticleKeywords = { articleSlug: slug, ...data }

  if (existing >= 0) {
    all[existing] = entry
  } else {
    all.push(entry)
  }

  await writeJson(ARTICLE_KEYWORDS_FILE, { keywords_par_article: all })
  cachedArticleKeywords = all
  return entry
}

/** Get all article keywords for articles in a cocoon */
export async function getArticleKeywordsByCocoon(cocoonName: string): Promise<ArticleKeywords[]> {
  const cocoons = await getCocoons()
  const cocoon = cocoons.find(c => c.name === cocoonName)
  if (!cocoon) return []
  const slugs = cocoon.articles.map(a => a.slug)
  const all = await loadArticleKeywords()
  return all.filter(ak => slugs.includes(ak.articleSlug))
}

/** Get all lieutenants already assigned to sibling articles in the same cocoon (anti-cannibalization) */
export async function getCocoonExistingLieutenants(articleSlug: string): Promise<string[]> {
  const found = await getArticleBySlug(articleSlug)
  if (!found) return []
  const siblingKeywords = await getArticleKeywordsByCocoon(found.cocoonName)
  return siblingKeywords
    .filter(ak => ak.articleSlug !== articleSlug)
    .flatMap(ak => ak.lieutenants ?? [])
}

/** Add a new empty cocoon to a silo in BDD_Articles_Blog.json */
export async function addCocoonToSilo(
  siloName: string,
  cocoonName: string,
): Promise<Cocoon> {
  const raw = await readJson<RawArticlesDb>(join(DATA_DIR, 'BDD_Articles_Blog.json'))

  const silo = raw.silos.find(s => s.nom === siloName)
  if (!silo) {
    log.error('addCocoonToSilo — silo introuvable', { siloName })
    throw new Error(`Silo "${siloName}" not found`)
  }

  if (silo.cocons.some(c => c.nom === cocoonName)) {
    log.warn('addCocoonToSilo — cocoon déjà existant', { cocoonName, siloName })
    throw new Error(`Cocoon "${cocoonName}" already exists in silo "${siloName}"`)
  }

  const newCocoon: RawCocoon = { nom: cocoonName, articles: [] }
  silo.cocons.push(newCocoon)

  await writeJson(join(DATA_DIR, 'BDD_Articles_Blog.json'), raw)
  cachedCocoons = null
  cachedSilos = null
  cachedTheme = null

  const emptyStats: CocoonStats = {
    totalArticles: 0,
    byType: { pilier: 0, intermediaire: 0, specialise: 0 },
    byStatus: { aRediger: 0, brouillon: 0, publie: 0 },
    completionPercent: 0,
  }

  // Compute an id consistent with how getSilos works (flat cocoon index)
  const allCocoons = raw.silos.flatMap(s => s.cocons)
  const id = allCocoons.indexOf(newCocoon)

  log.info('addCocoonToSilo — succès', { cocoonName, siloName, id })
  return { id, name: cocoonName, siloName, articles: [], stats: emptyStats }
}

/** Add articles to a cocoon in BDD_Articles_Blog.json */
export async function addArticlesToCocoon(
  cocoonName: string,
  articles: { title: string; type: ArticleType; slug?: string }[],
): Promise<Article[]> {
  const raw = await readJson<RawArticlesDb>(join(DATA_DIR, 'BDD_Articles_Blog.json'))

  // Find the cocoon in the raw data
  let targetCocoon: RawCocoon | null = null
  for (const silo of raw.silos) {
    const found = silo.cocons.find(c => c.nom === cocoonName)
    if (found) {
      targetCocoon = found
      break
    }
  }
  if (!targetCocoon) {
    log.error('addArticlesToCocoon — cocoon introuvable', { cocoonName })
    throw new Error(`Cocoon "${cocoonName}" not found`)
  }

  const existingSlugs = new Set(targetCocoon.articles.map(a => extractSlug(a.slug)))
  const created: Article[] = []

  for (const article of articles) {
    const slug = article.slug?.trim() || article.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (existingSlugs.has(slug)) continue

    const rawArticle: RawArticle = {
      titre: article.title,
      type: article.type,
      slug,
      topic: null,
    }
    targetCocoon.articles.push(rawArticle)
    existingSlugs.add(slug)
    created.push(mapArticle(rawArticle))
  }

  if (created.length > 0) {
    await writeJson(join(DATA_DIR, 'BDD_Articles_Blog.json'), raw)
    cachedCocoons = null
    cachedSilos = null
    cachedTheme = null
    log.info('addArticlesToCocoon — articles ajoutés', { cocoonName, count: created.length })
  }

  return created
}

/** Update an article's title in its cocoon (identified by slug) */
export async function updateArticleInCocoon(slug: string, updates: { title?: string }): Promise<boolean> {
  const raw = await readJson<RawArticlesDb>(join(DATA_DIR, 'BDD_Articles_Blog.json'))

  for (const silo of raw.silos) {
    for (const cocoon of silo.cocons) {
      const article = cocoon.articles.find(a => extractSlug(a.slug) === slug)
      if (article) {
        if (updates.title !== undefined) article.titre = updates.title
        await writeJson(join(DATA_DIR, 'BDD_Articles_Blog.json'), raw)
        cachedCocoons = null
        cachedSilos = null
        cachedTheme = null
        log.info('updateArticleInCocoon — article mis à jour', { slug, updates })
        return true
      }
    }
  }

  log.warn('updateArticleInCocoon — slug introuvable', { slug })
  return false
}

/** Remove an article from its cocoon by slug */
export async function removeArticleFromCocoon(slug: string): Promise<boolean> {
  const raw = await readJson<RawArticlesDb>(join(DATA_DIR, 'BDD_Articles_Blog.json'))

  for (const silo of raw.silos) {
    for (const cocoon of silo.cocons) {
      const idx = cocoon.articles.findIndex(a => extractSlug(a.slug) === slug)
      if (idx !== -1) {
        cocoon.articles.splice(idx, 1)
        await writeJson(join(DATA_DIR, 'BDD_Articles_Blog.json'), raw)
        cachedCocoons = null
        cachedSilos = null
        cachedTheme = null
        log.info('removeArticleFromCocoon — article supprimé', { slug })
        return true
      }
    }
  }

  log.warn('removeArticleFromCocoon — slug introuvable', { slug })
  return false
}

// --- Micro-context ---

async function loadMicroContexts(): Promise<ArticleMicroContext[]> {
  if (cachedMicroContexts) return cachedMicroContexts
  try {
    const raw = await readJson<{ micro_contexts: ArticleMicroContext[] }>(MICRO_CONTEXT_FILE)
    microContextDbSchema.parse(raw)
    cachedMicroContexts = raw.micro_contexts
  } catch {
    cachedMicroContexts = []
  }
  return cachedMicroContexts
}

/** Get micro-context for a specific article */
export async function loadArticleMicroContext(slug: string): Promise<ArticleMicroContext | null> {
  const all = await loadMicroContexts()
  return all.find(mc => mc.slug === slug) ?? null
}

/** Save micro-context for an article */
export async function saveArticleMicroContext(slug: string, data: Omit<ArticleMicroContext, 'slug'>): Promise<ArticleMicroContext> {
  const all = await loadMicroContexts()
  const existing = all.findIndex(mc => mc.slug === slug)
  const entry: ArticleMicroContext = { slug, ...data }

  if (existing >= 0) {
    all[existing] = entry
  } else {
    all.push(entry)
  }

  await writeJson(MICRO_CONTEXT_FILE, { micro_contexts: all })
  cachedMicroContexts = all
  return entry
}

/** Reset caches (useful for testing) */
export function resetCache(): void {
  cachedCocoons = null
  cachedKeywords = null
  cachedStatuses = null
  cachedTheme = null
  cachedSilos = null
  cachedArticleKeywords = null
  cachedMicroContexts = null
}
