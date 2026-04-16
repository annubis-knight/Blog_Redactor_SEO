import { Router } from 'express'
import { log } from '../utils/logger.js'
import {
  getAuthUrl,
  exchangeCode,
  isConnected,
  queryPerformance,
  analyzeKeywordGap,
} from '../services/external/gsc.service.js'

const router = Router()

/** GET /api/gsc/status — Check if GSC is connected */
router.get('/gsc/status', async (_req, res) => {
  try {
    const connected = await isConnected()
    log.debug(`GSC status: ${connected ? 'connected' : 'disconnected'}`)
    res.json({ data: { connected } })
  } catch (err) {
    log.error(`GET /api/gsc/status — ${(err as Error).message}`)
    res.status(500).json({
      error: { code: 'GSC_ERROR', message: (err as Error).message },
    })
  }
})

/** GET /api/gsc/auth — Start OAuth2 flow */
router.get('/gsc/auth', (_req, res) => {
  try {
    log.info('GSC OAuth2 flow started')
    const url = getAuthUrl()
    res.redirect(url)
  } catch (err) {
    log.error(`GET /api/gsc/auth — ${(err as Error).message}`)
    res.status(500).json({
      error: { code: 'GSC_AUTH_ERROR', message: (err as Error).message },
    })
  }
})

/** GET /api/gsc/callback — OAuth2 callback */
router.get('/gsc/callback', async (req, res) => {
  const code = req.query.code as string
  if (!code) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'code is required' },
    })
    return
  }
  try {
    await exchangeCode(code)
    log.info('GSC OAuth2 connected successfully')
    res.send(
      '<html><body><h1>Google Search Console connecte !</h1><p>Vous pouvez fermer cette page.</p></body></html>',
    )
  } catch (err) {
    log.error(`GET /api/gsc/callback — ${(err as Error).message}`)
    res.status(500).json({
      error: { code: 'GSC_EXCHANGE_ERROR', message: (err as Error).message },
    })
  }
})

/** POST /api/gsc/performance — Query GSC performance data */
router.post('/gsc/performance', async (req, res) => {
  const { siteUrl, startDate, endDate, dimensions } = req.body ?? {}
  if (!siteUrl || !startDate || !endDate) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'siteUrl, startDate, endDate are required',
      },
    })
    return
  }

  log.info(`GSC performance query`, { siteUrl, startDate, endDate })
  try {
    const result = await queryPerformance(siteUrl, startDate, endDate, dimensions)
    log.info(`GSC performance done`, { rows: result.rows?.length ?? 0 })
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/gsc/performance — ${(err as Error).message}`)
    res.status(500).json({
      error: {
        code: 'GSC_PERFORMANCE_ERROR',
        message: (err as Error).message,
      },
    })
  }
})

/** POST /api/gsc/keyword-gap — Compare targeted vs actual keywords */
router.post('/gsc/keyword-gap', async (req, res) => {
  const { articleUrl, targetKeywords, siteUrl } = req.body ?? {}
  if (!articleUrl || !targetKeywords || !siteUrl) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'articleUrl, targetKeywords, siteUrl are required',
      },
    })
    return
  }

  log.info(`GSC keyword gap analysis`, { articleUrl, targetKeywords: targetKeywords.length })
  try {
    const result = await analyzeKeywordGap(articleUrl, targetKeywords, siteUrl)
    log.info(`GSC keyword gap done`, { matched: result.matched.length, notIndexed: result.targetedNotIndexed.length })
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/gsc/keyword-gap — ${(err as Error).message}`)
    res.status(500).json({
      error: { code: 'GSC_GAP_ERROR', message: (err as Error).message },
    })
  }
})

export default router
