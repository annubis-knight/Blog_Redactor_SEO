import { Router } from 'express'
import { z } from 'zod'
import { getRuntimeMode, setRuntimeMode, getEffectiveMode, type RuntimeMode } from '../services/infra/runtime-mode.service.js'

const router = Router()

const setRuntimeModeSchema = z.object({
  mode: z.enum(['mock', 'real']).nullable(),
})

router.get('/runtime-mode', (_req, res) => {
  res.json({
    data: {
      override: getRuntimeMode(),
      effective: getEffectiveMode(),
      envAiProvider: process.env.AI_PROVIDER ?? null,
      envDataforseoSandbox: process.env.DATAFORSEO_SANDBOX === 'true',
    },
  })
})

router.post('/runtime-mode', async (req, res) => {
  const parsed = setRuntimeModeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }
  const previous = getRuntimeMode()
  setRuntimeMode(parsed.data.mode as RuntimeMode | null)
  // Passage en réel : les mesures obtenues en simulé quittent la base partagée,
  // pour ne jamais être servies comme vraies (FR-EXT-DATAFORSEO-SANDBOX). Si
  // l'effacement échoue, la bascule est refusée : le bouton revient à son état.
  if (getEffectiveMode() === 'real') {
    const { purgeSandboxMeasures } = await import('../services/keyword/keyword-metrics.service.js')
    try {
      await purgeSandboxMeasures()
    } catch {
      setRuntimeMode(previous)
      res.status(500).json({
        error: {
          code: 'SANDBOX_PURGE_FAILED',
          message: 'Passage en réel refusé : les mesures simulées n\'ont pas pu être effacées de la base. Réessayez.',
        },
      })
      return
    }
  }
  res.json({
    data: {
      override: getRuntimeMode(),
      effective: getEffectiveMode(),
    },
  })
})

export default router
