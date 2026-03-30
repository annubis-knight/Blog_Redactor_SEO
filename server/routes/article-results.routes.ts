import { Router } from 'express'
import { join } from 'path'
import { log } from '../utils/logger.js'
import { readCached, slugify } from '../utils/cache.js'
import { getArticleKeywords } from '../services/data.service.js'

const router = Router()

const CACHE_DIR = join(process.cwd(), 'data', 'cache')
const AUTOCOMPLETE_CACHE_DIR = join(CACHE_DIR, 'autocomplete')

/**
 * GET /articles/:slug/cached-results
 *
 * Collects all cached analysis results for an article's main keyword (capitaine).
 * Returns null for any field that has no cache — NEVER calls external APIs.
 */
router.get('/articles/:slug/cached-results', async (req, res) => {
  const { slug } = req.params

  try {
    // Resolve slug → capitaine keyword
    const articleKeywords = await getArticleKeywords(slug)
    if (!articleKeywords || !articleKeywords.capitaine) {
      log.debug(`[article-results] No capitaine keyword for slug "${slug}"`)
      res.json({
        data: { intent: null, local: null, contentGap: null, autocomplete: null, comparison: null },
      })
      return
    }

    const keyword = articleKeywords.capitaine
    const key = slugify(keyword)
    log.debug(`[article-results] Loading cached results for "${slug}" (keyword: "${keyword}", key: "${key}")`)

    // Read all caches in parallel — readCached returns null on miss
    const [intent, local, contentGap, autocomplete, comparison] = await Promise.all([
      readCached(CACHE_DIR, `intent-${key}`),
      readCached(CACHE_DIR, `maps-${key}`),
      readCached(CACHE_DIR, `content-gap-${key}`),
      readCached(AUTOCOMPLETE_CACHE_DIR, key),
      readCached(CACHE_DIR, `local-national-${key}`),
    ])

    const result = {
      intent: intent?.data ?? null,
      local: local?.data ?? null,
      contentGap: contentGap?.data ?? null,
      autocomplete: autocomplete?.data ?? null,
      comparison: comparison?.data ?? null,
    }

    const hitCount = [result.intent, result.local, result.contentGap, result.autocomplete, result.comparison]
      .filter(Boolean).length
    log.info(`[article-results] Cached results for "${slug}": ${hitCount}/5 hits`)

    res.json({ data: result })
  } catch (err) {
    log.error(`GET /api/articles/${slug}/cached-results — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cached results' } })
  }
})

export default router
