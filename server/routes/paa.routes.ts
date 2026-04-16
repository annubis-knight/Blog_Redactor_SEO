import { Router } from 'express'
import { z } from 'zod/v4'
import { log } from '../utils/logger.js'
import { fetchPaa } from '../services/external/dataforseo.service.js'
import type { PaaQuestion } from '../../shared/types/dataforseo.types.js'

const router = Router()

const paaBatchSchema = z.object({
  queries: z.array(z.string().min(1)).min(1).max(20),
})

/** Simple in-memory rate limiter: max 5 batch calls per 60s */
const PAA_RATE_WINDOW_MS = 60_000
const PAA_RATE_MAX = 5
let paaCalls: number[] = []

function checkPaaRateLimit(): boolean {
  const now = Date.now()
  paaCalls = paaCalls.filter(t => now - t < PAA_RATE_WINDOW_MS)
  if (paaCalls.length >= PAA_RATE_MAX) return false
  paaCalls.push(now)
  return true
}

/** POST /api/paa/batch */
router.post('/paa/batch', async (req, res) => {
  if (!checkPaaRateLimit()) {
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many PAA requests. Try again later.' } })
    return
  }
  try {
    const parsed = paaBatchSchema.parse(req.body)

    const results = await Promise.allSettled(
      parsed.queries.map(query => fetchPaa(query)),
    )

    const data: Record<string, PaaQuestion[]> = {}
    for (let i = 0; i < parsed.queries.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        data[parsed.queries[i]] = result.value
      } else {
        log.warn(`PAA fetch failed for query "${parsed.queries[i]}": ${result.reason}`)
        data[parsed.queries[i]] = []
      }
    }

    res.json({ data })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } })
      return
    }
    log.error(`POST /api/paa/batch — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch PAA batch' } })
  }
})

export default router
