/**
 * Purge les articles laissés en base par la suite de tests.
 *
 * Contexte (audit 2026-09-19) : les tests écrivent dans la base de dev. Un test
 * renomme un article (`PATCH /articles/:id`), ce qui lui fait perdre son tag
 * `[test:<runId>]` ; le nettoyage ne le retrouvait plus. 28 articles
 * « Renamed <horodatage> » s'étaient accumulés.
 *
 * La fuite est colmatée dans `tests/helpers/db-fixtures.ts` (nettoyage par slug).
 * Ce script sert à évacuer les résidus déjà présents.
 *
 * Usage :
 *   npm run db:clean-tests              # simulation : liste, ne supprime rien
 *   npm run db:clean-tests -- --confirm # suppression effective
 *
 * Garde-fous cumulatifs — une ligne n'est supprimée que si les TROIS sont vrais :
 *   1. le slug a la forme `test-<horodatage 10+ chiffres>-…` (jamais un slug métier)
 *   2. l'article n'appartient à aucun cocon
 *   3. l'article n'a pas de contenu rédigé (> 200 caractères)
 *
 * Prends une sauvegarde avant (`npm run db:backup`).
 */

import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

/** Sélection stricte : les trois garde-fous sont dans le WHERE. */
const SELECT_GHOSTS = `
  SELECT a.id, a.titre, a.slug, a.created_at::date::text AS created
  FROM articles a
  LEFT JOIN article_content ac ON ac.article_id = a.id
  WHERE a.slug ~ '^test-[0-9]{10,}-'
    AND a.cocoon_id IS NULL
    AND length(coalesce(ac.content, '')) <= 200
  ORDER BY a.id
`

async function main(): Promise<void> {
  const confirm = process.argv.includes('--confirm')

  const client = new Client({
    host: process.env.PG_HOST ?? 'localhost',
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE ?? 'blog_redactor_seo',
  })
  await client.connect()

  try {
    const { rows } = await client.query<{ id: number; titre: string; slug: string; created: string }>(
      SELECT_GHOSTS,
    )

    if (rows.length === 0) {
      console.log('✓ Aucun article de test résiduel.')
      return
    }

    console.log(`${rows.length} article(s) de test résiduel(s) :\n`)
    for (const row of rows) {
      console.log(`  #${String(row.id).padStart(4)}  ${row.created}  ${row.titre}`)
    }

    if (!confirm) {
      console.log('\nSimulation — rien n\'a été supprimé.')
      console.log('Pour supprimer : npm run db:clean-tests -- --confirm')
      console.log('(pense à « npm run db:backup » avant)')
      return
    }

    // Suppression par id, depuis la sélection déjà filtrée : aucune requête
    // large ne part vers la base.
    const ids = rows.map((r) => r.id)
    const res = await client.query(`DELETE FROM articles WHERE id = ANY($1::int[])`, [ids])
    console.log(`\n✓ ${res.rowCount} article(s) supprimé(s).`)
  } finally {
    await client.end()
  }
}

main().catch((err: unknown) => {
  console.error(`✗ Échec : ${(err as Error).message}`)
  process.exitCode = 1
})
