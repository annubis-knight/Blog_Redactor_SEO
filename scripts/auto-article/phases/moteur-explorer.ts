/**
 * Phase 2 — Moteur · Explorer (Discovery + Radar).
 *
 *   1. POST /keywords/radar/generate  → ~15-20 mots-clés candidats (IA)
 *   2. émet moteur:discovery_done
 *   3. POST /keywords/radar/scan       → RadarCards (KPI marché)
 *   4. émet moteur:radar_done
 *   5. pickRadarCandidates → ctx.radarCandidates (top K par marketScore)
 */

import type { PhaseDeps } from '../deps.js'
import type { ApiUsageLike, AutoRunContext, RadarSeedKeyword } from '../types.js'
import { toCanonicalType } from '../canonical.js'
import { emitCheck } from '../checks.js'
import { pickRadarCandidates, dedupeRadarKeywords, type RadarCardLike } from '../heuristics/pick-radar-candidates.js'
import { MOTEUR_DISCOVERY_DONE, MOTEUR_RADAR_DONE } from '../../../shared/constants/workflow-checks.constants.js'

export function makeMoteurExplorer(deps: PhaseDeps): (ctx: AutoRunContext) => Promise<void> {
  const { client, logger, report } = deps

  return async (ctx) => {
    if (ctx.articleId == null) throw new Error('Moteur : articleId manquant (phase Cerveau requise)')

    // 1-2. Discovery
    logger.step('Discovery — génération de mots-clés candidats…')
    const gen = await client.apiPost<{ keywords: RadarSeedKeyword[]; usage?: ApiUsageLike | null }>(
      '/keywords/radar/generate',
      { title: ctx.articleTitle, keyword: ctx.pilierKeyword, painPoint: ctx.painPoint },
    )
    report.addUsage(gen.usage ?? null)
    await emitCheck(client, ctx.articleId, MOTEUR_DISCOVERY_DONE)
    report.addStep(`Moteur · Discovery (${gen.keywords.length} mots-clés)`)

    // 3-4. Radar scan (pilier inclus en tête)
    const seeds = dedupeRadarKeywords([
      { keyword: ctx.pilierKeyword, reasoning: 'pilier' },
      ...gen.keywords,
    ])
    logger.step(`Radar — scan de ${seeds.length} mots-clés…`)
    const scan = await client.apiPost<{ cards: RadarCardLike[]; globalScore: number; heatLevel: string }>(
      '/keywords/radar/scan',
      {
        broadKeyword: ctx.pilierKeyword,
        specificTopic: ctx.articleTitle,
        keywords: seeds,
        depth: 1,
        painPoint: ctx.painPoint,
      },
    )
    await emitCheck(client, ctx.articleId, MOTEUR_RADAR_DONE)

    // 5. Sélection des candidats
    ctx.radarCandidates = pickRadarCandidates(scan.cards, toCanonicalType(ctx.articleType))
    report.addStep(
      `Moteur · Radar (${scan.cards.length} cards → ${ctx.radarCandidates.length} candidats, score ${scan.globalScore})`,
    )
    logger.success(`Radar : ${ctx.radarCandidates.length} candidats retenus (heat ${scan.heatLevel}).`)
  }
}
