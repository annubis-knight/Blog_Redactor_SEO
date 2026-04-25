import 'dotenv/config'
import express from 'express'
import { log } from './utils/logger.js'
import { pool } from './db/client.js'
import { errorHandler } from './utils/error-handler.js'
import cocoonRoutes from './routes/cocoons.routes.js'
import keywordRoutes from './routes/keywords.routes.js'
import articlesRoutes from './routes/articles.routes.js'
import dataforseoRoutes from './routes/dataforseo.routes.js'
import generateRoutes from './routes/generate.routes.js'
import linksRoutes from './routes/links.routes.js'
import exportRoutes from './routes/export.routes.js'
import intentRoutes from './routes/intent.routes.js'
import localRoutes from './routes/local.routes.js'
import contentGapRoutes from './routes/content-gap.routes.js'
import gscRoutes from './routes/gsc.routes.js'
import siloRoutes from './routes/silos.routes.js'
import strategyRoutes from './routes/strategy.routes.js'

import intentScanRoutes from './routes/intent-scan.routes.js'
import discoveryCacheRoutes from './routes/discovery-cache.routes.js'
import radarCacheRoutes from './routes/radar-cache.routes.js'
import radarExplorationRoutes from './routes/radar-exploration.routes.js'
import articleExplorationsRoutes from './routes/article-explorations.routes.js'
import keywordQueriesRoutes from './routes/keyword-queries.routes.js'
import keywordValidateRoutes from './routes/keyword-validate.routes.js'
import keywordAiPanelRoutes from './routes/keyword-ai-panel.routes.js'
import serpAnalysisRoutes from './routes/serp-analysis.routes.js'
import paaRoutes from './routes/paa.routes.js'

const app = express()
const PORT = process.env.PORT || 3005

// Middleware
app.use(express.json({ limit: '5mb' }))

// CORS — localhost only
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' } })
})

// API routes
app.use('/api', cocoonRoutes)
app.use('/api', keywordRoutes)
app.use('/api', articlesRoutes)
app.use('/api/dataforseo', dataforseoRoutes)
app.use('/api', generateRoutes)
app.use('/api', linksRoutes)
app.use('/api', exportRoutes)
app.use('/api', intentRoutes)
app.use('/api', localRoutes)
app.use('/api', contentGapRoutes)
app.use('/api', gscRoutes)
app.use('/api', siloRoutes)
app.use('/api', strategyRoutes)

app.use('/api', intentScanRoutes)
app.use('/api', discoveryCacheRoutes)
app.use('/api', radarCacheRoutes)
app.use('/api', radarExplorationRoutes)
app.use('/api', articleExplorationsRoutes)
app.use('/api', keywordQueriesRoutes)
app.use('/api', keywordValidateRoutes)
app.use('/api', keywordAiPanelRoutes)
app.use('/api', serpAnalysisRoutes)
app.use('/api', paaRoutes)

// Global error handler
app.use(errorHandler)

app.listen(PORT, () => {
  log.info(`Blog Redactor SEO API running on http://localhost:${PORT}`)
  log.debug('Registered routes', {
    routes: ['/api/cocoons', '/api/keywords', '/api/articles', '/api/dataforseo', '/api/generate', '/api/links', '/api/export', '/api/intent', '/api/local', '/api/content-gap', '/api/gsc', '/api/silos', '/api/theme', '/api/strategy'],
  })

  // Verify PostgreSQL connection
  pool.query('SELECT 1').then(() => {
    log.info('PostgreSQL connected')
  }).catch((err) => {
    log.error('PostgreSQL connection failed', {
      message: err.message || '(no message)',
      code: err.code,
      errno: err.errno,
      address: err.address,
      port: err.port,
      hint:
        err.code === 'ECONNREFUSED'
          ? 'PostgreSQL service is not running or not listening on the configured port. On Windows: `net start postgresql-x64-18` (admin).'
          : err.code === '28P01'
            ? 'Authentication failed — check PG_USER / PG_PASSWORD in .env.'
            : err.code === '3D000'
              ? `Database "${process.env.PG_DATABASE ?? 'blog_redactor_seo'}" does not exist — create it with \`createdb\`.`
              : undefined,
    })
  })

  // Purge expired cache entries every hour
  setInterval(async () => {
    try {
      const res = await pool.query('DELETE FROM api_cache WHERE expires_at < NOW()')
      if (res.rowCount && res.rowCount > 0) {
        log.debug(`api_cache purge: ${res.rowCount} expired entries deleted`)
      }
    } catch (err) {
      log.error('api_cache purge failed:', err)
    }
  }, 60 * 60 * 1000)
})
