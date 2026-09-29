import type { TfidfTerm, TfidfResult } from '../../../shared/types/serp-analysis.types.js'
import { getSerpScrapes } from './keyword-serp.service.js'
import { log } from '../../utils/logger.js'
import { isGenericWord } from '../../../shared/utils/generic-terms.js'

// Mots vides et décor de page : source unique, comparée sans accents
// (FR-LEX-METIER-ONLY, épopée qualité SEO M4). L'ancienne liste disait « etre »
// sans accent et laissait passer « être », « vos », « nos ».
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => !isGenericWord(t))
}

/**
 * Pure function : calcule un TfidfResult à partir d'une liste de textes
 * déjà filtrés (scrape valide ↔ text_content non-null/non-vide).
 *
 * Story C1 — extrait pour rester testable sans DB. `extractTfidf` charge
 * désormais les scrapes via `getSerpScrapes` puis délègue ici.
 */
export function computeTfidfFromTexts(texts: string[], keyword: string): TfidfResult {
  const total = texts.length
  log.debug('computeTfidfFromTexts', { keyword, valid: total })
  if (total === 0) {
    log.warn('computeTfidfFromTexts — aucun concurrent valide', { keyword })
    return { keyword, totalCompetitors: 0, obligatoire: [], differenciateur: [], optionnel: [] }
  }

  const docs = texts.map((t) => tokenize(t))

  // Compute document frequency and total occurrences for each term
  const termStats = new Map<string, { docCount: number; totalOccurrences: number }>()

  for (const tokens of docs) {
    const termCounts = new Map<string, number>()
    for (const t of tokens) {
      termCounts.set(t, (termCounts.get(t) ?? 0) + 1)
    }
    for (const [term, count] of termCounts) {
      const existing = termStats.get(term)
      if (existing) {
        existing.docCount++
        existing.totalOccurrences += count
      } else {
        termStats.set(term, { docCount: 1, totalOccurrences: count })
      }
    }
  }

  // Classify and build result
  const allTerms: TfidfTerm[] = []
  for (const [term, stats] of termStats) {
    const df = stats.docCount / total
    const density = Math.round(stats.totalOccurrences / total * 10) / 10
    allTerms.push({
      term,
      level: df >= 0.7 ? 'obligatoire' : df >= 0.3 ? 'differenciateur' : 'optionnel',
      documentFrequency: Math.round(df * 100) / 100,
      density,
      competitorCount: stats.docCount,
      totalCompetitors: total,
    })
  }

  // Sort by density descending, limit per level
  const byLevel = (level: TfidfTerm['level']) =>
    allTerms.filter(t => t.level === level).sort((a, b) => b.density - a.density).slice(0, 50)

  const result = {
    keyword,
    totalCompetitors: total,
    obligatoire: byLevel('obligatoire'),
    differenciateur: byLevel('differenciateur'),
    optionnel: byLevel('optionnel'),
  }
  log.info('extractTfidf — résultat', { keyword, obligatoire: result.obligatoire.length, differenciateur: result.differenciateur.length, optionnel: result.optionnel.length })
  return result
}

/**
 * Story C1 — Async TF-IDF extraction reading directly from `keyword_serp_scrapes`.
 * Cross-article : 1 ligne par (keyword, lang, country, position). Filtre les
 * scrapes invalides (text_content null ou vide), passe le reste à computeTfidfFromTexts.
 */
export async function extractTfidf(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<TfidfResult> {
  const scrapes = await getSerpScrapes(keyword, lang, country)
  const validTexts = scrapes
    .filter((s) => s.textContent !== null && s.textContent.length > 0)
    .map((s) => s.textContent as string)
  return computeTfidfFromTexts(validTexts, keyword)
}
