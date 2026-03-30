import { getCocoons, getKeywordsByCocoon, saveArticleKeywords, getArticleKeywordsByCocoon } from './data.service.js'
import type { ArticleKeywords, Keyword, Cocoon } from '../../shared/types/index.js'
import { log } from '../utils/logger.js'

export interface MigrationPreview {
  cocoonName: string
  assignments: ArticleKeywordAssignment[]
  warnings: string[]
}

export interface ArticleKeywordAssignment {
  articleSlug: string
  articleTitle: string
  articleType: string
  capitaine: string
  lieutenants: string[]
  lexique: string[]  // empty until Claude generates it
}

/** Generate a migration preview for a cocoon — no side effects */
export async function previewMigration(cocoonName: string): Promise<MigrationPreview> {
  const cocoons = await getCocoons()
  const cocoon = cocoons.find(c => c.name === cocoonName)
  if (!cocoon) throw new Error(`Cocoon not found: ${cocoonName}`)

  const keywords = await getKeywordsByCocoon(cocoonName) ?? []
  const existing = await getArticleKeywordsByCocoon(cocoonName)

  const pilierKws = keywords.filter(k => k.type === 'Pilier')
  const moyenneKws = keywords.filter(k => k.type === 'Moyenne traine')
  const longueKws = keywords.filter(k => k.type === 'Longue traine')

  const pilierArticles = cocoon.articles.filter(a => a.type === 'Pilier')
  const interArticles = cocoon.articles.filter(a => a.type === 'Intermédiaire')
  const specArticles = cocoon.articles.filter(a => a.type === 'Spécialisé')

  const assignments: ArticleKeywordAssignment[] = []
  const warnings: string[] = []

  // Assign Pilier keywords to Pilier articles
  for (let i = 0; i < pilierArticles.length; i++) {
    const article = pilierArticles[i]!
    const capitaine = pilierKws[i]?.keyword ?? ''
    assignments.push({
      articleSlug: article.slug,
      articleTitle: article.title,
      articleType: article.type,
      capitaine,
      lieutenants: [],
      lexique: [],
    })
  }

  // Distribute Moyenne traine keywords as Lieutenants across Intermédiaire articles
  for (let i = 0; i < interArticles.length; i++) {
    const article = interArticles[i]!
    // Each intermédiaire gets a share of moyenne traine keywords
    const start = Math.floor((i * moyenneKws.length) / Math.max(interArticles.length, 1))
    const end = Math.floor(((i + 1) * moyenneKws.length) / Math.max(interArticles.length, 1))
    const assigned = moyenneKws.slice(start, end)
    const capitaine = assigned[0]?.keyword ?? ''
    const lieutenants = assigned.slice(1).map(k => k.keyword)

    assignments.push({
      articleSlug: article.slug,
      articleTitle: article.title,
      articleType: article.type,
      capitaine,
      lieutenants,
      lexique: [],
    })
  }

  // Distribute Longue traine keywords as Lieutenants across Spécialisé articles
  for (let i = 0; i < specArticles.length; i++) {
    const article = specArticles[i]!
    const start = Math.floor((i * longueKws.length) / Math.max(specArticles.length, 1))
    const end = Math.floor(((i + 1) * longueKws.length) / Math.max(specArticles.length, 1))
    const assigned = longueKws.slice(start, end)
    const capitaine = assigned[0]?.keyword ?? ''
    const lieutenants = assigned.slice(1).map(k => k.keyword)

    assignments.push({
      articleSlug: article.slug,
      articleTitle: article.title,
      articleType: article.type,
      capitaine,
      lieutenants,
      lexique: [],
    })
  }

  // Check for duplicate capitaines
  const capitaines = assignments.map(a => a.capitaine).filter(c => c)
  const seen = new Set<string>()
  for (const c of capitaines) {
    if (seen.has(c)) {
      warnings.push(`Capitaine dupliqué dans le cocon : "${c}"`)
    }
    seen.add(c)
  }

  // Check for already assigned articles
  for (const ex of existing) {
    if (ex.capitaine) {
      warnings.push(`L'article "${ex.articleSlug}" a déjà des keywords assignés (capitaine: "${ex.capitaine}")`)
    }
  }

  return { cocoonName, assignments, warnings }
}

/** Apply migration — save all assignments */
export async function applyMigration(assignments: ArticleKeywordAssignment[]): Promise<ArticleKeywords[]> {
  const results: ArticleKeywords[] = []
  for (const assignment of assignments) {
    const saved = await saveArticleKeywords(assignment.articleSlug, {
      capitaine: assignment.capitaine,
      lieutenants: assignment.lieutenants,
      lexique: assignment.lexique,
    })
    results.push(saved)
  }
  log.info(`Migration applied for ${results.length} articles`)
  return results
}
