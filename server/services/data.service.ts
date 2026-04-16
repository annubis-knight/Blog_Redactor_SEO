import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { log } from '../utils/logger.js'
import { rawArticlesDbSchema } from '../../shared/schemas/article.schema.js'
import { rawKeywordsDbSchema } from '../../shared/schemas/keyword.schema.js'
import { rawArticleKeywordsDbSchema } from '../../shared/schemas/article-keywords.schema.js'
import { microContextDbSchema } from '../../shared/schemas/article-micro-context.schema.js'
import { existsSync, renameSync } from 'fs'
import type {
  RawArticle,
  RawArticlesDb,
  RawKeywordsDb,
  RawCocoon,
  Article,
  ArticleType,
  ArticleStatus,
  ArticlePhase,
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
  ArticleProgress,
} from '../../shared/types/index.js'

const DATA_DIR = join(process.cwd(), 'data')
const BDD_FILE = join(DATA_DIR, 'BDD_Articles_Blog.json')
const ARTICLE_KEYWORDS_FILE = join(DATA_DIR, 'article-keywords.json')
const MICRO_CONTEXT_FILE = join(DATA_DIR, 'article-micro-context.json')

// Legacy files — migrated into BDD_Articles_Blog.json on first load
const LEGACY_PROGRESS_FILE = join(DATA_DIR, 'article-progress.json')
const LEGACY_STATUS_FILE = join(DATA_DIR, 'article-statuses.json')

let cachedCocoons: Cocoon[] | null = null
let cachedKeywords: Keyword[] | null = null
let cachedTheme: Theme | null = null
let cachedSilos: Silo[] | null = null
let cachedArticleKeywords: ArticleKeywords[] | null = null
let cachedMicroContexts: ArticleMicroContext[] | null = null
let migrationDone = false

/** Extract short slug from full URL */
function extractSlug(url: string): string {
  const parts = url.split('/pages/')
  return parts[1] || url
}

