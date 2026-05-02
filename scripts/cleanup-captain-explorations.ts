/**
 * Nettoyage ponctuel : ne conserve que les N entrées les plus récentes
 * de captain_explorations pour un article donné. Utile pour redémarrer
 * une exploration propre sans purger toute la colonne.
 *
 * Usage : ARTICLE_ID=64 KEEP=8 node --env-file=.env --import=tsx/esm scripts/cleanup-captain-explorations.ts
 */
import { pool } from '../server/db/client.js'

async function main() {
  const articleId = Number(process.env.ARTICLE_ID)
  const keep = Number(process.env.KEEP ?? 8)
  if (!articleId || Number.isNaN(articleId)) {
    console.error('Missing or invalid ARTICLE_ID env variable')
    process.exit(1)
  }

  const before = await pool.query(`SELECT COUNT(*)::int AS n FROM captain_explorations WHERE article_id = $1`, [articleId])
  const beforeCount = before.rows[0]?.n ?? 0
  console.log(`Article ${articleId} : ${beforeCount} entries avant nettoyage`)

  if (beforeCount <= keep) {
    console.log(`Rien à supprimer (≤ ${keep})`)
    await pool.end()
    return
  }

  // Conserve les `keep` plus récentes (par explored_at desc) + celle qui est lockée si dehors du top
  const toDelete = await pool.query<{ keyword: string }>(`
    WITH ranked AS (
      SELECT keyword, status, explored_at,
             ROW_NUMBER() OVER (ORDER BY (locked_at IS NOT NULL) DESC, explored_at DESC) AS rn
      FROM captain_explorations
      WHERE article_id = $1
    )
    SELECT keyword FROM ranked WHERE rn > $2
  `, [articleId, keep])

  console.log(`\n${toDelete.rowCount} keywords à supprimer :`)
  for (const r of toDelete.rows) console.log(`  - "${r.keyword}"`)

  if (toDelete.rowCount && toDelete.rowCount > 0) {
    const keywords = toDelete.rows.map(r => r.keyword)
    // 1. PAA explorations liées
    await pool.query(`DELETE FROM paa_explorations WHERE article_id = $1 AND keyword = ANY($2)`, [articleId, keywords])
    // 2. captain_explorations
    await pool.query(`DELETE FROM captain_explorations WHERE article_id = $1 AND keyword = ANY($2)`, [articleId, keywords])
    console.log(`\n✅ ${keywords.length} entries supprimées`)
  }

  const after = await pool.query(`SELECT COUNT(*)::int AS n FROM captain_explorations WHERE article_id = $1`, [articleId])
  console.log(`\nArticle ${articleId} : ${after.rows[0]?.n ?? 0} entries après nettoyage`)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
