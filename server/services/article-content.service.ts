import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { log } from '../utils/logger.js'
import { getArticleById } from './data.service.js'
import type { ArticleContent } from '../../shared/types/index.js'

const ARTICLES_DIR = join(process.cwd(), 'data', 'articles')

async function resolveArticlePath(id: number): Promise<string> {
  const result = await getArticleById(id)
  if (!result) throw new Error(`Article ${id} not found in BDD`)
  return join(ARTICLES_DIR, `${result.article.slug}.json`)
}

const DEFAULT_CONTENT: ArticleContent = {
  outline: null,
  content: null,
  metaTitle: null,
  metaDescription: null,
  seoScore: null,
  geoScore: null,
  updatedAt: null,
}

/** Parse stringified outline to object (backward compat for old JSON files) */
function normalizeOutline(outline: ArticleContent['outline']): ArticleContent['outline'] {
  if (typeof outline === 'string') {
    try { return JSON.parse(outline) } catch { return outline }
  }
  return outline
}

export async function getArticleContent(id: number): Promise<ArticleContent> {
  try {
    const data = await readJson<ArticleContent>(await resolveArticlePath(id))
    data.outline = normalizeOutline(data.outline)
    log.debug(`getArticleContent: loaded ${id}`)
    return data
  } catch {
    log.warn(`getArticleContent: ${id} not found, using defaults`)
    return { ...DEFAULT_CONTENT }
  }
}

export async function saveArticleContent(
  id: number,
  updates: Partial<ArticleContent>,
): Promise<ArticleContent> {
  // Normalize outline: always store as object, not stringified JSON
  if (updates.outline !== undefined) {
    updates.outline = normalizeOutline(updates.outline)
  }
  const existing = await getArticleContent(id)
  const merged: ArticleContent = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await writeJson(await resolveArticlePath(id), merged)
  log.debug(`saveArticleContent: ${id} saved`, { fields: Object.keys(updates) })
  return merged
}