/** Convert a RawArticle to an Article (snake_case → camelCase) */
function mapArticle(raw: RawArticle): Article {
  return {
    id: raw.id,
    title: raw.titre,
    type: raw.type,
    slug: extractSlug(raw.slug),
    topic: raw.topic,
    status: raw.status ?? 'à rédiger',
    phase: raw.phase ?? 'proposed',
    completedChecks: raw.completedChecks ?? [],
    checkTimestamps: raw.checkTimestamps,
    suggestedKeyword: raw.suggestedKeyword ?? null,
    captainKeywordLocked: raw.captainKeywordLocked ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
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

/** One-time migration: merge article-progress.json + article-statuses.json into BDD_Articles_Blog.json */
async function migrateProgressAndStatuses(raw: RawArticlesDb): Promise<boolean> {
  if (migrationDone) return false
  migrationDone = true

  let changed = false

  // Build id → RawArticle and slug → RawArticle maps
  const idMap = new Map<number, RawArticle>()
  const slugMap = new Map<string, RawArticle>()
  for (const silo of raw.silos) {
    for (const cocoon of silo.cocons) {
      for (const a of cocoon.articles) {
        idMap.set(a.id, a)
        const simple = extractSlug(a.slug)
        slugMap.set(simple, a)
      }
    }
  }

  // Migrate article-progress.json
  if (existsSync(LEGACY_PROGRESS_FILE)) {
    try {
      const progressData = await readJson<Record<string, { phase?: ArticlePhase; completedChecks?: string[]; checkTimestamps?: Record<string, string> }>>(LEGACY_PROGRESS_FILE)
      let migratedCount = 0
      for (const [key, progress] of Object.entries(progressData)) {
        // Key can be numeric id or slug
        const numId = parseInt(key, 10)
        const article = !isNaN(numId) ? idMap.get(numId) : slugMap.get(key)
        if (article && progress) {
          if (!article.phase) article.phase = progress.phase ?? 'proposed'
          if (!article.completedChecks || article.completedChecks.length === 0) {
            article.completedChecks = progress.completedChecks ?? []
          }
          if (!article.checkTimestamps && progress.checkTimestamps) {
            article.checkTimestamps = progress.checkTimestamps
          }
          migratedCount++
        }
      }
      if (migratedCount > 0) {
        changed = true
        log.info(`Migration: ${migratedCount} entrées article-progress.json → BDD`)
      }
      renameSync(LEGACY_PROGRESS_FILE, LEGACY_PROGRESS_FILE + '.bak')
      log.info('Migration: article-progress.json renommé en .bak')
    } catch (err) {
      log.warn('Migration article-progress.json échouée', { error: (err as Error).message })
    }
  }

  // Migrate article-statuses.json
  if (existsSync(LEGACY_STATUS_FILE)) {
    try {
      const statusData = await readJson<Record<string, ArticleStatus>>(LEGACY_STATUS_FILE)
      let migratedCount = 0
      for (const [key, status] of Object.entries(statusData)) {
        const numId = parseInt(key, 10)
        const article = !isNaN(numId) ? idMap.get(numId) : slugMap.get(key)
        if (article && status) {
          article.status = status
          migratedCount++
        }
      }
      if (migratedCount > 0) {
        changed = true
        log.info(`Migration: ${migratedCount} entrées article-statuses.json → BDD`)
      }
      renameSync(LEGACY_STATUS_FILE, LEGACY_STATUS_FILE + '.bak')
      log.info('Migration: article-statuses.json renommé en .bak')
    } catch (err) {
      log.warn('Migration article-statuses.json échouée', { error: (err as Error).message })
    }
  }

  return changed
}

/** Load and validate the articles database, populate caches */
async function loadDb(): Promise<void> {
  if (cachedCocoons && cachedTheme && cachedSilos) {
    log.debug('loadDb() — cache hit, skip reload')
    return
  }

  log.info('Chargement BDD_Articles_Blog.json...')
  const raw = await readJson<RawArticlesDb>(BDD_FILE)
  rawArticlesDbSchema.parse(raw)

  // One-time migration from legacy files
  const migrated = await migrateProgressAndStatuses(raw)
  if (migrated) {
    await writeJson(BDD_FILE, raw)
    log.info('Migration: BDD_Articles_Blog.json mis à jour')
  }

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

/** Get a single article by id, with its cocoon name */
export async function getArticleById(id: number): Promise<{ article: Article; cocoonName: string } | null> {
  const cocoons = await loadArticlesDb()
  for (const cocoon of cocoons) {
    const article = cocoon.articles.find(a => a.id === id)
    if (article) return { article, cocoonName: cocoon.name }
  }
  return null
}

/** Get a single article by slug, with its cocoon name (for frontend slug→id lookup) */
export async function getArticleBySlug(slug: string): Promise<{ article: Article; cocoonName: string } | null> {
  const cocoons = await loadArticlesDb()
  for (const cocoon of cocoons) {
    const article = cocoon.articles.find(a => a.slug === slug)
    if (article) return { article, cocoonName: cocoon.name }
  }
  return null
}

/** Helper: find a raw article by id in the BDD file and mutate it */
async function mutateRawArticle(id: number, mutate: (article: RawArticle) => void): Promise<boolean> {
  const raw = await readJson<RawArticlesDb>(BDD_FILE)
  for (const silo of raw.silos) {
    for (const cocoon of silo.cocons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        mutate(article)
        await writeJson(BDD_FILE, raw)
        return true
      }
    }
  }
  return false
}

/** Update an article's status (persisted directly in BDD_Articles_Blog.json) */
export async function updateArticleStatus(id: number, status: ArticleStatus): Promise<void> {
  log.info('updateArticleStatus', { id, status })

  const found = await mutateRawArticle(id, article => {
    article.status = status
  })
  if (!found) {
    log.warn('updateArticleStatus — article introuvable', { id })
    return
  }

  // Update in-memory cache
  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        article.status = status
        cocoon.stats = computeStats(cocoon.articles)
        break
      }
    }
    // Recompute silo stats
    if (cachedSilos) {
      for (const silo of cachedSilos) {
        silo.stats = computeSiloStats(silo.cocons)
      }
    }
  }
}

/**
 * Update an article's suggestedKeyword (persisted directly in BDD_Articles_Blog.json).
 * Called at article-creation-from-proposal time (copies value from strategies/*.json).
 * Idempotent: a null value clears the field.
 */
export async function updateArticleSuggestedKeyword(id: number, suggestedKeyword: string | null): Promise<boolean> {
  log.info('updateArticleSuggestedKeyword', { id, suggestedKeyword })

  const found = await mutateRawArticle(id, article => {
    article.suggestedKeyword = suggestedKeyword
    article.updatedAt = new Date().toISOString()
  })
  if (!found) {
    log.warn('updateArticleSuggestedKeyword — article introuvable', { id })
    return false
  }

  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        article.suggestedKeyword = suggestedKeyword
        break
      }
    }
  }
  return true
}

