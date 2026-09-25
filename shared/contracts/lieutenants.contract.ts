/**
 * Contrats d'affichage — « Lieutenants IA » et « plan Hn » (lot 4).
 *
 * Forme attendue par LieutenantCard, LieutenantProposals et
 * LieutenantH2Structure, après :
 *   - la sortie brute de l'IA (POST /keywords/:keyword/propose-lieutenants,
 *     frontière serveur, avant le tri et la sauvegarde) ;
 *   - l'événement `done` de ce flux et de POST /keywords/:keyword/ai-hn-structure
 *     (frontière client) ;
 *   - la relecture en base (`lieutenant_explorations`, `article_keywords.hn_structure`)
 *     via GET /articles/:id/keywords.
 *
 * Score IA : entier 0-100, ou `null` quand l'IA n'en a pas donné (carte ajoutée
 * depuis le panier, ancienne liste sans détail) → « — », trié en bas.
 *
 * AUTHORITY: PostgreSQL `lieutenant_explorations`, `article_keywords.hn_structure` (JSONB)
 * READS FROM: POST /keywords/:keyword/propose-lieutenants (SSE),
 *             POST /keywords/:keyword/ai-hn-structure (SSE), GET /articles/:id/keywords
 * CONSUMERS: useLieutenantsIa, article-keywords.store, LieutenantCard,
 *            LieutenantProposals, LieutenantH2Structure, useLieutenantsHn
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-LIE-AI-FRONTIER, FR-MOT-HN-REGEN-LOCKED
 */
import { z } from 'zod'
import { count, defineContract, oneOf, requiredList, signal, text, toKpiValue, tolerantArray, withFallback } from './core.js'
import { kpiSummarySchema } from './captain-scan.contract.js'
import type { RichLieutenant } from '../types/keyword.types.js'
import type {
  FilteredProposeLieutenantsResult,
  ProposedLieutenant,
  ProposeLieutenantsHnNode,
  ProposeLieutenantsResult,
} from '../types/serp-analysis.types.js'

const LIEUTENANT_SOURCES = ['paa', 'serp', 'group', 'root', 'content-gap'] as const
const LIEUTENANT_STATUSES = ['suggested', 'locked', 'eliminated', 'archived'] as const

const nonBlank = z.string().refine(value => value.trim() !== '', 'texte vide')

/** Score IA sur 100 : entier, ou `null` si absent ou hors échelle (jamais inventé). */
function aiScore(field: string) {
  return z.unknown().transform((value): number | null => {
    const score = toKpiValue(value, field)
    if (score === null) return null
    if (score < 0 || score > 100) {
      signal('coerced', field, `${score} hors de 0-100 → absent`)
      return null
    }
    return Math.round(score)
  })
}

/** Niveau d'un titre : 1 à 6, accepte aussi « 2 » ou « H2 » renvoyés par l'IA. */
const headingLevel = z.preprocess(
  value => (typeof value === 'string' ? Number(value.trim().replace(/^h/i, '')) : value),
  z.number().int().min(1).max(6),
)

/** Niveau suggéré pour un Lieutenant : H2 ou H3 ; autre valeur → H2, signalé. */
function suggestedHnLevel(field: string) {
  return z.unknown().transform((value): 2 | 3 => {
    const parsed = headingLevel.safeParse(value)
    if (parsed.success && (parsed.data === 2 || parsed.data === 3)) return parsed.data
    signal('coerced', field, `${JSON.stringify(value) ?? String(value)} → H2`)
    return 2
  })
}

const proposedLieutenantSchema: z.ZodType<ProposedLieutenant, unknown> = z.looseObject({
  keyword: nonBlank,
  reasoning: text('lieutenants.reasoning', ''),
  sources: tolerantArray(z.enum(LIEUTENANT_SOURCES), 'lieutenants.sources'),
  suggestedHnLevel: suggestedHnLevel('lieutenants.suggestedHnLevel'),
  score: aiScore('lieutenants.score'),
})

/** Titre du plan : un titre vide ou sans niveau lisible est écarté. */
export const proposeHnNodeSchema: z.ZodType<ProposeLieutenantsHnNode, unknown> = z.looseObject({
  level: headingLevel,
  text: nonBlank,
  children: tolerantArray(z.looseObject({ level: headingLevel, text: nonBlank }), 'hnStructure.children').optional(),
})

/** Un même mot-clé proposé deux fois n'apparaît qu'une fois (la case à cocher est indexée par mot-clé). */
function withoutDuplicates(lieutenants: ProposedLieutenant[]): ProposedLieutenant[] {
  const seen = new Set<string>()
  return lieutenants.filter(lieutenant => {
    const key = lieutenant.keyword.trim().toLowerCase()
    if (seen.has(key)) {
      signal('dropped', 'lieutenants', `« ${lieutenant.keyword} » proposé deux fois`)
      return false
    }
    seen.add(key)
    return true
  })
}

/** Sortie brute de l'IA « proposer des Lieutenants », avant tri et sauvegarde (frontière serveur). */
export const proposeLieutenantsAiContract = defineContract<ProposeLieutenantsResult>(
  'propose-lieutenants-ai',
  z.looseObject({
    lieutenants: requiredList(proposedLieutenantSchema, 'lieutenants').transform(withoutDuplicates),
    contentGapInsights: text('contentGapInsights', ''),
  }),
)

/** Événement `done` de POST /keywords/:keyword/propose-lieutenants (frontière client). */
export const proposeLieutenantsContract = defineContract<FilteredProposeLieutenantsResult>(
  'propose-lieutenants',
  z.looseObject({
    selectedLieutenants: tolerantArray(proposedLieutenantSchema, 'selectedLieutenants'),
    eliminatedLieutenants: tolerantArray(proposedLieutenantSchema, 'eliminatedLieutenants'),
    contentGapInsights: text('contentGapInsights', ''),
    totalGenerated: count('totalGenerated'),
  }),
)

export interface HnOutlineResult {
  hnStructure: ProposeLieutenantsHnNode[]
  justification?: string
}

/**
 * Plan Hn régénéré (POST /keywords/:keyword/ai-hn-structure) : sans liste de
 * titres, la réponse est refusée et le plan affiché reste en place.
 */
export const hnOutlineContract = defineContract<HnOutlineResult>(
  'ai-hn-structure',
  z.looseObject({
    hnStructure: requiredList(proposeHnNodeSchema, 'hnStructure'),
    justification: withFallback(z.string().optional(), undefined, 'justification'),
  }),
)

/**
 * Lieutenant relu en base. Un statut inconnu est rangé « archivé » : la carte
 * reste masquée, comme avant le contrat.
 */
export const richLieutenantSchema: z.ZodType<RichLieutenant, unknown> = z.looseObject({
  keyword: nonBlank,
  status: oneOf(LIEUTENANT_STATUSES, 'archived', 'richLieutenants.status'),
  reasoning: text('richLieutenants.reasoning', ''),
  sources: tolerantArray(z.enum(LIEUTENANT_SOURCES), 'richLieutenants.sources'),
  suggestedHnLevel: suggestedHnLevel('richLieutenants.suggestedHnLevel'),
  score: aiScore('richLieutenants.score'),
  kpis: withFallback(z.array(kpiSummarySchema).nullable().optional(), null, 'richLieutenants.kpis').transform(value => value ?? null),
  exploredAt: withFallback(z.string().nullable().optional(), null, 'richLieutenants.exploredAt'),
})
