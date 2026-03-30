import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { log } from '../utils/logger.js'
import type { ArticleProgress } from '../../shared/types/index.js'

const DATA_DIR = join(process.cwd(), 'data')
const PROGRESS_FILE = join(DATA_DIR, 'article-progress.json')

let cache: Record<string, ArticleProgress> | null = null

async function loadAll(): Promise<Record<string, ArticleProgress>> {
  if (cache) return cache
  try {
    cache = await readJson<Record<string, ArticleProgress>>(PROGRESS_FILE)
    log.debug(`articleProgress: loaded ${Object.keys(cache).length} entries from file`)
  } catch {
    log.debug('articleProgress: no file found, starting empty')
    cache = {}
  }
  return cache
}

export async function getProgress(slug: string): Promise<ArticleProgress | null> {
  const all = await loadAll()
  return all[slug] ?? null
}

export async function saveProgress(slug: string, progress: ArticleProgress): Promise<ArticleProgress> {
  const all = await loadAll()
  all[slug] = progress
  await writeJson(PROGRESS_FILE, all)
  cache = all
  log.debug(`articleProgress: saved ${slug} (phase=${progress.phase})`)
  return progress
}

export async function addCheck(slug: string, check: string): Promise<ArticleProgress> {
  const all = await loadAll()
  const existing = all[slug] ?? { phase: 'proposed' as const, completedChecks: [] }
  if (!existing.completedChecks.includes(check)) {
    existing.completedChecks.push(check)
    log.debug(`articleProgress: added check "${check}" for ${slug}`)
  }
  all[slug] = existing
  await writeJson(PROGRESS_FILE, all)
  cache = all
  return existing
}
