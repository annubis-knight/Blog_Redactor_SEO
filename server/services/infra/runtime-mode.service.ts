/**
 * AUTHORITY: in-memory module variable `overrideMode` (this file)
 * READS FROM: GET /api/runtime-mode (hydratation front au boot)
 * WRITES TO: POST /api/runtime-mode (toggle navbar)
 * CONSUMERS: ai-provider.service.getProvider(), dataforseo/_client.isSandbox()
 *
 * Override runtime du mode mock/réel — quand défini, prend le pas sur les
 * variables `.env` (`AI_PROVIDER`, `DATAFORSEO_SANDBOX`). Permet à l'utilisateur
 * solo de basculer toutes les sources externes (IA + SEO) via un toggle navbar
 * sans redémarrer le serveur.
 *
 * Persistance : RAM uniquement. Au restart, l'override est perdu et on retombe
 * sur le `.env`. Le front réémet son dernier état (localStorage) au prochain
 * boot pour resynchroniser.
 */

export type RuntimeMode = 'mock' | 'real'

let overrideMode: RuntimeMode | null = null

export function getRuntimeMode(): RuntimeMode | null {
  return overrideMode
}

export function setRuntimeMode(mode: RuntimeMode | null): void {
  overrideMode = mode
}

/**
 * Mode effectif pour la décision : override si défini, sinon dérivé du `.env`.
 * On considère "mock" si `AI_PROVIDER=mock` OU `DATAFORSEO_SANDBOX=true` —
 * c'est imparfait (les deux flags sont indépendants en théorie) mais c'est
 * notre convention solo : "tout mock" ou "tout réel".
 */
export function getEffectiveMode(): RuntimeMode {
  if (overrideMode !== null) return overrideMode
  const aiMock = (process.env.AI_PROVIDER ?? '').toLowerCase() === 'mock'
  const seoSandbox = process.env.DATAFORSEO_SANDBOX === 'true'
  return (aiMock || seoSandbox) ? 'mock' : 'real'
}
