/**
 * AUTHORITY: aucune persistance propre — propose des candidats ; la mesure
 *            écrit dans `keyword_metrics` et le cache `serp-top`
 *            (keyword-measure.service).
 * READS FROM: arbre du cocon (getCocoonTree), contexte du cocon
 *             (cocoonContextForNewArticle), stratégie du cocon (`{{strategy_context}}`).
 * WRITES TO: keyword_metrics, external_api_cache `serp-top` (via measureKeywords).
 * CONSUMERS: POST /api/cocoons/:cocoonId/child-candidates et
 *            POST /api/cocoons/:cocoonId/candidate-measure (écran du Cerveau) ;
 *            la douleur et l'intention de chaque candidat deviennent celles de
 *            l'article créé (articles.pain_point, articles.pain_intent_expected).
 * RELATED FR: FR-CER-KEYWORD-REAL-DATA, FR-CER-CHILD-FROM-PILLAR-H2,
 *             FR-CER-COCOON-PROGRESSIVE, FR-INFRA-COCOON-CONTEXT,
 *             FR-PIE-AI-GENERATION, FR-MOT-PAINPOINT-INJECTION
 *
 * Le mot-clé d'un nouvel article se choisit sur des données réelles : l'IA
 * propose 3 à 5 candidats pour une section libre d'un parent rédigé (ou pour le
 * pilier d'un cocon vide), chacun mesuré avant d'être montré ; l'utilisateur
 * peut aussi proposer le sien. Toute impossibilité se dit AVANT l'appel payant.
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
import type { ChildCandidate, ChildCandidatesResult, CocoonTreeNode } from '../../../shared/types/cocoon-tree.types.js'
import { PAIN_INTENT_EXPECTED_VALUES } from '../../../shared/types/scoring.types.js'

export class ChildCandidatesError extends Error {
  constructor(
    readonly status: number,
    readonly code: 'COCOON_NOT_FOUND' | 'HIERARCHY_VIOLATION' | 'PARENT_NOT_WRITTEN' | 'AI_UNREADABLE' | 'KEYWORD_TAKEN',
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
    // Une valeur hors des quatre intentions devient absente, sans rejeter le candidat.
    painIntentExpected: z.enum(PAIN_INTENT_EXPECTED_VALUES).nullable().optional().catch(null),
  }).loose()),
}).loose()

/** La cible d'un nouvel article : le pilier (sans parent) ou la section d'un parent. */
export interface NewArticleFocus { parentId: number | null; parentSection: string | null }

/**
 * Niveau du nouvel article, et tout ce qui empêcherait de le créer, dit AVANT
 * l'appel payant (candidats de l'IA comme mot-clé proposé par l'utilisateur).
 */
function resolveTarget(tree: CocoonTreeNode[], focus: NewArticleFocus): { level: ArticleLevel; parentId: number | null; parentSection: string | null } {
  const parentId = focus.parentId ?? null
  const parentSection = focus.parentSection?.trim() || null
  const parent = parentId !== null ? tree.find(n => n.id === parentId) : undefined
  // Le niveau découle du parent : un pilier donne un intermédiaire, un intermédiaire un spécialisé.
  const level: ArticleLevel = parentId === null ? 'pilier' : (parent ? CHILD_LEVEL[parent.level] ?? parent.level : 'intermediaire')

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
  return { level, parentId, parentSection }
}

export async function proposeChildCandidates(cocoonId: number, focus: NewArticleFocus): Promise<ChildCandidatesResult> {
  const tree = await getCocoonTree(cocoonId)
  if (!tree) throw new ChildCandidatesError(404, 'COCOON_NOT_FOUND', `Cocon ${cocoonId} introuvable.`)
  const { level, parentId, parentSection } = resolveTarget(tree, focus)

  const context = await cocoonContextForNewArticle(cocoonId, parentId, parentSection)
  if (!context) throw new ChildCandidatesError(404, 'COCOON_NOT_FOUND', `Cocon ${cocoonId} introuvable.`)

  const [systemPrompt, userPrompt] = await Promise.all([
    loadPrompt('system-propulsite'),
    loadPrompt('cocoon-child-keywords', {
      cocoon_context: context.context,
      articleLevel: LEVEL_LABEL[level],
      parentSection: parentSection ?? '',
      type_rules: describeTypeRules(level),
      // Une requête de pilier trop longue n'a souvent aucune donnée (recette réelle
      // du 2026-10-02 : cinq candidats sur cinq « Non mesuré ») : la consigne exige
      // des requêtes courtes et larges pour le seul pilier.
      pillarRule: level === 'pilier' ? 'oui' : '',
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
      painIntentExpected: c.painIntentExpected ?? null,
      metrics: measures.get(c.keyword)?.metrics ?? null,
      serp: measures.get(c.keyword)?.serp ?? [],
    })),
    usage,
  }
}

