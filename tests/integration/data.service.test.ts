// @vitest-environment node
/**
 * data.service — lecture de l'arbre silos → cocons → articles, et des mots-clés.
 *
 * Épopée qualité SEO, T9 : ce test lisait les DONNÉES de la base de
 * développement (« le premier cocon est Croissance digitale Toulouse ») — ni
 * portable en CI (base vide), ni stable (le contenu éditorial change). Il pose
 * désormais ses propres fixtures, étiquetées `[test:…]` et nettoyées après.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { query } from '../../server/db/client.js'
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
} from '../../server/services/infra/data.service.js'
import {
  makeTestRunId,
  taggedName,
  createTestCocoon,
  createTestArticle,
  cleanupTestFixtures,
  closeDbPool,
  type TestArticle,
  type TestCocoon,
} from '../helpers/db-fixtures.js'

const runId = makeTestRunId()
let siloName = ''
let cocoon: TestCocoon
let pilier: TestArticle
let intermediaire: TestArticle
let specialise: TestArticle
const KEYWORD = `test-${runId}-mot-cle-pilier`

beforeAll(async () => {
  siloName = taggedName('Silo data.service', runId)
  const silo = await query<{ id: number }>(`INSERT INTO silos (nom, description) VALUES ($1, 'Silo de test') RETURNING id`, [siloName])
  cocoon = await createTestCocoon(runId, silo.rows[0]!.id, 'Cocon data.service')
  pilier = await createTestArticle(runId, cocoon.id, 'Pilier data', 'Pilier')
  intermediaire = await createTestArticle(runId, cocoon.id, 'Intermediaire data', 'Intermédiaire')
  specialise = await createTestArticle(runId, cocoon.id, 'Specialise data', 'Spécialisé')
  // L'intermédiaire est en rédaction : il doit apparaître parmi les « publiés » du récap.
  await query(`UPDATE articles SET phase = 'redaction' WHERE id = $1`, [intermediaire.id])
  await query(`INSERT INTO keywords_seo (cocoon_name, mot_clef, type_mot_clef) VALUES ($1, $2, 'Pilier')`, [cocoon.nom, KEYWORD])
})

afterAll(async () => {
  await query(`DELETE FROM keywords_seo WHERE cocoon_name = $1`, [cocoon.nom])
  await cleanupTestFixtures(runId)
  await closeDbPool()
})

beforeEach(() => {
  resetCache()
})

async function ourCocoon() {
  const found = (await getCocoons()).find(c => c.id === cocoon.id)
  expect(found, 'le cocon de test doit être listé').toBeDefined()
  return found!
}

describe('data.service — getCocoons', () => {
  it('liste le cocon avec son silo, ses articles et ses statistiques', async () => {
    const c = await ourCocoon()
    expect(c.name).toBe(cocoon.nom)
    expect(c.siloName).toBe(siloName)
    expect(c.articles.map(a => a.id).sort()).toEqual([pilier.id, intermediaire.id, specialise.id].sort())
    expect(c.stats.totalArticles).toBe(3)
    expect(c.stats.byType).toEqual(expect.objectContaining({ pilier: 1, intermediaire: 1, specialise: 1 }))
  })

  it('les articles ont leurs propriétés en camelCase, et le slug n’est pas une URL', async () => {
    const article = (await ourCocoon()).articles.find(a => a.id === pilier.id)!
    expect(article).toMatchObject({ title: pilier.titre, slug: pilier.slug, status: 'à rédiger' })
    expect(article).toHaveProperty('topic')
    expect(article.slug).not.toMatch(/^https?:\/\//)
  })
})

/**
 * FR-MOT-RECAP-PUBLISHED — `publishedArticles` ne garde que les articles en
 * rédaction ou publiés : le récap du Moteur ne les montre jamais deux fois.
 */
describe('data.service — getCocoons.publishedArticles (FR-MOT-RECAP-PUBLISHED)', () => {
  it('ne contient que les articles en rédaction ou publiés', async () => {
    const c = await ourCocoon()
    expect(c.publishedArticles.map(a => a.id)).toEqual([intermediaire.id])
  })
})

describe('data.service — getArticlesByCocoon', () => {
  it('rend les articles du cocon demandé', async () => {
    const articles = await getArticlesByCocoon(cocoon.id)
    expect(articles!.map(a => a.id).sort()).toEqual([pilier.id, intermediaire.id, specialise.id].sort())
  })

  it('rend null sur un identifiant inconnu ou négatif', async () => {
    expect(await getArticlesByCocoon(999_999_999)).toBeNull()
    expect(await getArticlesByCocoon(-1)).toBeNull()
  })
})

describe('data.service — getArticleBySlug', () => {
  it('rend l’article et le nom de son cocon', async () => {
    const result = await getArticleBySlug(pilier.slug)
    expect(result!.article).toMatchObject({ id: pilier.id, title: pilier.titre, type: 'pilier' })
    expect(result!.cocoonName).toBe(cocoon.nom)
  })

  it('accepte une URL complète et en extrait le slug', async () => {
    const result = await getArticleBySlug(`https://www.exemple.fr/blog/${pilier.slug}`)
    expect(result!.article.id).toBe(pilier.id)
  })

  it('rend null pour un slug inconnu', async () => {
    expect(await getArticleBySlug(`test-${runId}-slug-inexistant`)).toBeNull()
  })
})

describe('data.service — getKeywordsByCocoon', () => {
  it('rend les mots-clés du cocon, en camelCase', async () => {
    const keywords = await getKeywordsByCocoon(cocoon.nom)
    expect(keywords).toEqual([expect.objectContaining({ keyword: KEYWORD, cocoonName: cocoon.nom, type: 'Pilier' })])
  })

  it('rend null pour un cocon inconnu', async () => {
    expect(await getKeywordsByCocoon(`Cocon inexistant ${runId}`)).toBeNull()
  })
})

describe('data.service — getTheme', () => {
  it('rend un thème nommé (configuration, sinon premier silo)', async () => {
    const theme = await getTheme()
    expect(theme.nom.trim().length).toBeGreaterThan(0)
    expect(typeof theme.description).toBe('string')
  })
})

describe('data.service — silos', () => {
  it('getSilos : le silo de test, avec son cocon et le total de ses articles', async () => {
    const silo = (await getSilos()).find(s => s.nom === siloName)
    expect(silo, 'le silo de test doit être listé').toBeDefined()
    expect(silo!.cocons.map(c => c.id)).toEqual([cocoon.id])
    expect(silo!.stats!.totalArticles).toBe(3)
  })

  it('getSiloByName : trouvé par son nom, null sinon', async () => {
    expect((await getSiloByName(siloName))!.nom).toBe(siloName)
    expect(await getSiloByName(`Silo inexistant ${runId}`)).toBeNull()
  })

  it('getCocoonsBySilo : les cocons du silo, vide pour un silo inconnu', async () => {
    const cocoons = await getCocoonsBySilo(siloName)
    expect(cocoons.map(c => c.id)).toEqual([cocoon.id])
    expect(cocoons[0]!.siloName).toBe(siloName)
    expect(await getCocoonsBySilo(`Silo inexistant ${runId}`)).toHaveLength(0)
  })
})
