import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { log } from '../utils/logger.js'
import type { ArticleContent } from '../../shared/types/index.js'

const ARTICLES_DIR = join(process.cwd(), 'data', 'articles')

function articlePath(slug: string): string {
  return join(ARTICLES_DIR, `${slug}.json`)
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

export async function getArticleContent(slug: string): Promise<ArticleContent> {
  try {
    const data = await readJson<ArticleContent>(articlePath(slug))
    log.debug(`getArticleContent: loaded ${slug}`)
    return data
  } catch {
    log.warn(`getArticleContent: ${slug} not found, using defaults`)
    return { ...DEFAULT_CONTENT }
  }
}

export async function saveArticleContent(
  slug: string,
  updates: Partial<ArticleContent>,
): Promise<ArticleContent> {
  const existing = await getArticleContent(slug)
  const merged: ArticleContent = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await writeJson(articlePath(slug), merged)
  log.debug(`saveArticleContent: ${slug} saved`, { fields: Object.keys(updates) })
  return merged
}
