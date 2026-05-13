import type { ProposedArticle } from '@shared/types/index.js'
import type { ArticleLevel } from './types'
import { buildSingleArticle } from './builders'

/**
 * Parsers JSON appliqués aux réponses IA pour extraire des `ProposedArticle`
 * et autres structures (PAA, sujets). Toutes les fonctions de ce fichier sont
 * pures : elles n'accèdent ni au store, ni à Vue, ni à des API externes.
 */

/**
 * Tente de parser un seul article depuis une chaîne JSON (parfois enveloppée dans
 * un fence ```json) ; si le JSON entier échoue, repli sur une regex qui isole le
 * premier objet contenant `"title"`.
 */
export function parseSingleArticle(
  text: string,
  fallbackType: ArticleLevel,
): ProposedArticle | null {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try {
    const obj = JSON.parse(stripped)
    const item = Array.isArray(obj) ? obj[0] : obj
    if (item?.title && typeof item.title === 'string') {
      return buildSingleArticle(item, fallbackType)
    }
  } catch { /* try regex fallback */ }

  const match = stripped.match(/\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*\}/)
  if (match) {
    try {
      const obj = JSON.parse(match[0])
      return buildSingleArticle(obj, fallbackType)
    } catch { /* give up */ }
  }
  return null
}

/**
 * Extrait tous les articles trouvés dans une chaîne (objet par objet via regex).
 * Tolère les objets malformés (skip silencieux). Le type par défaut est `Spécialisé`
 * si l'IA ne précise pas ou fournit une valeur invalide.
 */
export function extractArticlesFromJson(text: string): ProposedArticle[] {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
  const objectRegex = /\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*\}/g
  const matches = stripped.match(objectRegex)
  if (!matches) return []

  const articles: ProposedArticle[] = []
  for (const raw of matches) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>
      if (typeof obj.title === 'string' && obj.title.trim()) {
        articles.push(buildSingleArticle(obj, 'specifique'))
      }
    } catch { /* skip malformed object */ }
  }
  return articles
}

/**
 * Extrait les requêtes "People Also Ask" depuis une suggestion IA :
 * tableau d'objets `{ interTitle, searchQueries[] }`. Tolère les objets malformés.
 */
export function extractPaaQueries(text: string): Array<{ interTitle: string; searchQueries: string[] }> {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
  try {
    const jsonMatch = stripped.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]) as Array<{ interTitle: string; searchQueries: string[] }>
      return arr.filter(item => item.interTitle && Array.isArray(item.searchQueries))
    }
  } catch { /* fallback to regex */ }

  const objectRegex = /\{[^{}]*"interTitle"\s*:\s*"[^"]+?"[^{}]*\}/g
  const matches = stripped.match(objectRegex)
  if (!matches) return []

  const results: Array<{ interTitle: string; searchQueries: string[] }> = []
  for (const raw of matches) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>
      if (typeof obj.interTitle === 'string' && Array.isArray(obj.searchQueries)) {
        results.push({
          interTitle: obj.interTitle,
          searchQueries: (obj.searchQueries as string[]).filter(q => typeof q === 'string'),
        })
      }
    } catch { /* skip */ }
  }
  return results
}

/**
 * Parse la suggestion IA structurée (Pilier + Intermédiaires ou Spécialisés) :
 * tente d'abord JSON.parse sur le tableau capturé, sinon retombe sur
 * `extractArticlesFromJson` (objet par objet).
 */
export function parseArticlesFromSuggestion(suggestion: string): ProposedArticle[] {
  try {
    const jsonMatch = suggestion.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const rawArticles = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>
      return rawArticles.map(a => buildSingleArticle(a, 'specifique'))
    }
  } catch { /* try object-by-object */ }
  return extractArticlesFromJson(suggestion)
}

/**
 * Parse une suggestion IA contenant des sujets éditoriaux. Accepte trois formes :
 *  - tableau de strings JSON
 *  - tableau d'objets `{ topic: string }`
 *  - texte libre dans lequel un tableau JSON est encapsulé
 */
export function parseTopicsFromSuggestion(raw: string): string[] {
  // Strip code fences if present
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed.filter(s => s.trim().length > 0)
    }
    // Handle array of objects with topic field
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'object' && item.topic)) {
      return parsed.map(item => item.topic).filter((s: string) => s.trim().length > 0)
    }
  } catch {
    // Try to extract a JSON array from the text
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        const arr = JSON.parse(match[0])
        if (Array.isArray(arr)) return arr.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)
      } catch { /* give up */ }
    }
  }
  return []
}