const ownKeywordPainSchema = z.object({
  painPoint: z.string().trim().nullable().optional(),
  painIntentExpected: z.enum(PAIN_INTENT_EXPECTED_VALUES).nullable().optional().catch(null),
}).loose()

/**
 * Douleur et intention éditoriale du mot-clé proposé, écrites par l'IA avec la
 * stratégie et l'état du cocon, comme pour ses propres candidats. Ne lève
 * jamais : une panne ou une réponse illisible rend `null`, et le mot-clé reste
 * mesuré et choisissable.
 */
async function describeOwnKeyword(
  cocoonId: number,
  keyword: string,
  target: { level: ArticleLevel; parentId: number | null; parentSection: string | null },
): Promise<Pick<ChildCandidate, 'painPoint' | 'painIntentExpected'>> {
  const none = { painPoint: null, painIntentExpected: null }
  try {
    const context = await cocoonContextForNewArticle(cocoonId, target.parentId, target.parentSection)
    if (!context) return none
    const [systemPrompt, userPrompt] = await Promise.all([
      loadPrompt('system-propulsite'),
      loadPrompt('cocoon-own-keyword', {
        cocoon_context: context.context,
        articleLevel: LEVEL_LABEL[target.level],
        parentSection: target.parentSection ?? '',
        keyword,
      }, { cocoonSlug: context.cocoonName }),
    ])
    const { text } = await collectStreamWithUsage(systemPrompt, userPrompt, 400)
    const parsed = ownKeywordPainSchema.safeParse(parseAiJson<unknown>(text))
    if (!parsed.success) {
      log.warn('[child-candidates] douleur du mot-clé proposé illisible', { cocoonId, keyword, chars: text.length })
      return none
    }
    return { painPoint: parsed.data.painPoint?.trim() || null, painIntentExpected: parsed.data.painIntentExpected ?? null }
  } catch (err) {
    log.warn('[child-candidates] douleur du mot-clé proposé non écrite', { cocoonId, keyword, error: (err as Error).message })
    return none
  }
}

/**
 * Le mot-clé proposé par l'utilisateur (FR-CER-KEYWORD-REAL-DATA), quand aucun
 * candidat de l'IA ne lui convient ou n'a de données. Mesuré comme les autres
 * (base d'abord, DataForSEO pour ce qui manque) ; sans données, il revient sans
 * mesures et l'écran ne le laisse pas choisir. Dans le même temps, l'IA écrit sa
 * douleur et son intention éditoriale (recette réelle du 2026-10-02 : sans elles,
 * le Capitaine du pilier n'avait aucun Score Pertinence). Un mot-clé déjà pris
 * dans le cocon, ou une cible impossible, est refusé avant tout appel payant.
 */
export async function measureOwnCandidate(cocoonId: number, rawKeyword: string, focus: NewArticleFocus): Promise<ChildCandidate> {
  const keyword = rawKeyword.trim().replace(/\s+/g, ' ').toLowerCase()
  const tree = await getCocoonTree(cocoonId)
  if (!tree) throw new ChildCandidatesError(404, 'COCOON_NOT_FOUND', `Cocon ${cocoonId} introuvable.`)
  const target = resolveTarget(tree, focus)
  const taken = new Set(tree.map(n => n.keyword).filter((k): k is string => !!k).map(normalizeKeyword))
  if (taken.has(normalizeKeyword(keyword))) {
    throw new ChildCandidatesError(409, 'KEYWORD_TAKEN', `« ${keyword} » est déjà le mot-clé d’un article de ce cocon : choisissez-en un autre.`)
  }
  const [measures, pain] = await Promise.all([measureKeywords([keyword]), describeOwnKeyword(cocoonId, keyword, target)])
  const measure = measures.get(keyword)
  log.info('[child-candidates] mot-clé proposé par l’utilisateur', { cocoonId, keyword, level: target.level, measured: !!measure?.metrics, pain: !!pain.painPoint })
  return {
    keyword,
    title: keyword.charAt(0).toUpperCase() + keyword.slice(1),
    rationale: 'Mot-clé proposé par vous.',
    ...pain,
    metrics: measure?.metrics ?? null,
    serp: measure?.serp ?? [],
  }
}
