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

router.post('/runtime-mode', (req, res) => {
  const parsed = setRuntimeModeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }
  setRuntimeMode(parsed.data.mode as RuntimeMode | null)
  res.json({
    data: {
      override: getRuntimeMode(),
      effective: getEffectiveMode(),
    },
  })
})

export default router
