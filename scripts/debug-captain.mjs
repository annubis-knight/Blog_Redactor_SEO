/* Debug: inspect captain_explorations per article. Run with:
 *   node --env-file=.env scripts/debug-captain.mjs
 * or pass an article id:
 *   node --env-file=.env scripts/debug-captain.mjs 42
 */
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
})

async function main() {
  const argId = process.argv[2] ? Number(process.argv[2]) : null

  console.log('=== captain_explorations : counts per article ===')
  const counts = await pool.query(`
    SELECT ce.article_id,
           a.titre,
           COUNT(*) AS n,
           SUM(CASE WHEN ce.ai_panel_markdown IS NOT NULL THEN 1 ELSE 0 END) AS with_ai,
           MAX(ce.explored_at) AS last
      FROM captain_explorations ce
      LEFT JOIN articles a ON a.id = ce.article_id
      GROUP BY ce.article_id, a.titre
      ORDER BY n DESC
      LIMIT 20
  `)
  console.table(counts.rows)

  const targetId = argId ?? counts.rows[0]?.article_id
  if (!targetId) { console.log('No articles found'); process.exit(0) }

  console.log(`\n=== article_keywords row for article ${targetId} ===`)
  const ak = await pool.query(`SELECT article_id, capitaine, captain_locked_at, lieutenants, root_keywords FROM article_keywords WHERE article_id = $1`, [targetId])
  console.log(ak.rows[0] ?? '(no row)')

  console.log(`\n=== captain_explorations detail for article ${targetId} ===`)
  const det = await pool.query(`
    SELECT keyword, status, article_level, ai_panel_markdown IS NOT NULL AS has_ai,
           explored_at, array_length(root_keywords, 1) AS root_count
      FROM captain_explorations
     WHERE article_id = $1
     ORDER BY explored_at DESC
  `, [targetId])
  console.log(`Total rows: ${det.rows.length}`)
  console.table(det.rows.slice(0, 40))

  console.log(`\n=== simulating getArticleKeywords() payload shape ===`)
  const vh = await pool.query(`SELECT COUNT(*) FROM captain_explorations WHERE article_id = $1`, [targetId])
  const akRow = ak.rows[0]
  console.log({
    articleId: targetId,
    capitaine: akRow?.capitaine,
    captainLockedAt: akRow?.captain_locked_at,
    validationHistoryLength: Number(vh.rows[0].count),
    expectedRichCaptainPresent: !!akRow?.capitaine || Number(vh.rows[0].count) > 0,
  })

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
