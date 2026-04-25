import type { Response } from 'express'
import { DataForSeoQuotaError, CostBudgetError } from '../services/external/dataforseo.service.js'
import { AIProviderQuotaError, AIProviderOverloadedError } from '../services/external/ai-provider.service.js'

/**
 * Maps a thrown error to an appropriate HTTP response.
 * Known third-party errors (e.g. DataForSEO 429, AI provider quota) get a
 * dedicated code so the client can surface them in the activity log.
 * Everything else falls back to a 500 with the caller-provided default message.
 */
export function respondWithError(
  res: Response,
  err: unknown,
  fallback: { status?: number; code?: string; message: string },
): void {
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
        message: `Plafond de dépense DataForSEO atteint ($${err.spentUsd.toFixed(4)} / $${err.budgetUsd.toFixed(2)} sur ${err.windowMin}min).`,
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
      error: {
        code: 'AI_PROVIDER_QUOTA_EXCEEDED',
        message: err.message,
        provider: err.provider,
      },
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
  res.status(fallback.status ?? 500).json({
    error: {
      code: fallback.code ?? 'INTERNAL_ERROR',
      message: fallback.message,
    },
  })
}
