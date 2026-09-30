/**
 * AUTHORITY: in-memory module variable `overrideMode` (this file) + `.env`
 *            (`AI_PROVIDER`, `DATAFORSEO_SANDBOX`) quand aucun override n'est posé.
 * READS FROM: GET /api/runtime-mode (hydratation et resynchronisation du badge)
 * WRITES TO: POST /api/runtime-mode (toggle navbar, mode automatique)
 * CONSUMERS: ai-provider.service.getProvider(), dataforseo/_client.isSandbox(),
 *            badge de la barre de navigation (via la route).
 * RELATED FR: FR-INFRA-RUNTIME-MODE, NFR-COST-AI-MOCK, FR-EXT-DATAFORSEO-SANDBOX
 *
 * Override runtime du mode mock/réel — quand défini, prend le pas sur les
 * variables `.env` (`AI_PROVIDER`, `DATAFORSEO_SANDBOX`). Permet à l'utilisateur
 * solo de basculer toutes les sources externes (IA + SEO) via un toggle navbar
 * sans redémarrer le serveur.
 *
 * Persistance : RAM uniquement. Au restart, l'override est perdu et on retombe
 * sur le `.env`. Le front réémet son dernier état (localStorage) quand il voit
 * que le serveur l'a perdu, pour resynchroniser.
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
 * Mode effectif : override si défini, sinon dérivé du `.env`. On considère
 * « mock » si `AI_PROVIDER=mock` OU `DATAFORSEO_SANDBOX=true` : c'est notre
 * convention solo, « tout mock » ou « tout réel ».
 *
 * C'est la SEULE autorité (FR-INFRA-RUNTIME-MODE, recette 2026-09-30 F1) :
 * `isSandbox()` et `getProvider()` lisent ce mode, et le badge l'affiche. Si le
 * badge dit MOCK, rien n'est facturé — ni l'IA, ni DataForSEO. Avant, chaque
 * consommateur relisait sa propre variable : avec `AI_PROVIDER=mock` et
 * `DATAFORSEO_SANDBOX` absent, le badge disait MOCK pendant que DataForSEO
 * partait en production payante.
 */
export function getEffectiveMode(): RuntimeMode {
  if (overrideMode !== null) return overrideMode
  const aiMock = (process.env.AI_PROVIDER ?? '').toLowerCase() === 'mock'
  const seoSandbox = process.env.DATAFORSEO_SANDBOX === 'true'
  return (aiMock || seoSandbox) ? 'mock' : 'real'
}
