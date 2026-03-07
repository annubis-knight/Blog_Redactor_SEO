import express from 'express'
import { errorHandler } from './utils/error-handler.js'
import cocoonRoutes from './routes/cocoons.routes.js'
import keywordRoutes from './routes/keywords.routes.js'
import articlesRoutes from './routes/articles.routes.js'
import dataforseoRoutes from './routes/dataforseo.routes.js'
import generateRoutes from './routes/generate.routes.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json())

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

// Global error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[server] Blog Redactor SEO API running on http://localhost:${PORT}`)
})