/**
 * Update an article's captainKeywordLocked (persisted directly in BDD_Articles_Blog.json).
 * Called when the Capitaine is locked (keyword) or unlocked (null).
 * Acts as the canonical mirror of richCaptain.keyword for article-tree/recap-toggle displays —
 * avoids having to fetch article-keywords.json just to read one string per article.
 */
export async function updateArticleCaptainKeyword(id: number, captainKeyword: string | null): Promise<boolean> {
  log.info('updateArticleCaptainKeyword', { id, captainKeyword })

  const found = await mutateRawArticle(id, article => {
    article.captainKeywordLocked = captainKeyword
    article.updatedAt = new Date().toISOString()
  })
  if (!found) {
    log.warn('updateArticleCaptainKeyword — article introuvable', { id })
    return false
  }

  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        article.captainKeywordLocked = captainKeyword
        break
      }
    }
  }
  return true
}

// --- Article Progress (integrated into BDD) ---

/** Get progress for an article */
export async function getArticleProgress(id: number): Promise<ArticleProgress | null> {
  const cocoons = await loadArticlesDb()
  for (const cocoon of cocoons) {
    const article = cocoon.articles.find(a => a.id === id)
    if (article) {
      return {
        phase: article.phase,
        completedChecks: article.completedChecks,
        checkTimestamps: article.checkTimestamps,
      }
    }
  }
  return null
}

/** Save full progress for an article */
export async function saveArticleProgress(id: number, progress: ArticleProgress): Promise<ArticleProgress> {
  log.debug(`saveArticleProgress: ${id} (phase=${progress.phase})`)

  await mutateRawArticle(id, article => {
    article.phase = progress.phase
    article.completedChecks = progress.completedChecks
    if (progress.checkTimestamps) article.checkTimestamps = progress.checkTimestamps
  })

  // Update in-memory cache
  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        article.phase = progress.phase
        article.completedChecks = progress.completedChecks
        if (progress.checkTimestamps) article.checkTimestamps = progress.checkTimestamps
        break
      }
    }
  }

  return progress
}

/** Add a workflow check to an article */
export async function addArticleCheck(id: number, check: string): Promise<ArticleProgress> {
  await loadDb()

  // Find current state from cache
  let current: ArticleProgress = { phase: 'proposed', completedChecks: [], checkTimestamps: {} }
  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        current = {
          phase: article.phase,
          completedChecks: [...article.completedChecks],
          checkTimestamps: { ...article.checkTimestamps },
        }
        break
      }
    }
  }

  if (!current.completedChecks.includes(check)) {
    current.completedChecks.push(check)
    if (!current.checkTimestamps) current.checkTimestamps = {}
    current.checkTimestamps[check] = new Date().toISOString()
    log.debug(`addArticleCheck: added "${check}" for ${id}`)
  }

  await mutateRawArticle(id, article => {
    article.completedChecks = current.completedChecks
    article.checkTimestamps = current.checkTimestamps
    article.phase = current.phase
  })

  // Update in-memory cache
  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        article.completedChecks = current.completedChecks
        article.checkTimestamps = current.checkTimestamps
        article.phase = current.phase
        break
      }
    }
  }

  return current
}

/** Remove a workflow check from an article */
export async function removeArticleCheck(id: number, check: string): Promise<ArticleProgress> {
  await loadDb()

  let current: ArticleProgress = { phase: 'proposed', completedChecks: [], checkTimestamps: {} }
  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        current = {
          phase: article.phase,
          completedChecks: [...article.completedChecks],
          checkTimestamps: { ...article.checkTimestamps },
        }
        break
      }
    }
  }

  current.completedChecks = current.completedChecks.filter(c => c !== check)
  if (current.checkTimestamps) {
    delete current.checkTimestamps[check]
  }
  log.debug(`removeArticleCheck: removed "${check}" for ${id}`)

  await mutateRawArticle(id, article => {
    article.completedChecks = current.completedChecks
    article.checkTimestamps = current.checkTimestamps
    article.phase = current.phase
  })

  // Update in-memory cache
  if (cachedCocoons) {
    for (const cocoon of cachedCocoons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        article.completedChecks = current.completedChecks
        article.checkTimestamps = current.checkTimestamps
        article.phase = current.phase
        break
      }
    }
  }

  return current
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

/** Strip verbose KPI fields down to { name, rawValue } */
function stripKpis(kpis: { name: string; rawValue: number; [k: string]: unknown }[]): { name: string; rawValue: number }[] {
  return kpis.map(({ name, rawValue }) => ({ name, rawValue }))
}

