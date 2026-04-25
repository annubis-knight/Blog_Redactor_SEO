/**
 * Service de calcul du targetWordCount conseillé pour un article.
 *
 * Logique :
 *   1. Récupère la moyenne SERP des concurrents (depuis content-gap.service ou keyword_metrics)
 *   2. Applique une base par type d'article (Pilier > Intermédiaire > Spécialisé)
 *   3. Passe SERP avg + base type + structure HN à une petite IA pour conseil contextualisé
 *   4. Retourne { recommended, breakdown } — l'utilisateur peut toujours override
 *
 * Bornes :
 *   - Pilier : 1800-3500
 *   - Intermédiaire : 1200-2500
 *   - Spécialisé : 800-1500
 */
import { log } from '../../utils/logger.js'
import { classifyWithTool } from '../external/ai-provider.service.js'

export type ArticleType = 'Pilier' | 'Intermédiaire' | 'Spécialisé'

export interface TargetWordCountInput {
  articleType: ArticleType
  /** Moyenne des wordCount des Top 10 SERP concurrents. Null si pas analysé. */
  competitorsAvgWordCount: number | null
  /** Sommaire structuré (H2/H3) — fortement conseillé pour calibrer la longueur. */
  hnStructure?: Array<{ level: 'H1' | 'H2' | 'H3'; title: string }>
  /** Contexte article pour cadrer la recommandation. */
  articleTitle?: string
  capitaineKeyword?: string
}

export interface TargetWordCountResult {
  recommended: number
  breakdown: {
    typeBase: { min: number; max: number; midpoint: number }
    competitorsAvg: number | null
    aiSuggestion: number | null
    finalRecommendation: number
    reasoning: string
  }
  /** Présent uniquement si l'IA a été sollicitée. Remonté au front pour la pile d'activité. */
  usage?: import('../external/claude.service.js').ApiUsage
}

const TYPE_BASE: Record<ArticleType, { min: number; max: number }> = {
  Pilier: { min: 1800, max: 3500 },
  Intermédiaire: { min: 1200, max: 2500 },
  Spécialisé: { min: 800, max: 1500 },
}

function midpoint(min: number, max: number): number {
  return Math.round((min + max) / 2)
}

function clampToBounds(value: number, type: ArticleType): number {
  const { min, max } = TYPE_BASE[type]
  return Math.max(min, Math.min(max, Math.round(value)))
}

/**
 * Calcule sans IA (fallback rapide). Combine SERP + base type, clampé aux bornes.
 * Utilisé si l'IA est indisponible ou si la SERP n'a pas été analysée.
 */
function computeHeuristic(input: TargetWordCountInput): { value: number; reasoning: string } {
  const base = TYPE_BASE[input.articleType]
  const baseMid = midpoint(base.min, base.max)

  if (input.competitorsAvgWordCount && input.competitorsAvgWordCount > 0) {
    // Pondération 60% SERP / 40% base type
    const blended = 0.6 * input.competitorsAvgWordCount + 0.4 * baseMid
    const clamped = clampToBounds(blended, input.articleType)
    return {
      value: clamped,
      reasoning: `Heuristique : 60% SERP avg (${Math.round(input.competitorsAvgWordCount)}) + 40% base ${input.articleType} (${baseMid}) = ${clamped}`,
    }
  }

  // Pas de SERP : juste la base type
  return {
    value: baseMid,
    reasoning: `Heuristique : médiane base ${input.articleType} (${base.min}-${base.max}) = ${baseMid}`,
  }
}

/**
 * Demande à l'IA un conseil contextualisé.
 * Si l'appel échoue (quota/erreur), on retombe sur l'heuristique.
 */
