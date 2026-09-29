/**
 * Porte « valider le lexique » (FR-LEX-METIER-ONLY).
 *
 * Le lexique du pilier 1013 contenait « être », « votre », « vos » : un mot
 * vide n'apprend rien à la rédaction et gonfle la couverture du score SEO.
 *
 *   🔴 lexique vide — la rédaction n'aura aucun vocabulaire métier à couvrir ;
 *      assumable (un article très court, par exemple), pas un défaut technique ;
 *   🔴 terme générique (mot vide ou décor de page) — une alerte par terme,
 *      pour qu'une dérogation n'en couvre qu'un.
 */
import type { GateIssue } from './gate.js'
import { isGenericTerm, normalizeTerm } from '../utils/generic-terms.js'

export interface LexiqueGateInput {
  terms: string[]
}

export function verifyLexique(input: LexiqueGateInput): GateIssue[] {
  const terms = input.terms.map(t => t.trim()).filter(Boolean)
  if (terms.length === 0) {
    return [{
      rule: 'lexique-empty',
      level: 'risque',
      message: 'Aucun terme retenu : le lexique est vide.',
      risk: 'La rédaction n’aura aucun vocabulaire métier à couvrir : le texte risque de rester générique.',
    }]
  }
  const seen = new Set<string>()
  const issues: GateIssue[] = []
  for (const term of terms) {
    const key = normalizeTerm(term)
    if (seen.has(key) || !isGenericTerm(term)) continue
    seen.add(key)
    issues.push({
      rule: `lexique-generic-term:${key}`,
      level: 'risque',
      message: `« ${term} » n’est pas un mot du métier.`,
      risk: 'Un mot vide ou de décor de page n’apprend rien à la rédaction et fausse la couverture du lexique.',
    })
  }
  return issues
}
