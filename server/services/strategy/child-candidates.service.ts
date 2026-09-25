/**
 * AUTHORITY: aucune persistance propre — propose des candidats ; la mesure
 *            écrit dans `keyword_metrics` / `keyword_serp_results`
 *            (keyword-measure.service).
 * READS FROM: arbre du cocon (getCocoonTree), contexte du cocon
 *             (cocoonContextForNewArticle), stratégie du cocon (`{{strategy_context}}`).
 * WRITES TO: keyword_metrics, keyword_serp_results (via measureKeywords).
 * CONSUMERS: POST /api/cocoons/:cocoonId/child-candidates (écran du Cerveau).
 * RELATED FR: FR-CER-KEYWORD-REAL-DATA, FR-CER-CHILD-FROM-PILLAR-H2,
 *             FR-CER-COCOON-PROGRESSIVE, FR-INFRA-COCOON-CONTEXT
 *
 * Le mot-clé d'un nouvel article se choisit sur des données réelles : l'IA
 * propose 3 à 5 candidats pour une section libre d'un parent rédigé (ou pour le
 * pilier d'un cocon vide), chacun mesuré avant d'être montré. Toute impossibilité
 * se dit AVANT l'appel payant.
 */
import { z } from 'zod/v4'
import { getCocoonTree } from '../article/cocoon-article.service.js'
import { cocoonContextForNewArticle } from './cocoon-context.service.js'
import { measureKeywords } from '../keyword/keyword-measure.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { collectStreamWithUsage } from '../../utils/stream-usage.js'
import { parseAiJson } from '../../utils/ai-json-parser.js'
import { verifyCocoonHierarchy } from '../../../shared/verifiers/cocoon-hierarchy.js'
import { describeTypeRules } from '../../../shared/constants/article-type-rules.js'
import { normalizeKeyword } from '../../../shared/verifiers/lieutenants.js'
import { log } from '../../utils/logger.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import type { ChildCandidatesResult } from '../../../shared/types/cocoon-tree.types.js'

export class ChildCandidatesError extends Error {
  constructor(
    readonly status: number,
    readonly code: 'COCOON_NOT_FOUND' | 'HIERARCHY_VIOLATION' | 'PARENT_NOT_WRITTEN' | 'AI_UNREADABLE',
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ChildCandidatesError'
  }
}

const CHILD_LEVEL: Record<ArticleLevel, ArticleLevel | null> = { pilier: 'intermediaire', intermediaire: 'specifique', specifique: null }
const LEVEL_LABEL: Record<ArticleLevel, string> = { pilier: 'pilier', intermediaire: 'intermédiaire', specifique: 'spécialisé' }
const MAX_CANDIDATES = 5

const aiResponseSchema = z.object({
  candidates: z.array(z.object({
    keyword: z.string().trim().min(2).max(120),
    title: z.string().trim().min(3).max(200),
    rationale: z.string().trim().default(''),
    painPoint: z.string().trim().nullable().optional(),
  }).loose()),
}).loose()

export async function proposeChildCandidates(
  cocoonId: number,
  focus: { parentId: number | null; parentSection: string | null },
): Promise<ChildCandidatesResult> {
  const tree = await getCocoonTree(cocoonId)
  if (!tree) throw new ChildCandidatesError(404, 'COCOON_NOT_FOUND', `Cocon ${cocoonId} introuvable.`)

  const parentId = focus.parentId ?? null
  const parentSection = focus.parentSection?.trim() || null
  const parent = parentId !== null ? tree.find(n => n.id === parentId) : undefined
  // Le niveau découle du parent : un pilier donne un intermédiaire, un intermédiaire un spécialisé.
  const level: ArticleLevel = parentId === null ? 'pilier' : (parent ? CHILD_LEVEL[parent.level] ?? parent.level : 'intermediaire')

  // Tout ce qui empêcherait de créer l'article se dit AVANT l'appel payant.
  const issues = parent && CHILD_LEVEL[parent.level] === null
    ? [{ rule: 'hierarchy-parent-level', level: 'technique' as const, message: `« ${parent.title} » est un article spécialisé : il n’a pas d’article enfant.` }]
    : verifyCocoonHierarchy({
      level,
      parentId,
      parentSection,
      cocoonArticles: tree.map(n => ({ id: n.id, title: n.title, level: n.level, parentId: n.parentId, parentSection: n.parentSection })),
      parentSections: parent ? parent.sections.map(s => s.title) : null,
    })
  if (issues.length > 0) {
    throw new ChildCandidatesError(409, 'HIERARCHY_VIOLATION', issues.map(i => i.message).join(' '), { issues })
  }
  if (parent && !parent.drafted) {
    throw new ChildCandidatesError(409, 'PARENT_NOT_WRITTEN', `« ${parent.title} » n’est pas encore rédigé : validez d’abord son premier jet, puis créez ses articles enfants.`)
  }

  const context = await cocoonContextForNewArticle(cocoonId, parentId, parentSection)
  if (!context) throw new ChildCandidatesError(404, 'COCOON_NOT_FOUND', `Cocon ${cocoonId} introuvable.`)

  const [systemPrompt, userPrompt] = await Promise.all([
    loadPrompt('system-propulsite'),
    loadPrompt('cocoon-child-keywords', {
      cocoon_context: context.context,
      articleLevel: LEVEL_LABEL[level],
      parentSection: parentSection ?? '',
      type_rules: describeTypeRules(level),
    }, { cocoonSlug: context.cocoonName }),
  ])
  const { text, usage } = await collectStreamWithUsage(systemPrompt, userPrompt, 1500)

  let parsed: z.infer<typeof aiResponseSchema> | null = null
  try {
    const result = aiResponseSchema.safeParse(parseAiJson<unknown>(text))
    parsed = result.success ? result.data : null
  } catch { /* illisible */ }
  // Un candidat vaut par sa différence : pas de doublon, rien qui reprenne un mot-clé du cocon.
  const taken = new Set(tree.map(n => n.keyword).filter((k): k is string => !!k).map(normalizeKeyword))
  const seen = new Set<string>()
  const kept = (parsed?.candidates ?? []).filter((c) => {
    const key = normalizeKeyword(c.keyword)
    if (taken.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, MAX_CANDIDATES)
  if (kept.length === 0) {
    log.warn('[child-candidates] réponse de l’IA sans candidat exploitable', { cocoonId, chars: text.length })
    throw new ChildCandidatesError(502, 'AI_UNREADABLE', 'L’IA n’a proposé aucun candidat exploitable : relancez la proposition.')
  }

  const measures = await measureKeywords(kept.map(c => c.keyword))
  log.info('[child-candidates] candidats mesurés', { cocoonId, level, parentId, count: kept.length })
  return {
    level,
    parentId,
    parentSection,
    candidates: kept.map(c => ({
      keyword: c.keyword,
      title: c.title,
      rationale: c.rationale,
      painPoint: c.painPoint?.trim() || null,
      metrics: measures.get(c.keyword)?.metrics ?? null,
      serp: measures.get(c.keyword)?.serp ?? [],
    })),
    usage,
  }
}
