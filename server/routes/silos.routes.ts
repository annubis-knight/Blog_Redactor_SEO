import { Router } from 'express'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { log } from '../utils/logger.js'
import { getTheme, getSilos, getSiloByName, addCocoonToSilo } from '../services/infra/data.service.js'
import { getThemeConfig, saveThemeConfig } from '../services/strategy/theme-config.service.js'
import { themeConfigSchema } from '../../shared/schemas/theme-config.schema.js'
import { streamChatCompletion, USAGE_SENTINEL } from '../services/external/claude.service.js'

const router = Router()

/** GET /api/theme — Returns the blog theme */
router.get('/theme', async (_req, res) => {
  try {
    const theme = await getTheme()
    res.json({ data: theme })
  } catch (err) {
    log.error(`GET /api/theme — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load theme' } })
  }
})

/** GET /api/silos — List all silos with cocoons and stats */
router.get('/silos', async (_req, res) => {
  try {
    const silos = await getSilos()
    res.json({ data: silos })
  } catch (err) {
    log.error(`GET /api/silos — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load silos' } })
  }
})

/** GET /api/silos/:name — Get a single silo by name */
router.get('/silos/:name', async (req, res) => {
  try {
    const silo = await getSiloByName(decodeURIComponent(req.params.name))
    if (!silo) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Silo not found' } })
      return
    }
    res.json({ data: silo })
  } catch (err) {
    log.error(`GET /api/silos/${req.params.name} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load silo' } })
  }
})

/** POST /api/silos/:name/cocoons — Add a new cocoon to a silo */
router.post('/silos/:name/cocoons', async (req, res) => {
  try {
    const siloName = decodeURIComponent(req.params.name)
    const { name } = req.body as { name?: string }
    if (!name || !name.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cocoon name is required' } })
      return
    }
    const cocoon = await addCocoonToSilo(siloName, name.trim())
    res.status(201).json({ data: cocoon })
  } catch (err) {
    const message = (err as Error).message
    if (message.includes('not found')) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message } })
    } else if (message.includes('already exists')) {
      res.status(409).json({ error: { code: 'CONFLICT', message } })
    } else {
      log.error(`POST /api/silos/${req.params.name}/cocoons — ${message}`)
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create cocoon' } })
    }
  }
})

/** GET /api/theme/config — Returns the theme configuration */
router.get('/theme/config', async (_req, res) => {
  try {
    const config = await getThemeConfig()
    res.json({ data: config })
  } catch (err) {
    log.error(`GET /api/theme/config — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load theme config' } })
  }
})

/** PUT /api/theme/config — Save the theme configuration */
router.put('/theme/config', async (req, res) => {
  try {
    const parsed = themeConfigSchema.parse(req.body)
    const saved = await saveThemeConfig(parsed)
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/theme/config — ${(err as Error).message}`)
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: (err as Error).message } })
  }
})

/** POST /api/theme/config/parse — AI parses free text into structured ThemeConfig */
router.post('/theme/config/parse', async (req, res) => {
  try {
    const { text } = req.body as { text?: string }
    if (!text || !text.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Text is required' } })
      return
    }

    const promptTemplate = await readFile(
      join(process.cwd(), 'server', 'prompts', 'theme-parse.md'),
      'utf-8',
    )

    let result = ''
    for await (const chunk of streamChatCompletion(promptTemplate, text, 2048)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      result += chunk
    }

    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(500).json({ error: { code: 'PARSE_ERROR', message: 'AI response did not contain valid JSON' } })
      return
    }

    const parsed = JSON.parse(jsonMatch[0])
    const config = themeConfigSchema.parse(parsed)
    res.json({ data: config })
  } catch (err) {
    log.error(`POST /api/theme/config/parse — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to parse theme description' } })
  }
})

export default router
