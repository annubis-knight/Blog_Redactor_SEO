import type { Request, Response, NextFunction } from 'express'
import { log } from './logger.js'
import { DataForSeoQuotaError, CostBudgetError } from '../services/external/dataforseo.service.js'
import { AIProviderQuotaError, AIProviderOverloadedError } from '../services/external/ai-provider.service.js'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  log.error(`${req.method} ${req.path} — ${err.message}`)

  if (err instanceof DataForSeoQuotaError) {
    res.status(429).json({
      error: {
        code: 'DATAFORSEO_QUOTA_EXCEEDED',
        message: 'Quota DataForSEO atteint. Rechargez vos crédits puis relancez.',
      },
    })
    return
  }
  if (err instanceof CostBudgetError) {
    res.status(429).json({
      error: {
        code: 'DATAFORSEO_COST_BUDGET',
        message: `Plafond de dépense DataForSEO atteint ($${err.spentUsd.toFixed(4)} / $${err.budgetUsd.toFixed(2)} sur ${err.windowMin}min). Attendez ou augmentez DATAFORSEO_COST_BUDGET_USD.`,
        endpoint: err.endpoint,
        spentUsd: err.spentUsd,
        budgetUsd: err.budgetUsd,
        windowMin: err.windowMin,
      },
    })
    return
  }
  if (err instanceof AIProviderQuotaError) {
    res.status(429).json({
      error: { code: 'AI_PROVIDER_QUOTA_EXCEEDED', message: err.message, provider: err.provider },
    })
    return
  }
  if (err instanceof AIProviderOverloadedError) {
    res.status(503).json({
      error: {
        code: 'AI_PROVIDER_OVERLOADED',
        message: `Le modèle IA (${err.provider}) est surchargé. Nouvelle tentative dans quelques instants.`,
        provider: err.provider,
      },
    })
    return
  }

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: err.message },
  })
}
