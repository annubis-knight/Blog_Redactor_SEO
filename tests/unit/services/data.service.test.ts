import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCocoons,
  getArticlesByCocoon,
  getArticleBySlug,
  getKeywordsByCocoon,
  getTheme,
  getSilos,
  getSiloByName,
  getCocoonsBySilo,
  resetCache,
} from '../../../server/services/infra/data.service.js'

beforeEach(() => {
  resetCache()
})

/**
 * Ces tests lisent la base réelle. Le contenu éditorial (articles) est
 * remis à zéro de temps en temps : on ne fige donc aucun titre ni slug,
 * on prend le premier article réellement présent. Une base sans aucun
 * article fait échouer le test, jamais passer en silence.
 */
async function firstArticleInDb() {
  const cocoons = await getCocoons()
  const cocoonIndex = cocoons.findIndex(c => c.articles.length > 0)
  expect(cocoonIndex, 'aucun article en base : impossible de tester la lecture').toBeGreaterThanOrEqual(0)
  const cocoon = cocoons[cocoonIndex]!
  return { cocoonIndex, cocoon, article: cocoon.articles[0]! }
}

// Mots-clés semés à l'initialisation, indépendants des articles.
const SEEDED_KEYWORDS_COCOON = 'Croissance digitale Toulouse'

describe('data.service — getCocoons', () => {
  it('returns all cocoons', async () => {
    const cocoons = await getCocoons()
    expect(cocoons.length).toBeGreaterThanOrEqual(6)
  })

  it('each cocoon has id, name, siloName, articles, and stats', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      expect(cocoon).toHaveProperty('id')
      expect(cocoon).toHaveProperty('name')
      expect(cocoon).toHaveProperty('siloName')
      expect(cocoon).toHaveProperty('articles')
      expect(cocoon).toHaveProperty('stats')
      expect(typeof cocoon.id).toBe('number')
      expect(typeof cocoon.name).toBe('string')
      expect(typeof cocoon.siloName).toBe('string')
      expect(Array.isArray(cocoon.articles)).toBe(true)
    }
  })

  it('first cocoon is "Croissance digitale Toulouse" (first in Stratégie & Visibilité silo)', async () => {
    const cocoons = await getCocoons()
    expect(cocoons[0]!.name).toBe('Croissance digitale Toulouse')
  })

  it('stats totalArticles matches articles length', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      expect(cocoon.stats.totalArticles).toBe(cocoon.articles.length)
    }
  })

  it('stats byType counts sum to totalArticles', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      const { pilier, intermediaire, specialise } = cocoon.stats.byType
      expect(pilier + intermediaire + specialise).toBe(cocoon.stats.totalArticles)
    }
  })

  it('articles have camelCase properties', async () => {
    const { article } = await firstArticleInDb()
    expect(article).toHaveProperty('title')
    expect(article).toHaveProperty('type')
    expect(article).toHaveProperty('slug')
    expect(article).toHaveProperty('topic')
    expect(article).toHaveProperty('status')
  })

  it('slug is extracted from URL (not full URL)', async () => {
    const { article } = await firstArticleInDb()
    expect(article.slug).not.toContain('https://')
    expect(article.slug).not.toContain('http://')
  })
})

/**
 * FR-MOT-RECAP-PUBLISHED — `publishedArticles` est un champ dérivé sur la payload
 * Cocoon, filtré sur `phase IN ('redaction', 'published')`. Garantit que les sections
 * récap "Articles suggérés" et "Articles publiés" du MoteurContextRecap ne se
 * chevauchent jamais (bug 2026-05-11 : 13 articles Cerveau apparaissaient dans
 * les deux listes simultanément).
 */
describe('data.service — getCocoons.publishedArticles (FR-MOT-RECAP-PUBLISHED)', () => {
  it('AC.RECAP-PUB.3: chaque cocon expose un champ publishedArticles (Article[])', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      expect(cocoon).toHaveProperty('publishedArticles')
      expect(Array.isArray(cocoon.publishedArticles)).toBe(true)
    }
  })

  it('AC.RECAP-PUB.2: publishedArticles ne contient aucun article phase=proposed ni phase=moteur', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      for (const article of cocoon.publishedArticles) {
        expect(article.phase).not.toBe('proposed')
        expect(article.phase).not.toBe('moteur')
      }
    }
  })

  it('publishedArticles ne contient QUE des articles phase=redaction ou phase=published', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      for (const article of cocoon.publishedArticles) {
        expect(['redaction', 'published']).toContain(article.phase)
      }
    }
  })

  it('AC.RECAP-PUB.1: publishedArticles.length === count(articles where phase IN (redaction, published))', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      const expected = cocoon.articles.filter(
        a => a.phase === 'redaction' || a.phase === 'published',
      ).length
      expect(cocoon.publishedArticles.length).toBe(expected)
    }
  })

  it('publishedArticles ⊂ articles (chaque entrée est référencée dans articles par id)', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      const articleIds = new Set(cocoon.articles.map(a => a.id))
      for (const published of cocoon.publishedArticles) {
        expect(articleIds.has(published.id)).toBe(true)
      }
    }
  })
})

describe('data.service — getArticlesByCocoon', () => {
  it('returns articles for valid cocoon index', async () => {
    const { cocoonIndex, cocoon } = await firstArticleInDb()
    const articles = await getArticlesByCocoon(cocoonIndex)
    expect(articles).not.toBeNull()
    expect(articles!.map(a => a.id)).toEqual(cocoon.articles.map(a => a.id))
  })

  it('returns null for out-of-range index', async () => {
    const articles = await getArticlesByCocoon(99)
    expect(articles).toBeNull()
  })

  it('returns null for negative index', async () => {
    const articles = await getArticlesByCocoon(-1)
    expect(articles).toBeNull()
  })
})

