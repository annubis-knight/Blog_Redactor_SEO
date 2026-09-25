/**
 * Porte « verrouiller le capitaine » (FR-CAP-LOCK-GATE).
 *
 * Le pilier 1013 a été rédigé sur « stratégie digitale entreprises Toulouse » :
 * volume inconnu, autocomplétion vide, et une SERP 100 % agences pour un article
 * « guide ». Rien n'a alerté. Cette porte lève une alarme dans ces cas :
 *
 *   🔴 volume inconnu ou nul, verdict NO-GO, intention de la SERP incompatible
 *      avec celle attendue pour l'article ;
 *   🟠 Google ne suggère pas la requête (autocomplétion vide).
 */
import type { ArticleLevel } from '../types/keyword-validate.types.js'
import type { PainIntentExpected } from '../types/scoring.types.js'
import type { GateIssue } from './gate.js'

export interface CaptainAlternative {
  keyword: string
  volume: number
}

export interface CaptainGateInput {
  keyword: string
  level: ArticleLevel
  /** Volume mensuel ; `null` = jamais mesuré ou donnée absente. */
  volume: number | null
  /** Nombre de suggestions Google ; `null` = pas récupéré. */
  autocompleteCount: number | null
  verdict: 'GO' | 'ORANGE' | 'NO-GO' | 'GRAY' | null
  /** Intention dominante de la SERP (DataForSEO) ; `null` = inconnue. */
  serpIntent: PainIntentExpected | null
  /** Intention attendue pour l'article (Cerveau) ; `null` = non précisée. */
  expectedIntent: PainIntentExpected | null
  /** Autres candidats explorés pour cet article, avec un volume mesuré. */
  alternatives: CaptainAlternative[]
}

const INTENT_LABELS: Record<PainIntentExpected, string> = {
  informational: 'informationnelle (on cherche à comprendre)',
  commercial: 'commerciale (on compare des prestataires)',
  transactional: 'transactionnelle (on veut acheter ou contacter)',
  navigational: 'de navigation (on cherche un site précis)',
}

/**
 * Intention attendue : celle du Cerveau, sinon « informationnelle » pour un
 * pilier (un guide complet répond à une question, il ne vend pas).
 */
export function expectedCaptainIntent(level: ArticleLevel, expected: PainIntentExpected | null): PainIntentExpected | null {
  return expected ?? (level === 'pilier' ? 'informational' : null)
}

function formatAlternatives(alternatives: CaptainAlternative[], keyword: string): string[] {
  return alternatives
    .filter(a => a.volume > 0 && a.keyword.trim().toLowerCase() !== keyword.trim().toLowerCase())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map(a => `${a.keyword} (${a.volume.toLocaleString('fr-FR')} recherches/mois)`)
}

export function verifyCaptain(input: CaptainGateInput): GateIssue[] {
  const issues: GateIssue[] = []
  const alternatives = formatAlternatives(input.alternatives, input.keyword)

  if (input.volume === null) {
    issues.push({
      rule: 'captain-volume-unknown',
      level: 'risque',
      message: `Aucun volume de recherche mesuré pour « ${input.keyword} ».`,
      risk: 'Vous risquez d’écrire pour une requête que presque personne ne tape.',
      alternatives,
    })
  } else if (input.volume === 0) {
    issues.push({
      rule: 'captain-volume-zero',
      level: 'risque',
      message: `« ${input.keyword} » : 0 recherche par mois selon DataForSEO.`,
      risk: 'Un article bien classé sur une requête que personne ne tape n’apporte aucune visite.',
      alternatives,
    })
  }

  if (input.verdict === 'NO-GO') {
    issues.push({
      rule: 'captain-verdict-nogo',
      level: 'risque',
      message: 'Le verdict du mot-clé est NO-GO : aucun signal de demande (volume, questions, suggestions).',
      risk: 'Le mot-clé ne correspond à aucune recherche observable.',
      alternatives,
    })
  }

  const expected = expectedCaptainIntent(input.level, input.expectedIntent)
  if (expected && input.serpIntent && input.serpIntent !== expected) {
    const informationalVsSales = expected === 'informational'
      && (input.serpIntent === 'commercial' || input.serpIntent === 'transactional')
    issues.push({
      rule: 'captain-intent-mismatch',
      level: informationalVsSales ? 'risque' : 'attention',
      message: `Google traite cette requête comme ${INTENT_LABELS[input.serpIntent]}, alors que l’article vise une intention ${INTENT_LABELS[expected]}.`,
      risk: informationalVsSales
        ? 'Sur une requête commerciale, Google classe des pages de service et des comparatifs d’agences, pas des guides : l’article a peu de chances d’apparaître. Une page de service conviendrait mieux, ou une requête informationnelle.'
        : 'L’article risque de ne pas répondre à ce que le lecteur attend en tapant cette requête.',
      alternatives,
    })
  }

  if (input.autocompleteCount === 0) {
    issues.push({
      rule: 'captain-autocomplete-empty',
      level: 'attention',
      message: 'Google ne suggère pas cette requête quand on commence à la taper.',
      risk: 'Signal faible de demande : la requête est peut-être trop longue ou trop rare.',
    })
  }

  return issues
}
