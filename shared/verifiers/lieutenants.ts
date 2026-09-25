/**
 * Porte « verrouiller les lieutenants » (FR-LIE-LOCK-GATE).
 *
 * Deux risques, relevés sur le pilier 1013 (un seul lieutenant retenu) :
 *   - trop peu de lieutenants pour le type d'article : l'article ne couvre pas
 *     les recherches voisines qui font sa force ;
 *   - un lieutenant déjà visé par un autre article du cocon : les deux pages se
 *     font concurrence dans Google (cannibalisation).
 */
import { ARTICLE_TYPE_RULES } from '../constants/article-type-rules.js'
import type { ArticleLevel } from '../types/keyword-validate.types.js'
import type { GateIssue } from './gate.js'

export interface CocoonKeywordClaim {
  keyword: string
  articleTitle: string
  /** Rôle du mot-clé dans l'autre article. */
  role: 'capitaine' | 'lieutenant'
}

export interface LieutenantsGateInput {
  level: ArticleLevel
  captain: string | null
  lieutenants: string[]
  /** Capitaines et lieutenants déjà posés sur les AUTRES articles du cocon. */
  cocoonClaims: CocoonKeywordClaim[]
  /** Candidats proposés mais non retenus (pistes pour l'alarme). */
  unselectedCandidates?: string[]
}

export function normalizeKeyword(keyword: string): string {
  return keyword
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

export function verifyLieutenants(input: LieutenantsGateInput): GateIssue[] {
  const issues: GateIssue[] = []
  const rules = ARTICLE_TYPE_RULES[input.level]
  const lieutenants = input.lieutenants.map(l => l.trim()).filter(Boolean)

  if (lieutenants.length < rules.minLieutenants) {
    issues.push({
      rule: 'lieutenants-too-few',
      level: 'risque',
      message: `${lieutenants.length} lieutenant${lieutenants.length > 1 ? 's' : ''} pour un article ${rules.label} : le minimum conseillé est ${rules.minLieutenants}.`,
      risk: 'L’article couvrira trop peu de recherches voisines pour se positionner au-delà de son mot-clé principal.',
      alternatives: (input.unselectedCandidates ?? []).slice(0, 5),
    })
  }

  const captain = input.captain ? normalizeKeyword(input.captain) : null
  for (const lieutenant of lieutenants) {
    const key = normalizeKeyword(lieutenant)
    if (captain && key === captain) {
      issues.push({
        rule: `lieutenant-is-captain:${key}`,
        level: 'attention',
        message: `« ${lieutenant} » est déjà le capitaine de cet article.`,
        risk: 'Un lieutenant identique au capitaine n’apporte aucune recherche voisine.',
      })
      continue
    }
    const claims = input.cocoonClaims.filter(c => normalizeKeyword(c.keyword) === key)
    const captainClaim = claims.find(c => c.role === 'capitaine')
    if (captainClaim) {
      issues.push({
        rule: `lieutenant-cannibalization:${key}`,
        level: 'risque',
        message: `« ${lieutenant} » est le mot-clé principal de l’article « ${captainClaim.articleTitle} » du même cocon.`,
        risk: 'Deux pages du même site sur le même mot-clé se font concurrence : Google n’en retient souvent qu’une, et pas forcément la bonne.',
        excerpt: lieutenant,
      })
    } else if (claims.length > 0) {
      issues.push({
        rule: `lieutenant-shared:${key}`,
        level: 'attention',
        message: `« ${lieutenant} » est aussi un lieutenant de « ${claims[0]!.articleTitle} ».`,
        risk: 'Partager un mot-clé secondaire est courant ; veillez seulement à ce que les deux articles l’abordent sous des angles différents.',
        excerpt: lieutenant,
      })
    }
  }
  return issues
}