describe('data.service — getArticleBySlug', () => {
  it('returns article and cocoonName for valid slug', async () => {
    const { cocoon, article } = await firstArticleInDb()
    const result = await getArticleBySlug(article.slug)
    expect(result).not.toBeNull()
    expect(result!.article.id).toBe(article.id)
    expect(result!.article.title).toBe(article.title)
    expect(result!.article.type).toBe(article.type)
    expect(result!.cocoonName).toBe(cocoon.name)
  })

  it('accepts a full URL and extracts the slug', async () => {
    const { article } = await firstArticleInDb()
    const result = await getArticleBySlug(`https://www.propulsitetoulouse.website/blog/${article.slug}`)
    expect(result!.article.id).toBe(article.id)
  })

  it('returns null for non-existent slug', async () => {
    const result = await getArticleBySlug('this-slug-does-not-exist')
    expect(result).toBeNull()
  })

  it('returned article has all expected fields', async () => {
    const { article } = await firstArticleInDb()
    const result = await getArticleBySlug(article.slug)
    expect(result!.article).toHaveProperty('title')
    expect(result!.article).toHaveProperty('type')
    expect(result!.article).toHaveProperty('slug')
    expect(result!.article).toHaveProperty('topic')
    expect(result!.article).toHaveProperty('status')
  })
})

describe('data.service — getKeywordsByCocoon', () => {
  it('returns keywords for valid cocoon name', async () => {
    const keywords = await getKeywordsByCocoon(SEEDED_KEYWORDS_COCOON)
    expect(keywords).not.toBeNull()
    expect(keywords!.length).toBeGreaterThan(0)
  })

  it('keywords have camelCase properties', async () => {
    const keywords = await getKeywordsByCocoon(SEEDED_KEYWORDS_COCOON)
    const kw = keywords![0]!
    expect(kw).toHaveProperty('keyword')
    expect(kw).toHaveProperty('cocoonName')
    expect(kw).toHaveProperty('type')
  })

  it('returns null for non-existent cocoon', async () => {
    const keywords = await getKeywordsByCocoon('Nonexistent Cocoon')
    expect(keywords).toBeNull()
  })

  it('all keywords belong to the requested cocoon', async () => {
    const cocoonName = SEEDED_KEYWORDS_COCOON
    const keywords = await getKeywordsByCocoon(cocoonName)
    for (const kw of keywords!) {
      expect(kw.cocoonName).toBe(cocoonName)
    }
  })
})

describe('data.service — getTheme', () => {
  it('returns the blog theme with nom and description', async () => {
    const theme = await getTheme()
    expect(theme).toHaveProperty('nom')
    expect(theme).toHaveProperty('description')
    expect(typeof theme.nom).toBe('string')
    expect(theme.nom.length).toBeGreaterThan(0)
  })
})

describe('data.service — getSilos', () => {
  it('returns at least the seeded silos', async () => {
    // Robuste à la croissance de l'arbre : l'utilisateur peut ajouter des silos
    // (POST /api/silos), on n'ancre donc plus un nombre figé.
    const silos = await getSilos()
    expect(silos.length).toBeGreaterThanOrEqual(3)
  })

  it('each silo has id, nom, description, cocons, and stats', async () => {
    const silos = await getSilos()
    for (const silo of silos) {
      expect(silo).toHaveProperty('id')
      expect(silo).toHaveProperty('nom')
      expect(silo).toHaveProperty('description')
      expect(silo).toHaveProperty('cocons')
      expect(silo).toHaveProperty('stats')
      expect(Array.isArray(silo.cocons)).toBe(true)
      expect(silo.cocons.length).toBeGreaterThan(0)
    }
  })

  it('silo stats totalArticles matches sum of cocoon articles', async () => {
    const silos = await getSilos()
    for (const silo of silos) {
      const totalFromCocoons = silo.cocons.reduce((sum, c) => sum + c.articles.length, 0)
      expect(silo.stats!.totalArticles).toBe(totalFromCocoons)
    }
  })

  it('first silo is "Stratégie & Visibilité"', async () => {
    const silos = await getSilos()
    expect(silos[0]!.nom).toBe('Stratégie & Visibilité')
  })
})

describe('data.service — getSiloByName', () => {
  it('returns silo for valid name', async () => {
    const silo = await getSiloByName('Contenu & Message')
    expect(silo).not.toBeNull()
    expect(silo!.nom).toBe('Contenu & Message')
  })

  it('returns null for non-existent silo', async () => {
    const silo = await getSiloByName('Nonexistent Silo')
    expect(silo).toBeNull()
  })
})

describe('data.service — getCocoonsBySilo', () => {
  it('returns cocoons for valid silo name', async () => {
    // Le nombre de cocons évolue avec la stratégie : on compare à la source.
    const expected = (await getCocoons()).filter(c => c.siloName === 'Création de site')
    const cocoons = await getCocoonsBySilo('Création de site')
    expect(cocoons.length).toBeGreaterThan(0)
    expect(cocoons.map(c => c.id)).toEqual(expected.map(c => c.id))
  })

  it('returns empty array for non-existent silo', async () => {
    const cocoons = await getCocoonsBySilo('Nonexistent Silo')
    expect(cocoons).toHaveLength(0)
  })

  it('cocoons have siloName matching the silo', async () => {
    const cocoons = await getCocoonsBySilo('Stratégie & Visibilité')
    for (const cocoon of cocoons) {
      expect(cocoon.siloName).toBe('Stratégie & Visibilité')
    }
  })
})
