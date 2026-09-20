/**
 * Contrôle qualité du contenu AVANT l'export disque.
 *
 * Deux niveaux, volontairement distincts (audit 2026-09-19) :
 *
 *   - **Bloquant** — le monologue de l'IA (« Je vais d'abord faire une
 *     recherche… »). C'est un défaut technique objectif : aucun article ne doit
 *     sortir avec ça. On refuse d'écrire le fichier ; le contenu reste en base,
 *     corrigeable dans l'éditeur.
 *   - **Non bloquant** — les preuves invérifiables (« nous avons testé auprès de
 *     50 PME »). Un vrai cas client fourni par l'utilisateur déclencherait la
 *     même alerte : on signale, on ne bloque pas.
 *
 * Fonctions PURES : entrée = contenu HTML, sortie = décision. Zone TDD strict.
 */

import { detectAiMetaLeaks, type AiMetaLeak } from '../../../shared/ai-text.js'

/** Nombre de fuites détaillées dans le rapport CLI (les suivantes sont comptées). */
const REPORTED_LEAKS = 5

export interface ContentCheckResult {
  /** `false` → ne pas exporter. */
  ok: boolean
  leaks: AiMetaLeak[]
  /** Rapport prêt à afficher dans le terminal (vide si tout va bien). */
  report: string
}

/**
 * Motifs de preuve sociale invérifiable.
 *
 * Calibrés sur les inventions réelles de #455 (« testées auprès de plus de
 * 50 PME toulousaines »). Une statistique attribuée à une source externe
 * (« selon BrightLocal, 76 % … ») ne doit PAS déclencher d'alerte.
 */
/**
 * Fin de mot tolérante aux accents — `\b` ne voit que `[A-Za-z0-9_]`, donc
 * `augmenté\b` ne matche jamais (« é » n'est pas un caractère de mot).
 */
const WORD_END = '(?![\\p{L}\\p{N}_])'

const CLAIM_PATTERNS: { name: string; re: RegExp }[] = [
  {
    name: 'experience-client-inventee',
    re: new RegExp(
      `\\bnous avons (?:testé(?:e?s)?|accompagné(?:e?s)?|aidé(?:e?s)?|audité(?:e?s)?|travaillé avec|suivi)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'volume-clients',
    re: new RegExp(
      `\\b(?:plus de|près de|environ)\\s*\\d{2,}\\s*(?:pme|tpe|clients|entreprises|artisans|sites)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'resultat-client',
    re: new RegExp(
      `\\bnos (?:clients|pme|artisans)\\b[^.!?]{0,80}\\b(?:ont|a) (?:augmenté|doublé|triplé|gagné|multiplié)${WORD_END}`,
      'giu',
    ),
  },
]

export interface UnverifiableClaim {
  pattern: string
  excerpt: string
}

/** Extrait lisible autour d'une position, balises retirées. */
function excerptAround(text: string, index: number): string {
  return text
    .slice(Math.max(0, index - 40), index + 110)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Signale les affirmations que PropulSite ne peut pas prouver.
 * Non bloquant : à relire avant publication.
 */
export function detectUnverifiableClaims(content: string): UnverifiableClaim[] {
  if (!content) return []
  const claims: UnverifiableClaim[] = []

  for (const { name, re } of CLAIM_PATTERNS) {
    re.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(content)) !== null) {
      claims.push({ pattern: name, excerpt: excerptAround(content, match.index) })
      if (match.index === re.lastIndex) re.lastIndex++
    }
  }

  return claims
}

/**
 * Verdict d'export. Un contenu vide est refusé : il n'y a rien à publier et
 * c'est le signe d'une rédaction qui a échoué en silence.
 */
export function checkContentBeforeExport(content: string): ContentCheckResult {
  if (!content || !content.trim()) {
    return { ok: false, leaks: [], report: '  Contenu vide — rien à exporter.' }
  }

  const leaks = detectAiMetaLeaks(content, { max: REPORTED_LEAKS })
  if (leaks.length === 0) return { ok: true, leaks: [], report: '' }

  const all = detectAiMetaLeaks(content, { max: 100 })
  const lines = leaks.map((leak, i) => `  ${i + 1}. « …${leak.excerpt}… »`)
  if (all.length > leaks.length) {
    lines.push(`  (+ ${all.length - leaks.length} autre(s) occurrence(s))`)
  }

  return { ok: false, leaks, report: lines.join('\n') }
}
