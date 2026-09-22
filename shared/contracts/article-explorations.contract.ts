/**
 * Contrat d'affichage — « Explorations d'un article » (GET /articles/:id/explorations, lot 5).
 *
 * Relecture en base de tout ce que l'article a déjà exploré, au montage du
 * Moteur et au changement d'article : thermomètre du Radar, onglets Lexique
 * par mot-clé source, analyses d'intention, locale et de contenu manquant.
 * Chaque bloc reprend le contrat de sa famille : une ligne abîmée est écartée
 * (signalée au journal), les autres sont servies.
 *
 * AUTHORITY: PostgreSQL `radar_explorations`, `captain_explorations`,
 *            `lieutenant_explorations`, `lexique_explorations`,
 *            `keyword_intent_analyses`, `keyword_metrics` (local, content gap)
 * READS FROM: GET /articles/:id/explorations
 * CONSUMERS: useArticleResults (MoteurView : thermomètre Radar, stores intention
 *            et local), useLexiqueExplorations (LexiquePanel)
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-MOT-EXPLORATIONS-HYDRATATION,
 *             FR-LEX-MULTI-KEYWORD-TABS
 */
import { z } from 'zod'
import { defineContract, nullableText, tolerantArray, withFallback } from './core.js'
import { captainScanEntrySchema } from './captain-scan.contract.js'
import { richLieutenantSchema } from './lieutenants.contract.js'
import { lexiqueExplorationSchema } from './lexique.contract.js'
import { radarExplorationContract } from './radar.contract.js'
import type {
  ArticleExplorations,
  ExplorationGroup,
  LocalExplorationSnapshot,
} from '../types/article-explorations.types.js'

/** Analyses d'autres onglets (intention, contenu manquant) : servies telles quelles, jamais bloquantes. */
function group<T>(capitaine: z.ZodType<T, unknown>, field: string): z.ZodType<ExplorationGroup<T>, unknown> {
  return withFallback(
    z.looseObject({
      capitaine: withFallback(capitaine.nullable(), null, `${field}.capitaine`),
      all: tolerantArray(z.unknown(), `${field}.all`),
    }),
    { capitaine: null, all: [] },
    field,
  )
}

const localSnapshotSchema: z.ZodType<LocalExplorationSnapshot, unknown> = z.looseObject({
  hasLocalPack: withFallback(z.boolean().optional(), undefined, 'local.hasLocalPack'),
  listings: tolerantArray(z.unknown(), 'local.listings').optional(),
  reviewGap: z.unknown(),
  comparison: z.unknown(),
})

export const articleExplorationsContract = defineContract<ArticleExplorations>(
  'explorations',
  z.looseObject({
    capitaineKeyword: nullableText('capitaineKeyword'),
    // Instantané illisible → « pas encore de scan » (le thermomètre attend).
    radar: withFallback(radarExplorationContract.schema, null, 'radar'),
    captain: tolerantArray(captainScanEntrySchema, 'captain'),
    lieutenants: tolerantArray(richLieutenantSchema, 'lieutenants'),
    intent: group(z.unknown(), 'intent'),
    local: group(localSnapshotSchema, 'local'),
    contentGap: group(z.unknown(), 'contentGap'),
    lexique: tolerantArray(lexiqueExplorationSchema, 'lexique'),
  }),
)