/** Clean up rich data: strip verbose KPI fields and remove deprecated verdict/count fields */
function cleanRichData(entry: ArticleKeywords): void {
  if (entry.richCaptain) {
    // Dedup validationHistory by keyword (keep last occurrence)
    const seen = new Map<string, number>()
    const history = entry.richCaptain.validationHistory as unknown as Record<string, unknown>[]
    for (let i = 0; i < history.length; i++) {
      const kw = history[i].keyword as string
      if (seen.has(kw)) history[seen.get(kw)!] = null as any
      seen.set(kw, i)
    }
    entry.richCaptain.validationHistory = history.filter(Boolean) as any

    for (const v of entry.richCaptain.validationHistory as unknown as Record<string, unknown>[]) {
      if (Array.isArray(v.kpis) && v.kpis.length > 0 && 'color' in v.kpis[0]) {
        v.kpis = stripKpis(v.kpis)
      }
      delete v.verdict
      delete v.greenCount
      delete v.totalKpis
      delete v.timestamp
    }
  }
  if (entry.richRootKeywords) {
    for (const r of entry.richRootKeywords as unknown as Record<string, unknown>[]) {
      if (Array.isArray(r.kpis) && r.kpis.length > 0 && 'color' in r.kpis[0]) {
        r.kpis = stripKpis(r.kpis)
      }
      delete r.verdict
      delete r.greenCount
      delete r.totalKpis
    }
  }
}

/** Migrate old flat-only article keywords to enriched format (idempotent) */
function migrateArticleKeywords(entry: ArticleKeywords): ArticleKeywords {
  cleanRichData(entry)
  if (entry.richCaptain) return entry // already migrated

  if (entry.capitaine) {
    entry.richCaptain = {
      keyword: entry.capitaine,
      status: 'locked',
      validationHistory: [],
      aiPanelMarkdown: null,
      lockedAt: null,
    }
  }

  if (!entry.richRootKeywords) {
    entry.richRootKeywords = []
  }

  if (!entry.richLieutenants && entry.lieutenants.length > 0) {
    entry.richLieutenants = entry.lieutenants.map(kw => ({
      keyword: kw,
      status: 'locked' as const,
      reasoning: '',
      sources: [],
      aiConfidence: 'fort' as const,
      suggestedHnLevel: 2 as const,
      score: 0,
      kpis: null,
      lockedAt: null,
    }))
  }

  return entry
}

/** Get article keywords by id */
export async function getArticleKeywords(id: number): Promise<ArticleKeywords | null> {
  const all = await loadArticleKeywords()
  const entry = all.find(ak => ak.articleId === id) ?? null
  return entry ? migrateArticleKeywords(entry) : null
}

/** Save article keywords for an article id */
export async function saveArticleKeywords(id: number, data: Omit<ArticleKeywords, 'articleId'>): Promise<ArticleKeywords> {
  const all = await loadArticleKeywords()
  const existing = all.findIndex(ak => ak.articleId === id)
  const entry: ArticleKeywords = { articleId: id, ...data }

  if (existing >= 0) {
    all[existing] = entry
  } else {
    all.push(entry)
  }

  await writeJson(ARTICLE_KEYWORDS_FILE, { keywords_par_article: all })
  cachedArticleKeywords = all

  // Mirror captain lock state into BDD (canonical source for recap-toggle).
  // - locked → write richCaptain.keyword
  // - any other status (or no richCaptain) → null
  // This avoids a second fetch against article-keywords.json for display purposes.
  const mirrored = entry.richCaptain?.status === 'locked' ? entry.richCaptain.keyword ?? null : null
  await updateArticleCaptainKeyword(id, mirrored).catch(err => {
    log.warn('saveArticleKeywords — mirror captainKeyword failed', { id, error: (err as Error).message })
  })

  return entry
}

/** Get all article keywords for articles in a cocoon */
export async function getArticleKeywordsByCocoon(cocoonName: string): Promise<ArticleKeywords[]> {
  const cocoons = await getCocoons()
  const cocoon = cocoons.find(c => c.name === cocoonName)
  if (!cocoon) return []
  const ids = cocoon.articles.map(a => a.id)
  const all = await loadArticleKeywords()
  return all.filter(ak => ids.includes(ak.articleId))
}

