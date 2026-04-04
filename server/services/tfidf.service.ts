import type { SerpCompetitor, TfidfTerm, TfidfResult } from '../../shared/types/serp-analysis.types.js'
import { log } from '../utils/logger.js'

const FRENCH_STOPWORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'a', 'au', 'aux',
  'pour', 'par', 'sur', 'avec', 'dans', 'qui', 'que', 'est', 'sont', 'ce', 'cette',
  'ces', 'il', 'elle', 'ils', 'elles', 'nous', 'vous', 'on', 'se', 'ne', 'pas',
  'plus', 'ou', 'mais', 'si', 'son', 'sa', 'ses', 'leur', 'leurs', 'mon', 'ma',
  'mes', 'ton', 'ta', 'tes', 'notre', 'votre', 'tout', 'tous', 'toute', 'toutes',
  'autre', 'autres', 'meme', 'aussi', 'bien', 'fait', 'faire', 'peut', 'comme',
  'etre', 'avoir', 'entre', 'dont', 'tres', 'puis', 'sans', 'chez', 'vers',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !FRENCH_STOPWORDS.has(t) && !/^\d+$/.test(t))
}

export function extractTfidf(competitors: SerpCompetitor[], keyword: string): TfidfResult {
  const valid = competitors.filter(c => !c.fetchError && c.textContent.length > 0)
  const total = valid.length
  log.debug('extractTfidf', { keyword, competitors: competitors.length, valid: total })
  if (total === 0) {
    log.warn('extractTfidf — aucun concurrent valide', { keyword })
    return { keyword, totalCompetitors: 0, obligatoire: [], differenciateur: [], optionnel: [] }
  }

  // Tokenize each document
  const docs = valid.map(c => tokenize(c.textContent))

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
