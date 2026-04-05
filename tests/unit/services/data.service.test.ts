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
} from '../../../server/services/data.service.js'

beforeEach(() => {
  resetCache()
})

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
    const cocoons = await getCocoons()
    const article = cocoons[0]!.articles[0]!
    expect(article).toHaveProperty('title')
    expect(article).toHaveProperty('type')
    expect(article).toHaveProperty('slug')
    expect(article).toHaveProperty('topic')
    expect(article).toHaveProperty('status')
  })

  it('slug is extracted from URL (not full URL)', async () => {
    const cocoons = await getCocoons()
    const article = cocoons[0]!.articles[0]!
    expect(article.slug).not.toContain('https://')
    expect(article.slug).not.toContain('http://')
  })
})

describe('data.service — getArticlesByCocoon', () => {
  it('returns articles for valid cocoon index', async () => {
    const articles = await getArticlesByCocoon(0)
    expect(articles).not.toBeNull()
    expect(articles!.length).toBeGreaterThan(0)
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
    const result = await getArticleBySlug('pourquoi-la-refonte-de-votre-site-web-est-essentielle-a-la-croissance-de-votre-pme')
    expect(result).not.toBeNull()
    expect(result!.article.title).toBe('Pourquoi la refonte de votre site web est essentielle à la croissance de votre PME')
    expect(result!.article.type).toBe('Pilier')
    expect(result!.cocoonName).toBe('Refonte de site web pour PME')
  })

  it('returns null for non-existent slug', async () => {
    const result = await getArticleBySlug('this-slug-does-not-exist')
    expect(result).toBeNull()
  })

  it('returned article has all expected fields', async () => {
    const result = await getArticleBySlug('pourquoi-la-refonte-de-votre-site-web-est-essentielle-a-la-croissance-de-votre-pme')
    expect(result!.article).toHaveProperty('title')
    expect(result!.article).toHaveProperty('type')
    expect(result!.article).toHaveProperty('slug')
    expect(result!.article).toHaveProperty('topic')
    expect(result!.article).toHaveProperty('status')
  })
})

describe('data.service — getKeywordsByCocoon', () => {
  it('returns keywords for valid cocoon name', async () => {
    const keywords = await getKeywordsByCocoon('Refonte de site web pour PME')
    expect(keywords).not.toBeNull()
    expect(keywords!.length).toBeGreaterThan(0)
  })

  it('keywords have camelCase properties', async () => {
    const keywords = await getKeywordsByCocoon('Refonte de site web pour PME')
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
    const cocoonName = 'Refonte de site web pour PME'
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
    expect(theme.nom).toBe('Croissance digitale sur mesure pour PME toulousaines')
  })
})

describe('data.service — getSilos', () => {
  it('returns 3 silos', async () => {
    const silos = await getSilos()
    expect(silos).toHaveLength(3)
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
    const cocoons = await getCocoonsBySilo('Création de site')
    expect(cocoons.length).toBe(4)
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