async function askAi(input: TargetWordCountInput): Promise<{ value: number; reasoning: string; usage?: import('../external/claude.service.js').ApiUsage } | null> {
  const base = TYPE_BASE[input.articleType]

  const hnBlock = input.hnStructure && input.hnStructure.length > 0
    ? input.hnStructure.map(h => `${h.level} : ${h.title}`).join('\n')
    : 'Pas de sommaire fourni — calibrage uniquement sur SERP + type'

  const competitorsBlock = input.competitorsAvgWordCount
    ? `Moyenne SERP Top 10 : ${Math.round(input.competitorsAvgWordCount)} mots`
    : 'Aucune donnée SERP — base sur le type d\'article uniquement'

  const userPrompt = [
    `Article : "${input.articleTitle ?? 'sans titre'}"`,
    `Mot-clé capitaine : "${input.capitaineKeyword ?? 'non défini'}"`,
    `Type : ${input.articleType} (bornes recommandées : ${base.min}-${base.max} mots)`,
    competitorsBlock,
    '',
    'Sommaire (structure HN) :',
    hnBlock,
    '',
    `À partir de ces éléments, conseille un nombre de mots cible **réaliste** pour bien ranker sur Google sans gonfler artificiellement. Tiens compte de la profondeur du sommaire (plus de H2/H3 = plus de mots requis) et de la moyenne des concurrents. Reste dans les bornes ${base.min}-${base.max}.`,
  ].join('\n')

  try {
    const { result, usage } = await classifyWithTool<{ recommendedWordCount: number; reasoning: string }>(
      'Tu es un expert SEO français. Tu conseilles des longueurs d\'articles réalistes en fonction du contexte concurrentiel et de la structure prévue. Tu ne gonfles jamais artificiellement.',
      userPrompt,
      {
        name: 'recommend_word_count',
        description: 'Recommande un nombre de mots cible pour un article SEO en tenant compte des concurrents et du sommaire.',
        input_schema: {
          type: 'object' as const,
          properties: {
            recommendedWordCount: {
              type: 'integer',
              description: `Nombre de mots cible recommandé (entre ${base.min} et ${base.max}).`,
            },
            reasoning: {
              type: 'string',
              description: 'Explication courte (1-2 phrases) justifiant la recommandation.',
            },
          },
          required: ['recommendedWordCount', 'reasoning'],
        },
      },
      { maxTokens: 256 },
    )
    const clamped = clampToBounds(result.recommendedWordCount, input.articleType)
    return { value: clamped, reasoning: result.reasoning, usage }
  } catch (err) {
    log.warn(`[target-word-count] AI advice failed: ${(err as Error).message} — falling back to heuristic`)
    return null
  }
}

/**
 * Calcule le targetWordCount conseillé pour un article.
 *
 * Stratégie :
 *   - Si on a une moyenne SERP ET un sommaire ET une IA dispo → on demande à l'IA
 *   - Sinon → heuristique (60% SERP + 40% base, ou base seule)
 */
export async function recommendTargetWordCount(
  input: TargetWordCountInput,
): Promise<TargetWordCountResult> {
  const base = TYPE_BASE[input.articleType]
  const baseMid = midpoint(base.min, base.max)

  // L'IA donne le meilleur résultat quand elle a SERP + sommaire — on la sollicite
  // dans ce cas. Sinon, l'heuristique est suffisamment fiable.
  const shouldAskAi =
    input.competitorsAvgWordCount !== null &&
    input.competitorsAvgWordCount > 0 &&
    input.hnStructure !== undefined &&
    input.hnStructure.length > 0

  let aiSuggestion: number | null = null
  let aiReasoning = ''
  let aiUsage: import('../external/claude.service.js').ApiUsage | undefined
  if (shouldAskAi) {
    const ai = await askAi(input)
    if (ai) {
      aiSuggestion = ai.value
      aiReasoning = ai.reasoning
      aiUsage = ai.usage
    }
  }

  const heuristic = computeHeuristic(input)
  const finalValue = aiSuggestion ?? heuristic.value
  const finalReasoning = aiSuggestion !== null ? aiReasoning : heuristic.reasoning

  return {
    recommended: finalValue,
    breakdown: {
      typeBase: { min: base.min, max: base.max, midpoint: baseMid },
      competitorsAvg: input.competitorsAvgWordCount,
      aiSuggestion,
      finalRecommendation: finalValue,
      reasoning: finalReasoning,
    },
    usage: aiUsage,
  }
}
