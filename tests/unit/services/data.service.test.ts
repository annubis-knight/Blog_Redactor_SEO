import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCocoons,
  getArticlesByCocoon,
  getArticleBySlug,
  getKeywordsByCocoon,
  resetCache,
} from '../../../server/services/data.service.js'

beforeEach(() => {
  resetCache()
})

describe('data.service — getCocoons', () => {
  it('returns all 6 cocoons', async () => {
    const cocoons = await getCocoons()
    expect(cocoons).toHaveLength(6)
  })

  it('each cocoon has id, name, articles, and stats', async () => {
    const cocoons = await getCocoons()
    for (const cocoon of cocoons) {
      expect(cocoon).toHaveProperty('id')
      expect(cocoon).toHaveProperty('name')
      expect(cocoon).toHaveProperty('articles')
      expect(cocoon).toHaveProperty('stats')
      expect(typeof cocoon.id).toBe('number')
      expect(typeof cocoon.name).toBe('string')
      expect(Array.isArray(cocoon.articles)).toBe(true)
    }
  })

  it('first cocoon is "Refonte de site web pour PME"', async () => {
    const cocoons = await getCocoons()
    expect(cocoons[0]!.name).toBe('Refonte de site web pour PME')
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
    expect(article).toHaveProperty('theme')
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
    expect(result!.article).toHaveProperty('theme')
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
