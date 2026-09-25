// @vitest-environment node
/**
 * La matrice du maillage suit le texte (FR-RED-LINKING-MANUAL) : une fois le
 * contenu enregistré, un lien qui n'y figure plus sort de `internal_links`.
 * Sans cela, un lien retiré de l'éditeur restait dans la matrice, et la
 * publication signalait encore « lien vers un article non publié »
 * (recette réelle C8 du 2026-09-25).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { query } from '../../server/db/client.js'
import { saveArticleContent } from '../../server/services/article/article-content.service.js'
import { upsertLinks } from '../../server/services/article/linking.service.js'
import {
  makeTestRunId,
  getOrCreateTestSilo,
  createTestCocoon,
  createTestArticle,
  cleanupTestFixtures,
  closeDbPool,
  type TestArticle,
} from '../helpers/db-fixtures.js'

const runId = makeTestRunId()
let source: TestArticle
let byId: TestArticle
let bySlug: TestArticle

async function targetsOf(id: number): Promise<number[]> {
  const r = await query<{ target_id: number }>(`SELECT target_id FROM internal_links WHERE source_id = $1 ORDER BY target_id`, [id])
  return r.rows.map(row => row.target_id)
}

beforeAll(async () => {
  const silo = await getOrCreateTestSilo(runId)
  const cocoon = await createTestCocoon(runId, silo.id, 'Cocon maillage')
  source = await createTestArticle(runId, cocoon.id, 'Source maillage')
  byId = await createTestArticle(runId, cocoon.id, 'Cible par identifiant', 'Intermédiaire')
  bySlug = await createTestArticle(runId, cocoon.id, 'Cible par adresse', 'Intermédiaire')
  await upsertLinks([
    { sourceId: source.id, targetId: byId.id, anchorText: 'identifiant', position: 'char-10' },
    { sourceId: source.id, targetId: bySlug.id, anchorText: 'adresse', position: 'char-40' },
  ])
})

afterAll(async () => {
  await query(`DELETE FROM internal_links WHERE source_id = $1`, [source.id])
  await cleanupTestFixtures(runId)
  await closeDbPool()
})

describe('internal_links suit le contenu enregistré', () => {
  it('les liens présents dans le texte restent, par identifiant comme par adresse', async () => {
    await saveArticleContent(source.id, {
      content: `<h1>Titre</h1><p>Voir <a href="#article-${byId.id}">identifiant</a> et <a href="/${bySlug.slug}">adresse</a>.</p>`,
    })
    expect(await targetsOf(source.id)).toEqual([byId.id, bySlug.id].sort((a, b) => a - b))
  })

  it('un lien retiré du texte sort de la matrice', async () => {
    await saveArticleContent(source.id, { content: `<h1>Titre</h1><p>Voir <a href="#article-${byId.id}">identifiant</a> seulement.</p>` })
    expect(await targetsOf(source.id)).toEqual([byId.id])
  })

  it('enregistrer seulement le sommaire ne touche pas à la matrice', async () => {
    await saveArticleContent(source.id, { outline: { sections: [] } as never })
    expect(await targetsOf(source.id)).toEqual([byId.id])
  })
})