/** Get all lieutenants already assigned to sibling articles in the same cocoon (anti-cannibalization) */
export async function getCocoonExistingLieutenants(id: number): Promise<string[]> {
  const found = await getArticleById(id)
  if (!found) return []
  const siblingKeywords = await getArticleKeywordsByCocoon(found.cocoonName)
  return siblingKeywords
    .filter(ak => ak.articleId !== id)
    .flatMap(ak => ak.lieutenants ?? [])
}

/** Add a new empty cocoon to a silo in BDD_Articles_Blog.json */
export async function addCocoonToSilo(
  siloName: string,
  cocoonName: string,
): Promise<Cocoon> {
  const raw = await readJson<RawArticlesDb>(BDD_FILE)

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

  await writeJson(BDD_FILE, raw)
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
  articles: { title: string; type: ArticleType; slug?: string; suggestedKeyword?: string | null }[],
): Promise<Article[]> {
  const raw = await readJson<RawArticlesDb>(BDD_FILE)

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

  // Collect all existing article IDs from raw data
  const allRawIds: number[] = []
  for (const silo of raw.silos) {
    for (const cocoon of silo.cocons) {
      for (const a of cocoon.articles) {
        allRawIds.push(a.id)
      }
    }
  }

  const existingSlugs = new Set(targetCocoon.articles.map(a => extractSlug(a.slug)))
  const created: Article[] = []
  let nextIdCounter = allRawIds.length > 0 ? Math.max(...allRawIds) : 0

  for (const article of articles) {
    const slug = article.slug?.trim() || article.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (existingSlugs.has(slug)) continue

    nextIdCounter++
    const now = new Date().toISOString()
    const rawArticle: RawArticle = {
      id: nextIdCounter,
      titre: article.title,
      type: article.type,
      slug,
      topic: null,
      suggestedKeyword: article.suggestedKeyword ?? null,
      createdAt: now,
      updatedAt: now,
    }
    targetCocoon.articles.push(rawArticle)
    existingSlugs.add(slug)
    created.push(mapArticle(rawArticle))
  }

  if (created.length > 0) {
    await writeJson(BDD_FILE, raw)
    cachedCocoons = null
    cachedSilos = null
    cachedTheme = null
    log.info('addArticlesToCocoon — articles ajoutés', { cocoonName, count: created.length })
  }

  return created
}

/** Update an article's title/slug in its cocoon (identified by id) */
export async function updateArticleInCocoon(id: number, updates: { title?: string; slug?: string }): Promise<boolean> {
  const raw = await readJson<RawArticlesDb>(BDD_FILE)

  for (const silo of raw.silos) {
    for (const cocoon of silo.cocons) {
      const article = cocoon.articles.find(a => a.id === id)
      if (article) {
        if (updates.title !== undefined) article.titre = updates.title
        if (updates.slug !== undefined) article.slug = updates.slug
        article.updatedAt = new Date().toISOString()
        await writeJson(BDD_FILE, raw)
        cachedCocoons = null
        cachedSilos = null
        cachedTheme = null
        log.info('updateArticleInCocoon — article mis à jour', { id, updates })
        return true
      }
    }
  }

  log.warn('updateArticleInCocoon — id introuvable', { id })
  return false
}

/** Remove an article from its cocoon by id */
export async function removeArticleFromCocoon(id: number): Promise<boolean> {
  const raw = await readJson<RawArticlesDb>(BDD_FILE)

  for (const silo of raw.silos) {
    for (const cocoon of silo.cocons) {
      const idx = cocoon.articles.findIndex(a => a.id === id)
      if (idx !== -1) {
        cocoon.articles.splice(idx, 1)
        await writeJson(BDD_FILE, raw)
        cachedCocoons = null
        cachedSilos = null
        cachedTheme = null
        log.info('removeArticleFromCocoon — article supprimé', { id })
        return true
      }
    }
  }

  log.warn('removeArticleFromCocoon — id introuvable', { id })
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
export async function loadArticleMicroContext(id: number): Promise<ArticleMicroContext | null> {
  const all = await loadMicroContexts()
  return all.find(mc => mc.id === id) ?? null
}

/** Save micro-context for an article */
export async function saveArticleMicroContext(id: number, data: Omit<ArticleMicroContext, 'id'>): Promise<ArticleMicroContext> {
  const all = await loadMicroContexts()
  const existing = all.findIndex(mc => mc.id === id)
  const entry: ArticleMicroContext = { id, ...data }

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
  cachedTheme = null
  cachedSilos = null
  cachedArticleKeywords = null
  cachedMicroContexts = null
  migrationDone = false
}
